/** Independent viewport acceptance using synthetic profiles and real UI pagination. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createProfile, hydrateProfile, PROFILE_KEY, buyWX01Box, buyPack, beginBattle } from '../progression.mjs';
import { mintInstance, setInstanceXP } from '../collection.mjs';
import { CARDS } from '../engine.mjs';
import { WX01_PRINTINGS } from '../printing-catalogue.mjs';
import { clickViewportItem, revealViewportItem, viewportFrames, visibleViewportIds } from './viewport-browser-helpers.mjs';

const browserName = process.env.BROWSER || 'chromium';
if (!['chromium', 'webkit'].includes(browserName)) throw Error('BROWSER must be chromium or webkit.');
const runtime = fileURLToPath(new URL('../test-results/webkit-runtime', import.meta.url));
if (browserName === 'webkit' && !process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(runtime)) process.env.PLAYWRIGHT_BROWSERS_PATH = runtime;
const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = new URL(process.env.GAME_URL || 'http://127.0.0.1:4177');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) throw Error('Viewport smoke requires loopback.');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = fileURLToPath(new URL('../test-results/', import.meta.url));
const now = '2026-09-22T12:00:00.000Z';
const audit = process.env.VIEWPORT_AUDIT === '1';
const supplementOnly = process.env.VIEWPORT_SUPPLEMENT_ONLY === '1';
const sizes = [[1440, 900], [1280, 720], [390, 844], [360, 740], [360, 640], [844, 390]];
const selectedSizes = process.env.VIEWPORT_SIZE ? sizes.filter(pair => pair.join('x') === process.env.VIEWPORT_SIZE) : sizes;
assert(selectedSizes.length, 'VIEWPORT_SIZE must name one supported size');
const contexts = new Set(), checks = [], screenshots = [], errors = [], layouts = [], pagination = [];
const action = (page, name, id) => page.locator(`[data-action="${name}"]${id === undefined ? '' : `[data-id="${id}"]`}`);
const click = (page, name, id) => clickViewportItem(page, action(page, name, id));
const readRaw = page => page.evaluate(key => localStorage.getItem(key), PROFILE_KEY);
const passed = label => { checks.push(label); console.log(`${audit ? 'AUDIT FLOW' : 'PASS'} ${label}`); };

function fixture() {
  let profile = createProfile({ now });
  for (const print of WX01_PRINTINGS) profile = mintInstance(profile, print.cardId, { printId: print.id, now, source: 'viewport-fixture' }).profile;
  const target = profile.instances.find(card => card.printId === 'wx01-005-aa1').uid;
  const donor = profile.instances.find(card => card.printId === 'wx01-005-base').uid;
  profile = setInstanceXP(profile, target, 90);
  profile.coins = 50000; profile.dust = 1000; profile.wx01.seals = 250;
  profile.cleared = ['mist-gate'];
  return { profile: hydrateProfile(profile, { now }), target, donor };
}

async function pageFor(seed, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  contexts.add(context);
  await context.addInitScript(({ seed, key, now }) => {
    const NativeDate = Date, fixed = new NativeDate(now).getTime();
    globalThis.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } };
    Math.random = () => .23;
    if (!localStorage.getItem('viewport-smoke.seeded')) {
      localStorage.setItem(key, JSON.stringify(seed)); localStorage.setItem('viewport-smoke.seeded', 'yes');
      localStorage.setItem('shanhai.experience.v1', JSON.stringify({ sound: false, motion: 'reduce', pace: 'fast' }));
    }
    window.viewportSmokeWrites = [];
    const nativeSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function(name, value) {
      nativeSet.call(this, name, value);
      if (this === localStorage && name === key) window.viewportSmokeWrites.push(value);
    };
  }, { seed, key: PROFILE_KEY, now });
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
  const page = await context.newPage(); page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${new URL(response.url()).pathname}`); });
  await page.goto(base.href); await page.locator('.game-lobby').waitFor(); await viewportFrames(page);
  assert.equal(await readRaw(page), JSON.stringify(seed));
  return page;
}

async function fit(page, label) {
  await viewportFrames(page);
  const result = await page.evaluate(() => {
    const visible = node => !node.closest('[hidden],[inert]') && getComputedStyle(node).visibility !== 'hidden' && node.getClientRects().length && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0;
    const name = node => node.dataset.action || node.dataset.viewportAction || node.id || node.className || node.tagName;
    const active = [...document.querySelectorAll('[data-viewport-surface]')].filter(visible);
    const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    const outside = r => r.x < -2 || r.y < -2 || r.right > innerWidth + 2 || r.bottom > innerHeight + 2;
    const boxes = [...new Set([...active.flatMap(surface => [surface, ...surface.querySelectorAll('[data-viewport-module],[data-viewport-list],.viewport-list-frame')]), ...document.querySelectorAll('.modal')])].filter(visible).map(node => ({ name: name(node), rect: rect(node), client: [node.clientWidth, node.clientHeight], scroll: [node.scrollWidth, node.scrollHeight] }));
    const controls = [...new Set([...active.flatMap(surface => [...surface.querySelectorAll('button,input:not([type="hidden"]),select,textarea,a[href]')]), ...document.querySelectorAll('.modal button,.modal input,.modal select,.game-header button,.game-dock button,.cards-hub-tabs button,.scene-resume-strip button')])].filter(visible).map(node => {
      const target = node.matches('input[type="checkbox"],input[type="radio"]') ? node.closest('label') || node : node;
      const r = rect(target), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { name: name(node), rect: r, clipped: outside(r), short: r.height < 43.5 || r.width < 43.5,
        covered: !node.disabled && !(hit === target || target.contains(hit)), font: parseFloat(getComputedStyle(node).fontSize) };
    });
    return { viewport: [innerWidth, innerHeight], document: [document.documentElement.scrollWidth, document.documentElement.scrollHeight], scroll: [scrollX, scrollY], surfaces: active.length,
      boxes: boxes.filter(box => outside(box.rect) || box.scroll[0] > box.client[0] + 2 || box.scroll[1] > box.client[1] + 2),
      controls: controls.filter(control => control.clipped || control.short || control.covered), controlsChecked: controls.length };
  });
  result.failed = !result.surfaces || result.document[0] > result.viewport[0] + 1 || result.document[1] > result.viewport[1] + 1 || result.scroll.some(value => value !== 0) || result.boxes.length > 0 || result.controls.length > 0;
  layouts.push({ label, ...result });
  if (audit) return;
  assert(result.surfaces > 0, `${label}: no active viewport surface`);
  assert(result.document[0] <= result.viewport[0] + 1 && result.document[1] <= result.viewport[1] + 1 && result.scroll.every(value => value === 0), `${label}: document scroll ${JSON.stringify(result)}`);
  assert.deepEqual(result.boxes, [], `${label}: active content is clipped/scrolling`);
  assert.deepEqual(result.controls, [], `${label}: actions must be visible, unobstructed and44px`);
}

async function walk(page, label) {
  if (audit) console.log(`AUDIT ${label}`);
  await viewportFrames(page);
  // The app behind a modal is inert; only the dialog's surface is interactive.
  const surface = page.locator('[data-viewport-surface]').filter({ visible: true }).filter({ hasNot: page.locator('[data-viewport-surface]') });
  const candidates = await surface.count();
  let active;
  for (let i = 0; i < candidates; i++) if (!await surface.nth(i).evaluate(node => !!node.closest('[inert]'))) active = surface.nth(i);
  assert(active, `${label}: expected an interactive surface`);
  const tabs = active.locator('[data-viewport-action="module"]');
  const modules = await tabs.evaluateAll(nodes => nodes.map(node => node.dataset.viewportTarget));
  for (const id of modules.length ? modules : [null]) {
    if (id !== null) {
      const tab = active.locator(`[data-viewport-action="module"][data-viewport-target="${id}"]`);
      if (await tab.getAttribute('aria-selected') !== 'true') await tab.click();
      await viewportFrames(page);
    }
    await fit(page, `${label}/${id || 'main'}`);
    const lists = active.locator('[data-viewport-list]').filter({ visible: true });
    for (let i = 0; i < await lists.count(); i++) {
      const list = lists.nth(i), listId = await list.getAttribute('data-viewport-list');
      const all = await list.locator(':scope > [data-viewport-id]').evaluateAll(nodes => nodes.map(node => node.dataset.viewportId));
      assert.equal(all.length, await list.locator(':scope > :not([data-viewport-exclude])').count(), `${label}/${listId}: each paginated child needs a stable identity`);
      assert.equal(new Set(all).size, all.length, `${label}/${listId}: duplicate stable item IDs`);
      const previous = active.locator(`[data-viewport-action="previous"][data-viewport-list-id="${listId}"]`);
      const next = active.locator(`[data-viewport-action="next"][data-viewport-list-id="${listId}"]`);
      for (let n = 0; n < 1000 && await previous.count() && await previous.isEnabled(); n++) { await previous.click(); await viewportFrames(page); }
      const seen = [], receiptUIDs = []; let pages = 0;
      do {
        const visible = await visibleViewportIds(list); seen.push(...visible); pages++;
        receiptUIDs.push(...await list.locator('[data-summary-instance]').filter({ visible: true }).evaluateAll(nodes => nodes.map(node => node.dataset.summaryInstance)));
        assert(visible.length || all.length === 0, `${label}/${listId}: empty page hides remaining content`);
        await fit(page, `${label}/${id || 'main'}/${listId}/${pages}`);
        if (!await next.count() || !await next.isEnabled()) break;
        assert(pages < 1000, 'Pagination did not terminate'); await next.click(); await viewportFrames(page);
      } while (true);
      assert.deepEqual([...seen].sort(), [...all].sort(), `${label}/${listId}: every item must be reachable exactly once`);
      pagination.push({ label, module: id, list: listId, pages, items: seen.length, ...(receiptUIDs.length ? { receiptUIDs } : {}) });
    }
  }
}

async function shot(page, name) {
  await fit(page, `screenshot:${name}`);
  await page.evaluate(async () => {
    await document.fonts.ready;
    const urls = new Set([...document.querySelectorAll('.card-art')].filter(node => !node.closest('[hidden],[inert]')).flatMap(node => [...getComputedStyle(node).backgroundImage.matchAll(/url\(["']?(https?:[^"')]+)["']?\)/g)].map(match => match[1])));
    await Promise.all([...urls].map(url => { const image = new Image(); image.src = url; return image.decode(); }));
  });
  await viewportFrames(page);
  const file = `viewport-${browserName}-${name}.png`; await page.screenshot({ path: output + file }); screenshots.push(file);
}
async function close(page) { await clickViewportItem(page, page.locator('.modal-close')); await page.locator('.modal').waitFor({ state: 'hidden' }); }
async function go(page, name) { await clickViewportItem(page, page.locator(`.game-dock [data-action="${name}"]`)); }

async function journeyPressure() {
  const { profile } = fixture();
  const receipt = hydrateProfile(buyPack(profile, { set: 'wx01', rng: () => .23, now }).profile, { now });
  const pending = hydrateProfile(beginBattle(receipt, { kind: 'practice', now }).profile, { now });
  for (const [name, seed] of [['pending-and-receipt', pending], ['receipt-preparation', receipt]]) {
    const page = await pageFor(seed, 360, 640), original = await readRaw(page);
    const writes = await page.evaluate(() => window.viewportSmokeWrites.length);
    if (name === 'pending-and-receipt') {
      await go(page, 'world'); await walk(page, `360x640/${name}/world`);
      for (const actionName of ['resume', 'pack-resume']) assert(await page.locator(`.scene-resume-strip [data-action="${actionName}"]`).isVisible());
      await go(page, 'bag'); await walk(page, `360x640/${name}/bag`);
      await click(page, 'cards-tab', 'decks'); await walk(page, `360x640/${name}/decks`);
      await click(page, 'pack-resume'); await page.locator('.pack-opening[data-phase="complete"]').waitFor();
      await walk(page, `360x640/${name}/receipt`); await close(page);
    } else {
      await go(page, 'arena'); await click(page, 'start'); await walk(page, `360x640/${name}/preparation`);
      await click(page, 'prep-deck'); await walk(page, `360x640/${name}/decks`);
      assert(await action(page, 'return-prep').isVisible(), 'Preparation return stays visible alongside the existing card tabs');
      await click(page, 'return-prep'); await walk(page, `360x640/${name}/returned`); await close(page);
    }
    assert.equal(await readRaw(page), original, `${name}: navigation preserves the receipt and pending encounter byte-for-byte`);
    assert.equal(await page.evaluate(() => window.viewportSmokeWrites.length), writes);
    await shot(page, `${name}-360x640`);
    await page.context().close(); contexts.delete(page.context());
    passed(`360x640: ${name} keeps every module/action reachable with no extra journey write`);
  }
}

await mkdir(output, { recursive: true });
const browser = await engines[browserName].launch({ headless: true, ...(browserName === 'chromium' && existsSync(chrome) ? { executablePath: chrome } : {}) });
let failure = null;
try {
  for (const [width, height] of supplementOnly ? [] : selectedSizes) {
    const tag = `${width}x${height}`, { profile, target, donor } = fixture(), page = await pageFor(profile, width, height);
    const original = await readRaw(page), writes = await page.evaluate(() => window.viewportSmokeWrites.length);
    await walk(page, `${tag}/home`); await shot(page, `home-${tag}`);
    await clickViewportItem(page, action(page, 'experience-settings').first()); await walk(page, `${tag}/settings`); await close(page);
    await clickViewportItem(page, action(page, 'rules').first()); await walk(page, `${tag}/rules`); await close(page);
    await go(page, 'world'); await walk(page, `${tag}/world-shanhai`);
    for (const world of ['westward', 'investiture', 'white-snake']) {
      await click(page, 'world-select', world); await walk(page, `${tag}/world-${world}`);
    }
    await shot(page, `world-${tag}`);
    await clickViewportItem(page, action(page, 'travel').first()); await walk(page, `${tag}/preparation`); await close(page);
    await go(page, 'arena'); await walk(page, `${tag}/arena`);
    await go(page, 'bag'); await walk(page, `${tag}/bag-groups`); await revealViewportItem(page, action(page, 'bag-open-group').first()); await shot(page, `groups-${tag}`);
    assert.equal(await action(page, 'bag-open-group').count(), new Set(profile.instances.map(card => card.cardId)).size);
    await click(page, 'bag-open-group', 'wukong'); await walk(page, `${tag}/bag-expanded`);
    assert.deepEqual(await page.locator('.bag-grid [data-action="instance-inspect"]').evaluateAll(nodes => nodes.map(node => node.dataset.id).sort()), profile.instances.filter(card => card.cardId === 'wukong').map(card => card.uid).sort());
    const passport = page.locator(`.bag-grid [data-action="instance-inspect"][data-id="${target}"]`);
    await clickViewportItem(page, passport); await walk(page, `${tag}/passport`);
    await click(page, 'instance-inherit', target); await walk(page, `${tag}/inheritance-materials`);
    await click(page, 'inherit-pick', donor); await click(page, 'inherit-review'); await walk(page, `${tag}/inheritance-confirm`);
    if (height <= 640 || width === 1440) await shot(page, `inheritance-${tag}`);
    await click(page, 'inherit-back'); await close(page);
    await click(page, 'bag-close-group'); await click(page, 'bag-layout', 'copies'); await walk(page, `${tag}/bag-copies`);
    assert.deepEqual(await page.locator('.bag-grid [data-action="instance-inspect"]').evaluateAll(nodes => nodes.map(node => node.dataset.id).sort()), profile.instances.map(card => card.uid).sort());
    const lastUid = profile.instances.at(-1).uid, anchor = page.locator(`.bag-grid [data-action="instance-inspect"][data-id="${lastUid}"]`);
    await revealViewportItem(page, anchor); await anchor.focus();
    await page.keyboard.press('Enter'); await page.locator('.instance-modal').waitFor({ state: 'attached' });
    await close(page);
    assert(await anchor.isVisible(), `${tag}: closing passport restores its exact page`);
    assert(await anchor.evaluate(node => node === document.activeElement), `${tag}: closing passport restores exact UID focus`);
    const resize = width === 1440 ? { width: 1280, height: 720 } : { width: 390, height: 844 };
    await page.setViewportSize(resize); await viewportFrames(page);
    assert(await anchor.isVisible(), `${tag}: resize keeps focused exact UID on a visible page`);
    assert(await anchor.evaluate(node => node === document.activeElement)); await fit(page, `${tag}/resize-anchor`);
    await page.setViewportSize({ width, height }); await viewportFrames(page);
    await revealViewportItem(page, page.locator('#bag-search')); await page.locator('#bag-search').fill(lastUid); await viewportFrames(page);
    assert.equal(await page.locator('.bag-grid [data-action="instance-inspect"]').count(), 1);
    assert(await page.locator('#bag-search').evaluate(node => node === document.activeElement));
    await page.locator('#bag-search').fill(''); await viewportFrames(page);
    assert.equal(await page.locator('.bag-grid [data-action="instance-inspect"]').count(), profile.instances.length);
    await click(page, 'cards-tab', 'decks'); await walk(page, `${tag}/decks`);
    await click(page, 'cards-tab', 'codex'); await walk(page, `${tag}/codex`); await revealViewportItem(page, page.locator('.collection-item').first()); await shot(page, `codex-${tag}`);
    assert.deepEqual(await page.locator('.collection-item').evaluateAll(nodes => nodes.map(node => node.dataset.cardId).sort()), CARDS.map(card => card.id).sort());
    const missing = profile.inventory.wusong === 0 ? 'wusong' : 'wangxifeng';
    await clickViewportItem(page, page.locator(`.collection-item[data-card-id="${missing}"] [data-action="inspect"]`));
    await walk(page, `${tag}/codex-detail`); await close(page);
    await go(page, 'market'); await walk(page, `${tag}/market`);
    await click(page, 'pack-set', 'wx01'); await walk(page, `${tag}/market-wx01`);
    await click(page, 'wx01-odds'); await walk(page, `${tag}/odds`); await close(page);
    await click(page, 'wx01-redeem'); await walk(page, `${tag}/redemption`);
    await click(page, 'wx01-redeem-tab', 'leader'); await walk(page, `${tag}/redemption-leader`); await close(page);
    await go(page, 'home'); await clickViewportItem(page, action(page, 'quests').first()); await walk(page, `${tag}/daily`);
    await click(page, 'quest-tab', 'weekly'); await walk(page, `${tag}/weekly`); await close(page);
    await clickViewportItem(page, action(page, 'account-open').first()); await page.locator('[data-viewport-surface="account"]').waitFor(); await walk(page, `${tag}/account`);
    assert.equal(await readRaw(page), original, `${tag}: navigation must preserve original profile bytes`);
    assert.equal(await page.evaluate(() => window.viewportSmokeWrites.length), writes, `${tag}: browsing must not write the profile`);
    passed(`${tag}: every destination, module, list page and read-only dialog fits; all identities reachable once; filter/resize focus and original save preserved`);

    await click(page, 'account-back'); await go(page, 'arena'); await click(page, 'start'); await walk(page, `${tag}/practice-prep`);
    await click(page, 'confirm-start'); await page.locator('.player-hand').waitFor({ state: 'attached' });
    for (let round = 0; round < 4; round++) {
      await walk(page, `${tag}/battle-${round + 1}`);
      if (round === 0) {
        await revealViewportItem(page, page.locator('.player-hand [data-action="select"]').first());
        await shot(page, `battle-${tag}`);
      }
      await clickViewportItem(page, page.locator('.player-hand [data-action="select"]:not(:disabled)').first());
      await click(page, 'commit'); await page.locator('.battle-reveal').waitFor(); await walk(page, `${tag}/reveal-${round + 1}`);
      const finished = (await action(page, 'next-round').textContent()).includes('對局結果');
      await click(page, 'next-round');
      if (finished) break;
    }
    await page.locator('.match-score').waitFor({ state: 'attached' }); await walk(page, `${tag}/final-result`);
    if (height <= 640 || width === 1440) await shot(page, `result-${tag}`);
    await click(page, 'end-home'); await page.locator('.game-lobby').waitFor();
    passed(`${tag}: playable preparation, battle controls, each round reveal and complete result remain reachable without scrolling`);
    await go(page, 'market'); await click(page, 'pack-set', 'all');
    const beforePack = JSON.parse(await readRaw(page));
    await clickViewportItem(page, page.locator('[data-action="buy-pack"][data-set="all"]'));
    await page.locator('.pack-reveal').waitFor({ state: 'attached' });
    const granted = await readRaw(page), accepted = JSON.parse(granted);
    const oldUIDs = new Set(beforePack.instances.map(copy => copy.uid));
    const newCopies = accepted.instances.filter(copy => !oldUIDs.has(copy.uid));
    assert.equal(newCopies.length, 3); assert.equal(accepted.coins, beforePack.coins - 300);
    await walk(page, `${tag}/legacy-pack`);
    assert.deepEqual(await page.locator('.pack-result .instance-serial').evaluateAll(nodes => nodes.map(node => node.textContent.trim().replace(/^#/, '')).sort()), newCopies.map(copy => copy.uid).sort());
    await revealViewportItem(page, page.locator('.pack-result').first()); await shot(page, `legacy-pack-${tag}`); await close(page);
    assert.equal(await readRaw(page), granted, 'Paging or closing a legacy pack cannot grant again');
    passed(`${tag}: legacy three-card pack exposes every exact saved UID through real pages with no extra grant`);
    await page.context().close(); contexts.delete(page.context());

    if (height <= 640 || width === 1440) {
      const boxed = buyWX01Box(profile, { packs: 24, rng: () => .23, now }).profile;
      const boxPage = await pageFor(hydrateProfile(boxed, { now }), width, height), before = await readRaw(boxPage);
      await click(boxPage, 'pack-resume'); await boxPage.locator('.box-opening[data-phase="complete"]').waitFor();
      await walk(boxPage, `${tag}/box-24`); await shot(boxPage, `box-${tag}`);
      const seen = pagination.filter(record => record.label === `${tag}/box-24`).flatMap(record => record.receiptUIDs || []);
      assert.deepEqual(seen.sort(), boxed.wx01.receipt.cards.map(card => card.instanceId).sort(), 'All72 exact receipt copies must be visible across real overview pages');
      assert.equal(await readRaw(boxPage), before, 'Viewing72 saved receipt copies must never grant or charge again');
      await close(boxPage); assert.equal(await readRaw(boxPage), before);
      await boxPage.context().close(); contexts.delete(boxPage.context());
      passed(`${tag}: saved24-pack/72-copy receipt uses reachable pages without a second grant`);
    }
  }
  if (selectedSizes.some(([width, height]) => width === 360 && height === 640)) await journeyPressure();
  assert.deepEqual(errors, []);
  assert.equal(layouts.filter(result => result.failed).length, 0, 'Viewport audit recorded layout failures; see layouts in report');
} catch (error) {
  failure = error.stack; process.exitCode = 1;
  for (const context of contexts) {
    const page = context.pages().at(-1);
    if (page && !page.isClosed()) {
      const file = `viewport-${browserName}-failure-${page.viewportSize().width}x${page.viewportSize().height}.png`;
      await page.screenshot({ path: output + file }).catch(() => {}); screenshots.push(file);
    }
  }
}
finally {
  await Promise.allSettled([...contexts].map(context => context.close())); await browser.close();
  const report = { ok: !failure, browser: browserName, audit, supplementOnly, evidence: 'Isolated synthetic profiles, loopback assets and stub account response only.', checks, screenshots, layouts, pagination, errors, ...(failure ? { error: failure } : {}) };
  const suffix = supplementOnly ? '-supplement' : process.env.VIEWPORT_SIZE ? `-${process.env.VIEWPORT_SIZE}` : '';
  await writeFile(`${output}viewport-${browserName}${suffix}.json`, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report, null, 2));
}
