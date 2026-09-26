# Contributing to 萬象契 · Mythseal

**Type: contributor guide.** Start with [AGENTS.md](AGENTS.md), then the [handover](docs/HANDOVER.md) for setup and architecture. Use the [documentation index](docs/README.md) to distinguish implemented features, future designs and historical records, and the [roadmap](ROADMAP.md) to choose a bounded task.

The tracked application version is v0.5.1: a browser card game with email accounts and private backups of offline journeys. The last recorded deployment is documented in [HOSTING.md](docs/HOSTING.md); documentation changes do not deploy the game or establish current service health.

## Local development

Use Node.js 22, npm and Python 3.9+. From the repository root:

```sh
npm ci
python3 tools/serve.py --open
```

`npm ci` installs pinned development and server tooling. The browser runtime remains dependency-free HTML, CSS and native JavaScript modules. The Python server supports guest play; account API development needs the Worker setup in the handover. Optional browser checks need separately available Playwright and a browser, as described in the [README checks](README.md#checks).

Keep pure battle rules in `engine.mjs`, exact-copy ownership/XP/decks in `collection.mjs`, and local economy/migration/rewards in `progression.mjs`. The app owns storage and DOM behavior; the server-only account API owns authenticated backup access. Preserve these boundaries and avoid unrelated framework changes.

## Changes and checks

- Check the working tree, preserve concurrent work and coordinate one writer per artifact. Make a focused branch and describe the user-visible change, validation and any migration consequence in its pull request.
- Run the smallest meaningful existing checks for the change; the [handover validation map](docs/HANDOVER.md#checks-matched-to-the-change) lists the relevant suites. Use `npm test` for the full Node suite and the relevant browser script for interactive flows. Keep synthetic fixtures separate from real player saves.
- Preserve individual card IDs, XP, deck assignments and legacy `shanhai.*` save namespaces through changes. Offline saves and private backups do not establish trusted online ownership or NFT rights.
- Update the relevant document when behavior changes. Record local checks, CI results and deployment evidence separately; roadmap completion needs evidence.
- Do not commit private saves, `.env` files, wallet material, signing credentials or test screenshots. Use synthetic fixtures.

## Future work and assets

Accounts and private backup APIs already exist. An authoritative economy, player trading, game NFT contracts and native applications remain roadmap work. Follow their dependencies and acceptance criteria before implementation or release; recheck current mobile-store rules before introducing purchases, wallets or token utility.

Record art prompts and provenance in [ART.md](docs/ART.md). Existing assets were generated for this project; traditional character inspiration does not grant rights to modern adaptations, actor likenesses, fonts or third-party artwork. The repository is private, and no repository-wide open-source license has been selected.
