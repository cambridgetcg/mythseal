# Fresh-clone toolkit check · 2026-09-21

Source baseline: `c52740d015b0e1a8c6948071ca0a761e2cc9e6db` from private
`cambridgetcg/mythseal`. Toolkit work is on `codex/toolkit-readiness`.
The public game remains v0.5.1 from `ea485586d14032bc145a993749a49d5c343ff5f8`;
this setup did not deploy or change hosted application data/settings.

This is a dated record from one machine. "This Mac" below means the Mac used for
the check, not yours. Resolve your own checkout (`git rev-parse --show-toplevel`)
and follow [Start a fresh checkout](HANDOVER.md#start-a-fresh-checkout) for
current setup.

## Development ready on this Mac · 2026-09-22

The checked checkout was a fresh `mythseal` clone, recorded at
`/Users/yuai/Projects/mythseal` on that machine, on
`codex/toolkit-readiness`. The preview responds at
**http://127.0.0.1:8791** with guest play available and email sending disabled.
GitHub access was rechecked as `cambridgetcg` through Sol's per-command identity;
Cloudflare matched the intended account, Supabase matched the selected project,
and the existing Resend `mythseal` Keychain profile passed domain-read access.
No owner sign-in needs repeating for this development loop.

The GitHub default branch remains `c52740d`, with its latest CI run successful.
This branch's changes have local verification only until published and checked
by CI. The roadmap's next gameplay slice is M2's server-issued starter inventory
and one server-settled AI battle, preceded by the M1 online API/schema contract.
Offline progress and cloud backups remain separate from authoritative inventory.

## Daily development

```sh
npm ci
npm test
npm run preview -- --dry-run
npm run deploy -- --dry-run
npm run preview
# In another terminal, with installed Chrome or a Playwright browser:
GAME_URL=http://127.0.0.1:8791 npm run test:browser
```

Open **http://127.0.0.1:8791**. The preview builds the public allowlist and starts
the account Worker locally with OTP off. Rebuild/restart after static asset
changes. Guest play and mocked account flows need no credentials. See
[HANDOVER](HANDOVER.md#local-account-worker-preview) for optional connected
preview bindings; a local Worker does not isolate the hosted database.

The five browser suites now use pinned Playwright **1.63.0** from the lockfile.
It is development-only. Existing Chrome was reused; no browser download was
needed. Journey/classical-card waits now evaluate predicates in the test process
instead of using `new Function` inside the page, so they pass the Worker's real
Content Security Policy. The backpack suite also supports Playwright's browser
fallback when the default macOS Chrome path is absent. All five suites decode
their screenshot output paths with `fileURLToPath`, including paths with spaces.

## Verified access on this Mac

| Service | Current evidence |
| --- | --- |
| GitHub | Saved `cambridgetcg` access verified through `sol access`; private repository cloned. Preserve concurrent sessions by using `sol access run github -- …` on this Mac. |
| Cloudflare | Project-pinned Wrangler confirmed the expected Mythseal account. No deployment performed. |
| Supabase | Pinned CLI matched exact project `puiuevggytoxyyearkcq` among two accessible projects. Non-secret project selection is in ignored mode-0600 `.env.local`; no database password or administration key copied. |
| Resend | Owner completed official browser OAuth for profile `mythseal`; credentials stored in macOS Keychain. Separate read-only domain check passed (one domain). No email sent or SMTP key/domain recreated. |
| Public game | Anonymous `/api/v1/account` returned `emailEnabled: true`; `/release.json` identified the recorded v0.5.1 source. These reads do not prove mailbox delivery or authenticated backup behavior. |

The checked-in `connections:check -- --live` helper checks repository access via
native `gh`, whose shared active identity can vary on this Mac. Use the Sol
identity-bound command for GitHub-sensitive work. Developer logins do not sign a
player into the game.

## Local verification

- **194 Node tests passed:** 177 baseline plus 10 deployment and seven preview
  regression tests. Preview tests cover credential isolation, strict binding-file
  syntax (including dotenv parser differences), and loopback configuration.
  The September 22 review reproduced and fixed assignments hidden after a
  comment by lone CR or Unicode line separators; the regression checks rejection
  before any Wrangler command, asset build or preview server can start.
- **Eight Python tests passed**, including the allowlisted loopback server.
- **All five browser suites passed:** battle/desktop/mobile, journey progression,
  classical cards, backpack/decks, and nine intercepted account UI flows. No page
  errors were reported. These use isolated browser contexts and emulated mobile
  sizes, not physical phones or live player accounts.
- Public build, preview dry run and both deployment bundle dry runs passed using
  **Wrangler 4.136.1**. Deployment stubs prove preflight failure prevents writes
  and the apex command includes `--keep-vars`; actual hosted binding retention
  must still be checked after the next authorized release.
- Backup SQL passed in a fresh disposable loopback **PostgreSQL 16.14** cluster:
  private grants, account isolation, size limits, revision conflicts, tombstones,
  and concurrent first-write/update races. The cluster was stopped afterward.
  No hosted migrations were applied. CI uses PostgreSQL 17.
- The ERC-721 toolkit fixture passed with installed **Foundry 1.5.1** and pinned
  **Solidity 0.8.30**. CI's Foundry 1.7.1 remains a different toolchain version;
  no shared Foundry upgrade or blockchain transaction was performed.
- JavaScript syntax and Git whitespace checks passed. Node **24.18.1**, npm
  **11.16.0** and Python **3.14.7** were used; CI remains on Node 22.

The existing latest GitHub CI was green at the source baseline. Changes in this
toolkit branch have only local evidence until pushed and checked by CI. Browser
screenshots stay under ignored `test-results/`.

## Next bounded work

The [roadmap](../ROADMAP.md) is the planning source; the GitHub inspection found
no issues, PRs or milestones. Project-board access was unavailable under the
existing token scope and was not expanded.

M1 now has a tracked preview, pinned browser tool and guarded deployment helper.
Its remaining work includes public-browser/two-device account evidence,
account recovery/deletion/retention policy, and the online command contract.
Next design one server-issued starter inventory and one authoritative AI battle
with exact-card XP settled once (M2). Preserve offline journeys separately.

Pinata credentials are absent from this fresh clone; artwork pinning is not
required for the current game. Native platform packages/signing and the pinned
Foundry 1.7.1 parity check remain later setup work. Browser development uses the
installed Chrome and existing toolchains. No mobile, wallet, collectible issuance
or paid infrastructure setup was included here.
