import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { devNull } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ACCOUNT_ID = 'cf4198e651bf3009877d49f688c9d88e';
const WRANGLER_VERSION = '4.136.1';
const TARGETS = [
  { config: 'wrangler.jsonc', name: 'mythseal', keepVars: true },
  { config: 'wrangler.www.jsonc', name: 'mythseal-www', keepVars: false },
];

class DeploymentError extends Error {}
const stop = message => { throw new DeploymentError(message); };

// Capture child output: provider failures and identity responses must never be
// forwarded verbatim, and deployment commands must never be retried implicitly.
export async function runDeploy({
  args = [], root = ROOT, env = process.env, execute = execFileSync,
  buildProject = build, log = console.log,
} = {}) {
  if (args.some(arg => arg !== '--dry-run') || args.length > 1) {
    stop('Usage: npm run deploy -- [--dry-run]');
  }
  const dryRun = args.includes('--dry-run');
  root = resolve(root);
  for (const { config, name } of TARGETS) {
    let settings;
    try { settings = JSON.parse(await readFile(join(root, config), 'utf8')); }
    catch { stop(`Cannot read ${config} as JSON; review the deployment configuration.`); }
    if (settings.name !== name || settings.account_id !== ACCOUNT_ID) {
      stop(`Unexpected Worker/account in ${config}; no deployment attempted.`);
    }
  }
  if ([env.CLOUDFLARE_ACCOUNT_ID, env.CF_ACCOUNT_ID].some(value => value && value !== ACCOUNT_ID)) {
    stop('Cloudflare account environment override does not match Mythseal; no deployment attempted.');
  }
  const childEnv = {
    ...env, CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID, CLOUDFLARE_ENV: '',
    WRANGLER_SEND_METRICS: 'false', WRANGLER_HIDE_BANNER: 'true',
    WRANGLER_WRITE_LOGS: 'false', WRANGLER_LOG_SANITIZE: 'true',
  };
  const capture = (command, commandArgs, failure) => {
    try {
      return execute(command, commandArgs, {
        cwd: root, env: childEnv, encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 4 * 1024 * 1024,
      }).trim();
    } catch { stop(failure); }
  };
  const wrangler = (commandArgs, failure) => capture(process.execPath, [
    join(root, 'node_modules/wrangler/bin/wrangler.js'),
    ...commandArgs, '--env', '', '--env-file', devNull,
  ], failure);
  const requireClean = () => {
    if (capture('git', ['status', '--porcelain'], 'Cannot verify Git status; no deployment attempted.')) {
      stop('Commit or preserve outstanding work before deploying a recorded release.');
    }
  };
  if (!dryRun) requireClean();
  if (wrangler(['--version'], `Run npm ci to install project-local Wrangler ${WRANGLER_VERSION}.`) !== WRANGLER_VERSION) {
    stop(`Run npm ci to install project-local Wrangler ${WRANGLER_VERSION}.`);
  }

  if (!dryRun) {
    const parse = (output, failure) => {
      try { return JSON.parse(output); } catch { stop(failure); }
    };
    const identity = parse(wrangler(['whoami', '--json', '--config', 'wrangler.jsonc'],
      'Cloudflare identity check failed; no deployment attempted.'),
    'Cloudflare identity response was invalid; no deployment attempted.');
    if (!identity?.loggedIn || !Array.isArray(identity.accounts) || !identity.accounts.some(account => account?.id === ACCOUNT_ID)) {
      stop('Authenticated Cloudflare identity cannot access the Mythseal account; no deployment attempted.');
    }
    const secrets = parse(wrangler(['secret', 'list', '--config', 'wrangler.jsonc', '--format', 'json'],
      'Cannot verify existing account binding metadata; no deployment attempted.'),
    'Account binding metadata was invalid; no deployment attempted.');
    if (!Array.isArray(secrets) || !secrets.some(secret => secret?.name === 'SUPABASE_PUBLISHABLE_KEY' && secret.type === 'secret_text')) {
      stop('SUPABASE_PUBLISHABLE_KEY is missing from the existing apex Worker; use secure owner setup before deploying.');
    }
    log('Verified Mythseal account access and existing publishable-key binding metadata.');
  }

  let release;
  try { release = await buildProject(root); }
  catch { stop('Public asset build failed; no deployment attempted. Check npm run build locally.'); }
  if (!dryRun && !/^[a-f0-9]{40}$/.test(release.gitCommit ?? '')) {
    stop('Build has no valid source commit; no deployment attempted.');
  }
  const command = target => [
    'deploy', '--config', target.config,
    ...(target.keepVars ? ['--keep-vars'] : []),
    '--message', `Mythseal ${release.clientVersion} ${release.gitCommit}`,
  ];
  // Validate both bundles before the first hosted mutation, even on a real release.
  for (const target of TARGETS) {
    wrangler([...command(target), '--dry-run'], `Local bundle check failed for ${target.name}; no deployment attempted.`);
    log(`Local bundle check passed: ${target.name}.`);
  }
  if (dryRun) {
    log('Dry run complete. No hosted identity/binding checks or deployments were performed.');
    return { dryRun, release };
  }
  requireClean();
  if (capture('git', ['rev-parse', 'HEAD'], 'Cannot recheck source commit; no deployment attempted.') !== release.gitCommit) {
    stop('Source commit changed during preflight; no deployment attempted.');
  }
  for (const target of TARGETS) {
    wrangler(command(target), `Deployment command failed for ${target.name}. Inspect provider state before retrying; the two Workers deploy independently.`);
    log(`Deployment command completed: ${target.name}.`);
  }
  log(`Deployed Mythseal ${release.clientVersion} from ${release.gitCommit}. Verify release.json and account readiness before recording success.`);
  return { dryRun, release };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await runDeploy({ args: process.argv.slice(2) }); }
  catch (error) {
    console.error(error instanceof DeploymentError ? error.message : 'Deployment helper failed; inspect local configuration before retrying.');
    process.exitCode = 1;
  }
}
