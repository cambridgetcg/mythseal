/** N1 mobile shell acceptance (docs/NAVIGATION.md#mobile-shell): safe areas, focus-zoom-safe
 * inputs, narrow widths (page, shell gutters and tab rows), landscape dock and header row, slider
 * names and the computed touch/overscroll/selection rules. Emulated phones, synthetic saves and
 * loopback assets only; not evidence from a physical device. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createProfile, hydrateProfile, PROFILE_KEY } from '../progression.mjs';
import { mintInstance } from '../collection.mjs';
import { WX01_PRINTINGS } from '../printing-catalogue.mjs';
import { clickViewportItem, viewportFrames } from './viewport-browser-helpers.mjs';

const browserName = process.env.BROWSER || 'chromium';
if (!['chromium', 'webkit'].includes(browserName)) throw Error('BROWSER must be chromium or webkit.');
const runtime = fileURLToPath(new URL('../test-results/webkit-runtime', import.meta.url));
if (browserName === 'webkit' && !process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(runtime)) process.env.PLAYWRIGHT_BROWSERS_PATH = runtime;
const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
if (!process.env.GAME_URL) throw Error('Set GAME_URL to the loopback server serving this checkout, e.g. GAME_URL=http://127.0.0.1:4177.');
const base = new URL(process.env.GAME_URL);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) throw Error('Shell smoke requires loopback.');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = fileURLToPath(new URL('../test-results/', import.meta.url));
const now = '2026-09-22T12:00:00.000Z';
// Chromium emulates an Android phone, WebKit an iPhone (both touch, coarse pointer, mobile viewport).
const { defaultBrowserType, ...device } = engines.devices[browserName === 'webkit' ? 'iPhone 15' : 'Pixel 7'];
const DEVICE = browserName === 'webkit' ? 'iPhone 15' : 'Pixel 7';
// Portrait widths from a folded cover screen to a small tablet; heights only make each portrait.
const WIDTHS = [[302, 640], [320, 568], [360, 740], [393, 659], [412, 839], [734, 1000]];
const LANDSCAPES = [[844, 390], [734, 343]];
// The order is top, right, bottom, left: an iPhone's notch/home-indicator bands, plus landscape side insets.
const INSETS = { top: 48, right: 44, bottom: 34, left: 44 };
// An iPhone 15 held in landscape under viewport-fit=cover: no top inset, 59px sides, the home indicator below.
const IPHONE_LANDSCAPE = [[852, 393], { top: 0, right: 59, bottom: 21, left: 59 }];
// Safari's landscape with its toolbar showing, under viewport-fit=cover: an iPhone 15, an iPhone 13/14, and the 812pt-wide
// notch iPhones (X/XS/11 Pro with 44px sides, 12 mini/13 mini with 50px; 724×325 and 712×325 before cover). The dock's lift
// above the home indicator leaves the scene 18px less than the same phone had before cover (734×343, 750×340).
const SAFARI_LANDSCAPES = [[[852, 343], { top: 0, right: 59, bottom: 21, left: 59 }], [[844, 340], { top: 0, right: 47, bottom: 21, left: 47 }],
  [[812, 325], { top: 0, right: 44, bottom: 21, left: 44 }], [[812, 325], { top: 0, right: 50, bottom: 21, left: 50 }]];
// Below the 701px short-landscape gate (iPhone SE 2/3 and 6–8, an Android phone, a first-generation SE, held sideways):
// a known limit, recorded and not asserted.
const NARROW_LANDSCAPES = [[667, 375], [640, 360], [568, 320]];
const INPUT_IDS = ['bag-search', 'bag-faction', 'bag-filter', 'bag-sort', 'source-filter', 'training-select', 'experience-sound', 'experience-ambience', 'experience-effects', 'experience-motion', 'experience-pace', 'account-email', 'account-token', 'pill-slider'];
// A placeholder address for the mocked one-time-code request; it never leaves the page's route handler.
const FIXTURE_EMAIL = 'shell-smoke@example.com';
const contexts = new Set(), checks = [], errors = [], records = [], findings = [];
// SHELL_AUDIT=1 records every failed expectation instead of stopping at the first (exit 1 at the end).
const audit = process.env.SHELL_AUDIT === '1';
const expect = (ok, message) => { if (ok) return; if (!audit) assert.fail(message); findings.push(message); console.log(`AUDIT FAIL ${message}`); };
const passed = label => { checks.push(label); console.log(`${audit ? 'DONE' : 'PASS'} ${label}`); };
const action = (page, name, id) => page.locator(`[data-action="${name}"]:not(#app[inert] *)${id === undefined ? '' : `[data-id="${id}"]`}`).first();
const click = (page, name, id) => clickViewportItem(page, action(page, name, id));
const go = (page, name) => clickViewportItem(page, page.locator(`.game-dock [data-action="${name}"]`));
const close = async page => { await clickViewportItem(page, page.locator('.modal-close')); await page.locator('.modal').waitFor({ state: 'hidden' }); };

function fixture() {
  let profile = createProfile({ now });
  for (const print of WX01_PRINTINGS) profile = mintInstance(profile, print.cardId, { printId: print.id, now, source: 'shell-fixture' }).profile;
  profile.coins = 50000; profile.dust = 1000; profile.cleared = ['mist-gate'];
  return hydrateProfile(profile, { now });
}
const seed = fixture();

async function pageFor(viewport, insets = null) {
  const context = await browser.newContext({ ...device, ...(viewport ? { viewport: { width: viewport[0], height: viewport[1] } } : {}), reducedMotion: 'reduce' });
  contexts.add(context);
  await context.addInitScript(({ seed, key, now, insets }) => {
    const NativeDate = Date, fixed = new NativeDate(now).getTime();
    globalThis.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } };
    Math.random = () => .23;
    if (!localStorage.getItem('shell-smoke.seeded')) {
      localStorage.setItem('shell-smoke.seeded', 'yes'); localStorage.setItem(key, JSON.stringify(seed));
      localStorage.setItem('shanhai.experience.v1', JSON.stringify({ sound: false, motion: 'reduce', pace: 'fast' }));
    }
    // What a native shell (e.g. Capacitor SystemBars) would do: override the custom properties, not env().
    if (insets) {
      const apply = () => { for (const [side, px] of Object.entries(insets)) document.documentElement.style.setProperty(`--safe-area-inset-${side}`, `${px}px`); };
      if (document.documentElement) apply(); else document.addEventListener('readystatechange', apply, { once: true });
    }
  }, { seed, key: PROFILE_KEY, now, insets });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === base.origin && url.pathname === '/api/v1/account' && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: false, user: null, emailEnabled: true }) });
    }
    // Mocked so 旅程閣 reaches its code-sent state and draws the one-time code field; no request leaves the page.
    if (url.origin === base.origin && url.pathname === '/api/v1/auth/otp' && request.method() === 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sent: true }) });
    }
    if (url.origin !== base.origin || url.pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method())) {
      errors.push(`Unexpected network ${request.method()} ${url.origin}${url.pathname}`); return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  const page = await context.newPage(); page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${new URL(response.url()).pathname}`); });
  await page.goto(base.href); await page.locator('.game-lobby').waitFor(); await viewportFrames(page);
  if (insets) assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top').trim()), `${insets.top}px`, 'inset override applies');
  return page;
}

/** The six screens of the spec, in a fixed order, with all three collection tabs; `inspect` runs on each. */
async function screens(page, inspect) {
  await inspect('lobby');
  await click(page, 'experience-settings'); await page.locator('#experience-ambience').waitFor({ state: 'attached' }); await viewportFrames(page);
  await inspect('modal:settings'); await close(page);
  await go(page, 'bag'); await inspect('collection');
  await click(page, 'cards-tab', 'decks'); await inspect('collection:decks');
  await click(page, 'cards-tab', 'codex'); await inspect('collection:codex');
  await go(page, 'market'); await inspect('market');
  await click(page, 'account-open'); await page.locator('[data-viewport-surface="account"]').waitFor(); await viewportFrames(page);
  await inspect('旅程閣'); await click(page, 'account-back');
  await go(page, 'arena'); await inspect('arena');
  await click(page, 'start'); await click(page, 'confirm-start');
  await page.locator('.player-hand').waitFor({ state: 'attached' }); await viewportFrames(page);
  await inspect('battle');
}

