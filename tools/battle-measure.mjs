/**
 * Q0/Q6 battle experience measurement (receipt tool, not an acceptance test).
 *
 * Measures, on one named synthetic fixture and a loopback server only:
 *  1. cold/warm entry: navigation timing, first frame with a usable lobby CTA,
 *     first frame with a clickable own battle card, and transfer bytes;
 *  2. input -> next-frame latency for >= 30 battle inputs (select card, pill +/-,
 *     Fury, module tabs/pages when present), timed in page with performance.now,
 *     Event.timeStamp, requestAnimationFrame and a post-frame MessageChannel task;
 *  3. task steps for one round: taps/clicks and view switches needed to see the
 *     opponent's public cards while choosing a move, plus a visibility matrix.
 *
 * Usage: GAME_URL=http://127.0.0.1:<port> [BROWSER=webkit] node tools/battle-measure.mjs
 * Optional: PROFILES=desktop-1440x900,phone-390x844  COLD_RUNS=3  WARM_RUNS=3
 *           BATTLE_MEASURE_LABEL=before  CHROME_PATH=<system Chrome; default is Playwright's pinned Chromium>
 *           BATTLE_MEASURE_SELECTORS='{"opponentCard":"..."}' to override hooks below.
 * Writes test-results/battle-measure[-LABEL]-<browser>.json. Headless engines, synthetic
 * save, no physical device: compare runs of this same tool, never other evidence classes.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createMatch, resolveRound } from '../engine.mjs';
import { createProfile, beginBattle, PROFILE_KEY } from '../progression.mjs';

const browserName = process.env.BROWSER || 'chromium';
if (!['chromium', 'webkit'].includes(browserName)) throw Error('BROWSER must be chromium or webkit.');
const runtime = fileURLToPath(new URL('../test-results/webkit-runtime', import.meta.url));
if (browserName === 'webkit' && !process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(runtime)) process.env.PLAYWRIGHT_BROWSERS_PATH = runtime;
const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = new URL(process.env.GAME_URL || 'http://127.0.0.1:4177');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) throw Error('Battle measurement requires a loopback GAME_URL.');
const root = fileURLToPath(new URL('../', import.meta.url));
const output = fileURLToPath(new URL('../test-results/', import.meta.url));
const label = process.env.BATTLE_MEASURE_LABEL ? `-${process.env.BATTLE_MEASURE_LABEL.replace(/[^\w.-]/g, '')}` : '';
const coldRuns = Math.max(1, Number(process.env.COLD_RUNS) || 3), warmRuns = Math.max(1, Number(process.env.WARM_RUNS) || 3);
const now = '2026-09-22T12:00:00Z', battleKey = 'shanhai.battle.v5', preferenceKey = 'shanhai.experience.v1';

// Layout hooks. data-action / data-side / data-viewport-* are the stable contract;
// class names are fallbacks. If the Q0 table renames a hook, update it here (or
// override via BATTLE_MEASURE_SELECTORS) and record the change with the result.
// `ownCard` must stay one compound selector (it is intersected with [data-id]).
const SELECTORS = {
  lobbyAction: '.game-lobby [data-action="resume"]', // pending fixture -> lobby CTA "繼續對局"
  ownCard: '#app [data-action="select"][data-side="player"]',
  opponentCard: '#app [data-side="opponent"][data-card-id]', // public four-card hand (buttons from cardMarkup)
  announced: '#app .enemy-thought, #app [data-battle-announced], #app [data-announced-card]', // Q0 table: centre slot [data-battle-announced]; the lineup card has aria-current
  pillPlus: '#app [data-action="pill-plus"]',
  pillMinus: '#app [data-action="pill-minus"]',
  fury: '#app [data-action="fury"]',
  commit: '#app [data-action="commit"]',
  revealComplete: '.battle-reveal[data-phase="complete"]',
  nextRound: '[data-action="next-round"]',
  ...JSON.parse(process.env.BATTLE_MEASURE_SELECTORS || '{}'),
};
// Text fallback for the announced/waiting context when no selector matches.
const ANNOUNCED_TEXT = ['亮出', '本輪亮牌', '待對手應戰', '靜候落子'];

const PROFILES = [
  { id: 'desktop-1440x900', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, touch: false, cpuThrottle: 1 },
  { id: 'phone-390x844', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, touch: true, cpuThrottle: 1 },
  { id: 'phone-390x844-cpu4x', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, touch: true, cpuThrottle: 4, only: 'chromium' },
].filter(profile => !process.env.PROFILES || process.env.PROFILES.split(',').includes(profile.id));

// Named synthetic fixture: round 1 of an arena duel, opponent leads and has
// announced 焰心 (yanxin, public); its bid/Fury stay hidden. Full 12/12 reserves both sides.
const FIXTURE_NAME = 'q0-arena-round1-opponent-leads';
function fixture() {
  const started = beginBattle(createProfile({ now }), { kind: 'arena', now });
  const match = createMatch({ mode: 'arena', rng: () => 0.23 });
  match.player = { ...match.player, hp: 12, pills: 12, hand: ['yaoheng', 'qingxiao', 'yanxin', 'cangjiao'], used: [] };
  match.opponent = { ...match.opponent, hp: 12, pills: 12, hand: ['yanxin', 'chiling', 'yaoheng', 'cuixian'], used: [] };
  match.initiative = 'opponent';
  const aiMove = { cardId: 'yanxin', pills: 0, fury: false };
  const battle = { match, encounter: started.encounter, selected: 'yaoheng', pills: 0, fury: false, aiMove, revealPending: false, recorded: false, lastReward: null };
  const roundMove = { cardId: 'qingxiao', pills: 2, fury: false };
  const seed = {
    [PROFILE_KEY]: JSON.stringify(started.profile), [battleKey]: JSON.stringify(battle),
    [preferenceKey]: JSON.stringify({ sound: false, ambience: 0.35, effects: 0.6, motion: 'system', pace: 'normal' }),
  };
  const hash = createHash('sha256').update(JSON.stringify(seed)).digest('hex').slice(0, 16);
  return { seed, hash, roundMove, expected: resolveRound(match, roundMove, aiMove),
    summary: { kind: 'arena', round: match.round, initiative: 'opponent', announcedOpponentCard: aiMove.cardId, playerHand: match.player.hand, opponentHand: match.opponent.hand, reserves: '12/12 life, 12/12 pills each side', roundMove } };
}

/** Runs inside the page before any app script (every navigation). */
function pageProbe({ seed, now, S, announcedText }) {
  const NativeDate = Date, fixed = new NativeDate(now).getTime();
  globalThis.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } };
  Math.random = () => 0.23;
  // Every navigation (cold or warm) starts from the identical fixture bytes.
  try { for (const [key, value] of Object.entries(seed)) localStorage.setItem(key, value); } catch {}
  const q = window.__q0 = { marks: {}, inputs: [], perf: { longtask: [], 'long-animation-frame': [], event: [], 'largest-contentful-paint': [] }, armed: null, last: null, serial: 0, waiters: [] };
  const all = selector => { try { return [...document.querySelectorAll(selector)]; } catch { return []; } };
  q.visible = el => {
    if (!el?.isConnected || el.closest('[hidden],[inert]')) return false;
    const style = getComputedStyle(el); if (style.display === 'none' || style.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
    const w = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)), h = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
    return w * h >= 0.9 * r.width * r.height;
  };
  q.clickable = el => {
    if (!q.visible(el) || el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
    const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!hit && (hit === el || el.contains(hit));
  };
  q.anyVisible = selector => all(selector).some(q.visible);
  q.anyClickable = selector => all(selector).some(q.clickable);
  try {
    const supported = PerformanceObserver.supportedEntryTypes || [];
    q.perf.supported = supported.filter(type => type in q.perf);
    for (const type of q.perf.supported) new PerformanceObserver(list => q.perf[type].push(...list.getEntries().map(entry => ({
      name: entry.name, start: entry.startTime, duration: entry.duration,
      ...(type === 'event' ? { interactionId: entry.interactionId, processingStart: entry.processingStart, processingEnd: entry.processingEnd } : {}),
      ...(type === 'largest-contentful-paint' ? { renderTime: entry.renderTime, size: entry.size } : {}),
    })))).observe({ type, buffered: true, ...(type === 'event' ? { durationThreshold: 16 } : {}) });
  } catch { q.perf.supported ||= []; }
  // Entry watcher: first animation frame in which each target is clickable, and the
  // first frame its box stopped moving (same rule as Playwright's "stable" check).
  const rectKey = el => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(value => Math.round(value * 4)).join(); };
  const settle = { lobby: null, battle: null };
  const observe = (selector, usable, settled, slot, t) => {
    const el = all(selector).find(q.clickable); if (!el) { settle[slot] = null; return; }
    q.marks[usable] ??= t;
    if (q.marks[settled]) return;
    const key = rectKey(el); if (settle[slot] === key) q.marks[settled] = t; settle[slot] = key;
  };
  const watch = () => {
    const t = performance.now();
    if (!q.marks.resumeClick) observe(S.lobbyAction, 'lobbyUsable', 'lobbySettled', 'lobby', t);
    observe(S.ownCard, 'battleInteractive', 'battleSettled', 'battle', t);
    if (!q.marks.battleSettled && t < 120000) requestAnimationFrame(watch);
  };
  requestAnimationFrame(watch);
  // Input instrumentation: armed by the runner around one Playwright click/tap.
  addEventListener('pointerdown', event => { if (q.armed && q.armed.pointerTs === null) q.armed.pointerTs = event.timeStamp; }, true);
  addEventListener('click', event => {
    if (!q.marks.resumeClick && event.target.closest?.(S.lobbyAction)) q.marks.resumeClick = event.timeStamp;
    const record = q.armed; if (!record || record.t0 !== null) return;
    record.t0 = performance.now(); record.clickTs = event.timeStamp;
    record.target = event.target.closest?.('[data-action],[data-viewport-action]')?.dataset?.action || event.target.closest?.('[data-viewport-action]')?.dataset?.viewportAction || event.target.tagName;
    requestAnimationFrame(() => {
      record.t2 = performance.now();
      const channel = new MessageChannel();
      channel.port1.onmessage = () => {
        record.t3 = performance.now(); channel.port1.close();
        q.inputs.push(record); q.last = record; if (q.armed === record) q.armed = null;
        q.waiters.splice(0).forEach(resolve => resolve(record));
      };
      channel.port2.postMessage(0);
    });
  }, true);
  addEventListener('click', () => { const record = q.armed; if (record && record.t0 !== null && record.t1 === null) record.t1 = performance.now(); });
  q.arm = name => { q.armed = { id: ++q.serial, name, pointerTs: null, clickTs: null, t0: null, t1: null, t2: null, t3: null }; return q.armed.id; };
  q.wait = (id, timeout = 5000) => q.last?.id === id ? q.last : new Promise(resolve => {
    const timer = setTimeout(() => resolve(null), timeout);
    q.waiters.push(record => { clearTimeout(timer); resolve(record.id === id ? record : null); });
  });
  q.waitFor = (key, timeout = 20000) => new Promise(resolve => {
    const start = performance.now();
    // 'table' = the next round accepts a decision: any own card, pill control or Commit clickable.
    const test = { table: () => ['ownCard', 'pillPlus', 'commit'].find(name => q.anyClickable(S[name])), revealComplete: () => all(S.revealComplete).some(el => !el.closest('[hidden]')) && 'revealComplete' }[key];
    const tick = () => { const t = performance.now(), via = test(); if (via) resolve({ t, via }); else if (t - start > timeout) resolve(null); else requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  q.activeModules = () => all('#app [data-viewport-module]').filter(module => !module.hidden).map(module => module.dataset.viewportModule);
  q.announced = () => {
    const hit = all(S.announced).find(q.visible);
    if (hit) return { visible: true, via: 'selector' };
    const app = document.querySelector('#app'); if (!app) return { visible: false, via: null };
    const walker = document.createTreeWalker(app, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (announcedText.some(text => node.data.includes(text)) && q.visible(node.parentElement)) return { visible: true, via: 'text' };
    }
    return { visible: false, via: null };
  };
  // Cards are counted by distinct card id, so a layout that repeats the announced
  // card in a confrontation slot still reports 4/4 for the four-card hand.
  const distinct = (elements, filter = () => true) => new Set(elements.filter(filter).map(el => el.dataset.cardId || el.dataset.id || el.textContent.trim())).size;
  q.snapshot = () => {
    const opponent = all(S.opponentCard), own = all(S.ownCard);
    const selected = own.find(el => el.getAttribute('aria-pressed') === 'true' || el.classList.contains('selected'));
    const announcedCard = opponent.find(el => el.classList.contains('selected') || el.getAttribute('aria-current') === 'true');
    const view = {
      opponentCards: { total: distinct(opponent), visible: distinct(opponent, q.visible), elements: opponent.length },
      opponentAnnouncedCardVisible: !!announcedCard && q.visible(announcedCard),
      announced: q.announced(),
      ownCards: { total: distinct(own), visible: distinct(own, q.visible) },
      selectedOwnCard: selected?.dataset.id || null, selectedOwnVisible: !!selected && q.visible(selected),
      pillControlsVisible: q.anyVisible(S.pillPlus) && q.anyVisible(S.pillMinus), furyVisible: q.anyVisible(S.fury), commitVisible: q.anyVisible(S.commit),
      activeModules: q.activeModules(), documentScroll: [document.documentElement.scrollWidth > innerWidth + 1, document.documentElement.scrollHeight > innerHeight + 1],
    };
    view.simultaneous = view.opponentCards.total === 4 && view.opponentCards.visible === 4 && view.announced.visible
      && view.selectedOwnVisible && view.pillControlsVisible && view.commitVisible;
    return view;
  };
  // How a player would reach `el`: open its module tab, turn a list page, or scroll.
  q.revealPlan = el => {
    if (!el?.isConnected) return { kind: 'missing' };
    let module = null;
    for (let node = el; node; node = node.parentElement) if (node.matches?.('[data-viewport-module]') && node.hidden) module = node;
    if (module) {
      const tab = all('[data-viewport-action="module"]').find(button => button.getAttribute('aria-controls') === module.id);
      return tab?.id ? { kind: 'module', target: module.dataset.viewportModule, selector: `#${CSS.escape(tab.id)}` } : { kind: 'unreachable', reason: 'hidden module without tab' };
    }
    const list = el.closest('[data-viewport-list]');
    if (list) {
      let item = el; while (item && item.parentElement !== list) item = item.parentElement;
      if (item?.hidden) {
        const children = [...list.children], direction = children.indexOf(item) < children.findIndex(child => !child.hidden) ? 'previous' : 'next';
        const scope = list.closest('[data-viewport-module]'), listId = list.dataset.viewportList;
        const selector = `${scope?.id ? `#${CSS.escape(scope.id)} ` : ''}[data-viewport-action="${direction}"][data-viewport-list-id="${CSS.escape(listId)}"]`;
        return { kind: 'page', target: `${listId}:${direction}`, selector };
      }
    }
    if (el.closest('[hidden],[inert]')) return { kind: 'unreachable', reason: 'hidden or inert ancestor' };
    return q.visible(el) ? { kind: 'ok' } : { kind: 'scroll' };
  };
  q.calibrate = () => {
    const runs = [];
    for (let run = 0; run < 3; run++) { const t = performance.now(); let x = 0; for (let i = 0; i < 3e6; i++) x = (x + i * 7) % 1000003; runs.push(performance.now() - t + (x < 0 ? 1 : 0)); }
    return runs.sort((a, b) => a - b)[1];
  };
  q.entryReport = () => {
    const round = value => typeof value === 'number' ? Math.round(value * 10) / 10 : value ?? null;
    const nav = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    const navigation = nav ? Object.fromEntries(['responseStart', 'responseEnd', 'domInteractive', 'domContentLoadedEventEnd', 'loadEventEnd', 'transferSize', 'encodedBodySize'].map(key => [key, round(nav[key])])) : null;
    const until = q.marks.battleInteractive ?? Infinity;
    const long = q.perf.longtask.filter(entry => entry.start <= until);
    return {
      navigation, paint: Object.fromEntries(performance.getEntriesByType('paint').map(entry => [entry.name, round(entry.startTime)])),
      lcp: round(q.perf['largest-contentful-paint'].filter(entry => entry.start <= until).at(-1)?.start),
      marks: Object.fromEntries(Object.entries(q.marks).map(([key, value]) => [key, round(value)])),
      resourceTiming: { count: resources.length, transferSize: resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0), encodedBodySize: resources.reduce((sum, entry) => sum + (entry.encodedBodySize || 0), 0), lastResponseEnd: round(Math.max(0, ...resources.map(entry => entry.responseEnd))) },
      longTasks: q.perf.supported.includes('longtask') ? { count: long.length, totalMs: round(long.reduce((sum, entry) => sum + entry.duration, 0)), maxMs: round(Math.max(0, ...long.map(entry => entry.duration))) } : 'unsupported',
    };
  };
}

const round1 = value => typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 10) / 10 : null;
function stats(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return { n: 0 };
  const rank = p => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p / 100 * sorted.length) - 1))];
  return { n: sorted.length, min: round1(sorted[0]), p50: round1(rank(50)), p95: round1(rank(95)), max: round1(sorted.at(-1)), mean: round1(sorted.reduce((sum, value) => sum + value, 0) / sorted.length) };
}

