# 西行續卷與活動對戰 · local implementation · 2026-09-22

The approved expansion is implemented in local source: **48 new campaign battles
plus the original 18**, and **火焰山三連戰** with saved supplies and owned/loaner
decks. This supersedes the proposal at `b854b0b`. Rewards and recovery values below
are the initial implemented tuning. Browser acceptance has passed in isolated Chromium and WebKit contexts;
local implementation does not establish human balance or hosted readiness.
Public **v0.5.1 is unchanged**. No deployment or live SQL application accompanies
this work.

## What makes the next journey different

The four original volumes retain their 18 battles and rewards. Six new volumes
use the local 39-card catalogue and 48 distinct legal opponent compositions.
`engine.mjs` retains its public-information AI and four-round hidden bids.

The expansion connects three reasons to play:

| Route | Player motivation | Character of the rewards |
| --- | --- | --- |
| 主線 · 西行續卷 | Follow companions through a complete story and build a useful roster | Guaranteed BASE characters, chapter pack tickets, lasting story milestones |
| 活動 · 火焰山三連戰 | Plan across three battles, choose supplies, try another deck | Clear prizes, targeted BASE drops and two weekly pack-ticket milestones |
| 異聞 · optional mastery | Revisit a scene while preserving resources | Three cumulative marks; ordinary story progression needs only a win. New journal rewards/event artwork remain future work. |

The five main destinations stay. Campaign, mastery, activity and reward views
use the shared viewport modules/pages; there is no sixth dock destination.

## Main story: six volumes, eight battles each

**西行續卷 · 無字經的回聲**. The four existing 西遊 encounters
remain the completed first journey, with their original clears and AA choice.
After returning, voices begin disappearing from the written scripture. The
party retraces the memories of people left along the road. These are original
game episodes inspired by the traditional setting, not a literal chapter order
or a rewrite of the existing ending.

All **48 new battles** are implemented, bringing the local total to **66**. Entry opens
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
campaign awards **eight fixed BASE copies, six tickets and one
AA choice**, alongside ordinary currencies. The final AA has its own claim ID;
it does not reset or replace the existing four-stage first-volume AA entitlement.
Owning a milestone character already grants a fresh exact BASE copy, which can
be kept or used in 同名傳承. The grant never consumes, upgrades or substitutes
an existing special printing.
Fixed character/AA claims do not advance pack opening totals, 西行印 or the
WX-01 dry counter; opening a ticket follows the pack rules below.

Each volume has five ordinary encounters, two tactical encounters and a finale,
with arrival/aftermath writing and a distinct opponent composition. Current
tactics use existing effects and public roster information; special hazards,
new combat rules and boss-specific AI policies are not implemented.

### First volume

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

All opponent and loaner decks are legal eight-character, at-most-25-star
decks. Loaner access is temporary and never mints those cards. Chapter 7 must
remain completable if the player has sold or inherited a previously earned
companion. Ordinary story cultivation and the Lv.5 cap remain unchanged.

Optional mastery accumulates across wins: **win**, **finish with at least 6 life**,
and **finish with at least 2 pills**. The two reserve marks need not occur in the
same attempt. No mark or required grant depends on drawing a particular character.
Finishing all 48 stages awards the title **聽見萬聲**; mastery is not an extra gate
for the BASE copies, tickets or AA choice.

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
- Between battles, 保存離開 returns to 對弈. Only one pending journey/run
  may own the active battle. Finish or explicitly abandon it before another mode.
- Owned-card XP goes only to the exact copies actually played. A loaner never
  gains persistent card XP or credits an unrelated owned copy. Played owned copies
  earn 12 XP for a stage win, 8 for a loss/draw; no award on
  abandonment. Normalization means that XP cannot improve the next stage's stats.

The battle sequence is 組牌 → 第一戰 → 補給 → 第二戰 → 補給 → 決戰 → 戰利品.
Keep life, pills and run stage visible; give the reward preview its own module.
After every stage, show what has already been banked and what still requires
the final boss. Do not imply that partial rewards will be lost by leaving.

One standard difficulty is implemented. Add **劫境** only after the loaner can
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

### Implemented initial reward budget

| Source | Reward | Frequency |
| --- | --- | --- |
| New main-story battle win | 60 coins + 3 dust + 30 hero XP; 20 XP per actually played owned copy | Every win |
| New main-story first clear | Additional 90 coins + 5 dust + 40 hero XP | Once per new stage |
| New-volume finale | One WX-01 ticket; character milestones follow the tables above | Once per volume |
| Entire new campaign | One selected WX-01 AA and a title | Once |
| Activity stage win | 60 coins + 3 dust + 30 hero XP, plus one bonus-loot outcome | Every accepted stage win |
| Activity loss/draw | No currency/loot roll; retain prior stage earnings and the specified owned-copy XP | Per completed lost/drawn stage |
| First full 火焰山 clear | 牛魔王 BASE and a persistent first-clear record | Once per activity family |
| Weekly activity milestones | One WX-01 ticket at 1 full clear, another at 3 full clears | At most two tickets/week, across deck routes/difficulties |
| Five lifetime full clears | Cosmetic title「借得東風」; event alternate art is a later authored milestone | Once per activity family |

The 48-stage campaign's direct first-pass budget is **7,200 coins, 384 dust,
3,360 hero XP and six tickets** before existing daily/weekly claims. At the
current 300-coin pack price, that is 24 coin-funded packs plus six tickets:
**30 pack-equivalents**, plus eight BASE milestones and one AA choice. This is
a budget comparison; coins can instead be spent on cultivation or other items.

