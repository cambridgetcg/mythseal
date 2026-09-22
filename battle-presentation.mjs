import { RULES } from './engine.mjs';

const SIDES = ['player', 'opponent'];
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
