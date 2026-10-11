/**
 * D1 Back model acceptance (docs/NAVIGATION.md#back-model) on a loopback server with
 * synthetic saves. Phone emulation: Chromium (installed Google Chrome) with Playwright's
 * Pixel 7 descriptor, then WebKit with its iPhone 15 descriptor. page.goBack() is the
 * browser's Back; every other input is a real click, tap or key press.
 *
 * Asserts: from each destination, a collection group, a card page, quests/settings/rules,
 * preparation (and its deck editor) and 旅程閣, each Back closes exactly one layer, with no
 * about:blank before the 洞府 root; a closed card page leaves the collection's page and
 * filter as they were; a seeded 30-step walk mixing ×, Escape, backdrop and Back keeps
 * history.length ≤ initial + 4; Back in a battle opens the keep/abandon menu without a
 * profile write; Back on a round or match result holds it, and the save equals exactly one
 * settlement computed here by the real rules; a reload mid-flow then Back writes and
 * settles nothing; the root hands Back to the browser without a prompt.
 * Headless engines only: physical Android Back gestures and iOS edge swipes are separate evidence.
 * Usage: GAME_URL=http://127.0.0.1:<port> [BROWSER=webkit] node tools/back-smoke.mjs
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { installViewportNavigation, viewportFrames, visibleViewportIds } from './viewport-browser-helpers.mjs';
import { createMatch, resolveRound } from '../engine.mjs';
import { createProfile, beginBattle, finishBattle, PROFILE_KEY } from '../progression.mjs';
import { mintInstance, syncCollection } from '../collection.mjs';
import { NAV_STATE_KEY } from '../nav-stack.mjs';

const browserName = process.env.BROWSER || 'chromium';
if (!['chromium', 'webkit'].includes(browserName)) throw Error('BROWSER must be chromium or webkit.');
const runtime = fileURLToPath(new URL('../test-results/webkit-runtime', import.meta.url));
if (browserName === 'webkit' && !process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(runtime)) process.env.PLAYWRIGHT_BROWSERS_PATH = runtime;
const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
if (!process.env.GAME_URL) throw Error('Set GAME_URL to the loopback server serving this checkout, e.g. GAME_URL=http://127.0.0.1:4177.');
const base = new URL(process.env.GAME_URL);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) throw Error('Back smoke requires a loopback GAME_URL.');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const deviceName = browserName === 'webkit' ? 'iPhone 15' : 'Pixel 7';
const device = engines.devices[deviceName];
const now = '2026-09-22T12:00:00.000Z', battleKey = 'shanhai.battle.v5', preferenceKey = 'shanhai.experience.v1';
const checks = [], errors = [], contexts = new Set();
const passed = label => { checks.push(label); console.log(`PASS ${label}`); };

// ── Fixtures: legal synthetic saves built with the real rules ──────────────────────
function journey() {
  let profile = createProfile({ now });
  // Twelve more 雲 copies so the filtered copy list pages on a phone.
  for (const cardId of ['qingxiao', 'yaoheng', 'xuanjian', 'kongzi']) for (let copy = 0; copy < 3; copy++) profile = mintInstance(profile, cardId, { now, source: 'back-fixture' }).profile;
  return syncCollection({ ...profile, coins: 5000, dust: 300 });
}
function battle({ opponentHP = 12 } = {}) {
  const started = beginBattle(createProfile({ now }), { kind: 'arena', now });
  const match = createMatch({ mode: 'arena', rng: () => 0.23 });
  match.player = { hp: 12, pills: 12, hand: ['yaoheng', 'qingxiao', 'yanxin', 'cangjiao'], used: [] };
  match.opponent = { hp: opponentHP, pills: 12, hand: ['yanxin', 'chiling', 'yaoheng', 'cuixian'], used: [] };
  match.initiative = 'opponent';
  return { started, match };
}
const battleSeed = ({ started, match }, aiMove, extra = {}) => ({
  profile: JSON.stringify(started.profile),
  battle: JSON.stringify({ match, encounter: started.encounter, selected: match.player.hand[0], pills: 0, fury: false, aiMove, revealPending: false, recorded: false, lastReward: null, ...extra }),
});
const opener = { cardId: 'yanxin', pills: 0, fury: false }, killing = { cardId: 'qingxiao', pills: 1, fury: true };
const playing = battle(), overkill = battle({ opponentHP: 1 });
const finished = resolveRound(overkill.match, killing, opener);
assert.equal(finished.status, 'finished');
const settled = finishBattle(overkill.started.profile, { encounterId: overkill.started.encounter.id, winner: finished.winner, playedCardIds: finished.player.used, now }).profile;
const FIXTURES = {
  journey: { profile: JSON.stringify(journey()), battle: null },
  playing: battleSeed(playing, opener),
  final: battleSeed(overkill, opener, { selected: killing.cardId, pills: killing.pills, fury: killing.fury }),
};
/** The fields a settlement changes; a second settlement would change them again. */
const settlementView = profile => ({
  coins: profile.coins, dust: profile.dust, xp: profile.xp, stats: profile.stats, arena: profile.arena,
  dailyMatches: profile.daily.matches, weeklyMatches: profile.weekly.matches, pending: profile.pending,
  copies: Object.fromEntries(profile.instances.map(instance => [instance.uid, [instance.level, instance.xp]])),
});

