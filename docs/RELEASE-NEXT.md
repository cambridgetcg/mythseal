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

Evidence labels: `path:line` points at the tree this document is committed in;
every citation was re-checked for the Q1 revision, and a citation of another
revision says so (for example `git show v0.5.1:…`). Measurements say which
commit they ran on. **[cmd]** is a command run for this plan on 2026-10-11
(exit code given); **UNVERIFIED** marks anything not checked here. The only
network calls made were unauthenticated
`GET https://mythseal.com/release.json` and `GET https://mythseal.com/api/v1/account`;
the Q1 revision made none.

Step markers: **AGENT** = repo change any agent can make and check locally, with
no hosted access. **CI** = GitHub Actions on the exact commit. **OWNER** =
touches hosted services, real player data, credentials, DNS or billing.

## 1. Goal and scope

**Goal.** Publish `main` as it stands after PR #10 (Q1) as **v0.6.0**, while
keeping every existing account, v1 cloud backup and local save intact. A player
who loads the new client must still be able to back up their journey to the
cloud.

**Release candidate.** Build only from `main` after PR #10 merges, plus the
release PR on top (B1). Never build or deploy `8afbabc`, or any other v5
commit on `main` from before PR #10: those are v5 builds without Q1's fence (§6). A
candidate qualifies only if `git merge-base --is-ancestor 7a7d03e <commit>`
exits 0 (`7a7d03e` adds the fence; [cmd] it exits 0 for `b527dc3` and 1 for
`8afbabc` and `b40c4d2`). That check needs **PR #10 to land as a merge
commit**, as PRs #1 and #3–#9 did ([cmd] `git log --first-parent
--format='%h %p' origin/main`: each has two parents). A squash or rebase merge
gives the fence a new SHA, so `7a7d03e` never becomes an ancestor of `main`, and
every check of it in this plan (G9, A8, B1, C1, §6, §8, §11) would stop a build
that does contain the fence and call it pre-fence. If PR #10 lands any other
way, replace `7a7d03e` in those checks, before Phase A, with the commit that
brought the fence into `main`: `git log --diff-filter=A --format=%h main --
profile-fence.mjs` names it ([cmd] it prints `7a7d03e` for `b527dc3`).

**Why Q1 is in this release.** Live v0.5.1 keeps its journey in
`shanhai.profile.v3` (`git show v0.5.1:progression.mjs` lines 15-16), and `main`
uses profile v5 (`progression.mjs:24`), so v0.6.0 would be the first public v5
release. The Q1 contract requires Q1 in or before that release, and a release
that includes Q1 runs `npm run test:commands` in both engines
([LOCAL-COMMANDS §11](LOCAL-COMMANDS.md#11-profile-field-and-migration-impact),
§15 decision 3).

**What changed on `main` since this plan's `8afbabc` baseline.** Q0 (PR #5) and
the LZ-01 specials briefs (PR #4) were already in `8afbabc`. Since then:

| Change | Public build | Effect on this release |
| --- | --- | --- |
| PR #6, docs index; PR #7, this plan | No change | Documentation only |
| PR #8, LZ-01's six special images | No change: the six PNGs are added to `hosting/preview-assets.json` only, and `hosting/public-assets.json` names no `assets/lz01/` file ([cmd] `git diff 8afbabc b527dc3 -- hosting/`) | Stays preview-only, like the rest of LZ-01 |
| PR #9, Q4 content registry | No change: `tools/content-registry.mjs` is Node tooling, never served; it adds `npm run audit:content` | A tooling check for Phase A (A8) |
| PR #10, Q1 local commands | 80 → **83** files: adds `command-ledger.mjs`, `local-commands.mjs` and `profile-fence.mjs`, and changes `app.mjs`, `account-client.mjs`, `cloud-save.mjs`, `profile-store.mjs` and `progression.mjs` | Ships in v0.6.0 (above); its release rules are G9, A8, §6 and §8 |

**In scope**

- Everything merged since v0.5.1: the five-place lobby and viewport navigation,
  WX-01 (15 new 西遊 characters, 29 printings, packs, boxes, 西行印 choices),
  six campaign volumes (66 encounters) and the 火焰山三連戰 activity,
  same-character inheritance, character stacks and the ink codex, Mist Gate
  immersion, the battle resource/clash presentation, story maps, the map piece,
  and the Q0 對局 table (PR #5) ([HANDOVER.md:15-20](HANDOVER.md), `:43-85`,
  `:465-562`).
- **Q1** (merged by PR #10): the card page's 修練升級 as a previewed local
  command whose effects and receipt land in one profile write, an optional
  device-local `commands` ledger inside the v5 profile that backups never
  contain, and an IndexedDB read-after-write fence for every writer under the
  profile lock ([LOCAL-COMMANDS](LOCAL-COMMANDS.md); [HANDOVER.md:178-239](HANDOVER.md)).
  `PROFILE_VERSION`, the snapshot format, the Worker's routes and validator
  verdicts, the SQL and the journey flags are unchanged
  ([LOCAL-COMMANDS §12](LOCAL-COMMANDS.md#12-backup-validation-impact)); the
  Worker bundle does gain Q1 code (§2).
- Journey **v3** cloud backup (profile v5) on the hosted database and Worker.
- The release gates that [HANDOVER.md](HANDOVER.md) already sets: hosted v2/v3
  migrations, Worker/client flags, a coherent versioned module graph,
  binding-retention proof and smaller image transfers (§4), plus Q1's release
  rules (G9).

**Out of scope:** the LZ-01/HL-01 literary previews and atelier/playtest pages
(they stay in `hosting/preview-assets.json`, including PR #8's six LZ-01 special
images), Q4's content registry (tooling, never served), an authoritative
economy, native apps, NFTs, paid upgrades, SMTP/Resend changes and
redirect-Worker code changes. `hosting/www.mjs` and `wrangler.www.jsonc` are
unchanged since v0.5.1 ([cmd] `git diff --stat v0.5.1 origin/main --
hosting/www.mjs wrangler.www.jsonc` prints nothing at `8afbabc`, and again
against `b527dc3`).

## 2. What is live and what main adds

Live values come from [cmd] `curl` at **2026-10-11 08:35:12 UTC** (both HTTP 200,
exit 0). Candidate values come from [cmd] `npm run build` (exit 0) at
**`b527dc3`**, the Q1 branch with `origin/main` `b40c4d2` merged in, whose
public files are those PR #10 brings to `main`. The plan's first measurements,
at `8afbabc`, are kept in brackets.

| Item | Live (mythseal.com) | Candidate, measured at `b527dc3` [at `8afbabc`] | Evidence |
| --- | --- | --- | --- |
| `clientVersion` / commit | `0.5.1` / `ea48558` | `0.5.1` (not bumped yet) / `b527dc3` | live `release.json`; `dist/release.json` |
| Public files | 19 files, **11,130,757 B** | 83 files, **74,389,154 B** (70.94 MiB) [80 files, 74,347,757 B]. Q1 adds three modules (32,980 B) and grows five existing ones by 8,417 B | both manifests |
| Manifest SHA-256 | `7c18fceb…6e88` | `10f594fc…4014` [`98028a3a…54db`] | build output |
| Of which PNG | 3 files, 10,838,776 B | **23 files, 73,418,493 B**, unchanged since `8afbabc` | `dist/release.json` |
| Account API | `{"authenticated":false,"user":null,"emailEnabled":true}`: no `journeyVersions` field, so the v1-only Worker | `/api/v2` and `/api/v3` routes behind `JOURNEY_V2_ENABLED` / `JOURNEY_V3_ENABLED`; `journeyVersions` in every account reply. Q1 changes no route | live probe; `server/account-api.mjs:8-16`, `:123-125`, `:173`; v0.5.1 routes: `git show v0.5.1:server/account-api.mjs` lines 7-12 |
| Local save key | `shanhai.profile.v3` | `shanhai.profile.v5`; reads v4/v3/v2 sources and leaves them in place. Since Q1 a v5 profile may also hold a device-local `commands` ledger | `git show v0.5.1:progression.mjs:16`; `progression.mjs:24`; `profile-store.mjs:10-14`, `:71-92`; ledger: `progression.mjs:250` |
| Cloud snapshot | v1: 512 KiB, 2,000 copies | v3: 4 MiB, 10,000 copies; v1 is still accepted. The ledger never enters a backup | `cloud-save.mjs:9-13`, `:177-192`; `server/account-api.mjs:5-6` |
| Hosted migrations | `20260921210000`, `20260921210100` applied | plus `20260922210000` (v2) and `20260923000000` (v3), **not applied** | [HANDOVER.md:787-791](HANDOVER.md); [ACCOUNTS.md:12](ACCOUNTS.md) |
| Deploy helper | v0.5.1's tracked `tools/deploy.mjs` was 15 lines, with no identity, secret or `--keep-vars` checks | Hosted preflight plus `--keep-vars` (`tools/deploy.mjs:63-84`, `:93-97`). It has only stub-test evidence | [cmd] `git show v0.5.1:tools/deploy.mjs` |
| Worker bundle | (unknown) | Not re-measured at `b527dc3` (the Q1 revision ran no Wrangler command) [`Total Upload: 906.25 KiB / gzip: 188.52 KiB`]. The Worker imports `cloud-save.mjs` (`server/account-api.mjs:2`) and, through it, `progression.mjs` (`cloud-save.mjs:2`), which since Q1 imports `command-ledger.mjs` (`progression.mjs:11`), so the bundle now contains Q1 code. Q1 also changed `hydrateProfile` (`progression.mjs:250`), which the validator runs (`cloud-save.mjs:159`). Verdicts are unchanged: `validateProfile`'s exact-key check rejects a `commands` key first (`cloud-save.mjs:113`; `tests/cloud-save.test.mjs:405-411`; [LOCAL-COMMANDS §2](LOCAL-COMMANDS.md#2-files-in-the-pr)) | [cmd] `npm run preview -- --dry-run` exit 0 at `8afbabc` |

The delta from v0.5.1 to `b527dc3` covers 127 commits (115 non-merge)
[61 and 56 at `8afbabc`]. Of the 83 allowlisted runtime files, 76 changed: 64
added and 12 modified, +6,947/−371 lines [73: 61 added and 12 modified,
+6,228/−356]. Outside the runtime, the release-relevant changes are unchanged
since `8afbabc`: `server/account-api.mjs` (+13/−7 lines), the two migrations
(+103 and +106, both new files), `tools/deploy.mjs` (+120/−10) and `ci.yml`
(+2/−2) ([cmd] `git rev-list --count`,
`git diff --shortstat/--name-status/--numstat v0.5.1 b527dc3`, with the
allowlist read at each commit).

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
  `b527dc3`, so Q1 adds no copy of the version).
- Command: `npm version 0.6.0 --no-git-tag-version`, committed in the release
  PR. Tag `v0.6.0` the exact merged commit after CI passes.
- Optional: the hard-coded `enabledFeatures` in `tools/build.mjs:40-41` still
  lists only the v0.5 features. Add `wx01`, `campaign`, `fire-mountain-activity`,
  `journey-v3-backup` and `local-commands` so the public manifest describes the release. This
  changes `release.json` but no hashes.

## 4. Release gates and their status

| # | Gate (source) | Status at `8afbabc`, unchanged at `b527dc3` unless noted | Plan step |
| --- | --- | --- | --- |
| G1 | Hosted v2/v3 migrations applied and verified before the flags are enabled ([HANDOVER.md:513-517](HANDOVER.md); migration headers `20260922210000…sql:1-2`, `20260923000000…sql:1-2`) | Not applied ([HANDOVER.md:790-791](HANDOVER.md)) | B3 |
| G2 | Client and Worker roll out together; live v0.5.1 rejects the new fields ([HANDOVER.md:577-580](HANDOVER.md)) | Assets and Worker are **one apex Worker version** (`wrangler.jsonc:4`, `:10-16`), so they roll out atomically. The flags are **not declared** in `wrangler.jsonc:18-22` | A3, C1 |
| G3 | Coherent hashed/versioned module graph ([HANDOVER.md:517-518](HANDOVER.md); [ROADMAP.md:266-267](../ROADMAP.md)) | Not implemented: the build copies files under their source names (`tools/build.mjs:44-47`) and one `Cache-Control: public, max-age=0, must-revalidate` covers everything (`hosting/_headers:7`) | A2 |
| G4 | Hosted proof that the publishable-key binding survives `--keep-vars` ([HOSTING.md:71-81](HOSTING.md)) | Stub tests only | C1 verify |
| G5 | Hosted acceptance of old and new backups ([HANDOVER.md:519](HANDOVER.md), `:578-580`) | `tools/live-account-check.mjs:83` exercises `/api/v1` only | A4, B4, C3 |
| G6 | Transfer-size optimization before a hosted rollout ([HANDOVER.md:901](HANDOVER.md)); first screen ≤ 1.5 MiB ([CONTENT-RELEASE-PIPELINE.md:63](CONTENT-RELEASE-PIPELINE.md)) | First screen measured at **6.98 MiB** at `8afbabc`; **6.99 MiB** at `b527dc3`, recomputed statically for Q1's three modules (§9) | A1 |
| G7 | Exact-source CI before deploy ([HOSTING.md:42-43](HOSTING.md)) | CI exists; it has no browser job (`.github/workflows/ci.yml:19-62`) | A6, B1 |
| G8 | Q0 open items: physical devices, real-Safari blur, short portrait windows, owner layout review ([HANDOVER.md:79-85](HANDOVER.md)) | Open | B0 (owner accepts or defers) |
| G9 | Q1 release rules ([LOCAL-COMMANDS §11](LOCAL-COMMANDS.md#11-profile-field-and-migration-impact), §15 decision 3): Q1 ships in this first public v5 release; the candidate and every later deploy or rollback target contains the fence `7a7d03e` or is not a v5 build; `npm run test:commands` passes in Chromium and WebKit | New at `b527dc3`. Q1 is in the candidate (`git merge-base --is-ancestor 7a7d03e b527dc3` exits 0). `test:commands` last passed 13/13 groups per engine at `38fa64f` ([VALIDATION](VALIDATION.md#q1-third-pre-merge-review-fixes--2026-10-11)); not re-run at `b527dc3`. The owner's review of the Q1 contract is open (§12) | A8, B0, B1, C1 |

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
browser suites in Chromium and WebKit. The owner reviews the art at 390 px and
on desktop.
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
Phase A has no hosted access. Nine smokes also import runtime modules inside
the page (`page.evaluate`) by their path at the site root. Each opens the page
at `GAME_URL`'s root, so a relative `./engine.mjs` resolves to `/engine.mjs`
([cmd] `grep -n "import('[./]" tools/*.mjs`: 16 sites; `tools/` is unchanged
since `b527dc3`):
- `/profile-fence.mjs`: Q1's `tools/command-smoke.mjs:258`, `:291`, `:294`,
  `:339`, `:340`, `:386` and `:390`, and `tools/account-smoke.mjs:280`;
- `./engine.mjs`: `tools/journey-smoke.mjs:70`, `tools/navigation-smoke.mjs:80`,
  `tools/immersion-smoke.mjs:106`, `tools/stories-smoke.mjs:105` and
  `tools/expansion-smoke.mjs:77`;
- `./collection.mjs` and `./profile-store.mjs`:
  `tools/wx01-presentation-smoke.mjs:172` and
  `tools/collection-display-smoke.mjs:248-249`.

After the move to `r/<hash>/` those paths no longer exist, so A2 must either
keep them resolvable or point every one of them at the current `r/<hash>/`;
re-run the grep to find them. `journey-smoke.mjs` matters most: C2 runs it
against production, where its 404 would look like a failed deploy. Afterwards
`test:browser` (which includes C2's `smoke.mjs` and `journey-smoke.mjs`),
`test:commands`, `test:expansion` and the other §10 step 3 suites must pass
against that preview.
*Rollback:* `git revert`. The owner may instead waive G3 in writing for this
release and accept the mixed-load risk.

**A3 · Flags in source control (gate G2).** Add `"JOURNEY_V3_ENABLED": "true"`
and `"JOURNEY_V2_ENABLED": "false"` to `wrangler.jsonc` `vars`.
**Recommendation: keep v2 off, and declare it explicitly.** No public client
ever wrote v2: the current client uploads only `SNAPSHOT_VERSION` 3 (`account-client.mjs:222`, `cloud-save.mjs:9`), and the
v2 table does not exist on the hosted database until B3, after which it is
empty (per [HANDOVER.md:790-791](HANDOVER.md); not re-queried). Enabling v2 would only add a
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
disposable loopback database (CI does this, `ci.yml:46`).
*Rollback:* `git revert`.

**A5 · Cross-version save guards (recommended; the owner may accept the risk
instead, §12).** Two cases in §6 hide progress without deleting it. (a)
*Local:* when profile-store migrates a legacy key into v5, record the source
key and its fingerprint under a **separate** localStorage key, so the v5 profile
and cloud snapshot formats stay unchanged. If that legacy key changes later
(a `storage` event, or a fingerprint mismatch on load), offer recovery or
export instead of ignoring it. (b) *Cloud:* make `readCloud`
(`account-client.mjs:116-129`) also read the older enabled namespaces when the
v3 backup is not empty, compare `updatedAt`, and offer a newer legacy backup
for restore. That costs one more GET per sign-in. Both changes stay inside
existing modules, so no new runtime file is needed.
*Verify:* unit tests for both cases, then the browser suites.
*Rollback:* `git revert`.

**A6 · Browser CI and payload budget (gate G7).** See §10.

**A7 · Version and docs.** Bump to 0.6.0 (§3). Correct stale counts: HOSTING
still says "19 runtime files" (`docs/HOSTING.md:13`). Draft release notes. They
must tell players to reload every open tab after the release (§6).

**A8 · Local release-candidate checks**, on `main` after PR #10 plus the
release PR, never on `8afbabc` or another pre-fence commit (§1).
`git merge-base --is-ancestor 7a7d03e HEAD` (exit 0: the fence is in the
candidate) · `npm test` · `python3 -m unittest
discover -s tests -p '*_test.py'` · `npm run audit:content` (Q4's content
audit, no findings) · `npm run build` · `npm run preview --
--dry-run` · `GAME_URL=… npm run test:browser` · `GAME_URL=… npm run
test:commands` (Q1, Chromium and WebKit: `test:browser` does not run
`tools/command-smoke.mjs`, whose B2–B11 are the only browser checks of the
fence's edge cases and the only WebKit checks of the command path;
[LOCAL-COMMANDS §11](LOCAL-COMMANDS.md#11-profile-field-and-migration-impact))
· the other WebKit suites (§10 step 3) ·
`bash tools/test-backup-sql.sh` (disposable loopback database only). Serve the
browser suites from a server started after checkout: `tools/serve.py` reads
the allowlist once at startup, so an older server returns 404 for Q1's
modules ([HANDOVER.md:237-239](HANDOVER.md)).
*Verify:* every command exits 0. Record the results in [VALIDATION.md](VALIDATION.md).

### Phase B · Owner gate and hosted database

**B0 · OWNER · Decisions** (§12): scope, the Q0 open items, art derivative
approval, whether G3 can be waived, the v2 flag, the B3 backup method, the
apex Worker's CPU limit (§6), either the A5 guards or a written acceptance
of the §6 open-tab and hidden-backup cases, and the Q1 contract with its
forward-only rule (G9, §12 item 12). Staging was decided in A0.

**B1 · CI then OWNER · Exact source.** Open the release PR. CI must pass on the
final commit, including the new browser job. Merge, tag `v0.6.0` on the merged
commit and push the tag (owner).
*Verify:* the CI run URL is recorded and `git rev-parse v0.6.0` equals the CI
commit. `git merge-base --is-ancestor 7a7d03e v0.6.0` exits 0, so the tag
contains Q1's fence (G9).
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
not block it (§6). Never roll back, or deploy, to any Worker version built from
a v5 commit that lacks `7a7d03e`; after players have committed commands, the
way back below Q1 is a forward fix (§6, §8).
**UNVERIFIED:** whether a Cloudflare rollback also restores that version's
secrets. The key value has not changed
since v0.5.1, so either behaviour binds the same key.

**C2 · OWNER · Production browser smoke.** With `GAME_URL=https://mythseal.com`,
run `node tools/smoke.mjs` ([HOSTING.md:102](HOSTING.md)) and `node
tools/journey-smoke.mjs`. **Only these two run against production.** The
navigation suite and 16 other smoke scripts, Q1's `tools/command-smoke.mjs`
among them, throw on a non-loopback URL
(`tools/navigation-smoke.mjs:13`: "Navigation smoke requires a loopback game
server."; [cmd] grep of `tools/*smoke*.mjs` at `b527dc3`, §13). That error would look like a
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
and uploads it as v3. A physical cross-device restore, open since v0.5.1
([ACCOUNTS.md:147-151](ACCOUNTS.md)), is recommended.
*Rollback:* as in C1. Synthetic data is cleaned up by the checker.

**C4 · OWNER · Watch for 24–72 h.** Watch the Cloudflare Worker metrics for
`/api/*` 5xx, 426 and 429 responses, the Supabase API logs and the database
size (§6). A JSON 503 `cloud_unavailable` points at a missing RPC or a
provider error (`server/account-api.mjs:240-245`). **A CPU-limit failure
looks different:** Cloudflare error **1102**, a non-JSON 503 (the checker
already classifies it, `tools/live-account-check.mjs:88`), plus `exceededCpu`
outcomes in the Worker's logs (outcome name not re-checked here). Players who
report "progress gone" most likely had a v0.5.1 tab open across the deploy
(§6). Tell them to reload every open tab and export from the footer. If V3
must be turned off, follow §8 "Flag only": deploy an explicit `"false"`.
Deleting the key keeps `true` (A3).

**C5 · AGENT · Record.** Add a v0.6.0 record to [HOSTING.md](HOSTING.md) and
[VALIDATION.md](VALIDATION.md) (source SHA and tag, both Worker version IDs, CI
link, check receipts, what was not verified), and update the
[HANDOVER.md](HANDOVER.md) baseline.

## 6. Data safety

- **No staging today.** `mythseal-dev` holds real accounts and backups
  ([HANDOVER.md:599](HANDOVER.md); [supabase/README.md:7](../supabase/README.md)).
  `npm run preview` is **not** isolated: its config names the hosted project
  (`hosting/wrangler.preview.jsonc:20`; [HANDOVER.md:751-753](HANDOVER.md)).
  Docker is unavailable, so a local Supabase stack is not an option either
  ([CONNECTIONS.md:84](CONNECTIONS.md)).
- **Migrations only add objects.** v2/v3 create new tables and RPCs and leave
  v1 rows, revisions and RPCs alone (migration line 1). The v1 hosted fixture is
  rollback-safe ([supabase/tests/private_journey_backups.sql:1-2](../supabase/tests/private_journey_backups.sql)).
  The v2/v3 fixtures must never touch the hosted database (their line 1), hence
  the read-only probe in A4(b).
- **Local saves move forward one way, and a client rollback is not
  save-neutral.** The new client writes `shanhai.profile.v5` and leaves
  `shanhai.profile.v3` in place (`profile-store.mjs:71-92`). If the apex rolls
  back to v0.5.1, its client reads the **stale** v3 key: progress made under
  v0.6.0 disappears from view (it is not deleted). Anything played during the
  rollback lands in v3, and after a later roll-forward v5 wins, orphaning those
  rollback-window changes (`progression.mjs:24`; v0.5.1 `progression.mjs:16`).
  So prefer fixing forward. If a rollback is unavoidable, keep it short and
  tell players to export from the footer before and after.
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
- **A rollback to the recorded v0.5.1 versions is not affected by Q1.** v0.5.1
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
  (`profile-store.mjs:78-80`) and validates the ledger again
  (`progression.mjs:250`), so committed commands and receipts come back
  unchanged. The ledger never enters a cloud backup (`cloud-save.mjs:177-192`),
  so Q1 adds nothing to the cloud cases below. Q1 therefore changes nothing in
  a rollback to v0.5.1. The stale-v3 and orphaned-rollback-window cases above
  are unchanged.
- **The forward deploy also strands progress made in v0.5.1 tabs left open.**
  An open v0.5.1 tab keeps writing `shanhai.profile.v3` and listens only for
  that key (`git show v0.5.1:app.mjs` line 503). As soon as any v0.6.0 tab or
  reload migrates v3 to v5, `load()` reads v5 first and never looks at v3
  again (`profile-store.mjs:78-80`). Everything played afterwards in the old
  tab disappears from view on its next reload. It is not deleted: the recovery
  screen's export still includes the v3 key (`bootstrap.mjs:16`). After A1,
  those tabs also get 404s for the removed PNGs. The release notes (A7) and C4
  tell players to reload every open tab. A5(a) adds a guard in code.
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
| C1 apex deploy | `wrangler rollback <apex version recorded before C1> --config wrangler.jsonc` (expected `f254ef87-…`, v0.5.1: profile v3, so allowed by Q1's rule) | Local saves diverge in the rollback window (§6). Cloud rows are kept, but a newer v1 upload made in the window is hidden behind an older v3 row after a roll-forward (§6). The v5 save, its `commands` ledger and the fence record are left untouched and return on roll-forward (§6) |
| Any later deploy or rollback after v0.6.0 | Only to v0.5.1 or to a version built from a commit that contains `7a7d03e` (`git merge-base --is-ancestor 7a7d03e <commit>`). For a problem in Q1 itself, fix forward | A pre-Q1 v5 build cannot open a save with a ledger, and a pre-fence v5 build can lose writes (§6) |
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
39 JS modules (`app.mjs:1-34`), the same 19 stylesheets, `index.html`,
`mark.svg` and the same two PNGs. The text figures were recomputed without a
browser ([cmd] scratch Node script, exit 0: `index.html`, its stylesheets,
`mark.svg` and every module reachable from `bootstrap.mjs`, each compressed
with `node:zlib` gzip level 6 and brotli quality 11). Run at `8afbabc`, the
same script gives exactly the 57 text files and byte counts of the browser
measurement. No browser measured `b527dc3`. Figures at `8afbabc` are in
brackets.

| | Raw | gzip -6 | brotli q11 |
| --- | --- | --- | --- |
| Text: 60 files [57] | 970,661 B [929,264] | 282,691 B [267,540] | 240,926 B [228,341] |
| Images (2 PNG) | 7,085,957 B | (no gain) | (no gain) |
| **First screen** | **8,056,618 B** [8,015,221] | **7,368,648 B (7.03 MiB)** [7,353,497, 7.01 MiB] | **7,326,883 B (6.99 MiB)** [7,314,298, 6.98 MiB] |
| Budget ([CONTENT-RELEASE-PIPELINE.md:63](CONTENT-RELEASE-PIPELINE.md)) | | **1,572,864 B (1.5 MiB)** | |

The first screen is about **4.7× over budget**, and 96–97% of it is two PNGs.
Q1 adds 41,397 B raw and 12,585–15,151 B compressed.
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
| **First screen (text br–gz + images), `b527dc3`** | 6.99–7.03 MiB | **1,190,530–1,232,295 B (1.14–1.18 MiB) ✓** | **1,078,454–1,120,219 B (1.03–1.07 MiB) ✓** |
| First screen at `8afbabc` | 6.98–7.01 MiB | 1,177,945–1,217,144 B (1.12–1.16 MiB) | 1,065,869–1,105,068 B (1.02–1.05 MiB) |

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
scenario A at about **1,795,548–1,837,313 B at `b527dc3`** (1,782,963–1,822,162
B at `8afbabc`), **over the 1,572,864 B budget**.
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
**5-minute** job, with **no** browser suite (`.github/workflows/ci.yml:19-62`).

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
   `test:battle-table`, `test:viewport`, `test:wx01`, `test:inheritance`,
   `test:collection-display`, `test:expansion`, `test:map-piece`.
4. Turn the first-screen measurement in §9 into `tools/payload-budget.mjs` and
   fail the job above 1.5 MiB (text counted at brotli or gzip size). Measure a
   first-visit guest **and** a returning player whose deck includes a welcome
   card (§9), unless the owner has limited the budget to first visits.
5. Upload `test-results/` **on failure only**, keeping it 7 days. The suites use
   synthetic profiles and intercepted account APIs, with no secrets.

Measured locally at `8afbabc` ([cmd] `GAME_URL=http://127.0.0.1:4290 npm run test:browser`,
installed Chrome, 2026-10-11): all 14 Chromium suites passed in **4 min 56 s**
wall time. Not re-timed at `b527dc3`. The WebKit suites, `test:commands`
included, were not timed. Expect very roughly 10–15 runner
minutes per run including browser installation (an estimate, not a
measurement). Runner time will differ, and private-repository Actions minutes
count against the plan quota ([BACKEND-STACK.md:50](BACKEND-STACK.md); **UNVERIFIED:** the current
quota). Linux WebKit is **not** Safari and none of this is physical-device
evidence ([HANDOVER.md:79-83](HANDOVER.md)).

## 11. Go / no-go

**GO requires all of the following before C1:**

1. Exact-source CI is green on the `v0.6.0` commit, including the browser job.
2. A8 passes locally: Node, Python, the content audit, build, preview dry run,
   Chromium and WebKit suites including `test:commands` in both engines, SQL
   harness.
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
7. The owner has signed off on the Q0 open items (G8) and the derivative art.
8. Either the A5 guards ship, or the owner has accepted the open-tab and
   hidden-backup cases (§6) in writing. Either way, the "reload every open tab"
   notice is ready.
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
that is a v5 build without `7a7d03e` (§6); `test:commands` failing in either
engine; or a near-limit or byte-cap v3 PUT or GET that fails in a real Worker
(CPU or time). Without S1, that last trigger
can fire only in C3, after release. In that case, lowering the v3 limit is a
schema and validator change. Turning V3 off (an explicit `"false"`, §8)
disables cloud upload for new clients, so the owner decides.

## 12. Owner decisions needed

1. Go/no-go on scope, including the Q0 items still open (G8).
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
   hidden-backup cases (§6).
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
      lock (`app.mjs:53`, `:129-135`; reached from `account-client.mjs:255`
      and `app.mjs:996`). They therefore refuse in a browser with Web Locks but
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
    - The owner also accepts the forward-only rule (§6): after release, deploy
      or roll back the apex only to v0.5.1 or to a version that contains
      `7a7d03e`, and fix a problem in Q1 forward.

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
