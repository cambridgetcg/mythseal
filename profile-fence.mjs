/** Cross-tab read-after-write fence for the shared profile lock (docs/LOCAL-COMMANDS.md §10.1).
 *
 * localStorage is only eventually consistent between renderer processes: the next holder
 * of the exclusive Web Lock can still read the bytes from before the previous holder's
 * write. IndexedDB transactions are ordered by the browser, so every holder that may
 * write the profile records a digest of the bytes it leaves behind there, and the next
 * holder waits until its own localStorage shows those bytes.
 *
 * The fence holds no profile data. It is a change detector, never a backup, an export
 * or an authority over the journey. No DOM, network or RNG; storage, lock and clock are
 * injected so Node tests can model a browser whose tabs see writes late. */

export const PROFILE_FENCE_DB = 'shanhai.profile.fence';
export const PROFILE_FENCE_STORE = 'fence';
export const PROFILE_FENCE_VERSION = 1;
/** Wall-clock budgets for the next holder to see the previous holder's bytes. Measured
 * catch-up was under 50 ms; strict holders refuse after the budget, lenient ones go on. */
export const FENCE_STRICT_MS = 2000;
export const FENCE_LENIENT_MS = 500;
/** One fence read or write that has not finished by then counts as unavailable, so a
 * stalled IndexedDB cannot hold the profile lock forever. */
export const FENCE_IO_MS = 1500;

/** Codes name what the player can do: `missing` needs another browser, `quota` needs space,
 * the rest a retry or a reload. `unsettled` is given only when IndexedDB accepts writes, so
 * the reload it asks for can heal the record. */
export const FENCE_MESSAGES = Object.freeze({
  missing: '此瀏覽器未能提供安全儲存，未能確認各分頁的最新旅程；未有更改旅程。',
  quota: '儲存空間不足，未能確認各分頁的最新旅程；未有更改旅程，請先匯出旅程備份。',
  unavailable: '暫時未能確認各分頁的最新旅程；未有更改旅程，請稍後再試或重新整理頁面。',
  unsynced: '其他分頁剛儲存的旅程仍未同步到這裡；未有更改旅程。',
  unsettled: '上次儲存未能完整確認；未有更改旅程，重新整理頁面後再試。',
});

export class ProfileFenceError extends Error {
  constructor(code) {
    super(FENCE_MESSAGES[code]);
    this.name = 'ProfileFenceError';
    this.code = code;
  }
}

const WRITING = Object.freeze({ v: PROFILE_FENCE_VERSION, state: 'writing' });
const settled = digest => ({ v: PROFILE_FENCE_VERSION, state: 'settled', digest });
const isSettled = record => record !== null && typeof record === 'object' && record.v === PROFILE_FENCE_VERSION
  && record.state === 'settled' && typeof record.digest === 'string';

/** Two independent 32-bit hashes plus the length; null (no profile) has its own value. */
export function profileDigest(text) {
  if (text === null || text === undefined) return 'absent';
  if (typeof text !== 'string') throw new TypeError('profileDigest expects stored text.');
  let a = 0x811c9dc5, b = 0x9e3779b9 ^ text.length;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    a = Math.imul(a ^ code, 0x01000193);
    b = Math.imul(b ^ code, 0x5bd1e995); b ^= b >>> 15;
  }
  return `${text.length}:${(a >>> 0).toString(16).padStart(8, '0')}${(b >>> 0).toString(16).padStart(8, '0')}`;
}

const defaultSleep = ms => new Promise(resolve => setTimeout(resolve, ms));
// performance.now is never replaced by the smokes' fixed Date.
const defaultClock = () => globalThis.performance?.now?.() ?? Date.now();

const NOT_READ = Symbol('not read');
const attempt = read => { try { return read(); } catch { return NOT_READ; } };

const isQuota = error => ['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'].includes(error?.name);
/** Why a fence read or write failed. No IndexedDB, or one the browser denies to this page
 * (SecurityError), is `missing`; a full disk is `quota`; anything else, a stall included,
 * is `unavailable`, which a retry or a reload may clear. */
function fenceFailure(error) {
  if (error?.name === 'ProfileFenceError' && ['missing', 'quota', 'unavailable'].includes(error.code)) return error;
  if (error?.name === 'SecurityError') return new ProfileFenceError('missing');
  return new ProfileFenceError(isQuota(error) ? 'quota' : 'unavailable');
}

/** Abandon a fence operation after `ms`; the signal stops one that has not started yet. */
async function within(operation, ms) {
  const controller = new AbortController();
  let timer;
  const expired = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new ProfileFenceError('unavailable')); }, ms); });
  try { return await Promise.race([operation(controller.signal), expired]); }
  finally { clearTimeout(timer); }
}

async function caughtUp(read, digest, { budget, sleep, clock }) {
  const start = clock();
  for (let step = 0; ;) {
    const text = attempt(read);
    if (text !== NOT_READ && profileDigest(text) === digest) return true;
    if (clock() - start >= budget) return false;
    step = Math.min(step ? step * 2 : 2, 50);
    await sleep(step);
  }
}

/** Wrap an exclusive lock so its holder sees every earlier holder's profile write.
 *
 * - `request(asyncCallback)` acquires the exclusive lock (navigator.locks.request).
 * - `fence` is `{ read({ signal }): Promise<record|null>, write(record|null, { signal }): Promise }`;
 *   each call that has not settled within `ioBudget` ms counts as unavailable.
 * - `read()` returns the stored profile text, synchronously.
 * - `strict`: refuse (reject with ProfileFenceError before the callback runs) when the
 *   fence cannot prove the bytes are current. Lenient holders are writers whose callback
 *   saves the profile whenever it returns; they wait for a shorter budget (all of it when
 *   the record is "writing" or malformed) and then proceed as they did before the fence,
 *   and their write heals the fence.
 *
 * The returned function takes a synchronous callback, like the raw lock, and resolves to
 * its result. A failure to record the bytes afterwards does not hide that result: the
 * fence then stays "writing", which a strict holder refuses until a lenient write; that
 * write waits its whole budget first, and a tab still behind after it can lose the
 * unrecorded write. While IndexedDB refuses fence writes (a full disk), nothing heals the
 * record, so every lenient holder waits that budget and strict holders name the cause
 * (docs/LOCAL-COMMANDS.md §10.1 Limits). */
