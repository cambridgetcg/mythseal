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
const privatePaths = ['/README.md', '/docs/BACKEND-STACK.md', '/.git/config', '/.env', '/.env.local', '/package.json', '/wrangler.jsonc', '/tools/build.mjs', '/tests/engine.test.mjs', '/_headers', '/server/account-api.mjs', '/hosting/public-assets.json', '/supabase/config.toml'];
for (const path of privatePaths) {
  assert.equal((await get(path)).status, 404, `Private path must return 404: ${path}`);
}
if (new URL(base).hostname === 'mythseal.com') {
  const query = `?release=${encodeURIComponent(release.clientVersion)}`;
  const redirect = await fetch('https://www.mythseal.com/test%20path' + query, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get('location'), 'https://mythseal.com/test%20path' + query);
  const http = await fetch('http://mythseal.com/test%20path' + query, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
  assert.equal(http.status, 308);
  assert.equal(http.headers.get('location'), 'https://mythseal.com/test%20path' + query);
}
const account = await get('/api/v1/account');
assert.equal(account.status, 200);
assert.match(account.headers.get('cache-control') || '', /no-store/);
assert.equal((await account.json()).authenticated, false);
const csrf = await fetch(new URL('/api/v1/auth/logout', base), {method:'POST',headers:{'Content-Type':'application/json',Origin:'https://example.invalid'},body:'{}',signal:AbortSignal.timeout(30000)});
assert.equal(csrf.status, 403);
console.log(JSON.stringify({ verified: base, version: release.clientVersion, commit: release.gitCommit, publicAssets: release.assets.length, privatePaths: privatePaths.length, anonymousAPI: true, csrfRejected: true, manifest: release.assetsManifestSHA256 }, null, 2));
