# Next release plan · v0.6.0 (proposed)

**Status: plan only.** Written 2026-10-11 from `main` **`8afbabc`** on branch
`docs/release-next-plan`. Nothing in this document has been deployed, migrated
or provisioned. The last recorded public release is still **v0.5.1**
([HOSTING.md](HOSTING.md)). This plan creates no hosted resource and grants no
new authority: every step marked **OWNER** needs the owner's own decision and
credentials.

Evidence labels: `path:line` points at the source at `8afbabc`; **[cmd]** is a
command run for this plan on 2026-10-11 (exit code given); **UNVERIFIED** marks
anything not checked here. The only network calls made were unauthenticated
`GET https://mythseal.com/release.json` and `GET https://mythseal.com/api/v1/account`.

Step markers: **AGENT** = repo change any agent can make and check locally, with
no hosted access. **CI** = GitHub Actions on the exact commit. **OWNER** =
touches hosted services, real player data, credentials, DNS or billing.

## 1. Goal and scope

**Goal.** Publish the game that is on `main` today as **v0.6.0**, while keeping
every existing account, v1 cloud backup and local save intact. A player who
loads the new client must still be able to back up their journey to the cloud.

**In scope**

- Everything merged since v0.5.1: the five-place lobby and viewport navigation,
  WX-01 (15 new 西遊 characters, 29 printings, packs, boxes, 西行印 choices),
  six campaign volumes (66 encounters) and the 火焰山三連戰 activity,
  same-character inheritance, character stacks and the ink codex, Mist Gate
  immersion, the battle resource/clash presentation, story maps, the map piece,
  and the Q0 對局 table (PR #5) ([HANDOVER.md:12-17](HANDOVER.md), `:40-80`,
  `:259-356`).
- Journey **v3** cloud backup (profile v5) on the hosted database and Worker.
- The release gates that [HANDOVER.md](HANDOVER.md) already sets: hosted v2/v3
  migrations, Worker/client flags, a coherent versioned module graph,
  binding-retention proof and smaller image transfers (§4).

**Out of scope:** the LZ-01/HL-01 literary previews and atelier/playtest pages
(they stay in `hosting/preview-assets.json`), an authoritative economy, native
apps, NFTs, paid upgrades, SMTP/Resend changes and redirect-Worker code changes.
`hosting/www.mjs` and `wrangler.www.jsonc` are unchanged since v0.5.1
([cmd] `git diff --stat v0.5.1 origin/main -- hosting/www.mjs wrangler.www.jsonc`
prints nothing).

## 2. What is live and what main adds

Live values come from [cmd] `curl` at **2026-10-11 08:35:12 UTC** (both HTTP 200,
exit 0). Main values come from [cmd] `npm run build` (exit 0) at `8afbabc`.

| Item | Live (mythseal.com) | `main` 8afbabc | Evidence |
| --- | --- | --- | --- |
| `clientVersion` / commit | `0.5.1` / `ea48558` | `0.5.1` (not bumped yet) / `8afbabc` | live `release.json`; `dist/release.json` |
| Public files | 19 files, **11,130,757 B** | 80 files, **74,347,757 B** (70.90 MiB) | both manifests |
| Manifest SHA-256 | `7c18fceb…6e88` | `98028a3a…54db` | build output |
| Of which PNG | 3 files, 10,838,776 B | **23 files, 73,418,493 B** | `dist/release.json` |
| Account API | `{"authenticated":false,"user":null,"emailEnabled":true}`: no `journeyVersions` field, so the v1-only Worker | `/api/v2` and `/api/v3` routes behind `JOURNEY_V2_ENABLED` / `JOURNEY_V3_ENABLED`; `journeyVersions` in every account reply | live probe; `server/account-api.mjs:8-16`, `:123-125`, `:173`; v0.5.1 routes: `git show v0.5.1:server/account-api.mjs` lines 7-12 |
| Local save key | `shanhai.profile.v3` | `shanhai.profile.v5`; reads v4/v3/v2 sources and leaves them in place | `git show v0.5.1:progression.mjs:16`; `progression.mjs:23`; `profile-store.mjs:9-13`, `:54-75` |
| Cloud snapshot | v1: 512 KiB, 2,000 copies | v3: 4 MiB, 10,000 copies; v1 is still accepted | `cloud-save.mjs:9-13`; `server/account-api.mjs:5-6` |
| Hosted migrations | `20260921210000`, `20260921210100` applied | plus `20260922210000` (v2) and `20260923000000` (v3), **not applied** | [HANDOVER.md:580-584](HANDOVER.md); [ACCOUNTS.md:12](ACCOUNTS.md) |
| Deploy helper | v0.5.1's tracked `tools/deploy.mjs` was 14 lines, with no identity, secret or `--keep-vars` checks | Hosted preflight plus `--keep-vars` (`tools/deploy.mjs:63-84`, `:93-97`). It has only stub-test evidence | [cmd] `git show v0.5.1:tools/deploy.mjs` |
| Worker bundle | (unknown) | `Total Upload: 906.25 KiB / gzip: 188.52 KiB` | [cmd] `npm run preview -- --dry-run` exit 0 |