const errors = [], contexts = new Set();
const data = fixture();
const browser = await engines[browserName].launch({ headless: true, ...(browserName === 'chromium' && process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });

function trackNetwork(page) {
  const net = { phase: 'lobby', inflight: 0, lastChange: Date.now(), pending: [], phases: new WeakMap(), documentCacheControl: null };
  page.on('request', request => {
    const url = new URL(request.url());
    if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== base.origin) errors.push(`Unexpected non-loopback request ${url.origin}${url.pathname}`);
    net.phases.set(request, net.phase); net.inflight++; net.lastChange = Date.now();
  });
  const done = (request, failed) => {
    net.inflight = Math.max(0, net.inflight - 1); net.lastChange = Date.now();
    const phase = net.phases.get(request) || net.phase;
    net.pending.push((async () => {
      const response = failed ? null : await request.response().catch(() => null);
      const status = response?.status() ?? 0;
      if (status >= 400 && new URL(request.url()).origin === base.origin) errors.push(`${status} ${new URL(request.url()).pathname}`);
      if (request.resourceType() === 'document' && response) net.documentCacheControl = response.headers()['cache-control'] || null;
      let sizes = null;
      try { sizes = await request.sizes(); } catch { const body = await response?.body().catch(() => null); sizes = { responseBodySize: body?.length || 0, responseHeadersSize: 0, estimated: true }; }
      return { phase, type: request.resourceType(), path: new URL(request.url()).pathname, status, failed, body: sizes.responseBodySize || 0, headers: sizes.responseHeadersSize || 0, estimated: !!sizes.estimated };
    })());
  };
  page.on('requestfinished', request => done(request, false));
  page.on('requestfailed', request => done(request, true));
  net.reset = () => { net.phase = 'lobby'; net.pending = []; };
  net.settle = async () => {
    const start = Date.now();
    while (Date.now() - start < 8000 && (net.inflight > 0 || Date.now() - net.lastChange < 400)) await new Promise(resolve => setTimeout(resolve, 50));
    const records = await Promise.all(net.pending);
    const sum = list => ({ requests: list.length, transferBytes: list.reduce((total, item) => total + item.body + item.headers, 0), bodyBytes: list.reduce((total, item) => total + item.body, 0),
      byType: Object.fromEntries([...new Set(list.map(item => item.type))].sort().map(type => [type, { requests: list.filter(item => item.type === type).length, bodyBytes: list.filter(item => item.type === type).reduce((total, item) => total + item.body, 0) }])) });
    return { untilResumeClick: sum(records.filter(item => item.phase === 'lobby')), afterResumeClick: sum(records.filter(item => item.phase === 'battle')), total: sum(records),
      largest: [...records].sort((a, b) => b.body - a.body).slice(0, 5).map(({ path, type, body }) => ({ path, type, bodyBytes: body })),
      duplicatePaths: Object.entries(records.reduce((counts, item) => ({ ...counts, [item.path]: (counts[item.path] || 0) + 1 }), {})).filter(([, count]) => count > 1).map(([path, count]) => ({ path, count })),
      failed: records.filter(item => item.failed).length, sizesEstimated: records.some(item => item.estimated), settledInMs: Date.now() - start };
  };
  return net;
}

