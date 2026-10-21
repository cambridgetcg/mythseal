/** Decorative, public presentation of the existing Mist Gate encounter. */
import { RULES } from './engine.mjs';

const safe = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const factionColor = value => /^#[\da-f]{3,8}$/i.test(value || '') ? value : '#d8bd83';

const lantern = (compact = false) => `<svg class="mist-lantern${compact ? ' is-small' : ''}" viewBox="0 0 100 150" fill="none" aria-hidden="true" focusable="false"><ellipse class="mist-lantern-halo" cx="50" cy="78" rx="45" ry="50"/><path class="mist-lantern-wire" d="M50 0v35M39 43v-6a11 11 0 0 1 22 0v6"/><path class="mist-lantern-cap" d="m26 47 8-6h32l8 6v5H26v-5Z"/><path class="mist-lantern-paper" d="M29 55h42l-4 48H33l-4-48Z"/><path class="mist-lantern-rib" d="m38 55 3 48m9-48v48m12-48-3 48M30 66h40M31 90h38"/><path class="mist-lantern-flame" d="M51 68c1 8-6 10-5 17 1 7 8 5 9 0 1-6-2-9-4-17Z"/><path class="mist-lantern-cap" d="M33 104h34v6H33z"/><path class="mist-lantern-wire" d="M50 110v17m-4 0 4-5 4 5-4 9-4-9Z"/><path class="mist-lantern-reflection" d="M28 142h44m-34 5h24"/></svg>`;

/** The guardian's line on arrival. With 緩渡 (guardian-style.mjs) he hints at his restraint in his
 * own voice, without a number: the exact rule is the plain line, mistGateRuleMarkup. */
export const GENTLE_ARRIVAL_QUOTE = '初渡之局，我出手放輕，你放膽試。';

export function mistGateArrivalMarkup({ returning = false, guardian = null } = {}) {
  return `<section class="mist-arrival" aria-labelledby="mist-arrival-title"><div class="mist-arrival-scene" aria-hidden="true"></div><div class="mist-arrival-copy"><div class="eyebrow">山海第一境 · 出發前整備</div><h2 id="mist-arrival-title">霧隱渡口</h2><p>渡船停在霧中，掌燈人正等你落下第一子。</p><blockquote><span class="mist-guardian-label">守渡弈者</span>「${guardian ? GENTLE_ARRIVAL_QUOTE : returning ? '燈還亮着。這一程，你想怎樣走？' : '不必急着渡河，先看清手中的牌。'}」</blockquote></div><div class="mist-arrival-light" aria-hidden="true">${lantern()}<span>一盞燈，候一位弈者。</span></div></section>`;
}

/** The style's exact rule, in the preparation screen's plain voice, or '' without a style. */
export function mistGateRuleMarkup(guardian = null) {
  if (!guardian) return '';
  const cap = guardian.spendCap, fury = cap < RULES.furyCost ? '，不用怒擊' : '';
  return `<span class="mist-guardian-rule" data-guardian-style="${safe(guardian.id)}">${safe(guardian.name)} · 本局守渡弈者每回合至多出 ${safe(cap)} 丹${fury}</span>`;
}

export function mistGateBattleMarkup({ round = 1, initiative = 'player', guardian = null } = {}) {
  const lastRound = Number(round) >= 4;
  const style = guardian ? `${safe(guardian.name)} <span aria-hidden="true">·</span> ` : '';
  return `<aside class="mist-battle-heading" aria-label="霧隱渡口，守渡弈者${guardian ? `，${safe(guardian.name)}` : ''}"><div class="mist-battle-place">${lantern(true)}<div><span>霧隱渡口</span><small>守渡弈者 <span aria-hidden="true">·</span> ${style}AI 對弈</small></div></div><p>${lastRound ? '燈影將盡，這一子留給當下。' : initiative === 'opponent' ? '看清來勢，再決定如何渡河。' : '水面很靜，落子由你。'}</p></aside>`;
}

export function mistGateResonanceMarkup({ factions = [] } = {}) {
  if (!factions.length) return '';
  return `<aside class="mist-resonance" aria-label="原手牌的同族共鳴"><span class="mist-resonance-label">同族共鳴</span><div>${factions.map(faction => `<span class="mist-resonance-faction" style="--resonance-color:${factionColor(faction.color)}"><i aria-hidden="true">${safe(faction.icon)}</i><span><b>${safe(faction.name)}</b><small>${safe(faction.bonus?.label)}</small></span></span>`).join('')}</div><p>原手牌已成共鳴，同族出戰時持續生效。</p></aside>`;
}

export function mistGateResultMarkup({ outcome, firstClear = false, nextName = '' } = {}) {
  const won = outcome === 'win' || outcome === 'player';
  const draw = outcome === 'draw';
  const quote = won ? '這一子，我記下了。前面的路，燈會替你照着。'
    : draw ? '水映兩岸，這一局，各有所得。' : '霧未散，船也還在。歇一息，再來。';
  const route = won && firstClear && nextName ? `霧隱渡口已踏破 · 前往${nextName}`
    : won ? '渡口燈火依舊，隨時可以重遊。' : '調整同行的戰卡，再渡此境。';
  return `<aside class="mist-result-note"><div class="mist-result-lantern" aria-hidden="true">${lantern(true)}</div><div><span class="mist-guardian-label">守渡弈者</span><p>「${quote}」</p><small>${safe(route)}</small></div></aside>`;
}

export function mistGateRevealMarkup({ round = 1 } = {}) {
  const safeRound = Math.max(1, Math.min(4, Math.floor(Number(round) || 1)));
  return `<div class="mist-reveal-seal" aria-hidden="true"><i></i><span>契</span><i></i></div><p class="mist-reveal-caption">第 ${safeRound} 回合 <span aria-hidden="true">·</span> 雙方已落子</p>`;
}
