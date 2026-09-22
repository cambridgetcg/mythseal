import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, hydrateProfile, buyWX01Box, buyPack, acknowledgeWX01Receipt, redeemWX01Print, claimWX01StoryPrint, sellInstance } from '../progression.mjs';
import { syncCollection, getInstance } from '../collection.mjs';
import { getPrinting } from '../printing-catalogue.mjs';
import { createWX01State } from '../wx01-state.mjs';
import { seededRng } from '../tools/wx01-drop-model.mjs';

const now = '2026-09-22T12:00:00.000Z';
const copy = value => structuredClone(value);
const fresh = () => { const profile = createProfile({ now }); profile.coins = 20_000; return profile; };
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

for (const packs of [12, 24]) test(`${packs}-pack box charges full price once and carries single-pack results, RNG and dry state in order`, () => {
  const profile = fresh();
  profile.wx01.opened = 7; profile.wx01.serial = 7; profile.wx01.dry = 7; profile.wx01.seals = 7;
  const source = copy(profile), expectedPacks = [], expectedCards = [];
  const boxRandom = seededRng(7331), singleRandom = seededRng(7331);
  let single = copy(profile), boxCalls = 0, singleCalls = 0;
  for (let index = 0; index < packs; index++) {
    const result = buyPack(single, { set: 'wx01', now, rng: () => { singleCalls++; return singleRandom(); } });
    expectedPacks.push({ mode: result.mode, cards: result.cards }); expectedCards.push(...result.cards);
    single = acknowledgeWX01Receipt(result.profile, result.receipt.id);
  }
  const result = buyWX01Box(freeze(profile), { packs, now, rng: () => { boxCalls++; return boxRandom(); } });
  assert.equal(result.set, 'wx01'); assert.equal(result.cost, packs * 300);
  assert.equal(result.profile.coins, source.coins - packs * 300);
  assert.equal(result.profile.wx01.opened, 7 + packs); assert.equal(result.profile.wx01.seals, 7 + packs);
  assert.equal(result.profile.daily.packs, packs); assert.equal(result.profile.wx01.serial, 8);
  assert.equal(result.receipt.kind, 'box'); assert.equal(result.receipt.mode, 'box'); assert.equal(result.receipt.id, 'wx01-8');
  assert.equal(result.receipt.cost, packs * 300); assert.equal(result.receipt.sealsEarned, packs);
  assert.equal(result.receipt.openedAt, now); assert.equal(result.cards.length, packs * 3);
  assert.equal(new Set(result.cards.map(card => card.instanceId)).size, packs * 3);
  assert.deepEqual(result.receipt.packs, expectedPacks); assert.deepEqual(result.cards, expectedCards);
  assert.deepEqual(result.receipt.cards, result.cards); assert.equal(boxCalls, singleCalls);
  assert.equal(result.profile.wx01.dry, single.wx01.dry);
  assert.deepEqual(result.profile.instances, single.instances);
  for (const card of result.cards) {
    const instance = getInstance(result.profile, card.instanceId);
    assert.equal(instance.printId, card.printId); assert.equal(instance.level, 1); assert.equal(instance.xp, 0);
  }
  assert.deepEqual(hydrateProfile(result.profile, { now }), result.profile);
  assert.deepEqual(profile, source);
  result.cards[0].printId = 'changed'; result.receipt.packs[0].cards[0].printId = 'changed';
  assert.notEqual(result.profile.wx01.receipt.cards[0].printId, 'changed');
  assert.notEqual(result.profile.wx01.receipt.packs[0].cards[0].printId, 'changed');
});

