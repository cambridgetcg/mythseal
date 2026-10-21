import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES, createMatch } from '../engine.mjs';
import { GENTLE_GUARDIAN, guardianStyle, styleById, aiOptions } from '../guardian-style.mjs';
import { coachStart } from '../battle-teaching.mjs';
import { mistGateArrivalMarkup, mistGateBattleMarkup, mistGateResultMarkup, mistGateRuleMarkup, GENTLE_ARRIVAL_QUOTE } from '../mist-gate-ui.mjs';
import { simulate, playFirstBattle, POLICIES, parseStyle } from '../tools/guardian-sim.mjs';

const ENCOUNTERS = [
  { kind: 'expedition', nodeId: 'mist-gate' },
  { kind: 'expedition', nodeId: 'ember-pass' },
  { kind: 'expedition', nodeId: 'jade-forest' },
  { kind: 'practice', nodeId: null },
  { kind: 'arena', nodeId: null },
  { kind: 'activity', nodeId: null },
  { kind: 'practice', nodeId: 'mist-gate' },
  null,
];

test('O1 緩渡 applies exactly to a first battle at 霧隱渡口, the same battle as D3\'s coach', () => {
  const fresh = createMatch({ rng: () => 0.23, mode: 'expedition' });
  for (const encounter of ENCOUNTERS) for (const played of [0, 1, 2, 10]) {
    const style = guardianStyle({ encounter, played });
    const first = encounter?.kind === 'expedition' && encounter.nodeId === 'mist-gate' && played === 0;
    assert.equal(style, first ? GENTLE_GUARDIAN : null, `${JSON.stringify(encounter)}, played ${played}`);
    // Tied to D3's condition without editing it: coachStart for a fresh match and no device record.
    assert.equal(style !== null, coachStart({ seen: null, encounter, played, match: fresh }) !== null, `${JSON.stringify(encounter)}, played ${played}: the same battle as D3's coach`);
  }
  assert.equal(guardianStyle(), null);
});

test('O1 a returning player and every fair mode keep today\'s AI: no style means no option', () => {
  for (const encounter of ENCOUNTERS) for (const played of [1, 2, 10]) assert.deepEqual(aiOptions(guardianStyle({ encounter, played })), {});
  for (const kind of ['practice', 'arena', 'activity']) assert.deepEqual(aiOptions(guardianStyle({ encounter: { kind, nodeId: null }, played: 0 })), {});
  assert.deepEqual(aiOptions(GENTLE_GUARDIAN), { spendCap: GENTLE_GUARDIAN.spendCap });
  assert.ok(Number.isInteger(GENTLE_GUARDIAN.spendCap) && GENTLE_GUARDIAN.spendCap < RULES.furyCost, 'the disclosed line says he never uses Fury, which holds below its cost');
  assert.ok(Object.isFrozen(GENTLE_GUARDIAN));
});

test('O1 a battle snapshot names the style it started with; one without a name plays today\'s AI', () => {
  assert.equal(styleById(GENTLE_GUARDIAN.id), GENTLE_GUARDIAN);
  for (const id of [undefined, null, '', 'gentle', 'GENTLE-CROSSING', 2]) assert.equal(styleById(id), null, String(id));
});

test('O1 seeded first battles: following the coach wins, never adding pills or spending all at once loses', () => {
  const seeds = Array.from({ length: 200 }, (_, index) => 100001 + index), style = `each:${GENTLE_GUARDIAN.spendCap}`;
  const rate = policy => simulate({ seeds, policy, style }).winRate;
  for (const policy of ['coach', 'late']) assert.ok(rate(policy) >= 0.95, `${policy} wins at least 95 % (${rate(policy)})`);
  for (const policy of ['naive', 'allin']) assert.ok(rate(policy) <= 0.05, `${policy} wins at most 5 % (${rate(policy)})`);
  // The same seed is the same game: the simulation and every capped AI choice are deterministic.
  for (const seed of seeds.slice(0, 5)) assert.deepEqual(playFirstBattle(seed, POLICIES.rand, parseStyle(style)), playFirstBattle(seed, POLICIES.rand, parseStyle(style)));
  // Under the style the AI never commits more than the cap in any round.
  for (const seed of seeds.slice(0, 40)) assert.ok(playFirstBattle(seed, POLICIES.coach, parseStyle(style)).aiSpend.every(spent => spent <= GENTLE_GUARDIAN.spendCap));
});

test('O1 disclosure copy: the guardian hints in his voice, the plain line states the rule, and without a style nothing changes', () => {
  const codePoints = [...GENTLE_ARRIVAL_QUOTE].length;
  assert.ok(codePoints >= 13 && codePoints <= 30, `arrival line: ${codePoints} code points`);
  assert.doesNotMatch(GENTLE_ARRIVAL_QUOTE, /\d|[一二兩三四五六七八九十]丹|怒擊/, 'no number or mechanic in his quoted voice (T1 §2.2)');
  assert.match(mistGateArrivalMarkup({ guardian: GENTLE_GUARDIAN }), new RegExp(`「${GENTLE_ARRIVAL_QUOTE}」`));
  assert.match(mistGateArrivalMarkup({ guardian: GENTLE_GUARDIAN, returning: true }), new RegExp(`「${GENTLE_ARRIVAL_QUOTE}」`));
  assert.equal(mistGateRuleMarkup(GENTLE_GUARDIAN), '<span class="mist-guardian-rule" data-guardian-style="gentle-crossing">緩渡 · 本局守渡弈者每回合至多出 2 丹，不用怒擊</span>');
  assert.equal(mistGateRuleMarkup(null), '');
  const table = mistGateBattleMarkup({ round: 2, initiative: 'opponent', guardian: GENTLE_GUARDIAN });
  assert.match(table, /aria-label="霧隱渡口，守渡弈者，緩渡"/);
  assert.match(table, /<small>守渡弈者 <span aria-hidden="true">·<\/span> 緩渡 <span aria-hidden="true">·<\/span> AI 對弈<\/small>/);
  // Without a style each function returns what it returned before O1.
  for (const returning of [false, true]) assert.equal(mistGateArrivalMarkup({ returning, guardian: null }), mistGateArrivalMarkup({ returning }));
  assert.match(mistGateArrivalMarkup({}), /「不必急着渡河，先看清手中的牌。」/);
  assert.match(mistGateArrivalMarkup({ returning: true }), /「燈還亮着。這一程，你想怎樣走？」/);
  for (const round of [1, 4]) for (const initiative of ['player', 'opponent']) assert.equal(mistGateBattleMarkup({ round, initiative, guardian: null }), mistGateBattleMarkup({ round, initiative }));
  assert.match(mistGateBattleMarkup({}), /aria-label="霧隱渡口，守渡弈者"><div class="mist-battle-place">.*<small>守渡弈者 <span aria-hidden="true">·<\/span> AI 對弈<\/small>/);
  assert.doesNotMatch(mistGateArrivalMarkup({}) + mistGateBattleMarkup({}) + mistGateResultMarkup({ outcome: 'player' }) + mistGateResultMarkup({ outcome: 'opponent' }), /緩渡|不再讓/);
});