The new 48 stages have **no daily-cache bonus**. The original 18 retain their
existing rewards and cache rules. Campaign wins still count toward ordinary
expedition tasks; activity stages count toward generic matches only.

### Targeted activity loot

After a stage win, one extra outcome is selected independently of the guaranteed
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

Ticket receipts use `kind: ticket`, cost 0 and one earned seal. Fixed character
or AA deliveries use `kind: reward`, cost 0 and no seal. Both are explicit v5
receipt kinds; existing paid/box/redeem/story receipts retain their contracts.
Earning tickets does not replace an existing receipt or require a free card slot.

## Save and settlement contract

Preserve the old 18 node IDs, prerequisite chains, clears, original rewards and
four-stage 西遊 AA claim. In particular, the existing claim checks exactly four
`westward` story nodes: put the continuation in a separate volume/campaign ID
and explicit entitlement list rather than silently appending to that array.

`campaign-content.mjs` owns 48 nodes and six worlds; `activity-content.mjs` owns
the versioned three-boss/loaner definition. `expansion-state.mjs` strictly
validates run/reward state, while `progression.mjs` owns atomic changes.
`engine.mjs` accepts `mode: activity` and explicit player starting resources;
other modes retain their starting-resource behavior. The AI remains blind to
the opponent's hidden bid/Fury.

The saved run includes its ID, activity/rule version, frozen roster/owned UID mapping or a
separate loaner identity, current stage, resource totals, committed supply choice,
saved battle seeds and settled-stage IDs. The profile retains milestone grants,
tickets, family loot counters and weekly activity clears. A run spanning Monday belongs
to its start-week for weekly prizes; retain its claim period until resolved so
reload or rollover cannot duplicate or erase it. Existing generic match tasks
still count each settled battle; activity does not count as story or AI arena.

Each character reward uses a unique source/claim key and enters a pending ledger;
explicit claims mint once after capacity/byte checks. The ledger holds at most
256 grants and is preflighted before starting another eligible stage. A completed
reward is never discarded to make space. All three battle and loot seeds are
saved at run entry; settlement derives and records the outcome and next pity
state. A reload displays the saved outcome; a failed write/retry cannot
reroll it. A write/quota failure cannot consume the pending battle, reset pity
or show an accepted reward. Old receipts, locked cards, displayed Leaders,
AA/TR material protection and exact-copy histories survive.

Profile **v5** uses `shanhai.profile.v5`, battle v5 and recovery v5 keys;
collection v2 and WX state v1 remain unchanged. Migration retains v4/v3/v2
sources, exact copies, old receipts and pending battles. Strict new records
fail closed instead of becoming a starter. Frozen owned activity copies remain
protected from sale, training and inheritance during supply as well as battle.

Cloud snapshot **v3/profile-v5** is additive to v1/profile-v3 and v2/profile-v4.
An active activity run blocks cloud replacement/upload even between battles.
The source includes the additive [journey-v3 migration](../supabase/migrations/20260923000000_campaign_journey_v3.sql);
`JOURNEY_V3_ENABLED` stays false/absent until separate hosted application and
verification. The preceding journey-v2 gate remains applicable too. No live SQL
was applied here. A future release still needs a coherent versioned client
module graph, compatible Worker rollout and hosted preservation evidence.

## Verification and remaining work

| Local component | Implemented scope | Verification boundary |
| --- | --- | --- |
| A · Reward/run foundation | Versioned activity state, exact grants, BASE claim/ticket receipts, compatible save upgrade | Legacy v3/v4 copies/decks/receipts preserved; capacity/quota failures; duplicate settlement/claims; fixed RNG and pity boundaries; backup round trips |
| B · 火焰山 standard | Three real boss battles, supplies, owned/loaner routes, resume, reward preview and first/weekly prizes | Full win/loss/draw/abandon; both supply choices; no loaner mint/XP; mid-run reload/rollover; hidden-bid boundary; legal decks; six-size Chrome/WebKit navigation |
| C · Full campaign | All six volumes/48 stages, eight BASE grants, six tickets, separate AA choice and mastery | Unit settlement proves the complete budget; browser chapter/reward navigation and human playtesting remain separate evidence |

Relevant checks: [domain and reward invariants](../tests/expansion-progression.test.mjs),
[authored content](../campaign-content.mjs), [engine carry-over](../tests/activity-engine.test.mjs),
[saved lifecycle/quota](../tests/profile-store.test.mjs) and [snapshot compatibility](../tests/cloud-save.test.mjs).
The six-size browser matrix and real three-battle/claim flows pass in Chromium
and WebKit. See the [final integration evidence](VALIDATION.md#campaign-and-fire-mountain--2026-09-22)
for the test counts, subsequent retry/layout fixes and remaining hosted/device boundaries.

A bounded simulation completed **200 seeded loaner runs**, using the existing
AI mirrored for the player, with only public card reveals and no hidden-bid access.
Supplies chose life below 8 HP, otherwise pills, and continued without supply
only when both resources were full. Full clears: **16/200 (8%)**. Stage wins:
**122/200**, **56/122**, **16/56**. This shows the initial standard can be won and
that the final boss filters many surviving runs. It is not a human clear-rate
forecast or proof of satisfactory balance; no tuning followed this probe.

Advanced difficulty, new event artwork, seasonal rules/prizes, fixed-deck
puzzles and boss-specific public hazards remain future work. Real PvP/ranked
still depends on the authoritative-server track. No new event art, paid
currency, server authority or native release was added.
