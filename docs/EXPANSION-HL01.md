# HL-01 · 紅樓・風月入夢

Design checkpoint: **2026-09-23**. Set ID **`hl01`**; first room **海棠詩社**.
The owner chose this as the next literary preview and wants to explore it
together. This slice provides eight character studies, three alternate artworks,
card inspection and one fixed three-card opening. It is a standalone local
preview, not a new game release, pack pool or profile migration.

The story is a gathering: someone writes, someone sets the rhyme, someone keeps
the meeting possible. White begonia, patterned paper, an almost-spent incense
stick and the space between friends carry the scene. The first rules draft
emphasizes inexpensive commitments and resource timing; it does not turn literary
rankings into power rankings or add a poetry contest mechanic to the engine.

## Source frame and roles

Checked **2026-09-23** against the public-domain original text transcribed on
Wikisource: [第三十七回・秋爽齋偶結海棠社，蘅蕪苑夜擬菊花題](https://zh.wikisource.org/wiki/紅樓夢/第037回).
The eight-card roster spans the initial meeting and 湘雲's arrival the next day;
it is not a claim that all eight sat at the founding table simultaneously.

| Character | Source-grounded role in this room | Display direction |
| --- | --- | --- |
| 林黛玉 | Writes a begonia poem; participates in the conversation and naming | Quick wit and a fresh page, without reducing her to tears |
| 賈寶玉 | Writes, encourages the gathering and later presses to invite 湘雲 | A participant who can enjoy another person's good line |
| 薛寶釵 | Writes; later helps 湘雲 arrange hosting and subjects | Deliberation and social attention, not a villain label |
| 史湘雲 | Arrives the following day and supplies two poems to the same rhymes | Eagerness and conversational energy |
| 賈探春 | Sends the founding invitation and also writes | Authorship of the gathering as well as a poem |
| 李紈 | Proposes herself as host/president and judges the poems | Hospitality and judgment count as active contributions |
| 賈迎春 | Sets the verse form and rhyme, with an incense time limit | Attentive structure, not a fabricated prize-winning poem |
| 賈惜春 | Serves as vice-president with the assigned duty of supervising | Quiet presence and keeping the agreed form |

李紈, 迎春 and 惜春 are **not presented as three additional competing poets** in
this opening meeting. Their organizational roles matter. 王熙鳳 already exists
in Mythseal but is deferred to another 紅樓 room; she is not inserted into the
海棠 founding membership. This selection does not rewrite her existing card.

湘雲's AA uses a separate episode:
[第六十二回・憨湘雲醉眠芍藥裀，呆香菱情解石榴裙](https://zh.wikisource.org/wiki/紅樓夢/第062回).
The stone bench, fallen peony petals, nearby fan and companions coming to wake
her anchor that image. **This is a different gathering from chapter 37.** The
autumn begonia meeting and this peony scene must not be collapsed into one day.
Image composition, clothing design and card lore remain original adaptations;
no television actor, costume design or film still is a source requirement.

## Eight baseline identities

`honglou-cards.mjs` is the single preview data source. Its data is immutable and
imports no engine, progression, profile, account or pack module. It supplies
**one exact existing rules reprint (林黛玉) plus seven new untested candidates**.

`P/D` means base power / damage. The faction assignments below are Mythseal game
interpretations, not character allegiances in the novel. Rarity is a proposed
collection category, not literary importance: **four 凡品/common and four
靈品/rare**; this small set does not force a 神品/epic slot.

| Number | Stable ID | Character · preview title | Faction | Rarity | Stars | P/D | Existing effect |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| HL01-001 | `lindaiyu` | 林黛玉 · 瀟湘聽雨 | 月隱 / `moon` | 靈品 / `rare` | 2 | 6/2 | `reduceDamage: 2` · 惜花 · **unchanged reprint** |
| HL01-002 | `jiabaoyu` | 賈寶玉 · 怡紅聽吟 | 赤燼 / `ember` | 凡品 / `common` | 2 | 6/3 | `refundOnLoss: 1` · 留興 |
| HL01-003 | `xuebaochai` | 薛寶釵 · 蘅蕪持衡 | 雲闕 / `yun` | 靈品 / `rare` | 3 | 5/4 | `opponentAttack: 4` · 含章 |
| HL01-004 | `shixiangyun` | 史湘雲 · 笑語乘興 | 赤燼 / `ember` | 靈品 / `rare` | 3 | 7/3 | `attack: 6` · 乘興 |
| HL01-005 | `jiatanchun` | 賈探春 · 蕉下邀社 | 雲闕 / `yun` | 靈品 / `rare` | 3 | 6/4 | `refundOnLoss: 2` · 續席 |
| HL01-006 | `liwan` | 李紈 · 稻香掌壇 | 森羅 / `grove` | 凡品 / `common` | 3 | 5/4 | `healOnWin: 3` · 款客 |
| HL01-007 | `jiayingchun` | 賈迎春 · 菱洲拈韻 | 森羅 / `grove` | 凡品 / `common` | 2 | 5/3 | `reduceDamage: 1` · 定韻 |
| HL01-008 | `jiaxichun` | 賈惜春 · 藕榭監場 | 月隱 / `moon` | 凡品 / `common` | 2 | 6/1 | `stopAbility: 0` · 守約 |

There are **two identities per existing faction, 20 stars total**. No new effect,
conditional keyword, faction bonus, resource, victory condition or draw rule is
introduced. The established eight-distinct-identity / 25-star deck limit stays
unchanged. A four-card draw can contain one from each faction and activate no
resonance; this is a deliberate weakness of the complete small-set list.

### Exact 黛玉 reprint boundary

Preserve `lindaiyu`, her name, title, source, rarity, faction, 2 stars, 6 power,
2 damage, original lore and the complete `reduceDamage: 2` ability text. The
preview explicitly marks `reprintOf: 'lindaiyu'` but copies the immutable record
instead of importing the live engine. A regression test compares these fields
against the existing engine and rarity mapping to detect drift.

BASE and AA are new **illustration candidates for the same identity**. Neither
becomes a second character, a new deck slot or an upgrade. Existing owned copies
keep their UIDs, artwork, level, history and old printing; this preview does not
read them and cannot relabel them. Any future printing-catalogue integration must
retain that distinction.

### Why these are candidates, not upgrades

- 寶玉 trades one power and one recovered pill against two-star 焰心 for one
  base damage. Losing a cheap contest may leave a little fuel for the next one;
  the loss still costs life and the refund does not reverse a defeat.
- 寶釵 trades two power for one damage against same-faction, three-star 諸葛亮
  with the same attack reduction. The attack floor remains 1.
- 湘雲 trades +1 power for −1 damage and −2 flat attack against three-star 哪吒.
  Her cheap-bid and high-bid profiles differ; she is not simply a larger 哪吒.
- 探春's 6/4 + two-pill loss recovery trades power for damage against 王熙鳳's
  7/3 recovery role while changing faction. She can carry a new 雲闕 support role
  without replacing 熙鳳 or granting a hidden social bonus.
- 李紈 trades one power for one damage against same-faction 鎮元大仙's 6/3 with
  the same healing 3. Recovery needs a won round and still caps at 12 life.
- 迎春 pays for a two-star defensive role with 5 power and only one point of
  ability reduction. 森羅 resonance may add another point; received damage still
  cannot fall below 1.
- 惜春 trades +1 power / −1 damage against same-faction two-star 銀角大王.
  Suppression stays simultaneous and affects character abilities, not resonance.

All seven need four-round playtests, not only isolated-stat comparisons. Check
zero/one/large bids, Fury, low-star ties, suppression and first/last-round resource
value. A low average star cost is not by itself a balance guarantee. Their
printed damage remains modest; adding earlier finishing cards may be useful.

**Deliberate change from the first conversational sketch:** 湘雲 was initially
suggested as 森羅 / 2 stars / 7 power / 1 damage / `healOnWin: 1`. That sketch
never entered the live game. This complete eight-person draft instead gives her
the 赤燼 / 3-star / 7/3 / `attack: 6` role shown above: a more assertive cheap-bid
option among several defensive/recovery cards and two identities per faction.
The change expresses this set's intended mechanical variety, not a newly found
canonical allegiance or evidence that the earlier candidate was unbalanced.
Both were untested designs; only the current row is used by this preview.

### Legal paper decks

These lists demonstrate identity uniqueness and cost only; they are not saved
player decks or claims that this preview can play a match.

| Draft | Eight identities | Total |
| --- | --- | ---: |
| 海棠全席 | 黛玉 2、寶玉 2、寶釵 3、湘雲 3、探春 3、李紈 3、迎春 2、惜春 2 | **20 stars** |
| 月下新稿 | 黛玉 2、惜春 2、霜璃 3、王熙鳳 3、李紈 3、迎春 2、翠弦 2、蒼角 4 | **21 stars** |

The second draft includes 熙鳳 as an **existing rules card in a hypothetical deck**,
not as a new HL-01 printing or a claim about the founding poem meeting.

## Eleven printings and five original image files

The first visual target is **8 BASE + 3 AA = 11 printings of eight identities**.
There is no INK/TR/leader promise in this room. Each AA record contains identity,
print ID, image and source information, never duplicate power/damage/ability data.

| Asset | Atlas order / image brief | Source anchor |
| --- | --- | --- |
| `assets/hl01/base-01.png` | 2×2: 黛玉 / 寶玉 / 寶釵 / 湘雲; each a distinct reading or writing moment | Chapter 37, including next-day 湘雲 |
| `assets/hl01/base-02.png` | 2×2: 探春 / 李紈 / 迎春 / 惜春; invitation, hosting, rhyme and supervision are legible roles | Chapter 37 |
| `assets/hl01/daiyu-aa.png` | **雨停之前**: a fresh page and white begonia, wit and concentration rather than a battle aura; rain is original scene direction | Chapter 37 |
| `assets/hl01/xiangyun-aa.png` | **花影留眠**: peaceful rest on stone beneath scattered petals, with a nearby fan | Chapter 62; separate episode |
| `assets/hl01/tanchun-aa.png` | **一紙相邀**: a flower-paper invitation opening the garden to a gathering | Chapter 37; the autumn setting stays distinct from 湘雲 AA |

Stable IDs are `hl01-001-base` through `hl01-008-base`, with
`hl01-001-aa1`, `hl01-004-aa1` and `hl01-005-aa1` for the three alternatives.
`HL01_AA` is an immutable array in that order. All five images now exist;
[ART-HL01](ART-HL01.md) records exact prompts, retained originals, tile mappings
and hashes. The local browser/visual checks are in
[VALIDATION](VALIDATION.md#hl-01-literary-design-preview--2026-09-23).

Use muted celadon, pale ink, paper cream and soft rose. Show people doing different
things; eight versions of the same sad portrait will not communicate a poetry
society. Treat sleeping 湘雲 as a quiet literary scene, fully clothed and
nonsexual. Poems need not be printed into generated art; readable interface text
belongs in HTML. Avoid copied screen-adaptation faces and costumes.

## Fixed opening and the meaning of “play together”

`HL01_SAMPLE` is **賈寶玉 BASE → 史湘雲 BASE → 林黛玉 AA** every time. Opening,
individual reveals, showing all and restarting are presentation state only.
They read no save, draw no random cards, charge nothing and grant nothing.
The three AA views compare artwork while retaining the same candidate rule set.

Exploring cards and this demonstration together is available in the preview.
It does **not** implement live multiplayer, shared hidden hands, a new match
mode or an online opponent. The ordinary game remains available separately.
Future gameplay integration must be a distinct, tested step.

Working product direction: a small literary collection. Pack price, odds, rarity
guarantees, free acquisition, exchange currency, duplicate policy, boxes, pity,
scarcity and release date are **unresolved**. Do not inherit WX-01 prices/seals or
infer pack odds from the fixed opening. Ordinary card rules receive no advantage
from alternative art; this slice establishes no token, wallet or NFT entitlement.

## Acceptance and next bounded step

| Phase | Acceptance | Evidence limit |
| --- | --- | --- |
| Content | Eight IDs/roles; exact 黛玉 reprint; three AA bindings; source links; fixed sample; legal paper decks; no raw same-role strict upgrade | Automated data checks cannot establish competitive fairness or literary completeness |
| Current local preview | Two portrait atlases and three original AA images; all eight inspectable; three BASE/AA comparisons; deterministic reveal/replay; readable desktop/phone controls | Record actual browser/visual checks separately; no profile or economy integration |
| Later gameplay pilot | Choose a small candidate subset and play four-round matchups with old cards, documenting resource decisions and weak/strong draws | Requires explicit engine integration work and regression checks; preview completion is not this step |
| Later release | Approved content/rules/acquisition and existing save/backup/client/Worker rollout gates | No public deployment or hosted schema change follows automatically |

The next follow-up is to continue the **small card-choice playtest**: which three-star
support card is worth the commitment, and when would the player deliberately
conserve pills? Keep emotional reading and mechanical evidence distinct. No
engine, profile, account or economy mutation is part of this document.

**First observed conversation round (2026-09-23):** the user chose 迎春＋0丹
against GM's previously sealed 寶玉＋3丹. Attacks were 5/24; 寶玉's damage 4
(including 赤燼) was reduced to 2 by 迎春's skill and 森羅 resonance. The user
retained 12 pills at 10 life; GM retained 9 pills at 12 life. This is one actual resource
decision in a manual no-Fury teaching game; the four-round result and broader
candidate balance remain unverified. It did not touch a real game save.
