/** The game shell reads the local journey; navigation and persistence stay in app.mjs. */
import { CARDS, getCard } from './engine.mjs';
import { getActiveDeck, getInstance } from './collection.mjs';
import { NODES, getHeroLevel, getArenaRank, getDailyTasks, getWeeklyTasks, isNodeUnlocked } from './progression.mjs';
import { getWorldForNode } from './stories.mjs';
import { cardArtStyle, cardPresentation, leaderInstance, leaderPortraitMarkup } from './card-presentation.mjs';
import { isFirstVisit } from './first-visit.mjs';

const safe = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const number = value => Number(value || 0).toLocaleString('zh-Hant');
const paths = {
  home: '<path d="m3 11 9-7 9 7M6 10v10h12V10M9 20v-7h6v7M3 21h18"/>',
  world: '<path d="m2 19 7-12 5 8 3-5 5 9H2Z"/><path d="m6 12 3 1 2-2M15 5h4M17 3v4"/>',
  arena: '<path d="m4 3 4 1 11 12-3 3L4 7 4 3ZM3 17l4 4M5 19l4-4M15 9l5-5M17 3l4 1-1 4M15 20l5-5M18 18l3 3"/>',
  bag: '<rect x="7" y="4" width="13" height="17" rx="2"/><path d="M5 17H3V2h13M13.5 8l2.5 4-2.5 4-2.5-4 2.5-4Z"/>',
  market: '<path d="M3 9h18l-2-5H5L3 9ZM5 10v10h14V10M2 20h20M9 20v-6h6v6M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>',
  quests: '<path d="M7 4h12v13a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-1h11v1a3 3 0 0 0 6 0M7 4a2 2 0 0 0-4 0v2h4V4Zm0 2v10M10 8h6M10 11h6"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.home}</svg>`;

/** T1 (docs/TUTORIAL-T1.md §4): each resource opens its 詞彙 entry. The span keeps the wallet's
 * breakpoints; the button's name starts with its visible text. */
const resourceButton = (id, mark, value, name) => `<span><button type="button" class="game-resource" data-action="glossary" data-id="${id}" aria-label="${number(value)} ${name}，查看說明"><span aria-hidden="true">${mark}</span> <b>${number(value)}</b><small>${name}</small></button></span>`;

export function gameHeaderMarkup({ profile, screen, sound, accountButton }) {
  const battle = screen === 'battle';
  const brand = `<img src="assets/mark.svg" alt=""><span><span class="brand-name">萬象契</span><span class="brand-en">MYTHSEAL</span></span>`;
  if (battle) return `<header class="game-header is-battle"><div class="game-brand">${brand}</div><div class="game-utilities"><button type="button" data-action="rules">弈道</button><button type="button" class="game-experience" data-action="experience-settings" aria-label="聲息與節奏">☷</button><button type="button" class="game-menu-button" data-action="battle-menu" aria-label="對局選單">☰ <span>對局選單</span></button></div></header>`;
  return `<header class="game-header">
    <button type="button" class="game-brand" data-action="home" aria-label="萬象契 · 返回洞府">${brand}</button>
    <div class="game-header-resources wallet" role="group" aria-label="旅途所得">${resourceButton('coins', '◈', profile.coins, '金幣')}${resourceButton('dust', '✧', profile.dust, '靈砂')}</div>
    <div class="game-player">${accountButton}<button type="button" class="game-player-level" data-action="glossary" data-id="hero-level" aria-label="執令者 · Lv.${getHeroLevel(profile)}，查看說明">執令者 · Lv.${getHeroLevel(profile)}</button></div>
    <button type="button" class="icon-button game-sound game-experience" data-action="experience-settings" aria-label="聲息與節奏" title="聲息與節奏">☷</button>
  </header>`;
}

export function gameDockMarkup(screen) {
  if (screen === 'battle') return '';
  const active = screen === 'collection' ? 'bag' : screen;
  const destinations = [['home', '洞府'], ['world', '遊歷'], ['arena', '對弈'], ['bag', '藏卡'], ['market', '市集']];
  return `<nav class="game-dock" aria-label="山海主選單">${destinations.map(([id, label]) => `<button type="button" data-action="${id}" class="game-destination${active === id ? ' is-current' : ''}"${active === id ? ' aria-current="page"' : ''}>${icon(id)}<span>${label}</span></button>`).join('')}</nav>`;
}

export function lobbyMarkup(profile, cardMarkup, selectedNode = profile.location) {
  const deck = getActiveDeck(profile);
  const leader = leaderInstance(profile);
  const leaderBanner = leader ? `<div class="lobby-leader">${leaderPortraitMarkup(profile)}<div><span>此程領契 · 僅作肖像</span><b>${safe(cardPresentation(leader.cardId, { printId: leader.printId }).name)}</b></div><button type="button" class="text-button" data-action="instance-inspect" data-id="${safe(leader.uid)}">查看 ↗</button></div>` : '';
  const instances = (deck?.instanceIds || []).map(uid => getInstance(profile, uid));
  const stars = instances.reduce((total, instance) => total + getCard(instance.cardId).stars, 0);
  const selected = NODES.find(item => item.id === selectedNode) || NODES.find(item => item.id === profile.location) || NODES[0];
  const world = getWorldForNode(profile.pending?.nodeId || selected.id);
  const nodes = world.nodeIds.map(id => NODES.find(item => item.id === id));
  const node = NODES.find(item => item.id === profile.pending?.nodeId)
    || nodes.find(item => !profile.cleared.includes(item.id) && isNodeUnlocked(profile, item.id))
    || nodes.find(item => item.id === selected.id) || nodes[0];
  const nodeIndex = nodes.indexOf(node), completed = nodes.filter(item => profile.cleared.includes(item.id)).length;
  const rank = getArenaRank(profile);
  const tasks = getDailyTasks(profile), weekly = getWeeklyTasks(profile);
  const claimable = Number(!profile.daily.loginClaimed) + [...tasks, ...weekly].filter(task => !task.claimed && task.progress >= task.target).length
    + Number(!profile.daily.arenaChestClaimed && profile.daily.arenaMatches >= 3);
  const ownedRoles = CARDS.filter(card => profile.inventory[card.id] > 0).length;
  const firstVisit = isFirstVisit(profile);
  const pendingKind = { arena: '問道擂台', practice: '自由切磋' }[profile.pending?.kind];
  const title = pendingKind || node.name;
  const blocked = !profile.pending && !isNodeUnlocked(profile, node.id);
  const subtitle = profile.pending ? '棋局仍在，靜候你歸來。' : node.description;
  return `<main class="game-lobby scene-lobby screen-enter" data-viewport-surface aria-labelledby="lobby-title">
    <div class="lobby-arrival"><div><span class="lobby-kicker">洞府 <span aria-hidden="true">·</span> 執令者 Lv.${getHeroLevel(profile)}</span><h1 id="lobby-title">${firstVisit ? '初入山海，請落第一子。' : '回來了，執令者。'}</h1></div><button type="button" class="lobby-quest" data-action="quests">${icon('quests')}<span>任務手札<small>${claimable ? `${claimable} 份獎勵可領` : '日課與週記，慢慢積累'}</small></span>${claimable ? `<b class="lobby-quest-count" aria-label="${claimable} 份獎勵可領">${claimable}</b>` : ''}</button></div>
    <section class="lobby-realm" aria-labelledby="lobby-realm-title">
      <div class="lobby-landscape lobby-story-landscape" style="--lobby-story-map:url('${world.map}')" aria-hidden="true"></div>
      <div class="lobby-realm-art"><div class="lobby-halo" aria-hidden="true"></div><div class="lobby-card-fan" aria-label="目前牌組的同行戰卡">${instances.slice(0, 3).map(instance => cardMarkup(getCard(instance.cardId), { small: true, action: 'instance-inspect', instanceId: instance.uid, printId: instance.printId })).join('')}</div><span class="lobby-art-caption">${safe(deck?.name || '整備同行者')} <span aria-hidden="true">·</span> 萬象相隨</span></div>
      <div class="lobby-route"><div class="lobby-location"><span class="lobby-route-seal" aria-hidden="true">${profile.pending ? '弈' : '旅'}</span><span>${profile.pending ? '未完對局 · 進度已保留' : completed === nodes.length ? `${safe(world.name)} · 全卷已成` : `${safe(world.name)} · 第 ${nodeIndex + 1} 境`}</span></div><h2 id="lobby-realm-title">${safe(title)}</h2><p>${safe(subtitle)}</p><button type="button" class="primary lobby-continue" data-action="${profile.pending ? 'resume' : blocked ? 'story-unlock' : 'continue-journey'}">${profile.pending ? '繼續對局' : blocked ? '先赴霧隱渡口' : firstVisit ? '啟程遊歷' : '繼續遊歷'} <span aria-hidden="true">→</span></button><div class="lobby-route-footnote">${profile.pending ? '原有牌組與對局進度保留' : blocked ? '渡口首勝後，展開此卷' : '四回合對弈 · AI 守境人'}</div></div>
      <div class="lobby-trail" aria-label="${safe(world.name)}，已通過 ${completed} 境"><span>${safe(world.name.split(' · ')[0])}行卷</span><div class="lobby-trail-marks" aria-hidden="true">${nodes.map(item => `<i class="${profile.cleared.includes(item.id) ? 'is-cleared' : item.id === node.id ? 'is-next' : ''}"></i>`).join('')}</div><b>${completed} <small>/ ${nodes.length}</small></b><button type="button" class="text-button" data-action="world">展開輿圖 <span aria-hidden="true">↗</span></button></div>
    </section>
    <div class="scene-lobby-companions">${leaderBanner}<button type="button" class="lobby-deck scene-deck-button" data-action="lobby-deck" aria-label="整備目前出戰牌組：${safe(deck?.name || '尚未整備')}，${instances.length} 張，${stars} 星"><span class="scene-deck-portraits" aria-hidden="true">${instances.slice(0,3).map(instance=>`<span class="lobby-card-portrait" aria-hidden="true" data-print-id="${safe(instance.printId || '')}" style="${cardArtStyle(instance.cardId,{printId:instance.printId})}"></span>`).join('')}</span><span><small>目前出戰 · ${instances.length} 張 · ${stars} 星</small><b>${safe(deck?.name || '尚未整備')}</b></span><span class="scene-deck-link">整備 ↗</span></button></div>
    <div class="lobby-ledger"><span>萬象入藏 <b>${ownedRoles}<small> / ${CARDS.length}</small></b></span><span>${safe(rank.name)} <b>${number(profile.arena.points)}<small> 積分</small></b></span><button type="button" class="text-button" data-action="rules">${firstVisit ? '初次落子？讀懂弈道' : '溫習弈道'} <span aria-hidden="true">↗</span></button></div>
  </main>`;
}
