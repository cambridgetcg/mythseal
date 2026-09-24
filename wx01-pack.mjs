/** WX-01 collation only. No persistence, currency writes or battle effects. */
import { WX01_PRINTINGS, WX01_RARITIES } from './printing-catalogue.mjs';

export const WX01_PRICE = 300;
export const WX01_DRY_LIMIT = 12;
export const WX01_RATES = Object.freeze({ ordinary: .837, aa: .125, leader: .025, treasure: .01, ink: .0025, god: .0005 });
export const WX01_SEAL_COSTS = Object.freeze({ aa: 20, leader: 40, treasure: 100, ink: 200 });
const weights = Object.freeze({ ordinary: 8370, aa: 1250, leader: 250, treasure: 100, ink: 25, god: 5 });
const groups = Object.fromEntries(['base', 'aa', 'leader', 'treasure', 'ink'].map(treatment => [treatment, WX01_PRINTINGS.filter(print => print.treatment === treatment)]));
const pools = Object.fromEntries(['common', 'rare', 'epic'].map(rarity => [rarity, groups.base.filter(print => WX01_RARITIES[print.cardId] === rarity)]));

function unit(rng) {
  const value = rng();
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value >= 1) throw RangeError('rng must return a number in [0, 1).');
  return value;
}
const choose = (items, rng) => items[Math.floor(unit(rng) * items.length)];
const rarity = print => WX01_RARITIES[print.cardId];
function base(rng, guaranteed = false) {
  const roll = unit(rng);
  return choose(pools[guaranteed ? (roll < .75 ? 'rare' : 'epic') : (roll < .6 ? 'common' : roll < .9 ? 'rare' : 'epic')], rng);
}
function validDry(dry) {
  if (!Number.isSafeInteger(dry) || dry < 0 || dry >= WX01_DRY_LIMIT) throw RangeError('西行保底進度無效。');
}
export function getWX01Rates(dry = 0) {
  validDry(dry);
  return dry === 11 ? { ...WX01_RATES, ordinary: 0, aa: .962 } : { ...WX01_RATES };
}
export function drawWX01Pack({ dry = 0, rng = Math.random } = {}) {
  validDry(dry);
  const roll = unit(rng) * 10000;
  let total = 0, naturalMode;
  for (const [mode, weight] of Object.entries(weights)) {
    total += weight;
    if (roll < total) { naturalMode = mode; break; }
  }
  const forced = naturalMode === 'ordinary' && dry === 11;
  const mode = forced ? 'aa' : naturalMode;
  let prints;
  if (mode === 'god') {
    const ink = choose(groups.ink, rng);
    const leader = choose(groups.leader.filter(print => print.cardId !== ink.cardId), rng);
    const aa = choose(groups.aa.filter(print => print.cardId !== ink.cardId && print.cardId !== leader.cardId), rng);
    prints = [aa, leader, ink];
  } else {
    const special = mode === 'ordinary' ? null : choose(groups[mode], rng);
    const first = base(rng), second = base(rng);
    const bothCommon = rarity(first) === 'common' && rarity(second) === 'common';
    prints = [first, bothCommon && special && rarity(special) === 'common' ? base(rng, true) : second, special || base(rng, bothCommon)];
  }
  return {
    mode, naturalMode, forced, dry: mode === 'ordinary' ? dry + 1 : 0,
    cards: prints.map(print => ({ cardId: print.cardId, printId: print.id, rarity: rarity(print) })),
  };
}
