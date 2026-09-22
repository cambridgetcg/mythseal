# WX-01 · 西行・萬象初章

Status: **playable local implementation; not deployed**, 2026-09-22.
The owner chose **西遊記 first, then other series**. This document fixes a useful
working direction. All 15 new rules cards, owned printings and the earned-coin
booster are implemented locally; their initial stat budgets still need human
balance playtests. The same-day [rate specification](WX01-DROP-RATES.md) describes
the runtime sampler and finite choice routes. The owner chose cosmetic 領契
first and battle Leader rules later. Public v0.5.1 remains unchanged.

## The promise

A party travelling together, a world full of temptation, and an unruly hero
learning what he wishes to protect. Collect a scene because it stays with you.
Spectacular cloud battles sit beside a quiet departure, a horse reflected as a
dragon, and a traveller resting beside the luggage.

Scope: **16 base identities = 15 new characters + the existing Wukong**.
**6 alternate arts + 4 Leader Art portraits + 2 ink-scroll prints + 1 treasure
= 13 special printings**. Thus the updated set checklist has **29 printings of
16 gameplay identities**, up from the first visual draft's 25. The game
has grown locally from 24 to 39 characters. Special printings do not increase that count.

The local game includes the third pack, saved card-by-card opening, seal and
story choices, exact-copy treatment display and owned LAA lobby selection.
The earlier interactive, fixed-content opening remains at `/atelier.html`.
The atelier consumes no currency, grants no copies, and reads/writes no saves.
The original two playable packs retain their original pools and draw rules.

## What the One Piece references teach us

These are observations from Bandai's English product pages, checked 2026-09-22,
not an attempt to reproduce all regional rarity terminology.

