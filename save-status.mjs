/** Device-local save safety (docs/LOCAL-COMMANDS.md §11): when this device last made a
 * cloud backup and last started an export download, what the browser answered when asked
 * to keep this site's storage, the once-only backup prompts and the new-journey restore
 * offer. One record under its own key, like the experience preferences: never part of the
 * v5 profile, an export, a cloud backup or the recovery-originals export, so a restore
 * neither carries nor replaces it. It is a convenience: unreadable or refused storage falls
 * back to defaults and never blocks play. */
import { requestPersistence as askBrowser, checkPersistence } from './platform.mjs';

export const SAVES_KEY = 'shanhai.saves.v1';
export const SAVE_PROMPTS = Object.freeze(['first-win', 'first-pack']);
// `unanswered`: a request an earlier page made never got its answer recorded (§19).
const PERSISTENCE_STATES = ['requested', 'granted', 'denied', 'unsupported', 'error', 'unanswered'];
const TRIGGERS = [...SAVE_PROMPTS, 'standalone'];
const PROMPT_STATES = ['due', 'shown', 'skipped'];

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isStamp = value => value === null || (typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value)));

/** Fail-safe like normalizePreferences: anything unexpected becomes the default. */
export function normalizeSaveStatus(raw) {
  const value = isRecord(raw) && raw.v === 1 ? raw : {};
  const backup = value.lastBackup, exported = value.lastExport, persistence = value.persistence, prompts = {};
  for (const kind of SAVE_PROMPTS) {
    const prompt = isRecord(value.prompts) ? value.prompts[kind] : null;
    if (isRecord(prompt) && PROMPT_STATES.includes(prompt.state) && isStamp(prompt.at)) prompts[kind] = { state: prompt.state, at: prompt.at };
  }
  return {
    v: 1,
    // Only a backup the page saw succeed (a cloud backup the account API confirmed saved).
    lastBackup: isRecord(backup) && backup.kind === 'cloud' && typeof backup.at === 'string' && isStamp(backup.at) ? { at: backup.at, kind: backup.kind } : null,
    // An export download the page started. The browser does not say whether the file was
    // saved (a cancelled or blocked download looks the same), so this is never a backup.
    lastExport: isRecord(exported) && typeof exported.at === 'string' && isStamp(exported.at) ? { at: exported.at } : null,
    persistence: isRecord(persistence) && PERSISTENCE_STATES.includes(persistence.state) && isStamp(persistence.at) && TRIGGERS.includes(persistence.trigger)
      ? { state: persistence.state, at: persistence.at, trigger: persistence.trigger } : null,
    prompts,
    restoreOffer: ['open', 'closed'].includes(value.restoreOffer) ? value.restoreOffer : null,
  };
}

/** `storage` is localStorage (or a test double). `requestPersistence` and `checkPersisted`
 * are platform.mjs's, injected so a spy can count navigator.storage calls. */
