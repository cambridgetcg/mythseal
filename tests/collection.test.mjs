import test from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, ORIGINAL_CARD_IDS, defaultDeckIds } from '../engine.mjs';
import {
  COLLECTION_VERSION, MAX_CARD_XP, XP_THRESHOLDS, createCollection, migrateCollection, hydrateCollection,
  syncCollection, getInstance, getInstances, getPreferredInstance, getActiveDeck, getDeckLevels,
  getInstanceLevel, getXPThreshold, getXPProgress, validateInstanceDeck, mintInstance,
  setInstanceXP, awardInstanceXP, toggleInstanceLock, getInstanceProtection,
  saveInstanceDeck, activateDeck, deleteDeck,
} from '../collection.mjs';

const now = '2026-09-21T12:00:00.000Z';
const copy = value => structuredClone(value);
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function legacy() {
  const inventory = Object.fromEntries(CARDS.map(card => [card.id, ORIGINAL_CARD_IDS.includes(card.id) ? 1 : 0]));
  inventory.wukong = 2;
  const levels = Object.fromEntries(CARDS.map(card => [card.id, 1]));
  levels.qingxiao = 3;
  return {
    version: 2, coins: 987, dust: 45, xp: 120, inventory, levels, deck: [...defaultDeckIds],
    stats: { played: 9, won: 5 }, pending: null, serial: 9,
  };
}
const fresh = () => hydrateCollection(legacy(), { now });
const uid = (profile, id) => getPreferredInstance(profile, id).uid;

test('legacy counts become distinct serial cards; every copy retains its old shared rank', () => {
  const old = legacy();
  old.inventory.qingxiao = 3;
  const profile = migrateCollection(freeze(old), { now });
  assert.equal(profile.collectionVersion, COLLECTION_VERSION);
  assert.equal(profile.instances.length, 16);
  assert.equal(new Set(profile.instances.map(instance => instance.uid)).size, 16);
  assert.equal(profile.instanceSerial, 16);
  assert.deepEqual(getInstances(profile, 'qingxiao').map(instance => [instance.level, instance.xp]), [[3, 200], [3, 200], [3, 200]]);
  assert.ok(profile.instances.every(instance => instance.acquiredAt === now && instance.origin === 'migration'));
  assert.deepEqual(profile.inventory, old.inventory);
  for (const field of ['coins', 'dust', 'xp', 'stats', 'serial']) assert.deepEqual(profile[field], old[field]);
  assert.deepEqual(profile.deck, defaultDeckIds);
  assert.equal(profile.deckSlots.length, 1);
  assert.equal(getActiveDeck(profile).instanceIds.length, 8);
  assert.equal(validateInstanceDeck(profile, getActiveDeck(profile).instanceIds).stars, 24);
});

test('legacy starter repair is bounded to migration and does not invent locked classics', () => {
  const profile = createCollection({ inventory: {}, levels: {}, deck: [] }, { now });
  assert.equal(profile.instances.length, 12);
  assert.ok(ORIGINAL_CARD_IDS.every(id => profile.inventory[id] === 1));
  assert.equal(profile.inventory.pangu, 0);
  assert.equal(getPreferredInstance(profile, 'pangu'), null);
  assert.deepEqual(profile.deck, defaultDeckIds);
});

test('canonical reload retains exact UIDs, XP, locks and deck choices without reminting', () => {
  let profile = fresh();
  const added = mintInstance(profile, 'qingxiao', { source: 'classics-pack', now });
  profile = setInstanceXP(added.profile, added.instance.uid, 456);
  profile = toggleInstanceLock(profile, added.instance.uid);
  const reloaded = hydrateCollection(freeze(profile), { now });
  assert.deepEqual(reloaded, profile);
  assert.equal(getInstance(reloaded, added.instance.uid).xp, 456);
  assert.equal(getInstance(reloaded, added.instance.uid).level, 4);
  assert.equal(getInstance(reloaded, added.instance.uid).locked, true);
});

test('canonical empty, malformed or marker-only collections never remint compatibility counts', () => {
  for (const value of [[], null, 'invalid']) {
    const profile = fresh();
    profile.instances = value;
    profile.inventory.qingxiao = 999;
    const restored = hydrateCollection(profile, { now });
    assert.deepEqual(restored.instances, []);
    assert.equal(restored.inventory.qingxiao, 0);
    assert.deepEqual(restored.deck, []);
    assert.deepEqual(restored.deckSlots, []);
    assert.equal(restored.activeDeckId, null);
  }
  const marked = fresh();
  delete marked.instances;
  assert.equal(hydrateCollection(marked, { now }).instances.length, 0);
});

