/**
 * O1 seeded simulation (docs/GENTLE-GUARDIAN-O1.md §1): the 霧隱渡口 first battle of a new
 * journey, scripted player policies against the real engine's AI under a spend cap. Each game
 * is seeded with the game's own seededBattleRNG, which shuffles the opponent deck the way
 * app.mjs opponentDeck does, draws, settles initiative and drives every AI choice; policies
 * that need randomness draw from a second stream. That generator is a plain LCG, so
 * consecutive seeds would start it on nearly the same values: each stream's seed is hashed
 * first. A seed is the same game under every style until the AI's first choice, so the
 * styles are compared on paired games.
 * These are stand-ins for players, not predictions of human win rates.
 *
 * Usage: node tools/guardian-sim.mjs [--seeds 100001:2000] [--policies coach,late,...]
 *          [--styles today,each:2,r1:2,...] [--deck id,id,...] [--json]
 */
import { LEGACY_CARDS, RULES, defaultDeckIds, validateDeck, createMatch, chooseAIMove, resolveRound } from '../engine.mjs';
import { pathToFileURL } from 'node:url';
import { seededBattleRNG } from '../expansion-state.mjs';

/** As app.mjs opponentDeck for a node without a fixed deck: shuffled LEGACY_CARDS until valid. */
function opponentDeck(rng) {
  for (let n = 0; n < 60; n++) {
    const pool = [...LEGACY_CARDS];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const ids = pool.slice(0, 8).map(card => card.id);
    if (validateDeck(ids).valid) return ids;
  }
  return [...defaultDeckIds];
}

