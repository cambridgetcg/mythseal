# First-visit hints and glossary · T1

**Status: `proposal · 2026-10-20`.** This is an implementation spec on the
branch `t1/first-visit-hints`, started from `main` `3f3d351`. Nothing in it is
built, merged or deployed. Every file:line below was read at `3f3d351`. No
test, build or browser ran for this document.

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
[Appendix · facts checked](#appendix-facts-checked-in-code)

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

D3's design says a first practice or arena battle shows no marks (the Ending
row in [BATTLE-LAYOUT-PLAN](BATTLE-LAYOUT-PLAN.md#first-battle-teaching--2026-10-12);
`tools/coach-smoke.mjs:708-717` tests it with the arena page's `start`). What
D3 never said is that the lobby's first-visit rules link leads into practice.

### 1.2 New behaviour

`rules-start` decides its route at tap time:

| Profile at the tap (fresh read through `loadProfile()`) | 知其道，入其局 does |
| --- | --- |
| First visit: `stats.played === 0` and no `pending` battle | Closes the rules dialog, goes to 遊歷 with `selectedNode = 'mist-gate'`, and opens the 霧隱渡口 preparation: `prepareEncounter('expedition', 'mist-gate')`. This is exactly what the lobby's own 先赴霧隱渡口 does (`story-unlock`, `app.mjs:1291-1293`). |
| Anything else | Unchanged: `prepareEncounter()`, the 自由切磋 preparation. With a pending battle, that still shows the pending-battle dialog. |

**Why the condition is the lobby's.** "First visit" is the lobby's own
predicate (`navigation-ui.mjs:57`). So whoever sees 「初次落子？讀懂弈道」 is
sent to the ferry, and whoever sees 「溫習弈道」 is not.

**It reads only the profile, not the coach state.** A player who skipped the
coach and then abandoned that battle still has `played === 0`. 霧隱渡口 is
still their natural first step, and `coachStart` decides on its own whether
marks show. The hint copy reads the coach state only so that it never
promises guidance that will not come (§2.3).

**Unchanged:**

- The arena page's `start` (開始練習, `adventure-ui.mjs:76`) still opens
  practice.
- D3's rule that a first practice or arena match shows no marks.
- `battle-teaching.mjs`, `battle-ui.mjs`, `nav-stack.mjs` and
  `shanhai.coach.v1`.
- In battle, the rules button is still 明白，返回對局 (`close-modal`).

### 1.3 Cancel, Back and writes

- **Cancel** (稍後出發, ×, or Back) closes the preparation and leaves the
  player on 遊歷 with 霧隱渡口 selected, as a cancelled 啟程遊歷 or
  先赴霧隱渡口 already does. The rules dialog does not reopen. The lobby
  still offers 「初次落子？讀懂弈道」, and tapping it again gives the same
  route.
- **Back:** before the tap the layers are `home > modal:rules`. After it they
  are `world > modal:preparation`. Back closes the preparation, and the next
  Back goes home. `navigate()` closes the rules dialog (`app.mjs:1102-1115`
  calls `closeModal()`), and the tap's activation covers the preparation's
  history entry, as for `story-unlock`.
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
  selectedNode=route.nodeId;navigate('world');return prepareEncounter(route.kind,route.nodeId);
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
  destinations about the rules dialog's two routes, and a Back-model line
  (§1.3).
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
       - `page.goBack()` once reaches the lobby.
    4. Repeat to the preparation, tap 踏上渡口, and assert mark ①
       (`assertCoach(page, 'card', …)`) with the encounter `mist-gate`
       stored.
    5. On the veteran profile (`played: 1`), `rules-start` opens a
       preparation without `.is-mist-prep`, eyebrow 自由切磋 · 出發前整備.
  - Extend the header comment's "Asserts" paragraph with one sentence for
    this case.

---

## 2. First-visit hints (初見提點)

### 2.1 Principles

1. **A hint takes the place of an existing line; it never adds one.** Each
   hint has a **slot**: one node it replaces, plus optional nodes it removes.
   The hint is the same element (tag) as the replaced node, with the same
   classes and the same parent, plus `guide-hint`. Every breakpoint rule that
   sizes, places or hides the slot then sizes, places or hides the hint.
   - The lobby's `.lobby-route>p` rule is one such rule.
   - A re-render brings the slot back once the hint retires.
   - The acceptance test (§7.2) is that the hint's box, margins included,
     is no taller than the boxes it replaces at 302, 360, 393 and 430 px
     portrait. Item 18's framed lists then lose no height, and no new
     `data-viewport-overflow` flag appears.
2. **No control inside a hint.** `tools/viewport-smoke.mjs:92` fails any
   visible control smaller than 43.5 × 43.5 px. A 44 px 知道了 cannot sit
   inside a one- or two-line footnote slot without growing it.
   - Hints therefore retire on their own (the "Retires" column below), and
     one switch in 聲息與節奏 turns them all off, or back on to see them again
     (§5.6).
   - Whether Yu wants a per-hint 知道了 anyway is open question 5.
3. **Inline, `role="note"`, never a Back layer.** A hint is page text in
   reading order.
   - It is not a dialog, overlay or live region, and it never takes focus.
   - `navLayers` and the history entries are unchanged: Back does what it did
     before, and no hint is ever closed by Back.
4. **Read-only conditions.** A condition reads the profile, the view
   (`viewKey()`, `selectedNode`), `coachMemory.seen()` (a read, never a write)
   and the `shanhai.guide.v1` record. It never writes, settles or spends.
5. **Placed only in a scene's first view.** A hint goes outside modules or in
   the module a scene opens on, so a "visit" hint is seen when it is counted.
   The one exception is `world-level`, which retires by condition (see
   below).

### 2.2 Voice

**Recommendation: split by place.**

- **守渡弈者 for the two hints that send the player to his ferry** (`home-start`,
  `arena-first`). They are written like his lines in `mist-gate-ui.mjs`:
  visible label 守渡弈者, then a 「quoted」 line in his register, with the
  lantern, the river, 落子 and 你 (「不必急着渡河，先看清手中的牌。」,
  「水面很靜，落子由你。」).
- **A neutral narrator for the seven system hints**, in the register of the
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

- Narrator hints start with a small gold 「初見」 seal (aria-hidden).
- Guardian hints start with his gold label, as in `mistGateArrivalMarkup`.
- Both carry a screen-reader prefix 「初見提點：」, as the coach's
  「新手指引 n / 4：」 does (`battle-ui.mjs:86`).

### 2.3 Registry (9 hints)

**How to read the table:**

- **Copy** is the exact zh-Hant text, counted in code points; every one is
  ≤ 40.
- **Slot** gives the render site at `3f3d351` and the CSS selector the
  adapter uses (§5.4). "Removes" nodes disappear while the hint shows.
- **Lasts:**
  - *condition*: shows every time its condition holds, and retires when
    the condition ends.
  - *visit*: shows for the whole first visit on which it is actually on
    screen, is recorded in `shanhai.guide.v1` at once, and never shows
    again.
  - With the switch off (§5.6), none shows.

| # | id · scene | Slot: render site → replaced (and removed) | Condition (read-only) | Voice | Copy | Lasts · retires |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `home-start` · 洞府 (screen key `home`) | `navigation-ui.mjs:67` → `.lobby-route > p` (the realm's subtitle, on a first visit 霧隱渡口's description 「渡船停在霧中，掌燈人正等你落下第一子。」, also shown in its preparation); **removes** `.lobby-route-footnote` (「四回合對弈 · AI 守境人」) | `isFirstVisit(profile)` | 守渡弈者 | Coach not yet ended: 「燈在渡口等你。首局，我陪你一步步走。」 (18). Coach ended (`coachMemory.seen()`): 「燈在渡口等你。先落第一子，其餘慢慢來。」 (19) | condition · the first finished battle |
| 2 | `arena-first` · 對弈, 問道 module (`arena`) | `adventure-ui.mjs:74` → `.arena-lobby-copy > .arena-fairness` (「保留同族共鳴與技能；出過牌的卡各得 12 EXP（勝）或 8 EXP（和／敗）。」) | `isFirstVisit(profile)` | 守渡弈者 | Coach not ended: 「擂台與切磋不急。先到霧隱渡口，首局我陪你走一遍。」 (24). Ended: 「擂台與切磋不急。先到霧隱渡口，落下第一子。」 (21) | condition · the first finished battle |
| 3 | `arena-modes` · 對弈, 問道 module (`arena`) | same slot as #2 (the conditions never overlap) | `stats.played > 0 && arena.played === 0` | narrator | 「擂台記積分，得金幣與 EXP；切磋不得金幣與 EXP。兩者皆用基礎能力。」 (36) | visit · or the first finished arena match |
| 4 | `world-level` · 遊歷, 此境 module (`world`) | `adventure-ui.mjs:31` → `.destination-panel > .panel-footnote` (for example 「勝利後續寫下一境；每日首勝另有秘藏。」) | the selected node is unlocked (`isNodeUnlocked`) and `profile.cleared.length < 2`. A locked node keeps its 「先踏破…」 footnote, which matters more | narrator | 「建議 Lv 只作參考，不設門檻；修練越高越穩。」 (23) | condition · the second cleared node. 此境 is not the module 遊歷 opens on, so this hint is not counted by visit |
| 5 | `bag-copies` · 藏卡 我的戰卡 (`bag-cards-groups`, `bag-cards-copies`) | `backpack-ui.mjs:96` → `.bag-lead > .bag-overview` (持有卡牌 · 收集角色 · 已鎖定珍藏), which is outside every module and above the framed list | none | narrator | 「同名卡可藏多張，每張各有編號、畫作與歷練；出過牌的那張才得 EXP。」 (34) | visit |
| 6 | `bag-decks` · 藏卡 三套牌組 (`bag-decks`) | the same `.bag-overview` (the lead also shows on 三套牌組). The full rule now sits only on the last tab, 編組說明 (`backpack-ui.mjs:85`, moved by `scene-adapters.mjs:29,36`) | none | narrator | 「每套 8 位不同角色、總星數不超過 25；可存 3 套，設為出戰的才上陣。」 (37). The three numbers are rendered from `RULES.deckSize`, `RULES.starLimit` and `MAX_DECK_SLOTS` | visit |
| 7 | `market-printing` · 市集, 秘匣 module (`market`) | `adventure-ui.mjs:62` → `.scene-pack-module .scene-pack-copy > p` (WX-01: 「16 位同行者，29 種版本。本畫、異畫與領契，記下不同瞬間。」; other packs: the pack's description) | none | narrator | 「凡、靈、神品是收藏品階，本畫、異畫等是畫作；兩者皆不改變星數與能力。」 (34) | visit |
| 8 | `quests-why` · 任務手札, 朝露 module (dialog `quests`) | `adventure-ui.mjs:51` → `.daily-gift > p` (「每日上線，收一份遠方捎來的心意。」). `.daily-gift .eyebrow` is already hidden there (`navigation.css:137`), so no second line is available; the copy is short on purpose | none | narrator | 「功課換來的金幣與靈砂，正是開匣與修練所需。」 (21) | visit |
| 9 | `fire-mountain` · 火焰山三連戰, 山行 module (dialog `activity`) | `expansion-ui.mjs:44` → `.activity-arrival > p` (`FIRE_MOUNTAIN.description`, about 45 characters) | `getExpansionSummary(profile).activity`: `unlocked`, `clears === 0`, no `run`, and `lastResult === null` (never tried) | narrator | 「三戰相連：生命與仙丹帶到下一戰，戰間補給一項；敗或和即止，所得仍在。」 (34) | visit · or the first run started. When the dialog opens on 牌組 (`openActivity(true)`), 山行 is hidden, so the hint is not counted until it is seen |

**Truth of each copy** (the appendix has the code lines):

- `home-start`, `arena-first`:
  - 「首局…我陪你」 is promised only while the coach has not ended, and
    `rules-start` or 先赴霧隱渡口 then really leads to the coached battle.
  - The guardian is that battle's opponent, so the line is framed in-world
    (open question 1).
- `arena-modes`:
  - The arena pays points, coins and card EXP 12 or 8.
  - Practice pays no coins and no card EXP.
  - Both use Lv.1 base cards, because `getBattleCard` applies levels only
    in `mode === 'expedition'`.
- `world-level`:
  - Unlocking depends only on the cleared prerequisite.
  - Card levels add power and damage in expeditions (`LEVEL_BONUSES`).
  - The copy makes no claim about what 建議 Lv is compared with, because the
    code compares it with nothing (open question 3).
- `bag-copies`: each copy has its own UID, print and XP, and only played
  copies receive XP.
- `market-printing`:
  - Rarity is independent of stars, power and level
    (`progression.mjs:40`).
  - 「畫作不改變角色的星數、能力或品階」 (`pack-ui.mjs:32`).
- `quests-why`: coins buy packs, and coins and 靈砂 pay for 修練. The copy
  says "what they are for", not "the only source".
- `fire-mountain`:
  - Life and pills carry over, with recovery after a win.
  - Between battles the player chooses one supply.
  - A loss or draw ends the run, and banked rewards stay
    (`expansion-ui.mjs:46-50`).

### 2.4 Height budgets

These are estimates from the CSS at the 302 px portrait width. `npm run
test:guide` (§7.2) measures them; a copy that exceeds its slot at any tested
width is cut, never allowed to grow the scene.

| Hint | Slot at 302 px (estimate) | Copy (estimate) |
| --- | --- | --- |
| `home-start` | Subtitle 1 line at 12 px / 1.8, plus the footnote line and its 8 px margin, about 45 px in all | label and quote, 2 lines of about 20 characters, about 43 px |
| `arena-first`, `arena-modes` | 2 lines at 10 px / 1.7, about 24 characters a line | 2 lines |
| `world-level` | 1 line at 10 px, about 24 characters | 1 line (23 including the seal) |
| `bag-*` | the overview's stacked figure and label, about 37 px | 2 lines at 11 px / 1.6 (`guide.css`), about 35 px |
| `market-printing` | WX-01 copy column about 149 px wide (`scene-navigation.css` grid `91px minmax(0,1fr)`), 4 lines | 3 lines |
| `quests-why` | 1–2 lines | 21 characters, 1–2 lines |
| `fire-mountain` | 3–4 lines | ≤ 3 lines |

### 2.5 Left out, and why

- **旅程存檔 (native).** D2's prompts already speak at the moment that
  matters, the first win and the first pack, with their store-build wording
  (save-ui.mjs `saveNoticeMarkup` with `cloud: false`). The 旅程存檔 dialog
  opens with its own footnote. Another hint would repeat both.
- **圖鑑, 旅程閣, card pages and inheritance.** Each already teaches in place,
  and the earlier gap review rated them adequate.
- **A "where next" hint on the first match result.** It would sit on D3's
  勝負已定 page. T1 keeps D3 frozen, so this is open question 8.

---

## 3. Glossary (詞彙)

### 3.1 Where it lives

**Today the rules dialog is paged but has one module.**

- `scene-dialogs.mjs:85-92` (`rules()`) makes one module, 弈道
  (`data-viewport-module="rules"`).
- It pages the four rules and the `.rules-note` as a list
  (`data-viewport-list="rules"`) and puts the intro `<p>` above them.
- With one module, the viewport hides the tab row
  (`viewport.mjs:180`, `tabs.hidden = modules.length < 2`).

**T1 adds a second module, 詞彙.** The tab row then appears with two tabs,
弈道 and 詞彙. It takes about one 44 px row from the list pages, which the
pager absorbs.

The changed `rules()`:

```js
function rules(anchor) {
  heading(anchor); fixedActions(anchor);
  const rules = anchor.querySelector('.rules-grid'), note = anchor.querySelector('.rules-note');
  if (note) rules.append(note);
  const module = section(anchor, 'rules', '弈道'); module.append(paged(rules, 'rules'));
  const intro = children(anchor).filter(node => node.tagName === 'P'); if (intro.length) module.prepend(...intro);
  // T1 (docs/TUTORIAL-T1.md §3): the glossary is the second module; opened at a term, it is the default.
  const glossary = anchor.querySelector(':scope > .glossary-list');
  if (glossary) {
    const words = section(anchor, 'glossary', '詞彙', [paged(glossary, 'glossary')]);
    if (glossary.dataset.open === 'true') words.dataset.viewportDefault = 'true';
  }
  finish(anchor);
}
```

**`rulesModal({ term = null } = {})`** in `app.mjs:834-842`:

- It renders `glossaryMarkup({ open: term })` after `.rules-note`.
- It opens as `modal(content, 'rules-dialog', true, 'rules')`. Today the kind
  is `null`, which shares the viewport key `modal-dialog` with other dialogs.
  With its own kind, its module and page memory are its own.
  - `prepareDialog` still reaches `rules()` through `.rules-grid`.
  - `refreshOverlay` and `dismissModal` treat the kind as before.
  - Its Back signature becomes `modal:rules`. back-smoke classifies dialogs
    by their DOM (`.rules-grid`, `tools/back-smoke.mjs:179`), so it is
    unaffected.
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

There are 17 entries in three groups. Each definition is at most 40
display units (a CJK character counts 1, an ASCII character ½), so it fits
2 lines in the dialog at 302 px (measured by §7.2). Numbers come from
constants where a constant exists (§5.3). The sources are at `3f3d351`.

| id | Term (title) | Definition | Source |
| --- | --- | --- | --- |
| `coins` | 金幣 | 開秘匣、商旅購卡與修練所用；對局、功課與出售可得。只是遊戲金幣。 | Start 1,200: `progression.mjs:137`. Spent on packs, boxes, market, buyback, 修練 and training: `progression.mjs:334,349,376,483,510,550,559` (`spend`, `:270-275`). Earned from rewards (`:266-268`) and sales (`:493`) |
| `dust` | 靈砂 | 修練戰卡所需：升一級付 6×Lv 靈砂與 120×Lv 金幣。對局與功課可得。 | `getUpgradeCost` `progression.mjs:538`. The only 靈砂 spends are 修練 and training (`:550,559`) |
| `xp` | 修為 | 旅途累積的歷練：遊歷、擂台、火焰山與功課可得，切磋不得；決定執令者 Lv。 | `addReward` `progression.mjs:266-268`. Expedition `:644-663`, arena `:670`, activity `:769`, login `:73`, tasks and arena chest `:74-84`. No practice branch in `finishBattle`. Used only by `getHeroLevel` (`:839-841`); PROGRESSION.md:104. See open question 4 |
| `hero-level` | 執令者 Lv | 修為滿 100 為 Lv.2，400 為 Lv.3，900 為 Lv.4；只記旅途，不加戰力。 | `getHeroLevel` = 1 + ⌊√(修為/100)⌋, `progression.mjs:839-841`; nothing in battle reads it |
| `card-level` | 修練（戰卡 Lv） | 每張卡 Lv.1–5：以金幣靈砂修練，或累積 EXP 升級；加成只在遊歷生效。 | `LEVEL_BONUSES` `engine.mjs:88`. `getBattleCard` applies levels only in expeditions (`:115-121`). EXP thresholds level up automatically (`collection.mjs:9,87-92`) |
| `card-exp` | 歷練（卡牌 EXP） | 只記出過牌的那張：遊歷勝 20、和敗 12；擂台與火焰山 12／8；切磋不得。 | `progression.mjs:683-688`; `awardInstanceXP` `collection.mjs:325-339` |
| `journal` | 同行記 | 每張卡自己的履歷：編號、畫作、入藏緣由、對弈記錄與歷練。在藏卡點卡面查看。 | `instanceMarkup` `backpack-ui.mjs:112` |
| `rarity` | 品階 · 凡品／靈品／神品 | 收藏稀有度：影響開匣機率與商旅價錢，不改變星數、力量與傷害。 | `RARITIES` (weight, buy and sell prices) and the comment at `progression.mjs:35-40` |
| `printing` | 畫作 · 本畫／異畫／領契／墨卷／天工 | 同一角色的不同畫作，只改外觀，不改星數、能力與品階；領契可作洞府肖像。 | `PRINT_TREATMENTS` `card-presentation.mjs:6-12`; `pack-ui.mjs:32`; leader portrait `backpack-ui.mjs:110` |
| `seals` | 西行印 | 每開一匣西行秘匣得 1 印，七日弈緣另得 5 印；可換指定特別畫作，不過期。 | +1 per pack, box pack and ticket: `progression.mjs:344,391,821`. Weekly `:81,311`. Costs `wx01-pack.mjs:7`. 「保留的印不會到期」 `pack-ui.mjs:32` |
| `tickets` | 西行秘匣券 · 秘券 | 免金幣開一匣西行秘匣。續卷終章首勝、火焰山每週第 1 與第 3 次全通各贈一張。 | Volume final, first clear: `progression.mjs:699`. Fire mountain weekly: `:786`. Opening: `:811-822`. 「券不過期」: `expansion-ui.mjs:71-73` |
| `initiative` | 先手 | 首回合四張總星數高者先手，其後輪換。先手先亮卡；攻擊、星數皆同時先手勝。 | `engine.mjs:176-179,254-262,304`; rule 04 `app.mjs:839` |
| `resonance` | 共鳴（同族共鳴） | 抽出的四張中，有兩位不同的同族角色，該族加成便啟動；出過的卡仍計。 | `hasFactionBonus` `engine.mjs:193-198` (the hand includes used cards); rule 03 `app.mjs:838` |
| `fury` | 怒擊 | 另付 3 丹；贏得該回合時傷害 +2。不加攻擊。 | `RULES.furyCost` and `furyDamage` `engine.mjs:12`, applied at `:236` |
| `block` | 封鎖 | 令對手的角色技能失效，不影響同族共鳴；雙方都封鎖時一同生效。 | `engine.mjs:231-232`; ability text `:28` |
| `power-down` | 減力 | 對手力量 −N（最低 1），在乘仙丹之前計算。例：迷渡、離間。 | `engine.mjs:234`; 渡影 `:35`, 貂蟬 `:67` |
| `attack-down` | 減攻 | 乘仙丹之後，對手攻擊 −N（最低 1）。例：空城、月隱的月蝕。 | `engine.mjs:235`; 諸葛亮 `:63`; `FACTIONS.moon` `:18` |

減力 and 減攻 are the two terms the game used without defining: in the rules
note (`app.mjs:840`) and in the formula's 預計 sentence
(`battle-teaching.mjs:130`). 封鎖 is also defined in each blocking card's
ability text. The glossary gathers all three in one place.

### 3.3 Markup

`glossaryMarkup({ open })` renders this:

```html
<div class="glossary-list" data-glossary data-open="true|false">
  <article class="glossary-term" data-viewport-id="term-coins" data-glossary-term="coins"
           tabindex="-1" aria-labelledby="glossary-term-coins">
    <h3 id="glossary-term-coins">金幣</h3><p>開秘匣、商旅購卡與修練所用；…</p>
  </article>
  …
</div>
```

- The order is 旅途 (`coins`, `dust`, `xp`, `hero-level`), then 卡牌
  (`card-level`, `card-exp`, `journal`, `rarity`, `printing`, `seals`,
  `tickets`), then 對弈 (`initiative`, `resonance`, `fury`, `block`,
  `power-down`, `attack-down`).
- There are no group headings: they would become list items of their own.
- Each term is a list item, so the pager keeps every term reachable at any
  height.

---

## 4. Tappable header resources

`gameHeaderMarkup` (`navigation-ui.mjs:26-27`) changes as follows:

- The resource wrapper becomes
  `<div class="game-header-resources wallet" role="group" aria-label="旅途所得">`.
  Today it has an `aria-label` but no role, so the label is not reliably
  exposed.
- Each resource keeps its `<span>` (so `.wallet>span` and
  `.game-header-resources>span` keep their breakpoints: `adventure.css:7-8,198`,
  `navigation.css:11,163`) and drops its `title`. Inside, it holds a button:
  ```html
  <span><button type="button" class="game-resource" data-action="glossary" data-id="coins"
        aria-label="金幣 1,200，查看說明"><span aria-hidden="true">◈</span> <b>1,200</b><small>金幣</small></button></span>
  ```
  The `dust` button is the same with ✧ and 靈砂. The visible number is part
  of the accessible name (WCAG 2.5.3).
- `執令者 · Lv.N` (`:27`) becomes
  `<button type="button" class="game-player-level" data-action="glossary" data-id="hero-level" aria-label="執令者 Lv.N，查看說明">`.
  It keeps its class, so the rule that hides it below 1,051 px
  (`navigation.css:154`) still applies.
- `guide.css`:
  - `.game-shell .game-header .game-resource` and
    `.game-shell .game-header .game-player-level` get `min-width:44px`,
    `min-height:44px`, `display:inline-flex`, `align-items:center`,
    `gap:inherit`, `padding:0 4px`, `border:0`, `background:none`, and
    `color`, `font` and `letter-spacing` set to inherit.
  - Each gets a visible gold `:focus-visible` outline.
  - At 302 px the header holds the 44 px brand mark (`viewport.css:38`),
    the resources, the 44 px 旅程閣 or 存檔 button and the 44 px ☷ button
    (`scene-navigation.css:123-125`), with 10 px gaps. That leaves about
    116 px for the two resources against about 99 px needed (an estimate;
    `test:shell` and `test:guide` measure it).
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
`collection.mjs` (`MAX_DECK_SLOTS`) and `progression.mjs`
(`getExpansionSummary`, `isNodeUnlocked`, `NODES`).

```js
export const GUIDE_KEY = 'shanhai.guide.v1';
export const FIRST_EXPEDITION = 'mist-gate';
export const isFirstVisit = profile => …;            // §1.4
export function rulesStartRoute(profile) { … }       // §1.4
/** The registry of §2.3, frozen: { id, channel: 'screen'|'dialog', scene(key) → boolean,
 *  slot: { replace: selector, remove: [selectors] }, voice: 'guardian'|'narrator',
 *  lasts: 'visit'|'condition', when(ctx) → boolean, copy(ctx) → string }. */
export const GUIDE_HINTS = Object.freeze([ … ]);
/** Hints whose scene and condition hold. ctx = { profile, key, selectedNode, coachSeen } is
 *  read only; no condition writes or throws on a hydrated profile. */
export function guideHints(ctx, channel) { … }
/** The hint's inner markup: escaped text, the seal or the guardian's label, the
 *  sr-only prefix. No control, no focusable element. */
export function hintMarkup(hint, ctx) { … }
export function createGuideMemory(storage) { … }     // §5.2
```

`isFirstVisit`, `rulesStartRoute` and `GUIDE_HINTS` are the only places those
rules live. `navigation-ui.mjs:57` imports `isFirstVisit`.

### 5.2 `shanhai.guide.v1`: schema and memory

The key holds device-local JSON, beside `shanhai.coach.v1` and
`shanhai.experience.v1`:

```json
{"seen":["arena-modes","bag-copies"],"off":true}
```

- **`seen`:** ids of *visit* hints already shown, as sorted unique strings.
  Unknown ids that look like ids (`/^[a-z0-9-]{1,40}$/`, at most 64 of them)
  are kept, so an older build never drops a newer build's record.
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
| `select(hints, token)` | `[]` while `off`. Otherwise returns the hints to place: a *condition* hint always; a *visit* hint that is unseen, or pinned to this token. |
| `shown(ids, token)` | Called after the viewport has decided visibility. Each *visit* hint among `ids` is recorded as seen and pinned to `token`, so it stays for the rest of this visit. Writes once, only if something changed. *Condition* hints are never written. |
| `enabled()` | Whether hints are on. |
| `setEnabled(on)` | Off: records `off` and drops all pins. On: clears `seen` and `off`, so every hint can show again on later visits. |

**Fail-safe:**

- A `getItem` or `setItem` that throws (private mode, blocked site data, a
  full disk), corrupt JSON, or a non-object value is treated as an empty
  record. The page's own copy then keeps working for the life of the page,
  and nothing throws into `render()`.
- The worst case is that a retired *visit* hint shows once more after a
  reload, as the coach's marks do when storage is lost.

**When writes happen:** only when a *visit* hint first becomes visible on a
non-battle screen or dialog, and when the switch changes. There is never a
write in battle. That keeps coach-smoke's `teaching()` check true: during
teaching actions only `shanhai.coach.v1` is written
(`tools/coach-smoke.mjs:328-338`).

### 5.3 `glossary.mjs` (new, pure)

```js
export const GLOSSARY = Object.freeze([{ id, term, group: '旅途'|'卡牌'|'對弈', text }, …]); // §3.2
export const GLOSSARY_IDS = Object.freeze(GLOSSARY.map(entry => entry.id));
export function glossaryMarkup({ open = null } = {}) { … }  // §3.3; an unknown `open` is ignored
```

**Numbers that come from constants:**

- 怒擊 uses `RULES.furyCost` and `RULES.furyDamage`.
- 品階 names use `RARITIES[*].name`.
- 畫作 names use `PRINT_TREATMENTS[*].name`.
- 執令者 Lv thresholds are `100 × (Lv − 1)²` for Lv.2–4, the inverse of
  `getHeroLevel`.

**Numbers with no constant**, written out and checked by §7.1 against the
functions themselves: upgrade costs 120×Lv and 6×Lv; card EXP 20/12 and 12/8;
seals +1 per pack and 5 weekly.

### 5.4 Placement adapter: `placeGuideHints` in `scene-adapters.mjs`

`scene-adapters.mjs` is already the home of presentation-only DOM restructuring
("Nodes are moved, never cloned or persisted").

```js
/** T1 (docs/TUTORIAL-T1.md §2): each hint replaces its slot with an element of the same tag
 * and classes, plus `guide-hint`, role="note" and data-guide-hint; the slot's other nodes are
 * removed. A re-render restores them. Returns [{ id, node }] for the hints placed. */
export function placeGuideHints(root, entries /* [{ hint, html }] */) { … }
```

- A slot that is missing (markup changed) is skipped silently. §7.2 asserts
  each hint is placed in its scene, so a missed slot cannot pass unseen.
- **Visible** means not inside `[hidden]` and having client rects. A slot
  that a breakpoint hides keeps its hint hidden too, and an unseen hint is
  never recorded.

**Per-slot CSS in `guide.css`:**

- Only the bag's `.bag-overview` slot needs any. It is a flex row of stacked
  figures, so the hint overrides it:
  - `.bag-overview.guide-hint{display:block;font-size:11px;line-height:1.6;color:var(--muted)}`
  - `.bag-overview.guide-hint>span{display:inline;padding:0;border:0}`
  - Same specificity as `scene-content.css`'s rules; `guide.css` loads last,
    so it wins.
- Every other slot is text and keeps its own rules.
- `.guide-hint-seal` is the small gold 「初見」 box and `.guide-hint-voice`
  the gold 守渡弈者 label.
- There is no animation (§6).

### 5.5 Every touch point

**`app.mjs`.** The r1 and PR #17 lines named in §9 are the likely conflicts.

1. **Imports.** Add after `:42`:
   - `import { createGuideMemory, guideHints, hintMarkup, rulesStartRoute } from './first-visit.mjs';`
   - `import { glossaryMarkup } from './glossary.mjs';`

   `:38` gains `placeGuideHints`. Do not touch the `account-client.mjs` and
   `account-ui.mjs` import lines (`:19,21`): `NATIVE_EDITS` must match each
   exactly once.
2. **Memory and helper.** Beside `coachMemory` (`:446`):
   - `const guide=createGuideMemory({getItem:…,setItem:…})`, built the same
     way as `coachMemory`.
   - A helper `applyGuide(root,channel,key)` that:
     1. builds `ctx` (`{profile,key,selectedNode,coachSeen:coachMemory.seen()}`);
     2. calls `guide.select(guideHints(ctx,channel),token)` and
        `placeGuideHints(root,…)`;
     3. returns a function that calls `guide.shown(visibleIds,token)`.
3. **`render()`** (`:586-611`): `const guideShown=applyGuide(app,'screen',viewKey());`
   between `app.innerHTML=…` and `prepareScene(…)`, then `guideShown();`
   right after `viewport.refresh(…)`.
4. **`fitOverlay()`** (`:657-663`): the same for the dialog. Before
   `prepareDialog`/`preparePack`, `const guideShown=applyGuide(dialog,'dialog',modalKind);`,
   and after `viewport.refresh`, `guideShown();`. `refreshOverlay` (quests,
   activity) reaches it through `fitOverlay`.
5. **`closeModal()`** (`:621-633`): `guide.leave('dialog');`.
6. **`experienceSettingsModal()`** (`:685-694`): one field row (§5.6).
7. **The `change` listener** (`:1517`): a `guide-hints` branch (§5.6).
8. **`rulesModal()`** (`:834-842`): `{term}`, `glossaryMarkup`, kind
   `'rules'`, the three fixed actions, `viewport.forget('modal-rules')`, and
   the reveal frame (§3.1).
9. **Dispatcher:**
   - `:1484` area: `glossary` branch (§4);
   - `:1486`: `start` and `rules-start` split (§1.4).

**UI modules:**

- `navigation-ui.mjs:26-27`: the header buttons and group role (§4).
- `navigation-ui.mjs:57`: `isFirstVisit`.
- `scene-dialogs.mjs:85-92`: the 詞彙 module (§3.1).
- `scene-adapters.mjs`: the new `placeGuideHints` export.

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
  - `package.json`: a `test:guide` script.
  - `tools/coach-smoke.mjs` (§1.5) and the documents in §1.5 and §9.

### 5.6 The switch in 聲息與節奏

The switch is the only control T1 adds besides the header buttons.

- **Row.** After 揭曉節奏 in `experienceSettingsModal()`:
  `<label class="experience-field"><span>初見提點<small>初到各處時的一行說明；重新開啟會再看一次</small></span><input id="guide-hints" type="checkbox" ${guide.enabled()?'checked':''}></label>`.
- **Turning it off:** `guide.setEnabled(false)`, then `render()`. The scene
  behind the dialog loses its hint at once; `refreshOverlay` ignores
  `experience-settings`.
- **Turning it on:** `guide.setEnabled(true)` without a render. Hints show
  again from the next visit, so nothing is recorded while the dialog covers
  the scene.
- The dialog is a paged list (`scene-dialogs.mjs` `settings()`), so one more
  row only adds a page item. Its 「設定會記在此裝置」 footnote stays true.
- The checkbox's computed font size must stay ≥ 16 px, as N1 requires of
  every input. `tools/shell-smoke.mjs`'s `INPUT_IDS` should gain
  `'guide-hints'` once n2 has landed, since n2 edits that file (§9);
  until then guide-smoke checks it.

---

## 6. Accessibility, motion, Back, native and web builds

**Hints:**

- Each hint is `role="note"` on the slot's own element, in reading order,
  with an sr-only 「初見提點：」 prefix.
- It is not live, takes no focus, and has no `aria-label` that would hide
  its text.
- The guardian's label is visible text.
- Colour is the slot's own, plus the gold seal or label, which the existing
  palette already uses for text.

**Glossary:**

- The module tabs are the viewport's own (`role="tab"`, arrows, Home and
  End).
- Each term is an `article` named by its `h3`. Opening at a term focuses that
  term (`tabindex="-1"`), so the screen reader reads the word and then its
  definition.

**Header:** 44 × 44 targets, names that include the visible numbers, and a
gold `:focus-visible` outline.

**Reduced motion:** hints and the glossary have no animation of their own.
The viewport's existing page-arrival animation already honours
`prefers-reduced-motion` and `body[data-motion="reduce"]`
(`scene-content.css:35`).

**Back (D1):**

- Hints add no layer and no history entry (§2.1).
- The glossary is inside the rules dialog: one dismissible layer,
  `modal:rules`. Switching tabs is not a layer, as in every viewport dialog.
- Opening the glossary from the header pushes one entry on the tap, and
  Back closes it.
- The rules-first route's layers are in §1.3.

**Text scaling, VoiceOver and TalkBack:** not verified. They stay physical-
phone checks, as for D3 (M5.1).

**Native build:**

- The three new files ship in both builds. None imports `account-*`, and
  `NATIVE_EDITS` still matches exactly once (`tools/build.mjs:39-45`).
- `npm run build:native` must pass its reference and offline-name checks
  (`tools/build.mjs:114-127`).
- The store build gets the same hints, glossary and header. The 旅程存檔
  button (`savesButtonMarkup`) keeps its place: `test:native` asserts it
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
  - 8–12 hints with unique ids;
  - each copy ≤ 40 code points for every `ctx` variant;
  - each has a channel, scene, slot, voice and lasts;
  - guardian copy is 「quoted」.
- *Conditions*, on real fixtures built with `createProfile`, `beginBattle`,
  `finishBattle` and `abandonBattle`:
  - fresh: `home-start`, `arena-first` and `world-level` (mist-gate) hold;
    `arena-modes` does not.
  - one finished practice match: `arena-modes` holds; `home-start` and
    `arena-first` do not.
  - a first battle begun, then abandoned: `home-start` holds again
    (`played` is still 0).
  - with a `pending` battle: `home-start` does not hold.
  - after one finished arena match: `arena-modes` does not hold.
  - after 霧隱渡口 is won: `fire-mountain` holds. It stops holding with a
    run, a `lastResult` or one clear.
  - locked node: `world-level` does not hold. Nor does it once two nodes
    are cleared.
  - copy variants follow `coachSeen`.
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
    token shows it again, a new token does not;
  - condition hints are never written;
  - `setEnabled(false)` gives nothing; `setEnabled(true)` clears `seen`.
- *Markup:* `role` is added by the adapter, not the string. The string
  contains the sr-only prefix and the seal or label, no `<button>`, `<a>`,
  `tabindex` or `aria-live`, and its text is escaped.

**`tests/glossary.test.mjs`**

- *Shape:* 15–18 entries with unique ids; `coins`, `dust` and `hero-level`
  exist; each definition is ≤ 40 display units; `glossaryMarkup` gives one
  `data-viewport-id` and `data-glossary-term` per entry, `tabindex="-1"`,
  and `data-open` only for a known id.
- *Truth, against the engine and progression:*
  - 怒擊 text contains `RULES.furyCost` and `RULES.furyDamage`;
  - `getHeroLevel` at 99, 100, 399, 400, 899, 900 修為 gives 1, 2, 2, 3, 3, 4;
  - `getUpgradeCost` on a Lv.1 and a Lv.2 copy gives 120/6 and 240/12;
  - `finishBattle` gives these card EXP amounts:
    - expedition win 20, loss 12;
    - arena win 12, loss 8;
    - practice 0 and no coins;
  - `XP_THRESHOLDS` give automatic levels;
  - `buyPack({set:'wx01'})` gives +1 seal, and `WEEKLY_TASKS` 'matches'
    pays 5 seals;
  - `RARITIES` names, and `PRINT_TREATMENTS` names and codes, appear;
  - `hasFactionBonus`:
    - two different same-faction names: true;
    - one: false;
    - a used card still counts;
  - `createMatch` with controlled hands: the higher star sum leads, and
    `resolveRound` alternates the lead;
  - 減力, 減攻 and 封鎖 through `resolveRound`:
    - 渡影 lowers the opponent's power by 1 before the multiplier;
    - 諸葛亮 lowers attack by 4 after it, to a minimum of 1;
    - 霜璃 blocks the ability but not resonance.
- *Header markup:* `gameHeaderMarkup` has `data-action="glossary"` buttons
  for `coins`, `dust` and `hero-level`, with aria-labels that contain the
  formatted numbers, no `title` on the resources, and `role="group"`.

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

- **Sizes:** portrait 302×640, 360×740, 393×852 and 430×932, with
  synthetic saves and the clock and `Math.random` fixed as coach-smoke does.
- **Control pass:** each scene renders with `{"off":true}` and records:
  - the slot's boxes (replaced + removed, margins included);
  - every `[data-viewport-overflow="true"]` in the surface, its modules and
    its lists;
  - each list's `data-page-count`;
  - the number of controls in the surface.
- **Hint pass:** the same scene with no record. Assert:
  1. the hint is placed with `role="note"`, the replaced node is gone, and
     the removed nodes are absent;
  2. the hint's box, margins included, is ≤ the slot's total + 1 px;
  3. no new overflow flag, the same page counts, the same number of
     controls;
  4. active modules keep `scrollHeight ≤ clientHeight + 1`;
  5. no document scroll.
- **Behaviour:**
  - *visit* hints show for the whole visit and are gone on the next visit
    and after a reload;
  - *condition* hints follow the profile;
  - `fire-mountain` is not recorded while 牌組 is the open module;
  - the switch: off removes the hint in the scene behind the dialog; on,
    then a new visit, shows hints again; the checkbox's font is ≥ 16 px;
  - while browsing, only `shanhai.guide.v1` is written and the profile
    bytes never change;
  - no hint ever appears on the battle screen.
- **Back:** the history depth (`history.state['mythseal.nav'].depth`) is the
  same with and without a hint. Back from a scene with a hint goes home as
  before.
- **Glossary:**
  - 金幣 and 靈砂 at each size, and 執令者 Lv at 1280×800, open the dialog
    on 詞彙 with that term on the current page and focused.
  - Back closes the dialog and focus returns to the button.
  - The lobby's 弈道 link opens on 弈道 page 1 even after the dialog was
    last left on 詞彙.
  - Each term fits 2 lines at 302 px.
- **Header:**
  - every header control is ≥ 44 × 44;
  - no two overlap, and taps across each one's width land on it (the same
    test as `tools/shell-smoke.mjs` `headerClash`);
  - no horizontal overflow at 302 px with 99,999 coins.
- **Regression sizes, recorded only:** the same checks at 844×390 and
  734×343 are recorded as NOTE lines when the control pass already flags
  (items 17 and 18), and asserted otherwise.

**`npm run test:coach`:** the rules-first case in §1.5.

**Regression suites**, one at a time, deleting PNGs after each:

| Suite | Why |
| --- | --- |
| `test:shell` | header row, inputs |
| `test:viewport` | every visible control ≥ 44 px; surfaces on fresh profiles now carry hints |
| `test:back` | `modal:rules` |
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

1. **Voice.** Is the split right: 守渡弈者 for the two ferry hints, a narrator
   for the other seven? And may the guardian promise 「首局，我陪你一步步走」?
   He is that battle's opponent, and the teaching comes from the table's
   marks.
2. **Copy and tone.** Please review the 11 hint strings (§2.3) and 17
   definitions (§3.2). Conventions questions:
   - 着 as the game writes it;
   - 「Lv」 and 「EXP」 in Latin letters, as the UI shows them;
   - Arabic numerals in rules (8 位、25 星), as the deck editor writes them.
3. **What 建議 Lv means.**
   - The code compares it with nothing.
   - On the original and story nodes it sets the guardians' card level to
     min(3, 建議 Lv) (`app.mjs:1062`).
   - In 續卷 the guardians play at Lv.1 whatever it says
     (`progression.mjs:720`).

   Was it meant as card Lv or 執令者 Lv? The hint avoids claiming either.
4. **修為 means two things.**
   - Reward lines, the profile strip and the glossary use it for journey
     experience (`adventure-ui.mjs:10`).
   - 「這張卡牌已達最高修為」 (`progression.mjs:548,558`) and
     PROGRESSION.md use it for a card's level.

   Should that error say 等級 instead? That would be a separate one-line
   change.
5. **No per-hint 知道了.** Hints retire on their own, and the switch turns
   them all off or replays them. A 44 px dismiss control would cost a row in
   most scenes. Accept, or add one where the slot allows?
6. **Lv on phones.** Is reaching it through 詞彙 enough? Or should phones
   get a third 44 px 「Lv.N」 header button (to be measured at 302 px)?
7. **The rules dialog's button.** Keep 「知其道，入其局」 on a first visit,
   or say where it goes (for example 「知其道，赴渡口」)? And is 「明白了」
   right when it opens at a term?
8. **A "where next" hint after the first result.** It would point to
   同行記, 任務手札 and 修練, and it would sit on D3's 勝負已定 page. Do you
   want it as T1.1, outside D3's freeze?
9. **Release track.** TestFlight or native first, v0.6.0 (which reopens a
   fixed scope), or v0.6.1? The rules-first fix (§1) is small and could land
   on its own before D3's playtest, so careful newcomers reach the coach.
10. **The switch.** Is 聲息與節奏 the right place, and 「初見提點」 the
    right name?

---

## 9. Implementation order, coordination and scope

**Commits.** Each one is reviewable alone:

1. The rules-first fix:
   - `first-visit.mjs` with `isFirstVisit` and `rulesStartRoute` only;
   - its Node tests;
   - the `app.mjs` dispatcher split and `navigation-ui.mjs:57`;
   - the coach-smoke case;
   - BATTLE-LAYOUT-PLAN's Ending row.
2. `glossary.mjs` and its tests, the 詞彙 module, `rulesModal({term})`, the
   header buttons and `guide.css`'s header rules.
3. The hint registry, memory and markup, with their tests;
   `placeGuideHints`; the `render`, `fitOverlay` and `closeModal` hooks;
   the allowlist and `index.html`.
4. The switch.
5. `tools/guide-smoke.mjs` and `test:guide`.
6. Documents:
   - NAVIGATION, for the routes, the Back lines and the header;
   - HANDOVER, a T1 checkpoint with the `app.mjs` touch points;
   - VALIDATION;
   - this file's status;
   - the `docs/README.md` row;
   - ROADMAP, a T1 row.

**Other hands.** Never touch their uncommitted worktrees:

- **r1** (`~/Games/mythseal-review-fixes`) edits `app.mjs`'s `modal()`,
  `closeModal()`, `render()` and the dispatcher, plus `nav-stack.mjs`.
- **n2** (`~/Games/mythseal-landscape`) edits `scene-navigation.css`,
  `expansion.css`, `package.json` and `tools/shell-smoke.mjs`.

T1 overlaps them only at:

- one line each in `render()`, `fitOverlay()` and `closeModal()`;
- `rulesModal()` and three dispatcher branches;
- one script line in `package.json`;
- deferred, `INPUT_IDS` in `shell-smoke.mjs`.

T1 avoids `scene-navigation.css` by keeping all its CSS in `guide.css`. If
r1 and n2 land first, T1 rebases onto them. If not, those lines are the
merge points.

**Out of scope:**

- T2's illustrated 入門卷 and its art;
- Design A;
- any change to `battle-teaching.mjs`, the coach or `shanhai.coach.v1`;
- the AI round-1 cap;
- the "where next" hint (open question 8);
- the 修為 wording fix (open question 4);
- locking destinations behind progress.

**Acceptance for T1:**

- Everything in §7 passes in both engines.
- The build diff is exactly §6's.
- No new `viewport-overflow` flag appears at 302, 360, 393 and 430 px
  portrait.
- The profile, exports, backups and the native mirror are byte-for-byte as
  before.
- Yu has answered §8's copy and voice questions.

As with D3, the real test of the teaching is a playtest with first-time
players on a phone, and automation does not replace it.

---

## Appendix: facts checked in code

All read at `3f3d351`. None was run.

**The lobby and the rules dialog:**

- The lobby's first visit is `stats.played === 0 && !pending`
  (`navigation-ui.mjs:57`). It sets the title (`:63`), the 啟程遊歷 button
  (`:67`) and the 「初次落子？讀懂弈道」 link (`:71`).
- A new journey starts at `location: NODES[0].id`, which is `mist-gate`
  (`progression.mjs:142`), with 1,200 金幣 and 20 靈砂 (`:137`).
- `rules-start` and `start` share `prepareEncounter()`, whose default is
  practice (`app.mjs:1486,794`). `story-unlock` is the 霧隱渡口 route
  (`:1291-1293`).

**Battles and the coach:**

- `finishBattle` increments `stats.played` for every kind (`:640`), and
  `abandonBattle` does not (`:616-621`).
- `coachStart` requires an expedition at `mist-gate` with `played === 0`
  (`battle-teaching.mjs:217-218`).
- An expedition starts the coach through `startMatch` → `enterStartedBattle`
  → `startCoach({fresh:true})` (`app.mjs:1053-1066,782-784`).

**Dialog structure and the layout limits:**

- The rules dialog has one paged module (`scene-dialogs.mjs:85-92`), and a
  single module hides the tab row (`viewport.mjs:180`).
- Every visible control must be ≥ 43.5 px (`tools/viewport-smoke.mjs:92`).
- Header controls are 44 px (`scene-navigation.css:123-125`), and below
  330 px the header shows the brand mark alone (`viewport.css:37-38`).

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