// Visible box of a node after every clipping ancestor; null when nothing of it shows. The walk stops
// below <body>: its computed overflow:hidden is propagated to the viewport, which the checks measure
// themselves, so clipping by it would hide anything that runs past the screen edge.
const GEOMETRY = `
  const shown = node => !node.closest('[hidden],[inert]') && getComputedStyle(node).visibility !== 'hidden' && node.getClientRects().length > 0;
  const clipBox = node => {
    let r = node.getBoundingClientRect(), box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    for (let up = node.parentElement; up && up !== document.body && up !== document.documentElement; up = up.parentElement) {
      const style = getComputedStyle(up);
      if (style.overflowX === 'visible' && style.overflowY === 'visible') continue;
      const c = up.getBoundingClientRect();
      if (style.overflowX !== 'visible') { box.left = Math.max(box.left, c.left); box.right = Math.min(box.right, c.right); }
      if (style.overflowY !== 'visible') { box.top = Math.max(box.top, c.top); box.bottom = Math.min(box.bottom, c.bottom); }
    }
    return box.right - box.left > .5 && box.bottom - box.top > .5 ? box : null;
  };
  const label = node => node.dataset.action ? node.dataset.action + (node.dataset.id ? ':' + node.dataset.id : '') : node.dataset.viewportTarget || node.dataset.viewportId || node.id || node.getAttribute('aria-label') || node.textContent.trim().slice(0, 16) || node.tagName;
  const CONTROLS = 'button,a[href],input:not([type="hidden"]),select,textarea,summary,[role="button"],[role="tab"],[role="slider"],[tabindex]:not([tabindex="-1"])';
  const overlapping = (a, b) => a.left < b.right - .5 && b.left < a.right - .5 && a.top < b.bottom - .5 && b.top < a.bottom - .5;
  const round = box => [box.left, box.top, box.right, box.bottom].map(Math.round);
`;

