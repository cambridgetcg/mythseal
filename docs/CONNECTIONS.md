# Mythseal developer connections and toolkits

Initial toolkit setup and live audit: **2026-09-21 19:10:56 UTC**. This record separates installed tooling, verified account access and resources that actually exist. The owner authorized authentication/connections for the selected stack, a new **free Pinata account** path, and subsequently a new Mythseal Supabase project in **London**. The free development project below is now provisioned. No paid upgrade, bucket, contract deployment or store enrollment was performed.

Supabase owner login was verified at **2026-09-21 19:26:31 UTC**. The new hosted development project was verified separately at **2026-09-21 19:39:48 UTC**; Supabase project selection and Pinata access were rechecked at **19:42:27 UTC**. Other service evidence retains the initial audit timestamp above.

The private journey migration was applied through the official CLI at **2026-09-21 20:16:06 UTC**, with direct database password authentication verified. Follow-up migration `20260921210100` was applied at **20:24:59 UTC**, and the hosted rollback suite passed with zero fixture users remaining. Real Supabase Auth/RPC checks passed at **20:25:35–20:25:41 UTC** with cleanup confirmed. Resend verified all five domain records at **21:15:31 UTC**; SMTP/templates passed readback at **21:16:00.449 UTC**. The owner confirmed receipt of a numeric email code and successful local-pilot login at **21:18:34.252 UTC**. v0.5.1 deployed at **21:24:31.875 UTC** with `OTP_ENABLED=true`; hosted OTP/session/logout checks passed with fixture cleanup verified at **21:24:50.578 UTC**. See [ACCOUNTS.md](ACCOUNTS.md).

## Verified access

| Service | Evidence | Remaining boundary |
| --- | --- | --- |
| GitHub | Authenticated as `cambridgetcg`; exact private `cambridgetcg/mythseal` repository read/push/admin permissions verified. | Existing CI is active; production deployment remains explicit. |
| Cloudflare | Existing OAuth matches account `cf4198e651bf3009877d49f688c9d88e`; the game was deployed through it. The owner manually added the Resend DNS records, whose public values matched at 21:10:39 UTC. | This OAuth has no DNS-edit scope; the DNS-record read probe returned HTTP 403/code `10000`. Domain Connect was offered, but the owner used manual setup. |
| Hyperdrive | Configuration list request succeeded; zero configurations. | No database connection, origin credential or pool has been created. |
| R2 | API returned service-not-enabled, code `10042`. | Owner must activate R2 in the Cloudflare dashboard before bucket/pinning work; no billing setting was changed. Current static hosting does not depend on R2. |
| Supabase project / CLI | `mythseal-dev` is linked locally; London `eu-west-2`, organization plan `free`. Initial health checks passed. Migrations `20260921210000` and `20260921210100`, direct password authentication and hosted rollback tests passed. A local handler also exercised real Auth/RPC with disposable accounts. | Account-private offline backup storage is implemented. Owner mailbox/local-pilot login and public HTTPS OTP/session checks succeeded. Authoritative game tables, the `game_api` role and Hyperdrive remain future work. |
| Resend / player email | Official CLI OAuth uses macOS Keychain. Resend verified `auth.mythseal.com` and all five records at **21:15:31 UTC**. SMTP and both templates passed all 16 non-secret readbacks at **21:16:00.449 UTC**. Tracking stays off; receiving enabled by the owner was preserved. | Owner confirmed numeric email receipt/local-pilot login at **21:18:34.252 UTC**. Public v0.5.1 activation and generated-OTP/session/logout checks passed. Setup/check tools sent no real email. No paid plan change was made; billing tier was not independently inspected. |
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

The ignored `.runtime/supabase-provision.json` records the initial provisioning and health evidence. Local CLI linking was confirmed by matching `supabase/.temp/project-ref` to the new reference. The initial `POST /v1/projects/{ref}/database/query/read-only` check used `select 1 as ok`; linking alone did not demonstrate a SQL connection. The health request omitted optional `timeout_ms`: the live API rejected its documented query-string form as a string/number type mismatch. Initial provisioning made no application schema or Auth configuration changes.

