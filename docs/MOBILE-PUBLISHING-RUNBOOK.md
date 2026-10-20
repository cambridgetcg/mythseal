# Mobile publishing runbook

Status: `current` for the pipeline in this repository; Stage 2 sections fill in
as reviews happen. Evidence for every step is in
[MOBILE-FIELD-NOTES.md](MOBILE-FIELD-NOTES.md). Worked example: Mythseal
(`com.mythseal.game`, Cambridge TCG Limited's developer accounts).

## 0. Before an app enters this pipeline

- [ ] It has a reason to be an app (Apple 4.2: not "a repackaged website").
- [ ] The publishing legal entity is right (Apple 5.1.1(ix): regulated fields
      such as financial services must be submitted by the providing entity).
- [ ] Accounts: if the app lets people create one, it must offer in-app account
      deletion (Apple 5.1.1(v)); otherwise ship a guest build.
- [ ] Network: list every request the bundle makes; that list *is* the privacy answer.
- [ ] A privacy policy URL exists and is also linked inside the app (Google).

## 1. One-time setup per app

1. GitHub environment `mobile-stores` (branch `main`, tags `mobile-v*`), its
   variables and secrets (table in the design spec §5).
2. Android upload keystore: generate, back up in the keychain, set the secrets,
   delete the file.
3. App Store Connect: Admin team API key → secrets; `bundle exec fastlane ios
   register_bundle_id`; create the app record; add internal testers.
4. Play Console: create the app; service account JSON → secret; invite it with
   "release to testing tracks"; add internal testers.
5. First Play upload by hand (dry-run AAB artifact) and roll it out; then set
   `PLAY_RELEASE_STATUS=completed`.

## 2. Each release

- **Stage 1 (internal):** Actions → Mobile builds → Run with `upload` off;
  check both summaries show the same build number and manifest; run again with
  `upload` on (or push `mobile-v<version>-<n>`). Install from TestFlight and the
  Play internal link; open once in airplane mode.
- **Stage 2 (reviewed testing):** see §3, then promote the same build by hand:
  TestFlight external group → Beta App Review; Play closed testing → review.

## 3. Pre-review checklist

(Filled from the field notes' "pay attention to" lines as Stage 2 runs.)

## 4. When a review rejects

Copy the store's exact words into the field notes. Decide: metadata fix
(resubmit the same build) or code fix (new run, new build number). Resubmit by
hand. Nothing resubmits automatically.

## 5. Costs and timings to expect

(Filled from the field notes after Stage 1 and Stage 2.)
