# 萬象契 · Mythseal documentation library

Every file in `docs/` has one row below, grouped by subject, with a status from
the vocabulary that follows. The documents own the details; this index only
helps you find the right one. It does not change release state.

Last organized **2026-10-11** against `main` at `8afbabc`: 40 other Markdown
documents, one JSON snapshot and the archived `history/` folder. On
`q4/content-registry`, the two LZ-01 rows were later brought up to `main`'s PR #8
merge (`daf18ed`). On `q1/local-commands`, after `main` `b40c4d2` was merged in
(`b527dc3`), the index gained rows for the release plan and the Q1 contract (42
other Markdown documents) and its Q0, Q1 and Q4 qualifiers were brought up to
the merges of PRs #5 and #9 and to PR #10, which merges that branch. On
2026-10-13, on `docs/v060-integration` from `main` `0281798`, the rows for the
release plan, the validation log, the handover, the roadmap, navigation, the
battle table, the local-commands contract, the mobile plan, accounts and
hosting were brought up to D1, N1, D2 and D3 (PRs #11, #12, #14 and #15); the
document count is unchanged. On 2026-10-20, on `art/own-reference-policy` from
`main` `3f3d351`, the art provenance rows gained the onboarding record and the
reference-image principle.

## Status vocabulary

| Status | Meaning |
| --- | --- |
| `current` | Describes how `main` behaves or how a procedure works now. It does not certify that a live service is healthy today. |
| `mixed` | Current behavior alongside dated proposals or superseded details in one document. Its own status lines, or its row here, say which parts are current. |
| `preview` | A standalone local design preview. It does not read saves, grant cards or ship publicly. |
| `proposal · date` | A dated design, plan or recommendation. It is not evidence that anything was built, provisioned or deployed. |
| `record · date` | Dated evidence, receipts or provenance. True as of its date; recheck it before relying on it now. |
| `retired · date` | A superseded or retired direction, kept for understanding. It is not a work queue. |

**Live** means the behavior is in the public v0.5.1 release. **Main only** means
it is in `main` source but not deployed. [HOSTING.md](HOSTING.md) owns which
version is actually live; a merge, push or documentation change deploys nothing.
Where `main` has moved past a live-era document, for example to a newer save or
backup format, its row says so and names the document that owns the newer
contract.

## Find an answer quickly

| Question | Go to |
| --- | --- |
| Where do I start? | [AGENTS.md](../AGENTS.md), then the [handover](HANDOVER.md) |
| How do I set up and contribute? | [CONTRIBUTING.md](../CONTRIBUTING.md) and [Start a fresh checkout](HANDOVER.md#start-a-fresh-checkout) |
| Which checks fit my change? | [Checks matched to the change](HANDOVER.md#checks-matched-to-the-change) |
| What should I work on next? | [Next tasks for separate agents](../ROADMAP.md#next-tasks-suitable-for-separate-agents) and the [experience quality track](../ROADMAP.md#experience-quality-track) |
| What is deployed? | [HOSTING.md](HOSTING.md) release receipts |
| What would the next release involve? | [RELEASE-NEXT.md](RELEASE-NEXT.md), the proposed v0.6.0 plan |
| What did D1, N1, D2 and D3 change? | Back: [NAVIGATION · Back model](NAVIGATION.md#back-model--2026-10-12) (D1). Phone shell: [NAVIGATION · Mobile shell](NAVIGATION.md#mobile-shell) and the [M5.1 checklist](MOBILE-RELEASE.md#m51-phone-checklist) (N1). Saves: [LOCAL-COMMANDS §19](LOCAL-COMMANDS.md#19-file-import-and-save-safety-d2-2026-10-12) (D2). First battle: [BATTLE-LAYOUT-PLAN](BATTLE-LAYOUT-PLAN.md#first-battle-teaching--2026-10-12) (D3). Their merge and release state: the [v0.6.0 integration checkpoint](HANDOVER.md#v060-integration-checkpoint--2026-10-13-local-only) |
| Which checks actually ran, and on what? | [VALIDATION.md](VALIDATION.md) |
| Which save and backup formats does `main` use? | [Guarded saves](HANDOVER.md#playable-local-wx-01-and-guarded-saves) and the [save and settlement contract](CAMPAIGN-AND-EVENTS.md#save-and-settlement-contract) |
| Who owns which source file? | [Code ownership map](HANDOVER.md#code-ownership-map) |
| May a generator be given a reference image? | Only Mythseal's own committed art: [ART.md · Reference images](ART.md#reference-images--2026-10-20) |

## Start here

| Document | What it covers | Status |
| --- | --- | --- |
| [Project overview](../README.md) | Play, run locally, feature summary, browser checks and the project map | `mixed` · its save notes describe profile v3/v4; `main` uses v5 |
| [Working instructions](../AGENTS.md) | Repository conventions, authority limits and what every agent must preserve | `current` |
| [Contributing](../CONTRIBUTING.md) | Setup, module boundaries, proportionate checks and what stays out of Git | `current` |
| [Agent handover](HANDOVER.md) | Architecture, infrastructure and access map, fresh checkout, checks, release and the handoff template | `current`, with dated checkpoints; its Q0, Q4 and Q1 checkpoints were written on their branches, and their status lines now record the merges (PRs #5 and #9, and PR #10 for Q1). Its N1, D1, D2 and D3 checkpoints were written on their branches too; the [v0.6.0 integration checkpoint](HANDOVER.md#v060-integration-checkpoint--2026-10-13-local-only) (2026-10-13) records all four merged (PRs #11, #12, #14, #15) and supersedes the D2 and D3 checkpoints' "not merged" lines |
| [Roadmap](../ROADMAP.md) | Shipped baseline, Q0–Q6 experience track, M1–M7 phases and bounded tasks with acceptance criteria | `mixed`; its Q0, Q1 and Q4 statuses record the merges (PRs #5 and #9, and PR #10 for Q1); Q1's contract awaits owner review, and Q4's exit is not met (registry and audit done). Its D1, N1, D2 and D3 status lines record PRs #11, #12, #14 and #15 (local only, not deployed); D3's exit, an owner playtest, is pending |
| [Pull request template](../.github/pull_request_template.md) | The problem, validation and save/ownership/platform impact each PR states | `current` |

**Q0, Q4 and Q1 have merged, and so have D1, N1, D2 and D3.** The battle
table merged into `main` in PR #5 (`bca9ab4`), the content registry in PR #9
(`b40c4d2`), and the local-commands work by PR #10 (`7712a7b`); then the Back
model in PR #11 (`335d2b7`), the mobile shell in PR #12 (`e785b27`), save
durability in PR #14 (`a7bda4b`) and first-battle teaching in PR #15
(`0281798`). No deployment of any of them is recorded. The status lines in
the handover, the roadmap, the battle-table plan, the experience modules and
the local-commands contract say so. The validation log's dated Q0, Q4 and Q1
entries were written before those merges and are left as written; its
[Q1 integration entry](VALIDATION.md#q1-integration-with-main--2026-10-11)
notes this. Its LZ-01 special-printings entry was likewise written before PR #8
(`daf18ed`) merged that branch, and still says "not merged". The handover's
note that documentation-navigation PR #2 "remains independent" also predates
this index.

## Game rules and systems

| Document | What it covers | Status |
| --- | --- | --- |
| [Battle rules and prototype choices](DESIGN.md) | Four-round combat, hidden information, original-game ambiguities, atlas order, same-character inheritance | `current` · live, plus main-only additions |
| [Local progression and economy](PROGRESSION.md) | Travel, daily and weekly tasks, packs, NPC market and save migration (中文) | `current` · live, plus main-only additions; its save section is the live v3 format (`main`: v5) |
| [Backpack, card copies and decks](BACKPACK.md) | Per-copy UID, XP and history, locks, three decks, sale and buyback (中文) | `current` copy and deck rules · live since v0.4; its save shape is live collection v1, while `main` uses collection v2 with `printId` ([WX-01](EXPANSION-WX01.md), [handover](HANDOVER.md#playable-local-wx-01-and-guarded-saves)) |
| [Classical characters](CHARACTERS.md) | The twelve v0.3 classical cards: atlas positions, factions and roles (中文) | `current` · live since v0.3 |
| [Story volumes and modes](STORIES-AND-MODES.md) | The four-volume, 18-encounter slice, modes available now and the online-mode roadmap | `record · 2026-09-22` · main only; the longer campaign it plans has since been implemented ([CAMPAIGN-AND-EVENTS](CAMPAIGN-AND-EVENTS.md)) |
| [Campaign and activity](CAMPAIGN-AND-EVENTS.md) | 48 further campaign battles (66 encounters in all), 火焰山三連戰, rewards and the save/settlement contract | `current` · main only |
| [WX-01 西行・萬象初章](EXPANSION-WX01.md) | 15 new rules cards, 29 printings, cosmetic 領契 prints, the booster and the v4 save (`main` is now v5; see [CAMPAIGN-AND-EVENTS](CAMPAIGN-AND-EVENTS.md#save-and-settlement-contract)) | `current` · main only |
| [WX-01 drop rates](WX01-DROP-RATES.md) | Pack odds, rarity floor, twelve-pack pity, box opening and the analytical model | `current` · main only |

## Interface and game feel

| Document | What it covers | Status |
| --- | --- | --- |
| [Game lobby and navigation](NAVIGATION.md) | Five destinations, return paths, the encounter loop, viewport scenes and checks; the [Back model](NAVIGATION.md#back-model--2026-10-12) (D1: Back closes one layer, state-only history entries), the [mobile shell](NAVIGATION.md#mobile-shell) (N1: safe areas, no focus zoom, narrow widths, landscape dock) and the lobby's [save notices](NAVIGATION.md#save-notices-on-the-lobby--2026-10-12-d2) (D2) | `current` · main only; D1 merged in PR #11 (`335d2b7`), N1 in PR #12 (`e785b27`), D2 in PR #14 (`a7bda4b`) |
| [Battle table visibility](BATTLE-LAYOUT-PLAN.md) | Q0's single battle table: the 2026-09-23 plan and the 2026-10-10/11 implementation record; D3's [first-battle teaching](BATTLE-LAYOUT-PLAN.md#first-battle-teaching--2026-10-12) (planning hint, four coach marks, attack formula, reveal tip) | `current` · main only; Q0 merged in PR #5 (`bca9ab4`), D3 in PR #15 (`0281798`); D3's exit, an owner playtest with three first-time players, is pending |
| [Immersion and game feel](IMMERSION.md) | Creative direction; Mist Gate and the life, pill and clash presentation; further ideas to playtest | `mixed` · 2026-09-22 |
| [Map-piece prototype](MAP-PIECE-PROTOTYPE.md) | 青玉行旅棋 map movement, comfort boundaries and the studio handoff; placeholder art | `current` · main only; 2026-09-23 |

## Literary sets and previews

| Document | What it covers | Status |
| --- | --- | --- |
| [LZ-01 聊齋・燈下有靈](EXPANSION-LZ01.md) | Twelve-character candidate design and the `/liaozhai.html` preview | `preview` · 2026-09-23, updated 2026-10-11 (all 19 printings bound; merged in PR #8, `daf18ed`) |
| [HL-01 紅樓・風月入夢](EXPANSION-HL01.md) | Eight-card 海棠詩社 design and the `/honglou.html` preview | `preview` · 2026-09-23 |
| [Literary booster programme](BOOSTER-SERIES.md) | Pack types, editorial direction and first stat sketches for literary sets (中文) | `proposal · 2026-09-23` |

## Experience quality track

[ROADMAP](../ROADMAP.md#experience-quality-track) owns priority and status for Q0–Q6.

| Document | What it covers | Status |
| --- | --- | --- |
| [Experience lessons](EXPERIENCE-LESSONS.md) | Lessons from the RXSG restoration, turned into player-facing decisions | `proposal · 2026-09-29` |
| [Experience modules](EXPERIENCE-MODULES.md) | Proposed Q0–Q6 module contracts, existing seams and infrastructure | `proposal · 2026-09-29`; Q0 since implemented and merged (PR #5; see the battle table above); Q1 implemented for one command, with [LOCAL-COMMANDS](LOCAL-COMMANDS.md) as its contract (merged by PR #10); Q4's content registry and audit implemented as tooling only (`tools/content-registry.mjs`, `npm run audit:content`, never served; merged in PR #9), with its [registry states](EXPERIENCE-MODULES.md#q4-registry-states) |
| [Local commands · Q1 contract](LOCAL-COMMANDS.md) | One previewed command with a receipt (the card page's 修練升級), the device-local `commands` ledger in the v5 profile, the IndexedDB fence for every writer under the profile lock, and the release rules: ship Q1 in or before the first public v5 release and never serve a pre-fence v5 build after it. Its [§19](LOCAL-COMMANDS.md#19-file-import-and-save-safety-d2-2026-10-12) owns D2's file import (v5 and v0.5.1 exports, through the strict fenced restore) and save safety (`persist()`, `shanhai.saves.v1`, backup prompts, the restore offer) | `proposal · 2026-10-11` · main only; implemented for one command (its [§18](LOCAL-COMMANDS.md#18-implementation-record-2026-10-11)) and merged by PR #10; §19 merged by PR #14 (`a7bda4b`); owner review of the contract requested before Q2/Q3 consumers |

## Accounts, operations and evidence

| Document | What it covers | Status |
| --- | --- | --- |
| [Accounts and private backups](ACCOUNTS.md) | 旅程閣 sign-in, backup contents, the session and storage boundary, and email setup | `current` · live in v0.5.1 (snapshot v1); `main`'s snapshot v2/v3 need hosted migrations that the [handover](HANDOVER.md#playable-local-wx-01-and-guarded-saves) records as not applied. Since Q1 (PR #10), `main`'s cloud and local recovery restore also need usable IndexedDB, and refuse on a full disk or while the fence says `writing`, where ACCOUNTS names only Web Locks; [LOCAL-COMMANDS §11](LOCAL-COMMANDS.md#11-profile-field-and-migration-impact) and [§15](LOCAL-COMMANDS.md#15-owner-decisions) own that rule. Its D2 note (main only, merged in PR #14) adds 匯入旅程備份 and the 上次備份 status line, with [LOCAL-COMMANDS §19](LOCAL-COMMANDS.md#19-file-import-and-save-safety-d2-2026-10-12) as their owner; the note's own "merging by D2's PR" predates that merge |
| [Hosting, releases and rollback](HOSTING.md) | Public boundary, build and deploy procedure, rollback and exact deployment receipts | `current` procedure, with dated receipts; its "19 runtime files" is the v0.5.1 count (`main`'s allowlist has 90 at `0281798`: 80 before Q1, 83 after it, then D1, D2 and D3 add seven files) |
| [Next release plan · v0.6.0](RELEASE-NEXT.md) | The proposed v0.6.0: scope (Q1, then D1, N1, D2 and D3), release gates, ordered checklist, data safety, staging options, rollback, payload budget and owner decisions | `proposal · 2026-10-11`, revised for Q1 the same day and for D1–D3 on 2026-10-13 (candidate: `main` at or after `0281798`, plus the release PR; hosted CI blocked by an Actions budget); nothing in it is deployed, migrated or provisioned |
| [Validation log](VALIDATION.md) | Which checks ran, when, on which commit and in which environment; mostly newest first, with two later appendices at the end | `record`, dated per entry; its Q0, Q4 and Q1 entries record checks on their branches before PRs #5 and #9 and PR #10 merged them, as its LZ-01 special-printings entry does before PR #8 (`daf18ed`), and its N1, D1, D2 and D3 entries before PRs #12, #11, #14 and #15. Its [v0.6.0 integration](VALIDATION.md#v060-integration--2026-10-13) entry (2026-10-13) records the builds, first-screen and browser checks at `main` `0281798`; on the branch `ios/first-flight` a newer [iOS first flight](VALIDATION.md#ios-first-flight--2026-10-20) entry (2026-10-20) records that branch's checks |
| [Developer connections](CONNECTIONS.md) | Service identities, verified access, credential locations and remaining setup | `record · 2026-09-21`, rechecked 2026-09-22 |
| [Fresh-clone toolkit check](TOOLKIT.md) | One fresh clone's setup, access rechecks and local test receipts | `record · 2026-09-21`, updated 2026-09-22 |
| [Account API contract](../server/README.md) | Worker routes, cookies, bindings and the database access boundary | `current` |
| [Supabase developer setup](../supabase/README.md) | Project selection, applied migrations and disposable SQL tests | `current`, with dated records |
| [Local contract toolkit](../contracts/README.md) | A local Forge ERC-721 fixture; not a deployed game contract | `current` · tooling only |

## Architecture and future designs

| Document | What it covers | Status |
| --- | --- | --- |
| [Technical plan](TECHNICAL-PLAN.md) | Selected architecture, the proposed authoritative design and the implementation order | `mixed` · decision record 2026-09-21 |
| [Backend stack and data boundaries](BACKEND-STACK.md) | The implemented account slice, plus the proposed authoritative economy, schema and cost model | `mixed` · sources checked 2026-09-21 |
| [iOS and Android release plan](MOBILE-RELEASE.md) | Native packaging route, store-policy notes and phases; native release is now optional. Its 2026-10-12 sections hold N1's [M5.1 phone checklist](MOBILE-RELEASE.md#m51-phone-checklist) (emulation results, physical phones open), D1's [native Back wiring](MOBILE-RELEASE.md#back-button-in-a-native-shell--2026-10-12) and D2's [browser-save durability](MOBILE-RELEASE.md#browser-save-durability-d2--2026-10-12) seam | `proposal · 2026-09-22`; policy research 2026-09-21; its "confirmed roadmap goals" line predates the optional framing in [AGENTS.md](../AGENTS.md) and the [roadmap](../ROADMAP.md). N1, D1 and D2 are merged (PRs #12, #11, #14), not deployed. Open PR #13's native projects and pipeline are not on `main`; the branch `ios/first-flight` merges them and records the iOS first flight (Mindicraft, Xcode Cloud first, native saves) in its 2026-10-20 note |
| [Mobile cloud pipeline design](superpowers/specs/2026-10-12-mobile-cloud-pipeline-design.md) | Cloud iOS/Android builds (GitHub Actions + fastlane), TestFlight/Play testing stages, offline guest build, runbook and field notes | `proposal · 2026-10-12`; owner-approved design, built on PR #13's branch; amended 2026-10-20 (Mindicraft publishes on Apple; Xcode Cloud first, Actions as backup) |
| [Mobile publishing runbook](MOBILE-PUBLISHING-RUNBOOK.md) | The standard publishing and review flow for any app, with Mythseal as the worked example | `current` for the pipeline (hybrid route since 2026-10-20); review sections fill in as Stage 2 runs |
| [Mobile field notes](MOBILE-FIELD-NOTES.md) | Dated evidence for every mobile run, console step and review, each with a "pay attention to" lesson | `record`, dated per entry |
| [iOS first flight](IOS-FIRST-FLIGHT.md) | Every change on the `ios/first-flight` branch (PR #13 merged and fixed for Mindicraft, Xcode Cloud and native saves), its reason and the ladder rung it reached | `record · 2026-10-20` · branch only, not merged |
| [Content release pipeline](CONTENT-RELEASE-PIPELINE.md) | Art versions, animation budget and compatible release manifests (中文) | `proposal · 2026-09-21`; its §2 has a 2026-10-20 note on reference images and onboarding art |

## Retired collectible research

Collectible commercialization stopped being a delivery objective on 2026-09-23
([ROADMAP](../ROADMAP.md#retired-collectible-launch-phases)). These documents
explain the earlier thinking; none is an instruction to mint or sell.

| Document | What it covers | Status |
| --- | --- | --- |
| [Limited cards and on-chain identity](BLOCKCHAIN-DESIGN.md) | Draft supply caps, per-copy XP and transfer semantics (中文) | `retired · 2026-09-23`; draft dated 2026-09-21 |
| [NFT, wallet and archive stack](NFT-STACK.md) | Base Sepolia, ERC-721 and IPFS candidate stack (中文) | `retired · 2026-09-23`; research dated 2026-09-21 |
| [Blockchain implementation plan](BLOCKCHAIN-IMPLEMENTATION-PLAN.md) | Base recommendation and contract packets; superseded that evening by the retirement | `retired · 2026-09-23` |
| [Pre-retirement roadmap](history/retired-commercial-direction-2026-09-23/ROADMAP.md.txt) | The roadmap as it stood before the retirement, unchanged | `retired · 2026-09-23` |
| [Pre-retirement technical plan](history/retired-commercial-direction-2026-09-23/docs__TECHNICAL-PLAN.md.txt) | The technical plan as it stood before the retirement, unchanged | `retired · 2026-09-23` |

## Art provenance

| Document | What it covers | Status |
| --- | --- | --- |
| [Art provenance hub](ART.md) | Prompts for the original twelve-portrait atlas and six-realm map, links to every `ART-*` record, the code-drawn and synthesized Mist Gate and battle-presentation notes, and the [reference-image principle](ART.md#reference-images--2026-10-20): references only from Mythseal's own committed art | `record · 2026-09-21`, entries to 2026-09-23; its reference-image principle (2026-10-20) is `current` |
| [Classical portrait atlas](ART-CLASSICS.md) | Prompt and inspection notes for the v0.3 classical atlas | `record · 2026-09-21` |
| [Story-map artwork](ART-STORIES.md) | Prompts for the 西遊, 封神 and 白蛇 volume maps | `record · 2026-09-22` |
| [WX-01 production artwork](ART-WX01.md) | Prompts for four base atlases and ten special illustrations | `record · 2026-09-22` |
| [西行 special-print studies](ART-EXPANSION.md) | Three Wukong studies (異畫, 墨卷, 天工) shown in `atelier.html`, also reused unchanged for the WX-01 Wukong AA, INK and TR printings | `record · 2026-09-22` |
| [HL-01 art studies](ART-HL01.md) | Prompts and integrity notes for the 紅樓 preview art | `record · 2026-09-23` |
| [LZ-01 art studies](ART-LZ01.md) | Prompts for the 聊齋 preview art, the briefs for its six later special prints and their provenance; all seven specials are bound | `record · 2026-09-23`; briefs 2026-10-10; specials generated and bound 2026-10-11 (merged in PR #8, `daf18ed`; preview allowlist only) |
| [Onboarding, tutorial and key art](ART-ONBOARDING.md) | Planned key art (K-01), the 守渡弈者 guide figure (T-01, not the playable 渡影), the 霧隱渡口 scene (T-02), rule-tile vignettes (T-07) and a 洞府 backdrop (G-01); the provenance fields each selected image fills; what is known about ArtCraft and its terms, and the written commercial-use confirmation needed before an output goes 上架 (the store release or listing) | `proposal · 2026-10-20`; 上架 gate decided 2026-10-21; nothing briefed, generated or committed |

## Research and naming

| Document | What it covers | Status |
| --- | --- | --- |
| [Original 神魔令 research](RESEARCH.md) | Bounded source search and which original mechanics are known or unknown (中文) | `record · 2026-09-21` |
| [Classical source notes](CLASSICAL-SOURCES.md) | Primary-text anchors behind the classical characters (中文) | `record · 2026-09-21` |
| [Naming decision and history](NAMING.md) | Why 萬象契 / Mythseal, and the earlier shortlist | `record · 2026-09-21` |
| [Domain-check snapshot](DOMAIN-CHECKS.json) | Registry lookups behind the naming shortlist; not current availability | `record · 2026-09-21` |

## Keeping the library useful

- When you add a file to `docs/`, add one row here with a one-line purpose and a
  status, and state the status and date at the top of the document itself.
- When a status changes (for example, a branch merges or a proposal ships),
  update the document's own status line first, then its row here.
- Link to the document that already owns a subject instead of writing a second
  guide for it. Similar subjects do not make two documents duplicates.
- Keep dated receipts and original research intact; add a newer dated entry
  rather than rewriting history.
- Keep file paths stable so GitHub links and agent handoffs keep working. If a
  file must move, update every inbound link in the same change.
- Generated output stays in its ignored directories. Browser source, assets,
  launchers and applied migration names have functional path dependencies; the
  [code ownership map](HANDOVER.md#code-ownership-map) explains them.
