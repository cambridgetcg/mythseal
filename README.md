# 萬象契 · Mythseal

一張卡，一段傳說。

An original Eastern fantasy card game inspired by the four-round card selection, concealed bids and faction synergies of 神魔令. The game now has 24 characters: 12 original山海 characters and 12 new interpretations of classical literary, historical and legendary figures. Illustrations, map, character writing and card balance are created for this game.

**Play [萬象契 · Mythseal](https://mythseal.com).** v0.5.1 is deployed on Cloudflare with email login enabled. The source repository remains private at `cambridgetcg/mythseal`. Exact public deployment revisions and live checks are recorded in [HOSTING.md](docs/HOSTING.md).

**v0.5.0 adds 旅程閣:** player account screens and private cloud backups of your offline journey. The implementation preserves individual card IDs, XP, decks and progress, with explicit upload, restore and a local recovery copy. **Resend domain verification and Supabase SMTP setup are complete; the owner has confirmed mailbox delivery and local-pilot login. Public email login is enabled in v0.5.1, and hosted OTP/session checks passed.** Guest play works as before. See [accounts and cloud journeys](docs/ACCOUNTS.md).

Gameplay still runs from editable browser-local saves; an account backup is not trusted online ownership. iOS, Android, an authoritative game economy, online player trading and limited-edition NFT cards remain planned. See the [roadmap](ROADMAP.md), [technical plan](docs/TECHNICAL-PLAN.md), [backend stack](docs/BACKEND-STACK.md), [NFT stack](docs/NFT-STACK.md), [content and release pipeline](docs/CONTENT-RELEASE-PIPELINE.md), [mobile plan](docs/MOBILE-RELEASE.md) and [blockchain design](docs/BLOCKCHAIN-DESIGN.md). [Naming history](docs/NAMING.md) preserves the earlier research; selecting a name and owning its domain do not establish trademark clearance.

**Joining development?** Start with the [agent handover](docs/HANDOVER.md) for the live architecture, infrastructure/access map, fresh-checkout setup, checks and release procedure. The [roadmap](ROADMAP.md) breaks future work into bounded tasks with dependencies and acceptance criteria. Read [AGENTS.md](AGENTS.md) before editing.

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

Default address: **http://127.0.0.1:4177**. If occupied, the launcher selects another port and prints its address. Python 3 and a modern browser are sufficient for guest play. Assets are local, and the browser runtime remains dependency-free. The server binds to this Mac only and serves the explicit public-file allowlist. It does not run the account API; use the Worker environment for connected accounts or the intercepted browser smoke for UI development.

## Build and hosting

Developer service access and pinned backend/NFT/mobile toolkits are tracked in [CONNECTIONS.md](docs/CONNECTIONS.md). Use `npm run connect` for owner login and `npm run connections:check -- --live` for a credential-safe status report. Developer credentials and player email sessions are separate; the account implementation is documented in [ACCOUNTS.md](docs/ACCOUNTS.md).

The publishing workflow uses Node to produce 19 explicitly allowlisted game files in `dist`, then deploys those assets and the separately bundled server Worker with locally authenticated Wrangler:

```sh
npm ci
npm run build
npx --no-install wrangler deploy --dry-run
```

`npm ci` restores pinned development tooling, including **Wrangler 4.136.1** and the Supabase SDK. The SDK is bundled only into the server Worker; the browser still uses native ES modules and same-origin `fetch`. `/api/*` runs through the Worker while static assets use the allowlisted bundle. The separate redirect Worker canonicalizes HTTP and `www` URLs. The commands above build/check without deploying. Use the [authenticated release procedure](docs/HOSTING.md#build-and-deploy), which preserves the existing publishable-key binding; the older generic `npm run deploy` helper does not explicitly preserve it.

Do not publish the repository root: server source, design documents, tests, credentials and local saves are excluded from website assets. Deployment is a manual maintainer operation; GitHub CI checks the build, API, SQL and other tests without deploying production. The Free London Supabase development project has been provisioned. Local checks, hosted migration evidence and public deployment evidence remain distinct in [VALIDATION.md](docs/VALIDATION.md), [CONNECTIONS.md](docs/CONNECTIONS.md) and [HOSTING.md](docs/HOSTING.md).

## 旅程閣 · v0.5

Open **旅程閣** to compare this device's journey with your account's cloud backup. Sign in with a six-digit email code. Signing in never automatically uploads, merges or replaces progress.

**備份此裝置** uploads the current journey. **恢復雲端旅程** asks for confirmation and saves the displaced local journey as a recovery copy first; that copy can be downloaded or restored. Finish or abandon any pending battle before uploading or restoring. If another device has changed the cloud backup, reread and compare it before choosing another action. Cloud deletion also requires confirmation and leaves this device's journey intact.

Backups retain the exact local card IDs, XP, levels, history, locks, three deck slots and merchant-held copies. They remain editable offline game data and cannot establish trade or NFT rights. [ACCOUNTS.md](docs/ACCOUNTS.md) explains limits, session handling and delivery/session verification and remaining device checks.

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

Use **匯出旅程備份** in the footer to download profile JSON. Clearing site data removes local progress and recovery copies; different browsers and server ports have separate local saves. 旅程閣 provides manual account backups once email sign-in is enabled, with no automatic cross-device merging. Browser Web Locks serialize profile changes across tabs and are required for safe cloud restoration; keep active battles in one tab. There is no server-authoritative anti-cheat.

The Mythseal rename preserves the existing `shanhai.*` storage namespaces. Visiting `mythseal.com` creates a different browser storage origin from `localhost`; local progress does not automatically follow the domain. Export important local journeys before changing where you play. A saved JSON file is not a server-verified collectible or mint claim.

## Fidelity and scope

This is an inspired new game, not an exact restoration. Historical sources support the broad arena/wilderness/market/training loops. Our currency prices, pack odds, map, daily rewards, cultivation curve and AI ladder are original prototype choices. No verified original source repository was recovered in the bounded search. See [historical research](docs/RESEARCH.md), [battle design](docs/DESIGN.md) and [progression rules/API](docs/PROGRESSION.md).

Online multiplayer, real player trading, timed furnaces and extensive economy/balance tuning remain outside this version.

The roadmap proposes mobile distribution and limited-batch blockchain collectibles, with future server-validated battles and capped collectible issuance. Cloudflare Workers + Supabase Postgres/Auth now implement the account/private-backup slice; the authoritative game economy and Hyperdrive adapter remain future work. Base Sepolia is a testnet research candidate with no deployed game contract. Mobile NFT gameplay rights remain an explicit platform-policy decision. No token sale, launch date, production chain or mint quantity is committed by these planning documents.

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
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs GAME_URL=http://127.0.0.1:4177 node tools/account-smoke.mjs
```

`CHROME_PATH` and `GAME_URL` optionally select browser/server. Screenshots are written to ignored `test-results/`. See [validation evidence](docs/VALIDATION.md) for checks actually completed.

The account browser smoke uses isolated contexts and intercepted fixture APIs; it sends no real email and does not validate live authentication. GitHub Actions is configured for deterministic Node tests, disposable PostgreSQL security/concurrency checks, local helper checks, the contract fixture, syntax, public builds and Worker dry runs. Browser scripts run separately; a passing CI job does not establish live SMTP delivery, native builds or production account health. Evidence belongs in [VALIDATION.md](docs/VALIDATION.md), with public-host checks in [HOSTING.md](docs/HOSTING.md).

## Repository use

This is a private development repository. No open-source license or NFT-holder artwork license has been granted. Public-domain character inspirations and generated-art provenance are documented separately; choose distribution and collectible license terms before releasing. See [contribution notes](CONTRIBUTING.md).

## Project map

- `engine.mjs`: pure battle rules, character data and public-information AI.
- `progression.mjs`: pure profile migration, daily/economy/map/arena rules.
- `collection.mjs`: exact card identity, XP, deck slots and ownership protection.
- `app.mjs`: persistence, navigation, battle UI and interaction.
- `account-client.mjs`, `account-ui.mjs`, `account.css`: 旅程閣, email code UI and explicit backup choices.
- `cloud-save.mjs`: bounded, versioned offline snapshots and safe restoration validation.
- `server/account-api.mjs`: server-only Supabase auth/session adapter and private-backup API.
- `supabase/migrations/`: private backup storage and account-scoped SQL RPCs.
- `hosting/public-assets.json`: the shared 19-file public allowlist for builds and the local server.
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
- [Accounts and cloud journeys](docs/ACCOUNTS.md): implemented backup behavior, security boundary and SMTP readiness.
- [NFT stack](docs/NFT-STACK.md): testnet candidates, wallets, ownership indexing and metadata.
- [Content/release pipeline](docs/CONTENT-RELEASE-PIPELINE.md): artwork, animation and versioned content delivery.
- [Hosting](docs/HOSTING.md): build allowlist, Cloudflare setup and actual deployment evidence.
