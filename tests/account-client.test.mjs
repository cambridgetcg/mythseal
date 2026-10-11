import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountController } from '../account-client.mjs';
import { accountMarkup, accountButtonMarkup } from '../account-ui.mjs';
import { LEGACY_CARD_IDS } from '../engine.mjs';
import { createProfile, beginBattle } from '../progression.mjs';
import { createSnapshot, fingerprintProfile, restoreSnapshot } from '../cloud-save.mjs';

const now = '2026-09-21T12:00:00.000Z';
const user = { id: 'owner-one', email: 'player@example.com' };
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const saved = (revision = 1, coins = 420) => {
  const profile = createProfile({ now });
  profile.coins = coins;
  return { revision, backup: { revision, updatedAt: now, snapshot: createSnapshot(profile) } };
};

function harness(responses = [], options = {}) {
  let profile = createProfile({ now });
  const requests = [], restores = [], announcements = [], changes = [];
  const queue = [...responses];
  const controller = createAccountController({
    getLocalProfile: () => profile,
    restoreLocalProfile: options.restoreLocalProfile || (async (snapshot, expectedFingerprint, { isCurrent }) => {
      assert.equal(fingerprintProfile(profile), expectedFingerprint);
      assert.equal(isCurrent(), true);
      restores.push(snapshot);
      profile = restoreSnapshot(snapshot, { now });
    }),
    notify: message => announcements.push(message),
    onChange: state => changes.push(state),
    // Most tests exercise operation races directly; dedicated tests below use a shared mutex.
    withSessionLock: options.withSessionLock || (operation => operation()),
    fetchImpl: async (url, init) => {
      requests.push({ url, ...init, parsedBody: init.body ? JSON.parse(init.body) : undefined });
      assert.equal(init.credentials, 'same-origin');
      assert.equal(init.cache, 'no-store');
      assert.equal(init.headers.Authorization, undefined);
      if (url.endsWith('/journey')) assert.equal(init.headers['X-Mythseal-Account'], user.id);
      if (url === '/api/v1/journey') return reply(options.legacy ?? { backup: null, revision: 0 });
      if (url === '/api/v2/journey' && options.v2) return reply(options.v2);
      const next = queue.shift();
      assert.notEqual(next, undefined, `Unexpected request ${init.method} ${url}`);
      if (next instanceof Error) throw next;
      return typeof next === 'function' ? next() : next;
    },
  });
  return { controller, requests, restores, announcements, changes, queue, get profile() { return profile; }, set profile(value) { profile = value; } };
}

const signedIn = (cloud = saved(), later = [], options) => harness([
  reply({ authenticated: true, user, emailEnabled: true, journeyVersions: [1, 3] }), reply(cloud), ...later,
], options);

test('initial account lookup only reads cloud backup and never replaces or uploads local progress', async () => {
  const game = signedIn();
  const original = structuredClone(game.profile);
  assert.equal(await game.controller.init(), true);
  assert.deepEqual(game.requests.map(request => request.method), ['GET', 'GET']);
  assert.equal(game.controller.getState().backup.snapshot.profile.coins, 420);
  assert.deepEqual(game.profile, original);
  assert.equal(game.restores.length, 0);
  const detached = game.controller.getState();
  detached.backup.snapshot.profile.coins = 1;
  assert.equal(game.controller.getState().backup.snapshot.profile.coins, 420);
});

test('email verification uses cookie requests and retains no verification code or returned tokens', async () => {
  const game = harness([
    reply({ authenticated: false, user: null, emailEnabled: true }), reply({ sent: true }),
    reply({ authenticated: true, access_token: 'must-not-be-stored', refresh_token: 'also-ignored' }),
    reply({ authenticated: true, user, emailEnabled: true, journeyVersions: [1, 3] }), reply({ backup: null, revision: 0 }),
  ]);
  await game.controller.init();
  assert.equal(await game.controller.requestCode(' player@example.com '), true);
  game.controller.setDraft('token', '012345');
  assert.equal(await game.controller.verifyCode('012345'), true);
  assert.deepEqual(game.requests[2].parsedBody, { email: 'player@example.com', token: '012345' });
  assert.equal(game.controller.getState().tokenDraft, '');
  assert.equal(game.controller.getState().emailDraft, '');
  assert.equal(JSON.stringify(game.controller.getState()).includes('must-not-be-stored'), false);
  assert.equal(game.requests.filter(request => request.method === 'PUT').length, 0);
  assert.equal(game.restores.length, 0);
});

