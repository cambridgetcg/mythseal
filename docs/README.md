# 萬象契 · Mythseal documentation library

Every file in `docs/` has one row below, grouped by subject, with a status from
the vocabulary that follows. The documents own the details; this index only
helps you find the right one. It does not change release state.

Last organized **2026-10-11** against `main` at `8afbabc`: 40 other Markdown
documents, one JSON snapshot and the archived `history/` folder.

## Status vocabulary

| Status | Meaning |
| --- | --- |
| `current` | Describes how `main` behaves or how a procedure works now. It does not certify that a live service is healthy today. |
| `mixed` | Current behavior and dated proposals in one document. Its own status lines say which parts exist. |
| `preview` | A standalone local design preview. It does not read saves, grant cards or ship publicly. |
| `proposal · date` | A dated design, plan or recommendation. It is not evidence that anything was built, provisioned or deployed. |
| `record · date` | Dated evidence, receipts or provenance. True as of its date; recheck it before relying on it now. |
| `retired · date` | A superseded or retired direction, kept for understanding. It is not a work queue. |

**Live** means the behavior is in the public v0.5.1 release. **Main only** means
it is in `main` source but not deployed. [HOSTING.md](HOSTING.md) owns which
version is actually live; a merge, push or documentation change deploys nothing.

## Find an answer quickly

