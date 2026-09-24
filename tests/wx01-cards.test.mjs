import test from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, LEGACY_CARDS, LEGACY_CARD_IDS, ORIGINAL_CARD_IDS, CLASSIC_CARD_IDS, defaultDeckIds,
  getCard, getBattleCard, validateDeck, createMatch, resolveRound, chooseAIMove } from '../engine.mjs';
import { WX01_CARDS, WX01_ROSTER } from '../wx01-cards.mjs';
import { PRINTINGS, WX01_PRINTINGS, WX01_CARD_IDS, WX01_RARITIES,
  getPrinting, defaultPrintId, getPrintForCard } from '../printing-catalogue.mjs';

const originalIds = ['qingxiao', 'chiling', 'shuangli', 'cangjiao', 'yaoheng', 'yanxin', 'duying', 'cuixian', 'xuanjian', 'jinlin', 'zhimeng', 'yunya'];
const classicIds = ['huangdi', 'wukong', 'lindaiyu', 'pangu', 'kongzi', 'guanyu', 'wangxifeng', 'luzhishen', 'zhugeliang', 'nezha', 'diaochan', 'wusong'];
const seeded = initial => {
  let seed = initial;
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
};
const move = (cardId, pills = 0, fury = false) => ({ cardId, pills, fury });
const fixture = (playerHand, opponentHand) => ({
  player: { hp: 12, pills: 12, hand: [...playerHand], used: [] },
  opponent: { hp: 12, pills: 12, hand: [...opponentHand], used: [] },
  round: 1, initiative: 'player', history: [], status: 'playing', winner: null, lastResult: null,
});

test('legacy rules identities, ordered pools and seeded default battle stay intact', () => {
  assert.deepEqual(ORIGINAL_CARD_IDS, originalIds);
  assert.deepEqual(CLASSIC_CARD_IDS, classicIds);
  assert.deepEqual(LEGACY_CARD_IDS, [...originalIds, ...classicIds]);
  assert.deepEqual(CARDS.slice(0, 24), LEGACY_CARDS);
  assert.deepEqual(defaultDeckIds, originalIds.slice(0, 8));
  assert.equal(validateDeck(defaultDeckIds).stars, 24);
  const wukong = getCard('wukong');
  assert.equal(CARDS.filter(card => card.id === 'wukong').length, 1);
  assert.deepEqual([wukong.faction, wukong.stars, wukong.power, wukong.damage, wukong.ability.type, wukong.ability.value, wukong.artSet, wukong.art],
    ['ember', 5, 7, 6, 'stopAbility', 0, 'classics', 1]);
  // Captured from the pre-expansion engine, not recomputed from the new catalogue.
  const state = createMatch({ rng: seeded(82) });
  assert.deepEqual(state.player.hand, ['yaoheng', 'chiling', 'cuixian', 'qingxiao']);
  assert.deepEqual(state.opponent.hand, ['yaoheng', 'yanxin', 'shuangli', 'cangjiao']);
  assert.equal(state.initiative, 'opponent');
  assert.deepEqual(chooseAIMove(state, seeded(3)), { cardId: 'cangjiao', pills: 7, fury: true });
  assert.throws(() => LEGACY_CARD_IDS.push('wukong'), TypeError);
});

test('WX01 adds fifteen unique characters and all six full faction pairs remain legal', () => {
  assert.equal(CARDS.length, 39);
  assert.equal(WX01_CARDS.length, 15);
  assert.equal(new Set(CARDS.map(card => card.id)).size, 39);
  assert.equal(new Set(CARDS.map(card => card.name)).size, 39);
  assert.equal(WX01_ROSTER.length, 16);
  assert.deepEqual(WX01_ROSTER.map(row => row.number), Array.from({ length: 16 }, (_, i) => i + 1));
  assert.deepEqual(WX01_CARD_IDS, WX01_ROSTER.map(row => row.cardId));
  assert.deepEqual(Object.fromEntries(['common', 'rare', 'epic'].map(rarity => [rarity, Object.values(WX01_RARITIES).filter(r => r === rarity).length])),
    { common: 8, rare: 5, epic: 3 });
  const factions = ['yun', 'ember', 'moon', 'grove'];
  const totals = [];
  for (let i = 0; i < factions.length; i++) {
    const first = WX01_CARD_IDS.filter(id => getCard(id).faction === factions[i]);
    assert.equal(first.length, 4);
    for (let j = i + 1; j < factions.length; j++) {
      const second = WX01_CARD_IDS.filter(id => getCard(id).faction === factions[j]);
      const result = validateDeck([...first, ...second]);
      assert.equal(result.valid, true);
      totals.push(result.stars);
    }
  }
  assert.deepEqual(totals, [24, 22, 23, 24, 25, 23]);
  assert.throws(() => { getCard('yinjiao').power = 9; }, TypeError);
  assert.throws(() => { WX01_ROSTER[0].rarity = 'epic'; }, TypeError);
});

