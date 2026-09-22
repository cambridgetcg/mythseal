import assert from 'node:assert/strict';
import test from 'node:test';
import { NODES, createProfile, hydrateProfile, beginBattle, finishBattle, isNodeUnlocked } from '../progression.mjs';
import { STORY_NODES, WORLDS, nextNodeInWorld } from '../stories.mjs';
import { validateDeck } from '../engine.mjs';
import { createSnapshot, restoreSnapshot, validateSnapshot } from '../cloud-save.mjs';

const now = '2026-09-21T12:00:00Z';
const fresh = () => createProfile({ now });
const legacyIds = ['mist-gate', 'jade-forest', 'ember-pass', 'moon-lake', 'sky-palace', 'sea-throne'];
const worlds = WORLDS.filter(world => world.id !== 'shanhai');
function complete(profile, nodeId, winner = 'player') {
  const started = beginBattle(profile, { kind: 'expedition', nodeId, now });
  return finishBattle(started.profile, { encounterId: started.encounter.id, winner, playedCardIds: ['qingxiao'], now });
}

test('the original six nodes keep IDs, fields, levels and rewards; three independent four-stage chapters append', () => {
  assert.deepEqual(NODES.slice(0, 6).map(node => node.id), legacyIds);
  const original = [
    ['霧隱渡口', '穿霧入山', '渡船停在霧中，掌燈人正等你落下第一子。', 13, 69, '守渡弈者'],
    ['青玉森庭', '聽風尋跡', '古木成陣，循着林間鈴聲尋見森羅守衛。', 28, 34, '青玉巡林者'],
    ['赤燼關', '向火而行', '踏過溫熱玄石，在不熄的火光前磨鍊心志。', 54, 22, '赤燼關守'],
    ['鏡月澤', '照見本心', '星河映在水面，渡影人以真假難辨的招式相迎。', 55, 59, '鏡月問心人'],
    ['雲闕天階', '拾級問天', '踏上雲端長階，丹師以星軌驗證你的取捨。', 83, 15, '雲闕司星'],
    ['歸墟王座', '萬象歸一', '山海盡頭的王座空着，最後一局留給你自己。', 86, 49, '歸墟守望者'],
  ];
  NODES.slice(0, 6).forEach((node, index) => {
    assert.deepEqual([node.name, node.subtitle, node.description, node.x, node.y, node.enemyName], original[index]);
    assert.equal(node.worldId, 'shanhai'); assert.equal(node.order, index); assert.equal(node.level, Math.min(5, index + 1));
    assert.deepEqual(node.winReward, { coins: 80 + index * 20, dust: 2 + Math.floor(index / 2), xp: 30 + index * 10 });
    assert.deepEqual(node.firstClearReward, { coins: 140 + index * 40, dust: 8 + index * 2, xp: 50 + index * 10 });
    assert.deepEqual(node.dailyReward, { coins: 80 + index * 15, dust: 4 + index, xp: 20 });
  });
  assert.equal(NODES.length, 18); assert.equal(STORY_NODES.length, 12); assert.equal(worlds.length, 3);
  assert.equal(new Set(NODES.map(node => node.id)).size, 18);
  for (const world of worlds) {
    assert.equal(world.nodeIds.length, 4);
    world.nodeIds.forEach((id, index) => {
      const node = NODES.find(item => item.id === id);
      assert.equal(node.worldId, world.id); assert.equal(node.order, index);
      assert.equal(node.requiresNode, index ? world.nodeIds[index - 1] : 'mist-gate');
      assert.equal(validateDeck(node.opponentDeck).valid, true);
      assert.equal(nextNodeInWorld(id), world.nodeIds[index + 1] || null);
    });
  }
});

test('Mist Gate opens every story entrance; later stages need only their own chapter chain', () => {
  let profile = fresh();
  for (const world of worlds) {
    assert.equal(isNodeUnlocked(profile, world.nodeIds[0]), false);
    assert.throws(() => beginBattle(profile, { kind: 'expedition', nodeId: world.nodeIds[0], now }), /前一處/);
  }
  profile = complete(profile, 'mist-gate').profile;
  for (const world of worlds) {
    assert.equal(isNodeUnlocked(profile, world.nodeIds[0]), true);
    assert.equal(isNodeUnlocked(profile, world.nodeIds[1]), false);
  }
  const branch = worlds[1];
  for (const id of branch.nodeIds) {
    assert.equal(isNodeUnlocked(profile, id), true);
    profile = complete(profile, id).profile;
  }
  assert(!profile.cleared.includes('jade-forest'));
  for (const world of worlds.filter(world => world !== branch)) {
    assert.equal(isNodeUnlocked(profile, world.nodeIds[0]), true);
    assert.equal(isNodeUnlocked(profile, world.nodeIds[1]), false);
  }
});

