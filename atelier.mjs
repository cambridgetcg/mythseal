/** An isolated art study. It never reads or writes a player journey. */
import { getCard, FACTIONS } from './engine.mjs';

const TREATMENTS = Object.freeze([
  { id: 'base', short: '本畫', code: 'BASE', name: '本畫 · 齊天行者', image: null, caption: '細金立界，保留熟悉的第一面。', description: '原有千古群英畫作，配細金卡框與清楚的品階印。赤燼的焰色另落在陣營章上。', mark: '本畫' },
  { id: 'alt', short: '異畫', code: 'AA', name: '異畫 · 踏碎凌霄', image: 'assets/expansion/wukong-alt.png', caption: '讓一場騰躍，越過畫框。', description: '展開整幅雲海，以留白與流雲收住四角。這是同一位孫悟空的另一個瞬間。', mark: '異畫 AA' },
  { id: 'ink', short: '墨卷', code: 'INK', name: '墨卷 · 大鬧天宮', image: 'assets/expansion/wukong-ink.png', caption: '墨色留勢，朱印留名。', description: '用墨線、紙色與一枚朱印，記下行者的力道。黑白之間，讓畫面先說話。', mark: '墨卷 INK' },
  { id: 'treasure', short: '天工', code: 'TR', name: '天工 · 定海神珍', image: 'assets/expansion/wukong-treasure.png', caption: '玄漆之上，刻一道西行金痕。', description: '深黑漆面配沉金紋飾，像一件握在手中的藏品。光落在邊緣，畫作仍是主角。', mark: '天工 TR' },
]);
const RARITIES = Object.freeze({ common: { name: '凡品', mark: '○' }, rare: { name: '靈品', mark: '◇' }, epic: { name: '神品', mark: '✦' } });
const hero = getCard('wukong');
const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const treatmentFor = id => TREATMENTS.find(t => t.id === id) || TREATMENTS[0];
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let selected = 'base';
let finish = 'ink';
let phase = 'sealed';
let revealed = new Set();
let revealEffects = new Set();
let timers = [];

const cloudCorners = `<svg class="card-clouds" viewBox="0 0 300 420" preserveAspectRatio="none" aria-hidden="true"><path d="M8 63V24q0-16 16-16h38M12 48q20 4 12-12q-4-9 7-10q9 0 8-14M238 8h38q16 0 16 16v39M252 12q-4 20 12 12q9-4 10 7q0 9 14 8M8 357v39q0 16 16 16h38M12 372q20-4 12 12q-4 9 7 10q9 0 8 14M238 412h38q16 0 16-16v-39M252 408q-4-20 12-12q9 4 10-7q0-9 14-8"/></svg>`;
const engraving = `<svg class="card-engraving" viewBox="0 0 300 420" preserveAspectRatio="none" aria-hidden="true"><path d="M14 78V14h64m144 0h64v64M14 342v64h64m144 0h64v-64M21 67V21h46m166 0h46v46M21 353v46h46m166 0h46v-46M103 10l10 8 10-8 10 8 17-10 17 10 10-8 10 8 10-8M103 410l10-8 10 8 10-8 17 10 17-10 10 8 10-8 10 8"/><circle cx="150" cy="172" r="91"/><circle cx="150" cy="172" r="97" stroke-dasharray="2 7"/></svg>`;

