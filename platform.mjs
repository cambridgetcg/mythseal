/** Platform seam for keeping a journey (docs/LOCAL-COMMANDS.md §11). The browser build asks
 * the browser to keep this site's storage, downloads the existing journey export and reads
 * an exported file back as a validated candidate. In the store app, native-shell.mjs supplies
 * the rest of M5.2's adapter: the export goes through a share sheet, and a durable copy of the
 * journey sits in the app's files (docs/IOS-FIRST-FLIGHT.md). Nothing here writes the journey:
 * a candidate is applied only by the shared strict restore (profile-store.mjs `restore`).
 * No network or RNG; navigator, window and document are injected so Node tests can spy. */
import { PROFILE_VERSION, hydrateProfile } from './progression.mjs';
import { saveFile } from './native-shell.mjs';
import { createSnapshot, restoreSnapshot, fingerprintProfile, MAX_SNAPSHOT_BYTES } from './cloud-save.mjs';
import { assertLocalProfile, createProfileStore } from './profile-store.mjs';

/** A larger file is refused before it is read. Every journey the game can save fits: its
 * compact JSON is inside the same 4 MiB backup envelope (assertLocalProfile). */
export const MAX_IMPORT_BYTES = MAX_SNAPSHOT_BYTES;

/** Every refusal names its cause and promises that nothing changed (§11). */
export const IMPORT_MESSAGES = Object.freeze({
  'too-large': '這個檔案超過 4 MiB，不是萬象契的旅程備份；本機旅程未有更改。',
  unreadable: '未能讀取這個檔案；本機旅程未有更改。',
  unparsable: '未能讀取這個檔案；請選擇「匯出旅程備份」下載的 .json 檔。本機旅程未有更改。',
  'not-export': '這不是「匯出旅程備份」下載的檔案；本機旅程未有更改。',
  'old-version': '這份備份來自 v0.4.1 之前的萬象契，暫未支援匯入；本機旅程未有更改。',
  'future-version': '這份備份來自較新版本的萬象契，請先重新整理頁面；本機旅程未有更改。',
  unfinished: '這份備份匯出時仍有未完對局或活動旅程，未能還原；本機旅程未有更改。',
  tampered: '這份備份的資料前後不一致，可能曾被修改，未能還原；本機旅程未有更改。',
  invalid: '這份備份格式不完整，未能還原；本機旅程未有更改。',
});

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const utf8Bytes = text => new TextEncoder().encode(text).byteLength;
const refuse = reason => ({ ok: false, reason, message: IMPORT_MESSAGES[reason] });

/** What the import dialog compares; counts only, never identities. */
export function journeySummary(profile) {
  return {
    cards: profile.instances.length, vault: profile.merchantVault.length, coins: profile.coins, dust: profile.dust,
    xp: profile.xp, decks: profile.deckSlots.length, played: profile.stats.played, won: profile.stats.won, date: profile.daily.date,
  };
}

/** The existing export format: the raw v5 profile as JSON, ledger included, two-space
 * indented as before. A journey whose indented text would pass the import limit is written
 * compactly instead, so every export the game makes can be imported again. */
export function exportText(profile) {
  const indented = JSON.stringify(profile, null, 2);
  return utf8Bytes(indented) <= MAX_IMPORT_BYTES ? indented : JSON.stringify(profile);
}
export const exportFilename = profile => `萬象契旅程-${profile.daily.date}.json`;

/** Hand the export to the player: a download on the web, the share sheet in the app
 * (native-shell.mjs saveFile; a dismissed sheet rejects with SaveCancelled). `importable` says
 * whether importJourney would accept this file; it is false only while a battle or activity is
 * unfinished (the file is still saved). `via` is 'download' or 'share'. */
export async function exportJourney(profile, { document = globalThis.document, URL: urls = globalThis.URL, Blob: BlobType = globalThis.Blob, setTimeout: later = globalThis.setTimeout, now = new Date(), scope = globalThis } = {}) {
  const text = exportText(profile), filename = exportFilename(profile), check = checkJourneyText(text, { now });
  const saved = await saveFile({ name: filename, text }, { scope, document, URL: urls, Blob: BlobType, setTimeout: later });
  return { filename, bytes: utf8Bytes(text), importable: check.ok, reason: check.ok ? null : check.reason, via: saved.via };
}

/** Profile versions an export can come from besides the current one. Every public build
 * before v0.6.0 (v0.4.1, v0.5.0 and v0.5.1) exported a v3 profile; v4 is the namespace
 * load() also migrates. Older files are refused. */
export const LEGACY_EXPORT_VERSIONS = Object.freeze([3, 4]);

/** A v3 or v4 export, migrated exactly as load() migrates the same journey found under its
 * own legacy key on this device: the strict legacy check (exact copies, canonical at its
 * day, no v5-only data, no ledger), the migration and the same-copies check. The file's own
 * day is the clock, so the candidate gains no daily rollover. Throws on any refusal. */
function migrateLegacyExport(text, version, day) {
  const key = `shanhai.profile.v${version}`;
  return createProfileStore({ storage: { getItem: name => (name === key ? text : null) }, now: () => day }).load();
}

/** Validate exported text as a restore candidate, with the rules load, save and cloud
 * restore already apply. Pure; returns `{ ok: true, snapshot, summary, legacy }` or a
 * refusal. The file's command ledger is checked, then left out: it belongs to the device
 * that wrote it, and the restore retires this device's lineage instead (§11, §15
 * decision 1). An export from before v0.6.0 is migrated first and then checked as a v5 one. */
