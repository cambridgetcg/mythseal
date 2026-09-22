import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createProfile, PROFILE_KEY } from '../progression.mjs';
import { mintInstance, setInstanceXP } from '../collection.mjs';
import { createMatch, chooseAIMove, LEGACY_CARD_IDS } from '../engine.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.GAME_URL || 'http://127.0.0.1:4177';
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = fileURLToPath(new URL('../test-results/', import.meta.url));
const fixedNow = '2026-09-21T12:00:00Z';
const legacyProfileKey = 'shanhai.profile.v2';
const errors = [], checks = [], screenshots = [], contexts = [];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROFILE_KEY);
const go = (page, destination) => page.locator(`.game-dock [data-action="${destination}"]`).click();
const action = (page, name, uid, prefix = '') => page.locator(`${prefix}[data-action="${name}"]${uid ? `[data-id="${uid}"]` : ''}`);
const waitInstance = (page, uid, fields) => page.waitForFunction(({ key, uid, fields }) => {
  const instance = JSON.parse(localStorage.getItem(key))?.instances.find(item => item.uid === uid);
  return instance && Object.entries(fields).every(([name, value]) => instance[name] === value);
}, { key: PROFILE_KEY, uid, fields });
const waitDeck = (page, id, active = false) => page.waitForFunction(({ key, id, active }) => {
  const profile = JSON.parse(localStorage.getItem(key));
  return profile?.deckSlots.some(slot => slot.id === id) && (!active || profile.activeDeckId === id);
}, { key: PROFILE_KEY, id, active });
async function noOverflow(page, label) {
  const result = await page.evaluate(() => ({
    viewport: innerWidth, page: document.documentElement.scrollWidth,
    modal: [...document.querySelectorAll('.modal')].map(element => ({ width: element.clientWidth, scroll: element.scrollWidth })),
  }));
  assert(result.page <= result.viewport + 1, `${label}: page overflow ${JSON.stringify(result)}`);
  assert(result.modal.every(modal => modal.scroll <= modal.width + 1), `${label}: modal overflow ${JSON.stringify(result)}`);
}
async function shot(page, name) {
  await noOverflow(page, name);
  await page.screenshot({ path: output + name, fullPage: true });
  screenshots.push(name);
}
function passed(message) { checks.push(message); console.log(`PASS ${message}`); }
async function seededPage(seed, { legacy = false, mobile = false, legacyBattle = null } = {}) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    reducedMotion: 'reduce', ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : {}),
  });
  contexts.push(context);
  // One isolated browser context per fixture; never load a persistent user profile.
  await context.addInitScript(({ seed, key, now, legacyBattle }) => {
    const NativeDate = Date, fixed = new NativeDate(now).getTime();
    globalThis.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [fixed])); }
      static now() { return fixed; }
    };
    if (!localStorage.getItem('backpack-smoke.seeded')) {
      localStorage.setItem('backpack-smoke.seeded', 'true');
      localStorage.setItem(key, JSON.stringify(seed));
      if (legacyBattle) localStorage.setItem('shanhai.battle.v2', JSON.stringify(legacyBattle));
    }
  }, { seed, key: legacy ? legacyProfileKey : PROFILE_KEY, now: fixedNow, legacyBattle });
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && response.url().startsWith(base)) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('.game-lobby').waitFor();
  return page;
}

