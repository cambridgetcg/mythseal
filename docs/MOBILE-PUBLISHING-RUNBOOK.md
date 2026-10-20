# Mobile publishing runbook

Status: `current` for the pipeline in this repository; Stage 2 sections fill in
as reviews happen. Evidence for every step is in
[MOBILE-FIELD-NOTES.md](MOBILE-FIELD-NOTES.md). Worked example: Mythseal
(`com.mythseal.game`). Apple: Mindicraft Limited's organization team (company
13782045; Team ID `ZXUWDK4J3C`). Google Play: the publishing entity is to be
confirmed. (Amended 2026-10-20; the first draft named Cambridge TCG Limited for
both stores.)

**Route, amended 2026-10-20.** iOS release builds run in the cloud on a hybrid
route: **Xcode Cloud first** (Apple signs in the cloud, so no API key or
certificate reaches a runner), this repository's GitHub Actions workflow as the
**backup**, and a local Xcode on a developer Mac only for the simulator. This
supersedes the 2026-10-12 "build in the cloud, not on this Mac" note: the cloud
still builds releases, and a Mac with Xcode may now run the simulator. The
shared templates and checks live in **orchard**, a separate public repository
(`~/orchard`, to become `cambridgetcg/orchard`); its `orchard doctor` reports
each check on the ladder in [IOS-FIRST-FLIGHT](IOS-FIRST-FLIGHT.md). Android
still uses the GitHub Actions workflow below.

## 0. Before an app enters this pipeline

- [ ] It has a reason to be an app (Apple 4.2: not "a repackaged website").
- [ ] The publishing legal entity is right (Apple 5.1.1(ix): regulated fields
      such as financial services must be submitted by the providing entity).
- [ ] Accounts: if the app lets people create one, it must offer in-app account
      deletion (Apple 5.1.1(v)); otherwise ship a guest build.
- [ ] No hidden or dormant features (Apple 2.5.19): code the app does not use
      is left out of the native bundle, not shipped switched off.
- [ ] Network: list every request the bundle makes; that list *is* the privacy answer.
- [ ] Saves: a WKWebView's localStorage and IndexedDB can be cleared by iOS, and
      a Blob download does nothing in it. Keep a durable copy and an export
      that works in the app.
- [ ] A privacy policy URL exists and is also linked inside the app (Google;
      Apple asks for the URL too).

## 1. One-time setup per app

**Xcode Cloud (primary, iOS).**

1. The app repository carries `ios/App/ci_scripts/ci_post_clone.sh`, rendered
   from orchard's template (executable), and a committed
   `ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved`,
   because Xcode Cloud does not resolve packages by itself. Only Xcode writes
   `Package.resolved`; regenerate it after every Capacitor or plugin bump.
2. A person signed in to the Mindicraft team in the Xcode app creates the first
   workflow: open `ios/App/App.xcodeproj`, then in the Report navigator click
   the Cloud button and Get Started (Apple's "Configuring your first Xcode
   Cloud workflow"), and grant Xcode Cloud access to the GitHub repository when
   asked. The App scheme already archives and is shared.
3. Internal testers in App Store Connect; the workflow's archive action posts to
   TestFlight internal testing.

**GitHub Actions (backup; Android's only route).**

1. GitHub environment `mobile-stores` (branch `main`, tags `mobile-v*`), its
   variables and secrets (table in the design spec §5). The App Store Connect
   team key is needed only for this route; create it only if the route is used.
2. Android upload keystore: generate, back up in the keychain, set the secrets,
   delete the file.
3. App Store Connect: Admin team API key → secrets; `bundle exec fastlane ios
   register_bundle_id`; create the app record; add internal testers.
4. Play Console: create the app; service account JSON → secret; invite it with
   "release to testing tracks"; add internal testers.
5. First Play upload by hand (dry-run AAB artifact) and roll it out; then set
   `PLAY_RELEASE_STATUS=completed`.

## 2. Each release

- **Stage 1 (internal), iOS on Xcode Cloud:** start the workflow (or let its
  start condition trigger it). `ci_post_clone.sh` checks the release fence,
  installs Node, runs the tests, builds the store bundle, stamps the marketing
  version and runs `cap sync`; Xcode Cloud archives, signs and sends the build
  to TestFlight internal testing. Install from TestFlight; open once in
  airplane mode.
- **Stage 1, backup or Android:** Actions → Mobile builds → Run with `upload`
  off; check both summaries show the same build number and manifest; run again
  with `upload` on (or push `mobile-v<version>-<n>`). GitHub offers Run only
  once the workflow file is on the default branch. Install from TestFlight and
  the Play internal link; open once in airplane mode.
- **Stage 2 (reviewed testing):** see §3, then promote the same build by hand:
  TestFlight external group → Beta App Review; Play closed testing → review.

## 3. Pre-review checklist

(Filled from the field notes' "pay attention to" lines as Stage 2 runs.)

## 4. When a review rejects

Copy the store's exact words into the field notes. Decide: metadata fix
(resubmit the same build) or code fix (new run, new build number). Resubmit by
hand. Nothing resubmits automatically.

## 5. Costs and timings to expect

(Filled from the field notes after Stage 1 and Stage 2.) The Apple Developer
Program membership includes 25 Xcode Cloud compute hours a month.
