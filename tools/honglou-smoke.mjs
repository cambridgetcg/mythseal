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
const base = new URL(process.env.GAME_URL || 'http://127.0.0.1:4178');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) throw Error('Honglou smoke requires a loopback game server.');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = fileURLToPath(new URL('../test-results/', import.meta.url));
const checks = [], screenshots = [], errors = [], forbiddenRequests = [], contexts = new Set();
const passed = label => { checks.push(label); console.log(`PASS ${label}`); };
const action = (page, name) => page.locator(`[data-action="${name}"]`);
const phase = (page, value) => page.locator(`#sample-stage[data-phase="${value}"]`).waitFor();
const expectedSample = [
  { cardId: 'jiabaoyu', treatment: 'base' },
  { cardId: 'shixiangyun', treatment: 'base' },
  { cardId: 'lindaiyu', treatment: 'aa' },
];
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
    nativeSet.call(local, 'shanhai.profile.v5', '{"fixture":"honglou-do-not-touch"}');
    nativeSet.call(local, 'shanhai.profile.v3', '{"fixture":"legacy-do-not-touch"}');
    nativeSet.call(local, 'shanhai.battle.v5', '{"fixture":"pending-do-not-touch"}');
    nativeSet.call(session, 'honglou-smoke.session', 'unchanged');
    const accesses = [];
    const nativeRandom = Math.random;
    Math.random = function () { accesses.push({ kind: 'Math.random' }); return nativeRandom(); };
    const snapshotOne = storage => Object.fromEntries(Array.from({ length: storage.length }, (_, index) => {
      const key = nativeKey.call(storage, index);
      return [key, nativeGet.call(storage, key)];
    }));
    const snapshot = () => ({ local: snapshotOne(local), session: snapshotOne(session) });
    window.__hlAudit = { before: snapshot(), accesses, snapshot };
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
  const response = await page.goto(new URL('/honglou.html', base).href);
  assert.equal(response.status(), 200);
  await page.locator('#catalogue-grid .catalogue-entry').first().waitFor();
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
  const audit = await page.evaluate(() => ({ before: window.__hlAudit.before, after: window.__hlAudit.snapshot(), accesses: window.__hlAudit.accesses }));
  assert.deepEqual(audit.after, audit.before, 'Preview changed synthetic saves.');
  assert.deepEqual(audit.accesses, [], 'Preview accessed storage, cookies, IndexedDB or caches.');
  assert.deepEqual(await context.cookies(), [], 'Preview wrote a cookie.');
}
async function shot(page, label, width, height) {
  await decoded(page);
  await noOverflow(page, label);
  const name = `honglou-${browserName}-${label}-${width}x${height}.png`;
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
async function catalogueIds(page) {
  return page.locator('#catalogue-grid .printed-card').evaluateAll(cards => cards.map(card => card.dataset.cardId));
}

let failure;
try {
  for (const [width, height] of [[1440, 900], [390, 844], [360, 740], [844, 390]]) {
    const { context, page } = await openPage(width, height);
    const label = `${width}x${height}`;
    await shot(page, 'initial', width, height);
    assert.match(await page.title(), /紅樓.*風月入夢/);
    assert.match(await page.locator('.sample-notice').textContent(), /固定展示/);
    assert.match(await page.locator('.sample-notice').textContent(), /不消耗金幣，不加入背包/);
    assert.equal(await page.locator('#catalogue-grid .catalogue-entry').count(), 8);
    assert.equal(await page.locator('#set-sources a').count(), 2);
    const heroStats = [];
    for (const treatment of ['base', 'aa']) {
      const button = page.locator(`[data-action="treatment"][data-treatment="${treatment}"]`);
      await targetIsUsable(button);
      await button.focus();
      await page.keyboard.press('Space');
      const hero = page.locator('#hero-card .printed-card');
      assert.equal(await hero.getAttribute('data-card-id'), 'lindaiyu');
      assert.equal(await hero.getAttribute('data-treatment'), treatment);
      assert.equal(await button.getAttribute('aria-pressed'), 'true');
      heroStats.push(await hero.locator('.card-numbers').textContent());
      await focusIs(page, 'treatment', { treatment });
      await noOverflow(page, `${label} hero ${treatment}`);
    }
    assert.equal(heroStats[0], heroStats[1], 'BASE and AA must display identical stats');

    for (const star of ['2', '3']) {
      const filter = page.locator(`[data-action="filter-stars"][data-stars="${star}"]`);
      await targetIsUsable(filter); await filter.click();
      assert.equal(await page.locator('#catalogue-grid .catalogue-entry').count(), 4, `${star} stars`);
    }
    await page.locator('[data-action="filter-stars"][data-stars="all"]').click();
    await targetIsUsable(page.locator('#faction-filter'));
    for (const faction of ['yun', 'ember', 'moon', 'grove']) {
      await page.locator('#faction-filter').selectOption(faction);
      assert.equal(await page.locator('#catalogue-grid .catalogue-entry').count(), 2, faction);
    }
    await page.locator('[data-action="filter-stars"][data-stars="3"]').click();
    await page.locator('#faction-filter').selectOption('yun');
    assert.deepEqual(await catalogueIds(page), ['xuebaochai', 'jiatanchun'], 'Star/faction filters must intersect');
    await page.locator('[data-action="filter-stars"][data-stars="2"]').click();
    assert.equal(await page.locator('#catalogue-grid .catalogue-entry').count(), 0);
    assert(await page.locator('#empty-state').isVisible());
    await targetIsUsable(action(page, 'clear-filters')); await action(page, 'clear-filters').click();
    assert.equal(await page.locator('#faction-filter').inputValue(), 'all');
    assert.equal(await page.locator('#catalogue-grid .catalogue-entry').count(), 8);
    assert.equal(await page.locator('#empty-state').isVisible(), false);
    await focusIs(page, 'filter-stars');
    passed(`${label}: eight portraits, identical hero BASE/AA stats, star and faction filters, intersection and empty-state recovery`);
    await shot(page, 'catalogue', width, height);

    const inspectIds = width === 1440 ? await catalogueIds(page) : ['lindaiyu', 'shixiangyun', 'jiatanchun', 'jiaxichun'];
    for (const id of inspectIds) {
      const opener = page.locator(`#catalogue-grid .catalogue-card-button[data-card-id="${id}"]`);
      await targetIsUsable(opener);
      await opener.focus();
      await page.keyboard.press('Enter');
      await page.locator('#card-dialog[open]').waitFor();
      assert.equal(await page.locator('#dialog-content .printed-card').getAttribute('data-card-id'), id);
      await focusIs(page, 'close-dialog');
      const href = new URL(await page.locator('.dialog-source').getAttribute('href'));
      assert.equal(href.origin, 'https://zh.wikisource.org');
      const stats = await page.locator('.dialog-stats').textContent();
      assert((await page.locator('.dialog-role').textContent()).length > 20, 'Each character includes a sourced role description');
      if (['lindaiyu', 'shixiangyun', 'jiatanchun'].includes(id)) {
        for (const treatment of ['aa', 'base']) {
          const button = page.locator(`[data-action="dialog-treatment"][data-treatment="${treatment}"]`);
          await targetIsUsable(button);
          await button.click();
          assert.equal(await page.locator('#dialog-content .printed-card').getAttribute('data-treatment'), treatment);
          assert.equal(await page.locator('.dialog-stats').textContent(), stats);
          const scene = { lindaiyu: '雨停之前', shixiangyun: '花影留眠', jiatanchun: '一紙相邀' };
          if (treatment === 'aa') assert.equal(await page.locator('.dialog-subtitle').textContent(), scene[id]);
          const chapter = id === 'shixiangyun' && treatment === 'aa' ? '062' : '037';
          assert(decodeURI(await page.locator('.dialog-source').getAttribute('href')).endsWith(`第${chapter}回`), 'AA source follows its actual chapter');
          await focusIs(page, 'dialog-treatment', { treatment });
        }
        if (id === 'shixiangyun') {
          await page.locator('[data-action=dialog-treatment][data-treatment=aa]').click();
          await shot(page, 'xiangyun-aa-dialog', width, height);
        }
      }
      await targetIsUsable(action(page, 'close-dialog'));
      await action(page, 'close-dialog').focus();
      await page.keyboard.press('Shift+Tab');
      assert(await page.evaluate(() => document.activeElement.matches('#card-dialog .dialog-source')), 'Shift+Tab wraps from close to the final source link');
      await page.keyboard.press('Tab');
      await focusIs(page, 'close-dialog');
      await page.keyboard.press('Tab');
      if (['lindaiyu', 'shixiangyun', 'jiatanchun'].includes(id)) {
        await focusIs(page, 'dialog-treatment', { treatment: 'base' });
      } else {
        assert(await page.evaluate(() => document.activeElement.matches('#card-dialog .dialog-source')), 'Forward Tab selects the source for a card without AA');
      }
      await page.keyboard.press('Shift+Tab');
      await focusIs(page, 'close-dialog');
      await page.keyboard.press('Escape');
      await page.locator('#card-dialog[open]').waitFor({ state: 'hidden' });
      await focusIs(page, 'inspect', { cardId: id });
      await noOverflow(page, `${label} closed dialog`);
    }
    passed(`${label}: inspected ${inspectIds.length} characters, AA rules unchanged, Escape restores visible opener focus`);

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
  passed('Synthetic local/session saves untouched and unread; no RNG, cookies, storage APIs, API calls, external calls or asset errors');
} catch (error) {
  failure = error;
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
  const receipt = { passed: !failure, browser: browserName, checks, screenshots: screenshots.map(name => output + name), errors, forbiddenRequests, ...(failure ? { failure: failure.message } : {}) };
  await writeFile(output + `honglou-${browserName}-smoke.json`, JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt, null, 2));
}
if (failure) throw failure;
