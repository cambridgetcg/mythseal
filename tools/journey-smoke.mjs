import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CARDS, defaultDeckIds } from '../engine.mjs';
import { createProfile, NODES, LOGIN_REWARD, PACK_PRICE, RARITIES, CARD_RARITIES } from '../progression.mjs';
import { setInstanceXP } from '../collection.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.GAME_URL || 'http://127.0.0.1:4177';
const output = fileURLToPath(new URL('../test-results/', import.meta.url));
await mkdir(output, { recursive: true });
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
const failures = [], checked = [], screenshots = [];
const profileKey = 'shanhai.profile.v4', battleKey = 'shanhai.battle.v4';
const profile = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), profileKey);
const snapshot = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), battleKey);
const watch = page => {
  page.on('pageerror', error => failures.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  page.setDefaultTimeout(10_000);
};
const noOverflow = async page => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Horizontal overflow at ${await page.locator('main h1, .arena-heading').first().textContent()}`);
const screenshot = async (page, label) => {
  await noOverflow(page);
  const filename = `journey-${label}.png`;
  await page.screenshot({ path: output + filename, fullPage: true });
  screenshots.push(filename);
};
const go = async (page, screen) => {
  if (await page.locator('.modal-close').count()) await page.locator('.modal-close').click();
  if (screen === 'daily') {
    await page.locator('.game-dock [data-action="home"]').click();
    return page.locator('.game-lobby [data-action="quests"]').click();
  }
  return page.locator(`.game-dock [data-action="${screen}"]`).click();
};
const practice = async page => {
  await go(page, 'arena');
  await page.locator('[data-action="start"]').click();
};
const waitProfile = async (page, predicate, argument) => {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (predicate(await profile(page), argument)) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Timed out waiting for the expected profile change.');
};
const totalCopies = p => Object.values(p.inventory).reduce((sum, count) => sum + count, 0);
async function contextWithSeed(seed, mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : {}) });
  await context.addInitScript(({ seed, key }) => {
    Math.random = () => 0.23;
    if (localStorage.getItem('journey-smoke.seeded')) return;
    localStorage.setItem('journey-smoke.seeded', 'true');
    for (const [name, value] of Object.entries(seed)) localStorage.setItem(name === 'profile' ? key : name, JSON.stringify(value));
  }, { seed, key: profileKey });
  const page = await context.newPage(); watch(page);
  await page.goto(base);
  await page.locator('.game-lobby').waitFor();
  return { context, page };
}

/** Deterministic test pilot; production UI still selects and commits every move. */
async function playRound(page) {
  const move = await page.evaluate(async key => {
    const { chooseAIMove, resolveRound } = await import('./engine.mjs');
    const saved = JSON.parse(localStorage.getItem(key));
    const state = saved.match;
    let best = null;
    for (const cardId of state.player.hand.filter(id => !state.player.used.includes(id))) {
      const opponentMove = saved.aiMove || chooseAIMove(state, () => 0.23, cardId);
      for (const fury of [false, true]) {
        const budget = state.player.pills - (fury ? 3 : 0);
        for (let pills = 0; pills <= budget; pills++) {
          const playerMove = { cardId, pills, fury };
          const next = resolveRound(state, playerMove, opponentMove);
          const score = (next.status === 'finished' ? (next.winner === 'player' ? 1000 : next.winner === 'draw' ? 0 : -1000) : 0)
            + (next.player.hp - next.opponent.hp) * 10 + next.player.pills * 0.7 - next.opponent.pills * 0.3;
          if (!best || score > best.score) best = { ...playerMove, score };
        }
      }
    }
    return best;
  }, battleKey);
  await page.locator(`.player-hand [data-action="select"][data-id="${move.cardId}"]`).click();
  if (move.fury) await page.locator('[data-action="fury"]').click();
  await page.locator('#pill-slider').fill(String(move.pills));
  await page.locator('[data-action="commit"]').click();
  await page.locator('.result-modal .resolution').waitFor();
  const finished = (await page.locator('[data-action="next-round"]').textContent()).includes('對局結果');
  return { finished, move };
}
async function finishViaUI(page) {
  let rounds = 0;
  while (rounds < 4) {
    const result = await playRound(page); rounds++;
    await page.locator('[data-action="next-round"]').click();
    if (result.finished) { await page.locator('.match-score').waitFor(); return rounds; }
  }
  throw Error('Match did not finish within four rounds');
}

try {
  const legacyDeck = [...defaultDeckIds].reverse();
  const { context, page } = await contextWithSeed({ 'shanhai.deck.v1': legacyDeck, 'shanhai.stats.v1': { played: 7, won: 3 } });
  let p = await profile(page);
  assert.deepEqual(p.deck, legacyDeck);
  assert.deepEqual(p.stats, { played: 7, won: 3 });
  assert.equal(totalCopies(p), 16);
  assert.equal(p.coins, 1200);
  checked.push('v1 deck/stats migration through browser startup');

  await go(page, 'world');
  assert.equal(await page.locator('.map-pin').count(), 6);
  assert.equal(await page.locator('.map-pin.available').count(), 1);
  await page.locator('[data-action="map-select"][data-id="jade-forest"]').click();
  assert(await page.locator('[data-action="travel"]').isDisabled());
  await page.locator('[data-action="map-select"][data-id="mist-gate"]').click();
  await screenshot(page, 'world-desktop');

  await go(page, 'daily');
  await page.locator('[data-action="claim-login"]').click();
  await waitProfile(page, p => p.daily.loginClaimed);
  p = await profile(page);
  assert.equal(p.coins, 1200 + LOGIN_REWARD.coins);
  assert(await page.locator('[data-action="claim-login"]').isDisabled());
  const trainingUID = p.instances.find(instance => instance.cardId === 'qingxiao').uid;
  await page.locator('#training-select').selectOption(trainingUID);
  await page.locator('[data-action="daily-train"]').click();
  await waitProfile(page, p => p.daily.trainingUsed);
  assert.equal((await profile(page)).levels.qingxiao, 2);
  assert.equal((await profile(page)).instances.find(instance => instance.uid === trainingUID).xp, 80);
  assert.equal((await profile(page)).coins, p.coins - 60);
  assert.equal((await profile(page)).dust, p.dust - 3);
  await page.locator('#training-select').selectOption(p.instances.find(instance => instance.cardId === 'chiling').uid);
  assert(await page.locator('[data-action="daily-train"]').isDisabled());
  const afterTraining = await profile(page);
  await screenshot(page, 'daily-desktop');
  await page.reload(); await page.locator('.game-lobby').waitFor(); await go(page, 'daily');
  assert.deepEqual(await profile(page), afterTraining);
  assert(await page.locator('[data-action="claim-login"]').isDisabled());
  assert(await page.locator('[data-action="daily-train"]').isDisabled());
  checked.push('login/training costs, once-daily buttons and reload persistence');

  await go(page, 'market');
  await page.locator('[data-action="pack-set"][data-id="classics"]').click();
  const beforePack = await profile(page);
  await page.locator('[data-action="buy-pack"]').click();
  await page.locator('.pack-reveal').waitFor();
  assert.equal(await page.locator('.pack-result').count(), 3);
  const rarities = await page.locator('.pack-result .rarity-label').allTextContents();
  assert(rarities.includes('靈品') || rarities.includes('神品'));
  p = await profile(page);
  assert.equal(p.coins, beforePack.coins - PACK_PRICE);
  assert.equal(totalCopies(p), totalCopies(beforePack) + 3);
  await screenshot(page, 'pack-desktop');
  await page.locator('.modal-close[data-action="close-modal"]').click();
  const prior = await profile(page);
  const availableIds = await page.locator('[data-action="buy-card"]:not(:disabled)').evaluateAll(buttons => buttons.map(button => button.dataset.id));
  const cardId = availableIds.find(id => prior.inventory[id] > 0) ?? availableIds.find(id => RARITIES[CARD_RARITIES[id]].buyPrice * 2 <= prior.coins);
  assert(cardId, 'An affordable surplus-purchase path exists');
  const buy = page.locator(`[data-action="buy-card"][data-id="${cardId}"]`);
  await buy.click();
  await waitProfile(page, (p, argument) => p.inventory[argument.id] === argument.count, { id: cardId, count: prior.inventory[cardId] + 1 });
  p = await profile(page);
  assert.equal(p.coins, prior.coins - RARITIES[CARD_RARITIES[cardId]].buyPrice);
  assert.equal(p.daily.marketPurchases[cardId], 1);
  // A market listing can now be a first acquisition; buy its second copy so this
  // regression still exercises a real surplus sale and last-copy protection.
  if (p.inventory[cardId] === 1) {
    await page.locator(`[data-action="buy-card"][data-id="${cardId}"]`).click();
    await waitProfile(page, (p, argument) => p.inventory[argument] === 2, cardId);
    p = await profile(page);
  }
  let selling = p;
  while (selling.inventory[cardId] > 1) {
    const availableSales = await page.locator('[data-action="instance-sell"]:not(:disabled)').evaluateAll(buttons => buttons.map(button => button.dataset.id));
    const soldCopy = selling.instances.find(instance => instance.cardId === cardId && availableSales.includes(instance.uid));
    assert(soldCopy, 'An unprotected surplus copy is available to sell');
    await page.locator(`[data-action="instance-sell"][data-id="${soldCopy.uid}"]`).click();
    assert.match(await page.locator('.modal .instance-serial').textContent(), new RegExp(soldCopy.uid));
    await page.locator(`[data-action="confirm-instance-sell"][data-id="${soldCopy.uid}"]`).click();
    await waitProfile(page, (p, argument) => p.inventory[argument.id] === argument.count, { id: cardId, count: selling.inventory[cardId] - 1 });
    const next = await profile(page);
    assert.equal(next.coins, selling.coins + RARITIES[CARD_RARITIES[cardId]].sellPrice + 30 * (soldCopy.level - 1));
    assert.deepEqual(next.merchantVault.find(entry => entry.instance.uid === soldCopy.uid).instance, soldCopy);
    selling = next;
  }
  const remainingUID = selling.instances.find(instance => instance.cardId === cardId).uid;
  assert.equal(await page.locator(`[data-action="instance-sell"][data-id="${remainingUID}"]:not(:disabled)`).count(), 0);
  assert.deepEqual(selling.deck, legacyDeck);
  await screenshot(page, 'market-desktop');
  await go(page, 'daily');
  assert.equal(await page.locator('[data-action="claim-task"][data-id="pack"]').isDisabled(), false);
  await page.locator('[data-action="claim-task"][data-id="pack"]').click();
  await waitProfile(page, p => p.daily.claimedTasks.includes('pack'));
  assert(await page.locator('[data-action="claim-task"][data-id="pack"]').isDisabled());
  checked.push('real pack reveal, guaranteed rarity, inventory/cost, NPC purchase/surplus sale, last-copy protection, pack task claim');
  await go(page, 'arena'); await screenshot(page, 'arena-desktop');
  await context.close();

  // Advanced cards are a test fixture, while combat and all awards use real UI paths.
  let seasoned = createProfile();
  for (const instance of seasoned.instances) seasoned = setInstanceXP(seasoned, instance.uid, 700);
  const duel = await contextWithSeed({ profile: seasoned });
  const battle = duel.page;
  await go(battle, 'world'); await battle.locator('[data-action="travel"]').click();
  await battle.locator('[data-action="confirm-start"]').click();
  await battle.locator('.player-hand').waitFor();
  const original = await snapshot(battle);
  assert.equal(original.match.mode, 'expedition');
  assert(original.match.player.hand.every(id => original.match.playerLevels[id] === 5));
  await playRound(battle);
  const firstRound = await snapshot(battle);
  assert.equal(firstRound.match.history.length, 1);
  await battle.reload(); await battle.locator('[data-action="resume"]').click();
  await battle.locator('.result-modal .resolution').waitFor();
  assert.deepEqual((await snapshot(battle)).match, firstRound.match);
  await battle.locator('[data-action="next-round"]').click();
  await battle.locator('.player-hand').waitFor();
  assert.match(await battle.locator('.round-steps').textContent(), /第 2/);
  const remainingRounds = await finishViaUI(battle);
  assert.match(await battle.locator('.match-symbol').textContent(), /勝/);
  p = await profile(battle);
  assert.deepEqual(p.cleared, [NODES[0].id]);
  assert.equal(p.stats.played, 1);
  assert.equal(p.coins, seasoned.coins + NODES[0].winReward.coins + NODES[0].firstClearReward.coins + NODES[0].dailyReward.coins);
  assert.equal(p.pending, null);
  assert.equal(await snapshot(battle), null);
  await screenshot(battle, 'expedition-result-desktop');
  const completed = p;
  await battle.reload(); await battle.locator('.game-lobby').waitFor();
  assert.deepEqual(await profile(battle), completed);
  assert.equal(await battle.locator('[data-action="resume"]').count(), 0);
  await go(battle, 'world');
  assert.equal(await battle.locator('.map-pin.available').count(), 2);
  checked.push(`real expedition win (${remainingRounds + 1} rounds), round-reveal resume, first-clear/daily payout, next-node unlock, reload without duplicate payout`);

  await go(battle, 'arena'); await battle.locator('[data-action="ranked"]').click();
  await battle.locator('[data-action="confirm-start"]').click();
  await battle.locator('.player-hand').waitFor();
  const ranked = await snapshot(battle);
  assert.equal(ranked.match.mode, 'arena');
  for (const id of ranked.match.player.hand) {
    const displayed = await battle.locator(`.player-hand [data-id="${id}"] .card-stat strong`).allTextContents();
    const baseCard = CARDS.find(card => card.id === id);
    assert.deepEqual(displayed.slice(0, 2).map(Number), [baseCard.power, baseCard.damage]);
  }
  await finishViaUI(battle);
  const afterArena = await profile(battle);
  assert.equal(afterArena.arena.played, 1);
  assert([5, 10, 30].includes(afterArena.arena.points));
  assert.equal(afterArena.daily.arenaMatches, 1);
  await battle.locator('[data-action="end-home"]').click();
  await practice(battle);
  await battle.locator('[data-action="confirm-start"]').click();
  await battle.locator('.player-hand').waitFor();
  assert.equal((await snapshot(battle)).match.mode, 'practice');
  const chosen = await battle.locator('.player-hand [data-action="select"]').nth(1).getAttribute('data-id');
  await battle.locator(`.player-hand [data-action="select"][data-id="${chosen}"]`).click();
  await battle.locator('#pill-slider').fill('2');
  await battle.locator('[data-action="fury"]').click();
  await battle.locator('[data-action="battle-menu"]').click();
  await battle.locator('[data-action="navigate-confirm"]').click();
  await battle.locator('.game-lobby').waitFor();
  const held = await snapshot(battle);
  assert.equal(held.selected, chosen);
  assert.equal(held.pills, 2);
  assert.equal(held.fury, true);
  await battle.locator('[data-action="resume"]').click();
  await battle.locator('.player-hand').waitFor();
  assert.equal(await battle.locator(`.player-hand [data-action="select"][data-id="${chosen}"]`).getAttribute('aria-pressed'), 'true');
  assert.equal(await battle.locator('#pill-slider').inputValue(), '2');
  assert.equal(await battle.locator('[data-action="fury"]').getAttribute('aria-pressed'), 'true');
  // A later uncommitted edit must also survive pagehide/reload.
  await battle.locator('#pill-slider').fill('3');
  await battle.reload(); await battle.locator('[data-action="resume"]').click();
  await battle.locator('.player-hand').waitFor();
  assert.equal(await battle.locator(`.player-hand [data-action="select"][data-id="${chosen}"]`).getAttribute('aria-pressed'), 'true');
  assert.equal(await battle.locator('#pill-slider').inputValue(), '3');
  assert.equal(await battle.locator('[data-action="fury"]').getAttribute('aria-pressed'), 'true');
  checked.push('chosen card, bid and Fury survive keep-and-leave/resume, plus fresh bid edit survives pagehide/reload');

  // Tab A holds a confirmation for battle 1 while tab B starts battle 2.
  // Confirming A's old dialog must not cancel or erase B's newer snapshot.
  const abandonedId = (await profile(battle)).pending.id;
  await battle.locator('[data-action="battle-menu"]').click();
  assert.equal(await battle.locator('[data-action="abandon-navigate"]').getAttribute('data-encounter'), abandonedId);
  const secondTab = await duel.context.newPage(); watch(secondTab);
  await secondTab.goto(base); await secondTab.locator('.game-lobby').waitFor();
  await practice(secondTab);
  await secondTab.locator('[data-action="discard-pending"]').click();
  await waitProfile(secondTab, p => p.pending === null);
  assert.equal(await snapshot(secondTab), null);
  await practice(secondTab);
  await secondTab.locator('[data-action="confirm-start"]').click();
  await secondTab.locator('.player-hand').waitFor();
  const newerProfile = await profile(secondTab), newerBattle = await snapshot(secondTab);
  assert.notEqual(newerProfile.pending.id, abandonedId);
  assert.equal(newerBattle.encounter.id, newerProfile.pending.id);
  await battle.locator('[data-action="abandon-navigate"]').click();
  await battle.locator('.toast').filter({ hasText: '這局已在另一頁改變' }).waitFor();
  assert.deepEqual(await profile(battle), newerProfile);
  assert.deepEqual(await snapshot(battle), newerBattle);
  await secondTab.locator('[data-action="battle-menu"]').click();
  await secondTab.locator('[data-action="abandon-navigate"]').click();
  await waitProfile(secondTab, p => p.pending === null);
  assert.equal((await profile(battle)).coins, afterArena.coins);
  checked.push('arena ignores level-five bonuses, real ladder settlement, practice mode, abandon without rewards');
  checked.push('stale cross-tab discard shows a warning and preserves the newer pending battle and its snapshot');
  await duel.context.close();

  const mobile = await contextWithSeed({}, true);
  for (const screen of ['world', 'daily', 'market', 'arena']) {
    await go(mobile.page, screen);
    await screenshot(mobile.page, `${screen}-mobile`);
  }
  await go(mobile.page, 'market');
  await mobile.page.locator('[data-action="pack-set"][data-id="classics"]').click();
  await mobile.page.locator('[data-action="buy-pack"]').click();
  await mobile.page.locator('.pack-reveal').waitFor();
  await screenshot(mobile.page, 'pack-mobile');
  await mobile.context.close();
  checked.push('390px mobile world/daily/market/arena/pack, desktop screenshots, no horizontal overflow');
  assert.deepEqual(failures, [], 'Browser/network errors');
  console.log(JSON.stringify({ passed: true, checked, screenshots: screenshots.map(name => output + name) }, null, 2));
} finally { await browser.close(); }
