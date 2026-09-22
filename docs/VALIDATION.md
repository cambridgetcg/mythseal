# Validation · v0.5.1 · 2026-09-21

v0.5.0 implements 旅程閣, player-session handling and account-private backups of editable offline journeys. Gameplay remains local; no authoritative economy, blockchain or player-to-player trading is implemented. SMTP is configured and the owner confirmed mailbox delivery/local-pilot login. v0.5.1 is deployed with public OTP enabled; real HTTPS OTP/session/logout checks passed with fixture cleanup verified. Public deployment and its exact release evidence belong in [HOSTING.md](HOSTING.md); local or hosted-database checks below do not establish that a new website version is live.

## Mist Gate immersion · 2026-09-22

Local development on `codex/game-lobby`, following the navigation slice. This is
browser/source evidence, not a public deployment or physical-phone test.

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
