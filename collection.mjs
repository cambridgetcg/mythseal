/** Exact-copy collection rules. No currency, random draws, storage or network access. */
import { CARDS, ORIGINAL_CARD_IDS, defaultDeckIds, getCard, validateDeck } from './engine.mjs';
import { getPrintForCard, defaultPrintId } from './printing-catalogue.mjs';

export const COLLECTION_VERSION = 2;
export const MAX_COLLECTION_COPIES = 10_000;
export const MAX_DECK_SLOTS = 3;
export const MAX_CARD_XP = 700;
export const XP_THRESHOLDS = Object.freeze([0, 80, 200, 400, 700]);
const CARD_IDS = CARDS.map(card => card.id);
const MAX_COPIES = 99_999;
const MAX_COUNTER = 1_000_000_000;
const copy = value => structuredClone(value);
const frozenCopy = value => {
  const cloned = copy(value);
  const freeze = item => {
    if (item && typeof item === 'object') {
      Object.values(item).forEach(freeze);
      Object.freeze(item);
    }
    return item;
  };
  return freeze(cloned);
};
const bounded = (value, fallback = 0, maximum = MAX_COUNTER) => Number.isSafeInteger(value) ? Math.max(0, Math.min(maximum, value)) : fallback;
const uidFor = serial => `card-${String(serial).padStart(6, '0')}`;

function uidSerial(uid) {
  if (typeof uid !== 'string' || !/^card-\d{6,}$/.test(uid)) return null;
  const serial = Number(uid.slice(5));
  return Number.isSafeInteger(serial) && serial > 0 ? serial : null;
}

function validUID(uid) {
  const serial = uidSerial(uid);
  return serial !== null && uidFor(serial) === uid;
}

function nowISO(now = new Date()) {
  const date = new Date(now);
  if (!Number.isFinite(date.getTime())) throw new RangeError('取得日期無效。');
  return date.toISOString();
}

function savedDate(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : fallback;
}

function originLabel(value, fallback = 'unknown') {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 80) : fallback;
}

function cleanInstance(raw, acquiredAt, strictPrints) {
  if (!raw || typeof raw !== 'object' || !validUID(raw.uid) || !CARD_IDS.includes(raw.cardId)) {
    if (strictPrints) throw new RangeError('卡牌實體資料無效。');
    return null;
  }
  if (strictPrints && typeof raw.printId !== 'string') throw new RangeError('卡牌缺少版本記錄。');
  const printId = getPrintForCard(raw.cardId, raw.printId).id;
  const xp = bounded(raw.xp, 0, MAX_CARD_XP);
  const battles = bounded(raw.battles);
  return {
    uid: raw.uid, cardId: raw.cardId, printId, level: getInstanceLevel(xp), xp,
    locked: raw.locked === true, battles, wins: Math.min(battles, bounded(raw.wins)),
    acquiredAt: savedDate(raw.acquiredAt, acquiredAt), origin: originLabel(raw.origin),
  };
}

function maximumSerial(profile) {
  let serial = bounded(profile.instanceSerial, 0, Number.MAX_SAFE_INTEGER);
  const rawInstances = Array.isArray(profile.instances) ? profile.instances : [];
  const rawVault = Array.isArray(profile.merchantVault) ? profile.merchantVault : [];
  for (const raw of [...rawInstances, ...rawVault.map(entry => entry?.instance)]) {
    const candidate = uidSerial(raw?.uid);
    if (candidate !== null) serial = Math.max(serial, candidate);
  }
  return serial;
}

export function getXPThreshold(level) {
  if (!Number.isInteger(level) || level < 1 || level > XP_THRESHOLDS.length) throw new RangeError('修為等級須為 1 至 5。');
  return XP_THRESHOLDS[level - 1];
}

export function getInstanceLevel(xp) {
  if (!Number.isSafeInteger(xp) || xp < 0) throw new RangeError('卡牌經驗須為非負整數。');
  let level = 1;
  while (level < XP_THRESHOLDS.length && xp >= XP_THRESHOLDS[level]) level++;
  return level;
}

