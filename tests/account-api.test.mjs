import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { createAccountHandler } from '../server/account-api.mjs';
import { createSnapshot } from '../cloud-save.mjs';
import { LEGACY_CARD_IDS } from '../engine.mjs';
import { createProfile } from '../progression.mjs';

const origin = 'https://mythseal.com';
const user = { id: 'c69bf313-b64b-40d3-a15f-8c963b7b7100', email: 'player@example.com', private_field: 'omit' };
const session = { access_token: 'verified.access.token', refresh_token: 'verified_refresh' };
const snapshotV3 = () => createSnapshot(createProfile({ now: '2026-09-21T12:00:00Z' }));
const snapshotV2 = () => { const p = createProfile({ now: '2026-09-21T12:00:00Z' }); p.version = 4; delete p.expansion; return createSnapshot(p); };
const snapshot = () => {
  const p = createProfile({ now: '2026-09-21T12:00:00Z' }); p.version = 3; p.collectionVersion = 1; p.collectionExpansion = 1; delete p.wx01; delete p.expansion;
  for (const card of p.instances) delete card.printId;
  for (const key of ['inventory', 'levels']) p[key] = Object.fromEntries(LEGACY_CARD_IDS.map(id => [id, p[key][id]]));
  return { format: 'mythseal.offline-journey', version: 1, profile: p };
};
const backup = (revision = 1, saved = snapshot()) => ({ revision, updatedAt: '2026-09-21T12:00:00Z', snapshot: saved });
const cookie = '__Host-mythseal-access=old.access.token; __Host-mythseal-refresh=old_refresh';

function setup(overrides = {}) {
  const calls = [];
  const auth = {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    setSession: async value => { calls.push(['session', value]); return { data: { session }, error: null }; },
    getUser: async () => ({ data: { user }, error: null }),
    signInWithOtp: async value => { calls.push(['otp', value]); return { data: {}, error: null }; },
    verifyOtp: async value => { calls.push(['verify', value]); return { data: { user, session }, error: null }; },
    signOut: async value => { calls.push(['logout', value]); return { error: null }; },
    ...overrides.auth,
  };
  const rpc = overrides.rpc ?? (async (name, params) => { calls.push(['rpc', name, params]); return { data: name.endsWith('delete') ? backup(2, null) : backup(), error: null }; });
  const handle = createAccountHandler({ createClient: (url, key, options) => { calls.push(['client', url, key, options]); return { auth, rpc }; } });
  const env = {
    APP_ORIGIN: origin, SUPABASE_URL: 'https://project.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'publishable-fixture', OTP_ENABLED: 'true',
    AUTH_RATE_LIMIT: { limit: async value => { calls.push(['rate', value]); return { success: true }; } },
    BACKUP_RATE_LIMIT: { limit: async value => { calls.push(['backup-rate', value]); return { success: true }; } },
    ...overrides.env,
  };
  const run = (path, { method = 'GET', body, signedIn = false, headers = {}, url = origin } = {}) => handle(new Request(`${url}${path}`, {
    method,
    headers: { ...(body !== undefined ? { 'content-type': 'application/json', origin } : {}), 'cf-connecting-ip': '192.0.2.1', ...(signedIn ? { cookie, 'x-mythseal-account': user.id } : {}), ...headers },
    ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
  }), env);
  return { run, calls, env, handle };
}

test('anonymous account reports email readiness without creating a Supabase client', async () => {
  const { run, calls } = setup({ env: { OTP_ENABLED: 'false' } });
  const result = await run('/api/v1/account');
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { authenticated: false, user: null, emailEnabled: false, journeyVersions: [1] });
  assert.deepEqual(calls, []);
  assert.match(result.headers.get('cache-control'), /no-store/);
});