export function createSaveStatus({ storage, now = () => new Date(), requestPersistence = askBrowser, checkPersisted = checkPersistence, navigator } = {}) {
  let memory = null, asking = null;
  function read() {
    let text;
    try { text = storage?.getItem(SAVES_KEY) ?? null; } catch { return normalizeSaveStatus(memory); }
    try { return normalizeSaveStatus(text === null ? memory : JSON.parse(text)); } catch { return normalizeSaveStatus(null); }
  }
  function update(change) {
    const record = read(), before = JSON.stringify(record);
    change(record);
    if (JSON.stringify(record) === before) return record;
    memory = record;
    try { storage?.setItem(SAVES_KEY, JSON.stringify(record)); } catch {}
    return record;
  }
  const stamp = () => { const date = new Date(now()); return Number.isFinite(date.getTime()) ? date.toISOString() : null; };

  /** One request at a time. "requested" is recorded first, so a page closed before the
   * browser answers is still counted as asked and is never asked again by a milestone;
   * the next page start settles that record (`settleUnanswered`). */
  function ask(trigger) {
    if (asking) return asking;
    update(record => { record.persistence = { state: 'requested', at: stamp(), trigger }; });
    asking = Promise.resolve()
      .then(() => requestPersistence({ navigator }))
      .catch(() => ({ state: 'error' }))
      .then(outcome => { update(record => { record.persistence = { state: outcome.state, at: stamp(), trigger }; }); return outcome; })
      .finally(() => { asking = null; });
    return asking;
  }
  /** The first win and the first pack opening this device records each leave a prompt due
   * once: a new journey's first, or the next one for a journey from before D2 or brought
   * onto this device. Persistent storage is requested at whichever comes first, once per
   * device. */
  function milestone(kind) {
    const record = update(record => { record.prompts[kind] ??= { state: 'due', at: stamp() }; });
    return record.persistence === null ? ask(kind) : Promise.resolve(null);
  }
  /** A "requested" record found at page start is no longer waiting on this page: its page
   * closed before the answer, or another tab is still asking. Ask `persisted()` instead,
   * which never prompts, and record granted or unanswered, unless an answer lands first.
   * Never calls persist(). */
  function settleUnanswered() {
    return Promise.resolve().then(() => checkPersisted({ navigator })).catch(() => false).then(kept => {
      update(record => {
        if (asking || record.persistence?.state !== 'requested') return;
        record.persistence = { state: kept === true ? 'granted' : 'unanswered', at: stamp(), trigger: record.persistence.trigger };
      });
      return null;
    });
  }

  return {
    status: () => { const { lastBackup, lastExport, persistence } = read(); return { lastBackup, lastExport, persistence }; },
    /** Page start. Never asks on an ordinary load; an installed web app asks until granted. */
    launch({ fresh = false, standalone = false } = {}) {
      if (fresh) update(record => { record.restoreOffer = 'open'; });
      const state = read().persistence?.state;
      if (standalone && state !== 'granted') return ask('standalone');
      return state === 'requested' ? settleUnanswered() : Promise.resolve(null);
    },
    battleFinished(winner) {
      update(record => { if (record.restoreOffer === 'open') record.restoreOffer = 'closed'; });
      return winner === 'player' ? milestone('first-win') : Promise.resolve(null);
    },
    packOpened: () => milestone('first-pack'),
    /** A cloud backup the account API confirmed saved. */
    recordBackup() { update(record => { record.lastBackup = { at: stamp(), kind: 'cloud' }; }); },
    /** An export whose download the page started. It neither skips nor clears a prompt. */
    recordExport() { update(record => { record.lastExport = { at: stamp() }; }); },
    /** Shown only on a journey this device just started and before its first battle. */
    showRestoreOffer(profile) {
      return read().restoreOffer === 'open' && profile.stats.played === 0 && !profile.pending && !profile.expansion?.fireMountain?.run;
    },
    closeRestoreOffer() { update(record => { if (record.restoreOffer === 'open') record.restoreOffer = 'closed'; }); },
    /** The prompt to show now, if any, consumed as it is returned: every due prompt becomes
     * shown (or skipped) at once, so each appears at most once ever. `guest` is false only
     * for a player the page knows to be signed in (旅程閣 looked the account up earlier in
     * this page; the lobby makes no account request). That player, or one who has made a
     * cloud backup since the milestone, is not prompted; anyone else is prompted as a guest.
     * An export does not count: the page cannot tell whether its file was saved. */
    takePrompt({ guest = true } = {}) {
      const record = read(), due = SAVE_PROMPTS.filter(kind => record.prompts[kind]?.state === 'due');
      if (!due.length) return null;
      const backedUp = record.lastBackup !== null && due.every(kind => record.lastBackup.at >= (record.prompts[kind].at ?? ''));
      const show = guest && !backedUp, at = stamp();
      update(next => { for (const kind of due) next.prompts[kind] = { state: show ? 'shown' : 'skipped', at }; });
      return show ? due[0] : null;
    },
  };
}
