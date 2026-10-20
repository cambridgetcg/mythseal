/**
 * T1 first-visit teaching acceptance (docs/TUTORIAL-T1.md §7.2) on a loopback server with
 * synthetic saves built by the real rules. Phone emulation: Chromium (installed Google Chrome)
 * with Playwright's Pixel 7 descriptor, then WebKit with its iPhone 15 descriptor; the clock and
 * Math.random are fixed as in tools/coach-smoke.mjs.
 *
 * Hints, at every portrait size of §7.2 (with an iPhone's top and bottom insets on two): each
 * scene renders once with the hints switched off ({"off":true}, the control) and once without a
 * record; the hint must be placed as role="note" in its slot's place, its box (margins included)
 * no taller than the boxes it replaces and removes, every later sibling and list frame at the
 * same or a higher position with the same or a greater height, the lobby's continue button,
 * companions and ledger no lower and above the dock, no new viewport-overflow flag, the same
 * page counts and controls, active modules unclipped, no document scroll, text ≥ 10 px and
 * never clamped or clipped. Behaviour at the device's own size: a visit hint lasts its visit and
 * is gone on the next and after a reload; the bag's layout and an opened character keep the
 * visit; nothing is recorded under a dialog until it closes; condition hints follow the profile;
 * a first visit with another volume's locked node keeps 「渡口首勝後，展開此卷」; 火焰山 is not
 * recorded while 牌組 is open; placement is idempotent; the switch turns hints off at once and
 * back on from the next visit, is absent in battle and keeps 16 px; a twelve-battle journey sees
 * no hint and writes no record; browsing writes only shanhai.guide.v1 and no profile byte; no
 * hint or guide write in battle; Back keeps its depth and goes home from a scene with a hint.
 * At 844×390 and 734×343 (items 17 and 18) the same layout checks are recorded as NOTE lines
 * when the control already flags, and asserted otherwise.
 *
 * 詞彙: 金幣 and 靈砂 at every portrait size, and 執令者 Lv at 1280×800, open the rules dialog on
 * 詞彙 at that term, on its page and focused, under the term-mode heading; Back closes it and
 * focus returns to the button; the lobby's 弈道 link opens on 弈道 page 1 with the intro first,
 * even after the dialog was left on 詞彙; every definition fits two lines at 302 px. With
 * BASELINE_URL (a loopback server for main's checkout), the 弈道 module and list gain no
 * viewport-overflow flag main lacks and the list frame is never shorter, at every portrait size
 * and at 852×393 (an iPhone's landscape insets), 844×390 and 734×343; 667×375, 640×360 and
 * 568×320 are recorded only (n2's landscape work has not landed).
 *
 * Header: at every portrait size and 1280×800 every control is 44 × 44, none overlaps another,
 * and taps across each one's width land on it; at 302 px with 999,999 coins and 99,999 靈砂 the
 * page does not scroll sideways and every control stays on screen; at the cap (1,000,000,000 each)
 * the header is no wider than main's with the same save (recorded either way). Reduced motion:
 * hints and terms have no animation or transition under body[data-motion="reduce"] and under
 * emulated prefers-reduced-motion. With NATIVE_URL (a loopback server for npm run
 * build:native's dist/) and a simulated Capacitor bridge as in tools/native-smoke.mjs: the
 * header (with 存檔) passes the header checks, 金幣 opens 詞彙, and on a fresh journey 存檔's
 * 「弈道 · 遊戲規則」 then 知其道，入其局 opens the 霧隱渡口 preparation on 遊歷, Back twice
 * reaching 洞府.
 *
 * Headless engines and synthetic saves: no physical phone, VoiceOver or TalkBack (the M5.1
 * checklist keeps those rows). Usage:
 *   GAME_URL=http://127.0.0.1:<port> [BASELINE_URL=http://127.0.0.1:<port>] [NATIVE_URL=http://127.0.0.1:<port>] \
 *   [BROWSER=webkit] node tools/guide-smoke.mjs
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createProfile, hydrateProfile, beginBattle, finishBattle, startActivity, abandonActivity, PROFILE_KEY } from '../progression.mjs';
import { mintInstance } from '../collection.mjs';
import { WX01_PRINTINGS } from '../printing-catalogue.mjs';
import { NAV_STATE_KEY } from '../nav-stack.mjs';
import { GUIDE_KEY, GUIDE_HINTS } from '../first-visit.mjs';
import { revealViewportItem, viewportFrames } from './viewport-browser-helpers.mjs';

const browserName = process.env.BROWSER || 'chromium';
if (!['chromium', 'webkit'].includes(browserName)) throw Error('BROWSER must be chromium or webkit.');
const runtime = fileURLToPath(new URL('../test-results/webkit-runtime', import.meta.url));
if (browserName === 'webkit' && !process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(runtime)) process.env.PLAYWRIGHT_BROWSERS_PATH = runtime;
const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
if (!process.env.GAME_URL) throw Error('Set GAME_URL to the loopback server serving this checkout, e.g. GAME_URL=http://127.0.0.1:4177.');
const loopback = value => { const url = new URL(value); if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw Error('Guide smoke requires loopback URLs.'); return url; };
const base = loopback(process.env.GAME_URL);
const baseline = process.env.BASELINE_URL ? loopback(process.env.BASELINE_URL) : null;
const nativeBase = process.env.NATIVE_URL ? loopback(process.env.NATIVE_URL) : null;
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const deviceName = browserName === 'webkit' ? 'iPhone 15' : 'Pixel 7';
const { defaultBrowserType, ...device } = engines.devices[deviceName];
const now = '2026-09-22T12:00:00.000Z', preferenceKey = 'shanhai.experience.v1';
const checks = [], errors = [], notes = [], contexts = new Set();
const passed = label => { checks.push(label); console.log(`PASS ${deviceName}: ${label}`); };
const note = label => { notes.push(label); console.log(`NOTE ${deviceName}: ${label}`); };
// GUIDE_AUDIT=1 records every failed layout expectation instead of stopping at the first (exit 1 at the end).
const audit = process.env.GUIDE_AUDIT === '1', findings = [];
const check = (ok, message) => { if (ok) return; if (!audit) assert.fail(message); findings.push(message); console.log(`AUDIT FAIL ${message}`); };

// Portrait sizes (§7.2): N1's narrowest phones to a large iPhone, and two with an iPhone's insets.
const SIZES = [[302, 640], [320, 568], [360, 740], [360, 780], [393, 659], [393, 780], [412, 790], [430, 932],
  [412, 839, { top: 48, bottom: 34 }], [393, 852, { top: 59, bottom: 34 }]].map(([width, height, insets = null]) => ({ width, height, insets, label: `${width}x${height}${insets ? ` (insets ${insets.top}/${insets.bottom})` : ''}` }));
const SIZE_FILTER = process.env.GUIDE_SIZE ? SIZES.filter(size => `${size.width}x${size.height}` === process.env.GUIDE_SIZE) : SIZES;

// ── Fixtures: legal synthetic saves built with the real rules ──────────────────────
const day = new Date(now);
function won() {
  // The first ferry won: a newcomer with one finished battle, about to go to 青玉森庭.
  const started = beginBattle(createProfile({ now: day }), { kind: 'expedition', nodeId: 'mist-gate', rng: () => 0.23, now: day });
  const played = Object.keys(started.encounter.cardInstances).slice(0, 2);
  const profile = finishBattle(started.profile, { encounterId: started.encounter.id, winner: 'player', playedCardIds: played, now: day }).profile;
  return { ...profile, location: 'jade-forest' };
}
function n1() {
  // As tools/shell-smoke.mjs: every WX-01 printing minted, the bag at its fullest.
  let profile = createProfile({ now: day });
  for (const print of WX01_PRINTINGS) profile = mintInstance(profile, print.cardId, { printId: print.id, now: day, source: 'guide-fixture' }).profile;
  profile.coins = 50000; profile.dust = 1000; profile.cleared = ['mist-gate'];
  return hydrateProfile(profile, { now: day });
}
function veteran() {
  // Twelve finished battles and one fire-mountain run started and given up.
  const start = startActivity(won(), { rng: () => 0.23, now: day }).profile;
  const tried = abandonActivity(start, { expectedRunId: start.expansion.fireMountain.run.id, now: day });
  return { ...tried, stats: { ...tried.stats, played: 12, won: 7 } };
}
const rich = (coins, dust) => JSON.stringify({ ...createProfile({ now: day }), coins, dust });
const FIXTURES = { fresh: null, won: JSON.stringify(won()), n1: JSON.stringify(n1()), veteran: JSON.stringify(veteran()),
  rich: rich(999999, 99999), cap: rich(1_000_000_000, 1_000_000_000) };

// ── Pages ───────────────────────────────────────────────────────────────────────
const browser = await engines[browserName].launch({ headless: true, ...(browserName === 'chromium' && existsSync(chrome) ? { executablePath: chrome } : {}) });
const version = browser.version();
async function open(name, { size = null, guide = undefined, motion = 'reduce', emulate = motion === 'reduce' ? 'reduce' : 'no-preference', url = base, native = null } = {}) {
  const context = await browser.newContext({ ...device, ...(size ? { viewport: { width: size.width, height: size.height }, screen: { width: size.width, height: size.height } } : {}), reducedMotion: emulate });
  if (native) await bridge(context, native);
  contexts.add(context);
  await context.addInitScript(({ profile, guide, keys, now, insets, motion }) => {
    const NativeDate = Date, fixed = new NativeDate(now).getTime();
    globalThis.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } };
    Math.random = () => 0.23;
    if (!localStorage.getItem('guide-smoke.seeded')) {
      localStorage.setItem('guide-smoke.seeded', 'yes');
      if (profile) localStorage.setItem(keys.profile, profile);
      if (guide !== undefined) localStorage.setItem(keys.guide, guide);
      localStorage.setItem(keys.preferences, JSON.stringify({ sound: false, ambience: 0.35, effects: 0.6, motion: motion === 'reduce' ? 'reduce' : 'system', pace: 'fast' }));
    }
    // Every localStorage write, by key.
    const nativeSet = Storage.prototype.setItem, nativeRemove = Storage.prototype.removeItem;
    window.guideSmokeWrites = [];
    Storage.prototype.setItem = function(key, value) { nativeSet.call(this, key, value); if (this === localStorage) window.guideSmokeWrites.push(String(key)); };
    Storage.prototype.removeItem = function(key) { nativeRemove.call(this, key); if (this === localStorage) window.guideSmokeWrites.push(`-${key}`); };
    if (insets) {
      const apply = () => { for (const [side, px] of Object.entries(insets)) document.documentElement.style.setProperty(`--safe-area-inset-${side}`, `${px}px`); };
      if (document.documentElement) apply(); else document.addEventListener('readystatechange', apply, { once: true });
    }
  }, { profile: FIXTURES[name], guide, keys: { profile: PROFILE_KEY, guide: GUIDE_KEY, preferences: preferenceKey }, now, insets: size?.insets ?? null, motion });
  await context.route('**/*', route => {
    const request = route.request(), target = new URL(request.url());
    if (target.origin === url.origin && target.pathname === '/api/v1/account' && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: false, user: null, emailEnabled: true }) });
    }
    if (target.origin !== url.origin || target.pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method())) {
      errors.push(`Unexpected network ${request.method()} ${target.origin}${target.pathname}`); return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(`${name}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`${name} console: ${message.text()}`); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${new URL(response.url()).pathname}`); });
  await page.goto(url.href); await page.locator('.game-lobby').waitFor();
  await settle(page);
  return page;
}
/** The simulated store-app bridge of tools/native-smoke.mjs: Filesystem and Share over a Map in
 * this process, so the native build's durable copy and save panel work. */
