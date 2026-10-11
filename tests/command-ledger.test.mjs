import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMMAND_LEDGER_VERSION, MAX_COMMAND_RECEIPTS, MAX_COMMAND_SEQ, COMMAND_LEDGER_ERROR, COMMAND_LEDGER_GUARD_ERROR,
  emptyCommandLedger, commandIdFor, parseCommandId, normalizeCommandIntent, validateCommandLedger,
  receiptForSeq, appendCommandReceipt, retireCommandLedger, commandLedgerJSON, assertLedgerUnchanged,
} from '../command-ledger.mjs';
import { createProfile, PROFILE_KEY } from '../progression.mjs';
import { createProfileStore } from '../profile-store.mjs';

const now = '2026-09-21T12:00:00.000Z';
const copy = value => structuredClone(value);
const receipt = (seq, { uid = 'card-000001', fromLevel = 1, at = now } = {}) => ({
  seq, intent: { type: 'care.upgrade', uid, toLevel: fromLevel + 1 }, at,
  result: { cardId: 'qingxiao', printId: 'legacy/qingxiao', fromLevel, toLevel: fromLevel + 1, fromXP: 0, toXP: 80, coins: 120 * fromLevel, dust: 6 * fromLevel, coinsAfter: 1080, dustAfter: 14 },
});
function ledgerOf(count, { retiredBelow = 1 } = {}) {
  return { version: 1, nextSeq: retiredBelow + count, retiredBelow, receipts: Array.from({ length: count }, (_, index) => receipt(retiredBelow + index)) };
}
function storageFor(profile) {
  const data = new Map([[PROFILE_KEY, typeof profile === 'string' ? profile : JSON.stringify(profile)]]), writes = [];
  const storage = { getItem: key => data.get(key) ?? null, setItem(key, value) { writes.push(key); data.set(key, value); } };
  return { data, writes, store: createProfileStore({ storage, now: () => now }) };
}

test('command ids are cmd-<seq> with a bounded positive sequence; intents name one exact copy and level', () => {
  assert.equal(commandIdFor(1), 'cmd-1');
  assert.equal(commandIdFor(MAX_COMMAND_SEQ), 'cmd-1000000000');
  assert.equal(parseCommandId('cmd-42'), 42);
  for (const bad of [0, -1, 1.5, MAX_COMMAND_SEQ + 1, '1', null]) assert.throws(() => commandIdFor(bad), RangeError);
  for (const bad of ['cmd-0', 'cmd-01', 'cmd-1000000001', 'cmd-99999999999', 'CMD-1', 'cmd-1 ', 'cmd--1', 7, null, undefined]) {
    assert.throws(() => parseCommandId(bad), RangeError, String(bad));
  }
  assert.deepEqual(normalizeCommandIntent({ type: 'care.upgrade', uid: 'card-000123', toLevel: 3 }), { type: 'care.upgrade', uid: 'card-000123', toLevel: 3 });
  for (const bad of [
    { type: 'care.train', uid: 'card-000123', toLevel: 3 }, { type: 'care.upgrade', uid: 'wukong', toLevel: 3 },
    { type: 'care.upgrade', uid: 'card-123', toLevel: 3 }, { type: 'care.upgrade', uid: 'card-000123', toLevel: 1 },
    { type: 'care.upgrade', uid: 'card-000123', toLevel: 6 }, { type: 'care.upgrade', uid: 'card-000123', toLevel: 2.5 },
    { type: 'care.upgrade', uid: 'card-000123' }, { type: 'care.upgrade', uid: 'card-000123', toLevel: 3, cardId: 'wukong' },
    { type: 'care.upgrade', uid: `card-${'1'.repeat(60)}`, toLevel: 3 }, null, [],
  ]) assert.throws(() => normalizeCommandIntent(bad), RangeError, JSON.stringify(bad));
});