test('candidate budgets avoid obvious same-faction, same-effect upgrades at equal or lower cost', () => {
  // A guard against raw strict upgrades, not a claim of metagame balance.
  for (const candidate of WX01_CARDS) for (const old of LEGACY_CARDS) {
    if (candidate.faction !== old.faction || candidate.ability.type !== old.ability.type || candidate.stars > old.stars) continue;
    const noWorse = candidate.power >= old.power && candidate.damage >= old.damage && candidate.ability.value >= old.ability.value;
    const improved = candidate.stars < old.stars || candidate.power > old.power || candidate.damage > old.damage || candidate.ability.value > old.ability.value;
    assert.equal(noWorse && improved, false, `${candidate.id} strictly upgrades ${old.id}`);
  }
});

test('all printing identities bind one known card and valid immutable art coordinates', () => {
  assert.equal(PRINTINGS.length, 53);
  assert.equal(WX01_PRINTINGS.length, 29);
  assert.equal(new Set(PRINTINGS.map(print => print.id)).size, PRINTINGS.length);
  assert.deepEqual(Object.fromEntries(['base', 'aa', 'leader', 'ink', 'treasure'].map(treatment => [treatment, WX01_PRINTINGS.filter(print => print.treatment === treatment).length])),
    { base: 16, aa: 6, leader: 4, ink: 2, treasure: 1 });
  for (const print of PRINTINGS) {
    assert.equal(getPrintForCard(print.cardId, print.id), print);
    assert.equal(getCard(print.cardId).id, print.cardId);
    assert.match(print.art.src, /^assets\/(?:wx01\/|expansion\/)?[a-z-]+\.png$/);
    for (const field of ['columns', 'rows']) assert.ok(Number.isInteger(print.art[field]) && print.art[field] > 0);
    assert.ok(Number.isInteger(print.art.index) && print.art.index >= 0 && print.art.index < print.art.columns * print.art.rows);
    assert.equal(Object.isFrozen(print.art), true);
    assert.equal(Object.hasOwn(print, 'power'), false);
  }
  assert.throws(() => { PRINTINGS[0].art.index = 99; }, TypeError);
});

test('legacy defaults never relabel old Wukong; explicit invalid or mismatched versions fail closed', () => {
  for (const id of LEGACY_CARD_IDS) assert.equal(defaultPrintId(id), `legacy/${id}`);
  for (const card of WX01_CARDS) assert.equal(getPrintForCard(card.id).setId, 'wx01');
  assert.equal(getPrintForCard('wukong').id, 'legacy/wukong');
  assert.equal(getPrintForCard('wukong', 'wx01-005-base').setId, 'wx01');
  assert.deepEqual(getPrinting('wx01-005-base').art, getPrinting('legacy/wukong').art);
  for (const bad of [null, '', 'missing', 5, {}, 'WX01-005-BASE']) {
    assert.throws(() => getPrintForCard('wukong', bad), RangeError);
  }
  assert.throws(() => getPrintForCard('bailong', 'wx01-005-aa1'), RangeError);
  assert.throws(() => defaultPrintId('missing'), RangeError);
  const duplicateVariants = ['wx01-005-aa1', 'wx01-005-tr1'].map(id => getPrinting(id).cardId);
  assert.equal(validateDeck([...duplicateVariants, ...originalIds.slice(0, 6)]).valid, false);
});

test('base art coordinates match the four planned atlases and special art stays distinct', () => {
  const expected = {
    yun: ['tangsanzang', 'bailong', 'guanyin', 'puti'],
    ember: ['honghaier', 'huangfeng', 'jinjiao'],
    moon: ['baigu', 'tieshan', 'yinjiao', 'liuer'],
    grove: ['bajie', 'wujing', 'niumowang', 'zhenyuan'],
  };
  for (const [atlas, ids] of Object.entries(expected)) ids.forEach((id, index) => {
    assert.deepEqual(getPrintForCard(id).art, { src: `assets/wx01/base-${atlas}.png`, columns: 2, rows: 2, index });
  });
  const specials = WX01_PRINTINGS.filter(print => print.treatment !== 'base');
  assert.equal(new Set(specials.map(print => print.art.src)).size, 13);
  for (const print of specials) assert.deepEqual([print.art.columns, print.art.rows, print.art.index], [1, 1, 0]);
  assert.equal(getPrinting('wx01-005-ink1').art.src, 'assets/expansion/wukong-ink.png');
});

test('Silver Horn retains the cheap zero-bid tie edge but loses the one-pill duel to Shuangli', () => {
  const state = fixture(['yinjiao', 'baigu', 'bailong', 'wujing'], ['shuangli', 'duying', 'qingxiao', 'yanxin']);
  const zero = resolveRound(state, move('yinjiao'), move('shuangli')).lastResult;
  assert.deepEqual(zero.attacks, { player: 1, opponent: 1 });
  assert.equal(zero.winner, 'player');
  assert.equal(zero.tieReason, 'stars');
  assert.equal(zero.player.abilityActive, false);
  assert.equal(zero.opponent.abilityActive, false);
  assert.equal(zero.player.bonusActive, true);
  assert.equal(zero.opponent.bonusActive, true);
  const paid = resolveRound(state, move('yinjiao', 1), move('shuangli', 1)).lastResult;
  assert.deepEqual(paid.attacks, { player: 4, opponent: 8 });
  assert.equal(paid.winner, 'opponent');
});

