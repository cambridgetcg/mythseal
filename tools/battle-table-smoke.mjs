/**
 * Q0 battle-table acceptance on a loopback server with synthetic, legal saves.
 * Asserts directly (no helper opens tabs or pages on the test's behalf) that the
 * four public opponent cards, the announced/awaiting confrontation, the player's
 * four cards and selection, and the move controls are visible together with real
 * elementFromPoint hit tests; that secret AI bids/Fury never change pre-reveal
 * DOM/ARIA; that inspection keeps focus, draft, saves and RNG; and that reveal,
 * Next and reload keep round/card labels. Keyboard focus returns to Commit after
 * Next; selection patches the hand in place. A fit sweep adds tablet, phone
 * landscape and other window sizes with four-character names, then commits and
 * pages through every reveal page by tapping its pager. Headless engines only:
 * physical iOS/Android and human review are separate evidence.
 * Usage: GAME_URL=http://127.0.0.1:<port> [BROWSER=webkit] [BATTLE_TABLE_SIZE=360x640] node tools/battle-table-smoke.mjs
 * BATTLE_TABLE_SIZE limits the flows and the fit sweep to that one contract size.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createMatch, resolveRound, chooseAIMove, getBattleCard } from '../engine.mjs';
import { createProfile, beginBattle, finishBattle, PROFILE_KEY } from '../progression.mjs';

const browserName = process.env.BROWSER || 'chromium';
if (!['chromium', 'webkit'].includes(browserName)) throw Error('BROWSER must be chromium or webkit.');
const runtime = fileURLToPath(new URL('../test-results/webkit-runtime', import.meta.url));
if (browserName === 'webkit' && !process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(runtime)) process.env.PLAYWRIGHT_BROWSERS_PATH = runtime;
const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = new URL(process.env.GAME_URL || 'http://127.0.0.1:4177');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) throw Error('Battle table smoke requires a loopback GAME_URL.');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = fileURLToPath(new URL('../test-results/', import.meta.url));
const now = '2026-09-22T12:00:00.000Z', battleKey = 'shanhai.battle.v5', preferenceKey = 'shanhai.experience.v1';
const sizes = [[1440, 900], [1280, 720], [390, 844], [360, 740], [360, 640], [844, 390]];
const selectedSizes = process.env.BATTLE_TABLE_SIZE ? sizes.filter(pair => pair.join('x') === process.env.BATTLE_TABLE_SIZE) : sizes;
// Beyond the six contract sizes: portrait tablets and landscape windows between
// the phone and roomy layouts, short roomy windows (800x600 to 1280x620 put the
// reveal pair above the resource page), common phones, a phone browser with its
// bars (375x553, 360x560 and 360x540, the shortest supported portrait windows)
// and phone landscape (640x360, and 600 px wide or narrower: 568x320, 600x400,
// 560x420, 600x540).
const SWEEP = [[601, 800], [700, 800], [744, 1133], [768, 1024], [800, 600], [820, 1180], [834, 1194], [906, 700], [960, 540], [1024, 600], [1024, 768], [1280, 620], [1366, 768], [1920, 1080], [375, 667], [375, 553], [360, 560], [360, 540], [412, 915], [667, 375], [740, 360], [640, 360], [568, 320], [600, 400], [560, 420], [600, 540]];
const sweepSizes = process.env.BATTLE_TABLE_SIZE ? selectedSizes : [...sizes, ...SWEEP];
assert(selectedSizes.length, 'BATTLE_TABLE_SIZE must name one supported size');
const checks = [], screenshots = [], errors = [], measurements = [], contexts = new Set();
const passed = label => { checks.push(label); console.log(`PASS ${label}`); };

// Named legal fixtures. Hands are fixed so labels and stats are predictable; the
// real engine resolves every expected round. The longest authored opponent name
// exercises the narrowest identity column.
const HANDS = { player: ['yaoheng', 'qingxiao', 'yanxin', 'cangjiao'], opponent: ['yanxin', 'chiling', 'yaoheng', 'cuixian'] };
// Four-character names; three moon cards in each hand also carry the ✧ resonance mark.
const LONG_HANDS = { player: ['tieshan', 'yinjiao', 'liuer', 'puti'], opponent: ['yinjiao', 'tieshan', 'liuer', 'zhenyuan'] };
const LONGEST_NAME = '五莊迎風童子';
function table({ kind = 'arena', nodeId = null, initiative, opponentName = null, opponentLevels = {}, playerHP = 12, opponentHP = 12, hands = HANDS }) {
  const started = beginBattle(createProfile({ now }), { kind, nodeId, now });
  const match = createMatch({ mode: kind, rng: () => 0.23, opponentName, opponentLevels });
  match.player = { hp: playerHP, pills: 12, hand: [...hands.player], used: [] };
  match.opponent = { hp: opponentHP, pills: 12, hand: [...hands.opponent], used: [] };
  match.initiative = initiative;
  return { started, match };
}
const snapshot = (started, match, aiMove, extra = {}) => ({
  profile: JSON.stringify(started.profile),
  battle: JSON.stringify({ match, encounter: started.encounter, selected: match.player.hand.find(id => !match.player.used.includes(id)), pills: 0, fury: false, aiMove, revealPending: false, recorded: false, lastReward: null, ...extra }),
});
function fixtures() {
  const playerLeads = table({ initiative: 'player', opponentName: LONGEST_NAME });
  const opponentLeads = table({ initiative: 'opponent' });
  const announced = { cardId: 'chiling', pills: 4, fury: false }, alternate = { cardId: 'chiling', pills: 9, fury: true };
  // Two real rounds from the opponent-led opening: the player then leads round 2.
  const middle = table({ initiative: 'opponent' });
  const r1 = resolveRound(middle.match, { cardId: 'qingxiao', pills: 2, fury: false }, announced);
  const r2 = resolveRound(r1, { cardId: 'yanxin', pills: 1, fury: false }, chooseAIMove(r1, () => 0.23, 'yanxin'));
  assert.equal(r2.status, 'playing'); assert.equal(r2.round, 3); assert.equal(r2.initiative, 'opponent');
  const mist = table({ kind: 'expedition', nodeId: 'mist-gate', initiative: 'opponent', opponentName: '守渡弈者', opponentLevels: { chiling: 3 } });
  const legacy = table({ initiative: 'opponent' });
  const long = table({ initiative: 'opponent', opponentName: LONGEST_NAME, hands: LONG_HANDS }), longMove = { cardId: 'liuer', pills: 3, fury: false };
  const lowLife = table({ initiative: 'opponent', playerHP: 2, opponentHP: 3 });
  const overkill = table({ initiative: 'opponent', opponentHP: 1 });
  const killing = { cardId: 'qingxiao', pills: 1, fury: true }, opener = { cardId: 'yanxin', pills: 0, fury: false };
  const finished = resolveRound(overkill.match, killing, opener);
  assert.equal(finished.status, 'finished');
  return {
    'q0-player-leads-r1': { seed: snapshot(playerLeads.started, playerLeads.match, null), match: playerLeads.match },
    'q0-opponent-leads-r1': { seed: snapshot(opponentLeads.started, opponentLeads.match, announced), match: opponentLeads.match, aiMove: announced },
    'q0-opponent-leads-r1-altbid': { seed: snapshot(opponentLeads.started, opponentLeads.match, alternate), match: opponentLeads.match, aiMove: alternate },
    'q0-mid-match-r3': { seed: snapshot(middle.started, r2, chooseAIMove(r2, () => 0.23)), match: r2, aiMove: chooseAIMove(r2, () => 0.23) },
    'q0-mist-gate': { seed: snapshot(mist.started, mist.match, announced), match: mist.match, aiMove: announced },
    'q0-legacy-unannounced': { seed: snapshot(legacy.started, legacy.match, null), match: legacy.match },
    'q0-long-names': { seed: snapshot(long.started, long.match, longMove), match: long.match, aiMove: longMove },
    'q0-low-life': { seed: snapshot(lowLife.started, lowLife.match, announced), match: lowLife.match, aiMove: announced },
    'q0-overkill-finished': { seed: snapshot(overkill.started, overkill.match, opener, { selected: killing.cardId }), match: overkill.match, aiMove: opener, move: killing, expected: finished,
      finalProfile: finishBattle(overkill.started.profile, { encounterId: overkill.started.encounter.id, winner: finished.winner, playedCardIds: finished.player.used, now }).profile },
  };
}
const FIXTURES = fixtures();

const browser = await engines[browserName].launch({ headless: true, ...(browserName === 'chromium' && existsSync(chrome) ? { executablePath: chrome } : {}) });

async function open(name, { width, height, motion = 'reduce', pace = 'fast' }) {
  const fixture = FIXTURES[name], touch = width <= 600 || height <= 500;
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: motion === 'reduce' ? 'reduce' : 'no-preference', ...(touch ? { hasTouch: true, isMobile: true } : {}) });
  contexts.add(context);
  await context.addInitScript(({ seed, keys, now, motion, pace }) => {
    const NativeDate = Date, fixed = new NativeDate(now).getTime();
    globalThis.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } };
    // Every RNG draw is counted. Planning, inspection and resume must not draw.
    window.__rngCalls = 0;
    Math.random = () => { window.__rngCalls++; return 0.23; };
    if (!localStorage.getItem('battle-table-smoke.seeded')) {
      localStorage.setItem('battle-table-smoke.seeded', 'yes');
      localStorage.setItem(keys.profile, seed.profile); localStorage.setItem(keys.battle, seed.battle);
      localStorage.setItem(keys.preferences, JSON.stringify({ sound: false, ambience: 0.35, effects: 0.6, motion: motion === 'reduce' ? 'reduce' : 'system', pace }));
    }
  }, { seed: fixture.seed, keys: { profile: PROFILE_KEY, battle: battleKey, preferences: preferenceKey }, now, motion, pace });
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
  const page = await context.newPage(); page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(`${name} ${width}x${height}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`${name} ${width}x${height} console: ${message.text()}`); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${new URL(response.url()).pathname}`); });
  Object.assign(page, { fixtureName: name, touch, size: `${width}x${height}` });
  await page.goto(base.href); await page.locator('.game-lobby').waitFor();
  return page;
}
async function release(page) { const context = page.context(); await context.close(); contexts.delete(context); }
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const raw = page => page.evaluate(keys => ({ profile: localStorage.getItem(keys.profile), battle: localStorage.getItem(keys.battle) }), { profile: PROFILE_KEY, battle: battleKey });
const saved = async page => JSON.parse((await raw(page)).battle);
const rng = page => page.evaluate(() => window.__rngCalls);

/** Tap/click the hit-tested centre of a visible control, the way a player would. */
async function press(page, locator, label = 'control') {
  const target = await locator.evaluate(node => {
    const rect = node.getBoundingClientRect(), x = rect.left + rect.width / 2, y = rect.top + rect.height / 2, hit = document.elementFromPoint(x, y);
    return { x, y, clear: hit === node || node.contains(hit), hit: hit ? `${hit.tagName}.${hit.className}` : null };
  });
  assert(target.clear, `${page.size} ${label}: centre covered by ${target.hit}`);
  if (page.touch) await page.touchscreen.tap(target.x, target.y); else await page.mouse.click(target.x, target.y);
  await frames(page);
}
async function resume(page) {
  const before = await rng(page);
  await press(page, page.locator('.game-lobby [data-action="resume"]'), 'lobby resume');
  await page.locator('#app .battle-table').waitFor();
  await page.evaluate(() => document.fonts.ready); await frames(page);
  return (await rng(page)) - before;
}
async function shot(page, state) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const urls = new Set([...document.querySelectorAll('.card-art,.battle-slot-thumb')].flatMap(node => [...getComputedStyle(node).backgroundImage.matchAll(/url\(["']?(https?:[^"')]+)["']?\)/g)].map(match => match[1])));
    await Promise.all([...urls].map(url => { const image = new Image(); image.src = url; return image.decode().catch(() => {}); }));
  });
  await frames(page);
  const file = `battle-table-${browserName}-${page.fixtureName}-${state}-${page.size}.png`;
  await page.screenshot({ path: output + file }); screenshots.push(file);
}

