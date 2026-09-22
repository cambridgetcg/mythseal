import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, startActivity, finishBattle, beginBattle, NODES } from '../progression.mjs';
import { activityMarkup, activitySupplyMarkup, expansionRewardsMarkup, ticketMarkup, campaignMarksMarkup } from '../expansion-ui.mjs';
import { arenaMarkup, worldMarkup, marketMarkup } from '../adventure-ui.mjs';
import { FIRE_MOUNTAIN } from '../activity-content.mjs';
import { CAMPAIGN_NODES } from '../campaign-content.mjs';

const now = '2026-09-22T12:00:00Z';
const cardMarkup = (card, options = {}) => `<div class="card" data-card-id="${card.id}" data-print-id="${options.printId || 'default'}"></div>`;
const ready = () => { const profile = createProfile({ now }); profile.cleared = NODES.filter(node => !node.campaign).map(node => node.id); return profile; };
const settle = (profile, hp = 3, pills = 0) => finishBattle(profile, { encounterId: profile.pending.id, winner: 'player', playedCardIds: [], finalResources: { hp, pills }, now }).profile;

test('activity preparation exposes exact owned prints and an explicit borrowed route without mutating the profile', () => {
  const profile = ready(), before = structuredClone(profile);
  const owned = activityMarkup(profile, { cardMarkup, preparation: true });
  assert.match(owned, /data-viewport-module="preparation"[^>]*data-viewport-default="true"/);
  for (const uid of profile.deckSlots[0].instanceIds) {
    const instance = profile.instances.find(copy => copy.uid === uid);
    assert(owned.includes(`data-viewport-id="${uid}"`));
    assert(owned.includes(`data-print-id="${instance.printId}"`));
  }
  assert.match(owned, /data-action="activity-start" data-id="owned" >/);
  const loaner = activityMarkup(profile, { route: 'loaner', cardMarkup });
  assert.match(loaner, /data-action="activity-start" data-id="loaner" >/);
  for (const id of FIRE_MOUNTAIN.loanerDeck) assert(loaner.includes(`data-card-id="${id}"`));
  assert.match(loaner, /不會入藏或累積卡牌 EXP/);
  assert.deepEqual(profile, before);
});

test('locked and active-run preparations cannot silently start or replace a roster', () => {
  const locked = activityMarkup(createProfile({ now }), { route: 'loaner', cardMarkup });
  assert.match(locked, /data-action="activity-start" data-id="loaner" disabled/);
  const active = startActivity(ready(), { route: 'loaner', rng: () => .3, now }).profile;
  const markup = activityMarkup(active, { route: 'owned', cardMarkup });
  assert.match(markup, /data-action="activity-route" data-id="loaner" aria-pressed="true" disabled/);
  assert.match(markup, /data-action="activity-start" data-id="loaner" disabled/);
  assert.match(markup, /data-action="activity-resume"/);
});

test('supply previews use recovered public resources and carry the exact stale-action identity', () => {
  const profile = settle(startActivity(ready(), { route: 'loaner', rng: () => .3, now }).profile);
  const before = structuredClone(profile), run = profile.expansion.fireMountain.run;
  const markup = activitySupplyMarkup(profile);
  assert.equal(run.hp, 5); assert.equal(run.pills, 8);
  assert.match(markup, /生命 5 → 9 \/ 12/); assert.match(markup, /仙丹 8 → 12 \/ 12/);
  for (const option of ['life', 'pills']) assert(markup.includes(`data-action="activity-supply" data-id="${option}" data-run="${run.id}" data-stage="0"`));
  assert(!markup.includes('data-id="none"'));
  assert.match(markup, /data-viewport-module="supply"/); assert.match(markup, /data-viewport-module="journal"/);
  assert.match(markup, /data-action="activity-save-exit"/); assert.match(markup, /data-action="activity-abandon"/);
  assert.deepEqual(profile, before);
  const full = settle(startActivity(ready(), { route: 'loaner', rng: () => .3, now }).profile, 12, 12);
  const fullMarkup = activitySupplyMarkup(full);
  assert.match(fullMarkup, /data-action="activity-supply" data-id="none"/);
  assert(!fullMarkup.includes('data-id="life"')); assert(!fullMarkup.includes('data-id="pills"'));
  const partial = settle(startActivity(ready(), { route: 'loaner', rng: () => .3, now }).profile, 12, 5);
  assert.match(activitySupplyMarkup(partial), /data-id="life"[^>]*disabled/);
});

test('the shelf preserves claim identities and keeps tickets reachable without an automatic claim or roll', () => {
  let profile = ready();
  profile = settle(beginBattle(profile, { kind: 'expedition', nodeId: 'echo-1-1', rng: () => .3, now }).profile, 7, 3);
  profile.expansion.tickets = 2;
  const before = structuredClone(profile), grant = profile.expansion.grants[0];
  const markup = expansionRewardsMarkup(profile, cardMarkup);
  assert(markup.includes(`data-action="expansion-claim" data-id="${grant.id}"`));
  assert(markup.includes(`data-print-id="${grant.printId}"`));
  assert.match(markup, /data-viewport-module="tickets"/); assert.match(markup, /data-action="ticket-open" >/);
  assert.match(markup, /2 張秘匣券/); assert.match(markup, /取得券不會抽卡/);
  assert.equal((markup.match(/class="campaign-mastery-row"/g) || []).length, 48);
  assert.deepEqual(profile, before);
  const marks = campaignMarksMarkup(profile, 'echo-1-1');
  assert.equal((marks.match(/class="is-earned"/g) || []).length, 3);
  assert.match(ticketMarkup(createProfile({ now })), /data-action="ticket-open" disabled/);
});

test('the navigable world, arena and market expose all new actions while retaining original story rewards', () => {
  const profile = ready(), before = structuredClone(profile);
  const world = worldMarkup(profile, CAMPAIGN_NODES[0].id);
  assert.equal((world.match(/data-action="world-select"/g) || []).length, 10);
  assert.match(world, /data-viewport-list="world-volumes"/);
  assert.match(world, /data-viewport-module="notes"/);
  assert(!world.includes('今日秘藏'));
  assert.match(worldMarkup(profile, 'echo-1-7'), /data-action="travel-loaner" data-id="echo-1-7" disabled/);
  assert.match(worldMarkup(profile, 'west-spirit-mountain'), /今日秘藏/);
  assert.match(arenaMarkup(profile), /data-action="activity-open"/);
  assert.match(marketMarkup(profile, cardMarkup), /data-viewport-module="tickets"/);
  assert.deepEqual(profile, before);
});
