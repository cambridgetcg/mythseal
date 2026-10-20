/** The store app's save safety (docs/IOS-FIRST-FLIGHT.md), driven against a fake Capacitor
 * bridge shaped like the one @capacitor/ios 8.5.3 injects (window.Capacitor.Plugins.<jsName>,
 * one promise-returning function per native method; see native-shell.mjs). The export goes
 * through the Filesystem and Share plugins; the journey's copy in the Library directory follows
 * every profile write; after iOS clears web storage the copy comes back only through D2's strict
 * restore. A fake bridge proves the page's side of the contract, not the plugins' native code. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, claimLogin, sellInstance, beginBattle, startActivity, finishBattle, NODES, PROFILE_KEY } from '../progression.mjs';
import { mintInstance, setInstanceXP, saveInstanceDeck, getActiveDeck } from '../collection.mjs';
import { fingerprintProfile } from '../cloud-save.mjs';
import { createProfileStore, RECOVERY_KEY } from '../profile-store.mjs';
import { createFencedLock } from '../profile-fence.mjs';
import { isNativeShell, nativePlugins, saveFile, SaveCancelled, createDurableMirror, createMirrorHold, mirroredStorage, MIRROR_DIRECTORY, MIRROR_PATH, MIRROR_UNDECIDED_KEY } from '../native-shell.mjs';
import { exportJourney, exportText, exportFilename, restoreFromMirror, IMPORT_MESSAGES } from '../platform.mjs';
import { saveStatusMarkup, savePanelMarkup, savesButtonMarkup, importConfirmMarkup, SAVE_PANEL_NAME } from '../save-ui.mjs';

const now = '2026-09-21T12:00:00.000Z';
const at = '2026-09-21T12:34:56.789Z';
const fresh = () => createProfile({ now });
const copies = profile => [...profile.instances, ...profile.merchantVault.map(entry => entry.instance)].map(card => [card.uid, card.cardId, card.printId, card.xp, card.level]);
function travelled() {
  let profile = claimLogin(fresh(), now);
  const added = mintInstance(profile, 'qingxiao', { source: 'npc-market', now });
  profile = sellInstance(setInstanceXP(added.profile, added.instance.uid, 430), added.instance.uid, now);
  const extra = mintInstance(profile, 'kongzi', { source: 'npc-market', now });
  profile = saveInstanceDeck(setInstanceXP(extra.profile, extra.instance.uid, 260), { slotId: 'deck-2', name: '千古同行', instanceIds: [...getActiveDeck(extra.profile).instanceIds].reverse() });
  return { ...profile, coins: 4321, dust: 87 };
}

/** A fake bridge: Filesystem over an in-memory file table (rename replaces, as the plugin does),
 * Share that completes, cancels or fails, and a call log. */
function bridge({ share = 'complete', failWrite = false } = {}) {
  const files = new Map(), calls = [];
  const key = (directory, path) => `${directory}:${path}`;
  const Filesystem = {
    async writeFile(options) {
      calls.push(['writeFile', options]);
      if (failWrite) throw new Error('disk full');
      files.set(key(options.directory, options.path), options.data);
      return { uri: `file:///app/${options.directory}/${options.path}` };
    },
    async readFile(options) {
      calls.push(['readFile', options]);
      const text = files.get(key(options.directory, options.path));
      if (text === undefined) throw new Error('File does not exist.');
      return { data: text };
    },
    async rename(options) {
      calls.push(['rename', options]);
      const from = key(options.directory, options.from);
      if (!files.has(from)) throw new Error('File does not exist.');
      files.set(key(options.toDirectory, options.to), files.get(from)); files.delete(from);
    },
    async readdir(options) {
      calls.push(['readdir', options]);
      const prefix = key(options.directory, `${options.path}/`);
      const names = [...files.keys()].filter(name => name.startsWith(prefix)).map(name => name.slice(prefix.length)).filter(name => !name.includes('/'));
      if (!names.length) throw new Error('File does not exist.');
      return { files: names.map(name => ({ name, type: 'file' })) };
    },
  };
  const Share = {
    async share(options) {
      calls.push(['share', options]);
      if (share === 'cancel') throw new Error('Share canceled');
      if (share === 'fail') throw new Error('Error sharing item');
      return { activityType: 'com.apple.DocumentManagerUICore.SaveToFiles' };
    },
  };
  return { scope: { Capacitor: { isNativePlatform: () => true, Plugins: { Filesystem, Share } } }, files, calls, key };
}
const noBridge = { Capacitor: undefined };
const settle = () => new Promise(resolve => setImmediate(resolve));

