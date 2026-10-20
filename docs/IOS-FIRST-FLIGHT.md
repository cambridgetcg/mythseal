# iOS first flight · branch `ios/first-flight`

Status: `record · 2026-10-20`, local branch only. Nothing on it is pushed, merged,
deployed, signed, uploaded or registered with Apple or Google.

This branch brings open PR #13 (`mobile/cloud-pipeline`) up to `main` with a
merge commit and fixes what stood between it and a first TestFlight build under
the owner's 2026-10-20 decisions: **Mindicraft Limited** (company 13782045, an
organization team; Team ID `ZXUWDK4J3C`) publishes on the App Store, and
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
| 4 | The store build (`npm run build:native`) leaves out `account-client.mjs`, `account-ui.mjs` and `account.css`. `tools/build.mjs` swaps `app.mjs`'s two account imports for `account-offline.mjs` (which exports the same names, inert) and drops the stylesheet link from `index.html`; each edit must match exactly once, and the build stops if any shipped page, module or stylesheet still refers to a left-out file. `cloud-save.mjs` stays: despite its name it is the local journey's validator (profile store, local commands, file import) and makes no request. 88 files plus `release.json` | App Review 2.5.19 (2026-10-16) does not accept hidden or dormant features, so the account code is not shipped rather than shipped switched off. A build-time swap leaves the website byte for byte as it is; a guarded dynamic import would have delayed every web start by a round trip and changed the load order D1 and D2 were tested on. Tests: the real sources' native bundle has no account file and every reference reachable from `index.html` resolves inside it; a missed edit or a stray reference stops the build; the native smoke checks no account file is requested and no request fails | `web` |
| 5 | Native save safety. `native-shell.mjs` (no imports, so the startup recovery can load it too) reaches the Filesystem and Share plugins through `window.Capacitor.Plugins` (see "How the page reaches the plugins" below). (a) `saveFile()` downloads on the web as before and, in the app, writes the file to the Cache directory and opens the share sheet; D2's export, the recovery-copy export and `bootstrap.mjs`'s startup recovery export all use it. (b) **旅程存檔**, a header button in 旅程閣's place, opens a dialog with D2's export, its strict import, the status (last export, the journey's copy) and the recovery copy's actions. (c) Every profile write is mirrored to `Library/mythseal/journey.v5.json` (written to `.next`, then renamed). When a launch finds no journey in web storage but a copy in Library, `restoreFromMirror` checks the copy as a file import is checked and restores it through `restoreLocalProfile`, the strict path every restore shares; a refused copy is set aside under `journey.v5.refused-<time>.json`; until that is decided the new journey's saves do not touch the copy. `@capacitor/filesystem` 8.1.5 and `@capacitor/share` 8.0.3 pinned exactly (both peer `@capacitor/core >=8.0.0`) | A Blob download does nothing in WKWebView, so D2's safety net was missing in the app exactly where it is needed; D2's export, import and status lived only in 旅程閣, which the app hides; Capacitor's storage guide says iOS may clear a WKWebView's localStorage and IndexedDB. Tests: `tests/native-save.test.mjs` drives a fake bridge (export bytes and paths, cancel, coalesced mirror writes, a cleared install restored through the strict lock with its recovery copy, a tampered copy refused and kept, an unmovable one left alone); `npm run test:native` does the same in a page in Chromium (Pixel 7) and WebKit (iPhone 15), including the import from 旅程存檔, and fails if the mirror's hold is removed | `web` |
| 6 | `@capacitor/{cli,core,ios,android}` 8.5.2 → 8.5.3, exact pins. `npx cap sync ios` ran without Xcode (Command Line Tools only, exit 0, files only) and rewrote `CapApp-SPM/Package.swift`: `capacitor-swift-pm` exact 8.5.3, `.iOS(.v16)`, the Filesystem and Share packages. `IPHONEOS_DEPLOYMENT_TARGET` 16.0 (project and App target, Debug and Release; the CLI reads the first one for `Package.swift`), `TARGETED_DEVICE_FAMILY` 1, portrait only (the `~ipad` list removed), `ITSAppUsesNonExemptEncryption` false, `UIRequiredDeviceCapabilities` arm64 (was armv7), development region and only localization zh-Hant, and `ios/App/App/PrivacyInfo.xcprivacy` in the App target's Resources phase. The UIScene life cycle PR #13 set up (`SceneDelegate`, `UIApplicationSceneManifest`) is unchanged. `plutil -lint` passes on the project, `Info.plist` and the manifest; the project stays in the classic `project.pbxproj` format | Web Locks need iOS 15.4 and Capacitor 9 needs 16. iPad layouts and landscape below 701 px are unchecked or open (RELEASE-NEXT §12 items 17–18). The game uses only the OS's HTTPS and `crypto.randomUUID` (an identifier, not encryption), no WebCrypto. The UI ships Traditional Chinese only, so system sheets inside the app follow it. The manifest declares no tracking and no collected data, plus `NSPrivacyAccessedAPICategoryFileTimestamp` / `C617.1`: neither `@capacitor/filesystem` 8.1.5, `@capacitor/share` 8.0.3 nor `ion-ios-filesystem` 2.0.1 ships a manifest, the Filesystem plugin's `stat` reads creation and modification dates, and its README asks the app to declare exactly this; Capacitor's own xcframeworks carry theirs. Static checks in `tests/native-projects.test.mjs` (text, since CI runs on Linux) | `native-project` |
| 7 | `ios/App/ci_scripts/ci_post_clone.sh`, rendered from orchard's `templates/xcode-cloud/ci_post_clone.sh` (app Mythseal, `com.mythseal.game`, Node 24, `npm ci`, `npm test`, `npm run build:native`, project `ios/App/App.xcodeproj`) with the release fence `git merge-base --is-ancestor 7a7d03e HEAD` as its preflight; committed mode 100755; `sh -n` clean. It unshallows the clone, installs Node with Homebrew, tests, builds the store bundle, stamps `MARKETING_VERSION` from `package.json` and runs `npx cap sync ios` | Xcode Cloud is the primary release route: Apple signs in the cloud, so no key or certificate reaches a runner and the script holds no secret. A build that has lost the fence (a squash or rebase of the release history) stops before anything is built. Not run: it needs Xcode Cloud (and `brew install` is not something to run on this Mac) | `native-project` |
| 8 | `.github/workflows/mobile.yml`, now the backup route: both jobs check out full history (`fetch-depth: 0`) and run `git merge-base --is-ancestor 7a7d03e HEAD` before anything else; the iOS job pins `DEVELOPER_DIR=/Applications/Xcode_26.6.app/Contents/Developer` at job level and fails unless `xcodebuild -version` says `Xcode 26.6`, replacing the "major ≥ 26" check. SHA-pinned actions, step-scoped secrets, triggers and everything else are unchanged | The release fence is the repository's rule for any release build. The runner image's default Xcode moves when GitHub updates it, so the same commit could build against a different SDK on two runs; a pinned path, asserted, makes that a deliberate edit (26.6 is the macos-26 image's default, image 20261013, per the research). GitHub runs `workflow_dispatch` only when the workflow file is on the default branch, so before this merges the only trigger is a `mobile-v*` tag, which uploads | `native-project` (not run: no Actions run, budget state unknown) |
| 9 | Documents: [MOBILE-RELEASE](MOBILE-RELEASE.md) (a dated first-flight note, the D2 seam's native adapter, the Apple entity decided), the [runbook](MOBILE-PUBLISHING-RUNBOOK.md) (hybrid route: Xcode Cloud setup and release first, the Actions workflow as backup and for Android; checklist items for 2.5.19 and saves), the [field notes](MOBILE-FIELD-NOTES.md) (a dated Stage 0 entry), the design spec's route amendment, the [docs index](README.md) rows and this record | Keep the publishing flow honest for the next app: which route builds a release, who publishes, what the app ships, and what nothing has proved yet | — |
| 10 | Verification on the final tree ([VALIDATION](VALIDATION.md#ios-first-flight--2026-10-20)): `npm test` 657/657; the native build (89 files, no account file); the release preflight with dummy values; `cap sync ios` without Xcode; `sh -n`; `plutil -lint`; the fence; `test:native` in Chromium and WebKit (9 groups each, now with Back closing 旅程存檔); and, on the website, `test:saves`, the account smoke and `test:back` in their engines | To show what this branch has and has not proved | `native-project` reached; `simulator` and above not attempted |

## How the page reaches the plugins

Read from `@capacitor/ios` 8.5.3's sources (its `JSExport.swift`, `CapacitorBridge.swift` and
`WebViewDelegationHandler.swift` are identical to 8.5.2's); not yet run in a WKWebView.
`CapacitorBridge.init` adds WKUserScripts at document start in this order: `window.Capacitor =
{ …, Plugins: {} }` (`JSExport.exportCapacitorGlobalJS`), then `native-bridge.js`, which keeps that
object (`const cap = win.Capacitor || {}`) and adds `isNativePlatform()` and `nativePromise()`, then,
for each plugin listed in the generated `capacitor.config.json` (`packageClassList`, written by
`cap sync`), `JSExport.exportJS`, which sets `window.Capacitor.Plugins[jsName]` to an object with
one function per native method calling `Capacitor.nativePromise(jsName, method, options)`. So the
game's un-bundled modules call `window.Capacitor.Plugins.Filesystem.writeFile({…})` directly and
nothing from `@capacitor/core` or the plugins' JS packages is vendored. Those npm packages are
still needed at build time: `cap sync` finds native plugins through `package.json` (devDependencies
included) and adds them to `CapApp-SPM/Package.swift`. An https link in the page opens Safari
(`WebViewDelegationHandler` hands any non-app top-level navigation to `UIApplication.open`). A
`blob:` download link takes that same path, which the system cannot open, and 8.5.3 has no
`WKDownload` handling, so a web-style download should do nothing in the app (inferred from the
source, not observed): that is why the export uses the share sheet.

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
- **`Package.resolved`, once Xcode is installed.** Xcode Cloud does not resolve
  Swift packages by itself, so the resolved versions must be committed at
  `ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved`.
  Only Xcode can write it: open `ios/App/App.xcodeproj` and let it resolve, or
  run `xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj`
  after `npm ci` and `npx cap sync ios`. It will pin the remote packages
  (`capacitor-swift-pm` 8.5.3, `ion-ios-filesystem` 2.0.1); the two plugins are
  local paths into `node_modules`. Regenerate and commit it after every
  Capacitor or plugin bump. `orchard doctor` reports it missing until then.
- **Team ID.** Done: the owner confirmed Mindicraft's Team ID `ZXUWDK4J3C` on
  2026-10-20. It is set as `DEVELOPMENT_TEAM` on the App target (Xcode Cloud's
  automatic signing needs the project's team to match) and in orchard's
  `orchard.json`. Set it as the `APPLE_TEAM_ID` variable only if the Actions
  backup is set up.
- **Who owns Mythseal.** The code, art and name sit in the `cambridgetcg`
  organization; nothing here records who owns them. If that is not Mindicraft
  Limited, Mindicraft needs a licence to publish them (App Review's
  intellectual-property rules, section 5.2).
- **Marketing version.** `package.json` says 0.5.1, which Xcode Cloud will
  stamp as `MARKETING_VERSION`; the content is v0.6.0-era (RELEASE-NEXT §3).
  Decide whether the first TestFlight build carries 0.5.1 or waits for the
  0.6.0 bump.
- **A licence for a public repository.** The repository is public, and
  [AGENTS.md](../AGENTS.md) still says no open-source licence has been chosen.
- **Xcode on a Mac.** Installing Xcode (and its iOS platform) is the owner's
  step; it unlocks `Package.resolved`, the simulator rung and the first Xcode
  Cloud workflow.
- **Still M5 work, not done here:** the Capacitor Back button wiring
  ([Back button in a native shell](MOBILE-RELEASE.md#back-button-in-a-native-shell--2026-10-12)),
  safe-area insets from a native shell, audio and lifecycle recovery, and the
  physical-phone checks.

## Not verified yet

- Nothing has run in a WKWebView, the iOS Simulator or an iPhone. The plugin
  access path, the share sheet, `<input type=file>` inside the app, the Library
  copy surviving whatever clears the WebView's storage, and the restore at
  launch are read from source or simulated with a fake bridge in desktop
  Chromium (Pixel 7) and Playwright's WebKit (iPhone 15).
- No Xcode build, archive, signature, Xcode Cloud run or Actions run.
- `ci_post_clone.sh` was checked with `sh -n` and its steps pinned by a test; it
  has never run.
- The privacy page is a draft.

## Known limits of the native copy

- A copy whose restore fails for a reason outside the copy itself (no Web
  Locks, a profile fence that refuses) is set aside like an invalid one. It is
  kept byte for byte in the app's Library, but the app does not yet offer it
  back; listing set-aside copies in 旅程存檔 with an export would close that.
- The copy follows each save asynchronously, so a crash right after a save can
  leave it one save behind localStorage.
- The copy lives in the app's container: deleting the app deletes it. Only an
  exported file or a device backup survives that.
- A completed share sheet is recorded as an export, never as a backup: iOS
  reports that an activity finished, not where the file went.

## Other hands

The `n2/landscape-short-phones` and `r1/astra-review-fixes` worktrees (other
contributors', based on `998b614`, left untouched) edit `app.mjs`, `styles.css`
and `docs/README.md`. This branch edits `app.mjs` (the account controller,
`navigate`, the lobby strips, the export, the header, the rules link, the
recovery export and the launch), `save-ui.mjs`, `saves.css`, `platform.mjs`,
`bootstrap.mjs`, `docs/README.md` and the mobile documents, and PR #13 edits
`styles.css`. Expect conflicts when either lands; resolve them with merge
commits, keeping both sides' intent.