async function bridge(context, files) {
  await context.exposeFunction('__guideNative', (method, options) => {
    const key = (directory, path) => `${directory}:${path}`;
    if (method === 'writeFile') { files.set(key(options.directory, options.path), options.data); return { uri: `file:///app/${options.directory}/${options.path}` }; }
    if (method === 'readFile') { const data = files.get(key(options.directory, options.path)); return data === undefined ? { error: 'File does not exist.' } : { data }; }
    if (method === 'rename') { const from = key(options.directory, options.from); if (!files.has(from)) return { error: 'File does not exist.' }; files.set(key(options.toDirectory, options.to), files.get(from)); files.delete(from); return {}; }
    if (method === 'readdir') { const prefix = key(options.directory, `${options.path}/`), names = [...files.keys()].filter(name => name.startsWith(prefix)).map(name => name.slice(prefix.length)).filter(name => !name.includes('/')); return names.length ? { files: names.map(name => ({ name, type: 'file' })) } : { error: 'File does not exist.' }; }
    if (method === 'share') return { activityType: 'com.apple.DocumentManagerUICore.SaveToFiles' };
    return { error: `unknown ${method}` };
  });
  await context.addInitScript(() => {
    const call = async (method, options) => { const result = await window.__guideNative(method, options); if (result?.error) throw new Error(result.error); return result; };
    window.Capacitor = { isNativePlatform: () => true, Plugins: {
      Filesystem: { writeFile: options => call('writeFile', options), readFile: options => call('readFile', options), rename: options => call('rename', options), readdir: options => call('readdir', options) },
      Share: { share: options => call('share', options) },
    } };
  });
}
async function release(page) { const context = page.context(); await context.close(); contexts.delete(context); }
async function settle(page) { await page.evaluate(() => document.fonts?.ready); await viewportFrames(page); await viewportFrames(page); }
const stored = (page, key) => page.evaluate(key => localStorage.getItem(key), key);
const guideRecord = async page => JSON.parse(await stored(page, GUIDE_KEY) ?? 'null');
const writes = page => page.evaluate(() => window.guideSmokeWrites);
const resetWrites = page => page.evaluate(() => { window.guideSmokeWrites = []; });
const depth = page => page.evaluate(key => history.state?.[key]?.depth ?? null, NAV_STATE_KEY);
const tap = async (page, selector) => { await page.locator(selector).first().tap(); await settle(page); };
const reveal = async (page, selector) => { await revealViewportItem(page, page.locator(selector).first()); await settle(page); };
const hintCount = (page, scope = '') => page.locator(`${scope} [data-guide-hint]`).count();
/** Reloads the page with the given guide record (undefined: none), back on the lobby. */
async function reloadWith(page, record) {
  await page.evaluate(({ key, record }) => { if (record === undefined) localStorage.removeItem(key); else localStorage.setItem(key, record); }, { key: GUIDE_KEY, record });
  await page.reload(); await page.locator('.game-lobby').waitFor(); await settle(page);
}