test('the plugins are reached through window.Capacitor.Plugins, only inside the native shell', () => {
  const { scope } = bridge();
  assert.equal(isNativeShell(scope), true);
  assert.ok(nativePlugins(scope).Filesystem && nativePlugins(scope).Share);
  assert.equal(nativePlugins(noBridge), null);
  assert.equal(nativePlugins({ Capacitor: { isNativePlatform: () => false, Plugins: {} } }), null, 'a web page that defines Capacitor is not the app');
  assert.equal(createDurableMirror({ scope: noBridge }), null, 'no mirror on the web');
});

test('on the web saveFile is D2\'s download, started inside the tap', async () => {
  const clicks = [];
  const document = { createElement: () => ({ click() { clicks.push([this.href, this.download]); } }) };
  const urls = { createObjectURL: () => 'blob:fixture', revokeObjectURL: () => {} };
  const pending = saveFile({ name: 'a.json', text: '{}' }, { scope: noBridge, document, URL: urls, setTimeout: () => {} });
  assert.deepEqual(clicks, [['blob:fixture', 'a.json']], 'clicked before the first await');
  assert.deepEqual(await pending, { via: 'download' });
});

test('in the app the export is written to Cache and offered through the share sheet', async () => {
  const { scope, files, calls, key } = bridge();
  const profile = travelled();
  const result = await exportJourney(profile, { scope, now: new Date(now) });
  assert.deepEqual([result.via, result.importable, result.filename], ['share', true, exportFilename(profile)]);
  const [write, share] = calls;
  assert.deepEqual(write, ['writeFile', { path: `exports/${exportFilename(profile)}`, data: exportText(profile), directory: 'CACHE', encoding: 'utf8', recursive: true }]);
  assert.deepEqual(share, ['share', { title: exportFilename(profile), files: [`file:///app/CACHE/exports/${exportFilename(profile)}`] }]);
  assert.equal(files.get(key('CACHE', `exports/${exportFilename(profile)}`)), exportText(profile), 'the same bytes the web downloads');
});

test('a dismissed share sheet is a cancellation, a broken one an error, a missing plugin a refusal', async () => {
  await assert.rejects(saveFile({ name: 'a.json', text: '{}' }, { scope: bridge({ share: 'cancel' }).scope }), error => error instanceof SaveCancelled && error.code === 'cancelled');
  await assert.rejects(saveFile({ name: 'a.json', text: '{}' }, { scope: bridge({ share: 'fail' }).scope }), /Error sharing item/);
  await assert.rejects(saveFile({ name: 'a.json', text: '{}' }, { scope: { Capacitor: { isNativePlatform: () => true, Plugins: {} } } }), /未能匯出檔案/);
  // A path-like name cannot leave the exports folder.
  const { scope, calls } = bridge();
  await saveFile({ name: '../x/y.json', text: '{}' }, { scope });
  assert.equal(calls[0][1].path, 'exports/.._x_y.json');
});

test('the mirror writes the latest text to Library through a rename, and reads it back', async () => {
  const { scope, files, calls, key } = bridge();
  const mirror = createDurableMirror({ scope, now: () => new Date(at) });
  assert.deepEqual(mirror.status(), { state: 'idle', at: null, error: null });
  // Three writes in one turn: the first starts, the last wins, the middle one is never written.
  mirror.write('one'); mirror.write('two'); await mirror.write('three');
  const writes = calls.filter(([name]) => name === 'writeFile').map(([, options]) => options.data);
  assert.deepEqual(writes, ['three'], 'coalesced to the latest text');
  assert.deepEqual(calls.find(([name]) => name === 'rename')[1], { from: `${MIRROR_PATH}.next`, to: MIRROR_PATH, directory: MIRROR_DIRECTORY, toDirectory: MIRROR_DIRECTORY });
  assert.equal(files.get(key('LIBRARY', MIRROR_PATH)), 'three');
  assert.equal(await mirror.read(), 'three');
  assert.deepEqual(mirror.status(), { state: 'saved', at, error: null });
  // An interrupted rename leaves only the .next file: read still finds it.
  files.delete(key('LIBRARY', MIRROR_PATH)); files.set(key('LIBRARY', `${MIRROR_PATH}.next`), 'four');
  assert.equal(await mirror.read(), 'four');
  files.clear();
  assert.equal(await mirror.read(), null);
});

