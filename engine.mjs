/** Pure, deterministic combat. Randomness is confined to the draw and AI choices. */
import { WX01_CARDS } from './wx01-cards.mjs';

const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

export const RULES = freeze({ life: 12, pills: 12, rounds: 4, deckSize: 8, starLimit: 25, furyCost: 3, furyDamage: 2 });
const effect = (type, value, label, description) => ({ type, value, label, description });

export const FACTIONS = freeze({
  yun: { name: '雲闕', color: '#d9c58a', icon: '☀', bonus: effect('attack', 6, '天光 · 攻擊 +6', '同族共鳴：自身攻擊力 +6。') },
  ember: { name: '赤燼', color: '#ec8268', icon: '焰', bonus: effect('damage', 1, '燎原 · 傷害 +1', '同族共鳴：自身傷害 +1。') },
  moon: { name: '月隱', color: '#b5a5e5', icon: '☾', bonus: effect('opponentAttack', 6, '月蝕 · 敵攻擊 −6', '同族共鳴：對手攻擊力 −6，最低為 1。') },
  grove: { name: '森羅', color: '#89c9a1', icon: '❧', bonus: effect('reduceDamage', 1, '生息 · 受傷 −1', '同族共鳴：落敗時受到的傷害 −1，最低為 1。') },
});

