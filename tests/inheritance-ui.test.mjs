import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile } from '../progression.mjs';
import { mintInstance, setInstanceXP } from '../collection.mjs';
import { previewInheritance, inheritInstances } from '../inheritance.mjs';
import { inheritanceMarkup, inheritanceConfirmMarkup, inheritanceResultMarkup } from '../inheritance-ui.mjs';
import { instanceMarkup } from '../backpack-ui.mjs';

const now = '2026-09-22T12:00:00Z';
const cardMarkup = (card, options = {}) => `<div class="card" data-card-id="${card.id}" data-print-id="${options.printId}"></div>`;
function fixture(printId = 'wx01-005-tr1') {
  const target = mintInstance(createProfile({ now }), 'wukong', { printId, now });
  const donor = mintInstance(target.profile, 'wukong', { printId: 'wx01-005-base', now });
  return { profile: donor.profile, targetUid: target.instance.uid, donorUid: donor.instance.uid };
}
function button(markup, action, uid = null) {
  return markup.match(new RegExp(`<button[^>]*data-action="${action}"${uid ? `[^>]*data-id="${uid}"` : ''}[^>]*>`))?.[0];
}

test('selection starts empty and identifies each exact print, UID and EXP without mutating the profile', () => {
  let { profile, targetUid, donorUid } = fixture();
  profile = setInstanceXP(profile, donorUid, 90);
  const before = structuredClone(profile), markup = inheritanceMarkup(profile, targetUid, [], cardMarkup);
  assert(markup.includes(`data-target-uid="${targetUid}" data-print-id="wx01-005-tr1"`));
  assert(markup.includes(`data-uid="${donorUid}" data-eligible="true"`));
  assert(markup.includes('原有 90 EXP ＋ 傳承 80'));
  assert(markup.includes('＝ 170 EXP'));
  assert(!markup.includes('aria-pressed="true"'));
  assert(button(markup, 'inherit-review').includes(' disabled'));
  assert(markup.includes('天工 TR'));
  assert.deepEqual(profile, before);
});

test('a selected base copy produces real level and PvE previews but no removal', () => {
  const { profile, targetUid, donorUid } = fixture('wx01-005-aa1'), before = structuredClone(profile);
  const markup = inheritanceMarkup(profile, targetUid, [donorUid], cardMarkup);
  assert(button(markup, 'inherit-pick', donorUid).includes('aria-pressed="true"'));
  assert(!button(markup, 'inherit-review').includes(' disabled'));
  assert(markup.includes('data-inheritance-gained>＋80'));
  assert(markup.includes('Lv.1</span><span class="inheritance-arrow" aria-hidden="true">→</span><strong>Lv.2'));
  assert(markup.includes('等級加成只在遊歷生效'));
  assert.deepEqual(profile, before);
});

test('special, locked, saved-deck, pending and unacknowledged material copies stay visible and disabled', () => {
  for (const condition of ['aa', 'leader', 'ink', 'treasure', 'locked', 'deck', 'pending', 'receipt']) {
    let { profile, targetUid, donorUid } = fixture();
    const donor = profile.instances.find(instance => instance.uid === donorUid);
    const printIds = { aa: 'wx01-005-aa1', leader: 'wx01-005-laa1', ink: 'wx01-005-ink1', treasure: 'wx01-005-tr1' };
    if (printIds[condition]) donor.printId = printIds[condition];
    if (condition === 'locked') donor.locked = true;
    if (condition === 'deck') profile.deckSlots[0].instanceIds[0] = donorUid;
    if (condition === 'pending') profile.pending = { instanceIds: [donorUid] };
    if (condition === 'receipt') profile.wx01.receipt = { cards: [{ instanceId: donorUid }] };
    const markup = inheritanceMarkup(profile, targetUid, [], cardMarkup);
    assert(markup.includes(`data-uid="${donorUid}" data-eligible="false"`), condition);
    assert(button(markup, 'inherit-pick', donorUid).includes(' disabled'), condition);
    assert(markup.includes('class="inheritance-protection"'), condition);
  }
});

test('passport permits locked targets but blocks max, pending and receipt targets; read-only passports offer no action', () => {
  for (const condition of ['locked', 'max', 'pending', 'receipt']) {
    let { profile, targetUid } = fixture();
    if (condition === 'locked') profile.instances.find(instance => instance.uid === targetUid).locked = true;
    if (condition === 'max') profile = setInstanceXP(profile, targetUid, 700);
    if (condition === 'pending') profile.pending = { instanceIds: [targetUid] };
    if (condition === 'receipt') profile.wx01.receipt = { cards: [{ instanceId: targetUid }] };
    const markup = instanceMarkup(profile, targetUid, cardMarkup);
    assert.equal(button(markup, 'instance-inherit', targetUid).includes(' disabled'), condition !== 'locked', condition);
    assert(!instanceMarkup(profile, targetUid, cardMarkup, { readOnly: true }).includes('data-action="instance-inherit"'));
  }
});

test('confirmation names every removed UID and keeps back before destructive confirmation', () => {
  let { profile, targetUid, donorUid } = fixture();
  profile = setInstanceXP(profile, targetUid, 650);
  const before = structuredClone(profile), quote = previewInheritance(profile, targetUid, [donorUid]);
  const markup = inheritanceConfirmMarkup(profile, quote, cardMarkup);
  assert(markup.includes(`data-material-uid="${donorUid}"`));
  assert(markup.includes('以下 1 張素材將永久移除，無法取回'));
  assert(markup.includes('餘下 <b>30 EXP 不會保留'));
  assert(markup.includes('data-inheritance-gained>＋50'));
  assert(markup.includes('承接卡的畫作版本、編號與同行記錄保留'));
  assert(markup.indexOf('data-action="inherit-back"') < markup.indexOf('data-action="inherit-confirm"'));
  assert.deepEqual(profile, before);
});

test('redundant selection shows core rejection and cannot proceed to confirmation', () => {
  let { profile, targetUid, donorUid } = fixture();
  const extra = mintInstance(profile, 'wukong', { now });
  profile = setInstanceXP(extra.profile, targetUid, 650);
  const markup = inheritanceMarkup(profile, targetUid, [donorUid, extra.instance.uid], cardMarkup);
  assert(markup.includes('取消多餘素材'));
  assert(button(markup, 'inherit-review').includes(' disabled'));
  assert.equal((markup.match(/aria-pressed="true"/g) || []).length, 2);
});

test('accepted result retains the exact target printing and serial while reporting actual capped gain', () => {
  let { profile, targetUid, donorUid } = fixture();
  profile = setInstanceXP(profile, targetUid, 650);
  const result = inheritInstances(profile, previewInheritance(profile, targetUid, [donorUid]));
  const before = structuredClone(result.profile), markup = inheritanceResultMarkup(result.profile, result, cardMarkup);
  assert(markup.includes(`data-target-uid="${targetUid}" data-print-id="wx01-005-tr1"`));
  assert(markup.includes('＋50</strong>'));
  assert(markup.includes('餘下 30 EXP 未保留'));
  assert(markup.includes('所選素材已永久移除'));
  assert(button(markup, 'inherit-done'));
  assert(!markup.includes('data-action="inherit-confirm"'));
  assert.deepEqual(result.profile, before);
});