test('default twelve-pack box crosses pity at its twelfth pack, while twenty-four crosses twice', () => {
  const first = buyWX01Box(fresh(), { now, rng: () => 0 });
  assert.equal(first.cost, 3600); assert.equal(first.receipt.packs.length, 12);
  assert.deepEqual(first.receipt.packs.map(pack => pack.mode), [...Array(11).fill('ordinary'), 'aa']);
  assert.equal(first.profile.wx01.dry, 0);
  const double = buyWX01Box(fresh(), { packs: 24, now, rng: () => 0 });
  assert.deepEqual(double.receipt.packs.map((pack, index) => pack.mode === 'aa' ? index + 1 : null).filter(Boolean), [12, 24]);
  assert.equal(double.profile.wx01.dry, 0);
  const carried = fresh(); carried.wx01.opened = 11; carried.wx01.serial = 11; carried.wx01.dry = 11;
  const result = buyWX01Box(carried, { now, rng: () => 0 });
  assert.equal(result.receipt.packs[0].mode, 'aa'); assert.equal(result.profile.wx01.dry, 11);
});

test('one mixed-mode box preserves all six sampler modes and every individual pack rarity floor', () => {
  const runs = [
    [0, 0, 0, 0, 0, 0, 0], [.84, 0, 0, 0, 0, 0], [.97, 0, 0, 0, 0, 0, 0, 0],
    [.99, 0, 0, 0, 0, 0], [.998, 0, 0, 0, 0, 0], [.9999, 0, 0, 0],
  ];
  const values = [...runs.flat(), ...runs.flat()]; let calls = 0;
  const result = buyWX01Box(fresh(), { now, rng: () => { assert(calls < values.length); return values[calls++]; } });
  assert.equal(calls, values.length);
  assert.deepEqual(result.receipt.packs.map(pack => pack.mode), ['ordinary', 'aa', 'leader', 'treasure', 'ink', 'god', 'ordinary', 'aa', 'leader', 'treasure', 'ink', 'god']);
  for (const pack of result.receipt.packs) {
    assert(pack.cards.some(card => card.rarity !== 'common'));
    if (pack.mode === 'god') {
      assert.equal(new Set(pack.cards.map(card => card.cardId)).size, 3);
      assert.deepEqual(pack.cards.map(card => getPrinting(card.printId).treatment), ['aa', 'leader', 'ink']);
    }
  }
  assert.deepEqual(hydrateProfile(result.profile, { now }), result.profile);
});

test('box preflight rejects unsupported size, missing balance and overflowing counters without invoking RNG', () => {
  for (const packs of [0, 1, 3, 11, 13, 25, -12, 12.5, '12', null, NaN, Infinity]) {
    const profile = fresh(), original = copy(profile); let calls = 0;
    assert.throws(() => buyWX01Box(profile, { packs, now, rng: () => { calls++; return 0; } }), RangeError);
    assert.equal(calls, 0); assert.deepEqual(profile, original);
  }
  const cases = [
    profile => { profile.coins = 3599; },
    ...[NaN, Infinity, '3600', -1, 1_000_000_001].map(value => profile => { profile.coins = value; }),
    profile => { profile.wx01.opened = 1_000_000_000 - 11; },
    profile => { profile.wx01.seals = 1_000_000_000 - 11; },
    profile => { profile.wx01.serial = 1_000_000_000; },
    profile => { profile.daily.packs = 1_000_000_000 - 11; },
    profile => { profile.instanceSerial = Number.MAX_SAFE_INTEGER - 35; },
  ];
  for (const mutate of cases) {
    const profile = fresh(); mutate(profile); const original = copy(profile); let calls = 0;
    assert.throws(() => buyWX01Box(profile, { now, rng: () => { calls++; return 0; } }), RangeError);
    assert.equal(calls, 0); assert.deepEqual(profile, original);
  }
  const boundary = fresh();
  boundary.wx01.opened = boundary.wx01.seals = boundary.daily.packs = 1_000_000_000 - 12;
  boundary.wx01.serial = 1_000_000_000 - 1;
  const result = buyWX01Box(boundary, { now, rng: () => 0 });
  assert.equal(result.profile.wx01.opened, 1_000_000_000);
  assert.equal(result.profile.wx01.seals, 1_000_000_000);
  assert.equal(result.profile.wx01.serial, 1_000_000_000);
  assert.equal(result.profile.daily.packs, 1_000_000_000);
});

