# Mobile cloud pipeline · design · 2026-10-12

Status: **approved by the owner 2026-10-12**, then amended the same day with
the review stage, the offline guest build and the field notes.
Nothing in this document has been built, signed, uploaded or registered.

## 1. Purpose

The owner asked for an iOS and Android publishing pipeline that builds in the
cloud, for Mythseal first, TaxSorted next and possibly other Cloudflare-hosted
sites later. In the owner's words, the focus is **"testing the deployment
pipeline and standardising the publishing and review flow, gather data on what
to pay attention to in the future."** Mythseal is the target because a game
avoids the extra rules that utility and finance apps face. Public store release
can wait.

What the owner said (2026-10-12):

- Build in the cloud, not on this Mac.
- Mythseal and TaxSorted, and possibly other Cloudflare sites.
- Practise and standardise the route; public launch can wait.
- Both developer accounts (Apple Developer Program and Google Play Console) are
  registered to **Cambridge TCG Limited** and are already granted.
- Route A was chosen: GitHub Actions + fastlane.
- Add a second stage that goes through real store review, still not public.
- The store builds are an **offline guest build**, with no accounts.
- Nuance continues on game assets and experience; this work stays on the
  publishing seam.

Assumptions written into this design (the owner can correct any of them):

- TaxSorted and other sites get their own specs later and reuse this pipeline
  and its runbook.
- Signing material lives with Apple, Google and GitHub, never as files on this Mac.

A caveat recorded for honesty: games skip the regulated-entity and financial
rules, but some rules apply to every app. Mythseal already met two before any
build: it has no privacy policy, and its web accounts have no in-app account
deletion. The offline guest build avoids the second; the first is fixed in §4.8.

**Success means:**

1. **Stage 1:** the owner presses Run in GitHub, both platforms build in the
   cloud, and the owner installs Mythseal on an iPhone through TestFlight and on
   an Android phone through Play internal testing, and it opens offline.
2. **Stage 2:** the same build passes through Apple's Beta App Review (TestFlight
   external testing) and Google's review (Play closed testing). The outcome of
   each review is recorded, whether approved or rejected.
3. **Throughout:** the runbook and field notes in §4.7 exist and are good enough
   to start TaxSorted's publishing from them.

## 2. Authorization record

`docs/HANDOVER.md` says native/store release is not authorized by the handover
and must be resolved "when a concrete future task needs them". This is that
task. The owner authorized on 2026-10-12:

- native project generation;
- a cloud build workflow;
- signing set up through Apple, Google and GitHub;
- uploads to **TestFlight (internal, then external testing with a small invited
  group) and Play internal, then closed testing**;
- the store metadata those reviews require (privacy policy, age rating, data
  declarations, a Play store listing), submitted for review but not published
  to the public.

Play open testing, production tracks on either store, public listings and paid
upgrades remain unauthorized.

## 3. Scope

In scope:

- Generate and commit Capacitor `ios/` and `android/` projects from the
  existing `capacitor.config.json` (`com.mythseal.game`, `Mythseal`, `webDir: dist`).
- `fastlane/` lanes for both platforms.
- `.github/workflows/mobile.yml`, which runs only on manual dispatch or a
  `mobile-v*` tag.
- GitHub environment `mobile-stores` holding the signing secrets.
- A native build target that leaves out the account and cloud-backup feature (§4.8).
- A privacy page on mythseal.com, also bundled in the app (§4.8).
- The runbook and field notes (§4.7).
- The review metadata Stage 2 needs (§6.3).
- Documentation updates to `docs/CONNECTIONS.md` and `docs/MOBILE-RELEASE.md`
  recording what was actually connected and verified.

Out of scope (each needs its own task):

- M5.1 physical-phone validation and M5.2 native behaviour: durable storage,
  save migration, `@capacitor/app` Back wiring (see the Back-button section of
  `docs/MOBILE-RELEASE.md`), audio and lifecycle recovery, haptics.
- Accounts in the native app: cross-origin API access, cookies and in-app
  account deletion.
- Polished store art. Stage 2 uses honest working screenshots; Nuance's asset
  work can replace them later.
- Any public release.
- TaxSorted and other sites (see §10).
- Push notifications, in-app purchases and any payments.

