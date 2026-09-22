/** Local browser evidence for Mist Gate presentation; never uses player profiles. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createProfile, PROFILE_KEY, NODES } from '../progression.mjs';
import { mintInstance, setInstanceXP } from '../collection.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.GAME_URL || 'http://127.0.0.1:4177';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname)) throw Error('Immersion smoke requires a loopback game server.');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = fileURLToPath(new URL('../test-results/', import.meta.url));
const fixedNow = '2026-09-22T12:00:00Z';
const battleKey = 'shanhai.battle.v3', preferenceKey = 'shanhai.experience.v1';
const checks = [], screenshots = [], errors = [], timings = [], contexts = new Set();
const action = (page, name, id, prefix = '') => page.locator(`${prefix}[data-action="${name}"]${id ? `[data-id="${id}"]` : ''}`);
const read = (page, key = PROFILE_KEY) => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const storage = page => page.evaluate(({ profile, battle }) => ({ profile: localStorage.getItem(profile), battle: localStorage.getItem(battle) }), { profile: PROFILE_KEY, battle: battleKey });
const passed = label => { checks.push(label); console.log(`PASS ${label}`); };
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });

async function seededPage(seed, { width = 1440, reducedMotion = 'no-preference', preferences = null, blockedStorage = false } = {}) {
  const mobile = width < 600;
  const context = await browser.newContext({ viewport: { width, height: mobile ? 844 : 1000 }, reducedMotion, ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : {}) });
  contexts.add(context);
  await context.addInitScript(({ seed, profileKey, preferenceKey, preferences, blockedStorage, now }) => {
    const NativeDate = Date, fixed = new NativeDate(now).getTime();
    globalThis.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [fixed])); }
      static now() { return fixed; }
    };
    globalThis.immersionRandomCalls = 0;
    Math.random = () => { globalThis.immersionRandomCalls++; return 0.23; };
    if (blockedStorage) {
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new DOMException('Storage disabled in isolated smoke fixture.', 'SecurityError'); } });
      return;
    }
    if (!localStorage.getItem('immersion-smoke.seeded')) {
      localStorage.setItem('immersion-smoke.seeded', 'true');
      localStorage.setItem(profileKey, JSON.stringify(seed));
      if (preferences) localStorage.setItem(preferenceKey, JSON.stringify(preferences));
    }
  }, { seed, profileKey: PROFILE_KEY, preferenceKey, preferences, blockedStorage, now: fixedNow });
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

async function release(page) {
  const context = page.context();
  await context.close();
  contexts.delete(context);
}

async function noOverflow(page, label) {
  const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, modals: [...document.querySelectorAll('.modal')].map(element => ({ width: element.clientWidth, scroll: element.scrollWidth })) }));
  assert(sizes.document <= sizes.viewport + 1, `${label}: page overflow ${JSON.stringify(sizes)}`);
  assert(sizes.modals.every(modal => modal.scroll <= modal.width + 1), `${label}: modal overflow ${JSON.stringify(sizes)}`);
}

const afterPaint = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function shot(page, name) {
  await noOverflow(page, name);
  await page.evaluate(async () => {
    const sources = [...new Set([...document.querySelectorAll('*')].flatMap(element => [...getComputedStyle(element).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(match => match[1])).filter(source => /^https?:\/\//.test(source)))];
    await Promise.all(sources.map(async source => { const image = new Image(); image.src = source; await image.decode(); }));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.screenshot({ path: output + name, fullPage: true });
  screenshots.push(name);
}

async function startMist(page, label = null) {
  const before = await storage(page);
  await action(page, 'continue-journey').click();
  await page.locator('.mist-arrival').waitFor();
  assert.deepEqual(await storage(page), before, 'The arrival presentation must not begin, charge or change a battle');
  if (label === 'desktop') {
    await action(page, 'experience-settings', null, '.encounter-prep ').click();
    await page.locator('.experience-settings').waitFor();
    await page.keyboard.press('Escape');
    await page.locator('.mist-arrival').waitFor();
    assert.deepEqual(await storage(page), before, 'Opening settings from arrival must retain inert preparation');
  }
  if (label) await shot(page, `immersion-arrival-${label}.png`);
  await action(page, 'confirm-start').click();
  await page.locator('.player-hand').waitFor();
  assert.equal(await page.locator('.game-shell.is-mist-gate').count(), 1);
  assert.equal((await read(page)).pending.nodeId, NODES[0].id);
  if (label) await shot(page, `immersion-battle-${label}.png`);
}

/** Select a legal deterministic test move; production UI resolves and settles it. */
async function chooseMove(page, aim = 'win') {
  return page.evaluate(async ({ key, aim }) => {
    const { chooseAIMove, resolveRound } = await import('./engine.mjs');
    const saved = JSON.parse(localStorage.getItem(key)), state = saved.match;
    let best;
    for (const cardId of state.player.hand.filter(id => !state.player.used.includes(id))) {
      const opponentMove = saved.aiMove || chooseAIMove(state, () => 0.23, cardId);
      for (const fury of [false, true]) for (let pills = 0; pills <= state.player.pills - (fury ? 3 : 0); pills++) {
        const move = { cardId, fury, pills }, next = resolveRound(state, move, opponentMove);
        const score = (next.status === 'finished' ? next.winner === 'player' ? 1000 : next.winner === 'draw' ? 0 : -1000 : 0)
          + (next.player.hp - next.opponent.hp) * 10 + next.player.pills * 0.7 - next.opponent.pills * 0.3;
        if (!best || (aim === 'win' ? score > best.score : score < best.score)) best = { ...move, score };
      }
    }
    return { cardId: best.cardId, fury: best.fury, pills: best.pills };
  }, { key: battleKey, aim });
}

