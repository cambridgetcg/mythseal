import { execFileSync, spawn } from 'node:child_process';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { devNull } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from './build.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const configPath = 'hosting/wrangler.preview.jsonc';

// Preview has no need for administration credentials or ambient Node hooks.
export function previewEnvironment(source = process.env) {
  const env = {};
  for (const name of ['PATH', 'HOME', 'USERPROFILE', 'SystemRoot', 'SYSTEMROOT', 'TMPDIR', 'TEMP', 'TMP', 'LANG', 'TERM']) {
    if (source[name] !== undefined) env[name] = source[name];
  }
  return {
    ...env, WRANGLER_SEND_METRICS: 'false', WRANGLER_WRITE_LOGS: 'false',
    CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'true',
    CLOUDFLARE_INCLUDE_PROCESS_ENV: 'false',
  };
}

export async function checkPreviewBindings(directory = root) {
  const hosting = join(directory, 'hosting');
  if ((await lstat(hosting)).isSymbolicLink()) throw new Error('Preview hosting directory must not be a symlink.');
  // Wrangler can merge environment-specific .dev.vars files. Keep one source.
  const entries = await readdir(hosting);
  if (entries.some(name => name.startsWith('.dev.vars.'))) throw new Error('Use only hosting/.dev.vars for preview bindings.');
  const path = join(hosting, '.dev.vars');
  let details;
  try { details = await lstat(path); } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw new Error('Cannot inspect preview bindings.');
  }
  if (!details.isFile() || details.isSymbolicLink() || (process.platform !== 'win32' && (details.mode & 0o077))) {
    throw new Error('hosting/.dev.vars must be a regular private file (chmod 600).');
  }
  let present = false;
  // Deliberately narrower than dotenv: colon assignments, multiline values,
  // duplicates and parser disagreements must not smuggle runtime settings.
  // Match every line terminator its multiline parser recognizes, including
  // lone CR and Unicode separators that could otherwise hide after a comment.
  for (const raw of (await readFile(path, 'utf8')).split(/\r\n|[\n\r\u2028\u2029]/u)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (present || !/^SUPABASE_PUBLISHABLE_KEY=sb_publishable_[A-Za-z0-9_-]+$/.test(line)) {
      throw new Error('Preview bindings allow only SUPABASE_PUBLISHABLE_KEY=sb_publishable_… on one line, without quotes.');
    }
    present = true;
  }
  return present;
}

export async function runPreview(args = process.argv.slice(2), {
  directory = root, env = process.env, capture = execFileSync, launch = spawn, buildAssets = build,
} = {}) {
  if (args.length > 1 || args.some(arg => arg !== '--dry-run')) throw new Error('Usage: npm run preview [-- --dry-run]');
  const childEnv = previewEnvironment(env);
  const wrangler = join(directory, 'node_modules/wrangler/bin/wrangler.js');
  const hasBinding = await checkPreviewBindings(directory);
  // Explicit env-file prevents Wrangler's startup from loading root .env.local.
  const selection = ['--env', '', '--env-file', hasBinding ? join(directory, 'hosting/.dev.vars') : devNull];
  let version;
  try { version = capture(process.execPath, [wrangler, '--version', ...selection], { cwd: directory, env: childEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
  catch { throw new Error('Run npm ci to install project Wrangler.'); }
  if (version !== '4.136.1') throw new Error('Run npm ci to restore Wrangler 4.136.1.');
  await buildAssets(directory);
  const flags = args.includes('--dry-run')
    ? ['deploy', '--config', configPath, '--dry-run']
    : ['dev', '--config', configPath, '--local', '--ip', '127.0.0.1', '--port', '8791', '--local-protocol', 'http', '--persist-to', '.runtime/preview/state', '--show-interactive-dev-session', 'false'];
  return new Promise((resolveResult, reject) => {
    const child = launch(process.execPath, [wrangler, ...flags, ...selection], { cwd: directory, env: childEnv, stdio: 'inherit' });
    child.once('error', () => reject(new Error('Could not start local Wrangler.')));
    child.once('exit', (code, signal) => resolveResult(signal === 'SIGINT' ? 0 : code ?? 1));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { process.exitCode = await runPreview(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
