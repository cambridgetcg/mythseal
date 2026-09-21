import { execFile } from 'node:child_process';
import { access, lstat, readFile, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createRequire } from 'node:module';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadEnvFile } from 'node:process';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const ACCOUNT = 'cf4198e651bf3009877d49f688c9d88e';
const REPOSITORY = 'cambridgetcg/mythseal';
const ENV_KEYS = [
  'SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_REF', 'MYTHSEAL_SUPABASE_PROJECT_REF',
  'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY',
  'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL',
  'BASE_SEPOLIA_RPC_URL', 'PINATA_JWT', 'PINATA_GATEWAY',
  'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID',
  'GH_TOKEN', 'GITHUB_TOKEN', 'VERCEL_TOKEN', 'FLY_API_TOKEN',
  'AWS_PROFILE', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN',
];
const MODULES = ['wrangler', 'supabase', '@supabase/supabase-js', 'pg', 'viem', '@openzeppelin/contracts', '@capacitor/cli', '@capacitor/core', '@capacitor/ios', '@capacitor/android'];
const CLI_NAMES = ['gh', 'wrangler', 'supabase', 'forge', 'cast', 'anvil', 'docker', 'xcodebuild', 'java', 'adb', 'vercel', 'fly', 'flyctl', 'aws'];

// Only status values derived from untrusted subprocess/API output enter the report.
// In particular, never return Error.message, stderr, a response body, or env values.
export function classifyFailure(result = {}) {
  if (result.missing || result.code === 'ENOENT') return 'missing_cli';
  if (result.timedOut || result.killed || result.code === 'ETIMEDOUT') return 'timeout';
  const diagnostic = `${result.stdout || ''}\n${result.stderr || ''}\n${result.message || ''}`;
  if (/timed out|timeout/i.test(diagnostic)) return 'timeout';
  if (/10042|enable\s+R2|R2.*not.*enabled/i.test(diagnostic)) return 'service_not_enabled';
  if (/403|forbidden|permission denied|insufficient.*scope|unauthorized.*access/i.test(diagnostic)) return 'access_denied';
  if (/401|not logged in|not authenticated|login required|login to|log in to|access token not provided|no credentials|unable to locate credentials|authentication (?:error|failed)|invalid.*token/i.test(diagnostic)) return 'authentication_required';
  if (/ENOTFOUND|ECONNREFUSED|ECONNRESET|EAI_AGAIN|fetch failed|network|TLS|certificate|connect ETIMEDOUT/i.test(diagnostic)) return 'network_error';
  return 'check_failed';
}

export function summarizeGithub(result) {
  if (result.code !== 0) return { status: classifyFailure(result) };
  try {
    const body = JSON.parse(result.stdout);
    if (body.full_name !== REPOSITORY) return { status: 'unexpected_repository' };
    if (body.private !== true) return { status: 'unexpected_visibility' };
    if (body.permissions?.pull !== true) return { status: 'access_denied' };
    return { status: 'verified', private: true, canRead: true, canPush: body.permissions?.push === true, canAdminister: body.permissions?.admin === true };
  } catch { return { status: 'unexpected_response' }; }
}

export function summarizeSupabase(result, projectRef) {
  if (result.code !== 0) return { status: classifyFailure(result) };
  try {
    const body = JSON.parse(result.stdout);
    if (!Array.isArray(body) || body.some(project => !project || typeof project.id !== 'string')) return { status: 'unexpected_response' };
    if (!projectRef) return { status: 'authenticated_project_not_selected', projectCount: body.length };
    const projectMatched = body.some(project => project.id === projectRef);
    return { status: projectMatched ? 'verified' : 'configured_project_not_found', projectCount: body.length, projectMatched };
  } catch { return { status: 'unexpected_response' }; }
}

export function summarizeCloudflare(result) {
  if (result.code !== 0) return { status: classifyFailure(result) };
  if (!result.stdout.includes(ACCOUNT)) {
    if (/not authenticated|not logged in/i.test(result.stdout)) return { status: 'authentication_required' };
    return { status: 'expected_account_not_verified' };
  }
  return { status: 'verified', expectedAccountMatched: true };
}

