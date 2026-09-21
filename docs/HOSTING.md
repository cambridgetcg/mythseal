# Mythseal hosting

Deployed **2026-09-21**, client **v0.4.1**. Site: [mythseal.com](https://mythseal.com). Source: [private cambridgetcg/mythseal](https://github.com/cambridgetcg/mythseal). HTTPS and gameplay were verified against the production host with a DNS-only edge override; some recursive resolvers still held pre-deployment negative records at the recorded check time. Details below distinguish that propagation state from the working deployment.

## Topology and public boundary

- `mythseal`: Cloudflare Workers Static Assets, apex custom domain, assets only, no game API or database.
- `mythseal-www`: tiny Worker at `www.mythseal.com`, plus the scheme-specific `http://mythseal.com/*` route, returning permanent 308 redirects to HTTPS apex while preserving path and query. It serves no assets and has no secrets. HTTPS apex requests still go directly to static assets.
- `workers.dev` and version preview URLs are disabled in both configs. Unknown paths return 404; this UI does not need a catch-all SPA fallback.

Cloudflare manages the custom-domain DNS record and certificate in the existing active zone. This deployment does not change nameservers, mail records or another site's routes. The account ID in Wrangler config is a routing identifier, not a credential. [Custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

`npm run build` copies exactly the runtime files named in `tools/build.mjs` plus HTTP headers and a generated `release.json` into ignored `dist/`. It rejects symlinked inputs and discards stale output. Docs, tests, credentials, player exports, source configuration and `.git` are excluded. A private repo still delivers browser JavaScript and approved artwork publicly as part of the game.

Headers restrict scripts to the same origin, prevent framing and MIME sniffing, and revalidate assets whose filenames are not fingerprinted. Inline styles remain necessary for existing card rendering. The release manifest hashes each approved file; secrets and internal provenance are never part of that manifest. `_headers` configures responses and is not a downloadable runtime resource. [Static assets](https://developers.cloudflare.com/workers/static-assets/), [headers](https://developers.cloudflare.com/workers/static-assets/headers/).

Cloudflare's static `_redirects` format does not support domain-level redirects, hence the separate `www` Worker. Keeping the apex assets-only also avoids running application code for every static request. [Redirect limitations](https://developers.cloudflare.com/workers/static-assets/redirects/).

## Build and deploy

Prerequisites: Node 22+, Git, and an authorized Wrangler login to the existing Mythseal Cloudflare account. `npm ci` installs **Wrangler 4.136.1** from the committed lockfile. It is a development/deployment dependency; the game runtime and asset builder use no npm dependencies. The deploy script checks the expected CLI version; upgrading it is a deliberate tooling change.

The runtime compatibility date is `2026-06-16`. It describes API behavior, not the release date. The older shared CLI first rejected a newer compatibility date, then its local preview returned a root-route 404 despite resolving other assets. The pinned project CLI fixes that preview failure; the shared installation is unchanged.

```sh
npm ci
npm test
npm run build
WRANGLER_SEND_METRICS=false npx --no-install wrangler deploy --dry-run
WRANGLER_SEND_METRICS=false npx --no-install wrangler deploy --config wrangler.www.jsonc --dry-run
```

Review the changes, commit the selected release, push it and verify GitHub CI. From that clean checkout:

```sh
npm run deploy
```

The deploy command refuses outstanding Git changes, rebuilds the public files with the current commit, deploys apex, then deploys the `www` redirect. The two Workers deploy sequentially, not atomically: if the second fails, the apex may already be live. Inspect provider output and retry only the unresolved deployment. Never upload the repository root with `--assets .`.

Wrangler uses local OAuth. No OAuth token, API token or account secret is stored in Git or GitHub Actions. Existing CI runs deterministic tests, the allowlist build and syntax checks; it does **not** deploy production. A later Cloudflare Git integration or narrowly scoped deploy credential can automate a reviewed release path after preview/promotion is implemented. This release does not create unattended CD, staging or a public GitHub release.

## Verification and rollback

After deployment, check HTTPS, the correct title, JS MIME type, CSP, all images, `www` redirect, desktop/mobile browser navigation and a battle. Compare `/release.json` to the committed build. Confirm `/README.md`, `/docs/BACKEND-STACK.md`, `/.git/config`, `/package.json`, `/wrangler.jsonc` and `/_headers` return 404.

`npm run verify:hosting` checks the live manifest against local `dist/release.json`, hashes all 15 public assets, checks security headers/JS MIME, probes nine private paths and checks both `www` and HTTP-to-HTTPS redirects. Browser flow remains a separate check: run `tools/smoke.mjs` with `GAME_URL=https://mythseal.com` and a configured Playwright installation. Both use isolated test state; no real player account is involved.

To roll back, use Cloudflare deployment history for the affected Worker and restore its last known-good version. Keep apex and redirect version records separate; version IDs are not Git SHAs. `wrangler deployments list` and `wrangler rollback <version-id>` accept the applicable `--config` file. The first deployment has no earlier production version. Before a later rollback, check that the old client can read the existing save schema. [Cloudflare rollback](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/).

Local progress belongs to the browser origin. The old `shanhai.*` keys remain intact, but `localhost`, apex and other hosts do not share them. Existing export remains available; import/cloud migration is future work. No valuable ownership is inferred from local saves.

## First deployment record

Final canonical-routing check: **2026-09-21 18:52:13 UTC**. Release tag **v0.4.1** points to deployed source commit `ff89b9a2b7144c015bc902c67cc03c128448915f`; later documentation-only commits do not imply another deployment.

| Artifact | Recorded identity |
| --- | --- |
| Current apex Worker version | `7ee307bb-7601-4d03-bb0d-38537260f8a1` |
| Current redirect Worker version | `de23c101-f710-43a9-8bab-39fbdd314964` |
| Public assets manifest SHA-256 | `fe448b3147b0cea2f6d57b941ff4da912da4b8e7722b5c2873d9114ca6705240` |
| Initial apex / redirect versions | `27118a67-35b6-402d-ad71-2ca0c605b5a2` / `ee12d625-daa5-44d1-a250-7ca2baaef460` |
| Initial source revision | `d9294bb9c9f16e0bb4d293890a7cd9555c103bb5` |

Completed checks:

- **110 Node tests passed**, including public-build exclusion, symlink rejection and canonical redirect behavior. Syntax, build and both Wrangler dry runs passed. [Initial CI](https://github.com/cambridgetcg/mythseal/actions/runs/35640483554) and [deployed revision CI](https://github.com/cambridgetcg/mythseal/actions/runs/35640949473) succeeded.
- Local pinned-Wrangler preview passed the desktop/mobile browser smoke and the public-hosting verification script. The earlier shared-CLI startup/root-routing failures were resolved before publishing.
- Production HTTPS returned 200 with valid certificate verification. All **15 runtime asset hashes** matched the local manifest; JavaScript MIME and security headers were checked; **nine private paths returned 404**.
- Production browser smoke passed a complete **four-round desktop match**, deck persistence, collection/rules and mobile-size interactions, with no page/network errors or horizontal overflow. These are Chrome desktop/emulated-mobile checks, not physical iOS/Android certification.
- `https://www.mythseal.com`, `http://www.mythseal.com` and `http://mythseal.com` returned **308** to HTTPS apex, retaining an escaped path and query. The final deployed `/release.json` matched the committed build. The second deployment changed the release manifest and HTTP route; all 15 game asset hashes stayed identical to the browser-tested first deployment.

**DNS propagation at check time:** Cloudflare's authoritative nameservers and public resolver `1.1.1.1` returned the new records (`104.21.51.73`, `172.67.177.62`). Local/system resolution and a later `8.8.8.8` query still returned negative answers. Therefore the ordinary-resolver production commands initially failed to resolve the new domain. Production checks above used `curl --resolve` and Chrome's process-local host-resolver mapping to a returned Cloudflare edge IP, retaining the real hostname/SNI and normal TLS verification. No system DNS, hosts file or certificate checks were changed. Allow cached negative answers to expire; these observations are a dated record, not a claim that every resolver worldwide already works.

The ignored local receipt is `test-results/hosting-edge-verification.json`; browser screenshots are under `test-results/`. Future checks should first use normal DNS and `npm run verify:hosting`. No paid plan, Supabase project, cloud economy, native app, IPFS upload or NFT issuance was created by this deployment.
