# Contributing to 萬象契 · Mythseal

Read [AGENTS.md](AGENTS.md) first, then the [agent handover](docs/HANDOVER.md)
for architecture, infrastructure and setup. The
[documentation library](docs/README.md) lists every guide and says whether it
describes current behavior, a dated proposal or a dated record. Choose a bounded
task from the [roadmap](ROADMAP.md).

The public site, [mythseal.com](https://mythseal.com), runs **v0.5.1**: the
browser card game with email-code accounts and private backups of offline
journeys. `main` is ahead of it. WX-01, the longer campaign, the game lobby, the
Q0 battle table and the literary previews exist in source but are not deployed.
[HOSTING.md](docs/HOSTING.md) records actual releases. A merge, push or
documentation change does not deploy the game or show that a service is healthy.

## Local development

Use Node.js 22 or newer (CI runs 22), npm, Python 3.9 or newer and Git. From the
repository root:

```sh
npm ci
npm test
python3 tools/serve.py --open
```

`npm ci` installs pinned development and server tooling: Playwright, Wrangler,
the Supabase SDK for the Worker and the other `devDependencies`. The browser
runtime stays dependency-free HTML, CSS and native JavaScript modules; do not add
runtime packages. The Python server serves guest play on loopback, normally at
`http://127.0.0.1:4177`, and does not run `/api/*`. For account work, use
`npm run preview` (`http://127.0.0.1:8791`) as described in the handover's
[local account Worker preview](docs/HANDOVER.md#local-account-worker-preview).

The local server and the public build serve only allowlisted files. The game's
files are listed in `hosting/public-assets.json`, which also defines `dist`. The
local-only literary, art and playtest pages are listed in
`hosting/preview-assets.json` and never enter the public build. Add any new
runtime module, stylesheet or asset to the right list in the same change.
Otherwise the local server returns 404 for it, and a game file is missing from
`dist`.

## Module boundaries

- `engine.mjs` owns pure battle rules and card data. Keep randomness injectable
  and never give the AI access to the player's hidden move.
- `collection.mjs` owns exact card copies, XP and decks; `progression.mjs` owns
  the local economy, migrations and rewards.
- `profile-store.mjs` owns versioned local persistence; `app.mjs` and the
  `*-ui.mjs` modules own browser storage access and DOM behavior.
  `server/account-api.mjs` owns authenticated backup access.
- The [code ownership map](docs/HANDOVER.md#code-ownership-map) lists the rest.
  Preserve these boundaries, and avoid framework rewrites inside unrelated changes.

## Changes and checks

- Check the working tree first, preserve other people's uncommitted work and
  keep one writer per artifact. Work on a focused branch.
- Run the smallest checks that cover your change. The handover's
  [checks matched to the change](docs/HANDOVER.md#checks-matched-to-the-change)
  lists them. `npm test` runs the full Node suite;
  `python3 -m unittest discover -s tests -p '*_test.py'` runs the Python tests.
  Browser suites need a running local server and an explicit `GAME_URL`; see
  the [README checks](README.md#checks).
- Preserve individual card IDs, XP, deck assignments, the legacy `shanhai.*` save
  namespaces and their migrations. Offline saves and private backups never
  establish trusted online ownership or NFT rights.
- Fill in the [pull request template](.github/pull_request_template.md): the
  problem and resulting behavior, the checks you actually ran, and any save,
  ownership or platform impact.
- Update the document that owns the behavior you change. Add new documents to
  the [documentation library](docs/README.md). Record local checks in
  [VALIDATION.md](docs/VALIDATION.md) and deployments in
  [HOSTING.md](docs/HOSTING.md), keeping local, CI, hosted and browser evidence
  separate. A roadmap item is complete only with evidence.
- Deployment, hosted migrations and provider configuration are separate,
  explicitly authorized maintainer operations that follow
  [the release procedure](docs/HOSTING.md#build-and-deploy). Dry runs
  (`npm run deploy -- --dry-run`) touch no hosted service.
- Never commit player saves, `.env` or `.dev.vars` files, wallet material,
  signing credentials, test screenshots or other generated output such as
  `test-results/` and `dist/`. Use synthetic fixtures.

## Future work and assets

Accounts and private backup APIs exist. An authoritative economy, player
trading and native applications remain optional roadmap work; follow their
dependencies and acceptance criteria before implementing them, and recheck
current store rules before introducing purchases, wallets or token utility.
Collectible commercialization was retired as a delivery objective on
2026-09-23; the dated NFT designs are kept for understanding only.

Record art prompts and provenance in the matching `docs/ART*.md` file (start at
[ART.md](docs/ART.md)). Existing assets were generated for this project.
Traditional character inspiration does not grant rights to modern adaptations,
actor likenesses, fonts or third-party artwork. The repository is private, and
no open-source license has been selected.
