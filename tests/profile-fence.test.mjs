import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, PROFILE_KEY } from '../progression.mjs';
import { getActiveDeck } from '../collection.mjs';
import { createProfileStore } from '../profile-store.mjs';
import { previewCommand, commitCommand, readCommandReceipt, COMMAND_MESSAGES } from '../local-commands.mjs';
import {
  createFencedLock, createIndexedDBFence, profileDigest, ProfileFenceError, FENCE_MESSAGES,
  PROFILE_FENCE_DB, PROFILE_FENCE_STORE, PROFILE_FENCE_VERSION, FENCE_STRICT_MS, FENCE_LENIENT_MS,
} from '../profile-fence.mjs';

const now = '2026-09-21T12:00:00.000Z';
const at = '2026-09-21T12:34:56.789Z';
const clock = () => new Date(at);
const UPGRADE = 'care.upgrade';
function rich() { const profile = createProfile({ now }); profile.coins = 100_000; profile.dust = 10_000; return profile; }
const spare = profile => profile.instances.filter(item => !getActiveDeck(profile).instanceIds.includes(item.uid)).map(item => item.uid);
const levelOf = (profile, uid) => profile.instances.find(item => item.uid === uid).level;
const WRITING = { v: PROFILE_FENCE_VERSION, state: 'writing' };

/** One browser origin as two renderer processes see it. Each tab reads its own copy of
 * localStorage; another tab's write reaches it `lag` ms later, or only on `deliver()`
 * when lag is null. The fence store is coherent, as IndexedDB is, and the lock is one
 * exclusive FIFO lock that is held until an async callback settles, like a Web Lock. */
function origin(profile, { lag = 15 } = {}) {
  const backend = new Map([[PROFILE_KEY, JSON.stringify(profile)]]), tabs = [], held = [];
  let record = null;
  const faults = { read: null, write: null };
  const fenceLog = [];
  const fence = {
    async read() { await null; if (faults.read) throw faults.read; return record === null ? null : structuredClone(record); },
    async write(next) { await null; if (faults.write?.(next)) throw new DOMException('Fixture fence write', 'UnknownError'); fenceLog.push(next?.state ?? null); record = next === null ? null : structuredClone(next); },
  };
  let tail = Promise.resolve();
  const lock = callback => { const run = tail.then(() => callback()); tail = run.catch(() => {}); return run; };
  function tab() {
    const cache = new Map(backend), counts = { get: 0, set: 0 };
    const storage = {
      getItem(key) { counts.get++; return cache.get(key) ?? null; },
      setItem(key, value) {
        counts.set++; cache.set(key, value); backend.set(key, value);
        for (const other of tabs) {
          if (other.cache === cache) continue;
          const arrive = () => other.cache.set(key, value);
          if (lag === null) held.push(arrive); else setTimeout(arrive, lag);
        }
      },
    };
    const self = {
      cache, counts, storage, store: createProfileStore({ storage, now: () => now }),
      fenced: (strict, budget) => createFencedLock({ request: lock, fence, read: () => storage.getItem(PROFILE_KEY), strict, budget }),
    };
    tabs.push(self); return self;
  }
  return {
    tab, lock, fence, faults, fenceLog,
    record: () => record, setRecord: next => { record = next; },
    saved: () => JSON.parse(backend.get(PROFILE_KEY)), bytes: () => backend.get(PROFILE_KEY),
    deliver: () => { while (held.length) held.shift()(); },
  };
}
const commitIn = (tab, request, lock) => commitCommand(request, { store: tab.store, lock, now: clock });

test('profileDigest is a stable change detector over stored text', () => {
  const text = JSON.stringify(rich());
  assert.equal(profileDigest(text), profileDigest(`${text}`));
  assert.notEqual(profileDigest(text), profileDigest(text.replace('"coins":100000', '"coins":100001')));
  assert.notEqual(profileDigest('ab'), profileDigest('ba'));
  assert.notEqual(profileDigest(''), profileDigest(null));
  assert.equal(profileDigest(null), 'absent');
  assert.throws(() => profileDigest({}), TypeError);
  assert.equal(FENCE_STRICT_MS > FENCE_LENIENT_MS, true);
});

