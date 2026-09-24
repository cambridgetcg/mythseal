import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { CAMPAIGN_WORLDS, CAMPAIGN_NODES, CAMPAIGN_LOANER_DECK, CAMPAIGN_TITLE } from '../campaign-content.mjs';
import { FIRE_MOUNTAIN } from '../activity-content.mjs';
import { STORY_NODES, WORLDS, getStoryNode, getWorldForNode, nextNodeInWorld } from '../stories.mjs';
import { NODES, createProfile, isNodeUnlocked } from '../progression.mjs';
import { getCard, validateDeck } from '../engine.mjs';
import { WX01_PRINTINGS, getPrinting } from '../printing-catalogue.mjs';

test('six authored volumes append 48 immutable encounters after the original eighteen', () => {
  assert.equal(STORY_NODES.length, 12);
  assert.equal(WORLDS.length, 10);
  assert.equal(CAMPAIGN_WORLDS.length, 6);
  assert.equal(CAMPAIGN_NODES.length, 48);
  assert.equal(NODES.length, 66);
  assert(NODES.slice(0, 18).every(node => !node.campaign));
  assert.deepEqual(NODES.slice(18), CAMPAIGN_NODES);
  assert.equal(new Set(NODES.map(node => node.id)).size, 66);
  for (const [index, world] of CAMPAIGN_WORLDS.entries()) {
    assert.equal(world.id, `westward-echo-${index + 1}`);
    assert(world.campaign);
    assert.equal(world.nodeIds.length, 8);
    assert(Object.isFrozen(world)); assert(Object.isFrozen(world.nodeIds));
    assert(existsSync(new URL(`../${world.map}`, import.meta.url)));
    assert.match(world.source, /原創/);
    world.nodeIds.forEach((id, order) => {
      const node = getStoryNode(id);
      assert.equal(node.order, order); assert.equal(node.worldId, world.id);
      assert.equal(node.volumeFinal, order === 7);
      assert.equal(node.encounterType, order === 7 ? 'finale' : order >= 5 ? 'tactical' : 'ordinary');
      assert.equal(getWorldForNode(id), world);
      assert(Object.isFrozen(node)); assert(Object.isFrozen(node.opponentDeck));
      for (const key of ['name', 'subtitle', 'description', 'enemyName', 'victory', 'defeat', 'tactic']) assert(node[key].length >= 4, `${id} ${key}`);
      for (const key of ['x', 'y']) assert(node[key] > 0 && node[key] < 100);
    });
  }
  for (const key of ['name', 'description', 'victory', 'defeat']) assert.equal(new Set(CAMPAIGN_NODES.map(node => node[key])).size, 48, `${key} must be individually authored`);
  assert.equal(CAMPAIGN_TITLE.name, '聽見萬聲');
});

test('every campaign deck is legal and distinct; loaners and all activity bosses meet the same public rules', () => {
  const rosters = [...CAMPAIGN_NODES.map(node => [node.id, node.opponentDeck]), ['campaign-loaner', CAMPAIGN_LOANER_DECK], ['activity-loaner', FIRE_MOUNTAIN.loanerDeck], ...FIRE_MOUNTAIN.stages.map(stage => [stage.id, stage.opponentDeck])];
  for (const [id, deck] of rosters) {
    const result = validateDeck(deck);
    assert.equal(deck.length, 8, id); assert.equal(new Set(deck).size, 8, id);
    assert.equal(result.valid, true, `${id}: ${result.errors}`); assert(result.stars <= 25, id);
    deck.forEach(cardId => assert(getCard(cardId), cardId));
  }
  assert.equal(new Set(CAMPAIGN_NODES.map(node => [...node.opponentDeck].sort().join(','))).size, 48);
  assert.deepEqual(CAMPAIGN_NODES.filter(node => node.loanerDeck).map(node => node.id), ['echo-1-7', 'echo-6-7']);
});

test('sequential prerequisites and next actions traverse all volumes without opening branches early', () => {
  const profile = createProfile({ now: '2026-09-22T12:00:00Z' });
  profile.cleared = NODES.slice(0, 18).map(node => node.id);
  assert.equal(nextNodeInWorld('west-spirit-mountain'), 'echo-1-1');
  for (const [index, node] of CAMPAIGN_NODES.entries()) {
    assert.equal(node.requiresNode, index ? CAMPAIGN_NODES[index - 1].id : 'west-spirit-mountain');
    assert.equal(isNodeUnlocked(profile, node.id), true, node.id);
    if (CAMPAIGN_NODES[index + 1]) assert.equal(isNodeUnlocked(profile, CAMPAIGN_NODES[index + 1].id), false);
    assert.equal(nextNodeInWorld(node.id), CAMPAIGN_NODES[index + 1]?.id || null);
    profile.cleared.push(node.id);
  }
  profile.cleared = ['mist-gate'];
  assert.equal(isNodeUnlocked(profile, 'echo-1-1'), false);
  assert.equal(nextNodeInWorld(WORLDS.find(world => world.id === 'investiture').nodeIds.at(-1)), null);
});

test('the fixed first-clear budget and eight BASE companions exactly match the set plan', () => {
  const expected = { 'echo-1-1': 'tangsanzang', 'echo-1-2': 'bailong', 'echo-1-4': 'bajie', 'echo-1-6': 'wujing', 'echo-2-8': 'zhenyuan', 'echo-3-8': 'baigu', 'echo-4-8': 'tieshan', 'echo-5-8': 'liuer' };
  assert.deepEqual(Object.fromEntries(CAMPAIGN_NODES.filter(node => node.rewardCharacter).map(node => [node.id, node.rewardCharacter])), expected);
  assert.equal(CAMPAIGN_NODES.filter(node => node.volumeFinal).length, 6);
  const totals = { coins: 0, dust: 0, xp: 0 };
  for (const node of CAMPAIGN_NODES) {
    assert.deepEqual(node.winReward, { coins: 60, dust: 3, xp: 30 });
    assert.deepEqual(node.firstClearReward, { coins: 90, dust: 5, xp: 40 });
    assert.deepEqual(node.dailyReward, { coins: 0, dust: 0, xp: 0 });
    for (const key of Object.keys(totals)) totals[key] += node.winReward[key] + node.firstClearReward[key];
    if (node.rewardCharacter) assert.equal(WX01_PRINTINGS.filter(print => print.cardId === node.rewardCharacter && print.treatment === 'base').length, 1);
  }
  assert.deepEqual(totals, { coins: 7200, dust: 384, xp: 3360 });
});

test('the activity has three distinct authored guardians and grants only each guardian’s existing BASE print', () => {
  assert.equal(FIRE_MOUNTAIN.id, 'fire-mountain'); assert.equal(FIRE_MOUNTAIN.version, 1);
  assert.equal(FIRE_MOUNTAIN.unlockNode, 'mist-gate');
  assert.deepEqual(FIRE_MOUNTAIN.stages.map(stage => stage.bossId), ['honghaier', 'tieshan', 'niumowang']);
  assert.equal(new Set(FIRE_MOUNTAIN.stages.map(stage => stage.id)).size, 3);
  assert(existsSync(new URL(`../${FIRE_MOUNTAIN.map}`, import.meta.url)));
  for (const stage of FIRE_MOUNTAIN.stages) {
    const print = getPrinting(stage.dropPrintId);
    assert.equal(print.cardId, stage.bossId); assert.equal(print.treatment, 'base');
    assert(stage.opponentDeck.includes(stage.bossId)); assert(stage.description.length > 20);
    assert(Object.isFrozen(stage)); assert(Object.isFrozen(stage.opponentDeck));
  }
});
