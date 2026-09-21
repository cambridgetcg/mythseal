# 萬象契 · Mythseal

一張卡，一段傳說。

An original Eastern fantasy card game inspired by the four-round card selection, concealed bids and faction synergies of 神魔令. The game now has 24 characters: 12 original山海 characters and 12 new interpretations of classical literary, historical and legendary figures. Illustrations, map, character writing and card balance are created for this game.

**Private repository: `cambridgetcg/mythseal`.** The owner has selected 萬象契 / Mythseal and acquired `mythseal.com`; its Cloudflare zone is active. The v0.4.1 delivery target is the existing game on Cloudflare static hosting, with `www.mythseal.com` redirecting to the apex domain. Deployment is pending verification; consult [hosting status and evidence](docs/HOSTING.md) before treating the site as live.

Gameplay still uses browser-local saves. iOS, Android, accounts, an authoritative backend, online player trading and limited-edition NFT cards remain planned. See the [roadmap](ROADMAP.md), [technical plan](docs/TECHNICAL-PLAN.md), [backend stack](docs/BACKEND-STACK.md), [NFT stack](docs/NFT-STACK.md), [content and release pipeline](docs/CONTENT-RELEASE-PIPELINE.md), [mobile plan](docs/MOBILE-RELEASE.md) and [blockchain design](docs/BLOCKCHAIN-DESIGN.md). [Naming history](docs/NAMING.md) preserves the earlier research; selecting a name and owning its domain do not establish trademark clearance.

## Run locally

Clone the private repository with an authorized GitHub account:

```sh
gh repo clone cambridgetcg/mythseal
cd mythseal
python3 tools/serve.py --open
```

The Python server works on macOS, Linux and Windows with Python 3 installed. On Windows, use `py` if that is your Python launcher.

The existing workspace on this Mac remains `/Users/macair/Games/shanhai-duel`. A fresh clone uses `mythseal`; the folder name does not define the brand or save format.

### Finder launcher on this Mac

Double-click **Play.command** and keep its Terminal window open while playing. Close the server with Ctrl+C. Or:

```sh
python3 tools/serve.py --open
```

Default address: **http://127.0.0.1:4177**. If occupied, the launcher selects another port and prints its address. Python 3 and a modern browser are the only runtime requirements. Assets are local. No accounts, payments, tracking, Flash or external runtime dependencies. The server binds to this Mac only.

## Static build and hosting

The v0.4.1 publishing workflow uses Node to produce an explicit allowlist of game files in `dist`, then deploys that artifact with locally authenticated Wrangler:

```sh
npm ci
npm run build
npm run deploy
```

The configured target is an assets-only Cloudflare Worker at `mythseal.com` plus a separate `www` redirect Worker. Do not publish the repository root: design documents, tests, credentials and local saves are not website assets. Deployment is a manual maintainer operation; GitHub CI checks the build and tests without claiming a production deployment. See [HOSTING.md](docs/HOSTING.md) for exact setup, commands and verification results. Hosting this client does not provision Supabase, cloud accounts, payments or blockchain services.

## 山海行囊 · v0.4

**山海行囊** is your home for individual cards and three saved decks. Search by character or card number, filter duplicate characters or locked cards, and sort by level. Each copy has a permanent local ID, its own XP, level, acquisition record and battle history. Open a card's **同行記** to inspect, cultivate or lock that exact copy.

Only cards actually played gain battle XP: expedition gives 20 per victory or 12 for a draw/loss; arena gives 12 or 8. Free practice records appearances without XP. Levels 1–5 begin at 0 / 80 / 200 / 400 / 700 total XP. Cultivation raises the selected copy to its next threshold; new pack and market cards always start at Lv.1. Expedition uses the levels of the exact copies in the active deck; arena and practice retain base stats.

Choose the particular copy for each saved deck, with eight different characters and at most 25 stars. Locked cards, cards in any saved deck or pending match, and the last owned copy of a character are protected from sale. **原卡回購** restores the same sold card—including its ID, XP and history—for its sale price plus a rounded-up 25% fee. This uses NPCs and game coins; online player trading can build on this model later.

