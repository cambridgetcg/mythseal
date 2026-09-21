import test from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, ORIGINAL_CARD_IDS, CLASSIC_CARD_IDS, defaultDeckIds, validateDeck } from '../engine.mjs';
import { getInstances, getInstance, getActiveDeck, getPreferredInstance, mintInstance, setInstanceXP, awardInstanceXP, getXPThreshold, syncCollection, saveInstanceDeck, activateDeck, toggleInstanceLock } from '../collection.mjs';
import {
  createProfile, hydrateProfile, refreshDaily, dayKey, getDailyTasks, claimLogin, claimTask,
  buyPack, getMarket, buyCard, sellCard, getUpgradeCost, upgradeCard, getTrainingCost, trainCard,
  NODES, RARITIES, CARD_RARITIES, PACK_RULES, PACK_PRICE, LOGIN_REWARD, ARENA_CHEST_REWARD,
  WELCOME_CARD_IDS, COLLECTION_EXPANSION, PACK_SETS,
  beginBattle, finishBattle, abandonBattle, isNodeUnlocked, claimArenaChest, saveDeck, getHeroLevel, getArenaRank,
  sellInstance, buybackInstance, getInstanceSale, upgradeInstance, trainInstance, PROFILE_KEY, LEGACY_PROFILE_KEY,
} from '../progression.mjs';

const now = '2026-09-21T12:00:00Z';
const tomorrow = '2026-09-22T12:00:00Z';
const yesterday = '2026-09-20T12:00:00Z';
const fresh = () => createProfile({ now });
const legacy = () => {
  const profile = fresh();
  profile.version = 2;
  for (const key of ['instances', 'instanceSerial', 'deckSlots', 'activeDeckId', 'merchantVault', 'collectionVersion']) delete profile[key];
  return profile;
};
const costFields = cost => ({ coins: cost.coins, dust: cost.dust, nextLevel: cost.nextLevel, maxed: cost.maxed, ...(Object.hasOwn(cost, 'used') ? { used: cost.used } : {}) });
const freeze = object => {
  if (object && typeof object === 'object') { Object.values(object).forEach(freeze); Object.freeze(object); }
  return object;
};
const sequence = values => { let i = 0; return () => values[i++]; };
const complete = (profile, { kind = 'expedition', nodeId = NODES[0].id, winner = 'player', date = now } = {}) => {
  const started = beginBattle(profile, { kind, nodeId, now: date });
  return finishBattle(started.profile, { encounterId: started.encounter.id, winner, now: date });
};

test('new profile and v1 migration preserve the playable roster, deck and stats', () => {
  const deck = [...defaultDeckIds].reverse();
  const profile = createProfile({ now, legacyDeck: deck, legacyStats: { played: 9, won: 4 } });
  assert.equal(profile.version, 3);
  assert.equal(profile.coins, 1200);
  assert.equal(profile.dust, 20);
  assert.equal(profile.xp, 0);
  assert.deepEqual(profile.deck, deck);
  assert.deepEqual(profile.stats, { played: 9, won: 4 });
  assert.equal(profile.location, NODES[0].id);
  assert.equal(profile.collectionExpansion, COLLECTION_EXPANSION);
  assert.equal(Object.keys(profile.inventory).length, 24);
  assert.equal(Object.values(profile.inventory).reduce((sum, count) => sum + count, 0), 16);
  assert(ORIGINAL_CARD_IDS.every(id => profile.inventory[id] === 1));
  assert(WELCOME_CARD_IDS.every(id => profile.inventory[id] === 1));
  assert(CLASSIC_CARD_IDS.filter(id => !WELCOME_CARD_IDS.includes(id)).every(id => profile.inventory[id] === 0));
  assert.deepEqual(Object.values(profile.levels), Array(24).fill(1));
  assert.equal(getPreferredInstance(profile, 'qingxiao').origin, 'starter');
  assert.equal(getPreferredInstance(profile, 'wukong').origin, 'welcome');
  deck.pop();
  assert.equal(profile.deck.length, 8);
});

test('invalid migration input falls back without inventing historic wins', () => {
  const profile = hydrateProfile(null, { now, legacyDeck: ['bad'], legacyStats: { played: -4, won: 80 } });
  assert.deepEqual(profile.deck, defaultDeckIds);
  assert.deepEqual(profile.stats, { played: 0, won: 0 });
  assert.equal(hydrateProfile({ version: 1 }, { now }).version, 3);
});

test('v2 collection expansion keeps progress and grants only missing welcome cards once', () => {
  const old = legacy();
  delete old.collectionExpansion;
  old.inventory = Object.fromEntries(ORIGINAL_CARD_IDS.map(id => [id, 1]));
  old.inventory.qingxiao = 4;
  old.inventory.wukong = 3;
  old.inventory.pangu = 2;
  old.levels.qingxiao = 4;
  old.coins = 678; old.dust = 41; old.xp = 123;
  old.stats = { played: 17, won: 8 };
  old.deck = [...defaultDeckIds].reverse();
  old.daily.loginClaimed = true;
  const migrated = hydrateProfile(freeze(old), { now });
  assert.equal(migrated.collectionExpansion, 1);
  assert.equal(migrated.inventory.wukong, 3);
  assert.equal(migrated.inventory.pangu, 2);
  assert.equal(migrated.inventory.guanyu, 1);
  assert.equal(migrated.inventory.lindaiyu, 1);
  assert.equal(migrated.inventory.kongzi, 1);
  assert.equal(migrated.inventory.qingxiao, 4);
  assert.equal(migrated.inventory.huangdi, 0);
  for (const field of ['coins', 'dust', 'xp', 'stats', 'deck', 'daily']) assert.deepEqual(migrated[field], old[field]);
  assert.equal(migrated.levels.qingxiao, 4);
  assert.deepEqual(hydrateProfile(migrated, { now }), migrated);
});

test('processed expansion preserves zero and missing classic cards without regifting', () => {
  const raw = legacy();
  raw.inventory.wukong = 0;
  delete raw.inventory.guanyu;
  raw.inventory.pangu = -7;
  raw.inventory.qingxiao = 0;
  const saved = hydrateProfile(freeze(raw), { now });
  assert.equal(saved.inventory.wukong, 0);
  assert.equal(saved.inventory.guanyu, 0);
  assert.equal(saved.inventory.pangu, 0);
  assert.equal(saved.inventory.qingxiao, 1);
  assert.deepEqual(hydrateProfile(saved, { now }), saved);
});

