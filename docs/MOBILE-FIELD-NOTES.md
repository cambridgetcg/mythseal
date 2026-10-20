# Mobile field notes

Status: `record`, dated per entry, newest last. One entry per workflow run,
console session or review. Each ends with a **Pay attention to** line that
feeds the runbook's checklist. Step timings come from
`sol access run github -- run view <id> -R cambridgetcg/mythseal --json jobs`.

Entry template:

### YYYY-MM-DD · Stage N · <what>
- Build / run: <build number> · <run URL or console page>
- Done by: <owner's hands | workflow | Ai via API>
- Took: <minutes, including store processing or review wait>
- Asked for: <fields, declarations, documents>
- Surprises and fixes: <exact store wording where it matters>
- Minutes used: macOS <n> (×10 on private repos) · Linux <n>
- **Pay attention to:** <one line>

### 2026-10-12 · Stage 0 · Before any build
- Done by: Ai (inventory and design)
- Asked for: nothing yet
- Surprises and fixes: no privacy policy existed; web accounts have no in-app
  account deletion; the account client's same-origin `/api` calls cannot work
  inside a WebView (→ offline guest build); `developer.apple.com` does not
  resolve on the owner's Air; Apple requires Xcode 26 for uploads since
  2026-04-28; Play requires targetSdk 36 since 2026-08-31.
- **Pay attention to:** check accounts, privacy and network use *before* the
  first build. They decide the review answers.

### 2026-10-12 · Stage 0 · Building the pipeline locally
- Build / run: no store build yet; local branch `mobile/cloud-pipeline`
- Done by: Ai
- Took: one session
- Asked for: nothing from either store yet
- Surprises and fixes:
  - `npx cap add ios` (Capacitor 8.5.2, Swift Package Manager) **works with
    Command Line Tools only**. Full Xcode is needed to build, not to generate.
  - `@capacitor/assets` also targets a web app unless you pass `--ios --android`.
    Without them it fails on a missing `www/manifest.json` and leaves an
    `icons/` folder behind.
  - A Playwright `setContent` page cannot load `file://` images, so inline them
    as `data:` URLs when rendering icons or store art.
  - The brand mark has its own rounded tile. Fill the icon with the tile's
    colour (`#10251e`) or it shows as a tile inside a tile.
  - Native smoke (simulated bridge, Pixel 7 emulation): 130 local requests,
    0 to `/api`, 0 off-origin. This is the evidence behind "Data Not Collected".
  - `npm audit`: 4 high advisories, all through wrangler (miniflare, sharp,
    undici). They were already there; none come from Capacitor.
  - `actionlint` 1.7.12 knows the `macos-26` runner label.
  - This Mac is darwin 24 but `macos-26` runners are darwin 25. Lock both
    (`bundle lock --add-platform arm64-darwin-25`).
- Minutes used: none
- **Pay attention to:** generate native projects early and look at every
  generated image. The generators fail quietly.

### 2026-10-20 · Stage 0 · First flight, locally (branch `ios/first-flight`)
- Build / run: no store build; local branch `ios/first-flight`, PR #13 merged
  into `main` 998b614 with a merge commit ([IOS-FIRST-FLIGHT](IOS-FIRST-FLIGHT.md))
- Done by: Ai, on the owner's Air (macOS 26.6.2, Command Line Tools 26.4, no
  Xcode, Node 26.0.0)
- Took: one session
- Asked for: nothing from either store yet; the owner decided Mindicraft
  Limited publishes and that Xcode Cloud is the primary route
- Surprises and fixes:
  - PR #13's native guard sat at call sites; D2's lobby actions reached
    `account.init()` and `navigate('account')` past it. Guarding the choke
    points (an inert account controller, `navigate`) closed every path at once.
  - Apple's new guideline 2.5.19 (2026-10-16) makes "shipped but switched
    off" a review risk, so the account files now stay out of the native build.
  - `cloud-save.mjs` is not cloud-only: it validates every local journey. A
    file's name is not its role; check the importers before excluding one.
  - `@capacitor/filesystem` 8.1.5, `@capacitor/share` 8.0.3 and
    `ion-ios-filesystem` 2.0.1 ship no privacy manifest; the Filesystem
    README asks the app to declare the file-timestamp API (`C617.1`).
  - Capacitor's bridge exposes `window.Capacitor.Plugins.<Name>` to plain ES
    modules; no `@capacitor/core` bundle is needed (read from 8.5.3's source).
  - `npx cap sync ios` (8.5.3, SPM) ran with Command Line Tools only and
    exited 0; it reads the first `IPHONEOS_DEPLOYMENT_TARGET` in the project
    for `Package.swift`'s platform, so set every occurrence.
  - The plugin writes strings non-atomically; the journey's copy is written to
    a `.next` file and renamed.
  - `Package.resolved` needs Xcode; Xcode Cloud needs it committed.
  - `tools/serve.py` reads the allowlist once at start: restart it after
    adding a module, or the new module 404s.
- Minutes used: none
- **Pay attention to:** decide what the app leaves out, where its saves live
  and which entity publishes before the first build; each of them changes the
  project, the privacy answers or the page text.
