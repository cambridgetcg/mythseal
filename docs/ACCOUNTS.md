# 旅程閣 · Accounts and private offline backups

v0.5.0 adds a place to sign in, compare journeys and deliberately back up or
restore local progress. Each account holds one current cloud backup. It preserves
the existing game save format and keeps gameplay available without an account.

## Current readiness

| Layer | Verified state |
| --- | --- |
| Browser UI and Worker adapter | Implemented; local unit/API tests and nine intercepted browser flow groups passed. |
| Development database | Migrations `20260921210000` and `20260921210100` applied to Free London `mythseal-dev`; hosted rollback isolation/CAS checks passed with zero fixture users left. |
| Real-provider adapter | Local handler ↔ hosted Supabase Auth/RPC verified disposable-account sessions, save/read, conflicts, isolation, deletion/recreation and a 2,000-card boundary fixture; cleanup confirmed. No email was sent. |
| Hosted Auth settings | Site/redirect origin `https://mythseal.com`, confirmed email required, six-digit code, 600-second expiry and 60-second resend interval applied and read back. |
| Email provider | Free Resend account setup opened; owner connection and domain verification are not confirmed. Supabase custom SMTP remains disabled. |
| Public player login | **Disabled: `OTP_ENABLED=false`.** The UI reports that login is not open yet. Mailbox delivery and a public browser sign-in remain unverified. |
| Website release | v0.5.0 deployed from `339e4f5`; real authenticated HTTPS backup/isolation/conflict/logout and 2,000-card checks passed at 20:32:27 UTC using disposable injected sessions, with cleanup verified. No mail was sent. See [HOSTING.md](HOSTING.md). |

The release describes the archive UI as present and email login/private backup as
features controlled by runtime readiness. Developer CLI login is a separate
authorization and never signs the owner into a player account.

## Using the archive

1. Open **旅程閣** from the header. The left panel shows this browser's journey.
   Once email delivery is enabled, request a code and enter its six digits.
   Signing in reads account/cloud status without uploading, merging or replacing
   either journey.
2. Choose **備份此裝置** to save the current local journey. A later upload replaces
   that account's previous cloud snapshot only if its revision is still current.
3. Choose **恢復雲端旅程**, compare the displayed journeys and confirm. The game
   rechecks both the cloud revision and the current local save before replacing
   anything. It first saves the displaced local journey as a recovery copy.
4. The recovery panel can download that copy or restore it after another
   confirmation. Restoring the recovery copy retains the displaced journey as
   the next recovery copy. Only one recovery slot is maintained per browser.
5. **刪除雲端備份** requires confirmation and leaves the current browser's progress
   untouched. Signing out also preserves local progress and any saved battle.

Finish or abandon an unfinished battle before uploading or restoring a journey.
Cloud conflicts disable changes until the player explicitly rereads and reviews
the updated cloud record. There is no automatic retry that overwrites another
device's progress and no automatic merge. Restoration requires browser Web Locks
to serialize the local replacement with other tabs' profile changes.

Clearing site data removes local progress and recovery copies. Origins are
separate: `mythseal.com`, localhost and different local ports do not share saves.
The footer's **匯出旅程備份** remains available for independent local exports.

## What a backup contains

The versioned envelope is
`{format:"mythseal.offline-journey",version:1,profile:<canonical v3 profile>}`.
It retains each local card's ID, XP, level, acquisition record, battle history and
lock; the exact copies selected in all three saved decks; merchant-held copies;
and normal journey resources, daily records and progression. Daily rollover is
still applied normally when an older save is restored.

The shared validator rejects unfinished battles, duplicate card IDs, unknown or
repair-requiring data, unsupported versions, excessive nesting, invalid Unicode
and snapshots exceeding the **512 KiB PostgreSQL JSONB text budget**. At most
**2,000 owned plus merchant-held copies** fit the current card-count policy. The
byte limit may apply first. Rejection leaves the local journey intact.

