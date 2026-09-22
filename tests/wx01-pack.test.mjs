import test from 'node:test';
import assert from 'node:assert/strict';
import { drawWX01Pack, getWX01Rates, WX01_PRICE, WX01_DRY_LIMIT, WX01_RATES, WX01_SEAL_COSTS } from '../wx01-pack.mjs';
import { WX01_ROSTER, WX01_PRINTINGS, getPrinting } from '../printing-catalogue.mjs';
import { rollPack, modeDistribution, seededRng, CHARACTERS, PRINTS } from '../tools/wx01-drop-model.mjs';

const sequence = values => {
  let used = 0;
  const rng = () => { assert(used < values.length, 'Unexpected RNG consumption'); return values[used++]; };
  return { rng, used: () => used };
};
const cardIds = new Map(WX01_ROSTER.map(entry => [`WX01-${String(entry.number).padStart(3, '0')}`, entry.cardId]));
const mapped = model => ({
  mode: model.mode, naturalMode: model.naturalMode, forced: model.forced, dry: model.dry,
  cards: model.cards.map(card => ({ cardId: cardIds.get(card.cardId), printId: card.printId.toLowerCase(), rarity: card.rarity })),
});

test('production checklist and printing mappings exactly match the isolated, reviewed drop model', () => {
  assert.equal(WX01_PRICE, 300); assert.equal(WX01_DRY_LIMIT, 12);
  assert.deepEqual(WX01_SEAL_COSTS, { aa: 20, leader: 40, treasure: 100, ink: 200 });
  assert.deepEqual(WX01_RATES, { ordinary: .837, aa: .125, leader: .025, treasure: .01, ink: .0025, god: .0005 });
  assert.equal(cardIds.size, 16);
  for (const character of CHARACTERS) {
    const production = WX01_ROSTER.find(entry => entry.cardId === cardIds.get(character.cardId));
    assert.equal(production.name, character.name); assert.equal(production.rarity, character.rarity);
  }
  assert.deepEqual(new Set(PRINTS.map(print => print.printId.toLowerCase())), new Set(WX01_PRINTINGS.map(print => print.id)));
  for (const print of PRINTS) assert.equal(getPrinting(print.printId.toLowerCase()).cardId, cardIds.get(print.cardId));
  for (let dry = 0; dry < 12; dry++) assert.deepEqual(getWX01Rates(dry), modeDistribution({ dry }));
  const mutable = getWX01Rates(11); mutable.aa = 0;
  assert.equal(getWX01Rates(11).aa, .962);
});

test('production sampler matches mapped offline outcomes and RNG consumption across 100,000 sequential seeded packs', () => {
  const reached = new Set(), modes = new Set(); let forced = 0;
  for (const seed of [0, 1, 73, 20260922, 0xffffffff]) {
    const productionSource = seededRng(seed), modelSource = seededRng(seed);
    let productionCalls = 0, modelCalls = 0, dry = 0;
    for (let index = 0; index < 20_000; index++) {
      const actual = drawWX01Pack({ dry, rng: () => { productionCalls++; return productionSource(); } });
      const expected = mapped(rollPack({ dry, rng: () => { modelCalls++; return modelSource(); } }));
      assert.deepEqual(actual, expected, `seed ${seed}, pack ${index}, dry ${dry}`);
      assert.equal(productionCalls, modelCalls);
      dry = actual.dry; forced += Number(actual.forced); modes.add(actual.mode);
      actual.cards.forEach(card => reached.add(card.printId));
    }
  }
  assert.equal(reached.size, 29); assert.equal(modes.size, 6); assert(forced > 0);
});

test('independent numeric mode boundaries use half-open intervals and reject invalid RNG/dry state before any extra draw', () => {
  const modes = ['ordinary', 'aa', 'leader', 'treasure', 'ink', 'god'];
  for (const [index, edge] of [0, .837, .962, .987, .997, .9995].entries()) {
    for (const [roll, expected] of [[edge, modes[index]], ...(index ? [[edge - 1e-12, modes[index - 1]]] : [])]) {
      const values = sequence([roll, ...Array(10).fill(0)]);
      assert.equal(drawWX01Pack({ rng: values.rng }).mode, expected);
    }
  }
  assert.equal(drawWX01Pack({ rng: sequence([1 - Number.EPSILON, 0, 0, 0]).rng }).mode, 'god');
  for (const bad of [-1, 1, NaN, Infinity, '0', null, undefined]) assert.throws(() => drawWX01Pack({ rng: () => bad }), RangeError);
  assert.throws(() => drawWX01Pack({ rng: sequence([0, 0, NaN]).rng }), RangeError);
  for (const dry of [-1, 12, .5, NaN, '1', null, Number.MAX_SAFE_INTEGER + 1]) {
    let used = false;
    assert.throws(() => drawWX01Pack({ dry, rng: () => { used = true; return 0; } }), RangeError);
    assert.equal(used, false); assert.throws(() => getWX01Rates(dry), RangeError);
  }
});

