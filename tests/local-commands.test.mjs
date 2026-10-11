import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProfile, PROFILE_KEY, upgradeInstance, trainInstance, claimLogin, claimTask, claimWeeklyTask, claimArenaChest,
  buyPack, buyWX01Box, acknowledgeWX01Receipt, buyCard, getMarket, sellInstance, buybackInstance, setLeaderInstance,
  beginBattle, finishBattle, abandonBattle, startActivity, advanceActivity, abandonActivity, claimExpansionGrant,
  openWX01Ticket, refreshDaily,
} from '../progression.mjs';
import {
  mintInstance, setInstanceXP, toggleInstanceLock, saveInstanceDeck, activateDeck, deleteDeck, getActiveDeck,
  getXPThreshold, isInstanceInJourney,
} from '../collection.mjs';
import { previewInheritance, inheritInstances } from '../inheritance.mjs';
import { claimPlaytestSupply } from '../playtest-supply.mjs';
import { createProfileStore, assertLocalProfile } from '../profile-store.mjs';
import { createSnapshot, restoreSnapshot } from '../cloud-save.mjs';
import { previewCommand, commitCommand, readCommandReceipt, receiptSummary, duplicateMessage, COMMAND_MESSAGES } from '../local-commands.mjs';
import { MAX_COMMAND_SEQ, retireCommandLedger, commandLedgerJSON, assertLedgerUnchanged } from '../command-ledger.mjs';
import { nearEnvelopeProfile } from './support/profile-envelope.mjs';

const now = '2026-09-21T12:00:00.000Z';
const tomorrow = '2026-09-22T12:00:00.000Z';
const at = '2026-09-21T12:34:56.789Z';
const clock = () => new Date(at);
const copy = value => structuredClone(value);
const UPGRADE = 'care.upgrade';
function rich() { const profile = createProfile({ now }); profile.coins = 100_000; profile.dust = 10_000; return profile; }
const uidOf = (profile, cardId) => profile.instances.find(instance => instance.cardId === cardId).uid;
const outsideDeck = profile => profile.instances.find(instance => !getActiveDeck(profile).instanceIds.includes(instance.uid)).uid;
const instanceOf = (profile, uid) => profile.instances.find(instance => instance.uid === uid);
const withoutCommands = profile => { const { commands, ...rest } = profile; return rest; };

/** One shared Map is one browser origin; each store over it is one tab. */
function harness(profile) {
  const data = new Map(profile === undefined ? [] : [[PROFILE_KEY, typeof profile === 'string' ? profile : JSON.stringify(profile)]]);
  const log = [], faults = { set: null, get: null };
  let depth = 0;
  const storage = {
    getItem(key) { log.push({ op: 'get', key, locked: depth > 0 }); faults.get?.(key); return data.get(key) ?? null; },
    setItem(key, value) {
      log.push({ op: 'set', key, locked: depth > 0 });
      if (faults.set?.(key) === 'land-then-throw') { data.set(key, value); throw new DOMException('Fixture write landed, then reported failure', 'UnknownError'); }
      data.set(key, value);
    },
  };
  // A serial fake lock: callbacks never overlap, like an exclusive Web Lock.
  let chain = Promise.resolve();
  const lock = fn => {
    const run = chain.then(() => { depth++; try { return fn(); } finally { depth--; } });
    chain = run.catch(() => {});
    return run;
  };
  const store = createProfileStore({ storage, now: () => now });
  const tab = () => createProfileStore({ storage: { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }, now: () => now });
  return {
    data, log, faults, storage, store, lock, tab,
    bytes: () => data.get(PROFILE_KEY), saved: () => JSON.parse(data.get(PROFILE_KEY)),
    writes: () => log.filter(entry => entry.op === 'set').length, reads: () => log.filter(entry => entry.op === 'get').length,
    clear: () => { log.length = 0; },
  };
}
const quote = (h, uid) => previewCommand(h.store.load(), { type: UPGRADE, uid });
const commit = (h, request, options = {}) => commitCommand(request, { store: h.store, lock: h.lock, now: clock, ...options });
/** Another tab changes the journey without a command. */
function edit(h, change) { const store = h.tab(); store.save(change(store.load())); }

