/** Pure WX-01 markup. App transactions decide all ownership, prices and eligibility. */
import { getCard, FACTIONS } from './engine.mjs';
import { RARITIES, CARD_RARITIES } from './progression.mjs';
import { WX01_PRINTINGS } from './printing-catalogue.mjs';
import { WX01_PRICE, WX01_RATES, WX01_SEAL_COSTS, WX01_DRY_LIMIT, getWX01Rates } from './wx01-pack.mjs';
import { PRINT_TREATMENTS, cardPresentation } from './card-presentation.mjs';
import { getWorld } from './stories.mjs';

const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const number = value => Number(value || 0).toLocaleString('zh-Hant');
const percentage = value => `${(value * 100).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}%`;
const modeNames = { ordinary: '本畫匣', aa: '異畫匣 · AA', leader: '領契匣 · LAA', treasure: '天工匣 · TR', ink: '墨卷匣 · INK', god: '神契匣 · 三相同輝' };
const specialTreatments = ['aa', 'leader', 'treasure', 'ink'];
const storyReady = profile => getWorld('westward').nodeIds.every(id => profile.cleared.includes(id));
const dryCount = profile => Math.max(0, Math.min(WX01_DRY_LIMIT - 1, profile.wx01?.dry || 0));

export function wx01MarketMarkup(profile, cardMarkup) {
  const wx = profile.wx01 || {}, dry = dryCount(profile), rates = getWX01Rates(dry);
  const heroes = ['wx01-001-laa1', 'wx01-005-ink1', 'wx01-002-aa1'].map(id => WX01_PRINTINGS.find(print => print.id === id));
  const ready = storyReady(profile);
  return `<section class="wx01-market" aria-labelledby="wx01-market-title">
    <div class="wx01-market-hero"><div class="wx01-market-copy"><div class="eyebrow">WX-01 · 西行萬象初章</div><h2 id="wx01-market-title">西行秘匣</h2><p class="wx01-invitation">一卷西行，三面相逢。</p><p>16 位同行者，29 種畫作。<br>本畫、異畫與領契，記下同一角色的不同瞬間。</p><button type="button" class="primary" data-action="buy-pack" data-set="wx01"${profile.coins < WX01_PRICE ? ' disabled' : ''}>開啟西行秘匣 <span>${number(WX01_PRICE)} 金幣</span></button><small>每匣 3 張 · 至少一張靈品或神品 · 只用遊戲金幣</small></div>
    <div class="wx01-market-art" aria-label="西行秘匣部分畫作預覽"><div class="wx01-art-orbit" aria-hidden="true"></div>${heroes.map(print => `<div class="wx01-preview-print">${cardMarkup(getCard(print.cardId), { printId: print.id })}</div>`).join('')}<span class="wx01-art-note">畫中萬象，各有歸途</span></div></div>
    <div class="wx01-pack-progress"><div><span class="wx01-small-label">異畫之約</span><strong>${dry}<small> / ${WX01_DRY_LIMIT - 1} 匣未遇特別畫作</small></strong><div class="wx01-dry-track" aria-hidden="true">${Array.from({ length: WX01_DRY_LIMIT - 1 }, (_, index) => `<i class="${index < dry ? 'is-filled' : ''}"></i>`).join('')}</div><p>${dry === WX01_DRY_LIMIT - 1 ? '下一匣必有 AA 或以上特別畫作。' : `最多再開 ${WX01_DRY_LIMIT - dry} 匣，必遇一款特別畫作。`}</p></div><div class="wx01-next-odds"><span class="wx01-small-label">下一匣</span><strong>${percentage(1 - rates.ordinary)}<small>含特別畫作</small></strong><button type="button" class="text-button" data-action="wx01-odds">完整機率與規則 ↗</button></div></div>
    <div class="wx01-earned"><div class="wx01-seal-wallet"><span class="wx01-seal-mark" aria-hidden="true">印</span><div><span class="wx01-small-label">西行印</span><strong>${number(wx.seals)}</strong><p>每開一匣 +1 印，存下來自選畫作。</p></div><button type="button" class="secondary" data-action="wx01-redeem">以印尋畫 →</button></div><div class="wx01-story-choice"><span class="wx01-small-label">西行首勝之禮</span><h3>走完此卷，選一幅異畫。</h3><p>${wx.storyClaimed ? '自選異畫已收入行囊。' : ready ? '四境已通，可任選一張 AA。' : '首次通過西遊卷全部四境，任選一張 AA。'}</p><button type="button" class="text-button" data-action="${ready && !wx.storyClaimed ? 'wx01-story-choice' : 'world'}"${wx.storyClaimed ? ' disabled' : ''}>${wx.storyClaimed ? '已領取 ✓' : ready ? '選取首勝異畫 ↗' : '前往主線故事 ↗'}</button></div></div>
  </section>`;
}

