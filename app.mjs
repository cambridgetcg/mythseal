import { CARDS, FACTIONS, RULES, defaultDeckIds, getCard, validateDeck, createMatch, chooseAIMove, previewMove, resolveRound, hasFactionBonus, getBattleCard, CLASSIC_CARD_IDS } from './engine.mjs';

import { PROFILE_KEY, LEGACY_PROFILE_KEY, NODES, RARITIES, CARD_RARITIES, PACK_PRICE, PACK_SETS, hydrateProfile, refreshDaily, claimLogin, claimTask, buyPack, buyCard, sellInstance, buybackInstance, getInstanceSale, upgradeCard, trainCard, beginBattle, finishBattle, abandonBattle, claimArenaChest, isNodeUnlocked } from './progression.mjs';
import { getInstance, getPreferredInstance, getActiveDeck, getDeckLevels, toggleInstanceLock, saveInstanceDeck, activateDeck, deleteDeck, validateInstanceDeck } from './collection.mjs';
import { backpackMarkup, instanceMarkup } from './backpack-ui.mjs';
import { worldMarkup, dailyMarkup, marketMarkup, arenaMarkup, rewardText } from './adventure-ui.mjs';
import { gameHeaderMarkup, gameDockMarkup, lobbyMarkup } from './navigation-ui.mjs';
import { mistGateArrivalMarkup, mistGateBattleMarkup, mistGatePillsMarkup, mistGateResonanceMarkup, mistGateResultMarkup, mistGateRevealMarkup } from './mist-gate-ui.mjs';
import { createExperienceController } from './experience.mjs';
import { createAccountController } from './account-client.mjs';
import { accountMarkup, accountButtonMarkup } from './account-ui.mjs';
import { createSnapshot, restoreSnapshot, fingerprintProfile } from './cloud-save.mjs';

const app = document.querySelector('#app');
const overlay = document.querySelector('#overlay-root');
const announcer = document.querySelector('#announcer');
const safe = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const BATTLE_KEY='shanhai.battle.v3', LEGACY_BATTLE_KEY='shanhai.battle.v2';
const RECOVERY_KEY='shanhai.profile.recovery.v3';
const loadProfile=()=>hydrateProfile(read(PROFILE_KEY,null)??read(LEGACY_PROFILE_KEY,null),{legacyDeck:read('shanhai.deck.v1',null),legacyStats:read('shanhai.stats.v1',null),legacyBattle:read(LEGACY_BATTLE_KEY,null)});
let profile=loadProfile();
let collectionSet='all', sourceFilter='all', ownedOnly=false, selectedPack='classics';
const classicsDeck=['kongzi','qingxiao','wukong','guanyu','lindaiyu','shuangli','cangjiao','cuixian'];
let deckDraftReady=false;
let screen='home', filter='all', selectedNode=profile.location||NODES[0].id, trainingId=getActiveDeck(profile)?.instanceIds[0]||null;
let bagView={tab:'cards',query:'',filter:'all',faction:'all',sort:'recent',editingSlotId:profile.activeDeckId,draftInstanceIds:[],deckName:''};
let match=null, encounter=null, selected=null, pills=0, fury=false, aiMove=null, busy=false, recorded=false, revealPending=false, lastReward=null;
let sound=false, toastTimer, lastFocus=null, economyBusy=false;
let experience, experienceReturn=null;
experience=createExperienceController({storage:{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)},document,window,onPreferencesChange:applyExperiencePreferences});
applyExperiencePreferences(experience.getPreferences());
let recoveryDraft=null;
// Navigation drafts never create, settle or replace a persisted encounter.
let preparation=null, preparationReturn=null, accountReturn='home', modalKind=null, modalOrigin=null;
const screenScroll=new Map();
const account = createAccountController({
  getLocalProfile: loadProfile,
  restoreLocalProfile,
  onChange: () => {
    if (screen === 'account') render();
    else {
      const button = app.querySelector('[data-action="account"], [data-action="account-open"]');
      if (button) button.outerHTML = accountButtonMarkup(account.getState());
    }
  },
  notify: message => toast(message),
});
const accountChannel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('mythseal-account') : null;
accountChannel?.addEventListener('message', event => {
  const state = account.getState();
  if (event.data?.type !== 'session-changed' || (!state.initialized && !state.busy)) return;
  account.invalidateSession();
  account.init();
});
const modeName=kind=>({practice:'自由切磋',expedition:'山海遊歷',arena:'問道擂台'}[kind]||'山海對弈');
const isMistGate=(intent=encounter)=>intent?.kind==='expedition'&&intent.nodeId==='mist-gate';
function applyExperiencePreferences(preferences) {
  sound=preferences.sound;
  document.body.dataset.motion=experience?.reducedMotion()?'reduce':'full';
  document.body.dataset.pageHidden=String(document.hidden);
  document.querySelectorAll('[data-action="sound"]').forEach(button=>{
    button.setAttribute('aria-pressed',String(sound));button.setAttribute('aria-label',`${sound?'關閉':'開啟'}音效`);button.textContent=sound?'♫':'♪';
  });
}
function syncExperienceScene() {
  const preparing=modalKind==='preparation'||(modalKind==='experience-settings'&&experienceReturn?.kind==='preparation');
  experience.setScene((screen==='battle'&&isMistGate())||(preparing&&isMistGate(preparation)));
}
function syncProfile(next){profile=next;}
async function transact(change,onSaved){
  const apply=()=>{
    const result=change(loadProfile()), next=result.profile||result;
    localStorage.setItem(PROFILE_KEY,JSON.stringify(next));
    syncProfile(next);account.markLocalChanged();if(onSaved)onSaved(result);return result;
  };
  return navigator.locks ? navigator.locks.request('shanhai-profile-v3',apply) : apply();
}
async function restoreLocalProfile(snapshot, expectedFingerprint, { isCurrent = () => true } = {}) {
  const restored = restoreSnapshot(snapshot);
  if (!navigator.locks) throw Error('請用新版瀏覽器恢復旅程；本機進度未有更改。');
  return navigator.locks.request('shanhai-profile-v3', () => {
    const current = loadProfile();
    if (!isCurrent()) throw Error('登入狀態已改變，未有恢復旅程。');
    if (economyBusy || current.pending) throw Error('請先完成或放棄未完對局，再恢復雲端旅程。');
    if (fingerprintProfile(current) !== expectedFingerprint) throw Error('本機旅程剛有更新，請重新查看後再恢復。');
    // Preserve a complete, validated local recovery copy before replacing anything.
    localStorage.setItem(RECOVERY_KEY, JSON.stringify({ savedAt: new Date().toISOString(), snapshot: createSnapshot(current) }));
    localStorage.setItem(PROFILE_KEY, JSON.stringify(restored));
    localStorage.removeItem(BATTLE_KEY);
    syncProfile(restored);
    match=null;encounter=null;selected=null;busy=false;recorded=false;revealPending=false;lastReward=null;
    deckDraftReady=false;selectedNode=profile.location||NODES[0].id;
    preparation=null;preparationReturn=null;screenScroll.clear();
    trainingId=getActiveDeck(profile)?.instanceIds[0]||null;
    bagView={tab:'cards',query:'',filter:'all',faction:'all',sort:'recent',editingSlotId:profile.activeDeckId,draftInstanceIds:[],deckName:''};
    return restored;
  });
}
function recoveryMarkup() {
  const saved = read(RECOVERY_KEY, null);
  if (!saved?.snapshot) return '';
  return `<aside class="account-recovery"><p>上次恢復前的本機旅程已保留。你可以下載副本，或復原到當時進度。</p><button class="text-button" data-action="export-recovery">下載本機回復備份 ↗</button><button class="text-button" data-action="restore-recovery">復原上次本機旅程 →</button></aside>`;
}
async function economy(change,message,after,onSaved){
  if(economyBusy)return;economyBusy=true;
  try{const result=await transact(change,onSaved);render();if(after)after(result);if(message)toast(message);playTone('select');}
  catch(error){toast(error.message||'未能儲存，請檢查瀏覽器儲存空間。');}
  finally{economyBusy=false;}
}
function persistBattle(){
  if(!match||!encounter||loadProfile().pending?.id!==encounter.id)return;
  localStorage.setItem(BATTLE_KEY,JSON.stringify({match,encounter,selected,pills,fury,aiMove,revealPending,recorded,lastReward}));
}
function clearBattleSnapshot(id){if(read(BATTLE_KEY,null)?.encounter?.id===id)localStorage.removeItem(BATTLE_KEY);}
function pendingBanner(){return profile.pending?`<div class="resume-banner"><span>你有一場未完的${modeName(profile.pending.kind)}，進度已保留。</span><button class="small-button" data-action="resume">繼續對局 →</button></div>`:'';}
const faction = card => FACTIONS[card.faction];