test('N1 preview is pure, deterministic and equals the existing rule', () => {
  let profile = rich(); const uid = uidOf(profile, 'qingxiao');
  profile = setInstanceXP(profile, uid, 105);
  const h = harness(profile), loaded = h.store.load(); h.clear();
  const before = JSON.stringify(loaded);
  const first = previewCommand(loaded, { type: UPGRADE, uid }), second = previewCommand(loaded, { type: UPGRADE, uid });
  assert.equal(h.log.length, 0, 'no storage calls');
  assert.equal(JSON.stringify(loaded), before, 'input unchanged');
  assert.deepEqual(first, second);
  assert.ok(Object.isFrozen(first.request.intent), 'requests are not edited by the UI');
  const ruled = upgradeInstance(loaded, uid), target = instanceOf(ruled, uid);
  assert.deepEqual(first.costs, { coins: 240, dust: 12 });
  assert.deepEqual(first.costs, { coins: loaded.coins - ruled.coins, dust: loaded.dust - ruled.dust });
  assert.deepEqual(first.effects, { cardId: 'qingxiao', printId: 'legacy/qingxiao', fromLevel: 2, toLevel: 3, fromXP: 105, toXP: getXPThreshold(3) });
  assert.equal(target.xp, first.effects.toXP); assert.equal(target.level, first.effects.toLevel);
  assert.deepEqual(first.selectedUids, [uid]); assert.equal(first.commandType, UPGRADE);
  assert.deepEqual(first.blockers, []);
  assert.deepEqual(Object.keys(first.request).sort(), ['commandId', 'expectedFingerprint', 'intent']);
  assert.equal(first.request.commandId, 'cmd-1');
  assert.deepEqual(first.request.intent, { type: UPGRADE, uid, toLevel: 3 });
  assert.equal(typeof first.request.expectedFingerprint, 'string');
  const withLedger = { ...copy(loaded), commands: { version: 1, nextSeq: 7, retiredBelow: 7, receipts: [] } };
  assert.equal(previewCommand(withLedger, { type: UPGRADE, uid }).request.commandId, 'cmd-7', 'the slot is the ledger nextSeq');
  const richer = { ...copy(loaded), coins: loaded.coins + 5 };
  assert.equal(previewCommand(richer, { type: UPGRADE, uid }).request.expectedFingerprint, first.request.expectedFingerprint, 'balances are not fingerprinted');
});

test('N2 preview blockers carry the existing rule text and never offer a request', () => {
  const base = rich(), uid = outsideDeck(base);
  const blocked = (profile, target) => previewCommand(profile, { type: UPGRADE, uid: target });
  const check = (preview, code, message) => {
    assert.equal(preview.request, null, code);
    assert.equal(preview.blockers[0].code, code);
    assert.equal(preview.blockers[0].message, message);
  };
  check(blocked(base, 'card-999999'), 'missing', '背包中找不到這張卡牌實體。');
  const minted = mintInstance(base, 'qingxiao', { now, source: 'fixture' });
  check(blocked(sellInstance(minted.profile, minted.instance.uid, now), minted.instance.uid), 'missing', '背包中找不到這張卡牌實體。');
  const battle = beginBattle(base, { kind: 'arena', now }).profile, fighting = battle.pending.instanceIds[0];
  check(blocked(battle, fighting), 'in-journey', '這張卡牌正在出戰，完成旅程後才可修練。');
  const cleared = { ...copy(base), cleared: ['mist-gate'] };
  const started = startActivity(cleared, { route: 'owned', rng: () => 0.1, now });
  const between = finishBattle(started.profile, { encounterId: started.encounter.id, winner: 'player', finalResources: { hp: 12, pills: 12 }, now }).profile;
  const runner = between.expansion.fireMountain.run.instanceIds[0];
  assert.equal(between.pending, null); assert.equal(isInstanceInJourney(between, runner), true);
  check(blocked(between, runner), 'in-journey', '這張卡牌正在出戰，完成旅程後才可修練。');
  const maxed = blocked(setInstanceXP(base, uid, 700), uid);
  check(maxed, 'maxed', '這張卡牌已達最高修為。');
  assert.equal(maxed.costs, null); assert.equal(maxed.effects, null);
  check(blocked({ ...copy(base), coins: 119 }, uid), 'coins', '金幣不足。');
  check(blocked({ ...copy(base), dust: 5 }, uid), 'dust', '靈砂不足。');
  for (const intent of [{ type: UPGRADE, uid: 'qingxiao' }, { type: 'care.train', uid }, { type: UPGRADE, uid, toLevel: 2 }, { type: UPGRADE }, null]) {
    assert.throws(() => previewCommand(base, intent), RangeError, JSON.stringify(intent));
  }
});

test('N3 a commit writes effects and an exact receipt in one profile write', async () => {
  const base = rich(), uid = outsideDeck(base), h = harness(base);
  const before = h.store.load(), { request } = previewCommand(before, { type: UPGRADE, uid }); h.clear();
  const result = await commit(h, request);
  assert.equal(result.status, 'committed'); assert.equal(result.duplicate, false);
  assert.deepEqual(h.log.filter(entry => entry.op === 'set').map(entry => entry.key), [PROFILE_KEY]);
  const saved = h.saved();
  assert.deepEqual(withoutCommands(saved), upgradeInstance(before, uid));
  assert.deepEqual(saved, result.profile);
  const receipt = {
    seq: 1, intent: { type: UPGRADE, uid, toLevel: 2 }, at,
    result: { cardId: instanceOf(before, uid).cardId, printId: instanceOf(before, uid).printId, fromLevel: 1, toLevel: 2, fromXP: 0, toXP: 80, coins: 120, dust: 6, coinsAfter: before.coins - 120, dustAfter: before.dust - 6 },
  };
  assert.deepEqual(saved.commands, { version: 1, nextSeq: 2, retiredBelow: 1, receipts: [receipt] });
  assert.deepEqual(result.receipt, receipt);
  assert.deepEqual(h.store.load(), saved, 'the committed profile reloads unchanged');
});