export function getXPProgress(instanceOrXP) {
  const raw = typeof instanceOrXP === 'number' ? instanceOrXP : instanceOrXP?.xp;
  const level = getInstanceLevel(raw), xp = Math.min(MAX_CARD_XP, raw);
  const maxed = level === XP_THRESHOLDS.length;
  const currentThreshold = getXPThreshold(level);
  const nextThreshold = maxed ? MAX_CARD_XP : getXPThreshold(level + 1);
  const progressXP = xp - currentThreshold;
  return {
    level, xp, currentThreshold, nextThreshold, progressXP,
    neededXP: maxed ? 0 : nextThreshold - xp,
    progress: maxed ? 1 : progressXP / (nextThreshold - currentThreshold), maxed,
  };
}

function ownedInstance(profile, uid) {
  const instance = profile.instances?.find(item => item.uid === uid);
  if (!instance) throw new RangeError('背包中找不到這張卡牌實體。');
  return instance;
}

export function getInstance(profile, uid) {
  return frozenCopy(ownedInstance(profile, uid));
}

export function getInstances(profile, cardId) {
  if (cardId !== undefined) getCard(cardId);
  return frozenCopy((profile.instances ?? []).filter(instance => cardId === undefined || instance.cardId === cardId));
}

function preferredInstance(profile, cardId) {
  return (profile.instances ?? []).filter(instance => instance.cardId === cardId)
    .sort((a, b) => b.xp - a.xp || uidSerial(a.uid) - uidSerial(b.uid))[0] ?? null;
}

export function getPreferredInstance(profile, cardId) {
  getCard(cardId);
  const preferred = preferredInstance(profile, cardId);
  return preferred ? frozenCopy(preferred) : null;
}

export function getActiveDeck(profile) {
  const deck = profile.deckSlots?.find(slot => slot.id === profile.activeDeckId);
  return deck ? frozenCopy(deck) : null;
}

export function validateInstanceDeck(profile, instanceIds) {
  const errors = [];
  if (!Array.isArray(instanceIds)) return { valid: false, errors: ['牌組必須是卡牌編號列表。'], stars: 0, cardIds: [], instanceIds: [] };
  if (instanceIds.length !== 8) errors.push('牌組必須正好有 8 張卡牌實體。');
  if (new Set(instanceIds).size !== instanceIds.length) errors.push('同一張卡牌實體不能重複入陣。');
  const owned = new Map((profile.instances ?? []).map(instance => [instance.uid, instance]));
  const cardIds = [];
  for (const uid of instanceIds) {
    const instance = owned.get(uid);
    if (!instance || !CARD_IDS.includes(instance.cardId)) errors.push('牌組只能使用背包內的卡牌實體。');
    else cardIds.push(instance.cardId);
  }
  const validation = validateDeck(cardIds);
  if (new Set(cardIds).size !== cardIds.length) errors.push('同一位角色不能以不同副本重複入陣。');
  if (validation.stars > 25) errors.push('牌組總星數不能超過 25。');
  return { valid: errors.length === 0 && validation.valid, errors: [...new Set(errors)], stars: validation.stars, cardIds, instanceIds: [...instanceIds] };
}

export function getDeckLevels(profile) {
  const deck = getActiveDeck(profile);
  if (!deck) return {};
  return Object.fromEntries(deck.instanceIds.map(uid => {
    const instance = ownedInstance(profile, uid);
    return [instance.cardId, getInstanceLevel(instance.xp)];
  }));
}

function normalizeDeckName(name, slotId) {
  return typeof name === 'string' && name.trim() ? name.trim().slice(0, 24) : `牌組 ${slotId.slice(-1)}`;
}

