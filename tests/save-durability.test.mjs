/** D2 save durability (docs/LOCAL-COMMANDS.md §11 file import, §19): the journey export, file
 * import through the shared strict restore, the device-local save status and the
 * persistent-storage request. Synthetic journeys only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createProfile, claimLogin, sellInstance, beginBattle, startActivity, buyPack, NODES, PROFILE_KEY, PROFILE_VERSION } from '../progression.mjs';
import { mintInstance, setInstanceXP, saveInstanceDeck, getActiveDeck, syncCollection } from '../collection.mjs';
import { LEGACY_CARD_IDS } from '../engine.mjs';
import { createSnapshot, backupProfile, fingerprintProfile, SNAPSHOT_FORMAT } from '../cloud-save.mjs';
import { createProfileStore, RECOVERY_KEY, RESTORE_MESSAGES } from '../profile-store.mjs';
import { createFencedLock, ProfileFenceError, FENCE_MESSAGES, PROFILE_FENCE_VERSION } from '../profile-fence.mjs';
import { previewCommand, commitCommand } from '../local-commands.mjs';
import {
  exportText, exportJourney, exportFilename, checkJourneyText, importJourney, requestPersistence, checkPersistence, isStandalone,
  journeySummary, MAX_IMPORT_BYTES, IMPORT_MESSAGES, LEGACY_EXPORT_VERSIONS,
} from '../platform.mjs';
import { createSaveStatus, normalizeSaveStatus, SAVES_KEY } from '../save-status.mjs';
import { saveStatusMarkup, saveNoticeMarkup, importConfirmMarkup } from '../save-ui.mjs';
import { nearEnvelopeProfile } from './support/profile-envelope.mjs';

const now = '2026-09-21T12:00:00.000Z';
const at = '2026-09-21T12:34:56.789Z';
const UPGRADE = 'care.upgrade';
const fresh = () => createProfile({ now });
/** A fire-mountain activity in progress (its entry needs the original stories cleared). */
const inActivity = () => startActivity({ ...fresh(), cleared: NODES.filter(node => !node.campaign).map(node => node.id) }, { route: 'loaner', rng: () => 0.2, now }).profile;
const withoutCommands = profile => { const { commands, ...rest } = profile; return rest; };
const spare = profile => profile.instances.filter(item => !getActiveDeck(profile).instanceIds.includes(item.uid)).map(item => item.uid);
const levelOf = (profile, uid) => profile.instances.find(item => item.uid === uid).level;
const copies = profile => [...profile.instances, ...profile.merchantVault.map(entry => entry.instance)].map(card => [card.uid, card.cardId, card.printId, card.xp, card.level]);

/** A journey with XP, a merchant-held copy, a second deck and (optionally) committed commands. */
function travelled({ coins = 50_000 } = {}) {
  let profile = claimLogin(fresh(), now);
  const added = mintInstance(profile, 'qingxiao', { source: 'npc-market', now });
  profile = setInstanceXP(added.profile, added.instance.uid, 430);
  profile = sellInstance(profile, added.instance.uid, now);
  const extra = mintInstance(profile, 'kongzi', { source: 'npc-market', now });
  profile = setInstanceXP(extra.profile, extra.instance.uid, 260);
  profile = saveInstanceDeck(profile, { slotId: 'deck-2', name: '千古同行', instanceIds: [...getActiveDeck(profile).instanceIds].reverse() });
  return { ...profile, coins, dust: 5000 };
}

/** One origin: a Map with a write log, an exclusive FIFO lock and an IndexedDB-like fence. */
function origin(profile) {
  const data = new Map(profile === undefined ? [] : [[PROFILE_KEY, JSON.stringify(profile)]]), writes = [];
  const storage = {
    getItem: key => data.get(key) ?? null,
    setItem(key, value) { writes.push(key); data.set(key, value); },
    removeItem(key) { writes.push(`-${key}`); data.delete(key); },
  };
  let record = null, tail = Promise.resolve();
  const fence = {
    async read() { await null; return record === null ? null : structuredClone(record); },
    async write(next) { await null; record = next === null ? null : structuredClone(next); },
  };
  const request = callback => { const run = tail.then(() => callback()); tail = run.catch(() => {}); return run; };
  const store = createProfileStore({ storage, now: () => now });
  return {
    data, writes, storage, store, fence,
    strict: () => createFencedLock({ request, fence, read: () => storage.getItem(PROFILE_KEY), strict: true, budget: 20 }),
    setRecord: next => { record = next; },
    saved: () => JSON.parse(data.get(PROFILE_KEY)),
  };
}
/** Mirrors app.mjs: a checked file, then restoreLocalProfile's strict lock and shared restore. */
async function importInto(o, file, { busy = false } = {}) {
  const result = await importJourney(file, { now: new Date(now) });
  if (!result.ok) return result;
  const expectedFingerprint = fingerprintProfile(o.store.load());
  return o.strict()(() => o.store.restore(createdFrom(result), { expectedFingerprint, busy, savedAt: at }));
}
// restoreLocalProfile hands the store restoreSnapshot(snapshot); checkJourneyText already ran it.
const createdFrom = result => JSON.parse(JSON.stringify(result.snapshot.profile));
const blob = text => new Blob([text], { type: 'application/json' });
/** What v0.4.1, v0.5.0 and v0.5.1 exported: the raw v3 profile. Checked against `git archive
 * v0.5.1` (2026-10-12): v0.5.1's own claimLogin(createProfile()) serialises to exactly this
 * projection of the same journey, which has no `weekly` (v0.5.1 had none). */
