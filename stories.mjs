/** Original playable journeys inspired by traditional stories. No save or battle logic. */
import { CAMPAIGN_WORLDS, CAMPAIGN_NODES } from './campaign-content.mjs';
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};

export const WORLDS = freeze([
  { id: 'shanhai', name: '山海 · 初行', source: '萬象原創', subtitle: '渡口的一盞燈，照見千卷山河。', description: '萬象卷散落成境。從霧隱渡口出發，學會落子，也尋回通往古老故事的路。', map: 'assets/world-map.png', inscription: '山海六境圖', seal: '山', nodeIds: ['mist-gate', 'jade-forest', 'ember-pass', 'moon-lake', 'sky-palace', 'sea-throne'] },
  { id: 'westward', name: '西遊 · 雲路取經', source: '西遊記啟發', subtitle: '路有千重，心有一向。', description: '一頁無字經落入花果山。循山風、流沙與不熄的火，護送這頁空白抵達靈山；你留下的每次取捨，便是經文。', map: 'assets/maps/westward.png', inscription: '西行雲路圖', seal: '行', nodeIds: ['west-flower-mountain', 'west-yellow-wind', 'west-flaming-mountain', 'west-spirit-mountain'] },
  { id: 'investiture', name: '封神 · 蓮火問天', source: '封神演義啟發', subtitle: '一點蓮火，照見自己的選擇。', description: '一朵不肯熄滅的蓮火，映出尚未寫定的封神卷。從陳塘海口到牧野長風，你要守住的，是名冊之外的人間。', map: 'assets/maps/investiture.png', inscription: '蓮火封神圖', seal: '蓮', nodeIds: ['gods-chentang', 'gods-kunlun', 'gods-western-qi', 'gods-muye'] },
  { id: 'white-snake', name: '白蛇 · 煙雨人間', source: '白蛇傳啟發', subtitle: '一把傘，容得下兩種天地。', description: '西湖雨中，一把遺落的紙傘繫着未完的約定。循藥香與潮聲尋去，在塔影之前，為相逢留下一條歸路。', map: 'assets/maps/white-snake.png', inscription: '煙雨西湖圖', seal: '雨', nodeIds: ['snake-broken-bridge', 'snake-herbal-lane', 'snake-golden-mountain', 'snake-thunder-pagoda'] },
  ...CAMPAIGN_WORLDS,
]);

