import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PROFILE_KEY, PROFILE_VERSION, WEEKLY_TASKS, createProfile, hydrateProfile, refreshDaily,
  weekKey, getWeeklyTasks, claimWeeklyTask, beginBattle, finishBattle, abandonBattle,
} from '../progression.mjs';
import { createSnapshot, validateSnapshot, restoreSnapshot, fingerprintProfile } from '../cloud-save.mjs';
import { LEGACY_CARD_IDS } from '../engine.mjs';

const now = '2026-09-21T12:00:00Z';
const nextWeek = '2026-09-27T23:00:00Z';
const fresh = date => createProfile({ now: date || now });
const empty = week => ({ week, matches: 0, expeditionWins: 0, arenaMatches: 0, claimedTasks: [] });
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
function legacyV3(profile) {
  const old = structuredClone(profile);
  old.version = 3; old.collectionVersion = 1; old.collectionExpansion = 1;
  delete old.wx01;
  for (const instance of [...old.instances, ...old.merchantVault.map(entry => entry.instance)]) delete instance.printId;
  for (const field of ['inventory', 'levels']) old[field] = Object.fromEntries(LEGACY_CARD_IDS.map(id => [id, old[field][id]]));
  return old;
}
function completed(profile, kind, winner = 'player', date = now) {
  const started = beginBattle(profile, { kind, nodeId: 'mist-gate', now: date });
  return finishBattle(started.profile, { encounterId: started.encounter.id, winner, playedCardIds: ['qingxiao'], now: date }).profile;
}

test('London weeks start on Monday across summer/winter DST and year boundaries', () => {
  for (const [instant, expected] of [
    ['2026-09-27T22:59:59.999Z', '2026-09-21'], ['2026-09-27T23:00:00Z', '2026-09-28'],
    ['2026-03-29T22:59:59.999Z', '2026-03-23'], ['2026-03-29T23:00:00Z', '2026-03-30'],
    ['2026-10-25T23:59:59.999Z', '2026-10-19'], ['2026-10-26T00:00:00Z', '2026-10-26'],
    ['2027-01-01T12:00:00Z', '2026-12-28'], ['2027-01-04T00:00:00Z', '2027-01-04'],
  ]) assert.equal(weekKey(instant), expected, instant);
  assert.throws(() => weekKey('invalid'), /日期無效/);
  assert.equal(PROFILE_VERSION, 4); assert.equal(PROFILE_KEY, 'shanhai.profile.v4');
  assert.deepEqual(fresh().weekly, empty('2026-09-21'));
});

test('all completed outcomes count once; only expedition wins and arena completions advance their counters', () => {
  let profile = fresh();
  for (const kind of ['practice', 'expedition', 'arena']) {
    for (const winner of ['player', 'opponent', 'draw']) profile = completed(freeze(profile), kind, winner);
  }
  assert.deepEqual(profile.weekly, { ...empty('2026-09-21'), matches: 9, expeditionWins: 1, arenaMatches: 3 });
  assert.equal(profile.daily.matches, 9); assert.equal(profile.stats.played, 9);
  const started = beginBattle(profile, { kind: 'arena', now });
  assert.deepEqual(started.profile.weekly, profile.weekly, 'Starting grants no progress');
  const settled = finishBattle(started.profile, { encounterId: started.encounter.id, winner: 'draw', now });
  assert.equal(settled.profile.weekly.matches, 10);
  assert.throws(() => finishBattle(settled.profile, { encounterId: started.encounter.id, winner: 'draw', now }), /已結算/);
  assert.equal(settled.profile.weekly.matches, 10);
  const abandoned = abandonBattle(beginBattle(settled.profile, { kind: 'practice', now }).profile);
  assert.deepEqual(abandoned.weekly, settled.profile.weekly, 'Abandoning grants no progress');
  assert.throws(() => finishBattle(started.profile, { encounterId: started.encounter.id, winner: 'player', playedCardIds: ['missing'], now }), /出戰卡牌/);
  assert.deepEqual(started.profile.weekly, profile.weekly, 'Rejected completion does not change the input');
});

