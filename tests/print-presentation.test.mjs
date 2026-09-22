import test from 'node:test';
import assert from 'node:assert/strict';
import { getCard } from '../engine.mjs';
import { PRINTINGS, WX01_PRINTINGS } from '../printing-catalogue.mjs';
import { cardPresentation, cardArtStyle, printFrameMarkup, leaderInstance } from '../card-presentation.mjs';
import { backpackMarkup, instanceMarkup } from '../backpack-ui.mjs';
import { lobbyMarkup } from '../navigation-ui.mjs';
import { createProfile } from '../progression.mjs';
import { packReceiptMarkup, wx01MarketMarkup, wx01OddsMarkup, wx01RedeemMarkup } from '../pack-ui.mjs';

const cardMarkup = (card, options = {}) => `<div data-card-id="${card.id}" data-print-id="${options.printId || 'default'}" data-instance-id="${options.instanceId || ''}"></div>`;
const fresh = () => createProfile({ now: '2026-09-22T12:00:00Z' });

test('every legacy and WX-01 printing resolves its own atlas cell or full image without changing rules', () => {
  assert.equal(WX01_PRINTINGS.length, 29);
  for (const print of PRINTINGS) {
    const card = getCard(print.cardId), before = structuredClone(card);
    const result = cardPresentation(card, { printId: print.id });
    assert.equal(result.printId, print.id);
    assert.equal(result.treatment, print.treatment);
    assert(result.artStyle.includes(print.art.src));
    assert(result.label.includes(print.name));
    assert.deepEqual(card, before);
  }
  assert.match(cardArtStyle('wukong'), /background-position:33\.33333333333333% 0%;background-size:400% 300%/);
  assert.match(cardArtStyle('liuer'), /background-position:100% 100%;background-size:200% 200%/);
  assert.match(cardArtStyle('wukong', { printId: 'wx01-005-ink1' }), /background-size:cover/);
  assert.equal(cardPresentation('wukong').printId, 'legacy/wukong');
  assert.equal(cardPresentation('wukong', { printId: 'wx01-005-base' }).printId, 'wx01-005-base');
  assert.throws(() => cardPresentation('wukong', { printId: 'wx01-001-aa1' }), /不相符/);
  assert.throws(() => cardPresentation('wukong', { printId: 'unknown' }), /找不到/);
});

test('frames identify five treatments separately from the unchanged rarity and faction', () => {
  assert.equal(printFrameMarkup('wukong'), '');
  for (const id of ['wx01-005-aa1', 'wx01-005-laa1', 'wx01-005-ink1', 'wx01-005-tr1']) {
    const markup = printFrameMarkup('wukong', { printId: id });
    assert.match(markup, /class="print-treatment-mark"/);
    assert.match(markup, /aria-hidden="true"/);
    assert(!markup.includes('data-rarity'));
  }
});

test('bag, passport, saved decks, draft tray and lobby carry the exact owned printing', () => {
  const profile = fresh(), instance = profile.instances[1];
  instance.cardId = 'wukong'; instance.printId = 'wx01-005-ink1';
  const uid = instance.uid;
  const bag = backpackMarkup(profile, { tab: 'cards' }, cardMarkup);
  assert(bag.includes(`data-print-id="wx01-005-ink1" data-instance-id="${uid}"`));
  const passport = instanceMarkup(profile, uid, cardMarkup);
  assert(passport.includes('data-print-id="wx01-005-ink1"'));
  assert(passport.includes('墨卷 INK · 孫悟空 · 大鬧天宮'));
  const draft = backpackMarkup(profile, { tab: 'decks', draftInstanceIds: [uid] }, cardMarkup);
  assert.equal((draft.match(/class="bag-face" data-print-id="wx01-005-ink1"/g) || []).length, 2);
  const lobby = lobbyMarkup(profile, cardMarkup);
  assert(lobby.includes('class="lobby-card-portrait" aria-hidden="true" data-print-id="wx01-005-ink1"'));
  assert(lobby.includes(`data-print-id="wx01-005-ink1" data-instance-id="${uid}"`));
});

test('cosmetic leader requires an owned Leader Art UID and offers no battle mechanics', () => {
  const profile = fresh(), instance = profile.instances[1];
  instance.cardId = 'wukong'; instance.printId = 'wx01-005-laa1';
  profile.wx01 = { ...(profile.wx01 || {}), leaderInstanceId: instance.uid };
  assert.equal(leaderInstance(profile)?.uid, instance.uid);
  assert(lobbyMarkup(profile, cardMarkup).includes('class="lobby-leader"'));
  const passport = instanceMarkup(profile, instance.uid, cardMarkup);
  assert(passport.includes('data-action="set-leader" data-id=""'));
  assert(passport.includes('不改變任何對弈能力'));
  assert(!instanceMarkup(profile, instance.uid, cardMarkup, { readOnly: true }).includes('data-action="set-leader"'));
  instance.printId = 'wx01-005-aa1';
  assert.equal(leaderInstance(profile), null);
});

test('market and odds disclose conditional next-pack chance and redemption uses catalogue print identities', () => {
  const profile = fresh(); profile.wx01 = { ...profile.wx01, dry: 11, opened: 11, seals: 100, storyClaimed: false };
  assert(wx01MarketMarkup(profile, cardMarkup).includes('100%'));
  assert(wx01OddsMarkup(profile).includes('96.2%'));
  const choice = wx01RedeemMarkup(profile, cardMarkup, { treatment: 'leader' });
  assert.equal((choice.match(/data-action="redeem-print"/g) || []).length, 4);
  assert(choice.includes('data-id="wx01-005-laa1"'));
  assert(!choice.includes('data-id="wx01-005-tr1"'));
  const story = wx01RedeemMarkup(profile, cardMarkup, { story: true });
  assert.equal((story.match(/data-action="claim-story-print"/g) || []).length, 6);
  assert.equal((story.match(/data-action="claim-story-print"[^>]* disabled/g) || []).length, 6);
});

test('accepted receipt cards remain hidden and cannot be mistaken for a new grant', () => {
  const receipt = { id: 'wx01-1', kind: 'redeem', mode: 'ink', sealsEarned: 0, cards: [{ cardId: 'wukong', printId: 'wx01-005-ink1', instanceId: 'card-000050', rarity: 'epic' }] };
  const before = structuredClone(receipt), markup = packReceiptMarkup(receipt, cardMarkup);
  assert(markup.includes('data-receipt-id="wx01-1"'));
  assert(markup.includes('data-pack-face hidden'));
  assert(markup.includes('data-action="pack-ack" data-id="wx01-1" hidden'));
  assert(markup.includes('揭曉不會再次扣款'));
  assert.deepEqual(receipt, before);
});
