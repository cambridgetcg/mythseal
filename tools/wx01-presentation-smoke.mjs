/** Isolated local WX-01 UI acceptance. Synthetic saves only; no personal browser/profile. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createProfile, PROFILE_KEY, setLeaderInstance } from '../progression.mjs';
import { mintInstance, saveInstanceDeck } from '../collection.mjs';
import { WX01_PRINTINGS } from '../printing-catalogue.mjs';
import { BATTLE_KEY } from '../profile-store.mjs';

const browserName = process.env.BROWSER || 'chromium';
if (!['chromium', 'webkit'].includes(browserName)) throw Error('BROWSER must be chromium or webkit.');
const runtime = fileURLToPath(new URL('../test-results/webkit-runtime', import.meta.url));
if (browserName === 'webkit' && !process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(runtime)) process.env.PLAYWRIGHT_BROWSERS_PATH = runtime;
const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = new URL(process.env.GAME_URL || 'http://127.0.0.1:4177');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) throw Error('WX-01 smoke requires loopback.');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = fileURLToPath(new URL('../test-results/', import.meta.url));
const now = '2026-09-22T12:00:00.000Z';
const contexts = new Set(), checks = [], screenshots = [], errors = [], blocked = [];
const action = (page, name, id) => page.locator(`[data-action="${name}"]${id === undefined ? '' : `[data-id="${id}"]`}`);
const go = (page, name) => page.locator(`.game-dock [data-action="${name}"]`).click();
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROFILE_KEY);
const phase = (page, name) => page.locator(`.pack-opening[data-phase="${name}"]`).waitFor();
const passed = value => { checks.push(value); console.log(`PASS ${value}`); };

function seedCollection() {
  let seed = createProfile({ now });
  for (const print of WX01_PRINTINGS) seed = mintInstance(seed, print.cardId, { printId: print.id, now, source: 'smoke' }).profile;
  const prints = ['wx01-001-aa1', 'wx01-002-aa1', 'wx01-005-ink1', 'wx01-006-base', 'wx01-009-laa1', 'wx01-011-base', 'wx01-013-aa1', 'wx01-014-base'];
  seed = saveInstanceDeck(seed, { slotId: 'deck-1', name: '西行畫譜', instanceIds: prints.map(id => seed.instances.find(instance => instance.printId === id).uid) });
  seed = setLeaderInstance(seed, seed.instances.find(instance => instance.printId === 'wx01-005-laa1').uid);
  seed.coins = 10000; seed.wx01.seals = 250; seed.wx01.dry = 11; seed.wx01.opened = 11;
  seed.cleared = ['mist-gate', 'west-flower-mountain', 'west-yellow-wind', 'west-flaming-mountain', 'west-spirit-mountain'];
  return seed;
}

await mkdir(output, { recursive: true });
const browser = await engines[browserName].launch({ headless: true, ...(browserName === 'chromium' && existsSync(chrome) ? { executablePath: chrome } : {}) });
async function openPage(seed, { width = 390, reduced = false, rng = .9999 } = {}) {
  const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 1000 }, reducedMotion: reduced ? 'reduce' : 'no-preference', deviceScaleFactor: 1 });
  contexts.add(context);
  await context.addInitScript(({ seed, key, now, reduced, rng }) => {
    const NativeDate = Date, fixed = new NativeDate(now).getTime();
    globalThis.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } };
    Math.random = () => rng;
    if (!localStorage.getItem('wx01-smoke.seeded')) {
      localStorage.setItem('wx01-smoke.seeded', 'yes'); localStorage.setItem(key, JSON.stringify(seed));
      localStorage.setItem('shanhai.experience.v1', JSON.stringify({ sound: false, motion: reduced ? 'reduce' : 'system', pace: 'normal' }));
    }
  }, { seed, key: PROFILE_KEY, now, reduced, rng });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== base.origin) { blocked.push(url.origin); return route.abort('blockedbyclient'); }
    if (url.pathname === '/api/v1/account' && request.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: false, user: null, emailEnabled: false }) });
    if (url.pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method())) { errors.push(`Unexpected API ${request.method()} ${url.pathname}`); return route.abort('blockedbyclient'); }
    return route.continue();
  });
  const page = await context.newPage(); page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(base.href); await page.locator('.game-lobby').waitFor();
  return page;
}
async function release(page) { const context = page.context(); await context.close(); contexts.delete(context); }
async function noOverflow(page, name) {
  const bounds = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth, dialogs: [...document.querySelectorAll('.modal')].map(node => [node.clientWidth, node.scrollWidth]) }));
  assert(bounds.page <= bounds.viewport + 1 && bounds.dialogs.every(([client, scroll]) => scroll <= client + 1), `${name}: ${JSON.stringify(bounds)}`);
}
async function decoded(page) {
  await page.evaluate(async () => {
    await Promise.all([...document.images].map(image => image.decode()));
    const urls = new Set([...document.querySelectorAll('*')].flatMap(node => [...getComputedStyle(node).backgroundImage.matchAll(/url\(["']?(https?:[^"')]+)["']?\)/g)].map(match => match[1])));
    await Promise.all([...urls].map(url => { const image = new Image(); image.src = url; return image.decode(); }));
    await document.fonts.ready;
    await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
async function shot(page, name) {
  await noOverflow(page, name); await decoded(page);
  const file = `wx01-${browserName}-${name}.png`;
  await page.screenshot({ path: output + file, fullPage: false }); screenshots.push(file);
}
async function closeModal(page) { await page.locator('.modal-close').click(); await page.locator('.modal').waitFor({ state: 'hidden' }); }
async function buy(page) { await page.locator('[data-action="buy-pack"][data-set="wx01"]').click(); await page.locator('.pack-opening').waitFor(); }
async function ack(page) { await action(page, 'pack-ack').click(); await page.locator('.pack-opening').waitFor({ state: 'hidden' }); assert.equal((await read(page)).wx01.receipt, null); }
async function assertTopmost(locator) {
  await locator.scrollIntoViewIfNeeded();
  assert(await locator.evaluate(node => { const box = node.getBoundingClientRect(); const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2); return box.height >= 44 && box.y >= 0 && box.bottom <= innerHeight + 1 && (hit === node || node.contains(hit)); }), 'Expected reachable 44px topmost control');
}

try {
  for (const width of [360, 390, 1440]) {
    const page = await openPage(seedCollection(), { width });
    assert.equal(await page.locator('.lobby-leader [data-print-id="wx01-005-laa1"]').count(), 1);
    const initial = await read(page);
    for (const uid of initial.deckSlots[0].instanceIds) {
      const instance = initial.instances.find(item => item.uid === uid);
      assert.equal(await page.locator(`.lobby-card-copy[data-id="${uid}"] .lobby-card-portrait[data-print-id="${instance.printId}"]`).count(), 1);
    }
    await go(page, 'market'); await page.locator('.wx01-market').waitFor();
    await shot(page, `market-${width}`);
    await action(page, 'wx01-odds').click(); assert((await page.locator('.wx01-odds').innerText()).includes('96.2%'));
    await noOverflow(page, `odds-${width}`); await closeModal(page);
    const before = await read(page); await buy(page);
    const accepted = await read(page);
    assert.equal(accepted.coins, before.coins - 300); assert.equal(accepted.instances.length, before.instances.length + 3);
    assert.equal(accepted.wx01.seals, before.wx01.seals + 1); assert.equal(accepted.wx01.receipt.mode, 'god');
    await phase(page, 'ready');
    for (const index of [0, 1, 2]) {
      const button = page.locator(`[data-action="pack-card-reveal"][data-index="${index}"]`);
      await button.focus(); await page.keyboard.press('Space');
      assert.equal(await page.locator(`[data-pack-slot="${index}"] [data-pack-face]`).isVisible(), true);
      assert.deepEqual(await read(page), accepted, 'Revealing must not write the journey');
    }
    await phase(page, 'complete'); await assertTopmost(action(page, 'pack-ack'));
    await shot(page, `god-receipt-${width}`); await ack(page);
    passed(`${width}px market/odds/manual God receipt; accepted reward precedes reveal, keyboard focus and footer reachable`);
    await action(page, 'wx01-redeem').click(); await action(page, 'wx01-redeem-tab', 'leader').click();
    await shot(page, `leader-choices-${width}`);
    const redemptionBefore = await read(page);
    await action(page, 'redeem-print', 'wx01-005-laa1').click();
    await page.locator('.pack-opening').waitFor(); await action(page, 'pack-skip').click(); await phase(page, 'complete');
    const redeemed = await read(page);
    assert.equal(redeemed.wx01.seals, redemptionBefore.wx01.seals - 40);
    assert.equal(redeemed.instances.length, redemptionBefore.instances.length + 1);
    assert.equal(redeemed.wx01.receipt.cards[0].printId, 'wx01-005-laa1');
    const leaderUID = redeemed.wx01.receipt.cards[0].instanceId;
    await ack(page); await go(page, 'bag');
    await action(page, 'bag-layout', 'copies').click();
    await action(page, 'instance-inspect', leaderUID).first().click();
    assert.equal(await page.locator('.bag-passport-art .card[data-print-id="wx01-005-laa1"]').count(), 1);
    await action(page, 'set-leader', leaderUID).click();
    await page.locator('.instance-modal').waitFor({ state: 'hidden' });
    assert.equal((await read(page)).wx01.leaderInstanceId, leaderUID);
    if (await page.locator('.modal-close').count()) await closeModal(page);
    await go(page, 'home'); assert.equal(await page.locator(`.lobby-leader [data-id="${leaderUID}"]`).count(), 2);
    await shot(page, `leader-lobby-${width}`);
    await go(page, 'market'); await action(page, 'wx01-story-choice').click();
    await action(page, 'claim-story-print', 'wx01-001-aa1').click(); await page.locator('.pack-opening').waitFor();
    await action(page, 'pack-skip').click(); const story = await read(page);
    assert.equal(story.wx01.storyClaimed, true); assert.equal(story.wx01.receipt.kind, 'story');
    await ack(page);
    passed(`${width}px exact-print redemption, passport/Leader portrait and one-time story choice`);
    await go(page, 'arena'); await action(page, 'start').click();
    const prepared = await read(page), preparedDeck = prepared.deckSlots.find(slot => slot.id === prepared.activeDeckId);
    for (const uid of preparedDeck.instanceIds) {
      const instance = prepared.instances.find(item => item.uid === uid);
      assert.equal(await page.locator(`.prep-deck-strip .card[data-print-id="${instance.printId}"]`).count(), 1);
    }
    await action(page, 'confirm-start').click(); await page.locator('.battle-table').waitFor();
    const battle = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), BATTLE_KEY);
    const frozen = (await read(page)).pending.cardPrints;
    for (const cardId of battle.match.player.hand) {
      assert.equal(await page.locator(`.player-hand .card[data-card-id="${cardId}"][data-print-id="${frozen[cardId]}"]`).count(), 1);
    }
    await shot(page, `printed-battle-${width}`);
    // A synthetic second tab changes the active deck while this exact-copy encounter is suspended.
    await page.evaluate(async key => {
      const { saveInstanceDeck, activateDeck } = await import('./collection.mjs');
      let profile = JSON.parse(localStorage.getItem(key));
      profile = saveInstanceDeck(profile, { slotId: 'deck-2', name: '原有同行者', instanceIds: profile.instances.slice(0, 8).map(instance => instance.uid) });
      profile = activateDeck(profile, 'deck-2'); localStorage.setItem(key, JSON.stringify(profile));
    }, PROFILE_KEY);
    await page.reload(); await page.locator('.game-lobby').waitFor(); await action(page, 'resume').first().click();
    await page.locator('.battle-table').waitFor();
    for (const cardId of battle.match.player.hand) {
      assert.equal(await page.locator(`.player-hand .card[data-card-id="${cardId}"][data-print-id="${frozen[cardId]}"]`).count(), 1);
    }
    await action(page, 'commit').click(); await page.locator('.battle-reveal').waitFor();
    await page.locator('.battle-reveal[data-phase="complete"]').waitFor();
    const resolved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), BATTLE_KEY);
    const played = resolved.match.lastResult.player.card.id;
    assert.equal(await page.locator(`.clash-side[data-side="player"] .card[data-print-id="${frozen[played]}"]`).count(), 1);
    await shot(page, `printed-clash-${width}`);
    passed(`${width}px preparation, hand, resumed frozen printing after active-deck change, and clash art`);
    await release(page);
  }
  const replay = await openPage(seedCollection(), { width: 390 }); await go(replay, 'market'); await buy(replay);
  const savedReceipt = await read(replay); await replay.reload(); await pageReceipt(replay);
  assert.deepEqual(await read(replay), savedReceipt, 'Reload may not mint or charge again');
  await phase(replay, 'complete'); await ack(replay);
  await go(replay, 'market'); await buy(replay);
  const hiddenReceipt = await read(replay);
  await replay.evaluate(() => window.dispatchEvent(new Event('pagehide'))); await phase(replay, 'complete');
  await replay.waitForTimeout(350); assert.deepEqual(await read(replay), hiddenReceipt);
  await ack(replay); await release(replay);
  passed('Reload recovers exactly the saved receipt; pagehide cancels opening without regrant or replay');
  const reduced = await openPage(seedCollection(), { width: 360, reduced: true, rng: .1 }); await go(reduced, 'market'); await buy(reduced);
  await phase(reduced, 'complete'); const final = await read(reduced);
  assert.equal(final.wx01.receipt.mode, 'aa'); assert.equal(final.wx01.dry, 0);
  assert.equal(await action(reduced, 'pack-card-reveal').filter({ visible: true }).count(), 0);
  await shot(reduced, 'reduced-pity-360'); await ack(reduced); await release(reduced);
  passed('Reduced motion shows final receipt immediately; ordinary at dry11 promotes to AA and resets');
  assert.deepEqual(errors, []); assert.deepEqual(blocked, []);
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  await browser.close();
  await writeFile(output + `wx01-${browserName}-presentation-smoke.json`, JSON.stringify({ browser: browserName, checks, screenshots, errors, blocked }, null, 2));
}
async function pageReceipt(page) { await action(page, 'pack-resume').click(); await page.locator('.pack-opening').waitFor(); }