The delta covers 61 commits (56 non-merge). Of the allowlisted runtime files,
73 changed: 61 added and 12 modified, +6,228/−356 lines. Outside the runtime,
the release-relevant changes are `server/account-api.mjs` (+20 lines), the two
migrations, `tools/deploy.mjs` (+130) and `ci.yml`
([cmd] `git rev-list --count`, `git diff --shortstat/--name-status v0.5.1 origin/main`).

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
  stub `tests/deploy.test.mjs:6`, which needs no change).
- Command: `npm version 0.6.0 --no-git-tag-version`, committed in the release
  PR. Tag `v0.6.0` the exact merged commit after CI passes.
- Optional: the hard-coded `enabledFeatures` in `tools/build.mjs:40-41` still
  lists only the v0.5 features. Add `wx01`, `campaign`, `fire-mountain-activity`
  and `journey-v3-backup` so the public manifest describes the release. This
  changes `release.json` but no hashes.

## 4. Release gates and their status

| # | Gate (source) | Status at `8afbabc` | Plan step |
| --- | --- | --- | --- |
| G1 | Hosted v2/v3 migrations applied and verified before the flags are enabled ([HANDOVER.md:307-311](HANDOVER.md); migration headers `20260922210000…sql:1-2`, `20260923000000…sql:1-2`) | Not applied ([HANDOVER.md:583-584](HANDOVER.md)) | B3 |
| G2 | Client and Worker roll out together; live v0.5.1 rejects the new fields ([HANDOVER.md:371-374](HANDOVER.md)) | Assets and Worker are **one apex Worker version** (`wrangler.jsonc:4`, `:10-16`), so they roll out atomically. The flags are **not declared** in `wrangler.jsonc:18-22` | A3, C1 |
| G3 | Coherent hashed/versioned module graph ([HANDOVER.md:311-312](HANDOVER.md); [ROADMAP.md:228-229](../ROADMAP.md)) | Not implemented: the build copies files under their source names (`tools/build.mjs:44-47`) and one `Cache-Control: public, max-age=0, must-revalidate` covers everything (`hosting/_headers:7`) | A2 |
| G4 | Hosted proof that the publishable-key binding survives `--keep-vars` ([HOSTING.md:71-81](HOSTING.md)) | Stub tests only | C1 verify |
| G5 | Hosted acceptance of old and new backups ([HANDOVER.md:313](HANDOVER.md), `:372-374`) | `tools/live-account-check.mjs:83` exercises `/api/v1` only | A4, B4, C3 |
| G6 | Transfer-size optimization before a hosted rollout ([HANDOVER.md:673](HANDOVER.md)); first screen ≤ 1.5 MiB ([CONTENT-RELEASE-PIPELINE.md:63](CONTENT-RELEASE-PIPELINE.md)) | First screen measured at **6.98 MiB** (§9) | A1 |
| G7 | Exact-source CI before deploy ([HOSTING.md:42-43](HOSTING.md)) | CI exists; it has no browser job (`.github/workflows/ci.yml:19-62`) | A5, B1 |
| G8 | Q0 open items: physical devices, real-Safari blur, short portrait windows, owner layout review ([HANDOVER.md:74-80](HANDOVER.md)) | Open | B0 (owner accepts or defers) |

