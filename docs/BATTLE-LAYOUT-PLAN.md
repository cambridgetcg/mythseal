# Battle table visibility · layout plan

Proposed 2026-09-23 after the owner could no longer see the opponent's played
card and lineup while making a move after the viewport conversion.

**Status 2026-10-11:** implemented locally on branch `q0/battle-table` (steps 1–4
below), with four rounds of review fixes. It is not merged, pushed or deployed;
the last recorded public release is still v0.5.1. The headless Chromium/WebKit
loopback checks and before/after measurement ran on `80fb7a3` and are recorded
in [VALIDATION.md](VALIDATION.md#q0-battle-table--2026-10-10); the third round's
checks ran on `7762730` and the fourth round's on `0482837` (see the review
fixes in the [Implementation record](#implementation-record-2026-10-10)).
Physical iOS/Android devices and human review remain open. See also the
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
Playwright Chromium 153 and WebKit 26.6, loopback no-store server, normal pace).
This is an interim measurement taken before the review fixes. The final one, on
`80fb7a3`, is in [VALIDATION.md](VALIDATION.md#q0-battle-table--2026-10-10):

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

**Review fixes (2026-10-10).** A verification review of `50eb243` found these;
each now has a check in `tools/battle-table-smoke.mjs` that fails on `50eb243`.
- *Tablet widths overflowed.* The roomy one-row move panel needs about 880 px,
  so from 601 px to about 943 px it pushed Commit off-screen (for example 768×1024
  and 800×600). The roomy table now starts at 960 px. Below that, portrait tablets
  get the phone's single column with taller portraits and a two-row move panel,
  and landscape windows get the short-landscape two-column table. Short roomy rows
  widen cards just enough for a four-character name. A fit sweep runs 17 more sizes
  (601×800 to 1920×1080, plus 375×667, 412×915, 667×375 and 740×360) with
  four-character names: no overflow, every input hit-testable, no clipped name.
- *Focus fell to `<body>` after Next.* Commit now hands focus to the reveal
  table's action before the dialog opens, and Next focuses the new Commit. The
  smoke asserts this by pointer and by keyboard.
- *Selecting a card replayed the round-entry fade* because the hand was replaced.
  Selection now patches the dealt nodes in place, so the 120 ms lift also runs.
  The smoke checks node identity after every input, plus no running entrance
  animation under full motion.
- *The played pair showed the winner early.* On a resources/effects page carried
  over from an earlier round, the pair showed `· 勝` and the gold winner name at
  'bids'. Both now wait for 'impact' like the heading; cards, bids and attacks
  stay public at 'bids'.
- *Selected/announced four-character names with ✧ clipped at 360 px.* The second
  highlight pixel is now a ring outside the 1 px border, and phone names use
  0.5 px letter-spacing.
- *Dead code.* The unused `mistGatePillsMarkup` export and the CSS for the old
  hooks (`.combatant`, `.enemy-zone`, `.enemy-thought`, `.battle-divider`,
  `.player-area`, `.hand-caption`, `.move-subtitle`, `.move-panel h3`,
  `.skill-detail`, `.arena-bottom`, `.mist-offering*`) are removed.

**Second review fixes (2026-10-11).** A verification review of `852ce1d` found
two regressions. `tools/battle-table-smoke.mjs` now catches both. Its sweep adds
1280×620, 375×553, 640×360, 568×320, 600×400, 560×420 and 600×540. At every
sweep size it commits and pages through each reveal page by tapping 下頁 (the
button's centre must be clear). It also checks that each page's items stay inside
their list and that both resource panels are reached.
- *The reveal's 下頁 on 生命與仙丹 could not be tapped at 800×600 and 1024×600.*
  The fixed played pair took the height that the paged resource list needed, so
  one compact panel spilled over the pager. This happened at about 501–656 px tall
  in windows wider than 600 px. Phones at 375×553 and 360×560 had the same overlap
  with the button still clear. In 360 px tall landscape the panels overlapped the
  footer, as they also did on `ced2aa4`.
  These windows now put both public resource panels in one row with no pager, as
  short landscape already did: windows wider than a phone up to 719 px tall,
  landscape windows of phone width, and phones up to 619 px tall. The first two
  also keep the reveal footer on one row, which lets the clash page's full cards fit
  from 600 px tall; below that they use the short-landscape arrangement. Those
  full cards overlapped Next at 800×600 and shorter, also on `ced2aa4`. In short
  landscape the phase line yields beside the resource and
  effect pages, as the eyebrow already did. Under 360 px tall the reveal also
  shrinks its heading, tab rule and frame, and the phase line yields on the clash
  page, so 568×320 fits (it overflowed on `ced2aa4` too).
- *Phone landscape 600 px wide or narrower used the portrait column, which did not
  fit,* covering the opponent's four cards at 568×320, 600×400 and 560×420. Short
  landscape now uses the two-column table at every width. Up to 600 px wide the
  right column is slimmer and the gaps tighter, so four-character names fit in the
  lineups. Below 660 px wide the centre slots drop their thumbnails (the lineup
  shows the same art), so their names fit too. Under 360 px tall the two columns
  stop sharing rows. The confrontation sits beside the top of the opponent's row,
  and the move panel sits beside the rest of it and the own row. The slot owner
  reads vertically, so each slot is a single 44 px row.
- On `852ce1d` the new checks fail as reported. 下頁 is covered by
  `.battle-resource-caption` at 800×600 and 1024×600, by `.battle-pill-reserve` at
  960×540 and by the panel itself at 1280×620. The table hit tests fail at 568×320,
  600×400 and 560×420, and the resource page overflows at 375×553 and 740×360. At
  800×600 to 1280×620 the clash page's older overflow fails first, so the pager
  results above come from a run with the overflow checks turned off.
- Checks on `ed899af` with a clean tree against a loopback dev server:
  `node --test tests/*.test.mjs` 456/456; `tools/battle-table-smoke.mjs` 40/40 in
  Chromium (system Google Chrome 154, which the smokes prefer when installed)
  and WebKit 26.6 (30 sweep sizes); `tools/viewport-smoke.mjs` 23/23
  and `tools/battle-presentation-smoke.mjs` 6/6 in each engine; the rest of
  `npm run test:browser` and `tools/expansion-smoke.mjs` in Chromium. Synthetic
  headless evidence only.

**Third review fixes (2026-10-11).** A verification review of `6a93cb4`
re-confirmed these. Each now has a check in `tools/battle-table-smoke.mjs`. With
only that fix reverted on the fixed tree, the check fails in Chromium at the size
named.
- *The round result flashed before the staged reveal.* Commit swaps the inert
  table to the resolved reveal view (winner text, new life and pills) and the
  dialog's backdrop faded in from transparent over 200 ms, so that table showed
  in the first frames, before the dialog's 'impact'. The round-result backdrop
  now dims and blurs the table from the first frame; only the dialog fades in.
  The smoke reads the backdrop's opacity in the first frame after a real Commit
  under full motion (0 without the fix).
- *The Fury switch collapsed in landscape windows under about 740 px wide*: the
  27 px track measured 2 px at 568×320, 6 px at 640×360 and 12 px at 667×375,
  with its knob outside it; in Mist Gate it overflowed onto the attack estimate.
  In the two-column table the switch now shares the 怒擊 line and the cost note
  takes the button's full width below; the track never shrinks. The smoke
  requires a whole track inside the button, clear of the note (11.9 px at
  667×375 without the fix).
- *The attack-estimate label rendered at 9 px* on phones and 10 px elsewhere, in
  the muted colour, because older `.attack-preview span` rules matched its new
  wrapper. It now inherits 11 px and the copy colour, and 10 px in phone
  landscape, where 11 px wraps. The smoke requires at least 10 px on one line
  (9 px at 390×844 without the fix).
- *Below about 580 px tall the single-column rows overlapped* (375×553, 360×560,
  360×540, 600×540): the own lineup rose over the centre slots and the player's
  caption dropped under the move panel. In those windows the player's caption
  yields like the opponent's; the move panel shows the same numbers and the
  resources group's label keeps the plan. The smoke checks that rows stacked in
  one column never intersect, and the sweep adds 360×560 and 360×540 (4.0 px at
  375×553 without the fix).
- *At the 56 px minimum card height names drew over the state badges* (a 3.4 px
  line-box overlap). The compact card's badge and copy sit 1 px closer to its
  edges, with no gap inside the copy. The smoke requires each name to start below
  its badge, within 1 px (3.4 px at 375×553 without the fix).
- *Low life showed only as colour.* The table hid the 危 mark along with the 生命
  label. At 3 life or less 危 now shows as a 10 px mark at the orb's top-right;
  the word stays hidden. A low-life fixture checks it at every sweep size (hidden
  at 1440×900 without the fix).
- *Mist Gate replaced the selected card's highlight* with an older, weaker one,
  so the player's pick looked weaker than the announced card. The old Mist Gate
  hand rules are removed. The smoke checks the Mist Gate highlight's colours
  (the old border without the fix).
- *The reveal's played pair pushed one side to a second page:* 生命與仙丹 at
  1440×900, 1920×1080 and 360×740, and 技能與共鳴 at 360×640, which were one page
  on `ced2aa4`. The eyebrow and phase line now yield beside the resource and
  effect pages at every size, as they already did in short landscape, so the
  heading moves up when leaving the clash page. Page counts now match `ced2aa4`
  for the opponent-led, player-led and both long-name fixtures at those sizes,
  and the smoke asserts one page there (two at 1440×900 without the fix).
- *The pair cut off the winner's attack* (`實際攻擊 ...`) at 360 px with a three- or
  four-character name and Fury, and in phone landscape. The attack is now its
  own non-shrinking `· 攻擊 N`; only the bid text may end in an ellipsis. The
  long-names fixture now bids 9 pills with Fury, so the opponent wins with a
  four-character name. The smoke checks each attack is whole (cut at 568×320
  without the CSS).
- *Found by that fixture:* a three-note effect block (skill, resonance, Fury) was
  taller than its one-item page in 360 px tall landscape (740×360, 640×360,
  568×320), as on `ced2aa4`. In short landscape each side's notes now share two
  columns, so a four-note block fits too.
- *Dead code.* `.identity`, `.avatar` and `.battle-log`, missed by the first
  cleanup, are removed from `styles.css`.
- Checks on `7762730` with a clean tree against a loopback dev server:
  `node --test tests/*.test.mjs` 456/456; `npm run test:battle-table` 40/40 in
  Chromium (system Google Chrome 154) and WebKit 26.6, now 32 sweep sizes plus a
  low-life pass at each; `npm run test:viewport` 23/23 in each engine;
  `BROWSER=webkit node tools/battle-presentation-smoke.mjs` 6/6; and all 14
  suites of `npm run test:browser` in Chromium.
  The six layout screenshots (360×640, 568×320, 600×400, 640×360, 844×390,
  1440×900) were reviewed with Fury on and low life, plus the reveal's resource
  and effect pages. Synthetic headless evidence only; headless WebKit does not
  draw `backdrop-filter`, so the blur itself was seen only in Chromium.

**Fourth review fixes (2026-10-11).** A review of `c213330` found two
regressions that its checks missed. Each now has a check in
`tools/battle-table-smoke.mjs`; with only that fix reverted on the fixed tree,
the check fails in Chromium as noted.
- *The attack-estimate label broke mid-word* (己方預估攻 / 擊) in Chromium once
  the estimate had two digits, the usual case once a pill is placed: at 568×320,
  560×420 and 640×360, and at 960×540 the roomy layout's note wrapped the same
  way (…手影 / 響). `06bd920` had enlarged the label beside an estimate that
  takes its width from the same cell, and the smoke measured only single-digit
  estimates there. The label now has the cell's full width on its own line; the
  cost note and the estimate share the line below, as in the Fury cell beside
  it. One 11 px size serves every layout, the cell keeps its 44 px box, and the
  label stays whole beside a three-digit estimate (110 with 青霄 and all 12
  pills). Every decision pass also requires the label and estimate inside the
  cell without overlapping, and each sweep size adds a two-digit estimate with
  Fury and a three-digit one (the label is 27.0 px tall, two lines, at 568×320
  without the fix).
- *The round result still showed inside the dialog before its phase.* `9a8ada7`
  covered the table behind, but `fitOverlay()` measured the dialog's resolved
  markup before the reveal set 'sealed', so under full motion the phase rules
  transitioned out of the resolved state while the dialog faded in. The heading
  (此局，你勝。), the clash and the effect notes reached about 0.2 effective
  opacity before their phase (the damage line 0.09). On a remembered 生命與仙丹
  page each life ring started at its post-round fill and climbed back to the
  pre-round value, then fell again at impact. `modal()` now runs the
  reveal's first phase before anything measures the new dialog, so its
  content is first styled 'sealed' with the pre-round resources. The smoke
  samples every frame from Commit to completion on the clash page, a remembered
  effects page and a remembered resources page (a new round 3). The clash stays
  hidden before 'bids', the heading before 'impact', and the damage line and
  notes before 'recovery'. Each shown ring keeps its pre-round fill until
  'impact'. Without the fix the heading reaches 0.21 while sealed in round 1;
  checking rings alone, the player's ring reads 26.5% beside 5 life in round 3.
- Checks on `0482837` with a clean tree against a loopback dev server are listed
  in [VALIDATION.md](VALIDATION.md#q0-battle-table--2026-10-10).

**Still open.** Physical iOS/Android and human review; owner review of the
compact phone cards, the short-landscape arrangement, the new tablet layouts and
the phone-landscape and very short arrangements; the pre-existing WebKit
rewards-dialog tab width. At short-landscape widths (for example 667×375) and
landscape windows under about 740 px, the cost note and the centre slot's detail
line can end in an ellipsis, as can the cost note beside a three-digit
estimate at 360 px wide; the same numbers stay in the player's resource
caption. Portrait windows under about 540 px tall are not supported: the table
rows would also need vertical slot labels there, and the review found the
reveal's clash page already overflowing at 390×520 and 360×530. The name/badge
spacing on compact cards was checked with headless fonts only. The round
result's live-region announcement still names the winner at Commit, before the
visual staging. Four-character names still clip where cards are 50 px wide or narrower
(phone landscape under about 520 px, such as 480×320). They also clip in the
lineups of landscape windows about 601–630 px wide, and up to about 690 px wide
when taller than 500 px (for example 601×500, 601×520 and 640×520). The compact
88 px clash cards clip their
own face text, as they did in short landscape. In the final
measurement the first table paint after resume was 3–17 ms slower in four of
five headless profiles; nobody has profiled why. Merging, a public build and a
hosted release are separate steps that have not happened.

