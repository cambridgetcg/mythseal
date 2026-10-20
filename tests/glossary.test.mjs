// T1 詞彙 (docs/TUTORIAL-T1.md §3): every definition's shape, and its truth against the rules and
// progression functions that apply it.
import assert from 'node:assert/strict';
import test from 'node:test';
import { CARDS, RULES, createMatch, resolveRound, previewMove, hasFactionBonus, getCard } from '../engine.mjs';
import {
  NODES, RARITIES, WEEKLY_TASKS, createProfile, beginBattle, finishBattle, startActivity, advanceActivity, getUpgradeCost, getHeroLevel, buyPack,
} from '../progression.mjs';
import { XP_THRESHOLDS, getInstanceLevel, setInstanceXP, mintInstance } from '../collection.mjs';
import { previewInheritance } from '../inheritance.mjs';
import { PRINT_TREATMENTS } from '../card-presentation.mjs';
import { CAMPAIGN_NODES } from '../campaign-content.mjs';
import { GLOSSARY, GLOSSARY_IDS, glossaryMarkup } from '../glossary.mjs';

const now = '2026-09-22T12:00:00.000Z';
const text = id => GLOSSARY.find(entry => entry.id === id).text;
const term = id => GLOSSARY.find(entry => entry.id === id).term;
/** §3.2: a printable ASCII character counts ½, every other code point 1. */
const displayUnits = value => [...value].reduce((sum, character) => sum + (/[\x20-\x7e]/.test(character) ? 0.5 : 1), 0);
const ready = () => { const profile = createProfile({ now }); profile.cleared = NODES.filter(node => !node.campaign).map(node => node.id); return profile; };
const playedOf = encounter => Object.keys(encounter.cardInstances ?? {}).slice(0, 2);
function fight(profile, options, winner, finalResources) {
  const started = beginBattle(profile, { rng: () => 0.23, now, ...options });
  return finishBattle(started.profile, { encounterId: started.encounter.id, winner, playedCardIds: options.route === 'loaner' ? started.encounter.playerDeck.slice(0, 2) : playedOf(started.encounter), now, ...(finalResources ? { finalResources } : {}) });
}
const cardXP = result => result.reward.cardXP.map(change => change.gainedXP);

test('shape: twenty unique entries, each at most 40 display units, in three groups', () => {
  assert.ok(GLOSSARY.length >= 18 && GLOSSARY.length <= 22, `${GLOSSARY.length} entries`);
  assert.equal(GLOSSARY.length, 20);
  assert.equal(new Set(GLOSSARY_IDS).size, GLOSSARY.length, 'unique ids');
  for (const id of ['coins', 'dust', 'hero-level']) assert.ok(GLOSSARY_IDS.includes(id), id);
  for (const entry of GLOSSARY) {
    assert.ok(displayUnits(entry.text) <= 40, `${entry.id}: ${displayUnits(entry.text)} units: ${entry.text}`);
    assert.ok(entry.term && entry.text, entry.id);
    assert.ok(['旅途', '卡牌', '對弈'].includes(entry.group), entry.id);
  }
  // Grouped in reading order: 旅途, then 卡牌, then 對弈.
  const groups = GLOSSARY.map(entry => entry.group);
  assert.deepEqual([...new Set(groups)], ['旅途', '卡牌', '對弈']);
  assert.deepEqual(groups, [...groups].sort((a, b) => ['旅途', '卡牌', '對弈'].indexOf(a) - ['旅途', '卡牌', '對弈'].indexOf(b)));
  assert.ok(Object.isFrozen(GLOSSARY) && GLOSSARY.every(Object.isFrozen));
});