function repairDecks(profile, legacyDeck) {
  const slots = [], used = new Set();
  for (const raw of Array.isArray(profile.deckSlots) ? profile.deckSlots : []) {
    if (!raw || !/^deck-[1-3]$/.test(raw.id) || used.has(raw.id)) continue;
    if (!validateInstanceDeck(profile, raw.instanceIds).valid) continue;
    slots.push({ id: raw.id, name: normalizeDeckName(raw.name, raw.id), instanceIds: [...raw.instanceIds] });
    used.add(raw.id);
  }
  if (!slots.length) {
    const cardDecks = [legacyDeck, defaultDeckIds];
    const cheapest = CARDS.filter(card => preferredInstance(profile, card.id))
      .sort((a, b) => a.stars - b.stars || CARD_IDS.indexOf(a.id) - CARD_IDS.indexOf(b.id))
      .slice(0, 8).map(card => card.id);
    cardDecks.push(cheapest);
    for (const cardIds of cardDecks) {
      if (!validateDeck(cardIds).valid) continue;
      const instances = cardIds.map(id => preferredInstance(profile, id));
      if (instances.some(instance => !instance)) continue;
      slots.push({ id: 'deck-1', name: '山海初陣', instanceIds: instances.map(instance => instance.uid) });
      break;
    }
  }
  profile.deckSlots = slots;
  if (!slots.some(slot => slot.id === profile.activeDeckId)) profile.activeDeckId = slots[0]?.id ?? null;
  return profile;
}

/** Derive old role-level fields from canonical instances; never mint or repair possessions. */
export function syncCollection(profile) {
  const next = copy(profile);
  if (!Array.isArray(next.instances)) throw new TypeError('缺少卡牌實體列表。');
  const seen = new Set();
  for (const instance of [...next.instances, ...(next.merchantVault ?? []).map(entry => entry.instance)]) {
    if (!instance || !validUID(instance.uid) || !CARD_IDS.includes(instance.cardId)) throw new RangeError('卡牌實體資料無效。');
    if (typeof instance.printId !== 'string') throw new RangeError('卡牌缺少版本記錄。');
    getPrintForCard(instance.cardId, instance.printId);
    if (seen.has(instance.uid)) throw new RangeError('卡牌編號重複或同時存在背包與商人保管區。');
    seen.add(instance.uid);
    instance.xp = Math.min(MAX_CARD_XP, instance.xp);
    instance.level = getInstanceLevel(instance.xp);
  }
  next.collectionVersion = COLLECTION_VERSION;
  next.instanceSerial = maximumSerial(next);
  next.inventory = Object.fromEntries(CARD_IDS.map(id => [id, 0]));
  next.levels = Object.fromEntries(CARD_IDS.map(id => [id, 1]));
  for (const instance of next.instances) next.inventory[instance.cardId]++;
  for (const cardId of CARD_IDS) {
    const preferred = preferredInstance(next, cardId);
    if (preferred) next.levels[cardId] = preferred.level;
  }
  const active = getActiveDeck(next);
  if (active && !validateInstanceDeck(next, active.instanceIds).valid) throw new RangeError('出戰牌組含有無效或未擁有的卡牌。');
  next.deck = active ? active.instanceIds.map(uid => ownedInstance(next, uid).cardId) : [];
  Object.assign(next.levels, getDeckLevels(next));
  return next;
}

/** Canonical data wins over compatibility counts, including an intentionally empty backpack. */
export function hydrateCollection(profile = {}, { now = new Date(), allowLegacyPrints = !(profile.version >= 4) } = {}) {
  const next = copy(profile), acquiredAt = nowISO(now);
  const canonical = Object.hasOwn(profile, 'instances') || [1, COLLECTION_VERSION].includes(profile.collectionVersion);
  const serial = maximumSerial(profile);
  next.instanceSerial = serial;
  next.instances = [];
  next.merchantVault = [];
  const seen = new Set();
  if (canonical) {
    for (const raw of Array.isArray(profile.instances) ? profile.instances : []) {
      const instance = cleanInstance(raw, acquiredAt, !allowLegacyPrints);
      if (!instance || seen.has(instance.uid)) continue;
      next.instances.push(instance);
      seen.add(instance.uid);
    }
    for (const raw of Array.isArray(profile.merchantVault) ? profile.merchantVault : []) {
      const instance = cleanInstance(raw?.instance, acquiredAt, !allowLegacyPrints);
      if (!instance || seen.has(instance.uid)) continue;
      if (!Number.isSafeInteger(raw.sellPrice) || raw.sellPrice < 0 || raw.sellPrice > MAX_COUNTER
        || !Number.isSafeInteger(raw.buybackPrice) || raw.buybackPrice < raw.sellPrice || raw.buybackPrice > MAX_COUNTER) continue;
      next.merchantVault.push({ instance, sellPrice: raw.sellPrice, buybackPrice: raw.buybackPrice, soldAt: savedDate(raw.soldAt, acquiredAt) });
      seen.add(instance.uid);
    }
  } else {
    for (const cardId of CARD_IDS) {
      const minimum = ORIGINAL_CARD_IDS.includes(cardId) ? 1 : 0;
      const count = Math.max(minimum, bounded(profile.inventory?.[cardId], minimum, MAX_COPIES));
      const level = Math.max(1, bounded(profile.levels?.[cardId], 1, XP_THRESHOLDS.length));
      for (let index = 0; index < count; index++) {
        if (next.instanceSerial >= Number.MAX_SAFE_INTEGER) throw new RangeError('卡牌編號已達上限。');
        next.instanceSerial++;
        next.instances.push({
          uid: uidFor(next.instanceSerial), cardId, printId: defaultPrintId(cardId), level, xp: getXPThreshold(level), locked: false,
          battles: 0, wins: 0, acquiredAt, origin: 'migration',
        });
      }
    }
  }
  repairDecks(next, profile.deck);
  return syncCollection(next);
}