async function openPage(profile) {
  const context = await browser.newContext({ viewport: profile.viewport, deviceScaleFactor: profile.deviceScaleFactor, reducedMotion: 'no-preference',
    ...(profile.touch ? { isMobile: true, hasTouch: true } : {}) });
  contexts.add(context);
  await context.addInitScript(pageProbe, { seed: data.seed, now, S: SELECTORS, announcedText: ANNOUNCED_TEXT });
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  if (profile.cpuThrottle > 1) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpuThrottle });
  }
  return { page, net: trackNetwork(page) };
}
const press = (profile, locator) => profile.touch ? locator.tap() : locator.click();

async function enter({ page, net }, profile, kind) {
  net.reset();
  const started = Date.now();
  await page.goto(base.href, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__q0?.marks.lobbyUsable, null, { polling: 50 });
  const lobbyWallMs = Date.now() - started;
  net.phase = 'battle';
  await press(profile, page.locator(SELECTORS.lobbyAction).first());
  await page.waitForFunction(() => window.__q0?.marks.battleInteractive, null, { polling: 50 });
  const battleWallMs = Date.now() - started;
  const transfer = await net.settle();
  const report = await page.evaluate(() => window.__q0.entryReport());
  const { lobbyUsable, lobbySettled, resumeClick, battleInteractive, battleSettled } = report.marks;
  // Automation dwell between "lobby usable" and the scripted tap is excluded from
  // battleIfImmediateTapMs; absolute marks keep it (see automationDwellMs).
  return { kind, lobbyUsableMs: lobbyUsable, lobbySettledMs: lobbySettled ?? null, battleInteractiveAfterResumeClickMs: round1(battleInteractive - resumeClick),
    battleSettledAfterResumeClickMs: round1(battleSettled - resumeClick), battleIfImmediateTapMs: round1(lobbyUsable + battleInteractive - resumeClick),
    automationDwellMs: round1(resumeClick - lobbyUsable), lobbyWallMs, battleWallMs, ...report, transfer, documentCacheControl: net.documentCacheControl };
}