export const LEGACY_CARDS = freeze([
  { id: 'qingxiao', name: '青霄', title: '天門劍守', faction: 'yun', power: 7, damage: 4, stars: 3, art: 0,
    ability: effect('power', 1, '凌霄 · 力量 +1', '自身力量 +1；加成在仙丹倍率之前計算。'), lore: '她守的不是天門，是凡人抬頭時仍能看見的那片晴空。' },
  { id: 'chiling', name: '赤翎', title: '逐日槍使', faction: 'ember', power: 7, damage: 5, stars: 4, art: 1,
    ability: effect('attack', 6, '破曉 · 攻擊 +6', '計算仙丹倍率後，自身攻擊力 +6。'), lore: '鳳羽繫在槍尾，每一次出征都像第一次迎向黎明。' },
  { id: 'shuangli', name: '霜璃', title: '九尾問心', faction: 'moon', power: 7, damage: 3, stars: 3, art: 2,
    ability: effect('stopAbility', 0, '照心 · 封鎖技能', '封鎖對手的角色技能，不影響同族共鳴；雙方封鎖同時生效。'), lore: '九尾藏着九段往事，她卻只問你此刻想守護甚麼。' },
  { id: 'cangjiao', name: '蒼角', title: '千林古衛', faction: 'grove', power: 7, damage: 5, stars: 4, art: 3,
    ability: effect('reduceDamage', 2, '山蔭 · 受傷 −2', '落敗時受到的傷害 −2，最低為 1。可與同族共鳴疊加。'), lore: '古鹿每長出一枝新角，荒山便多一片可以歇息的綠蔭。' },
  { id: 'yaoheng', name: '曜衡', title: '星環丹師', faction: 'yun', power: 7, damage: 3, stars: 3, art: 4,
    ability: effect('healOnWin', 2, '回元 · 勝利回復 2', '贏得本回合後回復 2 點生命，最多回復至 12。'), lore: '他把星辰的軌跡煉成金環，只為尋回一味失傳的春天。' },
  { id: 'yanxin', name: '焰心', title: '不熄行者', faction: 'ember', power: 7, damage: 2, stars: 2, art: 5,
    ability: effect('refundOnLoss', 2, '餘燼 · 敗北回丹 2', '落敗後獲得 2 顆仙丹，最多持有 12 顆；即使本回合沒有加丹也生效。'), lore: '她數過萬顆念珠，始終相信最小的火光也能等到天明。' },
  { id: 'duying', name: '渡影', title: '無岸舟人', faction: 'moon', power: 6, damage: 4, stars: 3, art: 6,
    ability: effect('opponentPower', 1, '迷渡 · 敵力量 −1', '對手力量 −1，最低為 1；在仙丹倍率之前計算。'), lore: '沒有岸的河上，他仍為每一個迷路的人留着一盞燈。' },
  { id: 'cuixian', name: '翠弦', title: '聽風游俠', faction: 'grove', power: 6, damage: 2, stars: 2, art: 7,
    ability: effect('attack', 8, '穿葉 · 攻擊 +8', '計算仙丹倍率後，自身攻擊力 +8。'), lore: '風替她瞄準，落葉替她保守秘密。' },
  { id: 'xuanjian', name: '玄箋', title: '雲上記夢', faction: 'yun', power: 6, damage: 5, stars: 4, art: 8,
    ability: effect('stopAbility', 0, '定符 · 封鎖技能', '封鎖對手的角色技能，不影響同族共鳴；雙方封鎖同時生效。'), lore: '她寫了百年的符，最後一張仍空着，等世界自己寫下答案。' },
  { id: 'jinlin', name: '燼麟', title: '熔山瑞獸', faction: 'ember', power: 6, damage: 6, stars: 4, art: 9,
    ability: effect('power', 2, '熔脈 · 力量 +2', '自身力量 +2；加成在仙丹倍率之前計算。'), lore: '玄石裂開的地方透出金光，那是群山尚未冷卻的心。' },
  { id: 'zhimeng', name: '織夢', title: '銀河裁縫', faction: 'moon', power: 7, damage: 2, stars: 3, art: 10,
    ability: effect('damage', 2, '斷夢 · 傷害 +2', '自身傷害 +2。'), lore: '她把散落的夢縫成藍色衣裳，卻從不替人決定醒來的方向。' },
  { id: 'yunya', name: '雲牙', title: '初晴幼靈', faction: 'grove', power: 6, damage: 2, stars: 2, art: 11,
    ability: effect('healOnWin', 1, '暖爪 · 勝利回復 1', '贏得本回合後回復 1 點生命，最多回復至 12。'), lore: '小虎還不懂甚麼是戰爭，只知道要把受傷的朋友帶回家。' },
  { id: 'huangdi', name: '黃帝', title: '軒轅御世', faction: 'yun', power: 7, damage: 5, stars: 4, art: 0, artSet: 'classics', source: '上古傳說',
    ability: effect('healOnWin', 2, '濟世 · 勝利回復 2', '贏得本回合後回復 2 點生命，最多回復至 12。'), lore: '金色車轍穿過風沙，他記得的不只有勝仗，還有戰後第一縷炊煙。' },
  { id: 'wukong', name: '孫悟空', title: '齊天行者', faction: 'ember', power: 7, damage: 6, stars: 5, art: 1, artSet: 'classics', source: '西遊記',
    ability: effect('stopAbility', 0, '破妄 · 封鎖技能', '封鎖對手的角色技能，不影響同族共鳴；雙方封鎖同時生效。'), lore: '金箍棒挑開雲海，他仍帶着花果山的風，走向尚未走完的路。' },
  { id: 'lindaiyu', name: '林黛玉', title: '瀟湘聽雨', faction: 'moon', power: 6, damage: 2, stars: 2, art: 2, artSet: 'classics', source: '紅樓夢',
    ability: effect('reduceDamage', 2, '惜花 · 受傷 −2', '落敗時受到的傷害 −2，最低為 1。可與同族共鳴疊加。'), lore: '她拾起雨後的花瓣，把無人肯聽的心事，寫成不向風低頭的詩。' },
  { id: 'pangu', name: '盤古', title: '開天巨靈', faction: 'grove', power: 6, damage: 7, stars: 5, art: 3, artSet: 'classics', source: '上古傳說',
    ability: effect('power', 1, '開闢 · 力量 +1', '自身力量 +1；加成在仙丹倍率之前計算。'), lore: '天地初分時，他把漫長的沉默撐成群山，讓萬物終於有了伸展的地方。' },
  { id: 'kongzi', name: '孔子', title: '杏壇問道', faction: 'yun', power: 6, damage: 2, stars: 2, art: 4, artSet: 'classics', source: '先秦典籍',
    ability: effect('healOnWin', 2, '仁心 · 勝利回復 2', '贏得本回合後回復 2 點生命，最多回復至 12。'), lore: '車馬再遠，也載不盡求知的人。他在路旁展開竹簡，讓每個問題都有座位。' },
  { id: 'guanyu', name: '關羽', title: '長髯義行', faction: 'ember', power: 7, damage: 4, stars: 3, art: 5, artSet: 'classics', source: '三國演義',
    ability: effect('damage', 1, '斬浪 · 傷害 +1', '自身傷害 +1。'), lore: '青龍刀映着渡口月色。千里路上，他衡量承諾的分量，從不用金銀。' },
  { id: 'wangxifeng', name: '王熙鳳', title: '鳳辣掌局', faction: 'moon', power: 7, damage: 3, stars: 3, art: 6, artSet: 'classics', source: '紅樓夢',
    ability: effect('refundOnLoss', 2, '回籌 · 敗北回丹 2', '落敗後獲得 2 顆仙丹，最多持有 12 顆；即使本回合沒有加丹也生效。'), lore: '珠簾才響，局勢已在她心中過了一遍。失去一著，未必失去餘下的棋。' },
  { id: 'luzhishen', name: '魯智深', title: '禪杖撼林', faction: 'grove', power: 6, damage: 4, stars: 3, art: 7, artSet: 'classics', source: '水滸傳',
    ability: effect('power', 2, '拔山 · 力量 +2', '自身力量 +2；加成在仙丹倍率之前計算。'), lore: '禪杖沉重，心卻容不得旁人受苦。他一聲大笑，驚落滿樹春雨。' },
  { id: 'zhugeliang', name: '諸葛亮', title: '臥龍觀星', faction: 'yun', power: 7, damage: 3, stars: 3, art: 8, artSet: 'classics', source: '三國演義',
    ability: effect('opponentAttack', 4, '空城 · 敵攻擊 −4', '計算仙丹倍率後，對手攻擊力 −4，最低為 1。'), lore: '羽扇掠過沙盤，他留下一處空白，等對手親手填上猶疑。' },
  { id: 'nezha', name: '哪吒', title: '蓮火飛輪', faction: 'ember', power: 6, damage: 4, stars: 3, art: 9, artSet: 'classics', source: '封神演義',
    ability: effect('attack', 8, '疾輪 · 攻擊 +8', '計算仙丹倍率後，自身攻擊力 +8。'), lore: '風火輪劃亮夜空，混天綾掠過長街。少年把不服輸的心，煉成向前的火。' },
  { id: 'diaochan', name: '貂蟬', title: '閉月離弦', faction: 'moon', power: 7, damage: 2, stars: 2, art: 10, artSet: 'classics', source: '三國演義',
    ability: effect('opponentPower', 1, '離間 · 敵力量 −1', '對手力量 −1，最低為 1；在仙丹倍率之前計算。'), lore: '宴席上的一曲尚未終，兩顆猜疑的心已各自轉向。她把自己的路藏在弦音之間。' },
  { id: 'wusong', name: '武松', title: '景陽行者', faction: 'grove', power: 7, damage: 3, stars: 3, art: 11, artSet: 'classics', source: '水滸傳',
    ability: effect('damage', 2, '伏虎 · 傷害 +2', '自身傷害 +2。'), lore: '山風捲起酒旗，他迎着林間低吼站定。往前一步，是膽識，也是退無可退的決心。' },
]);