The later ignored `.runtime/account-migration.json` records the applied private-backup migration and direct database check. The hosted rollback suite exercised anonymous execution denial, missing identity, per-account isolation, snapshot bounds, stale revisions and deletion/recreation protection. A follow-up check found zero synthetic fixture users. The separate local PostgreSQL harness also exercised genuinely concurrent first inserts and updates. These tests verify the backup storage boundary; they do not certify email delivery or an authoritative game economy.

Follow-up migration `20260921210100_backup_conflict_http_status.sql` returns `PT409` for a stale expected revision. This is a permanent HTTP conflict; using serialization-failure `40001` caused PostgREST to retry instead of returning the decision to the client. The hosted rollback suite passed after the correction. [Supabase RPC retry guidance](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b).

The later real-provider check used the local Worker handler and SDK against hosted Supabase, with a generated verification code that sent **no email**. It verified identity, save/read, `PT409` conflicts, unauthorized access, two-account isolation, deletion tombstones, stale recreation rejection, recreation and logout clearing. A 2,000-card fixture with 486,009 compact JSON bytes and 522,196 JSONB text bytes saved and read successfully. Both disposable users and their backups were removed and zero remaining fixtures were confirmed. This evidence does not claim a deployed Worker or mailbox-delivered login.

The hosted Auth API initially rejected the custom templates with HTTP 400 while the default sender was active. The successful custom SMTP/template configuration at **21:16:00.449 UTC** supersedes that earlier result. No paid upgrade was made. A local `config.toml` entry alone is not evidence of a hosted change.

At **2026-09-21 20:18:39 UTC**, the site/redirect origin, email confirmation requirements, six-digit code length, 600-second expiry and 60-second resend interval were applied and read back. SMTP/templates were pending at that time. At **21:16:00.449 UTC**, the guarded setup connected custom SMTP and both OTP templates; all **16 non-secret settings** matched on readback.

The subsequent `.runtime/mythseal-setup-check.json` confirms that CLI project-list access includes the exact selected project (two accessible projects in total), the environment file remains mode `0600`, and the preserved Pinata JWT still receives HTTP `200` from the read-only file-list endpoint.

The generated database password is saved as `SUPABASE_DB_PASSWORD` in ignored `.env.local`, mode **0600**, alongside the new `SUPABASE_PROJECT_REF` and `SUPABASE_URL`; existing Pinata settings were preserved. The owner management token remains in macOS Keychain. No credential was printed, passed as a command-line argument, committed or copied to the public website.

The v0.5.0 account Worker was deployed at **20:30:58 UTC**. Real authenticated HTTPS checks through `mythseal.com` and Supabase passed at **20:32:27 UTC**, including a 2,000-card backup, conflicts, isolation and logout. Disposable sessions were injected without sending email; cleanup verified zero synthetic users/backups. Only the publishable key is bound to the Worker; elevated test credentials remained in local process memory. Public OTP remained disabled during that deployment; the later successful owner pilot and prepared activation are recorded below. See [deployment evidence](HOSTING.md).

## Installed project toolkit

`npm ci` restores exact versions from `package-lock.json`; these are development dependencies and are not added to the public browser runtime.

| Toolkit | Pinned version | Purpose |
| --- | --- | --- |
| Wrangler | 4.136.1 | Existing Cloudflare build/deploy tooling |
| Supabase CLI / JS SDK | 2.117.0 / 2.116.0 | Versioned migrations and server-only player auth/private-backup adapter |
| Resend CLI | 2.21.1 | Official browser OAuth, sending-domain setup and private SMTP credential provisioning |
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
4. **Resend:** choose `4` for the official browser OAuth flow, then select **Login with Resend (opens browser)**. The helper invokes the pinned local CLI interactively in the owner's macOS Terminal, using profile `mythseal` and macOS Keychain. Choose `5` for its read-only domain access check. The helper requires a real Terminal, clears inherited API-key/profile/config-path/Node-hook overrides and pins the official API endpoint; it does not request a key in chat. The public CLI overview can lag the release: browser OAuth is present in the pinned [v2.21.1 login implementation](https://github.com/resend/resend-cli/blob/v2.21.1/src/commands/auth/login.ts).

