import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, claimLogin, buyPack, sellInstance, beginBattle } from '../progression.mjs';
import { getActiveDeck, mintInstance, setInstanceXP, saveInstanceDeck, syncCollection } from '../collection.mjs';
import {
  createSnapshot, validateSnapshot, restoreSnapshot, snapshotSummary, fingerprintProfile,
  MAX_SNAPSHOT_BYTES, MAX_SNAPSHOT_CARDS,
} from '../cloud-save.mjs';

const now = '2026-09-21T12:00:00.000Z';
const tomorrow = '2026-09-22T12:00:00.000Z';
const fresh = () => createProfile({ now });
const copy = value => structuredClone(value);

function travelledProfile() {
  let profile = claimLogin(fresh(), now);
  const added = mintInstance(profile, 'qingxiao', { source: 'npc-market', now });
  profile = setInstanceXP(added.profile, added.instance.uid, 430);
  profile = sellInstance(profile, added.instance.uid, now);
  profile = saveInstanceDeck(profile, {
    slotId: 'deck-2', name: '千古同行', instanceIds: [...getActiveDeck(profile).instanceIds].reverse(),
  });
  return profile;
}

test('cloud journey round trip keeps exact copies, XP, decks and NPC custody without mutating inputs', () => {
  const profile = travelledProfile(), original = copy(profile);
  const snapshot = createSnapshot(profile);
  assert.equal(snapshot.format, 'mythseal.offline-journey');
  assert.equal(snapshot.version, 1);
  assert.deepEqual(restoreSnapshot(snapshot, { now }), original);
  assert.deepEqual(profile, original);
  assert.equal(snapshot.profile.merchantVault[0].instance.xp, 430);
  assert.deepEqual(snapshotSummary(snapshot), { cards: 16, coins: 1490, dust: 28, xp: 20, decks: 2, played: 0, won: 0 });
  snapshot.profile.instances[0].xp = 50;
  assert.deepEqual(profile, original, 'returned snapshot must not alias live profile');
});

test('restore rolls London daily state forward while preserving collection and does not reopen an old day', () => {
  const profile = travelledProfile(), snapshot = createSnapshot(profile);
  const next = restoreSnapshot(snapshot, { now: tomorrow });
  assert.equal(next.daily.date, '2026-09-22');
  assert.equal(next.daily.loginClaimed, false);
  assert.deepEqual(next.instances, profile.instances);
  assert.deepEqual(next.merchantVault, profile.merchantVault);
  assert.equal(next.coins, profile.coins);
  assert.equal(restoreSnapshot(snapshot, { now: '2026-09-20T12:00:00Z' }).daily.loginClaimed, true);
  assert.equal(snapshot.profile.daily.date, '2026-09-21');
});

test('unfinished battles cannot be uploaded or restored and original pending remains untouched', () => {
  const profile = beginBattle(fresh(), { kind: 'arena', now }).profile, original = copy(profile);
  assert.throws(() => createSnapshot(profile), /未完對局/);
  assert.throws(() => restoreSnapshot({ format: 'mythseal.offline-journey', version: 1, profile }, { now }), /未完對局/);
  assert.deepEqual(profile, original);
  assert.equal(typeof fingerprintProfile(profile), 'string', 'local change checks can include pending state');
});

test('invalid envelopes, old/future schemas and incomplete canonical data never produce a starter save', () => {
  const snapshot = createSnapshot(fresh());
  for (const value of [null, [], {}, snapshot.profile, { ...snapshot, version: 2 }, { ...snapshot, format: 'nft' }]) {
    assert.throws(() => restoreSnapshot(value, { now }));
  }
  for (const version of [1, 2, 4]) {
    const invalid = copy(snapshot); invalid.profile.version = version;
    assert.throws(() => validateSnapshot(invalid), /版本/);
  }
  for (const key of ['instances', 'merchantVault', 'deckSlots', 'pending']) {
    const invalid = copy(snapshot); delete invalid.profile[key];
    assert.throws(() => restoreSnapshot(invalid, { now }));
  }
  const empty = syncCollection({ ...fresh(), instances: [], deckSlots: [], activeDeckId: null });
  assert.equal(restoreSnapshot(createSnapshot(empty), { now }).instances.length, 0, 'empty canonical collection never regifts cards');
});

test('reject duplicate ownership, altered derived fields, invalid decks, unknown cards and repaired data', () => {
  const snapshot = createSnapshot(travelledProfile());
  const corruptions = [
    p => p.instances.push(copy(p.instances[0])),
    p => { p.merchantVault[0].instance.uid = p.instances[0].uid; },
    p => { p.instances[0].level = 5; },
    p => { p.instances[0].xp = -1; },
    p => { p.instances[0].cardId = 'missing-character'; },
    p => { p.inventory.qingxiao++; },
    p => { p.instanceSerial = 0; },
    p => { p.deckSlots[0].instanceIds[0] = 'card-999999'; },
    p => { p.deckSlots[0].name = '  trim would change this  '; },
    p => { p.stats.won = 10; },
    p => { p.daily.date = '2026-02-30'; },
    p => { p.daily.marketPurchases.qingxiao = 3; },
    p => { p.merchantVault[0].buybackPrice = 0; },
    p => { p.instances[0].acquiredAt = 'invalid'; },
    p => { p.coins = Infinity; },
    p => { p.extra = 'unknown'; },
  ];
  for (const corrupt of corruptions) {
    const invalid = copy(snapshot); corrupt(invalid.profile);
    assert.throws(() => restoreSnapshot(invalid, { now }));
  }
});