// These ordered legacy pools also define starter ownership and old pack draws.
// Never derive them from the expanding catalogue or a new artSet.
export const LEGACY_CARD_IDS = freeze(LEGACY_CARDS.map(card => card.id));
export const ORIGINAL_CARD_IDS = freeze(LEGACY_CARDS.filter((card) => card.artSet !== 'classics').map((card) => card.id));
export const CLASSIC_CARD_IDS = freeze(LEGACY_CARDS.filter((card) => card.artSet === 'classics').map((card) => card.id));
export const defaultDeckIds = freeze(ORIGINAL_CARD_IDS.slice(0, 8));
export const CARDS = freeze([...LEGACY_CARDS, ...WX01_CARDS]);
const cardsById = new Map(CARDS.map((card) => [card.id, card]));

export function getCard(id) {
  const card = cardsById.get(id);
  if (!card) throw new RangeError(`Unknown card: ${String(id)}`);
  return card;
}

const LEVEL_BONUSES = freeze([[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]]);
const battleCardsById = new Map(CARDS.map((card) => [card.id, LEVEL_BONUSES.map(([power, damage], index) => freeze({
  ...card, power: card.power + power, damage: card.damage + damage,
  level: index + 1, basePower: card.power, baseDamage: card.damage,
}))]));

function validateLevel(level) {
  if (!Number.isInteger(level) || level < 1 || level > LEVEL_BONUSES.length) {
    throw new RangeError('Card levels must be integers from 1 to 5.');
  }
  return level;
}

function normalizeLevels(levels) {
  if (!levels || typeof levels !== 'object' || Array.isArray(levels)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(levels))) {
    throw new TypeError('Card levels must be an object mapping known card IDs to levels.');
  }
  const normalized = Object.fromEntries(CARDS.map((card) => [card.id, 1]));
  for (const [id, level] of Object.entries(levels)) {
    getCard(id);
    normalized[id] = validateLevel(level);
  }
  return freeze(normalized);
}