test('upload sends an isolated snapshot and the exact observed revision', async () => {
  const response = deferred();
  const game = signedIn(saved(3), [() => response.promise]);
  await game.controller.init();
  const before = game.profile.coins;
  const uploading = game.controller.upload();
  game.profile.coins += 10;
  const payload = game.requests.at(-1).parsedBody;
  assert.equal(payload.expectedRevision, 3);
  assert.equal(payload.snapshot.profile.coins, before);
  response.resolve(reply(saved(4, before)));
  assert.equal(await uploading, true);
  assert.equal(game.controller.getState().localChanged, true);
  assert.equal(game.profile.coins, before + 10);
});

test('409 reloads cloud once and requires an explicit review before another upload', async () => {
  const game = signedIn(saved(1), [
    reply({ error: { code: 'revision_conflict' } }, 409), reply(saved(2, 990)),
    reply(saved(2, 990)), reply(saved(3, 1200)),
  ]);
  await game.controller.init();
  assert.equal(await game.controller.upload(), false);
  assert.equal(game.controller.getState().conflict, true);
  assert.equal(game.controller.getState().backup.snapshot.profile.coins, 990);
  assert.equal(await game.controller.upload(), false);
  assert.equal(game.requests.filter(request => request.method === 'PUT').length, 1);
  assert.equal(await game.controller.refreshCloud(), true);
  assert.equal(await game.controller.upload(), true);
  assert.equal(game.requests.at(-1).parsedBody.expectedRevision, 2);
  assert.equal(game.profile.coins, 1200);
});

test('restore needs confirmation and refuses a cloud revision changed since confirmation', async () => {
  const game = signedIn(saved(1), [reply(saved(2, 650)), reply(saved(2, 650))]);
  await game.controller.init();
  assert.equal(await game.controller.restore(), false);
  assert.equal(game.requests.length, 2);
  assert.equal(game.controller.setConfirmation('restore'), true);
  assert.equal(await game.controller.restore(), false);
  assert.equal(game.restores.length, 0);
  assert.equal(game.controller.getState().conflict, true);
});

test('restore refuses local changes that happen while rereading the cloud', async () => {
  const response = deferred();
  const game = signedIn(saved(), [() => response.promise]);
  await game.controller.init();
  game.controller.setConfirmation('restore');
  const restoring = game.controller.restore();
  game.profile.coins += 90;
  response.resolve(reply(saved()));
  assert.equal(await restoring, false);
  assert.equal(game.restores.length, 0);
  assert.equal(game.profile.coins, 1290);
  assert.match(game.controller.getState().error, /已有變動/);
});

test('a confirmed unchanged cloud snapshot is restored through the guarded callback', async () => {
  const game = signedIn(saved(), [reply(saved())]);
  await game.controller.init();
  game.controller.setConfirmation('restore');
  assert.equal(await game.controller.restore(), true);
  assert.equal(game.restores.length, 1);
  assert.equal(game.profile.coins, 420);
  assert.equal(game.controller.getState().confirmation, null);
});

test('logout ignores a late upload response even when fetch ignores the abort signal', async () => {
  const response = deferred();
  const game = signedIn(saved(), [() => response.promise, reply({ authenticated: false })]);
  await game.controller.init();
  const uploading = game.controller.upload();
  assert.equal(await game.controller.logout(), true);
  response.resolve(reply(saved(2, 1200)));
  assert.equal(await uploading, false);
  const state = game.controller.getState();
  assert.equal(state.account, null);
  assert.equal(state.backup, null);
  assert.equal(state.revision, 0);
  assert.equal(state.busy, null);
  assert.equal(game.announcements.includes('此裝置的旅程已備份。'), false);
});

