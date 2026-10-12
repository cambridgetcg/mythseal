import { CARDS, LEGACY_CARDS, FACTIONS, RULES, defaultDeckIds, getCard, validateDeck, createMatch, chooseAIMove, previewMove, resolveRound, hasFactionBonus, getBattleCard } from './engine.mjs';

import { PROFILE_KEY, NODES, RARITIES, CARD_RARITIES, PACK_PRICE, PACK_SETS, refreshDaily, claimLogin, claimTask, claimWeeklyTask, buyPack, buyCard, sellInstance, buybackInstance, getInstanceSale, trainCard, beginBattle, finishBattle, abandonBattle, claimArenaChest, isNodeUnlocked } from './progression.mjs';
import { activityMarkup, activitySupplyMarkup, expansionRewardsMarkup } from './expansion-ui.mjs';
import { startActivity, advanceActivity, abandonActivity, getPendingBattleOptions, claimExpansionGrant, openWX01Ticket } from './progression.mjs';
import { WORLDS, getWorldForNode, nextNodeInWorld } from './stories.mjs';
import { getInstance, getPreferredInstance, getActiveDeck, getDeckLevels, toggleInstanceLock, saveInstanceDeck, activateDeck, deleteDeck, validateInstanceDeck } from './collection.mjs';
import { backpackMarkup, instanceMarkup } from './backpack-ui.mjs';
import { isCharacterCollected } from './collection-display.mjs';
import { codexMarkup } from './codex-ui.mjs';
import { getInheritanceMaterials, previewInheritance, inheritInstances } from './inheritance.mjs';
import { inheritanceMarkup, inheritanceConfirmMarkup, inheritanceResultMarkup } from './inheritance-ui.mjs';
import { worldMarkup, dailyMarkup, marketMarkup, arenaMarkup, rewardText } from './adventure-ui.mjs';
import { gameHeaderMarkup, gameDockMarkup, lobbyMarkup } from './navigation-ui.mjs';
import { mistGateArrivalMarkup, mistGateBattleMarkup, mistGateResonanceMarkup, mistGateResultMarkup, mistGateRevealMarkup } from './mist-gate-ui.mjs';
import { createExperienceController } from './experience.mjs';
import { battleResourcesMarkup, battleClashMarkup, battleTableMarkup, battleConfrontationMarkup, battleLineupMarkup, revealPairMarkup } from './battle-ui.mjs';
import { createRoundPresentation, paintRoundResources, permittedAnnouncement, createPlanningView, createRevealView } from './battle-presentation.mjs';
import { createAccountController } from './account-client.mjs';
import { accountMarkup, accountButtonMarkup } from './account-ui.mjs';
import { restoreSnapshot, fingerprintProfile } from './cloud-save.mjs';
import { createProfileStore, BATTLE_KEY, RECOVERY_KEY, PROFILE_LOCK } from './profile-store.mjs';
import { previewCommand, commitCommand, readCommandReceipt, duplicateMessage, COMMAND_MESSAGES } from './local-commands.mjs';
import { createFencedLock, createIndexedDBFence } from './profile-fence.mjs';
import { commandLedgerJSON, assertLedgerUnchanged } from './command-ledger.mjs';
import { exportJourney, importJourney, journeySummary, isStandalone } from './platform.mjs';
import { createSaveStatus } from './save-status.mjs';
import { saveToolsMarkup, saveNoticeMarkup, importPickMarkup, importConfirmMarkup } from './save-ui.mjs';
import { cardPresentation, printFrameMarkup, printLabel } from './card-presentation.mjs';
import { WX01_PRINTINGS } from './printing-catalogue.mjs';
import { wx01OddsMarkup, wx01RedeemMarkup, packReceiptMarkup } from './pack-ui.mjs';
import { createPackOpeningController } from './pack-opening.mjs';
import { createMapTravel } from './map-piece.mjs';
import { createViewportController } from './viewport.mjs';
import { prepareScene, preparePack } from './scene-adapters.mjs';
import { prepareDialog } from './scene-dialogs.mjs';
import { buyWX01Box, acknowledgeWX01Receipt, redeemWX01Print, claimWX01StoryPrint, setLeaderInstance } from './progression.mjs';
import { BACK, createNavHistory, navLayers, navSignature, backDecision } from './nav-stack.mjs';

