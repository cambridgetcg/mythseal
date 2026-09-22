/** Account-private backups of editable offline play; never a trusted card ledger. */
import { hydrateProfile, refreshDaily, CARD_RARITIES } from './progression.mjs';
import { LEGACY_CARD_IDS } from './engine.mjs';
import { getPrintForCard } from './printing-catalogue.mjs';

export const SNAPSHOT_FORMAT = 'mythseal.offline-journey';
export const SNAPSHOT_VERSION = 2;
export const MAX_SNAPSHOT_BYTES = 4 * 1024 * 1024;
export const MAX_SNAPSHOT_CARDS = 10_000;
export const LEGACY_MAX_SNAPSHOT_BYTES = 512 * 1024;
export const LEGACY_MAX_SNAPSHOT_CARDS = 2000;
const MAX_NODES = 500_000;
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
function boundedJSON(value, maximum = MAX_SNAPSHOT_BYTES) {
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
  if (new TextEncoder().encode(json).byteLength + jsonbSpaces > maximum) fail(`旅程備份超過 ${maximum === LEGACY_MAX_SNAPSHOT_BYTES ? '512 KiB' : '4 MiB'} 儲存上限，請先保留本機匯出備份。`);
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

function validateWX01(profile) {
  const state = profile.wx01;
  exactKeys(state, ['version', 'dry', 'seals', 'opened', 'redeemed', 'storyClaimed', 'leaderInstanceId', 'receipt', 'serial']);
  if (state.version !== 1 || typeof state.storyClaimed !== 'boolean') fail();
  for (const key of ['dry', 'seals', 'opened', 'redeemed', 'serial']) if (!Number.isSafeInteger(state[key]) || state[key] < 0 || state[key] > 1_000_000_000) fail();
  if (state.dry > 11 || state.dry > state.opened) fail();
  if (state.leaderInstanceId !== null) {
    const leader = profile.instances.find(card => card.uid === state.leaderInstanceId);
    if (!leader || getPrintForCard(leader.cardId, leader.printId).treatment !== 'leader') fail();
  }
  const receipt = state.receipt;
  if (receipt === null) return;
  exactKeys(receipt, ['id', 'kind', 'mode', 'cards', 'openedAt', 'cost', 'sealsEarned']);
  if (receipt.id !== `wx01-${state.serial}` || state.serial < 1
      || !['pack', 'redeem', 'story'].includes(receipt.kind) || !['ordinary', 'aa', 'leader', 'ink', 'treasure', 'god'].includes(receipt.mode)
      || typeof receipt.openedAt !== 'string' || !Number.isFinite(Date.parse(receipt.openedAt))
      || new Date(receipt.openedAt).toISOString() !== receipt.openedAt) fail();
  const pack = receipt.kind === 'pack';
  if (receipt.cost !== (pack ? 300 : 0) || receipt.sealsEarned !== (pack ? 1 : 0)
      || !Array.isArray(receipt.cards) || receipt.cards.length !== (pack ? 3 : 1)) fail();
  const seen = new Set(), treatments = [], copies = new Map([...profile.instances, ...profile.merchantVault.map(entry => entry.instance)].map(card => [card.uid, card]));
  for (const card of receipt.cards) {
    exactKeys(card, ['cardId', 'printId', 'instanceId', 'rarity']);
    const owned = copies.get(card.instanceId), printing = getPrintForCard(card.cardId, card.printId);
    if (!owned || seen.has(card.instanceId) || owned.cardId !== card.cardId || owned.printId !== card.printId
        || printing.setId !== 'wx01' || card.rarity !== CARD_RARITIES[card.cardId]) fail();
    seen.add(card.instanceId);
    treatments.push(printing.treatment);
  }
  if (pack) {
    const expected = receipt.mode === 'god' ? ['aa', 'leader', 'ink'] : ['base', 'base', receipt.mode === 'ordinary' ? 'base' : receipt.mode];
    if (treatments.some((value, index) => value !== expected[index]) || !receipt.cards.some(card => card.rarity !== 'common')
        || (receipt.mode === 'god' && new Set(receipt.cards.map(card => card.cardId)).size !== 3)) fail();
  } else if (!['aa', 'leader', 'ink', 'treasure'].includes(receipt.mode) || treatments[0] !== receipt.mode
      || (receipt.kind === 'story' && (receipt.mode !== 'aa' || !state.storyClaimed))) fail();
}

function validateProfile(profile, version) {
  const legacy = version === 1;
  const hasWeekly = isRecord(profile) && Object.hasOwn(profile, 'weekly');
  exactKeys(profile, [...profileKeys, ...(hasWeekly ? ['weekly'] : []), ...(legacy ? [] : ['wx01'])]);
  if (profile.version !== (legacy ? 3 : 4) || profile.collectionVersion !== (legacy ? 1 : 2) || profile.collectionExpansion !== (legacy ? 1 : 2) || (!legacy && !hasWeekly)) {
    fail('呢個旅程備份版本暫未支援，未有更改本機進度。');
  }
  if (profile.pending !== null) fail('請先完成或放棄未完對局，再儲存雲端旅程。');
  if (!Array.isArray(profile.instances) || !Array.isArray(profile.merchantVault)
    || !Array.isArray(profile.deckSlots) || profile.deckSlots.length > 3) fail();
  if (profile.instances.length + profile.merchantVault.length > (legacy ? LEGACY_MAX_SNAPSHOT_CARDS : MAX_SNAPSHOT_CARDS)) {
    fail(`雲端旅程暫時最多保留 ${legacy ? '2,000' : '10,000'} 張卡牌，商旅保管區亦計算在內。`);
  }
  const uids = new Set();
  const instance = item => {
    exactKeys(item, legacy ? instanceKeys : [...instanceKeys, 'printId']);
    if (legacy ? !LEGACY_CARD_IDS.includes(item.cardId) : typeof item.printId !== 'string') fail();
    if (!legacy) getPrintForCard(item.cardId, item.printId);
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
  if (legacy) {
    exactKeys(profile.inventory, LEGACY_CARD_IDS); exactKeys(profile.levels, LEGACY_CARD_IDS);
    if (Object.keys(profile.daily.marketPurchases).some(id => !LEGACY_CARD_IDS.includes(id))) fail();
  } else validateWX01(profile);

  // Compare at the saved day, so this checks canonical data without a day rollover.
  // Any repair (missing cards, bad decks, counters, XP, dates or unknown fields)
  // is rejected; the local hydrator must never silently replace a cloud journey.
  let canonical;
  try { canonical = hydrateProfile(profile, { now: `${profile.daily.date}T12:00:00.000Z` }); }
  catch { fail(); }
  if (legacy) {
    // Project only documented migration additions. Raw v1 keys/identities were
    // checked above, so this cannot hide unknown fields or discarded copies.
    canonical.version = 3; canonical.collectionVersion = 1; canonical.collectionExpansion = 1;
    delete canonical.wx01;
    for (const card of [...canonical.instances, ...canonical.merchantVault.map(entry => entry.instance)]) delete card.printId;
    for (const key of ['inventory', 'levels']) canonical[key] = Object.fromEntries(LEGACY_CARD_IDS.map(id => [id, canonical[key][id]]));
  }
  // Old v3 backups remain byte-for-byte payload compatible on validation.
  // Only restoration upgrades their missing weekly counters, starting at zero.
  if (!hasWeekly) delete canonical.weekly;
  if (stableJSON(canonical) !== stableJSON(profile)) fail('旅程備份資料不一致，未有更改本機進度。');
}

export function createSnapshot(profile) {
  return validateSnapshot({ format: SNAPSHOT_FORMAT, version: profile?.version === 3 ? 1 : SNAPSHOT_VERSION, profile });
}

/** Return detached validated data. Unknown formats/versions never start a new game. */
export function validateSnapshot(snapshot, { version } = {}) {
  let json = boundedJSON(snapshot);
  exactKeys(snapshot, ['format', 'version', 'profile']);
  if (snapshot.format !== SNAPSHOT_FORMAT || ![1, SNAPSHOT_VERSION].includes(snapshot.version) || (version !== undefined && snapshot.version !== version)) {
    fail('呢個旅程備份版本暫未支援，未有更改本機進度。');
  }
  if (snapshot.version === 1) json = boundedJSON(snapshot, LEGACY_MAX_SNAPSHOT_BYTES);
  validateProfile(snapshot.profile, snapshot.version);
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