function v051Profile(profile = claimLogin(fresh(), now)) {
  const raw = structuredClone(profile);
  raw.version = 3; raw.collectionVersion = 1; raw.collectionExpansion = 1; delete raw.wx01; delete raw.expansion; delete raw.weekly;
  for (const card of [...raw.instances, ...raw.merchantVault.map(entry => entry.instance)]) delete card.printId;
  for (const key of ['inventory', 'levels']) raw[key] = Object.fromEntries(LEGACY_CARD_IDS.map(id => [id, raw[key][id]]));
  if (raw.pending) delete raw.pending.cardPrints;
  return raw;
}
/** The v4 namespace load() also migrates (no public build exported it). */
const v4Profile = profile => { const raw = structuredClone(profile); raw.version = 4; delete raw.expansion; return raw; };

test('D2 export then import keeps every UID, XP, deck and merchant copy, and the file is the existing export format', async () => {
  const base = travelled(), o = origin(base);
  // Commit an upgrade so the exported journey carries a command ledger.
  const lock = o.strict(), [uid] = spare(base);
  const committed = await commitCommand(previewCommand(o.store.load(), { type: UPGRADE, uid }).request, { store: o.store, lock, now: () => new Date(at) });
  assert.equal(committed.status, 'committed');
  const exported = o.store.load();
  assert.ok(Object.hasOwn(exported, 'commands'));

  // exportJourney downloads exactly the bytes app.mjs downloaded before: the raw profile, indented.
  const downloads = [];
  let saved = null;
  const document = { createElement: () => ({ click() { downloads.push({ href: this.href, download: this.download }); } }) };
  const urls = { createObjectURL: value => { saved = value; return 'blob:fixture'; }, revokeObjectURL: () => {} };
  const result = exportJourney(exported, { document, URL: urls, setTimeout: () => {}, now: new Date(now) });
  assert.deepEqual(downloads, [{ href: 'blob:fixture', download: exportFilename(exported) }]);
  assert.equal(exportFilename(exported), `萬象契旅程-${exported.daily.date}.json`);
  const text = await saved.text();
  assert.equal(text, JSON.stringify(exported, null, 2), 'unchanged export format, ledger included');
  assert.deepEqual([result.importable, result.reason, result.bytes], [true, null, Buffer.byteLength(text)]);

  // A fresh device (cleared site data) imports it.
  const device = origin(fresh());
  const restored = await importInto(device, blob(text));
  assert.deepEqual(copies(restored), copies(exported), 'every UID, printing, XP and level');
  assert.deepEqual(restored.deckSlots, exported.deckSlots);
  assert.equal(restored.activeDeckId, exported.activeDeckId);
  assert.deepEqual(restored.merchantVault, exported.merchantVault);
  assert.equal(fingerprintProfile(device.saved()), fingerprintProfile(backupProfile(exported)), 'the journey is identical without the device-local ledger');
  assert.equal(Object.hasOwn(device.saved(), 'commands'), false, "the file's ledger belongs to the device that wrote it");
  assert.deepEqual(device.writes, [RECOVERY_KEY, PROFILE_KEY], 'the recovery copy first, then exactly one profile write');
});

test('D2 the compact fallback keeps the largest savable journey importable', () => {
  const large = nearEnvelopeProfile(fresh(), { headroom: 40 });
  const text = exportText(large);
  assert.ok(Buffer.byteLength(JSON.stringify(large, null, 2)) > MAX_IMPORT_BYTES, 'the indented export would not fit');
  assert.equal(text, JSON.stringify(large), 'written compactly instead');
  assert.ok(Buffer.byteLength(text) <= MAX_IMPORT_BYTES);
  const result = checkJourneyText(text, { now: new Date(now) });
  assert.equal(result.ok, true);
  assert.equal(result.summary.cards, large.instances.length);
});

test('D2 tampered, oversize, unparsable, foreign, old, future-version and mid-battle files are refused with 0 bytes written', async () => {
  const base = travelled(), text = JSON.stringify(base, null, 2);
  const edit = change => { const value = structuredClone(base); change(value); return JSON.stringify(value, null, 2); };
  const [uid] = spare(base);
  const activity = inActivity();
  const cases = [
    ['too-large', blob('x'.repeat(MAX_IMPORT_BYTES + 1))],
    ['unparsable', blob(text.slice(0, -2))],
    ['unparsable', blob('')],
    ['not-export', blob(JSON.stringify(createSnapshot(base)))],
    ['not-export', blob(JSON.stringify({ [PROFILE_KEY]: text }))],
    ['not-export', blob('[1,2,3]')],
    ['future-version', blob(edit(value => { value.version = PROFILE_VERSION + 1; }))],
    ['old-version', blob(edit(value => { value.version = 2; }))],
    // A v5 journey relabelled v4 fails the legacy check: it carries v5-only `expansion`.
    ['invalid', blob(edit(value => { value.version = 4; }))],
    ['unfinished', blob(JSON.stringify(beginBattle(base, { kind: 'arena', rng: () => 0.4, now }).profile))],
    ['unfinished', blob(JSON.stringify(activity))],
    ['tampered', blob(edit(value => { value.instances.find(card => card.uid === uid).xp = 999; }))],
    ['tampered', blob(edit(value => { value.inventory.qingxiao += 3; }))],
    ['tampered', blob(edit(value => { value.extra = 'unknown field'; }))],
    ['tampered', blob(edit(value => { value.coins = -50; }))],
    ['tampered', blob(edit(value => { value.instances[1].uid = value.instances[0].uid; }))],
    ['invalid', blob(edit(value => { value.commands = { version: 1, nextSeq: 3, retiredBelow: 1, receipts: [] }; }))],
    ['invalid', blob(text.replace('"coins"', '"__proto__": {"polluted": true},\n  "coins"'))],
    ['invalid', blob(edit(value => { delete value.daily; }))],
  ];
  for (const [reason, file] of cases) {
    const o = origin(base), before = new Map(o.data);
    const result = await importInto(o, file);
    assert.deepEqual([result.ok, result.reason, result.message], [false, reason, IMPORT_MESSAGES[reason]], reason);
    assert.match(result.message, /本機旅程未有更改/);
    assert.deepEqual(o.writes, [], `${reason}: 0 writes`);
    assert.deepEqual(o.data, before, `${reason}: 0 bytes changed`);
  }
  assert.equal({}.polluted, undefined);
  // An oversize file is refused from its size, before it is read.
  let read = false;
  const huge = { size: MAX_IMPORT_BYTES + 1, text: async () => { read = true; return ''; } };
  assert.equal((await importJourney(huge)).reason, 'too-large');
  assert.equal(read, false);
  assert.equal((await importJourney(null)).reason, 'unreadable');
  assert.equal((await importJourney({ size: 5, text: async () => { throw Error('gone'); } })).reason, 'unreadable');
  // A self-consistent edit is not detectable: a local save is editable, never an ownership claim.
  assert.equal(checkJourneyText(edit(value => { value.coins = 99_999; })).ok, true);
});

