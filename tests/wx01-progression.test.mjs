import test from 'node:test';
import assert from 'node:assert/strict';
import { LEGACY_CARD_IDS } from '../engine.mjs';
import { WX01_CARD_IDS, WX01_PRINTINGS, defaultPrintId } from '../printing-catalogue.mjs';
import { getInstance, getPreferredInstance, mintInstance, setInstanceXP, syncCollection, saveInstanceDeck, getActiveDeck, MAX_COLLECTION_COPIES } from '../collection.mjs';
import { createProfile, hydrateProfile, refreshDaily, buyPack, acknowledgeWX01Receipt, redeemWX01Print, claimWX01StoryPrint, setLeaderInstance, claimWeeklyTask, beginBattle, finishBattle, sellInstance, buybackInstance, getMarket, PACK_SETS } from '../progression.mjs';
import { STORY_NODES } from '../stories.mjs';
import { createWX01State } from '../wx01-state.mjs';
import { WX01_SEAL_COSTS } from '../wx01-pack.mjs';

const now = '2026-09-21T12:00:00.000Z';
const later = '2026-09-28T12:00:00.000Z';
const copy = value => structuredClone(value);
const fresh = () => createProfile({ now });
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const special = (treatment, cardId) => WX01_PRINTINGS.find(print => print.treatment === treatment && (!cardId || print.cardId === cardId));
const rollMode = mode => {
  let first = true;
  const values = { ordinary: 0, aa: .84, leader: .963, treasure: .988, ink: .998, god: .9999 };
  return () => first ? (first = false, values[mode]) : 0;
};
const rich = () => { const profile = fresh(); profile.coins = 100_000; profile.wx01.seals = 1000; return profile; };
const clearedWestward = () => { const profile = rich(); profile.cleared = ['mist-gate', ...STORY_NODES.filter(node => node.worldId === 'westward').map(node => node.id)]; return profile; };
function asV3(profile) {
  const old = copy(profile);
  old.version = 3; old.collectionVersion = 1; old.collectionExpansion = 1;
  delete old.wx01;
  for (const instance of [...old.instances, ...old.merchantVault.map(entry => entry.instance)]) delete instance.printId;
  for (const field of ['inventory', 'levels']) old[field] = Object.fromEntries(LEGACY_CARD_IDS.map(id => [id, old[field][id]]));
  if (old.pending) delete old.pending.cardPrints;
  return old;
}

test('fresh v5 only grants the legacy starter/welcome collection and initializes honest WX01 counters', () => {
  const profile = fresh();
  assert.equal(profile.version, 5);
  assert.equal(profile.collectionVersion, 2);
  assert.equal(profile.collectionExpansion, 2);
  assert.deepEqual(profile.wx01, createWX01State());
  assert.equal(profile.instances.length, 16);
  assert(profile.instances.every(instance => instance.printId === `legacy/${instance.cardId}`));
  assert(WX01_CARD_IDS.filter(id => id !== 'wukong').every(id => profile.inventory[id] === 0));
  assert.deepEqual(hydrateProfile(freeze(profile), { now }), profile);
});

test('v3 migration preserves every exact UID, XP, vault entry, deck and pending battle; it never grants historical seals', () => {
  let profile = rich();
  const minted = mintInstance(profile, 'qingxiao', { now, source: 'old-pack' });
  profile = setInstanceXP(minted.profile, minted.instance.uid, 430);
  profile = sellInstance(profile, minted.instance.uid, now);
  profile.daily.loginClaimed = true;
  profile.weekly.matches = 10; profile.weekly.claimedTasks = ['matches'];
  profile = beginBattle(profile, { kind: 'practice', now }).profile;
  const old = asV3(profile), saved = copy(old);
  const migrated = hydrateProfile(freeze(old), { now });
  for (const field of ['coins', 'dust', 'xp', 'stats', 'daily', 'weekly', 'deckSlots', 'activeDeckId', 'instanceSerial', 'deck']) assert.deepEqual(migrated[field], saved[field]);
  assert.deepEqual(migrated.instances.map(({ printId, ...instance }) => instance), saved.instances);
  assert.deepEqual(migrated.merchantVault.map(entry => ({ ...entry, instance: (({ printId, ...instance }) => instance)(entry.instance) })), saved.merchantVault);
  assert.deepEqual(migrated.pending.instanceIds, saved.pending.instanceIds);
  assert.deepEqual(migrated.pending.cardInstances, saved.pending.cardInstances);
  assert.deepEqual(migrated.wx01, createWX01State());
  assert.throws(() => claimWeeklyTask(migrated, 'matches', now), /已領取/);
  assert.deepEqual(hydrateProfile(migrated, { now }), migrated);
  assert.deepEqual(old, saved);
});

