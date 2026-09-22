import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, hydrateProfile, PROFILE_KEY, beginBattle, sellInstance } from '../progression.mjs';
import { LEGACY_CARD_IDS } from '../engine.mjs';
import { mintInstance, setInstanceXP, syncCollection } from '../collection.mjs';
import { createProfileStore, assertLocalProfile, BATTLE_KEY, PROFILE_LOCK } from '../profile-store.mjs';

const now = '2026-09-21T12:00:00.000Z';
const fresh = () => createProfile({ now });
function oldProfile(profile = fresh()) {
  const raw = structuredClone(profile);
  raw.version = 3; raw.collectionVersion = 1; raw.collectionExpansion = 1; delete raw.wx01;
  for (const card of [...raw.instances, ...raw.merchantVault.map(entry => entry.instance)]) delete card.printId;
  for (const key of ['inventory', 'levels']) raw[key] = Object.fromEntries(LEGACY_CARD_IDS.map(id => [id, raw[key][id]]));
  if (raw.pending) delete raw.pending.cardPrints;
  return raw;
}
function fixture(values = {}) {
  const data = new Map(Object.entries(values).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]));
  const writes = [];
  let failKey = null;
  const storage = {
    getItem: key => data.get(key) ?? null,
    setItem(key, value) { if (key === failKey) throw new DOMException('Fixture quota', 'QuotaExceededError'); writes.push(key); data.set(key, value); },
  };
  return { data, writes, storage, store: createProfileStore({ storage, now: () => now }), fail: key => { failKey = key; } };
}

test('v3 migration preserves exact copies, XP, custody, counters and source bytes', () => {
  const minted = mintInstance(fresh(), 'qingxiao', { now, source: 'npc-market' });
  const progressed = sellInstance(setInstanceXP(minted.profile, minted.instance.uid, 430), minted.instance.uid, now);
  progressed.coins = 777; progressed.daily.loginClaimed = true;
  const old = oldProfile(progressed), f = fixture({ 'shanhai.profile.v3': old });
  const bytes = f.data.get('shanhai.profile.v3');
  const next = f.store.load();
  assert.equal(next.version, 4);
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

test('invalid v4 never falls back to v3 or overwrites any key', () => {
  const corruptions = [raw => { raw.version = 5; }, raw => { delete raw.instances; }, raw => { delete raw.instances[0].printId; }, raw => { raw.wx01.dry = 12; }, raw => { raw.coins = -1; }];
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

test('v4 wins over subsequently changed legacy keys, and failed writes retain last committed v4', () => {
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
