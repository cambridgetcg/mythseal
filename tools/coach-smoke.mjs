/**
 * D3 first-battle teaching acceptance (docs/BATTLE-LAYOUT-PLAN.md#first-battle-teaching--2026-10-12)
 * on a loopback server with synthetic saves. Phone emulation: Chromium (installed Google
 * Chrome) with Playwright's Pixel 7 descriptor, then WebKit with its iPhone 15 descriptor.
 * page.goBack() is the browser's Back; every other input is a real tap.
 *
 * Asserts: on the first ever battle (the first 霧隱渡口 encounter of a fresh journey) four
 * coach marks appear in order (pick a card → pills → commit → read the reveal), each
 * advanced by tapping the control it teaches, which a hit test at its centre reaches
 * first; the move panel's formula states the engine's own attack for the draft; after the
 * round-1 reveal the tip's remaining pills equal the saved match state; 繼續 completes
 * the coach; 跳過 ends every mark at once; Back closes the table's mark (then the next
 * Back opens the battle menu as before) and the reveal's mark (then the result holds) as
 * one layer each; after completion or skip, also after a reload and in a restarted first
 * battle, no mark returns; a later battle or a first practice match shows none but keeps
 * the visible planning hint (taller than 1 px); every teaching element leaves the profile
 * bytes unchanged and writes only its own device-local key; a match result opens on
 * 勝負已定 (悟 and its advice after a loss) even after the previous result was left on
 * 旅途所得. Review round 1 added: 預計 on a draft a hidden reply could change, and the
 * announced card's formula in an opponent-led round; on a 360 px phone (360×640, and
 * 360×560 where the player's caption yields) every mark's copy fits its two lines and,
 * with Fury on, the cost line shows 剩 N 丹 whole while the Fury note states the damage
 * inside its button (also on the device); with full motion, Back while the round-1 reveal
 * animates holds the result and skips nothing, and mark ④ then shows. Review round 2
 * added: ② is never skipped (＋ or the slider on ① shows ②; a round 1 committed straight
 * from ① shows ④, then round 2 opens on ②, also after a reload, and its commit completes
 * the coach); at 340–354 px every copy fits three lines inside the 44 px status row, which
 * never grows; and every coach check first waits for the table's entry animations to end,
 * so no box is measured mid-translate. Review round 3 added: a reload resumes the mark it
 * interrupted (② or ③ in round 1, so a commit after them owes nothing, also at 12 pills);
 * after 知道了 closed ④ with ② owed, a reload in the reveal shows no ④, Back holds the
 * result and round 2 still opens on ②; the owed ② counts the three rounds left
 * (十二丹撐三回合); the record keeps {"step":"pills","owed":"pills"} while that ② shows.
 * Review round 4 added: one slider gesture moves the coach by one mark at most (a page.mouse
 * drag on ①, an input event per value, leaves ② on screen while held and after release; a
 * held arrow key too; the next gesture shows ③); a new first battle over an abandoned one's
 * ③ starts at ① and writes {}; the owed ② is announced with its exact sentence; and N1's
 * narrower phones (302×640, 320×568) are measured: every copy fits three lines, and the cost
 * line shows the widest form that fits, always ending 剩 N 丹 whole, also with Fury on.
 * Headless engines only: the owner's playtest with first-time players is the real exit
 * (docs/VALIDATION.md).
 * Usage: GAME_URL=http://127.0.0.1:<port> [BROWSER=webkit] node tools/coach-smoke.mjs
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { viewportFrames, revealViewportItem } from './viewport-browser-helpers.mjs';
import { RULES, createMatch, resolveRound } from '../engine.mjs';
import { createProfile, beginBattle, PROFILE_KEY } from '../progression.mjs';
import { NAV_STATE_KEY } from '../nav-stack.mjs';
import { COACH_KEY } from '../battle-teaching.mjs';

const browserName = process.env.BROWSER || 'chromium';
if (!['chromium', 'webkit'].includes(browserName)) throw Error('BROWSER must be chromium or webkit.');
const runtime = fileURLToPath(new URL('../test-results/webkit-runtime', import.meta.url));
if (browserName === 'webkit' && !process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(runtime)) process.env.PLAYWRIGHT_BROWSERS_PATH = runtime;
const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
if (!process.env.GAME_URL) throw Error('Set GAME_URL to the loopback server serving this checkout, e.g. GAME_URL=http://127.0.0.1:4177.');
const base = new URL(process.env.GAME_URL);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) throw Error('Coach smoke requires a loopback GAME_URL.');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const deviceName = browserName === 'webkit' ? 'iPhone 15' : 'Pixel 7';
const device = engines.devices[deviceName];
const now = '2026-09-22T12:00:00.000Z', battleKey = 'shanhai.battle.v5', preferenceKey = 'shanhai.experience.v1';
const checks = [], errors = [], contexts = new Set();
const passed = label => { checks.push(label); console.log(`PASS ${deviceName}: ${label}`); };

// ── Fixtures: legal synthetic saves built with the real rules ──────────────────────
function veteran() {
  // One battle already played: the next 霧隱渡口 encounter is not the first battle.
  const profile = createProfile({ now });
  return { ...profile, stats: { ...profile.stats, played: 1 } };
}
function finalArena() {
  // As tools/back-smoke.mjs: an arena round the player's preset move wins outright.
  const started = beginBattle(createProfile({ now }), { kind: 'arena', now });
  const match = createMatch({ mode: 'arena', rng: () => 0.23 });
  match.player = { hp: 12, pills: 12, hand: ['yaoheng', 'qingxiao', 'yanxin', 'cangjiao'], used: [] };
  match.opponent = { hp: 1, pills: 12, hand: ['yanxin', 'chiling', 'yaoheng', 'cuixian'], used: [] };
  match.initiative = 'opponent';
  const opener = { cardId: 'yanxin', pills: 0, fury: false }, killing = { cardId: 'qingxiao', pills: 1, fury: true };
  assert.equal(resolveRound(match, killing, opener).winner, 'player');
  return {
    profile: JSON.stringify(started.profile),
    battle: JSON.stringify({ match, encounter: started.encounter, selected: killing.cardId, pills: killing.pills, fury: killing.fury, aiMove: opener, revealPending: false, recorded: false, lastReward: null }),
  };
}
const FIXTURES = { fresh: { profile: null, battle: null }, veteran: { profile: JSON.stringify(veteran()), battle: null }, final: finalArena() };

// ── Pages ───────────────────────────────────────────────────────────────────────
const browser = await engines[browserName].launch({ headless: true, ...(browserName === 'chromium' && existsSync(chrome) ? { executablePath: chrome } : {}) });
const version = browser.version();
/** size: a viewport in place of the device's (same engine, touch and user agent).
 * motion: full motion and normal pace, so the round reveal animates. */
