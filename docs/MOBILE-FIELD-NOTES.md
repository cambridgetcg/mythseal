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
