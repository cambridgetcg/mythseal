# Game lobby and navigation

Implemented locally on 2026-09-22 as an independent M4 presentation slice. This
document describes the browser interface; it is not a deployment receipt.

## Destinations and return paths

The game shell has five labelled destinations: **洞府**, **遊歷**, **對弈**,
**藏卡**, **市集**. The dock stays available on phone and desktop outside a
battle. During battle, the compact menu uses the existing explicit keep/abandon
flow. Keeping a match preserves its original encounter, cards and hidden moves.

The lobby reads the real local journey, active exact-card deck and claimable
daily rewards. Its primary action resumes an unfinished match or prepares the
first unlocked, uncleared travel encounter. After all six locations are cleared,
the lobby offers another visit to the saved location. New players have a compact
rules entry beside the same playable lobby.

The cards destination contains **我的戰卡**, **三套牌組**, and **萬象圖鑑**.
The codex describes characters and leads to their owned copies; all deck editing
uses the existing exact-UID editor. The classical starter arrangement remains a
draft preset in that editor. Saving an alternate deck does not activate it;
the player explicitly chooses **設為出戰**.

Daily tasks and training open in a quest panel over the current destination.
Incomplete tasks link to the relevant activity. Claiming a reward refreshes the
panel without discarding its scroll position or keyboard focus. The avatar opens
旅程閣, including explicit cloud choices and local backup export.

In-app close controls restore the originating screen, scroll and logical focus.
Cards-hub tabs preserve filters and deck drafts, and destination changes retain
the last scroll position. These are in-memory UI preferences, not new profile
fields. Browser URL routing/native Back integration is not part of this slice.

## Encounter loop

`Travel/opponent → preparation → explicit Start → battle → rewards → next/retry`

Preparation stores only a local UI intent `{kind, nodeId}`. It neither creates a
pending battle nor changes balances. Players can edit/save/activate a deck, browse
the codex and owned copies, and return to the same preparation. The summary always
shows the actual active deck. Only Start calls the existing `beginBattle`
transaction; a pending match instead offers the existing resume/abandon choice.

After settlement, the next action derives from the completed encounter. An
expedition win offers the next unlocked location, a loss/draw offers the same
location, and the final location offers a revisit. Arena/practice offer another
match in the same mode. Adjusting the deck keeps this next-encounter intent.
Navigation never settles or pays for a completed match a second time.

## Implementation boundaries

- `navigation-ui.mjs` provides pure shell/lobby markup; `navigation.css` styles it
  and the new preparation/quest panels with existing original artwork.
- `app.mjs` owns destinations, modal origins, deck-return intent and battle UI.
- `backpack-ui.mjs` retains the exact-copy editor; `adventure-ui.mjs` provides
  travel, arena, daily and market contents.
- The public allowlist includes the two new runtime files. The browser remains
  dependency-free. No artwork regeneration, profile migration, account API,
  infrastructure or game-rule change is required.
- Existing `shanhai.*` saves and pending-match snapshots remain authoritative for
  this offline game. This UI introduces no online competitive or ownership claim.

## Viewport scenes · 2026-09-22

All five destinations use the available viewport beneath the resource header
and above the main dock. Long content is reached through named modules and
Previous/Next pages. The interface keeps ordinary control sizes instead of
scaling the whole game. Short landscape screens use compact card rows; full
card art and rules remain accessible through detail modules.

- **洞府:** one scenic journey entry, quest journal and compact active-deck/Leader
  display. The deck action opens all eight exact copies.
- **遊歷:** map, paged route list, selected chapter and volume context. The
  [carved-piece prototype](MAP-PIECE-PROTOTYPE.md) moves along the route when an
  unlocked node is selected and keeps the map visible. Press the arrived piece
  again or **查看此境** for its chapter. Locked nodes open their preview directly;
  changing a volume returns to its map.
- **對弈:** arena, practice and future modes. Before Q0, a battle kept life and
  pills in the header and split hand, move, opponent and notes into separate
  modules, which hid the opponent while the player chose a move. The Q0
  [battle-table revision](BATTLE-LAYOUT-PLAN.md) replaces those modules with one
  對局 table that keeps the decision inputs visible together. Q0 merged into
  `main` in PR #5 (`bca9ab4`) on 2026-10-11 and is not deployed.
- **藏卡:** cards, filters and arrangement; expanded characters also have a
  printing selector. Decks separate saved slots, draft positions, available
  copies and saving. The codex separates discovery cards from search tools.
- **市集:** packs, boxes, seal redemption, merchant stock, sale and buyback.
  Daily/weekly quests, card journals, inheritance, encounter preparation,
  settings, odds and battle results follow the same scene model.
- **Receipts:** opening/revealing remains presentation of an already saved
  grant. Individual pack cards and the 24-pack overview paginate without
  granting or charging again; every exact receipt UID remains reachable.