test('N4 every storage access of a commit happens inside the lock callback', async () => {
  const base = rich(), uid = outsideDeck(base), h = harness(base);
  const { request } = quote(h, uid); h.clear();
  await commit(h, request);
  assert.ok(h.log.length >= 2);
  assert.deepEqual(h.log.filter(entry => !entry.locked), []);
  h.clear(); await commit(h, request);
  assert.ok(h.log.length >= 1); assert.deepEqual(h.log.filter(entry => !entry.locked), [], 'duplicate lookups too');
});

test('N5 a duplicate returns the original receipt without a write, even after the copy changed', async () => {
  const base = rich(), uid = outsideDeck(base), h = harness(base);
  const { request } = quote(h, uid), first = await commit(h, request);
  const balances = () => { const saved = h.saved(); return [saved.coins, saved.dust]; }, spent = balances();
  h.clear();
  const again = await commit(h, request);
  assert.equal(again.status, 'committed'); assert.equal(again.duplicate, true);
  assert.deepEqual(again.receipt, first.receipt); assert.equal(h.writes(), 0); assert.deepEqual(balances(), spent);
  edit(h, profile => { instanceOf(profile, uid).battles = 3; return profile; });
  h.clear(); const afterBattles = await commit(h, request);
  assert.equal(afterBattles.duplicate, true); assert.equal(h.writes(), 0);
  edit(h, profile => setInstanceXP(profile, uid, 700));
  h.clear(); const afterMax = await commit(h, request);
  assert.equal(afterMax.status, 'committed'); assert.equal(afterMax.duplicate, true);
  assert.deepEqual(afterMax.receipt, first.receipt); assert.equal(h.writes(), 0); assert.deepEqual(balances(), spent);
});

test('N25 a duplicate names the accepted receipt: its real levels and costs, not the stale page\'s quote', async () => {
  const base = rich(), uid = outsideDeck(base), h = harness(base);
  const { request } = quote(h, uid), first = await commit(h, request);
  edit(h, profile => setInstanceXP(profile, uid, 200)); // later progress elsewhere; the quote is now stale
  const again = await commit(h, request);
  assert.equal(again.duplicate, true);
  assert.equal(receiptSummary(again.receipt), 'Lv.1 → Lv.2 · 120 金幣 · 6 靈砂');
  assert.equal(duplicateMessage(again.receipt), `${COMMAND_MESSAGES.duplicate}已入帳的修練：Lv.1 → Lv.2 · 120 金幣 · 6 靈砂。`);
  assert.ok(duplicateMessage(again.receipt).startsWith(COMMAND_MESSAGES.duplicate));
  assert.deepEqual(again.receipt, first.receipt);
  const second = await commit(h, quote(h, uid).request);
  assert.equal(receiptSummary(second.receipt), 'Lv.3 → Lv.4 · 360 金幣 · 18 靈砂');
  for (const missing of [null, undefined, {}, { result: null }]) {
    assert.equal(receiptSummary(missing), ''); assert.equal(duplicateMessage(missing), COMMAND_MESSAGES.duplicate);
  }
});

test('N6 a changed payload under the same identity is rejected; malformed requests never read storage', async () => {
  const base = rich(), uid = outsideDeck(base), other = base.instances.find(item => item.uid !== uid).uid, h = harness(base);
  const { request } = quote(h, uid); await commit(h, request);
  // Another uid carrying this fingerprint cannot match its own preview; the same uid at
  // another level means this copy's slot was taken (N26 covers the copy for each cause).
  for (const [intent, message] of [[{ ...request.intent, uid: other }, 'other-card-changed'], [{ ...request.intent, toLevel: 3 }, 'identity-conflict']]) {
    h.clear();
    const result = await commit(h, { ...request, intent });
    assert.equal(result.status, 'rejected'); assert.equal(result.reason, 'identity-conflict');
    assert.equal(result.message, COMMAND_MESSAGES[message]); assert.equal(h.writes(), 0);
  }
  for (const bad of [
    { ...request, extra: true }, { ...request, commandId: 'cmd-0' }, { ...request, commandId: 'upgrade-1' },
    { ...request, intent: { ...request.intent, cardId: 'qingxiao' } }, { ...request, expectedFingerprint: '' },
    { commandId: request.commandId, intent: request.intent }, null, 'cmd-1',
  ]) {
    h.clear();
    const result = await commit(h, bad);
    assert.deepEqual([result.status, result.reason], ['rejected', 'invalid'], JSON.stringify(bad));
    assert.equal(h.log.length, 0, 'storage not read');
  }
});