export function checkJourneyText(text, { now = new Date() } = {}) {
  if (typeof text !== 'string') return refuse('unreadable');
  if (utf8Bytes(text) > MAX_IMPORT_BYTES) return refuse('too-large');
  let profile;
  try { profile = JSON.parse(text); } catch { return refuse('unparsable'); }
  // Only the export: not a cloud snapshot envelope, a recovery-originals file or anything else.
  if (!isRecord(profile) || Object.hasOwn(profile, 'format') || !Number.isSafeInteger(profile.version)) return refuse('not-export');
  if (profile.version > PROFILE_VERSION) return refuse('future-version');
  const legacy = profile.version < PROFILE_VERSION;
  if (legacy && !LEGACY_EXPORT_VERSIONS.includes(profile.version)) return refuse('old-version');
  if (!isRecord(profile.daily) || typeof profile.daily.date !== 'string') return refuse('invalid');
  if ((Object.hasOwn(profile, 'pending') && profile.pending !== null) || (profile.expansion?.fireMountain?.run ?? null) !== null) return refuse('unfinished');
  const day = `${profile.daily.date}T12:00:00.000Z`;
  // The bounded walk first (depth, size, forbidden keys such as __proto__), then the migration.
  if (legacy) {
    try { fingerprintProfile(profile); profile = migrateLegacyExport(text, profile.version, day); }
    catch { return refuse('invalid'); }
  }
  // Canonical at its own day, as assertLocalProfile and validateSnapshot require: an edit
  // that leaves the journey inconsistent (XP against level, counts against copies, unknown
  // fields, a damaged ledger) is refused. A self-consistent edit is not detectable; a local
  // save is editable and never an ownership claim.
  let consistent;
  try { consistent = fingerprintProfile(profile) === fingerprintProfile(hydrateProfile(profile, { now: day })); }
  catch { return refuse('invalid'); }
  if (!consistent) return refuse('tampered');
  let snapshot;
  try { assertLocalProfile(profile); snapshot = createSnapshot(profile); restoreSnapshot(snapshot, { now }); }
  catch { return refuse('invalid'); }
  return { ok: true, snapshot, summary: journeySummary(snapshot.profile), legacy };
}

/** Read a picked file (a File or Blob). Oversize files are refused before reading. */
export async function importJourney(file, { now = new Date() } = {}) {
  if (!file || typeof file.size !== 'number' || typeof file.text !== 'function') return refuse('unreadable');
  if (file.size > MAX_IMPORT_BYTES) return refuse('too-large');
  let text;
  try { text = await file.text(); } catch { return refuse('unreadable'); }
  return checkJourneyText(text, { now });
}

/** The store app's launch after iOS cleared its web storage (docs/IOS-FIRST-FLIGHT.md). If the
 * app's file copy (native-shell.mjs createDurableMirror) holds a journey, it is checked exactly
 * as an imported file is (checkJourneyText) and handed to `restore`, which in app.mjs is the
 * strict fenced restore every restore shares: the recovery copy first, one profile write,
 * nothing on refusal. It is never written into storage any other way. A copy that fails the
 * check or the restore is set aside, kept, and so never overwritten by the new journey's saves.
 * Resolves { state, reason }: 'none' (no copy), 'restored', 'refused' (set aside), or 'kept'
 * (refused but could not be moved: the caller must leave the copy alone for this launch). */
export async function restoreFromMirror({ mirror, restore, now = new Date() }) {
  const text = await mirror.read();
  if (text === null) return { state: 'none', reason: null };
  const check = checkJourneyText(text, { now });
  let reason = check.ok ? null : check.message;
  if (check.ok) {
    try { await restore(check.snapshot); return { state: 'restored', reason: null }; }
    catch (error) { reason = error?.message || String(error); }
  }
  try { await mirror.setAside(); return { state: 'refused', reason }; }
  catch { return { state: 'kept', reason }; }
}

/** Ask the browser to keep this site's storage. Feature-detected; never throws. Already
 * persisted storage is reported without asking again. */
export async function requestPersistence({ navigator: nav = globalThis.navigator } = {}) {
  let manager;
  try { manager = nav?.storage; } catch { manager = undefined; }
  if (!manager || typeof manager.persist !== 'function') return { state: 'unsupported', asked: false };
  try {
    if (typeof manager.persisted === 'function' && await manager.persisted() === true) return { state: 'granted', asked: false };
    return { state: await manager.persist() === true ? 'granted' : 'denied', asked: true };
  } catch { return { state: 'error', asked: true }; }
}

/** Whether the browser already keeps this site's storage, from `persisted()`, which never
 * prompts. Feature-detected; never throws; false when it cannot tell. */
export async function checkPersistence({ navigator: nav = globalThis.navigator } = {}) {
  try { return typeof nav?.storage?.persisted === 'function' && await nav.storage.persisted() === true; }
  catch { return false; }
}

/** Launched as an installed web app (or an iOS home-screen app). */
export function isStandalone({ window: win = globalThis.window, navigator: nav = globalThis.navigator } = {}) {
  try { if (win?.matchMedia?.('(display-mode: standalone)')?.matches === true) return true; } catch {}
  try { return nav?.standalone === true; } catch { return false; }
}

export { isNativeShell } from './native-shell.mjs';