export function summarizeCloudflareList(result, service) {
  if (result.code !== 0) return { status: classifyFailure(result) };
  const output = result.stdout.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
  if (service === 'r2' && /Listing buckets/i.test(output)) {
    return { status: 'verified', resourceCount: [...output.matchAll(/^\s*name:\s*\S/gm)].length };
  }
  if (service === 'hyperdrive' && /Listing Hyperdrive configs/i.test(output)) {
    const ids = [...output.matchAll(/[│|]\s*([a-f0-9]{32})\s*[│|]/gi)];
    // Empty lists have no rows; a changed table format must not silently mean zero.
    return { status: 'verified', resourceCount: ids.length || (/[│|]/.test(output) ? null : 0) };
  }
  return { status: 'verified', resourceCount: null };
}

export function summarizeChainId(chainId) {
  return chainId === 84532
    ? { status: 'verified', expectedChainMatched: true, chainId: 84532 }
    : { status: 'wrong_chain', expectedChainMatched: false };
}

export function summarizePinataStatus(status) {
  if (status === 200) return { status: 'verified', httpStatus: 200, filesReadAccess: true };
  return { status: status === 401 ? 'authentication_required' : status === 403 ? 'access_denied' : 'http_error', httpStatus: status };
}

export async function loadLocalEnvironment(directory = root, target = process.env) {
  const filename = join(directory, '.env.local');
  try {
    const details = await lstat(filename);
    if (!details.isFile() || details.isSymbolicLink()) return { status: 'rejected_non_regular_file' };
    if (await realpath(dirname(filename)) !== await realpath(directory)) return { status: 'rejected_path' };
  } catch (error) {
    return { status: error.code === 'ENOENT' ? 'not_present' : 'unreadable' };
  }
  const before = { ...process.env };
  const retained = {};
  let status = 'loaded';
  try {
    loadEnvFile(filename);
    for (const key of ENV_KEYS) if (process.env[key] !== undefined) retained[key] = process.env[key];
  } catch { status = 'unreadable'; }
  finally {
    for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key];
    Object.assign(process.env, before);
  }
  if (status === 'loaded') {
    for (const [key, value] of Object.entries(retained)) if (target[key] === undefined) target[key] = value;
  }
  return { status };
}

async function findExecutable(name, env) {
  const candidates = [join(root, 'node_modules', '.bin', name), ...(env.PATH || '').split(delimiter).filter(Boolean).map(directory => join(directory, name))];
  for (const candidate of candidates) {
    try { await access(candidate, constants.X_OK); return candidate; } catch { /* Try next path. */ }
  }
  return null;
}

async function moduleStatus(name) {
  try {
    const filename = require.resolve(`${name}/package.json`);
    const { version } = JSON.parse(await readFile(filename, 'utf8'));
    return { status: 'available', version: /^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/.test(version) ? version : null };
  } catch { return { status: 'not_installed' }; }
}

function runCommand(executable, args, env) {
  if (!executable) return Promise.resolve({ missing: true, code: 'ENOENT' });
  const childEnv = {
    ...env, CI: 'true', NO_COLOR: '1', TERM: 'dumb', GH_PROMPT_DISABLED: '1',
    WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_ACCOUNT_ID: ACCOUNT,
    AWS_EC2_METADATA_DISABLED: 'true', AWS_PAGER: '',
  };
  // A local dotenv file must not enable subprocess debug logging or Node hooks.
  delete childEnv.DEBUG;
  delete childEnv.NODE_OPTIONS;
  delete childEnv.GH_DEBUG;
  delete childEnv.WRANGLER_LOG;
  return new Promise(resolveResult => {
    const child = execFile(executable, args, { cwd: root, env: childEnv, timeout: 20000, maxBuffer: 1024 * 1024, encoding: 'utf8', windowsHide: true }, (error, stdout, stderr) => {
      resolveResult({ code: error?.code ?? 0, killed: error?.killed === true, stdout, stderr });
    });
    child.stdin?.end();
  });
}

async function verifyBase(env) {
  try {
    const endpoint = env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
    let url;
    try { url = new URL(endpoint); } catch { return { status: 'invalid_rpc_url' }; }
    if (url.protocol !== 'https:' || url.username || url.password) return { status: 'invalid_rpc_url' };
    const { createPublicClient, http } = await import('viem');
    const { baseSepolia } = await import('viem/chains');
    const client = createPublicClient({ chain: baseSepolia, transport: http(endpoint, { timeout: 10000, retryCount: 0 }) });
    return summarizeChainId(await client.getChainId());
  } catch (error) {
    return { status: error.code === 'ERR_MODULE_NOT_FOUND' ? 'missing_toolkit' : classifyFailure(error) };
  }
}