test('a failed mirror write is reported, never thrown into the game', async () => {
  const mirror = createDurableMirror({ scope: bridge({ failWrite: true }).scope });
  await mirror.write('x');
  assert.deepEqual(mirror.status(), { state: 'error', at: null, error: 'disk full' });
});

test('every profile write reaches the mirror, unless held; other keys and failed writes never do', async () => {
  const written = [];
  const mirror = { write: text => { written.push(text); return Promise.resolve(); } };
  const data = new Map();
  let held = true, full = false;
  const local = { getItem: key => data.get(key) ?? null, setItem(key, value) { if (full) throw new DOMException('full', 'QuotaExceededError'); data.set(key, value); }, removeItem: key => data.delete(key) };
  const storage = mirroredStorage(local, { key: PROFILE_KEY, mirror, held: () => held });
  storage.setItem(PROFILE_KEY, 'held');
  held = false;
  storage.setItem(PROFILE_KEY, 'a'); storage.setItem(RECOVERY_KEY, 'r'); storage.setItem(PROFILE_KEY, 'b');
  full = true;
  assert.throws(() => storage.setItem(PROFILE_KEY, 'c'), /full/);
  assert.deepEqual(written, ['a', 'b']);
  assert.equal(storage.getItem(PROFILE_KEY), 'b');
});

/** One app launch: localStorage (which iOS can clear; pass `data` to relaunch over the same
 * storage), a strict lock and fence as app.mjs has, the mirror on the shared fake Filesystem
 * (which survives the clearing) and app.mjs's hold on it (createMirrorHold). */
function install(fs, { stored, data = new Map(stored === undefined ? [] : [[PROFILE_KEY, JSON.stringify(stored)]]) } = {}) {
  const writes = [];
  const local = { getItem: key => data.get(key) ?? null, setItem(key, value) { writes.push(key); data.set(key, value); }, removeItem(key) { data.delete(key); } };
  const mirror = createDurableMirror({ scope: fs.scope, now: () => new Date(at) });
  const fresh = !createProfileStore({ storage: local }).hasJourney();
  const hold = createMirrorHold({ storage: local, mirror, fresh, now: () => new Date(at) });
  const store = createProfileStore({ storage: mirroredStorage(local, { key: PROFILE_KEY, mirror, held: hold.held }), now: () => now });
  let record = null, tail = Promise.resolve();
  const fence = { async read() { return record && structuredClone(record); }, async write(next) { record = next && structuredClone(next); } };
  const lock = createFencedLock({ request: callback => { const run = tail.then(() => callback()); tail = run.catch(() => {}); return run; }, fence, read: () => local.getItem(PROFILE_KEY), strict: true, budget: 20 });
  // app.mjs's startup: transact(p=>p) saves the loaded (or new) journey, then launchMirror.
  store.save(store.load());
  async function launch() {
    let outcome = { state: 'none' };
    if (hold.held()) {
      outcome = await restoreFromMirror({ mirror, now: new Date(now), restore: snapshot => {
        const expectedFingerprint = fingerprintProfile(store.load());
        return lock(() => store.restore(JSON.parse(JSON.stringify(snapshot.profile)), { expectedFingerprint, savedAt: at }));
      } });
      if (outcome.state === 'kept') return outcome;
      await mirror.write(local.getItem(PROFILE_KEY));
      hold.decided();
      return outcome;
    }
    await mirror.write(local.getItem(PROFILE_KEY));
    return outcome;
  }
  return { data, writes, store, mirror, launch, fresh, hold };
}