test('invalid early or final RNG aborts the whole box without partial payment, cards or counters', () => {
  for (const after of [0, 15, 82]) for (const bad of [-1, 1, NaN, '0']) {
    const profile = fresh(), original = copy(profile); let calls = 0;
    assert.throws(() => buyWX01Box(freeze(profile), { now, rng: () => calls++ === after ? bad : 0 }), RangeError);
    assert.equal(calls, after + 1); assert.deepEqual(profile, original);
  }
});

test('one box receipt resumes unchanged, protects all copies and blocks other grants until exact acknowledgement', () => {
  const result = buyWX01Box(fresh(), { now, rng: () => 0 });
  const profile = hydrateProfile(result.profile, { now }); let calls = 0;
  assert.deepEqual(profile.wx01.receipt, result.receipt);
  assert.throws(() => buyWX01Box(profile, { now, rng: () => { calls++; return 0; } }), /先確認/);
  for (const set of ['all', 'classics', 'wx01']) assert.throws(() => buyPack(profile, { set, now, rng: () => { calls++; return 0; } }), /先確認/);
  assert.throws(() => redeemWX01Print(profile, 'wx01-005-aa1', { now }), /先確認/);
  assert.throws(() => claimWX01StoryPrint(profile, 'wx01-005-aa1', { now }), /先確認/);
  assert.equal(calls, 0);
  for (const card of result.cards) assert.throws(() => sellInstance(profile, card.instanceId, now), /先確認/);
  assert.throws(() => acknowledgeWX01Receipt(profile, 'wx01-2'), RangeError);
  const acknowledged = acknowledgeWX01Receipt(profile, result.receipt.id);
  assert.equal(acknowledged.wx01.receipt, null);
  assert.deepEqual(acknowledgeWX01Receipt(acknowledged, result.receipt.id), acknowledged);
  assert.equal(acknowledged.wx01.opened, 12); assert.equal(acknowledged.wx01.seals, 12);
  const next = buyPack(acknowledged, { set: 'wx01', now, rng: () => 0 });
  assert.throws(() => acknowledgeWX01Receipt(next.profile, result.receipt.id), /已更新/);
});

function nearCapacity(count, vault = 0) {
  const profile = fresh(), template = profile.instances[0];
  for (let index = profile.instances.length + 1; index <= count; index++) profile.instances.push({ ...template, uid: `card-${String(index).padStart(6, '0')}` });
  profile.instanceSerial = count;
  for (let index = 0; index < vault; index++) profile.merchantVault.push({ instance: profile.instances.pop(), sellPrice: 40, buybackPrice: 50, soldAt: now });
  return syncCollection(profile);
}
test('box capacity includes the vault and reserves every copy before the first draw', () => {
  for (const packs of [12, 24]) {
    const profile = nearCapacity(10_001 - packs * 3, 20), original = copy(profile); let calls = 0;
    assert.throws(() => buyWX01Box(profile, { packs, now, rng: () => { calls++; return 0; } }), /10,000/);
    assert.equal(calls, 0); assert.deepEqual(profile, original);
  }
  const result = buyWX01Box(nearCapacity(9964, 20), { now, rng: () => 0 });
  assert.equal(result.profile.instances.length + result.profile.merchantVault.length, 10_000);
  assert.equal(result.profile.instanceSerial, 10_000);
});

