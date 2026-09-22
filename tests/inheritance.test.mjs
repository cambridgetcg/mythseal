import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, hydrateProfile, beginBattle, buyPack, sellInstance, setLeaderInstance } from '../progression.mjs';
import { mintInstance, getInstance, getPreferredInstance, setInstanceXP, saveInstanceDeck, syncCollection } from '../collection.mjs';
import { createSnapshot, restoreSnapshot } from '../cloud-save.mjs';
import { assertLocalProfile } from '../profile-store.mjs';
import { MAX_INHERITANCE_MATERIALS, getInheritanceTargetReason, getInheritanceMaterials, previewInheritance, inheritInstances } from '../inheritance.mjs';

const now = '2026-09-22T12:00:00.000Z';
const copy = value => structuredClone(value);
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
function fixture(printId = 'wx01-005-tr1') {
  let profile = createProfile({ now });
  const legacy = getPreferredInstance(profile, 'wukong').uid;
  const target = mintInstance(profile, 'wukong', { printId, now, source: 'target-fixture' });
  const material = mintInstance(target.profile, 'wukong', { printId: 'wx01-005-base', now, source: 'base-fixture' });
  profile = material.profile;
  return { profile, targetUid: target.instance.uid, materialUids: [legacy, material.instance.uid] };
}
function inDeck(profile, uid, slotId = 'deck-2') {
  return saveInstanceDeck(profile, { slotId, instanceIds: profile.deckSlots[0].instanceIds.map((old, index) => index === 3 ? uid : old) });
}
function unchangedFailure(profile, action, pattern = RangeError) {
  const before = copy(profile);
  assert.throws(() => action(freeze(profile)), pattern);
  assert.deepEqual(profile, before);
}

test('material list contains only same-card siblings with explicit eligibility, XP and no auto-selection', () => {
  const { profile, targetUid, materialUids } = fixture();
  const special = mintInstance(profile, 'wukong', { printId: 'wx01-005-aa1', now });
  const rows = getInheritanceMaterials(freeze(special.profile), targetUid);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.filter(row => row.eligible).map(row => row.instance.uid), materialUids);
  assert(rows.filter(row => row.eligible).every(row => row.reason === null && row.offeredXP === 80));
  const protectedArt = rows.find(row => row.instance.uid === special.instance.uid);
  assert.equal(protectedArt.eligible, false); assert.match(protectedArt.reason, /本畫/);
  assert.equal(Object.hasOwn(rows[0], 'selected'), false);
  assert.throws(() => { rows[0].instance.xp = 600; }, TypeError);
  assert.equal(getInstance(special.profile, materialUids[0]).xp, 0);
});

test('legacy and WX01 base copies both contribute 80 plus their existing XP to one exact treasure copy', () => {
  let { profile, targetUid, materialUids } = fixture();
  profile = setInstanceXP(profile, targetUid, 100);
  profile = setInstanceXP(profile, materialUids[0], 90);
  profile = setInstanceXP(profile, materialUids[1], 200);
  Object.assign(profile.instances.find(instance => instance.uid === targetUid), { locked: true, battles: 15, wins: 9 });
  const original = copy(profile), targetBefore = getInstance(profile, targetUid);
  const quote = previewInheritance(freeze(profile), targetUid, [...materialUids].reverse());
  assert.deepEqual(quote.materialUids, [...materialUids].sort());
  assert.deepEqual(previewInheritance(profile, targetUid, materialUids), quote);
  assert.equal(quote.beforeXP, 100); assert.equal(quote.afterXP, 550);
  assert.equal(quote.beforeLevel, 2); assert.equal(quote.afterLevel, 4);
  assert.equal(quote.offeredXP, 450); assert.equal(quote.gainedXP, 450); assert.equal(quote.overflowXP, 0);
  const result = inheritInstances(profile, freeze(quote));
  assert.equal(result.consumedCount, 2); assert.deepEqual(result.materials.map(instance => instance.uid), quote.materialUids);
  assert.deepEqual(getInstance(result.profile, targetUid), { ...targetBefore, xp: 550, level: 4 });
  assert.equal(result.profile.inventory.wukong, 1); assert.equal(result.profile.levels.wukong, 4);
  assert.equal(result.profile.instanceSerial, original.instanceSerial);
  assert(materialUids.every(uid => !result.profile.instances.some(instance => instance.uid === uid)));
  for (const field of ['coins', 'dust', 'xp', 'daily', 'weekly', 'wx01', 'merchantVault', 'stats', 'arena', 'deckSlots', 'activeDeckId', 'serial']) assert.deepEqual(result.profile[field], original[field]);
  assert.deepEqual(profile, original);
});

