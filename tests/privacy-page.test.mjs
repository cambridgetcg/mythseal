// privacy.html is a draft in Mindicraft Limited's name awaiting the owner's approval
// (docs/IOS-FIRST-FLIGHT.md). These checks keep it honest and keep its placeholders off the
// website: they do not decide when it ships, which is the owner's call.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const PLACEHOLDER = /待確認|TO CONFIRM/;

test('the privacy page names Mindicraft Limited and invents nothing it does not know', () => {
  const page = read('privacy.html');
  assert.match(page, /<html lang="zh-Hant">/);
  assert.match(page, /Mindicraft Limited/);
  assert.match(page, /13782045/, 'company number');
  assert.doesNotMatch(page, /Cambridge TCG|15680297|ZB838338|cambridgetcg\.com/, 'no other company\'s details');
  // Unknown facts are marked, not guessed: no address, ICO number or contact email is recorded for Mindicraft.
  for (const fact of ['registered office address', 'ICO registration number', 'privacy contact email']) assert.ok(page.includes(`TO CONFIRM: ${fact}`), fact);
  assert.doesNotMatch(page, /mailto:|ICO 登記 Z|registration Z[A-Z]\d/, 'no contact or ICO number until one is confirmed');
  for (const heading of ['手機版', 'The iOS and Android apps', '網頁版帳戶', 'Website accounts']) assert.ok(page.includes(heading), heading);
  assert.doesNotMatch(page, /<script/i, 'no scripts (CSP script-src self, and nothing to run)');
  assert.doesNotMatch(page, /\s(?:src|href)="https?:/i, 'no external resources');
  assert.match(page, /href="index\.html"/, 'a way back into the game');
});

test('the app data wording covers device backups, the native copy and exports', () => {
  const page = read('privacy.html');
  // "Stored only on your device" was wrong: iCloud and computer backups include app data.
  assert.doesNotMatch(page, /stored only on your device|只儲存在你的裝置/);
  assert.match(page, /iCloud Backup, a computer backup/);
  assert.match(page, /iCloud 備份、電腦備份/);
  assert.match(page, /keeps a copy of your journey in its own files/);
  assert.match(page, /When you export a journey file, you decide where it is saved/);
});

test('a page with placeholders is not served, and the app links only a served page', () => {
  const served = JSON.parse(read('hosting/public-assets.json')).includes('privacy.html');
  if (served) assert.doesNotMatch(read('privacy.html'), PLACEHOLDER, 'replace every 待確認 / TO CONFIRM before adding privacy.html to the allowlist');
  const app = read('app.mjs');
  const url = app.match(/^const PRIVACY_URL=(null|'[^']*');$/m);
  assert.ok(url, 'app.mjs names the privacy address in one place');
  assert.match(app, /function rulesModal\(\)[\s\S]*?\$\{PRIVACY_URL\?`<p class="rules-privacy"><a href="\$\{PRIVACY_URL\}">/, 'the rules dialog links that address');
  if (url[1] !== 'null') {
    assert.match(url[1], /^'https:\/\/mythseal\.com\/privacy\.html'$/, 'the deployed page, over https');
    assert.ok(served, 'a linked page must be in the allowlist');
  }
});