async function measuredPress(page, profile, locator, name) {
  const id = await page.evaluate(name => window.__q0.arm(name), name);
  await press(profile, locator);
  const record = await page.evaluate(id => window.__q0.wait(id), id);
  if (!record) { errors.push(`No click/frame recorded for ${name}`); return { name, missing: true }; }
  const tsValid = Number.isFinite(record.clickTs) && record.clickTs <= record.t0 + 0.5 && record.t0 - record.clickTs < 1000;
  const origin = tsValid ? record.clickTs : record.t0;
  return { name, target: record.target, timestampBase: tsValid ? 'event.timeStamp' : 'handler-start',
    inputDelayMs: tsValid ? round1(record.t0 - record.clickTs) : null, handlerMs: round1((record.t1 ?? record.t0) - record.t0),
    toAnimationFrameMs: round1(record.t2 - origin), toNextPaintMs: round1(record.t3 - origin),
    pointerdownToClickMs: Number.isFinite(record.pointerTs) && tsValid ? round1(record.clickTs - record.pointerTs) : null, clickTs: record.clickTs };
}

/** Reach a target the way a player would; every tab/page tap is recorded as a view switch. */
async function reach(page, profile, locator, ledger, why) {
  let scrolled = false;
  for (let guard = 0; guard < 12; guard++) {
    const plan = await locator.evaluate(el => window.__q0.revealPlan(el));
    if (plan.kind === 'ok') return true;
    if (plan.kind === 'module' || plan.kind === 'page') {
      const input = await measuredPress(page, profile, page.locator(plan.selector).first(), `${plan.kind}:${plan.target}`);
      ledger.push({ role: 'view-switch', kind: plan.kind, target: plan.target, why, input });
      continue;
    }
    if (plan.kind === 'scroll' && !scrolled) { await locator.scrollIntoViewIfNeeded(); scrolled = true; ledger.push({ role: 'view-switch', kind: 'scroll', why }); continue; }
    if (plan.kind === 'scroll') return false; // larger than the viewport; recorded by the snapshot
    throw Error(`Unreachable (${why}): ${JSON.stringify(plan)}`);
  }
  throw Error(`Reveal did not converge (${why})`);
}

