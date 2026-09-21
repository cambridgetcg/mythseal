/** Real development-project checks. Credentials stay in environment/memory only. */
import { randomBytes, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { createAccountHandler } from '../server/account-api.mjs';
import { createProfile } from '../progression.mjs';
import { syncCollection } from '../collection.mjs';
import { createSnapshot, fingerprintProfile } from '../cloud-save.mjs';

const PROJECT_REF = 'puiuevggytoxyyearkcq';
const PROJECT_URL = `https://${PROJECT_REF}.supabase.co`;
const GAME_ORIGIN = 'https://mythseal.com';
const MANAGEMENT_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const boundedFetch = (input, init = {}) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) });
const sdkOptions = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: boundedFetch } };

class CheckFailure extends Error {
  constructor(check, receipt = {}) { super(check); this.check = check; this.receipt = receipt; }
}
const requireCheck = (condition, check) => { if (!condition) throw new CheckFailure(check); };

/** No emails, existing-user mutations, migration changes or production resources. */
export async function runLiveAccountCheck({ mode = process.env.MYTHSEAL_ACCOUNT_CHECK_MODE || 'local' } = {}) {
  const report = { checkedAt: new Date().toISOString(), project: PROJECT_REF, mode, passed: false, checks: {}, cleanup: { verified: false } };
  const token = process.env.MYTHSEAL_MANAGEMENT_TOKEN;
  const fixtures = [];
  let admin;
  let phase = 'configuration';
  const record = name => { report.checks[name] = true; };
  async function management(path, body) {
    const result = await boundedFetch(`${MANAGEMENT_URL}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    requireCheck(result.ok, 'management_request');
    return result.json();
  }
  async function listFixtureUsers() {
    const found = [];
    for (let page = 1; page <= 20; page++) {
      const listed = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      requireCheck(!listed.error && Array.isArray(listed.data?.users), 'cleanup_list_users');
      found.push(...listed.data.users.filter(user => fixtures.some(fixture => fixture.email === user.email)));
      if (listed.data.users.length < 1000) return found;
    }
    throw new CheckFailure('cleanup_list_limit');
  }
  try {
    requireCheck(['local', 'hosted'].includes(mode), 'invalid_mode');
    requireCheck(typeof token === 'string' && token.length > 20 && !/[\r\n]/.test(token), 'management_token_missing');
    phase = 'project_keys';
    const keys = await management('/api-keys');
    requireCheck(Array.isArray(keys), 'project_keys_shape');
    const publishable = keys.find(key => key.type === 'publishable')?.api_key ?? keys.find(key => key.name === 'anon')?.api_key;
    const service = keys.find(key => key.name === 'service_role')?.api_key ?? keys.find(key => key.type === 'secret')?.api_key;
    requireCheck(typeof publishable === 'string' && typeof service === 'string', 'project_keys_missing');
    admin = createClient(PROJECT_URL, service, sdkOptions);
    const localHandler = createAccountHandler({ createClient: (...args) => {
      const client = createClient(...args), rpc = client.rpc.bind(client);
      client.rpc = async (...parameters) => {
        const result = await rpc(...parameters);
        if (result.error) {
          report.rpcErrors ??= [];
          const message = String(result.error.message ?? '');
          const classification = /timeout|aborted/i.test(message) ? 'timeout_or_abort' : /fetch failed/i.test(message) ? 'fetch_failed' : /network/i.test(message) ? 'network_error' : 'provider_response';
          report.rpcErrors.push({ operation: ['mythseal_backup_read', 'mythseal_backup_write', 'mythseal_backup_delete'].includes(parameters[0]) ? parameters[0] : 'unknown', status: result.status, code: /^[A-Z0-9_]{1,40}$/.test(result.error.code) ? result.error.code : 'unclassified', classification });
        }
        return result;
      };
      return client;
    } });
    const localEnv = {
      APP_ORIGIN: GAME_ORIGIN, SUPABASE_URL: PROJECT_URL, SUPABASE_PUBLISHABLE_KEY: publishable, OTP_ENABLED: 'true',
      AUTH_RATE_LIMIT: { limit: async () => ({ success: true }) }, BACKUP_RATE_LIMIT: { limit: async () => ({ success: true }) },
    };
    async function request(fixture, path, { method = 'GET', body, expectedId = fixture?.id, expectedStatus = 200 } = {}) {
      const headers = new Headers({ Accept: 'application/json', ...(mode === 'local' ? { 'cf-connecting-ip': '192.0.2.1' } : {}) });
      if (fixture?.cookies.size) headers.set('Cookie', [...fixture.cookies].map(([name, value]) => `${name}=${value}`).join('; '));
      if (path === 'journey' && expectedId) headers.set('X-Mythseal-Account', expectedId);
      if (body !== undefined) { headers.set('Content-Type', 'application/json'); headers.set('Origin', GAME_ORIGIN); }
      const req = new Request(`${GAME_ORIGIN}/api/v1/${path}`, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
      const result = mode === 'local' ? await localHandler(req, localEnv) : await boundedFetch(req);
      if (result.status !== expectedStatus) {
        const body = await result.text();
        const errorText = body.replace(/<[^>]*>/g, ' ');
        const cloudflareCode = /\b(?:Error\s*(?:code:)?\s*1102|error code:\s*1102)\b/i.test(errorText) ? 1102 : undefined;
        let apiCode;
        try { const code = JSON.parse(body)?.error?.code; if (['cloud_unavailable', 'account_unavailable', 'sign_in_required', 'account_changed', 'rate_limited', 'invalid_snapshot', 'revision_conflict'].includes(code)) apiCode = code; } catch {}
        throw new CheckFailure(`http_${method.toLowerCase()}_${path.replaceAll('/', '_')}_${expectedStatus}`, { httpStatus: result.status, ...(cloudflareCode ? { cloudflareCode } : {}), ...(apiCode ? { apiCode } : {}) });
      }
      requireCheck(result.headers.get('cache-control')?.includes('no-store'), 'private_response_cache');
      const setCookies = result.headers.getSetCookie();
      for (const cookie of setCookies) {
        requireCheck(cookie.includes('HttpOnly') && cookie.includes('Secure') && cookie.includes('SameSite=Lax') && cookie.includes('Path=/'), 'cookie_attributes');
        const separator = cookie.indexOf('='), name = cookie.slice(0, separator), value = cookie.slice(separator + 1).split(';')[0];
        requireCheck(['__Host-mythseal-access', '__Host-mythseal-refresh'].includes(name), 'cookie_name');
        if (fixture) { if (/Max-Age=0(?:;|$)/.test(cookie)) fixture.cookies.delete(name); else fixture.cookies.set(name, value); }
      }
      const data = await result.json();
      requireCheck(!JSON.stringify(data).match(/"(?:access_token|refresh_token|service_role)"\s*:/), 'response_token_leak');
      return data;
    }
    async function createFixture(label) {
      const fixture = { email: `mythseal-check-${randomUUID()}@example.invalid`, id: null, cookies: new Map() };
      fixtures.push(fixture); // Register before the request so cleanup can reconcile a lost response.
      const password = `${randomBytes(32).toString('base64url')}!a9`;
      const created = await admin.auth.admin.createUser({ email: fixture.email, password, email_confirm: true, user_metadata: { mythseal_integration_fixture: true } });
      requireCheck(!created.error && UUID.test(created.data?.user?.id), `create_fixture_${label}`);
      fixture.id = created.data.user.id;
      const publicClient = createClient(PROJECT_URL, publishable, sdkOptions);
      const signedIn = await publicClient.auth.signInWithPassword({ email: fixture.email, password });
      requireCheck(!signedIn.error && signedIn.data?.session && signedIn.data.user?.id === fixture.id, `session_fixture_${label}`);
      fixture.cookies.set('__Host-mythseal-access', signedIn.data.session.access_token);
      fixture.cookies.set('__Host-mythseal-refresh', signedIn.data.session.refresh_token);
      return fixture;
    }

    phase = 'create_fixtures';
    const a = await createFixture('a'), b = await createFixture('b');
    record('synthetic_users_no_email');
    if (mode === 'local') {
      phase = 'generated_otp_verification';
      const link = await admin.auth.admin.generateLink({ type: 'magiclink', email: a.email });
      requireCheck(!link.error && /^\d{6}$/.test(link.data?.properties?.email_otp), 'generated_six_digit_otp');
      a.cookies.clear();
      const verified = await request(a, 'auth/verify', { method: 'POST', body: { email: a.email, token: link.data.properties.email_otp } });
      requireCheck(verified.authenticated && verified.user?.id === a.id && a.cookies.size === 2, 'otp_verified_identity');
      record('otp_verify_without_email_delivery');
    } else {
      report.checks.otp_delivery_not_exercised = true;
    }

    phase = 'account_and_initial_read';
    const account = await request(a, 'account');
    requireCheck(account.authenticated && account.user?.id === a.id, 'account_identity');
    const initial = await request(a, 'journey');
    requireCheck(initial.backup === null && initial.revision === 0, 'initial_cloud_empty');
    record('account_identity'); record('initial_cloud_empty');

    phase = 'cloud_round_trip';
    const snapshot = createSnapshot(createProfile({ now: '2026-09-21T12:00:00.000Z' }));
    const written = await request(a, 'journey', { method: 'PUT', body: { expectedRevision: 0, snapshot } });
    requireCheck(written.revision === 1 && fingerprintProfile(written.backup?.snapshot?.profile) === fingerprintProfile(snapshot.profile), 'first_save_round_trip');
    const reread = await request(a, 'journey');
    requireCheck(reread.revision === 1 && fingerprintProfile(reread.backup?.snapshot?.profile) === fingerprintProfile(snapshot.profile), 'read_round_trip');
    record('cloud_round_trip');

    phase = 'isolation_and_conflict';
    const stale = await request(a, 'journey', { method: 'PUT', body: { expectedRevision: 0, snapshot }, expectedStatus: 409 });
    requireCheck(stale.error?.code === 'revision_conflict', 'stale_revision_conflict');
    const mismatch = await request(a, 'journey', { expectedId: b.id, expectedStatus: 401 });
    requireCheck(mismatch.error?.code === 'account_changed', 'expected_account_guard');
    const other = await request(b, 'journey');
    requireCheck(other.backup === null && other.revision === 0, 'account_isolation');
    record('stale_revision_conflict'); record('expected_account_guard'); record('account_isolation');

    phase = 'delete_tombstone_and_recreate';
    const removed = await request(a, 'journey', { method: 'DELETE', body: { expectedRevision: 1 } });
    requireCheck(removed.backup === null && removed.revision === 2, 'delete_tombstone');
    const tombstone = await request(a, 'journey');
    requireCheck(tombstone.backup === null && tombstone.revision === 2, 'tombstone_read');
    await request(a, 'journey', { method: 'PUT', body: { expectedRevision: 0, snapshot }, expectedStatus: 409 });
    const recreated = await request(a, 'journey', { method: 'PUT', body: { expectedRevision: 2, snapshot } });
    requireCheck(recreated.revision === 3 && recreated.backup?.revision === 3, 'recreate_monotonic');
    record('delete_tombstone'); record('stale_recreate_rejected'); record('recreate_monotonic');

    if (process.env.MYTHSEAL_ACCOUNT_CHECK_BOUNDARY === 'true') {
      phase = 'near_limit_cloud_round_trip';
      const base = createProfile({ now: '2026-09-21T12:00:00.000Z' });
      const large = createSnapshot(syncCollection({
        ...base, instanceSerial: 2000,
        instances: [...base.instances, ...Array.from({ length: 1984 }, (_, index) => ({
          ...base.instances[0], uid: `card-${String(index + 17).padStart(6, '0')}`, origin: '字'.repeat(32),
        }))],
      }));
      const started = performance.now();
      const nearLimit = await request(a, 'journey', { method: 'PUT', body: { expectedRevision: 3, snapshot: large } });
      const putMilliseconds = Math.round(performance.now() - started);
      requireCheck(nearLimit.revision === 4 && fingerprintProfile(nearLimit.backup?.snapshot?.profile) === fingerprintProfile(large.profile), 'near_limit_write_round_trip');
      const readStarted = performance.now();
      const largeRead = await request(a, 'journey');
      const readMilliseconds = Math.round(performance.now() - readStarted);
      requireCheck(largeRead.revision === 4 && fingerprintProfile(largeRead.backup?.snapshot?.profile) === fingerprintProfile(large.profile), 'near_limit_read_round_trip');
      record('near_limit_cloud_round_trip');
      report.boundary = { cards: 2000, compactBytes: Buffer.byteLength(JSON.stringify(large)), putMilliseconds, readMilliseconds };
    }

    phase = 'logout';
    const logout = await request(a, 'auth/logout', { method: 'POST', body: {} });
    requireCheck(logout.authenticated === false && a.cookies.size === 0, 'logout_cookie_clear');
    const guest = await request(a, 'account');
    requireCheck(guest.authenticated === false && guest.user === null, 'logout_guest_identity');
    record('logout_cookie_clear'); record('logout_guest_identity');
    report.passed = true;
  } catch (error) {
    report.failure = { phase, check: error instanceof CheckFailure ? error.check : 'request_or_provider_failed', ...(error instanceof CheckFailure ? error.receipt : {}) };
  } finally {
    if (admin && fixtures.length) {
      try {
        const found = await listFixtureUsers();
        for (const user of found) {
          requireCheck(UUID.test(user.id), 'cleanup_fixture_id');
          const deleted = await admin.auth.admin.deleteUser(user.id, false);
          requireCheck(!deleted.error, 'cleanup_delete_user');
          const fixture = fixtures.find(item => item.email === user.email);
          fixture.id = user.id;
        }
        const remaining = await listFixtureUsers();
        requireCheck(remaining.length === 0, 'cleanup_users_remaining');
        const ids = fixtures.map(fixture => fixture.id).filter(id => UUID.test(id));
        if (ids.length) {
          const literals = ids.map(id => `'${id}'::uuid`).join(',');
          const receipt = await management('/database/query', { query: `select (select count(*)::int from auth.users where id in (${literals})) as users_remaining, (select count(*)::int from private_backup.journeys where user_id in (${literals})) as backups_remaining;` });
          requireCheck(Array.isArray(receipt) && receipt[0]?.users_remaining === 0 && receipt[0]?.backups_remaining === 0, 'cleanup_database_receipt');
        }
        report.cleanup = { verified: true, syntheticUsersCreated: fixtures.filter(fixture => UUID.test(fixture.id)).length, usersRemaining: 0, backupsRemaining: 0 };
      } catch (error) {
        report.passed = false;
        report.cleanup = { verified: false, check: error instanceof CheckFailure ? error.check : 'cleanup_request_failed' };
      }
    } else if (!fixtures.length) {
      report.cleanup = { verified: true, syntheticUsersCreated: 0, usersRemaining: 0, backupsRemaining: 0 };
    }
    report.finishedAt = new Date().toISOString();
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length > 2) {
    console.log(JSON.stringify({ passed: false, failure: { check: 'use_environment_not_arguments' } }));
    process.exitCode = 1;
  } else {
    const report = await runLiveAccountCheck();
    console.log(JSON.stringify(report));
    if (!report.passed) process.exitCode = 1;
  }
}
