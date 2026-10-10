import { RULES, FACTIONS, getBattleCard, hasFactionBonus } from './engine.mjs';

const SIDES = ['player', 'opponent'];
/** Every table state is written as DOM text; colour and borders only repeat it. */
export const TABLE_LABELS = Object.freeze({ ready: '待出戰', used: '已出戰', announced: '本輪亮牌', played: '本輪出戰', selected: '已選', awaiting: '待對手應戰' });
const deepFreeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
};

/**
 * The only reader of the AI's hidden move. A leading opponent's card is public
 * for the current round; its bid and Fury are never read. Returns a card ID or null.
 * After resolveRound, round/initiative advance while the old move is still held:
 * revealPending and the used-card check keep that stale move off the table.
 */
export function permittedAnnouncement(match, aiMove, { revealPending = false } = {}) {
  if (revealPending || match?.status !== 'playing' || match.initiative !== 'opponent' || !aiMove) return null;
  const id = aiMove.cardId;
  if (!match.opponent.hand.includes(id) || match.opponent.used.includes(id)) throw new RangeError('Announced card is not public for this round.');
  return id;
}

function usedRound(match, side, id) {
  const index = (match.history || []).findIndex(entry => entry?.[side]?.cardId === id);
  return index < 0 ? null : index + 1;
}

/** Effective public stats (expedition ranks included) in the dealt slot order. */
function cardView(match, side, id, slot, state) {
  const card = getBattleCard(match, side, id), faction = FACTIONS[card.faction];
  return {
    id, slot, name: card.name, title: card.title, faction: card.faction, factionName: faction.name, factionIcon: faction.icon, factionColor: faction.color,
    stars: card.stars, power: card.power, damage: card.damage, level: card.level, abilityLabel: card.ability.label,
    bonus: hasFactionBonus(match, side, id), state, label: TABLE_LABELS[state],
    usedRound: state === 'used' || state === 'played' ? usedRound(match, side, id) : null,
  };
}
const publicSide = (match, side, cards) => ({ hp: match[side].hp, pills: match[side].pills, cards });

/**
 * Public table before a commit. It receives at most the permitted announced card
 * ID, never a move object; the player's own draft stays with the caller.
 */
export function createPlanningView(match, { announcedCardId = null } = {}) {
  if (match?.status !== 'playing') throw new RangeError('Planning needs a match in play.');
  const leader = match.initiative;
  if (!SIDES.includes(leader)) throw new RangeError('Unknown initiative.');
  if (announcedCardId !== null) {
    if (leader !== 'opponent' || !match.opponent.hand.includes(announcedCardId) || match.opponent.used.includes(announcedCardId)) {
      throw new RangeError('Only the leading opponent card committed for this round can be announced.');
    }
  } else if (leader === 'opponent') throw new RangeError('A leading opponent commits before the player plans.');
  const cards = side => match[side].hand.map((id, slot) => cardView(match, side, id, slot,
    match[side].used.includes(id) ? 'used' : side === 'opponent' && id === announcedCardId ? 'announced' : 'ready'));
  const opponent = cards('opponent');
  return deepFreeze({
    phase: 'planning', round: match.round, rounds: RULES.rounds, leader,
    prompt: leader === 'player' ? '你持先手 · 請落子' : '你持後手 · 請應戰',
    opponent: { name: match.opponentName || '山海弈者', ...publicSide(match, 'opponent', opponent) },
    player: publicSide(match, 'player', cards('player')),
    center: { opponent: announcedCardId
      ? { state: 'announced', label: TABLE_LABELS.announced, card: opponent.find(card => card.id === announcedCardId) }
      : { state: 'awaiting', label: TABLE_LABELS.awaiting, card: null } },
  });
}

/**
 * Public table after a commit. Labels come from lastResult, because the engine has
 * already advanced round and initiative; accepted bids and Fury are public here.
 */
export function createRevealView(match) {
  const result = match?.lastResult;
  if (!result) throw new RangeError('Reveal needs an accepted round result.');
  const played = { player: result.player.cardId, opponent: result.opponent.cardId };
  const cards = side => match[side].hand.map((id, slot) => cardView(match, side, id, slot,
    id === played[side] ? 'played' : match[side].used.includes(id) ? 'used' : 'ready'));
  const lineups = { player: cards('player'), opponent: cards('opponent') };
  const resolved = side => ({ card: lineups[side].find(card => card.id === played[side]), pills: result[side].pills, fury: result[side].fury, cost: result[side].cost, attack: result[side].attack });
  return deepFreeze({
    phase: 'reveal', round: result.round, rounds: RULES.rounds, leader: result.initiative, finished: match.status === 'finished',
    prompt: `第 ${result.round} 回合 · 已揭曉`,
    next: match.status === 'playing' ? { round: match.round, leader: match.initiative } : null,
    opponent: { name: match.opponentName || '山海弈者', ...publicSide(match, 'opponent', lineups.opponent) },
    player: publicSide(match, 'player', lineups.player),
    center: { player: resolved('player'), opponent: resolved('opponent'), winner: result.winner, damage: result.damage, tieReason: result.tieReason },
  });
}
const bounded = (value, max) => Number.isSafeInteger(value) && value >= 0 && value <= max;
const resources = side => side && bounded(side.hp, RULES.life) && bounded(side.pills, RULES.pills)
  ? { hp: side.hp, pills: side.pills } : null;