function cardMarkup(card, treatment = 'base', { rarity = 'epic', mini = false } = {}) {
  const art = treatmentFor(treatment), rank = RARITIES[rarity], faction = FACTIONS[card.faction];
  const portrait = art.image
    ? `<img class="collector-art" src="${art.image}" alt="" decoding="async">`
    : `<div class="collector-art atlas-art" style="background-image:url('assets/classics.png');background-position:${card.art % 4 / 3 * 100}% ${Math.floor(card.art / 4) / 2 * 100}%" aria-hidden="true"></div>`;
  return `<article class="collector-card treatment-${treatment} rarity-${rarity}${mini ? ' is-mini' : ''}" data-card-id="${card.id}" data-treatment="${treatment}" data-rarity="${rarity}" style="--faction:${faction.color}" aria-label="${safe(card.name)}，${rank.name}，${art.mark}，${card.stars} 星，力量 ${card.power}，傷害 ${card.damage}，${safe(card.ability.label)}">
    ${portrait}<div class="card-shade" aria-hidden="true"></div>${treatment === 'alt' ? cloudCorners : treatment === 'treasure' ? engraving : ''}
    <div class="collector-top"><span class="collector-faction"><i aria-hidden="true">${faction.icon}</i>${faction.name}</span><span class="collector-stars" aria-label="${card.stars} 星">${'★'.repeat(card.stars)}</span></div>
    ${treatment === 'ink' ? '<span class="ink-seal" aria-hidden="true">墨<br>卷</span>' : ''}
    <div class="collector-print"><span class="collector-title">${safe(card.title)}</span><h3>${safe(card.name)}</h3><div class="collector-stats"><span><small>力量</small><b data-card-power>${card.power}</b></span><span><small>傷害</small><b data-card-damage>${card.damage}</b></span><span class="collector-rarity">${rank.mark}<small>${rank.name}</small></span></div><p class="collector-ability" data-ability="${card.ability.type}">${safe(card.ability.label)}</p><div class="collector-foot"><span>${rank.mark} ${rank.name}</span><span>${art.mark}</span></div></div>
  </article>`;
}

function renderTreatment() {
  const art = treatmentFor(selected);
  document.querySelector('#hero-card').innerHTML = cardMarkup(hero, selected);
  document.querySelector('#hero-caption').textContent = art.caption;
  document.querySelector('#treatment-index').textContent = `0${TREATMENTS.indexOf(art) + 1} / ${art.code}`;
  document.querySelector('#treatment-title').textContent = art.name;
  document.querySelector('#treatment-description').textContent = art.description;
  document.querySelector('#treatment-tag').textContent = art.mark;
  for (const button of document.querySelectorAll('[data-action="select-treatment"]')) {
    button.setAttribute('aria-pressed', String(button.dataset.id === selected));
  }
}

function renderSamples() {
  document.querySelector('#treatment-picker').innerHTML = TREATMENTS.map(art => `<button type="button" class="treatment-choice" data-action="select-treatment" data-id="${art.id}" aria-pressed="${art.id === selected}" aria-label="查看孫悟空${art.mark}"><span class="treatment-thumb" aria-hidden="true">${cardMarkup(hero, art.id, { mini: true })}</span><span class="treatment-choice-name">${art.short}<small>${art.code}</small></span><span class="treatment-check" aria-hidden="true">✓</span></button>`).join('');
  document.querySelector('#rarity-samples').innerHTML = [['kongzi', 'common'], ['guanyu', 'rare'], ['wukong', 'epic']].map(([id, rarity]) => `<figure class="rarity-sample">${cardMarkup(getCard(id), 'base', { rarity, mini: true })}<figcaption><b>${getCard(id).name}</b><span class="rarity-label rarity-${rarity}">${RARITIES[rarity].mark} ${RARITIES[rarity].name}</span></figcaption></figure>`).join('');
}

function cancelTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}
function schedule(callback, delay) {
  timers.push(setTimeout(callback, delay));
}
function announce(message) {
  document.querySelector('#atelier-announcer').textContent = message;
}
function currentCards() { return ['base', 'alt', finish]; }

