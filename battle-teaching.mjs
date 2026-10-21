/**
 * First-battle teaching (packet D3): the live attack formula, the planning hint,
 * the post-reveal tip and the first-battle coach marks. Pure: no DOM, no storage
 * of its own and no randomness. The coach memory is handed its storage, as
 * experience.mjs is; it never touches the profile, a battle snapshot or a backup.
 *
 * The formula's number is always the engine's own: resolveRound for an opponent
 * card the player can see, previewMove otherwise. Its terms are derived from the
 * same public card data and checked against that number; a term list that would
 * not add up is dropped rather than shown, and a sum under 1 is shown with the
 * engine's minimum of 1 (docs/BATTLE-LAYOUT-PLAN.md, "First battle teaching").
 */
import { RULES, FACTIONS, getBattleCard, hasFactionBonus, previewMove, resolveRound } from './engine.mjs';

const MINUS = '−';
const signed = value => value < 0 ? `${MINUS}${-value}` : `+${value}`;
const spaced = value => value < 0 ? `${MINUS} ${-value}` : `＋ ${value}`;
const sum = items => items.reduce((total, item) => total + item.value, 0);
const term = (effect, sign = 1) => ({ label: effect.label, value: effect.value * sign });
const short = label => String(label).split(' · ')[0];

/** The effects one side's card brings, as resolveRound applies them (engine.mjs, calculateMove). */
function effects(match, card, enemy) {
  // Suppression is simultaneous and never touches a faction bonus.
  const own = [];
  if (enemy?.ability.type !== 'stopAbility') own.push(card.ability);
  if (hasFactionBonus(match, 'player', card.id)) own.push(FACTIONS[card.faction].bonus);
  const foe = [];
  if (enemy) {
    if (card.ability.type !== 'stopAbility') foe.push(enemy.ability);
    if (hasFactionBonus(match, 'opponent', enemy.id)) foe.push(FACTIONS[enemy.faction].bonus);
  }
  return { own, foe, blocked: enemy?.ability.type === 'stopAbility' ? card.ability : null };
}

/** Terms and totals for one player card against one known opponent card (or none). */
function compose(match, move, enemyId) {
  const card = getBattleCard(match, 'player', move.cardId);
  const enemy = enemyId ? getBattleCard(match, 'opponent', enemyId) : null;
  const { own, foe, blocked } = effects(match, card, enemy);
  const pick = (list, type, sign = 1) => list.filter(effect => effect.type === type).map(effect => term(effect, sign));
  const powerTerms = [...pick(own, 'power'), ...pick(foe, 'opponentPower', -1)];
  const attackTerms = [...pick(own, 'attack'), ...pick(foe, 'opponentAttack', -1)];
  const damageTerms = [...pick(own, 'damage'), ...pick(foe, 'reduceDamage', -1)];
  const power = Math.max(1, card.power + sum(powerTerms));
  const raw = power * (1 + move.pills) + sum(attackTerms);
  const damage = Math.max(1, card.damage + sum(damageTerms) + (move.fury ? RULES.furyDamage : 0));
  return { card, powerTerms, attackTerms, damageTerms, power, raw, attack: Math.max(1, raw), damage, blocked };
}

/** The engine's own result for the player's side against one opponent card. The
 * opponent's bid and Fury never change the player's attack or damage, so a zero bid
 * stands in for them; it is never read from a hidden move. */
function engineSide(match, move, enemyId) {
  return resolveRound(match, move, { cardId: enemyId, pills: 0, fury: false }).lastResult.player;
}

/**
 * The live attack formula for the player's draft.
 * - With `announcedCardId` (a leading opponent's card, public for the round) the
 *   number is what resolveRound computes, opponent effects included: `exact`.
 * - Without it, the number is previewMove's (own effects only). It is `exact` when
 *   no card the opponent may still play would change it; otherwise it is an
 *   estimate (預計) before the opponent's hidden choice.
 * Reads only public state: both hands, used cards, levels and the player's own
 * draft. The opponent's move is never an input; only an announced card ID is.
 */