test('the empty ledger is the virtual initial state and validates to a detached canonical copy', () => {
  assert.deepEqual(emptyCommandLedger(), { version: COMMAND_LEDGER_VERSION, nextSeq: 1, retiredBelow: 1, receipts: [] });
  const raw = ledgerOf(3), valid = validateCommandLedger(raw);
  assert.deepEqual(valid, raw);
  valid.receipts[0].result.coins = 1;
  assert.equal(raw.receipts[0].result.coins, 120, 'validation returns a detached copy');
  assert.equal(receiptForSeq(raw, 2).seq, 2);
  assert.equal(receiptForSeq(raw, 4), null);
  assert.equal(receiptForSeq(raw, 0), null);
});

test('N15 validator matrix: every malformed ledger fails closed in store load and save with zero writes', () => {
  const at64 = 'x'.repeat(65);
  const cases = {
    'extra ledger key': l => { l.extra = 1; },
    'missing ledger key': l => { delete l.retiredBelow; },
    'extra receipt key': l => { l.receipts[0].note = 'x'; },
    'missing receipt key': l => { delete l.receipts[0].at; },
    'extra intent key': l => { l.receipts[0].intent.cardId = 'qingxiao'; },
    'missing result key': l => { delete l.receipts[0].result.dustAfter; },
    'extra result key': l => { l.receipts[0].result.bonus = 1; },
    'version 2': l => { l.version = 2; },
    'non-contiguous seq': l => { l.receipts[1].seq = 3; },
    'more than 32 receipts': () => ledgerOf(33),
    'length differs from window': l => { l.nextSeq += 1; },
    'nextSeq below retiredBelow': l => { l.receipts = []; l.retiredBelow = 5; l.nextSeq = 4; },
    'retiredBelow below 1': l => { l.receipts = []; l.retiredBelow = 0; l.nextSeq = 0; },
    'unsafe counter': l => { l.nextSeq = Number.MAX_SAFE_INTEGER + 2; },
    'non-integer counter': l => { l.receipts = []; l.retiredBelow = 1.5; l.nextSeq = 1.5; },
    'counter above maximum': l => { l.receipts = []; l.retiredBelow = MAX_COMMAND_SEQ + 1; l.nextSeq = MAX_COMMAND_SEQ + 1; },
    'bad uid': l => { l.receipts[0].intent.uid = 'qingxiao'; },
    'bad type': l => { l.receipts[0].intent.type = 'care.train'; },
    'bad toLevel': l => { l.receipts[0].intent.toLevel = 7; },
    'toLevel not fromLevel + 1': l => { l.receipts[0].result.toLevel = 3; l.receipts[0].intent.toLevel = 3; },
    'result toLevel differs from intent': l => { l.receipts[0].intent.toLevel = 3; },
    'fromXP not below toXP': l => { l.receipts[0].result.fromXP = 80; },
    'toXP above 700': l => { Object.assign(l.receipts[0].result, { fromLevel: 4, toLevel: 5, toXP: 701 }); l.receipts[0].intent.toLevel = 5; },
    'non-canonical at': l => { l.receipts[0].at = '2026-09-21T12:00:00Z'; },
    'invalid at': l => { l.receipts[0].at = 'yesterday'; },
    'string over 64 characters': l => { l.receipts[0].result.printId = at64; },
    'empty cardId': l => { l.receipts[0].result.cardId = ''; },
    'negative coins': l => { l.receipts[0].result.coins = -1; },
    'coins over limit': l => { l.receipts[0].result.coinsAfter = 1_000_000_001; },
    'receipts not an array': l => { l.receipts = { 0: l.receipts[0] }; },
    'null ledger': () => null,
  };
  for (const [name, corrupt] of Object.entries(cases)) {
    const ledger = ledgerOf(3), replaced = corrupt(ledger);
    const commands = replaced === undefined ? ledger : replaced;
    assert.throws(() => validateCommandLedger(commands), { name: 'RangeError', message: COMMAND_LEDGER_ERROR }, name);
    const profile = { ...createProfile({ now }), commands };
    const f = storageFor(profile), bytes = f.data.get(PROFILE_KEY);
    assert.throws(() => f.store.load(), { message: COMMAND_LEDGER_ERROR }, `${name}: load`);
    assert.throws(() => f.store.save(profile), { message: COMMAND_LEDGER_ERROR }, `${name}: save`);
    assert.deepEqual(f.writes, [], name);
    assert.equal(f.data.get(PROFILE_KEY), bytes, name);
  }
  assert.throws(() => validateCommandLedger({ ...ledgerOf(1), get version() { throw Error('accessor invoked'); } }), { message: COMMAND_LEDGER_ERROR });
});

