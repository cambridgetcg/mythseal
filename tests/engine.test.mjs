import test from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, LEGACY_CARD_IDS, FACTIONS, RULES, ORIGINAL_CARD_IDS, CLASSIC_CARD_IDS, defaultDeckIds, getCard, getBattleCard, validateDeck, createMatch, hasFactionBonus, previewMove, resolveRound, chooseAIMove } from '../engine.mjs';

function seeded(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function fixture(playerHand = ['qingxiao', 'chiling', 'shuangli', 'cangjiao'], opponentHand = ['yaoheng', 'jinlin', 'duying', 'cuixian']) {
  return {
    player: { hp: 12, pills: 12, hand: [...playerHand], used: [] },
    opponent: { hp: 12, pills: 12, hand: [...opponentHand], used: [] },
    round: 1, initiative: 'player', history: [], status: 'playing', winner: null, lastResult: null,
  };
}

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

const move = (cardId, pills = 0, fury = false) => ({ cardId, pills, fury });

test('legacy collection retains two twelve-slot atlases and four factions; starter deck remains unchanged', () => {
  const legacy = LEGACY_CARD_IDS.map(getCard);
  assert.equal(legacy.length, 24);
  assert.equal(new Set(legacy.map((card) => card.name)).size, 24);
  assert.equal(new Set(legacy.map((card) => `${card.artSet ?? 'original'}:${card.art}`)).size, 24);
  for (const set of [ORIGINAL_CARD_IDS, CLASSIC_CARD_IDS]) {
    assert.equal(set.length, 12);
    assert.deepEqual(set.map((id) => getCard(id).art).sort((a, b) => a - b), Array.from({ length: 12 }, (_, index) => index));
    assert.ok(Object.isFrozen(set));
  }
  for (const faction of Object.keys(FACTIONS)) assert.equal(legacy.filter((card) => card.faction === faction).length, 6);
  assert.deepEqual(defaultDeckIds, ['qingxiao', 'chiling', 'shuangli', 'cangjiao', 'yaoheng', 'yanxin', 'duying', 'cuixian']);
  assert.deepEqual(validateDeck(defaultDeckIds), { valid: true, errors: [], stars: 24 });
  assert.throws(() => { getCard('qingxiao').power = 99; }, TypeError);
});

test('deck validation rejects duplicates, unknown cards, wrong size and excess stars', () => {
  assert.equal(validateDeck(null).valid, false);
  assert.equal(validateDeck(defaultDeckIds.slice(1)).valid, false);
  assert.equal(validateDeck([...defaultDeckIds.slice(0, 7), defaultDeckIds[0]]).valid, false);
  assert.equal(validateDeck([...defaultDeckIds.slice(0, 7), 'missing']).valid, false);
  assert.equal(validateDeck(['chiling', 'cangjiao', 'xuanjian', 'jinlin', 'qingxiao', 'shuangli', 'yaoheng', 'duying']).valid, false);
  assert.throws(() => createMatch({ deckIds: ['missing'], rng: seeded(1) }), RangeError);
  assert.throws(() => getCard('missing'), RangeError);
});

test('draws are reproducible, without replacement, and do not modify decks', () => {
  const deck = [...defaultDeckIds];
  const state = createMatch({ deckIds: deck, rng: seeded(82) });
  assert.deepEqual(state, createMatch({ rng: seeded(82) }));
  assert.deepEqual(deck, defaultDeckIds);
  for (const side of ['player', 'opponent']) {
    assert.equal(state[side].hp, 12);
    assert.equal(state[side].pills, 12);
    assert.equal(state[side].hand.length, 4);
    assert.equal(new Set(state[side].hand).size, 4);
    assert.ok(state[side].hand.every((id) => deck.includes(id)));
  }
  assert.throws(() => createMatch({ rng: () => 1 }), RangeError);
});

test('higher total hand stars determine first initiative; equal totals use the injected coin', () => {
  for (let seed = 0; seed < 30; seed++) {
    const state = createMatch({ rng: seeded(seed) });
    const sum = (side) => state[side].hand.reduce((total, id) => total + getCard(id).stars, 0);
    if (sum('player') !== sum('opponent')) assert.equal(state.initiative, sum('player') > sum('opponent') ? 'player' : 'opponent');
  }
  assert.equal(createMatch({ rng: () => 0 }).initiative, 'player');
  assert.equal(createMatch({ rng: () => 0.999 }).initiative, 'opponent');
});

test('zero-spend attacks retain base power; paid pills multiply power and Fury affects damage only', () => {
  const state = fixture();
  const zero = previewMove(state, 'player', move('qingxiao'));
  const paid = previewMove(state, 'player', move('qingxiao', 2, true));
  assert.equal(zero.power, 8);
  assert.equal(zero.attack, 8);
  assert.equal(zero.bonusActive, false);
  assert.equal(paid.attack, 24);
  assert.equal(paid.damage, 6);
  assert.equal(paid.cost, 5);
});

test('faction support counts distinct original-hand names and survives an ally being used', () => {
  const state = fixture(['qingxiao', 'yaoheng', 'shuangli', 'chiling']);
  state.player.used.push('yaoheng');
  assert.equal(hasFactionBonus(state, 'player', 'qingxiao'), true);
  assert.equal(previewMove(state, 'player', move('qingxiao')).attack, 14);
  state.player.hand = ['qingxiao', 'qingxiao', 'shuangli', 'chiling'];
  assert.equal(hasFactionBonus(state, 'player', 'qingxiao'), false);
});

test('opposing power is reduced before multiplication, attack reductions after multiplication', () => {
  const state = fixture(undefined, ['duying', 'shuangli', 'chiling', 'cangjiao']);
  const result = resolveRound(state, move('qingxiao', 2), move('duying', 2)).lastResult;
  assert.equal(result.player.power, 7);
  assert.equal(result.player.attack, 15); // (7 + 1 - 1) * 3 - 6
  assert.equal(result.opponent.attack, 18);
  assert.equal(result.winner, 'opponent');
  assert.equal(result.damage, 4);
});

test('Stop Ability cancels character effects but leaves faction bonuses; two stops coexist', () => {
  const state = fixture(['qingxiao', 'yaoheng', 'chiling', 'cangjiao'], ['shuangli', 'duying', 'chiling', 'cangjiao']);
  const result = resolveRound(state, move('qingxiao', 2), move('shuangli', 1)).lastResult;
  assert.equal(result.player.abilityActive, false);
  assert.equal(result.player.bonusActive, true);
  assert.equal(result.player.power, 7);
  assert.equal(result.player.attack, 21); // power * 3 + 6 own bonus - 6 opposing bonus
  const both = fixture(['xuanjian', 'chiling', 'shuangli', 'cangjiao'], ['shuangli', 'yaoheng', 'chiling', 'cangjiao']);
  const pair = resolveRound(both, move('xuanjian'), move('shuangli')).lastResult;
  assert.equal(pair.player.abilityActive, false);
  assert.equal(pair.opponent.abilityActive, false);
});

test('exact attack ties go to fewer stars, then the round initiative', () => {
  const lowStars = resolveRound(fixture(), move('qingxiao'), move('jinlin')).lastResult;
  assert.deepEqual(lowStars.attacks, { player: 8, opponent: 8 });
  assert.equal(lowStars.winner, 'player');
  assert.equal(lowStars.tieReason, 'stars');
  const equal = fixture(undefined, ['shuangli', 'yaoheng', 'chiling', 'cangjiao']);
  equal.initiative = 'opponent';
  const result = resolveRound(equal, move('qingxiao'), move('shuangli')).lastResult;
  assert.deepEqual(result.attacks, { player: 7, opponent: 7 });
  assert.equal(result.winner, 'opponent');
  assert.equal(result.tieReason, 'initiative');
});

test('Fury, damage bonus and stacked defender reductions resolve together; damage never falls below one', () => {
  const state = fixture(['chiling', 'yanxin', 'qingxiao', 'shuangli'], ['cangjiao', 'cuixian', 'yaoheng', 'duying']);
  const next = resolveRound(state, move('chiling', 3, true), move('cangjiao'));
  assert.equal(next.lastResult.damage, 5); // 5 + 1 + 2 - 2 - 1
  assert.equal(next.opponent.hp, 7);
  assert.equal(next.player.pills, 6);
  const low = fixture(['cuixian', 'qingxiao', 'shuangli', 'chiling'], ['cangjiao', 'yunya', 'yaoheng', 'duying']);
  const reduced = resolveRound(low, move('cuixian', 1), move('cangjiao'));
  assert.equal(reduced.lastResult.damage, 1);
});

test('attack reductions have a floor of one even when no pills are spent', () => {
  const state = fixture(['yunya', 'qingxiao', 'shuangli', 'chiling'], ['shuangli', 'duying', 'yaoheng', 'chiling']);
  const result = resolveRound(state, move('yunya'), move('shuangli')).lastResult;
  assert.equal(result.player.attack, 1);
});

test('victory healing is capped, triggers only on a win, and can be stopped', () => {
  const state = fixture(['yaoheng', 'chiling', 'shuangli', 'cangjiao'], ['yunya', 'qingxiao', 'shuangli', 'chiling']);
  state.player.hp = 11;
  const healed = resolveRound(state, move('yaoheng', 2), move('yunya'));
  assert.equal(healed.player.hp, 12);
  assert.ok(healed.lastResult.notes.player.includes('回復 1 點生命'));
  const stopped = resolveRound(state, move('yaoheng', 2), move('shuangli'));
  assert.equal(stopped.player.hp, 11);
  const lost = resolveRound(state, move('yaoheng'), move('chiling', 3));
  assert.equal(lost.player.hp, 6);
});

test('defeat recovery works on zero spend, caps at twelve and is prevented by Stop Ability', () => {
  const state = fixture(['yanxin', 'qingxiao', 'shuangli', 'cangjiao'], ['jinlin', 'yaoheng', 'shuangli', 'cuixian']);
  state.player.pills = 5;
  assert.equal(resolveRound(state, move('yanxin'), move('jinlin', 1)).player.pills, 7);
  assert.equal(resolveRound(state, move('yanxin', 0, true), move('jinlin', 1)).player.pills, 4);
  assert.equal(resolveRound(state, move('yanxin'), move('shuangli', 1)).player.pills, 5);
  state.player.pills = 12;
  assert.equal(resolveRound(state, move('yanxin'), move('jinlin', 1)).player.pills, 12);
});

test('both sides pay a losing or winning Fury commitment and each card is spent once', () => {
  const state = fixture();
  const next = resolveRound(state, move('qingxiao', 2, true), move('jinlin', 3, true));
  assert.equal(next.player.pills, 7);
  assert.equal(next.opponent.pills, 6);
  assert.deepEqual(next.player.used, ['qingxiao']);
  assert.deepEqual(next.opponent.used, ['jinlin']);
  assert.equal(next.round, 2);
  assert.equal(next.initiative, 'opponent');
  assert.throws(() => resolveRound(next, move('qingxiao'), move('yaoheng')), /already been used/);
});

test('invalid spending and cards are rejected without mutating the input', () => {
  const state = deepFreeze(fixture());
  for (const pills of [-1, 0.5, NaN, Infinity, 13, '2']) assert.throws(() => resolveRound(state, move('qingxiao', pills), move('jinlin')));
  assert.throws(() => resolveRound(state, move('qingxiao', 10, true), move('jinlin')), /Not enough/);
  assert.throws(() => resolveRound(state, move('qingxiao', 0, 'yes'), move('jinlin')), TypeError);
  assert.throws(() => resolveRound(state, move('yaoheng'), move('jinlin')), /not in this hand/);
  assert.throws(() => previewMove(state, 'outsider', move('qingxiao')), RangeError);
  assert.throws(() => resolveRound(state, move('qingxiao'), move('missing')), RangeError);
  assert.equal(state.player.pills, 12);
  assert.equal(state.history.length, 0);
});

test('resolution works with deeply frozen inputs, with an independently extended history', () => {
  const state = deepFreeze(fixture());
  const next = resolveRound(state, move('qingxiao'), move('jinlin'));
  deepFreeze(next);
  const after = resolveRound(next, move('chiling'), move('yaoheng'));
  assert.equal(state.history.length, 0);
  assert.equal(next.history.length, 1);
  assert.equal(after.history.length, 2);
  assert.equal(state.round, 1);
  assert.deepEqual(state.player.used, []);
  assert.notEqual(after.player.hand, next.player.hand);
});

test('KO ends immediately; further play and AI moves are refused', () => {
  const state = fixture(undefined, ['yunya', 'yaoheng', 'duying', 'chiling']);
  state.opponent.hp = 3;
  const finished = resolveRound(state, move('chiling', 3), move('yunya'));
  assert.equal(finished.opponent.hp, 0);
  assert.equal(finished.status, 'finished');
  assert.equal(finished.winner, 'player');
  assert.equal(finished.round, 1);
  assert.equal(finished.history.length, 1);
  assert.throws(() => resolveRound(finished, move('qingxiao'), move('yaoheng')), /already finished/);
  assert.throws(() => chooseAIMove(finished), /already finished/);
});

test('four-round life comparison permits a draw and ignores unused pills', () => {
  const hand = ['yanxin', 'cuixian', 'yunya', 'zhimeng'];
  let state = fixture(hand, hand);
  state.opponent.hp = 11;
  state.opponent.pills = 4;
  for (const cardId of hand) state = resolveRound(state, move(cardId), move(cardId));
  assert.equal(state.history.length, 4);
  assert.equal(state.round, 4);
  assert.equal(state.status, 'finished');
  assert.equal(state.player.hp, 8);
  assert.equal(state.opponent.hp, 8);
  assert.equal(state.winner, 'draw');
  assert.notEqual(state.player.pills, state.opponent.pills);
});

test('AI is seeded and reads only public fields, never pending cards, spending or Fury', () => {
  const state = fixture();
  const expected = chooseAIMove(state, seeded(77));
  for (const object of [state, state.player, state.opponent]) {
    for (const key of ['selection', 'selectedCard', 'pendingMove', 'playerMove', 'fury', 'bid']) {
      Object.defineProperty(object, key, { get() { throw new Error(`Hidden ${key} was read`); } });
    }
  }
  assert.deepEqual(chooseAIMove(state, seeded(77)), expected);
  assert.doesNotThrow(() => previewMove(state, 'opponent', expected));
  assert.equal(state.opponent.used.length, 0);
  assert.equal(state.player.pills, 12);
});

test('AI can act legally with zero pills in the final round', () => {
  const state = fixture();
  state.round = 4;
  state.opponent.pills = 0;
  state.player.pills = 0;
  state.player.used = state.player.hand.slice(0, 3);
  state.opponent.used = state.opponent.hand.slice(0, 3);
  assert.deepEqual(chooseAIMove(deepFreeze(state), seeded(1)), move('cuixian'));
});

test('following AI can condition on an explicitly revealed available card, without learning the bid', () => {
  const state = fixture();
  const singleHypothesis = fixture(['chiling']);
  assert.deepEqual(chooseAIMove(state, seeded(6), 'chiling'), chooseAIMove(singleHypothesis, seeded(6)));
  Object.defineProperty(state.player, 'pendingMove', { get() { throw new Error('Hidden bid was read'); } });
  assert.doesNotThrow(() => chooseAIMove(state, seeded(6), 'chiling'));
  assert.throws(() => chooseAIMove(state, seeded(6), 'yaoheng'), /must be available/);
  state.player.used.push('chiling');
  assert.throws(() => chooseAIMove(state, seeded(6), 'chiling'), /must be available/);
});

test('seeded full-match simulations preserve resource, card-use and termination invariants', () => {
  for (let seed = 0; seed < 100; seed++) {
    const rng = seeded(seed);
    let state = createMatch({ rng });
    while (state.status === 'playing') {
      const legalRandomMove = (side) => {
        const ids = state[side].hand.filter((id) => !state[side].used.includes(id));
        const cardId = ids[Math.floor(rng() * ids.length)];
        const fury = state[side].pills >= 3 && rng() < 0.2;
        const pills = Math.floor(rng() * (state[side].pills - (fury ? 3 : 0) + 1));
        return move(cardId, pills, fury);
      };
      const playerMove = legalRandomMove('player');
      const opponentMove = seed < 8 ? chooseAIMove(state, rng) : legalRandomMove('opponent');
      const before = JSON.stringify(state);
      const next = resolveRound(state, playerMove, opponentMove);
      assert.equal(JSON.stringify(state), before);
      state = next;
      for (const side of ['player', 'opponent']) {
        assert.ok(Number.isInteger(state[side].pills) && state[side].pills >= 0 && state[side].pills <= RULES.pills);
        assert.ok(state[side].hp >= 0 && state[side].hp <= RULES.life);
        assert.equal(state[side].used.length, state.history.length);
        assert.equal(new Set(state[side].used).size, state[side].used.length);
      }
      assert.ok(state.history.length <= 4);
    }
    assert.ok(['player', 'opponent', 'draw'].includes(state.winner));
  }
});

test('match modes default to practice and own normalized, immutable rank maps', () => {
  const playerLevels = { qingxiao: 5 };
  const opponentLevels = { duying: 3 };
  const state = createMatch({ playerLevels, opponentLevels, opponentName: '山門守衛', rng: seeded(3) });
  assert.equal(state.mode, 'practice');
  assert.equal(state.opponentName, '山門守衛');
  assert.equal(state.playerLevels.qingxiao, 5);
  assert.equal(state.opponentLevels.duying, 3);
  assert.equal(Object.keys(state.playerLevels).length, CARDS.length);
  assert.equal(state.playerLevels.yunya, 1);
  assert.equal(state.opponentLevels.qingxiao, 1);
  playerLevels.qingxiao = 2;
  opponentLevels.duying = 1;
  assert.equal(state.playerLevels.qingxiao, 5);
  assert.equal(state.opponentLevels.duying, 3);
  assert.throws(() => { state.playerLevels.qingxiao = 4; }, TypeError);
  assert.equal(getBattleCard(state, 'player', 'qingxiao').level, 1);
});

test('invalid ranks and level-map card IDs are rejected before drawing', () => {
  const options = { rng: () => { throw new Error('Should not draw invalid settings'); } };
  for (const value of [0, 6, -1, 1.5, NaN, Infinity, '2', null, undefined]) {
    assert.throws(() => createMatch({ ...options, playerLevels: { qingxiao: value } }), /integers from 1 to 5/);
    assert.throws(() => createMatch({ ...options, opponentLevels: { qingxiao: value } }), /integers from 1 to 5/);
  }
  for (const value of [null, [], 1, 'levels', new Date()]) {
    assert.throws(() => createMatch({ ...options, playerLevels: value }), /mapping known card IDs/);
  }
  assert.throws(() => createMatch({ ...options, playerLevels: { unknown: 2 } }), /Unknown card/);
  assert.throws(() => createMatch({ ...options, opponentLevels: { unknown: 2 } }), /Unknown card/);
  assert.throws(() => createMatch({ ...options, mode: 'ranked' }), /Unknown match mode/);
  assert.throws(() => createMatch({ ...options, opponentName: 3 }), /must be a string/);
});

test('expedition ranks apply the five-step stat table to both sides without changing stars or abilities', () => {
  const increments = [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]];
  for (const card of CARDS) {
    for (let level = 1; level <= 5; level++) {
      const state = createMatch({ mode: 'expedition', playerLevels: { [card.id]: level }, opponentLevels: { [card.id]: level }, rng: seeded(2) });
      for (const side of ['player', 'opponent']) {
        const effective = getBattleCard(state, side, card.id);
        assert.equal(effective.power, card.power + increments[level - 1][0]);
        assert.equal(effective.damage, card.damage + increments[level - 1][1]);
        assert.equal(effective.level, level);
        assert.equal(effective.basePower, card.power);
        assert.equal(effective.baseDamage, card.damage);
        assert.equal(effective.stars, card.stars);
        assert.equal(effective.ability, card.ability);
        assert.ok(Object.isFrozen(effective));
      }
    }
  }
  assert.equal(validateDeck(defaultDeckIds).stars, 24);
  assert.equal(getBattleCard(fixture(), 'player', 'qingxiao').level, 1);
  assert.throws(() => getBattleCard(fixture(), 'spectator', 'qingxiao'), /Unknown side/);
  assert.throws(() => getBattleCard(fixture(), 'player', 'unknown'), /Unknown card/);
});

