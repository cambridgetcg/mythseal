/** Synthetic local saves only: recovery exports, failed startup, and native-lock pack races. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createProfile, hydrateProfile, PROFILE_KEY, beginBattle } from '../progression.mjs';
import { createMatch, LEGACY_CARD_IDS } from '../engine.mjs';
import { mintInstance, setInstanceXP } from '../collection.mjs';
import { BATTLE_KEY, PROFILE_LOCK } from '../profile-store.mjs';

const browserName = process.env.BROWSER || 'chromium';
if (!['chromium', 'webkit'].includes(browserName)) throw Error('BROWSER must be chromium or webkit.');
const runtime = fileURLToPath(new URL('../test-results/webkit-runtime', import.meta.url));
if (browserName === 'webkit' && !process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(runtime)) process.env.PLAYWRIGHT_BROWSERS_PATH = runtime;
const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = new URL(process.env.GAME_URL || 'http://127.0.0.1:4177');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) throw Error('Recovery smoke requires loopback.');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = fileURLToPath(new URL('../test-results/', import.meta.url));
const now = '2026-09-22T12:00:00.000Z';
const checks = [], screenshots = [], errors = [], contexts = new Set();
const passed = label => { checks.push(label); console.log(`PASS ${label}`); };
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROFILE_KEY);
const raw = (page, keys) => page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), keys);
const action = (page, name) => page.locator(`[data-action="${name}"]`);
await mkdir(output, { recursive: true });
const browser = await engines[browserName].launch({ headless: true, ...(browserName === 'chromium' && existsSync(chrome) ? { executablePath: chrome } : {}) });

function legacy(profile) {
  const value = structuredClone(profile);
  value.version = 3; value.collectionVersion = 1; value.collectionExpansion = 1; delete value.wx01;
  for (const card of [...value.instances, ...value.merchantVault.map(entry => entry.instance)]) delete card.printId;
  for (const key of ['inventory', 'levels']) value[key] = Object.fromEntries(LEGACY_CARD_IDS.map(id => [id, value[key][id]]));
  if (value.pending) delete value.pending.cardPrints;
  return value;
}
async function newContext(values, { quota = false, width = 390 } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce', acceptDownloads: true });
  contexts.add(context);
  await context.addInitScript(({ values, quota, key, now }) => {
    const NativeDate = Date, fixed = new NativeDate(now).getTime();
    globalThis.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } };
    Math.random = () => .23;
    if (!localStorage.getItem('recovery-smoke.seeded')) {
      for (const [name, value] of Object.entries(values)) localStorage.setItem(name, value);
      localStorage.setItem('recovery-smoke.seeded', 'yes');
    }
    const nativeSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function(name, value) {
      if (quota && this === localStorage && name === key && sessionStorage.getItem('recovery-smoke.quota-available') !== 'yes') {
        throw new DOMException('Synthetic full storage', 'QuotaExceededError');
      }
      return nativeSet.call(this, name, value);
    };
  }, { values, quota, key: PROFILE_KEY, now });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== base.origin || url.pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method())) {
      errors.push(`Unexpected network ${request.method()} ${url.origin}${url.pathname}`); return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  return context;
}
async function pageIn(context) {
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${new URL(response.url()).pathname}`); });
  await page.goto(base.href);
  return page;
}
async function exportOriginals(page) {
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: '匯出保留的存檔', exact: true }).click();
  const download = await event;
  assert.equal(download.suggestedFilename(), 'mythseal-recovery-originals.json');
  const stream = await download.createReadStream(), chunks = [];
  assert(stream);
  for await (const chunk of stream) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
async function stillRecovery(page, values) {
  await page.evaluate(key => {
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new StorageEvent('storage', { key, storageArea: localStorage }));
  }, PROFILE_KEY);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await page.locator('.startup-recovery').count(), 1);
  assert.equal(await page.locator('.game-lobby').count(), 0);
  assert.deepEqual(await raw(page, Object.keys(values)), values);
}
async function shot(page, name) {
  const bounds = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert(bounds.scroll <= bounds.width + 1, JSON.stringify(bounds));
  const filename = `profile-recovery-${browserName}-${name}.png`;
  await page.screenshot({ path: output + filename, fullPage: true }); screenshots.push(filename);
}
async function holdProfileLock(page) {
  await page.evaluate(name => {
    window.recoverySmokeLockHeld = false;
    window.recoverySmokeLock = navigator.locks.request(name, () => new Promise(resolve => {
      window.releaseRecoverySmokeLock = resolve; window.recoverySmokeLockHeld = true;
    }));
  }, PROFILE_LOCK);
  await page.waitForFunction(() => window.recoverySmokeLockHeld);
}
async function releaseProfileLock(page) {
  await page.evaluate(async () => { window.releaseRecoverySmokeLock(); await window.recoverySmokeLock; });
}

try {
  const malformed = {
    [PROFILE_KEY]: '{"version":4,"instances": [BROKEN',
    [BATTLE_KEY]: '{"original":"battle bytes"}',
    'shanhai.profile.v3': JSON.stringify(legacy(createProfile({ now }))),
    'shanhai.profile.recovery.v4': '{"original":"previous recovery bytes"}',
  };
  const damaged = await pageIn(await newContext(malformed, { width: 360 }));
  await damaged.locator('.startup-recovery').waitFor();
  await stillRecovery(damaged, malformed);
  assert.deepEqual(await exportOriginals(damaged), malformed);
  await shot(damaged, 'malformed-v4-360');
  passed('Malformed v4 remains intact and exports raw v4, legacy and recovery bytes without falling back to a new journey');

  const v1 = { 'shanhai.deck.v1': '{broken original deck', 'shanhai.stats.v1': '{"played":19,"won":11}', 'shanhai.profile.recovery.v3': '{"original":"old recovery"}', 'shanhai.profile.recovery.v2': '{broken original recovery' };
  const ancient = await pageIn(await newContext(v1));
  await ancient.locator('.startup-recovery').waitFor();
  await stillRecovery(ancient, v1);
  assert.deepEqual(await exportOriginals(ancient), v1);
  assert.equal(await ancient.evaluate(key => localStorage.getItem(key), PROFILE_KEY), null);
  passed('v1-only recovery exports malformed deck, statistics and historical recovery strings rather than an empty file');

  let original = createProfile({ now });
  const minted = mintInstance(original, 'qingxiao', { now, source: 'recovery-fixture' });
  original = setInstanceXP(minted.profile, minted.instance.uid, 430); original.coins = 777;
  original = beginBattle(original, { kind: 'arena', now }).profile;
  const old = legacy(original), match = createMatch({ deckIds: old.deck, mode: 'arena', rng: () => .23 });
  const battle = { encounter: old.pending, match, selected: match.player.hand[0], pills: 0, fury: false, aiMove: null, revealPending: false, recorded: false, lastReward: null };
  const originals = { 'shanhai.profile.v3': JSON.stringify(old), 'shanhai.battle.v3': JSON.stringify(battle) };
  const quotaPage = await pageIn(await newContext(originals, { quota: true }));
  await quotaPage.locator('.startup-recovery').waitFor();
  assert.match(await quotaPage.locator('.startup-recovery').innerText(), /Synthetic full storage/);
  await stillRecovery(quotaPage, originals);
  assert.equal(await quotaPage.evaluate(key => localStorage.getItem(key), PROFILE_KEY), null);
  assert.equal(await quotaPage.evaluate(key => localStorage.getItem(key), BATTLE_KEY), originals['shanhai.battle.v3']);
  const exported = await exportOriginals(quotaPage);
  for (const [key, value] of Object.entries(originals)) assert.equal(exported[key], value);
  await shot(quotaPage, 'quota-390');
  passed('Quota failure after copying the old battle leaves no v4 completion marker; visibility and storage events keep recovery visible and old bytes unchanged');

  await quotaPage.evaluate(() => sessionStorage.setItem('recovery-smoke.quota-available', 'yes'));
  await quotaPage.getByRole('button', { name: '重新載入', exact: true }).click();
  await quotaPage.locator('.game-lobby').waitFor();
  const migrated = await read(quotaPage);
  assert.deepEqual(migrated, hydrateProfile(old, { now, legacyBattle: battle }));
  assert.equal(migrated.coins, 777); assert.equal(migrated.instances.find(card => card.uid === minted.instance.uid).xp, 430);
  assert.deepEqual(migrated.pending.instanceIds, original.pending.instanceIds);
  assert.deepEqual(migrated.pending.cardPrints, original.pending.cardPrints);
  assert.deepEqual(await raw(quotaPage, Object.keys(originals)), originals);
  assert.equal(await quotaPage.evaluate(key => localStorage.getItem(key), BATTLE_KEY), originals['shanhai.battle.v3']);
  await quotaPage.reload(); await quotaPage.locator('.game-lobby').waitFor();
  assert.deepEqual(await read(quotaPage), migrated);
  passed('Reload after quota is available completes migration once, preserving balances, exact XP, pending copy/print mappings and both original keys');

  const seed = createProfile({ now }), shared = await newContext({ [PROFILE_KEY]: JSON.stringify(seed) }, { width: 1440 });
  const first = await pageIn(shared), second = await pageIn(shared), pages = [first, second];
  for (const page of pages) { await page.locator('.game-lobby').waitFor(); await page.locator('.game-dock [data-action="market"]').click(); }
  await holdProfileLock(first);
  await Promise.all(pages.map(page => page.locator('[data-action="buy-pack"][data-set="wx01"]').evaluate(button => { button.click(); button.click(); })));
  assert.deepEqual(await read(first), seed, 'queued actions cannot commit while another tab owns the native lock');
  await releaseProfileLock(first);
  await first.waitForFunction(key => JSON.parse(localStorage.getItem(key)).wx01.receipt?.id === 'wx01-1', PROFILE_KEY);
  const accepted = await read(first);
  assert.equal(accepted.coins, seed.coins - 300); assert.equal(accepted.instances.length, seed.instances.length + 3);
  assert.equal(accepted.wx01.opened, 1); assert.equal(accepted.wx01.seals, 1); assert.equal(accepted.wx01.serial, 1);
  assert.equal(new Set(accepted.instances.map(card => card.uid)).size, accepted.instances.length);
  for (const page of pages) {
    if (!await page.locator('.pack-opening').count()) await action(page, 'pack-resume').click();
    await page.locator('.pack-opening[data-phase="complete"]').waitFor();
  }
  await holdProfileLock(first);
  await Promise.all(pages.map(page => action(page, 'pack-ack').evaluate(button => button.click())));
  assert.deepEqual(await read(first), accepted);
  await releaseProfileLock(first);
  await first.waitForFunction(key => JSON.parse(localStorage.getItem(key)).wx01.receipt === null, PROFILE_KEY);
  await Promise.all(pages.map(page => page.locator('.pack-opening').waitFor({ state: 'hidden' })));
  const acknowledged = structuredClone(accepted); acknowledged.wx01.receipt = null;
  assert.deepEqual(await read(first), acknowledged); assert.deepEqual(await read(second), acknowledged);
  passed('Two tabs queue real double-click purchases and receipt acknowledgements through native Web Locks: one charge, three unique copies, one seal and idempotent acknowledgement');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, browser: browserName, evidence: 'Isolated synthetic saves; loopback static assets only; no real storage, accounts or email.', checks, screenshots, browserErrors: errors }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, browser: browserName, passed: checks, errors, error: error.stack }, null, 2)); process.exitCode = 1;
} finally {
  await Promise.allSettled([...contexts].map(context => context.close()));
  await browser.close();
}