/** One in-page pass: every decision input is visible at once and hit-testable. */
async function assertDecisionVisible(page, label, { announced, selected }) {
  const result = await page.evaluate(({ announced, selected, phone }) => {
    const problems = [], metrics = {};
    const inView = rect => rect.left >= -0.5 && rect.top >= -0.5 && rect.right <= innerWidth + 0.5 && rect.bottom <= innerHeight + 0.5;
    const hitTest = (node, name, { minHeight = 44 } = {}) => {
      if (!node) { problems.push(`${name}: missing`); return null; }
      const rect = node.getBoundingClientRect();
      if (!inView(rect)) problems.push(`${name}: outside viewport ${JSON.stringify(rect)}`);
      if (rect.width < 43.5 || rect.height < minHeight - 0.5) problems.push(`${name}: ${Math.round(rect.width)}x${Math.round(rect.height)} below target`);
      for (const fraction of [0.2, 0.5, 0.8]) {
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height * fraction);
        if (!(hit === node || node.contains(hit))) problems.push(`${name}: covered at ${fraction} by ${hit?.tagName}.${hit?.className}`);
      }
      return rect;
    };
    const app = document.querySelector('#app'), table = app.querySelector('main.battle-table[data-battle-phase="planning"]');
    if (!table) return { problems: ['planning table missing'], metrics };
    const opponent = [...table.querySelectorAll('.enemy-hand [data-action="inspect"][data-side="opponent"][data-card-id]')];
    const own = [...table.querySelectorAll('.player-hand .card')];
    if (opponent.length !== 4) problems.push(`opponent cards ${opponent.length}`);
    if (own.length !== 4) problems.push(`own cards ${own.length}`);
    if (table.querySelectorAll('[data-side="opponent"][data-card-id]').length !== 4) problems.push('a non-lineup opponent card hook exists');
    for (const card of [...opponent, ...own]) {
      const rect = hitTest(card, card.id, { minHeight: phone ? 56 : 44 });
      const badge = card.querySelector('.battle-mini-state');
      const box = badge?.getBoundingClientRect();
      if (!badge || !badge.textContent.trim()) problems.push(`${card.id}: state label missing`);
      else {
        if (badge.scrollWidth > badge.clientWidth + 1) problems.push(`${card.id}: state label truncated`);
        if (parseFloat(getComputedStyle(badge).fontSize) < 10) problems.push(`${card.id}: state label below 10px`);
        if (rect && (box.left < rect.left - 0.5 || box.right > rect.right + 0.5 || box.top < rect.top - 0.5 || box.bottom > rect.bottom + 0.5 || !box.width)) problems.push(`${card.id}: state label outside card`);
        if (!card.getAttribute('aria-label')?.includes(badge.textContent.trim())) problems.push(`${card.id}: aria-label lacks state`);
        // At the 56 px minimum card height the name sits below the badge, not over it.
        const name = card.querySelector('.battle-mini-name')?.getBoundingClientRect();
        if (name && name.top < box.bottom - 1) problems.push(`${card.id}: name overlaps state label by ${(box.bottom - name.top).toFixed(1)}`);
      }
    }
    // Names are never clipped in any state: a range wider than its box means an ellipsis.
    for (const name of table.querySelectorAll('.battle-mini-name, .battle-slot-copy b')) {
      const range = document.createRange(); range.selectNodeContents(name);
      if (range.getBoundingClientRect().width > name.getBoundingClientRect().width + 0.01) problems.push(`name clipped: ${name.textContent}`);
    }
    const states = cards => cards.map(card => card.querySelector('.battle-mini-state')?.textContent.trim());
    metrics.opponentStates = states(opponent); metrics.ownStates = states(own);
    metrics.opponentOrder = opponent.map(card => card.dataset.cardId); metrics.ownOrder = own.map(card => card.dataset.id);
    const current = opponent.filter(card => card.getAttribute('aria-current') === 'true').map(card => card.dataset.cardId);
    if (JSON.stringify(current) !== JSON.stringify(announced ? [announced] : [])) problems.push(`announced lineup card ${JSON.stringify(current)}`);
    if (announced && !opponent.find(card => card.dataset.cardId === announced)?.classList.contains('is-announced')) problems.push('announced card lacks border state');
    if (metrics.opponentStates.filter(text => text === '本輪亮牌').length !== (announced ? 1 : 0)) problems.push('announced label count');
    const slot = table.querySelector('.battle-confrontation .battle-slot[data-side="opponent"][data-battle-announced]');
    metrics.centerOpponent = slot?.textContent.replace(/\s+/g, ' ').trim();
    if (announced) {
      const center = slot?.querySelector('#battle-center-opponent');
      if (!center || center.dataset.id !== announced || !metrics.centerOpponent.includes('本輪亮牌')) problems.push(`centre announcement ${metrics.centerOpponent}`);
      hitTest(center, 'centre opponent');
    } else if (!slot?.querySelector('.battle-slot-waiting') || !metrics.centerOpponent.includes('待對手應戰')) problems.push(`centre waiting ${metrics.centerOpponent}`);
    const mine = table.querySelector('#battle-center-player');
    metrics.centerPlayer = mine?.textContent.replace(/\s+/g, ' ').trim();
    if (!mine || mine.dataset.id !== selected || !metrics.centerPlayer.includes('已選')) problems.push(`centre selection ${metrics.centerPlayer}`);
    hitTest(mine, 'centre player');
    const chosen = own.filter(card => card.getAttribute('aria-pressed') === 'true').map(card => card.dataset.id);
    if (JSON.stringify(chosen) !== JSON.stringify([selected])) problems.push(`selected ${JSON.stringify(chosen)}`);
    if (metrics.ownStates.filter(text => text === '已選').length !== 1) problems.push('selected label count');
    for (const selector of ['[data-action="pill-minus"]', '[data-action="pill-plus"]', '#pill-slider', '[data-action="fury"]', '[data-action="commit"]', '[data-action="history"]']) hitTest(table.querySelector(selector), selector);
    // The Fury switch keeps its full 27 px track inside the button, clear of the cost note.
    const fury = table.querySelector('[data-action="fury"]'), track = fury?.querySelector('.toggle-track'), furyNote = fury?.querySelector('small');
    if (fury && track && furyNote) {
      const outer = fury.getBoundingClientRect(), switchBox = track.getBoundingClientRect(), noteBox = furyNote.getBoundingClientRect();
      const inside = inner => inner.left >= outer.left - 0.5 && inner.right <= outer.right + 0.5 && inner.top >= outer.top - 0.5 && inner.bottom <= outer.bottom + 0.5;
      metrics.furyTrack = Math.round(switchBox.width * 10) / 10;
      if (switchBox.width < 26.5 || switchBox.height < 14.5) problems.push(`fury track ${switchBox.width.toFixed(1)}x${switchBox.height.toFixed(1)}`);
      if (!inside(switchBox)) problems.push('fury track outside its button');
      if (!noteBox.width || !inside(noteBox)) problems.push('fury cost note outside its button');
      if (noteBox.right > switchBox.left + 0.5 && noteBox.left < switchBox.right - 0.5 && noteBox.bottom > switchBox.top + 0.5 && noteBox.top < switchBox.bottom - 0.5) problems.push('fury cost note overlaps the switch');
    } else problems.push('fury switch parts missing');
    // The attack estimate's label is at least 10 px and on one line.
    const estimate = table.querySelector('.attack-preview-copy>span');
    if (estimate) {
      const size = parseFloat(getComputedStyle(estimate).fontSize), height = estimate.getBoundingClientRect().height;
      if (size < 10) problems.push(`attack estimate label ${size}px`);
      if (height > size * 2.2) problems.push(`attack estimate label wraps (${height.toFixed(1)} px tall)`);
    } else problems.push('attack estimate label missing');
    for (const numeral of table.querySelectorAll('.battle-resources [data-hp-value], .battle-resources [data-pill-value]')) {
      const rect = numeral.getBoundingClientRect(), hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      if (!rect.width || !rect.height || !inView(rect) || !(hit === numeral || numeral.contains(hit))) problems.push(`resource numeral hidden ${numeral.closest('[data-side]').dataset.side}`);
    }
    if (table.querySelectorAll('.battle-resources [data-hp-value]').length !== 2) problems.push('resource panels');
    const doc = document.documentElement;
    if (doc.scrollWidth > innerWidth + 1 || doc.scrollHeight > innerHeight + 1 || scrollX || scrollY) problems.push(`document scroll ${doc.scrollWidth}x${doc.scrollHeight}`);
    const module = table.querySelector('[data-viewport-module]');
    if (!module || module.scrollHeight > module.clientHeight + 2 || module.scrollWidth > module.clientWidth + 2) problems.push(`table module overflow ${module?.scrollHeight}/${module?.clientHeight}`);
    if (table.querySelectorAll('[data-viewport-module]').length !== 1) problems.push('more than one battle module');
    // Rows stacked in the same column never overlap (short single-column phones).
    const area = selector => table.querySelector(selector)?.getBoundingClientRect();
    for (const [upper, lower] of [['.battle-status', '.battle-edge[data-side="opponent"] .battle-edge-head'], ['.enemy-hand', '.battle-confrontation'], ['.battle-confrontation', '.player-hand'], ['.battle-edge[data-side="player"] .battle-edge-head', '.battle-actions']]) {
      const top = area(upper), bottom = area(lower);
      if (!top || !bottom) { problems.push(`row missing ${upper} / ${lower}`); continue; }
      if (top.right > bottom.left + 0.5 && bottom.right > top.left + 0.5 && top.bottom > bottom.top + 0.5) problems.push(`rows overlap ${upper} / ${lower} by ${(top.bottom - bottom.top).toFixed(1)}`);
    }
    const tabs = table.querySelector('.viewport-module-tabs');
    if (tabs && !tabs.hidden && getComputedStyle(tabs).display !== 'none') problems.push('module tabs visible');
    if (table.querySelectorAll('.viewport-pagination,[data-viewport-list]').length) problems.push('four-card rows are paginated');
    const mini = own[0]?.getBoundingClientRect();
    Object.assign(metrics, { mini: mini ? [Math.round(mini.width), Math.round(mini.height)] : null, module: module ? [module.clientWidth, module.clientHeight] : null });
    return { problems, metrics };
  }, { announced, selected, phone: page.size.startsWith('3') });
  measurements.push({ browser: browserName, size: page.size, fixture: page.fixtureName, label, ...result.metrics });
  assert.deepEqual(result.problems, [], `${page.size} ${page.fixtureName} ${label}: ${JSON.stringify(result.problems)}`);
  return result.metrics;
}