## 5. Ordered checklist

Each step gives the action, then how to verify it, then how to roll it back.
Do not start a step until the previous step's verification has passed.

### Phase A · Build the release candidate (AGENT, no hosted access)

**A1 · Asset derivatives (gate G6).** Implement `tools/assets/build.mjs` as
specified in §9. Point the CSS `url()`s and JS asset strings at the WebP
derivatives, swap PNG→WebP in `hosting/public-assets.json` and update
`tests/hosting.test.mjs`. Original PNGs stay in Git and drop out of the public
allowlist.
*Verify:* `npm test`, `npm run build`, the first-screen budget check (A5), and
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
directories remove it and make repeat visits cheap.
*Verify:* hosting tests assert that `index.html` references only the current
`r/<hash>`, that every `release.json` path exists, and that no `.mjs` under
`dist/` sits outside `r/`. Run the browser suites against `dist` served by
`npm run preview` (loopback).
*Rollback:* `git revert`. The owner may instead waive G3 in writing for this
release and accept the mixed-load risk.

**A3 · Flags in source control (gate G2).** Add `"JOURNEY_V3_ENABLED": "true"`
to `wrangler.jsonc` `vars`. **Recommendation: leave `JOURNEY_V2_ENABLED`
absent.** No public client ever wrote v2: the current client uploads only
`SNAPSHOT_VERSION` 3 (`account-client.mjs:221`, `cloud-save.mjs:9`), and the
v2 table does not exist on the hosted database until B3, after which it is
empty (per [HANDOVER.md:583-584](HANDOVER.md); not re-queried). Enabling v2 would only add a
fallback read per sign-in (`account-client.mjs:115-128`). The `[1,3]`
combination is already covered by tests (`tests/account-api.test.mjs:344`,
`tests/account-client.test.mjs:53`, `:73`). Then extend
`tools/verify-hosting.mjs:35-38` to assert that the anonymous
`/api/v1/account` reply carries `journeyVersions` equal to the configured set.
*Verify:* `npm test`. `npm run preview -- --dry-run` lists the new variable.
*Rollback:* `git revert`. **This commit must not be deployed before B3 and B4
pass.** A flag that points at a missing RPC returns 503 to signed-in players
(`server/account-api.mjs:240-245`).

**A4 · Hosted-check tooling, code only (gate G5).** (a) Extend
`tools/live-account-check.mjs` with a v3 path covering: a v1 backup restored by
the new client, v3 upload, `PT409` conflict, tombstone and stale-recreate on
v3, and a near-limit v3 boundary of about 9,999 copies. (b) Add a **read-only**
catalog probe SQL file. It contains only the privilege and RLS assertions from
the first `do $$` block of `supabase/tests/wx01_journey_v2.sql` and
`supabase/tests/campaign_journey_v3.sql`, plus `select count(*)` of the new
tables, with no inserts and no role switching. (The full v2/v3 fixtures must
never run against the hosted database: `supabase/tests/campaign_journey_v3.sql:1-2`.)
(c) Prepare, but do not run, a reviewed down-migration that drops the v3/v2
RPCs and tables, guarded by "tables are empty".
*Verify:* unit tests against stubs; `bash tools/test-backup-sql.sh` on a
disposable loopback database (CI does this, `ci.yml:46`).
*Rollback:* `git revert`.

**A5 · Browser CI and payload budget (gate G7).** See §10.

**A6 · Version and docs.** Bump to 0.6.0 (§3). Correct stale counts: HOSTING
still says "19 runtime files" (`docs/HOSTING.md:13`). Draft release notes.

**A7 · Local release-candidate checks.** `npm test` · `python3 -m unittest
discover -s tests -p '*_test.py'` · `npm run build` · `npm run preview --
--dry-run` · `GAME_URL=… npm run test:browser` · the WebKit suites ·
`bash tools/test-backup-sql.sh` (disposable loopback database only).
*Verify:* every command exits 0. Record the results in [VALIDATION.md](VALIDATION.md).

