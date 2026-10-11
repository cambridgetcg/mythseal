# 萬象契 · Mythseal roadmap

**Current release: v0.5.1 is deployed at [mythseal.com](https://mythseal.com), with email login and private backups of the offline journey.** The source repository is private. Gameplay, rewards and card ownership remain editable local state; the account service does not make them authoritative.

Start with [HANDOVER.md](docs/HANDOVER.md) for repository orientation, infrastructure and the next agent's workflow. Use [HOSTING.md](docs/HOSTING.md) for deployed revisions, [ACCOUNTS.md](docs/ACCOUNTS.md) for actual account behavior, [CONNECTIONS.md](docs/CONNECTIONS.md) for service readiness and [VALIDATION.md](docs/VALIDATION.md) for evidence. This roadmap sets priorities and acceptance criteria; it does not authorize paid services, store enrollment, chain transactions or a sale. No release dates or production supply have been committed.

## Freely chosen game direction

This is a free game and a space for understanding and play. It has no revenue,
acquisition, retention, output or learning quota. Future work is optional.
Collectible commercialization and paid acquisition are retired objectives.
Game coins, XP, daily in-game activities and existing player saves remain game
mechanics; they create no duty for the creator to produce or monetize.

An Eastern mythic strategy card game with refined dark-fantasy artwork, four-round bluffing battles, travel, daily progression and cards with individual histories. Characters draw from Chinese mythology, literature and history, using original artwork and documented provenance. Target clients are browser, **iOS and Android**.

**Mobile launch direction confirmed · 2026-09-22:** develop Mythseal for release
as an **iOS game on the App Store and an Android game on Google Play**. The approved
five-destination lobby and encounter/deck/rewards loop form the shared interface
foundation. Adapt that experience for portrait phone play while retaining the
browser version. Physical-device validation, native packaging, closed beta and
store launch are planned milestones below; no launch date is set. Under the
2026-09-23 direction above, this native release remains a freely chosen,
undated option with no growth or revenue target.

**Immersion direction requested · 2026-09-22:** enrich the world, tactile card/pill
feedback, hidden-bid reveals and attachment to individual card copies. The
[immersion design](docs/IMMERSION.md) proposes a quiet mythic world with decisive
battle moments, starting with one complete 霧隱渡口 encounter. The M4 packets below
are planned work; their creative details and later gameplay experiments remain
proposals to playtest.

The optional technical direction is portable play and understandable card history.
Server validation can support ordinary battles without making wallets,
collectible issuance or a marketplace prerequisites. There is no requirement
to turn this game into a paid product.

The detailed [technical plan](docs/TECHNICAL-PLAN.md), [backend design](docs/BACKEND-STACK.md), [mobile plan](docs/MOBILE-RELEASE.md), [NFT stack](docs/NFT-STACK.md) and [content pipeline](docs/CONTENT-RELEASE-PIPELINE.md) explain the proposed architecture. Their original baseline and policy research are dated; the current-state documents above take precedence for what is implemented. Recheck platform requirements when selecting an actual release flow.

**Booster direction confirmed · 2026-09-22:** start with **西遊記**, then develop
other series. [WX-01 · 西行・萬象初章](docs/EXPANSION-WX01.md) now implements 16 base
identities (existing Wukong + 15 new characters) and thirteen cosmetic special
printings: six AA, four 領契 LAA, two ink-scroll and one treasure. Keep
凡品/靈品/神品 distinct
from printing treatments and battle strength. The local game has 39 playable
characters, three earned-coin packs, exact owned printings and a saved opening
receipt. The owner chose cosmetic 領契 first, with Leader battle effects later.
The [rate specification](docs/WX01-DROP-RATES.md) is implemented locally with
twelve-pack protection, 神契匣, 西行印 redemption and a first-volume AA choice.
Candidate card balance and phone experience still need playtesting. Production
v0.5.1 is unchanged; no release or hosted migration accompanies this work.

**Literary boosters confirmed · 2026-09-23:** record the complete expansion
direction below and start **LZ-01 · 聊齋・燈下有靈** first. The owner selected
**詭美＋人情：雨夜、狐鬼、燈火與相守**. Begin with a twelve-character design and
an interactive local art/pack study, then integrate a reviewed earned-coin
booster. The owner then selected **HL-01 · 紅樓・風月入夢 / 海棠詩社** for the
next local design/art study, with shared conversation play. 封神 remains the
next proposed full-size set; 白蛇, later 紅樓 collections, 三國, 水滸 and original
山海 companion stories remain queued.
These are content priorities, not release dates or existing acquisitions.
See [the series programme](docs/BOOSTER-SERIES.md) and
[LZ-01 design](docs/EXPANSION-LZ01.md) and [HL-01 design](docs/EXPANSION-HL01.md).

**Local campaign and activity · 2026-09-22:** the approved
[西行續卷 and 火焰山三連戰](docs/CAMPAIGN-AND-EVENTS.md) are implemented locally.
Six eight-battle volumes add **48 encounters to the original 18 (66 total)**,
eight fixed BASE copies, six WX-01 tickets, a separate AA choice and cumulative
resource mastery. The standard three-boss activity freezes owned/loaner rosters,
carries resources through supplies, banks targeted loot and awards first/weekly
milestones and a five-clear title. Existing clears, old AA entitlement and pack
rates remain intact. Profile v5/cloud snapshot v3 compatibility is in source;
Chromium/WebKit acceptance is recorded in [VALIDATION.md](docs/VALIDATION.md#campaign-and-fire-mountain--2026-09-22).
Human balance and physical-device review remain open. Public v0.5.1 and hosted
schemas are unchanged.

## Shipped baseline and its limits

**Local viewport scenes (2026-09-22):** the five destinations now use bounded
game scenes. World maps, chapters, market activities, quests and collection
tools have named modules; card copies, deck slots, materials and box receipts
have explicit pages. Life and pill reserves remain on the battle table while
the player switches between hand, move and opponent. Dialogs use the same
module/page routes. Page and focus state are transient; save formats, battle
rules and rewards are unchanged. See [navigation behavior](docs/NAVIGATION.md).
Native packaging and physical-device/on-screen keyboard validation remain planned.

**Local stories and quests (2026-09-22):** the owner chose playable maps/quests
first and deferred real online PvP/ranked. Three new four-chapter volumes inspired
by 西遊記, 封神演義 and 白蛇傳 join the original six realms; weekly quests, a shared
daily/weekly journal and a clearer mode hub are implemented locally. AI arena
and practice remain available. See [story/mode scope and online sequence](docs/STORIES-AND-MODES.md).
These additions are not yet in the public release described below.

| Public v0.5.1 area | Implemented in that release | Still absent or unverified |
| --- | --- | --- |
| Game loop | 24 characters; local AI battles/arena; six travel locations; daily tasks/training; earned-coin packs; NPC sale and buyback. | Server-validated rewards, competitive ladder, matchmaking and player-to-player trading. |
| Backpack | Per-copy UID, XP, level, battle history and protection; three exact-card decks; legacy save migration and pending-battle recovery. NPC buyback keeps the same copy and XP. | Server-issued card identities and transferable ownership. Local UIDs confer no future mint entitlement. |
| Accounts | Public numeric email-code login, secure server sessions, explicit private backup/upload/restore, revision conflicts and backup deletion. Guest play is preserved. | Automatic synchronization/merging, full account deletion and a complete account-recovery/support flow. Backup deletion is not account deletion. |
| Backup boundary | At most 2,000 owned plus merchant-held copies and 512 KiB PostgreSQL JSONB text; pending battles cannot be uploaded or replaced. Hosted isolation/conflict/boundary checks passed. | A mailbox-delivered login through the public browser and physical cross-device restoration remain unverified. The owner confirmed mail delivery and login through the local pilot; synthetic hosted API checks are separate evidence. |
| Delivery | Private GitHub source/CI; Cloudflare static assets plus account API; Free Supabase development project; configured Resend SMTP. | An authoritative game database/API, production operations/recovery readiness and native store releases. |
| Future tooling | Capacitor/toolkit preparation, read-only chain/Pinata checks and a local contract fixture. | Native builds/signing, a deployed game contract, wallet integration, IPFS persistence/restore and any NFT issuance. |

Preserve `shanhai.*` save namespaces and existing guest progress throughout the following phases. A local save or cloud backup must never become trusted currency, competitive XP, ownership or a mint claim merely because its owner signs in.

## Experience quality track

**Requested 2026-09-29 · planned work.** Bring the RXSG restoration's lessons in
smoothness, bounded convenience and content depth into the existing Mythseal
game. [Experience lessons](docs/EXPERIENCE-LESSONS.md) explains the evidence and
player-facing choices; [Experience modules](docs/EXPERIENCE-MODULES.md) owns the
proposed contracts, file seams and infrastructure. This track complements M1–M5;
it neither reopens retired commercial work nor marks these features implemented.

Source baseline is `22092fc` on `main`, which includes the game-lobby work.
12/24-pack WX boxes, saved opening receipts, inheritance previews, per-copy
history, campaign activities and comfort controls already exist in that source.
Extend them instead of creating parallel implementations. Public v0.5.1 and
hosted migrations remain separate release work.

**Start with Q0 and Q1.** Q0 is a visible improvement independent of online
services; Q1 defines the small persistence contract needed by later convenience
features. Q4's catalogue audit can run alongside them. Do not wait for M2 or a
new renderer to make local play clearer.

### Q0 · Visible decisions and measured responsiveness

- **Own:** the existing [battle-table plan](docs/BATTLE-LAYOUT-PLAN.md),
  `battle-ui.mjs`, the battle slice of `scene-adapters.mjs`, relevant CSS and
  focused viewport/browser tests. Coordinate shared `app.mjs` changes with Q1.
- Keep both public four-card hands, announced confrontation, life/pills and
  move controls visible together. Improve text/targets/crops with existing art;
  preserve focus, drafts, fast/skip and reduced motion.
- Record cold/warm loading and local input/render baselines separately, using
  named synthetic fixtures/device profiles from the experience note.
- **Exit:** simultaneous-visibility and real hit-test assertions pass for both
  initiative states and reveal/resume; hidden bids remain private. Record a
  before/after measurement and label any physical-device/human review still open.
- **Status 2026-10-11:** implemented locally on branch `q0/battle-table` (final
  source `80fb7a3`), awaiting owner review. It is not merged, pushed or deployed;
  the last recorded public release is still v0.5.1. Final headless checks and
  the before/after measurement are in
  [VALIDATION](docs/VALIDATION.md#q0-battle-table--2026-10-10). A checking round
  now takes 5 taps instead of 11, and the opponent's cards stay visible with the
  controls at every step. The
  [battle-table plan](docs/BATTLE-LAYOUT-PLAN.md#implementation-record-2026-10-10)
  has the design record. Physical-device and human review remain open.

### Q1 · One local command and receipt boundary

- **Own:** a small proposed command adapter around existing progression rules,
  `profile-store.mjs` integration, receipt validation and the relevant save/cloud
  compatibility tests. Agree the contract before Q2/Q3 write consumers.
- Reuse save-first behavior; effects and a bounded receipt belong to the same
  committed profile. Define command identity, relevant-state fingerprint,
  duplicate result lookup, retention and failure states. Preserve WX receipts
  and legacy save namespaces; no automatic acknowledgement on the player's behalf.
- Require a real cross-tab writer guard for new batch/queue operations. The
  current unlocked fallback is not sufficient evidence of cross-tab safety.
- **Exit:** stale preview, duplicate submission, quota/storage refusal and
  tab/reload interruption cannot lose a copy, spend twice or reroll a committed
  outcome. Changed payload under the same identity is rejected. Any new profile
  fields have versioned migration and compatible backup validation before release.
- **Status 2026-10-11:** implemented for one command on the local branch
  `q1/local-commands` (from `8afbabc`; last source commit `0e1ef85`, after three
  review rounds, a final review and two pre-merge reviews). Local only: not
  pushed, merged or deployed, and no hosted check. The backpack card page's
  修練升級 commits through `local-commands.mjs` under the shared lock, with its
  receipt in the same profile write. Every writer under that lock goes through
  an IndexedDB read-after-write fence, and commands and restore refuse, writing
  nothing, when it cannot prove their bytes are current.
  [LOCAL-COMMANDS](docs/LOCAL-COMMANDS.md) is the contract and records the
  deviations; the checks are in
  [VALIDATION](docs/VALIDATION.md#q1-local-commands--2026-10-11), ending with
  the second pre-merge review's fixes in `1afaf6b` and `0e1ef85`. **Owner
  review of the contract is requested before any Q2/Q3 consumer is written;**
  its §15 decisions (restore rule, browsers without Web Locks, release
  ordering, retention, copies awaiting WX review) remain open.

### Q2 · Previewed care for selected companions

- **Depends on:** Q1. **Own:** proposed pure care planner and its UI/tests;
  call existing `getUpgradeCost`, `upgradeInstance`, `trainInstance` and copy
  protection rules. Existing inheritance and WX boxes remain their own flows.
- Select exact UIDs and a target, preview costs/reserves/blocked copies, then
  confirm one bounded plan. Start with deterministic upgrades; add training
  only with explicit daily-counter and stop semantics. Keep printings/history.
- **Exit:** selected copies alone change, max-level copies cost nothing, pending
  copies remain protected, stale/insufficient plans do not partially save, and
  the result names actual spending and remaining balances. Pure rule, storage
  failure and keyboard/touch flow checks cover the whole slice.

### Q3 · A visible, optional care queue

- **Depends on:** Q1/Q2. **Own:** proposed policy evaluator and queue panel;
  one integration owner connects them to the command adapter.
- Explicit targets, ordering, post-action reserve floors, per-action limits,
  pause and waiting reasons. Start in the foreground with a small approved
  upgrade queue. Paused per-copy rules override a collection-wide rule.
- A hidden/closed app does not promise background work. Resume rechecks state
  and time, presents the next plan and does not replay missed days. Expanding
  auto-spend to training or consumables is a separate explicit policy choice.
- **Exit:** two tabs cannot run the same step twice; pause prevents the next
  step; caps, exhausted resources, stale state, day rollover and rejected writes
  produce understandable states. No automatic selling, inheritance or battles.

### Q4 · Content capabilities and one deeper encounter

- **Own:** a small proposed read-only manifest over existing campaign/activity/
  printing catalogues, its validator and a single reviewed content sample.
  Coordinate with LZ/HL integration rather than replacing those set designs.
- Declare playable/preview/planned status, dependencies, rules/content version,
  entry cost, completion event, reward policy, resume support and evidence.
  Trial one optional puzzle or encounter variation before adding more systems.
- **Exit:** unavailable prerequisites have visible reasons; every advertised
  playable route has a start → completion → receipt → return test. Preview
  browsing leaves profile bytes unchanged; duplicate completion pays once.
  Human difficulty review remains separate from strong-fixture completion tests.

### Q5 · Fair agent practice interface

- **Depends on:** Q1 and Q0's public presentation model. **Own:** proposed
  redacted observation/command adapter, scenario runner and information-boundary
  tests; reuse engine validation and the same local persistence path as the UI.
- First support opt-in practice observation and legal move submission. Expose
  capabilities, revision, permitted public state and a host-enforced action
  budget; no raw profile, hidden move, bid range, future seed or storage handle.
- **Exit:** forged/stale/illegal actions fail; reading cannot mutate state;
  human and agent traces settle identically; tests prove unrevealed choices do
  not affect the observation. Economy control needs its own player-approved
  budget. Local practice is not adversarial anti-cheat; online agents await M2/M3.

### Q6 · Portable evidence and release readiness

- **Own:** reuse `tools/` browser/preview/build/deploy checks, a bounded benchmark
  fixture/report and the existing [release](docs/HOSTING.md)/[validation](docs/VALIDATION.md)
  records. Baseline/tooling work can begin now; each changed feature adds its
  focused checks when ready. No new hosted service is a prerequisite.
- Verify a clean Mac/Linux checkout's local play and isolated fixtures; exercise
  Chromium/WebKit, poor/offline account access, hide/resume, old/new saves and
  recovery. Physical iPhone/Android and native lifecycle work remain M5 evidence.
- **Exit:** distinguish local rules, browser, CI, physical device and hosted
  results. Public builds exclude design notes/test data and retain the coherent
  hashed module graph. An eventual release preserves account bindings and
  old/new backups under existing journey-v2/v3 rollout gates; this docs track
  neither deploys nor applies hosted migrations.

Assign one packet, one artifact owner and a separate reviewer. Include base/head
SHA, implemented behavior, exact checks, open evidence gaps and migration/release
impact in each handoff. Q2/Q3/Q5 share a contract, not permission for concurrent
uncoordinated edits to `app.mjs`, profile schemas or cloud validators.

## Ordered delivery phases

Each phase ends with reviewable behavior and recorded evidence. Split work by artifact ownership; agree API/schema contracts before parallel implementation. Local tests, CI, deployed API checks, browser behavior and physical-device checks are distinct results.

### M1 · Complete the account journey and portable operations

**Dependencies:** deployed v0.5.1. Account evidence, deployment tooling and online design can progress independently.

**Local toolkit progress (2026-09-21):** tracked loopback preview, pinned browser
tests and the binding-preserving deployment helper now pass local checks; see
[TOOLKIT.md](docs/TOOLKIT.md). Hosted retention after the next release, real
cross-device evidence and the online contract remain open M1 acceptance items.

- Complete an owner-initiated public-browser email login, explicit upload on one device and explicit restore on another. Check the recovery copy, a stale-revision conflict, logout and guest-save preservation without overwriting the owner's only save.
- Verify the tracked local preview and deployment workflow from a fresh clone. Local regression/dry-run checks now cover the publishable-binding metadata guard and explicit `--keep-vars`; verify actual binding retention and account availability after the next authorized release. Never copy credentials into source, public assets or logs.
- Define account recovery, session revocation, deletion and retention behavior. Separate deleting a backup from deleting an identity; document how future owned cards or active matches change deletion semantics.
- Specify the first authoritative API commands, a separate online inventory/read model and the UI boundary between offline practice and online progression. Decide the server-issued starter grant without importing local balances or XP.
- Record the operating budget, backup/restore procedure and measured service limits needed for an online alpha. Existing free infrastructure is the baseline; any paid expansion is a separate decision.

**Acceptance:** record actual public-browser/cross-device results. A fresh-clone preview and deployment dry run verify the intended environment/identity and binding configuration; the next planned release verifies publishable-binding preservation and runtime account availability. Account lifecycle requirements and one reviewed online API/schema contract are explicit. Open evidence gaps remain labeled rather than inferred from unit or API tests.

### M2 · One authoritative battle with exact-card XP

**Dependencies:** M1 online contract and starter-grant decision. This is the next online gameplay implementation priority; local campaign/activity work can proceed independently. The entire future economy is not a prerequisite.

- Add an isolated authoritative schema with server-issued card UIDs, versioned rules, matches and append-only XP/reward events. Select one transactional adapter using the [backend design](docs/BACKEND-STACK.md); Hyperdrive/pg remains proposed, not deployed.
- Implement sign-in → read starter inventory → start AI match → submit four rounds → settle once. Reuse pure rules, inject controlled randomness in tests, freeze the participating UIDs/rules version and keep hidden choices private.
- Add a client adapter and one playable online path. Commands submit player choices; they never submit a trusted winner, XP total or replacement inventory. Preserve the existing offline mode and backups.
- Prove request retries, disconnect/resume, concurrent commands and a settlement retry cannot pay twice or move XP to a different copy. Reject forged ownership, stale card state and invalid turns.

**Acceptance:** two devices can resume the same server match and read the same resulting cards; each played copy receives the correct XP exactly once; local edits grant nothing online. Tests cover transaction rollback and duplicate commands, followed by a deployed integration check with disposable fixtures and verified cleanup.

### M3 · Move the daily economy online, then add player trading

The requested PvP track follows the M2 battle authority: private friend rooms →
unranked matching → ranked seasons. See [mode acceptance details](docs/STORIES-AND-MODES.md#online-mode-roadmap).
It can progress independently of player trading once its match/identity contract
is proven. Do not promote local AI-arena points into a human competitive rating.

**Dependencies:** M2 server identity, transactions and reward ledger. Move one command family at a time; do not maintain two competing authorities for an online balance.

- Add daily claims/training and travel rewards with server dates, unique claim keys and atomic currency/XP entries. Preserve existing rules unless a separately documented balance change is intended.
- Add earned-coin packs with server randomness, recorded results and idempotent payment/card creation. Retrying a request returns its original pack, including the same card UIDs.
- Add upgrades, decks and NPC sale/buyback with exact-copy history, ownership checks, pending-match restrictions and atomic costs. Exercise concurrent requests and minimum legal-deck protection.
- Design and implement a small in-game player listing/purchase flow only after ordinary inventory/currency invariants pass. Specify fees, cancellation, expiration, active-battle locks and transfer history; no cash-out or real-money marketplace is implied.

**Acceptance:** currency/card conservation, one-time rewards, failed-transaction rollback and concurrent buy/cancel behavior are verified. A sold card retains its UID/XP/history, leaves the seller's usable decks and appears once in the buyer's inventory. Administrative correction uses an auditable event rather than editing away ledger history.

### M4 · Grow the game, presentation and competitive play

**Dependencies:** content/onboarding work can start now. Server competitive play depends on M2; valuable trading/rewards depend on M3.

**Local presentation slice (2026-09-22):** the five-destination game lobby,
unified cards/deck/codex hub, quest overlay and encounter preparation/next-match
flow are implemented for local review. See [navigation behaviour and checks](docs/NAVIGATION.md).
This does not change the live release or complete the broader M4 acceptance criteria.

**Local Mist Gate experience (2026-09-22):** a first M4.1–M4.2 slice now adds
lantern/mist arrival and battle atmosphere, tactile card/pill feedback, a short
skippable saved-result reveal, optional synthesized ambience/cues, persistent
comfort controls and exact-copy XP → 同行記 → result navigation. See
[implemented scope and next additions](docs/IMMERSION.md) and
[local verification](docs/VALIDATION.md#mist-gate-immersion--2026-09-22).
Human playtesting, physical-device performance and the wider art/content work
remain open acceptance evidence. This is local development, not a deployment.

**Shared battle presentation (2026-09-22):** jade life meters, twelve pill
capsules with bid/Fury planning, a card clash and separate spend/damage/recovery
beats now work in every battle mode. Normal presentation takes 1.1 seconds;
skip, fast and reduced motion show the same final totals immediately. Soft
match/round arrivals complete this local follow-up. See
[scope and next polish](docs/IMMERSION.md#life-pills-and-battle-transitions--2026-09-22)
and [verification](docs/VALIDATION.md#life-pills-and-battle-transitions--2026-09-22).

**Immersion track (local first slice; remaining work planned):** follow [IMMERSION.md](docs/IMMERSION.md) for the
player moments, first-encounter storyboard and implementation/validation seams.

**Next battle usability fix (planned 2026-09-23):** the viewport conversion hides
opponent cards/commitment while choosing a move. Follow the
[battle-table layout plan](docs/BATTLE-LAYOUT-PLAN.md): persist four public enemy
cards, current confrontation, own hand and move controls together; keep played
cards visible through reveal details. Preserve hidden bids and add direct
simultaneous-visibility assertions to the existing viewport checks. *2026-10-11:*
implemented locally as Q0 on branch `q0/battle-table` and not deployed; see the
Q0 status above.

**Carved map-piece study (2026-09-23):** [青玉行旅棋](docs/MAP-PIECE-PROTOTYPE.md)
now provides a local CSS/SVG prototype across all maps: lift, follow each route
node, settle, then choose whether to inspect/enter. A separate paged **路程**
module preserves map space. Keyboard, interruption and reduced-motion paths are
included; browsing changes no save or game rules.

- [x] Playable carved-piece navigation and studio handoff brief.
- [ ] Owner playtest of pacing, readability and repeat travel.
- [ ] Professional studio piece/material studies and desktop/phone mockups.
- [ ] Final asset integration and physical-device review after art approval.

| Packet | Planned experience | Exit evidence |
| --- | --- | --- |
| **M4.1 · Feedback foundation** | Tactile card/pill/commit cues, public-result presentation, persistent audio/motion/pace preferences and one faction/card sample using the existing DOM/art. | Normal, fast, skipped and reduced-motion paths show the same accepted result; hidden bids remain private and controls work with touch/keyboard. |
| **M4.2 · First immersive encounter** | One complete 霧隱渡口 journey: arrival/preparation → commitment → readable reveal/impact → exact-copy XP → next/retry. | Recorded playtests for clarity and repeat-play pace; interruption/reload cannot duplicate rewards or strand a match. Measure phone behaviour with M5. |
| **M4.3 · World and companion identity** | Distinct realm atmosphere, short guardian writing and clearer 同行記; the local WX-01 slice now supplies an earned-pack opening and owned LAA lobby display. | Asset provenance/budgets and static/muted alternatives; any new memory derives from recorded events; no rule, rarity-odds or reward changes hidden inside effects. |
| **M4.4 · Encounter depth experiments** | Candidate training puzzles, distinct legal opponent playstyles and later encounter/route variants. | A bounded prototype with versioned content/rules, reproducible scenarios and balance/AI information-boundary evidence before adoption. Optional for initial mobile scope. |

**M4.5 · 西行 booster and printing identity:** follow the
[set bible and delivery slices](docs/EXPANSION-WX01.md#delivery-slices-and-acceptance).
The local implementation now includes all 15 new rules cards, the Wukong reprint,
29 printings, 14 new art files and the three earlier Wukong illustrations.
The original WX-01 profile-v4 slice used a separate save key, preserving exact
copies and pending battles while recording printing IDs, pack receipts, dry counters and
西行印. Weekly ten-match claims add five 印; previously cleared Westward volumes
qualify for the once-only AA choice. The original two packs retain their card
pools/order, prices and six-call draw sequence.

The campaign slice below now advances local saves to v5. Automated integrated
browser checks are recorded in [VALIDATION.md](docs/VALIDATION.md); human
accessibility/balance playtests and physical-phone review with M5 remain open.
Before any separate authorized public release,
apply and verify the additive journey-v2/v3 SQL migrations, verify old/new backup
retention and account bindings, and ship a coherent hashed/versioned client
module graph. `JOURNEY_V2_ENABLED` and `JOURNEY_V3_ENABLED` stay false or absent until
their hosted schema compatibility is verified. Local v2/v3 snapshots allow
10,000 owned/vault copies and 4 MiB; deployed v0.5.1 still has its v1 limits. Passing local tests is not
evidence that the hosted migration or rollout has happened.
**M4.5-LZ · 聊齋 first (selected 2026-09-23):** follow the
[twelve-character design](docs/EXPANSION-LZ01.md). The first slice is a separate
local concept gallery and fixed three-card opening: twelve BASE portraits,
one 小倩 AA, story/faction browsing, readable candidate rules and accessible
reveal/skip/restart. It neither reads nor writes a journey, consumes coins nor
grants owned copies. Its fixed samples are not evidence of drop rates.

**LZ-A local study complete:** `liaozhai.html` now supplies that preview with
thirteen illustrations in four image files. 438 Node tests, nine Python tests,
the unchanged 80-file public build, and fourteen preview groups per
Chromium/WebKit engine pass. Native Safari opens it; physical-phone and human
balance review remain open. See [verification](docs/VALIDATION.md#lz-01-literary-design-preview--2026-09-23).

- **LZ-A · Design and art study:** preserve five distinct story groups and four
  factions; record original-text anchors, candidate stats and meaningful
  tradeoffs. Review portrait crops, desktop/phone fit, keyboard focus, reduced
  motion, repeat openings and absence of storage/API activity. Keep preview
  files outside the production allowlist.
- **LZ-B · Rules and ownership integration (planned):** admit reviewed characters
  and immutable print identities into engine/catalogue/codex/decks. Preserve
  original and WX pools, exact UIDs/XP, pending matches and all older save
  namespaces. Introduce an explicitly versioned migration and compatible cloud
  validation where needed; verify stale-tab/recovery behavior with synthetic
  saves before opening the new content to real journeys.
- **LZ-C · Earned-coin booster (planned):** specify price, exact distributions,
  duplicate handling, protection and finite choice routes before implementation.
  Persist payment, exact grants, counters and receipt atomically; reload and
  skipped animation must not redraw or pay twice. Give each set its own explicit
  counters rather than borrowing 西行印/pity. Verify model/runtime equivalence,
  storage refusal, capacity, multi-tab races and old/new cloud compatibility.
- **LZ-D · 餘願 experiment (planned):** a public previous-round loss may activate
  a printed effect. Define first-round/draw behavior, skill suppression and
  planning/reveal/resume semantics before adding engine support. No secret bid,
  hidden AI choice or extra round enters the trigger. Base candidates use only
  current effect types; this keyword is not active in the preview.
- **LZ-E · Story and full printing programme (planned):** short linked encounters
  and character-specific choices, then the proposed 12 BASE + 4 AA + 2 INK +
  1 TR checklist. Final rates, balance and owned-card release are separate
  acceptance steps; no scarcity countdowns or combat advantage for special art.

**M4.5-HL · 海棠詩社 (selected 2026-09-23):** the next local study is
`honglou.html`: eight BASE portraits and three AA scenes, a fixed opening,
candidate rules and the characters' distinct poetry-club roles. The eight-card
paper deck totals 20 stars. 黛玉 is an unchanged identity reprint; 寶玉、寶釵、
湘雲、探春、李紈、迎春、惜春 are seven candidates. 熙鳳 stays in the later
programme. The autumn club and 湘雲's later 芍藥 nap are separate source moments.
See [HL-01](docs/EXPANSION-HL01.md) and [art provenance](docs/ART-HL01.md).

- **HL-A · Local study complete:** eight portraits and three AA scenes are
  available; 446 Node tests, nine Python tests, the 80-file public build and
  14 preview groups per Chromium/WebKit engine pass. Modal keyboard traversal,
  phone viewport fit, repeat openings and storage isolation are checked.
  See [verification](docs/VALIDATION.md#hl-01-literary-design-preview--2026-09-23).
- **HL-B · Shared play and balance (started):** first conversation round was
  迎春＋0丹 versus sealed 寶玉＋3丹: only 2 damage suffered while saving all 12 pills.
  Complete the four-round prototype, then try low-star pressure, defensive losses,
  refund timing and mixed-faction hands; record actual human decisions before
  calling the candidates balanced. Conversation play does not grant copies.
- **HL-C · Collection format and integration:** choose a fixed seasonal
  collection or earned-coin booster after review. Specify acquisition and
  migrate catalogue/save/cloud validation coherently before admitting these
  cards to the real game; reuse the retention requirements from LZ-B/C.

**M4.5-S · Broader literary programme:**

| Series | Proposed format and identity | Starting cast / next evidence |
| --- | --- | --- |
| 封神・蓮火問天 | 16-character full booster; pressure, disruption, efficient support and high-stakes bids | Unchanged 哪吒 reprint; 姜子牙、楊戩、雷震子、聞仲、妲己、太乙真人. Source-specific roster, 25-star decks and 蓮花化身 INK study. |
| 白蛇・煙雨人間 | Intimate story collection; rain, bridges, companionship and shelter | 白素貞、小青、許仙、法海. Select a textual version before episodes or rules. |
| 紅樓・風月入夢 | Seasonal collections; low-star efficiency, recovery and timing | HL-01 海棠詩社 selected above. 黛玉 unchanged; 熙鳳 reprint deferred. Collection versus booster remains open. |
| 三國・風起赤壁 | Alliances and competing commitments | Preserve 關羽、諸葛亮、貂蟬; consider 劉備、張飛、趙雲、曹操、周瑜、孫尚香. Separate novel portrayal from history. |
| 水滸・夜雨江湖 | Fellowship, difficult choices and rough humour | Preserve 魯智深/武松; consider 林沖、宋江、李逵、扈三娘. Fix the textual edition. |
| 山海・同行拾光 | Original-companion stories and new AA scenes | 青霄、霜璃、渡影 and the existing cast retain a place alongside literary expansions. |

Across the programme, series are not new factions. Preserve the four-faction,
eight-distinct-character/25-star deck structure unless a later reviewed rules
change explicitly replaces it. Existing named characters receive new printings
of their existing identities. Alternate art depicts another moment—燕赤霞 after
sheathing his sword, 聞仲 looking back during a march, 湘雲 resting among flowers—
without increasing combat stats. See [BOOSTER-SERIES](docs/BOOSTER-SERIES.md) for
the three initial numeric card sketches and the editorial/art contract.

**M4.6 · Campaign and repeatable activities:** all 48 continuation stages and
standard 火焰山 are implemented locally; see the
[rules, budget and validation boundary](docs/CAMPAIGN-AND-EVENTS.md). New v5
state records seeds, supplies, exact-copy protections, pending reward grants,
tickets, weekly activity milestones and mastery without introducing a new
currency. The old 18 stages and four-stage Westward AA grant remain unchanged.
An initial 200-run mirrored-public-AI loaner probe cleared **16/200** runs;
this is reproducible tuning evidence, not a forecast of human success. Automated
browser acceptance is recorded in [VALIDATION.md](docs/VALIDATION.md); complete
human standard-mode playtests before selecting balance changes.
Advanced difficulty, event-specific art and seasonal rules remain planned;
real PvP/ranked stays on the M2/M3 authority track.

- Improve onboarding, explain four-round decisions and exact-card growth, and organize Traditional Chinese/English text without changing save identities. Playtest balance, daily pacing, travel encounters and pack odds before expanding rewards.
- Add new classical characters through explicit rules/content versions. Build per-card artwork manifests/derivatives with provenance; trial one card's CSS/Web Animations effects with reduced-motion, skip and background/resume support before scaling the art pipeline.
- If PvP is selected, add matchmaking and a server-owned arena ladder as a separate slice. Specify simultaneous hidden moves, timeout/abandonment, reconnection and match outcomes before ranking or seasonal rewards.

**Acceptance:** a new player completes a battle → travel/daily → backpack/upgrade loop without assistance, can explain a reveal and identify the exact copies that gained XP; repeated play remains brisk. Selected immersion packets preserve outcomes through mute, reduced motion, skip and interruption; assets and rules have reproducible versioned manifests; selected phone performance/accessibility targets are measured. PvP is complete only when two real clients finish/reconnect without exposing hidden moves, and duplicate settlements cannot change ranking or rewards twice.

### M5 · Mobile adaptation → iOS and Android closed beta

**Dependencies:** the approved [M4 game shell](docs/NAVIGATION.md) is the starting point. Touch and
native packaging experiments can run alongside M1–M4 using existing guest AI
play. A beta that includes accounts needs the M1 account lifecycle and verified
mobile backup/recovery; online progression additionally needs the applicable
M2–M3 contracts. Mobile adaptation does not depend on the collectible phases.

| Milestone | Planned work | Exit evidence |
| --- | --- | --- |
| **M5.1 · Phone gameplay** | Adapt the lobby, five labelled destinations, quest panel, exact-card decks, preparation and results for portrait phones. Check safe areas, thumb reach, readable cards, text scaling, keyboard/input and consistent Back/close behaviour. Retain the responsive browser layout. | A new player completes lobby → prepare/edit deck → battle → rewards → next encounter on a physical iPhone and Android phone. Record screen sizes and accessibility/performance observations. |
| **M5.2 · Native build trial** | Finish the native toolchain/signing setup and trial the existing Capacitor direction with only allowlisted bundled assets. Add durable storage/migration, Android back handling, lifecycle and audio recovery. | Development builds on both platforms preserve exact UIDs, XP and pending matches through cold starts, upgrades, backgrounding and process termination; no duplicate payouts. Decide whether the shared UI meets measured device targets before considering a rewrite. |
| **M5.3 · Closed beta** | Produce iOS TestFlight and Google Play testing builds for the selected ordinary-card feature set. Adapt the existing email-code/explicit backup journey if accounts are included. Prepare onboarding, support/privacy information, account lifecycle, ratings, accessibility and release-specific data/plugin disclosures. | Signed beta builds pass the physical-device matrix, poor-network/offline and recovery checks. Record tester feedback and resolve blocking gameplay, save and usability issues. |

**Acceptance:** signed builds pass the agreed physical-device matrix, recover after interruption without losing cards or duplicating payouts, and meet measured performance targets. Record actual closed-beta/store review outcomes. NFT ownership granting playable rights on native remains a separate product decision, not an implied feature of the beta.

**Current status:** the shared lobby and navigation pass desktop/phone Chrome
emulation locally. Physical iPhone/Android checks, native projects, signing and
beta distribution remain planned. See [the mobile release plan](docs/MOBILE-RELEASE.md).

### Retired collectible launch phases

The former M6/M7 collectible rehearsal and commercial production-edition track
are retired as delivery objectives (2026-09-23). Their technical research is preserved in
[the dated roadmap history](docs/history/retired-commercial-direction-2026-09-23/ROADMAP.md.txt) and the design documents; it is not a
standing implementation queue. No sale, mint, paid plan or growth campaign is required.

**Blockchain planning review · 2026-09-23 (dated research):** earlier the same
day, the [blockchain implementation plan](docs/BLOCKCHAIN-IMPLEMENTATION-PLAN.md)
compared Solana with Ethereum/Base and proposed one minimal collectible contract,
indexer work and bounded packets, recording the owner's confirmation of limited
collectible cards with per-copy history while ordinary cards stay free to play.
The retirement above was committed later that evening and takes precedence; the
plan is preserved for understanding, not as an active issuance objective. If the
owner reopens collectibles, restart from that plan's dependencies rather than
from this roadmap.

### M7 · iOS / Android store release (optional, separately chosen)

**Dependencies:** M5 and review of the selected store flow. This track is a
freely chosen option after M5, without a date, quota or growth target.

- Graduate the tested builds to **Apple App Store and Google Play** submissions. Confirm launch territories, audience, minimum OS/device support, account ownership, the chosen feature set and current submission requirements. Prepare store screenshots/listings, support and release recovery; record each platform's review and rollout separately. Simultaneous launch is not assumed.
- Release only the accepted mobile feature set, with staged rollout and version compatibility. Monitor game balance, service health and support capacity.

**Acceptance:** actual store receipts, recovery evidence and operational ownership are recorded. A plan or passing emulator suite alone does not satisfy release readiness.

## Next tasks suitable for separate agents

These are bounded starting points, not instructions to start every phase at once. Give each file/module one writer and a separate reviewer.

| Task | Reviewable output | Dependency / boundary |
| --- | --- | --- |
| Portable account preview/deployment | Tracked setup/helper improvements, fresh-clone dry run, identity/binding checks and a next-release runtime verification procedure. | M1; follow [HOSTING.md](docs/HOSTING.md), preserve bound values and keep credentials private. |
| Account journey evidence | A short owner-driven public login/two-device restore procedure and recorded outcome, including unresolved browser/device issues. | M1; tools do not initiate real email without the user's instruction. |
| Online command contract | Request/response examples, authoritative tables/invariants, guest/online separation and a single battle sequence. | M1; no infrastructure purchase or migration application required for design. |
| Transaction adapter spike | One least-privilege transaction path with rollback, concurrent-start and duplicate-settlement tests. | Agreed contract; local isolated fixtures first. Coordinate schema ownership with the API author. |
| Online client adapter | One match/inventory UI using contract fixtures; clear offline versus online status and reconnect handling. | Agreed contract; can run alongside server implementation. No local-save promotion. |
| Content/animation sample | One card's original-art manifest, derivatives and reduced-motion animation, with measured payload/render cost. | Independent M4 task; preserve the existing asset fallback. |
| Mist Gate playtest and next polish | Review the local 霧隱渡口 arrival → reveal → exact-copy XP → next/retry slice; tune audio and pace, then select a small follow-up from [IMMERSION.md](docs/IMMERSION.md). | M4.1–M4.2 local slice is implemented; human/device evidence remains open. Preserve hidden bids, accepted results and single settlement; coordinate `app.mjs` ownership. |
| Campaign/activity playtest | Build on recorded automated viewport/browser acceptance; play all six volumes and compare owned/loaner 火焰山 difficulty, supply choices and reward pace. | M4.6 local implementation; record human evidence separately from the 16/200 mirrored-AI probe. Preserve saved seeds, old grants and once-only settlement. |
| Phone gameplay validation | Run the approved lobby → deck → battle → rewards loop on physical iPhone/Android devices; record safe-area, Back, keyboard, text-scale and touch issues with screenshots. | M5.1; builds on the completed local navigation slice. |
| Mobile readiness report | Missing toolchain/signing prerequisites, Capacitor packaging experiment and an agreed physical-device/storage test matrix. | M5.2; preserve browser saves and distinguish packaged-build evidence from browser emulation. |

For the newly requested experience work, start with [Q0/Q1](#experience-quality-track)
and the independent Q4 catalogue audit. Portable operations and one authoritative
battle contract remain the online track; local quality work need not wait for
them. Record each finished slice in the owning current-state/evidence documents
and advance this roadmap only when its acceptance criteria are demonstrated.

## Historical collectible research (no active launch objective)

The following preserves earlier design reasoning, not instructions to issue or sell collectibles.

Distinguish **character** (Wukong's rules), **edition** (a release/art treatment with a cap) and **copy** (one numbered card with owner and XP history). Different copies grow independently. The draft first-edition illustration remains **12 characters × 100 copies = 1,200 total**, for discussion only; it is not approved supply. Testnet cards are disposable and convey no mainnet allocation. Later chapters must state whether scarcity was promised per edition or across a character's entire lifetime.

Before issuance, freeze edition IDs, per-edition lifetime caps, total batch cap, art/metadata hashes, reserves and issuance permissions. Team, promotional and compensation allocations consume the same cap. Burning never restores mint capacity; later sale waves do not reset it. Start with one canonical production chain to keep total supply inspectable.

The first collectible pilot uses known contents. Keep ordinary earned-only random packs distinct from collectible inventory. Paid randomized NFTs, redeemable pack currency, a fungible game token and cash-out are not committed features.

The server records append-only XP against a stable card identity. A collectible adds `(chain, contract, tokenId)` and edition identity; transfer changes its owner while retaining that copy's XP/history. Define when the previous owner's use ends and the new owner's begins, including active matches, delayed indexing and reorgs. Native access depends on the selected product/store flow. Original art and supply commitments stay fixed; growth checkpoints are explicitly mutable, sequenced and recoverable. Public provenance can remain inspectable without promising that the game will operate after its service shuts down. See [BLOCKCHAIN-DESIGN.md](docs/BLOCKCHAIN-DESIGN.md).

## Decisions that change scope

| Decision | Working direction | Needed before |
| --- | --- | --- |
| Online economy entry | Fresh server-issued inventory; offline journeys remain preserved and editable. | M2 starter grant and progression contract. |
| Infrastructure/operations | Existing Workers + Supabase; one transactional command authority; expand services only from measured need. | Authoritative alpha rollout and any paid resource. |
| Audience and native product | iOS App Store and Android Google Play remain the selected native direction (2026-09-22), now an optional undated release; use the shared game shell and a Capacitor trial. Supported regions/ages and devices remain open; no paid scope is planned. | Closed beta/store disclosures. |
| Wallet and chain research | Retained as optional technical research; no active issuance objective. | Any new explicitly selected experiment. |
| Commercial editions | Retired delivery objective; old supply drafts create no entitlement. | No sale or marketplace is planned by this roadmap. |
| Name, artwork and source licensing | 萬象契 / Mythseal selected; original art with provenance; no open-source license selected. | Public licensing/commercial release; domain ownership does not establish trademark clearance. |

Web, API/rules, native binaries, artwork and contracts have separate releases. Use the [content/release pipeline](docs/CONTENT-RELEASE-PIPELINE.md) for compatibility and rollback design; rolling back a website cannot undo an economy settlement, published NFT or transferred ownership.


### WX-01 box follow-up · local, 2026-09-22

- [x] 12/24-pack boxes with unchanged per-pack price/odds, carried pity, 36/72 exact copies and 12/24 seals.
- [x] Atomic saved box receipts, sequential reveal, full grouped overview, skip and reload recovery.
- [x] Preview-only, once-per-journey 10,000-coin owner playtest supply; deliberate claim, excluded from public assets.
- [ ] Existing hosted rollout gates still apply; these changes are not deployed.

### 同名傳承 · local, 2026-09-22

- [x] Same-character base copies provide 80 EXP plus their existing EXP; any art treatment can receive it, up to the existing Lv.5 / 700 EXP cap.
- [x] Exact-copy material selection, level/EXP/expedition-stat preview, explicit irreversible confirmation and a quiet result animation.
- [x] Special art, locked cards, all saved decks, unfinished battle cards and unacknowledged rewards stay protected; no automatic selection or extra currency cost.
- [x] Fresh-save validation and one locked write preserve the receiving printing, serial and history. Wholly redundant materials are refused; partial overflow is disclosed.
- [ ] Playtest pacing across pack-opening, duplicate supply and the existing paid training route before rebalancing. Expanded journals and an authoritative online inheritance command remain future work.
- [ ] Public release follows the existing save/module and account rollout gates; this local feature is not deployed.

Rules and edge cases are recorded in [DESIGN.md](docs/DESIGN.md#同名傳承--local-2026-09-22).

### Character stacks and ink codex · local, 2026-09-22

- [x] Default character stacks with owned-copy/printing counts, cosmetic special-art covers, level ranges and protection summaries.
- [x] Expand into exact numbered copies, filter by owned printing, or switch to the flat layout; deck construction still chooses exact UIDs.
- [x] Numbered character codex with monochrome missing entries, chapter completion and all/collected/missing filters. Missing art stays monochrome when inspected.
- [x] Responsive layouts, keyboard focus/scroll restoration and derived ownership refresh, without save or economy changes.
- [ ] Public release remains behind the existing hosted rollout gates; these changes are local only.