/** Low life (3 or less) shows the 危 text mark beside each table orb, never colour alone. */
async function assertLowLifeMark(page) {
  const problems = await page.evaluate(() => {
    const problems = [], overlap = (a, b) => a.right > b.left + 0.5 && b.right > a.left + 0.5 && a.bottom > b.top + 0.5 && b.bottom > a.top + 0.5;
    for (const side of ['opponent', 'player']) {
      const panel = document.querySelector(`#app .battle-table .battle-edge[data-side="${side}"] .battle-resources`), mark = panel?.querySelector('.life-low-label');
      if (!panel?.classList.contains('is-low-life') || !mark) { problems.push(`${side}: low-life panel or mark missing`); continue; }
      const rect = mark.getBoundingClientRect(), style = getComputedStyle(mark);
      const shown = mark.checkVisibility({ checkVisibilityCSS: true, visibilityProperty: true }) && style.visibility === 'visible' && rect.width > 0 && rect.height > 0;
      if (!shown || mark.textContent.trim() !== '危') problems.push(`${side}: 危 not shown`);
      if (parseFloat(style.fontSize) < 10) problems.push(`${side}: 危 ${style.fontSize}`);
      if (rect.left < -0.5 || rect.top < -0.5 || rect.right > innerWidth + 0.5 || rect.bottom > innerHeight + 0.5) problems.push(`${side}: 危 outside viewport`);
      for (const selector of ['[data-hp-value]', '.battle-pill-reserve']) if (overlap(rect, panel.querySelector(selector).getBoundingClientRect())) problems.push(`${side}: 危 overlaps ${selector}`);
    }
    return problems;
  });
  assert.deepEqual(problems, [], `${page.size} low life: ${JSON.stringify(problems)}`);
}

