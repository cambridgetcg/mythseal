/** Public combat presentation. No rules, random draws or stored state live here. */
import { TABLE_LABELS } from './battle-presentation.mjs';

const safe = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const bounded = (value, maximum = 12) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(maximum, Math.floor(Number(value)))) : 0;
const OWNERS = { player: '你', opponent: '對手' };
const artStyle = art => art?.artStyle ? ` style="${safe(art.artStyle)}"` : '';
const statsMarkup = card => `<span class="card-stats"><span class="card-stat">力 <strong>${bounded(card.power, 99)}</strong></span><span class="card-stat">傷 <strong>${bounded(card.damage, 99)}</strong></span></span>`;

/**
 * One public card in its dealt slot. Opponent cards and reveal-time cards open the
 * read-only inspect sheet; planning own cards select the draft. The state label is
 * DOM text, so used/announced/selected never depend on colour alone.
 */
export function battleMiniMarkup(card, { side = 'player', selectable = false, selected = false, art = null } = {}) {
  const owner = side === 'opponent' ? 'opponent' : 'player';
  const choosing = owner === 'player' && selectable;
  const state = choosing && selected && card.state === 'ready' ? 'selected' : card.state;
  const label = state === 'selected' ? TABLE_LABELS.selected : card.label;
  const round = card.usedRound ? `（第 ${card.usedRound} 回合）` : '';
  const name = `${card.name}，${card.factionName}，${card.stars} 星，力量 ${card.power}，傷害 ${card.damage}${card.bonus ? '，同族共鳴' : ''}，${label}${round}`;
  const action = choosing
    ? `data-action="select" aria-pressed="${state === 'selected'}"${card.state === 'used' ? ' disabled' : ''}`
    : `data-action="inspect"${state === 'announced' ? ' aria-current="true"' : ''}`;
  const print = art?.printId ? ` data-print-id="${safe(art.printId)}" data-treatment="${safe(art.treatment)}"` : '';
  return `<button type="button" class="card battle-mini is-${state}${choosing ? ' selectable' : ''}${state === 'selected' ? ' selected' : ''}" id="battle-card-${owner}-${safe(card.id)}" ${action} data-side="${owner}" data-id="${safe(card.id)}" data-card-id="${safe(card.id)}" data-slot="${bounded(card.slot, 3)}"${print} aria-label="${safe(name)}"${card.usedRound ? ` title="第 ${card.usedRound} 回合出戰"` : ''} style="--faction:${safe(card.factionColor)}">`
    + `<span class="card-art" aria-hidden="true"${artStyle(art)}></span><span class="card-shade" aria-hidden="true"></span>`
    + `<span class="battle-mini-top" aria-hidden="true"><span class="battle-mini-state">${safe(label)}</span><span class="battle-mini-stars">${bounded(card.stars, 9)}✦</span></span>`
    + `<span class="battle-mini-copy" aria-hidden="true"><span class="battle-mini-title">${safe(card.factionIcon)} ${safe(card.title)}</span><span class="battle-mini-name">${safe(card.name)}${card.bonus ? '<i class="battle-mini-bonus">✧</i>' : ''}</span>${statsMarkup(card)}<span class="battle-mini-skill">${safe(card.abilityLabel)}</span></span></button>`;
}

/** A row of exactly four public cards in their original order; never paginated. */
export function battleLineupMarkup(view, side, { selected = null, art = () => null } = {}) {
  const owner = side === 'opponent' ? 'opponent' : 'player';
  const selectable = owner === 'player' && view.phase === 'planning';
  const label = owner === 'opponent' ? '對手手牌 · 本局四張' : '你的手牌 · 本局四張';
  return `<div class="${owner === 'opponent' ? 'enemy-hand' : 'player-hand'} battle-lineup" role="group" aria-label="${label}">${view[owner].cards.map(card => battleMiniMarkup(card, { side: owner, selectable, selected: card.id === selected, art: art(card.id, owner) })).join('')}</div>`;
}

function slotFace(card, { art, detail, extra = '' }) {
  return `<span class="battle-slot-thumb" aria-hidden="true"${artStyle(art)}></span><span class="battle-slot-copy"><b>${safe(card.name)}${card.bonus ? '<i class="battle-mini-bonus" aria-hidden="true">✧</i>' : ''}</b><small>${safe(detail)}</small><small class="battle-slot-skill">${safe(card.abilityLabel)}${extra}</small></span>`;
}

/**
 * The reserved centre: the announced card or 待對手應戰 opposite the player's
 * card. Both states occupy the same slot. The centre button never carries
 * data-card-id, so the four public lineup cards remain the only card hooks.
 */