const targetFor = (page, action, id) => ({
  select: () => page.locator(SELECTORS.ownCard).and(page.locator(`[data-id="${id}"]`)),
  'pill-plus': () => page.locator(SELECTORS.pillPlus), 'pill-minus': () => page.locator(SELECTORS.pillMinus),
  fury: () => page.locator(SELECTORS.fury), commit: () => page.locator(SELECTORS.commit), 'next-round': () => page.locator(SELECTORS.nextRound),
}[action]().first());

// >= 30 decision inputs that keep the draft legal (pills return to 0, Fury off each cycle).
const CYCLE_CARDS = ['qingxiao', 'yanxin', 'cangjiao', 'yaoheng', 'qingxiao'];
const SEQUENCE = CYCLE_CARDS.flatMap((card, index) => [
  ['select', card], ['pill-plus'], ['pill-plus'], ['fury'], ['pill-minus'], ['fury'], ['pill-minus'],
  ['module', index % 2 ? 'notes' : 'opponent'],
]);

async function latency(page, profile) {
  const inputs = [], skipped = [], ledger = [];
  const calibrationMs = round1(await page.evaluate(() => window.__q0.calibrate()));
  const tabs = await page.locator('#app [data-viewport-action="module"]').evaluateAll(nodes => nodes.filter(node => !node.closest('[hidden]')).map(node => node.dataset.viewportTarget));
  const startIndex = await page.evaluate(() => window.__q0.inputs.length);
  for (const [action, id] of SEQUENCE) {
    if (action === 'module') {
      const tab = page.locator(`#app [data-viewport-action="module"][data-viewport-target="${id}"]`).first();
      if (!await tab.count() || !await tab.isVisible()) { skipped.push(`module:${id} (no such visible tab)`); continue; }
      if (await tab.getAttribute('aria-selected') === 'true') { skipped.push(`module:${id} (already selected)`); continue; }
      inputs.push({ kind: 'module', explicit: true, ...await measuredPress(page, profile, tab, `module:${id}`) });
      continue;
    }
    const target = targetFor(page, action, id), before = ledger.length;
    await reach(page, profile, target, ledger, `${action}${id ? `:${id}` : ''}`);
    for (const step of ledger.slice(before)) if (step.input) inputs.push({ kind: step.kind, explicit: false, ...step.input });
    if (await target.isDisabled()) { skipped.push(`${action} disabled`); continue; }
    inputs.push({ kind: action.startsWith('pill') ? 'pill' : action, explicit: true, id: id || null, ...await measuredPress(page, profile, target, `${action}${id ? `:${id}` : ''}`) });
  }
  const log = await page.evaluate(start => window.__q0.inputs.slice(start), startIndex);
  const perf = await page.evaluate(() => ({ supported: window.__q0.perf.supported, longtask: window.__q0.perf.longtask, loaf: window.__q0.perf['long-animation-frame'], event: window.__q0.perf.event }));
  const first = log[0]?.clickTs ?? 0, last = Math.max(...log.map(record => record.t3 ?? 0));
  const inWindow = list => list.filter(entry => entry.start >= first - 1 && entry.start <= last + 1);
  const eventDurations = inputs.filter(input => Number.isFinite(input.clickTs)).map(input => {
    const match = perf.event.filter(entry => Math.abs(entry.start - input.clickTs) < 1.5 || (entry.name === 'click' && Math.abs(entry.start - input.clickTs) < 4));
    return match.length ? Math.max(...match.map(entry => entry.duration)) : null;
  });
  const metric = (list, key) => stats(list.map(input => input[key]));
  const core = inputs.filter(input => ['select', 'pill', 'fury'].includes(input.kind));
  const byKind = Object.fromEntries([...new Set(inputs.map(input => input.kind))].map(kind => [kind, metric(inputs.filter(input => input.kind === kind), 'toNextPaintMs')]));
  return {
    sequence: SEQUENCE.map(([action, id]) => id ? `${action}:${id}` : action), battleTabsAtStart: tabs, cpuCalibrationMs: calibrationMs,
    counts: { total: inputs.length, core: core.length, viewSwitch: inputs.length - core.length, skipped },
    summary: {
      coreToNextPaintMs: metric(core, 'toNextPaintMs'), allToNextPaintMs: metric(inputs, 'toNextPaintMs'), coreToAnimationFrameMs: metric(core, 'toAnimationFrameMs'),
      coreHandlerMs: metric(core, 'handlerMs'), coreInputDelayMs: metric(core, 'inputDelayMs'), byKindToNextPaintMs: byKind,
      over100msCore: core.filter(input => input.toNextPaintMs > 100).map(input => ({ name: input.name, toNextPaintMs: input.toNextPaintMs })),
    },
    browserApis: {
      supported: perf.supported,
      longTasks: perf.supported.includes('longtask') ? { count: inWindow(perf.longtask).length, maxMs: round1(Math.max(0, ...inWindow(perf.longtask).map(entry => entry.duration))) } : 'unsupported',
      longAnimationFrames: perf.supported.includes('long-animation-frame') ? { count: inWindow(perf.loaf).length, maxMs: round1(Math.max(0, ...inWindow(perf.loaf).map(entry => entry.duration))) } : 'unsupported',
      eventTimingOver16ms: perf.supported.includes('event') ? { inputsWithEntry: eventDurations.filter(value => value !== null).length, ...stats(eventDurations.filter(value => value !== null)) } : 'unsupported',
    },
    inputs: inputs.map(({ clickTs, ...input }) => input),
  };
}

