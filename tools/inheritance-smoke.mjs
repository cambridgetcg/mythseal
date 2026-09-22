/** Local inheritance acceptance with synthetic saves and real native browser locks. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createProfile, PROFILE_KEY, beginBattle, sellInstance, setLeaderInstance } from '../progression.mjs';
import { mintInstance, setInstanceXP, getPreferredInstance, saveInstanceDeck, activateDeck, syncCollection } from '../collection.mjs';
import { PROFILE_LOCK } from '../profile-store.mjs';

const browserName = process.env.BROWSER || 'chromium';
if (!['chromium', 'webkit'].includes(browserName)) throw Error('BROWSER must be chromium or webkit.');
const runtime = fileURLToPath(new URL('../test-results/webkit-runtime', import.meta.url));
if (browserName === 'webkit' && !process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(runtime)) process.env.PLAYWRIGHT_BROWSERS_PATH = runtime;
const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = new URL(process.env.GAME_URL || 'http://127.0.0.1:4177');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) throw Error('Inheritance smoke requires loopback.');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = fileURLToPath(new URL('../test-results/', import.meta.url));
const now = '2026-09-22T12:00:00.000Z';
const contexts = new Set(), checks = [], screenshots = [], errors = [];
const action = (page, name, id) => page.locator(`[data-action="${name}"]${id === undefined ? '' : `[data-id="${id}"]`}`);
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROFILE_KEY);
const writes = page => page.evaluate(() => window.inheritanceSmokeWrites.length);
const passed = label => { checks.push(label); console.log(`PASS ${label}`); };
const copy = value => structuredClone(value);

function fixture({ treatment = 'aa1', targetXP = 90, protectedRows = false } = {}) {
  let profile = createProfile({ now });
  const ids = {};
  function add(name, printId, xp = 0, cardId = 'wukong') {
    const minted = mintInstance(profile, cardId, { printId, now, source: 'inheritance-fixture' });
    profile = setInstanceXP(minted.profile, minted.instance.uid, xp); ids[name] = minted.instance.uid;
  }
  add('target', `wx01-005-${treatment}`, targetXP);
  Object.assign(profile.instances.find(card => card.uid === ids.target), { locked: true, battles: 7, wins: 4 });
  add('legacyDonor', 'legacy/wukong', 40); add('wxDonor', 'wx01-005-base', 20);
  add('otherRole', 'wx01-001-base', 100, 'tangsanzang');
  if (protectedRows) {
    add('locked', 'wx01-005-base'); profile.instances.find(card => card.uid === ids.locked).locked = true;
    add('deck', 'legacy/wukong'); add('pending', 'wx01-005-base'); add('receipt', 'wx01-005-base');
    add('aa', 'wx01-005-aa1'); add('ink', 'wx01-005-ink1'); add('treasure', 'wx01-005-tr1'); add('leader', 'wx01-005-laa1');
    profile = setLeaderInstance(profile, ids.leader);
    add('vault', 'wx01-005-base', 120); profile = sellInstance(profile, ids.vault, now);
    const companions = ['kongzi', 'qingxiao', 'guanyu', 'lindaiyu', 'shuangli', 'cangjiao', 'cuixian'].map(id => getPreferredInstance(profile, id).uid);
    profile = saveInstanceDeck(profile, { slotId: 'deck-2', name: '保留的牌組', instanceIds: [ids.pending, ...companions] });
    profile = activateDeck(profile, 'deck-2'); profile = beginBattle(profile, { kind: 'arena', now }).profile;
    profile = saveInstanceDeck(profile, { slotId: 'deck-2', name: '保留的牌組', instanceIds: [ids.deck, ...companions] });
    add('receiptTang', 'wx01-001-base', 0, 'tangsanzang'); add('receiptBaigu', 'wx01-009-base', 0, 'baigu');
    const cards = [ids.receipt, ids.receiptTang, ids.receiptBaigu].map(uid => {
      const card = profile.instances.find(item => item.uid === uid);
      return { cardId: card.cardId, printId: card.printId, instanceId: uid, rarity: card.cardId === 'wukong' ? 'epic' : card.cardId === 'baigu' ? 'rare' : 'common' };
    });
    profile.wx01 = { ...profile.wx01, opened: 1, seals: 1, serial: 1, receipt: { id: 'wx01-1', kind: 'pack', mode: 'ordinary', cards, openedAt: now, cost: 300, sealsEarned: 1 } };
  }
  return { profile: syncCollection(profile), ids };
}
function expectedInheritance(profile, targetUid, donorUids) {
  const next = copy(profile), target = next.instances.find(card => card.uid === targetUid);
  target.xp = Math.min(700, target.xp + donorUids.reduce((sum, uid) => sum + 80 + profile.instances.find(card => card.uid === uid).xp, 0));
  target.level = target.xp >= 700 ? 5 : target.xp >= 400 ? 4 : target.xp >= 200 ? 3 : target.xp >= 80 ? 2 : 1;
  next.instances = next.instances.filter(card => !donorUids.includes(card.uid));
  return syncCollection(next);
}
async function contextFor(seed, { width = 390 } = {}) {
  const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 1000 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  contexts.add(context);
  await context.addInitScript(({ seed, key, now }) => {
    const NativeDate = Date, fixed = new NativeDate(now).getTime();
    globalThis.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } };
    if (!localStorage.getItem('inheritance-smoke.seeded')) { localStorage.setItem(key, JSON.stringify(seed)); localStorage.setItem('inheritance-smoke.seeded', 'yes'); }
    const nativeSet = Storage.prototype.setItem;
    window.inheritanceSmokeWrites = [];
    Storage.prototype.setItem = function(name, value) {
      if (this === localStorage && name === key && sessionStorage.getItem('inheritance-smoke.quota') === 'yes') throw new DOMException('Synthetic inheritance quota', 'QuotaExceededError');
      nativeSet.call(this, name, value);
      if (this === localStorage && name === key) window.inheritanceSmokeWrites.push(JSON.parse(value));
    };
  }, { seed, key: PROFILE_KEY, now });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== base.origin || url.pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method())) {
      errors.push(`Unexpected network ${request.method()} ${url.origin}${url.pathname}`); return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  return context;
}
async function pageIn(context) {
  const page = await context.newPage(); page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${new URL(response.url()).pathname}`); });
  await page.goto(base.href); await page.locator('.game-lobby').waitFor(); return page;
}
async function release(page) { const context = page.context(); await context.close(); contexts.delete(context); }
async function passport(page, uid) {
  await page.locator('.game-dock [data-action="bag"]').click();
  await page.locator(`.bag-grid [data-action="instance-inspect"][data-id="${uid}"]`).click();
  await page.locator('.bag-passport').waitFor();
}
async function openInheritance(page, uid) { await passport(page, uid); await action(page, 'instance-inherit', uid).click(); await action(page, 'inherit-review').waitFor(); }
async function pickAndReview(page, ids) { for (const uid of ids) await action(page, 'inherit-pick', uid).click(); await action(page, 'inherit-review').click(); await action(page, 'inherit-confirm').waitFor(); }
async function close(page) { await page.locator('.modal-close').click(); await page.locator('.modal').waitFor({ state: 'hidden' }); }
async function shot(page, name) {
  const bounds = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, modals: [...document.querySelectorAll('.modal')].map(node => [node.clientWidth, node.scrollWidth]) }));
  assert(bounds.scroll <= bounds.width + 1 && bounds.modals.every(([width, scroll]) => scroll <= width + 1), `${name}: ${JSON.stringify(bounds)}`);
  await page.evaluate(async () => {
    await document.fonts.ready;
    const urls = new Set([...document.querySelectorAll('.modal *')].flatMap(node => [...getComputedStyle(node).backgroundImage.matchAll(/url\(["']?(https?:[^"')]+)["']?\)/g)].map(match => match[1])));
    await Promise.all([...urls].map(url => { const image = new Image(); image.src = url; return image.decode(); }));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  const filename = `inheritance-${browserName}-${name}.png`;
  await page.screenshot({ path: output + filename, fullPage: false }); screenshots.push(filename);
}
async function keyboardTrap(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const focusables = page.locator('.modal button:not(:disabled)').filter({ visible: true });
  await focusables.first().focus(); await page.keyboard.press('Shift+Tab'); assert(await focusables.last().evaluate(node => node === document.activeElement));
  await page.keyboard.press('Tab'); assert(await focusables.first().evaluate(node => node === document.activeElement));
}
async function topmost(locator) {
  await locator.scrollIntoViewIfNeeded();
  assert(await locator.evaluate(node => { const box = node.getBoundingClientRect(), hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2); return box.height >= 44 && box.top >= 0 && box.bottom <= innerHeight + 1 && (hit === node || node.contains(hit)); }), 'Expected reachable 44px topmost button');
}
async function holdLock(page) {
  await page.evaluate(name => { window.inheritanceSmokeHeld = false; window.inheritanceSmokeLock = navigator.locks.request(name, () => new Promise(resolve => { window.releaseInheritanceSmoke = resolve; window.inheritanceSmokeHeld = true; })); }, PROFILE_LOCK);
  await page.waitForFunction(() => window.inheritanceSmokeHeld);
}
const releaseLock = page => page.evaluate(async () => { window.releaseInheritanceSmoke(); await window.inheritanceSmokeLock; });

await mkdir(output, { recursive: true });
const browser = await engines[browserName].launch({ headless: true, ...(browserName === 'chromium' && existsSync(chrome) ? { executablePath: chrome } : {}) });
try {
  for (const width of [360, 390, 1440]) {
    const { profile, ids } = fixture(), page = await pageIn(await contextFor(profile, { width }));
    const startWrites = await writes(page), donors = [ids.legacyDonor, ids.wxDonor];
    await openInheritance(page, ids.target);
    assert(await action(page, 'inherit-review').isDisabled());
    assert.equal(await page.locator('[data-action="inherit-pick"][aria-pressed="true"]').count(), 0);
    await keyboardTrap(page);
    await action(page, 'inherit-pick', ids.legacyDonor).focus(); await page.keyboard.press('Space');
    assert.equal(await action(page, 'inherit-pick', ids.legacyDonor).getAttribute('aria-pressed'), 'true');
    assert(await action(page, 'inherit-pick', ids.legacyDonor).evaluate(node => node === document.activeElement));
    await action(page, 'inherit-pick', ids.wxDonor).click();
    assert.match(await page.locator('[data-inheritance-gained]').innerText(), /220/);
    await topmost(action(page, 'inherit-review')); await shot(page, `selection-${width}`);
    await action(page, 'inherit-review').click(); await page.locator('.inheritance-confirm').waitFor();
    assert.match(await page.locator('.inheritance-confirm').innerText(), /永久|不可|不能|消耗/);
    for (const uid of [ids.target, ...donors]) assert((await page.locator('.inheritance-confirm').innerText()).includes(uid));
    await keyboardTrap(page); await topmost(action(page, 'inherit-confirm')); await shot(page, `confirm-${width}`);
    assert.deepEqual(await read(page), profile); assert.equal(await writes(page), startWrites);
    await action(page, 'inherit-back').click(); await page.locator('.inheritance-panel').waitFor();
    await page.keyboard.press('Escape'); await page.locator('.modal').waitFor({ state: 'hidden' });
    assert.deepEqual(await read(page), profile); assert.equal(await writes(page), startWrites);
    await openInheritance(page, ids.target); await pickAndReview(page, donors);
    await action(page, 'inherit-confirm').evaluate(button => { button.click(); button.click(); });
    await page.locator('.inheritance-result').waitFor();
    const expected = expectedInheritance(profile, ids.target, donors);
    assert.deepEqual(await read(page), expected); assert.equal(await writes(page), startWrites + 1);
    assert.equal(await page.locator(`.inheritance-result [data-print-id="wx01-005-aa1"]`).count() > 0, true);
    await topmost(action(page, 'inherit-done')); await shot(page, `result-${width}`);
    await action(page, 'inherit-done').click(); await page.locator('.bag-passport').waitFor();
    assert((await page.locator('.bag-passport').innerText()).includes(ids.target));
    await page.reload(); await page.locator('.game-lobby').waitFor(); assert.deepEqual(await read(page), expected);
    await release(page);
    passed(`${width}px AA inheritance: keyboard selection, preview/back/Escape write nothing; double confirm consumes exact two base copies once, gains220XP and preserves print/history through reload`);
  }

  {
    const { profile, ids } = fixture({ treatment: 'tr1', targetXP: 650 }), page = await pageIn(await contextFor(profile));
    await openInheritance(page, ids.target); await action(page, 'inherit-pick', ids.legacyDonor).click();
    assert.match(await page.locator('[data-inheritance-gained]').innerText(), /50/);
    assert.match(await page.locator('[data-inheritance-overflow]').innerText(), /70/);
    await action(page, 'inherit-review').click(); await page.locator('.inheritance-confirm').waitFor();
    assert.match(await page.locator('.inheritance-confirm [data-inheritance-overflow]').innerText(), /70/);
    await action(page, 'inherit-confirm').click(); await page.locator('.inheritance-result').waitFor();
    assert.deepEqual(await read(page), expectedInheritance(profile, ids.target, [ids.legacyDonor]));
    await shot(page, 'treasure-cap-390'); await action(page, 'inherit-done').click();
    assert(await action(page, 'instance-inherit', ids.target).isDisabled());
    await release(page); passed('TR target caps at700/Lv5 with50 applied and70 overflow explicitly previewed; exact treasure printing survives and further inheritance is disabled');
  }

  {
    const { profile, ids } = fixture({ protectedRows: true }), page = await pageIn(await contextFor(profile, { width: 360 }));
    const startWrites = await writes(page); await openInheritance(page, ids.target);
    for (const name of ['locked', 'deck', 'pending', 'receipt', 'aa', 'ink', 'treasure', 'leader']) {
      const row = page.locator(`.inheritance-material[data-uid="${ids[name]}"]`);
      assert.equal(await row.getAttribute('data-eligible'), 'false', name);
      assert(await action(page, 'inherit-pick', ids[name]).isDisabled(), name);
      assert((await row.innerText()).includes(ids[name]), `${name} must retain visible exact UID`);
      await action(page, 'inherit-pick', ids[name]).evaluate(button => button.click());
    }
    for (const name of ['vault', 'otherRole', 'target']) assert.equal(await action(page, 'inherit-pick', ids[name]).count(), 0, `${name} is not a material`);
    assert.equal(await page.locator('[data-action="inherit-pick"][aria-pressed="true"]').count(), 0);
    assert(await action(page, 'inherit-review').isDisabled()); assert.deepEqual(await read(page), profile); assert.equal(await writes(page), startWrites);
    await shot(page, 'protected-360');
    await page.locator('.modal').evaluate(node => { node.scrollTop = node.scrollHeight; });
    await shot(page, 'protected-bottom-360'); await close(page);
    for (const name of ['pending', 'receipt']) { await passport(page, ids[name]); assert(await action(page, 'instance-inherit', ids[name]).isDisabled()); await close(page); }
    await release(page); passed('Locked, saved-deck, pending, receipt and special-print donors are visible but disabled; vault/different-role copies excluded; pending/receipt targets also disabled');
  }

  {
    const { profile, ids } = fixture(), context = await contextFor(profile), first = await pageIn(context), second = await pageIn(context);
    await openInheritance(first, ids.target); await pickAndReview(first, [ids.legacyDonor]);
    await passport(second, ids.legacyDonor); await second.locator(`.modal [data-action="instance-lock"][data-id="${ids.legacyDonor}"]`).click();
    await first.locator('.inheritance-notice').waitFor(); await first.locator('.inheritance-panel').waitFor();
    assert.equal(await action(first, 'inherit-confirm').count(), 0); assert(await action(first, 'inherit-review').isDisabled());
    assert(await action(first, 'inherit-pick', ids.legacyDonor).isDisabled());
    const protectedSave = await read(first); assert.equal(protectedSave.instances.find(card => card.uid === ids.target).xp, 90);
    assert(protectedSave.instances.find(card => card.uid === ids.legacyDonor));
    await release(first); passed('Another tab locking a selected donor invalidates the frozen confirmation, clears selection and preserves every copy');
  }

  {
    const { profile, ids } = fixture(), context = await contextFor(profile), first = await pageIn(context), second = await pageIn(context), donors = [ids.legacyDonor, ids.wxDonor];
    for (const page of [first, second]) { await openInheritance(page, ids.target); await pickAndReview(page, donors); }
    const beforeWrites = await writes(first) + await writes(second);
    await holdLock(second);
    await Promise.all([first, second].map(page => action(page, 'inherit-confirm').evaluate(button => button.click())));
    assert.deepEqual(await read(first), profile);
    await releaseLock(second);
    await first.waitForFunction(({ key, uid }) => JSON.parse(localStorage.getItem(key)).instances.find(card => card.uid === uid).xp === 310, { key: PROFILE_KEY, uid: ids.target });
    await first.waitForFunction(async name => { const state = await navigator.locks.query(); return ![...state.held, ...state.pending].some(lock => lock.name === name); }, PROFILE_LOCK);
    const expected = expectedInheritance(profile, ids.target, donors);
    assert.deepEqual(await read(first), expected); assert.deepEqual(await read(second), expected);
    assert.equal(await writes(first) + await writes(second), beforeWrites + 1);
    assert.equal(await first.locator('.inheritance-result').count() + await second.locator('.inheritance-result').count(), 1);
    await release(first); passed('Two tabs confirming the same donors behind a native lock commit exactly one inheritance and one profile write');
  }

  {
    const { profile, ids } = fixture(), page = await pageIn(await contextFor(profile));
    const startWrites = await writes(page); await openInheritance(page, ids.target); await pickAndReview(page, [ids.legacyDonor]);
    await page.evaluate(() => sessionStorage.setItem('inheritance-smoke.quota', 'yes'));
    await action(page, 'inherit-confirm').click(); await page.locator('.toast').filter({ hasText: 'Synthetic inheritance quota' }).waitFor();
    assert.deepEqual(await read(page), profile); assert.equal(await writes(page), startWrites); assert.equal(await page.locator('.inheritance-result').count(), 0);
    assert(await action(page, 'inherit-confirm').isEnabled());
    await page.evaluate(() => sessionStorage.removeItem('inheritance-smoke.quota'));
    await action(page, 'inherit-confirm').click(); await page.locator('.inheritance-result').waitFor();
    const expected = expectedInheritance(profile, ids.target, [ids.legacyDonor]);
    assert.deepEqual(await read(page), expected); assert.equal(await writes(page), startWrites + 1);
    await page.reload(); await page.locator('.game-lobby').waitFor(); assert.deepEqual(await read(page), expected);
    await release(page); passed('Quota refusal keeps target and donor unchanged with confirmation retryable; retry/reload commits once');
  }

  {
    const { profile, ids } = fixture(), context = await contextFor(profile), page = await pageIn(context), holder = await pageIn(context);
    await openInheritance(page, ids.target); await pickAndReview(page, [ids.legacyDonor]);
    const beforeWrites = await writes(page) + await writes(holder);
    await holdLock(holder); await action(page, 'inherit-confirm').click(); await page.locator('.modal-close').click();
    await page.locator('.modal').waitFor({ state: 'hidden' }); await releaseLock(holder);
    await page.locator('.toast').filter({ hasText: '傳承已取消' }).waitFor();
    assert.deepEqual(await read(page), profile); assert.equal(await writes(page) + await writes(holder), beforeWrites);
    await openInheritance(page, ids.target); await pickAndReview(page, [ids.legacyDonor]);
    await page.evaluate(() => Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined }));
    await action(page, 'inherit-confirm').click(); await page.locator('.toast').filter({ hasText: '安全儲存' }).waitFor();
    assert.deepEqual(await read(page), profile); assert.equal(await writes(page) + await writes(holder), beforeWrites);
    await release(page); passed('Cancel while waiting for another tab’s native lock consumes nothing; unavailable Web Locks refuse inheritance without mutation');
  }

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, browser: browserName, evidence: 'Isolated synthetic saves and loopback assets only; no real user/account data.', checks, screenshots, browserErrors: errors }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, browser: browserName, passed: checks, errors, error: error.stack }, null, 2)); process.exitCode = 1;
} finally {
  await Promise.allSettled([...contexts].map(context => context.close())); await browser.close();
}
