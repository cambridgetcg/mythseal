# Supabase developer setup

The project-local CLI is pinned in the root npm lockfile. `config.toml` was generated with CLI 2.117.0, then given local project ID `mythseal`, the existing development origin `http://127.0.0.1:4177`, disabled seed loading and explicit grants for new public tables.

The hosted **development** project is [`mythseal-dev`](https://supabase.com/dashboard/project/puiuevggytoxyyearkcq), reference `puiuevggytoxyyearkcq`, in the **Mythseal** Free organization (`qcyhijplkcjzqdbkcjje`). Its database region is London (`eu-west-2`). The reference is saved in ignored `.env.local` and the CLI is linked through `supabase/.temp/project-ref`; local project ID `mythseal` remains distinct from the cloud reference.

Verified at **2026-09-21T19:39:48Z**: the project reported `ACTIVE_HEALTHY`, database/Auth/REST/Storage/Realtime health checks passed, and the Management API read-only query `select 1 as ok` returned `ok: 1`. Direct database authentication with the generated password has not been tested; CLI 2.117.0 linking does not validate that password.

The generated database password is stored only in ignored `.env.local` as `SUPABASE_DB_PASSWORD`, with file permissions `0600`. The management access token remains in macOS Keychain. Never commit these credentials or expose them to the browser game.

`config.toml` remains **local configuration** and has not been pushed to the hosted project. No game schema, privileged application role, player login or Hyperdrive connection has been implemented yet.

```sh
npm ci
npm run connect
npm run connections:check -- --live
```

Choose Supabase in the owner-operated connection helper to start its official login. The CLI uses native credential storage where available; the assistant connector has a separate authorization flow. Do not put management tokens into the browser game.

The helper explicitly runs `npx --no-install supabase --agent no --output-format text login --name mythseal-dev`. A Terminal opened from Codex can inherit agent markers, which otherwise make Supabase CLI 2.117.0 choose JSON output and reject interactive login with `NonInteractiveError`. These flags apply only to the owner login command. Follow the Terminal prompts; if the browser does not open, use the printed official login link. After updating the helper, exit any already-running copy with `0` and reopen `Connect.command`.

Local `npx --no-install supabase start` requires a working Docker-compatible runtime; that prerequisite is not installed by this scaffold. Do not assume the local database has been started or verified. The hosted development project can be used independently of local containers. Cloud Auth redirect URLs, email delivery and providers must be configured against the actual future login flow; they have not been pushed from this local file.

Connection evidence and remaining setup are in [CONNECTIONS.md](../docs/CONNECTIONS.md); the intended server-owned schema and restricted database role are in [BACKEND-STACK.md](../docs/BACKEND-STACK.md).