test('D2 an export from v0.4.1–v0.5.1 (profile v3) is migrated as load() migrates it and restored through the same strict path', async () => {
  assert.deepEqual(LEGACY_EXPORT_VERSIONS, [3, 4]);
  // The 16-card journey every v0.5.1 player started with, as its footer export wrote it.
  const first = claimLogin(fresh(), now), text = JSON.stringify(v051Profile(first), null, 2);
  const checked = checkJourneyText(text, { now: new Date(now) });
  assert.equal(checked.ok, true, checked.message);
  assert.equal(checked.legacy, true);
  assert.deepEqual([checked.snapshot.version, checked.snapshot.profile.version], [3, PROFILE_VERSION], 'migrated to v5, then wrapped as a v5 backup');
  assert.equal(fingerprintProfile(checked.snapshot.profile), fingerprintProfile(first), 'the same journey, every copy given its legacy printing');
  assert.equal(checked.summary.cards, 16);
  // The same file, migrated by load() as if this device still held it under its v3 key.
  const kept = createProfileStore({ storage: { getItem: key => (key === 'shanhai.profile.v3' ? text : null) }, now: () => now }).load();
  assert.equal(fingerprintProfile(checked.snapshot.profile), fingerprintProfile(kept));

  // A travelled journey (XP, a merchant-held copy, a second deck) restores onto a new device:
  // recovery copy first, then one profile write.
  const journey = travelled({ coins: 4321 }), device = origin(fresh());
  const restored = await importInto(device, blob(JSON.stringify(v051Profile(journey), null, 2)));
  assert.equal(restored.version, PROFILE_VERSION);
  assert.deepEqual(copies(restored), copies(journey), 'every UID, legacy printing, XP and level');
  assert.deepEqual(restored.deckSlots, journey.deckSlots);
  assert.deepEqual(restored.merchantVault, journey.merchantVault);
  assert.deepEqual([restored.coins, restored.dust, restored.xp], [4321, 5000, journey.xp]);
  assert.deepEqual(device.writes, [RECOVERY_KEY, PROFILE_KEY]);
  assert.equal(device.saved().version, PROFILE_VERSION);

  // v0.5.1 caps a card at 99,999 copies, past the 2,000 a legacy cloud backup holds: such a
  // file is migrated as load() migrates it, then fits the v5 backup.
  const base = fresh();
  const large = syncCollection({ ...base, instanceSerial: 2001, instances: [...base.instances, ...Array.from({ length: 2001 - base.instances.length }, (_, i) => ({ ...base.instances[0], uid: `card-${String(i + base.instances.length + 1).padStart(6, '0')}` }))] });
  const big = checkJourneyText(JSON.stringify(v051Profile(large), null, 2), { now: new Date(now) });
  assert.equal(big.ok, true, big.message);
  assert.equal(big.summary.cards, 2001);

  // The v4 namespace load() migrates is accepted the same way.
  assert.equal(checkJourneyText(JSON.stringify(v4Profile(travelled()), null, 2), { now: new Date(now) }).legacy, true);
  assert.equal(checkJourneyText(exportText(travelled()), { now: new Date(now) }).legacy, false);

  // load()'s strict legacy rules refuse, with 0 writes: a battle exported unfinished, a ledger
  // (v0.5.1 never wrote one), an edited copy, v5-only data, an unsafe key and a missing field.
  const edit = change => { const value = v051Profile(travelled()); change(value); return JSON.stringify(value, null, 2); };
  const cases = [
    ['unfinished', JSON.stringify(v051Profile(beginBattle(travelled(), { kind: 'arena', rng: () => 0.4, now }).profile), null, 2)],
    ['invalid', edit(value => { value.commands = { version: 1, nextSeq: 3, retiredBelow: 1, receipts: [] }; })],
    ['invalid', edit(value => { value.instances[1].xp = 999; })],
    ['invalid', edit(value => { value.inventory.qingxiao += 3; })],
    ['invalid', edit(value => { value.expansion = fresh().expansion; })],
    ['invalid', edit(value => { delete value.pending; })],
    ['invalid', edit(value => { value.extra = 'unknown field'; })],
    ['invalid', edit(value => { value.collectionVersion = 2; })],
    ['invalid', edit(value => { value.instances[1].uid = value.instances[0].uid; })],
    ['invalid', edit(value => { value.daily.date = 'someday'; })],
    ['invalid', edit(value => { value.coins = 1; }).replace('"coins"', '"__proto__": {"polluted": true},\n  "coins"')],
    ['old-version', edit(value => { value.version = 2; })],
  ];
  for (const [reason, text] of cases) {
    const o = origin(travelled()), before = new Map(o.data);
    const result = await importInto(o, blob(text));
    assert.deepEqual([result.ok, result.reason], [false, reason], `${reason}: ${text.slice(0, 40)}`);
    assert.deepEqual(o.writes, [], reason); assert.deepEqual(o.data, before, reason);
  }
  assert.equal({}.polluted, undefined);
  assert.match(IMPORT_MESSAGES['old-version'], /v0\.4\.1 之前/, 'only a file from before the first public build is old');
});

