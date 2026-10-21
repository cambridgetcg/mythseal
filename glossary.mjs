/** T1 詞彙 (docs/TUTORIAL-T1.md §3): the words the game uses, each defined in at most 40 display
 * units (two lines of the rules dialog at 302 px). Pure markup and data; numbers come from the
 * rules and data where they exist, and tests/glossary.test.mjs checks the rest against the
 * functions that apply them. */
import { CARDS, RULES } from './engine.mjs';
import { RARITIES, WEEKLY_TASKS, MAX_CARD_LEVEL, ACTIVITY_PILL_FLOOR } from './progression.mjs';
import { PRINT_TREATMENTS } from './card-presentation.mjs';

const stars = CARDS.map(card => card.stars);
const NUMERALS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const heroThreshold = level => 100 * (level - 1) ** 2;
const weeklySeals = WEEKLY_TASKS.find(task => task.reward.seals)?.reward.seals ?? 0;
/** A hand is the first RULES.rounds cards of the shuffled deck (engine.mjs drawHand). */
const hand = `${NUMERALS[RULES.rounds]}張`;
/** The 畫作 title names the two treatments the market hint names, so it stays one line at 302 px:
 * the 詞彙 pager sizes every row by its tallest term (viewport.mjs measurePageCapacity). */
const treatments = Object.values(PRINT_TREATMENTS).map(treatment => treatment.name);

/** In reading order: 旅途, then 卡牌, then 對弈. */
export const GLOSSARY = Object.freeze([
  ['coins', '金幣', '旅途', '開秘匣、購卡與修練所用；遊歷、擂台、火焰山勝、任務手札與寄售可得，切磋不得。'],
  ['dust', '靈砂', '旅途', '修練戰卡所需，與金幣同付（見「修練」）；遊歷勝、擂台、火焰山勝與任務手札可得。'],
  ['xp', '修為', '旅途', '執令者的旅途閱歷，累積決定其 Lv；遊歷、擂台、火焰山勝與任務手札可得。'],
  ['hero-level', '執令者 Lv', '旅途', `由修為而定：滿 ${heroThreshold(2)} 為 Lv.2、${heroThreshold(3)} 為 Lv.3、${heroThreshold(4)} 為 Lv.4，如此類推；不加戰力。`],
  ['cache', '秘藏', '旅途', '主線與故事各境，每日首勝另得一份秘藏：金幣、靈砂與修為；續卷沒有。'],
  ['stars', '星數', '卡牌', `角色 ${Math.min(...stars)}–${Math.max(...stars)} 星；每套合計不超過 ${RULES.starLimit} 星。首回合手上${hand}星多者先手；同攻時低星勝。`],
  ['card-level', '修練（戰卡 Lv）', '卡牌', `Lv.1–${MAX_CARD_LEVEL}：歷練夠即升級；或修練，付現有等級 ×120 金幣、×6 靈砂；加成只在遊歷。`],
  ['card-exp', '歷練（卡牌 EXP）', '卡牌', '出過牌的自有卡得：遊歷勝 20、和或敗 12，擂台、火焰山 12／8；同名傳承亦可灌注。'],
  ['journal', '同行記', '卡牌', '每張卡的履歷：編號、畫作、相逢緣由、對弈記錄與歷練；藏卡中展開角色，點卡面即見。'],
  ['rarity', `品階 · ${Object.values(RARITIES).map(rarity => rarity.name).join('／')}`, '卡牌', '收藏稀有度：影響開匣機率與商旅價錢，不改變星數、力量與傷害。'],
  ['printing', `畫作 · ${treatments.slice(0, 2).join('／')}等`, '卡牌', '同一角色的不同畫作，只改外觀，不改星數、能力與品階；領契可作洞府肖像。'],
  ['seals', '西行印', '卡牌', `每開一匣西行秘匣得 1 印，七日弈緣另得 ${weeklySeals} 印；可換指定特別畫作，不過期。`],
  ['tickets', '西行秘匣券 · 秘券', '卡牌', '免金幣開一匣西行秘匣。續卷每卷終章首勝、火焰山每週第 1 與第 3 次全通各贈一張。'],
  ['initiative', '先手', '對弈', `首回合${hand}星數合計高者先手，同則隨機，其後輪換。先手先亮卡；攻、星皆同則先手勝。`],
  ['pills', '仙丹', '對弈', `每局 ${RULES.pills} 顆，暗中分給${NUMERALS[RULES.rounds]}回合；攻擊＝力量 ×（1＋所用仙丹）。火焰山勝後至少補至 ${ACTIVITY_PILL_FLOOR}。`],
  ['resonance', '共鳴（同族共鳴）', '對弈', '抽出的四張中，有兩位不同的同族角色，該族加成便啟動；出過的卡仍計。'],
  ['fury', '怒擊', '對弈', `另付 ${RULES.furyCost} 丹；贏得該回合時傷害 +${RULES.furyDamage}。不加攻擊。`],
  ['block', '封鎖', '對弈', '令對手的角色技能失效，不影響同族共鳴；雙方都封鎖時一同生效。'],
  ['power-down', '減力', '對弈', '對手力量 −N（最低 1），在仙丹倍率之前計算。例：迷渡、離間。'],
  ['attack-down', '減攻', '對弈', '計算仙丹倍率後，對手攻擊 −N（最低 1）。例：空城、月隱的月蝕。'],
].map(([id, term, group, text]) => Object.freeze({ id, term, group, text })));
export const GLOSSARY_IDS = Object.freeze(GLOSSARY.map(entry => entry.id));

const safe = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
/** The 詞彙 module's list: one focusable (tabindex -1) article per term, named by its h3, so the
 * pager keeps every term reachable and opening at a term can focus it. `open` names the term
 * the dialog opens at; an unknown one is ignored. No group headings: each would be a list item. */
export function glossaryMarkup({ open = null } = {}) {
  const known = GLOSSARY_IDS.includes(open);
  return `<div class="glossary-list" data-glossary data-open="${known}">${GLOSSARY.map(entry => `<article class="glossary-term" data-viewport-id="term-${entry.id}" data-glossary-term="${entry.id}" tabindex="-1" aria-labelledby="glossary-term-${entry.id}"><h3 id="glossary-term-${entry.id}">${safe(entry.term)}</h3><p>${safe(entry.text)}</p></article>`).join('')}</div>`;
}