function staticSide(final) {
  return {
    before: { ...final }, spent: { ...final }, impact: { ...final }, after: { ...final },
    damage: 0, hpRecovered: 0, pillsSpent: 0, pillsRecovered: 0,
  };
}

/** Describe an already-resolved round. Never resolve attacks, abilities or rewards. */
export function createRoundPresentation(before, after) {
  const final = Object.fromEntries(SIDES.map(side => [side, resources(after?.[side])]));
  // A malformed final state has no honest resource display to manufacture.
  if (SIDES.some(side => !final[side])) return null;
  const fallback = () => ({ canAnimate: false, ...Object.fromEntries(SIDES.map(side => [side, staticSide(final[side])])) });
  const initial = Object.fromEntries(SIDES.map(side => [side, resources(before?.[side])]));
  const result = after?.lastResult;
  if (SIDES.some(side => !initial[side] || initial[side].hp === 0)
    || !SIDES.includes(result?.winner) || !Number.isSafeInteger(result?.damage) || result.damage < 1) return fallback();
  const presentation = { canAnimate: true };
  for (const side of SIDES) {
    const cost = result[side]?.cost;
    if (!bounded(cost, initial[side].pills)) return fallback();
    const spent = { hp: initial[side].hp, pills: initial[side].pills - cost };
    // result.damage is the accepted hit; only the visible HP loss is capped.
    const damage = side === result.winner ? 0 : Math.min(initial[side].hp, result.damage);
    const impact = { hp: spent.hp - damage, pills: spent.pills };
    const hpRecovered = final[side].hp - impact.hp, pillsRecovered = final[side].pills - impact.pills;
    // The current resolver heals the winner and refunds the loser, never vice versa.
    // Validate that shape without evaluating either card's ability a second time.
    if (hpRecovered < 0 || pillsRecovered < 0
      || (side !== result.winner && hpRecovered !== 0)
      || (side === result.winner && pillsRecovered !== 0)) return fallback();
    presentation[side] = {
      before: { ...initial[side] }, spent, impact, after: { ...final[side] },
      damage, hpRecovered, pillsSpent: cost, pillsRecovered,
    };
  }
  return presentation;
}

function caption(side, phase, canAnimate) {
  if (!canAnimate) return '資源已結算';
  if (phase === 'sealed') return '落子前的生命與仙丹';
  if (phase === 'bids') return side.pillsSpent ? `付出 ${side.pillsSpent} 顆仙丹` : '本回合未用仙丹';
  if (phase === 'impact') return side.damage ? `承受 ${side.damage} 點傷害` : '生命未減';
  const recovery = [side.hpRecovered ? `回復 ${side.hpRecovered} 點生命` : '', side.pillsRecovered ? `取回 ${side.pillsRecovered} 顆仙丹` : ''].filter(Boolean);
  if (phase === 'recovery') return recovery.join(' · ') || '資源已結算';
  return [side.pillsSpent ? `付出 ${side.pillsSpent} 顆仙丹` : '', side.damage ? `承受 ${side.damage} 點傷害` : '', ...recovery].filter(Boolean).join(' · ') || '資源未變';
}

/** Paint presentation DOM only. Unknown phases deliberately show final totals. */
export function paintRoundResources(element, presentation, phase) {
  if (!element || !presentation) return;
  const frame = { sealed: 'before', bids: 'spent', impact: 'impact', recovery: 'after' }[phase] || 'after';
  for (const panel of element.querySelectorAll('.battle-resources[data-side]')) {
    const side = panel.dataset.side, model = presentation[side];
    const state = model?.[presentation.canAnimate ? frame : 'after'];
    if (!state || !resources(state)) continue;
    const owner = side === 'player' ? '你' : '對手', fill = `${state.hp / RULES.life * 100}%`;
    panel.dataset.hp = String(state.hp); panel.dataset.pills = String(state.pills);
    panel.style.setProperty('--life-fill', fill);
    panel.setAttribute('aria-label', `${owner} · 生命 ${state.hp}/${RULES.life} · 仙丹 ${state.pills}/${RULES.pills}`);
    panel.classList.toggle('is-low-life', state.hp <= 3);
    panel.classList.toggle('is-damaged', presentation.canAnimate && phase === 'impact' && model.damage > 0);
    panel.classList.toggle('is-recovering', presentation.canAnimate && phase === 'recovery' && (model.hpRecovered > 0 || model.pillsRecovered > 0));
    for (const node of panel.querySelectorAll('[data-hp-value]')) node.textContent = String(state.hp);
    for (const node of panel.querySelectorAll('[data-pill-value]')) node.textContent = String(state.pills);
    for (const meter of panel.querySelectorAll('[data-hp-meter]')) {
      meter.style.setProperty('--life-fill', fill);
      meter.setAttribute('aria-valuenow', String(state.hp));
      meter.setAttribute('aria-valuetext', `生命 ${state.hp}/${RULES.life}`);
    }
    for (const pill of panel.querySelectorAll('[data-pill-index]')) {
      const index = Number(pill.dataset.pillIndex), filled = Number.isInteger(index) && index >= 0 && index < state.pills;
      pill.classList.toggle('is-filled', filled); pill.classList.toggle('is-empty', !filled);
      pill.classList.remove('is-planned', 'is-fury');
    }
    for (const node of panel.querySelectorAll('[data-resource-caption]')) node.textContent = caption(model, phase, presentation.canAnimate);
  }
}