test('hydration whitelists instance data and derives rank from XP rather than a claimed level', () => {
  const profile = fresh(), card = profile.instances[0];
  Object.assign(card, { xp: 81, level: 5, locked: 'yes', battles: 2, wins: 9, secret: 'drop', acquiredAt: 'not-a-date', origin: '  market  ' });
  const instance = getInstance(hydrateCollection(profile, { now }), card.uid);
  assert.deepEqual(instance, { uid: card.uid, cardId: card.cardId, xp: 81, level: 2, locked: false, battles: 2, wins: 2, acquiredAt: now, origin: 'market' });
});

test('duplicate and overlapping vault UIDs are repaired without duplicating cards or reusing a rejected serial', () => {
  const profile = fresh(), original = copy(profile.instances[0]);
  profile.instances.push({ ...original, xp: 700 });
  profile.instances.push({ ...original, uid: 'card-000999', cardId: 'unknown' });
  profile.merchantVault = [
    { instance: original, sellPrice: 40, buybackPrice: 60, soldAt: now },
    { instance: { ...original, uid: 'card-000100', cardId: 'wukong' }, sellPrice: 180, buybackPrice: 270, soldAt: now },
    { instance: { ...original, uid: 'card-000100', cardId: 'guanyu' }, sellPrice: 90, buybackPrice: 135, soldAt: now },
  ];
  profile.instanceSerial = 1;
  const repaired = hydrateCollection(profile, { now });
  assert.equal(repaired.instances.length, 14);
  assert.equal(repaired.merchantVault.length, 1);
  assert.equal(repaired.merchantVault[0].instance.cardId, 'wukong');
  assert.equal(getInstance(repaired, original.uid).xp, original.xp);
  assert.equal(repaired.instanceSerial, 999);
  assert.equal(mintInstance(repaired, 'qingxiao', { now }).instance.uid, 'card-001000');
});

test('vault hydration retains exact growth and trade metadata, excluding malformed prices', () => {
  const profile = fresh(), sold = copy(getInstances(profile, 'wukong')[0]);
  profile.instances = profile.instances.filter(instance => instance.uid !== sold.uid);
  Object.assign(sold, { xp: 430, level: 4, battles: 8, wins: 5 });
  profile.merchantVault = [
    { instance: sold, sellPrice: 220, buybackPrice: 330, soldAt: now, unknown: true },
    { instance: { ...sold, uid: 'card-000050' }, sellPrice: 90, buybackPrice: 20, soldAt: now },
  ];
  const result = hydrateCollection(profile, { now });
  assert.equal(result.inventory.wukong, 1);
  assert.deepEqual(result.merchantVault, [{ instance: sold, sellPrice: 220, buybackPrice: 330, soldAt: now }]);
  assert.equal(result.instanceSerial, 50);
  assert.throws(() => getInstance(result, sold.uid), /找不到/);
});

test('minted copies begin fresh and serial allocation considers held and sold cards', () => {
  const profile = fresh();
  profile.instanceSerial = 200;
  const minted = mintInstance(freeze(profile), 'qingxiao', { source: 'npc-market', now });
  assert.deepEqual(minted.instance, { uid: 'card-000201', cardId: 'qingxiao', level: 1, xp: 0, locked: false, battles: 0, wins: 0, acquiredAt: now, origin: 'npc-market' });
  assert.equal(minted.profile.inventory.qingxiao, 2);
  assert.equal(profile.inventory.qingxiao, 1);
  assert.equal(minted.profile.levels.qingxiao, 3);
  assert.throws(() => { minted.instance.level = 5; }, TypeError);
  assert.throws(() => mintInstance(profile, 'unknown', { now }), /Unknown card/);
});

test('mint never wraps a consumed serial and malformed alias UIDs are dropped', () => {
  const profile = fresh();
  profile.instances.push({ ...profile.instances[0], uid: 'card-0000001' });
  const repaired = hydrateCollection(profile, { now });
  assert.equal(repaired.instances.length, 14);
  repaired.instanceSerial = Number.MAX_SAFE_INTEGER;
  assert.throws(() => mintInstance(repaired, 'qingxiao', { now }), /編號已達上限/);
});

