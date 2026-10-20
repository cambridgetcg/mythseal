# iOS first flight · branch `ios/first-flight`

Status: `record · 2026-10-20`, local branch only. Nothing on it is pushed, merged,
deployed, signed, uploaded or registered with Apple or Google.

This branch brings open PR #13 (`mobile/cloud-pipeline`) up to `main` with a
merge commit and fixes what stood between it and a first TestFlight build under
the owner's 2026-10-20 decisions: **Mindicraft Limited** (company 13782045, an
organization team; Team ID not yet known) publishes on the App Store, and
release builds run in the cloud (**Xcode Cloud** first, the GitHub Actions
workflow as backup), with a local Xcode used only for the simulator. The
pipeline's shared templates and checks live in orchard, a separate public
repository (local at `~/orchard`, to become `cambridgetcg/orchard`); this
repository keeps its own app, its own `ios/` project and its own decisions.

## The ladder

Every row names the highest rung its change has actually reached. A lower rung
never stands in for a higher one.

| Rung | What it proves |
| --- | --- |
| `web` | the web build runs and the bundle is self-contained (Node tests, build, headless browser smokes) |
| `native-project` | the iOS project conforms: plist keys, deployment target, device family, privacy manifest, `ci_scripts` |
| `simulator` | the app launches in an iOS Simulator (needs Xcode; not on this branch's machine) |
| `device` | it runs on a physical iPhone |
| `signed-archive` | Apple's signing accepted a build (Xcode Cloud or the Actions backup) |
| `testflight-internal` | App Store Connect processed the build for internal testers |
| `review` | Beta App Review or App Review accepted it |

**This branch reaches `web` and `native-project` only.** No WKWebView, Simulator
or device has run any of it; the headless WebKit smoke is closer to Safari than
Chromium is, but it is not a WKWebView inside Capacitor.

## Changes, in commit order

| Step | Change | Why | Rung |
| --- | --- | --- | --- |
| 1 | Merge PR #13 with a two-parent merge commit; conflicts in `platform.mjs` (D2's file plus `isNativeShell`), `hosting/public-assets.json` (main's list plus PR #13's additions) and `docs/README.md` (both rows) | PR #13 predates D2 and D3; the release fence `7a7d03e` must stay an ancestor, which a squash or rebase would break | `web` (`npm test` 632/632) |
| 2 | Mindicraft Limited replaces Cambridge TCG Limited as publisher in `privacy.html`, the design spec, the runbook and the plan; the Play entity is "to be confirmed"; the keystore `-dname` leaves its entity open; `privacy.html` leaves the web allowlist and the rules dialog links a privacy page only once `PRIVACY_URL` names the deployed one | The owner's 2026-10-20 decision. The page has placeholders for facts nobody has recorded (registered office, ICO registration, contact email, effective date), so the next web deploy must not publish it; its old "stored only on your device" was wrong because device and iCloud backups include app data | `web` |
| 3 | The native guard moves to the choke points: in a native shell `app.mjs` creates `account-offline.mjs`'s inert controller (same methods, no request, no storage), `navigate()` refuses 旅程閣 whoever calls it, no session broadcast channel opens, and the lobby strips get `cloud: false` (no 雲端旅程, no 旅程閣, no cloud wording) | D2's `restore-offer-cloud` and `backup-prompt-cloud` called `account.init()` and `navigate('account')` directly, past PR #13's per-call-site checks. Node tests drive every controller method under fetch and storage spies (and show the real client does call `/api/v1/account` from the same path); `tools/native-smoke.mjs` clicks both D2 actions in a bridged page and fails if 旅程閣 opens (checked: it fails with the choke points removed and PR #13's checks left in) | `web` |

## Open for the owner

- **Privacy page.** Approve the wording of `privacy.html`, fill each
  `待確認 / TO CONFIRM` (Mindicraft's registered office, its ICO registration,
  which the TaxSorted runbook lists as still to do, a privacy contact email and
  the effective date), then add `privacy.html` back to
  `hosting/public-assets.json`, deploy through [HOSTING](HOSTING.md), and set
  `PRIVACY_URL` in `app.mjs` to `https://mythseal.com/privacy.html`.
  `tests/privacy-page.test.mjs` refuses a served page that still has a
  placeholder, and a link to a page that is not served. The page names
  Mindicraft as controller for the website accounts too; confirm that is right.
- **Google Play entity.** Who holds the Play Console account is not recorded.