function cardMarkup(card, options = {}) {
  const { selectable=false, selected:falseSelected=false, used=false, small=false, bonus=false, collection=false, picked=false, action='inspect', side='player', instanceId=null } = options;
  const tag = selectable || small || collection ? 'button' : 'div';
  const attrs = tag === 'button' ? `type="button" data-action="${action}" data-id="${instanceId||card.id}" data-card-id="${card.id}" data-side="${side}" aria-label="${safe(card.name)}，${card.stars} 星，力量 ${card.power}，傷害 ${card.damage}${used ? '，已出戰' : ''}" ${used && selectable ? 'disabled' : ''} ${selectable ? `aria-pressed="${falseSelected}"` : ''}` : '';
  return `<${tag} class="card ${selectable?'selectable':''} ${falseSelected?'selected':''} ${used?'used':''} ${collection?'collection-card':''}" ${attrs} style="--faction:${faction(card).color}">
    <div class="card-art" style="background-image:url(assets/${card.artSet==='classics'?'classics':'portraits'}.png);background-position:${(card.art % 4) / 3 * 100}% ${Math.floor(card.art / 4) / 2 * 100}%"></div><div class="card-shade"></div>
    <div class="card-top"><span class="faction-label">${faction(card).icon} ${faction(card).name}</span><span class="stars" aria-label="${card.stars} 星">${'✦'.repeat(card.stars)}</span></div>
    ${picked?'<span class="picked-check" aria-label="已加入牌組">✓</span>':''}
    <div class="card-copy"><div class="card-title">${card.title}</div><h3 class="card-name">${card.name}</h3><div class="card-divider"></div>
      <div class="card-stats"><span class="card-stat">力 <strong>${card.power}</strong></span><span class="card-stat">傷 <strong>${card.damage}</strong></span>${small?`<span class="card-stat" style="color:var(--gold)">${card.stars} 星</span>`:''}</div>
      <div class="card-skill">${card.ability.label}</div>${bonus?'<div class="card-bonus">✧ 同族共鳴已啟動</div>':''}
    </div></${tag}>`;
}

function header() {
  return gameHeaderMarkup({profile,screen,sound,accountButton:accountButtonMarkup(account.getState())});
}
function homeMarkup() { return lobbyMarkup(profile,cardMarkup); }

function resourcesMarkup(side) {
  const who = match[side];
  return `<div class="resources" aria-label="${side==='player'?'你':'對手'}剩餘 ${who.hp} 生命，${who.pills} 仙丹"><div class="resource"><div class="resource-top"><span class="resource-label">生命</span><strong>${who.hp}</strong><small>/ 12</small></div><div class="hp-track"><div class="hp-fill ${side==='opponent'?'enemy':''}" style="width:${who.hp/12*100}%"></div></div></div><div class="resource"><div class="resource-top"><span class="resource-label">仙丹</span><strong>${who.pills}</strong><small>/ 12</small></div><div class="pill-dots" aria-hidden="true">${Array.from({length:12},(_,i)=>`<i class="${i<who.pills?'filled':''}"></i>`).join('')}</div></div></div>`;
}

function movePanel() {
  const card = getBattleCard(match,'player',selected);
  const preview = previewMove(match, 'player', { cardId:selected, pills, fury });
  const maxPills = match.player.pills - (fury ? RULES.furyCost : 0);
  return `<aside class="move-panel" aria-label="出牌設定"><h3>${card.name} <span style="font-size:11px;color:var(--muted)">· 出戰</span></h3><p class="move-subtitle">仙丹暗置 · 勝負揭曉前不公開</p>${isMistGate()?mistGatePillsMarkup({pills,fury,remaining:match.player.pills-preview.cost}):''}
    <div class="pill-control"><button data-action="pill-minus" aria-label="減少一枚仙丹" ${pills===0?'disabled':''}>−</button><div class="pill-number"><span id="pill-amount">${pills}</span><small>投入仙丹</small></div><button data-action="pill-plus" aria-label="增加一枚仙丹" ${pills===maxPills?'disabled':''}>+</button></div>
    <input class="pill-slider" id="pill-slider" aria-label="投入仙丹" type="range" min="0" max="${maxPills}" step="1" value="${pills}">
    <button class="fury-toggle" data-action="fury" aria-pressed="${fury}" ${match.player.pills<3?'disabled':''}><span>怒擊 <span style="opacity:.65">· 另付 3 丹，傷害 +2</span></span><span class="toggle-track"></span></button>
    <div class="attack-preview"><span>預估攻擊<small>含己方技能，未計對手影響</small></span><strong id="attack-value">${preview.attack}</strong></div>
    <button class="primary" data-action="commit" ${busy?'disabled':''}>${isMistGate()?'封丹 · 落子':'落子 · 決勝'} <span>↗</span></button>
    <p class="skill-detail"><b>${card.ability.label}</b><br>${card.ability.description}${preview.bonusActive?`<br><span style="color:${faction(card).color}">✧ ${faction(card).bonus.label}</span>`:''}<br><span id="cost-note">共消耗 ${preview.cost} 丹，出牌後剩 ${match.player.pills-preview.cost} 丹。</span></p></aside>`;
}

function battleMarkup() {
  const enemyRevealed = match.initiative === 'opponent' && aiMove;
  const last = match.history.at(-1);
  const resonance=isMistGate()?mistGateResonanceMarkup({factions:Object.entries(FACTIONS).filter(([id])=>match.player.hand.some(cardId=>getCard(cardId).faction===id&&hasFactionBonus(match,'player',cardId))).map(([,value])=>value)}):'';
  return `<main class="arena screen-enter">${isMistGate()?mistGateBattleMarkup({round:match.round,initiative:match.initiative}):''}<div class="arena-heading"><div class="eyebrow">${modeName(encounter?.kind)} · 策略對弈</div><div class="round-steps">第 ${match.round} / 4 回合 ${Array.from({length:4},(_,i)=>`<span class="${i<match.round-1?'done':i===match.round-1?'current':''}"></span>`).join('')}</div></div>
    <div class="combatant"><div class="identity"><div class="avatar">隱</div><div><h2>${safe(match.opponentName||'山海弈者')}</h2><p>知進退，亦善藏鋒 · AI 對手</p></div></div>${resourcesMarkup('opponent')}</div>
    <div class="enemy-zone"><div class="enemy-thought">${enemyRevealed?`對手亮出「${getCard(aiMove.cardId).name}」。`:'一局山海，靜候落子。'}<small>${enemyRevealed?'對手先手出牌，仙丹仍是秘密。':'你先手出牌，對手只看見卡牌。'}<br>點擊卡牌可查看技能。</small></div><div class="enemy-hand">${match.opponent.hand.map(id=>cardMarkup(getBattleCard(match,'opponent',id),{small:true,side:'opponent',selected:enemyRevealed && aiMove.cardId===id,used:match.opponent.used.includes(id)})).join('')}</div></div>
    <div class="battle-divider"><span>${match.initiative==='player'?'你持先手 · 請落子':'你持後手 · 請應戰'}</span></div>
    <div class="combatant"><div class="identity"><div class="avatar">你</div><div><h2>執令者</h2><p>${match.mode==='expedition'?'遊歷修練加成已生效':'基礎能力對弈 · 修練加成不計入'}</p></div></div>${resourcesMarkup('player')}</div>
    ${resonance}<div class="player-area"><div class="player-hand">${match.player.hand.map(id=>cardMarkup(getBattleCard(match,'player',id),{selectable:true,selected:selected===id,used:match.player.used.includes(id),bonus:hasFactionBonus(match,'player',id),action:'select'})).join('')}<div class="hand-caption"><span>點選戰卡，再分配仙丹。</span><button class="text-button" style="padding:0;font-size:inherit" data-action="inspect" data-id="${selected}">查看「${getCard(selected).name}」詳情 ↗</button></div></div>${movePanel()}</div>
    <div class="arena-bottom"><span class="battle-log">${last?`上一局 · ${last.player.card.name} ${last.player.attack} : ${last.opponent.attack} ${last.opponent.card.name} · ${last.winner==='player'?'你':'對手'}勝`:'善弈者，懂得在一局之中為下一局留下餘地。'}</span><button class="text-button" style="padding:0;font-size:inherit" data-action="history">對弈紀錄 ↗</button></div></main>`;
}