test('v2 processed expansion does not regift sold classics or new roles and retains every shared rank', () => {
  const old = asV3(fresh()); old.version = 2;
  for (const key of ['instances', 'instanceSerial', 'deckSlots', 'activeDeckId', 'merchantVault', 'collectionVersion']) delete old[key];
  old.inventory.wukong = 0; old.inventory.qingxiao = 3; old.levels.qingxiao = 4;
  old.inventory.bailong = 999;
  const migrated = hydrateProfile(freeze(old), { now });
  assert.equal(migrated.inventory.wukong, 0);
  assert.equal(migrated.inventory.bailong, 0);
  assert(migrated.instances.filter(instance => instance.cardId === 'qingxiao').every(instance => instance.xp === 400 && instance.level === 4));
  assert.deepEqual(migrated.wx01, createWX01State());
});

test('missing or mismatched v4 owned/vault printing fails closed instead of dropping or replacing the copy', () => {
  for (const value of [undefined, null, '', 'wx01-005-aa1', 'missing']) {
    const profile = fresh(), before = copy(profile);
    profile.instances[0].printId = value;
    assert.throws(() => hydrateProfile(profile, { now }), RangeError);
    assert.throws(() => syncCollection(profile), RangeError);
    assert.equal(profile.instances.length, before.instances.length);
  }
  const profile = fresh(), instance = profile.instances.pop();
  instance.printId = 'legacy/qingxiao';
  profile.merchantVault = [{ instance, sellPrice: 10, buybackPrice: 20, soldAt: now }];
  assert.throws(() => hydrateProfile(profile, { now }), RangeError);
});

for (const mode of ['ordinary', 'aa', 'leader', 'treasure', 'ink', 'god']) test(`${mode} pack commits three exact level-one copies and one durable receipt atomically`, () => {
  const profile = rich(), before = copy(profile);
  const result = buyPack(freeze(profile), { set: 'wx01', rng: rollMode(mode), now });
  assert.equal(result.mode, mode);
  assert.equal(result.profile.coins, before.coins - 300);
  assert.equal(result.profile.instances.length, before.instances.length + 3);
  assert.equal(new Set(result.cards.map(card => card.instanceId)).size, 3);
  assert.equal(result.profile.wx01.opened, 1);
  assert.equal(result.profile.wx01.seals, before.wx01.seals + 1);
  assert.equal(result.profile.wx01.dry, mode === 'ordinary' ? 1 : 0);
  assert.equal(result.profile.daily.packs, 1);
  assert.equal(result.receipt.id, 'wx01-1');
  assert.equal(result.receipt.openedAt, now);
  assert.deepEqual(result.receipt.cards, result.cards);
  for (const card of result.cards) {
    const instance = getInstance(result.profile, card.instanceId);
    assert.equal(instance.cardId, card.cardId); assert.equal(instance.printId, card.printId);
    assert.equal(instance.xp, 0); assert.equal(instance.level, 1);
  }
  assert.deepEqual(hydrateProfile(result.profile, { now }), result.profile);
  assert.deepEqual(profile, before);
  result.receipt.cards[0].printId = 'tampered';
  assert.notEqual(result.profile.wx01.receipt.cards[0].printId, 'tampered');
});

