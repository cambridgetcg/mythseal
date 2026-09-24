/** Local design preview: no engine, player data, storage, economy or service calls. */
import { LZ01_SET, LZ01_CARDS, LZ01_AA, LZ01_SAMPLE, LZ01_FACTIONS, LZ01_RARITIES } from './liaozhai-cards.mjs';

const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const cardsById = new Map(LZ01_CARDS.map(card => [card.id, card]));
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const state = { treatment: 'aa', story: 'all', faction: 'all', phase: 'sealed', revealed: new Set(), dialogCard: null, dialogTreatment: 'base' };
let openingTimer = null;
let dialogReturnFocus = null;
let previousBodyOverflow = '';

const factionFor = card => LZ01_FACTIONS[card.faction];
const rarityFor = card => LZ01_RARITIES[card.rarity];
const artTreatment = (card, treatment) => treatment === 'aa' && card.id === LZ01_AA.cardId ? 'aa' : 'base';
const labelFor = value => typeof value === 'string' ? value : value.name || value.label;
const displayName = card => card.name.replace(/（.*）$/, '');
const sourceUrl = value => {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
};

function cardMarkup(card, treatment = 'base') {
  const mode = artTreatment(card, treatment), faction = factionFor(card), rarity = rarityFor(card), art = card.art;
  const column = art.index % art.columns, row = Math.floor(art.index / art.columns);
  const position = `${art.columns > 1 ? column / (art.columns - 1) * 100 : 0}% ${art.rows > 1 ? row / (art.rows - 1) * 100 : 0}%`;
  const portrait = mode === 'aa'
    ? `<span class="card-art"><img src="${escape(LZ01_AA.src)}" alt="" decoding="async"></span>`
    : `<span class="card-art" style="background-image:url('${escape(art.src)}');background-size:${art.columns * 100}% ${art.rows * 100}%;background-position:${position}"></span>`;
  return `<span class="printed-card rarity-${escape(card.rarity)}" data-card-id="${escape(card.id)}" data-treatment="${mode}" style="--faction:${escape(faction.color)}" aria-hidden="true">${portrait}<span class="card-shade"></span><span class="card-top"><span class="card-faction"><i>${escape(faction.icon || labelFor(faction).slice(0, 1))}</i>${escape(labelFor(faction))}</span><span class="card-stars">${'★'.repeat(card.stars)}</span></span><span class="card-print"><span class="card-title">${escape(card.title)}</span><strong class="card-name">${escape(displayName(card))}</strong><span class="card-numbers"><span><small>力量</small><b>${card.power}</b></span><span><small>傷害</small><b>${card.damage}</b></span><span class="card-rank">${escape(rarity.mark || rarity.icon || '◇')} ${escape(labelFor(rarity))}</span></span><span class="card-foot"><span>LZ-01 · ${escape(card.story)}</span><span class="print-mark">${mode === 'aa' ? '異畫 AA' : '本畫 BASE'}</span></span></span></span>`;
}