/** Choose each legal card and adjust pills/Fury with real input; check after every action. */
async function exerciseDraft(page, { announced }) {
  const before = await raw(page), draws = await rng(page), { match } = await saved(page);
  const legal = match.player.hand.filter(id => !match.player.used.includes(id));
  // Selection patches the dealt card nodes; replacing them would replay the
  // round-entry fade and skip the selection lift.
  await page.evaluate(() => { window.__ownCards = [...document.querySelectorAll('#app .player-hand > .card')]; });
  const kept = () => page.evaluate(() => { const cards = [...document.querySelectorAll('#app .player-hand > .card')]; return cards.length === 4 && cards.every((card, index) => card === window.__ownCards[index]); });
  let metrics;
  for (const id of legal) {
    await press(page, page.locator(`#battle-card-player-${id}`), `select ${id}`);
    assert(await kept(), `${page.size} select ${id}: own card nodes are patched in place`);
    metrics = await assertDecisionVisible(page, `select ${id}`, { announced, selected: id });
    for (let step = 0; step < 2; step++) { await press(page, page.locator('[data-action="pill-plus"]'), 'pill plus'); await assertDecisionVisible(page, `${id} pill+`, { announced, selected: id }); }
    await page.locator('#pill-slider').fill('3'); await frames(page);
    assert.equal(await page.locator('#pill-amount').textContent(), '3');
    await assertDecisionVisible(page, `${id} slider`, { announced, selected: id });
    for (const pressed of ['true', 'false']) {
      await press(page, page.locator('[data-action="fury"]'), 'fury');
      assert.equal(await page.locator('[data-action="fury"]').getAttribute('aria-pressed'), pressed);
      await assertDecisionVisible(page, `${id} fury ${pressed}`, { announced, selected: id });
    }
  }
  assert(await kept(), 'pill and Fury changes keep the card nodes');
  assert.deepEqual(metrics.ownOrder, match.player.hand, 'own cards keep dealt order');
  assert.deepEqual(metrics.opponentOrder, match.opponent.hand, 'opponent cards keep dealt order');
  const after = await raw(page);
  assert.equal(after.profile, before.profile, 'planning never writes the profile');
  assert.deepEqual(JSON.parse(after.battle).aiMove, JSON.parse(before.battle).aiMove, 'planning cannot reroll the AI commitment');
  assert.equal(await rng(page), draws, 'planning consumes no game RNG');
  return legal;
}

const normalize = html => html.replace(/viewport-\d+/g, 'viewport-N').replace(/\s?battle-turn-enter/g, '');
async function publicTable(page) {
  return { html: normalize(await page.locator('#app main').evaluate(node => node.outerHTML)), aria: await page.locator('#app main').ariaSnapshot(), announcer: await page.locator('#announcer').textContent() };
}

/** Inspect is read-only: focus returns to its origin and the draft, saves and RNG survive. */
async function inspect(page, selector, { keyboard = false, label }) {
  const origin = page.locator(selector), id = await origin.getAttribute('id');
  const draft = async () => ({ selected: await page.locator('.player-hand [aria-pressed="true"]').getAttribute('data-id'), pills: await page.locator('#pill-amount').textContent(), fury: await page.locator('[data-action="fury"]').getAttribute('aria-pressed') });
  const before = { draft: await draft(), raw: await raw(page), draws: await rng(page) };
  if (keyboard) { await origin.focus(); await page.keyboard.press('Enter'); } else await press(page, origin, label);
  await page.locator('.modal .detail-rank').waitFor();
  assert(await page.locator('.modal .detail-rank').isVisible(), `${label}: inspect sheet visible`);
  await frames(page);
  if (keyboard) await page.keyboard.press('Escape'); else await press(page, page.locator('.modal-close'), 'close inspect');
  await page.locator('.modal').waitFor({ state: 'detached' }); await frames(page);
  assert.equal(await page.evaluate(() => document.activeElement?.id), id, `${label}: focus returns to ${id}`);
  assert.deepEqual(await draft(), before.draft, `${label}: uncommitted card, pills and Fury unchanged`);
  assert.deepEqual(await raw(page), before.raw, `${label}: profile and battle snapshot bytes unchanged`);
  assert.equal(await rng(page), before.draws, `${label}: no RNG drawn`);
}