export function attackFormula(match, { cardId, pills = 0, fury = false } = {}, { announcedCardId = null } = {}) {
  const move = { cardId, pills, fury };
  const open = match.opponent.hand.filter(id => !match.opponent.used.includes(id));
  if (announcedCardId !== null && !open.includes(announcedCardId)) throw new RangeError('Only an open opponent card can be announced.');
  let engine, exact, exactDamage;
  if (announcedCardId !== null) {
    engine = engineSide(match, move, announcedCardId);
    exact = exactDamage = true;
  } else {
    engine = previewMove(match, 'player', move);
    const replies = open.map(id => engineSide(match, move, id));
    exact = replies.every(reply => reply.attack === engine.attack);
    exactDamage = replies.every(reply => reply.damage === engine.damage);
  }
  const parts = compose(match, move, announcedCardId);
  // The terms must add up to the engine's numbers (a sum under 1 is shown with the
  // engine's minimum, see formulaVariants); if a rule ever changes without this
  // module, the engine's number is shown alone rather than a wrong sum.
  const consistent = parts.attack === engine.attack && parts.damage === engine.damage;
  const formula = {
    cardId: parts.card.id, name: parts.card.name, basePower: parts.card.power, baseDamage: parts.card.damage,
    pills, multiplier: 1 + pills, fury, cost: engine.cost, furyCost: RULES.furyCost, furyDamage: RULES.furyDamage,
    power: parts.power, powerTerms: parts.powerTerms, attackTerms: parts.attackTerms, damageTerms: parts.damageTerms,
    raw: parts.raw, attack: engine.attack, damage: engine.damage, clamped: parts.raw < 1, blocked: parts.blocked ? short(parts.blocked.label) : null,
    exact, exactDamage, known: announcedCardId, consistent,
  };
  const variants = consistent ? formulaVariants(formula) : [];
  return Object.freeze({ ...formula, variants: Object.freeze(variants), text: variants[0] ?? '', sentence: formulaSentence(formula) });
}

/**
 * Visible forms of one formula, widest first; the move panel shows the first that
 * fits its cell on one line. Each states the same arithmetic as the engine:
 * 力 7 ×（1＋3 丹）＋ 6 ＝ 34 · 力7×(1+3丹)+6＝34 · 力7×(1+3丹)+6 · 7×4+6.
 * Power terms fold into the card's power only in the last two forms. When the sum
 * is under 1 (an opponent's 減攻), the engine counts 1, and every form says so
 * rather than claim the sum is 1: （力 6 − 1）×（1＋0 丹）− 6 ＝ −1 → 最低 1 · … · 5×1−6→最低1.
 */
export function formulaVariants(formula) {
  const { basePower, power, pills, attack, powerTerms, attackTerms, clamped } = formula;
  const net = sum(attackTerms), folded = net ? signed(net) : '';
  const raw = formula.raw ?? attack, total = raw < 0 ? `${MINUS}${-raw}` : `${raw}`;
  const expression = `${powerTerms.length ? `（力 ${basePower} ${powerTerms.map(item => spaced(item.value)).join(' ')}）` : `力 ${basePower} `}×（1＋${pills} 丹）${attackTerms.map(item => `${spaced(item.value)} `).join('')}`;
  const head = powerTerms.length ? `(力${basePower}${powerTerms.map(item => signed(item.value)).join('')})` : `力${basePower}`;
  const compact = `${head}×(1+${pills}丹)${attackTerms.map(item => signed(item.value)).join('')}`;
  const shorter = [compact, `力${power}×(1+${pills}丹)${folded}`, `${power}×${1 + pills}${folded}`];
  const list = clamped
    ? [`${expression}＝ ${total} → 最低 ${attack}`, `${compact}＝${total}→最低${attack}`, ...shorter.map(item => `${item}→最低${attack}`)]
    : [`${expression}＝ ${attack}`, `${compact}＝${attack}`, ...shorter];
  return list.filter((item, index) => list.indexOf(item) === index);
}