const decks = {
  westward: ['wukong', 'yanxin', 'cangjiao', 'cuixian', 'duying', 'yunya', 'yaoheng', 'kongzi'],
  investiture: ['nezha', 'yanxin', 'chiling', 'qingxiao', 'yaoheng', 'kongzi', 'xuanjian', 'cuixian'],
  'white-snake': ['shuangli', 'duying', 'zhimeng', 'lindaiyu', 'wangxifeng', 'yaoheng', 'kongzi', 'yunya'],
};
const chapters = [
  ['westward', [
    ['花果山', '水簾初約', '瀑布後藏着一頁無字經，守山客要先看你如何分配手中的仙丹。', '花果守山客', '水簾分開，無字經映出第一筆：出發。山風指向黃沙深處。', '山果落在棋盤邊。守山客替你留了位置，再試一次也無妨。'],
    ['黃風嶺', '定心穿沙', '風沙掩去遠路。留一分餘力，才看得清對手亮出的虛實。', '黃風巡沙人', '沙聲漸息，經頁多了一筆定心。遠處的山脊泛起火光。', '看不清時，先把步子放慢。巡沙人仍在風口等你。'],
    ['火焰山', '借風息火', '熾石間只有一條窄路。看火人邀你以四次落子，換一陣能過山的風。', '赤岩看火人', '風沿山脊拂過，火光讓出一道缺口。靈山的鐘聲終於可聞。', '火勢未退，路卻還在。先整備同行戰卡，再借一次風。'],
    ['靈山雲階', '經在途中', '雲階盡頭，試經人不問你帶回多少文字，只問這一路如何取捨。', '雲階試經人', '無字經翻過最後一頁。原來每一次留丹、進退與相助，都已寫成歸途。西遊卷已成。', '試經人收起棋子，笑說路遠不妨再走一遍。'],
  ]],
  ['investiture', [
    ['陳塘海口', '潮生蓮火', '夜潮托來一朵蓮火。海口守將請你穩住陣腳，護它穿過第一道關。', '陳塘守潮將', '潮聲漸平，蓮火在掌中站穩。昆崙的雲路映進火心。', '守潮將替你擋住浪頭。這朵火，還等你再護一程。'],
    ['昆崙雲臺', '問命不問名', '玉階之上，觀卷人將一張空名冊放在案頭：若無定數，你會如何落子？', '昆崙觀卷人', '名冊未添一名，蓮火卻更明亮。雲散處，西岐燈火連成一線。', '雲臺容得下猶疑。觀卷人請你帶着自己的答案再來。'],
    ['西岐營火', '守住人間', '營火旁沒有不敗之人。替歸來的旅者守一夜，以餘力接住下一回合。', '西岐持燈客', '長夜過去，帳外已有炊煙。蓮火記住了這一盞人間燈。', '持燈客添上一根柴。勝負之外，今晚仍有一處歇腳。'],
    ['牧野長風', '卷外有光', '長風捲起最後一頁。守卷人邀你落完此局，將自己的選擇留在天地之間。', '牧野守卷人', '卷頁合攏，蓮火化作歸途的一盞燈。名冊之外，人間依舊明亮。封神卷已成。', '長風未歇，名冊仍空着這一頁。整備後，再寫自己的答案。'],
  ]],
  ['white-snake', [
    ['西湖斷橋', '借傘逢雨', '細雨落在空着的棋案。持傘人請你先弈一局，再告訴你失主往哪裡去了。', '斷橋持傘人', '傘沿滴下一串水珠，映出藥鋪的燈。這場相逢，已有了下一站。', '雨未停，持傘人把棋子重新擺好。橋上的約定仍在。'],
    ['藥香長巷', '一帖春信', '藥香穿過青石長巷。藥廬主人以一局緩急，問你如何留下治癒的餘地。', '藥廬問診人', '藥紙包好，一封春信附在傘柄。信上只有潮水的方向。', '藥廬燈火仍亮着。留一點餘力，下一局也許能走得更遠。'],
    ['金山潮寺', '聽潮辨心', '江潮與鐘聲一同湧來。聽潮人把棋盤放在渡岸，請你在進退之間守住本心。', '金山聽潮人', '潮水退去，石階重現。紙傘指向湖畔一座安靜的塔。', '鐘聲散去，渡岸仍留着棋案。先聽清這一陣潮，再落子。'],
    ['雷峰暮塔', '為相逢留路', '暮色罩住塔影。護燈人問你：最後一枚仙丹，是用來爭勝，還是等一個歸人？', '暮塔護燈人', '塔影漸長，傘終於回到等它的人手中。故事留下一扇門，讓相逢有路可歸。白蛇卷已成。', '護燈人把燈移近一些。未完的約定，值得再下一局。'],
  ]],
];
const coordinates = [[18, 70], [37, 35], [65, 66], [83, 22]];
export const STORY_NODES = freeze(chapters.flatMap(([worldId, rows]) => {
  const world = WORLDS.find(item => item.id === worldId);
  return rows.map(([name, subtitle, description, enemyName, victory, defeat], order) => ({
    id: world.nodeIds[order], worldId, order, name, subtitle, description, enemyName,
    x: coordinates[order][0], y: coordinates[order][1], level: order + 1,
    requiresNode: order ? world.nodeIds[order - 1] : 'mist-gate',
    opponentDeck: [...decks[worldId]], victory, defeat,
    winReward: { coins: 100 + order * 20, dust: 3 + Math.floor(order / 2), xp: 40 + order * 10 },
    firstClearReward: { coins: 180 + order * 40, dust: 10 + order * 2, xp: 60 + order * 10 },
    dailyReward: { coins: 90 + order * 15, dust: 5 + order, xp: 20 },
  }));
}));

export const getWorld = id => WORLDS.find(world => world.id === id) || WORLDS[0];
export const getWorldForNode = id => WORLDS.find(world => world.nodeIds.includes(id)) || WORLDS[0];
export const getStoryNode = id => STORY_NODES.find(node => node.id === id) || CAMPAIGN_NODES.find(node => node.id === id) || null;
export const nextNodeInWorld = id => {
  const world = getWorldForNode(id), index = world.nodeIds.indexOf(id);
  if (index < 0) return null;
  if (world.nodeIds[index + 1]) return world.nodeIds[index + 1];
  if (id === 'west-spirit-mountain') return CAMPAIGN_NODES[0].id;
  if (world.campaign) return CAMPAIGN_WORLDS[CAMPAIGN_WORLDS.findIndex(item => item.id === world.id) + 1]?.nodeIds[0] || null;
  return null;
};
