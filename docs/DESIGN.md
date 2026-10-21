# 萬象契 · Mythseal battle rules and prototype choices

An original local browser game inspired by the resource management and bluffing in 神魔令. Characters, writing, art and card balance are newly created. This is a playable local game, not an authenticated reconstruction of the old server.

## Historical evidence and deliberate choices

Checked on 2026-09-21: the archived-style [神魔令 rules and FAQ](https://www.newton.com.tw/wiki/%E7%A5%9E%E9%AD%94%E4%BB%A4) describe a four-card draw, four single-use rounds, 12 starting life, faction activation from two differently named cards, and deterministic rooms with attack → lower stars → initiative as the tiebreak order. Its FAQ says higher total hand stars act first, with random first initiative for equal totals. An 8-card, 25-star format is listed. This is a secondary source, not a surviving original client.

The page and [神魔令2 reference](https://baike.so.com/doc/4167077-4367343.html) state “power × pill count” but do not explain whether that count includes an initial free pill. A bounded search did not establish the zero-spend convention. **This prototype explicitly uses power × (1 + pills spent)**, plus attack modifiers, so a zero-pill bluff still has base power. It does not claim that interpretation exactly matches the historical client.

Additional prototype choices: 12 starting pills; exact eight unique cards and a 25-star cap; Fury costs three additional pills and adds two damage; no random battle outcomes; powers, attacks and dealt damage have a minimum of one; healing and pill recovery cap at 12. v0.2 adds local progression and collectible rarity in `progression.mjs`; see [progression design](PROGRESSION.md). Online multiplayer, payments, poison and ability minimum variants remain outside this version.

## Round procedure

1. Both hands are public. Shuffle each eight-card deck independently and draw four without replacement. Higher total hand stars take initiative in round one; equal totals use one random coin toss. Initiative alternates in subsequent rounds.
2. The initiative holder commits first and reveals only their card; their pill spend and Fury stay hidden. When the AI leads it commits at round start. When the player leads, the AI can respond to their revealed card, passed explicitly as the optional third argument to `chooseAIMove(state, rng, revealedPlayerCardId)`. The policy otherwise receives only public life, pill reserves, hands, used cards, round and initiative. The UI must keep committed spending private until both sides have chosen and must not recalculate a committed AI move in response to player controls.
3. Each side selects one unused card, a non-negative integer pill spend, and optional Fury. Total cost is `spent + (fury ? 3 : 0)` and must fit the remaining reserve. A card may appear once per match.
4. Faction bonuses activate when the original four-card hand contains at least two differently named cards of the faction. A previously played ally still counts. Stop Ability affects only the character ability; faction bonuses remain active. Two Stop Abilities suppress each other simultaneously.
5. Apply own power increases, opposing power reductions, the `1 + spent` multiplier, own attack increases, and opposing attack reductions. Higher final attack wins; an attack tie goes to the lower-star card, then the initiative holder.
6. Both sides pay their entire committed cost, including Fury on a loss. The winner's base damage, character/faction increases and Fury are combined, then defender reductions are subtracted. At least one damage lands. Only the losing side takes damage.
7. Active victory healing and defeat pill recovery happen after damage. At zero life the match ends immediately after these effects; otherwise stop after four rounds. The higher remaining life wins; equal life is a draw. Unspent pills do not break a match tie.

`previewMove` deliberately omits unrevealed opposing effects. Its displayed attack and damage are estimates, not a guarantee. `resolveRound` computes both sides together, returns a new state, and includes full reveal information and readable effect notes.

## 同名傳承 · local, 2026-09-22

An owned copy can receive EXP from explicitly selected ordinary copies of the
same character (`cardId`). Each material provides **80 + its current EXP**;
the existing thresholds stay **0 / 80 / 200 / 400 / 700** for Lv.1–5. Legacy
and WX-01 base Wukong share the same character identity. This costs no coins
or dust. Existing paid upgrades, daily training and battle EXP are unchanged.

Any art treatment may be the receiving card. Only `base` printings may be
materials: AA, LAA, INK and TR are always protected, even if unlocked. Locked
copies, copies in any saved deck, unfinished battle/activity participants, unacknowledged
pack/box rewards and the displayed Leader cannot be consumed. A receiving card
in an unfinished battle/activity run or an unacknowledged receipt cannot inherit yet; a
locked or saved-deck receiving card may inherit. The receiving copy retains
its UID, printing, acquisition details, lock and battle history.

The player selects exact copies, sees their serials/printings/EXP and the
projected level and expedition stats, then confirms permanent consumption.
Materials do not enter merchant buyback. Partial overflow at 700 EXP is shown
before confirmation and discarded; a selection containing a wholly unnecessary
material is rejected. No materials are selected automatically. The survivor's
level bonus applies only in expedition, as before.

`inheritance.mjs` previews and revalidates the complete selected copy records
and current protections before returning an immutable replacement profile.
The app commits once under the existing native Web Lock, using a freshly read
save; cancellation while waiting, stale quotes and repeated confirmation cannot
consume another copy. Storage failure does not update the in-memory collection
or display success. No persistent schema field, save key or service changes are
needed. This remains local progression, not authoritative online card ownership.

## Collection layout and ink discovery · local, 2026-09-22

The backpack defaults to one stack per character, with total owned copies,
distinct printings, level range and lock/deck counts. A cosmetic cover favours
special art; it never changes the preferred training copy or active deck.
Opening a stack exposes individual UID cards and owned-print filters. Legacy
and WX-01 Wukong share one character stack but remain separate printing rows.
Search, locked and duplicate filters distinguish matching copies from total
ownership. Players may switch back to the flat copy grid; the deck editor
always chooses exact copies. Opening/closing stacks restores focus and scroll.

The character codex has stable numbers from the existing catalogue order,
chapter completion, and all/collected/missing filters. Uncollected cards use
grayscale art and a textual ink stamp, including hover, keyboard focus and
detail views. Names, lore and rules remain readable. A character is collected
when represented by an owned copy or a merchant-held copy; holding multiple
printings does not inflate the character total. Owned-copy counts exclude the
merchant vault. This is derived collection state, not a new permanent
discovered-printing ledger. Acquiring a character changes its presentation;
browsing or inspecting one never grants or modifies cards.

Grouping and view filters are transient UI state. No save keys, schemas,
currency rules, printing identities or battle snapshots change. Original art
is reused through CSS; there are no new bitmap assets or runtime dependencies.

## Original factions and atlas

| Column | Faction | Bonus | Row 0 | Row 1 | Row 2 |
| --- | --- | --- | --- | --- | --- |
| 0 | 雲闕 | Attack +6 | 青霄 · celestial sword guardian | 曜衡 · astral alchemist | 玄箋 · talisman oracle |
| 1 | 赤燼 | Damage +1 | 赤翎 · phoenix spear warrior | 焰心 · ember monk | 燼麟 · obsidian qilin |
| 2 | 月隱 | Opposing attack −6, min 1 | 霜璃 · fox enchantress | 渡影 · mist ferryman | 織夢 · dreamweaver |
| 3 | 森羅 | Incoming damage −1, min 1 | 蒼角 · ancient stag | 翠弦 · forest archer | 雲牙 · cloud tiger |

Artwork index is `row * 4 + column`. The starter deck uses the first two rows and totals 24 stars. All 12 original cards remain available without unlocking. v0.3 adds 12 classical cards in a separate atlas; four are welcome gifts and eight are collectible through packs or the NPC market. See [CHARACTERS.md](CHARACTERS.md).

## AI and fairness

The AI compares legal actions against a small weighted model of possible player cards and spends, valuing remaining health and pills. It varies between similarly scored plans with an injected random source. When following, it may narrow its card hypotheses to the explicitly revealed player card. It never inspects the pill slider, Fury toggle or hidden selection and cannot change its move after committing. A caller may pass a spend cap, the most one commitment may cost; it only narrows the AI's candidates and is used for one disclosed style, 緩渡, in the player's first battle at 霧隱渡口 ([O1](GENTLE-GUARDIAN-O1.md), on the branch `o1/gentle-guardian`). This is a compact heuristic, not a solved optimal strategy. Randomness affects the initial draw, an equal-star initiative coin toss and AI variety; round resolution itself is deterministic.

The engine has no DOM, storage, network, clocks or dependencies. `node --test tests/engine.test.mjs` exercises the rules, invalid actions, effect interactions, immutable inputs, seeded matches and the AI public-information boundary.

## Expedition ranks and fair battle modes

The local engine supports four explicit battle modes. `practice` remains the default for existing callers; `practice`, `arena` and `activity` use every card's original rank-one combat stats. `expedition` applies each side's public card ranks. This separation takes inspiration from a [returning-player discussion of 神魔令](https://forum.gamer.com.tw/C.php?bsn=17144&snA=33), whose indexed text describes forge enhancements affecting wilderness attack and damage. That is a historical clue, not proof of the original server's full upgrade rules. The rank table below is an original balancing choice, not a recovered formula.

| Rank | Additional power | Additional damage |
| --- | --- | --- |
| 1 | 0 | 0 |
| 2 | 1 | 0 |
| 3 | 1 | 1 |
| 4 | 2 | 1 |
| 5 | 2 | 2 |

Stars, faction membership and abilities stay unchanged at every rank. Therefore the eight-card, 25-star deck limit and initiative/star tiebreak rules are unchanged. Rank bonuses modify printed power and damage before ordinary abilities, faction effects, pills and Fury. Stop Ability does not cancel a rank bonus. The engine supports opponent ranks 1–5; the battle UI currently selects expedition opponents no higher than rank 3.

`createMatch` accepts `mode`, `playerLevels`, `opponentLevels` and optional `opponentName` alongside the existing deck and random-source arguments. These are top-level state fields. Rank maps use known card IDs and integer ranks 1–5; unknown IDs, invalid values and malformed maps are rejected. Missing entries normalize to rank 1. The match stores its own frozen copies, so later collection changes cannot alter an ongoing battle.

Only `activity` accepts `initialResources: {player: {hp, pills}}`: integer life
1–12 and pills 0–12. Invalid resources fail before drawing. The opponent always
starts at 12/12; omitted resources retain the ordinary 12/12 start. Carry-over
is an engine input, never an edit applied after a match has already begun.

`getBattleCard(state, side, cardId)` returns an immutable card with effective `power`, `damage` and `level`, plus `basePower` and `baseDamage`. In normalized arena/practice/activity play its effective `level` is 1 even when the stored collection rank is higher. Preview and reveal results use these same effective cards. Existing state objects without mode/rank metadata behave as rank-one practice matches.

The AI copies only known public rank entries and the public mode in addition to its existing public information. It evaluates the same effective stats as battle resolution, including stage enemies' upgrades; hidden choices, bids, Fury and unrelated collection/display fields are not copied or read. Rank upgrades do not weaken the AI's information boundary. Collection ownership, rank purchases, currency, rewards and stage unlocking belong to the separate progression module, not this combat engine.

## Campaign and activity settlement · local, 2026-09-22

The [implemented continuation](CAMPAIGN-AND-EVENTS.md) adds 48 battles in six
volumes after the original Westward ending, for 66 story encounters. Ordinary
story cultivation remains; the supplied chapter-seven deck works without owning
its companions and earns no persistent copy XP. Mastery accumulates win, life
at least 6 and pills at least 2 across wins. It never requires a lucky character
draw and does not gate the eight BASE milestones, six tickets or final AA choice.
The old 18 rewards and original four-stage AA claim stay separate and unchanged.

火焰山 chains three normalized battles with a frozen owned/loaner roster. Its
run saves three battle seeds and three loot seeds before entering. After a win,
life gains 2 (cap 12), pills rise to at least 8, then the player commits +4 life or
+4 pills; an ineffective choice is refused, while both full permits continue.
Loss/draw ends the attempt; abandonment pays nothing extra. Previous accepted
stage rewards stay banked. Owned played copies get 12/8 XP for win/loss-or-draw;
loaners neither mint cards nor award unrelated copies. Owned run UIDs remain
protected during supply too. Existing four-round rules and hidden information
boundaries are unchanged.

Stage loot uses 80% +2 dust, 15% +30 coins and 5% current-boss BASE, with a guaranteed
BASE on the 20th eligible win without one. Only natural/guaranteed loot resets
this family counter. First clear banks 牛魔王 BASE; weekly full clears 1/3 bank
one ticket each; five lifetime clears earn 借得東風. A run belongs to its start
week, banks that period's rewards, then rolls forward after termination. Campaign
completion earns 聽見萬聲. These are local rules, not server-verified achievements.

Profile v5 and snapshot v3 record strict expansion state. Unique grant IDs retain
BASE/AA entitlements until explicit delivery; `reward` receipts mint once without
pack counters. A `ticket` consumes one saved ticket, uses the existing WX pool
and dry protection, and earns one seal and pack-task increment for zero coins.
Receipt, capacity and quota failures leave the prior accepted state intact.
Hosted v3 remains gated off pending separate SQL application and verification.

A 200-run mirrored-public-AI loaner probe produced 16 full clears (8%); it is an
initial tuning observation, not a human success forecast. Browser acceptance is
in progress. Advanced difficulty, event art, seasonal rules and authoritative
PvP/ranked remain future work; no public release accompanies this implementation.

## Individual cards and battle experience · v0.4

The backpack gives each owned copy its own local UID, XP, level and history. A character ID still identifies its combat rules; it no longer identifies a shared pool of cultivation. Decks store eight specific UIDs, with unique character IDs and the same 25-star limit. `getDeckLevels()` supplies the active copies' ranks to the existing battle engine.

Starting a battle snapshots the eight UIDs and their character mapping. Settlement takes `match.player.used` and awards XP to those exact copies, even if a different deck became active in the meantime. Only cards actually played receive XP; an unused card in a hand or deck receives none. Reaching an XP threshold raises the level for future expeditions. The ongoing match keeps its frozen rank map, and pending cards cannot be sold or cultivated until settlement or abandonment.

NPC sale and buyback move the same card record between the backpack and merchant vault. The local identifier is useful for continuity, without blockchain. Server accounts, globally unique identities and authoritative ownership transfers are later work for genuine player-to-player trading. These mechanics and prices are original choices for this prototype; see [BACKPACK.md](BACKPACK.md) and [PROGRESSION.md](PROGRESSION.md).
