# Shanhai Duel

An original browser card game inspired by the four-round bluffing and resource allocation of 神魔令. Traditional Chinese interface, original characters and artwork.

- Keep the app dependency-free: HTML, CSS and JavaScript ES modules. Use Node's built-in test runner for the rules engine; Python serves static assets.
- `engine.mjs` owns pure battle rules and card data; `app.mjs` owns UI and match presentation. Keep randomness injectable and do not give AI access to the player's hidden move.
- Document historical ambiguities and prototype choices in `docs/DESIGN.md`. Do not claim perfect original-game fidelity without evidence.
- Keep generated artwork in `assets/` and its prompts/provenance in `docs/ART.md`.
- Preserve other projects. The owner has authorized source upload to the private GitHub repository `cambridgetcg/shanhai-duel`. Public releases, store submission, live services and NFT issuance remain future roadmap work.
- `ROADMAP.md` records planned scope; `docs/BLOCKCHAIN-DESIGN.md` and `docs/MOBILE-RELEASE.md` distinguish proposals from shipped features. Do not turn local saves into trusted ownership or mint claims.
- Keep credentials, signing keys, wallet secrets, player saves and generated test output out of Git. No open-source license has been selected.