test('eleven ordinary packs lead to a twelfth AA floor; natural higher hits remain higher and reset dryness', () => {
  let profile = rich();
  for (let index = 1; index <= 12; index++) {
    const result = buyPack(profile, { set: 'wx01', rng: rollMode('ordinary'), now });
    assert.equal(result.mode, index === 12 ? 'aa' : 'ordinary');
    assert.equal(result.forced, index === 12);
    assert.equal(result.profile.wx01.dry, index === 12 ? 0 : index);
    profile = acknowledgeWX01Receipt(result.profile, result.receipt.id);
  }
  assert.equal(profile.wx01.opened, 12);
  assert.equal(profile.wx01.seals, 1012);
  assert.equal(profile.coins, 100_000 - 3600);
  for (const mode of ['leader', 'ink', 'treasure', 'god']) {
    const dry = rich(); dry.wx01.opened = 11; dry.wx01.dry = 11; dry.wx01.serial = 11;
    const result = buyPack(dry, { set: 'wx01', rng: rollMode(mode), now });
    assert.equal(result.mode, mode); assert.equal(result.forced, false); assert.equal(result.profile.wx01.dry, 0);
  }
});

test('unacknowledged receipts block all new pack and choice grants, with exact id acknowledgement and harmless retry', () => {
  const result = buyPack(clearedWestward(), { set: 'wx01', rng: rollMode('aa'), now });
  const saved = copy(result.profile);
  let calls = 0;
  for (const set of Object.keys(PACK_SETS)) assert.throws(() => buyPack(result.profile, { set, now, rng: () => { calls++; return 0; } }), /先確認/);
  assert.throws(() => redeemWX01Print(result.profile, special('aa').id, { now }), /先確認/);
  assert.throws(() => claimWX01StoryPrint(result.profile, special('aa').id, { now }), /先確認/);
  assert.equal(calls, 0);
  assert.throws(() => acknowledgeWX01Receipt(result.profile, 'wx01-2'), RangeError);
  assert.throws(() => acknowledgeWX01Receipt(result.profile, 'wx01-01'), RangeError);
  const acked = acknowledgeWX01Receipt(freeze(result.profile), result.receipt.id);
  assert.equal(acked.wx01.receipt, null);
  assert.deepEqual(acknowledgeWX01Receipt(acked, result.receipt.id), acked);
  const next = buyPack(acked, { set: 'wx01', rng: rollMode('ordinary'), now });
  assert.throws(() => acknowledgeWX01Receipt(next.profile, result.receipt.id), /已更新/);
  assert.deepEqual(result.profile, saved);
});

test('invalid RNG fails at the first or later draw without deductions; balances and counters fail before RNG', () => {
  for (const bad of [-1, 1, NaN, Infinity, '0', undefined]) {
    for (const after of [0, 3]) {
      const profile = rich(), saved = copy(profile); let calls = 0;
      assert.throws(() => buyPack(profile, { set: 'wx01', now, rng: () => calls++ < after ? 0 : bad }), RangeError);
      assert.deepEqual(profile, saved);
    }
  }
  for (const field of ['coins', 'opened', 'serial', 'seals']) {
    const profile = rich(); if (field === 'coins') profile.coins = 299; else profile.wx01[field] = 1_000_000_000;
    let calls = 0; const saved = copy(profile);
    assert.throws(() => buyPack(profile, { set: 'wx01', now, rng: () => { calls++; return 0; } }), RangeError);
    assert.equal(calls, 0); assert.deepEqual(profile, saved);
  }
});

test('seal redemption charges its advertised tier once and creates a fresh copy beside a trained sibling', () => {
  for (const [treatment, cost] of Object.entries(WX01_SEAL_COSTS)) {
    const print = special(treatment, 'wukong');
    let profile = rich(); profile = setInstanceXP(profile, getPreferredInstance(profile, 'wukong').uid, 700);
    const result = redeemWX01Print(freeze(profile), print.id, { now });
    assert.equal(result.sealsCost, cost); assert.equal(result.profile.wx01.seals, 1000 - cost);
    assert.equal(result.profile.wx01.redeemed, 1); assert.equal(result.profile.wx01.opened, 0);
    assert.equal(result.profile.coins, profile.coins); assert.equal(result.profile.daily.packs, 0);
    assert.equal(result.receipt.kind, 'redeem'); assert.equal(result.receipt.mode, treatment);
    assert.equal(getInstance(result.profile, result.cards[0].instanceId).level, 1);
    assert.equal(getPreferredInstance(result.profile, 'wukong').level, 5);
    assert.deepEqual(hydrateProfile(result.profile, { now }), result.profile);
  }
  const poor = fresh(), saved = copy(poor);
  for (const id of [special('aa').id, defaultPrintId('wukong'), 'wx01-005-base', 'missing']) assert.throws(() => redeemWX01Print(poor, id, { now }), RangeError);
  assert.deepEqual(poor, saved);
});

