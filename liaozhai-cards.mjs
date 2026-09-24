/** LZ-01 design-preview data only. Not the game catalogue, ownership or pack sampler. */
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const source = (volume, story) => `https://zh.wikisource.org/wiki/聊齋志異/第0${volume}卷#${story}`;
export const LZ01_SET = freeze({
  id: 'lz01', title: '聊齋・燈下有靈', subtitle: '雨夜有客，燈下有人。',
  description: '十二位夜行來客，五篇人間異事。一盞燈，照見故事裡仍願意相守的人。',
  sources: ['聶小倩', '嬰寧', '陸判', '畫皮', '王六郎'].map(title => ({ title, url: source(['畫皮', '王六郎'].includes(title) ? 1 : 2, title) })),
});
export const LZ01_FACTIONS = freeze({
  yun: { name: '雲闕', icon: '☀', color: '#d9c58a' },
  ember: { name: '赤燼', icon: '焰', color: '#ec8268' },
  moon: { name: '月隱', icon: '☾', color: '#b5a5e5' },
  grove: { name: '森羅', icon: '❧', color: '#89c9a1' },
});
export const LZ01_RARITIES = freeze({
  common: { name: '凡品', mark: '○', color: '#c39972' },
  rare: { name: '靈品', mark: '◇', color: '#b8d4cd' },
  epic: { name: '神品', mark: '✦', color: '#e4c582' },
});
const effect = (type, value, name) => {
  const descriptions = {
    power: [`力量 +${value}`, `自身力量 +${value}；在仙丹倍率之前計算。`],
    opponentPower: [`敵力量 −${value}`, `對手力量 −${value}，最低為 1；在仙丹倍率之前計算。`],
    attack: [`攻擊 +${value}`, `計算仙丹倍率後，自身攻擊力 +${value}。`],
    damage: [`傷害 +${value}`, `自身傷害 +${value}。`],
    reduceDamage: [`受傷 −${value}`, `落敗時受到的傷害 −${value}，最低為 1；可與同族共鳴疊加。`],
    stopAbility: ['封鎖技能', '封鎖對手的角色技能，不影響同族共鳴；雙方封鎖同時生效。'],
    healOnWin: [`勝利回復 ${value}`, `贏得本回合後回復 ${value} 點生命，最多回復至 12。`],
    refundOnLoss: [`敗北回丹 ${value}`, `落敗後獲得 ${value} 顆仙丹，最多持有 12 顆；零丹出戰亦可觸發。`],
  };
  return { type, value, label: `${name} · ${descriptions[type][0]}`, description: descriptions[type][1] };
};
const candidates = [
  ['niexiaoqian', '聶小倩', '燈前相守', '聶小倩', 'moon', 'rare', 3, 5, 4, 'healOnWin', 2, '歸燈',
    '雨把來路藏進夜色，她把燈舉高了一點。這一次，門是為歸人而開。'],
  ['ningcaichen', '寧采臣', '不取非義', '聶小倩', 'yun', 'common', 2, 6, 1, 'stopAbility', 0, '守正',
    '行囊裡裝不下所有道理；走到無人看見的地方，他仍知道甚麼不可取。'],
  ['yanchixia', '燕赤霞', '匣中白虹', '聶小倩', 'ember', 'epic', 4, 5, 6, 'attack', 8, '出匣',
    '劍光只亮了一瞬，雨夜便多出一段可以安心走過的路。'],
  ['yingning', '嬰寧', '花間藏笑', '嬰寧', 'grove', 'common', 2, 7, 1, 'healOnWin', 1, '春笑',
    '花枝先動，笑聲才來。她也有不說的心事，留在風停下來的地方。'],
  ['wangzifu', '王子服', '懷梅尋路', '嬰寧', 'ember', 'common', 2, 6, 1, 'damage', 2, '尋芳',
    '梅花早已乾了，他仍小心收著；山路每轉一次，便又像快要聽見笑聲。'],
  ['lupan', '陸判', '朱筆夜客', '陸判', 'yun', 'rare', 3, 5, 4, 'opponentPower', 2, '點竅',
    '朱鬚映著燭火，酒杯擱在案旁。今夜來客落筆之前，先看了主人一眼。'],
  ['zhuerdan', '朱爾旦', '舉觴邀異', '陸判', 'ember', 'common', 3, 5, 5, 'power', 2, '壯膽',
    '旁人退了半步，他添了一杯酒。至於這一席將帶來甚麼，他還未想清楚。'],
  ['huapi', '畫皮之鬼', '燈背另一面', '畫皮', 'moon', 'epic', 4, 5, 6, 'opponentPower', 1, '惑目',
    '筆尖替面容添上溫柔，屏風後的影子，卻遲遲不肯跟著轉身。'],
  ['chenshi', '陳氏（畫皮）', '不棄歸人', '畫皮', 'grove', 'rare', 3, 5, 3, 'reduceDamage', 3, '持燈',
    '夜裡有許多聲音勸她回頭。她護住懷中的碗，一步一步走過濕冷的石街。'],
  ['huapidaoshi', '畫皮道士', '木劍收煙', '畫皮', 'yun', 'common', 4, 5, 6, 'stopAbility', 0, '辨魅',
    '拂塵掠過門前雨線，他看見了美貌背後的東西，也知道自己不能挽回所有事。'],
  ['wangliulang', '王六郎', '留人間一岸', '王六郎', 'moon', 'rare', 3, 5, 3, 'refundOnLoss', 3, '留渡',
    '他等了很久，終於等到可以離開的時候；卻把那條通往岸上的路，留給了別人。'],
  ['xuyuren', '許氏漁人（王六郎）', '河上留杯', '王六郎', 'grove', 'common', 2, 5, 3, 'refundOnLoss', 2, '酹酒',
    '網收了，酒還溫著。河風一來，他便往身旁空著的地方，再放下一隻杯。'],
];
export const LZ01_CARDS = freeze(candidates.map((row, index) => {
  const [id, name, title, story, faction, rarity, stars, power, damage, type, value, skill, lore] = row;
  return {
    id, name, title, story, faction, rarity, stars, power, damage,
    number: `LZ01-${String(index + 1).padStart(3, '0')}`,
    printId: `lz01-${String(index + 1).padStart(3, '0')}-base`,
    ability: effect(type, value, skill), lore,
    sourceUrl: source(['畫皮', '王六郎'].includes(story) ? 1 : 2, story),
    art: { src: `assets/lz01/base-0${Math.floor(index / 4) + 1}.png`, columns: 2, rows: 2, index: index % 4 },
  };
}));
export const LZ01_AA = freeze({
  cardId: 'niexiaoqian', printId: 'lz01-001-aa1', name: '聶小倩 · 燈前相守',
  src: 'assets/lz01/xiaoqian-aa.png', label: '異畫 AA',
});
export const LZ01_SAMPLE = freeze([
  { cardId: 'ningcaichen', treatment: 'base' },
  { cardId: 'yanchixia', treatment: 'base' },
  { cardId: 'niexiaoqian', treatment: 'aa' },
]);
export const LZ01_DECKS = freeze([
  { name: '借火護燈', ids: ['niexiaoqian', 'huapi', 'wangliulang', 'yingning', 'chenshi', 'xuyuren', 'ningcaichen', 'lupan'] },
  { name: '夜行破魅', ids: ['ningcaichen', 'lupan', 'huapidaoshi', 'yanchixia', 'wangzifu', 'zhuerdan', 'niexiaoqian', 'yingning'] },
  { name: '舊友同燈', ids: ['niexiaoqian', 'huapi', 'shuangli', 'lindaiyu', 'yingning', 'chenshi', 'cangjiao', 'cuixian'] },
]);
