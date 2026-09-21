# Validation · v0.4 · 2026-09-21

Local browser prototype only. No deployment, account service, blockchain or player-to-player trading.

## Private repository and release planning

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
