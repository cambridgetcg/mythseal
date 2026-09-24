import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS, PRINTS, MODE_WEIGHTS, rollPack, naturalMode, enumerateMode, modeDistribution, stationaryProtection, analyzeDrops, simulateDrops, compareSimulation, seededRng, geometricEvent } from '../tools/wx01-drop-model.mjs';
const close = (a, b, epsilon = 1e-10) => assert(Math.abs(a - b) < epsilon, `${a} != ${b}`);
const sequence = values => { let i = 0; return () => { assert(i < values.length, 'Unexpected RNG consumption'); return values[i++]; }; };
const analysis = analyzeDrops();

test('catalogue has 16 identities and 29 distinct prints with unchanged rarity per identity', () => {
  assert.equal(CHARACTERS.length, 16); assert.equal(PRINTS.length, 29);
  assert.equal(new Set(PRINTS.map(p => p.printId)).size, 29);
  assert.deepEqual(['common', 'rare', 'epic'].map(r => CHARACTERS.filter(c => c.rarity === r).length), [8, 5, 3]);
  for (const print of PRINTS) assert.equal(print.rarity, CHARACTERS.find(c => c.cardId === print.cardId).rarity);
});

test('exhaustive conditional outcomes normalize, retain three cards and rarity floor, and reach every print', () => {
  const reached = new Set();
  for (const mode of Object.keys(MODE_WEIGHTS)) {
    let mass = 0;
    for (const outcome of enumerateMode(mode)) {
      assert(outcome.probability > 0); mass += outcome.probability;
      assert.equal(outcome.cards.length, 3); assert(outcome.cards.some(c => c.rarity !== 'common'));
      outcome.cards.forEach(c => reached.add(c.printId));
      if (mode === 'god') { assert.equal(new Set(outcome.cards.map(c => c.cardId)).size, 3); assert.deepEqual(outcome.cards.map(c => c.treatment), ['AA1', 'LAA1', 'INK1']); }
      else if (mode !== 'ordinary') assert.equal(outcome.cards[2].treatment, { aa: 'AA1', leader: 'LAA1', ink: 'INK1', treasure: 'TR1' }[mode]);
    }
    close(mass, 1);
  }
  assert.equal(reached.size, 29);
  for (const summary of [analysis.natural, analysis.protected, analysis.dry11]) {
    close(summary.mass, 1); close(Object.values(summary.prints).reduce((s, p) => s + p.expectedCopies, 0), 3);
    close(Object.values(summary.rarities).reduce((s, r) => s + r.mean, 0), 1);
  }
});

test('mode thresholds and invalid RNG inputs are explicit', () => {
  const edges = [0, .837, .962, .987, .997, .9995];
  Object.keys(MODE_WEIGHTS).forEach((mode, i) => { assert.equal(naturalMode(() => edges[i]), mode); if (i) assert.equal(naturalMode(() => edges[i] - 1e-12), Object.keys(MODE_WEIGHTS)[i - 1]); });
  assert.equal(naturalMode(() => 1 - Number.EPSILON), 'god');
  for (const bad of [-1, 1, NaN, Infinity, '0', null]) assert.throws(() => rollPack({ rng: () => bad }), /RNG/);
  assert.throws(() => rollPack({ rng: sequence([0, 0, NaN]) }), /RNG/);
  for (const dry of [-1, 12, .5, NaN, '1']) assert.throws(() => rollPack({ dry }), /dry/);
});

test('ordinary guarantee and common special repair use fresh rare/epic rolls without replacing the special', () => {
  const ordinary = rollPack({ rng: sequence([0, 0, 0, 0, 0, .75, 0]) });
  assert.deepEqual(ordinary.cards.map(c => c.rarity), ['common', 'common', 'epic']);
  const aa = rollPack({ rng: sequence([.84, .2, 0, 0, 0, 0, .749999, 0]) });
  assert.equal(aa.cards[2].printId, 'WX01-001-AA1');
  assert.deepEqual(aa.cards.map(c => c.rarity), ['common', 'rare', 'common']);
  const leader = rollPack({ rng: sequence([.97, 0, 0, 0, 0, 0, .75, 0]) });
  assert.equal(leader.cards[2].printId, 'WX01-001-LAA1'); assert.equal(leader.cards[1].rarity, 'epic');
});