// ── Pages ───────────────────────────────────────────────────────────────────────
const browser = await engines[browserName].launch({ headless: true, ...(browserName === 'chromium' && existsSync(chrome) ? { executablePath: chrome } : {}) });
async function open(name) {
  const fixture = FIXTURES[name];
  const context = await browser.newContext({ ...device, reducedMotion: 'reduce' });
  contexts.add(context);
  await context.addInitScript(({ fixture, keys, now }) => {
    const NativeDate = Date, fixed = new NativeDate(now).getTime();
    globalThis.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } };
    Math.random = () => 0.23;
    let storage;
    try { storage = localStorage; } catch { return; } // about:blank after the root hands Back on
    if (!storage.getItem('back-smoke.seeded')) {
      storage.setItem('back-smoke.seeded', 'yes');
      storage.setItem(keys.profile, fixture.profile);
      if (fixture.battle) storage.setItem(keys.battle, fixture.battle);
      storage.setItem(keys.preferences, JSON.stringify({ sound: false, ambience: 0.35, effects: 0.6, motion: 'reduce', pace: 'fast' }));
    }
    const nativeSet = Storage.prototype.setItem;
    window.backSmokeProfileWrites = 0;
    Storage.prototype.setItem = function(key, value) { nativeSet.call(this, key, value); if (this === localStorage && key === keys.profile) window.backSmokeProfileWrites++; };
  }, { fixture, keys: { profile: PROFILE_KEY, battle: battleKey, preferences: preferenceKey }, now });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === base.origin && url.pathname === '/api/v1/account' && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: false, user: null, emailEnabled: true }) });
    }
    if (url.origin !== base.origin || url.pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method())) {
      errors.push(`Unexpected network ${request.method()} ${url.origin}${url.pathname}`); return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  const page = await context.newPage(); installViewportNavigation(page); page.setDefaultTimeout(12000);
  page.blanks = { expected: 0, unexpected: 0 }; page.leaving = false; page.dialogs = 0;
  page.on('framenavigated', frame => {
    if (frame !== page.mainFrame() || frame.url() !== 'about:blank') return;
    if (page.leaving) page.blanks.expected++; else page.blanks.unexpected++;
  });
  page.on('dialog', dialog => { page.dialogs++; dialog.dismiss().catch(() => {}); });
  page.on('pageerror', error => errors.push(`${name}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`${name} console: ${message.text()}`); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${new URL(response.url()).pathname}`); });
  await page.goto(base.href); await page.locator('.game-lobby').waitFor();
  return page;
}
async function release(page) { const context = page.context(); await context.close(); contexts.delete(context); }

