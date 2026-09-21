# Account and private journey API

`account-api.mjs` is the Cloudflare Worker entry point. It delegates non-API
requests to `ASSETS`. The browser uses same-origin JSON requests and contains no
Supabase SDK or session tokens. This API backs up editable offline journeys; it
does not authorize cards, experience, currencies, trading, rewards or NFTs.

Required environment:

- `APP_ORIGIN`: exact origin, normally `https://mythseal.com`.
- `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`: the intended development project.
  The Worker uses ordinary player sessions and needs no service-role credential.
- `OTP_ENABLED`: explicitly `true` only after email delivery is configured.
- `AUTH_RATE_LIMIT`: Cloudflare binding applied to OTP requests and verification
  together by trusted Cloudflare client IP. Missing protection fails closed.
- `BACKUP_RATE_LIMIT`: Cloudflare binding applied to cloud writes/deletes by
  verified account ID. Missing protection fails closed.
- `ASSETS`: the existing allowlisted static asset binding.

Local development may set `ALLOW_INSECURE_LOCAL_AUTH=true` with an HTTP loopback
`APP_ORIGIN`. It uses separate `mythseal-local-*` cookies. It cannot weaken cookie
security for a non-loopback origin. Production cookies use `__Host-`, `Secure`,
`HttpOnly`, `SameSite=Lax` and no Domain attribute. Authenticated responses are
never cacheable. Every mutation requires the exact Origin and JSON content type.

The SDK restores/refreshes access and refresh tokens per request, then verifies
the account with `getUser()`. An upstream outage preserves session cookies;
explicit invalid-session errors clear them. Logout always clears this browser
after its CSRF checks, and reports incomplete remote revocation when unavailable.
Auth events capture any token rotation during verification or RPC calls; unchanged
tokens are not reissued. Browser requests serialize with a shared Web Lock when
supported, and journey requests carry `X-Mythseal-Account` as a stale-tab guard.
The Worker compares that ID with the verified identity before accessing storage;
it never uses the header to select an owner. JWT revocation is subject to Supabase's session/token behavior; this layer does
not claim instantaneous invalidation of independently copied access tokens.

| Route | Request | Success response |
| --- | --- | --- |
| `GET /api/v1/account` | — | `{authenticated,user,emailEnabled}` |
| `POST /api/v1/auth/otp` | `{email}` | `{sent:true}` |
| `POST /api/v1/auth/verify` | `{email,token}`; six-digit code | `{authenticated:true,user,emailEnabled}` |
| `POST /api/v1/auth/logout` | `{}` | `{authenticated:false}` |
| `GET /api/v1/journey` | — | `{backup,revision}` |
| `PUT /api/v1/journey` | `{expectedRevision,snapshot}` | `{backup,revision}` |
| `DELETE /api/v1/journey` | `{expectedRevision}` | `{backup:null,revision}` |

`backup` is null or `{revision,updatedAt,snapshot}`. New accounts start at revision
zero. Deletion clears the snapshot but preserves a monotonically increasing
tombstone revision, preventing a stale device from recreating or replacing a
newer journey. Revision conflicts return 409. All errors use
`{error:{code,message}}`; raw provider errors are never returned.

`private_backup.journeys` is inaccessible to browser roles. Only three public
RPCs are executable by `authenticated`: `mythseal_backup_read()`,
`mythseal_backup_write(p_expected_revision,p_snapshot)` and
`mythseal_backup_delete(p_expected_revision)`. They derive ownership from
`auth.uid()`, never a caller-supplied account ID. A transaction advisory lock
serializes each user's first insert and later changes before comparing revisions.
The database applies a 512 KiB bound to its JSONB text representation and checks
the offline envelope, profile version and absence of an unfinished battle. The
Worker also validates the complete canonical snapshot before accepting/returning
it. Stored content remains untrusted even when structurally valid.

Run API tests with `node --test tests/account-api.test.mjs`. For an **empty,
disposable local PostgreSQL database named `mythseal_test`**, set
`TEST_DATABASE_URL` locally and run `bash tools/test-backup-sql.sh`. The harness
rejects remote hosts, other database names and connection query options, and
refuses to bootstrap an existing Auth schema. It applies the migration, executes
the rollback isolation/CAS suite and races independent connections on first
insert and update. The minimal Auth bootstrap is test-only, never a Supabase
migration. On hosted development Supabase, only the real migration and optional
rollback SQL suite apply; the test bootstrap must never run there.
