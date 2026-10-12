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
The [Back model](#back-model--2026-10-12) added browser and system Back on
2026-10-12, still without URL routing.

## Back model · 2026-10-12

Roadmap packet D1, on branch `d1/back-model` from `main` `7712a7b`; merged into
`main` in PR #11 (`335d2b7`), not deployed. Before it, browser Back (Android system back, iOS edge swipe, a
desktop Back button) left the game from every screen, because the runtime
created no history entries. Back now closes one layer at a time and leaves only
from the 洞府 root.

The layers above the root are a destination, sub-views and a dialog, or a
battle. [`nav-stack.mjs`](../nav-stack.mjs) models them from a plain view object
that `app.mjs` builds from its existing state (`screen`, `accountReturn`,
`preparationReturn`, the open 藏卡 group, `experienceReturn` and the overlay's
dismissible flag). One decision table answers every Back:

| Top layer | Back does | `app.mjs` calls |
| --- | --- | --- |
| Dismissible dialog: quests, settings, rules, preparation, card page, codex detail, pack receipt, inheritance, keep/abandon menu, any dialog with × | Closes it, exactly as ×, Escape or the backdrop. A result card or settings opened over a result or preparation returns to it. | `dismissModal()` |
| Round or match result, or any other non-dismissible dialog | Nothing: it stays open and nothing settles. The guard entry is re-armed. | — |
| A battle whose final commit is still being saved | Nothing until the result opens. Only the save itself holds: if it fails, the battle is a finished battle (below). | — |
| Collection group (one character's copies in 藏卡) | 藏卡 | `closeBagGroup()` |
| Deck editor opened from preparation | That preparation | `returnToPreparation()` |
| 旅程閣 | The screen it was opened from | `navigate(accountReturn)` |
| Battle in progress | The existing keep/abandon menu; profile bytes unchanged | `requestNavigation('home')` |
| Finished battle with no dialog open | 洞府 | `navigate('home')` |
| 遊歷, 對弈, 藏卡 (including the codex tab), 市集 | 洞府 | `navigate('home')` |
| 洞府 with nothing open | Handed to the system. On the web the page leaves without a confirmation prompt; this is the owner default. | — |

Each row calls the function that layer's own close control already calls, so
Back never settles, pays, claims or writes a save. The five return variables
stay where they were: they also carry focus and scroll restoration, and the
stack reads them rather than duplicating them.

**History entries.** Entries are state-only (`history.state["mythseal.nav"]`
holds a version, a per-load session id, a position, the layer signature and
the tab-history index of the tab's first game entry).
The URL never changes; there is no hash routing and no deep link. Each layer
above the root has one entry:

- `render()`, `modal()` and `closeModal()` queue one reconciliation, so every
  dismissible dialog gets its entry without changing any of the call sites.
- An entry is pushed only on a user turn: a trusted input that gives user
  activation (Escape gives none), with `navigator.userActivation.isActive` where
  the browser has it. Never from popstate, pageshow, timers, storage events or
  network callbacks. Chrome's history-manipulation intervention lets the Back
  button skip entries a page adds without activation.
- Switching destinations, cards-hub tabs or a dialog that replaces another uses
  `replaceState`, so the depth stays bounded by the layers. The deepest chain is
  five: a destination, preparation, its deck editor, a character group on the
  editor's cards tab and a card page. Ordinary play stays within three or four.
- Closing in the UI (×, Escape, backdrop, 返回 buttons, the dock) walks back
  over its own entries with `history.go(-n)`. The resulting popstate is
  recognised as the app's own, so one close is never handled twice.
- **Re-arm, not re-push.** When a Back holds (a result) or opens the
  keep/abandon menu, the game is still above the root, so it needs its entry
  back. It steps forward onto the entry Back just left (`history.go(+n)`)
  instead of pushing a new one from the popstate handler, which has no user
  activation. As Chromium describes its intervention, the entry under such a
  push is marked skippable, so the next Back could leave the game. If no entry
  is left ahead, the layer waits without one, and the next user turn pushes it.
  Each Back still closes or holds one layer.
- While one of the game's own walks is in flight, reconciliation waits for its
  popstate. If none arrives within 3 s (`NAV_STALL_MS`; a same-document walk
  lands within milliseconds), the next reconciliation reads the entry the page
  is really on, so a walk the browser dropped cannot block later pushes.
- **Reload and bfcache.** A reload starts at 洞府 with a new session id, so
  entries from the earlier load are stale. So does a game entry that Back or
  Forward returns to when the bfcache misses (for example Back from a page
  opened in the same tab). Stale entries are never acted on as layers and
  never settle anything. On start, the reloaded page uses the position stored in
  its entry to walk back over them (`history.go(-n)`) to the tab's first game
  entry, which becomes the root; that popstate is the game's own. The earlier
  entries then sit ahead (see **Forward** below), and the next push drops
  them, so reloads do not grow `history.length`. Back at the root is the
  browser's own and leaves in one step. When the game is the tab's first entry
  (a new tab, a home-screen shortcut, an Android Custom Tab), nothing is left
  before it, so that Back goes to the system, which on Android closes the tab or
  returns to the app that opened it (not checked on a phone). If the walk back
  never lands within 3 s, the reloaded entry stays the root, and a Back from it
  jumps past the earlier entries, which the browser ignores when nothing
  precedes the game. A bfcache restore (`pageshow` with `persisted`) reads the
  position stored in the restored entry, whichever load wrote it (`abs` counts
  the tab's game entries from the first one, across reloads), and pushes
  nothing until the next input. If the page left from an entry that Forward
  stepped past (a closed layer's, or an earlier load's), it walks back to the
  layers held, so the next Back at 洞府 still leaves in one step. From a
  persisted `pagehide` until `pageshow` the page reconciles nothing: a restore
  fires `visibilitychange` first, and the render it causes must not start a
  walk of its own, or the walk on `pageshow` would be a second one past 洞府.
- **Forward** never reopens a closed layer. Forward onto an entry above the
  layers held (a closed layer's, or an earlier load's) steps on with
  `history.go(+1)` while the tab has an entry past it. A page opened in the same
  tab after the game (a typed URL, a bookmark) is therefore still one Forward
  away, including after the game came back as a new load and walked back to its
  root. With nothing past it, the page steps back to the layers held. Whether an
  entry exists past it comes from `history.length` and the stored index of the
  tab's first game entry, which is read on a new load (the tab's last entry).
  That index can only be too high (browsers drop the oldest entries past a cap),
  so the step on is never out of range; when it is too high, Forward may step
  back as if nothing were past. A Back that races a step on counts from the layers
  held, so it does not leave 洞府.
- `history.scrollRestoration` is `manual`; the app already restores scroll and
  focus when a layer closes.

**Native shells.** `createNavHistory(...).requestBack()` applies one row of the
same table without waiting for a browser Back. It does move the history: when
the row closes a layer, it then walks back over that layer's entry with
`history.go(-1)`, as a UI close does, and the popstate of that walk is
recognised as the game's own. It returns `'exit'` at the root. A future
Capacitor back-button listener calls it
([MOBILE-RELEASE](MOBILE-RELEASE.md#back-button-in-a-native-shell--2026-10-12)).

**Checks.** `node --test tests/nav-stack.test.mjs` (N1–N22) covers every table
row against a simulated session history, including one where the game is the
tab's first entry. `GAME_URL=… npm run test:back` runs
`tools/back-smoke.mjs` in Chrome with the Pixel 7 descriptor, then WebKit with
the iPhone 15 descriptor ([VALIDATION](VALIDATION.md#d1-back-model--2026-10-12)).
In Chrome it also runs real bfcache restores in a second browser with the
bfcache on and production's `Cache-Control`; WebKit's page cache is not
covered. Playwright's `page.goBack()` steps to the previous entry by index. It
does not show whether a real Back button would skip an entry, so physical
Android gesture navigation (including predictive back), the iOS Safari edge
swipe and bfcache restores on phones are M5.1 items not yet verified.

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
`n1/mobile-shell` (from `main` `7712a7b`); merged into `main` in PR #12
(`e785b27`), not deployed. The evidence
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
  - In Safari's landscape with its toolbar showing, that lift costs the scene
    18px: under `viewport-fit=cover` an iPhone 15 there is 852×343 with
    0/59/21/59px insets (before, 734×343 with none) and an iPhone 13/14 is
    844×340 with 0/47/21/47px (before, 750×340). The market's modules had no
    room to spare, so on 秘匣 the 西行秘匣 picker, 開啟秘匣 and the odds link,
    on 西行印 both buttons, and on 秘券 the open button ran 10–32px under the
    opaque dock (fixed 2026-10-12). In short landscape the market's title now
    shares the tab row, with its subtitle beneath it, which gives the modules
    35px, and 秘券's note sits beside its button. Every market module now
    clears the dock at both sizes. At 734×343 with no insets, 秘券's button
    also clears it now; at `7712a7b` it was 11px under.
  - The 812pt-wide notch iPhones (X/XS/11 Pro with 44px sides, 12 mini/13 mini
    with 50px) are 812×325 in the same Safari landscape, 18px shorter again
    (724×325 and 712×325 before cover; the height is Playwright's landscape
    descriptor for those phones, not a device measurement). There 山行's open
    button, the 圖鑑 faction filters and 秘券's button sat 2–4px under the
    dock, and 秘匣's 西行秘匣 picker and odds link 10–18px (fixed 2026-10-12,
    review round 3). In short landscape 秘匣's picker and progress panel now
    start at the top of the module, the odds link sits beside the odds instead
    of below them, and the 山行 card, the codex's filter module and 秘券's card
    give up 6–9px of padding and gaps. At 812×325 with either inset every
    control now clears the dock by at least 3px in both engines, except items
    of lists the viewport controller flags (see Limits); 秘匣's footnote
    (每匣 3 張…) is text and still runs under the dock there.
  - Short landscape lifts the cards hub tabs (我的戰卡, 三套牌組, 萬象圖鑑) into
    the header row. They are positioned against the shell, not the viewport, so
    `#app`'s inset padding moves them with the header, and they end at least
    172px (settings 44 + gap 18 + the labelled 旅程閣 92 + gap 18) before the
    shell's right edge (`right: max(25%, 172px)`). Positioned against the
    viewport, 萬象圖鑑 had covered the left third of 旅程閣 whenever there were
    side insets (fixed 2026-10-12). With no insets they now end further left
    than before (corrected twice on 2026-10-12: this said "up to 18px", then
    "at most 18px"). Where 25% of the shell is the larger term, the shift is a
    quarter of the two side gutters together, (viewport − shell) ÷ 4. That is
    18px while the shell is the viewport less 72px (844×390: right edge 615,
    was 633; 1280×500: 942, was 960), and it grows once the shell reaches its
    1240px cap in a window wider than 1312px: 50px at 1440×500, 90px at
    1600×450, 170px at 1920×480 and 330px at 2560×480. The rule
    (`max-height: 500px`) has no width gate, so a desktop window 500px tall or
    less gets it. On a shell narrower than 688px the 172px floor applies and
    the shift grows too: 12px at 720×360, 17px at 700×390, 25px at 667×375,
    32px at 640×360 and 42px at 568×320 (right edge 384, was 426). The tabs
    still clear the brand and 旅程閣 (568×320: tabs 191–384, brand to 100,
    旅程閣 from 458). In wide short windows the old tabs had covered 旅程閣
    (reviewers' measurements at `7712a7b`: 1920×480, tabs 1231–1440 and
    旅程閣 1339–1432; 2560×480, 1711–1920 against 1659–1752); they now end at
    1270 and 1590, clear of it. They still
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
  compute at least 16px (iOS Safari zooms on focus below 16px): the fields
  drawn at 10–14px compute 16px, and 旅程閣's one-time code field keeps its
  20px (corrected 2026-10-12, review round 3: the 16px rule had shrunk that
  field to 16px on phones, and this said every field had been 10–14px). A fine
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
  rewards dialog's 異聞 tab at 43.08px at 360px wide. Landscape phones narrower
  than 701px (an iPhone SE 2/3 or 6–8 at 667×375, 568×320) are outside this
  layout and keep a known fault; see Limits.
- **Names.** The ambience and effects sliders carry `aria-label` 環境聲音量 and
  落子音效音量; both had an empty accessible name.

`tools/shell-smoke.mjs` (`GAME_URL=… npm run test:shell`; Chromium as a Pixel 7
on installed Chrome, then WebKit as an iPhone 15) checks:
- every rendered input, select and textarea, 旅程閣's code field included (the
  code request is mocked), for at least 16px on the coarse pointer and for no
  less than the same field measures with the coarse-pointer rules taken out
  (what a fine pointer draws); and both slider names;
- at 302, 320, 360, 393, 412 and 734px wide, on the lobby, settings dialog,
  collection (all three tabs), market, 旅程閣, arena and battle: no wider layout
  viewport or sideways document scroll, no control or panel past the screen,
  no control, module or list item past the shell's side gutters, and no module
  or hub tab overlapping another or leaving its row;
- every interactive control against 48/44/34/44px (top, right, bottom, left)
  overrides of the custom properties, on those nine screens, on the phone
  viewport and at 844×390;
- every control against the dock at 844×390, 734×343, 844×390 with those
  insets, 852×343 with 0/59/21/59, 844×340 with 0/47/21/47, and 812×325 with
  0/44/21/44 and 0/50/21/50 (Safari's toolbar-visible landscape on an
  iPhone 15, an iPhone 13/14 and the 812pt-wide notch iPhones), on each dock
  destination and each of its module tabs: 28 states (洞府, 遊歷's modules,
  對弈's four, 藏卡's three hub tabs and their modules, 市集's seven), each
  tab opened with an ordinary tap, so a covered tab fails. An item of a list
  the viewport controller flags as taller than its frame is printed as a
  `NOTE` instead (see Limits);
- the header row at 844×390, 734×343, 844×390 with those insets, 852×393
  with 0/59/21/59 (an iPhone 15 in landscape), 852×343, 844×340 and both
  812×325 sizes, on the
  lobby and the three collection tabs: no header control or hub tab overlaps
  another, and taps at seven points across each control land on it;
- at 667×375, 640×360 and 568×320, below the 701px gate: each module of
  遊歷, 對弈 and 市集 opened directly, and which of its tabs a centre tap then
  misses, printed as a `NOTE` (a known limit, not asserted);
- the computed `touch-action`, `overscroll-behavior` and card-art `user-select`
  rules, with text outside cards still selectable. `-webkit-touch-callout` is
  only recorded: neither engine parses it, so it cannot be observed here.

`tests/mobile-shell.test.mjs` holds the static guards that CI runs. With zero
insets and a fine pointer a desktop window taller than 500px renders as before;
the 2026-10-11 record compares screenshots (corrected 2026-10-12: this said
"the desktop", but a window 500px tall or less gets the short-landscape rules,
N1's changes to them included, such as the cards hub tabs' new anchor).

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
  - Where such a list item runs past its frame it can also reach under the
    dock, and `test:shell` prints it as a `NOTE`. In Safari's toolbar-visible
    landscape the collection's 我的戰卡 group, already running under its
    pager, reaches 3px under the dock at 852×343 and 6px at 844×340; with
    48/44/34/44px insets at 844×390, that group reaches 17px under, the
    三套牌組 draft cards 6px and the 圖鑑 cards 5px (2026-10-12). At 812×325
    with 0/44/21/44 or 0/50/21/50px insets the 我的戰卡 group reaches 21px
    under, the draft cards 10px and the 圖鑑 cards 9px (review round 3).
- **Landscape below 701px wide** (an iPhone SE 2/3 or 6–8 at 667×375, an
  Android phone at 640×360, a first-generation iPhone SE at 568×320; also
  700×390 and 667×331): the short-landscape layout (the arena's tab rail, the
  compact market, the world rail) needs `min-width: 701px`, so these phones get
  the portrait layout in a short frame. N1 did not cause this, and its
  landscape fixes do not reach these phones. Corrected 2026-10-12 (review
  round 3): the first record tapped through each scene's tabs in turn, which
  stops at the first module that covers the row, so it named only 整盒 and
  the arena's 問道. Each module of 遊歷, 對弈 and 市集 is now opened directly
  (a dispatched click) and measured in both engines with no insets, with the
  same results in each except where noted; the reviewers found the same at
  `7712a7b`.
  - **Modules that cover their own tab row.** With the module open, a tap at
    the centre of each listed tab lands on the module instead. The selected
    module stays selected through a trip to another dock destination and back,
    and only a reload returns the scene to its first module (秘匣, 問道). A
    player who opens 西行印 or 來日 therefore cannot reliably tap back out.
    - 市集 · 西行印 (`.wx01-seal-wallet`): all seven market tabs at all five
      sizes. No sampled point of any tab is exposed, except a 9px strip at the
      top of each at 700×390.
    - 對弈 · 來日 (`.arena-future-heading`): all four arena tabs at all five
      sizes. At 667×331 and 568×320 the lower part of each tab (18–21 of 45
      sampled points) still takes a tap, and a reviewer's WebKit centre tap on
      問道 at 568×320 did switch tabs; at the other three sizes at most 5 of 45
      points are exposed.
    - 對弈 · 問道 (the 問道擂台 heading, or the rank line at 667×331): all four
      tabs at 667×375, 640×360, 700×390 and 667×331. At 568×320 every tab is
      reached while 問道 is open.
    - 對弈 · 切磋 (its heading): the 問道 tab at 640×360, 700×390, 667×331 and
      568×320 (13–22 of 45 points exposed).
    - 市集 · 整盒: all seven market tabs at 667×375, 700×390, 667×331 and
      568×320, not at 640×360. 9–31 of 45 points of each tab stay exposed, so
      an off-centre tap can get through.
    - 遊歷's chapter module: all five world tabs at 667×375, 640×360, 700×390
      and 568×320 (0–13 of 45 points exposed), not at 667×331.
  - **Controls hidden or under the dock** (each control's box clipped to its
    overflow ancestors; both engines):
    - 秘匣: with 西行秘匣 selected (what 秘匣 opens with), 開啟秘匣
      (`buy-pack`) is wholly hidden at all five sizes, because
      `.scene-wx01-offer` (overflow hidden) is squeezed to about 20px, so a
      WX-01 pack cannot be bought here. With 萬象秘匣 or 群英秘匣 selected their
      button shows (only 29px and 26px of it at 667×331 and 568×320) and a
      centre tap reaches it (Chromium). The odds link is 3px under at
      700×390, 18px at 667×375 and 33px at 640×360, and wholly under at
      667×331 and 568×320.
    - 整盒's two buy buttons: 12, 20, 27, 42 and 45px under (700×390, 667×375,
      640×360, 667×331, 568×320).
    - 秘券's `ticket-open`: 8, 23 and 38px (700×390, 667×375, 640×360), wholly
      at 667×331 and 568×320.
    - 西行印's 展開輿圖 (`world`): 32 and 39px (700×390, 667×375), wholly at
      640×360, 667×331 and 568×320.
    - 商旅's buy buttons: 23, 38 and 53px (700×390, 667×375, 640×360), wholly at
      667×331 and 568×320. 寄售's first inspect button 9, 24, 39 and 68px
      (700×390, 667×375, 640×360, 667×331) and 38px at 568×320 (17px in
      WebKit), its sell button 10px at 667×331 and wholly at 568×320, and its
      pager 2px at 667×331 and 26px at 568×320 (5px in WebKit). Both lists
      are flagged as taller than their frame.
    - 山行's `activity-open`: 14px at 667×375 and 29px at 640×360, wholly at
      667×331 and 568×320.
    - 進入 AI 擂台 (`ranked`): 15px at 667×331, and wholly hidden by
      `.arena-lobby` at 568×320.
    - 遊歷: the chapter's `travel` button 34 and 42px (700×390, 667×375),
      wholly at 640×360, 667×331 and 568×320; the map's `map-inspect` 26px at
      667×331 and 40px at 568×320.
  - `test:shell` prints, at 667×375, 640×360 and 568×320, each module that
    covers its tab row as a `NOTE`.
- **Short-landscape collection header:** the cards hub tabs are still drawn over
  the wallet figures (coins and dust). They were before N1 too: at 844×390 with
  no insets the tabs spanned x 427–633 and the wallet 432–636 (with 50,000
  coins). They no longer cover any control.

## Save notices on the lobby · 2026-10-12 (D2)

Branch `d2/save-durability`, merging by D2's PR; not deployed. One compact strip
above the lobby, in the place the WX-receipt and activity resume strip uses (that
strip wins when both apply), never a dialog and never in a battle:

- **有舊旅程？由備份還原** on a journey this device has just started because no
  journey key existed: **備份檔** opens the file import (a v0.5.1 export too, since
  the second D2 review), and **雲端旅程** opens 旅程閣, which looks the account up
  and opens the cloud restore confirmation for a signed-in player with a backup,
  and otherwise its 雲端旅程 tab (the sign-in for a guest). 雲端旅程 is left out
  only for a guest 旅程閣 has found cannot sign in now. It closes when dismissed,
  after a restore or when a battle finishes.
- **首勝已記 · 留份備份？** (勝局已記 when the journey already had wins) and
  **新卡入藏 · 留份備份？** after the first win and the first pack opening this
  device records, for a player who has not made a cloud backup since:
  **匯出備份** and **旅程閣**, which opens 旅程閣 on its 雲端旅程 tab (a guest's sign-in,
  or 備份此裝置 brought onto its page for a signed-in player). A player is skipped only when 旅程閣 has already found them signed in
  during this page; the lobby makes no account request. Each appears at most once
  ever and stays for that page until dismissed or a cloud backup is made. An
  export from the strip leaves it up: the page cannot tell whether the browser
  saved the file.
- The strip keeps one row inside its 48 px; at 380 px or narrower the buttons drop
  their arrows. Below 340 px, which phones reach since N1 removed the body's 340 px
  minimum, the label takes a second line inside the same 48 px instead of being
  cut (added when `main` with N1 was merged into the branch).

Changed after the first D2 review (2026-10-12): 雲端旅程 on the first lobby, the
勝局已記 copy, the 340 px strip, and the corrected rule on who is not prompted.
Changed after the second D2 review (2026-10-12): 雲端旅程 without a cloud backup to
confirm opened 旅程閣 on its 此裝置 tab, so a guest saw the new journey and not the
sign-in this section promised; it now selects the 雲端旅程 tab. An export no longer
ends or skips a prompt.
Changed after the third D2 review (2026-10-12): a prompt's 旅程閣 used the header's
action and opened the 此裝置 tab, which has no backup, sign-in or export; it now
opens 雲端旅程 as the offer does. The import confirmation pages as two items (the
file and its notes, then the comparison), so its last note is no longer drawn under
the dialog's pager on a phone, and 上次備份 reads 雲端備份已刪除 after a confirmed
刪除雲端備份.

The 旅程閣 tools add **匯入旅程備份** and a status line (上次備份 for a cloud
backup, 上次匯出 for the last export download started, 長期保存) beside
**匯出旅程備份**. Rules and checks:
[LOCAL-COMMANDS §19](LOCAL-COMMANDS.md#19-file-import-and-save-safety-d2-2026-10-12);
`npm run test:saves` covers the strip at 390 px, 340 px and 302 px, and the import
confirmation from 340×640 to 844×390, in Chromium and WebKit.

**With the Back model (D1, merged into the branch on 2026-10-12).** The strips are
not layers: like the WX-receipt and activity resume strip, they add no history
entry, so Back on 洞府 with a strip showing still leaves in one step. The restore
offer stays open for the next visit; a prompt was consumed when it was shown and
does not return. What they open follows the
[decision table](#back-model--2026-10-12): 雲端旅程 and a prompt's 旅程閣 open
旅程閣, which Back closes back to 洞府. The file import is one dismissible
dialog layer (`import-review`), from the restore offer or from 旅程閣:

- It opens on the tap that opens the file picker, with 選擇旅程備份檔 and 取消, and
  its entry is pushed on that tap. A person usually stays in the picker longer
  than the tap's user activation lasts (about 5 s), and Chromium's picker consumes
  it, so an entry pushed when the file arrived would be refused and Back would
  leave the game instead of closing the dialog. The chosen file replaces the
  dialog's contents with the confirmation: the same layer, on the same entry.
  Where the browser reports a cancelled picker (`cancel`), the dialog closes;
  elsewhere it stays, with the picker again and 取消. A file that arrives after
  the dialog was closed opens nothing.
- Back, ×, Escape and the backdrop close it and write nothing. A refused file
  closes it through `closeModal()`, which walks back over its entry, then
  toasts the reason.
- While a confirmed import is being written (it may wait for the profile lock
  behind another tab) the dialog is not dismissible: × is hidden, its buttons
  are disabled, Escape and the backdrop do nothing and Back holds (the guard
  entry is re-armed, as for a result). Closing it could not stop the restore,
  only hide its outcome. A refusal releases it as it was; success closes it
  through `closeModal()`.
- 復原上次本機旅程 in 旅程閣 (`recovery-restore`) waits for the same profile
  lock and, since the integration review (2026-10-13), holds the same way while
  its restore is written. Each restore's success closes only its own dialog.
  Before, Back closed the recovery dialog with its restore still queued, and
  when it landed it closed whatever was open, such as the import dialog opened
  meanwhile from 匯入旅程備份, so the file picked in it opened nothing.

`npm run test:back` checks these in Chrome (Pixel 7) and WebKit (iPhone 15)
([VALIDATION](VALIDATION.md#d2-integration-with-main--2026-10-12)).

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