// ── 詞彙 and header helpers ───────────────────────────────────────────────────────
/** The rules dialog as it stands: heading, selected module, the 弈道 list and the focused term. */
const rulesState = page => page.evaluate(() => {
  const dialog = document.querySelector('#overlay-root .modal'); if (!dialog) return null;
  const list = dialog.querySelector('[data-viewport-list="rules"]'), words = dialog.querySelector('[data-viewport-list="glossary"]');
  const visible = node => node && !node.closest('[hidden]') && node.getClientRects().length > 0;
  return { eyebrow: dialog.querySelector('.eyebrow')?.textContent, title: dialog.querySelector('h2')?.textContent,
    module: dialog.querySelector('[data-viewport-action="module"][aria-selected="true"]')?.dataset.viewportTarget,
    action: dialog.querySelector('.modal-actions [data-action]')?.textContent.trim(),
    rulesPage: list?.dataset.page ?? null, firstItem: list?.firstElementChild?.tagName + ':' + list?.firstElementChild?.textContent.slice(0, 6),
    firstVisible: visible(list?.firstElementChild),
    focused: document.activeElement?.dataset.glossaryTerm ?? null, focusedVisible: visible(document.activeElement), glossaryPage: words?.dataset.page ?? null };
});
const termFits = page => page.evaluate(() => [...document.querySelectorAll('#overlay-root .glossary-term')].map(term => {
  const text = term.querySelector('p'), style = getComputedStyle(text), range = document.createRange();
  // Count lines by the text's own line boxes, so a hidden page item can be measured too.
  const hidden = term.hidden; term.hidden = false; range.selectNodeContents(text);
  const tops = new Set([...range.getClientRects()].map(rect => Math.round(rect.top)));
  const lines = Math.round(text.getBoundingClientRect().height / parseFloat(style.lineHeight)); term.hidden = hidden;
  return { id: term.dataset.glossaryTerm, lines: Math.max(lines, tops.size) };
}));
const RULES_FRAME = page => page.evaluate(() => {
  const list = document.querySelector('#overlay-root [data-viewport-list="rules"]'), module = list?.closest('[data-viewport-module]');
  return { frame: list?.closest('.viewport-list-frame')?.getBoundingClientRect().height ?? null, pages: list?.dataset.pageCount ?? null,
    flags: [list, module, list?.closest('[data-viewport-surface]')].filter(node => node?.dataset.viewportOverflow === 'true').map(node => node.dataset.viewportList || node.dataset.viewportModule || 'surface') };
});
/** As tools/shell-smoke.mjs headerClash: header controls, overlaps, and taps across each width. */
const headerClash = page => page.evaluate(() => {
  const label = node => node.dataset.action ? node.dataset.action + (node.dataset.id ? ':' + node.dataset.id : '') : node.getAttribute('aria-label') || node.tagName;
  const nodes = [...document.querySelectorAll('.game-header button')].filter(node => !node.closest('[hidden],[inert]') && getComputedStyle(node).visibility !== 'hidden' && node.getClientRects().length > 0);
  const overlapping = (a, b) => a.left < b.right - .5 && b.left < a.right - .5 && a.top < b.bottom - .5 && b.top < a.bottom - .5;
  const overlaps = nodes.flatMap((node, i) => nodes.slice(i + 1).filter(other => overlapping(node.getBoundingClientRect(), other.getBoundingClientRect())).map(other => [label(node), label(other)]));
  const misses = nodes.flatMap(node => {
    const rect = node.getBoundingClientRect();
    return [1, 2, 3, 4, 5, 6, 7].map(k => [rect.left + rect.width * k / 8, rect.top + rect.height / 2]).filter(([x, y]) => { const hit = document.elementFromPoint(x, y); return !(hit && (hit === node || node.contains(hit))); }).map(([x]) => `${label(node)}@${Math.round(x)}`);
  });
  const small = nodes.filter(node => { const rect = node.getBoundingClientRect(); return rect.width < 43.5 || rect.height < 43.5; }).map(node => `${label(node)} ${Math.round(node.getBoundingClientRect().width)}x${Math.round(node.getBoundingClientRect().height)}`);
  const outside = nodes.filter(node => { const rect = node.getBoundingClientRect(); return rect.left < -0.5 || rect.right > innerWidth + 0.5; }).map(label);
  return { controls: nodes.map(label), overlaps, misses, small, outside, scrollX: document.scrollingElement.scrollWidth > innerWidth + 1, width: document.querySelector('.game-header').scrollWidth };
});
function assertHeader(view, at) {
  assert.deepEqual(view.small, [], `${at}: every header control is 44 × 44`);
  assert.deepEqual(view.overlaps, [], `${at}: no two header controls overlap`);
  assert.deepEqual(view.misses, [], `${at}: taps across each header control land on it`);
  assert.deepEqual(view.outside, [], `${at}: every header control is on screen`);
  assert.equal(view.scrollX, false, `${at}: no horizontal page scroll`);
}
/** Opens the dialog from a header resource and checks the term mode. */
async function openTerm(page, id, at) {
  const button = page.locator(`.game-header [data-action="glossary"][data-id="${id}"]`);
  await button.tap(); await page.locator('#overlay-root .glossary-list').waitFor({ state: 'attached' });
  await page.waitForFunction(id => document.activeElement?.dataset.glossaryTerm === id, id, { timeout: 4000 }).catch(() => {});
  await settle(page);
  const state = await rulesState(page);
  assert.equal(state.module, 'glossary', `${at}: ${id} opens on 詞彙`);
  assert.equal(state.focused, id, `${at}: the term ${id} has focus`);
  assert.ok(state.focusedVisible, `${at}: the term ${id} is on the current page`);
  assert.equal(state.eyebrow, 'WORDS ON THE ROAD'); assert.equal(state.title, '識其名，知其用。');
  assert.match(state.action, /^明白了/, `${at}: the term mode offers 明白了`);
  return state;
}

