import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile } from '../progression.mjs';
import { mintInstance, setInstanceXP } from '../collection.mjs';
import { backpackMarkup } from '../backpack-ui.mjs';

const now = '2026-09-22T12:00:00Z';
const cardMarkup = (card, options = {}) => {
  const tag = options.collection || options.selectable ? 'button' : 'div';
  return `<${tag} class="card" data-card-id="${card.id}" data-print-id="${options.printId}" data-instance-id="${options.instanceId}"${tag === 'button' ? ` data-action="${options.action}" data-id="${options.instanceId || card.id}"` : ''}></${tag}>`;
};
function fixture() {
  let profile = createProfile({ now });
  const ids = {};
  for (const [name, printId] of Object.entries({ base: 'wx01-005-base', aa: 'wx01-005-aa1', ink: 'wx01-005-ink1', treasure: 'wx01-005-tr1' })) {
    const mint = mintInstance(profile, 'wukong', { printId, now });
    profile = mint.profile; ids[name] = mint.instance.uid;
  }
  profile = setInstanceXP(profile, ids.aa, 400);
  profile.instances.find(instance => instance.uid === ids.aa).locked = true;
  profile.deckSlots[0].instanceIds[0] = ids.aa;
  return { profile, ids };
}
const group = (markup, id) => markup.match(new RegExp(`<article class="bag-character-group[^>]*data-card-id="${id}"[\\s\\S]*?</article>`))?.[0];

test('default shelf has one group per character and a cosmetic special cover, without copy actions', () => {
  const { profile, ids } = fixture(), before = structuredClone(profile);
  const markup = backpackMarkup(profile, {}, cardMarkup), wukong = group(markup, 'wukong');
  assert.equal((markup.match(/class="bag-character-group/g) || []).length, new Set(profile.instances.map(instance => instance.cardId)).size);
  assert(wukong.includes('data-owned-count="5" data-matching-count="5"'));
  assert(wukong.includes(`data-print-id="wx01-005-ink1" data-instance-id="${ids.ink}"`));
  assert(wukong.includes('Lv.1–4'));
  assert(wukong.includes('全藏：鎖定 1 · 編入牌組 1'));
  assert.equal((wukong.match(/class="bag-print-chip"/g) || []).length, 5);
  assert(wukong.includes('data-print-id="legacy/wukong" data-print-count="1"'));
  assert(wukong.includes('data-print-id="wx01-005-base" data-print-count="1"'));
  assert(!markup.includes('data-action="instance-inspect"'));
  assert(!markup.includes('data-action="instance-lock"'));
  assert(markup.includes('data-id="groups" aria-pressed="true"'));
  assert.deepEqual(profile, before);
});

test('locked and exact-UID searches group only matching rows but disclose all owned copies', () => {
  const { profile, ids } = fixture();
  const locked = group(backpackMarkup(profile, { filter: 'locked' }, cardMarkup), 'wukong');
  assert(locked.includes('data-owned-count="5" data-matching-count="1"'));
  assert(locked.includes(`data-print-id="wx01-005-aa1" data-instance-id="${ids.aa}"`));
  assert(locked.includes('1 / 5 張符合'));
  assert(locked.includes('符合篩選 0 張'));
  const query = backpackMarkup(profile, { query: ids.base }, cardMarkup);
  assert.equal((query.match(/class="bag-character-group/g) || []).length, 1);
  assert(group(query, 'wukong').includes(`data-print-id="wx01-005-base" data-instance-id="${ids.base}"`));
});

test('explicit copies layout preserves all exact passport and lock controls', () => {
  const { profile } = fixture(), markup = backpackMarkup(profile, { layout: 'copies' }, cardMarkup);
  assert(!markup.includes('class="bag-character-group'));
  assert.equal((markup.match(/data-action="instance-inspect"/g) || []).length, profile.instances.length);
  assert.equal((markup.match(/data-action="instance-lock"/g) || []).length, profile.instances.length);
  assert(markup.includes('data-id="copies" aria-pressed="true"'));
  for (const instance of profile.instances) assert(markup.includes(`data-action="instance-inspect" data-id="${instance.uid}"`));
});

test('expanded character shows every owned print and filters to exact selected print copies', () => {
  const { profile, ids } = fixture(), before = structuredClone(profile);
  const markup = backpackMarkup(profile, { expandedCardId: 'wukong', printId: 'wx01-005-aa1' }, cardMarkup);
  assert(markup.includes('class="bag-character-inventory" data-card-id="wukong"'));
  assert(markup.includes('data-action="bag-close-group"'));
  assert.equal((markup.match(/data-action="bag-print-filter"/g) || []).length, 6);
  assert(markup.includes('data-id="wx01-005-aa1" data-print-count="1" data-matching-count="1" aria-pressed="true"'));
  assert.equal((markup.match(/data-action="instance-inspect"/g) || []).length, 1);
  assert(markup.includes(`data-action="instance-inspect" data-id="${ids.aa}"`));
  assert(markup.includes('卡牌編號 ' + ids.aa));
  assert(markup.includes('踏碎凌霄'));
  assert.deepEqual(profile, before);
});

test('expanded filters disclose matching/owned printing counts and retain zero-match versions', () => {
  const { profile, ids } = fixture();
  const markup = backpackMarkup(profile, { expandedCardId: 'wukong', filter: 'locked', printId: 'all' }, cardMarkup);
  assert(markup.includes('data-id="all" data-print-count="5" data-matching-count="1" aria-pressed="true"'));
  assert(markup.includes('data-id="wx01-005-ink1" data-print-count="1" data-matching-count="0" aria-pressed="false" disabled'));
  assert(markup.includes('版本數量為符合／持有'));
  assert.equal((markup.match(/data-action="instance-inspect"/g) || []).length, 1);
  assert(markup.includes(`data-action="instance-inspect" data-id="${ids.aa}"`));
});

test('removed print and empty character groups remain navigable without inventing owned copies', () => {
  const { profile, ids } = fixture();
  profile.instances = profile.instances.filter(instance => instance.uid !== ids.aa);
  const removedPrint = backpackMarkup(profile, { expandedCardId: 'wukong', printId: 'wx01-005-aa1' }, cardMarkup);
  assert(removedPrint.includes('此頁暫無符合的卡牌'));
  assert(!removedPrint.includes('data-action="instance-inspect"'));
  assert(removedPrint.includes('查看全部版本'));
  profile.instances = profile.instances.filter(instance => instance.cardId !== 'wukong');
  const empty = backpackMarkup(profile, { expandedCardId: 'wukong', printId: 'all' }, cardMarkup);
  assert(empty.includes('這位同行者，暫未留在背包'));
  assert(empty.includes('data-action="bag-close-group"'));
  assert(!empty.includes('data-action="instance-inspect"'));
  assert(empty.includes('data-id="all" data-print-count="0" data-matching-count="0" aria-pressed="true"'));
});

test('deck editor ignores group expansion and print filters, retaining exact-copy picking', () => {
  const { profile } = fixture();
  const markup = backpackMarkup(profile, { tab: 'decks', layout: 'groups', expandedCardId: 'wukong', printId: 'wx01-005-ink1', draftInstanceIds: [] }, cardMarkup);
  assert(!markup.includes('class="bag-character-inventory"'));
  assert(!markup.includes('data-action="bag-open-group"'));
  assert.equal((markup.match(/data-action="bag-pick-instance"/g) || []).length, profile.instances.length);
  for (const instance of profile.instances) assert(markup.includes(`data-action="bag-pick-instance" data-id="${instance.uid}"`));
});