test('XP thresholds and progress are explicit at every level boundary and at cap', () => {
  assert.deepEqual(XP_THRESHOLDS, [0, 80, 200, 400, 700]);
  assert.equal(MAX_CARD_XP, 700);
  for (const [xp, level] of [[0, 1], [79, 1], [80, 2], [199, 2], [200, 3], [399, 3], [400, 4], [699, 4], [700, 5]]) assert.equal(getInstanceLevel(xp), level);
  assert.deepEqual(getXPProgress({ xp: 140 }), { xp: 140, level: 2, currentThreshold: 80, nextThreshold: 200, progressXP: 60, neededXP: 60, progress: 0.5, maxed: false });
  assert.deepEqual(getXPProgress(900), { xp: 700, level: 5, currentThreshold: 700, nextThreshold: 700, progressXP: 0, neededXP: 0, progress: 1, maxed: true });
  assert.equal(getXPThreshold(5), 700);
  for (const invalid of [0, 6, 1.5, '2']) assert.throws(() => getXPThreshold(invalid), RangeError);
  for (const invalid of [-1, NaN, Infinity, 1.5, undefined]) assert.throws(() => getInstanceLevel(invalid), RangeError);
});

test('exact-copy growth leaves its sibling unchanged and preferred copy differs from active choice', () => {
  const created = mintInstance(fresh(), 'qingxiao', { now });
  const originalUid = getActiveDeck(created.profile).instanceIds[0];
  const grown = setInstanceXP(freeze(created.profile), created.instance.uid, 700);
  assert.equal(getInstance(grown, created.instance.uid).level, 5);
  assert.equal(getInstance(grown, originalUid).level, 3);
  assert.equal(getPreferredInstance(grown, 'qingxiao').uid, created.instance.uid);
  assert.equal(grown.levels.qingxiao, 3);
  assert.equal(getDeckLevels(grown).qingxiao, 3);
  const second = getActiveDeck(grown).instanceIds.map(id => id === originalUid ? created.instance.uid : id);
  const saved = saveInstanceDeck(grown, { slotId: 'deck-2', name: '高修為陣', instanceIds: second });
  assert.equal(activateDeck(saved, 'deck-2').levels.qingxiao, 5);
});

test('XP setters reject downgrades and invalid values; all copy getters resist mutation', () => {
  const profile = fresh(), id = uid(profile, 'qingxiao');
  assert.throws(() => setInstanceXP(profile, id, 199), /不能降低/);
  for (const xp of [-1, 1.5, NaN]) assert.throws(() => setInstanceXP(profile, id, xp), RangeError);
  assert.equal(getInstance(setInstanceXP(profile, id, 900), id).xp, 700);
  assert.throws(() => { getInstance(profile, id).xp = 700; }, TypeError);
  assert.throws(() => getInstances(profile).pop(), TypeError);
  assert.throws(() => getActiveDeck(profile).instanceIds.pop(), TypeError);
  assert.throws(() => getInstances(profile, 'unknown'), /Unknown card/);
  assert.throws(() => getInstance(profile, 'card-999999'), /找不到/);
});

test('lock and saved-deck cards can train, but exact pending instances cannot', () => {
  let profile = fresh(), id = uid(profile, 'qingxiao');
  profile = toggleInstanceLock(profile, id);
  assert.equal(getInstance(setInstanceXP(profile, id, 220), id).xp, 220);
  profile.pending = { id: 'battle-10', instanceIds: [id], cardInstances: { qingxiao: id } };
  const before = JSON.stringify(profile);
  assert.throws(() => setInstanceXP(profile, id, 230), /未完對局/);
  assert.equal(JSON.stringify(profile), before);
});

