import assert from 'node:assert/strict';
import test from 'node:test';
import { CARDS, RULES, createMatch, previewMove, resolveRound, validateDeck, hasFactionBonus, chooseAIMove } from '../engine.mjs';
import { createRevealView, permittedAnnouncement } from '../battle-presentation.mjs';
import { PROFILE_KEY } from '../progression.mjs';
import {
  attackFormula, formulaVariants, costText, planningHint, revealTip,
  coachStart, advanceCoach, coachCopy, createCoachMemory, COACH_KEY, COACH_STEPS,
} from '../battle-teaching.mjs';

// Seeded, so a failure names a reproducible match.
function seeded(seed) {
  let value = seed >>> 0;
  return () => { value = (value + 0x6d2b79f5) >>> 0; let t = value; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function randomDeck(rng) {
  for (;;) {
    const pool = [...CARDS];
    for (let index = pool.length - 1; index > 0; index--) { const other = Math.floor(rng() * (index + 1)); [pool[index], pool[other]] = [pool[other], pool[index]]; }
    const ids = pool.slice(0, RULES.deckSize).map(card => card.id);
    if (validateDeck(ids).valid) return ids;
  }
}
function randomMatch(seed) {
  const rng = seeded(seed), mode = rng() < 0.5 ? 'expedition' : 'practice';
  const levels = () => Object.fromEntries(CARDS.filter(() => rng() < 0.4).map(card => [card.id, 1 + Math.floor(rng() * 5)]));
  return createMatch({ deckIds: randomDeck(rng), opponentDeckIds: randomDeck(rng), rng, mode, playerLevels: levels(), opponentLevels: levels() });
}
const open = (match, side) => match[side].hand.filter(id => !match[side].used.includes(id));
function drafts(match) {
  const list = [];
  for (const cardId of open(match, 'player')) for (const pills of [0, 1, 3, 7, match.player.pills]) for (const fury of [false, true]) {
    if (pills + (fury ? RULES.furyCost : 0) <= match.player.pills) list.push({ cardId, pills, fury });
  }
  return list;
}
const bids = match => [{ pills: 0, fury: false }, { pills: Math.min(5, match.opponent.pills), fury: false }, ...(match.opponent.pills >= RULES.furyCost ? [{ pills: match.opponent.pills - RULES.furyCost, fury: true }] : [])];

/** Evaluates a shown formula ("（力 7 ＋ 1）×（1＋3 丹）＋ 6 ＝ 38") with a tiny parser: digits, + − × and parentheses only. */
function evaluateShown(text) {
  const normalized = text.replace(/[力丹\s]/g, '').replace(/[（(]/g, '(').replace(/[）)]/g, ')').replace(/[＋+]/g, '+').replace(/[−－]/g, '-');
  const [expression, total] = normalized.split('＝');
  assert.match(expression, /^[0-9+\-×()]+$/, `only arithmetic is shown: ${text}`);
  let position = 0;
  const peek = () => expression[position];
  const number = () => { const start = position; while (/[0-9]/.test(peek() ?? '')) position++; assert.ok(position > start, `a number at ${position} in ${text}`); return Number(expression.slice(start, position)); };
  const factor = () => { if (peek() === '(') { position++; const value = sumOf(); assert.equal(expression[position++], ')'); return value; } return number(); };
  const product = () => { let value = factor(); while (peek() === '×') { position++; value *= factor(); } return value; };
  const sumOf = () => { let value = product(); while (peek() === '+' || peek() === '-') { const sign = expression[position++]; value += (sign === '+' ? 1 : -1) * product(); } return value; };
  const value = sumOf();
  assert.equal(position, expression.length, `the whole formula parses: ${text}`);
  return { value, total: total === undefined ? null : Number(total) };
}
function assertShownMatches(formula) {
  assert.ok(formula.consistent, 'the terms add up to the engine number');
  assert.ok(formula.variants.length >= 2);
  assert.equal(formula.text, formula.variants[0]);
  for (const variant of formula.variants) {
    const { value, total } = evaluateShown(variant);
    assert.equal(Math.max(1, value), formula.attack, `${variant} states the engine's attack`);
    if (total !== null) assert.equal(total, formula.attack, `${variant} ends with the engine's attack`);
  }
}

test('D3 formula: an announced opponent card gives exactly resolveRound\'s player attack and damage, whatever the hidden bid', () => {
  let checked = 0;
  for (let seed = 1; seed <= 60; seed++) {
    let match = randomMatch(seed);
    // Rounds 1–3, so used cards and spent pills are exercised too.
    for (let round = 0; round < 3 && match.status === 'playing'; round++) {
      for (const announced of open(match, 'opponent')) for (const draft of drafts(match)) {
        const formula = attackFormula(match, draft, { announcedCardId: announced });
        assert.equal(formula.exact, true); assert.equal(formula.known, announced);
        for (const bid of bids(match)) {
          const result = resolveRound(match, draft, { cardId: announced, ...bid }).lastResult.player;
          assert.equal(formula.attack, result.attack, `seed ${seed} ${JSON.stringify(draft)} vs ${announced}`);
          assert.equal(formula.damage, result.damage);
          assert.equal(formula.cost, result.cost);
        }
        assertShownMatches(formula);
        checked++;
      }
      const next = open(match, 'player')[0], reply = open(match, 'opponent')[0];
      match = resolveRound(match, { cardId: next, pills: 1, fury: false }, { cardId: reply, pills: 2, fury: false });
    }
  }
  assert.ok(checked > 5000, `${checked} announced drafts checked`);
});

test('D3 formula: without an announced card it is previewMove\'s number, exact only when every possible reply agrees, otherwise 預計', () => {
  let exact = 0, estimated = 0;
  for (let seed = 101; seed <= 160; seed++) {
    const match = randomMatch(seed);
    for (const draft of drafts(match)) {
      const formula = attackFormula(match, draft);
      assert.equal(formula.attack, previewMove(match, 'player', draft).attack, `seed ${seed} ${JSON.stringify(draft)}`);
      const replies = open(match, 'opponent').map(cardId => resolveRound(match, draft, { cardId, pills: 0, fury: false }).lastResult.player.attack);
      assert.equal(formula.exact, replies.every(attack => attack === formula.attack));
      if (formula.exact) { exact++; assert.ok(!formula.sentence.startsWith('預計')); }
      else { estimated++; assert.ok(formula.sentence.startsWith('預計攻擊'), formula.sentence); assert.match(formula.sentence, /對手尚未出牌/); }
      assertShownMatches(formula);
    }
  }
  assert.ok(exact > 100 && estimated > 100, `both kinds are covered (${exact} exact, ${estimated} 預計)`);
});

test('D3 formula: the packet example reads 力 6 ×（1＋3 丹）＝ 24; Fury and visible effects show their terms', () => {
  const match = createMatch({ rng: () => 0.23 });
  // 渡影 (power 6) with no same-faction partner in hand, and no ability that changes attack.
  match.player.hand = ['duying', 'qingxiao', 'chiling', 'cangjiao']; match.opponent.hand = ['yaoheng', 'yanxin', 'cuixian', 'shuangli'];
  assert.equal(hasFactionBonus(match, 'player', 'duying'), false);
  const plain = attackFormula(match, { cardId: 'duying', pills: 3 }, { announcedCardId: 'yaoheng' });
  assert.equal(plain.text, '力 6 ×（1＋3 丹）＝ 24');
  assert.deepEqual(plain.variants, ['力 6 ×（1＋3 丹）＝ 24', '力6×(1+3丹)＝24', '力6×(1+3丹)', '6×4']);
  assert.equal(costText(plain, match.player.pills), '共消耗 3 丹 · 剩 9 丹');
  // 青霄: 凌霄 power +1 before the multiplier.
  const power = attackFormula(match, { cardId: 'qingxiao', pills: 2 }, { announcedCardId: 'yaoheng' });
  assert.equal(power.text, '（力 7 ＋ 1）×（1＋2 丹）＝ 24');
  assert.equal(power.variants.at(-2), '力8×(1+2丹)');
  // 赤翎: 破曉 attack +6 after the multiplier; Fury adds damage, not attack, and costs 3.
  const fury = attackFormula(match, { cardId: 'chiling', pills: 2, fury: true }, { announcedCardId: 'yaoheng' });
  assert.equal(fury.text, `力 7 ×（1＋2 丹）＋ 6 ＝ ${7 * 3 + 6}`);
  assert.equal(fury.damage, resolveRound(match, { cardId: 'chiling', pills: 2, fury: true }, { cardId: 'yaoheng', pills: 0, fury: false }).lastResult.player.damage);
  assert.equal(costText(fury, match.player.pills), `怒擊 傷 ${fury.damage} · 共消耗 ${2 + RULES.furyCost} 丹 · 剩 ${12 - 2 - RULES.furyCost} 丹`);
  assert.match(fury.sentence, new RegExp(`怒擊另付 ${RULES.furyCost} 丹，不加攻擊`));
  // 霜璃 announced: 照心 blocks the player's ability, and the sentence says so.
  const blocked = attackFormula(match, { cardId: 'chiling', pills: 2 }, { announcedCardId: 'shuangli' });
  assert.equal(blocked.text, '力 7 ×（1＋2 丹）＝ 21');
  assert.equal(blocked.blocked, '破曉'); assert.match(blocked.sentence, /破曉被封鎖/);
});

test('D3 formula: only the announced card ID reaches it, so two hidden bids give the same formula; a non-open card is refused', () => {
  for (let seed = 201; seed <= 230; seed++) {
    const match = randomMatch(seed);
    match.initiative = 'opponent';
    const committed = chooseAIMove(match, seeded(seed));
    const other = { ...committed, pills: committed.pills ? 0 : Math.min(4, match.opponent.pills), fury: !committed.fury && match.opponent.pills >= RULES.furyCost };
    for (const draft of drafts(match).slice(0, 12)) {
      const first = attackFormula(match, draft, { announcedCardId: permittedAnnouncement(match, committed) });
      const second = attackFormula(match, draft, { announcedCardId: permittedAnnouncement(match, other) });
      assert.deepEqual(first, second);
    }
  }
  const match = randomMatch(7);
  const used = resolveRound(match, { cardId: match.player.hand[0], pills: 0, fury: false }, { cardId: match.opponent.hand[0], pills: 0, fury: false });
  assert.throws(() => attackFormula(used, { cardId: used.player.hand[1] }, { announcedCardId: used.opponent.hand[0] }), RangeError);
  assert.throws(() => attackFormula(match, { cardId: match.player.hand[0] }, { announcedCardId: 'not-a-card' }), RangeError);
});

test('D3 formula: opponent power and attack effects of an announced card show as minus terms, and a clamped attack still reads 1', () => {
  const match = createMatch({ rng: () => 0.23 });
  // 貂蟬 announced: 離間 opponent power −1, and with 霜璃 in the same hand 月蝕 attack −6.
  match.player.hand = ['duying', 'qingxiao', 'chiling', 'cangjiao']; match.opponent.hand = ['diaochan', 'shuangli', 'yaoheng', 'yanxin'];
  assert.equal(hasFactionBonus(match, 'opponent', 'diaochan'), true);
  const clamped = attackFormula(match, { cardId: 'duying', pills: 0 }, { announcedCardId: 'diaochan' });
  assert.equal(clamped.attack, 1); assert.equal(clamped.clamped, true);
  assert.equal(clamped.text, '（力 6 − 1）×（1＋0 丹）− 6 ＝ 1');
  assert.match(clamped.sentence, /最低為 1/);
  assertShownMatches(clamped);
  const raised = attackFormula(match, { cardId: 'duying', pills: 4 }, { announcedCardId: 'diaochan' });
  assert.equal(raised.attack, resolveRound(match, { cardId: 'duying', pills: 4, fury: false }, { cardId: 'diaochan', pills: 3, fury: false }).lastResult.player.attack);
  assert.equal(raised.text, `（力 6 − 1）×（1＋4 丹）− 6 ＝ ${5 * 5 - 6}`);
  assert.equal(formulaVariants(raised).at(-1), '5×5−6');
});

/** A deep, unfrozen copy whose every property read is recorded. */
function recording(value, path = [], seen = new Set()) {
  if (!value || typeof value !== 'object') return value;
  return new Proxy(Array.isArray(value) ? [...value] : { ...value }, {
    get(target, key, receiver) {
      if (typeof key === 'symbol') return Reflect.get(target, key, receiver);
      const at = [...path, key].join('.'); seen.add(at);
      return recording(Reflect.get(target, key, receiver), [...path, key], seen);
    },
  });
}

test('D3 reveal tip: states both remaining pills from match state and reads only those public fields', () => {
  let rounds = 0;
  for (let seed = 301; seed <= 380; seed++) {
    let match = randomMatch(seed);
    const rng = seeded(seed);
    while (match.status === 'playing') {
      const playerMove = { cardId: open(match, 'player')[0], pills: Math.min(match.player.pills, Math.floor(rng() * 5)), fury: false };
      match = resolveRound(match, playerMove, chooseAIMove(match, rng, playerMove.cardId));
      const view = createRevealView(match), seen = new Set();
      const tip = revealTip(recording(structuredClone(view), [], seen));
      assert.equal(tip.opponentPills, match.opponent.pills, `seed ${seed} round ${match.lastResult.round}`);
      assert.equal(tip.playerPills, match.player.pills);
      assert.ok(tip.text.startsWith(`對手剩 ${match.opponent.pills} 丹 · 你剩 ${match.player.pills} 丹 · `), tip.text);
      // The public reveal view holds no next AI move; the tip reads nothing beyond these fields.
      for (const key of seen) assert.ok(['phase', 'next', 'next.round', 'rounds', 'opponent', 'opponent.pills', 'player', 'player.pills'].includes(key), `the tip read ${key}`);
      assert.deepEqual(revealTip(view), tip);
      assert.equal(tip.kind === 'final', match.status === 'finished');
      rounds++;
    }
  }
  assert.ok(rounds > 200);
});

test('D3 reveal tip: a heavy round-1 opponent bid reads 對手丹藥將盡; other states name the right hint', () => {
  const view = (opponent, player, nextRound = 2) => ({ phase: 'reveal', rounds: 4, next: nextRound ? { round: nextRound } : null, opponent: { pills: opponent }, player: { pills: player } });
  // The measured first-battle pattern: 5 pills plus Fury in round 1 leaves 4.
  assert.equal(revealTip(view(4, 12)).kind, 'low');
  assert.equal(revealTip(view(4, 12)).text, '對手剩 4 丹 · 你剩 12 丹 · 對手丹藥將盡');
  assert.equal(revealTip(view(0, 3)).hint, '對手丹藥已盡');
  assert.equal(revealTip(view(9, 3)).hint, '提防對手重注');
  assert.equal(revealTip(view(5, 0)).kind, 'rich', 'an opponent with four more pills is a threat, however few remain');
  assert.equal(revealTip(view(8, 12)).kind, 'lead');
  assert.equal(revealTip(view(6, 6)).kind, 'even');
  assert.equal(revealTip(view(1, 1, 4)).kind, 'low', 'one pill for the last round');
  assert.equal(revealTip(view(2, 2, 4)).kind, 'even');
  assert.equal(revealTip(view(3, 7, null)).text, '對手剩 3 丹 · 你剩 7 丹 · 此局已定');
  assert.throws(() => revealTip({ phase: 'planning' }), RangeError);
});

test('D3 planning hint names the three steps with the table\'s own commit label', () => {
  assert.equal(planningHint({ phase: 'planning' }, { commitLabel: '封丹 · 落子' }), '選一張戰卡 → 定仙丹 → 封丹 · 落子');
  assert.equal(planningHint({ phase: 'planning' }), '選一張戰卡 → 定仙丹 → 落子 · 決勝');
  assert.match(planningHint({ phase: 'reveal', finished: false }), /下一回合/);
  assert.throws(() => planningHint(null), RangeError);
});

test('D3 coach marks start only on the first ever battle at 霧隱渡口, in its first round', () => {
  const match = createMatch({ rng: () => 0.23, mode: 'expedition' });
  const first = { kind: 'expedition', nodeId: 'mist-gate' };
  assert.equal(coachStart({ encounter: first, played: 0, match }), 'card');
  assert.equal(coachStart({ encounter: first, played: 0, match, seen: 'skipped' }), null);
  assert.equal(coachStart({ encounter: first, played: 0, match, seen: 'done' }), null);
  assert.equal(coachStart({ encounter: first, played: 1, match }), null, 'a finished battle means this is not the first');
  assert.equal(coachStart({ encounter: { kind: 'expedition', nodeId: 'cloud-ferry' }, played: 0, match }), null);
  assert.equal(coachStart({ encounter: { kind: 'practice', nodeId: null }, played: 0, match }), null);
  assert.equal(coachStart({ encounter: first, played: 0, match: null }), null);
  const after = resolveRound(match, { cardId: match.player.hand[0], pills: 0, fury: false }, { cardId: match.opponent.hand[0], pills: 0, fury: false });
  assert.equal(coachStart({ encounter: first, played: 0, match: after, revealPending: true }), 'reveal', 'a reload in the round-1 reveal resumes its last mark');
  assert.equal(coachStart({ encounter: first, played: 0, match: after, revealPending: false }), null, 'round 2 is past the coach');
});

test('D3 coach marks advance in order card → pills → commit → reveal → done, never back', () => {
  assert.deepEqual(COACH_STEPS, ['card', 'pills', 'commit', 'reveal']);
  assert.equal(advanceCoach('card', 'select'), 'pills');
  assert.equal(advanceCoach('card', 'pills'), 'commit', 'adding pills first skips ahead');
  assert.equal(advanceCoach('pills', 'pills'), 'commit');
  assert.equal(advanceCoach('pills', 'fury'), 'commit');
  assert.equal(advanceCoach('commit', 'select'), 'commit', 'a later card change does not go back');
  assert.equal(advanceCoach('card', 'commit'), 'reveal');
  assert.equal(advanceCoach('reveal', 'continue'), 'done');
  assert.equal(advanceCoach('commit', 'continue'), 'commit');
  assert.equal(advanceCoach(null, 'select'), null);
  for (const [index, step] of COACH_STEPS.entries()) {
    const copy = coachCopy(step, { leader: 'opponent', commitLabel: '封丹 · 落子' });
    assert.equal(copy.index, index); assert.equal(copy.total, 4); assert.equal(copy.mark, '①②③④'[index]);
    assert.ok([...copy.text].length <= 34, `${step} fits two lines of a 360 px phone: ${copy.text}`);
  }
  assert.match(coachCopy('commit', { commitLabel: '封丹 · 落子' }).text, /「封丹 · 落子」/);
  assert.match(coachCopy('pills').text, /攻擊＝力×（1＋丹）/);
  assert.notEqual(coachCopy('card', { leader: 'player' }).text, coachCopy('card', { leader: 'opponent' }).text);
  assert.throws(() => coachCopy('elsewhere'), RangeError);
});

test('D3 coach memory writes only its own device-local key, once, and survives a storage that throws', () => {
  assert.equal(COACH_KEY, 'shanhai.coach.v1');
  assert.notEqual(COACH_KEY, PROFILE_KEY);
  const values = new Map(), writes = [];
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { writes.push(key); values.set(key, value); } };
  const memory = createCoachMemory(storage);
  assert.equal(memory.seen(), null);
  memory.finish('skipped'); memory.finish('done');
  assert.deepEqual(writes, [COACH_KEY]);
  assert.equal(JSON.parse(values.get(COACH_KEY)).firstBattle, 'skipped');
  assert.equal(createCoachMemory(storage).seen(), 'skipped', 'a reload reads the same record');
  assert.throws(() => memory.finish('later'), RangeError);
  values.set(COACH_KEY, '{"firstBattle":"perhaps"}');
  assert.equal(createCoachMemory(storage).seen(), null, 'an unknown record is not a seen coach');
  values.set(COACH_KEY, 'not json');
  assert.equal(createCoachMemory(storage).seen(), null);
  const broken = createCoachMemory({ getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } });
  assert.equal(broken.seen(), null);
  broken.finish('done');
  assert.equal(broken.seen(), 'done', 'without storage the page still remembers for its own life');
  const none = createCoachMemory(null); none.finish('skipped'); assert.equal(none.seen(), 'skipped');
});
