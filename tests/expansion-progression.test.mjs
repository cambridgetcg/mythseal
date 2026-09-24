import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, hydrateProfile, refreshDaily, beginBattle, finishBattle, abandonBattle, startActivity, advanceActivity, abandonActivity, getActivityBattleOptions, getPendingBattleOptions, claimExpansionGrant, openWX01Ticket, acknowledgeWX01Receipt, buyPack, claimWX01StoryPrint, getExpansionSummary, NODES, trainInstance } from '../progression.mjs';
import { createExpansionState, validateExpansionState, MAX_EXPANSION_GRANTS, CAMPAIGN_TITLE, ACTIVITY_TITLE } from '../expansion-state.mjs';
import { CAMPAIGN_NODES } from '../campaign-content.mjs';
import { FIRE_MOUNTAIN } from '../activity-content.mjs';
import { createMatch, getBattleCard } from '../engine.mjs';
import { getInstance, setInstanceXP, MAX_COLLECTION_COPIES } from '../collection.mjs';
const now = '2026-09-22T12:00:00.000Z';
const clone = value => structuredClone(value);
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
function ready(date = now) { const p = createProfile({ now: date }); p.cleared = NODES.filter(node => !node.campaign).map(node => node.id); return p; }
function settle(profile, { winner = 'player', hp = 6, pills = 2, played = [], date = now } = {}) {
  return finishBattle(profile, { encounterId: profile.pending.id, winner, playedCardIds: played, finalResources: { hp, pills }, now: date });
}
function clearActivity(profile, date = now, rng = () => .2) {
  let p = startActivity(profile, { route: 'loaner', rng, now: date }).profile;
  for (let stage = 0; stage < 3; stage++) {
    p = settle(p, { hp: 12, pills: 12, date }).profile;
    if (stage < 2) p = advanceActivity(p, { supply: 'none', expectedRunId: p.expansion.fireMountain.run.id, expectedStage: stage, now: date }).profile;
  }
  return p;
}

test('v4 migration retains paid receipt, frozen pending, exact copy history and wallet while adding only empty expansion', () => {
  let p = ready(); p = setInstanceXP(p, p.instances[0].uid, 430);
  p = buyPack(p, { set: 'wx01', rng: () => .3, now }).profile;
  p = beginBattle(p, { kind: 'practice', now }).profile;
  const old = clone(p); old.version = 4; delete old.expansion;
  const untouched = clone(old), upgraded = hydrateProfile(freeze(old), { now });
  assert.deepEqual(old, untouched); assert.equal(upgraded.version, 5);
  const { expansion, version, ...rest } = upgraded;
  assert.deepEqual(rest, Object.fromEntries(Object.entries(old).filter(([key]) => key !== 'version')));
  assert.deepEqual(expansion, createExpansionState(now));
  assert.deepEqual(hydrateProfile(upgraded, { now }), upgraded);
});

test('48 first clears deliver the complete fixed budget once, eight BASE grants, six tickets and separate final AA', () => {
  let p = ready(); const original = clone(p);
  for (const node of CAMPAIGN_NODES) {
    p = beginBattle(p, { kind: 'expedition', nodeId: node.id, rng: () => .2, now }).profile;
    p = settle(p, { hp: 5, pills: 1 }).profile;
    assert.deepEqual(hydrateProfile(p, { now }), p);
  }
  assert.equal(p.coins - original.coins, 7200); assert.equal(p.dust - original.dust, 384); assert.equal(p.xp - original.xp, 3360);
  assert.equal(p.expansion.grants.filter(grant => grant.kind === 'base').length, 8);
  assert.equal(p.expansion.grants.filter(grant => grant.kind === 'aa').length, 1);
  assert.equal(p.expansion.tickets, 6); assert.deepEqual(p.expansion.titles, [CAMPAIGN_TITLE]);
  assert.equal(p.daily.expeditionCaches.length, 0); assert.equal(p.wx01.storyClaimed, false);
  const beforeReplay = clone(p);
  p = settle(beginBattle(p, { kind: 'expedition', nodeId: CAMPAIGN_NODES[0].id, rng: () => .5, now }).profile).profile;
  assert.deepEqual(p.expansion.mastery[CAMPAIGN_NODES[0].id], { win: true, life: true, pills: true });
  assert.equal(p.coins - beforeReplay.coins, 60); assert.equal(p.dust - beforeReplay.dust, 3);
  assert.deepEqual(p.expansion.grants, beforeReplay.expansion.grants); assert.equal(p.expansion.tickets, 6);
  const legacyAA = claimWX01StoryPrint(p, 'wx01-005-aa1', { now });
  p = acknowledgeWX01Receipt(legacyAA.profile, legacyAA.receipt.id);
  const finalAA = claimExpansionGrant(p, { id: 'campaign:westward-echo:aa', printId: 'wx01-005-aa1', now });
  assert.equal(finalAA.receipt.kind, 'reward'); assert.notEqual(finalAA.cards[0].instanceId, legacyAA.cards[0].instanceId);
  assert.equal(finalAA.profile.wx01.storyClaimed, true);
});

