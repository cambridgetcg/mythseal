import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const base = process.env.GAME_URL || 'https://mythseal.com';
const expected = JSON.parse(await readFile(new URL('../dist/release.json', import.meta.url), 'utf8'));
const get = path => fetch(new URL(path, base), { signal: AbortSignal.timeout(30000) });
const response = await get('/release.json');
assert.equal(response.status, 200, 'Release manifest must be available');
const release = await response.json();
assert.deepEqual(release, expected, 'Live release must match the built commit and manifest');
for (const file of release.assets) {
  const response = await get('/' + file.path);
  assert.equal(response.status, 200, file.path);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('content-security-policy') || '', /script-src 'self'/);
  if (file.path.endsWith('.mjs')) assert.match(response.headers.get('content-type') || '', /(?:text|application)\/javascript/);
  if (file.path === 'index.html') assert.match(bytes.toString(), /<title>萬象契 · Mythseal<\/title>/);
}
for (const path of ['/README.md', '/docs/BACKEND-STACK.md', '/.git/config', '/.env', '/package.json', '/wrangler.jsonc', '/tools/build.mjs', '/tests/engine.test.mjs', '/_headers']) {
  assert.equal((await get(path)).status, 404, `Private path must return 404: ${path}`);
}
if (new URL(base).hostname === 'mythseal.com') {
  const redirect = await fetch('https://www.mythseal.com/test%20path?release=0.4.1', { redirect: 'manual', signal: AbortSignal.timeout(30000) });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get('location'), 'https://mythseal.com/test%20path?release=0.4.1');
}
console.log(JSON.stringify({ verified: base, version: release.clientVersion, commit: release.gitCommit, publicAssets: release.assets.length, privatePaths: 9, manifest: release.assetsManifestSHA256 }, null, 2));
