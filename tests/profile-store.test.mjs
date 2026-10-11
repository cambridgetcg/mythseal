import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, hydrateProfile, PROFILE_KEY, beginBattle, finishBattle, sellInstance, buyPack,
  startActivity, advanceActivity, claimExpansionGrant, openWX01Ticket, acknowledgeWX01Receipt, claimLogin, upgradeInstance } from '../progression.mjs';
import { createSnapshot, restoreSnapshot } from '../cloud-save.mjs';
import { LEGACY_CARD_IDS } from '../engine.mjs';
import { mintInstance, setInstanceXP, syncCollection } from '../collection.mjs';
import { createProfileStore, assertLocalProfile, BATTLE_KEY, PROFILE_LOCK, RECOVERY_KEY, RESTORE_LEDGER_ERROR } from '../profile-store.mjs';
import { nearEnvelopeProfile } from './support/profile-envelope.mjs';

const now = '2026-09-21T12:00:00.000Z';
const fresh = () => createProfile({ now });
function oldProfile(profile = fresh()) {
  const raw = structuredClone(profile);
  raw.version = 3; raw.collectionVersion = 1; raw.collectionExpansion = 1; delete raw.wx01; delete raw.expansion;
  for (const card of [...raw.instances, ...raw.merchantVault.map(entry => entry.instance)]) delete card.printId;
  for (const key of ['inventory', 'levels']) raw[key] = Object.fromEntries(LEGACY_CARD_IDS.map(id => [id, raw[key][id]]));
  if (raw.pending) delete raw.pending.cardPrints;
  return raw;
}
function fixture(values = {}) {
  const data = new Map(Object.entries(values).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]));
  const writes = [];
  let failKey = null, land = null, unreadable = false;
  const storage = {
    getItem(key) { if (unreadable) throw new DOMException('Fixture read', 'SecurityError'); return data.get(key) ?? null; },
    setItem(key, value) {
      if (key === failKey) {
        if (!land) throw new DOMException('Fixture quota', 'QuotaExceededError');
        // A write that stored `land(value)` and then reported failure anyway.
        writes.push(key); data.set(key, land(value));
        throw new DOMException('Fixture write landed, then reported failure', 'UnknownError');
      }
      writes.push(key); data.set(key, value);
    },
    removeItem(key) { writes.push(`-${key}`); data.delete(key); },
  };
  return {
    data, writes, storage, store: createProfileStore({ storage, now: () => now }),
    fail: (key, landed = null) => { failKey = key; land = landed; }, blind: () => { unreadable = true; },
  };
}

test('v3 migration preserves exact copies, XP, custody, counters and source bytes', () => {
  const minted = mintInstance(fresh(), 'qingxiao', { now, source: 'npc-market' });
  const progressed = sellInstance(setInstanceXP(minted.profile, minted.instance.uid, 430), minted.instance.uid, now);
  progressed.coins = 777; progressed.daily.loginClaimed = true;
  const old = oldProfile(progressed), f = fixture({ 'shanhai.profile.v3': old });
  const bytes = f.data.get('shanhai.profile.v3');
  const next = f.store.load();
  assert.equal(next.version, 5);
  assert.equal(next.coins, 777);
  assert.deepEqual(next.instances, progressed.instances);
  assert.deepEqual(next.merchantVault, progressed.merchantVault);
  assert.deepEqual(next.deckSlots, progressed.deckSlots);
  assert.deepEqual(next.daily, progressed.daily);
  assert.equal(f.writes.length, 0, 'load is inspection only until the guarded commit');
  f.store.save(next);
  assert.deepEqual(f.writes, [PROFILE_KEY]);
  assert.equal(f.data.get('shanhai.profile.v3'), bytes);
  assert.deepEqual(f.store.load(), next);
  assert.equal(PROFILE_LOCK, 'shanhai-profile-v3', 'new and cached clients retain the same cross-tab lock');
});

