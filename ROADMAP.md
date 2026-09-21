# From 山海弈 to a mobile, collectible card world

Planning baseline: **2026-09-21 · prototype v0.4**. Working title: **山海弈 / Shanhai Duel**. Brand candidates live in [NAMING.md](docs/NAMING.md). This document describes intended work, not a launch announcement or token offering; dates, team size, budget, chain and production mint quantities remain uncommitted.

## Product direction

An Eastern mythic strategy card game with four-round duels, travel, daily progression and cards that develop their own history. Characters draw from Chinese mythology, literature and history. The intended collectible model gives each limited-edition card a verifiable identity and ownership record; its earned experience follows that particular card when transferred.

Target clients: browser, **iOS and Android**. Blockchain is intended for scarce collectible issuance and ownership; ordinary battles should resolve promptly without a wallet confirmation or blockchain transaction every turn. A backend will validate battle outcomes and card growth. This hybrid model does not make the whole game decentralized.

**Mobile product decision still required:** the desired transferable, playable NFT card model cannot simply be assumed to qualify for both app stores. Apple's current NFT rule limits ownership unlocking app functionality; Google's policy restricts paying for random NFTs of unknown value. The first mobile milestone therefore proves the game with ordinary earned cards. Whether NFT-linked progression is web-only, separately represented as collectible history, or part of a specifically accepted native flow must be resolved before selling NFTs. This is an open decision about the requested feature, not a claim that collectible-only NFTs already fulfill it. See the dated [mobile policy analysis](docs/MOBILE-RELEASE.md) and the official [Apple](https://developer.apple.com/app-store/review/guidelines/#in-app-purchase) / [Google](https://support.google.com/googleplay/android-developer/answer/13607354?hl=en) rules.

## What exists today

- [x] Playable browser game with 24 characters, arena, six travel locations, daily tasks, earned-coin packs and NPC trading.
- [x] Individual local card IDs, levels, XP, battle records, protected sale/buyback and three saved decks.
- [x] v2→v3 save migration with old keys retained; pending battle recovery and single-use rewards.
- [x] 107 deterministic unit tests and four local browser scripts, including desktop/mobile layouts.
- [x] Private GitHub repository created; CI configuration and design documents prepared.
- [ ] Accounts, backend, cloud saves, online matchmaking and real player transfers.
- [ ] Native builds, signing, TestFlight/Play testing, app-store submission or release.
- [ ] Wallets, smart contracts, token ownership, production minting or NFT marketplace.

Current local saves and card IDs are **not** blockchain assets or entitlement to a future mint. See [validation evidence](docs/VALIDATION.md).

## Delivery milestones

| Stage | Deliverables | Evidence required to move on |
| --- | --- | --- |
| **M0 · Private development foundation** | Source/assets/docs in private GitHub; reproducible run instructions; unit/syntax CI; original-art provenance; brand shortlist. | Remote visibility and commit verified; CI result recorded separately from local browser checks. |
| **M1 · Game alpha and portable clients** | Balance/economy sessions; onboarding and clear card growth; save export/import; English + Traditional Chinese text structure; mobile touch/audio/safe-area work; small Capacitor iOS/Android trial using the existing engine. | New players complete a full loop without assistance; real-device lifecycle/resume tests; migrations retain their cards. Select wrapper or a later native renderer from measurements. |
| **M2 · Authoritative online foundation** | Accounts and recovery, cloud saves, globally unique server card identities, validated battle/XP results, idempotent ledger, atomic in-game transfers, inventory/deck invalidation and account deletion. | Multi-device and concurrent-trade tests; forged local state cannot create currency, XP or collectible entitlement; backup restore demonstrated. Guest play remains available where practical. |
| **M3 · Mobile closed beta** | Signed iOS/TestFlight and Android testing builds; native polish; account lifecycle, support/privacy pages, store disclosures and an explicit feature/payment matrix by storefront. First beta uses ordinary earned cards. | Device testing plus store review of the actual flow; crash/performance evidence; recovery/delete-account and purchase restoration if purchases are introduced. A web wrapper alone is not the acceptance test. |
| **M4 · Collectible testnet** | Token-standard/chain decision record; wallet connection and recovery choice; capped edition contract; metadata/provenance service; ownership indexer; XP-to-token proof of concept; fixed-content test editions; marketplace transfer simulation. | Supply invariants, replay protection, reorg recovery, transfer-during-battle and XP continuity tests; no real funds; explicit decision on mobile utility before expanding native integration. |
| **M5 · Limited-batch production readiness** | Final supply manifest and artwork terms; account/contract/metadata review; independent contract audit; permission/key procedures; monitored launch rehearsal; supported-market and payment review. | No unresolved critical/high security findings; mint cap cannot be bypassed by another mint path, burning or privileged supply changes; recovery plan tested; exact mobile/web product accepted for intended distribution. |
| **M6 · First edition and mobile release** | Launch only the accepted mobile feature set; release the approved fixed-content collectible batch through its approved channel; publish supply/provenance and support information; measure retention and economy health. | Verified contracts and counted issued/reserved stock; successful store release; support and ownership reconciliation operational. Further batches require a separate manifest and release review. |

M1 and M2 can overlap; the client trial does not require choosing a chain. M4 design can run alongside M3, but testnet success does not authorize a production mint. Mobile release can precede the NFT edition if the ownership-linked gameplay decision remains open.

## Limited quantities: proposed edition model

Distinguish **character** (Wukong's rules), **edition** (a particular release/art treatment with a cap), and **copy** (one numbered card, owner and XP history). Different copies of the same character grow independently. A new edition is identified openly; it must not silently dilute a promised character-wide or edition-wide limit.

Draft illustration for discussion, **not an approved supply**:

| Edition | Illustrative cap | Delivery |
| --- | --- | --- |
| Testnet rehearsal | Small disposable test set | Free test tokens, clearly unrelated to mainnet supply. |
| First classical edition | 12 characters × 100 numbered copies = 1,200 total | Known card contents; serials within each character edition; allocations for team/promotions included inside the same cap. |
| Subsequent chapters | Quantities decided and published separately | New, clearly labeled edition IDs/art, with a stated relationship to earlier scarcity promises. |

Before production, freeze a manifest with edition IDs, per-edition lifetime caps, total batch cap, art/metadata hashes, any reserves, release windows and issuance permissions. Every mint route consumes the same cap. Burning never creates new mint capacity. Multiple sale waves share the original edition cap; they do not reset it. Prefer one production chain initially so cross-chain copies cannot obscure total supply.

For the first collectible pilot, use known-content acquisition. Keep the current randomly drawn **ordinary, earned-only, non-redeemable cards** separate from NFT stock. Paid randomized NFT packs are not a committed feature; future implementation would require a distinct platform/product decision. Do not sell currency that indirectly buys an NFT chance under a different label.

## Card history and transfer

The current NPC buyback proves local continuity. Real ownership adds the following work:

1. The server issues globally unique card records and append-only XP events. A client cannot submit a trusted finished result or edit its own balance.
2. A collectible binds to `(chain, contract, tokenId)` and a published edition. XP, battle record and metadata revisions refer to that stable identity, independent of the current owner.
3. A confirmed transfer invalidates the old owner's deck/use rights in the applicable product, keeps XP on the card and permits the new owner to use it only under the selected client/store policy. Define the precise behavior for an active battle, a listing, delayed confirmations and a chain reorganization.
4. Original art, edition and supply commitments remain fixed; growth fields are intentionally mutable and versioned. Export enough provenance and signed history that ownership remains inspectable if the game service is unavailable; this does not promise a playable game after shutdown.

Detailed alternatives, trust boundaries and future test invariants are in [BLOCKCHAIN-DESIGN.md](docs/BLOCKCHAIN-DESIGN.md).

## Decisions before implementation

| Decision | Current recommendation | Still to resolve |
| --- | --- | --- |
| Brand/domain | Prefer a distinctive name that can include mythology and historical/literary figures. | Owner selection, store/title searches, trademark review and registrar purchase. No domain purchased. |
| Mobile architecture | Trial Capacitor around the current web client and pure engine. | Real-device performance and native UX evidence; no rewrite by default. |
| Gameplay and NFT relationship | Preserve transferable per-card history as the goal; prove store-compatible access separately. | Exact native functionality and whether the NFT gameplay loop initially lives on web. |
| Chain/token standard | Compare EVM networks with unique-copy ERC-721 as a starting design. | Fees, finality, wallet recovery, operations, indexer support and contract audit. No network selected. |
| Wallet custody | Offer ordinary account onboarding; evaluate optional wallet linking/recovery. | Custodial vs non-custodial responsibilities, regions, account loss and age handling. |
| Economy | No required fungible game token. Scarcity concerns editions, not a promise of resale value. | Supply, pricing, rewards, reserves, art rights and supported markets before any sale. |

## Next implementation slice

Start M1 with a browser save-import flow, onboarding, text localization structure and a small native packaging experiment. In parallel, specify M2's account/card/XP/transfer data model and test it with concurrent synthetic accounts. These steps improve the game and establish trustworthy card history before wallets or collectible issuance are added.
