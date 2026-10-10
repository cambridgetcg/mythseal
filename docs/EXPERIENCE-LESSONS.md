# From restored games to a smoother Mythseal

**Design transfer · 2026-09-29.** This note turns lessons from the separate
熱血三國 (RXSG) local restoration into Mythseal development decisions. It is a
plan, not a feature implementation or deployment receipt. Mythseal source was
reviewed at `22092fc`, after the game-lobby work merged into `main`.

Read the [Q0–Q6 work packets](../ROADMAP.md#experience-quality-track) for delivery
order and ownership; [Experience modules](EXPERIENCE-MODULES.md) owns the proposed
interfaces and infrastructure. Existing [immersion](IMMERSION.md),
[navigation](NAVIGATION.md), [pack rules](WX01-DROP-RATES.md),
[campaign](CAMPAIGN-AND-EVENTS.md) and [release](HOSTING.md) documents continue to
own their subjects. The last recorded public release remains v0.5.1; the richer
current source is not evidence of a public rollout.

The product aim is enjoyable choices with less repetitive work. Preserve the
free, optional-play direction: no acquisition/retention quota, compulsory daily
streak, commercial collectible objective or requirement to run an agent.

## Start from what Mythseal already has

| Existing source behavior | Transfer that is still useful |
| --- | --- |
| Five destinations, viewport modules, focus/return handling and a planned persistent battle table | Measure whether the information needed for a decision is visible together; reachable tabs alone are insufficient. Q0 finishes the existing layout plan. |
| `buyWX01Box` opens 12 or 24 packs; saved receipts survive reload and reveal/skip | Reuse this pattern. Do not introduce another WX box service or change its pack sampler/protection. Q1 extends the command/receipt boundary to later workflows. |
| Exact copy UID/printing/XP, three saved decks and inheritance previews | Q2 adds multi-copy upgrade/training plans using the existing rules. It does not recreate identity, inheritance or deck storage. |
| 66 encounters, a three-boss activity, tickets, grants and literary previews | Q4 makes capability/completion status explicit while preserving the existing catalogues. A gallery is not an owned-card release. |
| Save-first transactions, profile recovery and explicit private cloud backups | Q1 closes new cross-tab/receipt gaps without promoting a backup into trusted online ownership. |
| Reduced motion, fast/skip battle presentation, optional sound and versioned public assets | Extend these mechanisms and measure them before choosing a new renderer, cache service or native dependency. |

These are observations of repository behavior, not fresh runtime tests. Existing
test receipts and their limits are in [VALIDATION.md](VALIDATION.md).

## Lessons translated into decisions

| RXSG finding | Mythseal decision | Packet |
| --- | --- | --- |
| Caching/compression reduced warm transfer dramatically while an initialization stall remained. | Measure network transfer, parse/init, input response, rendering and persistence separately. Optimize the slow layer; a faster download does not establish faster battle interaction. | Q0, Q6 |
| The original art remained enjoyable after scaling, clearer controls and corrected overlay placement. | Preserve Mythseal's original illustrations. Improve typography, readable stats, crops, focus, touch targets and safe areas before commissioning replacements. Desktop and phone may compose the same art differently. | Q0 |
| Repeated item use became one bounded request with per-item semantics and one aggregate result. | A batch compresses clerical interaction, not game rules. Preserve every grant, exact UID, printing, cost, counter and sampler transition; summarize without hiding individually inspectable results. | Q1, Q2 |
| Equipment preview exposed costs and stopping rules; a stale preview could not spend against changed state. | A care plan identifies exact copies, target levels, maximum spend, exclusions and resulting reserves. Applying requires the same relevant state and settings. Rejected plans leave inventory unchanged. | Q1, Q2 |
| City-wide automation needed visible reasons, individual-rule precedence and optional material spending. | Offer a small player-owned care queue with explicit scope, priorities, reserves, pause and stop conditions. Show “waiting for dust” versus “paused” versus “needs a new preview.” | Q3 |
| Equipment identity survived refinement and moves; sequential intermediate states caused avoidable derived-stat loss. | Plan the final legal configuration first. Retain exact UID/print/history; validate and persist once. Do not silently substitute the highest-level copy or consume a protected donor. | Q2 |
| Some restored modules opened but could not finish; local adaptations needed explicit labeling. | Publish capability states for playable, preview, planned and unavailable content. Register prerequisites, costs, reward source and completion coverage. Never infer ownership or a finished mode from available art. | Q4 |
| Activity rewards needed source-event identity, not a “last seen” cursor. | Claims refer to durable completion IDs and an explicit game period. Browsing or polling cannot create progress; presentation consumes the accepted outcome, not a fresh reward calculation. | Q1, Q4 |
| Fair-agent play needs more than an API: observations, speed and permitted actions matter. | Humans and agents use the same legal command boundary. Observations reveal public hands and the permitted announced card, never hidden bids, bid ranges, future choices or RNG state. | Q5 |
| Locks and receipts helped recovery but could not turn legacy MyISAM into crash-atomic storage. | Do not transplant that storage workaround. Keep local profile effects and receipts in one saved state; use transactional commands/receipts if the future online authority is built. Unknown outcomes require lookup/reconciliation. | Q1, Q6 |
| Isolated test worlds and selected-file deployment protected the played world. | Keep synthetic profiles and disposable databases separate from real journeys; preserve the public allowlist, compatible module graph and explicit hosted release gates. | Q6 |

## Player-facing design notes

**DN1 · Keep a decision on one surface.** During a turn, show both public
four-card hands, the announced confrontation, current life/pills and the player's
move controls together. Card inspection may expand into a sheet; selecting a
card must not hide the opponent information. Follow the existing
[battle-table plan](BATTLE-LAYOUT-PLAN.md), including planning/reveal distinctions.

**DN2 · A quick path and a complete explanation.** A repeated action can use a
compact summary, while an optional detail view shows exact copies, resources and
per-step results. Keep the selected target, filters, scroll and logical focus
after inspecting costs or returning from a receipt. An animation acknowledges an
already saved outcome; skipping it must change neither rewards nor RNG.

**DN3 · Let the player set the stopping point.** Example: “Upgrade these three
companions toward level 3; retain 600 coins and 10 dust.” Preview which steps are
legal and what remains. Already-maxed or battle-locked copies explain their
status. The reserve is a post-action floor, not escrow. A future queue must not
sell cards, consume tickets/donors or start battles to fund itself.

**DN4 · Separate spending permission from convenience.** “Upgrade selected
copies” does not mean “consume rare printings,” “use every ticket,” or “claim all
rewards.” Destructive inheritance remains its own explicit preview. Keep default
limits small and reviewable; RXSG's 99-box cap is not a reason to use 99 in every
Mythseal workflow. Existing WX boxes remain 12/24 under their current rules.

**DN5 · Explain uncertainty without making the player gamble again.** Buttons
distinguish saved, rejected and checking-result states. A network timeout is not
proof of failure; look up the same command before offering a new one. Closing a
result or acknowledging its receipt never repeats the operation. Reading a
screen must not heal a card, progress a queue or earn a reward.

**DN6 · Add depth through authored choices.** Trial one optional training puzzle
or encounter modifier using legal public-information AI and existing rewards.
Tie a short companion memory to an actual accepted event. Do not fabricate a
detailed adventure history from aggregate win totals. New content should offer a
different decision or story, not an additional mandatory daily checklist.

**DN7 · Keep discovery honest.** LZ/HL galleries can invite inspection while
clearly remaining studies. Rules integration, owned-copy acquisition, reward
balance and release each need their own evidence. Completion with powerful test
fixtures proves a route/accounting path, not appropriate difficulty for a new
player. Cosmetic printings retain their existing separation from battle power.

**DN8 · Agents are fellow players at the rule boundary.** Start with a local
practice adapter and a deterministic replay/evaluation harness. Keep credentials,
storage mutation, opponent private state and GM tools outside the agent surface.
The host enforces the selected action budget and asks for control handoff before
an agent spends on a player's behalf. A local inspectable program cannot claim
adversarial anti-cheat; online competitive fairness belongs to M2/M3 authority.

## Evidence to collect before choosing optimizations

These are proposed engineering acceptance measurements, not player-engagement
targets, observed performance or guaranteed service levels.

| Scenario | Record | Initial review target |
| --- | --- | --- |
| Cold/warm entry to usable lobby | Exact source/build, browser/device, cache/network profile, bytes, parse/init and time until input works | Establish reproducible baselines first; identify a specific bottleneck before changing loading infrastructure. |
| Select card → adjust pills → inspect → return | Input-to-visible response and long tasks over at least 30 repeated interactions on a named device | Aim for p95 at or below 100 ms for local non-animation feedback; record any miss and its cause. This is distinct from the deliberate 1.1 s reveal. |
| Battle at 360×640, short landscape and desktop | Simultaneous visibility, hit testing, readable numbers, focus order and keyboard operation | No primary-turn pagination or obscured decision inputs. Browser geometry checks plus a separate human/device review. |
| Large collection and a 24-pack receipt | Named synthetic fixture, render/filter/page latency, accessible exact UIDs and payload size | Every copy reachable once; no missing rewards or unbounded render work. Choose a budget from the measured baseline. |
| Repeated route/modal changes, hide/resume and interrupted saves | Retained listeners/audio/timers, draft/focus continuity and exact saved state | No accumulated active controllers; no extra spend, redraw or lost copy. |
| Slow/offline account request | Pending state, timeout/retry behavior, last known backup revision and local recovery | Guest play remains usable; no automatic upload/restore or silent mutation retry. |

Use existing Chromium/WebKit tools as the first reproducible checks. Physical
iPhone/Android, human readability, listening and balance are separate evidence.
Do not add player telemetry or third-party analytics simply to obtain a local
development benchmark.

## Transfer provenance and limits

RXSG is a separate local restoration, not a dependency or an asset source for
Mythseal. The following are source-document identifiers from that project's
2026-09-21–29 work, summarized here so other agents do not need its workspace.
They are not links to files in this repository. No RXSG artwork, client binary,
player save, credential, screenshot or raw conversation is included.

- `evidence/upgrade-1.md`: measured login-screen transfer approximately
  21.54 MiB before, 12.28 MiB cold and 24 KB warm after; about 0.7 s initialization
  remained. These figures are RXSG-specific, not Mythseal performance evidence.
- `evidence/upgrade-3-bulk-goods.md`, `evidence/jewellery-bulk.md`: bounded item
  quantities and aggregate results. Jewellery used 40 native-oracle comparisons
  including the next RNG value. Duplicate-button suppression did not implement
  network replay deduplication.
- `evidence/upgrade-4-auto-build.md`, `evidence/upgrade-5-city-build.md`,
  `evidence/blueprints-auto-build.md`: scoped rules, reserves, precedence,
  separately enabled consumables and visible waiting reasons.
- `EQUIPMENT-CARE.md`, `OUTFITS.md`, `evidence/equipment-care.md`: exact-instance
  planning, stale previews, saved intent/results and stopping rules. MyISAM
  crash atomicity was not established; this remains a reason to use better
  transaction boundaries in new work.
- `MODULES.md`, `EXPEDITIONS.md`, `EVENTS.md`: distinguish working routes,
  incomplete trials and explicitly local adaptations; consume unique completion
  events for rewards. Full-stage fixture checks were not balance playtests.
- `PRESERVATION-PROJECT.md`, `UPGRADE-ROADMAP.md`: portable releases and a fair
  agent command surface remained plans. They are useful design questions, not
  evidence that those capabilities were already delivered.

An RXSG success justifies a Mythseal hypothesis and a bounded test. Mark a Q
packet complete only with evidence from Mythseal's own rules, saves and clients.
