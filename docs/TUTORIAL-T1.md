# First-visit hints and glossary · T1

**Status: `proposal · 2026-10-20 · revised after review`; implemented on
2026-10-21 on the same branch as local commits (not pushed, merged or
deployed).** This is an implementation spec on the branch
`t1/first-visit-hints`, started from `main` `3f3d351`. Every file:line below
was read at `3f3d351`. No test, build or browser ran for the spec itself. The
first draft (`34e24e1`) was reviewed the same day for game truth and for UX and
architecture; this revision applies those reviews, and the
[critique log](#critique-log) records each point and the few that were not
taken as written. The [implementation record](#implementation-record--2026-10-21)
lists the commits and every place the build departs from this text, with the
measurement behind it; where they differ, the record and the code are current.
A review of the build the same day led to the
[review fixes](#review-fixes--2026-10-21); the sections above already carry
them. Yu answered four of the open points on 2026-10-21; §8 records the
answers, and the sections above carry them.

**Owner decisions it implements (Yu, 2026-10-20):**

- Fix the rules-first trap. On a first visit, 知其道，入其局 leads to the
  霧隱渡口 first expedition preparation instead of 自由切磋. Everything else
  about D3 stays frozen, including the `shanhai.coach.v1` contract.
- Build T1: first-visit hints (初見提點), a glossary (詞彙) and tappable
  header resources.
- Later and not in this spec: T2, an illustrated 入門卷 with ArtCraft art
  (Mythseal's own reference images only, every image's provenance recorded),
  and Design A, a guided full session, only if playtests show players get
  lost.

T1 adds no image, so it needs no `docs/ART-*.md` entry.

Contents: [1 · Rules-first fix](#1-the-rules-first-fix) ·
[2 · Hints](#2-first-visit-hints-初見提點) ·
[3 · Glossary](#3-glossary-詞彙) ·
[4 · Header resources](#4-tappable-header-resources) ·
[5 · State and modules](#5-state-and-module-design) ·
[6 · Accessibility, Back, builds](#6-accessibility-motion-back-native-and-web-builds) ·
[7 · Tests](#7-test-plan) · [8 · Open questions](#8-open-questions-for-yu) ·
[9 · Order and coordination](#9-implementation-order-coordination-and-scope) ·
[Appendix · facts checked](#appendix-facts-checked-in-code) ·
[Critique log](#critique-log)

---

## 1. The rules-first fix

### 1.1 What happens today (read in code, not run)

1. On a first visit the lobby ledger shows 「初次落子？讀懂弈道」 with
   `data-action="rules"` (`navigation-ui.mjs:71`). It shows while
   `profile.stats.played === 0 && !profile.pending` (`navigation-ui.mjs:57`).
2. `rulesModal()` (`app.mjs:834-842`) ends with 「知其道，入其局」,
   `data-action="rules-start"` outside battle (`app.mjs:841`).
3. The dispatcher handles `rules-start` together with the arena page's
   `start` (`app.mjs:1486`). Both call `prepareEncounter()`, whose default
   kind is `'practice'` (`app.mjs:794`). The player gets the 自由切磋
   preparation, which offers 稍後出發.
4. If that practice match is finished, `finishBattle` increments
   `stats.played` for every kind of battle (`progression.mjs:640`). The coach
   marks ①–④ then never start, because `coachStart` requires
   `played === 0` (`battle-teaching.mjs:217-218`).
   - `abandonBattle` does not increment it (`progression.mjs:616-621`), so
     only a finished match loses the marks.
   - Only the marks are lost. The planning hint, the formula, the Fury and
     cost notes and the reveal tip show in every battle.

The same dialog opens from three more places, each with the same button
outside battle:

- web 旅程閣's tools row, 「弈道 · 遊戲規則」 (`saveToolsMarkup`,
  `save-ui.mjs:52`, rendered on the account page at `app.mjs:592`);
- the store build's 旅程存檔 panel, the same row (`save-ui.mjs:80`, opened at
  `app.mjs:245`); the rules dialog then replaces the panel;
- battle's 弈道 header button (`navigation-ui.mjs:23`), whose button is
  明白，返回對局.

One more first-visit path to practice stays open: in 任務手札, 今日落子's
前往 leads to 對弈 (`adventure-ui.mjs:38`, `matches` → `arena`). The
`arena-first` hint (§2.3) speaks there, but T1 does not reroute it.

D3's design says a first practice or arena battle shows no marks (the Ending
row in [BATTLE-LAYOUT-PLAN](BATTLE-LAYOUT-PLAN.md#first-battle-teaching--2026-10-12);
`tools/coach-smoke.mjs:708-717` tests it with the arena page's `start`). What
D3 never said is that the first-visit rules lead into practice.

### 1.2 New behaviour

`rules-start` decides its route at tap time, wherever the dialog was opened
outside battle:

| Profile at the tap (fresh read through `loadProfile()`) | 知其道，入其局 does |
| --- | --- |
| First visit: `stats.played === 0` and no `pending` battle | Closes the rules dialog, goes to 遊歷 with `selectedNode = 'mist-gate'`, and opens the 霧隱渡口 preparation: `prepareEncounter('expedition', 'mist-gate')`. This is what the lobby's own 先赴霧隱渡口 does (`story-unlock`, `app.mjs:1291-1293`). |
| Anything else | Unchanged: `prepareEncounter()`, the 自由切磋 preparation. With a pending battle, that still shows the pending-battle dialog. |

**Why the condition is the lobby's.** "First visit" is the lobby's own
predicate (`navigation-ui.mjs:57`). In the lobby, whoever sees
「初次落子？讀懂弈道」 is sent to the ferry and whoever sees 「溫習弈道」 is
not. From 旅程閣 or 旅程存檔 the label is 「弈道 · 遊戲規則」 for everyone,
but the same predicate decides: a player who has never finished a battle is
sent to the coached first battle wherever they read the rules. This is
intended.

**It reads only the profile, not the coach state.** A player who skipped the
coach and then abandoned that battle still has `played === 0`. 霧隱渡口 is
still their natural first step, and `coachStart` decides on its own whether
marks show. The hint copy reads the coach state only so that it never
promises guidance that will not come (§2.3).

**A known edge, unchanged.** A v2–v4 save hydrated with cleared nodes but
`stats.played === 0` counts as a first visit. Such a player already sees
「初入山海」 in the lobby and D3's coach today; T1 sends their rules tap to
the ferry too, consistent with both. Changing the predicate would change the
lobby, so it stays (open question 12).

**Unchanged:**

- The arena page's `start` (開始練習, `adventure-ui.mjs:76`) still opens
  practice.
- D3's rule that a first practice or arena match shows no marks.
- `battle-teaching.mjs`, `battle-ui.mjs`, `nav-stack.mjs` and
  `shanhai.coach.v1`.
- In battle, the rules button is still 明白，返回對局 (`close-modal`).

### 1.3 Cancel, Back, focus and writes

- **Cancel** (稍後出發, ×, or Back) closes the preparation and leaves the
  player on 遊歷 with 霧隱渡口 selected, as a cancelled 啟程遊歷 or
  先赴霧隱渡口 already does. The rules dialog does not reopen, and tapping
  the rules entry again gives the same route.
- **Back.** `navigate()` closes the rules dialog (`app.mjs:1102-1115` calls
  `closeModal()`); the layers before and after the tap, as `navSignature`
  writes them (洞府 is the root and adds no layer):

  | Opened from | Before the tap | After the tap | History |
  | --- | --- | --- | --- |
  | Lobby | `modal:rules` (depth 1) | `destination:world>modal:preparation` (depth 2) | the tap's activation pushes one entry, as for `story-unlock` |
  | 旅程閣 (web) | `sub-view:account>modal:rules` (depth 2, when 旅程閣 was opened from 洞府) | `destination:world>modal:preparation` (depth 2) | same depth: the entry is replaced |
  | 旅程存檔 (store build) | `modal:rules` (depth 1; the rules dialog replaced the panel) | `destination:world>modal:preparation` (depth 2) | one entry pushed |

  In each case Back closes the preparation, and the next Back goes home.
- **Focus.** `navigate()`'s render removes the control that opened the rules,
  so `modal()` would record `document.body` as `lastFocus` and a cancel would
  leave focus nowhere. The branch therefore focuses the dock's 遊歷 button
  before `prepareEncounter`; cancelling returns focus there. (`story-unlock`
  has the same gap today; T1 does not change it.)
- **Writes:** nothing until 踏上渡口. `prepareEncounter` only sets the
  in-memory `preparation` and opens a dialog (`app.mjs:794-801`), and
  `navigate()` writes no profile.
- **Busy:** the branch returns at once while `economyBusy` is set, so the
  player is never moved to 遊歷 without a dialog.

### 1.4 Code

`first-visit.mjs` (new, pure; see §5):

```js
export const FIRST_EXPEDITION = 'mist-gate';
/** The lobby's first visit (navigation-ui.mjs lobbyMarkup): no battle finished, none in progress. */
export const isFirstVisit = profile => profile?.stats?.played === 0 && !profile?.pending;
/** Where the rules dialog's 知其道，入其局 leads (docs/TUTORIAL-T1.md §1). */
export function rulesStartRoute(profile) {
  return Object.freeze(isFirstVisit(profile)
    ? { kind: 'expedition', nodeId: FIRST_EXPEDITION }
    : { kind: 'practice', nodeId: null });
}
```

In `app.mjs`, line 1486
(`if(action==='start'||action==='rules-start')return prepareEncounter();`)
becomes:

```js
if(action==='start')return prepareEncounter();
// T1: a first visit's rules lead to 霧隱渡口, where D3's first-battle coach runs (docs/TUTORIAL-T1.md §1).
if(action==='rules-start'){
  if(economyBusy)return;
  syncProfile(loadProfile());
  const route=rulesStartRoute(profile);
  if(route.kind!=='expedition')return prepareEncounter();
  selectedNode=route.nodeId;navigate('world');
  app.querySelector('.game-dock [data-action="world"]')?.focus({preventScroll:true});
  return prepareEncounter(route.kind,route.nodeId);
}
```

`navigation-ui.mjs:57` should import `isFirstVisit` rather than repeat the
expression, so the two can never drift apart.

`battle-teaching.mjs` keeps its private `FIRST_NODE` (`battle-teaching.mjs:194`).
A Node test ties the two together instead (§7.1). That test fails if D3's first
node and T1's route ever disagree.

### 1.5 Documents and tests to update with the fix

- [BATTLE-LAYOUT-PLAN](BATTLE-LAYOUT-PLAN.md#first-battle-teaching--2026-10-12),
  D3 table, **Ending** row: keep every sentence, including "A player whose
  first battle is a practice or arena match never sees them." Append:
  > Reading the rules first does not lose them: since T1 (2026-10-20), on a
  > first visit (no battle finished, none in progress) the rules dialog's
  > 知其道，入其局 opens the 霧隱渡口 preparation instead of 自由切磋
  > ([TUTORIAL-T1](TUTORIAL-T1.md#1-the-rules-first-fix)).
- [NAVIGATION](NAVIGATION.md): one line under the encounter loop or
  destinations about the rules dialog's two routes and their three origins,
  and the Back-model lines of §1.3.
- `tools/coach-smoke.mjs`:
  - The existing practice case (`:708-717`) stays as it is, because D3's
    rule is unchanged. Its assertion message 'practice leaves the coach for
    the first journey battle' still holds.
  - New case (section 4b, "the rules lead a first visit to the ferry"):
    1. On a fresh profile, tap `.game-lobby [data-action="rules"]` and check
       its text is 初次落子？讀懂弈道.
    2. Tap `#overlay-root [data-action="rules-start"]` and expect
       `#overlay-root .encounter-prep.is-mist-prep`, with the screen on
       遊歷 (`.scene-world`).
    3. Tap 稍後出發 and check:
       - still on 遊歷, no `shanhai.battle.v5`, and the profile bytes and
         coach record (`null`) unchanged;
       - focus is on the dock's 遊歷 button;
       - `page.goBack()` once reaches the lobby.
    4. **1b, the 旅程閣 origin.** On a fresh profile, open 旅程閣, tap its
       tools row's 「弈道 · 遊戲規則」, then `rules-start`: the same
       `.is-mist-prep` on 遊歷. One Back closes the preparation and a second
       reaches 洞府. (The store build's 旅程存檔 origin is checked by
       guide-smoke's native pass, §7.2.)
    5. Repeat to the preparation, tap 踏上渡口, and assert mark ①
       (`assertCoach(page, 'card', …)`) with the encounter `mist-gate`
       stored.
    6. On the veteran profile (`played: 1`), `rules-start` opens a
       preparation without `.is-mist-prep`, eyebrow 自由切磋 · 出發前整備.
  - Extend the header comment's "Asserts" paragraph with one sentence for
    this case.

---

## 2. First-visit hints (初見提點)

### 2.1 Principles

1. **A hint takes the place of an existing line; it never adds one.** Each
   hint has a **slot**: one node it replaces, plus optional nodes it removes,
   plus an optional `requires` selector that must match in the scene or the
   hint is not placed. The hint is the same element (tag) as the replaced
   node, with the same classes and the same parent, plus `guide-hint`. Every
   breakpoint rule that sizes, places or hides the slot then sizes, places or
   hides the hint.
   - A re-render brings the slot back once the hint retires.
   - **Size floor.** No hint text is smaller than 10 px, the floor of D3's
     hint and coach lines (`battle-teaching.css:7,21`), and the 「初見」 seal
     is never smaller than the text beside it. Every slot below is already
     ≥ 10 px on phones (§2.4).
   - **"Cut" means shorter copy.** A copy that does not fit is rewritten
     shorter. A hint is never clamped, ellipsised or clipped
     (no `line-clamp`, `text-overflow` or `overflow:hidden`).
   - **Acceptance (§7.2)**, measured against a hints-off run of the same
     scene at every tested size:
     - the hint's box, margins included, is no taller than the boxes it
       replaces and removes;
     - every later sibling of the slot, and every list frame in the surface,
       keeps its position and height or improves (moves up, grows);
     - in the lobby, which has no modules and so never raises an overflow
       flag, `.lobby-continue`, `.scene-lobby-companions` and `.lobby-ledger`
       with its rules link sit no lower than in the hints-off run and above
       the dock;
     - no new `data-viewport-overflow` flag appears, and page counts are the
       same.
2. **No control inside a hint.** `tools/viewport-smoke.mjs:92` fails any
   visible control smaller than 43.5 × 43.5 px. A 44 px 知道了 cannot sit
   inside a one- or two-line footnote slot without growing it.
   - Hints therefore retire on their own (the "Lasts" column below), and
     one switch in 聲息與節奏 turns them all off, or back on to see them again
     for a newcomer (within the first `NEWCOMER_BATTLES` battles; `bag-decks`
     and `market-printing` only while their own signals still hold; item 5,
     §5.6).
   - Whether Yu wants a per-hint 知道了 anyway is open question 5.
3. **Inline, `role="note"`, never a Back layer.** A hint is page text in
   reading order.
   - It is not a dialog, overlay or live region, and it never takes focus.
   - `navLayers` and the history entries are unchanged: Back does what it did
     before, and no hint is ever closed by Back.
4. **Read-only conditions.** A condition reads the profile, the guide key and
   `selectedNode`, `coachMemory.seen()` (a read, never a write) and the
   `shanhai.guide.v1` record. It never writes, settles or spends.
5. **Newcomers only.** The hints are for people new to the game, not for
   every journey that lacks a `shanhai.guide.v1` record (every existing
   journey, restores, the owner's TestFlight save):
   - every *visit* hint requires `isNewcomer(profile)`, which is
     `stats.played < NEWCOMER_BATTLES` (10; open question 11), plus its own
     newness signal where an exact one exists (`bag-decks`,
     `market-printing`);
   - `fire-mountain` uses only its own exact signal (no run ever started), so
     a veteran who has never climbed it sees it once;
   - the condition hints have their own conditions (`home-start` and
     `arena-first` need `played === 0`; `world-level` needs `isNewcomer`).

   A journey with ten or more finished battles therefore sees no hint after
   the update, and none again after site data is cleared or iOS evicts
   storage.
6. **A visit is a screen, not a view.** The screen channel's key is
   `guideScreenKey(screen, bagView.tab)`: the screen, or for 藏卡
   `bag-cards` / `bag-decks`. It is not `viewKey()`, which changes within the
   bag when 排列方式 changes or a character opens (`app.mjs:1116`). The
   dialog channel's key is the dialog's kind.
7. **Recorded only once seen.** A *visit* hint is recorded in
   `shanhai.guide.v1` only after it has been painted and could be read:
   - the check runs two animation frames after placement (a hidden page runs
     no frames, so it waits until the page is shown);
   - the hint must still be connected and visible (not inside `[hidden]`,
     with client rects) and `document.visibilityState` must be `'visible'`;
   - on the screen channel, no dialog may be open (`app.inert` is false).
     Flows such as `prepareNextEncounter` (`app.mjs:821-827`) render a screen
     and open a dialog in the same task; a hint placed there is not recorded
     until the dialog closes, when `closeModal()` runs the check again;
   - a hint that is in a hidden module at the check (for example 山行 when
     the 火焰山 dialog opens on 牌組) is not recorded. If the player then
     switches to it, they see it unrecorded, and it shows once more on the
     next visit. That is the worst case, by design.

### 2.2 Voice

**Recommendation: split by place.**

- **守渡弈者 for the two hints that send the player to his ferry** (`home-start`,
  `arena-first`). They are written like his quoted lines in
  `mist-gate-ui.mjs`: visible label 守渡弈者, then a 「quoted」 line in his
  register, with the lantern, the river, 落子 and 你. His lines are
  「不必急着渡河，先看清手中的牌。」 and 「燈還亮着。這一程，你想怎樣走？」
  (`mistGateArrivalMarkup`, `:8`), and
  「霧未散，船也還在。歇一息，再來。」 (`mistGateResultMarkup`, `:24-25`).
  (「水面很靜，落子由你。」 is the battle heading's caption, `:13`, not one of
  his quoted lines.)
- **A neutral narrator for the six system hints**, in the register of the
  footnotes they replace (「每張卡各有畫作、編號與歷練；點開卡面查看同行記。」
  `backpack-ui.mjs:61`).

Why not the guardian everywhere:

- 守渡弈者 is the ferry's NPC and the first AI opponent: 「掌燈人正等你落下第一子」.
  Having him narrate the market's odds or the deck editor would merge an
  in-world character with interface chrome.
- These hints state exact rules (8 位、25 星、畫作不改變能力). Numbers inside a
  character's quoted line read awkwardly and blur what is a rule and what is
  flavour.
- ROADMAP M4.3 asks for "short guardian writing" per realm. Keeping his voice
  scarce keeps it his.

Not 渡影 either: 渡影 is a playable 月隱 card (`engine.mjs:35`). Voicing hints
as 渡影 would merge a card with the NPC.

Visual marker:

- Narrator hints start with a small gold 「初見」 seal (aria-hidden), at the
  text's own size.
- Guardian hints start with his gold label, inline before the quote.
- Both carry a screen-reader prefix 「初見提點：」, as the coach's
  「新手指引 n / 4：」 does (`battle-ui.mjs:86`).

### 2.3 Registry (8 hints)

*Built (2026-10-21):* `home-start` keeps the lobby footnote, and the copies of
`home-start` and `quests-why` were cut to one line. The table quotes the built
copies; the spec's longer drafts and the measurements are in the
[implementation record](#implementation-record--2026-10-21). `world-level`'s
copy is Yu's of 2026-10-21 (§8).

**How to read the table:**

- **Copy** is the exact zh-Hant text, counted in code points; every one is
  ≤ 40.
- **Slot** gives the render site at `3f3d351` and the CSS selector the
  adapter uses (§5.4). "Removes" nodes disappear while the hint shows;
  "requires" must match or nothing is placed.
- **Key** is the guide key (§2.1 item 6) of the scene, or the dialog kind.
- **Lasts:**
  - *condition*: shows every time its condition holds, and retires when
    the condition ends. Never recorded.
  - *visit*: shows for the whole of the first visit on which it is recorded
    (§2.1 item 7), and never again.
  - With the switch off (§5.6), none shows.

| # | id · scene (key) | Slot: render site → replaced (removed, requires) | Condition (read-only) | Voice | Copy | Lasts · retires |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `home-start` · 洞府 (`home`) | `navigation-ui.mjs:67` → `.lobby-route > p` (the realm's subtitle: on a first visit normally 霧隱渡口's 「渡船停在霧中，掌燈人正等你落下第一子。」, also shown in its preparation); keeps `.lobby-route-footnote` (「四回合對弈 · AI 守境人」; the spec removed it, implementation record item 1); **requires** `.lobby-continue[data-action="continue-journey"]`. When the lobby shows a locked node of another volume (`blocked`, `:60`), the button reads 先赴霧隱渡口 and the footnote 「渡口首勝後，展開此卷」 (`:67`): those already say what the hint would, so no hint is placed and the footnote stays | `isFirstVisit(profile)` | 守渡弈者 | Coach not yet ended: 「燈在渡口等你，首局我陪你走。」 (14). Coach ended (`coachMemory.seen()`): 「燈在渡口等你，先落第一子。」 (13) | condition · the first finished battle |
| 2 | `arena-first` · 對弈, 問道 module (`arena`) | `adventure-ui.mjs:74` → `.arena-lobby-copy > .arena-fairness` (「保留同族共鳴與技能；出過牌的卡各得 12 EXP（勝）或 8 EXP（和／敗）。」) | `isFirstVisit(profile)` | 守渡弈者 | Coach not ended: 「擂台與切磋不急。先到遊歷的霧隱渡口，首局我陪你走一遍。」 (27). Ended: 「擂台與切磋不急。先到遊歷的霧隱渡口，落下第一子。」 (24) | condition · the first finished battle |
| 3 | `world-level` · 遊歷, 此境 module (`world`) | `adventure-ui.mjs:31` → `.destination-panel > .destination-subtitle` (the node's four-character flavour line, for example 「聽風尋跡」). The footnote 「勝利後續寫下一境；每日首勝另有秘藏。」 stays | `isNewcomer(profile)`, the selected node is unlocked (`isNodeUnlocked`; a locked node keeps its 「先踏破…」 lines), and its 建議 Lv is above the highest card level in the active deck (`activeDeckTopLevel`) | narrator | 「建議 Lv 僅供參考，戰卡等級越高越穩。」 (20; Yu, 2026-10-21) | condition · the deck catches up, or the tenth finished battle |
| 4 | `bag-copies` · 藏卡 我的戰卡 (`bag-cards`) | `backpack-ui.mjs:96` → `.bag-lead > .bag-overview` (持有卡牌 · 收集角色 · 已鎖定珍藏), outside every module and above the framed list. An opened character (`expandedCardId`) renders no lead, so no slot: the hint stays pinned to the visit and returns when the character closes | `isNewcomer(profile)` | narrator | 「同名卡可藏多張，每張各記編號、畫作與歷練；哪張出牌，哪張得歷練。」 (32) | visit |
| 5 | `bag-decks` · 藏卡 三套牌組 (`bag-decks`) | the same `.bag-overview` (the lead also shows on 三套牌組). The full rule now sits only on the last tab, 編組說明 (`backpack-ui.mjs:85`, moved by `scene-adapters.mjs:29,36`) | `isNewcomer(profile)` and one deck slot (`deckSlots.length === 1`) | narrator | 「每套 8 位不同角色、總星數不超過 25；可存 3 套，設為出戰的才上陣。」 (37). The three numbers are rendered from `RULES.deckSize`, `RULES.starLimit` and `MAX_DECK_SLOTS` | visit |
| 6 | `market-printing` · 市集, 秘匣 module, WX-01 offer (`market`) | `adventure-ui.mjs:62` → `.scene-wx01-offer .scene-pack-copy > p` (「16 位同行者，29 種版本。本畫、異畫與領契，記下不同瞬間。」). The slot exists only while 西行秘匣 is selected (the default); the classic packs keep their own description. The eyebrow, 西行秘匣 and 「每匣 3 張 · 至少一張靈品或神品」 stay | `isNewcomer(profile)` and no WX-01 pack opened yet (`wx01.opened === 0`) | narrator | 「凡、靈、神品是品階，本畫、異畫是畫作；皆不改變星數與能力。」 (29) | visit |
| 7 | `quests-why` · 任務手札, 朝露 module (dialog `quests`) | `adventure-ui.mjs:51` → `.daily-gift > p` (「每日上線，收一份遠方捎來的心意。」), the only description of the 朝露 gift: `.daily-gift .eyebrow` is hidden there (`navigation.css:137`). The copy therefore names the daily gift as well as the tasks | `isNewcomer(profile)` | narrator | 「朝露與功課，助你開匣修練。」 (13) | visit |
| 8 | `fire-mountain` · 火焰山三連戰, 山行 module (dialog `activity`) | `expansion-ui.mjs:44` → `.activity-arrival > p` (`FIRE_MOUNTAIN.description`, about 45 characters) | `getExpansionSummary(profile).activity`: `unlocked` and no `run`; and `profile.expansion.serial === 0`, which `startActivity` increments on every run start (`progression.mjs:737`), so a run abandoned before its first result also counts as tried | narrator | 「三戰相連：生命與仙丹帶到下一戰，勝後生命 +2、仙丹至少補至 8，再選一項補給。」 (40; the 8 is `ACTIVITY_PILL_FLOOR`). The loss rule is not repeated: the overview's own line below, 「不收門票，不限次數。每戰四回合；輸或和局結束本次山行。」, already gives it | visit · or the first run started |

The first draft's ninth hint, `arena-modes`, is dropped: the arena page
already states both of its rules in place (統一基礎能力 on 問道, 「不獲金幣或卡牌
EXP」 on 切磋, `adventure-ui.mjs:74,76`), and it would have hidden the only
exact card-EXP line for the arena.

**Truth of each copy** (the appendix has the code lines):

- `home-start`, `arena-first`:
  - 「首局…我陪你」 is promised only while the coach has not ended, and
    `rules-start`, 啟程遊歷 or 先赴霧隱渡口 then really leads to the coached
    battle.
  - The guardian is that battle's opponent, so the line is framed in-world
    (open question 1).
  - 遊歷 is the dock's destination where 霧隱渡口 is, since a hint holds no
    button.
- `world-level`:
  - Unlocking depends only on the cleared prerequisite (`isNodeUnlocked`).
  - Card levels add power and damage in expeditions (`LEVEL_BONUSES`,
    `engine.mjs:88`; `getBattleCard`, `:115-121`).
  - The condition compares 建議 Lv with the deck's card levels only to
    choose *when* to speak. The copy makes no claim about what 建議 Lv is
    compared with, because the game compares it with nothing (open
    question 3).
- `bag-copies`: each copy has its own UID, print and card EXP, and play adds
  card EXP to the copy that was played (`awardInstanceXP` on the played UIDs,
  `progression.mjs:683-688`). The copy says which copy gains from play; it
  does not say play is the only way (同名傳承 is the other, taught in the
  passport, `backpack-ui.mjs:109`). The hint uses 歷練 throughout, never EXP
  in the same sentence.
- `bag-decks`: `validateDeck` requires exactly 8 different cards and at most
  25 stars (`engine.mjs:123-131`); three slots (`MAX_DECK_SLOTS`,
  `collection.mjs:7`); only the active deck plays.
- `market-printing`:
  - Rarity is independent of stars, power and level
    (`progression.mjs:40`).
  - 「畫作不改變角色的星數、能力或品階」 (`pack-ui.mjs:32`).
- `quests-why`: the 朝露 gift pays coins and 靈砂 (`LOGIN_REWARD`,
  `progression.mjs:73`), as do the tasks (`:76-78`); coins buy packs, and
  coins and 靈砂 pay for 修練. The copy says what they are for, not that they
  are the only source.
- `fire-mountain`:
  - Life and pills carry over, with recovery after a win (`settleActivity`,
    `progression.mjs:764-796`; rules at `expansion-ui.mjs:47`): life
    `min(12, hp + 2)` and pills `max(8, pills)` (`progression.mjs:791` at
    `3f3d351`; the 8 is now `ACTIVITY_PILL_FLOOR`, which the copy reads).
    `tests/first-visit.test.mjs` settles a win at 9 life and 1 pill and gets
    11 and 8.
  - Between battles the player may choose one supply; with both full, the
    run goes straight on (`expansion-ui.mjs:48`).
  - A loss or draw ends the run, and banked rewards stay
    (`expansion-ui.mjs:49`; `progression.mjs:793`). The copy leaves this to
    the overview's own line (`expansion-ui.mjs:44`).

### 2.4 Height budgets

These are estimates from the CSS at the 302 px portrait width. `npm run
test:guide` (§7.2) measures them; a copy that exceeds its slot at any tested
width is cut shorter (§2.1), never allowed to grow the scene.

| Hint | Slot at 302 px (estimate) | Copy (estimate) |
| --- | --- | --- |
| `home-start` | Subtitle 1–2 lines at 11–12 px (`scene-navigation.css:111,121,156`), plus the 10 px footnote and its 5–8 px margin | label and quote inline, 2 lines at the slot's size. Built: the subtitle alone, one line, with 13–14 code points (implementation record items 1–2) |
| `arena-first` | 2 lines at 10 px / 1.7 (`scene-navigation.css:118`), about 24 characters a line | label and 27 characters, 2 lines |
| `world-level` | Subtitle, 1 line at 11 px (12 px wider; `scene-navigation.css:61,113`) with 3 px letter-spacing (`adventure.css:54`) | 1 line at 11 px with letter-spacing 0: 20 code points plus the seal (2026-10-21 copy). Measured: one line, 17.6 px against the subtitle's 18.1, at every tested size in both engines |
| `bag-*` | the overview's figure row, about 37 px | 2 lines at 11 px / 1.6 (`guide.css`), about 35 px |
| `market-printing` | the WX-01 copy column, about 141 px wide (offer padding 12 px, grid `91px minmax(0,1fr)` with a 14 px gap, `scene-navigation.css:114`), p at 11 px / 1.7, about 12 characters a line: 3 lines | 29 code points, 3 lines |
| `quests-why` | `.daily-gift > p` at 10 px in the quests dialog (`navigation.css:139`), 1–2 lines beside the reward figure | 26 code points, 2 lines. Built: 13 code points, 1 line (implementation record item 2) |
| `fire-mountain` | 3–4 lines at 11 px (`expansion.css:96`) | 40 code points (37.5 display units: `+2` and `8` are ASCII), ≤ 3 lines; the slot's own description is 42 code points |

The 9 px `!important` rule for `.destination-panel .panel-footnote` on phones
(`adventure.css:202`) no longer matters: no hint uses that footnote.

### 2.5 Left out, and why

- **旅程存檔 (native).** D2's prompts already speak at the moment that
  matters, the first win and the first pack, with their store-build wording
  (save-ui.mjs `saveNoticeMarkup` with `cloud: false`). The 旅程存檔 dialog
  opens with its own footnote. Another hint would repeat both.
- **圖鑑, 旅程閣, card pages and inheritance.** Each already teaches in place,
  and the earlier gap review rated them adequate.
- **`arena-modes`** (the first draft's #3): see §2.3.
- **A "where next" hint on the first match result.** It would sit on D3's
  勝負已定 page. T1 keeps D3 frozen, so this is open question 8.

---

## 3. Glossary (詞彙)

### 3.1 Where it lives

**Today the rules dialog is paged but has one module.**

- `scene-dialogs.mjs:85-92` (`rules()`) makes one module, 弈道
  (`data-viewport-module="rules"`).
- It pages the four rules and the `.rules-note` as a list
  (`data-viewport-list="rules"`) and puts the intro `<p>` above them, outside
  the list (`:89`), so the intro keeps its height on every page.
- With one module, the viewport hides the tab row
  (`viewport.mjs:180`, `tabs.hidden = modules.length < 2`).

**T1 adds a second module, 詞彙.** The tab row then appears with two tabs,
弈道 and 詞彙, about one 44 px row plus a gap. To pay for it, the intro `<p>`
moves into the paged list as its first item, so paging absorbs the tab row on
every page instead of shrinking the list frame. §7.2 measures the dialog at
every portrait size and on the landscape sizes against `main`.

The changed `rules()`:

```js
function rules(anchor) {
  heading(anchor); fixedActions(anchor);
  const rules = anchor.querySelector('.rules-grid'), note = anchor.querySelector('.rules-note');
  // T1 (docs/TUTORIAL-T1.md §3): the intro is the list's first item, so paging absorbs the tab row.
  const intro = children(anchor).filter(node => node.tagName === 'P' && !node.matches('.rules-privacy'));
  rules.prepend(...intro); if (note) rules.append(note);
  const privacy = anchor.querySelector(':scope > .rules-privacy'); if (privacy) rules.append(privacy);
  section(anchor, 'rules', '弈道', [paged(rules, 'rules')]);
  // The glossary is the second module; opened at a term, it is the default.
  const glossary = anchor.querySelector(':scope > .glossary-list');
  if (glossary) {
    const words = section(anchor, 'glossary', '詞彙', [paged(glossary, 'glossary')]);
    if (glossary.dataset.open === 'true') words.dataset.viewportDefault = 'true';
  }
  finish(anchor);
}
```

(`.rules-privacy` is rendered only once `PRIVACY_URL` is set, `app.mjs:833`;
it becomes the list's last item.)

**`rulesModal({ term = null } = {})`** in `app.mjs:834-842`:

- It renders `glossaryMarkup({ open: term })` after `.rules-note`.
- **Heading.** `heading()` pins the eyebrow and `h2` above both tabs
  (`scene-dialogs.mjs:26-28`), so a dialog opened at a word must not sit
  under a duel-rules title:
  - without a term (and in battle): THE ART OF THE DUEL /
    「入局，先知取捨。」, unchanged;
  - opened at a term: WORDS ON THE ROAD / 「識其名，知其用。」 (proposed;
    the copy goes to Yu, open question 2).
- It opens as `modal(content, 'rules-dialog', true, 'rules')`. Today the kind
  is `null`, which shares the viewport key `modal-dialog` with other dialogs.
  With its own kind, its module and page memory are its own.
  - `prepareDialog` still reaches `rules()` through `.rules-grid`.
  - `refreshOverlay` and `dismissModal` treat the kind as before.
  - Its Back signature becomes `modal:rules`. back-smoke classifies dialogs
    by their DOM (`.rules-grid`, `tools/back-smoke.mjs:179`), and the only
    `modal:dialog` assertion (`tests/nav-stack.test.mjs:600`) is for the
    inspect dialog, so neither is affected.
- **The fixed action:**
  - in battle, 明白，返回對局 (`close-modal`, unchanged);
  - opened at a term, 明白了 (`close-modal`): the player came to read a
    word, not to start a match (open question 7);
  - otherwise, 知其道，入其局 (`rules-start`, §1).
- **Which tab it opens on:**
  - Without a term, it calls `viewport.forget('modal-rules')` first
    (`viewport.mjs:270`), so 弈道 always opens on its own first page, even if
    the player last left the dialog on 詞彙.
  - With a term, the glossary module is the default
    (`data-viewport-default`, `viewport.mjs:210-216`). In a
    `requestAnimationFrame` registered after `modal()`'s own
    `focusDialogStart` frame, it calls
    `viewport.revealElement(overlay.querySelector('[data-glossary-term="…"]'), { focus: true })`
    (`viewport.mjs:251-267`). That opens the page holding the term and moves
    focus there; registered later, it runs after `focusDialogStart`, so it
    keeps the focus.
- **Where it opens from:**
  - The lobby link, the 旅程閣 tools and the native 旅程存檔 dialog
    (`save-ui.mjs:52`) open 弈道.
  - The header resources open 詞彙 at a term (§4).
  - Battle's 弈道 button opens 弈道. Its 詞彙 tab is then one tap away,
    which matters for 減力, 減攻 and 封鎖 during a match.

### 3.2 Terms

There are 20 entries in three groups. Each definition is at most 40 display
units, counted as: a printable ASCII character (U+0020–U+007E) is ½; every
other code point is 1, including CJK, full-width punctuation and the symbols
× − – ／ ·. At the dialog's 12 px text in its content box at 302 px (about
258 px: the backdrop's 8 px and the dialog's 14 px padding,
`scene-content.css:15`), 40 units fit 2 lines (measured by §7.2). Numbers
come from constants or data where they exist (§5.3). The sources are at
`3f3d351`.

| id | Term (title) | Definition | Source |
| --- | --- | --- | --- |
| `coins` | 金幣 | 開秘匣、購卡與修練所用；遊歷、擂台、火焰山勝、任務手札與寄售可得，切磋不得。 | Start 1,200: `progression.mjs:137`. Spent on packs, boxes, market, buyback, 修練 and training: `:334,349,376,483,510,550,559`. Earned: expedition win or not (`:646`), arena win or not (`:670`), fire-mountain wins only (`:769`; a loss pays nothing, `:793`), the 朝露 gift, tasks and the 三戰 chest (`:73-84`), sales (`:493`). No practice branch in `finishBattle` |
| `dust` | 靈砂 | 修練戰卡所需，與金幣同付（見「修練」）；遊歷勝、擂台、火焰山勝與任務手札可得。 | `getUpgradeCost` `progression.mjs:533-538`. An expedition loss or draw pays 0 靈砂 (`:646`); the arena pays 3 or 1 (`:670`); a fire-mountain win 3 (+2 from the gift roll) (`:769-775`); gift, tasks and chest (`:73-84`). The only 靈砂 spends are 修練 and training (`:550,559`) |
| `xp` | 修為 | 執令者的旅途閱歷，累積決定其 Lv；遊歷、擂台、火焰山勝與任務手札可得。 | `addReward` `progression.mjs:266-268`. Expedition win or not (`:646`), arena win or not (`:670`), fire-mountain wins (`:769`), gift, tasks and chest (`:73-84`). Used only by `getHeroLevel` (`:839-841`). Shown as 修為 in 旅程閣 (`account-ui.mjs:13`) and in the import comparison (`save-ui.mjs:119`); before 2026-10-21 both said 「旅途歷練」 and this entry added 「又稱旅途歷練」. 歷練 names card EXP only (`backpack-ui.mjs:28,112`; open question 4, answered) |
| `hero-level` | 執令者 Lv | 由修為而定：滿 100 為 Lv.2、400 為 Lv.3、900 為 Lv.4，如此類推；不加戰力。 | `getHeroLevel` = 1 + ⌊√(修為/100)⌋, `progression.mjs:839-841`, no cap; nothing in battle reads it |
| `cache` | 秘藏 | 主線與故事各境，每日首勝另得一份秘藏：金幣、靈砂與修為；續卷沒有。 | `progression.mjs:660-664` (`!node.campaign`, once per node per day); `dailyReward` `:71`, `stories.mjs:51`; 續卷 nodes have none (`campaign-content.mjs:114`) |
| `stars` | 星數 | 角色 2–5 星；每套合計不超過 25 星。首回合手上四張星多者先手；同攻時低星勝。 | Range from `CARDS` (2–5 at `3f3d351`, rendered from data); `RULES.starLimit` `engine.mjs:12`; first player `:177-179`, comparing the two drawn hands of `RULES.rounds` cards (`drawHand` `:143-151`), not the decks' totals; attack tie `:256-259`; rule 02 `app.mjs:837` |
| `card-level` | 修練（戰卡 Lv） | Lv.1–5：歷練夠即升級；或修練，付現有等級 ×120 金幣、×6 靈砂；加成只在遊歷。 | `XP_THRESHOLDS` level up automatically (`collection.mjs:9,87-92`); `getUpgradeCost` uses the current level: Lv.1→2 costs 120 and 6 (`progression.mjs:533-538`); `LEVEL_BONUSES` `engine.mjs:88`, applied only in expeditions (`:115-121`) |
| `card-exp` | 歷練（卡牌 EXP） | 出過牌的自有卡得：遊歷勝 20、和或敗 12，擂台、火焰山 12／8；同名傳承亦可灌注。 | `progression.mjs:683-688`; `awardInstanceXP` `collection.mjs:325-339`. Practice gives 0; borrowed decks give none (`expansion-ui.mjs:50`). 同名傳承 gives the target 80 plus each material's EXP (`inheritance.mjs:6,71,88`; `backpack-ui.mjs:109`) |
| `journal` | 同行記 | 每張卡的履歷：編號、畫作、相逢緣由、對弈記錄與歷練；藏卡中展開角色，點卡面即見。 | `instanceMarkup` `backpack-ui.mjs:112` (卡牌編號, 畫作版本, 入藏日期, 相逢緣由, 對弈記錄). In the default grouped layout a card opens its character (`bag-open-group`), whose cards open the passport (`instance-inspect`) |
| `rarity` | 品階 · 凡品／靈品／神品 | 收藏稀有度：影響開匣機率與商旅價錢，不改變星數、力量與傷害。 | `RARITIES` (weight, buy and sell prices) and the comment at `progression.mjs:35-40` |
| `printing` | 畫作 · 本畫／異畫等 | 同一角色的不同畫作，只改外觀，不改星數、能力與品階；領契可作洞府肖像。 | `PRINT_TREATMENTS` `card-presentation.mjs:6-12` (the title names the first two, as the `market-printing` hint does, so it stays one line at 302 px; §3.3); `pack-ui.mjs:32`; leader portrait `backpack-ui.mjs:110` |
| `seals` | 西行印 | 每開一匣西行秘匣得 1 印，七日弈緣另得 5 印；可換指定特別畫作，不過期。 | +1 per pack, box pack and ticket: `progression.mjs:344,391,821`. Weekly `:81,311`. Costs `wx01-pack.mjs:7`. 「保留的印不會到期」 `pack-ui.mjs:32` |
| `tickets` | 西行秘匣券 · 秘券 | 免金幣開一匣西行秘匣。續卷每卷終章首勝、火焰山每週第 1 與第 3 次全通各贈一張。 | Each of the six volume finals (`volumeFinal: order === 7`, `campaign-content.mjs:115`), first clear: `progression.mjs:699`. Fire mountain weekly: `:786`. Opening: `:811-822`. The game's own line: 「續卷每卷終章贈一券」 `expansion-ui.mjs:73`; 「券不過期」 `:73` |
| `initiative` | 先手 | 首回合四張星數合計高者先手，同則隨機，其後輪換。先手先亮卡；攻、星皆同則先手勝。 | `engine.mjs:176-179` (the two drawn hands of `RULES.rounds` cards, `drawHand` `:143-151`; equal sums: random), `:254-262,304`; rules note 「相同則隨機」 `app.mjs:840`; rule 04 `:839` |
| `pills` | 仙丹 | 每局 12 顆，暗中分給四回合；攻擊＝力量 ×（1＋所用仙丹）。火焰山勝後至少補至 8。 | `RULES.pills` `engine.mjs:12`; attack `:235`; rule 01 `app.mjs:836`; after a fire-mountain win the run's pills are `max(8, pills)` (`progression.mjs:791` at `3f3d351`, now `ACTIVITY_PILL_FLOOR`; `expansion-ui.mjs:47`), so 「沿用」 alone would have hidden the top-up. 怒擊's 「丹」 is this |
| `resonance` | 共鳴（同族共鳴） | 抽出的四張中，有兩位不同的同族角色，該族加成便啟動；出過的卡仍計。 | `hasFactionBonus` `engine.mjs:193-198` (the hand includes used cards); rule 03 `app.mjs:838` |
| `fury` | 怒擊 | 另付 3 丹；贏得該回合時傷害 +2。不加攻擊。 | `RULES.furyCost` and `furyDamage` `engine.mjs:12`, applied at `:236` |
| `block` | 封鎖 | 令對手的角色技能失效，不影響同族共鳴；雙方都封鎖時一同生效。 | `engine.mjs:231-233`; ability text `:28,40,50` |
| `power-down` | 減力 | 對手力量 −N（最低 1），在仙丹倍率之前計算。例：迷渡、離間。 | `engine.mjs:234`; 渡影 `:35-36`, 貂蟬 `:67-68`, whose ability text says 「在仙丹倍率之前計算」 |
| `attack-down` | 減攻 | 計算仙丹倍率後，對手攻擊 −N（最低 1）。例：空城、月隱的月蝕。 | `engine.mjs:235`; 諸葛亮 `:63-64`; `FACTIONS.moon` `:18` |

減力 and 減攻 are the two terms the game used without defining: in the rules
note (`app.mjs:840`), in the formula's 預計 sentence
(`battle-teaching.mjs:130`), and in ten 續卷 tactical notes (for example
`campaign-content.mjs:20,47,74`). 封鎖 is also defined in each blocking
card's ability text. The glossary gathers all three in one place.

Not added: 同名傳承 and 借牌. Each is explained where it appears (the
passport's 同名傳承 entry, 「每張素材提供 80 ＋ 原有 EXP」; the 續卷 notes and
火焰山's rules for 借牌), and `card-exp` now points to 同名傳承.

### 3.3 Markup and style

`glossaryMarkup({ open })` renders this:

```html
<div class="glossary-list" data-glossary data-open="true|false">
  <article class="glossary-term" data-viewport-id="term-coins" data-glossary-term="coins"
           tabindex="-1" aria-labelledby="glossary-term-coins">
    <h3 id="glossary-term-coins">金幣</h3><p>開秘匣、購卡與修練所用；…</p>
  </article>
  …
</div>
```

- The order is 旅途 (`coins`, `dust`, `xp`, `hero-level`, `cache`), then
  卡牌 (`stars`, `card-level`, `card-exp`, `journal`, `rarity`, `printing`,
  `seals`, `tickets`), then 對弈 (`initiative`, `pills`, `resonance`, `fury`,
  `block`, `power-down`, `attack-down`).
- There are no group headings or group eyebrows: a heading would become a
  list item of its own, and an eyebrow costs a line per term.
- Each term is a list item, so the pager keeps every term reachable at any
  height.

Glossary rules in `guide.css` (`.scene-dialog .dialog-module>p` does not reach
these nested paragraphs, and `.rule h3`/`.rule p` do not match them):

- `.scene-dialog .glossary-term h3{font:15px/1.4 var(--serif);color:var(--gold);margin:0 0 3px;letter-spacing:1px}`
- `.scene-dialog .glossary-term p{font-size:12px;line-height:1.7;margin:0}`
- `.scene-dialog .glossary-term:focus-visible{outline:2px solid var(--gold);outline-offset:2px}`

Every title fits one line at 302 px, and every definition two. The pager
sizes every row by its tallest item (`viewport.mjs` `measurePageCapacity`),
so one two-line title costs every page of 詞彙 a term: with all five of
畫作's names the title wrapped at 302 and 320 px and 詞彙 took 7 pages there
instead of 4 and 5. The 畫作 title therefore names 本畫 and 異畫 and ends in
等; §7.2 measures both limits.

---

## 4. Tappable header resources

`gameHeaderMarkup` (`navigation-ui.mjs:26-27`) changes as follows:

- The resource wrapper becomes
  `<div class="game-header-resources wallet" role="group" aria-label="旅途所得">`.
  Today it has an `aria-label` but no role, so the label is not reliably
  exposed.
- Each resource keeps its `<span>` (so `.wallet>span` and
  `.game-header-resources>span` keep their breakpoints: `adventure.css:7-8,198`,
  `navigation.css:11,163`) and drops its `title`. Inside, it holds a button
  whose accessible name starts with the visible text (WCAG 2.5.3):
  ```html
  <span><button type="button" class="game-resource" data-action="glossary" data-id="coins"
        aria-label="1,200 金幣，查看說明"><span aria-hidden="true">◈</span> <b>1,200</b><small>金幣</small></button></span>
  ```
  The `dust` button is the same with ✧ and 靈砂.
- `執令者 · Lv.N` (`:27`) becomes
  `<button type="button" class="game-player-level" data-action="glossary" data-id="hero-level" aria-label="執令者 · Lv.N，查看說明">`.
  It keeps its class, so the rule that hides it below 1,051 px
  (`navigation.css:154`) still applies.
- `guide.css`:
  - `.game-shell .game-header .game-resource` and
    `.game-shell .game-header .game-player-level` get `min-width:44px`,
    `min-height:44px`, `display:inline-flex`, `align-items:center`,
    `gap:inherit`, `padding:0 2px`, `border:0`, `background:none`, and
    `color`, `font` and `letter-spacing` set to inherit.
  - Each gets a visible gold `:focus-visible` outline.
  - At 302 px the header holds the 44 px brand mark (`viewport.css:38`),
    the resources, the 44 px 旅程閣 or 存檔 button and the 44 px ☷ button
    (`scene-navigation.css:123-125`), with 10 px gaps. That leaves about
    116 px for the two resources; with 2 px padding they need about 114 px
    (an estimate, tight; `test:shell` and `test:guide` measure it, on both
    builds).
- **Phones and Lv.** Lv is hidden in the header below 1,051 px, and the
  lobby's 「執令者 Lv.N」 kicker is 9 px text in a row whose height must not
  change. A real 44 px target there would grow the row. On phones, Lv is
  therefore reached through 詞彙, whose 旅途 group puts 執令者 Lv beside
  金幣, 靈砂 and 修為 (open question 6).
- `app.mjs` dispatcher, beside `rules` at `:1484`:
  `if(action==='glossary'){button.focus({preventScroll:true});return rulesModal({term:id});}`.
  - The explicit focus mirrors the `inspect` branch (`:1489`): WebKit does
    not focus a tapped button, and `modal()` records `lastFocus` from
    `document.activeElement`.
  - With it, closing the dialog or Back returns focus to the resource.

---

## 5. State and module design

### 5.1 `first-visit.mjs` (new, pure)

It follows the pattern of `battle-teaching.mjs`. It has no DOM, no randomness,
no profile writes and no storage of its own: its memory is handed a storage
object. It imports only pure modules: `engine.mjs` (`RULES`),
`collection.mjs` (`MAX_DECK_SLOTS`, `getActiveDeck`) and `progression.mjs`
(`getExpansionSummary`, `isNodeUnlocked`, `NODES`).

```js
export const GUIDE_KEY = 'shanhai.guide.v1';
export const FIRST_EXPEDITION = 'mist-gate';
export const NEWCOMER_BATTLES = 10;                    // open question 11
export const isFirstVisit = profile => …;              // §1.4
export const isNewcomer = profile => profile?.stats?.played < NEWCOMER_BATTLES;
export function rulesStartRoute(profile) { … }         // §1.4
/** The screen channel's visit key (§2.1 item 6): the screen, or bag-cards / bag-decks. */
export const guideScreenKey = (screen, bagTab) => screen === 'bag' ? `bag-${bagTab === 'decks' ? 'decks' : 'cards'}` : screen;
/** The highest card level in the active deck, 1 if none (world-level's condition). */
export function activeDeckTopLevel(profile) { … }
/** The registry of §2.3, frozen: { id, channel: 'screen'|'dialog', scene(key) → boolean,
 *  slot: { replace: selector, remove: [selectors], requires: selector|null },
 *  voice: 'guardian'|'narrator', lasts: 'visit'|'condition', when(ctx) → boolean, copy(ctx) → string }. */
export const GUIDE_HINTS = Object.freeze([ … ]);
/** The dialog kinds that have hints ('quests', 'activity'): fitOverlay skips every other kind. */
export const GUIDE_DIALOG_KINDS = Object.freeze([ … ]);
/** Hints whose scene and condition hold. ctx = { profile, key, selectedNode, coachSeen } is
 *  read only; no condition writes or throws on a hydrated profile. */
export function guideHints(ctx, channel) { … }
/** The hint's inner markup: one <span class="guide-hint-body"> holding the sr-only prefix,
 *  the seal or the guardian's label, and the escaped text. No control, no focusable
 *  element, and no b, i or small (§5.4). */
export function hintMarkup(hint, ctx) { … }
export function createGuideMemory(storage) { … }       // §5.2
```

`isFirstVisit`, `isNewcomer`, `rulesStartRoute` and `GUIDE_HINTS` are the only
places those rules live. `navigation-ui.mjs:57` imports `isFirstVisit`.

### 5.2 `shanhai.guide.v1`: schema and memory

The key holds device-local JSON, beside `shanhai.coach.v1` and
`shanhai.experience.v1`:

```json
{"seen":["bag-copies","quests-why"],"off":true}
```

- **`seen`:** ids of *visit* hints already recorded, as sorted unique
  strings. Unknown ids that look like ids (`/^[a-z0-9-]{1,40}$/`, at most 64
  of them) are kept, so an older build never drops a newer build's record.
- **`off`:** present (`true`) only while the player has turned hints off.
- **What it is never part of:** the profile, `PROFILE_VERSION`, a battle
  snapshot, an export, a cloud backup or the native mirror.
  - The mirror copies only `PROFILE_KEY` (`native-shell.mjs` and
    `mirroredStorage`).
  - Nothing in the code enumerates `shanhai.*` keys, so no export or backup
    can pick it up.
- **Not fenced:** it is not journey data, so it needs no profile lock or
  IndexedDB fence.

`createGuideMemory(storage)` returns the methods below. Every read goes to
storage and is merged with the page's own copy, as `createCoachMemory` does
(`battle-teaching.mjs:288-327`).

| Method | Behaviour |
| --- | --- |
| `enter(channel, key)` | Returns a visit token for `'screen'` or `'dialog'`. The token changes only when `key` differs from that channel's last key. |
| `leave(channel)` | Ends the channel's visit (the next `enter` starts a new one). |
| `select(hints, token)` | `[]` while `off`, or while `token` is quiet (below). Otherwise returns the hints to place: a *condition* hint always; a *visit* hint that is unseen, or pinned to this token. |
| `shown(ids, token)` | Called only by the recording check (§2.1 item 7). Each *visit* hint among `ids` is recorded as seen and pinned to `token`, so it stays for the rest of this visit. Writes once, only if something changed. *Condition* hints are never written. A stale token (its channel has moved on) records nothing. |
| `enabled()` | Whether hints are on. |
| `setEnabled(on)` | Off: records `off` and drops all pins. On: clears `seen` and `off`, and marks each channel's current token quiet, so nothing appears in the visits already in progress; hints return from each channel's next visit. |

**Fail-safe:**

- A `getItem` or `setItem` that throws (private mode, blocked site data, a
  full disk), corrupt JSON, or a non-object value is treated as an empty
  record. The page's own copy then keeps working for the life of the page,
  and nothing throws into `render()`.
- The worst case is that a retired *visit* hint shows once more after a
  reload, as the coach's marks do when storage is lost; the newcomer gate
  (§2.1 item 5) bounds it to the first ten battles.

**When writes happen:** only (a) when a *visit* hint passes the recording
check, and (b) when the switch changes. Neither happens in battle: no hint
has the battle screen as its scene, no dialog opened in battle (rules,
round and match results, 聲息與節奏) has hints, and the switch's row is not
offered in battle (§5.6). That keeps coach-smoke's `teaching()` check true:
during teaching actions only `shanhai.coach.v1` is written
(`tools/coach-smoke.mjs:328-338`).

### 5.3 `glossary.mjs` (new, pure)

```js
export const GLOSSARY = Object.freeze([{ id, term, group: '旅途'|'卡牌'|'對弈', text }, …]); // §3.2
export const GLOSSARY_IDS = Object.freeze(GLOSSARY.map(entry => entry.id));
export function glossaryMarkup({ open = null } = {}) { … }  // §3.3; an unknown `open` is ignored
```

**Numbers that come from constants or data:**

- 怒擊 uses `RULES.furyCost` and `RULES.furyDamage`; 仙丹 uses `RULES.pills`,
  `RULES.rounds` and `ACTIVITY_PILL_FLOOR`; 星數 uses `RULES.starLimit` and
  the star range of `CARDS`; 星數 and 先手 name the hand as
  `RULES.rounds` cards (四張).
- 品階 names use `RARITIES[*].name`.
- 畫作 names use the first two `PRINT_TREATMENTS[*].name`.
- 執令者 Lv thresholds are `100 × (Lv − 1)²` for Lv.2–4, the inverse of
  `getHeroLevel`.

**Numbers with no constant**, written out and checked by §7.1 against the
functions themselves: upgrade costs 120×L and 6×L; card EXP 20/12 and 12/8;
seals +1 per pack and 5 weekly.

### 5.4 Placement adapter in `scene-adapters.mjs`

`scene-adapters.mjs` is already the home of presentation-only DOM restructuring.
The DOM side of T1 lives there, so `app.mjs` carries only short hooks.

```js
/** T1 (docs/TUTORIAL-T1.md §2): each hint replaces its slot with an element of the same tag
 * and classes, plus `guide-hint`, role="note" and data-guide-hint; the slot's other nodes are
 * removed. Idempotent: a hint already in `root` counts as placed. A missing slot, or a
 * `requires` that does not match, places nothing. A re-render restores the slot.
 * Tolerates null nodes. Returns [{ id, node }] for the hints placed. */
export function placeGuideHints(root, entries /* [{ hint, html }] */) { … }
/** The ids among `placed` that can be seen now: connected, not inside [hidden], with client
 *  rects. A node without getClientRects (a test stub) counts as not visible. */
export function visibleGuideHints(placed) { … }
```

- §7.2 asserts each hint is placed in its scene, so a missed slot cannot pass
  unseen.
- `fitOverlay` runs again without new markup (the pack controller's
  `onLayout`, `app.mjs:709`; the inheritance refresh, `:935`), so idempotence
  matters: no slot is ever replaced twice, and a slot selector that matches a
  hint already placed (`.daily-gift > p`) is not replaced again.

**Per-slot CSS in `guide.css`.** Every hint's inner markup is one
`<span class="guide-hint-body">` (§5.1), with no `b`, `i` or `small`, so the
slots' descendant and sibling rules cannot restyle it:

- **The bag's `.bag-overview`.** It is a flex row of stacked figures, and its
  child rules are strong: `.scene-surface .bag-overview>span+span`
  (0,2,2; `scene-content.css:4,14`), `.bag-overview>span+span` (border-left,
  `backpack.css:8`), `.scene-surface .bag-overview>span` (0,2,1) and
  `.bag-overview b/i/small` (`backpack.css:9-11`). With a single child,
  `span+span` never matches; the rest is beaten at (0,3,0):
  - `.scene-surface .bag-overview.guide-hint{display:block}`
  - `.bag-overview.guide-hint>.guide-hint-body{display:block;padding:0;border:0;text-align:left;font-size:11px;line-height:1.6;letter-spacing:0;color:var(--muted)}`
- **`world-level`'s subtitle** drops the slot's 3 px letter-spacing and gold:
  `.scene-world .destination-panel .destination-subtitle.guide-hint{letter-spacing:0;font-size:11px;line-height:1.6;color:var(--muted)}`
  (0,4,0, above `.scene-world .destination-subtitle`).
- Every other slot is text and keeps its own rules.
- `.guide-hint-seal` is the small gold 「初見」 box at `font-size:1em` (never
  smaller than the text) and `.guide-hint-voice` the gold 守渡弈者 label,
  both inline.
- There is no animation or transition (§6).

guide-smoke checks the computed result (§7.2).

### 5.5 Every touch point

**`app.mjs`.** The r1 and PR #17 lines named in §9 are the likely conflicts.

1. **Imports.** Add after `:42`, each on one line with named imports only
   (r1's controller test reads them with a one-line pattern, §9):
   - `import { createGuideMemory, guideHints, guideScreenKey, hintMarkup, rulesStartRoute, GUIDE_DIALOG_KINDS } from './first-visit.mjs';`
   - `import { glossaryMarkup } from './glossary.mjs';`

   `:38` gains `placeGuideHints, visibleGuideHints`. Do not touch the
   `account-client.mjs` and `account-ui.mjs` import lines (`:19,21`):
   `NATIVE_EDITS` must match each exactly once.
2. **Memory and helper.** Beside `coachMemory` (`:446`):
   - `const guide=createGuideMemory({getItem:…,setItem:…})`, built the same
     way as `coachMemory`.
   - `applyGuide(root,channel,key)`, a few lines that:
     1. return a no-op at once for a dialog kind not in `GUIDE_DIALOG_KINDS`;
     2. build `ctx` (`{profile,key,selectedNode,coachSeen:coachMemory.seen()}`)
        and call `guide.select(guideHints(ctx,channel),token)` and
        `placeGuideHints(root,…)`;
     3. return a function that schedules the recording check (§2.1 item 7):
        two nested `requestAnimationFrame`s, then
        `guide.shown(visibleGuideHints(placed),token)` if the page is visible
        and, for the screen channel, `!app.inert`. A screen placement that
        fails only because a dialog is open is kept as the pending one.
   - `retryGuide()`: runs the same check on the pending screen placement.
3. **`render()`** (`:586-611`):
   `const guideCommit=applyGuide(app,'screen',guideScreenKey(screen,bagView.tab));`
   between `app.innerHTML=…` and `prepareScene(…)`, then `guideCommit();`
   right after `viewport.refresh(…)`.
4. **`fitOverlay()`** (`:657-663`): the same for the dialog,
   `applyGuide(dialog,'dialog',modalKind)` before `prepareDialog`/`preparePack`,
   and its commit after `viewport.refresh`. `refreshOverlay` (quests,
   activity) reaches it through `fitOverlay`.
5. **`closeModal()`** (`:621-633`): `guide.leave('dialog');retryGuide();`
   beside `modalKind=null`, not on the function's first line (§9).
6. **`experienceSettingsModal()`** (`:685-694`): one field row, omitted when
   `screen==='battle'` (§5.6).
7. **The `change` listener** (`:1517`): a `guide-hints` branch (§5.6).
8. **`rulesModal()`** (`:834-842`): `{term}`, `glossaryMarkup`, kind
   `'rules'`, the two headings, the three fixed actions,
   `viewport.forget('modal-rules')`, and the reveal frame (§3.1).
9. **Dispatcher:**
   - `:1484` area: `glossary` branch (§4);
   - `:1486`: `start` and `rules-start` split (§1.4).

**UI modules:**

- `navigation-ui.mjs:26-27`: the header buttons and group role (§4).
- `navigation-ui.mjs:57`: `isFirstVisit`.
- `scene-dialogs.mjs:85-92`: the intro in the list and the 詞彙 module (§3.1).
- `scene-adapters.mjs`: `placeGuideHints` and `visibleGuideHints`.

`adventure-ui.mjs`, `backpack-ui.mjs`, `expansion-ui.mjs`, `mist-gate-ui.mjs`,
`battle-*.mjs` and `nav-stack.mjs` do not change: slots are found by selector.

**Other files:**

- New: `first-visit.mjs`, `glossary.mjs`, `guide.css`,
  `tests/first-visit.test.mjs`, `tests/glossary.test.mjs` and
  `tools/guide-smoke.mjs`.
- Edited:
  - `index.html`: `<link rel="stylesheet" href="guide.css">` after
    `battle-teaching.css`.
  - `hosting/public-assets.json`: three entries.
  - `package.json`: a `test:guide` script right after `test:coach`.
  - `progression.mjs` (review fixes): one export, `ACTIVITY_PILL_FLOOR`,
    which `settleActivity` uses in place of its literal 8 and 仙丹 and the
    `fire-mountain` hint read. No profile, schema or rule change.
  - `tools/coach-smoke.mjs` (§1.5) and the documents in §1.5 and §9.

### 5.6 The switch in 聲息與節奏

The switch is the only control T1 adds besides the header buttons.

- **Row.** After 揭曉節奏 in `experienceSettingsModal()`, outside battle only:
  `<label class="experience-field"><span>初見提點<small>入門期間，重開可再看</small></span><input id="guide-hints" type="checkbox" ${guide.enabled()?'checked':''}></label>`.
  In battle (☷ in the battle header, `navigation-ui.mjs:23`, and over the
  reveal) no hint can show, so the row is left out and nothing about hints is
  written there.
- **Caption.** It names the bound the switch works within, because turning
  it back on clears `seen` but does not lift §2.1 item 5: hints return only
  for a newcomer (the first `NEWCOMER_BATTLES` battles; `bag-decks` and
  `market-printing` only while their own signals hold; `fire-mountain` until
  a run is started). 「可再看」 rather than 「會再看一次」, since not every
  hint comes back, and no 「一行」, since some hints take three lines. A
  save past the bound sees none after switching back on; guide-smoke's
  veteran journey asserts the caption and that. Offering the row only while
  a hint could still apply would change behaviour: open question 10.
- **Turning it off:** `guide.setEnabled(false)`, then `render()`. The scene
  behind the dialog loses its hint at once; `refreshOverlay` ignores
  `experience-settings`.
- **Turning it on:** `guide.setEnabled(true)` without a render. The visits in
  progress stay quiet (§5.2), so no hint appears in the scene behind the
  dialog, now or on a later render of the same visit. Hints show again from
  each channel's next visit, for a newcomer (§2.1 item 5).
- **Height.** The dialog is a paged list (`scene-dialogs.mjs` `settings()`)
  whose pager sizes every row by its tallest item (`viewport.mjs`
  `measurePageCapacity`). The row must therefore be no taller than 開啟聲音
  (71 px), so its caption is one line at every size: the first build's
  two-line caption made it 83 px, which cost every page a row (the review
  measured 430×932 going from one page to two). With one line, page 1 holds
  as many items as `main`'s at every size measured, and 430×932 is one page
  again. As the eighth item the row still adds a page where `main`'s seven
  just filled one: 360×780, 393×780 and 412×790 (2 against 1), and 734×343,
  640×360 and 568×320 (8 against 7). guide-smoke records the page counts
  against `main`; Yu accepted the extra page on 2026-10-21 (§8). Its
  「設定會記在此裝置」 footnote stays true.
- The checkbox's computed font size must stay ≥ 16 px, as N1 requires of
  every input. `tools/shell-smoke.mjs`'s `INPUT_IDS` should gain
  `'guide-hints'` once n2 has landed, since n2 edits that file (§9);
  until then guide-smoke checks it.
- For playtests: a fresh install per tester also starts with an empty
  `shanhai.guide.v1`, and turning the switch off and on replays the hints on
  one device for a journey still within the newcomer bound (§2.1 item 5).
  A save past `NEWCOMER_BATTLES` battles, such as a long TestFlight save,
  sees none except `fire-mountain` while no run has been started.

---

## 6. Accessibility, motion, Back, native and web builds

**Hints:**

- Each hint is `role="note"` on the slot's own element, in reading order,
  with an sr-only 「初見提點：」 prefix (`.sr-only`, `styles.css`).
- It is not live, takes no focus, and has no `aria-label` that would hide
  its text.
- The guardian's label is visible text.
- Colour is the slot's own (or the muted text colour where §5.4 resets it),
  plus the gold seal or label, which the existing palette already uses for
  text.
- Text is ≥ 10 px and never clipped (§2.1).

**Glossary:**

- The module tabs are the viewport's own (`role="tab"`, arrows, Home and
  End).
- Each term is an `article` named by its `h3`. Opening at a term focuses that
  term (`tabindex="-1"`, with a visible gold `:focus-visible` outline), so
  the screen reader reads the word and then its definition.

**Header:** 44 × 44 targets, names that start with the visible text, and a
gold `:focus-visible` outline.

**Reduced motion:** hints and the glossary have no animation or transition of
their own. The viewport's existing page-arrival animation already honours
`prefers-reduced-motion` and `body[data-motion="reduce"]`
(`scene-content.css:35`). guide-smoke asserts it (§7.2).

**Back (D1):**

- Hints add no layer and no history entry (§2.1).
- The glossary is inside the rules dialog: one dismissible layer,
  `modal:rules`. Switching tabs is not a layer, as in every viewport dialog.
- Opening the glossary from the header pushes one entry on the tap, and
  Back closes it.
- The rules-first route's layers, from each origin, are in §1.3.

**Text scaling, VoiceOver and TalkBack:** not verified. They stay physical-
phone checks, as for D3. The M5.1 phone checklist gains two rows: the hints
read in order with their 「初見提點」 prefix, and a header resource opens 詞彙
with the term read first, under VoiceOver and under TalkBack.

**Native build:**

- The three new files ship in both builds. None imports `account-*`, and
  `NATIVE_EDITS` still matches exactly once (`tools/build.mjs:39-45`).
- `npm run build:native` must pass its reference and offline-name checks
  (`tools/build.mjs:114-127`).
- The store build gets the same hints, glossary and header, and the same
  rules-first route from its 旅程存檔 panel (§1.3). The 旅程存檔 button
  (`savesButtonMarkup`) keeps its place: `test:native` asserts it
  (`tools/native-smoke.mjs:122`).

**Web build:**

- `npm run build` must change only the intended files.
  - Added: `first-visit.mjs`, `glossary.mjs`, `guide.css` (92 → 95 public
    files).
  - Changed: `app.mjs`, `index.html`, `navigation-ui.mjs`,
    `scene-adapters.mjs`, `scene-dialogs.mjs`, and `release.json`'s
    manifest.
  - Every other asset's `sha256` stays the same.
- The native build adds the same three files (89 → 92).
- §7.3 is how to check it.

---

## 7. Test plan

### 7.1 Node (`npm test`)

**`tests/first-visit.test.mjs`**

- *Registry:*
  - 6–10 hints with unique ids (8 now);
  - each copy ≤ 40 code points for every `ctx` variant;
  - each has a channel, scene, slot, voice and lasts;
  - guardian copy is 「quoted」;
  - `GUIDE_DIALOG_KINDS` equals the dialog hints' kinds.
- *Conditions*, on real fixtures built with `createProfile`, `beginBattle`,
  `finishBattle`, `abandonBattle`, `startActivity` and `abandonActivity`:
  - fresh: `home-start`, `arena-first`, `bag-copies`, `bag-decks`,
    `market-printing` and `quests-why` hold; `world-level` does not on
    霧隱渡口 (建議 Lv.1, deck Lv.1).
  - after 霧隱渡口 is won: `home-start` and `arena-first` do not hold;
    `world-level` holds on 青玉森庭 (建議 Lv.2 above a Lv.1 deck) and stops
    holding once a deck card reaches Lv.2; `fire-mountain` holds.
  - a first battle begun, then abandoned: `home-start` holds again
    (`played` is still 0).
  - with a `pending` battle: `home-start` does not hold.
  - `fire-mountain`: stops holding with a run; also after a run started and
    abandoned before any result (`serial` 1, `lastResult` null, `clears` 0).
  - `bag-decks` stops holding with a second deck slot; `market-printing`
    after one WX-01 pack.
  - **Veteran:** a journey with `stats.played === 10` (and one fire-mountain
    run tried) gets no hint at all, on every scene and dialog; with no run
    ever started it gets only `fire-mountain`. One with 9 finished battles
    still gets the visit hints.
  - locked node: `world-level` does not hold.
  - copy variants follow `coachSeen`.
- *Keys:* `guideScreenKey('bag','cards')` and `('bag','decks')` give
  `bag-cards` and `bag-decks` whatever the layout or opened character;
  other screens give the screen.
- *Read-only:* evaluating every condition and copy on a deep-frozen profile
  neither throws nor changes its JSON.
- *`rulesStartRoute`:*
  - fresh: `{expedition, mist-gate}`; after a finished battle: practice;
    with a pending battle: practice; after an abandoned first battle:
    `{expedition, mist-gate}`.
  - Coupling with D3: `coachStart({ encounter: rulesStartRoute(fresh), played: 0, match })`
    starts at `'card'`.
- *Memory:*
  - an empty, corrupt, array or `null` record is empty;
  - a storage whose `getItem`/`setItem` throws: no throw, and the page-life
    memory still works;
  - writes go only to `GUIDE_KEY` (a spy storage), and only when something
    changed;
  - unknown ids are kept and malformed ones dropped;
  - visit semantics: `select`, then `shown`, records and pins; the same
    token shows it again, a new token does not; a stale token records
    nothing;
  - condition hints are never written;
  - `setEnabled(false)` gives nothing; `setEnabled(true)` clears `seen`, and
    `select` on the tokens current at that moment gives nothing until each
    channel's next `enter` with another key.
- *Markup:* `role` is added by the adapter, not the string. The string is one
  `guide-hint-body` span holding the sr-only prefix, the seal or label and
  escaped text; no `<button>`, `<a>`, `tabindex`, `aria-live`, `<b>`, `<i>`
  or `<small>`.

**`tests/glossary.test.mjs`**

- *Shape:* 18–22 entries (20 now) with unique ids; `coins`, `dust` and
  `hero-level` exist; each definition is ≤ 40 display units by the §3.2
  rule; `glossaryMarkup` gives one `data-viewport-id` and
  `data-glossary-term` per entry, `tabindex="-1"`, and `data-open` only for
  a known id.
- *Truth, against the engine and progression:*
  - 怒擊 text contains `RULES.furyCost` and `RULES.furyDamage`; 仙丹 contains
    `RULES.pills`; 星數 contains `RULES.starLimit` and the min and max of
    `CARDS`' stars;
  - `getHeroLevel` at 99, 100, 399, 400, 899, 900, 1,600 修為 gives 1, 2, 2,
    3, 3, 4, 5;
  - `getUpgradeCost` on a Lv.1 and a Lv.2 copy gives 120/6 and 240/12;
  - `finishBattle` gives these rewards:
    - expedition win: card EXP 20; loss or draw: card EXP 12, 靈砂 0, coins
      and 修為 > 0;
    - arena win 12, loss 8 card EXP, both with coins, 靈砂 and 修為;
    - a fire-mountain loss: no coins, 靈砂 or 修為; a win 60/3(+2)/30;
    - practice: no card EXP, coins, 靈砂 or 修為;
    - a borrowed deck (`route: 'loaner'`): no card EXP;
  - `previewInheritance` gives the target 80 plus the material's EXP;
  - `XP_THRESHOLDS` give automatic levels;
  - every `volumeFinal` node (six) adds one ticket on its first clear, and
    the fire mountain's first and third weekly clears add one each;
  - `buyPack({set:'wx01'})` gives +1 seal, and `WEEKLY_TASKS` 'matches'
    pays 5 seals;
  - a non-campaign node's first win of the day adds `dailyReward`
    (`reward.dailyCache`), a 續卷 node's does not;
  - `RARITIES` names appear; 畫作's title is the first two
    `PRINT_TREATMENTS` names and 等, the two the `market-printing` hint
    names;
  - a fire-mountain win settled at 9 life and 1 pill leaves the run at 11
    and `ACTIVITY_PILL_FLOOR`, and a leftover above the floor stays, as
    仙丹 and the `fire-mountain` hint say;
  - 先手 and 星數 name 四張, and a drawn hand is `RULES.rounds` cards;
  - `hasFactionBonus`:
    - two different same-faction names: true;
    - one: false;
    - a used card still counts;
  - `createMatch` with controlled hands: the higher star sum leads, equal
    sums follow the injected `rng`, and `resolveRound` alternates the lead;
  - 減力, 減攻 and 封鎖 through `resolveRound`:
    - 渡影 lowers the opponent's power by 1 before the multiplier;
    - 諸葛亮 lowers attack by 4 after it, to a minimum of 1;
    - 霜璃 blocks the ability but not resonance.
- *Header markup:* `gameHeaderMarkup` has `data-action="glossary"` buttons
  for `coins`, `dust` and `hero-level`, with aria-labels that start with the
  formatted visible text, no `title` on the resources, and `role="group"`.

**Existing suites that must still pass:** `tests/hosting.test.mjs`
(allowlist reachability), `tests/native-build.test.mjs`,
`tests/battle-teaching.test.mjs`, `tests/nav-stack.test.mjs` and
`tests/viewport.test.mjs`.

### 7.2 Browser

Run **one suite at a time** on a loopback `GAME_URL`
(`python3 tools/serve.py`, restarted after the allowlist change). Afterwards,
delete `test-results/*.png`, but keep `test-results/webkit-runtime`.

**New `tools/guide-smoke.mjs`** (`npm run test:guide`: Chromium as a Pixel 7
in installed Chrome, then WebKit as an iPhone 15):

- **Sizes**, portrait: 302×640, 320×568, 360×740, 360×780, 393×659,
  393×780, 412×790, 430×932, and with top and bottom insets 412×839 (48/34)
  and 393×852 (59/34), the sizes where item 18 flags
  ([NAVIGATION.md:428-436](NAVIGATION.md), RELEASE-NEXT §12 item 18) and
  shell-smoke's set. Synthetic saves; the clock and `Math.random` fixed as
  coach-smoke does. The bag scenes use the N1 fixture with every WX-01
  printing minted (as `tools/shell-smoke.mjs:58` and
  `tools/viewport-smoke.mjs:35` do).
- **Control pass:** each scene renders with `{"off":true}` and records:
  - the slot's boxes (replaced + removed, margins included);
  - the boxes of every later sibling of the slot and of every list frame
    in the surface;
  - in the lobby, the boxes of `.lobby-continue`, `.scene-lobby-companions`,
    `.lobby-ledger` and its rules link, and the dock's top;
  - every `[data-viewport-overflow="true"]` in the surface, its modules and
    its lists;
  - each list's `data-page-count`;
  - the number of controls in the surface.
- **Hint pass:** the same scene with no record. Assert:
  1. the hint is placed with `role="note"`, the replaced node is gone, and
     the removed nodes are absent;
  2. the hint's box, margins included, is ≤ the slot's total + 1 px;
  3. every recorded later sibling and list frame is at the same or a higher
     position with the same or a greater height (± 1 px); in the lobby the
     three nodes are no lower and stay above the dock;
  4. no new overflow flag, the same page counts, the same number of
     controls;
  5. active modules keep `scrollHeight ≤ clientHeight + 1`;
  6. no document scroll;
  7. computed style: the hint text and its seal or label are ≥ 10 px and
     the seal is not smaller than the text; no `line-clamp`, ellipsis or
     hidden overflow, and the hint's own `scrollHeight ≤ clientHeight + 1`;
     the bag hint's body has no border and its intended 11 px.
- **Behaviour:**
  - *visit* hints show for the whole visit and are gone on the next visit
    and after a reload;
  - in the bag, toggling 排列方式 and opening and closing a character keep
    the visit: the hint is back when the character closes, and recorded once;
  - **not recorded under a dialog:** from the lobby, in one task, tap the
    dock's 藏卡 and then an injected `data-action="rules"` button (the
    pattern of `tools/save-durability-smoke.mjs:712`); after two frames
    there is no record; after the dialog closes, `bag-copies` is recorded;
  - *condition* hints follow the profile;
  - the lobby with a locked node of another volume selected on a first
    visit shows no `home-start`, and keeps 「渡口首勝後，展開此卷」;
  - `fire-mountain` is not recorded while 牌組 is the open module;
  - placement is idempotent: re-running `fitOverlay` on the quests dialog
    leaves one `quests-why`;
  - the switch: off removes the hint in the scene behind the dialog; on
    shows nothing in the current visit, then a new visit shows hints again;
    the row is absent in battle; the checkbox's font is ≥ 16 px;
  - **veteran:** a 12-battle journey with a fire-mountain run tried shows no
    `[data-guide-hint]` on any scene or dialog, and `shanhai.guide.v1` is
    never written; its switch's caption starts 入門期間 and is one line, and
    after off then on it still sees no hint on 藏卡, 市集, 遊歷, 對弈 or
    洞府;
  - while browsing, only `shanhai.guide.v1` is written and the profile
    bytes never change;
  - no hint ever appears on the battle screen, and no write happens there.
- **Back:** the history depth (`history.state['mythseal.nav'].depth`) is the
  same with and without a hint. Back from a scene with a hint goes home as
  before.
- **Glossary:**
  - 金幣 and 靈砂 at each size, and 執令者 Lv at 1280×800, open the dialog
    on 詞彙 with that term on the current page and focused, under the
    term-mode heading.
  - Back closes the dialog and focus returns to the button.
  - The lobby's 弈道 link opens on 弈道 page 1, with the intro as its first
    item, even after the dialog was last left on 詞彙.
  - Each definition fits 2 lines, and each title 1 line, at 302 px; the
    glossary's page count is recorded at every size.
  - **The rules dialog against `main`:** at every portrait size above and at
    852×393 (with shell-smoke's iPhone side insets), 844×390 and 734×343,
    and, once n2 has landed, 667×375, 640×360 and 568×320: the `rules`
    module and list gain no `data-viewport-overflow="true"` that `main`
    does not have, and its list frame is not shorter than `main`'s.
  - **聲息與節奏 against `main`**, opened from the lobby at the same sizes:
    the 初見提點 row is no taller than `main`'s tallest setting, page 1 holds
    at least as many items as `main`'s, and the page counts are recorded.
    Without `main`, the row is still checked to be no taller than the
    tallest other setting.
- **Header:**
  - every header control is ≥ 44 × 44;
  - no two overlap, and taps across each one's width land on it (the same
    test as `tools/shell-smoke.mjs` `headerClash`);
  - no horizontal overflow at 302 px with 999,999 coins and 99,999 靈砂;
  - at the cap (1,000,000,000 each, `progression.mjs:21`) the header is no
    wider than `main`'s with the same save (recorded either way).
- **Reduced motion:** `.guide-hint` and `.glossary-term` have no animation
  or transition under `body[data-motion="reduce"]` and under emulated
  `prefers-reduced-motion: reduce`.
- **Native pass:** with `GAME_URL` serving `npm run build:native`'s `dist/`
  and native-smoke's simulated bridge: the header (with 存檔) passes the
  header checks; 金幣 opens 詞彙; on a fresh profile, 存檔's
  「弈道 · 遊戲規則」 then 知其道，入其局 opens `.is-mist-prep` on 遊歷, and
  Back twice reaches 洞府.
- **Regression sizes, recorded only:** the same checks at 844×390 and
  734×343 are recorded as NOTE lines when the control pass already flags
  (items 17 and 18), and asserted otherwise.

**`npm run test:coach`:** the rules-first cases in §1.5, including 1b.

**Regression suites**, one at a time, deleting PNGs after each:

| Suite | Why |
| --- | --- |
| `test:shell` | header row, inputs |
| `test:viewport` | every visible control ≥ 44 px; surfaces on fresh profiles now carry hints |
| `test:back` | `modal:rules` |
| `test:commands` | uses the rules dialog as its "other dialog" during a held lock (`tools/command-smoke.mjs:455-459`) |
| `test:saves` | the same (`tools/save-durability-smoke.mjs:712-718`), and `journeyKeys` (`:40`) asserts that no key but the save record is written in its flows (`:277-346`). By design no guide write happens there: the lobby's only hints are condition hints, the rules dialog has none, and nothing is recorded under a dialog. If a later hint changes that, exclude `GUIDE_KEY` beside `SAVES_KEY` in `journeyKeys` (device-local, not journey data), coordinating with r1, which edits that file |
| `tools/account-smoke.mjs` | 旅程閣's tools row and its rules entry |
| `test:expansion` | the 火焰山 overview |
| `test:native` | 存檔 button, store build |
| `tools/navigation-smoke.mjs` | |
| `tools/smoke.mjs` and `tools/journey-smoke.mjs` | they tap `data-action="start"`, which is unchanged |
| `test:battle-table` | sanity |

### 7.3 Build checks

1. Before the first source change, run `npm run build` and copy
   `dist/release.json` to the scratchpad.
2. After the change, build again and compare `assets` by `path` and
   `sha256`. Exactly the sets in §6 may change.
3. Run `npm run build:native` and compare its `release.json` the same way.
4. Run `node --test tests/hosting.test.mjs tests/native-build.test.mjs`.

---

## 8. Open questions for Yu

**Answered by Yu on 2026-10-21** (local commits `ac61074`, `eba3c2f`,
`60194b1`; everything else below stays open):

- **Voice and the guardian's lines (question 1):** approved as built, the
  split and both of 守渡弈者's lines (§2.3).
- **修為 and 歷練 (question 4, its first part):** one name per concept. 修為
  is only the 執令者's journey experience, the total that sets 執令者 Lv;
  歷練 is only a card's EXP. UI copy that used either word for the other, or
  an alias, now uses the one name, and a card at its top level says
  已達最高等級, as the card page already did. Story and lore prose was left
  alone. Showing the 修為 total in more places stays open.
- **Page counts:** accepted. 聲息與節奏 takes two pages instead of one on
  360×780, 393×780 and 412×790 (§5.6), and 弈道 two instead of one at
  430×932 (implementation record item 3).
- **`world-level`'s line:** 「建議 Lv 僅供參考，戰卡等級越高越穩。」 (§2.3),
  measured no taller than the subtitle it replaces at every tested size.
  What 建議 Lv means (question 3) is unchanged in code and stays open.

1. **Voice.** *Answered 2026-10-21: approved as built.* Is the split right:
   守渡弈者 for the two ferry hints, a narrator for the other six? And may the
   guardian promise 「首局我陪你走」? He is that battle's opponent, and the
   teaching comes from the table's marks.
2. **Copy and tone.** Please review the 10 hint strings (§2.3), the 20
   definitions (§3.2) and the term-mode heading WORDS ON THE ROAD /
   「識其名，知其用。」 (§3.1); the guardian's two lines and `world-level`'s
   are settled above. Conventions questions:
   - 着 as the game writes it;
   - 「Lv」 and 「EXP」 in Latin letters, as the UI shows them;
   - Arabic numerals in rules (8 位、25 星), as the deck editor writes them;
   - 修為 glossed as 「執令者的旅途閱歷」, to keep it apart from card 歷練.
3. **What 建議 Lv means.**
   - The code compares it with nothing.
   - On the original and story nodes it sets the guardians' card level to
     min(3, 建議 Lv) (`app.mjs:1062`).
   - In 續卷 the guardians play at Lv.1 whatever it says
     (`progression.mjs:720`).

   Was it meant as card Lv or 執令者 Lv? The hint avoids claiming either.
4. **修為 means two things.** *First part answered 2026-10-21 (above): the
   card uses below now say 等級 or 歷練, and 旅程閣 and the import
   comparison label the total 修為. The second part, where else to show the
   total, stays open.*
   - Reward lines and the glossary use it for journey experience
     (`adventure-ui.mjs:10`; `expansion-ui.mjs:11,53`).
   - It means a card's level or EXP in visible copy and messages:
     「同行之意 · 化作修為」 on every 同名傳承 result
     (`inheritance-ui.mjs:46`); 「這張卡牌已達最高修為」
     (`progression.mjs:548,558`; `local-commands.mjs:82`);
     「卡牌修為記錄無效…」 (`inheritance.mjs:39`); 「修為等級須為 1 至 5。」
     (`collection.mjs:83`); and `docs/PROGRESSION.md:102,104,112`.
   - The player's 修為 total is shown nowhere in normal play: `profileStrip`
     is unused, and only web 旅程閣 and the import comparison (both builds)
     show it, as 「旅途歷練」. The store build has no 旅程閣, so a player
     there cannot check the 執令者 Lv thresholds against a total.

   Should the card-level uses say 等級 or 歷練 instead (a separate copy
   change), and should the 修為 total be shown somewhere (for example in the
   執令者 Lv entry when opened from the header)?
5. **No per-hint 知道了.** Hints retire on their own, and the switch turns
   them all off or replays them. A 44 px dismiss control would cost a row in
   most scenes. Accept, or add one where the slot allows? And should a visit
   hint show for two visits instead of one, in case one glance misses it?
6. **Lv on phones.** Is reaching it through 詞彙 enough? Or should phones
   get a third 44 px 「Lv.N」 header button (to be measured at 302 px)?
7. **The rules dialog's button.** Keep 「知其道，入其局」 on a first visit,
   or say where it goes (for example 「知其道，赴渡口」)? The route is decided
   at tap time either way; a profile-dependent label could go stale in a
   dialog kept open across a restore (command-smoke and save-durability-smoke
   do exactly that). And is 「明白了」 right when it opens at a term?
8. **After the first result.** A "where next" hint on D3's 勝負已定 page
   (pointing to 同行記, 任務手札 and 修練) would need D3's freeze lifted:
   T1.1? An alternative that leaves D3 alone: a lobby condition hint while
   `stats.played` is 1–2, pointing to 任務手札 and 修練.
9. **Release track.** TestFlight or native first, v0.6.0 (which reopens a
   fixed scope), or v0.6.1? The rules-first fix (§1) is small and could land
   on its own before D3's playtest, so careful newcomers reach the coach.
10. **The switch.** Is 聲息與節奏 the right place, and 「初見提點」 the
    right name? Its caption now says 「入門期間，重開可再看」 (§5.6). Should
    the row be offered only while a hint could still apply (a newcomer, or
    `fire-mountain` not yet tried)? For a veteran it does nothing, but
    hiding it is a behaviour change, so it was not made.
11. **Newcomer gate.** Visit hints stop after 10 finished battles
    (`NEWCOMER_BATTLES`). Is 10 right? Playtests may move it.
12. **Old saves.** A v2–v4 save with cleared nodes but `played === 0` counts
    as a first visit (lobby, coach and now the rules route). Leave it?

---

## 9. Implementation order, coordination and scope

**Commits.** Each one is reviewable alone:

1. The rules-first fix:
   - `first-visit.mjs` with `isFirstVisit` and `rulesStartRoute` only;
   - its Node tests;
   - the `app.mjs` dispatcher split and `navigation-ui.mjs:57`;
   - the coach-smoke cases;
   - BATTLE-LAYOUT-PLAN's Ending row.
2. `glossary.mjs` and its tests, the 詞彙 module and the intro move,
   `rulesModal({term})`, the header buttons and `guide.css`'s header and
   glossary rules.
3. The hint registry, memory and markup, with their tests;
   `placeGuideHints` and `visibleGuideHints`; the `render`, `fitOverlay` and
   `closeModal` hooks; the allowlist and `index.html`.
4. The switch.
5. `tools/guide-smoke.mjs` and `test:guide`.
6. Documents:
   - NAVIGATION, for the routes, the Back lines and the header;
   - HANDOVER, a T1 checkpoint with the `app.mjs` touch points;
   - VALIDATION;
   - MOBILE-RELEASE's M5.1 checklist rows (§6);
   - this file's status;
   - the `docs/README.md` row;
   - ROADMAP, a T1 row.

**Other hands.** Never touch their uncommitted worktrees:

- **r1** (`~/Games/mythseal-review-fixes`) edits `app.mjs`'s `modal()`,
  `closeModal()`, `render()` and the dispatcher, plus `nav-stack.mjs`. As
  the UX review reported (not re-read for this revision):
  - its untracked `tests/support/app-controller.mjs` reads `app.mjs`'s
    imports with a one-line pattern (`^import \{…\} from '…';`) and runs
    `render`/`modal` with stub nodes whose `querySelector` returns null. T1's
    imports are single-line and named, and its hooks tolerate null nodes and
    a missing `getClientRects` (§5.4–5.5);
  - it inserts lines at the top of `closeModal()`, `modal()` and `render()`
    (after `refreshDaily`), and before `fitOverlay()` in `refreshOverlay`.
    T1's `closeModal` line sits beside `modalKind=null`, and its `render`
    lines sit after `app.innerHTML`.
- **n2** (`~/Games/mythseal-landscape`) edits `scene-navigation.css`,
  `expansion.css`, `package.json` and `tools/shell-smoke.mjs`. It changes
  `scene-navigation.css:153,174` from `(min-width:701px)` to
  `(orientation:landscape)`, which restyles `.lobby-route>p`,
  `.scene-pack-copy p` and `.arena-fairness` on 568–700 px landscapes: two
  of T1's slots. After rebasing onto n2, re-run guide-smoke's measurements.
  - Its `expansion.css` rule for short landscape screens (max-height 500 px,
    landscape, min-width 460 px) moves the resume strip into the header row
    and stacks `.game-header-resources` in a column, written for text spans.
    With T1's 44 px resource buttons that is an 88 px column in a 46 px
    header: 金幣 half above the viewport and 靈砂 over the scene, on 洞府,
    遊歷, 對弈 and 市集 whenever a resume strip shows. `guide.css` now keeps
    the wallet a row there, and lets it give way (`display:none`) when both
    resume actions show (`742e07c`). With that rule, n2's
    `tools/landscape-smoke.mjs` gives the same result on T1 + n2 as on
    `main` + n2 in both engines: only n2's own failure at 568×276 with
    insets.
  - n2's `tools/landscape-smoke.mjs:394` selects every `.game-header
    button`. It must select `.game-header button:visible`, because 執令者 Lv
    is now a button that is `display:none` below 1,051 px (and n2's own
    resume rule hides it too).
  - For Yu: the give-way hides 金幣 and 靈砂 whenever the WX-01 receipt and a
    pending battle or run show together on a short landscape screen, on
    市集 too, and also without n2. Keeping the wallet as a row alone failed
    only 568×320 with 47 px insets; a give-way limited to the narrowest
    widths would keep the wallet elsewhere but needs its own check.
- Both r1 and n2 start from `998b614`.

T1 overlaps them only at:

- one line each in `render()`, `fitOverlay()` and `closeModal()`;
- `rulesModal()` and three dispatcher branches;
- one script line in `package.json` (`test:guide` right after `test:coach`;
  PR #17's `test:native` and n2's `test:landscape` both edit the end of the
  list);
- deferred, `INPUT_IDS` in `shell-smoke.mjs`;
- `guide.css`'s short-landscape wallet rules against n2's `expansion.css`
  header rule, and `landscape-smoke.mjs:394` (above).

T1 avoids `scene-navigation.css` by keeping all its CSS in `guide.css`. If
r1 and n2 land first, T1 rebases onto them. If not, those lines are the
merge points.

**Out of scope:**

- T2's illustrated 入門卷 and its art;
- Design A;
- any change to `battle-teaching.mjs`, the coach or `shanhai.coach.v1`;
- the AI round-1 cap;
- the "where next" hint (open question 8);
- showing the 修為 total in more places (open question 4; the 修為/歷練
  wording itself was settled on 2026-10-21, §8);
- rerouting 任務手札's 今日落子 前往 (§1.1);
- locking destinations behind progress.

**Acceptance for T1:**

- Everything in §7 passes in both engines, and guide-smoke's native pass.
- The build diff is exactly §6's.
- No new `viewport-overflow` flag, and no lower later sibling or shorter
  list frame, at any §7.2 size.
- The profile, exports, backups and the native mirror are byte-for-byte as
  before.
- Yu has answered §8's copy and voice questions.

As with D3, the real test of the teaching is a playtest with first-time
players on a phone, and automation does not replace it.

---

## Implementation record · 2026-10-21

Built on `t1/first-visit-hints` as local commits, one per theme (the build
order of the instructions, which differs slightly from §9's): the rules-first
fix `8b67a82`; the hints, their record and the switch `7bdc92e`; the 詞彙
glossary `584ce53`; the tappable header `1513cfa`; `tools/guide-smoke.mjs`
and `npm run test:guide` `3271b52`; a short-landscape header fix `16c51f5`
(item 5 below); and these documents. Nothing was pushed, merged or
deployed. The checks actually run are in
[VALIDATION](VALIDATION.md#t1-first-visit-hints-and-glossary--2026-10-21).

**Where the build departs from the spec, and why** (each measured by
`npm run test:guide` against a hints-off control, or against `main` served
from an export of `3f3d351`, in Chromium as a Pixel 7 and WebKit as an
iPhone 15):

1. **`home-start` keeps the footnote** (`slot.remove` is empty). The lobby's
   route block is centred in the realm (`align-self:center`), so removing
   「四回合對弈 · AI 守境人」 recentred the block and lowered 啟程遊歷 by half
   the footnote's height (about 10.7 px) at every portrait size, which §2.1's
   acceptance forbids. The hint replaces the subtitle alone, and
   `requires` still keeps it out beside 先赴霧隱渡口.
2. **Two copies were cut to one line**, as §2.1 says to do when a copy does not
   fit its slot:
   - `home-start`: the subtitle is one line at 302–393 px (240 px of 11 px
     text at 302 px), and the guardian's label shares it. Built:
     「燈在渡口等你，首局我陪你走。」 (14 code points) and, once the coach has
     ended, 「燈在渡口等你，先落第一子。」 (13). Spec: 18 and 19.
   - `quests-why`: the 朝露 line is one line of about 191 px at 12 px in a
     centred column, so the spec's 26 code points took two lines and lowered
     the reward and button by about 11 px. Built: 「朝露與功課，助你開匣修練。」
     (13). It no longer names 金幣 and 靈砂; the reward figure right below it
     shows both.
   Every other copy is the spec's. The 「初見」 seal is 1 px narrower on each
   side (padding 0 1px, margin 3 px) so the 13-character line fits in WebKit.
3. **The rules dialog's tab row.** Moving the intro into the list did not pay
   for the 詞彙 tab row: the 弈道 list frame was 5 px shorter than `main`'s at
   360×740 and 430×932, and 23 px shorter at 844×390. In the rules dialog the
   tab row now has no bottom padding, and on screens 500 px tall or less it
   takes the place of the decorative eyebrow (THE ART OF THE DUEL, or WORDS ON
   THE ROAD in term mode; the `h2` stays). The frame is now at least `main`'s
   at every size measured; 734×343 loses `main`'s overflow flag, and 568×320
   keeps it. Because the intro is now a list item, the 弈道 list has one more
   page where it was already full: 430×932 (1 → 2) and the landscape sizes
   (5 → 6); Yu accepted the 430×932 page on 2026-10-21 (§8). The intro keeps
   its 11 px size inside the list.
4. **Header buttons have no padding** (spec: `0 2px`). With it the header was
   8 px wider than `main`'s at 302 px with 999,999 coins; without it the widths
   are equal there and at the cap. At the cap `main`'s header already
   overflows at 302 px (☷ off screen); that is unchanged and pre-existing.
5. **Short landscape: the wallet gives way to the cards hub tabs.** On screens
   500 px tall or less, 藏卡 and 圖鑑 put their hub tabs in the header row over
   the wallet (`scene-content.css`); on `main` the tabs already cover the
   wallet's text there. As buttons the resources became covered controls, and
   `test:shell`'s header check failed at 844×390, so there the wallet is now
   `visibility:hidden` (§4 did not foresee this).
6. **`GUIDE_DIALOG_KINDS`** is a literal `['quests', 'activity']`; a test ties it
   to the registry.
7. **A dialog of another kind ends the dialog visit** (`guide.leave('dialog')`
   in `applyGuide`), so a hint dialog reopened after another dialog replaced
   it counts as a new visit.
8. **The switch** landed with the hints, and `tools/guide-smoke.mjs` as its own
   commit. guide-smoke compares the rules dialog and the header with `main`
   when `BASELINE_URL` names a loopback server for `main`'s checkout, and
   checks the store build when `NATIVE_URL` serves `npm run build:native`'s
   `dist/`; without them it records NOTE lines instead. `GUIDE_SIZE`,
   `GUIDE_AUDIT=1` and `GUIDE_LAYOUT_ONLY=1` narrow or audit a run.
9. **Glossary test:** `PRINT_TREATMENTS` names are checked; the codes (BASE,
   AA, …) are not, because the 畫作 entry shows none.
10. **`tests/privacy-page.test.mjs`**' static guard now accepts
   `rulesModal`'s options argument (`function rulesModal\([^)]*\)`).

**Copy questions added for Yu** (beside §8): the three cut copies in item 2;
whether hiding the eyebrow on short landscape screens is acceptable, or the
tab row should move into the heading row there instead; and whether 弈道's
extra page at 430×932 matters. On 2026-10-21 Yu approved the guardian's two
cut lines and accepted the extra page (§8); the cut `quests-why` line and the
eyebrow stay open.

### Review fixes · 2026-10-21

A review of `263ebac` (game truth, state logic, layout and accessibility,
and regression against r1 and n2) confirmed nine findings. Each was fixed as
a local commit on this branch, and the sections above were updated to match:

1. **The switch's caption** (`f08b0bb`; three findings). The old caption,
   「初到各處時的一行說明；重新開啟會再看一次」, promised a replay to every
   player, but switching back on only clears `seen`, so a save past
   `NEWCOMER_BATTLES` battles saw nothing. Its two lines also made the row 83 px, the tallest settings
   item, and the pager sizes every row by the tallest, so 聲息與節奏 lost a
   row on every page. Now 「入門期間，重開可再看」: one line, 71 px like
   開啟聲音, and it names the bound (§5.6). Behaviour is unchanged; hiding
   the row for veterans is open question 10.
2. **仙丹** (`1399923`). 「火焰山沿用到下一戰」 hid the top-up after a win.
   Now 「火焰山勝後至少補至 8」, with the 8 read from `ACTIVITY_PILL_FLOOR`, a
   new export that `settleActivity` itself uses (`progression.mjs`; the only
   change there).
3. **`fire-mountain` hint** (`1399923`). It repeated the loss rule the
   overview's own line gives and left out the recovery. Now
   「三戰相連：生命與仙丹帶到下一戰，勝後生命 +2、仙丹至少補至 8，再選一項補給。」
   (40 code points), no taller than its slot at any tested size (59.4 px,
   three lines, at 302 and 320 px).
4. **先手 and 星數** (`1399923`). Both now say initiative compares the two
   drawn hands of four (四張), not the decks, and 「攻、星皆同則先手勝」 no
   longer reads as 同時.
5. **修練** (`1399923`). 「在 Lv.L 付 120×L…」 used a letter the game never
   introduces; now 「付現有等級 ×120 金幣、×6 靈砂」. 減力 and 減攻 keep their
   「−N」: their named examples make it recoverable, and a wording such as
   「技能所示數值」 would be wrong for 月蝕, a 共鳴 effect.
6. **畫作's title** (`1399923`). With five names it wrapped at 302 and
   320 px; one two-line title costs every 詞彙 page a term, so 詞彙 took 7
   pages there. Now 「畫作 · 本畫／異畫等」: 4 and 5 pages (§3.3).
7. **n2's stacked wallet** (`742e07c`). See §9: two `guide.css` rules for
   short landscape screens, the `landscape-smoke.mjs:394` change n2 needs,
   and the trade-off for Yu.
8. **Checks** (`93ff4f6`). test:guide now compares 聲息與節奏 with `main`
   (row height and page 1), checks the switch's caption on the veteran
   journey and that off then on still shows nothing there, checks every
   詞彙 title is one line at 302 px, and records 詞彙's page counts. The
   unit tests settle a fire-mountain win at 9 life and 1 pill, tie 四張 to
   the engine's hand, and tie 畫作's two names to the market hint.

The checks run after these fixes are in
[VALIDATION](VALIDATION.md#t1-first-visit-hints-and-glossary--2026-10-21).

---

## Appendix: facts checked in code

All read at `3f3d351`. None was run.

**The lobby and the rules dialog:**

- The lobby's first visit is `stats.played === 0 && !pending`
  (`navigation-ui.mjs:57`). It sets the title (`:63`), the 啟程遊歷 button
  (`:67`) and the 「初次落子？讀懂弈道」 link (`:71`).
- With a locked node of another volume selected, `blocked` (`:60`) turns the
  button into 先赴霧隱渡口 (`story-unlock`) and the footnote into
  「渡口首勝後，展開此卷」 (`:67`).
- A new journey starts at `location: NODES[0].id`, which is `mist-gate`
  (`progression.mjs:142`), with 1,200 金幣 and 20 靈砂 (`:137`).
- `rules-start` and `start` share `prepareEncounter()`, whose default is
  practice (`app.mjs:1486,794`). `story-unlock` is the 霧隱渡口 route
  (`:1291-1293`).
- The rules dialog also opens from `saveToolsMarkup` (`save-ui.mjs:52`), on
  旅程閣 (`app.mjs:592`) and in the native panel (`save-ui.mjs:80`,
  `app.mjs:245`), and from the battle header (`navigation-ui.mjs:23`).

**Battles and the coach:**

- `finishBattle` increments `stats.played` for every kind (`:640`), and
  `abandonBattle` does not (`:616-621`).
- `coachStart` requires an expedition at `mist-gate` with `played === 0`
  (`battle-teaching.mjs:217-218`).
- An expedition starts the coach through `startMatch` → `enterStartedBattle`
  → `startCoach({fresh:true})` (`app.mjs:1053-1066,782-784`).

**Rewards:**

- Expedition: a win pays the node's `winReward`; a loss or draw pays
  `{coins: 35|20, dust: 0, xp: 10}` (`progression.mjs:646`). Arena: win
  `{90, 3, 35}`, otherwise `{45|25, 1, 15}` (`:670`). Fire mountain: a win
  `{60, 3, 30}` plus a gift roll (`:769-775`); a loss or draw pays nothing
  and ends the run (`:793`). Practice: nothing.
- Card EXP: 20/12 (expedition), 12/8 (arena, fire mountain), 0 otherwise
  (`:683`), only for played own copies; 同名傳承 adds 80 plus each
  material's EXP (`inheritance.mjs:6,71,88`).
- `expansion.serial` is incremented only by `startActivity` (`:737`);
  `lastResult` only when a fire-mountain battle settles (`:794`).
- Six volume finals (`campaign-content.mjs:115`) each give a ticket on first
  clear (`progression.mjs:699`).

**Dialog structure and the layout limits:**

- The rules dialog has one paged module (`scene-dialogs.mjs:85-92`), with the
  intro outside the list (`:89`), and a single module hides the tab row
  (`viewport.mjs:180`). `heading()` pins the eyebrow and `h2` for all
  modules (`scene-dialogs.mjs:26-28`).
- Every visible control must be ≥ 43.5 px (`tools/viewport-smoke.mjs:92`).
- Header controls are 44 px (`scene-navigation.css:123-125`), and below
  330 px the header shows the brand mark alone (`viewport.css:37-38`).
- `viewKey()` changes within the bag (`app.mjs:1116`); the bag's lead is not
  rendered while a character is open (`backpack-ui.mjs:96`) and stays
  outside modules (`scene-adapters.mjs:21-46`).

**Levels:**

- `執令者 Lv` has no battle effect (`progression.mjs:839-841`;
  PROGRESSION.md:104).
- Card levels apply only in expeditions (`engine.mjs:115-121`).
- Guardian card levels are min(3, node level) on non-campaign nodes
  (`app.mjs:1062`) and Lv.1 in 續卷 (`progression.mjs:720`).

**Other findings:**

- `wx01MarketMarkup` (`pack-ui.mjs:17`) is not used by `app.mjs`; the
  market's live WX-01 offer is `adventure-ui.mjs:62`.
- `profileStrip` (`adventure-ui.mjs:16`) is not used by `app.mjs`.

---

## Critique log

Two reviews of `34e24e1` (2026-10-20), both read-only against `3f3d351`. Each
point was checked against the code for this revision.

**Game-truth review: all 21 required changes applied.**

| # | Point | Outcome |
| --- | --- | --- |
| 1 | 修為 defined with 歷練 | Applied: 「執令者的旅途閱歷，又稱旅途歷練…」 (§3.2). Correction: besides 旅程閣, the import comparison in both builds also labels it 旅途歷練 (`save-ui.mjs:119`). (2026-10-21: the alias and both labels now say 修為 alone, §8) |
| 2 | Open question 4 incomplete | Applied, with the same correction: the total is not shown only in web 旅程閣 |
| 3 | "Only the played copy gets EXP" | Applied in `card-exp`, `bag-copies` and the truth lines |
| 4 | Tickets per volume final | Applied |
| 5 | Initiative tie | Applied |
| 6 | Currency sources | Applied per currency |
| 7 | 靈砂 cost level | Applied in `card-level` (「在 Lv.L 付…6×L」), since reworded without the letter (「付現有等級 ×120 金幣、×6 靈砂」, [review fixes](#review-fixes--2026-10-21)); `dust` points to it |
| 8 | Returning players | Applied: newcomer gate plus per-hint signals (§2.1 item 5), veteran fixtures in §7.1 and §7.2 |
| 9 | Other rules origins | Applied: §1.1–1.3, test 1b and the native pass |
| 10 | Bag CSS specificity | Applied: single wrapper child, (0,3,0) rules (§5.4) |
| 11 | Visit keyed on `viewKey()` | Applied: `guideScreenKey` |
| 12 | Recorded under a dialog | Applied (§2.1 item 7) |
| 13 | Write in battle | Applied: the switch row is left out in battle; §5.2 restated |
| 14 | Switch back on mid-visit | Applied: quiet tokens |
| 15 | `fire-mountain` "never tried" | Applied: `expansion.serial === 0` |
| 16 | `quests-why` slot | Applied: the copy names the daily gift too |
| 17 | `home-start` when blocked | Applied: `requires` keeps the hint out and the footnote in |
| 18 | Glossary typography | Applied (§3.3) |
| 19 | 同行記 labels and route | Applied |
| 20 | `.bag-lead` outside modules | Applied: asserted through guide-smoke's placement and later-sibling checks |
| 21 | coach-smoke origins | Applied: step 1b |

Optional points: 1 (星數, 仙丹, 秘藏 added; 同名傳承 and 借牌 not, §3.2),
2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13 and 15 applied; 9 recorded as an edge
and open question 12 rather than changing the lobby's predicate; 14 is moot,
because `world-level` no longer uses that footnote.

**UX and architecture review: all 15 required changes applied; one
corrected.**

- **4 (`world-level`):** applied as proposed (the deck-level comparison and
  the subtitle slot), with the newcomer gate added so veterans do not see it
  for every hard node. One premise is wrong: "建議 Lv is 1 and 2 and starter
  cards already meet it" holds only at 霧隱渡口. 青玉森庭 is 建議 Lv.2, and
  starter copies are Lv.1 (a first win gives 20 EXP; Lv.2 needs 80,
  `collection.mjs:9`). The new condition handles both cases correctly.
- **13 (r1, n2, PR #17 fit):** applied as reported. The r1 details were not
  re-read for this revision, so as not to touch another hand's worktree.
- 1, 2, 3, 5–12, 14 and 15: applied as written (§2.1, §3.1, §5.2–5.6,
  §7.2).

Optional points: 1 (`arena-modes` dropped), 2 (`market-printing` limited to
the WX-01 offer), 3, 4 (DOM work moved to `scene-adapters.mjs`), 8, 10 and 11
applied. 5 (two visits) and 6 (a lobby hint after the first battles) became
parts of open questions 5 and 8. 7: the focus style is applied; group
eyebrows are not, since each would cost a line per term and the order already
groups them. 9 stays open question 7, with the stale-label risk noted.