// ── Scenes: how a player reaches each hint's slot ───────────────────────────────
const HINT = Object.fromEntries(GUIDE_HINTS.map(hint => [hint.id, hint]));
const SCENES = [
  { id: 'home-start', fixture: 'fresh', root: '#app', reach: async () => {} },
  { id: 'arena-first', fixture: 'fresh', root: '#app', reach: async page => { await tap(page, '.game-dock [data-action="arena"]'); await reveal(page, '#app .arena-lobby-copy h2'); } },
  { id: 'market-printing', fixture: 'fresh', root: '#app', reach: async page => { await tap(page, '.game-dock [data-action="market"]'); await reveal(page, '#app .scene-wx01-offer h2'); } },
  { id: 'quests-why', fixture: 'fresh', root: '#overlay-root .modal', reach: async page => { await tap(page, '.game-lobby [data-action="quests"]'); await reveal(page, '#overlay-root .daily-gift h2'); } },
  { id: 'world-level', fixture: 'won', root: '#app', reach: async page => { await tap(page, '.game-dock [data-action="world"]'); await reveal(page, '#app .destination-panel h2'); } },
  { id: 'fire-mountain', fixture: 'won', root: '#overlay-root .modal', reach: async page => {
    await tap(page, '.game-dock [data-action="arena"]'); await reveal(page, '#app [data-action="activity-open"]');
    await tap(page, '#app [data-action="activity-open"]'); await reveal(page, '#overlay-root .activity-arrival h3');
  } },
  { id: 'bag-copies', fixture: 'n1', root: '#app', reach: async page => { await tap(page, '.game-dock [data-action="bag"]'); } },
  { id: 'bag-decks', fixture: 'n1', root: '#app', reach: async page => { await tap(page, '.game-dock [data-action="bag"]'); await tap(page, '#app [data-action="cards-tab"][data-id="decks"]'); } },
];

/** One pass over a scene: the slot (or the hint), its later siblings, the list frames, flags,
 * page counts, controls, modules, document scroll and, with a hint, its computed style. */
const measure = (page, { root, hintId, replace, remove }) => page.evaluate(({ root: rootSelector, hintId, replace, remove, navKey }) => {
  const root = document.querySelector(rootSelector);
  const shown = node => node && !node.closest('[hidden]') && node.getClientRects().length > 0;
  const box = node => { const rect = node.getBoundingClientRect(), style = getComputedStyle(node); return { top: rect.top, bottom: rect.bottom, height: rect.height, width: rect.width, outer: rect.height + parseFloat(style.marginTop) + parseFloat(style.marginBottom) }; };
  const hint = hintId ? root.querySelector(`[data-guide-hint="${hintId}"]`) : null;
  const slot = hintId ? hint : root.querySelector(`${replace}:not([data-guide-hint])`);
  const removed = !hintId && slot ? [...slot.parentElement.children].filter(child => remove.some(selector => child.matches(selector))) : [];
  const later = [];
  for (let node = slot?.nextElementSibling; node; node = node.nextElementSibling) if (!removed.includes(node) && shown(node)) later.push({ name: `${node.tagName}.${[...node.classList].join('.')}`, ...box(node) });
  const frames = [...root.querySelectorAll('.viewport-list-frame')].filter(shown).map(node => ({ name: node.querySelector('[data-viewport-list]')?.dataset.viewportList, ...box(node) }));
  const flags = [...root.querySelectorAll('[data-viewport-overflow="true"]')].map(node => node.dataset.viewportList || node.dataset.viewportSurface || node.dataset.viewportModule || node.className.split(' ')[0]);
  if (root.matches('[data-viewport-overflow="true"]')) flags.push('root');
  const pages = Object.fromEntries([...root.querySelectorAll('[data-viewport-list]')].map(node => [node.dataset.viewportList, node.dataset.pageCount ?? null]));
  const controls = root.querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]').length;
  const clipped = [...root.querySelectorAll('[data-viewport-module]')].filter(module => shown(module) && module.scrollHeight > module.clientHeight + 1).map(module => module.dataset.viewportModule);
  const scroller = document.scrollingElement;
  const lobby = Object.fromEntries(['.lobby-continue', '.scene-lobby-companions', '.lobby-ledger', '.lobby-ledger [data-action="rules"]'].map(selector => [selector, document.querySelector(`#app ${selector}`) ? box(document.querySelector(`#app ${selector}`)) : null]));
  const dock = document.querySelector('#app .game-dock')?.getBoundingClientRect().top ?? null;
  let style = null;
  if (hint) {
    const body = hint.querySelector('.guide-hint-body'), mark = hint.querySelector('.guide-hint-seal,.guide-hint-voice'), css = node => getComputedStyle(node);
    const clips = node => ['hidden', 'clip'].includes(css(node).overflowX) || ['hidden', 'clip'].includes(css(node).overflowY) || css(node).textOverflow === 'ellipsis' || !['none', ''].includes(css(node).webkitLineClamp ?? 'none');
    style = { role: hint.getAttribute('role'), tag: hint.tagName, size: parseFloat(css(body).fontSize), markSize: mark ? parseFloat(css(mark).fontSize) : null,
      clips: clips(hint) || clips(body), scroll: hint.scrollHeight > hint.clientHeight + 1, border: css(body).borderTopWidth + ' ' + css(body).borderLeftWidth,
      text: hint.textContent, lines: Math.round(body.getBoundingClientRect().height / parseFloat(css(body).lineHeight)) };
  }
  return { found: Boolean(slot), visible: shown(slot), slot: slot ? box(slot) : null, removed: removed.map(box), later, frames, flags, pages, controls, clipped,
    scroll: { y: scroller.scrollHeight > innerHeight + 1, x: scroller.scrollWidth > innerWidth + 1 }, lobby, dock, style, depth: history.state?.[navKey]?.depth ?? null };
}, { root, hintId, replace, remove, navKey: NAV_STATE_KEY });