test('campaign supplied deck ignores possessions, stays reproducible and awards no unrelated exact-copy XP', () => {
  let p = ready(); p.cleared.push(...CAMPAIGN_NODES.slice(0, 6).map(node => node.id));
  const node = CAMPAIGN_NODES[6], before = clone(p.instances);
  const started = beginBattle(freeze(p), { kind: 'expedition', nodeId: node.id, route: 'loaner', rng: () => .43, now });
  assert.deepEqual(started.encounter.playerDeck, node.loanerDeck);
  assert.deepEqual(started.encounter.instanceIds, []);
  assert.deepEqual(createMatch(getPendingBattleOptions(started.profile)), createMatch(getPendingBattleOptions(hydrateProfile(started.profile, { now }))));
  const end = settle(started.profile, { played: started.encounter.playerDeck.slice(0, 4) });
  assert.deepEqual(end.profile.instances, before); assert.deepEqual(end.reward.cardXP, []);
  assert.throws(() => beginBattle(ready(), { kind: 'expedition', nodeId: CAMPAIGN_NODES[0].id, route: 'loaner', now }), /沒有可借用/);
});

test('activity start freezes six seeds and owned exact copies; fallback reconstructs identical normalized battle', () => {
  let p = ready(); const uid = p.deckSlots[0].instanceIds[0]; p = setInstanceXP(p, uid, 700);
  let calls = 0; const started = startActivity(freeze(p), { route: 'owned', rng: () => (++calls) / 10, now });
  assert.equal(calls, 6); assert.equal(started.profile.instances.length, p.instances.length);
  const first = createMatch(started.battleOptions), resumed = createMatch(getActivityBattleOptions(hydrateProfile(started.profile, { now })));
  assert.deepEqual(resumed, first); assert.equal(first.mode, 'activity');
  for (const id of first.player.hand) assert.deepEqual(getBattleCard(first, 'player', id).level, 1);
  assert.deepEqual(started.profile.expansion.fireMountain.run.instanceIds, p.deckSlots[0].instanceIds);
  assert.throws(() => trainInstance(started.profile, uid, now), /正在出戰/);
  assert.deepEqual(p.instances.find(item => item.uid === uid).xp, 700);
});

test('carry-over, automatic recovery and committed supply survive reload without drawing or accepting a stale stage', () => {
  const started = startActivity(ready(), { route: 'loaner', rng: () => .2, now });
  const result = settle(started.profile, { hp: 3, pills: 0 }); const p = result.profile;
  assert.equal(p.expansion.fireMountain.run.hp, 5); assert.equal(p.expansion.fireMountain.run.pills, 8);
  assert.equal(p.pending, null); assert.deepEqual(hydrateProfile(p, { now }), p);
  const before = clone(p), run = p.expansion.fireMountain.run;
  assert.throws(() => beginBattle(p, { kind: 'practice', now }), /目前對局/);
  assert.throws(() => advanceActivity(p, { expectedRunId: run.id, expectedStage: 0, supply: 'none', now }), /補給/);
  const next = advanceActivity(freeze(p), { expectedRunId: run.id, expectedStage: 0, supply: 'life', rng: () => { throw Error('must not draw'); }, now });
  assert.deepEqual(p, before); assert.deepEqual(next.battleOptions.initialResources, { player: { hp: 9, pills: 8 } });
  assert.deepEqual(next.profile.expansion.fireMountain.run.supplies, ['life']);
  assert.throws(() => advanceActivity(next.profile, { expectedRunId: run.id, expectedStage: 0, supply: 'life', now }), /進度已改變/);
  const full = settle(next.profile, { hp: 12, pills: 12 }).profile;
  assert.throws(() => advanceActivity(full, { expectedRunId: run.id, expectedStage: 1, supply: 'life', now }), /不會改變/);
  assert.throws(() => advanceActivity(full, { expectedRunId: run.id, expectedStage: 1, supply: 'pills', now }), /不會改變/);
  assert.equal(advanceActivity(full, { expectedRunId: run.id, expectedStage: 1, supply: 'none', now }).encounter.activityStage, 2);
});