test('validated session rotates only HttpOnly host cookies and strips private user fields', async () => {
  const { run, calls } = setup();
  const result = await run('/api/v1/account', { signedIn: true });
  assert.deepEqual(await result.json(), { authenticated: true, user: { id: user.id, email: user.email }, emailEnabled: true, journeyVersions: [1] });
  const cookies = result.headers.getSetCookie();
  assert.equal(cookies.length, 2);
  for (const value of cookies) {
    assert.match(value, /^__Host-mythseal-/);
    assert.match(value, /HttpOnly; SameSite=Lax/);
    assert.match(value, /; Secure$/);
    assert.doesNotMatch(value, /Domain=/);
  }
  assert.deepEqual(calls.find(call => call[0] === 'client')[3].auth, { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false });
});

test('upstream network failures preserve browser credentials instead of reporting logout', async () => {
  const { run } = setup({ auth: { setSession: async () => ({ error: { status: 503, message: 'secret provider response' } }) } });
  const result = await run('/api/v1/account', { signedIn: true });
  assert.equal(result.status, 503);
  assert.equal(result.headers.get('set-cookie'), null);
  assert.doesNotMatch(await result.text(), /secret provider/);
});

test('an unchanged session never reissues cookies on reads or backup writes', async () => {
  const { run } = setup({ auth: { setSession: async () => ({ data: { session: { access_token: 'old.access.token', refresh_token: 'old_refresh' } } }) } });
  for (const [path, options] of [
    ['/api/v1/account', {}], ['/api/v1/journey', {}],
    ['/api/v1/journey', { method: 'PUT', body: { expectedRevision: 0, snapshot: snapshot() } }],
  ]) {
    const result = await run(path, { ...options, signedIn: true });
    assert.equal(result.status, 200);
    assert.equal(result.headers.get('set-cookie'), null);
  }
});

test('stale tab identity cannot read, overwrite or delete the newly signed-in account', async () => {
  for (const method of ['GET', 'PUT', 'DELETE']) {
    for (const expectedAccount of ['', 'another-account']) {
      const { run, calls } = setup();
      const result = await run('/api/v1/journey', {
        method, signedIn: true, headers: { 'x-mythseal-account': expectedAccount },
        ...(method !== 'GET' ? { body: { expectedRevision: 1, ...(method === 'PUT' ? { snapshot: snapshot() } : {}) } } : {}),
      });
      assert.equal(result.status, 401);
      assert.equal((await result.json()).error.code, 'account_changed');
      assert(!calls.some(call => call[0] === 'rpc'));
    }
  }
});

test('SDK refresh during user verification or RPC returns the latest pair and unsubscribes', async () => {
  for (const phase of ['getUser', 'rpc']) {
    let listener, unsubscribed = false;
    const rotated = { access_token: 'new.access.token', refresh_token: 'new_refresh' };
    const refresh = () => listener('TOKEN_REFRESHED', rotated);
    const { run } = setup({
      auth: {
        onAuthStateChange: callback => { listener = callback; return { data: { subscription: { unsubscribe() { unsubscribed = true; } } } }; },
        getUser: async () => { if (phase === 'getUser') refresh(); return { data: { user } }; },
      },
      rpc: async () => { if (phase === 'rpc') refresh(); return { data: backup() }; },
    });
    const result = await run('/api/v1/journey', { signedIn: true });
    assert.equal(result.status, 200);
    assert(result.headers.getSetCookie().some(value => value.startsWith('__Host-mythseal-access=new.access.token;')));
    assert(result.headers.getSetCookie().some(value => value.startsWith('__Host-mythseal-refresh=new_refresh;')));
    assert.equal(unsubscribed, true);
  }
});

test('auth server rejects a forged session even when restored session contains user data', async () => {
  const { run } = setup({ auth: { getUser: async () => ({ error: { status: 401 }, data: { user: { ...user, id: 'forged' } } }) } });
  const result = await run('/api/v1/account', { signedIn: true });
  assert.equal(result.status, 200);
  assert.equal((await result.json()).authenticated, false);
  assert(result.headers.getSetCookie().every(value => value.includes('Max-Age=0')));
});

