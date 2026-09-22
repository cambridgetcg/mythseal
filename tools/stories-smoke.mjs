/** Four-world and weekly-quest integration using isolated saves and local API fixtures. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createProfile, hydrateProfile, PROFILE_KEY } from '../progression.mjs';
import { setInstanceXP } from '../collection.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.GAME_URL || 'http://127.0.0.1:4177', origin = new URL(base).origin;
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname)) throw Error('Stories smoke requires a loopback game server.');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = fileURLToPath(new URL('../test-results/', import.meta.url));
const fixedNow = '2026-09-22T12:00:00Z', battleKey = 'shanhai.battle.v4', recoveryKey = 'shanhai.profile.recovery.v4';
const checks = [], screenshots = [], errors = [], blockedExternal = new Set(), contexts = new Set();
const action = (page, name, id, prefix = '') => page.locator(`${prefix}[data-action="${name}"]${id ? `[data-id="${id}"]` : ''}`);
const go = (page, destination) => action(page, destination, null, '.game-dock ').click();
const read = (page, key = PROFILE_KEY) => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const passed = label => { checks.push(label); console.log(`PASS ${label}`); };
const snapshot = profile => ({ format: 'mythseal.offline-journey', version: profile.version===3?1:2, profile: structuredClone(profile) });
const idleAccount = page => page.locator('.account-shell[aria-busy="false"]').waitFor();
// Deliberately literal acceptance data: tests must notice accidental chapter
// removal, cross-world unlocking, deck mixing or reward formula changes.
const worlds = [
  { id: 'shanhai', nodes: ['mist-gate', 'jade-forest', 'ember-pass', 'moon-lake', 'sky-palace', 'sea-throne'] },
  { id: 'westward', nodes: ['west-flower-mountain', 'west-yellow-wind', 'west-flaming-mountain', 'west-spirit-mountain'], names: ['花果山', '黃風嶺', '火焰山', '靈山雲階'], deck: ['wukong', 'yanxin', 'cangjiao', 'cuixian', 'duying', 'yunya', 'yaoheng', 'kongzi'] },
  { id: 'investiture', nodes: ['gods-chentang', 'gods-kunlun', 'gods-western-qi', 'gods-muye'], names: ['陳塘海口', '昆崙雲臺', '西岐營火', '牧野長風'], deck: ['nezha', 'yanxin', 'chiling', 'qingxiao', 'yaoheng', 'kongzi', 'xuanjian', 'cuixian'] },
  { id: 'white-snake', nodes: ['snake-broken-bridge', 'snake-herbal-lane', 'snake-golden-mountain', 'snake-thunder-pagoda'], names: ['西湖斷橋', '藥香長巷', '金山潮寺', '雷峰暮塔'], deck: ['shuangli', 'duying', 'zhimeng', 'lindaiyu', 'wangxifeng', 'yaoheng', 'kongzi', 'yunya'] },
];
const weeklyZero = { week: '2026-09-21', matches: 0, expeditionWins: 0, arenaMatches: 0, claimedTasks: [] };
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });

function seasoned() {
  let profile = createProfile({ now: fixedNow });
  for (const instance of profile.instances) profile = setInstanceXP(profile, instance.uid, 700);
  profile.cleared = ['mist-gate'];
  return profile;
}

async function openPage(seed, { width = 1440, authenticated = false, backup = null } = {}) {
  const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 1000 }, reducedMotion: 'reduce', ...(width < 600 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : {}) });
  contexts.add(context);
  await context.addInitScript(({ seed, profileKey, now }) => {
    const NativeDate = Date, fixed = new NativeDate(now).getTime();
    globalThis.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } };
    Math.random = () => 0.23;
    if (!localStorage.getItem('stories-smoke.seeded')) {
      localStorage.setItem('stories-smoke.seeded', 'true');
      localStorage.setItem(profileKey, JSON.stringify(seed));
      localStorage.setItem('shanhai.experience.v1', JSON.stringify({ sound: false, ambience: .35, effects: .6, motion: 'reduce', pace: 'fast' }));
    }
  }, { seed, profileKey: seed.version===3?'shanhai.profile.v3':PROFILE_KEY, now: fixedNow });
  const api = { authenticated, revision: backup ? 1 : 0, backup: backup ? { revision: 1, updatedAt: fixedNow, snapshot: backup } : null, calls: [] };
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin) { blockedExternal.add(url.origin); return route.abort('blockedbyclient'); }
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const method = request.method(), path = url.pathname;
    let body = null; try { body = request.postDataJSON(); } catch {}
    api.calls.push({ method, path, body: structuredClone(body) });
    const reply = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
    if (path === '/api/v1/account' && method === 'GET') return reply({ authenticated, user: authenticated ? { id: 'stories-fixture', email: 'stories@example.test' } : null, emailEnabled: false, journeyVersions:[1,2] });
    if (['/api/v1/journey','/api/v2/journey'].includes(path) && authenticated) {
      if (method === 'GET') return reply(api.backup?.snapshot.version===(path.includes('/v2/')?2:1)?{backup:api.backup,revision:api.revision}:{backup:null,revision:0});
      if (method === 'PUT') {
        assert.equal(body.expectedRevision, api.revision);
        api.revision++;
        api.backup = { revision: api.revision, updatedAt: fixedNow, snapshot: body.snapshot };
        return reply({ backup: api.backup, revision: api.revision });
      }
    }
    errors.push(`Unexpected mock API call ${method} ${path}`);
    return reply({ error: { code: 'unexpected_fixture_route' } }, 404);
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && new URL(response.url()).origin === origin) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(base);
  await page.locator('.game-lobby').waitFor();
  return { page, api };
}
async function release(page) { const context = page.context(); await context.close(); contexts.delete(context); }
async function noOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth, dialogs: [...document.querySelectorAll('.modal')].map(element => [element.clientWidth, element.scrollWidth]) }));
  assert(dimensions.document <= dimensions.width + 1 && dimensions.dialogs.every(([width, scroll]) => scroll <= width + 1), `${label}: ${JSON.stringify(dimensions)}`);
}
async function shot(page, name) {
  await noOverflow(page, name);
  await page.evaluate(async () => {
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
    const urls = new Set([...document.querySelectorAll('*')].flatMap(element => [...getComputedStyle(element).backgroundImage.matchAll(/url\(["']?(https?:[^"')]+)["']?\)/g)].map(match => match[1])));
    await Promise.all([...urls].map(url => { const image = new Image(); image.src = url; return image.decode().catch(() => {}); }));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.screenshot({ path: output + name, fullPage: true }); screenshots.push(name);
}

// The pilot chooses legal moves in the test harness. The application still
// commits each round and settles the accepted real-engine result itself.
async function playRound(page, aim = 'win') {
  const move = await page.evaluate(async ({ key, aim }) => {
    const { chooseAIMove, resolveRound } = await import('./engine.mjs');
    const saved = JSON.parse(localStorage.getItem(key)), state = saved.match;
    let best;
    for (const cardId of state.player.hand.filter(id => !state.player.used.includes(id))) {
      const opponentMove = saved.aiMove || chooseAIMove(state, () => .23, cardId);
      for (const fury of [false, true]) for (let pills = 0; pills <= state.player.pills - (fury ? 3 : 0); pills++) {
        const next = resolveRound(state, { cardId, fury, pills }, opponentMove);
        const score = (next.status === 'finished' ? next.winner === 'player' ? 1000 : next.winner === 'draw' ? 0 : -1000 : 0) + (next.player.hp - next.opponent.hp) * 10 + next.player.pills * .7 - next.opponent.pills * .3;
        if (!best || (aim === 'win' ? score > best.score : score < best.score)) best = { cardId, fury, pills, score };
      }
    }
    return best;
  }, { key: battleKey, aim });
  await action(page, 'select', move.cardId, '.player-hand ').click();
  if ((await action(page, 'fury').getAttribute('aria-pressed') === 'true') !== move.fury) await action(page, 'fury').click();
  await page.locator('#pill-slider').fill(String(move.pills));
  await action(page, 'commit').click();
  await page.locator('.battle-reveal[data-phase="complete"]').waitFor();
}
async function finishViaUI(page, aim = 'win') {
  for (let round = 0; round < 4; round++) {
    if (!await page.locator('.battle-reveal').count()) await playRound(page, aim);
    const finished = (await action(page, 'next-round').textContent()).includes('對局結果');
    await action(page, 'next-round').click();
    if (finished) { await page.locator('.match-score').waitFor(); return; }
  }
  throw Error('Match did not finish within four rounds.');
}

async function selectWorld(page, world) {
  await action(page, 'world-select', world.id, '.story-world-switcher ').click();
  assert.equal(await action(page, 'world-select', world.id).getAttribute('aria-pressed'), 'true');
  assert.deepEqual(await page.locator('.map-pin').evaluateAll(elements => elements.map(element => element.dataset.id)), world.nodes);
}
async function startStory(page, world, index = 0) {
  await go(page, 'world'); await selectWorld(page, world);
  await action(page, 'map-select', world.nodes[index]).click();
  const before = await read(page);
  await action(page, 'travel', world.nodes[index]).click();
  await page.locator('.encounter-prep').waitFor();
  assert.match(await page.locator('.encounter-prep').innerText(), new RegExp(world.names[index]));
  assert.deepEqual(await read(page), before, 'Preparing a story must not charge or start it');
  await action(page, 'confirm-start').click(); await page.locator('.player-hand').waitFor();
  const save = await read(page, battleKey);
  assert.equal(save.encounter.nodeId, world.nodes[index]);
  assert.equal(save.match.mode, 'expedition');
  assert(save.match.opponent.hand.every(id => world.deck.includes(id)), 'Story opponent must draw from its own thematic deck');
  assert.equal(await page.locator('.game-shell.is-mist-gate').count(), 0);
}
function assertReward(before, after, { coins, dust, xp }) {
  for (const [field, delta] of Object.entries({ coins, dust, xp })) assert.equal(after[field] - before[field], delta, `${field} reward`);
  assert.equal(after.stats.played, before.stats.played + 1);
  assert.equal(after.pending, null);
}

try {
  const fresh = createProfile({ now: fixedNow });
  const { page: locked } = await openPage(fresh);
  await go(locked, 'world');
  assert.deepEqual(await locked.locator('.story-world-switcher [data-action="world-select"]').evaluateAll(elements => elements.map(element => element.dataset.id)), worlds.map(world => world.id));
  for (const world of worlds) {
    await selectWorld(locked, world);
    for (const nodeId of world.nodes) {
      await action(locked, 'map-select', nodeId).click();
      assert.equal(await action(locked, 'travel', nodeId).isDisabled(), nodeId !== 'mist-gate');
    }
  }
  assert.deepEqual(await read(locked), fresh, 'Browsing any locked chapter leaves the entire save intact');
  await release(locked);
  passed('Four literal maps expose 6/4/4/4 stages; a new journey can start only Mist Gate, and browsing locked chapters never changes its save');

  const legacy = seasoned(); delete legacy.weekly; delete legacy.wx01;legacy.version=3;legacy.collectionVersion=1;legacy.collectionExpansion=1;
  for(const instance of legacy.instances)delete instance.printId;
  legacy.inventory=Object.fromEntries(Object.entries(legacy.inventory).filter(([id])=>!['tangsanzang','bailong','guanyin','puti','honghaier','huangfeng','jinjiao','baigu','tieshan','yinjiao','liuer','bajie','wujing','niumowang','zhenyuan'].includes(id)));
  legacy.levels=Object.fromEntries(Object.entries(legacy.levels).filter(([id])=>id in legacy.inventory));
  legacy.coins = 2345; legacy.dust = 87; legacy.xp = 432;
  legacy.daily.loginClaimed = true; legacy.daily.claimedTasks = ['pack']; legacy.daily.packs = 1;
  const { page: migrated } = await openPage(legacy);
  const upgraded = await read(migrated), { weekly: upgradedWeekly, ...oldFields } = upgraded;
  const {weekly:expectedWeekly,...expectedFields}=hydrateProfile(legacy,{now:fixedNow});
  assert.deepEqual(oldFields, expectedFields, 'Missing-weekly legacy migration preserves fields and upgrades printing metadata');
  assert.equal(await migrated.evaluate(()=>localStorage.getItem('shanhai.profile.v3')),JSON.stringify(legacy));
  assert.deepEqual(upgradedWeekly, weeklyZero);
  await go(migrated, 'world');
  for (const world of worlds.slice(1)) {
    await selectWorld(migrated, world);
    for (let index = 0; index < world.nodes.length; index++) {
      await action(migrated, 'map-select', world.nodes[index]).click();
      assert.equal(await action(migrated, 'travel', world.nodes[index]).isDisabled(), index > 0);
    }
  }
  assert.deepEqual(await read(migrated), upgraded);
  await migrated.reload(); await migrated.locator('.game-lobby').waitFor();
  assert.deepEqual(await read(migrated), upgraded);
  await release(migrated);
  passed('A pre-weekly save preserves all currency, daily claims, cards and decks; Mist Gate independently unlocks the first chapter of each new world');

  let questPage, questFixture;
  for (const world of worlds.slice(1)) {
    const seed = seasoned();
    if (world.id === 'westward') seed.weekly = { ...weeklyZero, matches: 9, expeditionWins: 4, arenaMatches: 4 };
    const { page } = await openPage(seed);
    await startStory(page, world);
    if (world.id === 'westward') {
      await playRound(page);
      const saved = await read(page, battleKey), pending = await read(page);
      await page.reload(); await action(page, 'resume').click();
      await page.locator('.battle-reveal').waitFor();
      assert.deepEqual(await read(page, battleKey), saved, 'Reload resumes the accepted story round without changing its snapshot');
      assert.deepEqual(await read(page), pending);
      await action(page, 'next-round').click(); await page.locator('.player-hand').waitFor();
      const beforeDetour = await read(page, battleKey), profileBeforeDetour = await read(page);
      await action(page, 'battle-menu').click();
      await action(page, 'navigate-confirm', 'home').click();
      await go(page, 'world'); await selectWorld(page, worlds[3]);
      assert.equal(await action(page, 'world-select', 'white-snake').getAttribute('aria-pressed'), 'true');
      await action(page, 'resume', null, '.resume-banner ').click();
      await page.locator('.player-hand').waitFor();
      assert.deepEqual(await read(page, battleKey), beforeDetour, 'Browsing another world must not change the resumed encounter or moves');
      assert.deepEqual(await read(page), profileBeforeDetour);
    }
    await finishViaUI(page);
    assert.match(await page.locator('.match-symbol').innerText(), /勝/);
    const won = await read(page);
    assertReward(seed, won, { coins: 370, dust: 18, xp: 120 });
    assert.deepEqual(won.cleared, ['mist-gate', world.nodes[0]]);
    assert.equal(won.daily.matches, seed.daily.matches + 1);
    assert.equal(won.daily.expeditionWins, seed.daily.expeditionWins + 1);
    assert.equal(won.weekly.matches, seed.weekly.matches + 1);
    assert.equal(won.weekly.expeditionWins, seed.weekly.expeditionWins + 1);
    if (world.id === 'westward') {
      await action(page, 'world', null, '.match-return ').click();
      assert.equal(await action(page, 'world-select', 'westward').getAttribute('aria-pressed'), 'true', 'Result map returns to the resumed encounter world, not the intervening browsed world');
      assert.equal(await page.locator('.map-pin.active').getAttribute('data-id'), world.nodes[0]);
      await action(page, 'map-select', world.nodes[1]).click();
      await action(page, 'travel', world.nodes[1]).click();
    } else await action(page, 'next-encounter').click();
    assert.match(await page.locator('.encounter-prep').innerText(), new RegExp(world.names[1]));
    assert.deepEqual(await read(page), won, 'Next chapter opens preparation without awarding or starting again');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.map-pin.active').getAttribute('data-id'), world.nodes[1]);
    await page.reload(); await page.locator('.game-lobby').waitFor();
    assert.deepEqual(await read(page), won);
    if (world.id === 'westward') {
      await startStory(page, world); await finishViaUI(page);
      const repeated = await read(page);
      assertReward(won, repeated, { coins: 100, dust: 3, xp: 40 });
      assert.deepEqual(repeated.cleared, won.cleared);
      assert.deepEqual(repeated.daily.expeditionCaches, won.daily.expeditionCaches);
      await shot(page, 'stories-first-clear-repeat-desktop.png');
      await action(page, 'end-home').click(); questPage = page; questFixture = repeated;
    } else await release(page);
  }
  passed('Real wins in all three stories use their own decks and next chapter; reload and leave/browse-another-world/resume preserve the encounter and result map; replay pays only the repeat reward');

  const whiteSnake = worlds[3], finalSeed = seasoned();
  finalSeed.cleared = ['mist-gate', ...whiteSnake.nodes.slice(0, 3)]; finalSeed.location = whiteSnake.nodes[3];
  const { page: last } = await openPage(finalSeed);
  await startStory(last, whiteSnake, 3); await finishViaUI(last);
  assert.match(await last.locator('.match-symbol').innerText(), /勝/);
  const finalSave = await read(last);
  await action(last, 'next-encounter').click();
  assert.match(await last.locator('.encounter-prep').innerText(), /雷峰暮塔/);
  assert.deepEqual(await read(last), finalSave);
  await release(last);
  const lossSeed = createProfile({ now: fixedNow }); lossSeed.cleared = ['mist-gate'];
  const { page: loss } = await openPage(lossSeed);
  await startStory(loss, worlds[1]); await finishViaUI(loss, 'lose');
  assert.match(await loss.locator('.match-symbol').innerText(), /悟/);
  const lost = await read(loss);
  assert.deepEqual(lost.cleared, ['mist-gate']);
  await action(loss, 'next-encounter').click();
  assert.match(await loss.locator('.encounter-prep').innerText(), /花果山/);
  assert.deepEqual(await read(loss), lost);
  await release(loss);
  passed('The final chapter remains in its own world after victory; a real loss unlocks nothing and offers the same chapter again without duplicate settlement');

  await action(questPage, 'quests', null, '.game-lobby ').click();
  await action(questPage, 'quest-tab', 'daily').click();
  assert.equal(await action(questPage, 'claim-task', 'expedition').isDisabled(), false);
  await action(questPage, 'claim-task', 'expedition').click();
  await questPage.waitForFunction(key => JSON.parse(localStorage.getItem(key)).daily.claimedTasks.includes('expedition'), PROFILE_KEY);
  const dailyClaimed = await read(questPage);
  assert.equal(dailyClaimed.coins, questFixture.coins + 120); assert.equal(dailyClaimed.dust, questFixture.dust + 8); assert.equal(dailyClaimed.xp, questFixture.xp + 40);
  assert.equal(await action(questPage, 'claim-task', 'expedition').isDisabled(), true);
  questFixture = dailyClaimed;
  await action(questPage, 'quest-tab', 'weekly').click();
  const weeklyBefore = await read(questPage);
  assert.deepEqual(weeklyBefore, questFixture, 'Changing quest tabs does not change progress');
  assert.equal(await action(questPage, 'claim-weekly-task', 'arena').isDisabled(), true);
  for (const id of ['matches', 'expedition']) {
    assert.equal(await action(questPage, 'claim-weekly-task', id).isDisabled(), false);
    await action(questPage, 'claim-weekly-task', id).click();
    await questPage.waitForFunction(({ key, id }) => JSON.parse(localStorage.getItem(key)).weekly.claimedTasks.includes(id), { key: PROFILE_KEY, id });
    assert.equal(await action(questPage, 'claim-weekly-task', id).isDisabled(), true);
  }
  const claimed = await read(questPage);
  assert.equal(claimed.coins, weeklyBefore.coins + 650); assert.equal(claimed.dust, weeklyBefore.dust + 45); assert.equal(claimed.xp, weeklyBefore.xp + 180);
  assert.deepEqual(claimed.daily, weeklyBefore.daily);
  await questPage.reload(); await questPage.locator('.game-lobby').waitFor();
  assert.deepEqual(await read(questPage), claimed);
  passed('Actual story wins advance daily and weekly counters once; weekly match/expedition claims pay their literal rewards once and survive reload without changing daily claims');

  await go(questPage, 'arena');
  assert.match(await questPage.locator('main').innerText(), /AI/);
  for (const mode of ['pvp', 'ranked']) {
    const future = questPage.locator(`.arena-future [data-mode="${mode}"]`);
    assert.match(await future.innerText(), /未開放/);
    assert.equal(await future.locator('a[href], button:not(:disabled), [data-action]').count(), 0, 'Future online mode must offer no playable action');
  }
  await action(questPage, 'ranked').click(); await action(questPage, 'confirm-start').click();
  await questPage.locator('.player-hand').waitFor();
  assert.equal((await read(questPage, battleKey)).match.mode, 'arena');
  await finishViaUI(questPage);
  const arenaDone = await read(questPage);
  assert.equal(arenaDone.weekly.arenaMatches, 5); assert.equal(arenaDone.weekly.matches, claimed.weekly.matches + 1);
  await action(questPage, 'end-home').click();
  await action(questPage, 'quests', null, '.game-lobby ').click(); await action(questPage, 'quest-tab', 'weekly').click();
  await action(questPage, 'claim-weekly-task', 'arena').click();
  await questPage.waitForFunction(key => JSON.parse(localStorage.getItem(key)).weekly.claimedTasks.includes('arena'), PROFILE_KEY);
  const allClaimed = await read(questPage);
  assert.equal(allClaimed.coins, arenaDone.coins + 250); assert.equal(allClaimed.dust, arenaDone.dust + 15); assert.equal(allClaimed.xp, arenaDone.xp + 70);
  await release(questPage);
  passed('AI arena remains playable and increments its weekly counter once; the fifth AI match unlocks the arena claim while online modes stay unavailable');

  const restoredOld = { ...legacy, coins: 7654 };
  const { page: account, api } = await openPage(allClaimed, { authenticated: true, backup: snapshot(restoredOld) });
  await action(account, 'account-open').click(); await idleAccount(account);
  assert.deepEqual(await read(account), allClaimed);
  await action(account, 'account-confirm-restore').click(); await account.locator('.account-confirmation').waitFor();
  assert.deepEqual(await read(account), allClaimed);
  await action(account, 'account-restore').click(); await idleAccount(account);
  assert.deepEqual(await read(account), hydrateProfile(restoredOld,{now:fixedNow}));
  assert.deepEqual((await read(account, recoveryKey)).snapshot, snapshot(allClaimed));
  assert.deepEqual(api.backup.snapshot, snapshot(restoredOld), 'Restoring old cloud data never rewrites it remotely');
  api.revision++;
  api.backup = { revision: api.revision, updatedAt: fixedNow, snapshot: snapshot(allClaimed) };
  await action(account, 'account-refresh').click(); await idleAccount(account);
  await action(account, 'account-confirm-restore').click(); await account.locator('.account-confirmation').waitFor();
  await action(account, 'account-restore').click(); await idleAccount(account);
  assert.deepEqual(await read(account), allClaimed, 'Weekly counters, claims and branched clears survive cloud restore');
  await action(account, 'account-upload').click(); await idleAccount(account);
  assert.deepEqual(api.backup.snapshot, snapshot(allClaimed));
  assert.equal(api.calls.filter(call => call.method === 'PUT').length, 1);
  await release(account);
  passed('Explicit local-stub account restore accepts an old snapshot without weekly state, preserves a recovery copy, and round-trips new branch progress and weekly claims exactly');

  for (const width of [360, 390, 1440]) {
    const { page } = await openPage(allClaimed, { width });
    await go(page, 'world');
    for (const world of worlds) {
      await selectWorld(page, world);
      if (world.id === 'westward') {
        await action(page, 'map-select', world.nodes[0]).click();
        const before = await read(page);
        await action(page, 'travel', world.nodes[0]).click(); await page.locator('.story-arrival').waitFor();
        const close = page.locator('.encounter-prep > .modal-close'), box = await close.boundingBox();
        assert(box.width >= 44 && box.height >= 44, `${width}px story preparation close target remains 44px`);
        await close.click();
        await page.locator('.encounter-prep').waitFor({ state: 'detached' });
        assert.deepEqual(await read(page), before, 'Actual close click dismisses preparation without changing the journey');
      }
      await shot(page, `stories-${world.id}-${width}.png`);
    }
    await go(page, 'home'); await action(page, 'quests', null, '.game-lobby ').click();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await action(page, 'quest-tab', 'daily').focus();
    for (const [key, selected] of [['ArrowRight', 'weekly'], ['Home', 'daily'], ['End', 'weekly']]) {
      await page.keyboard.press(key);
      assert.equal(await action(page, 'quest-tab', selected).getAttribute('aria-selected'), 'true');
      assert.equal(await action(page, 'quest-tab', selected).getAttribute('tabindex'), '0');
      assert.equal(await action(page, 'quest-tab', selected === 'daily' ? 'weekly' : 'daily').getAttribute('tabindex'), '-1');
      assert.equal(await action(page, 'quest-tab', selected).evaluate(element => element === document.activeElement), true, `${key} moves tab selection and focus together`);
    }
    for (const id of ['daily', 'weekly']) {
      await action(page, 'quest-tab', id).click();
      assert.equal(await action(page, 'quest-tab', id).getAttribute('aria-selected'), 'true');
      await shot(page, `stories-quests-${id}-${width}.png`);
    }
    await page.keyboard.press('Escape'); await go(page, 'arena');
    await shot(page, `stories-arena-${width}.png`);
    await release(page);
  }
  passed('360px, 390px and desktop maps/quests/arena fit without overflow; actual 44px preparation close works and ArrowRight/Home/End move quest-tab selection, roving tabindex and focus together');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, checks, screenshots, browserErrors: errors, blockedExternal: [...blockedExternal], evidence: 'Isolated loopback Chrome; real game moves and local fixture account API. No hosted services or physical-device verification.' }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, passed: checks, screenshots, browserErrors: errors, error: error.stack }, null, 2));
  process.exitCode = 1;
} finally {
  await Promise.allSettled([...contexts].map(context => context.close()));
  await browser.close();
}
