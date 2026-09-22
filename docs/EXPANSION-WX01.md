# WX-01 · 西行・萬象初章

Status: **set proposal + local visual prototype**, 2026-09-22.
The owner chose **西遊記 first, then other series**. This document fixes a useful
working direction; proposed new cards, their stats, acquisition rates and owned
special printings have not been implemented or released.

## The promise

A party travelling together, a world full of temptation, and an unruly hero
learning what he wishes to protect. Collect a scene because it stays with you.
Spectacular cloud battles sit beside a quiet departure, a horse reflected as a
dragon, and a traveller resting beside the luggage.

Scope: **16 base identities = 15 new characters + the existing Wukong**.
**6 alternate arts + 2 ink-scroll prints + 1 treasure = 9 special printings**.
Thus the set checklist has **25 printings of 16 gameplay identities**. The game
would grow from 24 to 39 characters. Special printings do not increase that count.

Today's work includes live frames for the existing three rarities, three original
Wukong art studies and an interactive, fixed-content opening at `/atelier.html`.
The atelier consumes no currency, grants no copies, and reads/writes no saves.
The playable market still contains its original two packs.

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
| 墨卷 · INK | Warm paper, black brush/woodcut marks, small vermilion accents; sequential vignettes | Our original illustrated-scroll answer to manga treatments |
| 天工 · TR | Deep lacquer, gold leaf, bronze relief and jade inlay | A treasure treatment, not a new combat rarity |

Faction remains visible as its own icon/name/colour. Five stars still mean the
five-star deck cost, not five tiers of collectible rarity. Treatment labels
always accompany colour; readable names, values and skills take precedence over
foil. No default perpetual shine or automatic device-motion access. Any later
sheen is brief on a deliberate reveal/inspection and has a static equivalent.

All four Wukong treatments use the current **5 stars, power 7, damage 6,
破妄 · 封鎖技能**. No special printing adds a stat, extra turn, bonus XP or hidden
match advantage. Each owned copy would still train individually under existing rules.

## Base checklist — proposed, not balanced engine data

All factions and roles below are Mythseal interpretations, not canonical novel
allegiances. Names and episodes derive from the classical text. New power,
damage and effect values need balance work; only the existing Wukong is fixed.
Star costs below are initial deck-construction budgets.

| Number | Character | Faction | Rarity | Stars | Proposed role / existing effect vocabulary |
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
4+4 two-faction decks therefore cost 22–25 stars at this proposed stage. This is
a construction check, not balance evidence. Four cards per faction do not make an
eight-character mono-faction deck; existing cards remain useful.

Balance watchlist: a proposed two-star 銀角 with skill interruption must be tested
against three-star 霜璃 and 月隱's low-bid attack reduction. Without power/damage
budgets we cannot infer fairness or declare it overpowered.

Keep the first set within the current effect vocabulary. Do not introduce a
resurrection zone, extra rounds, mind-reading bids or hidden-choice copying just
because a character can do extraordinary things in the novel. Distinct stats,
faction interactions and cost efficiency must justify each eventual new card;
reject strict upgrades over existing cards at equal star cost.

## Special-print checklist

These names describe illustrations, not additional gameplay identities.

| Print | Character | Scene and composition | Progress |
| --- | --- | --- | --- |
| WX01-005-AA1 | 孫悟空 · 踏碎凌霄 | Diagonal staff and crimson silk against a vast teal cloud gate | Original art study in atelier |
| WX01-001-AA1 | 唐三藏 · 長安啟程 | A small traveller at monumental city gates; warm robe, morning silence | Art brief |
| WX01-002-AA1 | 白龍馬 · 鷹愁照影 | Horse above clear water, dragon reflected below | Art brief |
| WX01-013-AA1 | 豬八戒 · 行囊旁的月亮 | Rake and luggage at rest; the weary traveller gets a gentle moment | Original interlude, art brief |
| WX01-003-AA1 | 觀音 · 甘露回春 | Willow, falling drops and a vast tree returning to life | Art brief |
| WX01-010-AA1 | 鐵扇公主 · 翠雲一扇 | Fan opens across the frame; wind, green mountain, distant heat | Art brief |
| WX01-005-INK1 | 孫悟空 · 大鬧天宮 | Hero with original cave, sea-palace and heavenly-conflict vignettes | Original art study in atelier |
| WX01-012-INK1 | 六耳獼猴 · 二心三界 | Paired silhouettes through heaven, the underworld and 雷音 | Art brief |
| WX01-005-TR1 | 孫悟空 · 定海神珍 | The upright staff in a dark sea palace; lacquer, carved gold and jade | Original art study in atelier |

Wukong deliberately anchors all four treatments so we can compare them side by
side. Other AA subjects include low-star/common cards: a favourite illustration
should not require choosing a high-star combat role. The quiet 八戒 scene is an
invented interlude, not a claimed quotation or specific documented chapter scene.

Base Wukong can reuse the existing atlas. Full set production then needs
**15 new base illustrations + 9 special illustrations = 24 new card artworks**.
Three studies exist; **21 remain**, subject to review. Packaging/key art is a
separate deliverable. The current pack mockup reuses the AA illustration.

## Booster and collection experience

Proposed product: **西行秘匣**, set `wx01`, earned coins, **300 coins / 3 cards**.
This is a planned product, not a new button in the current market.

Start balancing from the current base pack rule: roll 60/30/10 for common/rare/
epic; if the first two cards are common, the third rolls 75/25 rare/epic. With
that guarantee the long-run slot average is **52.8/35.4/11.8**, not 60/30/10.
WX-01 has nonempty pools for all three rarities. Choose uniformly within each
base-rarity pool unless a later documented design explicitly changes that rule.

