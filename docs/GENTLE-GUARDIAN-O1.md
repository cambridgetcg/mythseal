# O1 · The gentle first guardian (緩渡)

**Status: `proposal · 2026-10-21`, revised after review rounds 1 and 2
(§12, §14); implemented 2026-10-21 on the branch `o1/gentle-guardian` as local
commits, not pushed, merged or deployed (§13).** Code references are to `main`
`3f3d351` unless a file is named on this branch; `t1:` means the branch
`t1/first-visit-hints` (draft PR #18) at `cce9c2c`. The candidate packet O1
is in `docs/BENCHMARKS-HABBY-SUPERCELL.md` §7 on `research/onboarding-i18n`
(PR #20).

**Why now.** ROADMAP's *First battle teaching (D3)* status lists capping the
AI's round-1 spend as an owner fallback after D3's playtest. On 2026-10-21 the
owner chose to prepare the conservative guardian (「保守守衛」) now, as a
packet to review. The game's direction stays away from pressure to pay, so the
first battle should be winnable by learning, not by buying.

**In one paragraph.** A cap on round 1 alone, the fallback as worded (and the
O1 packet's example, 「首回合出丹有上限」), does not reliably help and mostly
makes the first battle *harder*: only a cap of 2 lifts a newcomer who follows
the coach (about 64 % to 78 %), caps of 3 or more push them down, and a player
who holds back in round 1 falls from about 80 % to 9 % even at 2 (§1.2). The current AI spends 8 or more pills in
round 1 in 98.7 % of games and then has almost nothing for rounds 2–4. A
player who spreads pills, as coach mark ② says, beats it in rounds 2–4. If
round 1 is capped, the AI keeps those pills for the later rounds. This spec
therefore proposes a style that holds back in **every** round: in the first
battle, 守渡弈者 commits **at most 2 pills per round, round 1 included**. Fury
costs 3, so it cannot be used. The style is named 緩渡; the preparation screen
states the rule and the guardian hints at it in his own words. Over 2,000
held-out seeded games, a newcomer who follows the coach won 99.5 % (64.4 %
against today's guardian), and one who skips ② in round 1, which D3 then shows
again on round 2, won 98.9 %. A player who never adds pills still loses every
game, and one who pushes all 12 into round 1 still loses. The cost, which
review round 1 found: a player who bids at random does *worse* than against
today's guardian (39.9 % against 49.2 %), and a cap of 1 would be kinder to
every player who uses pills at all (§2, open question 1). Every other battle,
including later visits to 霧隱渡口, keeps today's AI unchanged.

## 1. What the simulations found

### 1.1 Setup

The setup follows the 霧隱渡口 first expedition for a new profile, and
`tools/guardian-sim.mjs` on this branch reproduces every table below:

- **Player deck:** `defaultDeckIds`, all Lv 1 (`createBaseProfile`,
  `progression.mjs:133-145`).
- **Opponent deck:** what `opponentDeck(node)` builds (`app.mjs:1030-1038`),
  a shuffled `LEGACY_CARDS` deck. Mist Gate has no fixed deck. Opponent
  levels are `min(3, node.level)` = 1 (`app.mjs:1062`).
- **Engine:** `createMatch`, `chooseAIMove` and `resolveRound` from this
  branch's `engine.mjs`, with the `spendCap` option of §3.1.
- **Turn order:** the same as the app. When the AI leads, it commits before
  the player chooses. When it follows, it sees only the player's revealed
  card, never the bid (`app.mjs:1043,1164`).
- **Randomness:** the game's own `seededBattleRNG` (`expansion-state.mjs:36`)
  drives the deck shuffle, the draw, the initiative and every AI choice.
  Player policies that need randomness draw from a second stream. That
  generator is a plain LCG, so started on consecutive seeds it gives nearly
  the same first values; the tool therefore hashes each stream's seed first
  (MurmurHash3's 32-bit finaliser): `seededBattleRNG(spreadSeed(seed))` for
  the game and `seededBattleRNG(spreadSeed(seed ^ 0x9e3779b9))` for the
  player. Each game is identical across styles until the first AI choice,
  so the comparisons are paired.
- **Seeds:** styles were explored on seeds 1–1,000. The tables in §1.3 use
  **held-out seeds 100001–102000**, which no choice was tuned on.

Player policies. All but `rand` play the first unused card in the hand, as
the table preselects it (`app.mjs:1040`), and none uses Fury:

| Policy | Pills each round | Stands for |
| --- | --- | --- |
| `coach` | ⌊pills left ÷ rounds left⌋ (3, 3, 3, 3 when nothing is refunded) | Follows ②: 「十二丹撐四回合，莫一次押盡」 |
| `jitter` | The `coach` share plus −1, 0 or +1 | Roughly follows ② |
| `late` | 0 in round 1, then the `coach` share | Commits round 1 straight from ①. D3 then owes ② on round 2 (`battle-teaching.mjs:236-247`) |
| `naive` | 0 | Never adds pills; the UI starts at 0 |
| `one` | 1 | Token bids |
| `allin` | All 12 in round 1, then 0 | Takes "pills = attack" too far |
| `front` | 6 in round 1, then the `coach` share | Leans hard on round 1 |
| `rand` | A random unused card and a uniform bid from 0 to the pills left | Tries anything |
| `explore` | A uniform bid from 0 to 5 | Tries a few amounts |
| `two` | 2 | A flat 2, the guardian's own disclosed number |
| `three` | 3 | A flat 3 |
| `overcorrect` | 0 in round 1, then half of what is left (rounded up) | Learns after round 1 but overshoots |

`rand`, `explore`, `two`, `three` and `overcorrect` were added in review
round 1, which found that no policy modelled a newcomer who tries things out.

### 1.2 A cap on round 1 alone does not help

Seeds 1–1,000. `r1:N`: in round 1 the AI commits at most N pills, counting
Fury as 3. Rounds 2–4 are unchanged. Each cell is the player's win rate.
`node tools/guardian-sim.mjs --seeds 1:1000 --policies coach,late,naive,allin --styles today,r1:0,r1:2,r1:3,r1:4,r1:5,r1:6,r1:8,r1:10`

| AI style | `coach` | `late` | `naive` | `allin` |
| --- | --- | --- | --- | --- |
| today's AI | **64.0 %** | **80.3 %** | 1.1 % | 20.6 % |
| r1:0 | 63.5 % | 35.8 % | 1.5 % | 0.0 % |
| r1:2 | 77.6 % | 8.5 % | 0.7 % | 0.1 % |
| r1:3 | 36.6 % | 9.9 % | 0.7 % | 0.1 % |
| r1:4 | 11.1 % | 14.5 % | 1.2 % | 1.3 % |
| r1:5 | 13.8 % | 25.7 % | 1.9 % | 2.0 % |
| r1:6 | 27.9 % | 41.9 % | 2.1 % | 4.0 % |
| r1:8 | 41.1 % | 54.8 % | 1.0 % | 13.4 % |
| r1:10 | 63.4 % | 80.1 % | 0.9 % | 18.8 % |

At every N, a newcomer who learns to bid does no better than against today's
AI, and usually worse. The one exception is `coach` at N = 2, which depends on
the policy bidding exactly 3 in round 1, and even there the `late` learner
collapses to 8.5 %. An earlier exploration, before the seeds were hashed and
not re-run here, also tried mixed "pace" rules (round 1 at most N, then at
most the even share of what is left plus one): with N from 0 to 10, `coach`
won 28–75 % and `naive` 0.0–0.2 %. The cause is the same in every row. The
pills the AI does not spend in round 1, it spends later. Today's AI is
beatable precisely because it spends 9.3 pills on average in round 1.

**What does not change.** A player who never adds pills loses under every
style in which the guardian still uses pills: at most 2.1 % in any row of
this section or §1.3. No cap can fix that, and none should; it is what D3
teaches. What a style *can* do is make following the coach pay off, forgive
a lapse that the coach corrects one round later, and make round 1 hurt less.

### 1.3 Held-out comparison (seeds 100001–102000)

`each:N`: the AI commits at most N pills in every round (Fury counts 3).
`r1:2+each:3` applies both. Cells: player win % (draws, mean player life lost
in round 1). Every policy plays the same 2,000 games. The last three columns
describe the AI over the `coach` games.
`node tools/guardian-sim.mjs --seeds 100001:2000 --styles today,r1:2,r1:3,r1:4,r1:2+each:3,each:1,each:2,each:3`

The seven policies of the first draft:

| AI style | `coach` | `jitter` | `late` | `naive` | `one` | `allin` | `front` | AI round 1 mean | AI round 1 ≥ 8 | AI total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| today's AI | 64.4 (164d, −7.0) | 58.9 (153d, −7.0) | 82.0 (159d, −7.0) | 0.9 (7d, −7.0) | 15.1 (98d, −7.0) | 22.0 (168d, −0.0) | 68.0 (104d, −3.5) | 9.3 | 98.7 % | 12.3 |
| r1:2 | 76.7 (134d, −0.3) | 74.6 (127d, −0.3) | 8.7 (141d, −4.3) | 0.6 (5d, −4.3) | 7.5 (73d, −3.9) | 0.1 (3d, −0.0) | 58.3 (153d, −0.0) | 1.7 | 0.0 % | 12.2 |
| r1:3 | 35.3 (157d, −2.5) | 48.4 (121d, −2.0) | 10.1 (157d, −4.2) | 0.9 (11d, −4.2) | 4.8 (85d, −4.1) | 0.3 (6d, −0.0) | 75.3 (122d, −0.0) | 2.8 | 0.0 % | 12.1 |
| r1:4 | 8.8 (136d, −4.8) | 32.4 (115d, −3.5) | 14.0 (174d, −4.9) | 0.4 (13d, −4.9) | 4.0 (68d, −4.9) | 0.6 (18d, −0.0) | 85.4 (102d, −0.0) | 3.8 | 0.0 % | 12.0 |
| r1:2+each:3 | 72.9 (112d, −0.3) | 78.3 (113d, −0.3) | 94.0 (46d, −4.3) | 0.0 (0d, −4.3) | 1.3 (9d, −3.9) | 0.1 (3d, −0.0) | 15.3 (100d, −0.0) | 1.7 | 0.0 % | 9.6 |
| each:1 | 100.0 (0d, −0.0) | 99.9 (2d, −0.0) | 99.5 (8d, −3.6) | 0.7 (17d, −3.6) | 57.0 (109d, −1.7) | 6.4 (62d, −0.0) | 99.8 (1d, −0.0) | 0.9 | 0.0 % | 3.2 |
| **each:2 (緩渡)** | **99.5 (5d, −0.3)** | **96.9 (21d, −0.3)** | **98.9 (15d, −4.3)** | **0.0 (0d, −4.3)** | **3.3 (37d, −3.9)** | **0.0 (4d, −0.0)** | **72.9 (99d, −0.0)** | 1.7 | 0.0 % | 6.3 |
| each:3 | 59.7 (137d, −2.5) | 65.2 (143d, −2.0) | 93.6 (48d, −4.2) | 0.0 (0d, −4.2) | 0.8 (4d, −4.1) | 0.1 (5d, −0.0) | 17.5 (108d, −0.0) | 2.8 | 0.0 % | 10.5 |

The five policies review round 1 added, on the same games:

| AI style | `rand` | `explore` | `two` | `three` | `overcorrect` |
| --- | --- | --- | --- | --- | --- |
| today's AI | 49.2 (139d, −3.5) | 39.3 (136d, −7.0) | 48.4 (168d, −7.0) | 64.4 (164d, −7.0) | 84.3 (146d, −7.0) |
| r1:2 | 31.0 (91d, −0.7) | 37.1 (127d, −1.6) | 60.8 (129d, −0.9) | 76.5 (134d, −0.3) | 16.3 (121d, −4.3) |
| r1:3 | 32.3 (125d, −1.1) | 30.9 (114d, −2.4) | 20.4 (127d, −3.4) | 35.3 (157d, −2.5) | 35.5 (129d, −4.2) |
| r1:4 | 36.2 (111d, −1.6) | 28.8 (118d, −3.4) | 6.6 (120d, −4.9) | 8.8 (136d, −4.8) | 53.7 (146d, −4.9) |
| r1:2+each:3 | 23.6 (146d, −0.7) | 50.3 (169d, −1.6) | 52.9 (120d, −0.9) | 71.9 (114d, −0.3) | 42.3 (143d, −4.3) |
| each:1 | 64.2 (99d, −0.4) | 86.1 (49d, −0.9) | 99.9 (1d, −0.1) | 100.0 (0d, −0.0) | 99.2 (12d, −3.6) |
| **each:2 (緩渡)** | **39.9 (156d, −0.7)** | **65.0 (121d, −1.6)** | **84.2 (65d, −0.9)** | **99.5 (5d, −0.3)** | **84.7 (83d, −4.3)** |
| each:3 | 20.1 (145d, −1.1) | 43.1 (171d, −2.4) | 30.7 (110d, −3.4) | 58.6 (130d, −2.5) | 43.4 (166d, −4.2) |

`three` and `coach` are the same policy unless a card refunds pills, which
is why their cells nearly match. Under 緩渡, over the `coach` games, the
guardian committed 0 pills in 5.8 % of rounds, 1 in 25.4 % and 2 in 68.8 %.

**Deck check.** A newcomer may swap the four welcome cards into the deck
before the first battle. The deck 悟空, 關羽, 林黛玉, 孔子 plus 焰心, 翠弦,
青霄 and 霜璃 (22★) was run on the same held-out seeds:
`node tools/guardian-sim.mjs --seeds 100001:2000 --policies coach,jitter,late,naive,allin,rand,explore --styles today,each:2,each:1 --deck wukong,guanyu,lindaiyu,kongzi,yanxin,cuixian,qingxiao,shuangli`

| AI style | `coach` | `jitter` | `late` | `naive` | `allin` | `rand` | `explore` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| today's AI | 55.1 % | 51.4 % | 72.5 % | 0.9 % | 19.1 % | 43.0 % | 34.9 % |
| each:2 | 97.8 % | 92.5 % | 95.9 % | 0.0 % | 0.4 % | 36.4 % | 61.4 % |
| each:1 | 100.0 % | 99.6 % | 98.0 % | 0.1 % | 4.3 % | 61.3 % | 81.4 % |

**Against the first draft's numbers.** The first draft seeded the LCG with
the raw seeds. Hashing them moved the deterministic policies' cells in §1.3
by at most 2.6 points (`one` under each:1, 54.4 → 57.0) and `jitter`'s by up
to 5.8 points; §1.2's 1,000-seed cells moved by up to 5.6 points. No
conclusion changed. With raw seeds the random policies were sensitive to the
stream: `explore` under each:2 gave 72.8 % with review round 1's raw player
stream and 63.7 % with the first draft's; with hashed seeds it is 65.0 %.

## 2. The style: 緩渡, at most 2 pills a round

**Rule.** In the first battle, as defined in §4, each pill commitment
守渡弈者 makes (pills, plus 3 if Fury) is at most **2**, in every round. With
2 below Fury's cost, he never uses 怒擊. Otherwise he plays exactly as today.
He uses the same public information, the same scoring and the same
near-equal shortlist, and he picks within the shortlist at random as before.

**Why every round, and not a cap on round 1 only.** A cap on round 1 alone
keeps the pills for later (§1.2): at r1:2 the `late` learner wins 8.5 %, and
at r1:3 or r1:4 even the coach-follower does worse than today.

**Why 2, and what it costs.** The case for 2:

- At 2, following the coach pays: `coach` won 99.5 % and `jitter` 96.9 %.
  ②'s own number, 3 a round, is the amount that beats his disclosed 2
  (`three` 99.5 %). At 3 the guardian mirrors the coach's advice and the
  game comes down to the cards (59.7 %).
- At 2, one lapse is forgiven. `late` committed round 1 at 0 pills, met D3's
  owed ② on round 2 and still won 98.9 %.
- At 2, the misreadings ② names still lose: `naive` won 0 of 2,000 games and
  `allin` 0 of 2,000; token bids (`one`) won 3.3 %.
- At 2, round 1 hurts less. Life lost in round 1 falls from 7.0 to 0.3 for
  `coach` and to 4.3 for `naive`. Today the AI spends 8 or more pills in round
  1 of 98.7 % of these games; under 緩渡 it never does.
- The rule is fixed before the battle and is one sentence long. It does not
  react to the score, the player's life or the player's pills, so it is no
  rubber band. A player can check it on every reveal: the opponent's pills
  never fall by more than 2.

The case against it, which review round 1 found:

- **A player who bids at random does worse than today:** `rand` won 39.9 %
  under 緩渡 against 49.2 % against today's AI. So do token bids (`one`,
  3.3 % against 15.1 %). Today's AI spends heavily in round 1 and is then
  weak; a steady 2 a round punishes erratic bids more. The players most
  likely to bid erratically are exactly the first-time players O1 is for.
- **At 1, every policy that uses pills does better than at 2:** `rand`
  64.2 %, `explore` 86.1 %, `one` 57.0 %, `front` 99.8 %, `overcorrect`
  99.2 %, and every one of them beats today's AI except `allin` (6.4 %),
  while `naive` still loses (0.7 %).
- **2 is not a strict test of ② either:** a flat 2 (`two`) wins 84.2 %. The
  first draft rejected 1 because there token bids win and front-loading
  wins, "so the battle would no longer test ②"; at 2 the battle tests "bid
  about 3", not "spread 12 over 4". What both numbers keep is that never
  adding pills, and pushing all 12 into round 1, lose.

So the choice is between a first battle that rewards ②'s exact advice and
still beats erratic bidding (2), and one that is safer than today for anyone
who uses pills at all (1). This spec keeps **2** as the default, because the
coach's number then beats the guardian's number and nothing much smaller
does, and because the playtest can show which matters more: if first-time
players bid erratically and lose under 緩渡, change `GENTLE_GUARDIAN.spendCap`
to 1 (the disclosure copy follows the constant; one test band moves, §7).
Open question 1 asks the owner.

**Rounds 2–4.** The same rule as round 1, at most 2 a round, and nothing else
changes. The guardian ends the battle with at least 4 unspent pills (12 − 4×2);
these count for nothing at the end, as they do today.

**Not proposed.** Lowering the guardian's life or pills, changing rewards,
changing which cards he draws, or letting the style depend on how the battle
is going.

## 3. Where it hooks in

### 3.1 `engine.mjs`: one opt-in option on `chooseAIMove`

```js
export function chooseAIMove(state, rng = Math.random, revealedPlayerCardId = null, { spendCap = Infinity } = {}) {
  if (spendCap !== Infinity && !(Number.isInteger(spendCap) && spendCap >= 0)) throw new RangeError(…);
  …
        if (pills + (fury ? RULES.furyCost : 0) > Math.min(position.opponent.pills, spendCap)) continue;
```

That is the whole engine change: the signature, a check of the option, and
the cap in the candidate filter that already enforces affordability.

- **The engine file changes, the rules do not.** The O1 packet (BENCHMARKS
  §7) says 「引擎與公平模式不變」. `engine.mjs` does change: one optional
  argument. `createMatch`, `validateMove`, `resolveRound`, `previewMove` and
  `RULES` are untouched, and so are the fair modes (`practice`, `arena`,
  `activity`), which never receive the option (§4). The cap narrows which
  moves the AI considers; it changes nothing about how moves resolve.
- **The default path is identical.** With no option, `{}`,
  `{ spendCap: Infinity }` or a cap of 12 or more, the filter reduces to
  today's. A test plays the same seeded games with each and compares every
  move (§7, test 1). As one-off evidence, the SHA-256 over `[cardId, pills,
  fury]` of 1,381 AI moves (seeds 1–200 × two policies) is
  `b11fd3b617ada9c0075a01f8282e23e02e4f4077d5f43c649ee200953f30ce1e` on
  `3f3d351` and, for all four forms, on this branch.
- **The AI still sees only public facts.** The cap is a constant the caller
  passes. `publicPosition` (`engine.mjs:310`) is unchanged, and the hidden bid
  is still never an input (AGENTS.md: "do not give AI access to the player's
  hidden move").
- **There is always a legal move.** Pills 0 without Fury passes every cap, so
  the candidate list cannot be empty.

**Alternatives rejected.**

- *A wrapper that hands the AI a copy of the state with
  `opponent.pills = min(pills, N)`.* It would mislead the AI about its own
  reserve. Through the `refundOnLoss` clamp in `resolveRound` it can also
  reorder candidates, so it is not the same as a filter.
- *A second, separate AI for 霧隱渡口.* It would be a second scoring
  function to keep in step with the first.

### 3.2 A new pure module: `guardian-style.mjs`

```js
export const GENTLE_GUARDIAN = Object.freeze({ id: 'gentle-crossing', name: '緩渡', nodeId: 'mist-gate', spendCap: 2 });
export function guardianStyle({ encounter = null, played = 0, cleared = [] } = {}) { … }   // §4's condition
export const styleById = id => (id === GENTLE_GUARDIAN.id ? GENTLE_GUARDIAN : null);
export const aiOptions = style => (style ? { spendCap: style.spendCap } : {});
```

It has no DOM, no storage and no randomness. It does not import from
`battle-teaching.mjs`, whose `FIRST_NODE` is not exported. A test ties the
two conditions together instead (§7).

### 3.3 `app.mjs`: decide the style once, then read only that

Review round 1 found that the first draft's condition,
`guardianStyle({ encounter, played: profile.stats.played })` evaluated at
each use, stops holding as soon as the battle ends: `commitMove` resolves the
last round, `recordFinishedMatch` → `finishBattle` raises `stats.played` to 1,
and only then do `render()` and `matchEndModal()` run. The table label would
vanish from the final reveal, and the result could not know the battle used
緩渡. So:

- **One decision per battle.** `enterStartedBattle` sets a module variable,
  `guardian = guardianStyle({ encounter, played: profile.stats.played, cleared: profile.cleared })`,
  from the profile the start transaction has just saved, whose `played` is
  the value `beginBattle` saw. `persistBattle` writes `guardian: guardian?.id ?? null`
  into the battle snapshot, and `resumeBattle` reads it back with `styleById`
  before anything else, including the settlement of a finished match.
- **Every reader uses that value.** A helper beside `prepareRound`,
  `aiChoose(revealed) = chooseAIMove(match, Math.random, revealed, aiOptions(guardian))`,
  replaces the three AI calls: `prepareRound` (the leading commitment),
  `ensureLeadingCommitment` (rebuilding a missing leading commitment) and
  `commitMove` (the following AI after the card reveal). The battle heading,
  the reveal tip (§3.5) and the result advice (§6.4) read the same variable.
- **A snapshot without the field means no style.** `BATTLE_KEY` is
  device-local, and a 霧隱渡口 battle cannot resume without its snapshot, so
  this covers a first battle that is pending when O1 ships: it keeps today's
  AI to the end, as it was shown at its start.
- **The preparation screen** (`preparationContent`) computes the style for
  the encounter being prepared, with the same function. With a style, it
  passes it to `mistGateArrivalMarkup` and adds the rule line (§6.2) under
  「守渡弈者 · AI 對手」.

### 3.4 `mist-gate-ui.mjs`: the disclosure

`mistGateArrivalMarkup` and `mistGateBattleMarkup` take an optional `guardian`
(a style or null), and a new `mistGateRuleMarkup(guardian)` returns the rule
line, or '' without a style. Without a style, their output is what it was.
`mistGateResultMarkup` does not change (§6.4). The rule line's number comes
from the style's `spendCap`, and its 「不用怒擊」 clause holds only while the
cap is below Fury's cost, so it is written only then.

### 3.5 D3's reveal tip states the cap

`revealTip` (`battle-teaching.mjs:172-184`) shows *rich*, 「提防對手重注」,
whenever the opponent has 4 or more pills than the player. Under 緩渡 a heavy
stake is impossible, so that line would contradict the rule shown on the same
battle. In the held-out `coach` games it would have shown after 1,600 of the
5,678 round-1–3 reveals (28 %); in the `rand` games after 4,249 of 5,941
(72 %), and after every `allin` reveal.

So `revealTip(view, { spendCap })` takes the disclosed cap as an option.
Where it holds the opponent's stake below his reserve, the *rich* case
becomes *capped*: 「對手每回合至多出 2 丹」. Every other case, and the tip
without the option, is unchanged. `app.mjs` passes `aiOptions(guardian)`;
`battle-ui.mjs` only renders the tip and does not change. On phones, where
the table hides the heading's text (§6.3), this tip is also the one place
during play that repeats the rule. This reopens one D3 file by one optional
parameter; leaving the contradiction is open question 4.

## 4. Where it applies

**Condition:** the encounter is the 霧隱渡口 expedition (`kind` is
`expedition` and `nodeId` is `mist-gate`), `profile.stats.played === 0` and
`profile.cleared` does not include `mist-gate`, meaning no battle has been
finished, at the moment the battle starts. This is D3's coach condition
(`battle-teaching.mjs:217-218`) without its device-local half, and with the
save's clears as a second witness:

- **No `seen`.** The coach's `shanhai.coach.v1` lives on one device, and
  跳過 sets it. How the guardian plays should depend on the save alone, so a
  save plays the same guardian on every device, and skipping the marks does
  not cost a newcomer the gentle battle.
- **It matches T1.** `isFirstVisit` (`t1:first-visit.mjs`) is
  `stats.played === 0 && !pending`, and the guardian lines that send a new
  player to his ferry depend on it.
- **Why the clears too.** A save whose `stats` are missing or invalid
  hydrates `played` as 0 (`progression.mjs:196`) but keeps its clears, and a
  snapshot or file import of a save with `played` 0 and clears passes the
  canonical check, because hydration does not reconcile the two. Clearing the
  ferry needs a won battle, so such a save is a returning player: without
  this half its revisit played the capped AI and was told 「初渡之局」 in place
  of 「燈還亮着。」. For a save with intact stats the two halves agree, so this
  changes nothing else. D3's coach and T1's hints read `played` alone and
  still treat such a save as new; they teach, they do not change how he
  plays, and O1 leaves them to their own packets.
- **It is excluded:** 切磋, 擂台, 火焰山, story and campaign nodes, every
  other realm, and any battle once one has been finished, including a second
  visit to 霧隱渡口 after a loss. A save migrated from v1 with
  `legacyStats.played > 0` (`progression.mjs:134`) is a returning player and
  is excluded. An abandoned first battle is not a finished one, so a
  restarted first battle is 緩渡 again, as it gets D3's coach again.
- **Returning players and fair modes are unaffected by construction.** For
  every battle outside the condition, `aiOptions(null)` is `{}` and the AI's
  path is identical to today's (§3.1).

## 5. Determinism and reload

- **The style cannot change mid-battle.** It is decided once, at the start
  (§3.3), and kept in the battle snapshot. A reload, a resume from the
  pending dialog, a rebuild in `ensureLeadingCommitment` and the settlement
  of the last round all read that value. `stats.played` still changes only in
  `finishBattle` (`progression.mjs:640`), alongside `pending = null` (`:677`).
- **A reload cannot re-roll a move.** That is already true today, and O1
  keeps it. A leading commitment is saved in the battle snapshot (`aiMove`,
  `persistBattle`) before the player plans. A following AI choice is resolved
  and saved in the same step as the commit (`commitMove`).
- **What a seed fixes.** `chooseAIMove(state, rng, revealed, options)` stays
  a pure function of its inputs. Given a seeded `rng`, the same state and
  style always give the same move, which is what the tests and §1 rely on.
  Mist Gate is not a campaign node, so it has no saved `battleSeed`
  (`progression.mjs:611`), and the app still uses `Math.random` for its deck,
  draw and AI choices. O1 does not add a seed. A seed would make a restarted
  battle identical, not a reloaded one, and reloads are already safe.
- **A battle already in progress when O1 ships** has a snapshot without the
  field and keeps today's AI to its end (§3.3). It never showed 緩渡, so
  nothing it showed becomes untrue.
- **The preparation screen and the start.** The preparation re-renders when
  another tab changes the profile (the `storage` event) and when the tab is
  shown again (`visibilitychange`), both through `reloadLocalJourney` →
  `render()` → `preparationContent()`, so its disclosure follows `played`.
  A write that lands between the last repaint and the tap on 踏上渡口 could
  still start a battle whose style differs from the screen; the battle's own
  disclosures (the heading, its `aria-label` and the reveal tip) then show the
  style it really plays. O1 adds no further guard. If the uncommitted
  start-quote work elsewhere lands, `stats.played` can join what it compares.

## 6. Disclosure copy

The style is disclosed twice before the first move. The guardian hints at it
in his own voice, without a number, and a plain line states the exact rule.
The numbers go in the plain line, following the voice split in T1 §2.2
(`t1:docs/TUTORIAL-T1.md`): numbers inside a character's quoted line read
awkwardly and blur what is a rule and what is flavour.

Every new or changed string, with its drafts. 简中 drafts start from a
character conversion and are checked against the 繁中 source; English drafts
are proposals for the string catalogue (§6.5). Code points count the 繁中
string as shown.

| Where | 繁中 (source) | 简中 draft | English draft | Code points |
| --- | --- | --- | --- | --- |
| §6.1 Arrival, his line (`mist-gate-ui.mjs`, `GENTLE_ARRIVAL_QUOTE`) | 初渡之局，我出手放輕，你放膽試。 | 初渡之局，我出手放轻，你放胆试。 | Your first crossing — I'll go lightly. Be bold. | 16 |
| §6.2 Preparation, the rule (`mistGateRuleMarkup`) | 緩渡 · 本局守渡弈者每回合至多出 2 丹，不用怒擊 | 缓渡 · 本局守渡弈者每回合至多出 2 丹，不用怒击 | Gentle Crossing · In this battle the Ferry Guardian stakes at most 2 pills a round and never uses Fury | 26 |
| §6.3 Table label (`mistGateBattleMarkup`) | 守渡弈者 · 緩渡 · AI 對弈 | 守渡弈者 · 缓渡 · AI 对弈 | Ferry Guardian · Gentle Crossing · AI duel | 17 |
| §6.3 Table `aria-label` | 霧隱渡口，守渡弈者，緩渡 | 雾隐渡口，守渡弈者，缓渡 | Mist Gate, Ferry Guardian, Gentle Crossing | 12 |
| §3.5 Reveal tip, *capped* (`revealTip`) | 對手每回合至多出 2 丹 | 对手每回合至多出 2 丹 | Opponent stakes at most 2 pills a round | 12 |
| §6.4 Result advice after a 緩渡 loss (`matchEndModal`) | 十二丹撐四回合，莫一次押盡。下一次，換你掌握勝負。 | 十二丹撑四回合，莫一次押尽。下一次，换你掌握胜负。 | Twelve pills must last four rounds; don't stake them all at once. Next time, the outcome is yours. | 25 |

### 6.1 The guardian's line (arrival scene)

When 緩渡 applies, 「初渡之局，我出手放輕，你放膽試。」 replaces the
newcomer's arrival quote (`mist-gate-ui.mjs`). Today's line,
「不必急着渡河，先看清手中的牌。」, stays for every arrival without 緩渡, and
「燈還亮着。這一程，你想怎樣走？」 for a returning player. It is in his ferry
register (初渡, 你), says that he will hold back without saying by how much,
and invites a try without promising a win. The first draft's options all put
the number in his voice (「…我每回合只出兩丹…」), and 只出兩丹 overstated the
rule: under 緩渡 he commits 2 in 68.8 % of rounds and 0 or 1 in the rest
(§1.3). 至多 belongs to the plain line.

### 6.2 The rule line (preparation screen)

The line goes under 「守渡弈者 · AI 對手」, in the style of that line, inside
the same paragraph. 本局 scopes it to this battle, which is also what tells a
player that the next crossing is at full strength. It names 怒擊 because the
rule does; T1's 詞彙 defines the term (`t1:glossary.mjs`, id `fury`). At
302 px it takes two lines and at 320 px and wider one; the preparation keeps
its page count and its size in both engines (§7, test 7).

### 6.3 The battle table

`mistGateBattleMarkup`'s small line 「守渡弈者 · AI 對弈」 becomes
「守渡弈者 · 緩渡 · AI 對弈」, and the heading's `aria-label` names 緩渡 too.
**On phones the label is not visible:** below 960 px wide (or 501 px tall)
the status row hides the heading's text and keeps only the lantern
(`scene-content.css:80`), so there the label reaches screen readers through
the `aria-label`, and the reveal tip (§3.5) is what repeats the rule during
play. On roomy screens the label shows on one line, as tall as without the
style. Measured in §7, test 7.

### 6.4 After the battle

The result note (`mistGateResultMarkup`) keeps today's lines. The first draft
added 「…下回渡河，我不再讓。」 and 「…下一程，我不再讓。」; review round 1
rejected both. 讓 says outright that he conceded, which works against
teaching rather than gifting. After a first clear the player goes on to
青玉森庭, not back across the ferry. And for the players who lose under 緩渡,
full strength is not harder: by §1.3, `allin` goes from 0.0 % to 22.0 %,
`rand` from 39.9 % to 49.2 % and `naive` from 0.0 % to 0.9 %. The rule line's
本局 has already said the style is for this battle only.

One existing line does change. After a loss, `matchEndModal` advises
「記住對手的出丹節奏，下一次，換你掌握勝負。」. After a 緩渡 loss that rhythm
(at most 2 a round) will not come again: the next crossing spends about 9 in
round 1. So after a 緩渡 loss the advice is ②'s own sentence, which names the
lesson that the losing policies (`naive`, `one`, `allin`, `rand`) miss:
「十二丹撐四回合，莫一次押盡。下一次，換你掌握勝負。」. The win and draw
advice do not change. At 302, 320 and 393 px the result keeps its pages
(§7, test 7).

### 6.5 Translation note

The 简中 and English drafts are for the string catalogue in I18N-PLAN §3.1
(on `research/onboarding-i18n`); they are not wired into the code before L0.
These terms are proposals for the term base (I18N-PLAN §4.1), which T1's 20
glossary ids seed:

| Term | Proposed English | Note |
| --- | --- | --- |
| 守渡弈者 | Ferry Guardian | New entry |
| 緩渡 | Gentle Crossing | New entry |
| 霧隱渡口 | Mist Gate | The code's name for the node; a literary name is open |
| 仙丹 | pills (provisional) | T1 glossary id `pills`; the plan has no English yet. "elixirs" is the alternative; every English draft above changes with it |
| 怒擊 | Fury (provisional) | T1 glossary id `fury` |

The 简中 drafts keep the game's 「」 quotation marks; whether a 简中 catalogue
uses “” instead is a catalogue style choice, not made here.

## 7. Tests

Unit tests under Node's runner, and one browser smoke extended in both
engines. All are on this branch.

1. **`tests/engine.test.mjs`: the default path is unchanged.** The same
   seeded games (seeds 1–20 × expedition, arena and practice × two player
   policies) are played with no option, `{}`, `{ spendCap: Infinity }` and
   `{ spendCap: 12 }`, and every AI move and result must match. No stored
   digest: a later card or AI change does not break the test, which shows
   only that the option is inert when absent (§3.1 records the digest once).
2. **`tests/engine.test.mjs`: the cap holds.** Across seeded positions in
   rounds 1–4, leading and following, every move costs at most
   `min(spendCap, pills)` for caps 0, 1, 2, 3 and 5; below Fury's cost no move
   uses Fury. `-1`, `1.5`, `NaN`, `-Infinity`, `'2'` and `null` throw
   `RangeError`.
3. **`tests/engine.test.mjs`: still public-only and seeded.** The hidden-field
   test, repeated with `{ spendCap: 2 }`: the same seed gives the same move,
   a state whose hidden fields throw when read gives it too, and a following
   AI learns only the revealed card.
4. **`tests/guardian-style.test.mjs`: where it applies.** Over a grid of
   encounters (霧隱渡口, 赤燼關, 青玉森庭, practice, arena, activity, a
   practice match carrying `mist-gate`, none) and `played` 0, 1, 2 and 10,
   `guardianStyle` is `GENTLE_GUARDIAN` exactly for the 霧隱渡口 expedition
   at 0, and `!== null` equals `coachStart({ seen: null, … }) !== null`. A
   save hydrated without stats but with 霧隱渡口 cleared gets no style and
   the returning arrival line; the same save with nothing cleared gets it.
   Returning players and every fair mode get `{}`. `styleById` knows only the
   style's id.
5. **`tests/guardian-style.test.mjs`: the seeded result.** `tools/guardian-sim.mjs`
   on held-out seeds 100001–100200 under `each:spendCap`: `coach` and `late`
   win at least 95 %; `naive` and `allin` at most 5 %. The same seed is the
   same game, and the AI never commits more than the cap. The bands are wide
   on purpose, so that a change in card data shows up as a review, not as a
   flake. With a cap of 1 the `allin` band moves (6.4 % in §1.3).
6. **`tests/guardian-style.test.mjs`: copy and tip.** The arrival line is
   13–30 code points and has no number or mechanic in it; the rule line, the
   table label and the `aria-label` are as in §6; without a style the three
   `mist-gate-ui.mjs` functions return what they returned before, and no
   result line says 緩渡 or 不再讓. The tip is *capped* where it would be
   *rich*, and every other case is unchanged.
7. **`tools/coach-smoke.mjs` (`npm run test:coach`), sections 8 and 8b,
   Chromium (Pixel 7) and WebKit (iPhone 15).** On a fresh journey: the
   preparation shows the guardian's line and the rule; the battle snapshot
   names the style from the start; when the guardian leads, his saved
   commitment costs at most 2 and is the same after a reload; every
   commitment of the battle, the final round's included, costs at most 2;
   after six pills in round 1 the tip is *capped* and no tip is *rich*; after
   the last round the table still names the style, the result gives the
   advice for its outcome and today's note; the second crossing shows no rule
   line and today's arrival line and starts without a style. A first battle
   saved before O1 resumes without the style. A save with `played` 0 that has
   cleared 霧隱渡口 shows 「燈還亮着。」, no rule line, and starts without a
   style. At 302×640, 320×568 and 393×852 the rule line shows inside the
   preparation in at most two lines, the preparation keeps its page count and
   size, the status row and heading keep their height and the reveal footer
   is no taller with the *capped* tip than with 「提防對手重注」; at 1280×720
   the label shows on one line, as tall as without the style. No PNG is
   written.

## 8. Exit evidence

- **Held-out simulation (§1.3).** A newcomer who follows the coach can win:
  `coach` 99.5 %, `jitter` 96.9 %, `late` 98.9 %. A player who never adds
  pills, or adds them all at once, still loses: `naive` and `allin` 0 of
  2,000. Round 1 hurts less: life lost by `coach` falls from 7.0 to 0.3. The
  cost is in §2: `rand` 39.9 % against 49.2 % today.
- **Returning players unaffected.** The default path is unchanged (test 1,
  and the digest in §3.1). Every battle outside §4 keeps the "today's AI"
  row of §1.3, including a newcomer's second battle.
- **Still needed:** D3's playtest with at least three first-time players,
  with the O7 record format (time to first result, where they stopped,
  whether they can explain one reveal), watching in particular whether
  players bid erratically under 緩渡 (§2). A simulation says the battle is
  winnable for a scripted coach-follower; only people can say whether 緩渡
  feels like a teacher and not a gift.

## 9. Interaction with T1 (#18) and O2

- **The guardian's T1 lines stay true.** T1's `home-start` and `arena-first`
  hints speak as 守渡弈者: 「燈在渡口等你，首局我陪你走。」, and
  「…先落第一子。」 once the coach has ended (`t1:first-visit.mjs`). Both hold
  under the same `played === 0`. 緩渡 makes 「我陪你走」 truer, because the
  opponent is now restrained as well as the table coached. No T1 string needs
  to change.
- **T1's routes lead to 緩渡.** 啟程遊歷 and 先赴霧隱渡口, the rules dialog's
  知其道，入其局 (`rulesStartRoute`) and, since T1.1, 任務手札's 前往 for
  今日落子 and 七日弈緣 (`questGoRoute`, `6697c05`) all open the 霧隱渡口
  preparation on a first visit, so a newcomer meets the disclosure there.
- **T1 left the AI cap out of its scope.** It lists the AI round-1 cap as out
  of scope (`t1:docs/TUTORIAL-T1.md` §"Out of scope"), so O1 does not overlap
  T1 in purpose.
- **The code barely overlaps.** T1's `app.mjs` hunks avoid
  `preparationContent`, `enterStartedBattle`, `prepareRound`,
  `ensureLeadingCommitment`, `resumeBattle`, `commitMove` and `matchEndModal`,
  and its import change is in a different block. It does not edit
  `mist-gate-ui.mjs`, `engine.mjs` or `battle-teaching.mjs`. Both branches
  add to `tools/coach-smoke.mjs` (T1 sections 4b and 4c and header lines, O1
  sections 8 and 8b before the final error check) and to
  `hosting/public-assets.json` (T1 after `battle-teaching.css`, O1 after
  `mist-gate-ui.mjs`), in different places. Either can merge first. The one
  text conflict is `docs/README.md`, where O1's row sits right below two rows
  T1 rewrites: keep T1's two rows, then O1's row (a trial merge in either
  order gave the same tree and 708 passing tests).
- **The practice bypass (O2) narrows.** T1.1 routes the 任務手札 tasks to the
  ferry. A player can still reach 切磋 or 擂台 first through 對弈 (the dock, or
  問道五弈's 前往); that player has `played` 1 at the ferry and gets neither
  the coach marks nor 緩渡. O2 closes the rest of the bypass for both; O1 does
  not try to.

## 10. Open questions for the owner

1. **The number.** Default: at most 2 a round, every round. At 1, every
   policy that uses pills does better (`rand` 64.2 % against 39.9 %,
   `explore` 86.1 % against 65.0 %, `one` 57.0 % against 3.3 %), and
   `naive` and `allin` still lose (0.7 %, 6.4 %); at 2, ②'s 3 a round is
   what beats him, and erratic bids fare worse than today (§2). The change
   is one constant. The roadmap's wording was a cap on round 1 alone; §1.2
   shows why it is not recommended.
2. **How long 緩渡 lasts.** As briefed, only while no battle has been
   finished (`played === 0`, and 霧隱渡口 not cleared, §4), the same first
   battle as D3 and T1. The alternative is every 霧隱渡口 visit until it is
   first cleared. On that second try a player who has learned to spread pills
   would win 99.5 % under 緩渡 against 64.4 % today. This changes the
   condition.
3. **The name and the lines.** Is 緩渡 the right name? Alternatives: 讓丹,
   留燈. Is 「初渡之局，我出手放輕，你放膽試。」 his line? Should the rule
   line show the number 2?
4. **D3's reveal tip.** Keep the *capped* tip (§3.5, implemented), or leave
   D3's `battle-teaching.mjs` frozen and accept 「提防對手重注」 beside the
   disclosed rule?
5. **Order with the playtest.** Ship O1 before D3's three-player playtest, or
   keep it ready and playtest without it first? With three players, the
   playtest cannot compare the two.
6. **Release scope.** O1 is not in the proposed v0.6.0 (RELEASE-NEXT: Q1, D1,
   N1, D2, D3). Should it join that release or the one after?

The first draft's question 7, whether the result should announce
「下回…我不再讓」, is answered by review round 1: it does not (§6.4).

## 11. Method notes and limits

- The scripted policies in §1 are stand-ins for players, not predictions of
  human win rates. None of them reads the opponent's announced card, and only
  `rand` chooses cards.
- One player deck was tested, plus a check with the welcome cards. The
  opponent decks are drawn the way the app draws them.
- The simulation is committed as `tools/guardian-sim.mjs`; each table states
  its command. N = 2,000 gives a standard error of about ±1.1 points at a
  65 % win rate and ±0.2 at 99.5 %.
- Review round 1 checked the first draft's numbers independently, with a
  different generator (mulberry32) on different seeds: within about 2 points
  for the policies it compared.
- Draws count as non-wins. In §1.3 a draw is shown next to the win rate.
- Browser evidence is headless Chromium and WebKit with phone descriptors;
  no device, no human player and no hosted service.

## 12. Review round 1 · 2026-10-21

Ten findings. Each is listed with what was done; two are accepted only in
part, with the reason.

| # | Finding | Decision |
| --- | --- | --- |
| 1 (high) | The style, read from `played` at each use, is lost when the battle ends: dead result lines, no label on the final table; a pending battle would change style mid-battle; a stale preparation could start a battle without the style it showed | **Accepted.** Decided once at the start and kept in the battle snapshot; a snapshot without it means no style (§3.3, §5). The stale-preparation case is **accepted in part**: the preparation already re-renders on profile changes from other tabs and on return to the tab, and the battle's own disclosures show the style it plays; no further guard is added (§5) |
| 2 (medium) | 「我不再讓」 presents the win as a gift and misleads a player who lost; the generic loss advice misleads after a 緩渡 loss | **Accepted.** Today's result lines stay; after a 緩渡 loss the advice is ②'s sentence (§6.4) |
| 3 (medium) | No exploring player; a random bidder does worse under 緩渡; at 1 every non-naive policy does better | **Accepted.** Five policies added to the committed tool and to §1.3; §2 states the cost and open question 1 carries the numbers. The default stays at 2, for the reason in §2; the owner decides |
| 4 (medium) | Every guardian line put the number in his voice, against T1 §2.2; 只出兩丹 overstated the rule | **Accepted.** His line has no number (§6.1); the rule line keeps 至多 |
| 5 (medium) | 「提防對手重注」 contradicts the disclosed rule | **Accepted.** `revealTip` takes the cap and shows *capped* instead (§3.5). The finding's note that `battle-ui.mjs` passes the tip through is not quite right: `app.mjs` calls `revealTip`, so `battle-ui.mjs` does not change |
| 6 (medium) | 简中 and English drafts missing for the label and result lines; 仙丹 and 怒擊 not in the term base; "In this battle" | **Accepted.** Every new or changed string has both drafts (§6); the terms are listed for the term base (§6.5) |
| 7 (low) | The golden digest test pins today's AI and card data | **Accepted.** Replaced by a paired comparison; the digest is recorded once in §3.1 |
| 8 (low) | `seed ^ 0x9e3779b9` is negative, so the text as written throws | **Accepted**, and taken further: both streams' seeds are hashed, because raw consecutive seeds made the random policies sensitive to the stream (§1.1, §1.3); every table was regenerated |
| 9 (low) | §9 out of date: T1.1 already routes 今日落子 to 霧隱渡口 | **Accepted.** T1 re-pinned at `cce9c2c` (later than the `7443926` the review read) and §9 updated |
| 10 (low) | Verified: game truth, call sites, public-only AI, fair modes, reload; the packet's 「引擎與公平模式不變」 needs acknowledging | **Accepted.** §3.1 says what changes in `engine.mjs` and what does not |

## 13. Implementation record · 2026-10-21

On the branch `o1/gentle-guardian`, from `main` `3f3d351`, as local commits:
`9abe311` (the engine option and its tests), `fb61473` (`guardian-style.mjs`,
allowlisted for the public build, `tools/guardian-sim.mjs` and their tests),
`665352b` (this spec, revised after review round 1), `3c98e60` (the style
decided at the start and kept in the snapshot, the three AI calls, the
disclosure and the 緩渡 loss advice), `cabb2a5` (the *capped* reveal tip) and
`dea40b6` (`tools/coach-smoke.mjs` sections 8 and 8b), then the documents. The
build follows §3–§7; nothing departs from them. Checks:
[VALIDATION](VALIDATION.md#o1-gentle-first-guardian--2026-10-21).

Seen while measuring, not changed by O1: after a 霧隱渡口 loss, 勝負已定's
first page holds only THE DUEL IS COMPLETE and 悟 at 302 and 320 px, and adds
the heading at 393×659 in WebKit; the advice is on its second page there, with
or without 緩渡. D3's check of the advice is an arena loss, where it is on
the first page.

## 14. Review round 2 · 2026-10-21

One finding (low): a save with cleared nodes but `stats.played` 0 (missing or
invalid stats in an old, imported or recovered save) got 緩渡 and the
first-crossing line on its 霧隱渡口 revisit. **Accepted**, with the first of
the two fixes the review offered: `guardianStyle` also takes `cleared` and
gives no style once 霧隱渡口 is cleared (§4), in `01d78de`. That fixes the AI
as well as the line, which letting `returning` win the arrival line alone
would not, and it makes the guardian and returning lines exclusive, so the
markup test that pinned their order is dropped. D3's coach shares the
`played` half and still coaches such a save; O1 does not change it (§4).
Checks: [VALIDATION](VALIDATION.md#o1-gentle-first-guardian--2026-10-21).