test('N7 a stale preview cannot spend: record, journey and slot changes refuse; balance gains still commit', async () => {
  const base = rich(), uid = outsideDeck(base);
  const wukong = mintInstance(base, 'wukong', { now, printId: 'wx01-005-aa1', source: 'fixture' });
  const donor = mintInstance(wukong.profile, 'wukong', { now, printId: 'legacy/wukong', source: 'fixture' });
  const spare = mintInstance(donor.profile, 'qingxiao', { now, source: 'fixture' }), journey = spare.profile;
  const cases = [
    ['xp within the level', uid, profile => setInstanceXP(profile, uid, 10), 'stale'],
    ['level', uid, profile => setInstanceXP(profile, uid, 80), 'stale'],
    ['battles', uid, profile => { instanceOf(profile, uid).battles = 1; return profile; }, 'stale'],
    ['locked', uid, profile => toggleInstanceLock(profile, uid), 'stale'],
    ['printing', wukong.instance.uid, profile => { instanceOf(profile, wukong.instance.uid).printId = 'wx01-005-base'; return profile; }, 'stale'],
    ['inheritance onto the target', wukong.instance.uid, profile => inheritInstances(profile, previewInheritance(profile, wukong.instance.uid, [donor.instance.uid])).profile, 'stale'],
    ['pending battle', null, profile => beginBattle(profile, { kind: 'arena', now }).profile, 'blocked', '這張卡牌正在出戰，完成旅程後才可修練。'],
    ['sold', spare.instance.uid, profile => sellInstance(profile, spare.instance.uid, now), 'blocked', '背包中找不到這張卡牌實體。'],
    ['balance drop below cost', uid, profile => ({ ...profile, coins: 100 }), 'blocked', '金幣不足。'],
  ];
  for (const [name, target, change, reason, message] of cases) {
    const h = harness(journey), targetUid = target ?? getActiveDeck(journey).instanceIds[0];
    const { request } = quote(h, targetUid);
    edit(h, change); const bytes = h.bytes(); h.clear();
    const result = await commit(h, request);
    assert.deepEqual([result.status, result.reason], ['rejected', reason], name);
    assert.equal(result.message, message ?? COMMAND_MESSAGES.stale, name);
    assert.equal(h.writes(), 0, name); assert.equal(h.bytes(), bytes, name);
  }
  {
    const h = harness(base), { request } = quote(h, uid);
    const result = await commit(h, { ...request, commandId: 'cmd-5' });
    assert.deepEqual([result.status, result.reason], ['rejected', 'stale'], 'a slot ahead of the ledger');
  }
  {
    const h = harness(base), { request } = quote(h, uid);
    edit(h, profile => ({ ...profile, coins: profile.coins + 500 }));
    const result = await commit(h, request);
    assert.equal(result.status, 'committed', 'a balance gain alone is not stale');
    assert.equal(h.saved().coins, base.coins + 500 - 120);
  }
});

test('N8 two tabs: the same preview spends once; different copies in one slot conflict', async () => {
  {
    const base = rich(), uid = outsideDeck(base), h = harness(base);
    const tabA = previewCommand(h.tab().load(), { type: UPGRADE, uid }).request;
    const tabB = previewCommand(h.tab().load(), { type: UPGRADE, uid }).request;
    h.clear();
    const [a, b] = await Promise.all([commit(h, tabA), commit(h, tabB)]);
    assert.deepEqual([a.duplicate, b.duplicate], [false, true]);
    assert.deepEqual(b.receipt, a.receipt);
    assert.equal(h.writes(), 1);
    assert.equal(h.saved().coins, base.coins - 120);
    assert.equal(instanceOf(h.saved(), uid).level, 2);
  }
  {
    const base = rich(), [first, second] = base.instances.filter(item => !getActiveDeck(base).instanceIds.includes(item.uid)).map(item => item.uid), h = harness(base);
    const tabA = quote(h, first).request, tabB = quote(h, second).request;
    assert.equal(tabA.commandId, tabB.commandId);
    h.clear();
    const [a, b] = await Promise.all([commit(h, tabA), commit(h, tabB)]);
    assert.equal(a.status, 'committed');
    assert.deepEqual([b.status, b.reason], ['rejected', 'identity-conflict']);
    assert.equal(h.writes(), 1);
    assert.equal(instanceOf(h.saved(), second).level, 1);
  }
});

