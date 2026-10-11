# Validation · v0.5.1 · 2026-09-21

v0.5.0 implements 旅程閣, player-session handling and account-private backups of editable offline journeys. Gameplay remains local; no authoritative economy, blockchain or player-to-player trading is implemented. SMTP is configured and the owner confirmed mailbox delivery/local-pilot login. v0.5.1 is deployed with public OTP enabled; real HTTPS OTP/session/logout checks passed with fixture cleanup verified. Public deployment and its exact release evidence belong in [HOSTING.md](HOSTING.md); local or hosted-database checks below do not establish that a new website version is live.

## Q4 content registry · 2026-10-11

Local branch `q4/content-registry`, started from `origin/main` `8afbabc`. Source
commit **`4265039`** adds `tools/content-registry.mjs`,
`tests/content-registry.test.mjs` and the `npm run audit:content` script. Review
fix commit **`7291880`** closes the gaps a review found (below). The
branch is not merged, pushed or deployed, and there was no hosted check. No game
runtime, save schema, content, art or allowlist file changed. Design and scope are in
[EXPERIENCE-MODULES](EXPERIENCE-MODULES.md#q4--content-registry-and-honest-capability-visibility).

- `node --test tests/*.test.mjs`: **469/469**, exit 0, Node 26.0.0, at
  `7291880`. The base has 456; `4265039` added 9 and `7291880` adds 4.
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
  (re-run at `7291880`, unchanged).
- **Audit result:** nothing inconsistent in current content. All 60 authored
  opponent decks are legal, so `app.mjs:opponentDeck` never silently falls back to
  its random legacy deck. Every allowlisted file is used, nothing a served page
  loads is unlisted, and no preview file reaches the public graph.
- **Observations, not fixed:** the six original encounters have no authored
  opponent deck; `app.mjs:opponentDeck` shuffles the legacy roster with
  `Math.random`, so that choice is not injectable. `engine.mjs` declares no rules
  version. The registry reports both instead of inventing values.
- **Not run:** `npm run test:browser` and the WebKit suites, because no runtime
  file changed. Also not run: CI, any hosted or deployed check, and any
  physical-device or human review.

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
