# Mythseal developer connections and toolkits

Initial toolkit setup and live audit: **2026-09-21 19:10:56 UTC**. This record separates installed tooling, verified account access and resources that actually exist. The owner authorized authentication/connections for the selected stack, a new **free Pinata account** path, and subsequently a new Mythseal Supabase project in **London**. The free development project below is now provisioned. No paid upgrade, bucket, contract deployment or store enrollment was performed.

Supabase owner login was verified at **2026-09-21 19:26:31 UTC**. The new hosted development project was verified separately at **2026-09-21 19:39:48 UTC**; Supabase project selection and Pinata access were rechecked at **19:42:27 UTC**. Other service evidence retains the initial audit timestamp above.

## Verified access

| Service | Evidence | Remaining boundary |
| --- | --- | --- |
| GitHub | Authenticated as `cambridgetcg`; exact private `cambridgetcg/mythseal` repository read/push/admin permissions verified. | Existing CI is active; production deployment remains explicit. |
| Cloudflare | Existing OAuth matches account `cf4198e651bf3009877d49f688c9d88e`; the game was deployed through it. | Account login does not automatically enable every product. |
| Hyperdrive | Configuration list request succeeded; zero configurations. | No database connection, origin credential or pool has been created. |
| R2 | API returned service-not-enabled, code `10042`. | Owner must activate R2 in the Cloudflare dashboard before bucket/pinning work; no billing setting was changed. Current static hosting does not depend on R2. |
| Supabase project / CLI | `mythseal-dev` is linked locally; London `eu-west-2`, organization plan `free`, project status `ACTIVE_HEALTHY`. Database/Auth/REST/Storage/Realtime health checks passed; a Management API read-only SQL query returned `ok: 1`. | Development infrastructure only. Game schema, application roles, player sign-in and Hyperdrive remain unimplemented. Direct database password authentication has not been tested. |
| Supabase assistant integration | Available, but installation/connection was not confirmed by the latest integration inventory. | Optional alternative to CLI access; installing tooling and authorizing an account are separate operations. |
| Base Sepolia | Read-only public RPC returned chain ID **84532**; viem independently confirmed the expected chain. | No wallet, signer, funded account, contract or transaction. Public RPC is a development endpoint, not an SLA. |
| Pinata | `GET /v3/files/public?limit=1` returned **200** using the locally entered JWT. | File-read access verified; no upload was made and upload/delete scope was not exercised. Billing tier was not inspected. |
| Image generation | The session already exposes image generation; existing original game art was produced with it. | No additional API credential needed for interactive art work. This is not an unattended image-generation API pipeline. |
| Vercel / Fly | Existing identity commands succeeded. | Available alternatives, not additional Mythseal hosting resources. No new project/machine was created. |
| AWS | CLI exists; identity command did not succeed. | Identity/permissions remain unverified; AWS is not required by the selected initial stack. |

The ignored `.runtime/connections.json` holds the machine-readable, secret-free audit. A successful audit command means the report ran, **not** that every service is connected. Read individual statuses and timestamps.

## Hosted development project