test('expedition preview, attacks, damage and revealed cards use effective ranks', () => {
  const state = fixture();
  state.mode = 'expedition';
  state.playerLevels = { qingxiao: 5 };
  state.opponentLevels = { duying: 3 };
  deepFreeze(state);
  const estimate = previewMove(state, 'player', move('qingxiao', 2));
  assert.equal(estimate.card.power, 9);
  assert.equal(estimate.power, 10); // rank +2, then own +1 ability
  assert.equal(estimate.attack, 30);
  assert.equal(estimate.damage, 6);
  const next = resolveRound(state, move('qingxiao', 2), move('duying'));
  assert.equal(next.lastResult.player.power, 9); // opposing ability -1
  assert.equal(next.lastResult.player.attack, 27);
  assert.equal(next.lastResult.opponent.power, 7);
  assert.equal(next.lastResult.opponent.damage, 5);
  assert.equal(next.lastResult.cards.player.level, 5);
  assert.equal(next.lastResult.cards.opponent.level, 3);
  assert.equal(next.opponent.hp, 6);
  assert.equal(state.opponent.hp, 12);
  assert.equal(getCard('qingxiao').power, 7);
  assert.equal(getCard('duying').damage, 4);
});

test('Stop Ability leaves expedition rank bonuses intact', () => {
  const state = fixture(undefined, ['shuangli', 'yaoheng', 'chiling', 'cangjiao']);
  state.mode = 'expedition';
  state.playerLevels = { qingxiao: 5 };
  state.opponentLevels = { shuangli: 3 };
  const result = resolveRound(state, move('qingxiao'), move('shuangli')).lastResult;
  assert.equal(result.player.abilityActive, false);
  assert.equal(result.player.power, 9);
  assert.equal(result.player.damage, 6);
  assert.equal(result.opponent.power, 8);
});