const overflow = (page, label) => page.evaluate(`(() => {${GEOMETRY}
  const html = document.documentElement;
  const outside = [...document.querySelectorAll(CONTROLS + ',[data-viewport-surface],[data-viewport-module],.modal,.game-header,.game-dock')].filter(shown).map(node => {
    const r = node.getBoundingClientRect();
    if (r.left >= -1 && r.right <= innerWidth + 1) return null;
    const box = clipBox(node); // inside a horizontal scroller, only the shown part counts
    return box && (box.left < -1 || box.right > innerWidth + 1) ? { name: label(node), left: Math.round(r.left), right: Math.round(r.right) } : null;
  }).filter(Boolean);
  // Controls, modules and list items stay inside the shell's side gutters, not just the screen.
  const shell = [...document.querySelectorAll('.shell.game-shell')].find(shown), edge = shell && shell.getBoundingClientRect();
  const spill = shell ? [...shell.querySelectorAll(CONTROLS + ',[data-viewport-module],[data-viewport-id]')].filter(shown).map(node => {
    const box = clipBox(node);
    return box && (box.left < edge.left - 1 || box.right > edge.right + 1) ? { name: label(node), box: round(box), shell: [Math.round(edge.left), Math.round(edge.right)] } : null;
  }).filter(Boolean) : [];
  // Tabs in a row neither overlap each other nor leave the row.
  const tabs = [...document.querySelectorAll('.viewport-module-tabs,.cards-hub-tabs')].filter(shown).flatMap(row => {
    const r = row.getBoundingClientRect(), buttons = [...row.children].filter(shown).map(node => [node, node.getBoundingClientRect()]);
    return buttons.flatMap(([node, box], i) => [
      ...(box.left < r.left - .5 || box.right > r.right + .5 ? [{ tab: label(node), box: round(box), row: round(r) }] : []),
      ...buttons.slice(i + 1).filter(([, other]) => overlapping(box, other)).map(([other]) => ({ tabs: [label(node), label(other)] })),
    ]);
  });
  // Recorded, not asserted: the viewport controller's own flag for content taller than its frame.
  const tall = [...document.querySelectorAll('[data-viewport-overflow="true"]')].filter(shown).map(node => node.dataset.viewportList || node.className.split(' ')[0]);
  return { innerWidth, clientWidth: html.clientWidth, htmlScroll: html.scrollWidth, bodyScroll: document.body.scrollWidth, scrollX, scale: visualViewport ? visualViewport.scale : 1, outside, spill, tabs, tall };
})()`).then(result => ({ label, ...result }));