// One round from an interactive table. 'look' = the player checks all four public
// opponent cards plus the announced card before acting.
const ROUND_PLANS = {
  minimal: [['select', 'qingxiao'], ['pill-plus'], ['pill-plus'], ['commit'], 'reveal', ['next-round'], 'table'],
  'glance-opponent': ['look', ['select', 'qingxiao'], 'look', ['pill-plus'], ['pill-plus'], 'look', ['commit'], 'reveal', ['next-round'], 'table'],
};

async function round(handle, profile, variant) {
  const { page } = handle;
  await enter(handle, profile, 'task-entry');
  const ledger = [], steps = [], snapshot = () => page.evaluate(() => window.__q0.snapshot());
  let commitTs = null, nextTs = null, revealWaitMs = null, nextRoundToTableMs = null, nextRoundReadyVia = null, autoViewChanges = 0;
  const waitMs = async (key, from) => {
    const result = await page.evaluate(key => window.__q0.waitFor(key), key);
    if (!result) { errors.push(`${profile.id}/${variant}: timed out waiting for ${key}`); return { ms: null, via: null }; }
    return { ms: round1(result.t - from), via: result.via };
  };
  const initial = await snapshot();
  for (const step of ROUND_PLANS[variant]) {
    const before = ledger.length, name = Array.isArray(step) ? step.filter(Boolean).join(':') : step;
    if (step === 'look') {
      const cards = page.locator(SELECTORS.opponentCard), count = await cards.count();
      for (let index = 0; index < count; index++) await reach(page, profile, cards.nth(index), ledger, 'see opponent card');
      const announced = page.locator(SELECTORS.announced).first();
      if (await announced.count()) await reach(page, profile, announced, ledger, 'see announced card');
    } else if (step === 'reveal') {
      revealWaitMs = (await waitMs('revealComplete', commitTs)).ms;
    } else if (step === 'table') {
      ({ ms: nextRoundToTableMs, via: nextRoundReadyVia } = await waitMs('table', nextTs));
    } else {
      const [action, id] = step, target = targetFor(page, action, id);
      await reach(page, profile, target, ledger, name);
      const modules = await page.evaluate(() => window.__q0.activeModules());
      const input = await measuredPress(page, profile, target, name);
      ledger.push({ role: 'decision', action, id: id || null, input });
      if (action === 'commit') commitTs = input.clickTs;
      if (action === 'next-round') nextTs = input.clickTs;
      if (!['commit', 'next-round'].includes(action) && !isDeepStrictEqual(modules, await page.evaluate(() => window.__q0.activeModules()))) { autoViewChanges++; ledger.at(-1).autoViewChange = true; }
    }
    const done = ['reveal', 'commit', 'next-round'].some(key => name.startsWith(key));
    const taps = ledger.slice(before).map(({ input, ...tap }) => ({ ...tap, ...(input ? { toNextPaintMs: input.toNextPaintMs } : {}) }));
    steps.push({ step: name, taps, ...(done ? {} : { view: await snapshot() }) });
  }
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), battleKey);
  const acceptedMatchesEngine = isDeepStrictEqual(saved?.match, data.expected);
  if (!acceptedMatchesEngine) errors.push(`${profile.id}/${variant}: accepted round differs from engine resolveRound`);
  const looks = steps.filter(step => step.step === 'look');
  const matrix = [['start', initial], ...steps.filter(step => step.view).map(step => [step.step, step.view])].map(([step, view]) => ({
    step, opponentCards: `${view.opponentCards.visible}/${view.opponentCards.total}`, announced: view.announced.visible, selectedOwn: view.selectedOwnVisible,
    ownCards: `${view.ownCards.visible}/${view.ownCards.total}`, pills: view.pillControlsVisible, commit: view.commitVisible, simultaneous: view.simultaneous, modules: view.activeModules.join(','),
  }));
  return {
    variant, plan: ROUND_PLANS[variant].map(step => Array.isArray(step) ? step.join(':') : step), entryTapsNotCounted: 1,
    totals: {
      taps: ledger.filter(item => item.kind !== 'scroll').length, decisionTaps: ledger.filter(item => item.role === 'decision').length,
      viewSwitchTaps: ledger.filter(item => item.role === 'view-switch' && item.kind !== 'scroll').length,
      moduleTabTaps: ledger.filter(item => item.kind === 'module').length, pageTaps: ledger.filter(item => item.kind === 'page').length,
      scrolls: ledger.filter(item => item.kind === 'scroll').length, appInitiatedViewChanges: autoViewChanges,
    },
    opponentLooks: looks.map((look, index) => ({ at: ['before choosing', 'after selecting a card', 'before commit'][index] || `look-${index}`, viewSwitchTaps: look.taps.filter(item => item.kind !== 'scroll').length, allFourVisibleAtOnce: look.view.opponentCards.visible === 4, simultaneousWithMoveControls: look.view.simultaneous })),
    afterSelectWithoutExtraTaps: steps.find(step => step.step.startsWith('select'))?.view,
    simultaneousDecisionViewSeen: matrix.some(row => row.simultaneous), visibilityMatrix: matrix,
    waits: { commitToRevealCompleteMs: revealWaitMs, nextRoundToDecisionReadyMs: nextRoundToTableMs, nextRoundReadyVia },
    acceptedMatchesEngine, initialView: initial, steps,
  };
}

