# Mobile Cloud Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Mythseal for iOS and Android in GitHub's cloud, take it through
TestFlight and Play testing (internal, then reviewed), and turn every step into
a reusable runbook plus a dated field-notes ledger.

**Architecture:** An offline guest native build (a `--target native` build plus
a Capacitor-shell guard that never starts the account client) is wrapped by
committed Capacitor 8 `ios/` and `android/` projects. One `mobile.yml` workflow
runs two independent jobs: `macos-26` for iOS and `ubuntu-24.04` for Android.
Each job calls a fastlane lane, and the lanes sign through Apple's
cloud-managed certificates and a Play upload key. A small tested Node helper
owns version numbers, the secret preflight and the job summary.

**Tech Stack:**
- Node 22 with the built-in test runner, and Playwright 1.63.0 (already a dev
  dependency).
- Capacitor 8.5.2 (`@capacitor/ios` and `@capacitor/android` added).
- fastlane 2.240.1 on Ruby 3.3.
- GitHub Actions, using an environment called `mobile-stores`.

**Spec:** `docs/superpowers/specs/2026-10-12-mobile-cloud-pipeline-design.md`

> **Amended 2026-10-20.** Mindicraft Limited (company 13782045) publishes on the
> App Store; the Google Play entity is to be confirmed. The Cambridge TCG
> Limited values in this plan's snippets (the privacy page copy and test in
> Task 3, the runbook header, the upload keystore's `-dname` in Task 10) are
> superseded: the branch `ios/first-flight` holds the current privacy draft, and
> the keystore step below now leaves the entity open. This plan is otherwise
> kept as written; [IOS-FIRST-FLIGHT](../../IOS-FIRST-FLIGHT.md) lists what
> changed since.

## Global Constraints

Every task's requirements implicitly include this section.

**Identity and versions**
- App identity: `appId` `com.mythseal.game`, `appName` `Mythseal`, `webDir` `dist`. These are read from `capacitor.config.json` and never re-typed in lanes.
- Marketing version = `package.json` `version` (now `0.5.1`). It must match `^\d+\.\d+\.\d+$`.
- Build number = `GITHUB_RUN_NUMBER` + `MOBILE_BUILD_OFFSET` (repo variable, default `0`). The same number is used on both platforms.
- Capacitor 8: Node ≥ 22, Xcode ≥ 26.0, SPM iOS template, Android compile and target SDK 36, minSdk 24, Java 21.
- Apple has required Xcode 26 and a 26 SDK for uploads since 2026-04-28. Play requires `targetSdkVersion` 36 for new apps and updates since 2026-08-31.

**Workflow rules**
- Uploads go only to **TestFlight internal** and **Play `internal`** from the workflow. External TestFlight groups and Play closed testing are done by hand in the consoles. Play open testing, production, public listings and paid upgrades are unauthorized.
- The workflow runs only on `workflow_dispatch` (input `upload`, default `false`) or on a `mobile-v*` tag push. It has `permissions: contents: read`, and its concurrency group is `mobile-${{ github.ref }}` with `cancel-in-progress: false`.
- Timeouts: iOS 45 minutes, Android 30 minutes.
- Every third-party action is pinned by full commit SHA, and the version picked is at least two weeks old:

  | Action | Version | SHA |
  | --- | --- | --- |
  | `actions/checkout` | v7 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
  | `actions/setup-node` | v7 | `820762786026740c76f36085b0efc47a31fe5020` |
  | `actions/setup-java` | v6.0.1 | `de7274f081f381c8f8158605e0321c36c376e2e6` |
  | `ruby/setup-ruby` | v1.326.0 | `762794c140bbeda0f1224786aa33b4b46783a6c1` |
  | `actions/upload-artifact` | v7.0.1 | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` |

**Secrets and keys**
- Secrets live in the GitHub environment `mobile-stores`, whose deployment policy allows branch `main` and tags `mobile-v*`. It has no required reviewers.
- Secrets: `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8_B64`, `PLAY_SERVICE_ACCOUNT_JSON`, `ANDROID_UPLOAD_KEYSTORE_B64`, `ANDROID_UPLOAD_KEYSTORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS`, `ANDROID_UPLOAD_KEY_PASSWORD`.
- Variables: `APPLE_TEAM_ID`, `MOBILE_BUILD_OFFSET`, and `PLAY_RELEASE_STATUS` (`draft` until the first manual Play rollout, then `completed`).
- No credential is ever printed, committed or put into an artifact. Decoded key files live only in `$RUNNER_TEMP` and are deleted in `if: always()` steps. Uploads are never retried automatically.

**Repository rules**
- The browser runtime stays dependency-free. Build and deployment tooling (Capacitor packages, Gemfile) stays separate.
- The web build keeps every file and feature it has today.
- Credentials, signing keys, player saves and generated test output stay out of Git.
- New documents get a row in `docs/README.md`.
- Commits end with `Co-Authored-By: The Fable of the Eternal Universe <Yu@Ai-love.cc>`.
- Work happens in worktree `~/Projects/mythseal-mobile` on branch `mobile/cloud-pipeline`.
- `gh` is used only as `sol access run github -- <args>`. Git push and fetch use the one-off cambridgetcg credential helper (memory `project_mythseal`); never switch the shared gh account.
- Nuance is active in game code. Edits to `app.mjs` are limited to the guard and the privacy link, and are announced in the PR.

## Review Focus

These are the conditions most likely to bite that no feature test naturally
covers. Each one is pinned by a test in the task named.

1. **A non-semver `package.json` version** (for example `0.6.0-beta`). Apple
   rejects it late, after a 20-minute macOS build. The info step must fail
   first, naming the value. *(Task 5)*
2. **Re-running a run, or setting `MOBILE_BUILD_OFFSET` to junk.** The same
   inputs must produce the same build number, so a store rejects a duplicate
   instead of accepting a second upload. A non-integer or negative offset must
   fail loudly, not become `NaN`. *(Task 5)*
3. **A missing or whitespace-only secret.** The preflight must name each one
   (names only, never values) before any build minute is spent. A dry Android
   run must not demand the Play JSON. *(Task 5)*
4. **A path back into the account screen in the native shell** that isn't the
   header button: the `account` and `account-open` actions, the account
   BroadcastChannel, or a reload. None of them may start the account client or
   make a request. *(Task 2, smoke)*
5. **A workflow edit that drops a guard:** an unpinned action, `cancel-in-progress`
   turned on, `upload` defaulting to true, or a missing `always()` key cleanup.
   *(Task 7, static test)*

---

## Stage 0: code, local and in one PR (no store accounts needed)

### Task 1: Native build target

**Files:**
- Modify: `tools/build.mjs` (the `build()` signature, the `release` object, the `_headers` write and the CLI block)
- Modify: `package.json` (`scripts`)
- Test: `tests/native-build.test.mjs` (new)

**Interfaces:**
- Produces:
  - `export const BUILD_TARGETS = Object.freeze(['web', 'native'])`
  - `export async function build(root?, { target = 'web' } = {}): Promise<Release>`, where a native `Release` has `target: 'native'`, `hostingHeadersSHA256: null` and `runtimeGatedFeatures: []`. A web `Release` is unchanged and has no `target` key.
  - The npm script `build:native` (`node tools/build.mjs --target native`).

- [ ] **Step 1: Write the failing test**

```js
// tests/native-build.test.mjs
// The native target (store builds) leaves out the Cloudflare-only _headers file and
// declares no runtime-gated account features; the web target is unchanged.
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readdir, lstat, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { build, BUILD_TARGETS, PUBLIC_FILES } from '../tools/build.mjs';

async function fixture(t, { headers = true } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'mythseal-native-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = [...PUBLIC_FILES, 'package.json', ...(headers ? ['hosting/_headers'] : [])];
  for (const path of paths) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), path === 'package.json' ? '{"version":"0.5.1"}' : `fixture ${path}`);
  }
  return root;
}

async function outputFiles(root) {
  const entries = await readdir(join(root, 'dist'), { recursive: true });
  const files = await Promise.all(entries.map(async path => (await lstat(join(root, 'dist', path))).isFile() ? path : null));
  return files.filter(Boolean).sort();
}

test('the build targets are web and native', () => {
  assert.deepEqual(BUILD_TARGETS, ['web', 'native']);
});

test('a native build ships the allowlist without _headers and declares no account features', async t => {
  const root = await fixture(t, { headers: false });
  const release = await build(root, { target: 'native' });
  assert.deepEqual(await outputFiles(root), [...PUBLIC_FILES, 'release.json'].sort());
  assert.equal(release.target, 'native');
  assert.equal(release.hostingHeadersSHA256, null);
  assert.deepEqual(release.runtimeGatedFeatures, []);
  assert.equal(release.clientVersion, '0.5.1');
});

test('a web build is unchanged: _headers, no target key, account features still gated', async t => {
  const root = await fixture(t);
  const release = await build(root);
  assert.deepEqual(await outputFiles(root), [...PUBLIC_FILES, '_headers', 'release.json'].sort());
  assert.equal('target' in release, false);
  assert.match(release.hostingHeadersSHA256, /^[0-9a-f]{64}$/);
  assert.deepEqual(release.runtimeGatedFeatures, ['email-login', 'private-journey-backup']);
});

