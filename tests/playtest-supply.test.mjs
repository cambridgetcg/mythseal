import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createProfile, beginBattle, buyWX01Box, PROFILE_KEY } from '../progression.mjs';
import { createProfileStore, PROFILE_LOCK } from '../profile-store.mjs';
import { claimPlaytestSupply, PLAYTEST_GIFT, PLAYTEST_COINS, isLoopback } from '../playtest-supply.mjs';

const now = '2026-09-22T12:00:00.000Z';
const fresh = () => createProfile({ now });
const copy = value => structuredClone(value);
function storageFixture(profile) {
  const data = new Map(profile ? [[PROFILE_KEY, JSON.stringify(profile)]] : []), writes = [];
  let quota = false;
  const storage = { getItem: key => data.get(key) ?? null, setItem(key, value) {
    if (quota) throw new DOMException('Synthetic storage full', 'QuotaExceededError');
    writes.push({ key, value }); data.set(key, value);
  } };
  return { data, writes, storage, quota(value) { quota = value; } };
}

async function supplyUI(fixture, run, { hostname = '127.0.0.1', locks = true } = {}) {
  const keys = ['document', 'window', 'location', 'localStorage', 'navigator'];
  const previous = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const handlers = {}, nodes = Object.fromEntries(['supply-status', 'supply-balance', 'claim-supply'].map(id => [id, { disabled: true, textContent: '', addEventListener(type, callback) { handlers[type] = callback; } }]));
  const requested = [];
  let tail = Promise.resolve();
  const globals = {
    document: { querySelector: selector => nodes[selector.slice(1)] },
    window: { addEventListener(type, callback) { handlers[type] = callback; } },
    location: { hostname }, localStorage: fixture.storage,
    navigator: locks ? { locks: { request(name, operation) { requested.push(name); const result = tail.then(operation); tail = result.catch(() => {}); return result; } } } : {},
  };
  try {
    for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, value });
    await import(`../playtest-supply-ui.mjs?fixture=${supplyUI.serial++}`);
    await run({ nodes, handlers, requested });
  } finally {
    for (const key of keys) { const descriptor = previous.get(key); if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
}
supplyUI.serial = 0;

test('gift changes only coins and its literal marker, preserving a pending battle and unopened 24-pack box', () => {
  const seed = fresh(); seed.coins = 10000;
  const boxed = buyWX01Box(seed, { packs: 24, now, rng: () => .23 }).profile;
  const profile = beginBattle(boxed, { kind: 'arena', now }).profile, before = copy(profile);
  const next = claimPlaytestSupply(profile, { hostname: '127.0.0.1' });
  const expected = copy(before); expected.coins += 10000; expected.wx01.playtestGift = 'wx01-box-20260922';
  assert.deepEqual(next, expected);
  assert.deepEqual(profile, before);
  assert.equal(next.wx01.receipt.cards.length, 72);
  assert.deepEqual(claimPlaytestSupply(next, { hostname: 'localhost' }), next);
  assert.equal(PLAYTEST_COINS, 10000); assert.equal(PLAYTEST_GIFT, 'wx01-box-20260922');
});

test('remote/lookalike origins, malformed profiles and coin overflow cannot claim', () => {
  const profile = fresh(), before = copy(profile);
  for (const hostname of [undefined, '', 'mythseal.com', 'localhost.example.com', '127.0.0.1.example.com', '192.168.1.2', 'https://localhost']) {
    assert.equal(isLoopback(hostname), false);
    assert.throws(() => claimPlaytestSupply(profile, { hostname }), /本機/);
  }
  for (const hostname of ['localhost', '127.0.0.1', '[::1]', '::1']) assert.equal(claimPlaytestSupply(profile, { hostname }).coins, profile.coins + 10000);
  const damaged = copy(profile); delete damaged.instances[0].printId;
  assert.throws(() => claimPlaytestSupply(damaged, { hostname: 'localhost' }));
  assert.throws(() => claimPlaytestSupply({ ...profile, coins: 999990001 }, { hostname: 'localhost' }), /容量/);
  assert.equal(claimPlaytestSupply({ ...profile, coins: 999990000 }, { hostname: 'localhost' }).coins, 1000000000);
  assert.deepEqual(profile, before);
});

test('quota failure stores neither coins nor marker; retry and reload grant exactly once', () => {
  const original = fresh(), fixture = storageFixture(original), before = new Map(fixture.data);
  const store = createProfileStore({ storage: fixture.storage, now: () => now });
  fixture.quota(true);
  assert.throws(() => store.save(claimPlaytestSupply(store.load(), { hostname: 'localhost' })), { name: 'QuotaExceededError' });
  assert.deepEqual(fixture.data, before); assert.deepEqual(fixture.writes, []);
  fixture.quota(false);
  const committed = store.save(claimPlaytestSupply(store.load(), { hostname: 'localhost' }));
  assert.equal(fixture.writes.length, 1); assert.equal(fixture.writes[0].key, PROFILE_KEY);
  const saved = JSON.parse(fixture.writes[0].value);
  assert.equal(saved.coins, original.coins + 10000); assert.equal(saved.wx01.playtestGift, PLAYTEST_GIFT);
  assert.deepEqual(store.load(), committed);
  assert.deepEqual(claimPlaytestSupply(store.load(), { hostname: 'localhost' }), committed);
});

test('supply page never creates a journey and remains disabled without native locks or a local origin', async () => {
  for (const [profile, options, message] of [[null, {}, /原本的遊戲旅程/], [fresh(), { locks: false }, /安全儲存/], [fresh(), { hostname: 'mythseal.com' }, /本機/]]) {
    const fixture = storageFixture(profile), before = new Map(fixture.data);
    await supplyUI(fixture, ({ nodes }) => {
      assert.equal(nodes['claim-supply'].disabled, true); assert.match(nodes['supply-status'].textContent, message);
      assert.deepEqual(fixture.data, before); assert.deepEqual(fixture.writes, []);
    }, options);
  }
});

test('actual supply UI waits for a click, serializes repeated clicks, retries quota and disables an already claimed journey', async () => {
  const original = fresh(), fixture = storageFixture(original), before = new Map(fixture.data);
  await supplyUI(fixture, async ({ nodes, handlers, requested }) => {
    assert.equal(nodes['claim-supply'].disabled, false); assert.deepEqual(fixture.data, before); assert.equal(fixture.writes.length, 0);
    fixture.quota(true); await handlers.click();
    assert.deepEqual(fixture.data, before); assert.equal(nodes['claim-supply'].disabled, false);
    assert.match(nodes['supply-status'].textContent, /Synthetic storage full/);
    fixture.quota(false);
    await Promise.all([handlers.click(), handlers.click()]);
    assert.equal(fixture.writes.length, 1);
    assert.equal(nodes['claim-supply'].disabled, true); assert.match(nodes['supply-status'].textContent, /已收入/);
    assert.deepEqual(requested, [PROFILE_LOCK, PROFILE_LOCK]);
    assert.equal(JSON.parse(fixture.data.get(PROFILE_KEY)).coins, original.coins + 10000);
  });
  await supplyUI(fixture, ({ nodes }) => { assert.equal(nodes['claim-supply'].disabled, true); assert.equal(fixture.writes.length, 1); });
});

test('supply entry points are preview-only and absent from production game imports', async () => {
  const production = JSON.parse(await readFile(new URL('../hosting/public-assets.json', import.meta.url), 'utf8'));
  const preview = JSON.parse(await readFile(new URL('../hosting/preview-assets.json', import.meta.url), 'utf8'));
  for (const path of ['playtest.html', 'playtest-supply.mjs', 'playtest-supply-ui.mjs']) {
    assert(preview.includes(path)); assert(!production.includes(path));
  }
  for (const path of production.filter(path => /\.(mjs|html)$/.test(path))) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
    assert(!/['"](?:\.\/)?playtest(?:-supply(?:-ui)?\.mjs|\.html)['"]/.test(source), `${path} must not depend on the preview-only page`);
  }
});
