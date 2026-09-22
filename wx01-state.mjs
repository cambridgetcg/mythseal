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

export function createWX01State() {
  return { version: 1, dry: 0, seals: 0, opened: 0, redeemed: 0, storyClaimed: false, leaderInstanceId: null, receipt: null, serial: 0 };
}

/** Strict for the new profile: malformed counters/receipts must never become new entitlements. */
export function validateWX01State(raw, profile) {
  exact(raw, Object.keys(createWX01State()));
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
    exact(receipt, ['id', 'kind', 'mode', 'cards', 'openedAt', 'cost', 'sealsEarned']);
    if (!raw.serial || receipt.id !== `wx01-${raw.serial}` || !['pack', 'redeem', 'story'].includes(receipt.kind)
      || !modes.includes(receipt.mode) || !Array.isArray(receipt.cards)
      || typeof receipt.openedAt !== 'string') fail();
    const date = new Date(receipt.openedAt);
    if (!Number.isFinite(date.getTime()) || date.toISOString() !== receipt.openedAt) fail();
    const pack = receipt.kind === 'pack';
    if (receipt.cards.length !== (pack ? 3 : 1) || receipt.cost !== (pack ? 300 : 0) || receipt.sealsEarned !== (pack ? 1 : 0)) fail();
    if (pack ? raw.opened < 1 : receipt.kind === 'redeem' ? raw.redeemed < 1 : !raw.storyClaimed) fail();
    const seen = new Set(), treatments = [];
    for (const item of receipt.cards) {
      exact(item, ['cardId', 'printId', 'instanceId', 'rarity']);
      const instance = all.get(item.instanceId);
      const print = getPrintForCard(item.cardId, item.printId);
      if (print.setId !== 'wx01' || !instance || instance.cardId !== item.cardId || instance.printId !== item.printId
        || WX01_RARITIES[item.cardId] !== item.rarity || seen.has(item.instanceId)) fail();
      seen.add(item.instanceId);
      treatments.push(print.treatment);
    }
    if (pack) {
      if (!receipt.cards.some(item => item.rarity !== 'common')) fail();
      if (receipt.mode === 'ordinary' && treatments.some(treatment => treatment !== 'base')) fail();
      if (receipt.mode === 'god') {
        if (new Set(receipt.cards.map(item => item.cardId)).size !== 3 || treatments.join(',') !== 'aa,leader,ink') fail();
      } else if (receipt.mode !== 'ordinary'
        && treatments.join(',') !== `base,base,${receipt.mode}`) fail();
    } else if (receipt.mode !== treatments[0] || ['ordinary', 'god'].includes(receipt.mode)
      || receipt.kind === 'story' && receipt.mode !== 'aa') fail();
  }
  return structuredClone(raw);
}
