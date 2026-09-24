import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, sellInstance } from '../progression.mjs';
import { mintInstance, setInstanceXP, getPreferredInstance, saveInstanceDeck } from '../collection.mjs';
import { getCard } from '../engine.mjs';
import { getFilteredInstances, getCardGroups, isCharacterCollected } from '../collection-display.mjs';

const now = '2026-09-22T12:00:00.000Z';
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const uids = instances => instances.map(instance => instance.uid);
const wukongGroup = (profile, view = {}) => getCardGroups(profile, view).find(group => group.cardId === 'wukong');
function fixture() {
  let profile = createProfile({ now });
  const ids = { legacy: getPreferredInstance(profile, 'wukong').uid };
  for (const [key, suffix] of [['base', 'base'], ['aa', 'aa1'], ['leader', 'laa1'], ['treasure', 'tr1'], ['ink', 'ink1'], ['ink2', 'ink1']]) {
    const minted = mintInstance(profile, 'wukong', { now, printId: `wx01-005-${suffix}` });
    profile = minted.profile; ids[key] = minted.instance.uid;
  }
  for (const [key, xp] of [['legacy', 700], ['base', 80], ['aa', 200], ['treasure', 400], ['ink2', 80]]) profile = setInstanceXP(profile, ids[key], xp);
  for (const key of ['legacy', 'aa']) profile.instances.find(instance => instance.uid === ids[key]).locked = true;
  const deck = profile.deckSlots[0].instanceIds.map((uid, index) => index === 3 ? ids.legacy : uid);
  profile = saveInstanceDeck(profile, { slotId: 'deck-2', instanceIds: deck });
  profile = saveInstanceDeck(profile, { slotId: 'deck-3', instanceIds: deck });
  return { profile, ids };
}

test('one character group retains every exact UID and separates legacy and WX01 printing counts', () => {
  const { profile, ids } = fixture(), group = wukongGroup(profile);
  assert.equal(group.card, getCard('wukong'));
  assert.equal(group.totalCount, 7); assert.equal(group.matchingCount, 7);
  assert.deepEqual(new Set(uids(group.instances)), new Set(Object.values(ids)));
  assert.equal(group.minLevel, 1); assert.equal(group.maxLevel, 5);
  assert.equal(group.lockedCount, 2); assert.equal(group.deckCount, 1);
  assert.deepEqual(group.prints, [
    { printId: 'wx01-005-ink1', count: 2, matchingCount: 2 },
    { printId: 'wx01-005-tr1', count: 1, matchingCount: 1 },
    { printId: 'wx01-005-laa1', count: 1, matchingCount: 1 },
    { printId: 'wx01-005-aa1', count: 1, matchingCount: 1 },
    { printId: 'legacy/wukong', count: 1, matchingCount: 1 },
    { printId: 'wx01-005-base', count: 1, matchingCount: 1 },
  ]);
  assert.equal(getCardGroups(profile).reduce((sum, value) => sum + value.matchingCount, 0), profile.instances.length);
});

test('cover is cosmetic: treatment priority, then XP, then latest numeric UID; gameplay preference stays unchanged', () => {
  const { profile, ids } = fixture(), original = structuredClone(profile);
  assert.equal(wukongGroup(profile).cover.uid, ids.ink2);
  assert.equal(getPreferredInstance(profile, 'wukong').uid, ids.legacy);
  const expected = [ids.ink2, ids.ink, ids.treasure, ids.leader, ids.aa, ids.legacy, ids.base];
  const display = structuredClone(profile);
  for (const uid of expected) {
    assert.equal(wukongGroup(display).cover.uid, uid);
    display.instances = display.instances.filter(instance => instance.uid !== uid);
  }
  assert.equal(wukongGroup(display), undefined);
  const tied = setInstanceXP(profile, ids.ink, 80);
  assert.equal(wukongGroup(tied).cover.uid, ids.ink2);
  assert.deepEqual(profile, original);
});

