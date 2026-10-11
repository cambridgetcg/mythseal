# Local commands · Q1 contract

**Status:** proposed contract, implemented for one command (`care.upgrade`);
owner review requested before Q2/Q3 consumers. Dated 2026-10-11 and written
against `origin/main` `8afbabc`. It is implemented on the branch
`q1/local-commands`, which took in `origin/main` `b40c4d2` at `b527dc3` and is
merged into `main` by PR #10; it is not deployed. It is not a release
and changes no hosted service; the proposed v0.6.0
([RELEASE-NEXT](RELEASE-NEXT.md)) would ship it as §15 decision 3 requires. [§18](#18-implementation-record-2026-10-11)
records what was built, where it differs from the text below, and the checks.
§18.4, §18.6 and §18.7 record the fixes made after each of three reviews,
§18.9 those after the final review, and §18.10, §18.11 and §18.12 those after
the three pre-merge reviews; this text now includes all of them. The last source
commit is `38fa64f` (§18.12), which adds a test only; the last runtime change is
`1afaf6b`. §18.8 records the final check of an earlier one, `334bc75`. The
checks after the `b527dc3` merge are in
[VALIDATION](VALIDATION.md#q1-integration-with-main--2026-10-11).

- It refines the illustrative Q1 sketch in [EXPERIENCE-MODULES](EXPERIENCE-MODULES.md#q1--one-local-command-and-its-accepted-receipt). Where the two differ, this document is the proposal; §13 lists every deviation.
- [ROADMAP](../ROADMAP.md#q1--one-local-command-and-receipt-boundary) owns priority and the exit criteria.

## 0. Decisions at a glance

1. **New modules.** Two new pure runtime modules:
   - `command-ledger.mjs` holds the ledger shape and validation. It has no storage access.
   - `local-commands.mjs` holds preview, commit and lookup.

   The rules stay in `progression.mjs`. The first command calls the existing `upgradeInstance(profile, uid)` without changes.
2. **New field.** One new field, `commands`, inside the existing v5 profile. It is optional and stays on this device. It is absent until the first command commits.
   - None of these change: `PROFILE_VERSION`, `PROFILE_KEY`, `SNAPSHOT_VERSION`, the Worker, the SQL, or any journey flag.
3. **One write.** The effects and the receipt are saved by one `store.save` under the shared `PROFILE_LOCK`. That is exactly one `setItem(PROFILE_KEY)`.
4. **Identity.** A command is identified by a ledger slot plus its normalized intent.
   - The ID is `cmd-<n>`, where `n` is the ledger's `nextSeq` when the preview was made.
   - There is no randomness. This follows the existing `wx01-<serial>` and `battle-<serial>` IDs.
5. **Restore.** A restore retires the sequence boundary instead of creating a random epoch.
6. **Locks.** A command that goes through the adapter requires Web Locks and has no fallback. Actions that are not wrapped keep today's `transact` behaviour.
   - **Decision for new batch/queue operations:** they run only through `commitCommand`, which refuses with `no-lock` before touching storage. `transact`'s unlocked fallback is kept only for today's unwrapped single actions, and its code comment says it is same-tab only (§10).
   - **Read-after-write (added after review).** Holding the Web Lock does not make the previous holder's `localStorage` write visible to a tab in another renderer process. Every holder of `PROFILE_LOCK` therefore goes through an IndexedDB fence, and commands refuse when it cannot prove their bytes are current (§10.1).
7. **Backups.** Backups never contain the ledger, because `createSnapshot` removes it.
8. **First wrapped action.** The backpack card page's 修練升級 button (`data-action="instance-upgrade"`), as command type `care.upgrade`.

## 1. First wrapped action and why

**It fixes a real hazard.** The rule half is reproduced in Node. The browser half was inferred from the source when this contract was written; §18.3 records a Chromium reproduction on `8afbabc`.

- `showInstance` paints the upgrade cost on the card page once (`app.mjs:525`, `backpack-ui.mjs:100`).
- When another tab saves, `reloadLocalJourney` (`app.mjs:1072`) replaces the module-level `profile` and re-renders `#app`. It does not repaint the card page, because the card page lives in `#overlay-root`.
- The click handler (`app.mjs:1018`) runs `upgradeCard` against a freshly loaded profile. So a card page left stale by another tab is charged the *current* level's price.
- Example: two clicks on a card shown as "Lv.1 → Lv.2, 120 金幣" take it from Lv.1 to Lv.2 to Lv.3 and charge 120, then 240 coins.
- Without Web Locks, `transact` does not serialize across tabs at all.

Line numbers in this section refer to `8afbabc`.

**Why this action suits Q1:**

- **Deterministic:** it uses no RNG, sampler, day key or daily counter.
- **Exact copy:** it already names one copy, because `data-id` is a uid.
- **Q2 builds on it:** Q2's care plan is built from `getUpgradeCost` and `upgradeInstance`.
- **Already covered:** `progression.test`, `backpack-smoke` and `classics-smoke` exercise it today.

**Not chosen:**

- `daily-train`: it has day rollover and `trainingUsed`, so it belongs to Q2.
- Inheritance: it is already previewed, fingerprinted and requires the lock.
- WX packs and boxes: they use RNG and keep their own `wx01.receipt`.
- Claims: they are already guarded by flags.
- Lock toggle: it spends nothing.

**`upgrade-card`.** This action shares the handler today, but nothing can trigger it: `adventure-ui.mjs:upgradeMarkup` is exported and never imported. This PR sends it to the card page, as the existing `upgrade` action already does (`showInstance(preferred uid)`). That removes the last direct spend by `cardId` without wrapping it.

## 2. Files in the PR

| File | Change |
| --- | --- |
| `command-ledger.mjs` (new, runtime) | §6 constants, validator, append/prune, retire and the `transact` guard helper. It imports at most constants from `collection.mjs`. It never imports `progression`, `cloud-save`, `profile-store` or `app.mjs`, because `progression` imports it. |
| `local-commands.mjs` (new, runtime) | `previewCommand`, `commitCommand`, `readCommandReceipt` and one type, `care.upgrade`. Imports: `progression` (`getUpgradeCost`, `upgradeInstance`), `collection` (`getInstance`, `getXPThreshold`, `isInstanceInJourney`), `cloud-save` (`fingerprintProfile`) and `command-ledger`. It never imports `profile-store` or `app.mjs`; the caller passes in the store and the lock. |
| `progression.mjs` | Changes `hydrateProfile` only. For `raw.version === 5` with its own `commands` key, it sets `hydrated.commands = validateCommandLedger(raw.commands)`. Otherwise the key stays absent and is never invented. This is wired the same way as `validateWX01State` and `validateExpansionState`. |
| `profile-store.mjs` | **No code change.** The canonical re-hydrate check in `assertLocalProfile` (line 45) now carries and checks the ledger before `setItem`. The 4 MiB envelope check (line 48) now counts it. |
| `cloud-save.mjs` | Export `LOCAL_ONLY_PROFILE_KEYS = ['commands']` and `backupProfile(profile)`, a shallow copy without those keys. `createSnapshot` validates `backupProfile(profile)`. Unchanged: `validateSnapshot`, `validateProfile`, `restoreSnapshot`, `fingerprintProfile`, `SNAPSHOT_VERSION`. |
| `account-client.mjs` | `localDiffers` compares `fingerprintProfile(backupProfile(getLocalProfile()))` with the backup. The restore-confirmation fingerprints (lines 239, 249, 253) stay computed over the **full** profile. |
| `app.mjs` | Adds the `profileLock` binding and sets `passportQuote` in `showInstance`. `instance-upgrade` goes through `runUpgrade` (§7.1). `upgrade-card` goes to the card page. `restoreLocalProfile` retires the ledger (§11). `transact` calls `assertLedgerUnchanged` and gets a comment on its fallback. |
| `hosting/public-assets.json` | Add `command-ledger.mjs` and `local-commands.mjs`. This is also needed locally, because `tools/serve.py` serves only allowlisted files. |
| Tests | New: `tests/command-ledger.test.mjs` and `tests/local-commands.test.mjs`. Extended: profile-store, cloud-save, account-client and hosting tests. See the test matrix. |
| `tools/command-smoke.mjs` (new), npm `test:commands` | Runs Chromium, then WebKit (`BROWSER=webkit`), with synthetic saves and an explicit loopback `GAME_URL`. It is modelled on `tools/inheritance-smoke.mjs`. `backpack-smoke` and `classics-smoke` launch Chromium only. |
| Docs | Adds this file. Also: an EXPERIENCE-MODULES Q1 pointer, a ROADMAP Q1 status line, a dated VALIDATION receipt for each round, and in HANDOVER a Q1 checkpoint, a checks row and the `commands` and fence invariants. |

**Not touched:** `engine.mjs`, `collection.mjs`, `inheritance.mjs`, `wx01-state.mjs`, `backpack-ui.mjs`, `adventure-ui.mjs`, `bootstrap.mjs`, `server/`, `supabase/`, the `PROFILE_LOCK` name and every `shanhai.*` namespace.

**Added after review (§18.4):** a third runtime module, `profile-fence.mjs` (allowlisted), with `tests/profile-fence.test.mjs`. `profile-store.mjs` gains `restoredLocalProfile` and `store.replace` for restore (§11). `app.mjs` and `playtest-supply-ui.mjs` take `PROFILE_LOCK` through the fenced lock (§10.1).

**Import graph:**

- `bootstrap → app → local-commands → { progression → command-ledger, collection, cloud-save → progression }`.
- `profile-store → progression` already exists. There are no cycles.
- The Worker bundles `cloud-save`, so it will also include the pure `command-ledger.mjs`. Its behaviour does not change and it needs no redeploy for compatibility.

## 3. API

```js
// command-ledger.mjs: pure; no storage, DOM, clock or RNG
export const COMMAND_LEDGER_VERSION = 1;
export const MAX_COMMAND_RECEIPTS = 32;
export const MAX_COMMAND_SEQ = 1_000_000_000;
emptyCommandLedger()                  // { version: 1, nextSeq: 1, retiredBelow: 1, receipts: [] }; virtual, never written on load
commandIdFor(seq)                     // 'cmd-' + seq
parseCommandId(commandId)             // -> seq, or throws RangeError
normalizeCommandIntent(intent)        // -> { type: 'care.upgrade', uid, toLevel }, or throws RangeError
validateCommandLedger(raw)            // strict; returns a detached copy, or throws RangeError
receiptForSeq(ledger, seq)            // -> receipt | null
appendCommandReceipt(ledger, receipt) // -> new ledger, pruned to MAX_COMMAND_RECEIPTS
retireCommandLedger(ledger)           // restore: { version: 1, nextSeq: n + 1, retiredBelow: n + 1, receipts: [] } where n = ledger.nextSeq
assertLedgerUnchanged(beforeJSON, after) // transact guard; throws RangeError

// local-commands.mjs: no DOM, sound, animation, network or RNG; store, lock and clock are passed in
previewCommand(profile, { type: 'care.upgrade', uid })
// Pure: no storage, lock, clock or mutation. Throws RangeError only for a malformed intent (a programming error).
// -> { commandType: 'care.upgrade', selectedUids: [uid],
//      costs:    { coins, dust } | null,
//      effects:  { cardId, printId, fromLevel, toLevel, fromXP, toXP } | null,
//      blockers: [{ code: 'missing' | 'in-journey' | 'maxed' | 'coins' | 'dust', message }],
//      request:  { commandId, intent: { type, uid, toLevel }, expectedFingerprint } | null }  // null exactly when blockers is non-empty

commitCommand(request, { store, lock, now = () => new Date() })
// store: the result of createProfileStore(). lock: (syncCallback) => Promise that gives its holder
// every earlier holder's write (in the browser, the strict fenced lock below), or null.
// -> Promise< { status: 'committed', duplicate: false, receipt, profile }
//           | { status: 'committed', duplicate: true,  receipt, profile }  // the original receipt; no write, no rule call
//           | { status: 'rejected', reason, message }                     // nothing written (§9)
//           | { status: 'unknown', commandId, message } >                 // never proof of failure
// Never throws for expected failures.

readCommandReceipt({ commandId, intent }, { store, lock })
// Read-only. Takes the lock when one is given, so it queues behind an in-flight commit.
// -> Promise< { status: 'committed', receipt } | { status: 'not-committed' }
//           | { status: 'expired' } | { status: 'unavailable', message } >
```

The lock passed to `commitCommand` and `readCommandReceipt` must give its holder every earlier holder's write. A bare Web Lock over `localStorage` does not (§10.1), so the browser passes the fenced lock:

```js
// profile-fence.mjs: no DOM, network or RNG; the lock, fence store, reader and clock are injected
createFencedLock({ request, fence, read, strict })  // -> (syncCallback) => Promise
// strict: rejects with ProfileFenceError before the callback when it cannot prove the bytes are current;
//   its code is missing | quota | unavailable (IndexedDB) or unsynced | unsettled (the record)
// lenient (strict: false): waits briefly, then runs the callback as before; for writers only
createIndexedDBFence(indexedDB, { key })           // -> { read({ signal }), write(record, { signal }) }
profileDigest(text)                                 // change detector over the stored text

// app.mjs, read at click time (§18.2)
const fencedLock = strict => navigator.locks ? createFencedLock({
  request: fn => navigator.locks.request(PROFILE_LOCK, fn), fence: profileFence,
  read: () => localStorage.getItem(PROFILE_KEY), strict }) : null;
const profileLock = () => fencedLock(true);   // commitCommand, readCommandReceipt, restoreLocalProfile
const writerLock = () => fencedLock(false);   // transact
```

**Blocker messages** reuse the rule's existing text:

| Blocker | Message |
| --- | --- |
| `missing` | 背包中找不到這張卡牌實體。 (also covers a copy held in the merchant vault) |
| `in-journey` | 這張卡牌正在出戰，完成旅程後才可修練。 |
| `maxed` | 這張卡牌已達最高修為。 |
| `coins` | 金幣不足。 |
| `dust` | 靈砂不足。 |

## 4. Command identity

- **Format.** `commandId = commandIdFor(ledger.nextSeq)`, where `ledger = profile.commands ?? emptyCommandLedger()` at preview time.
  - It must match `/^cmd-[1-9]\d{0,9}$/`, with a value of at most `MAX_COMMAND_SEQ`.
- **Normalized intent.** Exactly the keys `{ type: 'care.upgrade', uid, toLevel }`:
  - `uid` matches `/^card-\d{6,}$/`.
  - `toLevel` is an integer from 2 to 5: the copy's level at preview time, plus one.
  - It always names one exact copy. It never names a `cardId` and never goes through `resolveInstance`.
- **What a command is.** The pair (slot, normalized intent).
  - Only `previewCommand` creates requests, and the UI never edits them.
  - Committing binds the slot to the intent in the receipt.
- **Duplicate.** Same slot and same intent: return the original receipt.
  - This holds even if the caller's fingerprint is now out of date, or the copy has since reached the top level.
  - The rule never runs twice.
- **Changed payload.** Same slot with a different intent is rejected as `identity-conflict`, and nothing is written.
  - This covers two tabs that previewed the same slot for different copies or levels.
  - The player copy names the cause (§9): another copy's upgrade took the slot, or this copy's slot was taken at another level.
- **Why a duplicate always means the same effect.** Within one lineage, a copy's level never goes down:
  - `setInstanceXP` refuses lower XP.
  - Selling and buying back keep the record.
  - A restore retires the old slots.

  So a given `(uid, toLevel)` can commit at most once. Two tabs that previewed the same copy at the same level asked for the same effect, and the second one is not charged.
- **Exactly-once has a limit.** It holds for the 32 retained slots. Older slots are `expired`. They never run again, and there is no replayed receipt for them.

## 5. Relevant-state fingerprint (`care.upgrade`)

```js
expectedFingerprint = fingerprintProfile({        // cloud-save.mjs: stable, independent of key order, bounded
  type: 'care.upgrade',
  instance,                                       // the whole owned record as stored: uid, cardId, printId, level, xp,
                                                  // locked, battles, wins, acquiredAt, origin (and any future field)
  inJourney: isInstanceInJourney(profile, uid),   // pending battle or Fire Mountain run
  cost: { coins, dust, nextLevel },               // from getUpgradeCost, not re-derived
});
```

- **It covers the full record.** This follows the precedent of `inheritance.mjs`, which fingerprints `stable({ target, materials })`. So XP, battles, inheritance, sale or a lock change on that copy in another tab makes the preview stale.
- **It leaves balances out.**
  - The commit rechecks affordability under the lock, and the receipt records the real balances afterwards.
  - Earning coins elsewhere does not make a preview stale. Falling below the cost blocks the command.
  - Q2 plans with reserve floors must add balances to their own fingerprint.
- **It leaves out membership in a WX receipt.** Today's rule allows the upgrade, and Q2 decides whether to change that.
- **It is a change detector only.** It is not a signature or proof of ownership. It is never saved and never placed in the DOM.

**UI binding (load-bearing).**

- `showInstance(uid)` sets `passportQuote = previewCommand(profile, { type: 'care.upgrade', uid })`. It uses the **same** `profile` object that it passes to `instanceMarkup`, so the painted numbers and the fingerprint describe the same state.
- A click commits `passportQuote.request`. It never commits a preview recomputed at click time.
- The module-level `profile` can change under an open card page, through storage or visibility events or `render()` → `refreshDaily`. A preview made at click time would silently take on another tab's change, which is the stale spend this contract exists to stop.

## 6. Ledger, receipt and retention

```json
"commands": {
  "version": 1, "nextSeq": 8, "retiredBelow": 1,
  "receipts": [
    { "seq": 7,
      "intent": { "type": "care.upgrade", "uid": "card-000123", "toLevel": 3 },
      "at": "2026-10-11T12:00:00.000Z",
      "result": { "cardId": "wukong", "printId": "legacy/wukong",
                  "fromLevel": 2, "toLevel": 3, "fromXP": 105, "toXP": 200,
                  "coins": 240, "dust": 12, "coinsAfter": 960, "dustAfter": 8 } }
  ]
}
```

The window holds every receipt from `retiredBelow` to `nextSeq − 1`: seven here, one shown. Every `result` field comes from the real profiles before and after the change, not from the preview.

**Validator.** `validateCommandLedger` fails closed, like `validateWX01State`, and throws `RangeError('本機操作記錄不完整，未有更改存檔。')`. It requires:

- **Shape:** exact keys at every level, and `version === 1`.
- **Counters:**
  - `nextSeq` and `retiredBelow` are safe integers with `1 ≤ retiredBelow ≤ nextSeq ≤ MAX_COMMAND_SEQ`.
  - `receipts.length === nextSeq − retiredBelow ≤ 32`.
  - `receipts[i].seq === retiredBelow + i`, so the window is contiguous.
- **Intent:** it passes `normalizeCommandIntent`.
- **Timestamp:** `at` round-trips through `new Date(at).toISOString()`. It is shown to the player but never used for ordering.
- **`result` for `care.upgrade`:**
  - exact keys
  - `cardId` and `printId` are strings of 1 to 64 characters
  - `fromLevel` is an integer from 1 to 4
  - `toLevel === fromLevel + 1 === intent.toLevel`
  - `0 ≤ fromXP < toXP ≤ MAX_CARD_XP` (700)
  - `coins`, `dust`, `coinsAfter` and `dustAfter` are safe integers from 0 to 1e9

**What it deliberately does not check:**

- Costs and thresholds are not re-derived, so a later rebalance cannot invalidate history.
- Printings are not resolved against the catalogue.
- Receipts are not compared with current instances, because a copy may later be sold or used up.
- Receipts are history only. They never grant anything and are not a claim of ownership.

**On failure.** `store.load()` and `store.save()` refuse, and the original bytes stay. `bootstrap.mjs` shows its existing recovery and export screen.

**Retention:**

- **Pruning:** on commit, append the receipt. If there are more than 32, drop the oldest and set `retiredBelow` to the first `seq` that remains.
- **Size:** a sample receipt is about 265 B. Because strings are capped at 64 characters, a full ledger stays at or below 16 KiB, and a test pins this. It counts toward the existing 4 MiB envelope, which is checked before `setItem`.
- **Nothing pending is evicted:** every Q1 receipt is final when it commits. A future type that needs player review must raise `commands.version` and keep such entries. When the ledger is full it must refuse new commands before changing anything, rather than evict them.
- **WX-01 results stay separate:** they live in `wx01.receipt`. The ledger never copies or evicts them, and there is no automatic acknowledgement.

## 7. Commit algorithm

**Before the lock:**

0. If `lock == null`, return `rejected/no-lock`. Storage is never read.
1. Validate the request: exact keys `{ commandId, intent, expectedFingerprint }`, `parseCommandId`, `normalizeCommandIntent`, and a string fingerprint. If any check fails, return `rejected/invalid`.

**Entering the lock.** The fenced lock reads its IndexedDB record and waits until this tab's stored profile bytes match it (§10.1). When it cannot prove that within 2 s, it rejects before the callback runs; step 12 reports `rejected/unsynced`. The command has then read nothing and written nothing.

**Inside `lock(callback)`.** The callback first sets `entered = true`. It is synchronous: no `await`, network, animation or RNG. It catches every throw and returns a result object.

2. **Load:** `profile = store.load()`. If it throws, return `rejected/load-failed` with the store's message.
3. **Ledger:** `L = profile.commands ?? emptyCommandLedger()`.
4. **Expired:** if `slot < L.retiredBelow`, return `rejected/expired`.
5. **Duplicate lookup comes first.** If `slot < L.nextSeq`, let `r = receiptForSeq(L, slot)`.
   - Same intent: return `committed` with `duplicate: true` and `profile`. This involves no write, no rule call and no fingerprint check.
   - Different intent: return `rejected/identity-conflict`.
6. **Future slot:** if `slot > L.nextSeq`, return `rejected/stale`. The ledger is behind this request, for example after site data was cleared.
7. **Ledger exhausted:** if `L.nextSeq ≥ MAX_COMMAND_SEQ`, return `rejected/blocked`.
8. **Fresh preview:** `fresh = previewCommand(profile, { type, uid })`.
   - If there are blockers, return `rejected/blocked` with the first blocker's message.
   - If `fresh.request.intent.toLevel` or `fresh.request.expectedFingerprint` differs from the request, return `rejected/stale`.
9. **Apply the rule:** `next = upgradeInstance(profile, uid)`. If it throws, return `rejected/blocked` with its message.
10. **Append the receipt:** `next.commands = appendCommandReceipt(L, receipt)`, with `seq = slot` and `at = now().toISOString()`.
11. **Save:** `store.save(next)` runs `assertLocalProfile`, then one `setItem(PROFILE_KEY)`.
    - It returns: report `committed` with `duplicate: false`, `receipt` and `profile: next`.
    - It throws: **re-read under the same lock**. `store.load()` never writes.
      - The receipt is present with the same intent: report `committed`, because the write landed.
      - The receipt is absent and the error is `QuotaExceededError` or `NS_ERROR_DOM_QUOTA_REACHED`: report `rejected/quota`.
      - The receipt is absent and the error is anything else, including the 4 MiB envelope or capacity checks: report `rejected/write-failed` with the thrown message.
      - The re-read itself throws: report `unknown`.

**After the lock:**

12. If `await lock(...)` rejects with `entered === false`, the callback never ran:
    - a `ProfileFenceError` returns `rejected/unsynced`, with the `no-lock` text when this browser has no usable IndexedDB (`missing`), the `quota` text when IndexedDB refused a fence read or write for lack of space (`quota`), and the `unsynced` text otherwise;
    - anything else returns `rejected/lock-failed`.
    - If it rejects with `entered === true`, return `unknown`.

### 7.1 App flow (`runUpgrade(uid)` in `app.mjs`)

1. If `economyBusy` is set, return.
2. If `passportQuote?.request?.intent.uid !== uid`, repaint with `showInstance(uid)`, show the stale message, and stop.
3. If `profileLock` is null, show the no-lock message and stop. This is the same pattern as `confirmInheritance`.
4. Set `economyBusy = true`. Disable the button and set `aria-busy`.
5. Run `commitCommand(passportQuote.request, { store: profileStore, lock: profileLock })`.
6. If the result is `unknown`, call `readCommandReceipt` once with the **same** request. Never resubmit automatically, and never create a new ID for that intent.
7. Act only on the returned value, and only after the lock is released.
   - **committed:** `syncProfile(result.profile)`. Call `account.markLocalChanged()` for a new commit only. Then `render()`, then `showInstance(uid)` (which creates a new quote), then announce and play the tone.
   - **any other outcome:** `syncProfile(loadProfile())`, `render()`, `showInstance(uid)`, then show the §9 message.

## 8. Receipt lookup and interrupted outcomes

`readCommandReceipt({ commandId, intent })` runs under the lock when one is given:

| Situation | Status |
| --- | --- |
| The load throws | `unavailable` |
| `slot < retiredBelow` | `expired`. The slot was pruned or restored away, so its fate can no longer be known. |
| `slot < nextSeq`, same intent | `committed`, with the stored receipt |
| `slot < nextSeq`, different intent | `not-committed`. The slot belongs to another command. This one never ran. |
| Otherwise | `not-committed`. This is definitive under the fenced lock: a commit is one synchronous write, and the fence makes this tab wait until it can see it. When the fence cannot prove that, the lookup returns `unavailable` instead. |

**Lookup never writes.**

**Reload during a commit.** A reload or a closed tab during a commit leaves either the last committed profile (killed before `setItem`) or the new receipt (killed after it). The card page shows the saved state, and the next click makes a new preview.

A per-tab `sessionStorage` marker for in-flight work is out of scope. A Q3 queue that wants to resume must save its in-flight request in its own validated state and call `readCommandReceipt`.

## 9. Failure states

| Status / reason | Cause | Written | Player copy (zh-Hant) | Next step |
| --- | --- | --- | --- | --- |
| `committed` | Saved | One profile write | 此卡修練完成，另一張副本的等級不變。 (existing) | Sync, mark changed, render, re-open the card page with a new quote, announce, tone |
| `committed` with `duplicate` | Same slot and intent were already accepted | Nothing | 這次修練早已入帳，未有再次扣除資源。已入帳的修練：Lv.1 → Lv.2 · 120 金幣 · 6 靈砂。 (levels and costs from the stored receipt) | Sync, render, re-open the card page; show the stored receipt's real before and after |
| `rejected/identity-conflict` | Same slot, different intent | Nothing | Names the cause. Another copy's receipt holds the slot and this copy's fresh preview still matches the request: 另一個分頁剛為另一張卡完成修練；這張卡未有變動，未有扣除資源，請再按一次修練升級。 Another copy holds it and this copy changed too or is now blocked: 另一個分頁剛為另一張卡完成修練，未有扣除資源；請查看更新後的修練預覽。 This copy's own receipt at another level holds it: 卡牌剛有變動，未有扣除資源；請查看更新後的修練預覽。 | Reload and preview again; no automatic retry |
| `rejected/stale` | Fingerprint or `toLevel` differs, or the slot is ahead of the ledger | Nothing | Always 卡牌剛有變動，未有扣除資源；請查看更新後的修練預覽。 It never names another tab or another card. | Reload and preview again; no automatic retry |
| `rejected/expired` | Slot below `retiredBelow` | Nothing | 修練預覽已過期，未有扣除資源；請重新查看。 | Preview again |
| `rejected/blocked` | Rule refusal, or the ledger is exhausted | Nothing | The rule's existing message | Repaint |
| `rejected/invalid` | Malformed request | Nothing; storage not read | 修練預覽無效，未有扣除資源。 | Preview again (indicates a bug) |
| `rejected/no-lock` | `navigator.locks` is missing | Nothing; storage not read | 請用支援安全儲存的新版瀏覽器修練；未有扣除資源。 | None on this browser |
| `rejected/lock-failed` | The lock request rejected before the callback ran | Nothing; storage not read | 未能取得儲存權限，未有扣除資源；請再試一次。 | The player may click again with the same request |
| `rejected/unsynced` | The fence could not prove this tab sees the latest save: another tab's write had not arrived within 2 s or arrived during the writing mark, the previous holder did not finish recording, or IndexedDB is missing, refused or stalled (§10.1) | Nothing; the command never ran | 未能確認其他分頁的最新進度，未有扣除資源；請稍後再試，或重新整理頁面。 No usable IndexedDB in this browser (none, or a `SecurityError`): the `no-lock` text. IndexedDB refused a fence read or write for lack of space: the `quota` text, 儲存空間不足，未有扣除資源；請先匯出旅程備份。 | Retry; a reload's startup save records the fence again. For `quota`, once the device has space again |
| `rejected/load-failed` | `store.load()` threw | Nothing | The store's existing message | Existing recovery path |
| `rejected/quota` | Quota error, and the re-read confirms nothing landed | Nothing; last committed bytes kept | 儲存空間不足，未有扣除資源；請先匯出旅程備份。 | Keep the card page, refresh the preview; the player retries explicitly |
| `rejected/write-failed` | Any other `save` error, confirmed not written | Nothing | The thrown message | Same as quota |
| `unknown` | `save` threw and so did the re-read, or the lock rejected after the callback ran | Unknown | 未能確認這次修練是否已入帳；正在重新查看，不會自動重試。 | One `readCommandReceipt` with the same request |

Disabled buttons and `economyBusy` only shape the experience. Correctness comes from the identity and fingerprint checks inside the lock.

§18.2 lists the few extra messages the implementation added.

## 10. Cross-tab guard rule

1. **Adapter commands always require a real lock.** They use the exclusive `PROFILE_LOCK` (`'shanhai-profile-v3'`) and never `ifAvailable` or `steal`. When `navigator.locks` is missing, `app.mjs` passes `null`. The adapter has no unlocked path.
2. **Q2 batches and Q3 queue steps run only through `commitCommand`**, so they refuse to start without a lock by construction. A Q3 queue pauses on any outcome other than `committed`.
3. **Single actions that are not wrapped keep `transact`'s unlocked fallback in this PR.** These are claims, packs and boxes, the market, sale and buyback, lock toggles, decks, leader, battles, activity, `daily-train` and WX acknowledgement.
   - A comment at `transact` labels the fallback "same tab only; not cross-tab serialization".
   - Wrapping an action later switches only that action.
4. **These already refuse without locks, and still do:** inheritance, cloud restore, local recovery restore and the playtest supply page. Since the third review, both restores also need the fence (item 8, §11).
5. **The wrapped card-page upgrade now requires a lock.** Only browsers without Web Locks are affected. `127.0.0.1` loopback and the HTTPS public site are secure contexts.
6. **Same tab.** `runUpgrade` sets and respects `economyBusy`. It therefore takes turns with the existing economy actions, and `restoreLocalProfile` (which refuses while `economyBusy` is set) cannot interleave with it.
7. **Only two writers may change the ledger:** `commitCommand` and `restoreLocalProfile`.
   - Before calling `change`, `transact` captures the canonical JSON of the loaded `commands`. Before `save`, it calls `assertLedgerUnchanged`.
   - If they differ, it throws `本機操作記錄不可由此動作更改；未有更改旅程。` and writes nothing.
   - This keeps the invariant "once a profile has a ledger, it keeps one", which the restore rule in §11 depends on.
8. **Every writer under `PROFILE_LOCK` goes through the fenced lock** (§10.1): commands and `restoreLocalProfile` strictly, `transact` and the playtest supply page leniently.

### 10.1 Read-after-write fence (added after review)

**Why.** `localStorage` is only eventually consistent between renderer processes, and two pages of one browser profile usually run in different renderers. The next holder of the exclusive Web Lock could read the bytes from before the previous holder's write. In review, a probe saw this in 98/100 lock handoffs at 50 KB in Chromium and 45/100 at 5 KB in WebKit. Through the card page, two tabs then both reported 此卡修練完成, and one upgrade and its receipt were silently overwritten (5/10 rounds at about 60 KB in Chromium). Same-page reads were always current.

**Mechanism** (`profile-fence.mjs`). One record lives in IndexedDB: database `shanhai.profile.fence`, store `fence`, key `shanhai.profile.v5`. A holder of `PROFILE_LOCK`:

1. reads the record;
2. waits until `profileDigest(localStorage.getItem(PROFILE_KEY))` equals the recorded digest;
3. records `{ v: 1, state: 'writing' }`;
4. checks that the bytes still have that digest (added after the third review). Equal content is not proof that every write has arrived. When another tab's writes take the profile from X to Y and back to X, a tab that still shows the first X matches at once, and the older Y can reach it while step 3 is in flight. A strict holder then puts the record back and refuses; a lenient holder waits again, for the same budget;
5. runs the synchronous callback;
6. records `{ v: 1, state: 'settled', digest }` for the bytes it leaves, and only then releases the lock.

IndexedDB transactions are ordered by the browser, so the next holder's read sees that record. An origin where nothing fenced has written yet has no record, and the first holder proceeds.

**Strict holders** (`commitCommand`, `readCommandReceipt`, and since the third review `restoreLocalProfile`) reject before their callback with a `ProfileFenceError`. Its `code` says why:

- `unsettled`: the record says `writing` or is malformed. The holder first writes the `writing` mark again, which changes nothing for any holder (added after the second pre-merge review). When IndexedDB refuses that write, the code names the refusal instead (`quota`, `missing` or `unavailable` below), because no reload can heal the record until IndexedDB accepts writes;
- `unsynced`: the bytes do not match within 2 s, or they changed during the writing mark (step 4);
- `missing`: there is no IndexedDB, or opening it throws `SecurityError`, so this browser cannot fence in this context;
- `quota`: IndexedDB refused a fence read or write with `QuotaExceededError` (or Firefox's `NS_ERROR_DOM_QUOTA_REACHED`), as on a full disk;
- `unavailable`: any other IndexedDB failure, or one operation stalled for 1.5 s.

A commit then reports `rejected/unsynced`, with player copy chosen by the code (§9). A lookup reports `unavailable` with the fence's message. A restore rejects with the fence's message and changes nothing (§11).

**Lenient holders** (`transact`, the playtest supply page) wait up to 0.5 s, then proceed as they did before the fence. They are writers, and their write records the fence again. That heals a `writing` record left by a closed tab or a failed settle, and an edit made outside the lock. Every page load's startup save (`transact(p => p)`) is such a write.

- **A `writing` or malformed record (changed after the pre-merge review).** It has no digest to wait for, and it can mean that a holder saved and then failed to record its bytes: IndexedDB aborted the settle, the disk filled between the two fence writes, a fence write stalled past 1.5 s, or the tab closed. A lenient holder therefore waits the whole 0.5 s before it reads and writes, so that write has the same time to reach its tab as a recorded one. Before, it waited 0 s, and a tab still behind wrote its older bytes over a commit that another page had already reported as 此卡修練完成 (N31). A page load that finds such a record paints 0.5 s later, and its startup save heals the record, so this happens once while IndexedDB accepts writes. While IndexedDB refuses them, nothing heals the record and every lenient write waits (Limits).

**Rules for new code.** Every writer under `PROFILE_LOCK` must use the fenced lock. The fence knows only the writes recorded through it. A writer that bypasses it, such as a devtools edit or a v5 build from before the fence on the same origin, leaves the previous record in place:

- once its bytes have reached a strict holder's tab, that holder refuses until a lenient write records them;
- before they arrive, the tab's older bytes still match the old record, so a strict holder decides on them and overwrites the bypassing write, exactly as before the fence.

N27 pins both cases. A bypassing writer is therefore not protected, and a pre-fence v5 build must never be served on an origin that has served Q1 (§11).

**What it is not.** The record holds a length and two 32-bit hashes of the stored text, never profile data. It is not exported, backed up or restored, and clearing site data clears it with the save. It does not change the profile, the snapshot or any hosted service.

**Limits.**

- A lenient holder that has not caught up within 0.5 s still writes from what it sees, as every writer did before the fence. Review measured catch-up under 50 ms. Restore is strict for this reason (§11).
- This includes the lenient write that heals a `writing` record. When a commit or a restore saved and its settle then failed, a healing tab still behind after 0.5 s discards that write and records its own older bytes as settled, so nothing refuses afterwards. The tab that saved has already reported success. After a restore, the restored journey then exists nowhere: the recovery copy holds the replaced one. N31 pins the wait, and a zero-budget control shows the loss.
- A write that bypasses the fence can be lost until it reaches the next strict holder's tab (see the rules above).
- If IndexedDB refuses the `writing` record (for example a full disk), or the fence read fails, a lenient writer proceeds without recording. A strict holder in a renderer that is still behind can then match the older record.
- On such a full disk, once a lenient write has changed the profile, the recorded digest is out of date. A strict holder then waits 2 s and refuses with the `unsynced` text rather than the `quota` text, and a reload does not heal the fence until IndexedDB accepts writes again. The `quota` text needs IndexedDB to refuse the strict holder's own fence read, its writing mark, or its rewrite of a `writing` record's mark; a read that succeeds against an out-of-date settled record gives the `unsynced` text.
- **Lenient writes wait on a full disk (stated after the second pre-merge review, narrowed after the third).** While IndexedDB refuses fence writes, no lenient write can record its bytes, so the record stays as it was. On a `writing` or malformed record each lenient holder sleeps its whole 0.5 s (above), from the first write on. On a settled record the digest is still current at first, so a lenient write matches it at once and waits 0 s, and so does a page load whose startup save writes back the same text. Once a lenient write has changed the profile, the digest is out of date, and each lenient write after it waits its whole 0.5 s for bytes that never match. In either state the wait covers every page load and every lenient action (claims, packs, boxes, deck saves, lock toggles, battle start and end, the playtest supply) until IndexedDB accepts writes again; the next lenient write then heals the record. Reviewers measured the lobby at 837–872 ms on a `writing` record, against 95–149 ms, and four lenient writes from a current settled record at 0, 535, 536 and 534 ms; N32 pins both patterns. The wait on a `writing` record is new with `9390070`; before it, such a write waited 0 s (N31). It was kept: while nothing can be recorded, it is the only chance an unrecorded write has to reach a tab still behind, and skipping it after a failed mark would remove that chance for the `writing` record alone. No data is lost or charged twice by the wait itself.
- Not checked: separate browser windows or processes, the Safari app, Firefox, physical devices.

## 11. Profile field and migration impact

**Nothing to migrate:**

- No migration step. `PROFILE_VERSION` stays 5, and the key stays `shanhai.profile.v5`.
- `BATTLE_KEY`, `RECOVERY_KEY`, the legacy keys and the export list in `bootstrap.mjs` are unchanged.
- An absent `commands` field is the defined initial state of ledger v1. Versioning lives in `commands.version`.

**The ledger stays absent until first use:**

- `hydrateProfile` never invents the field.
- Existing v5 saves load and save without gaining it. That includes the startup `transact(p => p)` and every action that is not a command.

**Existing writers keep it.** Probed at `8afbabc`, these keep an extra top-level key unchanged: `upgradeInstance`, `trainInstance`, `claimLogin`, `buyPack` (all and wx01), `buyWX01Box`, `toggleInstanceLock`, `refreshDaily` and `beginBattle`.

- The full table in the test matrix also covers the rest, plus `claimPlaytestSupply`.

**Legacy sources:**

- A v3 or v4 source that carries `commands` is already refused by the canonical check in `assertLegacyCopies` (`舊旅程記錄不完整；原件仍保留。`).
- A v2 source drops unknown keys, as it does today, so a migration never creates a ledger.
- Snapshot versions 1, 2 and 3 that carry `commands` are rejected by the unchanged `validateSnapshot`.

**Restore** (both cloud restore and local recovery, through `restoreLocalProfile`):

- Inside the lock, if the profile being replaced has a ledger, the restored profile gets `retireCommandLedger(current.commands)`.
- That uses up the slot an outstanding preview could hold, so every ID from before the restore becomes `expired`.
- **The lock is the strict fenced lock (changed after the third review).** The retired boundary and the recovery copy are only as current as the bytes the restoring tab sees.
  - Under the lenient lock, a tab that had not received another tab's commit within 0.5 s restored from its older bytes. It retired the ledger from the old `nextSeq`, so a quote minted after that commit stayed valid and committed in the restored journey. Its recovery copy also missed the commit, which then existed nowhere, although its tab had shown 此卡修練完成.
  - Now such a tab waits up to 2 s and otherwise refuses with 其他分頁剛儲存的旅程仍未同步到這裡；未有更改旅程。 Nothing is written. Once the commit arrives, the confirmation no longer matches (§12).
  - **Cost.** A restore also refuses while the fence says `writing` (a reload heals it while IndexedDB accepts writes; on a full disk the refusal asks for space, §10.1), on a full disk that refuses the fence write, and in a browser without usable IndexedDB. Before, it needed only Web Locks. Restore is rare and confirmed first, and a refusal changes nothing.
- **A refused local recovery restore can be retried from its dialog (fixed after the final review).** The refusal changes nothing and leaves the dialog open, so `app.mjs` keeps its confirmation draft until a restore succeeds. Pressing 復原本機旅程 again, as the `unavailable` text invites, runs the backup (`savedAt`) and fingerprint checks again and restores once the fence passes; a journey that changed meanwhile is still refused as changed. A press while a restore is in flight is ignored, also in a dialog closed and opened again meanwhile, which keeps the in-flight restore's draft (fixed after the second pre-merge review). Cloud restore needs no change: `account-client.mjs` clears its confirmation and shows the error, so the player confirms again.
- **Order (fixed after review).** `store.replace(current, restored)` in `profile-store.mjs` first builds the profile to save, with the retired ledger, and checks it with `assertLocalProfile`. Only then does it write the `RECOVERY_KEY` copy of `current`, and then the profile. A refused restore therefore leaves both untouched. If the profile write throws, the store reads the profile again under the same lock, because a throwing write may still have landed (§7 step 11):
  - the replaced bytes are still stored: the previous recovery copy is put back, or removed when there was none;
  - the restored bytes are stored: the restore landed and is reported as done;
  - other bytes, or a re-read that throws: the new recovery copy is kept and the error is reported, because the replaced journey may now exist nowhere else.
- **A backup within the retired ledger's bytes of the limit.** The retired ledger adds about 77–93 B, and it counts toward the 4 MiB envelope. A backup that fits alone but not with it is refused with 這份旅程備份未超過 4 MiB 上限，但加上此裝置的操作記錄後超過儲存上限；本機旅程及回復備份均未更改。 It still restores on a journey without a ledger. Excluding the ledger from the envelope was not done: the full-profile fingerprints used by restore confirmation are bounded by the same limit, and moving the backup limit would be a hosted change. Review measured the largest save the game can produce at 3.59 MB, so only a hand-made backup reaches this edge.
- If the profile being replaced has no ledger, the restored profile stays without one. The existing restore smokes stay byte-equal, including the `deepEqual` at `tools/account-smoke.mjs:270`. See §15 decision 1.

**Export:** `export-save` still downloads the raw profile, ledger included. There is no import path. Any future import must retire the ledger, as restore does.

**Older builds (forward-only):**

- A v5 build from before Q1, on the **same origin**, refuses a save that contains `commands`.
  - It throws `旅程資料未能完整讀取；原件仍保留，請先匯出備份。` with zero writes (verified in Node at `8afbabc`).
  - The bootstrap recovery screen then offers export.
- Public v0.5.1 uses `shanhai.profile.v3` and snapshot v1, so it is unaffected.
- **Release guidance:** ship Q1 no later than the first public release that uses profile v5. After players have committed commands, rolling back below Q1 needs a forward fix.
- **Never serve a v5 build from before the fence** (`origin/main` `8afbabc`, or this branch before `7a7d03e`) on an origin that has served Q1. Such a build still opens a save without `commands`, and its writes bypass the fence, so a Q1 tab that has not yet received them can overwrite them (§10.1).
- **Release checks (added after the pre-merge review).** A release that includes Q1 runs `npm run test:commands`, in Chromium and WebKit, beside `npm run test:browser`. `test:browser` does not run `tools/command-smoke.mjs`. Its own suites click the card page's upgrade and check the unsettled-fence restore (A1) in Chromium, but B2–B11 are the only browser checks of the fence's edge cases, and the only WebKit checks of the command path. The release plan on `origin/main` (`daf18ed`, `docs/RELEASE-NEXT.md`, written from `8afbabc`) does not name it, in A8 or in its §10 step 3. [HANDOVER](HANDOVER.md#q1-local-commands-checkpoint--2026-10-11-local-only) lists this with the other merge notes.

## 12. Backup validation impact

- **No hosted change.** The snapshot format and `SNAPSHOT_VERSION 3` stay. So do `validateSnapshot`, `validateProfile`, `server/account-api.mjs` (which imports only `validateSnapshot`), the Supabase JSONB checks and the `JOURNEY_*` flags. There is no Worker deploy and no SQL migration.
- **Backups never contain the ledger.** `createSnapshot` removes it from uploads, from restore-confirmation validation, and from the `RECOVERY_KEY` copy that `restoreLocalProfile` writes before replacing a profile. Without this, the current code would throw.
- **Ledger-only differences do not count as changes.** `localDiffers` compares profiles with the ledger removed, so a difference only in the ledger never shows the journey as changed.
- **Restore confirmation keeps the full fingerprint, ledger included.** A command committed between confirmation and restore therefore blocks the restore, as intended. Because restore holds the fence strictly (§11), this also holds when that command has not yet reached the restoring tab: the restore then refuses as unsynced instead of matching the older bytes.

## 13. Deviations from EXPERIENCE-MODULES, and rejected alternatives

**Deviations:**

1. **No random epoch.** Within a lineage the sequence only increases. A restore retires the boundary (`retiredBelow = nextSeq + 1`).
   - This is the module note's "retain the accepted/retired sequence boundary", using one integer.
2. **Restore retires only a lineage that has a ledger.**
   - The remaining gap: suppose the current journey on this origin has never committed a command. Then a card page opened before a restore can still commit once afterwards, but only if the restored profile holds the identical copy record (same uid, XP, level, printing, history and `acquiredAt`).
   - That is one charge at the quoted cost. It is never a duplicate, because nothing was ever committed in that lineage.
3. **`readCommandReceipt` takes `{ commandId, intent }`,** not the ID alone. A slot alone could belong to another tab's command.
4. **`commitCommand` takes no `rng`,** because Q1 has no RNG. A future RNG command must draw only inside the lock, after the identity and fingerprint checks pass.

**Rejected alternatives:**

- **Random command IDs, nonces or random epochs.** They need more state and an injected random source to give the same guarantees.
- **A fresh ledger on every restore.** It breaks `tools/account-smoke.mjs:270`, and it spreads the forward-only hazard to everyone who restores.
- **Keeping the ledger in cloud backups.** The deployed `validateSnapshot` rejects unknown keys, so the Worker would have to ship first. It gains nothing, because a restore retires the ledger anyway.
- **A profile v6 under a new key.** Every `version === 5` check would change, plus snapshot v4, `journey_v4` SQL and a new flag. It would also leave rolled-back v5 clients with a stale copy that could still be played.
- **Accepting unknown command types as opaque receipts.** That weakens the strict validator. A new type raises `commands.version` instead, and older clients fail closed.
- **Smaller extras:**
  - balances in the fingerprint
  - a 5-second lock timeout
  - a runtime post-condition check (tests pin it instead)
  - changing `backpack-ui.mjs`
  - refusing the 12/24 WX box without locks (that changes existing WX behaviour and is a separate owner decision)

## 14. Mapping to the ROADMAP Q1 exit

Test IDs refer to the [test matrix](#appendix--test-matrix): N is a Node test, B a browser smoke.

| Exit criterion | Covered by |
| --- | --- |
| A stale preview cannot spend | N7, N8, N21, N22, and smoke B2 |
| A duplicate submission spends once | N5, N8, N22, and smokes B3, B4 (also at about 60 KB) and B7 |
| Quota or storage refusal changes nothing | N11, N12, and smoke B5 |
| A tab or reload interruption loses nothing | Single-write atomicity, N12 (write landed, then threw), N13, N22–N23 (another tab's write is seen, or the command refuses), B1's reload and B8 |
| A changed payload under the same identity is rejected | N6, N26 |
| New fields are versioned and backups stay compatible | §11, §12, and N15–N19 |

## 15. Owner decisions

1. **Restore rule.** This contract retires only a lineage that has a ledger. The alternative, "always retire", closes the gap in §13 item 2. It costs the `account-smoke` `deepEqual` update and makes every restored profile Q1-only.
2. **Browsers without Web Locks.** On Safari below 15.4, Firefox below 96 and insecure origins, the card-page upgrade is lost, as inheritance and restore already are.
3. **Release ordering.** Ship Q1 in or before the first public v5 release, and never serve a pre-fence v5 build on an origin after Q1 (§11). A release that includes Q1 also runs `npm run test:commands` in both engines (§11).
4. **Retention.** Confirm that 32 receipts is enough.
5. **Copies awaiting WX review.** Upgrading a copy that sits in an unacknowledged WX receipt stays allowed in Q1. Q2 decides whether to block it.

## 16. Out of scope

- Q2 care plans and Q3 queues.
- Training.
- Wrapping any other action, or changing `transact`'s fallback.
- RNG or pack commands.
- A command history UI, and repainting an open card page on storage events.
- A `sessionStorage` marker for in-flight commands.
- Any hosted, Worker or SQL work.
- Rule rebalancing.

## 17. Evidence for this contract (pre-implementation, 2026-10-11, worktree `8afbabc`, clean)

This is the evidence the contract was agreed on, before any code. §18.3 has the implementation checks.

**Passed:**

- `git rev-parse --short HEAD` printed `8afbabc`, and `git status --short` printed nothing.
- `node --test tests/*.test.mjs`: exit 0, 456 of 456 passed.

**Read-only Node probes of the worktree modules (exit 0):**

- `hydrateProfile` drops an extra `commands` key.
- `assertLocalProfile` and `store.load()` refuse a v5 profile with `commands`, with zero writes.
- `createSnapshot` refuses it.
- v3 and v4 sources that carry `commands` are refused. A v2 source loads and drops it.
- Nine mutators keep the key.
- Two upgrades in a row on one copy charge 120, then 240 coins.
- A sample receipt is 265 B.

**Import-closure probe (exit 0):** the 36 modules reachable from `bootstrap.mjs` are all in `public-assets.json`, and the playtest graph is covered by public plus preview. The proposed hosting test therefore passes today.

**Release check:** `git show v0.5.1:progression.mjs` and `git show v0.5.1:cloud-save.mjs` confirm profile v3 under `shanhai.profile.v3`, and snapshot v1.

**Not checked at that point:** no code, no browser or WebKit run, no real two-process test of Web Locks combined with `localStorage` visibility, no device run and no hosted check.

## 18. Implementation record (2026-10-11)

### 18.1 What exists

Branch `q1/local-commands`, from `8afbabc`. Not pushed, merged or deployed.

| Commit | Content |
| --- | --- |
| `762412b` | `command-ledger.mjs`; the `hydrateProfile` hook; `backupProfile` and `LOCAL_ONLY_PROFILE_KEYS` in `cloud-save.mjs`; `localDiffers` in `account-client.mjs`; allowlist entry; ledger, profile-store, cloud-save and account-client tests |
| `d2111ab` | `local-commands.mjs`; allowlist entry; `tests/local-commands.test.mjs`; the import-closure hosting test |
| `c529206` | `app.mjs`: `profileLock`, `passportQuote`, `runUpgrade`, the `upgrade-card` reroute, the `transact` guard and comment, restore retirement |
| `8fe664c` | `tools/command-smoke.mjs` and npm `test:commands` |
| `7a7d03e` | After review: `profile-fence.mjs` and its allowlist entry; the fenced lock in `app.mjs` (commands strict; `transact` and restore lenient) and in `playtest-supply-ui.mjs`; the `unsynced` reason; `tests/profile-fence.test.mjs`; smoke B4 at about 60 KB, B7 and B8 |
| `19aa648` | After review: `restoredLocalProfile` and `store.replace` in `profile-store.mjs`, used by `restoreLocalProfile`; N24 |
| `6f58d83` | After review: `receiptSummary` and `duplicateMessage`; the duplicate toast; N25; the receipt checks in smokes B2 and B4 |
| `dac1e0a` | After the second review: `store.replace` re-reads the profile after a throwing write; the N24 land-then-throw test |
| `a8db57c` | After the second review: `identity-conflict` names its cause (`other-card`, `other-card-changed`); N26; the N6 and N22 copy checks; smokes B2 and B4 |
| `14d0473` | After the second review: the §10.1 bypass limit and the pre-fence release rule (§11, §15, HANDOVER); N27 |
| `5fdf5c5` | After the third review: fence failures name their cause (`missing`, `quota`, `unavailable`) and the commit copy follows it; the N23 updates; N29 |
| `c008010` | After the third review: the fence checks the bytes again after its writing mark (X → Y → X); N28 |
| `323d27c` | After the third review: `restoreLocalProfile` holds the strict fenced lock; N30; the unsettled-fence restore check in `tools/account-smoke.mjs` |
| `334bc75` | After the third review: smoke B9 (a full disk refusing the fence write) |
| `0492242` | After the third review: §3, §7, §9 (the `stale` row spelled out), §10, §10.1, §11, §12, the test matrix and HANDOVER |
| The commit that adds §18.8 | Documentation only: the final check, its VALIDATION entry, the ROADMAP status line and the HANDOVER checkpoint |
| `345f92f` | After the final review: a refused local recovery restore keeps its draft for a retry in the dialog; smoke B10; the second press in the account smoke's A1 |
| The commit that adds §18.9 | After the final review: §2, §7 step 12, §10.1 Limits and §11; the test matrix, VALIDATION, ROADMAP and HANDOVER |
| `9390070` | After the pre-merge review: a lenient holder waits its whole budget on a `writing` or malformed record; N31; smoke B10 asserts that a press during the restore is ignored |
| The commit that adds §18.10 | After the pre-merge review: the status header, §10.1, §11 release checks, §15, the test matrix, VALIDATION, ROADMAP, and HANDOVER with its merge notes |
| `1afaf6b` | After the second pre-merge review: a strict holder on a `writing` or malformed record writes the mark again and names a refusal's cause; a reopened recovery dialog keeps the in-flight restore's draft; N32; smoke B9's full-disk `writing` case and B11 |
| `0e1ef85` | After the second pre-merge review: smoke B11 also retries from the reopened dialog after a refused restore |
| The commit that adds §18.11 | After the second pre-merge review: the status header, §10.1 codes and Limits, §11, the HANDOVER anchors, the test matrix, VALIDATION, ROADMAP and HANDOVER |
| `38fa64f` | After the third pre-merge review: a second N32 test pins which lenient writes wait on a full disk from a settled record |
| The commit that adds §18.12 | After the third pre-merge review: the status header, §10.1 Limits, §18.11's account of the wait, the test matrix, VALIDATION, ROADMAP and HANDOVER |

The public allowlist now has 83 files (82, plus `profile-fence.mjs` after review).

### 18.2 Where the implementation differs from or adds to the text above

1. **`profileLock` is read at click time.** `app.mjs` defines `profileLock()` and calls it in `runUpgrade`, instead of computing the binding once at load. A page that loses `navigator.locks` after load therefore refuses with `no-lock` rather than failing inside the lock call. Otherwise it is the same binding.
2. **Extra exports.**
   - `local-commands.mjs` exports `COMMAND_MESSAGES`, all player copy in one place.
   - `command-ledger.mjs` also exports `COMMAND_TYPES`, `COMMAND_LEDGER_ERROR`, `COMMAND_LEDGER_GUARD_ERROR`, `sameCommandIntent` and `commandLedgerJSON(profile)`. The last returns the canonical ledger text, or `null` when there is no ledger; `transact` passes it to `assertLedgerUnchanged`.
3. **Extra player copy**, for cases §9 did not word:
   - ledger exhausted (`rejected/blocked`): 本機操作記錄已達上限，未有扣除資源。
   - an invalid device clock at commit (`rejected/write-failed`, nothing written): 裝置日期無效，未有扣除資源。
   - `write-failed` from an error without a message: 未能儲存，未有扣除資源；請再試一次。
   - after `unknown`, when the one lookup returns `not-committed`: 這次修練未有入帳，未有扣除資源；請查看更新後的修練預覽。 `expired` and `unavailable` keep the `unknown` text.
4. **An unexpected throw between load and save**, such as a receipt that fails ledger validation, returns `rejected/write-failed` with its message. Nothing has reached storage at that point.
5. **A blocked quote.** If the card page's quote has no request (the button is disabled) and a click still arrives, `runUpgrade` shows the first blocker's message instead of the stale message.
6. **Preview shape.** `previewCommand` deep-freezes its result. `costs` and `effects` are `null` for `missing` and `maxed`. For `in-journey`, `coins` and `dust` they are filled in for information, and `request` is `null`.
7. **Lookup input.** `readCommandReceipt` accepts the whole request object and ignores extra keys. A malformed lookup returns `unavailable` instead of throwing.
8. **Test matrix N7, pending battle.** §7 step 8 checks blockers before the fingerprint. So a copy that entered a pending battle after the preview gives `rejected/blocked` with the in-journey message, not `stale`. It still writes nothing, and the test pins that.
9. **Test matrix B2, "stale toast".** Under §4, a page that previewed the same copy at the same level as another tab's accepted upgrade gets `duplicate` (這次修練早已入帳…), and that is what the smoke asserts for that case. The 卡牌剛有變動 toast is asserted for a record change in another tab (a lock toggle gives `stale`). Another copy committed in the same slot (`identity-conflict`) was asserted with it too until §18.6; it now gets its own copy, which names that cause.
10. **Smoke details.** `tools/command-smoke.mjs` refuses to run without `GAME_URL`; the older smokes default to 4177. It writes no screenshots.
11. **Test-only helper.** `tests/support/profile-envelope.mjs` builds a valid profile exactly N bytes under the 4 MiB envelope. Its accounting matches the store's to the byte. N11 and N16 use it.

### 18.3 Checks (Node 26.0.0 on macOS; headless; synthetic data only)

- **First verification command**, `node --test tests/command-ledger.test.mjs tests/local-commands.test.mjs tests/profile-store.test.mjs tests/cloud-save.test.mjs tests/account-client.test.mjs tests/hosting.test.mjs && node --test tests/*.test.mjs`: exit 0. The six files gave 92/92, and the full suite 485/485 (456 at `8afbabc`, plus 29).
- **Each code commit alone:** the trees of `762412b` and `d2111ab` were exported and gave 466/466 and 485/485.
- **Python:** `python3 -m unittest discover -s tests -p '*_test.py'`: 9 tests OK.
- **`git diff --check 8afbabc..HEAD`:** clean.
- **Browser server.** The worktree's server on 4193 was started before this change, and `tools/serve.py` reads the allowlist once at startup. It returned 404 for `local-commands.mjs`, so the game could not load from it, and it was left running untouched. Browser checks used a separate `python3 tools/serve.py --port 4197` serving this worktree.
- `GAME_URL=http://127.0.0.1:4197 npm run test:commands`: 7/7 groups in Chromium (system Google Chrome 154.0.8037.98) and 7/7 in WebKit 26.6, exit 0.
- `GAME_URL=… npm run test:browser`: all 14 Chromium suites, exit 0. These include backpack, classics, account (with its `tools/account-smoke.mjs:270` restore `deepEqual`), profile recovery and inheritance.
- `GAME_URL=… npm run test:battle-table`: 40/40 in each engine, exit 0.
- `GAME_URL=… npm run test:inheritance` and `npm run test:wx01` (which includes profile recovery): both engines, exit 0.
- **Negative control** (a scratch Playwright probe, not committed). Base `8afbabc` was served from a scratch copy on port 4198. In Chromium, a card page still showing "修練至 Lv.2 · 120 金幣", after another page upgraded the copy, charged 240 more and reached Lv.3: 360 in total. On this branch the same steps charged 120 and stopped at Lv.2. This reproduces §1's hazard in one browser.

**Not checked:**

- Physical devices, the Safari app and Firefox.
- Two separate browser processes. The smokes use pages in one browser context, which share the origin's storage and lock manager.
- A real `QuotaExceededError`; every quota case is synthetic.
- `npm run build`, deploy dry runs and any hosted service. The Worker and SQL are unchanged by design.
- `test:viewport`, `test:expansion`, `test:collection-display`, `test:map-piece`, `test:atelier`, `test:liaozhai`, `test:honglou` and `test:connections`.
- The §15 owner decisions remain open.

### 18.4 Fixes after the first review (2026-10-11)

A review of `b6410e9` reported three defects, and a second reviewer reproduced each one independently. All three are fixed; none was skipped. The text above now includes the fixes, so this section records what changed and the evidence.

1. **Medium: a command could decide on bytes from before another tab's write** (`7a7d03e`, §10.1).
   - **Cause.** `commitLocked` and `lookupLocked` assumed the next holder of the Web Lock sees the previous holder's `localStorage` write. Between renderer processes it does not.
   - **Effect, as reported.** Two tabs both showed 此卡修練完成 for the same quote (two writes, no duplicate), or for sibling copies in one slot. In the second case one upgrade and its receipt were silently overwritten, while that tab had already repainted the card at the new level. A lookup could answer `not-committed` from old bytes. No double charge was seen: the overwrite reverted the cost and the effect together.
   - **Fix.** The IndexedDB fence in §10.1. Commands and lookups hold it strictly, so they refuse as `rejected/unsynced` (lookup: `unavailable`) rather than decide on unproven bytes. `transact`, restore and the playtest supply page hold it leniently (restore holds it strictly since §18.7). In the Node model (N22) that also closes the older lost update between two plain `transact` writes, which predates Q1; no browser check targets that case.
2. **Low: a restore near the 4 MiB limit replaced the recovery copy and then refused** (`19aa648`, §11).
   - **Cause.** `restoreLocalProfile` wrote `RECOVERY_KEY` before building the profile with the retired ledger and saving it. A backup within about 77–93 B of the limit then failed the envelope check, with a message that blamed the backup, after the previous recovery copy was gone. The banner then offered a recovery copy for a restore that never happened.
   - **Fix.** `store.replace` checks the profile to save first, names the ledger in its refusal, writes the recovery copy only after that, and puts the previous copy back if the profile write fails. §18.6 item 1 narrows that put-back to a write that is confirmed not to have landed.
   - **Not changed, on purpose.** Such a backup still does not restore onto a journey that has a ledger. Making room would mean leaving the ledger out of the envelope, but the full-profile fingerprints used by restore confirmation are bounded by the same 4 MiB, or raising the backup limit, which is a hosted change. Review found that only a hand-made backup gets this close: the largest save the game can produce measured 3.59 MB.
3. **Low: a duplicate did not show the accepted receipt** (`6f58d83`, §9).
   - **Cause.** `runUpgrade` showed only 這次修練早已入帳，未有再次扣除資源。 and never read `result.receipt`, although §9 asked for the receipt's real before and after.
   - **Fix.** The toast and the live announcement now add 已入帳的修練：Lv.1 → Lv.2 · 120 金幣 · 6 靈砂。, taken from the stored receipt, not the stale quote.

**Behaviour that changed beyond the three fixes:**

- New reason `rejected/unsynced`, with its own copy (§9).
- Every write under `PROFILE_LOCK`, including the startup save, now also does one IndexedDB read and two IndexedDB writes. It waits up to 0.5 s when this tab is behind, and longer only if IndexedDB stalls (1.5 s per operation). Measurements are in §18.5.
- A new IndexedDB database, `shanhai.profile.fence`, holds one digest record per origin. It is never exported or backed up.
- An edit made outside the lock (for example in devtools) now makes the next upgrade in a tab that has received it refuse until a lenient write, such as a reload, records the fence again. Smoke B8 pins this in one tab. A tab that has not yet received the edit can still overwrite it (§10.1, N27).

### 18.5 Checks for the review fixes (Node 26.0.0 on macOS; headless; synthetic data only)

Source commits `7a7d03e`, `19aa648` and `6f58d83`, on `b6410e9`. Browser runs used a separate `python3 tools/serve.py --port 4311` serving this worktree; the stale server on 4193 was left untouched.

- `node --test tests/*.test.mjs`: exit 0, **498/498** (485 at `b6410e9`, plus 11 fence tests, N24 and N25). Each commit's exact contents were tested in the worktree before it was committed: 496/496, 497/497 and 498/498. `tests/profile-fence.test.mjs` passed 15 consecutive runs.
- `python3 -m unittest discover -s tests -p '*_test.py'`: 9 tests OK. `git diff --check b6410e9..HEAD`: clean.
- `GAME_URL=http://127.0.0.1:4311 npm run test:commands`: exit 0, **10/10 groups in each engine** (system Google Chrome, Playwright WebKit). In B7 the fenced lock read the previous write in 30/30 handoffs in both engines, while the plain-lock control on the same run read stale bytes in 30/30 (Chromium) and 24/30 (WebKit).
- **Negative control.** A scratch copy with only `profileLock` switched back to the plain Web Lock failed the new B4 group in Chromium: in its first same-copy round both pages showed 此卡修練完成 and the profile was written twice.
- **The reviewers' own UI repros**, `b4-diff.mjs` and `b4-loop-big.mjs` with 300 extra copies and 10 rounds in Chromium: 0/10 violations each (reported 5/10 each before). A scratch handoff probe: plain lock 57/60 stale at 50 KB in Chromium and 14/40 at 5 KB in WebKit; fenced 0/60 and 0/40, with no refusals.
- `npm run test:browser`, all 14 Chromium suites: exit 0 in 4 min 53 s. The same command against an export of `b6410e9`: exit 0 in 4 min 55 s.
- `test:inheritance`, `test:wx01`, `test:battle-table` and `test:collection-display`: exit 0 in both engines. `test:viewport`: Chromium passed; the first WebKit run stopped with no error text while the machine's disk was full (306 MiB free), and a WebKit-only re-run after freeing this run's own test output exited 0.
- `test:expansion`: Chromium passed. WebKit fails at 360×740 rewards/grants because one module tab is 43.08 px wide, under the 44 px minimum. An export of `b6410e9` fails identically, so this predates the fixes.
- `test:map-piece`: Chromium passed. WebKit did not launch: that smoke always uses `test-results/webkit-runtime`, which this worktree does not have.
- **Startup.** In-page time to the first lobby paint, as a median of 10 loads in Chromium and 6 in WebKit, `b6410e9` → fixes: Chromium first load 89 → 92 ms and reload 56 → 67 ms; WebKit 95 → 102 ms and 78 → 78 ms.

**Not checked:** separate browser windows or processes; the Safari app, Firefox and physical devices; Node 22; `npm run build` and deploy dry runs; a browser without IndexedDB or one whose IndexedDB refuses writes (both only with Node fakes); a real `QuotaExceededError`; any hosted service.

### 18.6 Fixes after the second review (2026-10-11)

A second review of `37dad64` reported three low-severity defects, and a second reviewer reproduced each one independently. All three are fixed; none was skipped. The text above now includes the fixes.

1. **A restore whose profile write landed and then threw lost the replaced journey** (`dac1e0a`, §11).
   - **Cause.** `store.replace` put the previous recovery copy back after any throw from the profile write, as if nothing had landed. §7 step 11 and N12 treat a write that lands and then throws as real. In that case the restored journey was saved, and the replaced journey, with its command receipts, had no copy anywhere: not in `RECOVERY_KEY`, and not in an export, which reads storage. This regressed in `19aa648`; at `8afbabc` the copy was written first and never rolled back.
   - **Fix.** After a throw, `replace` reads the profile again under the same lock. It puts the previous copy back only while the replaced bytes are still stored. When the restored bytes are stored, the restore landed: `replace` returns normally and the tab syncs to it. Anything else, including a re-read that throws, keeps the new recovery copy and reports the error.
   - **Not changed.** When the outcome is unknown, `restoreLocalProfile` still rejects and the tab keeps painting the old journey until its next load, as at `8afbabc`; the recovery banner then offers the replaced journey. No mainstream browser is known to land a `localStorage` write and then throw.
2. **§10.1 overstated what the fence does for a writer that bypasses it** (documentation; §10.1, §11, §15, §18.4, HANDOVER).
   - **Cause.** The text said such a writer "does not let a strict holder decide on old bytes". The fence knows only writes recorded through it. A strict holder whose tab has not yet received a bypassing write still sees bytes that match the old record, so it commits on them and overwrites that write. It refuses only once the bytes have arrived (smoke B8).
   - **Fix.** The contract and HANDOVER now state that limit, and §11 and §15 add the release rule: never serve a v5 build from before the fence on an origin that has served Q1. N27 pins both halves in the Node model. No code changed: a writer that records nothing cannot be detected before its bytes arrive.
   - **Exposure.** No public build uses the v5 key (public v0.5.1 uses `shanhai.profile.v3`). The other route is a devtools edit in one tab followed by a commit in another within the delivery lag.
3. **An identity conflict caused by another card said this card had changed** (`a8db57c`, §9).
   - **Cause.** Every `identity-conflict` reused 卡牌剛有變動，未有扣除資源；請查看更新後的修練預覽。 When another tab upgraded a different copy in the same slot, this card was unchanged, its repainted page looked identical, and the player had to press again.
   - **Fix.** The refusal names its cause. When the slot's receipt is for another copy, `commitLocked` previews this copy again, which is pure and runs inside the same lock. If that preview still matches the request, the copy is 另一個分頁剛為另一張卡完成修練；這張卡未有變動，未有扣除資源，請再按一次修練升級。 If this copy changed too or is now blocked, it is 另一個分頁剛為另一張卡完成修練，未有扣除資源；請查看更新後的修練預覽。 A receipt for this same copy at another level keeps 卡牌剛有變動. The reason stays `identity-conflict`, nothing is written, and there is still no automatic retry, so the extra press remains by design (§9).

**Checks** (Node 26.0.0 on macOS; headless; synthetic data only). The worktree's server on 4193 still returned 404 for the three Q1 modules, so it was left untouched; browser runs used a separate `python3 tools/serve.py --port 4341`, stopped afterwards.

- `node --test tests/*.test.mjs`: exit 0, **501/501** (498 plus the N24 land-then-throw test, N26 and N27). The exported trees of `dac1e0a` and `a8db57c` gave 499/499 and 500/500.
- **Negative controls.** The new N24 test fails against `37dad64`'s `profile-store.mjs`, and N26 fails against its `local-commands.mjs`.
- **The reviewers' scratch repros, rerun:**
  - The restore repro now stops at "Missing expected exception", because a write that landed is reported as a restore. Its scenario, with assertions for the fixed contract, passes 2/2: the profile holds the restored journey and the recovery copy holds the replaced one.
  - The identity probe now gets 另一個分頁剛為另一張卡完成修練；這張卡未有變動…, the copy's record and repainted costs are unchanged, and the next press commits.
  - The bypass repro still commits on older bytes (99880 coins, not 104880). That is the documented limit, which N27 now pins.
- `python3 -m unittest discover -s tests -p '*_test.py'`: 9 tests OK. `git diff --check`: clean.
- `GAME_URL=http://127.0.0.1:4341 npm run test:commands`: exit 0, **10/10 groups in each engine** (system Google Chrome, Playwright WebKit). B2 and B4 assert the new `other-card` copy. In B7 the fenced lock read the previous write in 30/30 handoffs in both engines; the plain-lock control was stale in 29/30 (Chromium) and 18/30 (WebKit).
- `tools/account-smoke.mjs` (including the restore `deepEqual`), `tools/profile-recovery-smoke.mjs` and `tools/backpack-smoke.mjs` in Chromium, against 4341: exit 0 each. Their 13 screenshots were deleted afterwards.

**Not checked:** the other 11 `test:browser` suites and the other per-engine smokes, because the disk had about 300 MiB free and filled completely once during this work; a real browser whose `setItem` lands and then throws (none is known to); separate browser processes; the Safari app, Firefox and devices; `npm run build`, deploy dry runs and any hosted service.

### 18.7 Fixes after the third review (2026-10-11)

A third review of `14d0473` reported four low-severity defects, and a second reviewer reproduced each one independently, finding each narrower than first reported. All four are fixed; none was skipped. The text above now includes the fixes.

1. **A restore in a tab that was behind worked from stale bytes** (`323d27c`, §11, §12).
   - **Cause.** `restoreLocalProfile` took the lenient fenced lock. A tab that had not received another tab's commit within 0.5 s restored from its own view. `retireCommandLedger` used the old `nextSeq`, so a quote minted after the unseen commit stayed valid and committed in the restored journey. The `RECOVERY_KEY` copy came from the same view, so the unseen commit, which its tab had shown as 此卡修練完成, existed nowhere. §11 ("every ID from before the restore becomes `expired`") and §12 (a command committed between confirmation and restore blocks it) stated both without that condition.
   - **Exposure.** It needs a delivery lag over 0.5 s; review measured catch-up under 50 ms. Only a tab exactly one commit behind lets a quote through (two or more make it `stale`), and that quote equals a fresh preview after the restore, so nothing was applied twice or charged wrongly. Losing the unseen commit is the general lenient limit that any lenient write in such a tab shares (N23). Restore is the writer whose guarantees were stated without conditions.
   - **Fix.** Restore takes `profileLock()`, the strict fenced lock, like commands. Such a tab now waits up to 2 s and otherwise refuses with nothing written. Once the commit arrives, the old confirmation is refused, and a fresh one expires every earlier ID.
   - **Cost, accepted over documenting the caveat.** A restore now also refuses while the fence says `writing` (a reload heals it), on a full disk that refuses the fence write, and in a browser without usable IndexedDB. Before, it needed only Web Locks. Restore is rare and confirmed first, and a refusal changes nothing.
2. **A full disk or another IndexedDB failure told the player to change browsers** (`5fdf5c5`, `334bc75`, §9, §10.1).
   - **Cause.** `createFencedLock` raised `unavailable` for any fence read or writing mark that failed or stalled, and `commitCommand` showed every `unavailable` the `no-lock` copy, 請用支援安全儲存的新版瀏覽器修練；未有扣除資源。 A `QuotaExceededError` or a stall therefore advised a browser that does not hold the player's local journey. N23 pinned the stall to that copy.
   - **Fix.** The fence names the cause: `missing` (no IndexedDB, or a `SecurityError` from it), `quota` (`QuotaExceededError`, `NS_ERROR_DOM_QUOTA_REACHED`) or `unavailable` (anything else, a stall included). A commit shows the `no-lock`, `quota` or `unsynced` copy for them; the reason stays `rejected/unsynced`. `FENCE_MESSAGES` gains `missing` and `quota` texts for lookups and restores, and its `unavailable` text now asks for a retry, 暫時未能確認各分頁的最新旅程；未有更改旅程，請稍後再試或重新整理頁面。, because it no longer covers a missing IndexedDB.
   - **Judgement.** A `SecurityError` from IndexedDB counts as `missing`, because a retry does not clear it. No browser that blocks storage by its settings was checked.
   - **Not changed.** On a full disk, once a lenient write has changed the profile, a strict commit waits 2 s and refuses with the `unsynced` copy, because it never attempts a fence write of its own (§10.1 Limits).
3. **The fence matched on content only, so X → Y → X could hand a strict commit the older Y** (`c008010`, §10.1).
   - **Cause.** A strict holder counted as verified once its tab's digest equalled the recorded one. It then awaited the writing mark and ran its callback without looking again. When another tab's writes returned the profile to the same bytes (a card lock toggled on and off, or a deck switched and back), a lagging tab matched the first X at once. The older Y could then land during the mark, and the commit decided on Y and overwrote the newer X. The comment "these bytes include every write a previous holder recorded" claimed more than the check proves.
   - **Exposure.** Only self-cancelling writes that are not commands can be lost: lock toggles on other cards, the active deck, the leader. A commit cannot be Y, and the fingerprint rejects a Y that touched the target. Both cancelling writes must still be in flight, and only the first may land during the mark.
   - **Fix.** After the mark, a holder that verified a digest compares it with the bytes its synchronous callback will read. A strict holder puts the settled record back and refuses as `unsynced`; the commit succeeds once every write has arrived. A lenient writer waits again for its budget. If it still cannot match, it proceeds unverified, so a callback that throws without writing puts the record back instead of recording the older bytes.
   - **Beyond the report.** The finding covered strict holders. The lenient re-wait closes the same race for `transact` writes.
4. **§9's `stale` row said "Same as above"** (documentation, §9). Since `14d0473` the `identity-conflict` row above it lists three messages, so the row implied that a stale refusal may name another tab's card. It never does: the row now spells out 卡牌剛有變動，未有扣除資源；請查看更新後的修練預覽。 and its next step.

**Behaviour that changed beyond the four fixes:**

- The fence's `unavailable` text is reworded, and `missing` and `quota` texts are new. Lookups and restores show them.
- A restore can now refuse with any fence message (§10.1).
- A holder whose bytes change during its writing mark refuses (strict) or waits up to 0.5 s more (lenient).

**Checks** (Node 26.0.0 on macOS; headless; synthetic data only). The worktree's server on 4193 still returned 404 for `local-commands.mjs`, `profile-fence.mjs` and `command-ledger.mjs`, so it was left untouched; browser runs used a separate `python3 tools/serve.py --port 4361`, stopped afterwards.

- `node --test tests/*.test.mjs`: exit 0, **507/507** (501 plus N28, N29 and N30, two tests each). Each code commit's tree was tested before it was committed: 503/503, 505/505 and 507/507. `tests/profile-fence.test.mjs` passed 15 consecutive runs.
- **Negative controls.**
  - The new `tests/profile-fence.test.mjs` against `14d0473`'s modules: 7 of 18 fail (the two updated N23 tests, N28, N29 and the N30 wiring test). The N30 model test passes there, because it hands each lock to the model explicitly, so the wiring test carries that fix.
  - The new account-smoke check against a server of `c008010`'s tree (lenient restore) timed out waiting for the refusal.
  - B9 against `14d0473` timed out waiting for the quota copy.
- **The reviewers' scratch repros, rerun.** Both X → Y → X repros now get `rejected/unsynced`, with the unlock (or the re-lock) kept. The quota repros now get the quota copy. The restore repros still pass as written, because they hand the lenient lock to the model; N30's wiring test covers `app.mjs`.
- `python3 -m unittest discover -s tests -p '*_test.py'`: 9 tests OK. `git diff --check 14d0473..HEAD`: clean.
- `GAME_URL=http://127.0.0.1:4361 node tools/command-smoke.mjs` and the same with `BROWSER=webkit` (the two halves of `test:commands`): exit 0, **11/11 groups in each engine**, B9 included. In B7 the fenced lock read the previous write in 30/30 handoffs in both engines; the plain-lock control was stale in 16/30 (Chromium) and 30/30 (WebKit).
- `npm run test:browser` (14 Chromium suites, including the account smoke with its new restore check): exit 0 in 292 s.
- `test:wx01` and `test:inheritance`: exit 0 in both engines.

**Not checked:** a real full disk (every quota case is synthetic); a browser that blocks IndexedDB by its settings; a real delivery lag over 0.5 s; separate browser processes; the Safari app, Firefox and devices; the account smoke in WebKit (it runs only in Chromium); `test:battle-table`, `test:viewport`, `test:expansion`, `test:collection-display`, `test:map-piece`, `test:atelier`, `test:liaozhai` and `test:honglou`; `npm run build`, deploy dry runs and any hosted service.

### 18.8 Final check (2026-10-11)

Run at `0492242`, whose code equals the last source commit `334bc75`; no code changed after it. Node 26.0.0 on macOS; headless; synthetic data only. [VALIDATION](VALIDATION.md#q1-final-check--2026-10-11) has the same receipt.

- `node --test tests/*.test.mjs`: exit 0, **507/507**. `python3 -m unittest discover -s tests -p '*_test.py'`: 9 tests OK. `git diff --check 8afbabc..HEAD`: clean.
- The worktree's server on 4193 still returned 404 for the three Q1 modules and was left untouched; browser runs used a separate `python3 tools/serve.py --port 4381`, stopped afterwards.
- `GAME_URL=http://127.0.0.1:4381 npm run test:browser`: exit 0, all 14 Chromium suites (system Google Chrome 154.0.8037.98) in 291 s.
- `GAME_URL=http://127.0.0.1:4381 npm run test:commands`: exit 0, **11/11 groups in each engine** (Chromium, then Playwright WebKit 26.6). In B7 the fenced lock read the previous write in 30/30 handoffs in both engines; the plain-lock control was stale in 29/30 (Chromium) and 27/30 (WebKit).

**Not checked in this run:** the other per-engine smokes (`test:inheritance` and `test:wx01` last ran in §18.7), separate browser processes, the Safari app, Firefox, devices, a real full disk or delivery lag, Node 22, `npm run build`, deploy dry runs and any hosted service. The §15 owner decisions remain open, and owner review of this contract is requested before any Q2/Q3 consumer is written.

### 18.9 Fixes after the final review (2026-10-11)

A final review of `7d32825` reported three low-severity findings; two describe the same defect, and second reviewers reproduced each independently. All are fixed; none was skipped. The text above now includes the fixes.

1. **A refused local recovery restore could not be retried from its dialog, and the retry said the backup had changed** (`345f92f`, §11).
   - **Cause.** The `confirm-restore-recovery` handler in `app.mjs` cleared `recoveryDraft` before `restoreLocalProfile` ran, and its `.catch` only showed the error, leaving the dialog open. The pattern predates Q1 (it is the same at `8afbabc`), but since `323d27c` restore holds the strict fence, so a refusal can be transient: the `unavailable` text asks for a retry, and `unsynced` clears when the other tab's write arrives. Pressing 復原本機旅程 again then found no draft and showed 回復備份已更新，請重新查看。, although the recovery copy was byte-identical and nothing had been written. Closing and reopening the dialog worked.
   - **Fix.** The draft stays until a restore succeeds, and is marked while one is in flight, so a second press is ignored instead of misreported. A retry runs the `savedAt` and fingerprint checks again: a changed recovery copy still gets 回復備份已更新, and a journey that changed meanwhile still gets 本機旅程剛有更新. Other refusals (a pending battle, a WX receipt) repeat their own reason. Cloud restore was not affected and is unchanged.
2. **The contract limited the `quota` copy to a refused fence write** (documentation, §7 step 12, §10.1 Limits). `createFencedLock` maps a failed fence read through the same `fenceFailure`, so a `QuotaExceededError` on the read also gives `quota` and the quota copy, as §9, the §10.1 code list and N29 already said. Both places now say read or write. The §2 table also omitted `getXPThreshold` from the `collection` imports of `local-commands.mjs`.

**Checks** (Node 26.0.0 on macOS; headless; synthetic data only). The worktree's server on 4193 had been restarted after the Q1 modules existed: it returned 200 for `local-commands.mjs` and its working directory was this worktree, so it served the browser runs. The negative controls used a separate `python3 tools/serve.py --port 4397` serving an export of `7d32825`'s tree, stopped and deleted afterwards.

- `node --test tests/*.test.mjs`: exit 0, **507/507**. `python3 -m unittest discover -s tests -p '*_test.py'`: 9 tests OK. `git diff --check`: clean.
- `GAME_URL=http://127.0.0.1:4193 npm run test:commands`: exit 0, **12/12 groups in each engine** (Chromium, then Playwright WebKit), including the new B10. In B7 the fenced lock read the previous write in 30/30 handoffs in both engines; the plain-lock control was stale in 29/30 (Chromium) and 21/30 (WebKit).
- `GAME_URL=http://127.0.0.1:4193 npm run test:browser`: exit 0, all 14 Chromium suites (system Google Chrome 154.0.8037.98) in 294 s, including the account smoke's second press on an unsettled fence.
- **Negative controls** against `7d32825`: B10 timed out at the retry, waiting for the `unsynced` refusal, in Chromium and in WebKit; the account smoke timed out waiting for the second press's unsettled reason.
- The screenshots these runs wrote to the ignored `test-results/` were deleted afterwards.

**Not checked:** `test:inheritance` and `test:wx01` (last run in both engines in §18.7), the other per-engine smokes, the account smoke in WebKit, separate browser processes, the Safari app, Firefox, devices, a real full disk or delivery lag, Node 22, `npm run build`, deploy dry runs and any hosted service. The §15 owner decisions remain open.

### 18.10 Fixes after the pre-merge review (2026-10-11)

A pre-merge review of `1ab3a19` reported six low-severity findings; two describe the same stale header. Second reviewers reproduced each one and found one narrower than reported. Four are fixed on this branch. The fifth is merge bookkeeping that needs `origin/main`, so HANDOVER records it as merge notes instead (item 5). The text above now includes the fixes.

1. **A `writing` fence record let lenient writers skip the catch-up wait** (`9390070`, §10.1).
   - **Cause.** In `createFencedLock`, a lenient holder that read an unsettled or malformed record went straight on, with no wait. A strict commit or restore whose profile write landed and whose settle then failed (an aborted IndexedDB transaction, a disk that filled between the two fence writes, a stall, a closed tab) left the record `writing`. In a second tab still behind, the next lenient writer (a lock toggle, a claim, the end of a battle) saved its older bytes and recorded them as settled. The upgrade, its spend and its receipt disappeared while the committing tab showed 此卡修練完成, and nothing refused afterwards. §10.1 said lenient holders wait up to 0.5 s; for this record they waited 0 s.
   - **Exposure.** It needs a failure of exactly the settle write after a successful writing mark, and a lenient write already queued in a tab that is behind. The reviewers lost the commit in Chromium only with large saves: in 3/3 rounds at 712–725 KB, in some rounds at about 360 KB, and never at 94–185 KB or in WebKit. The upgrade, its spend and its receipt revert together, so nothing is charged twice. The restore variant, where the restored journey exists nowhere, was shown only in the Node model.
   - **Fix.** A lenient holder facing a `writing` or malformed record waits its whole budget (0.5 s) before it reads and writes. A retry of the failed settle was not added: it would not cover a closed tab, and on a stall it would hold the lock 1.5 s longer.
   - **Still a limit.** A healing tab still behind after 0.5 s discards the write the record did not settle, as any lenient writer that has not caught up does. §10.1 Limits now says so.
2. **Smoke B10 passed without the in-flight guard** (`9390070`, smoke B10). Without `if(draft?.restoring)return;` in `app.mjs`, a second press queued a second restore, which the fingerprint check refused after the first one succeeded, with the false 本機旅程剛有更新，請重新查看後再恢復。 One restore and one write happened either way, so B10 passed. B10 now waits until the lock is idle and asserts that the only toast after the double press is 已復原上次本機旅程。
3. **The status header still named `334bc75` and §18.8** (documentation, reported twice). It now names §18.9, §18.10 and the last source commit, as HANDOVER and ROADMAP do.
4. **No release check named `test:commands`** (documentation, §11, §15, HANDOVER). This was narrower than reported. In Chromium, `test:browser` already clicks the card page's upgrade (the backpack and classics smokes) and checks a restore on an unsettled fence (account smoke A1). It misses B2–B10's edge cases and all WebKit checks of the command path. §11 and §15 now require `npm run test:commands` in both engines for a release that includes Q1. The release plan, `docs/RELEASE-NEXT.md`, exists only on `origin/main`, so adding the suite to its §10 step 3 is a merge note. The smokes also import modules in the page by their path at the site root, which a move to `dist/r/<hash>/` would break. Main's own smokes do the same, so that belongs to the plan's A2, not to Q1.
5. **Merging onto `origin/main` conflicts in VALIDATION and leaves the docs index without this contract** (merge bookkeeping, not changed on this branch). `origin/main` is now `daf18ed`. A trial merge conflicts only in `docs/VALIDATION.md`. `docs/README.md`, the index that main's `AGENTS.md` requires every new document to join, exists only on main. Fixing either here means merging `origin/main` into this branch. That would bring PRs #6–#8 into a branch whose reviews and checks were all made from `8afbabc`, and how to merge is the merger's decision. [HANDOVER](HANDOVER.md#q1-local-commands-checkpoint--2026-10-11-local-only) gives the resolution and the index rows.

**Checks** (Node 26.0.0 on macOS; headless; synthetic data only). The worktree's server on 4193 was running from this worktree and returned 200 for the three Q1 modules, so it served the runs without a restart. The B10 negative control used a separate `python3 tools/serve.py --port 4421` serving a copy of the allowlisted files without the guard, stopped and deleted afterwards.

- `node --test tests/*.test.mjs`: exit 0, **508/508** (507 plus N31). `tests/profile-fence.test.mjs` passed 10 consecutive runs. `python3 -m unittest discover -s tests -p '*_test.py'`: 9 tests OK. `git diff --check`: clean.
- **Negative controls.** N31 against `1ab3a19`'s `profile-fence.mjs`: the commit case fails (Lv.1, no ledger, no coins spent), and so does the restore case (coins 100000, not the restored 777). B10 against the guard-less copy fails in Chromium and in WebKit, with the toasts 已復原上次本機旅程。 and 本機旅程剛有更新，請重新查看後再恢復。
- **The reviewers' repros, rerun.** With the fault, their Node probes now keep the commit (Lv.2, one receipt) and the restored journey. Their Chromium repro at 712 KB (an aborted settle, then a lock toggle queued in a page behind) kept Lv.2, one receipt and 120 coins spent in 3/3 rounds; the reviewers had lost it in 3/3. The control without the fault kept it in 3/3.
- `GAME_URL=http://127.0.0.1:4193 npm run test:commands`: exit 0, **12/12 groups in each engine** (system Google Chrome, then Playwright WebKit). In B7 the fenced lock read the previous write in 30/30 handoffs in both engines; the plain-lock control was stale in 30/30 (Chromium) and 11/30 (WebKit).
- `GAME_URL=http://127.0.0.1:4193 npm run test:browser`: exit 0, all 14 Chromium suites in 294 s, including the account smoke's reload over an unsettled fence.
- `npm run test:inheritance` and `npm run test:wx01`: exit 0 in both engines.
- `git merge-tree --write-tree --name-only origin/main HEAD` at `9390070`, with `origin/main` at `daf18ed`: the only conflict is in `docs/VALIDATION.md`.
- The screenshots and JSON these runs wrote to the ignored `test-results/` were deleted afterwards.

**Not checked:** `test:battle-table`, `test:viewport`, `test:expansion`, `test:collection-display`, `test:map-piece` and the literary preview suites; the account smoke in WebKit; a real failed settle (every one here is injected); separate browser processes; the Safari app, Firefox and devices; a real full disk or delivery lag; Node 22; `npm run build`, deploy dry runs and any hosted service; the merge itself. The §15 owner decisions remain open.

### 18.11 Fixes after the second pre-merge review (2026-10-11)

A second pre-merge review of `231ae4f` reported four low-severity findings; two describe the same full-disk state. Second reviewers reproduced each one. Each finding is fixed; the one code change proposed for the wait was skipped, for the reason given in item 1. The text above now includes the fixes. Item 1's account of when the full-disk wait began was wrong and was corrected after the third pre-merge review (§18.12 item 1).

1. **A `writing` fence record on a full disk never healed, and strict refusals asked for a reload that could not help** (`1afaf6b`, §10.1, §11; reported twice).
   - **Cause.** Since `9390070`, a lenient holder on a `writing` or malformed record waits its whole 0.5 s and then marks and settles. When IndexedDB refuses those writes, as when the disk filled between a holder's two fence writes, nothing is recorded and the record stays `writing`. Every page load (the lobby at 837–872 ms, against 95–149 ms) and every lenient write then waited 0.5 s. Strict holders refused with `unsettled`, and its copy, 上次儲存未能完整確認；未有更改旅程，重新整理頁面後再試。, sent the player to a reload that could not heal the record; the card page showed the generic `unsynced` copy. Neither named space. §10.1 said the page load waits "once", and §11 said a reload heals the record.
   - **Exposure.** A settle must fail because the disk filled between the two fence writes, and the disk must stay full. No data is lost or charged twice.
   - **Fix (copy).** A strict holder on a `writing` or malformed record writes the `writing` mark again before it refuses. That changes nothing for any holder, because every holder already treats the two records alike. When IndexedDB refuses that write, the refusal names the cause, so on a full disk the card page and a restore show the `quota` texts. `unsettled`, with its reload text, now means that IndexedDB accepted the write, so the next load's startup save can heal the record.
   - **Not changed: the wait (skipped, with reason; its history corrected after the third pre-merge review).** One report proposed skipping the lenient wait once a holder had failed to mark the same record. On a `writing` or malformed record that wait is new with `9390070`: since then every lenient write there, each page load included, waits 0.5 s until IndexedDB accepts writes again. Before `9390070` such a write waited 0 s, which is the N31 loss. A settled record whose digest is out of date is a different state, and there the wait is older: on a full disk, lenient writes from a current settled record waited 0, 535, 536 and 534 ms both at `1ab3a19`, before `9390070`, and at `231ae4f`, so that state pays from the write after the first one that changes the profile. The wait was kept for safety. While nothing can be recorded, it is the only chance an unrecorded write has to reach a tab still behind. Skipping it would remove that chance for the `writing` record alone, which is riskier than the latency. §10.1 Limits now states the cost, and the "once" sentence holds only while IndexedDB accepts writes.
2. **Closing and reopening the local recovery dialog during a restore got past the in-flight guard** (`1afaf6b`, §11).
   - **Cause.** `restore-recovery` in `app.mjs` built a new `recoveryDraft` each time the dialog opened, and the guard `if(draft?.restoring)return;` reads a field of that draft. A player could close the dialog while the restore waited for the lock, open it again and press 復原本機旅程 on a fresh draft. That queued a second restore whose fingerprint predates the first. The first restore succeeded and closed the dialog, the second was refused, and 本機旅程剛有更新，請重新查看後再恢復。 replaced the success toast. §11 and §18.9 item 1 said such a press is ignored.
   - **Exposure.** One restore and one write either way. The restore must wait about 1 s or more for the lock, and the player must close and reopen the dialog in that time. A player who believed the false refusal and pressed again would restore the journey the first restore had replaced; the next recovery copy would then hold the restored one.
   - **Fix.** A dialog opened while a restore is in flight keeps that restore's draft, so a press in it is ignored. When the restore lands, it closes that dialog and shows the success toast. When the restore is refused, the reopened dialog stays open and retries with the same draft, as §18.9 item 1 describes. Smoke B11 pins both (`0e1ef85` adds the retry).
3. **Both links to the HANDOVER merge notes used a broken anchor** (documentation; §11 release checks, §18.10 item 5). The heading `Q1 local-commands checkpoint · 2026-10-11 (local only)` slugs to `#q1-local-commands-checkpoint--2026-10-11-local-only`, and both links now use it. The heading keeps "(local only)", like the Q0 checkpoint above it.

**Dated records left as written.** §18.7 item 1 and the VALIDATION entry for the third review say that a reload heals a `writing` record. That holds only while IndexedDB accepts writes.

**Checks** (Node 26.0.0 on macOS; headless; synthetic data only). The worktree's server on 4193 was running from this worktree and returned 200 for `local-commands.mjs`, so it served the runs without a restart. The negative controls used a separate `python3 tools/serve.py --port 4437` serving an export of `231ae4f`'s tree with one module swapped, stopped and deleted afterwards.

- `node --test tests/*.test.mjs`: exit 0, **509/509** (508 plus N32). `tests/profile-fence.test.mjs` passed 10 consecutive runs. `python3 -m unittest discover -s tests -p '*_test.py'`: 9 tests OK. `git diff --check`: clean.
- `GAME_URL=http://127.0.0.1:4193 npm run test:commands` at `0e1ef85`: exit 0, **13/13 groups in each engine** (system Google Chrome, then Playwright WebKit), B9's full-disk `writing` case and B11 included. In B7 the fenced lock read the previous write in 30/30 handoffs in both engines; the plain-lock control was stale in 30/30 (Chromium) and 24/30 (WebKit). The same suite also passed at `1afaf6b`, before B11's retry half.
- At `1afaf6b`: `GAME_URL=http://127.0.0.1:4193 npm run test:browser`: exit 0, all 14 Chromium suites in 292 s, including the account smoke's restore on a `writing` record, which IndexedDB accepts there, so it still gets 上次儲存未能完整確認 and heals on reload. `npm run test:inheritance` (53 s) and `npm run test:wx01` (206 s): exit 0 in both engines. `0e1ef85` changes only `tools/command-smoke.mjs`, which none of these run.
- **Negative controls.** N32 against `231ae4f`'s `profile-fence.mjs` fails at its first case: the strict holder refuses with `unsettled`, not `quota`. Against `231ae4f`'s `profile-fence.mjs`, B9 timed out at the new full-disk `writing` case, waiting for the quota copy, in Chromium and in WebKit. Against `231ae4f`'s `app.mjs`, B11 failed in both engines with the toasts 已復原上次本機旅程。 and 本機旅程剛有更新，請重新查看後再恢復。, the reported symptom.
- **Anchors.** Every local Markdown anchor in `docs/*.md`, `ROADMAP.md` and `README.md` (71 links) resolves under a github-slugger approximation (lowercase; drop everything except letters, marks, numbers, `_`, spaces and hyphens; spaces to hyphens). The same check flags the two old links.
- `git merge-tree --write-tree --name-only origin/main HEAD` at `0e1ef85`, with `origin/main` at `daf18ed` (not fetched again): the only conflict is still in `docs/VALIDATION.md`.
- The screenshots these runs wrote to the ignored `test-results/` were deleted afterwards.

**Not checked:** a real full disk (every quota case is synthetic); the lobby latency on a full disk, not measured again (the figures above are the reviewers'); `test:battle-table`, `test:viewport`, `test:expansion`, `test:collection-display`, `test:map-piece` and the literary preview suites; the account smoke in WebKit; separate browser processes; the Safari app, Firefox and devices; a real delivery lag; Node 22; `npm run build`, deploy dry runs and any hosted service; the merge itself. The §15 owner decisions remain open.

### 18.12 Fixes after the third pre-merge review (2026-10-11)

A third pre-merge review of `231ae4f..2bcc15e` reported two low-severity findings, both in how the documents state the full-disk wait. Second reviewers reproduced each one, against earlier commits' `profile-fence.mjs` with a virtual clock and in timed runs. No runtime code changed; `38fa64f` adds a test that pins the corrected statement. The text above now includes the fixes.

1. **§18.11 said the full-disk wait was not new per action** (documentation; §18.11 intro and item 1).
   - **Cause.** §18.11 said that the full-disk wait was not a new per-action cost, and that `9390070` "makes only the rarer `writing` case pay from the first write instead of the second". Before `9390070`, a lenient holder on a `writing` or malformed record did not wait at all. On a full disk its mark was refused and it wrote no record, so the record stayed `writing` and every later lenient write also waited 0 s. `9390070` made each of them wait 0.5 s, page loads included, until IndexedDB accepts writes again. The 0, 535, 536 and 534 ms figures describe a different state, a settled record whose digest is out of date. §10.1 and §18.10 item 1 already said that the `writing` case waited 0 s before.
   - **Exposure.** Documentation only, in the record the owner review reads: it presented a cost that `9390070` introduced as one that already existed. The other reason given for keeping the wait, that it is the only chance an unrecorded write has to reach a tab still behind, still holds.
   - **Fix.** §18.11's intro and item 1 now say that `9390070` added the 0.5 s wait to every lenient write while a `writing` record cannot heal, where before it waited 0 s (the N31 loss), that the out-of-date settled case already paid, and that the wait was kept for safety. The §10.1 Limits bullet says the same. The decision to keep the wait is unchanged.
2. **"Every lenient write waits on a full disk" was too broad** (documentation; §10.1 Limits, HANDOVER).
   - **Cause.** When IndexedDB starts refusing writes, the record is usually settled with a current digest. A lenient write then matches it at once and waits 0 s, and its refused mark leaves that record in place, so a write that leaves the bytes unchanged, such as a startup save that writes back the same text, also waits 0 s. Only after a lenient write has changed the profile is the digest out of date, and only from then on does each lenient write wait 0.5 s. §18.11's own figures began with 0 ms.
   - **Fix.** The Limits bullet now names the two states that wait, a `writing` or malformed record from the first write and a settled record from the write after the first one that changes the profile, and says what waits 0 s. HANDOVER's invariant says the same. A second N32 test (`38fa64f`) pins the settled pattern: two writes of the same text and the first change wait 0 s, each write after it waits its whole budget, a same-text save included, and once IndexedDB accepts writes the first heals the record and the next waits 0 s.

**Dated records left as written.** The VALIDATION entry for the second pre-merge review says that each lenient write still waits 0.5 s while IndexedDB refuses writes. That holds on a `writing` record, and on a settled record only once a lenient write has changed the profile.

**Checks** (Node 26.0.0 on macOS; headless; synthetic data only). The worktree's server on 4193 was running from this worktree and returned 200 for `local-commands.mjs`, so it served the runs without a restart.

- `node --test tests/*.test.mjs`: exit 0, **510/510** (509 plus the second N32 test). `tests/profile-fence.test.mjs` passed 10 consecutive runs. `python3 -m unittest discover -s tests -p '*_test.py'`: 9 tests OK. `git diff --check`: clean.
- **History, rerun.** A virtual-clock probe ran lenient writes against each of the four `profile-fence.mjs` versions, with every fence write refused as `QuotaExceededError`. On a `writing` or malformed record, four writes that each changed the bytes waited 0, 0, 0 and 0 ms at `1ab3a19`, and 500 ms each at `9390070`, `231ae4f` and `2bcc15e`. From a current settled record they waited 0, 512, 512 and 512 ms in all four versions, and two same-text writes, two changes and a same-text write waited 0, 0, 0, 512 and 512 ms.
- **Controls for the new test.** It passes against `1ab3a19`'s `profile-fence.mjs`, so the settled pattern predates `9390070`. It fails against a copy in which every lenient holder on a settled record waits its budget, the behaviour the old bullet described: six budgets instead of 0, 0, 0 and three budgets. The documentation fixes themselves have no test that a revert would fail.
- `GAME_URL=http://127.0.0.1:4193 npm run test:commands` at `38fa64f`: exit 0, **13/13 groups in each engine** (system Google Chrome, then Playwright WebKit). In B7 the fenced lock read the previous write in 30/30 handoffs in both engines; the plain-lock control was stale in 30/30 (Chromium) and 21/30 (WebKit).
- **Anchors.** Every local Markdown anchor in `docs/*.md`, `ROADMAP.md` and `README.md` (72 links, including the new link to this section and HANDOVER's link to the new VALIDATION entry) resolves under the github-slugger approximation in §18.11.
- The probe and the control copies lived in a scratch directory outside the worktree, deleted afterwards.

**Not checked:** a real full disk (every quota case is synthetic); the lobby latency on a full disk, not measured again (the figures above are the reviewers'); `test:browser`, `test:inheritance` and `test:wx01`, last run at `1afaf6b` (§18.11), whose runtime code is unchanged since; `test:battle-table`, `test:viewport`, `test:expansion`, `test:collection-display`, `test:map-piece` and the literary preview suites; the account smoke in WebKit; separate browser processes; the Safari app, Firefox and devices; a real delivery lag; Node 22; `npm run build`, deploy dry runs and any hosted service; the merge itself. The §15 owner decisions remain open.

## Appendix · test matrix

Where each row is implemented. The `N` rows are Node tests and the `B` rows browser smoke groups.

| ID | What it pins | Where |
| --- | --- | --- |
| N1 | Preview purity: no storage calls, input unchanged, deterministic ID and fingerprint; costs and effects equal the rule (120×L, 6×L, toXP = threshold(L+1)) | `tests/local-commands.test.mjs` |
| N2 | Blockers with the rule's text, and no request, for: unknown uid, vault copy, pending battle, Fire Mountain run, Lv.5, coins, dust; a malformed intent throws `RangeError` | `tests/local-commands.test.mjs` |
| N3 | Happy path: one `setItem(PROFILE_KEY)`; the save minus `commands` equals `upgradeInstance`; exact ledger and receipt | `tests/local-commands.test.mjs` |
| N4 | Every `getItem`/`setItem` happens inside the lock callback | `tests/local-commands.test.mjs` |
| N5 | A duplicate returns the original receipt with no write, also after another tab changes `battles` or maxes the copy | `tests/local-commands.test.mjs` |
| N6 | Same ID with another uid or `toLevel` gives `identity-conflict`, with the copy for its cause; a malformed request gives `invalid` without reading storage | `tests/local-commands.test.mjs` |
| N7 | Stale: XP, level, battles, lock, printing or inheritance on the target gives `stale`; pending battle, sale and a balance drop give `blocked` (§18.2 item 8); a future slot gives `stale`; a balance gain alone commits | `tests/local-commands.test.mjs` |
| N8 | Two tabs: the same preview spends once, and the second is `duplicate`; different copies in one slot give `identity-conflict`. Its origin is one coherent Map, so N22 repeats it with late delivery | `tests/local-commands.test.mjs` |
| N9 | No lock gives `no-lock`, with no storage access | `tests/local-commands.test.mjs` |
| N10 | A lock that fails before the callback gives `lock-failed`; one that fails after it gives `unknown` | `tests/local-commands.test.mjs` |
| N11 | Quota gives `quota` with bytes unchanged; then one commit and a duplicate; `SecurityError` and the 4 MiB envelope give `write-failed` | `tests/local-commands.test.mjs` |
| N12 | A write that landed and then threw is `committed`, confirmed by re-read; an unreadable re-read is `unknown` | `tests/local-commands.test.mjs` |
| N13 | Lookup gives `committed`, `not-committed` (free slot or another intent), `expired` or `unavailable`, and never writes | `tests/local-commands.test.mjs` |
| N14 | 40 commits keep 32 receipts (`retiredBelow` 9, `nextSeq` 41); `cmd-3` is expired for commit and lookup; a full ledger of 64-character strings is ≤ 16 KiB; an exhausted ledger refuses | `tests/command-ledger.test.mjs`, `tests/local-commands.test.mjs` |
| N15 | Validator matrix: each malformed ledger refuses in load and save with zero writes | `tests/command-ledger.test.mjs` |
| N16 | Ledger-free saves stay ledger-free; a ledger round-trips; v3/v4 sources carrying it are refused; v2 drops it; the 4 MiB check counts it | `tests/profile-store.test.mjs` |
| N17 | Every existing writer (29 cases) keeps the ledger, passes the guard and stays a valid local profile; the guard throws when the ledger is dropped or altered | `tests/local-commands.test.mjs` |
| N18 | Snapshots with and without a ledger are equal; snapshot versions 1, 2 and 3 reject `commands`; restore never yields it; retirement expires old requests | `tests/cloud-save.test.mjs`, `tests/local-commands.test.mjs`, `tests/command-ledger.test.mjs` |
| N19 | A ledger-only difference is not a local change; upload and restore work with a ledger; restore confirmation includes it, so a command after confirmation blocks the restore | `tests/account-client.test.mjs` |
| N20 | Both modules are allowlisted; every file reachable from `index.html` is public, and from `playtest.html` public or preview | `tests/hosting.test.mjs` |
| N21 | A quote painted before another tab's level-up is `stale`, never charged at the new level | `tests/local-commands.test.mjs` |
| N22 | Tabs that see each other's writes late: with a plain lock both commit, one upgrade is lost and a lookup says `not-committed` (control); with the fenced lock one commit and a `duplicate` or `identity-conflict`, the lookup finds the receipt, and lenient writers no longer drop each other's saves | `tests/profile-fence.test.mjs` |
| N23 | Fence failures: bytes not current within the budget, a `writing` or malformed record, no IndexedDB, a stalled or refused fence write all refuse a commit before it runs, with nothing written (no IndexedDB with the `no-lock` copy, a stall with the `unsynced` copy); a lenient write heals them, after waiting its whole budget for a `writing` or malformed record, and a tab still behind after that can discard the write the record did not settle (§10.1 Limits, N31); a failed settle keeps the real result; a lenient holder never records its old bytes; the IndexedDB adapter keys one record and fails closed | `tests/profile-fence.test.mjs` |
| N24 | Restore order: a backup that fits alone but not with the retired ledger is refused before the recovery copy or the profile changes; it restores on a ledger-free journey; a profile write that did not land puts the previous recovery copy back; one that landed and then threw counts as restored and keeps the new copy, and other bytes or an unreadable re-read keep it too | `tests/profile-store.test.mjs` |
| N25 | A duplicate's message names the stored receipt's levels and costs, not the stale quote | `tests/local-commands.test.mjs` |
| N26 | An identity conflict names its cause: another copy in the slot with this one unchanged (the repainted quote matches and the next press commits), with this one changed or no longer affordable, or this copy's slot taken at another level | `tests/local-commands.test.mjs` |
| N27 | A writer that bypasses the fence: refused once its bytes reach the strict holder's tab and kept after a lenient write; before they arrive, the strict holder commits on older bytes and overwrites it (the §10.1 limit) | `tests/profile-fence.test.mjs` |
| N28 | X → Y → X: when the older Y lands during the writing mark, a strict commit refuses as `unsynced`, puts the settled record back and keeps the newer write, then commits once every write has arrived; a lenient writer waits again and writes on the latest bytes | `tests/profile-fence.test.mjs` |
| N29 | A fence failure names its cause: no IndexedDB or a `SecurityError` gives `missing` and the `no-lock` copy, a quota error on the read or the writing mark gives `quota` and the quota copy, any other error `unavailable` and the `unsynced` copy, for commits and lookups alike, with nothing written; the real adapter on a full disk refuses with the quota copy while lenient writes still save, and commits once writes work again | `tests/profile-fence.test.mjs` |
| N30 | Restore in a tab that has not received another tab's commit: under the lenient lock (control) it retires the ledger from the old view, misses the commit in the recovery copy, and a later quote commits; under the strict lock it refuses with nothing written, then the stale confirmation is refused and a fresh one expires every earlier ID; `app.mjs` restores under `profileLock()` | `tests/profile-fence.test.mjs` |
| N31 | A failed settle after a commit or a restore, with a lenient write queued in a tab 15 ms behind: with no wait (a zero-budget control) the heal writes the older bytes over the commit, or over the restored journey, which then exists nowhere; with the whole 0.5 s budget the commit or restore and the lenient write both hold, and the record is settled | `tests/profile-fence.test.mjs` |
| N32 | A `writing` record while IndexedDB refuses fence writes: a commit, a lookup and a restore refuse with the cause's code and copy (`quota` for `QuotaExceededError` and `NS_ERROR_DOM_QUOTA_REACHED`, `missing`, `unavailable`), never `unsettled`, with nothing written and the record unchanged; only when IndexedDB accepts writes is it `unsettled`; a malformed record becomes `writing`; the real adapter's aborted transaction gives `quota`; each lenient write waits its whole budget while writes are refused, and once they are accepted the first heals the record and the next waits for nothing. From a current settled record on that full disk, lenient writes wait 0 s until one has changed the profile; each after it waits its whole budget, a save of the same text included, and once writes are accepted the first heals the record | `tests/profile-fence.test.mjs` |
| B1 | One click: one write, `nextSeq` 2, 120×L and 6×L at L1 then L2; it survives reload | `tools/command-smoke.mjs` |
| B2 | A stale card page is not charged: same copy upgraded elsewhere gives `duplicate`, whose toast and announcement name the accepted Lv.1 → Lv.2 · 120 金幣 · 6 靈砂, and a repaint; a lock toggle gives 卡牌剛有變動, and another copy in the slot gives 另一個分頁剛為另一張卡完成修練 | `tools/command-smoke.mjs` |
| B3 | Two dispatched clicks give one level, one spend and one write | `tools/command-smoke.mjs` |
| B4 | Two pages behind a held native `PROFILE_LOCK`: one commit and one `duplicate` that names the receipt. Repeated with about 60 KB saved, four rounds for the same copy and four for sibling copies in one slot, where the other page is told another card took the slot | `tools/command-smoke.mjs` |
| B5 | A synthetic quota error changes no byte; an explicit retry commits once and survives reload | `tools/command-smoke.mjs` |
| B6 | Without Web Locks the click is refused before any profile read or write | `tools/command-smoke.mjs` |
| B7 | The fence across two real pages at 50 KB: the next holder reads the previous write in every handoff (a plain-lock control is reported, not asserted) | `tools/command-smoke.mjs` |
| B8 | A `writing` record or an edit outside the lock refuses the upgrade with no write; a reload heals the fence and the upgrade commits, keeping the edit | `tools/command-smoke.mjs` |
| B9 | IndexedDB refusing the fence write with a synthetic `QuotaExceededError` refuses the upgrade with the quota copy, never the `no-lock` copy, and no write; it commits once writes work again. A `writing` record on that full disk refuses the upgrade and a local recovery restore with the quota copies, never a reload, with no write and the record still `writing`; the next load after writes work heals it | `tools/command-smoke.mjs` |
| B10 | A local recovery restore refused by the fence (a synthetic transient IndexedDB failure, then a record the tab's bytes do not match) changes no byte and keeps its dialog; pressing it again after the fence passes restores once, two presses give one restore, and no toast says the backup changed; the second press is ignored, with no refusal after the restore | `tools/command-smoke.mjs` |
| B11 | A local recovery dialog closed and opened again while its restore waits behind a held `PROFILE_LOCK`: a press in the reopened dialog is ignored, so one restore and one write land and the success toast is the only toast; when that restore is refused (a synthetic transient IndexedDB failure), the reopened dialog stays open and a press restores | `tools/command-smoke.mjs` |
| A1 | A `writing` record refuses a local recovery restore with 上次儲存未能完整確認… and nothing changed, and pressing it again repeats that reason; after a reload heals the fence the restore completes (Chromium) | `tools/account-smoke.mjs` |
| R1 | Regressions: the Node suite, `test:browser`, `test:inheritance`, `test:wx01`, `test:battle-table` and `test:commands` | §18.3, §18.5, §18.6, §18.7, §18.8, §18.9, §18.10 and §18.11 |