test('saved loot seed has fixed natural boundaries; twentieth victory forces current boss BASE and resets only loot pity', () => {
  for (const [roll, kind] of [[0, 'dust'], [.799999, 'dust'], [.8, 'coins'], [.949999, 'coins'], [.95, 'base']]) {
    const p = startActivity(ready(), { route: 'loaner', rng: () => roll, now }).profile;
    const first = settle(freeze(p)), retry = settle(p);
    assert.deepEqual(first, retry); assert.equal(first.reward.activity.loot.kind, kind);
    assert.equal(first.profile.expansion.fireMountain.dry, kind === 'base' ? 0 : 1);
  }
  const p = ready(); p.expansion.fireMountain.dry = 19; p.wx01.dry = 7; p.wx01.opened = 7;
  const started = startActivity(p, { route: 'loaner', rng: () => .2, now });
  const result = settle(started.profile);
  assert.deepEqual(result.reward.activity.loot, { kind: 'base', printId: FIRE_MOUNTAIN.stages[0].dropPrintId, forced: true });
  assert.equal(result.profile.expansion.fireMountain.dry, 0); assert.equal(result.profile.wx01.dry, 7);
  assert.equal(result.profile.expansion.grants[0].printId, FIRE_MOUNTAIN.stages[0].dropPrintId);
  assert.throws(() => finishBattle(result.profile, { encounterId: started.encounter.id, winner: 'player', finalResources: { hp: 6, pills: 2 }, now }), /已結算/);
});

test('owned played copies alone get 12/8XP; loss/draw ends run, retains banked grants and never rolls loot', () => {
  for (const winner of ['opponent', 'draw']) {
    let p = startActivity(ready(), { route: 'owned', rng: () => .96, now }).profile;
    const played = p.pending.playerDeck.slice(0, 2), uids = played.map(id => p.pending.cardInstances[id]);
    p = settle(p, { played }).profile; assert(uids.every(uid => getInstance(p, uid).xp === 12));
    const baseline = clone(p), run = p.expansion.fireMountain.run;
    p = advanceActivity(p, { expectedRunId: run.id, expectedStage: 0, supply: 'pills', now }).profile;
    const end = settle(p, { winner, hp: 0, pills: 0, played });
    assert.equal(end.profile.expansion.fireMountain.run, null); assert.equal(end.profile.pending, null);
    assert.equal(end.reward.coins, 0); assert.equal(end.reward.activity.loot, null);
    assert.equal(end.profile.coins, baseline.coins); assert.deepEqual(end.profile.expansion.grants, baseline.expansion.grants);
    assert(uids.every(uid => getInstance(end.profile, uid).xp === 20)); assert.equal(end.profile.daily.arenaMatches, 0);
    assert.equal(end.profile.daily.matches, 2); assert.equal(end.profile.daily.expeditionWins, 0);
  }
});