test('logout while waiting for a local restore lock invalidates its final write guard', async () => {
  const lock = deferred(), entered = deferred();
  let writes = 0;
  const game = signedIn(saved(), [reply(saved()), reply({ authenticated: false })], {
    restoreLocalProfile: async (_snapshot, _fingerprint, { isCurrent }) => {
      entered.resolve();
      await lock.promise;
      if (!isCurrent()) return false;
      writes += 1;
    },
  });
  await game.controller.init();
  game.controller.setConfirmation('restore');
  const restoring = game.controller.restore();
  await entered.promise;
  await game.controller.logout();
  lock.resolve();
  assert.equal(await restoring, false);
  assert.equal(writes, 0);
  assert.equal(game.controller.getState().account, null);
});

test('delete requires confirmation and preserves the tombstone revision for later uploads', async () => {
  const game = signedIn(saved(4), [reply({ backup: null, revision: 5 }), reply(saved(6, 1200))]);
  await game.controller.init();
  assert.equal(await game.controller.deleteBackup(), false);
  game.controller.setConfirmation('delete');
  assert.equal(await game.controller.deleteBackup(), true);
  assert.deepEqual(game.requests.at(-1).parsedBody, { expectedRevision: 4 });
  assert.equal(game.controller.getState().backup, null);
  assert.equal(game.controller.getState().revision, 5);
  assert.equal(game.profile.coins, 1200);
  await game.controller.upload();
  assert.equal(game.requests.at(-1).parsedBody.expectedRevision, 5);
});

test('an expired cookie clears account state without modifying the local journey', async () => {
  const game = signedIn(saved(), [reply({ error: { code: 'sign_in_required' } }, 401)]);
  await game.controller.init();
  const original = structuredClone(game.profile);
  assert.equal(await game.controller.refreshCloud(), false);
  assert.equal(game.controller.getState().account, null);
  assert.equal(game.controller.getState().backup, null);
  assert.deepEqual(game.profile, original);
});

test('network failure preserves guest progress and init can retry without a page reload', async () => {
  const game = harness([new TypeError('offline'), reply({ authenticated: false, user: null, emailEnabled: false })]);
  const original = structuredClone(game.profile);
  assert.equal(await game.controller.init(), false);
  assert.equal(game.controller.getState().busy, null);
  assert.equal(await game.controller.init(), true);
  assert.deepEqual(game.profile, original);
  assert.match(accountMarkup(game.controller.getState(), game.profile), /登入暫未開放/);
});

test('invalid cloud snapshots never reach the local restore callback', async () => {
  const invalid = saved();
  invalid.backup.snapshot.profile.instances[0].uid = 'invalid';
  const game = signedIn(invalid);
  assert.equal(await game.controller.init(), false);
  assert.equal(game.controller.getState().backup, null);
  assert.equal(game.controller.getState().cloudLoaded, false);
  assert.equal(game.controller.setConfirmation('restore'), false);
  assert.equal(game.restores.length, 0);
});

test('draft input survives rerender without publishing on each keystroke and markup escapes it', async () => {
  const game = harness([reply({ authenticated: false, user: null, emailEnabled: true })]);
  await game.controller.init();
  const changes = game.changes.length;
  game.controller.setDraft('email', '"><img src=x onerror=evil()>');
  assert.equal(game.changes.length, changes);
  const html = accountMarkup(game.controller.getState(), game.profile);
  assert.equal(html.includes('<img src=x'), false);
  assert.ok(html.includes('&quot;&gt;&lt;img'));
  assert.match(accountButtonMarkup(game.controller.getState()), /data-action="account-open"/);
});

test('pending battles block backup and restore without dropping any local state', async () => {
  const game = signedIn();
  await game.controller.init();
  game.profile = beginBattle(game.profile, { kind: 'arena', now }).profile;
  assert.equal(await game.controller.upload(), false);
  assert.equal(game.controller.setConfirmation('restore'), false);
  assert.equal(game.requests.length, 2);
  assert.ok(game.profile.pending);
  assert.match(accountMarkup(game.controller.getState(), game.profile), /對局或活動旅程尚未結束/);
});

test('session invalidation permits fresh account lookup rather than reusing the old identity', async () => {
  const game = signedIn(saved(), [reply({ authenticated: false, user: null, emailEnabled: true })]);
  await game.controller.init();
  game.controller.invalidateSession();
  assert.equal(await game.controller.init(), true);
  assert.equal(game.requests.length, 3);
  assert.equal(game.controller.getState().account, null);
});