test('v2 aggregates and v1 deck/stats still migrate without invented WX01 entitlements', () => {
  const old = oldProfile(); old.version = 2;
  for (const key of ['instances', 'instanceSerial', 'deckSlots', 'activeDeckId', 'merchantVault', 'collectionVersion']) delete old[key];
  old.coins = 654; old.inventory.qingxiao = 3; old.levels.qingxiao = 4;
  const next = fixture({ 'shanhai.profile.v2': old }).store.load();
  assert.equal(next.coins, 654); assert.equal(next.inventory.qingxiao, 3); assert.equal(next.levels.qingxiao, 4);
  assert.deepEqual(next.wx01, fresh().wx01);
  const deck = [...fresh().deck].reverse(), stats = { played: 13, won: 7 };
  const v1 = fixture({ 'shanhai.deck.v1': deck, 'shanhai.stats.v1': stats }).store.load();
  assert.deepEqual(v1.deck, deck); assert.deepEqual(v1.stats, stats);
});

test('pending battle writes before completion marker; quota interruption safely retries', () => {
  const begun = beginBattle(fresh(), { kind: 'arena', now });
  const old = oldProfile(begun.profile), battle = { encounter: old.pending, match: { opaque: 'preserve exact battle bytes' } };
  const f = fixture({ 'shanhai.profile.v3': old, 'shanhai.battle.v3': battle });
  const original = new Map(f.data), next = f.store.load();
  assert.deepEqual(next.pending.instanceIds, old.pending.instanceIds);
  assert.equal(Object.keys(next.pending.cardPrints).length, 8);
  f.fail(BATTLE_KEY);
  assert.throws(() => f.store.save(next), { name: 'QuotaExceededError' });
  assert.deepEqual(f.data, original);
  f.fail(PROFILE_KEY);
  assert.throws(() => f.store.save(next), { name: 'QuotaExceededError' });
  assert.equal(f.data.has(PROFILE_KEY), false);
  assert.equal(f.data.get(BATTLE_KEY), original.get('shanhai.battle.v3'));
  assert.deepEqual(f.store.load(), next, 'orphan battle is not a completed migration');
  f.fail(null); f.store.save(next);
  assert.deepEqual(f.writes.slice(-2), [BATTLE_KEY, PROFILE_KEY]);
  for (const [key, value] of original) assert.equal(f.data.get(key), value);
  assert.deepEqual(f.store.load(), next);
});

test('invalid v5 never falls back to v3 or overwrites any key', () => {
  const corruptions = [raw => { raw.version = 6; }, raw => { delete raw.instances; }, raw => { delete raw.instances[0].printId; }, raw => { raw.wx01.dry = 12; }, raw => { raw.coins = -1; }];
  for (const corrupt of corruptions) {
    const raw = fresh(); corrupt(raw);
    const f = fixture({ [PROFILE_KEY]: raw, 'shanhai.profile.v3': oldProfile() }), bytes = new Map(f.data);
    assert.throws(() => f.store.load()); assert.deepEqual(f.data, bytes); assert.deepEqual(f.writes, []);
  }
  const f = fixture({ [PROFILE_KEY]: '{broken', 'shanhai.profile.v3': oldProfile() });
  assert.throws(() => f.store.load(), /無法讀取/); assert.deepEqual(f.writes, []);
});

test('malformed v3 cannot become starter data or silently abandon a pending battle', () => {
  const cases = [raw => { delete raw.instances; }, raw => { raw.instances[0].uid = 'invalid'; }, raw => { raw.coins = -1; }, raw => { raw.pending.instanceIds = []; }];
  for (const corrupt of cases) {
    const raw = oldProfile(beginBattle(fresh(), { kind: 'arena', now }).profile); corrupt(raw);
    const f = fixture({ 'shanhai.profile.v3': raw }), bytes = new Map(f.data);
    assert.throws(() => f.store.load()); assert.deepEqual(f.data, bytes); assert.deepEqual(f.writes, []);
  }
});

test('v5 wins over subsequently changed legacy keys, and failed writes retain last committed v5', () => {
  const current = fresh(); current.coins = 456;
  const f = fixture({ [PROFILE_KEY]: current, 'shanhai.profile.v3': oldProfile() });
  assert.deepEqual(f.store.load(), current);
  f.fail(PROFILE_KEY);
  assert.throws(() => f.store.save({ ...current, coins: 999 }), { name: 'QuotaExceededError' });
  assert.deepEqual(f.store.load(), current);
  assert.throws(() => createProfileStore({ storage: { getItem() { throw new DOMException('Denied', 'SecurityError'); } } }).load(), { name: 'SecurityError' });
});

