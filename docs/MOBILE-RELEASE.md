# iOS / Android release plan

Policy sources checked **2026-09-21**. This is a product and engineering plan, not a legal opinion or a promise of store approval. Recheck the linked policies when selecting launch regions, designing purchases and submitting each release.

## Current build and proposed route

The playable v0.4 build is a local browser game: 24 characters, four-round battles, individual card copies with XP, saved decks, exploration, daily tasks, game-coin packs and NPC trading. Its local UIDs are not NFTs. Browser saves are editable; there is no authoritative economy server, cloud account, player marketplace, wallet, smart contract, native application or store release. The checks in [VALIDATION.md](VALIDATION.md) cover the prototype, not those future systems.

**Recommendation: validate a Capacitor mobile build before considering a full UI rebuild.** Keep `engine.mjs`, `collection.mjs` and `progression.mjs` reusable, with platform adapters around storage, lifecycle, purchases and optional identity. Capacitor supports adding native projects to an existing JavaScript application; its setup expects packaged web assets with a root `index.html`. Our first packaging task would copy only game assets into a dedicated output directory. Dependencies would belong to the future mobile build; none are added by this plan. [Capacitor installation guide](https://capacitorjs.com/docs/getting-started).

| Route | Fit for this game | Decision gate |
| --- | --- | --- |
| Responsive web, then optional PWA | Fastest way to validate touch controls and the game loop using current code. | Useful beta channel; does not itself deliver App Store or Play distribution. Offline caching/installability would still need implementation. |
| Capacitor with bundled game assets | Reuses the current DOM/CSS presentation and pure JavaScript rules. Best first experiment for a turn-based card game. | Real iPhone and Android tests must establish reliable saves, acceptable rendering, lifecycle recovery and an app-quality experience. A wrapper does not guarantee review acceptance. |
| Native or cross-platform UI rebuild | A possible later investment if measured mobile limitations require it. | Rebuild only after documenting the failing performance, accessibility or interaction requirement. Preserve engine test vectors; avoid creating two drifting battle rulesets. |

Capacitor warns that WebView `localStorage` can be evicted and describes Preferences as suitable for small data, with database options for larger stores. Introduce a tested storage adapter, atomic save migrations and recovery/export before mobile beta. Use an authoritative server for anything with real scarcity or value; changing the device storage API cannot make client balances trustworthy. [Capacitor storage guidance](https://capacitorjs.com/docs/guides/storage).

## Store rules that affect the product

### Apple

The current App Review Guidelines establish these relevant boundaries:

- **3.1.1:** digital feature purchases generally use IAP. IAP can sell NFTs and related minting, listing or transfer services. Users may view owned NFTs, but ownership must not unlock app features or functionality. Purchased random virtual items require advance odds disclosure.
- **3.1.1(a):** US storefront apps can currently include external purchase calls to action without the specified entitlement. Elsewhere, regional permissions and terms matter; there is no worldwide permission to add a web checkout button.
- **3.1.5:** virtual-currency storage apps require organization enrollment; exchange functionality also has territory-specific licensing conditions.
- **4.2:** a repackaged website alone is insufficient; the app needs substantive entertainment or utility and an appropriate experience.

These are separate constraints: payment-link permission does not itself authorize NFT-gated gameplay. [Apple App Review Guidelines, §§3.1.1, 3.1.1(a), 3.1.5 and 4.2](https://developer.apple.com/app-store/review/guidelines/).

### Google Play

The blockchain policy requires a Financial features declaration when an app sells or lets users earn tokenized assets, plus identification of tokenized assets in applicable in-app product details. It prohibits marketing that glamorizes potential earnings. Ordinary apps outside the permitted gambling routes cannot accept anything of monetary value for a chance at an NFT of unknown value; undisclosed NFT bundles are an explicit violation. Purchased NFTs should have in-game use or enhancement, and cannot be wagered for real-world-value prizes. Publishing ordinary loot-box odds does not remove these NFT-specific restrictions. [Google Play blockchain-based content policy](https://support.google.com/googleplay/android-developer/answer/13607354?hl=en).

Digital goods generally require Play Billing unless a policy exception or applicable enrolled program permits another route. Price and charge disclosures must be accurate. Purchased randomized virtual items need odds presented close to the purchase. External links, WebViews and account-creation flows are not automatic payment exceptions. [Google Play Payments policy, §§2, 4, 6–9](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en).

Wallet classification needs its own review. Google's country-specific exchange/software-wallet policy presently excludes non-custodial wallets from that specific policy; this is not an exemption from all policies or local requirements. Select custody and target countries before deciding which declarations or supporting documents apply. [Google Play exchange and software-wallet guidance](https://support.google.com/googleplay/android-developer/answer/16329703).

### Regions and changing payment terms

Do not derive purchase eligibility from language, IP address or the developer's home country. Build a documented matrix of distribution territory, applicable storefront/program, game eligibility, account enrollment, payment flow, reporting, fees, refunds and age restrictions. Use platform-supported eligibility checks in the eventual implementation.

Apple's EU page announces revised terms taking effect **2026-10-01**, after this document's check date, and describes the transition from existing agreements. A release after that date must reassess the actual agreement accepted by the developer account. Do not budget using an old EU fee model or assume external checkout is fee-free. [Apple: changes for apps in the EU](https://developer.apple.com/support/apps-in-the-eu).

Google's user-choice-billing programs distinguish games from other apps: its listed EEA and Japan routes include games, while several other listed markets, including the UK, are non-gaming-only under that particular program. Korea and India have separate game-eligible programs. These are examples requiring verification, not a final launch-country list. [User-choice-billing eligibility](https://support.google.com/googleplay/android-developer/answer/13821247).

Google's US external-content-link program requires enrollment and API integration; its current notice sets transaction reporting and service fees to begin **2026-10-01**. The separately named external-payments program covers Japan and has its own enrollment, API and billing requirements. Do not interchange these programs or assume external sales avoid store fees. [US external content links](https://support.google.com/googleplay/android-developer/answer/16470497?hl=en), [Japan external payments program](https://support.google.com/googleplay/android-developer/answer/16787536?hl=en).

## Proposed first mobile release

The following are design recommendations based on the rules above, not confirmed store decisions:

1. Ship a complete free card game with optional account backup later. Keep daily rewards, NPC trading and packs in earned-only game coins; the first release has no purchased coins, cash-out, token redemption, wagering or transferable-money prizes.
2. Keep ordinary playable instances separate from optional collectible ownership. A provenance/gallery view is a candidate for review, not guaranteed approval. Design token transfers without granting or revoking gameplay entitlements.
3. Preserve exact-card growth in the game economy. If transferring a token must transfer playable access and trained XP to its new owner, resolve that platform conflict before promising it. Renaming a token a certificate does not resolve the conflict.
4. For any later collectible sale, start the design discussion with a known card and edition, visible supply cap, serial, fixed offer and stated rights. Do not convert the existing mystery packs into paid random NFTs. Fixed contents reduce one policy problem; they do not automatically approve the sale, marketplace or gameplay use.
5. If ordinary mobile monetization is wanted sooner, evaluate clearly described non-tokenized, non-random products through the applicable store billing route. Keep that decision independent of chain selection. Test delivery, restoration where applicable, refunds and duplicate callbacks before release.

See [BLOCKCHAIN-DESIGN.md](BLOCKCHAIN-DESIGN.md) for the proposed separation of game instances, authoritative ownership and limited editions. No chain, collection size, token sale, custody provider or deployment is selected here.

## Phases and exit evidence

| Phase | Future deliverable | Evidence required before proceeding |
| --- | --- | --- |
| 1. Mobile web validation | Touch-friendly battle, backpack, market and map on physical phones; explicit save recovery. | Real iOS Safari and Android Chrome runs covering four-round matches, phone sleep, background/resume, interrupted reward settlement, text scaling and narrow screens. Desktop Chrome emulation alone is insufficient. |
| 2. Native packaging experiment | Signed development builds with bundled assets, storage adapter, safe-area layout, Android back handling and audio/lifecycle recovery. | Repeated cold starts and upgrades preserve exact UIDs/XP; no duplicate payouts after process death; offline practice works; screenshots, memory and rendering measurements on agreed low/mid-range devices. Decide Capacitor versus rebuild from these results. |
| 3. Closed mobile beta | TestFlight and Play testing releases of the non-tokenized game; support contact, privacy information, ratings and store metadata. | Complete onboarding and review demo; verified backup/recovery; accessibility pass; a release-specific inventory of native plugins, data collection and privacy declarations. Review applicable privacy manifests for selected plugins. [Capacitor privacy manifest guidance](https://capacitorjs.com/docs/ios/privacy-manifest). |
| 4. Authoritative online economy | Accounts, server-owned inventory and battle/economy settlement, audit history, conflict recovery and account lifecycle. | Tests for replay, duplicate delivery, concurrent trades, inventory conservation and restore abuse. Imported editable local saves cannot mint scarce editions. Local-only AI gameplay can ship before this phase; valuable trading cannot. |
| 5. Collectible experiment | A separately reviewed ownership/gallery and fixed-edition flow in a non-production environment, if the product decision supports it. | Agreement on rights, supply, custody/recovery, identity mapping and transfer consequences; platform/region review of the exact screens and economic flow; contract/security review if contracts are later developed. No real-money launch implied. |
| 6. Store release and operation | Versioned iOS/Android submission, selected territories, release notes, support and staged rollout. | Current SDK/build requirements and all policy changes rechecked; relevant agreements and declarations complete; purchase/refund/recovery matrix passed if enabled; store review outcome recorded. Each expansion of NFT, payment or trading scope returns to the relevant gate. |

The privacy and release work should reflect the product actually shipped. An offline guest build and a cloud-account/wallet build have different data flows; adding a third-party SDK later requires another review rather than reusing an inaccurate “no data collected” description.

## Decisions still open

- First launch territories and intended audience/age range.
- Whether mobile launches entirely free, and whether any later paid product is actually needed.
- Whether NFTs are optional collectibles or intended to carry playable access and trained-card transfer; this changes platform feasibility.
- Developer organization, account ownership, signing/recovery responsibilities and ongoing support capacity.
- Physical test devices, minimum supported OS versions and measurable performance targets.
- Server authority, migration policy for existing saves, wallet custody/recovery and chain evaluation, if the collectible phase proceeds.

No App Store/Play submission, developer enrollment, wallet creation, chain deployment, minting or payment integration has been performed for this document. The next implementation milestone is a measurable mobile gameplay/build experiment, not an NFT sale.
