import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES, createMatch } from '../engine.mjs';
import { GENTLE_GUARDIAN, guardianStyle, styleById, aiOptions } from '../guardian-style.mjs';
import { coachStart } from '../battle-teaching.mjs';
import { simulate, playFirstBattle, POLICIES, parseStyle } from '../tools/guardian-sim.mjs';

const ENCOUNTERS = [
  { kind: 'expedition', nodeId: 'mist-gate' },
  { kind: 'expedition', nodeId: 'ember-pass' },
  { kind: 'expedition', nodeId: 'jade-forest' },
  { kind: 'practice', nodeId: null },
  { kind: 'arena', nodeId: null },
  { kind: 'activity', nodeId: null },
  { kind: 'practice', nodeId: 'mist-gate' },
  null,
];

test('O1 緩渡 applies exactly to a first battle at 霧隱渡口, the same battle as D3\'s coach', () => {
  const fresh = createMatch({ rng: () => 0.23, mode: 'expedition' });
  for (const encounter of ENCOUNTERS) for (const played of [0, 1, 2, 10]) {
    const style = guardianStyle({ encounter, played });
    const first = encounter?.kind === 'expedition' && encounter.nodeId === 'mist-gate' && played === 0;
    assert.equal(style, first ? GENTLE_GUARDIAN : null, `${JSON.stringify(encounter)}, played ${played}`);
    // Tied to D3's condition without editing it: coachStart for a fresh match and no device record.
    assert.equal(style !== null, coachStart({ seen: null, encounter, played, match: fresh }) !== null, `${JSON.stringify(encounter)}, played ${played}: the same battle as D3's coach`);
  }
  assert.equal(guardianStyle(), null);
});

test('O1 a returning player and every fair mode keep today\'s AI: no style means no option', () => {
  for (const encounter of ENCOUNTERS) for (const played of [1, 2, 10]) assert.deepEqual(aiOptions(guardianStyle({ encounter, played })), {});
  for (const kind of ['practice', 'arena', 'activity']) assert.deepEqual(aiOptions(guardianStyle({ encounter: { kind, nodeId: null }, played: 0 })), {});
  assert.deepEqual(aiOptions(GENTLE_GUARDIAN), { spendCap: GENTLE_GUARDIAN.spendCap });
  assert.ok(Number.isInteger(GENTLE_GUARDIAN.spendCap) && GENTLE_GUARDIAN.spendCap < RULES.furyCost, 'the disclosed line says he never uses Fury, which holds below its cost');
  assert.ok(Object.isFrozen(GENTLE_GUARDIAN));
});

test('O1 a battle snapshot names the style it started with; one without a name plays today\'s AI', () => {
  assert.equal(styleById(GENTLE_GUARDIAN.id), GENTLE_GUARDIAN);
  for (const id of [undefined, null, '', 'gentle', 'GENTLE-CROSSING', 2]) assert.equal(styleById(id), null, String(id));
});

test('O1 seeded first battles: following the coach wins, never adding pills or spending all at once loses', () => {
  const seeds = Array.from({ length: 200 }, (_, index) => 100001 + index), style = `each:${GENTLE_GUARDIAN.spendCap}`;
  const rate = policy => simulate({ seeds, policy, style }).winRate;
  for (const policy of ['coach', 'late']) assert.ok(rate(policy) >= 0.95, `${policy} wins at least 95 % (${rate(policy)})`);
  for (const policy of ['naive', 'allin']) assert.ok(rate(policy) <= 0.05, `${policy} wins at most 5 % (${rate(policy)})`);
  // The same seed is the same game: the simulation and every capped AI choice are deterministic.
  for (const seed of seeds.slice(0, 5)) assert.deepEqual(playFirstBattle(seed, POLICIES.rand, parseStyle(style)), playFirstBattle(seed, POLICIES.rand, parseStyle(style)));
  // Under the style the AI never commits more than the cap in any round.
  for (const seed of seeds.slice(0, 40)) assert.ok(playFirstBattle(seed, POLICIES.coach, parseStyle(style)).aiSpend.every(spent => spent <= GENTLE_GUARDIAN.spendCap));
});