async function beginPhaseCapture(page) {
  await page.evaluate(() => {
    window.immersionTrace?.observer.disconnect();
    const trace = { phases: [], started: performance.now(), observer: null };
    const capture = () => {
      const element = document.querySelector('.mist-reveal');
      if (!element) return;
      const phase = element.dataset.phase;
      if (trace.phases.at(-1)?.phase !== phase) trace.phases.push({ phase, state: element.dataset.revealState, elapsed: Math.round(performance.now() - trace.started) });
    };
    trace.observer = new MutationObserver(capture);
    trace.observer.observe(document.querySelector('#overlay-root'), { childList: true, subtree: true, attributes: true, attributeFilter: ['data-phase', 'data-reveal-state'] });
    window.immersionTrace = trace;
  });
}

async function commit(page, move, { mist = true, skip = false } = {}) {
  await action(page, 'select', move.cardId, '.player-hand ').click();
  if (((await action(page, 'fury').getAttribute('aria-pressed')) === 'true') !== move.fury) await action(page, 'fury').click();
  await page.locator('#pill-slider').fill(String(move.pills));
  if (mist) await beginPhaseCapture(page);
  await action(page, 'commit').click();
  if (mist) {
    await page.locator('.mist-reveal').waitFor();
    if (skip) await action(page, 'skip-reveal').click();
    await page.locator('.mist-reveal[data-phase="complete"]').waitFor();
    assert.equal(await page.locator('.mist-reveal').getAttribute('data-reveal-state'), 'complete');
    await page.locator('.result-modal .resolution').waitFor({ state: 'visible' });
  } else {
    await page.locator('.result-modal .resolution').waitFor();
    assert.equal(await page.locator('.mist-reveal').count(), 0);
  }
  const trace = mist ? await page.evaluate(() => { const trace = window.immersionTrace; trace.observer.disconnect(); return trace.phases; }) : [];
  const saved = await read(page, battleKey);
  const finished = (await action(page, 'next-round').textContent()).includes('對局結果');
  return { saved, finished, trace };
}