test('bounded JSON rejects accessors without invoking them, prototype keys, cycles and deep trees', () => {
  let accessed = false;
  const getter = { get profile() { accessed = true; return fresh(); } };
  assert.throws(() => validateSnapshot(getter));
  assert.equal(accessed, false);
  for (const key of ['__proto__', 'constructor', 'prototype']) {
    assert.throws(() => validateSnapshot(JSON.parse(`{"${key}":{}}`)));
  }
  const cycle = {}; cycle.next = cycle;
  assert.throws(() => validateSnapshot(cycle));
  const deep = {}; let cursor = deep;
  for (let i = 0; i < 20; i++) { cursor.next = {}; cursor = cursor.next; }
  assert.throws(() => validateSnapshot(deep), /複雜/);
  assert.throws(() => validateSnapshot({ value: new Date() }));
  assert.throws(() => validateSnapshot({ value: 'x'.repeat(513) }), /文字過長/);
});

test('cloud byte/card limits include cards in NPC custody', () => {
  const snapshot = createSnapshot(fresh());
  snapshot.profile.instances = Array.from({ length: MAX_SNAPSHOT_CARDS }, (_, i) => ({ ...snapshot.profile.instances[0], uid: `card-${String(i + 1).padStart(6, '0')}` }));
  snapshot.profile.merchantVault.push({ instance: { ...snapshot.profile.instances[0], uid: 'card-002001' }, sellPrice: 40, buybackPrice: 50, soldAt: now });
  assert.throws(() => validateSnapshot(snapshot), /2,000/);
  const large = createSnapshot(fresh());
  large.profile.instances = Array.from({ length: 1500 }, (_, i) => ({ ...large.profile.instances[0], uid: `card-${String(i + 1).padStart(6, '0')}`, origin: '字'.repeat(80) }));
  assert(new TextEncoder().encode(JSON.stringify(large)).byteLength > MAX_SNAPSHOT_BYTES);
  assert.throws(() => validateSnapshot(large), /512 KiB/);
});

test('byte budget includes PostgreSQL JSONB separator spaces at the storage boundary', () => {
  const base = fresh();
  const largeProfile = length => syncCollection({
    ...base, instanceSerial: 2000,
    instances: [...base.instances, ...Array.from({ length: 1984 }, (_, index) => ({
      ...base.instances[0], uid: `card-${String(index + 17).padStart(6, '0')}`, origin: '字'.repeat(length),
    }))],
  });
  const jsonbText = value => value === null || typeof value !== 'object' ? JSON.stringify(value)
    : Array.isArray(value) ? `[${value.map(jsonbText).join(', ')}]`
      : `{${Object.keys(value).map(key => `${JSON.stringify(key)}: ${jsonbText(value[key])}`).join(', ')}}`;
  const fits = createSnapshot(largeProfile(32));
  assert(Buffer.byteLength(jsonbText(fits)) <= MAX_SNAPSHOT_BYTES);
  const over = { format: 'mythseal.offline-journey', version: 1, profile: largeProfile(33) };
  assert(Buffer.byteLength(JSON.stringify(over)) < MAX_SNAPSHOT_BYTES, 'compact transport JSON alone fits');
  assert(Buffer.byteLength(jsonbText(over)) > MAX_SNAPSHOT_BYTES, 'stored JSONB text does not fit');
  assert.throws(() => validateSnapshot(over), /512 KiB/);
});

test('strings reject PostgreSQL-incompatible NUL and lone surrogates while preserving valid Unicode', () => {
  for (const name of ['a\u0000b', 'a\ud800b', 'a\udc00b', 'a\ud800', '\ud800\ud800']) {
    const profile = fresh(); profile.deckSlots[0].name = name;
    assert.throws(() => createSnapshot(profile), /無法儲存的文字/);
  }
  const profile = fresh(); profile.deckSlots[0].name = '星🌠契：「同行, 有緣」';
  assert.equal(restoreSnapshot(createSnapshot(profile), { now }).deckSlots[0].name, profile.deckSlots[0].name);
});

test('fingerprint ignores object key order but detects gameplay and exact-copy changes', () => {
  const profile = fresh(), fingerprint = fingerprintProfile(profile);
  assert.equal(fingerprintProfile(Object.fromEntries(Object.entries(profile).reverse())), fingerprint);
  const renamed = copy(profile); renamed.deckSlots[0].name = '另一副牌';
  assert.notEqual(fingerprintProfile(renamed), fingerprint);
  const upgraded = setInstanceXP(profile, profile.instances[0].uid, 80);
  assert.notEqual(fingerprintProfile(upgraded), fingerprint);
  const pack = buyPack(profile, { rng: () => 0.1, now }).profile;
  assert.notEqual(fingerprintProfile(pack), fingerprint);
});