async function verifyPinata(env) {
  if (!env.PINATA_JWT) return { status: 'credential_not_configured' };
  try {
    const response = await fetch('https://api.pinata.cloud/v3/files/public?limit=1', {
      headers: { Authorization: `Bearer ${env.PINATA_JWT}` }, redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    await response.body?.cancel();
    return summarizePinataStatus(response.status);
  } catch (error) {
    return { status: error.name === 'TimeoutError' ? 'timeout' : 'network_error' };
  }
}

export async function auditConnections({ live = false, all = false } = {}) {
  const env = { ...process.env };
  const environmentFile = await loadLocalEnvironment(root, env);
  const executables = Object.fromEntries(await Promise.all(CLI_NAMES.map(async name => [name, await findExecutable(name, env)])));
  const modules = Object.fromEntries(await Promise.all(MODULES.map(async name => [name, await moduleStatus(name)])));
  const report = {
    checkedAt: new Date().toISOString(), mode: all ? 'all' : live ? 'live' : 'local',
    environmentFile,
    environment: Object.fromEntries(ENV_KEYS.map(key => [key, Boolean(env[key])])),
    tools: Object.fromEntries(Object.entries(executables).map(([name, value]) => [name, { status: value ? 'executable_found' : 'missing_cli' }])),
    modules,
    services: Object.fromEntries(['github', 'cloudflare', 'r2', 'hyperdrive', 'supabase', 'baseSepolia', 'pinata', 'vercel', 'fly', 'aws'].map(name => [name, { status: 'not_checked' }])),
  };
  if (!live && !all) return report;
  const run = (name, args) => runCommand(executables[name], args, env);
  const checks = [
    run('gh', ['api', '--hostname', 'github.com', '--method', 'GET', `repos/${REPOSITORY}`]).then(result => { report.services.github = summarizeGithub(result); }),
    run('wrangler', ['whoami']).then(async result => {
      report.services.cloudflare = summarizeCloudflare(result);
      if (report.services.cloudflare.status !== 'verified') {
        report.services.r2 = report.services.hyperdrive = { status: 'account_not_verified' };
        return;
      }
      const [r2, hyperdrive] = await Promise.all([
        run('wrangler', ['r2', 'bucket', 'list']), run('wrangler', ['hyperdrive', 'list']),
      ]);
      report.services.r2 = summarizeCloudflareList(r2, 'r2');
      report.services.hyperdrive = summarizeCloudflareList(hyperdrive, 'hyperdrive');
    }),
    run('supabase', ['projects', 'list', '--output', 'json']).then(result => { report.services.supabase = summarizeSupabase(result, env.MYTHSEAL_SUPABASE_PROJECT_REF || env.SUPABASE_PROJECT_REF); }),
    verifyBase(env).then(result => { report.services.baseSepolia = result; }),
    verifyPinata(env).then(result => { report.services.pinata = result; }),
  ];
  if (all) {
    const optional = [
      ['vercel', 'vercel', ['whoami']],
      ['fly', executables.fly ? 'fly' : 'flyctl', ['auth', 'whoami']],
      ['aws', 'aws', ['sts', 'get-caller-identity', '--output', 'json', '--no-cli-pager']],
    ];
    for (const [service, command, args] of optional) checks.push(run(command, args).then(result => {
      report.services[service] = { status: result.code === 0 && result.stdout.trim() ? 'identity_verified' : classifyFailure(result) };
    }));
  }
  await Promise.all(checks);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const flags = process.argv.slice(2);
  if (flags.some(flag => !['--live', '--all'].includes(flag))) {
    console.log(JSON.stringify({ checkedAt: new Date().toISOString(), status: 'invalid_arguments', usage: 'node tools/connections.mjs [--live|--all]' }, null, 2));
    process.exitCode = 2;
  } else {
    try { console.log(JSON.stringify(await auditConnections({ live: flags.includes('--live'), all: flags.includes('--all') }), null, 2)); }
    catch { console.log(JSON.stringify({ checkedAt: new Date().toISOString(), status: 'audit_failed' }, null, 2)); process.exitCode = 1; }
  }
}
