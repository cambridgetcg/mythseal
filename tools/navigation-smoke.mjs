/** Game-shell regressions using isolated local saves and real UI actions. */
import { CARDS } from '../engine.mjs';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createProfile, PROFILE_KEY, NODES } from '../progression.mjs';
import { mintInstance, setInstanceXP } from '../collection.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.GAME_URL || 'http://127.0.0.1:4177';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname)) throw Error('Navigation smoke requires a loopback game server.');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = fileURLToPath(new URL('../test-results/', import.meta.url));
const fixedNow = '2026-09-21T12:00:00Z', battleKey = 'shanhai.battle.v4';
const checks = [], screenshots = [], errors = [], contexts = [];
const action = (page, name, id, prefix = '') => page.locator(`${prefix}[data-action="${name}"]${id ? `[data-id="${id}"]` : ''}`);
const go = (page, destination) => action(page, destination, null, '.game-dock ').click();
const tab = (page, id) => action(page, 'cards-tab', id, '.cards-hub-tabs ').click();
const read = (page, key = PROFILE_KEY) => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const storage = page => page.evaluate(({ profile, battle }) => ({ profile: localStorage.getItem(profile), battle: localStorage.getItem(battle) }), { profile: PROFILE_KEY, battle: battleKey });
const passed = label => { checks.push(label); console.log(`PASS ${label}`); };
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });

async function seededPage(seed, width = 1440) {
  const mobile = width < 600;
  const context = await browser.newContext({ viewport: { width, height: mobile ? 800 : 1000 }, reducedMotion: 'reduce', ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : {}) });
  contexts.push(context);
  await context.addInitScript(({ seed, key, now }) => {
    const NativeDate = Date, fixed = new NativeDate(now).getTime();
    globalThis.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [fixed])); }
      static now() { return fixed; }
    };
    Math.random = () => 0.23;
    if (!localStorage.getItem('navigation-smoke.seeded')) {
      localStorage.setItem('navigation-smoke.seeded', 'true');
      localStorage.setItem(key, JSON.stringify(seed));
    }
  }, { seed, key: PROFILE_KEY, now: fixedNow });
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && new URL(response.url()).origin === new URL(base).origin) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(base);
  await page.locator('.game-lobby').waitFor();
  return page;
}

async function noOverflow(page, label) {
  const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, modals: [...document.querySelectorAll('.modal')].map(element => ({ width: element.clientWidth, scroll: element.scrollWidth })) }));
  assert(sizes.document <= sizes.viewport + 1, `${label}: page overflow ${JSON.stringify(sizes)}`);
  assert(sizes.modals.every(modal => modal.scroll <= modal.width + 1), `${label}: modal overflow ${JSON.stringify(sizes)}`);
}

async function dockFits(page) {
  const buttons = await page.locator('.game-dock [data-action]').evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect();
    return { action: element.dataset.action, left: rect.left, right: rect.right, width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom, viewport: innerWidth, viewportHeight: innerHeight };
  }));
  assert.deepEqual(buttons.map(button => button.action), ['home', 'world', 'arena', 'bag', 'market']);
  assert(buttons.every(button => button.left >= 0 && button.right <= button.viewport + 1 && button.width >= 44 && button.height >= 44), `Every dock control remains visible and tappable: ${JSON.stringify(buttons)}`);
  if (buttons[0].viewport < 600) assert(buttons.every(button => button.top >= 0 && button.bottom <= button.viewportHeight + 1), 'Mobile dock must remain within the viewport');
}

async function shot(page, name) {
  await noOverflow(page, name);
  await page.screenshot({ path: output + name, fullPage: true });
  screenshots.push(name);
}

/** Test pilot scores legal moves; the app still commits and settles each turn. */
async function finishViaUI(page, aim = 'win') {
  for (let round = 0; round < 4; round++) {
    const move = await page.evaluate(async ({ key, aim }) => {
      const { chooseAIMove, resolveRound } = await import('./engine.mjs');
      const saved = JSON.parse(localStorage.getItem(key)), state = saved.match;
      let best;
      for (const cardId of state.player.hand.filter(id => !state.player.used.includes(id))) {
        const opponentMove = saved.aiMove || chooseAIMove(state, () => 0.23, cardId);
        for (const fury of [false, true]) for (let pills = 0; pills <= state.player.pills - (fury ? 3 : 0); pills++) {
          const candidate = { cardId, fury, pills }, next = resolveRound(state, candidate, opponentMove);
          const score = (next.status === 'finished' ? next.winner === 'player' ? 1000 : next.winner === 'draw' ? 0 : -1000 : 0)
            + (next.player.hp - next.opponent.hp) * 10 + next.player.pills * 0.7 - next.opponent.pills * 0.3;
          if (!best || (aim === 'win' ? score > best.score : score < best.score)) best = { ...candidate, score };
        }
      }
      return best;
    }, { key: battleKey, aim });
    await action(page, 'select', move.cardId, '.player-hand ').click();
    if (((await action(page, 'fury').getAttribute('aria-pressed')) === 'true') !== move.fury) await action(page, 'fury').click();
    await page.locator('#pill-slider').fill(String(move.pills));
    await action(page, 'commit').click();
    await page.locator('.result-modal .resolution').waitFor();
    const finished = (await action(page, 'next-round').textContent()).includes('對局結果');
    await action(page, 'next-round').click();
    if (finished) { await page.locator('.match-score').waitFor(); return; }
  }
  throw Error('Match did not settle within four rounds.');
}