// Header row (brand, wallet, 旅程閣, settings and, in short landscape, the cards hub tabs): no control
// overlaps another, and taps across each control's width land on that control.
const headerClash = page => page.evaluate(`(() => {${GEOMETRY}
  const nodes = [...document.querySelectorAll('.game-header *,.cards-hub-tabs>*')].filter(node => node.matches(CONTROLS)).filter(shown);
  const overlaps = nodes.flatMap((node, i) => nodes.slice(i + 1).filter(other => overlapping(node.getBoundingClientRect(), other.getBoundingClientRect())).map(other => [label(node), label(other)]));
  const misses = nodes.flatMap(node => {
    const r = node.getBoundingClientRect();
    return [1, 2, 3, 4, 5, 6, 7].map(k => [r.left + r.width * k / 8, r.top + r.height / 2]).map(([x, y]) => [x, y, document.elementFromPoint(x, y)])
      .filter(([, , hit]) => !(hit && (hit === node || node.contains(hit)))).map(([x, y, hit]) => ({ control: label(node), at: [Math.round(x), Math.round(y)], hit: hit ? (hit.closest(CONTROLS) ? label(hit.closest(CONTROLS)) : hit.className || hit.tagName) : null }));
  });
  return { controls: nodes.map(node => ({ name: label(node), box: round(node.getBoundingClientRect()) })), overlaps, misses };
})()`);

// Spec item 6, as computed styles: touch-action on controls, overscroll on the document and dialogs,
// no selection on card art while text stays selectable. -webkit-touch-callout is recorded, not asserted:
// neither Chromium nor Playwright WebKit parses it, so it is declared for iOS Safari but not observable here.
const touchStyles = page => page.evaluate(`(() => {${GEOMETRY}
  const style = node => getComputedStyle(node);
  const select = node => style(node).userSelect || style(node).webkitUserSelect;
  const controls = [...document.querySelectorAll('button,a[href],input:not([type="hidden"]),select,textarea')].filter(shown);
  const art = [...document.querySelectorAll('.card-art')].filter(shown);
  const text = [...document.querySelectorAll('p,h1,h2,h3')].filter(shown).filter(node => node.textContent.trim());
  return {
    controls: controls.length, touch: controls.filter(node => style(node).touchAction !== 'manipulation').map(node => label(node) + '=' + style(node).touchAction),
    overscroll: ['html', 'body', '.modal-backdrop', '.modal'].map(selector => [selector, ...[...document.querySelectorAll(selector)].filter(shown).map(node => style(node).overscrollBehaviorX + '/' + style(node).overscrollBehaviorY)]),
    art: art.length, artSelectable: art.filter(node => select(node) !== 'none').length,
    text: text.length, textUnselectable: text.filter(node => select(node) === 'none' && !node.closest('.card')).map(label),
    calloutParsed: CSS.supports('-webkit-touch-callout', 'none'),
  };
})()`);

const bandHits = (page, insets) => page.evaluate(`(() => {${GEOMETRY}
  const insets = ${JSON.stringify(insets)}, hits = [];
  for (const node of [...document.querySelectorAll(CONTROLS)].filter(shown)) {
    const box = clipBox(node); if (!box) continue;
    const bands = [box.top < insets.top - .5 && 'top', box.bottom > innerHeight - insets.bottom + .5 && 'bottom', box.left < insets.left - .5 && 'left', box.right > innerWidth - insets.right + .5 && 'right'].filter(Boolean);
    if (bands.length) hits.push({ name: label(node), bands, box: [box.left, box.top, box.right, box.bottom].map(Math.round) });
  }
  const tall = [...document.querySelectorAll('[data-viewport-overflow="true"]')].filter(shown).map(node => node.dataset.viewportList || node.className.split(' ')[0]);
  return { viewport: [innerWidth, innerHeight], hits, tall };
})()`);