- [OP-06](https://en.onepiece-cardgame.com/products/boosters/op06.php) lists
  ordinary rarity categories, Special Cards and a Treasure Rare in one release.
- [PRB-01](https://en.onepiece-cardgame.com/products/boosters/prb01.php) revisits
  established cards with new, full-art illustrations.
- [OP-09](https://en.onepiece-cardgame.com/products/boosters/op09/) shows
  manga-derived leader images, super alternate art, decorative SP designs and
  a gold parallel. Distinct compositions and materials make each treatment legible.

Our design inference: separate **which card it is**, **its existing collection
rarity**, and **how this copy was illustrated/finished**. We use original Chinese
visual motifs and our own illustrations. No One Piece art, logos, borders or
characters enter the game. Product checklists do not establish pull rates, and
we do not borrow unverified case/box odds from collector posts.

## Rarity and printing language

Retain `common / rare / epic` and the names **凡品 / 靈品 / 神品**. Existing
rarity classifications, prices and pack outcomes remain unchanged. Do not add
a long new rarity ladder merely to fit every surface treatment.

| Layer | Visual language | What it means |
| --- | --- | --- |
| 凡品 | Aged bronze, restrained single line, angular corners, 凡 mark | Existing common collection rarity |
| 靈品 | Pale silver-jade, carved corner detail, 靈 mark | Existing rare collection rarity |
| 神品 | Antique gold, nested/extended corners, 神 mark | Existing epic collection rarity |
| 本畫 · BASE | Framed character portrait | Standard printing |
| 異畫 · AA | Full scene, open edges, character-specific composition | A different illustration of the same rules card |
| 領契 · LAA | Character portrait and faction crest, composed for lobby/deck identity | Cosmetic Leader Art; no Leader battle mechanic |
| 墨卷 · INK | Warm paper, black brush/woodcut marks, small vermilion accents; sequential vignettes | Our original illustrated-scroll answer to manga treatments |
| 天工 · TR | Deep lacquer, gold leaf, bronze relief and jade inlay | A treasure treatment, not a new combat rarity |

Faction remains visible as its own icon/name/colour. Five stars still mean the
five-star deck cost, not five tiers of collectible rarity. Treatment labels
always accompany colour; readable names, values and skills take precedence over
foil. No default perpetual shine or automatic device-motion access. Any later
sheen is brief on a deliberate reveal/inspection and has a static equivalent.

All five Wukong treatments use the current **5 stars, power 7, damage 6,
破妄 · 封鎖技能**. No special printing adds a stat, extra turn, bonus XP or hidden
match advantage. Each owned copy trains individually under existing rules.

## Base checklist — implemented candidate balance

All factions and roles below are Mythseal interpretations, not canonical novel
allegiances. Names and episodes derive from the classical text. The runtime
values are in [wx01-cards.mjs](../wx01-cards.mjs); the existing Wukong remains
unchanged in [engine.mjs](../engine.mjs). These initial budgets use existing
effects and have targeted rules tests, not a claim of complete competitive balance.

| Number | Character | Faction | Rarity | Stars | Implemented role / existing effect vocabulary |
| --- | --- | --- | --- | ---: | --- |
| WX01-001 | 唐三藏 | 雲闕 | 凡品 | 2 | Modest contest, life recovery · healOnWin |
| WX01-002 | 白龍馬 | 雲闕 | 凡品 | 2 | Low-bid tempo · flat attack |
| WX01-003 | 觀音 | 雲闕 | 神品 | 4 | Shelter against a heavy hit · reduceDamage |
| WX01-004 | 菩提祖師 | 雲闕 | 凡品 | 3 | Control an expensive bid · opponentPower |
| WX01-005 | 孫悟空 | 赤燼 | 神品 | 5 | Existing card unchanged · stopAbility |
| WX01-006 | 紅孩兒 | 赤燼 | 靈品 | 3 | Fire-pressure finisher · damage |
| WX01-007 | 黃風怪 | 赤燼 | 凡品 | 2 | Disrupt an opposing multiplier · opponentPower |
| WX01-008 | 金角大王 | 赤燼 | 靈品 | 3 | Efficient attack pressure · opponentAttack |
| WX01-009 | 白骨精 | 月隱 | 靈品 | 2 | A credible feint · refundOnLoss |
| WX01-010 | 鐵扇公主 | 月隱 | 靈品 | 3 | Defensive bluff · reduceDamage |
| WX01-011 | 銀角大王 | 月隱 | 凡品 | 2 | A compact skill interrupter · stopAbility |
| WX01-012 | 六耳獼猴 | 月隱 | 神品 | 4 | A threatening duel beneath deceptive art · power |
| WX01-013 | 豬八戒 | 森羅 | 凡品 | 3 | Dependable middle-cost fighter · power |
| WX01-014 | 沙悟淨 | 森羅 | 凡品 | 2 | Save resources for later rounds · refundOnLoss |
| WX01-015 | 牛魔王 | 森羅 | 靈品 | 4 | Substantial finishing threat · damage |
| WX01-016 | 鎮元大仙 | 森羅 | 凡品 | 3 | Endurance through a won contest · healOnWin |

Totals: **8 凡品 / 5 靈品 / 3 神品; four characters per faction**.
Rarity describes collection distribution, not a figure's status in the novel.

Faction star totals: 雲闕 11, 赤燼 13, 月隱 11, 森羅 12. All six possible
4+4 two-faction decks therefore cost 22–25 stars. This is
a construction check, not balance evidence. Four cards per faction do not make an
eight-character mono-faction deck; existing cards remain useful.

Initial power/damage pairs in checklist order are **5/3, 5/2, 6/4, 6/3, 7/6,
6/4, 6/2, 6/5, 5/3, 6/4, 5/2, 7/4, 7/3, 6/2, 6/5, 6/3**. Exact effect values
and descriptions live beside those cards, avoiding a second rules authority.

Balance watchlist: two-star 銀角 uses 5/2 and Stop Ability; the targeted test
covers its zero-pill tie advantage and paid-pill disadvantage against 霜璃.
Also playtest 菩提's power reduction, 觀音's damage reduction and 鎮元's healing
against the legacy roster. Passing effect/cap/AI tests does not establish fairness.

Keep the first set within the current effect vocabulary. Do not introduce a
resurrection zone, extra rounds, mind-reading bids or hidden-choice copying just
because a character can do extraordinary things in the novel. Distinct stats,
faction interactions and cost efficiency must justify each eventual new card;
reject strict upgrades over existing cards at equal star cost.

## Special-print checklist

These names describe illustrations, not additional gameplay identities.

| Print | Character | Scene and composition | Progress |
| --- | --- | --- | --- |
| WX01-005-AA1 | 孫悟空 · 踏碎凌霄 | Diagonal staff and crimson silk against a vast teal cloud gate | Earlier image reused |
| WX01-001-AA1 | 唐三藏 · 長安啟程 | A small traveller at monumental city gates; warm robe, morning silence | Local asset |
| WX01-002-AA1 | 白龍馬 · 鷹愁照影 | Horse above clear water, dragon reflected below | Local asset |
| WX01-013-AA1 | 豬八戒 · 行囊旁的月亮 | Rake and luggage at rest; the weary traveller gets a gentle moment | Local asset; original interlude |
| WX01-003-AA1 | 觀音 · 甘露回春 | Willow, falling drops and a vast tree returning to life | Local asset |
| WX01-010-AA1 | 鐵扇公主 · 翠雲一扇 | Fan opens across the frame; wind, green mountain, distant heat | Local asset |
| WX01-001-LAA1 | 唐三藏 · 一願西行 | Composed frontal portrait, robe and a narrow dawn road | Local asset |
| WX01-005-LAA1 | 孫悟空 · 我自齊天 | Defiant close gaze, upright staff and cloud engraving | Local asset |
| WX01-009-LAA1 | 白骨精 · 千面一念 | Face, veil and a reflected silhouette | Local asset |
| WX01-015-LAA1 | 牛魔王 · 萬妖共主 | Broad horns and mountain banners | Local asset |
| WX01-005-INK1 | 孫悟空 · 大鬧天宮 | Hero with original cave, sea-palace and heavenly-conflict vignettes | Earlier image reused |
| WX01-012-INK1 | 六耳獼猴 · 二心三界 | Paired silhouettes through heaven, the underworld and 雷音 | Local asset |
| WX01-005-TR1 | 孫悟空 · 定海神珍 | The upright staff in a dark sea palace; lacquer, carved gold and jade | Earlier image reused |

Wukong deliberately anchors all five treatments so we can compare them side by
side. Other AA subjects include low-star/common cards: a favourite illustration
should not require choosing a high-star combat role. The quiet 八戒 scene is an
invented interlude, not a claimed quotation or specific documented chapter scene.

Base Wukong reuses the unchanged classic atlas tile. The other **15 base
illustrations + 13 special illustrations** are now supplied by **14 new files**
(four 2×2 atlases containing 15 used cells, plus ten individual special images)
and the **three earlier Wukong images**. Thus 25 new illustrated subjects/scenes
are represented by 14 new files; there is no claim of 25 new standalone images.
See [ART-WX01.md](ART-WX01.md) for the built-in generation prompts and mappings.
The underlying model identifier was not exposed. Packaging/key art remains a
separate deliverable; the market preview reuses catalogue art.

## Booster and collection experience

Implemented local product: **西行秘匣**, set `wx01`, earned coins,
**300 coins / 3 cards**, selected from the market alongside the two legacy packs.

The [rate specification](WX01-DROP-RATES.md) supersedes the earlier
character-first treatment proposal. It chooses one natural whole-pack outcome:
83.70% standard, 12.50% AA, 2.50% cosmetic LAA, 1.00% TR, 0.25% INK and 0.05%
神契匣 (AA + LAA + INK, three distinct characters). A twelve-pack dry-streak cap
promotes an otherwise ordinary result to AA; special outcomes keep their identity.
These are local Mythseal runtime rates, not deployed-site or Bandai manufacturer rates.

Ordinary packs retain the 60/30/10 base rule and third-slot guarantee. Single-
special packs preserve their chosen illustration and upgrade the second standard
slot if needed to retain at least one 靈品/神品. This intentionally changes the
WX-01 character distribution; the original two packs are unaffected.
The original **52.8/35.4/11.8** slot average describes only ordinary packs, not
the full WX-01 mix. Exact per-print, rarity and protected frequencies
are calculated by the offline model linked in the rate specification.

Implemented grants and presentation follow-ups:

- First Westward-volume completion offers one non-expiring AA choice. Each pack
  grants one 西行印; the existing ten-match weekly claim grants five. Redeem an
  exact AA/LAA/TR/INK for 20/40/100/200 印 respectively; 印 are consumed, cards
  are not. Previously cleared profiles qualify; `storyClaimed` prevents a second
  grant. Already claimed legacy weekly goals receive no retrospective 印.
- A pack reward is a new UID at Lv.1/0 XP. A variant is not a new skin silently
  applied to a trained existing copy, and it does not inherit that copy's XP.
- Duplicates remain distinct cards. Let the player inspect/lock/keep/sell; no
  automatic conversion. Follow-up: distinguish “新版本” from “新角色” in
  first-acquisition notices without redrawing or regranting saved results.
- Exact-copy displays retain version, XP and UID; deck duplicate detection stays
  at the character/rules identity. A complete base-character checklist and a
  separate treatment-completion checklist remain presentation follow-ups.
- Unowned art previews explain what a player is collecting without presenting
  it as something already owned. Avoid false stock limits, resale promises or
  scarcity countdowns.

Opening: sealed packet → short paper/foil release → three face-down cards →
player-chosen reveal → a calm collection summary. A rare reveal earns a brief
pause and soft material sound, not a long mandatory celebration. Skip/fast/
reduced motion all show the same already-saved result. The real opening commits
cost, three UIDs, dry/印 counters and a receipt before animation; reload resumes
that receipt. Unacknowledged receipts block further pack/redemption/story grants;
acknowledgement clears only the matching receipt. Its exact copies are protected
from sale until confirmation. The displayed LAA copy is also protected until unset.

The separate atelier demonstration is fixed content and has no RNG, payment or receipt.
Its title and controls say so. It cannot be used as evidence of pull rates.

## Copy identity, migration and the hosted release gate

Keep three identities distinct:
- `cardId`: rules and same-character deck restriction, e.g. `wukong`.
- `uid`: the exact copy that earned its own XP and history.
- `printId`: an immutable catalogue binding such as
  `wx01-005-ink1` → cardId, set, treatment, art, frame and display label.

`printing-catalogue.mjs` separates printings from rules and owns atlas coordinates.
Copies of the original 24 characters migrate to `legacy/<cardId>`, including existing Wukong;
they are not relabelled as new WX-01 acquisitions. `artSet` is not a treatment.

Local profile **v4**, collection **v2**, uses **`shanhai.profile.v4`** and matching
v4 battle/recovery keys. `profile-store.mjs` reads v3/v2 deliberately, preserves
the source keys, validates canonical records before writing and blocks malformed
or unsupported current data. Legacy UIDs, XP, vault history and decks survive;
the 15 new identities start unowned. Required v4 print IDs must bind to their
card IDs. `pending.cardPrints` freezes presentation alongside the participating
UIDs, so changing an active deck cannot change the saved battle's artwork.

The source cloud adapter supports **v1/profile-v3** and **v2/profile-v4** envelopes.
Validation returns an old valid payload unchanged; explicit restoration upgrades
it locally. V2 permits 10,000 owned plus vault copies and 4 MiB of bounded JSONB
text accounting. Grants preflight copy capacity; the store checks the final
envelope and browser write before the UI treats the action as committed.

**Hosted compatibility remains gated.** Public v0.5.1 and its existing database
remain unchanged. The additive SQL file
[20260922210000_wx01_journey_v2.sql](../supabase/migrations/20260922210000_wx01_journey_v2.sql)
is source work, not an applied hosted migration. `JOURNEY_V2_ENABLED` must remain
false or absent until a separately authorized migration is applied and verified.
The account API advertises supported journey versions; clients must not strip
or downgrade v4 data to make an old server accept it.

A future release must also deliver a coherent hashed/versioned client module
graph, compatible client/Worker code and actual hosted old/new backup and binding
retention checks. Separate local keys protect legacy data but do not by themselves
solve mixed cached-module loading or rollback to an old client. No hosted
migration, release or public deployment occurred in this implementation turn.

The existing two packs retain their price, odds, **card pools and pool ordering**,
and six-RNG-call draw sequence. Their pools now use frozen `LEGACY_CARD_IDS` /
`CLASSIC_CARD_IDS` lists; the NPC market also remains legacy-only. Exact-output
fixtures catch pool/order changes as well as extra RNG calls.
No cosmetic draw may quietly perturb their old results. Offline collectible
previews are not trusted online ownership; authority remains the separate M2/M3 track.

## Delivery slices and acceptance

| Slice | Concrete output | Acceptance |
| --- | --- | --- |
| A · Visual language | The earlier four-treatment Wukong atelier study and rarity frames remain separate from real grants | Safari/WebKit and Chrome; 360/390/1440px; legible stats, keyboard, reduced motion; atelier makes no save writes |
| B · Candidate rules | All 15 new rules cards now implemented, including the initial four pilot roles | Targeted effect/deck/AI tests exist; human four-round matchup and balance review remains |
| C · Copy compatibility | Local v4 keys, strict print bindings, legacy migration and dual snapshot source implemented | Local UID/XP/vault/pending and snapshot tests; hosted SQL/version negotiation, module graph and retention gate still open |
| D · WX-01 content | All 29 printing entries and art assets are local | Four characters per faction, legal pair decks, correct printing bindings; final visual/phone review remains |
| E · Earned booster | Runtime rates, choice grants, protected receipts, counters and 印 are local | Model/runtime equivalence, boundaries and transactional regressions exist; integrated browser/save failure review remains |
| F · Narrative release | Relevant opponents use their own cast; journal shows collection goals | Existing story unlocks/rewards preserved; clear new-player path; physical iPhone/Android performance |

Existing 西遊 opponents retain their legacy deck generation for this slice;
adapting them to the new cast is follow-up narrative/balance work. New
chapters and boss abilities are separate content, not implied by sixteen cards.
No public deployment, paid packs, store purchase, online issuance or NFT minting
is part of this implementation.

Relevant source checks: [card/rules tests](../tests/wx01-cards.test.mjs),
[runtime sampler/model equivalence](../tests/wx01-pack.test.mjs),
[grant/migration/receipt tests](../tests/wx01-progression.test.mjs),
[profile-store tests](../tests/profile-store.test.mjs) and
[cloud snapshot tests](../tests/cloud-save.test.mjs). These do not stand in for
the integrated browser suite, physical-device review or hosted verification.

## The series after 西遊

These are a proposed editorial sequence, not release dates or production promises.

| Series | Working direction | Character possibilities / connection |
| --- | --- | --- |
| WX-02 · 封神・蓮火問天 | The next full set: responsibility, chosen form, mortals and divinity | Existing 哪吒 reprint; 姜子牙、楊戩、雷震子、妲己、太乙真人、聞仲. Select exact novel portrayal, not television costumes. |
| WX-03 · 白蛇・煙雨人間 | A smaller story collection with intimate landscape AA | 白素貞、小青、許仙、法海; choose a specific source version before filling the cast or assigning chapter events. |
| 三國・風起赤壁 | Alliances and competing commitments | Existing 關羽、諸葛亮、貂蟬; 劉備、張飛、趙雲、曹操、周瑜、孫尚香 as candidates. Literary portrayal distinguished from history. |
| 水滸・夜雨江湖 | Fellowship, difficult choices, rough humour | Existing 魯智深、武松; 林沖、宋江、李逵、扈三娘. Keep textual edition/chapter numbering explicit. |
| 聊齋・燈下有靈 | Small releases built around individual stories | 聶小倩、寧采臣、嬰寧、辛十四娘; story-specific research before character or art production. |
| 紅樓・風月入夢 | Poetic and social card roles; seasonal illustration sets | Existing 黛玉、熙鳳; 寶玉、寶釵、湘雲、探春. Gardens, letters, lanterns and ordinary moments matter as much as duels. |
| 山海原創續卷 | Continue the game's own people alongside classics | 青霄、霜璃、渡影 and the other original companions deserve new scenes and AA, rather than being displaced by licensed-style spectacle. |

## Textual anchors

Read as a fictional source, not verified history. Public-domain text links
support the episode motifs; our names, compositions, faction assignments and
mechanics remain original adaptations.

- [西遊記第2回](https://zh.wikisource.org/wiki/西遊記/第002回):
  菩提祖師 and the training episode.
- [第3回](https://zh.wikisource.org/wiki/西遊記/第003回),
  [第4回](https://zh.wikisource.org/wiki/西遊記/第004回),
  [第7回](https://zh.wikisource.org/wiki/西遊記/第007回):
  the staff/sea palace, heavenly status and heavenly confrontation.
- [第12回](https://zh.wikisource.org/wiki/西遊記/第012回),
  [第15回](https://zh.wikisource.org/wiki/西遊記/第015回),
  [第19回](https://zh.wikisource.org/wiki/西遊記/第019回),
  [第22回](https://zh.wikisource.org/wiki/西遊記/第022回):
  三藏、白龍馬、八戒、悟淨. The cited text gives 悟淨 a 降妖寶杖;
  do not automatically borrow a television crescent-spade design.
- [第21回](https://zh.wikisource.org/wiki/西遊記/第021回),
  [第24–26回 starting at 24](https://zh.wikisource.org/wiki/西遊記/第024回),
  [第27回](https://zh.wikisource.org/wiki/西遊記/第027回):
  wind, 五莊觀 and the White Bone episode.
- [第33–35回 starting at 33](https://zh.wikisource.org/wiki/西遊記/第033回),
  [第41–42回 starting at 41](https://zh.wikisource.org/wiki/西遊記/第041回),
  [第58回](https://zh.wikisource.org/wiki/西遊記/第058回),
  [第59回](https://zh.wikisource.org/wiki/西遊記/第059回),
  [第60–61回 starting at 60](https://zh.wikisource.org/wiki/西遊記/第060回):
  the paired kings, Red Boy, false Wukong, the fan and Bull Demon King.


## Local boxes and playtest supply · 2026-09-22

The market now offers 12/24-pack boxes (36/72 exact owned copies) at 3,600/7,200
earned coins. Sequential pack odds, rarity floor, dry protection and 1 印 per
pack match single purchases. One atomic saved receipt precedes any animation;
manual pack progression, skip-to-overview and reload recovery use that receipt.
The overview groups cards by original pack and counts special treatments.

`playtest.html` and its two modules are local-preview-only tools, excluded from
the public build. The owner-requested 10,000-coin playtest gift requires an
existing journey and a deliberate click under the normal profile lock. Coins
and the literal optional `wx01.playtestGift` marker are saved together; refreshing
or repeated clicks cannot award it again in that journey. No automatic credits,
real payment, hosted economy change or deployment accompanies this tool.