/** What is on screen, read from the DOM alone: screen > sub-views > dialog. */
const describe = page => page.evaluate(() => {
  const screen = document.querySelector('#app .game-shell')?.className.match(/\bscreen-(\w+)/)?.[1] || 'none';
  const parts = [screen];
  if (document.querySelector('#app [data-action="return-prep"]')) parts.push('deck');
  if (document.querySelector('#app .bag-character-inventory')) parts.push('group');
  const dialog = document.querySelector('#overlay-root .modal');
  if (dialog) {
    const has = name => dialog.classList.contains(name), inside = selector => dialog.querySelector(selector);
    parts.push(has('quest-scroll') ? 'quests' : has('experience-settings') ? 'settings' : inside('.rules-grid') ? 'rules'
      : has('encounter-prep') ? 'prep' : has('instance-modal') ? 'instance' : has('codex-detail') ? 'codex-detail'
      : has('battle-reveal') ? 'round-result' : inside('.match-score') ? 'match-result'
      : inside('[data-action="abandon-navigate"]') ? 'leave' : 'dialog');
  }
  return parts.join('>');
});
/** Layers above the root, as the smoke counts them: a non-root screen, each sub-view, the dialog. */
const layerCount = description => {
  const [screen, ...rest] = description.split('>');
  return (screen === 'home' ? 0 : 1) + rest.reduce((total, part) => total + (part === 'deck' ? 2 : 1), 0);
};
const entryDepth = page => page.evaluate(key => history.state?.[key]?.depth ?? null, NAV_STATE_KEY);
const profileRaw = page => page.evaluate(key => localStorage.getItem(key), PROFILE_KEY);
const profileWrites = page => page.evaluate(() => window.backSmokeProfileWrites);
async function settle(page, description, depth = layerCount(description)) {
  await page.waitForFunction(({ description }) => {
    const screen = document.querySelector('#app .game-shell')?.className.match(/\bscreen-(\w+)/)?.[1];
    return screen && description.startsWith(screen);
  }, { description });
  // A guard row may re-arm onto more than one entry still ahead: [min, max].
  const [min, max] = Array.isArray(depth) ? depth : [depth, depth];
  await page.waitForFunction(({ key, min, max }) => { const value = history.state?.[key]?.depth; return value >= min && value <= max; }, { key: NAV_STATE_KEY, min, max }, { timeout: 4000 })
    .catch(async () => assert.fail(`${description}: history entry depth ${min}–${max} (now ${await entryDepth(page)})`));
  await viewportFrames(page);
  assert.equal(await describe(page), description);
}
/** The browser's Back: exactly one layer closes (or the guard row holds/opens its menu). */
async function back(page, description, depth) {
  const before = await describe(page);
  await page.goBack();
  await settle(page, description, depth);
  if (!['hold', 'menu'].includes(page.expectRow)) assert.equal(layerCount(description), layerCount(before) - 1, `Back from ${before} closes one layer, to ${description}`);
  assert.equal(page.blanks.unexpected, 0, `no about:blank before the root (at ${description})`);
}
async function backToRoot(page, path) {
  for (const [description, depth] of path) await back(page, description, depth);
  assert.equal(await describe(page), 'home');
  assert.equal(await entryDepth(page), 0);
}
const click = async (page, selector) => { await page.locator(selector).first().click(); };
async function tapPoint(page, x, y) { if (device.hasTouch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); }
/** A point on the dimmed backdrop outside the dialog, or null when the dialog covers the screen. */
const backdropPoint = page => page.evaluate(() => {
  const backdrop = document.querySelector('#overlay-root .modal-backdrop');
  for (const [x, y] of [[4, 4], [innerWidth - 4, 4], [4, innerHeight - 4], [innerWidth - 4, innerHeight - 4], [innerWidth / 2, 4], [innerWidth / 2, innerHeight - 4]]) {
    if (document.elementFromPoint(x, y) === backdrop) return { x, y };
  }
  return null;
});
async function leaveFromRoot(page, label) {
  assert.equal(await describe(page), 'home');
  const before = await profileRaw(page), writes = await profileWrites(page);
  page.leaving = true;
  await page.goBack();
  await page.waitForURL('about:blank');
  assert.equal(page.blanks.expected, 1, `${label}: one hand-off`);
  assert.equal(page.dialogs, 0, `${label}: no leave prompt`);
  page.blanks.expected = 0; page.leaving = false;
  await page.goForward();
  await page.locator('.game-lobby').waitFor();
  assert.equal(await profileRaw(page), before, `${label}: leaving and returning writes nothing`);
  return writes;
}