test('after iOS clears web storage, the journey comes back from the copy through the strict restore', async () => {
  const fs = bridge();
  const journey = travelled();
  const first = install(fs, { stored: journey });
  assert.equal(first.fresh, false);
  assert.deepEqual(await first.launch(), { state: 'none' });
  assert.ok(fs.files.get(fs.key('LIBRARY', MIRROR_PATH)), 'the copy follows the saved journey');
  // iOS clears localStorage and IndexedDB; the app's Library files remain.
  const second = install(fs);
  assert.equal(second.fresh, true, 'a journey this device has just started');
  assert.equal(fs.files.get(fs.key('LIBRARY', MIRROR_PATH)), first.data.get(PROFILE_KEY), "the new journey's first save did not overwrite the copy");
  assert.deepEqual(await second.launch(), { state: 'restored', reason: null });
  const restored = JSON.parse(second.data.get(PROFILE_KEY));
  assert.deepEqual(copies(restored), copies(journey), 'every UID, printing, XP and level');
  assert.deepEqual(restored.deckSlots, journey.deckSlots);
  assert.equal(restored.coins, 4321);
  assert.deepEqual(second.writes.slice(-2), [RECOVERY_KEY, PROFILE_KEY], 'the strict restore: the recovery copy first, then one profile write');
  assert.ok(JSON.parse(second.data.get(RECOVERY_KEY)).snapshot, 'the new journey it replaced is kept as the recovery copy');
  assert.equal(fs.files.get(fs.key('LIBRARY', MIRROR_PATH)), second.data.get(PROFILE_KEY), 'then the copy follows again');
});

test('a copy the strict checks refuse is set aside, kept, and never written into the game', async () => {
  const fs = bridge();
  const tampered = { ...travelled(), coins: 99_999 };
  tampered.inventory = { ...tampered.inventory, qingxiao: tampered.inventory.qingxiao + 3 }; // counts no longer match the copies
  fs.files.set(fs.key('LIBRARY', MIRROR_PATH), JSON.stringify(tampered));
  const device = install(fs);
  const outcome = await device.launch();
  assert.equal(outcome.state, 'refused');
  assert.equal(outcome.reason, IMPORT_MESSAGES.tampered);
  assert.notEqual(JSON.parse(device.data.get(PROFILE_KEY)).coins, 99_999, 'nothing from the copy reached storage');
  assert.equal(device.data.has(RECOVERY_KEY), false, 'no restore ran');
  const kept = [...fs.files.keys()].filter(name => name.includes('.refused-'));
  assert.deepEqual(kept, [`LIBRARY:mythseal/journey.v5.refused-20260921T123456789Z.json`]);
  assert.equal(fs.files.get(kept[0]), JSON.stringify(tampered), 'kept byte for byte for support');
  assert.equal(fs.files.get(fs.key('LIBRARY', MIRROR_PATH)), device.data.get(PROFILE_KEY), 'the copy now follows the new journey');
});

/** The copy as the last save left it: `change` turns the journey into an unfinished one, the
 * way a battle or a 火焰山 run is saved and mirrored while it is open. */
async function leftOpen(fs, journey, change) {
  const device = install(fs, { stored: journey });
  await device.launch();
  device.store.save(change(device.store.load()));
  await settle();
  return JSON.parse(fs.files.get(fs.key('LIBRARY', MIRROR_PATH)));
}

test('a copy saved mid-battle comes back with that battle given up, as 放棄此局 would', async () => {
  for (const kind of ['practice', 'arena']) {
    const fs = bridge();
    const journey = travelled();
    const open = await leftOpen(fs, journey, profile => beginBattle(profile, { kind, now }).profile);
    assert.equal(open.pending.kind, kind, 'the copy holds the open battle');
    const device = install(fs);
    assert.deepEqual(await device.launch(), { state: 'restored', reason: null, forfeited: 'battle' }, kind);
    const restored = JSON.parse(device.data.get(PROFILE_KEY));
    assert.equal(restored.pending, null, 'the battle is given up');
    assert.equal(restored.coins, 4321);
    assert.deepEqual(copies(restored), copies(journey), 'every UID, printing, XP and level');
    assert.deepEqual(device.writes.slice(-2), [RECOVERY_KEY, PROFILE_KEY], 'through the strict restore');
    assert.deepEqual([...fs.files.keys()].filter(name => name.includes('.refused-')), [], 'nothing set aside');
    assert.equal(fs.files.get(fs.key('LIBRARY', MIRROR_PATH)), device.data.get(PROFILE_KEY), 'then the copy follows again');
  }
});