function renderHero() {
  const card = cardsById.get(LZ01_AA.cardId);
  $('#hero-card').innerHTML = cardMarkup(card, state.treatment);
  $('#hero-caption').textContent = `${card.name} · ${card.title}`;
  document.querySelectorAll('[data-action="treatment"]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.treatment === state.treatment)));
}

function renderFilters() {
  const stories = [...new Set(LZ01_CARDS.map(card => card.story))];
  $('#story-filters').innerHTML = [{ id: 'all', name: '全部故事' }, ...stories.map(story => ({ id: story, name: story }))].map(story => `<button type="button" class="filter-button" data-action="filter-story" data-story="${escape(story.id)}" aria-pressed="${story.id === state.story}">${escape(story.name)}</button>`).join('');
  $('#faction-filter').innerHTML = `<option value="all">全部陣營</option>${[...new Set(LZ01_CARDS.map(card => card.faction))].map(id => `<option value="${escape(id)}">${escape(labelFor(LZ01_FACTIONS[id]))}</option>`).join('')}`;
  $('#faction-filter').value = state.faction;
}

function renderCatalogue() {
  const cards = LZ01_CARDS.filter(card => (state.story === 'all' || card.story === state.story) && (state.faction === 'all' || card.faction === state.faction));
  $('#catalogue-grid').innerHTML = cards.map(card => `<article class="catalogue-entry"><button class="catalogue-card-button" type="button" data-action="inspect" data-card-id="${escape(card.id)}" aria-label="查看${escape(card.name)}，${card.stars} 星，力量 ${card.power}，傷害 ${card.damage}">${cardMarkup(card)}</button><h3>${escape(card.name)}</h3><p class="card-story">${escape(card.story)} · ${escape(labelFor(factionFor(card)))} · ${card.stars} 星</p><div class="catalogue-ability"><strong>${escape(card.ability.label)}</strong><p>${escape(card.ability.description)}</p></div><button class="text-link" type="button" data-action="inspect" data-card-id="${escape(card.id)}" aria-label="細讀${escape(card.name)}的故事與規則">細讀此卡 <span aria-hidden="true">↗</span></button></article>`).join('');
  $('#empty-state').hidden = cards.length !== 0;
  $('#catalogue-count').textContent = `${cards.length} / ${LZ01_CARDS.length} 位來客${state.story !== 'all' ? ` · ${state.story}` : ''}`;
  document.querySelectorAll('[data-action="filter-story"]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.story === state.story)));
}

function renderSample({ justRevealed = -1 } = {}) {
  $('#sample-stage').dataset.phase = state.phase;
  const sealed = state.phase === 'sealed' || state.phase === 'opening';
  $('#sealed-scene').hidden = !sealed;
  $('[data-action="open-sample"]').disabled = state.phase !== 'sealed';
  $('#sample-cards').hidden = sealed;
  $('#sample-cards').innerHTML = LZ01_SAMPLE.map((entry, index) => {
    const card = cardsById.get(entry.cardId), shown = state.revealed.has(index);
    const mode = artTreatment(card, entry.treatment);
    return `<div class="sample-slot${justRevealed === index ? ' just-revealed' : ''}" data-index="${index}">${shown ? `<button class="sample-face" type="button" data-action="inspect" data-card-id="${escape(card.id)}" data-treatment="${mode}" aria-label="查看${escape(card.name)}，${mode === 'aa' ? '異畫 AA' : '本畫'}">${cardMarkup(card, mode)}</button>` : `<button class="sample-back" type="button" data-action="reveal-card" data-index="${index}" aria-label="揭開第 ${index + 1} 張固定展示卡"${state.phase !== 'ready' ? ' disabled' : ''}><span aria-hidden="true">契</span><small>${['壹', '貳', '參'][index]}</small><em>輕觸揭曉</em></button>`}<div class="sample-label"><strong>${shown ? escape(card.name) : `第 ${index + 1} 張`}</strong><small>${shown ? `${mode === 'aa' ? '異畫 AA' : '本畫 BASE'} · 點卡細讀` : '固定展示 · 待揭曉'}</small></div></div>`;
  }).join('');
  $('[data-action="skip-sample"]').disabled = state.phase === 'complete';
  $('[data-action="restart-sample"]').disabled = !['ready', 'complete'].includes(state.phase);
  $('#sample-status').textContent = state.phase === 'sealed' ? '信已送到 · 輕觸封印開始展示' : state.phase === 'opening' ? '信封漸開，燈下有客。' : state.phase === 'ready' ? `已揭曉 ${state.revealed.size} / ${LZ01_SAMPLE.length} 張 · 請輕觸卡背` : '三位來客，已悉數見面。展示完畢，未加入背包。';
}

function cancelOpening() {
  if (openingTimer !== null) clearTimeout(openingTimer);
  openingTimer = null;
}

function focusNextSample() {
  const next = $('#sample-cards [data-action="reveal-card"]');
  (next || $('[data-action="restart-sample"]')).focus({ preventScroll: true });
}

function openSample() {
  if (state.phase !== 'sealed') return;
  cancelOpening();
  state.phase = 'opening';
  renderSample();
  const finish = () => {
    if (state.phase !== 'opening') return;
    openingTimer = null;
    state.phase = 'ready';
    renderSample();
    focusNextSample();
  };
  if (motion.matches) finish();
  else openingTimer = setTimeout(finish, 420);
}

function revealCard(index) {
  if (state.phase !== 'ready' || !Number.isInteger(index) || index < 0 || index >= LZ01_SAMPLE.length || state.revealed.has(index)) return;
  state.revealed.add(index);
  if (state.revealed.size === LZ01_SAMPLE.length) state.phase = 'complete';
  renderSample({ justRevealed: index });
  const entry = LZ01_SAMPLE[index];
  $('#announcer').textContent = `第 ${index + 1} 張：${cardsById.get(entry.cardId).name}，${entry.treatment === 'aa' ? '異畫 AA' : '本畫'}。`;
  focusNextSample();
}

function skipSample() {
  if (!['sealed', 'opening', 'ready'].includes(state.phase)) return;
  cancelOpening();
  state.revealed = new Set(LZ01_SAMPLE.map((_, index) => index));
  state.phase = 'complete';
  renderSample();
  $('[data-action="restart-sample"]').focus({ preventScroll: true });
}

function restartSample() {
  if (!['ready', 'complete'].includes(state.phase)) return;
  cancelOpening();
  state.revealed = new Set();
  state.phase = 'sealed';
  renderSample();
  $('[data-action="open-sample"]').focus({ preventScroll: true });
}

function renderDialog() {
  const card = cardsById.get(state.dialogCard), faction = factionFor(card), rarity = rarityFor(card), link = sourceUrl(card.sourceUrl);
  const hasAA = card.id === LZ01_AA.cardId;
  $('#dialog-content').innerHTML = `<div class="dialog-layout"><div class="dialog-art">${cardMarkup(card, state.dialogTreatment)}${hasAA ? `<div class="segmented" role="group" aria-label="詳情中的聶小倩畫作"><button type="button" data-action="dialog-treatment" data-treatment="base" aria-pressed="${state.dialogTreatment === 'base'}">本畫 <small>BASE</small></button><button type="button" data-action="dialog-treatment" data-treatment="aa" aria-pressed="${state.dialogTreatment === 'aa'}">異畫 <small>AA</small></button></div>` : ''}</div><div class="dialog-copy"><p class="eyebrow">LZ-01 <span aria-hidden="true">／</span> ${escape(card.story)} <span aria-hidden="true">／</span> ${escape(labelFor(rarity))}</p><h2 id="dialog-title">${escape(card.name)}</h2><p class="dialog-subtitle">${escape(card.title)}</p><dl class="dialog-stats"><div><dt>力量</dt><dd>${card.power}</dd></div><div><dt>傷害</dt><dd>${card.damage}</dd></div><div><dt>星數</dt><dd>${card.stars}</dd></div><div><dt>陣營</dt><dd class="small-value">${escape(labelFor(faction))}</dd></div></dl><div class="dialog-ability"><h3>${escape(card.ability.label)}</h3><p id="dialog-description">${escape(card.ability.description)}</p></div><p class="dialog-lore">${escape(card.lore)}</p>${link ? `<a class="dialog-source" href="${escape(link)}" target="_blank" rel="noopener noreferrer">翻閱原著 · ${escape(card.story)} <span aria-hidden="true">↗</span></a>` : ''}<p class="dialog-note"><b>候選卡 · 規則與數值尚待試玩。</b><br>${hasAA ? '本畫與異畫共用同一套數值、技能與牌組名額。' : '本頁僅供設計預覽，卡牌未加入正式卡池。'}</p></div></div>`;
}

function openDialog(id, treatment = 'base') {
  if (!cardsById.has(id) || $('#card-dialog').open) return;
  state.dialogCard = id;
  state.dialogTreatment = artTreatment(cardsById.get(id), treatment);
  dialogReturnFocus = document.activeElement;
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  renderDialog();
  $('#card-dialog').showModal();
  $('#card-dialog').scrollTop = 0;
  $('[data-action="close-dialog"]').focus({ preventScroll: true });
}

function closeDialog() { if ($('#card-dialog').open) $('#card-dialog').close(); }

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  switch (button.dataset.action) {
    case 'treatment':
      if (!['base', 'aa'].includes(button.dataset.treatment)) return;
      state.treatment = button.dataset.treatment;
      renderHero();
      $('#announcer').textContent = `聶小倩 · ${state.treatment === 'aa' ? '異畫 AA' : '本畫 BASE'}，數值與技能相同。`;
      break;
    case 'inspect-hero': openDialog(LZ01_AA.cardId, state.treatment); break;
    case 'inspect': openDialog(button.dataset.cardId, button.dataset.treatment || 'base'); break;
    case 'close-dialog': closeDialog(); break;
    case 'dialog-treatment':
      if (!$('#card-dialog').open || !['base', 'aa'].includes(button.dataset.treatment)) return;
      state.dialogTreatment = button.dataset.treatment;
      renderDialog();
      $(`[data-action="dialog-treatment"][data-treatment="${state.dialogTreatment}"]`).focus({ preventScroll: true });
      break;
    case 'filter-story': state.story = button.dataset.story; renderCatalogue(); break;
    case 'clear-filters':
      state.story = 'all'; state.faction = 'all';
      $('#faction-filter').value = 'all'; renderCatalogue();
      $('[data-action="filter-story"][data-story="all"]').focus({ preventScroll: true });
      break;
    case 'open-sample': openSample(); break;
    case 'reveal-card': revealCard(Number(button.dataset.index)); break;
    case 'skip-sample': skipSample(); break;
    case 'restart-sample': restartSample(); break;
  }
});

