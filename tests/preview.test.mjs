import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir, devNull } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import { checkPreviewBindings, previewEnvironment, runPreview } from '../tools/preview.mjs';

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'mythseal-preview-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, 'hosting'));
  return directory;
}

test('preview config isolates origin, routes and email sending from the live Worker', async () => {
  const config = JSON.parse(await readFile(new URL('../hosting/wrangler.preview.jsonc', import.meta.url), 'utf8'));
  assert.equal(config.vars.APP_ORIGIN, 'http://127.0.0.1:8791');
  assert.equal(config.vars.OTP_ENABLED, 'false');
  assert.equal(config.vars.ALLOW_INSECURE_LOCAL_AUTH, 'true');
  assert.equal(config.account_id, undefined);
  assert.equal(config.routes, undefined);
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.equal(config.assets.directory, '../dist');
  assert.equal(config.main, '../server/account-api.mjs');
});

test('preview strips inherited credentials, debug hooks and environment selection', () => {
  const env = previewEnvironment({ PATH: '/tools', HOME: '/owner', SUPABASE_SERVICE_ROLE_KEY: 'private',
    NODE_OPTIONS: '--require private.js', CLOUDFLARE_ENV: 'production', RESEND_API_KEY: 'private',
    CLOUDFLARE_INCLUDE_PROCESS_ENV: 'true', DEBUG: '*' });
  assert.equal(env.PATH, '/tools');
  assert.equal(env.HOME, '/owner');
  for (const name of ['SUPABASE_SERVICE_ROLE_KEY', 'NODE_OPTIONS', 'CLOUDFLARE_ENV', 'RESEND_API_KEY', 'DEBUG']) assert.equal(env[name], undefined);
  assert.equal(env.CLOUDFLARE_INCLUDE_PROCESS_ENV, 'false');
});

test('fresh preview needs no key; only a private publishable binding is accepted', async t => {
  const directory = await fixture(t);
  assert.equal(await checkPreviewBindings(directory), false);
  const path = join(directory, 'hosting/.dev.vars');
  await writeFile(path, 'SUPABASE_PUBLISHABLE_KEY=sb_publishable_fixture\n', { mode: 0o600 });
  assert.equal(await checkPreviewBindings(directory), true);
  await writeFile(path, 'SUPABASE_PUBLISHABLE_KEY=sb_secret_fixture\n');
  await assert.rejects(checkPreviewBindings(directory), /only SUPABASE_PUBLISHABLE_KEY/);
  await writeFile(path, 'SUPABASE_PUBLISHABLE_KEY=sb_publishable_fixture\nOTP_ENABLED=true\n');
  await assert.rejects(checkPreviewBindings(directory), /only SUPABASE_PUBLISHABLE_KEY/);
  for (const injected of ['OTP_ENABLED: true', 'NODE_OPTIONS: --require private.js', 'SUPABASE_PUBLISHABLE_KEY=sb_publishable_duplicate']) {
    await writeFile(path, `SUPABASE_PUBLISHABLE_KEY=sb_publishable_fixture\n${injected}\n`);
    await assert.rejects(checkPreviewBindings(directory), /only SUPABASE_PUBLISHABLE_KEY/);
  }
});

test('preview rejects symlinked and environment-specific binding files', async t => {
  const directory = await fixture(t);
  const outside = join(directory, 'outside');
  await writeFile(outside, 'SUPABASE_PUBLISHABLE_KEY=sb_publishable_fixture', { mode: 0o600 });
  await symlink(outside, join(directory, 'hosting/.dev.vars'));
  await assert.rejects(checkPreviewBindings(directory), /regular private file/);
  await writeFile(join(directory, 'hosting/.dev.vars.local'), 'OTP_ENABLED=true');
  await assert.rejects(checkPreviewBindings(directory), /only hosting/);
});

test('preview rejects assignments hidden after any dotenv line terminator before launch', async t => {
  const directory = await fixture(t);
  const path = join(directory, 'hosting/.dev.vars');
  const key = 'SUPABASE_PUBLISHABLE_KEY=sb_publishable_fixture';
  for (const separator of ['\n', '\r\n', '\r', '\u2028', '\u2029']) {
    for (const injected of ['OTP_ENABLED=true', 'SUPABASE_SERVICE_ROLE_KEY=private']) {
      await writeFile(path, `${key}\n# comment${separator}${injected}\n`, { mode: 0o600 });
      await assert.rejects(checkPreviewBindings(directory), /only SUPABASE_PUBLISHABLE_KEY/);
      let calls = 0;
      await assert.rejects(runPreview([], {
        directory,
        capture: () => { calls++; return '4.136.1'; },
        buildAssets: async () => { calls++; },
        launch: () => { calls++; throw new Error('Unexpected preview launch'); },
      }), /only SUPABASE_PUBLISHABLE_KEY/);
      assert.equal(calls, 0);
    }
    await writeFile(path, `# fixture${separator}${key}${separator}`);
    assert.equal(await checkPreviewBindings(directory), true);
  }
});

test('preview launches only pinned local Wrangler and dry run never starts a server', async t => {
  const directory = await fixture(t);
  const calls = [];
  const dependencies = { directory, env: {},
    capture: (command, args) => { calls.push({ command, args }); return '4.136.1'; },
    buildAssets: async () => calls.push({ build: true }),
    launch: (command, args, options) => {
      calls.push({ command, args, options });
      const child = new EventEmitter();
      queueMicrotask(() => child.emit('exit', 0, null));
      return child;
    },
  };
  assert.equal(await runPreview(['--dry-run'], dependencies), 0);
  const run = calls.at(-1);
  assert.equal(run.args[0], join(directory, 'node_modules/wrangler/bin/wrangler.js'));
  assert.ok(run.args.includes('--dry-run'));
  assert.ok(run.args.includes('deploy'));
  assert.equal(run.args.includes('dev'), false);
  assert.equal(run.args.at(-1), devNull);
  calls.length = 0;
  assert.equal(await runPreview([], dependencies), 0);
  assert.ok(calls.at(-1).args.includes('--local'));
  assert.ok(calls.at(-1).args.includes('127.0.0.1'));
  calls.length = 0;
  await assert.rejects(runPreview(['--remote'], dependencies), /Usage/);
  assert.equal(calls.length, 0);
});

test('unsafe preview bindings stop before any CLI, build or server runs', async t => {
  const directory = await fixture(t);
  await writeFile(join(directory, 'hosting/.dev.vars'), 'SUPABASE_SERVICE_ROLE_KEY=private', { mode: 0o600 });
  let launched = false;
  await assert.rejects(runPreview([], { directory, capture: () => { launched = true; } }), /only SUPABASE_PUBLISHABLE_KEY/);
  assert.equal(launched, false);
});