function renderDemo() {
  const demo = document.querySelector('#booster-demo');
  demo.dataset.phase = phase;
  document.querySelector('#booster-scene').hidden = !['sealed', 'opening'].includes(phase);
  document.querySelector('[data-action="open-pack"]').disabled = phase === 'opening';
  const cards = document.querySelector('#demo-cards');
  cards.hidden = !['ready', 'complete'].includes(phase);
  cards.innerHTML = currentCards().map((treatment, index) => {
    const shown = revealed.has(index), art = treatmentFor(treatment);
    return `<div class="demo-slot${shown ? ' is-revealed' : ''}${revealEffects.has(index) ? ' just-revealed' : ''}" data-slot="${index}"><div class="demo-card-face"${shown ? '' : ' hidden'}>${cardMarkup(hero, treatment, { mini: true })}</div><button type="button" class="demo-card-back" data-action="reveal-card" data-index="${index}" aria-label="揭開第 ${index + 1} 張固定展示卡"${shown ? ' hidden' : ''}><span class="back-rim" aria-hidden="true"></span><span class="back-symbol" aria-hidden="true">契</span><span class="back-index">${['壹', '貳', '參'][index]}<small>按下揭曉</small></span></button><div class="demo-card-label"><b>${shown ? `${hero.name} · ${art.short}` : `第 ${index + 1} 張`}</b><span>${shown ? `✦ 神品 · ${art.code}` : '固定展示 · 待揭曉'}</span></div></div>`;
  }).join('');
  document.querySelector('[data-action="skip-demo"]').hidden = !['sealed', 'opening'].includes(phase);
  document.querySelector('[data-action="reveal-all"]').hidden = phase !== 'ready';
  document.querySelector('[data-action="reset-demo"]').hidden = !['ready', 'complete'].includes(phase);
  document.querySelector('#demo-status').textContent = phase === 'sealed' ? '封存待啟 · 固定展示 3 張' : phase === 'opening' ? '封印漸開，行者將至。' : phase === 'ready' ? `已翻開 ${revealed.size} / 3 張 · 請按卡背逐張揭曉` : '三面相逢 · 展示完畢，未加入背包';
}

function finishDemo({ focus = false } = {}) {
  const keepFocus = focus || document.querySelector('#booster-demo').contains(document.activeElement);
  cancelTimers();
  revealed = new Set([0, 1, 2]);
  revealEffects = new Set();
  phase = 'complete';
  renderDemo();
  if (keepFocus) document.querySelector('[data-action="reset-demo"]').focus({ preventScroll: true });
}
function resetDemo({ focus = false } = {}) {
  cancelTimers();
  phase = 'sealed';
  revealed = new Set();
  revealEffects = new Set();
  renderDemo();
  if (focus) document.querySelector('[data-action="open-pack"]').focus({ preventScroll: true });
}
function openDemo() {
  if (phase !== 'sealed') return;
  if (motion.matches) return finishDemo({ focus: true });
  phase = 'opening';
  renderDemo();
  document.querySelector('[data-action="skip-demo"]').focus({ preventScroll: true });
  schedule(() => { document.querySelector('#booster-demo').dataset.phase = 'unsealed'; }, 160);
  schedule(() => {
    phase = 'ready';
    renderDemo();
    document.querySelector('[data-action="reveal-card"]').focus({ preventScroll: true });
  }, 300);
}
function revealCard(index) {
  if (phase !== 'ready' || ![0, 1, 2].includes(index) || revealed.has(index)) return;
  revealed.add(index);
  revealEffects = motion.matches ? new Set() : new Set([index]);
  if (revealed.size === 3) phase = 'complete';
  renderDemo();
  announce(`第 ${index + 1} 張：孫悟空，神品，${treatmentFor(currentCards()[index]).mark}。展示用，未加入背包。`);
  const next = document.querySelector('[data-action="reveal-card"]:not([hidden])') || document.querySelector('[data-action="reset-demo"]');
  next.focus({ preventScroll: true });
}

document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button || button.disabled) return;
  const { action, id, index } = button.dataset;
  if (action === 'select-treatment') {
    if (!TREATMENTS.some(art => art.id === id) || selected === id) return;
    selected = id;
    renderTreatment();
  } else if (action === 'open-pack') openDemo();
  else if (action === 'skip-demo' || action === 'reveal-all') finishDemo({ focus: true });
  else if (action === 'reveal-card') revealCard(Number(index));
  else if (action === 'reset-demo') resetDemo({ focus: true });
});
document.querySelector('.finish-picker').addEventListener('change', event => {
  if (!['ink', 'treasure'].includes(event.target.value)) return;
  finish = event.target.value;
  resetDemo();
  announce(`第三張展示已改為${treatmentFor(finish).mark}。秘匣重新封存，內容固定。`);
});
motion.addEventListener('change', () => {
  if (motion.matches && ['opening', 'ready'].includes(phase)) finishDemo();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && phase === 'opening') finishDemo();
});
window.addEventListener('pagehide', () => {
  if (phase === 'opening') finishDemo();
  else cancelTimers();
});

renderSamples();
renderTreatment();
renderDemo();
