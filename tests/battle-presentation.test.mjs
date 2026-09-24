import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveRound } from '../engine.mjs';
import { createRoundPresentation, paintRoundResources } from '../battle-presentation.mjs';

const move = (cardId, pills = 0, fury = false) => ({ cardId, pills, fury });
function fixture(playerHand = ['qingxiao', 'chiling', 'shuangli', 'cangjiao'], opponentHand = ['yaoheng', 'jinlin', 'duying', 'cuixian']) {
  return {
    player: { hp: 12, pills: 12, hand: [...playerHand], used: [] },
    opponent: { hp: 12, pills: 12, hand: [...opponentHand], used: [] },
    round: 1, initiative: 'player', history: [], status: 'playing', winner: null, lastResult: null,
  };
}
const snapshot = state => Object.fromEntries(['player', 'opponent'].map(side => [side, { hp: state[side].hp, pills: state[side].pills }]));
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
function assertStatic(model, after) {
  assert.equal(model.canAnimate, false);
  for (const side of ['player', 'opponent']) {
    for (const frame of ['before', 'spent', 'impact', 'after']) assert.deepEqual(model[side][frame], snapshot(after)[side]);
    for (const delta of ['damage', 'hpRecovered', 'pillsSpent', 'pillsRecovered']) assert.equal(model[side][delta], 0);
  }
}

test('normal engine results separate public spending and accepted damage without mutating inputs', () => {
  const before = fixture(), after = resolveRound(before, move('qingxiao', 2), move('jinlin', 1));
  const initial = freeze(snapshot(before)); freeze(after);
  const originalRandom = Math.random;
  let model;
  try { Math.random = () => { throw Error('Presentation consumed battle randomness'); }; model = createRoundPresentation(initial, after); }
  finally { Math.random = originalRandom; }
  assert.equal(model.canAnimate, true);
  assert.deepEqual(model.player, {
    before: { hp: 12, pills: 12 }, spent: { hp: 12, pills: 10 }, impact: { hp: 12, pills: 10 }, after: { hp: 12, pills: 10 },
    damage: 0, hpRecovered: 0, pillsSpent: 2, pillsRecovered: 0,
  });
  assert.deepEqual(model.opponent, {
    before: { hp: 12, pills: 12 }, spent: { hp: 12, pills: 11 }, impact: { hp: 8, pills: 11 }, after: { hp: 8, pills: 11 },
    damage: 4, hpRecovered: 0, pillsSpent: 1, pillsRecovered: 0,
  });
  model.player.before.hp = 0; model.opponent.after.pills = 0;
  assert.equal(initial.player.hp, 12); assert.equal(after.opponent.pills, 11);
});

test('both winning and losing Fury commitments use accepted full cost; zero bids remain zero', () => {
  const before = fixture(), fury = resolveRound(before, move('qingxiao', 2, true), move('jinlin', 3, true));
  const paid = createRoundPresentation(snapshot(before), fury);
  assert.equal(paid.canAnimate, true);
  assert.equal(paid.player.pillsSpent, 5); assert.equal(paid.opponent.pillsSpent, 6);
  assert.deepEqual(paid.player.spent, { hp: 12, pills: 7 });
  assert.deepEqual(paid.player.impact, { hp: 4, pills: 7 });
  assert.equal(paid.player.damage, 8); assert.equal(paid.opponent.damage, 0);
  const zero = createRoundPresentation(snapshot(before), resolveRound(before, move('qingxiao'), move('jinlin')));
  assert.equal(zero.canAnimate, true);
  assert.equal(zero.player.pillsSpent, 0); assert.equal(zero.opponent.pillsSpent, 0);
  assert.equal(zero.player.spent.pills, 12); assert.equal(zero.opponent.spent.pills, 12);
});

test('overkill displays only HP actually lost and never a negative resource frame', () => {
  const before = fixture(); before.opponent.hp = 2;
  const after = resolveRound(before, move('qingxiao', 2, true), move('jinlin'));
  assert.equal(after.lastResult.damage, 6); assert.equal(after.opponent.hp, 0);
  const model = createRoundPresentation(snapshot(before), after);
  assert.equal(model.canAnimate, true); assert.equal(model.opponent.damage, 2);
  assert.equal(model.opponent.impact.hp, 0); assert.equal(model.opponent.after.hp, 0);
});

