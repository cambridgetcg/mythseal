/**
 * First-battle teaching (packet D3): the live attack formula, the planning hint,
 * the post-reveal tip and the first-battle coach marks. Pure: no DOM, no storage
 * of its own and no randomness. The coach memory is handed its storage, as
 * experience.mjs is; it never touches the profile, a battle snapshot or a backup.
 *
 * The formula's number is always the engine's own: resolveRound for an opponent
 * card the player can see, previewMove otherwise. Its terms are derived from the
 * same public card data and checked against that number; a term list that would
 * not add up is dropped rather than shown (docs/BATTLE-LAYOUT-PLAN.md, "First
 * battle teaching").
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
  // The terms must add up to the engine's numbers; if a rule ever changes without
  // this module, the engine's number is shown alone rather than a wrong sum.
  const consistent = parts.attack === engine.attack && parts.damage === engine.damage;
  const formula = {
    cardId: parts.card.id, name: parts.card.name, basePower: parts.card.power, baseDamage: parts.card.damage,
    pills, multiplier: 1 + pills, fury, cost: engine.cost, furyCost: RULES.furyCost, furyDamage: RULES.furyDamage,
    power: parts.power, powerTerms: parts.powerTerms, attackTerms: parts.attackTerms, damageTerms: parts.damageTerms,
    attack: engine.attack, damage: engine.damage, clamped: parts.raw < 1, blocked: parts.blocked ? short(parts.blocked.label) : null,
    exact, exactDamage, known: announcedCardId, consistent,
  };
  const variants = consistent ? formulaVariants(formula) : [];
  return Object.freeze({ ...formula, variants: Object.freeze(variants), text: variants[0] ?? '', sentence: formulaSentence(formula) });
}

/**
 * Visible forms of one formula, widest first; the move panel shows the first that
 * fits its cell on one line. Each states the same arithmetic as the engine:
 * 力 7 ×（1＋3 丹）＋ 6 ＝ 34 · 力7×(1+3丹)+6＝34 · 力7×(1+3丹)+6 · 7×4+6.
 * Power terms fold into the card's power only in the last two forms.
 */
export function formulaVariants(formula) {
  const { basePower, power, pills, attack, powerTerms, attackTerms } = formula;
  const net = sum(attackTerms), folded = net ? signed(net) : '';
  const wide = `${powerTerms.length ? `（力 ${basePower} ${powerTerms.map(item => spaced(item.value)).join(' ')}）` : `力 ${basePower} `}×（1＋${pills} 丹）${attackTerms.map(item => `${spaced(item.value)} `).join('')}＝ ${attack}`;
  const head = powerTerms.length ? `(力${basePower}${powerTerms.map(item => signed(item.value)).join('')})` : `力${basePower}`;
  const compact = `${head}×(1+${pills}丹)${attackTerms.map(item => signed(item.value)).join('')}`;
  const list = [wide, `${compact}＝${attack}`, compact, `力${power}×(1+${pills}丹)${folded}`, `${power}×${1 + pills}${folded}`];
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

/** The move panel's cost line; with Fury on it also states the damage a win deals. */
export function costText(formula, reserve) {
  const cost = `共消耗 ${formula.cost} 丹 · 剩 ${reserve - formula.cost} 丹`;
  return formula.fury ? `怒擊 ${formula.exactDamage ? '' : '預計'}傷 ${formula.damage} · ${cost}` : cost;
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
 */
export function revealTip(view) {
  if (view?.phase !== 'reveal') throw new RangeError('The tip needs a reveal view.');
  const opponentPills = view.opponent.pills, playerPills = view.player.pills;
  const roundsLeft = view.next ? view.rounds - view.next.round + 1 : 0;
  let kind;
  if (!view.next) kind = 'final';
  else if (opponentPills === 0) kind = 'empty';
  else if (opponentPills >= playerPills + 4) kind = 'rich';
  else if (opponentPills < 2 * roundsLeft) kind = 'low';
  else if (playerPills >= opponentPills + 4) kind = 'lead';
  else kind = 'even';
  const hint = { final: '此局已定', empty: '對手丹藥已盡', rich: '提防對手重注', low: '對手丹藥將盡', lead: '你丹較多，可後發制人', even: '雙方丹藥相近' }[kind];
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
 * Which coach mark the first battle starts on, or null. Only the player's first
 * ever battle (no battle finished yet) at the first 霧隱渡口 encounter, and only its
 * first round: planning starts at 'card'; a round-1 reveal (after a reload) at 'reveal'.
 */
export function coachStart({ seen = null, encounter = null, played = 0, match = null, revealPending = false } = {}) {
  if (seen || encounter?.kind !== 'expedition' || encounter.nodeId !== FIRST_NODE || played !== 0 || !match) return null;
  const rounds = match.history?.length ?? 0;
  if (!revealPending && match.status === 'playing' && rounds === 0) return 'card';
  if (revealPending && rounds === 1) return 'reveal';
  return null;
}

const COACH_AFTER = Object.freeze({ select: 'pills', pills: 'commit', fury: 'commit', commit: 'reveal' });
/** A taught action moves the coach forward, never back; 'continue' after the reveal completes it. */
export function advanceCoach(step, event) {
  if (!COACH_STEPS.includes(step)) return step ?? null;
  if (event === 'continue') return step === 'reveal' ? 'done' : step;
  const target = COACH_AFTER[event];
  return target && COACH_STEPS.indexOf(target) > COACH_STEPS.indexOf(step) ? target : step;
}

const MARKS = ['①', '②', '③', '④'];
/** The coach mark's words, in the table's voice. Each fits two lines of a 360 px phone. */
export function coachCopy(step, { leader = 'player', commitLabel = '落子 · 決勝' } = {}) {
  const index = COACH_STEPS.indexOf(step);
  if (index < 0) throw new RangeError('Unknown coach step.');
  const text = {
    card: leader === 'opponent' ? '對手已亮出本輪戰卡。點你的一張戰卡應戰，金框即已選。' : '你持先手，先出牌。點一張戰卡出戰，金框即已選。',
    pills: '按＋投入仙丹：攻擊＝力×（1＋丹）。十二丹分四回合用，用了不回。',
    commit: `定好便按「${commitLabel}」。雙方暗置的仙丹此刻一同揭曉。`,
    reveal: '比「實際攻擊」：高者勝，敗方受勝方傷害。留意對手還剩幾丹。',
  }[step];
  return Object.freeze({ step, index, total: COACH_STEPS.length, mark: MARKS[index], text });
}

/** Seen record for the first-battle coach on this device. A storage that throws
 * (private mode, blocked site data) only costs the record: the coach still stays
 * closed for the rest of the page's life. */
export function createCoachMemory(storage) {
  let local = null;
  const stored = () => {
    try {
      const value = JSON.parse(storage?.getItem(COACH_KEY) ?? 'null');
      return COACH_OUTCOMES.has(value?.firstBattle) ? value.firstBattle : null;
    } catch { return null; }
  };
  return {
    seen: () => local || stored(),
    finish(outcome) {
      if (!COACH_OUTCOMES.has(outcome)) throw new RangeError('A coach ends as done or skipped.');
      if (local || stored()) return;
      local = outcome;
      try { storage?.setItem(COACH_KEY, JSON.stringify({ firstBattle: outcome })); } catch {}
    },
  };
}