function compare(scene, size, control, hinted) {
  const at = `${scene.id} at ${size.label}`, slack = 1;
  check(control.found && control.visible, `${at}: the control pass shows the slot (${HINT[scene.id].slot.replace})`);
  check(hinted.found && hinted.visible, `${at}: the hint is placed and visible`);
  check(hinted.style.role === 'note', `${at}: role="note"`);
  const slotTotal = control.slot.outer + control.removed.reduce((sum, item) => sum + item.outer, 0);
  check(hinted.slot.outer <= slotTotal + slack, `${at}: the hint (${hinted.slot.outer.toFixed(1)} px with margins) is no taller than its slot (${slotTotal.toFixed(1)} px): ${hinted.style.text}`);
  check(hinted.later.length === control.later.length, `${at}: the same later siblings`);
  hinted.later.forEach((item, index) => {
    const before = control.later[index];
    check(item.name === before.name, `${at}: later sibling ${index}`);
    check(item.top <= before.top + slack && item.height >= before.height - slack, `${at}: ${item.name} keeps its place or rises (top ${before.top.toFixed(1)} → ${item.top.toFixed(1)}, height ${before.height.toFixed(1)} → ${item.height.toFixed(1)})`);
  });
  check(hinted.frames.length === control.frames.length, `${at}: the same list frames`);
  hinted.frames.forEach((item, index) => {
    const before = control.frames[index];
    check(item.top <= before.top + slack && item.height >= before.height - slack, `${at}: list frame ${item.name} keeps its place and height (top ${before.top.toFixed(1)} → ${item.top.toFixed(1)}, height ${before.height.toFixed(1)} → ${item.height.toFixed(1)})`);
  });
  for (const [selector, before] of scene.id === 'home-start' ? Object.entries(control.lobby) : []) {
    const after = hinted.lobby[selector];
    if (!before) { check(after === null, `${at}: ${selector}`); continue; }
    check(after.bottom <= before.bottom + slack, `${at}: ${selector} is no lower (${before.bottom.toFixed(1)} → ${after.bottom.toFixed(1)})`);
    if (scene.id === 'home-start') check(after.bottom <= hinted.dock + slack, `${at}: ${selector} stays above the dock`);
  }
  const fresh = hinted.flags.filter(flag => !control.flags.includes(flag));
  check(!fresh.length, `${at}: no new viewport-overflow flag (${fresh.join(', ')})`);
  check(JSON.stringify(hinted.pages) === JSON.stringify(control.pages), `${at}: the same page counts (${JSON.stringify(control.pages)} → ${JSON.stringify(hinted.pages)})`);
  check(hinted.controls === control.controls, `${at}: the same number of controls`);
  check(!hinted.clipped.filter(module => !control.clipped.includes(module)).length, `${at}: active modules stay unclipped (${hinted.clipped})`);
  check(!(hinted.scroll.y && !control.scroll.y) && !(hinted.scroll.x && !control.scroll.x), `${at}: no document scroll`);
  check(hinted.style.size >= 10 && (hinted.style.markSize ?? 99) >= 10, `${at}: text ≥ 10 px (${hinted.style.size}, ${hinted.style.markSize})`);
  check(hinted.style.markSize === null || hinted.style.markSize >= hinted.style.size - 0.01, `${at}: the seal or label is not smaller than the text`);
  check(!hinted.style.clips, `${at}: no clamp, ellipsis or hidden overflow`);
  check(!hinted.style.scroll, `${at}: the hint shows whole`);
  if (scene.id.startsWith('bag-')) { check(hinted.style.border === '0px 0px', `${at}: the bag hint's body has no border`); check(hinted.style.size === 11, `${at}: the bag hint is 11 px`); }
  check(hinted.depth === control.depth, `${at}: the same history depth with and without the hint`);
  return { at, hint: hinted.slot.outer, slot: slotTotal, lines: hinted.style.lines };
}

