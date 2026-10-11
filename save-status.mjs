/** Device-local save safety (docs/LOCAL-COMMANDS.md §11): when this device last made a
 * backup, what the browser answered when asked to keep this site's storage, the once-only
 * backup prompts and the new-journey restore offer. One record under its own key, like the
 * experience preferences: never part of the v5 profile, an export, a cloud backup or the
 * recovery-originals export, so a restore neither carries nor replaces it. It is a
 * convenience: unreadable or refused storage falls back to defaults and never blocks play. */
import { requestPersistence as askBrowser } from './platform.mjs';

export const SAVES_KEY = 'shanhai.saves.v1';
export const SAVE_PROMPTS = Object.freeze(['first-win', 'first-pack']);
const PERSISTENCE_STATES = ['requested', 'granted', 'denied', 'unsupported', 'error'];
const TRIGGERS = [...SAVE_PROMPTS, 'standalone'];
const PROMPT_STATES = ['due', 'shown', 'skipped'];

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isStamp = value => value === null || (typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value)));

/** Fail-safe like normalizePreferences: anything unexpected becomes the default. */
export function normalizeSaveStatus(raw) {
  const value = isRecord(raw) && raw.v === 1 ? raw : {};
  const backup = value.lastBackup, persistence = value.persistence, prompts = {};
  for (const kind of SAVE_PROMPTS) {
    const prompt = isRecord(value.prompts) ? value.prompts[kind] : null;
    if (isRecord(prompt) && PROMPT_STATES.includes(prompt.state) && isStamp(prompt.at)) prompts[kind] = { state: prompt.state, at: prompt.at };
  }
  return {
    v: 1,
    lastBackup: isRecord(backup) && ['export', 'cloud'].includes(backup.kind) && typeof backup.at === 'string' && isStamp(backup.at) ? { at: backup.at, kind: backup.kind } : null,
    persistence: isRecord(persistence) && PERSISTENCE_STATES.includes(persistence.state) && isStamp(persistence.at) && TRIGGERS.includes(persistence.trigger)
      ? { state: persistence.state, at: persistence.at, trigger: persistence.trigger } : null,
    prompts,
    restoreOffer: ['open', 'closed'].includes(value.restoreOffer) ? value.restoreOffer : null,
  };
}

/** `storage` is localStorage (or a test double). `requestPersistence` is platform.mjs's,
 * injected so a spy can count navigator.storage.persist() calls. */
export function createSaveStatus({ storage, now = () => new Date(), requestPersistence = askBrowser, navigator } = {}) {
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
   * browser answers is still counted as asked and is never asked again by a milestone. */
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
  /** The first win and the first pack opening each leave a prompt due once. Persistent
   * storage is requested at whichever comes first, once per device. */
  function milestone(kind) {
    const record = update(record => { record.prompts[kind] ??= { state: 'due', at: stamp() }; });
    return record.persistence === null ? ask(kind) : Promise.resolve(null);
  }

  return {
    status: () => { const { lastBackup, persistence } = read(); return { lastBackup, persistence }; },
    /** Page start. Never asks on an ordinary load; an installed web app asks until granted. */
    launch({ fresh = false, standalone = false } = {}) {
      if (fresh) update(record => { record.restoreOffer = 'open'; });
      return standalone && read().persistence?.state !== 'granted' ? ask('standalone') : Promise.resolve(null);
    },
    battleFinished(winner) {
      update(record => { if (record.restoreOffer === 'open') record.restoreOffer = 'closed'; });
      return winner === 'player' ? milestone('first-win') : Promise.resolve(null);
    },
    packOpened: () => milestone('first-pack'),
    recordBackup(kind) { update(record => { record.lastBackup = { at: stamp(), kind }; }); },
    /** Shown only on a journey this device just started and before its first battle. */
    showRestoreOffer(profile) {
      return read().restoreOffer === 'open' && profile.stats.played === 0 && !profile.pending && !profile.expansion?.fireMountain?.run;
    },
    closeRestoreOffer() { update(record => { if (record.restoreOffer === 'open') record.restoreOffer = 'closed'; }); },
    /** The prompt to show now, if any, consumed as it is returned: every due prompt becomes
     * shown (or skipped) at once, so each appears at most once ever. A signed-in player, or
     * one who has backed up since the milestone, is not prompted. */
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