test('every target treatment accepts base material; locked, saved-deck and displayed leader targets remain allowed', () => {
  for (const printId of ['legacy/wukong', 'wx01-005-base', 'wx01-005-aa1', 'wx01-005-laa1', 'wx01-005-ink1', 'wx01-005-tr1']) {
    let { profile, targetUid, materialUids } = fixture(printId);
    profile = inDeck(profile, targetUid);
    profile.instances.find(instance => instance.uid === targetUid).locked = true;
    if (printId.endsWith('laa1')) profile = setLeaderInstance(profile, targetUid);
    assert.equal(getInheritanceTargetReason(profile, targetUid), null);
    const quote = previewInheritance(profile, targetUid, [materialUids[0]]);
    const result = inheritInstances(freeze(profile), quote);
    assert.equal(getInstance(result.profile, targetUid).printId, printId);
    assert.equal(getInstance(result.profile, targetUid).locked, true);
    assert.deepEqual(result.profile.deckSlots, profile.deckSlots);
    assert.equal(result.profile.wx01.leaderInstanceId, profile.wx01.leaderInstanceId);
    assertLocalProfile(result.profile);
  }
});

test('partial cap overflow is visible, while a wholly unnecessary donor is rejected with removal guidance', () => {
  let { profile, targetUid, materialUids } = fixture();
  profile = setInstanceXP(profile, targetUid, 650);
  const quote = previewInheritance(profile, targetUid, [materialUids[0]]);
  assert.deepEqual([quote.offeredXP, quote.gainedXP, quote.overflowXP, quote.afterXP, quote.afterLevel], [80, 50, 30, 700, 5]);
  unchangedFailure(profile, value => previewInheritance(value, targetUid, materialUids), /取消多餘素材/);
  const result = inheritInstances(profile, quote);
  assert.equal(result.profile.inventory.wukong, 2);
  assert.match(getInheritanceTargetReason(result.profile, targetUid), /Lv.5/);
  unchangedFailure(result.profile, value => previewInheritance(value, targetUid, [materialUids[1]]), /Lv.5/);
  const rows = getInheritanceMaterials(result.profile, targetUid);
  assert.equal(rows.length, 1); assert.equal(rows[0].eligible, false); assert.match(rows[0].reason, /Lv.5/);
});

test('redundancy checks every selected donor regardless of input order; a trained donor can be sufficient alone', () => {
  let { profile, targetUid, materialUids } = fixture();
  profile = setInstanceXP(profile, targetUid, 600);
  profile = setInstanceXP(profile, materialUids[0], 700);
  for (const ids of [materialUids, [...materialUids].reverse()]) unchangedFailure(profile, value => previewInheritance(value, targetUid, ids), /取消多餘素材/);
  const quote = previewInheritance(profile, targetUid, [materialUids[0]]);
  assert.equal(quote.offeredXP, 780); assert.equal(quote.gainedXP, 100); assert.equal(quote.overflowXP, 680);
  assert.equal(inheritInstances(profile, quote).afterXP, 700);
});

test('nine fresh materials can finish an empty target; ten are never silently selected or consumed', () => {
  let { profile, targetUid, materialUids } = fixture();
  for (let index = materialUids.length; index < 10; index++) {
    const minted = mintInstance(profile, 'wukong', { now }); profile = minted.profile; materialUids.push(minted.instance.uid);
  }
  assert.equal(MAX_INHERITANCE_MATERIALS, 9);
  const quote = previewInheritance(profile, targetUid, materialUids.slice(0, 9));
  assert.equal(quote.offeredXP, 720); assert.equal(quote.overflowXP, 20);
  assert.equal(inheritInstances(profile, quote).consumedCount, 9);
  unchangedFailure(profile, value => previewInheritance(value, targetUid, materialUids), /最多 9 張/);
});