function collectionMarkup() {
  const collected=CARDS.filter(c=>profile.inventory[c.id]>0).length;
  const cards=CARDS.filter(c=>(filter==='all'||c.faction===filter)&&(collectionSet==='all'||(collectionSet==='classics'?c.artSet==='classics':c.artSet!=='classics'))&&(sourceFilter==='all'||(c.source||'山海原創')===sourceFilter)&&(!ownedOnly||profile.inventory[c.id]>0));
  const sources=[...new Set(CARDS.map(c=>c.source||'山海原創'))];
  return `<main class="collection screen-enter"><div class="eyebrow">THE ARCHIVE OF REALMS · ${collected} / ${CARDS.length} 已入藏</div><div class="collection-head"><div><h1>萬象圖鑑</h1><p class="collection-intro">翻閱人物的來歷與弈道。每張持有的戰卡，都在「我的戰卡」留下自己的故事。</p></div></div>
    <div class="collection-sets" aria-label="卡牌篇章">${[['all','萬象全卷'],['original','山海初章'],['classics','千古群英']].map(([id,name])=>`<button class="${collectionSet===id?'active':''}" data-action="collection-set" data-id="${id}" aria-pressed="${collectionSet===id}">${name}<span>${id==='all'?CARDS.length:id==='classics'?CLASSIC_CARD_IDS.length:CARDS.length-CLASSIC_CARD_IDS.length}</span></button>`).join('')}</div>
    <div class="collection-tools"><label>人物出處<select id="source-filter"><option value="all">所有典籍</option>${sources.map(source=>`<option value="${safe(source)}" ${source===sourceFilter?'selected':''}>${safe(source)}</option>`).join('')}</select></label><label class="owned-filter"><input id="owned-only" type="checkbox" ${ownedOnly?'checked':''}>只看已入藏</label><span>${cards.length} 位人物</span></div>
    <div class="filters" aria-label="篩選陣營"><button class="filter ${filter==='all'?'active':''}" data-action="filter" data-id="all">萬象 · 全部</button>${Object.entries(FACTIONS).map(([id,f])=>`<button class="filter ${filter===id?'active':''}" data-action="filter" data-id="${id}">${f.icon} ${f.name}</button>`).join('')}</div>
    <div class="collection-grid">${cards.map(c=>{const owned=profile.inventory[c.id]>0;return `<div class="collection-item ${owned?'':'unowned'}" data-card-id="${c.id}"><div class="collection-source"><span>${safe(c.source||'山海原創')}</span><span class="rarity-dot" style="--rarity:${RARITIES[CARD_RARITIES[c.id]].color}" title="${RARITIES[CARD_RARITIES[c.id]].name}"></span></div>${cardMarkup(c,{collection:true})}<div class="collection-meta"><span>${owned?`持有 ${profile.inventory[c.id]} 張`:'尚未入藏'}</span></div><button class="collection-action" data-action="${owned?'bag-card':'market'}" data-id="${c.id}">${owned?'查看我的戰卡 →':'前往市集尋訪 ↗'}</button></div>`;}).join('')}</div>
    ${cards.length?'':'<div class="empty-state">這一頁暫時無人入卷，試試其他篩選。</div>'}</main>`;
}

function cardsHubTabs() {
  const active=screen==='collection'?'codex':bagView.tab;
  return `<nav class="cards-hub-tabs" aria-label="藏卡分類">${[['cards','我的戰卡'],['decks','三套牌組'],['codex','萬象圖鑑']].map(([id,label])=>`<button type="button" data-action="cards-tab" data-id="${id}" aria-pressed="${active===id}" class="${active===id?'active':''}">${label}</button>`).join('')}</nav>`;
}
function preparationReturnMarkup() {
  return preparationReturn?`<div class="prep-return"><button class="text-button" data-action="return-prep">← 返回出戰整備</button><span>下一場 · ${safe(modeName(preparation?.kind))}${preparation?.nodeId?` · ${safe(NODES.find(n=>n.id===preparation.nodeId)?.name||'')}`:''}</span></div>`:'';
}