test('N26 an identity conflict names its cause: another copy took the slot, with this copy unchanged or not', async () => {
  const base = rich(), [x, y] = base.instances.filter(item => !getActiveDeck(base).instanceIds.includes(item.uid)).map(item => item.uid);
  {
    // Another tab upgraded a different copy in the same slot; this copy is untouched.
    const h = harness(base), tabA = quote(h, x), tabB = quote(h, y);
    assert.equal(tabA.request.commandId, tabB.request.commandId);
    assert.equal((await commit(h, tabB.request)).status, 'committed');
    const record = JSON.stringify(instanceOf(h.saved(), x)); h.clear();
    const refused = await commit(h, tabA.request);
    assert.deepEqual([refused.status, refused.reason, refused.message], ['rejected', 'identity-conflict', COMMAND_MESSAGES['other-card']]);
    assert.equal(h.writes(), 0); assert.equal(JSON.stringify(instanceOf(h.saved(), x)), record, 'the copy really is unchanged');
    const repainted = quote(h, x);
    assert.deepEqual([repainted.costs, repainted.effects, repainted.request.intent, repainted.request.expectedFingerprint],
      [tabA.costs, tabA.effects, tabA.request.intent, tabA.request.expectedFingerprint], 'only the slot moved');
    assert.notEqual(repainted.request.commandId, tabA.request.commandId);
    const pressed = await commit(h, repainted.request);
    assert.deepEqual([pressed.status, pressed.duplicate], ['committed', false], 'the next press commits');
    assert.equal(instanceOf(h.saved(), x).level, 2);
  }
  for (const [name, change] of [
    ['this copy changed too', profile => toggleInstanceLock(profile, x)],
    ['this copy is no longer affordable', profile => ({ ...profile, coins: 100 })],
  ]) {
    // The copy never claims this card is unchanged unless its fresh preview proves it.
    const h = harness(base), tabA = quote(h, x), tabB = quote(h, y);
    await commit(h, tabB.request); edit(h, change); const bytes = h.bytes(); h.clear();
    const refused = await commit(h, tabA.request);
    assert.deepEqual([refused.reason, refused.message], ['identity-conflict', COMMAND_MESSAGES['other-card-changed']], name);
    assert.equal(h.writes(), 0, name); assert.equal(h.bytes(), bytes, name);
  }
  {
    // This copy's own slot was taken at another level (it levelled from XP, then upgraded elsewhere): it did change.
    const h = harness(base), tabA = quote(h, x);
    edit(h, profile => setInstanceXP(profile, x, getXPThreshold(2)));
    const tabB = quote(h, x);
    assert.deepEqual([tabB.request.commandId, tabB.request.intent.toLevel], [tabA.request.commandId, 3]);
    await commit(h, tabB.request); h.clear();
    const refused = await commit(h, tabA.request);
    assert.deepEqual([refused.reason, refused.message], ['identity-conflict', COMMAND_MESSAGES['identity-conflict']]);
    assert.equal(h.writes(), 0);
  }
});

test('N9 without a lock the command is refused before storage is touched', async () => {
  const base = rich(), uid = outsideDeck(base), h = harness(base);
  const { request } = quote(h, uid); h.clear();
  for (const lock of [null, undefined, 'navigator.locks']) {
    const result = await commitCommand(request, { store: h.store, lock, now: clock });
    assert.deepEqual([result.status, result.reason, result.message], ['rejected', 'no-lock', COMMAND_MESSAGES['no-lock']]);
  }
  assert.equal(h.log.length, 0);
});

test('N10 a lock that fails before the callback is lock-failed; after it, the outcome is unknown', async () => {
  const base = rich(), uid = outsideDeck(base), h = harness(base);
  const { request } = quote(h, uid); h.clear();
  const refused = await commit(h, request, { lock: () => Promise.reject(new DOMException('Aborted', 'AbortError')) });
  assert.deepEqual([refused.status, refused.reason], ['rejected', 'lock-failed']); assert.equal(h.log.length, 0);
  const skipped = await commit(h, request, { lock: async () => 'never ran' });
  assert.deepEqual([skipped.status, skipped.reason], ['rejected', 'lock-failed']); assert.equal(h.log.length, 0);
  const late = await commit(h, request, { lock: async callback => { callback(); throw new DOMException('Aborted', 'AbortError'); } });
  assert.deepEqual([late.status, late.commandId, late.message], ['unknown', 'cmd-1', COMMAND_MESSAGES.unknown]);
  assert.equal((await readCommandReceipt(request, { store: h.store, lock: h.lock })).status, 'committed', 'unknown is not proof of failure');
});

test('N11 quota and other write refusals change nothing; the same request then commits once', async () => {
  const base = rich(), uid = outsideDeck(base), h = harness(base);
  const { request } = quote(h, uid), bytes = h.bytes();
  h.faults.set = key => { if (key === PROFILE_KEY) throw new DOMException('Fixture quota', 'QuotaExceededError'); };
  const quota = await commit(h, request);
  assert.deepEqual([quota.status, quota.reason, quota.message], ['rejected', 'quota', COMMAND_MESSAGES.quota]);
  assert.equal(h.bytes(), bytes);
  h.faults.set = key => { if (key === PROFILE_KEY) throw new DOMException('Storage denied', 'SecurityError'); };
  const denied = await commit(h, request);
  assert.deepEqual([denied.status, denied.reason, denied.message], ['rejected', 'write-failed', 'Storage denied']);
  assert.equal(h.bytes(), bytes);
  h.faults.set = null; h.clear();
  const retried = await commit(h, request);
  assert.deepEqual([retried.status, retried.duplicate], ['committed', false]); assert.equal(h.writes(), 1);
  const third = await commit(h, request);
  assert.equal(third.duplicate, true); assert.equal(h.writes(), 1);
  assert.equal(h.saved().coins, base.coins - 120);
});