test('local migration may exceed the legacy cloud limit and still preserves 2,001 copies', () => {
  const base = fresh();
  const large = syncCollection({ ...base, instanceSerial: 2001, instances: [...base.instances, ...Array.from({ length: 2001 - base.instances.length }, (_, i) => ({ ...base.instances[0], uid: `card-${String(i + base.instances.length + 1).padStart(6, '0')}` }))] });
  const next = fixture({ 'shanhai.profile.v3': oldProfile(large) }).store.load();
  assert.equal(next.instances.length, 2001); assert.deepEqual(next.instances, large.instances);
  assertLocalProfile(next);
});

test('load applies the day rollover after validating the stored canonical day', () => {
  const raw = fresh(); raw.daily.loginClaimed = true;
  const f = fixture({ [PROFILE_KEY]: raw });
  const next = createProfileStore({ storage: f.storage, now: () => '2026-09-22T12:00:00Z' }).load();
  assert.equal(next.daily.loginClaimed, false);
  assert.deepEqual(next.instances, raw.instances);
  assert.deepEqual(next, hydrateProfile(raw, { now: '2026-09-22T12:00:00Z' }));
  assert.deepEqual(f.writes, []);
});

function v4Profile(profile = fresh()) {
  const raw = structuredClone(profile); raw.version = 4; delete raw.expansion;
  return raw;
}

test('v4 paid receipt, exact printings and pending battle migrate once with original bytes retained', () => {
  const packed = buyPack(fresh(), { set: 'wx01', now, rng: () => 0.9 }).profile;
  const raw = v4Profile(beginBattle(packed, { kind: 'arena', now }).profile);
  const battle = { version: 4, encounter: raw.pending, match: { round: 2, opaque: 'unchanged accepted history' } };
  const f = fixture({ 'shanhai.profile.v4': raw, 'shanhai.battle.v4': battle, 'shanhai.profile.recovery.v4': raw, 'shanhai.profile.v3': oldProfile() });
  const originals = new Map(f.data), next = f.store.load();
  assert.equal(next.version, 5); assert.equal(PROFILE_KEY, 'shanhai.profile.v5');
  assert.equal(BATTLE_KEY, 'shanhai.battle.v5');
  assert.deepEqual(next.instances, raw.instances); assert.deepEqual(next.pending, raw.pending);
  assert.deepEqual(next.wx01, raw.wx01); assert.deepEqual(next.expansion, fresh().expansion);
  assert.equal(next.coins, raw.coins); assert.equal(f.writes.length, 0);
  f.fail(PROFILE_KEY);
  assert.throws(() => f.store.save(next), { name: 'QuotaExceededError' });
  assert.equal(f.data.has(PROFILE_KEY), false);
  assert.equal(f.data.get(BATTLE_KEY), originals.get('shanhai.battle.v4'));
  for (const [key, value] of originals) assert.equal(f.data.get(key), value);
  assert.deepEqual(f.store.load(), next);
  f.fail(null); f.store.save(next);
  assert.deepEqual(f.writes.slice(-2), [BATTLE_KEY, PROFILE_KEY]);
  assert.deepEqual(f.store.load(), next);
  for (const [key, value] of originals) assert.equal(f.data.get(key), value);
});

