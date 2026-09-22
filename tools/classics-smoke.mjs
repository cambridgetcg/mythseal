import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CARDS, CLASSIC_CARD_IDS, ORIGINAL_CARD_IDS, defaultDeckIds, getCard, validateDeck } from '../engine.mjs';
import { createProfile, WELCOME_CARD_IDS, PACK_PRICE, RARITIES, CARD_RARITIES } from '../progression.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.GAME_URL || 'http://127.0.0.1:4177';
const output = fileURLToPath(new URL('../test-results/', import.meta.url));
assert(existsSync(new URL('../assets/classics.png', import.meta.url)), 'Generate assets/classics.png before running this visual smoke.');
await mkdir(output, { recursive: true });
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
const fixedNow = '2026-09-21T12:00:00Z';
const profileKey = 'shanhai.profile.v3', legacyProfileKey = 'shanhai.profile.v2', battleKey = 'shanhai.battle.v3';
const failures = [], checked = [], screenshots = [];
const read = (page, key = profileKey) => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const go = (page, screen) => page.locator(`nav [data-action="${screen}"]`).click();
const cardItem = (page, id) => page.locator(`.collection-item[data-card-id="${id}"]`);
const countOwned = p => Object.values(p.inventory).filter(count => count > 0).length;
const totalCopies = p => Object.values(p.inventory).reduce((sum, count) => sum + count, 0);
const waitProfile = async (page, predicate, argument) => {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (predicate(await read(page), argument)) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Timed out waiting for the expected profile change.');
};
const noOverflow = async page => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow');
async function shot(page, label) {
  await noOverflow(page);
  const name = `classics-${label}.png`;
  await page.screenshot({ path: output + name, fullPage: true });
  screenshots.push(name);
}
async function seededContext(seed, mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : {}) });
  await context.addInitScript(({ seed, key, now }) => {
    const NativeDate = Date, fixed = new NativeDate(now).getTime();
    globalThis.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [fixed])); }
      static now() { return fixed; }
    };
    Math.random = () => 0.99;
    if (!localStorage.getItem('classics-smoke.seeded')) {
      localStorage.setItem('classics-smoke.seeded', 'true');
      localStorage.setItem(key, JSON.stringify(seed));
    }
  }, { seed, key: seed.version === 2 ? legacyProfileKey : profileKey, now: fixedNow });
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  page.on('pageerror', error => failures.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  await page.goto(base); await page.locator('.hero h1').waitFor();
  return { context, page };
}

