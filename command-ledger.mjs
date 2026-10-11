/** Local command ledger: shape and strict validation only. No storage, DOM, clock or RNG.
 * Receipts are bounded local history, never an ownership claim or a grant. */
import { MAX_CARD_XP, XP_THRESHOLDS } from './collection.mjs';

export const COMMAND_LEDGER_VERSION = 1;
export const MAX_COMMAND_RECEIPTS = 32;
export const MAX_COMMAND_SEQ = 1_000_000_000;
export const COMMAND_TYPES = Object.freeze(['care.upgrade']);
export const COMMAND_LEDGER_ERROR = '本機操作記錄不完整，未有更改存檔。';
export const COMMAND_LEDGER_GUARD_ERROR = '本機操作記錄不可由此動作更改；未有更改旅程。';

const MAX_LEVEL = XP_THRESHOLDS.length;
const MAX_AMOUNT = 1_000_000_000;
const MAX_TEXT = 64;
const ledgerKeys = ['version', 'nextSeq', 'retiredBelow', 'receipts'];
const receiptKeys = ['seq', 'intent', 'at', 'result'];
const intentKeys = ['type', 'uid', 'toLevel'];
const upgradeResultKeys = ['cardId', 'printId', 'fromLevel', 'toLevel', 'fromXP', 'toXP', 'coins', 'dust', 'coinsAfter', 'dustAfter'];
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const isInteger = (value, minimum, maximum) => Number.isSafeInteger(value) && value >= minimum && value <= maximum;
const isText = value => typeof value === 'string' && value.length >= 1 && value.length <= MAX_TEXT;
function exactKeys(value, expected) {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every(key => expected.includes(key))
    && keys.every(key => Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'));
}
const invalid = (message = COMMAND_LEDGER_ERROR) => { throw new RangeError(message); };

/** The defined initial state; virtual, never written on load. */
export function emptyCommandLedger() {
  return { version: COMMAND_LEDGER_VERSION, nextSeq: 1, retiredBelow: 1, receipts: [] };
}

export function commandIdFor(seq) {
  if (!isInteger(seq, 1, MAX_COMMAND_SEQ)) invalid('操作編號無效。');
  return `cmd-${seq}`;
}

export function parseCommandId(commandId) {
  if (typeof commandId !== 'string' || !/^cmd-[1-9]\d{0,9}$/.test(commandId)) invalid('操作編號無效。');
  const seq = Number(commandId.slice(4));
  if (!isInteger(seq, 1, MAX_COMMAND_SEQ)) invalid('操作編號無效。');
  return seq;
}

/** One exact copy and one exact target level; never a cardId. */
export function normalizeCommandIntent(intent) {
  if (!exactKeys(intent, intentKeys) || !COMMAND_TYPES.includes(intent.type)) invalid('操作內容無效。');
  if (!isText(intent.uid) || !/^card-\d{6,}$/.test(intent.uid)) invalid('操作內容無效。');
  if (!isInteger(intent.toLevel, 2, MAX_LEVEL)) invalid('操作內容無效。');
  return { type: intent.type, uid: intent.uid, toLevel: intent.toLevel };
}

export function sameCommandIntent(a, b) {
  return a?.type === b?.type && a?.uid === b?.uid && a?.toLevel === b?.toLevel;
}

function validateResult(result, intent) {
  if (!exactKeys(result, upgradeResultKeys)) invalid();
  if (!isText(result.cardId) || !isText(result.printId)) invalid();
  if (!isInteger(result.fromLevel, 1, MAX_LEVEL - 1) || result.toLevel !== result.fromLevel + 1 || result.toLevel !== intent.toLevel) invalid();
  if (!isInteger(result.fromXP, 0, MAX_CARD_XP) || !isInteger(result.toXP, 0, MAX_CARD_XP) || result.fromXP >= result.toXP) invalid();
  for (const key of ['coins', 'dust', 'coinsAfter', 'dustAfter']) if (!isInteger(result[key], 0, MAX_AMOUNT)) invalid();
  return Object.fromEntries(upgradeResultKeys.map(key => [key, result[key]]));
}

function validateReceipt(receipt, seq) {
  if (!exactKeys(receipt, receiptKeys) || receipt.seq !== seq) invalid();
  let intent;
  try { intent = normalizeCommandIntent(receipt.intent); } catch { invalid(); }
  // Displayed to the player only; ordering always comes from seq.
  if (typeof receipt.at !== 'string' || receipt.at.length > MAX_TEXT) invalid();
  let canonical;
  try { canonical = new Date(receipt.at).toISOString(); } catch { invalid(); }
  if (canonical !== receipt.at) invalid();
  return { seq, intent, at: receipt.at, result: validateResult(receipt.result, intent) };
}

/** Fail closed, like validateWX01State. Returns a detached canonical copy. Costs,
 * printings and current instances are deliberately not re-derived: history only. */
export function validateCommandLedger(raw) {
  if (!exactKeys(raw, ledgerKeys) || raw.version !== COMMAND_LEDGER_VERSION) invalid();
  const { nextSeq, retiredBelow, receipts } = raw;
  if (!isInteger(retiredBelow, 1, MAX_COMMAND_SEQ) || !isInteger(nextSeq, retiredBelow, MAX_COMMAND_SEQ)) invalid();
  if (!Array.isArray(receipts) || Object.getPrototypeOf(receipts) !== Array.prototype
    || receipts.length > MAX_COMMAND_RECEIPTS || receipts.length !== nextSeq - retiredBelow) invalid();
  return {
    version: COMMAND_LEDGER_VERSION, nextSeq, retiredBelow,
    receipts: Array.from({ length: receipts.length }, (_, index) => validateReceipt(receipts[index], retiredBelow + index)),
  };
}

export function receiptForSeq(ledger, seq) {
  if (!Number.isSafeInteger(seq) || seq < ledger.retiredBelow || seq >= ledger.nextSeq) return null;
  return structuredClone(ledger.receipts[seq - ledger.retiredBelow]);
}

/** Every Q1 receipt is final at commit, so pruning the oldest never evicts pending work. */
export function appendCommandReceipt(ledger, receipt) {
  const current = validateCommandLedger(ledger);
  if (receipt?.seq !== current.nextSeq || current.nextSeq >= MAX_COMMAND_SEQ) invalid();
  const receipts = [...current.receipts, receipt].slice(-MAX_COMMAND_RECEIPTS);
  return validateCommandLedger({ version: COMMAND_LEDGER_VERSION, nextSeq: current.nextSeq + 1, retiredBelow: receipts[0].seq, receipts });
}

/** Restore/import: consume the slot an outstanding preview could hold, so every
 * earlier command ID becomes expired rather than executable in the new lineage. */
export function retireCommandLedger(ledger) {
  const current = validateCommandLedger(ledger);
  const boundary = Math.min(MAX_COMMAND_SEQ, current.nextSeq + 1);
  return { version: COMMAND_LEDGER_VERSION, nextSeq: boundary, retiredBelow: boundary, receipts: [] };
}

function stableJSON(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJSON).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJSON(value[key])}`).join(',')}}`;
}

/** Canonical ledger text for the transact guard; null when the profile has none. */
export function commandLedgerJSON(profile) {
  return profile && Object.hasOwn(profile, 'commands') ? stableJSON(profile.commands) : null;
}

/** Only commitCommand and restore may change the ledger. Once present it stays. */
export function assertLedgerUnchanged(beforeJSON, after) {
  if (commandLedgerJSON(after) !== beforeJSON) invalid(COMMAND_LEDGER_GUARD_ERROR);
}