### Phase B · Owner gate and hosted database

**B0 · OWNER · Decisions** (§12): scope, the Q0 open items, art derivative
approval, whether G3 can be waived, the staging option (§7) and the v2 flag.

**B1 · CI then OWNER · Exact source.** Open the release PR. CI must pass on the
final commit, including the new browser job. Merge, tag `v0.6.0` on the merged
commit and push the tag (owner).
*Verify:* the CI run URL is recorded and `git rev-parse v0.6.0` equals the CI
commit.
*Rollback:* delete the unpublished tag. Nothing is deployed yet.

**B2 · OWNER · Staging rehearsal (recommended).** Run B3–C3 against the staging
pair from §7 using the same tag. If no staging exists, record an explicit
acceptance of the risk and continue.

**B3 · OWNER · Apply the v2+v3 migrations to `mythseal-dev` (real players).**

1. Confirm the target: `supabase/.temp/project-ref` must be
   `puiuevggytoxyyearkcq` ([supabase/README.md:5](../supabase/README.md)).
   Run `npx --no-install supabase migration list --linked`. Expect remote
   `20260921210000` and `20260921210100`, and **local-only** `20260922210000`
   and `20260923000000`. Stop on any other difference.
2. Back up: run `npx --no-install supabase db dump --linked --schema
   private_backup,public -f <path outside Git>` (schema only). A data dump
   contains player emails, so take one only if the owner wants it: encrypt it,
   keep it out of Git and delete it after a set period. **UNVERIFIED:** whether
   the Free plan includes provider-side backups or point-in-time recovery.
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
calls only the v1 RPCs. If removal is required, run the reviewed
down-migration while both tables are empty. Never `db reset` and never
re-provision ([supabase/README.md:11](../supabase/README.md)).

**B4 · OWNER · Pre-deploy synthetic check.** With elevated credentials held
only in process memory, as in previous releases, run the extended checker in
`local` mode (local handler → hosted Supabase, `JOURNEY_V3_ENABLED=true`) with
`MYTHSEAL_ACCOUNT_CHECK_BOUNDARY=true`. This writes and deletes synthetic users
in the real-player project, following the v0.5.0/v0.5.1 precedent
([HOSTING.md:124](HOSTING.md), `:144`). It sends no email.
*Verify:* all checks pass and cleanup reports **zero** fixtures. The receipt
goes to ignored `test-results/`.
*Rollback:* the checker's own cleanup. If it fails, the owner deletes the
`@example.invalid` fixture users in the dashboard.

### Phase C · Deploy and verify

**C1 · OWNER · Deploy.** In a **clean checkout of tag `v0.6.0`**: run `npm ci
&& npm test && npm run deploy -- --dry-run`, then `npm run deploy`. The helper
checks identity, account `cf4198e6…`, the existing `SUPABASE_PUBLISHABLE_KEY`
metadata, both bundles and the commit, then deploys the apex Worker and the
unchanged redirect Worker (`tools/deploy.mjs:63-114`). After an ambiguous
failure, never rerun the helper blindly; inspect the provider state and retry
only the unresolved Worker ([HOSTING.md:90-94](HOSTING.md)).
*Verify, immediately:* (1) `npm run verify:hosting` from the same checkout
checks the manifest and commit, every asset hash, the headers and MIME type,
the 13 private paths returning 404, both redirects, the anonymous account
reply and CSRF rejection (`tools/verify-hosting.mjs`). (2) The anonymous
account reply has `emailEnabled: true` and `journeyVersions: [1,3]`.
(3) `npx --no-install wrangler secret list --config wrangler.jsonc` still
lists `SUPABASE_PUBLISHABLE_KEY`. This is the first hosted proof of
`--keep-vars` retention (G4). (4) `wrangler deployments list --config
wrangler.jsonc` shows the message `Mythseal 0.6.0 <sha>`.
*Rollback:* `npx --no-install wrangler rollback f254ef87-286c-4960-9888-4986b1a34f5b
--config wrangler.jsonc` (the v0.5.1 apex, [HOSTING.md:117](HOSTING.md)). The
redirect Worker's previous version is `c14a675f-3474-4d66-a341-5fa0d388108e`
([HOSTING.md:119](HOSTING.md)), though rolling it back changes nothing in
behaviour. Read §6 before rolling back. **UNVERIFIED:** whether a Cloudflare
rollback also restores that version's secrets. The key value has not changed
since v0.5.1, so either behaviour binds the same key.

