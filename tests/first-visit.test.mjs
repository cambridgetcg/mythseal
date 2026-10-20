// T1 first-visit teaching (docs/TUTORIAL-T1.md): the rules-first route, read on real profiles.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createMatch } from '../engine.mjs';
import { createProfile, beginBattle, finishBattle, abandonBattle } from '../progression.mjs';
import { coachStart } from '../battle-teaching.mjs';
import { lobbyMarkup } from '../navigation-ui.mjs';
import { FIRST_EXPEDITION, isFirstVisit, rulesStartRoute } from '../first-visit.mjs';

const now = new Date('2026-10-20T12:00:00.000Z');
const fresh = () => createProfile({ now });
const begun = (profile = fresh(), options = { kind: 'expedition', nodeId: FIRST_EXPEDITION }) => beginBattle(profile, { ...options, rng: () => 0.23, now });
function finished(winner = 'player', options) {
  const { profile, encounter } = begun(fresh(), options);
  const played = Object.keys(encounter.cardInstances).slice(0, 1);
  return finishBattle(profile, { encounterId: encounter.id, winner, playedCardIds: played, now }).profile;
}
const cardMarkup = () => '<i></i>';

test('a first visit is no battle finished and none in progress, as the lobby reads it', () => {
  assert.equal(isFirstVisit(fresh()), true);
  assert.equal(isFirstVisit(begun().profile), false, 'a battle in progress');
  assert.equal(isFirstVisit(abandonBattle(begun().profile)), true, 'an abandoned first battle finished nothing');
  assert.equal(isFirstVisit(finished('opponent')), false, 'a lost battle still counts as played');
  assert.equal(isFirstVisit(finished('player', { kind: 'practice' })), false, 'practice counts too');
  for (const value of [null, undefined, {}, { stats: {} }]) assert.equal(isFirstVisit(value), false);
  // The lobby uses the same predicate: its title and rules link change together.
  assert.match(lobbyMarkup(fresh(), cardMarkup), /初次落子？讀懂弈道/);
  assert.match(lobbyMarkup(fresh(), cardMarkup), /初入山海，請落第一子。/);
  assert.match(lobbyMarkup(finished(), cardMarkup), /溫習弈道/);
  assert.doesNotMatch(lobbyMarkup(begun().profile, cardMarkup), /初次落子/);
});

test('知其道，入其局 leads a first visit to 霧隱渡口 and everyone else to practice', () => {
  const ferry = { kind: 'expedition', nodeId: 'mist-gate' }, practice = { kind: 'practice', nodeId: null };
  assert.deepEqual({ ...rulesStartRoute(fresh()) }, ferry, 'fresh');
  assert.deepEqual({ ...rulesStartRoute(finished()) }, practice, 'after a finished battle');
  assert.deepEqual({ ...rulesStartRoute(finished('draw', { kind: 'arena' })) }, practice, 'after an arena draw');
  assert.deepEqual({ ...rulesStartRoute(begun().profile) }, practice, 'with a pending battle (prepareEncounter then shows it)');
  assert.deepEqual({ ...rulesStartRoute(abandonBattle(begun().profile)) }, ferry, 'after an abandoned first battle');
  assert.ok(Object.isFrozen(rulesStartRoute(fresh())));
});

test('the route and D3 agree: the first-visit route starts the coach at its first mark', () => {
  const route = rulesStartRoute(fresh());
  const match = createMatch({ mode: route.kind, rng: () => 0.23 });
  assert.equal(coachStart({ encounter: route, played: 0, match })?.step, 'card', 'D3 coaches the battle the rules lead to');
  // And the practice route is the one D3 leaves alone.
  assert.equal(coachStart({ encounter: rulesStartRoute(finished()), played: 0, match: createMatch({ rng: () => 0.23 }) }), null);
});