test('malformed v4 cannot fall back to v3, repair a receipt or acquire v5-only fields', () => {
  const paid = buyPack(fresh(), { set: 'wx01', now, rng: () => 0.9 }).profile;
  const corruptions = [
    p => { p.version = 6; }, p => { delete p.wx01; }, p => { delete p.instances[0].printId; },
    p => { delete p.weekly; },
    p => { p.expansion = fresh().expansion; }, p => { p.wx01.receipt.kind = 'ticket'; p.wx01.receipt.cost = 0; },
    p => { p.wx01.receipt.cards[0].instanceId = 'card-999999'; },
    p => { p.pending.cardPrints[Object.keys(p.pending.cardPrints)[0]] = 'wx01-005-ink1'; },
  ];
  for (const corrupt of corruptions) {
    const raw = v4Profile(beginBattle(paid, { kind: 'arena', now }).profile); corrupt(raw);
    const f = fixture({ 'shanhai.profile.v4': raw, 'shanhai.profile.v3': oldProfile() }), before = new Map(f.data);
    assert.throws(() => f.store.load()); assert.deepEqual(f.data, before); assert.deepEqual(f.writes, []);
  }
});

test('saved activity battle/supply reloads preserve frozen state, deterministic settlement and start week after quota retry', () => {
  const sunday = '2026-09-27T22:59:59.000Z', monday = '2026-09-27T23:00:00.000Z';
  const initial = createProfile({ now: sunday }); initial.cleared = ['mist-gate'];
  const started = startActivity(initial, { route: 'loaner', rng: () => 0.125, now: sunday });
  const f = fixture({ [PROFILE_KEY]: started.profile }), oldBytes = f.data.get(PROFILE_KEY);
  const options = { encounterId: started.encounter.id, winner: 'player', finalResources: { hp: 4, pills: 1 }, now: sunday };
  const won = finishBattle(f.store.load(), options).profile;
  assert.equal(won.pending, null); assert.equal(won.expansion.fireMountain.run.phase, 'supply');
  assertLocalProfile(won); assert.throws(() => createSnapshot(won), /活動旅程/);
  f.fail(PROFILE_KEY); assert.throws(() => f.store.save(won), { name: 'QuotaExceededError' });
  assert.equal(f.data.get(PROFILE_KEY), oldBytes);
  const retry = finishBattle(f.store.load(), options).profile;
  assert.deepEqual(retry, won, 'retry uses already saved battle/loot seeds and pays once');
  f.fail(null); f.store.save(retry);
  const nextDay = createProfileStore({ storage: f.storage, now: () => monday }).load();
  assert.deepEqual(nextDay.expansion, retry.expansion, 'an active run keeps its original claim week');
  assert.equal(nextDay.daily.date, '2026-09-28');
  const run = nextDay.expansion.fireMountain.run;
  const continued = advanceActivity(nextDay, { supply: 'life', expectedRunId: run.id, expectedStage: 0, now: monday });
  f.store.save(continued.profile);
  assert.deepEqual(f.store.load(), continued.profile);
  assert.deepEqual(continued.encounter.initialResources, { hp: 10, pills: 8 });
  assert.deepEqual(continued.encounter.playerDeck, started.encounter.playerDeck);
  assert.deepEqual(continued.profile.expansion.fireMountain.run.seeds, started.profile.expansion.fireMountain.run.seeds);
  assert.throws(() => finishBattle(continued.profile, options), /已結算/);
  const ended = finishBattle(continued.profile, { encounterId: continued.encounter.id, winner: 'opponent', finalResources: { hp: 0, pills: 2 }, now: monday }).profile;
  f.store.save(ended); assert.deepEqual(f.store.load(), ended);
  assert.equal(ended.expansion.fireMountain.run, null);
  assert.deepEqual(ended.instances, initial.instances, 'loaners never mint or earn owned-copy XP');
  assert.deepEqual(restoreSnapshot(createSnapshot(ended), { now: monday }), ended);
});