**C2 · OWNER · Production browser smoke.** `GAME_URL=https://mythseal.com node
tools/smoke.mjs` ([HOSTING.md:102](HOSTING.md)), plus the navigation and
journey suites. They use isolated browser contexts and fixture APIs, and make
no account writes.
*Verify:* no page or network errors and no horizontal overflow.
*Rollback:* as in C1.

**C3 · OWNER · Real-account checks.** Run the extended checker in `hosted` mode
through the deployed Worker (`tools/live-account-check.mjs:51`, `:84`): v1
restore → v3 upload, conflicts, tombstone and the near-limit v3 boundary, with
cleanup at zero. Then the owner signs in through the mailbox in a public
browser, restores their own v1 backup into a **fresh browser profile**, and
uploads it as v3. A physical cross-device restore, open since v0.5.1
([ACCOUNTS.md:147-151](ACCOUNTS.md)), is recommended.
*Rollback:* as in C1. Synthetic data is cleaned up by the checker.

**C4 · OWNER · Watch for 24–72 h.** Watch the Cloudflare Worker metrics for
`/api/*` 5xx, 426 and 429 responses, the Supabase API logs and the database
size (§6). A spike in 503 `cloud_unavailable` responses points at a missing RPC
or the CPU limit.

**C5 · AGENT · Record.** Add a v0.6.0 record to [HOSTING.md](HOSTING.md) and
[VALIDATION.md](VALIDATION.md) (source SHA and tag, both Worker version IDs, CI
link, check receipts, what was not verified), and update the
[HANDOVER.md](HANDOVER.md) baseline.

## 6. Data safety

- **No staging today.** `mythseal-dev` holds real accounts and backups
  ([HANDOVER.md:393](HANDOVER.md); [supabase/README.md:7](../supabase/README.md)).
  `npm run preview` is **not** isolated: its config names the hosted project
  (`hosting/wrangler.preview.jsonc:20`; [HANDOVER.md:545-547](HANDOVER.md)).
  Docker is unavailable, so a local Supabase stack is not an option either
  ([CONNECTIONS.md:84](CONNECTIONS.md)).
- **Migrations only add objects.** v2/v3 create new tables and RPCs and leave
  v1 rows, revisions and RPCs alone (migration line 1). The v1 hosted fixture is
  rollback-safe ([supabase/tests/private_journey_backups.sql:1-2](../supabase/tests/private_journey_backups.sql)).
  The v2/v3 fixtures must never touch the hosted database (their line 1), hence
  the read-only probe in A4(b).
- **Local saves move forward one way, and a client rollback is not
  save-neutral.** The new client writes `shanhai.profile.v5` and leaves
  `shanhai.profile.v3` in place (`profile-store.mjs:54-75`). If the apex rolls
  back to v0.5.1, its client reads the **stale** v3 key: progress made under
  v0.6.0 disappears from view (it is not deleted). Anything played during the
  rollback lands in v3, and after a later roll-forward v5 wins, orphaning those
  rollback-window changes (`progression.mjs:23`; v0.5.1 `progression.mjs:16`).
  So prefer fixing forward. If a rollback is unavoidable, keep it short and
  tell players to export from the footer before and after.
- **Cloud backups survive both directions.** v1 rows are untouched. v3 rows
  written after release remain, unread, under a rolled-back v0.5.1 Worker, and
  are readable again after a roll-forward.
