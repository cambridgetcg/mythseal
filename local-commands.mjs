/** Local command adapter (docs/LOCAL-COMMANDS.md). Wraps existing pure rules; no DOM,
 * sound, animation, network or RNG. The caller injects the store, lock and clock. The lock
 * must give its holder every earlier holder's write; in the browser that is the fenced
 * lock from profile-fence.mjs, because localStorage alone does not (§10.1). */
import { getUpgradeCost, upgradeInstance } from './progression.mjs';
import { getInstance, getXPThreshold, isInstanceInJourney } from './collection.mjs';
import { fingerprintProfile } from './cloud-save.mjs';
import {
  MAX_COMMAND_SEQ, emptyCommandLedger, commandIdFor, parseCommandId, normalizeCommandIntent,
  sameCommandIntent, receiptForSeq, appendCommandReceipt,
} from './command-ledger.mjs';

const UPGRADE = 'care.upgrade';
const requestKeys = ['commandId', 'intent', 'expectedFingerprint'];
const previewKeys = ['type', 'uid'];

/** Player copy for every outcome (zh-Hant). Rule refusals keep the rule's own text. */
export const COMMAND_MESSAGES = Object.freeze({
  committed: '此卡修練完成，另一張副本的等級不變。',
  duplicate: '這次修練早已入帳，未有再次扣除資源。',
  // identity-conflict names its cause (§9): this copy's own slot was taken at another level,
  // or another copy's upgrade took the slot, leaving this one unchanged or changed as well.
  'identity-conflict': '卡牌剛有變動，未有扣除資源；請查看更新後的修練預覽。',
  'other-card': '另一個分頁剛為另一張卡完成修練；這張卡未有變動，未有扣除資源，請再按一次修練升級。',
  'other-card-changed': '另一個分頁剛為另一張卡完成修練，未有扣除資源；請查看更新後的修練預覽。',
  stale: '卡牌剛有變動，未有扣除資源；請查看更新後的修練預覽。',
  expired: '修練預覽已過期，未有扣除資源；請重新查看。',
  exhausted: '本機操作記錄已達上限，未有扣除資源。',
  invalid: '修練預覽無效，未有扣除資源。',
  'no-lock': '請用支援安全儲存的新版瀏覽器修練；未有扣除資源。',
  'lock-failed': '未能取得儲存權限，未有扣除資源；請再試一次。',
  unsynced: '未能確認其他分頁的最新進度，未有扣除資源；請稍後再試，或重新整理頁面。',
  quota: '儲存空間不足，未有扣除資源；請先匯出旅程備份。',
  'write-failed': '未能儲存，未有扣除資源；請再試一次。',
  clock: '裝置日期無效，未有扣除資源。',
  unknown: '未能確認這次修練是否已入帳；正在重新查看，不會自動重試。',
  'not-committed': '這次修練未有入帳，未有扣除資源；請查看更新後的修練預覽。',
  unavailable: '暫時未能讀取本機操作記錄；未有更改旅程。',
});

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasExactKeys = (value, keys) => isRecord(value) && Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key));
const messageOf = (error, fallback) => (error instanceof Error && error.message) || fallback;
const rejected = (reason, message = COMMAND_MESSAGES[reason]) => ({ status: 'rejected', reason, message });
const unknown = commandId => ({ status: 'unknown', commandId, message: COMMAND_MESSAGES.unknown });
const isQuota = error => ['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'].includes(error?.name);
const ledgerOf = profile => Object.hasOwn(profile, 'commands') ? profile.commands : emptyCommandLedger();
/** The accepted receipt's real levels and costs, as stored; never the preview's. */
export function receiptSummary(receipt) {
  const result = receipt?.result;
  if (!isRecord(result)) return '';
  return `Lv.${result.fromLevel} → Lv.${result.toLevel} · ${result.coins} 金幣 · ${result.dust} 靈砂`;
}
/** A duplicate names the upgrade that was accepted (§9), so a stale page learns what happened. */
export function duplicateMessage(receipt) {
  const summary = receiptSummary(receipt);
  return summary ? `${COMMAND_MESSAGES.duplicate}已入帳的修練：${summary}。` : COMMAND_MESSAGES.duplicate;
}
function deepFreeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
}

function checkPreviewIntent(intent) {
  if (!hasExactKeys(intent, previewKeys) || intent.type !== UPGRADE) throw new RangeError('操作內容無效。');
  // Validates the uid with the same rule a stored intent must pass.
  normalizeCommandIntent({ type: intent.type, uid: intent.uid, toLevel: 2 });
  return intent;
}

