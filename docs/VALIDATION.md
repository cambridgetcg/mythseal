# Validation · v0.5.1 · 2026-09-21

v0.5.0 implements 旅程閣, player-session handling and account-private backups of editable offline journeys. Gameplay remains local; no authoritative economy, blockchain or player-to-player trading is implemented. SMTP is configured and the owner confirmed mailbox delivery/local-pilot login. v0.5.1 is deployed with public OTP enabled; real HTTPS OTP/session/logout checks passed with fixture cleanup verified. Public deployment and its exact release evidence belong in [HOSTING.md](HOSTING.md); local or hosted-database checks below do not establish that a new website version is live.

## D3 first-battle teaching · 2026-10-12

Branch `d3/first-battle-teaching`, from `origin/main` `335d2b7`; packet D3,
approved by the owner on 2026-10-11 for the proposed v0.6.0 scope. Source
commits `d240078`, `c1284ca`, `cc85bc3`, `d1b7f35`, `4fc692d` and `0029ef0`
(coach copy only); the documentation commits after them change no served,
test or tool file. Not merged, pushed or deployed; no hosted check, no network
request beyond the loopback server. Design:
[battle-table plan](BATTLE-LAYOUT-PLAN.md#first-battle-teaching--2026-10-12).

**Environment.** macOS 26.6.2 (Darwin 25.6.0), Node 26.0.0, Python 3.14.6,
Playwright 1.63.0, installed Google Chrome 154.0.8037.98 for Chromium and
Playwright WebKit 26.6, all headless. `python3 tools/serve.py --port 4204`
from the worktree, started after both `battle-teaching.*` files entered the
allowlist; `GAME_URL=http://127.0.0.1:4204` for every browser suite. Synthetic
saves only.

**Problem, as briefed.** The packet's 2026-10-11 measurements (an iPhone 15
WebKit playtest losing 8, 6 and 10 HP in round 1; the 400- and 300-game engine
simulations) are quoted in the plan. They were not re-run here.

**Checks at `0029ef0`:**

- `node --test tests/*.test.mjs`: exit 0, **569/569**, 16 of them new:
  11 in `tests/battle-teaching.test.mjs`, 2 in `tests/battle-table-view.test.mjs`,
  N23–N24 in `tests/nav-stack.test.mjs` and 1 in `tests/viewport.test.mjs`.
  `tests/engine.test.mjs` and `engine.mjs` are unchanged from `335d2b7`. The
  formula equals `resolveRound`'s player attack, damage and cost for every
  open announced card × draft × three hidden bids over 60 seeded matches and
  rounds 1–3 (more than 5,000 drafts); without an announced card it equals
  `previewMove`'s, is exact exactly when every possible reply agrees (both
  kinds over 100 cases each) and is otherwise labelled 預計. Every visible form
  is parsed and evaluates to the engine's number, including a clamped attack
  of 1. Two different hidden AI bids give the same formula. The tip equals
  match state after more than 200 seeded rounds, and a recording proxy shows
  it reads only `phase`, `next.round`, `rounds` and both sides' `pills`.
- `python3 -m unittest discover -s tests -p '*_test.py'`: 9 tests OK.
- `npm run audit:content`: exit 0, 150 entries (120 `local-playable`, 30
  `preview`), no findings.
- `npm run build`: exit 0, **86 public files** (84 plus `battle-teaching.mjs`
  and `battle-teaching.css`), manifest `5a0d2843…be891`.
- `git diff --check 335d2b7 HEAD`: exit 0.
- `npm run test:coach` (new; `tools/coach-smoke.mjs`, Chrome with the Pixel 7
  descriptor, then WebKit with the iPhone 15 descriptor): exit 0, **7/7 checks
  in each engine**, 18 s for both. On a fresh journey's first 霧隱渡口 battle the
  marks came in order ① → ② → ③ → ④; a hit test at the centre of each taught
  control (every hand card, ＋, Commit, then 繼續 in the reveal) reached it,
  and a tap on it advanced the mark. The hint box was taller than 1 px,
  inside the status row and the viewport, with no clipped sentence, and 跳過
  was a 44 px target clear of 對弈紀錄. The estimate equalled the engine's
  attack at mark ①, after two pills and in a later battle, and 預計 appeared
  exactly when the number was not exact. After the round-1 reveal the tip's
  `data-opponent-pills` and text equalled the saved match state. 繼續 recorded
  `done`; 跳過 recorded `skipped` and wrote only `shanhai.coach.v1`, with the
  profile and battle snapshot bytes unchanged; so did Back on the table's mark
  (the next Back opened keep/abandon) and Back on the reveal's mark (the tip
  stayed and the next Back held the result). History depth was 2 with a mark
  on the table and 3 over the reveal, and one less once the mark closed. No mark returned after
  completion or 跳過, after a reload in round 1, or in a restarted first battle
  (abandoned, so `stats.played` stayed 0). A 霧隱渡口 battle after one played
  battle, and a first practice match, showed no mark but the hint, the formula
  and (after round 1) the tip. A result left on 旅途所得, then a lost match:
  the loss opened on 勝負已定 with 悟 and its advice visible, and its own
  旅途所得 tab existed. With `viewport.forget` removed from `matchEndModal`, that
  check failed (Chromium) and the other six passed; restored, it passes.
- `npm run test:battle-table`: exit 0, **40/40 in Chrome and 40/40 in WebKit**
  (256 s). Its Mist Gate fixture is a first battle, so it now runs with the
  coach mark on the table at the six contract sizes; the 32-size sweep still
  finds every decision input hit-testable, no row overlap and the attack
  estimate's label whole on one line beside one-, two- and three-digit
  numbers.
- `npm run test:back`: exit 0, 16 checks in Chrome (including the bfcache
  checks) and 15 in WebKit.
- `npm run test:viewport`: exit 0, 23/23 in Chrome and 23/23 in WebKit.
- `npm run test:browser` (Chrome, the 14 suites chained with `&&`): exit 0,
  91 `PASS` lines; every error list printed empty.

`test:coach`, `test:battle-table`, `test:back`, `test:viewport` and
`test:browser` also passed (same counts) at `4fc692d`, before `0029ef0`
changed the wording of mark ②.

**Scratch evidence (not committed).** Before writing the smoke, a scratch
script measured the hint and the formula at 390×844, 360×640, 360×540,
844×390, 568×320, 768×1024 and 1440×900, with and without the coach: the hint
was 14 px tall on one line, or 28 px for a coach mark on a portrait phone, and
the formula's text box stayed inside its cell (the cell is 111 px wide at
568×320, where the compact forms are used).

**Not run or not shown:** the owner's playtest with at least three first-time
players, which is the real exit and is pending; physical iPhone and Android
phones, real Safari, Firefox, VoiceOver and TalkBack; the WebKit runs of
`test:browser`'s suites (only `test:coach`, `test:battle-table`, `test:back`
and `test:viewport` ran in WebKit); `test:commands`, `test:wx01`,
`test:inheritance`, `test:collection-display`, `test:expansion`,
`test:map-piece` and the literary preview smokes; `tools/battle-measure.mjs`
(input latency and first paint were not re-measured); deploy dry runs, the
SQL harness and CI.

**Review round 1 fixes · 2026-10-13.** Review round 1 reported eight findings
on `98df03b`, and independent reproductions confirmed all of them. They are
five defects: two pairs of findings describe the same one. They are fixed in
source commit **`9104ef0`** (`battle-teaching.mjs`, `app.mjs`,
`tests/battle-teaching.test.mjs`, and comments in `battle-teaching.css` and
`nav-stack.mjs`) and smoke commit **`f421044`** (`tools/coach-smoke.mjs`). The
documentation commit after them changes no served, test or tool file. No
allowlist change. Environment as above; `python3 tools/serve.py --port 4204`
started fresh from the worktree for these runs.

- **A clamped attack showed a false sum** (reported as medium and as low).
  When the terms add up to less than 1 (for example an announced 月蝕 −6 at 0
  pills), the engine counts 1, but every visible form ended `＝ 1` or showed
  the bare terms beside 1: `（力 6 − 1）×（1＋0 丹）− 6 ＝ 1` is really −1, and
  `6×1−6` is 0. The reviewers' simulations (the default deck against legacy or
  default decks, drafts at 0 pills) found it in about 4–7 % of opponent-led
  rounds, and never in the coached round 1. Every form now states the true sum
  and the minimum:
  `（力 6 − 1）×（1＋0 丹）− 6 ＝ −1 → 最低 1`, `(力6−1)×(1+0丹)−6＝−1→最低1`, …
  `5×1−6→最低1`. **Correction:** the entry above says "Every visible form is
  parsed and evaluates to the engine's number, including a clamped attack of
  1". That was not true: the test compared `Math.max(1, value)`, and its fixture
  pinned the false text. The test now requires each form's sum to equal the
  attack, or to be under 1 with the minimum shown. The announced-card sweep
  must now include clamped drafts, and both reviewers' fixtures are pinned. With
  the old `formulaVariants`, 2 of the 11 tests in that file fail.
- **With Fury on, the cost line hid the pills left** (low and medium). The
  `怒擊 傷 N · ` prefix pushed `剩 M 丹` behind the ellipsis of `#cost-note` on
  every phone size measured, in both engines. Under 600 px tall, where the
  player's caption yields, the pills left were then shown nowhere as a number
  (only as pill capsules). The cost
  line is the pre-D3 `共消耗 N 丹 · 剩 M 丹` again, and the Fury toggle's note
  states the damage while Fury is on (`另付 3 丹 · 傷害 7`, or `預計傷 7`); off,
  it still states the rule. `test:coach` now turns Fury on with 0 (or 1) and 9
  pills on the device and at 360×640 and 360×560. It checks that the cost line
  reads exactly the cost and the pills left with `scrollWidth ≤ clientWidth`,
  and that the Fury note names the engine's damage inside its button, clear of
  the switch. With the old cost text, `test:coach` fails in Chromium at the
  first of these checks (Pixel 7, 412×839).
