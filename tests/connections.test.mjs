import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  auditConnections, classifyFailure, loadLocalEnvironment, summarizeGithub, summarizeSupabase, summarizeResend, verifyResend,
  summarizeCloudflare, summarizeCloudflareList, summarizeChainId, summarizePinataStatus,
} from '../tools/connections.mjs';

test('connection summaries never reflect provider output or secret diagnostics', () => {
  const secret = 'MYTHSEAL_SECRET_MUST_NEVER_APPEAR';
  const summaries = [
    summarizeGithub({ code: 1, stderr: `401 token=${secret}` }),
    summarizeSupabase({ code: 0, stdout: JSON.stringify([{ id: 'unrelated', name: secret, database_password: secret }]) }),
    summarizeCloudflare({ code: 0, stdout: `Email: ${secret}; cf4198e651bf3009877d49f688c9d88e` }),
    summarizeCloudflareList({ code: 1, stderr: `Error 10042: ${secret}` }, 'r2'),
  ];
  assert.ok(!JSON.stringify(summaries).includes(secret));
  assert.deepEqual(summaries.map(summary => summary.status), ['authentication_required', 'authenticated_project_not_selected', 'verified', 'service_not_enabled']);
});

test('GitHub requires the exact private repository and distinguishes read/push access', () => {
  const result = body => summarizeGithub({ code: 0, stdout: JSON.stringify(body) });
  assert.equal(result({ full_name: 'someone/else', private: true }).status, 'unexpected_repository');
  assert.equal(result({ full_name: 'cambridgetcg/mythseal', private: false }).status, 'unexpected_visibility');
  assert.equal(result({ full_name: 'cambridgetcg/mythseal', private: true, permissions: {} }).status, 'access_denied');
  assert.deepEqual(result({ full_name: 'cambridgetcg/mythseal', private: true, permissions: { pull: true, push: false } }), {
    status: 'verified', private: true, canRead: true, canPush: false, canAdminister: false,
  });
});

test('Supabase account access does not imply the configured project is accessible', () => {
  const result = { code: 0, stdout: JSON.stringify([{ id: 'project-one' }, { id: 'project-two' }]) };
  assert.equal(summarizeSupabase(result, 'project-two').status, 'verified');
  assert.equal(summarizeSupabase(result, 'absent').status, 'configured_project_not_found');
  assert.equal(summarizeSupabase({ code: 0, stdout: '{}' }).status, 'unexpected_response');
});

test('Resend list reports only access and an exact count when the last page is present', () => {
  const secret = 'PRIVATE_DOMAIN_AND_TOKEN_MUST_NOT_APPEAR';
  const domain = { id: secret, name: secret, records: [{ value: secret }], token: secret };
  const result = body => summarizeResend({ code: 0, stdout: JSON.stringify(body) });
  assert.deepEqual(result({ object: 'list', data: [], has_more: false }), { status: 'verified', domainsReadAccess: true, domainCount: 0 });
  const populated = result({ object: 'list', data: [domain], has_more: false });
  assert.deepEqual(populated, { status: 'verified', domainsReadAccess: true, domainCount: 1 });
  assert.ok(!JSON.stringify(populated).includes(secret));
  assert.deepEqual(result({ object: 'list', data: [domain], has_more: true }), { status: 'verified', domainsReadAccess: true, domainCount: null });
});

test('Resend rejects changed, malformed and error output without mistaking it for zero domains', () => {
  for (const body of [null, [], {}, { data: { object: 'list', data: [], has_more: false } },
    { object: 'list', data: [], has_more: 'false' }, { object: 'list', data: [], has_more: true },
    { object: 'list', data: [null], has_more: false }, { object: 'list', data: [{ id: 'id' }], has_more: false },
    { object: 'list', data: [], has_more: false, error: { token: 'secret' } }]) {
    assert.deepEqual(summarizeResend({ code: 0, stdout: JSON.stringify(body) }), { status: 'unexpected_response' });
  }
  assert.deepEqual(summarizeResend({ code: 0, stdout: 'not JSON: re_private' }), { status: 'unexpected_response' });
  assert.deepEqual(summarizeResend({ code: 1, stdout: '{"object":"list","data":[],"has_more":false}' }), { status: 'check_failed' });
});

test('Resend classifies CLI failures while discarding secret diagnostics', () => {
  const secret = 're_PRIVATE_KEY_AND_PROFILE_MUST_NOT_APPEAR';
  const failure = error => summarizeResend({ code: 1, stderr: JSON.stringify({ error: { message: secret, headers: { authorization: secret }, body: secret, ...error } }) });
  const cases = [
    [failure({ code: 'auth_error' }), 'authentication_required'],
    [failure({ code: 'unrecognized_scope' }), 'authentication_required'],
    [failure({ code: 'insufficient_permissions' }), 'access_denied'],
    [failure({ code: 'list_error', statusCode: 403 }), 'access_denied'],
    [failure({ code: 'list_error', statusCode: 429 }), 'rate_limited'],
    [failure({ code: 'auth_error', message: `Could not reach Resend: network failure ${secret}` }), 'network_error'],
    [summarizeResend({ code: 'ENOENT', stderr: secret }), 'missing_cli'],
    [summarizeResend({ killed: true, stderr: secret }), 'timeout'],
  ];
  for (const [actual, expected] of cases) assert.deepEqual(actual, { status: expected });
  assert.ok(!JSON.stringify(cases).includes(secret));
});