/** Pure: no storage, lock, clock or mutation. The fingerprint covers the whole owned
 * record, journey membership and the rule's cost; balances are rechecked at commit. */
export function previewCommand(profile, intent) {
  const { uid } = checkPreviewIntent(intent);
  const base = { commandType: UPGRADE, selectedUids: [uid], costs: null, effects: null, blockers: [], request: null };
  let instance;
  try { instance = getInstance(profile, uid); }
  catch (error) { return deepFreeze({ ...base, blockers: [{ code: 'missing', message: messageOf(error, '背包中找不到這張卡牌實體。') }] }); }
  const cost = getUpgradeCost(profile, uid), blockers = [];
  if (cost.blockedReason) blockers.push({ code: 'in-journey', message: cost.blockedReason });
  if (cost.maxed) {
    blockers.push({ code: 'maxed', message: '這張卡牌已達最高等級。' });
    return deepFreeze({ ...base, blockers });
  }
  if (profile.coins < cost.coins) blockers.push({ code: 'coins', message: '金幣不足。' });
  if (profile.dust < cost.dust) blockers.push({ code: 'dust', message: '靈砂不足。' });
  const costs = { coins: cost.coins, dust: cost.dust };
  const effects = {
    cardId: instance.cardId, printId: instance.printId, fromLevel: instance.level, toLevel: cost.nextLevel,
    fromXP: instance.xp, toXP: getXPThreshold(cost.nextLevel),
  };
  if (blockers.length) return deepFreeze({ ...base, costs, effects, blockers });
  const expectedFingerprint = fingerprintProfile({
    type: UPGRADE, instance, inJourney: isInstanceInJourney(profile, uid),
    cost: { coins: cost.coins, dust: cost.dust, nextLevel: cost.nextLevel },
  });
  const request = { commandId: commandIdFor(ledgerOf(profile).nextSeq), intent: { type: UPGRADE, uid, toLevel: cost.nextLevel }, expectedFingerprint };
  return deepFreeze({ ...base, costs, effects, request });
}

function checkRequest(request) {
  if (!hasExactKeys(request, requestKeys)) throw new RangeError('invalid');
  const slot = parseCommandId(request.commandId), intent = normalizeCommandIntent(request.intent);
  if (typeof request.expectedFingerprint !== 'string' || !request.expectedFingerprint) throw new RangeError('invalid');
  return { commandId: request.commandId, slot, intent, expectedFingerprint: request.expectedFingerprint };
}

function receiptFor(slot, intent, before, after, at) {
  const from = getInstance(before, intent.uid), to = getInstance(after, intent.uid);
  return {
    seq: slot, intent, at,
    result: {
      cardId: to.cardId, printId: to.printId, fromLevel: from.level, toLevel: to.level, fromXP: from.xp, toXP: to.xp,
      coins: before.coins - after.coins, dust: before.dust - after.dust, coinsAfter: after.coins, dustAfter: after.dust,
    },
  };
}

/** Same slot, another intent (§4). A receipt for this copy at another level means this copy
 * changed. A receipt for another copy says nothing about this one, so its fresh preview
 * decides: unchanged means only the slot moved and the next click can commit. */
function identityConflict(profile, stored, { intent, expectedFingerprint }) {
  if (!isRecord(stored?.intent) || stored.intent.uid === intent.uid) return rejected('identity-conflict');
  const fresh = previewCommand(profile, { type: intent.type, uid: intent.uid }).request;
  const unchanged = fresh !== null && fresh.intent.toLevel === intent.toLevel && fresh.expectedFingerprint === expectedFingerprint;
  return rejected('identity-conflict', COMMAND_MESSAGES[unchanged ? 'other-card' : 'other-card-changed']);
}

