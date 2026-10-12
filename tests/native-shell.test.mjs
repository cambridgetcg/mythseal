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
