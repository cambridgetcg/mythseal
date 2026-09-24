# iOS / Android release plan

Product direction updated **2026-09-22**: iOS App Store and Android Google Play
launches are confirmed roadmap goals. Policy research below remains dated
**2026-09-21**; it was not refreshed for this roadmap update. Recheck the linked
policies when selecting launch regions, designing purchases and submitting each release.

## Current build and proposed route

The live v0.5.1 browser game has 24 characters, four-round AI battles, individual
card copies with XP, three saved decks, exploration, daily tasks, earned-coin
packs and NPC trading. Email-code accounts and deliberate private cloud
backup/restore are already implemented. Gameplay still uses editable local
saves; accounts do not make those saves an authoritative online economy.

The approved local navigation update adds a game lobby, five destinations,
unified cards/decks/codex, quest panels and encounter preparation/next-match
flows. It is the foundation for the mobile adaptation, with browser-emulated
phone checks recorded in [VALIDATION.md](VALIDATION.md). Physical iOS/Android
verification remains outstanding. There are no native app projects, signed mobile
builds or store releases yet; player trading, authoritative online progression
and collectible issuance remain separate future work.

## Shared game interface for mobile

Keep **洞府 / 遊歷 / 對弈 / 藏卡 / 市集** consistent across clients. Adapt the
approved layout for portrait phone play and retain the browser experience:

- Put resume/continue and the actual active deck within easy reach. Check safe
  areas and thumb targets on physical devices, including the bottom dock.
- Preserve collection filters, exact-card selection and deck drafts across
  panels and Back actions. Native Android Back should dismiss a panel or restore
  its parent; leaving an unfinished battle keeps the explicit save/abandon choice.
- Keep the global dock out of active battles. Verify the full
  encounter → deck preparation → battle → rewards → next/retry loop on each OS.
- Validate text scaling, readable card details, keyboards, reduced motion,
  audio interruptions, background/resume and recovery after process termination.
- Trial the existing code with Capacitor and compare measured device results
  before choosing any native UI rewrite. Native storage is a separate adapter;
  preserve existing card identities and explicitly plan transfer from browser saves.

The [M4 immersion track](IMMERSION.md) now has a local first 霧隱渡口 slice with
tactile card/pill cues, readable battle reveals, optional synthesized ambience
and exact-copy reward presentation. Carry
its mute, reduced-motion and fast/skip controls into phone adaptation. Trial
optional native haptics with an off switch during M5.2, alongside audio/lifecycle
recovery on physical devices. The beta includes a selected, verified subset;
later realm content and encounter experiments are not prerequisites for launch.

The delivery sequence is **M5.1 phone validation → M5.2 native trial → M5.3
TestFlight/Play beta → M7 App Store/Google Play launch**. The ordinary-card mobile
game can progress independently of collectible issuance. Launch dates, supported
devices/OS versions, territories and monetization remain open decisions.

## Packaging route

**Existing working direction: validate a Capacitor mobile build before considering a full UI rebuild.** Keep `engine.mjs`, `collection.mjs` and `progression.mjs` reusable, with platform adapters around storage, lifecycle and identity. The repository already has pinned Capacitor development tooling/configuration and an allowlisted `dist` build; native iOS/Android projects are not generated. Trial those bundled assets with the storage/lifecycle work above. [Capacitor installation guide](https://capacitorjs.com/docs/getting-started).

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

1. Proposed initial scope: a complete free card game with guest play and the existing optional email-code/private-backup journey adapted and verified on phones. Keep daily rewards, NPC trading and packs in earned-only game coins; purchased currency or other monetization remains a later product choice.
2. Keep ordinary playable instances separate from optional collectible ownership. A provenance/gallery view is a candidate for review, not guaranteed approval. Design token transfers without granting or revoking gameplay entitlements.
3. Preserve exact-card growth in the game economy. If transferring a token must transfer playable access and trained XP to its new owner, resolve that platform conflict before promising it. Renaming a token a certificate does not resolve the conflict.
4. For any later collectible sale, start the design discussion with a known card and edition, visible supply cap, serial, fixed offer and stated rights. Do not convert the existing mystery packs into paid random NFTs. Fixed contents reduce one policy problem; they do not automatically approve the sale, marketplace or gameplay use.
5. If ordinary mobile monetization is wanted sooner, evaluate clearly described non-tokenized, non-random products through the applicable store billing route. Keep that decision independent of chain selection. Test delivery, restoration where applicable, refunds and duplicate callbacks before release.

See [BLOCKCHAIN-DESIGN.md](BLOCKCHAIN-DESIGN.md) for the proposed separation of game instances, authoritative ownership and limited editions. No chain, collection size, token sale, custody provider or deployment is selected here.

## Phases and exit evidence

| Roadmap milestone | Planned deliverable | Evidence required before proceeding |
| --- | --- | --- |
| **M5.1 · Phone gameplay validation** | Portrait adaptation of the approved lobby, dock, quests, battle, exact-card decks, market and map on physical phones. | Real iOS Safari and Android Chrome runs covering preparation → deck → return, four-round battles → rewards → next encounter, card-detail close with preserved filters/scroll, safe areas, text scaling, keyboards and touch reach. Desktop Chrome emulation is preliminary evidence only. |
| **M5.2 · Native packaging trial** | iOS/Android development builds with allowlisted bundled assets, durable storage, save migration, safe areas, Android Back and audio/lifecycle recovery. | Cold starts, upgrades and process termination preserve exact UIDs/XP and pending matches; interrupted settlement never pays twice. Record offline behaviour, screenshots and rendering/memory measurements on selected devices. Decide Capacitor versus any rebuild from these results. |
| **M5.3 · Closed beta** | TestFlight and Google Play testing builds of the selected ordinary-card game, plus onboarding, support, privacy information, ratings and store metadata. | Complete phone play loop; native email-code login and explicit backup/restore when included; recovery, poor-network and accessibility checks; release-specific native-plugin/data disclosures. Review applicable [privacy manifests](https://capacitorjs.com/docs/ios/privacy-manifest). Resolve blocking tester feedback. |
| **M7 · Store launch and operation** | Separate App Store and Google Play submissions, selected territories, release notes, support and staged rollout. | Recheck current SDK/submission requirements and the chosen feature/payment flow; complete applicable agreements/declarations; record each review outcome and rollout. Verify purchase/refund recovery only if those features are selected. |

**Parallel tracks:** M2–M3 add authoritative online inventory and battle/economy
settlement; M6 covers a separately scoped collectible rehearsal. Neither is an
extra step between an ordinary local-AI beta and its store release. Features that
actually depend on server ownership or collectible rights must satisfy those
tracks before inclusion. Editable browser saves never become trusted ownership
by being imported into a native app.

The privacy and release work should reflect the product actually shipped. An offline guest build and a cloud-account/wallet build have different data flows; adding a third-party SDK later requires another review rather than reusing an inaccurate “no data collected” description.

## Decisions still open

- First launch territories and intended audience/age range.
- Whether mobile launches entirely free, and whether any later paid product is actually needed.
- Whether NFTs are optional collectibles or intended to carry playable access and trained-card transfer; this changes platform feasibility.
- Developer organization, account ownership, signing/recovery responsibilities and ongoing support capacity.
- Physical test devices, minimum supported OS versions and measurable performance targets.
- Server authority, migration policy for existing saves, wallet custody/recovery and chain evaluation, if the collectible phase proceeds.

No App Store/Play submission, developer enrollment, wallet creation, chain deployment, minting or payment integration has been performed for this document. The next mobile milestone is physical-phone validation of the approved game loop (M5.1).