test('N11 a profile pushed over the 4 MiB envelope by the receipt is refused with the store message', async () => {
  const large = nearEnvelopeProfile(rich(), { headroom: 40 }), uid = outsideDeck(large);
  assertLocalProfile(large);
  const h = harness(large), bytes = h.bytes(), { request } = quote(h, uid); h.clear();
  const result = await commit(h, request);
  assert.deepEqual([result.status, result.reason], ['rejected', 'write-failed']);
  assert.match(result.message, /4 MiB/);
  assert.equal(h.writes(), 0, 'the envelope check runs before setItem');
  assert.equal(h.bytes(), bytes);
});

test('N12 a throwing save is re-read under the lock: landed is committed, unreadable is unknown', async () => {
  {
    const base = rich(), uid = outsideDeck(base), h = harness(base), { request } = quote(h, uid);
    h.faults.set = key => key === PROFILE_KEY ? 'land-then-throw' : undefined;
    const result = await commit(h, request);
    assert.deepEqual([result.status, result.duplicate], ['committed', false]);
    assert.deepEqual(result.receipt, h.saved().commands.receipts[0]);
    h.faults.set = null; h.clear();
    const again = await commit(h, request);
    assert.equal(again.duplicate, true); assert.equal(h.writes(), 0);
  }
  {
    const base = rich(), uid = outsideDeck(base), h = harness(base), { request } = quote(h, uid), bytes = h.bytes();
    h.faults.set = key => {
      if (key !== PROFILE_KEY) return;
      h.faults.get = () => { throw new DOMException('Storage unavailable', 'SecurityError'); };
      throw new DOMException('Write interrupted', 'UnknownError');
    };
    const result = await commit(h, request);
    assert.deepEqual([result.status, result.commandId, result.message], ['unknown', 'cmd-1', COMMAND_MESSAGES.unknown]);
    assert.equal(h.bytes(), bytes);
  }
});

test('N13 receipt lookup by slot and intent never writes', async () => {
  const base = rich(), uid = outsideDeck(base), other = base.instances.find(item => item.uid !== uid).uid, h = harness(base);
  const { request } = quote(h, uid);
  await commit(h, request); // result deliberately ignored
  h.clear();
  const found = await readCommandReceipt(request, { store: h.store, lock: h.lock });
  assert.ok(h.log.length > 0 && h.log.every(entry => entry.locked), 'a locked lookup queues behind commits');
  assert.equal(found.status, 'committed'); assert.deepEqual(found.receipt, h.saved().commands.receipts[0]);
  assert.equal((await readCommandReceipt({ commandId: 'cmd-2', intent: request.intent }, { store: h.store, lock: h.lock })).status, 'not-committed');
  assert.equal((await readCommandReceipt({ commandId: 'cmd-1', intent: { ...request.intent, uid: other } }, { store: h.store, lock: h.lock })).status, 'not-committed');
  assert.equal((await readCommandReceipt(request, { store: h.store })).status, 'committed', 'a lockless lookup is read-only');
  const retired = harness({ ...rich(), commands: { version: 1, nextSeq: 5, retiredBelow: 5, receipts: [] } });
  assert.equal((await readCommandReceipt({ commandId: 'cmd-3', intent: request.intent }, { store: retired.store, lock: retired.lock })).status, 'expired');
  const corrupt = harness('{broken');
  const unavailable = await readCommandReceipt(request, { store: corrupt.store, lock: corrupt.lock });
  assert.equal(unavailable.status, 'unavailable'); assert.match(unavailable.message, /無法讀取/);
  assert.equal((await readCommandReceipt({ commandId: 'cmd-x', intent: request.intent }, { store: h.store })).status, 'unavailable');
  assert.equal(h.writes() + retired.writes() + corrupt.writes(), 0);
});

