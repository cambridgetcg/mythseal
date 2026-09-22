import { getCard, getBattleCard } from './engine.mjs';
import { getInstance, MAX_CARD_XP } from './collection.mjs';
import { cardArtStyle, printLabel } from './card-presentation.mjs';
import { getInheritanceMaterials, getInheritanceTargetReason, previewInheritance, MAX_INHERITANCE_MATERIALS } from './inheritance.mjs';

const safe = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const number = value => Number(value || 0).toLocaleString('zh-Hant');
const travelCard = (cardId, level) => getBattleCard({ mode: 'expedition', playerLevels: { [cardId]: level } }, 'player', cardId);

function targetMarkup(instance, quote, cardMarkup) {
  const card = getCard(instance.cardId), beforeXP = quote?.beforeXP ?? instance.xp, afterXP = quote?.afterXP ?? instance.xp;
  const beforeLevel = quote?.beforeLevel ?? instance.level, afterLevel = quote?.afterLevel ?? instance.level;
  const before = travelCard(card.id, beforeLevel), after = travelCard(card.id, afterLevel);
  return `<section class="inheritance-target" data-target-uid="${safe(instance.uid)}" data-print-id="${safe(instance.printId)}"><div class="inheritance-target-art" aria-hidden="true">${cardMarkup(card, { printId: instance.printId })}</div><div class="inheritance-target-copy"><span class="inheritance-kicker">承接此程</span><h3>${safe(card.name)}</h3><p class="inheritance-print">${safe(printLabel(card, { printId: instance.printId }))}</p><p class="inheritance-uid">編號 <span>${safe(instance.uid)}</span></p><div class="inheritance-level"><span>Lv.${beforeLevel}</span>${quote ? `<span class="inheritance-arrow" aria-hidden="true">→</span><strong>Lv.${afterLevel}</strong>` : ''}</div><div class="inheritance-xp-track" role="progressbar" aria-label="傳承後累積 EXP" aria-valuemin="0" aria-valuemax="${MAX_CARD_XP}" aria-valuenow="${afterXP}" aria-valuetext="${quote ? `${beforeXP} → ${afterXP}` : afterXP} / ${MAX_CARD_XP} EXP"><span class="inheritance-xp-new" style="width:${afterXP / MAX_CARD_XP * 100}%"></span><span class="inheritance-xp-before" style="width:${beforeXP / MAX_CARD_XP * 100}%"></span></div><p class="inheritance-xp-value">${quote ? `${number(beforeXP)} → <b>${number(afterXP)}</b>` : `<b>${number(beforeXP)}</b>`} / ${MAX_CARD_XP} EXP</p><p class="inheritance-stats">遊歷能力 <span>力量 ${before.power}${before.power !== after.power ? ` → <b>${after.power}</b>` : ''}</span><span>傷害 ${before.damage}${before.damage !== after.damage ? ` → <b>${after.damage}</b>` : ''}</span></p></div></section>`;
}

function materialMarkup(row, selected, atLimit) {
  const { instance, eligible, reason, offeredXP } = row, card = getCard(instance.cardId), blocked = !eligible || (atLimit && !selected);
  const explanation = reason || (blocked ? `每次最多選 ${MAX_INHERITANCE_MATERIALS} 張` : null);
  return `<button type="button" class="inheritance-material${selected ? ' is-selected' : ''}" data-uid="${safe(instance.uid)}" data-eligible="${eligible}" data-action="inherit-pick" data-id="${safe(instance.uid)}" aria-pressed="${selected}"${blocked ? ' disabled' : ''}><span class="inheritance-material-art" aria-hidden="true" style="${cardArtStyle(card, { printId: instance.printId })}"></span><span class="inheritance-material-copy"><span class="inheritance-material-name">${safe(card.name)} <span>Lv.${instance.level}</span></span><span class="inheritance-print">${safe(printLabel(card, { printId: instance.printId }))}</span><span class="inheritance-uid">編號 <span>${safe(instance.uid)}</span></span><span class="inheritance-material-xp">原有 ${number(instance.xp)} EXP ＋ 傳承 80 <b>＝ ${number(offeredXP)} EXP</b></span></span><span class="inheritance-pick-mark" aria-hidden="true">${!eligible ? '保留' : selected ? '✓ 已選' : '＋ 選擇'}</span>${explanation ? `<span class="inheritance-protection">${safe(explanation)}</span>` : ''}</button>`;
}

function transferMarkup(quote, selectedCount) {
  return `<div class="inheritance-transfer" aria-live="polite" aria-atomic="true"><span>已選 <b data-inheritance-selected>${selectedCount}</b> 張素材</span><span>承接 <strong data-inheritance-gained>${quote ? `＋${number(quote.gainedXP)}` : '—'}</strong> EXP</span></div>${quote?.overflowXP ? `<p class="inheritance-overflow" data-inheritance-overflow>素材共帶來 ${number(quote.offeredXP)} EXP；達到 Lv.5 上限後，餘下 <b>${number(quote.overflowXP)} EXP 不會保留</b>。</p>` : ''}`;
}

