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
- **遊歷:** map, selected chapter and volume context. Selecting a map node opens
  its chapter; changing a volume returns to its map.
- **對弈:** arena, practice and future modes. In a battle, life and pills stay in
  the header while hand, move, opponent and notes have separate modules.
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