test('a copy saved during a 火焰山 run comes back with the run set down and its banked rewards kept', async () => {
  const ready = () => ({ ...createProfile({ now }), cleared: NODES.filter(node => !node.campaign).map(node => node.id), coins: 2468 });
  const begun = profile => startActivity(profile, { route: 'loaner', rng: () => .96, now }).profile;
  // Stage 1 won: the run waits at a supply stop with nothing pending, its rewards banked.
  const supply = profile => { const open = begun(profile); return finishBattle(open, { encounterId: open.pending.id, winner: 'player', finalResources: { hp: 6, pills: 2 }, now }).profile; };
  for (const [phase, change] of [['battle', begun], ['supply', supply]]) {
    const fs = bridge();
    const open = await leftOpen(fs, ready(), change);
    assert.equal(open.expansion.fireMountain.run.phase, phase, phase);
    assert.equal(open.pending === null, phase === 'supply', 'pending only while the battle is open');
    const device = install(fs);
    assert.deepEqual(await device.launch(), { state: 'restored', reason: null, forfeited: 'activity' }, phase);
    const restored = JSON.parse(device.data.get(PROFILE_KEY));
    assert.equal(restored.pending, null);
    assert.equal(restored.expansion.fireMountain.run, null, 'the run is set down');
    assert.equal(restored.coins, open.coins, 'rewards the run already banked are kept');
    assert.deepEqual(restored.expansion.grants, open.expansion.grants, 'and so is its banked grant');
    assert.equal(restored.daily.date, open.daily.date, "settled at the copy's own day");
  }
});

test('an unfinished copy that is not consistent as saved is refused and set aside as it was', async () => {
  const fs = bridge();
  const open = beginBattle(travelled(), { kind: 'practice', now }).profile;
  const edited = JSON.stringify({ ...open, inventory: { ...open.inventory, qingxiao: open.inventory.qingxiao + 3 } });
  fs.files.set(fs.key('LIBRARY', MIRROR_PATH), edited);
  const device = install(fs);
  assert.deepEqual(await device.launch(), { state: 'refused', reason: IMPORT_MESSAGES.tampered }, 'settling never repairs an edited copy');
  assert.equal(device.data.has(RECOVERY_KEY), false, 'no restore ran');
  const kept = [...fs.files.keys()].filter(name => name.includes('.refused-'));
  assert.equal(fs.files.get(kept[0]), edited, 'the original text is kept, not a settled one');
});

test('a refused copy that cannot be moved stays held, on that launch and every later one', async () => {
  const fs = bridge();
  fs.files.set(fs.key('LIBRARY', MIRROR_PATH), '{"not":"a journey"}');
  const rename = fs.scope.Capacitor.Plugins.Filesystem.rename;
  fs.scope.Capacitor.Plugins.Filesystem.rename = async () => { throw new Error('read-only'); };
  const device = install(fs);
  assert.deepEqual(await device.launch(), { state: 'kept', reason: IMPORT_MESSAGES['not-export'] });
  assert.equal(fs.files.get(fs.key('LIBRARY', MIRROR_PATH)), '{"not":"a journey"}');
  device.store.save(device.store.load());
  await settle();
  assert.equal(fs.files.get(fs.key('LIBRARY', MIRROR_PATH)), '{"not":"a journey"}', 'still held: later saves do not overwrite it');
  assert.ok(device.data.has(MIRROR_UNDECIDED_KEY), 'the marker stays');
  // Relaunch over the same storage: the new journey is stored now, and the copy is still held.
  const again = install(fs, { data: device.data });
  assert.deepEqual([again.fresh, again.hold.held(), again.hold.resumed], [false, true, true]);
  assert.deepEqual(await again.launch(), { state: 'kept', reason: IMPORT_MESSAGES['not-export'] });
  again.store.save(again.store.load());
  await settle();
  assert.equal(fs.files.get(fs.key('LIBRARY', MIRROR_PATH)), '{"not":"a journey"}', 'never overwritten across launches');
  // A later launch that can move it decides at last: set aside, and the copy follows again.
  fs.scope.Capacitor.Plugins.Filesystem.rename = rename;
  const later = install(fs, { data: device.data });
  assert.equal((await later.launch()).state, 'refused');
  assert.equal(fs.files.get(fs.key('LIBRARY', 'mythseal/journey.v5.refused-20260921T123456789Z.json')), '{"not":"a journey"}');
  assert.equal(fs.files.get(fs.key('LIBRARY', MIRROR_PATH)), later.data.get(PROFILE_KEY));
  assert.equal(later.data.has(MIRROR_UNDECIDED_KEY), false, 'decided: the marker is gone');
});

