// Store builds run inside Capacitor's WebView, where the account client's same-origin /api
// calls cannot work; the game must never start it there. The guard sits at the choke points,
// not at each call site: in a native shell app.mjs's account controller is account-offline.mjs's
// inert one and navigate() refuses 旅程閣, so D2's lobby actions (restore-offer-cloud,
// backup-prompt-cloud), a session broadcast or any later caller reach nothing. These tests drive
// those seams; tools/native-smoke.mjs (npm run test:native) drives the real buttons in a page.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { isNativeShell } from '../platform.mjs';
import { createOfflineAccount, OFFLINE_ACCOUNT_STATE } from '../account-offline.mjs';
import { createAccountController } from '../account-client.mjs';
import { saveNoticeMarkup } from '../save-ui.mjs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/** Spies on everything an account path could touch: fetch, storage and timers. */
function spies(t) {
  const calls = [];
  const record = name => (...args) => { calls.push([name, ...args]); return name === 'fetch' ? Promise.reject(new Error('no network in this test')) : null; };
  const saved = { fetch: globalThis.fetch, localStorage: globalThis.localStorage, setTimeout: globalThis.setTimeout };
  globalThis.fetch = record('fetch');
  globalThis.localStorage = { getItem: record('getItem'), setItem: record('setItem'), removeItem: record('removeItem') };
  t.after(() => { globalThis.fetch = saved.fetch; globalThis.setTimeout = saved.setTimeout; if (saved.localStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = saved.localStorage; });
  return calls;
}

/** Every method a controller offers, called the way app.mjs calls it. */
async function driveEveryPath(controller) {
  const results = {};
  for (const [name, method] of Object.entries(controller)) {
    const args = { requestCode: ['player@example.invalid'], verifyCode: ['123456'], setConfirmation: ['restore'], setDraft: ['email', 'x'] }[name] ?? [];
    results[name] = await method(...args);
  }
  return results;
}

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

test('in a native shell every account path, init included, makes no request and touches no storage', async t => {
  const calls = spies(t);
  const account = createOfflineAccount();
  const results = await driveEveryPath(account);
  assert.deepEqual(calls, [], 'no fetch, no storage');
  for (const name of ['init', 'requestCode', 'verifyCode', 'refreshCloud', 'upload', 'restore', 'deleteBackup', 'logout']) assert.equal(results[name], false, `${name} reports that nothing happened`);
  // What the lobby reads: looked up, signed out, email sign-in off, so it offers no cloud path.
  const state = account.getState();
  assert.deepEqual(state, { ...OFFLINE_ACCOUNT_STATE, journeyVersions: [1] });
  assert.equal(Boolean(state.account) || !state.initialized || state.emailEnabled, false, "D2's cloud test reads no cloud from this state");
  state.account = { id: 'x' }; state.journeyVersions.push(9);
  assert.equal(account.getState().account, null, 'the state is a copy');
  assert.deepEqual(account.getState().journeyVersions, [1]);
});

test('the inert controller offers every method the account client does, so no caller can miss one', async t => {
  spies(t);
  const client = createAccountController({ getLocalProfile: () => null, restoreLocalProfile: async () => null, fetchImpl: async () => { throw new Error('not called'); } });
  assert.deepEqual(Object.keys(createOfflineAccount()).sort(), Object.keys(client).sort());
});

test('for contrast, the account client called from the same paths does reach /api', async t => {
  const calls = spies(t);
  const requested = [];
  const client = createAccountController({ getLocalProfile: () => null, restoreLocalProfile: async () => null, withSessionLock: operation => operation(),
    fetchImpl: async url => { requested.push(url); throw new TypeError('offline'); } });
  await client.init().catch(() => {});
  assert.deepEqual(requested, ['/api/v1/account'], 'this is the request a native shell must never make');
  assert.equal(calls.filter(([name]) => name !== 'fetch').length, 0);
});

test("a store build's lobby strips lead to the file, never to 旅程閣 or a cloud", () => {
  for (const kind of ['restore-offer', 'first-win', 'first-pack']) {
    const strip = saveNoticeMarkup(kind, { cloud: false, wins: 1 });
    assert.doesNotMatch(strip, /restore-offer-cloud|backup-prompt-cloud|account-open|data-action="account"/, kind);
    assert.doesNotMatch(strip, /旅程閣|雲端/, `${kind}: no label promising either`);
    assert.match(strip, kind === 'restore-offer' ? /data-action="import-save"/ : /data-action="export-save"/, `${kind}: the file path stays`);
  }
  // The website keeps both.
  assert.match(saveNoticeMarkup('restore-offer'), /restore-offer-cloud/);
  assert.match(saveNoticeMarkup('first-win', { wins: 1 }), /backup-prompt-cloud/);
});

test('app.mjs routes every account path through those choke points', () => {
  const app = read('app.mjs');
  assert.match(app, /^const NATIVE_SHELL = isNativeShell\(\);\nconst createAccountController = options => NATIVE_SHELL \? createOfflineAccount\(\) : createAccountClient\(options\);\nconst account = createAccountController\(\{/m);
  assert.equal(app.match(/createAccountClient\(/g).length, 1, 'the account client is created in one place only');
  assert.match(app, /^function navigate\(destination\) \{\n[^\n]*\n  if\(NATIVE_SHELL&&destination==='account'\)return;/m, 'navigate refuses 旅程閣 whoever calls it');
  assert.match(app, /saveNoticeMarkup\('restore-offer',\{cloud:!NATIVE_SHELL&&\(/);
  assert.match(app, /saveNoticeMarkup\(saveNotice,\{wins:profile\.stats\.won,cloud:!NATIVE_SHELL\}\)/);
  assert.match(app, /const accountChannel = !NATIVE_SHELL && /, 'no session broadcast channel in the app');
});

test('the native seams are served with the game', () => {
  const served = JSON.parse(read('hosting/public-assets.json'));
  for (const file of ['platform.mjs', 'account-offline.mjs']) assert.ok(served.includes(file), file);
});