test('only distinct owned same-character base donors can be explicitly selected', () => {
  const fixtureValue = fixture(); let { profile } = fixtureValue;
  const { targetUid, materialUids } = fixtureValue;
  const special = mintInstance(profile, 'wukong', { printId: 'wx01-005-aa1', now }); profile = special.profile;
  const other = getPreferredInstance(profile, 'qingxiao').uid;
  for (const ids of [undefined, [], 'all', [null], [materialUids[0], materialUids[0]], [targetUid], ['card-999999'], [other], [special.instance.uid]]) unchangedFailure(profile, value => previewInheritance(value, targetUid, ids));
  const sold = sellInstance(profile, materialUids[0], now);
  unchangedFailure(sold, value => previewInheritance(value, targetUid, [materialUids[0]]), /找不到/);
  assert(!getInheritanceMaterials(sold, targetUid).some(row => row.instance.uid === materialUids[0]));
});

test('locks, every saved deck, pending battles and displayed leader copies are protected donors', () => {
  const { profile, targetUid, materialUids } = fixture(), donor = materialUids[0];
  const cases = [
    value => { value.instances.find(instance => instance.uid === donor).locked = true; return value; },
    ...['deck-1', 'deck-2', 'deck-3'].map(slotId => value => inDeck(value, donor, slotId)),
    value => beginBattle(inDeck(value, donor, 'deck-1'), { kind: 'arena', now }).profile,
    value => { value.wx01.leaderInstanceId = donor; return value; },
  ];
  for (const change of cases) {
    const guarded = change(copy(profile));
    const row = getInheritanceMaterials(guarded, targetUid).find(item => item.instance.uid === donor);
    assert.equal(row.eligible, false); assert(row.reason);
    unchangedFailure(guarded, value => previewInheritance(value, targetUid, [donor]));
  }
});

test('unacknowledged pack copies are protected as either target or donor; unrelated pending/receipt copies stay untouched', () => {
  let profile = createProfile({ now });
  const existing = mintInstance(profile, 'tangsanzang', { now }); profile = existing.profile;
  const pack = buyPack(profile, { set: 'wx01', rng: () => 0, now }); profile = pack.profile;
  const donor = pack.cards[0].instanceId;
  assert.equal(getInheritanceTargetReason(profile, existing.instance.uid), null);
  unchangedFailure(profile, value => previewInheritance(value, existing.instance.uid, [donor]), /先確認/);
  assert.match(getInheritanceTargetReason(profile, donor), /先確認/);
  unchangedFailure(profile, value => previewInheritance(value, donor, [existing.instance.uid]), /先確認/);
  let other = fixture();
  other.profile = beginBattle(other.profile, { kind: 'arena', now }).profile;
  other.profile = buyPack(other.profile, { set: 'wx01', rng: () => 0, now }).profile;
  const quote = previewInheritance(other.profile, other.targetUid, [other.materialUids[0]]);
  const result = inheritInstances(other.profile, quote);
  assert.deepEqual(result.profile.pending, other.profile.pending);
  assert.deepEqual(result.profile.wx01.receipt, other.profile.wx01.receipt);
  assertLocalProfile(result.profile);
});

test('a target used by a pending battle is blocked even though target deck membership alone is allowed', () => {
  let { profile, targetUid, materialUids } = fixture();
  profile = beginBattle(inDeck(profile, targetUid, 'deck-1'), { kind: 'arena', now }).profile;
  assert.match(getInheritanceTargetReason(profile, targetUid), /未完對局/);
  assert(getInheritanceMaterials(profile, targetUid).every(row => !row.eligible && /未完對局/.test(row.reason)));
  unchangedFailure(profile, value => previewInheritance(value, targetUid, materialUids), /未完對局/);
});