- **Size and capacity.** The v3 limit is 4 MiB / 10,000 copies per account
  (`cloud-save.mjs:10-11`; v3 migration line 12). Measured locally ([cmd]
  scratch script, exit 0): a v3 snapshot is **366,232 B** at 2,000 copies and
  **1,822,050 B** at 9,999. `validateSnapshot` takes a median **28.8 ms** at
  2,000 and **120.9 ms** at 9,999 copies under Node 26 on this Mac, and the
  Worker validates both on PUT and on read-back (`server/account-api.mjs:236`,
  `:251`). **UNVERIFIED:** the Cloudflare plan's CPU limit for the apex Worker
  and the Free Supabase database-size quota. B4/C3's near-limit test is the
  real check. The only hosted large-backup evidence so far is a 2,000-copy v1
  PUT/GET at 734/178 ms wall time ([HOSTING.md:144](HOSTING.md)).
- **PII.** `auth.users` holds player emails. Keep dumps and receipts out of
  Git, encrypted and time-limited. The checkers use `@example.invalid` fixtures
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
without being able to reach the production names. Nothing here creates it.

## 8. Rollback summary

| Step | Rollback | Data effect |
| --- | --- | --- |
| A1–A7, B1 | `git revert` / delete the unpublished tag | None |
| B3 migrations | Usually none (the live Worker ignores the new objects). If needed, the reviewed down-migration while tables are empty | None for v1 |
| B4/C3 checker | The checker's cleanup, then dashboard deletion of `@example.invalid` users | Synthetic only |
| C1 apex deploy | `wrangler rollback f254ef87-… --config wrangler.jsonc` | Local saves diverge in the rollback window (§6); cloud rows kept |
| Flag only | Redeploy with `JOURNEY_V3_ENABLED` removed | New clients can restore v1 but **cannot upload** (`account-client.mjs:221`), a regression against v0.5.1 |

## 9. Payload problem and proposed derivative pipeline

**Measured first screen** ([cmd] scratch Playwright script with installed
Chrome, a fresh guest context, `dist/` served on an OS-chosen loopback port,
exit 0). At both 1440×1000 and 390×844 @3x, the lobby appeared after 243 and
115 ms locally and **59 files** loaded before it: all 36 JS modules (every
module is a static import of `app.mjs`, `app.mjs:1-31`), all 19 stylesheets
(`index.html:15-33`), `index.html`, `mark.svg`, `world-map.png` (3,146,354 B)
and `portraits.png` (3,939,603 B).

| | Raw | gzip -6 | brotli q11 |
| --- | --- | --- | --- |
| Text (57 files) | 929,264 B | 267,540 B | 228,341 B |
| Images (2 PNG) | 7,085,957 B | (no gain) | (no gain) |
| **First screen** | **8,015,221 B** | **7,353,497 B (7.01 MiB)** | **7,314,298 B (6.98 MiB)** |
| Budget ([CONTENT-RELEASE-PIPELINE.md:63](CONTENT-RELEASE-PIPELINE.md)) | | **1,572,864 B (1.5 MiB)** | |

The first screen is about **4.7× over budget**, and 97% of it is two PNGs.
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
| **First screen (text br–gz + images)** | 6.98–7.01 MiB | **1,177,945–1,217,144 B (1.12–1.16 MiB) ✓** | **1,065,869–1,105,068 B (1.02–1.05 MiB) ✓** |

Quality evidence so far: SSIM against the PNG ([cmd] `ffmpeg … ssim`) is
**0.9545** for `portraits` and **0.9569** for `world-map` (native WebP q80). An
agent spot-check of one portraits cell at 1:1 looked equivalent. That is
**not** art approval. Indicative AVIF figures (SVT-AV1 CRF 35, 10-bit, quality
not matched): `world-map` 201,360 B (−29% against WebP) and `tang-aa` 129,197 B
(−36%). AVIF is deferred: it adds a second derivative set and needs separate
decode and quality review.

**Recommendation:** ship **scenario A** in v0.6.0 (same pixels, so no layout or
clarity risk, and it meets the budget). Move to B per use after the art review.

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
- **Formats:** WebP only at runtime, with **no PNG fallback in `dist/`**.
  `bootstrap.mjs:2-3` already needs top-level `await`, and every browser that
  supports that also decodes WebP. **UNVERIFIED:** that support matrix was not
  re-fetched under this task's network limit. Keep `portraits.png`'s alpha
  (`-alpha_q 90` in the estimate).
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
2. Build, serve `python3 tools/serve.py --port 4177` in the background on the
   runner, and wait for HTTP 200.
