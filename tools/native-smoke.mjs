/** Offline guest shell acceptance: the native build, with a simulated Capacitor bridge, shows
 * no account entry, never calls /api and never leaves the local origin, even when the account
 * routes are triggered directly, D2's lobby actions (雲端旅程, 旅程閣) included: they reach
 * the choke points (the inert account controller, navigate's refusal), so 旅程閣 never opens.
 * GAME_URL serves the store build (npm run build:native, then dist/): it loads no account file
 * and every request it makes succeeds. WEB_URL, when set, serves the website build or this
 * checkout, which with no bridge still shows the account entry. Emulated phone over loopback;
 * not evidence from a physical device or a real WebView. */
import assert from 'node:assert/strict';

const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
if (!process.env.GAME_URL) throw Error('Set GAME_URL to a loopback server for the native dist/, e.g. GAME_URL=http://127.0.0.1:4179.');
const loopback = value => { const url = new URL(value); if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw Error('Native smoke requires loopback.'); return url; };
const nativeBase = loopback(process.env.GAME_URL), webBase = process.env.WEB_URL ? loopback(process.env.WEB_URL) : null;
const ACCOUNT_FILES = ['account-client.mjs', 'account-ui.mjs', 'account.css'];
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const { defaultBrowserType, ...device } = engines.devices['Pixel 7'];

async function visit({ native, base }) {
  const browser = await engines.chromium.launch({ executablePath: chrome });
  try {
    const context = await browser.newContext(device);
    if (native) await context.addInitScript(() => { window.Capacitor = { isNativePlatform: () => true }; });
    const requests = [], failed = [];
    context.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
    context.on('requestfailed', request => { if (new URL(request.url()).origin === base.origin) failed.push(`failed ${request.url()}`); });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      requests.push(url);
      return url.origin === base.origin ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    await page.goto(new URL('index.html', base).href);
    await page.locator('.game-lobby').waitFor();
    const accountButtons = await page.locator('[data-action="account-open"]').count();
    let archiveOpened = false;
    if (native) {
      // Every other way into the archive: the actions, a session broadcast and a reload.
      await page.evaluate(() => {
        for (const action of ['account', 'account-open', 'account-retry', 'account-upload', 'account-refresh', 'restore-offer-cloud', 'backup-prompt-cloud']) {
          const button = document.createElement('button');
          button.dataset.action = action;
          document.body.append(button);
          button.click();
          button.remove();
        }
        new BroadcastChannel('mythseal-account').postMessage({ type: 'session-changed' });
      });
      await page.waitForTimeout(300);
      archiveOpened = await page.locator('.account-shell').count() > 0 || !(await page.locator('.game-lobby').count());
      await page.reload();
      await page.locator('.game-lobby').waitFor();
      await page.waitForTimeout(500);
    }
    await context.close();
    return { accountButtons, requests, archiveOpened, failed };
  } finally {
    await browser.close();
  }
}

const native = await visit({ native: true, base: nativeBase });
assert.equal(native.accountButtons, 0, 'native shell shows no 旅程閣 button');
assert.equal(native.archiveOpened, false, 'no action, D2 lobby strips included, opens 旅程閣 in the native shell');
assert.deepEqual(native.requests.filter(url => url.pathname.startsWith('/api/')).map(String), [], 'native shell never calls /api');
assert.deepEqual(native.requests.filter(url => url.origin !== nativeBase.origin).map(String), [], 'native shell never leaves the bundle');
assert.deepEqual(native.requests.filter(url => ACCOUNT_FILES.some(file => url.pathname.endsWith(`/${file}`))).map(String), [], 'the store build loads no account file');
assert.deepEqual(native.failed, [], 'every request the store build makes succeeds (no import of a file it left out)');

if (webBase) {
  const web = await visit({ native: false, base: webBase });
  assert.equal(web.accountButtons, 1, 'web build still shows the 旅程閣 button');
}
console.log(`Native smoke passed: ${native.requests.length} local requests, 0 /api, 0 off-origin, no account file, no failed request; ${webBase ? 'web keeps the account entry' : 'web check skipped (set WEB_URL)'}.`);