test('an account mismatch guard rejection clears identity and never retries the write for another account', async () => {
  const game = signedIn(saved(), [reply({ error: { code: 'account_changed' } }, 401)]);
  await game.controller.init();
  const original = structuredClone(game.profile);
  assert.equal(await game.controller.upload(), false);
  assert.equal(game.requests.at(-1).headers['X-Mythseal-Account'], user.id);
  assert.equal(game.requests.filter(request => request.method === 'PUT').length, 1);
  assert.equal(game.controller.getState().account, null);
  assert.equal(game.controller.getState().backup, null);
  assert.match(game.controller.getState().error, /帳戶已在另一頁改變/);
  assert.deepEqual(game.profile, original);
});

test('session invalidation while waiting for the session lock prevents the queued fetch entirely', async () => {
  const release = deferred(), waiting = deferred();
  let calls = 0;
  const withSessionLock = async operation => {
    calls += 1;
    if (calls === 3) { waiting.resolve(); await release.promise; }
    return operation();
  };
  const game = signedIn(saved(), [], { withSessionLock });
  await game.controller.init();
  const uploading = game.controller.upload();
  await waiting.promise;
  game.controller.invalidateSession();
  release.resolve();
  assert.equal(await uploading, false);
  assert.equal(game.requests.length, 2);
  assert.equal(game.controller.getState().account, null);
});

test('shared session locking serializes requests through response body completion, including account lookup and logout', async () => {
  let tail = Promise.resolve(), lockEntries = 0;
  const withSessionLock = operation => {
    const result = tail.then(async () => { lockEntries += 1; return operation(); });
    tail = result.catch(() => {});
    return result;
  };
  const body = deferred(), bodyStarted = deferred();
  const first = harness([{ ok: true, json: async () => { bodyStarted.resolve(); return body.promise; } }, reply({ authenticated: false })], { withSessionLock });
  const second = harness([reply({ authenticated: false, user: null, emailEnabled: true })], { withSessionLock });
  const firstInit = first.controller.init();
  await bodyStarted.promise;
  const secondInit = second.controller.init();
  await Promise.resolve();
  assert.equal(second.requests.length, 0);
  assert.equal(lockEntries, 1);
  body.resolve({ authenticated: false, user: null, emailEnabled: true });
  assert.equal(await firstInit, true);
  assert.equal(await secondInit, true);
  assert.equal(await first.controller.logout(), true);
  assert.equal(lockEntries, 3);
});

test('the session lock is released before requesting the local profile restore lock', async () => {
  let holdingSessionLock = false, restored = false;
  const withSessionLock = async operation => {
    holdingSessionLock = true;
    try { return await operation(); } finally { holdingSessionLock = false; }
  };
  const game = signedIn(saved(), [reply(saved())], {
    withSessionLock,
    restoreLocalProfile: async (_snapshot, _fingerprint, { isCurrent }) => {
      assert.equal(holdingSessionLock, false);
      assert.equal(isCurrent(), true);
      restored = true;
    },
  });
  await game.controller.init();
  game.controller.setConfirmation('restore');
  assert.equal(await game.controller.restore(), true);
  assert.equal(restored, true);
});

test('cloud format limits never interrupt committed offline changes or prevent deleting an old backup', async () => {
  const game = signedIn(saved(), [reply(saved()), reply({ backup: null, revision: 2 })]);
  await game.controller.init();
  // This local-only value exceeds the cloud's per-string bound; ordinary offline play remains usable.
  game.profile.localOnlyNote = 'x'.repeat(600);
  assert.throws(() => fingerprintProfile(game.profile));
  assert.doesNotThrow(() => game.controller.markLocalChanged());
  assert.equal(game.controller.getState().localChanged, true);
  assert.equal(await game.controller.refreshCloud(), true);
  assert.equal(game.controller.getState().localChanged, true);
  assert.equal(game.controller.setConfirmation('restore'), false);
  assert.equal(game.controller.setConfirmation('delete'), true);
  assert.equal(await game.controller.deleteBackup(), true);
  assert.equal(game.profile.localOnlyNote.length, 600);
});

function legacyCloud(revision = 7) {
  const value = saved(revision), p = value.backup.snapshot.profile;
  value.backup.snapshot.version = 1; p.version = 3; p.collectionVersion = 1; p.collectionExpansion = 1; delete p.wx01; delete p.expansion;
  p.instances.forEach(card => { delete card.printId; });
  for (const key of ['inventory', 'levels']) p[key] = Object.fromEntries(LEGACY_CARD_IDS.map(id => [id, p[key][id]]));
  return value;
}

