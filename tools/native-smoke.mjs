/** Store app acceptance in a browser (docs/IOS-FIRST-FLIGHT.md). GAME_URL serves the store build
 * (npm run build:native, then dist/) and the page gets a simulated Capacitor bridge shaped like
 * @capacitor/ios 8.5.3's (window.Capacitor.Plugins.Filesystem and .Share, one promise per
 * method), whose files live in this process so they survive reloads and cleared site data.
 * Checked, in order:
 * - the offline guest shell: no 旅程閣 button; the account routes, D2's lobby actions (雲端旅程,
 *   旅程閣) and a session broadcast reach the choke points, so 旅程閣 never opens;
 * - 旅程存檔 (the header's save panel): the export is written to Cache and handed to the share
 *   sheet with the same bytes the web downloads, and the panel records it;
 * - the durable copy: written to Library at launch and after each save; after site data is
 *   cleared (what iOS may do to a WKWebView) the journey comes back through the strict restore;
 *   a copy the strict checks refuse is set aside, the game starts a new journey, and 旅程存檔
 *   hands the set-aside copy to the share sheet; a copy saved mid-battle comes back with that
 *   battle given up;
 * - 旅程存檔's import: D2's file input and strict restore bring a journey file back, and
 *   復原上次本機旅程's confirmation promises no cloud backup;
 * - the network: no /api, nothing off the loopback origin, no account file, no failed request.
 * WEB_URL, when set, serves the website build or this checkout, which with no bridge still shows
 * the account entry. BROWSER=webkit runs Playwright's WebKit as an iPhone 15, closer to Safari
 * than Chromium (Pixel 7) is. Either way this is a desktop browser engine with a simulated
 * bridge over loopback: not a WKWebView, not Capacitor, not a physical device. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createProfile, claimLogin, beginBattle, PROFILE_KEY } from '../progression.mjs';
import { mintInstance, setInstanceXP } from '../collection.mjs';
import { RECOVERY_KEY } from '../profile-store.mjs';

const browserName = process.env.BROWSER || 'chromium';
if (!['chromium', 'webkit'].includes(browserName)) throw Error('BROWSER must be chromium or webkit.');
const runtime = fileURLToPath(new URL('../test-results/webkit-runtime', import.meta.url));
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(runtime)) process.env.PLAYWRIGHT_BROWSERS_PATH = runtime;
const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
if (!process.env.GAME_URL) throw Error('Set GAME_URL to a loopback server for the native dist/, e.g. GAME_URL=http://127.0.0.1:4179.');
const loopback = value => { const url = new URL(value); if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw Error('Native smoke requires loopback.'); return url; };
const nativeBase = loopback(process.env.GAME_URL), webBase = process.env.WEB_URL ? loopback(process.env.WEB_URL) : null;
const ACCOUNT_FILES = ['account-client.mjs', 'account-ui.mjs', 'account.css'];
const MIRROR = 'LIBRARY:mythseal/journey.v5.json';
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const { defaultBrowserType, ...device } = engines.devices[browserName === 'webkit' ? 'iPhone 15' : 'Pixel 7'];
const launch = () => browserName === 'webkit' ? engines.webkit.launch() : engines.chromium.launch({ executablePath: chrome });
const checks = [];
const passed = label => { checks.push(label); console.log(`PASS ${label}`); };

/** A journey nobody starts with: coins and a trained copy the restore must bring back exactly. */
function travelled() {
  const day = new Date().toISOString();
  let profile = claimLogin(createProfile({ now: day }), day);
  const added = mintInstance(profile, 'qingxiao', { source: 'npc-market', now: day });
  profile = setInstanceXP(added.profile, added.instance.uid, 430);
  return { profile: { ...profile, coins: 4321, dust: 87 }, uid: added.instance.uid };
}

/** The simulated bridge: Filesystem over `files` (rename replaces, as the plugin does), Share
 * that completes like Save to Files. Calls cross into this process through one binding. */