test('markup: one focusable article per term, named by its heading; data-open only for a known id', () => {
  const markup = glossaryMarkup();
  for (const entry of GLOSSARY) {
    assert.equal(markup.split(`data-viewport-id="term-${entry.id}"`).length - 1, 1, entry.id);
    assert.equal(markup.split(`data-glossary-term="${entry.id}"`).length - 1, 1, entry.id);
    assert.ok(markup.includes(`aria-labelledby="glossary-term-${entry.id}"><h3 id="glossary-term-${entry.id}">`), entry.id);
  }
  assert.equal(markup.split('tabindex="-1"').length - 1, GLOSSARY.length);
  assert.match(markup, /data-open="false"/);
  assert.match(glossaryMarkup({ open: 'coins' }), /^<div class="glossary-list" data-glossary data-open="true">/);
  assert.match(glossaryMarkup({ open: 'nonsense' }), /data-open="false"/);
  assert.match(glossaryMarkup({ open: '<script>' }), /data-open="false"/);
  assert.doesNotMatch(markup, /<(?:button|a|input)\b|tabindex="0"/, 'no control inside the list');
});

test('truth: battle rules and the numbers taken from them', () => {
  assert.ok(text('fury').includes(`另付 ${RULES.furyCost} 丹`) && text('fury').includes(`+${RULES.furyDamage}`));
  assert.ok(text('pills').startsWith(`每局 ${RULES.pills} 顆`));
  const stars = CARDS.map(card => card.stars);
  assert.ok(text('stars').includes(`${Math.min(...stars)}–${Math.max(...stars)} 星`) && text('stars').includes(`不超過 ${RULES.starLimit} 星`));
  // 執令者 Lv: 1 + ⌊√(修為/100)⌋, so the stated thresholds are 100, 400 and 900.
  assert.deepEqual([99, 100, 399, 400, 899, 900, 1600].map(xp => getHeroLevel({ xp })), [1, 2, 2, 3, 3, 4, 5]);
  assert.match(text('hero-level'), /滿 100 為 Lv\.2、400 為 Lv\.3、900 為 Lv\.4/);
  // 修練: Lv.L costs 120×L coins and 6×L 靈砂.
  const profile = createProfile({ now }), uid = profile.instances[0].uid;
  assert.deepEqual((({ coins, dust }) => ({ coins, dust }))(getUpgradeCost(profile, uid)), { coins: 120, dust: 6 });
  assert.deepEqual((({ coins, dust }) => ({ coins, dust }))(getUpgradeCost(setInstanceXP(profile, uid, XP_THRESHOLDS[1]), uid)), { coins: 240, dust: 12 });
  assert.match(text('card-level'), /120×L 金幣、6×L 靈砂/);
  // Levels come automatically with card EXP.
  assert.deepEqual(XP_THRESHOLDS.map(getInstanceLevel), [1, 2, 3, 4, 5]);
  assert.equal(getInstanceLevel(XP_THRESHOLDS[1] - 1), 1);
  assert.match(text('card-level'), /^Lv\.1–5：歷練夠即升級/);
  // Collection names come from the data.
  assert.equal(term('rarity'), `品階 · ${Object.values(RARITIES).map(rarity => rarity.name).join('／')}`);
  for (const treatment of Object.values(PRINT_TREATMENTS)) assert.ok(term('printing').includes(treatment.name), treatment.name);
});

