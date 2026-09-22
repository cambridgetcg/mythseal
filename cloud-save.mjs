/** Account-private backups of editable offline play; never a trusted card ledger. */
import { hydrateProfile, refreshDaily, PROFILE_VERSION } from './progression.mjs';

export const SNAPSHOT_FORMAT = 'mythseal.offline-journey';
export const SNAPSHOT_VERSION = 1;
export const MAX_SNAPSHOT_BYTES = 512 * 1024;
export const MAX_SNAPSHOT_CARDS = 2000;
const MAX_NODES = 50_000;
const MAX_DEPTH = 12;
const MAX_STRING_LENGTH = 512;
const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);
const profileKeys = [
  'version', 'collectionExpansion', 'collectionVersion', 'coins', 'dust', 'xp',
  'instances', 'instanceSerial', 'deckSlots', 'activeDeckId', 'merchantVault',
  'inventory', 'levels', 'deck', 'stats', 'cleared', 'location', 'daily',
  'arena', 'pending', 'serial',
];
const instanceKeys = ['uid', 'cardId', 'level', 'xp', 'locked', 'battles', 'wins', 'acquiredAt', 'origin'];
const fail = (message = '旅程備份格式不完整，未有更改本機進度。') => { throw new Error(message); };
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function exactKeys(value, expected) {
  if (!isRecord(value)) fail();
  const keys = Object.keys(value);
  if (keys.length !== expected.length || keys.some(key => !expected.includes(key))) fail();
}

/** Inspect before stringify/clone: no accessors, cycles, exotic objects or deep JSON. */
function boundedJSON(value) {
  let nodes = 0;
  let jsonbSpaces = 0;
  const ancestors = new Set();
  const validateString = text => {
    if (text.length > MAX_STRING_LENGTH) fail('旅程備份文字過長。');
    // PostgreSQL JSONB cannot represent NUL or unpaired UTF-16 surrogates.
    for (let index = 0; index < text.length; index++) {
      const unit = text.charCodeAt(index);
      if (unit === 0 || (unit >= 0xdc00 && unit <= 0xdfff)) fail('旅程備份含有無法儲存的文字。');
      if (unit >= 0xd800 && unit <= 0xdbff) {
        const next = text.charCodeAt(++index);
        if (!(next >= 0xdc00 && next <= 0xdfff)) fail('旅程備份含有無法儲存的文字。');
      }
    }
  };
  const visit = (item, depth) => {
    if (++nodes > MAX_NODES || depth > MAX_DEPTH) fail('旅程備份太複雜，未有更改本機進度。');
    if (item === null || typeof item === 'boolean') return;
    if (typeof item === 'string') {
      validateString(item);
      return;
    }
    if (typeof item === 'number') {
      if (!Number.isSafeInteger(item) || Object.is(item, -0)) fail();
      return;
    }
    if (typeof item !== 'object' || ancestors.has(item)) fail();
    const array = Array.isArray(item), prototype = Object.getPrototypeOf(item);
    if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) fail();
    const keys = Reflect.ownKeys(item);
    if (array && (item.length > MAX_NODES || keys.length !== item.length + 1)) fail();
    // JSONB::text puts a space after every object colon and container comma.
    // Counting separators avoids stripping legitimate spaces inside strings.
    jsonbSpaces += array ? Math.max(0, item.length - 1) : keys.length + Math.max(0, keys.length - 1);
    ancestors.add(item);
    for (const key of keys) {
      if (array && key === 'length') continue;
      if (typeof key !== 'string' || forbiddenKeys.has(key) || key.length > MAX_STRING_LENGTH) fail();
      validateString(key);
      if (array && !/^(0|[1-9]\d*)$/.test(key)) fail();
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) fail();
      visit(descriptor.value, depth + 1);
    }
    ancestors.delete(item);
  };
  visit(value, 0);
  const json = JSON.stringify(value);
  if (new TextEncoder().encode(json).byteLength + jsonbSpaces > MAX_SNAPSHOT_BYTES) fail('旅程備份超過 512 KiB 儲存上限，請先保留本機匯出備份。');
  return json;
}

function stableJSON(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJSON).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJSON(value[key])}`).join(',')}}`;
}

function validDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateProfile(profile) {
  const hasWeekly = isRecord(profile) && Object.hasOwn(profile, 'weekly');
  exactKeys(profile, hasWeekly ? [...profileKeys, 'weekly'] : profileKeys);
  if (profile.version !== PROFILE_VERSION || profile.collectionVersion !== 1 || profile.collectionExpansion !== 1) {
    fail('呢個旅程備份版本暫未支援，未有更改本機進度。');
  }
  if (profile.pending !== null) fail('請先完成或放棄未完對局，再儲存雲端旅程。');
  if (!Array.isArray(profile.instances) || !Array.isArray(profile.merchantVault)
    || !Array.isArray(profile.deckSlots) || profile.deckSlots.length > 3) fail();
  if (profile.instances.length + profile.merchantVault.length > MAX_SNAPSHOT_CARDS) {
    fail('雲端旅程暫時最多保留 2,000 張卡牌，商旅保管區亦計算在內。');
  }
  const uids = new Set();
  const instance = item => {
    exactKeys(item, instanceKeys);
    if (typeof item.uid !== 'string' || !/^card-\d{6,}$/.test(item.uid)) fail('旅程備份有無效卡牌編號。');
    if (uids.has(item.uid)) fail('旅程備份有重複卡牌編號，未有更改本機進度。');
    uids.add(item.uid);
  };
  profile.instances.forEach(instance);
  for (const entry of profile.merchantVault) {
    exactKeys(entry, ['instance', 'sellPrice', 'buybackPrice', 'soldAt']);
    instance(entry.instance);
  }
  for (const slot of profile.deckSlots) exactKeys(slot, ['id', 'name', 'instanceIds']);
  exactKeys(profile.stats, ['played', 'won']);
  exactKeys(profile.arena, ['points', 'played', 'won']);
  exactKeys(profile.daily, [
    'date', 'loginClaimed', 'matches', 'expeditionWins', 'packs', 'arenaMatches',
    'claimedTasks', 'arenaChestClaimed', 'trainingUsed', 'marketPurchases', 'expeditionCaches',
  ]);
  if (!validDay(profile.daily.date)) fail('旅程備份日期無效。');
  if (hasWeekly) {
    exactKeys(profile.weekly, ['week', 'matches', 'expeditionWins', 'arenaMatches', 'claimedTasks']);
    if (!validDay(profile.weekly.week) || new Date(`${profile.weekly.week}T12:00:00Z`).getUTCDay() !== 1) fail('旅程備份日期無效。');
  }

  // Compare at the saved day, so this checks canonical data without a day rollover.
  // Any repair (missing cards, bad decks, counters, XP, dates or unknown fields)
  // is rejected; the local hydrator must never silently replace a cloud journey.
  let canonical;
  try { canonical = hydrateProfile(profile, { now: `${profile.daily.date}T12:00:00.000Z` }); }
  catch { fail(); }
  // Old v3 backups remain byte-for-byte payload compatible on validation.
  // Only restoration upgrades their missing weekly counters, starting at zero.
  if (!hasWeekly) delete canonical.weekly;
  if (stableJSON(canonical) !== stableJSON(profile)) fail('旅程備份資料不一致，未有更改本機進度。');
}

export function createSnapshot(profile) {
  return validateSnapshot({ format: SNAPSHOT_FORMAT, version: SNAPSHOT_VERSION, profile });
}

/** Return detached validated data. Unknown formats/versions never start a new game. */
export function validateSnapshot(snapshot) {
  const json = boundedJSON(snapshot);
  exactKeys(snapshot, ['format', 'version', 'profile']);
  if (snapshot.format !== SNAPSHOT_FORMAT || snapshot.version !== SNAPSHOT_VERSION) {
    fail('呢個旅程備份版本暫未支援，未有更改本機進度。');
  }
  validateProfile(snapshot.profile);
  return JSON.parse(json);
}

export function restoreSnapshot(snapshot, { now = new Date() } = {}) {
  const { profile } = validateSnapshot(snapshot);
  return refreshDaily(hydrateProfile(profile, { now }), now);
}

export function snapshotSummary(snapshot) {
  const { profile } = validateSnapshot(snapshot);
  return {
    cards: profile.instances.length, coins: profile.coins, dust: profile.dust,
    xp: profile.xp, decks: profile.deckSlots.length,
    played: profile.stats.played, won: profile.stats.won,
  };
}

/** Change detection only, not a cryptographic authenticity/ownership claim. */
export function fingerprintProfile(profile) {
  return stableJSON(JSON.parse(boundedJSON(profile)));
}