test('box validator rejects changed flattening/order, nested card fields, malformed packs and per-pack mode/floor mismatches', () => {
  const source = buyWX01Box(fresh(), { now, rng: () => 0 }).profile;
  const changes = [
    p => { p.wx01.receipt.packs.pop(); }, p => { p.wx01.receipt.packs = '12'; },
    p => { p.wx01.receipt.cards.reverse(); }, p => { p.wx01.receipt.cards.pop(); },
    p => { p.wx01.receipt.cost = 3000; }, p => { p.wx01.receipt.sealsEarned = 1; },
    p => { p.wx01.receipt.mode = 'aa'; }, p => { p.wx01.receipt.packs[0].mode = 'box'; },
    p => { p.wx01.receipt.packs[0].extra = true; }, p => { p.wx01.receipt.packs[0].cards[0].extra = true; },
    p => { p.wx01.receipt.packs[0].cards[0].rarity = 'epic'; },
    p => { p.wx01.receipt.packs[0].cards[0].instanceId = p.wx01.receipt.cards[1].instanceId; },
    p => { p.wx01.receipt.packs[0].cards = p.wx01.receipt.packs[0].cards.slice(0, 2); },
    p => { p.wx01.receipt.packs[0].mode = 'aa'; },
    p => { p.wx01.opened = 11; },
  ];
  for (const change of changes) {
    const profile = copy(source); change(profile); const original = copy(profile);
    assert.throws(() => hydrateProfile(profile, { now }), RangeError); assert.deepEqual(profile, original);
  }
  const god = buyWX01Box(fresh(), { now, rng: () => .9999 }).profile;
  const altered = copy(god);
  [altered.wx01.receipt.cards[0], altered.wx01.receipt.cards[2]] = [altered.wx01.receipt.cards[2], altered.wx01.receipt.cards[0]];
  altered.wx01.receipt.packs[0].cards = copy(altered.wx01.receipt.cards.slice(0, 3));
  assert.throws(() => hydrateProfile(altered, { now }), RangeError);
  const commonOnly = copy(source);
  const item = commonOnly.wx01.receipt.cards[2];
  Object.assign(item, { cardId: 'tangsanzang', printId: 'wx01-001-base', rarity: 'common' });
  Object.assign(commonOnly.instances.find(instance => instance.uid === item.instanceId), { cardId: item.cardId, printId: item.printId });
  commonOnly.wx01.receipt.packs[0].cards[2] = copy(item);
  assert.throws(() => hydrateProfile(commonOnly, { now }), RangeError, 'Every subpack must independently retain the rarity floor');

  const repeatedRole = copy(god);
  for (const [index, printId] of [[0, 'wx01-005-aa1'], [1, 'wx01-005-laa1']]) {
    const entry = repeatedRole.wx01.receipt.cards[index];
    Object.assign(entry, { cardId: 'wukong', printId, rarity: 'epic' });
    Object.assign(repeatedRole.instances.find(instance => instance.uid === entry.instanceId), { cardId: 'wukong', printId });
    repeatedRole.wx01.receipt.packs[0].cards[index] = copy(entry);
  }
  assert.throws(() => hydrateProfile(repeatedRole, { now }), RangeError, 'Valid individual prints still cannot repeat a god-pack character');
});

test('playtest gift marker is optional, preserves old singles exactly and never grants coins during hydration', () => {
  assert.equal(Object.hasOwn(createWX01State(), 'playtestGift'), false);
  const profile = fresh(), originalCoins = profile.coins;
  assert.equal(Object.hasOwn(hydrateProfile(profile, { now }).wx01, 'playtestGift'), false);
  profile.wx01.playtestGift = 'wx01-box-20260922';
  assert.deepEqual(hydrateProfile(profile, { now }), profile);
  assert.equal(hydrateProfile(profile, { now }).coins, originalCoins);
  const result = buyWX01Box(profile, { now, rng: () => 0 });
  assert.equal(result.profile.wx01.playtestGift, 'wx01-box-20260922');
  const single = buyPack(acknowledgeWX01Receipt(result.profile, result.receipt.id), { set: 'wx01', now, rng: () => 0 });
  assert.equal(Object.hasOwn(single.receipt, 'packs'), false);
  assert.deepEqual(hydrateProfile(single.profile, { now }), single.profile);
  for (const bad of [true, false, undefined, null, 'wx01-box', 'wx01-box-20260923', 10000]) {
    const invalid = fresh(); invalid.wx01.playtestGift = bad;
    assert.throws(() => hydrateProfile(invalid, { now }), RangeError);
  }
});
