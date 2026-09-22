import { createSnapshot, validateSnapshot, fingerprintProfile, SNAPSHOT_VERSION } from './cloud-save.mjs';

const messages = {
  unauthorized: '登入已失效，請重新登入。此裝置的旅程仍然保留。',
  unauthenticated: '登入已失效，請重新登入。此裝置的旅程仍然保留。',
  email_disabled: '登入暫未開放，你仍可繼續此裝置的旅程。',
  otp_disabled: '登入暫未開放，你仍可繼續此裝置的旅程。',
  invalid_otp: '驗證碼不正確或已過期，請檢查後再試。',
  invalid_token: '驗證碼不正確或已過期，請檢查後再試。',
  rate_limited: '操作太頻密，請稍候再試。',
  revision_conflict: '雲端旅程已有更新。請重新讀取、比較兩份旅程，再決定下一步。',
  backend_unavailable: '暫時連不上旅程閣。此裝置的旅程不受影響。',
  invalid_response: '暫時未能讀取旅程資料。此裝置的旅程不受影響。',
  network_error: '暫時連不上旅程閣。請檢查連線後再試。',
  sign_in_required: '登入已失效，請重新登入。此裝置的旅程仍然保留。',
  email_unavailable: '登入暫未開放，你仍可繼續此裝置的旅程。',
  invalid_email: '請輸入有效的電郵地址。',
  invalid_code: '驗證碼不正確或已過期，請檢查後再試。',
  cloud_unavailable: '暫時連不上雲端備份。此裝置的旅程不受影響。',
  account_unavailable: '暫時未能確認登入，請稍候再試。',
  invalid_snapshot: '這份旅程未能備份。請先完成對局，再重新讀取及比較旅程。',
  request_too_large: '這份旅程暫時超出備份容量，請保留此裝置的進度。',
  account_changed: '登入帳戶已在另一頁改變，請重新登入並確認旅程。此裝置的進度仍然保留。',
  journey_version_unsupported: '新版旅程的雲端備份尚未開放。你仍可下載本機備份，或讀取及恢復舊版雲端旅程。',
};

function failure(code, status = 0) {
  const error = new Error(messages[code] || '操作未完成，請稍後再試。此裝置的旅程仍然保留。');
  error.code = code;
  error.status = status;
  return error;
}

const supportedVersions = value => [1, 2, 3].filter(version => version === 1 || Array.isArray(value.journeyVersions) && value.journeyVersions.includes(version));
const capability = value => { const journeyVersions = supportedVersions(value); return { journeyVersions, journeyVersion: journeyVersions.at(-1) }; };

function cloudResponse(value, version) {
  if (!value || !Number.isSafeInteger(value.revision) || value.revision < 0) throw failure('invalid_response');
  if (value.backup === null) return { backup: null, revision: value.revision };
  const backup = value.backup;
  if (!backup || backup.revision !== value.revision || value.revision < 1
      || typeof backup.updatedAt !== 'string' || !Number.isFinite(Date.parse(backup.updatedAt))) throw failure('invalid_response');
  try {
    return { revision: value.revision, backup: { revision: backup.revision, updatedAt: backup.updatedAt, snapshot: validateSnapshot(backup.snapshot, { version }) } };
  } catch {
    throw failure('invalid_response');
  }
}

function browserSessionLock(operation, { signal } = {}) {
  return globalThis.navigator?.locks
    ? globalThis.navigator.locks.request('mythseal-account-session', { signal }, operation)
    : operation();
}