test('battle XP goes only to unique used UIDs and zero-XP practice still records their history', () => {
  const profile = fresh(), ids = getInstances(profile, 'wukong').map(instance => instance.uid);
  const first = awardInstanceXP(freeze(profile), [ids[0]], 80, { win: true });
  assert.deepEqual(first.changes, [{ uid: ids[0], cardId: 'wukong', beforeXP: 0, afterXP: 80, beforeLevel: 1, afterLevel: 2, gainedXP: 80 }]);
  assert.equal(getInstance(first.profile, ids[0]).battles, 1);
  assert.equal(getInstance(first.profile, ids[0]).wins, 1);
  assert.equal(getInstance(first.profile, ids[1]).xp, 0);
  assert.equal(getInstance(first.profile, ids[1]).battles, 0);
  const practice = awardInstanceXP(first.profile, [ids[0]], 0);
  assert.equal(practice.changes[0].gainedXP, 0);
  assert.equal(getInstance(practice.profile, ids[0]).battles, 2);
  assert.equal(getInstance(practice.profile, ids[0]).wins, 1);
  assert.equal(getInstance(practice.profile, ids[0]).xp, 80);
});

test('XP awards accept pending cards at settlement, cap XP and fail atomically on invalid participants', () => {
  let profile = fresh(), id = uid(profile, 'qingxiao');
  profile = setInstanceXP(profile, id, 690);
  profile.pending = { instanceIds: [id] };
  const before = JSON.stringify(profile);
  const result = awardInstanceXP(profile, [id], 20, { win: true });
  assert.equal(result.changes[0].gainedXP, 10);
  assert.equal(result.changes[0].afterLevel, 5);
  assert.equal(getInstance(result.profile, id).xp, 700);
  assert.throws(() => awardInstanceXP(profile, [id, id], 20), /不能重複/);
  assert.throws(() => awardInstanceXP(profile, [id, 'missing'], 20), /找不到/);
  assert.throws(() => awardInstanceXP(profile, [id], -1), /非負整數/);
  assert.throws(() => awardInstanceXP(profile, [id], 5, { win: 'yes' }), TypeError);
  assert.equal(JSON.stringify(profile), before);
});

test('sale protection covers pending cards, locks, every saved deck and the last character copy', () => {
  let profile = fresh(), free = getInstances(profile, 'wukong')[0].uid;
  assert.equal(getInstanceProtection(profile, free), null);
  profile = toggleInstanceLock(profile, free);
  assert.match(getInstanceProtection(profile, free), /鎖定/);
  profile = toggleInstanceLock(profile, free);
  const second = getActiveDeck(profile).instanceIds.map(id => getInstance(profile, id).cardId === 'chiling' ? free : id);
  profile = saveInstanceDeck(profile, { slotId: 'deck-2', instanceIds: second });
  assert.equal(validateInstanceDeck(profile, second).stars, 25);
  assert.match(getInstanceProtection(profile, free), /儲存牌組/);
  profile.pending = { instanceIds: [free] };
  assert.match(getInstanceProtection(profile, free), /未完對局/);
  profile.pending = null;
  profile = deleteDeck(profile, 'deck-2');
  assert.equal(getInstanceProtection(profile, free), null);
  profile.instances = profile.instances.filter(instance => instance.cardId !== 'wukong' || instance.uid === free);
  profile = syncCollection(profile);
  assert.match(getInstanceProtection(profile, free), /最後一張/);
});

test('deck validation rejects missing ownership, repeated exact copies, repeated characters and excess stars', () => {
  const profile = fresh(), active = getActiveDeck(profile).instanceIds;
  assert.equal(validateInstanceDeck(profile, active).valid, true);
  assert.equal(validateInstanceDeck(profile, active.slice(1)).valid, false);
  assert.equal(validateInstanceDeck(profile, null).valid, false);
  assert.equal(validateInstanceDeck(profile, active.map((id, index) => index === 0 ? 'missing' : id)).valid, false);
  assert.match(validateInstanceDeck(profile, [...active.slice(0, 7), active[0]]).errors.join(' '), /實體不能重複/);
  const copies = getInstances(profile, 'wukong');
  assert.match(validateInstanceDeck(profile, [...active.slice(0, 6), copies[0].uid, copies[1].uid]).errors.join(' '), /同一位角色/);
  const tooHeavy = active.map(id => getInstance(profile, id).cardId === 'cuixian' ? copies[0].uid : id);
  assert.match(validateInstanceDeck(profile, tooHeavy).errors.join(' '), /25/);
  assert.throws(() => saveInstanceDeck(profile, { slotId: 'deck-2', instanceIds: tooHeavy }), /25/);
});

