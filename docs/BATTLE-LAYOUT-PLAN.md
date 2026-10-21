# Battle table visibility · layout plan

Proposed 2026-09-23 after the owner could no longer see the opponent's played
card and lineup while making a move after the viewport conversion.

**Status 2026-10-11:** implemented on branch `q0/battle-table` (steps 1–4
below), with four rounds of review fixes, and merged into `main` in PR #5
(`bca9ab4`). It is not deployed; the last recorded public release is still v0.5.1. The headless Chromium/WebKit
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

**Polish outcome (2026-10-11).** The third and fourth review fixes above fixed
twelve of the thirteen findings raised on `6a93cb4`, plus the two regressions
the next review found. The thirteenth, four-character names with ✧ cut off in
the centre slots at 640×360, did not reproduce, and nothing changed for it. None
was skipped. [VALIDATION.md](VALIDATION.md#q0-battle-table--2026-10-10) has the
commit list and the final checks.

**Still open (refreshed after the 2026-10-11 polish).**
- Physical iOS/Android and human review; owner review of the compact phone
  cards, the short-landscape arrangement, the new tablet layouts and the
  phone-landscape and very short arrangements; the pre-existing WebKit
  rewards-dialog tab width.
- The round result's live-region announcement still names the winner at
  Commit, before the visual staging.
- The reveal hides the resolved table behind it with the backdrop blur. Since
  2026-10-11 `styles.css` also sets `-webkit-backdrop-filter` for Safari
  releases that need the prefix, and `battle.css` makes the reveal backdrop
  nearly opaque where neither property is supported. Headless WebKit reports
  support but does not draw the blur, so 此回合勝, the damage and the new life
  and pills stay readable there during 'sealed' and 'bids'. Browsers without
  `:has()` fall back to the old backdrop fade. Real Safari was not checked.
- Portrait windows under about 540 px tall are not supported: the table rows
  overlap by up to about 11 px there, would also need vertical slot labels,
  and the reveal's clash page already overflows at 390×520 and 360×530. At
  540–549 px tall under full motion the selected card's 3 px lift overlaps the
  confrontation row by up to 2.3 px (375×540); the sweep runs with reduced
  motion only.
- At 375×553 and 360×560 the reveal's 技能與共鳴 takes three pages for the
  player-led and long-Fury fixtures, against two on `ced2aa4` (Chromium);
  生命與仙丹 went from two pages to one there.
- At short-landscape widths (for example 667×375) and landscape windows under
  about 740 px, the cost note and the centre slot's detail line can end in an
  ellipsis, as can the cost note beside a three-digit estimate at 360 px wide;
  the same numbers stay in the player's resource caption.
- Four-character names still clip where cards are 50 px wide or narrower (phone
  landscape under about 520 px, such as 480×320). They also clip in the lineups
  of landscape windows about 601–630 px wide, and up to about 690 px wide when
  taller than 500 px (for example 601×500, 601×520 and 640×520). The compact
  88 px clash cards clip their own face text, as they did in short landscape.
- Small details: the name/badge spacing on compact cards was checked with
  headless fonts only. At 360×540 and 640×360 the opponent's 危 mark overlaps
  the bottom 1–2 px of the empty header box, and at 640×360 its glyph touches
  the header's divider. The table's card hover rule is not limited to
  `(hover: hover)`, so under emulated touch a just-tapped selected card keeps
  the dimmer hover border until the next tap (its 1 px ring stays). 危 has no
  screen-reader text of its own; the life label still reads 生命 N / 12. In
  headless WebKit a 320 px wide portrait window scrolls the document; this was
  not investigated or compared with `ced2aa4`.
- In the final measurement (on `80fb7a3`, not repeated after the polish) the
  first table paint after resume was 3–17 ms slower in four of five headless
  profiles; nobody has profiled why.
- A public build and a hosted release are separate steps that have not
  happened. Merging has: PR #5 (`bca9ab4`) took this work into `main`.

## First battle teaching · 2026-10-12

Roadmap packet D3, approved by the owner on 2026-10-11 for the proposed v0.6.0
scope. Implemented on the branch `d3/first-battle-teaching` from `main`
`335d2b7`; not merged, pushed or deployed. Checks:
[VALIDATION](VALIDATION.md#d3-first-battle-teaching--2026-10-12).

**Problem (measured 2026-10-11 for the packet brief; not re-measured here).**
In a WebKit iPhone 15 playtest with a fresh profile, the new player lost 8, 6
and 10 HP in round 1 of the first three encounters. The only instruction
(選一張戰卡，再分配仙丹) was in the sr-only `#announcer`, which is 1 px tall, and
the rules dialog never opens by itself. In an engine simulation (default deck
against default deck) the AI spent at least 8 of its 12 pills, with Fury, in
round 1 of 96–98 % of 400 seeded games. A player who never adds pills (the UI
default is 0) won 0 of 300 games; 3 pills every round won 70 %; none in round 1
and an even spread afterwards won 82 %. The game is winnable; the table did not
teach it.

**What changed.** Only the battle surface. `engine.mjs`, `chooseAIMove`,
rewards, the save schema and the battle snapshot format are unchanged.
Capping the AI's round-1 spend stays an owner fallback, to be considered only
after human playtests. The pure rules are in
[`battle-teaching.mjs`](../battle-teaching.mjs); `battle-ui.mjs` renders them
and `app.mjs` wires them to the table.

| Element | Behaviour |
| --- | --- |
| Planning hint | One visible line under the round and prompt in the status row: 選一張戰卡 → 定仙丹 → 封丹 · 落子 (落子 · 決勝 outside 霧隱渡口). The reveal-time table reads 查看本回合結果，再進下一回合. The line uses the 44 px the row already had for 對弈紀錄, so the Q0 one-table layout keeps its rows. |
| Coach marks | Only on the first ever battle: a 霧隱渡口 expedition encounter while `stats.played` is 0 (no battle finished yet) and this device has recorded no ending of the coach, starting in round 1. ① pick a card → ② add pills (攻擊＝力×（1＋丹）; the pills left must last the rounds left, so not all at once: 十二丹撐四回合 in round 1) → ③ commit → ④ read the reveal. ①–③ take the hint line's place (on a portrait phone, the whole row: two lines, or three for ② below about 355 px) and outline the control they teach with a dashed gold line; nothing covers a control. ④ sits in the round-1 reveal footer with 知道了 and outlines both 實際攻擊 figures. Using the taught control moves to the next mark, but ② is never skipped: on ①, a card, ＋, the slider or 怒擊 shows ②; on ②, ＋, the slider or 怒擊 shows ③; a commit shows ④. One slider gesture (a press and drag, or a held arrow key, which fire an input for every value) moves the coach by one mark at most, so a drag on ① leaves ② on screen and the next gesture shows ③. A gesture belongs to the pointers pressed on the slider and the value-changing keys held on it, and ends when the last of them is released; another finger, a tap elsewhere or a key such as Shift leaves it running. A commit straight from ① (a card is already chosen, at 0 pills and without 怒擊) shows ④ and owes ②: 繼續 or 知道了 after ④ then opens round 2's table on ②, which counts the three rounds left (十二丹撐三回合), stays while pills are set and leaves with that round's commit. A reload resumes the mark it interrupted: ② or ③ in round 1 (so a commit after them owes nothing), ④ on the round-1 reveal unless 知道了 already closed it, and the owed ② on round 2. (Until review round 2, 2026-10-13, using a later control first skipped ahead, so ＋ on ① went to ③ and a commit on ① went to ④, and ② never showed. Until review round 3, the same day, a reload in round-1 planning went back to ①, so a commit after ② or ③ owed ② again, even over a disabled ＋ at 0 pills left; a reload after 知道了 with ② owed brought ④ back; and the owed ② still read 十二丹撐四回合. Until review round 4, the same day, one slider drag across two or more values on ① went on to ③ before the finger lifted, so ② showed for well under a second. Until review round 5, the same day, another pointer's lift, a tap that moved focus off the slider, or a key on it during a drag still let that drag go on to ③.) |
| Ending | 跳過 on the table or Back end every mark at once. 繼續 · 下一回合 or 知道了 after ④ completes them, or, when ② is owed, hands over to it, and round 2's commit then completes them (知道了's accessible name says which). Either way the device-local key `shanhai.coach.v1` records `{"firstBattle":"skipped"}` or `"done"`, and no mark returns, also after a reload or in a restarted first battle. A first battle abandoned before any ending shows the marks again in the next one, because `stats.played` is still 0. A player whose first battle is a practice or arena match never sees them. |
| Back | A coach mark is one dismissible layer in the [Back model](NAVIGATION.md#back-model--2026-10-12): under any dialog opened over the table, and above the held round result once the reveal has completed and shows ④. Back closes it as 跳過 does; the next Back opens keep/abandon or holds the result as before. While the reveal still animates, ④ is hidden, so it is no layer yet and Back holds the result as it does without the coach. Once 知道了 has closed ④ with ② owed, ④ stays closed, also after a reload, so Back on that reveal holds the result and ② stays owed. (Until review round 3, 2026-10-13, a reload brought that ④ back, and Back on it then ended the coach as 跳過, dropping ②.) |
| Formula | The move panel's estimate cell shows the arithmetic behind its number, for example `力 6 ×（1＋3 丹）＝ 24`. See below. |
| Reveal tip | Once each round's reveal completes, the footer states 對手剩 N 丹 · 你剩 M 丹 and one hint, in the place 直接看結果 leaves. See below. |
| Match result | A new match result always opens on 勝負已定, so 悟 and its advice show after a loss even when the previous result was left on 旅途所得. Returning from a result card or settings opened over the same result keeps its page. |

No teaching element writes the profile, the battle snapshot, an export or a
backup. The only stored value is `shanhai.coach.v1`, beside
`shanhai.experience.v1`. After an ending it holds `{"firstBattle":"done"}` or
`{"firstBattle":"skipped"}` and is never written again. Before an ending it
holds the coach state of the first battle in progress, so a reload resumes the
mark it interrupted:

- no key while ① shows (nothing is written for ①);
- `{"step":"pills"}` or `{"step":"commit"}` once ② or ③ shows in round 1;
- `{"step":"reveal"}` on the round-1 reveal after a commit from ② or ③;
- after a round 1 committed straight from ① (0 pills, no 怒擊),
  `{"step":"reveal","owed":"pills"}` while ④ is due, then
  `{"step":"pills","owed":"pills"}` from 知道了 or 繼續 on: on the rest of
  the round-1 reveal (no mark) and through the owed ② on round 2's table,
  until round 2's commit (or 跳過, or Back) replaces it with the ending;
- `{}` in one case only: a new first battle starting at ① over the state an
  abandoned first battle left.

Each value is written only when it changes. (Until review round 3,
2026-10-13, the key held only `{"owed":"pills"}`, and this paragraph said it
became `{}` once ② showed after all. It never did: `{"owed":"pills"}` stayed
until round 2's commit, and `{}` was written only when a new first battle
started at ① after an abandoned one had owed ②.) If storage throws, only the
record is lost: the marks stay closed, and the mark reached and an owed ② are
still kept, for the rest of that page's life. A reload without the record
starts round 1 at ① again; a commit from there owes ② only at 0 pills without
怒擊, because any pill or 怒擊 tap on ① shows ②.

**Formula rules.** The number is always the engine's own. When the opponent
leads, its announced card is public, so the number is `resolveRound`'s player
attack against that card, both sides' effects included, and it is exact. When
the player leads, it is `previewMove`'s (own ability and resonance only). It is
exact when every card the opponent may still play gives the same attack;
otherwise the line starts with **預計**, because the opponent's hidden reply
(封鎖, 減力 or 減攻) can change it. The terms come from public card data:
power effects inside the parentheses (`（力 7 ＋ 1）`), attack effects after the
multiplier (`＋ 6`, `− 6`). A blocked ability is left out and named in the
screen-reader sentence (`#attack-sentence`). If the terms ever stopped adding
up to the engine's number, only the number would show. The forms, widest
first, are `力 7 ×（1＋3 丹）＋ 6 ＝ 34`, `力7×(1+3丹)+6＝34`, `力7×(1+3丹)+6`,
then with power effects folded into the card's power (`力8×(1+2丹)+6`), then
`8×3+6`. `app.mjs` shows the first that fits the cell on one line and checks
again on resize and font load. When the terms add up to less than 1 (an
announced 減攻 such as 月蝕 −6 at 0 pills), the engine counts 1. Every form then
states the true sum and that minimum: `（力 6 − 1）×（1＋0 丹）− 6 ＝ −1 → 最低 1`,
`(力6−1)×(1+0丹)−6＝−1→最低1`, … `5×1−6→最低1`. (Until review round 1 they
read `… − 6 ＝ 1` and `5×1−6` beside 1, sums that were really −1.) Fury does
not change attack. The cost line reads `共消耗 6 丹 · 剩 6 丹` where its cell is
wide enough. On a narrower cell `app.mjs` shows the widest shorter form that
fits: `消耗 6 丹 · 剩 6 丹`, `耗 6 丹 · 剩 6 丹`, `耗 6 · 剩 6 丹`, then `剩 6 丹`
alone, so the pills left always show whole (`costVariants`). A form fits when
its text, measured in fractional pixels, is no wider than the line. It holds
nothing else. (Until review round 4, 2026-10-13, it had one form that ended in
an ellipsis. That hid 剩 N 丹 on phones from 302 to 339 px wide once the D2
merge brought N1's removal of the page's 340 px minimum. Until review round 5,
the same day, the fit compared whole pixels, so a form up to about 0.7 px too
wide passed and the ellipsis still cut 剩 N 丹 at some widths, in portrait and
in landscape.) With Fury on, the
Fury toggle's note states the damage a win deals in place of its rule:
`另付 3 丹 · 傷害 7` (`預計傷 7` when a hidden reply could reduce the damage).
Review round 1 moved it there from the front of the cost line, where it pushed
剩 N 丹 behind the ellipsis on phones. Below 340 px in portrait the note takes
the button's full width under 怒擊 and its switch, as in landscape, so the
switch stays inside the button (until review round 4, at 302 px it ran up to
5 px past the button with Fury on). The cost and damage come from `RULES`
(3 pills, +2 damage).

**Tip rules.** The tip reads only the public reveal view: both sides' pills
after the round's spending and refunds, as the table already shows them, and
the rounds left. It never reads a bid, Fury or the next AI move. The view holds
none, and a unit test records every field the tip reads. The hints are
此局已定 (match over), 對手丹藥已盡 (0 left), 提防對手重注 (the opponent has
at least 4 more than the player; in a battle with a disclosed spend cap that
holds his stake below his reserve, O1's 緩渡, 對手每回合至多出 N 丹 instead,
on the branch `o1/gentle-guardian`, [O1 §3.5](GENTLE-GUARDIAN-O1.md#35-d3s-reveal-tip-states-the-cap)), 對手丹藥將盡 (fewer than two per remaining
round, for example 4 after round 1), 你丹較多，可後發制人 (the player has at
least 4 more), otherwise 雙方丹藥相近.

**Exit.** Automated checks are listed in VALIDATION. The real exit is a human
playtest that the owner runs with **at least three first-time players** (fresh
profiles, on a phone). Record round-1 HP lost, whether each player adds pills
before committing, and whether they can explain a reveal. It is pending and
separate from the automation.

**Open:**
- The owner playtest above, and the owner's review of the copy's tone.
- Physical iPhone and Android phones, real Safari, and VoiceOver/TalkBack
  reading of the marks. Marks ② and ③ and the endings are announced when they
  change, an owed ② with round 2's start; ① and ④ are page text with an
  sr-only step number, and the start of the battle still announces
  對局開始。選一張戰卡，再分配仙丹。
- Every copy of marks ①–③ (both leaders, both commit labels, and ② both as
  十二丹撐四回合 and as the owed ②'s 十二丹撐三回合) fits two lines at
  360×640 and 360×560 with headless Chromium's and WebKit's fonts, measured by
  `npm run test:coach`. Review round 1 found mark ② at three lines in Chromium
  at 360 px (its last two characters hidden) and shortened it by one
  character. Review round 2 measured narrower phones: below about 355 px
  (Chromium) and 349 px (WebKit), down to N1's 302 px phones (review round 2
  named the page's 340 px minimum, which the D2 merge removed), mark ② needs a
  third line, which the two-line clamp hid (盡。). The clamp is now three lines:
  three 14 px lines (42 px) fit the status row's 44 px, so the row never grows.
  `test:coach` measures every copy whole, in at most three lines and with the
  row's height unchanged, at 302×640 and 320×568 (since review round 4),
  340×640, 348×760, 353×745 (Playwright's Pixel 4) and 354×640. Other fonts
  are not measured, nor are phones narrower than 302 px: the round-4 reviewers
  found that ② needs a fourth line in Chromium at 280×653, which the clamp
  would cut.
- The cost line could end in an ellipsis beside a three-digit estimate in a
  360 px cell before review round 4. The fit to a shorter form covers that
  case too, but no browser check has used a three-digit estimate.
- The compact formula forms drop the spacing, and the folded form shows the
  effective power (`力8`) rather than `力7＋1`.
- Measured input latency and first-paint cost were not re-measured; the formula
  fit adds a synchronous layout read after each move-panel change.
