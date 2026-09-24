/** HL-01 isolated design-preview data. No game imports, ownership or pack sampler. */
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const source = chapter => `https://zh.wikisource.org/wiki/紅樓夢/第${String(chapter).padStart(3, '0')}回`;
export const HL01_SET = freeze({
  id: 'hl01', title: '紅樓・風月入夢', subtitle: '海棠詩社・把一日過成一卷',
  description: '八位園中人，一卷海棠集。有人落筆，有人限韻，有人照看這一席相聚。',
  sources: [
    { title: '第三十七回 · 海棠結社', url: source(37) },
    { title: '第六十二回 · 湘雲醉眠', url: source(62) },
  ],
});
export const HL01_FACTIONS = freeze({
  yun: { name: '雲闕', icon: '☀', color: '#d9c58a' },
  ember: { name: '赤燼', icon: '焰', color: '#ec8268' },
  moon: { name: '月隱', icon: '☾', color: '#b5a5e5' },
  grove: { name: '森羅', icon: '❧', color: '#89c9a1' },
});
export const HL01_RARITIES = freeze({
  common: { name: '凡品', mark: '○', color: '#c39972' },
  rare: { name: '靈品', mark: '◇', color: '#b8d4cd' },
  epic: { name: '神品', mark: '✦', color: '#e4c582' },
});
const effect = (type, value, name) => {
  const descriptions = {
    attack: [`攻擊 +${value}`, `計算仙丹倍率後，自身攻擊力 +${value}。`],
    opponentAttack: [`敵攻擊 −${value}`, `計算仙丹倍率後，對手攻擊力 −${value}，最低為 1。`],
    reduceDamage: [`受傷 −${value}`, `落敗時受到的傷害 −${value}，最低為 1。可與同族共鳴疊加。`],
    stopAbility: ['封鎖技能', '封鎖對手的角色技能，不影響同族共鳴；雙方封鎖同時生效。'],
    healOnWin: [`勝利回復 ${value}`, `贏得本回合後回復 ${value} 點生命，最多回復至 12。`],
    refundOnLoss: [`敗北回丹 ${value}`, `落敗後獲得 ${value} 顆仙丹，最多持有 12 顆；即使本回合沒有加丹也生效。`],
  };
  return { type, value, label: `${name} · ${descriptions[type][0]}`, description: descriptions[type][1] };
};
const candidates = [
  ['lindaiyu', '林黛玉', '瀟湘聽雨', 'moon', 'rare', 2, 6, 2, 'reduceDamage', 2, '惜花',
    '詠者', '社號瀟湘妃子；先看秋色、說笑，後一揮成篇。',
    '她拾起雨後的花瓣，把無人肯聽的心事，寫成不向風低頭的詩。'],
  ['jiabaoyu', '賈寶玉', '怡紅聽吟', 'ember', 'common', 2, 6, 3, 'refundOnLoss', 1, '留興',
    '詠者', '在回廊構思海棠詩，也急著邀湘雲加入。',
    '香將燃盡，他還欠半首；聽見旁人得了好句，卻先替人喝起彩來。'],
  ['xuebaochai', '薛寶釵', '蘅蕪持衡', 'yun', 'rare', 3, 5, 4, 'opponentAttack', 4, '含章',
    '詠者', '社號蘅蕪君；作詩，也協助湘雲籌辦下一次雅集。',
    '她把未盡的話收進句中，留出一寸餘地，讓滿座的人都能從容。'],
  ['shixiangyun', '史湘雲', '笑語乘興', 'ember', 'rare', 3, 7, 3, 'attack', 6, '乘興',
    '詠者', '次日受邀而來，依海棠詩韻補作兩首後入社。',
    '人還未坐穩，話已說了半席。遲來的一點興致，轉眼便落成兩首。'],
  ['jiatanchun', '賈探春', '蕉下邀社', 'yun', 'rare', 3, 6, 4, 'refundOnLoss', 2, '續席',
    '發起', '寫花箋邀眾結社；本人也參與詠海棠。',
    '一張花箋傳過迴廊，散在園中的人，便有了同坐一席的理由。'],
  ['liwan', '李紈', '稻香掌壇', 'grove', 'common', 3, 5, 4, 'healOnWin', 3, '款客',
    '掌壇', '自薦東道與社長，評閱詩作、約定開社日期。',
    '她把眾人的稿子攏好，再把茶添上。這一席能熱鬧下去，也有人在照看。'],
  ['jiayingchun', '賈迎春', '菱洲拈韻', 'grove', 'common', 2, 5, 3, 'reduceDamage', 1, '定韻',
    '限韻', '抽詩定體、請人拈字限韻，並以短香計時。',
    '韻牌在匣中輕輕一響，爭先的人便都慢下來，聽她把這一局說明白。'],
  ['jiaxichun', '賈惜春', '藕榭監場', 'moon', 'common', 2, 6, 1, 'stopAbility', 0, '守約',
    '監場', '與迎春任副社長；此回具體分工是監場。',
    '有人忙著落筆，有人忙著說笑。她守著席間的分寸，讓空白也有位置。'],
];
export const HL01_CARDS = freeze(candidates.map((row, index) => {
  const [id, name, title, faction, rarity, stars, power, damage, type, value, skill, role, roleDetail, lore] = row;
  return {
    id, name, title, story: '海棠詩社', source: '紅樓夢', faction, rarity, stars, power, damage,
    number: `HL01-${String(index + 1).padStart(3, '0')}`,
    printId: `hl01-${String(index + 1).padStart(3, '0')}-base`,
    ability: effect(type, value, skill), role, roleDetail, lore, sourceUrl: source(37),
    ...(id === 'lindaiyu' ? { reprintOf: 'lindaiyu' } : {}),
    art: { src: `assets/hl01/base-0${Math.floor(index / 4) + 1}.png`, columns: 2, rows: 2, index: index % 4 },
  };
}));
export const HL01_AA = freeze([
  { cardId: 'lindaiyu', printId: 'hl01-001-aa1', name: '林黛玉 · 雨停之前', src: 'assets/hl01/daiyu-aa.png', label: '異畫 AA', sourceUrl: source(37) },
  { cardId: 'shixiangyun', printId: 'hl01-004-aa1', name: '史湘雲 · 花影留眠', src: 'assets/hl01/xiangyun-aa.png', label: '異畫 AA', sourceUrl: source(62) },
  { cardId: 'jiatanchun', printId: 'hl01-005-aa1', name: '賈探春 · 一紙相邀', src: 'assets/hl01/tanchun-aa.png', label: '異畫 AA', sourceUrl: source(37) },
]);
export const HL01_SAMPLE = freeze([
  { cardId: 'jiabaoyu', treatment: 'base' },
  { cardId: 'shixiangyun', treatment: 'base' },
  { cardId: 'lindaiyu', treatment: 'aa' },
]);
export const HL01_DECKS = freeze([
  { name: '海棠全席', ids: candidates.map(row => row[0]) },
  { name: '月下新稿', ids: ['lindaiyu', 'jiaxichun', 'shuangli', 'wangxifeng', 'liwan', 'jiayingchun', 'cuixian', 'cangjiao'] },
]);
