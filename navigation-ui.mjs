/** The game shell reads the local journey; navigation and persistence stay in app.mjs. */
import { CARDS, getCard } from './engine.mjs';
import { getActiveDeck, getInstance } from './collection.mjs';
import { NODES, getHeroLevel, getArenaRank, getDailyTasks } from './progression.mjs';

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

export function gameHeaderMarkup({ profile, screen, sound, accountButton }) {
  const battle = screen === 'battle';
  const brand = `<img src="assets/mark.svg" alt=""><span><span class="brand-name">萬象契</span><span class="brand-en">MYTHSEAL</span></span>`;
  if (battle) return `<header class="game-header is-battle"><div class="game-brand">${brand}</div><div class="game-utilities"><button type="button" data-action="rules">弈道</button><button type="button" class="game-menu-button" data-action="battle-menu" aria-label="對局選單">☰ <span>對局選單</span></button></div></header>`;
  return `<header class="game-header">
    <button type="button" class="game-brand" data-action="home" aria-label="萬象契 · 返回洞府">${brand}</button>
    <div class="game-header-resources wallet" aria-label="旅途所得"><span title="金幣"><span aria-hidden="true">◈</span> <b>${number(profile.coins)}</b><small>金幣</small></span><span title="靈砂"><span aria-hidden="true">✧</span> <b>${number(profile.dust)}</b><small>靈砂</small></span></div>
    <div class="game-player">${accountButton}<span class="game-player-level">執令者 · Lv.${getHeroLevel(profile)}</span></div>
    <button type="button" class="icon-button game-sound" data-action="sound" aria-label="${sound ? '關閉' : '開啟'}音效" aria-pressed="${sound}">${sound ? '♫' : '♪'}</button>
  </header>`;
}

export function gameDockMarkup(screen) {
  if (screen === 'battle') return '';
  const active = screen === 'collection' ? 'bag' : screen;
  const destinations = [['home', '洞府'], ['world', '遊歷'], ['arena', '對弈'], ['bag', '藏卡'], ['market', '市集']];
  return `<nav class="game-dock" aria-label="山海主選單">${destinations.map(([id, label]) => `<button type="button" data-action="${id}" class="game-destination${active === id ? ' is-current' : ''}"${active === id ? ' aria-current="page"' : ''}>${icon(id)}<span>${label}</span></button>`).join('')}</nav>`;
}

