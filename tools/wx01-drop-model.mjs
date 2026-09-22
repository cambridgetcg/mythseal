/** Offline WX01 design candidate only. No imports from or writes to the game. */
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
export const PRICE = 300, CARDS_PER_PACK = 3, DRY_LIMIT = 12;
export const MODE_WEIGHTS = freeze({ ordinary: 8370, aa: 1250, leader: 250, treasure: 100, ink: 25, god: 5 });
// Model-only cardId values are set checklist numbers, not production engine IDs.
// A runtime catalogue needs an explicit mapping (e.g. WX01-005 -> wukong).
export const CHARACTERS = freeze([
  ['唐三藏', 'common'], ['白龍馬', 'common'], ['觀音', 'epic'], ['菩提祖師', 'common'],
  ['孫悟空', 'epic'], ['紅孩兒', 'rare'], ['黃風怪', 'common'], ['金角大王', 'rare'],
  ['白骨精', 'rare'], ['鐵扇公主', 'rare'], ['銀角大王', 'common'], ['六耳獼猴', 'epic'],
  ['豬八戒', 'common'], ['沙悟淨', 'common'], ['牛魔王', 'rare'], ['鎮元大仙', 'common'],
].map(([name, rarity], i) => ({ cardId: `WX01-${String(i + 1).padStart(3, '0')}`, name, rarity })));
const print = (number, treatment) => ({ ...CHARACTERS[number - 1], treatment, printId: `${CHARACTERS[number - 1].cardId}-${treatment}` });
const groups = freeze({
  ordinary: CHARACTERS.map((_, i) => print(i + 1, 'BASE')),
  aa: [5, 1, 2, 13, 3, 10].map(n => print(n, 'AA1')),
  leader: [1, 5, 9, 15].map(n => print(n, 'LAA1')),
  treasure: [print(5, 'TR1')], ink: [5, 12].map(n => print(n, 'INK1')),
});
export const PRINTS = freeze(Object.values(groups).flat());
const rarityOdds = { common: .6, rare: .3, epic: .1 }, guaranteedOdds = { common: 0, rare: .75, epic: .25 };
const sale = { common: 40, rare: 90, epic: 180 };
const pools = Object.fromEntries(Object.keys(rarityOdds).map(r => [r, groups.ordinary.filter(p => p.rarity === r)]));
const distribution = odds => Object.entries(odds).flatMap(([r, probability]) => pools[r].map(card => ({ card, probability: probability / pools[r].length }))).filter(p => p.probability);
const standard = distribution(rarityOdds), guaranteed = distribution(guaranteedOdds);
function unit(rng) { const n = rng(); if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n >= 1) throw RangeError('RNG must return a number in [0,1).'); return n; }
const choose = (items, rng) => items[Math.floor(unit(rng) * items.length)];
function drawBase(rng, guarantee = false) {
  const n = unit(rng), rarity = guarantee ? (n < .75 ? 'rare' : 'epic') : (n < .6 ? 'common' : n < .9 ? 'rare' : 'epic');
  return choose(pools[rarity], rng);
}
function checkDry(dry) { if (!Number.isInteger(dry) || dry < 0 || dry >= DRY_LIMIT) throw RangeError('dry must be an integer from 0 through 11.'); }
export function naturalMode(rng) {
  const n = unit(rng) * 10000; let cumulative = 0;
  for (const [mode, weight] of Object.entries(MODE_WEIGHTS)) { cumulative += weight; if (n < cumulative) return mode; }
  throw Error('Unreachable mode');
}
export function rollPack({ dry = 0, rng = Math.random, protection = true } = {}) {
  checkDry(dry);
  const natural = naturalMode(rng), forced = protection && natural === 'ordinary' && dry === DRY_LIMIT - 1;
  const mode = forced ? 'aa' : natural;
  let cards;
  if (mode === 'god') {
    const ink = choose(groups.ink, rng);
    const leader = choose(groups.leader.filter(p => p.cardId !== ink.cardId), rng);
    const aa = choose(groups.aa.filter(p => p.cardId !== ink.cardId && p.cardId !== leader.cardId), rng);
    cards = [aa, leader, ink];
  } else {
    const special = mode === 'ordinary' ? null : choose(groups[mode], rng);
    const first = drawBase(rng), second = drawBase(rng), bothCommon = first.rarity === 'common' && second.rarity === 'common';
    cards = [first, special?.rarity === 'common' && bothCommon ? drawBase(rng, true) : second, special || drawBase(rng, bothCommon)];
  }
  return { naturalMode: natural, mode, forced, cards, dry: mode === 'ordinary' ? Math.min(DRY_LIMIT - 1, dry + 1) : 0 };
}