/** The whole calculation in words, for the accessible name. */
export function formulaSentence(formula) {
  const named = items => items.map(item => `${item.value < 0 ? '減' : '加'} ${short(item.label)} ${Math.abs(item.value)}`).join('，');
  const power = formula.powerTerms.length ? `力量 ${formula.basePower}，${named(formula.powerTerms)}，得 ${formula.power}` : `力量 ${formula.power}`;
  const attack = formula.attackTerms.length ? `，再${named(formula.attackTerms)}` : '';
  const head = `${formula.exact ? '' : '預計'}攻擊 ${formula.attack}：${power}，乘以（1 加 ${formula.pills} 顆仙丹）${attack}${formula.clamped ? '，最低為 1' : ''}。`;
  const blocked = formula.blocked ? `${formula.blocked}被封鎖。` : '';
  const fury = formula.fury
    ? `怒擊另付 ${formula.furyCost} 丹，不加攻擊；勝則${formula.exactDamage ? '' : '預計'}傷害 ${formula.damage}。`
    : `怒擊另付 ${formula.furyCost} 丹，勝則傷害 +${formula.furyDamage}。`;
  const hidden = formula.exact ? '' : '對手尚未出牌，其封鎖、減力或減攻未計。';
  return `${head}${blocked}${fury}${hidden}`;
}

/**
 * Visible forms of the move panel's cost line, widest first; app.mjs shows the first
 * that fits its cell on one line. It holds only the cost and the pills left (Fury's
 * damage is on its toggle), and every form ends with the pills left, which the
 * narrowest keeps alone: 共消耗 3 丹 · 剩 9 丹 · 消耗 3 丹 · 剩 9 丹 · 耗 3 丹 · 剩 9 丹 ·
 * 耗 3 · 剩 9 丹 · 剩 9 丹. Phones from 302 px wide (N1 removed the page's 340 px
 * minimum) have a cell too narrow for the first form.
 */
export function costVariants(formula, reserve) {
  const cost = formula.cost, left = `剩 ${reserve - formula.cost} 丹`;
  return [`共消耗 ${cost} 丹 · ${left}`, `消耗 ${cost} 丹 · ${left}`, `耗 ${cost} 丹 · ${left}`, `耗 ${cost} · ${left}`, left];
}

/** The cost line's widest form, as a cell wide enough shows it. */
export function costText(formula, reserve) {
  return costVariants(formula, reserve)[0];
}

/** The Fury toggle's note: its rule while off; with Fury on, the damage a win deals
 * (預計傷 when a hidden reply could reduce it). */
export function furyNote(formula) {
  const price = `另付 ${formula.furyCost} 丹`;
  if (!formula.fury) return `${price} · 傷害 +${formula.furyDamage}`;
  return `${price} · ${formula.exactDamage ? '傷害' : '預計傷'} ${formula.damage}`;
}

/** What to do now on the planning table: one short, always visible line. */
export function planningHint(view, { commitLabel = '落子 · 決勝' } = {}) {
  if (view?.phase === 'planning') return `選一張戰卡 → 定仙丹 → ${commitLabel}`;
  if (view?.phase === 'reveal') return view.finished ? '此局已定 · 查看對局結果' : '查看本回合結果，再進下一回合';
  throw new RangeError('The hint needs a planning or reveal view.');
}

/**
 * One short tip after a round's reveal, from the public reveal view only: both
 * sides' remaining pills (as the table already shows them) and the rounds left.
 * Never a hidden bid, Fury or the next AI commitment, which the view does not hold.
 * `spendCap` is the opponent's disclosed per-round limit (O1's 緩渡,
 * docs/GENTLE-GUARDIAN-O1.md), a constant fixed before the battle: where it holds his
 * stake below his reserve, 提防對手重注 would contradict it, so the tip states the limit.
 */
export function revealTip(view, { spendCap = Infinity } = {}) {
  if (view?.phase !== 'reveal') throw new RangeError('The tip needs a reveal view.');
  const opponentPills = view.opponent.pills, playerPills = view.player.pills;
  const roundsLeft = view.next ? view.rounds - view.next.round + 1 : 0;
  let kind;
  if (!view.next) kind = 'final';
  else if (opponentPills === 0) kind = 'empty';
  else if (opponentPills >= playerPills + 4) kind = spendCap < opponentPills ? 'capped' : 'rich';
  else if (opponentPills < 2 * roundsLeft) kind = 'low';
  else if (playerPills >= opponentPills + 4) kind = 'lead';
  else kind = 'even';
  const hint = { final: '此局已定', empty: '對手丹藥已盡', rich: '提防對手重注', capped: `對手每回合至多出 ${spendCap} 丹`, low: '對手丹藥將盡', lead: '你丹較多，可後發制人', even: '雙方丹藥相近' }[kind];
  return Object.freeze({ opponentPills, playerPills, roundsLeft, kind, hint, text: `對手剩 ${opponentPills} 丹 · 你剩 ${playerPills} 丹 · ${hint}` });
}