test('completed Westward first volume grants one selected AA, including older clears, without requiring a pack', () => {
  const print = special('aa', 'guanyin');
  assert.throws(() => claimWX01StoryPrint(rich(), print.id, { now }), /四處/);
  assert.throws(() => claimWX01StoryPrint(clearedWestward(), special('leader').id, { now }), /只可/);
  const old = asV3(clearedWestward()), upgraded = hydrateProfile(old, { now });
  const result = claimWX01StoryPrint(upgraded, print.id, { now });
  assert.equal(result.profile.wx01.storyClaimed, true);
  assert.equal(result.profile.wx01.seals, 0); assert.equal(result.profile.wx01.opened, 0);
  assert.equal(result.profile.coins, upgraded.coins);
  assert.equal(result.cards[0].printId, print.id); assert.equal(result.receipt.kind, 'story');
  const acked = acknowledgeWX01Receipt(result.profile, result.receipt.id);
  assert.throws(() => claimWX01StoryPrint(refreshDaily(acked, later), special('aa').id, { now: later }), /已領取/);
});

test('weekly ten-match claim grants five seals once, while other claims and old claimed weeks grant none', () => {
  const profile = fresh(); Object.assign(profile.weekly, { matches: 10, expeditionWins: 5, arenaMatches: 5 });
  let claimed = claimWeeklyTask(profile, 'matches', now);
  assert.equal(claimed.wx01.seals, 5);
  assert.throws(() => claimWeeklyTask(claimed, 'matches', now), /已領取/);
  for (const id of ['expedition', 'arena']) claimed = claimWeeklyTask(claimed, id, now);
  assert.equal(claimed.wx01.seals, 5);
  const migrated = hydrateProfile(asV3(claimed), { now });
  assert.equal(migrated.wx01.seals, 0);
  assert.throws(() => claimWeeklyTask(migrated, 'matches', now), /已領取/);
  const refreshed = refreshDaily(claimed, later);
  assert.equal(refreshed.wx01.seals, 5);
  assert.throws(() => claimWeeklyTask(refreshed, 'matches', later), /尚未完成/);
});

test('receipt and displayed leader protect exact copies; clearing display enables sale and buyback preserves its printing and growth', () => {
  const print = special('leader', 'wukong');
  const result = redeemWX01Print(rich(), print.id, { now });
  const uid = result.cards[0].instanceId;
  assert.throws(() => sellInstance(result.profile, uid, now), /先確認/);
  let profile = acknowledgeWX01Receipt(result.profile, result.receipt.id);
  profile = setInstanceXP(profile, uid, 220);
  profile = setLeaderInstance(profile, uid);
  assert.throws(() => sellInstance(profile, uid, now), /主頁展示/);
  assert.throws(() => setLeaderInstance(profile, profile.instances[0].uid), /領航異畫/);
  assert.throws(() => setLeaderInstance(profile, 'card-999999'), RangeError);
  assert.deepEqual(hydrateProfile(profile, { now }), profile);
  profile = setLeaderInstance(profile, null);
  const before = getInstance(profile, uid);
  const sold = sellInstance(profile, uid, now);
  assert.equal(sold.merchantVault[0].instance.printId, print.id);
  assert.throws(() => setLeaderInstance(sold, uid), RangeError);
  const bought = buybackInstance(hydrateProfile(sold, { now }), uid, now);
  assert.deepEqual(getInstance(bought, uid), before);
});

