/** Isolated loopback acceptance: synthetic profiles only, never an owner's browser/session. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createProfile, PROFILE_KEY, beginBattle, buyPack } from '../progression.mjs';
import { syncCollection } from '../collection.mjs';
import { BATTLE_KEY, PROFILE_LOCK } from '../profile-store.mjs';
import { createMatch } from '../engine.mjs';

const browserName = process.env.BROWSER || 'chromium';
if (!['chromium', 'webkit'].includes(browserName)) throw Error('BROWSER must be chromium or webkit.');
const runtime = fileURLToPath(new URL('../test-results/webkit-runtime', import.meta.url));
if (browserName === 'webkit' && !process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(runtime)) process.env.PLAYWRIGHT_BROWSERS_PATH = runtime;
const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = new URL(process.env.GAME_URL || 'http://127.0.0.1:4177');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) throw Error('Box smoke requires loopback.');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = fileURLToPath(new URL('../test-results/', import.meta.url));
const now = '2026-09-22T12:00:00.000Z';
const contexts = new Set(), checks = [], screenshots = [], errors = [], blocked = [];
const copy = value => structuredClone(value);
const action = (page, name) => page.locator(`[data-action="${name}"]`);
const boxButton = (page, packs) => page.locator(`[data-action="buy-box"][data-packs="${packs}"]`);
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROFILE_KEY);
const phase = (page, name) => page.locator(`.box-opening[data-phase="${name}"]`).waitFor();
const passed = label => { checks.push(label); console.log(`PASS ${label}`); };
const fresh = () => { const profile = createProfile({ now }); profile.coins = 20_000; return profile; };
await mkdir(output, { recursive: true });
const browser = await engines[browserName].launch({ headless: true, ...(browserName === 'chromium' && existsSync(chrome) ? { executablePath: chrome } : {}) });

async function contextFor(seed, { width = 390, reduced = false, extra = {} } = {}) {
  const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 1000 }, reducedMotion: reduced ? 'reduce' : 'no-preference', deviceScaleFactor: 1 });
  contexts.add(context);
  await context.addInitScript(({ seed, key, now, extra }) => {
    const NativeDate = Date, fixed = new NativeDate(now).getTime();
    globalThis.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } };
    Math.random = () => 0;
    if (!localStorage.getItem('box-smoke.seeded')) {
      if (seed !== null) localStorage.setItem(key, JSON.stringify(seed));
      for (const [name, value] of Object.entries(extra)) localStorage.setItem(name, value);
      localStorage.setItem('shanhai.experience.v1', JSON.stringify({ sound: false, motion: 'system', pace: 'normal' }));
      localStorage.setItem('box-smoke.seeded', 'yes');
    }
    const nativeSet = Storage.prototype.setItem;
    window.boxSmokeWrites = []; window.boxSmokeFirstRender = null;
    Storage.prototype.setItem = function(name, value) {
      if (this === localStorage && name === key && sessionStorage.getItem('box-smoke.fail-write') === 'yes') throw new DOMException('Synthetic box quota failure', 'QuotaExceededError');
      nativeSet.call(this, name, value);
      if (this === localStorage && name === key) window.boxSmokeWrites.push(JSON.parse(value));
    };
    new MutationObserver(() => {
      const opening = document.querySelector('.box-opening');
      if (opening && !window.boxSmokeFirstRender) {
        const saved = JSON.parse(localStorage.getItem(key));
        window.boxSmokeFirstRender = { coins: saved.coins, instances: saved.instances.length, receiptId: saved.wx01.receipt?.id, cards: saved.wx01.receipt?.cards.length, phase: opening.dataset.phase };
      }
    }).observe(document, { childList: true, subtree: true });
  }, { seed, key: PROFILE_KEY, now, extra });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== base.origin) { blocked.push(url.origin); return route.abort('blockedbyclient'); }
    if (url.pathname === '/api/v1/account' && request.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: false, user: null, emailEnabled: false }) });
    if (url.pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method())) { errors.push(`Unexpected API ${request.method()} ${url.pathname}`); return route.abort('blockedbyclient'); }
    return route.continue();
  });
  return context;
}
async function pageIn(context, path = '/') {
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${new URL(response.url()).pathname}`); });
  await page.goto(new URL(path, base).href);
  if (path === '/') await page.locator('.game-lobby').waitFor();
  return page;
}
async function release(page) { const context = page.context(); await context.close(); contexts.delete(context); }
async function market(page) { await page.locator('.game-dock [data-action="market"]').click(); await page.locator('.wx01-box-options').waitFor(); }
async function buy(page, packs) { await boxButton(page, packs).click(); await page.locator('.box-opening').waitFor(); }
async function ack(page) { await action(page, 'pack-ack').click(); await page.locator('.box-opening').waitFor({ state: 'hidden' }); assert.equal((await read(page)).wx01.receipt, null); }
async function noOverflow(page, name) {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, elements: [...document.querySelectorAll('.modal, .box-overview, .box-overview-grid, .box-summary-pack')].filter(node => node.getClientRects().length).map(node => [node.className, node.clientWidth, node.scrollWidth]) }));
  assert(dimensions.scroll <= dimensions.width + 1 && dimensions.elements.every(([, width, scroll]) => scroll <= width + 1), `${name}: ${JSON.stringify(dimensions)}`);
}
async function shot(page, name) {
  await noOverflow(page, name);
  await page.evaluate(async () => {
    await document.fonts.ready;
    const urls = new Set([...document.querySelectorAll('[data-box-overview] *')].flatMap(node => [...getComputedStyle(node).backgroundImage.matchAll(/url\(["']?(https?:[^"')]+)["']?\)/g)].map(match => match[1])));
    await Promise.all([...urls].map(url => { const image = new Image(); image.src = url; return image.decode(); }));
    await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  const nameOnDisk = `wx01-box-${browserName}-${name}.png`;
  await page.screenshot({ path: output + nameOnDisk, fullPage: false }); screenshots.push(nameOnDisk);
}
async function overview(page, accepted, packs, label) {
  await phase(page, 'complete');
  assert.equal(await page.locator('[data-box-overview]').isVisible(), true);
  assert.equal(await page.locator('[data-summary-pack]').count(), packs);
  assert.equal(await page.locator('[data-summary-instance]').count(), packs * 3);
  const displayed = await page.locator('[data-summary-instance]').evaluateAll(nodes => nodes.map(node => ({ uid: node.dataset.summaryInstance, printId: node.dataset.printId })));
  assert.deepEqual(displayed, accepted.wx01.receipt.cards.map(card => ({ uid: card.instanceId, printId: card.printId })));
  assert.deepEqual(await read(page), accepted);
  await shot(page, `${label}-overview-top`);
  const ackReachable = () => action(page, 'pack-ack').evaluate(node => {
      const bounds = node.getBoundingClientRect(), hit = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      return bounds.height >= 44 && bounds.top >= 0 && bounds.bottom <= innerHeight + 1 && (hit === node || node.contains(hit));
    });
  assert(await ackReachable(), 'Acknowledgement must be reachable at overview start');
  await page.locator('.modal').evaluate(async node => { node.scrollTop = node.scrollHeight; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
  const finalRow = await page.evaluate(() => {
    const modal = document.querySelector('.modal').getBoundingClientRect();
    const lastPack = [...document.querySelectorAll('[data-summary-pack]')].at(-1).getBoundingClientRect();
    const lastLabel = [...document.querySelectorAll('[data-summary-instance] > small')].at(-1).getBoundingClientRect();
    const footer = document.querySelector('.pack-opening-footer').getBoundingClientRect();
    return { modalTop: modal.top, lastPackTop: lastPack.top, lastLabelTop: lastLabel.top, lastLabelBottom: lastLabel.bottom, footerTop: footer.top, viewport: innerHeight };
  });
  assert(finalRow.lastPackTop >= Math.max(0, finalRow.modalTop) && finalRow.lastLabelTop >= finalRow.lastPackTop
    && finalRow.lastLabelBottom <= Math.min(finalRow.footerTop, finalRow.viewport) + 1, `Final pack and UID must be visible above footer: ${JSON.stringify(finalRow)}`);
  assert(await ackReachable(), 'Acknowledgement must remain reachable at overview end');
  await shot(page, `${label}-overview-end`);
}
async function holdLock(page) {
  await page.evaluate(name => {
    window.boxSmokeHeld = false;
    window.boxSmokeLock = navigator.locks.request(name, () => new Promise(resolve => { window.releaseBoxSmoke = resolve; window.boxSmokeHeld = true; }));
  }, PROFILE_LOCK);
  await page.waitForFunction(() => window.boxSmokeHeld);
}
const releaseLock = page => page.evaluate(async () => { window.releaseBoxSmoke(); await window.boxSmokeLock; });

try {
  for (const width of [360, 390, 1440]) for (const packs of [12, 24]) {
    const seed = fresh(), page = await pageIn(await contextFor(seed, { width }));
    await market(page); await noOverflow(page, `market-${width}`); await buy(page, packs);
    const accepted = await read(page), firstRender = await page.evaluate(() => window.boxSmokeFirstRender);
    assert.equal(accepted.coins, seed.coins - packs * 300);
    assert.equal(accepted.instances.length, seed.instances.length + packs * 3);
    assert.equal(accepted.wx01.opened, packs); assert.equal(accepted.wx01.seals, packs); assert.equal(accepted.daily.packs, packs);
    assert.equal(accepted.wx01.dry, 0); assert.equal(accepted.wx01.serial, 1);
    assert.deepEqual(accepted.wx01.receipt.packs.filter(pack => pack.mode === 'aa').length, packs / 12);
    assert.deepEqual(firstRender, { coins: accepted.coins, instances: accepted.instances.length, receiptId: 'wx01-1', cards: packs * 3, phase: 'opening' });
    if (width === 390 && packs === 12) {
      for (let index = 0; index < packs; index++) {
        await phase(page, 'ready');
        assert.equal(await page.locator('[data-box-progress]').innerText(), `第 ${index + 1} / ${packs} 匣`);
        assert.equal(await page.locator('[data-box-panel]').filter({ visible: true }).count(), 1);
        for (let slot = 0; slot < 3; slot++) {
          const button = page.locator(`[data-action="pack-card-reveal"][data-index="${index * 3 + slot}"]`);
          await button.focus(); await page.keyboard.press('Space');
        }
        await phase(page, 'pack-complete'); assert.deepEqual(await read(page), accepted);
        await action(page, 'box-next').click();
      }
      passed('Twelve packs reveal sequentially through real keyboard card controls and next-pack buttons without any saved-state mutation');
    } else await action(page, 'pack-skip').click();
    await overview(page, accepted, packs, `${packs}-${width}`);
    if (packs === 24) {
      await page.reload(); await page.locator('.game-lobby').waitFor();
      assert.deepEqual(await read(page), accepted);
      await action(page, 'pack-resume').first().click(); await phase(page, 'complete');
      assert.deepEqual(await read(page), accepted);
      assert.equal(await page.locator('[data-summary-instance]').count(), 72);
    }
    await ack(page); const after = copy(accepted); after.wx01.receipt = null;
    assert.deepEqual(await read(page), after);
    passed(`${width}px ${packs}-pack purchase persisted ${packs * 3} copies before animation; overview, receipt recovery and acknowledgement preserve one charge`);
    await release(page);
  }

  const poor = fresh(); poor.coins = 225;
  const poorPage = await pageIn(await contextFor(poor)); await market(poorPage);
  assert.equal(await boxButton(poorPage, 12).isDisabled(), true); assert.equal(await boxButton(poorPage, 24).isDisabled(), true);
  await boxButton(poorPage, 12).evaluate(button => { button.disabled = false; button.click(); });
  await poorPage.locator('.toast').filter({ hasText: '金幣不足' }).waitFor(); assert.deepEqual(await read(poorPage), poor);
  await release(poorPage);

  const capacity = fresh(), template = capacity.instances[0];
  for (let index = capacity.instances.length + 1; index <= 9965; index++) capacity.instances.push({ ...template, uid: `card-${String(index).padStart(6, '0')}` });
  capacity.instanceSerial = 9965;
  const full = syncCollection(capacity), fullPage = await pageIn(await contextFor(full)); await market(fullPage); await boxButton(fullPage, 12).click();
  await fullPage.locator('.toast').filter({ hasText: '10,000' }).waitFor();
  assert.deepEqual(await read(fullPage), full); assert.equal(await fullPage.locator('.box-opening').count(), 0); await release(fullPage);

  const quotaSeed = fresh(), quotaPage = await pageIn(await contextFor(quotaSeed)); await market(quotaPage);
  await quotaPage.evaluate(() => sessionStorage.setItem('box-smoke.fail-write', 'yes'));
  await boxButton(quotaPage, 24).click(); await quotaPage.locator('.toast').filter({ hasText: 'Synthetic box quota failure' }).waitFor();
  assert.deepEqual(await read(quotaPage), quotaSeed); assert.equal(await quotaPage.locator('.box-opening').count(), 0);
  await quotaPage.evaluate(() => sessionStorage.removeItem('box-smoke.fail-write'));
  await buy(quotaPage, 24); assert.equal((await read(quotaPage)).coins, quotaSeed.coins - 7200); await release(quotaPage);
  passed('Insufficient coins, full owned/vault capacity and a thrown profile write all reject box purchases without accepting a receipt or charging; quota retry pays once');

  const raceSeed = fresh(), shared = await contextFor(raceSeed, { reduced: true, width: 1440 });
  const first = await pageIn(shared), second = await pageIn(shared), pages = [first, second];
  for (const page of pages) await market(page);
  await holdLock(first);
  await Promise.all(pages.map(page => boxButton(page, 24).evaluate(button => { button.click(); button.click(); })));
  assert.deepEqual(await read(first), raceSeed); await releaseLock(first);
  await first.waitForFunction(key => JSON.parse(localStorage.getItem(key)).wx01.receipt?.kind === 'box', PROFILE_KEY);
  const raceAccepted = await read(first);
  assert.equal(raceAccepted.coins, raceSeed.coins - 7200); assert.equal(raceAccepted.instances.length, raceSeed.instances.length + 72);
  assert.equal(raceAccepted.wx01.opened, 24); assert.equal(raceAccepted.wx01.seals, 24); assert.equal(raceAccepted.wx01.serial, 1);
  for (const page of pages) {
    if (!await page.locator('.box-opening').count()) await action(page, 'pack-resume').first().click();
    await phase(page, 'complete');
  }
  await holdLock(first); await Promise.all(pages.map(page => action(page, 'pack-ack').evaluate(button => button.click())));
  assert.deepEqual(await read(first), raceAccepted); await releaseLock(first);
  await first.waitForFunction(key => JSON.parse(localStorage.getItem(key)).wx01.receipt === null, PROFILE_KEY);
  await Promise.all(pages.map(page => page.locator('.box-opening').waitFor({ state: 'hidden' })));
  const raceAcked = copy(raceAccepted); raceAcked.wx01.receipt = null;
  assert.deepEqual(await read(first), raceAcked); assert.deepEqual(await read(second), raceAcked); await release(first);
  passed('Two-tab double clicks queue under the native profile lock: one 24-pack charge/receipt, 72 UIDs, 24 seals and idempotent acknowledgement');

  let giftSeed = beginBattle(fresh(), { kind: 'arena', now }).profile;
  giftSeed = buyPack(giftSeed, { set: 'wx01', rng: () => 0, now }).profile; giftSeed.coins = 225;
  const match = createMatch({ deckIds: giftSeed.deck, mode: 'arena', rng: () => .23 });
  const battle = JSON.stringify({ encounter: giftSeed.pending, match, selected: match.player.hand[0], pills: 0, fury: false, aiMove: null, revealPending: false, recorded: false, lastReward: null });
  const giftPage = await pageIn(await contextFor(giftSeed, { extra: { [BATTLE_KEY]: battle } }), '/playtest.html');
  await giftPage.waitForFunction(() => !document.querySelector('#claim-supply').disabled);
  assert.deepEqual(await read(giftPage), giftSeed);
  await giftPage.locator('#claim-supply').click();
  await giftPage.waitForFunction(key => JSON.parse(localStorage.getItem(key)).wx01.playtestGift === 'wx01-box-20260922', PROFILE_KEY);
  const gifted = copy(giftSeed); gifted.coins = 10225; gifted.wx01.playtestGift = 'wx01-box-20260922';
  assert.deepEqual(await read(giftPage), gifted);
  assert.equal(await giftPage.evaluate(key => localStorage.getItem(key), BATTLE_KEY), battle);
  assert.equal(await giftPage.locator('#claim-supply').isDisabled(), true);
  await giftPage.reload(); assert.equal(await giftPage.locator('#claim-supply').isDisabled(), true);
  await giftPage.locator('#claim-supply').evaluate(button => { button.disabled = false; button.click(); });
  await giftPage.waitForFunction(() => document.querySelector('#claim-supply').disabled);
  assert.deepEqual(await read(giftPage), gifted); await shot(giftPage, 'gift-225-once'); await release(giftPage);
  const giftQuota = await pageIn(await contextFor(poor), '/playtest.html');
  await giftQuota.waitForFunction(() => !document.querySelector('#claim-supply').disabled);
  await giftQuota.evaluate(() => sessionStorage.setItem('box-smoke.fail-write', 'yes'));
  await giftQuota.locator('#claim-supply').click();
  await giftQuota.locator('#supply-status').filter({ hasText: 'Synthetic box quota failure' }).waitFor();
  assert.deepEqual(await read(giftQuota), poor); await release(giftQuota);
  const empty = await pageIn(await contextFor(null), '/playtest.html');
  await empty.locator('#supply-status').filter({ hasText: '請先' }).waitFor();
  assert.equal(await read(empty), null); assert.equal(await empty.locator('#claim-supply').isDisabled(), true); await release(empty);
  passed('Preview gift adds 10,000 to a synthetic225-coin journey exactly once, preserving pending battle/receipt/copies; reload/retry, failed write and absent-save guard are safe');
  assert.deepEqual(errors, []); assert.deepEqual(blocked, []);
} catch (error) {
  errors.push(error.stack); process.exitCode = 1; console.error(error.stack);
} finally {
  await Promise.allSettled([...contexts].map(context => context.close())); await browser.close();
  const result = { ok: process.exitCode !== 1, browser: browserName, evidence: 'Isolated synthetic profiles; loopback GET assets and mocked unauthenticated account only.', checks, screenshots, errors, blocked };
  await writeFile(output + `wx01-box-${browserName}-smoke.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