test('search matches UID, character name/title and printing label with whitespace and case normalization', () => {
  const { profile, ids } = fixture();
  assert.deepEqual(uids(getFilteredInstances(profile, { query: `  ${ids.aa.toUpperCase()}  ` })), [ids.aa]);
  assert.equal(getFilteredInstances(profile, { query: getCard('wukong').name }).length, 7);
  assert.equal(getFilteredInstances(profile, { query: getCard('wukong').title }).length, 7);
  assert.deepEqual(new Set(uids(getFilteredInstances(profile, { query: ' iNk ' }))), new Set([ids.ink, ids.ink2]));
  assert.deepEqual(uids(getFilteredInstances(profile, { query: '天工' })), [ids.treasure]);
  assert.deepEqual(uids(getFilteredInstances(profile, { query: '踏碎凌霄' })), [ids.aa]);
});

test('filters keep all-owned totals and printing metadata while cover and matches use only visible copies', () => {
  const { profile, ids } = fixture();
  const locked = wukongGroup(profile, { filter: 'locked' });
  assert.equal(locked.cover.uid, ids.aa); assert.equal(locked.matchingCount, 2); assert.equal(locked.totalCount, 7);
  assert.deepEqual(new Set(uids(locked.instances)), new Set([ids.legacy, ids.aa]));
  assert.equal(locked.prints.find(print => print.printId === 'wx01-005-ink1').count, 2);
  assert.equal(locked.prints.find(print => print.printId === 'wx01-005-ink1').matchingCount, 0);
  assert.equal(locked.prints.reduce((sum, print) => sum + print.matchingCount, 0), 2);
  const exact = wukongGroup(profile, { query: ids.base });
  assert.equal(exact.cover.uid, ids.base); assert.equal(exact.matchingCount, 1); assert.equal(exact.totalCount, 7);
  assert.equal(exact.minLevel, 1); assert.equal(exact.maxLevel, 5); assert.equal(exact.lockedCount, 2); assert.equal(exact.deckCount, 1);
  assert.equal(exact.prints.reduce((sum, print) => sum + print.matchingCount, 0), 1);
});

test('duplicates depend on all owned copies before query and faction filters, with empty intersections omitted', () => {
  const { profile, ids } = fixture();
  assert.equal(getFilteredInstances(profile, { filter: 'duplicates' }).length, 7);
  assert.deepEqual(uids(getFilteredInstances(profile, { filter: 'duplicates', query: ids.aa })), [ids.aa]);
  assert.equal(getCardGroups(profile, { filter: 'duplicates', faction: 'ember' }).length, 1);
  assert.deepEqual(getCardGroups(profile, { filter: 'duplicates', faction: 'yun' }), []);
  assert.deepEqual(getCardGroups(profile, { query: ids.ink, filter: 'locked' }), []);
  assert.deepEqual(getCardGroups(profile, { query: 'no-card-matches-this-query' }), []);
  assert.equal(getFilteredInstances(profile, { faction: 'yun' }).every(instance => getCard(instance.cardId).faction === 'yun'), true);
});

test('group ordering follows the filtered instance sort, not representative art or aggregate level', () => {
  let { profile } = fixture();
  profile = mintInstance(profile, 'tangsanzang', { now: '2026-09-23T12:00:00.000Z' }).profile;
  for (const sort of ['recent', 'level', 'name']) {
    const matches = getFilteredInstances(profile, { sort }), groups = getCardGroups(profile, { sort });
    assert.deepEqual(groups.map(group => group.cardId), [...new Set(matches.map(instance => instance.cardId))]);
    for (const group of groups) assert.deepEqual(uids(group.instances), uids(matches.filter(instance => instance.cardId === group.cardId)));
  }
  assert.equal(getCardGroups(profile, { sort: 'recent' })[0].cardId, 'tangsanzang');
  assert.equal(getCardGroups(profile, { sort: 'level' })[0].cardId, 'wukong');
});

test('legacy sort tie breaks remain numeric UID ascending for name/level, descending for recent', () => {
  const profile = createProfile({ now }), template = getPreferredInstance(profile, 'wukong');
  profile.instances = ['card-000002', 'card-000010', 'card-000009'].map(uid => ({ ...template, uid, acquiredAt: now }));
  const ascending = ['card-000002', 'card-000009', 'card-000010'];
  assert.deepEqual(uids(getFilteredInstances(profile, { sort: 'name' })), ascending);
  assert.deepEqual(uids(getFilteredInstances(profile, { sort: 'level' })), ascending);
  assert.deepEqual(uids(getFilteredInstances(profile)), [...ascending].reverse());
  assert.equal(wukongGroup(profile).cover.uid, 'card-000010');
  profile.instances[0].acquiredAt = '2026-09-23T12:00:00.000Z';
  assert.equal(getFilteredInstances(profile, { sort: 'level' })[0].uid, 'card-000002');
  assert.equal(getFilteredInstances(profile, { sort: 'recent' })[0].uid, 'card-000002');
  profile.instances[0].acquiredAt = 'not-a-date';
  assert.equal(getFilteredInstances(profile, { sort: 'recent' }).at(-1).uid, 'card-000002');
});

