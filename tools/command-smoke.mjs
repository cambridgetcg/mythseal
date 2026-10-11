import { installViewportNavigation } from './viewport-browser-helpers.mjs';
/** Q1 local-command acceptance (docs/LOCAL-COMMANDS.md): the card page's 修練升級 with
 * synthetic saves, real native Web Locks and loopback assets only. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createProfile, PROFILE_KEY } from '../progression.mjs';
import { mintInstance, getActiveDeck, syncCollection } from '../collection.mjs';
import { PROFILE_LOCK, RECOVERY_KEY } from '../profile-store.mjs';
import { COMMAND_MESSAGES } from '../local-commands.mjs';
import { FENCE_MESSAGES } from '../profile-fence.mjs';
import { createSnapshot } from '../cloud-save.mjs';

const browserName = process.env.BROWSER || 'chromium';
if (!['chromium', 'webkit'].includes(browserName)) throw Error('BROWSER must be chromium or webkit.');
const runtime = fileURLToPath(new URL('../test-results/webkit-runtime', import.meta.url));
if (browserName === 'webkit' && !process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(runtime)) process.env.PLAYWRIGHT_BROWSERS_PATH = runtime;
const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
if (!process.env.GAME_URL) throw Error('Set GAME_URL to the loopback server serving this checkout, e.g. GAME_URL=http://127.0.0.1:4177.');
const base = new URL(process.env.GAME_URL);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) throw Error('Command smoke requires loopback.');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const now = '2026-09-22T12:00:00.000Z';
const contexts = new Set(), checks = [], errors = [];
const COMMITTED = '此卡修練完成', DUPLICATE = '這次修練早已入帳', CHANGED = '卡牌剛有變動', QUOTA = '儲存空間不足', NO_LOCK = '請用支援安全儲存的新版瀏覽器修練';
// identity-conflict names its cause: another copy took the slot and this one is unchanged.
const OTHER_CARD = COMMAND_MESSAGES['other-card'];
const UNSYNCED = COMMAND_MESSAGES.unsynced, FIRST_RECEIPT = '已入帳的修練：Lv.1 → Lv.2 · 120 金幣 · 6 靈砂';
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROFILE_KEY);
const raw = page => page.evaluate(key => localStorage.getItem(key), PROFILE_KEY);
const writes = page => page.evaluate(() => window.commandSmokeWrites);
const reads = page => page.evaluate(() => window.commandSmokeReads);
const passed = label => { checks.push(label); console.log(`PASS ${label}`); };
const card = (profile, uid) => profile.instances.find(item => item.uid === uid);

/** `extra` more copies grow the save: cross-tab staleness grows with its size. */
function fixture({ extra = 0 } = {}) {
  let profile = createProfile({ now });
  const deck = new Set(getActiveDeck(profile).instanceIds);
  const target = profile.instances.find(item => !deck.has(item.uid));
  const sibling = mintInstance(profile, target.cardId, { now, source: 'command-fixture' });
  const other = mintInstance(sibling.profile, 'qingxiao', { now, source: 'command-fixture' });
  let grown = other.profile;
  for (let index = 0; index < extra; index++) grown = mintInstance(grown, 'qingxiao', { now, source: 'command-fixture' }).profile;
  profile = syncCollection({ ...grown, coins: 5000, dust: 300 });
  return { profile, target: target.uid, sibling: sibling.instance.uid, other: other.instance.uid };
}
async function contextFor(seed, { noLocks = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  contexts.add(context);
  await context.addInitScript(({ seed, key, now, noLocks }) => {
    const NativeDate = Date, fixed = new NativeDate(now).getTime();
    globalThis.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } };
    if (noLocks) Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined });
    if (!localStorage.getItem('command-smoke.seeded')) { localStorage.setItem(key, JSON.stringify(seed)); localStorage.setItem('command-smoke.seeded', 'yes'); }
    const nativeSet = Storage.prototype.setItem, nativeGet = Storage.prototype.getItem;
    window.commandSmokeWrites = 0; window.commandSmokeReads = 0; window.commandSmokeToasts = [];
    // Toasts remove themselves after 2.6 s; keep every message for assertions.
    new MutationObserver(records => { for (const record of records) for (const node of record.addedNodes) if (node.classList?.contains('toast')) window.commandSmokeToasts.push(node.textContent); })
      .observe(document, { childList: true, subtree: true });
    Storage.prototype.setItem = function(name, value) {
      if (this === localStorage && name === key && sessionStorage.getItem('command-smoke.quota') === 'yes') throw new DOMException('Synthetic command quota', 'QuotaExceededError');
      nativeSet.call(this, name, value);
      if (this === localStorage && name === key) window.commandSmokeWrites++;
    };
    Storage.prototype.getItem = function(name) {
      if (this === localStorage && name === key) window.commandSmokeReads++;
      return nativeGet.call(this, name);
    };
  }, { seed, key: PROFILE_KEY, now, noLocks });
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
  const page = await context.newPage(); installViewportNavigation(page); page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${new URL(response.url()).pathname}`); });
  await page.goto(base.href); await page.locator('.game-lobby').waitFor(); return page;
}
async function release(page) { const context = page.context(); await context.close(); contexts.delete(context); }
const upgradeButton = (page, uid) => page.locator(`.modal [data-action="instance-upgrade"][data-id="${uid}"]`);
async function passport(page, uid) {
  await page.locator('.game-dock [data-action="bag"]').click();
  await page.locator('[data-action="bag-layout"][data-id="copies"]').click();
  await page.locator(`.bag-grid [data-action="instance-inspect"][data-id="${uid}"]`).click();
  await page.locator('.instance-modal').waitFor();
}
/** The same card page through the app's delegated handler, without paging a large grid. */
async function passportDirect(page, uid) {
  await page.evaluate(uid => { const button = document.createElement('button'); button.dataset.action = 'instance-inspect'; button.dataset.id = uid; document.body.append(button); button.click(); button.remove(); }, uid);
  await page.locator(`.instance-modal [data-action="instance-upgrade"][data-id="${uid}"]`).waitFor();
}
const toastCount = page => page.evaluate(() => window.commandSmokeToasts.length);
const toastsSince = (page, from) => page.evaluate(from => window.commandSmokeToasts.slice(from), from);
const waitToast = (page, text, from) => page.waitForFunction(({ text, from }) => window.commandSmokeToasts.slice(from).some(message => message.includes(text)), { text, from });
/** Click, then wait for this action's own toast. */
async function press(page, locator, text) { const from = await toastCount(page); await locator.click(); await waitToast(page, text, from); }
const close = async page => { await page.locator('.modal-close').click(); await page.locator('.modal').waitFor({ state: 'hidden' }); };
async function upgradeNote(page) { return page.locator('.bag-passport-upgrade').innerText(); }
async function holdLock(page) {
  await page.evaluate(name => { window.commandSmokeHeld = false; window.commandSmokeLock = navigator.locks.request(name, () => new Promise(resolve => { window.releaseCommandSmoke = resolve; window.commandSmokeHeld = true; })); }, PROFILE_LOCK);
  await page.waitForFunction(() => window.commandSmokeHeld);
}
const releaseLock = page => page.evaluate(async () => { window.releaseCommandSmoke(); await window.commandSmokeLock; });
const idleLock = page => page.waitForFunction(async name => { const state = await navigator.locks.query(); return ![...state.held, ...state.pending].some(lock => lock.name === name); }, PROFILE_LOCK);

const browser = await engines[browserName].launch({ headless: true, ...(browserName === 'chromium' && existsSync(chrome) ? { executablePath: chrome } : {}) });
try {
  {
    const { profile, target, sibling } = fixture(), page = await pageIn(await contextFor(profile));
    const before = await read(page), startWrites = await writes(page);
    await passport(page, target);
    assert.match(await upgradeNote(page), /修練至 Lv\.2[\s\S]*120 金幣 · 6 靈砂/);
    await press(page, upgradeButton(page, target), COMMITTED);
    let saved = await read(page);
    assert.equal(await writes(page), startWrites + 1, 'one profile write');
    assert.equal(saved.commands.nextSeq, 2); assert.equal(saved.commands.retiredBelow, 1);
    assert.deepEqual(saved.commands.receipts[0].intent, { type: 'care.upgrade', uid: target, toLevel: 2 });
    assert.equal(saved.coins, before.coins - 120); assert.equal(saved.dust, before.dust - 6);
    assert.equal(card(saved, target).level, 2); assert.equal(card(saved, sibling).level, 1, 'the other copy keeps its level');
    assert.match(await upgradeNote(page), /修練至 Lv\.3[\s\S]*240 金幣 · 12 靈砂/, 'the card page repaints with a new quote');
    await press(page, upgradeButton(page, target), COMMITTED);
    saved = await read(page);
    assert.equal(saved.commands.nextSeq, 3);
    assert.equal(saved.coins, before.coins - 120 - 240); assert.equal(saved.dust, before.dust - 6 - 12);
    assert.equal(card(saved, target).level, 3); assert.equal(await writes(page), startWrites + 2);
    await page.reload(); await page.locator('.game-lobby').waitFor();
    const reloaded = await read(page);
    assert.equal(card(reloaded, target).level, 3); assert.deepEqual(reloaded.commands, saved.commands);
    await release(page);
    passed('B1 one click is one profile write with its receipt; 120×L / 6×L spent at L1 then L2; the level and ledger survive reload');
  }

  {
    const { profile, target } = fixture(), context = await contextFor(profile), first = await pageIn(context), second = await pageIn(context);
    await passport(first, target); await passport(second, target);
    const before = await read(first);
    await press(first, upgradeButton(first, target), COMMITTED);
    const after = await read(first), secondWrites = await writes(second);
    const fromDuplicate = await toastCount(second);
    await press(second, upgradeButton(second, target), DUPLICATE);
    assert((await toastsSince(second, fromDuplicate)).some(text => text.includes(FIRST_RECEIPT)), 'the duplicate names the accepted receipt');
    assert((await second.locator('#announcer').textContent()).includes(FIRST_RECEIPT), 'screen readers hear the receipt too');
    assert.deepEqual(await read(second), after, 'the stale card page spends nothing');
    assert.equal(await writes(second), secondWrites);
    assert.equal(after.coins, before.coins - 120);
    assert.match(await upgradeNote(second), /修練至 Lv\.3[\s\S]*240 金幣/, 'the stale page repaints with the new level and cost');
    await release(first);
    passed('B2 a card page left stale by another tab that upgraded the same copy is not charged the next level; it reports the accepted receipt and repaints');
  }

  {
    const { profile, target, other } = fixture(), context = await contextFor(profile), first = await pageIn(context), second = await pageIn(context);
    await passport(first, target); await passport(second, target);
    await first.locator(`.modal [data-action="instance-lock"][data-id="${target}"]`).click();
    await first.waitForFunction(({ key, uid }) => JSON.parse(localStorage.getItem(key)).instances.find(item => item.uid === uid).locked, { key: PROFILE_KEY, uid: target });
    const locked = await read(second), lockedWrites = await writes(second);
    await press(second, upgradeButton(second, target), CHANGED);
    assert.deepEqual(await read(second), locked, 'a record changed in another tab is not charged'); assert.equal(await writes(second), lockedWrites);
    assert.match(await second.locator('.instance-modal').innerText(), /已鎖定/, 'the refused page repaints from the saved journey');
    await close(first); await passport(first, other);
    await close(second); await passport(second, target);
    await press(first, upgradeButton(first, other), COMMITTED);
    const raced = await read(first), racedWrites = await writes(second);
    assert.equal(raced.commands.receipts[0].intent.uid, other);
    await press(second, upgradeButton(second, target), OTHER_CARD);
    assert.deepEqual(await read(second), raced, 'another copy committed in the same slot is an identity conflict'); assert.equal(await writes(second), racedWrites);
    assert.equal(card(raced, target).level, 1);
    await press(second, upgradeButton(second, target), COMMITTED);
    const settled = await read(second);
    assert.equal(card(settled, target).level, 2); assert.equal(card(settled, other).level, 2); assert.equal(settled.commands.nextSeq, 3);
    await release(first);
    passed('B2 a lock toggled in another tab refuses as changed, and another copy committed in the same slot refuses naming that cause, with no spend; the repainted page then commits once');
  }

  {
    const { profile, target } = fixture(), page = await pageIn(await contextFor(profile));
    const before = await read(page), startWrites = await writes(page);
    await passport(page, target);
    const from = await toastCount(page);
    await upgradeButton(page, target).evaluate(button => { button.dispatchEvent(new MouseEvent('click', { bubbles: true })); button.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await waitToast(page, COMMITTED, from); await idleLock(page);
    assert.equal((await toastsSince(page, from)).filter(message => message.includes(COMMITTED)).length, 1);
    const saved = await read(page);
    assert.equal(card(saved, target).level, 2); assert.equal(saved.coins, before.coins - 120);
    assert.equal(saved.commands.nextSeq, 2); assert.equal(await writes(page), startWrites + 1);
    await release(page);
    passed('B3 two click events on one upgrade button give one level, one spend and one write');
  }

  {
    const { profile, target } = fixture(), context = await contextFor(profile), first = await pageIn(context), second = await pageIn(context);
    await passport(first, target); await passport(second, target);
    const before = await read(first), beforeWrites = await writes(first) + await writes(second);
    const fromFirst = await toastCount(first), fromSecond = await toastCount(second);
    await holdLock(second);
    await upgradeButton(first, target).click(); await upgradeButton(second, target).click();
    assert.deepEqual(await read(first), before, 'nothing commits while another holder owns the lock');
    await releaseLock(second); await idleLock(first);
    await first.waitForFunction(from => window.commandSmokeToasts.length > from, fromFirst);
    await second.waitForFunction(from => window.commandSmokeToasts.length > from, fromSecond);
    const messages = [...await toastsSince(first, fromFirst), ...await toastsSince(second, fromSecond)];
    assert.equal(messages.filter(text => text.includes(COMMITTED)).length, 1, messages.join(' | '));
    assert.equal(messages.filter(text => text.includes(DUPLICATE)).length, 1, messages.join(' | '));
    assert(messages.some(text => text.includes(DUPLICATE) && text.includes(FIRST_RECEIPT)), messages.join(' | '));
    const saved = await read(first);
    assert.equal(card(saved, target).level, 2); assert.equal(saved.coins, before.coins - 120);
    assert.equal(await writes(first) + await writes(second), beforeWrites + 1);
    await release(first);
    passed('B4 two pages clicking behind a held native PROFILE_LOCK commit once; the second reports the accepted receipt');
  }

  {
    // B4 again with about 60 KB saved, where a plain Web Lock handed the next page stale
    // localStorage in about half of the Chromium rounds: the same copy (one commit, one
    // duplicate) and sibling copies in one slot (one commit, one identity conflict).
    const rounds = Number(process.env.COMMAND_SMOKE_ROUNDS || 4), outcomes = [];
    for (const variant of ['same', 'sibling']) for (let round = 0; round < rounds; round++) {
      const { profile, target, sibling } = fixture({ extra: 300 }), context = await contextFor(profile), first = await pageIn(context), second = await pageIn(context);
      const other = variant === 'same' ? target : sibling, answer = variant === 'same' ? DUPLICATE : OTHER_CARD;
      await passportDirect(first, target); await passportDirect(second, other);
      const before = await read(first), beforeWrites = await writes(first) + await writes(second);
      const fromFirst = await toastCount(first), fromSecond = await toastCount(second);
      await holdLock(second);
      await upgradeButton(first, target).click(); await upgradeButton(second, other).click();
      await releaseLock(second); await idleLock(first);
      await first.waitForFunction(from => window.commandSmokeToasts.length > from, fromFirst);
      await second.waitForFunction(from => window.commandSmokeToasts.length > from, fromSecond);
      const messages = [...await toastsSince(first, fromFirst), ...await toastsSince(second, fromSecond)], saved = await read(first);
      const upgraded = [target, sibling].filter(uid => card(saved, uid).level === 2);
      outcomes.push({
        variant, round, bytes: (await raw(first)).length, messages,
        committed: messages.filter(text => text.includes(COMMITTED)).length, answered: messages.filter(text => text.includes(answer)).length,
        writes: await writes(first) + await writes(second) - beforeWrites, receipts: saved.commands.receipts.map(receipt => receipt.intent.uid),
        upgraded, spent: before.coins - saved.coins,
      });
      await release(first);
    }
    const bad = outcomes.filter(outcome => outcome.committed !== 1 || outcome.answered !== 1 || outcome.writes !== 1 || outcome.spent !== 120
      || outcome.upgraded.length !== 1 || outcome.receipts.length !== 1 || outcome.receipts[0] !== outcome.upgraded[0]);
    assert.deepEqual(bad, [], JSON.stringify(bad, null, 1));
    assert(outcomes.filter(outcome => outcome.variant === 'same').every(outcome => outcome.messages.some(text => text.includes(FIRST_RECEIPT))));
    passed(`B4 at ${outcomes[0].bytes} B saved, ${rounds} rounds per case: the same copy commits once and the other page gets the receipt; sibling copies in one slot commit once and the other page is told another card took the slot`);
  }

  {
    // The fence itself, across two real pages (renderers): A writes under the lock while B
    // waits for it; B's callback must then read A's bytes. Synthetic keys, lock and database.
    const PAD = 50_000, rounds = Number(process.env.COMMAND_SMOKE_HANDOFFS || 30);
    const context = await contextFor(fixture().profile), a = await pageIn(context), b = await pageIn(context);
    for (const page of [a, b]) await page.evaluate(async () => {
      const fence = await import('/profile-fence.mjs');
      const store = fence.createIndexedDBFence(indexedDB, { name: 'command-smoke-fence', key: 'probe' });
      const gated = callback => navigator.locks.request('command-smoke-fence', async () => { if (window.fenceGate) await window.fenceGate; return callback(); });
      window.fenceLocks = { raw: gated, fenced: fence.createFencedLock({ request: gated, fence: store, read: () => localStorage.getItem('command-smoke.fence'), strict: true }) };
    });
    const results = {};
    for (const mode of ['raw', 'fenced']) {
      let stale = 0, refused = 0;
      for (let round = 0; round < rounds; round++) {
        const written = `${mode}${round}:${'x'.repeat(PAD)}`;
        await a.evaluate(({ mode, written }) => {
          let open; window.fenceGate = new Promise(resolve => { open = resolve; }); window.openFenceGate = open;
          window.fenceDone = window.fenceLocks[mode](() => { localStorage.setItem('command-smoke.fence', written); });
        }, { mode, written });
        await a.waitForFunction(async () => (await navigator.locks.query()).held.some(lock => lock.name === 'command-smoke-fence'));
        await b.evaluate(mode => { window.fenceGate = null; window.fenceRead = window.fenceLocks[mode](() => localStorage.getItem('command-smoke.fence')).catch(error => `refused:${error.code}`); }, mode);
        await b.waitForFunction(async () => (await navigator.locks.query()).pending.some(lock => lock.name === 'command-smoke-fence'));
        await a.evaluate(async () => { window.openFenceGate(); await window.fenceDone; window.fenceGate = null; });
        const seen = await b.evaluate(() => window.fenceRead);
        if (typeof seen === 'string' && seen.startsWith('refused:')) refused++; else if (seen !== written) stale++;
      }
      results[mode] = { stale, refused };
    }
    assert.deepEqual(results.fenced, { stale: 0, refused: 0 }, JSON.stringify(results));
    await release(a);
    passed(`B7 across two pages at ${PAD} B, the fenced lock's next holder read the previous write in ${rounds}/${rounds} handoffs (plain-lock control on this run: ${results.raw.stale}/${rounds} stale)`);
  }

  {
    // A fence left "writing" (a page that died between its save and the record) or an edit
    // made outside the lock refuses the upgrade with nothing written; the next page load's
    // own save records the fence again, and the same card page then commits.
    const { profile, target } = fixture(), page = await pageIn(await contextFor(profile));
    const fenceState = () => page.evaluate(async () => (await (await import('/profile-fence.mjs')).createIndexedDBFence(indexedDB).read())?.state ?? null);
    assert.equal(await fenceState(), 'settled', 'the startup save records the fence');
    await passport(page, target);
    await page.evaluate(async () => (await import('/profile-fence.mjs')).createIndexedDBFence(indexedDB).write({ v: 1, state: 'writing' }));
    let bytes = await raw(page), startWrites = await writes(page);
    await press(page, upgradeButton(page, target), UNSYNCED);
    assert.equal(await raw(page), bytes); assert.equal(await writes(page), startWrites);
    await page.reload(); await page.locator('.game-lobby').waitFor();
    assert.equal(await fenceState(), 'settled', 'the reload healed it');
    await passport(page, target);
    await press(page, upgradeButton(page, target), COMMITTED);
    assert.equal(card(await read(page), target).level, 2);
    await page.evaluate(key => { const saved = JSON.parse(localStorage.getItem(key)); saved.coins += 1; localStorage.setItem(key, JSON.stringify(saved)); }, PROFILE_KEY);
    bytes = await raw(page); startWrites = await writes(page);
    await press(page, upgradeButton(page, target), UNSYNCED);
    assert.equal(await raw(page), bytes); assert.equal(await writes(page), startWrites);
    await page.reload(); await page.locator('.game-lobby').waitFor();
    await passport(page, target);
    await press(page, upgradeButton(page, target), COMMITTED);
    const saved = await read(page);
    assert.equal(card(saved, target).level, 3); assert.equal(saved.coins, profile.coins + 1 - 120 - 240, 'the edit was kept, not overwritten');
    await release(page);
    passed('B8 an unsettled fence or an edit outside the lock refuses the upgrade with no write; a reload heals the fence and the upgrade then commits');
  }

  {
    // IndexedDB that refuses the fence's writing mark for lack of space (synthetic, as in B5):
    // the upgrade asks for space, never for another browser, and commits once space returns.
    const { profile, target } = fixture(), page = await pageIn(await contextFor(profile));
    await passport(page, target);
    await page.evaluate(() => {
      const put = IDBObjectStore.prototype.put;
      window.fenceRefusals = 0;
      window.restoreFencePut = () => { IDBObjectStore.prototype.put = put; };
      IDBObjectStore.prototype.put = function() { window.fenceRefusals++; throw new DOMException('Synthetic fence quota', 'QuotaExceededError'); };
    });
    const bytes = await raw(page), startWrites = await writes(page), from = await toastCount(page);
    await press(page, upgradeButton(page, target), QUOTA);
    assert(!(await toastsSince(page, from)).some(message => message.includes(NO_LOCK)), 'not told to change browsers');
    assert(await page.evaluate(() => window.fenceRefusals) > 0, 'the fence write was refused');
    assert.equal(await raw(page), bytes); assert.equal(await writes(page), startWrites, 'the profile was never written');
    await page.evaluate(() => window.restoreFencePut());
    await press(page, upgradeButton(page, target), COMMITTED);
    assert.equal(card(await read(page), target).level, 2); assert.equal(await writes(page), startWrites + 1);
    await release(page);
    passed('B9 IndexedDB refusing the fence write for lack of space refuses the upgrade with the storage copy, not the browser copy, and no write; it then commits');
  }

  {
    // A local recovery restore that the strict fence refuses (a transient IndexedDB failure,
    // a tab still behind) changes nothing and keeps its dialog. Pressing 復原本機旅程 again,
    // as the refusal invites, must restore once the fence passes, never claim that the
    // backup changed; a press while the restore is in flight is ignored.
    const { profile } = fixture(), earlier = { ...profile, coins: 777, dust: 11 };
    const page = await pageIn(await contextFor(profile));
    const recovery = JSON.stringify({ savedAt: now, snapshot: createSnapshot(earlier) });
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: RECOVERY_KEY, value: recovery });
    const readRecovery = () => page.evaluate(key => localStorage.getItem(key), RECOVERY_KEY);
    await page.evaluate(() => { const button = document.createElement('button'); button.dataset.action = 'restore-recovery'; document.body.append(button); button.click(); button.remove(); });
    const confirm = page.locator('.modal [data-action="confirm-restore-recovery"]');
    await confirm.waitFor();
    const bytes = await raw(page), startWrites = await writes(page), start = await toastCount(page);
    const unchanged = async label => {
      assert(await confirm.isVisible(), `${label}: the dialog stays open`);
      assert.equal(await raw(page), bytes, `${label}: profile unchanged`); assert.equal(await writes(page), startWrites);
      assert.equal(await readRecovery(), recovery, `${label}: recovery copy unchanged`);
    };
    await page.evaluate(() => {
      const get = IDBObjectStore.prototype.get;
      IDBObjectStore.prototype.get = function() { IDBObjectStore.prototype.get = get; throw new DOMException('Synthetic transient fence failure', 'UnknownError'); };
    });
    await press(page, confirm, FENCE_MESSAGES.unavailable);
    await unchanged('unavailable');
    await page.evaluate(async () => (await import('/profile-fence.mjs')).createIndexedDBFence(indexedDB).write({ v: 1, state: 'settled', digest: '1:deadbeefdeadbeef' }));
    await press(page, confirm, FENCE_MESSAGES.unsynced);
    await unchanged('unsynced');
    await page.evaluate(async key => {
      const { createIndexedDBFence, profileDigest } = await import('/profile-fence.mjs');
      await createIndexedDBFence(indexedDB).write({ v: 1, state: 'settled', digest: profileDigest(localStorage.getItem(key)) });
    }, PROFILE_KEY);
    const from = await toastCount(page);
    await page.evaluate(() => { const button = document.querySelector('.modal [data-action="confirm-restore-recovery"]'); button.click(); button.click(); });
    await waitToast(page, '已復原上次本機旅程', from);
    await page.locator('.modal').waitFor({ state: 'hidden' });
    const toasts = await toastsSince(page, start);
    assert(!toasts.some(message => message.includes('回復備份已更新')), `never told the backup changed: ${JSON.stringify(toasts)}`);
    assert.equal(toasts.filter(message => message.includes('已復原上次本機旅程')).length, 1, 'one restore for two presses');
    const saved = await read(page);
    assert.equal(saved.coins, 777); assert.equal(saved.dust, 11); assert.equal(await writes(page), startWrites + 1);
    assert.deepEqual(JSON.parse(await readRecovery()).snapshot, createSnapshot(JSON.parse(bytes)), 'the replaced journey became the recovery copy');
    await release(page);
    passed('B10 a local recovery restore refused by the fence (unavailable, then unsynced) changes nothing and keeps its dialog; pressing it again restores once, never claiming the backup changed');
  }

  {
    const { profile, target } = fixture(), page = await pageIn(await contextFor(profile));
    await passport(page, target);
    const bytes = await raw(page), startWrites = await writes(page);
    await page.evaluate(() => sessionStorage.setItem('command-smoke.quota', 'yes'));
    await press(page, upgradeButton(page, target), QUOTA);
    assert.equal(await raw(page), bytes, 'stored bytes unchanged'); assert.equal(await writes(page), startWrites);
    assert(await upgradeButton(page, target).isEnabled(), 'the refreshed card page can retry');
    await page.evaluate(() => sessionStorage.removeItem('command-smoke.quota'));
    await press(page, upgradeButton(page, target), COMMITTED);
    const saved = await read(page);
    assert.equal(card(saved, target).level, 2); assert.equal(saved.commands.nextSeq, 2); assert.equal(await writes(page), startWrites + 1);
    await page.reload(); await page.locator('.game-lobby').waitFor();
    assert.deepEqual(await read(page), saved);
    await release(page);
    passed('B5 a quota refusal changes no stored byte; an explicit retry commits once and survives reload');
  }

  {
    const { profile, target } = fixture(), page = await pageIn(await contextFor(profile, { noLocks: true }));
    assert.equal(await page.evaluate(() => navigator.locks), undefined);
    await passport(page, target);
    const bytes = await raw(page), startWrites = await writes(page), startReads = await reads(page);
    await press(page, upgradeButton(page, target), NO_LOCK);
    assert.equal(await reads(page), startReads, 'the commit never reads the profile');
    assert.equal(await raw(page), bytes); assert.equal(await writes(page), startWrites);
    await release(page);
    passed('B6 without Web Locks the upgrade is refused before any profile read or write');
  }

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, browser: browserName, evidence: 'Isolated synthetic saves and loopback assets only; no real user/account data.', checks, browserErrors: errors }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, browser: browserName, passed: checks, errors, error: error.stack }, null, 2)); process.exitCode = 1;
} finally {
  await Promise.allSettled([...contexts].map(context => context.close())); await browser.close();
}
