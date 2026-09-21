import { CARDS, FACTIONS, RULES, getCard, getBattleCard } from './engine.mjs';
import { getInstance, getActiveDeck, getInstanceProtection, getXPProgress, validateInstanceDeck } from './collection.mjs';
import { getUpgradeCost, getInstanceSale } from './progression.mjs';

const safe = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const number = value => Number(value || 0).toLocaleString('zh-Hant');
const selectOptions = (choices, current) => choices.map(([value, label]) => `<option value="${safe(value)}"${value === current ? ' selected' : ''}>${safe(label)}</option>`).join('');
const origins = {
  starter: '初入山海', initial: '初入山海', welcome: '初見之禮', legacy: '舊藏承繼', migration: '舊藏承繼',
  pack: '秘匣相逢', market: '商旅購入', 'npc-market': '商旅購入', reward: '旅途贈禮', expedition: '遊歷所得', buyback: '商旅贖回',
};
function originName(origin) {
  const key = typeof origin === 'string' ? origin : origin?.type;
  return origins[key] || origins[key?.split(':')[0]] || '旅途所得';
}
function dateLabel(value) {
  if (value === null || value === undefined || value === '') return '未有記錄';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('zh-Hant', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Europe/London' }).format(date) : '未有記錄';
}
function acquiredTime(instance) {
  const time = new Date(instance.acquiredAt).getTime();
  return Number.isFinite(time) ? time : 0;
}
function xpMarkup(instance, { compact = false } = {}) {
  const xp = getXPProgress(instance), percentage = Math.round(xp.progress * 100), span = xp.nextThreshold - xp.currentThreshold;
  return `<div class="bag-xp${compact ? ' compact' : ''}"><div class="bag-xp-caption"><b>Lv.${xp.level}</b><span>${xp.maxed ? '歷練圓滿' : `${number(xp.progressXP)} / ${number(span)} 歷練`}</span></div><div class="bag-xp-track" role="progressbar" aria-label="${safe(getCard(instance.cardId).name)}的歷練" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percentage}" aria-valuetext="${safe(`等級 ${xp.level}，累積 ${xp.xp} 歷練${xp.maxed ? '，已達上限' : ''}`)}"><span style="width:${percentage}%"></span></div></div>`;
}
function lockButton(instance, extraClass = '') {
  return `<button type="button" class="bag-lock ${extraClass}${instance.locked ? ' is-locked' : ''}" data-action="instance-lock" data-id="${safe(instance.uid)}" aria-pressed="${instance.locked}" aria-label="${instance.locked ? '解鎖' : '鎖定'}${safe(getCard(instance.cardId).name)}，卡牌編號 ${safe(instance.uid)}"><svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M6 9V6a4 4 0 0 1 ${instance.locked ? '8 0v3' : '7.5-2'}"/><rect x="4" y="9" width="12" height="9" rx="2"/><path d="M10 12v3"/></svg><span>${instance.locked ? '已鎖定' : '鎖定'}</span></button>`;
}
function copiesOf(profile) {
  const counts = new Map();
  for (const instance of profile.instances) counts.set(instance.cardId, (counts.get(instance.cardId) || 0) + 1);
  return counts;
}
function filteredInstances(profile, view) {
  const counts = copiesOf(profile), query = (view.query || '').trim().toLocaleLowerCase('zh-Hant');
  return profile.instances.filter(instance => {
    const card = getCard(instance.cardId);
    return (!query || `${card.name} ${card.title} ${instance.uid}`.toLocaleLowerCase('zh-Hant').includes(query))
      && (view.faction === 'all' || !view.faction || card.faction === view.faction)
      && (view.filter !== 'locked' || instance.locked)
      && (view.filter !== 'duplicates' || counts.get(instance.cardId) > 1);
  }).slice().sort((a, b) => {
    if (view.sort === 'name') return getCard(a.cardId).name.localeCompare(getCard(b.cardId).name, 'zh-Hant') || a.uid.localeCompare(b.uid, undefined, { numeric: true });
    if (view.sort === 'level') return b.level - a.level || b.xp - a.xp || acquiredTime(b) - acquiredTime(a) || a.uid.localeCompare(b.uid, undefined, { numeric: true });
    return acquiredTime(b) - acquiredTime(a) || b.uid.localeCompare(a.uid, undefined, { numeric: true });
  });
}
function controlsMarkup(view) {
  return `<div class="bag-controls"><label class="bag-search-field" for="bag-search"><span>尋找卡牌</span><div class="bag-search-wrap"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/></svg><input id="bag-search" type="search" placeholder="角色名稱或卡牌編號" value="${safe(view.query)}" autocomplete="off"></div></label><label for="bag-faction"><span>陣營</span><select id="bag-faction">${selectOptions([['all', '全部陣營'], ...Object.entries(FACTIONS).map(([id, faction]) => [id, `${faction.icon} ${faction.name}`])], view.faction || 'all')}</select></label><label for="bag-filter"><span>收藏狀態</span><select id="bag-filter">${selectOptions([['all', '所有卡牌'], ['locked', '已鎖定'], ['duplicates', '重複角色']], view.filter || 'all')}</select></label><label for="bag-sort"><span>排序</span><select id="bag-sort">${selectOptions([['recent', '最近入藏'], ['level', '等級優先'], ['name', '角色名稱']], view.sort || 'recent')}</select></label></div>`;
}
function instanceTile(profile, instance, cardMarkup, { picking = false, selected = false, inDeck = false } = {}) {
  const card = getCard(instance.cardId);
  return `<article class="bag-item${selected ? ' is-picked' : ''}" aria-label="${safe(card.name)}，卡牌編號 ${safe(instance.uid)}">${cardMarkup(card, { collection: true, selectable: picking, selected, picked: selected, action: picking ? 'bag-pick-instance' : 'instance-inspect', instanceId: instance.uid })}<div class="bag-item-meta"><div class="bag-item-status"><span>${picking ? (selected ? '已選入草稿' : '點卡面選入') : inDeck ? '出戰牌組' : originName(instance.origin)}</span>${picking ? `<button type="button" class="bag-inspect-link" data-action="instance-inspect" data-id="${safe(instance.uid)}" aria-label="查看${safe(card.name)}，卡牌編號 ${safe(instance.uid)}">詳情 ↗</button>` : lockButton(instance)}</div>${xpMarkup(instance, { compact: true })}<span class="bag-serial" title="${safe(instance.uid)}">編號 <span>${safe(instance.uid)}</span></span></div></article>`;
}
function cardsMarkup(profile, view, cardMarkup) {
  const instances = filteredInstances(profile, view), active = new Set(getActiveDeck(profile)?.instanceIds || []);
  return `${controlsMarkup(view)}<div class="bag-results"><span>顯示 <b>${instances.length}</b> 張卡牌</span><span>同一角色，每張各有歷練。</span></div>${instances.length ? `<div class="bag-grid">${instances.map(instance => instanceTile(profile, instance, cardMarkup, { inDeck: active.has(instance.uid) })).join('')}</div>` : '<div class="bag-empty"><span aria-hidden="true">◇</span><h2>這一頁，暫未遇見。</h2><p>試試其他名稱、陣營或收藏狀態。</p></div>'}`;
}
function portraitMarkup(card) {
  return `<span class="bag-face" aria-hidden="true" style="--faction:${FACTIONS[card.faction].color};background-image:url(assets/${card.artSet === 'classics' ? 'classics' : 'portraits'}.png);background-position:${card.art % 4 / 3 * 100}% ${Math.floor(card.art / 4) / 2 * 100}%"></span>`;
}
function deckSlotsMarkup(profile, view) {
  return `<div class="bag-deck-slots">${profile.deckSlots.map(slot => {
    const active = slot.id === profile.activeDeckId, editing = slot.id === view.editingSlotId, summary = validateInstanceDeck(profile, slot.instanceIds);
    const cards = slot.instanceIds.map(uid => profile.instances.find(instance => instance.uid === uid)).filter(Boolean).map(instance => getCard(instance.cardId));
    return `<article class="bag-deck-slot${active ? ' is-active' : ''}${editing ? ' is-editing' : ''}"><div class="bag-slot-heading"><span class="bag-slot-state">${active ? '✓ 目前出戰' : '備用牌組'}</span><span>${slot.instanceIds.length} 張 · ${summary.stars} 星</span></div><h2>${safe(slot.name)}</h2><div class="bag-slot-faces" aria-hidden="true">${cards.slice(0, 5).map(portraitMarkup).join('')}<span class="bag-slot-total">${cards.length}<small>張戰卡</small></span></div><div class="bag-slot-actions"><button type="button" class="bag-small-button" data-action="bag-edit-deck" data-id="${safe(slot.id)}" aria-pressed="${editing}">${editing ? '編輯中' : '編輯牌組'}</button>${active ? '<span class="bag-current-label">已啟用</span>' : `<button type="button" class="bag-small-button gold" data-action="bag-activate-deck" data-id="${safe(slot.id)}"${!summary.valid ? ' disabled' : ''}>設為出戰</button><button type="button" class="bag-delete-button" data-action="bag-delete-deck" data-id="${safe(slot.id)}" aria-label="刪除${safe(slot.name)}" title="刪除牌組，卡牌會保留">刪除</button>`}</div></article>`;
  }).join('')}${profile.deckSlots.length < 3 ? `<button type="button" class="bag-new-slot" data-action="bag-new-deck"><span aria-hidden="true">＋</span><b>另起一陣</b><small>最多儲存 3 套牌組</small></button>` : ''}</div>`;
}
function draftMarkup(profile, view, cardMarkup) {
  const ids = Array.isArray(view.draftInstanceIds) ? view.draftInstanceIds : [], chosen = new Set(ids), validation = validateInstanceDeck(profile, ids);
  const instances = filteredInstances(profile, view), name = typeof view.deckName === 'string' ? view.deckName : '';
  const slot = profile.deckSlots.find(item => item.id === view.editingSlotId);
  const errors = validation.errors.map(message => message.replaceAll('卡牌實體', '卡牌').replaceAll('不同副本', '多張卡牌'));
  return `<section class="bag-draft" aria-labelledby="bag-draft-heading"><div class="bag-draft-heading"><div><div class="eyebrow">ARRANGE YOUR EIGHT</div><h2 id="bag-draft-heading">${slot ? '整備此陣' : '編組新陣'}</h2><p>選 8 位不同角色，總星數不超過 ${RULES.starLimit}。同一張卡可編入多套牌組。</p></div><div class="bag-draft-counts"><span class="${ids.length === RULES.deckSize ? 'is-ready' : ''}"><b>${ids.length}</b> / ${RULES.deckSize} 張</span><span class="${validation.stars > RULES.starLimit ? 'is-over' : ''}"><b>${validation.stars}</b> / ${RULES.starLimit} 星</span></div></div><div class="bag-draft-tray">${Array.from({ length: Math.max(RULES.deckSize, ids.length) }, (_, index) => {
    const uid = ids[index], instance = profile.instances.find(item => item.uid === uid);
    if (!instance) return `<div class="bag-draft-empty"><span>${String(index + 1).padStart(2, '0')}</span><small>${uid ? '卡牌已離藏' : '等待入陣'}</small></div>`;
    const card = getCard(instance.cardId);
    return `<button type="button" class="bag-draft-card" data-action="bag-pick-instance" data-id="${safe(uid)}" aria-label="從草稿移除${safe(card.name)}，卡牌編號 ${safe(uid)}">${portraitMarkup(card)}<span class="bag-draft-remove" aria-hidden="true">×</span><b>${safe(card.name)}</b><small>Lv.${instance.level} · ${card.stars} 星</small><span class="bag-draft-serial" title="${safe(uid)}">${safe(uid)}</span></button>`;
  }).join('')}</div><div class="bag-draft-save"><label for="bag-deck-name"><span>牌組名稱</span><input id="bag-deck-name" type="text" maxlength="24" value="${safe(name)}" placeholder="為這八位同行者取個名字" autocomplete="off"></label><button type="button" class="primary" data-action="bag-save-deck"${!validation.valid ? ' disabled' : ''}>儲存牌組 <span>↗</span></button></div><p class="bag-draft-message${validation.valid ? ' is-ready' : ''}" role="status">${validation.valid ? '此陣已備妥，儲存後即可設為出戰牌組。' : safe(errors.join(' '))}</p></section><section class="bag-draft-collection" aria-labelledby="bag-pick-heading"><div class="section-heading"><h2 id="bag-pick-heading">挑選同行戰卡</h2><span>點卡面加入，再點一次移除</span></div>${controlsMarkup(view)}<div class="bag-results"><span>顯示 <b>${instances.length}</b> 張卡牌</span><span>同一角色只可選一張</span></div>${instances.length ? `<div class="bag-grid">${instances.map(instance => instanceTile(profile, instance, cardMarkup, { picking: true, selected: chosen.has(instance.uid) })).join('')}</div>` : '<div class="bag-empty"><p>沒有符合篩選的卡牌，試試其他條件。</p></div>'}</section>`;
}

/** Pure markup only. The app owns filtering state, persistence, focus and actions. */
export function backpackMarkup(profile, view = {}, cardMarkup) {
  const tab = view.tab === 'decks' ? 'decks' : 'cards', unique = new Set(profile.instances.map(instance => instance.cardId)).size;
  return `<main class="bag-page screen-enter"><div class="bag-lead"><div class="page-lead"><div class="eyebrow">YOUR TRAVELLING COMPANIONS</div><h1>一張一段，同行的故事。</h1><p>把相逢收入行囊，把歷練留在卡上。</p></div><div class="bag-overview"><span><b>${profile.instances.length}</b><small>持有卡牌</small></span><span><b>${unique}<i> / ${CARDS.length}</i></b><small>收集角色</small></span><span><b>${profile.instances.filter(instance => instance.locked).length}</b><small>已鎖定珍藏</small></span></div></div><nav class="bag-tabs" aria-label="背包分類"><button type="button" data-action="bag-tab" data-id="cards" aria-pressed="${tab === 'cards'}" class="${tab === 'cards' ? 'active' : ''}">我的卡牌 <span>${profile.instances.length}</span></button><button type="button" data-action="bag-tab" data-id="decks" aria-pressed="${tab === 'decks'}" class="${tab === 'decks' ? 'active' : ''}">出戰牌組 <span>${profile.deckSlots.length} / 3</span></button><span class="bag-tabs-note">這張卡的歷練會隨卡保留</span></nav>${tab === 'cards' ? cardsMarkup(profile, view, cardMarkup) : `${deckSlotsMarkup(profile, view)}${draftMarkup(profile, view, cardMarkup)}`}</main>`;
}

/** Individual card passport; sale and training protection have separate rules. */
export function instanceMarkup(profile, uid, cardMarkup) {
  let instance;
  try { instance = getInstance(profile, uid); } catch { return '<div class="bag-empty"><h2>這張卡已離開背包</h2><p>關閉詳情後，重新查看收藏。</p></div>'; }
  const card = getCard(instance.cardId), cost = getUpgradeCost(profile, uid), sale = getInstanceSale(profile, uid), protection = getInstanceProtection(profile, uid);
  const travel = getBattleCard({mode:'expedition',playerLevels:{[card.id]:instance.level}},'player',card.id);
  const nextTravel = getBattleCard({mode:'expedition',playerLevels:{[card.id]:cost.maxed?instance.level:cost.nextLevel}},'player',card.id);
  const memberships = profile.deckSlots.filter(slot => slot.instanceIds.includes(uid)), affordable = profile.coins >= cost.coins && profile.dust >= cost.dust;
  const battleBlocked = profile.pending?.instanceIds?.includes(uid), upgradeReason = battleBlocked ? '此卡正在未完對局中。' : cost.maxed ? '這張卡已達最高等級。' : cost.blockedReason || (!affordable ? '金幣或靈砂不足，可透過遊歷與每日功課補足。' : '');
  return `<div class="bag-passport-heading"><div class="eyebrow">A CARD, A JOURNEY</div><h2>${safe(card.name)} <span>同行記</span></h2><p>這張卡的歷練會隨卡保留。</p></div><div class="bag-passport"><div class="bag-passport-art">${cardMarkup(card)}<p>${FACTIONS[card.faction].icon} ${FACTIONS[card.faction].name} · ${card.stars} 星</p></div><div class="bag-passport-body"><div class="bag-passport-level">${xpMarkup(instance)}<p>累積歷練 <b>${number(instance.xp)}</b></p><p>遊歷能力 <b>力量 ${travel.power} · 傷害 ${travel.damage}</b></p></div><dl class="bag-passport-facts"><div class="bag-passport-id"><dt>卡牌編號</dt><dd>${safe(uid)}</dd></div><div><dt>入藏日期</dt><dd>${dateLabel(instance.acquiredAt)}</dd></div><div><dt>相逢緣由</dt><dd>${originName(instance.origin)}</dd></div><div><dt>對弈記錄</dt><dd>${number(instance.battles)} 場 · ${number(instance.wins)} 勝</dd></div><div><dt>珍藏狀態</dt><dd>${instance.locked ? '已鎖定' : '未鎖定'}</dd></div><div class="bag-passport-membership"><dt>所屬牌組</dt><dd>${memberships.length ? memberships.map(slot => `<span>${safe(slot.name)}${slot.id === profile.activeDeckId ? ' · 出戰' : ''}</span>`).join('') : '尚未編入牌組'}</dd></div></dl><div class="bag-passport-lore">${safe(card.lore)}</div></div></div><div class="bag-passport-upgrade"><div><h3>${cost.maxed ? '山海登峰' : `修練至 Lv.${cost.nextLevel}`}</h3><p>${cost.maxed ? '每一次同行，都已化成力量。' : `${number(cost.coins)} 金幣 · ${number(cost.dust)} 靈砂<br>升級後力量 ${nextTravel.power} · 傷害 ${nextTravel.damage}`}</p></div><button type="button" class="primary" data-action="instance-upgrade" data-id="${safe(uid)}"${cost.maxed || battleBlocked || cost.blockedReason || !affordable ? ' disabled' : ''}>${cost.maxed ? '已達上限' : '修練升級 ↗'}</button></div>${upgradeReason ? `<p class="bag-action-note">${safe(upgradeReason)}</p>` : ''}<p class="bag-pve-note">卡面顯示基礎能力；等級加成只在遊歷生效。<br>出戰累積 EXP 亦可升級：遊歷勝／和敗 +20／12；擂台 +12／8。自由切磋只記出戰，不得 EXP。</p><div class="bag-passport-actions">${lockButton(instance, 'bag-passport-lock ')}<button type="button" class="bag-sell-button" data-action="instance-sell" data-id="${safe(uid)}"${protection || sale.reason ? ' disabled' : ''}>交予商旅 · ${number(sale.sellPrice)} 金幣</button></div><p class="bag-action-note">${safe(protection || sale.reason || '出售前會再確認這張卡的編號與歷練。')}</p>`;
}
