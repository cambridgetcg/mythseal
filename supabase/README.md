# Supabase developer setup

The project-local CLI is pinned in the root npm lockfile. `config.toml` was generated with CLI 2.117.0, then given local project ID `mythseal`, the existing development origin `http://127.0.0.1:4177`, disabled seed loading and explicit grants for new public tables.

The hosted **development** project is [`mythseal-dev`](https://supabase.com/dashboard/project/puiuevggytoxyyearkcq), reference `puiuevggytoxyyearkcq`, in the **Mythseal** Free organization (`qcyhijplkcjzqdbkcjje`). Its database region is London (`eu-west-2`). The reference is saved in ignored `.env.local` and the CLI is linked through `supabase/.temp/project-ref`; local project ID `mythseal` remains distinct from the cloud reference.

Initial health was verified at **2026-09-21T19:39:48Z**. Direct password authentication and both private-backup migrations were subsequently verified; current evidence is in [CONNECTIONS.md](../docs/CONNECTIONS.md). Linking by itself does not validate a database password. **This project now backs the public website's real player accounts and backups**, despite its `-dev` name; it is not a disposable test database.

The generated database password is stored only in ignored `.env.local` as `SUPABASE_DB_PASSWORD`, with file permissions `0600`. The management access token remains in macOS Keychain. Never commit these credentials or expose them to the browser game.

`config.toml` remains **local configuration** and has not been pushed wholesale to the hosted project. Hosted migrations `20260921210000_private_journey_backups.sql` and `20260921210100_backup_conflict_http_status.sql` are applied. Supabase Auth, authenticated private-backup RPCs and Resend SMTP are live through the v0.5.1 Worker. The authoritative game schema, `game_api` role and Hyperdrive connection remain future work. Do not replay provisioning or reset the hosted database as a fresh-clone setup step.

```sh
npm ci
npm run connect
npm run connections:check -- --live
```

Choose Supabase in the owner-operated connection helper to start its official login. The CLI uses native credential storage where available; the assistant connector has a separate authorization flow. Do not put management tokens into the browser game.

A fresh clone has neither `.env.local` nor the CLI's ignored `.temp` link state.
Select `SUPABASE_PROJECT_REF=puiuevggytoxyyearkcq` in local configuration for the
connection report, and explicitly link this same project with the CLI before
migration work. The report's project selection and the CLI link are distinct.
Recover existing credentials through the owner; do not create a replacement
project or select an unrelated organization. See the [agent handover](../docs/HANDOVER.md).

The helper explicitly runs `npx --no-install supabase --agent no --output-format text login --name mythseal-dev`. A Terminal opened from Codex can inherit agent markers, which otherwise make Supabase CLI 2.117.0 choose JSON output and reject interactive login with `NonInteractiveError`. These flags apply only to the owner login command. Follow the Terminal prompts; if the browser does not open, use the printed official login link. After updating the helper, exit any already-running copy with `0` and reopen `Connect.command`.

Local `npx --no-install supabase start` requires a working Docker-compatible runtime; that prerequisite is not installed by this scaffold. Do not assume the local database has been started or verified. Hosted Auth uses site/redirect origin `https://mythseal.com`, confirmed email, six-digit OTPs with 600-second expiry and a 60-second resend interval. Both confirmation and magic-link templates use [templates/otp.html](templates/otp.html). Custom SMTP was configured separately through the hosted API, not by pushing this local file; Google/Apple providers are not configured.

For migration tests, use the guarded `tools/test-backup-sql.sh` harness with a
fresh disposable **loopback** PostgreSQL database named `mythseal_test`, not this
hosted project. Never apply `tests/bootstrap.sql` to a real Supabase database.

Connection evidence and remaining setup are in [CONNECTIONS.md](../docs/CONNECTIONS.md); the intended server-owned schema and restricted database role are in [BACKEND-STACK.md](../docs/BACKEND-STACK.md).
