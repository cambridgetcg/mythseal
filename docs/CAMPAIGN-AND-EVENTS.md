# 西行續卷與活動對戰 · design proposal · 2026-09-22

The owner wants a longer main story and repeatable activities after repeatedly
clearing the current 18 encounters. They selected **火焰山三連戰** as the first
activity, including between-battle supplies and owned/loaner decks. This document
plans that expansion; it does not describe playable additions or adopted drop
rates. No runtime, player save, pack sampler or hosted service changes accompany
this design. Values below are initial playtest proposals.

## What makes the next journey different

The current four volumes contain 18 battles. Their story opponents still use
the original 24-card catalogue, although the local collection now has 39 rules
cards. `stories.mjs` supplies one deck per literary volume; `engine.mjs` uses a
shared AI policy. More nodes alone would repeat the same experience.

The next expansion should connect three reasons to play:

| Route | Player motivation | Character of the rewards |
| --- | --- | --- |
| 主線 · 西行續卷 | Follow companions through a complete story and build a useful roster | Guaranteed BASE characters, chapter pack tickets, lasting story milestones |
| 活動 · 火焰山三連戰 | Plan across three battles, choose supplies, try another deck | Clear prizes, targeted BASE drops and two weekly pack-ticket milestones |
| 異聞 · optional mastery | Revisit a scene with a different solution | Titles, journal entries and later event artwork; ordinary story progression needs only a win |

Keep the five main destinations. **遊歷** gets 主線 / 異聞 modules;
**對弈** gets 活動 / 擂台 / 切磋. A featured activity entry may also appear in
洞府. Existing viewport tabs/pages carry chapter lists and reward previews;
no new scrolling feed or sixth dock destination.

## Main story: six volumes, eight battles each

Working title: **西行續卷 · 無字經的回聲**. The four existing 西遊 encounters
remain the completed first journey, with their original clears and AA choice.
After returning, voices begin disappearing from the written scripture. The
party retraces the memories of people left along the road. These are original
game episodes inspired by the traditional setting, not a literal chapter order
or a rewrite of the existing ending.

Proposed scope: **48 new battles**, bringing the planned total to 66. Ship the
first eight as a complete volume before producing the other forty. Entry opens
after the existing `west-spirit-mountain` clear; previously cleared saves
qualify without replaying or reclaiming their old rewards.

| Volume | Setting and dramatic purpose | Guaranteed new-volume milestone |
| --- | --- | --- |
| 一 · 同行初誓 | 長安、鷹愁澗、雲棧、流沙; discover whose voice the scripture has lost | 唐三藏、白龍馬、豬八戒、沙悟淨 BASE at four separate milestones |
| 二 · 長春迷局 | 五莊觀; preserving a memory may also preserve someone's mistake | 鎮元大仙 BASE |
| 三 · 白骨三相 | 白骨嶺與平頂洞; three accounts of the same encounter | 白骨精 BASE |
| 四 · 翠雲借扇 | 火雲洞、翠雲山、火焰山; hear both sides of an old quarrel | 鐵扇公主 BASE |
| 五 · 真假同行 | 六耳與觀音; appearances agree while choices diverge | 六耳獼猴 BASE |
| 六 · 無字真經 | 雷音回響與歸途; companions decide what deserves to remain | Campaign title and one WX-01 AA choice |

Every volume also has one WX-01 pack ticket at its eighth clear. The full
campaign therefore proposes **eight fixed BASE copies, six tickets and one
AA choice**, alongside ordinary currencies. The final AA has its own claim ID;
it does not reset or replace the existing four-stage first-volume AA entitlement.
Owning a milestone character already grants a fresh exact BASE copy, which can
be kept or used in 同名傳承. The grant never consumes, upgrades or substitutes
an existing special printing.
Fixed character/AA claims do not advance pack opening totals, 西行印 or the
WX-01 dry counter; opening a ticket follows the pack rules below.

Each volume has five ordinary encounters, two distinct tactical encounters and
one finale. Short arrival/aftermath passages use dedicated scene modules and
can be reread. At least one late encounter must change a meaningful decision:
different legal opponent composition, an announced public condition, or a
companion challenge. Increasing enemy stats alone is insufficient.