test('weekly rewards require actual completion, pay exactly once and stay claimed across daily rollover/backward clocks', () => {
  let profile = fresh();
  assert.throws(() => claimWeeklyTask(profile, 'matches', now), /尚未完成/);
  assert.throws(() => claimWeeklyTask(profile, 'unknown', now), /找不到/);
  for (let count = 0; count < 5; count++) profile = completed(profile, 'expedition');
  for (let count = 0; count < 5; count++) profile = completed(profile, 'arena', 'draw');
  assert.deepEqual(getWeeklyTasks(profile, now).map(task => [task.id, task.progress, task.target, task.claimed]), [
    ['matches', 10, 10, false], ['expedition', 5, 5, false], ['arena', 5, 5, false],
  ]);
  assert.equal(getWeeklyTasks(profile, now).find(task => task.id === 'matches').reward.seals, 5);
  const currency = { coins: profile.coins, dust: profile.dust, xp: profile.xp }, cards = structuredClone(profile.instances);
  for (const task of WEEKLY_TASKS) {
    const before = freeze(profile); profile = claimWeeklyTask(before, task.id, now);
    assert(!before.weekly.claimedTasks.includes(task.id));
    assert.throws(() => claimWeeklyTask(profile, task.id, now), /已領取/);
    assert.throws(() => claimWeeklyTask(profile, task.id, '2026-09-22T12:00:00Z'), /已領取/);
    assert.throws(() => claimWeeklyTask(profile, task.id, '2026-09-14T12:00:00Z'), /已領取/);
  }
  assert.deepEqual({ coins: profile.coins - currency.coins, dust: profile.dust - currency.dust, xp: profile.xp - currency.xp }, { coins: 900, dust: 60, xp: 250 });
  assert.deepEqual(profile.instances, cards, 'Claiming does not award card XP or mint cards');
  assert.deepEqual(refreshDaily(profile, nextWeek).weekly, empty('2026-09-28'));
  assert.throws(() => claimWeeklyTask(profile, 'matches', nextWeek), /尚未完成/);
});

test('weekly rollover preserves pending exact cards, collection, old clears, currency and unrelated progression', () => {
  let profile = completed(fresh(), 'expedition');
  profile = beginBattle(profile, { kind: 'arena', now }).profile;
  profile.daily.loginClaimed = true;
  const original = structuredClone(profile), next = refreshDaily(freeze(profile), nextWeek);
  assert.deepEqual(next.weekly, empty('2026-09-28')); assert.equal(next.daily.date, '2026-09-28');
  assert.equal(next.daily.loginClaimed, false);
  for (const key of ['pending', 'instances', 'merchantVault', 'deckSlots', 'activeDeckId', 'instanceSerial', 'inventory', 'levels', 'cleared', 'location', 'coins', 'dust', 'xp', 'stats', 'arena', 'serial']) {
    assert.deepEqual(next[key], original[key], key);
  }
  assert.deepEqual(profile, original);
  const finished = finishBattle(next, { encounterId: next.pending.id, winner: 'player', playedCardIds: ['qingxiao'], now: nextWeek });
  assert.deepEqual(finished.profile.weekly, { ...empty('2026-09-28'), matches: 1, arenaMatches: 1 });
  const uid = original.pending.cardInstances.qingxiao;
  assert.equal(finished.reward.cardXP[0].uid, uid);
});

test('a battle spanning London Monday belongs only to its completion week', () => {
  const sunday = '2026-09-27T22:59:59Z';
  let profile = fresh(sunday);
  for (let count = 0; count < 9; count++) profile = completed(profile, 'practice', 'player', sunday);
  const started = beginBattle(profile, { kind: 'arena', now: sunday });
  const next = finishBattle(started.profile, { encounterId: started.encounter.id, winner: 'draw', now: nextWeek }).profile;
  assert.equal(next.stats.played, 10); assert.equal(next.daily.matches, 1);
  assert.deepEqual(next.weekly, { ...empty('2026-09-28'), matches: 1, arenaMatches: 1 });
  assert.throws(() => claimWeeklyTask(next, 'matches', nextWeek), /尚未完成/);
});

test('old saves start weekly progress at zero without copying daily or lifetime counters', () => {
  const old = completed(fresh(), 'expedition'); delete old.weekly;
  old.stats.played = 400; old.stats.won = 200; old.daily.matches = 20; old.daily.expeditionWins = 10;
  const original = structuredClone(old), restored = hydrateProfile(freeze(old), { now });
  assert.deepEqual(restored.weekly, empty('2026-09-21'));
  assert.deepEqual(refreshDaily(old, now).weekly, empty('2026-09-21'));
  for (const key of Object.keys(original)) assert.deepEqual(restored[key], original[key], key);
  assert.deepEqual(old, original); assert.equal(completed(restored, 'practice').weekly.matches, 1);
  const v2 = { ...structuredClone(old), version: 2 };
  assert.deepEqual(hydrateProfile(v2, { now }).weekly, empty('2026-09-21'));
});