try {
  const old = createProfile({ now: fixedNow });
  old.version = 2;
  for (const key of ['instances', 'instanceSerial', 'collectionVersion', 'deckSlots', 'activeDeckId', 'merchantVault']) delete old[key];
  delete old.collectionExpansion;
  old.inventory = Object.fromEntries(ORIGINAL_CARD_IDS.map(id => [id, 1]));
  old.levels = Object.fromEntries(ORIGINAL_CARD_IDS.map(id => [id, id === 'qingxiao' ? 3 : 1]));
  old.deck = [...defaultDeckIds].reverse();
  old.coins = 3475; old.dust = 60; old.xp = 375;
  old.stats = { played: 13, won: 7 };
  old.arena = { points: 145, played: 5, won: 3 };
  old.cleared = ['mist-gate']; old.location = 'jade-forest';
  old.daily.loginClaimed = true;
  const { context, page } = await seededContext(old);
  const migrated = await read(page);
  assert.equal(migrated.version, 3);
  assert.deepEqual(await read(page, legacyProfileKey), old, 'v2 backup remains unchanged');
  assert.equal(migrated.collectionExpansion, 1);
  for (const key of ['coins', 'dust', 'xp', 'stats', 'arena', 'cleared', 'location', 'deck', 'daily']) assert.deepEqual(migrated[key], old[key]);
  assert.equal(migrated.levels.qingxiao, 3);
  assert.equal(Object.keys(migrated.inventory).length, 24);
  assert.equal(countOwned(migrated), 16);
  for (const id of WELCOME_CARD_IDS) assert.equal(migrated.inventory[id], 1);
  for (const id of CLASSIC_CARD_IDS.filter(id => !WELCOME_CARD_IDS.includes(id))) assert.equal(migrated.inventory[id], 0);
  await page.reload(); await page.locator('.hero h1').waitFor();
  assert.deepEqual(await read(page), migrated);
  await shot(page, 'home-desktop');
  checked.push('existing v2 progress unchanged, welcome four persist exactly once across reload');

  await go(page, 'collection');
  assert.equal(await page.locator('.collection-item').count(), 24);
  assert.equal(await page.locator('.collection-item:not(.unowned)').count(), 16);
  assert.equal(await page.locator('.collection-item.unowned').count(), 8);
  const atlas = await page.evaluate(() => Object.fromEntries(['qingxiao', 'wukong'].map(id => [id, getComputedStyle(document.querySelector(`.collection-item[data-card-id="${id}"] .card-art`)).backgroundImage])));
  assert.match(atlas.qingxiao, /assets\/portraits\.png/);
  assert.match(atlas.wukong, /assets\/classics\.png/);
  await page.evaluate(async () => {
    for (const source of ['assets/portraits.png', 'assets/classics.png']) {
      const image = new Image(); image.src = source; await image.decode();
      if (!image.naturalWidth) throw Error(`Empty atlas: ${source}`);
    }
  });
  await page.locator('#source-filter').selectOption('紅樓夢');
  assert.equal(await page.locator('.collection-item').count(), 2);
  assert.deepEqual((await page.locator('.collection-item').evaluateAll(items => items.map(item => item.dataset.cardId))).sort(), ['lindaiyu', 'wangxifeng']);
  await page.locator('#source-filter').selectOption('all');
  await page.locator('[data-action="filter"][data-id="moon"]').click();
  assert.equal(await page.locator('.collection-item').count(), 6);
  await page.locator('[data-action="filter"][data-id="all"]').click();
  await page.locator('[data-action="collection-set"][data-id="classics"]').click();
  assert.equal(await page.locator('.collection-item').count(), 12);
  await page.locator('#owned-only').check();
  assert.equal(await page.locator('.collection-item').count(), 4);
  await page.locator('#owned-only').uncheck();
  const locked = cardItem(page, 'pangu');
  assert(await locked.locator('[data-action="upgrade"]').isDisabled());
  assert.equal(await locked.locator('[data-action="toggle-deck"]').count(), 0);
  await locked.locator('[data-action="inspect"]').click();
  assert.match(await page.locator('.detail-source').textContent(), /上古傳說.*尚未入藏/);
  assert.equal(await page.locator('.modal [data-action="upgrade"]').count(), 0);
  await shot(page, 'locked-detail-desktop');
  await page.locator('.modal-close').click();
  await shot(page, 'collection-desktop');
  checked.push('24-card collection, 16 owned, source/faction/set/owned filters, locked inspection, distinct original/classic portrait atlases');

  await page.locator('[data-action="classics-deck"]').click();
  assert.equal(await page.locator('.deck-status strong').first().textContent(), '8 / 8');
  assert.equal(await page.locator('.deck-status strong').nth(1).textContent(), '24 / 25');
  assert.equal(await page.locator('[data-action="save-deck"]').isDisabled(), false);
  await page.locator('[data-action="save-deck"]').click();
  await page.locator('.hero h1').waitFor();
  const preset = (await read(page)).deck;
  assert.equal(validateDeck(preset).valid, true);
  assert.equal(validateDeck(preset).stars, 24);
  assert(WELCOME_CARD_IDS.every(id => preset.includes(id)));
  await page.reload(); await page.locator('.hero h1').waitFor();
  assert.deepEqual((await read(page)).deck, preset);
  checked.push('welcome-card preset saves a legal eight-card 24-star deck and survives reload');

  await go(page, 'market');
  assert.equal(await page.locator('[data-action="pack-set"][data-id="classics"]').getAttribute('aria-pressed'), 'true');
  const beforePack = await read(page);
  await page.locator('[data-action="buy-pack"]').click();
  await page.locator('.pack-reveal').waitFor();
  assert.equal(await page.locator('.pack-result').count(), 3);
  const revealedNames = await page.locator('.pack-result .card-name').allTextContents();
  assert(revealedNames.every(name => CARDS.some(card => card.name === name && CLASSIC_CARD_IDS.includes(card.id))));
  const revealedRarity = await page.locator('.pack-result .rarity-label').allTextContents();
  assert(revealedRarity.some(rarity => rarity === '靈品' || rarity === '神品'));
  const afterPack = await read(page);
  assert.equal(afterPack.coins, beforePack.coins - PACK_PRICE);
  assert.equal(totalCopies(afterPack), totalCopies(beforePack) + 3);
  assert.equal(beforePack.inventory.nezha, 0);
  assert.equal(afterPack.inventory.nezha, 3);
  assert.equal(countOwned(afterPack), 17);
  assert(ORIGINAL_CARD_IDS.every(id => beforePack.inventory[id] === afterPack.inventory[id]));
  await shot(page, 'pack-desktop');
  await page.locator('.modal-close').click();
  await page.locator('[data-action="pack-set"][data-id="all"]').click();
  assert.equal(await page.locator('[data-action="buy-pack"]').getAttribute('data-set'), 'all');
  await page.locator('[data-action="pack-set"][data-id="classics"]').click();
  checked.push('classic pack contains only new roster, costs 300, guarantees rarity and unlocks a previously missing character');

  const target = 'wusong';
  assert.equal((await read(page)).inventory[target], 0);
  const beforeBuy = await read(page);
  await page.locator(`[data-action="buy-card"][data-id="${target}"]`).click();
  await waitProfile(page, (p, argument) => p.inventory[argument] === 1, target);
  assert.equal((await read(page)).coins, beforeBuy.coins - RARITIES[CARD_RARITIES[target]].buyPrice);
  await go(page, 'collection');
  const acquired = cardItem(page, target);
  assert.equal(await acquired.locator('[data-action="upgrade"]').isDisabled(), false);
  await acquired.locator('[data-action="upgrade"]').click();
  const beforeUpgrade = await read(page);
  const targetUID = beforeUpgrade.instances.find(instance => instance.cardId === target).uid;
  assert.equal(await page.locator('.bag-passport-id dd').textContent(), targetUID);
  await page.locator(`.modal [data-action="instance-upgrade"][data-id="${targetUID}"]`).click();
  await waitProfile(page, (p, argument) => p.instances.some(instance => instance.uid === argument && instance.level === 2 && instance.xp === 80), targetUID);
  assert.equal((await read(page)).coins, beforeUpgrade.coins - 120);
  assert.equal((await read(page)).dust, beforeUpgrade.dust - 6);
  await page.locator('.modal-close').click();
  await cardItem(page, 'qingxiao').locator('[data-action="toggle-deck"]').click();
  await cardItem(page, target).locator('[data-action="toggle-deck"]').click();
  await page.locator('[data-action="save-deck"]').click();
  await page.locator('.hero h1').waitFor();
  const newDeck = (await read(page)).deck;
  assert(newDeck.includes(target)); assert(!newDeck.includes('qingxiao'));
  assert(validateDeck(newDeck).valid);
  checked.push('NPC first acquisition unlocks upgrade and deck inclusion; costs and saved deck are correct');

  // This fixed shuffle draws the newly appended 武松 while keeping normal UI draws.
  await page.evaluate(() => { Math.random = () => 0.5; });
  await go(page, 'world');
  await page.locator('[data-action="map-select"][data-id="mist-gate"]').click();
  await page.locator('[data-action="travel"]').click();
  await page.locator('.player-hand').waitFor();
  const started = await read(page, battleKey);
  assert(started.match.player.hand.includes(target));
  assert.equal(started.match.mode, 'expedition');
  await page.locator(`.player-hand [data-action="select"][data-id="${target}"]`).click();
  const visibleStats = await page.locator(`.player-hand [data-action="select"][data-id="${target}"] .card-stat strong`).allTextContents();
  assert.deepEqual(visibleStats.map(Number), [getCard(target).power + 1, getCard(target).damage]);
  await page.locator('.hand-caption [data-action="inspect"]').click();
  assert.match(await page.locator('.detail-source').textContent(), /水滸傳/);
  assert.match(await page.locator('.detail-rank').textContent(), /出戰 Lv\.2/);
  await page.locator('.modal-close').click();
  await shot(page, 'battle-desktop');
  const beforeBattle = await read(page);
  let rounds = 0;
  while (rounds < 4) {
    if (rounds > 0) await page.locator('.player-hand [data-action="select"]:not(:disabled)').first().click();
    const max = Number(await page.locator('#pill-slider').getAttribute('max'));
    await page.locator('#pill-slider').fill(String(Math.min(3, max)));
    await page.locator('[data-action="commit"]').click();
    await page.locator('.result-modal .resolution').waitFor();
    if (rounds === 0) {
      assert.match(await page.locator('.result-effects').textContent(), /伏虎/);
      assert.deepEqual((await page.locator('.duel-cards > div').first().locator('.card-stat strong').allTextContents()).map(Number), [8, 3]);
    }
    rounds++;
    const finished = (await page.locator('[data-action="next-round"]').textContent()).includes('對局結果');
    await page.locator('[data-action="next-round"]').click();
    if (finished) break;
  }
  await page.locator('.match-score').waitFor();
  assert.equal((await read(page)).stats.played, beforeBattle.stats.played + 1);
  assert.equal((await read(page)).pending, null);
  assert.equal((await read(page)).instances.find(instance => instance.uid === targetUID).battles, 1);
  assert((await read(page)).instances.find(instance => instance.uid === targetUID).xp > 80);
  checked.push(`real ${rounds}-round expedition with classics, upgraded 武松 stats/detail, skill resolution and one settlement`);
  await context.close();

  const mobile = await seededContext(createProfile({ now: fixedNow }), true);
  await mobile.page.locator('[data-action="classics"]').click();
  assert.equal(await mobile.page.locator('.collection-item').count(), 12);
  await shot(mobile.page, 'collection-mobile');
  await cardItem(mobile.page, 'huangdi').locator('[data-action="inspect"]').click();
  assert.match(await mobile.page.locator('.detail-source').textContent(), /尚未入藏/);
  await shot(mobile.page, 'detail-mobile');
  await mobile.page.locator('.modal-close').click();
  await go(mobile.page, 'market');
  await shot(mobile.page, 'market-mobile');
  await mobile.context.close();
  checked.push('1440px desktop and 390px mobile collection/detail/market without overflow or missing atlas assets');
  assert.deepEqual(failures, [], 'Browser/network errors');
  console.log(JSON.stringify({ passed: true, checked, screenshots: screenshots.map(name => output + name) }, null, 2));
} finally { await browser.close(); }