/**
 * Commit, then walk every reveal page: played cards stay visible with lastResult
 * labels. Each paged list is paged to its end by tapping 下頁 (press() asserts the
 * button's centre is not covered); every page's items stay inside the list, and
 * the 生命與仙丹 page reaches both public panels.
 */
async function reveal(page, { round, playerCard, opponentCard, keyboard = false, shotTab = null }) {
  if (keyboard) { await page.locator('#app [data-action="commit"]').focus(); await page.keyboard.press('Enter'); }
  else await press(page, page.locator('[data-action="commit"]'), 'commit');
  await page.locator('.battle-reveal[data-phase="complete"]').waitFor();
  const accepted = await saved(page);
  assert.equal(accepted.match.lastResult.round, round); assert.equal(accepted.aiMove, null, 'the resolved move is not kept after resolution');
  const background = await page.locator('#app main').evaluate(node => ({ phase: node.dataset.battlePhase, round: node.querySelector('.round-steps')?.textContent, played: [...node.querySelectorAll('.is-played')].map(card => `${card.dataset.side}:${card.dataset.id}`) }));
  assert.equal(background.phase, 'reveal'); assert.match(background.round, new RegExp(`第 ${round} /`));
  assert.deepEqual(background.played.sort(), [`opponent:${opponentCard}`, `player:${playerCard}`].sort());
  const names = { player: getBattleCard(accepted.match, 'player', playerCard).name, opponent: getBattleCard(accepted.match, 'opponent', opponentCard).name };
  const tabs = await page.locator('.battle-reveal [data-viewport-action="module"]').evaluateAll(nodes => nodes.map(node => node.dataset.viewportTarget));
  assert.deepEqual(tabs, ['clash', 'resources', 'effects']);
  for (const tab of tabs) {
    await press(page, page.locator(`.battle-reveal [data-viewport-action="module"][data-viewport-target="${tab}"]`), `reveal tab ${tab}`);
    const view = await page.evaluate(() => {
      const modal = document.querySelector('.battle-reveal'), visible = node => node && !node.closest('[hidden]') && getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden' && node.getBoundingClientRect().height > 0;
      const pair = modal.querySelector('.reveal-played-pair'), clash = modal.querySelector('.battle-clash');
      const footer = modal.querySelector('.battle-reveal-footer [data-action="next-round"]'), rect = footer.getBoundingClientRect();
      const clear = [0.2, 0.5, 0.8].every(fraction => { const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height * fraction); return hit === footer || footer.contains(hit); });
      const doc = document.documentElement;
      const clipped = [modal, ...modal.querySelectorAll('[data-viewport-module],[data-viewport-list],.viewport-list-frame')].filter(visible)
        .filter(node => node.scrollHeight > node.clientHeight + 2 || node.scrollWidth > node.clientWidth + 2).map(node => `${node.className}:${node.clientHeight}/${node.scrollHeight}`);
      return { clipped, pair: visible(pair) ? pair.textContent : null, round: modal.querySelector('.reveal-pair-round')?.textContent, eyebrow: modal.querySelector('.eyebrow,.mist-reveal-caption')?.textContent,
        clash: visible(clash) ? [...clash.querySelectorAll('.clash-side')].map(side => `${side.dataset.side}:${side.querySelector('.card-name')?.textContent}`) : null,
        footer: { clear, inside: rect.bottom <= innerHeight + 0.5 && rect.top >= 0, height: rect.height }, scroll: doc.scrollHeight > innerHeight + 1 || doc.scrollWidth > innerWidth + 1 };
    });
    if (tab === 'clash') assert.deepEqual(view.clash?.sort(), [`opponent:${names.opponent}`, `player:${names.player}`].sort(), `${tab}: both played cards visible`);
    else {
      assert(view.pair?.includes(names.player) && view.pair.includes(names.opponent), `${page.size} ${tab}: played pair stays visible with effects ${JSON.stringify(view)}`);
      assert.equal(view.round, `第 ${round} 回合`);
    }
    assert(view.eyebrow?.includes(`${round}`), `${tab}: reveal labelled with round ${round}`);
    assert(view.footer.clear && view.footer.inside && view.footer.height >= 43.5, `${page.size} ${tab}: Next reachable ${JSON.stringify(view.footer)}`);
    assert(!view.scroll, `${tab}: no document scroll`);
    assert.deepEqual(view.clipped, [], `${page.size} ${tab}: reveal page content must fit without scrolling`);
    const sides = new Set();
    for (let turn = 0; turn < 8; turn++) {
      const list = await page.evaluate(() => {
        const module = document.querySelector('.battle-reveal [data-viewport-module]:not([hidden])'), list = module?.querySelector('[data-viewport-list]');
        if (!list) return null;
        const frame = list.getBoundingClientRect(), items = [...list.children].filter(item => !item.hidden);
        const pager = module.querySelector('.viewport-pagination'), next = pager?.querySelector('[data-viewport-action="next"]');
        const shown = !!pager && getComputedStyle(pager).display !== 'none';
        return { page: list.dataset.page, pages: list.dataset.pageCount, overflow: list.dataset.viewportOverflow, sides: items.map(item => item.dataset.side).filter(Boolean),
          cut: items.filter(item => { const rect = item.getBoundingClientRect(); return rect.top < frame.top - 1 || rect.bottom > frame.bottom + 1; }).map(item => `${item.className} ${Math.round(item.getBoundingClientRect().height)}/${Math.round(frame.height)}`),
          pager: shown, more: shown && !!next && !next.disabled };
      });
      if (!list) break;
      list.sides.forEach(side => sides.add(side));
      assert.deepEqual([list.overflow, list.cut], ['false', []], `${page.size} ${tab} page ${list.page}/${list.pages}: items stay inside the list`);
      assert(list.pager || list.pages === '1', `${page.size} ${tab}: ${list.pages} pages but no pager`);
      if (!list.more) { assert.equal(list.page, list.pages, `${page.size} ${tab}: paged to the end`); break; }
      await press(page, page.locator('.battle-reveal [data-viewport-module]:not([hidden]) [data-viewport-action="next"]'), `${tab} 下頁`);
    }
    if (tab === 'resources') assert.deepEqual([...sides].sort(), ['opponent', 'player'], `${page.size}: both public resource panels reachable by pointer`);
    if (tab === shotTab) await shot(page, `reveal-${tab}`);
  }
  return accepted;
}

