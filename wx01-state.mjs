/** Saved WX-01 receipt validation. No storage access or grant authority. */
import { getPrintForCard, WX01_RARITIES } from './printing-catalogue.mjs';

const LIMIT = 1_000_000_000;
const modes = ['ordinary', 'aa', 'leader', 'ink', 'treasure', 'god'];
const fail = () => { throw new RangeError('西行收藏記錄不完整，未有更改存檔。'); };
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value, keys) => {
  if (!record(value) || Object.keys(value).length !== keys.length || Object.keys(value).some(key => !keys.includes(key))) fail();
};
const counter = value => Number.isSafeInteger(value) && value >= 0 && value <= LIMIT;
const cardKeys = ['cardId', 'printId', 'instanceId', 'rarity'];

function validatePack(mode, cards) {
  if (!modes.includes(mode) || !Array.isArray(cards) || cards.length !== 3
    || !cards.some(item => item.rarity !== 'common')) fail();
  const treatments = cards.map(item => getPrintForCard(item.cardId, item.printId).treatment);
  if (mode === 'ordinary') {
    if (treatments.some(treatment => treatment !== 'base')) fail();
  } else if (mode === 'god') {
    if (new Set(cards.map(item => item.cardId)).size !== 3 || treatments.join(',') !== 'aa,leader,ink') fail();
  } else if (treatments.join(',') !== `base,base,${mode}`) fail();
}

export function createWX01State() {
  return { version: 1, dry: 0, seals: 0, opened: 0, redeemed: 0, storyClaimed: false, leaderInstanceId: null, receipt: null, serial: 0 };
}

/** Strict for the new profile: malformed counters/receipts must never become new entitlements. */
export function validateWX01State(raw, profile) {
  const hasGift = record(raw) && Object.hasOwn(raw, 'playtestGift');
  exact(raw, [...Object.keys(createWX01State()), ...(hasGift ? ['playtestGift'] : [])]);
  if (hasGift && raw.playtestGift !== 'wx01-box-20260922') fail();
  if (raw.version !== 1 || !['dry', 'seals', 'opened', 'redeemed', 'serial'].every(key => counter(raw[key]))
    || raw.dry > 11 || raw.dry > raw.opened || typeof raw.storyClaimed !== 'boolean') fail();
  const owned = new Map((profile.instances ?? []).map(instance => [instance.uid, instance]));
  const all = new Map([...owned, ...(profile.merchantVault ?? []).map(entry => [entry.instance.uid, entry.instance])]);
  if (raw.leaderInstanceId !== null) {
    const instance = owned.get(raw.leaderInstanceId);
    if (!instance || getPrintForCard(instance.cardId, instance.printId).treatment !== 'leader') fail();
  }
  if (raw.receipt !== null) {
    const receipt = raw.receipt;
    const box = receipt?.kind === 'box';
    exact(receipt, ['id', 'kind', 'mode', 'cards', 'openedAt', 'cost', 'sealsEarned', ...(box ? ['packs'] : [])]);
    if (!raw.serial || receipt.id !== `wx01-${raw.serial}` || !['pack', 'box', 'redeem', 'story'].includes(receipt.kind)
      || !(box ? receipt.mode === 'box' : modes.includes(receipt.mode)) || !Array.isArray(receipt.cards)
      || typeof receipt.openedAt !== 'string') fail();
    const date = new Date(receipt.openedAt);
    if (!Number.isFinite(date.getTime()) || date.toISOString() !== receipt.openedAt) fail();
    const pack = receipt.kind === 'pack';
    if (box && (!Array.isArray(receipt.packs) || ![12, 24].includes(receipt.packs.length))) fail();
    const packCount = box ? receipt.packs.length : pack ? 1 : 0;
    if (receipt.cards.length !== (packCount ? packCount * 3 : 1) || receipt.cost !== packCount * 300 || receipt.sealsEarned !== packCount) fail();
    if (packCount ? raw.opened < packCount : receipt.kind === 'redeem' ? raw.redeemed < 1 : !raw.storyClaimed) fail();
    const seen = new Set(), treatments = [];
    for (const item of receipt.cards) {
      exact(item, cardKeys);
      const instance = all.get(item.instanceId);
      const print = getPrintForCard(item.cardId, item.printId);
      if (print.setId !== 'wx01' || !instance || instance.cardId !== item.cardId || instance.printId !== item.printId
        || WX01_RARITIES[item.cardId] !== item.rarity || seen.has(item.instanceId)) fail();
      seen.add(item.instanceId);
      treatments.push(print.treatment);
    }
    if (box) {
      for (const [index, subpack] of receipt.packs.entries()) {
        exact(subpack, ['mode', 'cards']);
        if (!Array.isArray(subpack.cards) || subpack.cards.length !== 3) fail();
        for (const [slot, item] of subpack.cards.entries()) {
          exact(item, cardKeys);
          if (cardKeys.some(key => item[key] !== receipt.cards[index * 3 + slot][key])) fail();
        }
        validatePack(subpack.mode, subpack.cards);
      }
    } else if (pack) validatePack(receipt.mode, receipt.cards);
    else if (receipt.mode !== treatments[0] || ['ordinary', 'god'].includes(receipt.mode)
      || receipt.kind === 'story' && receipt.mode !== 'aa') fail();
  }
  return structuredClone(raw);
}
