/** Local, original progression rules. Pure functions; the UI owns persistence. */
import { CARDS, LEGACY_CARD_IDS, ORIGINAL_CARD_IDS, CLASSIC_CARD_IDS, defaultDeckIds, validateDeck } from './engine.mjs';
import { hydrateCollection, syncCollection, getInstance, getInstances, getPreferredInstance, getActiveDeck, mintInstance, setInstanceXP, awardInstanceXP, getXPThreshold, getInstanceProtection, saveInstanceDeck, validateInstanceDeck, assertCollectionCapacity } from './collection.mjs';
import { STORY_NODES } from './stories.mjs';
import { WX01_CARD_IDS, WX01_RARITIES, getPrinting, getPrintForCard } from './printing-catalogue.mjs';
import { drawWX01Pack, WX01_PRICE, WX01_SEAL_COSTS } from './wx01-pack.mjs';
import { createWX01State, validateWX01State } from './wx01-state.mjs';

const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const CARD_IDS = CARDS.map(card => card.id);
const LIMIT = 1_000_000_000;
const MAX_COPIES = 99_999;
export const PROFILE_VERSION = 4;
export const PROFILE_KEY = 'shanhai.profile.v4';
export const LEGACY_PROFILE_KEY = 'shanhai.profile.v3';
export const PACK_PRICE = 300;
export const MAX_CARD_LEVEL = 5;
export const COLLECTION_EXPANSION = 2;
export const WELCOME_CARD_IDS = freeze(['wukong', 'guanyu', 'lindaiyu', 'kongzi']);
export const PACK_SETS = freeze({
  all: { name: '萬象秘匣', description: '原創山海與古典群英，二十四位角色皆可相逢。', cardIds: [...LEGACY_CARD_IDS] },
  classics: { name: '群英秘匣', description: '只出現十二位古典群英，同樣三張保底靈品或以上。', cardIds: [...CLASSIC_CARD_IDS] },
  wx01: { name: '西行秘匣', description: '十六位西行角色；三張保底靈品或以上，收藏異畫與墨卷。', cardIds: [...WX01_CARD_IDS] },
});
export const RARITIES = freeze({
  common: { name: '凡品', color: '#b7c6c4', weight: 60, buyPrice: 140, sellPrice: 40 },
  rare: { name: '靈品', color: '#b5a5e5', weight: 30, buyPrice: 300, sellPrice: 90 },
  epic: { name: '神品', color: '#e3bb6c', weight: 10, buyPrice: 600, sellPrice: 180 },
});
// Collection rarity is independent of battle stars, power and card level.
export const CARD_RARITIES = freeze({
  qingxiao: 'common', chiling: 'rare', shuangli: 'rare', cangjiao: 'rare',
  yaoheng: 'common', yanxin: 'common', duying: 'common', cuixian: 'common',
  xuanjian: 'epic', jinlin: 'epic', zhimeng: 'rare', yunya: 'common',
  huangdi: 'epic', wukong: 'epic', lindaiyu: 'rare', pangu: 'epic',
  kongzi: 'common', guanyu: 'rare', wangxifeng: 'rare', luzhishen: 'common',
  zhugeliang: 'rare', nezha: 'epic', diaochan: 'rare', wusong: 'common',
  ...WX01_RARITIES,
});
export const PACK_RULES = freeze({
  cardsPerPack: 3, guaranteedRarity: 'rare',
  standardOdds: { common: 0.6, rare: 0.3, epic: 0.1 },
  guaranteeOdds: { common: 0, rare: 0.75, epic: 0.25 },
  thirdSlotOdds: { common: 0.384, rare: 0.462, epic: 0.154 },
  averageCardOdds: { common: 0.528, rare: 0.354, epic: 0.118 },
  description: '每包 3 張。前兩格及一般第三格：凡品 60%／靈品 30%／神品 10%。若前兩格皆凡品，第三格改為靈品 75%／神品 25%。同稀有度內等機率，可重複。',
});

