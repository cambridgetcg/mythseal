import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('the privacy page is public, self-contained and covers app and website', () => {
  assert.ok(JSON.parse(read('hosting/public-assets.json')).includes('privacy.html'));
  const page = read('privacy.html');
  assert.match(page, /<html lang="zh-Hant">/);
  assert.match(page, /Cambridge TCG Limited/);
  assert.match(page, /15680297/, 'company number');
  assert.match(page, /ZB838338/, 'ICO registration');
  assert.match(page, /contact@cambridgetcg\.com/);
  for (const heading of ['手機版', 'The iOS and Android apps', '網頁版帳戶', 'Website accounts']) assert.ok(page.includes(heading), heading);
  assert.doesNotMatch(page, /<script/i, 'no scripts (CSP script-src self, and nothing to run)');
  assert.doesNotMatch(page, /\s(?:src|href)="https?:/i, 'no external resources');
  assert.match(page, /href="index\.html"/, 'a way back into the game');
});

test('the rules dialog links the privacy page', () => {
  assert.match(read('app.mjs'), /function rulesModal\(\)[\s\S]*?href="privacy\.html"/);
});