test('migration rejects a structurally valid deck containing uncollected classics', () => {
  const id = 'pangu';
  const deck = defaultDeckIds.map((_, index) => defaultDeckIds.map((cardId, slot) => slot === index ? id : cardId))
    .find(candidate => validateDeck(candidate).valid);
  assert(deck, 'An unowned classic can fit a legal eight-card star budget');
  const raw = legacy(); raw.deck = deck;
  assert.deepEqual(hydrateProfile(raw, { now }).deck, defaultDeckIds);
  assert.deepEqual(createProfile({ now, legacyDeck: deck }).deck, defaultDeckIds);
  assert.throws(() => saveDeck(fresh(), deck), /尚未擁有/);
  raw.inventory.pangu = 1;
  assert.deepEqual(hydrateProfile(raw, { now }).deck, deck);
});

test('hydrate repairs invalid scalars and whitelists collections without mutating input', () => {
  const raw = legacy();
  raw.coins = NaN; raw.dust = -10; raw.xp = '100';
  raw.inventory.qingxiao = -3; raw.inventory.unknown = 80;
  raw.levels.qingxiao = 100; raw.levels.chiling = 2.5;
  raw.stats = { played: 3, won: 10 };
  raw.cleared = [NODES[0].id, NODES[2].id, 'unknown'];
  raw.location = NODES[5].id;
  raw.daily.claimedTasks = ['pack', 'pack', 'unknown'];
  const profile = hydrateProfile(freeze(raw), { now });
  assert.equal(profile.coins, 1200);
  assert.equal(profile.dust, 0);
  assert.equal(profile.xp, 0);
  assert.equal(profile.inventory.qingxiao, 1);
  assert.equal(profile.inventory.unknown, undefined);
  assert.equal(profile.levels.qingxiao, 5);
  assert.equal(profile.levels.chiling, 1);
  assert.deepEqual(profile.stats, { played: 3, won: 3 });
  assert.deepEqual(profile.cleared, [NODES[0].id]);
  assert.equal(profile.location, NODES[0].id);
  assert.deepEqual(profile.daily.claimedTasks, ['pack']);
});

test('London day boundaries follow summer and winter time, reject invalid dates', () => {
  assert.equal(dayKey('2026-09-21T22:59:59Z'), '2026-09-21');
  assert.equal(dayKey('2026-09-21T23:00:00Z'), '2026-09-22');
  assert.equal(dayKey('2026-12-21T23:59:59Z'), '2026-12-21');
  assert.equal(dayKey('2026-12-22T00:00:00Z'), '2026-12-22');
  assert.throws(() => dayKey('bad'), RangeError);
});

test('daily rollover resets only daily data and never reopens an earlier day', () => {
  let profile = claimLogin(fresh(), now);
  profile.daily.trainingUsed = true; profile.daily.matches = 3;
  profile.daily.marketPurchases.qingxiao = 2;
  profile = beginBattle(profile, { kind: 'expedition', nodeId: NODES[0].id, now }).profile;
  const rolled = refreshDaily(freeze(profile), tomorrow);
  assert.equal(rolled.daily.date, '2026-09-22');
  assert.equal(rolled.daily.loginClaimed, false);
  assert.equal(rolled.daily.matches, 0);
  assert.equal(rolled.daily.trainingUsed, false);
  assert.deepEqual(rolled.daily.marketPurchases, {});
  assert.deepEqual(rolled.pending, profile.pending);
  assert.equal(rolled.coins, profile.coins);
  const claimed = claimLogin(rolled, tomorrow);
  assert.throws(() => claimLogin(claimed, yesterday), /已領取/);
  assert.equal(refreshDaily(claimed, yesterday).daily.date, '2026-09-22');
});

test('hydrate preserves rollback guard and valid pending across a day boundary', () => {
  const started = beginBattle(claimLogin(fresh(), now), { kind: 'arena', now }).profile;
  const backward = hydrateProfile(started, { now: yesterday });
  assert.equal(backward.daily.loginClaimed, true);
  assert.equal(backward.daily.date, '2026-09-21');
  const forward = hydrateProfile(started, { now: tomorrow });
  assert.deepEqual(forward.pending, started.pending);
  assert.equal(forward.daily.loginClaimed, false);
  assert.equal(forward.daily.date, '2026-09-22');
  const corrupt = structuredClone(started);
  corrupt.pending.id = 'battle-999';
  assert.equal(hydrateProfile(corrupt, { now }).pending, null);
});

test('malformed stored dates do not lock progression forever', () => {
  const raw = fresh();
  raw.daily.date = '9999-99-99'; raw.daily.loginClaimed = true;
  const repaired = hydrateProfile(raw, { now });
  assert.equal(repaired.daily.date, '2026-09-21');
  assert.equal(repaired.daily.loginClaimed, false);
});

test('login reward is immutable, once per day and refreshes at next midnight', () => {
  const base = freeze(fresh());
  const claimed = claimLogin(base, now);
  assert.equal(claimed.coins, base.coins + LOGIN_REWARD.coins);
  assert.equal(claimed.dust, base.dust + LOGIN_REWARD.dust);
  assert.equal(base.daily.loginClaimed, false);
  assert.throws(() => claimLogin(claimed, now), /已領取/);
  assert.equal(claimLogin(claimed, tomorrow).coins, claimed.coins + LOGIN_REWARD.coins);
});

test('daily tasks require actual completion, claim once and reset', () => {
  let profile = fresh();
  assert.throws(() => claimTask(profile, 'matches', now), /尚未完成/);
  assert.throws(() => claimTask(profile, 'unknown', now), /找不到/);
  profile = complete(profile).profile;
  profile = complete(profile, { kind: 'practice', winner: 'draw' }).profile;
  profile = buyPack(profile, { rng: () => 0, now }).profile;
  const tasks = getDailyTasks(profile, now);
  assert.deepEqual(tasks.map(task => task.progress), [2, 1, 1]);
  for (const task of tasks) {
    const coins = profile.coins;
    profile = claimTask(profile, task.id, now);
    assert.equal(profile.coins, coins + task.reward.coins);
    assert.throws(() => claimTask(profile, task.id, now), /已領取/);
  }
  assert(getDailyTasks(profile, tomorrow).every(task => task.progress === 0 && !task.claimed));
});