try {
  const old = createProfile({ now: fixedNow });
  for (const key of ['instances', 'deckSlots', 'activeDeckId', 'merchantVault', 'instanceSerial', 'collectionVersion', 'wx01']) delete old[key];
  old.version = 2; old.collectionExpansion = 1;
  for (const key of ['inventory', 'levels']) old[key] = Object.fromEntries(LEGACY_CARD_IDS.map(id => [id, old[key][id]]));
  old.inventory.qingxiao = 2;
  old.levels.qingxiao = 3;
  old.coins = 4321; old.dust = 95; old.xp = 480;
  old.stats = { played: 19, won: 11 };
  old.deck.reverse();
  const migration = await seededPage(old, { legacy: true });
  const migrated = await read(migration);
  assert.equal(migrated.version, 4);
  assert.equal(migrated.instances.length, Object.values(old.inventory).reduce((sum, count) => sum + count, 0));
  assert.equal(new Set(migrated.instances.map(instance => instance.uid)).size, migrated.instances.length);
  assert.deepEqual(migrated.instances.filter(instance => instance.cardId === 'qingxiao').map(instance => instance.level), [3, 3]);
  for (const field of ['coins', 'dust', 'xp', 'stats', 'deck']) assert.deepEqual(migrated[field], old[field]);
  assert.equal(await migration.evaluate(key => localStorage.getItem(key), legacyProfileKey), JSON.stringify(old));
  await migration.reload(); await migration.locator('.game-lobby').waitFor();
  assert.deepEqual(await read(migration), migrated);
  assert.equal(await migration.evaluate(key => localStorage.getItem(key), legacyProfileKey), JSON.stringify(old));
  passed('v2 migration retains copy counts, levels, deck and resources; original raw key and migrated v4 IDs survive reload');

  const pendingOld = structuredClone(old);
  const oldMatch = createMatch({ deckIds: pendingOld.deck, mode: 'arena', playerLevels: pendingOld.levels, rng: () => 0.23 });
  const removedRole = oldMatch.player.hand[0];
  pendingOld.serial = 10;
  pendingOld.pending = { id: 'battle-10', kind: 'arena', nodeId: null };
  pendingOld.deck = pendingOld.deck.map(id => id === removedRole ? 'kongzi' : id);
  const oldBattle = { match: oldMatch, encounter: pendingOld.pending, selected: removedRole, pills: 0, fury: false,
    aiMove: oldMatch.initiative === 'opponent' ? chooseAIMove(oldMatch, () => 0.23) : null, revealPending: false, recorded: false, lastReward: null };
  const resumed = await seededPage(pendingOld, { legacy: true, legacyBattle: oldBattle });
  const migratedBattle = await read(resumed);
  assert.deepEqual(migratedBattle.deck, pendingOld.deck);
  assert(oldMatch.player.hand.every(id => migratedBattle.pending.cardInstances[id]));
  const playedUID = migratedBattle.pending.cardInstances[removedRole];
  const beforePlayed = migratedBattle.instances.find(instance => instance.uid === playedUID);
  assert.deepEqual(await resumed.evaluate(() => JSON.parse(localStorage.getItem('shanhai.battle.v4'))), oldBattle);
  await resumed.reload(); await resumed.locator('.game-lobby').waitFor();
  assert.deepEqual((await read(resumed)).pending, migratedBattle.pending);
  await action(resumed, 'resume').click();
  await resumed.locator('.player-hand').waitFor();
  for (let round = 0; round < 4; round++) {
    const saved = await resumed.evaluate(() => JSON.parse(localStorage.getItem('shanhai.battle.v4')));
    const role = round === 0 ? removedRole : saved.match.player.hand.find(id => !saved.match.player.used.includes(id));
    await action(resumed, 'select', role, '.player-hand ').click();
    await action(resumed, 'commit').click();
    await resumed.locator('.result-modal .resolution').waitFor();
    const finished = !(await read(resumed)).pending;
    await action(resumed, 'next-round').click();
    if (finished) break;
  }
  await resumed.locator('.match-score').waitFor();
  const settled = await read(resumed), usedCopy = settled.instances.find(instance => instance.uid === playedUID);
  assert.equal(settled.pending, null);
  assert.equal(settled.stats.played, pendingOld.stats.played + 1);
  assert.equal(usedCopy.battles, beforePlayed.battles + 1);
  assert(usedCopy.xp > beforePlayed.xp);
  assert.deepEqual(settled.deck, pendingOld.deck);
  assert.equal(await resumed.evaluate(key => localStorage.getItem(key), legacyProfileKey), JSON.stringify(pendingOld));
  assert.equal(await resumed.evaluate(() => localStorage.getItem('shanhai.battle.v2')), JSON.stringify(oldBattle));
  await resumed.reload(); await resumed.locator('.game-lobby').waitFor();
  assert.deepEqual(await read(resumed), settled);
  passed('a pending v2 match resumes after a saved-deck edit, completes via UI, awards its original card once and preserves both old keys');

  let fixture = createProfile({ now: fixedNow });
  const originalUID = fixture.instances.find(instance => instance.cardId === 'qingxiao').uid;
  fixture = mintInstance(fixture, 'qingxiao', { source: 'pack:all', now: fixedNow }).profile;
  const copyUID = fixture.instances.at(-1).uid;
  fixture = setInstanceXP(fixture, originalUID, 95);
  fixture = setInstanceXP(fixture, copyUID, 260);
  fixture.coins = 10000; fixture.dust = 1000;
  Object.assign(fixture.instances.find(instance => instance.uid === originalUID), { battles: 2, wins: 1 });
  Object.assign(fixture.instances.find(instance => instance.uid === copyUID), { battles: 7, wins: 4 });
  const page = await seededPage(fixture);
  await go(page, 'bag');
  assert.equal(await page.locator('.bag-item').count(), fixture.instances.length);
  assert.equal(await page.locator('.bag-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length), 6);
  await shot(page, 'backpack-desktop.png');
  await page.locator('#bag-search').fill('青霄');
  assert.equal(await page.locator('.bag-item').count(), 2);
  assert.equal(await page.locator('#bag-search').evaluate(element => document.activeElement === element), true);
  await page.locator('#bag-sort').selectOption('level');
  assert.equal(await page.locator('.bag-grid [data-action="instance-inspect"]').first().getAttribute('data-id'), copyUID);
  await action(page, 'instance-inspect', copyUID, '.bag-grid ').click();
  await page.locator('.bag-passport-id').waitFor();
  assert.match(await page.locator('.bag-passport').innerText(), new RegExp(copyUID));
  assert.match(await page.locator('.bag-passport').innerText(), /7 場 · 4 勝/);
  await action(page, 'instance-upgrade', copyUID, '.modal ').click();
  await waitInstance(page, copyUID, { xp: 400, level: 4 });
  assert.equal((await read(page)).instances.find(instance => instance.uid === originalUID).xp, 95);
  await action(page, 'instance-lock', copyUID, '.modal ').click();
  await waitInstance(page, copyUID, { locked: true });
  assert(await action(page, 'instance-sell', copyUID, '.modal ').isDisabled());
  assert.equal(await action(page, 'instance-upgrade', copyUID, '.modal ').isDisabled(), false);
  await shot(page, 'backpack-passport.png');
  await page.locator('.modal-close').click();
  await page.reload(); await page.locator('.game-lobby').waitFor();
  await go(page, 'bag');
  await page.locator('#bag-filter').selectOption('locked');
  assert.equal(await page.locator('.bag-item').count(), 1);
  await action(page, 'instance-inspect', copyUID, '.bag-grid ').click();
  await waitInstance(page, copyUID, { xp: 400, level: 4, locked: true, battles: 7, wins: 4 });
  passed('passport upgrades one UID only; lock blocks sale but permits training; distinct XP and history persist through reload');

  await action(page, 'instance-lock', copyUID, '.modal ').click();
  await waitInstance(page, copyUID, { locked: false });
  const beforeSale = await read(page), soldCard = beforeSale.instances.find(instance => instance.uid === copyUID);
  await action(page, 'instance-sell', copyUID, '.modal ').click();
  await action(page, 'confirm-instance-sell', copyUID, '.modal ').waitFor();
  assert.match(await page.locator('.modal').innerText(), new RegExp(copyUID));
  assert.match(await page.locator('.modal').innerText(), /400 EXP/);
  assert.deepEqual(await read(page), beforeSale, 'Showing sale confirmation must not mutate ownership');
  await page.locator('.modal .secondary[data-action="close-modal"]').click();
  assert.deepEqual(await read(page), beforeSale, 'Cancelling sale must not mutate ownership');
  await page.locator('#bag-filter').selectOption('all');
  await action(page, 'instance-inspect', copyUID, '.bag-grid ').click();
  await action(page, 'instance-sell', copyUID, '.modal ').click();
  await action(page, 'confirm-instance-sell', copyUID, '.modal ').click();
  await page.waitForFunction(({ key, uid }) => JSON.parse(localStorage.getItem(key))?.merchantVault.some(entry => entry.instance.uid === uid), { key: PROFILE_KEY, uid: copyUID });
  const sold = await read(page), vaultEntry = sold.merchantVault.find(entry => entry.instance.uid === copyUID);
  assert.deepEqual(vaultEntry.instance, soldCard);
  assert(!sold.instances.some(instance => instance.uid === copyUID));
  assert.equal(sold.coins, beforeSale.coins + vaultEntry.sellPrice);
  await page.reload(); await page.locator('.game-lobby').waitFor();
  assert.deepEqual((await read(page)).merchantVault.find(entry => entry.instance.uid === copyUID), vaultEntry);
  await go(page, 'market');
  await action(page, 'buyback-instance', copyUID).click();
  await waitInstance(page, copyUID, { xp: 400, level: 4, battles: 7, wins: 4 });
  const returned = await read(page);
  assert.deepEqual(returned.instances.find(instance => instance.uid === copyUID), soldCard);
  assert.equal(returned.merchantVault.length, 0);
  assert.equal(returned.coins, sold.coins - vaultEntry.buybackPrice);
  passed('sale requires confirmation; cancel is inert; merchant buyback returns the exact UID with XP and battle history');

  await go(page, 'bag');
  await action(page, 'cards-tab', 'decks').click();
  const startingIDs = (await read(page)).deckSlots.find(slot => slot.id === 'deck-1').instanceIds;
  for (const [slotID, name, firstUID] of [['deck-2', '青霄再行', copyUID], ['deck-3', '第三陣 <山海>', originalUID]]) {
    await action(page, 'bag-new-deck').click();
    await page.locator('#bag-deck-name').fill(name);
    await action(page, 'bag-pick-instance', originalUID, '.bag-grid ').click();
    if (firstUID === copyUID) {
      await action(page, 'bag-pick-instance', copyUID, '.bag-grid ').click();
      assert.equal(await page.locator('.bag-draft-tray .bag-draft-card').count(), 1, 'A second copy replaces the same role in draft');
      assert.equal(await action(page, 'bag-pick-instance', originalUID, '.bag-draft-tray ').count(), 0);
      assert.equal(await action(page, 'bag-pick-instance', copyUID, '.bag-draft-tray ').count(), 1);
    }
    for (const uid of startingIDs.filter(uid => uid !== originalUID)) await action(page, 'bag-pick-instance', uid, '.bag-grid ').click();
    assert.equal(await page.locator('.bag-draft-tray .bag-draft-card').count(), 8);
    assert.equal(await action(page, 'bag-save-deck').isDisabled(), false);
    await action(page, 'bag-save-deck').click();
    await waitDeck(page, slotID);
    await action(page, 'bag-activate-deck', slotID).click();
    await waitDeck(page, slotID, true);
    const saved = await read(page), slot = saved.deckSlots.find(item => item.id === slotID);
    assert.equal(slot.name, name);
    assert(slot.instanceIds.includes(firstUID));
    assert.equal(new Set(slot.instanceIds.map(uid => saved.instances.find(instance => instance.uid === uid).cardId)).size, 8);
  }
  assert.equal(await action(page, 'bag-new-deck').count(), 0);
  assert.equal(await page.locator('.bag-deck-slot').count(), 3);
  assert.equal(await action(page, 'bag-delete-deck', 'deck-3').count(), 0);
  await shot(page, 'backpack-decks.png');
  const deckSnapshot = await read(page);
  await page.reload(); await page.locator('.game-lobby').waitFor();
  assert.deepEqual((await read(page)).deckSlots, deckSnapshot.deckSlots);
  assert.equal((await read(page)).activeDeckId, 'deck-3');
  passed('deck slots 2 and 3 save and activate; same-role copy replaces draft selection; names and exact slots persist');

  const mobile = await seededPage(await read(page), { mobile: true });
  await go(mobile, 'bag');
  assert.equal(await mobile.locator('.bag-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length), 2);
  await shot(mobile, 'backpack-mobile.png');
  await mobile.locator('#bag-filter').selectOption('duplicates');
  assert.equal(await mobile.locator('.bag-item').count(), 2);
  await action(mobile, 'instance-inspect', copyUID, '.bag-grid ').click();
  await noOverflow(mobile, '390px passport');
  assert.match(await mobile.locator('.bag-passport-id').innerText(), new RegExp(copyUID));
  await mobile.locator('.modal-close').click();
  await action(mobile, 'cards-tab', 'decks').click();
  await noOverflow(mobile, '390px decks');
  passed('390px mobile cards use two columns; card list, passport and three-deck editor have no horizontal overflow');

  assert.deepEqual(errors, [], 'Browser errors or failed local responses');
  console.log(JSON.stringify({ ok: true, checks, screenshots, browserErrors: errors }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, passed: checks, browserErrors: errors, error: error.stack }, null, 2));
  process.exitCode = 1;
} finally {
  await Promise.allSettled(contexts.map(context => context.close()));
  await browser.close();
}
