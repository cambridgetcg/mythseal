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
 * 旅途所得. Headless engines only: the owner's playtest with first-time players is the
 * real exit (docs/VALIDATION.md).
 * Usage: GAME_URL=http://127.0.0.1:<port> [BROWSER=webkit] node tools/coach-smoke.mjs
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { viewportFrames, revealViewportItem } from './viewport-browser-helpers.mjs';
import { createMatch, resolveRound } from '../engine.mjs';
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
async function open(name) {
  const fixture = FIXTURES[name];
  const context = await browser.newContext({ ...device, reducedMotion: 'reduce' });
  contexts.add(context);
  await context.addInitScript(({ fixture, keys, now }) => {
    const NativeDate = Date, fixed = new NativeDate(now).getTime();
    globalThis.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } };
    Math.random = () => 0.23;
    if (!localStorage.getItem('coach-smoke.seeded')) {
      localStorage.setItem('coach-smoke.seeded', 'yes');
      if (fixture.profile) localStorage.setItem(keys.profile, fixture.profile);
      if (fixture.battle) localStorage.setItem(keys.battle, fixture.battle);
      localStorage.setItem(keys.preferences, JSON.stringify({ sound: false, ambience: 0.35, effects: 0.6, motion: 'reduce', pace: 'fast' }));
    }
    // Every localStorage write, by key, so a teaching element can be shown to write only its own key.
    const nativeSet = Storage.prototype.setItem, nativeRemove = Storage.prototype.removeItem;
    window.coachSmokeWrites = [];
    Storage.prototype.setItem = function(key, value) { nativeSet.call(this, key, value); if (this === localStorage) window.coachSmokeWrites.push(String(key)); };
    Storage.prototype.removeItem = function(key) { nativeRemove.call(this, key); if (this === localStorage) window.coachSmokeWrites.push(`-${key}`); };
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

/** The table's teaching state, read from the DOM alone. */
const tableState = page => page.evaluate(() => {
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
});
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
/** The move panel states the engine's own attack for the current draft. */
async function assertFormula(page, label) {
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
  if (view.leader === 'opponent') assert.equal(view.exact, 'true', `${label}: an announced card makes the number exact`);
  assert.ok(view.fits, `${label}: the formula fits its cell on one line`);
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
    assert.match((await tableState(page)).hintText, /攻擊＝力×（1＋丹）/, 'mark ② says what pills do');
    await assertReachable(page, '.move-panel [data-action="pill-plus"]', 'mark ② add pills');
    await tap(page, '.move-panel [data-action="pill-plus"]');
    await assertCoach(page, 'commit', 'after adding a pill');
    await tap(page, '.move-panel [data-action="pill-plus"]');
    assert.equal(await page.locator('#pill-amount').textContent(), '2');
    await assertFormula(page, 'two pills');
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
    assert.equal(await coachRecord(page), null, 'nothing is recorded before the last mark');
    await tap(page, '#overlay-root [data-action="next-round"]');
    await planning(page);
    assert.deepEqual(await coachRecord(page), { firstBattle: 'done' });
    await assertNoCoach(page, 'round 2 after completion');
    await settleDepth(page, 1, 'the coach layer is gone');
    assert.equal(await stored(page, PROFILE_KEY), profile, 'completing the coach leaves the profile bytes unchanged');
    passed('on the first battle marks ① card → ② pills (with what they do) → ③ commit → ④ reveal appear in order, each taught control reachable by a tap; the formula equals the engine; the round-1 tip states match-state pills; 繼續 completes the coach without a profile write');

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

  // ── 4. Not the first battle: no mark, but the hint and the tip ──────────────────────
  {
    const page = await open('veteran');
    await startFirstJourneyBattle(page);
    await assertNoCoach(page, 'a 霧隱渡口 encounter after a played battle');
    await assertFormula(page, 'later battle');
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
    passed(`no mark outside the first battle; the visible hint (${tip.kind} tip after round 1) and the formula remain`);
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
  assert.deepEqual(errors, [], 'no page errors, console errors, failed responses or unexpected network');
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  await browser.close();
}
console.log(JSON.stringify({ ok: true, browser: { name: browserName, version }, device: deviceName, checks: checks.length, errors }, null, 2));