test('an unknown target is refused before anything is written', async t => {
  const root = await fixture(t);
  await assert.rejects(build(root, { target: 'desktop' }), /Unknown build target: desktop/);
  await assert.rejects(lstat(join(root, 'dist')), { code: 'ENOENT' });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/native-build.test.mjs`
Expected: FAIL. The suite errors with `does not provide an export named 'BUILD_TARGETS'`.

- [ ] **Step 3: Implement the target in `tools/build.mjs`**

Replace the `build` function header and its first lines:

```js
export const BUILD_TARGETS = Object.freeze(['web', 'native']);

export async function build(root = fileURLToPath(new URL('../', import.meta.url)), { target = 'web' } = {}) {
  if (!BUILD_TARGETS.includes(target)) throw new Error(`Unknown build target: ${target}`);
  root = resolve(root);
```

Replace `const headers = await readRegular(root, 'hosting/_headers');` with:

```js
  // _headers is Cloudflare's hosting file; a native shell serves the bundle itself.
  const headers = target === 'web' ? await readRegular(root, 'hosting/_headers') : null;
```

In the `release` object, change these three properties (leave the rest as is):

```js
    schemaVersion: 1, name: 'mythseal', ...(target === 'native' ? { target } : {}), clientVersion: version, gitCommit: commit,
```

```js
    hostingHeadersSHA256: headers ? sha256(headers) : null, contractRefs: [],
```

```js
    // Store builds start no account client (platform.mjs); only the website gates these at runtime.
    runtimeGatedFeatures: target === 'web' ? ['email-login', 'private-journey-backup'] : [],
```

Replace `await writeFile(join(output, '_headers'), headers);` with:

```js
  if (headers) await writeFile(join(output, '_headers'), headers);
```

Replace the CLI block at the bottom:

```js
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const flag = process.argv.indexOf('--target');
  const target = flag === -1 ? 'web' : process.argv[flag + 1];
  const release = await build(undefined, { target });
  console.log(`Built Mythseal ${release.clientVersion}${target === 'web' ? '' : ` (${target})`}: ${release.assets.length} public files, manifest ${release.assetsManifestSHA256}`);
}
```

- [ ] **Step 4: Add the npm script**

In `package.json` `scripts`, directly after `"build": "node tools/build.mjs",`, add:

```json
    "build:native": "node tools/build.mjs --target native",
```

- [ ] **Step 5: Run the new and existing build tests**

Run: `node --test tests/native-build.test.mjs tests/hosting.test.mjs`
Expected: PASS, with all tests in both files green.

- [ ] **Step 6: Commit**

```bash
git add tools/build.mjs package.json tests/native-build.test.mjs
git commit -m "Add a native build target for the store apps

The native target writes the same allowlisted dist without Cloudflare's
_headers file and records target: native with no runtime-gated account
features. The web build is unchanged.

Co-Authored-By: The Fable of the Eternal Universe <Yu@Ai-love.cc>"
```

### Task 2: Offline guest shell (no account client in the native app)

**Files:**
- Create: `platform.mjs`
- Modify: `hosting/public-assets.json` (add `"platform.mjs"` directly after `"nav-stack.mjs"`)
- Modify: `app.mjs`, at these points:
  - the import block (after line 21);
  - above `createAccountController` (line 79);
  - the `gameHeaderMarkup` call (line 198);
  - the first line of `requestNavigation(destination)` (line 796);
  - the click dispatcher, right after `const {action,id}=button.dataset;` (line 929).

  The account client never starts on its own. It initialises only when the
  account screen opens (line 811), on its retry action (line 999), or on a
  session broadcast after it has already initialised (line 96). Blocking
  `account*` actions and account navigation therefore covers every way in.
- Create: `tools/native-smoke.mjs`
- Modify: `package.json` (`scripts`: `test:native`)
- Test: `tests/native-shell.test.mjs` (new)

**Interfaces:**
- Consumes: `npm run build:native` from Task 1.
- Produces:
  - `export function isNativeShell(scope = globalThis): boolean` in `platform.mjs`.
  - `const NATIVE_SHELL` in `app.mjs`.
  - `npm run test:native`, which needs `GAME_URL` set to a loopback server for `dist/`.

- [ ] **Step 1: Write the failing test**

```js
// tests/native-shell.test.mjs
// Store builds run inside Capacitor's WebView, where the account client's same-origin
// /api calls cannot work; the game must never start it there. tools/native-smoke.mjs
// (npm run test:native) checks the rendered build and its network use.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { isNativeShell } from '../platform.mjs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('isNativeShell is true only when the Capacitor bridge says so', () => {
  assert.equal(isNativeShell({ Capacitor: { isNativePlatform: () => true } }), true);
  assert.equal(isNativeShell({ Capacitor: { isNativePlatform: () => false } }), false);
  assert.equal(isNativeShell({ Capacitor: { isNativePlatform: () => 'yes' } }), false);
  assert.equal(isNativeShell({ Capacitor: {} }), false);
  assert.equal(isNativeShell({}), false);
  assert.equal(isNativeShell(undefined), false);
  assert.equal(isNativeShell({ Capacitor: { isNativePlatform() { throw new Error('bridge not ready'); } } }), false);
  assert.equal(isNativeShell(), false, 'Node is not a native shell');
});