async function finishMatch(page, { moves = [], aim = 'win', mist = true, skip = false, startRound = 0, label = null, traceLabel = label || aim } = {}) {
  const chosen = moves.slice(0, startRound), rounds = [];
  for (let round = startRound; round < 4; round++) {
    const move = moves[round] || await chooseMove(page, aim);
    chosen.push(move);
    const result = await commit(page, move, { mist, skip });
    rounds.push(result.saved);
    if (mist) timings.push({ label: traceLabel, round: round + 1, phases: result.trace });
    if (label && round === 0) await shot(page, `immersion-reveal-${label}.png`);
    await action(page, 'next-round').click();
    if (result.finished) {
      await page.locator('.match-score').waitFor();
      if (label) await shot(page, `immersion-result-${label}.png`);
      return { moves: chosen, rounds, profile: await read(page), randomCalls: await page.evaluate(() => globalThis.immersionRandomCalls) };
    }
  }
  throw Error('Match did not settle within four rounds.');
}

async function inspectReward(page, initial, moves, before) {
  const playedUIDs = moves.map(move => initial.pending.cardInstances[move.cardId]);
  const buttons = action(page, 'result-card');
  const shownUIDs = await buttons.evaluateAll(elements => elements.map(element => element.dataset.id));
  assert.deepEqual(shownUIDs.slice().sort(), playedUIDs.slice().sort(), 'Reward links must identify only the exact copies actually played');
  for (const instance of before.instances) {
    const after = (await read(page)).instances.find(copy => copy.uid === instance.uid);
    if (playedUIDs.includes(instance.uid)) {
      assert(after.xp > instance.xp);
      assert.equal(after.battles, instance.battles + 1);
    } else assert.deepEqual(after, instance, 'Unplayed copies must not receive XP or a fabricated battle history');
  }
  const settled = await storage(page), uid = shownUIDs[0], viewport = page.viewportSize();
  if (viewport.width > 600) await page.setViewportSize({ width: viewport.width, height: 600 });
  const returnLink = action(page, 'result-card', uid);
  await returnLink.scrollIntoViewIfNeeded();
  await page.locator('.mist-complete').evaluate(element => { element.scrollTop = Math.max(element.scrollTop, Math.min(80, element.scrollHeight - element.clientHeight)); });
  await returnLink.focus();
  const returnScroll = await page.locator('.mist-complete').evaluate(element => element.scrollTop);
  if (viewport.width > 600) assert(returnScroll > 0, 'Result-return fixture must exercise nonzero modal scroll');
  await page.keyboard.press('Enter');
  await page.locator('.bag-passport-id').waitFor();
  assert.match(await page.locator('.bag-passport-id').innerText(), new RegExp(uid));
  assert.equal(await page.locator('.instance-modal [data-action="instance-upgrade"], .instance-modal [data-action="instance-lock"], .instance-modal [data-action="instance-sell"]').count(), 0, 'A result passport must remain read-only');
  await action(page, 'return-result').click();
  await page.locator('.match-score').waitFor();
  await afterPaint(page);
  assert.equal(await returnLink.evaluate(element => element === document.activeElement), true, 'Returning from a copy restores its result link focus');
  assert(Math.abs(await page.locator('.mist-complete').evaluate(element => element.scrollTop) - returnScroll) <= 2, 'Returning from a copy restores result dialog scroll');
  assert.deepEqual(await storage(page), settled, 'Inspecting a result copy and returning must not award again');
  await action(page, 'result-card', uid).click();
  await page.keyboard.press('Escape');
  await page.locator('.match-score').waitFor();
  const settingsLink = action(page, 'experience-settings', null, '.mist-complete ');
  await settingsLink.scrollIntoViewIfNeeded();
  await settingsLink.focus();
  const settingsScroll = await page.locator('.mist-complete').evaluate(element => element.scrollTop);
  assert(settingsScroll > 0, 'Settings-return fixture must exercise nonzero modal scroll');
  await page.keyboard.press('Enter');
  await page.locator('.experience-settings').waitFor();
  await page.keyboard.press('Escape');
  await page.locator('.match-score').waitFor();
  await afterPaint(page);
  assert.equal(await settingsLink.evaluate(element => element === document.activeElement), true, 'Settings returns focus to the originating result control');
  assert(Math.abs(await page.locator('.mist-complete').evaluate(element => element.scrollTop) - settingsScroll) <= 2, 'Settings returns to the result dialog scroll position');
  assert.deepEqual(await storage(page), settled);
  if (viewport.width > 600) await page.setViewportSize(viewport);
}