test('three exact-copy deck slots can be saved, activated and deleted without deleting possessions', () => {
  const profile = fresh(), ids = getActiveDeck(profile).instanceIds;
  let next = saveInstanceDeck(freeze(profile), { name: '  第二陣  ', instanceIds: [...ids].reverse() });
  assert.equal(next.deckSlots[1].id, 'deck-2');
  assert.equal(next.deckSlots[1].name, '第二陣');
  next = saveInstanceDeck(next, { slotId: 'deck-3', name: '第三陣', instanceIds: ids });
  assert.throws(() => saveInstanceDeck(next, { instanceIds: ids }), /最多/);
  assert.throws(() => saveInstanceDeck(next, { slotId: 'deck-4', instanceIds: ids }), /最多/);
  next = activateDeck(next, 'deck-2');
  assert.deepEqual(next.deck, [...defaultDeckIds].reverse());
  next = deleteDeck(next);
  assert.equal(next.activeDeckId, 'deck-1');
  assert.equal(next.instances.length, profile.instances.length);
  next = deleteDeck(next, 'deck-3');
  assert.throws(() => deleteDeck(next), /至少保留/);
  assert.throws(() => activateDeck(next, 'deck-3'), /找不到/);
  assert.throws(() => deleteDeck(next, 'deck-3'), /找不到/);
});

test('hydration retains valid exact-copy slots, removes corrupt slots and repairs the active choice', () => {
  let profile = fresh();
  const ids = getActiveDeck(profile).instanceIds;
  profile = saveInstanceDeck(profile, { slotId: 'deck-2', name: '留存陣', instanceIds: [...ids].reverse() });
  profile.deckSlots[0].instanceIds[0] = 'missing';
  profile.deckSlots.push({ ...profile.deckSlots[1], name: '重複識別' });
  const restored = hydrateCollection(profile, { now });
  assert.equal(restored.deckSlots.length, 1);
  assert.equal(restored.activeDeckId, 'deck-2');
  assert.equal(getActiveDeck(restored).name, '留存陣');
  assert.deepEqual(restored.deck, [...defaultDeckIds].reverse());
});

test('lost deck metadata is rebuilt from available low-star cards without minting absent originals', () => {
  const profile = fresh();
  const removed = uid(profile, 'qingxiao');
  profile.instances = profile.instances.filter(instance => instance.uid !== removed);
  profile.deckSlots = [];
  profile.activeDeckId = null;
  const restored = hydrateCollection(profile, { now });
  assert.equal(restored.inventory.qingxiao, 0);
  assert.equal(restored.instances.length, profile.instances.length);
  assert.equal(validateInstanceDeck(restored, getActiveDeck(restored).instanceIds).valid, true);
  assert.ok(!restored.deck.includes('qingxiao'));
});

test('runtime sync rejects UID overlap instead of silently granting duplicate ownership', () => {
  const profile = fresh(), instance = copy(profile.instances[0]);
  profile.merchantVault.push({ instance, sellPrice: 40, buybackPrice: 60, soldAt: now });
  assert.throws(() => syncCollection(profile), /重複/);
  profile.merchantVault = [];
  profile.instances.push(instance);
  assert.throws(() => syncCollection(profile), /重複/);
});

test('hydration preserves pending exact-card references and unrelated profile state', () => {
  const profile = fresh(), instance = getActiveDeck(profile).instanceIds[0];
  profile.pending = { id: 'battle-10', kind: 'expedition', instanceIds: [instance], cardInstances: { qingxiao: instance } };
  profile.daily = { date: '2026-09-21', trainingUsed: true };
  const next = hydrateCollection(freeze(profile), { now });
  assert.deepEqual(next.pending, profile.pending);
  assert.deepEqual(next.daily, profile.daily);
  assert.match(getInstanceProtection(next, instance), /未完對局/);
});

test('restoring an escrowed copy preserves its identity and acquired history', () => {
  let profile = fresh();
  const id = getInstances(profile, 'wukong')[0].uid;
  profile = awardInstanceXP(profile, [id], 200, { win: true }).profile;
  const exact = copy(getInstance(profile, id));
  profile.instances = profile.instances.filter(instance => instance.uid !== id);
  profile.merchantVault.push({ instance: exact, sellPrice: 220, buybackPrice: 330, soldAt: now });
  profile = hydrateCollection(profile, { now });
  profile.instances.push(copy(profile.merchantVault[0].instance));
  profile.merchantVault = [];
  const restored = syncCollection(profile);
  assert.deepEqual(getInstance(restored, id), exact);
  assert.equal(restored.inventory.wukong, 2);
});
