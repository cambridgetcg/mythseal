/** Explicit same-character inheritance. No storage, currency, RNG or new save fields. */
import { getInstance, getInstanceLevel, MAX_CARD_XP, syncCollection } from './collection.mjs';
import { getPrintForCard } from './printing-catalogue.mjs';

export const MAX_INHERITANCE_MATERIALS = 9;
const BASE_XP = 80;
const copy = value => structuredClone(value);
const frozenCopy = value => {
  const freeze = object => { if (object && typeof object === 'object') { Object.values(object).forEach(freeze); Object.freeze(object); } return object; };
  return freeze(copy(value));
};
const quoteKeys = ['targetUid', 'materialUids', 'beforeXP', 'afterXP', 'beforeLevel', 'afterLevel', 'offeredXP', 'gainedXP', 'overflowXP', 'fingerprint'];
const inBattle = (profile, uid) => Array.isArray(profile.pending?.instanceIds) && profile.pending.instanceIds.includes(uid);
const inReceipt = (profile, uid) => profile.wx01?.receipt?.cards?.some(card => card.instanceId === uid) === true;

// Full selected records, with stable object-key order. This is a local stale
// preview check, not a signature or an authoritative ownership claim.
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function indexInstances(profile) {
  const owned = new Map();
  for (const instance of profile.instances) {
    const record = owned.get(instance.uid);
    if (record) record.count++;
    else owned.set(instance.uid, { instance, count: 1 });
  }
  return { owned, vault: new Set((profile.merchantVault ?? []).map(entry => entry.instance.uid)) };
}
function checkedInstance(profile, uid, index = indexInstances(profile)) {
  const record = index.owned.get(uid);
  if (!record) throw new RangeError('背包中找不到這張卡牌實體。');
  const instance = record.instance;
  if (typeof instance.printId !== 'string' || record.count !== 1 || index.vault.has(uid)) throw new RangeError('卡牌身份或版本記錄無效，未有進行傳承。');
  getPrintForCard(instance.cardId, instance.printId);
  if (!Number.isSafeInteger(instance.xp) || instance.xp < 0 || instance.xp > MAX_CARD_XP
    || instance.level !== getInstanceLevel(instance.xp)) throw new RangeError('卡牌修為記錄無效，未有進行傳承。');
  return frozenCopy(instance);
}
function targetReason(profile, target) {
  if (inBattle(profile, target.uid)) return '此卡正在未完對局中，完成或放棄對局後才可接受傳承。';
  if (inReceipt(profile, target.uid)) return '請先確認開匣結果，再讓這張卡接受傳承。';
  if (target.xp >= MAX_CARD_XP) return '此卡已達 Lv.5，毋須再消耗同名卡。';
  return null;
}
export function getInheritanceTargetReason(profile, targetUid) {
  return targetReason(profile, checkedInstance(profile, targetUid));
}
function materialReason(profile, target, instance) {
  if (instance.uid === target.uid) return '接受傳承的卡牌不能同時作為素材。';
  if (instance.cardId !== target.cardId) return '只可選擇與目標同名的卡牌。';
  if (getPrintForCard(instance.cardId, instance.printId).treatment !== 'base') return '異畫、領契、墨卷與天工會保留；只可使用本畫作素材。';
  if (instance.locked) return '此卡已鎖定，解鎖後才可作為傳承素材。';
  if (inBattle(profile, instance.uid)) return '此卡正在未完對局中，完成或放棄對局後再選擇。';
  if (inReceipt(profile, instance.uid)) return '請先確認開匣結果，再選擇這張素材。';
  if (profile.wx01?.leaderInstanceId === instance.uid) return '此卡正在主頁展示，取消展示後才可作為素材。';
  if ((profile.deckSlots ?? []).some(slot => slot.instanceIds.includes(instance.uid))) return '此卡已加入儲存牌組，移出所有牌組後才可作為素材。';
  return null;
}

/** Include protected siblings so the UI can explain why each cannot be selected. */
export function getInheritanceMaterials(profile, targetUid) {
  const index = indexInstances(profile);
  const target = checkedInstance(profile, targetUid, index), blocked = targetReason(profile, target);
  return profile.instances.filter(instance => instance.cardId === target.cardId && instance.uid !== targetUid)
    .map(raw => {
      const instance = checkedInstance(profile, raw.uid, index);
      const reason = blocked || materialReason(profile, target, instance);
      return { instance, eligible: reason === null, reason, offeredXP: BASE_XP + instance.xp };
    });
}

export function previewInheritance(profile, targetUid, materialUids) {
  const index = indexInstances(profile);
  const target = checkedInstance(profile, targetUid, index), blocked = targetReason(profile, target);
  if (blocked) throw new RangeError(blocked);
  if (!Array.isArray(materialUids) || materialUids.length < 1) throw new RangeError('請親自選擇至少一張同名本畫素材。');
  if (materialUids.length > MAX_INHERITANCE_MATERIALS) throw new RangeError('所選素材超過所需；每次最多 9 張，請取消多餘的卡牌。');
  if (materialUids.some(uid => typeof uid !== 'string') || new Set(materialUids).size !== materialUids.length) throw new RangeError('素材編號無效或重複，請重新選擇。');
  const ids = [...materialUids].sort();
  const materials = ids.map(uid => {
    const instance = checkedInstance(profile, uid, index), reason = materialReason(profile, target, instance);
    if (reason) throw new RangeError(reason);
    return instance;
  });
  const offeredXP = materials.reduce((sum, instance) => sum + BASE_XP + instance.xp, 0);
  const remaining = MAX_CARD_XP - target.xp;
  if (materials.some(instance => offeredXP - (BASE_XP + instance.xp) >= remaining)) {
    throw new RangeError('部分素材完全毋須消耗：移除其中一張仍足以達到 Lv.5。請取消多餘素材，再確認傳承。');
  }
  const afterXP = Math.min(MAX_CARD_XP, target.xp + offeredXP), gainedXP = afterXP - target.xp;
  return {
    targetUid, materialUids: ids, beforeXP: target.xp, afterXP,
    beforeLevel: target.level, afterLevel: getInstanceLevel(afterXP),
    offeredXP, gainedXP, overflowXP: offeredXP - gainedXP,
    fingerprint: stable({ target, materials }),
  };
}

/** Recompute the exact quote against the latest profile before removing anything. */
export function inheritInstances(profile, quote) {
  if (!quote || typeof quote !== 'object' || Array.isArray(quote)
    || Object.keys(quote).length !== quoteKeys.length || Object.keys(quote).some(key => !quoteKeys.includes(key))) throw new RangeError('傳承預覽已失效，請重新選擇並確認。');
  const current = previewInheritance(profile, quote.targetUid, quote.materialUids);
  if (stable(current) !== stable(quote)) throw new RangeError('目標或素材剛有變動；未有消耗卡牌，請重新查看傳承預覽。');
  const materials = current.materialUids.map(uid => getInstance(profile, uid));
  const selected = new Set(current.materialUids), next = copy(profile);
  next.instances = next.instances.filter(instance => !selected.has(instance.uid));
  const target = next.instances.find(instance => instance.uid === current.targetUid);
  target.xp = current.afterXP; target.level = current.afterLevel;
  return { profile: syncCollection(next), ...current, materials, consumedCount: materials.length };
}