## 4. Architecture

### 4.1 Where it lives

Inside `cambridgetcg/mythseal`. The lanes and workflow take the app's identity
from `capacitor.config.json`, `package.json` and environment variables rather
than hard-coding Mythseal, so a second app can lift them into a shared copy.
No shared repository is built before a second app needs it.

### 4.2 Native projects

`npx cap add ios` and `npx cap add android` run once, and their output is
committed, which is the normal Capacitor practice. Web content is never
committed into them. Every build runs the native build target (§4.8), which
produces the allowlisted `dist/`, and then `npx cap sync` to copy it in.
Generated web-copy paths stay in `.gitignore`.

### 4.3 Workflow `mobile.yml`

Triggers:

- `workflow_dispatch` with a boolean input `upload` that defaults to `false` (dry mode).
- A push of a `mobile-v*` tag, which uploads.

Two independent jobs run in parallel. Neither depends on the other.

| Job | Runner | Steps |
| --- | --- | --- |
| `ios` | GitHub macOS (image pinned to one whose Xcode meets Apple's current upload SDK minimum) | checkout → Node 22 → `npm ci` → `npm test` → native `npm run build` → `npx cap sync ios` → `fastlane ios beta` |
| `android` | `ubuntu-latest` + JDK 21 | checkout → Node 22 → `npm ci` → `npm test` → native `npm run build` → `npx cap sync android` → `fastlane android internal` |

The repository pins actions by commit SHA, and this workflow does too.
`permissions: contents: read`. Concurrency uses the group `mobile-${{ github.ref }}`
with `cancel-in-progress: false`, so an upload is never cancelled mid-flight.
Timeouts are 45 minutes for iOS and 30 minutes for Android.

### 4.4 fastlane

There is one root `fastlane/Fastfile` with `platform :ios` and
`platform :android` blocks, a pinned `Gemfile` and a `Gemfile.lock`. This is
build tooling, kept apart from the dependency-free browser runtime.

- `ios beta`:
  1. Write the App Store Connect API key from secrets to a runner temp file.
  2. Set the build number.
  3. Archive with automatic signing (`-allowProvisioningUpdates` plus the
     API-key authentication flags), so Apple creates and holds the distribution
     certificate (cloud-managed).
  4. Export for App Store Connect.
  5. In upload mode, run `upload_to_testflight` for internal testers only.
     Stage 2's external group and review submission are done by hand in the
     console (§6.3), so each step of the review flow is seen and recorded.
  6. In dry mode, keep the `.ipa` as a workflow artifact for 3 days.
- `android internal`:
  1. Decode the upload keystore to runner temp.
  2. Set `versionCode` and `versionName`.
  3. Run `bundleRelease`, which Gradle signs from environment variables.
  4. In upload mode, run `upload_to_play_store` to track `internal`.
     Promotion to closed testing is done by hand in the console (§6.3).
  5. In dry mode, keep the `.aab` artifact for 3 days.
  6. Delete the decoded keystore in an `always()` step.

### 4.5 Versions

- Marketing version: `package.json` `version` (now `0.5.1`), used for both
  `CFBundleShortVersionString` and `versionName`.
- Build number: the workflow's `github.run_number`, used for both
  `CFBundleVersion` and `versionCode`. The iPhone and Android copies of one run
  therefore share a number.
- Recovery: if a renamed or recreated workflow ever restarts numbering, a repo
  variable `MOBILE_BUILD_OFFSET` (default `0`) is added to the run number.

### 4.6 Same game on both platforms

Each job writes the `dist` release manifest's `assetsManifestSHA256`, the
client version, the commit and the build number into the job summary. That
makes the "same client digest on both platforms" rule in
`docs/CONTENT-RELEASE-PIPELINE.md` §8 checkable by eye.

The summary also records each step's duration (install, test, build, sign,
upload). This is the raw timing data for the field notes.

### 4.7 Runbook and field notes

These two documents are the main deliverable alongside the pipeline.