test('D2 an import is refused with 0 writes during a battle, an activity, an open WX receipt, a changed journey or a "writing" fence', async () => {
  const backup = blob(JSON.stringify({ ...travelled(), coins: 777 }, null, 2));
  const cases = [
    ['battle', beginBattle(travelled(), { kind: 'arena', rng: () => 0.4, now }).profile, RESTORE_MESSAGES.unfinished],
    ['activity', inActivity(), RESTORE_MESSAGES.unfinished],
  ];
  for (const [label, current, message] of cases) {
    const o = origin(current), before = new Map(o.data);
    await assert.rejects(importInto(o, backup), { message }, label);
    assert.deepEqual(o.writes, [], label); assert.deepEqual(o.data, before, label);
  }
  {
    // economyBusy: the same tab is mid-action.
    const o = origin(travelled()), before = new Map(o.data);
    await assert.rejects(importInto(o, backup, { busy: true }), { message: RESTORE_MESSAGES.unfinished });
    assert.deepEqual(o.writes, []); assert.deepEqual(o.data, before);
  }
  {
    // An unacknowledged WX opening receipt, made by the rules.
    const opened = buyPack({ ...travelled(), coins: 5000 }, { set: 'wx01', rng: () => 0.4, now }).profile;
    assert.ok(opened.wx01.receipt);
    const o = origin(opened), before = new Map(o.data);
    await assert.rejects(importInto(o, backup), { message: RESTORE_MESSAGES.receipt });
    assert.deepEqual(o.writes, []); assert.deepEqual(o.data, before);
  }
  {
    // Another tab saved after the dialog opened: the confirmed fingerprint no longer matches.
    const o = origin(travelled()), result = await importJourney(backup, { now: new Date(now) });
    const expectedFingerprint = fingerprintProfile(o.store.load());
    o.store.save({ ...o.store.load(), dust: 1 }); o.writes.length = 0;
    const before = new Map(o.data);
    await assert.rejects(o.strict()(() => o.store.restore(createdFrom(result), { expectedFingerprint, savedAt: at })), { message: RESTORE_MESSAGES.changed });
    assert.deepEqual(o.writes, []); assert.deepEqual(o.data, before);
  }
  {
    // A holder saved and never settled the fence: the strict lock refuses before the restore runs.
    const o = origin(travelled()), before = new Map(o.data);
    o.setRecord({ v: PROFILE_FENCE_VERSION, state: 'writing' });
    await assert.rejects(importInto(o, backup), error => error instanceof ProfileFenceError && error.code === 'unsettled' && error.message === FENCE_MESSAGES.unsettled);
    assert.deepEqual(o.writes, []); assert.deepEqual(o.data, before);
    assert.equal(o.data.has(RECOVERY_KEY), false);
  }
});

test('D2 after an import the replaced lineage is retired, RECOVERY_KEY holds the previous journey and earlier command IDs expire', async () => {
  const base = travelled(), o = origin(base), lock = o.strict(), [x, y] = spare(base);
  assert.equal((await commitCommand(previewCommand(o.store.load(), { type: UPGRADE, uid: x }).request, { store: o.store, lock, now: () => new Date(at) })).status, 'committed');
  const outstanding = previewCommand(o.store.load(), { type: UPGRADE, uid: y }).request;
  assert.equal(outstanding.commandId, 'cmd-2', 'a card page painted before the import');
  const previous = o.store.load();
  // The file comes from another device whose own ledger is further along.
  const other = { ...travelled({ coins: 4321 }), commands: { version: 1, nextSeq: 10, retiredBelow: 10, receipts: [] } };
  o.writes.length = 0;
  const restored = await importInto(o, blob(JSON.stringify(other, null, 2)));
  assert.deepEqual(o.writes, [RECOVERY_KEY, PROFILE_KEY], 'exactly one profile write, after the recovery copy');
  assert.equal(restored.coins, 4321);
  assert.deepEqual(o.saved().commands, { version: 1, nextSeq: 3, retiredBelow: 3, receipts: [] }, "this device's lineage is retired (§15 decision 1); the file's ledger is not taken");
  const recovery = JSON.parse(o.data.get(RECOVERY_KEY));
  assert.equal(recovery.savedAt, at);
  assert.equal(recovery.snapshot.format, SNAPSHOT_FORMAT);
  assert.deepEqual(recovery.snapshot.profile, withoutCommands(previous), 'the previous journey can be recovered');
  assert.equal(levelOf(recovery.snapshot.profile, x), 2, 'including the upgrade committed before the import');
  o.writes.length = 0;
  const late = await commitCommand(outstanding, { store: o.store, lock: o.strict(), now: () => new Date(at) });
  assert.deepEqual([late.status, late.reason], ['rejected', 'expired'], 'a command ID issued before the import is expired');
  assert.deepEqual(o.writes, []);
  assert.equal(previewCommand(o.store.load(), { type: UPGRADE, uid: y }).request.commandId, 'cmd-3', 'new previews continue after the boundary');

  // Without a ledger there is nothing to retire (§15 decision 1 as proposed). An earlier
  // quote is refused as stale when the imported journey's copy is not the one it priced.
  const plain = origin(travelled()), [z] = spare(base);
  const quote = previewCommand(plain.store.load(), { type: UPGRADE, uid: z }).request;
  assert.equal(quote.commandId, 'cmd-1');
  await importInto(plain, blob(JSON.stringify(setInstanceXP(travelled(), z, 500), null, 2)));
  assert.equal(Object.hasOwn(plain.saved(), 'commands'), false);
  const coins = plain.saved().coins;
  const refused = await commitCommand(quote, { store: plain.store, lock: plain.strict(), now: () => new Date(at) });
  assert.deepEqual([refused.status, refused.reason], ['rejected', 'stale']);
  assert.equal(levelOf(plain.saved(), z), levelOf(setInstanceXP(travelled(), z, 500), z), 'nothing was spent on the imported copy');
  assert.equal(plain.saved().coins, coins);

  // The known gap (§13 item 2): re-importing this device's own export, which holds that copy
  // unchanged, leaves the quote's slot free, so it commits once, at its quoted price.
  const same = origin(travelled()), journey = same.store.load();
  const quoted = previewCommand(journey, { type: UPGRADE, uid: z }), kept = quoted.request;
  assert.equal(kept.commandId, 'cmd-1');
  await importInto(same, blob(exportText(journey)));
  assert.equal(Object.hasOwn(same.saved(), 'commands'), false, 'still no ledger after the import');
  const before = same.saved();
  same.writes.length = 0;
  const landed = await commitCommand(kept, { store: same.store, lock: same.strict(), now: () => new Date(at) });
  assert.deepEqual([landed.status, landed.duplicate], ['committed', false], 'not expired: nothing was retired');
  assert.deepEqual(same.writes, [PROFILE_KEY], 'one write');
  assert.deepEqual([same.saved().coins, same.saved().dust], [before.coins - quoted.costs.coins, before.dust - quoted.costs.dust], 'charged exactly the quoted price');
  assert.equal(levelOf(same.saved(), z), levelOf(before, z) + 1, 'the upgrade the player pressed, once');
  assert.deepEqual(same.saved().commands.receipts.map(receipt => receipt.seq), [1]);
});