/** MurmurHash3's 32-bit finaliser: spreads consecutive seeds over the LCG's whole state. */
export function spreadSeed(seed) {
  let h = seed >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

const unused = side => side.hand.filter(id => !side.used.includes(id));
const share = match => Math.floor(match.player.pills / (RULES.rounds - match.round + 1));
const first = (match, pills) => ({ cardId: unused(match.player)[0], pills: Math.min(match.player.pills, pills), fury: false });

/** Player policies. All but `rand` play the first unused card, which the table preselects
 * (app.mjs prepareRound); none uses Fury. */
export const POLICIES = Object.freeze({
  coach: match => first(match, share(match)), // follows ②: 十二丹撐四回合，莫一次押盡
  jitter: (match, prng) => first(match, Math.max(0, share(match) + Math.floor(prng() * 3) - 1)), // roughly follows ②
  late: match => first(match, match.round === 1 ? 0 : share(match)), // commits round 1 from ①; D3 owes ② on round 2
  naive: match => first(match, 0), // never adds pills; the slider starts at 0
  one: match => first(match, 1), // token bids
  allin: match => first(match, match.round === 1 ? RULES.pills : 0), // everything in round 1
  front: match => first(match, match.round === 1 ? 6 : share(match)), // leans hard on round 1
  rand: (match, prng) => { const ids = unused(match.player); return { cardId: ids[Math.floor(prng() * ids.length)], pills: Math.floor(prng() * (match.player.pills + 1)), fury: false }; }, // tries anything
  explore: (match, prng) => first(match, Math.floor(prng() * 6)), // a random 0–5 each round
  two: match => first(match, 2), // a flat 2
  three: match => first(match, 3), // a flat 3
  overcorrect: match => first(match, match.round === 1 ? 0 : Math.ceil(match.player.pills / 2)), // 0, then half of what is left
});

/** A style is a function from the match to this commitment's cap. `today` is the uncapped AI;
 * `each:N` is N in every round (緩渡 is each:2); `r1:N` caps round 1 alone; `a+b` applies both. */
export function parseStyle(name) {
  if (name === 'today') return () => Infinity;
  if (name.includes('+')) { const parts = name.split('+').map(parseStyle); return match => Math.min(...parts.map(part => part(match))); }
  const [kind, value] = name.split(':'), cap = Number(value);
  if (!Number.isInteger(cap) || cap < 0) throw new RangeError(`Unknown style ${name}.`);
  if (kind === 'each') return () => cap;
  if (kind === 'r1') return match => (match.round === 1 ? cap : Infinity);
  throw new RangeError(`Unknown style ${name}.`);
}

/** One first battle. Returns the winner, life lost in round 1 and what the AI committed each round. */
export function playFirstBattle(seed, policy, style, { deck = defaultDeckIds } = {}) {
  const rng = seededBattleRNG(spreadSeed(seed)), prng = seededBattleRNG(spreadSeed(seed ^ 0x9e3779b9));
  let match = createMatch({ deckIds: [...deck], opponentDeckIds: opponentDeck(rng), rng, mode: 'expedition', opponentName: '守渡弈者' });
  const aiSpend = [];
  let roundOneLoss = 0;
  while (match.status === 'playing') {
    const options = { spendCap: style(match) };
    let ai, move;
    // As in the app: a leading AI commits before the player chooses; a following AI sees only the card.
    if (match.initiative === 'opponent') { ai = chooseAIMove(match, rng, null, options); move = policy(match, prng); }
    else { move = policy(match, prng); ai = chooseAIMove(match, rng, move.cardId, options); }
    aiSpend.push(ai.pills + (ai.fury ? RULES.furyCost : 0));
    const life = match.player.hp;
    match = resolveRound(match, move, ai);
    if (match.history.length === 1) roundOneLoss = life - match.player.hp;
  }
  return { winner: match.winner, roundOneLoss, aiSpend };
}

/** One table cell over the given seeds. */
export function simulate({ seeds, policy, style, deck }) {
  let wins = 0, draws = 0, lost = 0, aiFirst = 0, aiFirstHeavy = 0, aiTotal = 0;
  for (const seed of seeds) {
    const result = playFirstBattle(seed, POLICIES[policy], parseStyle(style), { deck });
    if (result.winner === 'player') wins++; else if (result.winner === 'draw') draws++;
    lost += result.roundOneLoss; aiFirst += result.aiSpend[0]; if (result.aiSpend[0] >= 8) aiFirstHeavy++;
    aiTotal += result.aiSpend.reduce((sum, value) => sum + value, 0);
  }
  const n = seeds.length;
  return { policy, style, games: n, wins, draws, winRate: wins / n, roundOneLoss: lost / n, aiRoundOne: aiFirst / n, aiRoundOneHeavy: aiFirstHeavy / n, aiTotal: aiTotal / n };
}

const range = (start, count) => Array.from({ length: count }, (_, index) => start + index);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), option = name => { const at = args.indexOf(`--${name}`); return at >= 0 ? args[at + 1] : null; };
  const [start, count] = (option('seeds') || '100001:2000').split(':').map(Number);
  const policies = (option('policies') || 'coach,jitter,late,naive,one,allin,front,rand,explore,two,three,overcorrect').split(',');
  const styles = (option('styles') || 'today,each:1,each:2,each:3').split(',');
  const deck = option('deck')?.split(',') ?? defaultDeckIds;
  if (!validateDeck(deck).valid) throw new RangeError('--deck must be a valid eight-card deck.');
  const seeds = range(start, count), rows = [];
  for (const style of styles) for (const policy of policies) rows.push(simulate({ seeds, policy, style, deck }));
  if (args.includes('--json')) console.log(JSON.stringify({ seeds: `${start}:${count}`, deck, rows }, null, 2));
  else {
    const pct = value => `${(100 * value).toFixed(1)}`;
    console.log(`Seeds ${start}–${start + count - 1}; player win % (draws, mean life lost in round 1). AI columns over the first policy's games.`);
    console.log(`| AI style | ${policies.join(' | ')} | AI round 1 mean | AI round 1 ≥ 8 | AI total |`);
    console.log(`| --- | ${policies.map(() => '---').join(' | ')} | --- | --- | --- |`);
    for (const style of styles) {
      const cells = rows.filter(row => row.style === style), lead = cells[0];
      console.log(`| ${style} | ${cells.map(cell => `${pct(cell.winRate)} (${cell.draws}d, −${cell.roundOneLoss.toFixed(1)})`).join(' | ')} | ${lead.aiRoundOne.toFixed(1)} | ${pct(lead.aiRoundOneHeavy)} % | ${lead.aiTotal.toFixed(1)} |`);
    }
  }
}