- `docs/MOBILE-PUBLISHING-RUNBOOK.md` is **the standard flow**, written so the
  next app can follow it without this conversation. It covers:
  1. One-time account and console setup, per store.
  2. Per-release steps: Stage 1 internal, then Stage 2 reviewed testing.
  3. A pre-review checklist: privacy policy, age rating, data declarations,
     account rules, network use, screenshots, test notes for reviewers.
  4. What to do when a review rejects.
  5. Costs and timings to expect, taken from the field notes.

  It is written app-agnostically, with Mythseal values given as the worked
  example.
- `docs/MOBILE-FIELD-NOTES.md` is the **dated evidence ledger**. Every run,
  console step and review gets an entry with:
  - the date, build number and stage;
  - what was done and by whom (owner's hands or automated);
  - the time taken, including Apple processing and each review's wait;
  - what the store asked for;
  - every warning, rejection or surprise, with its fix;
  - macOS and Linux minutes used.

  Each entry ends with a one-line **"pay attention to"** lesson. Those lessons
  roll up into the runbook's checklist.

Both documents live in the Mythseal repository for now. When TaxSorted's spec
starts, the runbook is copied or extracted to a shared home as that spec decides.

### 4.8 Offline guest build and privacy page

- **Native build target.** `tools/build.mjs` gains a native target (for example
  `npm run build -- --target native`) that produces the same allowlisted `dist/`,
  except:
  - the account and cloud-backup entry points are not shown, and their modules
    are not shipped;
  - the release manifest's `enabledFeatures` says so.

  The web build stays byte-for-byte unchanged, and the mobile workflow uses the
  native target. Reasons:
  - inside a Capacitor WebView, the account client's same-origin `/api/...`
    calls would hit the app bundle and fail, and a visibly broken login is an
    App Review rejection;
  - leaving accounts out also leaves out Apple's in-app account-deletion rule.

  A static test guards both builds. The change to `app.mjs` is kept minimal and
  announced in the PR, because Nuance is active in the game code.
- **No network use.** The native bundle must make no network requests, so that
  the privacy answers ("no data collected") are true. This is checked, not
  assumed (§9).
- **Privacy page.** `privacy.html` is added to the allowlist, served at
  `mythseal.com/privacy` and bundled in the app. It honestly covers both:
  - the store apps: no data collected, and saves stay on the device;
  - the website's optional email-code accounts and cloud backups: what is
    stored, which processors are involved, and how to delete it.

  **The owner approves the wording before deploy,** because it is published in
  Cambridge TCG Limited's name. It is deployed through the existing
  `docs/HOSTING.md` release procedure.

## 5. Secrets and signing

All secrets live in the GitHub environment `mobile-stores`, whose deployment
branch rule allows `main` and `mobile-v*` tags. No required reviewer is set: the
owner's standing agreement is that approval happens in conversation.

| Secret / variable | What it is | Notes |
| --- | --- | --- |
| `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8_B64` | App Store Connect team API key | Use the lowest role that can use cloud-managed distribution signing. Prefer App Manager; use Admin only if App Manager keys can't, and record which in `docs/CONNECTIONS.md`. |
| `APPLE_TEAM_ID` (variable) | Cambridge TCG Limited team ID | Not secret. |
| `PLAY_SERVICE_ACCOUNT_JSON` | Google Cloud service-account key | Invited in Play Console with app-level "release to testing tracks" permission only. |
| `ANDROID_UPLOAD_KEYSTORE_B64`, `ANDROID_UPLOAD_KEYSTORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS`, `ANDROID_UPLOAD_KEY_PASSWORD` | Upload keystore | Generated on this Mac with the Homebrew JDK 21 `keytool`. A copy is kept as a macOS keychain item `mythseal-android-upload-keystore`, and the local file is deleted after `gh secret set`. |

**Accepted deviation, recorded deliberately.** `docs/CONTENT-RELEASE-PIPELINE.md`
§8 says not to hand the raw keystore to ordinary CI. This design does, for these
reasons:

- Play App Signing holds the real distribution key.
- If the upload key ever leaks or is lost, the owner can ask Google to reset it.
- The secret is scoped to one environment that runs only from `main` and tags.

The iOS side follows that section exactly: no `.p12` exists, and the App Store
Connect key is a secret, never an artifact.

No credential is printed, committed or put in an artifact. Artifacts hold only
the signed `.ipa` and `.aab`, which contain no private keys.

## 6. Owner's one-time steps

The owner does these by hand. Ai can drive Chrome alongside, except for 2FA
and the one-time key downloads.

### 6.1 App Store Connect (Stage 1)

`appstoreconnect.apple.com` resolves on this Mac. `developer.apple.com` does
not, and isn't needed.

1. Users and Access → Integrations → Team Keys → generate a key (role per §5).
   Download the `.p8` once.
2. Register the bundle ID `com.mythseal.game`. Ai can do this through the App
   Store Connect API with that key, avoiding the developer portal.
3. Apps → New App: iOS, name "Mythseal" (or a fallback such as "萬象契 Mythseal"
   if the name is taken), bundle ID `com.mythseal.game`, SKU `mythseal-ios`.
   The API cannot create app records.
4. TestFlight → internal testing group → add the owner's Apple ID.

### 6.2 Google Play Console (Stage 1)

1. Create the app "Mythseal" (game, free). Play App Signing is on by default
   for new apps.
2. In Google Cloud, create a service account and a JSON key. Invite its email
   in Play Console with "release to testing tracks" for this app.
3. Internal testing → testers list → add the owner's Google account.
4. Upload the first `.aab` by hand from a dry-run artifact, and roll out that
   first internal release in the console (see §9, draft-app rule).

The account is an organization account, so the personal-account "12 testers
for 14 days" production rule does not apply. It is irrelevant to testing
tracks anyway.

### 6.3 Stage 2: reviewed testing (after Stage 1 works)

Ai prepares every answer and draft, and the owner submits in the consoles.
Each answer and its reasoning is recorded in the field notes.

Apple (TestFlight external testing → Beta App Review):

1. Fill in Test Information: beta description, feedback email, contact
   details, privacy policy URL, and notes for the reviewer (the game is offline
   and needs no sign-in).
2. Complete the App Privacy section ("Data Not Collected", if §4.8's
   network check confirms it) and the age rating questionnaire.
3. Create an external group with a few invited testers, add the build, and
   submit it for Beta App Review.

Google (Play closed testing → review):

1. Complete the App content declarations: privacy policy, ads (none), app
   access (no sign-in), content rating (IARC questionnaire), target audience,
   data safety ("no data collected"), and the remaining yes/no declarations.
2. Write the store listing: short and full descriptions, a 512 px icon, a
   1024×500 feature graphic and at least two phone screenshots. These are
   working assets taken from the build.
3. Create a closed testing track with an invited tester list, promote the
   build, and send it for review.

🟡 **Target audience is the owner's call**, and `docs/MOBILE-RELEASE.md` lists
it as open. Choosing an audience that includes children under 13 brings in
Google's Families policy and Apple's Kids rules, which this practice round
should avoid unless the owner wants that data too. The recommendation is
**13 and over**, recorded as a practice-round choice, not a launch decision.

## 7. Failure handling

- iOS and Android fail independently. One failing never blocks the other.
- A preflight step in each job checks that every secret it needs is set, and
  fails naming the missing one, before any build minute is spent.
- **Uploads are never retried automatically.** After an ambiguous upload
  failure, check TestFlight or Play Console first. A re-run reuses the run
  number, so the store rejects a duplicate build number instead of accepting a
  double upload.
- Decoded key files live only in runner temp and are removed in `always()` steps.
- Dry mode is the default for manual runs, so an accidental Run uploads nothing.
- **A review rejection is data, not an emergency.** Copy the store's exact
  wording into the field notes, fix the cause in a new build or in the metadata,
  and resubmit by hand. Nothing resubmits automatically.

## 8. Testing and done criteria

1. `npm test` passes inside both jobs before any native build.
2. Dry run: both jobs green, with a signed `.ipa` and `.aab` as artifacts and
   the job summaries showing the same digest and build number.
3. Upload run: the build appears in TestFlight (after Apple's processing) and
   in Play internal testing.
4. **Stage 1 done:** the owner installs from TestFlight on an iPhone and from
   the Play internal-testing link on an Android phone, and Mythseal opens to the
   lobby in airplane mode.
5. A static test confirms that the native build ships no account modules and
   the web build is unchanged. A network check (§9) confirms that the native
   bundle makes no requests.
6. **Stage 2 done:** both reviews have returned an outcome. Each outcome is
   recorded with its timeline and any fix. If approved, an invited tester
   installs from the external TestFlight group and from the closed-testing link.
7. **Throughout:** every run, console step and review has a field-notes entry,
   and the runbook's checklist reflects them.
8. `docs/CONNECTIONS.md` records each connection with its date and evidence.
   `docs/MOBILE-RELEASE.md` says native projects and a cloud pipeline now exist,
   while M5.1 and M5.2 acceptance is still outstanding.

Gameplay correctness on phones is M5.1 and M5.2 evidence, not this pipeline's.

## 9. To verify while planning (not assumed)

- Whether Capacitor 8.5.2 generates the iOS project with Swift Package Manager
  by default (no CocoaPods), and that `cap add ios` runs without full Xcode on
  this Mac. If not, generate it on the macOS runner and commit the output from
  there.
- Which macOS runner image and Xcode version meet Apple's current minimum SDK
  for App Store Connect uploads, and Play's current `targetSdkVersion` rule
  against Capacitor 8's template.
- Whether an App Manager API key can use cloud-managed distribution
  certificates (§5).
- The **draft-app rule**: until a Play app's first release is rolled out in the
  console, the Publishing API accepts only `draft` releases. The lane uses
  `release_status: draft` until that first manual rollout, then `completed`.
- The GitHub plan's macOS minute allowance for this private repository. Each
  macOS minute counts 10× on private repos.
- Apple App Review Guidelines wording: 4.2 (minimum functionality),
  5.1.1(v) (account deletion) and 5.1.1(ix) (regulated fields). These were
  quoted from memory in conversation because `developer.apple.com` didn't
  resolve.
- Whether the native bundle makes any network request: fonts, analytics,
  remote images or the account client's startup probe. Check in a WebView or
  headless browser with the network blocked and logged.
- The current required fields for TestFlight external Test Information, Apple's
  current age-rating questionnaire, and Play's current App content list and
  closed-testing requirements for a new app.

## 10. Notes for the next apps (not designed here)

- **TaxSorted** (`cambridgetcg/taxsorted.io`, Next.js 16 static export on
  Cloudflare Pages plus a Fly API):
  - Apple expects apps in regulated fields such as financial services to be
    submitted by the legal entity providing the service. TaxSorted's chosen
    entity is Mindicraft Limited (decided 2026-07-07), not Cambridge TCG, so a
    public TaxSorted release needs Mindicraft's own developer accounts.
    Internal-testing practice under Cambridge TCG is a separate question for
    its spec.
  - Passkeys in a WebView need associated-domain / Digital Asset Links setup.
  - HMRC's Government Gateway sign-in must open in the system browser
    (ASWebAuthenticationSession / Custom Tabs), not an embedded WebView.
- **Other Cloudflare sites**: Apple rejects apps that are a repackaged website
  without app-like value (guideline 4.2). Each site needs a reason to exist as
  an app before it enters this pipeline. Google Play is more lenient but has its
  own WebView policies.

## 11. Coordination

On 2026-10-12, Nuance merged N1 (mobile shell) and D1 (Back model) into `main`.
Both are web-layer work. Nuance continues on game assets and experience.
This pipeline claims these new paths:

- `ios/`, `android/`, `fastlane/`, `Gemfile*`, `.github/workflows/mobile.yml`;
- `privacy.html`, `docs/MOBILE-PUBLISHING-RUNBOOK.md`, `docs/MOBILE-FIELD-NOTES.md`.

It also makes small, announced edits to shared files:

- `tools/build.mjs` (the native target);
- `hosting/public-assets.json` (the privacy page);
- `app.mjs` (only the guard that hides the account entry points in native builds);
- dated additions to `docs/CONNECTIONS.md` and `docs/MOBILE-RELEASE.md`;
- new rows in `docs/README.md` for every document this work adds.

M5.2 native behaviour builds on the committed native projects afterwards, as
its own packet. If another session starts M5.2 first, the native-project generation
step is the shared seam: whichever lands second rebases onto it rather than
regenerating.