/** Next by pointer or keyboard; focus lands on the new table's Commit, never <body>. */
async function nextRound(page, { keyboard = false } = {}) {
  if (keyboard) { await page.locator('.battle-reveal [data-action="next-round"]').focus(); await page.keyboard.press('Enter'); }
  else await press(page, page.locator('[data-action="next-round"]'), 'next round');
  await page.locator('#app .battle-table[data-battle-phase="planning"]').waitFor(); await frames(page);
  const focused = await page.evaluate(() => { const node = document.activeElement; return node?.closest('#app .battle-table') ? node.dataset.action : node?.tagName; });
  assert.equal(focused, 'commit', `${page.size} ${keyboard ? 'keyboard' : 'pointer'} Next: focus returns to Commit`);
}

/** Round labels after Next: leader flipped, used marks carry the round, announcement only for a leading AI. */
async function assertNextRound(page, { round, used }) {
  const state = await saved(page);
  assert.equal(state.match.round, round);
  const announced = state.match.initiative === 'opponent' ? state.aiMove.cardId : null;
  assert(state.match.initiative !== 'opponent' || state.aiMove, 'a leading AI commits before player input');
  const metrics = await assertDecisionVisible(page, `round ${round}`, { announced, selected: state.selected });
  assert.match(await page.locator('#app .round-steps').textContent(), new RegExp(`第 ${round} /`));
  for (const [side, id] of Object.entries(used)) {
    const card = page.locator(`#battle-card-${side}-${id}`);
    assert.equal((await card.locator('.battle-mini-state').textContent()).trim(), '已出戰');
    assert.match(await card.getAttribute('aria-label'), /已出戰（第 1 回合）/);
    if (side === 'player') assert(await card.isDisabled(), 'own used card stays disabled');
  }
  assert.equal(metrics.opponentStates.filter(text => text === '本輪出戰').length, 0, 'no stale played highlight');
  return { announced, state };
}