test('email disabled cannot send messages or verify codes', async () => {
  const { run, calls } = setup({ env: { OTP_ENABLED: 'false' } });
  for (const path of ['/api/v1/auth/otp', '/api/v1/auth/verify']) {
    const result = await run(path, { method: 'POST', body: { email: user.email, token: '123456' } });
    assert.equal(result.status, 503);
    assert.equal((await result.json()).error.code, 'email_unavailable');
  }
  assert.deepEqual(calls, []);
});

test('OTP requires same-origin JSON and applies combined per-IP auth limiter before SDK', async () => {
  const { run, calls } = setup();
  for (const headers of [{ origin: 'https://other.example' }, { origin: '' }, { 'content-type': 'text/plain' }]) {
    const result = await run('/api/v1/auth/otp', { method: 'POST', body: { email: user.email }, headers });
    assert([403, 415].includes(result.status));
  }
  assert.deepEqual(calls, []);
  const result = await run('/api/v1/auth/otp', { method: 'POST', body: { email: ' Player@Example.com ' } });
  assert.deepEqual(await result.json(), { sent: true });
  assert.deepEqual(calls[0], ['rate', { key: 'auth:192.0.2.1' }]);
  assert.deepEqual(calls.find(call => call[0] === 'otp')[1], { email: 'player@example.com', options: { shouldCreateUser: true } });
});

test('OTP protection fails closed for exhausted, missing and failing bindings', async () => {
  for (const [binding, expected] of [[{ limit: async () => ({ success: false }) }, 429], [undefined, 503], [{ limit: async () => { throw new Error('secret limiter detail'); } }, 503]]) {
    const { run, calls } = setup({ env: { AUTH_RATE_LIMIT: binding } });
    const result = await run('/api/v1/auth/otp', { method: 'POST', body: { email: user.email } });
    assert.equal(result.status, expected);
    assert(!calls.some(call => call[0] === 'client'));
    assert.doesNotMatch(await result.text(), /secret limiter/);
  }
});

test('OTP verification creates cookies but never exposes provider tokens in JSON', async () => {
  const { run, calls } = setup();
  const result = await run('/api/v1/auth/verify', { method: 'POST', body: { email: user.email, token: '123456' } });
  const text = await result.text();
  assert.equal(result.status, 200);
  assert.equal(JSON.parse(text).authenticated, true);
  assert.doesNotMatch(text, /verified.access|verified_refresh|access_token|refresh_token/);
  assert.deepEqual(calls.find(call => call[0] === 'verify')[1], { email: user.email, token: '123456', type: 'email' });
});

test('invalid OTP and provider failures use bounded generic responses', async () => {
  const { run } = setup({ auth: { verifyOtp: async () => ({ error: { status: 403, message: 'raw credential or email detail' } }) } });
  const result = await run('/api/v1/auth/verify', { method: 'POST', body: { email: user.email, token: '123456' } });
  assert.equal(result.status, 400);
  assert.equal((await result.json()).error.code, 'invalid_code');
  assert.equal(result.headers.get('set-cookie'), null);
});

test('malformed session JWT is rejected without turning an SDK decode failure into an outage', async () => {
  const { run } = setup({ auth: { setSession: async () => ({ error: { name: 'AuthInvalidJwtError', code: 'invalid_jwt', status: 400 } }) } });
  const result = await run('/api/v1/journey', { signedIn: true });
  assert.equal(result.status, 401);
  assert(result.headers.getSetCookie().every(value => value.includes('Max-Age=0')));
});

test('request byte limit applies without Content-Length before provider calls', async () => {
  const { run, calls } = setup();
  const result = await run('/api/v1/auth/otp', { method: 'POST', body: JSON.stringify({ email: `${'x'.repeat(5000)}@example.com` }) });
  assert.equal(result.status, 413);
  assert.deepEqual(calls, []);
});

