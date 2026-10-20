// The native target (store builds) leaves out the Cloudflare-only _headers file and every
// account file (App Review 2.5.19: no hidden or dormant features), swaps their imports for
// account-offline.mjs, and declares no runtime-gated account features; the web target is
// unchanged, byte for byte.
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readdir, readFile, lstat, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { build, BUILD_TARGETS, PUBLIC_FILES, NATIVE_EXCLUDED, NATIVE_EDITS, localReferences } from '../tools/build.mjs';

const repository = new URL('../', import.meta.url);
const APP = "import { createAccountController as createAccountClient } from './account-client.mjs';\nimport { accountMarkup, accountButtonMarkup } from './account-ui.mjs';\nimport { createOfflineAccount } from './account-offline.mjs';\n";
const INDEX = '<!doctype html>\n<head>\n  <link rel="stylesheet" href="styles.css">\n  <link rel="stylesheet" href="account.css">\n</head>\n<script type="module" src="bootstrap.mjs"></script>\n';
const fixtureText = { 'app.mjs': APP, 'index.html': INDEX };

async function fixture(t, { headers = true, text = {} } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'mythseal-native-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = [...PUBLIC_FILES, 'package.json', ...(headers ? ['hosting/_headers'] : [])];
  const contents = { ...fixtureText, ...text };
  for (const path of paths) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), path === 'package.json' ? '{"version":"0.5.1"}' : contents[path] ?? `fixture ${path}`);
  }
  return root;
}

async function outputFiles(root) {
  const entries = await readdir(join(root, 'dist'), { recursive: true });
  const files = await Promise.all(entries.map(async path => (await lstat(join(root, 'dist', path))).isFile() ? path : null));
  return files.filter(Boolean).sort();
}

test('the build targets are web and native, and native leaves out exactly the account files', () => {
  assert.deepEqual(BUILD_TARGETS, ['web', 'native']);
  assert.deepEqual([...NATIVE_EXCLUDED], ['account-client.mjs', 'account-ui.mjs', 'account.css']);
  for (const file of NATIVE_EXCLUDED) assert.ok(PUBLIC_FILES.includes(file), `${file} is served on the web`);
  assert.ok(PUBLIC_FILES.includes('cloud-save.mjs'), 'cloud-save.mjs is the local journey validator and ships in both');
  assert.ok(PUBLIC_FILES.includes('account-offline.mjs'));
});

test('a native build ships the allowlist without the account files or _headers, and declares no account features', async t => {
  const root = await fixture(t, { headers: false });
  const release = await build(root, { target: 'native' });
  assert.deepEqual(await outputFiles(root), [...PUBLIC_FILES.filter(path => !NATIVE_EXCLUDED.includes(path)), 'release.json'].sort());
  assert.equal(release.target, 'native');
  assert.equal(release.hostingHeadersSHA256, null);
  assert.deepEqual(release.runtimeGatedFeatures, []);
  assert.equal(release.enabledFeatures.includes('journey-archive-ui'), false, 'no 旅程閣 in the app');
  assert.equal(release.clientVersion, '0.5.1');
  assert.deepEqual(release.assets.map(asset => asset.path).filter(path => NATIVE_EXCLUDED.includes(path)), []);
  // The two account imports now name the inert module; the account stylesheet link is gone.
  const app = await readFile(join(root, 'dist/app.mjs'), 'utf8');
  assert.doesNotMatch(app, /account-client\.mjs|account-ui\.mjs/);
  assert.equal(app.split("from './account-offline.mjs';").length - 1, 3);
  assert.doesNotMatch(await readFile(join(root, 'dist/index.html'), 'utf8'), /account\.css/);
});

test('a web build is unchanged: every file byte for byte, _headers, no target key, account features still gated', async t => {
  const root = await fixture(t);
  const release = await build(root);
  assert.deepEqual(await outputFiles(root), [...PUBLIC_FILES, '_headers', 'release.json'].sort());
  for (const path of ['app.mjs', 'index.html', 'account-client.mjs']) assert.equal(await readFile(join(root, 'dist', path), 'utf8'), await readFile(join(root, path), 'utf8'), path);
  assert.equal('target' in release, false);
  assert.match(release.hostingHeadersSHA256, /^[0-9a-f]{64}$/);
  assert.ok(release.enabledFeatures.includes('journey-archive-ui'));
  assert.deepEqual(release.runtimeGatedFeatures, ['email-login', 'private-journey-backup']);
});

test('the native build stops, writing nothing, when an edit does not match exactly once', async t => {
  for (const [path, text] of [['app.mjs', "import { x } from './engine.mjs';\n"], ['app.mjs', APP + APP], ['index.html', '<!doctype html>\n']]) {
    const root = await fixture(t, { headers: false, text: { [path]: text } });
    await assert.rejects(build(root, { target: 'native' }), /Native build: expected exactly one/, `${path}: ${text.length}`);
    await assert.rejects(lstat(join(root, 'dist')), { code: 'ENOENT' });
  }
});

test('the native build stops when any shipped file still refers to an excluded one', async t => {
  for (const [path, text, excluded] of [
    ['save-ui.mjs', "import { accountMarkup } from './account-ui.mjs';\n", 'account-ui.mjs'],
    ['bootstrap.mjs', "await import('./account-client.mjs');\n", 'account-client.mjs'],
    ['styles.css', '@import "account.css";\n', 'account.css'],
  ]) {
    const root = await fixture(t, { headers: false, text: { [path]: text } });
    await assert.rejects(build(root, { target: 'native' }), new RegExp(`${path.replace('.', '\\.')} still refers to ${excluded.replace('.', '\\.')}`));
  }
  assert.deepEqual(Object.keys(NATIVE_EDITS).sort(), ['app.mjs', 'index.html']);
});

test('an unknown target is refused before anything is written', async t => {
  const root = await fixture(t);
  await assert.rejects(build(root, { target: 'desktop' }), /Unknown build target: desktop/);
  await assert.rejects(lstat(join(root, 'dist')), { code: 'ENOENT' });
});

test('the real native bundle: no account file, and every import and asset reference resolves inside it', async t => {
  // The repository's real pages, modules and styles; images are stand-ins (no reference reads them).
  const root = await mkdtemp(join(tmpdir(), 'mythseal-native-real-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const path of [...PUBLIC_FILES, 'package.json']) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), /\.(?:mjs|css|html|json)$/.test(path) ? await readFile(new URL(path, repository)) : `asset ${path}`);
  }
  await build(root, { target: 'native' });
  const shipped = new Set(await outputFiles(root));
  for (const file of NATIVE_EXCLUDED) assert.equal(shipped.has(file), false, `${file} is not in the app`);
  const broken = [];
  const seen = new Set(), queue = ['index.html'];
  while (queue.length) {
    const path = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);
    if (!/\.(?:mjs|css|html)$/.test(path)) continue;
    for (const reference of localReferences(path, await readFile(join(root, 'dist', path), 'utf8'))) {
      if (!shipped.has(reference)) broken.push(`${path} → ${reference}`);
      else queue.push(reference);
    }
  }
  assert.deepEqual(broken, [], 'every local reference reachable from index.html is in the bundle');
  for (const module of ['bootstrap.mjs', 'app.mjs', 'account-offline.mjs', 'platform.mjs', 'cloud-save.mjs']) assert.ok(seen.has(module), `${module} is reached`);
});