/** Runs synchronously inside the lock and never throws: every path returns a result. */
function commitLocked({ commandId, slot, intent, expectedFingerprint }, { store, now }) {
  let profile;
  try { profile = store.load(); } catch (error) { return rejected('load-failed', messageOf(error, COMMAND_MESSAGES.unavailable)); }
  let next, receipt;
  try {
    const ledger = ledgerOf(profile);
    if (slot < ledger.retiredBelow) return rejected('expired');
    // A retained duplicate answers before its now-old fingerprint is evaluated.
    if (slot < ledger.nextSeq) {
      const stored = receiptForSeq(ledger, slot);
      return sameCommandIntent(stored?.intent, intent)
        ? { status: 'committed', duplicate: true, receipt: stored, profile }
        : identityConflict(profile, stored, { intent, expectedFingerprint });
    }
    if (slot > ledger.nextSeq) return rejected('stale');
    if (ledger.nextSeq >= MAX_COMMAND_SEQ) return rejected('blocked', COMMAND_MESSAGES.exhausted);
    const fresh = previewCommand(profile, { type: intent.type, uid: intent.uid });
    if (fresh.blockers.length) return rejected('blocked', fresh.blockers[0].message);
    if (fresh.request.intent.toLevel !== intent.toLevel || fresh.request.expectedFingerprint !== expectedFingerprint) return rejected('stale');
    try { next = upgradeInstance(profile, intent.uid); }
    catch (error) { return rejected('blocked', messageOf(error, COMMAND_MESSAGES.invalid)); }
    const date = new Date(now());
    if (!Number.isFinite(date.getTime())) return rejected('write-failed', COMMAND_MESSAGES.clock);
    receipt = receiptFor(slot, intent, profile, next, date.toISOString());
    next.commands = appendCommandReceipt(ledger, receipt);
  } catch (error) {
    // Nothing reached storage before this point.
    return rejected('write-failed', messageOf(error, COMMAND_MESSAGES['write-failed']));
  }
  try { store.save(next); }
  catch (error) {
    // A throwing setItem may still have landed: look again under the same lock.
    let reread;
    try { reread = store.load(); } catch { return unknown(commandId); }
    const landed = Object.hasOwn(reread, 'commands') ? receiptForSeq(reread.commands, slot) : null;
    if (sameCommandIntent(landed?.intent, intent)) return { status: 'committed', duplicate: false, receipt: landed, profile: reread };
    if (isQuota(error)) return rejected('quota');
    return rejected('write-failed', messageOf(error, COMMAND_MESSAGES['write-failed']));
  }
  return { status: 'committed', duplicate: false, receipt: structuredClone(receipt), profile: next };
}

/** Commit exactly the captured request. Without a lock nothing is read or written.
 * Never throws for expected failures; `unknown` is never proof of failure. */
export async function commitCommand(request, { store, lock, now = () => new Date() } = {}) {
  if (typeof lock !== 'function') return rejected('no-lock');
  let checked;
  try { checked = checkRequest(request); } catch { return rejected('invalid'); }
  let entered = false, result;
  try {
    result = await lock(() => { entered = true; return commitLocked(checked, { store, now }); });
  } catch (error) {
    if (entered) return unknown(checked.commandId);
    // The fence could not prove this tab sees the latest bytes: nothing was read or decided.
    // Only a browser without usable IndexedDB is told to change browsers; a full disk needs
    // space, and anything else (a stall, a lagging tab, an unsettled record) a retry.
    if (error?.name === 'ProfileFenceError') {
      return rejected('unsynced', COMMAND_MESSAGES[error.code === 'missing' ? 'no-lock' : error.code === 'quota' ? 'quota' : 'unsynced']);
    }
    return rejected('lock-failed');
  }
  if (!entered) return rejected('lock-failed');
  return isRecord(result) && typeof result.status === 'string' ? result : unknown(checked.commandId);
}

function lookupLocked({ slot, intent }, store) {
  let profile;
  try { profile = store.load(); } catch (error) { return { status: 'unavailable', message: messageOf(error, COMMAND_MESSAGES.unavailable) }; }
  const ledger = ledgerOf(profile);
  if (slot < ledger.retiredBelow) return { status: 'expired' };
  if (slot < ledger.nextSeq) {
    const stored = receiptForSeq(ledger, slot);
    if (sameCommandIntent(stored?.intent, intent)) return { status: 'committed', receipt: stored };
  }
  // Definitive under a lock that gives read-after-write (the fenced lock): a commit is one
  // synchronous profile write, and the fence makes this tab wait until it can see it.
  return { status: 'not-committed' };
}

/** Read-only lookup by slot and intent; queues behind an in-flight commit when locked. */
export async function readCommandReceipt(lookup, { store, lock = null } = {}) {
  let checked;
  try {
    if (!isRecord(lookup)) throw new RangeError('invalid');
    checked = { slot: parseCommandId(lookup.commandId), intent: normalizeCommandIntent(lookup.intent) };
  } catch { return { status: 'unavailable', message: COMMAND_MESSAGES.invalid }; }
  if (typeof lock !== 'function') return lookupLocked(checked, store);
  try {
    const result = await lock(() => lookupLocked(checked, store));
    return isRecord(result) ? result : { status: 'unavailable', message: COMMAND_MESSAGES.unavailable };
  } catch (error) {
    return { status: 'unavailable', message: messageOf(error, COMMAND_MESSAGES.unavailable) };
  }
}
