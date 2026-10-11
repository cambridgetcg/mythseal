/** Version-separated local persistence. Call save under shanhai-profile-v3 lock. */
import { PROFILE_KEY, PROFILE_VERSION, createProfile, hydrateProfile } from './progression.mjs';
import { fingerprintProfile, assertLegacyExpansionBoundary, createSnapshot, SNAPSHOT_FORMAT, SNAPSHOT_VERSION, MAX_SNAPSHOT_CARDS } from './cloud-save.mjs';
import { retireCommandLedger } from './command-ledger.mjs';
import { LEGACY_CARD_IDS } from './engine.mjs';

export const BATTLE_KEY = 'shanhai.battle.v5';
export const RECOVERY_KEY = 'shanhai.profile.recovery.v5';
export const PROFILE_LOCK = 'shanhai-profile-v3';
const sources = [
  { profile: 'shanhai.profile.v4', battle: 'shanhai.battle.v4', version: 4 },
  { profile: 'shanhai.profile.v3', battle: 'shanhai.battle.v3', version: 3 },
  { profile: 'shanhai.profile.v2', battle: 'shanhai.battle.v2', version: 2 },
];
function parse(text, label) {
  try { return JSON.parse(text); }
  catch { throw Error(`${label}暫時無法讀取；原有存檔仍保留，未有建立或覆蓋旅程。`); }
}
function sameCopies(before, after) {
  if (!Array.isArray(before.instances)) return;
  const rows = profile => [...profile.instances.map(card => [card.uid, card.cardId, card.xp, card.battles, card.wins, 'owned']),
    ...(profile.merchantVault ?? []).map(({ instance: card }) => [card.uid, card.cardId, card.xp, card.battles, card.wins, 'vault'])].sort((a, b) => a[0].localeCompare(b[0]));
  if (JSON.stringify(rows(before)) !== JSON.stringify(rows(after))) throw Error('舊旅程的卡牌記錄未能完整轉入，原件仍保留。');
}
function assertLegacyCopies(raw) {
  if (!Object.hasOwn(raw, 'pending') || typeof raw.daily?.date !== 'string') throw Error('舊旅程記錄不完整；原件仍保留。');
  assertLegacyExpansionBoundary(raw);
  const original = { ...raw, pending: null };
  const canonical = hydrateProfile(original, { now: `${raw.daily.date}T12:00:00.000Z` });
  canonical.version = raw.version;
  delete canonical.expansion;
  if (raw.version === 3) {
    canonical.collectionVersion = 1; canonical.collectionExpansion = 1;
    delete canonical.wx01;
    for (const card of [...canonical.instances, ...canonical.merchantVault.map(entry => entry.instance)]) delete card.printId;
    for (const key of ['inventory', 'levels']) canonical[key] = Object.fromEntries(LEGACY_CARD_IDS.map(id => [id, canonical[key][id]]));
  }
  if (raw.version === 3 && !Object.hasOwn(raw, 'weekly')) delete canonical.weekly;
  if (fingerprintProfile(original) !== fingerprintProfile(canonical)) throw Error('舊旅程記錄不完整；原件仍保留。');
}
export function assertLocalProfile(profile) {
  if (profile?.version !== PROFILE_VERSION || !Array.isArray(profile.instances) || !Array.isArray(profile.merchantVault)
      || typeof profile.daily?.date !== 'string') throw Error('此旅程版本或格式暫未支援，原有存檔仍保留。');
  if (profile.instances.length + profile.merchantVault.length > MAX_SNAPSHOT_CARDS) throw Error('收藏容量已滿；未有扣款或更改卡牌，請先匯出旅程備份。');
  // Check at the stored day: a legitimate daily rollover is applied only on load.
  const canonical = hydrateProfile(profile, { now: `${profile.daily.date}T12:00:00.000Z` });
  if (fingerprintProfile(profile) !== fingerprintProfile(canonical)) throw Error('旅程資料未能完整讀取；原件仍保留，請先匯出備份。');
  // Include the envelope in the same bounded byte accounting used for backups.
  fingerprintProfile({ format: SNAPSHOT_FORMAT, version: SNAPSHOT_VERSION, profile });
  return profile;
}

