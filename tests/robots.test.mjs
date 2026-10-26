// robots.txt on mythseal.com: a plain allow-all, nothing else
// (Quiet Doors, small door fixes, 2026-10). No Crawl-delay, no training signal.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PUBLIC_FILES } from '../tools/build.mjs';

test('hosting/robots.txt is a plain allow-all', () => {
  assert.equal(readFileSync(new URL('../hosting/robots.txt', import.meta.url), 'utf8'), 'User-agent: *\nAllow: /\n');
});

test('robots.txt is a hosting file, like _headers, not a game asset', () => {
  assert.ok(!PUBLIC_FILES.includes('robots.txt'));
});