try {
  {
    const page = await open('journey'), start = await page.evaluate(() => history.length);
    const raw = await profileRaw(page);
    // From each of the five destinations (and the codex inside 藏卡), Back is 洞府.
    for (const destination of ['world', 'arena', 'bag', 'market']) {
      await click(page, `.game-dock [data-action="${destination}"]`); await settle(page, destination);
      await back(page, 'home');
    }
    await click(page, '.game-dock [data-action="bag"]'); await settle(page, 'bag');
    await click(page, '.cards-hub-tabs [data-action="cards-tab"][data-id="codex"]'); await settle(page, 'collection');
    assert.equal(await page.evaluate(() => history.length), start + 1, 'a tab change replaces the entry');
    await back(page, 'home');
    // Switching destinations replaces the entry; 洞府 in the dock walks back over it.
    for (const destination of ['world', 'arena', 'bag', 'market']) { await click(page, `.game-dock [data-action="${destination}"]`); await settle(page, destination); }
    await click(page, '.game-dock [data-action="home"]'); await settle(page, 'home');
    assert.equal(await page.evaluate(() => history.length), start + 1);
    passed(`${deviceName}: Back from 遊歷, 對弈, 藏卡, 市集 and the codex returns to 洞府; destination switches replace one entry`);

    // A collection group, then a card page inside it.
    await click(page, '.game-dock [data-action="bag"]'); await settle(page, 'bag');
    await click(page, '[data-action="bag-open-group"][data-id="qingxiao"]'); await settle(page, 'bag>group');
    await click(page, '.bag-character-copies [data-action="instance-inspect"]'); await settle(page, 'bag>group>instance');
    await backToRoot(page, [['bag>group'], ['bag'], ['home']]);
    passed(`${deviceName}: card page → collection group → 藏卡 → 洞府, one layer per Back`);

    // Closing a card page keeps the collection's page and filter.
    await click(page, '.game-dock [data-action="bag"]'); await settle(page, 'bag');
    await page.locator('[data-action="bag-layout"][data-id="copies"]').click(); await settle(page, 'bag');
    await page.locator('#bag-faction').selectOption('yun'); await settle(page, 'bag');
    await page.locator('[data-viewport-action="module"][data-viewport-target="cards"]').click(); await viewportFrames(page);
    const next = page.locator('[data-viewport-action="next"][data-viewport-list-id="cards"]');
    assert.ok(await next.count() && await next.isEnabled(), 'the filtered copy list has a second page on this phone');
    await next.click(); await viewportFrames(page);
    const list = page.locator('[data-viewport-list="cards"]');
    const pageIds = await visibleViewportIds(list);
    await list.locator(':scope > [data-viewport-id]').filter({ visible: true }).first().locator('[data-action="instance-inspect"]').first().click();
    await settle(page, 'bag>instance');
    await back(page, 'bag');
    assert.deepEqual(await visibleViewportIds(list), pageIds, 'the same page of copies is shown');
    assert.equal(await page.locator('#bag-faction').inputValue(), 'yun', 'the faction filter is kept');
    await page.locator('#bag-faction').selectOption('all'); await page.locator('[data-action="bag-layout"][data-id="groups"]').click(); await settle(page, 'bag');
    await back(page, 'home');
    passed(`${deviceName}: after Back closes a card page, the copy list's second page (${pageIds.join(', ')}) and faction filter are unchanged`);

    // Quests, settings and rules over 洞府; settings over a destination.
    await click(page, '.game-lobby [data-action="quests"]'); await settle(page, 'home>quests'); await back(page, 'home');
    await click(page, '.game-header [data-action="experience-settings"]'); await settle(page, 'home>settings'); await back(page, 'home');
    await click(page, '.game-lobby [data-action="rules"]'); await settle(page, 'home>rules'); await back(page, 'home');
    await click(page, '.game-dock [data-action="market"]'); await settle(page, 'market');
    await click(page, '.game-header [data-action="experience-settings"]'); await settle(page, 'market>settings');
    await backToRoot(page, [['market'], ['home']]);
    passed(`${deviceName}: quests, settings and rules close on Back without leaving 洞府`);

    // Preparation, its deck editor, and the lobby's two-layer continue.
    await click(page, '.game-dock [data-action="arena"]'); await settle(page, 'arena');
    await click(page, '[data-action="ranked"]'); await settle(page, 'arena>prep');
    await click(page, '.modal [data-action="prep-deck"]'); await settle(page, 'bag>deck', 3);
    await backToRoot(page, [['arena>prep'], ['arena'], ['home']]);
    await click(page, '.game-lobby [data-action="continue-journey"]'); await settle(page, 'world>prep');
    await backToRoot(page, [['world'], ['home']]);
    passed(`${deviceName}: deck editor → preparation → 對弈 → 洞府, and continue's 遊歷 + preparation pushed in one tap`);

    // 旅程閣 returns where it was opened.
    await click(page, '.game-header [data-action="account-open"]'); await settle(page, 'account', 1);
    await back(page, 'home');
    await click(page, '.game-dock [data-action="world"]'); await settle(page, 'world');
    await click(page, '.game-header [data-action="account-open"]'); await settle(page, 'account', 2);
    await page.goBack(); await settle(page, 'world'); assert.equal(page.blanks.unexpected, 0);
    await back(page, 'home');
    passed(`${deviceName}: 旅程閣 Back returns to the screen it was opened from`);

    // A seeded walk: ×, Escape, backdrop, Back, dock and openings mixed; history stays bounded.
    // The deck editor left 藏卡 on its decks tab; the walk opens groups from the cards tab.
    await click(page, '.game-dock [data-action="bag"]'); await settle(page, 'bag');
    await click(page, '.cards-hub-tabs [data-action="cards-tab"][data-id="cards"]'); await settle(page, 'bag');
    await back(page, 'home');
    let seed = 20261011;
    const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const pick = items => items[Math.floor(random() * items.length)];
    const used = { x: 0, escape: 0, backdrop: 0, back: 0, open: 0, backdropFallback: 0 };
    let groupOpen = false, maxLength = 0, maxLayers = 0; // 藏卡 remembers an open group across destinations
    const trail = [];
    let closes = 0;
    const startWalk = await page.evaluate(() => history.length);
    for (let step = 0; step < 30; step++) {
      const current = await describe(page), [screen] = current.split('>'), dialog = current.includes('>') && !['group'].includes(current.split('>').at(-1));
      let choice;
      if (dialog) choice = ['x', 'escape', 'backdrop', 'back'][closes++ % 4]; // every close kind, in turn
      else if (screen === 'home') choice = pick(['dock', 'dock', 'dock', 'dock', 'quests', 'rules', 'settings']);
      else if (current === 'bag') choice = pick(['group', 'group', 'group', 'back', 'settings']);
      else if (current === 'bag>group') choice = pick(['instance', 'instance', 'instance', 'back', 'settings', 'dock']);
      else choice = pick(['back', 'dock', 'settings']);
      if (choice === 'backdrop') {
        const point = await backdropPoint(page);
        if (point) { await tapPoint(page, point.x, point.y); used.backdrop++; }
        else { choice = 'x'; used.backdropFallback++; }
      }
      if (choice === 'x') { await click(page, '#overlay-root .modal-close'); used.x++; }
      if (choice === 'escape') { await page.keyboard.press('Escape'); used.escape++; }
      if (choice === 'back') { used.back++; }
      if (['dock', 'settings', 'quests', 'rules', 'group', 'instance'].includes(choice)) used.open++;
      let expected;
      if (['x', 'escape', 'backdrop'].includes(choice)) expected = current.split('>').slice(0, -1).join('>');
      if (choice === 'back') {
        const parts = current.split('>'); expected = parts.length > 1 ? parts.slice(0, -1).join('>') : 'home';
        if (current === 'bag>group') groupOpen = false;
        await back(page, expected);
      }
      if (choice === 'dock') { const destination = pick(['home', 'world', 'arena', 'bag', 'bag', 'bag', 'market']); await click(page, `.game-dock [data-action="${destination}"]`); expected = destination === 'bag' && groupOpen ? 'bag>group' : destination; }
      if (choice === 'settings') { await click(page, '.game-header [data-action="experience-settings"]'); expected = `${current}>settings`; }
      if (choice === 'quests') { await click(page, '.game-lobby [data-action="quests"]'); expected = 'home>quests'; }
      if (choice === 'rules') { await click(page, '.game-lobby [data-action="rules"]'); expected = 'home>rules'; }
      if (choice === 'group') { await click(page, '[data-action="bag-open-group"][data-id="qingxiao"]'); expected = 'bag>group'; groupOpen = true; }
      if (choice === 'instance') { await click(page, '.bag-character-copies [data-action="instance-inspect"]'); expected = `${current}>instance`; }
      if (choice !== 'back') await settle(page, expected);
      const length = await page.evaluate(() => history.length);
      // Bounded against the page's very first length, not just the walk's start.
      assert.ok(length <= start + 4, `step ${step} (${choice}): history.length ${length} ≤ ${start} + 4`);
      maxLength = Math.max(maxLength, length); maxLayers = Math.max(maxLayers, layerCount(expected)); trail.push(`${choice}→${expected}`);
    }
    for (let guard = 0; guard < 6 && await describe(page) !== 'home'; guard++) {
      const parts = (await describe(page)).split('>');
      if (parts.join('>') === 'bag>group') groupOpen = false;
      await back(page, parts.length > 1 ? parts.slice(0, -1).join('>') : 'home');
    }
    const walkLength = await page.evaluate(() => history.length);
    assert.ok(walkLength <= start + 4);
    assert.ok(used.x && used.escape && used.back && used.open, `the walk mixed every kind of step: ${JSON.stringify(used)}`);
    if (process.env.BACK_SMOKE_TRAIL) console.log(trail.join('\n'));
    assert.ok(maxLayers >= 3, `the walk reached three layers (${maxLayers})`);
    passed(`${deviceName}: 30-step walk ${JSON.stringify(used)}, up to ${maxLayers} layers; history.length ${start} on load, ${startWalk} before the walk, at most ${maxLength} (≤ ${start} + 4), ${walkLength} after Back reached 洞府`);

    // Reload mid-flow, then Back: the page opens at 洞府 and hands Back on, writing nothing.
    await click(page, '.game-dock [data-action="bag"]'); await settle(page, groupOpen ? 'bag>group' : 'bag');
    if (!groupOpen) { await click(page, '[data-action="bag-open-group"][data-id="qingxiao"]'); await settle(page, 'bag>group'); }
    await click(page, '.bag-character-copies [data-action="instance-inspect"]'); await settle(page, 'bag>group>instance');
    await page.reload(); await page.locator('.game-lobby').waitFor(); await settle(page, 'home');
    const writes = await profileWrites(page);
    await leaveFromRoot(page, 'reload mid-flow');
    assert.equal(writes, 1, 'only the startup write after the reload');
    await leaveFromRoot(page, 'root');
    assert.equal(page.blanks.unexpected, 0);
    assert.equal(JSON.parse(await profileRaw(page)).coins, JSON.parse(raw).coins);
    passed(`${deviceName}: reload mid-flow, then Back: 洞府 hands Back on past the earlier entries; the root leaves without a prompt and Forward returns`);
    await release(page);
  }

  {
    const page = await open('playing');
    await click(page, '.game-lobby [data-action="resume"]'); await settle(page, 'battle');
    const raw = await profileRaw(page), writes = await profileWrites(page);
    await click(page, '.game-header [data-action="rules"]'); await settle(page, 'battle>rules');
    await back(page, 'battle');
    page.expectRow = 'menu';
    await back(page, 'battle>leave', [1, 2]);
    page.expectRow = null;
    await back(page, 'battle');
    page.expectRow = 'menu';
    await back(page, 'battle>leave', [1, 2]);
    page.expectRow = null;
    assert.equal(await profileRaw(page), raw, 'profile bytes unchanged by Back in a battle');
    assert.equal(await profileWrites(page), writes, 'no profile write');
    assert.ok(JSON.parse(raw).pending, 'the battle is still pending');
    await click(page, '.modal [data-action="navigate-confirm"]'); await settle(page, 'home');
    assert.equal(await profileRaw(page), raw);
    assert.ok(await page.locator('.game-lobby [data-action="resume"]').count(), 'kept for later');
    passed(`${deviceName}: Back in a battle opens keep/abandon (twice), closes it in between, writes nothing; keep returns to 洞府`);
    await release(page);
  }

  {
    const page = await open('final');
    await click(page, '.game-lobby [data-action="resume"]'); await settle(page, 'battle');
    const beforeWrites = await profileWrites(page);
    await click(page, '.battle-table [data-action="commit"]'); await settle(page, 'battle>round-result');
    const after = await profileRaw(page);
    assert.equal(await profileWrites(page), beforeWrites + 1, 'one settlement write');
    assert.deepEqual(settlementView(JSON.parse(after)), settlementView(settled), 'coins, XP and counters equal exactly one settlement');
    page.expectRow = 'hold';
    await back(page, 'battle>round-result', 2);
    await back(page, 'battle>round-result', 2);
    page.expectRow = null;
    await click(page, '.modal [data-action="next-round"]'); await settle(page, 'battle>match-result');
    page.expectRow = 'hold';
    await back(page, 'battle>match-result', 2);
    await back(page, 'battle>match-result', 2);
    page.expectRow = null;
    assert.equal(await profileRaw(page), after, 'Back on a result writes nothing');
    assert.equal(await profileWrites(page), beforeWrites + 1);
    passed(`${deviceName}: Back holds the round and match results; the save equals exactly one settlement (+${settled.coins - overkill.started.profile.coins} coins, played ${settled.stats.played})`);

    await page.reload(); await page.locator('.game-lobby').waitFor(); await settle(page, 'home');
    await leaveFromRoot(page, 'reload on a match result');
    assert.deepEqual(settlementView(JSON.parse(await profileRaw(page))), settlementView(settled), 'still exactly one settlement after reload, Back and Forward');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), battleKey), null, 'no battle snapshot to settle again');
    passed(`${deviceName}: reload on a match result, then Back and Forward: nothing settles again`);
    await release(page);
  }

  assert.deepEqual(errors, []);
  console.log(`Back smoke (${browserName}, ${deviceName}): ${checks.length} checks passed.`);
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  await browser.close();
}