test('production common/common floor consumes a fresh rarity roll, preserving a chosen common AA or leader', () => {
  const ordinary = sequence([0, 0, 0, 0, 0, .75, 0]);
  const base = drawWX01Pack({ rng: ordinary.rng });
  assert.deepEqual(base.cards.map(card => card.cardId), ['tangsanzang', 'tangsanzang', 'guanyin']);
  assert.deepEqual(base.cards.map(card => card.rarity), ['common', 'common', 'epic']);
  assert.equal(ordinary.used(), 7);
  for (const [first, selected, expected] of [[.84, .2, 'wx01-001-aa1'], [.97, 0, 'wx01-001-laa1']]) {
    for (const [rarityRoll, rarity] of [[.749999, 'rare'], [.75, 'epic']]) {
      const values = sequence([first, selected, 0, 0, 0, 0, rarityRoll, 0]);
      const result = drawWX01Pack({ rng: values.rng });
      assert.equal(result.cards[2].printId, expected);
      assert.deepEqual(result.cards.map(card => card.rarity), ['common', rarity, 'common']);
      assert.equal(values.used(), 8);
    }
  }
});

test('twelfth ordinary outcome becomes AA and resets exactly once without reducing any natural special', () => {
  let dry = 0;
  for (let count = 1; count <= 13; count++) {
    const result = drawWX01Pack({ dry, rng: () => 0 });
    assert.equal(result.naturalMode, 'ordinary');
    assert.equal(result.forced, count === 12);
    assert.equal(result.mode, count === 12 ? 'aa' : 'ordinary');
    dry = result.dry; assert.equal(dry, count === 12 ? 0 : count === 13 ? 1 : count);
  }
  for (const [mode, roll] of [['aa', .84], ['leader', .97], ['treasure', .99], ['ink', .998], ['god', .9999]]) {
    const result = drawWX01Pack({ dry: 11, rng: sequence([roll, ...Array(10).fill(0)]).rng });
    assert.equal(result.mode, mode); assert.equal(result.forced, false); assert.equal(result.dry, 0);
  }
});

test('all 36 god-pack conditional selections choose ink then exclude its role from leader and both roles from AA', () => {
  const inks = ['wukong', 'liuer'];
  const leaders = ['tangsanzang', 'wukong', 'baigu', 'niumowang'];
  const aas = ['wukong', 'tangsanzang', 'bailong', 'bajie', 'guanyin', 'tieshan'];
  let paths = 0;
  for (let inkIndex = 0; inkIndex < inks.length; inkIndex++) {
    const ink = inks[inkIndex], eligibleLeaders = leaders.filter(cardId => cardId !== ink);
    for (let leaderIndex = 0; leaderIndex < eligibleLeaders.length; leaderIndex++) {
      const leader = eligibleLeaders[leaderIndex], eligibleAAs = aas.filter(cardId => cardId !== ink && cardId !== leader);
      for (let aaIndex = 0; aaIndex < eligibleAAs.length; aaIndex++) {
        const values = sequence([.9999, (inkIndex + .5) / 2, (leaderIndex + .5) / eligibleLeaders.length, (aaIndex + .5) / eligibleAAs.length]);
        const result = drawWX01Pack({ rng: values.rng }); paths++;
        assert.deepEqual(result.cards.map(card => card.cardId), [eligibleAAs[aaIndex], leader, ink]);
        assert.deepEqual(result.cards.map(card => getPrinting(card.printId).treatment), ['aa', 'leader', 'ink']);
        assert.equal(new Set(result.cards.map(card => card.cardId)).size, 3);
        assert(result.cards.some(card => card.rarity !== 'common')); assert.equal(values.used(), 4);
      }
    }
  }
  assert.equal(paths, 36);
});
