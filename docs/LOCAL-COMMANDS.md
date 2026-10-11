# Local commands · Q1 contract

**Status:** proposed contract, implemented for one command (`care.upgrade`);
owner review requested before Q2/Q3 consumers. Dated 2026-10-11 and written
against `origin/main` `8afbabc`. It is implemented on the local branch
`q1/local-commands`, which is not pushed, merged or deployed. It is not a release
and changes no hosted service. [§18](#18-implementation-record-2026-10-11)
records what was built, where it differs from the text below, and the checks.

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
| `local-commands.mjs` (new, runtime) | `previewCommand`, `commitCommand`, `readCommandReceipt` and one type, `care.upgrade`. Imports: `progression` (`getUpgradeCost`, `upgradeInstance`), `collection` (`getInstance`, `isInstanceInJourney`), `cloud-save` (`fingerprintProfile`) and `command-ledger`. It never imports `profile-store` or `app.mjs`; the caller passes in the store and the lock. |
| `progression.mjs` | Changes `hydrateProfile` only. For `raw.version === 5` with its own `commands` key, it sets `hydrated.commands = validateCommandLedger(raw.commands)`. Otherwise the key stays absent and is never invented. This is wired the same way as `validateWX01State` and `validateExpansionState`. |
| `profile-store.mjs` | **No code change.** The canonical re-hydrate check in `assertLocalProfile` (line 45) now carries and checks the ledger before `setItem`. The 4 MiB envelope check (line 48) now counts it. |
| `cloud-save.mjs` | Export `LOCAL_ONLY_PROFILE_KEYS = ['commands']` and `backupProfile(profile)`, a shallow copy without those keys. `createSnapshot` validates `backupProfile(profile)`. Unchanged: `validateSnapshot`, `validateProfile`, `restoreSnapshot`, `fingerprintProfile`, `SNAPSHOT_VERSION`. |
| `account-client.mjs` | `localDiffers` compares `fingerprintProfile(backupProfile(getLocalProfile()))` with the backup. The restore-confirmation fingerprints (lines 239, 249, 253) stay computed over the **full** profile. |
| `app.mjs` | Adds the `profileLock` binding and sets `passportQuote` in `showInstance`. `instance-upgrade` goes through `runUpgrade` (§7.1). `upgrade-card` goes to the card page. `restoreLocalProfile` retires the ledger (§11). `transact` calls `assertLedgerUnchanged` and gets a comment on its fallback. |
| `hosting/public-assets.json` | Add `command-ledger.mjs` and `local-commands.mjs`. This is also needed locally, because `tools/serve.py` serves only allowlisted files. |
| Tests | New: `tests/command-ledger.test.mjs` and `tests/local-commands.test.mjs`. Extended: profile-store, cloud-save, account-client and hosting tests. See the test matrix. |
| `tools/command-smoke.mjs` (new), npm `test:commands` | Runs Chromium, then WebKit (`BROWSER=webkit`), with synthetic saves and an explicit loopback `GAME_URL`. It is modelled on `tools/inheritance-smoke.mjs`. `backpack-smoke` and `classics-smoke` launch Chromium only. |
| Docs | Adds this file. Also: an EXPERIENCE-MODULES Q1 pointer, a ROADMAP Q1 status line, a VALIDATION receipt and one HANDOVER sentence about `commands`. |

**Not touched:** `engine.mjs`, `collection.mjs`, `inheritance.mjs`, `wx01-state.mjs`, `backpack-ui.mjs`, `adventure-ui.mjs`, `bootstrap.mjs`, `server/`, `supabase/`, the `PROFILE_LOCK` name and every `shanhai.*` namespace.

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
// store: the result of createProfileStore(). lock: (syncCallback) => Promise, or null.
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

The binding in `app.mjs` (implemented as a function read at click time; see §18.2):

```js
const profileLock = navigator.locks ? fn => navigator.locks.request(PROFILE_LOCK, fn) : null;
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

12. If `await lock(...)` rejects with `entered === false`, return `rejected/lock-failed`. The callback never ran.
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
| Otherwise | `not-committed`. This is definitive under the lock, because a commit is one synchronous write. |

**Lookup never writes.**

**Reload during a commit.** A reload or a closed tab during a commit leaves either the last committed profile (killed before `setItem`) or the new receipt (killed after it). The card page shows the saved state, and the next click makes a new preview.

A per-tab `sessionStorage` marker for in-flight work is out of scope. A Q3 queue that wants to resume must save its in-flight request in its own validated state and call `readCommandReceipt`.

## 9. Failure states

| Status / reason | Cause | Written | Player copy (zh-Hant) | Next step |
| --- | --- | --- | --- | --- |
| `committed` | Saved | One profile write | 此卡修練完成，另一張副本的等級不變。 (existing) | Sync, mark changed, render, re-open the card page with a new quote, announce, tone |
| `committed` with `duplicate` | Same slot and intent were already accepted | Nothing | 這次修練早已入帳，未有再次扣除資源。 | Sync, render, re-open the card page; show the stored receipt's real before and after |
| `rejected/identity-conflict` | Same slot, different intent | Nothing | 卡牌剛有變動，未有扣除資源；請查看更新後的修練預覽。 | Reload and preview again; no automatic retry |
| `rejected/stale` | Fingerprint or `toLevel` differs, or the slot is ahead of the ledger | Nothing | Same as above | Same as above |
| `rejected/expired` | Slot below `retiredBelow` | Nothing | 修練預覽已過期，未有扣除資源；請重新查看。 | Preview again |
| `rejected/blocked` | Rule refusal, or the ledger is exhausted | Nothing | The rule's existing message | Repaint |
| `rejected/invalid` | Malformed request | Nothing; storage not read | 修練預覽無效，未有扣除資源。 | Preview again (indicates a bug) |
| `rejected/no-lock` | `navigator.locks` is missing | Nothing; storage not read | 請用支援安全儲存的新版瀏覽器修練；未有扣除資源。 | None on this browser |
| `rejected/lock-failed` | The lock request rejected before the callback ran | Nothing; storage not read | 未能取得儲存權限，未有扣除資源；請再試一次。 | The player may click again with the same request |
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
4. **These already refuse without locks and are unchanged:** inheritance, cloud restore, local recovery restore and the playtest supply page.
5. **The wrapped card-page upgrade now requires a lock.** Only browsers without Web Locks are affected. `127.0.0.1` loopback and the HTTPS public site are secure contexts.
6. **Same tab.** `runUpgrade` sets and respects `economyBusy`. It therefore takes turns with the existing economy actions, and `restoreLocalProfile` (which refuses while `economyBusy` is set) cannot interleave with it.
7. **Only two writers may change the ledger:** `commitCommand` and `restoreLocalProfile`.
   - Before calling `change`, `transact` captures the canonical JSON of the loaded `commands`. Before `save`, it calls `assertLedgerUnchanged`.
   - If they differ, it throws `本機操作記錄不可由此動作更改；未有更改旅程。` and writes nothing.
   - This keeps the invariant "once a profile has a ledger, it keeps one", which the restore rule in §11 depends on.

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
- If the profile being replaced has no ledger, the restored profile stays without one. The existing restore smokes stay byte-equal, including the `deepEqual` at `tools/account-smoke.mjs:270`. See §15 decision 1.

**Export:** `export-save` still downloads the raw profile, ledger included. There is no import path. Any future import must retire the ledger, as restore does.

**Older builds (forward-only):**

- A v5 build from before Q1, on the **same origin**, refuses a save that contains `commands`.
  - It throws `旅程資料未能完整讀取；原件仍保留，請先匯出備份。` with zero writes (verified in Node at `8afbabc`).
  - The bootstrap recovery screen then offers export.
- Public v0.5.1 uses `shanhai.profile.v3` and snapshot v1, so it is unaffected.
- **Release guidance:** ship Q1 no later than the first public release that uses profile v5. After players have committed commands, rolling back below Q1 needs a forward fix.

## 12. Backup validation impact

- **No hosted change.** The snapshot format and `SNAPSHOT_VERSION 3` stay. So do `validateSnapshot`, `validateProfile`, `server/account-api.mjs` (which imports only `validateSnapshot`), the Supabase JSONB checks and the `JOURNEY_*` flags. There is no Worker deploy and no SQL migration.
- **Backups never contain the ledger.** `createSnapshot` removes it from uploads, from restore-confirmation validation, and from the `RECOVERY_KEY` copy that `restoreLocalProfile` writes before replacing a profile. Without this, the current code would throw.
- **Ledger-only differences do not count as changes.** `localDiffers` compares profiles with the ledger removed, so a difference only in the ledger never shows the journey as changed.
- **Restore confirmation keeps the full fingerprint, ledger included.** A command committed between confirmation and restore therefore blocks the restore, as intended.

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
| A stale preview cannot spend | N7, N8, N21, and smoke B2 |
| A duplicate submission spends once | N5, N8, and smokes B3 and B4 |
| Quota or storage refusal changes nothing | N11, N12, and smoke B5 |
| A tab or reload interruption loses nothing | Single-write atomicity, N12 (write landed, then threw), N13, and B1's reload |
| A changed payload under the same identity is rejected | N6 |
| New fields are versioned and backups stay compatible | §11, §12, and N15–N19 |

## 15. Owner decisions

1. **Restore rule.** This contract retires only a lineage that has a ledger. The alternative, "always retire", closes the gap in §13 item 2. It costs the `account-smoke` `deepEqual` update and makes every restored profile Q1-only.
2. **Browsers without Web Locks.** On Safari below 15.4, Firefox below 96 and insecure origins, the card-page upgrade is lost, as inheritance and restore already are.
3. **Release ordering.** Ship Q1 in or before the first public v5 release.
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

The public allowlist now has 82 files.

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
9. **Test matrix B2, "stale toast".** Under §4, a page that previewed the same copy at the same level as another tab's accepted upgrade gets `duplicate` (這次修練早已入帳…), and that is what the smoke asserts for that case. The 卡牌剛有變動 toast is asserted for a record change in another tab (a lock toggle gives `stale`) and for another copy committed in the same slot (`identity-conflict`).
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

## Appendix · test matrix

Where each row is implemented. The `N` rows are Node tests and the `B` rows browser smoke groups.

| ID | What it pins | Where |
| --- | --- | --- |
| N1 | Preview purity: no storage calls, input unchanged, deterministic ID and fingerprint; costs and effects equal the rule (120×L, 6×L, toXP = threshold(L+1)) | `tests/local-commands.test.mjs` |
| N2 | Blockers with the rule's text, and no request, for: unknown uid, vault copy, pending battle, Fire Mountain run, Lv.5, coins, dust; a malformed intent throws `RangeError` | `tests/local-commands.test.mjs` |
| N3 | Happy path: one `setItem(PROFILE_KEY)`; the save minus `commands` equals `upgradeInstance`; exact ledger and receipt | `tests/local-commands.test.mjs` |
| N4 | Every `getItem`/`setItem` happens inside the lock callback | `tests/local-commands.test.mjs` |
| N5 | A duplicate returns the original receipt with no write, also after another tab changes `battles` or maxes the copy | `tests/local-commands.test.mjs` |
| N6 | Same ID with another uid or `toLevel` gives `identity-conflict`; a malformed request gives `invalid` without reading storage | `tests/local-commands.test.mjs` |
| N7 | Stale: XP, level, battles, lock, printing or inheritance on the target gives `stale`; pending battle, sale and a balance drop give `blocked` (§18.2 item 8); a future slot gives `stale`; a balance gain alone commits | `tests/local-commands.test.mjs` |
| N8 | Two tabs: the same preview spends once, and the second is `duplicate`; different copies in one slot give `identity-conflict` | `tests/local-commands.test.mjs` |
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
| B1 | One click: one write, `nextSeq` 2, 120×L and 6×L at L1 then L2; it survives reload | `tools/command-smoke.mjs` |
| B2 | A stale card page is not charged: same copy upgraded elsewhere gives `duplicate` and a repaint; a lock toggle or another copy in the slot gives 卡牌剛有變動 | `tools/command-smoke.mjs` |
| B3 | Two dispatched clicks give one level, one spend and one write | `tools/command-smoke.mjs` |
| B4 | Two pages behind a held native `PROFILE_LOCK`: one commit and one `duplicate` | `tools/command-smoke.mjs` |
| B5 | A synthetic quota error changes no byte; an explicit retry commits once and survives reload | `tools/command-smoke.mjs` |
| B6 | Without Web Locks the click is refused before any profile read or write | `tools/command-smoke.mjs` |
| R1 | Regressions: the Node suite, `test:browser`, `test:inheritance`, `test:wx01`, `test:battle-table` and `test:commands` | §18.3 |