- **Coach mark ② was cut at 360 px in Chromium** (medium twice; one verifier:
  low). `0029ef0` made it 33 characters. At 360 px the hint is 193 px wide,
  Chromium needed three lines, and the two-line clamp hid 盡。. WebKit fit it,
  by about 1 px. The copy is now 按＋投入仙丹：攻擊＝力×（1＋丹）。十二丹撐四回合，莫一次押盡。
  (32 characters). `test:coach` now measures every copy of marks ①–③ (both
  leaders, both commit labels) in the real hint at 360×640 and 360×560, and
  walks ①–③ there. With the old copy it fails in Chromium ("the pills copy …
  fits two lines, not 3"). The unit test's character count is now only a
  budget (at most 32). **Correction:** the entry above found the coach sentence
  unclipped only on the two device sizes (412 and 393 px wide). From
  `0029ef0` on, the claim in the plan and in code comments that the copy fits
  two lines at 360 px was false in Chromium, and `test:battle-table`'s 40/40
  did not check clipping.
- **Back during the animated round-1 reveal skipped mark ④ unseen** (low).
  Mark ④ counted as a Back layer as soon as the result opened, while the footer
  still hid it, so Back recorded 跳過 and ④ never showed. It now counts only
  once the reveal has completed, and the completed reveal queues the history
  sync, which pushes its entry on the commit's user turn. With full motion and
  normal pace, `test:coach` presses Back while `data-reveal-state` is
  `animating`. The history depth stays 2, nothing is recorded, ④ and 知道了
  then show, and the next Back closes ④ as 跳過 while the result stays. In a
  second run without that Back, the depth goes from 2 to 3 when ④ shows. With
  the old `dialogCoach`, `test:coach` fails ("no coach layer while mark ④ is
  hidden: … depth 2 (now 3)").
- **預計 and the announced-card formula were untested in the browser**
  (medium; one verifier: low). Every formula check had run on an exact,
  player-led draft. `test:coach` now selects 青霄 in round 1 of the first
  battle, with 霜璃 still in the opponent's hand. It requires the visible line
  to start with 預計 and `data-attack-exact` to be `false`. In the opponent-led
  round 2 it checks every open draft against `resolveRound` with the stored AI
  move, as exact and with 已計對手亮牌. With the `<b>預計</b>` prefix removed
  from `app.mjs`, `test:coach` fails at 青霄. With `announcedCardId: null` in
  the formula call, it fails in round 2. **Correction:** the entry above says
  "預計 appeared exactly when the number was not exact". The assertion held
  only trivially: no number in that run was 預計.

Each failure above came from reverting only that fix (for the last item,
removing only that wiring) in the worktree, before the commits; the file was
then restored, and the suites below ran on the committed code.

Checks at `f421044`, all browser suites with `GAME_URL=http://127.0.0.1:4204`:

- `node --test tests/*.test.mjs`: exit 0, **569/569**. No test was added; the
  formula, cost, Fury-note and copy tests in `tests/battle-teaching.test.mjs`
  were tightened as above.
- `python3 -m unittest discover -s tests -p '*_test.py'`: 9 tests OK.
- `npm run audit:content`: exit 0, 150 entries (120 `local-playable`, 30
  `preview`), no findings.
- `npm run build`: exit 0, 86 public files, manifest `d73d6946…f571`.
- `git diff --check 98df03b f421044`: exit 0.
- `npm run test:coach`: exit 0, **9/9 checks in each engine** (Chrome
  154.0.8037.98 with Pixel 7, then WebKit 26.6 with iPhone 15), 36 s for both.
- `npm run test:battle-table`: exit 0, 40/40 in Chrome and 40/40 in WebKit
  (286 s). At its six contract sizes it turns Fury on for every open card at 3
  pills, and its Fury-switch check (the note inside its button, clear of the
  switch) passed with the new note.
- `npm run test:back`: exit 0, 16 checks in Chrome and 15 in WebKit.
- `npm run test:viewport`: exit 0, 23/23 in Chrome and 23/23 in WebKit.
- `npm run test:browser` (Chrome, 14 suites): exit 0, 91 `PASS` lines; every
  printed error list was empty.

Not run or not shown: the owner's playtest with first-time players (still the
real exit); physical phones, real Safari, VoiceOver and TalkBack; layouts
narrower than 360 px (the 340 px minimum) and fonts other than the headless
engines'; the WebKit runs of `test:browser`'s suites; `test:commands`,
`test:wx01`, `test:inheritance`, `test:collection-display`, `test:expansion`,
`test:map-piece` and the literary preview smokes; `tools/battle-measure.mjs`;
deploy dry runs, the SQL harness and CI.

## D1 Back model · 2026-10-12

Branch `d1/back-model`, from `origin/main` `7712a7b`; packet D1, approved by the
owner on 2026-10-11 for the proposed v0.6.0 scope. Source commits `17a64e0`,
`97543e8`, `37ca36c`, `c86e529` (comments only), `cf14ee7` and `e2e1474`
(smoke messages only); the documentation commits after them change no served,
test or tool file. Not merged, pushed or deployed; no hosted check, no network
request beyond the loopback server. Design and decision table:
[NAVIGATION](NAVIGATION.md#back-model--2026-10-12).

**Environment.** macOS 26.6.2 (Darwin 25.6.0), Node 26.0.0, Python 3.14.6,
Playwright 1.63.0, installed Google Chrome 154.0.8037.98 for Chromium and
Playwright WebKit 26.6, all headless. `python3 tools/serve.py --port 4201` from
the worktree, started after `nav-stack.mjs` entered the allowlist;
`GAME_URL=http://127.0.0.1:4201` for every browser suite. Synthetic saves only.

**Problem reproduced.** With `7712a7b`'s `app.mjs` served (everything else as
on the branch), a scratch Playwright script opened the game, then either tapped
遊歷 in the dock or opened the quest panel, then called `page.goBack()`. In
Chrome (Pixel 7 descriptor) and WebKit (iPhone 15 descriptor) both cases landed
on `about:blank`. With the branch's `app.mjs` all four stayed on the game.

**Checks at `e2e1474`:**

- `node --test tests/*.test.mjs`: exit 0, **548/548** (530 on `7712a7b`, plus
  17 in `tests/nav-stack.test.mjs`, N1–N17, and one in `tests/hosting.test.mjs`).
  N1–N3 cover every row of the decision table; N5 checks that each Back closes
  one layer and only the root leaves; N6 replaceState for destination switches;
  N7 that ×/Escape/backdrop consume their own entry and that popstate is not a
  second close; N8 that a result holds, the guard entry is re-armed with
  `history.go(+1)`, there is no push from popstate and the settlement count is
  unchanged; N9 the battle guard; N10 pushes only on a user turn; N11–N12 stale
  entries after a reload (the root leaves in one Back); N13 Forward and a
  bfcache `pageshow`; N14 a user Back racing the game's own walk; N15
  `requestBack()` for native shells; N16 a seeded 30-step walk (25 runs) keeping
  `history.length` ≤ initial + 4; N17 recovery from a walk that never lands.
- `python3 -m unittest discover -s tests -p '*_test.py'`: 9 tests OK.
- `npm run audit:content`: exit 0, 150 entries (120 `local-playable`, 30
  `preview`), no findings.
- `npm run build`: exit 0, **84 public files** (83 plus `nav-stack.mjs`),
  manifest `91a83554…998b`.
- `git diff --check 7712a7b HEAD`: exit 0.
- `npm run test:back` (new; `tools/back-smoke.mjs`, Chrome with the Pixel 7
  descriptor, then WebKit with the iPhone 15 descriptor): exit 0, **11/11
  checks in each engine**, about 12 s per engine. From 遊歷, 對弈, 藏卡, 市集,
  the codex tab, a collection group, a card page, quests, settings, rules,
  preparation, its deck editor, the lobby's two-layer continue and 旅程閣
  (from 洞府 and from 遊歷), each `page.goBack()` closed exactly one layer, and
  no `about:blank` occurred before the 洞府 root. After Back closed a card page
  opened from the second page of a 雲-filtered copy list, the same copies (by
  UID) and the filter were shown. A seeded 30-step walk (3 ×, 2 Escape,
  2 backdrop and 4 Back steps, 19 openings, up to three layers) kept
  `history.length` at most 5 against 2 on load (≤ initial + 4). In a battle,
  Back opened keep/abandon twice, closed it in between, and left the profile
  bytes and write count unchanged. On the round and the match result, two
  Backs each held the dialog. The save equaled exactly one `finishBattle`
  computed in Node on the same synthetic save (+90 coins, `stats.played` 1),
  with one profile write. A reload with a card page open, and a reload on the
  match result, then Back: the page opened at 洞府 and Back left it in one
  step past the earlier load's entries, with no prompt and no write; Forward
  came back with the same save bytes and no second settlement.
- `npm run test:viewport`: exit 0, 23/23 in Chrome and 23/23 in WebKit.
- `npm run test:commands`: exit 0, 13/13 groups (B1–B11) in Chrome and in WebKit.
- `npm run test:battle-table`: exit 0, 40/40 in Chrome and 40/40 in WebKit.
- `npm run test:browser` (Chrome, the 14 suites chained with `&&`): exit 0,
  91 `PASS` lines; every suite that prints an error list printed an empty one.

Also run earlier: `npm run test:browser` at `37ca36c`, before `cf14ee7`
changed `nav-stack.mjs` (and while `c86e529` changed two comments): exit 0,
the same 91 `PASS` lines. A sibling packet's suites shared the machine for part
of that run.

**Not run or not shown:** physical Android phones with gesture navigation
(including Android 16 predictive back) and the iOS Safari edge swipe, which are
M5.1 items not yet verified. Also not covered: whether a real Back button skips
any entry under Chrome's or WebKit's history-manipulation rules, since
Playwright's `goBack()` steps to the previous entry by index; a real bfcache
restore: in both engines Forward loaded a new document (a scratch script saw
`pageshow.persisted` false and navigation type `back_forward`), so the bfcache
path is covered only by the Node test N13; Firefox; desktop sizes in
`test:back`; the Capacitor back-button wiring (M5.2); the literary preview
smokes, since no preview file changed; the WebKit runs in `test:wx01`,
`test:inheritance` and `test:collection-display` (their Chrome suites ran
inside `test:browser`); `test:expansion` and `test:map-piece`; deploy dry runs,
the SQL harness and CI.

**Review fixes · 2026-10-12.** Review round 1 reported two findings, and both
were confirmed. They are fixed in source commits **`cfaa315`**
(`nav-stack.mjs`, `tests/nav-stack.test.mjs`) and **`ab73577`**
(`tools/back-smoke.mjs`). The documentation commit after them changes no served,
test or tool file. The environment is the same as above.

- **Medium: dead Back after a reload when the game is the tab's first entry.**
  The reload result above (Back left 洞府 "in one step past the earlier load's
  entries") held only because the Node harness and every Playwright page put
  `about:blank` before the game. A reload kept the earlier load's entries below
  its root, and Back at the root jumped past them with `history.go(-(abs+1))`.
  With no page before the game (a new tab, a home-screen shortcut, a Custom
  Tab), that jump is out of range and the browser ignores it. Back then did
  nothing once for each layer that was open at the reload. Each such reload
  also added entries for good: six cycles took `history.length` from 2 to 14.
  Now `start()` walks back to the tab's first game entry and makes it the root.
  The earlier entries then sit ahead, and the next push drops them. If the walk
  never lands within 3 s, the reloaded entry stays the root as before.
  Regression tests: N18 (no `about:blank` in the simulated tab) and N19 (six
  reload cycles). Both fail with `nav-stack.mjs` reverted to `1a1ff8f`
  (`0 !== 1` system Backs; `6 !== 4` entries) and pass with the fix. N11, N12
  (now the fallback for a walk that never lands) and N15 were updated. With the
  same revert, the full `test:back` stopped at its new wait for the walk back
  (`abs now 3`). A scratch copy that ran only the two new smoke checks, without
  that wait, showed `history.length` 2→4→6→8→10→12→14 in both engines. In the
  popup, Back at 洞府 landed on an earlier entry: the CDP history index was not 0
  in Chrome, and a popstate fired in WebKit.
- **Low: `requestBack()` wording.** NAVIGATION, MOBILE-RELEASE and the code
  comment said it makes no history traversal. In fact, when a row closes a
  layer it walks back over that layer's entry with `history.go(-1)`. The wording
  is corrected, and N15 now asserts that `go(-1)`.

Checks at `ab73577`, all browser suites with `GAME_URL=http://127.0.0.1:4201`:

- `node --test tests/*.test.mjs`: exit 0, **550/550** (N18 and N19 added).
- `python3 -m unittest discover -s tests -p '*_test.py'`: 9 tests OK.
- `npm run audit:content`: exit 0, 150 entries (120 `local-playable`, 30
  `preview`), no findings.
- `npm run build`: exit 0, 84 public files, manifest `7e445126…f2d`.
- `git diff --check 7712a7b HEAD`: exit 0.
- `npm run test:back`: exit 0, **13/13 checks in each engine** (the 11 above
  plus two). Six reloads with 遊歷 and settings open kept `history.length` at
  2→4→4→4→4→4→4, and one Back then left 洞府. A `window.open` popup started
  with `history.length` 1. After a reload with two layers open, it was on the
  tab's first entry (CDP index 0 in Chrome), and the first Back at 洞府 fired
  no popstate and left it at 洞府. The next push left `history.length` at 2.
- `npm run test:commands`: exit 0, 13/13 groups in each engine.
- `npm run test:battle-table`: exit 0, 40/40 in each engine.
- `npm run test:viewport`: exit 0, 23/23 in each engine.
- `npm run test:browser` (Chrome, 14 suites): exit 0, 91 `PASS` lines, and
  every printed error list empty.
- `npm run test:wx01` (Chrome then WebKit): exit 0, 54 `PASS` lines.
  `npm run test:inheritance`: exit 0, 18. `npm run test:collection-display`:
  exit 0, 20. All printed error lists were empty.
- `npm run test:expansion`: **exit 1**. Chrome passed (16 checks, 899 layout checks).
  WebKit failed after 6, at `360x740/rewards/grants`, because one `module`
  action was 43.08 px wide (under 44 px). With `7712a7b`'s `app.mjs` served
  (no Back model; D1 changes no CSS or HTML), the WebKit run failed the same way
  at the same width. So the failure predates D1 in this environment, and D1 did
  not cause it.

Not run or not shown: physical phones, so the system Back at a first-entry root
(Android Custom Tab or home-screen launch, iOS) is unverified; a Capacitor
WebView's `canGoBack`; a startup walk that a real browser drops (only N12
covers that fallback); `test:map-piece`; the literary preview smokes; deploy
dry runs, the SQL harness and CI.

**Review round 2 fixes · 2026-10-12.** Review round 2 reported two low
findings, and independent reproductions confirmed both. They are fixed in
source commits **`64918c1`** (`nav-stack.mjs`, `tests/nav-stack.test.mjs`),
**`0b60592`** (`app.mjs`) and **`73e84ed`** (`tools/back-smoke.mjs`). The
documentation commit after them changes no served, test or tool file. The
environment is the same as above (versions re-read). For this round,
`python3 tools/serve.py --port 4201` was started from the worktree; no
allowlist file changed.

- **Low: after a game reload, Forward could not reach a later page.**
  `cfaa315`'s startup walk also runs when Back returns to a game entry from a
  page opened in the same tab and the bfcache misses (the loopback server's
  `no-store`, Playwright's default, eviction). The earlier load's entries then
  sat between 洞府 and that page, and Forward into them stepped back to the
  root, so the page was never reached again. Reviewers saw this in both
  engines; at `1a1ff8f` the first Forward reached it. Each entry now also
  stores `first`, the tab-history index of the tab's first game entry. A
  Forward onto an entry above the layers held steps on with `history.go(+1)`
  while `history.length` shows an entry past it, and steps back as before when
  none does. This also lets Forward pass a closed layer's own entries without a
  reload. A bfcache restore on the entry Forward left from walks back to the
  layers held, and a Back racing a step on counts from the layers held.
  Regression tests: N20, and the back-smoke check "Back into the game from a
  page opened in the same tab", which mirrors the reviewers' steps (遊歷,
  settings, `/playtest.html`, Back, then Forward). With `nav-stack.mjs` at
  `d1120b5`, N20 fails ("Forward reached the page opened after the game":
  false). `tools/back-smoke.mjs` then passed 13 checks in each engine and
  failed at the new check (`page.waitForURL` timeout for `/playtest.html`). N20's
  racing-Back assertion also fails when only the new count from the layers held
  is reverted.
- **Low: Back held forever after a failed settlement on resume.** `navView`
  read the battle as "settling" from `busy`. `resumeBattle()` leaves `busy` set
  for a finished snapshot when `recordFinishedMatch()` throws (a full quota).
  The first Back closed the pending dialog, and every later Back held on what
  the player sees as 洞府. `recordFinishedMatch()` now sets `settling` around its
  save (`try`/`finally`), and `navView` reads that flag. Regression test: the
  back-smoke check "a settlement that fails on resume". It makes the profile
  save throw a `QuotaExceededError` and clicks 繼續對局. Back then closes the
  dialog, then the battle layer (entry depth 0), then leaves, with no profile
  write. With `app.mjs` at `d1120b5` and everything else at `73e84ed`, it fails
  in both engines after 14 checks (`home: history entry depth 0–0 (now 1)`).
  `resumeBattle()`'s catch still leaves `screen` at `'battle'` under the lobby.
  That predates D1, so on this path one Back changes nothing visible before the
  next one leaves.

Checks at `73e84ed`, all browser suites with `GAME_URL=http://127.0.0.1:4201`:

- `node --test tests/*.test.mjs`: exit 0, **551/551** (N20 added).
- `python3 -m unittest discover -s tests -p '*_test.py'`: 9 tests OK.
- `npm run audit:content`: exit 0, 150 entries (120 `local-playable`, 30
  `preview`), no findings.
- `npm run build`: exit 0, 84 public files, manifest `cff14488…0fae`.
- `git diff --check 7712a7b HEAD`: exit 0.
- `npm run test:back`: exit 0, **15/15 checks in each engine** (the 13 above
  plus two). In both engines, the game came back from `/playtest.html` as a new
  load (navigation type `back_forward`, `pageshow.persisted` false) and walked
  back to abs 0. One `page.goForward()` then reached `/playtest.html` with no
  entry added, and after Back again one Back left 洞府.
- `npm run test:commands`: exit 0, 13/13 groups in each engine.
- `npm run test:battle-table`: exit 0, 40/40 in each engine.
- `npm run test:viewport`: exit 0, 23/23 in each engine.
- `npm run test:browser` (Chrome, 14 suites): exit 0, 91 `PASS` lines, and
  every printed error list empty.
- `node tools/expansion-smoke.mjs` (Chrome only): exit 0, 16 checks and 899
  layout checks.

Not run or not shown: a real bfcache restore after Forward stepped past
entries (only N20 covers it; every return in these runs was a new load); a
browser that has dropped its oldest entries, where `first` is too high (reasoned,
not run); physical phones; the WebKit half of `test:expansion` (it failed
before D1 in this environment, above); `test:wx01`, `test:inheritance`,
`test:collection-display` and `test:map-piece`; the literary preview smokes;
deploy dry runs, the SQL harness and CI.

**Review round 3 fixes · 2026-10-12.** Review round 3 reported two medium
findings with one cause, and independent reproductions in Chrome with the
bfcache on confirmed both. They are fixed in source commit **`4e99590`**
(`nav-stack.mjs`, one `app.mjs` line, `tests/nav-stack.test.mjs`) and smoke
commit **`dde373d`** (`tools/back-smoke.mjs`). The documentation commit after
them changes no served, test or tool file. The environment is the same as
above. For this round, `python3 tools/serve.py --port 4201` was started from
the worktree; no allowlist file changed.

- **Medium (both findings): after Forward stepped past an earlier load's
  entries, Back bounced between the game and the later page.** Production
  allows the bfcache (`hosting/_headers` sends `public, max-age=0,
  must-revalidate`). The reviewers reached it in two ways: a reload at 洞府,
  or `history.go(-2)` / `history.go(-3)` from the later page (the Back menu,
  or a fast double Back), which loads the game anew below its top entry. In
  both, the entries ahead of the root still hold the earlier load's state,
  and `64918c1`'s Forward steps past them, so the page leaves from one of
  them. `pageshow` trusted a restored entry's position only when the entry
  held this load's session id; otherwise it took the root. Restored on that
  abs-2 entry, the page walked nothing back. The next Back landed on abs 1,
  which the Forward step-on read as a Forward, and stepped on to the later
  page again. So every Back from the game returned to that page. The round 2
  note's sentence "A bfcache restore on the entry Forward left from walks back
  to the layers held" (and the matching NAVIGATION sentence) held only for an
  entry the current load wrote. From `4e99590`, `pageshow` takes the position
  stored in the restored entry, whichever load wrote it, since `abs` counts the
  tab's game entries from the first one across reloads. The sentence then holds
  for every entry, and NAVIGATION says so.
- **Also fixed, found while checking the fix: a second walk past 洞府 after 3 s
  away.** A restore fires `visibilitychange` before `pageshow`, and the game's
  handler renders, which queues a reconciliation. After 3 s or more away
  (`NAV_STALL_MS`), that reconciliation gave up the pending step and walked
  back on its own; `pageshow` then walked again. Restored on an entry the
  current load wrote, with a page before the game, Chrome ended on that page
  (`about:blank`, history index 0) with `893f2d4`'s `app.mjs` and
  `nav-stack.mjs` served. On an earlier load's entry `893f2d4` walked only once,
  because `pageshow` took the root; the first fix alone would have made that
  case walk twice too. Now a persisted `pagehide` holds reconciliation until
  `pageshow` (a popstate or an input also releases it). `app.mjs` gains one
  line after the `pageshow` listener:
  `window.addEventListener('pagehide',event=>nav.pagehide(event.persisted));`.
- **Regression checks.** N21 runs the three ways to leave from an earlier
  load's entry (a reload at 洞府, a jump of 2, a jump of 3), each with and
  without `about:blank` before the game: the restore walks back to the root,
  and the next Back leaves (or goes to the system). N22 restores after 5 s
  away, on this load's entry and on an earlier load's, with the render before
  `pageshow`: exactly one `history.go(-2)`. The harness now fires `pagehide`
  whenever the page leaves. The new back-smoke check (Chrome only) uses a
  second browser launched without `--disable-back-forward-cache`, whose route
  serves production's `Cache-Control` instead of `no-store`. It runs a reload
  at 洞府 and a `history.go(-2)`, each restored on the earlier load's abs-2
  entry. It also runs closed layers with a page before the game and 5 s away:
  the smoke's fixed clock moves on when the page is shown again, before the
  game's `visibilitychange` handler. Each case asserts a real restore
  (`pageshow.persisted`), one walk to 洞府 (CDP history index) and that the next
  Back leaves.
- **With each fix reverted.** In Node, with the `pageshow` line reverted (hold
  kept), N21 fails (`reload at 洞府: the restore walked back to the root`,
  `3 !== 1`) and N22 fails on the earlier load's entry (no walk). With the hold
  removed (`pagehide` a no-op), N22 fails on this load's entry (`[-2, -2]`).
  With `893f2d4`'s `nav-stack.mjs` plus an empty `pagehide()`, both fail. The
  other tests pass each time. In Chrome, a scratch copy of the smoke had its route
  serve the variant `app.mjs` and `nav-stack.mjs`. With `893f2d4`'s files, the
  reload and jump cases failed (`abs now 2`) and the 5 s case ended on
  `about:blank` at index 0. With only the `pageshow` line reverted, the reload
  and jump cases failed and the 5 s case passed. With only the hold removed,
  the reload and jump cases passed and the 5 s case ended on `about:blank`.

Checks on the tree committed unchanged as `4e99590` and `dde373d`, all browser
suites with `GAME_URL=http://127.0.0.1:4201`:

- `node --test tests/*.test.mjs`: exit 0, **553/553** (N21 and N22 added).
- `python3 -m unittest discover -s tests -p '*_test.py'`: 9 tests OK.
- `npm run audit:content`: exit 0, 150 entries (120 `local-playable`, 30
  `preview`), no findings.
- `npm run build`: exit 0, 84 public files, manifest `2beb9777…bb80`.
- `git diff --check 7712a7b`: exit 0.
- `npm run test:back`: exit 0, **16/16 checks in Chrome** (the 15 above plus
  the bfcache check) and **15/15 in WebKit**.
- `npm run test:commands`: exit 0, 13/13 groups in each engine.
- `npm run test:viewport`: exit 0, 23/23 in each engine.
- `npm run test:battle-table`: exit 0, 40/40 in each engine.
- `npm run test:browser` (Chrome, 14 suites): exit 0, 91 `PASS` lines, and
  every printed error list empty.

Not run or not shown: a bfcache restore in WebKit (the reviewers saw
`pageshow.persisted` false in Playwright's WebKit; not re-checked here, and the
new check is Chrome only); real phones, including iOS Safari's page cache; a
real browser restoring an earlier load's entry after 3 s away (only N22 covers
that; the Chrome case after 5 s away restores this load's entry); Firefox;
`test:expansion`, `test:wx01`, `test:inheritance`, `test:collection-display` and
`test:map-piece`; the literary preview smokes; deploy dry runs, the SQL harness
and CI.

## Q1 integration with `main` · 2026-10-11

Branch `q1/local-commands`, for PR #10. Merge commit **`b527dc3`** brings
`origin/main` `b40c4d2` (PRs #6–#9) into `2ad6da9`; the commits after it change
documentation only. No deployment, no hosted check and no network request.
Node 26.0.0 on macOS.

**Merge.** Git reported conflicts only in `docs/HANDOVER.md` and
`docs/VALIDATION.md`, where both sides had added 2026-10-11 sections. Both
sides' sections were kept whole: Q4 and LZ-01 first, then Q1. Checked
afterwards:

- Every other path in `b527dc3` equals the tree that `git merge-tree
  --write-tree 2ad6da9 b40c4d2` produces, and neither conflicted file contains
  a conflict marker.
- Against `b40c4d2`, both files only gain lines (77 and 368). Against
  `2ad6da9`, VALIDATION only gains lines (663), and HANDOVER loses only the
  seven lines that `main` had itself replaced since `8afbabc` (two in its
  opening paragraph and five in the LZ-01 preview notes).
- Against `2ad6da9`, no public file changes; the merge adds PR #8's preview
  files and PR #9's tooling.

**Checks at `b527dc3`:**

- `node --test tests/*.test.mjs`: exit 0, **530/530** (Q1's 510 plus the 20
  that PRs #8 and #9 added on `main`).
- `python3 -m unittest discover -s tests -p '*_test.py'`: 9 tests OK.
- `npm run audit:content`: exit 0, 150 entries (120 `local-playable`, 30
  `preview`), no findings.
- `npm run build`: exit 0, **83 public files** (`main`'s 80 plus Q1's
  `command-ledger.mjs`, `local-commands.mjs` and `profile-fence.mjs`),
  74,389,154 B, manifest `10f594fc…4014`.
- `git merge-base --is-ancestor 7a7d03e b527dc3`: exit 0, so the fence is in
  the tree that PR #10 brings to `main`.

**Documentation.** The commits after the merge add docs-index rows for
[LOCAL-COMMANDS](LOCAL-COMMANDS.md) and [RELEASE-NEXT](RELEASE-NEXT.md), bring
the status lines in ROADMAP, HANDOVER, EXPERIENCE-MODULES, LOCAL-COMMANDS,
BATTLE-LAYOUT-PLAN and NAVIGATION up to the merges (Q0 in PR #5, `bca9ab4`;
Q4 in PR #9, `b40c4d2`; Q1 by PR #10), and take Q1 into the v0.6.0 plan, whose
§13 lists the plan's own checks. The dated entries below for Q4, Q1 (with its
review rounds) and Q0 were written on their branches before those merges and
are left as written. On those documentation commits: `git diff --check` is
clean, and a local Markdown link and anchor check over `docs/*.md`,
`ROADMAP.md` and `README.md` (scratch script approximating GitHub's heading
slugs) finds every link target and anchor.

Not run at `b527dc3`: any browser suite (`npm run test:commands` last passed
at `38fa64f`, and `test:browser`, `test:inheritance` and `test:wx01` at
`1afaf6b`, as recorded below; the merge changes no public file), the literary
preview smokes for PR #8's files, deploy dry runs, the SQL harness and CI.

## Q4 content registry · 2026-10-11

Local branch `q4/content-registry`, started from `origin/main` `8afbabc`. Source
commit **`4265039`** adds `tools/content-registry.mjs`,
`tests/content-registry.test.mjs` and the `npm run audit:content` script. Review
fix commits **`7291880`** and **`cf63bec`** close the gaps two reviews found
(below). Five later commits also change source: merge commit **`d1f0f91`**
adapts the registry and its tests to PR #8's LZ-01 specials, **`6bc784a`**
fixes a third review's findings, **`092f1fd`** a fourth's, **`2d44071`** a
fifth's, and **`2a04859`** a sixth's. Merge commit `d606447` brings in `origin/main` `daf18ed` (documentation only), and
the remaining commits change documentation only; each source step below lists the checks run on it. The branch is not
merged into `main`, pushed or deployed, and there was no hosted check. The
registry's own commits change no game runtime, save schema, content, art or
allowlist file; the PR #8 merge brought in that branch's LZ-01 content, art and
preview-allowlist changes. Design and scope are in
[EXPERIENCE-MODULES](EXPERIENCE-MODULES.md#q4--content-registry-and-honest-capability-visibility);
statuses and capability states are defined in
[Q4 registry states](EXPERIENCE-MODULES.md#q4-registry-states).

- `node --test tests/*.test.mjs`: **473/473**, exit 0, Node 26.0.0, at
  `cf63bec`. The base has 456; `4265039` added 9, `7291880` added 4 and
  `cf63bec` adds 4.
- **Second review fixes in `cf63bec`** (all tooling metadata; no player, save
  or build effect):
  - The asset walker missed CSS `@import "x.css"` (only `@import url(...)` was
    followed), non-image `assets/` literals such as `new Audio('assets/sfx/…mp3')`,
    `.gif`, `srcset` and `<video>`/`<audio>` sources. In a scratch copy, adding
    either load left the audit, the build and all 469 tests passing. The walker
    now follows those and the other load forms listed in EXPERIENCE-MODULES; the
    current tree's references are byte-for-byte the same as before. A path built
    at runtime is still invisible to it.
  - Every campaign encounter listed `claimExpansionGrant`, though 39 of 48
    first clears bank no grant, and no encounter or the activity listed
    `openWX01Ticket`, though six volume finals and the weekly fire-mountain
    clears bank tickets. Reward rules are now per node and checked against what
    each clear actually banks.
  - Legacy acquisition omitted the 16 starter and welcome copies that
    `createProfile` mints and the v2 save migration in `hydrateProfile`. Both
    are listed and checked against a new journey and three v2 migrations.
  - Preview printings said "preview pages never write a profile", but the
    preview-allowlisted `playtest.html` writes coins and a gift marker. The
    reason now names the serving pages (`liaozhai.html`, `honglou.html`) and
    whether they load `profile-store.mjs`.
  - A test that called `t.skip()` in its body still counted as evidence. A body
    that calls its context's `skip()`/`todo()`, even conditionally, and a
    declaration inside a block comment or a string no longer count.
  - Mutation check in scratch copies (APFS clones, deleted afterwards): removing
    the volume-final ticket, the weekly ticket or the campaign-final AA from
    `progression.mjs`; a `t.skip()` evidence body, a plain `@import` or an
    unlisted `new Audio(...)`; and reverting each of the seven tool changes, each
    made `node --test tests/content-registry.test.mjs` exit 1 (13 of 13). The
    three source-drift mutants also made `node tools/content-registry.mjs`
    exit 1. Before this commit, the ticket removals failed only
    `tests/expansion-progression.test.mjs`.
- **Review fixes in `7291880`:**
  - The dead-reference check skipped `unlock.rule` and the references inside
    backup limits, so renaming `isNodeUnlocked`, `assertLegacyExpansionBoundary`
    or either cloud-save limit test left the audit at exit 0. It now resolves
    every reference-shaped string in an entry; limits hold `{ text, references }`,
    and prose that embeds a reference is its own finding. In a scratch copy,
    renaming `isNodeUnlocked`, `assertLegacyExpansionBoundary` and the activity
    limit test, and skipping one evidence test, made `node tools/content-registry.mjs`
    exit 1 with four `dead-reference` findings. The suite injects each of these,
    and the other limit test's rename, as a separate case.
  - A test disabled with `{ skip }` still counted as evidence. Skip/todo options
    and `//`-commented declarations no longer resolve; a test hidden behind
    `if (false)` still cannot be detected statically.
  - Acquisition omitted the westward story AA gift, the campaign-final AA choice
    and the fire-mountain first-clear BASE. They are listed now, and a test plays
    every story and expansion grant route on every WX-01 printing and requires an
    exact match with the listed routes.
  - `loadContentSources(root)` redirected file reads but not the content modules.
    It now takes no root and throws if given one.
  - Mutation check in scratch copies: removing any of the three new grant routes,
    reverting the reference collection, the skip handling, the embedded-reference
    check or the root guard, or deleting a fault case, each made
    `node --test tests/content-registry.test.mjs` fail (8 of 8 mutations).
- `node tools/content-registry.mjs`: exit 0, `findings: []`. It derives 150
  entries: encounters 6 original, 12 story and 48 campaign; one activity; 24
  legacy, 29 WX-01, 19 LZ-01 and 11 HL-01 printings. Statuses are 120
  local-playable, 24 preview and 6 planned.
- **Rules-level routes:** all 68 advertised encounter routes (66 owned, plus
  borrowed decks on `echo-1-7` and `echo-6-7`) start, complete and pay their
  first clear once. Each rejects a duplicate completion and unlocks the next
  node, which was locked before. Both fire-mountain routes complete twice with
  one first-clear grant. These checks call `progression.mjs` directly, not the
  browser UI.
- **Backup:** a v3 cloud snapshot round trip keeps all 66 clears, the activity
  record and grants, and one copy of each of the 53 ownable printings.
- **Fault injection:** each of the 27 finding codes fires on an injected fault,
  and a test fails if a code in the source has no case. 23 codes fire on a
  deliberately broken copy of the sources, for example a dropped public map, a
  leaked LZ-01 atlas, an unknown card or illegal authored deck, a dangling,
  circular or second root prerequisite, a printing with absent or missing art, a
  wrong activity drop, a bound planned special, checklist or brief drift, an
  unlisted import, a preview import and a renamed or skipped referenced test or
  rule. The other 4 guard the registry's own shape (an owned-copy `uid`, a
  server-authority claim, a missing reason, an embedded reference), which the
  current derivation does not produce, so their cases alter a built registry. Before
  `7291880` only 10 of the then 26 codes had an asserted case.
- `npm run build`: exit 0, 80 public files, the same allowlist as the base
  (re-run at `cf63bec`, unchanged).
- **Audit result:** nothing inconsistent in current content. All 60 authored
  opponent decks are legal, so `app.mjs:opponentDeck` never silently falls back to
  its random legacy deck. Every allowlisted file is used, nothing a served page
  loads through a statically visible reference is unlisted, and no preview file
  reaches the public graph.
- **Observations, not fixed:** the six original encounters have no authored
  opponent deck; `app.mjs:opponentDeck` shuffles the legacy roster with
  `Math.random`, so that choice is not injectable. `engine.mjs` declares no rules
  version. The registry reports both instead of inventing values. The audit
  requires a reason only for an `unavailable` capability; `not-applicable`
  reasons are checked by the test suite for today's entries, not by
  `npm run audit:content`.
- **Documentation finish (later on 2026-10-11).** These commits add
  [Q4 registry states](EXPERIENCE-MODULES.md#q4-registry-states), the ROADMAP
  status and a shorter handover note. Their game, test and tool files are
  identical to `cf63bec`'s. Checks on that tree:
  - `node --test tests/*.test.mjs`: **473/473**, exit 0, 0 skipped, Node 26.0.0.
  - `node tools/content-registry.mjs`: exit 0, `findings: []`. By capability:
    `preview` 77 available, 67 not-applicable, 6 unavailable; `local-playable`
    120 available, 30 unavailable; `local-owned` 53 available, 67
    not-applicable, 30 unavailable; `backup-compatible` 120 available, 30
    unavailable; `server-authoritative` 150 unavailable. No capability is
    `inconsistent`.
  - `npm run build`: exit 0, 80 public files.
  - `GAME_URL=http://127.0.0.1:4194 npm run test:liaozhai` and
    `npm run test:honglou` (loopback `tools/serve.py`, this worktree): each exit
    0, 14/14 checks in Chromium (system Google Chrome 154.0.8037.98) and 14/14
    in WebKit (Playwright 1.63.0, WebKit 26.6). Each smoke seeds
    `shanhai.profile.v5`, `shanhai.profile.v3`, `shanhai.battle.v5` and a
    session key, then checks they stay unread and unchanged, with no cookie,
    storage API, API or external call and no asset error. This is the ROADMAP
    exit "preview browsing leaves profile bytes unchanged" for those two pages.
    These pages are unchanged since `8afbabc`, so the check is a re-run, not a
    new feature check. `playtest.html` is a preview-allowlisted supply page that
    writes coins and a gift marker by design, and it serves no preview printing.
  - **Merge simulation with `art/lz01-specials-images` (`3f8851b`):** a
    `git clone --shared` in the scratch directory, then
    `git merge --no-commit --no-ff` into `f33c35b`. The only conflict was this
    file. `node tools/content-registry.mjs` exited 1 with a `SyntaxError`
    (`liaozhai-cards.mjs` no longer exports `LZ01_AA`), and
    `tests/content-registry.test.mjs` failed to load for the same reason. With
    the import pointed at `LZ01_SPECIALS`, the audit reported `checklist-mismatch`
    for `lz01-006-ink1`, because ART-LZ01's "Pending specials briefs" heading is
    now "Specials briefs · 2026-10-10". With the parser also accepting that
    heading, the audit exited 0 with 120 local-playable, 29 preview and 1
    planned. With the test file's import adapted the same way, 3 of its 17
    tests still failed, all on today's pinned LZ-01 state. Nothing from the
    simulation was committed, and the clone was deleted.
    The whole suite was not run on the merged tree.
- **Merge of `art/lz01-specials-images` (PR #8 at `35ab891`) · 2026-10-11.**
  Merge commit **`d1f0f91`** (`git merge --no-ff`). Conflicts were this file
  and the HANDOVER intro; both sides were kept. The registry now imports
  `LZ01_SPECIALS` and `LZ01_PLANNED_SPECIALS`, parses the renamed
  "Specials briefs · 2026-10-10" section (`parseSpecialsBriefs`), audits
  `LZ01_PLANNED_SPECIALS` against the checklist's planned rows, and names a
  missing briefs section when a planned special lacks a brief. No new finding
  code was added (still 27). The tests derive the LZ-01 preview/planned split
  from `liaozhai-cards.mjs` (only the 19-printing set size stays pinned), and a
  planned 畫皮之鬼 INK rebuilt from its bound printing carries the planned-path
  fault cases. Checks on `d1f0f91`, Node 26.0.0:
  - `node --test tests/*.test.mjs`: **474/474**, exit 0, 0 skipped (473 before
    the merge, plus one registry test for the rebuilt planned state).
  - `npm run audit:content`: exit 0, `findings: []`. 150 entries: 120
    local-playable and **30 preview** (19 LZ-01: 12 BASE, 4 AA, 2 INK, 1 TR;
    11 HL-01), **none planned**. By capability: `preview` 83 available, 67
    not-applicable; `local-playable` 120 available, 30 unavailable;
    `local-owned` 53 available, 67 not-applicable, 30 unavailable;
    `backup-compatible` 120 available, 30 unavailable; `server-authoritative`
    150 unavailable. No capability is `inconsistent`.
  - Mutation check (working file restored byte-for-byte afterwards): matching
    the old "Pending specials briefs" heading, dropping either direction of the
    `LZ01_PLANNED_SPECIALS` check, or dropping the missing-section message each
    made `node --test tests/content-registry.test.mjs` exit 1 (4 of 4).
  - `GAME_URL=http://127.0.0.1:4194 npm run test:liaozhai`: exit 0, 14/14
    checks in Chromium (system Google Chrome 154.0.8037.98) and 14/14 in WebKit
    (Playwright 1.63.0), including the seven special-printing links and seeded
    saves left unread and unchanged. The loopback `tools/serve.py` for this
    worktree was restarted first, because it reads the allowlist only at
    startup.
  - `npm run build`: exit 0, 80 public files (the preview art stays out of the
    public build).
- **Not run:** `npm run test:browser`, `npm run test:honglou` after the merge
  and the WebKit suites other than the LZ-01 preview smokes. The merge brings
  the LZ-01 preview's runtime changes, which only `test:liaozhai` exercised
  here; no game runtime file changed. Also not run: CI, any hosted or deployed
  check, and any physical-device or human review.
- **Third review fixes in `6bc784a` · 2026-10-11** (tooling metadata only; no
  player, save or build effect). Each gap was first reproduced with
  `cc285b5`'s tool in an APFS-clone scratch copy: every fault below left
  `auditContent` with no findings.
  - A cited test nested in `describe.skip(...)` still resolved as running
    evidence: wrapping the `progression.test.mjs` test that six entries cite
    left the audit at exit 0 while `node --test` reported 48 tests and 0
    skipped. A test inside a skipped outer test did the same. A cited test must
    now be a top-level `test(...)` (bracket depth 0 in the masked source).
  - `test('…', function () { this.skip(); })` resolved, because only a named
    first parameter was treated as the context. `this` in a `function`
    callback now counts as the context.
  - A code reference matched raw source, so renaming `isNodeUnlocked` while
    leaving `// … export function isNodeUnlocked(…)` in a comment (or the text
    in a string) hid 66 dead references. Code references now match masked
    source; all 27 still resolve.
  - All four westward story encounters listed `claimWX01StoryPrint`, but they
    unlock in a chain and the gift opens only when all four are cleared, so
    the first clears of `west-flower-mountain`, `west-yellow-wind` and
    `west-flaming-mountain` throw 通過西行首卷四處地點後可領取異畫。 Only
    `west-spirit-mountain` lists it now (the same last-clear derivation as the
    campaign-final grant). The reward-rules test now plays the story gift as
    well as grants and tickets, and the story-gift test checks that the
    acquisition route names all four gate nodes.
  - A bound special's brief file was never audited: pointing the 嬰寧 AA brief
    back at the removed `yingning-aa.png` left the audit at exit 0. The audit
    now reports `checklist-mismatch` when a bound special's brief names a file
    other than its binding (still 27 finding codes).
  - Regression cases: unit cases in the reference test, and four new
    source-fault cases (`describe.skip` wrapper, `this.skip()`, a definition
    left in a comment, a stale brief file) in
    `tests/content-registry.test.mjs`. The test count is unchanged (474);
    the story-gift test is renamed. The two original repros (the
    `describe.skip` wrapper and the stale 嬰寧 AA brief) now make
    `node tools/content-registry.mjs` exit 1 in a scratch copy.
  - Mutation check in an APFS-clone scratch copy (deleted afterwards):
    reverting each of the five fixes made
    `node --test tests/content-registry.test.mjs` exit 1 (5 of 5).
- **Merge of `origin/main` `daf18ed` · 2026-10-11.** Merge commit `d606447`
  (`git merge --no-ff`, no conflicts; the local `origin/main` ref, not
  re-fetched). It brings PRs #6 and #7 (the docs index `docs/README.md`,
  `CONTRIBUTING.md`, `docs/RELEASE-NEXT.md` and guide edits) and main's PR #8
  merge of the same `35ab891`; no source, test, hosting or allowlist file
  changed. The index's Experience modules, Roadmap, Handover and Validation rows
  now carry Q4 qualifiers. Checks on `d606447`, Node 26.0.0:
  - `node --test tests/*.test.mjs`: **474/474**, exit 0, 0 skipped.
  - `npm run audit:content`: exit 0, `findings: []`; 120 local-playable and 30
    preview, by capability unchanged from `d1f0f91`.
  - `npm run build`: exit 0, 80 public files.
  - `GAME_URL=http://127.0.0.1:4194 npm run test:liaozhai` and
    `npm run test:honglou`: each exit 0, 14/14 checks in Chromium (system
    Google Chrome 154.0.8037.98) and 14/14 in WebKit (Playwright 1.63.0), no
    errors or forbidden requests. The loopback `tools/serve.py` for this
    worktree was not restarted: it started after both allowlists last changed.
  - Not run: `npm run test:browser`, the other WebKit suites, CI, any hosted
    check and human review. `docs/RELEASE-NEXT.md` (from PR #7) has no row in
    `docs/README.md` on `main` either; that index gap is left to its owner.
- **Fourth review fixes in `092f1fd` · 2026-10-11** (tooling and documentation
  only; no player, save, content, art, allowlist or build effect). Each gap was first
  reproduced on `65c4593` by the reviewers; after the fix, each original repro
  was re-run in an APFS-clone scratch copy (deleted afterwards).
  - Evidence reading failed open. Only an object-literal options argument was
    read, so options held in a variable, a conditional or a spread were never
    inspected, and option keys were matched in masked code, so a quoted
    `{ 'skip': … }` or computed `['skip']` key was invisible; the body check
    needed `ctx.skip(` and missed `t.skip?.()` and `t['skip']()`. Node 26
    reports each of these skipped. Repro: `const pending = { skip: 'awaiting
    balance review' };` passed to the `wx01-progression.test.mjs` test that 13
    WX-01 special printings cite left the audit at exit 0 while `node --test`
    reported 21 tests, 1 skipped. Now options must be an object literal whose own
    keys are read from the source (a `skip`/`todo` key passes only with the
    literal value `false`; a spread, computed or unparseable key fails), the
    callback must be written inline (a missing or named callback fails), and any
    access to the context's `skip`/`todo`, or any computed member of the
    context other than a plain string naming something else, fails. The same
    repro now exits 1 with `dead-reference` (cited by 13 entries).
  - Checklist columns: a bound special's character and treatment were never
    compared with its binding, and a planned entry took its treatment from the
    docs label. Relabelling `lz01-009-aa1` as 王六郎 / AA and `lz01-006-ink1` as
    陸判 / TR left the audit clean; it now reports two `checklist-mismatch`
    findings. Character, treatment and working title are compared with
    `LZ01_SPECIALS` or `LZ01_PLANNED_SPECIALS`, and a planned entry's treatment
    comes from the module. The planned character check now compares the name
    without its parenthesised source note instead of a prefix.
  - Removing `src` from the bound 畫皮之鬼 INK made the audit throw `TypeError`
    in `fileKind` and the registry test file fail as one load error. A preview
    printing without `src`, a world without `map` and an activity without `map`
    are now `capability-inconsistent` findings; that repro exits 1 with four
    findings, and the registry tests report individually (15 of 19 pass, as the
    tree is then inconsistent).
  - The CLI compared `resolve(argv[1])` with the loader's symlink-resolved
    `import.meta.url`, so a run through a symlinked path printed nothing and
    exited 0. Both sides now go through `realpathSync`; a run through a symlink
    to the worktree (and through `/tmp`) printed the same 861 bytes as the
    physical path. `tools/build.mjs` and `tools/deploy.mjs` keep the old idiom;
    there, doing nothing is visible rather than a false pass.
  - Docs: the Q4 lines that said "all six" LZ-01 specials now say seven (小倩 AA
    was bound on 2026-09-23, before PR #8 bound six more), and the docs index's
    LZ-01 rows no longer say the special art is not yet generated.
  - Regression cases: 21 unit cases in the reference test; eleven source-fault
    cases (options in a variable, a quoted `skip` key, `t.skip?.()`; a special,
    an HL-01 AA, a world and the activity without an art or map path; bound
    character, treatment and title drift, and planned treatment drift); a
    planned-treatment assertion; and one new test that runs the CLI through a
    symlinked checkout. Still 27 finding codes.
  - Mutation check in the clone: reverting each of ten parts of the fix (the
    unreadable-options rule, reading option keys from source, the any-access
    context rule, the computed-member rule, bound and planned column checks,
    the planned treatment source, the preview `src` and world `map` guards and
    the realpath guard) made `node --test tests/content-registry.test.mjs`
    exit 1 (10 of 10).
  - Checks on `092f1fd`, Node 26.0.0: `node --test tests/*.test.mjs` **475/475**,
    exit 0, 0 skipped (474 plus the symlink CLI test). `npm run audit:content`
    exit 0, `findings: []`, 120 local-playable and 30 preview, by capability
    unchanged from `d1f0f91`. `npm run build` exit 0, 80 public files.
    `GAME_URL=http://127.0.0.1:4194 npm run test:liaozhai` and
    `npm run test:honglou`: each exit 0, 14/14 checks in Chromium (system
    Google Chrome 154.0.8037.98) and 14/14 in WebKit (Playwright 1.63.0), no
    errors or forbidden requests; the loopback server was not restarted (no
    allowlist changed).
  - Not run: `npm run test:browser`, the other WebKit suites, CI, any hosted
    check and human review.
- **Fifth review fixes in `2d44071` · 2026-10-11** (tooling and documentation only; no
  player, save, content, art, allowlist or build effect). The reviewers
  reproduced each gap on `2edc2d9`; after the fix, each original repro was
  re-run in process or through the CLI in an APFS-clone scratch copy (deleted
  afterwards).
  - `{ expectFailure }` options: Node 26.0.0 accepts `expectFailure` and
    reports a throwing body under it as a pass (`ok 27 - … # EXPECTED
    FAILURE`; pass 49, fail 0, skipped 0, todo 0), but the options reader
    rejected only `skip` and `todo` keys. Marking the `progression.test.mjs`
    test that six entries cite `{ expectFailure: … }`, with `assert.fail` as
    its first line, left `node tools/content-registry.mjs` at exit 0. Option
    keys are now an allowlist taken from Node 26's runner: `timeout`,
    `concurrency`, `only`, `plan` and `signal` pass; `skip`, `todo` and
    `expectFailure` pass only with the literal value `false`; any other key
    fails closed. The repro now exits 1 with `dead-reference` (cited by 6
    entries). CI runs Node 22 (`.github/workflows/ci.yml`); the review found no
    `expectFailure` in Node 22's test-runner docs, so the gap concerns local
    Node 26 runs. No Node 22 run was made here.
  - Subtests: a cited test whose checks sat in `t.test('…', { skip: … }, fn)`
    still resolved, while Node reported the outer test ok and the subtest
    skipped. A subtest is now read by the same rules as a top-level test,
    recursively; `t.test` stored, bound, called through `.call` or a computed
    key, or given a title that may be options or a callback, fails. No current
    test uses subtests.
  - Context forms: `(t).skip()`, `(this).skip()` and
    `const { skip } = t; skip.call(t)` resolved, although Node reports each
    test skipped. Grouping parentheses around the context are now read through,
    and a body that destructures its context fails, as a destructured first
    parameter already did.
  - Duplicate rows: the audit indexed checklist and brief rows by printId, so
    only the last row for a printing was compared. A stale `lz01-004-aa1` row
    naming 陸判 / INK and the removed `yingning-aa.png`, placed above the live
    row, left the audit at exit 0 (placed below it, four findings); a stale
    brief row above the live one did the same. A printId in more than one
    checklist or brief row is now a `checklist-mismatch` finding wherever the
    row sits; both repros exit 1.
  - `contentDigest`: a preview special hashed its base card's record, so
    retitling 小倩 TR in the module, checklist and brief kept its digest, and
    editing the base card changed every special's. Each preview entry now
    hashes its own authored record (the card for a BASE preview, the special's
    record otherwise). All 30 LZ-01/HL-01 preview digests change value once;
    nothing compares digests across runs.
  - Numbering: 小倩 TR renamed `lz01-004-tr1` (嬰寧's number) in the module,
    checklist and brief audited clean, though `tests/liaozhai-content.test.mjs`
    failed. The audit now checks a bound special's number against its
    `cardId`; `planned-card-mismatch` is renamed `card-number-mismatch` and
    covers bound and planned specials (still 27 finding codes). The repro now
    exits 1 with that finding.
  - Docs: HANDOVER's Q4 "Checked" bullet said VALIDATION holds "all three
    review rounds"; it now says every review round.
  - Regression cases: 31 unit assertions in the reference test; seven
    source-fault cases (`{ expectFailure }`, a skipped subtest, `(t).skip()`,
    a destructured `skip`, a stale checklist row, a stale brief row and a
    bound special numbered for another character); and one new digest test.
  - Mutation check in the clone: reverting each of nine parts of the fix (the
    option allowlist, `expectFailure` as a skipping key, subtest reading, the
    computed `test` member, grouping parentheses, the destructuring rule,
    duplicate rows, the own-record digest and the bound number check) made
    `node --test tests/content-registry.test.mjs` exit 1 (9 of 9).
  - Checks on `2d44071`, Node 26.0.0: `node --test tests/*.test.mjs` **476/476**,
    exit 0, 0 skipped (475 plus the digest test). `npm run audit:content` exit
    0, `findings: []`, 120 local-playable and 30 preview; apart from
    `contentDigest`, every entry and the summary match `2edc2d9`'s output.
    `npm run build` exit 0, 80 public files.
    `GAME_URL=http://127.0.0.1:4194 npm run test:liaozhai` and
    `npm run test:honglou`: each exit 0, 14/14 checks in Chromium (system
    Google Chrome 154.0.8037.98) and 14/14 in WebKit (Playwright 1.63.0), no
    errors or forbidden requests; the loopback server was not restarted (no
    allowlist changed).
  - Not run: `npm run test:browser`, the other WebKit suites, CI, any hosted
    check and human review. Still unseen by the reader: a file-level hook that
    skips (`beforeEach(t => t.skip())`), which Node 26 counts as a skipped
    test; the docs now list it beside the other blind spots.
- **Sixth review fixes in `2a04859` · 2026-10-11** (tooling and documentation only; no
  player, save, content, art, allowlist or build effect). The reviewers
  reproduced each gap on `ce1b30f` with Node 26.0.0 in APFS clones (deleted
  afterwards); two of the three findings named the same gap. After the fix,
  each repro was re-run in process and through the CLI in an APFS-clone
  scratch copy (deleted afterwards).
  - Subtests declared through the runner: the fifth-review fix read only
    subtests made through the context (`t.test`), and did not read a callback
    without a parameter at all. Node 26 attaches the runner's own `test()`,
    `test.skip()`, `it()` or `describe()`, called while a test runs, to that
    test as a subtest. Rewriting the `progression.test.mjs` test that six
    entries cite as `async () => { await test('checks', { skip: 'awaiting
    review' }, () => { assert.fail(…); … }); }` gave `node --test` tests 50,
    pass 49, fail 0, skipped 1 with the outer test ok, and
    `node tools/content-registry.mjs` exit 0 with `findings: []`; the same
    rewrite with `t.test` already gave `dead-reference`. Calls to `test`, `it`, `describe` and
    `suite` (and their `.only`) in a cited test's body or any subtest's body are
    now read as subtests by the same rules, recursively, with or without a
    context parameter; their `.skip`, `.todo` and `.expectFailure`, any other
    member, and any other use of the four names (stored, passed on, a local of
    the same name) fail. The repro now exits 1 with `dead-reference` (cited by
    6 entries). Still unseen, and now listed with the other blind spots: the
    runner's functions imported under other names (`import { test as check }`,
    a default or namespace import, the bare `skip` export).
  - Grouped context after a statement head: grouping parentheses around the
    context were kept whenever a `)` came before them, as for a call, so
    `if (slow) (t).skip()`, the same after `while (…)` or `for (…)`,
    `(this).skip()`, `(t)['skip']()` and `(t).test('c', { skip: true }, …)` in
    that position still resolved. With the cited test's header rewritten to
    `t => { if (true) (t).skip('disabled'); return;`, `node --test` reported
    the test skipped (pass 48, skipped 1) and the audit exited 0 with
    `findings: []`. A `)` that closes an `if`, `while`, `for`, `for await` or
    `with` head, or one this reader cannot match, now leaves the `(t)` after it
    a grouping; `g(a)(t)` and `if (slow) f(t)` keep their call parentheses. The
    repro now exits 1 with `dead-reference`.
  - Regression cases: 19 unit assertions in the reference test and two
    source-fault cases (the cited test's checks moved into a skipped
    `test('checks', …)` subtest of a callback without a parameter, and
    `if (true) (t).skip()`).
  - Mutation check: reverting the runner-subtest scan, the statement-head
    rule, or all of `tools/content-registry.mjs` to `ce1b30f` made
    `node --test tests/content-registry.test.mjs` exit 1 (3 of 3).
  - Checks on `2a04859`, Node 26.0.0: `node --test tests/*.test.mjs` **476/476**,
    exit 0, 0 skipped (the new cases sit inside existing tests).
    `npm run audit:content` exit 0, `findings: []`, 120 local-playable and 30
    preview; the built registry is byte-identical to `ce1b30f`'s.
    `npm run build` exit 0, 80 public files.
  - Not run: the LZ-01/HL-01 preview smokes (no page, allowlist or served file
    changed), `npm run test:browser`, the other WebKit suites, CI (Node 22),
    any hosted check and human review.

## LZ-01 special printings · 2026-10-11

Local branch `art/lz01-specials-images`, started from `origin/main` `8afbabc`.
It is not merged, pushed or deployed, and this entry includes no hosted check.
The checks below ran on source commit **`3c07dfe`** with a clean tree; the
commit that adds this entry changes documentation only. A loopback
`python3 tools/serve.py --port 4196` served the worktree (`Cache-Control:
no-store`). It was restarted after the allowlist change, because `serve.py`
reads `hosting/preview-assets.json` only at startup. All of this is synthetic
headless evidence.

Five selected images (嬰寧, 陳氏 and 王六郎 AA, 畫皮之鬼 INK, 聶小倩 TR) were bound
in the standalone preview; 陸判 INK stays planned. The preview now has 本畫, 異畫,
墨卷 and 天工 printings keyed by card and treatment. No engine, catalogue, save,
service or public-file change. Provenance and the open art caveats are in
[ART-LZ01](ART-LZ01.md#provenance--special-printings--2026-10-11).

- Each repository copy equals its archive original (`cmp`, and SHA-256 equal
  to the generation record). The committed blobs hash to the same values.
- `node --test tests/*.test.mjs`: **456/456**, exit 0, on Node 26.0.0. The count
  is unchanged because the LZ preview test was rewritten rather than added. It
  now checks the six bound and one planned print IDs, card numbers, the copied
  treatment labels against `PRINT_TREATMENTS`, 1024×1536 headers, preview-list
  membership, absence from the public list and each file's SHA-256 against
  ART-LZ01.
- Python: **9 tests OK**.
- `npm run build`: **80 public files**, manifest `98028a3a…`. No `dist` path or
  file content mentions `assets/lz01` or `liaozhai`, and no public build input
  changed since `8afbabc`.
- `GAME_URL=http://127.0.0.1:4196 npm run test:liaozhai`: **14 groups per engine**
  in Chromium and WebKit (Playwright 1.63.0), 20 screenshots each, with no
  runtime, console or asset errors and no forbidden requests. New checks: hero
  BASE/AA/TR with identical stats, six catalogue links in order, every bound
  printing in the dialog showing its own file, print ID, label and frame
  (dark 墨卷 text, double 天工 border) with unchanged stats, and the rendered
  count 「12 款本畫＋6 款特別畫作先行（異畫 4、墨卷 1、天工 1）；陸判墨卷仍在規劃中。」.
  The first WebKit run failed one new focus check because the smoke had opened
  a catalogue link by mouse click, and WebKit does not focus a clicked button.
  The check now uses the keyboard, like the existing opener checks, and both
  engines pass.
- Visual review: the smoke screenshots, plus viewport captures of each new
  printing in the dialog at 1440×900 and 390×844 in both engines, were
  inspected. Two adjustments followed: a stronger paper shade behind 墨卷 text,
  and special-printing links placed above 「細讀此卡」 so those links align.

Evidence (ignored): `test-results/lz01-specials-{unit,python,build,browser}.log`
and `liaozhai-{chromium,webkit}-smoke.json` with their screenshots. Physical
phones, native Safari, the owner's art review and any hosted delivery remain
open.

**2026-10-11 review fixes · addendum.** A read-only review of `3f8851b` produced
five verified findings. The commit that adds this addendum fixes them, and the
checks below ran on that commit's tree.

- Provenance: every LZ-01 PNG embeds a signed C2PA manifest (`caBX` chunk)
  naming `ChatGPT`, version `gpt-image`, and recording
  `c2pa.watermarked.unbound`. ART-LZ01 and ART now record this; the exact model
  identifier stays "not exposed" because `gpt-image` is a family label. See
  [ART-LZ01](ART-LZ01.md#embedded-content-credentials-c2pa).
- The two second-round 陸判 INK candidates (prompt `9976af34…`) are now recorded
  with their hashes, archive paths and the reasons neither is selectable.
- 嬰寧 AA: the card's title and name cover 王子服, so `lz01-004-aa1` was
  unbound in the data, the preview allowlist, the static count and both tests,
  and planned again with a card-fit brief. The PNG is unchanged and served by
  neither list. The shared rules gain a card-fit rule, and both planned
  prompts follow it.
- 天工 ornament: the `vector-effect` declaration on the outer `<svg>` had no
  effect and was removed. Hero TR captures with and without it are
  byte-identical in Chromium and WebKit at 1440 and 390.
- Close-button focus ring: at 600 px and below the dialog content now starts at
  66px instead of 57px, so the 3px ring at offset 5px ends 4px above the card.
  A keyboard-open probe at ten widths from 320 to 1440 in both engines found
  the ring over the card in 18 of 60 openings before the fix (all at 390, 360
  and 320) and in none after, and over no dialog text either way. The smoke
  now asserts this; with the old padding restored it failed at 390 in Chromium.

Checks, on Node 26.0.0 and Playwright 1.63.0, with the loopback
`serve.py --port 4196` restarted after the allowlist change
(`assets/lz01/yingning-aa.png` now returns 404 there):

- `node --test tests/*.test.mjs`: **456/456**, exit 0. The LZ content test now
  also requires every PNG under `assets/lz01/` to match its recorded hash, and
  every unbound file to be absent from both allowlists.
- Python: **9 tests OK**.
- `npm run build`: **80 public files**, manifest `98028a3a…`, unchanged; no
  `dist` path or file content mentions `lz01` or `liaozhai`.
- `GAME_URL=http://127.0.0.1:4196 npm run test:liaozhai`: **14 groups per
  engine** in Chromium and WebKit, 18 screenshots each (two fewer, because 嬰寧
  AA is no longer bound), with no errors and no forbidden requests. The
  rendered count is 「12 款本畫＋5 款特別畫作先行（異畫 3、墨卷 1、天工 1）；嬰寧異畫、陸判墨卷仍在規劃中。」.

Evidence (ignored): `test-results/lz01-fixes-{unit,python,build,browser}.log`.
The C2PA, focus-ring and ornament probes were scratch scripts outside the
repository. Physical phones, native Safari, the owner's art review and new
generations for the two planned slots remain open.

**2026-10-11 round three · addendum.** Started from `b42ee4a` (the
strike-only 陸判 INK prompt). Three candidates were generated for each planned
slot from the round-three prompts, and two read-only reviews judged them, one
for fidelity and safety and one for craft and card fit. 陸判 INK
(`lz01-006-ink1`) round-three candidate 3 was bound as
`assets/lz01/lupan-ink.png`. None of the three 嬰寧 AA candidates was selected,
so `lz01-004-aa1` stays planned and `yingning-aa.png` stays unbound. Hashes,
archive paths and reasons for all six candidates are in the
[嬰寧 AA](ART-LZ01.md#lz01-004-aa1--嬰寧-aa--花間藏笑) and
[陸判 INK](ART-LZ01.md#lz01-006-ink1--陸判-ink--夜酌朱批) briefs, and the bound
file has its own
[provenance block](ART-LZ01.md#lz01-006-ink1--陸判-ink--夜酌朱批-1). No engine,
catalogue, save, service or public-file change. The checks below ran on this
commit's tree before it was committed.

- The repository copy equals its archive original (`cmp`; SHA-256
  `56cff3e4…` on both, 1024×1536, 3,266,124 bytes). For all six round-three
  candidates, an independent read of each rollout found one
  `image_gen__imagegen` call whose prompt equals the brief byte for byte,
  `transparent_background: false` as its only other argument, an identical
  `revisedPrompt`, no model field, and a base64 result that decodes to the
  archive file. A read-only parse of the bound PNG found the chunks `IHDR`,
  `caBX`, `IDAT` and `IEND` with valid CRCs. Its C2PA manifest names
  `ChatGPT` / `gpt-image` (`c2pa.created` 2026-10-11T10:24:15Z) and records
  `c2pa.watermarked.unbound`, and its data hash equals the file's SHA-256
  without `caBX`.
- Data: `lz01-006-ink1` moved from `LZ01_PLANNED_SPECIALS` to `LZ01_SPECIALS`
  (between 小倩 TR and 畫皮 INK, in card order) with `src` and `墨卷 INK`; only
  `assets/lz01/lupan-ink.png` was added to `hosting/preview-assets.json`. The
  static count and meta description in `liaozhai.html` now read 「12 款本畫＋6
  款特別畫作先行（異畫 3、墨卷 2、天工 1）；嬰寧異畫仍在規劃中。」 and 「六款」.
- `node --test tests/*.test.mjs`: **456/456**, exit 0, on Node 26.0.0. The LZ
  content test now expects six bound and one planned print IDs and nine image
  paths, and checks the new file's header, preview-list membership, absence
  from the public list and SHA-256 against ART-LZ01.
- Python (3.14.6): **9 tests OK**.
- `npm run build`: **80 public files**, manifest `98028a3a…`, unchanged; no
  `dist` path or file content mentions `lz01`, `liaozhai` or `lupan`.
- The loopback `serve.py --port 4196` was stopped and restarted from this
  worktree, because it reads the allowlist only at startup. Afterwards
  `assets/lz01/lupan-ink.png` returns 200 with the committed bytes and
  `assets/lz01/yingning-aa.png` still returns 404.
- `GAME_URL=http://127.0.0.1:4196 npm run test:liaozhai`: **14 groups per
  engine** in Chromium and WebKit (Playwright 1.63.0), exit 0, 20 screenshots
  each (two more than before, the 陸判 INK dialog at 1440×900 and 390×844), with
  no errors and no forbidden requests. The smoke now lists six catalogue links
  in card order, checks the new printing's own file, print ID, 墨卷 label and
  dark text with unchanged stats, and now also opens 陸判 at the three phone
  viewports (390×844, 360×740 and 844×390).
- Visual review: the binding session read the new dialog captures in both
  engines at both widths. Both faces and the brush hand sit clear of 夜酌朱批 and
  陸判; the vermilion strike shows as faint pink under the paper shade, just
  above the title. The ★ and faction chips partly cover the two small
  background vignettes.

Evidence (ignored): `test-results/lz01-r3-{unit,python,build,browser}.log`
and `liaozhai-{chromium,webkit}-smoke.json` with their screenshots. The
rollout and C2PA checks were scratch scripts outside the repository.
Physical phones, native Safari, the owner's art review and a new 嬰寧 AA prompt
revision and generation remain open.

**2026-10-11 round four · addendum.** Started from `864efe2` (the round-four
嬰寧 AA prompt, SHA-256 `d0aafae839ce…`). Three candidates were generated from
it, and two read-only reviews judged them, one for fidelity and safety and one
for craft and card fit; the craft review rendered each on the card in the hero
and the dialog at 1440 and 390 in Chromium and WebKit. Both picked candidate 2,
which was bound as `assets/lz01/yingning-aa2.png`. The unbound first file,
`assets/lz01/yingning-aa.png`, was removed from the tree with `git rm`; its
bytes stay in Git history (`3c07dfe`) and at its archive path, and its
provenance block is kept and marked superseded. Hashes, archive paths and
reasons for all three candidates are in the
[嬰寧 AA brief](ART-LZ01.md#lz01-004-aa1--嬰寧-aa--花間藏笑), and the bound file
has its own
[provenance block](ART-LZ01.md#lz01-004-aa1--嬰寧-aa--花間藏笑--round-four). No
engine, catalogue, save, service or public-file change. The checks below ran on
this commit's tree before it was committed.

- The repository copy equals its archive original (`cmp`; SHA-256
  `a87541f9…` on both, 1024×1536, 3,799,105 bytes). For all three round-four
  candidates, an independent read of each rollout found one
  `image_gen__imagegen` call whose prompt equals the brief byte for byte,
  `transparent_background: false` as its only other argument, an identical
  `revisedPrompt`, no model field, a `savedPath` equal to the archive file and
  a base64 result that decodes to it; the agent's user message equals the
  recorded sent text (SHA-256 `712045b6…`) and is text only. A read-only parse
  of the bound PNG found the chunks `IHDR`, `caBX`, `IDAT` and `IEND` with
  valid CRCs. Its C2PA manifest names `ChatGPT` / `gpt-image` (`c2pa.created`
  2026-10-11T11:26:54Z) and records `c2pa.watermarked.unbound`, and its data
  hash equals the file's SHA-256 without `caBX`. The five other 2026-10-11
  files still `cmp` equal to their archive originals, and the removed file's
  archive original still hashes to `ecf9df41…`.
- Data: `lz01-004-aa1` moved from `LZ01_PLANNED_SPECIALS` to `LZ01_SPECIALS`
  (between 小倩 TR and 陸判 INK, in card order) with `src` and `異畫 AA`;
  `LZ01_PLANNED_SPECIALS` is now empty. Only `assets/lz01/yingning-aa2.png` was
  added to `hosting/preview-assets.json`. The static count and meta description
  in `liaozhai.html` now read 「12 款本畫＋7 款特別畫作先行（異畫 4、墨卷 2、天工
  1）。」 and 「七款」, matching what `renderPrintProgress()` renders with no
  planned printing.
- `node --test tests/*.test.mjs`: **456/456**, exit 0, on Node 26.0.0. The LZ
  content test now expects seven bound and no planned print IDs and ten image
  paths, and checks the new file's header, preview-list membership, absence
  from the public list and SHA-256 against ART-LZ01. It also now fails if a
  row in the ART-LZ01 hash table names a file that is not in `assets/lz01/`;
  the previous commit's table, which still listed `yingning-aa.png`, would fail
  it.
- Python (3.14.6): **9 tests OK**.
- `npm run build`: **80 public files**, manifest `98028a3a…`, unchanged; no
  `dist` path or file content mentions `lz01`, `liaozhai` or `yingning`.
- The loopback `serve.py --port 4196` was stopped and restarted from this
  worktree, because it reads the allowlist only at startup. Afterwards
  `assets/lz01/yingning-aa2.png` returns 200 with the committed bytes,
  `assets/lz01/yingning-aa.png` returns 404, and `assets/lz01/lupan-ink.png`
  still returns 200.
- `GAME_URL=http://127.0.0.1:4196 npm run test:liaozhai`: **14 groups per
  engine** in Chromium and WebKit (Playwright 1.63.0), exit 0, 22 screenshots
  each (two more than before, the 嬰寧 AA dialog at 1440×900 and 390×844), with
  no errors and no forbidden requests. The smoke now lists seven catalogue
  links in card order, expects the 嬰寧 AA chip once instead of never, checks
  the new printing's own file, print ID and 異畫 label with unchanged stats, and
  expects the new progress text.
- Visual review: the binding session read the new dialog captures in both
  engines at both widths. 嬰寧 laughs in the tree near the top and 王子服 stands
  on the raised path with both hands open, both clear of 花間藏笑 and 嬰寧.
  Only plain grass sits behind the title and name; the bank, path and stone
  steps sweep away to the lower right, beside the lettering rather than under
  it, as the file's Card fit line in ART-LZ01 records.

Evidence (ignored): `test-results/lz01-r4-{unit,python,build,browser}.log`
and `liaozhai-{chromium,webkit}-smoke.json` with their screenshots. The
rollout and C2PA checks were scratch scripts outside the repository.
Physical phones, native Safari and the owner's art review remain open; no
special printing is still planned.

## Q1 local commands · 2026-10-11

Local branch `q1/local-commands`, started from `origin/main` `8afbabc`. Source
commits `762412b`, `d2111ab`, `c529206` and `8fe664c`; the commit that adds this
entry changes documentation only. Not pushed, merged or deployed; the last
recorded public release is still v0.5.1, and this entry includes no hosted
check. All of it is synthetic headless evidence on Node 26.0.0.

The backpack card page's 修練升級 now commits the request captured when the
page was painted, through `local-commands.mjs`, under the shared
`PROFILE_LOCK`, with the effects and a bounded receipt in one profile write.
Profile v5 gains an optional, device-local `commands` ledger that backups never
contain. [LOCAL-COMMANDS](LOCAL-COMMANDS.md) is the contract;
its §18 lists where the implementation differs.

- `node --test tests/command-ledger.test.mjs tests/local-commands.test.mjs tests/profile-store.test.mjs tests/cloud-save.test.mjs tests/account-client.test.mjs tests/hosting.test.mjs && node --test tests/*.test.mjs`:
  exit 0. The six files gave **92/92** and the full suite **485/485**; the base
  had 456. The trees of `762412b` and `d2111ab` were also tested alone: 466/466
  and 485/485.
- `python3 -m unittest discover -s tests -p '*_test.py'`: 9 tests OK.
  `git diff --check 8afbabc..HEAD`: clean.
- The worktree's existing server on 4193 started before the change, and
  `tools/serve.py` reads the allowlist once at startup, so it returned 404 for
  `local-commands.mjs`. It was left running. A separate
  `python3 tools/serve.py --port 4197` served the worktree for the browser runs.
- `GAME_URL=http://127.0.0.1:4197 npm run test:commands`: **7/7 groups in each
  engine** (system Google Chrome 154.0.8037.98, Playwright WebKit 26.6), exit 0.
  They cover one write per click with reload, three stale-page cases, two
  dispatched clicks, two pages behind a held lock, a synthetic quota error and
  missing Web Locks.
- `GAME_URL=… npm run test:browser`: all 14 Chromium suites, exit 0.
  `npm run test:battle-table`: **40/40 in each engine**. `npm run test:inheritance`
  and `npm run test:wx01`: both engines, exit 0.
- Negative control: a scratch probe (not committed) against `8afbabc` served
  from a scratch copy. In Chromium, a card page still showing "修練至 Lv.2 ·
  120 金幣", after another page had upgraded the copy, charged 240 more and
  reached Lv.3. On this branch the same steps charged 120 and stopped at Lv.2.

Not checked: physical devices, the Safari app, Firefox, two separate browser
processes, a real `QuotaExceededError`, `npm run build`, deploy dry runs,
`test:viewport`, `test:expansion`, `test:collection-display` and the literary
preview suites.

### Q1 review fixes · 2026-10-11

Source commits `7a7d03e`, `19aa648` and `6f58d83` on the same branch fix the
three defects a review of `b6410e9` reported; the commit that adds this entry
changes documentation only. Still not pushed, merged or deployed, and no hosted
check. Synthetic headless evidence on Node 26.0.0;
[LOCAL-COMMANDS §18.4–18.5](LOCAL-COMMANDS.md#184-fixes-after-the-first-review-2026-10-11)
has the detail.

- **Cross-tab stale read (medium).** The next holder of the Web Lock could read
  `localStorage` bytes from before the previous holder's write, so two tabs
  could both report a fresh upgrade and one was overwritten. Every holder of
  `PROFILE_LOCK` now goes through an IndexedDB read-after-write fence
  (`profile-fence.mjs`); commands refuse as `rejected/unsynced` when it cannot
  prove their bytes are current.
- **Restore order (low).** A restore now checks the profile it will save before
  writing the recovery copy, and puts the previous copy back if the save fails.
- **Duplicate receipt (low).** A duplicate upgrade now names the accepted
  receipt, for example Lv.1 → Lv.2 · 120 金幣 · 6 靈砂.

Checks, against a separate `python3 tools/serve.py --port 4311`:

- `node --test tests/*.test.mjs`: exit 0, **498/498**; each commit's contents
  gave 496, 497 and 498. Python: 9 tests OK. `git diff --check b6410e9..HEAD`:
  clean.
- `npm run test:commands`: exit 0, **10/10 groups in each engine**, including B4
  repeated at about 60 KB and the fence across two real pages (30/30 handoffs
  current; the plain-lock control on the same run was stale in 30/30 Chromium
  and 24/30 WebKit handoffs). A scratch copy with the plain lock restored for
  commands failed the new B4 group. The reviewers' UI repros gave 0/10
  violations each (5/10 before).
- `npm run test:browser` (14 Chromium suites): exit 0, 4 min 53 s against 4 min
  55 s for `b6410e9`. `test:inheritance`, `test:wx01`, `test:battle-table` and
  `test:collection-display`: exit 0 in both engines; `test:viewport`: both
  engines passed (WebKit on a re-run; the first stopped while the disk was full).
- `test:expansion` fails in WebKit only, on a 43.08 px module tab at 360×740;
  `b6410e9` fails identically. `test:map-piece` passed in Chromium; its WebKit
  half needs a `test-results/webkit-runtime` this worktree lacks.
- First lobby paint, median, `b6410e9` → fixes: Chromium 89 → 92 ms (first load)
  and 56 → 67 ms (reload); WebKit 95 → 102 ms and 78 → 78 ms.

Not checked: separate browser windows or processes, the Safari app, Firefox,
physical devices, Node 22, `npm run build`, deploy dry runs, a real browser
without IndexedDB or with IndexedDB refusing writes, and a real
`QuotaExceededError`.

### Q1 second review fixes · 2026-10-11

Source commits `dac1e0a` and `a8db57c` on the same branch fix two of the three
low-severity defects a second review of `37dad64` reported; the commit that
adds this entry corrects the third, which was documentation, and adds its test.
Still not pushed, merged or deployed, and no hosted check. Synthetic headless
evidence on Node 26.0.0;
[LOCAL-COMMANDS §18.6](LOCAL-COMMANDS.md#186-fixes-after-the-second-review-2026-10-11)
has the detail.

- **Restore write that lands, then throws.** A restore now re-reads the profile
  before undoing anything, so the replaced journey keeps its recovery copy
  unless its bytes are confirmed still stored.
- **Fence guarantee for bypassing writers.** The contract now says a write that
  bypasses the fence can still be lost until it reaches the next tab, and adds
  the rule never to serve a pre-fence v5 build on an origin that has served Q1.
- **Identity-conflict copy.** When another card's upgrade took the slot, the
  refusal now says so, and says whether this card is unchanged.

Checks, against a separate `python3 tools/serve.py --port 4341`:

- `node --test tests/*.test.mjs`: exit 0, **501/501**; the two code commits'
  exported trees gave 499 and 500. The new restore test and N26 fail against
  `37dad64`. Python: 9 tests OK. `git diff --check`: clean.
- `npm run test:commands`: exit 0, **10/10 groups in each engine** (fenced
  handoffs 30/30 current; plain-lock control 29/30 Chromium and 18/30 WebKit
  stale).
- `account-smoke`, `profile-recovery-smoke` and `backpack-smoke` (Chromium):
  exit 0 each.

Not checked: the remaining `test:browser` suites and per-engine smokes (the disk
was nearly full), a browser whose `setItem` lands and then throws, separate
browser processes, the Safari app, Firefox, devices, `npm run build`, deploy dry
runs and any hosted service.

### Q1 third review fixes · 2026-10-11

Source commits `5fdf5c5`, `c008010`, `323d27c` and `334bc75` on the same branch
fix the four low-severity defects a third review of `14d0473` reported; the
commit that adds this entry corrects the fourth, which was documentation. Still
not pushed, merged or deployed, and no hosted check. Synthetic headless evidence
on Node 26.0.0;
[LOCAL-COMMANDS §18.7](LOCAL-COMMANDS.md#187-fixes-after-the-third-review-2026-10-11)
has the detail.

- **Restore in a lagging tab.** Restore now holds the fence strictly, like
  commands: a tab that has not received another tab's commit refuses instead of
  retiring the ledger and keeping a recovery copy from older bytes. It now also
  refuses on an unsettled fence (a reload heals it) and without usable IndexedDB.
- **Fence failure copy.** A full disk now gets the storage copy and a stall the
  retry copy; only a browser without usable IndexedDB is told to change browsers.
- **Same bytes again.** After its writing mark the fence checks the bytes again,
  so a profile that went X → Y → X cannot hand a commit the older Y.
- **`stale` row.** §9 now spells out the single stale message.

Checks, against a separate `python3 tools/serve.py --port 4361`:

- `node --test tests/*.test.mjs`: exit 0, **507/507**; the three code commits'
  trees gave 503, 505 and 507. Seven of the new fence tests fail against
  `14d0473`'s modules. Python: 9 tests OK. `git diff --check 14d0473..HEAD`:
  clean.
- `test:commands` (both halves run directly): exit 0, **11/11 groups in each
  engine**, including the new B9 full-disk group, which times out against
  `14d0473` (fenced handoffs 30/30 current; plain-lock control 16/30 Chromium
  and 30/30 WebKit stale).
- `npm run test:browser` (14 Chromium suites): exit 0 in 292 s. Its account smoke
  adds a restore refused on an unsettled fence and completed after a reload; that
  check times out against `c008010` (lenient restore). `test:wx01` and
  `test:inheritance`: exit 0 in both engines.

Not checked: a real full disk, a browser that blocks IndexedDB by its settings, a
real delivery lag over 0.5 s, separate browser processes, the Safari app,
Firefox, devices, the other per-engine smokes, `npm run build`, deploy dry runs
and any hosted service.

### Q1 final check · 2026-10-11

Run at `0492242` on the same branch. The last source commit is `334bc75`;
`0492242` and the commit that adds this entry change documentation only. Local
only: not pushed, merged or deployed, the last recorded public release is still
v0.5.1, and no hosted check was made. Synthetic headless evidence on Node
26.0.0 on macOS, with Playwright 1.63.0 driving system Google Chrome
154.0.8037.98 and WebKit 26.6;
[LOCAL-COMMANDS §18.8](LOCAL-COMMANDS.md#188-final-check-2026-10-11) has the
same record.

- `node --test tests/*.test.mjs`: exit 0, **507/507**. The seven files in the
  HANDOVER Q1 checks row: exit 0, 114/114.
- `python3 -m unittest discover -s tests -p '*_test.py'`: exit 0, 9 tests OK.
  `git diff --check 8afbabc..HEAD`: exit 0, clean.
- **Server.** The worktree's assigned server on 4193 was started at 09:31,
  before the Q1 modules existed, and still returned 404 for
  `local-commands.mjs`, `profile-fence.mjs` and `command-ledger.mjs`, so the
  game cannot load from it. It was left running untouched. Browser runs used a
  separate `python3 tools/serve.py --port 4381`, stopped afterwards.
- `GAME_URL=http://127.0.0.1:4381 npm run test:browser`: exit 0, all 14
  Chromium suites in 291 s.
- `GAME_URL=http://127.0.0.1:4381 npm run test:commands`: exit 0, **11/11
  groups in each engine** in 58 s. In B7 the fenced lock read the previous
  write in 30/30 handoffs in both engines; the plain-lock control was stale in
  29/30 (Chromium) and 27/30 (WebKit).
- The 154 screenshots these runs wrote to the ignored `test-results/` were
  deleted afterwards.

Not checked in this run: `test:inheritance` and `test:wx01` (last run in both
engines in the third-review checks above), `test:battle-table`,
`test:viewport`, `test:expansion`, `test:collection-display`, `test:map-piece`
and the literary previews; the account, backpack and recovery smokes in
WebKit; separate browser processes, the Safari app, Firefox and physical
devices; a real full disk, `QuotaExceededError` or cross-tab delivery lag over
0.5 s; Node 22; `npm run build`, deploy dry runs and any hosted service. Owner
review of the contract, including its §15 decisions, is requested before any
Q2/Q3 consumer is written.

### Q1 final review fixes · 2026-10-11

Source commit `345f92f` on the same branch fixes the defect a final review of
`7d32825` reported (twice); the commit that adds this entry corrects the
contract's two quota statements and its §2 import list. Still not pushed,
merged or deployed, and no hosted check. Synthetic headless evidence on Node
26.0.0;
[LOCAL-COMMANDS §18.9](LOCAL-COMMANDS.md#189-fixes-after-the-final-review-2026-10-11)
has the detail.

- **Recovery restore retry.** A local recovery restore that the strict fence
  refuses keeps its dialog and now its draft, so pressing 復原本機旅程 again
  restores once the fence passes instead of claiming the backup changed. A
  retry still runs the backup and fingerprint checks; a press in flight is
  ignored.
- **Quota copy.** The contract now says a refused fence read or write gives the
  quota copy, as the code and N29 do.

Checks, against the worktree's own server on 4193 (restarted after the Q1
modules existed; it returned 200 for `local-commands.mjs`):

- `node --test tests/*.test.mjs`: exit 0, **507/507**. Python: 9 tests OK.
  `git diff --check`: clean.
- `npm run test:commands`: exit 0, **12/12 groups in each engine**, including
  the new B10 (fenced handoffs 30/30 current; plain-lock control 29/30 Chromium
  and 21/30 WebKit stale).
- `npm run test:browser` (14 Chromium suites): exit 0 in 294 s; the account
  smoke now presses again on an unsettled fence.
- Against `7d32825` (a separate server on 4397, stopped afterwards), B10 times
  out at the retry in both engines and the account smoke at its second press.

Not checked: `test:inheritance`, `test:wx01` and the other per-engine smokes,
the account smoke in WebKit, separate browser processes, the Safari app,
Firefox, devices, a real full disk or delivery lag, Node 22, `npm run build`,
deploy dry runs and any hosted service.

### Q1 pre-merge review fixes · 2026-10-11

Source commit `9390070` on the same branch fixes the defects a pre-merge review
of `1ab3a19` reported; the commit that adds this entry changes documentation
only. Still not pushed, merged or deployed, and no hosted check. Synthetic
headless evidence on Node 26.0.0;
[LOCAL-COMMANDS §18.10](LOCAL-COMMANDS.md#1810-fixes-after-the-pre-merge-review-2026-10-11)
has the detail.

- **Failed settle.** A lenient writer that finds the fence record `writing` or
  malformed now waits its whole 0.5 s before writing. Before, it waited 0 s, so
  after a commit whose settle failed, a tab still behind could write its older
  bytes over the commit and record them as settled.
- **B10.** The smoke now fails when the recovery dialog's in-flight guard is
  missing: it asserts that a second press during the restore shows no refusal.
- **Documents.** The contract's status header names the last source commit;
  §11 and §15 require `npm run test:commands` for a release that includes Q1;
  HANDOVER records the merge notes for `origin/main` `daf18ed`.

Checks, against the worktree's own server on 4193 (running from this worktree;
it returned 200 for the three Q1 modules):

- `node --test tests/*.test.mjs`: exit 0, **508/508** (507 plus N31). Python: 9
  tests OK. `git diff --check`: clean.
- `npm run test:commands`: exit 0, **12/12 groups in each engine** (fenced
  handoffs 30/30 current; plain-lock control 30/30 Chromium and 11/30 WebKit
  stale).
- `npm run test:browser` (14 Chromium suites): exit 0 in 294 s.
  `npm run test:inheritance` and `npm run test:wx01`: exit 0 in both engines.
- Negative controls: N31 fails against `1ab3a19`'s `profile-fence.mjs`, and B10
  fails in both engines against a copy without the in-flight guard (a separate
  server on 4421, stopped afterwards). The reviewers' Chromium repro at 712 KB
  kept the upgrade in 3/3 rounds with the injected settle failure.
- A trial `git merge-tree` onto `origin/main` `daf18ed` conflicts only in this
  file.

Not checked: the other per-engine smokes, the account smoke in WebKit, a real
failed settle, separate browser processes, the Safari app, Firefox, devices, a
real full disk or delivery lag, Node 22, `npm run build`, deploy dry runs, any
hosted service and the merge itself.

### Q1 second pre-merge review fixes · 2026-10-11

Source commits `1afaf6b` and `0e1ef85` on the same branch fix the findings a
second pre-merge review of `231ae4f` reported; the commit that adds this entry
changes documentation only. Still not pushed, merged or deployed, and no hosted
check. Synthetic headless evidence on Node 26.0.0;
[LOCAL-COMMANDS §18.11](LOCAL-COMMANDS.md#1811-fixes-after-the-second-pre-merge-review-2026-10-11)
has the detail.

- **Full disk and a `writing` record.** A strict holder on a `writing` or
  malformed fence record now writes the mark again before it refuses. When
  IndexedDB refuses that write, the card page and a restore show the storage
  copy instead of asking for a reload that cannot heal the record. Each lenient
  write still waits 0.5 s while IndexedDB refuses writes, as it already did on
  an out-of-date settled record; the contract now states that cost, and the
  proposal to skip the wait was not taken.
- **Reopened recovery dialog.** A dialog closed and opened again while its
  restore waits for the lock keeps that restore's draft, so a press in it no
  longer queues a second restore whose refusal replaced the success toast.
- **Documents.** Both links to HANDOVER's merge notes now use the heading's
  real anchor.

Checks, against the worktree's own server on 4193 (running from this worktree;
it returned 200 for the Q1 modules):

- `node --test tests/*.test.mjs`: exit 0, **509/509** (508 plus N32). Python: 9
  tests OK. `git diff --check`: clean.
- `npm run test:commands` at `0e1ef85`: exit 0, **13/13 groups in each engine**
  (fenced handoffs 30/30 current; plain-lock control 30/30 Chromium and 24/30
  WebKit stale).
- At `1afaf6b`: `npm run test:browser` (14 Chromium suites): exit 0 in 292 s.
  `npm run test:inheritance` and `npm run test:wx01`: exit 0 in both engines.
- Negative controls: N32 fails against `231ae4f`'s `profile-fence.mjs`; B9's
  new case and B11 fail in both engines against `231ae4f`'s modules (a separate
  server on 4437, stopped afterwards).
- Every local Markdown anchor in the docs, ROADMAP and README resolves. A trial
  `git merge-tree` onto `origin/main` `daf18ed` still conflicts only in this
  file.

Not checked: a real full disk, the other per-engine smokes, the account smoke
in WebKit, separate browser processes, the Safari app, Firefox, devices, a real
delivery lag, Node 22, `npm run build`, deploy dry runs, any hosted service and
the merge itself.

### Q1 third pre-merge review fixes · 2026-10-11

A third pre-merge review of `231ae4f..2bcc15e` reported two low-severity
findings, both in how the documents state the full-disk wait. Source commit
`38fa64f` on the same branch adds a test only; no runtime code changed, and the
commit that adds this entry changes documentation only. Still not pushed,
merged or deployed, and no hosted check. Synthetic headless evidence on Node
26.0.0;
[LOCAL-COMMANDS §18.12](LOCAL-COMMANDS.md#1812-fixes-after-the-third-pre-merge-review-2026-10-11)
has the detail.

- **When the wait began.** §18.11 said the full-disk wait was not new per
  action. Before `9390070`, a lenient write on a `writing` record waited 0 s,
  also on a full disk, where the record cannot heal; `9390070` made each such
  write wait 0.5 s while IndexedDB refuses writes. Only the out-of-date settled
  case paid before. §18.11 now says so; the decision to keep the wait is
  unchanged.
- **Which writes wait.** "Every lenient write waits on a full disk" was too
  broad: from a current settled record, lenient writes wait 0 s up to and
  including the first that changes the profile, and only the writes after it
  wait 0.5 s. §10.1 Limits and HANDOVER now name the two states that wait, and
  a second N32 test pins the settled pattern. The entry above says "each
  lenient write still waits 0.5 s"; it is left as written.

Checks, against the worktree's own server on 4193 (running from this worktree;
it returned 200 for the Q1 modules):

- `node --test tests/*.test.mjs`: exit 0, **510/510** (509 plus the second N32
  test). Python: 9 tests OK. `git diff --check`: clean.
- `npm run test:commands` at `38fa64f`: exit 0, **13/13 groups in each engine**
  (fenced handoffs 30/30 current; plain-lock control 30/30 Chromium and 21/30
  WebKit stale).
- A virtual-clock probe of the four `profile-fence.mjs` versions confirmed both
  findings (a `writing` record: 0 s each at `1ab3a19`, 0.5 s each from
  `9390070`). The new test passes against `1ab3a19`'s fence and fails against
  a copy in which every lenient write on a settled record waits.
- Every local Markdown anchor in the docs, ROADMAP and README resolves.

Not checked: a real full disk; `test:browser`, `test:inheritance` and
`test:wx01` (last run at `1afaf6b`, whose runtime code is unchanged); the other
per-engine smokes, the account smoke in WebKit, separate browser processes, the
Safari app, Firefox, devices, a real delivery lag, Node 22, `npm run build`,
deploy dry runs, any hosted service and the merge itself.

## Q0 battle table · 2026-10-10

Local branch `q0/battle-table`, started from `origin/main` `ced2aa4`. It is not
merged, pushed or deployed, and the last recorded public release is still
v0.5.1; this entry includes no hosted check. The list of checks below ran on
2026-10-11 against source commit **`80fb7a3`** with a clean tree; the dated
addenda after it record the 2026-10-11 polish, whose last source commit is
**`0482837`**. A loopback
`python3 tools/serve.py --port 4191` served that worktree (`Cache-Control:
no-store`, uncompressed). The commits that add this entry and its addenda change
documentation only. All of this is synthetic headless evidence.

Before Q0 the battle had four module tabs: 手牌, 落子, 對手 and 局勢. Now one 對局
table keeps both public four-card hands, the announced confrontation, life and
pills, and the move controls in view, and the reveal uses the same table.
`battle-presentation.mjs` builds the public view. Its `permittedAnnouncement` is
the only reader of the stored AI move: it returns a card ID or null and never
reads the bid or Fury. No engine, reward, AI, save-schema or art change. The
[battle-table plan](BATTLE-LAYOUT-PLAN.md#implementation-record-2026-10-10)
records the design and each round of review fixes.

- `node --test tests/*.test.mjs`: **456/456**, exit 0, on Node 26.0.0. The base
  had 446. The new `tests/battle-table-view.test.mjs` adds 9: the gate, the view
  whitelist, the RNG trap, hidden-bid invariance over 40 seeded matches, the
  stale round, slots, used rounds and markup. `tests/viewport.test.mjs` adds 1
  for the single unpaged battle module.
- `GAME_URL=http://127.0.0.1:4191 npm run test:battle-table`: **40/40 in each
  engine**, exit 0. Chromium is system Google Chrome 154.0.8037.98, which the
  smokes prefer when it is installed. WebKit is Playwright's 26.6. The checks
  cover simultaneous visibility with `elementFromPoint` hit tests after every
  card, pill, slider and Fury input, in both initiative states and round 3. They
  also check that different hidden bids give identical HTML, ARIA and announcer
  output. The other checks are inspect focus, draft and save bytes, reveal pages
  → Next → reload, Mist Gate, a legacy snapshot, motion and pace, and settlement
  only once. A 30-size sweep runs from 1920×1080 down to 568×320.
- `GAME_URL=… npm run test:viewport`: **23/23 in each engine**, exit 0, at
  1440×900, 1280×720, 390×844, 360×740, 360×640 and 844×390.
- `GAME_URL=… BROWSER=webkit node tools/battle-presentation-smoke.mjs`: **6/6**,
  exit 0. The Chromium run is part of the next item.
- `GAME_URL=… npm run test:browser`: all 14 Chromium suites pass, exit 0. Account
  flows use intercepted fixture APIs; no email or hosted service is contacted.
  `GAME_URL=… node tools/expansion-smoke.mjs` also passes in Chromium: 16
  checks and 899 layout checks, exit 0.

**Third review fixes · 2026-10-11.** Source commit **`7762730`** fixes the ten
defects that a verification review of `6a93cb4` re-confirmed, plus an older
effect-page overflow that the new worst-case fixture exposed. The
[plan](BATTLE-LAYOUT-PLAN.md#implementation-record-2026-10-10) lists each one
and the smoke check that now guards it. The same loopback server and a clean
tree gave: `node --test tests/*.test.mjs` **456/456**;
`npm run test:battle-table` **40/40 in each engine** (Chrome 154.0.8037.98,
WebKit 26.6), whose sweep is now 32 sizes, each with a low-life pass;
`npm run test:viewport` **23/23 in each engine**;
`BROWSER=webkit node tools/battle-presentation-smoke.mjs` **6/6**; and all 14
Chromium suites of `npm run test:browser`, each exit 0. The expansion smoke and
the before/after measurement below were not repeated for these CSS, markup and
test changes.

**Fourth review fixes · 2026-10-11.** Source commit **`0482837`** fixes the two
regressions a review of `c213330` found: the attack-estimate label broke beside
two-digit estimates (`6d5509a`), and the round result showed inside the dialog
before its phase (`0482837`). The
[plan](BATTLE-LAYOUT-PLAN.md#implementation-record-2026-10-10) lists both and
the smoke checks that now guard them. The same loopback server and a clean tree
gave: `node --test tests/*.test.mjs` **456/456**; `npm run test:battle-table`
**40/40 in each engine** (Chrome 154.0.8037.98, WebKit 26.6), now sampling
every reveal frame on three dialog pages and adding two- and three-digit
estimates at each of the 32 sweep sizes; `npm run test:viewport` **23/23 in
each engine**; `BROWSER=webkit node tools/battle-presentation-smoke.mjs`
**6/6**; and all 14 Chromium suites of `npm run test:browser`, each exit 0. The
expansion smoke and the before/after measurement were not repeated for these
CSS, JavaScript and test changes.

**2026-10-11 polish · summary.** The two review rounds above are one polish pass
from `6a93cb4` to source commit **`0482837`**. It changes `app.mjs`,
`battle-ui.mjs`, five CSS files, `tests/battle-table-view.test.mjs` and
`tools/battle-table-smoke.mjs`; no engine, save, reward, AI or art file. The
smoke's hidden-move checks (byte-identical table HTML, ARIA and announcer text
for different hidden bids and Fury) still pass.
- **Fixed (12 of the 13 findings raised on `6a93cb4`):** the round result
  showing before its staged reveal behind the dialog (#1, #2, `9a8ada7`) and,
  as the next review found, inside it (`0482837`); the Fury switch collapsing in
  landscape under about 740 px (#3, #11, `06bd920`); the 9 px attack-estimate
  label (#5, `06bd920`) and its later mid-word break beside two-digit estimates
  (`6d5509a`); the winner's attack cut off in the reveal pair (#4, `7762730`);
  dead `.identity`, `.avatar` and `.battle-log` CSS (#7, `3c66454`); reveal
  resource and effect pages split where `ced2aa4` used one (#8, `7f354b9`);
  single-column rows overlapping below about 580 px tall (#9, `6bfc4a6`; they
  now hold down to about 540 px); names over state badges at the 56 px card
  height (#10, `6bfc4a6`); the hidden 危 mark (#12, `2eec18a`; visual only, with
  no screen-reader text of its own); and Mist Gate's older selected-card
  highlight (#13, `055437f`).
- **Not reproducible:** #6, four-character names with ✧ cut off in the centre
  slots at 640×360. Nothing changed for it. **Skipped:** none.
- Each fix but #7 (no element uses those classes) has a smoke check that fails
  in Chromium with only that fix reverted.
  Independent probes on `c213330` re-confirmed all twelve against reverted CSS or
  JavaScript in Chromium and WebKit; the two later fixes (`6d5509a`,
  `0482837`) were re-checked only by their author, partly with the reviewer's
  frame probe.
- Final checks on `b9a3732`, with a clean tree whose game, test and tool files
  are identical to `0482837`, against the same loopback server on Node 26.0.0:
  `node --test tests/*.test.mjs` **456/456**, exit 0; and
  `GAME_URL=http://127.0.0.1:4191 npm run test:battle-table` **40/40 in each
  engine** (Chrome 154.0.8037.98, WebKit 26.6, no page errors), exit 0. The tree
  was still clean afterwards.
  The viewport, WebKit presentation and `test:browser` results above for
  `0482837` were not repeated; the expansion smoke and the before/after
  measurement last ran on `80fb7a3`.
- **Still open**, detailed in the
  [plan](BATTLE-LAYOUT-PLAN.md#implementation-record-2026-10-10): the
  live-region announcement names the winner at Commit; where the backdrop blur
  is not drawn the resolved table behind the reveal is only dimmed, so its
  result stays readable during 'sealed' and 'bids' (seen in headless WebKit;
  the `-webkit-` prefix and an opaque no-support fallback were added later on
  2026-10-11, and real Safari is unchecked); portrait windows under about
  540 px tall, and the selected card's full-motion lift at 540–549 px; three
  技能與共鳴 pages where `ced2aa4` had two at 375×553 and 360×560; and the
  device, owner-review and clipping notes from before.

**Before/after.** Measured with `tools/battle-measure.mjs` on fixture
`q0-arena-round1-opponent-leads` (sha256_16 `6894b11ff0e9b0e6`): arena round 1,
both sides at 12 life and 12 pills, and the opponent leads with 焰心 announced
and a hidden bid of 0 without Fury. Before is `a53270d`, which is `ced2aa4`'s
game files plus the tool. After is `80fb7a3`. The selector strings are identical
in both runs. Browsers are Playwright 1.63's bundled headless Chromium
153.0.8010.12 and WebKit 26.6 on one Mac. Profiles are desktop 1440×900 at DPR 1
with mouse clicks; phone 390×844 at DPR 3 with touch taps; and, in Chromium
only, the phone again with CDP CPU throttling ×4. Each profile had 3 cold
entries (new browser context) and 3 warm entries (same page navigated again),
with full motion, normal pace and sound off.

| Measure | Before `a53270d` | After `80fb7a3` |
| --- | --- | --- |
| One round, minimal: taps (view switches), all 5 browser/profile runs | 5 (0) | 5 (0) |
| One round checking the opponent before choosing, after selecting and before Commit | 11 (6) | 5 (0) |
| View changes made by the app in one round | 1 | 0 |
| Steps with opponent 4/4, announcement, selected own card, pills and Commit all visible (minimal / checking round) | 0 of 5 / 0 of 8 | 5 of 5 / 8 of 8 |
| Own cards visible at start, 390×844 | 2/4 | 4/4 |
| Round-2 table after Next: own / opponent cards visible | 0/4 / 0/4 | 4/4 / 4/4 |
| Core input → next paint p50/p95 ms, Chromium desktop · phone · phone CPU×4 | 16.0/16.8 · 32.6/33.4 · 32.3/35.7 | 15.8/17.9 · 32.7/33.5 · 31.9/34.6 |
| Same, WebKit desktop · phone | 16/18 · 16/17 | 16/18 · 14/17 |
| Core input handler p95 ms, Chromium desktop · phone · CPU×4; WebKit desktop · phone | 4.5 · 5.2 · 14.3; 4 · 4 | 1.6 · 1.9 · 6.7; 1 · 1 |
| Inputs timed per profile (35 core plus tab/page taps) | 44 desktop, 46 phone | 35; no tabs or pages exist |
| Long tasks / LoAF during inputs, Chromium | 0 / 0 | 0 / 0 |
| Cold resume tap → first own card clickable p50 ms, Chromium desktop · phone · CPU×4 | 57 · 33.8 · 76.9 | 46 · 36.6 · 93.9 |
| Same, WebKit desktop · phone (cold; warm phone) | 25 · 24 (12) | 31 · 33 (20) |
| Cold lobby CTA usable p50 ms, Chromium desktop · phone · CPU×4; WebKit desktop · phone | 107.6 · 106.7 · 205; 222 · 147 | 108.5 · 87.8 · 177.1; 213 · 124 |
| Commit → reveal complete; Next → decision-ready, all runs (ms) | 1113–1161; 29–63 | 1115.5–1178; 32–65 |
| Transfer per entry, Chromium / WebKit | 7,996,394 / 11,936,212 B | 8,025,285 / 11,965,103 B |
| Cold-entry long tasks, Chromium CPU×4 | 3 per entry, 210–216 ms in total | 3 per entry, 217–223 ms in total |

- Steps and simultaneity improved as the plan intended, in every browser and
  profile. Every accepted round still equals the engine's `resolveRound` result.
- Input → next paint did not change beyond the roughly 16.7 ms frame step.
  Chromium's emulated tap adds about one frame, so its phone figure is near
  32 ms; WebKit's phone figure is 14–16 ms. Handler time fell, probably because
  selecting a card no longer switches modules; this was not profiled. The
  timed sample is now 35 inputs because the tab and page taps no longer exist.
  The tool records them as skipped.
- The first table paint after resume is slower in four of the five profiles: by
  3–17 ms cold and up to 8 ms warm. Under Chromium CPU×4 the cold runs moved
  from 76–81 ms to 93–95 ms, so the ranges do not overlap. Chromium desktop was
  faster, 57 → 46 ms. The table now paints all eight portraits at once, which
  may explain it; this was not profiled.
- Q0 did not change the lobby's markup, yet the lobby timings moved by −28 to
  +13 ms between the runs. That is mostly the noise at n = 3, so smaller
  differences above are not meaningful.
- WebKit's Next → decision-ready rose from 29–34 to 37–45 ms. Before, readiness
  was detected on the move panel's pill +; after, it is detected on an own card.
- Each entry transfers 28,891 more bytes: 14,480 of JavaScript and 14,409 of
  CSS. Images are unchanged. WebKit still fetches `portraits.png` twice from the
  no-store dev server, as before.

The raw JSON is in ignored `test-results/battle-measure-{before,after}-{chromium,webkit}.json`,
and the logs for the checks above were kept outside the repository.

**Not covered.** Physical iOS or Android devices: the phone profiles emulate
only viewport, DPR and touch. Human playtest, readability and search time. A
hosted release: no build, deploy or `mythseal.com` check was made. Production
caching, compression and CDN behavior. Sound. The WebKit expansion smoke was not
rerun; the 2026-10-10 run stopped at a 43.08 px rewards-dialog tab at 360×740
and 360×640, which also fails on `ced2aa4`. The plan's **Still open** list
covers owner review of the new layouts, the remaining name/ellipsis clipping
at a few narrow or short sizes and the items the polish left open.

## GitHub source checkpoint · 2026-09-24

Before publishing the current development branch, reran **446 Node tests**,
**nine Python tests**, the **80-file public build**, and `git diff --check`;
all pass. The known Python temporary HTTP404 cleanup warning remains.
The source/art changes were reviewed, including actual PNG hashes and preview
allowlist separation. Saves, credentials, generated test output, local build
output and private conversation-play receipts remain outside Git.

The browser results below are the completed September 23 runs, not new runs
for this documentation checkpoint. Honglou explicitly tests Tab/Shift+Tab
traversal; Liaozhai currently tests Escape/opener restoration and lacks the
equivalent explicit Tab loop and regression coverage. That is a bounded
accessibility follow-up, not verified Tab coverage for LZ.

Publication later on 2026-09-24: `e61d60a` (this work) and merge `e1fe8ac`
(`origin/main` `83216cc`) were pushed to `origin/codex/game-lobby` and opened as
[PR #1](https://github.com/cambridgetcg/mythseal/pull/1). Before that commit, `git diff --cached --check` (the staged
tree, unlike the earlier unstaged run) flagged trailing whitespace at
`tools/honglou-smoke.mjs:43` and a blank line at the end of `docs/ART-HL01.md`;
both were fixed. The forge fixture, wrangler preview/deploy dry runs and all
module syntax checks also passed locally. A same-day live read of
`/release.json` still reported v0.5.1 `ea48558` and `/api/v1/account` returned
HTTP 200 with `emailEnabled: true`.

These are local source checks. Pushing Git does not deploy the website or run
hosted account/migration checks. The existing GitHub workflow triggers on main,
pull requests or manual dispatch; a development-branch push alone is not a CI
pass. Remote publication is verified separately against the actual Git ref.

## HL-01 literary design preview · 2026-09-23

`honglou.html` is a separate local study: eight BASE portraits and three AA
scenes, eight card identities (one exact 黛玉 reprint and seven candidates),
star/faction filters, sourced character roles and a fixed three-card opening.
No engine admission, owned-copy acquisition, profile migration or deployment.

- **446 Node tests pass**, including eight HL content checks for reprint
  identity, source roles, AA links, fixed sample, legal paper decks, candidate
  tradeoffs, all five actual PNG headers and the isolated two-module graph.
- **Nine Python tests pass**, retaining the known temporary HTTP404 cleanup
  `ResourceWarning`. The build passes with **80 public files**; all nine HL
  code/art paths remain in the preview allowlist only. `git diff --check` passes.
- `npm run test:honglou` passes **14 groups per engine** in isolated Chromium
  and WebKit at 1440×900, 390×844, 360×740 and 844×390 plus reduced motion. It
  covers all eight cards on desktop, all three AA characters plus a non-AA card
  at smaller sizes, fixed/repeated/partial/skipped openings, timer interruption,
  image decoding, filter intersections and empty-state reset.
- Tested controls have unobstructed 44px targets and no horizontal overflow.
  BASE/AA have identical rules and the source switches to chapter 62 for 湘雲's
  separate AA episode. The role descriptions distinguish authorship, hosting,
  rhyme-setting and supervision. 黛玉 is labelled an existing-rules reprint.
- Initial runs exposed native dialog Tab/Shift+Tab escaping into browser chrome,
  including WebKit skipping intermediate controls. Explicit traversal of current
  visible controls fixes both directions, including after an AA rerender.
  Final full runs verify wrap, intermediate focus and Escape/opener restoration.
- Synthetic local/session profile and battle canaries remain byte-identical
  and unread. No RNG calls, cookie/storage/IndexedDB/cache access, external/API
  requests, asset errors or page exceptions occurred in these flows. No real
  player profile is used by the harness.
- Root inspected desktop/mobile gallery and AA-dialog captures. Native Safari
  loaded the preview in a new tab with its title, eight-card count and opening
  controls. Main game at 4177 and both literary pages at 4178 return HTTP200
  after the Mac restart. This is local availability, not hosted verification.
- All five image copies match their retained generation originals byte-for-byte;
  dimensions, hashes and exact prompts are in [ART-HL01](ART-HL01.md).

Ignored browser evidence: `test-results/honglou-{chromium,webkit}-smoke.json`
and their initial/catalogue/dialog/sample screenshots. Final JSON receipts
supersede the failed focus attempts shown in the conversation. Phone emulation
does not establish physical-device acceptance or competitive balance.

Shared conversation play has begun separately: the first user choice was
迎春＋0丹 against a precommitted 寶玉＋3丹. Attack 5 versus 24 gave the GM the
round, but skill and 森羅 reductions limited damage to 2. Resources became
user 10 life / 12 pills and GM 12 life / 9 pills. This single manual prototype round is
an observed resource decision, not engine integration or a balance conclusion.

## LZ-01 literary design preview · 2026-09-23

Local standalone `liaozhai.html`, twelve candidate cards and thirteen available
illustrations (three 2×2 atlases and one AA). The full set proposal has nineteen
printings; six special artworks, engine/card ownership, earned-coin acquisition
and 餘願 remain planned. No game catalogue, profile, service or deployment change.

- **438 Node tests pass**, including five new checks for the roster, faction/
  rarity mix, legal paper deck budgets, absence of obvious same-role raw upgrades,
  immutable prints, fixed sample and isolated preview dependencies. These are
  design/data checks, not battle-balance evidence.
- **Nine Python tests pass**; the pre-existing temporary HTTP404 cleanup
  `ResourceWarning` remains. The public build passes with **80 allowlisted
  files**; all eight LZ preview code/art paths stay preview-only.
- `GAME_URL=http://127.0.0.1:4178 npm run test:liaozhai` passes **14 groups per
  engine** in isolated Chromium and WebKit at 1440×900, 390×844, 360×740 and
  844×390, plus a reduced-motion case. It verifies all twelve portraits, five
  story filters, four factions, intersections and empty-state reset; card
  inspection, BASE/AA rule equality and Escape/focus restoration; individual,
  skipped, partial/reveal-all, repeated and interrupted-timer openings.
- Checked controls have unobstructed **44px targets** and pages have no
  horizontal overflow. The first WebKit attempt exposed a native select rendered
  at 21px despite `min-height`; explicit height/appearance and a visible chevron
  fixed it. Both complete engine suites pass after that CSS change.
- Synthetic profile/battle canaries remain byte-identical, with no local/session
  storage reads/writes, cookies, IndexedDB/cache access, API calls, external
  requests or asset/runtime errors during the test flows. Source links are
  inspected but not followed by the smoke. No real player save is opened by it.
- Original portraits and AA were visually inspected, as were desktop/phone
  previews and WebKit dialog/opening captures. Native Safari loaded the new
  preview in a separate tab and exposed its title, opening control and return
  link to the existing game at 4177. The preview server remains at 4178 for this
  session; a fresh ordinary Python launch can serve it at 4177.

Evidence (ignored): `test-results/liaozhai-unit.log`,
`liaozhai-browser-final.log`, `liaozhai-{chromium,webkit}-smoke.json` and their
screenshots, plus the parent `liaozhai-root-*` visual captures. The initial
WebKit failure remains in `liaozhai-webkit.log`; final JSON/log supersedes it.
Phone viewport emulation is not a physical-device check. Human card balance,
art direction, full booster rules and hosted delivery remain open.

## Carved map-piece prototype · 2026-09-23

Local CSS/SVG presentation on `codex/game-lobby`; no deployment, save migration,
game-rule change, real player-save access or studio commission.

- **433 Node tests pass**, including authored forward/reverse routes, mid-edge
  reversal through a junction and eligible cursor origins. The public build
  passes with **80 allowlisted files**; `git diff --check` passes.
- `tools/map-piece-smoke.mjs` passes **eight groups per engine** in Chromium and
  WebKit. The six-size matrix is 1440×900, 1280×720, 390×844, 360×740, 360×640 and
  844×390, with six-, four- and eight-node maps. Map/piece alignment, chapter and
  route-list fit, unobstructed 44 px controls and profile/battle/RNG conservation
  pass without browser or HTTP errors.
- Full-motion cases cover visible travel, rapid retargeting, a bent-route
  reversal, resize, changing OS reduced motion, leaving mid-move and switching
  maps. Keyboard activation, focus transfer and retention on arrival pass.
  Locked previews cannot move the piece, unlock a node or start a battle.
- Existing Chromium navigation and stories suites pass again, retaining the
  preparation/cancel, deck-return, battle continuity, quest and map regressions.
  All browser data is isolated synthetic state and API fixtures stay local.
- A bounded independent source review identified the reverse-route shortcut and
  hidden route-button focus; both were fixed and covered by the final browser
  runs. Desktop, portrait and short-landscape screenshots were visually inspected.

Ignored evidence: `test-results/map-piece-unit.log`,
`map-piece-{chromium,webkit}.json`, `map-piece-navigation.log`,
`map-piece-stories.log` and the matching screenshots. These are browser-engine
checks, not physical-device or human timing/audio evaluation. Final artwork,
owner playtest and phone validation remain open in the
[prototype/studio brief](MAP-PIECE-PROTOTYPE.md).

## Campaign and Fire Mountain · 2026-09-22

Implemented locally on `codex/game-lobby`: six sequel volumes /48 new encounters
(66 total), standard 火焰山三連戰, saved supplies/loaner runs, mastery, exact
character grants, pack tickets and a separate final AA choice. No hosted release,
live database migration or real player-save access accompanied this work.

- **430 Node tests and nine Python tests pass.** Coverage includes all48 authored
  legal decks/chain links, full campaign reward totals, once-only grants,
  deterministic activity draws/loot/pity, Monday rollover, exact-copy protection
  through supplies, loaner XP isolation and quota failures. The Python run keeps
  the pre-existing HTTP404 cleanup `ResourceWarning`.
- Local profile **v5** and cloud snapshot **v3** preserve v4/v3/v2 sources,
  exact copies, receipts and pending encounters. Old server capabilities block
  unsupported v5 uploads. The additive SQL migration/fixtures are source-only;
  their PostgreSQL runner and hosted retention checks were not executed.
- All **14 existing Chromium scenario suites pass**. WebKit additionally passes
  six profile-recovery groups, including interrupted migration and two-tab
  purchase serialization. API/account scenarios remain isolated intercepted
  fixtures. One old account assertion was updated for the activity warning.
- Both browsers pass the existing viewport matrix at **1440×900, 1280×720,
  390×844, 360×740, 360×640 and844×390**:23 groups and2,093 geometry checks per
  engine, with no active overflow, covered controls or browser errors. Existing
  72-copy box receipts and simultaneous saved battle/receipt states remain
  reachable through real module/page controls.
- The new `npm run test:expansion` matrix passes the same six sizes in Chromium
  and WebKit:16 groups per engine,815/804 geometry checks. It traverses all six
  new volumes, preparation routes, supplies, exact grants, tickets,48 mastery
  rows, titles and AA choices. Browsing keeps profile bytes unchanged.
- Both engines complete three real loaner battles through the UI, choose
  supplies, bank the first-clear BASE and weekly ticket, open a zero-coin
  three-card pack and claim the exact final AA without touching the old four-
  stage AA entitlement. A saved campaign loaner reconstructs a missing battle
  snapshot from its seed without changing owned copies. The scripted test pilot
  reads its own synthetic AI moves; this is functional coverage, not a human
  difficulty study or a change to production AI information access.
- Review found and fixed a loaner retry that reset the preparation route and an
  empty landscape AA sidebar. Both engines pass the subsequent focused landscape
  run, including an actual loaner defeat/retry (six groups/191 geometry checks).
  Desktop, phone and landscape screenshots were inspected for readable text and
  reachable controls. Build passes with **78 allowlisted public files**.

Final local evidence is ignored under `test-results/`: `expansion-unit-final.log`,
`expansion-python.log`, `expansion-existing-browser-summary.json`,
`expansion-profile-recovery-webkit.log`, `viewport-{chromium,webkit}.json`,
`expansion-{chromium,webkit}-full.json` and the later focused
`expansion-{chromium,webkit}.json` reports/screenshots. Early harness failures
remain in their logs; the successful final reports supersede them.
Physical mobile devices, long-term human balance and a coordinated hosted
Worker/schema/static release remain separate work. See
[the implemented design and tuning probe](CAMPAIGN-AND-EVENTS.md).

## Viewport game navigation · 2026-09-22

Local development on `codex/game-lobby`. Destinations and dialogs now use named
modules and explicit list pages within the screen. No deployment, save-format
migration, economy/rule change or real player-profile mutation occurred.

- **388 Node tests and nine Python tests pass.** The Python run retains the
  existing harmless temporary HTTP 404 cleanup `ResourceWarning`. Controller
  tests cover measured capacity, exact-item anchoring, keyboard tabs, focus,
  teardown and pack-controller visibility ownership; pack tests retain newly
  revealed artwork on its page without changing the accepted receipt.
  `npm run build` succeeds with **73 allowlisted public files** plus metadata.
- All **14 existing Chrome scenario suites** pass individually on the updated
  navigation. WebKit additionally passes the WX-01 presentation, box and
  inheritance suites. Account scenarios use intercepted APIs; restore/delete
  confirmations must appear immediately and cancellation returns visible focus
  to the cloud module. No real email or hosted mutation is involved.
- The independent Chrome viewport matrix passes at **1440×900, 1280×720,
  390×844, 360×740, 360×640 and 844×390**. It visits every module and actual list
  page, checks active panels and document dimensions, hit-tests visible controls
  at a 44px minimum and verifies exact copy/receipt identities remain reachable.
  It completes real preparation, battles, round results, final rewards and a
  legacy three-card pack; saved 24-pack receipts expose all 72 exact UIDs without
  another grant or charge.
- WebKit passes the same six sizes. The initial run completed desktop, laptop
  and 390px flows; after fixing a native training-select width issue, separate
  strict runs pass 360×740, 360×640 (including both saved-state cases) and
  844×390. A focused training check also passes 390×844 and those three sizes.
  The archived initial report retains its genuine failure; the three final
  `viewport-webkit-{size}.json` reports record successful completion. No browser
  errors or active-content overflow remain in these final checks.
- Browsing preserves synthetic profile bytes and produces no journey writes.
  Additional 360×640 cases cover simultaneous pending battle/pack receipt and
  receipt-only preparation → edit deck → return. All **18 chapters** also fit
  with both pending actions present, including the longest story descriptions.
- Desktop, short-phone and landscape screenshots were reviewed for readable
  card identity, chapter text, receipt counts, persistent resource HUD and dock.
  Evidence remains in ignored `test-results/viewport-*.json`/screenshots and
  `scene-pending-chapters-report.json`; tests use isolated browser contexts.

Physical iOS/Android devices, on-screen keyboards and a hosted release remain
separate checks. [NAVIGATION.md](NAVIGATION.md#viewport-scenes--2026-09-22)
documents the transient controller and module/page integration.

## 西行 drop-rate design · 2026-09-22

The owner selected cosmetic 領契 before battle Leader mechanics. The proposal
now has 29 printings of 16 identities: four planned LAA portraits supplement the
previous 25-print art study. [WX01-DROP-RATES.md](WX01-DROP-RATES.md) records the
official-source scope, natural rates, twelve-pack dry protection, god-pack
composition, per-print frequencies, earned choice route and capacity gates.

- **246 Node tests pass**, including nine new analytical-model tests. The nine
  targeted cases also pass after final BASE-label and input-validation edits.
  Exact outcome enumeration verifies probability mass, three-card contents,
  the rarity floor, all 29 reachable prints and unique god-pack characters.
  Tests independently check counter transitions, rare-result preservation,
  Markov stationary equations, known god-pack marginals and quantile boundaries.
- A **1,000,000-pack simulation**, seed `20260922`, passes 38 comparisons with
  the analytical model. It records 492 god packs; that observation is consistent
  with the proposed 0.05%, not a claim that every million openings contain 500.
  Monte Carlo tolerances explicitly allow dependence from the dry counter;
  they are conservative smoke checks, not exact confidence intervals. Exact
  enumeration/renewal calculations supply the reported probabilities.
- An independent read-only review agrees on protected rates, per-print god
  biases, character-distribution changes and rare-event waits. The live economy
  was inspected through source and pure synthetic calls: no player save or
  account was read or changed. The draft records the daily 80-coin rebate and
  the 2,000-copy/512-KiB backup limits, including vault copies.
- All analytical data remain under `tools/` and `tests/`; no game imports,
  existing pack rules, production allowlist, atelier behavior, save fields,
  service settings or schema changed. No new artwork or public deployment.
  Browser/Python reruns were unnecessary for this documentation/offline-tool pass.

Evidence: ignored `test-results/wx01-node-tests.log` and
`test-results/wx01-drop-analysis.json`; reproduce with `npm run analyze:wx01 -- --json`.
The model uses checklist IDs, not production engine IDs. New character balance,
LAA artwork, runtime grants, compatible counters/印/storage, portrait selection
and resumable issuance remain unimplemented. The existing atelier still shows
fixed demonstration cards and no real probabilities or player grants.

## 西行 collectible frames and art study · 2026-09-22

Local development on `codex/game-lobby`; the owner selected 西遊記 as the first
booster series. Existing cards now show their current collection rarity through
bronze, silver-jade or gold framing. There are still **24 playable characters
and two playable packs**. No rule, price, probability, profile schema, account,
database or real player save changed. No deployment occurred.

- **237 Node tests and nine Python tests pass.** Production-build fixtures
  explicitly include unapproved atelier/art files and verify their exclusion;
  the loopback server test covers the allowlisted local preview and no-store
  responses while retaining private-file and symlink protections.
- `npm run build` succeeds with **33 public runtime files**. The six files in
  `hosting/preview-assets.json` are available only through the local Python
  server and do not enter the production artifact.
- The core gameplay, backpack and battle-presentation Chrome suites pass with
  the live frames. The battle suite retains real-time phase coverage (about
  1.1 seconds to completion); its mobile keyboard/geometry case now pauses the
  test clock so automatic completion cannot move focus before Enter is sent.
  All six battle groups and eight footer geometry/hit checks pass without errors.
  Screenshots of the mobile backpack and battle cards were visually reviewed
  for legible names, stats, rarity marks and faction labels.
- `npm run test:atelier` passes in isolated **Chrome and WebKit 26.6**, with nine
  check groups per engine at **360px, 390px and 1440px**. All four Wukong treatments
  retain five stars, power 7, damage 6 and `stopAbility`. Checks cover distinct
  rarity frames, keyboard selection, manual/all reveals, fixed INK/TR choice,
  replay, opening skip, synthetic pagehide, reduced motion and focus recovery.
- Synthetic local/session save canaries remain unchanged, with no storage
  method writes or cookies. Request guards detect no API calls, external
  requests or mutation requests. Both engines report zero console/page errors
  and failed assets. Every owned test browser was closed.
- Three original **1024×1536** Wukong art studies total about **9.2 MiB**.
  [ART-EXPANSION.md](ART-EXPANSION.md) records the exact built-in imagegen prompts
  and project asset paths. Frames and readable rules are HTML/CSS; no image
  carries baked-in card text. Decoded-art screenshots were reviewed on both
  desktop and mobile viewport layouts.

Evidence: ignored `test-results/atelier-{chromium,webkit}-smoke.json` and
`atelier-{chromium,webkit}-{ink,treasure,demo}-{360,1440}.png`. This is isolated
WebKit evidence, not a new test of the owner's native Safari 18.6 session or a
physical iPhone/Android. Art compression/loading budgets, character balance,
owned-print compatibility and real booster distribution remain future work in
the [WX-01 set plan](EXPANSION-WX01.md). The atelier is a fixed-content visual
demonstration with no currency cost, RNG, ownership grant or pull-rate claim.

## Local Safari preview recovery · 2026-09-22

Native **Safari 18.6** was observed showing only the background at
`http://127.0.0.1:4177/`. **Command–Option–R**, Safari's hard reload, immediately
restored the lobby at that same origin. The visible interface showed the existing
Lv.4 journey, all six original realms cleared and the existing deck. The earlier
Command–Shift–R guidance was Chrome's shortcut, not Safari's. Recovery required
no save reset, migration or application-code change. The exact cached-module
failure was not observed; the hard reload resolving the blank screen is confirmed.

All 32 public files returned 200 with current checkout bytes and correct module
MIME types. Isolated fresh Chrome passed the core gameplay and story suites;
an isolated **WebKit 26.6** probe also loaded the lobby and four-world atlas.
These fresh contexts have separate saves from the owner's Safari. Actual native
Safari map navigation was not verified in this incident check.

The development server now sends `Cache-Control: no-store` and current bytes
instead of modification-time 304 responses. Restarted on the same loopback port;
live conditional requests return 200/no-store. Nine Python tests pass, including
cache-response coverage and the existing private-file/symlink denial checks.
The story suite's eight groups also pass after restart, with no browser errors.
The owner's progress was checked only through the visible Safari interface;
browser storage and save contents were not manually read, exported or cleared.
No public deployment occurred. Chrome and Safari keep separate browser-local
journeys, so a fresh Chrome journey does not mean Safari's progress was reset.

## Story volumes and quests · 2026-09-22

Local development on `codex/game-lobby`, following the resource/clash pass.
The owner chose maps/quests now and deferred online PvP/ranked. No deployment,
real account mutation, email or database migration occurred.

- **237 Node tests and eight Python tests pass.** Eleven new weekly tests cover
  London Monday/DST/year boundaries, backward clocks, zero-initialization of old
  saves, once-only counters/claims, pending cards and old/new cloud snapshots.
  Six story tests cover unchanged original nodes/rewards, legal themed decks,
  branch prerequisites, interleaved clears, independent first-clear/cache rewards,
  exact-copy progression and backup round trips.
- All **nine Chrome suites** pass on loopback: the eight existing suites plus
  `tools/stories-smoke.mjs`. Its eight groups include real wins in each new map,
  same-volume next/retry/final-chapter boundaries, repeated first clear, accepted
  result reload, daily and all three weekly claims, and explicit fixture-backed
  old/new backup restore/upload. No external requests or browser errors were
  reported; test browsers were closed.
- A same-tab regression preserves a Westward battle, browses White Snake,
  resumes and finishes the battle, then verifies result-map returns to Westward.
  The fix restores the encounter's selected node on expedition resume.
- **360px, 390px and 1440px** screenshots cover all volumes, quest tabs, mode hub,
  lobby and preparation without horizontal overflow. Actual preparation close
  buttons are at least 44px and clickable above the artwork. Quest tabs support
  ArrowLeft/Right and Home/End with roving focus. The new suite records 22 images;
  an independent visual pass records 27 layouts plus the locked-story lobby.
- Fresh players can inspect every map; a locked-volume lobby opens Mist Gate
  preparation without charging or starting a match. Browse/tab/preparation
  cancellation preserves gameplay state. AI arena/practice are playable; PvP
  and ranked remain noninteractive and explicitly unopened.
- `npm run build` succeeds with **32 allowlisted assets**. The release test now
  enumerates actual files in nested asset directories, retaining exact allowlist
  and byte-hash assertions. Three generated maps are 1536×1024 PNGs, about
  10.1 MiB total, with prompts/provenance in [ART-STORIES.md](ART-STORIES.md).

Evidence: ignored `test-results/stories-smoke.json`, `stories-*.png` and
`stories-visual-*.png`. Full narrative playtesting, economy tuning, physical
iPhone/Android behaviour and compressed-art loading measurements remain open.
Updated client/Worker validation must ship together in a future authorized
release; these local tests do not establish hosted acceptance of new snapshots.
See [implementation and planned online modes](STORIES-AND-MODES.md).

## Life, pills and battle transitions · 2026-09-22

The newer story/quest expansion above supersedes this pass's test/asset counts.

Local follow-up on `codex/game-lobby`; not a deployment or a physical-device test.

- **220 Node tests and eight Python tests pass.** Nine resource-presentation
  tests use accepted engine results to cover costs including Fury, zero bids,
  overkill, capped/suppressed healing and refunds, invalid data and static reload.
  The controller suite now has 17 tests, including phase callbacks and immediate
  completion/cancellation without stale paints or cues. The existing Python
  temporary-404 cleanup warning remains harmless.
- `npm run build` succeeds with **27 allowlisted runtime assets** plus metadata.
  No dependency, binary art, rule, account or schema change accompanies this work.
- All **eight Chrome browser suites** pass against `127.0.0.1:4177`: smoke,
  journey, classics, backpack, account, navigation, immersion and the new
  `tools/battle-presentation-smoke.mjs`. Account tests intercept fixture APIs;
  no real email, account mutation or public deployment is involved.
- The new suite checks own bid/Fury capsule previews against unchanged public
  reserves. Otherwise identical encounters with different hidden opponent bids
  and Fury render the same opponent HUD. The precommitted AI save is unchanged
  by the player's preview controls.
- Observed resource frames follow sealed → bids → impact → recovery → complete.
  A capped fixture's player moves from 11 HP/12 pills to 11/4, then 12/4;
  the opponent goes from 12/11 to 7/11, then 7/12. Other fixtures cover uncapped
  healing/refunds, zero reserve, Fury and overkill. The UI uses actual capped HP
  loss, while the card's damage badge retains the accepted hit value.
- Normal, fast, skipped and reduced-motion runs retain identical accepted
  results and saved totals. Early Next cancels the old reveal, unfinished-round
  reload shows final resources without replay, and completed-match reload cannot
  pay twice. Synthetic pagehide/pageshow completes presentation and preserves
  saves; this does not certify native phone background behaviour.
- Screenshots and measurements cover **1440px**, **360px** and **390px**, with
  no horizontal overflow or browser errors. Phone HUD numbers are 25px, compact
  result numbers 21–23px, and pill ± buttons are 44×44px. Portrait battles still
  scroll vertically; a compact battle-table redesign remains a separate follow-up.
  Resource captions are 10px and span the panel; the result footer keeps its
  controls in view while the full explanation scrolls underneath.
- Normal completion measured **1101–1103 ms from the first sealed frame** in
  the recorded run. The configured phases are 100/390/720/1100 ms. These are
  local observations, not a physical-phone performance guarantee.

Ignored evidence is recorded in `test-results/battle-presentation-smoke.json`,
`battle-presentation-{preview,clash}-{desktop,360,390}.png` and the updated
immersion results. Owned test browsers were closed. Physical iOS/Android checks,
audible recovery-cue tuning and human repeat-play pacing remain open; see
[scope and next additions](IMMERSION.md#life-pills-and-battle-transitions--2026-09-22).

## Mist Gate immersion · 2026-09-22

Local development on `codex/game-lobby`, following the navigation slice. This is
browser/source evidence, not a public deployment or physical-phone test. The
counts, timing and mode scope below describe that earlier pass; the shared
resource/clash follow-up above supersedes them.

- **206 Node tests pass**, including 12 new presentation-controller tests.
  Coverage includes normalized/preference-only writes, blocked storage, cancelled
  and replaced reveals, focus after skip, system/in-game reduced motion,
  gesture-only audio setup, lifecycle cleanup and delayed resume races. Audio
  checks establish a 140 ms onset and zero-jump loop endpoints at 44.1/48 kHz;
  they do not establish audible quality.
- **Eight Python tests pass.** The existing temporary HTTP 404 cleanup
  `ResourceWarning` remains harmless. `npm run build` succeeds with **24
  allowlisted runtime assets** plus metadata; no dependency or binary-art change.
- All seven headless Chrome scripts pass against `127.0.0.1:4177`: smoke,
  journey, classics, backpack, account, navigation and the new
  `tools/immersion-smoke.mjs`. Account checks use intercepted fixtures; no real
  email, hosted service mutation, schema change or deployment occurred.
- The new suite compares full accepted round snapshots, final profiles and
  gameplay RNG call counts across normal, fast, system-reduced, manual-reduced,
  skipped and sound-enabled presentation. All six agree, including an early KO.
  Actual played UIDs gain the correct XP/level change; unplayed copies do not.
- Reloading an unfinished reveal retains its encounter ID, exact copies,
  HP/pills and committed result, then reaches the same settlement. Reloading
  after completion retains rewards/XP without another payment. A real loss
  exposes same-node retry; Jade Forest and practice keep ordinary presentation,
  and practice still grants no currency/card XP.
- Opening/closing preparation or settings leaves gameplay saves unchanged.
  Sound/mix/motion/pace persist independently. A throwing `localStorage` getter
  leaves the lobby and muted settings usable with the existing storage warning.
  Read-only result passports and settings restore the parent result's nonzero
  modal scroll and logical focus; Return/Escape do not pay or replay the result.
- Arrival, battle, complete reveals, rewards and passport returns have no
  horizontal overflow at **360px and 390px**. Visual review also covered
  **1440px desktop**, the arrival close button, actual loss/early-KO outcomes,
  all reveal phases and immediate reduced-motion readability. Portrait battle
  still scrolls vertically; a more compact layout is a recorded follow-up.
- The normal reveal finished about **796/806 ms after the initiating test click**
  in the recorded run, including automation overhead. Controller scheduling is
  100/390/760 ms. These observations are local evidence, not a device performance
  guarantee. Skipping and Next do not require waiting for an animation callback.

Ignored evidence: `test-results/immersion-smoke.json`, its `.log`,
`immersion-*.png`, `mist-visual-*.png` and `mist-node-tests.log`. Artwork decoding
was awaited before screenshots; no page errors were observed. Every owned test
browser was closed. Human onboarding/pacing playtests, audible sound tuning and
physical iPhone/Android lifecycle/performance remain open; see
[implemented scope and additions](IMMERSION.md).

## Account and private-backup evidence

- **The v0.5.0 release baseline passed: 172 Node tests and six Python tests.** Account coverage includes explicit upload/restore choices, identity changes and cancellation, stale local confirmations, cloud revision conflicts, immutable snapshot handling, logout, malformed provider responses, CSRF/content-type checks, bounded request bodies, rate-limit failure, missing/invalid sessions and upstream outages. Snapshot coverage includes canonical v3 data, duplicate IDs, pending battles, byte/card bounds, PostgreSQL-compatible Unicode and storage sizing. These are deterministic local checks, not live email tests.
- The account API uses the pinned Supabase SDK only on the server. Tests verify sanitized user responses, HttpOnly cookie attributes, absence of token-bearing JSON, refresh/error handling and avoiding unchanged-cookie rewrites on ordinary authenticated reads. Client tests verify that account identity changes invalidate in-flight work and that ordinary login does not upload or replace progress.
- The migration and rollback SQL suite passed on an isolated local PostgreSQL cluster. Checks establish private schema/table grants, enabled RLS, authenticated-only RPC grants, rejection of missing identity, account isolation, size bounds, stale revisions and deletion tombstones. The RPC ownership checks are exercised separately from RLS: elevated functions explicitly derive the actor from `auth.uid()`.
- The reusable `tools/test-backup-sql.sh` additionally raced genuinely independent database connections for first creation and subsequent update. Each race produced one commit and one revision conflict; the final harness expects `PT409`. Remote hosts, a non-fixture database and URL routing options were rejected by the harness. The local cluster was stopped and removed afterward. `supabase/tests/bootstrap.sql` is only a minimal Auth fixture for empty, disposable `mythseal_test` databases; it is never a hosted migration.
- **Hosted development database evidence:** the official CLI applied migration `20260921210000`, direct password authentication worked, and the hosted rollback suite passed at **2026-09-21 20:16:06 UTC**. Follow-up migration `20260921210100` was applied at **20:24:59 UTC**; the hosted rollback suite passed again with zero fixture users remaining. It returns permanent revision conflicts as `PT409`, avoiding PostgREST's retry behavior for serialization-failure `40001`. [Supabase RPC retry guidance](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b). See [CONNECTIONS.md](CONNECTIONS.md) for the hosted evidence scope.
- **Real Supabase adapter evidence, 20:25:35–20:25:41 UTC:** the local handler and real SDK verified a generated code without sending mail, read the account identity, saved/read a journey, returned immediate `PT409` conflicts, rejected unauthorized access, isolated two users and exercised deletion, stale recreation, valid recreation and logout clearing. A **2,000-card** fixture with **486,009 compact JSON bytes / 522,196 JSONB text bytes** saved and read successfully. Both disposable users and their backups were removed; zero remaining fixtures were confirmed. `tools/live-account-check.mjs` provides the repeatable check. This run used its **local handler mode against hosted Supabase**; it does not certify Cloudflare Worker CPU limits, hosted Worker behavior, mailbox delivery or a public browser session.
- **Hosted Auth configuration evidence:** at **20:18:39 UTC**, the site/redirect origin, email confirmation requirements, six-digit code length, 600-second expiry and 60-second resend interval were applied and read back. Custom template configuration had been rejected with HTTP 400 while the default sender was active. SMTP/templates were still pending at that time; the later configuration below supersedes that result.
- `tools/account-smoke.mjs` passed **nine browser flow groups** on the integrated app using fresh isolated Chrome contexts and intercepted fixture APIs: guest-save preservation; numeric-code UI without automatic uploads; explicit backup; confirmed restore and local recovery restoration; conflict review before another write; confirmed deletion and revision-preserving recreation; live battle preservation with upload/restore disabled; logout preserving local progress; and unavailable-email UI. The mobile group checked guest, long-email signed-in, backup and confirmation screens at **390 × 844**, with no document overflow. No page errors or failed static resources were observed. No external API or email was used.
- Six account screenshots are stored in ignored `test-results/account-*.png`; the mobile signed-in screenshot was also visually inspected. This browser evidence validates UI integration with mocked services, not cookies against a live Supabase session or physical mobile apps.
- The shared public allowlist contains 19 game assets. Server source, migrations, tests, credentials and private documents are excluded from both the built assets and local Python server. CI now includes a disposable PostgreSQL 17 service for the SQL harness alongside deterministic suites and Worker dry runs. Its configuration is not a claim that the corresponding remote CI job has passed.

**Deployed verification:** source `339e4f5` passed [CI](https://github.com/cambridgetcg/mythseal/actions/runs/35651299770), including the updated `PT409` parallel SQL races. Production asset/private-path checks, a full desktop battle and mobile interactions passed. Nine mocked account flow groups passed against deployed assets. Separately, real HTTPS requests through the Worker passed authenticated backup, isolation, conflict/tombstone/logout and 2,000-card checks at **20:32:27 UTC**, with zero synthetic users/backups remaining. These checks used injected sessions and sent no mail. See [hosting evidence](HOSTING.md).

The subsequent developer-connection update passed **12 targeted Node connection tests and eight Python helper/server tests**. Coverage includes strict Resend list parsing, diagnostic redaction, official endpoint/profile selection, inherited credential/config/Node-hook isolation and an interactive owner-login flow without output capture. Resend CLI OAuth and live domain-read access passed. These checks sent no email and did not deploy a new website version. Source `21320904d284520f69ad7e98310b0e0879b038bf` was pushed and its [complete CI workflow passed](https://github.com/cambridgetcg/mythseal/actions/runs/35655980180), with **177 Node tests and eight Python tests** confirmed from that run's logs.

**Sender configuration, 2026-09-21:** Resend verified `auth.mythseal.com` and all five DNS records at **21:15:31 UTC**. At **21:16:00.449 UTC**, setup passed project/domain identity guards, captured a dedicated domain-restricted `sending_access` key privately in an ignored mode-`0600` file and configured Supabase SMTP. All **16 non-secret settings** matched on readback, including port `465`, user `resend`, sender `Mythseal <login@auth.mythseal.com>`, both OTP templates, six-digit codes, 600-second expiry and a 60-second resend interval. Receiving enabled by the owner was preserved; no incoming-mail game feature was added. Setup/check tools sent no real email.

**Owner-reported mailbox evidence, 21:18:34.252 UTC:** the owner confirmed receiving the numeric code and logging in through `http://127.0.0.1:8791/`. This owner-initiated flow is separate from the earlier synthetic no-email checks. v0.5.1 deployed from `ea48558` at **21:24:31.875 UTC**, following [successful exact-source CI](https://github.com/cambridgetcg/mythseal/actions/runs/35656826179). Live checks matched 19 asset hashes and 13 private-path exclusions. At **21:24:47–21:24:50 UTC**, a generated six-digit code verified through the real HTTPS API; secure host cookies, enabled account, empty private journey, logout and return to guest passed. Cleanup found zero matching fixture users. This synthetic API check sent no email. A mailbox-delivered public-browser login and physical cross-device restoration remain separately unverified. [Account behavior and setup](ACCOUNTS.md).

## Previous v0.4.1 branding and hosting

- **110/110 Node tests passed**: the existing 107 gameplay tests plus three build/hosting boundary tests. No gameplay rules or storage namespaces changed during rebranding.
- The pinned Wrangler 4.136.1 preview passed the desktop/mobile smoke and hosting verification. Both production bundles passed dry runs; GitHub CI passed for deployed revision `ff89b9a2b7144c015bc902c67cc03c128448915f`.
- The production host passed a four-round desktop match, mobile-size interactions and deck persistence. All 15 public asset hashes, security headers/JavaScript MIME and nine private-path 404 responses were checked. The final release manifest and all three HTTP/www canonical redirects were also verified.
- New-domain DNS caches were still inconsistent: public `1.1.1.1` resolved both hostnames, while local resolution and a later Google query remained negative. Production HTTP/browser checks used a process-local edge-IP override with real hostname and normal TLS verification. No global resolver settings were changed.
- [HOSTING.md](HOSTING.md) records exact provider version IDs, manifest digest, CI runs, evidence boundaries and rollback. Browser screenshots and the edge verification receipt remain ignored under `test-results/`. These checks are not physical-device certification or a deployed backend test.
- A separate reviewer checked the public allowlist, symlink handling, redirect code, CSP and CI; no actionable source issue remained. Research documents distinguish current hosting from proposed backend, art, mobile and NFT infrastructure.

## Previous v0.4 private repository and release planning

- Repository preparation reran `npm test`: **107/107 passed**. JavaScript module syntax, Python server compilation and launcher shell syntax passed. Relative documentation links and the domain-research JSON were checked successfully.
- A bounded pre-upload inspection found no credential-pattern matches or player saves among source candidates. Test screenshots/runtime files remain ignored; environment files, signing material and local saves/backups are also excluded. Private machine-specific provenance paths were generalized while preserving prompts and asset records.
- Read-only review of README, roadmap, naming research and CI found no actionable issue. The roadmap describes future deliverables; no contracts, wallets, backend or mobile apps were implemented during repository preparation.
- `.github/workflows/ci.yml` adds separate remote unit/syntax verification using pinned official GitHub actions. Check its actual result in the repository's Actions history; the workflow configuration itself is not evidence of a completed CI run. It does not run browser smoke scripts or build native apps.
- The existing four browser suites passed for v0.4 as documented below. Repository preparation changed documentation and repository configuration, so those unchanged gameplay flows were not rerun solely for the upload.

## Backpack and individual cards

- **107 Node tests passed together with `npm test`**: 35 battle engine, 23 collection and 49 progression. No failures, skips or cancelled tests.
- Collection coverage includes stable unique copy IDs, legacy shared-rank migration, canonical reload without reminting, per-copy XP thresholds and caps, provenance, battle records, three saved decks, exact-copy selection, atomic rejection and ownership protection.
- Progression coverage verifies new copies start at Lv.1 beside an upgraded copy; manual/daily training changes only its selected UID; sale and buyback preserve the full original record with a fee; and battle XP follows the original pending copies even after a different deck becomes active. Only actually played cards receive XP; repeated settlement cannot grant it twice.
- Independent read-only review found a v2 migration edge: the old saved deck could differ from a pending match's hand. Migration now uses the matching legacy battle hand to retain its actual characters, without changing the currently saved deck. The old format did not store the full eight-card starting deck, so any remaining four protection entries are conservatively inferred from owned legal cards. Two new unit cases cover reconciliation, fallback, reload and single settlement.
- All three existing headless Chrome scripts passed after adaptation to v3: `tools/smoke.mjs`, `tools/journey-smoke.mjs` and `tools/classics-smoke.mjs`. They retain full-match, daily/pack/market, card acquisition, cultivation, deck, mobile, round-reveal resume and stale cross-tab abandonment coverage. The classics match additionally verifies XP and a battle record on the acquired exact UID.
- **The new `tools/backpack-smoke.mjs` also passed**, bringing browser coverage to four passing scripts. Its six groups exercise legacy copy migration; a pending v2 match resumed after a deck edit and settled through real UI moves; exact-copy upgrade and locking; sale confirmation/cancellation, reload while sold and exact-card buyback; three named decks with same-role copy replacement; and 390px card/deck/passport layouts. Both original v2 keys remain unchanged and settlement stays single-use after reload.
- The v2 browser migration fixture preserves the raw old profile key unchanged. Canonical v3 fixtures set instance XP rather than modifying derived role-level fields.
- Root visually inspected desktop backpack, three saved decks and the card passport, plus mobile backpack/daily/market screens. The UI keeps level and XP beside each copy and shows its UID in sale confirmation, training selection and battle XP results. A bounded render assertion confirmed an empty canonical collection does not crash the daily screen or mint replacement cards.
- All four browser suites observed no page exceptions, HTTP errors or document-level horizontal overflow at 1440px desktop and 390px mobile. Backpack checks additionally assert modal contents fit their container. JavaScript syntax checks passed for app, adventure and backpack templates. Screenshots remain in ignored `test-results/`.
- Migration writes `shanhai.profile.v3` and `shanhai.battle.v3`, retaining the old v2 keys. A pre-change source backup was made outside this repository; that archive is temporary local implementation evidence, not a cloud save.

## Previous v0.3 evidence

### Classical expansion

- **71 unit tests passed across the two suites**: 35 engine and 36 progression. New coverage includes unique identity across two portrait atlases, the 24-card catalogue, mixed-set faction resonance, classical character effects, legal high-star decks and actual AI combat; expansion migration, welcome gift idempotence, unowned-card protection, themed pack pools and daily classical stock.
- Independent read-only review of migration and ownership gates found no concrete issue. Previous profile values and pending battles remain whitelisted and preserved; unowned cards cannot be saved in decks, upgraded or trained.
- All three headless Chrome scripts passed on the expanded app: `tools/smoke.mjs`, `tools/journey-smoke.mjs` and `tools/classics-smoke.mjs`. Desktop viewport 1440px, mobile viewport 390px. No page/network errors or document-level horizontal overflow observed.
- The new classics suite verified old v2 progress survives migration, four welcome cards are added exactly once, 24 catalogue entries/16 owned cards, filtering by work/faction/set/ownership, locked inspection, the 24-star welcome preset and persistence, a guaranteed classics-only pack with a new acquisition, and a previously unowned NPC card purchased, cultivated and saved in the deck.
- A deterministic browser fixture drew the newly acquired 武松 into an expedition. Real UI moves completed all four rounds, displayed his upgraded power and ability, and settled the encounter once. This verifies integration, not full balance tuning.
- Existing journey regression cases passed again: resume from round reveal, accurate reward and map unlock, arena normalization, preserve uncommitted controls, and stale cross-tab abandonment protection.
- Built-in image generation produced `assets/classics.png` at 1254 × 1254, copied unchanged from its original output. All 12 positions were inspected for recognizable subjects and grid correspondence. Browser checks verified original/new atlas paths; root inspected desktop catalogue and mobile themed shop; the browser-test agent inspected home, mobile gallery and Huangdi details. Screenshots are in ignored `test-results/classics-*.png`.
- Original art, original 12-card stats, starting deck and existing gameplay rules remain unchanged. Historical/mythic inspiration is documented in `CHARACTERS.md` and `CLASSICAL-SOURCES.md`; art prompt and provenance are in `ART-CLASSICS.md`.

## Previous v0.2 evidence

Local prototype checks only. No public deployment or multiplayer server.

- **58 Node tests passed**: 29 engine tests and 29 progression tests. Engine coverage includes 100 seeded full matches, move/deck legality, hidden-information AI, effects, tie breakers, early KO, draw, immutable inputs, expedition cultivation and normalized arena/practice stats. Progression coverage includes migration, London midnight/DST and clock rollback, daily claims, pack guarantee/invalid RNG, atomic failure, finite NPC stock/no round-trip profit, last-copy protection, upgrade caps, sequential map unlocks, first/daily rewards, single-use settlement, arena chest and abandonment.
- Independent progression review found no concrete reward, stock, arbitrage or transaction mutation bug. UI integration mismatches (hero-level type and reward labels) were corrected.
- `tools/smoke.mjs` passed in headless Chrome at **1440 × 1000** and **390 × 844**. Includes original home/rules/collection, filtering, deck validation and saved reload, keyboard controls/focus, enemy inspection, pills/Fury, complete four-round match and stats, mobile selection/reveal and leave flow.
- `tools/journey-smoke.mjs` passed through actual UI. Includes v1 migration; login and half-price training claims and reload; pack cost, three-card inventory and guarantee; NPC purchase/sale and last-copy protection; pack task claim; arena/practice paths and abandonment.
- The journey test seeded level-five cards and deterministic randomness in an isolated browser test profile to obtain a repeatable expedition victory. Actual UI moves resolved the match in two rounds. It reloaded during the first round's reveal and resumed the same state, then verified exact first-clear/daily-cache payout, next-map unlock and no duplicate award after another reload. This is functional coverage, not evidence of balanced difficulty.
- The same browser test verified that upgraded collection cards use base stats in an actual arena match and that ladder settlement persists.
- Final app review found and fixed two persistence issues: keep-and-leave omitted uncommitted card/pill/Fury settings, and an old abandonment dialog could discard another tab's newer battle. The journey suite was rerun with regressions for both: choices survived resume and reload; a stale confirmation left the newer profile and snapshot unchanged. Snapshot deletion now happens within the serialized profile transaction.
- No page exceptions, HTTP error responses or document-level horizontal overflow were observed in either final browser suite.
- Root visually inspected the updated desktop map and market, daily screen at 390px, and pack reveal at 390px. The browser-test agent separately inspected desktop map plus mobile market and pack. Map pins were aligned with generated landmarks. Eleven journey screenshots plus the original smoke screenshots remain in ignored `test-results/`.
- JavaScript syntax checks passed for app and adventure templates. The existing Python loopback server served all browser tests. Launcher shell/Python checks were completed in v0.1; launcher code was unchanged in v0.2. Finder double-click behavior itself was not automated.

Storage is local to the browser origin. Web Locks serialize profile transactions where supported; reward settlement consumes a pending encounter ID. This does not provide server-authoritative anti-cheat or a synchronized multiplayer battle. Keep active battles in one tab. Clearing browser data or switching ports/browsers changes available saves.

Not claimed: optimal/balanced AI, extensive economy tuning, exact historical fidelity, extensive cross-browser coverage, live hosting, online player trading or full accessibility certification.
# Toolkit portability follow-up · 2026-09-21

[TOOLKIT.md](TOOLKIT.md#local-verification) records 194 passing Node tests, eight
Python tests, all five browser suites against local Wrangler, isolated PostgreSQL
backup checks, the local contract fixture and bundle dry runs. These are local
results on the toolkit branch, separate from the historical CI/hosted results
above. The September 22 follow-up adds a preview-binding regression for lone CR
and Unicode line separators and portable browser screenshot paths. No real email,
hosted data changes or deployment occurred in this pass.

## Game lobby and navigation · 2026-09-22

Local development evidence on `codex/game-lobby`; not a hosted release.

- **194 Node tests and eight Python tests passed.** The Python run retained the
  existing harmless temporary HTTP 404 cleanup `ResourceWarning` while passing.
  Public build succeeded with **21 allowlisted runtime assets** plus metadata.
- All six headless Chrome scripts passed against the current-source loopback
  server at `127.0.0.1:4177`: smoke, journey, classics, backpack, account and the
  new navigation suite. Account APIs were intercepted fixtures; no real email,
  hosted account mutation, schema change or deployment was performed.
- Preparation/cancel preserves profile and battle snapshot bytes. Editing an
  exact duplicate copy and returning preserves the chosen location, and only
  explicit Start freezes the active deck's UIDs into a pending encounter.
- Leaving, editing the future active deck, resuming and reloading preserves the
  original encounter ID, captured copies and pending battle snapshot. Existing
  chosen-card/bid/Fury, reveal recovery and stale-tab abandon checks still pass.
- Real UI wins lead to the next unlocked node; losses return through deck
  preparation to the same node. Winning at the final node offers a revisit.
  Preparation, deck detours and reload do not settle or award a completed match
  twice. Draws use the same retry branch as losses; no new browser draw fixture
  was added.
- Filtered owned-card and codex details restore nonzero scroll and keyboard
  focus. An empty unsaved deck draft survives tab/codex detours and the active
  cards dock button. Claiming a daily reward keeps focus in the quest panel;
  subsequent Tab navigation remains contained there.
- At 360px and 390px, all five labelled dock controls remain visible with at
  least 44px tap targets. All destinations, deck editor, catalogue, quest and
  preparation panels fit without horizontal overflow or browser errors.
- Root visually inspected original-art lobby, preparation and quests on phone
  and desktop. The UI reviewer additionally inspected cards and 768px layout;
  toast messages clear the dock. Screenshots are ignored local artifacts under
  `test-results/navigation-ui-*`. Test-owned browser processes were closed.

Behavior and scope are recorded in [NAVIGATION.md](NAVIGATION.md). Physical-device
testing, native/browser-history integration and hosted release checks remain
separate from this local UI slice.