async function open(name, { size = null, motion = false } = {}) {
  const fixture = FIXTURES[name];
  const context = await browser.newContext({ ...device, ...(size ? { viewport: size, screen: size } : {}), reducedMotion: motion ? 'no-preference' : 'reduce' });
  contexts.add(context);
  await context.addInitScript(({ fixture, keys, now, motion }) => {
    const NativeDate = Date, fixed = new NativeDate(now).getTime();
    globalThis.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } };
    Math.random = () => 0.23;
    if (!localStorage.getItem('coach-smoke.seeded')) {
      localStorage.setItem('coach-smoke.seeded', 'yes');
      if (fixture.profile) localStorage.setItem(keys.profile, fixture.profile);
      if (fixture.battle) localStorage.setItem(keys.battle, fixture.battle);
      localStorage.setItem(keys.preferences, JSON.stringify({ sound: false, ambience: 0.35, effects: 0.6, ...(motion ? { motion: 'system', pace: 'normal' } : { motion: 'reduce', pace: 'fast' }) }));
    }
    // Every localStorage write, by key, so a teaching element can be shown to write only its own key.
    const nativeSet = Storage.prototype.setItem, nativeRemove = Storage.prototype.removeItem;
    window.coachSmokeWrites = [];
    Storage.prototype.setItem = function(key, value) { nativeSet.call(this, key, value); if (this === localStorage) window.coachSmokeWrites.push(String(key)); };
    Storage.prototype.removeItem = function(key) { nativeRemove.call(this, key); if (this === localStorage) window.coachSmokeWrites.push(`-${key}`); };
  }, { fixture, keys: { profile: PROFILE_KEY, battle: battleKey, preferences: preferenceKey }, now, motion });
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
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(`${name}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`${name} console: ${message.text()}`); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${new URL(response.url()).pathname}`); });
  await page.goto(base.href); await page.locator('.game-lobby').waitFor();
  return page;
}
async function release(page) { const context = page.context(); await context.close(); contexts.delete(context); }

const stored = (page, key) => page.evaluate(key => localStorage.getItem(key), key);
const coachRecord = async page => JSON.parse(await stored(page, COACH_KEY) ?? 'null');
const depth = page => page.evaluate(key => history.state?.[key]?.depth ?? null, NAV_STATE_KEY);
async function settleDepth(page, expected, label) {
  await page.waitForFunction(({ key, expected }) => history.state?.[key]?.depth === expected, { key: NAV_STATE_KEY, expected }, { timeout: 4000 })
    .catch(async () => assert.fail(`${label}: history entry depth ${expected} (now ${await depth(page)})`));
}
const tap = async (page, selector) => { await page.locator(selector).first().tap(); await viewportFrames(page); };
const planning = page => page.locator('#app .battle-table[data-battle-phase="planning"]').waitFor();

async function startFirstJourneyBattle(page) {
  await tap(page, '.game-lobby [data-action="continue-journey"]');
  await page.locator('#overlay-root .encounter-prep [data-action="confirm-start"]').waitFor();
  await tap(page, '#overlay-root [data-action="confirm-start"]');
  await planning(page);
  assert.equal(JSON.parse(await stored(page, battleKey)).encounter.nodeId, 'mist-gate');
}
async function abandonToLobby(page) {
  await tap(page, '.game-header [data-action="battle-menu"]');
  await tap(page, '#overlay-root [data-action="abandon-navigate"]');
  await page.locator('.game-lobby').waitFor();
}

/** Waits until no finite animation runs (the table's 3 px entry translate leaves sub-pixel
 * boxes mid-flight); the coach outline's glow is infinite, so it never counts. */
const settled = page => page.waitForFunction(() => document.getAnimations().every(animation => animation.playState !== 'running' || animation.effect?.getComputedTiming().endTime === Infinity), null, { timeout: 4000 });
/** The table's teaching state, read from the DOM alone, once the entry animations are over. */
const tableState = async page => { await settled(page); return page.evaluate(() => {
  const table = document.querySelector('#app .battle-table'), hint = table?.querySelector('[data-battle-hint]');
  const box = node => { if (!node) return null; const rect = node.getBoundingClientRect(); return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }; };
  const style = hint ? getComputedStyle(hint) : null;
  return {
    phase: table?.dataset.battlePhase ?? null, step: table?.dataset.coachStep ?? null,
    coach: hint?.dataset.battleCoach ?? null, hintText: hint?.querySelector('.battle-coach-text')?.textContent ?? hint?.textContent ?? null,
    hint: box(hint), hintVisible: !!hint && style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) > 0 && !hint.closest('.sr-only'),
    hintClipped: !!hint && hint.scrollHeight > hint.clientHeight + 1, status: box(table?.querySelector('.battle-status')),
    skip: box(table?.querySelector('[data-action="coach-skip"]')), history: box(table?.querySelector('[data-action="history"]')),
    viewport: { width: innerWidth, height: innerHeight }, overflow: document.documentElement.scrollWidth > innerWidth + 1,
  };
}); };
function assertHintVisible(state, label) {
  assert.ok(state.hintVisible, `${label}: the hint line is displayed and visible`);
  assert.ok(state.hint.height > 1 && state.hint.width > 1, `${label}: the hint has a visible box (${JSON.stringify(state.hint)})`);
  assert.ok(state.hint.top >= 0 && state.hint.bottom <= state.viewport.height && state.hint.left >= 0 && state.hint.right <= state.viewport.width, `${label}: the hint is inside the viewport`);
  assert.ok(state.hint.top >= state.status.top - 0.5 && state.hint.bottom <= state.status.bottom + 0.5, `${label}: the hint stays in the status row`);
  assert.equal(state.overflow, false, `${label}: no horizontal page overflow`);
}
async function assertCoach(page, step, label) {
  const state = await tableState(page);
  assert.equal(state.step, step, `${label}: the table is on coach mark ${step}`);
  assert.equal(state.coach, step);
  assertHintVisible(state, label);
  assert.equal(state.hintClipped, false, `${label}: the whole coach sentence shows`);
  assert.ok(state.skip && state.skip.width >= 44 && state.skip.height >= 44, `${label}: 跳過 is a 44 px target`);
  assert.ok(state.skip.right <= state.history.left + 0.5, `${label}: 跳過 does not overlap 對弈紀錄`);
  return state;
}
async function assertNoCoach(page, label) {
  const state = await tableState(page);
  assert.equal(state.step, null, `${label}: no coach mark on the table`);
  assert.equal(state.coach, null);
  assert.equal(state.skip, null);
  assert.equal(await page.locator('#app [data-battle-coach]').count(), 0);
  assertHintVisible(state, label);
  assert.match(state.hintText, /^選一張戰卡 → 定仙丹 → /, `${label}: the planning hint says what to do now`);
  return state;
}
/** A real hit test at the centre of the taught control: the control (or a child) is what a tap reaches. */
async function assertReachable(page, selector, label) {
  const result = await page.evaluate(selector => {
    const controls = [...document.querySelectorAll(selector)].filter(node => !node.disabled && node.getClientRects().length);
    return controls.map(node => {
      const rect = node.getBoundingClientRect(), x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
      const hit = document.elementFromPoint(x, y);
      return { inside: x >= 0 && y >= 0 && x <= innerWidth && y <= innerHeight, reached: !!hit && node.contains(hit), hit: hit?.className || hit?.tagName };
    });
  }, selector);
  assert.ok(result.length, `${label}: ${selector} is on screen`);
  for (const item of result) {
    assert.ok(item.inside, `${label}: ${selector} is inside the viewport`);
    assert.ok(item.reached, `${label}: a tap at the centre of ${selector} reaches it (hit ${item.hit})`);
  }
}
/** The move panel states the engine's own attack for the current draft. `exact` and
 * `leader`, when given, pin the case a check is meant to cover. */