`createViewportController({document,window,announce})` accepts
`refresh({key,root})`, `selectModule({key,moduleId,surfaceId?,focus?})` and
`revealElement(element,{focus?})`. Mark bounded containers with
`data-viewport-surface`, named panels with `data-viewport-module` and lists with
`data-viewport-list`. Each list's direct children have stable identities;
exact-copy lists use the owned UID. The controller measures fit, inserts real
tab/page buttons, makes off-page content hidden/inert and retains focus anchors
across resizing and DOM renders. It owns no save, RNG, economy or network call.
Externally controlled visibility, including opening phases, belongs to its
original controller. A diagnostic `data-viewport-overflow` flags content that
needs another module or a responsive layout rather than silent clipping.

The app calls adapters before refreshing the controller after a render or
partial overlay update. The pack controller provides layout/focus callbacks;
a newly revealed card stays visible, and focus moves to the real Next control
when the following card is on another page.
Tab arrows/Home/End, Previous/Next, modal focus trapping and reduced-motion
preferences are retained. Changing arrangement/printing opens the card module;
choosing a battle card opens move controls.

`tools/viewport-smoke.mjs` independently walks visible modules and every real
list page, compares exact card/receipt identities, checks document and active
panel geometry, hit-tests controls and proves browsing keeps profile bytes.
It uses isolated synthetic profiles at six portrait/landscape/desktop sizes.
Existing scenario suites use `viewport-browser-helpers.mjs` only to navigate
through actual tab/page controls; the helper never unhides DOM or force-clicks.
Browser-engine emulation is distinct from physical iOS/Android validation.

The 2026-09-23 carved-piece follow-up adds `map-piece.mjs` and `map-piece.css`.
The controller cancels on render, keeps per-world intent only in memory, and
respects sound/motion preferences. `adventure-ui.mjs` owns its markup and separate
**路程** module. `npm run test:map-piece` checks the six-size map flow in both
engines, including rapid reversals and keyboard focus across modules.

### Mobile shell