// ── First-battle coach marks ─────────────────────────────────────────────────

/** Device-local, under its own key beside shanhai.experience.v1: never in the
 * profile, a battle snapshot or a backup. */
export const COACH_KEY = 'shanhai.coach.v1';
export const COACH_STEPS = Object.freeze(['card', 'pills', 'commit', 'reveal']);
const COACH_OUTCOMES = new Set(['done', 'skipped']);
const FIRST_NODE = 'mist-gate';

/**
 * The coach's state: the mark on show and whether mark ② is owed. ② is the only mark
 * that says what pills do, so it is never skipped: a round 1 committed straight from ①
 * owes it. With step 'reveal', `owed` means ② waits for round 2's table; with step
 * 'pills', that this ② is the owed one: hidden on the round-1 reveal once 知道了 has
 * closed ④, then shown on round 2's table.
 */
const coachState = (step, owed = false) => Object.freeze({ step, owed });
/** The state advanceCoach returns once the coach is complete. */
export const COACH_DONE = coachState('done');

/**
 * Which coach state the first battle starts in, or null. Only the player's first
 * ever battle (no battle finished yet) at the first 霧隱渡口 encounter. `place` is
 * the state this device kept for the battle in progress (createCoachMemory), so a
 * reload resumes the mark it interrupted; a new first battle passes none.
 * - Round-1 planning: ①, or the ② or ③ the place reached.
 * - The round-1 reveal: ④, still owing ② if the place owes it; once 知道了 has
 *   closed ④ with ② owed (place {pills, owed}), no mark, and ② still owed.
 * - Round-2 planning: the owed ②, and only when it is owed.
 */
export function coachStart({ seen = null, encounter = null, played = 0, match = null, revealPending = false, place = null } = {}) {
  if (seen || encounter?.kind !== 'expedition' || encounter.nodeId !== FIRST_NODE || played !== 0 || !match) return null;
  const rounds = match.history?.length ?? 0, step = place?.step ?? 'card', owed = Boolean(place?.owed);
  if (!revealPending && match.status === 'playing' && rounds === 0) return coachState(!owed && ['pills', 'commit'].includes(step) ? step : 'card');
  if (revealPending && rounds === 1) return owed && step === 'pills' ? coachState('pills', true) : coachState('reveal', owed);
  if (!revealPending && match.status === 'playing' && rounds === 1 && owed) return coachState('pills', true);
  return null;
}

/**
 * A taught action moves the coach forward, never back, and never past ② before ② has
 * shown. From ①, a card, pills or Fury tap shows ②; from ②, a pills or Fury tap shows
 * ③; a commit shows ④. A commit from ① (a card is already chosen) shows ④ and owes ②,
 * unless its `move` used pills or Fury: a tap on either shows ②, so only a reload that
 * lost the device's record can bring such a draft back under ①. 'continue' (繼續 or
 * 知道了 after ④) then hands over to ② on round 2's table when `nextRound`, and that ②
 * stays while pills are set, until round 2's commit completes the coach. Otherwise
 * 'continue' after ④ completes it. Unchanged input returns the same state object.
 */
export function advanceCoach(coach, event, { nextRound = true, move = null } = {}) {
  if (!coach || !COACH_STEPS.includes(coach.step)) return coach ?? null;
  const { step, owed } = coach;
  if (step === 'card') {
    if (event === 'commit') return coachState('reveal', !(move?.pills > 0 || move?.fury));
    return ['select', 'pills', 'fury'].includes(event) ? coachState('pills') : coach;
  }
  if (step === 'pills' && owed) return event === 'commit' ? COACH_DONE : coach;
  if (step === 'pills') return event === 'commit' ? coachState('reveal') : ['pills', 'fury'].includes(event) ? coachState('commit') : coach;
  if (step === 'commit') return event === 'commit' ? coachState('reveal') : coach;
  if (event !== 'continue') return coach;
  return owed && nextRound ? coachState('pills', true) : COACH_DONE;
}