export const migrateCollection = hydrateCollection;
export const createCollection = hydrateCollection;

export function assertCollectionCapacity(profile, additional = 1) {
  if (!Number.isSafeInteger(additional) || additional < 0) throw new RangeError('新增卡牌數量無效。');
  if ((profile.instances?.length ?? 0) + (profile.merchantVault?.length ?? 0) + additional > MAX_COLLECTION_COPIES) {
    throw new RangeError('收藏與商旅保管處合計最多保留 10,000 張卡，未有扣除資源。');
  }
  if (!Number.isSafeInteger(profile.instanceSerial) || profile.instanceSerial + additional > Number.MAX_SAFE_INTEGER) throw new RangeError('卡牌編號已達上限。');
}

export function mintInstance(profile, cardId, { source = 'unknown', now = new Date(), printId = undefined } = {}) {
  getCard(cardId);
  const printing = getPrintForCard(cardId, printId);
  const next = syncCollection(profile);
  assertCollectionCapacity(next);
  if (next.inventory[cardId] >= MAX_COPIES) throw new RangeError('這位角色的卡牌數量已達上限。');
  if (next.instanceSerial >= Number.MAX_SAFE_INTEGER) throw new RangeError('卡牌編號已達上限。');
  const instance = {
    uid: uidFor(++next.instanceSerial), cardId, printId: printing.id, level: 1, xp: 0, locked: false, battles: 0, wins: 0,
    acquiredAt: nowISO(now), origin: originLabel(source),
  };
  next.instances.push(instance);
  return { profile: syncCollection(next), instance: frozenCopy(instance) };
}

export function isInstanceInJourney(profile, uid) {
  return (Array.isArray(profile.pending?.instanceIds) && profile.pending.instanceIds.includes(uid))
    || (Array.isArray(profile.expansion?.fireMountain?.run?.instanceIds) && profile.expansion.fireMountain.run.instanceIds.includes(uid));
}

/** Sale protection. A saved-deck or locked card may still train outside a pending battle. */
export function getInstanceProtection(profile, uid) {
  const instance = ownedInstance(profile, uid);
  if (isInstanceInJourney(profile, uid)) return '此卡正在未完對局或活動旅程中，完成或放棄旅程後再操作。';
  if (profile.wx01?.receipt?.cards.some(card => card.instanceId === uid)) return '請先確認西行開匣結果，再操作這張卡牌。';
  if (profile.wx01?.leaderInstanceId === uid) return '此卡正在主頁展示，取消展示後才可出售。';
  if (instance.locked) return '此卡已鎖定，解鎖後才可出售。';
  if ((profile.deckSlots ?? []).some(slot => slot.instanceIds.includes(uid))) return '此卡已加入儲存牌組，移出所有牌組後才可出售。';
  if (profile.instances.filter(item => item.cardId === instance.cardId).length <= 1) return '須保留這位角色的最後一張卡。';
  return null;
}

