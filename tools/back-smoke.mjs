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
 * settles nothing; the root hands Back to the browser without a prompt; a reload walks
 * back to the tab's first game entry, so six reloads with two layers open keep
 * history.length ≤ initial + 2, and in a popup where the game is the tab's first entry
 * the first Back at 洞府 after a reload finds nothing left to step through (the system
 * would close the tab or return to the opener); Back into the game from a page opened in
 * the same tab (a new load, not a bfcache restore) still leaves that page one Forward
 * away; and when a finished match's settlement fails on resume, Back closes the pending
 * dialog, then the battle layer, then leaves, writing nothing. Chromium only: with the
 * bfcache on (a second browser without --disable-back-forward-cache, production's
 * Cache-Control), a restore on the entry Forward left from, whichever load wrote it,
 * walks back to 洞府 once, and the next Back leaves the game.
 * With D2 (save durability) merged: the file import's dialog, opened from the new journey's
 * restore offer or from 旅程閣, is one Back layer even when the file arrives after the tap's
 * activation has expired, and Back closes it with no profile write; the offer's 雲端旅程 is
 * 旅程閣 and Back returns; while a confirmed import waits for the profile lock, Back (and
 * Escape) hold its dialog, and the import then lands exactly once; a backup prompt shown
 * after a win is a lobby strip, not a layer, so Back at 洞府 still leaves in one step; and
 * 復原上次本機旅程, which shares that lock, holds the same way while written, then closes
 * only its own dialog, so 匯入旅程備份 afterwards keeps the file picked in it. 恢復雲端旅程,
 * reached from the offer's 雲端旅程 (fixture API), is not held: Back leaves 旅程閣 while it
 * reads the cloud, and when it lands 洞府 shows the restored journey, without the offer.
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
import { createSnapshot, fingerprintProfile } from '../cloud-save.mjs';
import { PROFILE_LOCK, RECOVERY_KEY } from '../profile-store.mjs';
import { SAVES_KEY } from '../save-status.mjs';

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
  // No journey stored: the game starts one and offers a restore (D2).
  fresh: { profile: null, battle: null },
  playing: battleSeed(playing, opener),
  final: battleSeed(overkill, opener, { selected: killing.cardId, pills: killing.pills, fury: killing.fury }),
  // As commitMove persists the final round before its settlement is saved.
  unsettled: battleSeed({ ...overkill, match: finished }, null, { selected: killing.cardId, pills: killing.pills, fury: killing.fury, revealPending: true }),
};
/** The fields a settlement changes; a second settlement would change them again. */
const settlementView = profile => ({
  coins: profile.coins, dust: profile.dust, xp: profile.xp, stats: profile.stats, arena: profile.arena,
  dailyMatches: profile.daily.matches, weeklyMatches: profile.weekly.matches, pending: profile.pending,
  copies: Object.fromEntries(profile.instances.map(instance => [instance.uid, [instance.level, instance.xp]])),
});