test('Resend check pins the Mythseal profile and official endpoint without inherited credentials', async () => {
  const env = {
    PATH: '/fixture/bin', RESEND_API_KEY: 're_private', RESEND_PROFILE: 'other-account',
    RESEND_BASE_URL: 'https://untrusted.invalid', RESEND_CREDENTIAL_STORE: 'file', RESEND_TELEMETRY_DISABLED: '0',
    XDG_CONFIG_HOME: '/fixture/other-account', NODE_OPTIONS: '--require=/fixture/hook.cjs',
    npm_config_node_options: '--require=/fixture/npm-hook.cjs', NPM_CONFIG_NODE_OPTIONS: '--require=/fixture/upper-hook.cjs',
  };
  const before = { ...env };
  let called = false;
  const result = await verifyResend('/fixture/resend', env, async (executable, args, childEnv) => {
    called = true;
    assert.equal(executable, '/fixture/resend');
    assert.deepEqual(args, ['--profile', 'mythseal', 'domains', 'list', '--limit', '100', '--json']);
    assert.equal(childEnv.RESEND_API_KEY, undefined);
    assert.equal(childEnv.RESEND_PROFILE, undefined);
    for (const key of ['XDG_CONFIG_HOME', 'NODE_OPTIONS', 'npm_config_node_options', 'NPM_CONFIG_NODE_OPTIONS']) assert.equal(childEnv[key], undefined);
    assert.equal(childEnv.RESEND_BASE_URL, 'https://api.resend.com');
    assert.equal(childEnv.RESEND_CREDENTIAL_STORE, 'secure_storage');
    assert.equal(childEnv.RESEND_TELEMETRY_DISABLED, '1');
    assert.equal(childEnv.PATH, env.PATH);
    return { code: 0, stdout: '{"object":"list","data":[],"has_more":false}' };
  });
  assert.equal(called, true);
  assert.equal(result.status, 'verified');
  assert.deepEqual(env, before);
  assert.deepEqual(await verifyResend('/fixture/resend', env, async () => { throw new Error('network failure with re_private'); }), { status: 'network_error' });
});

test('local audit includes the Resend toolkit and CLI without attempting account access', async () => {
  const report = await auditConnections();
  assert.deepEqual(report.services.resend, { status: 'not_checked' });
  assert.ok(['available', 'not_installed'].includes(report.modules['resend-cli'].status));
  assert.ok(['executable_found', 'missing_cli'].includes(report.tools.resend.status));
});

test('wrong-chain RPC and denied pinning scopes cannot pass an authentication audit', () => {
  assert.equal(summarizeChainId(8453).status, 'wrong_chain');
  assert.equal(summarizeChainId('84532').status, 'wrong_chain');
  assert.equal(summarizeChainId(84532).status, 'verified');
  assert.equal(summarizePinataStatus(401).status, 'authentication_required');
  assert.equal(summarizePinataStatus(403).status, 'access_denied');
  assert.equal(summarizePinataStatus(200).filesReadAccess, true);
  assert.equal(classifyFailure({ code: 'ENOENT' }), 'missing_cli');
  assert.equal(classifyFailure({ killed: true }), 'timeout');
  assert.equal(classifyFailure({ stderr: 'getaddrinfo ENOTFOUND api.service.test' }), 'network_error');
});

test('Cloudflare resource counts omit names and unfamiliar output is not counted as empty', () => {
  assert.deepEqual(summarizeCloudflareList({ code: 0, stdout: 'Listing buckets...\nname: private-one\ncreation_date: yesterday\n\nname: private-two' }, 'r2'), { status: 'verified', resourceCount: 2 });
  assert.deepEqual(summarizeCloudflareList({ code: 0, stdout: 'Listing Hyperdrive configs\n│ id │ name │\n│ 0123456789abcdef0123456789abcdef │ secret │' }, 'hyperdrive'), { status: 'verified', resourceCount: 1 });
  assert.equal(summarizeCloudflareList({ code: 0, stdout: 'new format with unknown list' }, 'r2').resourceCount, null);
  assert.equal(summarizeCloudflare({ code: 0, stdout: 'Other account only' }).status, 'expected_account_not_verified');
});

test('dotenv loads only allowed values without shell execution or global environment changes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mythseal-connections-'));
  const before = { ...process.env };
  try {
    await writeFile(join(directory, '.env.local'), 'PINATA_JWT="literal-$(do-not-execute)"\nNODE_OPTIONS="--require=unsafe"\nUNRELATED_CONNECTION_TEST="must-not-load"\n');
    const target = {};
    assert.deepEqual(await loadLocalEnvironment(directory, target), { status: 'loaded' });
    assert.equal(target.PINATA_JWT, before.PINATA_JWT ?? 'literal-$(do-not-execute)');
    assert.equal(target.NODE_OPTIONS, undefined);
    assert.equal(target.UNRELATED_CONNECTION_TEST, undefined);
    assert.deepEqual({ ...process.env }, before);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('dotenv rejects symlinks and does not override explicit environment values', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mythseal-connections-'));
  try {
    const realFile = join(directory, 'other.env');
    await writeFile(realFile, 'PINATA_JWT=do-not-load\n');
    await symlink(realFile, join(directory, '.env.local'));
    const target = { PINATA_JWT: 'existing' };
    assert.deepEqual(await loadLocalEnvironment(directory, target), { status: 'rejected_non_regular_file' });
    assert.equal(target.PINATA_JWT, 'existing');
    await rm(join(directory, '.env.local'));
    await writeFile(join(directory, '.env.local'), 'PINATA_JWT=replacement\n');
    assert.equal((await loadLocalEnvironment(directory, target)).status, 'loaded');
    assert.equal(target.PINATA_JWT, 'existing');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
