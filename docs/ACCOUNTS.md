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
| Email provider | Resend verified `auth.mythseal.com` and all five DNS records at **2026-09-21 21:15:31 UTC**. Supabase custom SMTP and both OTP templates passed all 16 non-secret setting readbacks at **21:16:00.449 UTC**. Tracking remains off; the owner's receiving-enabled setting was preserved. |
| Public player login | **Enabled in deployed v0.5.1: `OTP_ENABLED=true`.** Real HTTPS generated-OTP verification, secure session cookies, account/journey read and logout passed at 21:24:50.578 UTC; fixture cleanup verified. |
| Local owner pilot | At **21:18:34.252 UTC**, the owner confirmed receiving a numeric email code and successful login through `http://127.0.0.1:8791/`. Setup/check tools sent no real email; the owner initiated this flow. |
| Website release | v0.5.1 deployed from `ea48558` at 21:24:31.875 UTC. Live 19-asset/13-private-path checks passed; browser assets are unchanged from v0.5.0. Earlier backup/isolation/conflict and 2,000-card evidence remains recorded in [HOSTING.md](HOSTING.md). |

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

**Local source after v0.5.1 (D2, 2026-10-12; not merged or deployed).** The
旅程閣 tools add **匯入旅程備份**, which restores a 匯出旅程備份 file through the
same strict restore as **恢復雲端旅程** (recovery copy first, nothing written on
refusal), and a status line with the date of this device's last export or
successful **備份此裝置**, recorded on this device only. The unfinished-battle
refusal of every restore now reads 請先完成或放棄未完對局，再恢復旅程；本機旅程未有更改。
On a journey this device has just started, the lobby offers 有舊旅程？由備份還原; when
旅程閣 already knows the player is signed in it adds 雲端旅程, which opens this
restore confirmation. Nothing is uploaded or restored without the player's
confirmation, and the lobby sends no account request of its own.
[LOCAL-COMMANDS §11 and §19](LOCAL-COMMANDS.md#19-file-import-and-save-safety-d2-2026-10-12)
own the rules.

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

## Email setup and owner pilot

Supabase custom SMTP is now configured. The earlier default sender rejected the
custom-template update; the successful configuration at **2026-09-21
21:16:00.449 UTC** supersedes that limitation for this project.
[Supabase SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp).

The sender is `Mythseal <login@auth.mythseal.com>`, using `smtp.resend.com`, port
`465` and username `resend`. A dedicated `sending_access` key restricted to the
verified domain supplies the SMTP password. It was captured privately in an
ignored mode-`0600` file and is absent from Git, browser assets and Worker
bindings. The setup passed the expected project/domain identity guards and all
16 non-secret settings matched on readback. Resend verified all five DNS records
at **21:15:31 UTC**. The owner's manual DNS setup also enabled receiving; that
setting was preserved and does not implement an incoming-mail game feature.
No paid plan change was made; the Resend billing tier was not independently
inspected. Receiving mail and a paid Supabase API custom domain are unnecessary
for the code flow.
[Resend Supabase SMTP setup](https://resend.com/docs/send-with-supabase-smtp),
[domain verification](https://resend.com/docs/dashboard/domains/introduction).

The checked-in `supabase/templates/otp.html` is applied to both confirmation and
magic-link email templates. It includes `{{ .Token }}` for the numeric-code UI;
the configured code has six digits, expires after 600 seconds and has a
60-second resend interval. The Worker verifies `{email,token,type:"email"}`
through the SDK. Numeric codes do not require a browser callback or a shared
device with the mail reader.
[Supabase email OTP guide](https://supabase.com/docs/guides/auth/auth-email-passwordless).

The owner initiated and confirmed numeric-code delivery and successful local-pilot
login at **21:18:34.252 UTC**. The pilot used `http://127.0.0.1:8791/`, whose browser
storage is separate from mythseal.com. Setup/check tools sent no real email.
Players can now open **旅程閣** on mythseal.com, enter their email, choose
**取得登入驗證碼**, then enter the code and choose **登入旅程閣**.

v0.5.1 is deployed with public OTP enabled. A synthetic generated-code check through
the real HTTPS API verified sign-in, secure cookies, private account/journey access
and logout, then confirmed fixture cleanup. That check sent no email. A mailbox-delivered
sign-in through the public browser origin and physical cross-device restore remain
separately unverified.
Real-provider adapter tests already cover disposable accounts and storage
isolation, but intercepted browser smoke cannot establish mailbox delivery.
[CONNECTIONS.md](CONNECTIONS.md) records service evidence;
[VALIDATION.md](VALIDATION.md) separates local, hosted SQL and browser checks.