const sourceInfo = () => {
  const git = args => { try { return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim(); } catch { return null; } };
  return { commit: git(['rev-parse', 'HEAD']), branch: git(['rev-parse', '--abbrev-ref', 'HEAD']), dirtyFiles: (git(['status', '--porcelain']) || '').split('\n').filter(Boolean) };
};
async function servedFingerprint() {
  const files = ['index.html', 'app.mjs', 'scene-adapters.mjs', 'battle-ui.mjs', 'battle-presentation.mjs', 'viewport.mjs', 'battle.css', 'scene-content.css', 'viewport.css'];
  const hash = value => createHash('sha256').update(value).digest('hex').slice(0, 16);
  return Promise.all(files.map(async file => {
    const local = await readFile(root + file).then(hash, () => null);
    const served = await fetch(new URL(file === 'index.html' ? '/' : file, base)).then(async response => response.ok ? hash(Buffer.from(await response.arrayBuffer())) : `HTTP ${response.status}`, error => `error ${error.message}`);
    return { file, local, served, matches: local === served };
  }));
}

const report = { ok: false, tool: 'tools/battle-measure.mjs', schema: 1, label: process.env.BATTLE_MEASURE_LABEL || null, startedAt: new Date().toISOString(),
  source: sourceInfo(), gameUrl: base.href, browser: { name: browserName, version: browser.version(), executable: browserName === 'chromium' && process.env.CHROME_PATH ? process.env.CHROME_PATH : 'playwright-bundled', headless: true },
  playwright: JSON.parse(await readFile(root + 'node_modules/playwright/package.json', 'utf8').catch(() => '{}')).version || null,
  fixture: { name: FIXTURE_NAME, sha256_16: data.hash, ...data.summary },
  settings: { motionPreference: 'system', reducedMotionMedia: 'no-preference', pace: 'normal', sound: false, coldRuns, warmRuns,
    cold: 'new browser context (empty HTTP cache, new renderer) in an already-running browser', warm: 'same page navigated again; the dev server sends Cache-Control: no-store, so warm != HTTP-cached',
    latencyMetric: 'toNextPaintMs = click Event.timeStamp -> first task after the next requestAnimationFrame callback (approximate next presented frame)' },
  selectors: SELECTORS, servedFiles: await servedFingerprint(), profiles: [], errors };

