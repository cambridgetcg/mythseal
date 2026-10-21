# O1 · The gentle first guardian (緩渡)

**Status: `proposal · 2026-10-21`.** A reviewable packet, not an
implementation. Nothing in `engine.mjs`, `app.mjs`, `mist-gate-ui.mjs` or any
test has changed. Code references are to `main` `3f3d351`; `t1:` means the
branch `t1/first-visit-hints` (draft PR #18, `ae96aa2`). The candidate packet
O1 is in `docs/BENCHMARKS-HABBY-SUPERCELL.md` §7 on
`research/onboarding-i18n` (PR #20).

**Why now.** ROADMAP's *First battle teaching (D3)* status lists capping the
AI's round-1 spend as an owner fallback after D3's playtest. On 2026-10-21 the
owner chose to prepare the conservative guardian (「保守守衛」) now, as a
packet to review. The game's direction stays away from pressure to pay, so the
first battle should be winnable by learning, not by buying.

**In one paragraph.** A cap on round 1 alone, the fallback as worded, makes
the first battle *harder* for a newcomer who follows the coach. The current AI
spends 8 or more pills in round 1 in 98.6 % of games and then has almost
nothing for rounds 2–4. A player who spreads pills, as coach mark ② says,
beats it in rounds 2–4. If round 1 is capped, the AI keeps those pills for the
later rounds. This spec therefore proposes a style that holds back in
**every** round: in the first battle, 守渡弈者 commits **at most 2 pills per
round, round 1 included**. Fury costs 3, so it cannot be used. The style is
named 緩渡, and the preparation screen and the guardian's own line say so.
Over 2,000 held-out seeded games, a newcomer who follows the coach won 99.6 %
(65.5 % against today's guardian). A newcomer who skips ② in round 1, which D3
then shows again on round 2, won 99.3 %. A player who never adds pills still
loses every game, and one who pushes all 12 into round 1 still almost always
loses. Every other battle, including later visits to 霧隱渡口, keeps today's
AI unchanged.

## 1. What the simulations found

### 1.1 Setup

The setup follows the 霧隱渡口 first expedition for a new profile:

- **Player deck:** `defaultDeckIds`, all Lv 1 (`createBaseProfile`,
  `progression.mjs:133-145`).
- **Opponent deck:** what `opponentDeck(node)` builds (`app.mjs:1030-1038`),
  a shuffled `LEGACY_CARDS` deck. Mist Gate has no fixed deck. Opponent
  levels are `min(3, node.level)` = 1 (`app.mjs:1062`).
- **Engine:** `createMatch`, `chooseAIMove` and `resolveRound` from
  `engine.mjs`. The only change is the option in §3.1, used for the styles
  being tested.
- **Turn order:** the same as the app. When the AI leads, it commits before
  the player chooses. When it follows, it sees only the player's revealed
  card, never the bid (`app.mjs:1043,1164`).
- **Randomness:** the game's own `seededBattleRNG` (`expansion-state.mjs:36`)
  seeded per game drives the deck shuffle, the draw, the initiative and every
  AI choice. Each game is identical across styles until the first AI choice,
  so the comparisons are paired. Player policies that need randomness use a
  second stream, `seededBattleRNG(seed ^ 0x9e3779b9)`.
- **Seeds:** styles were explored on seeds 1–1,000. The table in §1.3 uses
  **held-out seeds 100001–102000**, which no choice was tuned on.

Player policies. Each plays the first unused card in its hand, as the table
preselects it (`app.mjs:1040`), and never uses Fury:

| Policy | Pills each round | Stands for |
| --- | --- | --- |
| `coach` | ⌊pills left ÷ rounds left⌋ (3, 3, 3, 3 when nothing is refunded) | Follows ②: 「十二丹撐四回合，莫一次押盡」 |
| `jitter` | The `coach` share plus −1, 0 or +1 | Roughly follows ② |
| `late` | 0 in round 1, then the `coach` share | Commits round 1 straight from ①. D3 then owes ② on round 2 (`battle-teaching.mjs:236-247`) |
| `naive` | 0 | Never adds pills; the UI starts at 0 |
| `one` | 1 | Token bids |
| `allin` | All 12 in round 1, then 0 | Takes "pills = attack" too far |
| `front` | 6 in round 1, then the `coach` share | Leans hard on round 1 |

### 1.2 A cap on round 1 alone does not help

Seeds 1–1,000. `r1≤N`: in round 1 the AI commits at most N pills, counting
Fury as 3. Rounds 2–4 are unchanged. Each cell is the player's win rate.

| AI style | `coach` | `late` | `naive` | `allin` |
| --- | --- | --- | --- | --- |
| today's AI | **67.9 %** | **84.2 %** | 0.6 % | 21.3 % |
| r1≤0 | 63.5 % | 36.6 % | 2.2 % | 0.0 % |
| r1≤2 | 78.2 % | 9.7 % | 0.6 % | 0.0 % |
| r1≤3 | 35.9 % | 11.0 % | 0.8 % | 0.3 % |
| r1≤4 | 11.1 % | 15.4 % | 0.8 % | 1.0 % |
| r1≤5 | 14.8 % | 29.7 % | 1.5 % | 2.4 % |
| r1≤6 | 30.1 % | 42.5 % | 2.4 % | 4.2 % |
| r1≤8 | 46.7 % | 58.3 % | 1.4 % | 13.1 % |
| r1≤10 | 66.0 % | 83.6 % | 0.5 % | 20.3 % |

At every N, a newcomer who learns to bid does no better than against today's
AI, and usually worse. The one exception is `coach` at N = 2, which depends on
the policy bidding exactly 3 in round 1, and even there the `late` learner
collapses to 9.7 %. Mixed "pace" rules were tried too: round 1 at most N, then
at most the even share of what is left plus one. With N from 0 to 10, `coach`
won 28–75 % and `naive` won 0.0–0.2 %. The cause is the same in every row. The
pills the AI does not spend in round 1, it spends later. Today's AI is beatable
precisely because it spends 9.3 pills on average in round 1.

**What does not change.** A player who never adds pills loses under every
style in which the guardian still uses pills: at most 2.4 % in any row of
this section or §1.3.
No cap can fix that, and none should; it is what D3 teaches. What a style
*can* do is make following the coach pay off, forgive a lapse that the coach
corrects one round later, and make round 1 hurt less.

### 1.3 Held-out comparison (seeds 100001–102000)

`each≤N`: the AI commits at most N pills in every round (Fury counts 3).
Cells: player win % (draws, mean player life lost in round 1). Every policy
plays the same 2,000 games. The last three columns describe the AI over the
`coach` games.

| AI style | `coach` | `jitter` | `late` | `naive` | `one` | `allin` | `front` | AI round 1 mean | AI round 1 ≥ 8 | AI total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| today's AI | 65.5 (145d, −7.1) | 54.5 (144d, −7.1) | 81.8 (135d, −7.1) | 0.9 (13d, −7.1) | 14.2 (89d, −7.1) | 22.2 (149d, −0.0) | 66.6 (98d, −3.7) | 9.3 | 98.6 % | 12.3 |
| r1≤2 | 76.3 (157d, −0.3) | 72.3 (136d, −0.4) | 8.6 (157d, −4.3) | 0.4 (15d, −4.3) | 7.3 (90d, −3.9) | 0.0 (1d, −0.0) | 56.4 (158d, −0.0) | 1.7 | 0.0 % | 12.3 |
| r1≤3 | 34.7 (162d, −2.5) | 51.1 (137d, −1.8) | 9.7 (186d, −4.3) | 0.8 (18d, −4.3) | 4.9 (103d, −4.2) | 0.5 (6d, −0.0) | 76.1 (134d, −0.0) | 2.8 | 0.0 % | 12.2 |
| r1≤4 | 10.2 (134d, −4.8) | 38.2 (118d, −3.2) | 14.6 (181d, −4.9) | 0.9 (19d, −4.9) | 5.1 (92d, −4.9) | 1.3 (21d, −0.0) | 85.4 (100d, −0.0) | 3.8 | 0.0 % | 12.0 |
| each≤1 | 100.0 (0d, −0.0) | 99.9 (0d, −0.0) | 99.6 (7d, −3.6) | 1.8 (9d, −3.6) | 54.4 (112d, −1.8) | 6.5 (63d, −0.0) | 99.8 (2d, −0.0) | 0.9 | 0.0 % | 3.2 |
| **each≤2 (緩渡)** | **99.6 (4d, −0.3)** | **96.2 (22d, −0.4)** | **99.3 (8d, −4.3)** | **0.0 (0d, −4.3)** | **4.0 (36d, −3.9)** | **0.1 (7d, −0.0)** | **72.7 (104d, −0.0)** | 1.7 | 0.0 % | 6.2 |
| each≤3 | 58.9 (131d, −2.5) | 64.5 (147d, −1.8) | 93.8 (45d, −4.3) | 0.0 (0d, −4.3) | 0.5 (3d, −4.2) | 0.1 (0d, −0.0) | 16.6 (110d, −0.0) | 2.8 | 0.0 % | 10.5 |
| r1≤2, then each≤3 | 72.4 (99d, −0.3) | 75.5 (112d, −0.4) | 94.3 (49d, −4.3) | 0.0 (0d, −4.3) | 1.1 (10d, −3.9) | 0.1 (1d, −0.0) | 15.1 (98d, −0.0) | 1.7 | 0.0 % | 9.6 |

**Deck check.** A newcomer may swap the four welcome cards into the deck
before the first battle. The deck 悟空, 關羽, 林黛玉, 孔子 plus the four
lowest-star starters (22★) was run on the same held-out seeds:

| AI style | `coach` | `jitter` | `late` | `naive` | `allin` |
| --- | --- | --- | --- | --- | --- |
| today's AI | 56.1 % | 49.0 % | 72.2 % | 0.7 % | 17.4 % |
| each≤2 | 97.9 % | 91.8 % | 95.6 % | 0.0 % | 0.4 % |
| each≤1 | 100.0 % | 99.6 % | 98.2 % | 0.6 % | 4.0 % |

## 2. The style: 緩渡, at most 2 pills a round

**Rule.** In the first battle, as defined in §4, each pill commitment
守渡弈者 makes (pills, plus 3 if Fury) is at most **2**, in every round. With
2 below Fury's cost, he never uses 怒擊. Otherwise he plays exactly as today.
He uses the same public information, the same scoring and the same
near-equal shortlist, and he picks within the shortlist at random as before.

**Why 2 per round, and not a cap on round 1 only.**

- At 2, following the coach pays: `coach` won 99.6 % and `jitter` 96.2 %.
  At 3, the guardian mirrors the coach's own advice and the game comes down to
  the cards (58.9 %). A cap on round 1 alone keeps the pills for later (§1.2).
- At 2, one lapse is forgiven. `late` committed round 1 at 0 pills, met D3's
  owed ② on round 2 and still won 99.3 %. A round-1-only cap of 2 drops this
  player to 8.6 %.
- At 2, the two misreadings of pills still lose. `naive` won 0 of 2,000 games
  and `allin` 0.1 %. Token bids (`one`) won 4 %. At 1, token bids win 54 % and
  front-loading 6 pills wins 99.8 %, so the battle would no longer test the
  lesson ② states. Each≤1 is the softer alternative in open question 1.
- At 2, round 1 hurts less. Life lost in round 1 falls from 7.1 to 0.3 for
  `coach` and to 4.3 for `naive`. Today the AI spends 8 or more pills in round
  1 of 98.6 % of these games; under 緩渡 it never does.
- The rule is fixed before the battle and is one sentence long. It does not
  react to the score, the player's life or the player's pills, so it is no
  rubber band. A player can check it on every reveal: the opponent's pills
  never fall by more than 2.

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
  // spendCap: Infinity or a non-negative integer, else RangeError
  …
      for (const fury of [false, true]) {
        if (pills + (fury ? RULES.furyCost : 0) > Math.min(position.opponent.pills, spendCap)) continue;
```

That is the whole engine change (`engine.mjs:322,351`). The first edit
widens the signature; the second applies the cap to the candidate filter that
already enforces affordability.

- **Rules do not change.** `createMatch`, `validateMove`, `resolveRound`,
  `previewMove` and `RULES` are untouched. The cap narrows which moves the AI
  considers; it changes nothing about how moves resolve.
- **The default path is identical.** With no option, `{}` or
  `{ spendCap: Infinity }`, the filter reduces to today's. A paired check over
  1,500 seeded games (5,312 AI calls for each variant) found no difference in
  any move or result. The golden digest in §8 pins this.
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
/** 緩渡 applies to the player's first battle when it is the 霧隱渡口 expedition: D3's coach
 * condition (battle-teaching.mjs:218) read from the save alone, without the device-local coach record. */
export function guardianStyle({ encounter, played }) {
  return encounter?.kind === 'expedition' && encounter.nodeId === GENTLE_GUARDIAN.nodeId && played === 0 ? GENTLE_GUARDIAN : null;
}
export const aiOptions = style => (style ? { spendCap: style.spendCap } : {});
```

It has no DOM, no storage and no randomness. It does not import from
`battle-teaching.mjs`, whose `FIRST_NODE` is not exported. A test ties the
two conditions together instead (§7).

### 3.3 `app.mjs`: three call sites and the preparation line

- A helper beside `prepareRound`:
  `const aiChoose = (revealed = null) => chooseAIMove(match, Math.random, revealed, aiOptions(guardianStyle({ encounter, played: profile.stats.played })));`
- It replaces the three calls: `prepareRound` (`:1043`, the leading
  commitment), `ensureLeadingCommitment` (`:1051`, rebuilding a missing
  leading commitment) and `commitMove` (`:1164`, the following AI after the
  card reveal). Nothing else in the battle flow changes.
- `preparationContent` (`:786-793`): when
  `guardianStyle({ encounter: preparation, played: profile.stats.played })`
  holds, it passes `gentle: true` to `mistGateArrivalMarkup` and adds the rule
  line (§6.2) under 「守渡弈者 · AI 對手」. The battle heading and the result
  note get the same flag (§6.3, §6.4).

### 3.4 `mist-gate-ui.mjs`: the disclosure

`mistGateArrivalMarkup`, `mistGateBattleMarkup` and `mistGateResultMarkup`
each take an optional `gentle` flag that defaults to `false`. With it off,
their output is byte-identical to today's. The copy is in §6.

### 3.5 D3's frozen files stay untouched

O1 does not need to change `battle-teaching.mjs` or `battle-ui.mjs`. The coach
marks, formula, planning hint and reveal tip read only the public view, and
under 緩渡 that view is still true. The one rough edge:

- **The reveal tip's 「提防對手重注」.** `revealTip`
  (`battle-teaching.mjs:172-184`) shows *rich* whenever the opponent has 4 or
  more pills than the player. Under 緩渡 that happened after 1,625 of the
  ~5,640 round-1–3 reveals in the `coach` games (29 %) and after every
  `allin` reveal. The pill counts it shows are true. The warning is weaker
  against a guardian who has said he never stakes more than 2.
- **Recommendation:** leave it. The tip is a general habit, the 緩渡 rule is
  on the same table (§6.3), and changing it would reopen a file that has been
  through five review rounds. To make the tip style-aware instead, the change
  is one parameter on `revealTip`, plus `battle-ui.mjs` passing it through.
  That is open question 4.

## 4. Where it applies

**Condition:** the encounter is the 霧隱渡口 expedition (`kind` is
`expedition` and `nodeId` is `mist-gate`) and `profile.stats.played === 0`,
meaning no battle has been finished. This is D3's coach condition
(`battle-teaching.mjs:217-218`) without its device-local half:

- **No `seen`.** The coach's `shanhai.coach.v1` lives on one device, and
  跳過 sets it. How the guardian plays should depend on the save alone, so a
  save plays the same guardian on every device, and skipping the marks does
  not cost a newcomer the gentle battle.
- **It matches T1.** `isFirstVisit` (`t1:first-visit.mjs`) is
  `stats.played === 0 && !pending`, and the guardian lines that send a new
  player to his ferry depend on it.
- **It is excluded:** 切磋, 擂台, 火焰山, story and campaign nodes, every
  other realm, and any battle once one has been finished, including a second
  visit to 霧隱渡口 after a loss. A save migrated from v1 with
  `legacyStats.played > 0` (`progression.mjs:134`) is a returning player and
  is excluded.
- **Returning players are unaffected by construction.** For every battle
  outside the condition, `aiOptions(null)` is `{}` and the AI's path is
  identical to today's (§3.1).

## 5. Determinism and reload

- **The style cannot change mid-battle.** `stats.played` changes only in
  `finishBattle` (`progression.mjs:640`), which clears `pending` in the same
  transaction (`:677`). While a battle is pending, every AI call sees the same
  `played`, so it gets the same style, including after a reload, a resume from
  the pending dialog or a rebuild in `ensureLeadingCommitment`.
- **A reload cannot re-roll a move.** That is already true today, and O1
  keeps it. A leading commitment is saved in the battle snapshot (`aiMove`,
  `persistBattle`, `app.mjs:338`) before the player plans. A following AI
  choice is resolved and saved in the same step as the commit (`:1164-1168`).
- **What a seed fixes.** `chooseAIMove(state, rng, revealed, options)` stays
  a pure function of its inputs. Given a seeded `rng`, the same state and
  style always give the same move, which is what the tests and §1 rely on.
  Mist Gate is not a campaign node, so it has no saved `battleSeed`
  (`progression.mjs:611`), and the app still uses `Math.random` for its deck,
  draw and AI choices. O1 does not add a seed. A seed would make a restarted
  battle identical, not a reloaded one, and reloads are already safe.
- **A battle already in progress when O1 ships** keeps any leading commitment
  it saved. Only new commitments follow the cap. A move already committed is
  never rewritten.

## 6. Disclosure copy

The style is disclosed twice before the first move. The guardian says it in
his own voice, and a plain line states the exact rule. The numbers go in the
plain line, following the voice split in T1 §2.2.

### 6.1 The guardian's line (arrival scene)

When 緩渡 applies, this replaces the newcomer's arrival quote
(`mist-gate-ui.mjs:8`). Today's line, 「不必急着渡河，先看清手中的牌。」, stays
for every arrival without 緩渡. Each option is 13–30 code points.

| Option | 繁中 (source) | Code points | 简中 draft | English draft |
| --- | --- | --- | --- | --- |
| **A (recommended)** | 「初渡之局，我每回合只出兩丹，你放手試。」 | 19 | 「初渡之局，我每回合只出两丹，你放手试。」 | "Your first crossing: two pills a round from me, no more. Go on, try." |
| B | 「這一局我讓你：每回合不過兩丹，也不用怒擊。」 | 21 | 「这一局我让你：每回合不过两丹，也不用怒击。」 | "This crossing I give you room: two pills a round at most, and no Fury." |
| C | 「從第一回合起，我每回合至多出兩丹。」 | 17 | 「从第一回合起，我每回合至多出两丹。」 | "From the very first round, I stake at most two pills." |

A is recommended because it is in his ferry register (渡, 你), states the
rule, and invites a try without promising a win. B names Fury, which a
newcomer has not met yet. C is the most literal about round 1.

### 6.2 The rule line (preparation screen)

The line goes under 「守渡弈者 · AI 對手」 (`app.mjs:792`), in the style of
that line:

- 繁中: 「緩渡 · 本局守渡弈者每回合至多出 2 丹，不用怒擊」 (26 code points)
- 简中: 「缓渡 · 本局守渡弈者每回合至多出 2 丹，不用怒击」
- English: "Gentle Crossing · this battle the Ferry Guardian stakes at most
  2 pills a round and never uses Fury"

### 6.3 The battle table

On the table, `mistGateBattleMarkup`'s small line 「守渡弈者 · AI 對弈」
(`mist-gate-ui.mjs:13`) becomes 「守渡弈者 · 緩渡 · AI 對弈」 (17 code points),
so the style stays visible during play. Its fit at 302 px has to be measured
in both engines (§7).

### 6.4 After the battle

The next crossing is at full strength, so the result note
(`mist-gate-ui.mjs:21-28`) says so when the battle used 緩渡. If open
question 2 extends 緩渡 until the first clear, the loss line keeps today's
「霧未散，船也還在。歇一息，再來。」.

- Win: 「這一子，我記下了。下回渡河，我不再讓。」 (19)
- Loss: 「霧未散，船也還在。下一程，我不再讓。」 (18)
- Draw: today's line, unchanged

### 6.5 Translation note

The 简中 and English drafts are for the string catalogue in I18N-PLAN §3.1
(on `research/onboarding-i18n`). They are not to be wired into the code
before L0. The English name for 守渡弈者 ("Ferry Guardian") and for 緩渡
("Gentle Crossing") are proposals for the glossary/term base (I18N-PLAN
§4.1).

## 7. Tests

These are unit tests under Node's runner, plus one browser check.

1. **`tests/engine.test.mjs`: the default path is unchanged.** A golden
   digest pins today's AI. SHA-256 over `[cardId, pills, fury]` for every AI
   move, then the winner, for seeds 1–200 × the `naive` and `coach` policies.
   The setup is `createMatch({ rng: seededBattleRNG(seed), mode: 'expedition' })`
   with the default deck on both sides, and the leading AI chooses before the
   player. That is 1,381 AI calls, with digest
   `b11fd3b617ada9c0075a01f8282e23e02e4f4077d5f43c649ee200953f30ce1e` on
   `3f3d351`. The same digest must come out with no option, with `{}` and
   with `{ spendCap: Infinity }`.
2. **`tests/engine.test.mjs`: the cap holds.** Across seeded positions in
   rounds 1–4, with both leading and following, every move costs at most
   `min(spendCap, pills)`. With `spendCap: 2` no move uses Fury. A cap of
   12 or more gives the same moves as no cap. `-1`, `1.5`, `NaN`, `'2'` and
   `null` throw `RangeError`.
3. **`tests/engine.test.mjs`: still public-only.** The existing hidden-move
   test, repeated with `{ spendCap: 2 }`: a state carrying a poisoned hidden
   bid or a UI selection gives the same move as a clean one.
4. **`tests/guardian-style.test.mjs`: where it applies.** `guardianStyle` is
   `GENTLE_GUARDIAN` exactly for an `expedition` at `mist-gate` with
   `played === 0`. It is `null` for 切磋, 擂台, 火焰山, every other node and
   `played` 1, 2 or 10. Over that whole grid, `guardianStyle(...) !== null`
   equals `coachStart({ seen: null, encounter, played, match: fresh }) !== null`.
   This ties O1 to D3's condition without editing D3's file.
5. **`tests/guardian-style.test.mjs`: the seeded result.** The §1 setup on
   held-out seeds (200 games, the `coach`, `late`, `naive` and `allin`
   policies, about 2 s) stays within these bands: `coach` and `late` ≥ 95 %;
   `naive` and `allin` ≤ 5 %. The bands are wide on purpose, so that a
   change in card data shows up as a review, not as a flake.
6. **`tests/guardian-style.test.mjs`: copy.** The chosen arrival line is
   13–30 code points. Without `gentle`, the three `mist-gate-ui.mjs`
   functions return exactly what they return today.
7. **One browser smoke, run alone.** Extend the existing Mist Gate path in
   `tools/coach-smoke.mjs` or `tools/immersion-smoke.mjs` rather than adding a
   new one. Steps:
   - start from a fresh save, open the preparation screen and check the rule
     line and 緩渡 arrival quote;
   - start the battle and, when the AI leads, read the saved `aiMove` from the
     snapshot and check that it costs ≤ 2;
   - reload and check that the commitment is the same;
   - finish the battle, open the second preparation and check that there is no
     rule line, and the arrival quote is today's;
   - measure the arrival quote and the table's 緩渡 label at 302, 360 and
     390 px in Chromium and WebKit, with no overflow and the label on one line;
   - delete the PNGs it produces.

## 8. Exit evidence

- **Held-out simulation (§1.3), done here.** A newcomer who follows the
  coach can win: `coach` 99.6 %, `jitter` 96.2 %, `late` 99.3 %. A naive
  player still loses: `naive` 0 of 2,000, `allin` 0.1 %, `one` 4.0 %.
  Round 1 hurts less: life lost by `coach` falls from 7.1 to 0.3.
- **Returning players unaffected, done here.** The default path is unchanged
  (1,500 paired games, 0 differences, and the golden digest above). Every
  battle outside §4 keeps the "today's AI" row of §1.3, including a
  newcomer's second battle.
- **Still needed:** test 5 and the browser smoke on the implementation
  commit. Then D3's playtest with at least three first-time players, with the
  O7 record format (time to first result, where they stopped, whether they
  can explain one reveal). A simulation says the battle is winnable for a
  scripted coach-follower; only people can say whether 緩渡 feels like a
  teacher and not a gift.

## 9. Interaction with T1 (#18) and O2

- **The guardian's T1 lines stay true.** T1's `home-start` and `arena-first`
  hints speak as 守渡弈者: 「燈在渡口等你，首局我陪你走。」, and 「先落第一子」
  once the coach has ended (`t1:first-visit.mjs`). Both hold under the same
  `played === 0`. 緩渡 makes 「我陪你走」 truer, because the opponent is now
  restrained as well as the table coached. No T1 string needs to change.
- **T1's routes lead to 緩渡.** 啟程遊歷 and 先赴霧隱渡口, and the rules
  dialog's 知其道，入其局 on a first visit, all open the 霧隱渡口 preparation
  (`t1:first-visit.mjs` `rulesStartRoute`), so a newcomer meets the
  disclosure there.
- **T1 left the AI cap out of its scope.** It lists the AI round-1 cap as out
  of scope (`t1:docs/TUTORIAL-T1.md` §"Out of scope"), so O1 does not overlap
  T1 in purpose.
- **The code barely overlaps.** T1 edits `app.mjs` in other places. None of
  its hunks touch `preparationContent` or the three `chooseAIMove` calls, and
  it does not edit `mist-gate-ui.mjs`, `engine.mjs` or the D3 files. Either
  can merge first; a textual conflict, if any, is limited to the import lines
  at the top of `app.mjs`.
- **The practice bypass (O2) applies to 緩渡 too.** A player whose first
  finished battle is 切磋 (今日落子's 前往 leads to 對弈) has `played` 1 at
  the ferry. That player never gets the coach marks, T1's two hints or 緩渡.
  O2 closes the bypass for all three; O1 does not try to.

## 10. Open questions for the owner

1. **The number.** Recommended: at most 2 a round, every round. The softer
   option is at most 1 (coach-followers still win; token bids win 54 % and
   leaning hard on round 1 wins 99.8 %). The wording in the roadmap was a cap
   on round 1 alone; §1.2 shows why it is not recommended.
2. **How long 緩渡 lasts.** As briefed, only while no battle has been
   finished (`played === 0`), the same first battle as D3 and T1. The
   alternative is every 霧隱渡口 visit until it is first cleared. On that
   second try a player who has learned to spread pills would win 99.6 % under
   緩渡 against 65.5 % today. This changes the condition and the §6.4 loss
   line.
3. **The name and the line.** Is 緩渡 the right name? Alternatives: 讓丹,
   留燈. Is option A, B or C the guardian's line? Should the rule line show
   the number 2?
4. **D3's reveal tip.** Leave 「提防對手重注」 as it is (recommended, §3.5),
   or unfreeze `battle-teaching.mjs` and `battle-ui.mjs` so that the tip
   knows about 緩渡?
5. **Order with the playtest.** Ship O1 before D3's three-player playtest, or
   keep it ready and playtest without it first? With three players, the
   playtest cannot compare the two.
6. **Release scope.** O1 is not in the proposed v0.6.0 (RELEASE-NEXT: Q1, D1,
   N1, D2, D3). Should it join that release or the one after?
7. **Saying that he stops holding back.** Should the result note announce
   「下回…我不再讓」 (§6.4), or should the next crossing simply be at full
   strength without comment?

## 11. Method notes and limits

- The scripted policies in §1 are stand-ins for players, not predictions of
  human win rates. None of them reads the opponent's announced card or chooses
  cards.
- One player deck was tested, plus a check with the welcome cards. The
  opponent decks are drawn the way the app draws them.
- The AI changes only through the `spendCap` filter of §3.1, applied to a
  copy of `engine.mjs` at `3f3d351`. The simulation script is not committed.
  §1.1 and test 5 describe it fully, and test 5 makes the key numbers
  reproducible in the repository once O1 is implemented.
- Draws count as non-wins. In §1.3 a draw is shown next to the win rate.
- Nothing here was run in a browser, on a device or against any hosted
  service.