async function assertFormula(page, label, { exact = null, leader = null } = {}) {
  const view = await page.evaluate(async battleKey => {
    const { previewMove, resolveRound } = await import('./engine.mjs');
    const saved = JSON.parse(localStorage.getItem(battleKey)), match = saved.match;
    const cardId = document.querySelector('.player-hand [aria-pressed="true"]')?.dataset.id;
    const pills = Number(document.querySelector('#pill-amount').textContent), fury = document.querySelector('[data-action="fury"]').getAttribute('aria-pressed') === 'true';
    const draft = { cardId, pills, fury };
    // The smoke may read the stored AI move; the page only ever shows its announced card.
    const expected = match.initiative === 'opponent' ? resolveRound(match, draft, saved.aiMove).lastResult.player.attack : previewMove(match, 'player', draft).attack;
    const cell = document.querySelector('.attack-preview'), line = document.querySelector('#attack-formula');
    const range = document.createRange(); range.selectNodeContents(line);
    const text = range.getBoundingClientRect(), box = cell.getBoundingClientRect();
    return { expected, shown: document.querySelector('#attack-value').textContent, formula: line.textContent, exact: cell.dataset.attackExact, pills, leader: match.initiative,
      fits: text.left >= box.left - 0.5 && text.right <= box.right + 0.5 && text.height <= parseFloat(getComputedStyle(line).fontSize) * 2.2 };
  }, battleKey);
  assert.equal(view.shown, String(view.expected), `${label}: the estimate is the engine's attack (${JSON.stringify(view)})`);
  assert.ok(view.formula.includes(`${view.pills}丹`) || view.formula.includes(`${view.pills} 丹`) || view.formula.includes(`×${view.pills + 1}`), `${label}: the formula shows the pills (${view.formula})`);
  assert.ok(view.formula.includes('×'), `${label}: the formula shows the multiplier`);
  assert.equal(view.formula.startsWith('預計'), view.exact === 'false', `${label}: 預計 marks exactly the numbers a hidden reply could change`);
  if (view.leader === 'opponent') {
    assert.equal(view.exact, 'true', `${label}: an announced card makes the number exact`);
    assert.ok(view.formula.includes('已計對手亮牌'), `${label}: the announced card's effects are counted (${view.formula})`);
  }
  if (exact !== null) assert.equal(view.exact, String(exact), `${label}: ${exact ? 'an exact number' : 'a number a hidden reply could change'} (${view.formula})`);
  if (exact === false) assert.ok(view.formula.startsWith('預計'), `${label}: the visible line starts with 預計 (${view.formula})`);
  if (leader) assert.equal(view.leader, leader, `${label}: the ${leader} leads this round`);
  assert.ok(view.fits, `${label}: the formula fits its cell on one line`);
  return view;
}
/** With Fury on, the cost line shows the pills left whole (it is what carries them where the
 * player's caption yields), and the Fury toggle's note states the engine's damage inside its
 * button, clear of the switch. The cost line shows the widest of its forms that fits its cell
 * (review round 4: below 340 px only a shorter one fits); `full` requires the widest. */
async function assertFuryLines(page, label, { full = true } = {}) {
  const view = await page.evaluate(async battleKey => {
    const { previewMove, resolveRound } = await import('./engine.mjs');
    const saved = JSON.parse(localStorage.getItem(battleKey)), match = saved.match;
    const cardId = document.querySelector('.player-hand [aria-pressed="true"]')?.dataset.id;
    const pills = Number(document.querySelector('#pill-amount').textContent), fury = document.querySelector('.move-panel [data-action="fury"]');
    const draft = { cardId, pills, fury: fury.getAttribute('aria-pressed') === 'true' };
    const engine = match.initiative === 'opponent' ? resolveRound(match, draft, saved.aiMove).lastResult.player : previewMove(match, 'player', draft);
    const cost = document.querySelector('.move-panel #cost-note'), note = fury.querySelector('small'), track = fury.querySelector('.toggle-track');
    const box = fury.getBoundingClientRect(), noteBox = note.getBoundingClientRect(), trackBox = track.getBoundingClientRect();
    const spent = engine.cost, left = `剩 ${match.player.pills - spent} 丹`, shown = cost.textContent;
    const forms = [`共消耗 ${spent} 丹 · ${left}`, `消耗 ${spent} 丹 · ${left}`, `耗 ${spent} 丹 · ${left}`, `耗 ${spent} · ${left}`, left];
    const scroll = cost.scrollWidth, client = cost.clientWidth;
    // Would a wider form than the one shown fit? (Measured, then the shown text is put back.)
    const widerFits = forms.slice(0, Math.max(0, forms.indexOf(shown))).filter(form => { cost.textContent = form; return cost.scrollWidth <= cost.clientWidth + 0.5; });
    cost.textContent = shown;
    return { size: `${innerWidth}x${innerHeight}`, pressed: draft.fury, damage: engine.damage, spent, reserve: match.player.pills - spent, forms, widerFits, cost: shown, scroll, client,
      note: note.textContent, noteInside: noteBox.left >= box.left - 0.5 && noteBox.right <= box.right + 0.5 && noteBox.width > 0,
      clearOfTrack: noteBox.right <= trackBox.left + 0.5 || noteBox.bottom <= trackBox.top + 0.5 || noteBox.top >= trackBox.bottom - 0.5, trackInside: trackBox.right <= box.right + 0.5 && trackBox.left >= box.left - 0.5 };
  }, battleKey);
  const at = `${label} (${view.size})`;
  assert.equal(view.pressed, true, `${at}: Fury is on`);
  assert.ok(view.forms.includes(view.cost) && view.cost.endsWith(`剩 ${view.reserve} 丹`), `${at}: the cost line holds the cost and the pills left (${view.cost})`);
  if (full) assert.equal(view.cost, `共消耗 ${view.spent} 丹 · 剩 ${view.reserve} 丹`, `${at}: the cell is wide enough for the whole cost line`);
  assert.ok(view.scroll <= view.client + 0.5, `${at}: the cost line shows 剩 ${view.reserve} 丹 whole with Fury on (${view.scroll} > ${view.client}: ${view.cost})`);
  assert.deepEqual(view.widerFits, [], `${at}: the cost line is the widest form that fits (${view.cost})`);
  assert.match(view.note, new RegExp(`^另付 ${RULES.furyCost} 丹 · (傷害|預計傷) ${view.damage}$`), `${at}: the Fury note states the damage a win deals (${view.note})`);
  assert.ok(view.noteInside && view.clearOfTrack && view.trackInside, `${at}: the Fury note stays inside its button, clear of the switch (${JSON.stringify(view)})`);
}
/** The round-reveal tip states the saved match's remaining pills; returns the tip node's data. */
async function assertRevealTip(page, label) {
  await page.locator('#overlay-root .battle-reveal[data-reveal-state="complete"]').waitFor();
  await viewportFrames(page);
  const view = await page.evaluate(battleKey => {
    const saved = JSON.parse(localStorage.getItem(battleKey)), tip = document.querySelector('#overlay-root [data-reveal-tip]');
    const rect = tip?.getBoundingClientRect(), style = tip && getComputedStyle(tip);
    return { opponent: saved.match.opponent.pills, player: saved.match.player.pills, round: saved.match.lastResult.round, revealPending: saved.revealPending,
      tipPills: tip?.dataset.opponentPills, text: tip?.querySelector('.battle-reveal-tip-text')?.textContent, kind: tip?.dataset.tipKind,
      visible: !!tip && style.display !== 'none' && style.visibility === 'visible' && rect.height > 1 && rect.top >= 0 && rect.bottom <= innerHeight };
  }, battleKey);
  assert.equal(view.revealPending, true);
  assert.ok(view.visible, `${label}: the tip shows once the reveal completes`);
  assert.equal(view.tipPills, String(view.opponent), `${label}: the tip's remaining pills equal match state`);
  assert.ok(view.text.startsWith(`對手剩 ${view.opponent} 丹 · 你剩 ${view.player} 丹 · `), `${label}: ${view.text}`);
  return view;
}
/** Run a teaching action: the profile bytes stay the same and only the coach key is written. */
async function teaching(page, label, action) {
  const before = await stored(page, PROFILE_KEY), battle = await stored(page, battleKey);
  await page.evaluate(() => { window.coachSmokeWrites = []; });
  await action();
  await viewportFrames(page);
  const writes = await page.evaluate(() => window.coachSmokeWrites);
  assert.equal(await stored(page, PROFILE_KEY), before, `${label}: the profile bytes are unchanged`);
  assert.equal(await stored(page, battleKey), battle, `${label}: the battle snapshot is unchanged`);
  assert.deepEqual([...new Set(writes)], writes.length ? [COACH_KEY] : [], `${label}: writes only ${COACH_KEY} (${writes.join(', ')})`);
}

