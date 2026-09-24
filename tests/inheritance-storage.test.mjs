import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, PROFILE_KEY } from '../progression.mjs';
import { mintInstance, setInstanceXP, syncCollection } from '../collection.mjs';
import { previewInheritance, inheritInstances } from '../inheritance.mjs';
import { createProfileStore } from '../profile-store.mjs';
import { createSnapshot, restoreSnapshot } from '../cloud-save.mjs';

const now = '2026-09-22T12:00:00.000Z';
function fixture() {
  let profile = createProfile({ now });
  const ids = [];
  for (const [printId, xp] of [['wx01-005-tr1', 90], ['legacy/wukong', 40], ['wx01-005-base', 20]]) {
    const minted = mintInstance(profile, 'wukong', { printId, now, source: 'inheritance-test' });
    profile = setInstanceXP(minted.profile, minted.instance.uid, xp); ids.push(minted.instance.uid);
  }
  Object.assign(profile.instances.find(card => card.uid === ids[0]), { locked: true, battles: 7, wins: 4 });
  return { profile: syncCollection(profile), target: ids[0], donors: ids.slice(1) };
}

test('consumed UID gaps survive local/cloud round trips and are never recycled by the next mint', () => {
  const { profile, target, donors } = fixture(), before = structuredClone(profile);
  const result = inheritInstances(profile, previewInheritance(profile, target, donors));
  const expected = structuredClone(before);
  expected.instances = expected.instances.filter(card => !donors.includes(card.uid));
  Object.assign(expected.instances.find(card => card.uid === target), { xp: 310, level: 3 });
  assert.deepEqual(result.profile, syncCollection(expected));
  assert.deepEqual(profile, before);
  const data = new Map(), store = createProfileStore({ storage: { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }, now: () => now });
  store.save(result.profile);
  assert.deepEqual(store.load(), result.profile);
  assert.deepEqual(restoreSnapshot(createSnapshot(store.load()), { now }), result.profile);
  assert.equal(result.profile.instanceSerial, before.instanceSerial);
  const next = mintInstance(store.load(), 'wukong', { printId: 'wx01-005-base', now });
  assert.equal(next.instance.uid, `card-${String(before.instanceSerial + 1).padStart(6, '0')}`);
  assert(!donors.includes(next.instance.uid));
  assert.throws(() => inheritInstances(store.load(), result), 'result shape cannot become a replay grant');
});

test('quota refusal retains all donor bytes; fresh retry commits once and stale quotes fail without writing', () => {
  const { profile, target, donors } = fixture(), original = JSON.stringify(profile);
  const data = new Map([[PROFILE_KEY, original]]);
  let quota = true, writes = 0;
  const store = createProfileStore({ storage: { getItem: key => data.get(key) ?? null, setItem(key, value) { if (quota) throw new DOMException('Quota fixture', 'QuotaExceededError'); data.set(key, value); writes++; } }, now: () => now });
  const quote = previewInheritance(store.load(), target, donors);
  assert.throws(() => store.save(inheritInstances(store.load(), quote).profile), { name: 'QuotaExceededError' });
  assert.equal(data.get(PROFILE_KEY), original); assert.equal(writes, 0);
  quota = false;
  store.save(inheritInstances(store.load(), quote).profile);
  assert.equal(writes, 1); assert.equal(store.load().instances.find(card => card.uid === target).xp, 310);
  const saved = data.get(PROFILE_KEY);
  assert.throws(() => store.save(inheritInstances(store.load(), quote).profile));
  assert.equal(data.get(PROFILE_KEY), saved); assert.equal(writes, 1);
});