Existing v2 saves migrate to v3 automatically. Every old copy keeps its previous character level, while the original v2 storage keys remain untouched. Reloading does not duplicate cards. See [backpack and exact-copy rules](docs/BACKPACK.md).

## 千古群英

Twelve new cards: 黃帝、孫悟空、林黛玉、盤古、孔子、關羽、王熙鳳、魯智深、諸葛亮、哪吒、貂蟬、武松. They share the existing four factions and combat rules; high-star cards still count toward the 25-star deck cap.

Existing and new players receive **悟空、關羽、黛玉、孔子** once, alongside the original 12-card collection. Other classical cards start uncollected. **群英秘匣** contains only the 12 new characters; **萬象秘匣** draws from all 24. Both cost 300 game coins, contain three cards and use the same displayed rarity guarantee. Daily NPC stock includes at least two classical characters.

In **萬象藏典**, browse by chapter, source work, faction or ownership. Uncollected cards can be inspected but cannot be equipped or cultivated. **試組群英初陣** prepares a 24-star deck using the four welcome cards and four original companions; choose **儲存牌組** to use it. Existing decks and cultivation levels are preserved.

See the [character catalogue and combat roles](docs/CHARACTERS.md), [classical source notes](docs/CLASSICAL-SOURCES.md), and [new portrait atlas/prompt](docs/ART-CLASSICS.md).

## Your journey

- **山海遊歷**: explore six illustrated destinations. Defeat each guardian to unlock the next; earn battle rewards, first-clear rewards and each destination's daily victory cache. Higher card cultivation levels improve expedition power and damage.
- **每日功課**: daily login gift, three claimable tasks, one half-price card cultivation and a chest for completing three arena matches. Resets at London midnight, including daylight saving time.
- **山海行囊**: manage each copy, its levels and XP, locks and three saved decks. Battle rewards follow the particular card that fought.
- **商旅市集**: three-card packs with at least one 靈品 or 神品; transparent conditional odds. Buy NPC stock, sell an eligible surplus copy and buy that same card back with its growth intact. No real money or player-to-player trading.
- **問道擂台**: AI opponents, points and six ranks. Arena and free practice use base card stats; cultivation boosts apply only to expeditions. Three arena completions unlock the daily chest.
- **萬象藏典**: inspect all 24 characters, browse classical sources and try a themed deck. Saving here updates the active deck, preserving its selected copies for characters already in it. Use the backpack to choose a different copy or manage multiple decks.

A quick starting route: claim the daily gift → train a favourite card → travel to 霧隱渡口 → open a pack → claim the pack daily task.

## Your first battle

1. Choose **開展山海之旅**, select a location, then challenge its guardian. **先弈一局** starts free practice.
2. Choose one of four randomly drawn cards. Use the slider or ± to commit pills.
3. Optional **怒擊** costs three extra pills for two extra damage if that card wins.
4. Choose **落子 · 決勝** to reveal both bids and see the result.
5. Finish at most four rounds. Higher remaining life wins; zero life ends the match early.

You start with 12 life and 12 pills. Attack is effective power × (1 + spent pills), plus modifiers. Each card is used once. The opening player reveals their card but conceals their spend; initiative alternates. Ties favour lower stars, then the opening player. **弈道** explains the rules.

## Saving

Progress lives in this browser's local storage under `shanhai.profile.v3`. Migration retains old v1/v2 keys, progress and classical welcome gifts. A matching pending v2 battle snapshot is carried forward into the new battle key. Currency changes and reward claims are saved immediately; pending battles can be resumed after reload, including a round whose result is being shown. A completed encounter pays and awards card XP only once. The home banner resumes a pending match; leaving can either preserve or abandon it. Switching decks does not change the exact cards assigned to an unfinished match.

Use **匯出旅程備份** in the footer to download profile JSON. This is a local prototype: clearing site data removes the save, different browsers have separate progress, and changing the server port changes the browser storage origin. There is no cloud account or server-backed anti-cheat. Browser Web Locks serialize profile changes across tabs where available; keep active battles in one tab.

