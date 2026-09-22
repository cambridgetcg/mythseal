/** Grouped collection acceptance; isolated synthetic saves and loopback assets only. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createProfile, hydrateProfile, PROFILE_KEY } from '../progression.mjs';
import { mintInstance, setInstanceXP, syncCollection } from '../collection.mjs';
import { CARDS, getCard } from '../engine.mjs';
import { WX01_CARD_IDS } from '../printing-catalogue.mjs';

const browserName = process.env.BROWSER || 'chromium';
if (!['chromium', 'webkit'].includes(browserName)) throw Error('BROWSER must be chromium or webkit.');
const runtime = fileURLToPath(new URL('../test-results/webkit-runtime', import.meta.url));
if (browserName === 'webkit' && !process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(runtime)) process.env.PLAYWRIGHT_BROWSERS_PATH = runtime;
const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = new URL(process.env.GAME_URL || 'http://127.0.0.1:4177');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) throw Error('Collection smoke requires loopback.');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = fileURLToPath(new URL('../test-results/', import.meta.url));
const now = '2026-09-22T12:00:00.000Z';
const contexts = new Set(), checks = [], screenshots = [], errors = [], measurements = [];
const action = (page, name, id) => page.locator(`[data-action="${name}"]${id === undefined ? '' : `[data-id="${id}"]`}`);
const tab = (page, id) => action(page, 'cards-tab', id).click();
const passed = label => { checks.push(label); console.log(`PASS ${label}`); };
const raw = page => page.evaluate(key => localStorage.getItem(key), PROFILE_KEY);
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const idsIn = locator => locator.evaluateAll(nodes => nodes.map(node => node.dataset.id).sort());
const group = (page, id) => page.locator(`.bag-character-group[data-card-id="${id}"]`);

function fixture() {
  let profile = createProfile({ now });
  const ids = { originalQing: profile.instances.find(card => card.cardId === 'qingxiao').uid };
  function add(name, cardId, printId, xp = 0) {
    const minted = mintInstance(profile, cardId, { printId, now, source: 'collection-display-fixture' });
    ids[name] = minted.instance.uid; profile = setInstanceXP(minted.profile, minted.instance.uid, xp);
  }
  add('base', 'wukong', 'wx01-005-base', 40);
  add('base2', 'wukong', 'wx01-005-base');
  add('aa', 'wukong', 'wx01-005-aa1', 90);
  add('aa2', 'wukong', 'wx01-005-aa1', 220);
  add('leader', 'wukong', 'wx01-005-laa1');
  add('ink', 'wukong', 'wx01-005-ink1');
  add('treasure', 'wukong', 'wx01-005-tr1', 260);
  add('duplicateQing', 'qingxiao', 'legacy/qingxiao', 260);
  profile.instances.find(card => card.uid === ids.base2).locked = true;
  // Canonical backup may contain a vault-only character; this is display history, not owned stock.
  add('vaultOnly', 'tangsanzang', 'wx01-001-base');
  const vault = profile.instances.find(card => card.uid === ids.vaultOnly);
  profile.instances = profile.instances.filter(card => card.uid !== ids.vaultOnly);
  profile.merchantVault.push({ instance: vault, sellPrice: 40, buybackPrice: 50, soldAt: now });
  return { profile: hydrateProfile(syncCollection(profile), { now }), ids };
}

async function pageFor(profile, width) {
  const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 1000 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  contexts.add(context);
  await context.addInitScript(({ profile, key, now }) => {
    const NativeDate = Date, fixed = new NativeDate(now).getTime();
    globalThis.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } };
    if (!localStorage.getItem('collection-display.seeded')) {
      localStorage.setItem(key, JSON.stringify(profile)); localStorage.setItem('collection-display.seeded', 'yes');
    }
    window.collectionDisplayWrites = [];
    const native = Storage.prototype.setItem;
    Storage.prototype.setItem = function(name, value) {
      native.call(this, name, value);
      if (this === localStorage && name === key) window.collectionDisplayWrites.push(value);
    };
  }, { profile, key: PROFILE_KEY, now });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== base.origin || url.pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method())) {
      errors.push(`Unexpected network ${request.method()} ${url.origin}${url.pathname}`); return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  const page = await context.newPage(); page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${new URL(response.url()).pathname}`); });
  await page.goto(base.href); await page.locator('.game-lobby').waitFor();
  assert.equal(await raw(page), JSON.stringify(profile), 'Boot must retain original canonical save bytes');
  return page;
}
async function noWrite(page, profile, startWrites) {
  assert.equal(await raw(page), JSON.stringify(profile));
  assert.equal(await page.evaluate(() => window.collectionDisplayWrites.length), startWrites, 'Display operations must not write the profile');
}
async function shot(page, name) {
  const bounds = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth,
    modals: [...document.querySelectorAll('.modal')].map(node => [node.clientWidth, node.scrollWidth]) }));
  assert(bounds.width <= bounds.viewport + 1 && bounds.modals.every(([width, scroll]) => scroll <= width + 1), `${name}: ${JSON.stringify(bounds)}`);
  await page.evaluate(async () => {
    await document.fonts.ready;
    const urls = new Set([...document.querySelectorAll('.card-art')].flatMap(node => [...getComputedStyle(node).backgroundImage.matchAll(/url\(["']?(https?:[^"')]+)["']?\)/g)].map(match => match[1])));
    await Promise.all([...urls].map(url => { const image = new Image(); image.src = url; return image.decode(); }));
  });
  await frames(page);
  const file = `collection-display-${browserName}-${name}.png`;
  await page.screenshot({ path: output + file, fullPage: false }); screenshots.push(file);
}
async function hasGrayscale(locator) {
  return locator.evaluate(node => {
    for (let current = node; current; current = current.parentElement) {
      if (/grayscale\((?:1|100%)\)/.test(getComputedStyle(current).filter)) return true;
    }
    return false;
  });
}
async function expectFocusScroll(page, locator, scroll) {
  await frames(page);
  assert(await locator.evaluate(node => node === document.activeElement), 'Return must restore the exact triggering control');
  assert(Math.abs(await page.evaluate(() => scrollY) - scroll) <= 2, 'Return must preserve page scroll');
}

await mkdir(output, { recursive: true });
const browser = await engines[browserName].launch({ headless: true, ...(browserName === 'chromium' && existsSync(chrome) ? { executablePath: chrome } : {}) });
let failure = null;
try {
  for (const width of [360, 390, 1440]) {
    const { profile, ids } = fixture(), page = await pageFor(profile, width);
    const startWrites = await page.evaluate(() => window.collectionDisplayWrites.length);
    const ownedIds = [...new Set(profile.instances.map(card => card.cardId))].sort();
    const wukong = profile.instances.filter(card => card.cardId === 'wukong');
    await page.locator('.game-dock [data-action="bag"]').click();
    assert.equal(await action(page, 'bag-layout', 'groups').getAttribute('aria-pressed'), 'true');
    assert.deepEqual(await idsIn(action(page, 'bag-open-group')), ownedIds);
    assert.equal(await action(page, 'instance-inspect').count(), 0, 'Group cover cannot silently choose an owned UID');
    assert.equal(await group(page, 'wukong').getAttribute('data-owned-count'), '8');
    assert.equal(await group(page, 'wukong').getAttribute('data-matching-count'), '8');
    for (const printId of new Set(wukong.map(card => card.printId))) {
      assert.equal(await group(page, 'wukong').locator(`[data-print-id="${printId}"][data-print-count]`).getAttribute('data-print-count'), String(wukong.filter(card => card.printId === printId).length));
    }
    await shot(page, `groups-${width}`);
    const open = action(page, 'bag-open-group', 'wukong');
    await group(page, 'wukong').evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await open.focus(); const groupScroll = await page.evaluate(() => scrollY);
    if (width !== 390) await shot(page, `wukong-group-${width}`);
    await page.keyboard.press('Enter');
    assert.deepEqual(await idsIn(page.locator('.bag-grid [data-action="instance-inspect"]')), wukong.map(card => card.uid).sort());
    const printIds = [...new Set(wukong.map(card => card.printId))];
    assert.deepEqual(await idsIn(action(page, 'bag-print-filter')), ['all', ...printIds].sort());
    if (width !== 390) await shot(page, `all-prints-${width}`);
    await action(page, 'bag-print-filter', 'wx01-005-aa1').click();
    assert.deepEqual(await idsIn(page.locator('.bag-grid [data-action="instance-inspect"]')), [ids.aa, ids.aa2].sort());
    await page.locator('.bag-print-tabs').evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await shot(page, `aa-copies-${width}`);
    const exact = page.locator(`.bag-grid [data-action="instance-inspect"][data-id="${ids.aa}"]`);
    await exact.scrollIntoViewIfNeeded(); await exact.focus(); const copyScroll = await page.evaluate(() => scrollY);
    await page.keyboard.press('Enter'); await page.locator('.bag-passport').waitFor();
    assert.equal(await page.locator('.bag-passport-id dd').innerText(), ids.aa);
    assert.equal(await page.locator('.bag-passport-art .card').getAttribute('data-print-id'), 'wx01-005-aa1');
    await page.keyboard.press('Escape'); await expectFocusScroll(page, exact, copyScroll);
    await exact.click(); await action(page, 'instance-inherit', ids.aa).click();
    assert.equal(await page.locator('.inheritance-target').getAttribute('data-target-uid'), ids.aa);
    assert.equal(await page.locator('.inheritance-target').getAttribute('data-print-id'), 'wx01-005-aa1');
    assert(await action(page, 'inherit-pick', ids.base).isEnabled());
    assert(await action(page, 'inherit-pick', ids.aa2).isDisabled());
    await page.keyboard.press('Escape');
    await action(page, 'bag-close-group').click(); await expectFocusScroll(page, action(page, 'bag-open-group', 'wukong'), groupScroll);
    await noWrite(page, profile, startWrites);
    passed(`${width}px groups retain all8 Wukong copies/6 printings; AA filter, exact passport/inheritance and return focus/scroll preserve the save`);

    await page.locator('#bag-search').fill(ids.treasure);
    assert.deepEqual(await idsIn(action(page, 'bag-open-group')), ['wukong']);
    assert.equal(await group(page, 'wukong').getAttribute('data-owned-count'), '8');
    assert.equal(await group(page, 'wukong').getAttribute('data-matching-count'), '1');
    await action(page, 'bag-open-group', 'wukong').click();
    assert.deepEqual(await idsIn(page.locator('.bag-grid [data-action="instance-inspect"]')), [ids.treasure]);
    await page.locator('#bag-search').fill(''); await action(page, 'bag-print-filter', 'all').click();
    assert.equal(await page.locator('.bag-item').count(), 8);
    await page.locator('#bag-filter').selectOption('locked');
    assert.deepEqual(await idsIn(page.locator('.bag-grid [data-action="instance-inspect"]')), [ids.base2]);
    if (width === 360) {
      await page.locator('.bag-print-tabs').evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await shot(page, 'locked-filter-360');
    }
    await page.locator('#bag-filter').selectOption('all'); await action(page, 'bag-close-group').click();
    await action(page, 'bag-layout', 'copies').click();
    assert.equal(await page.locator('.bag-item').count(), profile.instances.length);
    await page.locator('#bag-search').fill(ids.treasure);
    assert.deepEqual(await idsIn(page.locator('.bag-grid [data-action="instance-inspect"]')), [ids.treasure]);
    await page.locator('#bag-search').fill(''); await tab(page, 'decks');
    assert.equal(await action(page, 'bag-layout').count(), 0, 'Deck editor remains exact-copy only');
    assert.equal(await page.locator('.bag-grid [data-action="bag-pick-instance"]').count(), profile.instances.length);
    await page.locator(`.bag-grid [data-action="bag-pick-instance"][data-id="${ids.duplicateQing}"]`).click();
    assert.equal(await page.locator(`.bag-draft-tray [data-id="${ids.duplicateQing}"]`).count(), 1);
    assert.equal(await page.locator(`.bag-draft-tray [data-id="${ids.originalQing}"]`).count(), 0);
    assert.equal(await page.locator('.bag-draft-card').count(), 8);
    await noWrite(page, profile, startWrites);
    passed(`${width}px UID search and locked filter identify exact copies; flat view and unsaved same-role deck replacement retain all ownership bytes`);

    await tab(page, 'codex');
    const collected = new Set([...ownedIds, ...profile.merchantVault.map(entry => entry.instance.cardId)]);
    assert.equal(await page.locator('.collection-item').count(), CARDS.length);
    assert.equal(await page.locator('.collection-item[data-collected="true"]').count(), collected.size);
    assert.equal(await page.locator('.codex-progress').getAttribute('aria-valuenow'), String(collected.size));
    assert.equal(await page.locator('.codex-progress').getAttribute('aria-valuemax'), String(CARDS.length));
    const numbers = await page.locator('.collection-item').evaluateAll(nodes => Object.fromEntries(nodes.map(node => [node.dataset.cardId, node.querySelector('.codex-number').textContent])));
    for (const [index, card] of CARDS.entries()) assert.equal(numbers[card.id].trim(), `NO.${String(index + 1).padStart(3, '0')}`);
    const vaultRow = page.locator('.collection-item[data-card-id="tangsanzang"]');
    assert.equal(await vaultRow.getAttribute('data-collected'), 'true');
    assert.equal(await vaultRow.locator('[data-action="bag-card"]').count(), 0);
    const missing = page.locator('.collection-item[data-card-id="baigu"]');
    assert.equal(await missing.getAttribute('data-collected'), 'false');
    assert.match(await missing.locator('.codex-state').innerText(), /未入藏/);
    assert(await hasGrayscale(missing.locator('.card-art')));
    const owned = page.locator('.collection-item[data-card-id="wukong"] .card-art');
    assert.equal(await hasGrayscale(owned), false);
    const inspect = missing.locator('[data-action="inspect"]');
    await inspect.hover(); assert(await hasGrayscale(missing.locator('.card-art')), 'Hover must not reveal missing art in colour');
    await inspect.focus(); assert(await hasGrayscale(missing.locator('.card-art')), 'Keyboard focus must not reveal missing art in colour');
    const codexScroll = await page.evaluate(() => scrollY);
    await page.keyboard.press('Enter'); await page.locator('.codex-detail.is-uncollected').waitFor();
    assert(await hasGrayscale(page.locator('.codex-detail .card-art')));
    assert.match(await page.locator('.detail-lore').innerText(), /\S/);
    await shot(page, `missing-detail-${width}`); await page.keyboard.press('Escape'); await expectFocusScroll(page, inspect, codexScroll);
    await action(page, 'codex-status', 'missing').click();
    assert.equal(await page.locator('.collection-item').count(), CARDS.length - collected.size);
    assert.equal(await page.locator('.collection-item[data-collected="true"]').count(), 0);
    await page.locator('.collection-grid').evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await shot(page, `missing-codex-${width}`);
    await action(page, 'collection-set', 'wx01').click();
    assert.equal(await page.locator('.collection-item').count(), WX01_CARD_IDS.filter(id => !collected.has(id)).length);
    await page.locator('#source-filter').selectOption('西遊記'); await action(page, 'filter', getCard('baigu').faction).click();
    const expected = CARDS.filter(card => WX01_CARD_IDS.includes(card.id) && !collected.has(card.id) && card.source === '西遊記' && card.faction === getCard('baigu').faction);
    assert.deepEqual(await page.locator('.collection-item').evaluateAll(nodes => nodes.map(node => node.dataset.cardId).sort()), expected.map(card => card.id).sort());
    for (const card of expected) assert.equal(await page.locator(`.collection-item[data-card-id="${card.id}"] .codex-number`).innerText(), numbers[card.id]);
    await action(page, 'filter', 'all').click(); await action(page, 'collection-set', 'all').click();
    await action(page, 'codex-status', 'collected').click(); assert.equal(await page.locator('.collection-item').count(), collected.size);
    await action(page, 'codex-status', 'all').click(); await action(page, 'bag-card', 'wukong').click();
    assert.equal(await action(page, 'bag-close-group').count(), 1);
    assert.deepEqual(await idsIn(page.locator('.bag-grid [data-action="instance-inspect"]')), wukong.map(card => card.uid).sort());
    await noWrite(page, profile, startWrites);
    measurements.push({ width, ownedCopies: profile.instances.length, ownedCharacters: ownedIds.length, collectedCharacters: collected.size, catalogue: CARDS.length, wukongCopies: wukong.length, wukongPrints: printIds.length });
    await page.reload(); await page.locator('.game-lobby').waitFor(); assert.equal(await raw(page), JSON.stringify(profile));
    passed(`${width}px stable catalogue numbering/progress includes vault history; missing art stays grayscale through hover/focus/detail; combined filters and codex-to-group browse write nothing`);
    if (width === 390) {
      await page.locator('.game-dock [data-action="bag"]').click(); await tab(page, 'codex');
      await page.locator('.collection-item[data-card-id="baigu"] [data-action="inspect"]').click();
      await page.locator('.codex-detail.is-uncollected').waitFor();
      const writer = await page.context().newPage();
      writer.on('pageerror', error => errors.push(error.message));
      await writer.goto(base.href); await writer.locator('.game-lobby').waitFor();
      const observerWrites = await page.evaluate(() => window.collectionDisplayWrites.length);
      const writerWrites = await writer.evaluate(() => window.collectionDisplayWrites.length);
      const granted = await writer.evaluate(async now => {
        const { createProfileStore, PROFILE_LOCK } = await import('./profile-store.mjs');
        const { mintInstance } = await import('./collection.mjs');
        const store = createProfileStore({ storage: localStorage, now: () => now });
        return navigator.locks.request(PROFILE_LOCK, () => {
          const next = mintInstance(store.load(), 'baigu', { printId: 'wx01-009-base', source: 'synthetic-acquisition', now });
          store.save(next.profile); return next.profile;
        });
      }, now);
      await page.locator('.codex-detail:not(.is-uncollected)').waitFor(); await frames(page);
      assert.equal(await hasGrayscale(page.locator('.codex-detail .card-art')), false);
      assert.equal(await page.locator('.codex-progress').getAttribute('aria-valuenow'), String(collected.size + 1));
      assert.equal(await raw(page), JSON.stringify(granted));
      assert.equal(await page.evaluate(() => window.collectionDisplayWrites.length), observerWrites);
      assert.equal(await writer.evaluate(() => window.collectionDisplayWrites.length), writerWrites + 1);
      await shot(page, 'acquired-detail-390'); await page.keyboard.press('Escape');
      assert.equal(await page.locator('.collection-item[data-card-id="baigu"]').getAttribute('data-collected'), 'true');
      assert.equal(await hasGrayscale(page.locator('.collection-item[data-card-id="baigu"] .card-art')), false);
      passed('A synthetic second-tab acquisition lights up the already-open missing detail and increments codex progress; one writer transaction, zero observer writes');
    }
    await page.context().close(); contexts.delete(page.context());
  }
  assert.deepEqual(errors, []);
} catch (error) { failure = error.stack; process.exitCode = 1; }
finally {
  await Promise.allSettled([...contexts].map(context => context.close())); await browser.close();
  const report = { ok: !failure, browser: browserName, evidence: 'Isolated synthetic profiles and loopback assets; no real user/account data.', checks, screenshots, measurements, browserErrors: errors, ...(failure ? { error: failure } : {}) };
  await writeFile(`${output}collection-display-${browserName}.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