test('earned grant and ticket commit atomically; quota failure preserves entitlement and saved receipt cannot grant twice', () => {
  const initial = fresh(); initial.cleared = ['mist-gate'];
  let profile = startActivity(initial, { route: 'loaner', rng: () => 0.1, now }).profile;
  for (let stage = 0; stage < 3; stage++) {
    profile = finishBattle(profile, { encounterId: profile.pending.id, winner: 'player', finalResources: { hp: 12, pills: 12 }, now }).profile;
    assertLocalProfile(profile);
    if (stage < 2) profile = advanceActivity(profile, { supply: 'none', expectedRunId: profile.expansion.fireMountain.run.id, expectedStage: stage, now }).profile;
  }
  assert.equal(profile.expansion.tickets, 1); assert.equal(profile.expansion.grants.length, 1);
  const f = fixture({ [PROFILE_KEY]: profile }), before = f.data.get(PROFILE_KEY);
  const grantId = profile.expansion.grants[0].id;
  const awarded = claimExpansionGrant(f.store.load(), { id: grantId, now }).profile;
  f.fail(PROFILE_KEY); assert.throws(() => f.store.save(awarded), { name: 'QuotaExceededError' });
  assert.equal(f.data.get(PROFILE_KEY), before); assert.equal(f.store.load().expansion.grants[0].id, grantId);
  f.fail(null); f.store.save(awarded);
  assert.deepEqual(f.store.load(), awarded); assert.deepEqual(restoreSnapshot(createSnapshot(awarded), { now }), awarded);
  assert.throws(() => claimExpansionGrant(f.store.load(), { id: grantId, now }), /已領取/);
  assert.throws(() => openWX01Ticket(f.store.load(), { rng: () => 0.9, now }), /上次西行開匣/);
  f.store.save(acknowledgeWX01Receipt(f.store.load(), awarded.wx01.receipt.id));
  const unopened = f.data.get(PROFILE_KEY), opened = openWX01Ticket(f.store.load(), { rng: () => 0.9, now });
  f.fail(PROFILE_KEY); assert.throws(() => f.store.save(opened.profile), { name: 'QuotaExceededError' });
  assert.equal(f.data.get(PROFILE_KEY), unopened); assert.equal(f.store.load().expansion.tickets, 1);
  f.fail(null); f.store.save(opened.profile);
  const restored = f.store.load(); assert.deepEqual(restored, opened.profile);
  assert.equal(restored.coins, profile.coins); assert.equal(restored.expansion.tickets, 0);
  assert.equal(restored.wx01.opened, 1); assert.equal(restored.wx01.seals, 1); assert.equal(restored.daily.packs, 1);
  assert.deepEqual(restoreSnapshot(createSnapshot(restored), { now }), restored);
  assert.throws(() => openWX01Ticket(restored, { rng: () => 0.9, now }), /秘匣券/);
  for (const corrupt of [
    p => { delete p.expansion; }, p => { p.expansion.tickets = -1; },
    p => { p.expansion.fireMountain.dry = 20; }, p => { p.expansion.fireMountain.weekly.claimed = []; },
    p => { p.expansion.grants.push({ id: grantId, kind: 'base', printId: 'wx01-005-ink1', source: 'fire-mountain' }); },
  ]) { const bad = structuredClone(restored); corrupt(bad); assert.throws(() => assertLocalProfile(bad)); }
});

const ledger = () => ({
  version: 1, nextSeq: 2, retiredBelow: 1,
  receipts: [{ seq: 1, intent: { type: 'care.upgrade', uid: 'card-000001', toLevel: 2 }, at: now,
    result: { cardId: 'qingxiao', printId: 'legacy/qingxiao', fromLevel: 1, toLevel: 2, fromXP: 0, toXP: 80, coins: 120, dust: 6, coinsAfter: 1080, dustAfter: 14 } }],
});