export function wx01OddsMarkup(profile) {
  const dry = dryCount(profile), next = getWX01Rates(dry);
  return `<div class="wx01-odds"><div class="eyebrow">WX-01 · 開匣機率</div><h2>每一份緣，明白相見。</h2><p>每匣 ${number(WX01_PRICE)} 遊戲金幣，共三張。以下是整匣種類的機率，六種結果互斥。</p><table><caption>西行秘匣 · 自然機率與你下一匣的機率</caption><thead><tr><th scope="col">秘匣種類</th><th scope="col">自然機率</th><th scope="col">下一匣</th></tr></thead><tbody>${Object.keys(WX01_RATES).map(mode => `<tr><th scope="row">${modeNames[mode]}</th><td>${percentage(WX01_RATES[mode])}</td><td>${percentage(next[mode])}</td></tr>`).join('')}</tbody></table><div class="wx01-odds-notes"><h3>本畫與特別畫作</h3><p>本畫抽取為凡品 60%、靈品 30%、神品 10%；同品階角色等機率。一般匣若前兩張皆為凡品，第三張改為靈品 75%、神品 25%。</p><p>特別匣前兩張為本畫，第三張為對應畫作：AA 六款、領契四款、墨卷兩款、天工一款，各池內等機率。若三張都是凡品，第二張本畫改抽靈品 75%、神品 25%。畫作不改變角色的星數、能力或品階。</p><h3>異畫之約 · 目前 ${dry} 匣</h3><p>連續 ${WX01_DRY_LIMIT - 1} 匣未得特別畫作後，下一匣的普通結果會提升為 AA；自然抽中的其他特別結果照常保留。得到任一特別畫作即重新計數。這項約定不保證特定角色、墨卷、天工或神契匣。</p><h3>神契匣 · 三位不同角色</h3><p>包含 AA、領契、墨卷各一張。先等機率選墨卷，再從不同角色的領契中等機率選一張，最後從另外角色的 AA 中等機率選一張。因此神契匣內，各款 AA 與領契的機率並不相同。所有畫作也可於其他秘匣或自選中取得。</p><h3>西行印與自選</h3><p>每開一匣取得 1 印；完成並領取每週十場對弈任務另得 5 印。${specialTreatments.map(id => `${PRINT_TREATMENTS[id].name} ${WX01_SEAL_COSTS[id]} 印`).join('、')}，可選指定畫作。兌換會消耗印；保留的印不會到期。首次通過西遊四境另可選一張 AA。</p></div><div class="modal-actions"><button type="button" class="primary" data-action="close-modal">明白了</button></div></div>`;
}