async function nativeContext(browser, files, shares) {
  const context = await browser.newContext(device);
  await context.exposeFunction('__mythsealNative', (method, options) => {
    const key = (directory, path) => `${directory}:${path}`;
    if (method === 'writeFile') { files.set(key(options.directory, options.path), options.data); return { uri: `file:///app/${options.directory}/${options.path}` }; }
    if (method === 'readFile') { const data = files.get(key(options.directory, options.path)); return data === undefined ? { error: 'File does not exist.' } : { data }; }
    if (method === 'rename') {
      const from = key(options.directory, options.from);
      if (!files.has(from)) return { error: 'File does not exist.' };
      files.set(key(options.toDirectory, options.to), files.get(from)); files.delete(from); return {};
    }
    if (method === 'readdir') {
      const prefix = key(options.directory, `${options.path}/`), names = [...files.keys()].filter(name => name.startsWith(prefix)).map(name => name.slice(prefix.length)).filter(name => !name.includes('/'));
      return names.length ? { files: names.map(name => ({ name, type: 'file' })) } : { error: 'File does not exist.' };
    }
    if (method === 'share') { shares.push(options); return { activityType: 'com.apple.DocumentManagerUICore.SaveToFiles' }; }
    return { error: `unknown ${method}` };
  });
  await context.addInitScript(() => {
    const call = async (method, options) => { const result = await window.__mythsealNative(method, options); if (result?.error) throw new Error(result.error); return result; };
    window.Capacitor = { isNativePlatform: () => true, Plugins: {
      Filesystem: { writeFile: options => call('writeFile', options), readFile: options => call('readFile', options), rename: options => call('rename', options), readdir: options => call('readdir', options) },
      Share: { share: options => call('share', options) },
    } };
  });
  return context;
}

function watchNetwork(context, base) {
  const requests = [], failed = [];
  context.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  context.on('requestfailed', request => { if (new URL(request.url()).origin === base.origin) failed.push(`failed ${request.url()}`); });
  return context.route('**/*', route => {
    const url = new URL(route.request().url());
    requests.push(url);
    return url.origin === base.origin ? route.continue() : route.abort();
  }).then(() => ({ requests, failed }));
}

