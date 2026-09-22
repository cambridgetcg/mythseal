# WX-01 · 西行秘匣 probability design

**Draft v1 · 2026-09-22.** Numerical design and offline analysis only. The owner
chose **cosmetic 領契 first; battle Leader rules later**. These rates are Mythseal
proposals, not Bandai rates, live game odds or a distribution announcement.
The two existing packs and the fixed atelier demonstration remain unchanged.

## What we borrow from Bandai

Official pages checked on 2026-09-22:

- English [PRB-02](https://en.onepiece-cardgame.com/products/boosters/prb02.php)
  explicitly guarantees at least one SR-or-higher card per pack. Publish a
  base-rarity floor separately from illustration odds.
- [OP-13](https://en.onepiece-cardgame.com/products/boosters/op13/) distinguishes
  Leader cards, which affect deck construction/play, from alternate-art and
  manga-derived treatments. Our first 領契 is a cosmetic portrait treatment;
  adding a Leader battle role is a separate rules experiment.
- [OP-09](https://en.onepiece-cardgame.com/products/boosters/op09/) gives
  different visual identities to Leader illustrations, Super Alt-Art and SP.
  We adopt distinct compositions/materials, with original Mythseal artwork.
- Bandai's [Dragon Ball tournament manual, section 3.3.1.2](https://dbs-cardgame.com/pdf/event/tournament-rules-manual.pdf)
  acknowledges a “god pack” when describing draft replacement. It does not give
  contents or odds. This is evidence about Dragon Ball, not One Piece.
- One Piece's [2025 OP-13 Treasure Campaign Pack](https://en.onepiece-cardgame.com/topics/022.php)
  was a separate three-card box-purchase bonus under that campaign's conditions.
  It was not a randomly upgraded booster. Earned bonus rewards and jackpot packs
  therefore need distinct names and explanations.

The inspected English PRB-01/02 and OP-09/13 pages do **not** publish numerical
AA, manga, TR or god-pack probabilities. An official One Piece god-pack contents
list was not verified in this bounded research. Do not present community
case-opening estimates as manufacturer guarantees, or transfer rates between
Japanese and English editions. Product rarity counts are catalogue counts.

## The pack players can understand

**300 earned coins, exactly three copies, at least one 靈品 or 神品.** No paid
currency, box collation, limited stock or time-limited probability boost is
proposed. Prices/rarities do not imply that a printing is stronger in combat.

The natural table below selects **one mutually exclusive whole-pack outcome**.
Percentages sum to 100%; they are not independent rolls on all three cards.

| Natural outcome | Per pack | Reciprocal, not a guarantee | Contents |
| --- | ---: | ---: | --- |
| 本畫匣 | 83.70% | — | Three standard prints |
| 異畫 AA | 12.50% | 1 in 8 | Two standard + one of six AA |
| 領契 LAA | 2.50% | 1 in 40 | Two standard + one of four Leader Art portraits |
| 天工 TR | 1.00% | 1 in 100 | Two standard + 悟空・定海神珍 |
| 墨卷 INK | 0.25% | 1 in 400 | Two standard + one of two ink-scroll prints |
| 神契匣 · 三相同輝 | 0.05% | 1 in 2,000 | One AA + one LAA + one INK, three different characters |

The emotional order is frequent alternate scenes, occasional flagship portraits,
an uncommon lacquer treasure, then a very rare ink-scroll illustration. 神契匣
is a rare opening event, not another card rarity. Its prints are all available
outside it; collection completion, quests and exclusive achievements never
require opening one.

These are intentionally demanding natural INK/god rates. Finite choice routes
below make a favourite illustration obtainable without relying on those tails.
Playtests may justify increasing rates; do not secretly personalise them.

## 領契: four new cosmetic printings

These are **additional illustrations**, not relabelled versions of the six AA.
The checklist grows from 25 to **29 prints of the same 16 characters**:
16 BASE + 6 AA + 4 LAA + 2 INK + 1 TR. No extra gameplay identities are added.

| Print | Subject | Direction |
| --- | --- | --- |
| WX01-001-LAA1 | 唐三藏 · 一願西行 | Frontal, composed portrait; a narrow road and dawn behind the robe |
| WX01-005-LAA1 | 孫悟空 · 我自齊天 | Close, defiant gaze; upright staff and restrained cloud engraving |
| WX01-009-LAA1 | 白骨精 · 千面一念 | Face, veil and a reflected silhouette; ambiguity through composition |
| WX01-015-LAA1 | 牛魔王 · 萬妖共主 | Broad horns and a monumental silhouette against distant mountain banners |

One subject per faction. Their portrait can personalise the lobby/deck display;
it grants no initiative, faction bonus, stat, XP or deck-building exception.
Choosing a basic representative must be available from an owned standard card.
The fancy LAA is not needed to use that character or a future Leader role.
Actual portrait selection and these four artworks remain unimplemented.

## Exact selection order and the rarity floor

This **revises the earlier WX-01 character-first proposal**. A hard illustration
guarantee cannot always retain character-first rolls when many characters have
no AA. The future WX-01 sampler therefore chooses its outcome/printing first.
It intentionally has a different character distribution from the original two
packs, whose pools, ordering, price and six-call RNG sequence stay unchanged.

1. Roll the natural pack outcome once, then apply dry-streak protection below.
2. In ordinary packs, roll two base characters at 60/30/10 common/rare/epic,
   uniformly within the 8/5/3 character pools. If both are common, the third
   uses 75/25 rare/epic; otherwise it uses 60/30/10.
3. In a single-special pack, choose the third print uniformly from that
   treatment's eligible list. Roll the first two base characters as above.
   If all three are common, replace the **second standard slot** with a 75/25
   rare/epic draw. The selected special print is preserved. Normal packs can
   contain multiple versions of the same character.
4. In a 神契匣, choose INK uniformly; choose LAA uniformly after excluding that
   character; choose AA uniformly after excluding both characters. Display in
   AA → LAA → INK order. The INK is always 神品, satisfying the rarity floor.
5. Each print maps to exactly one character. A special print replaces a standard
   copy; it never creates a fourth card. Each card receives its own new UID at
   Lv.1/0 XP, with ordinary training and deck restrictions.

The god-pack exclusion order means individual AA/LAA prints are **not equally
likely inside a god pack**. Publish the per-print marginal table produced by
the analysis tool; do not divide every inclusive category rate by pool size.
The two INK choices remain equally likely, including god packs.

This also changes character access, even though special versions have identical
stats: the proposed protected mix gives about **0.153189 Wukong copies per pack**
across printings, versus 0.118 under the ordinary-only rule. Expected copies of
some unfeatured common characters fall about 6.33%. Treat this as a deliberate
new-set distribution choice in balance review, not a purely cosmetic probability
change. The expected all-card rarity mix becomes approximately
**52.1274% common / 34.5059% rare / 13.3667% epic**.

## Twelve-pack dry-streak protection

Persist a WX-01 counter of consecutive packs without **any special illustration**.
After eleven ordinary packs, roll the twelfth normally. If it would be ordinary,
promote it to a uniformly selected AA pack. A natural LAA/TR/INK/god result keeps
its identity. Every special outcome resets the counter; an ordinary one adds 1.

- Counter 0–10: use the natural table unchanged.
- Counter 11: AA **96.20%**, LAA 2.50%, TR 1.00%, INK 0.25%, god 0.05%; no ordinary.
- Every run of twelve qualifying openings contains at least one special print.
  This is not an INK, specific-character or specific-AA guarantee.
- Opening animations, single/batch opening, logout, selling and device restart
  never reset it. Choice rewards do not increment or reset it. It does not
  expire, transfer between sets, or restart merely because a client updates.
- At the opening screen show the current counter and next-pack conditional
  odds. A long-run effective rate is not the chance on a particular next pack.

For q = 0.837 and a cap of 12, the mean cycle length is
`(1 - q^12) / (1 - q) = 5.409668968` openings. The stationary frequency of
promoted ordinary packs is `q^12 / meanCycle = 2.185419459%` of all openings.
Thus ordinary outcome frequency is 81.514580541%, AA is 14.685419459%, and the
other four outcome frequencies retain their natural rates.

Including the contents of god packs:

| Contains this treatment | Long-run per-pack presence with dry protection |
| --- | ---: |
| AA | 14.735419459% |
| LAA | 2.55% |
| TR | 1.00% |
| INK | 0.30% |
| Any special print | 18.485419459% |

These rows overlap in god packs. Their sum is an expected special-card count,
not the probability of any special. Average special cards per pack are
0.18585419459, or 6.195139820% of all card slots; the presence rate is different.

Per special printing, including dry protection and god packs, the stationary
chance of at least one copy in an opening is:

| Printing | Long-run per-pack presence |
| --- | ---: |
| 悟空 AA · 踏碎凌霄 | 2.450903% |
| 三藏 AA · 長安啟程 | 2.454237% |
| 白龍馬 AA · 鷹愁照影 | 2.457570% |
| 八戒 AA · 行囊旁的月亮 | 2.457570% |
| 觀音 AA · 甘露回春 | 2.457570% |
| 鐵扇 AA · 翠雲一扇 | 2.457570% |
| 悟空 LAA · 我自齊天 | 0.631250% |
| 三藏 LAA · 一願西行 | 0.639583% |
| 白骨精 LAA · 千面一念 | 0.639583% |
| 牛魔王 LAA · 萬妖共主 | 0.639583% |
| 悟空 TR · 定海神珍 | 1.000000% |
| 悟空 INK · 大鬧天宮 | 0.150000% |
| 六耳 INK · 二心三界 | 0.150000% |

These are rounded summaries of exact enumeration. A special printing can occur
at most once in one pack, so its expected-copy count equals its presence chance.
Standard prints can repeat; the machine report gives both quantities for all
29 prints. God-pack conditional shares are INK 1/2 each; LAA 悟空 1/8, others
7/24 each; AA 悟空 1/15, 三藏 2/15, others 1/5 each. These smaller biases are
the stated consequence of keeping all three god-pack characters distinct.

Every standard print within a base-rarity pool has the same marginal rate.
The following rows describe **one particular BASE card**, not its entire rarity
pool, and exclude that character's other printings:

| One BASE printing | Long-run chance per pack | Expected copies per pack |
| --- | ---: | ---: |
| Any one of the eight 凡品 characters | 17.662437% | 0.185466529 |
| Any one of the five 靈品 characters | 19.027086% | 0.199562036 |
| Any one of the three 神品 characters | 10.797600% | 0.110867798 |

For example, the 悟空 BASE chance is 10.797600%; his AA/LAA/TR/INK printings have
their own rows above. Do not sum presence probabilities to get “any Wukong”:
an opening can contain BASE Wukong and another version together.

## What rare actually feels like

These are natural random drops including god-pack contents, excluding choice
rewards. The AA protection never changes these probabilities. With independent
valid pack draws, the chance after n opens is `1 - (1 - p)^n`.

| Target | Effective per-pack chance | Mean wait | 50% have seen it by | 95% have seen it by |
| --- | ---: | ---: | ---: | ---: |
| Any INK | 0.30% | 333.33 | 231 packs | 998 packs |
| A particular INK, e.g. 悟空 | 0.15% | 666.67 | 462 packs | 1,996 packs |
| 悟空 TR | 1.00% | 100 | 69 packs | 299 packs |
| 神契匣 | 0.05% | 2,000 | 1,386 packs | 5,990 packs |

An average wait is not a ceiling. After 200 opens the natural chances are about
45.17% for any INK, 25.93% for a particular INK and 9.52% for a god pack. These
large-n calculations require sufficient collection/storage capacity; they are
not evidence that the current game can support that many openings.

## A finite route to the art you love

Proposed **西行印** are an earned, non-expiring collection currency:

- Every committed WX-01 pack grants **one** 印, including protected/god packs.
  Receipt replay/reload cannot grant it again.
- First completion of the full Westward story volume grants **one choice from
  the six AA**, separate from existing coins. Previously cleared profiles need
  an explicit once-only entitlement, not a replay requirement or silent gift.
- Claiming the existing weekly ten-match goal grants **five** 印 in addition
  to its existing reward. Wins and pack purchases are not required. Its current
  weekly goal/reset still applies; the earned 印 themselves never expire.
- Redemption costs: **20 AA / 40 LAA / 100 TR / 200 INK** 印, choosing the exact
  eligible print. A claim consumes 印 and grants one new copy. No destruction
  or conversion of existing cards; no random choice on redemption.

“At most 200 pack-earned 印 for your chosen INK” assumes those 印 are saved;
spending on other prints delays that choice. Weekly 印 can shorten the route.
These are acquisition rules to implement and test, not already-issued rewards.

## Economy and capacity checks before release

Current source examples, excluding upgrades, purchases, sales and first clears:

| Recurring example | Coins | 300-coin pack equivalents |
| --- | ---: | ---: |
| Seven login claims | 1,120 | 3.73 |
| Three sessions, each a cleared Mist win + AI arena loss/win | 1,695–1,890 | 5.65–6.30 |
| Five such sessions, all existing weekly claims | 3,725–4,050 | 12.42–13.50 |
| Five two-match sessions with all losses, eligible weekly claims | 2,075 | 6.92 |

All claims are explicit. Three two-match sessions complete none of the current
weekly goals. These are arithmetic scenarios, not observed play-duration data.
The once-daily pack task returns 80 coins **after** opening: 300 upfront, 220 net
for that first qualifying pack; later packs cost 300. Five such rebates increase
the successful five-session example to 13.75–14.83 pack-equivalents. Do not count
the rebate twice. Training and market purchases compete for the same coins.

At those three-session/five-session examples, saving 200 pack-earned 印 alone
would take roughly 32–36 / 15–17 weeks before rebates, purchases or weekly 印.
The five-session case can earn five weekly 印 too. Rare art is a long-term
collection goal; the first-story AA gives a much earlier chosen favourite.

Use existing base-rarity resale quotes of 40/90/180 at Lv.1; **no cosmetic resale
premium**. The legacy pack already has 222.66 expected resale coins, or 302.66
including its first daily rebate, assuming every card is legally sellable. The
new pack's distinct character mix gives **227.898965** expected resale coins, or
**307.898965** with the first daily rebate. Later packs still cost about 72.10 net
in this all-sellable scenario. This is expected value, not guaranteed profit;
copy protections apply, and most players will retain cards. Selling a rare artwork must never be the
normal route to collection currency or a surprise automatic conversion.

**Capacity is a release gate.** Cloud backup currently caps owned plus merchant
vault copies at 2,000 and the serialized snapshot at 512 KiB. Selling a card does
not remove it from that count. Starter 16 + 661 packs = 1,999 copies before
market/redeemed/story grants; the next pack breaches the count cap, and bytes may
bind earlier. A finite choice reward needs capacity too. Plan compatible storage
scaling/archival and preflight checks without deleting copies or weakening
validation; do not advertise unlimited openings on today's schema.

## Delivery and verification

The standalone `tools/wx01-drop-model.mjs` defines the proposed catalogue and
probabilities. `node tools/analyze-wx01-drops.mjs --json` enumerates exact outcomes,
derives the dry-counter stationary distribution and checks a seeded simulation.
Its synthetic cards are not imported into engine/runtime/market data. Model
`cardId` values are checklist numbers; any runtime adoption needs an explicit
mapping to engine identities, including `WX01-005` → `wukong`. Tests cover
the rarity floor, eligible print identity, unique god-pack characters, exact
marginals, RNG boundaries and dry-counter transitions.

Before player distribution: finish the four LAA artworks, balance all base cards,
version the catalogue/odds, complete reader/backup/capacity compatibility, and
commit cost + three UIDs + receipt + counter + 印 atomically. The receipt is saved
before reveal; skip/reload/backgrounding can only display that accepted result.
Inspect duplicate claims, previous Westward clears, full storage, old/new backup
restores, offline conflict handling and explicit favourite selection. None of
these fields or grants are added by this design pass.

Reveal direction: ordinary paper release; AA opens into a scene, LAA gives a
brief portrait/crest beat, TR uses a soft metal tone, INK resolves through brush
and paper. 神契匣 reveals its three genuine saved hits in sequence. No staged
near-miss, fake upgrade roll or mandatory countdown. Skip, sound-off and reduced
motion show the same cards. No new sound or animation is implemented here.
