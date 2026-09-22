import { installViewportNavigation } from './viewport-browser-helpers.mjs';
/** Browser integration for public resource HUDs and accepted-result playback. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createMatch, resolveRound, RULES } from '../engine.mjs';
import { createProfile, beginBattle, finishBattle, PROFILE_KEY } from '../progression.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.GAME_URL || 'http://127.0.0.1:4177';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname)) throw Error('Battle presentation smoke requires a loopback server.');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = fileURLToPath(new URL('../test-results/', import.meta.url));
const fixedNow = '2026-09-22T12:00:00Z', battleKey = 'shanhai.battle.v4', preferenceKey = 'shanhai.experience.v1';
const checks = [], screenshots = [], errors = [], traces = [], layouts = [], footerChecks = [], contexts = new Set();
const action = (page, name) => page.locator(`[data-action="${name}"]`);
const read = (page, key = PROFILE_KEY) => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const state = page => page.evaluate(({ profile, battle }) => ({ profile: JSON.parse(localStorage.getItem(profile)), battle: JSON.parse(localStorage.getItem(battle)) }), { profile: PROFILE_KEY, battle: battleKey });
const passed = label => { checks.push(label); console.log(`PASS ${label}`); };
const resources = match => Object.fromEntries(['player', 'opponent'].map(side => [side, { hp: match[side].hp, pills: match[side].pills }]));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });

// Legal resumable positions isolate boundary effects; the application commits
// the moves and the real engine supplies expected combat/settlement results.
function fixture({ name, playerHP = 11, playerPills = 12, opponentHP = 12, opponentPills = 11, player = { cardId: 'yaoheng', pills: 5, fury: true }, opponent = { cardId: 'yanxin', pills: 0, fury: false }, kind = 'arena' }) {
  const started = beginBattle(createProfile({ now: fixedNow }), { kind, now: fixedNow });
  const match = createMatch({ mode: kind, rng: () => 0.23 });
  match.player = { hp: playerHP, pills: playerPills, hand: ['yaoheng', 'qingxiao', 'yanxin', 'cangjiao'], used: [] };
  match.opponent = { hp: opponentHP, pills: opponentPills, hand: ['yanxin', 'chiling', 'yaoheng', 'cuixian'], used: [] };
  match.initiative = 'opponent';
  const battle = { match, encounter: started.encounter, selected: player.cardId, pills: 0, fury: false, aiMove: opponent, revealPending: false, recorded: false, lastReward: null };
  const expected = resolveRound(match, player, opponent);
  const finalProfile = expected.status === 'finished'
    ? finishBattle(started.profile, { encounterId: started.encounter.id, winner: expected.winner, playedCardIds: expected.player.used, now: fixedNow }).profile
    : started.profile;
  return { name, profile: started.profile, battle, playerMove: player, expected, finalProfile };
}

async function openFixture(value, { width = 1440, reducedMotion = 'no-preference', pace = 'normal', pausePresentation = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 1000 }, reducedMotion, ...(width < 600 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : {}) });
  contexts.add(context);
  await context.addInitScript(({ value, keys, now, pace, pausePresentation }) => {
    // Playwright owns Date as well as timers in the paused keyboard fixture.
    // A second Date shim corrupts its clock-log replay across navigation.
    if (!pausePresentation) {
      const NativeDate = Date, fixed = new NativeDate(now).getTime();
      globalThis.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } };
    }
    Math.random = () => 0.23;
    if (!localStorage.getItem('battle-presentation-smoke.seeded')) {
      localStorage.setItem('battle-presentation-smoke.seeded', 'true');
      localStorage.setItem(keys.profile, JSON.stringify(value.profile));
      localStorage.setItem(keys.battle, JSON.stringify(value.battle));
      localStorage.setItem(keys.preferences, JSON.stringify({ sound: false, ambience: 0.35, effects: 0.6, motion: 'system', pace }));
    }
  }, { value, keys: { profile: PROFILE_KEY, battle: battleKey, preferences: preferenceKey }, now: fixedNow, pace, pausePresentation });
  const page = await context.newPage(); installViewportNavigation(page);
  if (pausePresentation) await page.clock.install({ time: Date.parse(fixedNow) - 60_000 });
  page.setDefaultTimeout(10_000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && new URL(response.url()).origin === new URL(base).origin) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(base);
  await action(page, 'resume').click();
  await page.locator('.player-hand').waitFor();
  assert.deepEqual((await read(page, battleKey)).match, value.battle.match);
  if (pausePresentation) await page.clock.pauseAt(Date.parse(fixedNow));
  return page;
}

async function release(page) { const context = page.context(); await context.close(); contexts.delete(context); }

async function hud(page, scope = '.arena') {
  return page.locator(`${scope} .resources.battle-resources`).evaluateAll(elements => Object.fromEntries(elements.map(element => {
    const meter = element.querySelector('[data-hp-meter]');
    return [element.dataset.side, {
      hp: Number(element.querySelector('[data-hp-value]').textContent),
      pills: Number(element.querySelector('[data-pill-value]').textContent),
      lifeFill: parseFloat(getComputedStyle(meter).getPropertyValue('--life-fill')),
      tokens: [...element.querySelectorAll('[data-pill-index]')].map(token => ({ index: Number(token.dataset.pillIndex), filled: token.classList.contains('is-filled'), planned: token.classList.contains('is-planned'), fury: token.classList.contains('is-fury'), empty: token.classList.contains('is-empty') })),
    }];
  })));
}

function assertResources(actual, expected, label) {
  assert.deepEqual(Object.keys(actual).sort(), ['opponent', 'player'], `${label}: both sides visible`);
  for (const side of ['player', 'opponent']) {
    assert.equal(actual[side].hp, expected[side].hp, `${label}: ${side} HP`);
    assert.equal(actual[side].pills, expected[side].pills, `${label}: ${side} pills`);
    assert(Math.abs(actual[side].lifeFill - expected[side].hp / RULES.life * 100) < 0.6, `${label}: ${side} life meter follows public HP`);
    assert.deepEqual(actual[side].tokens.map(token => token.index), Array.from({ length: 12 }, (_, index) => index));
    assert.equal(actual[side].tokens.filter(token => token.filled).length, expected[side].pills);
    assert.equal(actual[side].tokens.filter(token => token.empty).length, 12 - expected[side].pills);
  }
}

async function noOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, blocks: [...document.querySelectorAll('.modal, .battle-resources')].filter(element => element.getClientRects().length && !element.closest('[hidden],[inert]')).map(element => ({ width: element.clientWidth, scroll: element.scrollWidth })) }));
  assert(dimensions.document <= dimensions.viewport + 1, `${label}: document overflow ${JSON.stringify(dimensions)}`);
  assert(dimensions.blocks.every(block => block.scroll <= block.width + 1), `${label}: HUD/modal content clipped ${JSON.stringify(dimensions)}`);
  const values = await page.locator('[data-hp-value], [data-pill-value]').filter({ visible: true }).evaluateAll(elements => elements.filter(element => !element.closest('[inert]')).map(element => {
    const rect = element.getBoundingClientRect(), parent = element.closest('.battle-resources').getBoundingClientRect();
    return { text: element.textContent, width: rect.width, height: rect.height, left: rect.left, right: rect.right, parentLeft: parent.left, parentRight: parent.right };
  }));
  assert(values.every(value => /^\d+$/.test(value.text.trim()) && value.width > 0 && value.height > 0 && value.left >= value.parentLeft - 1 && value.right <= value.parentRight + 1), `${label}: readable complete resource numerals ${JSON.stringify(values)}`);
}

async function checkRevealFooter(page, { animated = false, label } = {}) {
  const result = await page.evaluate(({ animated, label }) => {
    const modal = document.querySelector('.battle-reveal'), modalRect = modal.getBoundingClientRect();
    const viewport = { left: Math.max(0, modalRect.left), right: Math.min(innerWidth, modalRect.right), top: Math.max(0, modalRect.top), bottom: Math.min(innerHeight, modalRect.bottom) };
    const names = ['next-round', 'experience-settings', ...(animated ? ['skip-reveal'] : [])];
    return { label, width: innerWidth, phase: modal.dataset.phase, viewport, controls: names.map(name => {
      const element = modal.querySelector(`.battle-reveal-footer [data-action="${name}"]`);
      if (!element) return { action: name, missing: true };
      const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
      const clear = [0.2, 0.5, 0.8].every(fraction => {
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height * fraction);
        return hit === element || element.contains(hit);
      });
      return { action: name, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height, visible: !element.hidden && style.visibility !== 'hidden' && style.display !== 'none', clear };
    }) };
  }, { animated, label });
  footerChecks.push(result);
  if (animated) assert.notEqual(result.phase, 'complete', 'Skip hit-target fixture must still be animating');
  for (const control of result.controls) {
    assert(!control.missing && control.visible && control.width > 0 && control.height > 0, `${label}: ${control.action} visible`);
    assert(control.left >= result.viewport.left - 1 && control.right <= result.viewport.right + 1 && control.top >= result.viewport.top - 1 && control.bottom <= result.viewport.bottom + 1, `${label}: footer control fits modal viewport ${JSON.stringify(result)}`);
    assert(control.clear, `${label}: ${control.action} must be reachable rather than covered`);
  }
}

async function shot(page, name) {
  await noOverflow(page, name);
  layouts.push(await page.evaluate(name => ({
    name, viewport: innerWidth,
    numeralFontSizes: [...document.querySelectorAll('[data-hp-value], [data-pill-value]')].map(element => parseFloat(getComputedStyle(element).fontSize)),
    controls: [...document.querySelectorAll('[data-action="pill-minus"], [data-action="pill-plus"], [data-action="fury"], [data-action="commit"], [data-action="next-round"]')].map(element => {
      const rect = element.getBoundingClientRect();
      return { action: element.dataset.action, width: Math.round(rect.width), height: Math.round(rect.height) };
    }),
  }), name));
  await page.evaluate(async () => {
    const sources = [...new Set([...document.querySelectorAll('*')].flatMap(element => [...getComputedStyle(element).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(match => match[1])).filter(source => /^https?:\/\//.test(source)))];
    await Promise.all(sources.map(async source => { const image = new Image(); image.src = source; await image.decode(); }));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  // Overlay screenshots use the actual viewport so sticky controls and clipping
  // are reviewable; the unobscured battle screen keeps a full-page artifact.
  await page.screenshot({ path: output + name, fullPage: (await page.locator('.modal').count()) === 0 }); screenshots.push(name);
}

async function selectMove(page, move) {
  await page.locator(`.player-hand [data-action="select"][data-id="${move.cardId}"]`).click();
  if (((await action(page, 'fury').getAttribute('aria-pressed')) === 'true') !== move.fury) await action(page, 'fury').click();
  await page.locator('#pill-slider').fill(String(move.pills));
}

async function capturePhases(page) {
  await page.evaluate(() => {
    const trace = { phases: [], start: performance.now(), observer: null };
    const capture = () => {
      const reveal = document.querySelector('.battle-reveal');
      if (!reveal?.dataset.phase) return;
      const frame = { phase: reveal.dataset.phase, elapsed: Math.round(performance.now() - trace.start), resources: Object.fromEntries([...reveal.querySelectorAll('.battle-resource-results .battle-resources')].map(element => [element.dataset.side, { hp: Number(element.querySelector('[data-hp-value]').textContent), pills: Number(element.querySelector('[data-pill-value]').textContent) }])) };
      if (trace.phases.at(-1)?.phase === frame.phase) trace.phases[trace.phases.length - 1].resources = frame.resources;
      else trace.phases.push(frame);
    };
    trace.observer = new MutationObserver(capture);
    trace.observer.observe(document.querySelector('#overlay-root'), { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['data-phase'] });
    window.battlePresentationTrace = trace;
  });
}

async function play(page, value, { skip = false } = {}) {
  await selectMove(page, value.playerMove);
  await capturePhases(page);
  await action(page, 'commit').click();
  await page.locator('.battle-reveal').waitFor();
  if (skip) await action(page, 'skip-reveal').click();
  await page.locator('.battle-reveal[data-phase="complete"]').waitFor();
  await page.locator('.resolution').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.duel-cards.battle-clash .clash-side').count(), 2);
  const frames = await page.evaluate(() => { const trace = window.battlePresentationTrace; trace.observer.disconnect(); return trace.phases; });
  assertResources(await hud(page, '.battle-resource-results'), resources(value.expected), value.name);
  assert.deepEqual(await read(page), value.finalProfile, `${value.name}: accepted profile`);
  const saved = await read(page, battleKey);
  if (value.expected.status === 'finished') assert.equal(saved, null);
  else assert.deepEqual(saved.match, value.expected, `${value.name}: exact real engine result`);
  return { frames, state: await state(page) };
}

function checkStages(frames, value) {
  assert.deepEqual(frames.map(frame => frame.phase), ['sealed', 'bids', 'impact', 'recovery', 'complete']);
  const before = resources(value.battle.match), after = resources(value.expected);
  const spent = structuredClone(before);
  for (const side of ['player', 'opponent']) spent[side].pills -= value.expected.lastResult[side].cost;
  const impact = structuredClone(spent), loser = value.expected.lastResult.winner === 'player' ? 'opponent' : 'player';
  impact[loser].hp = Math.max(0, before[loser].hp - value.expected.lastResult.damage);
  for (const [index, expected] of [before, spent, impact, after, after].entries()) assert.deepEqual(frames[index].resources, expected, `${value.name}: ${frames[index].phase} counts`);
}

try {
  const capped = fixture({ name: 'capped-heal-refund-fury' });
  const preview = await openFixture(capped);
  const opponent = (await hud(preview)).opponent, originalAI = (await read(preview, battleKey)).aiMove;
  for (const move of [{ cardId: 'yaoheng', pills: 2, fury: false }, { cardId: 'qingxiao', pills: 2, fury: true }, { cardId: 'yanxin', pills: 9, fury: true }, { cardId: 'yaoheng', pills: 0, fury: false }]) {
    await selectMove(preview, move);
    const current = await hud(preview);
    assertResources(current, resources(capped.battle.match), 'live planning');
    assert.equal(current.player.tokens.filter(token => token.planned).length, move.pills);
    assert.equal(current.player.tokens.filter(token => token.fury).length, move.fury ? 3 : 0);
    assert.equal(current.opponent.tokens.filter(token => token.planned || token.fury).length, 0);
    assert.deepEqual(current.opponent, opponent, 'Own selection/bid/Fury must not reveal or vary the opponent reserve');
    assert.deepEqual((await read(preview, battleKey)).aiMove, originalAI, 'Adjustments cannot reroll the precommitted AI move');
    assert.deepEqual((await read(preview, battleKey)).match, capped.battle.match);
    assert.deepEqual(await read(preview), capped.profile);
  }
  await selectMove(preview, { cardId: 'yaoheng', pills: 2, fury: true });
  await shot(preview, 'battle-presentation-preview-desktop.png');
  await release(preview);
  const alternate = fixture({ name: 'different-hidden-bid', opponent: { cardId: 'yanxin', pills: 8, fury: true } });
  const concealed = await openFixture(alternate);
  assert.notDeepEqual((await read(concealed, battleKey)).aiMove, originalAI, 'Hidden-bid fixture must actually differ');
  assert.deepEqual((await hud(concealed)).opponent, opponent, 'Identical public reserves must look identical for different secret opponent pill/Fury commitments');
  await release(concealed);
  passed('Live bid/Fury marks retain reserves and game state; own adjustments cannot change precommitted AI, and different hidden opponent bids/Fury produce identical public HUDs');

  let reference;
  for (const variant of [{ name: 'normal' }, { name: 'fast', pace: 'fast' }, { name: 'skip', skip: true }, { name: 'reduced', reducedMotion: 'reduce' }]) {
    const page = await openFixture(capped, variant);
    const played = await play(page, capped, variant);
    traces.push({ case: capped.name, variant: variant.name, frames: played.frames });
    if (variant.name === 'normal') { checkStages(played.frames, capped); reference = played.state; await shot(page, 'battle-presentation-clash-desktop.png'); }
    else assert.deepEqual(played.state, reference, `${variant.name} preserves the same accepted result and save`);
    await action(page, 'next-round').click();
    await page.locator('.player-hand').waitFor();
    assertResources(await hud(page), resources(capped.expected), `${variant.name}: next-round resources`);
    assert.equal(await page.locator('#pill-slider').inputValue(), '0');
    assert.equal(await action(page, 'fury').getAttribute('aria-pressed'), 'false');
    assert.deepEqual((await read(page, battleKey)).match, capped.expected);
    await release(page);
  }
  passed('All five normal phases show pre-cost, spent, damaged and capped recovery counts; fast/skip/reduced share the exact accepted save and next-round reserves');

  const boundaries = [
    fixture({ name: 'uncapped-heal-refund', playerHP: 7, opponentPills: 3, player: { cardId: 'yaoheng', pills: 3, fury: false } }),
    fixture({ name: 'zero-pill-refund', playerHP: 10, playerPills: 0, opponentPills: 0, player: { cardId: 'yanxin', pills: 0, fury: false }, opponent: { cardId: 'chiling', pills: 0, fury: false } }),
    fixture({ name: 'overkill-capped-refund', opponentHP: 1, opponentPills: 12, player: { cardId: 'qingxiao', pills: 1, fury: true } }),
  ];
  for (const value of boundaries) {
    const page = await openFixture(value);
    if (value.battle.match.player.pills === 0) assert(await action(page, 'fury').isDisabled());
    const played = await play(page, value);
    checkStages(played.frames, value); traces.push({ case: value.name, variant: 'normal', frames: played.frames });
    if (value.expected.status === 'finished') {
      await action(page, 'next-round').click(); await page.locator('.match-score').waitFor();
      assert.deepEqual(await read(page), value.finalProfile);
      await page.reload(); await page.locator('.game-lobby').waitFor();
      assert.deepEqual(await read(page), value.finalProfile, 'Completed overkill settles exactly once across reload');
    }
    await release(page);
  }
  passed('Real-engine fixtures cover uncapped healing/refund, zero-reserve refund, Fury cost and overkill clamped at zero; settlement remains once-only');

  for (const mode of ['next-immediately', 'reload', 'pagehide']) {
    const page = await openFixture(capped);
    await selectMove(page, capped.playerMove); await action(page, 'commit').click();
    await page.locator('.battle-reveal').waitFor();
    assert.notEqual(await page.locator('.battle-reveal').getAttribute('data-phase'), 'complete');
    const accepted = await state(page);
    if (mode === 'reload') {
      await page.reload(); await action(page, 'resume').click();
      await page.locator('.battle-reveal[data-phase="complete"]').waitFor();
      assertResources(await hud(page, '.battle-resource-results'), resources(capped.expected), 'reload static accepted counts');
      assert.deepEqual(await state(page), accepted);
    }
    if (mode === 'pagehide') {
      // A controlled lifecycle event exercises the integration without claiming
      // that headless browser tabs reproduce a phone operating system's pause.
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
      await page.locator('.battle-reveal[data-phase="complete"]').waitFor();
      assertResources(await hud(page, '.battle-resource-results'), resources(capped.expected), 'simulated pagehide settles presentation');
      assert.deepEqual(await state(page), accepted);
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
      assert.equal(await page.locator('.battle-reveal').getAttribute('data-phase'), 'complete');
    }
    await action(page, 'next-round').click(); await page.locator('.player-hand').waitFor();
    assertResources(await hud(page), resources(capped.expected), mode);
    assert.deepEqual((await read(page, battleKey)).match, capped.expected);
    assert.deepEqual(await read(page), capped.profile);
    await release(page);
  }
  passed('Immediate next-round, interrupted reload and simulated pagehide/pageshow use accepted final resources without recomputing or resettling');

  for (const width of [360, 390]) {
    const page = await openFixture(capped, { width, reducedMotion: 'reduce' });
    await selectMove(page, { cardId: 'yaoheng', pills: 2, fury: true });
    await shot(page, `battle-presentation-preview-${width}.png`);
    const played = await play(page, capped);
    assert.deepEqual(played.state, reference);
    const modules = await page.locator('.battle-reveal [data-viewport-action="module"]').evaluateAll(nodes => nodes.map(node => node.dataset.viewportTarget));
    for (const id of modules) {
      await page.locator(`.battle-reveal [data-viewport-action="module"][data-viewport-target="${id}"]`).click();
      await checkRevealFooter(page, { label: `${width}px completed ${id} module` });
      await noOverflow(page, `${width}px completed ${id} module`);
      assert.equal(await page.locator('.battle-reveal').evaluate(element => element.scrollTop), 0, 'Reveal modules remain fixed without scrolling');
    }
    await shot(page, `battle-presentation-clash-bottom-${width}.png`);
    await page.locator('.battle-reveal [data-viewport-action="module"][data-viewport-target="clash"]').click();
    await shot(page, `battle-presentation-clash-${width}.png`);
    await action(page, 'next-round').click(); await page.locator('.player-hand').waitFor();
    await noOverflow(page, `${width}px final resources and controls`);
    await release(page);

    // Geometry/focus assertions must not race the 1.1-second automatic finish,
    // which can move focus to Next before the test sends Enter. Real-time phase
    // timing is covered above; keep this keyboard-Skip case on its sealed frame.
    const animated = await openFixture(capped, { width, pausePresentation: true });
    await selectMove(animated, capped.playerMove);
    await action(animated, 'commit').click();
    await animated.locator('.battle-reveal').waitFor();
    // Flush the modal's scheduled initial focus without reaching the first
    // reveal phase at 100 ms; subsequent geometry checks cannot consume time.
    await animated.clock.runFor(32);
    assert.equal(await animated.locator('.battle-reveal').getAttribute('data-phase'), 'sealed');
    await checkRevealFooter(animated, { animated: true, label: `${width}px animating` });
    await action(animated, 'skip-reveal').focus();
    await animated.keyboard.press('Enter');
    await animated.locator('.battle-reveal[data-phase="complete"]').waitFor();
    assert.equal(await animated.evaluate(() => document.activeElement?.dataset.action), 'next-round', 'Keyboard Skip returns focus to the visible Next control');
    await checkRevealFooter(animated, { label: `${width}px after skip` });
    assertResources(await hud(animated, '.battle-resource-results'), resources(capped.expected), `${width}px actual visible Skip action`);
    await release(animated);
  }
  passed('360px and 390px public previews, clash cards, compact resource results and next-round controls fit with complete readable numerals');
  passed('360px and 390px sticky Next/settings/animated Skip fit the modal viewport, remain unobstructed across scrolling, and keyboard Skip returns focus to Next');
  assert.deepEqual(errors, [], 'Browser errors or missing local assets');
  console.log(JSON.stringify({ ok: true, checks, screenshots, traces, layouts, footerChecks, browserErrors: errors, evidence: 'Isolated local Chrome, real engine outcomes and legal seeded positions; desktop/mobile viewports, not physical-device or audio-listening evidence.' }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, passed: checks, screenshots, traces, layouts, footerChecks, browserErrors: errors, error: error.stack }, null, 2));
  process.exitCode = 1;
} finally {
  await Promise.allSettled([...contexts].map(context => context.close()));
  await browser.close();
}
