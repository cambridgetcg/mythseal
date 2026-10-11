/** Isolated checks for a fixed literary-card showcase. Never uses a player profile. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const browserName = process.env.BROWSER || 'chromium';
if (!['chromium', 'webkit'].includes(browserName)) throw Error('BROWSER must be chromium or webkit.');
const runtime = fileURLToPath(new URL('../test-results/webkit-runtime', import.meta.url));
if (browserName === 'webkit' && !process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(runtime)) process.env.PLAYWRIGHT_BROWSERS_PATH = runtime;
const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = new URL(process.env.GAME_URL || 'http://127.0.0.1:4177');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) throw Error('Liaozhai smoke requires a loopback game server.');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = fileURLToPath(new URL('../test-results/', import.meta.url));
const checks = [], screenshots = [], errors = [], forbiddenRequests = [], contexts = new Set();
const passed = label => { checks.push(label); console.log(`PASS ${label}`); };
const action = (page, name) => page.locator(`[data-action="${name}"]`);
const phase = (page, value) => page.locator(`#sample-stage[data-phase="${value}"]`).waitFor();
const expectedSample = [
  { cardId: 'ningcaichen', treatment: 'base' },
  { cardId: 'yanchixia', treatment: 'base' },
  { cardId: 'niexiaoqian', treatment: 'aa' },
];
// Bound special printings, written out independently of liaozhai-cards.mjs. All seven are bound; none is planned.
const expectedSpecials = [
  { cardId: 'niexiaoqian', treatment: 'aa', printId: 'lz01-001-aa1', src: 'assets/lz01/xiaoqian-aa.png' },
  { cardId: 'niexiaoqian', treatment: 'treasure', printId: 'lz01-001-tr1', src: 'assets/lz01/xiaoqian-treasure.png' },
  { cardId: 'yingning', treatment: 'aa', printId: 'lz01-004-aa1', src: 'assets/lz01/yingning-aa2.png' },
  { cardId: 'lupan', treatment: 'ink', printId: 'lz01-006-ink1', src: 'assets/lz01/lupan-ink.png' },
  { cardId: 'huapi', treatment: 'ink', printId: 'lz01-008-ink1', src: 'assets/lz01/huapi-ink.png' },
  { cardId: 'chenshi', treatment: 'aa', printId: 'lz01-009-aa1', src: 'assets/lz01/chenshi-aa.png' },
  { cardId: 'wangliulang', treatment: 'aa', printId: 'lz01-011-aa1', src: 'assets/lz01/liulang-aa.png' },
];
const specialsFor = id => expectedSpecials.filter(print => print.cardId === id);
const printLabels = { base: '本畫 BASE', aa: '異畫 AA', ink: '墨卷 INK', treasure: '天工 TR' };
const expectedProgress = '12 款本畫＋7 款特別畫作先行（異畫 4、墨卷 2、天工 1）。';
await mkdir(output, { recursive: true });
const browser = await engines[browserName].launch({ headless: true, ...(browserName === 'chromium' && existsSync(chrome) ? { executablePath: chrome } : {}) });

async function openPage(width, height, reducedMotion = 'no-preference') {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion, deviceScaleFactor: 1 });
  contexts.add(context);
  await context.addInitScript(() => {
    // Capture native references first so audit inspection never audits itself.
    const local = window.localStorage, session = window.sessionStorage;
    const nativeGet = Storage.prototype.getItem;
    const nativeSet = Storage.prototype.setItem;
    const nativeKey = Storage.prototype.key;
    nativeSet.call(local, 'shanhai.profile.v5', '{"fixture":"liaozhai-do-not-touch"}');
    nativeSet.call(local, 'shanhai.profile.v3', '{"fixture":"legacy-do-not-touch"}');
    nativeSet.call(local, 'shanhai.battle.v5', '{"fixture":"pending-do-not-touch"}');
    nativeSet.call(session, 'liaozhai-smoke.session', 'unchanged');
    const accesses = [];
    const snapshotOne = storage => Object.fromEntries(Array.from({ length: storage.length }, (_, index) => {
      const key = nativeKey.call(storage, index);
      return [key, nativeGet.call(storage, key)];
    }));
    const snapshot = () => ({ local: snapshotOne(local), session: snapshotOne(session) });
    window.__lzAudit = { before: snapshot(), accesses, snapshot };
    for (const [name, value] of [['localStorage', local], ['sessionStorage', session]]) {
      Object.defineProperty(window, name, { configurable: true, get() { accesses.push({ kind: name }); return value; } });
    }
    for (const method of ['getItem', 'key', 'setItem', 'removeItem', 'clear']) {
      const native = Storage.prototype[method];
      Storage.prototype[method] = function (...args) {
        accesses.push({ kind: `storage.${method}`, key: String(args[0] ?? '') });
        return Reflect.apply(native, this, args);
      };
    }
    const cookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    if (cookie?.configurable) Object.defineProperty(Document.prototype, 'cookie', {
      configurable: true,
      get() { accesses.push({ kind: 'cookie.get' }); return cookie.get.call(this); },
      set(value) { accesses.push({ kind: 'cookie.set' }); return cookie.set.call(this, value); },
    });
    for (const [object, methods, prefix] of [[window.indexedDB, ['open', 'deleteDatabase'], 'indexedDB'], [window.caches, ['open', 'match', 'delete'], 'caches']]) {
      if (!object) continue;
      for (const method of methods) {
        const native = object[method];
        object[method] = function (...args) { accesses.push({ kind: `${prefix}.${method}` }); return Reflect.apply(native, this, args); };
      }
    }
  });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== base.origin || url.pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method())) {
      forbiddenRequests.push(`${request.method()} ${url.origin}${url.pathname}`);
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  page.on('requestfailed', request => errors.push(`Failed ${request.url()}: ${request.failure()?.errorText}`));
  const response = await page.goto(new URL('/liaozhai.html', base).href);
  assert.equal(response.status(), 200);
  await page.locator('#catalogue-grid').waitFor();
  await decoded(page);
  return { context, page };
}

async function decoded(page) {
  await page.evaluate(async () => {
    await Promise.all([...document.images].map(image => image.decode()));
    const backgrounds = new Set([...document.querySelectorAll('*')].flatMap(element =>
      [...getComputedStyle(element).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(match => match[1])));
    await Promise.all([...backgrounds].map(async src => { const image = new Image(); image.src = src; await image.decode(); }));
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
async function noOverflow(page, label) {
  const size = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert(size.document <= size.viewport + 1, `${label}: horizontal overflow ${JSON.stringify(size)}`);
}
async function targetIsUsable(locator) {
  await locator.scrollIntoViewIfNeeded();
  const hit = await locator.evaluate(element => {
    const rect = element.getBoundingClientRect(), x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    return { width: rect.width, height: rect.height, hit: element.contains(document.elementFromPoint(x, y)) };
  });
  assert(hit.width >= 44 && hit.height >= 44 && hit.hit, `Control needs an unobstructed 44px target: ${JSON.stringify(hit)}`);
}
async function verifyIsolation(context, page) {
  const audit = await page.evaluate(() => ({ before: window.__lzAudit.before, after: window.__lzAudit.snapshot(), accesses: window.__lzAudit.accesses }));
  assert.deepEqual(audit.after, audit.before, 'Preview changed synthetic saves.');
  assert.deepEqual(audit.accesses, [], 'Preview accessed storage, cookies, IndexedDB or caches.');
  assert.deepEqual(await context.cookies(), [], 'Preview wrote a cookie.');
}
async function shot(page, label, width, height) {
  await decoded(page);
  await noOverflow(page, label);
  const name = `liaozhai-${browserName}-${label}-${width}x${height}.png`;
  await page.screenshot({ path: output + name, fullPage: true, animations: 'disabled' });
  screenshots.push(name);
}
async function sampleIdentity(page) {
  return page.locator('#sample-cards .printed-card').evaluateAll(cards => cards.map(card => ({ cardId: card.dataset.cardId, treatment: card.dataset.treatment })));
}
async function focusIs(page, expectedAction, extra = {}) {
  const value = await page.evaluate(() => {
    const element = document.activeElement, rect = element.getBoundingClientRect();
    return { action: element.dataset.action, treatment: element.dataset.treatment, cardId: element.dataset.cardId, visible: rect.width > 0 && rect.height > 0 && !element.closest('[hidden]') };
  });
  assert.equal(value.visible, true, `Focus is hidden: ${JSON.stringify(value)}`);
  assert.equal(value.action, expectedAction, `Unexpected focus: ${JSON.stringify(value)}`);
  for (const [key, expected] of Object.entries(extra)) assert.equal(value[key], expected);
}
async function printedFace(page, selector) {
  return page.locator(selector).evaluate(card => {
    const style = getComputedStyle(card);
    return {
      cardId: card.dataset.cardId, treatment: card.dataset.treatment, printId: card.dataset.printId,
      src: card.querySelector('.card-art img')?.getAttribute('src') || null,
      mark: card.querySelector('.print-mark').textContent, nameColor: getComputedStyle(card.querySelector('.card-name')).color,
      borderStyle: style.borderTopStyle, ornament: Boolean(card.querySelector('.print-ornament svg')),
    };
  });
}
function checkFace(face, card, print, label) {
  const treatment = print?.treatment || 'base';
  assert.equal(face.cardId, card, label);
  assert.equal(face.treatment, treatment, label);
  assert.equal(face.printId, print?.printId || face.printId, label);
  if (!print) assert.match(face.printId, /^lz01-\d{3}-base$/, label);
  assert.equal(face.src, print?.src || null, `${label}: special art must use its own file`);
  assert.equal(face.mark, printLabels[treatment], label);
  assert.equal(face.ornament, treatment === 'treasure', `${label}: only 天工 carries the corner ornament`);
  if (treatment === 'ink') assert.equal(face.nameColor, 'rgb(34, 46, 39)', `${label}: 墨卷 text must be dark on paper`);
  if (treatment === 'treasure') assert.equal(face.borderStyle, 'double', `${label}: 天工 frame`);
}
async function catalogueIds(page) {
  return page.locator('#catalogue-grid .printed-card').evaluateAll(cards => cards.map(card => card.dataset.cardId));
}

let failure;
try {
  for (const [width, height] of [[1440, 900], [390, 844], [360, 740], [844, 390]]) {
    const { context, page } = await openPage(width, height);
    const label = `${width}x${height}`;
    assert.match(await page.title(), /聊齋.*燈下有靈/);
    assert.match(await page.locator('.sample-notice').textContent(), /固定展示/);
    assert.match(await page.locator('.sample-notice').textContent(), /不消耗金幣，不加入背包/);
    assert.equal(await page.locator('#catalogue-grid .catalogue-entry').count(), 12);
    assert.equal(await page.locator('#set-sources a').count(), 5);
    const heroStats = [];
    for (const treatment of ['base', 'aa', 'treasure']) {
      const button = page.locator(`[data-action="treatment"][data-treatment="${treatment}"]`);
      await targetIsUsable(button);
      await button.focus();
      await page.keyboard.press('Space');
      const hero = page.locator('#hero-card .printed-card');
      assert.equal(await hero.getAttribute('data-card-id'), 'niexiaoqian');
      assert.equal(await hero.getAttribute('data-treatment'), treatment);
      checkFace(await printedFace(page, '#hero-card .printed-card'), 'niexiaoqian', specialsFor('niexiaoqian').find(print => print.treatment === treatment), `hero ${treatment}`);
      assert.equal(await button.getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('[data-action="treatment"][aria-pressed="true"]').count(), 1);
      heroStats.push(await hero.locator('.card-numbers').textContent());
      await focusIs(page, 'treatment', { treatment });
      await noOverflow(page, `${label} hero ${treatment}`);
    }
    assert.equal(new Set(heroStats).size, 1, 'BASE, AA and TR must display identical stats');
    if (width === 1440 || width === 390) await shot(page, 'hero-treasure', width, height);
    await page.locator('[data-action="treatment"][data-treatment="aa"]').click();
    assert.equal((await page.locator('#print-progress').textContent()).trim(), expectedProgress);

    const storyCounts = { 聶小倩: 3, 嬰寧: 2, 陸判: 2, 畫皮: 3, 王六郎: 2 };
    for (const [story, count] of Object.entries(storyCounts)) {
      const filter = page.locator(`[data-action="filter-story"][data-story="${story}"]`);
      await targetIsUsable(filter);
      await filter.click();
      assert.equal(await page.locator('#catalogue-grid .catalogue-entry').count(), count, story);
    }
    await page.locator('[data-action="filter-story"][data-story="all"]').click();
    await targetIsUsable(page.locator('#faction-filter'));
    for (const faction of ['yun', 'ember', 'moon', 'grove']) {
      await page.locator('#faction-filter').selectOption(faction);
      assert.equal(await page.locator('#catalogue-grid .catalogue-entry').count(), 3, faction);
    }
    await page.locator('[data-action="filter-story"][data-story="聶小倩"]').click();
    await page.locator('#faction-filter').selectOption('moon');
    assert.deepEqual(await catalogueIds(page), ['niexiaoqian'], 'Story/faction filters must intersect');
    await page.locator('[data-action="filter-story"][data-story="嬰寧"]').click();
    await page.locator('#faction-filter').selectOption('yun');
    assert.equal(await page.locator('#catalogue-grid .catalogue-entry').count(), 0);
    assert(await page.locator('#empty-state').isVisible());
    await targetIsUsable(action(page, 'clear-filters'));
    await action(page, 'clear-filters').click();
    assert.equal(await page.locator('#faction-filter').inputValue(), 'all');
    assert.equal(await page.locator('#catalogue-grid .catalogue-entry').count(), 12);
    assert.equal(await page.locator('#empty-state').isVisible(), false);
    await focusIs(page, 'filter-story');
    const chips = await page.locator('#catalogue-grid .print-chip').evaluateAll(buttons => buttons.map(button => ({ cardId: button.dataset.cardId, treatment: button.dataset.treatment })));
    assert.deepEqual(chips, expectedSpecials.map(({ cardId, treatment }) => ({ cardId, treatment })), 'Catalogue lists every bound special printing once');
    const chip = page.locator('#catalogue-grid .print-chip[data-card-id="chenshi"][data-treatment="aa"]');
    await targetIsUsable(chip);
    await chip.focus();
    await page.keyboard.press('Enter');
    await page.locator('#card-dialog[open]').waitFor();
    checkFace(await printedFace(page, '#dialog-content .printed-card'), 'chenshi', specialsFor('chenshi')[0], `${label} chip`);
    await page.keyboard.press('Escape');
    await page.locator('#card-dialog[open]').waitFor({ state: 'hidden' });
    await focusIs(page, 'inspect', { cardId: 'chenshi', treatment: 'aa' });
    assert.equal(await page.locator('#catalogue-grid .print-chip[data-card-id="yingning"][data-treatment="aa"]').count(), 1, 'The round-four 嬰寧 AA is offered once');
    passed(`${label}: twelve portraits, identical BASE/AA/TR hero stats, five stories, four factions, intersection, empty-state recovery and seven special-printing links`);

    const inspectIds = width === 1440 ? await catalogueIds(page) : ['niexiaoqian', 'yingning', 'lupan', 'huapi', 'chenshi', 'wangliulang', 'xuyuren'];
    for (const id of inspectIds) {
      const opener = page.locator(`#catalogue-grid .catalogue-card-button[data-card-id="${id}"]`);
      await targetIsUsable(opener);
      await opener.focus();
      await page.keyboard.press('Enter');
      await page.locator('#card-dialog[open]').waitFor();
      assert.equal(await page.locator('#dialog-content .printed-card').getAttribute('data-card-id'), id);
      await focusIs(page, 'close-dialog');
      const ring = await action(page, 'close-dialog').evaluate(close => {
        const style = getComputedStyle(close), reach = style.outlineStyle === 'none' ? 0 : parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
        const a = close.getBoundingClientRect(), b = document.querySelector('#dialog-content .printed-card').getBoundingClientRect();
        return { reach, overlap: a.left - reach < b.right && a.right + reach > b.left && a.top - reach < b.bottom && a.bottom + reach > b.top };
      });
      assert(ring.reach > 0, `${label} ${id}: a keyboard-opened dialog shows the close button's focus ring`);
      assert.equal(ring.overlap, false, `${label} ${id}: the close button's focus ring must not cover the card`);
      const href = new URL(await page.locator('.dialog-source').getAttribute('href'));
      assert.equal(href.origin, 'https://zh.wikisource.org');
      const stats = await page.locator('.dialog-stats').textContent();
      const specials = specialsFor(id);
      checkFace(await printedFace(page, '#dialog-content .printed-card'), id, null, `${label} ${id} opens on BASE`);
      const buttons = await page.locator('[data-action="dialog-treatment"]').evaluateAll(items => items.map(item => item.dataset.treatment));
      assert.deepEqual(buttons, specials.length ? ['base', ...specials.map(print => print.treatment)] : [], `${label} ${id} printing selector`);
      for (const print of [...specials, null]) {
        const treatment = print?.treatment || 'base';
        if (!specials.length) break;
        const button = page.locator(`[data-action="dialog-treatment"][data-treatment="${treatment}"]`);
        await targetIsUsable(button);
        await button.click();
        checkFace(await printedFace(page, '#dialog-content .printed-card'), id, print, `${label} ${id} ${treatment}`);
        assert.equal(await page.locator('.dialog-stats').textContent(), stats, 'Treatments never change stats');
        assert.equal(await page.locator('[data-action="dialog-treatment"][aria-pressed="true"]').count(), 1);
        await focusIs(page, 'dialog-treatment', { treatment });
        if (print && print.printId !== 'lz01-001-aa1' && (width === 1440 || width === 390)) await shot(page, `dialog-${print.printId}`, width, height);
      }
      if (id === 'niexiaoqian') await shot(page, 'dialog', width, height);
      await targetIsUsable(action(page, 'close-dialog'));
      await page.keyboard.press('Escape');
      await page.locator('#card-dialog[open]').waitFor({ state: 'hidden' });
      await focusIs(page, 'inspect', { cardId: id });
      await noOverflow(page, `${label} closed dialog`);
    }
    passed(`${label}: inspected ${inspectIds.length} characters, every bound printing shows its own file with unchanged rules, the close ring clears the card, Escape restores visible opener focus`);

    await targetIsUsable(action(page, 'open-sample'));
    await action(page, 'open-sample').focus();
    await page.keyboard.press('Space');
    await phase(page, 'ready');
    assert.equal(await page.locator('#sample-cards .printed-card').count(), 0);
    await focusIs(page, 'reveal-card');
    for (const index of [0, 1, 2]) {
      const reveal = page.locator(`[data-action="reveal-card"][data-index="${index}"]`);
      await targetIsUsable(reveal);
      await reveal.focus();
      await page.keyboard.press('Space');
      assert.equal(await page.locator('#sample-cards .printed-card').count(), index + 1);
      await focusIs(page, index === 2 ? 'restart-sample' : 'reveal-card');
    }
    await phase(page, 'complete');
    assert.deepEqual(await sampleIdentity(page), expectedSample);
    assert.match(await page.locator('#sample-status').textContent(), /未加入背包/);
    await noOverflow(page, `${label} sample opened`);
    await shot(page, 'sample', width, height);
    await targetIsUsable(action(page, 'restart-sample'));
    await action(page, 'restart-sample').click();
    await phase(page, 'sealed');
    await focusIs(page, 'open-sample');
    await targetIsUsable(action(page, 'skip-sample'));
    await action(page, 'skip-sample').click();
    await phase(page, 'complete');
    assert.deepEqual(await sampleIdentity(page), expectedSample);
    await focusIs(page, 'restart-sample');

    await action(page, 'restart-sample').click();
    await action(page, 'open-sample').click();
    await phase(page, 'ready');
    await page.locator('[data-action="reveal-card"][data-index="1"]').click();
    assert.equal(await page.locator('#sample-cards .printed-card').count(), 1);
    await action(page, 'skip-sample').click();
    await phase(page, 'complete');
    assert.deepEqual(await sampleIdentity(page), expectedSample, 'Partial reveal followed by reveal-all stays deterministic');
    if (width === 1440) {
      await action(page, 'restart-sample').click();
      const skipped = await page.evaluate(() => {
        document.querySelector('[data-action="open-sample"]').click();
        const during = document.querySelector('#sample-stage').dataset.phase;
        document.querySelector('[data-action="skip-sample"]').click();
        return { during, after: document.querySelector('#sample-stage').dataset.phase };
      });
      assert.deepEqual(skipped, { during: 'opening', after: 'complete' });
      await page.waitForTimeout(500);
      await phase(page, 'complete');
      assert.deepEqual(await sampleIdentity(page), expectedSample, 'Cancelled timer must not revive the opening');
    }
    passed(`${label}: individual/reveal-all/skip/repeat produce the same three cards with usable targets and no overflow`);
    await verifyIsolation(context, page);
    await context.close(); contexts.delete(context);
  }

  const reduced = await openPage(390, 844, 'reduce');
  const immediate = await reduced.page.evaluate(() => {
    document.querySelector('[data-action="open-sample"]').click();
    return document.querySelector('#sample-stage').dataset.phase;
  });
  assert.equal(immediate, 'ready', 'Reduced-motion opening must not wait for the decorative timer');
  await action(reduced.page, 'skip-sample').click();
  assert.deepEqual(await sampleIdentity(reduced.page), expectedSample);
  const animations = await reduced.page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running').length);
  assert.equal(animations, 0, 'Reduced motion has no running visual animations');
  await focusIs(reduced.page, 'restart-sample');
  await verifyIsolation(reduced.context, reduced.page);
  await reduced.context.close(); contexts.delete(reduced.context);
  passed('Reduced-motion opening reaches ready immediately; fixed reveal retains visible focus and no running animation');
  assert.deepEqual(forbiddenRequests, [], 'Preview attempted an API, mutation or external request');
  assert.deepEqual(errors, [], 'Browser runtime, console or asset errors');
  passed('Synthetic local/session saves untouched and unread; no cookies, storage APIs, API calls, external calls or asset errors');
} catch (error) {
  failure = error;
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
  const receipt = { passed: !failure, browser: browserName, checks, screenshots: screenshots.map(name => output + name), errors, forbiddenRequests, ...(failure ? { failure: failure.message } : {}) };
  await writeFile(output + `liaozhai-${browserName}-smoke.json`, JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt, null, 2));
}
if (failure) throw failure;