test('capped and suppressed healing are derived from actual post-round HP', () => {
  const before = fixture(['yaoheng', 'chiling', 'shuangli', 'cangjiao'], ['yunya', 'qingxiao', 'shuangli', 'chiling']);
  before.player.hp = 11;
  const after = resolveRound(before, move('yaoheng', 2), move('yunya'));
  const healed = createRoundPresentation(snapshot(before), after);
  assert.equal(healed.canAnimate, true);
  assert.equal(healed.player.impact.hp, 11); assert.equal(healed.player.after.hp, 12);
  assert.equal(healed.player.hpRecovered, 1, 'A printed two-HP ability restores only one near the cap');
  const stopped = createRoundPresentation(snapshot(before), resolveRound(before, move('yaoheng', 2), move('shuangli')));
  assert.equal(stopped.canAnimate, true); assert.equal(stopped.player.hpRecovered, 0);
  before.player.hp = 12;
  const capped = createRoundPresentation(snapshot(before), resolveRound(before, move('yaoheng', 2), move('yunya')));
  assert.equal(capped.player.hpRecovered, 0);
});

test('loss refunds follow spending and damage, with actual cap and suppression respected', () => {
  const before = fixture(['yanxin', 'qingxiao', 'shuangli', 'cangjiao'], ['jinlin', 'yaoheng', 'shuangli', 'cuixian']);
  before.player.pills = 5;
  const after = resolveRound(before, move('yanxin', 0, true), move('jinlin', 1));
  const model = createRoundPresentation(snapshot(before), after);
  assert.equal(model.canAnimate, true); assert.equal(model.player.pillsSpent, 3);
  assert.equal(model.player.spent.pills, 2); assert.equal(model.player.impact.pills, 2);
  assert.equal(model.player.after.pills, 4); assert.equal(model.player.pillsRecovered, 2);
  const zero = createRoundPresentation(snapshot(before), resolveRound(before, move('yanxin'), move('jinlin', 1)));
  assert.equal(zero.player.pillsSpent, 0); assert.equal(zero.player.pillsRecovered, 2); assert.equal(zero.player.after.pills, 7);
  const stopped = createRoundPresentation(snapshot(before), resolveRound(before, move('yanxin'), move('shuangli', 1)));
  assert.equal(stopped.player.pillsRecovered, 0);
  before.player.pills = 11;
  const capped = createRoundPresentation(snapshot(before), resolveRound(before, move('yanxin'), move('jinlin', 1)));
  assert.equal(capped.player.after.pills, 12); assert.equal(capped.player.pillsRecovered, 1);
});

test('reload without a transient before snapshot shows final totals without invented deltas', () => {
  const before = fixture(), after = resolveRound(before, move('qingxiao', 2), move('jinlin', 1));
  assertStatic(createRoundPresentation(null, after), after);
  assertStatic(createRoundPresentation(undefined, after), after);
  assertStatic(createRoundPresentation(null, snapshot(after)), after);
});

test('invalid or inconsistent round history falls back to final totals; invalid final totals are rejected', () => {
  const before = snapshot(fixture()), after = resolveRound(fixture(), move('qingxiao', 2), move('jinlin', 1));
  const variants = [
    (b, a) => { b.player.hp = NaN; },
    (b, a) => { b.opponent.pills = '12'; },
    (b, a) => { b.player.hp = 0; },
    (b, a) => { a.lastResult.player.cost = 13; },
    (b, a) => { a.lastResult.opponent.cost = -1; },
    (b, a) => { a.lastResult.damage = Infinity; },
    (b, a) => { a.lastResult.damage = 0; },
    (b, a) => { a.lastResult.damage = 9; },
    (b, a) => { a.lastResult.winner = 'draw'; },
    (b, a) => { a.player.pills = 9; },
    (b, a) => { a.player.pills = 11; },
    (b, a) => { a.opponent.hp = 7; },
    (b, a) => { a.opponent.hp = 9; },
    (b, a) => { delete a.lastResult; },
  ];
  for (const corrupt of variants) {
    const b = structuredClone(before), a = structuredClone(after); corrupt(b, a);
    assertStatic(createRoundPresentation(b, a), a);
  }
  for (const hp of [NaN, Infinity, -1, 13, 1.5, '8']) {
    const a = structuredClone(after); a.player.hp = hp;
    assert.equal(createRoundPresentation(before, a), null);
  }
  assert.equal(createRoundPresentation(before, null), null);
  assert.equal(createRoundPresentation(before, { player: after.player }), null);
});