/** Pure views: choosing and reviewing never alters the profile or selects a donor implicitly. */
export function inheritanceMarkup(profile, targetUid, selectedUids = [], cardMarkup) {
  const target = getInstance(profile, targetUid), blocked = getInheritanceTargetReason(profile, targetUid);
  const rows = getInheritanceMaterials(profile, targetUid), selected = new Set(selectedUids);
  let quote = null, error = blocked;
  if (!blocked && selectedUids.length) {
    try { quote = previewInheritance(profile, targetUid, selectedUids); } catch (cause) { error = cause.message; }
  }
  const eligibleCount = rows.filter(row => row.eligible).length;
  return `<div class="inheritance-panel"><header class="inheritance-heading"><div class="eyebrow">一脈相承 · 同名同行</div><h2>同名傳承</h2><p>讓另一段歷練，留在這張卡上。</p></header>${targetMarkup(target, quote, cardMarkup)}<div class="inheritance-material-heading"><h3>選擇同名本畫</h3><span>${eligibleCount} 張可選 · 最多 ${MAX_INHERITANCE_MATERIALS} 張</span></div><p class="inheritance-explanation">每張素材帶來 <b>80 ＋ 原有 EXP</b>。確認後會永久移除所選素材；異畫、領契、墨卷與天工都會保留。</p><div class="inheritance-materials">${rows.length ? rows.map(row => materialMarkup(row, selected.has(row.instance.uid), selected.size >= MAX_INHERITANCE_MATERIALS)).join('') : '<div class="inheritance-empty"><span aria-hidden="true">承</span><p>還沒有另一張同名卡。<br>待下次相逢，再續此程。</p></div>'}</div>${error ? `<p class="inheritance-error" role="status">${safe(error)}</p>` : ''}<p class="inheritance-pve-note">等級加成只在遊歷生效；擂台與自由切磋維持基礎能力。</p><footer class="inheritance-footer">${transferMarkup(quote, selected.size)}<div class="inheritance-actions"><button type="button" class="secondary" data-action="inherit-done">返回同行記</button><button type="button" class="primary" data-action="inherit-review"${!quote ? ' disabled' : ''}>查看傳承明細 <span aria-hidden="true">→</span></button></div></footer></div>`;
}

export function inheritanceConfirmMarkup(profile, quote, cardMarkup) {
  const target = getInstance(profile, quote.targetUid), materials = quote.materialUids.map(uid => getInstance(profile, uid));
  return `<div class="inheritance-confirm"><header class="inheritance-heading"><div class="eyebrow">落印之前 · 再看一眼</div><h2>確認同名傳承</h2><p>以下 ${materials.length} 張素材將永久移除，無法取回。</p></header>${targetMarkup(target, quote, cardMarkup)}<div class="inheritance-confirm-list"><h3>即將移除的素材</h3>${materials.map(instance => `<article class="inheritance-consumed" data-material-uid="${safe(instance.uid)}"><div><b>${safe(getCard(instance.cardId).name)} · Lv.${instance.level}</b><span>${safe(printLabel(instance.cardId, { printId: instance.printId }))}</span><span class="inheritance-uid">編號 <span>${safe(instance.uid)}</span></span></div><p>原有 ${number(instance.xp)} EXP<br><strong>＋${number(80 + instance.xp)} EXP</strong></p></article>`).join('')}</div><p class="inheritance-kept">承接卡的畫作版本、編號與同行記錄保留。</p><p class="inheritance-pve-note">等級加成只在遊歷生效；擂台與自由切磋維持基礎能力。</p><footer class="inheritance-footer">${transferMarkup(quote, materials.length)}<div class="inheritance-actions"><button type="button" class="secondary" data-action="inherit-back">返回選擇</button><button type="button" class="primary inheritance-confirm-button" data-action="inherit-confirm">確認傳承 · 移除 ${materials.length} 張</button></div></footer></div>`;
}

export function inheritanceResultMarkup(profile, result, cardMarkup) {
  const target = getInstance(profile, result.targetUid);
  return `<div class="inheritance-result"><header class="inheritance-heading"><span class="inheritance-result-seal" aria-hidden="true">承</span><div class="eyebrow">同行之意 · 化作修為</div><h2>一脈，已相承</h2><p>${result.consumedCount ?? result.materialUids.length} 張同名本畫的歷練，留在此卡。</p></header>${targetMarkup(target, result, cardMarkup)}<div class="inheritance-result-gain" role="status"><strong>＋${number(result.gainedXP)}</strong><span>EXP 已承接</span></div>${result.overflowXP ? `<p class="inheritance-overflow" data-inheritance-overflow>已達 Lv.5 上限；餘下 ${number(result.overflowXP)} EXP 未保留。</p>` : ''}<p class="inheritance-kept">畫作版本與編號保留 · 所選素材已永久移除</p><p class="inheritance-pve-note">等級加成只在遊歷生效；擂台與自由切磋維持基礎能力。</p><footer class="inheritance-footer"><button type="button" class="primary" data-action="inherit-done">返回這張卡的同行記 <span aria-hidden="true">→</span></button></footer></div>`;
}