### First volume to build

| Stage | Scene and playable purpose | Once-only character milestone |
| --- | --- | --- |
| 1 · 長安夜札 | Establish the missing voice; forgiving encounter teaches the chapter loop | 唐三藏 BASE |
| 2 · 鷹愁照影 | Compare attack bonuses with pill spending; introduce 白龍馬 in the opponent lineup | 白龍馬 BASE |
| 3 · 禪院餘燈 | A guarded opponent rewards saving resources for later rounds | — |
| 4 · 雲棧留客 | A high-power, modest-damage lineup changes bid values | 豬八戒 BASE |
| 5 · 黃風問路 | A power-reduction lineup asks the player to revise familiar bids | — |
| 6 · 流沙夜渡 | Refund-on-loss effects make sacrifice a useful option | 沙悟淨 BASE |
| 7 · 四人一願 | Optional supplied party deck lets everyone try the assembled companions | — |
| 8 · 燈外有聲 | Finale combines two earlier tactical ideas and opens the next volume | One WX-01 ticket |

All opponent and loaner decks must be legal eight-character, at-most-25-star
decks. Loaner access is temporary and never mints those cards. Chapter 7 must
remain completable if the player has sold or inherited a previously earned
companion. Keep ordinary story cultivation and the current Lv.5 cap; advanced
activities provide further challenge without immediately adding another XP tier.

Optional mastery marks are accumulated across attempts: win; satisfy one
clearly stated resource condition; complete a scene-specific challenge. They
do not all have to occur in one match. Do not attach a required reward to drawing
one particular card from a random hand; use a supplied/fixed scenario for such
challenges. Story branches may change dialogue, without hiding unique combat
cards behind irreversible choices.

## First activity: 火焰山三連戰

Three AI battles in one saved expedition: **紅孩兒 → 鐵扇公主 → 牛魔王**.
Each battle keeps four rounds and normal hidden bids. Distinct legal decks
emphasize burst damage, damage reduction/resource restraint, then sustained
pressure. The first prototype uses existing card effects. Announced hazards
and specialized AI policies are later experiments with separate rule versions.

- Start with a chosen owned deck or a supplied eight-card deck. Activity combat
  normalizes both routes to base card levels, with the same reward schedule.
  Show the actual loaner list before starting. Cosmetic printings add no power.
- Freeze the selected roster for the whole run. Redraw the four-card hand for
  each battle once and save it. The three bosses each start at 12 life/12 pills.
- The player starts at 12/12. After a win, carry life forward, restore 2 life
  (cap 12), and bring pills up to at least 8. Then choose **回春 +4 life** or
  **養息 +4 pills**, each capped at 12. Show the resulting totals before choosing;
  a choice that changes nothing is disabled. If both resources are full, offer
  「整備已足，繼續」. These recovery amounts need tuning.
- No entry fee, energy timer or entry-count limit. A loss/draw ends this attempt;
  previous stage rewards remain. An abandoned stage earns no reward. Retry starts
  a fresh run; continuing a saved run retains its opponents, hands and supplies.
- Between battles, 保存離開 returns to the lobby. Only one pending journey/run
  may own the active battle. Finish or explicitly abandon it before another mode.
- Owned-card XP goes only to the exact copies actually played. A loaner never
  gains persistent card XP or credits an unrelated owned copy. Initial proposal:
  owned played copies earn 12 XP for a stage win, 8 for a loss/draw; no award on
  abandonment. Normalization means that XP cannot improve the next stage's stats.

The battle sequence is 組牌 → 第一戰 → 補給 → 第二戰 → 補給 → 決戰 → 戰利品.
Keep life, pills and run stage visible; give the reward preview its own module.
After every stage, show what has already been banked and what still requires
the final boss. Do not imply that partial rewards will be lost by leaving.

Begin with one standard difficulty. Add **劫境** only after the loaner can
reasonably clear standard: stricter recovery or an explicitly displayed public
rule, with cosmetic mastery rewards. There is no human leaderboard or ranked
rating in this local activity. Weekly spotlight rules/prizes may rotate later;
the encounter and its lasting first-clear prizes remain in an activity archive.

