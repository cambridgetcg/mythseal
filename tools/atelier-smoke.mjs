/** Isolated, deterministic art-preview checks. No real player/browser profile is opened. */
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
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) throw Error('Atelier smoke requires a loopback game server.');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = fileURLToPath(new URL('../test-results/', import.meta.url));
const checks = [], screenshots = [], errors = [], forbiddenRequests = [], contexts = new Set();
const action = (page, id) => page.locator(`[data-action="${id}"]`);
const demoPhase = (page, phase) => page.locator(`#booster-demo[data-phase="${phase}"]`).waitFor();
const passed = label => { checks.push(label); console.log(`PASS ${label}`); };
const editions = [
  ['base', '本畫 · 齊天行者'], ['alt', '異畫 · 踏碎凌霄'],
  ['ink', '墨卷 · 大鬧天宮'], ['treasure', '天工 · 定海神珍'],
];
await mkdir(output, { recursive: true });
const browser = await engines[browserName].launch({ headless: true, ...(browserName === 'chromium' && existsSync(chrome) ? { executablePath: chrome } : {}) });

async function openPage(width, reducedMotion = 'no-preference') {
  const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 1000 }, reducedMotion, deviceScaleFactor: 1 });
  contexts.add(context);
  await context.addInitScript(() => {
    // Synthetic canaries ensure even a read-modify-write round trip is detected.
    localStorage.setItem('shanhai.profile.v3', '{"fixture":"atelier-do-not-touch"}');
    localStorage.setItem('atelier-smoke.local', 'unchanged');
    sessionStorage.setItem('atelier-smoke.session', 'unchanged');
    const snapshot = () => ({ local: { ...localStorage }, session: { ...sessionStorage } });
    window.__atelierAudit = { before: snapshot(), writes: [], snapshot };
    for (const method of ['setItem', 'removeItem', 'clear']) {
      const native = Storage.prototype[method];
      Storage.prototype[method] = function (...args) {
        window.__atelierAudit.writes.push({ method, storage: this === localStorage ? 'local' : 'session', key: String(args[0] ?? '') });
        return Reflect.apply(native, this, args);
      };
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
  const response = await page.goto(new URL('/atelier.html', base).href);
  assert.equal(response.status(), 200);
  await page.locator('#hero-card .collector-card').waitFor();
  await decoded(page);
  return { context, page };
}
async function decoded(page) {
  await page.evaluate(async () => {
    await Promise.all([...document.images].map(image => image.decode()));
    const atlas = new Image(); atlas.src = 'assets/classics.png'; await atlas.decode();
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
async function noOverflow(page, label) {
  const size = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert(size.document <= size.viewport + 1, `${label}: horizontal overflow ${JSON.stringify(size)}`);
}
async function shot(page, label, width, selector) {
  await decoded(page);
  await noOverflow(page, label);
  const name = `atelier-${browserName}-${label}-${width}.png`;
  await page.locator(selector).screenshot({ path: output + name, animations: 'disabled' });
  screenshots.push(name);
}
async function focusIsVisible(page, expectedAction = null) {
  const focus = await page.evaluate(() => {
    const active = document.activeElement;
    const surface = active.matches('input[type="radio"]') ? active.closest('label') : active;
    const rect = surface.getBoundingClientRect();
    return { action: active.dataset.action, width: rect.width, height: rect.height, hidden: Boolean(active.closest('[hidden]')), visibility: getComputedStyle(surface).visibility };
  });
  assert(!focus.hidden && focus.visibility !== 'hidden' && focus.width >= 1 && focus.height >= 1, `Focus must remain on a visible control: ${JSON.stringify(focus)}`);
  if (expectedAction) assert.equal(focus.action, expectedAction);
}
async function targetIsUsable(locator) {
  await locator.scrollIntoViewIfNeeded();
  const hit = await locator.evaluate(element => {
    const rect = element.getBoundingClientRect(), x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    return { width: rect.width, height: rect.height, hit: element.contains(document.elementFromPoint(x, y)) };
  });
  assert(hit.width >= 44 && hit.height >= 44 && hit.hit, `Control must be a clear 44px target: ${JSON.stringify(hit)}`);
}
async function verifyIsolation(context, page) {
  const audit = await page.evaluate(() => ({ before: window.__atelierAudit.before, after: window.__atelierAudit.snapshot(), writes: window.__atelierAudit.writes }));
  assert.deepEqual(audit.after, audit.before, 'Art preview changed synthetic storage.');
  assert.deepEqual(audit.writes, [], 'Art preview attempted a storage write.');
  assert.deepEqual(await context.cookies(), [], 'Art preview wrote a cookie.');
}
async function verifyHero(page, id, name) {
  // Do not assume that mouse clicks focus buttons in every browser.
  // Exercise the keyboard contract explicitly.
  await page.locator(`[data-action="select-treatment"][data-id="${id}"]`).focus();
  await page.keyboard.press('Space');
  const card = page.locator('#hero-card .collector-card');
  assert.equal(await card.getAttribute('data-card-id'), 'wukong');
  assert.equal(await card.getAttribute('data-treatment'), id);
  assert.equal(await card.getAttribute('data-rarity'), 'epic');
  assert.equal(await card.locator('h3').textContent(), '孫悟空');
  assert.equal(await card.locator('[data-card-power]').textContent(), '7');
  assert.equal(await card.locator('[data-card-damage]').textContent(), '6');
  assert.equal(await card.locator('.collector-stars').getAttribute('aria-label'), '5 星');
  assert.equal(await card.locator('.collector-ability').getAttribute('data-ability'), 'stopAbility');
  assert.match(await card.locator('.collector-ability').textContent(), /破妄 · 封鎖技能/);
  assert.match(await card.locator('.collector-faction').textContent(), /赤燼/);
  assert.match(await card.locator('.collector-foot').textContent(), /神品/);
  assert.equal(await page.locator('#treatment-title').textContent(), name);
  assert.equal(await page.locator('#treatment-picker [aria-pressed="true"]').count(), 1);
  assert.equal(await page.locator('#treatment-picker [aria-pressed="true"]').getAttribute('data-id'), id);
  await focusIsVisible(page, 'select-treatment');
}
async function verifyRarities(page) {
  const expected = [['kongzi', '孔子', 'common', '○ 凡品'], ['guanyu', '關羽', 'rare', '◇ 靈品'], ['wukong', '孫悟空', 'epic', '✦ 神品']];
  const borders = [];
  for (const [id, name, rarity, label] of expected) {
    const figure = page.locator(`.rarity-sample:has([data-card-id="${id}"])`);
    assert.equal(await figure.locator('.collector-card').getAttribute('data-rarity'), rarity);
    assert.equal(await figure.locator('figcaption>b').textContent(), name);
    assert.equal(await figure.locator('.rarity-label').textContent(), label);
    borders.push(await figure.locator('.collector-card').evaluate(el => getComputedStyle(el).borderTopColor));
  }
  assert.equal(new Set(borders).size, 3, 'Three rarity frames need distinct border treatments.');
}

let failure;
try {
  for (const width of [360, 390, 1440]) {
    const { context, page } = await openPage(width);
    assert.match(await page.title(), /匠作閣 · 新系列企劃預覽/);
    assert.match(await page.locator('.preview-note').textContent(), /展示用，未加入背包/);
    assert.equal(await page.locator('.atelier-topbar .back-link').getAttribute('href'), '/');
    for (const [id, name] of editions) {
      await verifyHero(page, id, name);
      await noOverflow(page, `${width} ${id}`);
      if ([360, 1440].includes(width) && ['ink', 'treasure'].includes(id)) await shot(page, id, width, '.treatment-study');
    }
    await verifyRarities(page);
    await targetIsUsable(page.locator('[data-action="select-treatment"][data-id="ink"]'));
    passed(`${width}px: four identical Wukong rule sets, approved art titles, distinct rarity samples, no overflow`);

    // Native radio arrow keys should change the fixed third card and preserve focus.
    await page.locator('input[name="demo-finish"][value="ink"]').focus();
    await page.keyboard.press('ArrowRight');
    assert(await page.locator('input[name="demo-finish"][value="treasure"]').isChecked());
    assert.equal(await page.evaluate(() => document.activeElement.value), 'treasure');
    await focusIsVisible(page);
    await page.keyboard.press('ArrowLeft');
    assert(await page.locator('input[name="demo-finish"][value="ink"]').isChecked());
    await demoPhase(page, 'sealed');

    await page.evaluate(() => {
      window.__atelierPhases = [];
      const element = document.querySelector('#booster-demo');
      new MutationObserver(() => window.__atelierPhases.push(element.dataset.phase)).observe(element, { attributes: true, attributeFilter: ['data-phase'] });
    });
    await targetIsUsable(action(page, 'open-pack'));
    await action(page, 'open-pack').click();
    await demoPhase(page, 'ready');
    assert.equal(await page.locator('.demo-slot.is-revealed').count(), 0);
    assert.equal(await page.locator('[data-action="reveal-card"]:visible').count(), 3);
    const phases = await page.evaluate(() => window.__atelierPhases);
    assert(phases.includes('opening') && phases.includes('unsealed') && phases.includes('ready'), `Opening phases missing: ${phases}`);
    await focusIsVisible(page, 'reveal-card');
    for (const index of [0, 1, 2]) {
      const reveal = page.locator(`[data-action="reveal-card"][data-index="${index}"]`);
      await targetIsUsable(reveal);
      await reveal.focus();
      await page.keyboard.press('Space');
      assert.equal(await page.locator('.demo-slot.is-revealed').count(), index + 1);
      await focusIsVisible(page, index === 2 ? 'reset-demo' : 'reveal-card');
    }
    await demoPhase(page, 'complete');
    assert.deepEqual(await page.locator('.demo-card-face:visible .collector-card').evaluateAll(cards => cards.map(card => card.dataset.treatment)), ['base', 'alt', 'ink']);
    assert.match(await page.locator('#demo-status').textContent(), /未加入背包/);
    await noOverflow(page, `${width} opened demo`);
    if ([360, 1440].includes(width)) await shot(page, 'demo', width, '.booster-study');

    await action(page, 'reset-demo').focus();
    await page.keyboard.press('Enter');
    await demoPhase(page, 'sealed');
    await focusIsVisible(page, 'open-pack');
    assert.equal(await page.locator('.demo-slot.is-revealed').count(), 0);
    await page.locator('.finish-picker label:has(input[value="treasure"])').click();
    await targetIsUsable(action(page, 'skip-demo'));
    await action(page, 'skip-demo').click();
    await demoPhase(page, 'complete');
    assert.deepEqual(await page.locator('.demo-card-face:visible .collector-card').evaluateAll(cards => cards.map(card => card.dataset.treatment)), ['base', 'alt', 'treasure']);
    await focusIsVisible(page, 'reset-demo');
    await action(page, 'reset-demo').click();
    await action(page, 'open-pack').click();
    await demoPhase(page, 'ready');
    await page.locator('[data-action="reveal-card"][data-index="1"]').click();
    assert.equal(await page.locator('.demo-slot.is-revealed').count(), 1);
    await targetIsUsable(action(page, 'reveal-all'));
    await action(page, 'reveal-all').click();
    await demoPhase(page, 'complete');
    assert.equal(await page.locator('.demo-slot.is-revealed').count(), 3);
    await focusIsVisible(page, 'reset-demo');
    passed(`${width}px: keyboard finish choice, 160/300ms opening, manual/all reveals, replay and fixed TR alternative`);

    if (width === 1440) {
      await action(page, 'reset-demo').click();
      // Same-task clicks isolate the short opening cancellation from test-runner latency.
      const skipped = await page.evaluate(() => {
        document.querySelector('[data-action="open-pack"]').click();
        const during = document.querySelector('#booster-demo').dataset.phase;
        document.querySelector('[data-action="skip-demo"]').click();
        return { during, after: document.querySelector('#booster-demo').dataset.phase };
      });
      assert.deepEqual(skipped, { during: 'opening', after: 'complete' });
      await page.waitForTimeout(360);
      await demoPhase(page, 'complete');
      assert.equal(await page.locator('.demo-slot.is-revealed').count(), 3);
      await focusIsVisible(page, 'reset-demo');
      await action(page, 'reset-demo').click();
      const hidden = await page.evaluate(() => {
        document.querySelector('[data-action="open-pack"]').click();
        const during = document.querySelector('#booster-demo').dataset.phase;
        window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
        return { during, after: document.querySelector('#booster-demo').dataset.phase };
      });
      assert.deepEqual(hidden, { during: 'opening', after: 'complete' });
      await page.waitForTimeout(360);
      await demoPhase(page, 'complete');
      await focusIsVisible(page, 'reset-demo');
      passed('Opening skip and synthetic persisted-pagehide finish immediately; cancelled callbacks do not revive the opening');
    }
    await verifyIsolation(context, page);
    await context.close(); contexts.delete(context);
  }

  const reduced = await openPage(390, 'reduce');
  await action(reduced.page, 'open-pack').click();
  await demoPhase(reduced.page, 'complete');
  assert.equal(await reduced.page.locator('.demo-slot.is-revealed').count(), 3);
  await focusIsVisible(reduced.page, 'reset-demo');
  const animations = await reduced.page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running').length);
  assert.equal(animations, 0, 'Reduced motion must have no running visual animation.');
  await action(reduced.page, 'reset-demo').click();
  await reduced.page.emulateMedia({ reducedMotion: 'no-preference' });
  await action(reduced.page, 'open-pack').click();
  await reduced.page.emulateMedia({ reducedMotion: 'reduce' });
  await demoPhase(reduced.page, 'complete');
  await focusIsVisible(reduced.page, 'reset-demo');
  await verifyIsolation(reduced.context, reduced.page);
  await reduced.context.close(); contexts.delete(reduced.context);
  passed('Reduced-motion opening and a mid-opening preference change finish all three cards immediately without hidden focus');

  assert.deepEqual(forbiddenRequests, [], 'Preview attempted an API, mutation or external request.');
  assert.deepEqual(errors, [], 'Browser console, runtime or asset errors.');
  passed('Synthetic local/session saves and cookies untouched; no API/mutation/external requests; no failed assets or console errors');
} catch (error) {
  failure = error;
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
  const receipt = { passed: !failure, browser: browserName, checks, screenshots: screenshots.map(name => output + name), errors, forbiddenRequests, ...(failure ? { failure: failure.message } : {}) };
  await writeFile(output + `atelier-${browserName}-smoke.json`, JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt, null, 2));
}
if (failure) throw failure;