test('truth: battle rewards, card EXP and the daily cache', () => {
  // Expedition: win 20 card EXP; loss 12, no 靈砂, still coins and 修為.
  const win = fight(createProfile({ now }), { kind: 'expedition', nodeId: 'mist-gate' }, 'player');
  assert.deepEqual(cardXP(win), [20, 20]);
  assert.equal(win.reward.dailyCache, true, 'a non-campaign node\'s first win of the day adds its cache');
  for (const field of ['coins', 'dust', 'xp']) assert.ok(win.reward[field] >= NODES[0].dailyReward[field]);
  for (const winner of ['opponent', 'draw']) {
    const loss = fight(createProfile({ now }), { kind: 'expedition', nodeId: 'mist-gate' }, winner);
    assert.deepEqual(cardXP(loss), [12, 12]);
    assert.equal(loss.reward.dust, 0); assert.ok(loss.reward.coins > 0 && loss.reward.xp > 0);
  }
  // Arena: 12 or 8, with coins, 靈砂 and 修為 either way.
  const arenaWin = fight(createProfile({ now }), { kind: 'arena' }, 'player'), arenaLoss = fight(createProfile({ now }), { kind: 'arena' }, 'opponent');
  assert.deepEqual(cardXP(arenaWin), [12, 12]); assert.deepEqual(cardXP(arenaLoss), [8, 8]);
  for (const result of [arenaWin, arenaLoss]) for (const field of ['coins', 'dust', 'xp']) assert.ok(result.reward[field] > 0, field);
  // Practice: nothing.
  const practice = fight(createProfile({ now }), { kind: 'practice' }, 'player');
  assert.deepEqual(cardXP(practice), [0, 0]);
  for (const field of ['coins', 'dust', 'xp']) assert.equal(practice.reward[field], 0, field);
  assert.match(text('coins'), /切磋不得/);
  // A borrowed deck earns no card EXP; a 續卷 node has no daily cache.
  const loaner = CAMPAIGN_NODES.find(node => node.loanerDeck), before = ready();
  before.cleared = NODES.filter(node => node.id !== loaner.id).map(node => node.id);
  const borrowed = fight(before, { kind: 'expedition', nodeId: loaner.id, route: 'loaner' }, 'player', { hp: 6, pills: 2 });
  assert.deepEqual(borrowed.reward.cardXP, []);
  assert.equal(borrowed.reward.dailyCache, false);
  assert.match(text('cache'), /續卷沒有/);
});

test('truth: the fire mountain, tickets and seals', () => {
  const settle = (profile, winner) => finishBattle(profile, { encounterId: profile.pending.id, winner, playedCardIds: profile.pending.playerDeck.slice(0, 1), finalResources: { hp: 12, pills: 12 }, now });
  // A loss pays nothing; a win 60 coins, 3 (+2) 靈砂 and 30 修為, and 12 card EXP on own cards.
  const lost = settle(startActivity(ready(), { rng: () => 0.23, now }).profile, 'opponent');
  for (const field of ['coins', 'dust', 'xp']) assert.equal(lost.reward[field], 0, field);
  assert.deepEqual(cardXP(lost), [8]);
  const won = settle(startActivity(ready(), { rng: () => 0.23, now }).profile, 'player');
  assert.ok([60, 90].includes(won.reward.coins) && [3, 5].includes(won.reward.dust) && won.reward.xp === 30, JSON.stringify(won.reward));
  assert.deepEqual(cardXP(won), [12]);
  // The first and third full clears of a week each give a ticket.
  let profile = ready();
  const tickets = [];
  for (let run = 0; run < 3; run++) {
    profile = startActivity(profile, { route: 'loaner', rng: () => 0.23, now }).profile;
    for (let stage = 0; stage < 3; stage++) {
      profile = settle(profile, 'player').profile;
      if (stage < 2) profile = advanceActivity(profile, { supply: 'none', expectedRunId: profile.expansion.fireMountain.run.id, expectedStage: stage, now }).profile;
    }
    tickets.push(profile.expansion.tickets);
  }
  assert.deepEqual(tickets, [1, 1, 2]);
  // Each of the six volume finals gives one ticket on its first clear.
  const finals = CAMPAIGN_NODES.filter(node => node.volumeFinal);
  assert.equal(finals.length, 6);
  for (const node of finals) {
    const start = ready(); start.cleared = NODES.filter(item => item.id !== node.id).map(item => item.id);
    const first = fight(start, { kind: 'expedition', nodeId: node.id }, 'player', { hp: 6, pills: 2 }).profile;
    assert.equal(first.expansion.tickets, 1, node.id);
    assert.equal(fight(first, { kind: 'expedition', nodeId: node.id }, 'player', { hp: 6, pills: 2 }).profile.expansion.tickets, 1, `${node.id}: only the first clear`);
  }
  // Seals: +1 per WX-01 pack, 5 from 七日弈緣.
  const opened = buyPack(createProfile({ now }), { set: 'wx01', rng: () => 0.23, now }).profile;
  assert.equal(opened.wx01.seals, 1);
  const weekly = WEEKLY_TASKS.find(task => task.id === 'matches');
  assert.equal(weekly.title, '七日弈緣'); assert.equal(weekly.reward.seals, 5);
  assert.match(text('seals'), /得 1 印，七日弈緣另得 5 印/);
});

