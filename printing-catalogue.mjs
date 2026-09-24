/** Immutable printing identity and art bindings. No ownership, progression or RNG. */
import { LEGACY_CARDS, getCard } from './engine.mjs';
import { WX01_ROSTER } from './wx01-cards.mjs';

const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
export { WX01_ROSTER };
export const WX01_CARD_IDS = freeze(WX01_ROSTER.map(entry => entry.cardId));
export const WX01_RARITIES = freeze(Object.fromEntries(WX01_ROSTER.map(entry => [entry.cardId, entry.rarity])));
const numberFor = cardId => WX01_ROSTER.find(entry => entry.cardId === cardId).number;
const printId = (cardId, suffix) => `wx01-${String(numberFor(cardId)).padStart(3, '0')}-${suffix}`;
const fullArt = src => ({ src, columns: 1, rows: 1, index: 0 });
const atlasArt = (src, index, columns = 2, rows = 2) => ({ src, columns, rows, index });
const legacyArt = card => atlasArt(`assets/${card.artSet === 'classics' ? 'classics' : 'portraits'}.png`, card.art, 4, 3);
const legacyPrintings = LEGACY_CARDS.map(card => ({
  id: `legacy/${card.id}`, cardId: card.id, setId: 'legacy', treatment: 'base', name: `${card.name} · 本畫`, art: legacyArt(card),
}));
const baseArt = {
  tangsanzang: ['yun', 0], bailong: ['yun', 1], guanyin: ['yun', 2], puti: ['yun', 3],
  honghaier: ['ember', 0], huangfeng: ['ember', 1], jinjiao: ['ember', 2],
  baigu: ['moon', 0], tieshan: ['moon', 1], yinjiao: ['moon', 2], liuer: ['moon', 3],
  bajie: ['grove', 0], wujing: ['grove', 1], niumowang: ['grove', 2], zhenyuan: ['grove', 3],
};
const basePrintings = WX01_ROSTER.map(({ cardId }) => ({
  id: printId(cardId, 'base'), cardId, setId: 'wx01', treatment: 'base', name: `${getCard(cardId).name} · 本畫`,
  art: cardId === 'wukong' ? legacyArt(getCard(cardId)) : atlasArt(`assets/wx01/base-${baseArt[cardId][0]}.png`, baseArt[cardId][1]),
}));
const special = (cardId, suffix, treatment, title, src) => ({
  id: printId(cardId, suffix), cardId, setId: 'wx01', treatment, name: `${getCard(cardId).name} · ${title}`, art: fullArt(src),
});
export const WX01_PRINTINGS = freeze([
  ...basePrintings,
  special('wukong', 'aa1', 'aa', '踏碎凌霄', 'assets/expansion/wukong-alt.png'),
  special('tangsanzang', 'aa1', 'aa', '長安啟程', 'assets/wx01/tang-aa.png'),
  special('bailong', 'aa1', 'aa', '鷹愁照影', 'assets/wx01/bailong-aa.png'),
  special('bajie', 'aa1', 'aa', '行囊旁的月亮', 'assets/wx01/bajie-aa.png'),
  special('guanyin', 'aa1', 'aa', '甘露回春', 'assets/wx01/guanyin-aa.png'),
  special('tieshan', 'aa1', 'aa', '翠雲一扇', 'assets/wx01/tieshan-aa.png'),
  special('tangsanzang', 'laa1', 'leader', '一願西行', 'assets/wx01/tang-leader.png'),
  special('wukong', 'laa1', 'leader', '我自齊天', 'assets/wx01/wukong-leader.png'),
  special('baigu', 'laa1', 'leader', '千面一念', 'assets/wx01/baigu-leader.png'),
  special('niumowang', 'laa1', 'leader', '萬妖共主', 'assets/wx01/niumowang-leader.png'),
  special('wukong', 'ink1', 'ink', '大鬧天宮', 'assets/expansion/wukong-ink.png'),
  special('liuer', 'ink1', 'ink', '二心三界', 'assets/wx01/liuer-ink.png'),
  special('wukong', 'tr1', 'treasure', '定海神珍', 'assets/expansion/wukong-treasure.png'),
]);
export const PRINTINGS = freeze([...legacyPrintings, ...WX01_PRINTINGS]);
const byId = new Map(PRINTINGS.map(print => [print.id, print]));
const legacyIds = new Set(LEGACY_CARDS.map(card => card.id));

export function getPrinting(id) {
  const print = byId.get(id);
  if (!print) throw new RangeError('找不到這個卡牌版本。');
  return print;
}

export function defaultPrintId(cardId) {
  getCard(cardId);
  return legacyIds.has(cardId) ? `legacy/${cardId}` : printId(cardId, 'base');
}

export function getPrintForCard(cardId, id = undefined) {
  getCard(cardId);
  const print = getPrinting(id === undefined ? defaultPrintId(cardId) : id);
  if (print.cardId !== cardId) throw new RangeError('卡牌版本與角色不相符。');
  return print;
}