export const RESTORE_LEDGER_ERROR = '這份旅程備份未超過 4 MiB 上限，但加上此裝置的操作記錄後超過儲存上限；本機旅程及回復備份均未更改。';

/** The profile a restore saves (docs/LOCAL-COMMANDS.md §11): the restored journey, plus the
 * replaced lineage's retired command boundary when it had a ledger. Checked with the same
 * rules as save, so a refusal comes before the recovery copy or the profile is touched. */
export function restoredLocalProfile(current, restored) {
  if (!Object.hasOwn(current, 'commands')) return assertLocalProfile(restored);
  const next = { ...restored, commands: retireCommandLedger(current.commands) };
  try { return assertLocalProfile(next); }
  catch (error) {
    // Name the ledger only when the backup alone would have fitted.
    try { assertLocalProfile(restored); } catch { throw error; }
    throw Error(RESTORE_LEDGER_ERROR);
  }
}

export function createProfileStore({ storage, now = () => new Date() }) {
  const read = key => storage.getItem(key);
  function source() {
    for (const candidate of sources) {
      const text = read(candidate.profile);
      if (text !== null) return { ...candidate, raw: parse(text, '舊旅程') };
    }
    return null;
  }
  function load() {
    const text = read(PROFILE_KEY);
    if (text !== null) return hydrateProfile(assertLocalProfile(parse(text, '旅程')), { now: now() });
    const old = source();
    if (!old) {
      const legacyDeck = read('shanhai.deck.v1'), legacyStats = read('shanhai.stats.v1');
      return createProfile({ now: now(), legacyDeck: legacyDeck === null ? undefined : parse(legacyDeck, '舊牌組'), legacyStats: legacyStats === null ? undefined : parse(legacyStats, '舊旅程') });
    }
    if (old.raw?.version !== old.version) throw Error('舊旅程版本暫未支援；原件仍保留，未有重設進度。');
    // v3/v4 already own exact copies. Validate before the forgiving legacy
    // hydrator can repair a damaged collection into a new starter journey.
    if (old.version >= 3) assertLegacyCopies(old.raw);
    const battleText = read(old.battle);
    const next = hydrateProfile(old.raw, { now: now(), legacyBattle: battleText === null ? undefined : parse(battleText, '未完對局') });
    sameCopies(old.raw, next);
    if (old.version >= 3 && old.raw.pending !== null) {
      const migrated = next.pending && { ...next.pending };
      if (migrated && old.version === 3) delete migrated.cardPrints;
      if (fingerprintProfile(old.raw.pending) !== fingerprintProfile(migrated)) throw Error('未完對局未能完整轉入；原件仍保留。');
    }
    return next;
  }
  function save(profile) {
    assertLocalProfile(profile);
    if (read(PROFILE_KEY) === null) {
      const old = source();
      if (old && profile.pending) {
        const text = read(old.battle), battle = text === null ? null : parse(text, '未完對局');
        if (battle?.encounter?.id === profile.pending.id) storage.setItem(BATTLE_KEY, text);
      }
      // Profile is the completion marker; interrupted migration can safely retry.
    }
    storage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return profile;
  }
  /** Restore under PROFILE_LOCK (docs/LOCAL-COMMANDS.md §11). The recovery copy of `current`
   * is written only after the replacement passes the save checks. A throwing profile write
   * may still have landed (§7 step 11), so the profile is read again before anything is
   * undone: the previous recovery copy comes back only while the replaced bytes are still
   * stored; the restored bytes count as a restore that landed; anything else keeps the new
   * copy, because the replaced journey may now exist nowhere else. */
  function replace(current, restored, { savedAt }) {
    const next = restoredLocalProfile(current, restored);
    const recovery = JSON.stringify({ savedAt, snapshot: createSnapshot(current) });
    const previous = read(RECOVERY_KEY), replaced = read(PROFILE_KEY);
    storage.setItem(RECOVERY_KEY, recovery);
    try { return save(next); }
    catch (error) {
      let stored;
      try { stored = read(PROFILE_KEY); } catch { throw error; }
      if (stored === JSON.stringify(next)) return next;
      if (stored === replaced) {
        try { if (previous === null) storage.removeItem(RECOVERY_KEY); else storage.setItem(RECOVERY_KEY, previous); } catch {}
      }
      throw error;
    }
  }
  return { load, save, replace };
}
