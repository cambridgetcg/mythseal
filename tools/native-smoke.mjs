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