test('pack gives three cards, duplicates stack and common/common forces a rare', () => {
  const profile = freeze(fresh());
  const result = buyPack(profile, { rng: () => 0, now });
  assert.equal(result.cost, PACK_PRICE);
  assert.deepEqual(result.cards.map(card => card.rarity), ['common', 'common', 'rare']);
  assert.equal(result.profile.coins, profile.coins - PACK_PRICE);
  assert.equal(result.profile.inventory.qingxiao, 3);
  assert.equal(result.profile.inventory.chiling, 2);
  assert.equal(result.profile.daily.packs, 1);
  assert.equal(profile.inventory.qingxiao, 1);
});

test('pack threshold edges and third-slot guarantee use advertised rarity pools', () => {
  const regular = buyPack(fresh(), { rng: sequence([0.6, 0, 0.9, 0, 0.599999, 0]), now });
  assert.deepEqual(regular.cards.map(card => card.rarity), ['rare', 'epic', 'common']);
  const epic = buyPack(fresh(), { rng: sequence([0, 0, 0, 0, 0.75, 0]), now });
  assert.equal(epic.cards[2].rarity, 'epic');
  const rare = buyPack(fresh(), { rng: sequence([0, 0, 0, 0, 0.749999, 0]), now });
  assert.equal(rare.cards[2].rarity, 'rare');
  const high = buyPack(fresh(), { rng: () => 0.999999, now });
  const lastEpic = CARDS.filter(card => CARD_RARITIES[card.id] === 'epic').at(-1).id;
  assert(high.cards.every(card => card.rarity === 'epic' && card.cardId === lastEpic));
  assert(Math.abs(PACK_RULES.averageCardOdds.common + PACK_RULES.averageCardOdds.rare + PACK_RULES.averageCardOdds.epic - 1) < 1e-12);
});

test('classics packs use only their twelve-card pool and keep the same price and guarantee', () => {
  const initial = freeze(fresh());
  const result = buyPack(initial, { set: 'classics', rng: () => 0, now });
  assert.equal(result.set, 'classics');
  assert.equal(result.cost, PACK_PRICE);
  assert.deepEqual(result.cards.map(card => card.rarity), ['common', 'common', 'rare']);
  assert(result.cards.every(card => CLASSIC_CARD_IDS.includes(card.cardId)));
  assert.equal(result.profile.coins, initial.coins - PACK_PRICE);
  assert.equal(result.profile.daily.packs, 1);
  assert.equal(PACK_SETS.classics.cardIds.length, 12);
  assert.equal(PACK_SETS.all.cardIds.length, 24);
  const epic = buyPack(initial, { set: 'classics', rng: sequence([0.99, 0, 0, 0, 0, 0]), now });
  assert.equal(epic.cards[0].cardId, 'huangdi');
  assert.equal(initial.inventory.huangdi, 0);
  assert.equal(epic.profile.inventory.huangdi, 1);
  assert(ORIGINAL_CARD_IDS.every(id => epic.profile.inventory[id] === initial.inventory[id]));
});

test('invalid pack sets fail before charging and mixed packs include new classics', () => {
  const initial = freeze(fresh());
  for (const set of ['unknown', '__proto__', 'toString', null]) {
    assert.throws(() => buyPack(initial, { set, rng: () => 0, now }), /找不到這款/);
  }
  const mixed = buyPack(initial, { rng: () => 0.999999, now });
  assert.equal(mixed.set, 'all');
  assert(mixed.cards.every(card => CLASSIC_CARD_IDS.includes(card.cardId)));
  assert.equal(initial.coins, 1200);
});

test('pack rejects bad RNG and insufficient balance without partial deductions', () => {
  const profile = freeze(fresh());
  for (const value of [-1, 1, Infinity, NaN, '0.2']) assert.throws(() => buyPack(profile, { rng: () => value, now }), RangeError);
  assert.throws(() => buyPack(profile, { rng: sequence([0, 0, 0.5, NaN]), now }), RangeError);
  assert.equal(profile.coins, 1200);
  assert.equal(profile.inventory.qingxiao, 1);
  const poor = { ...fresh(), coins: PACK_PRICE - 1 };
  let called = false;
  assert.throws(() => buyPack(poor, { rng: () => { called = true; return 0; }, now }), /金幣不足/);
  assert.equal(called, false);
});

test('rarity covers all cards independently of battle stars; market cannot round-trip profit', () => {
  assert.deepEqual(Object.keys(CARD_RARITIES).sort(), CARDS.map(card => card.id).sort());
  for (const rarity of Object.values(RARITIES)) assert(rarity.sellPrice < rarity.buyPrice);
  assert.equal(CARD_RARITIES.qingxiao, 'common');
  assert.equal(CARDS.find(card => card.id === 'qingxiao').stars, 3);
});

test('NPC market is deterministic, finite and refreshes stock only on a new day', () => {
  let profile = fresh();
  const market = getMarket(profile, now);
  assert.equal(market.length, 4);
  assert(market.filter(item => CLASSIC_CARD_IDS.includes(item.cardId)).length >= 2);
  assert.deepEqual(getMarket(profile, now), market);
  const offer = market.find(item => item.price <= 300) ?? market[0];
  const originalCount = profile.inventory[offer.cardId];
  profile = buyCard(profile, offer.cardId, now);
  assert.equal(profile.coins, 1200 - offer.price);
  assert.equal(profile.inventory[offer.cardId], originalCount + 1);
  assert.equal(getMarket(profile, now).find(item => item.cardId === offer.cardId).stock, 1);
  profile = buyCard(profile, offer.cardId, now);
  assert.equal(getMarket(profile, now).find(item => item.cardId === offer.cardId).stock, 0);
  assert.throws(() => buyCard(profile, offer.cardId, now), /售罄/);
  assert.throws(() => buyCard(profile, offer.cardId, yesterday), /售罄/);
  assert(getMarket(profile, tomorrow).every(item => item.stock === 2));
  assert.notDeepEqual(getMarket(profile, tomorrow).map(item => item.cardId), market.map(item => item.cardId));
});