await mkdir(output, { recursive: true });
let failure = null;
try {
  for (const [width, height] of selectedSizes) {
    const tag = `${width}x${height}`;

    // Player leads: no opponent card is highlighted; reveal → pages → Next → reload.
    let page = await open('q0-player-leads-r1', { width, height });
    assert.equal(await resume(page), 0, 'resuming a player-led round draws no RNG');
    await assertDecisionVisible(page, 'initial', { announced: null, selected: 'yaoheng' });
    await shot(page, 'initial');
    await exerciseDraft(page, { announced: null });
    await press(page, page.locator('#battle-card-player-qingxiao'), 'select qingxiao');
    await shot(page, 'selected');
    const responded = await reveal(page, { round: 1, playerCard: 'qingxiao', opponentCard: (await saved(page)).aiMove?.cardId ?? chooseAIMove(FIXTURES['q0-player-leads-r1'].match, () => 0.23, 'qingxiao').cardId });
    await shot(page, 'reveal');
    await nextRound(page);
    let next = await assertNextRound(page, { round: 2, used: { player: 'qingxiao', opponent: responded.match.lastResult.opponent.cardId } });
    assert.equal(next.state.match.initiative, 'opponent', 'leader flips after round 1');
    await page.reload(); await page.locator('.game-lobby').waitFor();
    assert.equal(await resume(page), 0, 'reload after Next keeps the saved commitment');
    assert.deepEqual((await saved(page)).aiMove, next.state.aiMove, 'announcement survives reload byte-for-byte');
    await assertNextRound(page, { round: 2, used: { player: 'qingxiao', opponent: responded.match.lastResult.opponent.cardId } });
    await shot(page, 'round2');
    await release(page);
    passed(`${tag}: player-led table shows 待對手應戰, every legal card/pill/Fury input keeps all decision inputs hit-testable, reveal pages keep the played pair, Next and reload keep labels`);

    // Opponent leads: the committed card is announced in place and centred.
    page = await open('q0-opponent-leads-r1', { width, height });
    assert.equal(await resume(page), 0);
    await assertDecisionVisible(page, 'initial', { announced: 'chiling', selected: 'yaoheng' });
    await shot(page, 'initial');
    await exerciseDraft(page, { announced: 'chiling' });
    await press(page, page.locator('#battle-card-player-qingxiao'), 'select qingxiao');
    await press(page, page.locator('[data-action="pill-plus"]'), 'pill plus');
    await inspect(page, '#battle-card-opponent-yanxin', { label: 'opponent ready card' });
    await inspect(page, '#battle-center-opponent', { keyboard: true, label: 'centre announced card' });
    await inspect(page, '#battle-center-player', { label: 'centre own card' });
    await inspect(page, '#battle-card-opponent-cuixian', { keyboard: true, label: 'opponent card by keyboard' });
    await shot(page, 'selected');
    await reveal(page, { round: 1, playerCard: 'qingxiao', opponentCard: 'chiling', keyboard: true });
    await nextRound(page, { keyboard: true });
    next = await assertNextRound(page, { round: 2, used: { player: 'qingxiao', opponent: 'chiling' } });
    assert.equal(next.announced, null, 'player leads round 2: no carried-over announcement');
    await page.reload(); await page.locator('.game-lobby').waitFor();
    assert.equal(await resume(page), 0);
    await assertNextRound(page, { round: 2, used: { player: 'qingxiao', opponent: 'chiling' } });
    await release(page);
    passed(`${tag}: opponent-led table announces the committed card in place and in the centre; inspect from lineup/centre (pointer and keyboard) restores focus, draft, saves and RNG; keyboard commit → reveal → Next returns focus to Commit → reload`);

    // Changing only the secret bid/Fury cannot change pre-reveal DOM, ARIA or announcements.
    const views = [];
    for (const name of ['q0-opponent-leads-r1', 'q0-opponent-leads-r1-altbid']) {
      page = await open(name, { width, height });
      await resume(page);
      const draws = await rng(page), initial = await publicTable(page);
      await press(page, page.locator('#battle-card-player-cangjiao'), 'select cangjiao');
      await press(page, page.locator('[data-action="pill-plus"]'), 'pill plus');
      await press(page, page.locator('[data-action="fury"]'), 'fury');
      const acted = await publicTable(page);
      assert.deepEqual((await saved(page)).aiMove, FIXTURES[name].aiMove, `${name}: commitment unchanged`);
      assert.equal(await rng(page), draws);
      views.push({ initial, acted }); await release(page);
    }
    assert.notDeepEqual(FIXTURES['q0-opponent-leads-r1'].aiMove, FIXTURES['q0-opponent-leads-r1-altbid'].aiMove);
    assert.deepEqual(views[0], views[1], `${tag}: secret bid/Fury changed pre-reveal output`);
    passed(`${tag}: different hidden AI bids/Fury give byte-identical pre-reveal table HTML, ARIA snapshot and announcer text, before and after the same actions`);

    // Mid-match: used cards keep their slot and round label and remain inspectable.
    page = await open('q0-mid-match-r3', { width, height });
    assert.equal(await resume(page), 0);
    const middle = FIXTURES['q0-mid-match-r3'];
    await assertDecisionVisible(page, 'initial', { announced: middle.aiMove.cardId, selected: 'yaoheng' });
    const usedCards = await page.locator('#app .battle-mini.is-used').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
    assert.equal(usedCards.length, 4); assert(usedCards.every(text => /已出戰（第 [12] 回合）/.test(text)));
    await exerciseDraft(page, { announced: middle.aiMove.cardId });
    await inspect(page, `#battle-card-opponent-${middle.match.opponent.used[0]}`, { label: 'used opponent card' });
    await shot(page, 'used');
    await release(page);
    passed(`${tag}: round 3 keeps used cards in dealt order with 已出戰 and round labels; remaining legal inputs stay visible together`);

    // Mist Gate: atmosphere and resonance move aside; the decision inputs still fit.
    page = await open('q0-mist-gate', { width, height });
    await resume(page);
    assert.equal(await page.locator('.game-shell.is-mist-gate').count(), 1);
    assert.deepEqual((await page.locator('#battle-card-opponent-chiling .card-stat strong').allTextContents()).map(Number), [getBattleCard(FIXTURES['q0-mist-gate'].match, 'opponent', 'chiling').power, getBattleCard(FIXTURES['q0-mist-gate'].match, 'opponent', 'chiling').damage], 'effective expedition ranks are shown');
    await exerciseDraft(page, { announced: 'chiling' });
    // Mist Gate uses the table's one selection highlight, as strong as the announced card's.
    const highlight = await page.locator('#app .player-hand .battle-mini.is-selected').evaluate(node => ({ border: getComputedStyle(node).borderTopColor, shadow: getComputedStyle(node).boxShadow }));
    assert.equal(highlight.border, 'rgb(241, 212, 150)', `${tag} Mist Gate selected border ${JSON.stringify(highlight)}`);
    assert(highlight.shadow.startsWith('rgb(241, 212, 150) 0px 0px 0px 1px'), `${tag} Mist Gate selected ring ${JSON.stringify(highlight)}`);
    await shot(page, 'mist');
    await release(page);
    passed(`${tag}: Mist Gate keeps its atmosphere and the table's selection highlight while every decision input stays visible and effective expedition stats show`);

    // A legacy snapshot without the leading commitment gets one from public state before any input.
    page = await open('q0-legacy-unannounced', { width, height });
    assert((await resume(page)) > 0, 'legacy resume commits the leading AI');
    const legacy = await saved(page);
    assert(legacy.aiMove && legacy.match.initiative === 'opponent', 'leading commitment saved before any player input');
    await assertDecisionVisible(page, 'legacy', { announced: legacy.aiMove.cardId, selected: 'yaoheng' });
    await page.reload(); await page.locator('.game-lobby').waitFor();
    assert.equal(await resume(page), 0); assert.deepEqual((await saved(page)).aiMove, legacy.aiMove);
    await release(page);
    passed(`${tag}: a legacy snapshot without the leading commitment announces one from public state before any player input; reload keeps it`);
  }

  // Motion and pace: normal motion animates, fast/reduced finish at once, all accept the same result.
  const motionSize = selectedSizes.find(([width]) => width === 390) || selectedSizes[0];
  const accepted = {};
  for (const variant of [{ name: 'normal', motion: 'no-preference', pace: 'normal' }, { name: 'fast', motion: 'no-preference', pace: 'fast' }, { name: 'reduced', motion: 'reduce', pace: 'normal' }]) {
    const page = await open('q0-opponent-leads-r1', { width: motionSize[0], height: motionSize[1], motion: variant.motion, pace: variant.pace });
    await resume(page);
    await press(page, page.locator('#battle-card-player-qingxiao'), 'select');
    await press(page, page.locator('[data-action="pill-plus"]'), 'pill plus');
    await page.evaluate(() => {
      const trace = window.revealTrace = [];
      new MutationObserver(() => { const phase = document.querySelector('.battle-reveal')?.dataset.phase; if (phase && trace.at(-1) !== phase) trace.push(phase); })
        .observe(document.querySelector('#overlay-root'), { subtree: true, childList: true, attributes: true, attributeFilter: ['data-phase'] });
    });
    await press(page, page.locator('[data-action="commit"]'), 'commit');
    if (variant.name === 'normal') {
      // Input is never blocked: the reload below interrupts a running reveal.
      assert.notEqual(await page.locator('.battle-reveal').getAttribute('data-phase'), 'complete', 'normal pace is still revealing');
      const during = await raw(page);
      await page.reload(); await page.locator('.game-lobby').waitFor(); await resume(page);
      await page.locator('.battle-reveal[data-phase="complete"]').waitFor();
      assert.deepEqual(await raw(page), during, 'mid-reveal reload resumes the accepted round without resettling');
      assert.equal(await page.locator('#app main').getAttribute('data-battle-phase'), 'reveal');
      assert.equal(await page.locator('.battle-reveal .reveal-pair-round').textContent(), '第 1 回合');
    } else {
      await page.locator('.battle-reveal[data-phase="complete"]').waitFor();
      assert.deepEqual(await page.evaluate(() => window.revealTrace), ['complete'], `${variant.name} presents the result immediately`);
    }
    accepted[variant.name] = await raw(page);
    await release(page);
  }
  assert.deepEqual(accepted.fast, accepted.normal); assert.deepEqual(accepted.reduced, accepted.normal);
  passed(`${motionSize.join('x')}: normal motion can be interrupted by reload and resumes the static accepted reveal; fast and reduced present it immediately with identical saves`);

  // Full motion across rounds. A dialog page remembered from round 1 holds the
  // winner word and gold until impact, like the heading and clash outcome; in
  // the entered round, selecting a card keeps the nodes, so no entrance replay.
  {
    const page = await open('q0-opponent-leads-r1', { width: motionSize[0], height: motionSize[1], motion: 'no-preference', pace: 'normal' });
    await resume(page);
    assert.equal(await page.evaluate(() => document.body.dataset.motion), 'full');
    // The table behind already shows the resolved round, so the backdrop covers it
    // from the first frame after Commit; only the sealed dialog fades in.
    await page.evaluate(() => document.addEventListener('click', event => {
      if (!event.target.closest?.('[data-action="commit"]')) return;
      requestAnimationFrame(() => {
        const backdrop = document.querySelector('.modal-backdrop'), dialog = document.querySelector('.battle-reveal');
        window.__firstRevealFrame = { phase: dialog?.dataset.phase, backdrop: backdrop && getComputedStyle(backdrop).opacity };
      });
    }, { capture: true, once: true }));
    await press(page, page.locator('[data-action="commit"]'), 'commit');
    const firstFrame = await page.evaluate(() => window.__firstRevealFrame);
    assert(['sealed', 'bids'].includes(firstFrame?.phase) && firstFrame.backdrop === '1', `first frame after Commit, before impact: the backdrop is already opaque over the resolved table ${JSON.stringify(firstFrame)}`);
    await page.locator('.battle-reveal[data-phase="complete"]').waitFor();
    await press(page, page.locator('.battle-reveal [data-viewport-action="module"][data-viewport-target="effects"]'), 'effects page');
    await nextRound(page);
    assert.match(await page.locator('#app main').getAttribute('class'), /\bbattle-turn-enter\b/);
    await page.evaluate(() => Promise.all([...document.querySelectorAll('#app .player-hand > .card')].flatMap(card => card.getAnimations()).map(animation => animation.finished.catch(() => {}))));
    await page.evaluate(() => { window.__ownCards = [...document.querySelectorAll('#app .player-hand > .card')]; });
    await press(page, page.locator('#battle-card-player-cangjiao'), 'select cangjiao');
    const replay = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#app .player-hand > .card')];
      return { same: cards.every((card, index) => card === window.__ownCards[index]), running: cards.flatMap(card => card.getAnimations()).filter(animation => animation.animationName === 'battle-hand-arrive' && animation.playState === 'running').length };
    });
    assert.deepEqual(replay, { same: true, running: 0 }, 'selecting a card does not replay the round-entry fade');
    await page.evaluate(() => {
      const trace = window.stageTrace = [];
      new MutationObserver(() => {
        const modal = document.querySelector('.battle-reveal'), phase = modal?.dataset.phase;
        if (!phase || trace.at(-1)?.phase === phase) return;
        const winner = modal.querySelector('.reveal-pair-side[data-winner]'), loser = modal.querySelector('.reveal-pair-side:not([data-winner])');
        trace.push({ phase, page: modal.querySelector('[data-viewport-module]:not([hidden])')?.dataset.viewportModule, pair: getComputedStyle(modal.querySelector('.reveal-played-pair')).display,
          outcome: getComputedStyle(winner.querySelector('.reveal-pair-outcome')).visibility,
          gold: getComputedStyle(winner.querySelector('b')).color !== getComputedStyle(loser.querySelector('b')).color });
      }).observe(document.querySelector('#overlay-root'), { subtree: true, childList: true, attributes: true, attributeFilter: ['data-phase'] });
    });
    await press(page, page.locator('[data-action="commit"]'), 'commit round 2');
    await page.locator('.battle-reveal[data-phase="complete"]').waitFor();
    const trace = await page.evaluate(() => window.stageTrace), at = phase => trace.find(entry => entry.phase === phase);
    assert(at('bids') && at('impact') && at('complete'), `staged phases ${JSON.stringify(trace)}`);
    assert.equal(at('bids').page, 'effects', 'the effects page is remembered across rounds');
    assert.notEqual(at('bids').pair, 'none', 'the played pair shows on the effects page');
    for (const phase of ['sealed', 'bids']) if (at(phase)) assert.deepEqual([at(phase).outcome, at(phase).gold], ['hidden', false], `${phase}: winner word and gold wait ${JSON.stringify(trace)}`);
    for (const phase of ['impact', 'complete']) assert.deepEqual([at(phase).outcome, at(phase).gold], ['visible', true], `${phase}: winner word and gold shown ${JSON.stringify(trace)}`);
    await release(page);
  }
  passed(`${motionSize.join('x')}: full motion covers the resolved table with an opaque backdrop from the first frame after Commit, keeps the winner word and gold hidden until impact on a remembered effects page; selection in an entered round does not replay the entrance fade`);

  // Fit sweep: four-character names with ✧ in every state, all inputs hit-testable.
  for (const [width, height] of sweepSizes) {
    const page = await open('q0-long-names', { width, height });
    await resume(page);
    await assertDecisionVisible(page, 'long names', { announced: 'liuer', selected: 'tieshan' });
    for (const id of LONG_HANDS.player) {
      await press(page, page.locator(`#battle-card-player-${id}`), `select ${id}`);
      await assertDecisionVisible(page, `long names select ${id}`, { announced: 'liuer', selected: id });
    }
    await press(page, page.locator('#battle-card-player-tieshan'), 'select tieshan');
    await shot(page, 'long-names');
    await reveal(page, { round: 1, playerCard: 'tieshan', opponentCard: 'liuer', shotTab: 'resources' });
    await release(page);
    const low = await open('q0-low-life', { width, height });
    await resume(low);
    await assertDecisionVisible(low, 'low life', { announced: 'chiling', selected: 'yaoheng' });
    await assertLowLifeMark(low);
    await release(low);
  }
  passed(`${sweepSizes.length} sizes (${sweepSizes.map(pair => pair.join('x')).join(', ')}): four-character names with ✧ unclipped when selected or announced and clear of their state labels; every decision input inside the viewport and hit-testable, with a whole Fury switch and no overlapping rows; no page or table overflow; low life shows 危; the reveal's pages fit, every pager is tappable and both resource panels are reachable`);

  // Finished overkill settles exactly once across Next and reload.
  const finished = FIXTURES['q0-overkill-finished'];
  const finalPage = await open('q0-overkill-finished', { width: selectedSizes[0][0], height: selectedSizes[0][1] });
  await resume(finalPage);
  await press(finalPage, finalPage.locator('[data-action="pill-plus"]'), 'pill plus');
  await press(finalPage, finalPage.locator('[data-action="fury"]'), 'fury');
  await press(finalPage, finalPage.locator('[data-action="commit"]'), 'commit');
  await finalPage.locator('.battle-reveal[data-phase="complete"]').waitFor();
  assert.equal(await finalPage.locator('#app main').getAttribute('data-battle-phase'), 'reveal');
  await press(finalPage, finalPage.locator('[data-action="next-round"]'), 'next');
  await finalPage.locator('.match-score').waitFor({ state: 'attached' });
  const settled = (await raw(finalPage)).profile;
  assert.deepEqual(JSON.parse(settled), finished.finalProfile, 'the real engine result settles once');
  await finalPage.reload(); await finalPage.locator('.game-lobby').waitFor();
  assert.equal((await raw(finalPage)).profile, settled, 'reload does not settle again');
  assert.equal(await finalPage.locator('[data-action="resume"]').count(), 0);
  await release(finalPage);
  passed('Finished overkill table settles exactly once across the result and reload');

  assert.deepEqual(errors, [], 'No page, console or network errors');
} catch (error) {
  failure = error.stack; process.exitCode = 1;
  for (const context of contexts) {
    const page = context.pages().at(-1);
    if (page && !page.isClosed()) { const file = `battle-table-${browserName}-failure-${page.size}.png`; await page.screenshot({ path: output + file }).catch(() => {}); screenshots.push(file); }
  }
} finally {
  await Promise.allSettled([...contexts].map(context => context.close()));
  const git = args => { try { return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim(); } catch { return null; } };
  const report = { ok: !failure, tool: 'tools/battle-table-smoke.mjs', source: { commit: git(['rev-parse', 'HEAD']), dirty: (git(['status', '--porcelain']) || '').split('\n').filter(Boolean) },
    browser: { name: browserName, version: browser.version() }, sizes: selectedSizes.map(pair => pair.join('x')), sweepSizes: sweepSizes.map(pair => pair.join('x')), motion: 'reduced by default; one normal, fast and reduced reveal pass', fixtures: Object.keys(FIXTURES),
    evidence: 'Headless loopback synthetic evidence; not physical iOS/Android or human review.', checks, screenshots, measurements, errors, ...(failure ? { error: failure } : {}) };
  await browser.close();
  await writeFile(`${output}battle-table-${browserName}${process.env.BATTLE_TABLE_SIZE ? `-${process.env.BATTLE_TABLE_SIZE}` : ''}.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ ok: report.ok, browser: report.browser, checks: checks.length, screenshots: screenshots.length, errors, ...(failure ? { error: failure } : {}) }, null, 2));
}
