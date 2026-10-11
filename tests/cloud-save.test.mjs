import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, claimLogin, buyPack, sellInstance, beginBattle, NODES } from '../progression.mjs';
import { CAMPAIGN_NODES } from '../campaign-content.mjs';
import { LEGACY_CARD_IDS } from '../engine.mjs';
import { getActiveDeck, mintInstance, setInstanceXP, saveInstanceDeck, syncCollection } from '../collection.mjs';
import {
  createSnapshot, validateSnapshot, restoreSnapshot, snapshotSummary, fingerprintProfile,
  MAX_SNAPSHOT_BYTES, MAX_SNAPSHOT_CARDS, LEGACY_MAX_SNAPSHOT_BYTES, LOCAL_ONLY_PROFILE_KEYS, backupProfile,
} from '../cloud-save.mjs';

const now = '2026-09-21T12:00:00.000Z';
const tomorrow = '2026-09-22T12:00:00.000Z';
const fresh = () => createProfile({ now });
const copy = value => structuredClone(value);

function legacySnapshot(profile = fresh()) {
  const p = copy(profile); p.version = 3; p.collectionVersion = 1; p.collectionExpansion = 1; delete p.wx01; delete p.expansion;
  for (const card of [...p.instances, ...p.merchantVault.map(e => e.instance)]) delete card.printId;
  for (const key of ['inventory', 'levels']) p[key] = Object.fromEntries(LEGACY_CARD_IDS.map(id => [id, p[key][id]]));
  return { format: 'mythseal.offline-journey', version: 1, profile: p };
}

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
  assert.equal(snapshot.version, 3);
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
  assert.throws(() => restoreSnapshot({ format: 'mythseal.offline-journey', version: 3, profile }, { now }), /未完對局/);
  assert.deepEqual(profile, original);
  assert.equal(typeof fingerprintProfile(profile), 'string', 'local change checks can include pending state');
});