// ── Pages ───────────────────────────────────────────────────────────────────────
const browser = await engines[browserName].launch({ headless: true, ...(browserName === 'chromium' && existsSync(chrome) ? { executablePath: chrome } : {}) });
/** hosting/_headers: production lets the bfcache keep the game; the loopback server sends no-store. */
const PRODUCTION_CACHE = 'public, max-age=0, must-revalidate';
/** from: the browser; cache: a Cache-Control to serve instead of no-store; via: a page the tab opens before the game. */
/** api: a fixture handler for this origin's /api/ requests (by default, a guest). */
async function open(name, { from = browser, cache = null, via = null, api = null } = {}) {
  const fixture = FIXTURES[name];
  const context = await from.newContext({ ...device, reducedMotion: 'reduce' });
  contexts.add(context);
  await context.addInitScript(({ fixture, keys, now }) => {
    const NativeDate = Date;
    let fixed = new NativeDate(now).getTime();
    globalThis.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } };
    // Time away from the page: set before leaving, the fixed clock moves on when the page is
    // shown again, before the game's own visibilitychange handler runs.
    document.addEventListener('visibilitychange', () => { if (!document.hidden && window.backSmokeAwayMs) { fixed += window.backSmokeAwayMs; window.backSmokeAwayMs = 0; } });
    Math.random = () => 0.23;
    let storage;
    try { storage = localStorage; } catch { return; } // about:blank after the root hands Back on
    if (!storage.getItem('back-smoke.seeded')) {
      storage.setItem('back-smoke.seeded', 'yes');
      if (fixture.profile) storage.setItem(keys.profile, fixture.profile);
      if (fixture.battle) storage.setItem(keys.battle, fixture.battle);
      storage.setItem(keys.preferences, JSON.stringify({ sound: false, ambience: 0.35, effects: 0.6, motion: 'reduce', pace: 'fast' }));
    }
    const nativeSet = Storage.prototype.setItem;
    window.backSmokeProfileWrites = 0; window.backSmokePops = 0; window.backSmokeRestored = null; window.backSmokeShown = null;
    addEventListener('popstate', () => { window.backSmokePops++; });
    // Runs before the game's own listener: the state of the entry the page was shown on.
    addEventListener('pageshow', event => { window.backSmokeRestored = event.persisted; window.backSmokeShown = history.state; });
    Storage.prototype.setItem = function(key, value) { nativeSet.call(this, key, value); if (this === localStorage && key === keys.profile) window.backSmokeProfileWrites++; };
  }, { fixture, keys: { profile: PROFILE_KEY, battle: battleKey, preferences: preferenceKey }, now });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (api && url.origin === base.origin && url.pathname.startsWith('/api/')) return api(route, request, url);
    if (url.origin === base.origin && url.pathname === '/api/v1/account' && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: false, user: null, emailEnabled: true }) });
    }
    if (url.origin !== base.origin || url.pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method())) {
      errors.push(`Unexpected network ${request.method()} ${url.origin}${url.pathname}`); return route.abort('blockedbyclient');
    }
    if (!cache) return route.continue();
    return route.fetch().then(response => route.fulfill({ response, headers: { ...response.headers(), 'cache-control': cache } }));
  });
  const page = watch(await context.newPage(), name);
  if (via) await page.goto(via);
  await page.goto(base.href); await page.locator('.game-lobby').waitFor();
  return page;
}
function watch(page, name) {
  installViewportNavigation(page); page.setDefaultTimeout(12000);
  page.blanks = { expected: 0, unexpected: 0 }; page.leaving = false; page.dialogs = 0;
  page.on('framenavigated', frame => {
    if (frame !== page.mainFrame() || frame.url() !== 'about:blank') return;
    if (page.leaving) page.blanks.expected++; else page.blanks.unexpected++;
  });
  page.on('dialog', dialog => { page.dialogs++; dialog.dismiss().catch(() => {}); });
  page.on('pageerror', error => errors.push(`${name}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`${name} console: ${message.text()}`); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${new URL(response.url()).pathname}`); });
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
      : inside('[data-action="abandon-navigate"]') ? 'leave' : has('import-modal') ? 'import' : 'dialog');
  }
  return parts.join('>');
});
/** Layers above the root, as the smoke counts them: a non-root screen, each sub-view, the dialog. */
const layerCount = description => {
  const [screen, ...rest] = description.split('>');
  return (screen === 'home' ? 0 : 1) + rest.reduce((total, part) => total + (part === 'deck' ? 2 : 1), 0);
};
const entryDepth = page => page.evaluate(key => history.state?.[key]?.depth ?? null, NAV_STATE_KEY);
const entryAbs = page => page.evaluate(key => history.state?.[key]?.abs ?? null, NAV_STATE_KEY);
/** After a reload: the page walks back over the earlier load's entries to the tab's first game entry, its root. */
async function reloadToRoot(page) {
  await page.reload(); await page.locator('.game-lobby').waitFor(); await settle(page, 'home');
  await page.waitForFunction(key => history.state?.[key]?.abs === 0, NAV_STATE_KEY, { timeout: 4000 })
    .catch(async () => assert.fail(`the reload walked back to the first game entry (abs now ${await entryAbs(page)})`));
  await settle(page, 'home');
}
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
/** The browser's Back: exactly one layer closes (or the guard row holds/opens its menu).
 * After a bfcache restore the document fires no new load, so wait for the commit only. */
async function back(page, description, depth, { waitUntil = 'load' } = {}) {
  const before = await describe(page);
  await page.goBack({ waitUntil });
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
  assert.equal(await profileRaw(page), before, `${label}: leaving and returning leaves the save bytes unchanged`);
  return writes;
}

// ── D2 save durability with the Back model ──────────────────────────────────────
/** A journey export file (the stored journey, indented, as 匯出旅程備份 downloads it). */
const exportFile = profile => ({ name: '萬象契旅程-back-smoke.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(profile, null, 2)) });
const savesRecord = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), SAVES_KEY);
/** Pick a file through the page's own picker. `slow`: the person stays in the picker longer
 * than the tap's activation lasts (about 5 s) and the file arrives with no input of its own,
 * as on a phone. Playwright's setFiles would grant a fresh activation, so the page receives
 * the file from a timer instead, and nothing is evaluated meanwhile (each evaluation would
 * grant one too). Returns whether the page still had activation when the file arrived. */
async function pickFile(page, trigger, file, { slow = false } = {}) {
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), trigger.click()]);
  if (!slow) { await chooser.setFiles(file); return null; }
  await page.evaluate(({ name, text, ms }) => setTimeout(() => {
    window.backSmokePickActive = navigator.userActivation ? navigator.userActivation.isActive : null;
    const input = document.getElementById('journey-import-file'), data = new DataTransfer();
    data.items.add(new File([text], name, { type: 'application/json' }));
    input.files = data.files; input.dispatchEvent(new Event('change', { bubbles: true }));
  }, ms), { name: file.name, text: file.buffer.toString('utf8'), ms: 5600 });
  await page.waitForTimeout(6200);
  return page.evaluate(() => window.backSmokePickActive);
}