function captureFocus(container) {
  const el=document.activeElement;
  if(!el||!container.contains(el))return null;
  if(el.id)return {elementId:el.id};
  return el.dataset.action?{action:el.dataset.action,id:el.dataset.id}:null;
}
function restoreFocus(container,focus) {
  if(!focus)return;
  const target=focus.elementId?document.getElementById(focus.elementId):[...container.querySelectorAll('[data-action]')].find(el=>el.dataset.action===focus.action&&el.dataset.id===focus.id);
  if(target&&!target.disabled)target.focus({preventScroll:true});
  else if(['pill-plus','pill-minus'].includes(focus.action))container.querySelector('#pill-slider')?.focus({preventScroll:true});
}
function render() {
  const focus=captureFocus(app);
  profile=refreshDaily(profile);
  const pages={home:homeMarkup,collection:collectionMarkup,battle:()=>revealPending||match.status==='finished'?roundHoldMarkup():battleMarkup(),world:()=>worldMarkup(profile,selectedNode),market:()=>marketMarkup(profile,cardMarkup,selectedPack),arena:()=>arenaMarkup(profile),bag:()=>backpackMarkup(profile,bagView,cardMarkup,{showTabs:false}),account:()=>`<main><button class="text-button game-back" data-action="account-back">← 返回旅途</button>${accountMarkup(account.getState(),profile)}<div class="game-utilities"><button class="text-button" data-action="export-save">匯出旅程備份 ↗</button><button class="text-button" data-action="rules">弈道 · 遊戲規則</button></div>${recoveryMarkup()}</main>`};
  const cardsScreen=['bag','collection'].includes(screen);
  app.innerHTML=`<div class="shell game-shell screen-${screen}${screen==='battle'&&isMistGate()?' is-mist-gate':''}">${header()}${screen==='battle'||screen==='home'?'':pendingBanner()}${cardsScreen?preparationReturnMarkup()+cardsHubTabs():''}${(pages[screen]||homeMarkup)()}${gameDockMarkup(screen)}</div>`;
  refreshOverlay();
  syncExperienceScene();
  restoreFocus(app,focus);
}
function announce(message) { announcer.textContent = message; }
function toast(message) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div'); el.className='toast'; el.textContent=message; document.body.append(el);
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.remove(),2600); announce(message);
}
function playTone(kind='select') {
  experience.cue(kind);
}
function closeModal() {
  experience.finishReveal();experienceReturn=null;
  overlay.innerHTML=''; document.body.style.overflow='';app.inert=false;modalKind=null;
  // A preparation-to-battle transition stays in the same soundscape.
  queueMicrotask(syncExperienceScene);
  if(lastFocus?.isConnected) lastFocus.focus({preventScroll:true});
  else if(modalOrigin?.screen===screen)restoreFocus(app,modalOrigin.focus);
  if(modalOrigin?.screen===screen)window.scrollTo({top:modalOrigin.scroll,behavior:'instant'});
  lastFocus=null;modalOrigin=null;
}
function modal(content, className='', dismissible=true, kind=null) {
  experience.finishReveal();
  if(!overlay.firstElementChild){lastFocus=document.activeElement;modalOrigin={screen,focus:captureFocus(app),scroll:window.scrollY};}
  modalKind=kind;
  overlay.innerHTML=`<div class="modal-backdrop" data-dismissible="${dismissible}"><section class="modal ${className}" role="dialog" aria-modal="true" aria-label="萬象契對話框">${dismissible?'<button class="modal-close" data-action="close-modal" aria-label="關閉">×</button>':''}${content}</section></div>`;
  document.body.style.overflow='hidden';app.inert=true;
  syncExperienceScene();
  requestAnimationFrame(()=>overlay.querySelector('button:not(:disabled):not([hidden])')?.focus({preventScroll:true}));
}
function dismissModal() {
  const origin=experienceReturn;
  if(['result-card','experience-settings'].includes(modalKind)&&origin?.kind){
    experienceReturn=null;
    if(origin.kind==='round-result')resultModal();
    else if(origin.kind==='match-result')matchEndModal();
    else if(origin.kind==='preparation'&&preparation)prepareEncounter(preparation.kind,preparation.nodeId);
    else return closeModal();
    if(modalKind===origin.kind)requestAnimationFrame(()=>{
      restoreFocus(overlay,origin.focus);
      const dialog=overlay.querySelector('.modal');if(dialog)dialog.scrollTop=origin.scroll;
      if(overlay.firstElementChild)overlay.firstElementChild.scrollTop=origin.backdropScroll;
    });
    return;
  }
  closeModal();
}
function captureModalReturn() {
  return {kind:modalKind,focus:captureFocus(overlay),scroll:overlay.querySelector('.modal')?.scrollTop||0,backdropScroll:overlay.firstElementChild?.scrollTop||0};
}
function experienceSettingsModal() {
  experienceReturn=captureModalReturn();
  const p=experience.getPreferences();
  modal(`<div class="eyebrow">旅途隨心</div><h2>聲息與節奏</h2><p>留一點水聲，或安靜落子。依你的步調遊歷。</p>
    <label class="experience-field"><span>開啟聲音<small>水聲與落子音效</small></span><input id="experience-sound" type="checkbox" ${p.sound?'checked':''}></label>
    <label class="experience-field"><span>環境聲 <output id="experience-ambience-value">${Math.round(p.ambience*100)}%</output></span><input id="experience-ambience" type="range" min="0" max="1" step="0.05" value="${p.ambience}"></label>
    <label class="experience-field"><span>落子音效 <output id="experience-effects-value">${Math.round(p.effects*100)}%</output></span><input id="experience-effects" type="range" min="0" max="1" step="0.05" value="${p.effects}"></label>
    <label class="experience-field"><span>動態</span><select id="experience-motion"><option value="system" ${p.motion==='system'?'selected':''}>跟隨裝置設定</option><option value="reduce" ${p.motion==='reduce'?'selected':''}>減少動態</option></select></label>
    <label class="experience-field"><span>揭曉節奏</span><select id="experience-pace"><option value="normal" ${p.pace==='normal'?'selected':''}>從容揭曉</option><option value="fast" ${p.pace==='fast'?'selected':''}>直接看結果</option></select></label>
    <p class="panel-footnote">設定會記在此裝置。揭曉時亦可直接跳過。</p><div class="modal-actions"><button class="primary" data-action="close-modal">${screen==='battle'?'返回對局':'返回旅途'} →</button></div>`,'experience-settings',true,'experience-settings');
}
function questsModal() {
  modal(`<div class="quest-content">${dailyMarkup(profile,trainingId)}</div>`,'quest-scroll',true,'quests');
}
function refreshOverlay() {
  if(!['quests','preparation'].includes(modalKind))return;
  const focus=captureFocus(overlay),dialog=overlay.querySelector('.modal'),scroll=dialog.scrollTop,backdropScroll=overlay.firstElementChild.scrollTop;
  if(modalKind==='quests')overlay.querySelector('.quest-content').innerHTML=dailyMarkup(profile,trainingId);
  if(modalKind==='preparation')overlay.querySelector('.prep-content').innerHTML=preparationContent();
  restoreFocus(overlay,focus);
  if(focus&&!overlay.contains(document.activeElement))overlay.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
  dialog.scrollTop=scroll;overlay.firstElementChild.scrollTop=backdropScroll;
}
function nextJourneyNode() {
  return NODES.find(n=>isNodeUnlocked(profile,n.id)&&!profile.cleared.includes(n.id))||NODES.find(n=>n.id===profile.location)||NODES[0];
}
function preparationContent() {
  const kind=preparation.kind,node=NODES.find(n=>n.id===preparation.nodeId),deck=getActiveDeck(profile);
  const valid=validateInstanceDeck(profile,deck?.instanceIds).valid;
  const cards=(deck?.instanceIds||[]).map(uid=>profile.instances.find(i=>i.uid===uid)).filter(Boolean);
  const mist=isMistGate(preparation);
  return `${mist?mistGateArrivalMarkup({returning:profile.cleared.includes(node.id)}):`<div class="eyebrow">${modeName(kind)} · 出發前整備</div><h2>${safe(node?.name||modeName(kind))}</h2>`}<p class="prep-opponent">${safe(node?.enemyName||'山海弈者')} · AI 對手<br>${kind==='expedition'?'四回合 · 此張戰卡的修練加成生效':'四回合 · 使用基礎能力對弈'}</p>${node?`${mist?'':`<p>${safe(node.description)}</p>`}<p class="destination-rewards">勝利獎勵 · ${rewardText(node.winReward)}</p>`:''}<div class="prep-deck-heading"><h3>${safe(deck?.name||'尚未選擇牌組')}</h3><button class="text-button" data-action="prep-deck">更換／整備牌組 →</button></div><div class="prep-deck-strip">${cards.map(i=>`<div>${cardMarkup(getCard(i.cardId))}<small>Lv.${i.level}</small></div>`).join('')}</div><p class="panel-footnote">從這八張卡隨機抽四張出戰。${kind==='practice'?'自由切磋不獲金幣或卡牌 EXP。':''}</p>${valid?'':'<p class="account-message is-error">先儲存並啟用八張不同角色、總星數不超過 25 的牌組。</p>'}<div class="modal-actions"><button class="secondary" data-action="close-modal">稍後出發</button><button class="primary" data-action="confirm-start" ${valid?'':'disabled'}>${mist?'踏上渡口':'進入對局'} →</button></div>${mist?'<button class="text-button" data-action="experience-settings">聲息與節奏 · 設定</button>':''}`;
}
function prepareEncounter(kind='practice',nodeId=null) {
  if(economyBusy)return;
  syncProfile(loadProfile());
  if(profile.pending)return pendingModal();
  if(kind==='expedition'&&!isNodeUnlocked(profile,nodeId))return toast('先踏破上一境，方可繼續遊歷。');
  preparation={kind,nodeId};
  modal(`<div class="prep-content">${preparationContent()}</div>`,`encounter-prep${isMistGate(preparation)?' is-mist-prep':''}`,true,'preparation');
}
function openPreparationDeck() {
  if(!preparation)return;
  const origin={screen,scroll:modalOrigin?.scroll??window.scrollY,focus:modalOrigin?.focus||captureFocus(app)};
  closeModal();screenScroll.set(screen,origin.scroll);
  preparationReturn=origin;screen='bag';bagView.tab='decks';if(!deckDraftReady)loadBagDeck(profile.activeDeckId);render();window.scrollTo({top:0,behavior:'instant'});
}
function returnToPreparation() {
  if(!preparationReturn||!preparation)return;
  const origin=preparationReturn;
  closeModal();screen=origin.screen;preparationReturn=null;render();window.scrollTo({top:origin.scroll,behavior:'instant'});restoreFocus(app,origin.focus);
  prepareEncounter(preparation.kind,preparation.nodeId);
}
function nextEncounterIntent() {
  const kind=encounter?.kind||'practice';
  if(kind!=='expedition')return {kind,nodeId:null};
  const index=NODES.findIndex(n=>n.id===encounter.nodeId);
  const next=NODES[index+1];
  return {kind,nodeId:match.winner==='player'&&next&&isNodeUnlocked(profile,next.id)?next.id:encounter.nodeId};
}
function prepareNextEncounter({editDeck=false}={}) {
  const intent=nextEncounterIntent();
  if(intent.kind==='expedition')selectedNode=intent.nodeId;
  navigate(intent.kind==='expedition'?'world':'arena');
  prepareEncounter(intent.kind,intent.nodeId);
  if(editDeck&&modalKind==='preparation')openPreparationDeck();
}
function rulesModal() {
  modal(`<div class="eyebrow">THE ART OF THE DUEL</div><h2>入局，先知取捨。</h2><p>每局 12 生命、12 仙丹。從八張牌中隨機抽四張，最多交手四回合。牌用過就不能再出，仙丹也要留給後面。</p>
    <div class="rules-grid"><div class="rule"><span class="rule-number">01 / 藏鋒</span><h3>力量 ×（1 ＋ 仙丹）</h3><p>加丹提高攻擊，不直接提高傷害。零丹亦有基礎攻擊，可以試探、留力，甚至以技能取勝。</p></div>
    <div class="rule"><span class="rule-number">02 / 決勝</span><h3>高攻得勝，按傷扣血</h3><p>攻擊相同時，低星卡勝；星數亦相同，先手勝。生命歸零即結束，四回合後剩餘生命較高者勝。</p></div>
    <div class="rule"><span class="rule-number">03 / 共鳴</span><h3>同族同行，天賦甦醒</h3><p>抽出的四張牌中，至少兩張不同角色同族，便啟動該族加成。已出過的卡仍計入共鳴。</p></div>
    <div class="rule"><span class="rule-number">04 / 破局</span><h3>明牌暗丹，交替先後</h3><p>先手先亮卡，仙丹一直保密。雙方輪換先手。怒擊另付 3 丹，贏得該回合時傷害 +2。</p></div></div>
    <div class="rules-note">第一回合：四張牌總星數較高的一方先手，相同則隨機。<br>攻擊預估只包含己方效果；對手的封鎖、減力、減攻可能改變結果。</div>
    <div class="modal-actions"><button class="primary" data-action="${screen==='battle'?'close-modal':'rules-start'}">${screen==='battle'?'明白，返回對局':'知其道，入其局'} <span>↗</span></button></div>`);
}
function detailModal(id, side='player') {
  const c=screen==='battle'?getBattleCard(match,side,id):getCard(id), f=faction(c);
  modal(`<div class="eyebrow">THE ARCHIVE · ${f.name}</div><div class="detail-layout">${cardMarkup(c)}<div><div class="eyebrow" style="font-size:8px">${c.title}</div><h2>${c.name}</h2><p class="detail-rank" style="color:var(--gold);font-size:11px;margin:5px 0">${c.stars} 星 · 力量 ${c.power} · 傷害 ${c.damage}${screen==='battle'&&match.mode==='expedition'?` · 出戰 Lv.${c.level}`:''}</p><p class="detail-source">${safe(c.source||'山海原創')} · ${RARITIES[CARD_RARITIES[c.id]].name}${screen==='battle'?'':profile.inventory[c.id]>0?` · 已入藏 ${profile.inventory[c.id]} 張`:' · 尚未入藏'}</p><p class="detail-lore">${c.lore}</p><div class="detail-ability"><b>${c.ability.label}</b><p>${c.ability.description}</p></div><div class="detail-ability"><b>${f.bonus.label}</b><p>${f.bonus.description}本局抽出兩位同族角色即可啟動。</p></div></div></div>${screen==='battle'?'':`<div class="modal-actions"><button class="secondary" data-action="${profile.inventory[c.id]>0?'upgrade':'market'}" data-id="${c.id}">${profile.inventory[c.id]>0?'修練此卡 →':'前往市集尋訪 →'}</button></div>`}`);
}
function preferredInstance(reference){
  const exact=profile.instances.find(i=>i.uid===reference);if(exact)return exact;
  const active=getActiveDeck(profile);
  return active?.instanceIds.map(uid=>getInstance(profile,uid)).find(i=>i.cardId===reference)||getPreferredInstance(profile,reference);
}
function showInstance(reference){
  try{const item=preferredInstance(reference);if(!item)throw Error('這張卡暫時不在行囊。');modal(instanceMarkup(profile,item.uid,cardMarkup),'instance-modal');}
  catch(error){toast(error.message);}
}
function loadBagDeck(id){
  const slot=profile.deckSlots.find(s=>s.id===id)||getActiveDeck(profile);
  if(slot){deckDraftReady=true;bagView.editingSlotId=slot.id;bagView.draftInstanceIds=[...slot.instanceIds];bagView.deckName=slot.name;}
}
function sellInstanceModal(uid){
  try{
    const item=getInstance(profile,uid), sale=getInstanceSale(profile,uid), card=getCard(item.cardId);
    if(sale.reason)return toast(sale.reason);
    modal(`<div class="eyebrow">PASS ON A STORY</div><h2>讓這張卡，暫別行囊？</h2><p><b>${card.name}</b> · Lv.${item.level} · ${item.xp} EXP<br>卡牌編號 <span class="instance-serial">#${safe(item.uid)}</span></p><p>商旅出價 <b>${sale.sellPrice} 金幣</b>。這張卡的等級、經驗及出戰紀錄會保留；之後可付 ${sale.buybackPrice} 金幣原卡回購。</p><div class="modal-actions"><button class="secondary" data-action="close-modal">留在行囊</button><button class="primary" data-action="confirm-instance-sell" data-id="${safe(uid)}">出售這張卡 →</button></div>`);
  }catch(error){toast(error.message);}
}
function cardExperienceMarkup(){
  const changes=lastReward?.cardXP||[];
  if(!changes.length)return '';
  return `<div class="card-xp-results"><h3>同行者的歷練</h3>${changes.map(change=>`<div><span>${isMistGate()?`<button type="button" class="text-button result-card-link" data-action="result-card" data-id="${safe(change.uid)}" aria-label="查看${safe(getCard(change.cardId).name)}的同行記，編號 ${safe(change.uid)}">${getCard(change.cardId).name} <span aria-hidden="true">↗</span></button>`:getCard(change.cardId).name} <small>#${safe(change.uid)}</small></span><b>${change.afterLevel>change.beforeLevel?`Lv.${change.beforeLevel} → ${change.afterLevel} ✧`:`Lv.${change.afterLevel}`} <em>+${change.gainedXP} EXP</em></b></div>`).join('')}<p>經驗只記在今場真正出戰的那張卡。修練能力在遊歷生效。</p></div>`;
}
function resultCardModal(uid) {
  if(!recorded||match?.status!=='finished'||!lastReward?.cardXP?.some(change=>change.uid===uid))return;
  experienceReturn=captureModalReturn();
  modal(`${instanceMarkup(profile,uid,cardMarkup,{readOnly:true})}<div class="modal-actions"><button class="primary" data-action="return-result">返回此局結果 →</button></div>`,'instance-modal',true,'result-card');
}

