import { installViewportNavigation, viewportFrames } from './viewport-browser-helpers.mjs';
/** D2 save durability (docs/LOCAL-COMMANDS.md §19): export → clear site data → the new journey's
 * restore offer → import restores the same journey; declining changes nothing; each backup
 * prompt appears once; the 旅程閣 status line; the cloud option with intercepted fixture APIs;
 * the strips on 340 px and 302 px phones; refused downloads never count as a backup; a cloud backup ends
 * a prompt; a WX receipt's strip comes first; a v0.5.1 (v3) export restores; the import
 * confirmation on short phone pages; a deleted cloud backup; an import's success closes only
 * its own dialog. Synthetic saves, loopback assets only, no download written to disk. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createProfile, claimLogin, sellInstance, buyPack, PROFILE_KEY, PROFILE_VERSION } from '../progression.mjs';
import { LEGACY_CARD_IDS } from '../engine.mjs';
import { mintInstance, setInstanceXP, saveInstanceDeck, getActiveDeck } from '../collection.mjs';
import { createSnapshot, fingerprintProfile, backupProfile } from '../cloud-save.mjs';
import { PROFILE_LOCK, RECOVERY_KEY, RESTORE_MESSAGES } from '../profile-store.mjs';
import { FENCE_MESSAGES } from '../profile-fence.mjs';
import { IMPORT_MESSAGES, MAX_IMPORT_BYTES } from '../platform.mjs';
import { SAVES_KEY } from '../save-status.mjs';

const browserName = process.env.BROWSER || 'chromium';
if (!['chromium', 'webkit'].includes(browserName)) throw Error('BROWSER must be chromium or webkit.');
const runtime = fileURLToPath(new URL('../test-results/webkit-runtime', import.meta.url));
if (browserName === 'webkit' && !process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(runtime)) process.env.PLAYWRIGHT_BROWSERS_PATH = runtime;
const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
if (!process.env.GAME_URL) throw Error('Set GAME_URL to the loopback server serving this checkout, e.g. GAME_URL=http://127.0.0.1:4177.');
const base = new URL(process.env.GAME_URL);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) throw Error('Save durability smoke requires loopback.');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const now = '2026-09-21T12:00:00.000Z';
const BATTLE_KEY = 'shanhai.battle.v5';
const contexts = new Set(), checks = [], errors = [];
const passed = label => { checks.push(label); console.log(`PASS ${label}`); };
const action = (page, name, id) => page.locator(`[data-action="${name}"]${id ? `[data-id="${id}"]` : ''}`);
const notice = page => page.locator('[data-save-notice]');
const raw = (page, key = PROFILE_KEY) => page.evaluate(key => localStorage.getItem(key), key);
const read = (page, key = PROFILE_KEY) => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
/** Every key but the device-local save record, which is not journey data. */
const journeyKeys = page => page.evaluate(saves => Object.fromEntries(Object.keys(localStorage).filter(key => key !== saves).sort().map(key => [key, localStorage.getItem(key)])), SAVES_KEY);
const persistCalls = page => page.evaluate(() => Number(sessionStorage.getItem('save-smoke.persist') || 0));

/** A journey with XP, a merchant-held copy and a second deck. */
function travelled() {
  let profile = claimLogin(createProfile({ now }), now);
  const added = mintInstance(profile, 'qingxiao', { source: 'npc-market', now });
  profile = sellInstance(setInstanceXP(added.profile, added.instance.uid, 430), added.instance.uid, now);
  const extra = mintInstance(profile, 'kongzi', { source: 'npc-market', now });
  profile = setInstanceXP(extra.profile, extra.instance.uid, 260);
  profile = saveInstanceDeck(profile, { slotId: 'deck-2', name: '千古同行', instanceIds: [...getActiveDeck(profile).instanceIds].reverse() });
  profile.stats = { played: 7, won: 5 };
  return { ...profile, coins: 4321, dust: 87 };
}

/** The v3 profile v0.4.1–v0.5.1 stored, projected from a v5 journey (see tests/save-durability.test.mjs). */
function v051Profile(profile) {
  const raw = structuredClone(profile);
  raw.version = 3; raw.collectionVersion = 1; raw.collectionExpansion = 1; delete raw.wx01; delete raw.expansion; delete raw.weekly;
  for (const card of [...raw.instances, ...raw.merchantVault.map(entry => entry.instance)]) delete card.printId;
  for (const key of ['inventory', 'levels']) raw[key] = Object.fromEntries(LEGACY_CARD_IDS.map(id => [id, raw[key][id]]));
  return raw;
}
/** In the key order v0.5.1's 匯出旅程備份 downloaded it (hydrateProfile; see the Node test). */
function v051Download(raw) {
  const { collectionVersion, instances, instanceSerial, deckSlots, activeDeckId, merchantVault, ...rest } = raw;
  return { ...rest, collectionVersion, instances, instanceSerial, deckSlots, activeDeckId, merchantVault };
}

/** A guest on the fixture API: 旅程閣 asks who is signed in; nothing else is expected. */
const guestApiWith = ({ emailEnabled = false } = {}) => (route, request, url) => {
  if (url.pathname === '/api/v1/account' && request.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: false, user: null, emailEnabled, journeyVersions: [1, 3] }) });
  errors.push(`Unexpected fixture API ${request.method()} ${url.pathname}`); return route.abort('blockedbyclient');
};
const guestApi = guestApiWith();
/** `downloads: false` makes the browser refuse every download, as a cancelled save dialog or a
 * blocked download would; the page is told nothing either way. */
