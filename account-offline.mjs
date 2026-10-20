/** The account seam where accounts do not exist: the store apps (docs/IOS-FIRST-FLIGHT.md).
 * A store build is an offline guest build. Its page runs at capacitor://localhost, where the
 * account client's same-origin /api calls reach the app bundle instead of mythseal.com, the
 * Worker answers only on https://mythseal.com and its __Host- cookies cannot follow, and the
 * app offers no in-app account deletion (App Review 5.1.1(v)). So in a native shell app.mjs
 * creates this controller instead of account-client.mjs's: the same methods, all inert. It
 * makes no request, reads or writes no storage, starts no timer and never calls back, so every
 * path that reaches the account (a lobby strip, a session broadcast, an old action) stops here.
 * Its state reads as looked up and signed out with email sign-in off, which is what the lobby
 * and the save prompts treat as "no cloud".
 *
 * The store build (tools/build.mjs --target native) also imports this module in place of
 * account-client.mjs and account-ui.mjs, so neither ships in the app; the last three exports
 * are those modules' names for that substitution. */

export const OFFLINE_ACCOUNT_STATE = Object.freeze({
  account: null, initialized: true, backendAvailable: false, emailEnabled: false,
  busy: null, error: '', status: '', emailDraft: '', tokenDraft: '', codeSent: false,
  backup: null, revision: 0, cloudLoaded: false, conflict: false,
  confirmation: null, localChanged: false,
  journeyVersion: 1, journeyVersions: [1], backupVersion: 1, writeRevision: 0,
});

/** account-client.mjs's controller surface, inert. Actions resolve false: nothing happened. */
export function createOfflineAccount() {
  const nothing = async () => false;
  return {
    getState: () => ({ ...OFFLINE_ACCOUNT_STATE, journeyVersions: [...OFFLINE_ACCOUNT_STATE.journeyVersions] }),
    init: nothing,
    requestCode: nothing,
    verifyCode: nothing,
    refreshCloud: nothing,
    upload: nothing,
    restore: nothing,
    deleteBackup: nothing,
    logout: nothing,
    setConfirmation() {},
    cancelConfirmation() {},
    changeEmail() {},
    setDraft() {},
    markLocalChanged() {},
    invalidateSession() {},
  };
}

// The names app.mjs imports from account-client.mjs and account-ui.mjs, for the store build.
export const createAccountController = () => createOfflineAccount();
export const accountMarkup = () => '';
export const accountButtonMarkup = () => '';