test('N22 control: a plain lock lets the next tab decide on bytes from before the previous write', async () => {
  // This is the reviewed defect, reproduced in the model so the fixed cases below mean something.
  const base = rich(), [x, y] = spare(base);
  {
    const o = origin(base), a = o.tab(), b = o.tab();
    const qa = previewCommand(a.store.load(), { type: UPGRADE, uid: x }).request, qb = previewCommand(b.store.load(), { type: UPGRADE, uid: x }).request;
    const [ra, rb] = await Promise.all([commitIn(a, qa, o.lock), commitIn(b, qb, o.lock)]);
    assert.deepEqual([ra.duplicate, rb.duplicate], [false, false], 'both tabs report a fresh commit');
    assert.equal(a.counts.set + b.counts.set, 2, 'two whole-profile writes');
  }
  {
    const o = origin(base), a = o.tab(), b = o.tab();
    const qa = previewCommand(a.store.load(), { type: UPGRADE, uid: x }).request, qb = previewCommand(b.store.load(), { type: UPGRADE, uid: y }).request;
    const [ra, rb] = await Promise.all([commitIn(a, qa, o.lock), commitIn(b, qb, o.lock)]);
    assert.deepEqual([ra.status, rb.status], ['committed', 'committed']);
    assert.deepEqual([levelOf(o.saved(), x), levelOf(o.saved(), y)], [1, 2], 'tab A was told its upgrade committed, but it was overwritten');
  }
  {
    const o = origin(base), a = o.tab(), b = o.tab();
    const request = previewCommand(a.store.load(), { type: UPGRADE, uid: x }).request;
    const [, lookup] = await Promise.all([commitIn(a, request, o.lock), readCommandReceipt(request, { store: b.store, lock: o.lock })]);
    assert.equal(lookup.status, 'not-committed', 'the lookup answers "definitively" from old bytes');
  }
});

test('N22 the fenced lock makes the next holder see the previous write: one commit, then duplicate or identity-conflict', async () => {
  const base = rich(), [x, y] = spare(base);
  {
    const o = origin(base), a = o.tab(), b = o.tab();
    const qa = previewCommand(a.store.load(), { type: UPGRADE, uid: x }).request, qb = previewCommand(b.store.load(), { type: UPGRADE, uid: x }).request;
    const [ra, rb] = await Promise.all([commitIn(a, qa, a.fenced(true)), commitIn(b, qb, b.fenced(true))]);
    assert.deepEqual([ra.status, ra.duplicate, rb.status, rb.duplicate], ['committed', false, 'committed', true]);
    assert.deepEqual(rb.receipt, ra.receipt);
    assert.equal(a.counts.set + b.counts.set, 1, 'one profile write');
    assert.equal(o.saved().coins, base.coins - 120);
    assert.deepEqual(o.record(), { v: PROFILE_FENCE_VERSION, state: 'settled', digest: profileDigest(o.bytes()) });
  }
  {
    const o = origin(base), a = o.tab(), b = o.tab();
    const qa = previewCommand(a.store.load(), { type: UPGRADE, uid: x }).request, qb = previewCommand(b.store.load(), { type: UPGRADE, uid: y }).request;
    assert.equal(qa.commandId, qb.commandId);
    const [ra, rb] = await Promise.all([commitIn(a, qa, a.fenced(true)), commitIn(b, qb, b.fenced(true))]);
    assert.equal(ra.status, 'committed');
    assert.deepEqual([rb.status, rb.reason, rb.message], ['rejected', 'identity-conflict', COMMAND_MESSAGES['identity-conflict']]);
    assert.deepEqual([levelOf(o.saved(), x), levelOf(o.saved(), y)], [2, 1], 'the accepted upgrade stays');
    assert.equal(o.saved().commands.receipts.length, 1); assert.equal(a.counts.set + b.counts.set, 1);
  }
  {
    const o = origin(base), a = o.tab(), b = o.tab();
    const request = previewCommand(a.store.load(), { type: UPGRADE, uid: x }).request;
    const [ra, lookup] = await Promise.all([commitIn(a, request, a.fenced(true)), readCommandReceipt(request, { store: b.store, lock: b.fenced(true) })]);
    assert.equal(lookup.status, 'committed'); assert.deepEqual(lookup.receipt, ra.receipt);
    assert.equal(b.counts.set, 0, 'a lookup never writes the profile');
  }
});