export function setInstanceXP(profile, uid, xp) {
  getInstanceLevel(xp);
  const instance = ownedInstance(profile, uid);
  if (isInstanceInJourney(profile, uid)) throw new RangeError('此卡正在未完對局或活動旅程中，完成或放棄旅程後才可修練。');
  const target = Math.min(MAX_CARD_XP, xp);
  if (target < instance.xp) throw new RangeError('不能降低已獲得的卡牌經驗。');
  const next = copy(profile), selected = ownedInstance(next, uid);
  selected.xp = target;
  selected.level = getInstanceLevel(target);
  return syncCollection(next);
}

export function awardInstanceXP(profile, uids, amount, { win = false } = {}) {
  if (!Array.isArray(uids) || new Set(uids).size !== uids.length) throw new RangeError('出戰卡牌編號不能重複。');
  if (!Number.isSafeInteger(amount) || amount < 0) throw new RangeError('獲得經驗須為非負整數。');
  if (typeof win !== 'boolean') throw new TypeError('勝負標記須為布林值。');
  uids.forEach(uid => ownedInstance(profile, uid));
  const next = copy(profile), changes = [];
  for (const uid of uids) {
    const instance = ownedInstance(next, uid), beforeXP = instance.xp, beforeLevel = getInstanceLevel(beforeXP);
    instance.xp = Math.min(MAX_CARD_XP, beforeXP + Math.min(MAX_CARD_XP, amount));
    instance.level = getInstanceLevel(instance.xp);
    instance.battles = Math.min(MAX_COUNTER, instance.battles + 1);
    if (win) instance.wins = Math.min(instance.battles, instance.wins + 1);
    changes.push({ uid, cardId: instance.cardId, beforeXP, afterXP: instance.xp, beforeLevel, afterLevel: instance.level, gainedXP: instance.xp - beforeXP });
  }
  return { profile: syncCollection(next), changes };
}

export function toggleInstanceLock(profile, uid) {
  ownedInstance(profile, uid);
  const next = copy(profile), instance = ownedInstance(next, uid);
  instance.locked = !instance.locked;
  return syncCollection(next);
}

export function saveInstanceDeck(profile, { slotId, name, instanceIds } = {}) {
  const validation = validateInstanceDeck(profile, instanceIds);
  if (!validation.valid) throw new RangeError(validation.errors.join(' '));
  const existing = profile.deckSlots ?? [];
  const id = slotId ?? ['deck-1', 'deck-2', 'deck-3'].find(candidate => !existing.some(slot => slot.id === candidate));
  if (!id || !/^deck-[1-3]$/.test(id)) throw new RangeError('最多可儲存 3 套牌組。');
  const old = existing.find(slot => slot.id === id);
  if (!old && existing.length >= MAX_DECK_SLOTS) throw new RangeError('最多可儲存 3 套牌組。');
  const next = copy(profile);
  const saved = { id, name: normalizeDeckName(name ?? old?.name, id), instanceIds: [...instanceIds] };
  next.deckSlots = old ? next.deckSlots.map(slot => slot.id === id ? saved : slot) : [...existing.map(copy), saved];
  if (!next.activeDeckId) next.activeDeckId = id;
  return syncCollection(next);
}

export function activateDeck(profile, slotId) {
  const deck = profile.deckSlots?.find(slot => slot.id === slotId);
  if (!deck || !validateInstanceDeck(profile, deck.instanceIds).valid) throw new RangeError('找不到可用的儲存牌組。');
  const next = copy(profile);
  next.activeDeckId = slotId;
  return syncCollection(next);
}

export function deleteDeck(profile, slotId = profile.activeDeckId) {
  if (!profile.deckSlots?.some(slot => slot.id === slotId)) throw new RangeError('找不到這套牌組。');
  if (profile.deckSlots.length <= 1) throw new RangeError('至少保留一套牌組。');
  const next = copy(profile);
  next.deckSlots = next.deckSlots.filter(slot => slot.id !== slotId);
  if (next.activeDeckId === slotId) next.activeDeckId = next.deckSlots[0].id;
  return syncCollection(next);
}