test('logout requires CSRF checks then clears local cookies even when revocation fails', async () => {
  const { run } = setup({ auth: { signOut: async () => ({ error: { status: 503, message: 'raw upstream error' } }) } });
  const rejected = await run('/api/v1/auth/logout', { method: 'POST', signedIn: true, body: {}, headers: { origin: '' } });
  assert.equal(rejected.status, 403);
  assert.equal(rejected.headers.get('set-cookie'), null);
  const result = await run('/api/v1/auth/logout', { method: 'POST', signedIn: true, body: {} });
  assert.equal(result.status, 503);
  assert.equal((await result.json()).error.code, 'sign_out_incomplete');
  assert(result.headers.getSetCookie().every(value => value.includes('Max-Age=0')));
});

test('cloud reads require verified account and never accept caller-supplied ownership', async () => {
  const { run, calls } = setup();
  assert.equal((await run('/api/v1/journey')).status, 401);
  const result = await run('/api/v1/journey?userId=another-account', { signedIn: true });
  assert.deepEqual(await result.json(), { backup: backup(), revision: 1 });
  assert.deepEqual(calls.find(call => call[0] === 'rpc'), ['rpc', 'mythseal_backup_read', {}]);
});

test('save validates full offline snapshot and sends only CAS revision and snapshot', async () => {
  const { run, calls } = setup();
  const saved = snapshot();
  const result = await run('/api/v1/journey', { method: 'PUT', signedIn: true, body: { expectedRevision: 0, snapshot: saved, userId: 'victim' } });
  assert.equal(result.status, 200);
  assert.deepEqual(calls.find(call => call[0] === 'rpc'), ['rpc', 'mythseal_backup_write', { p_expected_revision: 0, p_snapshot: saved }]);
  assert.deepEqual(calls.find(call => call[0] === 'backup-rate'), ['backup-rate', { key: `backup:${user.id}` }]);
  const pending = snapshot(); pending.profile.pending = {};
  const rejected = await run('/api/v1/journey', { method: 'PUT', signedIn: true, body: { expectedRevision: 1, snapshot: pending } });
  assert.equal(rejected.status, 400);
});

test('negative, noninteger and unsafe revisions never reach database', async () => {
  const { run, calls } = setup();
  for (const expectedRevision of [-1, 0.5, Number.MAX_SAFE_INTEGER, '1', null]) {
    const result = await run('/api/v1/journey', { method: 'PUT', signedIn: true, body: { expectedRevision, snapshot: snapshot() } });
    assert.equal(result.status, 400);
  }
  assert.deepEqual(calls, []);
});

test('database CAS conflicts become 409 without internal SQL details', async () => {
  const { run } = setup({ rpc: async () => ({ error: { code: 'PT409', message: 'private SQL detail' } }) });
  const result = await run('/api/v1/journey', { method: 'PUT', signedIn: true, body: { expectedRevision: 1, snapshot: snapshot() } });
  assert.equal(result.status, 409);
  assert.equal((await result.json()).error.code, 'revision_conflict');
});

test('tombstones retain revisions for reads and deletion; a stale recreate is rejected', async () => {
  let stored = backup(7);
  const { run } = setup({ rpc: async (name, params) => {
    if (name.endsWith('read')) return { data: stored };
    if (params.p_expected_revision !== stored.revision) return { error: { code: 'PT409' } };
    stored = backup(stored.revision + 1, name.endsWith('delete') ? null : params.p_snapshot);
    return { data: stored };
  } });
  const deleted = await run('/api/v1/journey', { method: 'DELETE', signedIn: true, body: { expectedRevision: 7 } });
  assert.deepEqual(await deleted.json(), { backup: null, revision: 8 });
  assert.deepEqual(await (await run('/api/v1/journey', { signedIn: true })).json(), { backup: null, revision: 8 });
  const stale = await run('/api/v1/journey', { method: 'PUT', signedIn: true, body: { expectedRevision: 0, snapshot: snapshot() } });
  assert.equal(stale.status, 409);
  const recreated = await run('/api/v1/journey', { method: 'PUT', signedIn: true, body: { expectedRevision: 8, snapshot: snapshot() } });
  assert.equal((await recreated.json()).revision, 9);
});

