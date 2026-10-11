# Experience modules · engineering design

Proposed **2026-09-29**, audited against source `22092fc`. This document turns
the RXSG experience study into bounded Mythseal engineering packets. It changes
no runtime, save, service, provider configuration or release. Interfaces below
marked **proposed** do not exist yet. [ROADMAP](../ROADMAP.md#experience-quality-track)
owns priority; [EXPERIENCE-LESSONS](EXPERIENCE-LESSONS.md) owns the transfer rationale.
The linked domain documents own rules and release procedures.

The intended result is less repeated administration and clearer decisions:
keep the battle table readable, extend existing saved-result flows, offer exact
previews, and make optional assistance visible and stoppable. Local progress
remains editable offline progress. Accounts/private backups do not certify
ownership, battle results, currency or entitlement to collectible issuance.

## Existing seams: extend these before adding another system

| Concern | Existing owner and contract | Remaining packet |
| --- | --- | --- |
| Rules and AI | `engine.mjs`: `createMatch`, `previewMove`, `resolveRound`, `chooseAIMove`; RNG is injectable | Q5 public adapter, not another engine |
| Battle visibility | `app.mjs`, `scene-adapters.mjs`, `battle-ui.mjs`, `battle-presentation.mjs` | Q0 implements [BATTLE-LAYOUT-PLAN](BATTLE-LAYOUT-PLAN.md) |
| Persisted mutation | `app.mjs:transact` reloads, transforms, saves, then invokes `onSaved`; `economy` controls busy/error presentation | Q1 explicit command/receipt contract |
| Save integrity | `profile-store.mjs:createProfileStore`, `assertLocalProfile`, shared `PROFILE_LOCK`; v5 profile/legacy migration | Q1 extends validated storage, not a second save authority |
| Earned-coin packs and boxes | `progression.mjs:buyPack`, `buyWX01Box`; `wx01-pack.mjs:drawWX01Pack` | Q2 unified previews and recovery entry points |
| Saved reveal | `wx01-state.mjs:validateWX01State`, `acknowledgeWX01Receipt`, `pack-ui.mjs:packReceiptMarkup`, `pack-opening.mjs:createPackOpeningController` | Reuse exact accepted results |
| Exact-copy care | `getUpgradeCost`, `getTrainingCost`, `upgradeInstance`, `trainInstance`; `inheritance.mjs:previewInheritance`, `inheritInstances` | Q2 bounded multi-step preview |
| Protection | `collection.mjs:getInstanceProtection`, `isInstanceInJourney`; inheritance has distinct target/donor rules | Preserve action-specific protection |
| Authored content | `printing-catalogue.mjs`, `stories.mjs`, `campaign-content.mjs`, `activity-content.mjs` | Q4 registry describing actual capabilities |
| Build boundary | `hosting/public-assets.json`, `tools/build.mjs`, `.github/workflows/ci.yml` | Q6 portable validation/evidence |

WX-01 **already has** 12/24-pack boxes, whole-box receipts, exact-copy protection,
sequential pity, skip/overview/reload presentation and counter/capacity preflight.
Same-character inheritance already supports explicitly selected BASE donors,
up to nine materials, exact-record fingerprints, capped-XP overflow disclosure,
redundant-donor rejection and protected copies. These are implemented local features,
not tasks to recreate. See [WX01-DROP-RATES](WX01-DROP-RATES.md),
[EXPANSION-WX01](EXPANSION-WX01.md) and [BACKPACK](BACKPACK.md).

## Q0 · decision visibility and a measured baseline

Implement the existing battle-table plan before adding more control panels.
Keep both public four-card hands, current announced card, selected own card,
reserves and commit controls visible together. Full inspection restores focus
and the draft. Do not invent an eight-card opponent-deck inspection feature.

Extend `scene-adapters.mjs:prepareScene` and existing battle presentation;
keep `viewport.mjs:createViewportController` for secondary pages. Pack receipts
and larger collections may paginate; the four-card decision rows should not.
Reuse `experience.mjs:createExperienceController` for reduced motion and pace.

Record baseline task steps and active waiting time for one round, one exact-copy
upgrade, one inheritance and a saved box reveal. Record source, browser, viewport,
motion setting and synthetic fixture; do not call a screenshot a performance test.
Q0 acceptance is the simultaneous-visibility and hidden-information matrix in
[BATTLE-LAYOUT-PLAN](BATTLE-LAYOUT-PLAN.md), plus comparison with those baselines.

## Q1 · one local command and its accepted receipt

**Proposed `local-commands.mjs`** is an adapter around pure domain functions and
the existing profile store. It does not put DOM, animation or network calls into
`engine.mjs`/`progression.mjs`. Start with care commands; WX-01 receipts remain
their existing domain record rather than being copied into competing ledgers.

```js
// Proposed contracts; illustrative shapes, not implemented exports.
previewCommand(profile, intent, { now })
// -> { commandType, selectedUids, costs, effects, fingerprint, blockers }
commitCommand({ commandId, intent, expectedFingerprint }, { store, lock, now, rng })
// -> { status: 'committed', receipt } | { status: 'rejected', reason }
readCommandReceipt(commandId, { store })
// -> { status: 'committed', receipt } | { status: 'unknown' }
```

Use an operation ID bound to the normalized intent; reuse with a different intent
is an error. Under the lock, load the profile and check its command epoch and
existing ID first: a retained duplicate with the same intent returns the original
receipt before evaluating its now-old preview fingerprint. It never executes the
rule again. Only a new admissible ID proceeds to eligibility/fingerprint checks.
A fingerprint detects stale inputs; it is not a signature or trusted
ownership proof. Recompute eligibility and cost from the freshly loaded profile
under `PROFILE_LOCK`, then persist effects and receipt in **one profile write**.
Only after `save` succeeds may UI state, sounds and animation announce acceptance.

The current `transact` falls back to unlocked execution if Web Locks is absent;
do not describe that fallback as cross-tab serialization. New queued/high-impact
commands must refuse execution without the required lock, as inheritance already
does. Recheck version/fingerprint inside the lock; button disabling is insufficient.
Schema work must update strict local/cloud validators and preserve legacy keys;
do not add an unvalidated receipt field that silently disappears during hydration.

Bound completed command history and saved bytes; never evict an unresolved or
unacknowledged result merely to make space. Reject before mutation if a receipt
cannot fit. A confirmed local write failure leaves the last committed profile;
display failure, retain the preview and refresh before a user retries. If the
outcome is unknown after interruption, reload and locate the same operation ID;
do not auto-resubmit or substitute a new ID. `unknown` is not proof of failure.

Receipt retention must not reopen an old command. The proposed local envelope
uses a profile epoch and monotonic command sequence; retain the accepted/retired
sequence boundary after detailed receipts are pruned. An expired identity is
rejected, never executed as new. Restore/import changes the command epoch and
invalidates old-tab previews; document that change in the migration/backup
contract. A receipt lookup outside retention reports unavailable/expired rather
than promising a replayed result. Do not claim an unbounded exactly-once guarantee.

An accepted WX-01 receipt contains ordered cards/pack groups, exact instance IDs,
printing IDs, cost, seals and its ID. Reload, skip, close, reduced motion and replay
read those saved results. Acknowledgement must match the current receipt ID and
cannot charge, grant or roll again. See `acknowledgeWX01Receipt` and
`pack-opening.mjs`, which deliberately has no RNG, grants, storage or network.

Preserve sampler behavior: `buyWX01Box` applies `drawWX01Pack` sequentially and
carries `dry` across every pack; there is no new box rate/bonus guarantee. WX-01
RNG consumption varies by sampler branch. Freeze seeded stream/order in tests,
not an invented fixed call count. Legacy packs retain their existing six draws.
RXSG's per-box sampling/aggregate lesson means keeping every actual sub-result,
not drawing one result and multiplying it. UI opening speed never changes odds.

## Q2 · batch care, previews and existing box flow

**Proposed `care-plan.mjs`** previews an explicit ordered list of exact UIDs and
requested target levels through existing `getUpgradeCost`/`upgradeInstance`.
Return per-step and total coin/dust costs, before/after XP, eligible actions,
blocked reasons, resource floors and a fingerprint. Set a small explicit step
limit; one plan never means "all future copies" or an unbounded "until done" loop.

Recompute each successive level's cost against simulated preceding results.
Stop preview generation at target, cap, blocked copy, resource floor or budget;
show the accepted prefix and why later steps are excluded before confirmation.
Confirmed commit requires the same quoted plan and current inputs; a changed
cost/material/eligibility rejects the quote, never silently reduces its scope.
For the initial bounded batch, all accepted steps and its receipt save together.

Keep half-price `trainInstance` explicit: it spends the existing one-per-day
allowance, not one discount per selected UID. Reuse `previewInheritance` and
`inheritInstances` unchanged for one explicitly selected target/material group;
do not auto-select donors, substitute siblings or consume special printings.
If multi-target inheritance is later wanted, specify separate donor ownership
and non-overlap rules before exposing it. Never infer permission from surplus XP.

Protection is action-specific: locks/saved decks can permit growth while blocking
sale/donor consumption; pending battle/activity exact UIDs block care. Outstanding
pack copies must be reviewed before inclusion in a new care plan. Recheck every
target/material UID, printing, XP and protection in the current profile. Existing
activity protection also applies in the between-battle supply phase.

For packs, build a shared preview over **existing** single, 12 and 24 choices:
show exact cost/count, current balance, room including merchant vault, dry-protection
state and blocked receipt. Confirmation calls `buyPack`/`buyWX01Box` once; persisted
receipt drives per-pack reveal or the aggregate overview. Do not invent arbitrary
box sizes, discounts, faster odds, or "open until rare" purchasing in this packet.
Ticket/reward/choice paths retain `openWX01Ticket`, `claimExpansionGrant` and the
redemption APIs' distinct costs, counters and entitlements.

## Q3 · optional, visible and bounded assistance

**Proposed `assistance-policy.mjs`** compiles a player's explicit policy into
the same preview/command path. Initial actions are viewing due work and executing
a previously reviewed upgrade plan. Training, consumables or selected reward
claims require a later explicit policy extension with their own time/entitlement
rules. Battles, hidden bids, pack purchases, sales and donor consumption are
outside unattended scope.

```js
// Proposed persisted policy; execution state/receipts need their own validation.
{ version: 1, enabled: false, allowedActions: [], exactUids: [],
  maxCommands: 1, resourceFloor: { coins: 0, dust: 0 },
  consumables: [], expiresAt: null, missed: 'skip' }
```

Policies are off by default, per item/action opt-in and easy to pause/revoke.
Show next eligible action, maximum spend, remaining budget, last receipt and stop
reason. Empty consumables means none. A default zero floor is not blanket spend
permission: costs still require an explicit reviewed action and maximum budget.
Check current balances/capability/version before every action, pause on unexpected
state, and never substitute another UID, donor, reward choice or payment resource.

Run only while the local page is visible and the policy is current. Backgrounding,
reload, changed day, expired preview, storage/lock failure or unknown outcome
pauses execution. Reload may show saved results, but requires deliberate resume
of a reviewed remaining plan. Stop cancels uncommitted work; it cannot undo an
already accepted receipt. No offline AI battle autoplay or catch-up command burst.

Use injected `now` and existing `dayKey`/`weekKey`: Europe/London midnight,
Monday week boundary and saved high-water marks; test both DST transitions and
backward device clocks. A skipped window is skipped, not a lost-streak penalty
or a debt of future actions. Advancing the device clock does not prove server
eligibility. Existing claim rules and activity start-week settlement remain intact.
Use monotonic elapsed time for an open-page timer; a timer does not grant rewards.

Any future online scheduler uses server time, durable job IDs and an explicitly
defined late window/expiry; default missed work still skips without punishment.
An online timeout requires receipt reconciliation before retry. Repeating the
same idempotent server request can recover a result; creating a new command cannot.

## Q4 · content registry and honest capability visibility

**Proposed `content-registry.mjs`** is a read-only index over existing authored
modules, not a second rules/printing database. Declare `id`, `contentVersion`,
`rulesVersion`, `sourceModule`, asset references, unlock descriptor and capabilities.
Also reference the owning entry-cost rule, completion event, reward/claim policy,
resume support and completion-test receipt; do not copy those rules into the index.
Keep `cardId` (rules), `printId` (edition/art) and `uid` (owned copy) distinct.

Each capability distinguishes `preview`, `local-playable`, `local-owned`,
`backup-compatible` and `server-authoritative`, with unavailable reasons.
For example, WX-01 is locally playable/owned; LZ/HL standalone art previews must
not acquire cards or imply engine integration. An account connection is not the
`server-authoritative` capability. Release-manifest evidence determines what is
deployed; presence on a development branch only supports a source capability.

Feature views read this registry for consistent labels and discovery, while
domain validators still enforce legality. Hide no ownership error behind a
cosmetic feature flag. The build validates unique references and an allowlisted
asset graph; previews stay in `hosting/preview-assets.json` unless deliberately
promoted through the existing pipeline. No dynamic remote code loading is needed.
Asset budgets, artwork provenance and release identities remain owned by
[CONTENT-RELEASE-PIPELINE](CONTENT-RELEASE-PIPELINE.md) and the expansion documents.

**Implemented locally 2026-10-11 (branch `q4/content-registry`, not merged or
deployed).** The registry is `tools/content-registry.mjs`, not a root runtime
module. It is **tooling only** for two reasons. It describes the LZ-01/HL-01
preview identities, so a served copy would have to import `liaozhai-cards.mjs`
and `honglou-cards.mjs` into the public graph, which their isolation tests forbid,
or duplicate their lists. And it reads the two allowlists and the LZ-01 docs,
which a static browser module cannot. No runtime view consumes it yet, so the public
build is unchanged at 80 files. A future runtime label view should take a public
subset that the build generates, not import this file.

- **Derived, not maintained:** encounters come from `progression.mjs:NODES`
  (6 original, 12 story, 48 campaign), the activity from `FIRE_MOUNTAIN`, the 24
  legacy and 29 WX-01 printings from `PRINTINGS`, the LZ-01/HL-01 previews from
  their card modules, and the six planned LZ-01 specials from the "Proposed
  printing checklist" in [EXPANSION-LZ01](EXPANSION-LZ01.md), with proposed files
  from [ART-LZ01](ART-LZ01.md). That makes 150 entries: 120 `local-playable`,
  24 `preview` and 6 `planned`.
- **Capabilities:** each entry carries all five capabilities. A capability is
  `available`, `unavailable` with a reason, or `not-applicable` with a reason;
  for example, encounters have no preview surface and are not owned. When the
  source wires an item but a requirement fails, such as missing art, an
  unlisted asset, an illegal deck or a dangling prerequisite, the capability is
  `inconsistent` and the audit fails. `server-authoritative` is unavailable everywhere.
- **References, not copies:** entry, completion, reward, resume and unlock rules
  are `file.mjs:function` references. Evidence names `tests/file › title`. The
  audit checks that each one still resolves. `cardId`, `printId` and the absent
  `uid` stay distinct. Only `FIRE_MOUNTAIN.version` exists as a declared content
  version, and no rules version exists. `contentDigest` (SHA-256 of each authored
  record) detects change without inventing either version.
- **Audit:** `npm run audit:content` and `tests/content-registry.test.mjs` fail
  on several kinds of inconsistency. They cover a public page loading an unlisted
  file and an allowlisted file nothing uses. They cover preview data or art
  reaching the public build and a planned special that is bound, allowlisted or
  present while its checklist row still says "no image". They also cover drift
  between the LZ-01 checklist and its briefs, and a dead rule or evidence
  reference. Injected-fault cases prove each check fires.
- **Rules-level routes:** every advertised encounter route (66 owned plus 2
  borrowed decks) starts, completes, pays its first clear once, rejects a duplicate
  completion and unlocks its next step. Both activity routes complete twice with
  one first-clear grant. A cloud-snapshot round trip keeps all 66 clears, the
  activity record and one copy of each of the 53 ownable printings.
- **Still open for Q4:** feature views do not show these reasons yet. Start → completion →
  receipt → return is covered at rules level, not in the browser UI. The "one
  deeper encounter" sample and human difficulty review are not started.

## Q5 · a fair observation and legal-command boundary

**Proposed `agent-observation.mjs`** exposes `observePublic(position, phase)` and
`listLegalCommands(observation)`; a separate executor validates a selected command.
Begin with deterministic local test agents and read-only explanation, not an
account-connected external agent or a background player of reward-bearing matches.

The observation includes public hands, used cards, resources, effective public
stats, initiative, accepted public history and the phase-allowed announced card.
It excludes `aiMove`, pending hidden bids/Fury, secret bid ranges, RNG state and
private unrevealed commitment material. Do not serialize `app.mjs`'s whole saved
battle snapshot into an observation. Public hand visibility does not expose bids.

Reuse the discipline of `engine.mjs:chooseAIMove` and its private `publicPosition`
projection: a following agent may receive only the explicitly revealed card ID.
Commit a leading AI move before the human chooses; inspection and explanation
cannot reseal/reroll it. Reveal reads accepted results, never a speculative winner.
Agents receive only legal command names/arguments for the current phase and caps;
the executor revalidates from current state, not the observation's old authority.

Require noninterference tests: changing only hidden bids/Fury/ranges leaves public
JSON, DOM text, attributes, accessibility labels and agent advice inputs identical.
Do not expose secret fields through error strings, telemetry or replay exports.
Human browser observations still need manual review alongside deterministic tests.

## Q6 · measurement, portable checks and later authority

**Proposed `experience-metrics.mjs`** observes public lifecycle events with local,
bounded in-memory storage and deliberate export. Capture task durations, action
counts, cancelled animations, stale-preview rejection and recovery outcomes.
Keep account identifiers, saves, private bids and raw player input out of exports.
Events follow accepted transitions; instrumentation never drives the state machine,
draws RNG, changes policy timing or retries a command. No analytics service signup.

Record check receipts with source commit, command, exit, fixture, browser/version,
viewport, duration and artifact path. Distinguish unit tests, simulated browser,
physical-device, CI, build, deployed-asset and authenticated hosted evidence.
Compare cold/warm transfer, initialization, input/render latency and persistence
separately; record real iOS/Android results before claiming device performance.
Existing CI runs Node/Python, disposable PostgreSQL backup tests, contract-toolkit
fixtures, build and dry runs; it does not currently run the browser smoke scripts.
Q6 adds a bounded browser CI recipe with pinned setup, synthetic profiles, explicit
loopback `GAME_URL` and readiness check, temp output and cleanup; never real saves.

Keep [VALIDATION](VALIDATION.md) as evidence and [HOSTING](HOSTING.md) as the release
procedure. Preserve allowlisted `dist`, coherent module versions, account bindings,
old/new backup compatibility and hosted retention checks. A documentation push,
local build or dry run does not deploy or prove the live account service healthy.

Future authoritative execution follows [BACKEND-STACK](BACKEND-STACK.md): one
server-owned command path and one Postgres transaction for actor-scoped idempotency
key/request hash, locked state/revision checks, costs, exact grants, receipt and
outbox. Preserve lock order and roll back the whole transition on failure. Do not
copy RXSG's MyISAM settlement limitations or perform separate balance/inventory
writes. Server randomness and server time replace client authority; the browser
renders accepted receipts. No network side effect runs inside economy locks.
This is a future boundary, not authorization for paid services, deployment or minting.

## Verification anchors and remaining evidence

Existing tests to retain include `tests/wx01-box.test.mjs` ("default twelve-pack
box crosses pity at its twelfth pack, while twenty-four crosses twice" and "one
box receipt resumes unchanged, protects all copies and blocks other grants until
exact acknowledgement"); `tests/wx01-pack.test.mjs` covers sampler/RNG equivalence.
`tests/inheritance-storage.test.mjs` covers quota refusal and stale quotes;
`tests/profile-store.test.mjs` covers failed writes retaining the committed profile.
`tests/pack-opening.test.mjs` covers skip without resampling; box smoke covers reload;
`tests/weekly.test.mjs` covers London DST/high-water marks. `tests/engine.test.mjs`
includes "AI is seeded and reads only public fields, never pending cards, spending
or Fury". Extend these relevant seams with command replay, stale tabs, batch cost
changes, policy cancellation/missed windows and observation leakage cases.

Use `npm run test:wx01`, `npm run test:inheritance`, `npm run test:viewport` and Node files
as applicable to a future implementation, then release checks required by its
actual scope. **No runtime or browser check was run to validate these proposals
in this documentation task.** Source/test inspection establishes extension points,
not implemented behavior, measured improvement or fresh hosted health.