test('D2 persist() is requested once, at the first win or first pack, never on load; an installed app asks at launch', async () => {
  function device({ persisted = false, granted = false } = {}) {
    const data = new Map(), calls = { persist: 0, persisted: 0 };
    const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
    const navigator = { storage: {
      persist: async () => { calls.persist++; return granted; },
      persisted: async () => { calls.persisted++; return persisted; },
    } };
    const open = () => createSaveStatus({ storage, navigator, now: () => new Date(at) });
    return { data, calls, open };
  }
  {
    const d = device(), saves = d.open();
    await saves.launch({ fresh: true, standalone: false });
    await saves.launch({ fresh: false, standalone: false });
    assert.deepEqual(d.calls, { persist: 0, persisted: 0 }, 'an ordinary page load never asks');
    await saves.battleFinished('opponent');
    assert.equal(d.calls.persist, 0, 'a loss is not the first win');
    const outcome = await saves.battleFinished('player');
    assert.deepEqual(outcome, { state: 'denied', asked: true });
    assert.equal(d.calls.persist, 1, 'exactly once after the first win');
    await saves.battleFinished('player'); await saves.packOpened();
    await d.open().launch({ fresh: false });
    await d.open().battleFinished('player');
    assert.equal(d.calls.persist, 1, 'never again for later wins, packs or reloads');
    assert.deepEqual(saves.status().persistence, { state: 'denied', at, trigger: 'first-win' });
    assert.equal(Object.hasOwn(JSON.parse(d.data.get(SAVES_KEY)), 'persistence'), true, 'recorded device-locally');
    // An installed web app asks again at launch until the browser agrees.
    await d.open().launch({ standalone: true });
    assert.equal(d.calls.persist, 2);
    assert.equal(d.open().status().persistence.trigger, 'standalone');
  }
  {
    const d = device({ granted: true }), saves = d.open();
    await saves.packOpened();
    assert.equal(d.calls.persist, 1, 'the first pack, when it comes first');
    await saves.battleFinished('player');
    assert.equal(d.calls.persist, 1);
    assert.equal(saves.status().persistence.state, 'granted');
    await d.open().launch({ standalone: true });
    assert.equal(d.calls.persist, 1, 'granted storage is not asked again');
  }
  {
    const d = device({ persisted: true }), saves = d.open();
    assert.deepEqual(await saves.battleFinished('player'), { state: 'granted', asked: false });
    assert.equal(d.calls.persist, 0, 'already persisted storage is reported, not asked');
  }
  {
    // Two milestones before the browser answers share one request.
    const d = device(), saves = d.open();
    await Promise.all([saves.battleFinished('player'), saves.packOpened()]);
    assert.equal(d.calls.persist, 1);
  }
  {
    // A page closed before the browser answered leaves "requested". The next page start asks
    // persisted() (no prompt) instead of persist(), and records granted or unanswered.
    for (const [kept, state] of [[true, 'granted'], [false, 'unanswered']]) {
      const data = new Map(), calls = { persist: 0, persisted: 0 };
      const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
      const pending = { storage: { persist: () => { calls.persist++; return new Promise(() => {}); }, persisted: async () => { calls.persisted++; return false; } } };
      createSaveStatus({ storage, navigator: pending, now: () => new Date(at) }).battleFinished('player');
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.equal(JSON.parse(data.get(SAVES_KEY)).persistence.state, 'requested');
      const later = { storage: { persist: async () => { calls.persist++; return true; }, persisted: async () => { calls.persisted++; return kept; } } };
      const next = createSaveStatus({ storage, navigator: later, now: () => new Date(at) });
      assert.equal(await next.launch({ fresh: false, standalone: false }), null);
      assert.deepEqual(next.status().persistence, { state, at, trigger: 'first-win' });
      assert.match(saveStatusMarkup(next.status()), new RegExp(`data-persistence="${state}"`));
      await next.battleFinished('player'); await next.packOpened();
      assert.equal(calls.persist, 1, 'persist() was never asked again');
    }
    assert.match(saveStatusMarkup({ persistence: { state: 'unanswered', at, trigger: 'first-win' } }), /長期保存：未有回覆/);
    // An answer that lands first is kept.
    const data = new Map([[SAVES_KEY, JSON.stringify({ v: 1, persistence: { state: 'requested', at, trigger: 'first-pack' } })]]);
    const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
    const racing = createSaveStatus({ storage, navigator: { storage: { persisted: async () => {
      data.set(SAVES_KEY, JSON.stringify({ v: 1, persistence: { state: 'denied', at, trigger: 'first-pack' } })); return false;
    } } }, now: () => new Date(at) });
    await racing.launch();
    assert.equal(racing.status().persistence.state, 'denied');
  }
  assert.deepEqual(await requestPersistence({ navigator: {} }), { state: 'unsupported', asked: false });
  assert.deepEqual(await requestPersistence({ navigator: { storage: { persist: async () => { throw Error('denied'); } } } }), { state: 'error', asked: true });
  assert.equal(await checkPersistence({ navigator: {} }), false);
  assert.equal(await checkPersistence({ navigator: { storage: { persisted: async () => { throw Error('blocked'); } } } }), false);
  assert.equal(await checkPersistence({ navigator: { storage: { persisted: async () => true } } }), true);
  assert.equal(isStandalone({ window: { matchMedia: query => ({ matches: query === '(display-mode: standalone)' }) }, navigator: {} }), true);
  assert.equal(isStandalone({ window: { matchMedia: () => ({ matches: false }) }, navigator: { standalone: true } }), true);
  assert.equal(isStandalone({ window: { matchMedia: () => ({ matches: false }) }, navigator: {} }), false);
  assert.equal(isStandalone({ window: {}, navigator: undefined }), false);
});

