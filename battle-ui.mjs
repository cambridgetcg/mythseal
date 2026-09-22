/** Public combat presentation. No rules, random draws or stored state live here. */
const safe = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const bounded = (value, maximum = 12) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(maximum, Math.floor(Number(value)))) : 0;

export function battleResourcesMarkup({ side = 'player', hp, pills, plannedPills = 0, fury = false, preview = false, compact = false, label } = {}) {
  const owner = side === 'opponent' ? 'opponent' : 'player';
  const life = bounded(hp), reserve = bounded(pills);
  const canPlan = owner === 'player' && preview;
  const bid = canPlan ? Math.min(bounded(plannedPills), reserve) : 0;
  const furyCost = canPlan && fury ? Math.min(3, reserve - bid) : 0;
  const name = label || (owner === 'player' ? '你' : '對手');
  const plan = canPlan ? `預備 ${bid} 丹${furyCost ? ` ＋ 怒擊 ${furyCost} 丹` : ''} · 可留 ${reserve - bid - furyCost} 丹` : '';
  const caption = plan || (owner === 'opponent' && !compact ? '剩餘仙丹 · 暗注未揭曉' : '剩餘仙丹');
  return `<div class="resources battle-resources${compact ? ' compact' : ''}${life <= 3 ? ' is-low-life' : ''}" data-side="${owner}" data-hp="${life}" data-pills="${reserve}" role="group" aria-label="${safe(name)}，生命 ${life} / 12，仙丹 ${reserve} / 12${plan ? `，${safe(plan)}` : ''}">
    ${compact ? `<div class="battle-resource-owner">${safe(name)}</div>` : ''}
    <div class="battle-health" data-hp-meter role="meter" aria-label="${safe(name)}的生命" aria-valuemin="0" aria-valuemax="12" aria-valuenow="${life}" style="--life-fill:${life / 12 * 100}%">
      <div class="battle-resource-label">生命 <span class="life-low-label" aria-hidden="true">危</span></div><div class="life-orb"><strong data-hp-value>${life}</strong><small>/ 12</small></div><div class="life-lifeline" aria-hidden="true"></div>
    </div>
    <div class="battle-pill-reserve"><div class="battle-pill-heading"><span class="battle-resource-label">仙丹</span><strong data-pill-value>${reserve}</strong><small>/ 12</small></div><div class="battle-pill-tray" aria-hidden="true">${Array.from({ length: 12 }, (_, index) => `<i data-pill-index="${index}" class="pill-capsule ${index < reserve ? 'is-filled' : 'is-empty'}${index < bid ? ' is-planned' : index < bid + furyCost ? ' is-fury' : ''}"></i>`).join('')}</div></div><span class="battle-resource-caption" data-resource-caption>${safe(caption)}</span>
  </div>`;
}

export function battleClashMarkup({ playerCard, opponentCard, playerAttack, opponentAttack, playerPills, opponentPills, playerFury = false, opponentFury = false, winner, damage, tieReason, cardMarkup }) {
  const victor = ['player', 'opponent'].includes(winner) ? winner : '';
  const loser = victor === 'player' ? 'opponent' : victor === 'opponent' ? 'player' : '';
  const damageAmount = bounded(damage, 999);
  const sides = {
    player: { card: playerCard, attack: playerAttack, pills: playerPills, fury: playerFury, name: '你' },
    opponent: { card: opponentCard, attack: opponentAttack, pills: opponentPills, fury: opponentFury, name: '對手' },
  };
  const cardSide = side => {
    const entry = sides[side], won = side === victor;
    return `<div class="clash-side" data-side="${side}"><div class="clash-side-label"><span>${entry.name}</span><span class="clash-outcome">${won ? '此回合勝' : side === loser ? '承受傷害' : ''}</span></div><div class="clash-card-frame">${cardMarkup(entry.card,{side})}${side === loser ? `<span class="clash-damage" aria-label="${entry.name}承受 ${damageAmount} 傷害"><strong>${damageAmount}</strong><small>傷害</small></span>` : ''}</div><div class="duel-stat${won ? ' won' : ''}"><span class="clash-bid">暗置 <b>${bounded(entry.pills)}</b> 丹${entry.fury ? '<span class="clash-fury"> ＋ 怒擊</span>' : ''}</span><span class="clash-attack">實際攻擊 <strong>${bounded(entry.attack, 9999)}</strong></span></div></div>`;
  };
  return `<div class="duel-cards battle-clash" data-winner="${victor}" data-loser="${loser}">${cardSide('player')}<div class="clash-crossing" aria-hidden="true"><svg class="clash-ink" viewBox="0 0 80 100" fill="none"><ellipse class="clash-ripple" cx="40" cy="50" rx="29" ry="32"/><path class="clash-stroke" d="M13 73C34 63 41 42 67 27M23 21c12 28 24 41 35 57"/></svg><span>${tieReason ? '同攻' : '弈'}</span></div>${cardSide('opponent')}</div>`;
}
