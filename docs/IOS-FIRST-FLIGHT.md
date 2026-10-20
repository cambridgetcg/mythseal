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
| 4 | The store build (`npm run build:native`) leaves out `account-client.mjs`, `account-ui.mjs` and `account.css`. `tools/build.mjs` swaps `app.mjs`'s two account imports for `account-offline.mjs` (which exports the same names, inert) and drops the stylesheet link from `index.html`; each edit must match exactly once, and the build stops if any shipped page, module or stylesheet still refers to a left-out file. `cloud-save.mjs` stays: despite its name it is the local journey's validator (profile store, local commands, file import) and makes no request. 88 files plus `release.json` | App Review 2.5.19 (2026-10-16) does not accept hidden or dormant features, so the account code is not shipped rather than shipped switched off. A build-time swap leaves the website byte for byte as it is; a guarded dynamic import would have delayed every web start by a round trip and changed the load order D1 and D2 were tested on. Tests: the real sources' native bundle has no account file and every reference reachable from `index.html` resolves inside it; a missed edit or a stray reference stops the build; the native smoke checks no account file is requested and no request fails | `web` |
| 5 | Native save safety. `native-shell.mjs` (no imports, so the startup recovery can load it too) reaches the Filesystem and Share plugins through `window.Capacitor.Plugins` (see "How the page reaches the plugins" below). (a) `saveFile()` downloads on the web as before and, in the app, writes the file to the Cache directory and opens the share sheet; D2's export, the recovery-copy export and `bootstrap.mjs`'s startup recovery export all use it. (b) **旅程存檔**, a header button in 旅程閣's place, opens a dialog with D2's export, its strict import, the status (last export, the journey's copy) and the recovery copy's actions. (c) Every profile write is mirrored to `Library/mythseal/journey.v5.json` (written to `.next`, then renamed). When a launch finds no journey in web storage but a copy in Library, `restoreFromMirror` checks the copy as a file import is checked and restores it through `restoreLocalProfile`, the strict path every restore shares; a refused copy is set aside under `journey.v5.refused-<time>.json`; until that is decided the new journey's saves do not touch the copy. `@capacitor/filesystem` 8.1.5 and `@capacitor/share` 8.0.3 pinned exactly (both peer `@capacitor/core >=8.0.0`) | A Blob download does nothing in WKWebView, so D2's safety net was missing in the app exactly where it is needed; D2's export, import and status lived only in 旅程閣, which the app hides; Capacitor's storage guide says iOS may clear a WKWebView's localStorage and IndexedDB. Tests: `tests/native-save.test.mjs` drives a fake bridge (export bytes and paths, cancel, coalesced mirror writes, a cleared install restored through the strict lock with its recovery copy, a tampered copy refused and kept, an unmovable one left alone); `npm run test:native` does the same in a page in Chromium (Pixel 7) and WebKit (iPhone 15), including the import from 旅程存檔, and fails if the mirror's hold is removed | `web` |
| 6 | `@capacitor/{cli,core,ios,android}` 8.5.2 → 8.5.3, exact pins. `npx cap sync ios` ran without Xcode (Command Line Tools only, exit 0, files only) and rewrote `CapApp-SPM/Package.swift`: `capacitor-swift-pm` exact 8.5.3, `.iOS(.v16)`, the Filesystem and Share packages. `IPHONEOS_DEPLOYMENT_TARGET` 16.0 (project and App target, Debug and Release; the CLI reads the first one for `Package.swift`), `TARGETED_DEVICE_FAMILY` 1, portrait only (the `~ipad` list removed), `ITSAppUsesNonExemptEncryption` false, `UIRequiredDeviceCapabilities` arm64 (was armv7), development region and only localization zh-Hant, and `ios/App/App/PrivacyInfo.xcprivacy` in the App target's Resources phase. The UIScene life cycle PR #13 set up (`SceneDelegate`, `UIApplicationSceneManifest`) is unchanged. `plutil -lint` passes on the project, `Info.plist` and the manifest; the project stays in the classic `project.pbxproj` format | Web Locks need iOS 15.4 and Capacitor 9 needs 16. iPad layouts and landscape below 701 px are unchecked or open (RELEASE-NEXT §12 items 17–18). The game uses only the OS's HTTPS and `crypto.randomUUID` (an identifier, not encryption), no WebCrypto. The UI ships Traditional Chinese only, so system sheets inside the app follow it. The manifest declares no tracking and no collected data, plus `NSPrivacyAccessedAPICategoryFileTimestamp` / `C617.1`: neither `@capacitor/filesystem` 8.1.5, `@capacitor/share` 8.0.3 nor `ion-ios-filesystem` 2.0.1 ships a manifest, the Filesystem plugin's `stat` reads creation and modification dates, and its README asks the app to declare exactly this; Capacitor's own xcframeworks carry theirs. Static checks in `tests/native-projects.test.mjs` (text, since CI runs on Linux) | `native-project` |

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