test('first cloud read has revision zero and backup writes require rate protection', async () => {
  const { run } = setup({ rpc: async () => ({ data: null }), env: { BACKUP_RATE_LIMIT: undefined } });
  assert.deepEqual(await (await run('/api/v1/journey', { signedIn: true })).json(), { backup: null, revision: 0 });
  assert.equal((await run('/api/v1/journey', { method: 'PUT', signedIn: true, body: { expectedRevision: 0, snapshot: snapshot() } })).status, 503);
});

test('a malformed upstream deletion response cannot report that the cloud backup was removed', async () => {
  const { run } = setup({ rpc: async () => ({ data: backup(2) }) });
  const result = await run('/api/v1/journey', { method: 'DELETE', signedIn: true, body: { expectedRevision: 1 } });
  assert.equal(result.status, 502);
});

test('local HTTP auth requires explicit loopback opt-in and separate cookies', async () => {
  const local = 'http://127.0.0.1:8787';
  const enabled = setup({ env: { APP_ORIGIN: local, ALLOW_INSECURE_LOCAL_AUTH: 'true' } });
  const result = await enabled.run('/api/v1/auth/verify', { method: 'POST', body: { email: user.email, token: '123456' }, url: local, headers: { origin: local } });
  assert.equal(result.status, 200);
  assert(result.headers.getSetCookie().every(value => value.startsWith('mythseal-local-') && !value.includes('; Secure')));
  const disabled = setup({ env: { APP_ORIGIN: local } });
  assert.equal((await disabled.run('/api/v1/account', { url: local })).status, 503);
  const remote = setup({ env: { APP_ORIGIN: 'http://example.com', ALLOW_INSECURE_LOCAL_AUTH: 'true' } });
  assert.equal((await remote.run('/api/v1/account', { url: 'http://example.com' })).status, 503);
});

test('unsupported API routes cannot fall through to HTML; static assets retain their own path', async () => {
  const { run } = setup();
  assert.equal((await run('/api/v1/unknown')).status, 404);
  assert.equal((await run('/api/v1/account', { method: 'POST', body: {} })).status, 405);
  assert.equal((await run('/api/v1/account', { url: 'https://preview.example' })).status, 403);
  const result = await worker.fetch(new Request(`${origin}/assets/mark.svg`), { ASSETS: { fetch: async request => new Response(new URL(request.url).pathname) } });
  assert.equal(await result.text(), '/assets/mark.svg');
});

test('v2 requires explicit capability and never reaches v1 RPCs or accepts a legacy payload', async () => {
  const disabled = setup();
  assert.equal((await disabled.run('/api/v2/journey', { signedIn: true })).status, 426);
  assert.equal(disabled.calls.some(c => c[0] === 'rpc'), false);
  const calls = [], saved = snapshotV2();
  const enabled = setup({ env: { JOURNEY_V2_ENABLED: 'true' }, rpc: async (name, params) => {
    calls.push([name, params]); return { data: backup(1, params.p_snapshot ?? saved) };
  } });
  assert.deepEqual((await (await enabled.run('/api/v1/account')).json()).journeyVersions, [1, 2]);
  const result = await enabled.run('/api/v2/journey', { method: 'PUT', signedIn: true, body: { expectedRevision: 0, snapshot: saved } });
  assert.equal(result.status, 200); assert.equal(calls[0][0], 'mythseal_backup_v2_write');
  assert.deepEqual(calls[0][1], { p_expected_revision: 0, p_snapshot: saved });
  assert.equal((await enabled.run('/api/v2/journey', { method: 'PUT', signedIn: true, body: { expectedRevision: 1, snapshot: snapshot() } })).status, 400);
  assert.equal((await enabled.run('/api/v1/journey', { method: 'PUT', signedIn: true, body: { expectedRevision: 1, snapshot: saved } })).status, 400);
  assert.equal(calls.length, 1, 'wrong-channel writes never reach either namespace');
});