test('uncollected classics cannot be sold, upgraded or trained; acquisition unlocks cultivation', () => {
  const locked = freeze(fresh());
  assert.equal(locked.inventory.huangdi, 0);
  assert.throws(() => sellCard(locked, 'huangdi'), /最後一張/);
  assert.throws(() => upgradeCard(locked, 'huangdi'), /尚未擁有/);
  assert.throws(() => trainCard(locked, 'huangdi', now), /尚未擁有/);
  assert.equal(locked.coins, 1200);
  assert.equal(locked.daily.trainingUsed, false);
  const found = buyPack(locked, { set: 'classics', rng: sequence([0.99, 0, 0, 0, 0, 0]), now }).profile;
  const trained = trainCard(found, 'huangdi', now);
  assert.equal(trained.levels.huangdi, 2);
  assert.equal(trained.inventory.huangdi, 1);
  assert.throws(() => sellCard(trained, 'huangdi'), /最後一張/);
});

test('daily market offers at least two classics on every sampled day without duplicate listings', () => {
  const profile = fresh();
  for (let day = 1; day <= 28; day++) {
    const date = `2026-10-${String(day).padStart(2, '0')}T12:00:00Z`;
    const offers = getMarket(profile, date);
    assert.equal(new Set(offers.map(item => item.cardId)).size, 4);
    assert(offers.filter(item => CLASSIC_CARD_IDS.includes(item.cardId)).length >= 2);
  }
});

test('unlisted/unknown market purchases and overdraw fail atomically', () => {
  const profile = freeze(fresh());
  const market = getMarket(profile, now);
  const unlisted = CARDS.find(card => !market.some(offer => offer.cardId === card.id));
  assert.throws(() => buyCard(profile, unlisted.id, now), /不在今日/);
  assert.throws(() => buyCard(profile, 'unknown', now), /找不到/);
  const poor = freeze({ ...fresh(), coins: 0 });
  assert.throws(() => buyCard(poor, market[0].cardId, now), /金幣不足/);
  assert.deepEqual(poor.daily.marketPurchases, {});
});

test('selling surplus retains the last card, saved deck and upgrade level', () => {
  let profile = fresh();
  profile = setInstanceXP(profile, getPreferredInstance(profile, 'qingxiao').uid, getXPThreshold(3));
  profile = mintInstance(profile, 'qingxiao', { now }).profile;
  const sold = sellCard(freeze(profile), 'qingxiao');
  assert.equal(sold.inventory.qingxiao, 1);
  assert.equal(sold.coins, profile.coins + RARITIES.common.sellPrice);
  assert.equal(sold.levels.qingxiao, 3);
  assert.deepEqual(sold.deck, profile.deck);
  assert.throws(() => sellCard(sold, 'qingxiao'), /最後一張/);
  assert.throws(() => sellCard(sold, 'unknown'), /找不到/);
});

test('upgrades spend coins and dust without consuming cards, cap at level five', () => {
  let profile = { ...fresh(), coins: 10_000, dust: 1000 };
  for (let level = 1; level < 5; level++) {
    assert.deepEqual(costFields(getUpgradeCost(profile, 'qingxiao')), { coins: 120 * level, dust: 6 * level, nextLevel: level + 1, maxed: false });
    const prior = freeze(profile);
    profile = upgradeCard(prior, 'qingxiao');
    assert.equal(profile.coins, prior.coins - 120 * level);
    assert.equal(profile.dust, prior.dust - 6 * level);
    assert.equal(profile.levels.qingxiao, level + 1);
    assert.equal(profile.inventory.qingxiao, 1);
  }
  assert.equal(getUpgradeCost(profile, 'qingxiao').maxed, true);
  assert.throws(() => upgradeCard(profile, 'qingxiao'), /最高修為/);
});

test('unaffordable upgrade does not consume coins or dust', () => {
  const lowDust = freeze({ ...fresh(), dust: 5 });
  assert.throws(() => upgradeCard(lowDust, 'qingxiao'), /靈砂不足/);
  assert.equal(lowDust.coins, 1200);
  assert.equal(lowDust.dust, 5);
  const lowCoins = freeze({ ...fresh(), coins: 119 });
  assert.throws(() => upgradeCard(lowCoins, 'qingxiao'), /金幣不足/);
  assert.equal(lowCoins.dust, 20);
});

test('daily training is half-price, shared across cards and guarded against rollback', () => {
  const original = fresh();
  assert.deepEqual(costFields(getTrainingCost(original, 'qingxiao', now)), { coins: 60, dust: 3, nextLevel: 2, maxed: false, used: false });
  const trained = trainCard(freeze(original), 'qingxiao', now);
  assert.equal(trained.coins, 1140);
  assert.equal(trained.dust, 17);
  assert.equal(trained.levels.qingxiao, 2);
  assert.throws(() => trainCard(trained, 'chiling', now), /已使用/);
  assert.throws(() => trainCard(trained, 'chiling', yesterday), /已使用/);
  assert.equal(trainCard(trained, 'chiling', tomorrow).levels.chiling, 2);
});

test('six map locations unlock sequentially on wins and move the traveller on entry', () => {
  let profile = fresh();
  assert(isNodeUnlocked(profile, NODES[0].id));
  assert(!isNodeUnlocked(profile, NODES[1].id));
  assert.throws(() => beginBattle(profile, { kind: 'expedition', nodeId: NODES[1].id, now }), /前一處/);
  assert.throws(() => beginBattle(profile, { kind: 'expedition', nodeId: 'unknown', now }), /找不到/);
  for (const node of NODES) {
    assert(isNodeUnlocked(profile, node.id));
    const started = beginBattle(profile, { kind: 'expedition', nodeId: node.id, now });
    assert.equal(started.profile.location, node.id);
    const result = finishBattle(started.profile, { encounterId: started.encounter.id, winner: 'player', now });
    assert(result.reward.firstClear);
    profile = result.profile;
  }
  assert.deepEqual(profile.cleared, NODES.map(node => node.id));
  assert.equal(hydrateProfile(profile, { now }).location, NODES[5].id);
});