test('exact target and selected donor metadata changes invalidate a quote without consuming anything', () => {
  const { profile, targetUid, materialUids } = fixture();
  const quote = previewInheritance(profile, targetUid, [materialUids[0]]);
  for (const uid of [targetUid, materialUids[0]]) for (const [field, value] of [
    ['acquiredAt', '2026-09-21T12:00:00.000Z'], ['origin', 'changed-origin'], ['battles', 1], ['wins', 1], ['locked', true],
    ['printId', uid === targetUid ? 'wx01-005-aa1' : 'wx01-005-base'], ['xp', 1],
  ]) {
    const changed = copy(profile); changed.instances.find(instance => instance.uid === uid)[field] = value;
    unchangedFailure(changed, latest => inheritInstances(latest, quote));
  }
  for (const change of [
    value => inDeck(value, materialUids[0]),
    value => beginBattle(inDeck(value, targetUid, 'deck-1'), { kind: 'arena', now }).profile,
    value => { value.wx01.receipt = { cards: [{ instanceId: materialUids[0] }] }; return value; },
  ]) unchangedFailure(change(copy(profile)), value => inheritInstances(value, quote));
});

test('quote tampering and replay fail atomically, while unrelated current profile changes remain intact', () => {
  const { profile, targetUid, materialUids } = fixture();
  const quote = previewInheritance(profile, targetUid, [materialUids[0]]);
  for (const change of [
    value => { value.afterXP++; }, value => { value.offeredXP++; }, value => { value.fingerprint += 'changed'; },
    value => { value.materialUids = [materialUids[1]]; }, value => { value.extra = true; }, value => { delete value.beforeXP; },
  ]) { const invalid = copy(quote); change(invalid); unchangedFailure(profile, value => inheritInstances(value, invalid)); }
  const changed = copy(profile); changed.coins += 200; changed.daily.loginClaimed = true;
  changed.instances.find(instance => instance.cardId === 'qingxiao').locked = true;
  const result = inheritInstances(freeze(changed), freeze(quote));
  assert.equal(result.profile.coins, changed.coins); assert.equal(result.profile.daily.loginClaimed, true);
  assert.equal(result.profile.instances.find(instance => instance.cardId === 'qingxiao').locked, true);
  unchangedFailure(result.profile, value => inheritInstances(value, quote), /找不到/);
});

test('canonical hydration and cloud round trip retain UID gaps, target history and vault without new fields', () => {
  let { profile, targetUid, materialUids } = fixture();
  const spare = mintInstance(profile, 'wukong', { now }); profile = sellInstance(spare.profile, spare.instance.uid, now);
  const serial = profile.instanceSerial, vault = copy(profile.merchantVault);
  const result = inheritInstances(profile, previewInheritance(profile, targetUid, materialUids));
  assert.equal(result.profile.instanceSerial, serial); assert.deepEqual(result.profile.merchantVault, vault);
  assert.deepEqual(Object.keys(result.profile).sort(), Object.keys(profile).sort());
  assert.deepEqual(Object.keys(getInstance(result.profile, targetUid)).sort(), Object.keys(getInstance(profile, targetUid)).sort());
  assert.deepEqual(hydrateProfile(result.profile, { now }), result.profile);
  assertLocalProfile(result.profile);
  assert.deepEqual(restoreSnapshot(createSnapshot(result.profile), { now }), result.profile);
  assert.equal(mintInstance(result.profile, 'wukong', { now }).instance.uid, `card-${String(serial + 1).padStart(6, '0')}`);
});

test('invalid or ambiguous selected copy identities and XP are rejected rather than repaired into donors', () => {
  const { profile, targetUid, materialUids } = fixture(), donor = materialUids[0];
  for (const change of [
    instance => { delete instance.printId; }, instance => { instance.printId = 'wx01-001-base'; },
    instance => { instance.xp = -1; }, instance => { instance.xp = 701; }, instance => { instance.xp = '80'; }, instance => { instance.level = 5; },
  ]) {
    const changed = copy(profile); change(changed.instances.find(instance => instance.uid === donor));
    unchangedFailure(changed, value => previewInheritance(value, targetUid, [donor]));
  }
  const duplicated = copy(profile); duplicated.instances.push(copy(getInstance(profile, donor)));
  unchangedFailure(duplicated, value => previewInheritance(value, targetUid, [donor]));
  const overlapping = copy(profile); overlapping.merchantVault.push({ instance: copy(getInstance(profile, donor)), sellPrice: 180, buybackPrice: 225, soldAt: now });
  unchangedFailure(overlapping, value => previewInheritance(value, targetUid, [donor]));
  assert.deepEqual(syncCollection(profile), profile);
});