After choosing a character, an explicit set printing table can select only
printings registered for that character. A selected special **replaces the
standard printing of that same copy**; it neither adds a fourth card nor rerolls
the gameplay identity. Standard candidates must remain accessible.

**Special-print odds are deliberately not set yet.** A meaningful odds table
must include which characters have eligible prints, third-slot guarantees,
whole-pack versus per-card probabilities, and any guarantee counter. Wukong-only
TR eligibility makes a simple “1% TR” banner misleading unless its denominator
is specified. Calculate the exact marginal odds, simulate distribution and
model earned-currency pace before choosing rates. Do not invent a “one per box”
guarantee for a game without a box system.

Recommended acquisition design for the next decision:
- A clearly visible, finite earned route to at least one chosen AA. Explore a
  first-volume reward and repeatable weekly illustration tokens; do not silently
  consume duplicate owned cards.
- A pack reward is a new UID at Lv.1/0 XP. A variant is not a new skin silently
  applied to a trained existing copy, and it does not inherit that copy's XP.
- Duplicates remain distinct cards. Let the player inspect/lock/keep/sell; no
  automatic conversion. New-print confirmation should say “新版本” separately
  from “新角色”.
- A complete base-character checklist and a separate treatment checklist.
  Backpacks can group by character, then expand exact copies with version, XP
  and UID. Keep deck duplicate detection at the character/rules identity.
- Unowned art previews explain what a player is collecting without presenting
  it as something already owned. Avoid false stock limits, resale promises or
  scarcity countdowns.

Opening: sealed packet → short paper/foil release → three face-down cards →
player-chosen reveal → a calm collection summary. A rare reveal earns a brief
pause and soft material sound, not a long mandatory celebration. Skip/fast/
reduced motion all show the same already-saved result. A future real opening
commits cost and card UIDs once before animation; reload resumes that receipt.

Today's demonstration is fixed content and has no RNG, payment or receipt.
Its title and controls say so. It cannot be used as evidence of pull rates.

## Copy identity and save compatibility — required before real distribution

Keep three identities distinct:
- `cardId`: rules and same-character deck restriction, e.g. `wukong`.
- `uid`: the exact copy that earned its own XP and history.
- Proposed `printId`: an immutable catalogue binding such as
  `wx01-005-ink1` → cardId, set, treatment, art, frame and display label.

Do not reuse `artSet` for treatments: the engine currently derives original/
classic membership from it. Old copies must retain their legacy edition;
do not relabel everyone's existing Wukong as a newly acquired WX-01 printing.

The current collection hydrator reconstructs instance fields and would drop
an unrecognized variant field. The strict cloud validator would reject it.
An old cached client could silently strip it again. Also, bumping profile
version under the same key is unsafe: current readers replace unknown versions
with a starter profile. The database validator currently pins profile version 3.

The same compatibility gate applies to **new base character IDs**. Adding to
`CARDS` expands derived inventory/level keys and can fail old snapshots' strict
canonical equality; old readers also discard unrecognized copies. The four-card
pilot stays isolated candidate data until this gate passes.

Before new characters or owned variants enter real saves:
1. Design supported-reader/version negotiation, migration and rollback together.
   No destructive same-key profile bump; no reset of the live account database.
2. Make missing print identity an explicit legacy-standard mapping. Validate
   known print IDs against their cardId and accept legacy snapshots deliberately.
3. Preserve identity through hydration, XP, locks, saved decks, sale/buyback,
   merchant-vault records and old/new backup round trips.
4. Resolve art through one presentation adapter everywhere: lobby, backpack,
   exact-copy passport, deck thumbnails, prep, pack, battle, reveal and result.
   A battle uses its frozen participating UID, not whichever deck is active now.
5. Ship compatible client and account Worker together with actual hosted
   retention checks; a local preview is not hosted compatibility evidence.

The existing two packs retain their price, odds, **card pools and pool ordering**,
and six-RNG-call draw sequence. Their current pools derive from the global card
catalogue, so freeze/version the legacy lists before expanding it. Exact-output
fixtures must catch pool/order changes as well as extra RNG calls.
No cosmetic draw may quietly perturb their old results. Offline collectible
previews are not trusted online ownership; authority remains the separate M2/M3 track.

## Delivery slices and acceptance

| Slice | Concrete output | Acceptance |
| --- | --- | --- |
| A · Visual language | Existing rarity frames + four Wukong treatments + fixed opening study | Safari/WebKit and Chrome; 360/390/1440px; legible stats, keyboard, reduced motion; no save writes |
| B · Four-card pilot | 白龍馬 / 紅孩兒 / 白骨精 / 沙悟淨 base art and candidate rules | One per faction, legal starter/mixed decks, injectable-RNG engine cases and four-round matchup review |
| C · Copy compatibility | Print catalogue, one art resolver, guarded migration and backup support | Legacy/new snapshots round-trip; exact UID/XP/vault retained; old readers cannot erase prints; pending match stable |
| D · WX-01 content | Remaining roster, all 25 printing entries, art/edition checks | All faction pair decks legal; no empty rarity pools; no incorrect identity/print links; source/art review |
| E · Earned booster | Approved published probabilities, access path and resumable opening | Exact probability enumeration + simulation; one cost/result under retries/reload; deterministic result independent of animation |
| F · Narrative release | Relevant opponents use their own cast; journal shows collection goals | Existing story unlocks/rewards preserved; clear new-player path; physical iPhone/Android performance |

Existing 西遊 maps can receive the new cast after cards pass slice B/D. New
chapters and boss abilities are separate content, not implied by sixteen cards.
No public deployment, paid packs, store purchase, online issuance or NFT minting
is part of this design pass.

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
