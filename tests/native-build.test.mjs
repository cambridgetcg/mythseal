// The native target (store builds) leaves out the Cloudflare-only _headers file and every
// account file (App Review 2.5.19: no hidden or dormant features), swaps their imports for
// account-offline.mjs, and declares no runtime-gated account features; the web target is
// unchanged, byte for byte.
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readdir, readFile, lstat, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build, BUILD_TARGETS, PUBLIC_FILES, NATIVE_EXCLUDED, NATIVE_EDITS, NATIVE_OFFLINE, localReferences, importedNames, exportedNames, parseBuildArgs } from '../tools/build.mjs';

const repository = new URL('../', import.meta.url);
const APP = "import { createAccountController as createAccountClient } from './account-client.mjs';\nimport { accountMarkup, accountButtonMarkup } from './account-ui.mjs';\nimport { createOfflineAccount } from './account-offline.mjs';\n";
const INDEX = '<!doctype html>\n<head>\n  <link rel="stylesheet" href="styles.css">\n  <link rel="stylesheet" href="account.css">\n</head>\n<script type="module" src="bootstrap.mjs"></script>\n';
const OFFLINE = "export function createOfflineAccount() { return {}; }\nexport const createAccountController = () => createOfflineAccount();\nexport const accountMarkup = () => '';\nexport const accountButtonMarkup = () => '';\n";
const fixtureText = { 'app.mjs': APP, 'index.html': INDEX, 'account-offline.mjs': OFFLINE };

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

test('the native build stops when a module takes a name from the swapped account modules that account-offline.mjs lacks', async t => {
  for (const [line, missing] of [
    ["import { accountMarkup, accountButtonMarkup, accountBadge } from './account-ui.mjs';", 'accountBadge'],
    ["import { createAccountController as createAccountClient, accountRefresh } from './account-client.mjs';", 'accountRefresh'],
    ["import accountUI from './account-ui.mjs';", 'default'],
    ["import * as accountUI from './account-ui.mjs';", '\\*'],
  ]) {
    const app = APP.replace(/^import \{ accountMarkup, accountButtonMarkup \} from '\.\/account-ui\.mjs';$/m, '').replace(/^import \{ createAccountController as createAccountClient \} from '\.\/account-client\.mjs';$/m, '');
    const swapped = line.includes('account-ui') ? `${line}\nimport { createAccountController as createAccountClient } from './account-client.mjs';\n` : `${line}\nimport { accountMarkup, accountButtonMarkup } from './account-ui.mjs';\n`;
    const root = await fixture(t, { text: { 'app.mjs': swapped + app } });
    await assert.rejects(build(root, { target: 'native' }), new RegExp(`Native build: app\\.mjs imports ${missing} from account-offline\\.mjs`), line);
    await assert.rejects(lstat(join(root, 'dist')), { code: 'ENOENT' }, 'nothing written');
    // The website does not swap, so it builds as before.
    await build(root);
  }
  // Without the stand-in at all, the swap would point at nothing.
  const root = await fixture(t, { headers: false, text: { 'account-offline.mjs': 'export const unrelated = 1;\n' } });
  await assert.rejects(build(root, { target: 'native' }), /imports createAccountController, accountMarkup, accountButtonMarkup, createOfflineAccount from account-offline\.mjs/);
});

test('the export reading agrees with Node on the real account-offline.mjs, and covers every name app.mjs swaps', async () => {
  const text = await readFile(new URL(NATIVE_OFFLINE, repository), 'utf8');
  assert.deepEqual([...exportedNames(text)].sort(), Object.keys(await import(new URL(NATIVE_OFFLINE, repository))).sort());
  const app = await readFile(new URL('app.mjs', repository), 'utf8');
  const swapped = ['account-client.mjs', 'account-ui.mjs'].flatMap(module => importedNames('app.mjs', app, module));
  assert.ok(swapped.length >= 3, 'app.mjs takes names from both account modules');
  assert.deepEqual(swapped.filter(name => !exportedNames(text).has(name)), []);
  assert.deepEqual(importedNames('dir/a.mjs', "import { x as y, z } from '../account-offline.mjs';\nimport d, { w } from './account-offline.mjs';", 'account-offline.mjs'), ['x', 'z']);
  assert.deepEqual([...exportedNames('export { a, b as c };\nexport default 1;\nexport async function f() {}\nexport class K {}')].sort(), ['a', 'c', 'default', 'f', 'K'].sort());
});

test('the build command line takes --target <name> or --target=<name> and refuses anything else', () => {
  assert.deepEqual(parseBuildArgs([]), { target: 'web' });
  assert.deepEqual(parseBuildArgs(['--target', 'native']), { target: 'native' });
  assert.deepEqual(parseBuildArgs(['--target=native']), { target: 'native' });
  for (const args of [['--target'], ['--native'], ['native'], ['--target', 'native', 'web'], ['--target', '--native']]) {
    assert.throws(() => parseBuildArgs(args), { code: /^ERR_PARSE_ARGS_/ }, args.join(' '));
  }
  // The script itself stops before building: a bare --target never falls back to the web build.
  const script = fileURLToPath(new URL('../tools/build.mjs', import.meta.url));
  assert.throws(() => execFileSync(process.execPath, [script, '--target'], { cwd: tmpdir(), stdio: 'pipe' }), error => /ERR_PARSE_ARGS_INVALID_OPTION_VALUE/.test(String(error.stderr)));
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
  // 出發前整備's deck warning (.account-message.is-error) keeps its styling without account.css.
  const styles = await Promise.all([...shipped].filter(path => path.endsWith('.css') && seen.has(path)).map(path => readFile(join(root, 'dist', path), 'utf8')));
  for (const rule of ['.account-message{', '.account-message.is-error{']) assert.ok(styles.some(text => text.includes(rule)), `${rule} ships in a stylesheet the app loads`);
});