try {
  {
    const page = await open('journey'), start = await page.evaluate(() => history.length);
    const raw = await profileRaw(page);
    // From the four destinations besides 洞府 (and the codex inside 藏卡), Back is 洞府; 洞府 itself hands Back on below.
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
    await reloadToRoot(page);
    const writes = await profileWrites(page);
    await leaveFromRoot(page, 'reload mid-flow');
    assert.equal(writes, 1, 'only the startup write after the reload');
    await leaveFromRoot(page, 'root');
    assert.equal(page.blanks.unexpected, 0);
    assert.equal(JSON.parse(await profileRaw(page)).coins, JSON.parse(raw).coins);
    passed(`${deviceName}: reload mid-flow walks back to the first game entry, then one Back leaves 洞府 without a prompt or write; Forward returns`);
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

    await reloadToRoot(page);
    await leaveFromRoot(page, 'reload on a match result');
    assert.deepEqual(settlementView(JSON.parse(await profileRaw(page))), settlementView(settled), 'still exactly one settlement after reload, Back and Forward');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), battleKey), null, 'no battle snapshot to settle again');
    passed(`${deviceName}: reload on a match result, then Back and Forward: nothing settles again`);
    await release(page);
  }

  {
    // Reloads with two layers open: the earlier load's entries end up ahead and the next push drops them.
    const page = await open('journey'), start = await page.evaluate(() => history.length), lengths = [start];
    for (let cycle = 0; cycle < 6; cycle++) {
      await click(page, '.game-dock [data-action="world"]'); await settle(page, 'world');
      await click(page, '.game-header [data-action="experience-settings"]'); await settle(page, 'world>settings');
      await reloadToRoot(page);
      lengths.push(await page.evaluate(() => history.length));
      assert.ok(lengths.at(-1) <= start + 2, `cycle ${cycle}: history.length ${lengths.at(-1)} ≤ ${start} + 2`);
    }
    await leaveFromRoot(page, 'after six reloads');
    assert.equal(page.blanks.unexpected, 0);
    passed(`${deviceName}: six reloads with 遊歷 and settings open keep history.length bounded (${lengths.join('→')}); one Back then leaves 洞府`);
    await release(page);
  }

  {
    // The game as the tab's first entry (a new tab, home-screen shortcut, Custom Tab): a popup.
    const opener = await open('journey');
    const [page] = await Promise.all([opener.context().waitForEvent('page'), opener.evaluate(href => { window.open(href, '_blank'); }, base.href)]);
    watch(page, 'popup');
    await page.locator('.game-lobby').waitFor(); await settle(page, 'home');
    assert.equal(await page.evaluate(() => history.length), 1, 'the game is the tab\'s first entry');
    await click(page, '.game-dock [data-action="world"]'); await settle(page, 'world');
    await click(page, '.game-header [data-action="experience-settings"]'); await settle(page, 'world>settings');
    assert.equal(await page.evaluate(() => history.length), 3);
    await reloadToRoot(page);
    const cdp = browserName === 'chromium' ? await page.context().newCDPSession(page) : null;
    if (cdp) assert.equal((await cdp.send('Page.getNavigationHistory')).currentIndex, 0, 'on the tab\'s first entry');
    const pops = await page.evaluate(() => window.backSmokePops), writes = await profileWrites(page), raw = await profileRaw(page);
    // Nothing is left before 洞府: this Back is the system's (it closes the tab or returns to the opener).
    assert.equal(await page.goBack(), null);
    await viewportFrames(page);
    assert.equal(await page.evaluate(() => window.backSmokePops), pops, 'no game entry below the root to land on');
    assert.equal(await entryAbs(page), 0); assert.equal(await describe(page), 'home');
    if (cdp) assert.equal((await cdp.send('Page.getNavigationHistory')).currentIndex, 0);
    // The earlier load's entries sit ahead until the next push drops them.
    await click(page, '.game-dock [data-action="bag"]'); await settle(page, 'bag');
    assert.equal(await page.evaluate(() => history.length), 2, 'the next push dropped the earlier entries');
    await back(page, 'home');
    assert.equal(await profileRaw(page), raw); assert.equal(await profileWrites(page), writes);
    assert.equal(page.dialogs, 0); assert.equal(page.blanks.unexpected, 0);
    passed(`${deviceName}: game as the tab's first entry (popup): after a reload with two layers open, the first Back at 洞府 finds no game entry below it (system Back)`);
    await release(opener);
  }

  {
    // Back into the game from a page opened in the same tab. The loopback server sends
    // no-store, so the game loads again (no bfcache) and walks back to its root; the earlier
    // entries then sit between 洞府 and that page, and one Forward must still reach it.
    const page = await open('journey'), start = await page.evaluate(() => history.length);
    await click(page, '.game-dock [data-action="world"]'); await settle(page, 'world');
    await click(page, '.game-header [data-action="experience-settings"]'); await settle(page, 'world>settings');
    const raw = await profileRaw(page), other = new URL('/playtest.html', base).href;
    await page.goto(other);
    assert.equal(await page.evaluate(() => history.length), start + 3);
    const returnToGame = async label => {
      await page.goBack(); await page.locator('.game-lobby').waitFor();
      assert.deepEqual(await page.evaluate(() => [performance.getEntriesByType('navigation')[0]?.type, window.backSmokeRestored]), ['back_forward', false], `${label}: a new load, not a bfcache restore`);
      await page.waitForFunction(key => history.state?.[key]?.abs === 0, NAV_STATE_KEY, { timeout: 4000 })
        .catch(async () => assert.fail(`${label}: walked back to the first game entry (abs now ${await entryAbs(page)})`));
      await settle(page, 'home');
    };
    await returnToGame('Back from the page');
    await page.goForward(); await page.waitForURL(other);
    assert.equal(page.blanks.unexpected, 0);
    assert.equal(await page.evaluate(() => history.length), start + 3, 'no entry added');
    await returnToGame('Back again');
    await leaveFromRoot(page, 'after returning from a page opened in the same tab');
    assert.equal(await profileRaw(page), raw, 'the save bytes are unchanged');
    passed(`${deviceName}: Back into the game from a page opened in the same tab (a new load), then one Forward reaches that page past the earlier entries; Back from 洞府 still leaves in one step`);
    await release(page);
  }

  {
    // A finished match whose settlement fails on resume (storage full). resumeBattle keeps the
    // lobby on screen and opens the pending dialog. Nothing is being saved, so Back must not hold:
    // it closes the dialog, then the battle layer (洞府), then leaves, writing nothing.
    const page = await open('unsettled');
    const raw = await profileRaw(page), writes = await profileWrites(page);
    await page.evaluate(key => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function(name, value) {
        if (this === localStorage && name === key) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        return set.call(this, name, value);
      };
    }, PROFILE_KEY);
    await click(page, '.game-lobby [data-action="resume"]');
    await settle(page, 'home>dialog', 2);
    assert.ok(await page.locator('#overlay-root [data-action="discard-pending"]').count(), 'the pending dialog is open');
    await back(page, 'home', 1);
    await page.goBack(); await settle(page, 'home', 0);
    assert.equal(page.blanks.unexpected, 0);
    assert.equal(await profileRaw(page), raw, 'no settlement'); assert.equal(await profileWrites(page), writes, 'no profile write');
    assert.ok(JSON.parse(raw).pending, 'the match is still pending');
    await leaveFromRoot(page, 'after a failed settlement on resume');
    passed(`${deviceName}: a settlement that fails on resume: Back closes the pending dialog, then the battle layer, then leaves 洞府; nothing written`);
    await release(page);
  }

  {
    // D2 with D1 (a): the file import's dialog is one layer, wherever it opens. It opens on the
    // tap that opens the picker, so its entry is there even when the file comes back after the
    // tap's activation has expired; Back closes it as × does, and nothing is written.
    const page = await open('fresh'), offer = page.locator('[data-save-notice="restore-offer"]');
    await offer.waitFor(); await settle(page, 'home');
    const raw = await profileRaw(page), writes = await profileWrites(page), start = await page.evaluate(() => history.length);
    const file = exportFile(journey());
    const active = await pickFile(page, offer.locator('[data-action="import-save"]'), file, { slow: true });
    assert.notEqual(active, true, 'the file arrived after the tap\'s activation expired');
    await page.locator('.modal .import-compare').waitFor();
    await settle(page, 'home>import');
    assert.equal(await page.evaluate(() => history.length), start + 1, 'one entry, pushed on the tap');
    await back(page, 'home');
    assert.equal(await offer.count(), 1, 'the offer is still there');
    // The picker's dialog itself, before a file (a browser that does not report a cancelled
    // picker leaves it open): Back closes it too.
    await Promise.all([page.waitForEvent('filechooser'), offer.locator('[data-action="import-save"]').click()]);
    await page.locator('.modal [data-import-pick]').waitFor(); await settle(page, 'home>import');
    await back(page, 'home');
    // From 旅程閣: the dialog, then 旅程閣, then 洞府.
    await click(page, '.game-header [data-action="account-open"]'); await settle(page, 'account', 1);
    await pickFile(page, page.locator('#app [data-action="import-save"]'), file);
    await page.locator('.modal .import-compare').waitFor(); await settle(page, 'account>import', 2);
    await back(page, 'account', 1);
    await back(page, 'home', 0);
    // The offer's 雲端旅程 is 旅程閣 (this guest's cloud tab); Back returns to 洞府.
    await click(page, '[data-save-notice="restore-offer"] [data-action="restore-offer-cloud"]'); await settle(page, 'account', 1);
    await page.locator('.account-shell[aria-busy="false"]').waitFor();
    await back(page, 'home');
    assert.equal(await profileRaw(page), raw, 'the save bytes are unchanged'); assert.equal(await profileWrites(page), writes, 'no profile write');
    assert.equal((await savesRecord(page))?.restoreOffer, 'open', 'Back did not close the offer');
    assert.ok(await page.evaluate(() => history.length) <= start + 2, 'history stays bounded');
    passed(`${deviceName}: D2 import dialog from the restore offer (a pick slower than the tap's activation) and from 旅程閣, and the offer's 雲端旅程: one layer per Back, no profile write`);
    await release(page);
  }

  {
    // D2 with D1 (b): Back while a confirmed import is waiting for the profile lock (as behind
    // another tab's write) holds the dialog; the import then lands exactly once.
    const page = await open('fresh'), offer = page.locator('[data-save-notice="restore-offer"]');
    await offer.waitFor(); await settle(page, 'home');
    const started = JSON.parse(await profileRaw(page)), writes = await profileWrites(page), backup = journey();
    await pickFile(page, offer.locator('[data-action="import-save"]'), exportFile(backup));
    await page.locator('.modal .import-compare').waitFor(); await settle(page, 'home>import');
    await page.evaluate(name => new Promise(resolve => {
      navigator.locks.request(name, () => { resolve(); return new Promise(done => { window.backSmokeReleaseLock = done; }); });
    }), PROFILE_LOCK);
    await click(page, '.modal [data-action="import-confirm"]');
    await page.locator('#overlay-root .modal-backdrop[data-dismissible="false"] .modal[aria-busy="true"]').waitFor();
    assert.ok(await page.locator('.modal [data-action="import-confirm"]').isDisabled(), 'no second confirmation while it is written');
    page.expectRow = 'hold';
    await back(page, 'home>import', 1);
    await back(page, 'home>import', 1);
    page.expectRow = null;
    await page.keyboard.press('Escape'); await viewportFrames(page);
    assert.equal(await describe(page), 'home>import', 'Escape holds too');
    assert.equal(await profileWrites(page), writes, 'nothing written while the lock is held');
    await page.evaluate(() => window.backSmokeReleaseLock());
    await page.locator('#overlay-root .modal').waitFor({ state: 'detached' });
    await settle(page, 'home', 0);
    assert.equal(await profileWrites(page), writes + 1, 'one profile write: the import, once');
    assert.equal(fingerprintProfile(JSON.parse(await profileRaw(page))), fingerprintProfile(backup), 'the backup was restored, not aborted');
    assert.deepEqual(JSON.parse(await page.evaluate(key => localStorage.getItem(key), RECOVERY_KEY)).snapshot, createSnapshot(started), 'the replaced journey is the recovery copy');
    await viewportFrames(page);
    assert.equal(await profileWrites(page), writes + 1, 'nothing applied again after the held Backs');
    await leaveFromRoot(page, 'after an import held through Back');
    passed(`${deviceName}: D2 while a confirmed import waits for the profile lock, Back (twice) and Escape hold its dialog; it then restores once (one profile write) and Back at 洞府 leaves`);
    await release(page);
  }

  {
    // D2 with D1 (c): a backup prompt after a win. The result holds on Back with the prompt
    // still due; on 洞府 the prompt is a lobby strip, not a dialog, so it holds no entry: its
    // 旅程閣 is one layer, and Back at 洞府 with the prompt showing leaves in one step.
    const page = await open('final');
    await click(page, '.game-lobby [data-action="resume"]'); await settle(page, 'battle');
    await click(page, '.battle-table [data-action="commit"]'); await settle(page, 'battle>round-result');
    const settledRaw = await profileRaw(page), writes = await profileWrites(page);
    assert.equal((await savesRecord(page))?.prompts?.['first-win']?.state, 'due', 'the win left a prompt due');
    await click(page, '.modal [data-action="next-round"]'); await settle(page, 'battle>match-result');
    page.expectRow = 'hold';
    await back(page, 'battle>match-result', 2);
    page.expectRow = null;
    assert.equal((await savesRecord(page)).prompts['first-win'].state, 'due', 'not used up behind the result');
    await click(page, '.modal [data-action="end-home"]'); await settle(page, 'home');
    const prompt = page.locator('[data-save-notice="first-win"]');
    await prompt.waitFor();
    assert.equal(await page.locator('#overlay-root .modal').count(), 0, 'a strip, not a dialog');
    await click(page, '[data-save-notice="first-win"] [data-action="backup-prompt-cloud"]'); await settle(page, 'account', 1);
    await page.locator('.account-shell[aria-busy="false"]').waitFor();
    await back(page, 'home');
    await prompt.waitFor();
    assert.equal(await profileRaw(page), settledRaw, 'no write after the settlement'); assert.equal(await profileWrites(page), writes);
    await leaveFromRoot(page, 'with a backup prompt on 洞府');
    assert.equal(await prompt.count(), 0, 'shown once: not after returning');
    passed(`${deviceName}: D2 a backup prompt after a win: the result holds on Back, the prompt then shows on 洞府 as a strip; its 旅程閣 closes on Back, and Back at 洞府 with the prompt leaves in one step`);
    await release(page);
  }

  {
    // D2 with D1 (d), integration review round 1: 復原上次本機旅程 shares the profile lock with
    // the import, and every import leaves the recovery copy that offers it. While its restore
    // waits for the lock its dialog holds on Back, Escape and the backdrop, as the import's
    // does; it lands once and closes only itself, so 匯入旅程備份 then opens its dialog and
    // keeps the file picked in it. Before, Back closed the dialog with the restore still
    // queued, and its landing closed the import dialog opened since, dropping the file.
    const page = await open('fresh'), offer = page.locator('[data-save-notice="restore-offer"]');
    await offer.waitFor(); await settle(page, 'home');
    const started = JSON.parse(await profileRaw(page)), backup = journey(), file = exportFile(backup);
    await pickFile(page, offer.locator('[data-action="import-save"]'), file);
    await page.locator('.modal .import-compare').waitFor(); await settle(page, 'home>import');
    await click(page, '.modal [data-action="import-confirm"]');
    await page.locator('#overlay-root .modal').waitFor({ state: 'detached' }); await settle(page, 'home', 0);
    assert.deepEqual(JSON.parse(await page.evaluate(key => localStorage.getItem(key), RECOVERY_KEY)).snapshot, createSnapshot(started), 'the import left a recovery copy');
    await click(page, '.game-header [data-action="account-open"]'); await settle(page, 'account', 1);
    await page.locator('.account-shell[aria-busy="false"]').waitFor();
    await click(page, '#app [data-action="restore-recovery"]'); await settle(page, 'account>dialog', 2);
    const writes = await profileWrites(page);
    await page.evaluate(name => new Promise(resolve => {
      navigator.locks.request(name, () => { resolve(); return new Promise(done => { window.backSmokeReleaseLock = done; }); });
    }), PROFILE_LOCK);
    await click(page, '.modal [data-action="confirm-restore-recovery"]');
    await page.locator('#overlay-root .modal-backdrop[data-dismissible="false"] .modal[aria-busy="true"]').waitFor();
    assert.ok(await page.locator('.modal [data-action="confirm-restore-recovery"]').isDisabled(), 'no second confirmation while it is written');
    assert.equal(await page.locator('.modal .modal-close').isVisible(), false, '× is hidden while it is written');
    page.expectRow = 'hold';
    await back(page, 'account>dialog', 2);
    await back(page, 'account>dialog', 2);
    page.expectRow = null;
    await page.keyboard.press('Escape'); await viewportFrames(page);
    assert.equal(await describe(page), 'account>dialog', 'Escape holds too');
    const point = await backdropPoint(page);
    if (point) { await tapPoint(page, point.x, point.y); await viewportFrames(page); assert.equal(await describe(page), 'account>dialog', 'the backdrop holds too'); }
    assert.equal(await profileWrites(page), writes, 'nothing written while the lock is held');
    await page.evaluate(() => window.backSmokeReleaseLock());
    await page.locator('#overlay-root .modal').waitFor({ state: 'detached' });
    // The same task closes the dialog and shows the toast (2.6 s), so it is there now.
    assert.equal(await page.locator('.toast').textContent(), '已復原上次本機旅程。');
    await settle(page, 'account', 1);
    assert.equal(await profileWrites(page), writes + 1, 'one profile write: the recovery restore, once');
    assert.equal(fingerprintProfile(JSON.parse(await profileRaw(page))), fingerprintProfile(started), 'the recovery copy was restored');
    // 匯入旅程備份 after it: its dialog opens on the tap and the file picked in it is compared.
    await pickFile(page, page.locator('#app [data-action="import-save"]'), file);
    await page.locator('.modal .import-compare').waitFor(); await settle(page, 'account>import', 2);
    await back(page, 'account', 1);
    await back(page, 'home', 0);
    assert.equal(await profileWrites(page), writes + 1, 'nothing applied again after the held Backs');
    await leaveFromRoot(page, 'after a recovery restore held through Back');
    passed(`${deviceName}: D2 while 復原上次本機旅程 waits for the profile lock, Back (twice), Escape${point ? ' and the backdrop' : ''} hold its dialog; it restores once and closes only itself, and 匯入旅程備份 then opens with the picked file compared`);
    await release(page);
  }

  {
    // D2 with D1 (e), integration review round 2: 恢復雲端旅程 is not held (Back, ← 返回旅途 and
    // the dock all leave 旅程閣 while it reads the cloud). Reached from the restore offer's
    // 雲端旅程, Back returns to 洞府 with the restore's read still out (the fixture API keeps it
    // until then); when it lands, 洞府 is redrawn from the restored journey: its coins, and no
    // restore offer, which the restore closed. Before, 洞府 kept the replaced journey and the
    // closed offer under the success toast until something else rendered.
    const backup = journey(), snapshot = createSnapshot(backup), calls = [];
    let answer; const read = new Promise(resolve => { answer = resolve; });
    const api = async (route, request, url) => {
      const reply = value => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) });
      calls.push(`${request.method()} ${url.pathname}`);
      if (url.pathname === '/api/v1/account' && request.method() === 'GET') return reply({ authenticated: true, user: { id: 'back-smoke-fixture', email: '' }, emailEnabled: true, journeyVersions: [1, 3] });
      if (url.pathname === '/api/v3/journey' && request.method() === 'GET') {
        // 旅程閣's lookup answers at once; the second read is the restore's own.
        if (calls.filter(call => call === 'GET /api/v3/journey').length > 1) await read;
        return reply({ backup: { revision: 1, updatedAt: now, snapshot }, revision: 1 });
      }
      errors.push(`Unexpected fixture API ${request.method()} ${url.pathname}`); return route.abort('blockedbyclient');
    };
    const page = await open('fresh', { api }), offer = page.locator('[data-save-notice="restore-offer"]');
    await offer.waitFor(); await settle(page, 'home');
    const started = JSON.parse(await profileRaw(page)), writes = await profileWrites(page);
    const coins = () => page.locator('.game-header [title="金幣"] b').textContent().then(text => Number(text.replace(/\D/g, '')));
    assert.equal(await coins(), started.coins); assert.notEqual(backup.coins, started.coins);
    await click(page, '[data-save-notice="restore-offer"] [data-action="restore-offer-cloud"]'); await settle(page, 'account', 1);
    await page.locator('.account-confirmation').waitFor();
    await click(page, '#app [data-action="account-restore"]');
    await page.locator('.account-shell[aria-busy="true"]').waitFor();
    await back(page, 'home', 0);
    await offer.waitFor();
    assert.equal(await profileWrites(page), writes, 'nothing written while the restore reads the cloud');
    answer();
    // The landing redraws 洞府 before it toasts, so both are there at once.
    await page.waitForFunction(() => document.querySelector('.toast')?.textContent.startsWith('已恢復雲端旅程'));
    assert.equal(await coins(), backup.coins, '洞府 shows the restored journey\'s coins');
    assert.equal(await offer.count(), 0, 'the offer the restore closed is gone from 洞府');
    assert.equal((await savesRecord(page))?.restoreOffer, 'closed');
    assert.equal(await describe(page), 'home'); assert.equal(await entryDepth(page), 0);
    assert.equal(await profileWrites(page), writes + 1, 'one profile write: the cloud restore, once');
    assert.equal(fingerprintProfile(JSON.parse(await profileRaw(page))), fingerprintProfile(backup), 'the cloud journey was restored');
    assert.deepEqual(JSON.parse(await page.evaluate(key => localStorage.getItem(key), RECOVERY_KEY)).snapshot, createSnapshot(started), 'the replaced journey is the recovery copy');
    assert.deepEqual(calls, ['GET /api/v1/account', 'GET /api/v3/journey', 'GET /api/v3/journey']);
    await leaveFromRoot(page, 'after a cloud restore that landed on 洞府');
    passed(`${deviceName}: D2 恢復雲端旅程 from the offer's 雲端旅程: Back leaves 旅程閣 while it reads the cloud; when it lands 洞府 shows the restored journey (◈ ${backup.coins}) without the offer, after one write, and Back at 洞府 leaves`);
    await release(page);
  }

  if (browserName === 'chromium') {
    // Real bfcache restores. Playwright starts Chromium with --disable-back-forward-cache and
    // the loopback server sends no-store; this browser drops that flag and the route serves
    // production's Cache-Control, so Back from a page opened in the same tab restores the
    // game's document on the entry Forward left from. That entry may hold an earlier load's
    // state; the restore must still walk back to 洞府 (once), and the next Back must leave.
    const cached = await engines.chromium.launch({ headless: true, ignoreDefaultArgs: ['--disable-back-forward-cache'], ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
    try {
      const other = new URL('/playtest.html', base).href, commit = { waitUntil: 'commit' };
      const index = async cdp => (await cdp.send('Page.getNavigationHistory')).currentIndex;
      const withLayers = async page => {
        await click(page, '.game-dock [data-action="world"]'); await settle(page, 'world');
        await click(page, '.game-header [data-action="experience-settings"]'); await settle(page, 'world>settings');
      };
      /** Back from the later page: a bfcache restore on the abs-2 entry, then one walk back to the root. */
      const restoreToRoot = async (page, cdp, { root, foreign, label }) => {
        await page.goBack({ waitUntil: 'commit' });
        await page.waitForFunction(() => window.backSmokeRestored === true, null, { timeout: 4000 })
          .catch(async () => assert.fail(`${label}: Back restored the game from the bfcache (pageshow persisted; now ${page.url()}, history index ${await index(cdp)})`));
        await page.waitForFunction(key => history.state?.[key]?.abs === 0, NAV_STATE_KEY, { timeout: 4000 })
          .catch(async () => assert.fail(`${label}: the restore walked back to 洞府 (abs now ${await entryAbs(page)})`));
        await settle(page, 'home');
        const [shown, landed] = await page.evaluate(key => [window.backSmokeShown?.[key], history.state?.[key]], NAV_STATE_KEY);
        assert.equal(shown?.abs, 2, `${label}: restored on the entry Forward left from`);
        assert.equal(shown.sid !== landed.sid, foreign, `${label}: that entry holds ${foreign ? 'an earlier' : 'this'} load's state`);
        // Let a second walk, if any, land before reading where the page is.
        await page.waitForTimeout(400); await viewportFrames(page);
        assert.equal(await index(cdp), root, `${label}: on the root entry`);
        assert.equal(await describe(page), 'home'); assert.equal(page.blanks.unexpected, 0, `${label}: no about:blank`);
      };
      /** Back at 洞府 leaves the game for the entry before it. */
      const leave = async (page, cdp, { url, root, label }) => {
        page.leaving = url === 'about:blank';
        await page.goBack({ waitUntil: 'commit' });
        await page.waitForURL(url, { waitUntil: 'commit' }).catch(() => assert.fail(`${label}: Back at 洞府 left for ${url} (now ${page.url()})`));
        assert.equal(await index(cdp), root - 1, `${label}: one entry back`);
        assert.equal(page.dialogs, 0);
      };
      const cases = [];
      for (const how of ['reload at 洞府', 'jump of 2 entries']) {
        const page = await open('journey', { from: cached, cache: PRODUCTION_CACHE }), cdp = await page.context().newCDPSession(page);
        const raw = await profileRaw(page);
        await withLayers(page);
        await page.goto(other);
        if (how === 'reload at 洞府') {
          // Back restores both layers from the bfcache; two Backs close them; reload at 洞府.
          await page.goBack({ waitUntil: 'commit' });
          await page.waitForFunction(() => window.backSmokeRestored === true, null, { timeout: 4000 })
            .catch(() => assert.fail(`${how}: Back restored the game from the bfcache`));
          await settle(page, 'world>settings');
          await back(page, 'world', undefined, commit); await back(page, 'home', undefined, commit);
          await reloadToRoot(page);
        } else {
          // The Back menu (or a fast double Back) two entries back: the game loads on its abs-1
          // entry and walks back to the first, leaving the earlier load's abs-2 entry ahead.
          await page.evaluate(() => history.go(-2));
          await page.waitForURL(base.href, { waitUntil: 'commit' }); await page.locator('.game-lobby').waitFor();
          await page.waitForFunction(key => history.state?.[key]?.abs === 0, NAV_STATE_KEY, { timeout: 4000 })
            .catch(async () => assert.fail(`${how}: walked back to the first game entry (abs now ${await entryAbs(page)})`));
          await settle(page, 'home');
        }
        assert.equal(await index(cdp), 1);
        await page.evaluate(() => { window.backSmokeRestored = null; });
        await page.goForward(commit); await page.waitForURL(other, commit);
        await restoreToRoot(page, cdp, { root: 1, foreign: true, label: how });
        assert.equal(await profileRaw(page), raw, `${how}: the save bytes are unchanged`);
        await leave(page, cdp, { url: 'about:blank', root: 1, label: how });
        assert.equal(page.blanks.expected, 1);
        cases.push(how);
        await release(page);
      }
      {
        // 3 s or more on the later page (NAV_STALL_MS): the render that runs on visibilitychange
        // before pageshow must not start a walk of its own, or pageshow's walk would be a second
        // one, which from this root goes past the page opened before the game.
        const label = 'closed layers, 5 s on the later page';
        const page = await open('journey', { from: cached, cache: PRODUCTION_CACHE, via: other }), cdp = await page.context().newCDPSession(page);
        assert.equal(await index(cdp), 2, 'a page before the game');
        await withLayers(page);
        await page.goto(other);
        await page.goBack({ waitUntil: 'commit' });
        await page.waitForFunction(() => window.backSmokeRestored === true, null, { timeout: 4000 })
          .catch(() => assert.fail(`${label}: Back restored the game from the bfcache`));
        await settle(page, 'world>settings');
        await back(page, 'world', undefined, commit); await back(page, 'home', undefined, commit);
        await page.evaluate(() => { window.backSmokeRestored = null; window.backSmokeAwayMs = 5000; });
        await page.goForward(commit); await page.waitForURL(other, commit);
        assert.equal(await index(cdp), 5, `${label}: Forward stepped past the closed layers' entries to the page`);
        await restoreToRoot(page, cdp, { root: 2, foreign: false, label });
        await leave(page, cdp, { url: other, root: 2, label });
        cases.push(label);
        await release(page);
      }
      passed(`${deviceName}: bfcache on (production Cache-Control): Back from a page Forward reached past entries that hold no layer restores the game, which walks back to 洞府 once (${cases.join('; ')}), and the next Back leaves`);
    } finally { await cached.close(); }
  }

  assert.deepEqual(errors, []);
  console.log(`Back smoke (${browserName}, ${deviceName}): ${checks.length} checks passed.`);
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  await browser.close();
}