try {
  let fixture = createProfile({ now: fixedNow });
  fixture.cleared = [NODES[0].id];
  fixture = mintInstance(fixture, 'qingxiao', { source: 'pack:all', now: fixedNow }).profile;
  const originalUID = fixture.instances.find(instance => instance.cardId === 'qingxiao').uid;
  const duplicateUID = fixture.instances.at(-1).uid;
  fixture = setInstanceXP(fixture, duplicateUID, 260);
  const page = await seededPage(fixture);
  await dockFits(page);
  assert.equal(await page.locator('.game-dock [aria-current="page"]').getAttribute('data-action'), 'home');
  await shot(page, 'navigation-lobby-desktop.png');

  await go(page, 'world');
  await action(page, 'map-select', NODES[1].id).click();
  const beforePrep = await storage(page);
  await action(page, 'travel', NODES[1].id).click();
  await page.locator('.encounter-prep').waitFor();
  assert.match(await page.locator('.encounter-prep').innerText(), new RegExp(NODES[1].name));
  assert.deepEqual(await storage(page), beforePrep, 'Opening preparation must not begin or charge for a battle');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.map-pin.active').getAttribute('data-id'), NODES[1].id);
  assert.deepEqual(await storage(page), beforePrep, 'Cancelling preparation preserves selected place and all save data');
  passed('Encounter preparation and cancellation preserve resources, save bytes and the selected world node');

  await action(page, 'travel', NODES[1].id).click();
  await action(page, 'prep-deck').click();
  await page.locator('.bag-deck-slots').waitFor();
  assert.equal(await page.locator('.cards-hub-tabs [aria-pressed="true"]').getAttribute('data-id'), 'decks');
  const originalDeck = fixture.deckSlots.find(slot => slot.id === fixture.activeDeckId).instanceIds;
  for (const uid of originalDeck) await action(page, 'bag-pick-instance', uid, '.bag-draft-tray ').click();
  assert.equal(await page.locator('.bag-draft-card').count(), 0);
  await tab(page, 'codex');
  await action(page, 'bag-card', 'qingxiao').click();
  assert.equal(await action(page, 'return-prep').count(), 1, 'Codex-to-owned-copy navigation must retain the encounter return route');
  await tab(page, 'decks');
  assert.equal(await page.locator('.bag-draft-card').count(), 0, 'An empty unsaved draft must survive changing card tabs');
  await go(page, 'bag');
  assert.equal(await action(page, 'return-prep').count(), 1, 'Tapping the active card destination must preserve the preparation return route');
  assert.equal(await page.locator('.bag-draft-card').count(), 0);
  assert.deepEqual(await storage(page), beforePrep, 'An empty unsaved draft must not overwrite the saved deck');
  await page.locator('#bag-search').fill('');
  for (const uid of originalDeck) await action(page, 'bag-pick-instance', uid, '.bag-grid ').click();
  await action(page, 'bag-pick-instance', duplicateUID, '.bag-grid ').click();
  await action(page, 'bag-save-deck').click();
  await page.waitForFunction(({ key, uid }) => JSON.parse(localStorage.getItem(key)).deckSlots[0].instanceIds.includes(uid), { key: PROFILE_KEY, uid: duplicateUID });
  const edited = await read(page);
  assert(!edited.deckSlots[0].instanceIds.includes(originalUID));
  assert.deepEqual(edited.instances, fixture.instances, 'Deck preparation must preserve exact copy histories');
  await action(page, 'return-prep').click();
  await page.locator('.encounter-prep').waitFor();
  assert.match(await page.locator('.encounter-prep').innerText(), new RegExp(NODES[1].name));
  assert.equal((await read(page)).pending, null);
  await shot(page, 'navigation-preparation-desktop.png');
  await action(page, 'confirm-start').click();
  await page.locator('.player-hand').waitFor();
  const started = await read(page), savedBattle = await read(page, battleKey);
  assert.equal(started.pending.nodeId, NODES[1].id);
  assert.equal(started.pending.kind, 'expedition');
  assert.equal(started.pending.cardInstances.qingxiao, duplicateUID);
  assert.equal(started.coins, fixture.coins);
  assert.equal(started.dust, fixture.dust);
  assert.equal(await page.locator('.game-dock').count(), 0);
  passed('Preparation returns from the exact-copy deck editor to the same encounter and starts only on confirmation; battle hides global destinations');

  await page.locator('[data-action="battle-menu"]').click();
  await action(page, 'navigate-confirm').click();
  await page.locator('.game-lobby').waitFor();
  await action(page, 'lobby-deck').click();
  await action(page, 'bag-pick-instance', originalUID, '.bag-grid ').click();
  await action(page, 'bag-save-deck').click();
  await page.waitForFunction(({ key, uid }) => JSON.parse(localStorage.getItem(key)).deckSlots[0].instanceIds.includes(uid), { key: PROFILE_KEY, uid: originalUID });
  assert.deepEqual((await read(page)).pending, started.pending, 'Editing a saved deck must not replace the pending encounter or its captured UIDs');
  assert.deepEqual(await read(page, battleKey), savedBattle);
  await go(page, 'home');
  await action(page, 'resume').click();
  await page.locator('.player-hand').waitFor();
  assert.deepEqual((await read(page)).pending, started.pending);
  assert.deepEqual(await read(page, battleKey), savedBattle);
  await page.reload();
  await action(page, 'resume').click();
  await page.locator('.player-hand').waitFor();
  assert.deepEqual((await read(page)).pending, started.pending);
  assert.deepEqual(await read(page, battleKey), savedBattle);
  passed('Leave, edit active deck, resume and reload preserve the original pending ID, captured UIDs and battle snapshot');

  await page.locator('[data-action="battle-menu"]').click();
  await action(page, 'navigate-confirm').click();
  // A short viewport makes restoration exercise real scroll, not a trivial 0.
  await page.setViewportSize({ width: 1440, height: 500 });
  await go(page, 'bag');
  await page.locator('#bag-sort').selectOption('level');
  await page.locator('#bag-filter').selectOption('duplicates');
  await page.locator('#bag-search').fill('青霄');
  const copyButton = action(page, 'instance-inspect', duplicateUID, '.bag-grid ');
  await copyButton.scrollIntoViewIfNeeded();
  await copyButton.focus();
  const scrollBefore = await page.evaluate(() => scrollY);
  assert(scrollBefore > 0, 'Card-detail fixture must exercise a scrolled list');
  await page.keyboard.press('Enter');
  await page.locator('.bag-passport-id').waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#bag-search').inputValue(), '青霄');
  assert.equal(await page.locator('#bag-filter').inputValue(), 'duplicates');
  assert.equal(await page.locator('#bag-sort').inputValue(), 'level');
  assert.equal(await page.locator('.bag-item').count(), 2);
  assert.equal(await copyButton.evaluate(element => document.activeElement === element), true);
  assert(Math.abs(await page.evaluate(() => scrollY) - scrollBefore) <= 2, 'Closing card details preserves grid scroll');
  await tab(page, 'codex');
  await action(page, 'filter', 'moon').click();
  const catalogueButton = page.locator('.collection-item [data-action="inspect"]').last();
  await catalogueButton.scrollIntoViewIfNeeded();
  await catalogueButton.focus();
  const catalogueScroll = await page.evaluate(() => scrollY);
  assert(catalogueScroll > 0, 'Codex-detail fixture must exercise a scrolled list');
  await page.keyboard.press('Enter');
  await page.locator('.detail-rank').waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.collection-item').count(), CARDS.filter(card=>card.faction==='moon').length);
  assert.equal(await catalogueButton.evaluate(element => document.activeElement === element), true);
  assert(Math.abs(await page.evaluate(() => scrollY) - catalogueScroll) <= 2);
  passed('Owned-copy and codex details restore filter, scroll and keyboard focus without leaving the card destination');

  for (const { aim, finalNode = false } of [{ aim: 'win' }, { aim: 'lose' }, { aim: 'win', finalNode: true }]) {
    let seed = createProfile({ now: fixedNow });
    if (aim === 'win') for (const instance of seed.instances) seed = setInstanceXP(seed, instance.uid, 700);
    if (finalNode) {
      seed.cleared = NODES.slice(0, -1).map(node => node.id);
      seed.location = NODES.at(-1).id;
    }
    const duel = await seededPage(seed);
    await action(duel, 'continue-journey').click();
    await action(duel, 'confirm-start').click();
    await duel.locator('.player-hand').waitFor();
    await finishViaUI(duel, aim);
    assert.match(await duel.locator('.match-symbol').textContent(), aim === 'win' ? /勝/ : /悟/);
    const settled = await read(duel);
    assert.equal(settled.stats.played, 1);
    assert.equal(settled.pending, null);
    assert.equal(await read(duel, battleKey), null);
    if (aim === 'win') {
      if (finalNode) assert.match(await action(duel, 'next-encounter').textContent(), /重遊此境/);
      await action(duel, 'next-encounter').click();
    }
    else {
      assert.match(await action(duel, 'next-encounter').textContent(), /再戰此境/);
      await action(duel, 'result-deck').click();
      await duel.locator('.bag-deck-slots').waitFor();
      assert.deepEqual(await read(duel), settled, 'Opening the reward screen deck editor must not settle again');
      await action(duel, 'return-prep').click();
    }
    await duel.locator('.encounter-prep').waitFor();
    const expected = finalNode ? NODES.at(-1) : aim === 'win' ? NODES[1] : NODES[0];
    assert.match(await duel.locator('.encounter-prep').innerText(), new RegExp(expected.name));
    assert.deepEqual(await read(duel), settled, 'Continuing from rewards must neither settle twice nor start the next match implicitly');
    await action(duel, 'prep-deck').click();
    await action(duel, 'return-prep').click();
    await duel.locator('.encounter-prep').waitFor();
    assert.match(await duel.locator('.encounter-prep').innerText(), new RegExp(expected.name));
    assert.deepEqual(await read(duel), settled);
    await duel.reload();
    await duel.locator('.game-lobby').waitFor();
    assert.deepEqual(await read(duel), settled, 'Reload after rewards does not duplicate payouts');
  }
  passed('Real wins lead to the unlocked next encounter; losses retry and the final node stays in bounds; preparation, deck detours and reload do not duplicate rewards');

  for (const width of [360, 390]) {
    const phone = await seededPage(createProfile({ now: fixedNow }), width);
    await dockFits(phone);
    await shot(phone, `navigation-lobby-${width}.png`);
    for (const destination of ['world', 'arena', 'bag', 'market', 'home']) {
      await go(phone, destination);
      assert.equal(await phone.locator('.game-dock [aria-current="page"]').getAttribute('data-action'), destination);
      await noOverflow(phone, `${width}px ${destination}`);
      await dockFits(phone);
    }
    await action(phone, 'quests').first().click();
    await phone.locator('.quest-scroll').waitFor();
    await noOverflow(phone, `${width}px quests`);
    const beforeClaim = await read(phone);
    await action(phone, 'claim-login').click();
    await phone.waitForFunction(key => JSON.parse(localStorage.getItem(key)).daily.loginClaimed, PROFILE_KEY);
    assert.equal(await phone.locator('.quest-scroll').count(), 1);
    assert(await phone.evaluate(() => document.querySelector('.quest-scroll').contains(document.activeElement)), 'Claiming a reward must keep focus in the refreshed quest dialog');
    await phone.keyboard.press('Tab');
    assert(await phone.evaluate(() => document.querySelector('.quest-scroll').contains(document.activeElement)), 'Tab must remain inside the quest dialog after its focused claim button becomes disabled');
    assert((await read(phone)).coins > beforeClaim.coins);
    await phone.locator('.modal-close').click();
    await phone.locator('.game-lobby').waitFor();
    await action(phone, 'continue-journey').click();
    await shot(phone, `navigation-preparation-${width}.png`);
    await phone.locator('.modal-close').click();
    await go(phone, 'bag');
    await tab(phone, 'decks');
    await noOverflow(phone, `${width}px deck editor`);
    await tab(phone, 'codex');
    await noOverflow(phone, `${width}px codex`);
  }
  passed('360px and 390px navigation labels and tap targets fit; every destination, quests, deck editor, codex and preparation has no horizontal overflow');
  assert.deepEqual(errors, [], 'Browser errors or missing local assets');
  console.log(JSON.stringify({ ok: true, checks, screenshots, browserErrors: errors }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, passed: checks, browserErrors: errors, error: error.stack }, null, 2));
  process.exitCode = 1;
} finally {
  await Promise.allSettled(contexts.map(context => context.close()));
  await browser.close();
}