// Controls outside the dock whose visible box reaches under it. An item of a paged list that the viewport
// controller flags as taller than its frame is the documented vertical-fit limit (it already runs under the
// list's pager): it is returned separately, to be recorded rather than asserted.
const dockOverlap = page => page.evaluate(`(() => {${GEOMETRY}
  const dock = document.querySelector('.game-dock'), d = dock.getBoundingClientRect();
  const future = document.querySelector('[data-viewport-action="module"][data-viewport-target="future"]');
  const under = [...document.querySelectorAll(CONTROLS)].filter(shown).filter(node => !dock.contains(node)).map(node => {
    const box = clipBox(node), list = node.closest('[data-viewport-list][data-viewport-overflow="true"]');
    return box && box.left < d.right - .5 && box.right > d.left + .5 && box.top < d.bottom - .5 && box.bottom > d.top + .5 ? { name: label(node), box: round(box), under: Math.round(box.bottom - d.top), ...(list ? { list: list.dataset.viewportList } : {}) } : null;
  }).filter(Boolean);
  const r = future && future.getBoundingClientRect();
  return { future: future && shown(future) ? round(r) : null, dock: round(d), overlaps: under.filter(item => !item.list), flagged: under.filter(item => item.list) };
})()`);

/** Every dock destination (洞府, 遊歷, 對弈, 藏卡 with its three hub tabs, 市集), and on each every module tab,
 * opened with an ordinary tap so a covered tab fails; `inspect` runs on each state. */
async function dockScreens(page, inspect) {
  for (const name of ['home', 'world', 'arena', 'bag', 'market']) {
    await go(page, name); await viewportFrames(page);
    for (const hub of name === 'bag' ? ['cards', 'decks', 'codex'] : [null]) {
      if (hub) { await click(page, 'cards-tab', hub); await viewportFrames(page); }
      const tabs = page.locator('main [data-viewport-action="module"]:not(#app[inert] *)');
      const modules = await tabs.evaluateAll(nodes => nodes.map(node => node.dataset.viewportTarget));
      for (const module of modules.length ? modules : [null]) {
        if (module) { await page.locator(`main [data-viewport-action="module"][data-viewport-target="${module}"]`).click({ timeout: 4000 }); await viewportFrames(page); }
        await inspect(`${name}${hub ? `:${hub}` : ''}${module ? `/${module}` : ''}`);
      }
    }
  }
}

// Which of the scene's module tabs a tap at its centre misses (what it lands on instead).
const moduleTabHits = page => page.evaluate(`(() => {${GEOMETRY}
  return [...document.querySelectorAll('main [data-viewport-action="module"]')].filter(shown).map(node => {
    const r = node.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return hit && (hit === node || node.contains(hit)) ? null : { tab: label(node), hit: hit ? hit.tagName + (hit.className ? '.' + String(hit.className).split(' ')[0] : '') + ' ' + hit.textContent.trim().slice(0, 8) : null };
  }).filter(Boolean);
})()`);

