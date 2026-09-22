/** WX-01's first playable balance candidates. Data only; no collection or RNG. */
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const effect = (type, value, label, description) => ({ type, value, label, description });
const card = (id, name, title, faction, stars, power, damage, art, ability, lore) => ({
  id, name, title, faction, stars, power, damage, art, artSet: 'wx01', source: '西遊記', ability, lore,
});

// Wukong is a reprint of the existing rules identity, never a second engine card.
export const WX01_ROSTER = freeze([
  ['tangsanzang', '唐三藏', 'common'], ['bailong', '白龍馬', 'common'],
  ['guanyin', '觀音', 'epic'], ['puti', '菩提祖師', 'common'],
  ['wukong', '孫悟空', 'epic'], ['honghaier', '紅孩兒', 'rare'],
  ['huangfeng', '黃風怪', 'common'], ['jinjiao', '金角大王', 'rare'],
  ['baigu', '白骨精', 'rare'], ['tieshan', '鐵扇公主', 'rare'],
  ['yinjiao', '銀角大王', 'common'], ['liuer', '六耳獼猴', 'epic'],
  ['bajie', '豬八戒', 'common'], ['wujing', '沙悟淨', 'common'],
  ['niumowang', '牛魔王', 'rare'], ['zhenyuan', '鎮元大仙', 'common'],
].map(([cardId, name, rarity], index) => ({ number: index + 1, cardId, name, rarity })));

export const WX01_CARDS = freeze([
  card('tangsanzang', '唐三藏', '一願西行', 'yun', 2, 5, 3, 0,
    effect('healOnWin', 2, '明願 · 勝利回復 2', '贏得本回合後回復 2 點生命，最多回復至 12。'),
    '前路沒有替他縮短半分，他仍把每一次啟程，走成自己的回答。'),
  card('bailong', '白龍馬', '鷹愁照影', 'yun', 2, 5, 2, 1,
    effect('attack', 6, '踏澗 · 攻擊 +6', '計算仙丹倍率後，自身攻擊力 +6。'),
    '澗水記得龍的倒影，山路記得馬的腳步；遠方等着同一顆心。'),
  card('guanyin', '觀音', '甘露回春', 'yun', 4, 6, 4, 2,
    effect('reduceDamage', 3, '甘露 · 受傷 −3', '落敗時受到的傷害 −3，最低為 1。可與同族共鳴疊加。'),
    '一枝楊柳拂過枯根，眾人忽然聽見，春天還願意再來一次。'),
  card('puti', '菩提祖師', '方寸授道', 'yun', 3, 6, 3, 3,
    effect('opponentPower', 2, '照玄 · 敵力量 −2', '對手力量 −2，最低為 1；在仙丹倍率之前計算。'),
    '山門之內教他變化，山門之外，留他自己學會不變的事。'),
  card('honghaier', '紅孩兒', '火雲童子', 'ember', 3, 6, 4, 4,
    effect('damage', 2, '真火 · 傷害 +2', '自身傷害 +2。'),
    '槍尖挑起一線赤火，山風越勸，他越要把天地燒得通紅。'),
  card('huangfeng', '黃風怪', '風捲黃沙', 'ember', 2, 6, 2, 5,
    effect('opponentPower', 1, '迷風 · 敵力量 −1', '對手力量 −1，最低為 1；在仙丹倍率之前計算。'),
    '黃沙遮去了山形，也遮不住那柄鋼叉，正等着風中的腳步。'),
  card('jinjiao', '金角大王', '平頂藏鋒', 'ember', 3, 6, 5, 6,
    effect('opponentAttack', 4, '攝勢 · 敵攻擊 −4', '計算仙丹倍率後，對手攻擊力 −4，最低為 1。'),
    '蓮花洞前一聲呼名，掌中的寶光，把來路照得忽遠忽近。'),
  card('baigu', '白骨精', '千面一念', 'moon', 2, 5, 3, 7,
    effect('refundOnLoss', 2, '脫影 · 敗北回丹 2', '落敗後獲得 2 顆仙丹，最多持有 12 顆；即使本回合沒有加丹也生效。'),
    '山路上留下三重身影；每一張面容，都藏着同一個未肯離去的念頭。'),
  card('tieshan', '鐵扇公主', '翠雲一扇', 'moon', 3, 6, 4, 8,
    effect('reduceDamage', 2, '息焰 · 受傷 −2', '落敗時受到的傷害 −2，最低為 1。可與同族共鳴疊加。'),
    '翠雲山的風捲起衣袖，她握緊扇柄，沒有急着答應來客。'),
  card('yinjiao', '銀角大王', '金繩收勢', 'moon', 2, 5, 2, 9,
    effect('stopAbility', 0, '縛咒 · 封鎖技能', '封鎖對手的角色技能，不影響同族共鳴；雙方封鎖同時生效。'),
    '咒聲一收一放，金繩在掌間游走；得意之時，最怕有人也懂那句話。'),
  card('liuer', '六耳獼猴', '二心相照', 'moon', 4, 7, 4, 10,
    effect('power', 1, '同形 · 力量 +1', '自身力量 +1；加成在仙丹倍率之前計算。'),
    '聲音、身形與棍影都如此相似，三界仍在尋找那個分辨的瞬間。'),
  card('bajie', '豬八戒', '雲棧故客', 'grove', 3, 7, 3, 11,
    effect('power', 1, '奮鈀 · 力量 +1', '自身力量 +1；加成在仙丹倍率之前計算。'),
    '嘴上念着歇腳，肩上卻又添了一件行李；下一程，還是一起走。'),
  card('wujing', '沙悟淨', '流沙歸舟', 'grove', 2, 6, 2, 12,
    effect('refundOnLoss', 2, '守途 · 敗北回丹 2', '落敗後獲得 2 顆仙丹，最多持有 12 顆；即使本回合沒有加丹也生效。'),
    '降妖寶杖立在河畔，他把漫長的沉默，交給一步一步的同行。'),
  card('niumowang', '牛魔王', '積雷雄主', 'grove', 4, 6, 5, 13,
    effect('damage', 2, '震嶽 · 傷害 +2', '自身傷害 +2。'),
    '山岳般的身影擋住去路，舊日的酒與誓言，都在風裡沉了下來。'),
  card('zhenyuan', '鎮元大仙', '五莊長春', 'grove', 3, 6, 3, 14,
    effect('healOnWin', 3, '長春 · 勝利回復 3', '贏得本回合後回復 3 點生命，最多回復至 12。'),
    '樹下有清風，也有明月；一場風波之後，五莊觀又添一席故交。'),
]);