test('a launch that dies after the new journey\'s first save, before deciding, leaves the copy for the next one', async () => {
  const fs = bridge();
  const journey = travelled();
  await install(fs, { stored: journey }).launch();
  const copy = fs.files.get(fs.key('LIBRARY', MIRROR_PATH));
  // iOS clears web storage. The fresh launch writes its marker and saves the new journey
  // (install() runs app.mjs's transact(p=>p)), then the page dies before launchMirror decides.
  const dying = install(fs);
  assert.equal(dying.fresh, true);
  assert.deepEqual(dying.writes, [MIRROR_UNDECIDED_KEY, PROFILE_KEY], 'the marker is written before the first save');
  await settle();
  assert.equal(fs.files.get(fs.key('LIBRARY', MIRROR_PATH)), copy, 'the copy is untouched');
  // The relaunch finds a journey in storage (the new one) and the marker: still held.
  const relaunch = install(fs, { data: dying.data });
  assert.deepEqual([relaunch.fresh, relaunch.hold.held(), relaunch.hold.resumed], [false, true, true]);
  await settle();
  assert.equal(fs.files.get(fs.key('LIBRARY', MIRROR_PATH)), copy, "the relaunch's own first save did not overwrite it");
  assert.deepEqual(await relaunch.launch(), { state: 'restored', reason: null });
  const restored = JSON.parse(relaunch.data.get(PROFILE_KEY));
  assert.equal(restored.coins, 4321);
  assert.deepEqual(copies(restored), copies(journey));
  assert.ok(JSON.parse(relaunch.data.get(RECOVERY_KEY)).snapshot, 'the new journey it replaced is the recovery copy');
  assert.equal(relaunch.data.has(MIRROR_UNDECIDED_KEY), false, 'decided: the marker is gone');
  assert.equal(fs.files.get(fs.key('LIBRARY', MIRROR_PATH)), relaunch.data.get(PROFILE_KEY), 'then the copy follows again');
  // And the launch after that is an ordinary one.
  const next = install(fs, { data: relaunch.data });
  assert.deepEqual([next.fresh, next.hold.held()], [false, false]);
});

test('without a mirror the hold is inert and writes nothing', () => {
  const data = new Map(), storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  const hold = createMirrorHold({ storage, mirror: null, fresh: true });
  assert.equal(hold.held(), false);
  assert.equal(data.size, 0);
});

test('copies a launch set aside are listed newest first and read back by name only', async () => {
  const fs = bridge();
  const mirror = createDurableMirror({ scope: fs.scope, now: () => new Date(at) });
  assert.deepEqual(await mirror.setAsideCopies(), [], 'none yet (the folder does not exist)');
  await mirror.write('current');
  fs.files.set(fs.key('LIBRARY', 'mythseal/journey.v5.refused-20260920T010203004Z.json'), 'older');
  fs.files.set(fs.key('LIBRARY', 'mythseal/journey.v5.refused-20260921T123456789Z.json'), 'newer');
  fs.files.set(fs.key('LIBRARY', 'mythseal/notes.txt'), 'not a copy');
  assert.deepEqual(await mirror.setAsideCopies(), [
    { name: 'journey.v5.refused-20260921T123456789Z.json', at: '2026-09-21T12:34:56.789Z' },
    { name: 'journey.v5.refused-20260920T010203004Z.json', at: '2026-09-20T01:02:03.004Z' },
  ]);
  assert.equal(await mirror.readSetAside('journey.v5.refused-20260920T010203004Z.json'), 'older');
  for (const name of ['journey.v5.json', 'notes.txt', '../mythseal/journey.v5.refused-20260921T123456789Z.json', 'journey.v5.refused-x.json']) assert.equal(await mirror.readSetAside(name), null, name);
  // What setAside itself writes is what the list finds.
  fs.files.clear(); await mirror.write('refused one'); await mirror.setAside();
  assert.deepEqual((await mirror.setAsideCopies()).map(copy => copy.at), [at]);
  // A bridge without readdir lists nothing rather than failing.
  delete fs.scope.Capacitor.Plugins.Filesystem.readdir;
  assert.deepEqual(await createDurableMirror({ scope: fs.scope }).setAsideCopies(), []);
});