/** `stored` seeds other keys once (for example a recovery copy) without a journey. */
async function contextFor({ seed = null, saves = null, stored = null, api = guestApi, width = 1440, height = null, downloads = true } = {}) {
  const mobile = width < 600;
  const context = await browser.newContext({ viewport: { width, height: height ?? (mobile ? 844 : 1000) }, reducedMotion: 'reduce', deviceScaleFactor: 1, acceptDownloads: downloads, ...(mobile && browserName === 'chromium' ? { isMobile: true, hasTouch: true } : {}) });
  contexts.add(context);
  await context.addInitScript(({ seed, saves, stored, key, savesKey, now }) => {
    const NativeDate = Date, fixed = new NativeDate(now).getTime();
    globalThis.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } };
    Math.random = () => 0.23;
    // The seed is written once per tab; clearing site data below must not bring it back.
    if ((seed || saves || stored) && !sessionStorage.getItem('save-smoke.seeded')) {
      if (seed) localStorage.setItem(key, seed);
      if (saves) localStorage.setItem(savesKey, saves);
      for (const [name, value] of Object.entries(stored || {})) localStorage.setItem(name, value);
      sessionStorage.setItem('save-smoke.seeded', 'yes');
    }
    // A spy in place of the browser's answer, which headless engines do not ask a person for.
    // On the prototype: WebKit does not keep a property defined on navigator.storage here.
    if (globalThis.StorageManager) {
      Object.defineProperty(StorageManager.prototype, 'persist', { configurable: true, value: async () => { sessionStorage.setItem('save-smoke.persist', String(Number(sessionStorage.getItem('save-smoke.persist') || 0) + 1)); return true; } });
      Object.defineProperty(StorageManager.prototype, 'persisted', { configurable: true, value: async () => false });
    }
    window.saveSmokeToasts = [];
    new MutationObserver(records => { for (const record of records) for (const node of record.addedNodes) if (node.classList?.contains('toast')) window.saveSmokeToasts.push(node.textContent); })
      .observe(document, { childList: true, subtree: true });
  }, { seed: seed && JSON.stringify(seed), saves: saves && JSON.stringify(saves), stored: stored && Object.fromEntries(Object.entries(stored).map(([name, value]) => [name, JSON.stringify(value)])), key: PROFILE_KEY, savesKey: SAVES_KEY, now });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === base.origin && url.pathname.startsWith('/api/')) return api(route, request, url);
    if (url.origin !== base.origin || url.pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method())) {
      errors.push(`Unexpected network ${request.method()} ${url.origin}${url.pathname}`); return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  return context;
}
/** `navigation: false` leaves out the helper that opens tabs and pages before each click, so
 * a check sees what the player sees after the page's own navigation. */
async function pageIn(context, { navigation = true } = {}) {
  const page = await context.newPage(); if (navigation) installViewportNavigation(page); page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { const url = new URL(response.url()); if (response.status() >= 400 && !url.pathname.startsWith('/api/')) errors.push(`${response.status()} ${url.pathname}`); });
  await page.goto(base.href); await page.locator('.game-lobby').waitFor(); return page;
}
const toastCount = page => page.evaluate(() => window.saveSmokeToasts.length);
const waitToast = (page, text, from) => page.waitForFunction(({ text, from }) => window.saveSmokeToasts.slice(from).some(message => message.includes(text)), { text, from });
async function press(page, locator, text) { const from = await toastCount(page); await locator.click(); await waitToast(page, text, from); }
async function openTools(page) {
  await page.locator('.game-header [data-action="account-open"]').click();
  await page.locator('[data-save-status]').waitFor();
}
async function exportFile(page) {
  const [download] = await Promise.all([page.waitForEvent('download'), action(page, 'export-save').first().click()]);
  const chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  return { name: download.suggestedFilename(), mimeType: 'application/json', buffer: Buffer.concat(chunks) };
}
/** Pick a file through the real button and the page's own <input type=file>. */
async function pick(page, trigger, file) {
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), trigger.click()]);
  await chooser.setFiles(file);
}
const fileOf = (value, name = 'journey.json') => ({ name, mimeType: 'application/json', buffer: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value, null, 2)) });
async function clearSiteData(page) {
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise(resolve => { const request = indexedDB.deleteDatabase('shanhai.profile.fence'); request.onsuccess = request.onerror = request.onblocked = () => resolve(); });
  });
  await page.reload(); await page.locator('.game-lobby').waitFor();
}
async function winBattle(page) {
  await action(page, 'continue-journey').click();
  await action(page, 'confirm-start').click();
  for (let round = 0; round < 4; round++) {
    await page.locator('.battle-table [data-action="commit"]').waitFor();
    const move = await page.evaluate(async ({ key }) => {
      const { chooseAIMove, resolveRound } = await import('./engine.mjs');
      const saved = JSON.parse(localStorage.getItem(key)), state = saved.match;
      let best;
      for (const cardId of state.player.hand.filter(id => !state.player.used.includes(id))) {
        const opponentMove = saved.aiMove || chooseAIMove(state, () => 0.23, cardId);
        for (const fury of [false, true]) for (let pills = 0; pills <= state.player.pills - (fury ? 3 : 0); pills++) {
          const candidate = { cardId, fury, pills }, next = resolveRound(state, candidate, opponentMove);
          const score = (next.status === 'finished' ? next.winner === 'player' ? 1000 : -1000 : 0) + (next.player.hp - next.opponent.hp) * 10 + next.player.pills * 0.7 - next.opponent.pills * 0.3;
          if (!best || score > best.score) best = { ...candidate, score };
        }
      }
      return best;
    }, { key: BATTLE_KEY });
    await page.locator(`.player-hand [data-action="select"][data-id="${move.cardId}"]`).click();
    if (((await action(page, 'fury').getAttribute('aria-pressed')) === 'true') !== move.fury) await action(page, 'fury').click();
    await page.locator('#pill-slider').fill(String(move.pills));
    await action(page, 'commit').click();
    await page.locator('.result-modal .resolution').waitFor();
    const finished = (await action(page, 'next-round').textContent()).includes('對局結果');
    await action(page, 'next-round').click();
    if (finished) { await page.locator('.match-score').waitFor(); break; }
  }
  assert.equal((await read(page)).pending, null, 'the battle settled');
  await action(page, 'end-home').click(); await page.locator('.game-lobby').waitFor();
}
async function openPack(page) {
  await page.locator('.game-dock [data-action="market"]').click();
  await page.locator('[data-action="buy-pack"][data-set="wx01"]').first().click();
  // Reduced motion: the accepted receipt opens straight to its complete phase.
  await page.locator('.pack-opening[data-phase="complete"]').waitFor();
  await action(page, 'pack-ack').click(); await page.locator('.pack-opening').waitFor({ state: 'hidden' });
  await page.locator('.game-dock [data-action="home"]').click(); await page.locator('.game-lobby').waitFor();
}
async function noOverflow(page, label) {
  const size = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert(size.document <= size.viewport + 1, `${label}: ${JSON.stringify(size)}`);
}
/** The strip keeps one row inside its 48 px: every button within it and taking its own taps
 * to the bottom edge, the label whole (on a second line below 340 px), nothing below it covered. */