/** Cookie-only account access; this module never reads or writes browser storage. */
export function createAccountController({ getLocalProfile, restoreLocalProfile, onChange = () => {}, notify = () => {}, fetchImpl = globalThis.fetch, withSessionLock = browserSessionLock }) {
  let generation = 0;
  let activeController = null;
  let state = {
    account: null, initialized: false, backendAvailable: null, emailEnabled: false,
    busy: null, error: '', status: '', emailDraft: '', tokenDraft: '', codeSent: false,
    backup: null, revision: 0, cloudLoaded: false, conflict: false,
    confirmation: null, localChanged: false,
    journeyVersion: 1, journeyVersions: [1], backupVersion: 1, writeRevision: 0,
  };

  const getState = () => structuredClone(state);
  const publish = patch => { state = { ...state, ...patch }; onChange(getState()); };
  const current = scope => scope.generation === generation && !scope.controller.signal.aborted && scope.accountId === (state.account?.id ?? null);
  const announce = message => { publish({ status: message }); notify(message); };
  const localDiffers = backup => {
    if (!backup) return true;
    try { return fingerprintProfile(getLocalProfile()) !== fingerprintProfile(backup.snapshot.profile); }
    catch { return true; } // Cloud size/format limits must never interrupt a committed offline action.
  };

  async function request(scope, path, { method = 'GET', body, version = path === 'journey' ? state.journeyVersion : 1 } = {}) {
    try {
      return await withSessionLock(async () => {
        // Another tab may change the session while this request waits for the lock.
        if (!current(scope)) throw failure('request_cancelled');
        const timeout = setTimeout(() => scope.controller.abort(), 15000);
        try {
          const response = await fetchImpl(`/api/v${version}/${path}`, {
            method, credentials: 'same-origin', cache: 'no-store', signal: scope.controller.signal,
            headers: {
              Accept: 'application/json',
              ...(path === 'journey' ? { 'X-Mythseal-Account': scope.accountId } : {}),
              ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            },
            ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
          });
          // Keep the session lock through the full response, including cookie refresh completion.
          const value = await response.json().catch(() => null);
          if (!response.ok) throw failure(value?.error?.code || (response.status === 401 ? 'unauthenticated' : 'backend_unavailable'), response.status);
          if (!value || typeof value !== 'object') throw failure('invalid_response');
          return value;
        } finally {
          clearTimeout(timeout);
        }
      }, { signal: scope.controller.signal });
    } catch (error) {
      if (typeof error?.code === 'string' && Number.isInteger(error.status)) throw error;
      throw failure('network_error');
    }
  }

  function acceptCloud(value, version = state.journeyVersion, writeRevision = value.revision) {
    const cloud = cloudResponse(value, version);
    publish({ ...cloud, backupVersion: version, writeRevision, cloudLoaded: true, localChanged: localDiffers(cloud.backup) });
    return cloud;
  }

  async function readCloud(scope) {
    const value = await request(scope, 'journey');
    if (!current(scope)) return null;
    // Preserve old namespaces for restoration, while retaining the newest
    // namespace's independent CAS revision for future writes.
    if (cloudResponse(value, state.journeyVersion).backup === null) {
      for (const version of state.journeyVersions.filter(version => version < state.journeyVersion).reverse()) {
        const legacy = await request(scope, 'journey', { version });
        if (!current(scope)) return null;
        if (cloudResponse(legacy, version).backup) return acceptCloud(legacy, version, value.revision);
      }
    }
    return acceptCloud(value);
  }

  function clearSession(message = '') {
    generation += 1;
    activeController?.abort();
    activeController = null;
    publish({ account: null, initialized: false, busy: null, backup: null, revision: 0, writeRevision: 0, journeyVersion: 1, journeyVersions: [1], backupVersion: 1, cloudLoaded: false, conflict: false, confirmation: null, codeSent: false, emailDraft: '', tokenDraft: '', error: message, status: '', localChanged: false });
  }

  async function run(name, action, { authenticated = false } = {}) {
    if (state.busy) return false;
    if (authenticated && !state.account) { publish({ error: messages.unauthenticated }); return false; }
    const scope = { generation, accountId: state.account?.id ?? null, controller: new AbortController() };
    activeController = scope.controller;
    publish({ busy: name, error: '', status: '' });
    try {
      const result = await action(scope);
      return current(scope) && result !== false;
    } catch (error) {
      // Abort suppresses late responses after logout, but a timed-out current request still reports failure.
      if (scope.generation !== generation || scope.accountId !== (state.account?.id ?? null)) return false;
      if (error?.status === 401) { clearSession(error.code === 'account_changed' ? messages.account_changed : messages.unauthenticated); return false; }
      if (error?.status === 409 || error?.code === 'revision_conflict') {
        publish({ conflict: true, confirmation: null, error: messages.revision_conflict });
        try { await readCloud(scope); } catch { if (scope.generation === generation && scope.accountId === (state.account?.id ?? null)) publish({ cloudLoaded: false }); }
      } else {
        publish({ error: error?.code ? error.message : (error instanceof Error ? error.message : messages.network_error), confirmation: null });
      }
      return false;
    } finally {
      if (scope.generation === generation) { activeController = null; publish({ busy: null }); }
    }
  }

  function needsReview() {
    if (!state.cloudLoaded || state.conflict) {
      publish({ error: state.conflict ? messages.revision_conflict : '請先重新讀取雲端旅程，再決定是否備份。' });
      return true;
    }
    return false;
  }

  return {
    getState,
    async init() {
      if (state.initialized && state.backendAvailable) return true;
      return run('init', async scope => {
        const value = await request(scope, 'account');
        if (!current(scope)) return false;
        if (typeof value.authenticated !== 'boolean' || typeof value.emailEnabled !== 'boolean'
            || (value.authenticated && (!value.user || typeof value.user.id !== 'string' || !value.user.id || typeof value.user.email !== 'string'))) throw failure('invalid_response');
        const account = value.authenticated ? { id: value.user.id, email: value.user.email } : null;
        scope.accountId = account?.id ?? null;
        publish({ account, initialized: true, backendAvailable: true, emailEnabled: value.emailEnabled, ...capability(value) });
        if (account) await readCloud(scope);
      });
    },
    async requestCode(email) {
      if (state.account || !state.emailEnabled) { publish({ error: messages.email_disabled }); return false; }
      email = String(email ?? '').trim();
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { publish({ error: '請輸入有效的電郵地址。' }); return false; }
      return run('request-code', async scope => {
        await request(scope, 'auth/otp', { method: 'POST', body: { email } });
        if (!current(scope)) return false;
        publish({ emailDraft: email, tokenDraft: '', codeSent: true });
        announce('驗證碼已寄出，請查看收件匣或垃圾郵件。');
      });
    },
    async verifyCode(token) {
      token = String(token ?? '').trim();
      if (!state.codeSent || !/^\d{6}$/.test(token)) { publish({ error: '請輸入電郵中的六位數字驗證碼。' }); return false; }
      return run('verify-code', async scope => {
        publish({ tokenDraft: '' });
        await request(scope, 'auth/verify', { method: 'POST', body: { email: state.emailDraft, token } });
        if (!current(scope)) return false;
        const value = await request(scope, 'account');
        if (!current(scope)) return false;
        if (!value.authenticated || !value.user?.id || typeof value.user.email !== 'string') throw failure('invalid_response');
        scope.accountId = value.user.id;
        publish({ account: { id: value.user.id, email: value.user.email }, codeSent: false, emailDraft: '', initialized: true, backendAvailable: true, ...capability(value) });
        await readCloud(scope);
        if (current(scope)) announce('已登入。兩份旅程會保持原樣，請自行選擇備份或恢復。');
      });
    },
    async refreshCloud() {
      return run('refresh', async scope => {
        const value = await readCloud(scope);
        if (!value || !current(scope)) return false;
        publish({ conflict: false, confirmation: null });
        announce('已重新讀取雲端旅程。請比較內容後再操作。');
      }, { authenticated: true });
    },
    async upload() {
      if (state.journeyVersion !== SNAPSHOT_VERSION) { publish({ error: messages.journey_version_unsupported }); return false; }
      if (needsReview()) return false;
      return run('upload', async scope => {
        const snapshot = createSnapshot(getLocalProfile());
        if (snapshot.version !== SNAPSHOT_VERSION) throw failure('journey_version_unsupported');
        const expectedRevision = state.writeRevision;
        const value = await request(scope, 'journey', { method: 'PUT', body: { expectedRevision, snapshot } });
        if (!current(scope)) return false;
        acceptCloud(value);
        publish({ conflict: false, confirmation: null });
        announce('此裝置的旅程已備份。');
      }, { authenticated: true });
    },
    setConfirmation(action) {
      if (state.busy || !state.account || !state.backup || needsReview() || !['restore', 'delete'].includes(action)) return false;
      if (action === 'delete' && (state.journeyVersion !== SNAPSHOT_VERSION || state.backupVersion !== SNAPSHOT_VERSION)) { publish({ error: messages.journey_version_unsupported }); return false; }
      try {
        if (action === 'restore') createSnapshot(getLocalProfile());
        publish({ confirmation: { action, revision: state.revision, snapshotVersion: state.backupVersion, localFingerprint: action === 'restore' ? fingerprintProfile(getLocalProfile()) : null }, error: '', status: '' });
        return true;
      } catch (error) { publish({ error: error.message }); return false; }
    },
    cancelConfirmation() { if (!state.busy) publish({ confirmation: null }); },
    async restore() {
      const confirmation = state.confirmation;
      if (confirmation?.action !== 'restore') { publish({ error: '請先確認要恢復的雲端旅程。' }); return false; }
      return run('restore', async scope => {
        const expectedFingerprint = confirmation.localFingerprint;
        if (fingerprintProfile(getLocalProfile()) !== expectedFingerprint) throw new Error('此裝置的旅程已有變動，請重新比較後再恢復。');
        const latest = await readCloud(scope);
        if (!current(scope)) return false;
        if (!latest?.backup || latest.revision !== confirmation.revision || latest.backup.snapshot.version !== confirmation.snapshotVersion) throw failure('revision_conflict', 409);
        if (fingerprintProfile(getLocalProfile()) !== expectedFingerprint) throw new Error('此裝置的旅程已有變動，請重新比較後再恢復。');
        const restored = await restoreLocalProfile(structuredClone(latest.backup.snapshot), expectedFingerprint, { isCurrent: () => current(scope) });
        if (!current(scope)) return false;
        if (restored === false) throw new Error('旅程未有更改。請重新比較後再恢復。');
        publish({ confirmation: null, localChanged: localDiffers(latest.backup) });
        announce('已恢復雲端旅程；原本的裝置旅程已留作回復副本。');
      }, { authenticated: true });
    },
    async deleteBackup() {
      if (state.journeyVersion !== SNAPSHOT_VERSION || state.backupVersion !== SNAPSHOT_VERSION) { publish({ error: messages.journey_version_unsupported }); return false; }
      const confirmation = state.confirmation;
      if (confirmation?.action !== 'delete') { publish({ error: '請先確認要刪除的雲端備份。' }); return false; }
      return run('delete', async scope => {
        const value = await request(scope, 'journey', { method: 'DELETE', body: { expectedRevision: confirmation.revision } });
        if (!current(scope)) return false;
        acceptCloud(value);
        publish({ confirmation: null });
        announce('雲端備份已刪除。此裝置的旅程仍然保留。');
      }, { authenticated: true });
    },
    async logout() {
      const previousAccount = state.account;
      clearSession();
      publish({ initialized: true });
      return run('logout', async scope => {
        try { await request(scope, 'auth/logout', { method: 'POST', body: {} }); }
        catch (error) {
          if (scope.generation === generation && error?.code === 'sign_out_incomplete') {
            publish({ error: '此裝置已登出，但未能確認雲端登出狀態。請稍候再試。' });
            return false;
          }
          if (scope.generation === generation && error?.status !== 401) {
            scope.accountId = previousAccount?.id ?? null;
            publish({ account: previousAccount });
            throw new Error('未能確認登出，請連線後再試。此裝置的旅程仍然保留。');
          }
        }
        if (!current(scope)) return false;
        announce('已登出。此裝置的旅程仍然保留。');
      });
    },
    changeEmail() { if (!state.busy && !state.account) publish({ codeSent: false, tokenDraft: '', error: '', status: '' }); },
    setDraft(field, value) {
      if (state.busy || state.account) return;
      if (field === 'email' || field === 'emailDraft') state = { ...state, emailDraft: String(value).slice(0, 254) };
      if (field === 'token' || field === 'tokenDraft') state = { ...state, tokenDraft: String(value).slice(0, 6) };
    },
    markLocalChanged() {
      publish({ localChanged: localDiffers(state.backup), confirmation: null });
    },
    invalidateSession() { clearSession(messages.unauthenticated); },
  };
}
