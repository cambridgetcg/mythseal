/** UI integration smoke with intercepted fixture APIs; never sends real email. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createProfile, PROFILE_KEY } from '../progression.mjs';
import { createSnapshot } from '../cloud-save.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.GAME_URL || 'http://127.0.0.1:4185';
const origin = new URL(base).origin;
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname)) throw Error('Account mock smoke requires a loopback game server.');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = fileURLToPath(new URL('../test-results/', import.meta.url));
const fixedNow = '2026-09-21T12:00:00Z';
const recoveryKey = 'shanhai.profile.recovery.v3';
const battleKey = 'shanhai.battle.v3';
const checks = [], screenshots = [], errors = [], blockedExternal = new Set(), contexts = [];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
const action = (page, name) => page.locator(`[data-action="${name}"]`);
const readProfile = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROFILE_KEY);
const readRecovery = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), recoveryKey);
const complete = label => { checks.push(label); console.log(`PASS ${label}`); };
const mutations = fixture => fixture.calls.filter(call => call.path === '/api/v1/journey' && call.method !== 'GET');
const idle = page => page.locator('.account-shell[aria-busy="false"]').waitFor();

async function noOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth }));
  assert(dimensions.width <= dimensions.viewport + 1, `${label}: ${JSON.stringify(dimensions)}`);
}
async function shot(page, name) {
  await noOverflow(page, name);
  await page.screenshot({ path: `${output}${name}`, fullPage: true });
  screenshots.push(name);
}

async function fixturePage(profile, { mobile = false, authenticated = false, emailEnabled = true } = {}) {
  const fixture = { authenticated, emailEnabled, email: 'traveller@example.test', revision: 0, backup: null, calls: [] };
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : {}) });
  contexts.push(context);
  await context.addInitScript(({ profile, profileKey, now }) => {
    const NativeDate = Date, fixed = new NativeDate(now).getTime();
    globalThis.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [fixed])); }
      static now() { return fixed; }
    };
    Math.random = () => 0.23;
    if (!localStorage.getItem('account-smoke.seeded')) {
      localStorage.setItem('account-smoke.seeded', 'true');
      localStorage.setItem(profileKey, JSON.stringify(profile));
    }
  }, { profile, profileKey: PROFILE_KEY, now: fixedNow });

  // One interception owns every request. API calls are fulfilled locally; other
  // origins are blocked, so no SMTP, account, font or analytics service is used.
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin) { blockedExternal.add(url.origin); return route.abort('blockedbyclient'); }
    if (!url.pathname.startsWith('/api/')) return route.continue();
    let body = null;
    try { body = request.postDataJSON(); } catch {}
    const method = request.method(), path = url.pathname;
    fixture.calls.push({ method, path, body: structuredClone(body) });
    const reply = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'cache-control': 'no-store' }, body: JSON.stringify(value) });
    const user = { id: 'smoke-account-fixture', email: fixture.email };
    if (path === '/api/v1/account' && method === 'GET') return reply({ authenticated: fixture.authenticated, user: fixture.authenticated ? user : null, emailEnabled: fixture.emailEnabled });
    if (path === '/api/v1/auth/otp' && method === 'POST') {
      if (!fixture.emailEnabled) return reply({ error: { code: 'email_unavailable' } }, 503);
      fixture.email = body.email;
      return reply({ sent: true });
    }
    if (path === '/api/v1/auth/verify' && method === 'POST') {
      if (body.token !== '123456') return reply({ error: { code: 'invalid_code' } }, 400);
      fixture.authenticated = true;
      return reply({ authenticated: true, user, emailEnabled: fixture.emailEnabled });
    }
    if (path === '/api/v1/auth/logout' && method === 'POST') { fixture.authenticated = false; return reply({ authenticated: false }); }
    if (path === '/api/v1/journey') {
      if (!fixture.authenticated) return reply({ error: { code: 'sign_in_required' } }, 401);
      if (method === 'GET') return reply({ backup: fixture.backup, revision: fixture.revision });
      if (['PUT', 'DELETE'].includes(method)) {
        if (body.expectedRevision !== fixture.revision) return reply({ error: { code: 'revision_conflict' } }, 409);
        fixture.revision += 1;
        fixture.backup = method === 'DELETE' ? null : { revision: fixture.revision, updatedAt: fixedNow, snapshot: body.snapshot };
        return reply({ backup: fixture.backup, revision: fixture.revision });
      }
    }
    errors.push(`Unexpected mock API route: ${method} ${path}`);
    return reply({ error: { code: 'not_found' } }, 404);
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.origin === origin && !url.pathname.startsWith('/api/') && response.status() >= 400) errors.push(`${response.status()} ${url.pathname}`);
  });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('.game-lobby').waitFor();
  fixture.page = page;
  fixture.context = context;
  return fixture;
}

async function signIn(fixture, email = fixture.email) {
  const page = fixture.page;
  await page.locator('#account-email').fill(email);
  await page.locator('[data-account-form="email"] button[type="submit"]').click();
  await page.locator('#account-token').waitFor();
  await idle(page);
  await page.locator('#account-token').fill('123456');
  await page.locator('[data-account-form="verify"] button[type="submit"]').click();
  await page.locator('.account-identity').waitFor();
  await idle(page);
}

try {
  const seed = createProfile({ now: fixedNow });
  seed.coins = 4321;
  const desktop = await fixturePage(seed);
  const page = desktop.page;
  assert.deepEqual(await readProfile(page), seed);
  assert.equal(desktop.calls.length, 0, 'Guest gameplay must not require an account lookup');
  await action(page, 'account-open').click();
  await page.locator('#account-email').waitFor();
  await idle(page);
  assert.deepEqual(await readProfile(page), seed);
  assert.equal(mutations(desktop).length, 0);
  await shot(page, 'account-desktop-guest.png');
  complete('Guest play and opening the account screen preserve the existing local journey');

  await signIn(desktop);
  assert.deepEqual(await readProfile(page), seed);
  assert.equal(mutations(desktop).length, 0, 'Sign-in must not automatically upload or overwrite local/cloud progress');
  assert.equal(desktop.calls.filter(call => call.path.endsWith('/auth/otp')).length, 1);
  assert.equal(desktop.calls.filter(call => call.path.endsWith('/auth/verify')).length, 1);
  assert.equal(await page.locator('#account-token').count(), 0);
  const storage = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)]))));
  assert(!storage.includes(desktop.email), 'Account email must not persist in local storage');
  assert(!/access_token|refresh_token|supabase\.auth/.test(storage), 'Auth credentials must not persist in local storage');
  complete('Mock OTP sign-in reads the account and cloud status without uploading, merging or storing credentials');

  await action(page, 'account-upload').click();
  await idle(page);
  assert.equal(desktop.revision, 1);
  assert.deepEqual(desktop.backup.snapshot, createSnapshot(seed));
  assert.deepEqual(await readProfile(page), seed);
  assert.equal(mutations(desktop).length, 1);
  await shot(page, 'account-desktop-backed-up.png');
  complete('Only the explicit upload button creates a revisioned cloud backup');

  const distant = structuredClone(seed); distant.coins = 9876;
  desktop.revision = 2;
  desktop.backup = { revision: 2, updatedAt: fixedNow, snapshot: createSnapshot(distant) };
  await action(page, 'account-refresh').click(); await idle(page);
  assert.deepEqual(await readProfile(page), seed);
  await action(page, 'account-confirm-restore').click();
  await page.locator('.account-confirmation').waitFor();
  assert.deepEqual(await readProfile(page), seed, 'Opening restore confirmation must not change local progress');
  await action(page, 'account-restore').click(); await idle(page);
  assert.deepEqual(await readProfile(page), distant);
  assert.deepEqual((await readRecovery(page)).snapshot, createSnapshot(seed));
  await action(page, 'restore-recovery').click();
  await action(page, 'confirm-restore-recovery').waitFor();
  assert.deepEqual(await readProfile(page), distant);
  await action(page, 'confirm-restore-recovery').click();
  await page.waitForFunction(({ key, coins }) => JSON.parse(localStorage.getItem(key)).coins === coins, { key: PROFILE_KEY, coins: seed.coins });
  assert.deepEqual(await readProfile(page), seed);
  assert.deepEqual((await readRecovery(page)).snapshot, createSnapshot(distant));
  assert.deepEqual(desktop.backup.snapshot, createSnapshot(distant));
  complete('Confirmed cloud restore preserves the old local save; its recovery action restores that save and retains the displaced journey');

  const competing = structuredClone(seed); competing.coins = 6543;
  desktop.revision = 3;
  desktop.backup = { revision: 3, updatedAt: fixedNow, snapshot: createSnapshot(competing) };
  await action(page, 'account-upload').click(); await idle(page);
  await page.locator('.account-messages .is-conflict').waitFor();
  assert(await action(page, 'account-upload').isDisabled());
  assert(await action(page, 'account-confirm-restore').isDisabled());
  assert.deepEqual(await readProfile(page), seed);
  assert.deepEqual(desktop.backup.snapshot, createSnapshot(competing));
  const conflictWrites = mutations(desktop).length;
  await shot(page, 'account-desktop-conflict.png');
  await action(page, 'account-refresh').click(); await idle(page);
  assert.equal(mutations(desktop).length, conflictWrites, 'Reviewing a conflict must not automatically retry a write');
  assert.equal(await action(page, 'account-upload').isDisabled(), false);
  await action(page, 'account-upload').click(); await idle(page);
  assert.equal(desktop.revision, 4);
  assert.deepEqual(desktop.backup.snapshot, createSnapshot(seed));
  complete('A stale revision shows a conflict, disables changes, and needs explicit reread plus another upload');

  await action(page, 'account-confirm-delete').click();
  assert(desktop.backup);
  await action(page, 'account-cancel-confirmation').click();
  assert(desktop.backup);
  await action(page, 'account-confirm-delete').click();
  await action(page, 'account-delete').click(); await idle(page);
  assert.equal(desktop.backup, null);
  assert.equal(desktop.revision, 5);
  assert.deepEqual(await readProfile(page), seed);
  await action(page, 'account-upload').click(); await idle(page);
  assert.equal(mutations(desktop).at(-1).body.expectedRevision, 5);
  assert.equal(desktop.revision, 6);
  complete('Cloud deletion requires confirmation, preserves local progress and retains the revision when recreating a backup');

  await page.locator('.game-brand[data-action="home"]').click();
  await page.locator('.game-dock [data-action="arena"]').click();
  await action(page, 'start').click();
  await action(page, 'confirm-start').click();
  await page.locator('.player-hand').waitFor();
  await action(page, 'battle-menu').click();
  await action(page, 'navigate-confirm').click();
  await action(page, 'account-open').click();
  await page.locator('.account-shell').waitFor(); await idle(page);
  const pending = await readProfile(page);
  const savedBattle = await page.evaluate(key => localStorage.getItem(key), battleKey);
  assert(pending.pending);
  assert(await action(page, 'account-upload').isDisabled());
  assert(await action(page, 'account-confirm-restore').isDisabled());
  assert.match(await page.locator('.account-panel.local').innerText(), /對局尚未結束/);
  await action(page, 'account-logout').click(); await idle(page);
  assert.deepEqual(await readProfile(page), pending);
  assert.equal(await page.evaluate(key => localStorage.getItem(key), battleKey), savedBattle);
  complete('Leaving a live battle preserves it and blocks upload/restore; logout keeps the full local journey and match');

  const mobile = await fixturePage(seed, { mobile: true });
  await action(mobile.page, 'account-open').click(); await mobile.page.locator('#account-email').waitFor(); await idle(mobile.page);
  await shot(mobile.page, 'account-mobile-guest.png');
  await signIn(mobile, `${'traveller'.repeat(8)}@example.test`);
  await action(mobile.page, 'account-upload').click(); await idle(mobile.page);
  await shot(mobile.page, 'account-mobile-signed-in.png');
  await action(mobile.page, 'account-confirm-restore').click();
  await shot(mobile.page, 'account-mobile-confirmation.png');
  complete('390px mobile guest, long-email account, backup and confirmation screens have no horizontal overflow');

  const unavailable = await fixturePage(seed, { emailEnabled: false });
  await action(unavailable.page, 'account-open').click(); await idle(unavailable.page);
  assert.match(await unavailable.page.locator('.account-welcome').innerText(), /登入暫未開放/);
  assert.equal(await unavailable.page.locator('[data-account-form]').count(), 0);
  assert.deepEqual(await readProfile(unavailable.page), seed);
  complete('Unconfigured email delivery has honest unavailable UI and leaves guest progress intact');

  assert.deepEqual(errors, [], 'Unexpected browser errors or failed static resources');
  console.log(JSON.stringify({ ok: true, evidence: 'Isolated browser UI with intercepted mock APIs; no live authentication or email delivery tested.', checks, screenshots, browserErrors: errors, externalOriginsBlocked: blockedExternal.size }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, evidence: 'Mock API UI smoke only', passed: checks, browserErrors: errors, error: error.stack }, null, 2));
  process.exitCode = 1;
} finally {
  await Promise.allSettled(contexts.map(context => context.close()));
  await browser.close();
}
