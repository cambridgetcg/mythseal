# 萬象契 · Mythseal roadmap

**Current release: v0.5.1 is deployed at [mythseal.com](https://mythseal.com), with email login and private backups of the offline journey.** The source repository is private. Gameplay, rewards and card ownership remain editable local state; the account service does not make them authoritative.

Start with [HANDOVER.md](docs/HANDOVER.md) for repository orientation, infrastructure and the next agent's workflow. Use [HOSTING.md](docs/HOSTING.md) for deployed revisions, [ACCOUNTS.md](docs/ACCOUNTS.md) for actual account behavior, [CONNECTIONS.md](docs/CONNECTIONS.md) for service readiness and [VALIDATION.md](docs/VALIDATION.md) for evidence. This roadmap sets priorities and acceptance criteria; it does not authorize paid services, store enrollment, chain transactions or a sale. No release dates or production supply have been committed.

## Product direction

An Eastern mythic strategy card game with refined dark-fantasy artwork, four-round bluffing battles, travel, daily progression and cards with individual histories. Characters draw from Chinese mythology, literature and history, using original artwork and documented provenance. Target clients are browser, **iOS and Android**.

**Mobile launch direction confirmed · 2026-09-22:** develop Mythseal for release
as an **iOS game on the App Store and an Android game on Google Play**. The approved
five-destination lobby and encounter/deck/rewards loop form the shared interface
foundation. Adapt that experience for portrait phone play while retaining the
browser version. Physical-device validation, native packaging, closed beta and
store launch are planned milestones below; no launch date is set.

**Immersion direction requested · 2026-09-22:** enrich the world, tactile card/pill
feedback, hidden-bid reveals and attachment to individual card copies. The
[immersion design](docs/IMMERSION.md) proposes a quiet mythic world with decisive
battle moments, starting with one complete 霧隱渡口 encounter. The M4 packets below
are planned work; their creative details and later gameplay experiments remain
proposals to playtest.

The long-term goal is a limited-edition collectible that retains its identity and earned XP when traded. The backend should validate ordinary battles and growth promptly; players should not need a wallet confirmation or a chain transaction each turn. Blockchain would establish collectible issuance and ownership. Wallets, collectible rights and native gameplay must be designed together before promising playable NFT transfers across every platform.

The detailed [technical plan](docs/TECHNICAL-PLAN.md), [backend design](docs/BACKEND-STACK.md), [mobile plan](docs/MOBILE-RELEASE.md), [NFT stack](docs/NFT-STACK.md) and [content pipeline](docs/CONTENT-RELEASE-PIPELINE.md) explain the proposed architecture. Their original baseline and policy research are dated; the current-state documents above take precedence for what is implemented. Recheck platform requirements when selecting an actual release flow.

## Shipped baseline and its limits

| Area | Implemented | Still absent or unverified |
| --- | --- | --- |
| Game loop | 24 characters; local AI battles/arena; six travel locations; daily tasks/training; earned-coin packs; NPC sale and buyback. | Server-validated rewards, competitive ladder, matchmaking and player-to-player trading. |
| Backpack | Per-copy UID, XP, level, battle history and protection; three exact-card decks; legacy save migration and pending-battle recovery. NPC buyback keeps the same copy and XP. | Server-issued card identities and transferable ownership. Local UIDs confer no future mint entitlement. |
| Accounts | Public numeric email-code login, secure server sessions, explicit private backup/upload/restore, revision conflicts and backup deletion. Guest play is preserved. | Automatic synchronization/merging, full account deletion and a complete account-recovery/support flow. Backup deletion is not account deletion. |
| Backup boundary | At most 2,000 owned plus merchant-held copies and 512 KiB PostgreSQL JSONB text; pending battles cannot be uploaded or replaced. Hosted isolation/conflict/boundary checks passed. | A mailbox-delivered login through the public browser and physical cross-device restoration remain unverified. The owner confirmed mail delivery and login through the local pilot; synthetic hosted API checks are separate evidence. |
| Delivery | Private GitHub source/CI; Cloudflare static assets plus account API; Free Supabase development project; configured Resend SMTP. | An authoritative game database/API, production operations/recovery readiness and native store releases. |
| Future tooling | Capacitor/toolkit preparation, read-only chain/Pinata checks and a local contract fixture. | Native builds/signing, a deployed game contract, wallet integration, IPFS persistence/restore and any NFT issuance. |

Preserve `shanhai.*` save namespaces and existing guest progress throughout the following phases. A local save or cloud backup must never become trusted currency, competitive XP, ownership or a mint claim merely because its owner signs in.

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

**Dependencies:** M1 online contract and starter-grant decision. This is the next gameplay implementation priority; the entire future economy is not a prerequisite.

- Add an isolated authoritative schema with server-issued card UIDs, versioned rules, matches and append-only XP/reward events. Select one transactional adapter using the [backend design](docs/BACKEND-STACK.md); Hyperdrive/pg remains proposed, not deployed.
- Implement sign-in → read starter inventory → start AI match → submit four rounds → settle once. Reuse pure rules, inject controlled randomness in tests, freeze the participating UIDs/rules version and keep hidden choices private.
- Add a client adapter and one playable online path. Commands submit player choices; they never submit a trusted winner, XP total or replacement inventory. Preserve the existing offline mode and backups.
- Prove request retries, disconnect/resume, concurrent commands and a settlement retry cannot pay twice or move XP to a different copy. Reject forged ownership, stale card state and invalid turns.

**Acceptance:** two devices can resume the same server match and read the same resulting cards; each played copy receives the correct XP exactly once; local edits grant nothing online. Tests cover transaction rollback and duplicate commands, followed by a deployed integration check with disposable fixtures and verified cleanup.

### M3 · Move the daily economy online, then add player trading

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

**Immersion track (planned):** follow [IMMERSION.md](docs/IMMERSION.md) for the
player moments, first-encounter storyboard and implementation/validation seams.

| Packet | Planned experience | Exit evidence |
| --- | --- | --- |
| **M4.1 · Feedback foundation** | Tactile card/pill/commit cues, public-result presentation, persistent audio/motion/pace preferences and one faction/card sample using the existing DOM/art. | Normal, fast, skipped and reduced-motion paths show the same accepted result; hidden bids remain private and controls work with touch/keyboard. |
| **M4.2 · First immersive encounter** | One complete 霧隱渡口 journey: arrival/preparation → commitment → readable reveal/impact → exact-copy XP → next/retry. | Recorded playtests for clarity and repeat-play pace; interruption/reload cannot duplicate rewards or strand a match. Measure phone behaviour with M5. |
| **M4.3 · World and companion identity** | Distinct realm atmosphere, short guardian writing, clearer 同行記 and an earned-pack opening ritual; owned favourite-card display is an optional later selection. | Asset provenance/budgets and static/muted alternatives; any new memory derives from recorded events; no rule, rarity-odds or reward changes hidden inside effects. |
| **M4.4 · Encounter depth experiments** | Candidate training puzzles, distinct legal opponent playstyles and later encounter/route variants. | A bounded prototype with versioned content/rules, reproducible scenarios and balance/AI information-boundary evidence before adoption. Optional for initial mobile scope. |

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

### M6 · Limited-edition collectible rehearsal

**Dependencies:** authoritative card identity/history from M2–M3; an explicit rights/mobile decision; a selected owner-controlled wallet and recovery workflow. Local contract/content tests can proceed before any authorized testnet writes.

- Evaluate Base Sepolia and ERC-721 first, with Polygon Amoy as a measured fallback. Define wallet linking, recovery and asset exit without making wallets mandatory for ordinary play.
- Implement the capped edition contract and token-to-card mapping, then the ownership indexer and versioned XP checkpoints. Distinguish submission, confirmation and finality; handle replay, duplicate events, restarts and chain reorganizations.
- Package approved original art and edition metadata with immutable content identities. Verify two independent pin locations plus a restorable CAR backup before depending on IPFS availability. A Pinata read check does not satisfy this step.
- Rehearse known-content test editions and transfers using disposable test assets. Define active-battle and ownership-change behavior without assuming an in-game lock prevents an external ERC-721 transfer.

**Acceptance:** all mint paths obey lifetime caps; burning cannot reopen supply; replay/privilege tests pass. Rebuilding the index reproduces ownership, transferred copies retain the same history, and a primary pin/gateway outage permits full restoration. Record wallet recovery, finality and cost measurements against agreed targets from [NFT-STACK.md](docs/NFT-STACK.md). No real funds, production entitlement or launch approval follows from a successful testnet rehearsal.

### M7 · iOS / Android launch and collectible release

**Dependencies:** for mobile, M5 and review of the selected store flow; for collectibles, M6 plus the owner's separate choice of production network, supply, rights, budget, supported markets and sale scope. These release tracks can proceed independently.

- Freeze the edition/supply/art manifest and issuance permissions; independently review the contract and resolve critical/high findings. Rehearse key recovery, ownership reconciliation, incident response and content/database restoration.
- Publish clear rights, reserves, support and provenance for the approved known-content edition. Verify deployed code and every issued/reserved copy against its cap; subsequent chapters need separate manifests and review.
- Release only the accepted mobile feature set, with staged rollout and version compatibility. Monitor game balance, service health and support capacity. Mobile may launch before collectibles if the NFT gameplay decision remains open.
- For the mobile track, graduate the tested builds to **Apple App Store and Google Play** submissions. Confirm launch territories, audience, minimum OS/device support, account ownership, the chosen free/paid feature set and current submission requirements. Prepare store screenshots/listings, support and release recovery; record each platform's review and rollout separately. Simultaneous launch is not assumed.

**Acceptance:** actual deployment/store receipts, supply reconciliation, recovery evidence and operational ownership are recorded for the applicable release track. A plan, audit of a dependency or passing testnet suite alone does not satisfy production readiness.

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
| Immersion foundation and first encounter | Public-event presentation adapter, comfort controls and a complete 霧隱渡口 arrival → reveal → exact-copy XP → next/retry sequence; see [IMMERSION.md](docs/IMMERSION.md). | M4.1–M4.2; guest AI can proceed alongside backend work. Preserve hidden bids, accepted results and single settlement; coordinate `app.mjs` ownership. |
| Phone gameplay validation | Run the approved lobby → deck → battle → rewards loop on physical iPhone/Android devices; record safe-area, Back, keyboard, text-scale and touch issues with screenshots. | M5.1; builds on the completed local navigation slice. |
| Mobile readiness report | Missing toolchain/signing prerequisites, Capacitor packaging experiment and an agreed physical-device/storage test matrix. | M5.2; preserve browser saves and distinguish packaged-build evidence from browser emulation. |

Start with portable operations and the contract for one authoritative battle, not a simultaneous rewrite of accounts, economy, UI and chain services. Record each finished slice in the current-state/evidence documents and advance this roadmap only when its acceptance criteria are demonstrated.

## Limited quantities and transferable card history

Distinguish **character** (Wukong's rules), **edition** (a release/art treatment with a cap) and **copy** (one numbered card with owner and XP history). Different copies grow independently. The draft first-edition illustration remains **12 characters × 100 copies = 1,200 total**, for discussion only; it is not approved supply. Testnet cards are disposable and convey no mainnet allocation. Later chapters must state whether scarcity was promised per edition or across a character's entire lifetime.

Before issuance, freeze edition IDs, per-edition lifetime caps, total batch cap, art/metadata hashes, reserves and issuance permissions. Team, promotional and compensation allocations consume the same cap. Burning never restores mint capacity; later sale waves do not reset it. Start with one canonical production chain to keep total supply inspectable.

The first collectible pilot uses known contents. Keep ordinary earned-only random packs distinct from collectible inventory. Paid randomized NFTs, redeemable pack currency, a fungible game token and cash-out are not committed features.

The server records append-only XP against a stable card identity. A collectible adds `(chain, contract, tokenId)` and edition identity; transfer changes its owner while retaining that copy's XP/history. Define when the previous owner's use ends and the new owner's begins, including active matches, delayed indexing and reorgs. Native access depends on the selected product/store flow. Original art and supply commitments stay fixed; growth checkpoints are explicitly mutable, sequenced and recoverable. Public provenance can remain inspectable without promising that the game will operate after its service shuts down. See [BLOCKCHAIN-DESIGN.md](docs/BLOCKCHAIN-DESIGN.md).

## Decisions that change scope

| Decision | Working direction | Needed before |
| --- | --- | --- |
| Online economy entry | Fresh server-issued inventory; offline journeys remain preserved and editable. | M2 starter grant and progression contract. |
| Infrastructure/operations | Existing Workers + Supabase; one transactional command authority; expand services only from measured need. | Authoritative alpha rollout and any paid resource. |
| Audience and native product | iOS App Store and Android Google Play launches are confirmed product goals; use the shared game shell and a Capacitor trial. Launch regions/ages, free/paid scope, devices and dates remain open. | Closed beta/store disclosures; any collectible sale promise. |
| Wallet and production chain | Evaluate optional wallet recovery and Base Sepolia first; production choice remains open. | Testnet integration and later production issuance, separately. |
| Supply, rights and commercial terms | Known-content limited editions; no promised resale value or required fungible token. | Approved edition manifest, sale or marketplace. |
| Name, artwork and source licensing | 萬象契 / Mythseal selected; original art with provenance; no open-source license selected. | Public licensing/commercial release; domain ownership does not establish trademark clearance. |

Web, API/rules, native binaries, artwork and contracts have separate releases. Use the [content/release pipeline](docs/CONTENT-RELEASE-PIPELINE.md) for compatibility and rollback design; rolling back a website cannot undo an economy settlement, published NFT or transferred ownership.
