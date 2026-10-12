# Mobile cloud pipeline · design · 2026-10-12

Status: **approved in conversation 2026-10-12, awaiting written-spec review.**
Nothing in this document has been built, signed, uploaded or registered.

## 1. Purpose

The owner asked for an iOS and Android publishing pipeline that builds in the
cloud, for Mythseal first, TaxSorted next and possibly other Cloudflare-hosted
sites later. The aim of this round is **practice**: learn the whole route by
getting one app onto TestFlight and Google Play internal testing. Public store
release can wait.

What the owner said (2026-10-12):

- Build in the cloud, not on this Mac.
- Mythseal and TaxSorted, and possibly other Cloudflare sites.
- The purpose is to practise and learn the path; public launch can wait.
- Both developer accounts (Apple Developer Program and Google Play Console) are
  registered to **Cambridge TCG Limited** and are already granted.
- Route A was chosen: GitHub Actions + fastlane.

Assumptions written into this design (the owner can correct any of them):

- Mythseal is the practice app. TaxSorted and other sites get their own specs
  later and reuse this pipeline.
- Nothing reaches a public store track in this round.
- Signing material lives with Apple, Google and GitHub, never as files on this Mac.

**Success means** the owner presses Run in GitHub, both platforms build in the
cloud, and the owner installs Mythseal on an iPhone through TestFlight and on an
Android phone through Play internal testing, and the game opens offline.

## 2. Authorization record

`docs/HANDOVER.md` says native/store release is not authorized by the handover
and must be resolved "when a concrete future task needs them". This is that
task. The owner authorized on 2026-10-12: native project generation, a cloud
build workflow, signing set up through Apple, Google and GitHub, and uploads to
**TestFlight and Play internal testing only**. External TestFlight testing,
closed, open and production tracks, store listings and paid upgrades remain
unauthorized.

## 3. Scope

In scope:

- Generate and commit Capacitor `ios/` and `android/` projects from the
  existing `capacitor.config.json` (`com.mythseal.game`, `Mythseal`, `webDir: dist`).
- `fastlane/` lanes for both platforms.
- `.github/workflows/mobile.yml`, which runs only on manual dispatch or a
  `mobile-v*` tag.
- GitHub environment `mobile-stores` holding the signing secrets.
- Documentation updates to `docs/CONNECTIONS.md` and `docs/MOBILE-RELEASE.md`
  recording what was actually connected and verified.

Out of scope (each needs its own task):

- M5.1 physical-phone validation and M5.2 native behaviour: durable storage,
  save migration, `@capacitor/app` Back wiring (see the Back-button section of
  `docs/MOBILE-RELEASE.md`), audio and lifecycle recovery, haptics.
- Store listings, screenshots, ratings questionnaires, data-safety forms beyond
  what internal testing requires, and any public release.
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
committed into them: every build runs the existing `npm run build` (the
allowlisted `dist/`) and then `npx cap sync` to copy it in. Generated web-copy
paths stay in `.gitignore`.

### 4.3 Workflow `mobile.yml`

Triggers:

- `workflow_dispatch` with a boolean input `upload` that defaults to `false` (dry mode).
- A push of a `mobile-v*` tag, which uploads.

Two independent jobs run in parallel. Neither depends on the other.

| Job | Runner | Steps |
| --- | --- | --- |
| `ios` | GitHub macOS (image pinned to one whose Xcode meets Apple's current upload SDK minimum) | checkout → Node 22 → `npm ci` → `npm test` → `npm run build` → `npx cap sync ios` → `fastlane ios beta` |
| `android` | `ubuntu-latest` + JDK 21 | checkout → Node 22 → `npm ci` → `npm test` → `npm run build` → `npx cap sync android` → `fastlane android internal` |

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
  5. In upload mode, run `upload_to_testflight` with internal testers only.
  6. In dry mode, keep the `.ipa` as a workflow artifact for 3 days.
- `android internal`:
  1. Decode the upload keystore to runner temp.
  2. Set `versionCode` and `versionName`.
  3. Run `bundleRelease`, which Gradle signs from environment variables.
  4. In upload mode, run `upload_to_play_store` to track `internal`.
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

App Store Connect (`appstoreconnect.apple.com`, which resolves on this Mac;
`developer.apple.com` does not and is not needed):

1. Users and Access → Integrations → Team Keys → generate a key (role per §5).
   Download the `.p8` once.
2. Register the bundle ID `com.mythseal.game`. Ai can do this through the App
   Store Connect API with that key, avoiding the developer portal.
3. Apps → New App: iOS, name "Mythseal" (or a fallback such as "萬象契 Mythseal"
   if the name is taken), bundle ID `com.mythseal.game`, SKU `mythseal-ios`.
   The API cannot create app records.
4. TestFlight → internal testing group → add the owner's Apple ID.

Google Play Console:

1. Create the app "Mythseal" (game, free). Play App Signing is on by default
   for new apps.
2. In Google Cloud, create a service account and a JSON key. Invite its email
   in Play Console with "release to testing tracks" for this app.
3. Internal testing → testers list → add the owner's Google account.
4. Upload the first `.aab` by hand from a dry-run artifact, and roll out that
   first internal release in the console (see §9, draft-app rule).

The account is an organization account, so the personal-account "12 testers
for 14 days" production rule does not apply. It is irrelevant to internal
testing anyway.

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

## 8. Testing and done criteria

1. `npm test` passes inside both jobs before any native build.
2. Dry run: both jobs green, with a signed `.ipa` and `.aab` as artifacts and
   the job summaries showing the same digest and build number.
3. Upload run: the build appears in TestFlight (after Apple's processing) and
   in Play internal testing.
4. **Done:** the owner installs from TestFlight on an iPhone and from the Play
   internal-testing link on an Android phone, and Mythseal opens to the lobby in
   airplane mode.
5. `docs/CONNECTIONS.md` records each connection with its date and evidence.
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
- Apple App Review Guidelines 4.2 and 5.1.1(ix) wording, quoted from
  memory in conversation because `developer.apple.com` didn't resolve. These
  matter for §10, not for internal testing.

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
Both are web-layer work. This pipeline claims these new paths only: `ios/`,
`android/`, `fastlane/`, `Gemfile*`, `.github/workflows/mobile.yml`, plus
dated additions to `docs/CONNECTIONS.md` and `docs/MOBILE-RELEASE.md`. M5.2
native behaviour builds on the committed native projects afterwards, as its own
packet. If another session starts M5.2 first, the native-project generation
step is the shared seam: whichever lands second rebases onto it rather than
regenerating.
