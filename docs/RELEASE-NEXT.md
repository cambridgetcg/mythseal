# Next release plan · v0.6.0 (proposed)

**Status: plan only.** Written 2026-10-11 from `main` **`8afbabc`** on branch
`docs/release-next-plan`. Nothing in this document has been deployed, migrated
or provisioned. The last recorded public release is still **v0.5.1**
([HOSTING.md](HOSTING.md)). This plan creates no hosted resource and grants no
new authority: every step marked **OWNER** needs the owner's own decision and
credentials. **Revised 2026-10-11** after an independent review. The checks
added for the revision are listed in §13.

**Revised again 2026-10-11 for Q1**, on branch `q1/local-commands` at
`b527dc3` (`origin/main` `b40c4d2`, with PRs #6–#9, merged in), for PR #10. v0.6.0
would be the first public release with profile v5, so it now includes Q1
([LOCAL-COMMANDS §15](LOCAL-COMMANDS.md#15-owner-decisions) decision 3). The
release candidate is `main` after PR #10 merges. `8afbabc`, the commit this plan
was first written from, is now a pre-fence v5 build that must never be served
once Q1 has been (§1, §6). The Q1 revision's checks are in §13.

**Revised again 2026-10-13 for D1, N1, D2 and D3**, on branch
`docs/v060-integration` from `origin/main` **`0281798`**. The owner approved
four packets for the v0.6.0 scope on 2026-10-11, and they merged as merge
commits: D1 Back model (PR #11, `335d2b7`), N1 mobile shell (PR #12,
`e785b27`), D2 save durability (PR #14, `a7bda4b`) and D3 first-battle
teaching (PR #15, `0281798`). The release candidate is now `main` at or after
`0281798`, plus the release PR; the fence rule is unchanged (§1). Live
mythseal.com is still v0.5.1. The 2026-10-13 checks, this revision's own and
those the orchestrating session ran and handed over, are in §13. The same day
two rounds of independent review had their verified findings fixed in place
(§13, the "review round 1" and "review round 2" rows); the round-2 fixes made
no network call beyond loopback.

Evidence labels: `path:line` points at the tree this document is committed in;
every citation was re-checked for the Q1 revision and again, against
`0281798`, for the 2026-10-13 revision, and a citation of another revision
says so (for example `git show v0.5.1:…`). Measurements say which commit they
ran on. **[cmd]** is a command run for this plan on 2026-10-11 or 2026-10-13
(exit code given); **UNVERIFIED** marks anything not checked here. The only
network calls made were unauthenticated
`GET https://mythseal.com/release.json` and `GET https://mythseal.com/api/v1/account`;
the Q1 revision made none, and the 2026-10-13 revision made one
`GET https://mythseal.com/release.json` with a generic User-Agent. Besides
that, Wrangler ran its own update check during that revision's
`npm run preview -- --dry-run` (its banner named a newer release, 4.149.0,
§13): a request outside the project's services, whose destination was not
captured. Whether the first revision's dry run at `8afbabc` made one too was
not recorded.

Step markers: **AGENT** = repo change any agent can make and check locally, with
no hosted access. **CI** = GitHub Actions on the exact commit, or, while the
Actions budget blocks it, a local CI record of that commit that the owner
accepts in writing (G7, §12 item 14). **OWNER** =
touches hosted services, real player data, credentials, DNS or billing.

## 1. Goal and scope

**Goal.** Publish `main` as it stands at `0281798` (Q1 from PR #10, then D1,
N1, D2 and D3 from PRs #11, #12, #14 and #15) as **v0.6.0**, while
keeping every existing account, v1 cloud backup and local save intact. A player
who loads the new client must still be able to back up their journey to the
cloud.

**Release candidate.** Build only from `main` at or after `0281798`, plus the
release PR on top (B1). Never build or deploy `8afbabc`, or any other v5
commit on `main` from before PR #10: those are v5 builds without Q1's fence (§6). A
candidate qualifies only if `git merge-base --is-ancestor 7a7d03e <commit>`
exits 0 (`7a7d03e` adds the fence; [cmd] it exits 0 for `b527dc3` and
`0281798`, and 1 for `8afbabc` and `b40c4d2`). That check needed **PR #10 to
land as a merge commit**, and it did: `7712a7b` has the parents `b40c4d2` and
`3140613`, as PRs #1 and #3–#9 before it and PRs #11, #12, #14 and #15 after it
each have two ([cmd] `git log --first-parent --format='%h %p' origin/main`,
2026-10-13: `335d2b7 7712a7b a14ebe7`, `e785b27 335d2b7 f2b0e49`,
`a7bda4b e785b27 3cb2561`, `0281798 a7bda4b 11d86d9`). So `7a7d03e` is in
`main`'s history and stays an ancestor of every later `main` commit. Keep
landing PRs as merge commits, the release PR included: that keeps each
branch's own commits, which the packets' records cite, reachable from `main`.
If the fence's SHA were ever in doubt, `git log --diff-filter=A --format=%h
main -- profile-fence.mjs` names the commit that brought it into `main`
([cmd] it prints `7a7d03e` for `b527dc3` and for `0281798`).

**Why Q1 is in this release.** Live v0.5.1 keeps its journey in
`shanhai.profile.v3` (`git show v0.5.1:progression.mjs` lines 15-16), and `main`
uses profile v5 (`progression.mjs:24`), so v0.6.0 would be the first public v5
release. The Q1 contract requires Q1 in or before that release, and a release
that includes Q1 runs `npm run test:commands` in both engines
([LOCAL-COMMANDS §11](LOCAL-COMMANDS.md#11-profile-field-and-migration-impact),
§15 decision 3).

**What changed on `main` since this plan's `8afbabc` baseline.** Q0 (PR #5) and
the LZ-01 specials briefs (PR #4) were already in `8afbabc`. Since then
(public-build effects from [cmd] `npm run build` at each merge commit,
2026-10-13, §13):

| Change | Public build | Effect on this release |
| --- | --- | --- |
| PR #6, docs index; PR #7, this plan | No change | Documentation only |
| PR #8, LZ-01's six special images | No change: the six PNGs are added to `hosting/preview-assets.json` only, and `hosting/public-assets.json` names no `assets/lz01/` file ([cmd] `git diff 8afbabc b527dc3 -- hosting/`) | Stays preview-only, like the rest of LZ-01 |
| PR #9, Q4 content registry | No change: `tools/content-registry.mjs` is Node tooling, never served; it adds `npm run audit:content` | A tooling check for Phase A (A8) |
| PR #10, Q1 local commands (merge `7712a7b`) | 80 → **83** files: adds `command-ledger.mjs`, `local-commands.mjs` and `profile-fence.mjs`, and changes `app.mjs`, `account-client.mjs`, `cloud-save.mjs`, `profile-store.mjs` and `progression.mjs` | Ships in v0.6.0 (above); its release rules are G9, A8, §6 and §8 |
| PR #11, D1 Back model (merge `335d2b7`) | 83 → **84** files, +19,113 B: adds `nav-stack.mjs` (16,193 B) and grows `app.mjs` by 2,920 B | Ships in v0.6.0 (In scope); `test:back` (G10, A8); root Back without a confirm is the owner default to confirm (§12 item 15) |
| PR #12, N1 mobile shell (merge `e785b27`) | 84 files, +6,350 B: changes `index.html` (`viewport-fit=cover`), nine stylesheets and `app.mjs` (+61 B, two `aria-label`s); no file added | Ships in v0.6.0; fixes A6's two WebKit failures (§12 item 13, resolved); `test:shell` (G10) |
| PR #14, D2 save durability (merge `a7bda4b`) | 84 → **88** files, +41,762 B: adds `platform.mjs`, `save-status.mjs`, `save-ui.mjs` and `saves.css` (30,446 B), and grows `app.mjs` (+9,413 B), `profile-store.mjs` (+1,860 B) and `index.html` (+43 B) | Ships in v0.6.0; changes §6, §8, A5 and C4 (file import); `test:saves` (G10) |
| PR #15, D3 first-battle teaching (merge `0281798`) | 88 → **90** files, +39,670 B: adds `battle-teaching.mjs` and `battle-teaching.css` (25,185 B), and grows `app.mjs` (+10,689 B), `battle-ui.mjs` (+2,700 B), `nav-stack.mjs` (+824 B), `viewport.mjs` (+219 B) and `index.html` (+53 B) | Ships in v0.6.0; `test:coach` (G10); its human-playtest exit is with the owner (§12 item 16) |

From `7712a7b` to `0281798` the public build grows by 106,895 B (seven files
added, 72,648 B; existing files +34,247 B); its 23 PNGs are unchanged. PR #13
(`mobile/cloud-pipeline`) is open and not merged (Out of scope, below).

**In scope**

- Everything merged since v0.5.1: the five-place lobby and viewport navigation,
  WX-01 (15 new 西遊 characters, 29 printings, packs, boxes, 西行印 choices),
  six campaign volumes (66 encounters) and the 火焰山三連戰 activity,
  same-character inheritance, character stacks and the ink codex, Mist Gate
  immersion, the battle resource/clash presentation, story maps, the map piece,
  and the Q0 對局 table (PR #5) ([HANDOVER.md:20-25](HANDOVER.md), `:306-348`,
  `:1157-1254`).
- **Q1** (merged by PR #10): the card page's 修練升級 as a previewed local
  command whose effects and receipt land in one profile write, an optional
  device-local `commands` ledger inside the v5 profile that backups never
  contain, and an IndexedDB read-after-write fence for every writer under the
  profile lock ([LOCAL-COMMANDS](LOCAL-COMMANDS.md); [HANDOVER.md:454-515](HANDOVER.md)).
  `PROFILE_VERSION`, the snapshot format, the Worker's routes and validator
  verdicts, the SQL and the journey flags are unchanged
  ([LOCAL-COMMANDS §12](LOCAL-COMMANDS.md#12-backup-validation-impact)); the
  Worker bundle does gain Q1 code (§2).
- **D1 · Back model** (PR #11, `335d2b7`): browser and system Back close one
  layer at a time. A dismissible dialog closes as its × does, a sub-view
  returns to its parent, a destination returns to 洞府, a battle in progress
  opens the existing keep/abandon menu, a round or match result holds, and Back
  at the 洞府 root leaves the page without a confirmation prompt (the owner
  default, still to be confirmed, §12 item 15). Each row calls the close
  control that layer already has, so Back never settles, pays, claims or writes
  a save ([NAVIGATION](NAVIGATION.md#back-model--2026-10-12)). History entries
  are state-only, under `history.state["mythseal.nav"]` (`nav-stack.mjs:12`);
  the URL never changes. No storage key. Unchanged: the profile, the battle
  snapshot, the Worker, the SQL and the journey flags.
- **N1 · mobile shell** (PR #12, `e785b27`): `viewport-fit=cover` with the
  safe-area insets read once into overridable `--safe-area-inset-*` properties;
  no focus zoom (text entry computes at least 16 px on a coarse pointer); no
  horizontal overflow at 302, 320, 360, 393, 412 and 734 px wide; landscape dock
  fixes; `touch-action` and `overscroll-behavior` rules; 44 px minimum module
  tabs; named volume sliders ([NAVIGATION · Mobile shell](NAVIGATION.md#mobile-shell)).
  CSS and the viewport meta only, plus two `aria-label`s in `app.mjs`. No
  storage key; no engine, save, profile, Worker, SQL or journey-flag change.
  Emulation only: the physical-phone items are open in the
  [M5.1 checklist](MOBILE-RELEASE.md#m51-phone-checklist). Landscape phones
  below 701 px wide keep a fault N1 recorded but did not cause, in the scene
  modules of 市集, 對弈 and 遊歷: with 西行秘匣 selected 開啟秘匣 is hidden, and
  西行印 or 來日, once opened, cover their own tab row until a reload
  ([NAVIGATION.md:450-515](NAVIGATION.md)). It was already at `7712a7b`, but
  those modules are new since v0.5.1, so v0.6.0 would ship it to players for
  the first time (§12 item 17). N1 also left vertical fit open, measured in
  emulation: on portrait phones 741–790 px tall, and on taller ones with top
  and bottom insets (an iPhone 15 home-screen web app among them), the 我的戰卡
  tile of a character with several copies is taller than its list's frame and
  runs under the list's pager; shorter screens flag more pages
  ([NAVIGATION.md:422-449](NAVIGATION.md)). The framed lists are new since
  v0.5.1 too (§12 item 18).
- **D2 · save durability** (PR #14, `a7bda4b`): 匯入旅程備份 in the 旅程閣
  tools, and 「有舊旅程？由備份還原」 on a journey this device has just started
  because no journey key existed, import a 匯出旅程備份 file, either a v5 export
  or a v0.5.1 (profile v3) one, through the strict fenced restore (§6). 旅程閣
  shows when this device last made a cloud backup (上次備份), when its last
  export download started (上次匯出) and the browser's answer to
  `navigator.storage.persist()`, which is requested once, after the first win
  or first pack opening this device records, and at each launch of an
  installed web app until granted. A player not known to be signed in gets
  one backup prompt per milestone, each at most once ever
  ([LOCAL-COMMANDS §19](LOCAL-COMMANDS.md#19-file-import-and-save-safety-d2-2026-10-12)).
  Storage key: the device-local `shanhai.saves.v1` (`save-status.mjs:10`),
  never in the profile, an export or a backup. Unchanged: `PROFILE_VERSION`,
  the snapshot format, the Worker, the SQL and the journey flags.
- **D3 · first-battle teaching** (PR #15, `0281798`): a visible planning hint;
  four skippable coach marks on the first ever battle (a 霧隱渡口 expedition
  encounter while `stats.played` is 0): pick a card, add pills, commit, read
  the reveal; the move panel's attack formula from the engine's own numbers,
  marked 預計 when the opponent's hidden reply could change it; a reveal tip with
  both sides' remaining pills; and a match result that opens on 勝負已定
  ([BATTLE-LAYOUT-PLAN](BATTLE-LAYOUT-PLAN.md#first-battle-teaching--2026-10-12)).
  Storage key: the device-local `shanhai.coach.v1` (`battle-teaching.mjs:191`),
  never in the profile, the battle snapshot, an export or a backup. Unchanged:
  `engine.mjs`, `chooseAIMove`, rewards, the save schema and the battle
  snapshot. Its real exit, a human playtest, is with the owner (§12 item 16).
- Journey **v3** cloud backup (profile v5) on the hosted database and Worker.
- The release gates that [HANDOVER.md](HANDOVER.md) already sets: hosted v2/v3
  migrations, Worker/client flags, a coherent versioned module graph,
  binding-retention proof and smaller image transfers (§4), plus Q1's release
  rules (G9) and the D1, N1, D2 and D3 release checks (G10, G11).

**Out of scope:** the LZ-01/HL-01 literary previews and atelier/playtest pages
(they stay in `hosting/preview-assets.json`, including PR #8's six LZ-01 special
images), Q4's content registry (tooling, never served), an authoritative
economy, native apps (including open PR #13's native pipeline, below), NFTs,
paid upgrades, SMTP/Resend changes and redirect-Worker code changes.
`hosting/www.mjs` and `wrangler.www.jsonc` are
unchanged since v0.5.1 ([cmd] `git diff --stat v0.5.1 origin/main --
hosting/www.mjs wrangler.www.jsonc` prints nothing at `8afbabc`, and again
against `b527dc3` and `0281798`).

**PR #13 is not part of this release.** It is another contributor's branch
`mobile/cloud-pipeline` (Capacitor and fastlane), open and not merged. As
reported by the orchestrating session on 2026-10-13 (not re-checked here; this
revision did not read the branch), it now conflicts with `main` (an add/add
conflict in `platform.mjs` and a union in `hosting/public-assets.json`), and in
a native build it hides 旅程閣, which would hide D2's export and import there.
Native apps are out of scope above, and nothing in this plan relies on PR #13.

## 2. What is live and what main adds

Live values come from [cmd] `curl` at **2026-10-11 08:35:12 UTC** (both HTTP 200,
exit 0); on **2026-10-13 at about 05:23 UTC** one more [cmd] `curl` of
`release.json` (HTTP 200, exit 0) still returned `clientVersion` `0.5.1`,
`gitCommit` `ea48558…`, 19 files, 11,130,757 B and manifest `7c18fceb…4e88`.
The account reply was not probed again. Candidate values come from [cmd]
`npm run build` (exit 0) at **`0281798`**, `main` with D1, N1, D2 and D3
merged. The Q1 revision's measurements at `b527dc3` (whose public files
equal `7712a7b`'s) and the plan's first, at `8afbabc`, are kept in brackets.

| Item | Live (mythseal.com) | Candidate, measured at `0281798` [at `b527dc3`; at `8afbabc`] | Evidence |
| --- | --- | --- | --- |
| `clientVersion` / commit | `0.5.1` / `ea48558` | `0.5.1` (not bumped yet) / `0281798` | live `release.json`; `dist/release.json` |
| Public files | 19 files, **11,130,757 B** | 90 files, **74,496,049 B** (71.04 MiB) [83 files, 74,389,154 B; 80 files, 74,347,757 B]. Q1 added three modules (32,980 B) and grew five existing ones by 8,417 B; D1, N1, D2 and D3 add seven files (72,648 B; N1 adds none) and grow existing ones by 34,247 B, N1's 6,350 B among them (§1) | all three manifests |
| Manifest SHA-256 | `7c18fceb…4e88` | `e05db797…8746` [`10f594fc…4014`; `98028a3a…54db`] | build output; the live value in full is in [HOSTING.md:137](HOSTING.md) (§13) |
| Of which PNG | 3 files, 10,838,776 B | **23 files, 73,418,493 B**, unchanged since `8afbabc` | `dist/release.json` |
| Account API | `{"authenticated":false,"user":null,"emailEnabled":true}`: no `journeyVersions` field, so the v1-only Worker (2026-10-11 probe) | `/api/v2` and `/api/v3` routes behind `JOURNEY_V2_ENABLED` / `JOURNEY_V3_ENABLED`; `journeyVersions` in every account reply. Q1, D1, N1, D2 and D3 change no route (`server/` is unchanged since `7712a7b`) | live probe; `server/account-api.mjs:8-16`, `:123-125`, `:173`; v0.5.1 routes: `git show v0.5.1:server/account-api.mjs` lines 7-12 |
| Local save key | `shanhai.profile.v3` | `shanhai.profile.v5`; reads v4/v3/v2 sources and leaves them in place. Since Q1 a v5 profile may also hold a device-local `commands` ledger. Beside it, device-local and never in a profile, export or backup: `shanhai.saves.v1` (D2) and `shanhai.coach.v1` (D3); D1 writes only `history.state` | `git show v0.5.1:progression.mjs:16`; `progression.mjs:24`; `profile-store.mjs:10-14`, `:85-106`; ledger: `progression.mjs:250`; `save-status.mjs:10`; `battle-teaching.mjs:191`; `nav-stack.mjs:12` |
| Cloud snapshot | v1: 512 KiB, 2,000 copies | v3: 4 MiB, 10,000 copies; v1 is still accepted. The ledger never enters a backup. D2's file import wraps the imported journey as a snapshot v3 before restoring it, as a cloud restore would | `cloud-save.mjs:9-13`, `:177-192`; `server/account-api.mjs:5-6`; `platform.mjs:103-106` |
| Hosted migrations | `20260921210000`, `20260921210100` applied | plus `20260922210000` (v2) and `20260923000000` (v3), **not applied** | [HANDOVER.md:1496-1500](HANDOVER.md); [ACCOUNTS.md:12](ACCOUNTS.md) |
| Deploy helper | v0.5.1's tracked `tools/deploy.mjs` was 15 lines, with no identity, secret or `--keep-vars` checks | Hosted preflight plus `--keep-vars` (`tools/deploy.mjs:63-84`, `:93-97`). It has only stub-test evidence | [cmd] `git show v0.5.1:tools/deploy.mjs` |
| Worker bundle | (unknown) | `Total Upload: 910.52 KiB / gzip: 189.56 KiB` at `0281798` [not measured at `b527dc3`; `906.25 KiB / gzip: 188.52 KiB` at `8afbabc`]. The Worker's 14-module import graph from `server/account-api.mjs` is unchanged from `7712a7b` to `0281798` ([cmd] scratch Node walk of static imports, then `git diff --stat 7712a7b 0281798` over those files: empty). PRs #6–#9 changed no runtime file (§1), so the +4.27 KiB / +1.04 KiB since `8afbabc` is Q1's, and D1, N1, D2 and D3 add nothing to it. The Worker imports `cloud-save.mjs` (`server/account-api.mjs:2`) and, through it, `progression.mjs` (`cloud-save.mjs:2`), which since Q1 imports `command-ledger.mjs` (`progression.mjs:11`), so the bundle now contains Q1 code. Q1 also changed `hydrateProfile` (`progression.mjs:250`), which the validator runs (`cloud-save.mjs:159`). Verdicts are unchanged: `validateProfile`'s exact-key check rejects a `commands` key first (`cloud-save.mjs:113`; `tests/cloud-save.test.mjs:405-411`; [LOCAL-COMMANDS §2](LOCAL-COMMANDS.md#2-files-in-the-pr)) | [cmd] `npm run preview -- --dry-run` exit 0 at `0281798` and at `8afbabc` |

The delta from v0.5.1 to `0281798` covers 223 commits (202 non-merge)
[127 and 115 at `b527dc3`; 61 and 56 at `8afbabc`]. Of the 90 allowlisted
runtime files, 83 changed: 71 added and 12 modified, +8,486/−390 lines [at
`b527dc3`, 76 of 83: 64 added and 12 modified, +6,947/−371; at `8afbabc`, 73:
61 added and 12 modified, +6,228/−356]. Outside the runtime, the
release-relevant changes are unchanged since `8afbabc`:
`server/account-api.mjs` (+13/−7 lines), the two migrations (+103 and +106,
both new files), `tools/deploy.mjs` (+120/−10) and `ci.yml` (+2/−2) ([cmd]
`git rev-list --count`, `git diff --name-status/--numstat v0.5.1 <commit>`,
with the allowlist read at each commit; the `b527dc3` figures reproduce).

**This release is the first real use of the tracked deploy helper's hosted
path.** The v0.5.1 deployment used an ignored helper
([HOSTING.md:119](HOSTING.md)).

## 3. Version bump and where `clientVersion` lives

- **Bump `0.5.1 → 0.6.0`.** The release adds a new local save schema (profile
  v5), new API routes, new migrations and a new asset format. Before 1.0,
  changes of that size take a minor bump.
- `clientVersion` has a single source: `package.json:3` `"version"` (mirrored
  at `package-lock.json:3` and `:9`). `tools/build.mjs:32` reads it and
  `tools/build.mjs:37` writes `release.json.clientVersion`. It also appears in
  the deploy message (`tools/deploy.mjs:96`) and the redirect-check query
  (`tools/verify-hosting.mjs:27`). No runtime module hard-codes the version
  ([cmd] `git grep -e 0.5.1 -e clientVersion` matched only those files plus the
  stub `tests/deploy.test.mjs:6`, which needs no change; outside `docs/` and
  Markdown, the fixed-string `git grep -F` matches the same files at
  `b527dc3`, so Q1 adds no copy of the version). At `0281798` the same grep
  also matches D2's mentions of v0.5.1 as an old export format: a comment at
  `platform.mjs:59`, `tests/save-durability.test.mjs` and
  `tools/save-durability-smoke.mjs`. They name the earlier release, not the
  client version, so the bump must leave them as they are.
- Command: `npm version 0.6.0 --no-git-tag-version`, committed in the release
  PR. Tag `v0.6.0` the exact merged commit after CI passes, or, while the
  Actions budget blocks CI, after the owner has accepted in writing the local
  CI record for that commit (B1, §12 item 14).
- Optional: the hard-coded `enabledFeatures` in `tools/build.mjs:40-41` still
  lists only the v0.5 features. Add `wx01`, `campaign`, `fire-mountain-activity`,
  `journey-v3-backup` and `local-commands`, and for D1–D3 names such as
  `back-model`, `journey-file-import` and `first-battle-coach`, so the public
  manifest describes the release. This changes `release.json` but no hashes.

## 4. Release gates and their status

| # | Gate (source) | Status at `8afbabc`, unchanged at `b527dc3` and `0281798` unless noted | Plan step |
| --- | --- | --- | --- |
| G1 | Hosted v2/v3 migrations applied and verified before the flags are enabled ([HANDOVER.md:1218-1222](HANDOVER.md); migration headers `20260922210000…sql:1-2`, `20260923000000…sql:1-2`) | Not applied ([HANDOVER.md:1499-1500](HANDOVER.md)) | B3 |
| G2 | Client and Worker roll out together; live v0.5.1 rejects the new fields ([HANDOVER.md:1282-1285](HANDOVER.md)) | Assets and Worker are **one apex Worker version** (`wrangler.jsonc:4`, `:10-16`), so they roll out atomically. The flags are **not declared** in `wrangler.jsonc:18-22` | A3, C1 |
| G3 | Coherent hashed/versioned module graph ([HANDOVER.md:1222-1223](HANDOVER.md); [ROADMAP.md:266-267](../ROADMAP.md)) | Not implemented: the build copies files under their source names (`tools/build.mjs:44-47`) and one `Cache-Control: public, max-age=0, must-revalidate` covers everything (`hosting/_headers:7`) | A2 |
| G4 | Hosted proof that the publishable-key binding survives `--keep-vars` ([HOSTING.md:71-81](HOSTING.md)) | Stub tests only | C1 verify |
| G5 | Hosted acceptance of old and new backups ([HANDOVER.md:1224](HANDOVER.md), `:1270-1272`) | `tools/live-account-check.mjs:83` exercises `/api/v1` only | A4, B4, C3 |
| G6 | Transfer-size optimization before a hosted rollout ([HANDOVER.md:1616](HANDOVER.md)); first screen ≤ 1.5 MiB ([CONTENT-RELEASE-PIPELINE.md:63](CONTENT-RELEASE-PIPELINE.md)) | First screen measured at **6.98 MiB** at `8afbabc`; **6.99 MiB** at `b527dc3` and **7.02 MiB** at `0281798`, both recomputed statically (Q1's three modules; then the seven files D1, D2 and D3 added and the files all four packets grew, N1's stylesheets among them) (§9) | A1 |
| G7 | Exact-source CI before deploy ([HOSTING.md:42-43](HOSTING.md)) | CI exists; it has no browser job (`.github/workflows/ci.yml:16-73`). **Updated 2026-10-13.** The two WebKit failures A6 named are fixed by N1 (PR #12): at `0281798`, `test:expansion` and `test:map-piece` exit 0 in Chromium and WebKit, `test:map-piece` with no `test-results/webkit-runtime` folder (A6, §13). **Hosted CI is blocked:** GitHub Actions did not start PR #15's CI job; its check-run annotation reads "The job was not started because an Actions budget is preventing further use." (run 38350385399). Until the owner restores the Actions budget (a billing decision, **OWNER**) or accepts a local CI record instead, no exact-source CI run exists for `0281798` or can exist for the release commit. **Local CI record** (orchestrating session, 2026-10-13, at `11d86d9`, whose tree equals `0281798`'s): every step of `ci.yml` ran and passed (`npm test` 603/603; `tools/test-backup-sql.sh` on a throwaway loopback PostgreSQL **16.14**, TCP only, where CI uses `postgres:17`; Python unittest 9 OK; `npm run test:contracts`; `npm run build`, 90 public files; `npm run preview -- --dry-run` and `npm run deploy -- --dry-run`, both exit 0 with `WRANGLER_SEND_METRICS=false`; `node --check` on every module; `py_compile` of `serve.py`; `bash -n Play.command`), on Node **26.0.0** where CI uses 22, and with the existing `node_modules` instead of `npm ci` | A6, B1; §12 item 14 |
| G8 | Q0 open items: physical devices, real-Safari blur, short portrait windows, owner layout review ([HANDOVER.md:355-361](HANDOVER.md)) | Open | B0 (owner accepts or defers) |
| G9 | Q1 release rules ([LOCAL-COMMANDS §11](LOCAL-COMMANDS.md#11-profile-field-and-migration-impact), §15 decision 3): Q1 ships in this first public v5 release; the candidate and every later deploy or rollback target contains the fence `7a7d03e` or is not a v5 build; `npm run test:commands` passes in Chromium and WebKit | New at `b527dc3`. Q1 is in the candidate (`git merge-base --is-ancestor 7a7d03e 0281798` exits 0). `test:commands` last passed 13/13 groups per engine at `11d86d9`, the tree of `0281798` (orchestrating session, 2026-10-13, §13); before that at `38fa64f` ([VALIDATION](VALIDATION.md#q1-third-pre-merge-review-fixes--2026-10-11)). The owner's review of the Q1 contract is open (§12) | A8, B0, B1, C1 |
| G10 | D1, N1, D2 and D3 release checks: `npm run test:back`, `test:shell`, `test:saves` and `test:coach` pass in Chromium and WebKit ([NAVIGATION · Back model](NAVIGATION.md#back-model--2026-10-12), "Checks", for `test:back`; [NAVIGATION · Checks](NAVIGATION.md#checks) for `test:shell`; [LOCAL-COMMANDS §19](LOCAL-COMMANDS.md#19-file-import-and-save-safety-d2-2026-10-12); [BATTLE-LAYOUT-PLAN](BATTLE-LAYOUT-PLAN.md#first-battle-teaching--2026-10-12); the D2 merge notes in [HANDOVER](HANDOVER.md#d2-save-durability-checkpoint--2026-10-12-local-only)). `test:browser` runs none of the four | New at `0281798`. All four passed at `11d86d9` (orchestrating session, 2026-10-13, §13): `test:back` 21 checks in Chromium and 20 in WebKit, `test:shell` 26 per engine, `test:saves` 20 groups per engine, `test:coach` 16 checks per engine. No CI job runs them yet (G7) | A6, A8, B1 |
| G11 | The packets' owner-pending exits: D3's human playtest with at least three first-time players and the owner's review of the coach copy ([BATTLE-LAYOUT-PLAN](BATTLE-LAYOUT-PLAN.md#first-battle-teaching--2026-10-12), Exit); D1's root Back without a confirm, the owner default as built ([NAVIGATION](NAVIGATION.md#back-model--2026-10-12)); the physical-phone items of D1, N1, D2 and D3: N1's in the [M5.1 checklist](MOBILE-RELEASE.md#m51-phone-checklist), which holds only N1's rows, and D1's, D2's and D3's in their own records (listed in §12 item 1); the landscape fault below 701 px wide that N1 recorded and v0.6.0 would ship publicly for the first time (§1, §12 item 17); the vertical-fit fault on portrait phones that N1 also recorded and v0.6.0 would also ship publicly for the first time (§1, §12 item 18) | Open | B0 (owner accepts or defers); §12 items 1, 15, 16, 17 and 18 |

## 5. Ordered checklist

Each step gives the action, then how to verify it, then how to roll it back.
Do not start a step until the previous step's verification has passed.

### Phase A · Build the release candidate (AGENT, no hosted access)

**A0 · OWNER · Staging decision, before any Phase A work.** Choose S1, S2, S3
or no staging (§7). S1 needs staging-capable tooling inside the tag that B1
cuts (A4(d)), so this decision cannot wait for B0. Changing it after B1 means
re-cutting the tag.

**A1 · Asset derivatives (gate G6).** Implement `tools/assets/build.mjs` as
specified in §9. Point the CSS `url()`s and JS asset strings at the WebP
derivatives, swap PNG→WebP in `hosting/public-assets.json`, and update
`tests/hosting.test.mjs` and the `.png` path assertions in
`tests/wx01-cards.test.mjs:88`, `:120` and `:125`. Original PNGs stay in Git and
drop out of the public allowlist. v0.5.1 tabs still open after the deploy will
then get 404s for the PNGs (§6).
*Verify:* `npm test`, `npm run build`, the first-screen budget check (A6), and
the §10 step 3 browser suites in both engines where they run both
(`test:back`, `test:saves`, `test:shell` and `test:coach` among them;
`test:browser`, which runs none of those four, runs Chromium only; since N1
every one of these suites, WebKit `test:expansion` and `test:map-piece`
included, exits 0 on the commit before A1, §13). The owner reviews the art at 390 px and on desktop.
*Rollback:* `git revert`. Nothing hosted is involved.

**A2 · Versioned module graph (gate G3).** Recommended design: the build
writes every `.mjs` and `.css` to `dist/r/<first 12 hex of the code-manifest
SHA-256>/…` with unchanged relative imports, and `index.html` (served from the
root, still `must-revalidate`) points at that directory. CSS `url('assets/…')`
becomes the root-absolute `url('/assets/…')`. JS asset strings already resolve
against the document. Add a `_headers` rule `/r/*` →
`public, max-age=31536000, immutable`. Images keep the current
`max-age=0, must-revalidate` (cheap ETag revalidation) until derivative
filenames carry a content hash, which is a later step. This needs no rewriting of import
specifiers, and it works even though `bootstrap.mjs:3` dynamically imports
`app.mjs`. That is the only dynamic import in the runtime ([cmd] grep of
allowlisted `.mjs`).
*Why it matters:* during a deploy, one page load can currently mix module
versions. The failure mode is the recovery screen with saves untouched
(`bootstrap.mjs:1-23`). The risk is small but real. Content-addressed
directories stop a page from mixing versions, but they **do not remove the
failure; they turn it into 404s.** Workers Static Assets serve only the current
version's files (not re-checked against Cloudflare docs here). A page whose
`index.html` came from the previous version, and which fetches its modules
after the switch, gets 404s and the same recovery screen. The v0.5.1 → v0.6.0
switch is worse. v0.5.1's `index.html` loads `app.mjs` directly, with no
`bootstrap.mjs` (`git show v0.5.1:index.html` line 28). A v0.5.1 page caught
mid-switch therefore shows an empty page until it is reloaded. To actually
remove the failure in later releases, have the build also include the previous
release's `r/<hash>/` directory for at least one release, and test that.
Repeat visits become cheap either way.
*Verify:* hosting tests assert that `index.html` references only the current
`r/<hash>`, that every `release.json` path exists, and that no `.mjs` under
`dist/` sits outside `r/`. Run the browser suites against `dist` served by
`npm run preview` (loopback), with `hosting/.dev.vars` **absent**. The preview
config names the hosted Supabase URL (`hosting/wrangler.preview.jsonc:20`) and
loads that file when it exists (`tools/preview.mjs:61-63`). Without the file,
Phase A has no hosted access. Eleven smokes also import runtime modules inside
the page (`page.evaluate`) by their path at the site root. Each opens the page
at `GAME_URL`'s root, so a relative `./engine.mjs` resolves to `/engine.mjs`
([cmd] `grep -n "import('[./]" tools/*.mjs` at `0281798`: 24 lines holding 25
imports, `tools/coach-smoke.mjs:741` having two; 16 at `b527dc3`):
- `/profile-fence.mjs`: Q1's `tools/command-smoke.mjs:258`, `:291`, `:294`,
  `:339`, `:340`, `:386` and `:390`, `tools/account-smoke.mjs:280` and D2's
  `tools/save-durability-smoke.mjs:325`;
- `./engine.mjs`: `tools/journey-smoke.mjs:70`, `tools/navigation-smoke.mjs:80`,
  `tools/immersion-smoke.mjs:106`, `tools/stories-smoke.mjs:105`,
  `tools/expansion-smoke.mjs:77`, D2's `tools/save-durability-smoke.mjs:153`
  and D3's `tools/coach-smoke.mjs:227`, `:262`, `:294` and `:741`;
- `./progression.mjs` and `./battle-teaching.mjs`: D3's
  `tools/coach-smoke.mjs:741`, `:777` and `:809`;
- `./collection.mjs` and `./profile-store.mjs`:
  `tools/wx01-presentation-smoke.mjs:172` and
  `tools/collection-display-smoke.mjs:248-249`.

After the move to `r/<hash>/` those paths no longer exist, so A2 must either
keep them resolvable or point every one of them at the current `r/<hash>/`;
re-run the grep to find them. `journey-smoke.mjs` matters most: C2 runs it
against production, where its 404 would look like a failed deploy. D1's
`tools/back-smoke.mjs:108` also hard-codes production's document
`Cache-Control` (`public, max-age=0, must-revalidate`, from `hosting/_headers`)
for its real bfcache restores; if A2 changes the header `index.html` is served
with, change that constant with it. Afterwards
`test:browser` (which includes C2's `smoke.mjs` and `journey-smoke.mjs`),
`test:commands`, `test:back`, `test:saves`, `test:shell`, `test:coach`,
`test:expansion` and the other §10 step 3 suites must pass against that
preview, in both engines where they run both. Every one of them passed on the
tree of `0281798` against `tools/serve.py`, in WebKit too where the suite runs
it (§13), so a failure after A2 is A2's to explain.
*Rollback:* `git revert`. The owner may instead waive G3 in writing for this
release and accept the mixed-load risk.

**A3 · Flags in source control (gate G2).** Add `"JOURNEY_V3_ENABLED": "true"`
and `"JOURNEY_V2_ENABLED": "false"` to `wrangler.jsonc` `vars`.
**Recommendation: keep v2 off, and declare it explicitly.** No public client
ever wrote v2: the current client uploads only `SNAPSHOT_VERSION` 3 (`account-client.mjs:222`, `cloud-save.mjs:9`), and the
v2 table does not exist on the hosted database until B3, after which it is
empty (per [HANDOVER.md:1499-1500](HANDOVER.md); not re-queried). Enabling v2 would only add a
fallback read per sign-in (`account-client.mjs:116-129`). The `[1,3]`
combination is already covered by tests (`tests/account-api.test.mjs:344`,
`tests/account-client.test.mjs:53`, `:73`).
**Turn a flag off by declaring `"false"`. Deleting it is not enough.** The
helper deploys the apex with `--keep-vars` (`tools/deploy.mjs:12`, `:95`). In
the pinned Wrangler 4.136.1 that flag sends `keep_bindings: ["plain_text",
"json"]` (`node_modules/wrangler/wrangler-dist/cli.js:159303-159306`), so a
variable missing from `wrangler.jsonc` keeps its value from the previous
version ([HOSTING.md:65](HOSTING.md); this is source inspection, not a hosted
test). The server enables a version only when the value `=== 'true'`
(`server/account-api.mjs:124`). For the same reason, leaving
`JOURNEY_V2_ENABLED` out would keep any value set earlier in the dashboard
(**UNVERIFIED** whether one exists). An explicit `"false"` in source overrides
it. Then extend `tools/verify-hosting.mjs:35-38` to assert that the anonymous
`/api/v1/account` reply carries `journeyVersions` equal to the configured set.
*Verify:* `npm test`, including a new test that asserts both values in
`wrangler.jsonc`. `npx --no-install wrangler deploy --config wrangler.jsonc
--dry-run` should print both among the bindings (not run here). Neither
`npm run preview -- --dry-run` nor the helper's dry run shows them. Preview
uses `hosting/wrangler.preview.jsonc`, and the helper captures Wrangler's
output without printing it (`tools/deploy.mjs:46-57`).
*Rollback:* `git revert`. **This commit must not be deployed before B3 and B4
pass.** A flag that points at a missing RPC returns 503 to signed-in players
(`server/account-api.mjs:240-245`).

**A4 · Hosted-check tooling, code only (gate G5).** (a) Extend
`tools/live-account-check.mjs` with a v3 path covering: a v1 backup restored by
the new client, v3 upload, `PT409` conflict, tombstone and stale-recreate on
v3, a near-limit v3 boundary of about 9,999 copies, and a **byte-cap case**
close to 4 MiB built from long strings (each at most 512 characters,
`cloud-save.mjs:16`). The 9,999-copy snapshot is only 1.82 MB, so it never
reaches the byte cap. Also in (a):
  - **Use separate fixture users** for the v1 and v3 paths, or space them
    more than 60 s apart. `BACKUP_RATE_LIMIT` allows 10 writes per 60 s per
    user (`wrangler.jsonc:25`). It counts every non-GET journey request,
    including those that return 409, and it runs before the RPC
    (`server/account-api.mjs:234`). The v1 path already makes 6 writes on
    fixture A (`tools/live-account-check.mjs:144-179`), and the v3 sequence
    adds about 6 more. Hosted mode on one user would therefore get 429
    `rate_limited` and fail C3 falsely. Local mode stubs the limiter
    (`:74-77`), so B4 cannot catch this. Add a test that runs the hosted-mode
    sequence against a stub limiter that enforces 10 per 60 s.
  - **Extend the cleanup receipt** (`:215`), which counts only
    `private_backup.journeys`, to count `journeys_v2` and `journeys_v3` too.
    Those rows cascade on user delete (v3 migration line 30), but today a
    "zero" receipt does not prove it.

(b) Add a **read-only**
catalog probe SQL file. It contains only the privilege and RLS assertions from
the first `do $$` block of `supabase/tests/wx01_journey_v2.sql` and
`supabase/tests/campaign_journey_v3.sql`, plus `select count(*)` of the new
tables, with no inserts and no role switching. (The full v2/v3 fixtures must
never run against the hosted database: `supabase/tests/campaign_journey_v3.sql:1-2`.)
(c) Prepare, but do not run, a reviewed down-migration that drops the v3/v2
RPCs and tables, guarded by "tables are empty". Keep it **outside**
`supabase/migrations/` (for example `supabase/rollback/`). `db push` would
apply any file in that folder as a new forward migration. The file locks both
tables, raises an error unless both are empty, then drops the objects, all in
one transaction. How to run it and repair the migration history is in §8.
(d) **Only if A0 chose S1:** give `tools/deploy.mjs`,
`tools/live-account-check.mjs` and `tools/verify-hosting.mjs` an explicit
target, `production` or `staging`, read from one allowlist that names the
Workers, config files, project ref and origin. In staging mode they must
refuse every production name. Today all three are hard-wired to production:
`tools/deploy.mjs:11-14` deploys only `mythseal` and `mythseal-www`,
`tools/live-account-check.mjs:10-12` fixes the project ref and
`https://mythseal.com`, and `tools/verify-hosting.mjs:5` defaults to
production. Cover the refusals with stub tests.
*Verify:* unit tests against stubs; `bash tools/test-backup-sql.sh` on a
disposable loopback database (CI does this, `ci.yml:46`; while hosted CI is
blocked (G7), run it locally on a fresh loopback cluster, as the orchestrating
session did on 2026-10-13 with PostgreSQL 16.14, §13).
*Rollback:* `git revert`.

**A5 · Cross-version save guards (recommended; the owner may accept the risk
instead, §12 item 9).** Two cases in §6 hide progress without deleting it.
**Re-evaluated 2026-10-13 for D2:** D2 (PR #14) gives part of case (a) a way
back, as a file, and builds most of the recovery path A5(a) needs, but it does
not detect or read a stranded key; case (b) is unchanged.

*What D2 covers.* 匯入旅程備份 (in the 旅程閣 tools) and the new-journey restore
offer's 備份檔 import a file that 匯出旅程備份 wrote: a v5 export, or a v3 one,
which every public build before v0.6.0 wrote (v0.4.1, v0.5.0 and v0.5.1); a v4
file is accepted too, though no public build wrote one: v4 is the local
namespace `load()` also migrates (`platform.mjs:58-61`; [cmd] `git show
<tag>:progression.mjs` prints `PROFILE_VERSION = 3` for all three tags).
`checkJourneyText` (`platform.mjs:77-107`) migrates a
legacy file exactly as `load()` migrates the same journey under its own legacy
key on this device (`platform.mjs:67-70`: a profile store over an in-memory
storage holding only the file), then checks it with every v5 rule and wraps it
as a snapshot v3 (10,000 copies, 4 MiB, so a v0.5.1 journey over the 2,000
copies of a snapshot v1 still restores). The confirmed import runs through
`restoreLocalProfile` (`app.mjs:139-162`) under the strict fenced lock
(`app.mjs:63`), into `store.restore` (`profile-store.mjs:154-161`), which
refuses an unfinished battle or activity, `economyBusy`, an unacknowledged WX
receipt or a journey changed since the confirmation, then into `store.replace`
(`:133-148`): the `RECOVERY_KEY` copy of the replaced journey first, the
replaced lineage's ledger retired when it has one, one profile write, and no
write at all on any refusal ([LOCAL-COMMANDS §11](LOCAL-COMMANDS.md#11-profile-field-and-migration-impact),
"File import"; [§19](LOCAL-COMMANDS.md#19-file-import-and-save-safety-d2-2026-10-12)).
The file's own ledger is checked and then left out by `createSnapshot`. So a
player whose v0.5.1 tab is still open can export from its footer and import
that file in v0.6.0, which replaces the v5 journey and keeps the replaced one
as the recovery copy (one slot per browser; the confirmation says when it
replaces an older one). Progress split between the two journeys cannot be
merged. A legacy file exported mid-battle is refused as unfinished
(`platform.mjs:88`).

*What D2 does not cover.* It reads files, never keys. `load()` reads
`shanhai.profile.v5` first (`profile-store.mjs:92-94`) and looks at a legacy
key only while v5 is absent, so progress a v0.5.1 tab writes after v0.6.0 has
migrated that device stays unread. Nothing detects that the v3 key changed.
The only file that includes the v3 key, the startup-recovery export
(`bootstrap.mjs:13-19`), is refused by the import as not an export: it has no
numeric `version` (`platform.mjs:83`). Once the old tab is reloaded or
closed, its later progress is still beyond the game's reach. The restore
offer appears only when no journey key exists at all (`app.mjs:53`;
`profile-store.mjs:82-84`), so it never appears in this case.

(a) *Local*, what remains: when profile-store migrates a legacy key into v5,
record the source key and its fingerprint under a **separate** localStorage
key, so the v5 profile and cloud snapshot formats stay unchanged. If that
legacy key changes later (a `storage` event, or a fingerprint mismatch on
load), offer recovery or export instead of ignoring it. Recovery replaces the
v5 journey, so under Q1 it is an import, and any import must retire the ledger
as restore does ([LOCAL-COMMANDS §11](LOCAL-COMMANDS.md#11-profile-field-and-migration-impact),
"Export"). D2 has built that path: pass the key's text to `checkJourneyText`,
show D2's import confirmation and apply it with `restoreLocalProfile`, so the
legacy journey takes the same strict migration, the same snapshot v3 wrapping
and the same fenced restore as a v0.5.1 file. (Before D2, this step had to wrap
a v3 profile as a snapshot v1, whose validator caps it at 2,000 copies and
512 KiB, `cloud-save.mjs:121-122`, `:201`; D2 migrates first, as `load()` does,
`profile-store.mjs:95-112`, which LOCAL-COMMANDS §19 checks with a journey over
2,000 copies.) A legacy key from a tab closed or reloaded mid-battle is still
refused, and no served build can finish that battle: offer it as export only,
and say why (`load()` carries a pending battle across, `profile-store.mjs:103-111`,
but the import refuses it). Do not write the legacy journey through
`transact`, whose guard refuses it for every player with a ledger
(`app.mjs:128-129`), or through a bare `profileStore.save`, which would drop
the ledger and let an earlier command ID commit again. Never copy the old
`commands` across either: that keeps the replaced lineage's command IDs
executable in the recovered journey (D2's path already leaves a file's ledger
out). (b) *Cloud:* make `readCloud` (`account-client.mjs:116-129`, unchanged
by D2) also read the older enabled namespaces when the v3 backup is not empty,
compare `updatedAt`, and offer a newer legacy backup for restore. That costs
one more GET per sign-in. Both changes stay inside existing modules, so no new
runtime file is needed.
*Verify:* unit tests for both cases, including (a) over a profile with a
ledger: the ledger is retired, a `RECOVERY_KEY` copy exists, and a command ID
issued before the recovery is expired after it. Also cover the legacy journey
this path refuses, a pending battle (offered as export only), and a v3 key
over 2,000 copies, which now restores. Then the browser suites, including
`npm run test:commands` and `npm run test:saves` in Chromium and WebKit.
*Rollback:* `git revert`.

**A6 · Browser CI and payload budget (gate G7).** See §10. The two WebKit
failures this step used to fix first, both reproduced at `8191bfe` (§13), are
fixed on `main` by N1 (PR #12, `e785b27`). Measured on 2026-10-13 at
`0281798` (§13):
- `test:expansion` used to stop at `360x740/rewards/grants`, and at `360x640`
  when that size ran alone: the rewards dialog's `module` tab was 43.08 px wide
  in Playwright WebKit on macOS, under the smoke's 44 px minimum
  (`tools/expansion-smoke.mjs:116`, `:129`). It was on record for `ced2aa4`
  ([BATTLE-LAYOUT-PLAN.md:155-157](BATTLE-LAYOUT-PLAN.md),
  [VALIDATION.md:3731-3733](VALIDATION.md)) and for `b6410e9` and the Q1 fixes
  ([VALIDATION.md:3261-3263](VALIDATION.md);
  [LOCAL-COMMANDS.md:702](LOCAL-COMMANDS.md)). N1 gives module tabs a 44 px
  minimum width ([NAVIGATION · Mobile shell](NAVIGATION.md#mobile-shell),
  "Landscape"). Now `GAME_URL=http://127.0.0.1:4205 npm run test:expansion`
  exits 0, and its WebKit half prints all 16 PASS lines in one run, 360x740
  and 360x640 included. Whether Linux WebKit on a runner measures the same is
  **UNVERIFIED**, but the fix is a CSS minimum width, not a font measurement.
- `test:map-piece` could not launch WebKit unless `test-results/webkit-runtime`
  held a browser, because the smoke pointed `PLAYWRIGHT_BROWSERS_PATH` there
  whenever the variable was unset ([LOCAL-COMMANDS.md:703](LOCAL-COMMANDS.md)).
  Now `tools/map-piece-smoke.mjs:14` does that only when the folder exists, as
  the other smokes do (`tools/expansion-smoke.mjs:15`). With the variable unset
  and no such folder, `npm run test:map-piece` exits 0, 8 PASS lines per
  engine, WebKit launched from Playwright's default cache, as §10 step 1 would
  install it.

What remains of A6 is the browser job (§10) and the payload budget check
(§10 step 4).
*Verify:* on the A6 commit, every §10 step 3 suite exits 0 against the
preview, in both engines where it runs both (`test:browser` in Chromium), and
`.github/workflows/ci.yml` defines the browser job with those suites and the
§10 step 4 budget check. That is local work, so Phase A does not wait on an
owner act. The job's first hosted run belongs to B1, on the release commit:
GitHub Actions starts no job until the owner restores the Actions budget
(G7), and a local CI record stands in for it only under the owner's written
acceptance (B1, §12 item 14).
*Rollback:* `git revert`.

**A7 · Version and docs.** Bump to 0.6.0 (§3). Correct stale counts: HOSTING
still says "19 runtime files" (`docs/HOSTING.md:13`). Draft release notes. They
must tell players to reload every open tab after the release (§6), and can say
that a 匯出旅程備份 file from v0.5.1 imports in 旅程閣 (D2). If the owner ships
the landscape fault below 701 px (§12 item 17) or the vertical-fit fault on
portrait phones (§12 item 18), the notes name each one shipped as a known
issue.

**A8 · Local release-candidate checks**, on `main` at or after `0281798` plus
the release PR, never on `8afbabc` or another pre-fence commit (§1).
`git merge-base --is-ancestor 7a7d03e HEAD` (exit 0: the fence is in the
candidate) · `npm test` · `python3 -m unittest
discover -s tests -p '*_test.py'` · `npm run audit:content` (Q4's content
audit, no findings) · `npm run build` · `npm run preview --
--dry-run` · `GAME_URL=… npm run test:browser` · `GAME_URL=… npm run
test:commands` (Q1, Chromium and WebKit: `test:browser` does not run
`tools/command-smoke.mjs`, whose B2–B11 are the only browser checks of the
fence's edge cases and the only WebKit checks of the command path;
[LOCAL-COMMANDS §11](LOCAL-COMMANDS.md#11-profile-field-and-migration-impact))
· `GAME_URL=… npm run test:back`, `test:saves`, `test:shell` and `test:coach`
(D1, D2, N1 and D3, each Chromium then WebKit; `test:browser` runs none of
them; G10) · the other §10 step 3 suites in both engines ·
`bash tools/test-backup-sql.sh` (disposable loopback database only). Serve the
browser suites from a server started after checkout: `tools/serve.py` reads
the allowlist once at startup, so an older server returns 404 for modules added
since it started, such as Q1's or D1–D3's ([HANDOVER.md:513-515](HANDOVER.md)).
*Verify:* every command exits 0, WebKit `test:expansion` included: since N1 it
passes in one run (A6; §12 item 13, resolved). If it ever fails again, note
that the smoke stops at its first failed check: one `try` holds the size loop
and the four checks after it, and the first error is rethrown
(`tools/expansion-smoke.mjs:179-264`), so a run that fails at
`360x740/rewards` has printed only 6 of its 16 PASS lines and shows nothing
about the rest. Run it once per size (`BROWSER=webkit VIEWPORT_SIZE=<size>
GAME_URL=… node tools/expansion-smoke.mjs`; `:22`) to see the rest, and treat
the failure as a NO-GO until it is fixed or the owner decides otherwise in
writing. Record the results in [VALIDATION.md](VALIDATION.md).

### Phase B · Owner gate and hosted database

**B0 · OWNER · Decisions** (§12): scope, the Q0 open items, art derivative
approval, whether G3 can be waived, the v2 flag, the B3 backup method, the
apex Worker's CPU limit (§6), either the A5 guards or a written acceptance
of the §6 open-tab and hidden-backup cases, the Q1 contract with its
forward-only rule (G9, §12 item 12), how exact-source CI happens while the
Actions budget blocks it (G7, §12 item 14), the packets' physical-phone items
and the review rounds D2 and N1 ended at their cap (item 1), D1's root Back
(item 15), D3's playtest exit (G11, item 16), the landscape fault below
701 px (item 17) and the vertical-fit fault on portrait phones (item 18).
Staging was decided in A0. The WebKit
expansion tab (item 13) needs no decision any more: N1 fixed it.

**B1 · CI then OWNER · Exact source.** Open the release PR. CI must pass on the
final commit, including the new browser job. GitHub Actions starts no job
until the owner restores the Actions budget (G7); a local CI record can stand
in only if the owner accepts it in writing (§12 item 14). Merge, tag `v0.6.0`
on the merged commit and push the tag (owner).
*Verify:* the CI run URL is recorded and `git rev-parse v0.6.0` equals the CI
commit, or, under the owner's written acceptance, the local CI record names
that exact commit, every `ci.yml` step and browser suite with its exit, and
how its environment differs from CI's (Node, PostgreSQL, `npm ci`, operating
system and browsers). `git merge-base --is-ancestor 7a7d03e v0.6.0` exits 0,
so the tag contains Q1's fence (G9).
*Rollback:* delete the unpublished tag. Nothing is deployed yet.

**B2 · OWNER · Staging rehearsal (recommended).** Only if A0 chose S1 and the
A4(d) target switch is in the tag: run B3–C3 against the staging pair from §7
with every tool in staging mode. **Without that switch, do not reuse the tag
for staging.** Its deploy helper, checker and verifier are hard-wired to
production (A4(d)). "C1" inside B2 would be `npm run deploy`, which would push
v0.6.0 with V3 on to the production apex before the production B3 has run.
Every signed-in player's v3 upload would then get 503
(`server/account-api.mjs:240-245`), and "C3" would hit production as well. If
no staging exists, record an explicit acceptance of the risk and continue.

**B3 · OWNER · Apply the v2+v3 migrations to `mythseal-dev` (real players).**

1. Confirm the target: `supabase/.temp/project-ref` must be
   `puiuevggytoxyyearkcq` ([supabase/README.md:5](../supabase/README.md)).
   Run `npx --no-install supabase migration list --linked`. Expect remote
   `20260921210000` and `20260921210100`, and **local-only** `20260922210000`
   and `20260923000000`. Stop on any other difference.
2. **Back up. This is a hard gate: do not start step 3 until a backup exists
   and has been read back.** `supabase db dump` cannot run on this Mac as
   written. CLI 2.117.0 runs `pg_dump` inside a container image chosen for the
   server's major version ([cmd] inspection of the CLI binary's
   `legacy.db.dump` path, which ends in `error running container: exit N`).
   This Mac has no Docker, Colima or Podman ([cmd] `which docker colima
   podman`, exit 1; §6). Use one of these methods:
   - (a) The owner installs a container runtime, then runs `npx --no-install
     supabase db dump --linked --schema private_backup,public -f <path outside
     Git>`.
   - (b) `npx --no-install supabase db dump --linked --schema
     private_backup,public --dry-run` prints the `pg_dump` script without a
     container. Run that script with a local `pg_dump` whose major version is
     at least the server's. Local Homebrew `pg_dump` is **16.14** ([cmd]
     `pg_dump --version`). `supabase/config.toml:41` declares
     `major_version = 17`, so the hosted server is probably 17 (**UNVERIFIED**;
     read `select version()` first). 16.14 would refuse to dump a 17 server,
     so install a matching client first. The dry run substitutes the
     connection settings into the printed script, so treat its output as a
     secret.
   - (c) Run `pg_dump` 17 or newer directly with the dashboard's connection
     string, entering the password at the prompt (never in argv). Take
     `--schema-only -n private_backup -n public`, plus `--data-only -n
     private_backup` for the backup rows.

   **What the dumps hold.** The schema dump holds no player data. A data-only
   dump of `private_backup` holds user UUIDs and journey snapshots, but **no
   emails**: those are in `auth.users`, which these dumps exclude. Snapshots are
   still player data, so encrypt that dump at once, keep it outside Git and
   delete it after a set period. **No `auth.users` dump is needed.** Both
   migrations only create tables, functions, policies and grants. Their
   `alter table` statements touch only the tables they create, and the one
   repeated statement on an existing object is v1's schema-level `revoke`
   (line 6 of both, repeating v1 line 4). They cannot change existing auth or
   v1 rows. The data dump guards the v1 backups against operator error, not
   against the migration. **UNVERIFIED:** whether the Free plan includes provider-side
   backups or point-in-time recovery.
3. Run `npx --no-install supabase db push --linked --dry-run`. It must list
   exactly the two files above. Then run `npx --no-install supabase db push --linked`.

*Verify:* `migration list` shows four applied. The read-only probe from A4(b)
passes: no `USAGE` on `private_backup` for `authenticated`; `anon` cannot
execute the v2/v3 RPCs; RLS is on for `journeys_v2` and `journeys_v3`; both
tables have 0 rows. **The live site is unaffected:** from a worktree of tag
`v0.5.1`, `npm run build && npm run verify:hosting` still passes, and
`/api/v1/account` still returns `emailEnabled: true`.
*Rollback:* none is needed for live play. The migrations only add objects
(`20260922210000…sql:1`, `20260923000000…sql:1`), and the live v0.5.1 Worker
calls only the v1 RPCs. If removal is required, follow the down-migration
procedure in §8 while both tables are empty, including the migration-history
repair. Never `db reset` and never re-provision
([supabase/README.md:11](../supabase/README.md)).

**B4 · OWNER · Pre-deploy synthetic check.** With elevated credentials held
only in process memory, as in previous releases, run the extended checker in
`local` mode (local handler → hosted Supabase, `JOURNEY_V3_ENABLED=true`) with
`MYTHSEAL_ACCOUNT_CHECK_BOUNDARY=true`. This writes and deletes synthetic users
in the real-player project, following the v0.5.0/v0.5.1 precedent
([HOSTING.md:124](HOSTING.md), `:144`). It sends no email.
**What this proves:** the database side (migrations, RPCs, RLS, size limits)
and the validator's verdicts. **It does not measure Worker CPU.** Local mode
runs `createAccountHandler` in Node on this Mac with stub rate limiters
(`tools/live-account-check.mjs:60-77`, `:84`). The first real Worker run of the
v3 path is S1, or without staging, C3 in production after players are already
on v0.6.0 (§6).
*Verify:* all checks pass, and cleanup reports **zero** fixtures and zero rows in
`journeys`, `journeys_v2` and `journeys_v3` (A4(a)). The checker prints its
receipt to stdout and writes no file, so redirect it: `node
tools/live-account-check.mjs > test-results/v0.6.0-account-check-local.json`
(`test-results/` is ignored by Git).
*Rollback:* the checker's own cleanup. If it fails, the owner deletes the
`@example.invalid` fixture users in the dashboard.

### Phase C · Deploy and verify

**C1 · OWNER · Deploy.** **First, record the rollback targets** (read-only).
Run `npx --no-install wrangler deployments list --config wrangler.jsonc`, then
the same with `--config wrangler.www.jsonc`. Write the currently active version
IDs into the release record as the rollback targets. **Stop if they differ**
from `f254ef87…` (apex) and `c14a675f…` (redirect), which come from
[HOSTING.md:117](HOSTING.md) and `:119`, dated 2026-09-21, until the
difference is explained. A dashboard variable or secret change creates a newer
version, and rolling back to the documented ID would silently revert it.
Then, in a **clean checkout of tag `v0.6.0`**: run `git merge-base
--is-ancestor 7a7d03e HEAD` (exit 0; a nonzero exit means a pre-fence build,
so stop), then `npm ci && npm test && npm run deploy -- --dry-run`, then
`npm run deploy`. The helper
checks identity, account `cf4198e6…`, the existing `SUPABASE_PUBLISHABLE_KEY`
metadata, both bundles and the commit, then deploys the apex Worker and the
unchanged redirect Worker (`tools/deploy.mjs:63-114`). After an ambiguous
failure, never rerun the helper blindly; inspect the provider state and retry
only the unresolved Worker ([HOSTING.md:90-94](HOSTING.md)).
*Verify, immediately:* (1) `npm run verify:hosting` from the same checkout
checks the manifest and commit, every asset hash, the headers and MIME type,
the 13 private paths returning 404, both redirects, the anonymous account
reply and CSRF rejection (`tools/verify-hosting.mjs`). (2) The anonymous
account reply has `emailEnabled: true` and `journeyVersions: [1,3]`. A `2` in
that list means an earlier dashboard value survived despite the explicit
`"false"` (A3). Stop and investigate.
(3) `npx --no-install wrangler secret list --config wrangler.jsonc` still
lists `SUPABASE_PUBLISHABLE_KEY`. This is the first hosted proof of
`--keep-vars` retention (G4). (4) `wrangler deployments list --config
wrangler.jsonc` shows the message `Mythseal 0.6.0 <sha>`.
*Rollback:* `npx --no-install wrangler rollback <apex version recorded before
C1> --config wrangler.jsonc`. The expected value is the v0.5.1 apex
`f254ef87-286c-4960-9888-4986b1a34f5b` ([HOSTING.md:117](HOSTING.md)). The
redirect Worker's recorded version is expected to be
`c14a675f-3474-4d66-a341-5fa0d388108e` ([HOSTING.md:119](HOSTING.md)), though
rolling it back changes nothing in behaviour. Read §6 before rolling back.
That v0.5.1 apex is profile v3, not a v5 build, so Q1's forward-only rule does
not block it (§6). D1–D3 leave only device-local state behind that v0.5.1
never reads (§6). Never roll back, or deploy, to any Worker version built from
a v5 commit that lacks `7a7d03e`; after players have committed commands, the
way back below Q1 to a v5 build is a forward fix (§6, §8).
**UNVERIFIED:** whether a Cloudflare rollback also restores that version's
secrets. The key value has not changed
since v0.5.1, so either behaviour binds the same key.

**C2 · OWNER · Production browser smoke.** With `GAME_URL=https://mythseal.com`,
run `node tools/smoke.mjs` ([HOSTING.md:102](HOSTING.md)) and `node
tools/journey-smoke.mjs`. **Only these two run against production.** The
navigation suite and 21 other smoke scripts, Q1's `tools/command-smoke.mjs`
and the packets' `back-smoke.mjs` (D1), `save-durability-smoke.mjs` (D2),
`shell-smoke.mjs` (N1) and `coach-smoke.mjs` (D3) among them, throw on a non-loopback URL
(`tools/navigation-smoke.mjs:13`: "Navigation smoke requires a loopback game
server."; [cmd] grep of `tools/*smoke*.mjs` at `b527dc3`, and again at
`0281798`: 22 of 26 guarded, §13). That error would look like a
deploy failure. The two suites use isolated browser contexts and fixture APIs,
and make no account writes.
*Verify:* no page or network errors and no horizontal overflow.
*Rollback:* as in C1.

**C3 · OWNER · Real-account checks.** Run the extended checker in `hosted` mode
through the deployed Worker (`tools/live-account-check.mjs:51`, `:84`): v1
restore → v3 upload, conflicts, tombstone, and the near-limit and byte-cap v3
cases, with cleanup at zero in all three tables. Use the separate v1 and v3
fixture users from A4(a). On one user, the 10-writes-per-minute backup limit
returns 429, which would look like a NO-GO. Redirect the receipt to
`test-results/v0.6.0-account-check-hosted.json`. Unless S1 exists, this is the
**first time the v3 path runs in a real Worker**, so it is also the first
Worker CPU measurement (§6). Then the owner signs in through the mailbox in a
public browser, restores their own v1 backup into a **fresh browser profile**,
and uploads it as v3. In v0.6.0 a fresh profile shows D2's restore offer
(有舊旅程？由備份還原), whose 雲端旅程 leads to this same cloud restore. A physical
cross-device restore, open since v0.5.1
([ACCOUNTS.md:171-175](ACCOUNTS.md)), is recommended. Also recommended, and
local only: before C1, export the owner's journey from the live v0.5.1 footer
(匯出旅程備份); after C1, import that file with 匯入旅程備份 in another fresh
profile. It would be the first check of a real player's v0.5.1 export file;
`test:saves` S10 uses a synthetic one in v0.5.1's download key order
(`v051Download`, `tools/save-durability-smoke.mjs:64-67`, `:595`). That order
was checked once, with a scratch script over `git archive v0.5.1 '*.mjs'`, in
D2's third review on 2026-10-12: for a new journey it equalled v0.5.1's
download byte for byte, 5,790 B in UTF-8 (the test comment's "5,782 B" is the
string's character count; the deck name 山海初陣 takes 3 bytes a character, §13).
Three records hold that check:
[VALIDATION](VALIDATION.md#d2-third-review-fixes--2026-10-12) (finding 4),
[LOCAL-COMMANDS §19](LOCAL-COMMANDS.md#19-file-import-and-save-safety-d2-2026-10-12)
and the comment at `tests/save-durability.test.mjs:90-94`. No test repeats the
comparison: the Node test reads no v0.5.1 code and pins only the last seven
keys of that order (`tests/save-durability.test.mjs:198`). A scratch rerun on
2026-10-13 found the two still equal (§13).
*Rollback:* as in C1. Synthetic data is cleaned up by the checker.

**C4 · OWNER · Watch for 24–72 h.** Watch the Cloudflare Worker metrics for
`/api/*` 5xx, 426 and 429 responses, the Supabase API logs and the database
size (§6). A JSON 503 `cloud_unavailable` points at a missing RPC or a
provider error (`server/account-api.mjs:240-245`). **A CPU-limit failure
looks different:** Cloudflare error **1102**, a non-JSON 503 (the checker
already classifies it, `tools/live-account-check.mjs:88`), plus `exceededCpu`
outcomes in the Worker's logs (outcome name not re-checked here). Players who
report "progress gone" most likely played in a v0.5.1 tab left open across the
deploy (§6). Reloading every open tab stops it happening again but does not
bring that progress back. v0.6.0 moved the export out of the footer: its
匯出旅程備份, in the 旅程閣 page's tools (`app.mjs:538`; `save-ui.mjs:37`),
saves only the v5 journey (`app.mjs:206-212`, through `exportJourney`,
`platform.mjs:51-56`), and without A5(a) nothing in v0.6.0 reads or exports
the stranded v3 key (§6). A v0.5.1 tab that is still open can export it from
its own footer before it is reloaded, and since D2 the player can import that
file in v0.6.0 (旅程閣 → 匯入旅程備份). The import replaces the v5 journey, which
becomes the recovery copy (復原上次本機旅程 brings it back), so the player keeps
one of the two journeys and cannot merge them (A5). Otherwise support has
only what the owner's A5 decision provides (§12 item 9). If V3 must be turned off,
follow §8 "Flag only": deploy an explicit `"false"`. Deleting the key keeps
`true` (A3).

**C5 · AGENT · Record.** Add a v0.6.0 record to [HOSTING.md](HOSTING.md) and
[VALIDATION.md](VALIDATION.md) (source SHA and tag, both Worker version IDs, the
CI link, or the accepted local CI record and the owner's written acceptance
(B1), check receipts, what was not verified), and update the
[HANDOVER.md](HANDOVER.md) baseline.

## 6. Data safety

- **No staging today.** `mythseal-dev` holds real accounts and backups
  ([HANDOVER.md:1304](HANDOVER.md); [supabase/README.md:7](../supabase/README.md)).
  `npm run preview` is **not** isolated: its config names the hosted project
  (`hosting/wrangler.preview.jsonc:20`; [HANDOVER.md:1456-1458](HANDOVER.md)).
  Docker is unavailable, so a local Supabase stack is not an option either
  ([CONNECTIONS.md:84](CONNECTIONS.md)).
- **Migrations only add objects.** v2/v3 create new tables and RPCs and leave
  v1 rows, revisions and RPCs alone (migration line 1). The v1 hosted fixture is
  rollback-safe ([supabase/tests/private_journey_backups.sql:1-2](../supabase/tests/private_journey_backups.sql)).
  The v2/v3 fixtures must never touch the hosted database (their line 1), hence
  the read-only probe in A4(b).
- **Local saves move forward one way, and a client rollback is not
  save-neutral.** The new client writes `shanhai.profile.v5` and leaves
  `shanhai.profile.v3` in place (`profile-store.mjs:85-106`). If the apex rolls
  back to v0.5.1, its client reads the **stale** v3 key: progress made under
  v0.6.0 disappears from view (it is not deleted). Anything played during the
  rollback lands in v3, and after a later roll-forward v5 wins, orphaning those
  rollback-window changes (`progression.mjs:24`; v0.5.1 `progression.mjs:16`).
  So prefer fixing forward. If a rollback is unavoidable, keep it short and
  tell players to export before and after (匯出旅程備份: in the 旅程閣 page's
  tools in v0.6.0, in the footer in v0.5.1).
- **Q1 makes `mythseal.com` forward-only for v5 builds.** Once v0.6.0 is
  served, a player who upgrades a card from its card page commits a command,
  and their v5 profile gains a `commands` ledger
  ([LOCAL-COMMANDS §11](LOCAL-COMMANDS.md#11-profile-field-and-migration-impact)).
  Two kinds of older v5 build then go wrong on the same origin:
  - A v5 build from before Q1 refuses a save that has a ledger, with
    `旅程資料未能完整讀取；原件仍保留，請先匯出備份。` and zero writes (verified in
    Node at `8afbabc`, per LOCAL-COMMANDS §11), and its recovery screen offers
    export. The save is kept, but that build cannot play it.
  - A v5 build from before the fence opens a save without a ledger and writes
    without recording the IndexedDB fence. A Q1 tab that has not yet received
    that write can then overwrite it
    ([§10.1](LOCAL-COMMANDS.md#101-read-after-write-fence-added-after-review)).

  Both kinds are any v5 commit that lacks `7a7d03e`. That includes every v5
  commit on `main` before PR #10, such as `8afbabc` and `b40c4d2`, and
  `q1/local-commands` before `7a7d03e`. **Never serve one on `mythseal.com` after v0.6.0**: not as
  a deploy, a re-deploy of an older tag, or a rollback target. Check every
  candidate and every recorded rollback version's source with
  `git merge-base --is-ancestor 7a7d03e <commit>`. After players have committed
  commands, going back below Q1 to a v5 build needs a forward fix instead.
  Every `main` commit from `7712a7b` on contains the fence, the merges of D1,
  N1, D2 and D3 (`335d2b7`, `e785b27`, `a7bda4b` and `0281798`) included.
- **D2's file import writes only through the strict restore.** Since PR #14,
  匯入旅程備份 (旅程閣 tools) and the new-journey offer's 備份檔 read a
  匯出旅程備份 file: a v5 export, or a v3 one from v0.4.1–v0.5.1 (or a v4 one,
  which no public build wrote); a legacy file is migrated as `load()`
  migrates a legacy key (A5). Before anything is written it
  is refused when it is over 4 MiB (from its size, before reading:
  `platform.mjs:13`, `:112`), unparsable, not an export (a cloud envelope or
  the startup-recovery file: `:83`), older than v3 or newer than v5, exported
  with an unfinished battle or activity (`:88`), not canonical at its own day
  (refused as possibly edited), or invalid under `assertLocalProfile`,
  `createSnapshot` or `restoreSnapshot` (`:77-107`). A file that passes is
  applied only after a confirmation that compares the two journeys, through
  `restoreLocalProfile` under the strict fenced lock (`app.mjs:139-162`,
  `:63`): `store.restore` refuses an unfinished battle or activity,
  `economyBusy`, an open WX receipt or a journey changed since the
  confirmation (`profile-store.mjs:154-161`), and `store.replace` writes the
  `RECOVERY_KEY` copy of the replaced journey first, retires the replaced
  lineage's ledger when it has one and makes one profile write (`:133-148`).
  Every refusal writes nothing ([LOCAL-COMMANDS §11](LOCAL-COMMANDS.md#11-profile-field-and-migration-impact),
  "File import"; `tests/save-durability.test.mjs`). The file's own ledger is
  left out. Without a ledger on this device there is nothing to retire, so a
  card-page quote from before the import can still commit once on an
  unchanged copy (LOCAL-COMMANDS §15 decision 1; §12 item 12). One recovery
  slot per browser: an import replaces an older recovery copy, and its
  confirmation says so. Nothing is uploaded, and the lobby sends no account
  request of its own ([ACCOUNTS](ACCOUNTS.md)).
- **D1, D2 and D3 keep their state on the device, outside the journey.** D2's
  `shanhai.saves.v1` (`save-status.mjs:10`) holds the last cloud backup's and
  last export download's dates, the persistence answer, the two prompts and the
  restore offer. D3's `shanhai.coach.v1` (`battle-teaching.mjs:191`) holds the
  first battle's coach state until it ends, then only
  `{"firstBattle":"done"}` or `"skipped"`. Neither is ever in the profile, the
  battle snapshot, an export, a cloud backup or the recovery copy; if storage
  refuses them, only that record is lost. D1 stores nothing: its history
  entries are state-only, same-URL entries under `history.state["mythseal.nav"]`
  (`nav-stack.mjs:12`), and Back never writes a save. D2 also calls
  `navigator.storage.persist()`, at most once per device after the first win or
  first pack opening this device records, and at each launch of an installed
  web app until granted; never on an ordinary page load
  ([LOCAL-COMMANDS §19](LOCAL-COMMANDS.md#19-file-import-and-save-safety-d2-2026-10-12)).
  A grant covers the whole origin's storage, the v3 and v5 keys and the
  IndexedDB fence alike (the Storage Standard's per-origin bucket, not
  re-checked here). What real browsers answer, and Safari's seven-day eviction,
  are **UNVERIFIED** (the smokes replace `persist()` with a spy).
- **A rollback to the recorded v0.5.1 versions is not affected by Q1, D1, N1,
  D2 or D3.** v0.5.1
  is profile v3. It writes only `shanhai.profile.v3`, `shanhai.battle.v3` and
  `shanhai.profile.recovery.v3`, and reads only those and older legacy keys
  (`git show v0.5.1:progression.mjs` lines 15-17; `git show v0.5.1:app.mjs`
  lines 15-18, 51, 65-67, 89, 91 and 541). It never opens IndexedDB ([cmd]
  `git grep -i -e indexeddb -e sessionStorage -e 'localStorage\.\(setItem\|removeItem\|clear\)' v0.5.1`
  finds only those `app.mjs` writes and test seeding in `tools/`). It shares the lock name
  `shanhai-profile-v3` with v0.6.0 (`profile-store.mjs:9`; v0.5.1 `app.mjs`
  lines 54, 59), but under it writes only its own v3 keys. So during such a
  rollback a player's v5 save, including any `commands` ledger and its
  receipts, and the fence record in `shanhai.profile.fence`
  (`profile-fence.mjs:13`) stay exactly as they were, unread. The player sees
  the stale v3 journey described above, or a new starting journey if the
  device has no v3 or v2 save (`git show v0.5.1:progression.mjs` line 142).
  After a roll-forward to a build with the fence, `load()` reads v5 first
  (`profile-store.mjs:92-94`) and validates the ledger again
  (`progression.mjs:250`), so committed commands and receipts come back
  unchanged. The ledger never enters a cloud backup (`cloud-save.mjs:177-192`),
  so Q1 adds nothing to the cloud cases below. Q1 therefore changes nothing in
  a rollback to v0.5.1. The stale-v3 and orphaned-rollback-window cases above
  are unchanged.

  **D1–D3 leave only device-local state behind, and v0.5.1 ignores it**
  (2026-10-13, from source; no rollback was run). v0.5.1 never reads or writes
  `shanhai.saves.v1` or `shanhai.coach.v1`, never calls the History API or
  `navigator.storage`, and never reads `history.state` ([cmd] `git grep` of
  tag `v0.5.1` for `shanhai.saves`, `shanhai.coach`, `mythseal.nav`,
  `popstate`, `pushState`, `replaceState`, `history.`, `storage.persist`,
  `localStorage.key(` and `localStorage.length`: the only matches are its
  battle log, `match.history`; and for `navigator.storage`, none, its runtime
  using only `navigator.locks`, §13). So during a rollback:
  - `shanhai.saves.v1` and `shanhai.coach.v1` stay exactly as they were,
    unread, and v0.6.0 reads them again after a roll-forward. The 旅程閣 status
    line then still shows this device's last v0.6.0 backup and export dates,
    and a coach that ended stays ended. Harmless.
  - A journey imported under v0.6.0 (D2) is v5 progress like any other: out of
    view under v0.5.1, back after a roll-forward.
  - A granted storage persistence stays granted; nothing in either build
    revokes it. If anything, it also protects the v3 save v0.5.1 writes.
  - N1 is CSS and the viewport meta only, so it leaves nothing behind.
  - D1: a v0.6.0 tab reloaded into v0.5.1 keeps the same-URL, state-only
    entries v0.6.0 pushed (one per layer open at the time; D1's deepest chain
    is five, [NAVIGATION](NAVIGATION.md#back-model--2026-10-12)). v0.5.1 has no
    `popstate` handler, so Back may step over those entries with nothing
    visible changing before it leaves the page. That is a nuisance only: v0.5.1
    never reads `history.state`, and a traversal changes no storage.
    **UNVERIFIED** in a browser; this follows from D1's notes and v0.5.1's
    source.

  A rollback to v0.5.1 is therefore as harmless after D1, N1, D2 and D3 as
  after Q1; the
  stale-v3, orphaned-rollback-window and hidden-backup cases remain the real
  costs.
- **The forward deploy also strands progress made in v0.5.1 tabs left open.**
  An open v0.5.1 tab keeps writing `shanhai.profile.v3` and listens only for
  that key (`git show v0.5.1:app.mjs` line 503). As soon as any v0.6.0 tab or
  reload migrates v3 to v5, `load()` reads v5 first and never looks at v3
  again (`profile-store.mjs:92-94`). Everything played afterwards in the old
  tab disappears from view on its next reload. It is not deleted, but without
  A5(a) the game cannot reach it. The only export that includes the v3 key
  (`bootstrap.mjs:13-19`) is on the startup-recovery screen, which appears
  only when `app.mjs` fails to load (`bootstrap.mjs:2-4`), and D2's import
  refuses that file as not an export (`platform.mjs:83`); v0.6.0's own export
  saves only the v5 journey (`app.mjs:206-212`). Short of the browser's
  developer tools, the only way out is still the old tab's own footer export,
  used before that tab is reloaded. **Since D2 that file has somewhere to go:**
  v0.6.0's 匯入旅程備份 imports it through the strict restore, replacing the v5
  journey and keeping that one as the recovery copy (above; A5). D2 reads no
  key, so it does not reach progress the old tab wrote after its last export.
  After A1, those tabs also get 404s for the removed PNGs. The release notes
  (A7) and C4 tell players to reload every open tab. A5(a) adds a guard in
  code.
- **Cloud rows survive both directions, but a newer v1 backup can be hidden.**
  v1 rows are untouched. v3 rows written after release remain, unread, under a
  rolled-back v0.5.1 Worker, and are readable again after a roll-forward. The
  new client reads the legacy namespaces only when the v3 backup is empty
  (`account-client.mjs:116-129`), and the v0.6.0 Worker still accepts v1 PUTs
  (`server/account-api.mjs:123-125`). Two sequences hide data:
  - A player uploads v3, the site rolls back, the player uploads a newer v1
    under v0.5.1, and the site rolls forward.
  - A long-lived v0.5.1 tab uploads v1 during the rollout.

  In both cases every v0.6.0 device that signs in sees the **older** v3 journey,
  and the newer v1 backup is never offered, so a cross-device restore loses
  progress. The rows survive, but the UI cannot reach them. That is one more
  reason to fix forward. Before any roll-forward that follows a rollback, warn
  players. A5(b) closes this in code. A4 and C3 cover the restore paths.
- **Size and capacity.** The v3 limit is 4 MiB / 10,000 copies per account
  (`cloud-save.mjs:10-11`; v3 migration line 12). Measured locally ([cmd]
  scratch script, exit 0): a v3 snapshot is **366,232 B** at 2,000 copies and
  **1,822,050 B** at 9,999, so copy count alone does not approach the byte cap.
  The byte-cap case is in A4(a). Across two independent runs under Node 26 on
  this Mac, the median `validateSnapshot` time was **22–29 ms** at 2,000 copies
  and **108–121 ms** at 9,999. The Worker validates on PUT and on every
  read-back (`server/account-api.mjs:236`, `:251`). The client reads the cloud
  backup at every sign-in (`account-client.mjs:183`). A CPU failure on GET
  would therefore hit a player with a large collection every time they sign
  in. **Only a real Worker measures this:** S1 staging or, without it, C3 in
  production after release. B4 runs the handler in Node. **Before GO, the owner
  reads the apex Worker's CPU limit from the account (read-only).** If it is
  the Workers Free limit (10 ms per request, from memory, not re-fetched here)
  or unknown, require S1 or a written acceptance of the risk. **UNVERIFIED:**
  that limit and the Free Supabase database-size quota. The only hosted
  large-backup evidence so far is a 2,000-copy v1 PUT/GET at 734/178 ms wall
  time ([HOSTING.md:144](HOSTING.md)).
- **PII.** `auth.users` holds player emails. `private_backup` rows hold user
  UUIDs and snapshots, with no emails (B3). Keep dumps and receipts out of Git,
  encrypted and time-limited. The checkers use `@example.invalid` fixtures
  only.

## 7. Proposed staging (not created)

| Option | What it is | Cost estimate | Gives us |
| --- | --- | --- | --- |
| **S1 (recommended)** | A second Supabase project `mythseal-staging` in the existing **Free** "Mythseal" organization, plus a Worker `mythseal-staging` on `staging.mythseal.com` with its own rate-limit namespaces and `OTP_ENABLED=false` (synthetic generated-code sessions only, as the checker already does), optionally behind Cloudflare Access | **$0** if the Free organization may hold a second active project and the Workers usage fits the current plan. **UNVERIFIED:** Supabase's current free-project limit and inactivity pausing, Cloudflare Access free-seat terms | Rehearses B3–C3 end to end: migration push, deploy helper, v1→v3, near-limit CPU, rollback commands |
| S2 | Supabase Pro organization with branching | Pro base fee plus per-branch compute. **UNVERIFIED:** current prices (the existing `cambridgetcg` organization is Pro, [CONNECTIONS.md:49](CONNECTIONS.md), but moving Mythseal there is a billing decision) | Per-PR database branches |
| S3 | Local only: loopback PostgreSQL harness plus `npm run preview` | $0 | SQL only. Preview still talks to the **hosted** project, so this is not real isolation |

S1 needs owner steps: create the project, apply all four migrations, set Auth
URLs, add a staging publishable key as a Worker secret, add the DNS/custom
domain, and add a `wrangler.staging.jsonc` that the deploy helper can target
without being able to reach the production names. The checker and verifier
need the same switch (A4(d)), and it has to be in the tag. That is why A0
makes this decision before Phase A. Nothing here creates staging.

## 8. Rollback summary

| Step | Rollback | Data effect |
| --- | --- | --- |
| A1–A8, B1 | `git revert` / delete the unpublished tag | None |
| B3 migrations | Usually none (the live Worker ignores the new objects). If needed, the down-migration procedure below, while the tables are empty | None for v1 |
| B4/C3 checker | The checker's cleanup, then dashboard deletion of `@example.invalid` users | Synthetic only |
| C1 apex deploy | `wrangler rollback <apex version recorded before C1> --config wrangler.jsonc` (expected `f254ef87-…`, v0.5.1: profile v3, so allowed by Q1's rule) | Local saves diverge in the rollback window (§6). Cloud rows are kept, but a newer v1 upload made in the window is hidden behind an older v3 row after a roll-forward (§6). The v5 save, its `commands` ledger and the fence record are left untouched and return on roll-forward (§6). So do D2's `shanhai.saves.v1`, a journey imported under v0.6.0 and a granted storage persistence, and D3's `shanhai.coach.v1`; v0.5.1 never reads them. A v0.6.0 tab reloaded into v0.5.1 may need extra Backs over D1's same-URL history entries before it leaves (**UNVERIFIED**; no save is touched) (§6) |
| Any later deploy or rollback after v0.6.0 | Only to v0.5.1 or to a version built from a commit that contains `7a7d03e` (`git merge-base --is-ancestor 7a7d03e <commit>`). For a problem in Q1 itself, fix forward. A problem in D1, N1, D2 or D3 is also a forward fix: no v0.6.0 Worker version without them exists to roll back to | A pre-Q1 v5 build cannot open a save with a ledger, and a pre-fence v5 build can lose writes (§6) |
| Flag only | Deploy a commit that sets `"JOURNEY_V3_ENABLED": "false"`. **Removing the key is not enough:** `--keep-vars` keeps the previous `"true"` (A3). Verify that anonymous `/api/v1/account` returns `journeyVersions: [1]`. No earlier Worker version runs v0.6.0 with V3 off, so the only `wrangler rollback` alternative is the full C1 rollback | New clients can restore v1 but **cannot upload** (`account-client.mjs:222`), a regression against v0.5.1. v3 rows written since release are unreachable from the UI until V3 is on again |

**Down-migration procedure** (OWNER, only while `journeys_v2` and `journeys_v3`
are empty):

1. Make sure no deployed Worker has V3 or V2 on: either the flag-only rollback
   is verified (`journeyVersions: [1]`), or the apex is rolled back.
   Otherwise every v3 call returns 503 once the RPCs are gone.
2. Run the reviewed file from A4(c) in one transaction, entering the password
   at the prompt: `psql "<dashboard connection string without password>" -X
   -v ON_ERROR_STOP=1 --single-transaction -f supabase/rollback/<file>.sql`.
   The file has no `begin`/`commit` of its own; `--single-transaction`
   supplies them. Its emptiness check aborts the whole transaction if either
   table has rows.
3. Repair the history: `npx --no-install supabase migration repair --linked
   --status reverted 20260923000000 20260922210000`. Without this,
   `supabase_migrations.schema_migrations` still records both as applied, so
   a later `db push` would not recreate them. A later V3 enable would then
   return 503 `cloud_unavailable` for every v3 call
   (`server/account-api.mjs:240-245`).
4. Verify: `npx --no-install supabase migration list --linked` shows both
   files as local-only again. A read-only catalog query, the A4(b) probe
   adapted to expect absence, shows the v2/v3 tables and RPCs gone. Anonymous
   `/api/v1/account` still answers.

## 9. Payload problem and proposed derivative pipeline

**Measured first screen at `8afbabc`** ([cmd] scratch Playwright script with
installed Chrome, a fresh guest context, `dist/` served on an OS-chosen
loopback port, exit 0). At both 1440×1000 and 390×844 @3x, the lobby appeared
after 243 and 115 ms locally and **59 files** loaded before it: all 36 JS
modules (every module is a static import of `app.mjs`, whose imports were then
lines 1-31), all 19 stylesheets (`index.html:15-33`), `index.html`,
`mark.svg`, `world-map.png` (3,146,354 B) and `portraits.png` (3,939,603 B).

**Recomputed at `b527dc3` for Q1.** Q1's three modules are static imports of
`app.mjs` (`app.mjs:23-25`), so the first screen now loads **62 files**: all
39 JS modules (`app.mjs:1-34` at `b527dc3`; `1-39` at `0281798`, below), the
same 19 stylesheets, `index.html`, `mark.svg` and the same two PNGs. The text
figures were recomputed without a browser ([cmd] scratch Node script, exit 0:
`index.html`, its stylesheets, `mark.svg` and every module reachable from
`bootstrap.mjs`, each compressed with `node:zlib` gzip level 6 and brotli
quality 11). Run at `8afbabc`, the
same script gives exactly the 57 text files and byte counts of the browser
measurement. No browser measured `b527dc3`.

**Recomputed at `0281798` for D1, N1, D2 and D3** (2026-10-13, the same scratch Node
script, exit 0; it again reproduces `8afbabc`'s 57 files and `b527dc3`'s 60
files byte for byte). D1–D3's seven new files are all on the first screen:
`nav-stack.mjs`, `platform.mjs`, `save-status.mjs`, `save-ui.mjs` and
`battle-teaching.mjs` are static imports of `app.mjs` (`app.mjs:26-28`,
`:38-39`), and `saves.css` and `battle-teaching.css` are stylesheets of
`index.html` (`:34-35`). So the first screen now loads **69 files**: all 44
JS modules (`bootstrap.mjs`, `app.mjs` and everything `app.mjs:1-39` imports),
all 21 stylesheets (`index.html:15-35`), `index.html`, `mark.svg` and, as far
as the source shows, the same two PNGs: no public file added or changed an
image reference from `7712a7b` to `0281798` ([cmd] the public files' diff
searched for `url(`, `assets/`, `.png`, `.webp` and `.svg`: no match). No
browser measured `0281798`, so the image set is **UNVERIFIED** there. Figures
at `b527dc3` and at `8afbabc` are in brackets.

| | Raw | gzip -6 | brotli q11 |
| --- | --- | --- | --- |
| Text: 67 files [60; 57] | 1,077,556 B [970,661; 929,264] | 322,718 B [282,691; 267,540] | 274,196 B [240,926; 228,341] |
| Images (2 PNG) | 7,085,957 B | (no gain) | (no gain) |
| **First screen** | **8,163,513 B** [8,056,618; 8,015,221] | **7,408,675 B (7.07 MiB)** [7,368,648, 7.03 MiB; 7,353,497, 7.01 MiB] | **7,360,153 B (7.02 MiB)** [7,326,883, 6.99 MiB; 7,314,298, 6.98 MiB] |
| Budget ([CONTENT-RELEASE-PIPELINE.md:63](CONTENT-RELEASE-PIPELINE.md)) | | **1,572,864 B (1.5 MiB)** | |

The first screen is still about **4.7× over budget** (4.68–4.71×), and about
96% of it is two PNGs (95.6% at gzip, 96.3% at brotli; 96–97% at `b527dc3`).
Q1 added 41,397 B raw and 12,585–15,151 B compressed; D1, N1, D2 and D3 add
106,895 B raw and 33,270–40,027 B compressed (brotli–gzip), of which N1's CSS,
meta and two `aria-label`s are 6,350 B raw and 1,969–2,277 B compressed (the
`335d2b7` and `e785b27` figures in §13's first-screen row).
**UNVERIFIED:** the compression level Cloudflare actually applies; the gzip and
brotli columns bracket the likely range.

**Derivative estimate** ([cmd] `cwebp 1.6.0 -m 6`, exit 0, all 23 public PNGs;
outputs in the scratch directory, not committed):

| Group (count) | PNG now | WebP q80, native size (A) | Display-sized (B) |
| --- | --- | --- | --- |
| Atlases: `portraits`, `classics`, `wx01/base-*` (6) | 20,643,505 | 2,387,632 | 2,387,632 (atlas geometry kept) |
| Maps: `world-map`, `maps/*` (4) | 13,742,268 | 1,410,032 | 844,112 (1280 w, q78; each 171,736–238,164 B ≤ 350 KiB) |
| Specials: AA/LAA/INK/TR (13) | 39,032,720 | 3,140,780 | 1,214,816 (600 w; each ≤ 132,850 B ≤ 160 KiB) + 241,438 for 240 w thumbs |
| **Total** | **73,418,493 (70.02 MiB)** | **6,938,444 (6.62 MiB, −90.5%)** | **4,446,560 (4.24 MiB, −93.9%)** |
| **First screen (text br–gz + images), `0281798`** | 7.02–7.07 MiB | **1,223,800–1,272,322 B (1.17–1.21 MiB) ✓** | **1,111,724–1,160,246 B (1.06–1.11 MiB) ✓** |
| First screen at `b527dc3` | 6.99–7.03 MiB | 1,190,530–1,232,295 B (1.14–1.18 MiB) | 1,078,454–1,120,219 B (1.03–1.07 MiB) |
| First screen at `8afbabc` | 6.98–7.01 MiB | 1,177,945–1,217,144 B (1.12–1.16 MiB) | 1,065,869–1,105,068 B (1.02–1.05 MiB) |

The PNGs have not changed since the `cwebp` run, so its image figures stand;
only the text term moved. At `0281798` scenario A leaves about 294–341 KiB of
the budget (300,542–349,064 B, gzip–brotli); D1, N1, D2 and D3 used about
32–39 KiB of it, N1 about 2 KiB.

Quality evidence so far: SSIM of the native WebP q80 against the PNG, from
[cmd] ffmpeg 8.1.2 (exit 0):
`ffmpeg -nostdin -i assets/<name>.png -i <name>.native.webp -lavfi
"[0:v]format=rgb24[a];[1:v]format=rgb24[b];[a][b]ssim" -f null -`. Both inputs
are converted to `rgb24`, so `portraits`' alpha is dropped, not composited.
SSIM "All" is **0.9496** for `portraits` and **0.9545** for `world-map`. The
same command with `yuv444p` gives luma (Y) SSIM of 0.9756 and 0.9717. The
earlier figures (0.9545 / 0.9569) recorded no method and are withdrawn. A
default `-lavfi ssim` negotiates a different pixel format for each file (RGB
for `portraits`, YUV 4:2:0 for `world-map`), so it is not comparable across
files. An agent spot-check of one portraits cell at 1:1 looked equivalent.
That is **not** art approval. Indicative AVIF figures (SVT-AV1 CRF 35, 10-bit, quality
not matched): `world-map` 201,360 B (−29% against WebP) and `tang-aa` 129,197 B
(−36%). AVIF is deferred: it adds a second derivative set and needs separate
decode and quality review.

**Recommendation:** ship **scenario A** in v0.6.0 (same pixels, so no layout or
clarity risk, and it meets the budget for a first visit with the default deck;
see the next paragraph). Move to B per use after the art review.

**The budget figures above are for a first visit with the default deck.** The
lobby draws the active deck's printings (`navigation-ui.mjs:66`, `:70`). The
default deck is the first eight original cards, all on the `portraits` atlas
(`engine.mjs:78`). The four welcome cards, however, are `classics` cards
(`progression.mjs:29`; `engine.mjs:49-57`). A returning player who has one of
them in the deck also loads `classics.native.webp` (605,018 B). That puts
scenario A at about **1,828,818–1,877,340 B at `0281798`** (1,795,548–1,837,313
B at `b527dc3`; 1,782,963–1,822,162 B at `8afbabc`), **over the 1,572,864 B
budget**.
WX-01 atlases or specials in the deck push it higher. Either
`tools/payload-budget.mjs` (§10) also measures a returning-player profile, or
the owner records that the budget covers only a first visit with the default
deck.

**`tools/assets/build.mjs` specification** (build tooling only; the runtime
stays dependency-free):

- **Recipe** `assets/derivatives.json`: for each source, the outputs as
  `{format, width, quality, use}`, plus atlas `columns×rows` where relevant. The
  1254 px atlases are not divisible by 4, so any future per-cell crop must use
  the floor rule in [CONTENT-RELEASE-PIPELINE.md:34](CONTENT-RELEASE-PIPELINE.md).
  Scenario A does not crop.
- **Encoder:** a pinned, exact-version `sharp` devDependency, as already
  proposed in [CONTENT-RELEASE-PIPELINE.md:32](CONTENT-RELEASE-PIPELINE.md).
  Adding it is a deliberate tooling change for the owner or a reviewer to
  approve. The system `cwebp` used here is neither pinned nor present in CI.
- **Generate once, commit, verify in CI.** Encoder output can differ across
  libvips/libwebp versions and CPUs, so CI **does not regenerate**. It checks
  that each recipe source's SHA-256 still matches, that each committed output's
  SHA-256 matches the manifest, that sizes and dimensions are within budget,
  and that there are no orphan or stale derivatives. `npm run assets:build`
  regenerates only on purpose.
- **Manifest** `assets/derived/manifest.json`, one row per output: `source`,
  `sourceSHA256`, `sourceBytes`, `sourceDims`, `output`, `outputSHA256`,
  `bytes`, `dims`, `format`, `quality`, `encoder` (name and version), `use`.
- **Provenance is preserved.** Original PNG bytes are never rewritten
  ([CONTENT-RELEASE-PIPELINE.md:13-15](CONTENT-RELEASE-PIPELINE.md)). `ART*.md`
  prompts and hashes keep pointing at the originals. Each derivative links back
  through `sourceSHA256`. Keep the source mapping out of the public
  `release.json`, which carries only public file hashes
  ([HOSTING.md:15](HOSTING.md)). Strip metadata from derivatives (cwebp's
  default) and record the choice.
- **Formats:** WebP only at runtime, with **no PNG fallback in `dist/`**,
  pending one check. The argument was that `bootstrap.mjs:2-3` already needs
  top-level `await`, and every browser that supports it also decodes WebP. There
  is a likely exception, recalled from memory rather than re-fetched (network
  limit): Safari 15.x on macOS 10.15 Catalina supports top-level `await`, but
  Safari decodes WebP only on macOS 11 or later. Without a fallback, those
  players would see no card art or map. **Before A1**, check caniuse and MDN.
  Then the owner either accepts the gap in writing or keeps a PNG fallback
  (for example CSS `image-set()` with `type()`, plus the JS-set image paths).
  Keep `portraits.png`'s alpha (`-alpha_q 90` in the estimate).
- **Allowlist:** swap the 23 PNG entries for their WebP derivatives in
  `hosting/public-assets.json`. Update the CSS `url()`s (7 references, two
  images) and the JS strings (`printing-catalogue.mjs:16`, `:28`, `:35-47`;
  `stories.mjs:9-12`; `campaign-content.mjs:103`; `activity-content.mjs:9`).
  The preview allowlist is unchanged.

## 10. Browser CI recommendation

Today CI runs the Node, SQL, contract, build, dry-run and syntax checks in a
**5-minute** job, with **no** browser suite (`.github/workflows/ci.yml:16-73`).

Add a separate `browser` job (`needs: prototype`, `timeout-minutes: 30`):

1. Run `npm ci`, then `npx --no-install playwright install --with-deps chromium
   webkit` (Playwright is pinned at 1.63.0 in `package.json`). Cache
   `~/.cache/ms-playwright` keyed on that version.
2. Serve the **built artifact** the way production serves it: start `npm run
   preview` in the background on the runner and wait for HTTP 200. It builds
   `dist/`, including the `_headers` file copied by `tools/build.mjs:48`, then
   serves it with `wrangler dev --local` on `127.0.0.1:8791`
   (`tools/preview.mjs:68-71`). CI has no `hosting/.dev.vars`, so the preview
   Worker holds no Supabase key, and the suites' intercepted account APIs stay
   local. Do **not** use
   `tools/serve.py`. It serves the repository root through the allowlists
   (`tools/serve.py:12-17`, `:54`) and sends no `_headers`. After A2 it would
   never load `dist/r/<hash>/`, so a broken release graph would pass CI and
   show up in production only as the recovery screen. Add an assertion that
   every module and stylesheet request stays under the current `r/<hash>/`.
   Running `wrangler dev` on a GitHub runner was not tried here.
3. Run `GAME_URL=http://127.0.0.1:8791 npm run test:browser` in Chromium. The
   scripts fall back to Playwright's own Chromium when the macOS Chrome path is
   missing (`tools/smoke.mjs:11-12`).
   Then run the WebKit-capable suites: `test:commands` (Q1; `test:browser`
   does not run it, and a release that includes Q1 needs it in both engines,
   [LOCAL-COMMANDS §11](LOCAL-COMMANDS.md#11-profile-field-and-migration-impact)),
   `test:back` (D1), `test:saves` (D2), `test:shell` (N1), `test:coach` (D3)
   (`test:browser` runs none of these four either; G10),
   `test:battle-table`, `test:viewport`, `test:wx01`, `test:inheritance`,
   `test:collection-display`, `test:expansion`, `test:map-piece`. Each runs
   Chromium, then WebKit. The last two used to fail in WebKit; since N1 both
   pass (A6). `test:back`, `test:shell` and `test:coach` emulate a Pixel 7 in
   Chromium and an iPhone 15 in WebKit, and like the others fall back to
   Playwright's Chromium without the macOS Chrome path (for example
   `tools/back-smoke.mjs:106`).
4. Turn the first-screen measurement in §9 into `tools/payload-budget.mjs` and
   fail the job above 1.5 MiB (text counted at brotli or gzip size). Measure a
   first-visit guest **and** a returning player whose deck includes a welcome
   card (§9), unless the owner has limited the budget to first visits.
5. Upload `test-results/` **on failure only**, keeping it 7 days. The suites use
   synthetic profiles and intercepted account APIs, with no secrets.

Measured locally at `8afbabc` ([cmd] `GAME_URL=http://127.0.0.1:4290 npm run test:browser`,
installed Chrome, 2026-10-11): all 14 Chromium suites passed in **4 min 56 s**
wall time. Not re-timed at `b527dc3` or `0281798`. At `0281798` (2026-10-13,
[cmd] each suite's Chromium and WebKit halves together, installed Chrome
155.0.8059.40 and Playwright WebKit 26.6, one suite at a time):
`test:expansion` **215 s**, `test:wx01` 205 s, `test:map-piece` 57 s,
`test:liaozhai` 57 s, `test:inheritance` 54 s, `test:honglou` 40 s and
`test:collection-display` 35 s. The orchestrating session's runs of
`test:commands`, `test:back`, `test:saves`, `test:shell`, `test:coach`,
`test:battle-table`, `test:viewport` and `test:browser` were not timed. With
those four new suites, the earlier guess of 10–15 runner minutes per run,
browser installation included, is probably low: budget 20–30 (an estimate,
not a measurement; the job's 30-minute timeout may need raising). Runner
time will differ, and private-repository Actions minutes count against the
plan quota ([BACKEND-STACK.md:50](BACKEND-STACK.md); **UNVERIFIED:** the
current quota). On 2026-10-13 an Actions budget stopped PR #15's CI job from
starting at all (G7), so a browser job adds to a budget the owner has to
restore first. Linux WebKit is **not** Safari and none of this is
physical-device evidence ([HANDOVER.md:355-359](HANDOVER.md)).

## 11. Go / no-go

**GO requires all of the following before C1:**

1. Exact-source CI is green on the `v0.6.0` commit, including the browser job.
   Today that needs the owner to restore the Actions budget first (G7). The
   only alternative is the owner's written acceptance of a local CI record for
   that exact commit, as B1 describes (§12 item 14).
2. A8 passes locally: Node, Python, the content audit, build, preview dry run,
   Chromium and WebKit suites, including `test:commands`, `test:back`,
   `test:saves`, `test:shell` and `test:coach` in both engines (G9, G10) and
   WebKit `test:expansion` and `test:map-piece` in one run each (fixed by N1;
   §12 item 13, resolved), SQL harness.
3. The first screen is ≤ 1.5 MiB as measured, for both the first-visit and the
   returning-player profiles (§9), or the owner has recorded a waiver or a
   first-visit-only scope.
4. B3: a backup exists and was read back, four migrations are applied, the
   read-only probe passes, and v0.5.1 is still `verify:hosting`-green afterwards.
5. B4: the synthetic check through the local handler passes, including v1→v3
   restore and upload and the near-limit and byte-cap v3 PUT/GET, with **zero**
   fixtures and rows left. This proves the database side only, not Worker CPU.
6. The apex Worker's CPU limit has been read from the account. If it is the
   Free limit or unknown, either S1 measured the near-limit v3 PUT/GET in a
   real Worker, or the owner has accepted the risk in writing.
7. The owner has signed off on the Q0 open items (G8) and the derivative art,
   and has decided the packets' owner-pending exits (G11): D3's playtest held
   or deferred and its coach copy reviewed, D1's root Back confirmed or
   changed, the physical-phone items of D1, N1, D2 and D3 accepted on
   emulation evidence or checked, and the landscape fault below 701 px and the
   vertical-fit fault on portrait phones each shipped as documented or fixed
   (§12 items 1, 15, 16, 17 and 18). The owner has also
   seen that D2's and N1's last review fixes were not reviewed again (§12
   item 1).
8. Either the A5 guards ship, or the owner has accepted the open-tab and
   hidden-backup cases (§6) in writing, knowing that without A5(a) no in-game
   path reads progress stranded in the v3 key; D2's import reaches only what
   an open v0.5.1 tab exported before it was reloaded. Either way, the
   "reload every open tab" notice is ready.
9. The rollback IDs were re-read with `wrangler deployments list` just before
   C1, match the documented ones or have been explained, and are written in the
   release record. The rollback was rehearsed in staging if S1 exists.
10. G9: `git merge-base --is-ancestor 7a7d03e v0.6.0` exits 0, and the owner
    has made the Q1 decision (§12 item 12).

**Success after C1. Otherwise fix forward or roll back:**

11. `verify:hosting` passes from the tag checkout. `/api/v1/account` reports
    `emailEnabled: true` and `journeyVersions: [1,3]`.
12. `SUPABASE_PUBLISHABLE_KEY` is still listed. The production smoke passes. C3
    passes, including the owner's mailbox login and own v1 restore.

**NO-GO triggers:** `db push --dry-run` lists anything except the two expected
files; no readable backup before B3; the helper reports a missing binding or
wrong account; the active Worker versions differ from the record and the
difference is unexplained; a hash mismatch in `verify:hosting`; 5xx from
`/api/v1/account`; a failing v1 restore; a candidate, tag or rollback target
that is a v5 build without `7a7d03e` (§6); `test:commands`, `test:back`,
`test:saves`, `test:shell` or `test:coach` failing in either engine; or a
near-limit or byte-cap v3 PUT or GET that fails in a real Worker
(CPU or time). Without S1, that last trigger
can fire only in C3, after release. In that case, lowering the v3 limit is a
schema and validator change. Turning V3 off (an explicit `"false"`, §8)
disables cloud upload for new clients, so the owner decides.

## 12. Owner decisions needed

1. Go/no-go on scope, including the Q0 items still open (G8) and the
   physical-phone items D1, N1, D2 and D3 leave open (G11): ship on
   emulation evidence, or check phones first. N1's are the
   [M5.1 checklist](MOBILE-RELEASE.md#m51-phone-checklist), which holds only
   N1's rows. Two entries there are faults already measured in emulation, not
   items waiting for a phone: the "Open, below 701px wide" part of the
   "Landscape dock and header" row (item 17), and the "Short screens" row, the
   vertical-fit fault (item 18). The other packets' are in their own records:
   - D1: Android gesture navigation with predictive back, the iOS Safari edge
     swipe, whether a real Back button skips an entry, and bfcache restores on
     phones ([NAVIGATION](NAVIGATION.md#back-model--2026-10-12), "Checks";
     [HANDOVER](HANDOVER.md#d1-back-model-checkpoint--2026-10-12-local-only),
     "Open").
   - D2: Safari's seven-day eviction, iOS home-screen storage isolation, real
     browsers' `persist()` answers, and what the iOS Safari download sheet
     does with the export against its 1 s `revokeObjectURL`
     ([LOCAL-COMMANDS §19](LOCAL-COMMANDS.md#19-file-import-and-save-safety-d2-2026-10-12),
     **UNVERIFIED**). §6's rollback advice and C4's support route rely on
     that export.
   - D3: real Safari, and VoiceOver and TalkBack reading the coach marks
     ([BATTLE-LAYOUT-PLAN](BATTLE-LAYOUT-PLAN.md#first-battle-teaching--2026-10-12),
     "Open").

   The same decision covers a residual review risk. D2's and N1's review
   loops ended at their round cap without a clean round (their PR bodies, as
   the orchestrating session reported on 2026-10-13; not re-read here), so the
   fixes of their last rounds were not reviewed again: D2's integration review
   round 2, which changed `restoreCloudJourney` on the cloud-restore path C3
   uses ([HANDOVER](HANDOVER.md#d2-save-durability-checkpoint--2026-10-12-local-only)),
   and N1's round 3, the dock fix for 812×325 and the 16 px field floor
   ([HANDOVER](HANDOVER.md#n1-review-round-3--2026-10-12)). The owner can ask
   for one more review of those before GO.
2. Approval of the WebP derivatives and of the `sharp` devDependency
   (A1, §9).
3. Whether the versioned module graph (A2) ships now or is waived for this
   release.
4. Staging S1, S2 or S3, or an explicit decision to skip it (§7). **Decide
   this in A0, before Phase A**, because S1 needs tooling in the tag (A4(d)).
5. `JOURNEY_V2_ENABLED` declared `"false"` (recommended) or `"true"` (A3).
6. Who runs B3/B4/C1/C3, using which credentials (Supabase CLI login,
   Cloudflare OAuth, elevated test credentials kept in memory only).
7. The B3 backup method, (a), (b) or (c), and how long an encrypted data dump
   is kept.
8. The apex Worker's CPU limit, read from the account. If it is Free or
   unknown, S1 or a written acceptance of the risk (§6).
9. The A5 cross-version guards, or a written acceptance of the open-tab and
   hidden-backup cases (§6). **Updated 2026-10-13 for D2:** D2 imports a
   v0.5.1 export *file*; it does not read progress stranded in the v3 *key*
   of the same browser (A5, "What D2 does not cover"). So without A5(a),
   v0.6.0 still offers no in-game way to read or export that key's progress
   (§6). What D2 adds is a route for support (C4): a player whose v0.5.1 tab
   is still open exports from its footer and imports the file in v0.6.0,
   keeping one of the two journeys (the other becomes the recovery copy). D2
   also leaves A5(a) smaller: its detection and offer, on top of D2's
   migration, confirmation and strict restore. A5(b), the hidden newer v1
   cloud backup, is untouched by D2. The acceptance should say what support
   tells those players (C4).
10. The WebP-only gap on older Safari: accept it, or keep a PNG fallback (§9).
11. Whether the first-screen budget also covers returning players (§9).
12. **Q1 in v0.6.0** (G9). Q1 must ship in this release (§1), so before GO
    either review the [LOCAL-COMMANDS §15](LOCAL-COMMANDS.md#15-owner-decisions)
    decisions or record in writing that v0.6.0 ships them as proposed.
    Shipping makes them player-facing:
    - The card page's 修練升級 refuses in a browser without Web Locks or
      usable IndexedDB (§15 decision 2; [LOCAL-COMMANDS §9](LOCAL-COMMANDS.md#9-failure-states)),
      where v0.5.1's upgrade fell back to an unlocked write
      (`git show v0.5.1:app.mjs` line 54).
    - Cloud restore and local recovery restore now hold the strict fenced
      lock (`app.mjs:63`, `:139-145`; reached from `account-client.mjs:255`
      and `app.mjs:1283`), and so does D2's file import (`app.mjs:276`). They
      therefore refuse in a browser with Web Locks but
      no usable IndexedDB, on a full disk that refuses the fence write, and
      while the fence says `writing` (a reload heals that while IndexedDB
      accepts writes). v0.5.1's restore needed only Web Locks
      (`git show v0.5.1:app.mjs` lines 58-59). A refusal changes nothing
      ([LOCAL-COMMANDS §11](LOCAL-COMMANDS.md#11-profile-field-and-migration-impact),
      "Cost"). This is the release's main restore path (§1, C3), though few
      browsers have Web Locks without usable IndexedDB (for example Firefox
      96–114 private windows, **UNVERIFIED**).
    - Every other write under the profile lock, each page load's startup save
      included, now also reads and writes the IndexedDB fence. It waits up to
      0.5 s when its tab is behind or the record says `writing` (longer only
      if IndexedDB stalls), and on a full disk it can wait that long on every
      write until IndexedDB accepts writes again
      ([LOCAL-COMMANDS §10.1](LOCAL-COMMANDS.md#101-read-after-write-fence-added-after-review)
      Limits; §18.5 measured 0–11 ms more to the first lobby paint).
    - The `commands` ledger format then exists in players' saves.
    - §15 decision 1 (a restore retires only a lineage that has a ledger) now
      also governs D2's file import. On a device whose journey has no ledger,
      a card-page quote from before an import can still commit once, at its
      quoted price, on a copy the file holds unchanged; D2's exit item "a
      command ID issued before the import is expired or refused" therefore
      holds only for a journey with a ledger. "Always retire" would close it
      ([LOCAL-COMMANDS §11](LOCAL-COMMANDS.md#11-profile-field-and-migration-impact),
      "File import"; [§19](LOCAL-COMMANDS.md#19-file-import-and-save-safety-d2-2026-10-12), "Open").
    - The owner also accepts the forward-only rule (§6): after release, deploy
      or roll back the apex only to v0.5.1 or to a version that contains
      `7a7d03e`, and fix a problem in Q1 forward.
13. **Resolved by PR #12 (N1):** the rewards dialog's 43.08 px `module` tab in
    WebKit (A6), which predated Q1, needs no decision. N1 gives module tabs a
    44 px minimum width, and on 2026-10-13 at `0281798`
    `GAME_URL=http://127.0.0.1:4205 npm run test:expansion` exited 0 with all
    16 PASS lines in its WebKit half, 360x740 and 360x640 included, in one run
    (§13). The `test:map-piece` launch failure is fixed by the same PR: its
    WebKit half exited 0 with no `test-results/webkit-runtime` folder. No
    waiver, per-size run or CI exception is needed. Linux WebKit on a runner
    is **UNVERIFIED** until the browser job runs.
14. **Hosted CI for G7 while the Actions budget blocks it** (B1, GO item 1).
    GitHub Actions did not start PR #15's CI job: "The job was not started
    because an Actions budget is preventing further use." (run 38350385399).
    Restoring the budget is a paid or billing decision the agents must not
    make. Either restore it, so exact-source CI and the new browser job (§10)
    run on the release commit, or accept in writing a local CI record for that
    exact commit instead, knowing how it differs from CI: Node 26.0.0 where CI
    pins 22, the existing `node_modules` where CI runs `npm ci`, a loopback
    PostgreSQL 16.14 where CI uses `postgres:17`, macOS with installed Chrome
    and Playwright WebKit where CI would use Linux. The orchestrating session's
    record at `11d86d9` (the tree of `0281798`) is in G7 and §13.
15. **D1's Back at the 洞府 root** (G11). As built, Back at 洞府 with nothing
    open hands Back to the system, and on the web the page leaves **without a
    confirmation prompt**. The packet named this the owner default
    ([NAVIGATION](NAVIGATION.md#back-model--2026-10-12); HANDOVER's D1
    checkpoint). Confirm it, or ask for a prompt or another behaviour. Every
    layer above the root already closes one at a time, and leaving writes no
    save.
16. **D3's exit** (G11). The real exit of the first-battle teaching is a human
    playtest that the owner runs with **at least three first-time players**
    (fresh profiles, on a phone), recording round-1 HP lost, whether each adds
    pills before committing and whether they can explain a reveal, plus the
    owner's review of the coach copy's tone
    ([BATTLE-LAYOUT-PLAN](BATTLE-LAYOUT-PLAN.md#first-battle-teaching--2026-10-12),
    Exit and Open). Decide whether v0.6.0 waits for it or ships with it
    pending. Capping the AI's round-1 spend stays an owner fallback, to be
    considered only after that playtest; `engine.mjs` and `chooseAIMove` are
    unchanged.
17. **Landscape phones below 701 px wide** (G11). N1 recorded a fault it did
    not cause and did not fix ([NAVIGATION.md:450-515](NAVIGATION.md);
    [HANDOVER](HANDOVER.md#n1-review-round-3--2026-10-12)). Held sideways at
    667×375, 640×360 or 568×320 (also 700×390 and 667×331), the scenes get
    the portrait layout in a short frame, because the short-landscape rules
    sit under `@media(max-height:500px) and (min-width:701px)`
    (`expansion.css:94`, `:105`, `:110`; `scene-navigation.css:153`, `:174`).
    In both engines, in emulation:
    - with 西行秘匣 selected (what 秘匣 opens with), 開啟秘匣 is wholly hidden,
      so a WX-01 pack cannot be bought there;
    - 市集's 西行印 and 對弈's 來日, once opened, cover their own tab row, and
      the selected module survives a trip through the dock, so a player cannot
      reliably tap back out until a reload; 問道, 切磋, 整盒 and 遊歷's chapter
      module cover some or all of their tab row at some of these sizes;
    - several buy and travel buttons sit partly or wholly under the dock.

    The fault was already at `7712a7b`, but the modules it is in are new since
    v0.5.1: live v0.5.1's 19 public files include no `viewport.mjs`,
    `scene-navigation.css`, `expansion.css` or WX-01 module ([cmd] `git show
    v0.5.1:hosting/public-assets.json`), so v0.6.0 would ship it to players for
    the first time. How v0.5.1's own simpler market and arena pages lay out at
    these sizes was not checked. Decide: ship with the fault documented (the
    A7 release notes then name it), or fix it first, which is new work:
    vertical fit below 701 px was outside N1.
18. **Vertical fit on portrait phones** (G11; added 2026-10-13, review round
    2). N1 recorded this limit as well and did not fix it
    ([NAVIGATION.md:422-449](NAVIGATION.md), Limits; the M5.1
    [checklist](MOBILE-RELEASE.md#m51-phone-checklist)'s "Short screens" row,
    "Not fixed by N1"). A framed list pages by its tallest item
    (`viewport.mjs:15-21`), and, as NAVIGATION records, the list's compact
    cards are keyed to the viewport height (`max-height: 740px`), not to the
    height left after the insets. So a character's tile that holds several
    copies can be taller than the list's frame: the viewport controller flags
    the list (`data-viewport-overflow`) and the tile runs under the list's
    pager.
    Re-measured on 2026-10-13 on the tree of `0281798`, in emulation only
    ([cmd] §13):
    - With N1's fixture (every WX-01 printing in the save, so six copies of
      `wukong`), the 我的戰卡 list flags at 412×790, 393×780 and 360×780 in
      Chromium and WebKit, and on taller phones with top and bottom insets:
      412×839 with 48/34 px and 393×852 with 59/34 px, an iPhone 15
      home-screen web app (where D2 asks for persistent storage at every
      launch, [LOCAL-COMMANDS §19](LOCAL-COMMANDS.md#19-file-import-and-save-safety-d2-2026-10-12)).
      It does not flag at 412×800, 393×800, or 412×839 without insets. In
      Chromium the tallest tile, 361 px, runs 8–35 px past the frame, up to
      27 px of it under the top of the pager.
    - A new journey (16 cards, one copy each) flags at none of those sizes, in
      either engine. With two more copies of one character the tile is 336 px
      and flags only with the insets (Chromium only). Which collections in
      between flag was not mapped.
    - Shorter screens flag more pages, and in landscape with insets a flagged
      list's items reach 3–21 px under the dock. On 2026-10-13
      `npm run test:shell` printed NOTE lines that match NAVIGATION's
      2026-10-12 record (320×568: the collection's cards and decks and the
      arena; 302×640: the 三套牌組 tab; 844×390 and the Safari landscapes with
      insets).

    The framed lists are new since v0.5.1: its 19 public files include no
    `viewport.mjs`, `viewport.css` or `scene-*` file ([cmd] `git show
    v0.5.1:hosting/public-assets.json`), so v0.6.0 would ship this to players
    for the first time. How v0.5.1's own collection page lays out at these
    sizes was not checked, and no phone has been tried. This is not a phone
    check waiting to happen (item 1): the fault is measured. Decide: ship with
    it documented (the A7 release notes then name it), or fix it first, which
    is new work outside N1.

## 13. Checks run for this plan

| Command | Result |
| --- | --- |
| `npm run build` at `8afbabc` | exit 0; 80 files; manifest `98028a3a181c…54db` |
| `npm test` | exit 0; **456/456** pass |
| `python3 -m unittest discover -s tests -p '*_test.py'` | exit 0; 9 tests OK |
| `npm run preview -- --dry-run` | exit 0; bundle 906.25 KiB / gzip 188.52 KiB; no hosted call |
| `curl` `release.json` and `/api/v1/account` (generic User-Agent) | HTTP 200 / 200 |
| First-screen measurement (scratch Playwright + Chrome, loopback) | exit 0; §9 |
| `cwebp` / `ffmpeg` estimates, SSIM | exit 0; §9 |
| v3 snapshot size and validator timing (scratch Node script) | exit 0; §6 |
| `GAME_URL=http://127.0.0.1:4290 npm run test:browser` (installed Chrome, `python3 tools/serve.py --port 4290`, stopped afterwards) | exit 0; all **14** chained suites pass, `browserErrors: []`; **4 min 56 s** wall time (198 s user CPU) |
| Revision: `grep -n keep_bindings node_modules/wrangler/wrangler-dist/cli.js`; `node -p` Wrangler version | `keepVars` → `keep_bindings: ["plain_text","json"]` at `:159303-159306`; 4.136.1 |
| Revision: `which docker colima podman` | exit 1; none installed |
| Revision: Supabase CLI 2.117.0 binary strings, `legacy.db.dump` path | a non-dry dump resolves an image and runs it in a container, with `error running container: exit N` on failure; `--dry-run` only prints the script, after substituting connection variables |
| Revision: `pg_dump --version`; `psql --version`; `supabase/config.toml:41` | exit 0; 16.14 (Homebrew) for both; `major_version = 17` |
| Revision: `git show v0.5.1:tools/deploy.mjs \| wc -l`; `git diff --numstat v0.5.1 8afbabc` | 15 lines; `server/account-api.mjs` +13/−7, `tools/deploy.mjs` +120/−10, `ci.yml` +2/−2 |
| Revision: SSIM, ffmpeg 8.1.2, `format=rgb24` and `format=yuv444p` on both inputs (§9) | exit 0; `portraits` 0.9496 / Y 0.9756; `world-map` 0.9545 / Y 0.9717 |
| Revision: loopback guards, grep of `tools/*smoke*.mjs` | 15 scripts throw on a non-loopback `GAME_URL`; `smoke.mjs`, `journey-smoke.mjs`, `classics-smoke.mjs`, `backpack-smoke.mjs`, `map-piece-smoke.mjs` and `expansion-smoke.mjs` have no guard |
| Revision: `classics.native.webp` from the earlier `cwebp` run | 605,018 B |
| Q1: `node --test tests/*.test.mjs` at `b527dc3` | exit 0; **530/530** pass |
| Q1: `python3 -m unittest discover -s tests -p '*_test.py'` at `b527dc3` | exit 0; 9 tests OK |
| Q1: `npm run audit:content` at `b527dc3` | exit 0; 150 entries (120 `local-playable`, 30 `preview`), no findings |
| Q1: `npm run build` at `b527dc3` | exit 0; **83** files, 74,389,154 B; 23 PNG, 73,418,493 B; manifest `10f594fcd55a…4014` |
| Q1: first-screen text, scratch Node script (static import graph from `bootstrap.mjs` plus `index.html`'s stylesheets and `mark.svg`; `node:zlib` gzip 6 and brotli 11) at `8afbabc` and `b527dc3` | exit 0; at `8afbabc` it reproduces the browser set's 57 files and 929,264 / 267,540 / 228,341 B exactly; at `b527dc3`, 60 files and 970,661 / 282,691 / 240,926 B (§9) |
| Q1: `git merge-base --is-ancestor 7a7d03e <commit>` | exit 0 for `b527dc3`; exit 1 for `8afbabc` and `b40c4d2` |
| Q1: `git rev-list --count` and `git diff --shortstat/--name-status/--numstat` from `v0.5.1` to `8afbabc` and to `b527dc3`, with the allowlist read at each commit | `8afbabc` reproduces the earlier figures; `b527dc3` in §2 |
| Q1: `git diff --stat v0.5.1 b527dc3 -- hosting/www.mjs wrangler.www.jsonc`; `git diff 8afbabc b527dc3 -- hosting/` | the first prints nothing; the second adds only the six LZ-01 preview entries and the three Q1 public modules. `bootstrap.mjs:3` is still the only dynamic import among the 39 public modules |
| Q1: v0.5.1 storage, the `git grep` of tag `v0.5.1` quoted in §6; `git show v0.5.1:app.mjs`, `v0.5.1:progression.mjs` | runtime writes only the v3 profile, battle and recovery keys (`app.mjs` lines 51, 65-67, 89, 91, 541); no IndexedDB anywhere (§6) |
| Q1: citation re-check, scratch script mapping every `path:line` from `8afbabc` through `git diff -U0`, then reading each target | 31 citations had drifted (in HANDOVER, ROADMAP, `progression.mjs`, `profile-store.mjs`, `account-client.mjs` and `app.mjs`) and now point at the same content; every other one already did |
| Q1: loopback guards, grep of `tools/*smoke*.mjs` at `b527dc3` | 17 of 22 scripts throw on a non-loopback `GAME_URL`, including `command-smoke.mjs`; `smoke.mjs`, `journey-smoke.mjs`, `classics-smoke.mjs`, `backpack-smoke.mjs` and `map-piece-smoke.mjs` have none. Correction to the row above: `expansion-smoke.mjs` also throws at `8afbabc` (line 18), so that count was 16 of 21 |
| Q1 review: `grep -n "import('[./]" tools/*.mjs` (A2); source as at `b527dc3` | exit 0; 16 in-page imports by site-root path in 9 smokes, all listed in A2 |
| Q1 review: `git log --first-parent --format='%h %p' origin/main`; `git log --diff-filter=A --format=%h b527dc3 -- profile-fence.mjs` (§1) | PRs #1 and #3–#9 each landed as a two-parent merge commit; `7a7d03e` |
| Q1 review: the Worker entry bundled with the repo's esbuild 0.28.1 into a scratch file (`--bundle`, `@supabase/supabase-js` external), metafile read; source as at `b527dc3` (§2) | exit 0; `command-ledger.mjs` is in the bundle (3,772 B in output). Not a Wrangler measurement |
| Q1 review 2: an APFS copy of `8191bfe` served by `python3 tools/serve.py --port 4613` (stopped and the copy deleted afterwards); `BROWSER=webkit node tools/expansion-smoke.mjs`, then alone with `VIEWPORT_SIZE=360x640` and `=844x390` (A6) | exit 1 after 6 PASS lines (1440x900, 1280x720, 390x844): `360x740/rewards/grants: actions must be visible, unobstructed and44px`, control `module`, `width: 43.078125`; 360x640 exit 1 on the same tab; 844x390 exit 0 |
| Q1 review 2: the same server, `BROWSER=webkit node tools/map-piece-smoke.mjs`, then again with `PLAYWRIGHT_BROWSERS_PATH` set to the installed Playwright cache (A6) | exit 1, `browserType.launch: Executable doesn't exist at …/test-results/webkit-runtime/webkit-2359/pw_run.sh`; then exit 0 |
| Q1 review 2: v0.5.1's manifest recomputed from the tag's blobs (`git show v0.5.1:hosting/public-assets.json`, `git cat-file blob`), hashed as v0.5.1's `tools/build.mjs:35-38` does (§2) | 19 files, 11,130,757 B, `7c18fcebe9d1…4e88`, as in [HOSTING.md:137](HOSTING.md). §2 had `…6e88` since the first draft, a transcription slip |
| Q1 review 2: scratch Node scripts with an in-memory store (A5). First, a v3 profile through `createSnapshot` and `restoreSnapshot`, then `assertLedgerUnchanged` and `store.replace` over a v5 profile whose ledger has `nextSeq` 5. Second, commit `cmd-1` with `commitCommand`, replace the journey by `store.replace` or by a bare `store.save`, then send the same `cmd-1` request again | First: the guard throws `COMMAND_LEDGER_GUARD_ERROR`; `replace` returns the v3 journey as v5 with the ledger retired (`nextSeq` 6, `retiredBelow` 6, no receipts) and writes `RECOVERY_KEY`. Second: after `replace` the request is rejected as `expired`; after a bare `save` it commits again (`duplicate: false`) |
| Q1 review 3: `grep -n` for `passed(`, `try{`, `}catch` and `if(failure)` in `tools/expansion-smoke.mjs` at `feba897` (A8) | PASS at `:194` and `:207` in the six-size loop and at `:220`, `:231`, `:243` and `:257` after it, all inside one `try` (`:179`) whose `catch` keeps the first error, rethrown at `:264`. A full pass prints 16 PASS lines, so the WebKit run above, with 6, left 10 checks unrun |
| Q1 review 3: loopback guards, `includes(base.hostname)` or `includes(new URL(base).hostname)` in every `tools/*smoke*.mjs` blob at `8afbabc` and `feba897` (C2) | 17 of 21 at `8afbabc`, 18 of 22 at `feba897`; only `smoke.mjs`, `journey-smoke.mjs`, `classics-smoke.mjs` and `backpack-smoke.mjs` have none. `map-piece-smoke.mjs` asserts loopback at line 15 at both commits (`node:assert/strict`, before any browser launches). Correction to the two loopback rows above, which listed it as unguarded: their counts should read 17 of 21 and 18 of 22, and C2's "16 other smoke scripts" was 17 |
| Q1 review 3: the public `.mjs`/`.html` files in `hosting/public-assets.json` searched for `shanhai.profile.v3`, `type="file"` and `FileReader`; `bootstrap.mjs`, `app.mjs:1103-1104` and `profile-store.mjs:78-98` read (lines as at `b527dc3`; §6, C4) | The v3 key appears only in `profile-store.mjs:12` (a migration source, read only while v5 is absent) and `bootstrap.mjs:16` (the startup-recovery export, built only in the `catch` around `import('./app.mjs')`). No file input or `FileReader`, so no save import. `export-save` serialises `loadProfile()`, the v5 journey. (True at `b527dc3`; at `0281798` D2 adds the file import, and the export goes through `exportJourney`, §6) |
| Q1 review 3: scratch Node script with in-memory storage, v0.5.1's `progression.mjs`, `collection.mjs` and `engine.mjs` from `git archive v0.5.1`, and `profile-store.mjs` and `cloud-save.mjs` at `feba897` (A5; scratch deleted afterwards) | A v0.5.1 journey after `beginBattle`, stored as `shanhai.profile.v3`: `load()` migrates it (version 5, battle pending); `createSnapshot` refuses it and the migrated profile with `請先完成或放棄未完對局或活動旅程，再儲存雲端旅程。`. A v0.5.1 journey with 2,001 copies: `createSnapshot` refuses it with `雲端旅程暫時最多保留 2,000 張卡牌…`; migrated by `load()` first, it wraps as snapshot v3 and `restoreSnapshot` returns version 5 with 2,001 copies |
| 2026-10-13: `git log --first-parent --format='%h %p' origin/main` (`origin/main` = `0281798`); `git rev-parse 11d86d9^{tree} 0281798^{tree}`; `git merge-base --is-ancestor 7a7d03e 0281798`; `git log --diff-filter=A --format=%h 0281798 -- profile-fence.mjs` (§1) | PRs #11, #12, #14 and #15 each landed as a two-parent merge (`335d2b7`, `e785b27`, `a7bda4b`, `0281798`), as PR #10 did (`7712a7b`); both trees `3c211f98…`; exit 0; `7a7d03e` |
| 2026-10-13: `npm run build` at each merge commit `7712a7b`, `335d2b7`, `e785b27`, `a7bda4b` and `0281798`, in one detached scratch worktree (`git worktree add --detach`, then `git checkout --detach` per commit; `dist/` deleted after each, the worktree removed afterwards) (§1, §2) | each exit 0: 83 files, 74,389,154 B, manifest `10f594fc…4014` · 84, 74,408,267 B, `2beb9777…bb80` · 84, 74,414,617 B, `939f26f8…f49c` · 88, 74,456,379 B, `5b403015…9c39` · **90, 74,496,049 B, `e05db797…8746`**; 23 PNG, 73,418,493 B at all five |
| 2026-10-13: first-screen text by the Q1 revision's method (scratch Node script: static imports from `bootstrap.mjs`, its `import('./app.mjs')`, `index.html`'s stylesheets, `mark.svg`; `node:zlib` gzip 6 and brotli 11) at `8afbabc`, `b527dc3`, `7712a7b`, `335d2b7`, `e785b27`, `a7bda4b` and `0281798` (§9) | exit 0; `8afbabc` and `b527dc3` reproduce 57 and 60 files byte for byte, and `7712a7b` equals `b527dc3`; then 61 files, 989,774 / 289,614 / 246,767 B (raw / gzip / brotli); 61, 996,124 / 291,891 / 248,736; 65, 1,037,886 / 308,044 / 261,996; **67, 1,077,556 / 322,718 / 274,196** at `0281798`. `bootstrap.mjs:3` is still the only dynamic import |
| 2026-10-13: the public files' `git diff 7712a7b 0281798` searched for `url(`, `assets/`, `.png`, `.webp` and `.svg` (§9) | no match: D1, N1, D2 and D3 add or change no image reference |
| 2026-10-13: `WRANGLER_SEND_METRICS=false npm run preview -- --dry-run` at `0281798`, no `hosting/.dev.vars` (§2) | exit 0; `Total Upload: 910.52 KiB / gzip: 189.56 KiB`. Its banner reported a newer Wrangler (4.149.0), so Wrangler ran its own version check; the project's 4.136.1 ran |
| 2026-10-13: the Worker's static import graph from `server/account-api.mjs` (scratch Node script), then `git diff --stat 7712a7b 0281798` over its 14 files (§2) | empty: D1, N1, D2 and D3 change nothing the Worker bundles |
| 2026-10-13: `git rev-list --count [--no-merges] v0.5.1..0281798`; `git diff --name-status/--numstat v0.5.1 0281798` over the allowlist at `0281798`, and over `server/account-api.mjs`, the migrations, `tools/deploy.mjs` and `ci.yml` (§2) | 223 commits (202 non-merge); 83 of 90 runtime files changed (71 added, 12 modified), +8,486/−390; the outside files unchanged since `8afbabc`. The same script reproduces `b527dc3`'s 127/115, 76 (64/12) and +6,947/−371 |
| 2026-10-13: `curl -A 'Mozilla/5.0'` of `https://mythseal.com/release.json`, no other header (§2) | HTTP 200, exit 0, at about 05:23 UTC: `clientVersion` `0.5.1`, `gitCommit` `ea485586…`, 19 files, 11,130,757 B, manifest `7c18fceb…4e88`. Live is still v0.5.1 |
| 2026-10-13: `python3 tools/serve.py --port 4205` from this worktree at `0281798`, started after checkout and stopped afterwards; `GAME_URL=http://127.0.0.1:4205`; `PLAYWRIGHT_BROWSERS_PATH` unset and no `test-results/webkit-runtime` folder; installed Chrome 155.0.8059.40, Playwright 1.63.0 with WebKit 26.6, Node 26.0.0, macOS 26.6.2; one suite at a time | the five rows below (seven suites); `test-results/` deleted afterwards |
| 2026-10-13: `npm run test:expansion` (Chromium, then `BROWSER=webkit`) (A6) | exit 0, 215 s; 16 PASS lines per engine (899 and 892 layout checks); WebKit passes `360x740` and `360x640`, so A6's first failure is gone (§12 item 13) |
| 2026-10-13: `npm run test:map-piece` (A6) | exit 0, 57 s; 8 PASS lines per engine; WebKit launched from Playwright's default cache, so A6's second failure is gone |
| 2026-10-13: `npm run test:wx01` | exit 0, 205 s; per engine 17 PASS lines (`wx01-presentation-smoke`), 6 checks (`profile-recovery-smoke`) and 10 (`wx01-box-smoke`), with empty `browserErrors` and `errors` |
| 2026-10-13: `npm run test:inheritance`; `npm run test:collection-display` | exit 0, 54 s and 35 s; 9 and 10 PASS lines per engine, empty `browserErrors` |
| 2026-10-13: `npm run test:liaozhai`; `npm run test:honglou` (preview pages) | exit 0, 57 s and 40 s; 14 PASS lines per engine each, empty `errors` |
| 2026-10-13: citation re-check by the Q1 revision's method: a scratch script maps every `path:line` from `7712a7b` (whose code equals `b527dc3`'s and whose documents are this plan's own) through `git diff -U0` to `0281798`, flags any range a hunk touches, and each target was read | 233 citations: 188 unchanged, one of another revision, 44 drifted or touched by a change (in HANDOVER, VALIDATION, LOCAL-COMMANDS, ACCOUNTS, `app.mjs`, `profile-store.mjs` and `tools/map-piece-smoke.mjs`). Each now points at the same content or, where the code under it changed (`app.mjs`'s export, page tools and recovery call; the map-piece fix), at the new code. HANDOVER and VALIDATION citations were then moved again for this revision's own additions to those files |
| 2026-10-13: `grep -n "import('[./]" tools/*.mjs` (A2); loopback guards in every `tools/*smoke*.mjs` (C2) | 24 lines with 25 in-page imports, in 11 smokes; 22 of 26 smokes guarded (21 throw, `map-piece-smoke.mjs` asserts), and `smoke.mjs`, `journey-smoke.mjs`, `classics-smoke.mjs` and `backpack-smoke.mjs` have none |
| 2026-10-13: `git grep -n -F -e 0.5.1 -e clientVersion 0281798` outside `docs/` and Markdown (§3) | the `b527dc3` files, plus D2's mentions of v0.5.1 as an export format (`platform.mjs:59`, `tests/save-durability.test.mjs`, `tools/save-durability-smoke.mjs`) |
| 2026-10-13: `git grep` of tag `v0.5.1` for `shanhai.saves`, `shanhai.coach`, `mythseal.nav`, `popstate`, `pushState`, `replaceState`, `history.`, `storage.persist`, `localStorage.key(`, `localStorage.length` and `navigator.` (§6) | only `match.history` (the battle log) and `navigator.locks`: v0.5.1 touches none of D1–D3's state |
| 2026-10-13, orchestrating session: hosted CI for PR #15 (G7) | not started; check-run annotation "The job was not started because an Actions budget is preventing further use." (run 38350385399) |
| 2026-10-13, orchestrating session: every step of `.github/workflows/ci.yml`, locally at `11d86d9` (tree of `0281798`) (G7) | `npm test` 603/603; `tools/test-backup-sql.sh` passed on a throwaway loopback PostgreSQL 16.14, TCP only (CI: `postgres:17`); Python unittest 9 OK; `npm run test:contracts` passed; `npm run build` 90 public files; `npm run preview -- --dry-run` and `npm run deploy -- --dry-run` exit 0 (`WRANGLER_SEND_METRICS=false`); `node --check` on all modules; `py_compile` of `serve.py`; `bash -n Play.command`. Node 26.0.0 (CI: 22); no `npm ci` |
| 2026-10-13, orchestrating session: browser suites at `11d86d9` against `python3 tools/serve.py` on `127.0.0.1:4204`; Chromium as installed Chrome and WebKit 26.6. The scripts choose the device: `test:back`, `test:shell` and `test:coach` emulate a Pixel 7 in Chromium and an iPhone 15 in WebKit (`tools/back-smoke.mjs:59-60`, `tools/shell-smoke.mjs:26`, `tools/coach-smoke.mjs:67-68`); the others set their own viewports (for example `tools/save-durability-smoke.mjs:80`, `tools/command-smoke.mjs:49`) (G9, G10) | all exit 0: `test:coach` 16 checks per engine; `test:back` 21 in Chromium, 20 in WebKit; `test:saves` 20 groups per engine; `test:shell` 26 per engine; `test:commands` 13 groups per engine; `test:battle-table` 40/40 per engine; `test:viewport` 23/23 per engine; `test:browser` (Chromium, 14 suites) 91 PASS lines |
| 2026-10-13, orchestrating session: `npm run audit:content` | 150 entries, no findings |
| 2026-10-13, on this revision's documentation tree (before and after committing): `node --test tests/*.test.mjs`; `npm run build`; `npm run audit:content`; `git diff --check`; a scratch Markdown link and anchor check over the five changed documents | exit 0, **603/603**; 90 files, manifest `e05db797…8746`; 150 entries (120 `local-playable`, 30 `preview`), no findings; clean; all 459 local link targets and anchors found |
| 2026-10-13, review round 1: `git show <tag>:progression.mjs` for `v0.4.1`, `v0.5.0` and `v0.5.1`, then `PROFILE_VERSION`; `platform.mjs:58-61` read (A5, §6) | `PROFILE_VERSION = 3` at all three tags (line 15). `LEGACY_EXPORT_VERSIONS` is `[3, 4]`, and v4 is the local namespace `load()` also migrates: no public build exported a v4 file. A5 and §6 had said v3 or v4 |
| 2026-10-13, review round 1: `grep -n` of `tests/save-durability.test.mjs` for `archive`, `5,782`, `v051Download(`, `child_process`, `execSync` and `spawn` (C3) | `git archive v0.5.1` and 5,782 B appear only in comments (`:79`, `:92-94`); no child process or git call; the v0.5.1 test pins the download order's last seven keys (`:198`). C3 had said the Node test checks the bytes against `git archive v0.5.1` |
| 2026-10-13, review round 1: `grep -l 'devices\['` over `tools/*.mjs`; `newContext` in `save-durability-smoke.mjs`, `command-smoke.mjs`, `battle-table-smoke.mjs` and `viewport-smoke.mjs` | only `back-smoke.mjs`, `coach-smoke.mjs` and `shell-smoke.mjs` load a device descriptor; the other four set their own viewports (`:80`, `:49`, `:117`, `:45`). The orchestrating session's row above is narrowed to match |
| 2026-10-13, review round 1: `git show v0.5.1:hosting/public-assets.json`; `git grep -n 'min-width: *701px' 0281798 -- '*.css'`; NAVIGATION's landscape record read (§12 item 17) | v0.5.1 serves 19 files with no `viewport.mjs`, `scene-navigation.css`, `expansion.css` or WX-01 module; the short-landscape rules sit at `expansion.css:94`, `:105`, `:110` and `scene-navigation.css:153`, `:174`, all `(max-height:500px) and (min-width:701px)` |
| 2026-10-13, review round 1: per-packet first-screen shares from the figures in the first-screen row above (§2, §9) | D1 19,113 / 6,923 / 5,841 B (raw / gzip / brotli), N1 6,350 / 2,277 / 1,969, D2 41,762 / 16,153 / 13,260, D3 39,670 / 14,674 / 12,200; total 106,895 / 40,027 / 33,270. Existing files: 2,920 + 6,350 + 11,316 + 14,485 − 824 (`nav-stack.mjs`, added in this range) = 34,247 B |
| 2026-10-13, review round 1, on the corrected documentation tree: `node --test tests/*.test.mjs`; `npm run build` (`dist/` deleted afterwards); `npm run audit:content`; `git diff --check`; the scratch link and anchor check over the five changed documents; the `HANDOVER.md:N` and `VALIDATION.md:N` citations mapped through `difflib` from `09b08bd` | exit 0, **603/603**; 90 files, 74,496,049 B, manifest `e05db797…8746`; 150 entries (120 `local-playable`, 30 `preview`), no findings; clean; all 474 local link targets and anchors found; every such citation moved by this round's own additions to those two files and now points at the same lines |
| 2026-10-13, review round 2: scratch Node script over `git archive v0.5.1 '*.mjs'` (scratch deleted afterwards): v0.5.1's `hydrateProfile` over a JSON round trip of `claimLogin(createProfile({ now }), now)`, as its `loadProfile` reads the stored key, then `JSON.stringify(…, null, 2)`, at the test's clock `2026-09-21T12:00:00.000Z` and at 2026-10-01 and 2026-10-16; then the test file's own `v051Download(v051Profile(claimLogin(fresh(), now)))` at `0281798` (C3) | the download is **5,790 B** (`Buffer.byteLength`) and 5,782 characters at all three dates; its only non-ASCII text is the deck name 山海初陣 (`git show v0.5.1:collection.mjs` line 181), 4 characters of 3 bytes each. The stored order is the same size. The test's string `===` v0.5.1's download: true. C3, the test comment (`:94`) and the D2 third-review record gave the character count as bytes |
| 2026-10-13, review round 2: `grep -n 'archive v0.5.1'` over VALIDATION and LOCAL-COMMANDS (C3) | the D2 third-review entry ([VALIDATION](VALIDATION.md#d2-third-review-fixes--2026-10-12), finding 4: "Checked with a scratch script over `git archive v0.5.1 '*.mjs'`") and LOCAL-COMMANDS §19 ("checked against `git archive v0.5.1`") record the check besides the test comment. C3 had said it was done by hand and that only a comment records it |
| 2026-10-13, review round 2: `package.json`'s `test:browser` split on `&&`; `git log -S'job is green on' -- docs/RELEASE-NEXT.md`; `git show 0281798:docs/RELEASE-NEXT.md` (A6); `grep -n '^## Checks\|^\*\*Checks\.\*\*' docs/NAVIGATION.md` (A1, A6, G10) | 14 smokes, none of `back-smoke`, `save-durability-smoke`, `shell-smoke` or `coach-smoke`; only `e84e44a` added A6's hosted-run requirement, and at `0281798` A6's Verify was local; `## Checks` (`:612`) names no `test:back`, which the Back model's **Checks.** paragraph (`:161`) does |
| 2026-10-13, review round 2: `python3 tools/serve.py --port 4205` from this worktree (code tree of `0281798`), started after checkout and stopped afterwards; `GAME_URL=http://127.0.0.1:4205 npm run test:shell` (§12 item 18) | exit 0, 99 s, 26 checks per engine. Vertical-overflow NOTE lines in both engines: 302×640 decks; 320×568 cards, decks and the arena; the device size with 48/44/34/44 px insets (Pixel 7: cards; iPhone 15: cards, decks and the arena); 844×390 with those insets: the three collection tabs, the market, 旅程閣 and the arena. Under-dock NOTE lines: 17, 6 and 5 px at 844×390 with insets; 3 px at 852×343; 6 px at 844×340; 21, 10 and 9 px at both 812×325. All as NAVIGATION recorded on 2026-10-12 ([NAVIGATION.md:422-449](NAVIGATION.md)) |
| 2026-10-13, review round 2: a scratch Playwright script on the same server (scratch deleted afterwards), seeded as `tools/shell-smoke.mjs` seeds (`pageFor`: fixed clock, `--safe-area-inset-*` overrides), Pixel 7 in installed Chrome and iPhone 15 in WebKit 26.6; opens the collection and reads `[data-viewport-overflow="true"]`, the shown items' heights and the pager's top (§12 item 18) | N1's fixture (all 29 WX-01 printings): the `cards` list flags at 412×790, 393×780, 360×780, 412×839 with 48/34 px and 393×852 with 59/34 px in both engines, and not at 412×800, 393×800 or 412×839. Chromium: frames of 360, 350, 350, 333 and 335 px against a 361 px tallest tile, which runs 8, 18, 18, 35 and 33 px past the frame, 0–27 px past the pager's top. A new journey (16 cards) flags at none of the eight sizes in either engine. Chromium only: one WX-01 printing flags none; two more `wukong` copies flag only the two inset sizes (tile 336 px); five more give the full fixture's figures |
| 2026-10-13, review round 2, on the corrected documentation tree: `node --test tests/*.test.mjs`; `npm run build` (`dist/` deleted afterwards); `npm run audit:content`; `git diff --check`; a scratch link and anchor check over RELEASE-NEXT, VALIDATION, HANDOVER, ROADMAP and the docs index; every `HANDOVER.md:N`, `VALIDATION.md:N`, `ROADMAP.md:N` and `RELEASE-NEXT.md:N` citation in the tracked Markdown mapped through `difflib` from `50c3cf6` | exit 0, **603/603**; 90 public files, manifest `e05db797…8746`; no findings; clean; all 487 local link targets and anchors found; 16 citations in this plan moved by this round's additions to HANDOVER and VALIDATION, each now pointing at the same text (checked range by range) |

**Not run here:** `npm run deploy -- --dry-run` (excluded by this task's
rules; CI runs it, `ci.yml:62`), the SQL harness (no
disposable database was created on this machine), the WebKit suites, CI for
`8afbabc` (no GitHub API access was used), and anything hosted beyond the two
GETs: migration state, secrets, Worker versions, plan limits and billing are
**UNVERIFIED** today and are taken from dated documents. The revision made no
network calls and ran nothing hosted. It did not run `wrangler deploy
--dry-run` (A3), `wrangler dev` on a CI runner (§10) or the snapshot timing
script again (the 22–29 ms and 108–121 ms ranges in §6 combine the original
run with the reviewer's). It did not check the Safari/WebP matrix, Cloudflare's
CPU limits or the `exceededCpu` outcome name.

**Not run for the Q1 revision:** any browser suite at `b527dc3`
(`test:commands` last passed at `38fa64f`, and `test:browser`,
`test:inheritance` and `test:wx01` at `1afaf6b`, per
[VALIDATION](VALIDATION.md#q1-third-pre-merge-review-fixes--2026-10-11)), a
browser first-screen measurement, any Wrangler command (so the Worker bundle
size is not re-measured), the SQL harness, CI, and anything hosted. It made no
network calls.

**Not run for the 2026-10-13 revision** (by this revision itself): the SQL
harness, `npm run deploy -- --dry-run`, `test:browser`, `test:commands`,
`test:back`, `test:saves`, `test:shell`, `test:coach`, `test:battle-table` and
`test:viewport` (the orchestrating session ran all of these at `11d86d9`, the
same tree, and they are attributed to it above); `test:atelier`; a browser
first-screen measurement (the image set at `0281798` is inferred from the
source, §9);
`npx --no-install wrangler deploy --config wrangler.jsonc --dry-run` (A3);
hosted CI, which cannot start (G7); any physical device or real Safari; a
rollback to v0.5.1 in a browser (§6's rollback analysis is read from source);
and anything hosted beyond one `GET` of `release.json`. PR #13 and the branch
`mobile/cloud-pipeline` were not read; their state in §1 is the orchestrating
session's report.