/** Collection ranks affect expedition only. The returned frozen card contains effective battle stats. */
export function getBattleCard(state, side, cardId) {
  otherSide(side);
  getCard(cardId);
  const levels = side === 'player' ? state.playerLevels : state.opponentLevels;
  const level = state.mode === 'expedition' ? validateLevel(levels?.[cardId] ?? 1) : 1;
  return battleCardsById.get(cardId)[level - 1];
}

export function validateDeck(ids) {
  const errors = [];
  if (!Array.isArray(ids)) return { valid: false, errors: ['牌組必須是卡牌列表。'], stars: 0 };
  if (ids.length !== RULES.deckSize) errors.push('牌組必須正好有 8 張卡。');
  if (new Set(ids).size !== ids.length) errors.push('同一張卡不能重複加入。');
  let stars = 0;
  for (const id of ids) {
    if (!cardsById.has(id)) errors.push(`找不到卡牌：${String(id)}`);
    else stars += getCard(id).stars;
  }
  if (stars > RULES.starLimit) errors.push('牌組總星數不能超過 25。');
  return { valid: errors.length === 0, errors, stars };
}

function randomUnit(rng) {
  const value = rng();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('rng must return a number in [0, 1).');
  return value;
}

function drawHand(ids, rng) {
  const validation = validateDeck(ids);
  if (!validation.valid) throw new RangeError(validation.errors.join(' '));
  const shuffled = [...ids];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = Math.floor(randomUnit(rng) * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled.slice(0, RULES.rounds);
}

export function createMatch({
  deckIds = defaultDeckIds, opponentDeckIds = defaultDeckIds, rng = Math.random,
  mode = 'practice', playerLevels = {}, opponentLevels = {}, opponentName = null,
} = {}) {
  if (!['arena', 'expedition', 'practice'].includes(mode)) throw new RangeError('Unknown match mode.');
  const normalizedPlayerLevels = normalizeLevels(playerLevels);
  const normalizedOpponentLevels = normalizeLevels(opponentLevels);
  if (opponentName !== null && typeof opponentName !== 'string') throw new TypeError('Opponent name must be a string.');
  const playerHand = drawHand(deckIds, rng);
  const opponentHand = drawHand(opponentDeckIds, rng);
  const starSum = (hand) => hand.reduce((sum, id) => sum + getCard(id).stars, 0);
  const difference = starSum(playerHand) - starSum(opponentHand);
  const initiative = difference === 0 ? (randomUnit(rng) < 0.5 ? 'player' : 'opponent') : (difference > 0 ? 'player' : 'opponent');
  return {
    mode, playerLevels: normalizedPlayerLevels, opponentLevels: normalizedOpponentLevels, opponentName,
    player: { hp: RULES.life, pills: RULES.pills, hand: playerHand, used: [] },
    opponent: { hp: RULES.life, pills: RULES.pills, hand: opponentHand, used: [] },
    round: 1, initiative, history: [], status: 'playing', winner: null, lastResult: null,
  };
}

function otherSide(side) {
  if (side !== 'player' && side !== 'opponent') throw new RangeError(`Unknown side: ${String(side)}`);
  return side === 'player' ? 'opponent' : 'player';
}

export function hasFactionBonus(state, side, cardId) {
  otherSide(side);
  const faction = getCard(cardId).faction;
  const names = new Set(state[side].hand.map(getCard).filter((card) => card.faction === faction).map((card) => card.name));
  return names.size >= 2;
}

function validateMove(state, side, move) {
  otherSide(side);
  if (state.status !== 'playing') throw new RangeError('The match is already finished.');
  if (!move || typeof move !== 'object') throw new TypeError('A move is required.');
  const card = getCard(move.cardId);
  const owner = state[side];
  if (!owner.hand.includes(card.id)) throw new RangeError('The card is not in this hand.');
  if (owner.used.includes(card.id)) throw new RangeError('This card has already been used.');
  const pills = move.pills ?? 0;
  const fury = move.fury ?? false;
  if (!Number.isInteger(pills) || pills < 0) throw new RangeError('Pills must be a non-negative integer.');
  if (typeof fury !== 'boolean') throw new TypeError('Fury must be true or false.');
  const cost = pills + (fury ? RULES.furyCost : 0);
  if (cost > owner.pills) throw new RangeError('Not enough pills for this move.');
  return { cardId: card.id, pills, fury, cost };
}

function activeEffects(state, side, card, abilityActive) {
  const effects = [];
  if (abilityActive) effects.push(card.ability);
  if (hasFactionBonus(state, side, card.id)) effects.push(FACTIONS[card.faction].bonus);
  return effects;
}

const totalEffect = (effects, type) => effects.reduce((sum, item) => sum + (item.type === type ? item.value : 0), 0);

function calculateMove(state, side, move, enemyCard = null) {
  const checked = validateMove(state, side, move);
  const card = getBattleCard(state, side, checked.cardId);
  const enemy = otherSide(side);
  // Suppression is simultaneous. It only cancels the character ability, never a faction bonus.
  const abilityActive = enemyCard?.ability.type !== 'stopAbility';
  const effects = activeEffects(state, side, card, abilityActive);
  const enemyEffects = enemyCard ? activeEffects(state, enemy, enemyCard, card.ability.type !== 'stopAbility') : [];
  const power = Math.max(1, card.power + totalEffect(effects, 'power') - totalEffect(enemyEffects, 'opponentPower'));
  const attack = Math.max(1, power * (1 + checked.pills) + totalEffect(effects, 'attack') - totalEffect(enemyEffects, 'opponentAttack'));
  const damage = Math.max(1, card.damage + totalEffect(effects, 'damage') + (checked.fury ? RULES.furyDamage : 0) - totalEffect(enemyEffects, 'reduceDamage'));
  const bonusActive = hasFactionBonus(state, side, card.id);
  const notes = [];
  if (abilityActive) notes.push(card.ability.label);
  else notes.push(`${card.ability.label}（被封鎖）`);
  if (bonusActive) notes.push(FACTIONS[card.faction].bonus.label);
  if (checked.fury) notes.push('怒擊 · 額外消耗 3 丹，傷害 +2');
  return { ...checked, card, power, attack, damage, bonusActive, abilityActive, notes };
}

/** An estimate before reveal: opponent effects are deliberately unknown here. */
export function previewMove(state, side, move) {
  return calculateMove(state, side, move);
}

function battleResult(state, playerMove, opponentMove) {
  const player = calculateMove(state, 'player', playerMove, getBattleCard(state, 'opponent', opponentMove.cardId));
  const opponent = calculateMove(state, 'opponent', opponentMove, getBattleCard(state, 'player', playerMove.cardId));
  let winner;
  let tieReason = null;
  if (player.attack !== opponent.attack) winner = player.attack > opponent.attack ? 'player' : 'opponent';
  else if (player.card.stars !== opponent.card.stars) {
    winner = player.card.stars < opponent.card.stars ? 'player' : 'opponent';
    tieReason = 'stars';
  } else {
    winner = state.initiative;
    tieReason = 'initiative';
  }
  return {
    round: state.round, initiative: state.initiative, player, opponent,
    cards: { player: player.card, opponent: opponent.card },
    attacks: { player: player.attack, opponent: opponent.attack },
    winner, damage: winner === 'player' ? player.damage : opponent.damage, tieReason,
    notes: { player: player.notes, opponent: opponent.notes },
  };
}

export function resolveRound(state, playerMove, opponentMove) {
  // Validate both moves before constructing any new state.
  validateMove(state, 'player', playerMove);
  validateMove(state, 'opponent', opponentMove);
  const result = battleResult(state, playerMove, opponentMove);
  const next = {
    ...state,
    player: { ...state.player, hand: [...state.player.hand], used: [...state.player.used, result.player.cardId] },
    opponent: { ...state.opponent, hand: [...state.opponent.hand], used: [...state.opponent.used, result.opponent.cardId] },
    history: [...state.history, result], lastResult: result,
  };
  for (const side of ['player', 'opponent']) next[side].pills -= result[side].cost;
  const loser = otherSide(result.winner);
  next[loser].hp = Math.max(0, next[loser].hp - result.damage);
  const winningCard = result[result.winner];
  if (winningCard.abilityActive && winningCard.card.ability.type === 'healOnWin') {
    const previous = next[result.winner].hp;
    next[result.winner].hp = Math.min(RULES.life, previous + winningCard.card.ability.value);
    result.notes[result.winner].push(`回復 ${next[result.winner].hp - previous} 點生命`);
  }
  const losingCard = result[loser];
  if (losingCard.abilityActive && losingCard.card.ability.type === 'refundOnLoss') {
    const previous = next[loser].pills;
    next[loser].pills = Math.min(RULES.pills, previous + losingCard.card.ability.value);
    result.notes[loser].push(`獲得 ${next[loser].pills - previous} 顆仙丹`);
  }
  if (next.player.hp === 0 || next.opponent.hp === 0 || state.round >= RULES.rounds) {
    next.status = 'finished';
    next.winner = next.player.hp === next.opponent.hp ? 'draw' : (next.player.hp > next.opponent.hp ? 'player' : 'opponent');
  } else {
    next.round += 1;
    next.initiative = otherSide(state.initiative);
  }
  return next;
}

/** Construct a whitelist of public facts; UI selection and a hidden move are never read. */
function publicPosition(state) {
  const side = (value) => ({ hp: value.hp, pills: value.pills, hand: [...value.hand], used: [...value.used] });
  const knownLevels = (levels) => Object.fromEntries(CARDS.map((card) => [card.id, levels?.[card.id] ?? 1]));
  return {
    mode: state.mode ?? 'practice', playerLevels: knownLevels(state.playerLevels), opponentLevels: knownLevels(state.opponentLevels),
    player: side(state.player), opponent: side(state.opponent),
    round: state.round, initiative: state.initiative, status: state.status,
    winner: state.winner, history: [], lastResult: null,
  };
}

/** Commit once: before a player choice when leading, or after only their card is revealed when following. */
export function chooseAIMove(state, rng = Math.random, revealedPlayerCardId = null) {
  const position = publicPosition(state);
  if (position.status !== 'playing') throw new RangeError('The match is already finished.');
  const remaining = RULES.rounds - position.round + 1;
  const availablePlayerCards = position.player.hand.filter((id) => !position.player.used.includes(id));
  if (revealedPlayerCardId !== null && !availablePlayerCards.includes(revealedPlayerCardId)) {
    throw new RangeError('The revealed player card must be available in the current hand.');
  }
  const possiblePlayerCards = revealedPlayerCardId === null ? availablePlayerCards : [revealedPlayerCardId];
  const possibleAICards = position.opponent.hand.filter((id) => !position.opponent.used.includes(id));
  if (!possiblePlayerCards.length || !possibleAICards.length) throw new RangeError('No cards remain.');
  const average = Math.round(position.player.pills / remaining);
  const bids = new Map();
  for (const [amount, weight] of [[0, 0.22], [1, 0.13], [average, 0.4], [average + 2, 0.2], [position.player.pills, 0.05]]) {
    const pills = Math.min(position.player.pills, amount);
    bids.set(pills, (bids.get(pills) ?? 0) + weight);
  }
  const hypotheses = [];
  for (const cardId of possiblePlayerCards) {
    for (const [pills, weight] of bids) {
      const canFury = pills + RULES.furyCost <= position.player.pills;
      hypotheses.push({ move: { cardId, pills, fury: false }, weight: weight * (canFury ? 0.85 : 1) / possiblePlayerCards.length });
      if (canFury) hypotheses.push({ move: { cardId, pills, fury: true }, weight: weight * 0.15 / possiblePlayerCards.length });
    }
  }
  const candidates = [];
  for (const cardId of possibleAICards) {
    for (let pills = 0; pills <= position.opponent.pills; pills++) {
      for (const fury of [false, true]) {
        if (pills + (fury ? RULES.furyCost : 0) > position.opponent.pills) continue;
        const move = { cardId, pills, fury };
        let score = 0;
        for (const hypothesis of hypotheses) {
          const next = resolveRound(position, hypothesis.move, move);
          const healthLead = next.opponent.hp - next.player.hp;
          const reserveLead = next.opponent.pills - next.player.pills;
          let utility = healthLead * 1.6 + reserveLead * (remaining > 1 ? 0.55 : 0);
          if (next.status === 'finished') utility = next.winner === 'opponent' ? 60 + healthLead : next.winner === 'draw' ? 0 : -60 + healthLead;
          score += utility * hypothesis.weight;
        }
        candidates.push({ move, score });
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score || (a.move.pills + (a.move.fury ? 3 : 0)) - (b.move.pills + (b.move.fury ? 3 : 0)));
  // Near-equivalent plans vary between matches; combat itself has no random outcome.
  const shortlist = candidates.filter((candidate) => candidate.score >= candidates[0].score - 0.8).slice(0, 5);
  return { ...shortlist[Math.floor(randomUnit(rng) * shortlist.length)].move };
}