try {
  // ── 1. The whole coach on the first ever battle, completed by playing round 1 ──────
  {
    const page = await open('fresh');
    assert.equal(await coachRecord(page), null);
    await startFirstJourneyBattle(page);
    const start = await assertCoach(page, 'card', 'first battle');
    assert.ok(start.hint.height > 1);
    await settleDepth(page, 2, 'the battle and its coach mark');
    const profile = await stored(page, PROFILE_KEY);
    await assertReachable(page, '.player-hand [data-action="select"]', 'mark ① pick a card');
    await assertFormula(page, 'mark ①');
    // Tap the card that is not selected yet.
    const other = await page.locator('.player-hand [data-action="select"][aria-pressed="false"]:not([disabled])').first().getAttribute('data-id');
    await tap(page, `.player-hand [data-action="select"][data-id="${other}"]`);
    assert.equal(await page.locator(`.player-hand [data-id="${other}"]`).getAttribute('aria-pressed'), 'true', 'the tapped card is selected');
    await assertCoach(page, 'pills', 'after picking a card');
    assert.match((await tableState(page)).hintText, /攻擊＝力×（1＋丹）。十二丹撐四回合/, 'mark ② says what pills do, over the four rounds');
    await assertReachable(page, '.move-panel [data-action="pill-plus"]', 'mark ② add pills');
    await tap(page, '.move-panel [data-action="pill-plus"]');
    await assertCoach(page, 'commit', 'after adding a pill');
    await tap(page, '.move-panel [data-action="pill-plus"]');
    assert.equal(await page.locator('#pill-amount').textContent(), '2');
    await assertFormula(page, 'two pills');
    // 青霄's 凌霄 (power +1) is lost if the opponent answers with 霜璃 (照心), still in its open hand: 預計.
    const hands = JSON.parse(await stored(page, battleKey)).match;
    assert.ok(hands.player.hand.includes('qingxiao') && hands.opponent.hand.includes('shuangli') && hands.initiative === 'player', 'the first battle holds 青霄 against an open 霜璃, with the player leading');
    await tap(page, '.player-hand [data-action="select"][data-id="qingxiao"]');
    await assertCoach(page, 'commit', 'a later card change keeps mark ③');
    await assertFormula(page, '青霄 before the opponent plays', { exact: false, leader: 'player' });
    await assertReachable(page, '.move-panel [data-action="commit"]', 'mark ③ commit');
    assert.equal(await stored(page, PROFILE_KEY), profile, 'picking, pills and marks ①–③ leave the profile bytes unchanged');
    await settleDepth(page, 2, 'marks ①–③ share one layer');
    await tap(page, '.move-panel [data-action="commit"]');
    const tip = await assertRevealTip(page, 'round 1 with the coach');
    assert.equal(tip.round, 1);
    const reveal = page.locator('#overlay-root .battle-reveal');
    await reveal.locator('[data-battle-coach="reveal"]').waitFor();
    assert.ok(await reveal.locator('[data-battle-coach="reveal"]').isVisible(), 'mark ④ reads the reveal');
    assert.ok(await reveal.locator('[data-action="coach-done"]').isVisible(), '知道了 is offered');
    await assertReachable(page, '#overlay-root [data-action="next-round"]', 'mark ④ next round');
    await settleDepth(page, 3, 'the reveal and its coach mark');
    assert.deepEqual(await coachRecord(page), { step: 'reveal' }, 'before an ending only the mark reached is kept');
    await tap(page, '#overlay-root [data-action="next-round"]');
    await planning(page);
    assert.deepEqual(await coachRecord(page), { firstBattle: 'done' });
    await assertNoCoach(page, 'round 2 after completion');
    await settleDepth(page, 1, 'the coach layer is gone');
    assert.equal(await stored(page, PROFILE_KEY), profile, 'completing the coach leaves the profile bytes unchanged');
    // Round 2: the opponent leads, so its announced card's effects count and every open draft is exact.
    for (const id of await page.locator('.player-hand [data-action="select"]:not([disabled])').evaluateAll(nodes => nodes.map(node => node.dataset.id))) {
      await tap(page, `.player-hand [data-action="select"][data-id="${id}"]`);
      await assertFormula(page, `opponent-led round 2 with ${id}`, { exact: true, leader: 'opponent' });
    }
    passed('on the first battle marks ① card → ② pills (with what they do) → ③ commit → ④ reveal appear in order, each taught control reachable by a tap; the formula equals the engine (預計 for 青霄 against an open 霜璃; the announced card counted in opponent-led round 2); the round-1 tip states match-state pills; 繼續 completes the coach without a profile write');

    // Never again: after a reload, and in a restarted first battle (an abandoned battle is not a played one).
    await page.reload(); await page.locator('.game-lobby').waitFor();
    await tap(page, '.game-lobby [data-action="resume"]');
    await planning(page);
    await assertNoCoach(page, 'resumed after completion');
    await abandonToLobby(page);
    assert.equal(JSON.parse(await stored(page, PROFILE_KEY)).stats.played, 0, 'still no finished battle');
    await startFirstJourneyBattle(page);
    await assertNoCoach(page, 'a restarted first battle after completion');
    passed('after completion no mark returns, after a reload or in a restarted first battle');
    await release(page);
  }

  // ── 2. 跳過 ends every mark at once, for good ───────────────────────────────────────
  {
    const page = await open('fresh');
    await startFirstJourneyBattle(page);
    await assertCoach(page, 'card', 'before 跳過');
    await settleDepth(page, 2, 'the battle and its coach mark');
    await teaching(page, '跳過', () => tap(page, '#app [data-action="coach-skip"]'));
    await assertNoCoach(page, 'after 跳過');
    assert.deepEqual(await coachRecord(page), { firstBattle: 'skipped' });
    await settleDepth(page, 1, '跳過 walks back over the coach entry');
    // A pill no longer brings a mark back.
    await tap(page, '.move-panel [data-action="pill-plus"]');
    await assertNoCoach(page, 'a pill after 跳過');
    await page.reload(); await page.locator('.game-lobby').waitFor();
    await tap(page, '.game-lobby [data-action="resume"]');
    await planning(page);
    assert.equal(JSON.parse(await stored(page, battleKey)).match.history.length, 0, 'still round 1, where the coach would start');
    await assertNoCoach(page, 'round 1 resumed after 跳過 and a reload');
    await abandonToLobby(page);
    await startFirstJourneyBattle(page);
    await assertNoCoach(page, 'a restarted first battle after 跳過');
    passed('one 跳過 ends every mark, writes only its own key and no profile byte; no mark returns after a reload or in a restarted first battle');
    await release(page);
  }

  // ── 3. Back closes a coach mark as one layer, on the table and over the reveal ─────
  {
    const page = await open('fresh');
    await startFirstJourneyBattle(page);
    await assertCoach(page, 'card', 'before Back');
    await settleDepth(page, 2, 'the battle and its coach mark');
    await teaching(page, 'Back on the table mark', async () => { await page.goBack(); await settleDepth(page, 1, 'Back closes the coach mark'); });
    await assertNoCoach(page, 'after Back');
    assert.equal(await page.locator('#overlay-root .modal').count(), 0, 'one Back closed only the coach mark');
    assert.deepEqual(await coachRecord(page), { firstBattle: 'skipped' });
    await page.goBack();
    await page.locator('#overlay-root [data-action="abandon-navigate"]').waitFor();
    passed('Back on the table closes the coach mark as one layer (recorded as 跳過); the next Back opens the battle menu as before');
    await release(page);
  }
  {
    const page = await open('fresh');
    await startFirstJourneyBattle(page);
    await assertCoach(page, 'card', 'commit straight away');
    await tap(page, '.move-panel [data-action="commit"]');
    await assertRevealTip(page, 'round 1 committed from mark ①');
    await page.locator('#overlay-root [data-battle-coach="reveal"]').waitFor();
    assert.deepEqual(await coachRecord(page), { step: 'reveal', owed: 'pills' }, 'a commit from ① owes ②');
    await settleDepth(page, 3, 'the reveal and its coach mark');
    await teaching(page, 'Back on the reveal mark', async () => { await page.goBack(); await settleDepth(page, 2, 'Back closes the reveal mark'); });
    assert.equal(await page.locator('#overlay-root [data-battle-coach]').count(), 0, 'the reveal mark is gone');
    assert.equal(await page.locator('#overlay-root [data-action="coach-done"]').count(), 0);
    assert.ok(await page.locator('#overlay-root .battle-reveal [data-reveal-tip]').isVisible(), 'the tip stays');
    assert.deepEqual(await coachRecord(page), { firstBattle: 'skipped' });
    await page.goBack(); await settleDepth(page, 2, 'the result holds');
    assert.equal(await page.locator('#overlay-root .battle-reveal').count(), 1, 'the next Back holds the round result');
    await tap(page, '#overlay-root [data-action="next-round"]');
    await planning(page);
    await assertNoCoach(page, 'round 2 after Back on the reveal');
    passed('Back over the round reveal closes its coach mark as one layer, the tip stays and the result then holds');
    await release(page);
  }

  // ── 3b. Review round 2: ② is never skipped. A round 1 committed straight from ① owes it ──
  {
    const page = await open('fresh');
    await startFirstJourneyBattle(page);
    await assertCoach(page, 'card', 'commit from ①');
    assert.equal(await page.locator('.player-hand [aria-pressed="true"]').count(), 1, 'a card is already chosen under ①');
    assert.equal(await page.locator('#pill-amount').textContent(), '0');
    await tap(page, '.move-panel [data-action="commit"]');
    await assertRevealTip(page, 'round 1 committed from ① at 0 pills');
    const reveal = page.locator('#overlay-root .battle-reveal');
    await reveal.locator('[data-battle-coach="reveal"]').waitFor();
    assert.equal(JSON.parse(await stored(page, battleKey)).match.lastResult.player.pills, 0, 'round 1 went in at 0 pills');
    assert.deepEqual(await coachRecord(page), { step: 'reveal', owed: 'pills' }, 'the commit owes ②');
    // A reload in the reveal keeps the debt.
    await page.reload(); await page.locator('.game-lobby').waitFor();
    await tap(page, '.game-lobby [data-action="resume"]');
    await page.locator('#overlay-root .battle-reveal[data-reveal-state="complete"]').waitFor();
    await reveal.locator('[data-battle-coach="reveal"]').waitFor();
    assert.equal(await reveal.locator('[data-action="coach-done"]').getAttribute('aria-label'), '知道了，下一回合再說仙丹', '知道了 says the coach goes on');
    await settleDepth(page, 3, 'the reveal and its coach mark after a reload');
    // 知道了 closes ④ only; ② waits for round 2's table.
    await teaching(page, '知道了 with ② owed', () => tap(page, '#overlay-root [data-action="coach-done"]'));
    assert.equal(await reveal.locator('[data-battle-coach]').count(), 0, '④ is closed');
    assert.deepEqual(await coachRecord(page), { step: 'pills', owed: 'pills' }, '知道了 does not end the coach while ② is owed');
    await settleDepth(page, 2, 'the reveal without its mark');
    // Review round 3: a reload after 知道了 keeps ④ closed, and Back then holds the result.
    await page.reload(); await page.locator('.game-lobby').waitFor();
    await tap(page, '.game-lobby [data-action="resume"]');
    await page.locator('#overlay-root .battle-reveal[data-reveal-state="complete"]').waitFor();
    await viewportFrames(page);
    assert.equal(await reveal.locator('[data-battle-coach]').count(), 0, '④ stays closed after a reload that follows 知道了');
    assert.equal(await reveal.locator('[data-action="coach-done"]').count(), 0, 'no 知道了 again');
    await settleDepth(page, 2, 'the reveal without its mark after a reload');
    await page.goBack(); await settleDepth(page, 2, 'Back holds the result');
    assert.equal(await reveal.count(), 1, 'the round result stays');
    assert.deepEqual(await coachRecord(page), { step: 'pills', owed: 'pills' }, 'Back skipped nothing: ② is still owed');
    await tap(page, '#overlay-root [data-action="next-round"]');
    await planning(page);
    const second = await assertCoach(page, 'pills', 'round 2 opens on the owed ②');
    const roundTwo = JSON.parse(await stored(page, battleKey)).match;
    assert.equal(roundTwo.round, 2); assert.equal(roundTwo.player.pills, 12, 'round 1 spent nothing');
    assert.match(second.hintText, /攻擊＝力×（1＋丹）。十二丹撐三回合，莫一次押盡。$/, 'the owed ② says what pills do, over the three rounds left');
    assert.deepEqual(await coachRecord(page), { step: 'pills', owed: 'pills' }, 'the record keeps the debt while ② shows');
    assert.match(await page.locator('#announcer').textContent(), /。按＋投入仙丹：攻擊＝力×（1＋丹）。十二丹撐三回合，莫一次押盡。$/, 'the owed ② is announced with the round, counting the three rounds left');
    await settleDepth(page, 2, 'round 2 and its coach mark');
    await assertReachable(page, '.move-panel [data-action="pill-plus"]', 'owed ② add pills');
    await teaching(page, 'a pill under the owed ②', () => tap(page, '.move-panel [data-action="pill-plus"]'));
    await assertCoach(page, 'pills', 'the owed ② stays while pills are set');
    assert.deepEqual(await coachRecord(page), { step: 'pills', owed: 'pills' });
    // A reload on round 2 keeps it too.
    await page.reload(); await page.locator('.game-lobby').waitFor();
    await tap(page, '.game-lobby [data-action="resume"]');
    await planning(page);
    await assertCoach(page, 'pills', 'round 2 resumed after a reload');
    await tap(page, '.move-panel [data-action="pill-plus"]');
    await tap(page, '.move-panel [data-action="commit"]');
    await assertRevealTip(page, 'round 2 after the owed ②');
    assert.equal(await page.locator('#overlay-root [data-battle-coach]').count(), 0, 'no ④ again in round 2');
    assert.deepEqual(await coachRecord(page), { firstBattle: 'done' }, 'round 2\'s commit completes the coach');
    await tap(page, '#overlay-root [data-action="next-round"]');
    await planning(page);
    await assertNoCoach(page, 'round 3 after the owed ②');
    passed('a round 1 committed straight from ① shows ④ and owes ②: after a reload and 知道了 (then another reload, with ④ kept closed and Back holding the result), round 2 opens on ② counting three rounds (announced, kept while pills are set and across a reload), and its commit completes the coach');
    await release(page);
  }
  {
    // ＋ on ① shows ②, never ③ (the slider: section 6).
    const page = await open('fresh');
    await startFirstJourneyBattle(page);
    await assertCoach(page, 'card', 'before ＋ on ①');
    await tap(page, '.move-panel [data-action="pill-plus"]');
    assert.match((await assertCoach(page, 'pills', '＋ on ①')).hintText, /攻擊＝力×（1＋丹）/);
    await tap(page, '.move-panel [data-action="pill-plus"]');
    await assertCoach(page, 'commit', 'a second pill');
    await tap(page, '.move-panel [data-action="commit"]');
    await page.locator('#overlay-root [data-battle-coach="reveal"]').waitFor();
    assert.equal(await page.locator('#overlay-root [data-action="coach-done"]').getAttribute('aria-label'), '知道了，結束新手指引');
    assert.deepEqual(await coachRecord(page), { step: 'reveal' }, 'nothing is owed after ②');
    await tap(page, '#overlay-root [data-action="coach-done"]');
    assert.deepEqual(await coachRecord(page), { firstBattle: 'done' }, '知道了 completes the coach when nothing is owed');
    passed('＋ on ① shows ② and the next pill ③; 知道了 then completes the coach');
    await release(page);
  }
  {
    // Review round 3: a reload in round-1 planning resumes ② or ③, so a commit after them owes nothing.
    const page = await open('fresh');
    await startFirstJourneyBattle(page);
    await assertCoach(page, 'card', 'before a reload on ②');
    const other = await page.locator('.player-hand [data-action="select"][aria-pressed="false"]:not([disabled])').first().getAttribute('data-id');
    await tap(page, `.player-hand [data-action="select"][data-id="${other}"]`);
    await assertCoach(page, 'pills', 'mark ② before a reload');
    assert.deepEqual(await coachRecord(page), { step: 'pills' }, 'the record keeps the mark reached');
    await page.reload(); await page.locator('.game-lobby').waitFor();
    await tap(page, '.game-lobby [data-action="resume"]');
    await planning(page);
    await assertCoach(page, 'pills', 'a reload on ② resumes ②');
    await tap(page, '.move-panel [data-action="pill-plus"]');
    await assertCoach(page, 'commit', 'a pill after the reload');
    await page.locator('#pill-slider').fill('12'); await viewportFrames(page);
    assert.deepEqual(await coachRecord(page), { step: 'commit' });
    await page.reload(); await page.locator('.game-lobby').waitFor();
    await tap(page, '.game-lobby [data-action="resume"]');
    await planning(page);
    await assertCoach(page, 'commit', 'a reload on ③ resumes ③');
    assert.equal(await page.locator('#pill-amount').textContent(), '12', 'the draft of 12 pills is restored');
    await tap(page, '.move-panel [data-action="commit"]');
    await page.locator('#overlay-root [data-battle-coach="reveal"]').waitFor();
    assert.equal(JSON.parse(await stored(page, battleKey)).match.lastResult.player.pills, 12, 'round 1 went in at 12 pills');
    assert.equal(await page.locator('#overlay-root [data-action="coach-done"]').getAttribute('aria-label'), '知道了，結束新手指引', '④ ends the coach: nothing is owed');
    assert.deepEqual(await coachRecord(page), { step: 'reveal' });
    await tap(page, '#overlay-root [data-action="next-round"]');
    await planning(page);
    assert.deepEqual(await coachRecord(page), { firstBattle: 'done' });
    await assertNoCoach(page, 'round 2 after a reload on ③ and a 12-pill commit');
    passed('a reload in round 1 resumes ② or ③ with the draft; a commit after them (12 pills) shows ④, owes nothing and 繼續 completes the coach');
    await release(page);
  }
  {
    // Review round 4: one slider gesture moves the coach by one mark at most. A drag fires an
    // input event for every value it passes (locator.fill fires one), so a drag on ① used to
    // show ② and then ③ before the finger lifted.
    const page = await open('fresh');
    await startFirstJourneyBattle(page);
    await assertCoach(page, 'card', 'before a slider drag on ①');
    await page.evaluate(() => { window.coachSmokeInputs = 0; document.addEventListener('input', event => { if (event.target.id === 'pill-slider') window.coachSmokeInputs++; }, true); });
    const step = () => page.evaluate(() => document.querySelector('#app .battle-table')?.dataset.coachStep ?? null);
    /** Presses the slider at one fraction of its width, drags to another and releases; returns what showed while held. */
    const drag = async (from, to) => {
      const box = await page.locator('#pill-slider').boundingBox(), y = box.y + box.height / 2, before = await page.evaluate(() => window.coachSmokeInputs);
      await page.mouse.move(box.x + box.width * from, y); await page.mouse.down();
      await page.mouse.move(box.x + box.width * to, y, { steps: 12 });
      const held = { step: await step(), inputs: await page.evaluate(() => window.coachSmokeInputs) - before };
      await page.mouse.up(); await viewportFrames(page);
      return held;
    };
    const first = await drag(0.02, 0.4);
    assert.ok(first.inputs >= 2, `the drag fired several input events (${first.inputs})`);
    assert.equal(first.step, 'pills', 'a drag on ① shows ② while the finger is still down, not ③');
    const shown = await assertCoach(page, 'pills', 'after the drag on ①');
    assert.match(shown.hintText, /攻擊＝力×（1＋丹）。十二丹撐四回合，莫一次押盡。$/, 'the drag leaves ② on screen');
    assert.ok(Number(await page.locator('#pill-amount').textContent()) >= 2, 'the drag set several pills');
    assert.deepEqual(await coachRecord(page), { step: 'pills' }, 'the record keeps ②');
    const second = await drag(0.5, 0.6);
    assert.equal(second.step, 'commit', 'the next drag shows ③');
    await assertCoach(page, 'commit', 'after a second drag');
    assert.deepEqual(await coachRecord(page), { step: 'commit' });
    // A new first battle over the abandoned one's ③ starts at ①, and only then is {} written.
    await abandonToLobby(page);
    assert.equal(JSON.parse(await stored(page, PROFILE_KEY)).stats.played, 0, 'an abandoned battle is not a played one');
    assert.deepEqual(await coachRecord(page), { step: 'commit' }, 'the abandoned battle\'s place stays until a new battle starts');
    await startFirstJourneyBattle(page);
    await assertCoach(page, 'card', 'a new first battle after one abandoned on ③');
    assert.deepEqual(await coachRecord(page), {}, 'a new first battle at ① over an abandoned one\'s place writes {}');
    // A held arrow key is one gesture too (repeated keydowns); the next press shows ③.
    await page.locator('#pill-slider').focus();
    for (let press = 0; press < 3; press++) await page.keyboard.down('ArrowRight');
    await page.keyboard.up('ArrowRight'); await viewportFrames(page);
    assert.equal(await page.locator('#pill-amount').textContent(), '3', 'the held key set three pills');
    await assertCoach(page, 'pills', 'a held arrow key on ①');
    await page.keyboard.press('ArrowRight'); await viewportFrames(page);
    await assertCoach(page, 'commit', 'the next arrow key press');
    await tap(page, '.move-panel [data-action="commit"]');
    await page.locator('#overlay-root [data-battle-coach="reveal"]').waitFor();
    assert.equal(await page.locator('#overlay-root [data-action="coach-done"]').getAttribute('aria-label'), '知道了，結束新手指引', 'nothing is owed after ② showed');
    assert.deepEqual(await coachRecord(page), { step: 'reveal' });
    passed('one slider gesture moves the coach by one mark: a drag on ① (several input events) leaves ② while held and after release, the next drag shows ③; a new first battle over an abandoned one\'s ③ starts at ① and writes {}; a held arrow key on ① shows ②, the next press ③');
    await release(page);
  }

  // ── 4. Not the first battle: no mark, but the hint and the tip ──────────────────────
  {
    const page = await open('veteran');
    await startFirstJourneyBattle(page);
    await assertNoCoach(page, 'a 霧隱渡口 encounter after a played battle');
    await assertFormula(page, 'later battle');
    // Fury on: the cost line keeps 剩 N 丹 whole; the damage is on the Fury toggle.
    await tap(page, '.move-panel [data-action="fury"]');
    await assertFuryLines(page, 'Fury on with no pills');
    await page.locator('#pill-slider').fill('9'); await viewportFrames(page);
    await assertFuryLines(page, 'Fury on with nine pills');
    await tap(page, '.move-panel [data-action="fury"]');
    await page.locator('#pill-slider').fill('0'); await viewportFrames(page);
    await tap(page, '.move-panel [data-action="commit"]');
    const tip = await assertRevealTip(page, 'round 1 without the coach');
    assert.equal(await page.locator('#overlay-root [data-battle-coach]').count(), 0);
    assert.equal(await page.locator('#overlay-root [data-action="coach-done"]').count(), 0);
    assert.equal(await coachRecord(page), null, 'a later battle neither shows nor records the coach');
    await release(page);
    const practice = await open('fresh');
    await tap(practice, '.game-dock [data-action="arena"]');
    // 自由切磋 sits on another page of 對弈 on a phone: open it as a player would.
    await revealViewportItem(practice, practice.locator('#app [data-action="start"]').first());
    await tap(practice, '#app [data-action="start"]');
    await tap(practice, '#overlay-root [data-action="confirm-start"]');
    await planning(practice);
    assert.equal(JSON.parse(await stored(practice, battleKey)).encounter.kind, 'practice');
    await assertNoCoach(practice, 'a first practice match');
    assert.equal(await coachRecord(practice), null, 'practice leaves the coach for the first journey battle');
    passed(`no mark outside the first battle; the visible hint (${tip.kind} tip after round 1) and the formula remain; with Fury on the cost line shows the pills left whole and the Fury note the damage`);
    await release(practice);
  }

  // ── 5. The match result opens on 勝負已定 after a loss, whatever page was left open ──
  {
    const page = await open('final');
    await tap(page, '.game-lobby [data-action="resume"]');
    await planning(page);
    await assertNoCoach(page, 'an arena battle');
    await tap(page, '.move-panel [data-action="commit"]');
    await page.locator('#overlay-root .battle-reveal[data-reveal-state="complete"]').waitFor();
    await tap(page, '#overlay-root [data-action="next-round"]');
    const result = page.locator('#overlay-root .modal .match-score');
    await result.waitFor({ state: 'attached' });
    const selected = () => page.evaluate(() => document.querySelector('#overlay-root [data-viewport-action="module"][aria-selected="true"]')?.dataset.viewportTarget);
    assert.equal(await selected(), 'outcome', 'the win opens on 勝負已定');
    await tap(page, '#overlay-root [data-viewport-action="module"][data-viewport-target="rewards"]');
    assert.equal(await selected(), 'rewards', 'the player leaves the result on 旅途所得');
    await tap(page, '#overlay-root [data-action="end-home"]');
    await page.locator('.game-lobby').waitFor();
    // A lost arena battle whose last round is saved but not yet settled, as commitMove leaves it.
    await page.evaluate(async ({ profileKey, battleKey, now }) => {
      const { beginBattle } = await import('./progression.mjs'), { createMatch, resolveRound } = await import('./engine.mjs');
      const started = beginBattle(JSON.parse(localStorage.getItem(profileKey)), { kind: 'arena', now: new Date(now) });
      const match = createMatch({ mode: 'arena', rng: () => 0.23 });
      match.player = { hp: 1, pills: 12, hand: ['yaoheng', 'qingxiao', 'yanxin', 'cangjiao'], used: [] };
      match.opponent = { hp: 12, pills: 12, hand: ['yanxin', 'chiling', 'yaoheng', 'cuixian'], used: [] };
      match.initiative = 'opponent';
      const lost = resolveRound(match, { cardId: 'yanxin', pills: 0, fury: false }, { cardId: 'chiling', pills: 3, fury: true });
      if (lost.winner !== 'opponent' || lost.status !== 'finished') throw Error('the fixture must be a finished loss');
      localStorage.setItem(profileKey, JSON.stringify(started.profile));
      localStorage.setItem(battleKey, JSON.stringify({ match: lost, encounter: started.encounter, selected: 'yanxin', pills: 0, fury: false, aiMove: null, revealPending: true, recorded: false, lastReward: null }));
    }, { profileKey: PROFILE_KEY, battleKey, now });
    // The lobby on screen predates the injected save; its 主線 button resumes whatever is pending.
    await tap(page, '.game-lobby [data-action="continue-journey"]');
    await page.locator('#overlay-root .modal .match-score').waitFor({ state: 'attached' });
    await viewportFrames(page);
    assert.equal(await page.locator('#overlay-root [data-viewport-action="module"][data-viewport-target="rewards"]').count(), 1, 'the loss has a 旅途所得 page too');
    assert.equal(await selected(), 'outcome', 'the loss opens on 勝負已定, not the page the last result was left on');
    assert.equal((await page.locator('#overlay-root .match-symbol').textContent()).trim(), '悟');
    assert.ok(await page.locator('#overlay-root .match-symbol').isVisible(), '悟 shows');
    assert.ok(await page.locator('#overlay-root .modal p', { hasText: '記住對手的出丹節奏' }).isVisible(), 'the advice shows');
    assert.equal(JSON.parse(await stored(page, PROFILE_KEY)).pending, null, 'the loss is settled');
    passed('after a result left on 旅途所得, the next match result (a loss) opens on 勝負已定 with 悟 and its advice');
    await release(page);
  }
  // ── 6. A 360 px phone: every mark's copy fits its two lines; Fury keeps 剩 N 丹 whole ──
  // 360×640 is a battle-table contract size; at 360×560 the player's caption yields and the
  // cost line alone carries the pills left. Review round 2: narrower phones (353×745 is
  // Playwright's Pixel 4) give mark ② a third line, inside the 44 px status row. Review
  // round 4: N1 removed the page's 340 px minimum, so phones from 302 px are measured too
  // (at 320×568 the player's caption yields), with the cost line's narrower forms.
  for (const size of [{ width: 360, height: 640 }, { width: 360, height: 560 }]) {
    const at = `${size.width}x${size.height}`, page = await open('fresh', { size });
    await startFirstJourneyBattle(page);
    await assertCoach(page, 'card', `${at} mark ①`);
    // Every copy of marks ①–③ (both leaders, both commit labels), measured in the real hint.
    const copies = await page.evaluate(async () => {
      const { coachCopy, COACH_STEPS } = await import('./battle-teaching.mjs');
      const hint = document.querySelector('#app .battle-coach'), text = hint.querySelector('.battle-coach-text'), original = text.textContent, result = [];
      // ② also as the owed ② on round 2 (三回合).
      for (const step of COACH_STEPS.filter(step => step !== 'reveal')) for (const leader of ['player', 'opponent']) for (const commitLabel of ['封丹 · 落子', '落子 · 決勝']) for (const roundsLeft of step === 'pills' ? [4, 3] : [4]) {
        text.textContent = coachCopy(step, { leader, commitLabel, roundsLeft }).text;
        result.push({ step, leader, commitLabel, text: text.textContent, lines: Math.round(hint.scrollHeight / parseFloat(getComputedStyle(hint).lineHeight)), clipped: hint.scrollHeight > hint.clientHeight + 1 });
      }
      text.textContent = original;
      return result;
    });
    assert.equal(copies.length, 16, `${at}: every copy of marks ①–③ was measured, ② for both rounds`);
    for (const copy of copies) assert.ok(!copy.clipped && copy.lines <= 2, `${at}: the ${copy.step} copy (${copy.leader} leads, ${copy.commitLabel}) fits two lines, not ${copy.lines}: ${copy.text}`);
    const other = await page.locator('.player-hand [data-action="select"][aria-pressed="false"]:not([disabled])').first().getAttribute('data-id');
    await tap(page, `.player-hand [data-action="select"][data-id="${other}"]`);
    await assertCoach(page, 'pills', `${at} mark ②`);
    await tap(page, '.move-panel [data-action="pill-plus"]');
    await assertCoach(page, 'commit', `${at} mark ③`);
    await tap(page, '.move-panel [data-action="fury"]');
    await assertFuryLines(page, 'Fury on with one pill');
    await page.locator('#pill-slider').fill('9'); await viewportFrames(page);
    await assertFuryLines(page, 'Fury on with nine pills');
    await release(page);
  }
  passed('at 360×640 and 360×560 every copy of marks ①–③ fits its two lines; with Fury on the cost line shows 剩 N 丹 whole and the Fury note states the damage inside its button');
  for (const size of [{ width: 302, height: 640 }, { width: 320, height: 568 }, { width: 340, height: 640 }, { width: 348, height: 760 }, { width: 353, height: 745 }, { width: 354, height: 640 }]) {
    const at = `${size.width}x${size.height}`, page = await open('fresh', { size });
    await startFirstJourneyBattle(page);
    // The row is 44 px (對弈紀錄's height) plus its 1 px rule; ①'s two lines leave it so.
    const first = await assertCoach(page, 'card', `${at} mark ①`), row = first.status.height;
    assert.ok(row <= 45.5, `${at}: the status row is 44 px and its rule (${row})`);
    const copies = await page.evaluate(async () => {
      const { coachCopy, COACH_STEPS } = await import('./battle-teaching.mjs');
      const hint = document.querySelector('#app .battle-coach'), text = hint.querySelector('.battle-coach-text'), status = document.querySelector('#app .battle-status'), original = text.textContent, result = [];
      for (const step of COACH_STEPS.filter(step => step !== 'reveal')) for (const leader of ['player', 'opponent']) for (const commitLabel of ['封丹 · 落子', '落子 · 決勝']) for (const roundsLeft of step === 'pills' ? [4, 3] : [4]) {
        text.textContent = coachCopy(step, { leader, commitLabel, roundsLeft }).text;
        result.push({ step, leader, commitLabel, text: text.textContent, lines: Math.round(hint.scrollHeight / parseFloat(getComputedStyle(hint).lineHeight)), clipped: hint.scrollHeight > hint.clientHeight + 1, row: status.getBoundingClientRect().height });
      }
      text.textContent = original;
      return result;
    });
    assert.equal(copies.length, 16, `${at}: every copy of marks ①–③ was measured, ② for both rounds`);
    for (const copy of copies) {
      assert.ok(!copy.clipped && copy.lines <= 3, `${at}: the ${copy.step} copy (${copy.leader} leads, ${copy.commitLabel}) shows whole, in ${copy.lines} lines: ${copy.text}`);
      assert.ok(copy.row <= row + 0.5, `${at}: the ${copy.step} copy keeps the status row's height (${copy.row} against ${row})`);
    }
    // The slider on ① shows ②, measured on screen.
    await page.locator('#pill-slider').fill('1'); await viewportFrames(page);
    const pills = await assertCoach(page, 'pills', `${at} the slider on ①`);
    assert.match(pills.hintText, /莫一次押盡。$/, `${at}: mark ② ends whole`);
    assert.ok(pills.status.height <= row + 0.5, `${at}: mark ② keeps the status row's height (${pills.status.height} against ${row})`);
    // Review round 4: below 340 px the cost line keeps 剩 N 丹 whole in a shorter form.
    await tap(page, '.move-panel [data-action="fury"]');
    await assertCoach(page, 'commit', `${at} 怒擊 on ②`);
    await assertFuryLines(page, 'Fury on with one pill', { full: false });
    await page.locator('#pill-slider').fill('9'); await viewportFrames(page);
    await assertFuryLines(page, 'Fury on with nine pills', { full: false });
    await release(page);
  }
  passed('at 302×640, 320×568, 340×640, 348×760, 353×745 (Pixel 4) and 354×640 every copy of marks ①–③ shows whole in at most three lines and the status row keeps its height; the slider on ① shows ②; with Fury on the cost line is the widest form that fits and shows 剩 N 丹 whole');

  // ── 7. Full motion: Back while the round-1 reveal animates holds the result ─────────
  {
    const page = await open('fresh', { motion: true });
    await startFirstJourneyBattle(page);
    await assertCoach(page, 'card', 'full motion');
    await tap(page, '.move-panel [data-action="pill-plus"]');
    await assertCoach(page, 'pills', 'full motion, a pill added');
    await settleDepth(page, 2, 'the battle and its coach mark');
    await tap(page, '.move-panel [data-action="commit"]');
    const reveal = page.locator('#overlay-root .battle-reveal');
    await page.locator('#overlay-root .battle-reveal[data-reveal-state="animating"]').waitFor({ state: 'attached' });
    assert.equal(await reveal.locator('[data-battle-coach="reveal"]').isVisible(), false, 'mark ④ is hidden while the reveal animates');
    await settleDepth(page, 2, 'no coach layer while mark ④ is hidden');
    assert.equal(await page.evaluate(() => document.querySelector('#overlay-root .battle-reveal')?.dataset.revealState), 'animating', 'Back comes while the reveal still animates');
    await page.goBack(); await settleDepth(page, 2, 'Back during the animated reveal holds the result');
    await viewportFrames(page);
    assert.deepEqual(await coachRecord(page), { step: 'reveal' }, 'Back during the animation skips no mark: the coach is still at ④');
    await page.locator('#overlay-root .battle-reveal[data-reveal-state="complete"]').waitFor({ state: 'attached' });
    await reveal.locator('[data-battle-coach="reveal"]').waitFor({ state: 'visible' });
    assert.ok(await reveal.locator('[data-action="coach-done"]').isVisible(), '知道了 shows with mark ④');
    assert.deepEqual(await coachRecord(page), { step: 'reveal' });
    // The next Back closes the mark the player can now see, as 跳過; the result stays.
    await page.goBack();
    await page.waitForFunction(() => !document.querySelector('#overlay-root [data-battle-coach]'), null, { timeout: 4000 });
    assert.deepEqual(await coachRecord(page), { firstBattle: 'skipped' });
    assert.equal(await reveal.count(), 1, 'the round result stays');
    await release(page);
    // Without a Back, the completed reveal's mark gets its own history entry (one more layer).
    const control = await open('fresh', { motion: true });
    await startFirstJourneyBattle(control);
    await tap(control, '.move-panel [data-action="commit"]');
    await control.locator('#overlay-root .battle-reveal[data-reveal-state="animating"]').waitFor({ state: 'attached' });
    await settleDepth(control, 2, 'the animating reveal');
    await control.locator('#overlay-root [data-battle-coach="reveal"]').waitFor({ state: 'visible' });
    await settleDepth(control, 3, 'the reveal and its now visible mark');
    passed('with full motion, Back while the round-1 reveal animates holds the result and skips no mark; mark ④ then shows, and the next Back closes it');
    await release(control);
  }
  assert.deepEqual(errors, [], 'no page errors, console errors, failed responses or unexpected network');
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  await browser.close();
}
console.log(JSON.stringify({ ok: true, browser: { name: browserName, version }, device: deviceName, checks: checks.length, errors }, null, 2));