try {
  // ── 1. Every hint in its slot, at every portrait size, against a hints-off control ────
  for (const size of SIZE_FILTER) {
    const measured = [];
    for (const fixture of [...new Set(SCENES.map(scene => scene.fixture))]) {
      const page = await open(fixture, { size });
      for (const scene of SCENES.filter(item => item.fixture === fixture)) {
        const slot = { root: scene.root, replace: HINT[scene.id].slot.replace, remove: HINT[scene.id].slot.remove };
        await reloadWith(page, '{"seen":[],"off":true}'); await scene.reach(page);
        assert.equal(await hintCount(page), 0, `${scene.id} at ${size.label}: hints off places none`);
        const control = await measure(page, { ...slot, hintId: null });
        await reloadWith(page, undefined); await scene.reach(page);
        const hinted = await measure(page, { ...slot, hintId: scene.id });
        measured.push(compare(scene, size, control, hinted));
      }
      await release(page);
    }
    passed(`at ${size.label} every hint takes its slot's place: ${measured.map(item => `${item.at.split(' at ')[0]} ${item.hint.toFixed(1)}/${item.slot.toFixed(1)} px (${item.lines} line${item.lines > 1 ? 's' : ''})`).join(', ')}`);
  }

  // Regression sizes (items 17 and 18): recorded as NOTE lines where the control already flags.
  for (const size of process.env.GUIDE_SIZE ? [] : [{ width: 844, height: 390, insets: null, label: '844x390' }, { width: 734, height: 343, insets: null, label: '734x343' }]) {
    const results = [];
    for (const fixture of [...new Set(SCENES.map(scene => scene.fixture))]) {
      const page = await open(fixture, { size });
      for (const scene of SCENES.filter(item => item.fixture === fixture)) {
        const slot = { root: scene.root, replace: HINT[scene.id].slot.replace, remove: HINT[scene.id].slot.remove };
        await reloadWith(page, '{"seen":[],"off":true}'); await scene.reach(page);
        const control = await measure(page, { ...slot, hintId: null });
        await reloadWith(page, undefined); await scene.reach(page);
        const hinted = await measure(page, { ...slot, hintId: scene.id });
        if (!control.visible) { results.push(`${scene.id}: slot not shown here (hidden at this size)`); assert.equal(hinted.visible, false, `${scene.id} at ${size.label}: a hidden slot hides its hint`); continue; }
        if (control.flags.length) {
          try { compare(scene, size, control, hinted); results.push(`${scene.id}: passes (control flags ${control.flags.join(', ')})`); }
          catch (error) { results.push(`${scene.id}: ${error.message} (control already flags ${control.flags.join(', ')})`); }
        } else { compare(scene, size, control, hinted); results.push(`${scene.id}: asserted`); }
      }
      await release(page);
    }
    note(`regression size ${size.label}: ${results.join('; ')}`);
  }

  // GUIDE_LAYOUT_ONLY=1 stops after the layout pass (for copy and style iterations).
  if (process.env.GUIDE_LAYOUT_ONLY !== '1') {
  // ── 2. Visits: a visit hint lasts its visit, is gone on the next and after a reload ─────
  {
    const page = await open('n1');
    await resetWrites(page);
    const before = await stored(page, PROFILE_KEY);
    await tap(page, '.game-dock [data-action="bag"]');
    assert.equal(await hintCount(page, '#app'), 1, 'bag-copies on the first visit');
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) ?? 'null')?.seen?.includes('bag-copies'), GUIDE_KEY, { timeout: 4000 });
    // 排列方式 and an opened character keep the visit.
    await reveal(page, '#app [data-action="bag-layout"][data-id="copies"]');
    await tap(page, '#app [data-action="bag-layout"][data-id="copies"]');
    assert.equal(await hintCount(page, '#app'), 1, 'the layout change keeps the visit');
    await reveal(page, '#app [data-action="bag-layout"][data-id="groups"]');
    await tap(page, '#app [data-action="bag-layout"][data-id="groups"]');
    await reveal(page, '#app [data-action="bag-open-group"]');
    await tap(page, '#app [data-action="bag-open-group"]');
    assert.equal(await hintCount(page, '#app'), 0, 'an opened character renders no lead');
    await reveal(page, '#app [data-action="bag-close-group"]');
    await tap(page, '#app [data-action="bag-close-group"]');
    assert.equal(await hintCount(page, '#app'), 1, 'the hint is back when the character closes');
    assert.equal((await writes(page)).filter(key => key === GUIDE_KEY).length, 1, 'recorded once');
    // Next visit: gone; a reload: gone.
    await tap(page, '.game-dock [data-action="home"]');
    await tap(page, '.game-dock [data-action="bag"]');
    assert.equal(await hintCount(page, '#app'), 0, 'gone on the next visit');
    assert.equal(await stored(page, PROFILE_KEY), before, 'browsing changes no profile byte');
    assert.deepEqual([...new Set(await writes(page))], [GUIDE_KEY], 'browsing writes only shanhai.guide.v1');
    await page.reload(); await page.locator('.game-lobby').waitFor(); await settle(page);
    await tap(page, '.game-dock [data-action="bag"]');
    assert.equal(await hintCount(page, '#app'), 0, 'gone after a reload');
    // 三套牌組 is a visit of its own.
    await tap(page, '#app [data-action="cards-tab"][data-id="decks"]');
    assert.equal(await page.locator('#app [data-guide-hint="bag-decks"]').count(), 1, 'bag-decks on 三套牌組');
    // Back from a scene with a hint goes home, as before.
    await page.goBack(); await page.locator('.game-lobby').waitFor();
    passed('a visit hint lasts its visit (through 排列方式 and an opened character, recorded once), is gone on the next visit and after a reload; browsing writes only shanhai.guide.v1 and no profile byte; Back from a scene with a hint goes home');
    await release(page);
  }

  // ── 3. Not recorded under a dialog ────────────────────────────────────────────────
  {
    const page = await open('fresh');
    await page.evaluate(() => {
      document.querySelector('.game-dock [data-action="bag"]').click();
      const button = document.createElement('button'); button.dataset.action = 'rules'; document.body.append(button); button.click(); button.remove();
    });
    await page.locator('#overlay-root .rules-grid').waitFor();
    await settle(page);
    assert.equal(await page.locator('#app [data-guide-hint="bag-copies"]').count(), 1, 'the hint is placed behind the dialog');
    assert.equal(await guideRecord(page), null, 'nothing is recorded while a dialog covers it');
    await tap(page, '#overlay-root .modal-close');
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) ?? 'null')?.seen?.includes('bag-copies'), GUIDE_KEY, { timeout: 4000 });
    passed('a hint placed under a dialog is recorded only once the dialog closes');
    await release(page);
  }

  // ── 4. Conditions, the locked volume, the mountain, idempotence ─────────────────────
  {
    const page = await open('fresh');
    assert.equal(await page.locator('#app [data-guide-hint="home-start"]').count(), 1, 'home-start on a first visit');
    assert.equal((await page.locator('#app .lobby-route-footnote').textContent()).trim(), '四回合對弈 · AI 守境人', 'the footnote stays below 啟程遊歷');
    // A locked node of another volume selected: the lobby already says it all.
    await tap(page, '.game-dock [data-action="world"]');
    await reveal(page, '#app [data-action="world-select"][data-id="westward"]');
    await tap(page, '#app [data-action="world-select"][data-id="westward"]');
    await tap(page, '.game-dock [data-action="home"]');
    assert.equal(await page.locator('#app .lobby-continue').getAttribute('data-action'), 'story-unlock');
    assert.equal(await hintCount(page, '#app'), 0, 'no home-start beside 先赴霧隱渡口');
    assert.equal((await page.locator('#app .lobby-route-footnote').textContent()).trim(), '渡口首勝後，展開此卷');
    // Placement is idempotent: the quests dialog, re-rendered and re-placed, holds one hint.
    await tap(page, '.game-lobby [data-action="quests"]');
    await tap(page, '#overlay-root [data-action="quest-tab"][data-id="weekly"]');
    await tap(page, '#overlay-root [data-action="quest-tab"][data-id="daily"]');
    const again = await page.evaluate(async () => {
      const { placeGuideHints } = await import('./scene-adapters.mjs'), { GUIDE_HINTS, hintMarkup } = await import('./first-visit.mjs');
      const hint = GUIDE_HINTS.find(item => item.id === 'quests-why'), dialog = document.querySelector('#overlay-root .modal');
      placeGuideHints(dialog, [{ hint, html: hintMarkup(hint, {}) }]); placeGuideHints(dialog, [{ hint, html: hintMarkup(hint, {}) }]);
      return dialog.querySelectorAll('[data-guide-hint]').length;
    });
    assert.equal(again, 1, 'one quests-why after re-rendering and placing twice');
    await release(page);
    // Condition hints follow the profile: one finished battle ends both guardian hints.
    const later = await open('won');
    assert.equal(await hintCount(later, '#app'), 0, 'no home-start after the first battle');
    await tap(later, '.game-dock [data-action="arena"]');
    assert.equal(await later.locator('#app [data-guide-hint="arena-first"]').count(), 0, 'no arena-first after the first battle');
    // 火焰山 opened straight on 牌組: not recorded; on 山行 it shows, unrecorded until seen.
    await later.evaluate(() => { const button = document.createElement('button'); button.dataset.action = 'activity-route'; button.dataset.id = 'owned'; document.querySelector('#app').append(button); button.click(); button.remove(); });
    await later.locator('#overlay-root .activity-panel').waitFor(); await settle(later);
    assert.equal(await later.locator('#overlay-root [data-guide-hint="fire-mountain"]').count(), 1, 'placed in the hidden 山行 module');
    assert.equal(((await guideRecord(later))?.seen ?? []).includes('fire-mountain'), false, 'not recorded while 牌組 is open');
    await tap(later, '#overlay-root [data-viewport-action="module"][data-viewport-target="overview"]');
    assert.ok(await later.locator('#overlay-root [data-guide-hint="fire-mountain"]').isVisible(), 'switching to 山行 shows it');
    await tap(later, '#overlay-root .modal-close');
    await reveal(later, '#app [data-action="activity-open"]');
    await tap(later, '#app [data-action="activity-open"]');
    assert.equal(await later.locator('#overlay-root [data-guide-hint="fire-mountain"]').count(), 1, 'shown once more on the next visit');
    await later.waitForFunction(key => JSON.parse(localStorage.getItem(key) ?? 'null')?.seen?.includes('fire-mountain'), GUIDE_KEY, { timeout: 4000 });
    passed('condition hints follow the profile; a first visit with another volume\'s locked node keeps 「渡口首勝後，展開此卷」; placement is idempotent; 火焰山 is not recorded while 牌組 is open and shows once more');
    await release(later);
  }

  // ── 5. The switch in 聲息與節奏 ───────────────────────────────────────────────────
  {
    const page = await open('fresh');
    await tap(page, '.game-dock [data-action="bag"]');
    assert.equal(await hintCount(page, '#app'), 1);
    await tap(page, '.game-header [data-action="experience-settings"]');
    await reveal(page, '#overlay-root #guide-hints');
    const field = page.locator('#overlay-root #guide-hints');
    assert.equal(await field.isChecked(), true, 'on by default');
    assert.ok(await field.evaluate(node => parseFloat(getComputedStyle(node).fontSize)) >= 16, 'the checkbox keeps 16 px (N1)');
    await field.tap(); await settle(page);
    assert.equal(await hintCount(page, '#app'), 0, 'off removes the hint behind the dialog at once');
    assert.equal((await guideRecord(page)).off, true);
    await field.tap(); await settle(page);
    assert.equal((await guideRecord(page)).off, undefined, 'on clears the switch');
    await tap(page, '#overlay-root .modal-close');
    assert.equal(await hintCount(page, '#app'), 0, 'nothing in the visit in progress');
    await tap(page, '#app [data-action="cards-tab"][data-id="decks"]');
    assert.equal(await page.locator('#app [data-guide-hint="bag-decks"]').count(), 1, 'a new visit shows hints again');
    // In battle: no row, no hint, no guide write.
    await tap(page, '.game-dock [data-action="arena"]');
    await reveal(page, '#app [data-action="start"]');
    await tap(page, '#app [data-action="start"]');
    await tap(page, '#overlay-root [data-action="confirm-start"]');
    await page.locator('#app .battle-table').waitFor(); await settle(page);
    await resetWrites(page);
    assert.equal(await hintCount(page), 0, 'no hint on the battle screen');
    await tap(page, '.game-header [data-action="experience-settings"]');
    assert.equal(await page.locator('#overlay-root #guide-hints').count(), 0, 'the row is absent in battle');
    await tap(page, '#overlay-root .modal-close');
    assert.equal((await writes(page)).includes(GUIDE_KEY), false, 'no guide write in battle');
    passed('the switch: off removes the hint behind the dialog at once, on shows nothing in the visit in progress and hints again from the next visit; 16 px; absent in battle, where no hint shows and nothing is written');
    await release(page);
  }

  // ── 6. A twelve-battle journey sees no hint and writes no record ────────────────────
  {
    const page = await open('veteran');
    await resetWrites(page);
    const visit = async label => assert.equal(await hintCount(page), 0, `veteran: no hint on ${label}`);
    await visit('洞府');
    for (const destination of ['world', 'arena', 'market', 'bag']) { await tap(page, `.game-dock [data-action="${destination}"]`); await visit(destination); }
    await tap(page, '#app [data-action="cards-tab"][data-id="decks"]'); await visit('三套牌組');
    await tap(page, '.game-dock [data-action="home"]');
    await tap(page, '.game-lobby [data-action="quests"]'); await visit('任務手札');
    await tap(page, '#overlay-root .modal-close');
    await tap(page, '.game-dock [data-action="arena"]'); await reveal(page, '#app [data-action="activity-open"]');
    await tap(page, '#app [data-action="activity-open"]'); await visit('火焰山');
    await tap(page, '#overlay-root .modal-close');
    assert.equal(await stored(page, GUIDE_KEY), null, 'no record written');
    assert.equal((await writes(page)).includes(GUIDE_KEY), false);
    passed('a twelve-battle journey with a fire-mountain run tried shows no hint on any scene or dialog and never writes shanhai.guide.v1');
    await release(page);
  }

  // ── 7. 詞彙 from the header, Back and focus, and 弈道's first page ─────────────────
  for (const size of SIZE_FILTER) {
    const page = await open('fresh', { size }), at = size.label;
    for (const id of ['coins', 'dust']) {
      const depthBefore = await depth(page);
      await openTerm(page, id, at);
      await page.waitForFunction(({ key, expected }) => history.state?.[key]?.depth === expected, { key: NAV_STATE_KEY, expected: depthBefore + 1 }, { timeout: 4000 });
      await page.goBack();
      await page.waitForFunction(() => !document.querySelector('#overlay-root .modal'), null, { timeout: 4000 });
      assert.equal(await page.evaluate(id => document.activeElement?.matches(`.game-header [data-action="glossary"][data-id="${id}"]`), id), true, `${at}: Back returns focus to ${id}`);
    }
    // Left on 詞彙, the lobby's link still opens 弈道 on its first page, the intro first.
    await openTerm(page, 'dust', at);
    await tap(page, '#overlay-root .modal-actions [data-action="close-modal"]');
    await tap(page, '.game-lobby [data-action="rules"]');
    const rules = await rulesState(page);
    assert.equal(rules.module, 'rules', `${at}: the lobby link opens 弈道`);
    assert.equal(rules.rulesPage, '1', `${at}: on its first page`);
    assert.ok(rules.firstItem.startsWith('P:每局') && rules.firstVisible, `${at}: the intro is the list's first item (${rules.firstItem})`);
    assert.equal(rules.title, '入局，先知取捨。');
    assert.match(rules.action, /^知其道，入其局/);
    if (size.width === 302) {
      await tap(page, '#overlay-root [data-viewport-action="module"][data-viewport-target="glossary"]');
      const fits = await termFits(page);
      assert.equal(fits.length, 20);
      for (const term of fits) assert.ok(term.lines <= 2, `302 px: ${term.id} fits two lines (${term.lines})`);
    }
    await release(page);
  }
  {
    const page = await open('fresh', { size: { width: 1280, height: 800, insets: null, label: '1280x800' } });
    await openTerm(page, 'hero-level', '1280x800');
    await page.goBack(); await page.waitForFunction(() => !document.querySelector('#overlay-root .modal'), null, { timeout: 4000 });
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.id), 'hero-level', '1280x800: focus returns to 執令者 Lv');
    assertHeader(await headerClash(page), '1280x800');
    await release(page);
  }
  passed(`詞彙: 金幣 and 靈砂 at ${SIZE_FILTER.length} portrait size${SIZE_FILTER.length > 1 ? 's' : ''} and 執令者 Lv at 1280×800 open the dialog on 詞彙 at their term, focused and on its page, under WORDS ON THE ROAD; Back closes it (one history entry) and returns focus to the button; the lobby's 弈道 opens on page 1 with the intro first even after 詞彙; every definition fits two lines at 302 px`);

  // ── 8. The rules dialog against main ─────────────────────────────────────────────
  {
    const LANDSCAPES = [{ width: 852, height: 393, insets: { top: 0, right: 59, bottom: 21, left: 59 }, label: '852x393 (iPhone landscape insets)' },
      { width: 844, height: 390, insets: null, label: '844x390' }, { width: 734, height: 343, insets: null, label: '734x343' }];
    const RECORDED = [[667, 375], [640, 360], [568, 320]].map(([width, height]) => ({ width, height, insets: null, label: `${width}x${height}` }));
    const rows = [];
    for (const size of [...SIZE_FILTER, ...(process.env.GUIDE_SIZE ? [] : [...LANDSCAPES, ...RECORDED])]) {
      const views = [];
      for (const url of [base, ...(baseline ? [baseline] : [])]) {
        const page = await open('fresh', { size, url });
        await tap(page, '.game-lobby [data-action="rules"]');
        views.push(await RULES_FRAME(page)); await release(page);
      }
      const [mine, theirs] = views, row = `${size.label} ${mine.frame.toFixed(1)}${theirs ? `/${theirs.frame.toFixed(1)}` : ''} px, ${mine.pages}${theirs ? `/${theirs.pages}` : ''} pages${mine.flags.length ? `, flags ${mine.flags}` : ''}${theirs?.flags.length ? `, main flags ${theirs.flags}` : ''}`;
      rows.push(row);
      if (!theirs || RECORDED.includes(size)) continue;
      assert.deepEqual(mine.flags.filter(flag => !theirs.flags.includes(flag)), [], `${size.label}: the rules dialog gains no overflow flag main lacks`);
      assert.ok(mine.frame >= theirs.frame - 0.5, `${size.label}: the 弈道 list frame is not shorter than main's (${mine.frame} against ${theirs.frame})`);
    }
    if (baseline) passed(`the rules dialog against main (frame px and pages, T1/main): ${rows.join('; ')} (the last three recorded only)`);
    else note(`BASELINE_URL unset: the rules dialog was not compared with main (${rows.join('; ')})`);
  }

  // ── 9. The header ─────────────────────────────────────────────────────────────────
  {
    for (const size of SIZE_FILTER) { const page = await open('fresh', { size }); assertHeader(await headerClash(page), size.label); await release(page); }
    const narrow = { width: 302, height: 640, insets: null, label: '302x640' };
    const rich = await open('rich', { size: narrow });
    assertHeader(await headerClash(rich), '302x640 with 999,999 coins and 99,999 靈砂');
    await openTerm(rich, 'coins', '302x640 with 999,999 coins');
    await release(rich);
    const widths = [];
    for (const url of [base, ...(baseline ? [baseline] : [])]) { const page = await open('cap', { size: narrow, url }); widths.push((await headerClash(page)).width); await release(page); }
    if (baseline) assert.ok(widths[0] <= widths[1], `at the cap the header is no wider than main's (${widths[0]} against ${widths[1]})`);
    note(`at the cap (1,000,000,000 each) at 302 px the header's scroll width is ${widths[0]} px${baseline ? ` (main: ${widths[1]} px)` : ' (main not compared)'}`);
    passed(`header: at ${SIZE_FILTER.length} portrait size${SIZE_FILTER.length > 1 ? 's' : ''}, 1280×800 and 302 px with 999,999 coins every control is 44 × 44, none overlaps, taps land, nothing leaves the screen and the page does not scroll sideways${baseline ? '; at the cap no wider than main' : ''}`);
  }

  // ── 10. Reduced motion ────────────────────────────────────────────────────────────
  {
    const still = page => page.evaluate(() => [...document.querySelectorAll('.guide-hint,.guide-hint *,.glossary-term,.glossary-term *')].filter(node => {
      const style = getComputedStyle(node);
      return style.animationName !== 'none' && style.animationDuration !== '0s' || style.transitionDuration.split(',').some(value => parseFloat(value) > 0);
    }).map(node => node.className || node.tagName));
    for (const [label, options] of [['body[data-motion="reduce"]', { motion: 'reduce', emulate: 'no-preference' }], ['prefers-reduced-motion: reduce', { motion: 'system', emulate: 'reduce' }]]) {
      const page = await open('fresh', options);
      assert.equal(await hintCount(page, '#app'), 1);
      assert.deepEqual(await still(page), [], `${label}: the hint does not move`);
      await tap(page, '.game-lobby [data-action="rules"]');
      await tap(page, '#overlay-root [data-viewport-action="module"][data-viewport-target="glossary"]');
      assert.deepEqual(await still(page), [], `${label}: the terms do not move`);
      await release(page);
    }
    passed('under body[data-motion="reduce"] and emulated prefers-reduced-motion, hints and terms have no animation or transition');
  }

  // ── 11. The store build ───────────────────────────────────────────────────────────
  if (nativeBase) {
    const page = await open('fresh', { url: nativeBase, native: new Map() });
    assert.equal(await page.locator('.game-header [data-action="saves-open"]').count(), 1, 'the store build\'s 存檔');
    assert.equal(await page.locator('[data-action="account-open"]').count(), 0);
    assertHeader(await headerClash(page), `native ${deviceName}`);
    await openTerm(page, 'coins', 'native');
    await page.goBack(); await page.waitForFunction(() => !document.querySelector('#overlay-root .modal'), null, { timeout: 4000 });
    await tap(page, '.game-header [data-action="saves-open"]');
    await reveal(page, '#overlay-root .save-tools [data-action="rules"]');
    await tap(page, '#overlay-root .save-tools [data-action="rules"]');
    await tap(page, '#overlay-root [data-action="rules-start"]');
    await page.locator('#overlay-root .encounter-prep.is-mist-prep').waitFor();
    await page.locator('#app .scene-world').waitFor();
    await page.goBack(); await page.waitForFunction(() => !document.querySelector('#overlay-root .modal'), null, { timeout: 4000 });
    await page.locator('#app .scene-world').waitFor();
    await page.goBack(); await page.locator('.game-lobby').waitFor();
    passed('store build: the header with 存檔 passes the header checks, 金幣 opens 詞彙, and 存檔\'s 「弈道 · 遊戲規則」 then 知其道，入其局 opens the 霧隱渡口 preparation on 遊歷; Back twice reaches 洞府');
    await release(page);
  } else note('NATIVE_URL unset: the store build was not checked');

  }
  assert.deepEqual(errors, [], 'no page errors, console errors, failed responses or unexpected network');
  if (audit && findings.length) { console.log(JSON.stringify({ findings }, null, 2)); process.exitCode = 1; }
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  await browser.close();
}
console.log(JSON.stringify({ ok: true, browser: { name: browserName, version }, device: deviceName, checks: checks.length, notes, errors }, null, 2));