function domNode(dataset = {}, initialClasses = []) {
  const classes = new Set(initialClasses), properties = new Map(), attributes = new Map();
  return {
    dataset, textContent: '', classes, properties, attributes,
    style: { setProperty(name, value) { properties.set(name, value); } },
    setAttribute(name, value) { attributes.set(name, value); },
    classList: {
      toggle(name, present) { if (present) classes.add(name); else classes.delete(name); },
      remove(...names) { for (const name of names) classes.delete(name); },
    },
  };
}
function resultDOM() {
  const panels = ['player', 'opponent'].map(side => {
    const panel = domNode({ side });
    panel.hp = domNode(); panel.pills = domNode(); panel.meter = domNode(); panel.caption = domNode();
    panel.tokens = Array.from({ length: 12 }, (_, i) => domNode({ pillIndex: String(i) }, ['is-filled', 'is-planned', 'is-fury']));
    panel.querySelectorAll = selector => ({
      '[data-hp-value]': [panel.hp], '[data-pill-value]': [panel.pills], '[data-hp-meter]': [panel.meter],
      '[data-pill-index]': panel.tokens, '[data-resource-caption]': [panel.caption],
    })[selector] || [];
    return panel;
  });
  return { panels, querySelectorAll: selector => selector === '.battle-resources[data-side]' ? panels : [] };
}
function assertPainted(panel, hp, pills) {
  assert.equal(panel.hp.textContent, String(hp)); assert.equal(panel.pills.textContent, String(pills));
  assert.equal(panel.dataset.hp, String(hp)); assert.equal(panel.dataset.pills, String(pills));
  assert.equal(panel.meter.attributes.get('aria-valuenow'), String(hp));
  assert.equal(panel.meter.properties.get('--life-fill'), `${hp / 12 * 100}%`);
  assert.equal(panel.properties.get('--life-fill'), `${hp / 12 * 100}%`);
  assert.match(panel.attributes.get('aria-label'), new RegExp(`生命 ${hp}/12 · 仙丹 ${pills}/12`));
  assert.equal(panel.classes.has('is-low-life'), hp <= 3);
  panel.tokens.forEach((token, i) => {
    assert.equal(token.classes.has('is-filled'), i < pills); assert.equal(token.classes.has('is-empty'), i >= pills);
    assert.equal(token.classes.has('is-planned'), false); assert.equal(token.classes.has('is-fury'), false);
  });
}

test('DOM phases paint totals, low life, deltas and accessibility together, with no planning highlights', () => {
  const before = fixture(['yanxin', 'qingxiao', 'shuangli', 'cangjiao'], ['jinlin', 'yaoheng', 'shuangli', 'cuixian']);
  before.player.hp = 3; before.player.pills = 5;
  const after = resolveRound(before, move('yanxin', 0, true), move('jinlin', 1));
  const model = freeze(createRoundPresentation(snapshot(before), after)), element = resultDOM(), [player, opponent] = element.panels;
  paintRoundResources(element, model, 'sealed'); assertPainted(player, 3, 5); assertPainted(opponent, 12, 12);
  paintRoundResources(element, model, 'bids'); assertPainted(player, 3, 2); assertPainted(opponent, 12, 11);
  assert.equal(player.caption.textContent, '付出 3 顆仙丹');
  paintRoundResources(element, model, 'impact'); assertPainted(player, 0, 2);
  assert(player.classes.has('is-damaged')); assert.equal(player.caption.textContent, '承受 3 點傷害');
  paintRoundResources(element, model, 'recovery'); assertPainted(player, 0, 4);
  assert(!player.classes.has('is-damaged')); assert(player.classes.has('is-recovering'));
  assert.equal(player.caption.textContent, '取回 2 顆仙丹');
  paintRoundResources(element, model, 'complete'); assertPainted(player, after.player.hp, after.player.pills);
  assert(!player.classes.has('is-recovering'));
  assert.equal(player.caption.textContent, '付出 3 顆仙丹 · 承受 3 點傷害 · 取回 2 顆仙丹');
  paintRoundResources(element, model, 'unknown'); assertPainted(player, after.player.hp, after.player.pills);
  const unchanged = player.hp.textContent; paintRoundResources(element, null, 'sealed'); assert.equal(player.hp.textContent, unchanged);
});

test('static resource panels remain final in every phase and make no historical claims', () => {
  const after = resolveRound(fixture(), move('qingxiao', 2), move('jinlin', 1));
  const model = createRoundPresentation(null, after), element = resultDOM();
  for (const phase of ['sealed', 'bids', 'impact', 'recovery', 'complete']) {
    paintRoundResources(element, model, phase);
    for (const panel of element.panels) {
      assertPainted(panel, after[panel.dataset.side].hp, after[panel.dataset.side].pills);
      assert.equal(panel.caption.textContent, '資源已結算');
      assert(!panel.classes.has('is-damaged')); assert(!panel.classes.has('is-recovering'));
    }
  }
});
