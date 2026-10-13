import assert from 'node:assert/strict';
import test from 'node:test';
import { CARDS, RULES, createMatch, previewMove, resolveRound, validateDeck, hasFactionBonus, chooseAIMove } from '../engine.mjs';
import { createRevealView, permittedAnnouncement } from '../battle-presentation.mjs';
import { PROFILE_KEY } from '../progression.mjs';
import {
  attackFormula, formulaVariants, costText, furyNote, planningHint, revealTip,
  coachStart, advanceCoach, coachCopy, createCoachMemory, COACH_KEY, COACH_STEPS, COACH_DONE,
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

/** Evaluates a shown formula ("（力 7 ＋ 1）×（1＋3 丹）＋ 6 ＝ 38") with a tiny parser: digits, + − × and parentheses
 * only, then an optional "＝ total" and an optional "→ 最低 N" (the engine's minimum, for a sum under 1). */
function evaluateShown(text) {
  const normalized = text.replace(/[力丹\s]/g, '').replace(/[（(]/g, '(').replace(/[）)]/g, ')').replace(/[＋+]/g, '+').replace(/[−－]/g, '-');
  const [stated, minimum] = normalized.split('→最低');
  const [expression, total] = stated.split('＝');
  assert.match(expression, /^[0-9+\-×()]+$/, `only arithmetic is shown: ${text}`);
  let position = 0;
  const peek = () => expression[position];
  const number = () => { const start = position; while (/[0-9]/.test(peek() ?? '')) position++; assert.ok(position > start, `a number at ${position} in ${text}`); return Number(expression.slice(start, position)); };
  const factor = () => { if (peek() === '(') { position++; const value = sumOf(); assert.equal(expression[position++], ')'); return value; } return number(); };
  const product = () => { let value = factor(); while (peek() === '×') { position++; value *= factor(); } return value; };
  const sumOf = () => { let value = product(); while (peek() === '+' || peek() === '-') { const sign = expression[position++]; value += (sign === '+' ? 1 : -1) * product(); } return value; };
  const value = sumOf();
  assert.equal(position, expression.length, `the whole formula parses: ${text}`);
  if (total !== undefined) assert.match(total, /^-?[0-9]+$/, `the total is a number: ${text}`);
  if (minimum !== undefined) assert.match(minimum, /^[0-9]+$/, `the minimum is a number: ${text}`);
  return { value, total: total === undefined ? null : Number(total), minimum: minimum === undefined ? null : Number(minimum) };
}
/** Every visible form is a true statement: its sum is the engine's attack, or, for a sum under 1, it says
 * so and names the engine's minimum. No form claims a sum it does not have. */
function assertShownMatches(formula) {
  assert.ok(formula.consistent, 'the terms add up to the engine number');
  assert.ok(formula.variants.length >= 2);
  assert.equal(formula.text, formula.variants[0]);
  for (const variant of formula.variants) {
    const { value, total, minimum } = evaluateShown(variant);
    if (total !== null) assert.equal(total, value, `${variant}: the stated total is the sum shown`);
    if (formula.clamped) {
      assert.ok(value < 1, `${variant}: a clamped sum is under 1`);
      assert.equal(minimum, formula.attack, `${variant} names the engine's minimum`);
      assert.equal(formula.attack, 1);
    } else {
      assert.equal(minimum, null, `${variant}: no minimum on a sum of 1 or more`);
      assert.equal(value, formula.attack, `${variant} states the engine's attack`);
    }
  }
  return formula.clamped;
}

test('D3 formula: an announced opponent card gives exactly resolveRound\'s player attack and damage, whatever the hidden bid', () => {
  let checked = 0, clamped = 0;
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
        if (assertShownMatches(formula)) clamped++;
        checked++;
      }
      const next = open(match, 'player')[0], reply = open(match, 'opponent')[0];
      match = resolveRound(match, { cardId: next, pills: 1, fury: false }, { cardId: reply, pills: 2, fury: false });
    }
  }
  assert.ok(checked > 5000, `${checked} announced drafts checked`);
  assert.ok(clamped > 0, `clamped sums are among them (${clamped})`);
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
  // The cost line keeps only the cost and the pills left (it may end in an ellipsis on a phone);
  // Fury's damage is on the Fury toggle, whose note states the rule while it is off.
  assert.equal(costText(fury, match.player.pills), `共消耗 ${2 + RULES.furyCost} 丹 · 剩 ${12 - 2 - RULES.furyCost} 丹`);
  assert.equal(furyNote(fury), `另付 ${RULES.furyCost} 丹 · 傷害 ${fury.damage}`);
  assert.equal(furyNote(plain), `另付 ${RULES.furyCost} 丹 · 傷害 +${RULES.furyDamage}`);
  // Without an announced card, a reply that could reduce the damage makes it 預計傷.
  const unknown = attackFormula(match, { cardId: 'chiling', pills: 2, fury: true });
  assert.equal(furyNote(unknown), `另付 ${RULES.furyCost} 丹 · ${unknown.exactDamage ? '傷害' : '預計傷'} ${unknown.damage}`);
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