test('v2 keeps account guard, CSRF, size bounds and schema checks on reads', async () => {
  const { run, calls } = setup({ env: { JOURNEY_V2_ENABLED: 'true' } });
  assert.equal((await run('/api/v2/journey', { signedIn: true, headers: { 'x-mythseal-account': 'other' } })).status, 401);
  assert.equal((await run('/api/v2/journey', { method: 'PUT', signedIn: true, body: {}, headers: { origin: '' } })).status, 403);
  assert.equal((await run('/api/v2/journey', { method: 'PUT', signedIn: true, body: {}, headers: { 'content-length': String(5 * 1024 * 1024) } })).status, 413);
  assert.equal(calls.some(c => c[0] === 'rpc'), false);
  assert.equal((await run('/api/v2/journey', { signedIn: true })).status, 502, 'a v1 RPC response cannot masquerade as v2');
});

test('v3 is independently default-off and never routes new snapshots through old namespaces', async () => {
  const disabled = setup({ env: { JOURNEY_V2_ENABLED: 'true' } });
  assert.equal((await disabled.run('/api/v3/journey', { signedIn: true })).status, 426);
  assert.equal(disabled.calls.some(call => call[0] === 'client'), false);
  const calls = [], saved = snapshotV3();
  const enabled = setup({ env: { JOURNEY_V2_ENABLED: 'true', JOURNEY_V3_ENABLED: 'true' }, rpc: async (name, params) => {
    calls.push([name, params]); return { data: backup(1, params.p_snapshot ?? saved) };
  } });
  assert.deepEqual((await (await enabled.run('/api/v1/account')).json()).journeyVersions, [1, 2, 3]);
  const result = await enabled.run('/api/v3/journey', { method: 'PUT', signedIn: true, body: { expectedRevision: 0, snapshot: saved } });
  assert.equal(result.status, 200); assert.equal(calls[0][0], 'mythseal_backup_v3_write');
  assert.deepEqual(calls[0][1], { p_expected_revision: 0, p_snapshot: saved });
  for (const snapshot of [snapshotV2(), { ...saved, version: 2 }]) {
    assert.equal((await enabled.run('/api/v3/journey', { method: 'PUT', signedIn: true, body: { expectedRevision: 1, snapshot } })).status, 400);
  }
  assert.equal((await enabled.run('/api/v2/journey', { method: 'PUT', signedIn: true, body: { expectedRevision: 1, snapshot: saved } })).status, 400);
  assert.equal(calls.length, 1);
});

test('v3 preserves identity, CSRF, request-size, active-run and response-schema guards', async () => {
  const { run, calls } = setup({ env: { JOURNEY_V3_ENABLED: 'true' } });
  assert.deepEqual((await (await run('/api/v1/account')).json()).journeyVersions, [1, 3]);
  assert.equal((await run('/api/v3/journey', { signedIn: true, headers: { 'x-mythseal-account': 'other' } })).status, 401);
  assert.equal((await run('/api/v3/journey', { method: 'PUT', signedIn: true, body: {}, headers: { origin: '' } })).status, 403);
  assert.equal((await run('/api/v3/journey', { method: 'PUT', signedIn: true, body: {}, headers: { 'content-length': String(5 * 1024 * 1024) } })).status, 413);
  const snapshot = snapshotV3(); snapshot.profile.expansion.fireMountain.run = { phase: 'supply' };
  assert.equal((await run('/api/v3/journey', { method: 'PUT', signedIn: true, body: { expectedRevision: 0, snapshot } })).status, 400);
  assert.equal(calls.some(call => call[0] === 'rpc'), false);
  assert.equal((await run('/api/v3/journey', { signedIn: true })).status, 502, 'older RPC response cannot masquerade as v3');
});