async function stripFits(page, label) {
  const strip = await page.evaluate(() => {
    const notice = document.querySelector('[data-save-notice]'), box = notice.getBoundingClientRect(), text = notice.querySelector(':scope > span');
    const buttons = [...notice.querySelectorAll('button')].map(button => {
      const rect = button.getBoundingClientRect(), x = rect.left + rect.width / 2;
      const hit = y => button.contains(document.elementFromPoint(x, y));
      return { action: button.dataset.action, top: rect.top, bottom: rect.bottom, height: rect.height, taps: hit(rect.top + 3) && hit(rect.bottom - 3) };
    });
    return { top: box.top, bottom: box.bottom, height: box.height, wrap: getComputedStyle(notice).flexWrap, buttons, cut: text.scrollWidth > text.clientWidth + 1 || text.scrollHeight > text.clientHeight + 1, lines: Math.round(text.getBoundingClientRect().height / parseFloat(getComputedStyle(text).lineHeight)), text: text.textContent, below: document.querySelector('.lobby-kicker')?.getBoundingClientRect().top ?? null };
  });
  assert(strip.height <= 48.5, `${label}: ${JSON.stringify(strip)}`);
  // A longer label or larger text shrinks the label instead of wrapping out of the 48 px.
  assert.equal(strip.wrap, 'nowrap', `${label}: the strip may wrap`);
  for (const button of strip.buttons) {
    assert(button.top >= strip.top - 0.5 && button.bottom <= strip.bottom + 0.5 && button.height >= 43.5, `${label}: ${button.action} leaves the strip ${JSON.stringify(strip)}`);
    assert(button.taps, `${label}: ${button.action} does not take its own taps ${JSON.stringify(strip)}`);
  }
  assert(!strip.cut, `${label}: the label is cut, ${JSON.stringify(strip)}`);
  assert(strip.below === null || strip.below >= strip.bottom - 0.5, `${label}: the lobby heading is covered ${JSON.stringify(strip)}`);
  await noOverflow(page, label);
  return strip;
}
const offerState = async page => (await read(page, SAVES_KEY))?.restoreOffer ?? null;
const promptState = async (page, kind) => (await read(page, SAVES_KEY))?.prompts?.[kind]?.state ?? null;
/** The 旅程閣 tab a player sees selected, and whether `selector` is on screen. */
const accountView = (page, selector) => page.evaluate(selector => {
  const tab = document.querySelector('[data-viewport-surface="account"] [role="tab"][aria-selected="true"]'), node = document.querySelector(selector);
  return { tab: tab?.textContent.trim() ?? null, shown: Boolean(node && !node.closest('[hidden]') && node.getClientRects().length) };
}, selector);
/** Press an export button whose download the browser refuses: returns the download's failure. */
async function refusedExport(page, locator) {
  const from = await toastCount(page);
  const [download] = await Promise.all([page.waitForEvent('download'), locator.click()]);
  const failure = await download.failure();
  await waitToast(page, '已開始下載旅程備份', from);
  return failure;
}