function opponentDeck() {
  for(let n=0;n<60;n++){
    const pool=[...CARDS];
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    const ids=pool.slice(0,8).map(c=>c.id);if(validateDeck(ids).valid)return ids;
  }
  return [...defaultDeckIds];
}
function prepareRound() {
  selected=match.player.hand.find(id=>!match.player.used.includes(id));pills=0;fury=false;busy=false;revealPending=false;
  // The AI commits before any human choice on its opening turn.
  aiMove=match.initiative==='opponent'?chooseAIMove(match):null;
  persistBattle();
}
async function startMatch(kind='practice',nodeId=null) {
  if(economyBusy)return;
  if(loadProfile().pending)return pendingModal();
  economyBusy=true;
  try{
    const node=NODES.find(n=>n.id===nodeId);
    const result=await transact(p=>{
      const started=beginBattle(p,{kind,nodeId});
      const nextMatch=createMatch({deckIds:p.deck,opponentDeckIds:opponentDeck(),mode:kind,playerLevels:getDeckLevels(p),opponentLevels:Object.fromEntries(CARDS.map(c=>[c.id,kind==='expedition'?Math.min(3,node.level):1])),opponentName:node?.enemyName||'山海弈者'});
      return {...started,nextMatch};
    });
    encounter=result.encounter;match=result.nextMatch;recorded=false;lastReward=null;
    closeModal();preparation=null;preparationReturn=null;screen='battle';prepareRound();render();window.scrollTo({top:0,behavior:'instant'});announce('對局開始。選一張戰卡，再分配仙丹。');playTone('select');
  }catch(error){toast(error.message);}
  finally{economyBusy=false;}
}
function pendingModal(){
  const expected=loadProfile().pending?.id||'';
  modal(`<div class="eyebrow">A DUEL AWAITS</div><h2>還有一局，等你落子。</h2><p>已保留上次對局。繼續旅程，或放棄這局再出發；放棄不會獲得對局獎勵。</p><div class="modal-actions"><button class="secondary" data-action="discard-pending" data-encounter="${expected}">放棄未完對局</button><button class="primary" data-action="resume">繼續對局 →</button></div>`);
}
async function resumeBattle(){
  const p=loadProfile(), saved=read(BATTLE_KEY,null);
  if(!p.pending){syncProfile(p);closeModal();render();return toast('這局已結束，旅程已更新。');}
  try{
    if(saved?.encounter?.id!==p.pending.id||!saved.match?.player?.hand||!Array.isArray(saved.match.history))throw Error('對局記錄不完整，請放棄這局後重新出發。');
    for(const side of ['player','opponent']){
      const who=saved.match[side];
      if(!Array.isArray(who.hand)||who.hand.length!==4||!Array.isArray(who.used)||who.hand.some(id=>!CARDS.some(c=>c.id===id)))throw Error('對局記錄不完整，請重新出發。');
    }
    syncProfile(p);match=saved.match;encounter=p.pending;selected=saved.selected;pills=saved.pills||0;fury=!!saved.fury;aiMove=saved.aiMove;revealPending=!!saved.revealPending;recorded=false;lastReward=null;busy=revealPending;
    closeModal();screen='battle';
    if(match.status==='finished'){await recordFinishedMatch();render();return matchEndModal();}
    if(!selected)selected=match.player.hand.find(id=>!match.player.used.includes(id));
    render();if(revealPending)resultModal();announce('已返回未完對局。');
  }catch(error){pendingModal();toast(error.message);}
}
function requestNavigation(destination) {
  if(screen==='battle'&&match?.status==='playing'){
    modal(`<div class="eyebrow">LEAVE THE DUEL</div><h2>暫別此局？</h2><p>可以保留對局稍後繼續，或放棄本局。放棄不會獲得獎勵；牌組與修練進度會保留。</p><div class="modal-actions"><button class="secondary" data-action="navigate-confirm" data-id="${destination}">保留並離開</button><button class="primary" data-action="abandon-navigate" data-id="${destination}" data-encounter="${encounter.id}">放棄此局</button></div>`);
  }else navigate(destination);
}
function navigate(destination) {
  if(destination==='daily'){closeModal();questsModal();return;}
  const originScreen=screen,originScroll=modalOrigin?.scroll??window.scrollY;
  closeModal();screenScroll.set(viewKey(),originScroll);
  if(destination==='account'&&originScreen!=='account')accountReturn=originScreen==='battle'?'home':originScreen;
  screen=destination==='classics'?'collection':destination;
  if(destination==='classics'){collectionSet='classics';sourceFilter='all';filter='all';ownedOnly=false;}
  preparation=null;preparationReturn=null;
  if(screen==='bag'&&bagView.tab==='decks'&&!deckDraftReady)loadBagDeck(profile.activeDeckId);
  render();window.scrollTo({top:screenScroll.get(viewKey())||0,behavior:'instant'});
  if(screen==='account') account.init();
}
function viewKey(){return screen==='bag'?`bag-${bagView.tab}`:screen;}
function switchCardsTab(tab) {
  screenScroll.set(viewKey(),window.scrollY);
  if(tab==='codex')screen='collection';
  else{screen='bag';bagView.tab=tab==='decks'?'decks':'cards';if(bagView.tab==='decks'&&!deckDraftReady)loadBagDeck(profile.activeDeckId);}
  render();window.scrollTo({top:screenScroll.get(viewKey())||0,behavior:'instant'});
}
function updateMovePanel() {
  const panel=app.querySelector('.move-panel');
  if(panel){const focus=captureFocus(panel);panel.outerHTML=movePanel();restoreFocus(app.querySelector('.move-panel'),focus);}
}
async function commitMove() {
  if(busy||economyBusy||!match||match.status!=='playing')return;busy=true;
  try{
    if(loadProfile().pending?.id!==encounter.id)throw Error('這場對局已在另一頁結束，請返回山海。');
    const playerMove={cardId:selected,pills,fury};
    // The responding AI sees only the revealed card, never the hidden bid.
    if(!aiMove)aiMove=chooseAIMove(match,Math.random,selected);
    match=resolveRound(match,playerMove,aiMove);revealPending=true;
    persistBattle();playTone('commit');
    await recordFinishedMatch();resultModal({animate:true});
  }catch(error){busy=false;toast(error.message);}
}
async function recordFinishedMatch() {
  if(match.status!=='finished'||recorded)return;
  const settledId=encounter.id;
  const result=await transact(p=>finishBattle(p,{encounterId:settledId,winner:match.winner,playedCardIds:match.player.used}),()=>clearBattleSnapshot(settledId));
  lastReward=result.reward;recorded=true;
}
function resultModal({animate=false}={}) {
  const r=match.lastResult, won=r.winner==='player';
  const tie=r.tieReason==='stars'?'攻擊相同，低星卡獲勝。':r.tieReason==='initiative'?'攻擊、星數相同，先手獲勝。':'';
  const effectList=side=>r.notes[side].map(n=>`<p>· ${safe(n)}</p>`).join('');
  const mist=isMistGate();
  modal(`${mist?mistGateRevealMarkup({round:r.round}):`<div class="eyebrow">ROUND ${r.round} · THE CARDS ARE REVEALED</div>`}<h2>${won?'此局，你勝。':'此局，暫退。'}</h2>
    <div class="duel-cards"><div>${cardMarkup(r.player.card)}<div class="duel-stat ${won?'won':''}">你 · ${r.player.pills} 丹${r.player.fury?' ＋ 怒擊':''}<br>實際攻擊 <strong>${r.player.attack}</strong></div></div><div class="duel-vs">vs.</div><div>${cardMarkup(r.opponent.card)}<div class="duel-stat ${!won?'won':''}">對手 · ${r.opponent.pills} 丹${r.opponent.fury?' ＋ 怒擊':''}<br>實際攻擊 <strong>${r.opponent.attack}</strong></div></div></div>
    <div class="resolution">${tie}${won?'對手':'你'}受到 <strong>${r.damage}</strong> 點傷害。<br>當前生命：你 <strong>${match.player.hp}</strong> · 對手 <strong>${match.opponent.hp}</strong>　｜　剩餘仙丹：你 ${match.player.pills} · 對手 ${match.opponent.pills}</div>
    <div class="result-effects"><div><h4>你的技能與共鳴</h4>${effectList('player')}</div><div><h4>對手的技能與共鳴</h4>${effectList('opponent')}</div></div>
    <div class="modal-actions"><button class="primary" data-action="next-round">${match.status==='finished'?'查看對局結果':'繼續 · 下一回合'} <span>→</span></button></div>${mist?'<div class="mist-reveal-controls"><button class="text-button" data-action="skip-reveal">直接看結果</button><button class="text-button" data-action="experience-settings">聲息與節奏</button></div>':''}`,`result-modal${mist?' mist-reveal':''}`,false,'round-result');
  if(mist)experience.reveal(overlay.querySelector('.mist-reveal'),{animate});
  announce(`第 ${r.round} 回合，${won?'你':'對手'}獲勝，造成 ${r.damage} 點傷害。`);
}
function matchEndModal({celebrate=false}={}) {
  const win=match.winner==='player', draw=match.winner==='draw';
  const next=nextEncounterIntent();
  const nextLabel=encounter?.kind==='expedition'?(next.nodeId!==encounter.nodeId?'前往下一境':win?'重遊此境':'再戰此境'):'再弈一局';
  if(celebrate)playTone(draw?'draw':win?'win':'lose');
  modal(`<div class="eyebrow">THE DUEL IS COMPLETE</div><div class="match-symbol">${draw?'和':win?'勝':'悟'}</div><h2>${draw?'山海之間，不分高下。':win?'此局山海，盡入你手。':'一局有盡，弈道無窮。'}</h2><p>${draw?'棋逢對手，何妨再弈。':win?'藏鋒有時，出手有度。這一場，是你的傳說。':'記住對手的出丹節奏，下一次，換你掌握勝負。'}</p><div class="match-score"><div><span>你的生命</span><br><strong>${match.player.hp}</strong></div><span>—</span><div><span>對手生命</span><br><strong>${match.opponent.hp}</strong></div></div>${lastReward?`<div class="earned-rewards"><span>${lastReward.firstClear?'首次踏破 · ':''}${lastReward.dailyCache?'今日秘藏 · ':''}旅程已儲存</span><p>${rewardText(lastReward)}</p>${cardExperienceMarkup()}</div>`:''}${historyMarkup()}${isMistGate()?mistGateResultMarkup({outcome:match.winner,firstClear:!!lastReward?.firstClear,nextName:NODES.find(n=>n.id===next.nodeId)?.name||''}):''}<div class="modal-actions match-next"><button class="secondary" data-action="result-deck">調整牌組</button><button class="primary" data-action="next-encounter">${nextLabel} <span>↗</span></button></div><div class="match-return"><button class="text-button" data-action="end-home">返回洞府</button><button class="text-button" data-action="${encounter?.kind==='expedition'?'world':'arena'}">${encounter?.kind==='expedition'?'查看山海圖':'返回對弈'}</button>${isMistGate()?'<button class="text-button" data-action="experience-settings">聲息與節奏</button>':''}</div>`,`result-modal${isMistGate()?' mist-complete':''}`,false,'match-result');
}
function historyMarkup() {
  return `<div class="round-history">${match.history.map(r=>`<div class="history-row"><span>第 ${r.round} 局</span><span>${r.player.card.name} ${r.player.attack} : ${r.opponent.attack} ${r.opponent.card.name}</span><strong>${r.winner==='player'?'你':'對手'}勝 · ${r.damage} 傷</strong></div>`).join('')}</div>`;
}