test('expedition first clear and daily cache are paid once; repeat battles retain base rewards', () => {
  const node = NODES[0];
  const first = complete(fresh());
  assert.equal(first.reward.coins, node.winReward.coins + node.firstClearReward.coins + node.dailyReward.coins);
  assert.equal(first.reward.firstClear, true);
  assert.equal(first.reward.dailyCache, true);
  const repeat = complete(first.profile);
  assert.equal(repeat.reward.coins, node.winReward.coins);
  assert.equal(repeat.reward.firstClear, false);
  assert.equal(repeat.reward.dailyCache, false);
  const nextDay = complete(repeat.profile, { date: tomorrow });
  assert.equal(nextDay.reward.coins, node.winReward.coins + node.dailyReward.coins);
  assert.equal(nextDay.reward.firstClear, false);
  assert.equal(nextDay.reward.dailyCache, true);
});

test('expedition defeat and draw give modest base rewards without unlocking or consuming caches', () => {
  let profile = fresh();
  for (const winner of ['opponent', 'draw']) {
    const result = complete(profile, { winner });
    assert.equal(result.reward.coins, winner === 'draw' ? 35 : 20);
    assert.equal(result.reward.firstClear, false);
    assert.equal(result.reward.dailyCache, false);
    assert.deepEqual(result.profile.cleared, []);
    assert.deepEqual(result.profile.daily.expeditionCaches, []);
    assert.equal(result.profile.daily.expeditionWins, 0);
    profile = result.profile;
  }
});

test('pending battle is single-use; replay, second begin and invalid results cannot award', () => {
  const original = freeze(fresh());
  const started = beginBattle(original, { kind: 'arena', now });
  assert.equal(original.pending, null);
  assert.equal(started.profile.coins, original.coins);
  assert.throws(() => beginBattle(started.profile, { kind: 'arena', now }), /目前對局/);
  assert.throws(() => finishBattle(started.profile, { encounterId: 'bad', winner: 'player', now }), /找不到/);
  assert.throws(() => finishBattle(started.profile, { encounterId: started.encounter.id, winner: 'cheat', now }), /無效/);
  const completed = finishBattle(freeze(started.profile), { encounterId: started.encounter.id, winner: 'player', now });
  assert.equal(completed.profile.pending, null);
  assert.throws(() => finishBattle(completed.profile, { encounterId: started.encounter.id, winner: 'player', now }), /已結算/);
  const second = beginBattle(completed.profile, { kind: 'arena', now });
  assert.notEqual(second.encounter.id, started.encounter.id);
  assert.throws(() => finishBattle(second.profile, { encounterId: started.encounter.id, winner: 'player', now }), /已結算/);
});

test('abandoning never rewards and allows a new encounter without reusing its id', () => {
  const started = beginBattle(fresh(), { kind: 'expedition', nodeId: NODES[0].id, now });
  const abandoned = abandonBattle(freeze(started.profile));
  assert.equal(abandoned.coins, started.profile.coins);
  assert.equal(abandoned.stats.played, 0);
  assert.equal(abandoned.pending, null);
  assert.throws(() => finishBattle(abandoned, { encounterId: started.encounter.id, winner: 'player', now }), /已結算/);
  const next = beginBattle(abandoned, { kind: 'practice', now });
  assert.notEqual(next.encounter.id, started.encounter.id);
});

test('practice records completion and wins without paying battle currency or ladder points', () => {
  const profile = fresh();
  const result = complete(profile, { kind: 'practice' });
  assert.deepEqual(result.reward, { coins: 0, dust: 0, xp: 0, points: 0, firstClear: false, dailyCache: false, cardXP: [] });
  assert.equal(result.profile.coins, profile.coins);
  assert.deepEqual(result.profile.stats, { played: 1, won: 1 });
  assert.equal(result.profile.daily.matches, 1);
  assert.equal(result.profile.daily.arenaMatches, 0);
});

test('arena pays win/draw/loss points and its daily chest only after three completed games', () => {
  let profile = fresh();
  assert.throws(() => claimArenaChest(profile, now), /3 場/);
  for (const [winner, points] of [['player', 30], ['draw', 10], ['opponent', 5]]) {
    const result = complete(profile, { kind: 'arena', winner });
    assert.equal(result.reward.points, points);
    profile = result.profile;
  }
  assert.deepEqual(profile.arena, { points: 45, played: 3, won: 1 });
  assert.equal(profile.daily.arenaMatches, 3);
  const claimed = claimArenaChest(freeze(profile), now);
  assert.equal(claimed.coins, profile.coins + ARENA_CHEST_REWARD.coins);
  assert.throws(() => claimArenaChest(claimed, now), /已領取/);
  assert.throws(() => claimArenaChest(claimed, yesterday), /已領取/);
  assert.throws(() => claimArenaChest(claimed, tomorrow), /3 場/);
});

test('battle spanning midnight counts completion toward the new day', () => {
  const started = beginBattle(fresh(), { kind: 'arena', now });
  const finished = finishBattle(started.profile, { encounterId: started.encounter.id, winner: 'player', now: tomorrow });
  assert.equal(finished.profile.daily.date, '2026-09-22');
  assert.equal(finished.profile.daily.arenaMatches, 1);
  assert.equal(finished.profile.daily.matches, 1);
});

test('saved decks are validated, copied and cannot refer to an unowned card', () => {
  const original = freeze(fresh());
  const deck = [...defaultDeckIds].reverse();
  const saved = saveDeck(original, deck);
  assert.deepEqual(saved.deck, deck);
  deck.pop();
  assert.equal(saved.deck.length, 8);
  assert.deepEqual(original.deck, defaultDeckIds);
  assert.throws(() => saveDeck(original, ['qingxiao']), /8 張/);
  const unavailable = fresh(); unavailable.instances = unavailable.instances.filter(instance => instance.cardId !== 'qingxiao');
  assert.throws(() => saveDeck(unavailable, defaultDeckIds), RangeError);
});