| Setting | Verified value |
| --- | --- |
| Organization | `Mythseal` — `qcyhijplkcjzqdbkcjje` |
| Plan | **Free**, verified through the organization API before creation and after provisioning |
| Project | [`mythseal-dev`](https://supabase.com/dashboard/project/puiuevggytoxyyearkcq) |
| Project reference | `puiuevggytoxyyearkcq` |
| Region | London — `eu-west-2`, explicitly selected by the owner |
| API origin | `https://puiuevggytoxyyearkcq.supabase.co` |

The existing `cambridgetcg` organization is Pro. A separate Free organization was created for this project because Supabase plans apply at organization level and additional paid projects incur compute charges. No existing project or billing setting was changed. [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase).

The ignored `.runtime/supabase-provision.json` records the specific provisioning and health evidence. Local CLI linking was confirmed by matching `supabase/.temp/project-ref` to the new reference. The separate `POST /v1/projects/{ref}/database/query/read-only` check used `select 1 as ok`; linking alone does not demonstrate a SQL connection. The health request omitted optional `timeout_ms`: the live API rejected its documented query-string form as a string/number type mismatch. No application tables, migrations or cloud Auth configuration were pushed.

The subsequent `.runtime/mythseal-setup-check.json` confirms that CLI project-list access includes the exact selected project (two accessible projects in total), the environment file remains mode `0600`, and the preserved Pinata JWT still receives HTTP `200` from the read-only file-list endpoint.

The generated database password is saved as `SUPABASE_DB_PASSWORD` in ignored `.env.local`, mode **0600**, alongside the new `SUPABASE_PROJECT_REF` and `SUPABASE_URL`; existing Pinata settings were preserved. The owner management token remains in macOS Keychain. No credential was printed, passed as a command-line argument, committed or copied to the public website.

## Installed project toolkit

`npm ci` restores exact versions from `package-lock.json`; these are development dependencies and are not added to the public browser runtime.

| Toolkit | Pinned version | Purpose |
| --- | --- | --- |
| Wrangler | 4.136.1 | Existing Cloudflare build/deploy tooling |
| Supabase CLI / JS SDK | 2.117.0 / 2.116.0 | Local configuration, future migrations/auth adapter |
| `pg` | 8.23.0 | Future transactional Hyperdrive/Postgres adapter |
| viem | 2.56.8 | EVM read client and future wallet/contract adapter |
| OpenZeppelin Contracts | 5.6.1 | Standard ERC-721 library for future reviewed contracts |
| Foundry / Solidity | Existing Foundry 1.7.1 / compiler 0.8.30 | Local compiler/EVM tests; explicit npm remapping under `contracts/` |
| Capacitor CLI / Core | 8.5.2 / 8.5.2 | Future native packaging of allowlisted `dist/` |

The Capacitor config sets provisional `com.mythseal.game`, display name `Mythseal` and `webDir: dist`. No native projects or store registrations were generated. iOS/Android platform packages, full Xcode, a working Java runtime and native signing remain unconfigured. This Mac has Apple command-line tools and working `adb`; these alone cannot build an iOS/Android app. Docker is also unavailable, so no local Supabase stack is running.

Capacitor's `xcode@3.0.1` dependency selected an affected `uuid@7.0.3`. A narrowly scoped npm override pins `xcode → uuid@11.1.1`, a patched CommonJS-compatible release. Its actual Xcode project-ID generator was exercised with 100 IDs in an isolated compatibility check; the resulting project dependency audit reported zero vulnerabilities. Revisit the override when upstream fixes its dependency. [Maintainer advisory](https://github.com/uuidjs/uuid/security/advisories/GHSA-w5hq-g745-h8pq).

## Owner login and credential storage

Double-click [Connect.command](../Connect.command), or run:

```sh
npm run connect
```

1. **Supabase:** choose `1` for the official CLI browser flow. Complete sign-in in the owner's browser/Terminal. The CLI stores the developer token in native credential storage when supported; its documented fallback is `~/.supabase/access-token`. A separate assistant integration login is optional if CLI access satisfies the work. [Supabase login](https://supabase.com/docs/reference/cli/supabase-login), [assistant integration](https://supabase.com/docs/guides/ai-tools/mcp).
2. **Pinata:** choose `2`. The owner opens [Pinata](https://app.pinata.cloud/) and creates the requested free account, then a named Mythseal key in [API keys](https://app.pinata.cloud/developers/api-keys). Use `org:files:read` for checks and `org:files:write` for the future uploader; an Admin key is unnecessary. Paste the JWT into the hidden Terminal prompt, never chat or a shell command argument. The helper checks file-read access before saving anything. [Pinata keys](https://docs.pinata.cloud/account-management/api-keys), [file-read endpoint](https://docs.pinata.cloud/api-reference/endpoint/list-files).
3. **Check:** choose `3` or run the command below. This checkout now selects `mythseal-dev` through the ignored local project reference. A fresh checkout needs the same explicit project selection; account login alone is insufficient.

The Pinata JWT is currently in root `.env.local`, Git-ignored, mode **0600**, outside the public asset allowlist. The helper preserves other entries, replaces only its own JWT setting atomically, rejects symlinks/multiline injection and refuses an echoed-input fallback. Temporary files are also ignored. It never prints the JWT or provider response bodies. `.env.example` contains only names/placeholders and the public Base Sepolia RPC URL. No wallet private key belongs in this file.

Developer API credentials are different from future **player** authentication. This work does not add sign-in screens, player Google/Apple providers, a Supabase service-role browser key or production SMTP. Those follow the game account implementation.

## Repeatable checks

```sh
npm run connections:check              # local tooling/presence only
npm run connections:check -- --live    # core read-only account/RPC checks
npm run connections:check -- --all     # also optional Vercel/Fly/AWS identities
npm run test:connections              # report secrecy + local secret storage
npm run test:contracts                # local EVM only; no RPC/signing
```

Connection checks emit boolean presence, bounded counts and status codes. They do not echo tokens, provider records, raw command errors or API response bodies. Each external request has a timeout. R2/Hyperdrive checks run only after the intended Cloudflare account is confirmed. Unknown output and a failed identity check are not treated as verified access.

Completed local validation: **117 Node tests**, **4 Python credential-helper tests**, **1 local Forge ERC-721 integration test**, syntax checks and the public build. The public asset manifest remains `fe448b3147b0cea2f6d57b941ff4da912da4b8e7722b5c2873d9114ca6705240`; toolkits and credentials are not website assets. CI also runs the Node/Python checks and pinned Foundry fixture. CI is separate from the owner-authenticated live audit.

## Next setup steps

The London development project is ready and locally linked. Next implement versioned game-schema migrations, a restricted `game_api` role, the Hyperdrive connection and Auth redirect URLs for the actual player login flow. Production resources, recovery and paid-service budgets remain separate decisions. The selected initial gameplay path can proceed without AWS, Vercel, Fly or an R2 bucket.

When artwork archiving starts, activate R2 if it is chosen for the independent backup and verify a small explicit pin/upload/restore flow; a successful Pinata read does not prove persistence. Before native builds, finish Xcode/Java/Android toolchains and owner-controlled Apple/Google signing accounts. Before testnet writes, choose an owner-controlled wallet/signing workflow and verify recovery; this setup intentionally created no keys or token issuance.