test('N14 retention: forty commits keep 32 receipts; expired slots never run; an exhausted ledger refuses', async () => {
  const base = rich(), h = harness(base), requests = [];
  for (const uid of base.instances.slice(0, 10).map(item => item.uid)) {
    for (let step = 0; step < 4; step++) {
      const { request } = quote(h, uid); requests.push(request);
      assert.equal((await commit(h, request)).status, 'committed');
    }
  }
  const ledger = h.saved().commands;
  assert.equal(ledger.receipts.length, 32); assert.equal(ledger.retiredBelow, 9); assert.equal(ledger.nextSeq, 41);
  assert.deepEqual(ledger.receipts.map(item => item.seq), Array.from({ length: 32 }, (_, index) => index + 9));
  assert.equal(h.saved().coins, base.coins - 10 * 120 * (1 + 2 + 3 + 4));
  const old = requests[2]; assert.equal(old.commandId, 'cmd-3');
  h.clear();
  const expired = await commit(h, old);
  assert.deepEqual([expired.status, expired.reason, expired.message], ['rejected', 'expired', COMMAND_MESSAGES.expired]);
  assert.equal((await readCommandReceipt(old, { store: h.store, lock: h.lock })).status, 'expired');
  assert.equal(h.writes(), 0);
  const exhausted = harness({ ...rich(), commands: { version: 1, nextSeq: MAX_COMMAND_SEQ, retiredBelow: MAX_COMMAND_SEQ, receipts: [] } });
  const last = quote(exhausted, outsideDeck(base)).request;
  assert.equal(last.commandId, `cmd-${MAX_COMMAND_SEQ}`);
  const refused = await commit(exhausted, last);
  assert.deepEqual([refused.status, refused.reason, refused.message], ['rejected', 'blocked', COMMAND_MESSAGES.exhausted]);
  assert.equal(exhausted.writes(), 0);
});

test('N18 restore retirement makes every earlier preview expired, and backups never carry the ledger', async () => {
  const base = rich(), uid = outsideDeck(base), h = harness(base);
  await commit(h, quote(h, uid).request);
  const outstanding = quote(h, uid).request;
  assert.equal(outstanding.commandId, 'cmd-2');
  const current = h.store.load(), snapshot = createSnapshot(current);
  assert.equal(Object.hasOwn(snapshot.profile, 'commands'), false);
  // Mirrors app.mjs restoreLocalProfile: a lineage with a ledger keeps a retired boundary.
  h.store.save({ ...restoreSnapshot(snapshot, { now }), commands: retireCommandLedger(current.commands) });
  assert.deepEqual(h.saved().commands, { version: 1, nextSeq: 3, retiredBelow: 3, receipts: [] });
  h.clear();
  const result = await commit(h, outstanding);
  assert.deepEqual([result.status, result.reason], ['rejected', 'expired']);
  assert.equal((await readCommandReceipt(outstanding, { store: h.store, lock: h.lock })).status, 'expired');
  assert.equal(h.writes(), 0);
  assert.equal(quote(h, uid).request.commandId, 'cmd-3', 'new previews continue after the boundary');
});

test('N21 the commit uses the quote captured at paint time, not a click-time preview', async () => {
  const base = rich(), uid = outsideDeck(base), h = harness(base);
  const painted = previewCommand(h.store.load(), { type: UPGRADE, uid });
  edit(h, profile => setInstanceXP(profile, uid, 80));
  const clickTime = quote(h, uid);
  assert.notEqual(clickTime.request.expectedFingerprint, painted.request.expectedFingerprint);
  h.clear();
  const result = await commit(h, painted.request);
  assert.deepEqual([result.status, result.reason], ['rejected', 'stale']);
  assert.equal(h.writes(), 0);
  assert.equal(instanceOf(h.saved(), uid).level, 2, 'the card is not charged at its new level');
});