test('app.mjs never starts or shows the account client in a native shell', () => {
  const app = read('app.mjs');
  assert.match(app, /import \{ isNativeShell \} from '\.\/platform\.mjs';/);
  assert.match(app, /const NATIVE_SHELL = isNativeShell\(\);/);
  assert.match(app, /accountButton:NATIVE_SHELL\?'':accountButtonMarkup\(account\.getState\(\)\)/);
  assert.match(app, /function requestNavigation\(destination\) \{\s*if\(NATIVE_SHELL&&destination==='account'\)return;/);
  assert.match(app, /const \{action,id\}=button\.dataset;\s*if\(NATIVE_SHELL&&action\.startsWith\('account'\)\)return;/);
});

test('platform.mjs is served with the game', () => {
  assert.ok(JSON.parse(read('hosting/public-assets.json')).includes('platform.mjs'));
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/native-shell.test.mjs`
Expected: FAIL with `Cannot find module '.../platform.mjs'`.

- [ ] **Step 3: Create `platform.mjs`**

```js
/** True only inside a Capacitor native shell: its bridge defines window.Capacitor before
 * page scripts run. Browsers, previews and Node have no bridge, so they get false. */
export function isNativeShell(scope = globalThis) {
  try { return scope?.Capacitor?.isNativePlatform?.() === true; }
  catch { return false; }
}
```

Add `"platform.mjs",` to `hosting/public-assets.json` directly after `"nav-stack.mjs",`.

- [ ] **Step 4: Guard the account client in `app.mjs`**

1. After `import { restoreSnapshot, fingerprintProfile } from './cloud-save.mjs';`, add:

```js
import { isNativeShell } from './platform.mjs';
```

2. Directly above `const account = createAccountController({`, add:

```js
// Store builds (Capacitor) are offline guest builds: the account client's same-origin /api
// calls cannot reach mythseal.com from the app, so it is never started or shown there.
const NATIVE_SHELL = isNativeShell();
```

3. In the `gameHeaderMarkup({...})` call (line 198), replace
   `accountButton:accountButtonMarkup(account.getState())` with
   `accountButton:NATIVE_SHELL?'':accountButtonMarkup(account.getState())`.

4. Make the first line inside `function requestNavigation(destination) {`
   (line 796) this guard:

```js
  if(NATIVE_SHELL&&destination==='account')return;
```

5. In the document click dispatcher (line 927), directly after
   `const {action,id}=button.dataset;`, add on the same line:

```js
if(NATIVE_SHELL&&action.startsWith('account'))return;
```

Line numbers are from `origin/main` `e785b27`. If Nuance has moved them, find
the same statements with `grep -n`; the code shapes are what the test pins.

- [ ] **Step 5: Run the static tests**

Run: `node --test tests/native-shell.test.mjs tests/hosting.test.mjs tests/content-registry.test.mjs`
Expected: PASS.

- [ ] **Step 6: Write the browser smoke `tools/native-smoke.mjs`**

```js
/** Offline guest shell acceptance: the native build, with a simulated Capacitor bridge, shows
 * no account entry, never calls /api and never leaves the local origin, even when the account
 * routes are triggered directly. The web build (no bridge) still shows the account entry.
 * Emulated phone over loopback; not evidence from a physical device or a real WebView. */
import assert from 'node:assert/strict';

const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
if (!process.env.GAME_URL) throw Error('Set GAME_URL to a loopback server for dist/, e.g. GAME_URL=http://127.0.0.1:4179.');
const base = new URL(process.env.GAME_URL);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) throw Error('Native smoke requires loopback.');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const { defaultBrowserType, ...device } = engines.devices['Pixel 7'];

async function visit({ native }) {
  const browser = await engines.chromium.launch({ executablePath: chrome });
  try {
    const context = await browser.newContext(device);
    if (native) await context.addInitScript(() => { window.Capacitor = { isNativePlatform: () => true }; });
    const requests = [];
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      requests.push(url);
      return url.origin === base.origin ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    await page.goto(new URL('index.html', base).href);
    await page.locator('.game-lobby').waitFor();
    const accountButtons = await page.locator('[data-action="account-open"]').count();
    if (native) {
      // Every other way into the archive: the actions, a session broadcast and a reload.
      await page.evaluate(() => {
        for (const action of ['account', 'account-open', 'account-retry', 'account-upload', 'account-refresh']) {
          const button = document.createElement('button');
          button.dataset.action = action;
          document.body.append(button);
          button.click();
          button.remove();
        }
        new BroadcastChannel('mythseal-account').postMessage({ type: 'session-changed' });
      });
      await page.reload();
      await page.locator('.game-lobby').waitFor();
      await page.waitForTimeout(500);
    }
    await context.close();
    return { accountButtons, requests };
  } finally {
    await browser.close();
  }
}

const native = await visit({ native: true });
assert.equal(native.accountButtons, 0, 'native shell shows no 旅程閣 button');
assert.deepEqual(native.requests.filter(url => url.pathname.startsWith('/api/')).map(String), [], 'native shell never calls /api');
assert.deepEqual(native.requests.filter(url => url.origin !== base.origin).map(String), [], 'native shell never leaves the bundle');

const web = await visit({ native: false });
assert.equal(web.accountButtons, 1, 'web build still shows the 旅程閣 button');
console.log(`Native smoke passed: ${native.requests.length} local requests, 0 /api, 0 off-origin; web keeps the account entry.`);
```

Add to `package.json` `scripts`, after `"test:shell"`:

```json
    "test:native": "node tools/native-smoke.mjs",
```

- [ ] **Step 7: Run the smoke against a native build**

```bash
npm ci
npm run build:native
python3 -m http.server 4179 --bind 127.0.0.1 --directory dist &
SERVER=$!
GAME_URL=http://127.0.0.1:4179 npm run test:native
kill $SERVER
```

Expected: `Native smoke passed: N local requests, 0 /api, 0 off-origin; web keeps the account entry.`
The web half runs against the same native `dist`. That is fine, because the
account button depends only on the bridge, not the build target.

The off-origin count is the spec §9 network check. Record the request count in
the field notes (Task 8).

- [ ] **Step 8: Run the whole suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add platform.mjs hosting/public-assets.json app.mjs tools/native-smoke.mjs tests/native-shell.test.mjs package.json
git commit -m "Keep the account client out of the native shell

Inside Capacitor the account client's same-origin /api calls cannot reach
mythseal.com, and a broken login is an App Review rejection. platform.mjs
detects the native bridge; app.mjs then never starts the client, hides the
旅程閣 button and refuses account navigation. npm run test:native checks
the build makes no /api or off-origin requests.

Co-Authored-By: The Fable of the Eternal Universe <Yu@Ai-love.cc>"
```

### Task 3: Privacy page and in-app link

Google requires a privacy policy for every app, linked inside the app as well
as in the console. The page wording is a **draft for the owner's approval**
(Task 15 publishes it to the website). Bundling it in the app is fine before
then, because only the owner sees internal builds.

**Files:**
- Create: `privacy.html`
- Modify: `hosting/public-assets.json` (add `"privacy.html"` directly after `"index.html"`)
- Modify: `app.mjs`, inside `rulesModal()`: a footer link
- Test: `tests/privacy-page.test.mjs` (new)

**Interfaces:**
- Produces: the public path `privacy.html`, served at `https://mythseal.com/privacy` through the Worker's `auto-trailing-slash` HTML handling once deployed.

- [ ] **Step 1: Write the failing test**

```js
// tests/privacy-page.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('the privacy page is public, self-contained and covers app and website', () => {
  assert.ok(JSON.parse(read('hosting/public-assets.json')).includes('privacy.html'));
  const page = read('privacy.html');
  assert.match(page, /<html lang="zh-Hant">/);
  assert.match(page, /Cambridge TCG Limited/);
  assert.match(page, /15680297/, 'company number');
  assert.match(page, /ZB838338/, 'ICO registration');
  assert.match(page, /contact@cambridgetcg\.com/);
  for (const heading of ['手機版', 'The iOS and Android apps', '網頁版帳戶', 'Website accounts']) assert.ok(page.includes(heading), heading);
  assert.doesNotMatch(page, /<script/i, 'no scripts (CSP script-src self, and nothing to run)');
  assert.doesNotMatch(page, /\s(?:src|href)="https?:/i, 'no external resources');
  assert.match(page, /href="index\.html"/, 'a way back into the game');
});

test('the rules dialog links the privacy page', () => {
  assert.match(read('app.mjs'), /function rulesModal\(\)[\s\S]*?href="privacy\.html"/);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/privacy-page.test.mjs`
Expected: FAIL with `ENOENT ... privacy.html`.

- [ ] **Step 3: Write `privacy.html` (draft wording)**

```html
<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>私隱政策 · Privacy — 萬象契 Mythseal</title>
  <link rel="canonical" href="https://mythseal.com/privacy">
  <style>
    :root { color-scheme: dark; --ink: #efe6d2; --muted: #b9ad94; --gold: #d9b56a; --ground: #14110d; }
    body { margin: 0; background: var(--ground); color: var(--ink); font: 16px/1.7 system-ui, -apple-system, "PingFang TC", "Noto Sans TC", sans-serif; }
    main { max-width: 42rem; margin: 0 auto; padding: max(1.5rem, env(safe-area-inset-top)) 1rem max(2rem, env(safe-area-inset-bottom)); }
    h1 { color: var(--gold); font-size: 1.6rem; margin: 0 0 .25rem; }
    h2 { color: var(--gold); font-size: 1.15rem; margin: 2rem 0 .5rem; }
    p, li { color: var(--ink); } small, .meta { color: var(--muted); }
    a { color: var(--gold); }
    section + section { border-top: 1px solid #3a3226; margin-top: 2rem; }
  </style>
</head>
<body>
<main>
  <p><a href="index.html">← 返回遊戲 · Back to the game</a></p>
  <h1>私隱政策 · Privacy policy</h1>
  <p class="meta">萬象契 Mythseal · 生效日期 Effective 2026-10-12</p>

  <section>
    <h2>手機版（iOS 及 Android）</h2>
    <p>手機版是離線遊戲。我們不收集、不傳送、也不分享任何個人資料。你的卡牌、牌組與進度只儲存在你的裝置上；刪除遊戲便會一併刪除這些資料。手機版沒有帳戶、廣告、分析或追蹤。</p>
    <h2>網頁版帳戶（mythseal.com）</h2>
    <p>網頁版可選擇以電郵登入，用來備份旅程。只有你主動登入時，我們才會處理：你的電郵地址、一次性驗證碼、登入用的安全 cookie，以及你選擇上傳的旅程備份（卡牌、等級、歷練與對局紀錄）。資料由 Supabase（倫敦）儲存，驗證碼電郵經 Resend 寄出，網站由 Cloudflare 提供。你可隨時在遊戲內刪除雲端備份；如要刪除帳戶，請電郵聯絡我們。</p>
  </section>

  <section>
    <h2>The iOS and Android apps</h2>
    <p>The mobile apps are offline games. We do not collect, transmit or share any personal data. Your cards, decks and progress are stored only on your device, and deleting the app deletes them. The apps have no accounts, advertising, analytics or tracking.</p>
    <h2>Website accounts (mythseal.com)</h2>
    <p>On the website you can optionally sign in with your email to back up your journey. Only when you choose to sign in do we process: your email address, one-time sign-in codes, a secure session cookie, and the journey backup you choose to upload (cards, levels, experience and battle history). Data is stored with Supabase (London), sign-in emails are sent through Resend, and the site is served by Cloudflare. You can delete your cloud backup in the game at any time; to delete your account, email us.</p>
  </section>

  <section>
    <h2>聯絡 · Contact</h2>
    <p>Cambridge TCG Limited（英格蘭及威爾斯公司編號 15680297；ICO 登記 ZB838338）<br>
    Cambridge TCG Limited (company number 15680297, England and Wales; ICO registration ZB838338)<br>
    <a href="mailto:contact@cambridgetcg.com">contact@cambridgetcg.com</a></p>
    <p><small>如本政策有變，我們會更新此頁的生效日期。 If this policy changes, we will update the effective date on this page.</small></p>
  </section>
</main>
</body>
</html>
```

Add `"privacy.html",` to `hosting/public-assets.json` directly after `"index.html",`.

- [ ] **Step 4: Link it from the rules dialog**

In `rulesModal()` in `app.mjs`, the template ends with
`<div class="modal-actions"><button class="primary" ...>...</button></div>`);`.
Insert this immediately before that `<div class="modal-actions">`:

```html
<p class="rules-privacy"><a href="privacy.html">私隱政策 · Privacy</a></p>
```

Then add one rule to `styles.css`, next to the other `.rules-*` rules (find
them with `grep -n "\.rules-" styles.css | head -3`):

```css
.rules-privacy{margin:1rem 0 0;text-align:center;font-size:.85rem}.rules-privacy a{color:inherit}
```

- [ ] **Step 5: Run the tests**

Run: `node --test tests/privacy-page.test.mjs && npm test`
Expected: PASS. The content registry treats `privacy.html` as a public page
entry, so it is not an orphan.

- [ ] **Step 6: Commit**

```bash
git add privacy.html hosting/public-assets.json app.mjs styles.css tests/privacy-page.test.mjs
git commit -m "Add a draft privacy page and link it from the rules dialog

Both stores require a privacy policy, and Google wants it reachable inside
the app. The page covers the offline store apps (no data collected) and
the website's optional email accounts. Wording awaits the owner's approval
before it is deployed to mythseal.com.

Co-Authored-By: The Fable of the Eternal Universe <Yu@Ai-love.cc>"
```

### Task 4: Native projects, icons and version and signing hooks

**Files:**
- Modify: `package.json` and `package-lock.json` (dev dependencies `@capacitor/ios` and `@capacitor/android` at `8.5.2`)
- Create (generated, then committed): `ios/`, `android/`
- Create: `resources/icon.png` (1024×1024), `resources/splash.png` (2732×2732), `tools/render-app-icon.mjs`
- Modify: `android/app/build.gradle` (`defaultConfig`, `signingConfigs`, `buildTypes.release`)
- Modify: `.gitignore`
- Test: `tests/native-projects.test.mjs` (new)

**Interfaces:**
- Consumes: `npm run build:native` (Task 1).
- Produces:
  - Xcode project `ios/App/App.xcodeproj`, scheme `App`. Its `Info.plist` reads `$(MARKETING_VERSION)` and `$(CURRENT_PROJECT_VERSION)`.
  - Gradle properties `mythsealVersionCode` and `mythsealVersionName`.
  - Environment variables:
    - `MYTHSEAL_UPLOAD_KEYSTORE` (the decoded keystore path);
    - the secrets `ANDROID_UPLOAD_KEYSTORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS` and `ANDROID_UPLOAD_KEY_PASSWORD`, read directly from the job environment.

- [ ] **Step 1: Write the failing test**

```js
// tests/native-projects.test.mjs
// Static guards for the committed Capacitor projects: identity, SPM (no CocoaPods),
// version hooks the lanes set, signing only from the environment, no secrets in Git.
import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('both projects carry the configured identity', () => {
  const { appId } = JSON.parse(read('capacitor.config.json'));
  assert.equal(appId, 'com.mythseal.game');
  assert.match(read('android/app/build.gradle'), /applicationId "com\.mythseal\.game"/);
  assert.match(read('ios/App/App.xcodeproj/project.pbxproj'), /PRODUCT_BUNDLE_IDENTIFIER = com\.mythseal\.game;/);
});

test('iOS uses Swift Package Manager and takes its versions from build settings', () => {
  assert.equal(existsSync(new URL('../ios/App/Podfile', import.meta.url)), false, 'no CocoaPods');
  // Capacitor 8's SPM template; if the generated package lives elsewhere, pin that path here.
  assert.ok(existsSync(new URL('../ios/App/CapApp-SPM/Package.swift', import.meta.url)), 'SPM package');
  const plist = read('ios/App/App/Info.plist');
  assert.match(plist, /<key>CFBundleShortVersionString<\/key>\s*<string>\$\(MARKETING_VERSION\)<\/string>/);
  assert.match(plist, /<key>CFBundleVersion<\/key>\s*<string>\$\(CURRENT_PROJECT_VERSION\)<\/string>/);
});

test('Android takes versions from Gradle properties and signs only from the environment', () => {
  const gradle = read('android/app/build.gradle');
  assert.match(gradle, /versionCode Integer\.parseInt\(\(project\.findProperty\('mythsealVersionCode'\) \?: '1'\)\.toString\(\)\)/);
  assert.match(gradle, /versionName \(project\.findProperty\('mythsealVersionName'\) \?: '0\.0\.0'\)\.toString\(\)/);
  for (const name of ['MYTHSEAL_UPLOAD_KEYSTORE', 'ANDROID_UPLOAD_KEYSTORE_PASSWORD', 'ANDROID_UPLOAD_KEY_ALIAS', 'ANDROID_UPLOAD_KEY_PASSWORD']) {
    assert.match(gradle, new RegExp(`System\\.getenv\\('${name}'\\)`), name);
  }
  assert.match(gradle, /if \(System\.getenv\('MYTHSEAL_UPLOAD_KEYSTORE'\)\) \{\s*signingConfig signingConfigs\.upload/);
});

test('no signing material or copied web bundle is tracked', () => {
  const tracked = execFileSync('git', ['ls-files', 'ios', 'android'], { encoding: 'utf8' }).split('\n');
  assert.deepEqual(tracked.filter(path => /\.(p8|p12|jks|keystore|mobileprovision)$/.test(path)), []);
  assert.deepEqual(tracked.filter(path => /(^|\/)public\//.test(path)), [], 'cap sync output stays ignored');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/native-projects.test.mjs`
Expected: FAIL with `ENOENT ... android/app/build.gradle`.

- [ ] **Step 3: Add the platform packages**

```bash
npm install --save-dev --save-exact @capacitor/ios@8.5.2 @capacitor/android@8.5.2
npm run build:native
```

Expected: `package.json` lists both packages at `8.5.2`. Run `npm audit --omit=optional`
and note any new advisory in the field notes; don't silence it.

- [ ] **Step 4: Generate the Android project**

Run: `npx cap add android`
Expected: `✔ Adding native android project in android` and `✔ add in ...`. No
Android SDK is needed for generation.

- [ ] **Step 5: Generate the iOS project (local first, cloud fallback)**

Run: `npx cap add ios`

- If it succeeds, check `ls ios/App` shows `App.xcodeproj` and `CapApp-SPM`, with no `Podfile`.
- If it fails because `xcodebuild` is missing (this Mac has Command Line Tools
  only), generate on a cloud Mac instead:
  1. Create a temporary `.github/workflows/scaffold-ios.yml` with
     `on: push: branches: [mobile/cloud-pipeline]` and one job on `macos-26`.
     The job checks out, sets up Node 22 (pinned SHAs as above), runs `npm ci`,
     `npm run build:native` and `npx cap add ios`, then uploads `ios/` with
     `actions/upload-artifact` pinned as above, using `name: ios-project` and
     `include-hidden-files: true`.
  2. Push the branch and wait for the run:
     `sol access run github -- run watch -R cambridgetcg/mythseal`.
  3. Download the project:
     `sol access run github -- run download <run-id> -R cambridgetcg/mythseal -n ios-project -D ios`.
  4. Delete `scaffold-ios.yml` in the same commit that adds `ios/`.
  5. Record in the field notes that `cap add ios` needs full Xcode.

- [ ] **Step 6: Render the icon and splash sources, then generate the platform icons**

```js
// tools/render-app-icon.mjs
/** Renders the store icon and splash sources from assets/mark.svg (the in-game brand mark)
 * into resources/, for @capacitor/assets. Re-run after the mark changes. */
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const mark = new URL('../assets/mark.svg', import.meta.url).href;
const out = fileURLToPath(new URL('../resources/', import.meta.url));
await mkdir(out, { recursive: true });
const browser = await engines.chromium.launch({ executablePath: chrome });
for (const [name, size, markShare] of [['icon.png', 1024, 0.62], ['splash.png', 2732, 0.22]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:radial-gradient(circle at 50% 40%,#2a2117,#100d09 70%)"><img src="${mark}" style="width:${Math.round(size * markShare)}px;height:auto"></body>`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${out}${name}` });
  await page.close();
}
await browser.close();
console.log(`Rendered resources/icon.png (1024) and resources/splash.png (2732) from ${mark}`);
```

```bash
node tools/render-app-icon.mjs
npx --yes @capacitor/assets@3.0.5 generate --assetPath resources --iconBackgroundColor '#14110d' --splashBackgroundColor '#14110d'
```

Open `resources/icon.png` and check that the mark is centred and fills about
60% of the square. Expected generator output: iOS `AppIcon` and Android
`mipmap-*` (including adaptive) icons written.

- [ ] **Step 7: Wire versions and signing in `android/app/build.gradle`**

In `defaultConfig`, replace the template's `versionCode 1` and `versionName "1.0"` with:

```gradle
        // Set by fastlane from the workflow run (tools/mobile-release.mjs); 1 / 0.0.0 for local builds.
        versionCode Integer.parseInt((project.findProperty('mythsealVersionCode') ?: '1').toString())
        versionName (project.findProperty('mythsealVersionName') ?: '0.0.0').toString()
```

Directly above the `buildTypes {` block, add:

```gradle
    // The Play upload key comes only from the CI environment (decoded to $RUNNER_TEMP);
    // Play App Signing holds the distribution key.
    signingConfigs {
        upload {
            if (System.getenv('MYTHSEAL_UPLOAD_KEYSTORE')) {
                storeFile file(System.getenv('MYTHSEAL_UPLOAD_KEYSTORE'))
                storePassword System.getenv('ANDROID_UPLOAD_KEYSTORE_PASSWORD')
                keyAlias System.getenv('ANDROID_UPLOAD_KEY_ALIAS')
                keyPassword System.getenv('ANDROID_UPLOAD_KEY_PASSWORD')
            }
        }
    }
```

Inside `buildTypes { release {`, add as its first lines:

```gradle
            if (System.getenv('MYTHSEAL_UPLOAD_KEYSTORE')) {
                signingConfig signingConfigs.upload
            }
```

- [ ] **Step 8: Confirm the iOS version hooks and ignore rules**

```bash
grep -A1 -E "CFBundleShortVersionString|CFBundleVersion" ios/App/App/Info.plist
git status --short --ignored ios android | grep -E "public|capacitor.config.json" | head
```

Expected: `$(MARKETING_VERSION)` and `$(CURRENT_PROJECT_VERSION)`, and the
`public/` copies listed as ignored (`!!`). If either plist key holds a literal
value, replace it with the build-setting form shown in the test.

Append to the root `.gitignore`:

```gitignore
# Mobile builds (fastlane outputs; signing material is already ignored above)
build/
*.ipa
*.aab
*.apk
*.dSYM.zip
fastlane/report.xml
fastlane/README.md
fastlane/test_output/
```

- [ ] **Step 9: Run the tests**

Run: `node --test tests/native-projects.test.mjs && npm test`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json ios android resources tools/render-app-icon.mjs .gitignore tests/native-projects.test.mjs
git commit -m "Generate the Capacitor iOS and Android projects

Capacitor 8.5.2 SPM iOS project and Android project with Mythseal's icon
and splash. Versions come from build settings (iOS) and Gradle properties
(Android); the Android upload key is read only from the CI environment.

Co-Authored-By: The Fable of the Eternal Universe <Yu@Ai-love.cc>"
```

### Task 5: Release helper: versions, secret preflight, job summary

**Files:**
- Create: `tools/mobile-release.mjs`
- Test: `tests/mobile-release.test.mjs` (new)

**Interfaces:**
- Consumes: `dist/release.json` from `npm run build:native` (Task 1).
- Produces:
  - `marketingVersion(version: string): string`. It throws `Marketing version must be X.Y.Z for both stores: <v>`.
  - `buildNumber({ runNumber, offset = '0' }): number`. It throws on a bad input.
  - `requiredSecrets(platform: 'ios'|'android', { upload: boolean }): string[]`.
  - `missingSecrets(env, names): string[]`.
  - `summaryMarkdown({ platform, upload, version, number, release }): string`.
  - CLI `node tools/mobile-release.mjs preflight <platform>`: exits 1 and prints `Missing <platform> secrets: A, B`.
  - CLI `node tools/mobile-release.mjs info <platform>`: appends `version=` and `build_number=` to `$GITHUB_OUTPUT`, and the summary to `$GITHUB_STEP_SUMMARY`.

- [ ] **Step 1: Write the failing test**

```js
// tests/mobile-release.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildNumber, marketingVersion, missingSecrets, requiredSecrets, summaryMarkdown } from '../tools/mobile-release.mjs';

test('marketing versions must be plain X.Y.Z for both stores', () => {
  assert.equal(marketingVersion('0.5.1'), '0.5.1');
  assert.equal(marketingVersion('12.0.3'), '12.0.3');
  for (const bad of ['0.6.0-beta', '1.2', 'v1.2.3', '1.2.3.4', '', undefined]) {
    assert.throws(() => marketingVersion(bad), /Marketing version must be X\.Y\.Z for both stores/, String(bad));
  }
});

test('build numbers are deterministic run number plus offset', () => {
  assert.equal(buildNumber({ runNumber: '7' }), 7);
  assert.equal(buildNumber({ runNumber: '7', offset: '100' }), 107);
  assert.equal(buildNumber({ runNumber: '7' }), buildNumber({ runNumber: '7' }), 'a re-run reuses its number');
  assert.equal(buildNumber({ runNumber: '7', offset: '' }), 7, 'unset repo variable means 0');
  for (const offset of ['-1', '1.5', 'ten', '1e3']) assert.throws(() => buildNumber({ runNumber: '7', offset }), /MOBILE_BUILD_OFFSET/, offset);
  for (const runNumber of ['0', '', 'abc', undefined]) assert.throws(() => buildNumber({ runNumber }), /GITHUB_RUN_NUMBER/, String(runNumber));
  assert.throws(() => buildNumber({ runNumber: '2100000000', offset: '1' }), /2100000000/, "Play's versionCode ceiling");
});

test('preflight asks only for what each mode needs, and names blanks', () => {
  assert.deepEqual(requiredSecrets('ios', { upload: false }), ['ASC_KEY_ID', 'ASC_ISSUER_ID', 'ASC_KEY_P8_B64', 'APPLE_TEAM_ID']);
  assert.deepEqual(requiredSecrets('ios', { upload: true }), ['ASC_KEY_ID', 'ASC_ISSUER_ID', 'ASC_KEY_P8_B64', 'APPLE_TEAM_ID']);
  const signing = ['ANDROID_UPLOAD_KEYSTORE_B64', 'ANDROID_UPLOAD_KEYSTORE_PASSWORD', 'ANDROID_UPLOAD_KEY_ALIAS', 'ANDROID_UPLOAD_KEY_PASSWORD'];
  assert.deepEqual(requiredSecrets('android', { upload: false }), signing, 'a dry run needs no Play key');
  assert.deepEqual(requiredSecrets('android', { upload: true }), [...signing, 'PLAY_SERVICE_ACCOUNT_JSON']);
  assert.throws(() => requiredSecrets('web', { upload: false }), /Unknown platform: web/);
  assert.deepEqual(missingSecrets({ A: 'x', B: '   ', C: '' }, ['A', 'B', 'C', 'D']), ['B', 'C', 'D']);
});

test('the summary shows what both platforms must agree on, and nothing secret', () => {
  const text = summaryMarkdown({ platform: 'ios', upload: false, version: '0.5.1', number: 12,
    release: { assetsManifestSHA256: 'a'.repeat(64), gitCommit: 'b'.repeat(40), target: 'native' } });
  for (const part of ['iOS', 'dry run', '0.5.1', '12', 'a'.repeat(64), 'b'.repeat(40)]) assert.ok(text.includes(part), part);
  assert.throws(() => summaryMarkdown({ platform: 'ios', upload: false, version: '0.5.1', number: 1, release: { target: undefined } }), /native build/);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/mobile-release.test.mjs`
Expected: FAIL with `Cannot find module '.../tools/mobile-release.mjs'`.

- [ ] **Step 3: Implement `tools/mobile-release.mjs`**

```js
/** Version numbers, secret preflight and the job summary for .github/workflows/mobile.yml.
 * Prints secret names, never values. */
import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLAY_VERSION_CODE_MAX = 2100000000;
const SECRETS = Object.freeze({
  ios: { always: ['ASC_KEY_ID', 'ASC_ISSUER_ID', 'ASC_KEY_P8_B64', 'APPLE_TEAM_ID'], upload: [] },
  android: { always: ['ANDROID_UPLOAD_KEYSTORE_B64', 'ANDROID_UPLOAD_KEYSTORE_PASSWORD', 'ANDROID_UPLOAD_KEY_ALIAS', 'ANDROID_UPLOAD_KEY_PASSWORD'], upload: ['PLAY_SERVICE_ACCOUNT_JSON'] },
});
const LABELS = { ios: 'iOS', android: 'Android' };

export function marketingVersion(version) {
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Marketing version must be X.Y.Z for both stores: ${version}`);
  return version;
}

export function buildNumber({ runNumber, offset = '0' }) {
  if (!/^[1-9]\d*$/.test(String(runNumber ?? ''))) throw new Error(`GITHUB_RUN_NUMBER must be a positive integer: ${runNumber}`);
  const extra = offset === '' || offset === undefined ? '0' : String(offset);
  if (!/^\d+$/.test(extra)) throw new Error(`MOBILE_BUILD_OFFSET must be a non-negative integer: ${offset}`);
  const number = Number(runNumber) + Number(extra);
  if (number > PLAY_VERSION_CODE_MAX) throw new Error(`Build number ${number} exceeds Play's versionCode ceiling ${PLAY_VERSION_CODE_MAX}`);
  return number;
}

export function requiredSecrets(platform, { upload }) {
  const set = SECRETS[platform];
  if (!set) throw new Error(`Unknown platform: ${platform}`);
  return [...set.always, ...(upload ? set.upload : [])];
}

export const missingSecrets = (env, names) => names.filter(name => !String(env[name] ?? '').trim());

export function summaryMarkdown({ platform, upload, version, number, release }) {
  if (release?.target !== 'native') throw new Error('dist/release.json is not a native build; run npm run build:native');
  return [
    `### ${LABELS[platform]} · ${upload ? 'upload' : 'dry run'}`,
    '',
    '| Field | Value |', '| --- | --- |',
    `| Version | ${version} |`,
    `| Build number | ${number} |`,
    `| Commit | \`${release.gitCommit}\` |`,
    `| Assets manifest | \`${release.assetsManifestSHA256}\` |`,
    '',
    'Both platforms of one run must show the same build number and manifest.',
    '',
  ].join('\n');
}

function main([command, platform]) {
  const upload = process.env.MOBILE_UPLOAD === 'true';
  if (command === 'preflight') {
    const missing = missingSecrets(process.env, requiredSecrets(platform, { upload }));
    if (missing.length) {
      console.error(`Missing ${platform} secrets: ${missing.join(', ')} (set them in the mobile-stores environment)`);
      process.exit(1);
    }
    console.log(`${LABELS[platform]} secrets present for a ${upload ? 'upload' : 'dry'} run.`);
    return;
  }
  if (command === 'info') {
    requiredSecrets(platform, { upload });
    const root = fileURLToPath(new URL('../', import.meta.url));
    const version = marketingVersion(JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version);
    const number = buildNumber({ runNumber: process.env.GITHUB_RUN_NUMBER, offset: process.env.MOBILE_BUILD_OFFSET });
    const release = JSON.parse(readFileSync(resolve(root, 'dist/release.json'), 'utf8'));
    const summary = summaryMarkdown({ platform, upload, version, number, release });
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\nbuild_number=${number}\n`);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
    console.log(summary);
    return;
  }
  throw new Error('Usage: node tools/mobile-release.mjs <preflight|info> <ios|android>');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/mobile-release.test.mjs`
Expected: PASS.

- [ ] **Step 5: Try the CLI by hand**

```bash
npm run build:native
MOBILE_UPLOAD=false node tools/mobile-release.mjs preflight android; echo "exit $?"
GITHUB_RUN_NUMBER=3 node tools/mobile-release.mjs info ios
```

Expected:
- The first command prints `Missing android secrets: ANDROID_UPLOAD_KEYSTORE_B64, ANDROID_UPLOAD_KEYSTORE_PASSWORD, ANDROID_UPLOAD_KEY_ALIAS, ANDROID_UPLOAD_KEY_PASSWORD (...)` and then `exit 1`.
- The second prints the iOS dry-run table with build number `3`.

- [ ] **Step 6: Commit**

```bash
git add tools/mobile-release.mjs tests/mobile-release.test.mjs
git commit -m "Add the mobile release helper (versions, preflight, summary)

Build numbers are run number plus MOBILE_BUILD_OFFSET, so a re-run reuses
its number and a store rejects a duplicate upload. Bad versions, offsets
and missing secrets fail before any build minute, naming secrets only.

Co-Authored-By: The Fable of the Eternal Universe <Yu@Ai-love.cc>"
```

### Task 6: fastlane lanes

**Files:**
- Create: `Gemfile`, `Gemfile.lock`, `fastlane/Fastfile`
- Test: `bundle exec fastlane lanes` (parse and listing) plus `tests/fastlane.test.mjs` (static, new)

**Interfaces:**
- Consumes:
  - From the workflow environment: `MOBILE_UPLOAD`, `MOBILE_VERSION`, `MOBILE_BUILD_NUMBER`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_PATH`, `APPLE_TEAM_ID`, `PLAY_SERVICE_ACCOUNT_JSON`, `PLAY_RELEASE_STATUS`.
  - Gradle (not the lanes) reads `MYTHSEAL_UPLOAD_KEYSTORE` and the `ANDROID_UPLOAD_*` passwords.
  - From Task 4: the Gradle properties.
- Produces:
  - Lanes `ios register_bundle_id`, `ios beta` and `android internal`.
  - Outputs `build/ios/Mythseal.ipa` and the AAB at `lane_context[SharedValues::GRADLE_AAB_OUTPUT_PATH]`.

- [ ] **Step 1: Install a modern Ruby locally (for the lockfile and lane listing only)**

```bash
brew install ruby@3.3
export PATH="$(brew --prefix ruby@3.3)/bin:$PATH"
ruby -v
```

Expected: `ruby 3.3.x`.

- [ ] **Step 2: Write the failing static test**

```js
// tests/fastlane.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const fastfile = readFileSync(new URL('../fastlane/Fastfile', import.meta.url), 'utf8');

test('lanes read the app identity from capacitor.config.json, not literals', () => {
  assert.match(fastfile, /capacitor\.config\.json/);
  assert.doesNotMatch(fastfile, /com\.mythseal\.game/);
});

test('uploads happen only when MOBILE_UPLOAD is true, and only to internal testing', () => {
  assert.match(fastfile, /ENV\["MOBILE_UPLOAD"\] == "true"/);
  assert.match(fastfile, /upload_to_testflight\([^)]*distribute_external: false/s);
  assert.match(fastfile, /upload_to_play_store\([^)]*track: "internal"/s);
  assert.doesNotMatch(fastfile, /track: "(?:alpha|beta|production)"/);
  assert.match(fastfile, /release_status: ENV\.fetch\("PLAY_RELEASE_STATUS", "draft"\)/);
});

test('Gemfile pins fastlane exactly', () => {
  assert.match(readFileSync(new URL('../Gemfile', import.meta.url), 'utf8'), /gem "fastlane", "2\.240\.1"/);
});
```

Run: `node --test tests/fastlane.test.mjs`
Expected: FAIL with `ENOENT ... fastlane/Fastfile`.

- [ ] **Step 3: Write the `Gemfile` and lock it for both runners**

```ruby
# Build tooling for .github/workflows/mobile.yml; not part of the game runtime.
source "https://rubygems.org"

gem "fastlane", "2.240.1"
```

```bash
bundle lock --add-platform arm64-darwin --add-platform x86_64-linux
bundle install
```

Expected: `Gemfile.lock` created, listing `fastlane (2.240.1)` with both platforms.

- [ ] **Step 4: Write `fastlane/Fastfile`**

```ruby
# Lanes for .github/workflows/mobile.yml. The app identity comes from capacitor.config.json
# and everything else from the environment, so another Capacitor app can reuse this file.
# Uploads go only to TestFlight internal testing and Play internal testing; reviewed tracks
# are promoted by hand in the consoles (docs/MOBILE-PUBLISHING-RUNBOOK.md).
require "json"

CAPACITOR = JSON.parse(File.read(File.expand_path("../capacitor.config.json", __dir__)))
APP_ID = CAPACITOR.fetch("appId")
APP_NAME = CAPACITOR.fetch("appName")

def upload?
  ENV["MOBILE_UPLOAD"] == "true"
end

platform :ios do
  def asc_key
    app_store_connect_api_key(
      key_id: ENV.fetch("ASC_KEY_ID"),
      issuer_id: ENV.fetch("ASC_ISSUER_ID"),
      key_filepath: ENV.fetch("ASC_KEY_PATH")
    )
  end

  # xcodebuild signs through Apple's cloud-managed certificates with the same API key.
  def signing_flags
    "-allowProvisioningUpdates -authenticationKeyPath #{ENV.fetch('ASC_KEY_PATH')} " \
      "-authenticationKeyID #{ENV.fetch('ASC_KEY_ID')} -authenticationKeyIssuerID #{ENV.fetch('ASC_ISSUER_ID')}"
  end

  desc "Register the bundle ID with App Store Connect (once, before the app record is created)"
  lane :register_bundle_id do
    asc_key
    if Spaceship::ConnectAPI::BundleId.find(APP_ID)
      UI.message("#{APP_ID} is already registered")
    else
      Spaceship::ConnectAPI::BundleId.create(name: APP_NAME, identifier: APP_ID, platform: Spaceship::ConnectAPI::BundleIdPlatform::IOS)
      UI.success("Registered #{APP_ID}")
    end
  end

  desc "Archive and sign; with MOBILE_UPLOAD=true, upload to TestFlight internal testing"
  lane :beta do
    key = asc_key
    build_app(
      project: "ios/App/App.xcodeproj",
      scheme: "App",
      configuration: "Release",
      export_method: "app-store",
      output_directory: "build/ios",
      output_name: "#{APP_NAME}.ipa",
      xcargs: "#{signing_flags} DEVELOPMENT_TEAM=#{ENV.fetch('APPLE_TEAM_ID')} CODE_SIGN_STYLE=Automatic " \
              "MARKETING_VERSION=#{ENV.fetch('MOBILE_VERSION')} CURRENT_PROJECT_VERSION=#{ENV.fetch('MOBILE_BUILD_NUMBER')}",
      export_xcargs: signing_flags,
      export_options: { signingStyle: "automatic", teamID: ENV.fetch("APPLE_TEAM_ID") }
    )
    next UI.message("Dry run: signed #{APP_NAME}.ipa kept as an artifact, nothing uploaded") unless upload?

    upload_to_testflight(
      api_key: key,
      distribute_external: false,
      skip_waiting_for_build_processing: true
    )
  end
end

platform :android do
  desc "Build the signed AAB; with MOBILE_UPLOAD=true, upload to Play internal testing"
  lane :internal do
    gradle(
      project_dir: "android",
      task: "bundle",
      build_type: "Release",
      properties: {
        "mythsealVersionCode" => ENV.fetch("MOBILE_BUILD_NUMBER"),
        "mythsealVersionName" => ENV.fetch("MOBILE_VERSION")
      }
    )
    next UI.message("Dry run: signed AAB kept as an artifact, nothing uploaded") unless upload?

    upload_to_play_store(
      package_name: APP_ID,
      track: "internal",
      aab: lane_context[SharedValues::GRADLE_AAB_OUTPUT_PATH],
      json_key_data: ENV.fetch("PLAY_SERVICE_ACCOUNT_JSON"),
      release_status: ENV.fetch("PLAY_RELEASE_STATUS", "draft"),
      skip_upload_metadata: true,
      skip_upload_changelogs: true,
      skip_upload_images: true,
      skip_upload_screenshots: true
    )
  end
end
```

- [ ] **Step 5: Verify that the Fastfile parses and lists the three lanes**

Run: `bundle exec fastlane lanes`
Expected: the output lists `ios register_bundle_id`, `ios beta` and `android internal`, with no Ruby errors.

Run: `node --test tests/fastlane.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add Gemfile Gemfile.lock fastlane/Fastfile tests/fastlane.test.mjs
git commit -m "Add fastlane lanes for TestFlight and Play internal testing

ios beta archives with cloud-managed signing through the App Store Connect
key; android internal builds the upload-signed AAB. Both upload only when
MOBILE_UPLOAD is true and only to internal testing. ios register_bundle_id
registers the bundle ID through the API.

Co-Authored-By: The Fable of the Eternal Universe <Yu@Ai-love.cc>"
```

### Task 7: The `mobile.yml` workflow

**Files:**
- Create: `.github/workflows/mobile.yml`
- Test: `tests/mobile-workflow.test.mjs` (new), plus `actionlint` locally

**Interfaces:**
- Consumes:
  - Tasks 1 and 4–6: `npm run build:native`, `npx cap sync`, `tools/mobile-release.mjs`, the lanes and the Gradle environment names.
  - The secrets and variables listed in Global Constraints.
- Produces:
  - The jobs `ios` and `android`.
  - The artifacts `mythseal-ios-<n>` and `mythseal-android-<n>` (dry runs, kept 3 days).

- [ ] **Step 1: Write the failing static test**

```js
// tests/mobile-workflow.test.mjs
// Text guards for the mobile workflow's safety properties (the repo has no YAML parser).
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/mobile.yml', import.meta.url), 'utf8');

test('runs only on manual dispatch (dry by default) or mobile-v* tags', () => {
  assert.match(workflow, /on:\n  workflow_dispatch:\n    inputs:\n      upload:\n[\s\S]*?type: boolean\n        default: false\n  push:\n    tags: \['mobile-v\*'\]\n/);
  assert.doesNotMatch(workflow, /\n  pull_request:|\n  schedule:/);
});

test('read-only token, never cancels an upload mid-flight, secrets only from mobile-stores', () => {
  assert.match(workflow, /\npermissions:\n  contents: read\n/);
  assert.match(workflow, /concurrency:\n  group: mobile-\$\{\{ github\.ref \}\}\n  cancel-in-progress: false\n/);
  assert.equal(workflow.match(/environment: mobile-stores/g)?.length, 2);
});

test('every action is pinned to a full commit SHA', () => {
  const uses = [...workflow.matchAll(/uses: ([^\s]+)/g)].map(match => match[1]);
  assert.ok(uses.length >= 8);
  for (const use of uses) assert.match(use, /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/, use);
});

test('runners, timeouts and preflight-before-build', () => {
  assert.match(workflow, /ios:\n    runs-on: macos-26\n    timeout-minutes: 45\n/);
  assert.match(workflow, /android:\n    runs-on: ubuntu-24\.04\n    timeout-minutes: 30\n/);
  for (const platform of ['ios', 'android']) {
    const preflight = workflow.indexOf(`node tools/mobile-release.mjs preflight ${platform}`);
    const install = workflow.indexOf('npm ci', preflight);
    assert.ok(preflight > 0 && install > preflight, `${platform}: preflight runs before npm ci`);
  }
});

test('decoded keys are removed even when a step fails', () => {
  assert.match(workflow, /- name: Remove the App Store Connect key\n        if: always\(\)\n        run: rm -f "\$RUNNER_TEMP"\/AuthKey_\*\.p8/);
  assert.match(workflow, /- name: Remove the upload keystore\n        if: always\(\)\n        run: rm -f "\$RUNNER_TEMP\/upload\.keystore"/);
  assert.doesNotMatch(workflow, /set -x|echo "\$\{?(?:ASC_KEY_P8_B64|ANDROID_UPLOAD|PLAY_SERVICE)/);
});
```

Run: `node --test tests/mobile-workflow.test.mjs`
Expected: FAIL with `ENOENT ... mobile.yml`.

- [ ] **Step 2: Write `.github/workflows/mobile.yml`**

```yaml
name: Mobile builds

# Manual runs are dry by default (build and sign, keep artifacts, upload nothing).
# A mobile-v* tag uploads. Uploads go only to TestFlight and Play internal testing;
# reviewed tracks are promoted by hand (docs/MOBILE-PUBLISHING-RUNBOOK.md).
on:
  workflow_dispatch:
    inputs:
      upload:
        description: Upload to TestFlight internal and Play internal testing
        type: boolean
        default: false
  push:
    tags: ['mobile-v*']

permissions:
  contents: read

concurrency:
  group: mobile-${{ github.ref }}
  cancel-in-progress: false

env:
  MOBILE_UPLOAD: ${{ github.event_name == 'push' || inputs.upload == true }}
  MOBILE_BUILD_OFFSET: ${{ vars.MOBILE_BUILD_OFFSET }}

jobs:
  ios:
    runs-on: macos-26
    timeout-minutes: 45
    environment: mobile-stores
    env:
      ASC_KEY_ID: ${{ secrets.ASC_KEY_ID }}
      ASC_ISSUER_ID: ${{ secrets.ASC_ISSUER_ID }}
      ASC_KEY_P8_B64: ${{ secrets.ASC_KEY_P8_B64 }}
      APPLE_TEAM_ID: ${{ vars.APPLE_TEAM_ID }}
    steps:
      - name: Check out source
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7
        with:
          persist-credentials: false
      - name: Set up Node
        uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7
        with:
          node-version: '22'
          package-manager-cache: false
      - name: Check the signing secrets
        run: node tools/mobile-release.mjs preflight ios
      - name: Check Xcode meets Apple's upload minimum (26)
        run: |
          xcodebuild -version
          major=$(xcodebuild -version | head -1 | sed -E 's/^Xcode ([0-9]+).*/\1/')
          test "$major" -ge 26
      - name: Set up Ruby and fastlane
        uses: ruby/setup-ruby@762794c140bbeda0f1224786aa33b4b46783a6c1 # v1.326.0
        with:
          ruby-version: '3.3'
          bundler-cache: true
      - name: Install pinned tooling
        run: npm ci
      - name: Run deterministic suites
        run: npm test
      - name: Build the offline guest bundle
        run: npm run build:native
      - name: Copy it into the iOS project
        run: npx cap sync ios
      - name: Version and summary
        id: release
        run: node tools/mobile-release.mjs info ios
      - name: Decode the App Store Connect key
        run: |
          key="$RUNNER_TEMP/AuthKey_${ASC_KEY_ID}.p8"
          printf '%s' "$ASC_KEY_P8_B64" | base64 --decode > "$key"
          chmod 600 "$key"
          echo "ASC_KEY_PATH=$key" >> "$GITHUB_ENV"
      - name: Build, sign and (if uploading) send to TestFlight
        run: bundle exec fastlane ios beta
        env:
          MOBILE_VERSION: ${{ steps.release.outputs.version }}
          MOBILE_BUILD_NUMBER: ${{ steps.release.outputs.build_number }}
      - name: Keep the signed app (dry run)
        if: env.MOBILE_UPLOAD != 'true'
        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        with:
          name: mythseal-ios-${{ steps.release.outputs.build_number }}
          path: build/ios/*.ipa
          retention-days: 3
          if-no-files-found: error
      - name: Remove the App Store Connect key
        if: always()
        run: rm -f "$RUNNER_TEMP"/AuthKey_*.p8

  android:
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    environment: mobile-stores
    env:
      PLAY_SERVICE_ACCOUNT_JSON: ${{ secrets.PLAY_SERVICE_ACCOUNT_JSON }}
      ANDROID_UPLOAD_KEYSTORE_B64: ${{ secrets.ANDROID_UPLOAD_KEYSTORE_B64 }}
      ANDROID_UPLOAD_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_UPLOAD_KEYSTORE_PASSWORD }}
      ANDROID_UPLOAD_KEY_ALIAS: ${{ secrets.ANDROID_UPLOAD_KEY_ALIAS }}
      ANDROID_UPLOAD_KEY_PASSWORD: ${{ secrets.ANDROID_UPLOAD_KEY_PASSWORD }}
      PLAY_RELEASE_STATUS: ${{ vars.PLAY_RELEASE_STATUS || 'draft' }}
    steps:
      - name: Check out source
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7
        with:
          persist-credentials: false
      - name: Set up Node
        uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7
        with:
          node-version: '22'
          package-manager-cache: false
      - name: Check the signing secrets
        run: node tools/mobile-release.mjs preflight android
      - name: Set up Java 21
        uses: actions/setup-java@de7274f081f381c8f8158605e0321c36c376e2e6 # v6.0.1
        with:
          distribution: temurin
          java-version: '21'
      - name: Set up Ruby and fastlane
        uses: ruby/setup-ruby@762794c140bbeda0f1224786aa33b4b46783a6c1 # v1.326.0
        with:
          ruby-version: '3.3'
          bundler-cache: true
      - name: Install pinned tooling
        run: npm ci
      - name: Run deterministic suites
        run: npm test
      - name: Build the offline guest bundle
        run: npm run build:native
      - name: Copy it into the Android project
        run: npx cap sync android
      - name: Version and summary
        id: release
        run: node tools/mobile-release.mjs info android
      - name: Decode the upload keystore
        run: |
          printf '%s' "$ANDROID_UPLOAD_KEYSTORE_B64" | base64 --decode > "$RUNNER_TEMP/upload.keystore"
          chmod 600 "$RUNNER_TEMP/upload.keystore"
          # Only the path goes to GITHUB_ENV; Gradle reads the passwords from the job env.
          echo "MYTHSEAL_UPLOAD_KEYSTORE=$RUNNER_TEMP/upload.keystore" >> "$GITHUB_ENV"
      - name: Build, sign and (if uploading) send to Play internal testing
        run: bundle exec fastlane android internal
        env:
          MOBILE_VERSION: ${{ steps.release.outputs.version }}
          MOBILE_BUILD_NUMBER: ${{ steps.release.outputs.build_number }}
      - name: Keep the signed bundle (dry run)
        if: env.MOBILE_UPLOAD != 'true'
        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        with:
          name: mythseal-android-${{ steps.release.outputs.build_number }}
          path: android/app/build/outputs/bundle/release/*.aab
          retention-days: 3
          if-no-files-found: error
      - name: Remove the upload keystore
        if: always()
        run: rm -f "$RUNNER_TEMP/upload.keystore"
```

GitHub masks secret values in logs. No secret value is copied into
`$GITHUB_ENV`. The test forbids `set -x` and echoing secret variables.

- [ ] **Step 3: Run the static test and actionlint**

```bash
node --test tests/mobile-workflow.test.mjs
brew install actionlint
actionlint .github/workflows/mobile.yml
```

Expected: the tests PASS, and `actionlint` prints nothing (exit 0). If
`actionlint` doesn't yet know the `macos-26` label, add
`.github/actionlint.yaml` with `self-hosted-runner: { labels: [macos-26] }`
and note it in the field notes.

- [ ] **Step 4: Run the whole suite and commit**

```bash
npm test
git add .github/workflows/mobile.yml tests/mobile-workflow.test.mjs
git commit -m "Add the mobile workflow (iOS on macos-26, Android on ubuntu-24.04)

Manual runs are dry by default; mobile-v* tags upload to TestFlight and Play
internal testing. Secrets come only from the mobile-stores environment and
are preflighted before any build; decoded keys are removed in always()
steps; actions are SHA-pinned.

Co-Authored-By: The Fable of the Eternal Universe <Yu@Ai-love.cc>"
```

### Task 8: Runbook, field notes and the docs index

**Files:**
- Create: `docs/MOBILE-PUBLISHING-RUNBOOK.md`, `docs/MOBILE-FIELD-NOTES.md`
- Modify: `docs/README.md` (two rows in "Architecture and future designs", after the mobile cloud pipeline design row)
- Modify: `docs/MOBILE-RELEASE.md` (one dated paragraph at the end of "Current build and proposed route")
- Test: `node --test tests/content-registry.test.mjs` (the docs index stays valid), plus a reread

- [ ] **Step 1: Write `docs/MOBILE-PUBLISHING-RUNBOOK.md`**

```markdown
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
```

- [ ] **Step 2: Write `docs/MOBILE-FIELD-NOTES.md`**

```markdown
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
```

- [ ] **Step 3: Index both documents and note the change in `docs/MOBILE-RELEASE.md`**

In `docs/README.md`, after the "Mobile cloud pipeline design" row, add:

```markdown
| [Mobile publishing runbook](MOBILE-PUBLISHING-RUNBOOK.md) | The standard publishing and review flow for any app, with Mythseal as the worked example | `current` for the pipeline; review sections fill in as Stage 2 runs |
| [Mobile field notes](MOBILE-FIELD-NOTES.md) | Dated evidence for every mobile run, console step and review, each with a "pay attention to" lesson | `record`, dated per entry |
```

At the end of the "Current build and proposed route" section of
`docs/MOBILE-RELEASE.md`, add:

```markdown
**2026-10-12:** committed Capacitor `ios/` and `android/` projects and a cloud
pipeline (`.github/workflows/mobile.yml`) now exist for an **offline guest
build** (no accounts). They are for TestFlight and Play testing practice; see
the [runbook](MOBILE-PUBLISHING-RUNBOOK.md). M5.1 and M5.2 acceptance is still
outstanding.
```

- [ ] **Step 4: Run the suite and commit**

```bash
npm test
git add docs/MOBILE-PUBLISHING-RUNBOOK.md docs/MOBILE-FIELD-NOTES.md docs/README.md docs/MOBILE-RELEASE.md
git commit -m "Add the mobile publishing runbook and field notes

Co-Authored-By: The Fable of the Eternal Universe <Yu@Ai-love.cc>"
```

### Task 9: Open the PR and merge (owner gate)

- [ ] **Step 1: Run the full verification again**

```bash
npm test
npm run build:native
python3 -m http.server 4179 --bind 127.0.0.1 --directory dist & SERVER=$!
GAME_URL=http://127.0.0.1:4179 npm run test:native; kill $SERVER
npm run build
```

Expected: everything passes. The last command leaves `dist/` as the web build
again; `dist/` is ignored by Git either way.

- [ ] **Step 2: Rebase on the newest `main` (Nuance may have merged), then push**

```bash
TOKEN=$(gh auth token -u cambridgetcg)
H='!f() { echo username=cambridgetcg; echo password='"$TOKEN"'; }; f'
git -c credential.helper= -c credential.helper="$H" fetch origin
git rebase origin/main
npm test
git -c credential.helper= -c credential.helper="$H" push -u origin mobile/cloud-pipeline
```

- [ ] **Step 3: Open the PR**

Run `sol access run github -- pr create -R cambridgetcg/mythseal --base main --head mobile/cloud-pipeline`
with title "Mobile cloud pipeline: offline guest build, Capacitor projects, fastlane, workflow". The body must say:

- what's built, and that nothing is signed or uploaded yet;
- the announced edits to shared files (`app.mjs`: the account guard and the privacy link; `tools/build.mjs`; `hosting/public-assets.json`; `styles.css`; `package.json`), addressed to Nuance;
- that the privacy wording is a draft awaiting the owner;
- the checks actually run.

End the body with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

- [ ] **Step 4: Wait for CI, then the owner's merge**

Run `sol access run github -- pr checks <n> -R cambridgetcg/mythseal --watch`.
Expected: "Prototype checks" green.

The owner merges, or tells Ai to merge. The workflow must be on `main` for the
environment's branch rule and for dispatch.

---

## Stage 1: accounts and the first builds (with the owner)

### Task 10: GitHub environment, variables and the Android upload key (Ai)

- [ ] **Step 1: Create the environment with its branch and tag policy**

```bash
sol access run github -- api -X PUT repos/cambridgetcg/mythseal/environments/mobile-stores \
  --input - <<'EOF'
{"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}
EOF
sol access run github -- api -X POST repos/cambridgetcg/mythseal/environments/mobile-stores/deployment-branch-policies -f name=main -f type=branch
sol access run github -- api -X POST repos/cambridgetcg/mythseal/environments/mobile-stores/deployment-branch-policies -f name='mobile-v*' -f type=tag
sol access run github -- api repos/cambridgetcg/mythseal/environments/mobile-stores/deployment-branch-policies --jq '.branch_policies[] | "\(.type) \(.name)"'
```

Expected: `branch main` and `tag mobile-v*`.

- [ ] **Step 2: Set the variables**

```bash
sol access run github -- variable set PLAY_RELEASE_STATUS --env mobile-stores -R cambridgetcg/mythseal --body draft
sol access run github -- variable set MOBILE_BUILD_OFFSET -R cambridgetcg/mythseal --body 0
```

(`APPLE_TEAM_ID` is set in Task 11 once the owner reads it from App Store Connect.)

- [ ] **Step 3: Generate the upload keystore in a private temp dir, store it, delete it**

```bash
umask 077; K=$(mktemp -d)
PASS=$(openssl rand -base64 30 | tr -d '/+=' | cut -c1-32)
keytool -genkeypair -v -keystore "$K/upload.keystore" -storetype PKCS12 -alias mythseal-upload \
  -keyalg RSA -keysize 4096 -validity 10000 -storepass "$PASS" -keypass "$PASS" \
  -dname "CN=Mythseal upload, O=<Play publishing entity, to be confirmed>, C=GB"
base64 -i "$K/upload.keystore" | tr -d '\n' > "$K/upload.b64"
security add-generic-password -U -a cambridgetcg -s mythseal-android-upload-keystore -w "$(cat "$K/upload.b64")"
security add-generic-password -U -a cambridgetcg -s mythseal-android-upload-keystore-password -w "$PASS"
for pair in "ANDROID_UPLOAD_KEYSTORE_B64:$(cat "$K/upload.b64")" "ANDROID_UPLOAD_KEYSTORE_PASSWORD:$PASS" "ANDROID_UPLOAD_KEY_ALIAS:mythseal-upload" "ANDROID_UPLOAD_KEY_PASSWORD:$PASS"; do
  printf '%s' "${pair#*:}" | sol access run github -- secret set "${pair%%:*}" --env mobile-stores -R cambridgetcg/mythseal
done
keytool -list -keystore "$K/upload.keystore" -storepass "$PASS" | grep -E "Certificate fingerprint|mythseal-upload"
rm -rf "$K"; unset PASS
```

(Amended 2026-10-20: fill in the `O=` entity once the owner confirms who holds
the Play Console account. Note too that `security add-generic-password -w
"$(…)"` puts the secret in the process list while it runs; feeding
`add-generic-password` to `security -i` on stdin avoids that.)

Expected: one `PrivateKeyEntry` named `mythseal-upload`. Record the SHA-256
certificate fingerprint (public) in `docs/CONNECTIONS.md`, never the password.
`sol access run github -- secret list --env mobile-stores -R cambridgetcg/mythseal`
shows the four `ANDROID_*` names.

- [ ] **Step 4: Field-notes entry, then commit the CONNECTIONS update**

### Task 11: App Store Connect setup (owner's hands, Ai alongside)

- [ ] **Step 1: The owner creates the API key.** In App Store Connect, go to
  Users and Access → Integrations → Team Keys → "+", name it `mythseal-ci`,
  role **Admin**, and download the `.p8` **once** into `~/Downloads`. The Admin
  role is used because API keys can't carry App Manager's per-user
  "cloud-managed distribution certificate" permission. The evidence is Apple
  developer forum thread 776036; record it in the field notes. The owner reads
  out the Key ID, the Issuer ID and the Team ID (Membership details).
- [ ] **Step 2: Ai stores it and registers the bundle ID**

```bash
P8=~/Downloads/AuthKey_<KEYID>.p8
security add-generic-password -U -a cambridgetcg -s mythseal-asc-api-key -w "$(base64 -i "$P8" | tr -d '\n')"
base64 -i "$P8" | tr -d '\n' | sol access run github -- secret set ASC_KEY_P8_B64 --env mobile-stores -R cambridgetcg/mythseal
printf '%s' '<KEYID>' | sol access run github -- secret set ASC_KEY_ID --env mobile-stores -R cambridgetcg/mythseal
printf '%s' '<ISSUERID>' | sol access run github -- secret set ASC_ISSUER_ID --env mobile-stores -R cambridgetcg/mythseal
sol access run github -- variable set APPLE_TEAM_ID --env mobile-stores -R cambridgetcg/mythseal --body '<TEAMID>'
export PATH="$(brew --prefix ruby@3.3)/bin:$PATH"
ASC_KEY_ID='<KEYID>' ASC_ISSUER_ID='<ISSUERID>' ASC_KEY_PATH="$P8" bundle exec fastlane ios register_bundle_id
rm -f "$P8"
```

`<KEYID>`, `<ISSUERID>` and `<TEAMID>` are the three values the owner reads
out in Step 1. They are typed at run time, not stored in the plan.

Expected: `Registered com.mythseal.game` (or "already registered").

- [ ] **Step 3: The owner creates the app record.** Apps → "+" → New App: iOS,
  name `Mythseal` (if taken: `萬象契 Mythseal`), primary language Traditional
  Chinese, bundle ID `com.mythseal.game`, SKU `mythseal-ios`, full access.
- [ ] **Step 4: The owner adds internal testing.** TestFlight → Internal
  Testing → "+" group `Owner` → add the owner's Apple ID.
- [ ] **Step 5: Field-notes entry** (time taken, every field asked, and
  whether the name was available).

### Task 12: Google Play Console setup (owner's hands, Ai alongside)

- [ ] **Step 1: The owner creates the app.** Create app: name `Mythseal`,
  default language Chinese (Traditional) – zh-TW, App, Free, accept the
  declarations. Confirm under Test and release → App integrity that Play App
  Signing is on.
- [ ] **Step 2: The owner creates the service account.** In Google Cloud
  console (a project named `mythseal-play`): IAM → Service accounts → create
  `mythseal-ci`, then Keys → Add key → JSON. Download it **once**.
- [ ] **Step 3: Ai stores the JSON and the owner invites the account**

```bash
J=~/Downloads/<the-downloaded-file>.json
python3 -I -c 'import json,sys;d=json.load(open(sys.argv[1]));print(d["client_email"])' "$J"
security add-generic-password -U -a cambridgetcg -s mythseal-play-service-account -w "$(base64 -i "$J" | tr -d '\n')"
sol access run github -- secret set PLAY_SERVICE_ACCOUNT_JSON --env mobile-stores -R cambridgetcg/mythseal < "$J"
rm -f "$J"
```

The owner then goes to Play Console → Users and permissions → Invite new
users, enters the printed `client_email`, and under App permissions → Mythseal
grants "Release apps to testing tracks" and "View app information (read only)".
Nothing else.

- [ ] **Step 4: The owner adds internal testers.** Test and release → Testing
  → Internal testing → Testers → create the list `Owner` with the owner's
  Google account.
- [ ] **Step 5: Field-notes entry.**

### Task 13: First dry run and the first Play upload

- [ ] **Step 1: Dispatch a dry run**

```bash
sol access run github -- workflow run mobile.yml -R cambridgetcg/mythseal --ref main -f upload=false
sol access run github -- run watch -R cambridgetcg/mythseal
```

Expected: both jobs green; summaries show the same build number and manifest;
artifacts `mythseal-ios-<n>` and `mythseal-android-<n>`.

If either job fails, read the log, fix it in a new branch and PR, and record the
failure and its fix in the field notes. Never re-run an upload blindly.

- [ ] **Step 2: Download the AAB for the manual first upload**

`sol access run github -- run download <run-id> -R cambridgetcg/mythseal -n mythseal-android-<n> -D ~/Downloads/mythseal-aab`

- [ ] **Step 3: The owner uploads and rolls out the first internal release.**
  Internal testing → Create new release → upload the `.aab` → release name
  `0.5.1 (<n>)` → Save → Review release → Start rollout. Note every warning
  Play shows.
- [ ] **Step 4: Switch the lane to completed releases**

`sol access run github -- variable set PLAY_RELEASE_STATUS --env mobile-stores -R cambridgetcg/mythseal --body completed`

- [ ] **Step 5: Field-notes entry.** Record the step timings from
  `sol access run github -- run view <run-id> -R cambridgetcg/mythseal --json jobs --jq '.jobs[] | {name, startedAt, completedAt, steps: [.steps[] | {name, startedAt, completedAt}]}'`,
  the macOS and Linux minutes, and every Play warning.

### Task 14: First upload run and Stage 1 acceptance

- [ ] **Step 1: Upload run.** Dispatch it with
  `sol access run github -- workflow run mobile.yml -R cambridgetcg/mythseal --ref main -f upload=true`,
  then watch it. Expected: both jobs green; iOS logs show the TestFlight upload
  accepted; Android shows the upload to track `internal` with status `completed`.
- [ ] **Step 2: Apple processing.** Watch TestFlight until the build shows
  "Ready to Test" and record the processing time. Answer the export-compliance
  question: the game uses only standard HTTPS and no custom encryption, so
  answer "None of the algorithms mentioned above". Record the exact wording
  Apple shows.
- [ ] **Step 3: The owner installs on both phones.** iPhone: TestFlight app →
  Mythseal → Install. Android: the internal-testing opt-in link from Play
  Console → Install. On each, open the app, play to the lobby, switch on
  airplane mode, force-quit, and reopen. Expected: it opens to the lobby with
  progress kept.
- [ ] **Step 4: Field-notes entry and runbook "Costs and timings" first pass;
  commit both** in a small docs PR. That PR changes no workflow trigger, so it
  starts no mobile build.

---

## Stage 2: reviewed testing (with the owner)

### Task 15: Owner approves the privacy wording, then publish it

- [ ] **Step 1: Show the owner `privacy.html` rendered**
  (`python3 tools/serve.py --port 4177`, then open `/privacy.html`). Apply any
  wording changes in a small PR. Approval is in conversation.
- [ ] **Step 2: Decide the deployment path from what is live**

```bash
npm run verify:hosting 2>&1 | grep -iE "commit|version" | head -3
git log -1 --format=%H origin/main
```

- **If the live commit equals `origin/main`'s release** (the owner or Nuance
  has deployed main), deploy normally by the `docs/HOSTING.md` procedure:
  `npm ci && npm test && npm run deploy -- --dry-run && npm run deploy`.
- **Otherwise, do not ship main's undeployed game changes for a privacy page.**
  Cut `release/v0.5.2-privacy` from tag `v0.5.1`, then:
  1. Copy in `privacy.html` and its allowlist line from `main`. The rules-dialog
     link is not needed on the website.
  2. Set `package.json` version `0.5.2`.
  3. Open a PR into a new `release/v0.5.2` branch and let CI run.
  4. With the owner's explicit go for a production deploy, run
     `npm run deploy -- --dry-run` and then `npm run deploy` from a clean
     checkout of that commit.
  5. Tag `v0.5.2`.
- [ ] **Step 3: Verify.** Run `npm run verify:hosting`, then
  `curl -sI https://mythseal.com/privacy | head -1`.
  Expected: `HTTP/2 200`. Record the deployment in `docs/HOSTING.md`'s release
  records, in the existing format.

### Task 16: Store assets for review (working quality)

**Files:**
- Create: `tools/store-assets.mjs` (outputs go to the ignored `test-results/store-assets/`)

- [ ] **Step 1: Write the generator**

```js
/** Working store assets from the native build: phone screenshots (Pixel 7 portrait at
 * 1080×2400 device pixels, iPhone 15 Pro Max portrait at 1290×2796) plus Play's 512 icon
 * and 1024×500 feature graphic. Serve dist/ (npm run build:native) on loopback first.
 * Outputs to test-results/store-assets/ (ignored); upload by hand. */
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
if (!process.env.GAME_URL) throw Error('Set GAME_URL to a loopback server for dist/.');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const out = fileURLToPath(new URL('../test-results/store-assets/', import.meta.url));
await mkdir(out, { recursive: true });
const browser = await engines.chromium.launch({ executablePath: chrome });
const phones = [['android', { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true }],
  ['iphone', { viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }]];
const screens = ['home', 'collection', 'world', 'market'];
for (const [name, options] of phones) {
  const context = await browser.newContext(options);
  await context.addInitScript(() => { window.Capacitor = { isNativePlatform: () => true }; });
  const page = await context.newPage();
  await page.goto(new URL('index.html', process.env.GAME_URL).href);
  await page.locator('.game-lobby').waitFor();
  for (const screen of screens) {
    const target = page.locator(`[data-action="${screen}"]`).first();
    if (await target.count()) { await target.click(); await page.waitForTimeout(600); }
    await page.screenshot({ path: `${out}${name}-${screen}.png` });
  }
  await context.close();
}
const mark = new URL('../assets/mark.svg', import.meta.url).href, map = new URL('../assets/world-map.png', import.meta.url).href;
const art = await browser.newPage({ viewport: { width: 1024, height: 500 } });
await art.setContent(`<body style="margin:0;width:1024px;height:500px;background:#100d09 url('${map}') center/cover;display:grid;place-items:center"><div style="display:flex;gap:28px;align-items:center;background:rgba(16,13,9,.72);padding:28px 40px;border-radius:18px"><img src="${mark}" style="height:150px"><div style="font:600 64px 'PingFang TC','Noto Serif TC',serif;color:#d9b56a">萬象契<div style="font:500 26px system-ui;letter-spacing:.3em;color:#efe6d2">MYTHSEAL</div></div></div></body>`);
await art.waitForLoadState('networkidle');
await art.screenshot({ path: `${out}feature-graphic-1024x500.png` });
const icon = await browser.newPage({ viewport: { width: 512, height: 512 } });
await icon.goto(new URL('../resources/icon.png', import.meta.url).href);
await icon.screenshot({ path: `${out}icon-512.png` });
await browser.close();
console.log(`Store assets written to ${out}`);
```

- [ ] **Step 2: Run it against the native build and look at every image**

```bash
npm run build:native
python3 -m http.server 4179 --bind 127.0.0.1 --directory dist & SERVER=$!
GAME_URL=http://127.0.0.1:4179 node tools/store-assets.mjs; kill $SERVER
open test-results/store-assets
```

Expected: 8 screenshots, a feature graphic and a 512 icon. Discard any
screenshot that shows an empty or loading state. If a `data-action` named in
`screens` doesn't exist in the dock, replace it with one that does
(`grep -o 'data-action="[a-z-]*"' navigation-ui.mjs | sort -u`).

- [ ] **Step 3: Commit the generator** (not the images).

### Task 17: Apple Stage 2: TestFlight external testing and Beta App Review

- [ ] **Step 1: Ai drafts every answer into the field notes first**:
  1. The beta description (English plus 中文, at most 4,000 characters).
  2. The feedback email `contact@cambridgetcg.com`.
  3. The privacy policy URL `https://mythseal.com/privacy`.
  4. The reviewer notes: "Offline single-player card game. No sign-in, no
     network use. Start from the lobby, open 對弈 to play a match."
  5. The App Privacy answer "Data Not Collected", justified by Task 2's network
     smoke.
  6. The age-rating answers for the current questionnaire, read from the screen
     at the time. No gambling, no loot boxes bought with money (packs use only
     earned in-game coins), and mild fantasy combat.
- [ ] **Step 2: The owner enters them.** TestFlight → Test Information;
  App Privacy; App Information → Age Rating.
- [ ] **Step 3: The owner submits.** TestFlight → External Testing → "+"
  group `Friends` → add the build and 1–5 invited testers → Submit for Review.
- [ ] **Step 4: Record the review.** Note the submit time, the decision time
  and the exact decision text (approved or rejected). On rejection, follow
  runbook §4. Field-notes entry.

### Task 18: Google Stage 2: closed testing and review

- [ ] **Step 1: Ai drafts the answers.** Policy → App content:
  - privacy policy URL;
  - ads: No;
  - app access: all functionality available without special access;
  - content rating: IARC questionnaire, category Game, with no violence beyond
    fantasy, no gambling, no user interaction, no purchases;
  - target audience: **13+ unless the owner chooses otherwise** (spec §6.3).
    This is the owner's call, and is asked when this task starts;
  - data safety: "No data collected or shared";
  - financial features: none;
  - government app: No;
  - health: No.

  Store listing:
  - short description (≤ 80 characters) and full description, in 中文 and English;
  - the Task 16 icon, feature graphic and at least 2 Android screenshots;
  - category Card, contact email.
- [ ] **Step 2: The owner enters them.** Record every field asked that isn't
  listed here.
- [ ] **Step 3: The owner creates closed testing.** Testing → Closed testing →
  Create track `friends`, add a tester list, promote the internal build →
  Review release → Start rollout → send for review (Publishing overview).
- [ ] **Step 4: Record the review.** Note the times and exact outcome text.
  On rejection, follow runbook §4. Field-notes entry.

### Task 19: Close the loop

- [ ] **Step 1: Finish the runbook.**
  - §3 pre-review checklist: every "pay attention to" line from the field notes.
  - §5 costs and timings: build minutes per platform, Apple processing time,
    and the wait for each review.
- [ ] **Step 2: Update the status docs.** `docs/CONNECTIONS.md`: connection
  rows for App Store Connect (Admin API key `mythseal-ci`, created date), Play
  (service account email, permissions) and the upload-key fingerprint.
  `docs/MOBILE-RELEASE.md`: one dated line with both review outcomes.
- [ ] **Step 3: PR, CI, merge.** Then post a three-line summary for the
  owner: outcomes, the top three "pay attention to" lessons, and what
  TaxSorted's spec should take from the runbook.