test('abandonment at battle or supply grants nothing extra and frees only the expected run', () => {
  let p = startActivity(ready(), { route: 'loaner', rng: () => .96, now }).profile;
  const started = clone(p), id = p.expansion.fireMountain.run.id;
  assert.throws(() => abandonActivity(p, { expectedRunId: 'activity-999', now }), /進度已改變/);
  assert.deepEqual(p, started);
  const noPlay = abandonBattle(p); assert.equal(noPlay.stats.played, 0); assert.equal(noPlay.expansion.grants.length, 0);
  p = settle(p).profile; const banked = clone(p);
  p = abandonActivity(p, { expectedRunId: id, now });
  assert.equal(p.coins, banked.coins); assert.deepEqual(p.expansion.grants, banked.expansion.grants);
  assert.equal(p.expansion.fireMountain.dry, banked.expansion.fireMountain.dry); assert.equal(p.expansion.fireMountain.run, null);
  assert.equal(startActivity(p, { route: 'loaner', rng: () => .2, now }).encounter.activityRunId, 'activity-2');
});

test('a run spanning Monday belongs to its start-week; two weekly tickets and lifetime prizes are once-only', () => {
  const sunday = '2026-09-27T22:30:00.000Z', monday = '2026-09-28T00:30:00.000Z';
  let p = startActivity(ready(sunday), { route: 'loaner', rng: () => .2, now: sunday }).profile;
  for (let stage = 0; stage < 3; stage++) {
    p = settle(p, { hp: 12, pills: 12, date: monday }).profile;
    if (stage < 2) p = advanceActivity(p, { expectedRunId: p.expansion.fireMountain.run.id, expectedStage: stage, supply: 'none', now: monday }).profile;
  }
  assert.equal(p.expansion.fireMountain.weekly.week, '2026-09-28'); assert.equal(p.expansion.tickets, 1);
  assert.equal(p.expansion.grants.filter(grant => grant.id === 'fire-mountain:first-clear').length, 1);
  p = refreshDaily(p, monday); assert.equal(p.expansion.fireMountain.weekly.week, '2026-09-28'); assert.equal(p.expansion.fireMountain.weekly.clears, 0);
  for (let i = 0; i < 4; i++) p = clearActivity(p, monday);
  assert.equal(p.expansion.fireMountain.clears, 5); assert.equal(p.expansion.tickets, 3);
  assert.deepEqual(p.expansion.fireMountain.weekly.claimed, [1, 3]); assert(p.expansion.titles.includes(ACTIVITY_TITLE));
  assert.equal(p.expansion.grants.filter(grant => grant.id === 'fire-mountain:first-clear').length, 1);
  assert.deepEqual(refreshDaily(p, sunday).expansion, p.expansion);
});

test('pending character grants mint one new exact copy once, respect existing receipt and leave pack counters unchanged', () => {
  let p = startActivity(ready(), { route: 'loaner', rng: () => .96, now }).profile; p = settle(p).profile;
  const grant = p.expansion.grants[0], before = clone(p);
  const result = claimExpansionGrant(freeze(p), { id: grant.id, now });
  assert.deepEqual(p, before); assert.equal(result.cards.length, 1); assert.equal(result.receipt.kind, 'reward');
  assert.equal(result.receipt.mode, 'base'); assert.equal(result.profile.wx01.opened, p.wx01.opened);
  assert.equal(result.profile.wx01.seals, p.wx01.seals); assert.equal(result.profile.daily.packs, p.daily.packs);
  assert.equal(getInstance(result.profile, result.cards[0].instanceId).xp, 0);
  assert.throws(() => claimExpansionGrant(result.profile, { id: grant.id, now }), /已領取/);
  assert.deepEqual(hydrateProfile(result.profile, { now }), result.profile);
  assert.throws(() => buyPack(result.profile, { set: 'wx01', rng: () => { throw Error('no RNG'); }, now }), /先確認/);
});

test('ticket uses identical shared WX sampler and pity, zero coins, one seal/task, and rejects before RNG without consumption', () => {
  const p = ready(); p.expansion.tickets = 1; p.wx01.dry = 11; p.wx01.opened = 11;
  const before = clone(p), paid = buyPack(p, { set: 'wx01', rng: () => .2, now }), ticket = openWX01Ticket(freeze(p), { rng: () => .2, now });
  assert.deepEqual(p, before); assert.deepEqual(ticket.cards, paid.cards); assert.equal(ticket.mode, 'aa'); assert.equal(ticket.forced, true);
  assert.equal(ticket.profile.coins, p.coins); assert.equal(ticket.profile.expansion.tickets, 0);
  assert.equal(ticket.receipt.kind, 'ticket'); assert.equal(ticket.receipt.cost, 0); assert.equal(ticket.receipt.sealsEarned, 1);
  assert.equal(ticket.profile.wx01.dry, 0); assert.equal(ticket.profile.daily.packs, 1);
  assert.deepEqual(hydrateProfile(ticket.profile, { now }), ticket.profile);
  assert.throws(() => openWX01Ticket(p, { rng: () => NaN, now }), /rng/); assert.deepEqual(p, before);
  let calls = 0; const none = ready(); assert.throws(() => openWX01Ticket(none, { rng: () => { calls++; return .2; }, now }), /尚未取得/); assert.equal(calls, 0);
});