test('arena and practice have identical battles and AI choices regardless of collection ranks', () => {
  const highRanks = Object.fromEntries(CARDS.map((card) => [card.id, 5]));
  for (const mode of ['arena', 'practice']) {
    const baseline = createMatch({ mode, rng: seeded(24) });
    const upgraded = createMatch({ mode, playerLevels: highRanks, opponentLevels: { qingxiao: 2, duying: 3 }, rng: seeded(24) });
    assert.deepEqual(upgraded.player.hand, baseline.player.hand);
    assert.equal(upgraded.initiative, baseline.initiative);
    for (const side of ['player', 'opponent']) {
      for (const cardId of baseline[side].hand) assert.deepEqual(getBattleCard(upgraded, side, cardId), getBattleCard(baseline, side, cardId));
    }
    const playerMove = move(baseline.player.hand[0], 2, true);
    const opponentMove = move(baseline.opponent.hand[0], 1);
    assert.deepEqual(resolveRound(upgraded, playerMove, opponentMove).lastResult, resolveRound(baseline, playerMove, opponentMove).lastResult);
    assert.deepEqual(chooseAIMove(upgraded, seeded(4)), chooseAIMove(baseline, seeded(4)));
  }
});

test('AI accounts for public ranks on both sides while excluding hidden fields inside level maps', () => {
  const state = fixture(['jinlin'], ['qingxiao']);
  state.mode = 'expedition';
  state.round = 4;
  state.player.pills = 0;
  state.opponent.pills = 4;
  state.playerLevels = {};
  state.opponentLevels = {};
  assert.deepEqual(chooseAIMove(state, () => 0), move('qingxiao', 0, true));
  state.playerLevels.jinlin = 5;
  Object.defineProperty(state.playerLevels, 'pendingMove', { get() { throw new Error('Hidden bid read through level map'); } });
  Object.defineProperty(state.opponentLevels, 'selection', { get() { throw new Error('Hidden selection read through level map'); } });
  Object.defineProperty(state, 'opponentName', { get() { throw new Error('AI read unnecessary display metadata'); } });
  assert.deepEqual(chooseAIMove(state, () => 0), move('qingxiao', 1, true));
  const upgradedOpponent = fixture(['qingxiao'], ['jinlin']);
  upgradedOpponent.mode = 'expedition';
  upgradedOpponent.round = 4;
  upgradedOpponent.player.pills = 0;
  upgradedOpponent.opponent.pills = 4;
  assert.deepEqual(chooseAIMove(upgradedOpponent, () => 0), move('jinlin', 1, true));
  upgradedOpponent.opponentLevels = { jinlin: 2 };
  assert.deepEqual(chooseAIMove(deepFreeze(upgradedOpponent), () => 0), move('jinlin', 0, true));
});