const MARKS = ['①', '②', '③', '④'];
const NUMERALS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
const numeral = value => NUMERALS[value] ?? String(value);
/** The coach mark's words, in the table's voice. Each must fit two lines of its hint on
 * a 360 px portrait phone, and three (all the 44 px status row holds) down to the
 * 302 px phones N1 supports; npm run test:coach measures the rendered copy there in
 * Chromium and WebKit (a character count is no proof of fit). ② budgets the player's pills over the
 * rounds left, this one included: 十二丹撐四回合 in round 1, 十二丹撐三回合 for an
 * owed ② in round 2. */
export function coachCopy(step, { leader = 'player', commitLabel = '落子 · 決勝', pills = RULES.pills, roundsLeft = RULES.rounds } = {}) {
  const index = COACH_STEPS.indexOf(step);
  if (index < 0) throw new RangeError('Unknown coach step.');
  const text = {
    card: leader === 'opponent' ? '對手已亮出本輪戰卡。點你的一張戰卡應戰，金框即已選。' : '你持先手，先出牌。點一張戰卡出戰，金框即已選。',
    pills: `按＋投入仙丹：攻擊＝力×（1＋丹）。${numeral(pills)}丹撐${numeral(roundsLeft)}回合，莫一次押盡。`,
    commit: `定好便按「${commitLabel}」。雙方暗置的仙丹此刻一同揭曉。`,
    reveal: '比「實際攻擊」：高者勝，敗方受勝方傷害。留意對手還剩幾丹。',
  }[step];
  return Object.freeze({ step, index, total: COACH_STEPS.length, mark: MARKS[index], text });
}

/** The stored form of a coach state: {} for ①, else its step and, when owed, "owed". */
const placeRecord = ({ step, owed }) => step === 'card' && !owed ? {} : { step, ...(owed ? { owed: 'pills' } : {}) };

/**
 * The first-battle coach's record on this device, under COACH_KEY:
 * - {"firstBattle":"done"|"skipped"} once the coach ends; nothing is written after that.
 * - Before an ending, the coach state of the first battle in progress (its "place"), so
 *   a reload resumes the mark it interrupted: {"step":"pills"} or {"step":"commit"} in
 *   round-1 planning, {"step":"reveal"} on the round-1 reveal; with ② owed (round 1
 *   committed from ① at 0 pills, no Fury) {"step":"reveal","owed":"pills"} while ④ is
 *   due, then {"step":"pills","owed":"pills"} from 知道了 or 繼續 on, through round 2's
 *   ②, until round 2's commit (or 跳過, or Back) replaces it with the ending.
 * - Nothing for mark ①: {} is written only when a new first battle starts at ① over a
 *   place an abandoned one left.
 * It is written only when the state changes. A storage that throws (private mode,
 * blocked site data) only costs the record: the page still remembers for its own life.
 */
export function createCoachMemory(storage) {
  let local = null, localPlace = null;
  const record = () => {
    try {
      const value = JSON.parse(storage?.getItem(COACH_KEY) ?? 'null');
      return value && typeof value === 'object' ? value : null;
    } catch { return null; }
  };
  const stored = () => {
    const value = record()?.firstBattle;
    return COACH_OUTCOMES.has(value) ? value : null;
  };
  const seen = () => local || stored();
  /** The kept coach state, or mark ① when none is kept; null after an ending. */
  const place = () => {
    if (seen()) return null;
    if (localPlace) return localPlace;
    const value = record();
    return coachState(COACH_STEPS.includes(value?.step) ? value.step : 'card', value?.owed === 'pills');
  };
  return {
    seen,
    place,
    /** Keeps the coach state in progress; writes only when it changes, never after an ending. */
    keep(state) {
      const now = place();
      if (!now || !COACH_STEPS.includes(state?.step)) return;
      const next = coachState(state.step, Boolean(state.owed));
      if (next.step === now.step && next.owed === now.owed) return;
      localPlace = next;
      try { storage?.setItem(COACH_KEY, JSON.stringify(placeRecord(next))); } catch {}
    },
    finish(outcome) {
      if (!COACH_OUTCOMES.has(outcome)) throw new RangeError('A coach ends as done or skipped.');
      if (seen()) return;
      local = outcome;
      try { storage?.setItem(COACH_KEY, JSON.stringify({ firstBattle: outcome })); } catch {}
    },
  };
}