test('D2 backup prompts appear at most once per milestone, only for guests without a cloud backup since; an export does not count', () => {
  const data = new Map(), storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  let clock = '2026-09-21T12:00:00.000Z';
  const open = () => createSaveStatus({ storage, navigator: {}, now: () => new Date(clock) });
  const saves = open();
  assert.equal(saves.takePrompt(), null, 'nothing before a milestone');
  saves.battleFinished('player');
  assert.equal(saves.takePrompt(), 'first-win');
  assert.equal(saves.takePrompt(), null, 'consumed as it is shown');
  saves.battleFinished('player');
  assert.equal(open().takePrompt(), null, 'never again after a reload or a later win');
  saves.packOpened();
  assert.equal(open().takePrompt(), 'first-pack');
  saves.packOpened();
  assert.equal(open().takePrompt(), null);
  // An export does not count as a backup: the page cannot tell whether the browser saved the
  // file (a cancelled or blocked download looks the same). Review round 2: an export started
  // between a milestone and the next lobby used to skip that milestone's prompt for good.
  data.clear(); clock = '2026-09-21T13:00:00.000Z';
  open().battleFinished('player');
  clock = '2026-09-21T13:05:00.000Z';
  open().recordExport();
  assert.deepEqual(open().status().lastBackup, null, 'an export is never recorded as a backup');
  assert.deepEqual(open().status().lastExport, { at: '2026-09-21T13:05:00.000Z' });
  assert.equal(open().takePrompt(), 'first-win', 'the export did not skip the prompt');
  // A cloud backup since the milestone, or a signed-in player, skips the prompt for good.
  data.clear(); clock = '2026-09-21T13:00:00.000Z';
  open().battleFinished('player');
  clock = '2026-09-21T13:05:00.000Z';
  open().recordBackup();
  assert.deepEqual(open().status().lastBackup, { at: '2026-09-21T13:05:00.000Z', kind: 'cloud' });
  assert.equal(open().takePrompt(), null, 'a cloud backup since the milestone');
  clock = '2026-09-21T13:10:00.000Z';
  open().packOpened();
  assert.equal(open().takePrompt({ guest: false }), null, 'a signed-in player is not prompted');
  assert.equal(open().takePrompt(), null, 'and the prompt does not come back');
  // Both due at once: one prompt shown, both consumed.
  data.clear();
  open().battleFinished('player'); open().packOpened();
  assert.equal(open().takePrompt(), 'first-win');
  assert.equal(open().takePrompt(), null);
  assert.deepEqual(Object.values(JSON.parse(data.get(SAVES_KEY)).prompts).map(prompt => prompt.state), ['shown', 'shown']);
});