test('hero and arena labels are stable at progression boundaries', () => {
  const profile = fresh();
  assert.equal(getHeroLevel(profile), 1);
  profile.xp = 100;
  assert.equal(getHeroLevel(profile), 2);
  assert.equal(getArenaRank(profile).minimum, 0);
  assert.equal(getArenaRank(profile).next.minimum, 100);
  profile.arena.points = 100;
  assert.equal(getArenaRank(profile).name, '青銅弈者');
  profile.arena.points = 2500;
  assert.equal(getArenaRank(profile).next, null);
});

test('v2 shared ranks migrate to every distinct copy once, while v2 remains a separate backup key', () => {
  const old = legacy();
  old.inventory.qingxiao = 3;
  old.levels.qingxiao = 4;
  old.coins = 777; old.stats = { played: 11, won: 6 };
  const migrated = hydrateProfile(freeze(old), { now });
  assert.equal(PROFILE_KEY, 'shanhai.profile.v3');
  assert.equal(LEGACY_PROFILE_KEY, 'shanhai.profile.v2');
  assert.equal(migrated.version, 3);
  assert.equal(getInstances(migrated, 'qingxiao').length, 3);
  assert(getInstances(migrated, 'qingxiao').every(card => card.level === 4 && card.xp === 400));
  assert.equal(new Set(migrated.instances.map(card => card.uid)).size, migrated.instances.length);
  assert.equal(migrated.coins, 777);
  assert.deepEqual(migrated.stats, old.stats);
  assert.deepEqual(migrated.deck, old.deck);
  assert.deepEqual(hydrateProfile(migrated, { now: tomorrow }).instances, migrated.instances);
  assert.equal(old.version, 2);
  assert.equal(old.instances, undefined);
});

test('v3 canonical records ignore inflated counters and never remint a missing or empty backpack', () => {
  const raw = fresh();
  raw.inventory.qingxiao = 80;
  raw.inventory.huangdi = 3;
  raw.levels.qingxiao = 5;
  let restored = hydrateProfile(freeze(raw), { now });
  assert.equal(restored.inventory.qingxiao, 1);
  assert.equal(restored.inventory.huangdi, 0);
  assert.equal(restored.levels.qingxiao, 1);
  const empty = { ...raw, instances: [], deckSlots: [], activeDeckId: null };
  restored = hydrateProfile(empty, { now });
  assert.equal(restored.instances.length, 0);
  assert(Object.values(restored.inventory).every(count => count === 0));
  const missing = { ...empty }; delete missing.instances;
  assert.equal(hydrateProfile(missing, { now }).instances.length, 0);
});

test('packs and fresh NPC stock mint unique level-one copies beside trained copies', () => {
  let profile = fresh(); profile.coins = 10_000;
  const originalUID = getPreferredInstance(profile, 'qingxiao').uid;
  profile = setInstanceXP(profile, originalUID, 700);
  const result = buyPack(freeze(profile), { rng: () => 0, now });
  assert.equal(new Set(result.cards.map(card => card.instanceId)).size, 3);
  for (const card of result.cards) {
    const instance = getInstance(result.profile, card.instanceId);
    assert.equal(instance.cardId, card.cardId);
    assert.equal(instance.level, 1);
    assert.equal(instance.xp, 0);
    assert.equal(instance.origin, 'pack:all');
  }
  assert.equal(getInstance(result.profile, originalUID).level, 5);
  profile = result.profile;
  const offer = getMarket(profile, now).find(item => profile.inventory[item.cardId] > 0);
  const oldUID = getPreferredInstance(profile, offer.cardId).uid;
  profile = setInstanceXP(profile, oldUID, 700);
  const existingUIDs = new Set(profile.instances.map(card => card.uid));
  const purchased = buyCard(profile, offer.cardId, now);
  const gained = purchased.instances.filter(card => !existingUIDs.has(card.uid));
  assert.equal(gained.length, 1);
  assert.equal(gained[0].cardId, offer.cardId);
  assert.equal(gained[0].level, 1);
  assert.equal(gained[0].xp, 0);
  assert.equal(gained[0].origin, 'npc-market');
  assert.equal(getInstance(purchased, oldUID).level, 5);
});

test('exact-copy training upgrades only its UID and character wrappers prefer the active copy', () => {
  let profile = fresh(); profile.coins = 10_000; profile.dust = 1000;
  const activeUID = getPreferredInstance(profile, 'qingxiao').uid;
  const minted = mintInstance(profile, 'qingxiao', { now });
  const secondUID = minted.instance.uid;
  profile = setInstanceXP(minted.profile, secondUID, 200);
  assert.equal(getUpgradeCost(profile, 'qingxiao').instanceId, activeUID);
  profile = upgradeCard(profile, 'qingxiao');
  assert.equal(getInstance(profile, activeUID).xp, 80);
  assert.equal(getInstance(profile, secondUID).xp, 200);
  const coins = profile.coins;
  profile = upgradeInstance(profile, secondUID);
  assert.equal(profile.coins, coins - 360);
  assert.equal(getInstance(profile, secondUID).level, 4);
  assert.equal(getInstance(profile, activeUID).level, 2);
  profile = trainInstance(profile, secondUID, now);
  assert.equal(getInstance(profile, secondUID).level, 5);
  assert.equal(getInstance(profile, activeUID).level, 2);
  assert.equal(profile.daily.trainingUsed, true);
  assert.equal(profile.levels.qingxiao, 2, 'compatibility level follows the active copy');
});