test('ledger/counter capacity preflights activity before any RNG and malformed run or grant state fails closed', () => {
  const p = ready(); p.expansion.serial = MAX_EXPANSION_GRANTS;
  p.expansion.grants = Array.from({ length: MAX_EXPANSION_GRANTS }, (_, i) => ({ id: `activity-${i + 1}:stage-0:loot`, kind: 'base', printId: FIRE_MOUNTAIN.stages[0].dropPrintId, source: 'fire-mountain' }));
  let calls = 0; const before = clone(p);
  assert.throws(() => startActivity(freeze(p), { route: 'loaner', rng: () => { calls++; return .2; }, now }), /待領/);
  assert.equal(calls, 0); assert.deepEqual(p, before);
  const active = startActivity(ready(), { route: 'owned', rng: () => .2, now }).profile;
  for (const mutate of [q => q.expansion.fireMountain.run.stage++, q => q.expansion.fireMountain.run.seeds[0].loot = -1, q => q.expansion.fireMountain.run.extra = true,
    q => q.pending.battleSeed++, q => q.expansion.fireMountain.run.cardPrints.wukong = 'wx01-005-aa1', q => q.expansion.fireMountain.weekly.claimed = [1]]) {
    const bad = clone(active); mutate(bad); assert.throws(() => hydrateProfile(bad, { now }));
  }
  const invalid = ready(); invalid.expansion.tickets = -1; assert.throws(() => validateExpansionState(invalid.expansion, invalid));
  assert.deepEqual(getExpansionSummary(active, now).activity.run, active.expansion.fireMountain.run);
});

test('full collection preserves pending grants/tickets and rejects delivery before any draw or serial change', () => {
  let p = settle(startActivity(ready(), { route: 'loaner', rng: () => .96, now }).profile).profile;
  const sample = p.instances[0];
  for (let serial = p.instanceSerial + 1; p.instances.length < MAX_COLLECTION_COPIES; serial++) {
    p.instances.push({ ...sample, uid: `card-${String(serial).padStart(6, '0')}` }); p.instanceSerial = serial;
  }
  // Canonical derived inventory is rebuilt once by hydration.
  p = hydrateProfile(p, { now }); p.expansion.tickets = 1;
  const before = clone(p); let draws = 0;
  assert.throws(() => claimExpansionGrant(p, { id: p.expansion.grants[0].id, now }), /10,000/);
  assert.throws(() => openWX01Ticket(p, { rng: () => { draws++; return .2; }, now }), /10,000/);
  assert.equal(draws, 0); assert.deepEqual(p, before);
});

test('invalid final resources and late wallet overflow leave the seeded pending battle untouched', () => {
  const active = startActivity(ready(), { route: 'loaner', rng: () => .2, now }).profile, before = clone(active);
  for (const finalResources of [undefined, { hp: -1, pills: 4 }, { hp: 0, pills: 4 }, { hp: 12, pills: 13 }, { hp: 12, pills: 12, extra: true }]) {
    assert.throws(() => finishBattle(active, { encounterId: active.pending.id, winner: 'player', finalResources, now }), /生命與仙丹/);
    assert.deepEqual(active, before);
  }
  const capped = clone(active); capped.coins = 1_000_000_000;
  const full = clone(capped); assert.throws(() => settle(capped), /上限/); assert.deepEqual(capped, full);
  const reordered = clone(active);
  reordered.pending.cardPrints = Object.fromEntries(Object.entries(reordered.pending.cardPrints).reverse());
  assert.doesNotThrow(() => hydrateProfile(reordered, { now }));
});
