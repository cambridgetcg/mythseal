import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, readdir, lstat, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { build, PUBLIC_FILES } from '../tools/build.mjs';
import www from '../hosting/www.mjs';
import { readFileSync } from 'node:fs';
import { posix } from 'node:path';

const repository = new URL('../', import.meta.url);
const PREVIEW_FILES = JSON.parse(readFileSync(new URL('hosting/preview-assets.json', repository), 'utf8'));
/** Every local file reachable from an HTML page: its src/href assets plus static
 * and dynamic ES module imports, followed transitively. */
function closure(entry) {
  const seen = new Set(), queue = [entry];
  while (queue.length) {
    const path = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);
    const text = readFileSync(new URL(path, repository), 'utf8'), base = posix.dirname(path);
    const references = path.endsWith('.html')
      ? [...text.matchAll(/\s(?:src|href)="([^"#?:]+)"/g)].map(match => match[1])
      : path.endsWith('.mjs')
        ? [...text.matchAll(/(?:\bimport|\bexport)\s[^'"`;]*?\bfrom\s*['"](\.{1,2}\/[^'"]+)['"]|\bimport\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)|\bimport\s*['"](\.{1,2}\/[^'"]+)['"]/g)].map(match => match[1] ?? match[2] ?? match[3])
        : [];
    for (const reference of references) {
      const resolved = posix.normalize(posix.join(base, reference));
      if (/\.(?:mjs|css|html)$/.test(resolved) || resolved.startsWith('assets/')) queue.push(resolved);
    }
  }
  return [...seen].sort();
}

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'mythseal-build-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const path of [...PUBLIC_FILES, 'hosting/_headers', 'package.json', '.env', 'docs/private.md', '.git/config', 'atelier.html', 'assets/expansion/wukong-alt.png']) {
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
  const entries = await readdir(join(root, 'dist'), { recursive: true });
  const files = await Promise.all(entries.map(async path => (await lstat(join(root, 'dist', path))).isFile() ? path : null));
  const output = files.filter(Boolean).sort();
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

test('N20 runtime modules are allowlisted: the game and playtest import closures are served', () => {
  for (const file of ['command-ledger.mjs', 'local-commands.mjs']) assert.ok(PUBLIC_FILES.includes(file), file);
  const game = closure('index.html');
  for (const module of ['bootstrap.mjs', 'app.mjs', 'local-commands.mjs', 'command-ledger.mjs', 'profile-store.mjs']) assert.ok(game.includes(module), `${module} is reachable`);
  assert.deepEqual(game.filter(path => !PUBLIC_FILES.includes(path)), [], 'every file the game loads is in hosting/public-assets.json');
  const playtest = closure('playtest.html');
  assert.ok(playtest.includes('command-ledger.mjs'), 'the playtest page reaches the ledger through profile-store');
  assert.deepEqual(playtest.filter(path => !PUBLIC_FILES.includes(path) && !PREVIEW_FILES.includes(path)), []);
  assert.equal(new Set(PUBLIC_FILES).size, PUBLIC_FILES.length, 'no duplicate allowlist entries');
});