test('merchant vault contributes only to codex discovery, never owned groups or duplicate counts', () => {
  let profile = createProfile({ now });
  const uid = getPreferredInstance(profile, 'wukong').uid;
  assert.equal(isCharacterCollected(profile, 'wukong'), true);
  assert.equal(isCharacterCollected(profile, 'tangsanzang'), false);
  profile = mintInstance(profile, 'wukong', { now }).profile;
  profile = sellInstance(profile, uid, now);
  // The current shop protects the last owned copy; model a vault-only record
  // explicitly to verify the selector's requested discovery boundary.
  profile.instances = profile.instances.filter(instance => instance.cardId !== 'wukong');
  profile.inventory.wukong = 0;
  assert.equal(profile.inventory.wukong, 0);
  assert.equal(isCharacterCollected(profile, 'wukong'), true);
  assert.equal(wukongGroup(profile), undefined);
  assert.equal(getFilteredInstances(profile).some(instance => instance.uid === uid), false);
  const bought = mintInstance(profile, 'wukong', { now }).profile;
  assert.equal(wukongGroup(bought).totalCount, 1);
  assert.deepEqual(getCardGroups(bought, { filter: 'duplicates', query: '悟空' }), []);
  profile.merchantVault = [];
  profile.inventory.wukong = 99; // Derived/stale totals cannot invent an encounter.
  assert.equal(isCharacterCollected(profile, 'wukong'), false);
});

test('selectors accept frozen inputs and never change saves, exact-copy fields, decks or returned array ordering elsewhere', () => {
  const { profile } = fixture(), before = structuredClone(profile), view = freeze({ query: '悟空', sort: 'level' });
  freeze(profile);
  const matches = getFilteredInstances(profile, view), groups = getCardGroups(profile, view);
  assert.notEqual(matches, profile.instances);
  assert.equal(matches[0], profile.instances.find(instance => instance.uid === matches[0].uid));
  assert.equal(groups[0].cover, profile.instances.find(instance => instance.uid === groups[0].cover.uid));
  matches.reverse(); groups[0].instances.reverse(); groups[0].prints[0].count = 999;
  assert.equal(isCharacterCollected(profile, 'wukong'), true);
  assert.equal(wukongGroup(profile).prints[0].count, 2);
  assert.deepEqual(profile, before);
});

test('empty collections produce no groups and no retained discovery', () => {
  const profile = freeze({ instances: [], deckSlots: [], merchantVault: [] });
  assert.deepEqual(getFilteredInstances(profile), []); assert.deepEqual(getCardGroups(profile), []);
  assert.equal(isCharacterCollected(profile, 'wukong'), false);
});

test('a 10,000-copy collection preserves exact identities and accurate filtered/all-owned totals', () => {
  const profile = createProfile({ now }), template = getPreferredInstance(profile, 'wukong');
  profile.instances = Array.from({ length: 10000 }, (_, index) => ({ ...template, uid: `card-${String(index + 1).padStart(6, '0')}` }));
  profile.deckSlots = [];
  const all = wukongGroup(freeze(profile));
  assert.equal(all.totalCount, 10000); assert.equal(all.matchingCount, 10000);
  assert.equal(new Set(uids(all.instances)).size, 10000); assert.equal(all.cover.uid, 'card-010000');
  const exact = wukongGroup(profile, { query: 'card-005678', filter: 'duplicates' });
  assert.equal(exact.totalCount, 10000); assert.equal(exact.matchingCount, 1);
  assert.equal(exact.cover.uid, 'card-005678');
  assert.deepEqual(exact.prints, [{ printId: 'legacy/wukong', count: 10000, matchingCount: 1 }]);
});