$('#faction-filter').addEventListener('change', event => { state.faction = event.target.value; renderCatalogue(); });
$('#card-dialog').addEventListener('close', () => {
  document.body.style.overflow = previousBodyOverflow;
  state.dialogCard = null;
  if (dialogReturnFocus?.isConnected) dialogReturnFocus.focus({ preventScroll: true });
  dialogReturnFocus = null;
});
$('#card-dialog').addEventListener('click', event => {
  if (event.target !== $('#card-dialog')) return;
  const bounds = $('#card-dialog').getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog();
});
window.addEventListener('pagehide', cancelOpening);
window.addEventListener('pageshow', event => {
  if (event.persisted && state.phase === 'opening') { state.phase = 'ready'; renderSample(); }
});

// The isolated local atelier has its own port; return to the existing game origin.
if (location.hostname === '127.0.0.1' && location.port === '4178') {
  document.querySelectorAll('a[href="/"]').forEach(link => { link.href = 'http://127.0.0.1:4177/'; });
}

renderHero();
renderFilters();
renderCatalogue();
renderSample();
$('#set-sources').innerHTML = LZ01_SET.sources.map(source => {
  const link = sourceUrl(source.url);
  return link ? `<a href="${escape(link)}" target="_blank" rel="noopener noreferrer">${escape(source.title)} <span aria-hidden="true">↗</span></a>` : '';
}).join('');
