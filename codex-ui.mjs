/** Character discovery is a read-only view of the collection, never a card grant. */
import { CARDS, ORIGINAL_CARD_IDS, CLASSIC_CARD_IDS, FACTIONS } from './engine.mjs';
import { RARITIES, CARD_RARITIES } from './progression.mjs';
import { WX01_CARD_IDS, WX01_PRINTINGS } from './printing-catalogue.mjs';

const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sets = [
  {id:'all',name:'萬象全卷',ids:CARDS.map(card=>card.id)},
  {id:'original',name:'山海初章',ids:ORIGINAL_CARD_IDS},
  {id:'classics',name:'千古群英',ids:CLASSIC_CARD_IDS},
  {id:'wx01',name:'西行萬象',ids:WX01_CARD_IDS},
];
const numbers = new Map(CARDS.map((card,index)=>[card.id,String(index+1).padStart(3,'0')]));

export function codexMarkup(profile, view, cardMarkup) {
  const known = new Set([...profile.instances.map(copy=>copy.cardId),...profile.merchantVault.map(entry=>entry.instance.cardId)]);
  const counts = new Map();
  for(const copy of profile.instances)counts.set(copy.cardId,(counts.get(copy.cardId)||0)+1);
  const selectedSet=sets.find(set=>set.id===view.set)||sets[0], status=['collected','missing'].includes(view.status)?view.status:'all';
  const candidates=CARDS.filter(card=>selectedSet.ids.includes(card.id)
    && (!view.faction||view.faction==='all'||card.faction===view.faction)
    && (!view.source||view.source==='all'||(card.source||'山海原創')===view.source));
  const collected=candidates.filter(card=>known.has(card.id)).length;
  const cards=candidates.filter(card=>status==='all'||(status==='collected')===known.has(card.id));
  const sources=[...new Set(CARDS.map(card=>card.source||'山海原創'))];
  return `<main class="collection codex-page screen-enter"><div class="codex-lead"><div><div class="eyebrow">山海有名 · 靜候相逢</div><h1>萬象圖鑑</h1><p class="collection-intro">未逢時，是一幅墨影。相逢後，山海為你着色。</p></div><div class="codex-completion"><p><strong data-codex-collected>${known.size}</strong><span> / ${CARDS.length} 位已入藏</span></p><div class="codex-progress" role="progressbar" aria-label="全卷角色收集進度" aria-valuemin="0" aria-valuemax="${CARDS.length}" aria-valuenow="${known.size}"><span style="width:${known.size/CARDS.length*100}%"></span></div><small>全卷角色 · 不重複計算同名副本</small></div></div>
    <nav class="collection-sets" aria-label="卡牌篇章">${sets.map(set=>`<button type="button" class="${selectedSet.id===set.id?'active':''}" data-action="collection-set" data-id="${set.id}" aria-pressed="${selectedSet.id===set.id}">${set.name}<span>${set.ids.filter(id=>known.has(id)).length} / ${set.ids.length}</span></button>`).join('')}</nav>
    <div class="codex-tools"><div class="codex-status-filter" role="group" aria-label="圖鑑收集狀態">${[['all','全卷',candidates.length],['collected','已入藏',collected],['missing','未入藏',candidates.length-collected]].map(([id,label,count])=>`<button type="button" data-action="codex-status" data-id="${id}" aria-pressed="${status===id}">${label} <span>${count}</span></button>`).join('')}</div><label for="source-filter">人物出處<select id="source-filter"><option value="all">所有典籍</option>${sources.map(source=>`<option value="${safe(source)}"${source===view.source?' selected':''}>${safe(source)}</option>`).join('')}</select></label></div>
    <div class="filters" aria-label="篩選陣營"><button type="button" class="filter ${!view.faction||view.faction==='all'?'active':''}" data-action="filter" data-id="all" aria-pressed="${!view.faction||view.faction==='all'}">萬象 · 全部</button>${Object.entries(FACTIONS).map(([id,faction])=>`<button type="button" class="filter ${view.faction===id?'active':''}" data-action="filter" data-id="${id}" aria-pressed="${view.faction===id}">${faction.icon} ${faction.name}</button>`).join('')}</div>
    <div class="codex-legend"><span><i class="codex-legend-found" aria-hidden="true"></i>已入藏 · 彩繪</span><span><i aria-hidden="true"></i>未入藏 · 墨影</span><span class="codex-visible-count">顯示 ${cards.length} 位</span></div>
    <div class="collection-grid">${cards.map(card=>{
      const owned=known.has(card.id),count=counts.get(card.id)||0;
      const printId=selectedSet.id==='wx01'?WX01_PRINTINGS.find(print=>print.cardId===card.id&&print.treatment==='base')?.id:undefined;
      return `<article class="collection-item ${owned?'is-collected':'unowned'}" data-card-id="${card.id}" data-collected="${owned}" aria-label="${safe(card.name)}，圖鑑 ${numbers.get(card.id)}，${owned?'已入藏':'未入藏'}"><div class="codex-card-heading"><span class="codex-number">NO.${numbers.get(card.id)}</span><span class="codex-state">${owned?'已入藏':'未入藏'}</span></div><div class="codex-card-window">${cardMarkup(card,{collection:true,printId,discovered:owned})}${owned?'':'<span class="codex-unfound-seal" aria-hidden="true">未逢</span>'}</div><div class="collection-source"><span>${safe(card.source||'山海原創')}</span><span class="rarity-dot" style="--rarity:${RARITIES[CARD_RARITIES[card.id]].color}" title="${RARITIES[CARD_RARITIES[card.id]].name}"></span></div><div class="collection-meta"><span>${count?`持有 ${count} 張`:owned?'商旅保管中':'等待第一次相逢'}</span></div><button type="button" class="collection-action" data-action="${count?'bag-card':'market'}" data-id="${card.id}">${count?'展開我的藏卡 →':'前往市集尋訪 ↗'}</button></article>`;
    }).join('')}</div>${cards.length?'':'<div class="empty-state codex-empty">'+(status==='missing'&&candidates.length?'這一頁的同行者，已全數相逢。':'這一頁暫時無人入卷，試試其他篩選。')+'</div>'}</main>`;
}
