/**
 * Q0 battle-table acceptance on a loopback server with synthetic, legal saves.
 * Asserts directly (no helper opens tabs or pages on the test's behalf) that the
 * four public opponent cards, the announced/awaiting confrontation, the player's
 * four cards and selection, and the move controls are visible together with real
 * elementFromPoint hit tests; that secret AI bids/Fury never change pre-reveal
 * DOM/ARIA; that inspection keeps focus, draft, saves and RNG; and that reveal,
 * Next and reload keep round/card labels. Headless engines only: physical
 * iOS/Android and human review are separate evidence.
 * Usage: GAME_URL=http://127.0.0.1:<port> [BROWSER=webkit] [BATTLE_TABLE_SIZE=360x640] node tools/battle-table-smoke.mjs
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
assert(selectedSizes.length, 'BATTLE_TABLE_SIZE must name one supported size');
const checks = [], screenshots = [], errors = [], measurements = [], contexts = new Set();
const passed = label => { checks.push(label); console.log(`PASS ${label}`); };

// Named legal fixtures. Hands are fixed so labels and stats are predictable; the
// real engine resolves every expected round. The longest authored opponent name
// exercises the narrowest identity column.
const HANDS = { player: ['yaoheng', 'qingxiao', 'yanxin', 'cangjiao'], opponent: ['yanxin', 'chiling', 'yaoheng', 'cuixian'] };
const LONGEST_NAME = '五莊迎風童子';
function table({ kind = 'arena', nodeId = null, initiative, opponentName = null, opponentLevels = {}, opponentHP = 12 }) {
  const started = beginBattle(createProfile({ now }), { kind, nodeId, now });
  const match = createMatch({ mode: kind, rng: () => 0.23, opponentName, opponentLevels });
  match.player = { hp: 12, pills: 12, hand: [...HANDS.player], used: [] };
  match.opponent = { hp: opponentHP, pills: 12, hand: [...HANDS.opponent], used: [] };
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
  let middle = table({ initiative: 'opponent' });
  const r1 = resolveRound(middle.match, { cardId: 'qingxiao', pills: 2, fury: false }, announced);
  const r2 = resolveRound(r1, { cardId: 'yanxin', pills: 1, fury: false }, chooseAIMove(r1, () => 0.23, 'yanxin'));
  assert.equal(r2.status, 'playing'); assert.equal(r2.round, 3); assert.equal(r2.initiative, 'opponent');
  const mist = table({ kind: 'expedition', nodeId: 'mist-gate', initiative: 'opponent', opponentName: '守渡弈者', opponentLevels: { chiling: 3 } });
  const legacy = table({ initiative: 'opponent' });
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
      }
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

/** Choose each legal card and adjust pills/Fury with real input; check after every action. */
async function exerciseDraft(page, { announced }) {
  const before = await raw(page), draws = await rng(page), { match } = await saved(page);
  const legal = match.player.hand.filter(id => !match.player.used.includes(id));
  let metrics;
  for (const id of legal) {
    await press(page, page.locator(`#battle-card-player-${id}`), `select ${id}`);
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

/** Commit, then walk every reveal page: played cards stay visible with lastResult labels. */
async function reveal(page, { round, playerCard, opponentCard }) {
  await press(page, page.locator('[data-action="commit"]'), 'commit');
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
  }
  return accepted;
}

async function nextRound(page) {
  await press(page, page.locator('[data-action="next-round"]'), 'next round');
  await page.locator('#app .battle-table[data-battle-phase="planning"]').waitFor(); await frames(page);
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
    await reveal(page, { round: 1, playerCard: 'qingxiao', opponentCard: 'chiling' });
    await nextRound(page);
    next = await assertNextRound(page, { round: 2, used: { player: 'qingxiao', opponent: 'chiling' } });
    assert.equal(next.announced, null, 'player leads round 2: no carried-over announcement');
    await page.reload(); await page.locator('.game-lobby').waitFor();
    assert.equal(await resume(page), 0);
    await assertNextRound(page, { round: 2, used: { player: 'qingxiao', opponent: 'chiling' } });
    await release(page);
    passed(`${tag}: opponent-led table announces the committed card in place and in the centre; inspect from lineup/centre (pointer and keyboard) restores focus, draft, saves and RNG; reveal → Next → reload`);

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
    await shot(page, 'mist');
    await release(page);
    passed(`${tag}: Mist Gate keeps its atmosphere while every decision input stays visible and effective expedition stats show`);

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
    browser: { name: browserName, version: browser.version() }, sizes: selectedSizes.map(pair => pair.join('x')), motion: 'reduced by default; one normal, fast and reduced reveal pass', fixtures: Object.keys(FIXTURES),
    evidence: 'Headless loopback synthetic evidence; not physical iOS/Android or human review.', checks, screenshots, measurements, errors, ...(failure ? { error: failure } : {}) };
  await browser.close();
  await writeFile(`${output}battle-table-${browserName}${process.env.BATTLE_TABLE_SIZE ? `-${process.env.BATTLE_TABLE_SIZE}` : ''}.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ ok: report.ok, browser: report.browser, checks: checks.length, screenshots: screenshots.length, errors, ...(failure ? { error: failure } : {}) }, null, 2));
}