let failure = null;
try {
  await mkdir(output, { recursive: true });
  for (const profile of PROFILES) {
    if (profile.only && profile.only !== browserName) { report.profiles.push({ id: profile.id, skipped: `${profile.only} only (CDP CPU throttling)` }); continue; }
    console.log(`MEASURE ${browserName} ${profile.id}`);
    const result = { id: profile.id, viewport: profile.viewport, deviceScaleFactor: profile.deviceScaleFactor, touch: profile.touch, cpuThrottle: profile.cpuThrottle, entry: { cold: [], warm: [] } };
    let handle;
    for (let run = 0; run < coldRuns; run++) {
      if (handle) { await handle.page.context().close(); contexts.delete(handle.page.context()); }
      handle = await openPage(profile);
      result.entry.cold.push(await enter(handle, profile, 'cold'));
    }
    for (let run = 0; run < warmRuns; run++) result.entry.warm.push(await enter(handle, profile, 'warm'));
    const summarize = runs => ({
      lobbyUsableMs: stats(runs.map(run => run.lobbyUsableMs)), lobbySettledMs: stats(runs.map(run => run.lobbySettledMs)),
      battleIfImmediateTapMs: stats(runs.map(run => run.battleIfImmediateTapMs)),
      battleInteractiveAfterResumeClickMs: stats(runs.map(run => run.battleInteractiveAfterResumeClickMs)), battleSettledAfterResumeClickMs: stats(runs.map(run => run.battleSettledAfterResumeClickMs)),
      domContentLoadedMs: stats(runs.map(run => run.navigation?.domContentLoadedEventEnd)), firstContentfulPaintMs: stats(runs.map(run => run.paint?.['first-contentful-paint'])),
      transferBytesTotal: stats(runs.map(run => run.transfer.total.transferBytes)), transferBytesUntilResume: stats(runs.map(run => run.transfer.untilResumeClick.transferBytes)),
      requestsTotal: stats(runs.map(run => run.transfer.total.requests)),
    });
    result.entry.summary = { cold: summarize(result.entry.cold), warm: summarize(result.entry.warm) };
    result.environment = await handle.page.evaluate(() => ({ userAgent: navigator.userAgent, devicePixelRatio, inner: [innerWidth, innerHeight], bodyMotion: document.body.dataset.motion, prefersReducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches }));
    result.latency = await latency(handle.page, profile);
    result.task = { minimal: await round(handle, profile, 'minimal'), glanceOpponent: await round(handle, profile, 'glance-opponent') };
    await handle.page.context().close(); contexts.delete(handle.page.context());
    report.profiles.push(result);
    const s = result.entry.summary, l = result.latency.summary, g = result.task.glanceOpponent.totals;
    console.log(`  entry cold lobby p50 ${s.cold.lobbyUsableMs.p50}ms battle(immediate tap) p50 ${s.cold.battleIfImmediateTapMs.p50}ms bytes ${s.cold.transferBytesTotal.p50}; warm lobby p50 ${s.warm.lobbyUsableMs.p50}ms battle p50 ${s.warm.battleIfImmediateTapMs.p50}ms`);
    console.log(`  latency core n=${l.coreToNextPaintMs.n} p50 ${l.coreToNextPaintMs.p50}ms p95 ${l.coreToNextPaintMs.p95}ms max ${l.coreToNextPaintMs.max}ms`);
    console.log(`  round glance-opponent taps ${g.taps} (decision ${g.decisionTaps}, view switches ${g.viewSwitchTaps}); minimal taps ${result.task.minimal.totals.taps}`);
  }
} catch (error) {
  failure = error.stack;
} finally {
  await Promise.allSettled([...contexts].map(context => context.close())); await browser.close();
  report.ok = !failure && errors.length === 0; if (failure) report.error = failure;
  report.finishedAt = new Date().toISOString();
  report.caveats = [
    'Headless Playwright engines on a desktop Mac; phone profiles are emulated viewport/DPR/touch, not physical iOS/Android devices.',
    'Synthetic fixture and loopback dev server (no-store, uncompressed); not production hosting, CDN or real network conditions.',
    'Frame timing is quantized by the headless compositor (~16.7 ms at 60 Hz); toNextPaintMs approximates presentation, it is not a display photon measurement.',
    'Playwright actionability/automation overhead is excluded from in-page latency but included in *WallMs fields.',
    'CPU 4x throttling is Chromium CDP emulation of a slower CPU, not a model of a specific phone.',
    'Chromium touch emulation (tap) adds about one frame versus a mouse click at any DPR; WebKit tap does not. Compare like with like (same browser/profile).',
    'WebKit performance.now/Event.timeStamp are quantized to 1 ms; Event Timing entries exist only at >= 16 ms (durationThreshold floor).',
    'Task steps follow a scripted shortest route (tab containing the target, then list page); they count interface steps, not human search time.',
  ];
  const file = `${output}battle-measure${label}-${browserName}.json`;
  await writeFile(file, JSON.stringify(report, null, 2) + '\n');
  console.log(`${report.ok ? 'OK' : 'FAILED'} wrote ${file}`);
  if (!report.ok) { console.error(failure || JSON.stringify(errors, null, 2)); process.exitCode = 1; }
}
