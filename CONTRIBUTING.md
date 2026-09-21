# Working on Shanhai Duel

This private repository contains the playable v0.4 prototype and a proposed release roadmap. Brand, blockchain and commercial terms are still decisions, not shipping commitments.

## Local development

Use Node.js 22 or newer for `npm test` and Python 3 for `python3 tools/serve.py --open`. There are no runtime JavaScript dependencies and no install step for the unit suite. For optional browser checks, install Playwright in your development environment and set `PLAYWRIGHT_MODULE` / `CHROME_PATH` as described in the README.

Read `AGENTS.md`. Keep pure battle rules in `engine.mjs`, exact-copy ownership/XP/decks in `collection.mjs`, and economy/migration/rewards in `progression.mjs`. The app owns storage and DOM behavior. Avoid a framework rewrite as part of unrelated changes.

## Changes and checks

- Make a focused branch and describe the user-visible change, validation and any migration consequence in its pull request.
- Run `npm test` for rules, collection or economy changes. Use the relevant browser script when changing interactive flows; keep deterministic fixtures separate from real player saves.
- Preserve old storage keys during migrations and keep rewards, minting and ownership operations atomic and idempotent.
- Update the relevant design document when changing behavior. Roadmap checkboxes describe completed evidence, not intentions.
- Do not commit private saves, `.env` files, wallet material, signing credentials or test screenshots. Use synthetic fixtures.

## Planned services and assets

Keep future contracts, backend APIs and native packaging behind explicit milestones. Local UIDs and localStorage are not trusted evidence of scarcity or ownership. Recheck current mobile-store rules before introducing purchases, wallets or token utility.

Record art prompts and provenance with assets. Existing assets were generated for this project; traditional character inspiration does not grant rights to modern adaptations, actor likenesses, fonts or third-party artwork. No repository-wide open-source license has been selected.