export function wx01RedeemMarkup(profile, cardMarkup, { treatment = 'aa', story = false } = {}) {
  const current = story || !specialTreatments.includes(treatment) ? 'aa' : treatment;
  const choices = WX01_PRINTINGS.filter(print => print.treatment === current), seals = profile.wx01?.seals || 0;
  const cost = WX01_SEAL_COSTS[current], eligible = story ? storyReady(profile) && !profile.wx01?.storyClaimed : seals >= cost;
  return `<div class="wx01-redemption" data-story="${story}"><div class="eyebrow">${story ? '西行四境 · 首勝之禮' : '西行印 · 自選畫作'}</div><h2>${story ? '選一幅，記下此程。' : '心中那一幅，隨你選。'}</h2><p>${story ? '任選一張 AA，領取後會加入背包。' : `現有 ${number(seals)} 西行印。每次兌換取得你選的那一張，從 Lv.1 開始同行。`}</p>${story ? '' : `<div class="wx01-redeem-tabs" role="group" aria-label="畫作類型">${specialTreatments.map(id => `<button type="button" data-action="wx01-redeem-tab" data-id="${id}" aria-pressed="${id === current}">${PRINT_TREATMENTS[id].name}<small>${WX01_SEAL_COSTS[id]} 印</small></button>`).join('')}</div>`}<div class="wx01-redeem-grid">${choices.map(print => {
    const card = getCard(print.cardId), count = profile.instances.filter(instance => instance.printId === print.id).length;
    return `<article class="wx01-redeem-choice" data-print-id="${print.id}">${cardMarkup(card, { printId: print.id })}<h3>${safe(print.name)}</h3><p>${FACTIONS[card.faction].name} · ${RARITIES[CARD_RARITIES[card.id]].name} · ${count ? `持有 ${count} 張` : '尚未入藏'}</p><button type="button" class="secondary" data-action="${story ? 'claim-story-print' : 'redeem-print'}" data-id="${print.id}"${eligible ? '' : ' disabled'}>${story ? '選這一幅' : `${cost} 印 · 兌換`}</button></article>`;
  }).join('')}</div><p class="wx01-choice-note">${story && !eligible ? profile.wx01?.storyClaimed ? '此份首勝之禮已領取。' : '先通過西遊卷全部四境，便可領取。' : !story && !eligible ? `還需 ${number(cost - seals)} 印，可慢慢積累。` : '畫作只改變外觀；同一角色的能力與品階保持一致。'}</p></div>`;
}

export function packReceiptMarkup(receipt, cardMarkup) {
  const count = receipt.cards.length, fromPack = receipt.kind === 'pack';
  return `<div class="pack-opening" data-receipt-id="${safe(receipt.id)}" data-phase="sealed" data-mode="${safe(receipt.mode)}"><div class="eyebrow">WX-01 · ${fromPack ? '西行秘匣' : receipt.kind === 'story' ? '西行首勝之禮' : '以印尋畫'}</div><h2>${fromPack ? '封印已解，緣已入藏。' : '此幅相逢，已入行囊。'}</h2><p class="pack-saved-note">${count} 張戰卡已儲存。${fromPack ? `西行印 +${number(receipt.sealsEarned)}。` : ''}揭曉不會再次扣款。</p><p class="pack-opening-status" data-pack-status role="status" aria-live="polite">按封印，揭曉這份相逢。</p>
    <div class="pack-opening-scene" data-pack-scene><div class="pack-opening-orbit" aria-hidden="true"></div><button type="button" class="pack-sealed-box" data-action="pack-open" aria-label="揭曉已入藏的 ${count} 張戰卡"><span class="pack-seal-title">西行<br>秘匣</span><span class="pack-seal-glyph" aria-hidden="true">契</span><small>按封印揭曉</small></button></div>
    <div class="pack-opening-cards" data-pack-cards hidden>${receipt.cards.map((entry, index) => {
      const card = getCard(entry.cardId), print = cardPresentation(card, { printId: entry.printId });
      return `<article class="pack-opening-slot" data-pack-slot="${index}" data-print-id="${safe(entry.printId)}" data-treatment="${print.treatment}"><div class="pack-owned-face" data-pack-face hidden>${cardMarkup(card, { printId: entry.printId })}</div><button type="button" class="pack-card-back" data-action="pack-card-reveal" data-index="${index}" aria-label="揭曉第 ${index + 1} 張已入藏戰卡"><span aria-hidden="true">契</span><b>${['壹', '貳', '參'][index] || index + 1}</b><small>按卡背揭曉</small></button><div class="pack-owned-label" data-pack-label hidden><h3>${safe(print.name)}</h3><p>${RARITIES[entry.rarity].name} · ${PRINT_TREATMENTS[print.treatment].name} ${PRINT_TREATMENTS[print.treatment].code}</p><small>Lv.1 · <span class="instance-serial">#${safe(entry.instanceId)}</span></small></div></article>`;
    }).join('')}</div><div class="pack-opening-footer"><button type="button" class="text-button" data-action="pack-skip">直接看結果</button><button type="button" class="secondary" data-action="pack-show-all" hidden>一次揭曉</button><button type="button" class="primary" data-action="pack-ack" data-id="${safe(receipt.id)}" hidden>已入藏 · 繼續旅程 <span>→</span></button></div></div>`;
}