test('twelfth dry pack forces AA exactly once, resets, and cannot downgrade a natural special', () => {
  let dry = 0;
  for (let i = 1; i <= 12; i++) { const pack = rollPack({ dry, rng: () => 0 }); assert.equal(pack.forced, i === 12); assert.equal(pack.mode, i === 12 ? 'aa' : 'ordinary'); dry = pack.dry; assert.equal(dry, i === 12 ? 0 : i); }
  for (const [mode, roll] of [['aa', .84], ['leader', .97], ['treasure', .99], ['ink', .998], ['god', .9999]]) {
    const rng = sequence([roll, ...Array(10).fill(0)]), pack = rollPack({ dry: 11, rng });
    assert.equal(pack.mode, mode); assert.equal(pack.forced, false); assert.equal(pack.dry, 0);
  }
  assert.equal(rollPack({ dry: 11, protection: false, rng: () => 0 }).mode, 'ordinary');
  close(modeDistribution({ dry: 11 }).aa, .962); assert.equal(modeDistribution({ dry: 11 }).ordinary, 0);
});

test('renewal state probabilities satisfy the full Markov stationary equations', () => {
  const stationary = stationaryProtection(), next = Array(12).fill(0);
  for (let dry = 0; dry < 12; dry++) for (const [mode, p] of Object.entries(modeDistribution({ dry }))) if (p) next[mode === 'ordinary' ? dry + 1 : 0] += stationary.states[dry] * p;
  next.forEach((p, i) => close(p, stationary.states[i])); close(stationary.states.reduce((a, b) => a + b), 1);
  close(1 - stationary.modes.ordinary, 1 / stationary.renewalMean);
  for (const mode of ['leader', 'treasure', 'ink', 'god']) close(stationary.modes[mode], MODE_WEIGHTS[mode] / 10000);
});

test('god unique filtering has exact biased AA/leader marginals and symmetric INK', () => {
  const p = id => analysis.god.prints[id].expectedCopies;
  close(p('WX01-005-INK1'), 1 / 2); close(p('WX01-012-INK1'), 1 / 2);
  close(p('WX01-005-LAA1'), 1 / 8);
  for (const id of ['001', '009', '015']) close(p(`WX01-${id}-LAA1`), 7 / 24);
  close(p('WX01-005-AA1'), 1 / 15); close(p('WX01-001-AA1'), 2 / 15);
  for (const id of ['002', '013', '003', '010']) close(p(`WX01-${id}-AA1`), 1 / 5);
  assert.equal(p('WX01-005-TR1'), 0);
});

test('per-pack event probabilities include god contributions and quantiles cross their targets', () => {
  for (const summary of [analysis.natural, analysis.protected]) {
    close(summary.prints['WX01-005-INK1'].hitProbability, .0015);
    close(summary.prints['WX01-012-INK1'].hitProbability, .0015);
    close(summary.prints['WX01-005-TR1'].hitProbability, .01);
  }
  close(analysis.events.ink.probabilityPerPack, .003);
  for (const event of Object.values(analysis.events)) for (const [target, count] of [[.5, event.packs50], [.95, event.packs95]]) {
    assert(1 - (1 - event.probabilityPerPack) ** count >= target);
    assert(1 - (1 - event.probabilityPerPack) ** (count - 1) < target);
  }
  assert.equal(geometricEvent(1).packs95, 1);
  for (const p of [0, -1, 2, NaN, '0.1', null]) assert.throws(() => geometricEvent(p));
  close(analysis.protected.expectedFirstDailyNetCost, 300 - analysis.protected.expectedResale - 80);
});

test('seeded simulation agrees with independent enumerable expectations and detects distorted observations', () => {
  assert.deepEqual(Array.from({ length: 10 }, seededRng(42)), Array.from({ length: 10 }, seededRng(42)));
  for (const protection of [true, false]) {
    const simulation = simulateDrops({ packs: 120_000, seed: 73, protection });
    const compared = compareSimulation(simulation, analysis); assert(compared.ok, JSON.stringify(compared.checks.filter(c => !c.pass)));
    simulation.modes.god += 10_000; assert.equal(compareSimulation(simulation, analysis).ok, false);
  }
});