Roadmap packet N1, implemented locally on 2026-10-11 on the branch
`n1/mobile-shell` (from `main` `7712a7b`); not merged or deployed. The evidence
is browser emulation ([VALIDATION](VALIDATION.md#n1-mobile-shell--2026-10-11));
physical phones remain [M5.1 items](MOBILE-RELEASE.md#m51-phone-checklist).

- **Safe areas.** `index.html` uses `viewport-fit=cover`; zoom stays enabled
  (no `maximum-scale` or `user-scalable=no`). `styles.css` reads
  `env(safe-area-inset-*)` once, into `--safe-area-inset-top`, `-right`,
  `-bottom` and `-left` on `:root`, and derives `--safe-viewport-height`
  (`100dvh` less the top and bottom insets). Every other rule uses these
  properties, never `env()`, so a native shell can override the four on
  `document.documentElement` and the whole shell follows. Capacitor 8.5.2's
  SystemBars plugin, with `insetsHandling: 'css'`, injects
  `--safe-area-inset-*` variables on Android
  (`node_modules/@capacitor/core/system-bars.md`); whether its values win over
  the `:root` defaults depends on how it injects them, which is untried here
  (no native project exists).
  - `#app` is padded by the top, right and left insets: the header, scene, dock
    and battle sit inside the safe area while the background fills the screen.
    The dock and the battle screen keep `max(gap, bottom inset)` below them, in
    short landscape too.
  - Short landscape lifts the cards hub tabs (我的戰卡, 三套牌組, 萬象圖鑑) into
    the header row. They are positioned against the shell, not the viewport, so
    `#app`'s inset padding moves them with the header, and they end at least
    172px (settings 44 + gap 18 + the labelled 旅程閣 92 + gap 18) before the
    shell's right edge (`right: max(25%, 172px)`). Positioned against the
    viewport, 萬象圖鑑 had covered the left third of 旅程閣 whenever there were
    side insets (fixed 2026-10-12). With no insets they now sit up to 18px
    further left than before (844×390: x 410–615, was 427–633). They still
    overprint the wallet figures; see Limits.
  - `.modal-backdrop` has a transparent border as wide as each inset, so
    dialogs and sheets stay out of the bands while the dim and blur still cover
    them. Dialog heights and the market's card sizes subtract from
    `--safe-viewport-height`; the pack-opening and inheritance footers no longer
    add the bottom inset a second time. The toast sits above the bottom inset.
- **Narrow widths.** `body` lost its 340px minimum, which widened the page by
  38px at 302px and 20px at 320px (WebKit) and made Chromium lay out at 340px.
  The header is a size container: narrower than 330px (a narrow phone, or side
  insets) it keeps the 萬象契 mark as a 44px target with its label and hides the
  brand words, so wallet, account and settings still fit.
  - Removing the minimum exposed two older rules (fixed 2026-10-12). The compact
    collection and codex grid (`max-height: 740px`) had a 285px minimum track,
    wider than a 302px phone's 278px shell, so cards ran to the screen edge and
    the codex's rotated rarity dot made the page 303px wide; the track is now
    `minmax(min(285px, 100%), 1fr)`. The market's seven 44px tabs need 326px,
    so below a 350px screen they overlapped by about 4px and 回購 ran past the
    shell; there they now wrap four and three, and the market's scene title
    (the dock already names 市集) stays only for screen readers so the second
    row costs no height.
- **Focus zoom and touch.** On a coarse pointer, inputs, selects and textareas
  compute 16px (they were 10–14px; iOS Safari zooms on focus below 16px). A fine
  pointer keeps the desktop sizes. Buttons, links, form controls, labels and
  tabs use `touch-action: manipulation` (no double-tap zoom; pinch zoom stays).
  `html` and `body` use `overscroll-behavior: none`, since the game never
  scrolls the document (no pull-to-refresh or rubber band); dialogs use
  `contain`. Card art (`.card-art`, `.card-shade`, `.inheritance-material-art`)
  has `-webkit-touch-callout: none` and `user-select: none`; text stays
  selectable as before.
- **Landscape.** On short landscape screens (`max-height: 500px` and
  `min-width: 701px`) the arena's four tabs sit two by two, as the world rail
  already did, so 來日 clears the dock: in iPhone 15 landscape (734×343) the
  one-column rail needed 194px in a 188px row, so 來日 ran 6px past the row and
  3px into the dock. Module tabs have a 44px minimum width; WebKit had left the
  rewards dialog's 異聞 tab at 43.08px at 360px wide.
- **Names.** The ambience and effects sliders carry `aria-label` 環境聲音量 and
  落子音效音量; both had an empty accessible name.

`tools/shell-smoke.mjs` (`GAME_URL=… npm run test:shell`; Chromium as a Pixel 7
on installed Chrome, then WebKit as an iPhone 15) checks:
- every rendered input, select and textarea for 16px on the coarse pointer, and
  both slider names;
- at 302, 320, 360, 393, 412 and 734px wide, on the lobby, settings dialog,
  collection (all three tabs), market, 旅程閣, arena and battle: no wider layout
  viewport or sideways document scroll, no control or panel past the screen,
  no control, module or list item past the shell's side gutters, and no module
  or hub tab overlapping another or leaving its row;
- every interactive control against 48/44/34/44px (top, right, bottom, left)
  overrides of the custom properties, on those nine screens, on the phone
  viewport and at 844×390;
- the arena's controls against the dock at 844×390, 734×343 and 844×390 with
  those insets;
- the header row at 844×390, 734×343, 844×390 with those insets and 852×393
  with 0/59/21/59 (an iPhone 15 in landscape), on the lobby and the three
  collection tabs: no header control or hub tab overlaps another, and taps at
  seven points across each control land on it;
- the computed `touch-action`, `overscroll-behavior` and card-art `user-select`
  rules, with text outside cards still selectable. `-webkit-touch-callout` is
  only recorded: neither engine parses it, so it cannot be observed here.

`tests/mobile-shell.test.mjs` holds the static guards that CI runs. With zero
insets and a fine pointer the desktop renders as before; the 2026-10-11 record
compares screenshots.

Limits:
- **Vertical fit** was not part of N1. The viewport controller flags a page
  whose content is taller than its frame (`data-viewport-overflow`; the smoke
  prints these as `NOTE` lines without failing), and the overflowing item can
  run under the list's pager. Measured 2026-10-12 with every WX-01 printing in
  the save; the round-1 review saw the same collection flags at `7712a7b`
  (412×790 and 393×780), so that band predates N1:
  - The collection's 我的戰卡 list flags when the viewport is taller than 740px
    but the space left for the list is short. Its compact cards are keyed to the
    viewport height (`max-height: 740px`), not to the height left after the
    insets, so a full 361px card meets a shorter frame. With no insets that is
    roughly 741–790px tall on 360–412px-wide phones (412×790, 393×780 and
    360×780 flag; 412×800 and 393×800 do not); with top and bottom insets it
    reaches taller phones (412×839 with 48/34px insets, 757px usable; an
    iPhone 15 Home Screen app, 393×852 with 59/34px, 759px usable).
  - Shorter screens flag other pages: 320×568 (the collection's cards and
    decks, the arena), the 三套牌組 tab at 302×640, a phone with 48/44/34/44px
    insets (the collection; on the iPhone 15 also the decks tab and the
    arena) and short landscape with insets (844×390: the three collection
    tabs, the market, 旅程閣 and the arena).
- **Short-landscape collection header:** the cards hub tabs are still drawn over
  the wallet figures (coins and dust). They were before N1 too: at 844×390 with
  no insets the tabs spanned x 427–633 and the wallet 432–636 (with 50,000
  coins). They no longer cover any control.

## Checks

Run `npm test`, `python3 -m unittest discover -s tests -p '*_test.py'`, and
`npm run build`. Against a running loopback server, run
`GAME_URL=http://127.0.0.1:4177 npm run test:browser` and `npm run test:viewport`.
The latter runs the six-size viewport matrix in Chrome and WebKit.
`npm run test:shell` runs the mobile-shell checks above in both engines.

The added `tools/navigation-smoke.mjs` exercises preparation without mutations,
exact-copy deck changes and return, pending-match continuity, card detail
focus/page restoration, next/retry without duplicate rewards, and phone dock
reachability. The fourteen scenario suites retain battle, progression, migration,
backpack, packs, inheritance and fixture-based account coverage. Hosted login and
physical devices are separate checks; fixture tests do not send real email.