## Rewards: a reliable path plus a small surprise

Use coins, dust, exact BASE copies, existing 西行印 and pack tickets. Do not add
a separate spendable currency for every activity. Existing AA/LAA/INK/TR pack
rates and redemption prices remain their own system; ordinary boss loot is BASE
only. Event artwork, when produced, needs a distinct printing ID and the same
special-printing material protection as the current collection.

### Starting reward budget — proposal, not current rates

| Source | Proposed reward | Frequency |
| --- | --- | --- |
| New main-story battle win | 60 coins + 3 dust + 30 hero XP; 20 XP per actually played owned copy | Every win |
| New main-story first clear | Additional 90 coins + 5 dust + 40 hero XP | Once per new stage |
| New-volume finale | One WX-01 ticket; character milestones follow the tables above | Once per volume |
| Entire new campaign | One selected WX-01 AA and a title | Once |
| Activity stage win | 60 coins + 3 dust + 30 hero XP, plus one bonus-loot outcome | Every accepted stage win |
| Activity loss/draw | No currency/loot roll; retain prior stage earnings and the specified owned-copy XP | Per completed lost/drawn stage |
| First full 火焰山 clear | 牛魔王 BASE and a permanent clear emblem | Once per activity family |
| Weekly activity milestones | One WX-01 ticket at 1 full clear, another at 3 full clears | At most two tickets/week, across deck routes/difficulties |
| Five lifetime full clears | Cosmetic title「借得東風」; event alternate art is a later authored milestone | Once per activity family |

The 48-stage campaign's direct first-pass budget is **7,200 coins, 384 dust,
3,360 hero XP and six tickets** before existing daily/weekly claims. At the
current 300-coin pack price, that is 24 coin-funded packs plus six tickets:
**30 pack-equivalents**, plus eight BASE milestones and one AA choice. This is
a budget comparison; coins can instead be spent on cultivation or other items.

Do not copy the current per-node daily-cache bonus onto all 48 new stages.
Current 18-node immediate replays already yield 2,340 coins/60 dust; one later-day
first win at every node yields 4,395/177, before login/tasks. Preserve those
existing rewards. New chapter/weekly milestones should reward meaningful
completion without creating another daily tour of dozens of identical claims.

### Targeted activity loot

After a stage win, propose one extra outcome, independent of the guaranteed
reward above:

| Outcome | Natural probability | Contents |
| --- | --- | --- |
| 靈砂 | 80% | +2 dust |
| 行囊小財 | 15% | +30 coins |
| 守關者本畫 | 5% | That stage's boss BASE: 紅孩兒, 鐵扇公主 or 牛魔王 |

After **19 eligible victories without a BASE drop, the 20th grants the current
stage's BASE** instead of rolling the table. A natural/guaranteed loot copy resets
this counter; fixed first-clear gifts, losses and pack contents do not. Keep the
counter across retries, weeks and activity reruns under one family ID. Show its
progress and the exact next boss's printing before entering. A player may choose
which boss to pursue near the guarantee; that is an intended targeting option.

The natural table averages +1.6 dust, +4.5 coins and 0.05 BASE copies per victory.
The guarantee increases the long-run card rate; do not display the natural 5%
as the guaranteed system's overall rate. Publish both natural odds and the
guarantee rule. The expected interval is `(1 - 0.95^20) / 0.05 = 12.8303`
victories per BASE. Long-run outcomes become approximately **77.6471% dust,
14.5588% coins and 7.7941% BASE**, or +1.55294 dust and +4.36765 coins per victory.
BASE describes the artwork treatment, not the card's rarity; these three bosses
are 靈品. Tune after observing actual clears and inheritance progress.

### Pack tickets

A ticket opens the existing WX-01 three-card pool: same ordinary/special/god
rules, shared twelve-pack dry protection, +1 西行印 and the normal pack-task
increment. Earning a ticket does not roll cards or advance those counters;
opening it consumes exactly one ticket, charges zero coins, and stores the exact
grant before any reveal. Tickets do not expire. They are opened explicitly in
市集, so an activity prize never replaces an already pending pack receipt.