/** Every conditional outcome path, including the fresh slot-two upgrade roll. */
export function* enumerateMode(mode) {
  if (!Object.hasOwn(MODE_WEIGHTS, mode)) throw RangeError('Unknown mode');
  if (mode === 'god') {
    for (const ink of groups.ink) {
      const leaders = groups.leader.filter(p => p.cardId !== ink.cardId);
      for (const leader of leaders) {
        const aas = groups.aa.filter(p => p.cardId !== ink.cardId && p.cardId !== leader.cardId);
        for (const aa of aas) yield { cards: [aa, leader, ink], probability: 1 / groups.ink.length / leaders.length / aas.length };
      }
    }
    return;
  }
  for (const a of standard) for (const b of standard) {
    const bothCommon = a.card.rarity === 'common' && b.card.rarity === 'common';
    if (mode === 'ordinary') {
      for (const c of bothCommon ? guaranteed : standard) yield { cards: [a.card, b.card, c.card], probability: a.probability * b.probability * c.probability };
    } else for (const special of groups[mode]) {
      const replacements = bothCommon && special.rarity === 'common' ? guaranteed : [{ card: b.card, probability: 1 }];
      for (const b2 of replacements) yield { cards: [a.card, b2.card, special], probability: a.probability * b.probability / groups[mode].length * b2.probability };
    }
  }
}
export function modeDistribution({ dry = 0, protection = true } = {}) {
  checkDry(dry);
  const rates = Object.fromEntries(Object.entries(MODE_WEIGHTS).map(([m, w]) => [m, w / 10000]));
  if (protection && dry === 11) { rates.aa += rates.ordinary; rates.ordinary = 0; }
  return rates;
}
export function stationaryProtection() {
  const q = MODE_WEIGHTS.ordinary / 10000;
  const renewalMean = Array.from({ length: DRY_LIMIT }, (_, i) => q ** i).reduce((a, b) => a + b);
  const states = Array.from({ length: DRY_LIMIT }, (_, dry) => q ** dry / renewalMean);
  const forcedAA = states[11] * q, modes = modeDistribution();
  modes.ordinary -= forcedAA; modes.aa += forcedAA;
  return { states, renewalMean, forcedAA, modes };
}
function summarize(modes) {
  const prints = Object.fromEntries(PRINTS.map(p => [p.printId, { expectedCopies: 0, hitProbability: 0 }]));
  const rarities = Object.fromEntries(Object.keys(rarityOdds).map(r => [r, { mean: 0, secondMoment: 0 }]));
  let mass = 0, resale = 0;
  for (const [mode, weight] of Object.entries(modes)) for (const outcome of enumerateMode(mode)) {
    const p = weight * outcome.probability, seen = new Set(); mass += p;
    for (const card of outcome.cards) { prints[card.printId].expectedCopies += p; seen.add(card.printId); resale += p * sale[card.rarity]; }
    for (const id of seen) prints[id].hitProbability += p;
    for (const rarity of Object.keys(rarities)) {
      const fraction = outcome.cards.filter(c => c.rarity === rarity).length / CARDS_PER_PACK;
      rarities[rarity].mean += p * fraction; rarities[rarity].secondMoment += p * fraction ** 2;
    }
  }
  return { modes, mass, prints, rarities, expectedResale: resale, expectedNetCost: PRICE - resale, expectedFirstDailyNetCost: PRICE - resale - 80 };
}
export function geometricEvent(probability) {
  if (typeof probability !== 'number' || !Number.isFinite(probability) || !(probability > 0 && probability <= 1)) throw RangeError('Probability must be in (0,1].');
  const quantile = target => probability === 1 ? 1 : Math.ceil(Math.log1p(-target) / Math.log1p(-probability));
  return { probabilityPerPack: probability, meanPacks: 1 / probability, packs50: quantile(.5), packs95: quantile(.95), grossCoins50: PRICE * quantile(.5), grossCoins95: PRICE * quantile(.95), chanceByPacks: Object.fromEntries([10, 50, 100, 200, 500].map(n => [n, -Math.expm1(n * Math.log1p(-probability))])) };
}
export function analyzeDrops() {
  const protection = stationaryProtection(), natural = summarize(modeDistribution()), effective = summarize(protection.modes);
  // AA protection never replaces these natural modes: their pack events stay IID.
  const wukongInk = natural.prints['WX01-005-INK1'].hitProbability, liuerInk = natural.prints['WX01-012-INK1'].hitProbability;
  const events = { ink: geometricEvent(wukongInk + liuerInk), treasure: geometricEvent(natural.prints['WX01-005-TR1'].hitProbability), god: geometricEvent(natural.modes.god), wukongInk: geometricEvent(wukongInk), liuerInk: geometricEvent(liuerInk) };
  return { candidate: 'WX01 cosmetic-leader design; not live pack rules', price: PRICE, cardsPerPack: CARDS_PER_PACK, characterCount: CHARACTERS.length, printCount: PRINTS.length, catalogue: PRINTS, natural, protected: effective, dry11: summarize(modeDistribution({ dry: 11 })), protection, events, god: summarize({ god: 1 }) };
}
/** Reproducible 32-bit PRNG for analysis, not trusted issuance or cryptography. */
export function seededRng(seed = 20260922) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw RangeError('Seed must be a uint32.');
  let a = seed;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function simulateDrops({ packs = 1_000_000, seed = 20260922, protection = true } = {}) {
  if (!Number.isSafeInteger(packs) || packs < 1) throw RangeError('packs must be a positive safe integer.');
  const rng = seededRng(seed), modes = Object.fromEntries(Object.keys(MODE_WEIGHTS).map(m => [m, 0]));
  const prints = Object.fromEntries(PRINTS.map(p => [p.printId, { copies: 0, hits: 0 }]));
  const rarities = { common: 0, rare: 0, epic: 0 }, states = Array(12).fill(0);
  let dry = 0, forced = 0;
  for (let i = 0; i < packs; i++) {
    states[dry]++; const pack = rollPack({ dry, rng, protection }); dry = pack.dry; modes[pack.mode]++; forced += Number(pack.forced);
    for (const card of pack.cards) { prints[card.printId].copies++; rarities[card.rarity]++; }
    for (const id of new Set(pack.cards.map(c => c.printId))) prints[id].hits++;
  }
  return { packs, seed, protection, modes, prints, rarities, states, forced, finalDry: dry };
}
/** Six-SE checks; 12x variance allowance for protection-dependent observables.
 * This is a conservative smoke tolerance, not an exact correlated confidence interval.
 * Natural rare modes and non-AA special print hits retain independent pack trials.
 */