test('sale and later buyback preserve the exact UID, XP, rank, provenance and battle record', () => {
  let profile = fresh();
  const minted = mintInstance(profile, 'qingxiao', { source: 'pack:all', now });
  const uid = minted.instance.uid;
  profile = setInstanceXP(minted.profile, uid, 215);
  profile = awardInstanceXP(profile, [uid], 12, { win: true }).profile;
  const before = getInstance(profile, uid);
  const quote = getInstanceSale(profile, uid);
  assert.deepEqual(quote, { sellPrice: 100, buybackPrice: 125, reason: null });
  const sold = sellInstance(freeze(profile), uid, now);
  assert.equal(sold.coins, profile.coins + quote.sellPrice);
  assert(!sold.instances.some(instance => instance.uid === uid));
  assert.deepEqual(sold.merchantVault[0].instance, before);
  assert.equal(sold.merchantVault[0].soldAt, '2026-09-21T12:00:00.000Z');
  assert.throws(() => sellInstance(sold, uid, now), RangeError);
  const reloaded = hydrateProfile(sold, { now: tomorrow });
  assert.deepEqual(reloaded.merchantVault, sold.merchantVault);
  const recovered = buybackInstance(freeze(reloaded), uid, tomorrow);
  assert.deepEqual(getInstance(recovered, uid), before);
  assert.equal(recovered.coins, sold.coins - quote.buybackPrice);
  assert.equal(recovered.merchantVault.length, 0);
  assert.equal(recovered.instances.filter(instance => instance.uid === uid).length, 1);
  assert.throws(() => buybackInstance(recovered, uid, tomorrow), /已取回/);
  assert(recovered.coins < profile.coins, 'round-trip buyback pays a fee rather than creating coins');
});

test('buyback insufficient funds is atomic and vault custody survives later card minting', () => {
  const minted = mintInstance(fresh(), 'qingxiao', { now });
  const uid = minted.instance.uid;
  const sold = sellInstance(minted.profile, uid, now);
  const poor = freeze({ ...sold, coins: 0 });
  assert.throws(() => buybackInstance(poor, uid, tomorrow), /金幣不足/);
  assert.deepEqual(poor.merchantVault, sold.merchantVault);
  const newCard = mintInstance(hydrateProfile(sold, { now }), 'qingxiao', { now });
  assert.notEqual(newCard.instance.uid, uid);
  assert(newCard.profile.instanceSerial > sold.instanceSerial);
});

test('sale respects every saved deck, locks, current battle and the last owned copy', () => {
  const initial = fresh();
  const activeUID = getPreferredInstance(initial, 'qingxiao').uid;
  const minted = mintInstance(initial, 'qingxiao', { now });
  const spareUID = minted.instance.uid;
  assert.throws(() => sellInstance(minted.profile, activeUID, now), /牌組/);
  const locked = toggleInstanceLock(minted.profile, spareUID);
  assert.throws(() => sellInstance(locked, spareUID, now), /鎖定/);
  const alternate = getActiveDeck(minted.profile).instanceIds.map(uid => uid === activeUID ? spareUID : uid);
  const stored = saveInstanceDeck(minted.profile, { slotId: 'deck-2', name: '副陣', instanceIds: alternate });
  assert.throws(() => sellInstance(stored, spareUID, now), /牌組/);
  const started = beginBattle(stored, { kind: 'arena', now });
  assert.throws(() => sellInstance(started.profile, activeUID, now), /未完對局/);
  assert.throws(() => upgradeInstance(started.profile, activeUID), /正在出戰/);
  assert.throws(() => trainInstance(started.profile, activeUID, now), /正在出戰/);
  const spareRole = getPreferredInstance(initial, 'yunya').uid;
  assert.throws(() => sellInstance(initial, spareRole, now), /最後一張/);
});

test('character sale convenience chooses the least-trained eligible copy', () => {
  let profile = fresh();
  const trained = mintInstance(profile, 'qingxiao', { now });
  profile = setInstanceXP(trained.profile, trained.instance.uid, 200);
  const novice = mintInstance(profile, 'qingxiao', { now });
  const sold = sellCard(novice.profile, 'qingxiao', now);
  assert.equal(sold.merchantVault[0].instance.uid, novice.instance.uid);
  assert.equal(getInstance(sold, trained.instance.uid).xp, 200);
});

test('battle XP follows the frozen original UID after active deck switches to another copy', () => {
  let profile = fresh();
  const originalUID = getPreferredInstance(profile, 'qingxiao').uid;
  profile = setInstanceXP(profile, originalUID, 70);
  const minted = mintInstance(profile, 'qingxiao', { now });
  const otherUID = minted.instance.uid;
  profile = setInstanceXP(minted.profile, otherUID, 200);
  const alternate = getActiveDeck(profile).instanceIds.map(uid => uid === originalUID ? otherUID : uid);
  profile = saveInstanceDeck(profile, { slotId: 'deck-2', name: '另一青霄', instanceIds: alternate });
  const started = beginBattle(profile, { kind: 'expedition', nodeId: NODES[0].id, now });
  assert.equal(started.profile.pending.cardInstances.qingxiao, originalUID);
  const switched = activateDeck(started.profile, 'deck-2');
  assert.equal(switched.levels.qingxiao, 3);
  const reloaded = hydrateProfile(switched, { now });
  assert.equal(reloaded.pending.cardInstances.qingxiao, originalUID);
  const finished = finishBattle(freeze(reloaded), { encounterId: started.encounter.id, winner: 'player', playedCardIds: ['qingxiao'], now });
  const used = getInstance(finished.profile, originalUID);
  assert.equal(used.xp, 90);
  assert.equal(used.level, 2);
  assert.equal(used.battles, 1); assert.equal(used.wins, 1);
  assert.equal(getInstance(finished.profile, otherUID).xp, 200);
  assert.equal(getInstance(finished.profile, otherUID).battles, 0);
  assert.equal(getPreferredInstance(finished.profile, 'chiling').battles, 0);
  assert.deepEqual(finished.reward.cardXP, [{ uid: originalUID, cardId: 'qingxiao', beforeXP: 70, afterXP: 90, beforeLevel: 1, afterLevel: 2, gainedXP: 20 }]);
  assert.throws(() => finishBattle(finished.profile, { encounterId: started.encounter.id, winner: 'player', playedCardIds: ['qingxiao'], now }), /已結算/);
});