const app = document.querySelector('#app');
const overlay = document.querySelector('#overlay-root');
const announcer = document.querySelector('#announcer');
const viewport = createViewportController({document,window,announce});
const safe = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const profileStore=createProfileStore({storage:localStorage});
const loadProfile=()=>profileStore.load();
// Device-local backup status, persistence outcome and prompts; never inside the journey or a
// backup (docs/LOCAL-COMMANDS.md §11). load() starts a new journey only when none is stored,
// and only then does the lobby offer a restore.
const saves=createSaveStatus({storage:localStorage});
const freshJourney=!profileStore.hasJourney();
// localStorage is only eventually consistent between tabs, even for the next holder of the
// Web Lock. Each holder waits for the bytes the previous holder recorded in the IndexedDB
// fence (docs/LOCAL-COMMANDS.md §10.1). Read at call time so a browser that loses Web Locks
// refuses instead of throwing.
const profileFence=createIndexedDBFence((()=>{try{return globalThis.indexedDB;}catch{return null;}})(),{key:PROFILE_KEY});
const fencedLock=strict=>navigator.locks?createFencedLock({request:fn=>navigator.locks.request(PROFILE_LOCK,fn),fence:profileFence,read:()=>localStorage.getItem(PROFILE_KEY),strict}):null;
// Adapter commands require the lock and a fence proving the bytes are current; no unlocked path.
// Restore holds it strictly too (§11): it retires the ledger and keeps a recovery copy of the
// journey it replaces, so it decides on the latest bytes or refuses.
const profileLock=()=>fencedLock(true);
// Every other writer under PROFILE_LOCK: waits briefly, then proceeds as before; its write heals the fence.
const writerLock=()=>fencedLock(false);
let profile=loadProfile(), startupReady=false;
let collectionSet='all', sourceFilter='all', codexStatus='all', selectedPack='wx01', codexDetailId=null;
const classicsDeck=['kongzi','qingxiao','wukong','guanyu','lindaiyu','shuangli','cangjiao','cuixian'];
let deckDraftReady=false;
let screen='home', filter='all', selectedNode=profile.location||NODES[0].id, trainingId=getActiveDeck(profile)?.instanceIds[0]||null;
let questTab='daily', activityRoute='owned';
const worldSelections=new Map(), worldScrollPositions=new Map(), worldPieces=new Map();
let mapTravel=null;
let bagView={tab:'cards',layout:'groups',expandedCardId:null,printId:'all',query:'',filter:'all',faction:'all',sort:'recent',editingSlotId:profile.activeDeckId,draftInstanceIds:[],deckName:''},bagGroupReturn=null;
let match=null, encounter=null, selected=null, pills=0, fury=false, aiMove=null, busy=false, recorded=false, revealPending=false, lastReward=null;
let lastRoundPresentation=null, battleEntering=false;
let sound=false, toastTimer, lastFocus=null, economyBusy=false;
let experience, experienceReturn=null, packOpening=null;
experience=createExperienceController({storage:{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)},document,window,onPreferencesChange:applyExperiencePreferences});
applyExperiencePreferences(experience.getPreferences());
let recoveryDraft=null;
// The care.upgrade request captured when the card page was painted; a click commits exactly this.
let passportQuote=null;
let inheritanceView=null;
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
const modeName=kind=>({practice:'自由切磋',expedition:'主線遊歷',arena:'問道擂台',activity:'火焰山三連戰'}[kind]||'山海對弈');
const isMistGate=(intent=encounter)=>intent?.kind==='expedition'&&intent.nodeId==='mist-gate';
function applyExperiencePreferences(preferences) {
  sound=preferences.sound;
  document.body.dataset.motion=experience?.reducedMotion()?'reduce':'full';
  document.body.dataset.pageHidden=String(document.hidden);
  packOpening?.syncPreferences();
  mapTravel?.syncPreferences();
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
    const loaded=loadProfile(), ledger=commandLedgerJSON(loaded);
    const result=change(loaded), next=result.profile||result;
    // Only commitCommand and restore may change the command ledger.
    assertLedgerUnchanged(ledger,next);
    profileStore.save(next);
    syncProfile(next);account.markLocalChanged();if(onSaved)onSaved(result);return result;
  };
  // Without Web Locks this fallback is same tab only; not cross-tab serialization.
  // It keeps today's unwrapped single actions working. Adapter commands, and any new
  // batch/queue operation, go through commitCommand, which refuses without the lock.
  const lock=writerLock();
  return lock ? lock(apply) : apply();
}
async function restoreLocalProfile(snapshot, expectedFingerprint, { isCurrent = () => true } = {}) {
  const restored = restoreSnapshot(snapshot);
  // Strict: a tab still behind another tab's commit would retire the ledger below a quote
  // minted after it, and replace a journey that no recovery copy holds.
  const lock = profileLock();
  if (!lock) throw Error('請用新版瀏覽器恢復旅程；本機進度未有更改。');
  return lock(() => {
    // Cloud restore, local recovery and file import share this: it loads the latest journey,
    // refuses an unfinished battle, an unacknowledged WX receipt or a changed journey, checks
    // the replacement (with the replaced lineage's retired command boundary), then keeps a
    // validated recovery copy of the current journey and saves; a refusal changes neither.
    const next = profileStore.restore(restored, { expectedFingerprint, busy: economyBusy, isCurrent, savedAt: new Date().toISOString() });
    saves.closeRestoreOffer();
    packOpening?.destroy();packOpening=null;
    localStorage.removeItem(BATTLE_KEY);
    syncProfile(next);passportQuote=null;
    match=null;encounter=null;selected=null;busy=false;recorded=false;revealPending=false;lastReward=null;lastRoundPresentation=null;battleEntering=false;
    deckDraftReady=false;selectedNode=profile.location||NODES[0].id;
    preparation=null;preparationReturn=null;screenScroll.clear();worldSelections.clear();worldScrollPositions.clear();worldPieces.clear();questTab='daily';
    trainingId=getActiveDeck(profile)?.instanceIds[0]||null;
    bagView={tab:'cards',layout:'groups',expandedCardId:null,printId:'all',query:'',filter:'all',faction:'all',sort:'recent',editingSlotId:profile.activeDeckId,draftInstanceIds:[],deckName:''};bagGroupReturn=null;
    return next;
  });
}
function recoveryMarkup() {
  const saved = read(RECOVERY_KEY, null);
  if (!saved?.snapshot) return '';
  return `<aside class="account-recovery"><p>上次恢復前的本機旅程已保留。你可以下載副本，或復原到當時進度。</p><button class="text-button" data-action="export-recovery">下載本機回復備份 ↗</button><button class="text-button" data-action="restore-recovery">復原上次本機旅程 →</button></aside>`;
}
// Save safety (docs/LOCAL-COMMANDS.md §11): export, file import through restoreLocalProfile,
// and the lobby's restore offer and once-only backup prompts.
let saveNotice=null, importDraft=null, importInput=null;
function lobbySaveNotice() {
  // The resume strip for a WX receipt or an activity has this place first.
  if(profile.wx01.receipt||profile.expansion.fireMountain.run)return '';
  // The lobby makes no account request: it knows only what 旅程閣 looked up in this page.
  const known=account.getState();
  if(saves.showRestoreOffer(profile))return saveNoticeMarkup('restore-offer',{cloud:Boolean(known.account)||!known.initialized||known.emailEnabled});
  saveNotice??=saves.takePrompt({guest:!known.account});
  return saveNoticeMarkup(saveNotice,{wins:profile.stats.won});
}
// A cloud backup the account API confirmed saved: the last backup, and the prompt's end.
function backupMade() {
  saves.recordBackup();saveNotice=null;
  if(['account','home'].includes(screen))render();
}
// A cloud backup the account API confirmed deleted: 上次備份 says so, and no longer counts.
function backupDeleted() {
  saves.recordBackupDeleted();
  if(screen==='account')render();
}
// The page cannot tell whether the browser saved the file (a cancelled or blocked download
// looks the same), so an export is recorded as started, never as a backup: it neither ends
// nor skips a prompt. Only a file that would import is recorded.
function exportSave() {
  try {
    const result=exportJourney(loadProfile(),{document});
    if(result.importable){saves.recordExport();if(screen==='account')render();}
    toast(result.importable?'已開始下載旅程備份；請確認檔案已儲存。':'已開始下載旅程備份；對局或活動未完時的備份未能還原，完成後請再匯出一次。');
  } catch(error) { toast(error.message||'未能匯出旅程備份。'); }
}
function importBlocked(current) {
  if(economyBusy||current.pending||current.expansion.fireMountain.run)return '請先完成或放棄未完對局，再匯入旅程備份；本機旅程未有更改。';
  if(current.wx01.receipt)return '請先查看並確認已入藏的西行畫作，再匯入旅程備份。';
  return '';
}
// The import dialog is one Back layer (docs/NAVIGATION.md, "Back model"): ×, Escape, the
// backdrop and Back close it; its own closes go through closeModal, which walks back over its entry.
const importOpen=()=>modalKind==='import-review'&&Boolean(overlay.firstElementChild);
function pickJourneyFile() {
  if(importDraft?.restoring)return;
  try{const blocked=importBlocked(loadProfile());if(blocked)return toast(blocked);}catch(error){return toast(error.message);}
  // One input outside #app, so a render while the picker is open cannot detach it.
  if(!importInput){
    importInput=document.createElement('input');
    Object.assign(importInput,{type:'file',accept:'.json,application/json',id:'journey-import-file',className:'sr-only',tabIndex:-1});
    importInput.setAttribute('aria-hidden','true');
    importInput.addEventListener('change',()=>{const file=importInput.files?.[0];importInput.value='';if(file)reviewImport(file);});
    // A cancelled picker closes the dialog where the browser says so; elsewhere it stays, with 取消.
    importInput.addEventListener('cancel',()=>{if(importOpen()&&overlay.querySelector('[data-import-pick]'))closeModal();});
    document.body.append(importInput);
  }
  // The dialog opens on this tap, so its history entry is pushed with the tap's activation
  // (about 5 s). Choosing a file usually takes longer, and an entry the confirmation pushed
  // then would be refused, so Back would leave the game instead of closing it. The file
  // replaces the dialog's contents: the same layer, on the same entry. The entry is pushed
  // now, not on the queued reconciliation: Chromium's file picker consumes the activation.
  modal(importPickMarkup(),'import-modal',true,'import-review');
  nav.sync();
  importInput.click();
}
async function reviewImport(file) {
  const result=await importJourney(file);
  // Closed meanwhile (×, Escape, Back): the file opens nothing.
  if(!importOpen()||importDraft?.restoring)return;
  const refuse=message=>{closeModal();toast(message);};
  if(!result.ok)return refuse(result.message);
  let current;
  try{current=loadProfile();}catch(error){return refuse(error.message);}
  const blocked=importBlocked(current);if(blocked)return refuse(blocked);
  // Nothing is written until the confirmation; it restores only this journey, unchanged.
  importDraft={snapshot:result.snapshot,fingerprint:fingerprintProfile(current)};
  const kept=read(RECOVERY_KEY,null);
  modal(importConfirmMarkup({current:journeySummary(current),backup:result.summary,fileName:file.name,recovery:kept?.snapshot?{savedAt:kept.savedAt}:null,legacy:result.legacy}),'import-modal',true,'import-review');
}
// While a confirmed import is written its dialog cannot be dismissed: ×, Escape and the
// backdrop are off and Back holds (BACK.HOLD re-arms its entry), since closing it could not
// stop the restore, only hide its outcome. A refusal releases it as it was.
function holdImport(held) {
  if(!importOpen())return;
  const backdrop=overlay.firstElementChild,dialog=backdrop.querySelector('.modal');
  backdrop.dataset.dismissible=String(!held);
  dialog.setAttribute('aria-busy',String(held));
  dialog.querySelector('.modal-close')?.toggleAttribute('hidden',held);
  for(const button of dialog.querySelectorAll('.modal-close,.modal-actions button'))button.disabled=held;
  if(held){dialog.tabIndex=-1;dialog.focus({preventScroll:true});}
  else dialog.querySelector('[data-action="import-confirm"]')?.focus({preventScroll:true});
}
function confirmImport() {
  const draft=importDraft;
  if(!draft||draft.restoring)return;
  draft.restoring=true;holdImport(true);
  restoreLocalProfile(draft.snapshot,draft.fingerprint).then(()=>{if(importDraft===draft)importDraft=null;saveNotice=null;closeModal();account.markLocalChanged();render();toast('已由備份還原旅程；原本的本機旅程已留作回復備份。');}).catch(error=>{draft.restoring=false;holdImport(false);toast(error.message);});
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
function pendingBanner(){
  const run=profile.expansion.fireMountain.run;
  if(!profile.wx01.receipt&&!profile.pending&&!run)return '';
  return `<div class="resume-banner scene-resume-strip"><span>旅程已保存</span><div>${profile.wx01.receipt?'<button class="small-button" data-action="pack-resume" aria-label="西行畫作已入藏，查看這份相逢">揭曉藏畫 →</button>':''}${profile.pending?`<button class="small-button" data-action="resume" aria-label="繼續未完的${modeName(profile.pending.kind)}，進度已保留">繼續對局 →</button>`:run?'<button class="small-button" data-action="activity-resume">返回山間補給 →</button>':''}</div></div>`;
}
const faction = card => FACTIONS[card.faction];

function cardMarkup(card, options = {}) {
  const { selectable=false, selected:falseSelected=false, used=false, small=false, bonus=false, collection=false, picked=false, action='inspect', side='player', instanceId=null, printId=undefined, discovered=undefined } = options;
  const printing=cardPresentation(card,{printId:printId===undefined&&instanceId?getInstance(profile,instanceId).printId:printId});
  const rarity = CARD_RARITIES[card.id] || 'common', rarityName = RARITIES[rarity].name;
  const tag = selectable || small || collection ? 'button' : 'div';
  const attrs = tag === 'button' ? `type="button" data-action="${action}" data-id="${instanceId||card.id}" data-card-id="${card.id}" data-side="${side}" aria-label="${safe(card.name)}${discovered===false?'，未入藏':discovered===true?'，已入藏':''}，${safe(printing.label)}，${rarityName}，${card.stars} 星，力量 ${card.power}，傷害 ${card.damage}${used ? '，已出戰' : ''}" ${used && selectable ? 'disabled' : ''} ${selectable ? `aria-pressed="${falseSelected}"` : ''}` : '';
  return `<${tag} class="card ${selectable?'selectable':''} ${falseSelected?'selected':''} ${used?'used':''} ${collection?'collection-card':''}" data-rarity="${rarity}" data-treatment="${printing.treatment}" data-print-id="${printing.printId}" ${attrs} style="--faction:${faction(card).color}">
    <div class="card-art" style="${printing.artStyle}"></div><div class="card-shade"></div>
    <span class="card-rarity-frame" aria-hidden="true"></span>${printFrameMarkup(card,{printId:printing.printId})}
    <div class="card-top"><span class="card-faction-rarity"><span class="faction-label">${faction(card).icon} ${faction(card).name}</span><span class="card-rarity-badge" aria-hidden="true" title="${rarityName}">${rarityName[0]}</span></span><span class="stars" aria-label="${card.stars} 星">${'✦'.repeat(card.stars)}</span></div>
    ${tag==='div'?`<span class="sr-only">收藏稀有度：${rarityName}</span>`:''}
    ${picked?'<span class="picked-check" aria-label="已加入牌組">✓</span>':''}
    <div class="card-copy"><div class="card-title">${card.title}</div><h3 class="card-name">${card.name}</h3><div class="card-divider"></div>
      <div class="card-stats"><span class="card-stat">力 <strong>${card.power}</strong></span><span class="card-stat">傷 <strong>${card.damage}</strong></span>${small?`<span class="card-stat" style="color:var(--gold)">${card.stars} 星</span>`:''}</div>
      <div class="card-skill">${card.ability.label}</div>${bonus?'<div class="card-bonus">✧ 同族共鳴已啟動</div>':''}
    </div></${tag}>`;
}

function header() {
  return gameHeaderMarkup({profile,screen,sound,accountButton:accountButtonMarkup(account.getState())});
}
function homeMarkup() { return `${lobbySaveNotice()}${lobbyMarkup(profile,cardMarkup,selectedNode)}`; }

function updateResourcePreview() {
  if(!match||match.status!=='playing'||revealPending)return;
  const element=app.querySelector('.battle-resources[data-side="player"]');
  if(!element)return;
  const total=match.player.pills,cost=pills+(fury?RULES.furyCost:0);
  element.querySelectorAll('[data-pill-index]').forEach(capsule=>{
    const index=Number(capsule.dataset.pillIndex);
    capsule.classList.toggle('is-planned',index<pills);
    capsule.classList.toggle('is-fury',fury&&index>=pills&&index<cost);
  });
  const caption=element.querySelector('[data-resource-caption]');
  if(caption)caption.textContent=`預備投入 ${pills} 丹${fury?' · 怒擊 3 丹':''} · 留存 ${total-cost} 丹`;
  element.setAttribute('aria-label',`你剩餘 ${match.player.hp} 生命，${total} 仙丹。預備消耗 ${cost} 丹，留存 ${total-cost} 丹。`);
}

const costNote=preview=>`共消耗 ${preview.cost} 丹 · 剩 ${match.player.pills-preview.cost} 丹`;
function movePanel() {
  const preview = previewMove(match, 'player', { cardId:selected, pills, fury });
  const maxPills = match.player.pills - (fury ? RULES.furyCost : 0);
  return `<aside class="move-panel" aria-label="出牌設定">
    <div class="pill-control"><button data-action="pill-minus" aria-label="減少一枚仙丹" ${pills===0?'disabled':''}>−</button><div class="pill-number"><span id="pill-amount">${pills}</span><small>暗置仙丹</small></div><input class="pill-slider" id="pill-slider" aria-label="投入仙丹" type="range" min="0" max="${maxPills}" step="1" value="${pills}"><button data-action="pill-plus" aria-label="增加一枚仙丹" ${pills===maxPills?'disabled':''}>+</button></div>
    <button class="fury-toggle" data-action="fury" aria-pressed="${fury}" ${match.player.pills<3?'disabled':''}><span>怒擊 <small>另付 3 丹 · 傷害 +2</small></span><span class="toggle-track"></span></button>
    <div class="attack-preview"><span class="attack-preview-copy"><span>己方預估攻擊 <i>· 未計對手影響</i></span><small id="cost-note">${costNote(preview)}</small></span><strong id="attack-value">${preview.attack}</strong></div>
    <button class="primary" data-action="commit" ${busy?'disabled':''}>${isMistGate()?'封丹 · 落子':'落子 · 決勝'} <span aria-hidden="true">↗</span></button></aside>`;
}

const battleArt=(id,side)=>cardPresentation(id,{printId:side==='player'?encounter?.cardPrints?.[id]:undefined});
// The hidden AI move reaches the table only through permittedAnnouncement: a card ID or null.
const planningView=()=>createPlanningView(match,{announcedCardId:permittedAnnouncement(match,aiMove,{revealPending})});
function battleTableOptions(view,actionsHtml) {
  const mist=isMistGate();
  const resonance=mist?mistGateResonanceMarkup({factions:Object.entries(FACTIONS).filter(([id])=>match.player.hand.some(cardId=>getCard(cardId).faction===id&&hasFactionBonus(match,'player',cardId))).map(([,value])=>value)}):'';
  return {draft:{selected,pills,fury},actionsHtml,art:battleArt,resonance,className:battleEntering?' battle-turn-enter':'',
    eyebrow:`${modeName(encounter?.kind)} · 策略對弈`,ornament:mist?mistGateBattleMarkup({round:view.round,initiative:view.leader}):'',
    playerNote:match.mode==='expedition'?'遊歷修練加成已生效':'基礎能力對弈 · 修練加成不計入'};
}
function battleMarkup() {
  const view=planningView();
  return battleTableMarkup(view,battleTableOptions(view,movePanel()));
}
/** Selecting a card changes the draft in place; the table never navigates away. */
function updateBattleDraft() {
  const table=app.querySelector('.battle-table[data-battle-phase="planning"]');
  if(!table)return;
  const focus=captureFocus(app),view=planningView();
  // Patch, never replace: fresh card nodes would replay the round-entry fade and
  // skip the selection lift.
  patchMarkup(table.querySelector('.player-hand'),battleLineupMarkup(view,'player',{selected,art:battleArt}));
  patchMarkup(table.querySelector('.battle-confrontation'),battleConfrontationMarkup(view,{selected,art:battleArt}));
  updateMovePanel();restoreFocus(app,focus);
}
/** Bring a rendered element in line with fresh markup, keeping every node whose
 * tag and child count still match (with its animations, transitions and focus). */
function patchMarkup(element,html) {
  const template=document.createElement('template');template.innerHTML=html.trim();
  const sync=(current,next)=>{
    if(current.nodeType!==next.nodeType||current.nodeName!==next.nodeName)return current.replaceWith(next);
    if(current.nodeType===Node.TEXT_NODE){if(current.data!==next.data)current.data=next.data;return;}
    if(current.nodeType!==Node.ELEMENT_NODE)return;
    for(const {name} of [...current.attributes])if(!next.hasAttribute(name))current.removeAttribute(name);
    for(const {name,value} of [...next.attributes])if(current.getAttribute(name)!==value)current.setAttribute(name,value);
    const before=[...current.childNodes],after=[...next.childNodes];
    if(before.length!==after.length)return current.replaceChildren(...after);
    before.forEach((child,index)=>sync(child,after[index]));
  };
  sync(element,template.content.firstElementChild);
}

function collectionMarkup() {
  return codexMarkup(profile,{set:collectionSet,source:sourceFilter,faction:filter,status:codexStatus},cardMarkup);
}

function cardsHubTabs() {
  const active=screen==='collection'?'codex':bagView.tab;
  return `<nav class="cards-hub-tabs" aria-label="藏卡分類">${[['cards','我的戰卡'],['decks','三套牌組'],['codex','萬象圖鑑']].map(([id,label])=>`<button type="button" data-action="cards-tab" data-id="${id}" aria-pressed="${active===id}" class="${active===id?'active':''}">${label}</button>`).join('')}${preparationReturn?`<button type="button" data-action="return-prep" aria-label="返回出戰整備，${safe(modeName(preparation?.kind))}${preparation?.nodeId?`，${safe(NODES.find(n=>n.id===preparation.nodeId)?.name||'')}`:''}">← 返回整備</button>`:''}</nav>`;
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
  if(target&&!target.disabled){viewport.revealElement(target);target.focus({preventScroll:true});}
  else if(['pill-plus','pill-minus'].includes(focus.action))container.querySelector('#pill-slider')?.focus({preventScroll:true});
}
function render() {
  mapTravel?.destroy();mapTravel=null;
  const focus=captureFocus(app);
  const previousMap=app.querySelector('.world-map[data-world]');
  if(previousMap)worldScrollPositions.set(previousMap.dataset.world,previousMap.parentElement.scrollLeft);
  profile=refreshDaily(profile);
  const pages={home:homeMarkup,collection:collectionMarkup,battle:()=>revealPending||match.status==='finished'?roundHoldMarkup():battleMarkup(),world:()=>worldMarkup(profile,selectedNode,{pieceId:worldPieces.get(getWorldForNode(selectedNode).id)}),market:()=>marketMarkup(profile,cardMarkup,selectedPack),arena:()=>arenaMarkup(profile),bag:()=>backpackMarkup(profile,bagView,cardMarkup,{showTabs:false}),account:()=>`<main><button class="text-button game-back" data-action="account-back">← 返回旅途</button>${accountMarkup(account.getState(),profile)}${saveToolsMarkup(saves.status())}${recoveryMarkup()}</main>`};
  const cardsScreen=['bag','collection'].includes(screen);
  app.innerHTML=`<div class="shell game-shell screen-${screen}${screen==='battle'&&isMistGate()?' is-mist-gate':''}">${header()}${screen==='battle'?'':screen==='home'?((profile.wx01.receipt||profile.expansion.fireMountain.run)?pendingBanner():''):pendingBanner()}${cardsScreen?cardsHubTabs():''}${(pages[screen]||homeMarkup)()}${gameDockMarkup(screen)}</div>`;
  prepareScene(app,{screen});viewport.refresh({key:viewKey(),root:app});
  const currentMap=app.querySelector('.world-map[data-world]');
  if(currentMap){
    currentMap.parentElement.scrollLeft=worldScrollPositions.get(currentMap.dataset.world)||0;
    const worldId=currentMap.dataset.world, world=getWorldForNode(selectedNode);
    worldPieces.set(worldId,currentMap.querySelector('.map-piece').dataset.pieceNode);
    mapTravel=createMapTravel({map:currentMap,nodes:world.nodeIds.map(id=>NODES.find(node=>node.id===id)),window,
      reducedMotion:()=>experience.reducedMotion(),onStep:()=>experience.cue('step'),
      onArrive:(id,{silent})=>{if(screen!=='world'||!currentMap.isConnected)return;selectedNode=id;worldPieces.set(worldId,id);render();if(!silent)announce(`行旅棋已落在${NODES.find(node=>node.id===id).name}。可查看此境。`);}});
  }
  refreshOverlay();
  syncExperienceScene();
  restoreFocus(app,focus);
  if(screen==='account'&&account.getState().confirmation)viewport.selectModule({key:viewKey(),moduleId:'confirmation'});
  battleEntering=false;
  nav.queue();
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
  inheritanceView=null;
  packOpening?.destroy();packOpening=null;
  experience.finishReveal();experienceReturn=null;
  overlay.innerHTML=''; document.body.style.overflow='';app.inert=false;modalKind=null;
  // A preparation-to-battle transition stays in the same soundscape.
  queueMicrotask(syncExperienceScene);
  if(lastFocus?.isConnected) lastFocus.focus({preventScroll:true});
  else if(modalOrigin?.screen===screen)restoreFocus(app,modalOrigin.focus);
  if(modalOrigin?.screen===screen)window.scrollTo({top:modalOrigin.scroll,behavior:'instant'});
  lastFocus=null;modalOrigin=null;
  nav.queue();
}
// stage(dialog) runs before anything measures the new dialog, so a staged reveal's
// first phase is the first style its content ever has: nothing transitions out of
// the resolved markup (heading, damage line, life ring) into the sealed state.
function modal(content, className='', dismissible=true, kind=null, stage=null) {
  mapTravel?.finish({silent:true});
  if(!kind?.startsWith('inheritance-'))inheritanceView=null;
  packOpening?.destroy();packOpening=null;
  experience.finishReveal();
  if(!overlay.firstElementChild){lastFocus=document.activeElement;modalOrigin={screen,focus:captureFocus(app),scroll:window.scrollY};}
  modalKind=kind;
  overlay.innerHTML=`<div class="modal-backdrop" data-dismissible="${dismissible}"><section class="modal ${className}" role="dialog" aria-modal="true" aria-label="萬象契對話框">${dismissible?'<button class="modal-close" data-action="close-modal" aria-label="關閉">×</button>':''}${content}</section></div>`;
  document.body.style.overflow='hidden';app.inert=true;
  stage?.(overlay.querySelector('.modal'));
  fitOverlay();
  syncExperienceScene();
  requestAnimationFrame(focusDialogStart);
  // Every dialog is a layer: a dismissible one gets its own history entry on this user turn.
  nav.queue();
}
function focusDialogStart() {
  [...overlay.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]')]
    .find(node=>node.tabIndex>=0&&!node.closest('[hidden],[inert]')&&node.getClientRects().length)?.focus({preventScroll:true});
}
function fitOverlay() {
  const dialog=overlay.querySelector('.modal');if(!dialog)return;
  dialog.classList.add('viewport-dialog');
  if(modalKind==='pack-receipt')preparePack(dialog);
  else prepareDialog(dialog,{kind:modalKind});
  const receiptId=dialog.querySelector('[data-receipt-id]')?.dataset.receiptId;
  viewport.refresh({key:`modal-${modalKind||'dialog'}${receiptId?`-${receiptId}`:''}`,root:overlay});
}
function dismissModal() {
  const origin=experienceReturn;
  if(['result-card','experience-settings'].includes(modalKind)&&origin?.kind){
    experienceReturn=null;
    if(origin.kind==='round-result')resultModal();
    else if(origin.kind==='match-result')matchEndModal();
    else if(origin.kind==='preparation'&&preparation)prepareEncounter(preparation.kind,preparation.nodeId,preparation.route);
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
    <label class="experience-field"><span>環境聲 <output id="experience-ambience-value">${Math.round(p.ambience*100)}%</output></span><input id="experience-ambience" aria-label="環境聲音量" type="range" min="0" max="1" step="0.05" value="${p.ambience}"></label>
    <label class="experience-field"><span>落子音效 <output id="experience-effects-value">${Math.round(p.effects*100)}%</output></span><input id="experience-effects" aria-label="落子音效音量" type="range" min="0" max="1" step="0.05" value="${p.effects}"></label>
    <label class="experience-field"><span>動態</span><select id="experience-motion"><option value="system" ${p.motion==='system'?'selected':''}>跟隨裝置設定</option><option value="reduce" ${p.motion==='reduce'?'selected':''}>減少動態</option></select></label>
    <label class="experience-field"><span>揭曉節奏</span><select id="experience-pace"><option value="normal" ${p.pace==='normal'?'selected':''}>從容揭曉</option><option value="fast" ${p.pace==='fast'?'selected':''}>直接看結果</option></select></label>
    <p class="panel-footnote">設定會記在此裝置。揭曉時亦可直接跳過。</p><div class="modal-actions"><button class="primary" data-action="close-modal">${screen==='battle'?'返回對局':'返回旅途'} →</button></div>`,'experience-settings',true,'experience-settings');
}
function questsModal(tab=questTab) {
  questTab=tab==='weekly'?'weekly':'daily';
  syncProfile(loadProfile());
  modal(`<div class="quest-content">${dailyMarkup(profile,trainingId,questTab)}</div>`,'quest-scroll',true,'quests');
}
function showPackReceipt(recovered=false) {
  syncProfile(loadProfile());
  const receipt=profile.wx01.receipt;
  if(!receipt){render();return toast('這份畫作已收入行囊。');}
  if(!recovered&&['pack','box','ticket'].includes(receipt.kind))saves.packOpened();
  modal(packReceiptMarkup(receipt,cardMarkup),'pack-modal',true,'pack-receipt');
  packOpening=createPackOpeningController({element:overlay.querySelector('.pack-opening'),receipt,
    reducedMotion:()=>experience.reducedMotion(),pace:()=>experience.getPreferences().pace,announce,window,document,
    onLayout:fitOverlay,revealElement:element=>viewport.revealElement(element)});
  if(recovered)packOpening.finish();else packOpening.open();
}
function showWX01Choice({story=false,treatment='aa'}={}) {
  syncProfile(loadProfile());
  if(profile.wx01.receipt)return showPackReceipt(true);
  modal(wx01RedeemMarkup(profile,cardMarkup,{story,treatment}),'',true,'wx01-choice');
}
function refreshOverlay() {
  if(modalKind?.startsWith('inheritance-'))return refreshInheritance();
  if(modalKind==='codex-detail'&&codexDetailId){
    const focus=captureFocus(overlay),scroll=overlay.querySelector('.modal')?.scrollTop||0,backdropScroll=overlay.firstElementChild.scrollTop;
    detailModal(codexDetailId);
    requestAnimationFrame(()=>{restoreFocus(overlay,focus);const dialog=overlay.querySelector('.codex-detail');if(dialog){dialog.scrollTop=scroll;overlay.firstElementChild.scrollTop=backdropScroll;}});return;
  }
  if(['activity','activity-supply'].includes(modalKind))return openActivity();
  if(modalKind==='expansion-rewards')return openExpansionRewards();
  if(!['quests','preparation'].includes(modalKind))return;
  const focus=captureFocus(overlay),dialog=overlay.querySelector('.modal'),scroll=dialog.scrollTop,backdropScroll=overlay.firstElementChild.scrollTop;
  if(modalKind==='quests')overlay.querySelector('.quest-content').innerHTML=dailyMarkup(profile,trainingId,questTab);
  if(modalKind==='preparation')overlay.querySelector('.prep-content').innerHTML=preparationContent();
  fitOverlay();
  restoreFocus(overlay,focus);
  if(focus&&!overlay.contains(document.activeElement))focusDialogStart();
  dialog.scrollTop=scroll;overlay.firstElementChild.scrollTop=backdropScroll;
}
function nextJourneyNode() {
  const current=NODES.find(n=>n.id===selectedNode)||NODES.find(n=>n.id===profile.location)||NODES[0];
  const world=getWorldForNode(current.id),nodes=NODES.filter(n=>world.nodeIds.includes(n.id));
  return nodes.find(n=>isNodeUnlocked(profile,n.id)&&!profile.cleared.includes(n.id))||current;
}
function storyArrivalMarkup(node) {
  if(!node||node.worldId==='shanhai')return '';
  const world=getWorldForNode(node.id);
  return `<div class="story-arrival" data-world="${world.id}" style="--story-map:url('${world.map}')"><div class="eyebrow">${safe(world.name)} · 第 ${node.order+1} 章</div><h2>${safe(node.name)}</h2><p>${safe(node.description)}</p></div>`;
}
function storyResultMarkup() {
  if(encounter?.kind!=='expedition')return '';
  const node=NODES.find(n=>n.id===encounter.nodeId);if(!node?.victory)return '';
  const world=getWorldForNode(node.id),won=match.winner==='player';
  const complete=won&&world.nodeIds.every(id=>profile.cleared.includes(id));
  return `<section class="story-result" data-world="${world.id}"><div class="eyebrow">${safe(world.name)} · ${complete?'全卷已成':won?'此章已成':'故事未完'}</div><h3>${safe(node.subtitle)}</h3><p>${safe(won?node.victory:node.defeat)}</p>${complete?'<button class="text-button" data-action="world">展開輿圖 · 尋訪另一卷 →</button>':''}</section>`;
}
function openActivity(preparing=false) {
  syncProfile(loadProfile());
  const run=profile.expansion.fireMountain.run;
  if(run?.phase==='supply')return modal(activitySupplyMarkup(profile),'expansion-modal',true,'activity-supply');
  modal(activityMarkup(profile,{route:activityRoute,cardMarkup,preparation:preparing}),'expansion-modal',true,'activity');
}
function openExpansionRewards() {
  syncProfile(loadProfile());
  modal(expansionRewardsMarkup(profile,cardMarkup),'expansion-modal',true,'expansion-rewards');
}
function claimJourneyGrant(id) {
  syncProfile(loadProfile());
  if(profile.wx01.receipt)return showPackReceipt(true);
  const grant=profile.expansion.grants.find(item=>item.id===id);
  if(!grant)return toast('這份獎勵已領取，請重新查看獎勵架。');
  if(grant.kind==='aa')return modal(wx01RedeemMarkup(profile,cardMarkup,{grant}),'',true,'wx01-choice');
  return economy(p=>claimExpansionGrant(p,{id}),'',()=>showPackReceipt());
}
async function launchActivity({route, supply, expectedRunId, expectedStage}={}) {
  if(economyBusy)return;
  economyBusy=true;
  try{
    const result=await transact(p=>{
      const started=supply===undefined?startActivity(p,{route}):advanceActivity(p,{supply,expectedRunId,expectedStage});
      return {...started,nextMatch:createMatch(started.battleOptions)};
    });
    enterStartedBattle(result);
  }catch(error){toast(error.message);}
  finally{economyBusy=false;}
}
function enterStartedBattle(result) {
  encounter=result.encounter;match=result.nextMatch;recorded=false;lastReward=null;
  closeModal();preparation=null;preparationReturn=null;screen='battle';prepareRound();battleEntering=true;render();window.scrollTo({top:0,behavior:'instant'});announce('對局開始。選一張戰卡，再分配仙丹。');playTone('select');
}
function preparationContent() {
  const kind=preparation.kind,node=NODES.find(n=>n.id===preparation.nodeId),deck=getActiveDeck(profile);
  const loaner=preparation.route==='loaner'&&node?.loanerDeck;
  const valid=loaner?validateDeck(loaner).valid:validateInstanceDeck(profile,deck?.instanceIds).valid;
  const cards=loaner?loaner.map(cardId=>({cardId,level:1,printId:undefined})):(deck?.instanceIds||[]).map(uid=>profile.instances.find(i=>i.uid===uid)).filter(Boolean);
  const mist=isMistGate(preparation);
  return `${storyArrivalMarkup(node)||(mist?mistGateArrivalMarkup({returning:profile.cleared.includes(node.id)}):`<div class="eyebrow">${modeName(kind)} · 出發前整備</div><h2>${safe(node?.name||modeName(kind))}</h2>`)}<p class="prep-opponent">${safe(node?.enemyName||'山海弈者')} · AI 對手<br>${kind==='expedition'?'四回合 · 此張戰卡的修練加成生效':'四回合 · 使用基礎能力對弈'}</p>${node?`${mist||node.worldId!=='shanhai'?'':`<p>${safe(node.description)}</p>`}<p class="destination-rewards">勝利獎勵 · ${rewardText(node.winReward)}</p>`:''}<div class="prep-deck-heading"><h3>${safe(loaner?'借用同行牌組':deck?.name||'尚未選擇牌組')}</h3>${loaner?`<button class="text-button" data-action="travel" data-id="${node.id}">改用自家牌組 →</button>`:'<button class="text-button" data-action="prep-deck">更換／整備牌組 →</button>'}</div><div class="prep-deck-strip">${cards.map(i=>`<div>${cardMarkup(getCard(i.cardId),{printId:i.printId})}<small>Lv.${i.level}</small></div>`).join('')}</div><p class="panel-footnote">從這八張卡隨機抽四張出戰。${loaner?'借牌固定 Lv.1；戰卡不入藏，亦不獲卡牌 EXP。':kind==='practice'?'自由切磋不獲金幣或卡牌 EXP。':''}</p>${valid?'':'<p class="account-message is-error">先儲存並啟用八張不同角色、總星數不超過 25 的牌組。</p>'}<div class="modal-actions"><button class="secondary" data-action="close-modal">稍後出發</button><button class="primary" data-action="confirm-start" ${valid?'':'disabled'}>${mist?'踏上渡口':'進入對局'} →</button></div>${mist?'<button class="text-button" data-action="experience-settings">聲息與節奏 · 設定</button>':''}`;
}
function prepareEncounter(kind='practice',nodeId=null,route='owned') {
  if(economyBusy)return;
  syncProfile(loadProfile());
  if(profile.pending)return pendingModal();
  if(profile.expansion.fireMountain.run)return openActivity();
  if(kind==='expedition'&&!isNodeUnlocked(profile,nodeId))return toast('先踏破上一境，方可繼續遊歷。');
  preparation={kind,nodeId,route};
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
  prepareEncounter(preparation.kind,preparation.nodeId,preparation.route);
}
function nextEncounterIntent() {
  const kind=encounter?.kind||'practice';
  if(kind!=='expedition')return {kind,nodeId:null};
  const next=NODES.find(n=>n.id===nextNodeInWorld(encounter.nodeId));
  return {kind,nodeId:match.winner==='player'&&next&&isNodeUnlocked(profile,next.id)?next.id:encounter.nodeId};
}
function prepareNextEncounter({editDeck=false}={}) {
  const intent=nextEncounterIntent();
  if(intent.kind==='activity')return openActivity();
  const route=!editDeck&&intent.nodeId===encounter?.nodeId?(encounter?.route||'owned'):'owned';
  if(intent.kind==='expedition')selectedNode=intent.nodeId;
  navigate(intent.kind==='expedition'?'world':'arena');
  prepareEncounter(intent.kind,intent.nodeId,route);
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
  const inCodex=screen==='collection',collected=isCharacterCollected(profile,id),held=profile.inventory[id]>0;
  const printId=screen==='battle'?(side==='player'?encounter?.cardPrints?.[id]:undefined):inCodex&&collectionSet==='wx01'?WX01_PRINTINGS.find(print=>print.cardId===id&&print.treatment==='base')?.id:undefined;
  if(inCodex)codexDetailId=id;
  const action=held?(inCodex?'bag-card':'upgrade'):'market',label=held?(inCodex?'展開我的藏卡 →':'修練此卡 →'):'前往市集尋訪 →';
  modal(`${inCodex&&!collected?'<p class="codex-detail-note">未入藏 · 墨影待現<br>可先翻閱人物與弈道，取得卡牌後便會亮起彩繪。</p>':''}<div class="eyebrow">THE ARCHIVE · ${f.name}</div><div class="detail-layout">${cardMarkup(c,{printId})}<div><div class="eyebrow" style="font-size:8px">${c.title}</div><h2>${c.name}</h2><p class="detail-rank" style="color:var(--gold);font-size:11px;margin:5px 0">${c.stars} 星 · 力量 ${c.power} · 傷害 ${c.damage}${screen==='battle'&&match.mode==='expedition'?` · 出戰 Lv.${c.level}`:''}</p><p class="detail-source">${safe(c.source||'山海原創')} · ${RARITIES[CARD_RARITIES[c.id]].name}${screen==='battle'?'':held?` · 已入藏 ${profile.inventory[c.id]} 張`:collected?' · 商旅保管中':' · 尚未入藏'}</p><p class="detail-lore">${c.lore}</p><div class="detail-ability"><b>${c.ability.label}</b><p>${c.ability.description}</p></div><div class="detail-ability"><b>${f.bonus.label}</b><p>${f.bonus.description}本局抽出兩位同族角色即可啟動。</p></div></div></div>${screen==='battle'?'':`<div class="modal-actions"><button class="secondary" data-action="${action}" data-id="${c.id}">${label}</button></div>`}`,inCodex?`codex-detail${collected?'':' is-uncollected'}`:'',true,inCodex?'codex-detail':null);
}

function preferredInstance(reference){
  const exact=profile.instances.find(i=>i.uid===reference);if(exact)return exact;
  const active=getActiveDeck(profile);
  return active?.instanceIds.map(uid=>getInstance(profile,uid)).find(i=>i.cardId===reference)||getPreferredInstance(profile,reference);
}
function showInstance(reference){
  try{
    const item=preferredInstance(reference);if(!item)throw Error('這張卡暫時不在行囊。');
    // Same profile object for the painted cost and the captured request.
    passportQuote=previewCommand(profile,{type:'care.upgrade',uid:item.uid});
    modal(instanceMarkup(profile,item.uid,cardMarkup),'instance-modal');
  }
  catch(error){passportQuote=null;toast(error.message);}
}
/** care.upgrade through local-commands.mjs: one locked write of effects plus receipt. */
async function runUpgrade(uid){
  if(economyBusy)return;
  const quote=passportQuote;
  if(quote?.selectedUids?.[0]===uid&&!quote.request)return toast(quote.blockers[0]?.message||COMMAND_MESSAGES.invalid);
  if(quote?.request?.intent.uid!==uid){
    try{syncProfile(loadProfile());}catch(error){return toast(error.message);}
    showInstance(uid);return toast(COMMAND_MESSAGES.stale);
  }
  const lock=profileLock();
  if(!lock)return toast(COMMAND_MESSAGES['no-lock']);
  economyBusy=true;
  const button=overlay.querySelector('[data-action="instance-upgrade"]');
  if(button){button.disabled=true;button.setAttribute('aria-busy','true');}
  try{
    let result=await commitCommand(quote.request,{store:profileStore,lock});
    if(result.status==='unknown'){
      toast(result.message);
      // One lookup of the same request; never resubmit or mint a new ID for it.
      const lookup=await readCommandReceipt(quote.request,{store:profileStore,lock:profileLock()});
      if(lookup.status==='committed')result={status:'committed',duplicate:false,receipt:lookup.receipt,profile:loadProfile()};
      else result={...result,message:lookup.status==='not-committed'?COMMAND_MESSAGES['not-committed']:result.message};
    }
    if(result.status==='committed'){
      syncProfile(result.profile);
      if(!result.duplicate)account.markLocalChanged();
      render();showInstance(uid);
      toast(result.duplicate?duplicateMessage(result.receipt):COMMAND_MESSAGES.committed);playTone('select');
      return;
    }
    try{syncProfile(loadProfile());render();showInstance(uid);}catch(error){return toast(error.message);}
    toast(result.message||COMMAND_MESSAGES['write-failed']);
  }catch(error){toast(error.message||COMMAND_MESSAGES['write-failed']);}
  finally{
    economyBusy=false;
    const retry=overlay.querySelector('[data-action="instance-upgrade"][aria-busy="true"]');
    if(retry){retry.disabled=false;retry.removeAttribute('aria-busy');}
  }
}
function openBagGroup(cardId,{fromCodex=false}={}) {
  try {
    syncProfile(loadProfile());getCard(cardId);
    if(!profile.instances.some(copy=>copy.cardId===cardId))return toast('這位角色暫時不在行囊。');
    if(fromCodex){
      const scroll=modalOrigin?.scroll??window.scrollY;closeModal();screenScroll.set(viewKey(),scroll);
      screen='bag';bagView.tab='cards';bagView.query='';bagView.filter='all';bagView.faction='all';bagGroupReturn=null;
    }else bagGroupReturn={scroll:window.scrollY,focus:captureFocus(app)};
    bagView.layout='groups';bagView.expandedCardId=cardId;bagView.printId='all';
    render();window.scrollTo({top:0,behavior:'instant'});app.querySelector('[data-action="bag-close-group"]')?.focus({preventScroll:true});
  }catch(error){toast(error.message);}
}
function closeBagGroup() {
  const origin=bagGroupReturn;bagView.expandedCardId=null;bagView.printId='all';bagGroupReturn=null;
  render();window.scrollTo({top:origin?.scroll||0,behavior:'instant'});
  if(origin?.focus)restoreFocus(app,origin.focus);
  if(!app.contains(document.activeElement))app.querySelector('[data-action="bag-layout"][data-id="groups"]')?.focus({preventScroll:true});
}
function inheritanceContent() {
  const view=inheritanceView;
  if(view.phase==='result')return inheritanceResultMarkup(profile,view.result,cardMarkup);
  if(view.phase==='confirm')return inheritanceConfirmMarkup(profile,view.quote,cardMarkup);
  return `${view.notice?`<p class="inheritance-notice" role="status">${safe(view.notice)}</p>`:''}${inheritanceMarkup(profile,view.targetUid,view.selectedUids,cardMarkup)}`;
}
function paintInheritance({open=false}={}) {
  if(!inheritanceView)return;
  const kind=`inheritance-${inheritanceView.phase}`;
  if(open)return modal(`<div class="inheritance-content">${inheritanceContent()}</div>`,'inheritance-modal',true,kind);
  const content=overlay.querySelector('.inheritance-content');if(!content)return;
  const focus=captureFocus(overlay),dialog=overlay.querySelector('.modal'),scroll=dialog.scrollTop,backdropScroll=overlay.firstElementChild.scrollTop;
  modalKind=kind;content.innerHTML=inheritanceContent();fitOverlay();restoreFocus(overlay,focus);
  if(!overlay.contains(document.activeElement))focusDialogStart();
  dialog.scrollTop=scroll;overlay.firstElementChild.scrollTop=backdropScroll;
}
function refreshInheritance() {
  const view=inheritanceView;if(!view||view.phase==='result')return;
  try {
    const available=new Set(getInheritanceMaterials(profile,view.targetUid).filter(row=>row.eligible).map(row=>row.instance.uid));
    let changed=view.selectedUids.some(uid=>!available.has(uid));
    if(view.quote){
      try{changed ||= previewInheritance(profile,view.targetUid,view.selectedUids).fingerprint!==view.quote.fingerprint;}
      catch{changed=true;}
    }
    if(changed){view.selectedUids=[];view.quote=null;view.phase='select';view.notice='卡牌狀態已更新，請重新選擇並確認。';announce(view.notice);}
    paintInheritance();
  } catch(error) { closeModal();toast(error.message); }
}
function openInheritance(uid) {
  if(economyBusy)return;
  try {
    syncProfile(loadProfile());getInstance(profile,uid);
    inheritanceView={targetUid:uid,selectedUids:[],quote:null,phase:'select',notice:''};
    paintInheritance({open:true});
  } catch(error) { toast(error.message); }
}
function pickInheritance(uid) {
  if(economyBusy||inheritanceView?.phase!=='select')return;
  try {
    syncProfile(loadProfile());refreshInheritance();
    const view=inheritanceView;if(!view)return;
    const material=getInheritanceMaterials(profile,view.targetUid).find(row=>row.instance.uid===uid);
    if(!material?.eligible)return toast(material?.reason||'這張卡暫時不能用作傳承。');
    view.selectedUids=view.selectedUids.includes(uid)?view.selectedUids.filter(id=>id!==uid):[...view.selectedUids,uid];
    view.notice='';view.quote=null;paintInheritance();playTone('select');
  } catch(error) { toast(error.message); }
}
function reviewInheritance() {
  if(economyBusy||inheritanceView?.phase!=='select')return;
  try {
    syncProfile(loadProfile());
    const view=inheritanceView;view.quote=previewInheritance(profile,view.targetUid,view.selectedUids);
    view.phase='confirm';paintInheritance({open:true});
  } catch(error) { refreshInheritance();toast(error.message); }
}
async function confirmInheritance() {
  const view=inheritanceView;
  if(economyBusy||view?.phase!=='confirm'||!view.quote)return;
  if(!navigator.locks)return toast('請用支援安全儲存的新版瀏覽器進行傳承；卡牌未有消耗。');
  economyBusy=true;
  const button=overlay.querySelector('[data-action="inherit-confirm"]');
  if(button){button.disabled=true;button.setAttribute('aria-busy','true');}
  const quote=view.quote;
  try {
    const result=await transact(current=>{
      if(inheritanceView!==view||view.phase!=='confirm'||view.quote!==quote)throw Error('傳承已取消，卡牌未有消耗。');
      return inheritInstances(current,quote);
    },result=>{
      view.phase='result';view.result=result;view.quote=null;
      const consumed=new Set(quote.materialUids);
      bagView.draftInstanceIds=bagView.draftInstanceIds.filter(uid=>!consumed.has(uid));
      if(consumed.has(trainingId))trainingId=view.targetUid;
    });
    render();paintInheritance({open:true});playTone('recovery');
    announce(`同名傳承完成，獲得 ${result.gainedXP} EXP，主卡 Lv.${result.afterLevel}。`);
  } catch(error) {
    try{syncProfile(loadProfile());refreshInheritance();render();}catch{}
    toast(error.message||'未能儲存，卡牌未有消耗。');
  } finally {
    economyBusy=false;
    const retry=overlay.querySelector('[data-action="inherit-confirm"]');
    if(retry){retry.disabled=false;retry.removeAttribute('aria-busy');}
  }
}
function loadBagDeck(id){
  const slot=profile.deckSlots.find(s=>s.id===id)||getActiveDeck(profile);
  if(slot){deckDraftReady=true;bagView.editingSlotId=slot.id;bagView.draftInstanceIds=[...slot.instanceIds];bagView.deckName=slot.name;}
}
function sellInstanceModal(uid){
  try{
    const item=getInstance(profile,uid), sale=getInstanceSale(profile,uid), card=getCard(item.cardId);
    if(sale.reason)return toast(sale.reason);
    modal(`<div class="eyebrow">PASS ON A STORY</div><h2>讓這張卡，暫別行囊？</h2><p><b>${card.name}</b> · ${safe(printLabel(card,{printId:item.printId}))} · Lv.${item.level} · ${item.xp} EXP<br>卡牌編號 <span class="instance-serial">#${safe(item.uid)}</span></p><p>商旅出價 <b>${sale.sellPrice} 金幣</b>。這張卡的等級、經驗及出戰紀錄會保留；之後可付 ${sale.buybackPrice} 金幣原卡回購。</p><div class="modal-actions"><button class="secondary" data-action="close-modal">留在行囊</button><button class="primary" data-action="confirm-instance-sell" data-id="${safe(uid)}">出售這張卡 →</button></div>`);
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

function opponentDeck(node) {
  if(node?.opponentDeck&&validateDeck(node.opponentDeck).valid)return [...node.opponentDeck];
  for(let n=0;n<60;n++){
    const pool=[...LEGACY_CARDS];
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    const ids=pool.slice(0,8).map(c=>c.id);if(validateDeck(ids).valid)return ids;
  }
  return [...defaultDeckIds];
}
function prepareRound() {
  selected=match.player.hand.find(id=>!match.player.used.includes(id));pills=0;fury=false;busy=false;revealPending=false;
  lastRoundPresentation=null;
  // The AI commits before any human choice on its opening turn.
  aiMove=match.initiative==='opponent'?chooseAIMove(match):null;
  persistBattle();
}
/** A leading AI commits from public state before the player plans. Old or damaged
 * snapshots can lack that commitment: create it now, never from the player's draft. */
function ensureLeadingCommitment() {
  if(revealPending||match?.status!=='playing'||match.initiative!=='opponent')return false;
  try{if(permittedAnnouncement(match,aiMove,{revealPending}))return false;}catch{}
  aiMove=chooseAIMove(match);persistBattle();return true;
}
async function startMatch(kind='practice',nodeId=null,route='owned') {
  if(economyBusy)return;
  if(loadProfile().pending)return pendingModal();
  if(loadProfile().expansion.fireMountain.run)return openActivity();
  economyBusy=true;
  try{
    const node=NODES.find(n=>n.id===nodeId);
    const result=await transact(p=>{
      const started=beginBattle(p,{kind,nodeId,route});
      const nextMatch=createMatch(started.battleOptions||{deckIds:p.deck,opponentDeckIds:opponentDeck(node),mode:kind,playerLevels:getDeckLevels(p),opponentLevels:Object.fromEntries(CARDS.map(c=>[c.id,kind==='expedition'?Math.min(3,node.level):1])),opponentName:node?.enemyName||'山海弈者'});
      return {...started,nextMatch};
    });
    enterStartedBattle(result);
  }catch(error){toast(error.message);}
  finally{economyBusy=false;}
}
function pendingModal(){
  const current=loadProfile();
  if(current.expansion.fireMountain.run&&!current.pending)return openActivity();
  const expected=current.pending?.id||'';
  modal(`<div class="eyebrow">A DUEL AWAITS</div><h2>還有一局，等你落子。</h2><p>已保留上次對局。繼續旅程，或放棄這局再出發；放棄不會獲得對局獎勵。</p><div class="modal-actions"><button class="secondary" data-action="discard-pending" data-encounter="${expected}">放棄未完對局</button><button class="primary" data-action="resume">繼續對局 →</button></div>`);
}
async function resumeBattle(){
  const p=loadProfile(), saved=read(BATTLE_KEY,null);
  if(!p.pending){syncProfile(p);if(p.expansion.fireMountain.run)return openActivity();closeModal();render();return toast('這局已結束，旅程已更新。');}
  try{
    if(saved?.encounter?.id!==p.pending.id&&p.pending.battleSeed!==undefined){
      syncProfile(p);enterStartedBattle({encounter:p.pending,nextMatch:createMatch(getPendingBattleOptions(p))});return;
    }
    if(saved?.encounter?.id!==p.pending.id||!saved.match?.player?.hand||!Array.isArray(saved.match.history))throw Error('對局記錄不完整，請放棄這局後重新出發。');
    for(const side of ['player','opponent']){
      const who=saved.match[side];
      if(!Array.isArray(who.hand)||who.hand.length!==4||!Array.isArray(who.used)||who.hand.some(id=>!CARDS.some(c=>c.id===id)))throw Error('對局記錄不完整，請重新出發。');
    }
    syncProfile(p);match=saved.match;encounter=p.pending;selected=saved.selected;pills=saved.pills||0;fury=!!saved.fury;aiMove=saved.aiMove;revealPending=!!saved.revealPending;recorded=false;lastReward=null;busy=revealPending;
    if(encounter.kind==='expedition')selectedNode=encounter.nodeId;
    closeModal();screen='battle';lastRoundPresentation=null;battleEntering=false;
    if(match.status==='finished'){await recordFinishedMatch();render();return matchEndModal();}
    if(!revealPending&&(!match.player.hand.includes(selected)||match.player.used.includes(selected)))selected=match.player.hand.find(id=>!match.player.used.includes(id));
    ensureLeadingCommitment();
    render();if(revealPending)resultModal();announce('已返回未完對局。');
  }catch(error){pendingModal();toast(error.message);}
}
function requestNavigation(destination) {
  if(screen==='battle'&&match?.status==='playing'){
    modal(`<div class="eyebrow">LEAVE THE DUEL</div><h2>暫別此局？</h2><p>可以保留對局稍後繼續，或放棄本局。放棄不會獲得獎勵；牌組與修練進度會保留。</p><div class="modal-actions"><button class="secondary" data-action="navigate-confirm" data-id="${destination}">保留並離開</button><button class="primary" data-action="abandon-navigate" data-id="${destination}" data-encounter="${encounter.id}">放棄此局</button></div>`);
  }else navigate(destination);
}
function navigate(destination) {
  if(destination==='daily'){closeModal();questsModal('daily');return;}
  const originScreen=screen,originScroll=modalOrigin?.scroll??window.scrollY;
  closeModal();screenScroll.set(viewKey(),originScroll);
  if(destination==='account'&&originScreen!=='account')accountReturn=originScreen==='battle'?'home':originScreen;
  screen=destination==='classics'?'collection':destination;
  if(destination==='classics'){collectionSet='classics';sourceFilter='all';filter='all';codexStatus='all';}
  preparation=null;preparationReturn=null;
  if(screen==='bag'&&bagView.tab==='decks'&&!deckDraftReady)loadBagDeck(profile.activeDeckId);
  render();window.scrollTo({top:screenScroll.get(viewKey())||0,behavior:'instant'});
  if(screen==='account') account.init();
}
function viewKey(){return screen==='bag'?`bag-${bagView.tab}${bagView.tab==='cards'?`-${bagView.expandedCardId||bagView.layout}`:''}`:screen;}
// Back model (docs/NAVIGATION.md, "Back model"). The layers are read from the existing return
// state; Back calls the function each layer's own close control already calls, so it never
// settles, pays or writes. State-only history entries: the URL never changes.
// True only while recordFinishedMatch saves a finished match's settlement. `busy` is not
// that signal: a resumed finished match keeps it set after a failed save.
let settling=false;
function navView() {
  const open=overlay.firstElementChild,chained=open&&['result-card','experience-settings'].includes(modalKind)&&['round-result','match-result','preparation'].includes(experienceReturn?.kind);
  return {screen,accountReturn,battle:screen!=='battle'?null:settling?'settling':match?.status||null,
    bagGroup:bagView.tab==='cards'&&Boolean(bagView.expandedCardId),preparationDeck:preparationReturn&&preparation?{screen:preparationReturn.screen}:null,
    modal:open?{kind:modalKind,dismissible:open.dataset.dismissible==='true'}:null,
    modalReturn:chained?{kind:experienceReturn.kind,dismissible:experienceReturn.kind==='preparation'}:null};
}
function navBack() {
  const decision=backDecision(navView());
  if(decision.action===BACK.DISMISS_MODAL)dismissModal();
  else if(decision.action===BACK.CLOSE_GROUP)closeBagGroup();
  else if(decision.action===BACK.RETURN_PREPARATION)returnToPreparation();
  else if(decision.action===BACK.ACCOUNT_BACK)navigate(accountReturn);
  else if(decision.action===BACK.BATTLE_MENU)requestNavigation('home');
  else if(decision.action===BACK.HOME)navigate('home');
  // BACK.HOLD: a result (or a commit being saved) stays on screen; the guard entry is re-armed.
  return decision;
}
// Pushes only on a user turn with transient activation: Chrome's history-manipulation
// intervention lets Back skip entries a page adds without one.
const nav=createNavHistory({history,depth:()=>navLayers(navView()).length,signature:()=>navSignature(navView()),back:navBack,
  canPush:()=>{try{return navigator.userActivation?navigator.userActivation.isActive:true;}catch{return true;}}});
function switchCardsTab(tab) {
  screenScroll.set(viewKey(),window.scrollY);
  if(tab==='codex')screen='collection';
  else{screen='bag';bagView.tab=tab==='decks'?'decks':'cards';if(bagView.tab==='decks'&&!deckDraftReady)loadBagDeck(profile.activeDeckId);}
  render();window.scrollTo({top:screenScroll.get(viewKey())||0,behavior:'instant'});
}
function updateMovePanel() {
  const panel=app.querySelector('.move-panel');
  if(panel){const focus=captureFocus(panel);panel.outerHTML=movePanel();restoreFocus(app.querySelector('.move-panel'),focus);}
  updateResourcePreview();
}
async function commitMove() {
  if(busy||economyBusy||!match||match.status!=='playing')return;busy=true;
  try{
    if(loadProfile().pending?.id!==encounter.id)throw Error('這場對局已在另一頁結束，請返回山海。');
    const playerMove={cardId:selected,pills,fury};
    // The responding AI sees only the revealed card, never the hidden bid. A
    // leading AI committed in prepareRound; it never sees the player's card.
    if(match.initiative==='player')aiMove=chooseAIMove(match,Math.random,selected);
    else if(ensureLeadingCommitment()){busy=false;render();return toast('對手剛亮出本輪戰卡，請確認後再落子。');}
    const before={player:{hp:match.player.hp,pills:match.player.pills},opponent:{hp:match.opponent.hp,pills:match.opponent.pills}};
    // resolveRound advances round/initiative; the old move must not outlive it.
    match=resolveRound(match,playerMove,aiMove);aiMove=null;revealPending=true;
    lastRoundPresentation=createRoundPresentation(before,match);
    persistBattle();playTone('commit');
    // The inert table behind the reveal switches to the lastResult view at once.
    // Commit leaves with the planning table, so focus moves to the reveal table's
    // own action first; the dialog records that as its origin instead of <body>.
    const hadFocus=app.contains(document.activeElement);
    await recordFinishedMatch();render();
    if(hadFocus)app.querySelector('[data-action="show-result"]')?.focus({preventScroll:true});
    resultModal({animate:true});
  }catch(error){busy=false;toast(error.message);}
}
async function recordFinishedMatch() {
  if(match.status!=='finished'||recorded)return;
  const settledId=encounter.id;
  settling=true;
  try{
    const result=await transact(p=>finishBattle(p,{encounterId:settledId,winner:match.winner,playedCardIds:match.player.used,finalResources:{hp:match.player.hp,pills:match.player.pills}}),()=>clearBattleSnapshot(settledId));
    lastReward=result.reward;recorded=true;
    saves.battleFinished(match.winner);
  }finally{settling=false;}
}
function resultModal({animate=false}={}) {
  const r=match.lastResult, won=r.winner==='player';
  const tie=r.tieReason==='stars'?'攻擊相同，低星卡獲勝。':r.tieReason==='initiative'?'攻擊、星數相同，先手獲勝。':'';
  const effectList=side=>r.notes[side].map(n=>`<p>· ${safe(n)}</p>`).join('');
  const mist=isMistGate();
  const presentation=lastRoundPresentation||createRoundPresentation(null,match);
  modal(`${mist?mistGateRevealMarkup({round:r.round}):`<div class="eyebrow">ROUND ${r.round} · THE CARDS ARE REVEALED</div>`}<h2>${won?'此局，你勝。':'此局，暫退。'}</h2>
    <p class="battle-reveal-status" data-reveal-status>雙方落子，準備揭曉。</p>${revealPairMarkup(createRevealView(match))}
    ${battleClashMarkup({playerCard:r.player.card,opponentCard:r.opponent.card,playerAttack:r.player.attack,opponentAttack:r.opponent.attack,playerPills:r.player.pills,opponentPills:r.opponent.pills,playerFury:r.player.fury,opponentFury:r.opponent.fury,winner:r.winner,damage:r.damage,tieReason:r.tieReason,cardMarkup:(card,{side}={})=>cardMarkup(card,{printId:side==='player'?encounter?.cardPrints?.[card.id]:undefined})})}
    <div class="battle-resource-results" aria-label="本回合生命與仙丹">${['player','opponent'].map(side=>battleResourcesMarkup({side,hp:match[side].hp,pills:match[side].pills,compact:true,label:side==='player'?'你':'對手'})).join('')}</div>
    <div class="resolution">${tie}${won?'對手':'你'}受到 <strong>${r.damage}</strong> 點傷害。<br>當前生命：你 <strong>${match.player.hp}</strong> · 對手 <strong>${match.opponent.hp}</strong>　｜　剩餘仙丹：你 ${match.player.pills} · 對手 ${match.opponent.pills}</div>
    <div class="result-effects"><div><h4>你的技能與共鳴</h4>${effectList('player')}</div><div><h4>對手的技能與共鳴</h4>${effectList('opponent')}</div></div>
    <div class="battle-reveal-footer"><div class="modal-actions"><button class="primary" data-action="next-round">${match.status==='finished'?'查看對局結果':'繼續 · 下一回合'} <span>→</span></button></div><div class="mist-reveal-controls battle-reveal-controls"><button class="text-button" data-action="skip-reveal">直接看結果</button><button class="text-button" data-action="experience-settings">聲息與節奏</button></div></div>`,`result-modal battle-reveal${mist?' mist-reveal':''}`,false,'round-result',dialog=>experience.reveal(dialog,{animate:Boolean(animate&&presentation?.canAnimate),battle:true,onPhase:(phase,element)=>{
    paintRoundResources(element,presentation,phase);
    if(phase==='recovery'&&presentation&&['player','opponent'].some(side=>presentation[side].hpRecovered>0||presentation[side].pillsRecovered>0))playTone('recovery');
  }}));
  announce(`第 ${r.round} 回合，${won?'你':'對手'}獲勝，造成 ${r.damage} 點傷害。`);
}
function matchEndModal({celebrate=false}={}) {
  const win=match.winner==='player', draw=match.winner==='draw';
  const next=nextEncounterIntent();
  const activity=encounter?.kind==='activity', run=profile.expansion.fireMountain.run;
  const nextLabel=activity?(run?.phase==='supply'?'前往山間補給':'再入火焰山'):encounter?.kind==='expedition'?(next.nodeId!==encounter.nodeId?'前往下一境':win?'重遊此境':'再戰此境'):'再弈一局';
  if(celebrate)playTone(draw?'draw':win?'win':'lose');
  modal(`<div class="eyebrow">THE DUEL IS COMPLETE</div><div class="match-symbol">${draw?'和':win?'勝':'悟'}</div><h2>${draw?'山海之間，不分高下。':win?'此局山海，盡入你手。':'一局有盡，弈道無窮。'}</h2><p>${draw?'棋逢對手，何妨再弈。':win?'藏鋒有時，出手有度。這一場，是你的傳說。':'記住對手的出丹節奏，下一次，換你掌握勝負。'}</p><div class="match-score"><div><span>你的生命</span><br><strong>${match.player.hp}</strong></div><span>—</span><div><span>對手生命</span><br><strong>${match.opponent.hp}</strong></div></div>${lastReward?`<div class="earned-rewards"><span>${lastReward.firstClear?'首次踏破 · ':''}${lastReward.dailyCache?'今日秘藏 · ':''}旅程已儲存</span><p>${rewardText(lastReward)}</p>${cardExperienceMarkup()}</div>`:''}${historyMarkup()}${activity?activityResultMarkup():storyResultMarkup()}${isMistGate()?mistGateResultMarkup({outcome:match.winner,firstClear:!!lastReward?.firstClear,nextName:NODES.find(n=>n.id===next.nodeId)?.name||''}):''}<div class="modal-actions match-next">${activity?'':'<button class="secondary" data-action="result-deck">調整牌組</button>'}<button class="primary" data-action="next-encounter">${nextLabel} <span>↗</span></button></div><div class="match-return"><button class="text-button" data-action="end-home">返回洞府</button><button class="text-button" data-action="${encounter?.kind==='expedition'?'world':'arena'}">${encounter?.kind==='expedition'?'查看山海圖':'返回對弈'}</button>${profile.expansion.grants.length||profile.expansion.tickets?'<button class="text-button" data-action="expansion-rewards">旅途獎勵架 →</button>':''}${isMistGate()?'<button class="text-button" data-action="experience-settings">聲息與節奏</button>':''}</div>`,`result-modal${isMistGate()?' mist-complete':''}`,false,'match-result');
}
function activityResultMarkup() {
  const result=lastReward?.activity,run=profile.expansion.fireMountain.run;
  if(!result)return '';
  const loot=result.loot, print=loot?.printId?WX01_PRINTINGS.find(item=>item.id===loot.printId):null;
  const extra=print?`${safe(getCard(print.cardId).name)}本畫已送到獎勵架${loot.forced?' · 二十勝之約':''}`:loot?.kind==='dust'?'額外靈砂 +2':loot?.kind==='coins'?'額外金幣 +30':'';
  return `<section class="story-result activity-result"><div class="eyebrow">火焰山 · 第 ${result.stage+1} 戰</div><h3>${result.complete?'三重火盡，借得一陣風。':run?'先歇一息，再接下一戰。':'山路仍在，稍後再來。'}</h3><p>${extra||'已贏得的獎勵會保留。'}${run?`<br>歇息後：生命 ${run.hp} · 仙丹 ${run.pills}，下一步選一項補給。`:''}${result.complete?'<br>首通牛魔王本畫與每週秘匣券，可到獎勵架查看。':''}</p></section>`;
}
function historyMarkup() {
  return `<div class="round-history">${match.history.map(r=>`<div class="history-row"><span>第 ${r.round} 局</span><span>${r.player.card.name} ${r.player.attack} : ${r.opponent.attack} ${r.opponent.card.name}</span><strong>${r.winner==='player'?'你':'對手'}勝 · ${r.damage} 傷</strong></div>`).join('')}</div>`;
}

function roundHoldMarkup(){
  const view=createRevealView(match);
  return battleTableMarkup(view,battleTableOptions(view,`<div class="battle-reveal-actions"><p>${match.status==='finished'?'此局已定，來路可期。':'雙方落子，勝負揭曉。'}</p><button class="primary" data-action="show-result">${match.status==='finished'?'查看對局結果':'查看本回合結果'} <span aria-hidden="true">→</span></button></div>`));
}

document.addEventListener('click', event=>{
  const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
  const {action,id}=button.dataset;
  experience.unlockAudio().catch(()=>{});
  if(action==='activity-open'||action==='activity-route'){if(action==='activity-route')activityRoute=id==='loaner'?'loaner':'owned';return openActivity(action==='activity-route');}
  if(action==='activity-start')return launchActivity({route:id});
  if(action==='activity-resume')return loadProfile().pending?resumeBattle():openActivity();
  if(action==='activity-supply')return launchActivity({supply:id,expectedRunId:button.dataset.run,expectedStage:Number(button.dataset.stage)});
  if(action==='activity-save-exit')return navigate('arena');
  if(action==='activity-abandon'){
    const run=loadProfile().expansion.fireMountain.run;if(!run)return openActivity();
    return modal(`<div class="eyebrow">火焰山 · 暫別山路</div><h2>結束這次三連戰？</h2><p>已贏得的獎勵會保留。這段未完成的山路會結束，下次由第一戰重新出發。</p><div class="modal-actions"><button class="secondary" data-action="activity-resume">繼續旅程</button><button class="primary" data-action="activity-abandon-confirm" data-id="${safe(run.id)}" data-encounter="${safe(loadProfile().pending?.id||'')}">結束這次旅程</button></div>`,'',true,'activity-abandon');
  }
  if(action==='activity-abandon-confirm')return economy(p=>abandonActivity(p,{expectedRunId:id}),'已放下此程，所得獎勵已保留。',()=>{match=null;encounter=null;navigate('arena');},()=>clearBattleSnapshot(button.dataset.encounter));
  if(action==='expansion-rewards')return openExpansionRewards();
  if(action==='expansion-claim')return claimJourneyGrant(id);
  if(action==='expansion-claim-print')return economy(p=>claimExpansionGrant(p,{id:button.dataset.grant,printId:id}),'',()=>showPackReceipt());
  if(action==='ticket-open'){
    if(loadProfile().wx01.receipt)return showPackReceipt(true);
    return economy(p=>openWX01Ticket(p),'',()=>showPackReceipt());
  }
  if(action==='pack-resume')return showPackReceipt(true);
  if(action==='pack-open')return packOpening?.open();
  if(action==='box-next')return packOpening?.nextPack();
  if(action==='pack-card-reveal')return packOpening?.reveal(Number(button.dataset.index));
  if(action==='pack-skip'||action==='pack-show-all')return packOpening?.finish({focus:true});
  if(action==='pack-ack')return economy(p=>acknowledgeWX01Receipt(p,id),'',()=>closeModal());
  if(action==='buy-box'){
    if(loadProfile().wx01.receipt)return showPackReceipt(true);
    const packs=Number(button.dataset.packs);
    return economy(p=>buyWX01Box(p,{packs}),'',()=>showPackReceipt());
  }
  if(action==='wx01-odds')return modal(wx01OddsMarkup(loadProfile()),'',true,'wx01-odds');
  if(action==='wx01-redeem'||action==='wx01-redeem-tab')return showWX01Choice({treatment:id||'aa'});
  if(action==='wx01-story-choice')return showWX01Choice({story:true});
  if(action==='redeem-print')return economy(p=>redeemWX01Print(p,id),'',()=>showPackReceipt());
  if(action==='claim-story-print')return economy(p=>claimWX01StoryPrint(p,id),'',()=>showPackReceipt());
  if(action==='set-leader')return economy(p=>setLeaderInstance(p,id||null),id?'領契已相伴洞府。':'已收起領契。',()=>closeModal());
  if(action==='experience-settings')return experienceSettingsModal();
  if(action==='skip-reveal')return experience.finishReveal();
  if(action==='result-card')return resultCardModal(id);
  if(action==='return-result')return dismissModal();
  if(action==='account-open')return requestNavigation('account');
  if(action==='account-back')return navigate(accountReturn);
  if(action==='quests')return questsModal(id==='weekly'?'weekly':'daily');
  if(action==='quest-tab'){
    questTab=id==='weekly'?'weekly':'daily';refreshOverlay();
    overlay.querySelector(`[data-action="quest-tab"][data-id="${questTab}"]`)?.focus({preventScroll:true});return;
  }
  if(action==='cards-tab')return switchCardsTab(id);
  if(action==='bag'&&preparationReturn){closeModal();return switchCardsTab(bagView.tab);}
  if(action==='continue-journey'){
    if(loadProfile().pending)return resumeBattle();
    selectedNode=nextJourneyNode().id;navigate('world');return prepareEncounter('expedition',selectedNode);
  }
  if(action==='story-unlock'){
    selectedNode='mist-gate';navigate('world');return prepareEncounter('expedition',selectedNode);
  }
  if(action==='lobby-deck'){navigate('bag');return switchCardsTab('decks');}
  if(action==='world-deck'){
    if(!isNodeUnlocked(profile,selectedNode)){navigate('bag');return switchCardsTab('decks');}
    prepareEncounter('expedition',selectedNode);if(modalKind==='preparation')openPreparationDeck();return;
  }
  if(action==='prep-deck')return openPreparationDeck();
  if(action==='return-prep')return returnToPreparation();
  if(action==='confirm-start'){if(preparation)return startMatch(preparation.kind,preparation.nodeId,preparation.route);return;}
  if(action==='next-encounter')return prepareNextEncounter();
  if(action==='result-deck')return prepareNextEncounter({editDeck:true});
  if(action==='battle-menu')return requestNavigation('home');
  if(action==='quest-go')return requestNavigation(id);
  if(['home','collection','world','daily','market','arena','classics','bag','account'].includes(action))return requestNavigation(action);
  const accountActions = {
    'account-retry': () => account.init(),
    'account-refresh': () => account.refreshCloud(),
    'account-upload': () => account.upload().then(saved => { if (saved) backupMade(); }),
    'account-confirm-restore': () => account.setConfirmation('restore'),
    'account-confirm-delete': () => account.setConfirmation('delete'),
    'account-cancel-confirmation': () => {account.cancelConfirmation();viewport.selectModule({key:viewKey(),moduleId:'cloud'});},
    'account-restore': () => account.restore(),
    'account-delete': () => account.deleteBackup().then(deleted => { if (deleted) backupDeleted(); }),
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
    // A dialog reopened while a restore is in flight keeps that restore's draft, so a press in
    // it is ignored too, not queued as a second restore that is refused after the first lands.
    if(!recoveryDraft?.restoring)recoveryDraft={snapshot:saved.snapshot,savedAt:saved.savedAt,fingerprint:fingerprintProfile(loadProfile())};
    modal('<div class="eyebrow">RETURN TO YOUR JOURNEY</div><h2>復原上次本機旅程？</h2><p>這會取代此裝置的進度；雲端備份不會改變。現在的本機旅程會成為下一份回復備份。</p><div class="modal-actions"><button class="secondary" data-action="close-modal">保留現在進度</button><button class="primary" data-action="confirm-restore-recovery">復原本機旅程</button></div>');return;
  }
  if(action==='confirm-restore-recovery'){
    const saved=read(RECOVERY_KEY,null),draft=recoveryDraft;
    if(draft?.restoring)return;
    if(!draft||saved?.savedAt!==draft.savedAt)return toast('回復備份已更新，請重新查看。');
    // A refusal changes nothing and leaves this dialog open, so the draft stays for a press
    // again: after a fence refusal that asks for a retry, it restores once the fence passes,
    // and every retry runs the backup and fingerprint checks again (docs/LOCAL-COMMANDS.md §11).
    draft.restoring=true;
    restoreLocalProfile(draft.snapshot,draft.fingerprint).then(()=>{if(recoveryDraft===draft)recoveryDraft=null;closeModal();account.markLocalChanged();render();toast('已復原上次本機旅程。');}).catch(error=>{draft.restoring=false;toast(error.message);});return;
  }
  if(action==='bag-tab')return switchCardsTab(id);
  if(action==='bag-card')return openBagGroup(id,{fromCodex:true});
  if(action==='bag-open-group')return openBagGroup(id);
  if(action==='bag-close-group')return closeBagGroup();
  if(action==='bag-layout'){
    if(!['groups','copies'].includes(id))return;
    bagView.layout=id;bagView.expandedCardId=null;bagView.printId='all';bagGroupReturn=null;render();viewport.selectModule({key:viewKey(),moduleId:'cards'});return;
  }
  if(action==='bag-print-filter'){bagView.printId=id;render();viewport.selectModule({key:viewKey(),moduleId:'cards'});return;}
  if(action==='codex-status'){if(!['all','collected','missing'].includes(id))return;codexStatus=id;render();return;}
  if(action==='instance-inspect')return showInstance(id);
  if(action==='instance-inherit')return openInheritance(id);
  if(action==='inherit-pick')return pickInheritance(id);
  if(action==='inherit-review')return reviewInheritance();
  if(action==='inherit-back'){
    if(economyBusy||!inheritanceView)return;
    inheritanceView.phase='select';inheritanceView.quote=null;
    try{syncProfile(loadProfile());refreshInheritance();}catch(error){toast(error.message);}return;
  }
  if(action==='inherit-confirm')return confirmInheritance();
  if(action==='inherit-done'){
    if(economyBusy||!inheritanceView)return;
    try{const uid=inheritanceView.targetUid;syncProfile(loadProfile());showInstance(uid);}catch(error){toast(error.message);}return;
  }
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
  if(action==='pack-set'){selectedPack=id;render();viewport.selectModule({key:viewKey(),moduleId:'packs',focus:false});return;}
  if(action==='world-select'){
    const world=WORLDS.find(item=>item.id===id);if(!world)return;
    worldSelections.set(getWorldForNode(selectedNode).id,selectedNode);
    selectedNode=worldSelections.get(id)||(world.nodeIds.includes(profile.location)?profile.location:null)
      ||world.nodeIds.find(nodeId=>isNodeUnlocked(profile,nodeId)&&!profile.cleared.includes(nodeId))||world.nodeIds[0];
    render();viewport.selectModule({key:viewKey(),moduleId:'map'});return;
  }
  if(action==='map-inspect'){
    if(!NODES.some(node=>node.id===id))return;
    selectedNode=id;render();viewport.selectModule({key:viewKey(),moduleId:'chapter'});return;
  }
  if(action==='map-select'||action==='story-stage'){
    const node=NODES.find(node=>node.id===id);if(!node||screen!=='world')return;
    const state=mapTravel?.getState();
    if(!isNodeUnlocked(profile,id)||(state?.current===id&&!state.moving)){
      selectedNode=id;render();viewport.selectModule({key:viewKey(),moduleId:'chapter'});return;
    }
    selectedNode=id;worldPieces.set(node.worldId,id);
    viewport.selectModule({key:viewKey(),moduleId:'map',focus:false});
    if(action==='story-stage')app.querySelector(`.map-pin[data-id="${id}"]`)?.focus({preventScroll:true});
    mapTravel?.moveTo(id);return;
  }
  if(action==='travel-loaner')return prepareEncounter('expedition',id,'loaner');
  if(action==='travel')return prepareEncounter('expedition',id);
  if(action==='ranked')return prepareEncounter('arena');
  if(action==='resume')return resumeBattle();
  if(action==='discard-pending'||action==='abandon-navigate'){
    const expected=button.dataset.encounter;
    return economy(p=>{if(!expected||p.pending?.id!==expected)throw Error('這局已在另一頁改變，請關閉對話框再繼續。');return abandonBattle(p);},'已放下此局，隨時可以再出發。',()=>{match=null;encounter=null;navigate(id||'home');},()=>clearBattleSnapshot(expected));
  }
  if(action==='claim-login')return economy(p=>claimLogin(p),'朝露之贈已收入行囊。');
  if(action==='claim-task')return economy(p=>claimTask(p,id),'日課已成，獎勵已收入行囊。');
  if(action==='claim-weekly-task')return economy(p=>claimWeeklyTask(p,id),'週課已成，獎勵已收入行囊。');
  if(action==='arena-chest')return economy(p=>claimArenaChest(p),'三戰之約已成，寶箱已開啟。');
  if(action==='daily-train')return economy(p=>trainCard(p,id),'這張卡的修練提升了！');
  // upgrade-card names a cardId; it opens that card's page instead of spending directly.
  if(action==='upgrade'||action==='upgrade-card'){const instance=preferredInstance(id);if(instance)showInstance(instance.uid);return;}
  if(action==='instance-upgrade')return runUpgrade(id);
  if(action==='buy-card')return economy(p=>buyCard(p,id),`已購入一張${getCard(id).name}。`);
  if(action==='sell-card'){navigate('bag');bagView.query=getCard(id).name;render();return;}
  if(action==='buy-pack'){if(loadProfile().wx01.receipt)return showPackReceipt(true);const packSet=button.dataset.set||selectedPack;return economy(p=>buyPack(p,{set:packSet}),'',result=>{
    if(result.receipt)return showPackReceipt();
    saves.packOpened();
    modal(`<div class="eyebrow">${PACK_SETS[result.set].name} · THREE FATES</div><h2>三份緣，已入藏。</h2><p>卡牌已加入收藏。多出的卡可到商旅市集出售。</p><div class="pack-reveal">${result.cards.map(({cardId,rarity,instanceId,printId})=>`<div class="pack-result" style="--rarity:${RARITIES[rarity].color}">${cardMarkup(getCard(cardId),{printId})}<span class="rarity-label">${RARITIES[rarity].name}</span><p>${getCard(cardId).name} · Lv.1<br><span class="instance-serial">#${safe(instanceId)}</span></p></div>`).join('')}</div><div class="modal-actions"><button class="secondary" data-action="close-modal">收入行囊 ✓</button><button class="primary" data-action="buy-pack" data-set="${result.set}" ${profile.coins<PACK_PRICE?'disabled':''}>再開一匣 · ${PACK_PRICE} 金幣</button></div>`,'pack-modal');
  });}
  if(action==='export-save')return exportSave();
  if(action==='import-save')return pickJourneyFile();
  if(action==='import-confirm')return confirmImport();
  if(action==='save-notice-dismiss'){if(id==='restore-offer')saves.closeRestoreOffer();else saveNotice=null;render();return;}
  if(action==='restore-offer-cloud'){
    // 旅程閣 looks the account up (navigate's own init finds this one busy and sends nothing):
    // a signed-in player with a cloud backup lands on its restore confirmation, anyone else
    // on the 雲端旅程 tab (a guest's sign-in, the cloud panel, or the offline note), never
    // on 此裝置, which would show only the new journey.
    const looked=account.init();navigate('account');viewport.selectModule({key:viewKey(),moduleId:'cloud'});
    looked.then(()=>{const state=account.getState();if(screen==='account'&&state.backup&&!state.confirmation)account.setConfirmation('restore');});
    return;
  }
  if(action==='backup-prompt-cloud'){
    // A backup prompt's 旅程閣 opens where the backup is: the 雲端旅程 tab, with a guest's
    // sign-in, or 備份此裝置 brought onto its page once 旅程閣 knows the account; never the
    // header's default 此裝置 tab, which has neither.
    const looked=account.init();navigate('account');viewport.selectModule({key:viewKey(),moduleId:'cloud'});
    looked.then(()=>{const upload=screen==='account'&&app.querySelector('[data-action="account-upload"]');if(upload&&!upload.closest('[data-viewport-module]')?.hidden)viewport.revealElement(upload);});
    return;
  }
  if(action==='navigate-confirm'){try{persistBattle();navigate(id);}catch(error){toast(error.message);}return;}
  if(action==='rules')return rulesModal();
  if(action==='close-modal')return dismissModal();
  if(action==='start'||action==='rules-start')return prepareEncounter();
  if(action==='end-home')return navigate('home');
  // WebKit does not focus a clicked button; record the origin so closing returns to it.
  if(action==='inspect'){if(screen==='battle')button.focus({preventScroll:true});return detailModal(id,button.dataset.side||'player');}
  if(action==='show-result')return match.status==='finished'?matchEndModal():resultModal();
  if(action==='sound'){experience.setPreferences({sound:!sound});experience.unlockAudio().then(()=>playTone('select'));return;}
  if(action==='select'){
    if(busy||revealPending||match.status!=='playing'||!match.player.hand.includes(id)||match.player.used.includes(id))return;selected=id;playTone('select');
    updateBattleDraft();announce(`已選擇 ${getCard(id).name}。`);return;
  }
  if(action==='pill-minus'||action==='pill-plus'){
    const max=match.player.pills-(fury?3:0);pills=Math.max(0,Math.min(max,pills+(action==='pill-plus'?1:-1)));updateMovePanel();playTone('pill');return;
  }
  if(action==='fury'){fury=!fury;pills=Math.min(pills,match.player.pills-(fury?3:0));updateMovePanel();playTone('select');return;}
  if(action==='commit')return commitMove();
  if(action==='next-round'){
    if(match.status==='finished')return matchEndModal({celebrate:true});closeModal();prepareRound();battleEntering=true;render();
    // The reveal table and its action are gone: keep keyboard and screen-reader
    // players on the new table's Commit rather than dropping them to <body>.
    if(!app.contains(document.activeElement))app.querySelector('.battle-table [data-action="commit"]')?.focus({preventScroll:true});
    const announced=permittedAnnouncement(match,aiMove,{revealPending});
    announce(`第 ${match.round} 回合開始。${announced?`對手亮出「${getCard(announced).name}」。`:'你持先手。'}`);return;
  }
  if(action==='history'){if(screen==='battle')button.focus({preventScroll:true});modal(`<div class="eyebrow">THE STORY SO FAR</div><h2>對弈紀錄</h2>${match.history.length?historyMarkup():'<p>勝負未定，故事才剛開始。</p>'}`);return;}
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
  if(bagField){bagView[bagField]=event.target.value;if(bagField!=='sort')bagView.printId='all';render();return;}

  if(event.target.id==='training-select'){trainingId=event.target.value;render();}
  if(event.target.id==='source-filter'){sourceFilter=event.target.value;render();}
});
window.addEventListener('pagehide',()=>{if(match?.status==='playing')try{persistBattle();}catch{}});
// Input that gives user activation (Escape gives none) opens a user turn for history pushes.
for(const type of ['pointerdown','keydown','touchend','click','submit'])window.addEventListener(type,event=>{if(event.isTrusted&&!(type==='keydown'&&event.key==='Escape'))nav.noteInput();},{capture:true,passive:true});
window.addEventListener('popstate',event=>nav.popstate(event.state));
window.addEventListener('pageshow',event=>nav.pageshow(event.persisted));
window.addEventListener('pagehide',event=>nav.pagehide(event.persisted));
function reloadLocalJourney() {
  if(!startupReady)return;
  try {
    syncProfile(loadProfile());
    if(packOpening&&packOpening.getState().receiptId!==profile.wx01.receipt?.id)closeModal();
    render();
  } catch(error) { toast(error.message); }
}
window.addEventListener('storage',event=>{if(event.key===PROFILE_KEY){reloadLocalJourney();account.markLocalChanged();}});
document.addEventListener('visibilitychange',()=>{document.body.dataset.pageHidden=String(document.hidden);if(!document.hidden)reloadLocalJourney();});
setInterval(()=>{if(!startupReady)return;const next=refreshDaily(profile);if(next.daily.date!==profile.daily.date||next.weekly.week!==profile.weekly.week){syncProfile(loadProfile());render();announce('任務手札與商旅貨架已更新。');}},30000);
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
    const cursor=event.target.selectionStart;bagView.query=event.target.value;bagView.printId='all';render();const input=document.querySelector('#bag-search');input?.setSelectionRange(cursor,cursor);return;
  }
  if(event.target.id==='bag-deck-name'){bagView.deckName=event.target.value;return;}

  if(event.target.id!=='pill-slider')return;
  pills=Number(event.target.value);const max=match.player.pills-(fury?3:0);
  const preview=previewMove(match,'player',{cardId:selected,pills,fury});
  app.querySelector('#pill-amount').textContent=pills;app.querySelector('#attack-value').textContent=preview.attack;
  app.querySelector('#cost-note').textContent=costNote(preview);
  app.querySelector('[data-action="pill-minus"]').disabled=pills===0;app.querySelector('[data-action="pill-plus"]').disabled=pills===max;
  updateResourcePreview();
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
  if(modalKind==='quests'&&event.target.matches('[data-action="quest-tab"]')&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
    event.preventDefault();
    const tabs=[...active.querySelectorAll('[data-action="quest-tab"]')],index=tabs.indexOf(event.target);
    const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    tabs[next]?.click();return;
  }
  if(event.key==='Escape'&&overlay.firstElementChild.dataset.dismissible==='true')dismissModal();
  if(event.key==='Tab'){
    const nodes=[...active.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(el=>el.tabIndex>=0&&el.getClientRects().length&&!el.hidden&&getComputedStyle(el).visibility!=='hidden');const first=nodes[0],last=nodes.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
});
await transact(p=>p);
saves.launch({fresh:freshJourney,standalone:isStandalone()}).catch(()=>{});
nav.start();
startupReady=true;
render();