test('branch clears keep chronological order through local hydration and cloud validation', () => {
  let profile = complete(fresh(), 'mist-gate').profile;
  const route = [worlds[2].nodeIds[0], worlds[0].nodeIds[0], 'jade-forest', worlds[2].nodeIds[1], worlds[1].nodeIds[0]];
  for (const id of route) profile = complete(profile, id).profile;
  assert.deepEqual(profile.cleared, ['mist-gate', ...route]);
  const original = structuredClone(profile), hydrated = hydrateProfile(profile, { now });
  assert.deepEqual(hydrated, original);
  const snapshot = createSnapshot(profile);
  assert.deepEqual(validateSnapshot(snapshot).profile.cleared, original.cleared);
  assert.deepEqual(restoreSnapshot(snapshot, { now }), original);
});

test('invalid holes drop only their dependent clears and cannot unlock descendants through a dangling parent', () => {
  const profile = fresh(), a = worlds[0].nodeIds, b = worlds[1].nodeIds;
  profile.cleared = ['mist-gate', 'ember-pass', a[2], b[0], b[1], a[0], a[3], 'missing', b[0]];
  profile.location = a[3];
  const next = hydrateProfile(profile, { now });
  assert.deepEqual(next.cleared, ['mist-gate', b[0], b[1], a[0]]);
  assert.equal(next.location, 'mist-gate');
  assert.equal(isNodeUnlocked(next, b[2]), true); assert.equal(isNodeUnlocked(next, a[2]), false);
  assert.equal(isNodeUnlocked({ ...profile, cleared: [a[2]] }, a[3]), false);
  profile.cleared = [a[1], 'mist-gate', a[0]];
  assert.deepEqual(hydrateProfile(profile, { now }).cleared, profile.cleared, 'Prerequisites need to exist, not be sorted in array order');
  const missingGate = { ...profile, cleared: [a[0], a[1], ...b] };
  assert.deepEqual(hydrateProfile(missingGate, { now }).cleared, []);
});

test('old six-node progress and exact pending decks survive expansion and new chapter resume', () => {
  let profile = fresh();
  for (const id of legacyIds) profile = complete(profile, id).profile;
  const original = structuredClone(profile); delete profile.weekly;
  const upgraded = hydrateProfile(profile, { now });
  assert.deepEqual(upgraded.cleared, legacyIds); assert.equal(upgraded.location, 'sea-throne');
  assert.deepEqual(upgraded.instances, original.instances); assert.deepEqual(upgraded.deckSlots, original.deckSlots);
  const started = beginBattle(upgraded, { kind: 'expedition', nodeId: worlds[2].nodeIds[0], now });
  const reloaded = hydrateProfile(started.profile, { now: '2026-09-28T12:00:00Z' });
  assert.deepEqual(reloaded.pending, started.profile.pending); assert.deepEqual(reloaded.instances, started.profile.instances);
  assert.equal(reloaded.location, worlds[2].nodeIds[0]);
  const settled = finishBattle(reloaded, { encounterId: reloaded.pending.id, winner: 'player', playedCardIds: ['qingxiao'], now: '2026-09-28T12:00:00Z' });
  assert.equal(settled.reward.cardXP[0].uid, started.encounter.cardInstances.qingxiao);
  assert.equal(settled.profile.weekly.matches, 1); assert.equal(settled.profile.weekly.expeditionWins, 1);
  assert.throws(() => finishBattle(settled.profile, { encounterId: started.encounter.id, winner: 'player', now }), /已結算/);
});

test('story first-clear/cache rewards pay once and losses/draws never open later stages', () => {
  let profile = complete(fresh(), 'mist-gate').profile;
  const id = worlds[0].nodeIds[0], node = NODES.find(item => item.id === id);
  for (const winner of ['opponent', 'draw']) {
    const lost = complete(profile, id, winner); profile = lost.profile;
    assert.equal(lost.reward.firstClear, false); assert.equal(lost.reward.dailyCache, false);
    assert.equal(isNodeUnlocked(profile, worlds[0].nodeIds[1]), false);
  }
  const first = complete(profile, id); profile = first.profile;
  assert(first.reward.firstClear); assert(first.reward.dailyCache);
  for (const key of ['coins', 'dust', 'xp']) assert.equal(first.reward[key], node.winReward[key] + node.firstClearReward[key] + node.dailyReward[key]);
  const repeated = complete(profile, id);
  assert.equal(repeated.reward.firstClear, false); assert.equal(repeated.reward.dailyCache, false);
  for (const key of ['coins', 'dust', 'xp']) assert.equal(repeated.reward[key], node.winReward[key]);
  assert.equal(repeated.profile.cleared.filter(value => value === id).length, 1);
});