test('classic metadata preserves exact atlas order, known sources and immutable original identities', () => {
  assert.deepEqual(ORIGINAL_CARD_IDS, ['qingxiao', 'chiling', 'shuangli', 'cangjiao', 'yaoheng', 'yanxin', 'duying', 'cuixian', 'xuanjian', 'jinlin', 'zhimeng', 'yunya']);
  assert.deepEqual(CLASSIC_CARD_IDS, ['huangdi', 'wukong', 'lindaiyu', 'pangu', 'kongzi', 'guanyu', 'wangxifeng', 'luzhishen', 'zhugeliang', 'nezha', 'diaochan', 'wusong']);
  const sources = new Set(['上古傳說', '西遊記', '紅樓夢', '先秦典籍', '三國演義', '水滸傳', '封神演義']);
  for (const [index, id] of CLASSIC_CARD_IDS.entries()) {
    const card = getCard(id);
    assert.equal(card.artSet, 'classics');
    assert.equal(card.art, index);
    assert.equal(card.faction, ['yun', 'ember', 'moon', 'grove'][index % 4]);
    assert.ok(sources.has(card.source));
    assert.ok(card.lore && card.title && card.ability.description);
    assert.ok(Object.isFrozen(card) && Object.isFrozen(card.ability));
  }
  assert.throws(() => { getCard('wukong').ability.type = 'power'; }, TypeError);
  assert.throws(() => CLASSIC_CARD_IDS.push('extra'), TypeError);
});

