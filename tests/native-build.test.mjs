// The native target (store builds) leaves out the Cloudflare-only _headers file and
// declares no runtime-gated account features; the web target is unchanged.
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readdir, lstat, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { build, BUILD_TARGETS, PUBLIC_FILES } from '../tools/build.mjs';

async function fixture(t, { headers = true } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'mythseal-native-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = [...PUBLIC_FILES, 'package.json', ...(headers ? ['hosting/_headers'] : [])];
  for (const path of paths) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), path === 'package.json' ? '{"version":"0.5.1"}' : `fixture ${path}`);
  }
  return root;
}

async function outputFiles(root) {
  const entries = await readdir(join(root, 'dist'), { recursive: true });
  const files = await Promise.all(entries.map(async path => (await lstat(join(root, 'dist', path))).isFile() ? path : null));
  return files.filter(Boolean).sort();
}

test('the build targets are web and native', () => {
  assert.deepEqual(BUILD_TARGETS, ['web', 'native']);
});

test('a native build ships the allowlist without _headers and declares no account features', async t => {
  const root = await fixture(t, { headers: false });
  const release = await build(root, { target: 'native' });
  assert.deepEqual(await outputFiles(root), [...PUBLIC_FILES, 'release.json'].sort());
  assert.equal(release.target, 'native');
  assert.equal(release.hostingHeadersSHA256, null);
  assert.deepEqual(release.runtimeGatedFeatures, []);
  assert.equal(release.clientVersion, '0.5.1');
});

test('a web build is unchanged: _headers, no target key, account features still gated', async t => {
  const root = await fixture(t);
  const release = await build(root);
  assert.deepEqual(await outputFiles(root), [...PUBLIC_FILES, '_headers', 'release.json'].sort());
  assert.equal('target' in release, false);
  assert.match(release.hostingHeadersSHA256, /^[0-9a-f]{64}$/);
  assert.deepEqual(release.runtimeGatedFeatures, ['email-login', 'private-journey-backup']);
});

test('an unknown target is refused before anything is written', async t => {
  const root = await fixture(t);
  await assert.rejects(build(root, { target: 'desktop' }), /Unknown build target: desktop/);
  await assert.rejects(lstat(join(root, 'dist')), { code: 'ENOENT' });
});
