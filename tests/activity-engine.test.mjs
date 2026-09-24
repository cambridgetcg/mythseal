import test from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, getBattleCard, previewMove, resolveRound, chooseAIMove } from '../engine.mjs';

test('activity carry-over is applied before play, capped and normalized independently of card cultivation', () => {
  const resources = { player: { hp: 7, pills: 8 } };
  const match = createMatch({ mode: 'activity', rng: () => .3, initialResources: resources,
    playerLevels: { qingxiao: 5 }, opponentLevels: { qingxiao: 5 } });
  assert.equal(match.player.hp, 7); assert.equal(match.player.pills, 8);
  assert.equal(match.opponent.hp, 12); assert.equal(match.opponent.pills, 12);
  assert.equal(getBattleCard(match, 'player', 'qingxiao').level, 1);
  resources.player.hp = 1;
  assert.equal(match.player.hp, 7);
  assert.throws(() => previewMove(match, 'player', { cardId: match.player.hand[0], pills: 9 }), /Not enough/);
  const next = resolveRound(match, { cardId: match.player.hand[0], pills: 1 }, chooseAIMove(match, () => .3));
  assert.equal(match.player.hp, 7); assert.equal(match.player.pills, 8);
  assert.equal(next.round, 2);
});

test('invalid carry-over fails before drawing and ordinary modes keep their original 12/12 start', () => {
  for (const initialResources of [null, {}, {player:{hp:0,pills:8}}, {player:{hp:13,pills:8}},
    {player:{hp:7,pills:-1}}, {player:{hp:7,pills:13}}, {player:{hp:7.5,pills:8}},
    {player:{hp:7,pills:8,extra:1}}, {player:{hp:7,pills:8},opponent:{hp:1,pills:1}}]) {
    let calls = 0;
    assert.throws(() => createMatch({mode:'activity',initialResources,rng:()=>{calls++;return .3;}}), /Activity starting/);
    assert.equal(calls, 0);
  }
  for (const mode of ['practice','arena','expedition']) {
    assert.throws(() => createMatch({mode,initialResources:{player:{hp:7,pills:8}}}), /Activity starting/);
    const match = createMatch({mode,rng:()=>.3});
    assert.deepEqual([match.player.hp,match.player.pills,match.opponent.hp,match.opponent.pills],[12,12,12,12]);
  }
});