| Question | Go to |
| --- | --- |
| Where do I start? | [AGENTS.md](../AGENTS.md), then the [handover](HANDOVER.md) |
| How do I set up and contribute? | [CONTRIBUTING.md](../CONTRIBUTING.md) and [Start a fresh checkout](HANDOVER.md#start-a-fresh-checkout) |
| Which checks fit my change? | [Checks matched to the change](HANDOVER.md#checks-matched-to-the-change) |
| What should I work on next? | [Next tasks for separate agents](../ROADMAP.md#next-tasks-suitable-for-separate-agents) and the [experience quality track](../ROADMAP.md#experience-quality-track) |
| What is deployed? | [HOSTING.md](HOSTING.md) release receipts |
| Which checks actually ran, and on what? | [VALIDATION.md](VALIDATION.md) |
| Who owns which source file? | [Code ownership map](HANDOVER.md#code-ownership-map) |

## Start here

| Document | What it covers | Status |
| --- | --- | --- |
| [Project overview](../README.md) | Play, run locally, feature summary, browser checks and the project map | `current` |
| [Working instructions](../AGENTS.md) | Repository conventions, authority limits and what every agent must preserve | `current` |
| [Contributing](../CONTRIBUTING.md) | Setup, module boundaries, proportionate checks and what stays out of Git | `current` |
| [Agent handover](HANDOVER.md) | Architecture, infrastructure and access map, fresh checkout, checks, release and the handoff template | `current`, with dated checkpoints |
| [Roadmap](../ROADMAP.md) | Shipped baseline, Q0–Q6 experience track, M1–M7 phases and bounded tasks with acceptance criteria | `mixed` |
| [Pull request template](../.github/pull_request_template.md) | The problem, validation and save/ownership/platform impact each PR states | `current` |

## Game rules and systems

| Document | What it covers | Status |
| --- | --- | --- |
| [Battle rules and prototype choices](DESIGN.md) | Four-round combat, hidden information, original-game ambiguities, atlas order, same-character inheritance | `current` · live, plus main-only additions |
| [Local progression and economy](PROGRESSION.md) | Travel, daily and weekly tasks, packs, NPC market and save migration (中文) | `current` · live, plus main-only additions |
| [Backpack, card copies and decks](BACKPACK.md) | Per-copy UID, XP and history, locks, three decks, sale and buyback (中文) | `current` · live since v0.4 |
| [Classical characters](CHARACTERS.md) | The twelve v0.3 classical cards: atlas positions, factions and roles (中文) | `current` · live since v0.3 |
| [Story volumes and modes](STORIES-AND-MODES.md) | The four-volume, 18-encounter slice, modes available now and the online-mode roadmap | `current` · main only; 2026-09-22 slice |
| [Campaign and activity](CAMPAIGN-AND-EVENTS.md) | 48 further campaign battles (66 encounters in all), 火焰山三連戰, rewards and the save/settlement contract | `current` · main only |
| [WX-01 西行・萬象初章](EXPANSION-WX01.md) | 15 new rules cards, 29 printings, cosmetic 領契 prints, the booster and the v4 save | `current` · main only |
| [WX-01 drop rates](WX01-DROP-RATES.md) | Pack odds, rarity floor, twelve-pack pity, box opening and the analytical model | `current` · main only |

## Interface and game feel

| Document | What it covers | Status |
| --- | --- | --- |
| [Game lobby and navigation](NAVIGATION.md) | Five destinations, return paths, the encounter loop, viewport scenes and checks | `current` · main only |
| [Battle table visibility](BATTLE-LAYOUT-PLAN.md) | Q0's single battle table: the 2026-09-23 plan and the 2026-10-10/11 implementation record | `current` · main only; merged in PR #5, though its status line predates the merge |
| [Immersion and game feel](IMMERSION.md) | Creative direction; Mist Gate and the life, pill and clash presentation; further ideas to playtest | `mixed` · 2026-09-22 |
| [Map-piece prototype](MAP-PIECE-PROTOTYPE.md) | 青玉行旅棋 map movement, comfort boundaries and the studio handoff; placeholder art | `current` · main only; 2026-09-23 |

## Literary sets and previews

| Document | What it covers | Status |
| --- | --- | --- |
| [LZ-01 聊齋・燈下有靈](EXPANSION-LZ01.md) | Twelve-character candidate design and the `/liaozhai.html` preview | `preview` · 2026-09-23, updated 2026-10-10 |
| [HL-01 紅樓・風月入夢](EXPANSION-HL01.md) | Eight-card 海棠詩社 design and the `/honglou.html` preview | `preview` · 2026-09-23 |
| [Literary booster programme](BOOSTER-SERIES.md) | Pack types, editorial direction and first stat sketches for literary sets (中文) | `proposal · 2026-09-23` |

## Experience quality track

[ROADMAP](../ROADMAP.md#experience-quality-track) owns priority and status for Q0–Q6.

| Document | What it covers | Status |
| --- | --- | --- |
| [Experience lessons](EXPERIENCE-LESSONS.md) | Lessons from the RXSG restoration, turned into player-facing decisions | `proposal · 2026-09-29` |
| [Experience modules](EXPERIENCE-MODULES.md) | Proposed Q0–Q6 module contracts, existing seams and infrastructure | `proposal · 2026-09-29`; Q0 since implemented (see the battle table above) |

## Accounts, operations and evidence

| Document | What it covers | Status |
| --- | --- | --- |
| [Accounts and private backups](ACCOUNTS.md) | 旅程閣 sign-in, backup contents, the session and storage boundary, and email setup | `current` · live in v0.5.1 |
| [Hosting, releases and rollback](HOSTING.md) | Public boundary, build and deploy procedure, rollback and exact deployment receipts | `current` procedure, with dated receipts |
| [Validation log](VALIDATION.md) | Which checks ran, when, on which commit and in which environment; newest first | `record`, dated per entry |
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
| [iOS and Android release plan](MOBILE-RELEASE.md) | Native packaging route, store-policy notes and phases; native release is now optional | `proposal · 2026-09-22`; policy research 2026-09-21 |
| [Content release pipeline](CONTENT-RELEASE-PIPELINE.md) | Art versions, animation budget and compatible release manifests (中文) | `proposal · 2026-09-21` |

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
| [Original character art and travel map](ART.md) | Exact prompts for the original twelve-portrait atlas and the six-realm map | `record · 2026-09-21` |
| [Classical portrait atlas](ART-CLASSICS.md) | Prompt and inspection notes for the v0.3 classical atlas | `record · 2026-09-21` |
| [Story-map artwork](ART-STORIES.md) | Prompts for the 西遊, 封神 and 白蛇 volume maps | `record · 2026-09-22` |
| [WX-01 production artwork](ART-WX01.md) | Prompts for four base atlases and ten special illustrations | `record · 2026-09-22` |
| [西行 special-print studies](ART-EXPANSION.md) | Three Wukong studies (異畫, 墨卷, 天工) shown in `atelier.html` | `record · 2026-09-22` |
| [HL-01 art studies](ART-HL01.md) | Prompts and integrity notes for the 紅樓 preview art | `record · 2026-09-23` |
| [LZ-01 art studies](ART-LZ01.md) | Prompts for the 聊齋 preview art, plus six briefs for special prints not yet generated | `record · 2026-09-23`; briefs 2026-10-10 |

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