test('N22 lenient writers wait for the previous write too, so a plain save no longer drops it', async () => {
  const base = rich();
  const gain = (tab, coins) => () => { const profile = tab.store.load(); profile.coins += coins; tab.store.save(profile); };
  {
    const o = origin(base), a = o.tab(), b = o.tab();
    await o.lock(gain(a, 5)); await o.lock(gain(b, 7));
    assert.equal(o.saved().coins, base.coins + 7, 'control: the second plain writer overwrote the first');
  }
  {
    const o = origin(base), a = o.tab(), b = o.tab();
    await Promise.all([a.fenced(false)(gain(a, 5)), b.fenced(false)(gain(b, 7))]);
    assert.equal(o.saved().coins, base.coins + 12);
    assert.equal(o.record().digest, profileDigest(o.bytes()));
  }
  {
    // A commit after a lenient write still sees it.
    const o = origin(base), a = o.tab(), b = o.tab(), [x] = spare(base);
    const request = previewCommand(b.store.load(), { type: UPGRADE, uid: x }).request;
    const [, result] = await Promise.all([a.fenced(false)(gain(a, 5)), commitIn(b, request, b.fenced(true))]);
    assert.equal(result.status, 'committed');
    assert.equal(o.saved().coins, base.coins + 5 - 120);
  }
});

test('N23 a strict holder that cannot prove its bytes are current refuses before deciding; nothing is written', async () => {
  const base = rich(), [x, y] = spare(base);
  const o = origin(base, { lag: null }), a = o.tab(), b = o.tab();
  const qa = previewCommand(a.store.load(), { type: UPGRADE, uid: x }).request, qb = previewCommand(b.store.load(), { type: UPGRADE, uid: y }).request;
  assert.equal((await commitIn(a, qa, a.fenced(true))).status, 'committed');
  const bytes = o.bytes();
  const refused = await commitIn(b, qb, b.fenced(true, 20));
  assert.deepEqual([refused.status, refused.reason, refused.message], ['rejected', 'unsynced', COMMAND_MESSAGES.unsynced]);
  assert.equal(b.counts.set, 0); assert.equal(o.bytes(), bytes);
  const lookup = await readCommandReceipt(qa, { store: b.store, lock: b.fenced(true, 20) });
  assert.deepEqual([lookup.status, lookup.message], ['unavailable', FENCE_MESSAGES.unsynced], 'never "not-committed" from old bytes');
  o.deliver();
  const retried = await commitIn(b, qb, b.fenced(true, 20));
  assert.deepEqual([retried.status, retried.reason], ['rejected', 'identity-conflict'], 'once the write arrives, the real answer');
  assert.equal(levelOf(o.saved(), x), 2);
});

test('N23 a holder that died between mark and settle leaves "writing": strict refuses, a lenient write heals it', async () => {
  const base = rich(), [x] = spare(base), o = origin(base), a = o.tab();
  a.store.save(a.store.load()); // canonical bytes, so the healing save below is byte-identical
  o.setRecord(WRITING);
  const request = previewCommand(a.store.load(), { type: UPGRADE, uid: x }).request;
  const writes = a.counts.set, refused = await commitIn(a, request, a.fenced(true));
  assert.deepEqual([refused.status, refused.reason], ['rejected', 'unsynced']); assert.equal(a.counts.set, writes);
  const untouched = o.bytes();
  await a.fenced(false)(() => a.store.save(a.store.load()));
  assert.equal(o.bytes(), untouched, 'like the startup save, it wrote identical bytes');
  assert.deepEqual(o.record(), { v: PROFILE_FENCE_VERSION, state: 'settled', digest: profileDigest(untouched) });
  assert.equal((await commitIn(a, request, a.fenced(true))).status, 'committed');
  for (const malformed of [{ v: 2, state: 'settled', digest: 'x' }, { v: 1, state: 'settled' }, 'settled', []]) {
    o.setRecord(malformed);
    const result = await commitIn(a, previewCommand(a.store.load(), { type: UPGRADE, uid: x }).request, a.fenced(true));
    assert.equal(result.reason, 'unsynced', JSON.stringify(malformed));
  }
});