test('D2 the restore offer: only on a journey this device just started, until dismissed, restored or its first battle', () => {
  const data = new Map(), storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const open = () => createSaveStatus({ storage, navigator: {}, now: () => new Date(at) });
  const journey = fresh();
  open().launch({ fresh: false });
  assert.equal(open().showRestoreOffer(journey), false, 'an existing journey is never offered a restore');
  open().launch({ fresh: true });
  assert.equal(open().showRestoreOffer(journey), true);
  assert.equal(open().showRestoreOffer({ ...journey, pending: { id: 'battle-1' } }), false, 'hidden during the first battle');
  assert.equal(open().showRestoreOffer({ ...journey, stats: { played: 1, won: 0 } }), false, 'a journey that has played is not new');
  open().battleFinished('opponent');
  assert.equal(open().showRestoreOffer(journey), false, 'closed by the first battle, win or not');
  open().launch({ fresh: true });
  open().closeRestoreOffer();
  assert.equal(open().showRestoreOffer(journey), false, 'dismissed for good');
  open().launch({ fresh: false });
  assert.equal(open().showRestoreOffer(journey), false);

  // The profile store says whether a journey exists before load() would start one.
  const empty = createProfileStore({ storage: { getItem: () => null } });
  assert.equal(empty.hasJourney(), false);
  for (const key of [PROFILE_KEY, 'shanhai.profile.v4', 'shanhai.profile.v3', 'shanhai.profile.v2', 'shanhai.deck.v1', 'shanhai.stats.v1']) {
    assert.equal(createProfileStore({ storage: { getItem: name => name === key ? '{}' : null } }).hasJourney(), true, key);
  }
});

test('D2 the device-local record is fail-safe and never enters a journey, an export or a backup', async () => {
  assert.deepEqual(normalizeSaveStatus(null), { v: 1, lastBackup: null, lastExport: null, persistence: null, prompts: {}, restoreOffer: null });
  // Only a cloud backup is a backup: an export record in its place is not kept as one.
  assert.equal(normalizeSaveStatus({ v: 1, lastBackup: { at, kind: 'export' } }).lastBackup, null);
  assert.deepEqual(normalizeSaveStatus({ v: 1, lastBackup: { at, kind: 'cloud' }, lastExport: { at } }), { v: 1, lastBackup: { at, kind: 'cloud' }, lastExport: { at }, persistence: null, prompts: {}, restoreOffer: null });
  assert.deepEqual(normalizeSaveStatus({ v: 2, restoreOffer: 'open' }).restoreOffer, null, 'an unknown version is ignored');
  assert.deepEqual(normalizeSaveStatus({ v: 1, lastBackup: { at: 'yesterday', kind: 'export' }, persistence: { state: 'maybe', at, trigger: 'first-win' }, prompts: { 'first-win': { state: 'due', at }, other: { state: 'due', at } } }),
    { v: 1, lastBackup: null, lastExport: null, persistence: null, prompts: { 'first-win': { state: 'due', at } }, restoreOffer: null });
  assert.equal(normalizeSaveStatus({ v: 1, lastExport: { at: 'yesterday' } }).lastExport, null);
  // Storage that refuses reads and writes never throws into play.
  const broken = { getItem() { throw new DOMException('blocked', 'SecurityError'); }, setItem() { throw new DOMException('full', 'QuotaExceededError'); } };
  const saves = createSaveStatus({ storage: broken, navigator: {}, now: () => new Date(at) });
  await saves.battleFinished('player');
  saves.recordBackup(); saves.recordExport();
  assert.deepEqual(saves.status().lastBackup, { at, kind: 'cloud' }, 'kept in memory for this page');
  assert.deepEqual(saves.status().lastExport, { at });
  const corrupt = createSaveStatus({ storage: { getItem: () => '{not json', setItem() {} }, navigator: {} });
  assert.equal(corrupt.status().lastBackup, null);

  const journey = travelled(), text = exportText(journey);
  assert.equal(text.includes(SAVES_KEY), false);
  assert.equal(JSON.stringify(createSnapshot(journey)).includes(SAVES_KEY), false);
  const bootstrap = await readFile(new URL('../bootstrap.mjs', import.meta.url), 'utf8');
  assert.equal(bootstrap.includes(SAVES_KEY), false, 'the recovery-originals export lists journey keys only');
});

