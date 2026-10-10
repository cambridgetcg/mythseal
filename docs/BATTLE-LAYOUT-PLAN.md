# Battle table visibility · layout plan

Proposed 2026-09-23 after the owner could no longer see the opponent's played
card and lineup while making a move after the viewport conversion.

**Status 2026-10-10:** implemented on branch `q0/battle-table` (steps 1–4 below),
not yet reviewed, merged or deployed. Headless Chromium/WebKit loopback checks
pass; physical iOS/Android and human review remain open. See
[Implementation record](#implementation-record-2026-10-10).

## Finding and priority

`scene-adapters.mjs:battle()` puts both `.enemy-thought` (including the announced
card) and `.enemy-hand` inside the hideable **對手** module. Choosing a player
card switches to **落子**. Life/pill reserves remain visible, but the information
needed to respond disappears. On a short phone, hand pagination also shows only
two of the player's four cards at once. Reachable tabs pass the current viewport
tests without proving that these decision inputs are visible together.

**The core turn should fit on one table:** see the opponent, choose a card,
allocate pills, commit. Keep full card inspection and history as secondary views.

## Proposed composition

| Zone | Always-visible content | Interaction |
| --- | --- | --- |
| Compact header | Encounter, round and initiative; menu | Rules/menu remain secondary. |
| Opponent edge | Life/reserve and four public card miniatures, in stable order | Tap any card, including a used card, for full art and rules. |
| Current confrontation | Announced opponent card or **待對手應戰**, plus the player's prepared card | Show which card is committed versus merely selected; expand its rules on demand. |
| Player edge | Life/reserve and all four own cards, with used/selected marks | Selecting changes the draft in place; it does not navigate away. |
| Action area | Pill amount, minus/plus, Fury cost, remaining pills, own attack estimate, Commit | Preserve generous targets; no navigation required to compare with the opponent. |

Desktop uses two rows of four larger portraits and a clear central confrontation,
with the move controls directly below. Portrait phones use four compact cards per
row with names, power/damage and explicit state; full illustrations and long skill
text belong in an inspect sheet. On 360×640, reduce ornamental/header space before
shrinking controls. Short landscape places the confrontation/actions beside the
two compact lineups. Do not shrink the full desktop screen or paginate these
four-card rows. CSS breakpoints are implementation decisions to verify by fit.

The old **手牌／落子／對手** tabs become one primary **對局**. **局勢／紀錄** can
remain secondary, but essential public card context must survive those views.
Reserve the same central slot for **待對手應戰** and the announced card to avoid
layout jumps. Selection can lift/glow subtly; transitions never block input and
reduced motion presents the state immediately.

## What “opponent deck” means here

The established rules expose both dealt **four-card hands**, with hidden pill
commitments. `createMatch` draws four from each eight-card deck and stores the
hands, used IDs and resources; a universal eight-card opponent deck is not kept
in the match. Label this **對手手牌 · 本局四張**. Do not infer undrawn cards from
the player-visible lineup or add opponent-deck storage as part of a layout fix.
Some newer encounters separately retain authored decks, but they do not establish
a consistent eight-card battle-inspection feature.

Keep all four public cards in their original positions. **已出戰** remains readable
and inspectable; **本輪亮牌** gets a border and text, rather than color alone.
Remaining cards show **待出戰**. Render current effective public battle stats,
including applicable expedition ranks and the existing faction rules.

| Phase | Opponent card context | Hidden information |
| --- | --- | --- |
| Player leads | Four public cards; center says **待對手應戰** | No selected opponent card, bid, Fury or resulting attack. |
| Opponent leads | Four public cards; highlight its already committed card | Bid, Fury and resulting attack stay hidden. |
| Reveal | Both actual played cards and resolved round; accepted bids/effects are public | No preview of a later AI commitment. |
| Next round | Original four cards plus updated used marks; announce the new commitment only if opponent leads | Never retain last round's “current” highlight. |

## Implementation sequence

1. Derive an explicit public presentation model for **planning** versus **reveal**.
   Planning receives only the permitted announced card ID, never an entire hidden
   move object. Reveal reads `lastResult.round` and its played cards. The engine
   advances round/initiative during resolution while `aiMove` still belongs to
   the old round, so checking initiative alone would show stale information.
2. Introduce shared compact card/lineup presentation and restructure the battle
   adapter into one primary table. Keep existing selection, pill/Fury and commit
   handlers. Inspect sheets restore the originating card focus and keep the
   uncommitted choices. No engine, reward, AI, save or artwork changes are needed.
3. Carry a compact played-card pair into the reveal's fixed context. Currently
   its **落子揭曉／資源／效果** modules can also separate cards from explanations;
   `roundHoldMarkup` replaces the table during reveal. Changing only
   `battleMarkup` would leave that second visibility problem unresolved.
4. Check the main game modes, normal/fast/reduced motion, resume/reload and six
   viewport sizes. Add simultaneous-visibility checks before claiming completion.

## Acceptance for the implementation

- After choosing each legal own card and adjusting pills/Fury, all four opponent
  miniatures, announced card/context, own selection and Commit remain visible.
  Assert this directly, without a helper opening hidden modules on the test's behalf.
- Changing only secret AI bids/Fury produces identical pre-reveal visible text,
  attributes and accessibility labels. Inspection cannot reroll its commitment.
- Reveal → resource/effect detail → Next → reload preserves correct round/card
  labels. Resolved cards remain visible while their damage/effects are explained.
- Both four-card rows keep stable order and explicit used labels. Inspect/close
  restores keyboard focus and the same uncommitted card/pill/Fury choices.
- At 1440×900, 1280×720, 390×844, 360×740, 360×640 and 844×390: no scrolling,
  overlap or covered controls, readable labels and at least 44 px tap targets.
  Repeat in Chromium and WebKit; physical iOS/Android is separate evidence.
- Browsing and inspection preserve save/snapshot bytes and game RNG. Starting,
  revealing or resuming uses the existing one-time settlement behavior.

The conversation mockup uses illustrative values and simple name/glyph cards.
It demonstrates selecting a card, allocating pills, opponent-card inspection and
switching public-information phases; it does not simulate or settle a battle.
Its visual checks do not satisfy the future game acceptance list above.

The isolated Chromium mockup check passed at 320, 360 and 736 px in light/dark
appearance: card selection, bid/Fury controls, public phase switching, opponent
inspection/focus return, four-card visibility, 44 px controls and horizontal fit.
The 360 px table itself measures 560 px high; real game chrome, full portraits,
attack estimates and short-landscape adaptation still require implementation
verification. No player storage, network service or live game was used.

## Implementation record (2026-10-10)

Source: `q0/battle-table` from `ced2aa4`; checks below ran on `a6badf0` with a
clean tree against a loopback dev server. This is synthetic evidence only.

**What changed.** `battle-presentation.mjs` adds the public model:
`permittedAnnouncement` (the only reader of the hidden AI move; returns a card ID
or null and never reads bid/Fury), `createPlanningView` and `createRevealView`
(labels from `lastResult`). `battle-ui.mjs` renders one table from it. The battle
adapter now makes a single 對局 module, so no tab strip or pager exists. Selecting
a card updates the row and centre in place. Inspect and history focus their origin,
so focus returns in WebKit too. The reveal-time page is the same table in reveal
mode, and the round-result dialog keeps a compact played pair beside its
resource/effect pages (one line in short landscape). Commit computes a responding
move only when the player leads and drops the resolved move. Resume gives an old
snapshot without a leading commitment one from public state before any input. The
snapshot schema is unchanged; `BATTLE_KEY` still stores the AI move locally, and
Q5's observation must never read it. No engine, reward, AI, save or art changes.
The selected card's full ability text now lives in its inspect sheet (centre slot)
rather than under the move controls.

**Checks.**
- `node --test tests/*.test.mjs`: 456/456. New `tests/battle-table-view.test.mjs`
  covers the gate, the view whitelist, the RNG trap, hidden-bid invariance over 40
  seeded matches, the stale round, slots/used rounds and markup.
- `npm run test:battle-table` (`tools/battle-table-smoke.mjs`), Chromium and
  WebKit, at all six sizes: 38/38 each. It covers simultaneous visibility with
  `elementFromPoint` hit tests after every real card/pill/slider/Fury input in both
  initiative states and round 3, and identical HTML/ARIA/announcer for different
  hidden bids. It also covers inspect focus, draft and save bytes, reveal pages →
  Next → reload, Mist Gate, a legacy snapshot, motion/pace and once-only settlement.
- `tools/viewport-smoke.mjs` 23/23 and `tools/battle-presentation-smoke.mjs`
  6/6 in each engine. The presentation smoke now honours `BROWSER`; earlier
  "WebKit" runs of it were Chromium.
- The rest of `npm run test:browser` passed in Chromium. `tools/expansion-smoke.mjs`
  passed in Chromium; WebKit stops at a pre-existing 43.08 px rewards-dialog tab
  at 360×740 and 360×640, reproduced on the base commit. 844×390 passed.

**Before/after** (`tools/battle-measure.mjs`, fixture
`q0-arena-round1-opponent-leads`; before = `a53270d`, after = `a6badf0`; headless
Playwright Chromium 153 and WebKit 26.6, loopback no-store server, normal pace):

| Measure | Before | After |
| --- | --- | --- |
| One round, minimal taps (view switches) | 5 (0) | 5 (0) |
| One round while checking the opponent | 11 (6) | 5 (0) |
| Opponent cards, announcement, own selection and controls visible at once | never | every step |
| Own cards visible at start, 390×844 | 2/4 | 4/4 |
| Core input → next paint p50/p95, Chromium desktop / phone / phone CPU×4 | 16.0/16.8 · 32.6/33.4 · 32.3/35.7 ms | 16.2/16.9 · 32.6/34.2 · 32.5/33.7 ms |
| Core input → next paint p50/p95, WebKit desktop / phone | 16/18 · 16/17 ms | 16/18 · 16/17 ms |
| Resume tap → first own card clickable, cold p50, Chromium desktop / phone / CPU×4 | 57 / 33.8 / 76.9 ms | 61.7 / 44.6 / 91.3 ms |
| Same, WebKit desktop / phone | 25 / 24 ms | 48 / 47 ms |
| Commit → reveal complete; Next → decision-ready, all runs | 1113–1161; 29–63 ms | 1115–1180; 31–70 ms |
| Transfer per entry, Chromium / WebKit | 7,996,394 / 11,936,212 B | 8,021,493 / 11,961,311 B |

Steps and simultaneity improved as intended. Input latency did not change beyond
frame quantization; Chromium phone numbers include about one frame of touch
emulation. The first table paint after resume is 5–23 ms slower, and WebKit's
Next → ready rose from 29–34 to 61–70 ms, likely because eight portraits and two
thumbnails now paint at once (not profiled). These are single-machine headless
runs, not device performance.

**Still open.** Physical iOS/Android and human review; owner review of the
compact phone cards and short-landscape arrangement; removal of now-unused
battle CSS for the old hooks (`.hand-caption`, `.battle-divider`,
`.mist-offering`) in `styles.css`/`mist-gate.css`; the pre-existing WebKit
rewards-dialog tab width.