The Pinata JWT is currently in root `.env.local`, Git-ignored, mode **0600**, outside the public asset allowlist. The helper preserves other entries, replaces only its own JWT setting atomically, rejects symlinks/multiline injection and refuses an echoed-input fallback. Temporary files are also ignored. It never prints the JWT or provider response bodies. `.env.example` contains only names/placeholders and the public Base Sepolia RPC URL. No wallet private key belongs in this file.

Developer API credentials are separate from **player** authentication. The player UI and Worker adapter now exist; ordinary Supabase player sessions authorize private backups. The Worker uses the project's publishable key and no service-role credential. Session tokens stay in HttpOnly cookies, not browser storage. Google/Apple providers and production SMTP are not configured. Developer login alone does not sign a player into the game.

## Repeatable checks

```sh
npm run connections:check              # local tooling/presence only
npm run connections:check -- --live    # core read-only account/RPC checks
npm run connections:check -- --all     # also optional Vercel/Fly/AWS identities
npm run test:connections              # report secrecy + local secret storage
npm run test:contracts                # local EVM only; no RPC/signing
```

Connection checks emit boolean presence, bounded counts and status codes. They do not echo tokens, provider records, raw command errors or API response bodies. Each external request has a timeout. R2/Hyperdrive checks run only after the intended Cloudflare account is confirmed. Unknown output and a failed identity check are not treated as verified access.

The initial toolkit validation covered Node/Python helper tests, a local Forge ERC-721 fixture, syntax and the previous 15-file public build. v0.5.0 adds account/client/snapshot tests, SQL isolation/concurrency checks and a nine-flow intercepted browser smoke. The new public allowlist contains 19 game assets; server source, toolkits, tests and credentials remain excluded. Current evidence is in [VALIDATION.md](VALIDATION.md), with actual deployed manifests and CI results recorded separately from account-access checks.

## Next setup steps

The London development project has the private-backup schema, verified Resend domain and configured SMTP/numeric-code templates. The owner confirmed receipt of a numeric email code and successful local-pilot login at **21:18:34.252 UTC**. v0.5.1 deployed at **21:24:31.875 UTC** with `OTP_ENABLED=true`; hosted OTP/session/logout checks passed with fixture cleanup verified at **21:24:50.578 UTC**. A mailbox-delivered public-browser sign-in and physical cross-device restoration remain separately unverified. [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless).

The existing sending domain is `auth.mythseal.com`, ID `76636039-37bb-4ae3-b6d4-67a47bffc0aa`, in Ireland `eu-west-1`. The owner manually added DNS records; Resend verified all five at **21:15:31 UTC**. The owner enabled receiving during setup; that setting was preserved and does not implement an incoming-mail game feature. Existing website deployment credentials cannot edit DNS. [Resend Cloudflare setup](https://resend.com/docs/knowledge-base/cloudflare).

The ignored `.runtime/connect-resend-smtp.mjs` completed at **21:16:00.449 UTC** after its project/domain identity guards passed. It created a dedicated domain-restricted `sending_access` key, captured it privately in an ignored mode-`0600` file, and connected sender `Mythseal <login@auth.mythseal.com>`, host `smtp.resend.com`, port `465` and user `resend`. Both checked-in OTP templates and the six-digit/600-second/60-second resend settings matched on readback. Retry reuses the private credential record and refuses a duplicate named key if the original secret is missing. No SMTP key belongs in a Worker binding or public asset. Setup/check tools sent no real email; the owner subsequently initiated and confirmed delivery/login through the local pilot at `http://127.0.0.1:8791/`. [Resend SMTP settings](https://resend.com/docs/send-with-supabase-smtp).

The authoritative game schema, restricted `game_api` role and Hyperdrive connection remain a later phase. Production resources, recovery budgets and paid-service changes remain separate decisions. The private-backup implementation uses authenticated SQL RPCs and can proceed without AWS, Vercel, Fly, Hyperdrive or an R2 bucket.

When artwork archiving starts, activate R2 if it is chosen for the independent backup and verify a small explicit pin/upload/restore flow; a successful Pinata read does not prove persistence. Before native builds, finish Xcode/Java/Android toolchains and owner-controlled Apple/Google signing accounts. Before testnet writes, choose an owner-controlled wallet/signing workflow and verify recovery; this setup created no wallet/signing keys or token issuance.
