/** Versioned, public activity definition. All rewards and random settlement live elsewhere. */
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};

export const FIRE_MOUNTAIN = freeze({
  id: 'fire-mountain', version: 1, name: '火焰山三連戰', unlockNode: 'mist-gate',
  subtitle: '借一陣風，走過三重火。', map: 'assets/maps/westward.png',
  description: '紅孩兒試火，鐵扇試心，牛魔王守住最後一道山口。留些生命與仙丹，才有力氣把三戰接起來。',
  loanerDeck: ['tangsanzang', 'bailong', 'guanyin', 'puti', 'tieshan', 'wujing', 'bajie', 'honghaier'],
  stages: [
    { id: 'fire-mountain-red', bossId: 'honghaier', name: '第一戰 · 火雲試焰',
      description: '紅孩兒把第一把火交到你面前。先看清重擊，再決定哪些傷害值得承受。',
      opponentDeck: ['honghaier', 'yanxin', 'huangfeng', 'nezha', 'guanyu', 'wujing', 'bailong', 'cuixian'],
      dropPrintId: 'wx01-006-base', tactic: '火系爆發，低星支援；勝後仍要為山路保留生命。' },
    { id: 'fire-mountain-fan', bossId: 'tieshan', name: '第二戰 · 翠雲問扇',
      description: '鐵扇請你先收起急切。減傷與回丹守在門前，借風的人得把耐心也算進去。',
      opponentDeck: ['tieshan', 'lindaiyu', 'guanyin', 'baigu', 'wujing', 'yinjiao', 'puti', 'bailong'],
      dropPrintId: 'wx01-010-base', tactic: '減傷與資源回收；別把每次勝利都當成同樣大的進展。' },
    { id: 'fire-mountain-bull', bossId: 'niumowang', name: '第三戰 · 赤嶺守關',
      description: '牛魔王不再試探。前兩戰留下的生命與仙丹，會陪你回答山口的最後四次落子。',
      opponentDeck: ['niumowang', 'bajie', 'luzhishen', 'zhenyuan', 'wujing', 'honghaier', 'yanxin', 'bailong'],
      dropPrintId: 'wx01-015-base', tactic: '力量、回復與高傷害持續施壓；準備好最後一局的資源。' },
  ],
});