test('N23 without a readable fence a strict holder refuses with the no-lock copy and reads nothing; lenient holders go on', async () => {
  const base = rich(), [x] = spare(base), o = origin(base), a = o.tab();
  const request = previewCommand(a.store.load(), { type: UPGRADE, uid: x }).request;
  o.faults.read = new ProfileFenceError('unavailable'); a.counts.get = 0;
  const refused = await commitIn(a, request, a.fenced(true));
  assert.deepEqual([refused.status, refused.reason, refused.message], ['rejected', 'unsynced', COMMAND_MESSAGES['no-lock']]);
  assert.deepEqual(a.counts, { get: 0, set: 0 }, 'the profile is neither read nor written');
  await a.fenced(false)(() => { const profile = a.store.load(); profile.coins += 1; a.store.save(profile); });
  assert.equal(o.saved().coins, base.coins + 1); assert.deepEqual(o.fenceLog, [], 'nothing recorded without a fence');
  o.faults.read = null; o.faults.write = () => true;
  const markFailed = await commitIn(a, request, a.fenced(true));
  assert.equal(markFailed.reason, 'unsynced', 'a strict holder that cannot mark refuses too');
  assert.equal(o.saved().coins, base.coins + 1);
  // The no-IndexedDB adapter rejects the same way.
  await assert.rejects(createIndexedDBFence(undefined).read(), { name: 'ProfileFenceError', code: 'unavailable' });
});

test('N23 a failed settle keeps the real result and leaves "writing" for strict holders to refuse', async () => {
  const base = rich(), [x, y] = spare(base), o = origin(base), a = o.tab();
  o.faults.write = next => next?.state === 'settled';
  const first = await commitIn(a, previewCommand(a.store.load(), { type: UPGRADE, uid: x }).request, a.fenced(true));
  assert.deepEqual([first.status, first.duplicate], ['committed', false]);
  assert.deepEqual(o.record(), WRITING);
  o.faults.write = null;
  const next = await commitIn(a, previewCommand(a.store.load(), { type: UPGRADE, uid: y }).request, a.fenced(true));
  assert.equal(next.reason, 'unsynced');
  assert.equal(levelOf(o.saved(), y), 1);
});

test('N23 a lenient holder that could not catch up records only its own write, never its old bytes', async () => {
  const base = rich(), o = origin(base, { lag: null }), a = o.tab(), b = o.tab();
  await a.fenced(false)(() => { const profile = a.store.load(); profile.coins += 5; a.store.save(profile); });
  const recorded = o.record();
  await assert.rejects(b.fenced(false, 20)(() => { throw Error('refused before writing'); }), /refused before writing/);
  assert.deepEqual(o.record(), recorded, 'the earlier record is put back');
  await b.fenced(false, 20)(() => { const profile = b.store.load(); profile.dust += 1; b.store.save(profile); });
  assert.equal(o.record().digest, profileDigest(o.bytes()), 'its own write becomes the record');
  assert.equal(o.saved().coins, base.coins, 'past the budget it proceeds as before the fence');
});

test('N23 a stalled fence counts as unavailable and releases the lock instead of holding it', async () => {
  const base = rich(), [x] = spare(base), o = origin(base), a = o.tab();
  const stalled = { read: () => new Promise(() => {}), write: () => new Promise(() => {}) };
  const lock = strict => createFencedLock({ request: o.lock, fence: stalled, read: () => a.storage.getItem(PROFILE_KEY), strict, ioBudget: 20 });
  const request = previewCommand(a.store.load(), { type: UPGRADE, uid: x }).request;
  const refused = await commitIn(a, request, lock(true));
  assert.deepEqual([refused.status, refused.reason, refused.message], ['rejected', 'unsynced', COMMAND_MESSAGES['no-lock']]);
  await lock(false)(() => { const profile = a.store.load(); profile.coins += 1; a.store.save(profile); });
  assert.equal(o.saved().coins, base.coins + 1, 'a lenient writer still saves');
  assert.equal(await o.lock(() => 'free'), 'free', 'the lock was released');
});

