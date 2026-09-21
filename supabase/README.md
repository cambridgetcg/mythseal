# Supabase developer setup

The project-local CLI is pinned in the root npm lockfile. `config.toml` was generated with CLI 2.117.0, then given local project ID `mythseal`, the existing development origin `http://127.0.0.1:4177`, disabled seed loading and explicit grants for new public tables.

This is **local configuration**, not a hosted project, linked database, migration or working game login. No database schema or privileged application role exists yet. A hosted project reference must be selected after owner authentication; the local project ID is not a cloud project reference.

```sh
npm ci
npm run connect
npm run connections:check -- --live
```

Choose Supabase in the owner-operated connection helper to start its official login. The CLI uses native credential storage where available; the assistant connector has a separate authorization flow. Do not put management tokens into the browser game.

The helper explicitly runs `npx --no-install supabase --agent no --output-format text login --name mythseal-dev`. A Terminal opened from Codex can inherit agent markers, which otherwise make Supabase CLI 2.117.0 choose JSON output and reject interactive login with `NonInteractiveError`. These flags apply only to the owner login command. Follow the Terminal prompts; if the browser does not open, use the printed official login link. After updating the helper, exit any already-running copy with `0` and reopen `Connect.command`.

Local `npx --no-install supabase start` requires a working Docker-compatible runtime; that prerequisite is not installed by this scaffold. Do not assume the local database has been started or verified. A future hosted development project can be used independently of local containers. Cloud Auth redirect URLs, email delivery and providers must be configured against the actual future login flow; they have not been pushed from this local file.

Connection evidence and remaining setup are in [CONNECTIONS.md](../docs/CONNECTIONS.md); the intended server-owned schema and restricted database role are in [BACKEND-STACK.md](../docs/BACKEND-STACK.md).