try {
  let seed = createProfile({ now: fixedNow });
  seed = mintInstance(seed, 'qingxiao', { source: 'pack:all', now: fixedNow }).profile;
  for (const instance of seed.instances) seed = setInstanceXP(seed, instance.uid, 680);
  const preference = { sound: false, ambience: 0.25, effects: 0.5, motion: 'system', pace: 'normal' };
  let baseline;
  const variants = [
    { name: 'normal', preferences: preference },
    { name: 'fast', preferences: { ...preference, pace: 'fast' } },
    { name: 'system-reduced', preferences: preference, reducedMotion: 'reduce' },
    { name: 'manual-reduced', preferences: { ...preference, motion: 'reduce' } },
    { name: 'skip', preferences: preference, skip: true },
    { name: 'sound-enabled', preferences: { ...preference, sound: true } },
  ];
  for (const variant of variants) {
    const page = await seededPage(seed, variant);
    await startMist(page, variant.name === 'normal' ? 'desktop' : null);
    const started = await read(page);
    const result = await finishMatch(page, { moves: baseline?.moves || [], skip: variant.skip, label: variant.name === 'normal' ? 'desktop' : null, traceLabel: variant.name });
    if (['fast', 'system-reduced', 'manual-reduced'].includes(variant.name)) {
      for (const trace of timings.filter(item => item.label === variant.name)) assert.deepEqual(trace.phases.map(item => item.phase), ['complete'], `${variant.name} exposes the accepted result immediately`);
    }
    assert.equal(result.profile.pending, null);
    assert.equal(await read(page, battleKey), null);
    assert.equal(result.profile.stats.played, 1);
    assert.equal(result.profile.stats.won, 1);
    if (!baseline) baseline = result;
    else {
      assert.deepEqual(result.moves, baseline.moves);
      assert.deepEqual(result.rounds, baseline.rounds, `${variant.name} must preserve every accepted battle snapshot`);
      assert.deepEqual(result.profile, baseline.profile, `${variant.name} must preserve the complete settled save`);
      assert.equal(result.randomCalls, baseline.randomCalls, `${variant.name} must not consume extra game randomness`);
    }
    await inspectReward(page, started, result.moves, seed);
    await page.reload();
    await page.locator('.game-lobby').waitFor();
    assert.deepEqual(await read(page), baseline.profile);
    assert.equal(await read(page, battleKey), null);
    assert.equal(await action(page, 'resume').count(), 0, 'A settled match must not reappear on reload');
    await release(page);
  }
  const normalPhases = timings.find(item => item.label === 'normal' && item.round === 1).phases.map(item => item.phase);
  assert.deepEqual(normalPhases, ['sealed', 'bids', 'impact', 'complete']);
  assert(baseline.moves.length < 4, 'The winning fixture also exercises an early knockout');
  passed('Normal, fast, system-reduced, manual-reduced, skipped and sound-enabled reveals produce identical moves, accepted snapshots, settled saves and game-random call counts, including early KO');
  passed('Only played exact UIDs gain XP; result passports return without another award; final reload preserves balances, copy XP and completed state');

  const interrupted = await seededPage(seed, { preferences: preference });
  await startMist(interrupted);
  await action(interrupted, 'select', baseline.moves[0].cardId, '.player-hand ').click();
  if (baseline.moves[0].fury) await action(interrupted, 'fury').click();
  await interrupted.locator('#pill-slider').fill(String(baseline.moves[0].pills));
  await action(interrupted, 'commit').click();
  await interrupted.locator('.mist-reveal').waitFor();
  const held = await read(interrupted, battleKey), heldProfile = await read(interrupted);
  assert(held?.revealPending && heldProfile.pending, 'Interruption fixture must be an unfinished accepted reveal');
  assert.notEqual(await interrupted.locator('.mist-reveal').getAttribute('data-phase'), 'complete');
  await interrupted.reload();
  await action(interrupted, 'resume').click();
  await interrupted.locator('.mist-reveal[data-phase="complete"]').waitFor();
  assert.deepEqual(await read(interrupted, battleKey), held);
  assert.deepEqual(await read(interrupted), heldProfile);
  await action(interrupted, 'experience-settings', null, '.mist-reveal ').click();
  await interrupted.locator('.experience-settings').waitFor();
  await interrupted.keyboard.press('Escape');
  await interrupted.locator('.mist-reveal[data-phase="complete"]').waitFor();
  assert.deepEqual(await read(interrupted, battleKey), held);
  assert.deepEqual(await read(interrupted), heldProfile);
  await action(interrupted, 'next-round').click();
  const recovered = await finishMatch(interrupted, { moves: baseline.moves, startRound: 1 });
  assert.deepEqual(recovered.profile, baseline.profile);
  await release(interrupted);
  passed('Reloading an unfinished reveal preserves encounter ID, UIDs, HP, pills and committed result; resuming reaches the same final save');

  const settings = await seededPage(createProfile({ now: fixedNow }));
  const beforeSettings = await storage(settings);
  await action(settings, 'experience-settings').first().click();
  await settings.locator('.experience-settings').waitFor();
  assert.equal(await settings.locator('#experience-sound').isChecked(), false, 'First-run audio must be off');
  await settings.locator('#experience-sound').check();
  await settings.locator('#experience-motion').selectOption('reduce');
  await settings.locator('#experience-pace').selectOption('fast');
  await settings.locator('#experience-ambience').fill('0.25');
  await settings.locator('#experience-effects').fill('0.55');
  const storedPreference = await read(settings, preferenceKey);
  assert.equal(storedPreference.sound, true);
  assert.equal(storedPreference.motion, 'reduce');
  assert.equal(storedPreference.pace, 'fast');
  assert.equal(storedPreference.ambience, 0.25);
  assert.equal(storedPreference.effects, 0.55);
  await shot(settings, 'immersion-settings-desktop.png');
  assert.deepEqual(await storage(settings), beforeSettings, 'Presentation settings must not change progression or battles');
  await settings.reload();
  await action(settings, 'experience-settings').first().click();
  assert.equal(await settings.locator('#experience-sound').isChecked(), true);
  assert.equal(await settings.locator('#experience-motion').inputValue(), 'reduce');
  assert.equal(await settings.locator('#experience-pace').inputValue(), 'fast');
  assert.equal(await settings.locator('#experience-ambience').inputValue(), '0.25');
  assert.equal(await settings.locator('#experience-effects').inputValue(), '0.55');
  await settings.locator('#experience-sound').uncheck();
  assert.equal((await read(settings, preferenceKey)).sound, false);
  assert.deepEqual(await storage(settings), beforeSettings);
  await release(settings);
  passed('Audio defaults off; sound, mix, motion and pace settings persist independently of gameplay saves and remain adjustable after reload');

  const blocked = await seededPage(createProfile({ now: fixedNow }), { blockedStorage: true });
  await blocked.locator('.toast').filter({ hasText: '瀏覽器儲存不可用' }).waitFor();
  await action(blocked, 'experience-settings').first().click();
  await blocked.locator('.experience-settings').waitFor();
  assert.equal(await blocked.locator('#experience-sound').isChecked(), false);
  await blocked.locator('#experience-motion').selectOption('reduce');
  await blocked.keyboard.press('Escape');
  await blocked.locator('.game-lobby').waitFor();
  await release(blocked);
  passed('A throwing localStorage getter leaves the lobby and muted settings usable and shows the existing storage warning');

  const losing = await seededPage(createProfile({ now: fixedNow }), { reducedMotion: 'reduce', preferences: preference });
  await startMist(losing);
  const loss = await finishMatch(losing, { aim: 'lose', label: 'loss-desktop' });
  assert.equal(loss.profile.stats.won, 0);
  assert.match(await losing.locator('.match-symbol').textContent(), /悟/);
  const lossSave = await storage(losing);
  await action(losing, 'next-encounter').click();
  await losing.locator('.mist-arrival').waitFor();
  assert.deepEqual(await storage(losing), lossSave);
  await release(losing);
  passed('A real Mist Gate loss exposes retry preparation without replaying settlement');

  const elsewhereSeed = createProfile({ now: fixedNow });
  elsewhereSeed.cleared = [NODES[0].id]; elsewhereSeed.location = NODES[1].id;
  const elsewhere = await seededPage(elsewhereSeed, { reducedMotion: 'reduce' });
  await action(elsewhere, 'continue-journey').click();
  await elsewhere.locator('.encounter-prep').waitFor();
  assert.equal(await elsewhere.locator('.mist-arrival').count(), 0);
  await action(elsewhere, 'confirm-start').click();
  await elsewhere.locator('.player-hand').waitFor();
  assert.equal(await elsewhere.locator('.game-shell.is-mist-gate').count(), 0);
  await commit(elsewhere, await chooseMove(elsewhere), { mist: false });
  await release(elsewhere);

  const practiceSeed = createProfile({ now: fixedNow });
  const practice = await seededPage(practiceSeed, { reducedMotion: 'reduce' });
  await action(practice, 'arena', null, '.game-dock ').click();
  await action(practice, 'start').click();
  assert.equal(await practice.locator('.mist-arrival').count(), 0);
  await action(practice, 'confirm-start').click();
  await practice.locator('.player-hand').waitFor();
  assert.equal(await practice.locator('.game-shell.is-mist-gate').count(), 0);
  const practiced = await finishMatch(practice, { mist: false });
  for (const field of ['coins', 'dust', 'xp']) assert.equal(practiced.profile[field], practiceSeed[field]);
  assert.deepEqual(practiced.profile.instances.map(instance => [instance.uid, instance.xp]), practiceSeed.instances.map(instance => [instance.uid, instance.xp]));
  await release(practice);
  passed('Jade Forest and practice retain ordinary preparation/reveal; practice still awards no currency or card XP');

  for (const width of [360, 390]) {
    const phone = await seededPage(seed, { width, reducedMotion: 'reduce', preferences: preference });
    await startMist(phone, String(width));
    const phoneStarted = await read(phone);
    const result = await finishMatch(phone, { moves: baseline.moves, label: String(width) });
    assert.deepEqual(result.profile, baseline.profile);
    await inspectReward(phone, phoneStarted, result.moves, seed);
    await noOverflow(phone, `${width}px result and passport return`);
    await release(phone);
  }
  passed('360px and 390px arrival, battle, completed reveal, rewards and exact-copy return preserve outcomes without horizontal overflow');
  assert.deepEqual(errors, [], 'Browser errors or missing local assets');
  console.log(JSON.stringify({ ok: true, evidence: 'Isolated desktop Chrome and phone viewports; no real accounts, physical-device performance or audio-listening claims.', checks, screenshots, timings, browserErrors: errors }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, passed: checks, screenshots, timings, browserErrors: errors, error: error.stack }, null, 2));
  process.exitCode = 1;
} finally {
  await Promise.allSettled([...contexts].map(context => context.close()));
  await browser.close();
}