function roundHoldMarkup(){
  return `<main class="adventure-page"><div class="page-lead"><div class="eyebrow">${modeName(encounter?.kind)}</div><h1>${match.status==='finished'?'此局已定，來路可期。':'雙方落子，勝負揭曉。'}</h1><p>你的生命 ${match.player.hp} · 對手生命 ${match.opponent.hp}</p></div>${historyMarkup()}<button class="primary" data-action="show-result">查看對局結果 →</button></main>`;
}

document.addEventListener('click', event=>{
  const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
  const {action,id}=button.dataset;
  experience.unlockAudio().catch(()=>{});
  if(action==='experience-settings')return experienceSettingsModal();
  if(action==='skip-reveal')return experience.finishReveal();
  if(action==='result-card')return resultCardModal(id);
  if(action==='return-result')return dismissModal();
  if(action==='account-open')return requestNavigation('account');
  if(action==='account-back')return navigate(accountReturn);
  if(action==='quests')return questsModal();
  if(action==='cards-tab')return switchCardsTab(id);
  if(action==='bag'&&preparationReturn){closeModal();return switchCardsTab(bagView.tab);}
  if(action==='continue-journey'){
    if(loadProfile().pending)return resumeBattle();
    selectedNode=nextJourneyNode().id;navigate('world');return prepareEncounter('expedition',selectedNode);
  }
  if(action==='lobby-deck'){navigate('bag');return switchCardsTab('decks');}
  if(action==='world-deck'){prepareEncounter('expedition',selectedNode);if(modalKind==='preparation')openPreparationDeck();return;}
  if(action==='prep-deck')return openPreparationDeck();
  if(action==='return-prep')return returnToPreparation();
  if(action==='confirm-start'){if(preparation)return startMatch(preparation.kind,preparation.nodeId);return;}
  if(action==='next-encounter')return prepareNextEncounter();
  if(action==='result-deck')return prepareNextEncounter({editDeck:true});
  if(action==='battle-menu')return requestNavigation('home');
  if(action==='quest-go')return requestNavigation(id);
  if(['home','collection','world','daily','market','arena','classics','bag','account'].includes(action))return requestNavigation(action);
  const accountActions = {
    'account-retry': () => account.init(),
    'account-refresh': () => account.refreshCloud(),
    'account-upload': () => account.upload(),
    'account-confirm-restore': () => account.setConfirmation('restore'),
    'account-confirm-delete': () => account.setConfirmation('delete'),
    'account-cancel-confirmation': () => account.cancelConfirmation(),
    'account-restore': () => account.restore(),
    'account-delete': () => account.deleteBackup(),
    'account-change-email': () => account.changeEmail(),
    'account-logout': async () => { await account.logout(); accountChannel?.postMessage({type:'session-changed'}); },
  };
  if(accountActions[action]) { Promise.resolve(accountActions[action]()).catch(error=>toast(error.message)); return; }
  if(action==='export-recovery'){
    const saved=read(RECOVERY_KEY,null);if(!saved?.snapshot)return toast('未有本機回復備份。');
    const url=URL.createObjectURL(new Blob([JSON.stringify(saved.snapshot.profile,null,2)],{type:'application/json'})),link=document.createElement('a');
    link.href=url;link.download='萬象契旅程-本機回復備份.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
  }
  if(action==='restore-recovery'){
    if(profile.pending||economyBusy)return toast('請先完成或放棄未完對局。');
    const saved=read(RECOVERY_KEY,null);if(!saved?.snapshot)return toast('未有本機回復備份。');
    recoveryDraft={snapshot:saved.snapshot,savedAt:saved.savedAt,fingerprint:fingerprintProfile(loadProfile())};
    modal('<div class="eyebrow">RETURN TO YOUR JOURNEY</div><h2>復原上次本機旅程？</h2><p>這會取代此裝置的進度；雲端備份不會改變。現在的本機旅程會成為下一份回復備份。</p><div class="modal-actions"><button class="secondary" data-action="close-modal">保留現在進度</button><button class="primary" data-action="confirm-restore-recovery">復原本機旅程</button></div>');return;
  }
  if(action==='confirm-restore-recovery'){
    const saved=read(RECOVERY_KEY,null),draft=recoveryDraft;
    if(!draft||saved?.savedAt!==draft.savedAt)return toast('回復備份已更新，請重新查看。');
    recoveryDraft=null;
    restoreLocalProfile(draft.snapshot,draft.fingerprint).then(()=>{closeModal();account.markLocalChanged();render();toast('已復原上次本機旅程。');}).catch(error=>toast(error.message));return;
  }
  if(action==='bag-tab')return switchCardsTab(id);
  if(action==='bag-card'){closeModal();switchCardsTab('cards');bagView.query=getCard(id).name;bagView.filter='all';bagView.faction='all';render();window.scrollTo({top:0,behavior:'instant'});return;}
  if(action==='instance-inspect')return showInstance(id);
  if(action==='instance-lock')return economy(p=>toggleInstanceLock(p,id),'卡牌保護設定已更新。',()=>{if(overlay.firstElementChild)showInstance(id);});
  if(action==='instance-sell')return sellInstanceModal(id);
  if(action==='confirm-instance-sell')return economy(p=>sellInstance(p,id),'這張卡已交予商旅，歷練與編號一同保留。',()=>closeModal());
  if(action==='buyback-instance')return economy(p=>buybackInstance(p,id),'原卡已回到行囊，等級與 EXP 保留。');
  if(action==='bag-edit-deck'){bagView.tab='decks';loadBagDeck(id);render();return;}
  if(action==='bag-new-deck'){
    const next=['deck-1','deck-2','deck-3'].find(id=>!profile.deckSlots.some(slot=>slot.id===id));
    if(!next)return toast('三個牌組欄已齊備，可編輯現有牌組。');
    deckDraftReady=true;bagView={...bagView,tab:'decks',editingSlotId:next,draftInstanceIds:[],deckName:`旅途牌組 ${next.at(-1)}`};render();return;
  }
  if(action==='bag-pick-instance'){
    const instance=profile.instances.find(item=>item.uid===id);
    const ids=bagView.draftInstanceIds.filter(uid=>profile.instances.some(item=>item.uid===uid));
    bagView.draftInstanceIds=ids;
    if(!instance){render();return toast('這張卡已離開行囊，草稿已更新。');}
    if(ids.includes(id))bagView.draftInstanceIds=ids.filter(uid=>uid!==id);
    else{
      const same=ids.find(uid=>profile.instances.find(item=>item.uid===uid)?.cardId===instance.cardId);
      if(same)bagView.draftInstanceIds=ids.map(uid=>uid===same?id:uid);
      else if(ids.length<8)bagView.draftInstanceIds=[...ids,id];
      else return toast('牌組已滿八張，先移除一張再加入。');
    }
    render();playTone('select');return;
  }
  if(action==='bag-save-deck')return economy(p=>saveInstanceDeck(p,{slotId:bagView.editingSlotId,name:bagView.deckName,instanceIds:bagView.draftInstanceIds}),'牌組已儲存。每個位置都記住了你選的那張卡。',()=>{loadBagDeck(bagView.editingSlotId);render();});
  if(action==='bag-activate-deck')return economy(p=>activateDeck(p,id),'出戰牌組已切換；未完對局會繼續使用原本戰卡。');
  if(action==='bag-delete-deck'){
    modal(`<div class="eyebrow">DECK ARCHIVE</div><h2>收起這副牌組？</h2><p>只移除牌組配置，行囊中的卡牌及歷練會保留。</p><div class="modal-actions"><button class="secondary" data-action="close-modal">保留</button><button class="primary" data-action="confirm-delete-deck" data-id="${id}">收起牌組</button></div>`);return;
  }
  if(action==='confirm-delete-deck')return economy(p=>deleteDeck(p,id),'牌組已收起，所有卡牌仍在行囊。',()=>{closeModal();loadBagDeck(profile.activeDeckId);render();});
  if(action==='collection-set'){collectionSet=id;sourceFilter='all';render();return;}
  if(action==='bag-classics-deck'){
    const instances=classicsDeck.map(id=>preferredInstance(id));
    if(instances.some(i=>!i))return toast('群英初陣需要悟空、關羽、黛玉、孔子與四位山海同伴。');
    bagView.draftInstanceIds=instances.map(i=>i.uid);deckDraftReady=true;render();toast('群英初陣已備妥：四族共鳴，合共 24 星。儲存後即可出戰。');return;
  }
  if(action==='pack-set'){selectedPack=id;render();return;}
  if(action==='map-select'){selectedNode=id;render();return;}
  if(action==='travel')return prepareEncounter('expedition',id);
  if(action==='ranked')return prepareEncounter('arena');
  if(action==='resume')return resumeBattle();
  if(action==='discard-pending'||action==='abandon-navigate'){
    const expected=button.dataset.encounter;
    return economy(p=>{if(!expected||p.pending?.id!==expected)throw Error('這局已在另一頁改變，請關閉對話框再繼續。');return abandonBattle(p);},'已放下此局，隨時可以再出發。',()=>{match=null;encounter=null;navigate(id||'home');},()=>clearBattleSnapshot(expected));
  }
  if(action==='claim-login')return economy(p=>claimLogin(p),'朝露之贈已收入行囊。');
  if(action==='claim-task')return economy(p=>claimTask(p,id),'日課已成，獎勵已收入行囊。');
  if(action==='arena-chest')return economy(p=>claimArenaChest(p),'三戰之約已成，寶箱已開啟。');
  if(action==='daily-train')return economy(p=>trainCard(p,id),'這張卡的修練提升了！');
  if(action==='upgrade'){const instance=preferredInstance(id);if(instance)showInstance(instance.uid);return;}
  if(action==='upgrade-card'||action==='instance-upgrade')return economy(p=>upgradeCard(p,id),'此卡修練完成，另一張副本的等級不變。',()=>showInstance(id));
  if(action==='buy-card')return economy(p=>buyCard(p,id),`已購入一張${getCard(id).name}。`);
  if(action==='sell-card'){navigate('bag');bagView.query=getCard(id).name;render();return;}
  if(action==='buy-pack'){const packSet=button.dataset.set||selectedPack;return economy(p=>buyPack(p,{set:packSet}),'',result=>{
    modal(`<div class="eyebrow">${PACK_SETS[result.set].name} · THREE FATES</div><h2>三份緣，已入藏。</h2><p>卡牌已加入收藏。多出的卡可到商旅市集出售。</p><div class="pack-reveal">${result.cards.map(({cardId,rarity,instanceId})=>`<div class="pack-result" style="--rarity:${RARITIES[rarity].color}">${cardMarkup(getCard(cardId))}<span class="rarity-label">${RARITIES[rarity].name}</span><p>${getCard(cardId).name} · Lv.1<br><span class="instance-serial">#${safe(instanceId)}</span></p></div>`).join('')}</div><div class="modal-actions"><button class="secondary" data-action="close-modal">收入行囊 ✓</button><button class="primary" data-action="buy-pack" data-set="${result.set}" ${profile.coins<PACK_PRICE?'disabled':''}>再開一匣 · ${PACK_PRICE} 金幣</button></div>`,'pack-modal');
  });}
  if(action==='export-save'){
    const blob=new Blob([JSON.stringify(loadProfile(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`萬象契旅程-${profile.daily.date}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('旅程備份已匯出。');return;
  }
  if(action==='navigate-confirm'){try{persistBattle();navigate(id);}catch(error){toast(error.message);}return;}
  if(action==='rules')return rulesModal();
  if(action==='close-modal')return dismissModal();
  if(action==='start'||action==='rules-start')return prepareEncounter();
  if(action==='end-home')return navigate('home');
  if(action==='inspect')return detailModal(id,button.dataset.side||'player');
  if(action==='show-result')return match.status==='finished'?matchEndModal():resultModal();
  if(action==='sound'){experience.setPreferences({sound:!sound});experience.unlockAudio().then(()=>playTone('select'));return;}
  if(action==='select'){
    if(busy||match.player.used.includes(id))return;selected=id;playTone('select');
    app.querySelectorAll('.player-hand .card').forEach(el=>{const active=el.dataset.id===id;el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active));});
    const detail=app.querySelector('.hand-caption [data-action="inspect"]');detail.dataset.id=id;detail.textContent=`查看「${getCard(id).name}」詳情 ↗`;
    updateMovePanel();announce(`已選擇 ${getCard(id).name}。`);return;
  }
  if(action==='pill-minus'||action==='pill-plus'){
    const max=match.player.pills-(fury?3:0);pills=Math.max(0,Math.min(max,pills+(action==='pill-plus'?1:-1)));updateMovePanel();playTone('pill');return;
  }
  if(action==='fury'){fury=!fury;pills=Math.min(pills,match.player.pills-(fury?3:0));updateMovePanel();playTone('select');return;}
  if(action==='commit')return commitMove();
  if(action==='next-round'){
    if(match.status==='finished')return matchEndModal({celebrate:true});closeModal();prepareRound();render();announce(`第 ${match.round} 回合開始。`);return;
  }
  if(action==='history'){modal(`<div class="eyebrow">THE STORY SO FAR</div><h2>對弈紀錄</h2>${match.history.length?historyMarkup():'<p>勝負未定，故事才剛開始。</p>'}`);return;}
  if(action==='filter'){filter=id;render();return;}

});
document.addEventListener('change',event=>{
  if(event.target.id==='experience-sound'){
    experience.setPreferences({sound:event.target.checked});experience.unlockAudio().then(()=>playTone('select'));return;
  }
  if(event.target.id==='experience-motion'||event.target.id==='experience-pace'){
    experience.setPreferences({[event.target.id==='experience-motion'?'motion':'pace']:event.target.value});return;
  }
  const bagField={'bag-sort':'sort','bag-filter':'filter','bag-faction':'faction'}[event.target.id];
  if(bagField){bagView[bagField]=event.target.value;render();return;}

  if(event.target.id==='training-select'){trainingId=event.target.value;render();}
  if(event.target.id==='source-filter'){sourceFilter=event.target.value;render();}
  if(event.target.id==='owned-only'){ownedOnly=event.target.checked;render();}
});
window.addEventListener('pagehide',()=>{if(match?.status==='playing')try{persistBattle();}catch{}});
window.addEventListener('storage',event=>{if(event.key===PROFILE_KEY){syncProfile(loadProfile());account.markLocalChanged();render();}});
document.addEventListener('visibilitychange',()=>{document.body.dataset.pageHidden=String(document.hidden);if(!document.hidden){syncProfile(loadProfile());render();}});
setInterval(()=>{const next=refreshDaily(profile);if(next.daily.date!==profile.daily.date){syncProfile(loadProfile());render();announce('新一天的功課與商旅貨架已更新。');}},30000);
document.addEventListener('input',event=>{
  if(event.target.id==='experience-ambience'||event.target.id==='experience-effects'){
    const name=event.target.id==='experience-ambience'?'ambience':'effects';
    experience.setPreferences({[name]:Number(event.target.value)});
    document.getElementById(`${event.target.id}-value`).textContent=`${Math.round(experience.getPreferences()[name]*100)}%`;return;
  }
  if(event.target.closest('[data-account-form]')){
    account.setDraft(event.target.name,event.target.value);return;
  }
  if(event.target.id==='bag-search'){
    const cursor=event.target.selectionStart;bagView.query=event.target.value;render();const input=document.querySelector('#bag-search');input?.setSelectionRange(cursor,cursor);return;
  }
  if(event.target.id==='bag-deck-name'){bagView.deckName=event.target.value;return;}

  if(event.target.id!=='pill-slider')return;
  pills=Number(event.target.value);const max=match.player.pills-(fury?3:0);
  const preview=previewMove(match,'player',{cardId:selected,pills,fury});
  app.querySelector('#pill-amount').textContent=pills;app.querySelector('#attack-value').textContent=preview.attack;
  app.querySelector('#cost-note').textContent=`共消耗 ${preview.cost} 丹，出牌後剩 ${match.player.pills-preview.cost} 丹。`;
  app.querySelector('[data-action="pill-minus"]').disabled=pills===0;app.querySelector('[data-action="pill-plus"]').disabled=pills===max;
  if(isMistGate()){
    const offering=app.querySelector('.mist-offering');
    if(offering)offering.outerHTML=mistGatePillsMarkup({pills,fury,remaining:match.player.pills-preview.cost});
  }
  experience.unlockAudio().then(()=>playTone('pill'));
});
document.addEventListener('submit',event=>{
  const kind=event.target.dataset.accountForm;if(!kind)return;
  event.preventDefault();
  const fields=new FormData(event.target);
  const action=kind==='email'?account.requestCode(String(fields.get('email')||'')):account.verifyCode(String(fields.get('token')||''));
  Promise.resolve(action).then(()=>{if(kind==='verify'&&account.getState().account)accountChannel?.postMessage({type:'session-changed'});}).catch(error=>toast(error.message));
});
overlay.addEventListener('click',event=>{if(event.target.classList.contains('modal-backdrop')&&event.target.dataset.dismissible==='true')dismissModal();});
document.addEventListener('keydown',event=>{
  const active=overlay.querySelector('.modal');if(!active)return;
  if(event.key==='Escape'&&overlay.firstElementChild.dataset.dismissible==='true')dismissModal();
  if(event.key==='Tab'){
    const nodes=[...active.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length&&!el.hidden&&getComputedStyle(el).visibility!=='hidden');const first=nodes[0],last=nodes.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
});
try{await transact(p=>p,()=>{
  const legacy=read(LEGACY_BATTLE_KEY,null);
  if(!localStorage.getItem(BATTLE_KEY)&&profile.pending&&legacy?.encounter?.id===profile.pending.id)localStorage.setItem(BATTLE_KEY,JSON.stringify(legacy));
});}catch{setTimeout(()=>toast('瀏覽器儲存不可用，請啟用儲存後再開始旅程。'),300);}
render();