test('battle captures exact printing and UID once, preserves it on hydration and settles only the frozen copy', () => {
  const print = special('aa', 'tangsanzang');
  const minted = mintInstance(fresh(), print.cardId, { printId: print.id, now });
  let profile = saveInstanceDeck(minted.profile, { slotId: minted.profile.activeDeckId, instanceIds: getActiveDeck(minted.profile).instanceIds.map((uid, index) => index === 0 ? minted.instance.uid : uid) });
  const started = beginBattle(profile, { kind: 'practice', now }); profile = started.profile;
  const expected = copy(profile.pending.cardPrints);
  assert.equal(expected.tangsanzang, print.id);
  profile.instances.find(instance => instance.uid === minted.instance.uid).printId = defaultPrintId('tangsanzang');
  const loaded = hydrateProfile(profile, { now });
  assert.deepEqual(loaded.pending.cardPrints, expected);
  const settled = finishBattle(loaded, { encounterId: loaded.pending.id, winner: 'player', playedCardIds: ['tangsanzang'], now }).profile;
  assert.equal(getInstance(settled, minted.instance.uid).battles, 1);
  const invalid = copy(profile); invalid.pending.cardPrints.tangsanzang = 'legacy/wukong';
  assert.throws(() => hydrateProfile(invalid, { now }), RangeError);
  assert.deepEqual(started.encounter.cardPrints, expected);
});

test('legacy pack six RNG values still identify exactly the same original/classic cards and market stays legacy only', () => {
  const values = [0, 0, .6, 0, .99, .9999]; let calls = 0;
  const result = buyPack(fresh(), { set: 'all', now, rng: () => values[calls++] });
  assert.equal(calls, 6);
  assert.deepEqual(result.cards.map(card => card.cardId), ['qingxiao', 'chiling', 'nezha']);
  assert(result.cards.every(card => card.printId === `legacy/${card.cardId}`));
  assert.deepEqual(result.profile.wx01, createWX01State());
  assert.deepEqual(PACK_SETS.all.cardIds, LEGACY_CARD_IDS);
  assert(getMarket(rich(), now).every(offer => LEGACY_CARD_IDS.includes(offer.cardId)));
});

function atCapacity(count, vaultCount = 0) {
  const profile = rich(), template = profile.instances[0];
  for (let index = profile.instances.length + 1; index <= count; index++) profile.instances.push({ ...template, uid: `card-${String(index).padStart(6, '0')}` });
  profile.instanceSerial = count;
  for (let index = 0; index < vaultCount; index++) profile.merchantVault.push({ instance: profile.instances.pop(), sellPrice: 40, buybackPrice: 50, soldAt: now });
  return syncCollection(profile);
}
test('capacity includes vault copies and preflights all three pack grants before randomness, payment or serial use', () => {
  assert.equal(MAX_COLLECTION_COPIES, 10_000);
  const full = atCapacity(9998, 10), saved = copy(full); let calls = 0;
  for (const set of ['all', 'wx01']) assert.throws(() => buyPack(full, { set, now, rng: () => { calls++; return 0; } }), /10,000/);
  assert.equal(calls, 0); assert.deepEqual(full, saved);
  const fits = buyPack(atCapacity(9997, 5), { set: 'wx01', now, rng: rollMode('ordinary') });
  assert.equal(fits.profile.instances.length + fits.profile.merchantVault.length, 10_000);
  const maximum = acknowledgeWX01Receipt(fits.profile, fits.receipt.id), snapshot = copy(maximum);
  assert.throws(() => redeemWX01Print(maximum, special('aa').id, { now }), /10,000/);
  assert.deepEqual(maximum, snapshot);
  const one = redeemWX01Print(atCapacity(9999, 5), special('aa').id, { now });
  assert.equal(one.profile.instances.length + one.profile.merchantVault.length, 10_000);
});

test('corrupted WX01 counters, receipt ownership, shape and rarity fail closed without entitlement resets', () => {
  const result = buyPack(rich(), { set: 'wx01', now, rng: rollMode('leader') });
  const mutations = [
    state => { state.wx01.dry = 12; }, state => { state.wx01.dry = 2; },
    state => { state.wx01.receipt.cards[0].instanceId = 'card-999999'; },
    state => { state.wx01.receipt.cards[0].rarity = 'epic'; },
    state => { state.wx01.receipt.cards.reverse(); },
    state => { state.wx01.receipt.cost = 0; }, state => { state.wx01.receipt.id = 'wx01-2'; },
    state => { state.wx01.extra = true; }, state => { delete state.wx01; },
  ];
  for (const mutate of mutations) {
    const profile = copy(result.profile); mutate(profile); const saved = copy(profile);
    assert.throws(() => hydrateProfile(profile, { now }), RangeError);
    assert.deepEqual(profile, saved);
  }
});