test('saved day/week high-water marks guard both legacy upgrades and newer weekly claims against clock rollback', () => {
  const future = fresh('2026-09-29T12:00:00Z'); delete future.weekly;
  const upgraded = hydrateProfile(future, { now });
  assert.equal(upgraded.daily.date, '2026-09-29'); assert.deepEqual(upgraded.weekly, empty('2026-09-28'));
  assert.deepEqual(refreshDaily(future, now).weekly, empty('2026-09-28'));
  upgraded.weekly.matches = 10;
  const claimed = claimWeeklyTask(upgraded, 'matches', now), reloaded = hydrateProfile(claimed, { now });
  assert.deepEqual(reloaded.weekly, claimed.weekly);
  assert.throws(() => claimWeeklyTask(reloaded, 'matches', now), /已領取/);
  assert.deepEqual(refreshDaily(reloaded, '2026-09-30T12:00:00Z').weekly, claimed.weekly);
});

test('weekly hydration rejects invalid week keys and normalizes only allowed counters/claims', () => {
  for (const week of ['2026-09-22', '2026-02-30', 'bad', 100, null, '2026-09-14']) {
    const profile = fresh(); profile.weekly = { week, matches: 100, expeditionWins: 90, arenaMatches: 20, claimedTasks: ['matches'] };
    assert.deepEqual(hydrateProfile(profile, { now }).weekly, empty('2026-09-21'));
  }
  const profile = fresh();
  profile.weekly = { week: '2026-09-21', matches: 3, expeditionWins: 9, arenaMatches: -2, claimedTasks: ['matches', 'matches', 'unknown'], extra: true };
  assert.deepEqual(hydrateProfile(profile, { now }).weekly, { ...empty('2026-09-21'), matches: 3, expeditionWins: 3, claimedTasks: ['matches'] });
  profile.weekly.matches = '10';
  assert.equal(hydrateProfile(profile, { now }).weekly.matches, 0);
  const rows = getWeeklyTasks(profile, now); rows[0].reward.coins = 999;
  assert.equal(WEEKLY_TASKS[0].reward.coins, 300);
});

test('old v3 cloud payloads validate unchanged, and restoration alone adds zero weekly progress', () => {
  const profile = legacyV3(completed(fresh(), 'expedition')); delete profile.weekly;
  const snapshot = { format: 'mythseal.offline-journey', version: 1, profile }, original = structuredClone(snapshot);
  const validated = validateSnapshot(freeze(snapshot));
  assert.deepEqual(validated, original); assert.equal(Object.hasOwn(validated.profile, 'weekly'), false);
  assert.deepEqual(createSnapshot(profile), original);
  const restored = restoreSnapshot(snapshot, { now });
  assert.deepEqual(restored.weekly, empty('2026-09-21'));
  assert.equal(restored.wx01.seals, 0);
  const legacyRestored = legacyV3(restored); delete legacyRestored.weekly;
  assert.deepEqual(legacyRestored, original.profile);
  assert.deepEqual(snapshot, original);
  assert.equal(createSnapshot(restored).version, 2);
});

test('weekly cloud round trips preserve claims and fingerprints, with rollover only on restore', () => {
  let profile = fresh();
  for (let count = 0; count < 10; count++) profile = completed(profile, 'practice');
  profile = claimWeeklyTask(profile, 'matches', now);
  const snapshot = createSnapshot(profile), fingerprint = fingerprintProfile(profile);
  assert.deepEqual(restoreSnapshot(snapshot, { now }), profile);
  assert.deepEqual(restoreSnapshot(snapshot, { now: '2026-09-14T12:00:00Z' }).weekly, profile.weekly);
  assert.deepEqual(restoreSnapshot(snapshot, { now: nextWeek }).weekly, empty('2026-09-28'));
  assert.deepEqual(validateSnapshot(snapshot).profile.weekly, profile.weekly);
  const altered = structuredClone(profile); altered.weekly.matches++;
  assert.notEqual(fingerprintProfile(altered), fingerprint);
  assert.equal(snapshot.version, 2); assert.equal(snapshot.profile.version, 4);
});

test('cloud validation rejects malformed or repaired weekly state without changing its payload', () => {
  const original = createSnapshot(fresh());
  for (const corrupt of [
    p => { p.weekly = null; }, p => { p.weekly.extra = true; }, p => { delete p.weekly.matches; },
    p => { p.weekly.week = '2026-09-22'; }, p => { p.weekly.week = '2026-02-30'; },
    p => { p.weekly.week = '2026-09-14'; }, p => { p.weekly.matches = -1; },
    p => { p.weekly.matches = '10'; }, p => { p.weekly.matches = 1.5; },
    p => { p.weekly.expeditionWins = 1; }, p => { p.weekly.arenaMatches = 1; },
    p => { p.weekly.claimedTasks = ['missing']; }, p => { p.weekly.claimedTasks = ['matches', 'matches']; },
  ]) {
    const invalid = structuredClone(original); corrupt(invalid.profile);
    const before = structuredClone(invalid);
    assert.throws(() => validateSnapshot(invalid)); assert.deepEqual(invalid, before);
  }
});