test('XP only awards actual valid played IDs; practice records usage without XP', () => {
  for (const [kind, winner, expected] of [['expedition', 'opponent', 12], ['expedition', 'draw', 12], ['arena', 'player', 12], ['arena', 'draw', 8], ['arena', 'opponent', 8], ['practice', 'player', 0]]) {
    const started = beginBattle(fresh(), { kind, nodeId: NODES[0].id, now });
    const result = finishBattle(started.profile, { encounterId: started.encounter.id, winner, playedCardIds: ['qingxiao', 'chiling'], now });
    assert.equal(result.reward.cardXP.length, 2);
    for (const cardId of ['qingxiao', 'chiling']) {
      const instance = getInstance(result.profile, started.encounter.cardInstances[cardId]);
      assert.equal(instance.xp, expected); assert.equal(instance.battles, 1);
      assert.equal(instance.wins, winner === 'player' ? 1 : 0);
    }
    assert.equal(getPreferredInstance(result.profile, 'shuangli').battles, 0);
  }
  const started = beginBattle(fresh(), { kind: 'arena', now });
  for (const playedCardIds of [['qingxiao', 'qingxiao'], defaultDeckIds.slice(0, 5), ['huangdi'], 'qingxiao']) {
    assert.throws(() => finishBattle(started.profile, { encounterId: started.encounter.id, winner: 'player', playedCardIds, now }), /出戰卡牌/);
  }
  assert.equal(started.profile.stats.played, 0);
  assert.equal(getPreferredInstance(started.profile, 'qingxiao').xp, 0);
});

test('legacy pending migration pins exact deck copies so an old battle can settle once', () => {
  const old = legacy(); old.serial = 12;
  old.pending = { id: 'battle-12', kind: 'arena', nodeId: null };
  old.inventory.qingxiao = 2; old.levels.qingxiao = 2;
  const restored = hydrateProfile(old, { now });
  assert.equal(restored.pending.instanceIds.length, 8);
  assert.equal(Object.keys(restored.pending.cardInstances).length, 8);
  const result = finishBattle(restored, { encounterId: old.pending.id, winner: 'player', playedCardIds: ['qingxiao'], now });
  assert.equal(getInstance(result.profile, restored.pending.cardInstances.qingxiao).xp, 92);
  assert.deepEqual(getInstances(result.profile, 'qingxiao').map(instance => instance.xp).sort((a, b) => a - b), [80, 92]);
  assert.equal(result.profile.pending, null);
});

test('v2 resume retains the original hand after the saved deck changed during battle', () => {
  const old = legacy(); old.serial = 13;
  old.pending = { id: 'battle-13', kind: 'expedition', nodeId: NODES[0].id };
  old.inventory.qingxiao = 2; old.levels.qingxiao = 2;
  old.stats = { played: 9, won: 4 }; old.arena = { points: 330, played: 12, won: 8 };
  old.deck = old.deck.map(id => id === 'qingxiao' ? 'kongzi' : id);
  const hand = defaultDeckIds.slice(0, 4);
  const legacyBattle = freeze({ encounter: { ...old.pending }, match: { player: { hand, used: ['qingxiao'] } } });
  const fallback = hydrateProfile(old, { now });
  const restored = hydrateProfile(freeze(old), { now, legacyBattle });
  assert.deepEqual(restored.deck, old.deck, 'migration preserves the currently saved active deck');
  assert.deepEqual(restored.deckSlots, fallback.deckSlots);
  assert.deepEqual(restored.instances, fallback.instances, 'reconciliation never mints or changes ranks');
  assert.deepEqual(restored.stats, old.stats); assert.deepEqual(restored.arena, old.arena);
  const pinnedRoles = restored.pending.instanceIds.map(uid => getInstance(restored, uid).cardId);
  assert(validateDeck(pinnedRoles).valid);
  assert(hand.every(id => pinnedRoles.includes(id)));
  assert.deepEqual(pinnedRoles.slice(4), ['yanxin', 'cuixian', 'yunya', 'lindaiyu']);
  assert.equal(restored.pending.cardInstances.qingxiao, getInstances(restored, 'qingxiao')[0].uid);
  assert.deepEqual(hydrateProfile(old, { now, legacyBattle }).pending, restored.pending, 'copy and filler selection is deterministic');
  const reloaded = hydrateProfile(restored, { now, legacyBattle });
  assert.deepEqual(reloaded.pending, restored.pending, 'canonical reload retains the inferred exact snapshot');
  const result = finishBattle(reloaded, { encounterId: old.pending.id, winner: 'player', playedCardIds: hand, now });
  assert.deepEqual(result.reward.cardXP.map(change => change.cardId), hand);
  assert.deepEqual(getInstances(result.profile, 'qingxiao').map(instance => instance.xp), [100, 80]);
  assert.equal(result.profile.stats.played, 10); assert.equal(result.profile.stats.won, 5);
  assert.deepEqual(result.profile.deck, old.deck);
  assert.throws(() => finishBattle(result.profile, { encounterId: old.pending.id, winner: 'player', playedCardIds: hand, now }), /已結算/);
});

test('v2 hand reconciliation keeps a matching active deck and ignores invalid or unrelated snapshots', () => {
  const old = legacy(); old.serial = 14;
  old.pending = { id: 'battle-14', kind: 'arena', nodeId: null };
  const snapshot = hand => ({ encounter: { ...old.pending }, match: { player: { hand } } });
  const expected = hydrateProfile(old, { now });
  assert.deepEqual(hydrateProfile(old, { now, legacyBattle: snapshot(defaultDeckIds.slice(0, 4)) }).pending.instanceIds, getActiveDeck(expected).instanceIds);
  for (const legacyBattle of [
    undefined, null, {},
    { ...snapshot(defaultDeckIds.slice(0, 4)), encounter: { id: 'battle-99' } },
    snapshot('qingxiao'), snapshot(['qingxiao']), snapshot([...defaultDeckIds.slice(0, 3), 'qingxiao']),
    snapshot([...defaultDeckIds.slice(0, 3), 'missing']), snapshot([...defaultDeckIds.slice(0, 3), 'pangu']),
  ]) assert.deepEqual(hydrateProfile(old, { now, legacyBattle }).pending, expected.pending);
  const canonical = beginBattle(fresh(), { kind: 'arena', now }).profile;
  const unrelated = { encounter: { id: canonical.pending.id }, match: { player: { hand: ['wukong', 'guanyu', 'lindaiyu', 'kongzi'] } } };
  assert.deepEqual(hydrateProfile(canonical, { now, legacyBattle: unrelated }).pending, canonical.pending, 'legacy data never rewrites v3 snapshots');
});