test('N17 every existing profile writer keeps the command ledger unchanged', () => {
  const ledger = {
    version: 1, nextSeq: 3, retiredBelow: 1,
    receipts: [1, 2].map(seq => ({
      seq, intent: { type: UPGRADE, uid: 'card-000001', toLevel: seq + 1 }, at: now,
      result: { cardId: 'qingxiao', printId: 'legacy/qingxiao', fromLevel: seq, toLevel: seq + 1, fromXP: seq === 1 ? 0 : 80, toXP: seq === 1 ? 80 : 200, coins: 120 * seq, dust: 6 * seq, coinsAfter: 1000, dustAfter: 10 },
    })),
  };
  const withLedger = profile => ({ ...copy(profile), commands: copy(ledger) });
  const base = rich(), uid = outsideDeck(base);
  const minted = mintInstance(base, 'qingxiao', { now, source: 'fixture' }), sold = sellInstance(minted.profile, minted.instance.uid, now);
  const leader = mintInstance(base, 'wukong', { now, printId: 'wx01-005-laa1', source: 'fixture' });
  const target = mintInstance(base, 'wukong', { now, printId: 'wx01-005-aa1', source: 'fixture' });
  const donor = mintInstance(target.profile, 'wukong', { now, printId: 'legacy/wukong', source: 'fixture' });
  const counted = copy(base); Object.assign(counted.daily, { matches: 2, arenaMatches: 3 }); counted.weekly.matches = 10;
  const packed = buyPack(base, { set: 'wx01', now, rng: () => 0.9 }).profile;
  const deck2 = saveInstanceDeck(base, { slotId: 'deck-2', name: '第二陣', instanceIds: getActiveDeck(base).instanceIds });
  const begun = beginBattle(base, { kind: 'arena', now });
  const cleared = { ...copy(base), cleared: ['mist-gate'] };
  const started = startActivity(cleared, { route: 'loaner', rng: () => 0.1, now });
  const won = finishBattle(started.profile, { encounterId: started.encounter.id, winner: 'player', finalResources: { hp: 12, pills: 12 }, now }).profile;
  let earned = started.profile;
  for (let stage = 0; stage < 3; stage++) {
    earned = finishBattle(earned, { encounterId: earned.pending.id, winner: 'player', finalResources: { hp: 12, pills: 12 }, now }).profile;
    if (stage < 2) earned = advanceActivity(earned, { supply: 'none', expectedRunId: earned.expansion.fireMountain.run.id, expectedStage: stage, now }).profile;
  }
  const granted = claimExpansionGrant(earned, { id: earned.expansion.grants[0].id, now }).profile;
  const ticketReady = acknowledgeWX01Receipt(granted, granted.wx01.receipt.id);
  const writers = {
    upgradeInstance: [base, p => upgradeInstance(p, uid)],
    trainInstance: [base, p => trainInstance(p, uid, now)],
    claimLogin: [base, p => claimLogin(p, now)],
    claimTask: [counted, p => claimTask(p, 'matches', now)],
    claimWeeklyTask: [counted, p => claimWeeklyTask(p, 'matches', now)],
    claimArenaChest: [counted, p => claimArenaChest(p, now)],
    'buyPack all': [base, p => buyPack(p, { set: 'all', now, rng: () => 0.5 })],
    'buyPack wx01': [base, p => buyPack(p, { set: 'wx01', now, rng: () => 0.9 })],
    buyWX01Box: [base, p => buyWX01Box(p, { packs: 12, now, rng: () => 0.5 })],
    acknowledgeWX01Receipt: [packed, p => acknowledgeWX01Receipt(p, p.wx01.receipt.id)],
    buyCard: [base, p => buyCard(p, getMarket(p, now)[0].cardId, now)],
    sellInstance: [minted.profile, p => sellInstance(p, minted.instance.uid, now)],
    buybackInstance: [sold, p => buybackInstance(p, minted.instance.uid, now)],
    toggleInstanceLock: [base, p => toggleInstanceLock(p, uid)],
    setLeaderInstance: [leader.profile, p => setLeaderInstance(p, leader.instance.uid)],
    saveInstanceDeck: [base, p => saveInstanceDeck(p, { slotId: 'deck-2', name: '第二陣', instanceIds: getActiveDeck(p).instanceIds })],
    activateDeck: [deck2, p => activateDeck(p, 'deck-2')],
    deleteDeck: [deck2, p => deleteDeck(p, 'deck-2')],
    beginBattle: [base, p => beginBattle(p, { kind: 'arena', now })],
    finishBattle: [begun.profile, p => finishBattle(p, { encounterId: begun.encounter.id, winner: 'player', now })],
    abandonBattle: [begun.profile, p => abandonBattle(p)],
    startActivity: [cleared, p => startActivity(p, { route: 'loaner', rng: () => 0.1, now })],
    advanceActivity: [won, p => advanceActivity(p, { supply: 'none', expectedRunId: p.expansion.fireMountain.run.id, expectedStage: 0, now })],
    abandonActivity: [won, p => abandonActivity(p, { expectedRunId: p.expansion.fireMountain.run.id, now })],
    claimExpansionGrant: [earned, p => claimExpansionGrant(p, { id: p.expansion.grants[0].id, now })],
    openWX01Ticket: [ticketReady, p => openWX01Ticket(p, { rng: () => 0.9, now })],
    inheritInstances: [donor.profile, p => inheritInstances(p, previewInheritance(p, target.instance.uid, [donor.instance.uid]))],
    refreshDaily: [base, p => refreshDaily(p, tomorrow)],
    claimPlaytestSupply: [base, p => claimPlaytestSupply(p, { hostname: '127.0.0.1' })],
  };
  for (const [name, [state, write]] of Object.entries(writers)) {
    const input = withLedger(state), before = commandLedgerJSON(input);
    const result = write(input), next = result.profile ?? result;
    assert.deepEqual(next.commands, ledger, name);
    assert.doesNotThrow(() => assertLedgerUnchanged(before, next), name);
    assert.doesNotThrow(() => assertLocalProfile(next), name);
  }
  const dropped = withLedger(base); delete dropped.commands;
  assert.throws(() => assertLedgerUnchanged(commandLedgerJSON(withLedger(base)), dropped), /操作記錄/);
  const altered = withLedger(base); altered.commands.nextSeq = 4;
  assert.throws(() => assertLedgerUnchanged(commandLedgerJSON(withLedger(base)), altered), /操作記錄/);
});