test('N14 retention: appending prunes to 32 contiguous receipts and a full ledger of 64-character strings stays within 16 KiB', () => {
  let ledger = emptyCommandLedger();
  for (let seq = 1; seq <= 40; seq++) ledger = appendCommandReceipt(ledger, receipt(seq));
  assert.equal(ledger.receipts.length, MAX_COMMAND_RECEIPTS);
  assert.equal(ledger.retiredBelow, 9); assert.equal(ledger.nextSeq, 41);
  assert.deepEqual(ledger.receipts.map(item => item.seq), Array.from({ length: 32 }, (_, index) => index + 9));
  assert.equal(receiptForSeq(ledger, 3), null);
  assert.throws(() => appendCommandReceipt(ledger, receipt(40)), RangeError, 'a receipt must take the next slot');
  assert.throws(() => appendCommandReceipt(ledger, receipt(42)), RangeError);
  const long = 'x'.repeat(64), wide = {
    version: 1, nextSeq: MAX_COMMAND_SEQ, retiredBelow: MAX_COMMAND_SEQ - 32,
    receipts: Array.from({ length: 32 }, (_, index) => {
      const item = receipt(MAX_COMMAND_SEQ - 32 + index, { uid: `card-${'9'.repeat(59)}`, fromLevel: 4, at: '+275760-09-13T00:00:00.000Z' });
      Object.assign(item.result, { cardId: long, printId: long, fromXP: 699, toXP: 700, coins: 1_000_000_000, dust: 1_000_000_000, coinsAfter: 1_000_000_000, dustAfter: 1_000_000_000 });
      return item;
    }),
  };
  const valid = validateCommandLedger(wide);
  assert.ok(Buffer.byteLength(JSON.stringify(valid)) <= 16 * 1024, `${Buffer.byteLength(JSON.stringify(valid))} bytes`);
  assert.throws(() => appendCommandReceipt({ version: 1, nextSeq: MAX_COMMAND_SEQ, retiredBelow: MAX_COMMAND_SEQ, receipts: [] }, receipt(MAX_COMMAND_SEQ)), RangeError, 'an exhausted ledger cannot grow');
});

test('restore retirement consumes the outstanding slot and keeps an exhausted boundary valid', () => {
  assert.deepEqual(retireCommandLedger(ledgerOf(3)), { version: 1, nextSeq: 5, retiredBelow: 5, receipts: [] });
  assert.deepEqual(retireCommandLedger(emptyCommandLedger()), { version: 1, nextSeq: 2, retiredBelow: 2, receipts: [] });
  const exhausted = retireCommandLedger({ version: 1, nextSeq: MAX_COMMAND_SEQ, retiredBelow: MAX_COMMAND_SEQ, receipts: [] });
  assert.deepEqual(exhausted, validateCommandLedger(exhausted));
  assert.throws(() => retireCommandLedger({ ...ledgerOf(2), version: 2 }), { message: COMMAND_LEDGER_ERROR });
});

test('the transact guard rejects any change that drops, adds or alters the ledger', () => {
  const profile = { ...createProfile({ now }), commands: ledgerOf(2) };
  const before = commandLedgerJSON(profile);
  assert.equal(commandLedgerJSON(createProfile({ now })), null);
  assertLedgerUnchanged(before, copy(profile));
  assertLedgerUnchanged(before, { ...copy(profile), commands: Object.fromEntries(Object.entries(profile.commands).reverse()) });
  const dropped = copy(profile); delete dropped.commands;
  const altered = copy(profile); altered.commands.receipts[1].result.coins = 1;
  for (const changed of [dropped, altered]) assert.throws(() => assertLedgerUnchanged(before, changed), { message: COMMAND_LEDGER_GUARD_ERROR });
  assert.throws(() => assertLedgerUnchanged(null, profile), { message: COMMAND_LEDGER_GUARD_ERROR }, 'an ordinary action cannot create one');
  assertLedgerUnchanged(null, createProfile({ now }));
});