export function compareSimulation(simulation, analysis = analyzeDrops()) {
  const expected = simulation.protection ? analysis.protected : analysis.natural, n = simulation.packs, checks = [];
  const check = (name, actual, mean, variance, dependent) => {
    const inflation = simulation.protection && dependent ? 12 : 1;
    const tolerance = 6 * Math.sqrt(Math.max(0, variance) * inflation / n) + 12 / n;
    checks.push({ name, actual, expected: mean, tolerance, varianceInflation: inflation, pass: Math.abs(actual - mean) <= tolerance });
  };
  for (const [mode, p] of Object.entries(expected.modes)) check(`mode:${mode}`, simulation.modes[mode] / n, p, p * (1 - p), ['ordinary', 'aa'].includes(mode));
  for (const print of PRINTS) { const p = expected.prints[print.printId].hitProbability; check(`print-hit:${print.printId}`, simulation.prints[print.printId].hits / n, p, p * (1 - p), ['BASE', 'AA1'].includes(print.treatment)); }
  for (const [r, moment] of Object.entries(expected.rarities)) check(`rarity:${r}`, simulation.rarities[r] / (n * 3), moment.mean, moment.secondMoment - moment.mean ** 2, true);
  return { ok: checks.every(c => c.pass), allowance: '6 SE; 12x variance for protection-dependent statistics, plus 12/n startup allowance', checks };
}