test('missing v3 capability permits legacy reads/restores but never uploads or deletes', async () => {
  const legacy = legacyCloud(), game = harness([reply({ authenticated: true, user, emailEnabled: true })], { legacy });
  await game.controller.init();
  const original = structuredClone(game.profile);
  assert.equal(game.controller.getState().backup.snapshot.version, 1);
  assert.equal(await game.controller.upload(), false);
  assert.equal(game.controller.setConfirmation('delete'), false);
  assert.equal(await game.controller.deleteBackup(), false);
  assert.deepEqual(game.profile, original);
  assert.match(accountMarkup(game.controller.getState(), game.profile), /新版旅程的雲端備份尚未開放/);
  assert.equal(game.controller.setConfirmation('restore'), true);
  assert.equal(await game.controller.restore(), true);
  assert.equal(game.restores.length, 1);
  assert(game.requests.every(r => r.method === 'GET'));
});

test('empty v3 can restore v1 while a new upload uses only the independent v3 revision', async () => {
  const game = signedIn({ backup: null, revision: 3 }, [reply(saved(4))], { legacy: legacyCloud(29) });
  await game.controller.init();
  assert.equal(game.controller.getState().revision, 29);
  assert.equal(game.controller.getState().writeRevision, 3);
  assert.equal(game.controller.getState().backupVersion, 1);
  assert.equal(game.controller.setConfirmation('delete'), false);
  assert.equal(await game.controller.upload(), true);
  const put = game.requests.find(r => r.method === 'PUT');
  assert.equal(put.url, '/api/v3/journey'); assert.equal(put.parsedBody.expectedRevision, 3);
  assert.equal(put.parsedBody.snapshot.version, 3);
  assert.equal(game.controller.getState().backupVersion, 3);
});

test('restore rejects equal-number revisions from a different snapshot namespace', async () => {
  const game = signedIn({ backup: null, revision: 0 }, [reply(saved(7))], { legacy: legacyCloud(7) });
  await game.controller.init(); game.controller.setConfirmation('restore');
  // One read for restore observes v3; the conflict recovery read gets that same v3.
  game.queue.push(reply(saved(7)));
  assert.equal(await game.controller.restore(), false);
  assert.equal(game.restores.length, 0);
  assert.equal(game.controller.getState().conflict, true);
});

function v2Cloud(revision = 11) {
  const value = saved(revision), p = value.backup.snapshot.profile;
  value.backup.snapshot.version = 2; p.version = 4; delete p.expansion;
  return value;
}

test('a v2-only server retains login and v4 restoration while all v5 mutations stay disabled', async () => {
  const cloud = v2Cloud(), game = harness([
    reply({ authenticated: true, user, emailEnabled: true, journeyVersions: [1, 2] }),
  ], { v2: cloud });
  assert.equal(await game.controller.init(), true);
  assert.equal(game.controller.getState().backupVersion, 2);
  assert.equal(await game.controller.upload(), false);
  assert.equal(game.controller.setConfirmation('delete'), false);
  assert.equal(await game.controller.deleteBackup(), false);
  assert.equal(game.controller.setConfirmation('restore'), true);
  assert.equal(await game.controller.restore(), true);
  assert.equal(game.profile.version, 5); assert.deepEqual(game.profile.wx01, cloud.backup.snapshot.profile.wx01);
  assert(game.requests.every(request => request.method === 'GET'));
  assert(!game.requests.some(request => request.url.startsWith('/api/v3/')));
});

test('v3 falls back to v2 before v1 without reusing the older namespace revision for writes', async () => {
  const game = harness([
    reply({ authenticated: true, user, emailEnabled: true, journeyVersions: [1, 2, 3] }),
    reply({ backup: null, revision: 2 }), reply(saved(3)),
  ], { v2: v2Cloud(44), legacy: legacyCloud(99) });
  assert.equal(await game.controller.init(), true);
  assert.equal(game.controller.getState().backupVersion, 2);
  assert.equal(game.controller.getState().revision, 44);
  assert.equal(game.controller.getState().writeRevision, 2);
  assert(!game.requests.some(request => request.url === '/api/v1/journey'));
  assert.equal(game.controller.setConfirmation('delete'), false);
  assert.equal(await game.controller.upload(), true);
  const request = game.requests.at(-1);
  assert.equal(request.url, '/api/v3/journey'); assert.equal(request.method, 'PUT');
  assert.equal(request.parsedBody.expectedRevision, 2); assert.equal(request.parsedBody.snapshot.version, 3);
  assert.equal(request.parsedBody.snapshot.profile.version, 5);
});