export function battleConfrontationMarkup(view, { selected = null, art = () => null } = {}) {
  const slot = (side, state, content) => `<div class="battle-slot" data-side="${side}" data-state="${state}"${side === 'opponent' ? ' data-battle-announced' : ''}><span class="battle-slot-label">${OWNERS[side]}</span>${content}</div>`;
  const button = (side, card, aria, face) => `<button type="button" class="battle-slot-card" id="battle-center-${side}" data-action="inspect" data-side="${side}" data-id="${safe(card.id)}" aria-label="${safe(aria)}">${face}</button>`;
  let opponent, player, versus = '弈';
  if (view.phase === 'reveal') {
    const entry = side => {
      const resolved = view.center[side], card = resolved.card;
      const bid = `暗置 ${bounded(resolved.pills)} 丹${resolved.fury ? ' ＋ 怒擊' : ''} · 攻擊 ${bounded(resolved.attack, 9999)}`;
      const outcome = view.center.winner === side ? '此回合勝' : `承受 ${bounded(view.center.damage, 999)} 傷害`;
      return slot(side, 'played', button(side, card, `${OWNERS[side]}第 ${view.round} 回合出戰：${card.name}，${bid}，${outcome}`, slotFace(card, { art: art(card.id, side), detail: `${TABLE_LABELS.played} · ${bid}`, extra: ` · ${outcome}` })));
    };
    opponent = entry('opponent'); player = entry('player'); versus = view.center.tieReason ? '同攻' : '弈';
  } else {
    const announced = view.center.opponent;
    opponent = announced.state === 'announced'
      ? slot('opponent', 'announced', button('opponent', announced.card, `對手${TABLE_LABELS.announced}：${announced.card.name}，${announced.card.stars} 星，力量 ${announced.card.power}，傷害 ${announced.card.damage}，${announced.card.abilityLabel}。仙丹與怒擊未揭曉`,
        slotFace(announced.card, { art: art(announced.card.id, 'opponent'), detail: `${TABLE_LABELS.announced} · 仙丹暗置` })))
      : slot('opponent', 'awaiting', `<p class="battle-slot-waiting">${TABLE_LABELS.awaiting}</p>`);
    const own = view.player.cards.find(card => card.id === selected && card.state !== 'used');
    player = own
      ? slot('player', 'selected', button('player', own, `你${TABLE_LABELS.selected}：${own.name}，未落子。查看詳情`, slotFace(own, { art: art(own.id, 'player'), detail: `${TABLE_LABELS.selected} · 未落子` })))
      : slot('player', 'empty', '<p class="battle-slot-waiting">請選一張戰卡</p>');
  }
  return `<section class="battle-confrontation" data-phase="${view.phase}" aria-label="第 ${bounded(view.round, 9)} 回合對陣"><h3 class="battle-confrontation-title">第 ${bounded(view.round, 9)} 回合 · 對陣</h3>${opponent}<span class="battle-versus" aria-hidden="true">${versus}</span>${player}</section>`;
}

/**
 * One primary table for planning and reveal: opponent edge, confrontation, own
 * edge and actions. Only the public view and the player's own draft are read.
 */
export function battleTableMarkup(view, { draft = {}, actionsHtml = '', eyebrow = '', ornament = '', resonance = '', playerNote = '', art = () => null, className = '' } = {}) {
  const planning = view.phase === 'planning';
  const steps = Array.from({ length: view.rounds }, (_, index) => `<span class="${index < view.round - 1 ? 'done' : index === view.round - 1 ? 'current' : ''}"></span>`).join('');
  const resources = side => battleResourcesMarkup({ side, hp: view[side].hp, pills: view[side].pills, ...(side === 'player' && planning ? { plannedPills: draft.pills, fury: draft.fury, preview: true } : {}) });
  return `<main class="arena battle-table${safe(className)}" data-battle-phase="${view.phase}" data-leader="${view.leader}">`
    + `<header class="battle-status arena-heading">${ornament}<div class="battle-status-copy"><span class="eyebrow">${safe(eyebrow)}</span><span class="round-steps">第 ${bounded(view.round, 9)} / ${bounded(view.rounds, 9)} 回合 ${steps}</span></div><p class="battle-prompt">${safe(view.prompt)}</p><button type="button" class="text-button battle-history" data-action="history">對弈紀錄</button></header>`
    + `<section class="battle-edge" data-side="opponent" aria-label="對手：${safe(view.opponent.name)}"><div class="battle-edge-head"><div class="battle-identity"><h2>${safe(view.opponent.name)}</h2><p>對手手牌 · 本局四張</p></div>${resources('opponent')}</div>${battleLineupMarkup(view, 'opponent', { art })}</section>`
    + battleConfrontationMarkup(view, { selected: draft.selected, art })
    + `<section class="battle-edge" data-side="player" aria-label="你：執令者">${battleLineupMarkup(view, 'player', { selected: draft.selected, art })}<div class="battle-edge-head"><div class="battle-identity"><h2>執令者</h2><p>${safe(playerNote)}</p></div>${resources('player')}${resonance}</div></section>`
    + `<div class="battle-actions">${actionsHtml}</div></main>`;
}

/**
 * Compact played pair that stays fixed while reveal resources/effects are explained.
 * The winner word has its own hook so the staged reveal can hold it until impact,
 * like the heading and the clash outcome.
 */
export function revealPairMarkup(view) {
  const face = side => {
    const entry = view.center[side];
    return `<div class="reveal-pair-side" data-side="${side}"${view.center.winner === side ? ' data-winner' : ''}><span class="reveal-pair-owner">${OWNERS[side]}${view.center.winner === side ? '<span class="reveal-pair-outcome"> · 勝</span>' : ''}</span><b>${safe(entry.card.name)}</b><small>暗置 ${bounded(entry.pills)} 丹${entry.fury ? ' ＋ 怒擊' : ''} · 實際攻擊 ${bounded(entry.attack, 9999)}</small></div>`;
  };
  return `<div class="reveal-played-pair" role="group" aria-label="第 ${bounded(view.round, 9)} 回合出戰：你 ${safe(view.center.player.card.name)}，對手 ${safe(view.center.opponent.card.name)}"><span class="reveal-pair-round">第 ${bounded(view.round, 9)} 回合</span>${face('player')}${face('opponent')}</div>`;
}

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