test('D3 formula: opponent power and attack effects of an announced card show as minus terms; a sum under 1 shows its true total and the engine\'s minimum of 1', () => {
  const match = createMatch({ rng: () => 0.23 });
  // 貂蟬 announced: 離間 opponent power −1, and with 霜璃 in the same hand 月蝕 attack −6.
  match.player.hand = ['duying', 'qingxiao', 'chiling', 'cangjiao']; match.opponent.hand = ['diaochan', 'shuangli', 'yaoheng', 'yanxin'];
  assert.equal(hasFactionBonus(match, 'opponent', 'diaochan'), true);
  const clamped = attackFormula(match, { cardId: 'duying', pills: 0 }, { announcedCardId: 'diaochan' });
  assert.equal(clamped.attack, 1); assert.equal(clamped.clamped, true);
  // Review round 1: these forms used to read '… − 6 ＝ 1' and '5×1−6' beside 1, sums that are really −1.
  assert.equal(clamped.raw, -1);
  assert.deepEqual(clamped.variants, ['（力 6 − 1）×（1＋0 丹）− 6 ＝ −1 → 最低 1', '(力6−1)×(1+0丹)−6＝−1→最低1', '(力6−1)×(1+0丹)−6→最低1', '力5×(1+0丹)−6→最低1', '5×1−6→最低1']);
  assert.match(clamped.sentence, /最低為 1/);
  assertShownMatches(clamped);
  const zero = attackFormula(match, { cardId: 'cangjiao', pills: 0 }, { announcedCardId: 'diaochan' });
  assert.equal(zero.text, '（力 7 − 1）×（1＋0 丹）− 6 ＝ 0 → 最低 1');
  assertShownMatches(zero);
  // The default deck at 0 pills: 霜璃's 照心 blocks 翠弦's +8 and 月蝕 (with 渡影 in the same hand) takes 6.
  const blocked = createMatch({ rng: () => 0.23 });
  blocked.player.hand = ['cuixian', 'qingxiao', 'chiling', 'cangjiao']; blocked.opponent.hand = ['shuangli', 'duying', 'yaoheng', 'yanxin']; blocked.initiative = 'opponent';
  const silenced = attackFormula(blocked, { cardId: 'cuixian', pills: 0 }, { announcedCardId: 'shuangli' });
  assert.equal(silenced.attack, resolveRound(blocked, { cardId: 'cuixian', pills: 0, fury: false }, { cardId: 'shuangli', pills: 0, fury: false }).lastResult.player.attack);
  assert.deepEqual(silenced.variants, ['力 6 ×（1＋0 丹）− 6 ＝ 0 → 最低 1', '力6×(1+0丹)−6＝0→最低1', '力6×(1+0丹)−6→最低1', '6×1−6→最低1']);
  assertShownMatches(silenced);
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

test('D3 coach marks start only on the first ever battle at 霧隱渡口, in its first round (or round 2 for an owed ②)', () => {
  const match = createMatch({ rng: () => 0.23, mode: 'expedition' });
  const first = { kind: 'expedition', nodeId: 'mist-gate' };
  assert.deepEqual(coachStart({ encounter: first, played: 0, match }), { step: 'card', owed: false });
  assert.deepEqual(coachStart({ encounter: first, played: 0, match, owed: true }), { step: 'card', owed: false }, 'a new round 1 starts clean; its own commit decides what is owed');
  assert.equal(coachStart({ encounter: first, played: 0, match, seen: 'skipped' }), null);
  assert.equal(coachStart({ encounter: first, played: 0, match, seen: 'done' }), null);
  assert.equal(coachStart({ encounter: first, played: 1, match }), null, 'a finished battle means this is not the first');
  assert.equal(coachStart({ encounter: { kind: 'expedition', nodeId: 'cloud-ferry' }, played: 0, match }), null);
  assert.equal(coachStart({ encounter: { kind: 'practice', nodeId: null }, played: 0, match }), null);
  assert.equal(coachStart({ encounter: first, played: 0, match: null }), null);
  const after = resolveRound(match, { cardId: match.player.hand[0], pills: 0, fury: false }, { cardId: match.opponent.hand[0], pills: 0, fury: false });
  assert.deepEqual(coachStart({ encounter: first, played: 0, match: after, revealPending: true }), { step: 'reveal', owed: false }, 'a reload in the round-1 reveal resumes its last mark');
  assert.equal(coachStart({ encounter: first, played: 0, match: after, revealPending: false }), null, 'round 2 is past the coach');
  // Review round 2: a round 1 committed from ① owes ②, also across a reload.
  assert.deepEqual(coachStart({ encounter: first, played: 0, match: after, revealPending: true, owed: true }), { step: 'reveal', owed: true });
  assert.deepEqual(coachStart({ encounter: first, played: 0, match: after, revealPending: false, owed: true }), { step: 'pills', owed: true }, 'round 2 opens on the owed ②');
  assert.equal(coachStart({ encounter: first, played: 0, match: after, revealPending: false, owed: true, seen: 'skipped' }), null);
  const later = resolveRound(after, { cardId: after.player.hand[1], pills: 0, fury: false }, { cardId: after.opponent.hand[1], pills: 0, fury: false });
  assert.equal(coachStart({ encounter: first, played: 0, match: later, revealPending: false, owed: true }), null, 'only round 2 can repay ②');
});

/** The marks a sequence of taught actions shows, from ①: the coach's own walk, one state at a time. */
function walk(events, { lastRound = false } = {}) {
  let coach = coachStart({ encounter: { kind: 'expedition', nodeId: 'mist-gate' }, played: 0, match: createMatch({ rng: () => 0.23, mode: 'expedition' }) });
  const shown = [coach.step];
  for (const event of events) {
    const next = advanceCoach(coach, event, { nextRound: !lastRound });
    if (next === coach) continue;
    coach = next;
    if (coach.step !== 'done') shown.push(coach.step);
  }
  return { shown, end: coach };
}

test('D3 coach marks advance in order card → pills → commit → reveal → done, never back', () => {
  assert.deepEqual(COACH_STEPS, ['card', 'pills', 'commit', 'reveal']);
  const at = (step, owed = false) => Object.freeze({ step, owed });
  assert.deepEqual(advanceCoach(at('card'), 'select'), at('pills'));
  assert.deepEqual(advanceCoach(at('pills'), 'pills'), at('commit'));
  assert.deepEqual(advanceCoach(at('pills'), 'fury'), at('commit'));
  assert.deepEqual(advanceCoach(at('pills'), 'commit'), at('reveal'));
  const third = at('commit');
  assert.equal(advanceCoach(third, 'select'), third, 'a later card change does not go back');
  assert.equal(advanceCoach(third, 'continue'), third);
  assert.deepEqual(advanceCoach(third, 'commit'), at('reveal'));
  assert.equal(advanceCoach(at('reveal'), 'continue'), COACH_DONE);
  assert.equal(COACH_DONE.step, 'done');
  assert.equal(advanceCoach(null, 'select'), null);
  assert.deepEqual(walk(['select', 'pills', 'pills', 'commit', 'continue']), { shown: ['card', 'pills', 'commit', 'reveal'], end: COACH_DONE });
  for (const [index, step] of COACH_STEPS.entries()) {
    const copy = coachCopy(step, { leader: 'opponent', commitLabel: '封丹 · 落子' });
    assert.equal(copy.index, index); assert.equal(copy.total, 4); assert.equal(copy.mark, '①②③④'[index]);
    // A budget only: whether the copy fits two lines at 360 px is measured in the browser (npm run test:coach).
    assert.ok([...copy.text].length <= 32, `${step} stays within the copy budget: ${copy.text}`);
  }
  assert.match(coachCopy('commit', { commitLabel: '封丹 · 落子' }).text, /「封丹 · 落子」/);
  assert.match(coachCopy('pills').text, /攻擊＝力×（1＋丹）/);
  assert.notEqual(coachCopy('card', { leader: 'player' }).text, coachCopy('card', { leader: 'opponent' }).text);
  assert.throws(() => coachCopy('elsewhere'), RangeError);
});

test('D3 review round 2: mark ② (what pills do) is never skipped, whichever control the player uses on ①', () => {
  const at = (step, owed = false) => Object.freeze({ step, owed });
  // Pills, the slider or Fury on ① show ②, not ③.
  assert.deepEqual(advanceCoach(at('card'), 'pills'), at('pills'));
  assert.deepEqual(advanceCoach(at('card'), 'fury'), at('pills'));
  assert.deepEqual(walk(['pills', 'pills', 'commit', 'continue']).shown, ['card', 'pills', 'commit', 'reveal']);
  assert.deepEqual(walk(['fury', 'commit', 'continue']).shown, ['card', 'pills', 'reveal']);
  // A commit straight from ① (a card is already chosen, at 0 pills) shows ④ and owes ②.
  assert.deepEqual(advanceCoach(at('card'), 'commit'), at('reveal', true));
  // 繼續 or 知道了 after ④ then opens round 2 on ②, which stays while pills are set ...
  const owed = advanceCoach(at('reveal', true), 'continue');
  assert.deepEqual(owed, at('pills', true));
  for (const event of ['select', 'pills', 'fury', 'continue']) assert.equal(advanceCoach(owed, event), owed, `${event} keeps the owed ② on round 2's table`);
  // ... and round 2's commit completes the coach.
  assert.equal(advanceCoach(owed, 'commit'), COACH_DONE);
  const straight = walk(['commit', 'continue', 'pills', 'pills', 'commit']);
  assert.deepEqual(straight.shown, ['card', 'reveal', 'pills'], 'the commit-first player still sees ②, on round 2');
  assert.equal(straight.end, COACH_DONE);
  // Every walk shows ② once, unless the match ends with round 1.
  for (const events of [['commit', 'continue', 'commit'], ['pills', 'commit', 'continue'], ['select', 'commit', 'continue'], ['fury', 'fury', 'commit', 'continue']]) {
    const { shown, end } = walk(events);
    assert.equal(shown.filter(step => step === 'pills').length, 1, `${events.join(' → ')} shows ② once (${shown.join(', ')})`);
    assert.equal(end, COACH_DONE);
  }
  assert.equal(advanceCoach(at('reveal', true), 'continue', { nextRound: false }), COACH_DONE, 'no round 2: the coach completes');
});

test('D3 coach memory keeps an owed ② across a reload, writes only on a change, and an ending replaces it', () => {
  const values = new Map(), writes = [];
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { writes.push(key); values.set(key, value); } };
  const memory = createCoachMemory(storage);
  assert.equal(memory.owed(), false);
  memory.owe(false);
  assert.deepEqual(writes, [], 'nothing owed, nothing written');
  memory.owe(true); memory.owe(true);
  assert.deepEqual(writes, [COACH_KEY]);
  assert.deepEqual(JSON.parse(values.get(COACH_KEY)), { owed: 'pills' });
  assert.equal(createCoachMemory(storage).owed(), true, 'a reload reads the debt');
  assert.equal(createCoachMemory(storage).seen(), null, 'an owed ② is not a seen coach');
  memory.owe(false);
  assert.deepEqual(JSON.parse(values.get(COACH_KEY)), {}, '② shown after all clears the debt');
  assert.equal(createCoachMemory(storage).owed(), false);
  memory.owe(true); memory.finish('done');
  assert.deepEqual(JSON.parse(values.get(COACH_KEY)), { firstBattle: 'done' });
  assert.equal(memory.owed(), false);
  memory.owe(true);
  assert.deepEqual(JSON.parse(values.get(COACH_KEY)), { firstBattle: 'done' }, 'nothing is owed after an ending');
  assert.ok(writes.every(key => key === COACH_KEY));
  const broken = createCoachMemory({ getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } });
  broken.owe(true);
  assert.equal(broken.owed(), true, 'without storage the page still remembers for its own life');
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