First implementation needs a proper ticket funding/receipt contract. The current
WX-01 validators require a pack receipt's cost to be exactly 300 coins; simply
passing zero into today's purchase function is invalid. Extending the receipt,
profile and cloud formats coherently is required before ticket grants ship.

## Implementation contract and release slices

Preserve the old 18 node IDs, prerequisite chains, clears, original rewards and
four-stage 西遊 AA claim. In particular, the existing claim checks exactly four
`westward` story nodes: put the continuation in a separate volume/campaign ID
and explicit entitlement list rather than silently appending to that array.

Separate content definitions from settlement. Proposed modules are
`campaign-content.mjs` (chapters/objectives), `activity-content.mjs` (versioned
boss/loaner definitions) and a pure activity/reward state module. Their names are
design placeholders. `progression.mjs` continues to own atomic profile changes;
`engine.mjs` needs explicit supported starting resources for carry-over, rather
than UI-only resource edits. Keep AI blind to the player's hidden bid/Fury.

Persist a run ID, activity/rule version, frozen roster/owned UID mapping or a
separate loaner identity, current stage, resource totals, committed supply choice,
saved battle and settled-stage IDs. Persist new milestone claims, tickets,
family loot counters and weekly activity clears. A run spanning Monday belongs
to its start-week for weekly prizes; retain its claim period until resolved so
reload or rollover cannot duplicate or erase it. Existing generic match tasks
still count each settled battle; activity does not count as story or AI arena.

Each reward uses a unique source/claim key. Bank an earned character entitlement
when collection capacity or an existing reveal prevents immediate delivery;
claims mint once after capacity/byte checks. Bound this pending-grant ledger
and preflight its capacity before starting another eligible stage. A completed
reward must never be discarded to make space. Persist a stage's reward seed at
start and derive the loot once at accepted settlement, storing the outcome and
next pity state. A reload displays the saved outcome; a failed write/retry cannot
reroll it. A write/quota failure cannot consume the pending battle, reset pity
or show an accepted reward. Old receipts, locked cards, displayed Leaders,
AA/TR material protection and exact-copy histories survive.

New state cannot be ignored by today's strict `profile-store.mjs`,
`wx01-state.mjs` or `cloud-save.mjs`. Specify a versioned migration and backup
compatibility fixtures before implementation, retain original source saves,
reject malformed newer records without creating a starter, and keep hosted
schema/client rollout separate. Local play remains offline progression.

| Slice | Concrete deliverable | Acceptance evidence |
| --- | --- | --- |
| A · Reward/run foundation | Versioned activity state, exact grants, BASE claim/ticket receipts, compatible save upgrade | Legacy v3/v4 copies/decks/receipts preserved; capacity/quota failures; duplicate settlement/claims; fixed RNG and pity boundaries; backup round trips |
| B · 火焰山 standard | Three real boss battles, supplies, owned/loaner routes, resume, reward preview and first/weekly prizes | Full win/loss/draw/abandon; both supply choices; no loaner mint/XP; mid-run reload/rollover; hidden-bid boundary; legal decks; six-size Chrome/WebKit navigation |
| C · 主線第一卷 | Eight authored encounters, four companion grants, volume ticket and rereadable scenes | Old completion/AA entitlements untouched; correct unlocks; sold companion loaner path; once-only milestones; complete first-volume playthrough |
| D · Remaining five volumes | Forty more encounters, optional mastery and authored event cosmetics | Each volume has a distinct decision; tested prize totals; readable chapter paging; character/printing provenance; human balance review |

Implementation order starts with the chosen activity, alongside the first
volume's writing. Later candidates: daily fixed-deck puzzles, a second themed
activity, boss-specific public hazards and advanced difficulty. Online PvP/ranked
remain on their existing authoritative-server track.

## Evidence for this design pass

Read-only review of `stories.mjs`, `progression.mjs`, `engine.mjs`,
`wx01-cards.mjs`, `wx01-state.mjs`, `profile-store.mjs` and `cloud-save.mjs`
established the baseline and compatibility limits. Budget arithmetic was checked
against pure content data; no personal browser profile or service was accessed.
This document and roadmap updates do not require a game build or browser rerun.
The proposal is not evidence of encounter balance, new artwork, implemented
loot, a playable activity or a release.