test('D2 save markup: status, notices and the import confirmation', () => {
  assert.match(saveStatusMarkup({}), /上次備份：未曾/);
  assert.match(saveStatusMarkup({}), /長期保存：未曾要求/);
  // An export is shown as started, never as a backup: the page cannot tell whether it was saved.
  const exported = saveStatusMarkup({ lastExport: { at }, persistence: { state: 'granted', at, trigger: 'first-win' } });
  assert.match(exported, new RegExp(`<span data-last-export>上次匯出：<time datetime="${at}">[^<]+</time> · 已開始下載，此頁無法確認檔案已儲存</span>`));
  assert.doesNotMatch(exported, /上次備份|data-last-backup/, 'no backup claimed for an export');
  assert.match(exported, /瀏覽器已答應保留/);
  const cloud = saveStatusMarkup({ lastBackup: { at, kind: 'cloud' } });
  assert.match(cloud, new RegExp(`<span data-last-backup>上次備份：<time datetime="${at}">[^<]+</time> · 雲端備份</span>`));
  assert.doesNotMatch(cloud, /上次匯出/);
  const both = saveStatusMarkup({ lastBackup: { at, kind: 'cloud' }, lastExport: { at: now } });
  assert.match(both, /上次備份：.+雲端備份.+上次匯出：.+已開始下載/);
  assert.match(saveStatusMarkup({}), /勝出一局或開匣後/, 'not 首勝: an existing journey is asked at its next win');
  const offer = saveNoticeMarkup('restore-offer');
  assert.match(offer, /有舊旅程？由備份還原/);
  assert.match(offer, /data-action="import-save"/);
  // The lobby never knows the account on a fresh load, so the cloud path is there without it.
  assert.match(offer, /data-action="restore-offer-cloud"/, 'a cloud path while the account is unknown');
  assert.match(offer, /<span class="save-notice-glyph" aria-hidden="true"> ↗<\/span>/);
  const noCloud = saveNoticeMarkup('restore-offer', { cloud: false });
  assert.doesNotMatch(noCloud, /restore-offer-cloud/);
  assert.doesNotMatch(noCloud, /雲端/, 'nor a label promising one');
  for (const kind of ['first-win', 'first-pack']) {
    const prompt = saveNoticeMarkup(kind);
    assert.match(prompt, /data-action="export-save"/); assert.match(prompt, /data-action="account-open"/);
    assert.match(prompt, new RegExp(`data-action="save-notice-dismiss" data-id="${kind}"`));
    assert.doesNotMatch(prompt, /role="dialog"|modal/, 'never a dialog');
    assert.doesNotMatch(prompt, /稍後再說/, 'a prompt never comes back, so its close does not say later');
    assert.match(prompt, /最新進度只保存在此瀏覽器/);
  }
  // 首勝 only on a journey's first win; the first win this device records may be a later one.
  assert.match(saveNoticeMarkup('first-win', { wins: 1 }), /首勝已記 · 留份備份？/);
  for (const wins of [6, 0, null, undefined]) {
    const later = saveNoticeMarkup('first-win', { wins });
    assert.doesNotMatch(later, /首勝/, `wins ${wins}`);
    assert.match(later, /勝局已記 · 留份備份？/); assert.match(later, /data-save-notice="first-win"/);
  }
  assert.equal(saveNoticeMarkup(null), '');
  const dialog = importConfirmMarkup({ current: journeySummary(fresh()), backup: journeySummary(travelled()), fileName: '<x>.json' });
  assert.match(dialog, /將被取代/); assert.match(dialog, /將還原/); assert.match(dialog, /&lt;x&gt;\.json/);
  assert.match(dialog, /data-action="import-confirm"/); assert.match(dialog, /data-action="close-modal"/);
  assert.doesNotMatch(dialog, /data-recovery-replaced/, 'no existing recovery copy, nothing to warn about');
  // One recovery slot: the dialog says an existing copy is replaced, and how to keep it.
  const replacing = importConfirmMarkup({ current: journeySummary(fresh()), backup: journeySummary(travelled()), recovery: { savedAt: at } });
  assert.match(replacing, /data-recovery-replaced>旅程閣現有的回復備份（[^）]+）會被這次取代；如需保留，請先在旅程閣「下載本機回復備份」。/);
  // A file from before v0.6.0 says it is migrated before the restore.
  assert.doesNotMatch(dialog, /data-import-legacy/);
  assert.match(importConfirmMarkup({ current: journeySummary(fresh()), backup: journeySummary(travelled()), legacy: true }), /data-import-legacy>這份備份來自較舊版本的萬象契；還原時會按此裝置載入舊旅程的同一規則轉為現行格式/);
});

test('D2 app.mjs imports through restoreLocalProfile, the strict path cloud restore and local recovery use', async () => {
  const source = await readFile(new URL('../app.mjs', import.meta.url), 'utf8');
  const start = source.indexOf('async function restoreLocalProfile('), end = source.indexOf('function recoveryMarkup(');
  const restore = source.slice(start, end);
  assert.match(restore, /const lock = profileLock\(\);/);
  assert.match(restore, /profileStore\.restore\(restored, \{ expectedFingerprint, busy: economyBusy, isCurrent,/);
  const confirm = source.slice(source.indexOf('function confirmImport('), source.indexOf('async function economy('));
  assert.match(confirm, /restoreLocalProfile\(draft\.snapshot,draft\.fingerprint\)/);
  assert.doesNotMatch(confirm, /setItem|profileStore\.(save|replace)/, 'no second write path');
  const lobby = source.slice(source.indexOf('function lobbySaveNotice('), source.indexOf('function backupMade('));
  assert.match(lobby, /^function lobbySaveNotice\(\) \{\n[^\n]*\n  if\(profile\.wx01\.receipt\|\|profile\.expansion\.fireMountain\.run\)return '';/, 'a WX receipt or activity resume strip has the place first, before a prompt is taken');
  // Review round 2: only a confirmed (cloud) backup ends a prompt; an export is only started.
  const made = source.slice(source.indexOf('function backupMade('), source.indexOf('function exportSave('));
  assert.match(made, /saves\.recordBackup\(\);saveNotice=null;/, 'a cloud backup ends the prompt shown on this page');
  const exported = source.slice(source.indexOf('function exportSave('), source.indexOf('function importBlocked('));
  assert.match(exported, /if\(result\.importable\)\{saves\.recordExport\(\);/, 'only a file that would import is recorded');
  assert.doesNotMatch(exported, /backupMade|recordBackup|saveNotice/, 'an export never counts as a backup or ends a prompt');
  assert.match(source, /'account-upload': \(\) => account\.upload\(\)\.then\(saved => \{ if \(saved\) backupMade\(\); \}\)/, 'a cloud backup counts once the API says it saved');
  assert.match(lobby, /saveNoticeMarkup\(saveNotice,\{wins:profile\.stats\.won\}\)/, 'the prompt copy knows the win count');
  assert.match(lobby, /cloud:Boolean\(known\.account\)\|\|!known\.initialized\|\|known\.emailEnabled/, 'the cloud path stays while the account is unknown');
  assert.doesNotMatch(lobby, /account\.init/, 'the lobby makes no account request');
  const cloud = source.slice(source.indexOf("if(action==='restore-offer-cloud')"), source.indexOf("if(action==='navigate-confirm')"));
  assert.match(cloud, /const looked=account\.init\(\);navigate\('account'\);viewport\.selectModule\(\{key:viewKey\(\),moduleId:'cloud'\}\);/, '旅程閣 looks the account up on its 雲端旅程 tab, then the confirmation opens');
  // persist() is never requested on an ordinary load: launch passes the standalone check.
  assert.match(source, /saves\.launch\(\{fresh:freshJourney,standalone:isStandalone\(\)\}\)/);
  assert.match(source, /saves\.battleFinished\(match\.winner\);/);
});