These are backups of **editable offline data**. Their IDs are not globally issued
online assets. A saved card, XP total or currency balance does not establish
server-verified ownership, trade entitlement or a mint claim. The authoritative
economy and NFT work described in [BACKEND-STACK.md](BACKEND-STACK.md) remain a
separate phase.

## Session and storage boundary

The browser remains dependency-free and calls the same-origin Worker API. Only
the server bundle imports the maintained Supabase SDK. Production access and
refresh tokens use host-only `__Host-` cookies with `Secure`, `HttpOnly` and
`SameSite=Lax`; the UI receives only the account ID/email and feature readiness.
It does not store tokens in local storage or return them in JSON.

Each request restores the session through the SDK and verifies the user with
`getUser()`. Ordinary authenticated reads do not rewrite unchanged cookies.
An upstream outage is reported separately from an invalid session. Logout clears
this browser's cookies and reports when remote session revocation could not be
confirmed. This does not promise instantaneous revocation of independently
copied access tokens.

Mutations require an exact allowed Origin and JSON content type, with bounded
request bodies. Account/auth responses are not cacheable. Cloudflare bindings
limit OTP request/verification attempts by client IP and backup writes by account;
missing required protection fails closed. The Worker uses a publishable project
key and the player's session, without a service-role or database-superuser key.

`private_backup.journeys` has RLS enabled and grants no direct schema/table access
to client roles. Three authenticated-only RPCs perform reads, writes and deletion
using `auth.uid()` rather than a caller-supplied user ID. The elevated functions
have fixed search paths and explicit actor checks. A per-account transaction
lock serializes even first creation before checking the expected revision.

A stale expected revision raises `PT409`, returning an HTTP conflict immediately
instead of using a retryable database serialization error. The player must review
the newer cloud state before another write.

Deletion retains a row with a null snapshot and an increasing revision. This
tombstone prevents an older device from recreating a deleted backup with revision
zero. Deleting the Auth user cascades to its stored journey; a self-service
account-deletion screen is not implemented in this slice.

The 19-file public allowlist includes only browser assets. Server source, SQL,
tests, credentials and private documentation stay outside the public artifact.
See the [server contract](../server/README.md) for endpoint and environment details.

## Complete the free email connection

Supabase's default sender is restricted to organization-team addresses and
currently has a two-message-per-hour limit. It is unsuitable for public player
login. The hosted project also rejected custom template configuration while that
default sender remains active. Connect a custom SMTP sender before enabling the
public code flow. [Supabase SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp).

The intended sender is `Mythseal <login@auth.mythseal.com>` through Resend Free.
Finish the owner's official Resend account connection, verify the `auth.mythseal.com`
sending domain using the provider's exact DNS records, and configure Supabase
with `smtp.resend.com`, port `465`, username `resend` and the private API key as
SMTP password. Keep the key out of Git, browser assets and chat. Receiving mail
and a paid Supabase API custom domain are not required for this code flow.
[Resend Supabase SMTP setup](https://resend.com/docs/send-with-supabase-smtp),
[domain verification](https://resend.com/docs/dashboard/domains/introduction).

Apply the checked-in `supabase/templates/otp.html` to both relevant email templates
after SMTP is connected. Supabase's `signInWithOtp` sends a magic link by default;
the template must include `{{ .Token }}` for the numeric-code UI. The Worker then
verifies `{email,token,type:"email"}` through the SDK. Numeric codes do not require
a browser callback or a shared device with the mail reader.
[Supabase email OTP guide](https://supabase.com/docs/guides/auth/auth-email-passwordless).

Verify sender readiness and an owner-initiated mailbox sign-in before opening
public login. Verify the deployed Worker/browser session and cross-device restore
as a separate release step. Real-provider adapter tests already cover disposable
accounts and storage isolation, but the browser smoke intercepts API calls and
cannot substitute for mailbox or deployed-browser checks. [CONNECTIONS.md](CONNECTIONS.md) records
service evidence; [VALIDATION.md](VALIDATION.md) separates local, hosted SQL and
browser checks.