test('N16 the optional command ledger: absent stays absent, present round-trips, legacy sources cannot carry it', () => {
  const plain = fixture({ [PROFILE_KEY]: fresh() });
  const loaded = plain.store.load();
  assert.equal(Object.hasOwn(loaded, 'commands'), false, 'hydration never invents the ledger');
  plain.store.save(claimLogin(loaded, now));
  assert.equal(Object.hasOwn(JSON.parse(plain.data.get(PROFILE_KEY)), 'commands'), false, 'an unrelated action never adds it');

  const upgraded = { ...upgradeInstance(fresh(), 'card-000001'), commands: ledger() };
  const kept = fixture({ [PROFILE_KEY]: upgraded });
  const restored = kept.store.load();
  assert.deepEqual(restored.commands, ledger());
  assert.deepEqual(restored, upgraded);
  kept.store.save(restored);
  assert.deepEqual(JSON.parse(kept.data.get(PROFILE_KEY)), upgraded, 'load then save keeps the ledger unchanged');
  const tomorrowLoad = createProfileStore({ storage: kept.storage, now: () => '2026-09-22T12:00:00.000Z' }).load();
  assert.deepEqual(tomorrowLoad.commands, ledger(), 'day rollover keeps it');

  for (const [key, raw] of [['shanhai.profile.v4', v4Profile()], ['shanhai.profile.v3', oldProfile()]]) {
    const f = fixture({ [key]: { ...raw, commands: ledger() } }), before = new Map(f.data);
    assert.throws(() => f.store.load(), /不完整/, key);
    assert.deepEqual(f.writes, []); assert.deepEqual(f.data, before);
  }
  const v2 = oldProfile(); v2.version = 2;
  for (const field of ['instances', 'instanceSerial', 'deckSlots', 'activeDeckId', 'merchantVault', 'collectionVersion']) delete v2[field];
  const migrated = fixture({ 'shanhai.profile.v2': { ...v2, commands: ledger() } });
  const next = migrated.store.load();
  assert.equal(Object.hasOwn(next, 'commands'), false, 'a migration never creates a ledger');
  migrated.store.save(next);
  assert.equal(Object.hasOwn(JSON.parse(migrated.data.get(PROFILE_KEY)), 'commands'), false);
});

test('N16 the 4 MiB envelope check counts the ledger before any write', () => {
  const large = nearEnvelopeProfile(fresh(), { headroom: 40 });
  assertLocalProfile(large);
  const withLedger = { ...large, commands: ledger() };
  assert.throws(() => assertLocalProfile(withLedger), /4 MiB/);
  const f = fixture({ [PROFILE_KEY]: large }), bytes = f.data.get(PROFILE_KEY);
  assert.throws(() => f.store.save(withLedger), /4 MiB/);
  assert.deepEqual(f.writes, []); assert.equal(f.data.get(PROFILE_KEY), bytes);
});

test('N24 a restore is checked before its recovery copy is written; a refused or failed restore keeps the previous copy', () => {
  const previous = JSON.stringify({ savedAt: now, snapshot: createSnapshot(fresh()) });
  const current = { ...upgradeInstance(fresh(), 'card-000001'), commands: ledger() };
  // A valid backup within the retired ledger's ~77 bytes of the 4 MiB limit.
  const near = restoreSnapshot(createSnapshot(nearEnvelopeProfile(fresh(), { headroom: 40 })), { now });
  assertLocalProfile(near);
  {
    const f = fixture({ [PROFILE_KEY]: current, [RECOVERY_KEY]: previous }), before = new Map(f.data);
    assert.throws(() => f.store.replace(f.store.load(), near, { savedAt: now }), { message: RESTORE_LEDGER_ERROR });
    assert.deepEqual(f.writes, []); assert.deepEqual(f.data, before, 'neither the journey nor the recovery copy changed');
  }
  {
    const f = fixture({ [PROFILE_KEY]: fresh(), [RECOVERY_KEY]: previous }), replaced = f.store.load();
    const next = f.store.replace(replaced, near, { savedAt: now });
    assert.equal(Object.hasOwn(next, 'commands'), false, 'the same backup restores over a journey without a ledger');
    assert.deepEqual(f.writes, [RECOVERY_KEY, PROFILE_KEY]);
    assert.deepEqual(JSON.parse(f.data.get(RECOVERY_KEY)), { savedAt: now, snapshot: createSnapshot(replaced) });
  }
  {
    const small = restoreSnapshot(createSnapshot(fresh()), { now });
    const f = fixture({ [PROFILE_KEY]: current, [RECOVERY_KEY]: previous }), bytes = f.data.get(PROFILE_KEY);
    f.fail(PROFILE_KEY);
    assert.throws(() => f.store.replace(f.store.load(), small, { savedAt: now }), { name: 'QuotaExceededError' });
    assert.equal(f.data.get(RECOVERY_KEY), previous, 'the previous recovery copy is put back');
    assert.equal(f.data.get(PROFILE_KEY), bytes);
    const g = fixture({ [PROFILE_KEY]: current });
    g.fail(PROFILE_KEY);
    assert.throws(() => g.store.replace(g.store.load(), small, { savedAt: now }), { name: 'QuotaExceededError' });
    assert.equal(g.data.has(RECOVERY_KEY), false, 'no recovery copy is left claiming a restore happened');
    const h = fixture({ [PROFILE_KEY]: current }), replaced = h.store.load();
    const next = h.store.replace(replaced, small, { savedAt: now });
    assert.deepEqual(next.commands, { version: 1, nextSeq: 3, retiredBelow: 3, receipts: [] }, 'a restore retires the replaced lineage');
    assert.deepEqual(JSON.parse(h.data.get(PROFILE_KEY)), next);
    assert.deepEqual(JSON.parse(h.data.get(RECOVERY_KEY)), { savedAt: now, snapshot: createSnapshot(replaced) });
  }
});