const until = async (condition, label, timeout = 5000) => {
  const start = Date.now();
  while (!(await condition())) {
    if (Date.now() - start > timeout) throw Error(`Timed out: ${label}`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
};
const stored = (page, key = PROFILE_KEY) => page.evaluate(key => localStorage.getItem(key), key);
/** What iOS may do to a WKWebView under storage pressure: every script-writable store goes. */
const clearSiteData = page => page.evaluate(async () => {
  localStorage.clear(); sessionStorage.clear();
  for (const { name } of await indexedDB.databases?.() ?? []) await new Promise(resolve => { const request = indexedDB.deleteDatabase(name); request.onsuccess = request.onerror = request.onblocked = () => resolve(); });
});
const toastText = page => page.locator('.toast').textContent({ timeout: 5000 });

async function nativeRun() {
  const browser = await launch(), files = new Map(), shares = [];
  try {
    const context = await nativeContext(browser, files, shares);
    const network = await watchNetwork(context, nativeBase);
    const page = await context.newPage();
    await page.goto(new URL('index.html', nativeBase).href);
    await page.locator('.game-lobby').waitFor();

    // The offline guest shell.
    assert.equal(await page.locator('[data-action="account-open"]').count(), 0, 'no 旅程閣 button');
    assert.equal(await page.locator('.game-header [data-action="saves-open"]').count(), 1, '旅程存檔 stands in its place');
    await page.evaluate(() => {
      for (const action of ['account', 'account-open', 'account-retry', 'account-upload', 'account-refresh', 'restore-offer-cloud', 'backup-prompt-cloud']) {
        const button = document.createElement('button'); button.dataset.action = action; document.body.append(button); button.click(); button.remove();
      }
      new BroadcastChannel('mythseal-account').postMessage({ type: 'session-changed' });
    });
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.account-shell').count(), 0, 'no action, D2 lobby strips included, opens 旅程閣');
    assert.equal(await page.locator('.game-lobby').count(), 1);
    assert.equal(await page.locator('[data-save-notice] [data-action="restore-offer-cloud"]').count(), 0, 'the restore offer has no cloud path');
    passed('offline shell: no account entry, every account route inert');

    // The copy follows the journey from the first launch.
    await until(async () => files.get(MIRROR) === await stored(page), 'the launch writes the copy');
    passed('durable copy written to Library at launch');

    // 旅程存檔: export through the share sheet.
    await page.locator('[data-action="saves-open"]').click();
    const panel = page.locator('.saves-panel');
    await panel.waitFor();
    assert.match(await panel.locator('h2').textContent(), /旅程存檔/);
    assert.match(await panel.locator('[data-mirror]').textContent(), /裝置副本：.*已更新/);
    await panel.locator('[data-action="export-save"]').click();
    await until(() => shares.length === 1, 'the share sheet is offered');
    const [uri] = shares[0].files, cachePath = decodeURI(uri).replace('file:///app/CACHE/', '');
    assert.match(cachePath, /^exports\/萬象契旅程-\d{4}-\d{2}-\d{2}\.json$/);
    assert.deepEqual(JSON.parse(files.get(`CACHE:${cachePath}`)), JSON.parse(await stored(page)), 'the exported file is the journey');
    assert.match(files.get(`CACHE:${cachePath}`), /^\{\n  "version": 5,/, "D2's indented export format");
    await until(async () => /已經分享選單送出/.test(await page.locator('.saves-panel [data-last-export]').textContent()), 'the panel records the export');
    passed('export: Cache file handed to the share sheet, recorded in 旅程存檔');
    // D1's Back model: the dialog is one layer, so Back closes it and stays in the game.
    await page.goBack();
    await until(async () => await page.locator('.saves-panel').count() === 0, 'Back closes 旅程存檔');
    assert.equal(await page.locator('.game-lobby').count(), 1, 'and leaves the player on 洞府');
    passed('Back closes 旅程存檔 like any dialog');

    // A distinctive journey, saved: the copy follows.
    const { profile, uid } = travelled();
    await page.evaluate(([key, text]) => localStorage.setItem(key, text), [PROFILE_KEY, JSON.stringify(profile)]);
    await page.reload(); await page.locator('.game-lobby').waitFor();
    await until(async () => files.get(MIRROR) === await stored(page) && JSON.parse(files.get(MIRROR)).coins === 4321, 'the copy follows a save');

    // iOS clears the web storage: the journey comes back through the strict restore.
    await clearSiteData(page);
    await page.reload(); await page.locator('.game-lobby').waitFor();
    assert.match(await toastText(page), /已由此裝置的保存副本還原旅程/);
    const back = JSON.parse(await stored(page));
    assert.equal(back.coins, 4321);
    assert.equal(back.instances.find(card => card.uid === uid)?.xp, 430, 'the trained copy, exactly');
    assert.ok(JSON.parse(await stored(page, RECOVERY_KEY)).snapshot, 'the strict restore kept the replaced new journey as the recovery copy');
    assert.equal(await page.locator('[data-save-notice="restore-offer"]').count(), 0, 'no restore offer: the journey is back');
    await until(async () => files.get(MIRROR) === await stored(page), 'the copy follows again');
    passed('after cleared site data the journey returns from the copy through the strict restore');

    // A copy the strict checks refuse is set aside; the game starts a new journey.
    const tampered = { ...back, inventory: { ...back.inventory, qingxiao: back.inventory.qingxiao + 3 }, coins: 99_999 };
    files.set(MIRROR, JSON.stringify(tampered));
    await clearSiteData(page);
    await page.reload(); await page.locator('.game-lobby').waitFor();
    assert.match(await toastText(page), /保存副本未能還原，已另行保留/);
    assert.notEqual(JSON.parse(await stored(page)).coins, 99_999, 'nothing from the refused copy reached storage');
    const kept = [...files.keys()].filter(name => name.startsWith('LIBRARY:mythseal/journey.v5.refused-'));
    assert.equal(kept.length, 1); assert.equal(files.get(kept[0]), JSON.stringify(tampered), 'kept byte for byte');
    await until(async () => files.get(MIRROR) === await stored(page), 'the copy follows the new journey');
    assert.equal(await page.locator('[data-save-notice="restore-offer"]').count(), 1, "D2's restore offer, without a cloud path, for the new journey");
    passed('a refused copy is set aside and kept; a new journey starts');

    // 旅程存檔 hands the set-aside copy to the share sheet, so it is never out of reach.
    await page.locator('[data-action="saves-open"]').click();
    const keptButton = page.locator('.saves-panel [data-mirror-kept] [data-action="export-kept-copy"]');
    await keptButton.waitFor();
    assert.equal(await keptButton.count(), 1, 'one set-aside copy offered');
    const sharedBefore = shares.length;
    await keptButton.click();
    await until(() => shares.length === sharedBefore + 1, 'the set-aside copy goes to the share sheet');
    const keptPath = decodeURI(shares.at(-1).files[0]).replace('file:///app/CACHE/', '');
    assert.match(keptPath, /^exports\/萬象契旅程-未能還原副本-\d{8}T\d{9}Z\.json$/);
    assert.equal(files.get(`CACHE:${keptPath}`), JSON.stringify(tampered), 'the copy exactly as it was kept');
    assert.ok(files.has(kept[0]), 'and it stays in Library');
    await page.goBack();
    await until(async () => await page.locator('.saves-panel').count() === 0, 'Back closes 旅程存檔');
    passed('旅程存檔 exports the set-aside copy through the share sheet');

    // 旅程存檔's import: D2's file picker and strict restore, with no account anywhere.
    await page.locator('[data-action="saves-open"]').click();
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('.saves-panel [data-action="import-save"]').click()]);
    await chooser.setFiles({ name: '萬象契旅程-備份.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(back, null, 2)) });
    await page.locator('[data-action="import-confirm"]').waitFor();
    const confirmation = await page.locator('.import-modal').textContent();
    assert.match(confirmation, /可在旅程存檔「復原上次本機旅程」取回/);
    assert.doesNotMatch(confirmation, /旅程閣|雲端/);
    await page.locator('[data-action="import-confirm"]').click();
    await until(async () => JSON.parse(await stored(page)).coins === 4321, 'the import restores the journey');
    await until(async () => files.get(MIRROR) === await stored(page), 'and the copy follows it');
    passed('import from 旅程存檔: picker, comparison, strict restore; the copy follows');

    // 復原上次本機旅程 promises nothing about a cloud backup the app does not have.
    await page.locator('[data-action="saves-open"]').click();
    await page.locator('.saves-panel [data-action="restore-recovery"]').click();
    const recoveryDialog = page.locator('.modal', { has: page.locator('[data-action="confirm-restore-recovery"]') });
    await recoveryDialog.waitFor();
    assert.match(await recoveryDialog.textContent(), /這會取代此裝置的進度。現在的本機旅程會成為下一份回復備份。/);
    assert.doesNotMatch(await recoveryDialog.textContent(), /雲端|旅程閣/);
    await recoveryDialog.locator('[data-action="close-modal"]').click();
    await until(async () => await page.locator('[data-action="confirm-restore-recovery"]').count() === 0, 'the dialog closes');
    passed('復原上次本機旅程 makes no cloud promise in the app');

    // A copy saved mid-battle comes back with that battle given up, as 放棄此局 would.
    files.set(MIRROR, JSON.stringify(beginBattle(JSON.parse(await stored(page)), { kind: 'practice' }).profile));
    await clearSiteData(page);
    await page.reload(); await page.locator('.game-lobby').waitFor();
    assert.match(await toastText(page), /已由此裝置的保存副本還原旅程；副本中的未完對局已放棄/);
    const settled = JSON.parse(await stored(page));
    assert.equal(settled.pending, null, 'the battle is given up');
    assert.equal(settled.coins, 4321, 'the journey is kept');
    await until(async () => files.get(MIRROR) === await stored(page), 'and the copy follows it');
    passed('a copy saved mid-battle returns with that battle given up');

    await context.close();
    assert.deepEqual(network.requests.filter(url => url.pathname.startsWith('/api/')).map(String), [], 'never calls /api');
    assert.deepEqual(network.requests.filter(url => url.origin !== nativeBase.origin).map(String), [], 'never leaves the bundle');
    assert.deepEqual(network.requests.filter(url => ACCOUNT_FILES.some(file => url.pathname.endsWith(`/${file}`))).map(String), [], 'loads no account file');
    assert.deepEqual(network.failed, [], 'every request succeeds (no import of a file the build left out)');
    passed(`network: ${network.requests.length} local requests, 0 /api, 0 off-origin, no account file, none failed`);
  } finally {
    await browser.close();
  }
}

async function webRun() {
  const browser = await launch();
  try {
    const context = await browser.newContext(device);
    await watchNetwork(context, webBase);
    const page = await context.newPage();
    await page.goto(new URL('index.html', webBase).href);
    await page.locator('.game-lobby').waitFor();
    assert.equal(await page.locator('[data-action="account-open"]').count(), 1, 'the website keeps 旅程閣');
    assert.equal(await page.locator('[data-action="saves-open"]').count(), 0, 'and has no 旅程存檔 button');
    await context.close();
    passed('website: 旅程閣 kept, no store-app panel');
  } finally {
    await browser.close();
  }
}

await nativeRun();
if (webBase) await webRun();
console.log(`Native smoke passed in ${browserName} (${checks.length} groups)${webBase ? '' : '; web check skipped (set WEB_URL)'}. A simulated bridge in a desktop engine, not a WKWebView.`);