export function lobbyMarkup(profile, cardMarkup) {
  const deck = getActiveDeck(profile);
  const instances = (deck?.instanceIds || []).map(uid => getInstance(profile, uid));
  const stars = instances.reduce((total, instance) => total + getCard(instance.cardId).stars, 0);
  const node = NODES.find(item => item.id === profile.pending?.nodeId)
    || NODES.find(item => !profile.cleared.includes(item.id))
    || NODES.find(item => item.id === profile.location) || NODES[0];
  const nodeIndex = NODES.indexOf(node);
  const rank = getArenaRank(profile);
  const tasks = getDailyTasks(profile);
  const claimable = Number(!profile.daily.loginClaimed) + tasks.filter(task => !task.claimed && task.progress >= task.target).length
    + Number(!profile.daily.arenaChestClaimed && profile.daily.arenaMatches >= 3);
  const ownedRoles = CARDS.filter(card => profile.inventory[card.id] > 0).length;
  const firstVisit = profile.stats.played === 0 && !profile.pending;
  const pendingKind = { arena: '問道擂台', practice: '自由切磋' }[profile.pending?.kind];
  const title = pendingKind || node.name;
  const subtitle = profile.pending ? '棋局仍在，靜候你歸來。' : node.description;
  return `<main class="game-lobby screen-enter" aria-labelledby="lobby-title">
    <div class="lobby-arrival"><div><span class="lobby-kicker">洞府 <span aria-hidden="true">·</span> 執令者 Lv.${getHeroLevel(profile)}</span><h1 id="lobby-title">${firstVisit ? '初入山海，請落第一子。' : '回來了，執令者。'}</h1></div><button type="button" class="lobby-quest" data-action="quests">${icon('quests')}<span>每日功課<small>${claimable ? `${claimable} 份獎勵可領` : `${tasks.filter(task => task.claimed).length} / ${tasks.length} 功課已領`}</small></span>${claimable ? `<b class="lobby-quest-count" aria-label="${claimable} 份獎勵可領">${claimable}</b>` : ''}</button></div>
    <section class="lobby-realm" aria-labelledby="lobby-realm-title">
      <div class="lobby-landscape" aria-hidden="true"></div>
      <div class="lobby-realm-art"><div class="lobby-halo" aria-hidden="true"></div><div class="lobby-card-fan" aria-label="目前牌組的同行戰卡">${instances.slice(0, 3).map(instance => cardMarkup(getCard(instance.cardId), { small: true, action: 'instance-inspect', instanceId: instance.uid })).join('')}</div><span class="lobby-art-caption">${safe(deck?.name || '整備同行者')} <span aria-hidden="true">·</span> 萬象相隨</span></div>
      <div class="lobby-route"><div class="lobby-location"><span class="lobby-route-seal" aria-hidden="true">${profile.pending ? '弈' : '旅'}</span><span>${profile.pending ? '未完對局 · 進度已保留' : profile.cleared.length === NODES.length ? '六境已通 · 再遊山海' : `下一站 · 第 ${nodeIndex + 1} 境`}</span></div><h2 id="lobby-realm-title">${safe(title)}</h2><p>${safe(subtitle)}</p><button type="button" class="primary lobby-continue" data-action="${profile.pending ? 'resume' : 'continue-journey'}">${profile.pending ? '繼續對局' : firstVisit ? '啟程遊歷' : '繼續遊歷'} <span aria-hidden="true">→</span></button><div class="lobby-route-footnote">${profile.pending ? '原有牌組與對局進度保留' : '四回合對弈 · AI 守境人'}</div></div>
      <div class="lobby-trail" aria-label="六境旅途，已通過 ${profile.cleared.length} 境"><span>六境旅途</span><div class="lobby-trail-marks" aria-hidden="true">${NODES.map(item => `<i class="${profile.cleared.includes(item.id) ? 'is-cleared' : item.id === node.id ? 'is-next' : ''}"></i>`).join('')}</div><b>${profile.cleared.length} <small>/ ${NODES.length}</small></b><button type="button" class="text-button" data-action="world">展開輿圖 <span aria-hidden="true">↗</span></button></div>
    </section>
    <section class="lobby-deck" aria-labelledby="lobby-deck-title"><div class="lobby-deck-heading"><div><span class="lobby-kicker">目前出戰</span><h2 id="lobby-deck-title">${safe(deck?.name || '尚未整備')}</h2></div><span class="lobby-deck-count">${instances.length} 張 <span aria-hidden="true">·</span> ${stars} 星</span><button type="button" class="text-button" data-action="lobby-deck">整備牌組 <span aria-hidden="true">↗</span></button></div><div class="lobby-deck-strip">${instances.map(instance => { const card = getCard(instance.cardId); return `<button type="button" class="lobby-card-copy" data-action="instance-inspect" data-id="${safe(instance.uid)}" aria-label="查看${safe(card.name)}，等級 ${instance.level}，卡牌編號 ${safe(instance.uid)}"><span class="lobby-card-portrait" aria-hidden="true" style="background-image:url(assets/${card.artSet === 'classics' ? 'classics' : 'portraits'}.png);background-position:${card.art % 4 / 3 * 100}% ${Math.floor(card.art / 4) / 2 * 100}%"></span><span class="lobby-card-name">${safe(card.name)}</span><small>Lv.${instance.level}</small></button>`; }).join('')}</div></section>
    <div class="lobby-ledger"><span>萬象入藏 <b>${ownedRoles}<small> / ${CARDS.length}</small></b></span><span>${safe(rank.name)} <b>${number(profile.arena.points)}<small> 積分</small></b></span><button type="button" class="text-button" data-action="rules">${firstVisit ? '初次落子？讀懂弈道' : '溫習弈道'} <span aria-hidden="true">↗</span></button></div>
  </main>`;
}
