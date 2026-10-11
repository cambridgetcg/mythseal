# LZ-01 · 聊齋・燈下有靈

Design checkpoint: **2026-09-23**. Set ID: **`lz01`**. Source: 蒲松齡《聊齋志異》.
The owner selected **詭美＋人情：雨夜、狐鬼、燈火與相守** and authorized starting
this series after recording the other booster directions in the roadmap.

This first slice is a **complete twelve-character design and a standalone local
card/booster art preview**. The numbers below are untested candidates. They are
not additions to `engine.mjs`, owned cards, a live pack pool or the public game.
The preview does not purchase, sample random outcomes, grant cards, consume
coins, inspect saves or create a collectible entitlement. Repeat opening shows
the same authored demonstration. Preview implementation and completed checks
must be reported separately from this design.

**Local preview implemented · 2026-09-23:** `/liaozhai.html` provides twelve
BASE portraits, the 小倩 AA, story/faction filters, card inspection and the fixed
opening. Original art and exact prompts are in [ART-LZ01](ART-LZ01.md);
completed Node/Python/build and Chromium/WebKit evidence is in
[VALIDATION](VALIDATION.md#lz-01-literary-design-preview--2026-09-23).
Generation-ready briefs (source-checked prompts) for the six remaining special
artworks were added on **2026-10-10** in [ART-LZ01](ART-LZ01.md#specials-briefs--2026-10-10).
**Special printings bound · 2026-10-11:** all six were generated and are bound
in the preview: 嬰寧, 陳氏 and 王六郎 AA, 畫皮之鬼 and 陸判 INK, and 聶小倩 TR, so the
preview shows all nineteen printings (19 of 19). 陸判 INK was bound later that
day from its third prompt, after a card-fit check. The first 嬰寧 AA was
unbound the same day because the card's title and name are printed over 王子服,
the second figure of its scene; three candidates from its revised brief were
reviewed and none was selected. A round-four prompt then gave
`assets/lz01/yingning-aa2.png`, bound after a card-fit check, and the unbound
first file was removed from the tree. All game/economy integration remains
planned.

## The feeling of opening this set

A wet road ends at a lit window. Someone impossible is waiting inside; whether
to offer them a seat is a more interesting question than how loudly they can
destroy a mountain. The set moves between threat, laughter, trust and parting.
The human characters receive the same visual care as the ghosts. A fishing cup,
a branch of blossom and an annotated page can be the centre of a desirable card.

Five stories form small connected groups rather than one invented shared plot:
**聶小倩** (three cards), **嬰寧** (two), **陸判** (two), **畫皮** (three), and
**王六郎** (two). Story companions do not gain an undocumented pairing bonus.
The four existing factions express game roles, not canonical moral allegiances.

## Candidate rules contract

Keep the existing eight-distinct-character / 25-star deck rule, four-card drawn
hand, four-round match, twelve life and twelve pills. Faction resonance still
requires at least two different names of that faction in the drawn hand. Series,
rarity, artwork and a story relationship do not substitute for that rule.

The current effect vocabulary is `power`, `opponentPower`, `attack`,
`opponentAttack`, `damage`, `reduceDamage`, `stopAbility`, `healOnWin`, and
`refundOnLoss`. Every baseline candidate below uses one existing effect, with
the existing caps, timing and suppression semantics. The proposed **餘願**
keyword later in this document is separate engine work.

`P/D` means base power / base damage, before effects, resonance, Fury or levels.
Rarities are **凡品/common, 靈品/rare, 神品/epic**; they describe proposed collection
distribution, not a person's worth or standing in the source text.

| No. | Stable character ID | Character · working title | Story | Faction | Rarity | Stars | P/D | Existing effect candidate |
| --- | --- | --- | --- | --- | --- | ---: | --- | --- |
| LZ01-001 | `niexiaoqian` | 聶小倩 · 燈前相守 | 聶小倩 | 月隱 / `moon` | 靈品 / `rare` | 3 | 5/4 | `healOnWin: 2` · 歸燈：勝利回復 2 |
| LZ01-002 | `ningcaichen` | 寧采臣 · 不取非義 | 聶小倩 | 雲闕 / `yun` | 凡品 / `common` | 2 | 6/1 | `stopAbility: 0` · 守正：封鎖技能 |
| LZ01-003 | `yanchixia` | 燕赤霞 · 匣中白虹 | 聶小倩 | 赤燼 / `ember` | 神品 / `epic` | 4 | 5/6 | `attack: 8` · 出匣：攻擊 +8 |
| LZ01-004 | `yingning` | 嬰寧 · 花間藏笑 | 嬰寧 | 森羅 / `grove` | 凡品 / `common` | 2 | 7/1 | `healOnWin: 1` · 春笑：勝利回復 1 |
| LZ01-005 | `wangzifu` | 王子服 · 懷梅尋路 | 嬰寧 | 赤燼 / `ember` | 凡品 / `common` | 2 | 6/1 | `damage: 2` · 尋芳：傷害 +2 |
| LZ01-006 | `lupan` | 陸判 · 朱筆夜客 | 陸判 | 雲闕 / `yun` | 靈品 / `rare` | 3 | 5/4 | `opponentPower: 2` · 點竅：敵力量 −2 |
| LZ01-007 | `zhuerdan` | 朱爾旦 · 舉觴邀異 | 陸判 | 赤燼 / `ember` | 凡品 / `common` | 3 | 5/5 | `power: 2` · 壯膽：力量 +2 |
| LZ01-008 | `huapi` | 畫皮之鬼 · 燈背另一面 | 畫皮 | 月隱 / `moon` | 神品 / `epic` | 4 | 5/6 | `opponentPower: 1` · 惑目：敵力量 −1 |
| LZ01-009 | `chenshi` | 陳氏（畫皮） · 不棄歸人 | 畫皮 | 森羅 / `grove` | 靈品 / `rare` | 3 | 5/3 | `reduceDamage: 3` · 持燈：受傷 −3 |
| LZ01-010 | `huapidaoshi` | 畫皮道士 · 木劍收煙 | 畫皮 | 雲闕 / `yun` | 凡品 / `common` | 4 | 5/6 | `stopAbility: 0` · 辨魅：封鎖技能 |
| LZ01-011 | `wangliulang` | 王六郎 · 留人間一岸 | 王六郎 | 月隱 / `moon` | 靈品 / `rare` | 3 | 5/3 | `refundOnLoss: 3` · 留渡：敗北回丹 3 |
| LZ01-012 | `xuyuren` | 許氏漁人（王六郎） · 河上留杯 | 王六郎 | 森羅 / `grove` | 凡品 / `common` | 2 | 5/3 | `refundOnLoss: 2` · 酹酒：敗北回丹 2 |

Totals: **12 identities; three per faction; 6 common / 4 rare / 2 epic**.
Faction star totals are **雲闕 9 / 赤燼 9 / 月隱 10 / 森羅 7**. These candidates
do not modify any existing identity, stats, printing, faction or rarity. Existing
original, classical and WX-01 cards keep their roles and remain useful partners.

### Tradeoffs to preserve during tuning

- **聶小倩:** 5/4 and healing 2 trades away power compared with 曜衡's 7/3,
  changes faction, and needs a won round before healing. Do not promote this to
  guaranteed healing or a fictional resurrection ability.
- **寧采臣 / 畫皮道士:** two-star 6/1 is a cheap interrupter with little damage;
  four-star 5/6 is a costly threat that struggles in high-bid contests. The latter
  trades one power for one damage against same-faction 玄箋's 6/5, not a flat upgrade.
- **燕赤霞:** 5/6 +8 flat attack trades two power for one damage and two flat
  attack against 赤翎's 7/5 +6 at four stars. Cheap-bid threat, expensive-bid risk.
- **嬰寧 / 許氏漁人:** same-faction two-star sidegrades of 雲牙 and 沙悟淨:
  respectively +1 power / −1 damage and −1 power / +1 damage, with equal effects.
- **王子服 / 朱爾旦:** modest printed damage and power stop 赤燼's damage bonus
  from being free upside. 王子服 offers more damage but less contest control than
  黃風怪. 朱爾旦's unblocked 7/5 matches 關羽's effective 7/5, but suppression
  leaves 5/5 versus 7/4: a power/damage tradeoff. He is cheaper and weaker than
  燼麟, not its replacement.
- **陸判:** 5/4 trades one power for one damage against same-faction 菩提祖師's
  6/3 with the same power reduction. He is not an extra healing/resurrection system.
- **畫皮之鬼:** 5/6 emphasizes an expensive finishing threat while giving up
  attack reliability; six damage is not a free addition to 渡影's three-star role.
- **陳氏 / 王六郎:** deliberately defensive and especially in need of testing.
  陳氏's low 5/3 stats pay for reduction 3 plus possible 森羅 reduction; the
  existing damage floor remains 1. 王六郎 gives up two power against 王熙鳳's 7/3
  for one extra recovered pill. Recovery still occurs on a loss at up to 12 pills,
  even with zero pills bid, and cannot undo lethal damage or extend a match.

These are comparative design reasons, **not proof of competitive balance**.
Evaluate zero/one/high-pill bids, ability suppression, faction-on/off states,
Fury lethals, lower-star tie advantage, expedition levels and four-round resource
sequences. Pay particular attention to 王六郎's three-pill recovery, 陳氏's
stacked damage reduction and 陸判's power reduction before finalizing values.

### Eight-character construction examples

These paper lists demonstrate distinct IDs and star arithmetic, not playable
saved decks or successful balance tests. Only three cards of each faction exist
in LZ-01, so a two-faction 4+4 list intentionally needs earlier sets.

| Draft | Eight identities | Stars | Intended question |
| --- | --- | ---: | --- |
| 借火護燈 | 聶小倩 3、畫皮之鬼 4、王六郎 3、嬰寧 2、陳氏 3、許氏漁人 2、寧采臣 2、陸判 3 | **22** | Can healing, feints and damage reduction leave enough finishing pressure? A three-faction draw may miss useful resonance. |
| 夜行破魅 | 寧采臣 2、陸判 3、畫皮道士 4、燕赤霞 4、王子服 2、朱爾旦 3、聶小倩 3、嬰寧 2 | **23** | Do the two heavy threats justify weak damage on several supporting cards? Singleton 月隱/森羅 cannot resonate. |
| 舊友同燈 | 聶小倩 3、畫皮之鬼 4、霜璃 3、林黛玉 2、嬰寧 2、陳氏 3、蒼角 4、翠弦 2 | **23** | A 4+4 月隱/森羅 list retains original/classical identities and contrasts defense with low-bid attack. |

## Five story rooms and original art direction

Use restrained ink-blue rain, warm amber light, celadon and aged vermilion.
Give each silhouette a readable face, hands and one story object at card size.
Small warm interiors should make the larger darkness feel inhabited. Rain,
lantern placements, clothing cuts and compositions are original art direction,
not claims that every chosen episode specifies those details.

| Story room | Character concepts | Dramatic focus |
| --- | --- | --- |
| 蘭若・歸燈 | 小倩 beside a lit threshold, pale sleeve and reflected warm light; 采臣 shielding a small lamp with a closed travel bundle; 赤霞 opening a weathered case, a narrow white sword-light cutting the dark | Fear giving way to trust; three independently recognizable people, not a movie ensemble imitation |
| 花村・藏笑 | 嬰寧 among blossom and a garden wall, laughter with room for inward sadness; 子服 on a narrow green path holding the remembered plum branch | Humor, awkward longing and a home that holds a concealed history |
| 夜酌・異客 | 陸判 with green face, red beard, wine cup and annotated writing; 爾旦 lifting a cup before an imposing guest, courage mixed with poor judgment | An unsettling friendship; do not sanitize the story's questionable choices into a universal healing saint |
| 畫室・兩面 | 畫皮之鬼 holding a brush beside a painted figure, conflicting shadows rather than exposed flesh; 陳氏 standing steadily in a doorway with a lamp; the unnamed 道士 with wooden sword, fly-whisk and gourd | Looking, misjudging and staying; give 陳氏 agency and a face, not only a kneeling grief pose |
| 河岸・留杯 | 六郎 at the waterline with room left for another person to reach shore; 許氏 sharing two cups beside a net and quiet river | Friendship without a price, and compassion that refuses another person's death |

The painting room can be disturbing through a mismatched shadow or unfinished
painted face. Avoid graphic mutilation in card art and the opening sequence.
Do not add film-only actors, costumes, dialogue, factions or the 黑山老妖. Do not
give the unnamed people fabricated source names. **許氏漁人 is not 許仙**.

## Proposed printing checklist: 19, not 19 rules cards

**12 BASE + 4 AA + 2 INK + 1 TR = 19 printings of 12 identities.** All treatments
bind to the same baseline identity and stats; no foil-only ability, extra stars,
rarity-derived damage or separate eligibility to fill a deck slot.

Use the existing numbering shape for proposed IDs: `lz01-001-base` through
`lz01-012-base`, with the same number for that character's special printings.
These are design/preview identifiers, not entries in the live printing catalogue.

| Print ID | Character / treatment | Working image | Narrative or composition brief | First preview scope |
| --- | --- | --- | --- | --- |
| `lz01-001-base`–`lz01-012-base` | Twelve BASE portraits | 本畫 | Distinct portrait/action compositions following the rooms above | Twelve candidate BASE cards |
| `lz01-001-aa1` | 聶小倩 / AA | 燈前相守 | A lit threshold answering a distant traveller's lantern; original composition, not a reproduced film scene | Generated local preview image: `assets/lz01/xiaoqian-aa.png` |
| `lz01-004-aa1` | 嬰寧 / AA | 花間藏笑 | Garden distance and a large breathing space of blossoms; 嬰寧 laughing in the tree and 王子服 calling up from the path both stay above the card text | Generated local preview image (2026-10-11, round-four prompt): `assets/lz01/yingning-aa2.png`; the first file was unbound after the card-fit review (the card text covered 王子服) and removed from the tree, and none of three round-three candidates was selected |
| `lz01-009-aa1` | 陳氏 / AA | 仍有人守門 | She bows at her doorway, weeping, to the departing Daoist; her lifted face keeps her readable | Generated local preview image (2026-10-11): `assets/lz01/chenshi-aa.png` |
| `lz01-011-aa1` | 王六郎 / AA | 留人間一岸 | Noon: the mother has climbed out on her own while 六郎, unseen in the shallows, lets her go; the bank stays open | Generated local preview image (2026-10-11): `assets/lz01/liulang-aa.png` |
| `lz01-006-ink1` | 陸判 / INK | 夜酌朱批 | Mostly monochrome brushwork; one or two long vermilion strike-strokes across the top draft (紅勒), no rings | Generated local preview image (2026-10-11, third prompt): `assets/lz01/lupan-ink.png`; five earlier candidates from two prompts were rejected, then the brief was revised for card fit and for strike-only red marks |
| `lz01-008-ink1` | 畫皮之鬼 / INK | 墨下另一面 | In the text's order, the green-faced ghost lifts the blank painted sheet before putting it on; ink and empty paper, no skin | Generated local preview image (2026-10-11): `assets/lz01/huapi-ink.png` |
| `lz01-001-tr1` | 聶小倩 / TR | 歸燈 | Layered frame/light study; the lamp is an original set motif, not a claimed named relic | Generated local preview image (2026-10-11): `assets/lz01/xiaoqian-treasure.png` |

TR is a proposed visual treatment, not proof of scarcity or a minted object.
The first standalone preview showed only the twelve BASE cards and one AA. Since
2026-10-11 it shows all nineteen printings (twelve BASE, four AA, two INK, one
TR) and no special image is planned.
Record generated-image prompts, returned model/provenance information and asset
paths separately when generation occurs. All nineteen exist only as local
preview art: do not present them as issued, owned or minted cards.

## Booster product proposal — unresolved

Working pack name: **燈下秘匣**. A future three-card pack is a candidate so the
interaction can remain familiar. The price, rates, guaranteed rarity, special-art
slot, duplicate handling, dry protection, exchange currency, free acquisition,
box size and relationship to 西行印 are **not approved or implemented** here.
No production supply, paid product, wallet requirement or mint plan is created.

Do not silently inherit WX-01's 300-coin price, pity, seals or box quantities.
LZ-01 has a different roster size and proposed rarity mix. A product decision
needs an explicit analytical distribution, expected duplicate/collection pace
and a free gameplay acquisition route before economy implementation.

The local preview opens a fixed authored selection, supports individual reveal
and inspection, and can restart that demonstration. Labels should say **固定展示**
and **設計預覽**. Neither restart frequency nor an AA appearing in the demonstration
is probability evidence. No purchase button, simulated account balance or
misleading “you own this” result belongs in this slice.

## 餘願 — separately proposed conditional keyword

Prospective meaning: **「若你上一回合落敗，本回合啟用此角色的餘願效果。」**
This is **not an existing engine capability** and does not appear as an active
ability on the twelve baseline candidates. The current `refundOnLoss` triggers
after this card loses its own round; that is a different timing rule.

A bounded later experiment can attach one existing numeric effect to this public
condition on one to three candidates. For example, a separate 王六郎 prototype
could replace his baseline refund ability with **餘願 · 力量 +2**. It must not
silently add this on top of `refundOnLoss: 3`, alter the preview's baseline data
or ship without a new balance decision.

Required semantics before coding:

1. Consult only the immediately preceding **accepted round result** of this
   match for the card's side. Round one is inactive; an older loss is insufficient.
2. The condition is public, fixed before commitments, and identical for UI,
   engine and public-information AI. It never reads an opponent's hidden bid.
3. Resolve the conditional character ability through the existing simultaneous
   `stopAbility` rules. Faction bonuses remain separate. Do not change base stats
   or persist temporary bonuses into card levels.
4. Resuming a match must reconstruct the same condition from validated history.
   A new activity stage is a new match; a previous stage's result does not count
   as a round in it. Never make a second reward settlement to track the keyword.
5. Test first round, prior win/loss, consecutive losses, suppression, reload,
   preview/resolve/AI agreement and all match modes before adding visual polish.

## Primary text anchors and adaptation decisions

Checked **2026-09-23** against the public-domain work transcribed on Wikisource.
The links below name this site's **volume arrangement**, not a universal chapter
numbering across all editions. Work text and its displayed editorial annotations
must be distinguished. No film adaptation is used as primary evidence.

| Original story | Verified anchors used | Adaptation boundary |
| --- | --- | --- |
| [卷二・聶小倩](https://zh.wikisource.org/wiki/聊齋志異/第02卷#聶小倩) | Coerced ghost; the principled traveller; sword-bearing 燕赤霞; burial and refuge. 燕 identifies himself as a 劍客. | This transcription writes **甯采臣**; the fixed card display uses **寧采臣**. Neither a movie Taoist costume nor 黑山老妖 is required by these anchors. |
| [卷二・嬰寧](https://zh.wikisource.org/wiki/聊齋志異/第02卷#嬰寧) | 王子服 follows the remembered blossom; 嬰寧's laughter coexists with grief for her ghost foster mother. | Flowers and humor should not erase her interior life. Clothing and rain are new art direction. |
| [卷二・陸判](https://zh.wikisource.org/wiki/聊齋志異/第02卷#陸判) | 朱爾旦 invites the green-faced, red-bearded judge to drink; writing and bodily transformation are central. | Keep the unsettling friendship; the card effect is not literal surgery and the art need not show it. |
| [卷一・畫皮](https://zh.wikisource.org/wiki/聊齋志異/第01卷#畫皮) | Painted disguise; wife 陳氏; unnamed Daoist with wooden sword, fly-whisk and gourd. He says he cannot restore life. | `huapi` and `huapidaoshi` are editorial identifiers. Do not invent proper names or assign the later restoration to this Daoist. |
| [卷一・王六郎](https://zh.wikisource.org/wiki/聊齋志異/第01卷#王六郎) | A fisherman surnamed 許 shares wine; 六郎 refuses a drowning replacement out of concern for mother and child, later becoming a land deity. | The fisherman has no supplied personal name here. Use **許氏漁人（王六郎）**, not 許仙. The shore/light composition is original. |

The card titles, factions, numerical effects, pack name and all compositions are
Mythseal adaptations. They do not assert textual fidelity beyond the specific
anchors, nor do they excuse the troubling actions found in some of the stories.

## Phased acceptance and handoff

| Phase | Deliverable | Acceptance / evidence boundary |
| --- | --- | --- |
| A · This design | Twelve IDs, source anchors, stat/effect candidates, 19-print proposal, deck arithmetic and art briefs | Table totals agree; primary-source character identities verified; unresolved rules/product decisions stay explicit. This document supplies a design, not engine test results. |
| B · Current local preview slice | Original BASE art, first AA where produced, card inspection and a fixed opening | No imports that mutate game state, no save/account/coin access, no grants or sampling; keyboard/reduced-motion and desktop/phone layouts checked; only created art shown as complete. Record actual checks outside this acceptance plan. |
| C · Later rules pilot | Small baseline subset, optional separate 餘願 experiment | Targeted engine/AI/timing tests, matchup comparisons and human playtest; agree each sidegrade before extending to the full roster. |
| D · Later full local integration | Twelve approved identities, final printing bindings and explicitly chosen acquisition design | Exact-copy persistence, no legacy rewrites, saved receipts, RNG/model equivalence and storage/recovery limits verified. All nineteen art files/treatments need independent completion evidence. |
| E · Later release | A separately authorized coherent client/Worker/content release | Existing module graph, backup compatibility, hosted migration/binding retention, device review and deployment gates still apply. Preview completion does not satisfy them. |

Open decisions: human balance, final prose/title review, optional keyword scope,
special-art priorities after the first AA, booster distribution and acquisition,
physical-device readability, and any eventual release date. **No public deployment,
service migration or ownership-state change is authorized by this design alone.**