test('classic and original allies activate the same faction bonus across art sets', () => {
  const state = fixture(['qingxiao', 'kongzi', 'wukong', 'lindaiyu']);
  assert.equal(hasFactionBonus(state, 'player', 'qingxiao'), true);
  assert.equal(hasFactionBonus(state, 'player', 'kongzi'), true);
  assert.equal(previewMove(state, 'player', move('qingxiao')).attack, 14);
});

test('Wukong suppresses Pangu power while printed damage and both five-star costs remain', () => {
  const state = fixture(['wukong', 'huangdi', 'lindaiyu', 'luzhishen'], ['pangu', 'kongzi', 'diaochan', 'nezha']);
  const next = resolveRound(state, move('wukong'), move('pangu'));
  assert.equal(next.lastResult.player.card.stars, 5);
  assert.equal(next.lastResult.opponent.card.stars, 5);
  assert.equal(next.lastResult.opponent.abilityActive, false);
  assert.equal(next.lastResult.opponent.power, 6);
  assert.equal(next.lastResult.opponent.damage, 7);
  assert.equal(next.lastResult.winner, 'player');
  assert.equal(next.opponent.hp, 6);
});

test('literary support cards defend and recover resources through existing effect rules', () => {
  const defensive = fixture(['lindaiyu', 'kongzi', 'guanyu', 'luzhishen'], ['guanyu', 'huangdi', 'wangxifeng', 'wusong']);
  const defended = resolveRound(defensive, move('lindaiyu'), move('guanyu', 1));
  assert.equal(defended.lastResult.winner, 'opponent');
  assert.equal(defended.lastResult.damage, 3); // Guan Yu: 4 + 1, Daiyu: -2
  const resources = fixture(['wangxifeng', 'huangdi', 'wukong', 'luzhishen'], ['pangu', 'kongzi', 'diaochan', 'nezha']);
  resources.player.pills = 5;
  assert.equal(resolveRound(resources, move('wangxifeng'), move('pangu', 2)).player.pills, 7);
  const healing = fixture(['kongzi', 'guanyu', 'diaochan', 'pangu']);
  healing.player.hp = 8;
  assert.equal(resolveRound(healing, move('kongzi', 3), move('jinlin')).player.hp, 10);
});