test('N24 a restore whose profile write lands and then throws keeps the replaced journey recoverable', () => {
  // The journey being replaced has progress, including a command receipt, that exists nowhere else.
  const current = { ...upgradeInstance({ ...fresh(), coins: 49_880 }, 'card-000001'), commands: ledger() };
  const older = JSON.stringify({ savedAt: '2026-01-01T00:00:00.000Z', snapshot: createSnapshot(fresh()) });
  const restored = restoreSnapshot(createSnapshot({ ...fresh(), coins: 7 }), { now });
  const keptCopy = replaced => ({ savedAt: now, snapshot: createSnapshot(replaced) });
  for (const previous of [null, older]) {
    const label = previous ? 'with an older recovery copy' : 'without a recovery copy';
    {
      // The restored bytes landed: the restore happened, and is reported as done.
      const f = fixture({ [PROFILE_KEY]: current, ...(previous ? { [RECOVERY_KEY]: previous } : {}) }), replaced = f.store.load();
      f.fail(PROFILE_KEY, value => value);
      const next = f.store.replace(replaced, restored, { savedAt: now });
      assert.equal(next.coins, 7, label);
      assert.equal(f.data.get(PROFILE_KEY), JSON.stringify(next), `${label}: the restore landed`);
      assert.deepEqual(JSON.parse(f.data.get(RECOVERY_KEY)), keptCopy(replaced), `${label}: the replaced journey keeps its recovery copy`);
    }
    {
      // Other bytes landed: neither journey is stored whole, so the new copy stays.
      const f = fixture({ [PROFILE_KEY]: current, ...(previous ? { [RECOVERY_KEY]: previous } : {}) }), replaced = f.store.load();
      f.fail(PROFILE_KEY, value => value.slice(0, 64));
      assert.throws(() => f.store.replace(replaced, restored, { savedAt: now }), { name: 'UnknownError' });
      assert.deepEqual(JSON.parse(f.data.get(RECOVERY_KEY)), keptCopy(replaced), `${label}: unknown bytes keep the copy`);
    }
    {
      // The re-read itself fails: nothing proves the replaced bytes survived, so the copy stays.
      const f = fixture({ [PROFILE_KEY]: current, ...(previous ? { [RECOVERY_KEY]: previous } : {}) }), replaced = f.store.load();
      f.fail(PROFILE_KEY, value => { f.blind(); return value; });
      assert.throws(() => f.store.replace(replaced, restored, { savedAt: now }), { name: 'UnknownError' });
      assert.deepEqual(JSON.parse(f.data.get(RECOVERY_KEY)), keptCopy(replaced), `${label}: an unreadable re-read keeps the copy`);
    }
    {
      // Control: nothing landed, so the replaced bytes are still stored and the old copy comes back.
      const f = fixture({ [PROFILE_KEY]: current, ...(previous ? { [RECOVERY_KEY]: previous } : {}) }), bytes = f.data.get(PROFILE_KEY);
      f.fail(PROFILE_KEY);
      assert.throws(() => f.store.replace(f.store.load(), restored, { savedAt: now }), { name: 'QuotaExceededError' });
      assert.equal(f.data.get(PROFILE_KEY), bytes);
      assert.equal(f.data.get(RECOVERY_KEY) ?? null, previous, `${label}: a write that never landed rolls the copy back`);
    }
  }
});