test('Bodhi suppression happens before pill multiplication and still respects Stop Ability', () => {
  const state = fixture(['puti', 'bailong', 'wujing', 'niumowang'], ['qingxiao', 'yaoheng', 'shuangli', 'duying']);
  const result = resolveRound(state, move('puti', 2), move('qingxiao', 2)).lastResult;
  assert.equal(result.opponent.power, 6); // 7 + 1 - 2, before the multiplier.
  assert.deepEqual(result.attacks, { player: 24, opponent: 24 });
  assert.equal(result.player.damage, 3); // Less damage than Qingxiao's 4.
  const stopped = resolveRound(state, move('puti', 2), move('shuangli', 2)).lastResult;
  assert.equal(stopped.player.abilityActive, false);
  assert.equal(stopped.opponent.power, 7);
  assert.equal(stopped.player.bonusActive, true);
});

test('Guanyin reduces a Fury hit; unchanged Wukong suppresses that shelter', () => {
  const state = fixture(['guanyin', 'bailong', 'wujing', 'niumowang'], ['honghaier', 'huangfeng', 'wukong', 'baigu']);
  const fire = resolveRound(state, move('guanyin'), move('honghaier', 9, true));
  assert.equal(fire.lastResult.winner, 'opponent');
  assert.equal(fire.lastResult.damage, 6); // 4 + 2 ability + 1 faction + 2 Fury - 3 shelter.
  assert.equal(fire.player.hp, 6);
  assert.equal(fire.opponent.pills, 0);
  const stopped = resolveRound(state, move('guanyin'), move('wukong', 9, true));
  assert.equal(stopped.lastResult.player.abilityActive, false);
  assert.equal(stopped.lastResult.damage, 9);
});

test('new heal and refund candidates obey caps, timing and opposing skill suppression', () => {
  const healing = fixture(['zhenyuan', 'wujing', 'bailong', 'puti'], ['huangfeng', 'honghaier', 'yinjiao', 'baigu']);
  healing.player.hp = 6;
  assert.equal(resolveRound(healing, move('zhenyuan', 3), move('huangfeng')).player.hp, 9);
  assert.equal(resolveRound(healing, move('zhenyuan', 3), move('yinjiao')).player.hp, 6);
  healing.player.hp = 11;
  assert.equal(resolveRound(healing, move('zhenyuan', 3), move('huangfeng')).player.hp, 12);
  const refunds = fixture(['baigu', 'tieshan', 'wujing', 'zhenyuan'], ['qingxiao', 'yaoheng', 'wukong', 'honghaier']);
  for (const id of ['baigu', 'wujing']) {
    refunds.player.pills = 11;
    const capped = resolveRound(refunds, move(id), move('qingxiao', 2));
    assert.equal(capped.lastResult.winner, 'opponent');
    assert.equal(capped.player.pills, 12);
    refunds.player.pills = 9;
    assert.equal(resolveRound(refunds, move(id), move('qingxiao', 2)).player.pills, 11);
    assert.equal(resolveRound(refunds, move(id), move('wukong', 2)).player.pills, 9);
  }
});

test('new identities train only in expedition and AI completes legal rounds using public facts', () => {
  const ids = WX01_CARD_IDS.filter(id => ['yun', 'moon'].includes(getCard(id).faction));
  const ranks = Object.fromEntries(ids.map(id => [id, 5]));
  const expedition = createMatch({ deckIds: ids, opponentDeckIds: ids, rng: seeded(4), mode: 'expedition', playerLevels: ranks });
  const arena = createMatch({ deckIds: ids, opponentDeckIds: ids, rng: seeded(4), mode: 'arena', playerLevels: ranks });
  for (const id of ids) {
    assert.equal(getBattleCard(expedition, 'player', id).power, getCard(id).power + 2);
    assert.equal(getBattleCard(expedition, 'player', id).damage, getCard(id).damage + 2);
    assert.equal(getBattleCard(arena, 'player', id).power, getCard(id).power);
  }
  let state = arena;
  while (state.status === 'playing') {
    Object.defineProperty(state, 'hiddenPlayerMove', { get() { throw new Error('AI read a hidden bid'); } });
    const ai = chooseAIMove(state, seeded(state.round));
    assert.ok(state.opponent.hand.includes(ai.cardId) && !state.opponent.used.includes(ai.cardId));
    assert.ok(ai.pills + (ai.fury ? 3 : 0) <= state.opponent.pills);
    const playerCard = state.player.hand.find(id => !state.player.used.includes(id));
    state = resolveRound(state, move(playerCard), ai);
  }
  assert.ok(state.history.length >= 1 && state.history.length <= 4);
  assert.ok(['player', 'opponent', 'draw'].includes(state.winner));
});