const nodeData = [
  ['mist-gate', '霧隱渡口', '穿霧入山', '渡船停在霧中，掌燈人正等你落下第一子。', 13, 69, '守渡弈者'],
  ['jade-forest', '青玉森庭', '聽風尋跡', '古木成陣，循着林間鈴聲尋見森羅守衛。', 28, 34, '青玉巡林者'],
  ['ember-pass', '赤燼關', '向火而行', '踏過溫熱玄石，在不熄的火光前磨鍊心志。', 54, 22, '赤燼關守'],
  ['moon-lake', '鏡月澤', '照見本心', '星河映在水面，渡影人以真假難辨的招式相迎。', 55, 59, '鏡月問心人'],
  ['sky-palace', '雲闕天階', '拾級問天', '踏上雲端長階，丹師以星軌驗證你的取捨。', 83, 15, '雲闕司星'],
  ['sea-throne', '歸墟王座', '萬象歸一', '山海盡頭的王座空着，最後一局留給你自己。', 86, 49, '歸墟守望者'],
];
export const NODES = freeze([...nodeData.map(([id, name, subtitle, description, x, y, enemyName], index) => ({
  id, name, subtitle, description, x, y, enemyName, worldId: 'shanhai', order: index, level: Math.min(5, index + 1),
  winReward: { coins: 80 + index * 20, dust: 2 + Math.floor(index / 2), xp: 30 + index * 10 },
  firstClearReward: { coins: 140 + index * 40, dust: 8 + index * 2, xp: 50 + index * 10 },
  dailyReward: { coins: 80 + index * 15, dust: 4 + index, xp: 20 },
})), ...STORY_NODES]);
export const LOGIN_REWARD = freeze({ coins: 160, dust: 8, xp: 20 });
export const ARENA_CHEST_REWARD = freeze({ coins: 240, dust: 16, xp: 60 });
const TASKS = freeze([
  { id: 'matches', title: '今日落子', description: '完成 2 場對局', field: 'matches', target: 2, reward: { coins: 100, dust: 6, xp: 30 } },
  { id: 'expedition', title: '山海行旅', description: '贏得 1 場遊歷對局', field: 'expeditionWins', target: 1, reward: { coins: 120, dust: 8, xp: 40 } },
  { id: 'pack', title: '星匣初啟', description: '開啟 1 包卡牌', field: 'packs', target: 1, reward: { coins: 80, dust: 5, xp: 20 } },
]);
export const WEEKLY_TASKS = freeze([
  { id: 'matches', title: '七日弈緣', description: '本週完成 10 場對局', field: 'matches', target: 10, reward: { coins: 300, dust: 20, xp: 80, seals: 5 } },
  { id: 'expedition', title: '踏遍山海', description: '本週贏得 5 場遊歷對局', field: 'expeditionWins', target: 5, reward: { coins: 350, dust: 25, xp: 100 } },
  { id: 'arena', title: '問道五弈', description: '本週完成 5 場擂台對局', field: 'arenaMatches', target: 5, reward: { coins: 250, dust: 15, xp: 70 } },
]);
const KINDS = ['practice', 'expedition', 'arena'];
const copy = value => structuredClone(value);
const integer = (value, fallback = 0, minimum = 0, maximum = LIMIT) => Number.isSafeInteger(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;
const uniqueKnown = (value, known) => Array.isArray(value) ? [...new Set(value.filter(id => known.includes(id)))] : [];
const knownCard = id => {
  if (!CARD_IDS.includes(id)) throw new RangeError('找不到這張卡牌。');
};
const nodeFor = id => {
  const node = NODES.find(item => item.id === id);
  if (!node) throw new RangeError('找不到這處山海地點。');
  return node;
};

export function dayKey(now = new Date()) {
  const date = new Date(now);
  if (!Number.isFinite(date.getTime())) throw new RangeError('日期無效。');
  const fields = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date).map(part => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}
/** Monday of the London calendar week, independent of the device timezone/DST. */
export function weekKey(now = new Date()) {
  const date = new Date(`${dayKey(now)}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return date.toISOString().slice(0, 10);
}
function validDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
const freshDaily = date => ({
  date, loginClaimed: false, matches: 0, expeditionWins: 0, packs: 0, arenaMatches: 0,
  claimedTasks: [], arenaChestClaimed: false, trainingUsed: false,
  marketPurchases: {}, expeditionCaches: [],
});
const freshWeekly = week => ({ week, matches: 0, expeditionWins: 0, arenaMatches: 0, claimedTasks: [] });
function hydrateWeekly(saved, date) {
  const currentWeek = weekKey(`${date}T12:00:00Z`);
  if (!saved || !validDay(saved.week) || new Date(`${saved.week}T12:00:00Z`).getUTCDay() !== 1 || saved.week < currentWeek) return freshWeekly(currentWeek);
  const weekly = freshWeekly(saved.week);
  weekly.matches = integer(saved.matches);
  for (const field of ['expeditionWins', 'arenaMatches']) weekly[field] = Math.min(weekly.matches, integer(saved[field]));
  weekly.claimedTasks = uniqueKnown(saved.claimedTasks, WEEKLY_TASKS.map(task => task.id));
  return weekly;
}

function createBaseProfile({ now = new Date(), legacyDeck, legacyStats } = {}) {
  const played = integer(legacyStats?.played);
  const inventory = Object.fromEntries(CARD_IDS.map(id => [id, ORIGINAL_CARD_IDS.includes(id) || WELCOME_CARD_IDS.includes(id) ? 1 : 0]));
  return {
    version: PROFILE_VERSION, collectionExpansion: COLLECTION_EXPANSION, coins: 1200, dust: 20, xp: 0,
    inventory,
    levels: Object.fromEntries(CARD_IDS.map(id => [id, 1])),
    deck: validateDeck(legacyDeck).valid && legacyDeck.every(id => inventory[id] > 0) ? [...legacyDeck] : [...defaultDeckIds],
    stats: { played, won: Math.min(played, integer(legacyStats?.won)) },
    cleared: [], location: NODES[0].id, daily: freshDaily(dayKey(now)), weekly: freshWeekly(weekKey(now)),
    arena: { points: 0, played: 0, won: 0 }, pending: null, serial: 0, wx01: createWX01State(),
  };
}

export function createProfile(options = {}) {
  const profile = hydrateCollection(createBaseProfile(options), { now: options.now ?? new Date() });
  for (const instance of profile.instances) instance.origin = WELCOME_CARD_IDS.includes(instance.cardId) ? 'welcome' : 'starter';
  return profile;
}

function legacyPendingInstances(profile, snapshot) {
  const active = getActiveDeck(profile)?.instanceIds;
  const hand = snapshot?.match?.player?.hand;
  if (snapshot?.encounter?.id !== profile.pending.id || !Array.isArray(hand) || hand.length !== 4
      || new Set(hand).size !== 4 || hand.some(id => !CARD_IDS.includes(id) || !profile.inventory[id])) return active;
  const activeRoles = new Set((active ?? []).map(uid => getInstance(profile, uid).cardId));
  if (hand.every(id => activeRoles.has(id))) return active;

  // v2 stored the four-card hand, but not the original eight-card deck. Retain
  // every known hand role and conservatively infer the cheapest legal fillers.
  const fillers = CARDS.filter(card => profile.inventory[card.id] > 0 && !hand.includes(card.id))
    .sort((a, b) => a.stars - b.stars || CARD_IDS.indexOf(a.id) - CARD_IDS.indexOf(b.id))
    .slice(0, 4).map(card => card.id);
  const inferred = [...hand, ...fillers].map(id => getPreferredInstance(profile, id).uid);
  return validateInstanceDeck(profile, inferred).valid ? inferred : active;
}

/** Repair untrusted local JSON with a whitelist; v1 deck and stats remain useful. */
export function hydrateProfile(raw, { now = new Date(), legacyDeck, legacyStats, legacyBattle } = {}) {
  const base = createBaseProfile({ now, legacyDeck, legacyStats });
  if (!raw || typeof raw !== 'object' || ![2, 3, PROFILE_VERSION].includes(raw.version)) return createProfile({ now, legacyDeck, legacyStats });
  const profile = { ...base };
  for (const field of ['coins', 'dust', 'xp', 'serial']) profile[field] = integer(raw[field], base[field]);
  if (raw.version >= 3) {
    // Canonical v3 records own the collection: never mint from derived counters.
    profile.collectionVersion = 2;
    profile.instances = Array.isArray(raw.instances) ? copy(raw.instances) : [];
    profile.instanceSerial = integer(raw.instanceSerial, 0, 0, Number.MAX_SAFE_INTEGER);
    profile.deckSlots = Array.isArray(raw.deckSlots) ? copy(raw.deckSlots) : [];
    profile.activeDeckId = typeof raw.activeDeckId === 'string' ? raw.activeDeckId : null;
    profile.merchantVault = Array.isArray(raw.merchantVault) ? copy(raw.merchantVault) : [];
  } else {
    for (const id of LEGACY_CARD_IDS) {
      const minimum = ORIGINAL_CARD_IDS.includes(id) ? 1 : 0;
      profile.inventory[id] = integer(raw.inventory?.[id], minimum, minimum, MAX_COPIES);
      profile.levels[id] = integer(raw.levels?.[id], 1, 1, MAX_CARD_LEVEL);
    }
    if (!Number.isSafeInteger(raw.collectionExpansion) || raw.collectionExpansion < 1) {
      for (const id of WELCOME_CARD_IDS) profile.inventory[id] = Math.max(1, profile.inventory[id]);
    }
    const usableDeck = ids => validateDeck(ids).valid && ids.every(id => profile.inventory[id] > 0);
    profile.deck = usableDeck(raw.deck) ? [...raw.deck] : usableDeck(base.deck) ? base.deck : [...defaultDeckIds];
  }
  profile.stats.played = integer(raw.stats?.played, base.stats.played);
  profile.stats.won = Math.min(profile.stats.played, integer(raw.stats?.won, base.stats.won));
  const cleared = uniqueKnown(raw.cleared, NODES.map(node => node.id));
  // Branches may be cleared in any order. Retain that chronology, but a clear
  // remains valid only when its entire prerequisite chain was also cleared.
  profile.cleared = cleared.filter(id => hasClearedPrerequisites(cleared, id));
  if (NODES.some(node => node.id === raw.location) && isNodeUnlocked(profile, raw.location)) profile.location = raw.location;
  for (const field of ['points', 'played', 'won']) profile.arena[field] = integer(raw.arena?.[field]);
  profile.arena.won = Math.min(profile.arena.played, profile.arena.won);
  const savedDaily = raw.daily;
  if (savedDaily && validDay(savedDaily.date) && savedDaily.date >= base.daily.date) {
    profile.daily = freshDaily(savedDaily.date);
    for (const field of ['loginClaimed', 'arenaChestClaimed', 'trainingUsed']) profile.daily[field] = savedDaily[field] === true;
    for (const field of ['matches', 'expeditionWins', 'packs', 'arenaMatches']) profile.daily[field] = integer(savedDaily[field]);
    profile.daily.claimedTasks = uniqueKnown(savedDaily.claimedTasks, TASKS.map(task => task.id));
    profile.daily.expeditionCaches = uniqueKnown(savedDaily.expeditionCaches, NODES.map(node => node.id));
    for (const id of CARD_IDS) {
      const count = integer(savedDaily.marketPurchases?.[id], 0, 0, 2);
      if (count) profile.daily.marketPurchases[id] = count;
    }
  }
  profile.weekly = hydrateWeekly(raw.weekly, profile.daily.date);
  const pending = raw.pending;
  if (pending && pending.id === `battle-${profile.serial}` && profile.serial > 0 && KINDS.includes(pending.kind)) {
    if (pending.kind !== 'expedition' || (NODES.some(node => node.id === pending.nodeId) && isNodeUnlocked(profile, pending.nodeId))) {
      profile.pending = { id: pending.id, kind: pending.kind, nodeId: pending.kind === 'expedition' ? pending.nodeId : null };
    }
  }
  const hydrated = hydrateCollection(profile, { now, allowLegacyPrints: raw.version < 4 });
  if (hydrated.pending) {
    const ids = raw.version === 2 ? legacyPendingInstances(hydrated, legacyBattle) : raw.pending?.instanceIds;
    const validation = validateInstanceDeck(hydrated, ids);
    if (!validation.valid) hydrated.pending = null;
    else {
      hydrated.pending.instanceIds = [...ids];
      hydrated.pending.cardInstances = Object.fromEntries(ids.map(uid => [getInstance(hydrated, uid).cardId, uid]));
      const savedPrints = raw.pending?.cardPrints;
      if (savedPrints !== undefined) {
        const cardIds = Object.keys(hydrated.pending.cardInstances);
        if (!savedPrints || typeof savedPrints !== 'object' || Array.isArray(savedPrints)
          || Object.keys(savedPrints).length !== cardIds.length || cardIds.some(id => typeof savedPrints[id] !== 'string')) throw new RangeError('未完對局的卡牌版本記錄無效。');
        hydrated.pending.cardPrints = Object.fromEntries(cardIds.map(id => [id, getPrintForCard(id, savedPrints[id]).id]));
      } else {
        hydrated.pending.cardPrints = Object.fromEntries(ids.map(uid => { const instance = getInstance(hydrated, uid); return [instance.cardId, instance.printId]; }));
      }
    }
  }
  hydrated.wx01 = raw.version === 4 ? validateWX01State(raw.wx01, hydrated) : createWX01State();
  return hydrated;
}

/** London midnight, including DST. A backward clock cannot reopen an old day. */
export function refreshDaily(profile, now = new Date()) {
  const next = syncCollection(profile);
  next.wx01 = validateWX01State(next.wx01, next);
  const date = dayKey(now);
  if (date > next.daily.date) next.daily = freshDaily(date);
  // The retained daily date also guards upgrades of old saves without weekly data.
  next.weekly = hydrateWeekly(next.weekly, next.daily.date);
  return next;
}
const addReward = (profile, reward) => {
  for (const field of ['coins', 'dust', 'xp']) profile[field] = Math.min(LIMIT, profile[field] + (reward[field] ?? 0));
  return profile;
};
function spend(profile, cost) {
  if (profile.coins < (cost.coins ?? 0)) throw new RangeError('金幣不足。');
  if (profile.dust < (cost.dust ?? 0)) throw new RangeError('靈砂不足。');
  profile.coins -= cost.coins ?? 0;
  profile.dust -= cost.dust ?? 0;
}
const increment = (object, field, amount = 1) => { object[field] = Math.min(LIMIT, object[field] + amount); };
function grantCard(profile, id, { source, now, printId }) {
  if (profile.inventory[id] >= MAX_COPIES) throw new RangeError('這張卡牌的收藏數量已達上限。');
  return mintInstance(profile, id, { source, now, printId });
}

export function claimLogin(profile, now = new Date()) {
  const next = refreshDaily(profile, now);
  if (next.daily.loginClaimed) throw new RangeError('今日登入禮已領取。');
  next.daily.loginClaimed = true;
  return addReward(next, LOGIN_REWARD);
}
export function getDailyTasks(profile, now = new Date()) {
  const current = refreshDaily(profile, now);
  return TASKS.map(task => ({ ...copy(task), progress: Math.min(task.target, current.daily[task.field]), claimed: current.daily.claimedTasks.includes(task.id) }));
}
export function claimTask(profile, id, now = new Date()) {
  const next = refreshDaily(profile, now);
  const task = TASKS.find(item => item.id === id);
  if (!task) throw new RangeError('找不到這項每日任務。');
  if (next.daily.claimedTasks.includes(id)) throw new RangeError('這項任務獎勵已領取。');
  if (next.daily[task.field] < task.target) throw new RangeError('任務尚未完成。');
  next.daily.claimedTasks.push(id);
  return addReward(next, task.reward);
}
export function getWeeklyTasks(profile, now = new Date()) {
  const current = refreshDaily(profile, now);
  return WEEKLY_TASKS.map(task => ({ ...copy(task), progress: Math.min(task.target, current.weekly[task.field]), claimed: current.weekly.claimedTasks.includes(task.id) }));
}
export function claimWeeklyTask(profile, id, now = new Date()) {
  const next = refreshDaily(profile, now), task = WEEKLY_TASKS.find(item => item.id === id);
  if (!task) throw new RangeError('找不到這項每週任務。');
  if (next.weekly.claimedTasks.includes(id)) throw new RangeError('這項每週任務獎勵已領取。');
  if (next.weekly[task.field] < task.target) throw new RangeError('每週任務尚未完成。');
  next.weekly.claimedTasks.push(id);
  if (task.reward.seals) increment(next.wx01, 'seals', task.reward.seals);
  return addReward(next, task.reward);
}
export function claimArenaChest(profile, now = new Date()) {
  const next = refreshDaily(profile, now);
  if (next.daily.arenaChestClaimed) throw new RangeError('今日競技寶匣已領取。');
  if (next.daily.arenaMatches < 3) throw new RangeError('完成 3 場競技對局後可領取。');
  next.daily.arenaChestClaimed = true;
  return addReward(next, ARENA_CHEST_REWARD);
}

function randomUnit(rng) {
  const value = rng();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('rng must return a number in [0, 1).');
  return value;
}
export function buyPack(profile, { set = 'all', rng = Math.random, now = new Date() } = {}) {
  if (!Object.hasOwn(PACK_SETS, set)) throw new RangeError('找不到這款卡包。');
  let next = refreshDaily(profile, now);
  assertNoWX01Receipt(next);
  assertCollectionCapacity(next, 3);
  if (set === 'wx01') {
    assertWX01Counters(next.wx01, ['opened', 'serial', 'seals']);
    spend(next, { coins: WX01_PRICE });
    const draw = drawWX01Pack({ dry: next.wx01.dry, rng });
    const cards = [];
    for (const card of draw.cards) {
      const minted = grantCard(next, card.cardId, { source: 'pack:wx01', now, printId: card.printId });
      next = minted.profile;
      cards.push({ ...card, instanceId: minted.instance.uid });
    }
    next.wx01.dry = draw.dry;
    increment(next.wx01, 'opened');
    increment(next.wx01, 'seals');
    increment(next.daily, 'packs');
    saveWX01Receipt(next, { kind: 'pack', mode: draw.mode, cards, now, cost: WX01_PRICE, sealsEarned: 1 });
    return { profile: next, cards: copy(cards), receipt: copy(next.wx01.receipt), cost: WX01_PRICE, set, mode: draw.mode, forced: draw.forced };
  }
  spend(next, { coins: PACK_PRICE });
  const cards = [];
  for (let slot = 0; slot < PACK_RULES.cardsPerPack; slot++) {
    const guarantee = slot === 2 && cards.every(card => card.rarity === 'common');
    const roll = randomUnit(rng);
    const rarity = guarantee ? (roll < 0.75 ? 'rare' : 'epic') : (roll < 0.6 ? 'common' : roll < 0.9 ? 'rare' : 'epic');
    const pool = PACK_SETS[set].cardIds.filter(id => CARD_RARITIES[id] === rarity);
    const cardId = pool[Math.floor(randomUnit(rng) * pool.length)];
    const minted = grantCard(next, cardId, { source: `pack:${set}`, now });
    next = minted.profile;
    cards.push({ cardId, printId: minted.instance.printId, rarity, instanceId: minted.instance.uid });
  }
  increment(next.daily, 'packs');
  return { profile: next, cards, cost: PACK_PRICE, set };
}

/** One saved transaction; each pack keeps the single-pack sampler and dry history. */
export function buyWX01Box(profile, { packs = 12, rng = Math.random, now = new Date() } = {}) {
  if (![12, 24].includes(packs)) throw new RangeError('西行盒裝只可選擇 12 或 24 匣。');
  let next = refreshDaily(profile, now);
  assertNoWX01Receipt(next);
  assertCollectionCapacity(next, packs * 3);
  assertWX01Counters(next.wx01, ['opened', 'seals'], packs);
  assertWX01Counters(next.wx01, ['serial']);
  assertWX01Counters(next.daily, ['packs'], packs);
  const cost = packs * WX01_PRICE;
  if (!Number.isSafeInteger(next.coins) || next.coins < 0 || next.coins > LIMIT) throw new RangeError('金幣記錄無效，未有更改收藏。');
  spend(next, { coins: cost });
  const cards = [], contents = [];
  for (let index = 0; index < packs; index++) {
    const draw = drawWX01Pack({ dry: next.wx01.dry, rng });
    const packCards = [];
    for (const card of draw.cards) {
      const minted = grantCard(next, card.cardId, { source: 'pack:wx01', now, printId: card.printId });
      next = minted.profile;
      packCards.push({ ...card, instanceId: minted.instance.uid });
    }
    cards.push(...packCards);
    contents.push({ mode: draw.mode, cards: packCards });
    next.wx01.dry = draw.dry;
  }
  increment(next.wx01, 'opened', packs);
  increment(next.wx01, 'seals', packs);
  increment(next.daily, 'packs', packs);
  saveWX01Receipt(next, { kind: 'box', mode: 'box', cards, packs: contents, now, cost, sealsEarned: packs });
  return { profile: next, cards: copy(cards), receipt: copy(next.wx01.receipt), cost, set: 'wx01' };
}

function assertNoWX01Receipt(profile) {
  if (profile.wx01.receipt) throw new RangeError('請先確認上次西行開匣結果，再領取新卡。');
}
function assertWX01Counters(state, keys, amount = 1) {
  if (keys.some(key => !Number.isSafeInteger(state[key]) || state[key] < 0 || state[key] > LIMIT - amount)) throw new RangeError('西行收藏記錄已達上限，未有扣除資源。');
}
function saveWX01Receipt(profile, { kind, mode, cards, packs, now, cost = 0, sealsEarned = 0 }) {
  increment(profile.wx01, 'serial');
  profile.wx01.receipt = { id: `wx01-${profile.wx01.serial}`, kind, mode, cards: copy(cards), openedAt: new Date(now).toISOString(), cost, sealsEarned };
  if (packs !== undefined) profile.wx01.receipt.packs = copy(packs);
}
export function acknowledgeWX01Receipt(profile, id) {
  const next = syncCollection(profile);
  next.wx01 = validateWX01State(next.wx01, next);
  if (typeof id !== 'string' || !/^wx01-[1-9]\d*$/.test(id)) throw new RangeError('開匣記錄編號無效。');
  const serial = Number(id.slice(5));
  if (!Number.isSafeInteger(serial) || serial > next.wx01.serial) throw new RangeError('找不到這次開匣記錄。');
  if (next.wx01.receipt === null) return next;
  if (next.wx01.receipt.id !== id) throw new RangeError('開匣記錄已更新，請先查看目前結果。');
  next.wx01.receipt = null;
  return next;
}
function grantWX01Choice(profile, printId, { now, kind }) {
  let next = refreshDaily(profile, now);
  assertNoWX01Receipt(next);
  const print = getPrinting(printId);
  if (print.setId !== 'wx01' || !Object.hasOwn(WX01_SEAL_COSTS, print.treatment)) throw new RangeError('請選擇可領取的西行特別版本。');
  if (kind === 'story') {
    const nodes = STORY_NODES.filter(node => node.worldId === 'westward');
    if (print.treatment !== 'aa') throw new RangeError('西行首卷獎勵只可選擇異畫。');
    if (next.wx01.storyClaimed) throw new RangeError('西行首卷異畫已領取。');
    if (nodes.length !== 4 || !nodes.every(node => next.cleared.includes(node.id))) throw new RangeError('通過西行首卷四處地點後可領取異畫。');
  } else if (next.wx01.seals < WX01_SEAL_COSTS[print.treatment]) throw new RangeError('西行印不足。');
  assertCollectionCapacity(next);
  assertWX01Counters(next.wx01, kind === 'story' ? ['serial'] : ['serial', 'redeemed']);
  const minted = grantCard(next, print.cardId, { source: `wx01:${kind}`, now, printId });
  next = minted.profile;
  if (kind === 'story') next.wx01.storyClaimed = true;
  else { next.wx01.seals -= WX01_SEAL_COSTS[print.treatment]; increment(next.wx01, 'redeemed'); }
  const cards = [{ cardId: print.cardId, printId, instanceId: minted.instance.uid, rarity: WX01_RARITIES[print.cardId] }];
  saveWX01Receipt(next, { kind, mode: print.treatment, cards, now });
  return { profile: next, cards, receipt: copy(next.wx01.receipt), cost: 0, sealsCost: kind === 'story' ? 0 : WX01_SEAL_COSTS[print.treatment], set: 'wx01' };
}
export function redeemWX01Print(profile, printId, { now = new Date() } = {}) {
  return grantWX01Choice(profile, printId, { now, kind: 'redeem' });
}
export function claimWX01StoryPrint(profile, printId, { now = new Date() } = {}) {
  return grantWX01Choice(profile, printId, { now, kind: 'story' });
}
export function setLeaderInstance(profile, uid) {
  const next = syncCollection(profile);
  next.wx01 = validateWX01State(next.wx01, next);
  if (uid !== null) {
    const instance = getInstance(next, uid);
    if (getPrintForCard(instance.cardId, instance.printId).treatment !== 'leader') throw new RangeError('請選擇背包中的領航異畫。');
  }
  next.wx01.leaderInstanceId = uid;
  return next;
}

function hash(text) {
  let value = 2166136261;
  for (const character of text) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  // Final mixing avoids ordering similar IDs almost identically on adjacent days.
  value ^= value >>> 16; value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15; value = Math.imul(value, 0x846ca68b);
  return (value ^ (value >>> 16)) >>> 0;
}
export function getMarket(profile, now = new Date()) {
  const current = refreshDaily(profile, now);
  const ordered = LEGACY_CARD_IDS.map(cardId => ({ cardId, order: hash(`${current.daily.date}:${cardId}`) }))
    .sort((a, b) => a.order - b.order || a.cardId.localeCompare(b.cardId));
  const classics = ordered.filter(item => CLASSIC_CARD_IDS.includes(item.cardId)).slice(0, 2);
  const offers = [...classics, ...ordered.filter(item => !classics.includes(item)).slice(0, 2)];
  return offers
    .map(({ cardId }) => {
      const rarity = CARD_RARITIES[cardId];
      return { cardId, rarity, price: RARITIES[rarity].buyPrice, sellPrice: RARITIES[rarity].sellPrice, stock: 2 - (current.daily.marketPurchases[cardId] ?? 0) };
    });
}
export function buyCard(profile, id, now = new Date()) {
  knownCard(id);
  let next = refreshDaily(profile, now);
  const offer = getMarket(next, now).find(item => item.cardId === id);
  if (!offer) throw new RangeError('這張卡牌不在今日商人貨架上。');
  if (offer.stock <= 0) throw new RangeError('今日這張卡牌已售罄。');
  spend(next, { coins: offer.price });
  next = grantCard(next, id, { source: 'npc-market', now }).profile;
  next.daily.marketPurchases[id] = (next.daily.marketPurchases[id] ?? 0) + 1;
  return next;
}
export function getInstanceSale(profile, uid) {
  const instance = getInstance(profile, uid);
  const sellPrice = RARITIES[CARD_RARITIES[instance.cardId]].sellPrice + 30 * (instance.level - 1);
  return { sellPrice, buybackPrice: Math.ceil(sellPrice * 1.25), reason: getInstanceProtection(profile, uid) };
}
export function sellInstance(profile, uid, now = new Date()) {
  const next = refreshDaily(profile, now);
  const quote = getInstanceSale(next, uid);
  if (quote.reason) throw new RangeError(quote.reason);
  const instance = getInstance(next, uid);
  if (next.merchantVault.some(item => item.instance.uid === uid)) throw new RangeError('這張卡牌已在商旅保管處。');
  next.instances = next.instances.filter(item => item.uid !== uid);
  next.merchantVault.push({ instance: copy(instance), sellPrice: quote.sellPrice, buybackPrice: quote.buybackPrice, soldAt: new Date(now).toISOString() });
  addReward(next, { coins: quote.sellPrice });
  return syncCollection(next);
}
export function buybackInstance(profile, uid, now = new Date()) {
  const next = refreshDaily(profile, now);
  const index = next.merchantVault.findIndex(item => item.instance.uid === uid);
  if (index === -1) throw new RangeError('這張卡牌不在商旅保管處，或已取回。');
  if (next.instances.some(item => item.uid === uid)) throw new RangeError('這張卡牌已在背包，不能重複取回。');
  const stored = next.merchantVault[index];
  spend(next, { coins: stored.buybackPrice });
  next.instances.push(copy(stored.instance));
  next.merchantVault.splice(index, 1);
  return syncCollection(next);
}
export function sellCard(profile, id, now = new Date()) {
  knownCard(id);
  const copies = getInstances(profile, id);
  if (copies.length <= 1) throw new RangeError('須保留最後一張卡牌，只可出售多餘副本。');
  const eligible = copies.filter(instance => !getInstanceProtection(profile, instance.uid))
    .sort((a, b) => a.level - b.level || a.xp - b.xp || a.uid.localeCompare(b.uid));
  if (!eligible.length) throw new RangeError('這個角色的副本均已鎖定、編入牌組或正在出戰。');
  return sellInstance(profile, eligible[0].uid, now);
}

function resolveInstance(profile, id) {
  if (!CARD_IDS.includes(id)) return getInstance(profile, id);
  const active = getActiveDeck(profile);
  const inDeck = active?.instanceIds.map(uid => getInstance(profile, uid)).find(instance => instance.cardId === id);
  const instance = inDeck ?? getPreferredInstance(profile, id);
  if (!instance) throw new RangeError('尚未擁有這張卡牌。');
  return instance;
}
export function getUpgradeCost(profile, id) {
  const instance = resolveInstance(profile, id);
  const level = instance.level;
  const maxed = level >= MAX_CARD_LEVEL;
  const blockedReason = profile.pending?.instanceIds?.includes(instance.uid) ? '這張卡牌正在出戰，完成對局後才可修練。' : null;
  return { coins: maxed ? 0 : 120 * level, dust: maxed ? 0 : 6 * level, nextLevel: Math.min(MAX_CARD_LEVEL, level + 1), maxed, instanceId: instance.uid, cardId: instance.cardId, level, blockedReason };
}
export function getTrainingCost(profile, id, now = new Date()) {
  const current = refreshDaily(profile, now);
  const cost = getUpgradeCost(current, id);
  return { ...cost, coins: Math.ceil(cost.coins / 2), dust: Math.ceil(cost.dust / 2), used: current.daily.trainingUsed };
}
export function upgradeCard(profile, id) {
  const cost = getUpgradeCost(profile, id);
  if (cost.blockedReason) throw new RangeError(cost.blockedReason);
  if (cost.maxed) throw new RangeError('這張卡牌已達最高修為。');
  const next = syncCollection(profile);
  spend(next, cost);
  return setInstanceXP(next, cost.instanceId, getXPThreshold(cost.nextLevel));
}
export function trainCard(profile, id, now = new Date()) {
  const next = refreshDaily(profile, now);
  const cost = getTrainingCost(next, id, now);
  if (cost.blockedReason) throw new RangeError(cost.blockedReason);
  if (cost.used) throw new RangeError('今日半價修行已使用。');
  if (cost.maxed) throw new RangeError('這張卡牌已達最高修為。');
  spend(next, cost);
  next.daily.trainingUsed = true;
  return setInstanceXP(next, cost.instanceId, getXPThreshold(cost.nextLevel));
}
export function upgradeInstance(profile, uid) { getInstance(profile, uid); return upgradeCard(profile, uid); }
export function trainInstance(profile, uid, now = new Date()) { getInstance(profile, uid); return trainCard(profile, uid, now); }

function hasClearedPrerequisites(cleared, nodeId, visiting = new Set()) {
  if (visiting.has(nodeId)) return false;
  const node = nodeFor(nodeId), index = NODES.indexOf(node);
  const prerequisite = Object.hasOwn(node, 'requiresNode') ? node.requiresNode : NODES[index - 1]?.id;
  if (!prerequisite) return true;
  if (!cleared.includes(prerequisite) || !NODES.some(item => item.id === prerequisite)) return false;
  visiting.add(nodeId);
  return hasClearedPrerequisites(cleared, prerequisite, visiting);
}
export function isNodeUnlocked(profile, nodeId) {
  return hasClearedPrerequisites(profile.cleared, nodeId);
}
export function beginBattle(profile, { kind = 'practice', nodeId = null, now = new Date() } = {}) {
  if (!KINDS.includes(kind)) throw new RangeError('對局模式無效。');
  const next = refreshDaily(profile, now);
  if (next.pending) throw new RangeError('請先完成或離開目前對局。');
  if (kind === 'expedition' && !isNodeUnlocked(next, nodeId)) throw new RangeError('先通過前一處地點，方可繼續遊歷。');
  if (next.serial >= LIMIT) throw new RangeError('本機對局記錄已達上限。');
  const slot = getActiveDeck(next);
  const validation = validateInstanceDeck(next, slot?.instanceIds);
  if (!validation.valid) throw new RangeError('請先儲存八張已擁有、總星數不超過 25 的出戰牌組。');
  increment(next, 'serial');
  const instanceIds = [...slot.instanceIds];
  const cardInstances = Object.fromEntries(instanceIds.map(uid => [getInstance(next, uid).cardId, uid]));
  const cardPrints = Object.fromEntries(instanceIds.map(uid => { const instance = getInstance(next, uid); return [instance.cardId, instance.printId]; }));
  const encounter = { id: `battle-${next.serial}`, kind, nodeId: kind === 'expedition' ? nodeId : null, instanceIds, cardInstances, cardPrints };
  if (kind === 'expedition') next.location = nodeId;
  next.pending = copy(encounter);
  return { profile: next, encounter };
}
export function abandonBattle(profile) {
  const next = syncCollection(profile);
  next.pending = null;
  return next;
}
export function finishBattle(profile, { encounterId, winner, playedCardIds = [], now = new Date() } = {}) {
  if (!['player', 'opponent', 'draw'].includes(winner)) throw new RangeError('對局結果無效。');
  if (!profile.pending || profile.pending.id !== encounterId) throw new RangeError('對局已結算或找不到對局，不能重複領取獎勵。');
  if (!Array.isArray(playedCardIds) || playedCardIds.length > 4 || new Set(playedCardIds).size !== playedCardIds.length
    || playedCardIds.some(id => !Object.hasOwn(profile.pending.cardInstances ?? {}, id))) throw new RangeError('出戰卡牌紀錄無效，必須是本局牌組中最多四位不同角色。');
  const playedUIDs = playedCardIds.map(id => profile.pending.cardInstances[id]);
  for (const [index, uid] of playedUIDs.entries()) {
    if (!Array.isArray(profile.pending.instanceIds) || !profile.pending.instanceIds.includes(uid)
      || getInstance(profile, uid).cardId !== playedCardIds[index]) throw new RangeError('出戰卡牌與本局紀錄不符。');
  }
  let next = refreshDaily(profile, now);
  const encounter = next.pending;
  const win = winner === 'player';
  const reward = { coins: 0, dust: 0, xp: 0, points: 0, firstClear: false, dailyCache: false, cardXP: [] };
  const include = part => { for (const field of ['coins', 'dust', 'xp']) reward[field] += part[field] ?? 0; };
  increment(next.stats, 'played');
  if (win) increment(next.stats, 'won');
  increment(next.daily, 'matches');
  increment(next.weekly, 'matches');
  if (encounter.kind === 'expedition') {
    const node = nodeFor(encounter.nodeId);
    include(win ? node.winReward : { coins: winner === 'draw' ? 35 : 20, dust: 0, xp: 10 });
    if (win) {
      increment(next.daily, 'expeditionWins');
      increment(next.weekly, 'expeditionWins');
      if (!next.cleared.includes(node.id)) {
        next.cleared.push(node.id);
        include(node.firstClearReward);
        reward.firstClear = true;
      }
      if (!next.daily.expeditionCaches.includes(node.id)) {
        next.daily.expeditionCaches.push(node.id);
        include(node.dailyReward);
        reward.dailyCache = true;
      }
    }
  } else if (encounter.kind === 'arena') {
    reward.points = win ? 30 : winner === 'draw' ? 10 : 5;
    include(win ? { coins: 90, dust: 3, xp: 35 } : { coins: winner === 'draw' ? 45 : 25, dust: 1, xp: 15 });
    increment(next.arena, 'points', reward.points);
    increment(next.arena, 'played');
    if (win) increment(next.arena, 'won');
    increment(next.daily, 'arenaMatches');
    increment(next.weekly, 'arenaMatches');
  }
  next.pending = null;
  addReward(next, reward);
  const amount = encounter.kind === 'expedition' ? (win ? 20 : 12) : encounter.kind === 'arena' ? (win ? 12 : 8) : 0;
  if (playedUIDs.length) {
    const awarded = awardInstanceXP(next, playedUIDs, amount, { win });
    next = awarded.profile;
    reward.cardXP = awarded.changes;
  }
  return { profile: next, reward };
}
export function saveDeck(profile, ids) {
  const validation = validateDeck(ids);
  if (!validation.valid) throw new RangeError(validation.errors.join(' '));
  const active = getActiveDeck(profile);
  const instanceIds = ids.map(id => resolveInstance(profile, id).uid);
  return saveInstanceDeck(profile, { slotId: active?.id ?? 'deck-1', name: active?.name ?? '初陣', instanceIds });
}
export function getHeroLevel(profile) {
  return 1 + Math.floor(Math.sqrt(profile.xp / 100));
}
export function getArenaRank(profile) {
  const ranks = [
    { name: '初入山海', minimum: 0 }, { name: '青銅弈者', minimum: 100 },
    { name: '白銀執令', minimum: 300 }, { name: '黃金問道', minimum: 700 },
    { name: '星辰宗師', minimum: 1400 }, { name: '山海無雙', minimum: 2500 },
  ];
  const index = ranks.findLastIndex(rank => profile.arena.points >= rank.minimum);
  return { ...ranks[index], next: ranks[index + 1] ? { ...ranks[index + 1] } : null };
}