await mkdir(output, { recursive: true });
const browser = await engines[browserName].launch({ headless: true, ...(browserName === 'chromium' && existsSync(chrome) ? { executablePath: chrome } : {}) });
let failure = null;
try {
  // 1 · Focus zoom: every text-entry control computes at least 16px on the coarse-pointer phone, and 16px is a floor,
  // not a clamp: a field the stylesheets draw larger (旅程閣's 20px code field) keeps its size.
  {
    const page = await pageFor(null), fonts = new Map(), shrunk = new Map();
    assert(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), `${DEVICE} emulation reports a coarse pointer`);
    // Each field's computed size, then the same field with the coarse-pointer rules taken out of the stylesheets (what a
    // fine pointer at this width would draw), then the rules put back.
    const measure = () => page.evaluate(() => {
      const fields = [...document.querySelectorAll('input,select,textarea')], read = () => fields.map(node => parseFloat(getComputedStyle(node).fontSize));
      const sizes = read(), removed = [];
      for (const sheet of document.styleSheets) {
        let rules; try { rules = sheet.cssRules; } catch { continue; }
        for (let i = rules.length - 1; i >= 0; i--) if (rules[i] instanceof CSSMediaRule && /pointer:\s*coarse/.test(rules[i].media.mediaText)) { removed.push([sheet, i, rules[i].cssText]); sheet.deleteRule(i); }
      }
      const fine = read();
      for (const [sheet, i, text] of removed.reverse()) sheet.insertRule(text, i);
      return { removed: removed.length, fields: fields.map((node, i) => [node.id || `${node.tagName}#${i}`, sizes[i], fine[i]]) };
    });
    const collect = async () => {
      const { removed, fields } = await measure();
      assert(removed, 'the coarse-pointer rules were found');
      for (const [id, size, fine] of fields) {
        fonts.set(id, Math.min(size, fonts.get(id) ?? Infinity));
        if (Math.abs(size - Math.max(16, fine)) > .01) shrunk.set(id, { size, fine });
      }
    };
    await collect();
    await click(page, 'experience-settings'); await page.locator('#experience-ambience').waitFor({ state: 'attached' }); await collect();
    // 5 · The two volume sliders have names (the checkbox and selects already took theirs from labels).
    const names = {};
    for (const id of ['experience-ambience', 'experience-effects']) {
      const snapshot = await page.locator(`#${id}`).ariaSnapshot();
      names[id] = /^- slider "([^"]+)"/.exec(snapshot)?.[1] || '';
      expect(names[id].trim(), `#${id} needs an accessible name: ${snapshot}`);
    }
    expect(names['experience-ambience'] !== names['experience-effects'], 'the two sliders are told apart');
    passed(`${DEVICE}: volume sliders are named ${JSON.stringify(Object.values(names))}`);
    await close(page);
    await click(page, 'quests'); await page.locator('#training-select').waitFor({ state: 'attached' }); await collect(); await close(page);
    await go(page, 'bag'); await collect();
    await click(page, 'cards-tab', 'decks'); await collect();
    await click(page, 'cards-tab', 'codex'); await collect();
    await click(page, 'account-open'); await page.locator('[data-viewport-surface="account"]').waitFor(); await collect();
    // Request a code (mocked) so the one-time code field is drawn.
    await clickViewportItem(page, page.locator('#account-email')); await page.locator('#account-email').fill(FIXTURE_EMAIL);
    await clickViewportItem(page, page.locator('[data-account-form="email"] button[type="submit"]'));
    await page.locator('#account-token').waitFor({ state: 'attached' }); await collect(); await click(page, 'account-back');
    await go(page, 'arena'); await click(page, 'start'); await click(page, 'confirm-start'); await page.locator('#pill-slider').waitFor({ state: 'attached' }); await collect();
    const small = [...fonts].filter(([, size]) => !(size >= 16));
    records.push({ check: 'input-font', device: DEVICE, fonts: Object.fromEntries(fonts) });
    assert.deepEqual(INPUT_IDS.filter(id => !fonts.has(id)), [], 'every known input was rendered');
    expect(!small.length, `inputs, selects and textareas must compute >=16px on a coarse pointer ${JSON.stringify(small)}`);
    expect(!shrunk.size, `on a coarse pointer each field must compute the larger of 16px and its fine-pointer size ${JSON.stringify(Object.fromEntries(shrunk))}`);
    passed(`${DEVICE}: ${fonts.size} inputs/selects/textareas compute >=16px on a coarse pointer, none smaller than its fine-pointer size (#account-token ${fonts.get('account-token')}px)`);
    await page.context().close(); contexts.delete(page.context());
  }

  // 3 · No horizontal page overflow at six portrait widths on six screens (all three collection tabs).
  for (const size of WIDTHS) {
    const tag = size.join('x'), page = await pageFor(size), results = [];
    await screens(page, async label => { await viewportFrames(page); results.push(await overflow(page, `${tag}/${label}`)); });
    records.push({ check: 'overflow', size: tag, results });
    for (const r of results) {
      expect(r.innerWidth === size[0] && r.clientWidth === size[0] && r.scale === 1, `${r.label}: layout viewport must stay ${size[0]}px wide ${JSON.stringify(r)}`);
      expect(r.htmlScroll <= size[0] && r.bodyScroll <= size[0] && r.scrollX === 0, `${r.label}: document must not scroll sideways ${JSON.stringify(r)}`);
      expect(!r.outside.length, `${r.label}: controls and panels stay within the width ${JSON.stringify(r.outside)}`);
      expect(!r.spill.length, `${r.label}: controls, modules and list items stay inside the shell's gutters ${JSON.stringify(r.spill)}`);
      expect(!r.tabs.length, `${r.label}: tabs neither overlap nor leave their row ${JSON.stringify(r.tabs)}`);
    }
    for (const r of results) if (r.tall.length) console.log(`NOTE ${r.label}: vertical overflow flagged by the viewport controller ${JSON.stringify(r.tall)}`);
    passed(`${tag}: ${results.map(r => r.label.slice(tag.length + 1)).join(', ')} have no horizontal overflow, nothing past the shell's gutters and no overlapping tabs`);
    await page.context().close(); contexts.delete(page.context());
  }

  // 2 · Safe-area overrides (48/44/34/44) keep every interactive control out of the inset bands.
  for (const size of [null, [844, 390]]) {
    const page = await pageFor(size, INSETS), tag = size ? size.join('x') : DEVICE, results = [];
    await screens(page, async label => { await viewportFrames(page); results.push({ label: `${tag}/${label}`, ...await bandHits(page, INSETS) }); });
    records.push({ check: 'safe-area', size: tag, insets: INSETS, results });
    for (const r of results) expect(!r.hits.length, `${r.label}: controls must stay out of the safe-area bands ${JSON.stringify(r.hits)}`);
    for (const r of results) if (r.tall.length) console.log(`NOTE ${r.label}: vertical overflow flagged by the viewport controller ${JSON.stringify(r.tall)}`);
    passed(`${tag}: with insets ${JSON.stringify(INSETS)}, no interactive control on ${results.length} screens enters a safe-area band`);
    await page.context().close(); contexts.delete(page.context());
  }

  // 4 · Landscape phones: on every dock destination and each of its modules (the arena's 來日 among them, the
  // market's 秘匣, 西行印 and 秘券), no control sits under the dock, including Safari's toolbar-visible landscape.
  for (const [size, insets] of [...LANDSCAPES.map(size => [size, null]), [[844, 390], INSETS], ...SAFARI_LANDSCAPES]) {
    const page = await pageFor(size, insets), tag = size.join('x') + (insets ? `+${Object.values(insets).join('/')}` : ''), results = [];
    await dockScreens(page, async label => { results.push({ label: `${tag}/${label}`, ...await dockOverlap(page) }); });
    records.push({ check: 'landscape-dock', size: tag, insets, results });
    const future = results.find(r => r.label.endsWith('/arena/future'))?.future;
    assert(future, `${tag}: the 來日 tab is shown`);
    for (const r of results) expect(!r.overlaps.length, `${r.label}: controls must not sit under the dock ${JSON.stringify({ dock: r.dock, overlaps: r.overlaps })}`);
    for (const r of results) if (r.flagged.length) console.log(`NOTE ${r.label}: an item of a list flagged as taller than its frame reaches under the dock ${JSON.stringify(r.flagged)}`);
    passed(`${tag}: ${results.length} screens and modules keep their controls clear of the dock ${JSON.stringify(results[0].dock)}; 來日 at ${JSON.stringify(future)}`);
    await page.context().close(); contexts.delete(page.context());
  }
  // Known limit (docs/NAVIGATION.md, Limits): below 701px the short-landscape layout does not apply, and some modules
  // are drawn over their own tab row. Each module of 遊歷, 對弈 and 市集 is opened directly (a dispatched click, since a
  // covered tab cannot be tapped) and the tabs a centre tap then misses are printed. Recorded, not asserted.
  for (const size of NARROW_LANDSCAPES) {
    const page = await pageFor(size), tag = size.join('x'), covered = [];
    for (const name of ['world', 'arena', 'market']) {
      await go(page, name); await viewportFrames(page);
      const tabs = page.locator('main [data-viewport-action="module"]:not(#app[inert] *)');
      const modules = await tabs.evaluateAll(nodes => nodes.map(node => node.dataset.viewportTarget));
      for (const module of modules) {
        await page.locator(`main [data-viewport-action="module"][data-viewport-target="${module}"]`).dispatchEvent('click'); await viewportFrames(page);
        const misses = await moduleTabHits(page);
        if (misses.length) covered.push({ module: `${name}/${module}`, missed: `${misses.length}/${modules.length}`, hit: misses[0].hit });
      }
    }
    records.push({ check: 'narrow-landscape-module-tabs', size: tag, recorded: 'not asserted', covered });
    console.log(`NOTE ${tag}: known limit below the 701px landscape gate; with these modules open, a centre tap misses their tabs ${JSON.stringify(covered.map(item => `${item.module} ${item.missed}`))}`);
    await page.context().close(); contexts.delete(page.context());
  }
  // 6 · Landscape header row: on the lobby and all three collection tabs (where short landscape lifts the
  // cards hub tabs into the header), no header control or hub tab covers another, with or without side insets.
  for (const [size, insets] of [...LANDSCAPES.map(size => [size, null]), [[844, 390], INSETS], IPHONE_LANDSCAPE, ...SAFARI_LANDSCAPES]) {
    const page = await pageFor(size, insets), tag = size.join('x') + (insets ? `+${Object.values(insets).join('/')}` : ''), results = [];
    results.push({ label: `${tag}/lobby`, ...await headerClash(page) });
    await go(page, 'bag');
    for (const id of ['cards', 'decks', 'codex']) { await click(page, 'cards-tab', id); await viewportFrames(page); results.push({ label: `${tag}/collection:${id}`, ...await headerClash(page) }); }
    records.push({ check: 'landscape-header', size: tag, insets, results });
    for (const r of results) expect(!r.overlaps.length && !r.misses.length, `${r.label}: header controls must not cover each other ${JSON.stringify({ overlaps: r.overlaps, misses: r.misses.slice(0, 6), controls: r.controls })}`);
    passed(`${tag}: header controls and cards hub tabs stay apart on the lobby and three collection tabs`);
    await page.context().close(); contexts.delete(page.context());
  }

  // 7 · Touch, overscroll and card-art selection rules (spec item 6) as the engine computes them.
  {
    const page = await pageFor(null), results = [];
    results.push({ label: 'lobby', ...await touchStyles(page) });
    await click(page, 'experience-settings'); await page.locator('#experience-ambience').waitFor({ state: 'attached' }); await viewportFrames(page);
    results.push({ label: 'modal:settings', ...await touchStyles(page) }); await close(page);
    await go(page, 'bag'); await viewportFrames(page); results.push({ label: 'collection', ...await touchStyles(page) });
    await click(page, 'cards-tab', 'codex'); await viewportFrames(page); results.push({ label: 'collection:codex', ...await touchStyles(page) });
    records.push({ check: 'touch-styles', device: DEVICE, results });
    for (const r of results) {
      expect(r.controls && !r.touch.length, `${r.label}: controls compute touch-action: manipulation ${JSON.stringify(r.touch)}`);
      for (const [selector, ...values] of r.overscroll) {
        const want = selector.startsWith('.modal') ? 'contain/contain' : 'none/none';
        expect(values.every(value => value === want), `${r.label}: ${selector} computes overscroll-behavior ${want} ${JSON.stringify(values)}`);
      }
      expect(!r.artSelectable, `${r.label}: card art computes user-select: none (${r.artSelectable} of ${r.art} do not)`);
      expect(r.text && !r.textUnselectable.length, `${r.label}: text outside cards stays selectable ${JSON.stringify(r.textUnselectable)}`);
    }
    expect(results.some(r => r.art) && results.some(r => r.overscroll.find(([selector]) => selector === '.modal').length > 1), 'card art and a dialog were measured');
    passed(`${DEVICE}: touch-action, overscroll-behavior and card-art user-select compute as declared; -webkit-touch-callout parsed: ${results[0].calloutParsed} (declared for iOS Safari, not observable here)`);
    await page.context().close(); contexts.delete(page.context());
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(findings, [], `${findings.length} audit findings`);
} catch (error) {
  failure = error.stack; process.exitCode = 1;
  const page = [...contexts].at(-1)?.pages().at(-1);
  if (page && !page.isClosed()) await page.screenshot({ path: `${output}shell-${browserName}-failure.png` }).catch(() => {});
} finally {
  await Promise.allSettled([...contexts].map(context => context.close())); await browser.close();
  const report = { ok: !failure, browser: browserName, device: DEVICE, audit, findings, evidence: 'Emulated phone viewports in headless Playwright with synthetic saves and loopback assets; not a physical device.', checks, records, errors, ...(failure ? { error: failure } : {}) };
  await writeFile(`${output}shell-${browserName}.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(failure ? `Shell smoke FAILED: ${failure}` : `Shell smoke: ${checks.length} checks passed`);
}
