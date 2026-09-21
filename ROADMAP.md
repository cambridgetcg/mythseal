# 萬象契 · Mythseal roadmap

Planning baseline: **2026-09-21 · v0.5.0 deployed with private journey backups; public email login gated**. The selected brand is **萬象契 / Mythseal**; the private repository is `cambridgetcg/mythseal`. The game is deployed at [mythseal.com](https://mythseal.com), with normal DNS, HTTPS and the `www` redirect verified. [HOSTING.md](docs/HOSTING.md) records deployed revisions and exact checks. [NAMING.md](docs/NAMING.md) preserves the earlier shortlist and pre-purchase domain snapshot.

This document describes intended work, not a token offering. Native launch dates, team size, backend budget, production chain and mint quantities remain uncommitted. The [technical plan](docs/TECHNICAL-PLAN.md) coordinates the proposed [backend](docs/BACKEND-STACK.md), [NFT stack](docs/NFT-STACK.md) and [content/release pipeline](docs/CONTENT-RELEASE-PIPELINE.md).

## Product direction

An Eastern mythic strategy card game with four-round duels, travel, daily progression and cards that develop their own history. Characters draw from Chinese mythology, literature and history. The intended collectible model gives each limited-edition card a verifiable identity and ownership record; its earned experience follows that particular card when transferred.

Target clients: browser, **iOS and Android**. Blockchain is intended for scarce collectible issuance and ownership; ordinary battles should resolve promptly without a wallet confirmation or blockchain transaction every turn. A backend will validate battle outcomes and card growth. This hybrid model does not make the whole game decentralized.

**Mobile product decision still required:** the desired transferable, playable NFT card model cannot simply be assumed to qualify for both app stores. Apple's current NFT rule limits ownership unlocking app functionality; Google's policy restricts paying for random NFTs of unknown value. The first mobile milestone therefore proves the game with ordinary earned cards. Whether NFT-linked progression is web-only, separately represented as collectible history, or part of a specifically accepted native flow must be resolved before selling NFTs. This is an open decision about the requested feature, not a claim that collectible-only NFTs already fulfill it. See the dated [mobile policy analysis](docs/MOBILE-RELEASE.md) and the official [Apple](https://developer.apple.com/app-store/review/guidelines/#in-app-purchase) / [Google](https://support.google.com/googleplay/android-developer/answer/13607354?hl=en) rules.

## What exists today

- [x] Playable browser game with 24 characters, arena, six travel locations, daily tasks, earned-coin packs and NPC trading.
- [x] Individual local card IDs, levels, XP, battle records, protected sale/buyback and three saved decks.
- [x] v2→v3 save migration with old keys retained; pending battle recovery and single-use rewards.
- [x] Deterministic unit coverage and four local browser scripts, including desktop/mobile layouts; recorded results are in [VALIDATION.md](docs/VALIDATION.md).
- [x] Private GitHub repository created and renamed to `cambridgetcg/mythseal`; selected brand 萬象契 / Mythseal.
- [x] Owner acquired `mythseal.com`; Cloudflare zone active.
- [x] v0.4.1 deployed: HTTPS apex, all HTTP/`www` canonical 308 redirects, 15 asset hashes, security headers/JS MIME and nine private-path 404 checks verified; live desktop battle and mobile emulation passed. DNS propagation limits are recorded in [HOSTING.md](docs/HOSTING.md).
- [x] v0.5.0 journey archive UI and private offline backup API; London Free Supabase schema, account isolation and revision checks. Resend domain verification and Supabase SMTP/templates are configured; the owner confirmed mailbox delivery/local-pilot login. Public activation is prepared for v0.5.1 but not yet deployed. See [account status](docs/ACCOUNTS.md).
- [ ] Public email delivery, authoritative online economy, matchmaking and real player transfers.
- [ ] Native builds, signing, TestFlight/Play testing, app-store submission or release.
- [ ] Wallets, smart contracts, token ownership, production minting or NFT marketplace.

Current local saves and card IDs are **not** blockchain assets or entitlement to a future mint. See [validation evidence](docs/VALIDATION.md).

## Delivery milestones

| Stage | Deliverables | Evidence required to move on |
| --- | --- | --- |
| **M0 · Brand and public playable prototype** | Private `cambridgetcg/mythseal` source; 萬象契 / Mythseal identity; allowlisted static build; assets-only Cloudflare host at `mythseal.com`; `www` redirect; unit/syntax/build CI; original-art provenance. Existing local folder and save namespaces remain compatible. | Repository visibility/commit verified; static artifact excludes internal files; HTTPS/assets/redirect tested and recorded in HOSTING.md; CI result separate from local browser checks. Static hosting does not imply a trusted backend. |
| **M1 · Game alpha and portable clients** | Balance/economy sessions; onboarding and clear card growth; save export/import; English + Traditional Chinese text structure; mobile touch/audio/safe-area work; small Capacitor iOS/Android trial using the existing engine. | New players complete a full loop without assistance; real-device lifecycle/resume tests; migrations retain their cards. Select wrapper or a later native renderer from measurements. |
| **M2 · Authoritative online foundation** | Proposed Workers API + Supabase Postgres/Auth; accounts and recovery, cloud saves, globally unique server card identities, server-executed battles, idempotent ledger, atomic in-game transfers, inventory/deck invalidation and account deletion. Hyperdrive + pg is the proposed transactional adapter. | Multi-device and concurrent-trade tests; forged local state cannot create currency, XP or collectible entitlement; backup restore demonstrated. Guest play remains available where practical. No backend service is provisioned by the static-host release. |
| **M3 · Mobile closed beta** | Signed iOS/TestFlight and Android testing builds; native polish; account lifecycle, support/privacy pages, store disclosures and an explicit feature/payment matrix by storefront. First beta uses ordinary earned cards. | Device testing plus store review of the actual flow; crash/performance evidence; recovery/delete-account and purchase restoration if purchases are introduced. A web wrapper alone is not the acceptance test. |
| **M4 · Collectible testnet** | Evaluate Base Sepolia with unique-copy ERC-721; Polygon Amoy fallback; wallet/recovery choice; capped edition contract; metadata/provenance service; confirmed ownership indexer; XP-to-token proof of concept; fixed-content test editions; marketplace transfer simulation. | Supply invariants, replay protection, reorg recovery, transfer-during-battle and XP continuity tests; no real funds; explicit decision on mobile utility before expanding native integration. These are candidates, not deployed networks/contracts. |
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
| Brand/domain | **Selected and deployed:** 萬象契 / Mythseal; private repo renamed; `mythseal.com` acquired and hosting live. | DNS cache propagation, target-store/title checks and trademark review. Domain ownership is not name clearance. |
| Web/backend | **Deployed:** Cloudflare assets/account Worker plus Free Supabase in London for private offline backups. Authoritative commands still propose Hyperdrive/pg. | Public email activation, recovery, authoritative economy, measured load and any future paid-service budget. Compare alternatives in BACKEND-STACK.md. |
| Mobile architecture | Trial Capacitor around the current web client and pure engine. | Real-device performance and native UX evidence; no rewrite by default. |
| Gameplay and NFT relationship | Preserve transferable per-card history as the goal; prove store-compatible access separately. | Exact native functionality and whether the NFT gameplay loop initially lives on web. |
| Chain/token standard | Evaluate Base Sepolia + ERC-721 first; keep Polygon Amoy as fallback. | Fees, finality, wallet recovery, operations, indexer support and contract audit. No contract deployed or production network selected. |
| Wallet custody | Offer ordinary account onboarding; evaluate optional wallet linking/recovery. | Custodial vs non-custodial responsibilities, regions, account loss and age handling. |
| Economy | No required fungible game token. Scarcity concerns editions, not a promise of resale value. | Supply, pricing, rewards, reserves, art rights and supported markets before any sale. |

## Next implementation slice

The v0.5.0 slice adds account-private backups of the existing offline journey. Resend verified all five domain records at 21:15:31 UTC on 2026-09-21; Supabase custom SMTP and both numeric-code templates passed settings readback at 21:16:00.449 UTC. The owner confirmed a delivered numeric code and successful local-pilot login at **21:18:34.252 UTC**. Source v0.5.1 enables OTP for the next release; live v0.5.0 remains gated until deployment. These backups preserve local progress across devices without promoting it to trusted game ownership. Next, implement a separate sign-in → server match → exact-card XP settlement slice for M2. M1 onboarding, localization and a small native packaging experiment can proceed independently. Artwork and animation changes follow the versioned [content pipeline](docs/CONTENT-RELEASE-PIPELINE.md).