The Mythseal rename preserves the existing `shanhai.*` storage namespaces. Visiting `mythseal.com` creates a different browser storage origin from `localhost`; local progress does not automatically follow the domain. Export important local journeys before changing where you play. A saved JSON file is not a server-verified collectible or mint claim.

## Fidelity and scope

This is an inspired new game, not an exact restoration. Historical sources support the broad arena/wilderness/market/training loops. Our currency prices, pack odds, map, daily rewards, cultivation curve and AI ladder are original prototype choices. No verified original source repository was recovered in the bounded search. See [historical research](docs/RESEARCH.md), [battle design](docs/DESIGN.md) and [progression rules/API](docs/PROGRESSION.md).

Online multiplayer, real player trading, server accounts, timed furnaces and extensive economy/balance tuning are outside this local version.

The roadmap proposes mobile distribution and limited-batch blockchain collectibles, with future server-validated battles and capped collectible issuance. Cloudflare Workers API + Supabase Postgres/Auth is the backend recommendation; Base Sepolia is a testnet research candidate. Neither backend provisioning nor chain deployment has been performed for the static release. Mobile NFT gameplay rights remain an explicit platform-policy decision. No token sale, launch date, production chain or mint quantity is committed by these planning documents.

## Checks

```sh
npm test
```

Pure engine, progression and collection suites use Node's built-in test runner. Browser checks use Playwright as a development tool; the game itself has no JavaScript dependencies:

```sh
# Start the local server in another terminal first.
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tools/smoke.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tools/journey-smoke.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tools/classics-smoke.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tools/backpack-smoke.mjs
```

`CHROME_PATH` and `GAME_URL` optionally select browser/server. Screenshots are written to ignored `test-results/`. See [validation evidence](docs/VALIDATION.md) for checks actually completed.

GitHub Actions is configured for deterministic Node tests, module syntax checks, launcher/server syntax checks and the static build on pushes and pull requests. Browser scripts run separately; a passing unit/build workflow does not mean mobile builds, browser tests or production services have passed. Exact results and test counts belong in [VALIDATION.md](docs/VALIDATION.md), with public-host checks in [HOSTING.md](docs/HOSTING.md).

## Repository use

This is a private development repository. No open-source license or NFT-holder artwork license has been granted. Public-domain character inspirations and generated-art provenance are documented separately; choose distribution and collectible license terms before releasing. See [contribution notes](CONTRIBUTING.md).

## Project map

- `engine.mjs`: pure battle rules, character data and public-information AI.
- `progression.mjs`: pure profile migration, daily/economy/map/arena rules.
- `collection.mjs`: exact card identity, XP, deck slots and ownership protection.
- `app.mjs`: persistence, navigation, battle UI and interaction.
- `backpack-ui.mjs`, `backpack.css`: owned cards, saved decks and individual card records.
- `adventure-ui.mjs`, `adventure.css`: travel, market, daily and arena screens.
- `classics.css`: classical collection filters, feature banner and themed packs.
- `styles.css`, `index.html`: original visual foundation and app shell.
- `assets/portraits.png`: original 4 × 3 character atlas.
- `assets/world-map.png`: original illustrated six-realm map.
- `assets/classics.png`: 4 × 3 atlas of the twelve classical characters.
- [Art generation record](docs/ART.md): exact prompts and provenance.
- [Technical plan](docs/TECHNICAL-PLAN.md): implementation order and architecture decisions.
- [Backend stack](docs/BACKEND-STACK.md): server authority, transactions, schema and cost assumptions.
- [NFT stack](docs/NFT-STACK.md): testnet candidates, wallets, ownership indexing and metadata.
- [Content/release pipeline](docs/CONTENT-RELEASE-PIPELINE.md): artwork, animation and versioned content delivery.
- [Hosting](docs/HOSTING.md): build allowlist, Cloudflare setup and actual deployment evidence.
