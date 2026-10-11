# Mythseal hosting

Site: [mythseal.com](https://mythseal.com). Source: [private cambridgetcg/mythseal](https://github.com/cambridgetcg/mythseal). **v0.5.1 is deployed with email login enabled**, following verified Resend/Supabase setup and the owner's successful mailbox/local-browser test. Deployment receipts below distinguish actual live versions from source changes. The proposed next release (v0.6.0, not yet deployed or migrated) is planned in [RELEASE-NEXT.md](RELEASE-NEXT.md).

## Topology and public boundary

- `mythseal`: Cloudflare Workers Static Assets at the apex custom domain. Only `/api/*` runs the account Worker first; static files retain asset-first delivery. The Worker uses Supabase Auth and account-private offline backup RPCs, never trusted game economy commands.
- `mythseal-www`: tiny Worker at `www.mythseal.com`, plus the scheme-specific `http://mythseal.com/*` route, returning permanent 308 redirects to HTTPS apex while preserving path and query. It serves no assets and has no secrets. HTTPS apex requests still go directly to static assets.
- `workers.dev` and version preview URLs are disabled in both configs. Unknown paths return 404; this UI does not need a catch-all SPA fallback.

Cloudflare manages the custom-domain DNS record and certificate in the existing active zone. This deployment does not change nameservers, mail records or another site's routes. The account ID in Wrangler config is a routing identifier, not a credential. [Custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

`npm run build` copies the 19 runtime files in `hosting/public-assets.json` plus HTTP headers and a generated `release.json` into ignored `dist/`. The local Python server shares this allowlist. The build rejects symlinked inputs and discards stale output. Docs, server source, tests, credentials, player exports, source configuration and `.git` are excluded. Wrangler bundles the Worker separately for server execution. A private repo still delivers browser JavaScript and approved artwork publicly as part of the game.

Headers restrict scripts to the same origin, prevent framing and MIME sniffing, and revalidate assets whose filenames are not fingerprinted. Inline styles remain necessary for existing card rendering. The release manifest hashes each approved file; secrets and internal provenance are never part of that manifest. `_headers` configures responses and is not a downloadable runtime resource. [Static assets](https://developers.cloudflare.com/workers/static-assets/), [headers](https://developers.cloudflare.com/workers/static-assets/headers/).

Cloudflare's static `_redirects` format does not support domain-level redirects, hence the separate `www` Worker. Asset-first routing avoids running application code for static requests. [Redirect limitations](https://developers.cloudflare.com/workers/static-assets/redirects/), [Worker routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/).

## Build and deploy

Prerequisites: Node 22+, Git, and an authorized Wrangler login to the existing Mythseal Cloudflare account. `npm ci` installs **Wrangler 4.136.1** from the committed lockfile. It is a development/deployment dependency; the game runtime and asset builder use no npm dependencies. The deploy script checks the expected CLI version; upgrading it is a deliberate tooling change.

The runtime compatibility date is `2026-06-16`. It describes API behavior, not the release date. The older shared CLI first rejected a newer compatibility date, then its local preview returned a root-route 404 despite resolving other assets. The pinned project CLI fixes that preview failure; the shared installation is unchanged.

```sh
npm ci
npm test
npm run deploy -- --dry-run
```

The tracked helper invokes `node_modules/wrangler/bin/wrangler.js` directly with
the current Node executable, so a shared Wrangler on `PATH` cannot replace the
pinned CLI. A dry run builds the allowlisted assets and validates **both** Worker
bundles, including the apex `--keep-vars` flag. It permits uncommitted work and
makes no hosted identity or secret-list requests; it does not establish release
identity, binding availability or hosted retention. The helper selects the
top-level environment explicitly and skips implicit `.env`/`.env.local` loading.
Supply any intended CLI authentication through the existing native Wrangler
session or process environment. Both config files currently use strict JSON;
the helper rejects unreadable configuration before invoking Wrangler.

Review the changes, commit the selected release, push it and verify exact-source
GitHub CI. Use a clean checkout and confirm the intended Cloudflare account.
For an authorized release of both existing Workers, use:

```sh
npm run deploy
```

Before any deployment, the helper checks a clean worktree, the pinned CLI, both
configured Worker/account identities, authenticated access to Cloudflare account
`cf4198e651bf3009877d49f688c9d88e`, and existing apex secret **metadata** for
`SUPABASE_PUBLISHABLE_KEY`. It rejects conflicting account environment overrides.
It then builds, dry-runs both bundles and rechecks the worktree/source commit.
Missing access, missing binding metadata, invalid responses or a failed bundle
check stop the release before either Worker is deployed. Provider output and
error bodies are captured without printing them; Wrangler disk logs and telemetry
are disabled for these invocations. The helper never retrieves the binding value
or automatically retries a failed deployment command.

`SUPABASE_PUBLISHABLE_KEY` must already be present for this path. A missing
binding needs the selected project's publishable key provisioned through secure
owner setup; `--keep-vars` cannot create it. The pinned Wrangler 4.136.1 deployment
source retains omitted secret bindings with this flag while still sending the
explicit variables in `wrangler.jsonc`; it also retains other omitted dashboard
variables. This source inspection is not a hosted retention test. Verify account
readiness after the next release. A reviewed `--secrets-file` containing only the
publishable key is the alternative used for the recorded account releases; keep
it outside Git, mode `0600`, and remove the temporary file afterward.

The tracked helper now passes `--keep-vars` for the apex, without overriding the
declared production variables or supplying any key value. Local stub tests cover
the flag, wrong-account and missing-binding rejection, sanitized provider errors,
and the rule that both bundles pass before deployment begins. This is local
command/preflight evidence, **not a hosted binding-preservation test**. At the
next authorized release, verify the deployed source, existing secret metadata,
`/api/v1/account` readiness and intended OTP flag before recording preservation
as proven. A successful anonymous account check still does not prove delivered
mail or cross-device restore. Wrangler's documented behavior and the pinned
implementation are the basis for this approach: [deploy flags](https://developers.cloudflare.com/workers/wrangler/commands/workers/#deploy),
[identity command](https://developers.cloudflare.com/workers/wrangler/commands/general/#whoami).

Deploy the separate redirect Worker only when its code/config needs changing:

```sh
npx --no-install wrangler deploy --config wrangler.www.jsonc \
  --message "Mythseal redirect vX.Y.Z SOURCE_SHA"
```

The helper deploys both Workers; the explicit redirect command above is for an
already reviewed single-Worker release. The two Workers are independent, not an
atomic release. If one deployment fails, inspect provider state and retry only
the unresolved deployment. Never rerun the whole helper blindly after an
ambiguous failure. Never upload the repository root with `--assets .`.

Wrangler uses local OAuth. No OAuth token, API token or account secret is stored in Git or GitHub Actions. Existing CI runs deterministic tests, the allowlist build and syntax checks; it does **not** deploy production. A later Cloudflare Git integration or narrowly scoped deploy credential can automate a reviewed release path after preview/promotion is implemented. This release does not create unattended CD, staging or a public GitHub release.

## Verification and rollback

After deployment, check HTTPS, the correct title, JS MIME type, CSP, all images, `www` redirect, desktop/mobile browser navigation and a battle. Compare `/release.json` to the committed build. Confirm `/README.md`, `/docs/BACKEND-STACK.md`, `/.git/config`, `/package.json`, `/wrangler.jsonc` and `/_headers` return 404.

`npm run verify:hosting` checks the live manifest against local `dist/release.json`, hashes every public asset, checks security headers/JS MIME, probes 13 private paths, checks both `www` and HTTP-to-HTTPS redirects, and verifies anonymous account JSON and CSRF rejection. Browser flow remains a separate check: run `tools/smoke.mjs` with `GAME_URL=https://mythseal.com` and a configured Playwright installation. `tools/account-smoke.mjs` exercises UI flows with intercepted API fixtures; it does not prove real email delivery.

The manifest comparison includes Git SHA. After documentation-only commits,
verify the unchanged live site from a separate worktree of its deployed tag;
building current `main` would correctly produce different source metadata. The
guest/browser and connected-preview setup for a new machine is in
[HANDOVER.md](HANDOVER.md). Neither that guide nor a documentation push deploys
the website.

To roll back, use Cloudflare deployment history for the affected Worker and restore its last known-good version. Keep apex and redirect version records separate; version IDs are not Git SHAs. `wrangler deployments list` and `wrangler rollback <version-id>` accept the applicable `--config` file. The first deployment has no earlier production version. Before a later rollback, check that the old client can read the existing save schema. [Cloudflare rollback](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/).

Local progress belongs to the browser origin. The old `shanhai.*` keys remain intact, but `localhost`, apex and other hosts do not share them. Export remains available; the new journey archive provides explicit cloud backup/restore after email login is enabled. It creates a local recovery copy before replacing progress. No valuable ownership is inferred from local saves.

## v0.5.1 email-login deployment record

Deployment completed **2026-09-21 21:24:31.875 UTC** from source/tag **v0.5.1**, commit `ea485586d14032bc145a993749a49d5c343ff5f8`. Apex Worker version: **`f254ef87-286c-4960-9888-4986b1a34f5b`**. Public `OTP_ENABLED=true`. The unchanged 19 browser assets retain manifest `7c18fcebe9d184987658caef56cbe4df9cac6ff6c8126aa80dd8d16541474e88`.

Only the apex Worker was redeployed. The redirect Worker stays at `c14a675f-3474-4d66-a341-5fa0d388108e`. SMTP credentials remain in Supabase and ignored mode-0600 local recovery storage; the Worker continues to receive only the Supabase publishable key. The ignored deployment helper required a clean versioned checkout and successful sender/pilot receipts, captured provider output privately, and removed its temporary secret file afterward.

- [Exact release CI](https://github.com/cambridgetcg/mythseal/actions/runs/35656826179) passed before deployment: Node/Python suites, disposable PostgreSQL security/concurrency checks, contract fixture, public build, syntax and both Worker dry runs.
- The owner confirmed receiving a six-digit email code and successful local-pilot browser login at **21:18:34.252 UTC**, after the domain and SMTP/templates verified. This is owner-reported mailbox evidence.
- `npm run verify:hosting` matched the live v0.5.1 commit/manifest, all **19 assets**, security headers/MIME, **13 private-path 404s**, canonical redirects, anonymous account JSON and CSRF rejection through normal DNS/TLS.
- At **21:24:47–21:24:50 UTC**, a separate synthetic account verified a generated six-digit code through the real HTTPS `/auth/verify` endpoint, received host-only Secure/HttpOnly/SameSite cookies, read the enabled account and empty private journey, then logged out and returned to guest state. This API check sent no email. Cleanup confirmed **zero matching fixture users** remaining; no owner journey was changed.
- The browser assets are identical to the previously tested v0.5.0 UI. A mailbox-delivered sign-in through the public browser origin and a physical cross-device restore were not independently exercised in this release check.

Ignored receipts: `test-results/otp-deploy.json`, `test-results/email-release-check.json`, `.runtime/resend-smtp-config.json` and `.runtime/owner-otp-pilot.json`. Later documentation commits do not change the deployed source/tag above. Reverting the apex to the v0.5.0 Worker closes public code login while retaining stored journeys; SMTP configuration is managed separately.

## v0.5.0 deployment record

Deployment completed **2026-09-21 20:30:58 UTC**. Source/tag: **v0.5.0**, commit `339e4f57979affe54fb705cde755552795ba7330`. Later validation/documentation commits do not imply another deployment.

| Artifact | Recorded identity |
| --- | --- |
| Apex Worker version | `a60b4dd0-761f-4f05-bf90-be780be8ddc6` |
| Redirect Worker version | `c14a675f-3474-4d66-a341-5fa0d388108e` |
| Public assets manifest SHA-256 | `7c18fcebe9d184987658caef56cbe4df9cac6ff6c8126aa80dd8d16541474e88` |
| Public email login | `OTP_ENABLED=false`; Resend connection/SMTP and delivered-code verification pending |

- [Deployed-source CI](https://github.com/cambridgetcg/mythseal/actions/runs/35651299770) passed: 172 Node tests, six Python tests, disposable PostgreSQL isolation/CAS/tombstone/parallel-race checks, the existing local contract fixture, syntax, build and both Worker dry runs.
- Normal DNS and TLS worked without edge overrides. `npm run verify:hosting` matched all **19 asset hashes**, the release manifest, security headers/JavaScript MIME, **13 private-path 404s**, canonical redirects, anonymous account JSON and cross-origin mutation rejection.
- Production browser smoke completed a four-round desktop match, deck persistence, collection/rules and mobile interactions without page/network errors or horizontal overflow.
- Nine account UI flow groups passed against deployed assets using isolated browsers and **intercepted API fixtures**. The 390px views included guest, long-email account and confirmation layouts. Screenshots are in ignored `test-results/live-account/`; this is UI evidence, not email delivery.
- At **20:32:22–20:32:27 UTC**, real authenticated HTTPS requests traversed the deployed Worker and Supabase: exact backups, account isolation, identity mismatch rejection, HTTP 409 conflicts, deletion tombstones, stale recreation rejection and logout passed. The checker injected valid synthetic sessions without sending mail. Its **2,000-card** snapshot was 486,009 compact bytes; PUT/GET took 734/178 ms wall time. This demonstrates that request, not a general CPU or latency guarantee. Cleanup independently found zero test users and backups remaining.
- The Worker receives only the Supabase **publishable** key. Elevated credentials for disposable test-user administration stayed in local process memory. No SMTP credential, wallet, paid upgrade, mint or public GitHub release was created.

Ignored deployment receipt: `test-results/account-deploy.json`. The database migrations remain separate from Cloudflare versions. A static rollback to v0.4.1 hides the archive UI while leaving backup rows intact; do not roll back the database merely to roll back the UI. The hosted checker lets Cloudflare supply its trusted client-IP header; a simulated header is used only in local-handler tests.

## First deployment record · v0.4.1

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
