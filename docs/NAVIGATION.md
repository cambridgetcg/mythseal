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

Roadmap packet D1, on branch `d1/back-model` from `main` `7712a7b`; not merged
or deployed. Before it, browser Back (Android system back, iOS edge swipe, a
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
| A battle whose final commit is still being saved | Nothing until the result opens. | — |
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
holds a version, a per-load session id, a position and the layer signature).
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
  entries from the earlier load are stale. They are never acted on as layers and
  never settle anything; Back at the root leaves past them in one step. A
  bfcache restore (`pageshow` with `persisted`) re-reads the position and pushes
  nothing until the next input.
- `history.scrollRestoration` is `manual`; the app already restores scroll and
  focus when a layer closes.

**Native shells.** `createNavHistory(...).requestBack()` applies the same table
without a browser traversal and returns `'exit'` at the root. A future Capacitor
back-button listener calls it ([MOBILE-RELEASE](MOBILE-RELEASE.md#back-button-in-a-native-shell--2026-10-12)).

**Checks.** `node --test tests/nav-stack.test.mjs` (N1–N17) covers every table
row against a simulated session history. `GAME_URL=… npm run test:back` runs
`tools/back-smoke.mjs` in Chrome with the Pixel 7 descriptor, then WebKit with
the iPhone 15 descriptor ([VALIDATION](VALIDATION.md#d1-back-model--2026-10-12)).
Playwright's `page.goBack()` steps to the previous entry by index. It does not
show whether a real Back button would skip an entry, so physical Android
gesture navigation (including predictive back), the iOS Safari edge swipe and
real bfcache restores are M5.1 items not yet verified.

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

## Checks

Run `npm test`, `python3 -m unittest discover -s tests -p '*_test.py'`, and
`npm run build`. Against a running loopback server, run
`GAME_URL=http://127.0.0.1:4177 npm run test:browser` and `npm run test:viewport`.
The latter runs the six-size viewport matrix in Chrome and WebKit.

The added `tools/navigation-smoke.mjs` exercises preparation without mutations,
exact-copy deck changes and return, pending-match continuity, card detail
focus/page restoration, next/retry without duplicate rewards, and phone dock
reachability. The fourteen scenario suites retain battle, progression, migration,
backpack, packs, inheritance and fixture-based account coverage. Hosted login and
physical devices are separate checks; fixture tests do not send real email.