test('旅程存檔 offers every copy a launch did not restore as a file', () => {
  const status = { lastExport: null, lastBackup: null, persistence: null };
  assert.doesNotMatch(savePanelMarkup({ status, mirror: { state: 'saved', at } }), /data-mirror-kept/, 'nothing to offer');
  const panel = savePanelMarkup({ status, mirror: { state: 'saved', at }, setAside: [{ name: 'journey.v5.refused-20260921T123456789Z.json', at }] });
  assert.match(panel, /data-mirror-kept/);
  assert.match(panel, /data-action="export-kept-copy" data-id="journey\.v5\.refused-20260921T123456789Z\.json">匯出 <time datetime="2026-09-21T12:34:56\.789Z">/);
  assert.match(panel, /匯入旅程備份」還原/);
  const held = savePanelMarkup({ status, mirror: { state: 'held', at: null, error: null } });
  assert.match(held, /data-action="export-kept-copy" data-id="">匯出保留中的副本/, 'a copy still held in place too');
  assert.doesNotMatch(held + panel, /雲端/);
});

test('the 旅程存檔 dialog and header button carry the app\'s status and no cloud', () => {
  assert.match(savesButtonMarkup(), /data-action="saves-open"/);
  assert.match(savesButtonMarkup(), /aria-label="旅程存檔：/);
  const panel = savePanelMarkup({ status: { lastExport: { at }, lastBackup: null, persistence: { state: 'granted', at, trigger: 'first-win' } }, mirror: { state: 'saved', at }, recovery: '<aside class="account-recovery">r</aside>' });
  for (const part of [`<h2>${SAVE_PANEL_NAME}</h2>`, 'data-action="export-save"', 'data-action="import-save"', 'data-last-export', '已經分享選單送出', 'data-mirror="saved"', '<aside class="account-recovery">r</aside>']) assert.ok(panel.includes(part), part);
  assert.doesNotMatch(panel, /雲端|上次備份|長期保存|account-open/, 'no cloud backup and no browser storage request in the app');
  assert.match(saveStatusMarkup({}, { native: true }), /上次匯出：未曾.*裝置副本：等候第一次保存/);
  assert.match(saveStatusMarkup({}, { native: true, mirror: { state: 'error', at: null, error: 'x' } }), /data-mirror="error">裝置副本：未能寫入/);
  // A copy held after a launch could neither restore nor move it: said as it is.
  assert.match(saveStatusMarkup({}, { native: true, mirror: { state: 'held', at: null, error: null } }), /data-mirror="held">裝置副本：保留著未能還原的舊副本，新的旅程暫不寫入/);
  // The website's status line is unchanged.
  assert.match(saveStatusMarkup({}), /上次備份：未曾/);
  // The import confirmation names the app's 旅程存檔 and promises nothing about a cloud.
  const summary = { cards: 1, coins: 1, dust: 1, xp: 1, decks: 1, played: 1, won: 1, vault: 0, date: '2026-09-21' };
  const confirm = importConfirmMarkup({ current: summary, backup: summary, recovery: { savedAt: at }, place: SAVE_PANEL_NAME, cloud: false });
  assert.match(confirm, /可在旅程存檔「復原上次本機旅程」取回/);
  assert.match(confirm, /請先在旅程存檔「下載本機回復備份」/);
  assert.doesNotMatch(confirm, /旅程閣|雲端/);
});