test('invalid envelopes, old/future schemas and incomplete canonical data never produce a starter save', () => {
  const snapshot = createSnapshot(fresh());
  for (const value of [null, [], {}, snapshot.profile, { ...snapshot, version: 4 }, { ...snapshot, format: 'nft' }]) {
    assert.throws(() => restoreSnapshot(value, { now }));
  }
  for (const version of [1, 2, 3, 4, 6]) {
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
  snapshot.profile.merchantVault.push({ instance: { ...snapshot.profile.instances[0], uid: 'card-010001' }, sellPrice: 40, buybackPrice: 50, soldAt: now });
  assert.throws(() => validateSnapshot(snapshot), /10,000/);
  const large = createSnapshot(fresh());
  large.profile.instances = Array.from({ length: 10000 }, (_, i) => ({ ...large.profile.instances[0], uid: `card-${String(i + 1).padStart(6, '0')}`, origin: '字'.repeat(100) }));
  assert(new TextEncoder().encode(JSON.stringify(large)).byteLength > MAX_SNAPSHOT_BYTES);
  assert.throws(() => validateSnapshot(large), /4 MiB/);
});

test('the full 10,000-copy boundary preserves exact printings and custody', () => {
  const base = fresh();
  const profile = syncCollection({ ...base, instanceSerial: 10000,
    instances: [...base.instances, ...Array.from({ length: 9999 - base.instances.length }, (_, index) => ({
      ...base.instances[0], uid: `card-${String(base.instances.length + index + 1).padStart(6, '0')}`,
    }))],
    merchantVault: [{ instance: { ...base.instances[0], uid: 'card-010000' }, sellPrice: 40, buybackPrice: 50, soldAt: now }],
  });
  const snapshot = createSnapshot(profile);
  assert.equal(snapshot.profile.instances.length + snapshot.profile.merchantVault.length, 10000);
  assert.deepEqual(restoreSnapshot(snapshot, { now }), profile);
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
  const fits = validateSnapshot(legacySnapshot(largeProfile(32)));
  assert(Buffer.byteLength(jsonbText(fits)) <= LEGACY_MAX_SNAPSHOT_BYTES);
  const over = legacySnapshot(largeProfile(33));
  assert(Buffer.byteLength(JSON.stringify(over)) < LEGACY_MAX_SNAPSHOT_BYTES, 'compact transport JSON alone fits');
  assert(Buffer.byteLength(jsonbText(over)) > LEGACY_MAX_SNAPSHOT_BYTES, 'stored JSONB text does not fit');
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

test('legacy snapshots retain their exact payload and restore into v5 without replacing old copies', () => {
  const legacy = legacySnapshot(travelledProfile()), original = copy(legacy);
  assert.deepEqual(validateSnapshot(legacy, { version: 1 }), original);
  const restored = restoreSnapshot(legacy, { now });
  assert.equal(restored.version, 5); assert.equal(restored.collectionVersion, 2);
  assert.equal(restored.coins, legacy.profile.coins);
  assert.deepEqual(restored.deckSlots, legacy.profile.deckSlots);
  for (const card of [...restored.instances, ...restored.merchantVault.map(e => e.instance)]) assert.equal(card.printId, `legacy/${card.cardId}`);
  assert.deepEqual(legacy, original);
  delete legacy.profile.weekly;
  assert.deepEqual(validateSnapshot(legacy), legacy);
  assert.equal(restoreSnapshot(legacy, { now }).weekly.matches, 0);
  const bad = copy(legacy); bad.profile.instances[0].printId = 'legacy/qingxiao';
  assert.throws(() => validateSnapshot(bad));
  assert.throws(() => validateSnapshot(original, { version: 2 }));
  assert.throws(() => validateSnapshot(createSnapshot(fresh()), { version: 1 }));
});

test('print bindings and WX01 receipts reject loss or repair before restore', () => {
  let profile = fresh();
  const cards = [];
  for (const [cardId, printId] of [['tangsanzang', 'wx01-001-base'], ['baigu', 'wx01-009-base'], ['wukong', 'wx01-005-aa1']]) {
    const minted = mintInstance(profile, cardId, { source: 'pack:wx01', now, printId });
    profile = minted.profile; cards.push({ cardId, printId, instanceId: minted.instance.uid, rarity: cardId === 'wukong' ? 'epic' : cardId === 'baigu' ? 'rare' : 'common' });
  }
  profile.wx01 = { ...profile.wx01, opened: 1, seals: 1, serial: 1, receipt: { id: 'wx01-1', kind: 'pack', mode: 'aa', cards, openedAt: now, cost: 300, sealsEarned: 1 } };
  const snapshot = createSnapshot(profile);
  assert.deepEqual(restoreSnapshot(snapshot, { now }), profile);
  for (const corrupt of [
    p => { delete p.instances[0].printId; },
    p => { p.instances[0].printId = 'wx01-005-aa1'; },
    p => { p.wx01.dry = 12; },
    p => { p.wx01.seals = -1; },
    p => { p.wx01.receipt.cost = 0; },
    p => { p.wx01.receipt.cards[0].instanceId = 'card-999999'; },
    p => { p.wx01.receipt.cards[0].printId = 'wx01-005-ink1'; },
    p => { p.wx01.receipt.extra = true; },
    p => { p.wx01.leaderInstanceId = p.instances[0].uid; },
  ]) { const invalid = copy(snapshot); corrupt(invalid.profile); assert.throws(() => validateSnapshot(invalid)); }
});

// Literal collations keep acceptance expectations independent of the box sampler.
function boxedProfile(count, { commonFirst = false, repeatedGodRole = false, base = fresh() } = {}) {
  let profile = base;
  const printed = {
    tang: ['tangsanzang', 'wx01-001-base', 'common'], baigu: ['baigu', 'wx01-009-base', 'rare'], wukong: ['wukong', 'wx01-005-base', 'epic'],
    bailong: ['bailong', 'wx01-002-base', 'common'], puti: ['puti', 'wx01-004-base', 'common'],
    aa: ['tangsanzang', 'wx01-001-aa1', 'common'], leader: ['tangsanzang', 'wx01-001-laa1', 'common'],
    godLeader: ['baigu', 'wx01-009-laa1', 'rare'], ink: ['wukong', 'wx01-005-ink1', 'epic'], treasure: ['wukong', 'wx01-005-tr1', 'epic'],
  };
  const modes = ['ordinary', 'aa', 'leader', 'treasure', 'ink', 'god'], packs = [];
  for (let index = 0; index < count; index++) {
    const mode = modes[index % modes.length];
    const prints = commonFirst && index === 0 ? ['tang', 'bailong', 'puti']
      : mode === 'god' ? ['aa', repeatedGodRole ? 'leader' : 'godLeader', 'ink']
        : ['tang', 'baigu', mode === 'ordinary' ? 'wukong' : mode];
    const cards = [];
    for (const key of prints) {
      const [cardId, printId, rarity] = printed[key];
      const minted = mintInstance(profile, cardId, { printId, now, source: 'pack:wx01' });
      profile = minted.profile; cards.push({ cardId, printId, rarity, instanceId: minted.instance.uid });
    }
    packs.push({ mode, cards });
  }
  profile.coins = 10000 - count * 300; profile.daily.packs = count;
  profile.wx01 = { ...profile.wx01, opened: count, seals: count, serial: 1,
    receipt: { id: 'wx01-1', kind: 'box', mode: 'box', packs, cards: packs.flatMap(pack => pack.cards), openedAt: now, cost: count * 300, sealsEarned: count } };
  return profile;
}

test('12/24-pack boxed receipts round trip every grouped and flat exact copy, including XP and custody', () => {
  for (const count of [12, 24]) {
    let profile = boxedProfile(count, { base: travelledProfile() });
    const uid = profile.wx01.receipt.cards[0].instanceId;
    profile = setInstanceXP(profile, uid, 430);
    const before = copy(profile), snapshot = createSnapshot(profile);
    assert.equal(snapshot.version, 3); assert.equal(snapshot.profile.version, 5);
    assert.deepEqual(restoreSnapshot(snapshot, { now }), before);
    assert.deepEqual(profile, before, 'export and restore never mutate the original profile');
    const receipt = snapshot.profile.wx01.receipt;
    assert.equal(receipt.packs.length, count); assert.equal(receipt.cards.length, count * 3);
    assert.equal(new Set(receipt.cards.map(card => card.instanceId)).size, count * 3);
    assert.deepEqual(receipt.packs.flatMap(pack => pack.cards), receipt.cards);
    assert.deepEqual([...new Set(receipt.packs.map(pack => pack.mode))], ['ordinary', 'aa', 'leader', 'treasure', 'ink', 'god']);
    assert.equal(snapshot.profile.instances.find(card => card.uid === uid).xp, 430);
    assert.equal(snapshot.profile.instances.find(card => card.uid === uid).printId, 'wx01-001-base');
    assert.equal(snapshot.profile.merchantVault[0].instance.xp, 430);
    assert.equal(snapshot.profile.merchantVault[0].instance.printId, 'legacy/qingxiao');
  }
});

test('box receipts reject changed quantities, costs, seals, grouping, modes and exact identities', () => {
  const valid = createSnapshot(boxedProfile(12));
  for (const corrupt of [
    p => { p.wx01.receipt.packs.pop(); },
    p => { delete p.wx01.receipt.packs; },
    p => { p.wx01.receipt.cards.pop(); },
    p => { p.wx01.receipt.cost = 3599; },
    p => { p.wx01.receipt.sealsEarned = 11; },
    p => { p.wx01.opened = 11; },
    p => { p.wx01.receipt.mode = 'ordinary'; },
    p => { p.wx01.receipt.kind = 'pack'; },
    p => { p.wx01.receipt.packs[0].mode = 'box'; },
    p => { p.wx01.receipt.packs[0].mode = 'god'; },
    p => { p.wx01.receipt.packs[0].extra = true; },
    p => { p.wx01.receipt.packs[0].cards.reverse(); },
    p => { p.wx01.receipt.cards.reverse(); },
    p => { p.wx01.receipt.packs[0].cards[0].extra = true; },
    p => { p.wx01.receipt.cards[0].printId = 'wx01-001-aa1'; p.wx01.receipt.packs[0].cards[0].printId = 'wx01-001-aa1'; },
    p => { p.wx01.receipt.cards[0].instanceId = 'card-999999'; p.wx01.receipt.packs[0].cards[0].instanceId = 'card-999999'; },
    p => { p.wx01.receipt.cards[3] = copy(p.wx01.receipt.cards[0]); p.wx01.receipt.packs[1].cards[0] = copy(p.wx01.receipt.cards[0]); },
  ]) {
    const invalid = copy(valid); corrupt(invalid.profile);
    const before = copy(invalid);
    assert.throws(() => restoreSnapshot(invalid, { now }));
    assert.deepEqual(invalid, before, 'invalid backups must be rejected, never repaired in place');
  }
  assert.throws(() => createSnapshot(boxedProfile(12, { commonFirst: true })), 'each pack must meet its own rarity floor');
  assert.throws(() => createSnapshot(boxedProfile(12, { repeatedGodRole: true })), 'each god pack requires three different characters');
});

test('playtest gift marker is optional, exact and preserved without being synthesized or re-granted', () => {
  const old = createSnapshot(fresh());
  assert.equal(Object.hasOwn(restoreSnapshot(old, { now }).wx01, 'playtestGift'), false);
  const profile = boxedProfile(12); profile.wx01.playtestGift = 'wx01-box-20260922';
  const snapshot = createSnapshot(profile), restored = restoreSnapshot(snapshot, { now });
  assert.equal(restored.wx01.playtestGift, 'wx01-box-20260922');
  assert.equal(restored.coins, profile.coins);
  assert.deepEqual(restoreSnapshot(createSnapshot(restored), { now }), restored);
  for (const value of [true, false, null, '', 'wx01-box-20260923', { amount: 10000 }]) {
    const invalid = copy(snapshot); invalid.profile.wx01.playtestGift = value;
    assert.throws(() => validateSnapshot(invalid));
  }
});

test('snapshot v2 preserves its original profile v4 and paid box receipt before upgrading on restore', () => {
  const p = boxedProfile(12); p.version = 4; delete p.expansion;
  const snapshot = { format: 'mythseal.offline-journey', version: 2, profile: p }, before = copy(snapshot);
  assert.deepEqual(createSnapshot(p), before);
  assert.deepEqual(validateSnapshot(snapshot, { version: 2 }), before);
  const next = restoreSnapshot(snapshot, { now });
  assert.equal(next.version, 5); assert.deepEqual(next.expansion, fresh().expansion);
  assert.deepEqual(next.instances, p.instances); assert.deepEqual(next.wx01, p.wx01);
  assert.equal(next.coins, p.coins); assert.deepEqual(snapshot, before);
  const extra = copy(snapshot); extra.profile.expansion = fresh().expansion;
  assert.throws(() => validateSnapshot(extra), 'unknown old-schema fields cannot be projected away');
  assert.throws(() => validateSnapshot(snapshot, { version: 3 }));
  const continuation = copy(snapshot);
  continuation.profile.cleared = [...NODES.filter(node => !CAMPAIGN_NODES.some(added => added.id === node.id)).map(node => node.id), CAMPAIGN_NODES[0].id];
  continuation.profile.location = CAMPAIGN_NODES[0].id;
  assert.throws(() => validateSnapshot(continuation), 'old namespaces cannot carry otherwise valid new campaign progress');
});

test('ticket receipts use the same exact three-card pack validation but require profile v5 and zero coins', () => {
  const p = buyPack(fresh(), { set: 'wx01', now, rng: () => 0.9 }).profile;
  p.wx01.receipt.kind = 'ticket'; p.wx01.receipt.cost = 0;
  const snapshot = createSnapshot(p);
  assert.deepEqual(restoreSnapshot(snapshot, { now }), p);
  for (const corrupt of [
    p => { p.wx01.receipt.cost = 300; }, p => { p.wx01.receipt.sealsEarned = 0; },
    p => { p.wx01.opened = 0; }, p => { p.wx01.receipt.cards.pop(); },
    p => { p.wx01.receipt.mode = 'base'; }, p => { p.wx01.receipt.cards[1].instanceId = p.wx01.receipt.cards[0].instanceId; },
  ]) { const bad = copy(snapshot); corrupt(bad.profile); assert.throws(() => validateSnapshot(bad)); }
  const legacy = copy(snapshot); legacy.version = 2; legacy.profile.version = 4; delete legacy.profile.expansion;
  assert.throws(() => validateSnapshot(legacy), 'v4 never acquires the ticket contract');
});

test('BASE/AA reward receipts keep exact copies without advancing pack or redemption counters', () => {
  for (const [cardId, printId, rarity, mode] of [['honghaier', 'wx01-006-base', 'rare', 'base'], ['wukong', 'wx01-005-aa1', 'epic', 'aa']]) {
    const minted = mintInstance(fresh(), cardId, { printId, now, source: 'campaign' });
    const p = minted.profile;
    p.wx01.serial = 1;
    p.wx01.receipt = { id: 'wx01-1', kind: 'reward', mode, cards: [{ cardId, printId, rarity, instanceId: minted.instance.uid }], openedAt: now, cost: 0, sealsEarned: 0 };
    const snapshot = createSnapshot(p);
    assert.deepEqual(restoreSnapshot(snapshot, { now }), p);
    for (const key of ['opened', 'redeemed', 'seals', 'dry']) assert.equal(p.wx01[key], 0);
    assert.equal(p.wx01.storyClaimed, false, 'new reward does not spend the old four-stage AA entitlement');
    for (const corrupt of [
      p => { p.wx01.receipt.cost = 300; }, p => { p.wx01.receipt.sealsEarned = 1; },
      p => { p.wx01.receipt.mode = 'treasure'; }, p => { p.wx01.receipt.cards.push(copy(p.wx01.receipt.cards[0])); },
    ]) { const bad = copy(snapshot); corrupt(bad.profile); assert.throws(() => validateSnapshot(bad)); }
    const legacy = copy(snapshot); legacy.version = 2; legacy.profile.version = 4; delete legacy.profile.expansion;
    assert.throws(() => validateSnapshot(legacy));
  }
});

test('an active activity blocks cloud export and restore even between battles with pending null', () => {
  for (const phase of ['battle', 'supply']) {
    const p = fresh(); p.expansion.fireMountain.run = { phase };
    const before = copy(p);
    assert.throws(() => createSnapshot(p), /活動旅程/);
    assert.throws(() => restoreSnapshot({ format: 'mythseal.offline-journey', version: 3, profile: p }), /活動旅程/);
    assert.deepEqual(p, before);
  }
});

test('N18 backups never carry the local command ledger and no snapshot version accepts one', () => {
  const commands = {
    version: 1, nextSeq: 2, retiredBelow: 1,
    receipts: [{ seq: 1, intent: { type: 'care.upgrade', uid: 'card-000001', toLevel: 2 }, at: now,
      result: { cardId: 'qingxiao', printId: 'legacy/qingxiao', fromLevel: 1, toLevel: 2, fromXP: 0, toXP: 80, coins: 120, dust: 6, coinsAfter: 1080, dustAfter: 14 } }],
  };
  assert.deepEqual(LOCAL_ONLY_PROFILE_KEYS, ['commands']);
  const plain = travelledProfile(), local = { ...copy(plain), commands: copy(commands) }, original = copy(local);
  const snapshot = createSnapshot(local);
  assert.deepEqual(snapshot, createSnapshot(plain));
  assert.equal(Object.hasOwn(snapshot.profile, 'commands'), false);
  assert.deepEqual(validateSnapshot(snapshot), snapshot);
  assert.deepEqual(local, original, 'the local profile keeps its ledger');
  assert.equal(Object.hasOwn(restoreSnapshot(snapshot, { now }), 'commands'), false, 'restore never yields a ledger');
  assert.equal(fingerprintProfile(backupProfile(local)), fingerprintProfile(plain));
  assert.notEqual(fingerprintProfile(local), fingerprintProfile(plain), 'the full local fingerprint still sees the ledger');
  assert.equal(backupProfile(plain), plain, 'a ledger-free profile is passed through untouched');

  const v3 = copy(snapshot); v3.profile.commands = copy(commands);
  const v1 = legacySnapshot(plain); v1.profile.commands = copy(commands);
  const v4Profile = copy(plain); v4Profile.version = 4; delete v4Profile.expansion;
  const v2 = createSnapshot(v4Profile); assert.equal(v2.version, 2); v2.profile.commands = copy(commands);
  for (const invalid of [v1, v2, v3]) {
    assert.throws(() => validateSnapshot(invalid), `snapshot v${invalid.version}`);
    assert.throws(() => restoreSnapshot(invalid, { now }), `snapshot v${invalid.version}`);
  }

  let accessed = false;
  const accessor = Object.defineProperty({ ...copy(plain), commands: copy(commands) }, 'coins', { enumerable: true, get() { accessed = true; return 1; } });
  assert.throws(() => createSnapshot(accessor));
  assert.equal(accessed, false, 'stripping the ledger never invokes accessors');
});