3. Run `npm run test:browser` in Chromium. The scripts fall back to Playwright's
   own Chromium when the macOS Chrome path is missing (`tools/smoke.mjs:11-12`).
   Then run the WebKit-capable suites: `test:battle-table`, `test:viewport`,
   `test:wx01`, `test:inheritance`, `test:collection-display`,
   `test:expansion`, `test:map-piece`.
4. Turn the first-screen measurement in §9 into `tools/payload-budget.mjs` and
   fail the job above 1.5 MiB (text counted at brotli or gzip size).
5. Upload `test-results/` **on failure only**, keeping it 7 days. The suites use
   synthetic profiles and intercepted account APIs, with no secrets.

Measured locally ([cmd] `GAME_URL=http://127.0.0.1:4290 npm run test:browser`,
installed Chrome, 2026-10-11): all 14 Chromium suites passed in **4 min 56 s**
wall time. The WebKit suites were not timed. Expect very roughly 10–15 runner
minutes per run including browser installation (an estimate, not a
measurement). Runner time will differ, and private-repository Actions minutes
count against the plan quota ([BACKEND-STACK.md:50](BACKEND-STACK.md); **UNVERIFIED:** the current
quota). Linux WebKit is **not** Safari and none of this is physical-device
evidence ([HANDOVER.md:74-78](HANDOVER.md)).

## 11. Go / no-go

**GO requires all of the following before C1:**

1. Exact-source CI is green on the `v0.6.0` commit, including the browser job.
2. A7 passes locally: Node, Python, build, preview dry run, Chromium and WebKit
   suites, SQL harness.
3. The first screen is ≤ 1.5 MiB as measured, or the owner has recorded a
   waiver.
4. B3: four migrations are applied, the read-only probe passes, and v0.5.1 is
   still `verify:hosting`-green afterwards.
5. B4: the synthetic hosted check passes, including v1→v3 restore and upload
   and the near-limit v3 PUT/GET, with **zero** fixtures left.
6. The owner has signed off on the Q0 open items (G8) and the derivative art.
7. The rollback IDs are written in the release record, and the rollback was
   rehearsed in staging if S1 exists.

**Success after C1. Otherwise fix forward or roll back:**

8. `verify:hosting` passes from the tag checkout. `/api/v1/account` reports
   `emailEnabled: true` and `journeyVersions: [1,3]`.
9. `SUPABASE_PUBLISHABLE_KEY` is still listed. The production smoke passes. C3
   passes, including the owner's mailbox login and own v1 restore.

**NO-GO triggers:** `db push --dry-run` lists anything except the two expected
files; the helper reports a missing binding or wrong account; a hash mismatch
in `verify:hosting`; 5xx from `/api/v1/account`; a failing v1 restore; or a
hosted near-limit v3 PUT that fails (CPU or time). In that last case, lowering
the v3 limit is a schema/validator change. Shipping with V3 off disables cloud
upload for new clients, so the owner decides.

## 12. Owner decisions needed

1. Go/no-go on scope, including the Q0 items still open (G8).
2. Approval of the WebP derivatives and of the `sharp` devDependency
   (A1, §9).
3. Whether the versioned module graph (A2) ships now or is waived for this
   release.
4. Staging S1, S2 or S3, or an explicit decision to skip it (§7).
5. `JOURNEY_V2_ENABLED` absent (recommended) or `true` (A3).
6. Who runs B3/B4/C1/C3, using which credentials (Supabase CLI login,
   Cloudflare OAuth, elevated test credentials kept in memory only).

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

**Not run here:** `npm run deploy -- --dry-run` (excluded by this task's
rules; CI runs it, `ci.yml:62`), the SQL harness (no
disposable database was created on this machine), the WebKit suites, CI for
`8afbabc` (no GitHub API access was used), and anything hosted beyond the two
GETs: migration state, secrets, Worker versions, plan limits and billing are
**UNVERIFIED** today and are taken from dated documents.