export function createFencedLock({ request, fence, read, strict = true, budget, ioBudget = FENCE_IO_MS, sleep = defaultSleep, clock = defaultClock }) {
  const wait = { budget: budget ?? (strict ? FENCE_STRICT_MS : FENCE_LENIENT_MS), sleep, clock };
  const load = () => within(signal => fence.read({ signal }), ioBudget);
  const recordFence = next => within(signal => fence.write(next, { signal }), ioBudget);
  return callback => request(async () => {
    let record = null, readable = true;
    try { record = await load(); } catch (error) { readable = false; if (strict) throw fenceFailure(error); }
    // Verified: these bytes have the digest the previous holder recorded. Equal content is
    // not proof that every write has arrived, so the bytes are checked again below.
    let verified = readable && record === null;
    if (readable && record !== null) {
      if (!isSettled(record)) {
        if (strict) {
          // A reload heals this record only while IndexedDB accepts writes. Writing the mark
          // again changes nothing for any holder and shows whether it does, so a full disk is
          // told it needs space instead of a reload that cannot help (§10.1).
          try { await recordFence(WRITING); } catch (error) { throw fenceFailure(error); }
          throw new ProfileFenceError('unsettled');
        }
        // "writing" or malformed: a holder may have saved and then failed to record its bytes
        // (a failed settle, a closed tab). There is no digest to wait for, so give that write
        // the whole lenient budget to reach this tab before this write heals the fence.
        await sleep(wait.budget);
      }
      else if (await caughtUp(read, record.digest, wait)) verified = true;
      else if (strict) throw new ProfileFenceError('unsynced');
    }
    // From here until the settle below, a crash leaves "writing" behind.
    let marked = false;
    if (readable) {
      try { await recordFence(WRITING); marked = true; }
      catch (error) { if (strict) throw fenceFailure(error); }
    }
    let before = attempt(read);
    // After X → Y → X, a tab that still shows the first X matches the record at once, and
    // the older Y can land while the mark above is in flight. Decide only on the bytes that
    // matched: a strict holder puts the record back and refuses; a lenient one waits again.
    if (verified && record !== null && (before === NOT_READ || profileDigest(before) !== record.digest)) {
      if (strict) { try { await recordFence(record); } catch {} throw new ProfileFenceError('unsynced'); }
      verified = await caughtUp(read, record.digest, wait);
      before = attempt(read);
    }
    let result, failure, threw = false;
    try { result = callback(); } catch (error) { threw = true; failure = error; }
    const after = marked ? attempt(read) : NOT_READ;
    // Only bytes proven current, or this holder's own write, may become the new fence. A
    // lenient holder is a writer: a callback that returned has saved, even identical bytes.
    // One that could not catch up and wrote nothing puts the old record back; when the
    // bytes could not be read, "writing" stays and strict holders refuse.
    let next;
    if (after !== NOT_READ) {
      if (verified || !threw || (before !== NOT_READ && after !== before)) next = settled(profileDigest(after));
      else if (before !== NOT_READ) next = record;
    }
    if (next !== undefined) { try { await recordFence(next); } catch {} }
    if (threw) throw failure;
    return result;
  });
}

/** The fence record store in IndexedDB. Each read and write is one transaction that has
 * completed before the promise resolves, so it is visible to the next lock holder. */
export function createIndexedDBFence(factory, { name = PROFILE_FENCE_DB, key = 'shanhai.profile.v5' } = {}) {
  let opening = null;
  function open() {
    if (!factory || typeof factory.open !== 'function') return Promise.reject(new ProfileFenceError('missing'));
    opening ??= new Promise((resolve, reject) => {
      const request = factory.open(name, PROFILE_FENCE_VERSION);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(PROFILE_FENCE_STORE)) request.result.createObjectStore(PROFILE_FENCE_STORE); };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); opening = null; };
        db.onclose = () => { opening = null; };
        resolve(db);
      };
      request.onerror = () => reject(request.error ?? new ProfileFenceError('unavailable'));
      request.onblocked = () => reject(new ProfileFenceError('unavailable'));
    }).catch(error => { opening = null; throw error; });
    return opening;
  }
  async function run(mode, operate, signal) {
    const db = await open();
    // A caller that gave up must not start a transaction after the lock has moved on.
    if (signal?.aborted) throw new ProfileFenceError('unavailable');
    return new Promise((resolve, reject) => {
      let transaction, value;
      try { transaction = db.transaction(PROFILE_FENCE_STORE, mode); }
      catch (error) { opening = null; reject(error); return; }
      const request = operate(transaction.objectStore(PROFILE_FENCE_STORE));
      request.onsuccess = () => { value = request.result; };
      transaction.oncomplete = () => resolve(value);
      transaction.onerror = transaction.onabort = () => reject(transaction.error ?? request.error ?? new ProfileFenceError('unavailable'));
    });
  }
  return {
    read: ({ signal } = {}) => run('readonly', store => store.get(key), signal).then(value => value === undefined ? null : value),
    write: (record, { signal } = {}) => run('readwrite', store => record === null ? store.delete(key) : store.put(record, key), signal),
  };
}