test('truth: same-character inheritance gives 80 plus the material\'s EXP', () => {
  let profile = createProfile({ now });
  const target = profile.instances.find(instance => instance.cardId === 'qingxiao');
  const minted = mintInstance(profile, 'qingxiao', { source: 'glossary-test', now }); profile = setInstanceXP(minted.profile, minted.instance.uid, 30);
  const quote = previewInheritance(profile, target.uid, [minted.instance.uid]);
  assert.equal(quote.gainedXP, 80 + 30);
  assert.match(text('card-exp'), /同名傳承亦可灌注/);
});

test('truth: resonance, initiative, 減力, 減攻 and 封鎖 through the engine', () => {
  const faction = id => getCard(id).faction;
  const sameFaction = id => CARDS.filter(card => card.faction === faction(id) && card.name !== getCard(id).name).map(card => card.id);
  const otherFaction = (id, count) => CARDS.filter(card => card.faction !== faction(id)).slice(0, count).map(card => card.id);
  const table = (player, opponent) => { const state = createMatch({ rng: () => 0.23 }); state.player.hand = player; state.opponent.hand = opponent; state.player.used = []; state.opponent.used = []; return state; };
  // Resonance: two different names of one faction start it; one alone does not; a used card still counts.
  const pair = table(['shuangli', sameFaction('shuangli')[0], ...otherFaction('shuangli', 2)], otherFaction('shuangli', 4));
  assert.equal(hasFactionBonus(pair, 'player', 'shuangli'), true, 'two different same-faction names');
  const alone = table(['shuangli', ...otherFaction('shuangli', 3)], otherFaction('shuangli', 4));
  assert.equal(hasFactionBonus(alone, 'player', 'shuangli'), false, 'one of its faction');
  pair.player.used = [pair.player.hand[1]];
  assert.equal(hasFactionBonus(pair, 'player', 'shuangli'), true, 'a used card still counts');
  // Initiative: the higher star sum leads, an equal sum follows the injected rng, and the lead alternates.
  const sum = hand => hand.reduce((total, id) => total + getCard(id).stars, 0);
  let compared = 0;
  for (let seed = 1; seed < 40; seed++) {
    let value = seed / 41;
    const state = createMatch({ rng: () => { value = (value * 9301 + 0.4927) % 1; return value; } });
    const difference = sum(state.player.hand) - sum(state.opponent.hand);
    if (difference) { assert.equal(state.initiative, difference > 0 ? 'player' : 'opponent'); compared++; }
  }
  assert.ok(compared > 10, 'unequal star sums were drawn');
  // An equal sum: one more rng draw after the two hands decides (< 0.5 is the player).
  const mirror = ['qingxiao', 'yaoheng', 'yanxin', 'duying', 'cuixian', 'yunya', 'chiling', 'cangjiao'];
  for (const [last, leader] of [[0.1, 'player'], [0.9, 'opponent']]) {
    const draws = Array(2 * (RULES.deckSize - 1)).fill(0); // a Fisher–Yates shuffle per deck
    let index = 0;
    const state = createMatch({ deckIds: mirror, opponentDeckIds: mirror, rng: () => (index++ < draws.length ? draws[index - 1] : last) });
    assert.equal(sum(state.player.hand), sum(state.opponent.hand), 'the same draws give the same hands');
    assert.equal(state.initiative, leader, `rng ${last}`);
  }
  const round = createMatch({ rng: () => 0.23 }), first = round.initiative;
  const [mine, theirs] = [round.player.hand[0], round.opponent.hand[0]];
  assert.notEqual(resolveRound(round, { cardId: mine, pills: 0, fury: false }, { cardId: theirs, pills: 0, fury: false }).initiative, first, 'the lead alternates');
  // 減力 before the multiplier: 渡影 takes 1 power, so the opponent loses (1＋丹) attack.
  const opponent = otherFaction('duying', 4), pills = 2;
  const powerDown = table(['duying', ...otherFaction('duying', 3)], opponent);
  const own = previewMove(powerDown, 'opponent', { cardId: opponent[0], pills, fury: false }).attack;
  assert.equal(resolveRound(powerDown, { cardId: 'duying', pills: 0, fury: false }, { cardId: opponent[0], pills, fury: false }).lastResult.opponent.attack, own - (1 + pills), '減力 is taken before ×(1＋丹)');
  // 減攻 after it: 諸葛亮 takes 4 from the multiplied attack, to a minimum of 1.
  const rivals = otherFaction('zhugeliang', 4);
  const attackDown = table(['zhugeliang', ...otherFaction('zhugeliang', 3)], rivals);
  const strong = previewMove(attackDown, 'opponent', { cardId: rivals[0], pills, fury: false }).attack;
  assert.equal(resolveRound(attackDown, { cardId: 'zhugeliang', pills: 0, fury: false }, { cardId: rivals[0], pills, fury: false }).lastResult.opponent.attack, strong - 4, '減攻 is taken after ×(1＋丹)');
  // The floor: 月隱's 月蝕 (−6) on a 5-power card leaves 1, not −1.
  const plain = CARDS.filter(card => !['moon', faction('tangsanzang')].includes(card.faction) && card.id !== 'tangsanzang').slice(0, 3).map(card => card.id);
  const floor = table(['shuangli', sameFaction('shuangli')[0], ...otherFaction('shuangli', 2)], ['tangsanzang', ...plain]);
  const weak = previewMove(floor, 'opponent', { cardId: 'tangsanzang', pills: 0, fury: false }).attack;
  assert.equal(weak, getCard('tangsanzang').power, 'no bonus of its own');
  assert.ok(weak - 6 < 1);
  assert.equal(resolveRound(floor, { cardId: 'shuangli', pills: 0, fury: false }, { cardId: 'tangsanzang', pills: 0, fury: false }).lastResult.opponent.attack, 1, '減攻 never leaves less than 1');
  // 封鎖: 霜璃 cancels the opponent's ability but not its resonance.
  const resonant = table(['shuangli', ...otherFaction('shuangli', 3).filter(id => faction(id) !== faction('zhugeliang')).slice(0, 3)], ['zhugeliang', sameFaction('zhugeliang')[0], ...otherFaction('zhugeliang', 2)]);
  assert.equal(hasFactionBonus(resonant, 'opponent', 'zhugeliang'), true);
  const mineAttack = previewMove(resonant, 'player', { cardId: 'shuangli', pills: 0, fury: false }).attack;
  const sealed = resolveRound(resonant, { cardId: 'shuangli', pills: 0, fury: false }, { cardId: 'zhugeliang', pills: 0, fury: false }).lastResult;
  assert.equal(sealed.opponent.abilityActive, false, '空城 is blocked');
  assert.equal(sealed.player.attack, mineAttack, 'so the player keeps the whole attack');
  assert.equal(sealed.opponent.bonusActive, true, 'resonance still applies under 封鎖');
  assert.equal(sealed.opponent.attack, getCard('zhugeliang').power + 6, '天光 still adds 6');
});