const browser = await engines[browserName].launch({ headless: true, ...(browserName === 'chromium' && existsSync(chrome) ? { executablePath: chrome } : {}) });
try {
  {
    // S1: export → clear site data → the new journey offers a restore → import restores it.
    const original = travelled(), page = await pageIn(await contextFor({ seed: original }));
    assert.equal(await notice(page).count(), 0, 'an existing journey is not offered a restore');
    assert.equal(await persistCalls(page), 0, 'persist() is never requested on an ordinary load');
    await openTools(page);
    assert.match(await page.locator('[data-last-backup]').innerText(), /上次備份：未曾/);
    const stored = await raw(page);
    const file = await exportFile(page);
    assert.equal(file.name, `萬象契旅程-${original.daily.date}.json`);
    assert.equal(file.buffer.toString('utf8'), JSON.stringify(JSON.parse(stored), null, 2), 'the existing export format: the stored journey, indented');
    await page.locator(`[data-last-export] time[datetime="${now}"]`).waitFor();
    assert.match(await page.locator('[data-last-export]').innerText(), /上次匯出：.+ · 已開始下載，此頁無法確認檔案已儲存/);
    assert.equal(await page.locator('[data-last-backup]').count(), 0, 'an export is not claimed as a backup');
    assert.equal((await read(page, SAVES_KEY)).lastBackup, null);
    passed('S1a the export downloads the stored journey in the existing format, and 旅程閣 shows when the download started, not a backup');

    await clearSiteData(page);
    const started = await read(page);
    assert.notEqual(fingerprintProfile(started), fingerprintProfile(original), 'site data cleared: a new journey');
    await notice(page).and(page.locator('[data-save-notice="restore-offer"]')).waitFor();
    assert.match(await notice(page).innerText(), /有舊旅程？由備份還原/);
    assert.equal(await persistCalls(page), 0);
    await pick(page, notice(page).locator('[data-action="import-save"]'), file);
    await page.locator('.import-compare').waitFor();
    const compare = await page.locator('.import-compare').innerText();
    assert.match(compare, /將被取代/); assert.match(compare, /將還原/);
    assert.equal(await page.locator('.import-side').nth(1).locator('[data-summary="cards"]').innerText(), String(original.instances.length));
    assert.equal(await raw(page), JSON.stringify(started), 'nothing is written before the confirmation');
    await press(page, action(page, 'import-confirm'), '已由備份還原旅程');
    const restored = await read(page);
    assert.equal(fingerprintProfile(restored), fingerprintProfile(original), 'an identical journey fingerprint');
    assert.equal(fingerprintProfile(restored), fingerprintProfile(backupProfile(JSON.parse(stored))));
    const recovery = await read(page, RECOVERY_KEY);
    assert.deepEqual(recovery.snapshot, createSnapshot(started), 'the replaced journey is kept as the recovery copy');
    await page.locator('.modal').waitFor({ state: 'hidden' });
    assert.equal(await notice(page).count(), 0, 'the offer is gone after the restore');
    // The restored journey has played, which hides the offer anyway: pin the close itself.
    assert.equal(await offerState(page), 'closed', 'a successful restore closes the offer');
    await page.reload(); await page.locator('.game-lobby').waitFor();
    assert.equal(await notice(page).count(), 0);
    assert.equal(fingerprintProfile(await read(page)), fingerprintProfile(original));
    passed('S1b after clearing site data the new journey offers a restore; the exported file restores an identical journey fingerprint, with the new journey as the recovery copy');

    // One recovery slot: a second import says the copy kept now would be replaced.
    const kept = await raw(page, RECOVERY_KEY), journey = await journeyKeys(page);
    await openTools(page);
    await pick(page, action(page, 'import-save'), fileOf(travelled()));
    await page.locator('.import-compare').waitFor();
    assert.match(await page.locator('[data-recovery-replaced]').innerText(), /旅程閣現有的回復備份（.+）會被這次取代；如需保留，請先在旅程閣「下載本機回復備份」。/);
    await action(page, 'close-modal').filter({ hasText: '保留現在進度' }).click();
    await page.locator('.modal').waitFor({ state: 'hidden' });
    assert.equal(await raw(page, RECOVERY_KEY), kept);
    assert.deepEqual(await journeyKeys(page), journey, 'declined: nothing written');
    passed('S1c with a recovery copy kept, the import confirmation says it would be replaced and how to keep it');
    contexts.delete(page.context()); await page.context().close();
  }

  {
    // S2: declining changes nothing; refused files and refused states write nothing.
    const page = await pageIn(await contextFor({ width: 390 }));
    await notice(page).waitFor();
    await noOverflow(page, 'restore offer at 390 px');
    const box = await notice(page).boundingBox();
    assert(box && box.width <= 390 && box.height <= 60, `one compact strip: ${JSON.stringify(box)}`);
    const before = await journeyKeys(page);
    assert.equal(before[RECOVERY_KEY], undefined);
    const backup = travelled();
    await pick(page, notice(page).locator('[data-action="import-save"]'), fileOf(backup));
    await page.locator('.import-compare').waitFor();
    await action(page, 'close-modal').filter({ hasText: '保留現在進度' }).click();
    await page.locator('.modal').waitFor({ state: 'hidden' });
    assert.deepEqual(await journeyKeys(page), before, 'keeping the current journey writes nothing');
    const refusals = [
      ['too-large', fileOf('x'.repeat(MAX_IMPORT_BYTES + 1))],
      ['unparsable', fileOf('{"version": 5,')],
      ['future-version', fileOf({ ...backup, version: 6 })],
      ['tampered', fileOf({ ...backup, instances: backup.instances.map((card, index) => index ? card : { ...card, xp: 999 }) })],
      ['unfinished', fileOf({ ...backup, pending: { id: 'battle-1' } })],
      ['not-export', fileOf(createSnapshot(backup))],
    ];
    for (const [reason, file] of refusals) {
      const from = await toastCount(page);
      await pick(page, notice(page).locator('[data-action="import-save"]'), file);
      await waitToast(page, IMPORT_MESSAGES[reason], from);
      assert.equal(await page.locator('.import-compare').count(), 0, `${reason}: no confirmation`);
      assert.deepEqual(await journeyKeys(page), before, `${reason}: 0 bytes written`);
    }
    passed(`S2a declining the import and ${refusals.length} refused files (oversize, unparsable, future version, tampered, mid-battle, cloud snapshot) leave every journey byte unchanged`);

    // A "writing" fence (a holder that saved and never settled) refuses at the confirmation.
    await pick(page, notice(page).locator('[data-action="import-save"]'), fileOf(backup));
    await page.locator('.import-compare').waitFor();
    await page.evaluate(async () => (await import('/profile-fence.mjs')).createIndexedDBFence(indexedDB).write({ v: 1, state: 'writing' }));
    await press(page, action(page, 'import-confirm'), FENCE_MESSAGES.unsettled);
    assert.deepEqual(await journeyKeys(page), before, 'the fence refusal writes nothing');
    await action(page, 'close-modal').filter({ hasText: '保留現在進度' }).click();
    await page.reload(); await page.locator('.game-lobby').waitFor();
    const healed = await journeyKeys(page);
    passed('S2b while the fence says "writing" the import is refused at its confirmation with nothing written');

    // The lobby never knows the account on its own: the cloud path is there until 旅程閣
    // has looked up a guest who cannot sign in now (this fixture's email login is off).
    assert.equal(await notice(page).locator('[data-action="restore-offer-cloud"]').count(), 1, 'a cloud path while the account is unknown');
    await openTools(page);
    await page.locator('.account-shell[aria-busy="false"]').waitFor();
    await action(page, 'account-back').click(); await page.locator('.game-lobby').waitFor();
    assert.equal(await notice(page).locator('[data-action="restore-offer-cloud"]').count(), 0, 'no cloud path for a guest who cannot sign in');
    assert.doesNotMatch(await notice(page).getAttribute('aria-label'), /雲端/);
    await action(page, 'save-notice-dismiss', 'restore-offer').click();
    await notice(page).waitFor({ state: 'detached' });
    assert.deepEqual(await journeyKeys(page), healed, 'dismissing the offer leaves the journey unchanged');
    await page.reload(); await page.locator('.game-lobby').waitFor();
    assert.equal(await notice(page).count(), 0, 'a dismissed offer stays dismissed');
    assert.deepEqual(await journeyKeys(page), healed);
    passed('S2c dismissing the offer leaves the profile bytes unchanged and it does not return');

    // An unfinished battle refuses before the file picker opens.
    await action(page, 'continue-journey').click(); await action(page, 'confirm-start').click();
    await page.locator('.battle-table').waitFor();
    await action(page, 'battle-menu').click(); await action(page, 'navigate-confirm').click();
    await page.locator('.game-lobby').waitFor();
    const pending = await journeyKeys(page);
    assert.ok(JSON.parse(pending[PROFILE_KEY]).pending);
    let chooser = 0; page.on('filechooser', () => { chooser++; });
    await openTools(page);
    await press(page, action(page, 'import-save'), '請先完成或放棄未完對局，再匯入旅程備份');
    assert.equal(chooser, 0, 'no file picker during a battle');
    assert.deepEqual(await journeyKeys(page), pending);
    // An export during the battle still downloads, but its file would not import: not recorded.
    await press(page, action(page, 'export-save'), '對局或活動未完時的備份未能還原');
    assert.equal(await page.locator('[data-last-export]').count(), 0, 'an export that would not import is not recorded');
    assert.equal((await read(page, SAVES_KEY))?.lastExport ?? null, null);
    assert.match(await page.locator('[data-last-backup]').innerText(), /上次備份：未曾/);
    passed('S2d during an unfinished battle the import is refused before the picker opens, with nothing written, and an export is not recorded');
    assert.equal(RESTORE_MESSAGES.unfinished.includes('本機旅程未有更改'), true);
    contexts.delete(page.context()); await page.context().close();
  }

  {
    // S3: each guest backup prompt appears once, at its milestone; persist() once, at the first win.
    const page = await pageIn(await contextFor({ width: 390 }));
    await action(page, 'save-notice-dismiss', 'restore-offer').click();
    assert.equal(await persistCalls(page), 0);
    await winBattle(page);
    await page.locator('[data-save-notice="first-win"]').waitFor();
    assert.match(await notice(page).innerText(), /首勝已記 · 留份備份？/, "a new journey's first win is its 首勝");
    assert.equal(await notice(page).locator('[data-action="save-notice-dismiss"]').getAttribute('aria-label'), '關閉提示，不會再出現');
    await noOverflow(page, 'first-win prompt at 390 px');
    assert.equal(await persistCalls(page), 1, 'persist() exactly once, after the first win');
    assert.equal(await page.locator('[data-save-notice="first-win"] [data-action="export-save"]').count(), 1);
    assert.equal(await page.locator('[data-save-notice="first-win"] [data-action="backup-prompt-cloud"]').count(), 1);
    await page.reload(); await page.locator('.game-lobby').waitFor();
    assert.equal(await notice(page).count(), 0, 'shown once: not after a reload');
    await winBattle(page);
    assert.equal(await notice(page).count(), 0, 'not after a second win');
    assert.equal(await persistCalls(page), 1);
    await openPack(page);
    await page.locator('[data-save-notice="first-pack"]').waitFor();
    assert.equal(await persistCalls(page), 1, 'the first pack does not ask again');
    await action(page, 'save-notice-dismiss', 'first-pack').click();
    await notice(page).waitFor({ state: 'detached' });
    await openPack(page);
    assert.equal(await notice(page).count(), 0, 'not after a second pack');
    await page.reload(); await page.locator('.game-lobby').waitFor();
    assert.equal(await notice(page).count(), 0);
    await openTools(page);
    assert.equal(await page.locator('[data-save-status]').getAttribute('data-persistence'), 'granted');
    assert.match(await page.locator('[data-persistence-label]').innerText(), /瀏覽器已答應保留/);
    assert.match(await page.locator('[data-last-backup]').innerText(), /上次備份：未曾/);
    passed('S3 the first-win and first-pack prompts each appear once and never as a dialog; persist() ran once, after the first win, and 旅程閣 shows its answer');
    contexts.delete(page.context()); await page.context().close();
  }

  {
    // S4: signed in (intercepted fixture API), the offer adds cloud restore; a cloud backup is the last backup.
    const backup = travelled(), fixture = { revision: 1, backup: { revision: 1, updatedAt: now, snapshot: createSnapshot(backup) }, calls: [] };
    const api = (route, request, url) => {
      const reply = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
      fixture.calls.push(`${request.method()} ${url.pathname}`);
      if (url.pathname === '/api/v1/account') return reply({ authenticated: true, user: { id: 'save-smoke-account', email: 'traveller@example.test' }, emailEnabled: true, journeyVersions: [1, 3] });
      if (url.pathname === '/api/v3/journey' && request.method() === 'GET') return reply({ backup: fixture.backup, revision: fixture.revision });
      if (url.pathname === '/api/v3/journey' && request.method() === 'PUT') {
        const body = request.postDataJSON(); fixture.revision += 1;
        fixture.backup = { revision: fixture.revision, updatedAt: now, snapshot: body.snapshot };
        return reply({ backup: fixture.backup, revision: fixture.revision });
      }
      errors.push(`Unexpected fixture API ${request.method()} ${url.pathname}`); return reply({ error: { code: 'not_found' } }, 404);
    };
    const page = await pageIn(await contextFor({ api }));
    await notice(page).waitFor();
    assert.deepEqual(fixture.calls, [], 'the lobby makes no account request');
    // The first lobby after eviction: the account is unknown, and the cloud path is still there.
    await notice(page).locator('[data-action="restore-offer-cloud"]').click();
    await page.locator('.account-confirmation').waitFor();
    assert.deepEqual(fixture.calls.slice(0, 2), ['GET /api/v1/account', 'GET /api/v3/journey'], '旅程閣 looked the account up once');
    assert.equal(fixture.calls.filter(call => call === 'GET /api/v1/account').length, 1);
    await page.locator('.account-identity').waitFor();
    await action(page, 'account-restore').click();
    await page.locator('.account-shell[aria-busy="false"] .account-message[role="status"]').waitFor();
    assert.equal(fingerprintProfile(await read(page)), fingerprintProfile(backup), 'the cloud journey was restored through the existing flow');
    await action(page, 'account-back').click(); await page.locator('.game-lobby').waitFor();
    assert.equal(await notice(page).count(), 0, 'the offer closes after a restore');
    assert.equal(await offerState(page), 'closed', 'closed by the restore itself, not only hidden by the played journey');
    await openTools(page);
    await action(page, 'account-upload').click();
    await page.locator(`[data-last-backup] time[datetime="${now}"]`).waitFor();
    assert.match(await page.locator('[data-last-backup]').innerText(), /雲端備份/);
    assert.equal(fixture.calls.filter(call => call === 'PUT /api/v3/journey').length, 1);
    passed('S4 signed in, the first lobby\'s 雲端旅程 opens 旅程閣, which looks the account up and opens the existing cloud restore (fixture API); a cloud backup becomes the last backup');
    contexts.delete(page.context()); await page.context().close();
  }

  {
    // S5a: on a 340 px phone the restore offer keeps one row in its strip, its label on one line.
    // At 302 px (N1 removed the body's 340 px minimum) the label takes a second line instead of
    // being cut, inside the same 48 px.
    for (const [width, lines] of [[340, 1], [302, 2]]) {
      const page = await pageIn(await contextFor({ width }));
      await notice(page).waitFor();
      const offer = await stripFits(page, `restore offer at ${width} px`);
      assert.deepEqual(offer.buttons.map(button => button.action), ['import-save', 'restore-offer-cloud', 'save-notice-dismiss']);
      assert.equal(offer.text, '有舊旅程？由備份還原');
      assert.equal(offer.lines, lines, `restore offer at ${width} px: ${JSON.stringify(offer)}`);
      contexts.delete(page.context()); await page.context().close();
    }
    passed('S5a at 340 px and 302 px the restore offer and its three buttons stay inside the 48 px strip, label whole (two lines at 302 px), the lobby heading uncovered');
  }
  {
    // S5b: a journey from before D2 (five wins) whose first win on this device left a prompt
    // due, and whose persist() request got no answer before its page closed.
    const saves = { v: 1, lastBackup: null, persistence: { state: 'requested', at: now, trigger: 'first-win' }, prompts: { 'first-win': { state: 'due', at: now } }, restoreOffer: null };
    const page = await pageIn(await contextFor({ seed: travelled(), saves, width: 340 }));
    await page.locator('[data-save-notice="first-win"]').waitFor();
    const prompt = await stripFits(page, 'later-win prompt at 340 px');
    assert.equal(prompt.text, '勝局已記 · 留份備份？', 'a sixth win is not announced as the first');
    assert.match(await notice(page).getAttribute('aria-label'), /^勝局已記下。/);
    assert.equal(await persistCalls(page), 0, 'persist() is not asked again');
    await openTools(page);
    assert.equal(await page.locator('[data-save-status]').getAttribute('data-persistence'), 'unanswered');
    assert.match(await page.locator('[data-persistence-label]').innerText(), /長期保存：未有回覆（瀏覽器未確認保留）/, 'not "waiting" for an answer no page is waiting on');
    passed('S5b a journey with earlier wins is told 勝局已記, not 首勝, in a strip that fits 340 px; an unanswered persist() request reads 未有回覆, without asking again');
    contexts.delete(page.context()); await page.context().close();
  }

  {
    // S6 (review round 2): the browser refuses every download, as a cancelled save dialog or a
    // blocked download would. The page cannot tell, so an export never counts as a backup: the
    // strip it was pressed from stays, 旅程閣 shows only that a download started, and a prompt
    // due before the export is still shown.
    const saves = { v: 1, lastBackup: null, persistence: { state: 'granted', at: now, trigger: 'first-win' }, prompts: { 'first-win': { state: 'due', at: now } }, restoreOffer: null };
    const page = await pageIn(await contextFor({ seed: travelled(), saves, downloads: false, width: 390 }));
    await page.locator('[data-save-notice="first-win"]').waitFor();
    assert.ok(await refusedExport(page, notice(page).locator('[data-action="export-save"]')), 'the browser refused the download');
    assert.equal(await page.locator('[data-save-notice="first-win"]').count(), 1, 'the strip stays: the page cannot tell the file was saved');
    assert.equal((await read(page, SAVES_KEY)).lastBackup, null);
    await openTools(page);
    await page.locator(`[data-last-export] time[datetime="${now}"]`).waitFor();
    assert.match(await page.locator('[data-last-export]').innerText(), /已開始下載，此頁無法確認檔案已儲存/);
    assert.equal(await page.locator('[data-last-backup]').count(), 0, 'no backup date for a refused download');
    await action(page, 'account-back').click(); await page.locator('.game-lobby').waitFor();
    await action(page, 'save-notice-dismiss', 'first-win').click();
    await notice(page).waitFor({ state: 'detached' });
    // A pack opened (its prompt now due, as saves.packOpened() records it), then an export from
    // 旅程閣 that the browser refuses, before the lobby shows the prompt.
    await openTools(page);
    await page.evaluate(({ key, at }) => { const record = JSON.parse(localStorage.getItem(key)); record.prompts['first-pack'] = { state: 'due', at }; localStorage.setItem(key, JSON.stringify(record)); }, { key: SAVES_KEY, at: now });
    assert.ok(await refusedExport(page, action(page, 'export-save')));
    await action(page, 'account-back').click(); await page.locator('.game-lobby').waitFor();
    await page.locator('[data-save-notice="first-pack"]').waitFor();
    assert.equal(await promptState(page, 'first-pack'), 'shown', 'shown, not skipped as backed up');
    passed('S6 with every download refused, an export leaves its strip up, 旅程閣 says only that a download started, and a prompt due before it is still shown');
    contexts.delete(page.context()); await page.context().close();
  }

  {
    // S7: a cloud backup the API confirmed saved ends the prompt shown on this page. Since review
    // round 3 the prompt's 旅程閣 opens 旅程閣 on its 雲端旅程 tab, checked at 390 px without the
    // test's tab/page helper: a guest sees the email sign-in, and a signed-in player 備份此裝置,
    // which the cloud panel's own pages leave off its first page. It used to open 此裝置.
    const saves = { v: 1, lastBackup: null, persistence: null, prompts: { 'first-win': { state: 'due', at: now } }, restoreOffer: null };
    {
      const page = await pageIn(await contextFor({ seed: travelled(), saves, api: guestApiWith({ emailEnabled: true }), width: 390 }), { navigation: false });
      await page.locator('[data-save-notice="first-win"]').waitFor();
      await notice(page).locator('[data-action="backup-prompt-cloud"]').click();
      await page.locator('.account-shell[aria-busy="false"]').waitFor(); await viewportFrames(page);
      const view = await accountView(page, '[data-account-form="email"]');
      assert.deepEqual(view, { tab: '雲端旅程', shown: true }, `a guest: ${JSON.stringify(view)}`);
      contexts.delete(page.context()); await page.context().close();
    }
    const journey = travelled(), fixture = { revision: 1, backup: { revision: 1, updatedAt: now, snapshot: createSnapshot(journey) }, puts: 0 };
    const api = (route, request, url) => {
      const reply = value => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) });
      if (url.pathname === '/api/v1/account') return reply({ authenticated: true, user: { id: 'save-smoke-account', email: 'traveller@example.test' }, emailEnabled: true, journeyVersions: [1, 3] });
      if (url.pathname === '/api/v3/journey' && request.method() === 'GET') return reply({ backup: fixture.backup, revision: fixture.revision });
      if (url.pathname === '/api/v3/journey' && request.method() === 'PUT') {
        fixture.puts += 1; fixture.revision += 1;
        fixture.backup = { revision: fixture.revision, updatedAt: now, snapshot: request.postDataJSON().snapshot };
        return reply({ backup: fixture.backup, revision: fixture.revision });
      }
      errors.push(`Unexpected fixture API ${request.method()} ${url.pathname}`); return route.abort('blockedbyclient');
    };
    const page = await pageIn(await contextFor({ seed: journey, saves, api, width: 390 }), { navigation: false });
    // The lobby does not know the account yet, so the prompt shows as for a guest.
    await page.locator('[data-save-notice="first-win"]').waitFor();
    await notice(page).locator('[data-action="backup-prompt-cloud"]').click();
    await page.locator('.account-shell[aria-busy="false"] .account-identity').waitFor(); await viewportFrames(page);
    const view = await accountView(page, '[data-action="account-upload"]');
    assert.deepEqual(view, { tab: '雲端旅程', shown: true }, `signed in: ${JSON.stringify(view)}`);
    await action(page, 'account-upload').click();
    await page.locator(`[data-last-backup] time[datetime="${now}"]`).waitFor({ state: 'attached' });
    assert.match(await page.locator('[data-last-backup]').textContent(), /上次備份：.+ · 雲端備份/);
    assert.equal(fixture.puts, 1);
    await action(page, 'account-back').click(); await page.locator('.game-lobby').waitFor();
    assert.equal(await notice(page).count(), 0, 'the confirmed backup ended the prompt');
    passed('S7 at 390 px a prompt\'s 旅程閣 opens the 雲端旅程 tab (the sign-in for a guest, 備份此裝置 on screen when signed in); a cloud backup the API confirmed saved becomes the last backup and ends the prompt (fixture API)');
    contexts.delete(page.context()); await page.context().close();
  }

  {
    // S8 (review round 2): without a cloud backup to confirm, the offer's 雲端旅程 lands on
    // 旅程閣's 雲端旅程 tab, not on 此裝置 with the new journey: a guest sees the sign-in, and an
    // offline player sees why 旅程閣 could not open the cloud.
    for (const [label, api, selector] of [
      ['a guest with email sign-in', guestApiWith({ emailEnabled: true }), '[data-account-form="email"]'],
      ['an offline player', route => route.abort('internetdisconnected'), '.account-panel.cloud'],
    ]) {
      const page = await pageIn(await contextFor({ api, width: 390 }));
      await notice(page).locator('[data-action="restore-offer-cloud"]').click();
      await page.locator('.account-shell[aria-busy="false"]').waitFor();
      const view = await accountView(page, selector);
      assert.deepEqual(view, { tab: '雲端旅程', shown: true }, `${label}: ${JSON.stringify(view)}`);
      contexts.delete(page.context()); await page.context().close();
    }
    passed('S8 at 390 px the offer\'s 雲端旅程 opens 旅程閣 on its 雲端旅程 tab: the email sign-in for a guest, the cloud panel when offline');
  }

  {
    // S9: an open WX receipt's resume strip has the place first, and a prompt due meanwhile
    // waits for it instead of being used up behind it.
    const opened = buyPack({ ...travelled(), coins: 5000 }, { set: 'wx01', rng: () => 0.4, now }).profile;
    assert.ok(opened.wx01.receipt);
    const saves = { v: 1, lastBackup: null, persistence: null, prompts: { 'first-pack': { state: 'due', at: now } }, restoreOffer: null };
    const page = await pageIn(await contextFor({ seed: opened, saves }));
    await action(page, 'pack-resume').waitFor();
    assert.equal(await notice(page).count(), 0, 'only the receipt strip');
    assert.equal(await promptState(page, 'first-pack'), 'due', 'the prompt is not used up behind the receipt');
    await action(page, 'pack-resume').click();
    await page.locator('.pack-opening[data-phase="complete"]').waitFor();
    await action(page, 'pack-ack').click(); await page.locator('.pack-opening').waitFor({ state: 'hidden' });
    await page.locator('.game-dock [data-action="home"]').click(); await page.locator('.game-lobby').waitFor();
    await page.locator('[data-save-notice="first-pack"]').waitFor();
    assert.equal(await promptState(page, 'first-pack'), 'shown');
    passed('S9 with a WX receipt open the lobby shows only its resume strip; the due prompt waits and appears once the receipt is acknowledged');
    contexts.delete(page.context()); await page.context().close();
  }

  {
    // S10 (review round 2): a v0.5.1 export (profile v3) restores from the new journey's offer,
    // migrated as load() migrates a v3 key, through the same confirmation and strict restore.
    const original = travelled(), page = await pageIn(await contextFor({ width: 390 }));
    await notice(page).waitFor();
    const started = await read(page);
    await pick(page, notice(page).locator('[data-action="import-save"]'), fileOf(v051Download(v051Profile(original)), `萬象契旅程-${original.daily.date}.json`));
    await page.locator('.import-compare').waitFor();
    assert.match(await page.locator('[data-import-legacy]').innerText(), /來自較舊版本的萬象契/);
    assert.equal(await page.locator('.import-side').nth(1).locator('[data-summary="cards"]').innerText(), String(original.instances.length));
    assert.equal(await raw(page), JSON.stringify(started), 'nothing is written before the confirmation');
    await press(page, action(page, 'import-confirm'), '已由備份還原旅程');
    const restored = await read(page);
    assert.equal(restored.version, PROFILE_VERSION);
    assert.equal(fingerprintProfile(restored), fingerprintProfile(original), 'the same journey, as v5');
    assert.deepEqual((await read(page, RECOVERY_KEY)).snapshot, createSnapshot(started), 'the new journey is kept as the recovery copy');
    passed('S10 a v0.5.1 export (profile v3) restores from the offer as the same journey in v5, after a confirmation that says it is migrated');
    contexts.delete(page.context()); await page.context().close();
  }

  {
    // S10b (review round 3): the longest confirmation, a v0.5.1 export with a recovery copy kept
    // (the legacy note and the replaced-copy warning), on phone-sized dialog pages, without the
    // tab/page helper. It was one block taller than the page, so the warning on how to keep the
    // recovery copy was drawn under the pager (340×640 to 390×664). Now no item of the paged
    // list reaches the pager, phones from 340×640 show it on one page, and a landscape phone
    // pages it, the warnings first.
    const original = travelled(), recovery = { savedAt: now, snapshot: createSnapshot(claimLogin(createProfile({ now }), now)) };
    for (const [width, height, pages] of [[340, 640, 1], [375, 667, 1], [390, 664, 1], [844, 390, 2]]) {
      const label = `${width}×${height}`;
      const page = await pageIn(await contextFor({ stored: { [RECOVERY_KEY]: recovery }, width, height }), { navigation: false });
      await notice(page).waitFor();
      const before = await journeyKeys(page);
      await pick(page, notice(page).locator('[data-action="import-save"]'), fileOf(v051Download(v051Profile(original)), `萬象契旅程-${original.daily.date}.json`));
      await page.locator('.modal [data-import-legacy]').waitFor(); await viewportFrames(page);
      const seen = [];
      for (let index = 0; index < pages; index++) {
        if (index) { await page.locator('.modal [data-viewport-action="next"]').click(); await viewportFrames(page); }
        const layout = await page.evaluate(() => {
          const modal = document.querySelector('.modal'), list = modal.querySelector('[data-viewport-list="dialog-content"]');
          const pager = list.closest('.viewport-list-frame').querySelector('.viewport-pagination'), pagerTop = pager.getBoundingClientRect().top;
          const items = [...list.children].filter(item => !item.hidden).map(item => ({ id: item.dataset.viewportId, bottom: item.getBoundingClientRect().bottom }));
          const note = modal.querySelector('[data-recovery-replaced]'), shown = note && !note.closest('[hidden]');
          const box = shown ? note.getBoundingClientRect() : null, hit = box && document.elementFromPoint(box.left + 4, box.bottom - 3);
          return { status: pager.querySelector('[data-viewport-status]').textContent, pagerTop, items, overflow: list.dataset.viewportOverflow,
            note: shown ? { bottom: box.bottom, own: note.contains(hit), hit: hit?.textContent.trim().slice(0, 12) ?? null } : null,
            next: pager.querySelector('[data-viewport-action="next"]').disabled, document: document.documentElement.scrollWidth - innerWidth };
        });
        const context = `${label} page ${index + 1}: ${JSON.stringify(layout)}`;
        assert.ok(layout.status.startsWith(`第 ${index + 1} / ${pages} 頁`), context);
        assert.equal(layout.overflow, 'false', context);
        for (const item of layout.items) assert.ok(item.bottom <= layout.pagerTop + 0.5, `${item.id} reaches the pager, ${context}`);
        if (layout.note) assert.ok(layout.note.own && layout.note.bottom <= layout.pagerTop + 0.5, `the replaced-copy warning is covered, ${context}`);
        assert.equal(layout.next, index === pages - 1, context);
        assert.ok(layout.document <= 1, context);
        seen.push(...layout.items.flatMap(item => item.id === 'import-notes' && layout.note ? [item.id, 'warning'] : [item.id]));
      }
      assert.deepEqual(seen, ['import-notes', 'warning', 'import-compare'], `${label}: the notes, their warning and the comparison, warnings first`);
      await action(page, 'close-modal').filter({ hasText: '保留現在進度' }).click();
      await page.locator('.modal').waitFor({ state: 'hidden' });
      assert.deepEqual(await journeyKeys(page), before, `${label}: declined, nothing written`);
      contexts.delete(page.context()); await page.context().close();
    }
    passed('S10b with a recovery copy kept, a v0.5.1 export\'s confirmation keeps every note clear of the pager: one page at 340×640, 375×667 and 390×664, two at 844×390 with the warnings first');
  }

  {
    // S11 (review round 3): 刪除雲端備份 after 備份此裝置 (fixture API). The status line kept
    // 上次備份：(date) · 雲端備份 beside the cloud panel's 尚未備份; now it says the backup was
    // deleted, after a reload too.
    const fixture = { revision: 0, backup: null, calls: [] };
    const api = (route, request, url) => {
      const reply = value => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) });
      const method = request.method(); fixture.calls.push(`${method} ${url.pathname}`);
      if (url.pathname === '/api/v1/account') return reply({ authenticated: true, user: { id: 'save-smoke-account', email: 'traveller@example.test' }, emailEnabled: true, journeyVersions: [1, 3] });
      if (url.pathname === '/api/v1/journey' && method === 'GET') return reply({ backup: null, revision: 0 });
      if (url.pathname === '/api/v3/journey' && method === 'GET') return reply({ backup: fixture.backup, revision: fixture.revision });
      if (url.pathname === '/api/v3/journey' && ['PUT', 'DELETE'].includes(method)) {
        fixture.revision += 1;
        fixture.backup = method === 'DELETE' ? null : { revision: fixture.revision, updatedAt: now, snapshot: request.postDataJSON().snapshot };
        return reply({ backup: fixture.backup, revision: fixture.revision });
      }
      errors.push(`Unexpected fixture API ${method} ${url.pathname}`); return route.abort('blockedbyclient');
    };
    const page = await pageIn(await contextFor({ seed: travelled(), api }));
    await openTools(page);
    await page.locator('.account-shell[aria-busy="false"] .account-identity').waitFor();
    assert.match(await page.locator('[data-last-backup]').textContent(), /上次備份：未曾/);
    await press(page, action(page, 'account-upload'), '此裝置的旅程已備份');
    assert.match(await page.locator('[data-last-backup]').textContent(), /上次備份：.+ · 雲端備份$/);
    assert.equal(await page.locator('.account-panel.cloud .account-pill').textContent(), '已有備份');
    await action(page, 'account-confirm-delete').click();
    await press(page, action(page, 'account-delete'), '雲端備份已刪除');
    assert.equal(await page.locator('.account-panel.cloud .account-pill').textContent(), '尚未備份');
    assert.match(await page.locator('[data-last-backup]').textContent(), /上次備份：.+ · 雲端備份已刪除$/, 'the status no longer claims a cloud backup');
    assert.equal(await page.locator('[data-last-backup][data-backup-deleted]').count(), 1);
    assert.deepEqual((await read(page, SAVES_KEY)).lastBackup, { at: now, kind: 'cloud', deletedAt: now });
    await page.reload(); await page.locator('.game-lobby').waitFor();
    await openTools(page);
    await page.locator('.account-shell[aria-busy="false"] .account-identity').waitFor();
    assert.match(await page.locator('[data-last-backup]').textContent(), /· 雲端備份已刪除$/, 'and after a reload');
    assert.equal(await page.locator('.account-panel.cloud .account-pill').textContent(), '尚未備份');
    assert.deepEqual(fixture.calls.filter(call => !call.startsWith('GET')), ['PUT /api/v3/journey', 'DELETE /api/v3/journey']);
    passed('S11 after 備份此裝置 then 刪除雲端備份 (fixture API) 旅程閣 reads 上次備份 … · 雲端備份已刪除 beside 尚未備份, after a reload too');
    contexts.delete(page.context()); await page.context().close();
  }

  {
    // S12 (D2 integration review round 1): an import's success closes only its own dialog, as
    // 復原上次本機旅程's does (test:commands B11). While a confirmed import waits for the
    // profile lock its dialog is held (test:back); a dialog opened over it meanwhile, by other
    // means since no control reaches one, stays open when the import lands.
    const page = await pageIn(await contextFor()), backup = travelled();
    await openTools(page);
    await pick(page, action(page, 'import-save'), fileOf(backup));
    await page.locator('.import-compare').waitFor();
    await page.evaluate(name => new Promise(resolve => {
      navigator.locks.request(name, () => { resolve(); return new Promise(done => { window.saveSmokeReleaseLock = done; }); });
    }), PROFILE_LOCK);
    const from = await toastCount(page), before = await raw(page);
    await action(page, 'import-confirm').click();
    await page.locator('.modal-backdrop[data-dismissible="false"] .modal[aria-busy="true"]').waitFor();
    await page.evaluate(() => { const button = document.createElement('button'); button.dataset.action = 'rules'; document.body.append(button); button.click(); button.remove(); });
    await page.locator('.modal .rules-grid').waitFor();
    assert.equal(await raw(page), before, 'nothing written while the lock is held');
    await page.evaluate(() => window.saveSmokeReleaseLock());
    await waitToast(page, '已由備份還原旅程', from);
    await page.waitForFunction(async name => { const state = await navigator.locks.query(); return ![...state.held, ...state.pending].some(lock => lock.name === name); }, PROFILE_LOCK);
    await page.waitForTimeout(300);
    assert(await page.locator('.modal .rules-grid').isVisible(), 'the dialog opened since stays open');
    assert.equal(fingerprintProfile(await read(page)), fingerprintProfile(backup), 'the import restored the backup');
    assert.deepEqual((await read(page, RECOVERY_KEY)).snapshot, createSnapshot(JSON.parse(before)), 'the replaced journey is the recovery copy');
    passed('S12 an import waiting for the profile lock is held; when it lands it closes only its own dialog, so a dialog opened over it meanwhile stays open');
    contexts.delete(page.context()); await page.context().close();
  }

  assert.deepEqual(errors, []);
  console.log(`Save durability smoke passed in ${browserName}: ${checks.length} groups.`);
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  await browser.close();
}