test('Zhuge Liang combines his attack reduction with Yun support against Nezha speed', () => {
  const state = fixture(['zhugeliang', 'kongzi', 'diaochan', 'pangu'], ['nezha', 'huangdi', 'lindaiyu', 'luzhishen']);
  const result = resolveRound(state, move('zhugeliang'), move('nezha')).lastResult;
  assert.equal(result.player.attack, 13); // 7 power + 6 faction attack
  assert.equal(result.opponent.attack, 10); // 6 power + 8 ability - 4 opposing ability
  assert.equal(result.winner, 'player');
});

test('an all-classic deck can include two five-star cards within the cap and complete real battles', () => {
  const deck = ['wukong', 'pangu', 'lindaiyu', 'kongzi', 'guanyu', 'wangxifeng', 'luzhishen', 'diaochan'];
  assert.deepEqual(validateDeck(deck), { valid: true, errors: [], stars: 25 });
  assert.equal(validateDeck(['wukong', 'pangu', 'huangdi', 'guanyu', 'wangxifeng', 'luzhishen', 'zhugeliang', 'nezha']).valid, false);
  const rng = seeded(2026);
  let state = createMatch({ deckIds: deck, opponentDeckIds: deck, rng });
  while (state.status === 'playing') {
    const cardId = state.player.hand.find((id) => !state.player.used.includes(id));
    const ai = chooseAIMove(state, rng, state.initiative === 'player' ? cardId : null);
    state = resolveRound(state, move(cardId), ai);
  }
  assert.ok(state.history.length >= 1 && state.history.length <= 4);
  assert.ok(['player', 'opponent', 'draw'].includes(state.winner));
  assert.ok(state.history.every((round) => round.player.card.artSet === 'classics' && round.opponent.card.artSet === 'classics'));
});