test('between-stage activity run blocks cloud upload and restore without changing local state', async () => {
  const game = signedIn(); await game.controller.init();
  game.profile.expansion.fireMountain.run = { phase: 'supply' };
  const original = structuredClone(game.profile);
  assert.equal(game.profile.pending, null);
  assert.equal(await game.controller.upload(), false);
  assert.equal(game.controller.setConfirmation('restore'), false);
  assert.equal(game.requests.length, 2); assert.deepEqual(game.profile, original);
  const html = accountMarkup(game.controller.getState(), game.profile);
  assert.match(html, /data-action="account-upload" disabled/);
  assert.match(html, /data-action="account-confirm-restore" disabled/);
});

test('unknown or malformed capability lists cannot enable current journey writes', async () => {
  for (const journeyVersions of ['123', [1, '3', 99], null]) {
    const game = harness([reply({ authenticated: true, user, emailEnabled: true, journeyVersions })]);
    assert.equal(await game.controller.init(), true);
    assert.equal(game.controller.getState().journeyVersion, 1);
    assert.equal(await game.controller.upload(), false);
    assert(game.requests.every(request => request.method === 'GET'));
  }
});

test('N19 a ledger-only difference is not a local change, while restore confirmation still includes the ledger', async () => {
  const receipt = seq => ({ seq, intent: { type: 'care.upgrade', uid: 'card-000001', toLevel: seq + 1 }, at: now,
    result: { cardId: 'qingxiao', printId: 'legacy/qingxiao', fromLevel: seq, toLevel: seq + 1, fromXP: seq === 1 ? 0 : 80, toXP: seq === 1 ? 80 : 200, coins: 120 * seq, dust: 6 * seq, coinsAfter: 300, dustAfter: 8 } });
  const ledger = count => ({ version: 1, nextSeq: count + 1, retiredBelow: 1, receipts: Array.from({ length: count }, (_, index) => receipt(index + 1)) });
  const cloud = saved(1, 420), game = signedIn(cloud, [reply(saved(2, 420)), reply(saved(2, 420))]);
  game.profile = { ...restoreSnapshot(cloud.backup.snapshot, { now }), commands: ledger(1) };
  await game.controller.init();
  assert.equal(game.controller.getState().localChanged, false, 'the ledger never enters a backup');
  game.controller.markLocalChanged();
  assert.equal(game.controller.getState().localChanged, false);
  assert.equal(await game.controller.upload(), true);
  const uploaded = game.requests.at(-1).parsedBody.snapshot;
  assert.equal(Object.hasOwn(uploaded.profile, 'commands'), false);
  assert.equal(game.profile.commands.nextSeq, 2, 'upload leaves the local ledger in place');

  assert.equal(game.controller.setConfirmation('restore'), true);
  const confirmed = game.controller.getState().confirmation.localFingerprint;
  assert.equal(confirmed, fingerprintProfile(game.profile), 'confirmation fingerprints the full profile, ledger included');
  game.profile = { ...game.profile, commands: ledger(2) }; // a command committed after confirmation
  assert.equal(await game.controller.restore(), false);
  assert.match(game.controller.getState().error, /此裝置的旅程已有變動/);
  assert.equal(game.restores.length, 0);
  assert.equal(game.profile.commands.nextSeq, 3);
  game.profile = { ...game.profile, coins: 999 };
  game.controller.markLocalChanged();
  assert.equal(game.controller.getState().localChanged, true, 'real journey changes still count');
  assert.equal(game.controller.setConfirmation('restore'), true);
  assert.equal(await game.controller.restore(), true, 'an unchanged profile with a ledger restores');
  assert.equal(game.restores.length, 1);
  assert.equal(game.controller.getState().localChanged, false);
});
