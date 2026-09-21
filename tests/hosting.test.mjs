import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { build, PUBLIC_FILES } from '../tools/build.mjs';
import www from '../hosting/www.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'mythseal-build-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const path of [...PUBLIC_FILES, 'hosting/_headers', 'package.json', '.env', 'docs/private.md', '.git/config']) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), path === 'package.json' ? '{"version":"0.4.1"}' : `fixture ${path}`);
  }
  return root;
}
test('public build excludes private files and stale output; manifest matches bytes', async t => {
  const root = await fixture(t);
  await mkdir(join(root, 'dist'));
  await writeFile(join(root, 'dist', 'private-save.json'), 'old save');
  const release = await build(root);
  const output = (await readdir(join(root, 'dist'), { recursive: true })).filter(path => path !== 'assets').sort();
  assert.deepEqual(output, [...PUBLIC_FILES, '_headers', 'release.json'].sort());
  for (const file of release.assets) {
    const bytes = await readFile(join(root, 'dist', file.path));
    assert.equal(bytes.length, file.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
  }
  assert.deepEqual(release.contractRefs, []);
});
test('public build rejects a symlinked source before replacing the previous artifact', async t => {
  const root = await fixture(t);
  await build(root);
  await rm(join(root, 'app.mjs'));
  await symlink(join(root, '.env'), join(root, 'app.mjs'));
  await assert.rejects(build(root), /Refusing symlink/);
  assert.equal(await readFile(join(root, 'dist', 'app.mjs'), 'utf8'), 'fixture app.mjs');
});
test('www redirect fixes origin and preserves escaped paths and query parameters', () => {
  const response = www.fetch(new Request('http://www.mythseal.com:8080/a%20b?return=https%3A%2F%2Fexample.com'));
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('Location'), 'https://mythseal.com/a%20b?return=https%3A%2F%2Fexample.com');
});