/** A small in-memory IndexedDB: one database, one object store, async events. */
function fakeIndexedDB({ failOpen = false, abort = false } = {}) {
  const databases = new Map(), opened = [];
  const fire = (target, type, extra = {}) => queueMicrotask(() => { Object.assign(target, extra); target[`on${type}`]?.(); });
  return {
    opened,
    open(name, version) {
      const request = {};
      opened.push([name, version]);
      setTimeout(() => {
        if (failOpen) return fire(request, 'error', { error: new DOMException('Denied', 'SecurityError') });
        let entry = databases.get(name);
        const upgrade = !entry || entry.version < version;
        entry ??= { version, stores: new Map() };
        databases.set(name, entry); entry.version = version;
        const db = {
          objectStoreNames: { contains: store => entry.stores.has(store) },
          createObjectStore: store => entry.stores.set(store, new Map()),
          transaction(store, mode) {
            const records = entry.stores.get(store), transaction = { mode };
            transaction.objectStore = () => ({
              get: key => { const r = {}; fire(r, 'success', { result: structuredClone(records.get(key)) }); return r; },
              put: (value, key) => { const r = {}; if (mode !== 'readwrite') throw Error('read only'); records.set(key, structuredClone(value)); fire(r, 'success', { result: key }); return r; },
              delete: key => { const r = {}; records.delete(key); fire(r, 'success', { result: undefined }); return r; },
            });
            setTimeout(() => abort ? fire(transaction, 'abort', { error: new DOMException('Aborted', 'AbortError') }) : fire(transaction, 'complete'));
            return transaction;
          },
        };
        request.result = db;
        if (upgrade) request.onupgradeneeded?.();
        fire(request, 'success');
      });
      return request;
    },
  };
}

test('N23 the IndexedDB adapter keeps one record per profile key and fails closed', async () => {
  const factory = fakeIndexedDB(), fence = createIndexedDBFence(factory);
  assert.equal(await fence.read(), null);
  await fence.write({ v: 1, state: 'settled', digest: '3:abc' });
  assert.deepEqual(await fence.read(), { v: 1, state: 'settled', digest: '3:abc' });
  const gaveUp = new AbortController(); gaveUp.abort();
  await assert.rejects(fence.write({ v: 1, state: 'writing' }, { signal: gaveUp.signal }), { name: 'ProfileFenceError', code: 'unavailable' });
  assert.deepEqual(await fence.read(), { v: 1, state: 'settled', digest: '3:abc' }, 'an abandoned write never starts');
  await fence.write(null);
  assert.equal(await fence.read(), null);
  assert.deepEqual(factory.opened, [[PROFILE_FENCE_DB, PROFILE_FENCE_VERSION]], 'one connection is reused');
  const other = createIndexedDBFence(factory, { key: 'other' });
  assert.equal(await other.read(), null, 'records are keyed');
  await fence.write({ v: 1, state: 'writing' });
  assert.deepEqual(await createIndexedDBFence(factory, { key: PROFILE_KEY }).read(), { v: 1, state: 'writing' }, 'the default key is the profile key');
  assert.equal(PROFILE_FENCE_STORE, 'fence');
  await assert.rejects(createIndexedDBFence(fakeIndexedDB({ failOpen: true })).read(), { name: 'SecurityError' });
  await assert.rejects(createIndexedDBFence(fakeIndexedDB({ abort: true })).write({ v: 1, state: 'writing' }), { name: 'AbortError' });
  const throwing = createIndexedDBFence({ open() { throw new DOMException('Blocked', 'SecurityError'); } });
  await assert.rejects(throwing.read(), { name: 'SecurityError' });
});
