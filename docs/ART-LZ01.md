# 聊齋 · 燈下有靈 — original art studies

Created 2026-09-23 for the local LZ-01 concept preview. Direction selected by the
owner: **詭美＋人情：雨夜、狐鬼、燈火與相守**.

Generation uses the built-in imagegen tool, with no supplied reference images.
The six special printings added on 2026-10-11 were generated with Codex CLI's
built-in imagegen tool (see [their provenance](#provenance--special-printings--2026-10-11)).
Neither tool record has a model field, and no exact image-model identifier is
exposed. Each of the ten files does embed a signed C2PA content credential from
the generating service, which names the creating agent `ChatGPT`, version
`gpt-image` (a model-family label, not an exact version), and records an
invisible watermark; see [embedded content credentials](#embedded-content-credentials-c2pa).
These are original literary interpretations, not reproductions of film costumes
or historical art.
Card names, stats and interface ornaments are rendered separately in HTML/CSS.
These preview assets are not issued or owned cards. The scenes are original
compositions; see [the set design](EXPANSION-LZ01.md) for primary-text anchors.

| Asset | Reading order / subject |
| --- | --- |
| `assets/lz01/base-01.png` | 聶小倩 / 寧采臣 / 燕赤霞 / 嬰寧 |
| `assets/lz01/base-02.png` | 王子服 / 陸判 / 朱爾旦 / 畫皮之鬼 |
| `assets/lz01/base-03.png` | 陳氏 / 畫皮道士 / 王六郎 / 許氏漁人 |
| `assets/lz01/xiaoqian-aa.png` | 聶小倩 · 燈前相守 — full scene AA (`lz01-001-aa1`) |
| `assets/lz01/xiaoqian-treasure.png` | 聶小倩 · 歸燈 — 天工 TR (`lz01-001-tr1`, 2026-10-11) |
| `assets/lz01/yingning-aa.png` | 嬰寧 · 花間藏笑 — full scene AA (`lz01-004-aa1`, 2026-10-11); unbound after the card-fit review, kept unchanged, served by neither allowlist |
| `assets/lz01/lupan-ink.png` | 陸判 · 夜酌朱批 — 墨卷 INK (`lz01-006-ink1`, 2026-10-11, third prompt) |
| `assets/lz01/huapi-ink.png` | 畫皮之鬼 · 墨下另一面 — 墨卷 INK (`lz01-008-ink1`, 2026-10-11) |
| `assets/lz01/chenshi-aa.png` | 陳氏 · 仍有人守門 — full scene AA (`lz01-009-aa1`, 2026-10-11) |
| `assets/lz01/liulang-aa.png` | 王六郎 · 留人間一岸 — full scene AA (`lz01-011-aa1`, 2026-10-11) |

Atlas cells use an exact 2×2 grid in reading order. All ten selected files are
**1024×1536 PNG**, recorded as copied byte-for-byte from the generating tool's
private image archive. For the six 2026-10-11 files this was checked: `cmp`
against each recorded archive original reports no difference. The four
2026-09-23 files (the three atlases and 小倩 AA) were added in `e61d60a`, which
reached this machine's clone by a fetch. No archive path was recorded for them,
and none of their originals is on this machine: on 2026-10-11 there was no
2026-09-23 folder under `~/.codex/sessions/`, and a search of the home folder by
their exact byte sizes found only copies in mythseal checkouts. Their copy
cannot be compared with an original here. What can be checked is their
embedded C2PA data hash: it still matches each file's bytes outside the `caBX`
chunk (see [below](#embedded-content-credentials-c2pa)).
The three atlases contain twelve 512×768 cells. Visual inspection confirmed
the reading order, complete faces, clean grid boundaries and absence of baked
card text. The atlases and 小倩 AA are detailed, cinematic painted-realism
studies; the 2026-10-11 specials follow their treatments, and the spring and noon
AAs are lighter than the atlases. Phone readability and any future compressed
derivatives remain separate checks.

| Asset | SHA-256 |
| --- | --- |
| `base-01.png` | `61e418c5d779f777c860ba98d9a785a903cece1796aefcc3d758be487d3c1aa7` |
| `base-02.png` | `66fc2cb53000fca0b0663768f49dae135fe5dedc229013d2a2b291e79614ec10` |
| `base-03.png` | `e16f4583821312d93be2a18b8324e100f0ddc3ceb3d68678a8c2e12404c6b9f0` |
| `xiaoqian-aa.png` | `6d4fcaca51d2aa65fb5e588bfa7d3bea39b26d5479fe1bc0c627c0457de81932` |
| `xiaoqian-treasure.png` | `646a9fcd789907f645c3c6087c27881537ca3d87305099ed48df06d38929e588` |
| `yingning-aa.png` | `ecf9df417029680a39ceb82983a67a36097141dcd897e21e8ee4208aa8f64249` |
| `lupan-ink.png` | `56cff3e4384b3360f835e44daa27602e9be0cf4761dd0213a87542cb354d2f67` |
| `huapi-ink.png` | `024f9d4be198a89d6ef6bba5c8529c44bc95160bb245c151a848fe00efe16e1d` |
| `chenshi-aa.png` | `5dd7d6e52d058bd2ae6cc0bbfbbbafada766d5722d7b0fb4b0c9a9fe85b52ba3` |
| `liulang-aa.png` | `277b2a156a073f9f9b1d8808051521ed7c41bb6a6c424b48d3a22a0eafbc695b` |

`tests/liaozhai-content.test.mjs` reads this table and fails if the SHA-256 of
any PNG under `assets/lz01/` differs from its row, if a bound file is missing
from the preview allowlist, or if an unbound file is in either allowlist. The
ten files total about 29.1 MiB (30,496,404 bytes). The nine bound files
(26,844,301 bytes) are in the preview allowlist; `yingning-aa.png` has been
unbound since the 2026-10-11 card-fit review (see
[its brief](#lz01-004-aa1--嬰寧-aa--花間藏笑)) and is in neither list. No image
compression, crop rewriting or image editing was performed. The originals of the
six 2026-10-11 files remain at their recorded paths under
`~/.codex/generated_images/` on this machine; none was deleted. Whether the
originals of the four 2026-09-23 files are still retained cannot be checked
here, because their archive path was never recorded and they are not on this
machine (see above). Before a hosted
rollout, measure transfers and decode memory and generate suitable derivatives
while retaining these originals and their hashes.

### Embedded content credentials (C2PA)

Checked on 2026-10-11 with a read-only parse of each file. Every one of the ten
PNGs has exactly the chunks `IHDR`, `caBX`, `IDAT` and `IEND`, all with valid
CRCs. The `caBX` chunk holds a C2PA manifest whose claim generator is
`OpenAI Media Service API` (`c2pa_rs` 0.79.2, C2PA 2.2.0), signed with an
`OpenAI Media Service` certificate (OpenAI OpCo, LLC) and carrying OpenAI TSA
timestamp tokens. Its `c2pa.actions.v2` assertion lists three actions:

- `c2pa.created`, with `softwareAgent` `{ name: "ChatGPT", version: "gpt-image" }`
  and `digitalSourceType` `trainedAlgorithmicMedia`;
- `c2pa.converted`;
- `c2pa.watermarked.unbound`: the service also inserted an invisible watermark.
  The visual reviews below speak only of visible marks.

The manifest's `c2pa.hash.data` assertion equals the SHA-256 of each file with
the `caBX` chunk excluded, so the credential is bound to these exact bytes. The
COSE signature itself was not cryptographically verified. For the six
2026-10-11 files, the base64 `result` of the image call in each rollout decodes
to the repository bytes, `caBX` included, so the credential came from the tool
and was not added afterwards. The files were copied unchanged, which keeps the
credential and the watermark; any later derivative needs its own metadata
decision (see the [pipeline](CONTENT-RELEASE-PIPELINE.md#2-插畫製作與可重建加工)).

| File | `c2pa.created` (UTC) |
| --- | --- |
| `base-03.png` | 2026-09-23T14:58:58Z |
| `base-02.png` | 2026-09-23T14:59:43Z |
| `xiaoqian-aa.png` | 2026-09-23T15:00:29Z |
| `base-01.png` | 2026-09-23T15:01:15Z |
| `chenshi-aa.png` | 2026-10-11T09:02:38Z |
| `xiaoqian-treasure.png` | 2026-10-11T09:02:40Z |
| `liulang-aa.png` | 2026-10-11T09:04:18Z |
| `huapi-ink.png` | 2026-10-11T09:04:55Z |
| `yingning-aa.png` | 2026-10-11T09:05:56Z |
| `lupan-ink.png` | 2026-10-11T10:24:15Z |

`gpt-image` names a model family, not an exact model version. Each provenance
block below therefore records the credential and keeps the exact model
identifier as "not exposed".

## Exact prompts

### base-01

```text
Use case: stylized-concept. Asset type: production portrait atlas for an ORIGINAL Eastern literary card game Mythseal, set Liaozhai: A Light for the Living. Create ONE tall image, 1024x1536 preferred, containing exactly FOUR edge-to-edge equal portrait tiles in a PERFECT 2-column by 2-row grid, no gaps or decorative borders. Each quadrant is an independently usable 2:3 portrait. Each subject belongs ONLY to its own quadrant and never crosses the exact vertical or horizontal midpoint. Face in upper third of each tile, centered waist-up or mid-thigh portrait, entire head and key props within each tile. Sophisticated hand-painted Chinese literary fantasy: textured ink wash underneath fine painterly detail, antique silk and rain-wet wood, shadowy midnight jade/indigo, warm amber candlelight, restrained vermilion accents. Beautiful uncanny atmosphere and human tenderness, not horror spectacle. Subjects are classical literary interpretations, not any film, television, game or celebrity likeness. Original historical-inspired clothing, fully clothed. Distinct faces, ages, silhouettes and props. NO text, lettering, numerals, signatures, symbols resembling text, watermarks, card borders or UI. No gore, no sexualization. Background and pose finish at each quadrant boundary with a clean exact crop. Keep lower fifth within each tile quiet enough for UI overlay outside this artwork.
Exact reading order: TOP LEFT: Nie Xiaoqian, a young adult Chinese woman with pale luminous skin, long dark loose hair partly pinned with a simple slender jade hairpin, layered ivory and pale mist-blue robes, a quiet steady gaze, holding a small warm paper lantern in a rain-damp abandoned temple corridor with bamboo shadows; delicate spectral translucence only at trailing sleeves, dignity and agency. TOP RIGHT: Ning Caichen, a young adult Chinese scholar, modest dark-teal cotton robes and plain scholar headwear, a worn cloth book bundle held close, upright posture and kind resolute eyes beside a candlelit wooden temple door, no weapon. BOTTOM LEFT: Yan Chixia, a weathered adult swordsman with a rough dark beard and wind-tossed tied hair, russet travel robes, sword inside a scabbard across his back and a worn leather sword pouch in one hand, rain slanting beyond a temple eave, grounded tired warmth rather than an armored superhero. BOTTOM RIGHT: Yingning, a fully clothed Chinese teenage girl from the classical story, simple fresh green robes and half-tied dark hair, smiling brightly while holding a white plum blossom branch in a moonlit flower garden, natural playful expression, soft warm light; no fox ears or tails, no sensual pose. Each is a separate portrait.
```

### base-02

```text
Use case: stylized-concept. Asset type: production portrait atlas for an ORIGINAL Eastern literary card game Mythseal, set Liaozhai: A Light for the Living. Create ONE tall image, 1024x1536 preferred, containing exactly FOUR edge-to-edge equal portrait tiles in a PERFECT 2-column by 2-row grid, no gaps or decorative borders. Each quadrant is an independently usable 2:3 portrait. Each subject belongs ONLY to its own quadrant and never crosses the exact vertical or horizontal midpoint. Face in upper third of each tile, centered waist-up or mid-thigh portrait, entire head and key props within each tile. Sophisticated hand-painted Chinese literary fantasy: textured ink wash underneath fine painterly detail, antique silk and rain-wet wood, shadowy midnight jade/indigo, warm amber candlelight, restrained vermilion accents. Beautiful uncanny atmosphere and human tenderness, not horror spectacle. Subjects are classical literary interpretations, not any film, television, game or celebrity likeness. Original historical-inspired clothing, fully clothed. Distinct faces, ages, silhouettes and props. NO text, lettering, numerals, signatures, symbols resembling text, watermarks, card borders or UI. No gore, no sexualization. Background and pose finish at each quadrant boundary with a clean exact crop. Keep lower fifth within each tile quiet enough for UI overlay outside this artwork.
Exact reading order: TOP LEFT: Wang Zifu, a fully clothed Chinese teenage scholar in muted warm russet cotton robes, youthful clean-shaven face and simply tied hair, holding a single dried plum blossom and looking up toward a flowering garden gate with shy wonder, warm spring dusk, not a warrior. TOP RIGHT: Judge Lu Pan, an imposing otherworldly adult male magistrate with subtly jade-green face, long richly red beard, dignified broad features, dark ceremonial robe and plain black official hat; he rests a red brush above a closed blank ledger at a small wine table in deep candlelit darkness, kindly stern and formidable, no visible writing. BOTTOM LEFT: Zhu Erdan, a broad sturdy adult Chinese scholar with a friendly coarse face and short beard, plain cinnamon-brown cotton gown with loose sleeves, holding a modest wine cup in an open-hearted invitation at an old wooden night table, lantern glow on worn furniture, no armor. BOTTOM RIGHT: the Painted-Skin Ghost, an eerily composed adult female human appearance in muted ivory and indigo robes, near an elegant empty robe draped over a wooden screen, reflection on lacquer showing a subtly distorted hollow silhouette; a fine brush held beside a blank paper sheet, original symbolic interpretation, no flayed skin or exposed flesh, no gore, visual uncertainty rather than monstrous aggression.
```

### base-03

```text
Use case: stylized-concept. Asset type: production portrait atlas for an ORIGINAL Eastern literary card game Mythseal, set Liaozhai: A Light for the Living. Create ONE tall image, 1024x1536 preferred, containing exactly FOUR edge-to-edge equal portrait tiles in a PERFECT 2-column by 2-row grid, no gaps or decorative borders. Each quadrant is an independently usable 2:3 portrait. Each subject belongs ONLY to its own quadrant and never crosses the exact vertical or horizontal midpoint. Face in upper third of each tile, centered waist-up or mid-thigh portrait, entire head and key props within each tile. Sophisticated hand-painted Chinese literary fantasy: textured ink wash underneath fine painterly detail, antique silk and rain-wet wood, shadowy midnight jade/indigo, warm amber candlelight, restrained vermilion accents. Beautiful uncanny atmosphere and human tenderness, not horror spectacle. Subjects are classical literary interpretations, not any film, television, game or celebrity likeness. Original historical-inspired clothing, fully clothed. Distinct faces, ages, silhouettes and props. NO text, lettering, numerals, signatures, symbols resembling text, watermarks, card borders or UI. No gore, no sexualization. Background and pose finish at each quadrant boundary with a clean exact crop. Keep lower fifth within each tile quiet enough for UI overlay outside this artwork.
Exact reading order: TOP LEFT: Madam Chen from Painted Skin, a resilient adult Chinese woman in her thirties, practical sage-green and linen robes, dark hair pinned simply, tired face with steady courageous eyes, carrying a covered clay medicine bowl through rainy lamplit paving, warm light catches both hands, composure and human care, no glamorous jewelry. TOP RIGHT: the unnamed Daoist from Painted Skin, a lean elderly Chinese man with silver brows and modest narrow beard, weathered indigo-blue robe and plain topknot, holding a wooden fly whisk and small tied cloth satchel at a rainy stone gate; calm focused gaze, lantern lit profile, original design. BOTTOM LEFT: Wang Liulang, an adult male river spirit with a quiet wistful face, simple faded ink-blue fisherman clothing, damp hair and subtly translucent trailing sleeves, standing near river reeds in evening mist, a single warm lantern reflected behind him and open relaxed empty hands, humane and gentle, no chains or gore. BOTTOM RIGHT: the unnamed fisherman Mr Xu from Wang Liulang, a middle-aged Chinese man with weathered smiling face and short salt-and-pepper beard, plain straw rain cape over moss-brown work clothes, holding a fishing net and a small rustic wine flask beside a wooden skiff under amber lamplight, the river receding into midnight jade fog.
```

### xiaoqian-aa

```text
Use case: stylized-concept. Asset type: full scene alternate-art portrait for an original premium Eastern literary card game Mythseal, set Liaozhai: A Light for the Living. One tall 2:3 image, 1024x1536 preferred, NO grid, no card frame or UI. Original composition titled internally Nie Xiaoqian: A Lamp Kept Lit. A young adult Chinese woman with pale luminous skin, long dark loose hair partly pinned with a simple slender jade hairpin, layered ivory and pale mist-blue robes. She stands at the threshold of a rain-soaked old temple corridor, holding a small warm paper lantern outward in one hand; her face is quiet and resolute, human and tender, not seductive. The warm lantern illuminates her fingertips and the edge of the open wooden door. In the background through bamboo and rain, a small distant scholar's lantern answers along the path; no identifiable secondary face. Rain falls beyond the shelter, wet stone reflects gold, distant temple roof dissolves into blue-green mist. Strong asymmetrical depth: woman upper-middle-right, glowing lantern toward center-left, long dark empty path into distance; bottom fifth is subtle rippling reflections, not cropped hands. Exquisite painterly Chinese fantasy with ink wash texture, antique silk, worn carved timber, soft fine rain. Beautiful uncanny intimacy, a night that contains a place to return to. Restrained midnight jade, mist blue, warm amber, ivory. Design from Pu Songling's classical characters, not any modern film costume or celebrity likeness. Fully clothed, no gore, no fox ears, no romantic embrace. No text, signatures, logos, watermark, numbers, borders or UI.
```

## Specials briefs · 2026-10-10

**Status · 2026-10-11: five generated and bound, one planned.** These are
the briefs for the six remaining LZ-01 special printings listed in
[the set design](EXPANSION-LZ01.md#proposed-printing-checklist-19-not-19-rules-cards).
The owner approved generating them with Codex's built-in imagegen. 嬰寧 AA,
陳氏 AA, 王六郎 AA, 畫皮之鬼 INK and 聶小倩 TR were each generated three times
from their unchanged brief prompt, and one candidate per slot was selected and
copied byte-for-byte under `assets/lz01/` (see
[provenance](#provenance--special-printings--2026-10-11)). 陳氏 AA, 王六郎 AA,
畫皮之鬼 INK and 聶小倩 TR are bound in `liaozhai-cards.mjs` as `LZ01_SPECIALS`
and listed in `hosting/preview-assets.json` only. **陸判 INK (`lz01-006-ink1`)
was bound later the same day** as `assets/lz01/lupan-ink.png`, in the same
way: after five candidates from two earlier prompts were rejected, candidate 3
of 3 from the third (strike-only) prompt was selected after a card-fit check
(see [its provenance](#lz01-006-ink1--陸判-ink--夜酌朱批-1)). **嬰寧 AA
(`lz01-004-aa1`) was unbound the same day:** on the card face its title and
name are printed over 王子服, the second figure of the drawn moment. Its file
stays in the repository unchanged, but nothing points at it and neither
allowlist lists it. Three candidates from the revised card-fit prompt were
reviewed and none was selected, so the slot is still planned (see its brief).
The briefs below were written
by a session that could not generate images. The generating route is the
repository's built-in imagegen ([pipeline](CONTENT-RELEASE-PIPELINE.md#2-插畫製作與可重建加工)).
Treat each prompt as a plan: if the generation prompt changes, record the text
actually sent.

**How the sources were checked:** on 2026-10-10, each quoted phrase was matched
verbatim inside its own story section of the rendered zh.wikisource volume page.
A second WebFetch reading confirmed the same phrases. No quoted string contains
this transcription's `{{另|…}}` variant-reading markup, but three sit beside
variant readings: 「鋪人皮于榻上，執彩筆」 stops just before 「而{{另|繪|畫}}之」,
「見一獰鬼，面翠色」 is followed by 「齒巉{{另|巉|然}}」, and 「黃昏告退，輒過齋頭，就燭誦經」
sits between 「曲{{另|承|成}}」 and 「慘然{{另|去|出}}」. The rendered page prints
these inline, for example 「執彩筆而繪一作「畫」之」. The 嬰寧 quotes added in
the same-day review (「勿爾，墮矣！」, 「生俟其笑歇，乃出袖中花示之」,
「懷梅袖中，負氣自往」, 「年已十六」, 「阿甥已十七」) were each matched once, inside
the 嬰寧 section, in both the rendered page and its raw wikitext. Each brief separates
the **verified anchor** from the **invented composition**. Rain, lamps, poses,
footpaths and framing are Mythseal art direction unless the quote says otherwise.

**Source-alignment revision · 2026-10-11.** The owner asked that the four briefs
which had departed from the text on purpose follow it instead. 陳氏 AA now bows
at the door rather than standing upright. 畫皮之鬼 INK shows the green-faced
ghost lifting the sheet before it becomes a woman, not the woman already holding
it. 王六郎 AA is set at noon, when the woman climbs out on her own, not at dusk.
嬰寧 AA no longer shows the plum blossom in 王子服's sleeve. Two smaller
readings were corrected at the same time: the 嬰寧 garden's three-bay thatched
hut stands inside the garden among its trees, and the 陳氏 Daoist carries his
bag and wooden sword rather than a gourd at the hip. Each quote added in this
revision was matched exactly once, inside its own story section, in both the
raw wikitext (`action=raw`) and the rendered volume page (the /wiki/ page
without variant conversion; the zh-hant view prints 于 as 於) on 2026-10-11.
「如鋸」 and 「而窗窺之」 are quoted short because the characters just before them
carry variant readings (「齒巉{{另|巉|然}}」 and 「躡{{另|跡|足}}」). The 陸判 INK
and 聶小倩 TR briefs are unchanged.

**Review fixes · 2026-10-11.** A same-day review against the text tightened
three of those briefs. The 王六郎 infant is no longer swaddled, because the
child 「揚手擲足而啼」. The 畫皮之鬼 face now reads as fearsome (獰), with its
saw-like teeth plainly bared, and the sheet is no longer half-finished. The
陳氏 Daoist has stopped on his way out to face her as she meets him at her gate
(「乃別欲去」, then 「拜迎于門」); the earlier wording, paused and half turned
back down the lane, read as her calling after him. Each prompt is exactly the
contents of its `text` block with no trailing newline, which is the byte string
the provenance checklist hashes. A first 陸判 INK trial image was generated on
2026-10-11 to test the generation route. It and two later candidates from the
same prompt were reviewed and none was selected; neither were the two
candidates from the revised prompt (see the 陸判 INK brief below). The other
five slots were generated later that day; see the status note above.

| Print ID | Card · slot | Title | File (status 2026-10-11) | Source section | Verified quote (≤20 字) |
| --- | --- | --- | --- | --- | --- |
| `lz01-004-aa1` | 嬰寧 · AA 異畫 | 花間藏笑 | `assets/lz01/yingning-aa.png` (unbound; planned again; no round-three candidate selected) | [卷二・嬰寧](https://zh.wikisource.org/wiki/聊齋志異/第02卷#嬰寧) | 「仰視，則嬰寧在上。見生來，狂笑欲墮」 |
| `lz01-009-aa1` | 陳氏 · AA 異畫 | 仍有人守門 | `assets/lz01/chenshi-aa.png` (bound) | [卷一・畫皮](https://zh.wikisource.org/wiki/聊齋志異/第01卷#畫皮) | 「陳氏拜迎于門，哭求回生之法」 |
| `lz01-011-aa1` | 王六郎 · AA 異畫 | 留人間一岸 | `assets/lz01/liulang-aa.png` (bound) | [卷一・王六郎](https://zh.wikisource.org/wiki/聊齋志異/第01卷#王六郎) | 「僕憐其抱中兒，代弟一人，遂殘二命」 |
| `lz01-006-ink1` | 陸判 · INK 墨卷 | 夜酌朱批 | `assets/lz01/lupan-ink.png` (bound; third prompt) | [卷二・陸判](https://zh.wikisource.org/wiki/聊齋志異/第02卷#陸判) | 「朱獻窗稿，陸輒紅勒之，都言不佳」 |
| `lz01-008-ink1` | 畫皮之鬼 · INK 墨卷 | 墨下另一面 | `assets/lz01/huapi-ink.png` (bound) | [卷一・畫皮](https://zh.wikisource.org/wiki/聊齋志異/第01卷#畫皮) | 「舉皮如振衣狀，披于身，遂化為女子」 |
| `lz01-001-tr1` | 聶小倩 · TR 天工 | 歸燈 | `assets/lz01/xiaoqian-treasure.png` (bound) | [卷二・聶小倩](https://zh.wikisource.org/wiki/聊齋志異/第02卷#聶小倩) | 「黃昏告退，輒過齋頭，就燭誦經」 |

File names follow the existing `xiaoqian-aa.png` pattern.
`tests/liaozhai-content.test.mjs` applies the `assets/lz01/[a-z0-9-]+.png`
pattern to BASE atlas paths and to every bound special `src`, and also checks
each bound file's PNG signature, its 1024×1536 header and its SHA-256 against
the table above. `-treasure` follows the WX-01 TR file
`assets/expansion/wukong-treasure.png`. `lupan-ink.png` was first proposed with
the brief and used only once a selected file existed (2026-10-11, third
prompt). `yingning-aa.png` exists but is unbound. If a regenerated 嬰寧 AA is
selected, give it a new name such as `yingning-aa2.png`, so that no committed
path ever changes bytes; the
unbound file can then be removed, because its bytes stay in Git history (commit
`3c07dfe`) and in the private archive.

### Rules shared by all six prompts

- One tall **2:3 image, 1024×1536 preferred**, no grid, no card frame, no UI. Card
  name, stats, treatment mark and frame stay in HTML/CSS.
- No text, lettering, pseudo-glyphs, calligraphy, seals, signatures, logos,
  watermarks or numbers. Paper, scrolls and ledgers are blank or show illegible
  texture only.
- Original literary interpretation of Pu Songling's characters. Supply **no
  reference images** and do not imitate any film, television, animation or game
  costume, scene or celebrity likeness.
- Everyone is fully clothed. Nothing is sexualized. Do not show gore, flayed skin,
  surgery, corpses, drowning or an embrace. The mood is uncanny, not violent.
- Faces stay readable at card size, and the bottom fifth stays quiet for overlays.
- **Card fit (added 2026-10-11, after the 嬰寧 AA review).** The card face crops
  the 2:3 image to 5:7 (`object-fit: cover`, about 3.6% off the top and the
  bottom) and prints the title, name, stats and footer over the image from
  about 57–60% of its height downwards. A quiet bottom fifth is therefore not
  enough. Keep every figure of the drawn moment above about 55% of the image
  height and leave the lower two fifths as quiet ground; the 墨卷 paper shade is
  at least about 70% opaque over that zone. `object-position` cannot rescue a
  low figure, because the cover crop leaves only about 7% of vertical slack.
  Before binding, view the candidate on the card in the dialog at 1440 and 390
  widths. The five prompts sent on 2026-10-11 asked only for a quiet bottom
  fifth. In the four still bound every face, hand and the drawn action clear
  the text block, but two figures reach behind the lettering lower down: in
  陳氏 AA the faceless Daoist's lower robe and the lower half of his wooden
  sword sit behind the title and name, and in 畫皮之鬼 INK the ghost's lower
  robe sits behind 鬼 under the paper shade. These are recorded as caveats on
  each file's Card fit line, not as passes. 嬰寧 AA did not clear the text block
  and was unbound. The two round-three
  prompts below include this rule. In the 陸判 INK candidate bound from one of
  them, every face, hand and the brush sit above about 55%, and only props, the
  lower drafts and the strike's tail sit under the paper shade, clear of the
  lettering. None of the three 嬰寧 AA candidates from the other kept 王子服
  above 55%; see their record in the brief.
- Reuse each character's BASE description from the prompts above so the
  printing reads as the same identity. Treatments do not change rules.
- Do not invent proper names for the unnamed Daoist, the fisherman or the dead.
  The fisherman is 許氏漁人, not 許仙.

### lz01-004-aa1 · 嬰寧 AA · 花間藏笑

**Status · 2026-10-11: planned again (unbound).** Candidate 3 of 3 was selected
and bound as `assets/lz01/yingning-aa.png` in commit `3c07dfe`, then unbound the
same day after a card-fit review. 王子服 stands at about 59–76% of the image
height. On every card render (the dialog at 1440 and 390 widths, in Chromium
and WebKit) his face sits between the title 花間藏笑 and the name 嬰寧, and his
robe is behind 寧. His call 「勿爾，墮矣！」 is the drawn moment, so its second
figure is overprinted. Moving the crop cannot fix this (see the card-fit rule
above). The file is kept unchanged but is unbound and in neither allowlist; its
provenance block below remains the record. The prompt below was revised for
card fit. Three candidates were generated from it in round three and none was
selected (see the round-three record below), so the slot stays planned.

- **Verified anchor:** The next day (「次日，至舍後」) 王子服 walks into the small
  garden behind the house: 「有園半畝，細草鋪氈，楊花糝徑」, and inside it
  「有草舍三楹，花木四合其所」. He hears rustling overhead and finds 嬰寧 laughing
  in a tree: 「仰視，則嬰寧在上。見生來，狂笑欲墮」. He calls up to her:
  「生曰：『勿爾，墮矣！』」. That call is the drawn moment. Only after her
  laughter has stopped does he show the flower: 「生俟其笑歇，乃出袖中花示之」,
  so the blossom stays out of the picture and his hands are drawn empty.
  「懷梅袖中」 comes from an earlier passage, when he set out alone to find her
  (「懷梅袖中，負氣自往」), not from the garden scene.
- **Invented:** The tree's blossom species (the text does not name it), the
  light (the text gives 「次日」 but no hour), the scale relationship, the camera
  distance and the softly shaded corner of the garden. The 2026-10-10 draft
  drew the dried plum blossom half-tucked in his sleeve as foreshadowing; that
  is removed so the picture stays inside this moment.
- **Excluded:** the plum blossom, which he brings out only after this moment;
  her fall from the tree and his steadying her (「方將及地，失手而墮」); the
  courtship dialogue that follows, the wrist-holding, the neighbour episode and
  any fox features. In this story 嬰寧 is sixteen (「年已十六」) and 王子服
  seventeen (「阿甥已十七」), so keep the scene playful and non-romantic.
- **Prompt revision · 2026-10-11, after the card-fit review:** the three
  candidates came from the earlier prompt (SHA-256 `dcfcf70d…`, quoted verbatim
  in the provenance section below). The anchors and exclusions are unchanged;
  only the composition moved. 王子服 now stands on the path in the middle
  distance, a little to one side of the tree, with his whole figure ending
  above the lower two fifths of the image and his face and raised hand readable
  at card size. 嬰寧 moves up into the upper third so both fit. "Far below" and
  "only Wang Zifu is small" became "smaller than Yingning but not tiny", and
  the quiet zone grew from the bottom fifth to the lower two fifths. The scale
  relationship was always invented composition, not text.
- **Round three · 2026-10-11, card-fit prompt:** three candidates were
  generated from the prompt below (SHA-256 `00bdf1f605a8…`, the brief as
  committed in `0ab6819`; 嬰寧 had no round two) by the route recorded in
  [the 陸判 INK provenance block](#lz01-006-ink1--陸判-ink--夜酌朱批-1): Codex CLI
  0.162.1, `image_gen__imagegen`, `transparent_background: false`, the tool
  prompt and the returned `revisedPrompt` byte-identical to the brief, no model
  field and no input images. The text sent to the agent is the fixed wrapper
  used throughout this file around this prompt (SHA-256 `91291d2c765b…`). All
  three are 1024×1536 and carry the same kind of C2PA credential as the bound
  files (`ChatGPT` / `gpt-image`). The binding session re-read each rollout and
  decoded each image result to the archive bytes.
  - r3-c1: SHA-256 `639f2b079933ffb379e23efa507d6300b7692bee05ada1df895c1600663b3b43`,
    3,666,408 bytes, generated 2026-10-11T10:22:07Z, session
    `01a12a7a-8108-7730-b3fd-44b3e77a6368`, archive
    `~/.codex/generated_images/01a12a7a-8108-7730-b3fd-44b3e77a6368/exec-8146d2c4-6544-44b9-a035-caa9876f67a6.png`
  - r3-c2: SHA-256 `ac078ad0cc16c2800bf81c845c4c5f5862da97531ca274769a085ef2fdbe9a80`,
    3,972,456 bytes, generated 2026-10-11T10:23:37Z, session
    `01a12a7b-fc1b-7de2-8ea1-e52f570bb8cb`, archive
    `~/.codex/generated_images/01a12a7b-fc1b-7de2-8ea1-e52f570bb8cb/exec-6f79c7fa-dd65-4df6-9c45-8da89c377a20.png`
  - r3-c3: SHA-256 `94e1ba7f22c01f69a10e0c34df777bf4a7b02e9ef3ab2f7daf7cd372127a591c`,
    3,953,161 bytes, generated 2026-10-11T10:25:08Z, session
    `01a12a7d-5960-79c0-82c5-8f849fda0ae2`, archive
    `~/.codex/generated_images/01a12a7d-5960-79c0-82c5-8f849fda0ae2/exec-91eaab38-c8cd-46bb-8f31-01e6ae6d41a3.png`

  Two read-only reviews judged them, one for fidelity and safety and one for
  craft and card fit. The craft review showed each candidate on the card in
  the dialog at 1440 and 390 widths in Chromium and WebKit and measured the
  lettering in image pixels: the title starts at about y871 (390) or y915
  (1440) and the name at about y954 or y990, against the card-fit line at
  y845 (55%). In all three the reviews found no text, numerals, seals,
  signature or visible watermark, including in the corners (r3-c1's window is
  borderline; see below); everyone is fully clothed and nothing is sexual or
  gory; both figures have human ears and no fox features; there is no
  touching and no fall. In each, 嬰寧 laughs in the tree with one hand on the
  trunk and one on a branch, 王子服 stands on the path raising one open hand, and willows,
  catkins and a thatched hut ringed by blossom match 「楊花糝徑」 and
  「花木四合其所」. But in all three 王子服's lower robe and feet reach about
  61–64% of the image height, below the card-fit line. None was selected; the
  workflow orchestrator kept the slot planned.
  - r3-c1 fails card fit at 390 in both engines. 王子服 runs from about y620 to
    y988 (40–64%); his robe's left edge meets the end of the title 花間藏笑 and
    his left foot runs into the top of the name box, so on the card it touches
    寧. Its hut window is borderline: at 5–10× its slatted lattice loosely
    resembles columns of pseudo-text, although at 1–3× it reads as a
    paper-backed lattice. A Japanese-style stone lantern stands in the left
    corner again, and the door panes look like glass.
  - r3-c2 has the cleanest card fit (王子服 at y650–931, clear of every glyph
    in all four renders), but his lowered hand holds a small reddish-brown
    dried sprig, still attached at his fingers at 2×, 5× and 8×. It reads as
    the withered blossom he brings out only after her laughter stops
    (「生俟其笑歇，乃出袖中花示之」), which breaks the brief's main exclusion and
    the prompt's empty hands.
  - r3-c3 has the strongest moment: raised brows and an open mouth make
    王子服 read as alarmed (「勿爾，墮矣！」), she leans furthest out with her
    head thrown back (「狂笑欲墮」), and both his hands are empty. The fidelity
    review picked it; the craft review ranked it only as a fallback. It clears
    every glyph with little room: 王子服 runs to about y980 (64%), so his knees
    and feet stand level with the title and name rows, about 10px right of the
    390 name box, and he ends about 4% below the prompt's lower-two-fifths
    line. An invented hooded grey stone statue in a small wooden shrine in the
    dim left corner (about x80–110, y625–715) looks like a Jizō or Buddhist
    figure and can read as a small third figure at card size.

  None was committed; all three stay in the private archive. The prompt below
  is unchanged. Another round needs a revision that keeps 王子服's feet above
  about 55% (y845); that revision has not been written.

```text
Use case: stylized-concept. Asset type: full scene alternate-art portrait for an original premium Eastern literary card game Mythseal, set Liaozhai: A Light for the Living. One tall 2:3 image, 1024x1536 preferred, NO grid, no card frame or UI. Original composition titled internally Yingning: Laughter Hidden among Flowers. A half-acre back garden behind a country house: fine grass like a soft carpet, a narrow path dusted with drifting willow catkins, and a small three-bay thatched hut ringed on all sides by flowering trees; abundant pale pink and white spring blossom fills much of the canvas as breathing space. High in a blossoming tree in the upper part of the image, Yingning, a fully clothed Chinese teenage girl from the classical story, simple fresh green robes and half-tied dark hair, is caught laughing so helplessly she almost loses her balance, one hand gripping a branch, petals shaken loose around her; her bright natural laughing face catches soft warm spring light and stays clearly readable at small card size; her head is about one tenth of the image height, placed in the upper third. On the path below the tree, a little to one side and in the middle distance, Wang Zifu, a fully clothed teenage scholar in muted warm russet cotton robes, has stopped mid-stroll and looks up in alarm, calling to her to be careful, one empty hand raised and the other empty at his side; a respectful distance separates them. His whole figure, from head to feet, stands in the middle band of the image and ends above the lower two fifths, and his face and raised hand stay readable at small card size. Humour, surprise and gentle concern, with one softly dim shaded corner of the garden hinting at a quieter hidden history. Clear vertical depth: Wang Zifu is smaller than Yingning but not tiny, Yingning stays large enough to read, and generous negative space of blossom surrounds them; the lower two fifths of the image are open quiet grass, path and fallen petals with no figure and no cropped limbs, because card text is printed over them. Exquisite painterly Chinese literary fantasy with ink wash texture under fine detail; restrained celadon, blossom ivory, pale peach, warm amber and a touch of aged vermilion. Design from Pu Songling's classical characters, not any modern film costume or celebrity likeness. Fully clothed, non-sexual, no fox ears or tails, no embrace or touching, no romantic gaze, no gore. No text, signatures, logos, watermark, numbers, borders or UI.
```

### lz01-009-aa1 · 陳氏 AA · 仍有人守門

**Status · 2026-10-11: generated and bound** as `assets/lz01/chenshi-aa.png`
(candidate 1 of 3, preview only; see its provenance block below).

- **Verified anchor:** The day after 王生's death, 陳氏 sends 二郎 for the Daoist
  (「明日，使弟二郎奔告道士」). The Daoist arrives with a wooden sword
  (「仗木劍，立庭心」), destroys the ghost, stoppers the gourd and puts it in his
  bag (「道士塞口入囊」), rolls up the skin, bags that too and takes his leave
  (「亦囊之，乃別欲去」). 陳氏 then bows to him at the door and, weeping, begs
  for a way to bring her husband back: 「陳氏拜迎于門，哭求回生之法」. That is
  the drawn moment. Only after he declines does she fall prostrate:
  「道士謝不能；陳益悲，伏地不起」. Her persistence continues: 「陳固哀之」 and
  「陳忍痛受之」.
- **Invented:** The form of the bow. The text says only 拜, so the prompt draws
  a low kneeling bow on the threshold, not yet prostrate, with her tear-marked
  face lifted toward the Daoist so it stays readable at card size. That lifted
  face, not an upright pose, now carries the set's direction to give 陳氏 agency
  and a face. The hour (the text gives 「明日」 but no time), the grey weather
  after rain, the lamp left burning from the night, the lane, where the Daoist
  stands as she meets him, and his back view are also invented. His BASE fly
  whisk is left out because the ghost had already smashed it (「取拂碎之」). The
  2026-10-10 draft stood her upright and sent the Daoist far down the lane; both
  are removed.
- **Excluded:** the husband's body and wound, the beggar's humiliation, the heart
  episode and any monster. The gourd and the rolled skin stay inside the
  Daoist's bag. He is not named, his face is not shown, and he is not shown
  restoring life.

```text
Use case: stylized-concept. Asset type: full scene alternate-art portrait for an original premium Eastern literary card game Mythseal, set Liaozhai: A Light for the Living. One tall 2:3 image, 1024x1536 preferred, NO grid, no card frame or UI. Original composition titled internally Madam Chen: Someone Still Keeps the Door. Madam Chen from Painted Skin, a resilient adult Chinese woman in her thirties, practical sage-green and linen robes, dark hair pinned simply, no glamorous jewelry. In grey daylight after rain, she kneels in a low formal bow on the threshold stone of her modest household gate, both hands joined before her, weeping as she begs a departing Daoist for help; her head is inclined in the bow, but her tear-marked face lifts toward him in clear three-quarter view, readable at small card size: grief and pleading held together by resolve, not collapse; she is bowing, not lying on the ground. Just inside the threshold behind her, a small oil lamp left from the night still burns low, warming the door edge and her sleeve; the house beyond is quiet shadow with no figure visible. A few paces down the wet stone lane, the Daoist has stopped on his way out and turned to face her as she meets him at her gate: a lean elderly man in a weathered indigo-blue robe with a plain topknot, a plain wooden sword held low and a small tied cloth bag at his side, seen in three-quarter back view with no visible face. Strong architectural composition: the door frame and her bowing figure hold the centre-right, the Daoist stands at the left with the lane receding behind him, and the bottom fifth is calm wet paving in front of the threshold. Exquisite painterly Chinese literary fantasy with ink wash texture; restrained ink-blue daylight, celadon, worn timber brown, one warm amber lamp and faint aged vermilion. Design from Pu Songling's classical characters, not any modern film costume or celebrity likeness. Fully clothed, no gore, no blood, no corpse, no wound, no monster. No text, signatures, logos, watermark, numbers, borders or UI; door hangings carry no writing.
```

### lz01-011-aa1 · 王六郎 AA · 留人間一岸

**Status · 2026-10-11: generated and bound** as `assets/lz01/liulang-aa.png`
(candidate 2 of 3, preview only; see its provenance block below).

- **Verified anchor:** On their last night 六郎 tells 許 who will replace him and
  when: 「亭午，有女子渡河而溺者，是也」. The next day 許 waits by the river to
  watch (「明日，敬伺河邊，以覘其異」): 「果有婦人抱嬰兒來，及河而墮」, and the
  child is thrown onto the bank, 「兒拋岸上，揚手擲足而啼」. She then climbs out
  on her own, rests on the ground a moment and leaves with the child:
  「忽淋淋攀岸以出，藉地少息，抱兒徑去」 (「及婦自出」). That evening 六郎
  explains that he let her go for the infant's sake:
  「僕憐其抱中兒，代弟一人，遂殘二命，故捨之」. The drawn moment is 「藉地少息」,
  at the hour the text gives: noon (亭午).
- **Invented:** 六郎's visible presence. At noon the text shows only the woman
  and the child, so he is drawn faint and translucent in the shallows, standing
  back with open empty hands, a presence the living do not see. The viewpoint is
  the bank where 許 waits, but 許 is not drawn. The footpath home, the weather
  and the light are also invented. So is the small loose cotton cloth around
  the infant; its arms and legs stay free because the child 「揚手擲足而啼」, so
  it is not swaddled. The 2026-10-10 draft moved the scene to the
  dusk meeting afterwards (「抵暮，漁舊處」) with wine cups (「飲則酹地」); that
  framing is removed.
- **Excluded:** her fall and the struggle in the water (「婦沉浮者屢矣」). Show no
  one submerged and no drowning. The woman is unnamed and stays secondary,
  small and side-on, with no detailed portrait face. No 許, no wine or cups, and
  no other identifiable person.

```text
Use case: stylized-concept. Asset type: full scene alternate-art portrait for an original premium Eastern literary card game Mythseal, set Liaozhai: A Light for the Living. One tall 2:3 image, 1024x1536 preferred, NO grid, no card frame or UI. Original composition titled internally Wang Liulang: A Shore Left for the Living. High noon at a broad quiet river crossing: the sun stands overhead, shadows are short, and the water glitters in clear light. A little way out from the bank, Wang Liulang, an adult male river spirit with a quiet wistful face, simple faded ink-blue fisherman clothing, damp hair and subtly translucent trailing sleeves, stands calmly knee-deep in the bright shallows, his whole figure faintly translucent like light on water, a presence the living do not see; he has stepped back and turned slightly aside so the bank stays open, open empty hands lowered, his gentle humane gaze resting on the mother and child he has let go; his face is clearly readable at small card size and his figure fills at least a third of the image height. On the grassy bank nearby, a young peasant mother who has just climbed out of the river on her own sits on the ground catching her breath, her modest loose cotton clothes dark with river water and fully covering her, damp hair pinned up; tired but safe, she reaches toward her infant lying on the grass beside her, loosely wrapped in a small cotton cloth with its arms and legs free, waving its little hands, kicking its feet and crying. She is small and side-on, secondary, without a detailed portrait face. A narrow footpath climbs the bank from her toward a distant village, clear and unobstructed: room for the living to go home. Broad calm water, pale noon haze, reeds and stones. Liulang upper-middle-left, the mother and child on the bank lower-middle-right above the bottom fifth, the path rising diagonally; bottom fifth is soft ripples and stones. Relief, not panic. Exquisite painterly Chinese literary fantasy with ink wash texture; restrained ink blue, river jade, pale noon gold and ivory. Design from Pu Songling's classical characters, not any modern film costume or celebrity likeness. Fully clothed, non-sexual, no one in the water except Liulang, no drowning figure, no struggle, no chains, no gore, no figures besides Liulang, the mother and her infant. No text, signatures, logos, watermark, numbers, borders or UI.
```

### lz01-006-ink1 · 陸判 INK · 夜酌朱批

**Status · 2026-10-11: generated and bound** as `assets/lz01/lupan-ink.png`
(round three, candidate 3 of 3, preview only; see its
[provenance block](#lz01-006-ink1--陸判-ink--夜酌朱批-1)). Eight candidates were
reviewed: three from the first prompt, two from the second and three from the
third (see the notes below). The prompt below is the round-three prompt that
produced the bound file: it keeps the card-fit rule and draws the red marks
as strike-strokes only, with no rings.

- **Verified anchors:** 陸判 marks 朱爾旦's essays in red and judges them all poor:
  「朱獻窗稿，陸輒紅勒之，都言不佳」. Their first night: 「挑燈獨酌。忽有人搴簾入」.
  The statue's appearance: 「東廡有立判，綠面赤須」. 朱 accepts the wager to
  「負得左廊判官來」.
- **Invented:** Combining the drafts with the drinking table, the two background
  vignettes, and the colour rule: the only colours are spare vermilion and a
  barely perceptible grey-green tint on his face, which keeps 「綠面」 in an ink
  print. The form of the red marks is a reading, not a quote: the text says only
  that 陸 marked the drafts in red (「紅勒之」). The prompt reads 勒 as a stroke
  struck through the writing, so it draws one or two long sweeping vermilion
  strike-strokes across the top draft and no rings. The steep, foreshortened
  view that turns the drafts mostly away from the viewer is also invented; it
  keeps their surface to faint illegible grey texture.
- **Excluded:** the heart exchange, the head exchange and any blade or blood.
  Red marks must not become legible characters. Reject outputs with pseudo-text.
  Also reject any output with a red ring, circle or dot, with marks set side by
  side in a row, or with marks that, alone or together, read as a letter,
  numeral or symbol, as in both earlier rounds.
- **Prompt revision · 2026-10-11, after first generation:** none of the three
  candidates from the first prompt (SHA-256 `76bd79d7…`) was selected. Their
  vermilion circles and slashes sat in rows or were joined by thin lines, so
  they read as Latin letters, a percent sign or the number 100; two also
  filled the drafts with made-up characters, and a warm amber lantern broke the
  colour rule. The second prompt kept the scene and anchors and only added
  limits: ruled drafts with faint grey specks; one ring around a passage per
  sheet plus long strokes down whole columns, each a separate brushstroke never
  joined or set in a row; no yellow, amber or orange, with a vermilion lamp
  flame; the statue alone in its corridor and plainly a robed, hatted figure on
  朱's back; and "lettering, pseudo-glyphs" added to the closing list, as in the
  shared rules.
- **Second round · 2026-10-11:** two candidates were generated from that
  revised prompt (SHA-256 `9976af342ac0…`, the brief as committed in
  `e1f0d3b`) by the route described in the provenance section: Codex CLI
  0.162.1, `image_gen__imagegen`, `transparent_background: false`, the tool
  prompt and the returned `revisedPrompt` byte-identical to the brief, no model
  field and no input images. Both are 1024×1536 and carry the same kind of C2PA
  credential as the bound files (`ChatGPT` / `gpt-image`).
  - r2-c1: SHA-256 `68d8cadb55b321c42f0ef84d7cc275e67f432d4d74a928252f155664b2e16105`,
    3,461,318 bytes, generated 2026-10-11T09:16:44Z, session
    `01a12a3e-d85a-7243-a662-70093c677313`, archive
    `~/.codex/generated_images/01a12a3e-d85a-7243-a662-70093c677313/exec-f7685121-567b-4e68-ac6c-3587ba227e94.png`
  - r2-c2: SHA-256 `4ffa45b8f300aa07d4cfaa2fac18eca8ad8ee24e12ade0dcb8a691b0d86a74e3`,
    3,364,564 bytes, generated 2026-10-11T09:16:46Z, session
    `01a12a3e-e116-76b1-a698-e5aa49b81fd4`, archive
    `~/.codex/generated_images/01a12a3e-e116-76b1-a698-e5aa49b81fd4/exec-49792062-9baf-4a3d-84f8-14b219b63d90.png`

  A review at about 10:18 BST cropped their drafts, faces and vignettes, but
  its verdict was not written down. A later session re-examined both files for
  this record, and neither is selectable. In r2-c1 the front sheets carry ring,
  stroke, ring, stroke in one row, which reads as "0/0/" or "010". In r2-c2 an
  open ring beside a single stroke reads as "10" or "IO". Both break the
  prompt's rule against marks set side by side or reading as numerals. In both,
  the marked drafts also sit at about two thirds of the image height and below,
  under the 墨卷 paper shade and the card text. Neither was committed; both stay
  in the private archive.
- **Prompt revision · 2026-10-11, card fit:** after the 嬰寧 AA review a
  further edit kept the pair, the table top, the drafts and the brush above the
  lower two fifths of the image, which stay quiet empty paper below the table
  edge. Nothing else changed. That text (SHA-256 `503dd609cc45…`, committed in
  `0ab6819`) was never sent; its card-fit sentence carries into the round-three
  prompt unchanged.
- **Round-three prompt · 2026-10-11, strike-only marks:** both rounds failed on
  the same point. Rings and strokes near one another read as Latin letters, a
  percent sign or 100 in round one and as "0/0/", "010", "10" or "IO" in round
  two, although the second prompt already forbade marks in a row or marks that
  read as numerals. A ring beside a stroke already reads as a pair of digits, so the
  prompt below no longer asks for any ring or circle. Its changes from the
  card-fit text: the vermilion marks are only one or two long sweeping
  strike-strokes across the top draft, each one unbroken sweep of the brush,
  with no rings, no dots and no repeated marks in a row; the ring around a
  passage, the strokes down whole columns and the ruled sheets with grey specks
  are gone; the drafts lie on the table turned toward 陸判, seen at a steep
  foreshortened angle mostly away from the viewer, and show only faint
  illegible grey texture; his brush is held just above them after the strike.
  The anchors, colour rule, figures, vignettes, card-fit sentence and closing
  exclusions are unchanged.
- **Third round · 2026-10-11:** three candidates were generated from that
  prompt (SHA-256 `1fb40e5dc8c9…`, the brief as committed in `b42ee4a`) by the
  route recorded in the provenance block. Two read-only reviews judged them,
  one for fidelity and safety and one for craft and card fit; the craft
  review showed each on the card in the dialog at 1440 and 390 widths in
  Chromium and WebKit. In all three the only vermilion is the beard wash, the
  lamp flame, the ink box or brush and the strike itself, with no seal, ring
  or dot; the lower paper carries no signature; 陸判's face has the faint
  grey-green tint; nobody holds a blade and nothing shows blood, a heart or a
  head exchange. Every face, hand and the brush sit above about 55%.
  - r3-c1: SHA-256 `556a27d25d6572f04756f2d5ab624c632211b02af40dbcee3b1e9fe426a59ff6`,
    3,224,186 bytes, generated 2026-10-11T10:21:52Z, session
    `01a12a7a-9335-7f31-a88c-5b289f36a974`, archive
    `~/.codex/generated_images/01a12a7a-9335-7f31-a88c-5b289f36a974/exec-7ed0a6e3-a20e-496a-bd68-cf84feb09f98.png`
  - r3-c2: SHA-256 `37e154b9c4576671116daa46c9804a4a5d1e9fb3a423148387c7592b37c9ccd5`,
    3,294,785 bytes, generated 2026-10-11T10:23:01Z, session
    `01a12a7b-c1a6-7732-bc90-fd37780db8f4`, archive
    `~/.codex/generated_images/01a12a7b-c1a6-7732-bc90-fd37780db8f4/exec-b3d2212a-e252-4789-94a3-c3b2c37a9689.png`
  - r3-c3: selected and bound; see its provenance block.

  Both reviews rejected r3-c1. At 3–5× its top draft's grey texture is
  horizontal lines of Latin-looking cursive (the bottom line reads roughly as
  "ccrn.u.o"), which breaks "never character shapes" and the rejection of
  pseudo-text above. Its two strokes also cross at a shallow angle beside a
  short stub, so on the card they can read as a thin x or "<", the failure of
  rounds one and two. r3-c2 was acceptable to both reviews but not selected.
  The fidelity review preferred it, because its single unbroken sweep ends in
  a dry-brush split and its drafts carry only blurred grey blocks. The craft
  review placed it second: its strike tail and drafts sit lowest (to about 61%
  and 63% of the image height), its carrying vignette reads more like a man
  walking ahead of the statue on a strap, with the ★ chip covering 朱's head,
  陸判 has a wine jar but no cup set aside, his beard reads red-brown rather
  than 赤, and a second moon shows in the doorway. The workflow orchestrator
  chose r3-c3, the craft review's pick and the fidelity review's second
  choice. r3-c1 and r3-c2 were not committed and stay in the private archive.

```text
Use case: stylized-concept. Asset type: full scene INK SCROLL special-print portrait for an original premium Eastern literary card game Mythseal, set Liaozhai: A Light for the Living. One tall 2:3 image, 1024x1536 preferred, NO grid, no card frame or UI. Original composition titled internally Judge Lu: Vermilion Marks over Night Wine. The entire artwork is black ink on warm ivory xuan paper: expressive brush lines, dry-brush texture, fine woodblock-style hatching and disciplined empty paper; the only colours are spare vermilion and a barely perceptible grey-green tint on his face, and no yellow, amber or orange anywhere; the lamp flame is a touch of vermilion and its glow is left as bare paper. Judge Lu Pan, an imposing otherworldly adult male magistrate, his green face suggested only by that barely perceptible grey-green tint, long beard touched with a restrained vermilion wash, dignified broad features, dark ceremonial robe and plain black official hat, sits at a low lamp-lit night table, wine cup set aside, holding a fine brush loaded with vermilion just above a small stack of essay drafts; the drafts lie on the table turned toward him, seen at a steep foreshortened angle mostly away from the viewer, and he has just struck out the top draft with one or two long sweeping vermilion strike-strokes drawn right across it. Opposite him Zhu Erdan, a broad sturdy adult scholar with a friendly coarse face and short beard in a plain cotton gown with loose sleeves, leans forward with a wine cup, rueful and eager. Behind them a door curtain hangs half lifted. Two small asymmetrical brush-edged vignettes are woven into the upper background: a standing wooden judge statue alone in a dim temple side corridor, and the same scholar carrying that statue on his back through the night, its official hat and robed body plainly visible. Imagery only. The drafts show only faint, illegible grey texture, never character shapes. Those one or two long sweeping strike-strokes across the top draft are the only vermilion marks on the drafts, each one unbroken sweep of the brush: no rings, no dots, no repeated marks in a row, and nothing that could read as a letter, numeral, glyph or symbol. The central pair dominates with faces readable at small card size. The pair, the table top, the drafts and the brush all sit above the lower two fifths of the image, which stay quiet empty paper below the table edge, because card text is printed over them. Not a grayscale filter on a colour painting. Design from Pu Songling's classical characters, not any modern film costume or celebrity likeness. Fully clothed, no surgery, no blood, no severed head, no gore. No text, lettering, pseudo-glyphs, calligraphy, seals, signatures, logos, watermark, numbers, speech balloons, borders or UI.
```

### lz01-008-ink1 · 畫皮之鬼 INK · 墨下另一面

**Status · 2026-10-11: generated and bound** as `assets/lz01/huapi-ink.png`
(candidate 3 of 3, preview only; see its provenance block below).

- **Verified anchors:** 王生 looks in through the window (「而窗窺之」) and sees
  the ghost's true face: 「見一獰鬼，面翠色」, its teeth jagged 「如鋸」. It has
  spread a human skin on the couch and paints it with a coloured brush:
  「鋪人皮于榻上，執彩筆」. Then, in this order:
  「已而擲筆，舉皮如振衣狀，披于身，遂化為女子」. It tosses the brush aside,
  lifts the skin as if shaking out a garment, puts it on, and only then becomes
  a woman. The drawn moment is 「舉皮如振衣狀」: the brush is already down and the
  ghost still has its own face.
- **Invented:** The sheet is drawn as blank painted silk, not skin, and not
  half-finished, since the brush is tossed only after the painting
  (「已而擲筆」). The ghost's build and robes are invented: the text describes
  only its face and teeth, the shared rules keep every figure clothed, and the
  robes repeat the BASE ivory and indigo so the printing reads as the same
  identity. Its calm, absorbed manner is invented; the text gives only its
  fearsome look (獰), green face and saw-like teeth. The lattice window
  stands for 王生's view, but he is not drawn. The colour rule is also
  invented: a pale jade-green wash on the face keeps 「面翠色」 in an ink print,
  and the tossed brush tip is the only other colour. The 2026-10-10 draft showed
  the figure already in human form while lifting the sheet, with a disagreeing
  cast shadow carrying the true shape; that reversal of the text's order is
  removed.
- **Excluded:** the woman it becomes, flayed skin, flesh, anatomy, any attack,
  the later killing, the beheading and smoke capture. Reject any output where
  the sheet reads as skin, a mask or a face, or where the ghost reads as gore or
  a jump-scare rather than uncanny calm.

```text
Use case: stylized-concept. Asset type: full scene INK SCROLL special-print portrait for an original premium Eastern literary card game Mythseal, set Liaozhai: A Light for the Living. One tall 2:3 image, 1024x1536 preferred, NO grid, no card frame or UI. Original composition titled internally The Painted-Skin Ghost: The Other Side beneath the Ink. The entire artwork is black ink on warm ivory xuan paper: expressive brush lines, wet-ink bleeds, dry-brush texture and abundant empty paper. The only colours are a pale jade-green wash on the ghost's face and the tip of one painting brush, a tiny touch of jade green and vermilion. A quiet study glimpsed through a lattice window, as if peering in from outside. In the centre stands the Painted-Skin Ghost in its own true shape, before it has put on the sheet: a gaunt non-human figure in plain muted ivory and indigo layered robes, with a fearsome ghost face tinted by that pale jade-green wash and jagged saw-like teeth plainly bared, yet its manner calm and absorbed in the task; the face is readable at small card size in the upper middle. With both hands it lifts a long pale sheet high to one side, keeping its face clear, and shakes it out like a garment it is about to put on; the sheet reads as blank painted silk with a few faint soft grey washes; no face, no features, no mask, no skin texture and no anatomy. Beside it stands the low couch where the sheet lay, and the painting brush has been tossed down on it beside an ink stone. Quiet, uncanny and ambiguous: horror through a strange domestic calm, like someone shaking out laundry, not violence; the ghost threatens no one and no one else is present. Bottom fifth is quiet paper and floor. Not a grayscale filter on a colour painting. Design from Pu Songling's classical characters, not any modern film costume or celebrity likeness. Fully clothed, no flayed skin, no exposed flesh, no blood, no gore, no attack, no claws, no nudity. No text, calligraphy, seals, signatures, logos, watermark, numbers, borders or UI.
```

### lz01-001-tr1 · 聶小倩 TR · 歸燈

**Status · 2026-10-11: generated and bound** as `assets/lz01/xiaoqian-treasure.png`
(candidate 1 of 3, preview only; see its provenance block below).

- **Verified anchors:** At dusk she withdraws from the household and sits by
  甯采臣's candle reciting sutras: 「黃昏告退，輒過齋頭，就燭誦經」. Earlier:
  「女乃入，就燭下坐」. The sutra she names is the 《楞嚴經》.
- **Invented:** The source light is a candle (燭), drawn here as the set's lamp
  motif, not a named relic. The lacquer, gold-leaf and jade-enamel treatment and
  the nested lattice and screen layers are also invented. The scroll is drawn
  blank, and the TR label is visual only.
- **Excluded:** the night creature, the sword bag episode, romance and fox
  features. Layering comes from objects inside the scene, never from a card
  border.

```text
Use case: stylized-concept. Asset type: full scene TREASURE collector-treatment portrait for an original premium Eastern literary card game Mythseal, set Liaozhai: A Light for the Living. One tall 2:3 image, 1024x1536 preferred, NO grid, no card frame or UI. Original composition titled internally Nie Xiaoqian: The Lamp of Return. A TREASURE treatment in BLACK LACQUER, GOLD LEAF AND JADE ENAMEL. Nie Xiaoqian, a young adult Chinese woman with pale luminous skin, long dark loose hair partly pinned with a simple slender jade hairpin, layered ivory and pale mist-blue robes with delicate spectral translucence only at the trailing sleeves, sits calmly at dusk beside a low scholar's desk in a modest study, a single candle in a simple bronze holder before her and an open sutra scroll whose paper is entirely blank; her face is quiet, steady and tender, in clear three-quarter view in the upper middle. Layered light study: the candle flame is the heart of the image, surrounded by concentric gold-leaf arcs and nested carved lacquer layers, a lattice window, a folding screen panel and bamboo outside rendered as jade enamel inlay, receding in depth like a treasured lacquer screen; every layer belongs to the painted room, not a card border. Nearly-black midnight-teal lacquer ground, restrained antique gold filigree, mineral jade, ivory and one small crimson knot. Very rich physical surface, luminous carved highlights, deep shadows with a clearly readable face. Composition solemn and balanced; bottom fifth is quiet lacquer and desk edge. Not a rainbow hologram. Tall vertical art fills the canvas without a separate outer border. Design from Pu Songling's classical characters, not any modern film costume or celebrity likeness. Fully clothed, no gore, no fox ears, no romantic embrace. No text, lettering, calligraphy or pseudo-glyphs anywhere; the scroll, screen panels and lattice are blank. No seals containing text, no numbers, coins, signatures, logos, watermark, borders or UI.
```

### Preview binding · 2026-10-11

The 2026-10-10 readiness check found that the preview supported only `base` and
`aa`, with `LZ01_AA` a single object for 小倩. The binding generalised it
minimally, still without importing game modules:

| Area | Before | Now |
| --- | --- | --- |
| Data (`liaozhai-cards.mjs`) | `LZ01_AA`, one object for 小倩 | `LZ01_SPECIALS`, a frozen list of `{ cardId, printId, treatment, name, title, src, label }` with 小倩 AA first; `LZ01_PLANNED_SPECIALS` holds the printings still planned, with no `src` (陸判 INK until its 2026-10-11 binding; 嬰寧 AA since its unbinding); `LZ01_TREATMENTS` copies the 本畫/異畫/墨卷/天工 strings from `PRINT_TREATMENTS` in `card-presentation.mjs`, and the content test fails if the copy drifts |
| Lookup (`liaozhai.mjs`) | `artTreatment()` compared against one `cardId` | A map keyed by `${cardId}:${treatment}`, so 小倩 AA and TR never collide; any unbound treatment falls back to BASE |
| Hero | BASE/AA toggle | 本畫 BASE / 異畫 AA / 天工 TR, each rejected unless bound |
| Dialog | Binary BASE/AA switch for 小倩 only | One button per bound printing for every card that has a special |
| Catalogue | BASE only | Each card with specials adds 44px buttons such as 「異畫 AA」 that open the dialog on that printing |
| Card face | `本畫 BASE` / `異畫 AA` mark | The footer mark reads 本畫 BASE, 異畫 AA, 墨卷 INK or 天工 TR; a special printing shows its own title, and the card carries `data-print-id` |
| CSS (`liaozhai.css`) | `[data-treatment=aa]` only | 墨卷 INK uses an ivory paper shade with dark text and a vermilion mark; 天工 TR uses a gold double border, inset art and the WX-01 天工 corner strokes (without its halo ring), following `wx01.css` |
| Counts (`liaozhai.html`) | 「12 款本畫＋1 款異畫先行；另有 6 款特別畫作規劃中」 | Rendered from the data, with the same static text in the HTML. At the first binding: 「12 款本畫＋6 款特別畫作先行（異畫 4、墨卷 1、天工 1）；陸判墨卷仍在規劃中。」; since the 陸判 INK binding: 「12 款本畫＋6 款特別畫作先行（異畫 3、墨卷 2、天工 1）；嬰寧異畫仍在規劃中。」 |

Stats, stars, abilities and deck slots are unchanged by every treatment. The
playable game's `printing-catalogue.mjs` already models `aa`, `ink` and
`treasure` for WX-01. LZ-01 identities are deliberately absent from `engine.mjs`,
and the content test enforces that, so game-catalogue binding is still phase D
work.

Checklist for binding a planned printing once a candidate is selected (陸判 INK
followed it on 2026-10-11; a regenerated 嬰寧 AA is the one left):

1. Check card fit first: view the candidate on the card in the dialog at 1440
   and 390 widths in Chromium and WebKit, and confirm that every figure of the
   drawn moment clears the title and name (see the card-fit rule).
2. Copy the selected PNG byte-for-byte to `assets/lz01/lupan-ink.png` or, for
   嬰寧, a new name such as `assets/lz01/yingning-aa2.png`. Add that path to
   `hosting/preview-assets.json`, which `tools/serve.py` uses as its allowlist
   (restart a running server so it rereads the list), and never to
   `hosting/public-assets.json`.
3. Move the `lz01-006-ink1` or `lz01-004-aa1` entry from `LZ01_PLANNED_SPECIALS`
   to `LZ01_SPECIALS` and add its `src` and `label` (`墨卷 INK` or `異畫 AA`).
   Add no `power`, `damage`, `stars`, `ability` or `rarity`.
4. Add its SHA-256 row to the table at the top of this file and its asset row.
   Update the expected print lists and image count in
   `tests/liaozhai-content.test.mjs` and the expected specials and progress
   text in `tools/liaozhai-smoke.mjs`.
5. Update the static print-progress text and meta description in
   `liaozhai.html`, then run desktop and phone browser checks.
6. Fill a provenance block below, mark the brief's status, and update the 聊齋
   section of `docs/ART.md` and the status column of
   [`EXPANSION-LZ01.md`](EXPANSION-LZ01.md).

### Provenance checklist (fill in after generation, one block per file)

Copy this block under a new dated heading for each selected output. Leave a
field as "not exposed" or "unknown" rather than guessing.

```text
Print ID / proposed path:
Generation date (YYYY-MM-DD, timezone):
Tool + exact model identifier (as returned by the tool; "not exposed" if absent, never inferred):
Embedded content credential (C2PA manifest in the PNG caBX chunk: claim generator, softwareAgent, actions, c2pa.created time; "none" if absent):
Orchestrating agent + its model, if any (listed separately; not the image model):
Exact prompt sent (verbatim; note and explain any difference from the brief above):
Prompt SHA-256 (UTF-8 bytes of the exact prompt, no trailing newline):
Input images and SHA-256 (expected: none supplied):
Private archive original path + filename:
Output SHA-256 of the archive original:
SHA-256 of the repository copy (must equal the original; byte-for-byte copy, no crop/resize/compression/metadata edit):
Dimensions (expected 1024x1536) and byte size:
Visual review: no visible text, pseudo-glyphs or watermark, fully clothed, non-sexual, no gore; identity consistent with BASE; face readable; lower two fifths quiet:
Card fit: every figure of the drawn moment clears the title and name on the card (dialog at 1440 and 390, Chromium and WebKit):
Allowlist: listed in hosting/preview-assets.json only (preview-only; absent from hosting/public-assets.json):
Rejected candidates: kept in the private archive, not committed:
```

For the Codex CLI route, the tool line reads, for example,
`Codex CLI 0.162.1 built-in image_gen__imagegen; exact model identifier: not exposed`.
The `model:` in Codex's session header belongs to the agent that orchestrates
the run, not to the image tool, whose result carries no model field; record it
only on the orchestrator line. The PNG that the tool returns does embed a C2PA
credential: record its claim generator, `softwareAgent` and actions on the
credential line, and keep the exact model identifier as "not exposed" unless
some field names an exact version (`gpt-image` is a family label). Take the
exact prompt from the `prompt` argument of the `image_gen__imagegen` call in
that session's rollout JSONL under `~/.codex/sessions/`; the session ID is the
folder name in the archive path.
The instruction wrapper sent to the agent around the brief (its fixed request
text and the `<<<PROMPT` / `PROMPT>>>` markers) is not part of that argument,
but it is still a difference from the brief: note it in the "Exact prompt sent"
field, together with any other call arguments, such as
`transparent_background`, and the returned `revisedPrompt` if it differs from
the prompt.

Suggested local commands: `shasum -a 256 <file>`, `cmp <archive-original> <repo-copy>`,
`sips -g pixelWidth -g pixelHeight <file>`, and
`printf '%s' "$PROMPT" | shasum -a 256`. A prompt file must not end with a
newline: `tail -c 1 <file> | xxd -p` must not print `0a`.

## Provenance · special printings · 2026-10-11

Five selected outputs, one block per file, in the checklist's field order. All
five came from the same route on 2026-10-11, between 09:02 and 09:06 UTC
(10:02-10:06 BST). Each slot was generated three times from its unchanged brief
prompt with a helper script that sent the brief to `codex exec` inside a fixed
wrapper, copied the archived PNG and wrote a `.meta` record by reading the
session's rollout JSONL. Each rollout holds exactly one `image_gen__imagegen`
call whose `prompt` argument is byte-identical to the brief, with
`transparent_background: false` as its only other argument, and a returned
`revisedPrompt` identical to that prompt. The binding session re-ran that
rollout check, re-hashed every archive original and compared each repository
copy with `cmp`. Two independent read-only reviews, one for fidelity and safety
and one for craft and consistency, judged every candidate; where they
disagreed, the workflow orchestrator chose. Neither review measured card-size
fit in the app. The browser smoke described in [VALIDATION](VALIDATION.md)
captured each printing on the card, but only a later card-fit review measured
figure positions against the card text. It unbound 嬰寧 AA the same day (see
[its brief](#lz01-004-aa1--嬰寧-aa--花間藏笑)); the block below stays as the
record of that file, which is kept in the repository. Each block also has
a Card fit line, added after binding. For 嬰寧 AA it repeats that review's
measurement. For the four still bound, that review recorded only the summary in
the [card-fit rule](#rules-shared-by-all-six-prompts), so the session fixing a
later provenance review measured them on 2026-10-11: a read-only Playwright
probe against the loopback preview opened each printing in the dialog at
1440x900 and 390x844 in Chromium and WebKit, converted the title and name glyph
boxes into shares of the image's height and width, and drew those boxes over
the original image. Figure positions on those lines were read from that overlay
by eye, to about one percentage point. Two of the four have a caveat rather than
a pass. The credential lines were added after a
provenance review found the embedded C2PA manifests (see
[above](#embedded-content-credentials-c2pa)). A sixth block, for 陸判 INK,
follows the five. It was generated later that day from the round-three prompt,
and a card-fit check was part of its review (see the note above that block).

### lz01-004-aa1 · 嬰寧 AA · 花間藏笑

```text
Print ID / path: lz01-004-aa1 · assets/lz01/yingning-aa.png
Generation date: 2026-10-11, Europe/London (BST, UTC+1); generation record written 2026-10-11T09:06:08Z
Tool + exact model identifier: Codex CLI 0.162.1 (codex-cli 0.162.1), built-in imagegen tool image_gen__imagegen (image_generation feature); exact model identifier: not exposed (the tool result has no model field; see the next line)
Embedded content credential: C2PA manifest from OpenAI Media Service API (c2pa_rs 0.79.2), bound to these bytes by its data hash; c2pa.created 2026-10-11T09:05:56Z by softwareAgent ChatGPT, version gpt-image (a family label), digitalSourceType trainedAlgorithmicMedia; then c2pa.converted and c2pa.watermarked.unbound (an invisible watermark)
Orchestrating agent + its model: the Codex CLI agent, model gpt-6-astra (session header and rollout turn context), run with "codex exec --skip-git-repo-check -s read-only" by a Claude Code workflow script; this is the agent, not the image model
Codex session: 01a12a35-1ae1-7723-9ec8-f03b9a94e80c (~/.codex/sessions/2026/10/11/rollout-2026-10-11T10-04-45-01a12a35-1ae1-7723-9ec8-f03b9a94e80c.jsonl)
Exact prompt sent: the image tool's prompt argument is byte-identical to the lz01-004-aa1 brief's text block as committed in 73f0900 (SHA-256 below), which is the prompt inside the wrapper below; no difference. The brief above was revised for card fit after this generation. The agent received that brief inside the fixed wrapper below (instruction line, then <<<PROMPT, the brief, PROMPT>>>), which is not part of the tool argument. Other tool arguments: transparent_background=false. Returned revisedPrompt: identical to the prompt
Prompt SHA-256 (tool prompt = brief, no trailing newline): dcfcf70d7e336a9f620b45836d29ccd2b1bfe4816fd9015b54888a7651c6a7b1
Brief prompt SHA-256 at generation (commit 73f0900): dcfcf70d7e336a9f620b45836d29ccd2b1bfe4816fd9015b54888a7651c6a7b1
Text sent to the agent, SHA-256 (exact bytes below, ending with one newline after PROMPT>>>): c4e3398149e94809e925d0991c5c6c49d08e25cb40d0844ddbb9f63a4606b9ac
Input images and SHA-256: none supplied
Private archive original: ~/.codex/generated_images/01a12a35-1ae1-7723-9ec8-f03b9a94e80c/exec-09858947-e2f5-46ff-b723-81c18ce03fb1.png
Output SHA-256 of the archive original: ecf9df417029680a39ceb82983a67a36097141dcd897e21e8ee4208aa8f64249
SHA-256 of the repository copy: ecf9df417029680a39ceb82983a67a36097141dcd897e21e8ee4208aa8f64249 (copied byte-for-byte; cmp reports no difference; no crop, resize, compression or metadata edit)
Dimensions and byte size: 1024x1536, 3,652,103 bytes
Selected: candidate 3 of 3
Binding: bound in 3c07dfe; unbound on 2026-10-11 after the card-fit review (王子服 sits under the card's title and name); the file is kept unchanged in the repository
Visual review: Two read-only reviews (fidelity and safety; craft and consistency) zoomed the faces, hut windows, dim corner and bottom fifth. No text, pseudo-glyphs, seals, signature or visible watermark (the C2PA record notes an invisible one); fully clothed, non-sexual, no gore; no fox features, touching, fall or plum blossom; 王子服's hands are empty. 嬰寧 leans out of the tree laughing, one hand on a branch and one on the trunk, close to losing her balance (「狂笑欲墮」); 王子服 on the path raises a hand and calls up to her (「勿爾，墮矣」). Bottom fifth: grass and petals. Accepted caveats: a small stone lantern with a Japanese-garden shape stands in the dim left corner and a tiny gold oval ornament hangs on the hut; at card size 王子服 can read as waving rather than alarmed; the blossom looks like cherry (the text names no species); her face is rounder and her hair looser than in BASE; the pastel spring palette is lighter than the BASE atlases. The craft review preferred candidate 2 (closer BASE face, but 王子服 stands lower, in the card's text zone); the fidelity review preferred this one, which was selected. Neither review measured the card; the later card-fit review found this candidate's 王子服 in the text zone too.
Card fit: fails. Measured after binding by the card-fit review that unbound it: 王子服, the second figure of the drawn moment, stands at about 59-76% of the image height; in the dialog at 1440 and 390, in Chromium and WebKit, his face sits between the title 花間藏笑 and the name 嬰寧 and his robe is behind 寧. Hence the unbinding on the Binding line above.
Allowlist: hosting/preview-assets.json only while bound (preview-only; absent from hosting/public-assets.json); since the unbinding, in neither list
Rejected candidates: candidate 1 158f841c6b63d324ca192709429dde569109549065bc677e51bf88b733f94db3 (~/.codex/generated_images/01a12a31-fc29-7123-b24b-a944b04f8eb9/exec-782e6bed-df10-4fb1-8458-27a15b5f4ba3.png); candidate 2 d833070023c3b631900602d46bb1f8f986fd0b91c40eff18763a05529720ad5e (~/.codex/generated_images/01a12a33-69c6-7bf2-b75a-9d540b2af1d6/exec-86fa2f70-74a1-48d9-ba43-09c9bd7f1fac.png); same prompt, kept in the private archive, not committed
```

Text sent to the Codex agent for lz01-004-aa1, verbatim:

```text
Generate exactly ONE image with your built-in image generation tool, using the prompt between the markers verbatim (do not rewrite it). Do not run shell commands, do not edit any files. After generating, reply with only the absolute path of the saved image file if you know it, otherwise reply DONE.
<<<PROMPT
Use case: stylized-concept. Asset type: full scene alternate-art portrait for an original premium Eastern literary card game Mythseal, set Liaozhai: A Light for the Living. One tall 2:3 image, 1024x1536 preferred, NO grid, no card frame or UI. Original composition titled internally Yingning: Laughter Hidden among Flowers. A half-acre back garden behind a country house: fine grass like a soft carpet, a narrow path dusted with drifting willow catkins, and a small three-bay thatched hut ringed on all sides by flowering trees; abundant pale pink and white spring blossom fills much of the canvas as breathing space. High in a blossoming tree in the upper middle, Yingning, a fully clothed Chinese teenage girl from the classical story, simple fresh green robes and half-tied dark hair, is caught laughing so helplessly she almost loses her balance, one hand gripping a branch, petals shaken loose around her; her bright natural laughing face catches soft warm spring light and stays clearly readable at small card size; her head is about one tenth of the image height, placed in the upper middle. Far below on the path, small in scale, Wang Zifu, a fully clothed teenage scholar in muted warm russet cotton robes, has stopped mid-stroll and looks up in alarm, calling to her to be careful, one empty hand raised and the other empty at his side; a respectful distance separates them. Humour, surprise and gentle concern, with one softly dim shaded corner of the garden hinting at a quieter hidden history. Strong vertical depth: only Wang Zifu is small, Yingning stays large enough to read, and generous negative space of blossom surrounds them; bottom fifth is quiet grass and fallen petals, not cropped limbs. Exquisite painterly Chinese literary fantasy with ink wash texture under fine detail; restrained celadon, blossom ivory, pale peach, warm amber and a touch of aged vermilion. Design from Pu Songling's classical characters, not any modern film costume or celebrity likeness. Fully clothed, non-sexual, no fox ears or tails, no embrace or touching, no romantic gaze, no gore. No text, signatures, logos, watermark, numbers, borders or UI.
PROMPT>>>
```

### lz01-009-aa1 · 陳氏 AA · 仍有人守門

```text
Print ID / path: lz01-009-aa1 · assets/lz01/chenshi-aa.png
Generation date: 2026-10-11, Europe/London (BST, UTC+1); generation record written 2026-10-11T09:02:59Z
Tool + exact model identifier: Codex CLI 0.162.1 (codex-cli 0.162.1), built-in imagegen tool image_gen__imagegen (image_generation feature); exact model identifier: not exposed (the tool result has no model field; see the next line)
Embedded content credential: C2PA manifest from OpenAI Media Service API (c2pa_rs 0.79.2), bound to these bytes by its data hash; c2pa.created 2026-10-11T09:02:38Z by softwareAgent ChatGPT, version gpt-image (a family label), digitalSourceType trainedAlgorithmicMedia; then c2pa.converted and c2pa.watermarked.unbound (an invisible watermark)
Orchestrating agent + its model: the Codex CLI agent, model gpt-6-astra (session header and rollout turn context), run with "codex exec --skip-git-repo-check -s read-only" by a Claude Code workflow script; this is the agent, not the image model
Codex session: 01a12a32-0555-7f31-8cdc-579cd3d07602 (~/.codex/sessions/2026/10/11/rollout-2026-10-11T10-01-23-01a12a32-0555-7f31-8cdc-579cd3d07602.jsonl)
Exact prompt sent: the image tool's prompt argument is byte-identical to the lz01-009-aa1 brief's text block above; no difference. The agent received that brief inside the fixed wrapper below (instruction line, then <<<PROMPT, the brief, PROMPT>>>), which is not part of the tool argument. Other tool arguments: transparent_background=false. Returned revisedPrompt: identical to the prompt
Prompt SHA-256 (tool prompt = brief, no trailing newline): 73b8196dd4cc49ce8808562cd9afe186057d8f291377c3fac4b192c974af6d5e
Brief prompt SHA-256: 73b8196dd4cc49ce8808562cd9afe186057d8f291377c3fac4b192c974af6d5e
Text sent to the agent, SHA-256 (exact bytes below, ending with one newline after PROMPT>>>): 532e53ee33ebf90a2b95845e888c604ca72fa23cddbde8f2db80fcffe9d30b65
Input images and SHA-256: none supplied
Private archive original: ~/.codex/generated_images/01a12a32-0555-7f31-8cdc-579cd3d07602/exec-cb3c3612-d2a6-48ca-bad2-f881eeb13f9e.png
Output SHA-256 of the archive original: 5dd7d6e52d058bd2ae6cc0bbfbbbafada766d5722d7b0fb4b0c9a9fe85b52ba3
SHA-256 of the repository copy: 5dd7d6e52d058bd2ae6cc0bbfbbbafada766d5722d7b0fb4b0c9a9fe85b52ba3 (copied byte-for-byte; cmp reports no difference; no crop, resize, compression or metadata edit)
Dimensions and byte size: 1024x1536, 2,898,837 bytes
Selected: candidate 1 of 3
Visual review: Both reviews zoomed each red door hanging at native size: blank, no strokes. No gore, corpse, wound or monster; the gourd and skin stay out of sight in closed cloth bags. The Daoist is seen in three-quarter back view with no face, holds a plain wooden sword low and carries a tied cloth bag; he has no fly whisk. 陳氏, fully clothed in sage green and linen, kneels on the threshold stone with hands joined and torso inclined, her tear-marked face lifted toward him; the lamp burns just inside the door edge. Caveats: rain is still falling and the distant roofs look snow-dusted where the brief says after rain; her face reads younger (mid-twenties) and rounder than BASE; her head tilts back in supplication instead of inclining in the bow, so the bow reads only in part; the Daoist's feet reach into the bottom fifth. Both reviews picked this candidate, the only one whose Daoist holds the plain wooden sword low.
Card fit: caveat, not a full pass. Checked after binding (see the note above these blocks). The title spans about 57-64% of the image height (8-33% of the width) and the name about 62-75% (8-33%). 陳氏 clears both: her face sits at about 38-43% and her joined hands at about 49-53%; her kneeling robe reaches about 67%, but at about 52-86% of the width, right of the lettering. The lamp (about 49-56%) and the door are clear too. The Daoist's head (seen from behind, no face) is at about 12-22% and his hand on the sword at about 50-54%, but his lower robe (about 5-39% of the width) and the lower half of his wooden sword (from his hand down to its tip at about 75%, between about 35% and 17% of the width) sit behind the title and name. The card-fit review that unbound 嬰寧 AA kept this file bound with that overlap; the owner's art review is still open.
Allowlist: hosting/preview-assets.json only (preview-only; absent from hosting/public-assets.json)
Rejected candidates: candidate 2 cdbca70f46647ebbe593e045f8bb30cd19a64bc1e236ee903c7e702dd16ffd2e (~/.codex/generated_images/01a12a33-8db7-7673-9e06-01579fe3a405/exec-0f9a96a0-144b-4d80-a042-f0fcf495dfd3.png); candidate 3 958f73ad73d0b8b2373568660537cd84f446febe9261e18aae0286e694614d7f (~/.codex/generated_images/01a12a35-23fe-7651-a515-8003767deccc/exec-d488387d-aa71-4c6d-874c-bc4cc1abbe66.png); same prompt, kept in the private archive, not committed
```

Text sent to the Codex agent for lz01-009-aa1, verbatim:

```text
Generate exactly ONE image with your built-in image generation tool, using the prompt between the markers verbatim (do not rewrite it). Do not run shell commands, do not edit any files. After generating, reply with only the absolute path of the saved image file if you know it, otherwise reply DONE.
<<<PROMPT
Use case: stylized-concept. Asset type: full scene alternate-art portrait for an original premium Eastern literary card game Mythseal, set Liaozhai: A Light for the Living. One tall 2:3 image, 1024x1536 preferred, NO grid, no card frame or UI. Original composition titled internally Madam Chen: Someone Still Keeps the Door. Madam Chen from Painted Skin, a resilient adult Chinese woman in her thirties, practical sage-green and linen robes, dark hair pinned simply, no glamorous jewelry. In grey daylight after rain, she kneels in a low formal bow on the threshold stone of her modest household gate, both hands joined before her, weeping as she begs a departing Daoist for help; her head is inclined in the bow, but her tear-marked face lifts toward him in clear three-quarter view, readable at small card size: grief and pleading held together by resolve, not collapse; she is bowing, not lying on the ground. Just inside the threshold behind her, a small oil lamp left from the night still burns low, warming the door edge and her sleeve; the house beyond is quiet shadow with no figure visible. A few paces down the wet stone lane, the Daoist has stopped on his way out and turned to face her as she meets him at her gate: a lean elderly man in a weathered indigo-blue robe with a plain topknot, a plain wooden sword held low and a small tied cloth bag at his side, seen in three-quarter back view with no visible face. Strong architectural composition: the door frame and her bowing figure hold the centre-right, the Daoist stands at the left with the lane receding behind him, and the bottom fifth is calm wet paving in front of the threshold. Exquisite painterly Chinese literary fantasy with ink wash texture; restrained ink-blue daylight, celadon, worn timber brown, one warm amber lamp and faint aged vermilion. Design from Pu Songling's classical characters, not any modern film costume or celebrity likeness. Fully clothed, no gore, no blood, no corpse, no wound, no monster. No text, signatures, logos, watermark, numbers, borders or UI; door hangings carry no writing.
PROMPT>>>
```

### lz01-011-aa1 · 王六郎 AA · 留人間一岸

```text
Print ID / path: lz01-011-aa1 · assets/lz01/liulang-aa.png
Generation date: 2026-10-11, Europe/London (BST, UTC+1); generation record written 2026-10-11T09:04:45Z
Tool + exact model identifier: Codex CLI 0.162.1 (codex-cli 0.162.1), built-in imagegen tool image_gen__imagegen (image_generation feature); exact model identifier: not exposed (the tool result has no model field; see the next line)
Embedded content credential: C2PA manifest from OpenAI Media Service API (c2pa_rs 0.79.2), bound to these bytes by its data hash; c2pa.created 2026-10-11T09:04:18Z by softwareAgent ChatGPT, version gpt-image (a family label), digitalSourceType trainedAlgorithmicMedia; then c2pa.converted and c2pa.watermarked.unbound (an invisible watermark)
Orchestrating agent + its model: the Codex CLI agent, model gpt-6-astra (session header and rollout turn context), run with "codex exec --skip-git-repo-check -s read-only" by a Claude Code workflow script; this is the agent, not the image model
Codex session: 01a12a33-81ae-7541-ae24-b0330936b025 (~/.codex/sessions/2026/10/11/rollout-2026-10-11T10-03-01-01a12a33-81ae-7541-ae24-b0330936b025.jsonl)
Exact prompt sent: the image tool's prompt argument is byte-identical to the lz01-011-aa1 brief's text block above; no difference. The agent received that brief inside the fixed wrapper below (instruction line, then <<<PROMPT, the brief, PROMPT>>>), which is not part of the tool argument. Other tool arguments: transparent_background=false. Returned revisedPrompt: identical to the prompt
Prompt SHA-256 (tool prompt = brief, no trailing newline): 64cff46935d5c9212ed4c65a144f61680a5dcd3a9e4c53283ce1d3c7586bfb19
Brief prompt SHA-256: 64cff46935d5c9212ed4c65a144f61680a5dcd3a9e4c53283ce1d3c7586bfb19
Text sent to the agent, SHA-256 (exact bytes below, ending with one newline after PROMPT>>>): 13021cdbae88bcd1d5d4e220d6f5df5f7e0b999b88541c22f23b5098ab57bf31
Input images and SHA-256: none supplied
Private archive original: ~/.codex/generated_images/01a12a33-81ae-7541-ae24-b0330936b025/exec-d712ef34-9e68-4d82-9640-13c89093df53.png
Output SHA-256 of the archive original: 277b2a156a073f9f9b1d8808051521ed7c41bb6a6c424b48d3a22a0eafbc695b
SHA-256 of the repository copy: 277b2a156a073f9f9b1d8808051521ed7c41bb6a6c424b48d3a22a0eafbc695b (copied byte-for-byte; cmp reports no difference; no crop, resize, compression or metadata edit)
Dimensions and byte size: 1024x1536, 3,371,102 bytes
Selected: candidate 2 of 3
Visual review: Both reviews zoomed the infant, mother, 六郎's face, village, gate, boats and bottom fifth. No text, glyphs or seals (the gate lintel is plain at 4x); fully clothed, non-sexual; no drowning, struggle, wine, cups, 許 or other figure, and the moored boat is empty. 六郎 stands knee-deep and translucent in bright noon shallows, hands open and lowered, his gaze on the mother and child; the mother sits small and side-on on the bank with her face lowered in profile; the infant lies on a cloth, limbs free, crying; the footpath climbs to the village. Bottom fifth: stones and ripples. Caveats: his grin is warmer than the brief's quiet wistfulness; he has a topknot and stubble where BASE shows long loose hair and a clean-shaven face; the noon render is lighter and more watercolour than the dark BASE atlases; a faint arch bridge sits at the far left. The craft review preferred candidate 1 (closer BASE face, but a busier bottom fifth and a softer costume-drama face); the fidelity review preferred this one, which was selected.
Card fit: passes. Checked after binding (see the note above these blocks). The title spans about 57-64% of the image height (8-33% of the width) and the name about 62-75% (8-46%). 六郎's face sits at about 15-20% and his open hands at about 39-44%, and his figure ends at the waterline at about 52%. The mother's head is at about 36-41% and her seated figure ends at about 54%; the infant lies at about 46-53%; both are at about 62-98% of the width. Under the lettering there is only river water, plus the left edge of a bank rock (about 38-46% of the width, from about 56%) under the end of the name.
Allowlist: hosting/preview-assets.json only (preview-only; absent from hosting/public-assets.json)
Rejected candidates: candidate 1 e7e08867f3f54f491e0411d0c01632fdc66c157c3ab01ae67adf77773ff5e00b (~/.codex/generated_images/01a12a31-f57b-7e70-824a-4a95d768a534/exec-f43461d6-e224-4543-8854-c9c1985b2daa.png); candidate 3 61b074c0658473ea31d29d2ee137507df604ee725a2cf7f9f65503c5b94a0e2a (~/.codex/generated_images/01a12a35-2594-7e12-b51c-21fc8f3f8af2/exec-41e93cf6-f96d-43c2-85df-6a14f9344a6c.png); same prompt, kept in the private archive, not committed
```

Text sent to the Codex agent for lz01-011-aa1, verbatim:

```text
Generate exactly ONE image with your built-in image generation tool, using the prompt between the markers verbatim (do not rewrite it). Do not run shell commands, do not edit any files. After generating, reply with only the absolute path of the saved image file if you know it, otherwise reply DONE.
<<<PROMPT
Use case: stylized-concept. Asset type: full scene alternate-art portrait for an original premium Eastern literary card game Mythseal, set Liaozhai: A Light for the Living. One tall 2:3 image, 1024x1536 preferred, NO grid, no card frame or UI. Original composition titled internally Wang Liulang: A Shore Left for the Living. High noon at a broad quiet river crossing: the sun stands overhead, shadows are short, and the water glitters in clear light. A little way out from the bank, Wang Liulang, an adult male river spirit with a quiet wistful face, simple faded ink-blue fisherman clothing, damp hair and subtly translucent trailing sleeves, stands calmly knee-deep in the bright shallows, his whole figure faintly translucent like light on water, a presence the living do not see; he has stepped back and turned slightly aside so the bank stays open, open empty hands lowered, his gentle humane gaze resting on the mother and child he has let go; his face is clearly readable at small card size and his figure fills at least a third of the image height. On the grassy bank nearby, a young peasant mother who has just climbed out of the river on her own sits on the ground catching her breath, her modest loose cotton clothes dark with river water and fully covering her, damp hair pinned up; tired but safe, she reaches toward her infant lying on the grass beside her, loosely wrapped in a small cotton cloth with its arms and legs free, waving its little hands, kicking its feet and crying. She is small and side-on, secondary, without a detailed portrait face. A narrow footpath climbs the bank from her toward a distant village, clear and unobstructed: room for the living to go home. Broad calm water, pale noon haze, reeds and stones. Liulang upper-middle-left, the mother and child on the bank lower-middle-right above the bottom fifth, the path rising diagonally; bottom fifth is soft ripples and stones. Relief, not panic. Exquisite painterly Chinese literary fantasy with ink wash texture; restrained ink blue, river jade, pale noon gold and ivory. Design from Pu Songling's classical characters, not any modern film costume or celebrity likeness. Fully clothed, non-sexual, no one in the water except Liulang, no drowning figure, no struggle, no chains, no gore, no figures besides Liulang, the mother and her infant. No text, signatures, logos, watermark, numbers, borders or UI.
PROMPT>>>
```

### lz01-008-ink1 · 畫皮之鬼 INK · 墨下另一面

```text
Print ID / path: lz01-008-ink1 · assets/lz01/huapi-ink.png
Generation date: 2026-10-11, Europe/London (BST, UTC+1); generation record written 2026-10-11T09:05:14Z
Tool + exact model identifier: Codex CLI 0.162.1 (codex-cli 0.162.1), built-in imagegen tool image_gen__imagegen (image_generation feature); exact model identifier: not exposed (the tool result has no model field; see the next line)
Embedded content credential: C2PA manifest from OpenAI Media Service API (c2pa_rs 0.79.2), bound to these bytes by its data hash; c2pa.created 2026-10-11T09:04:55Z by softwareAgent ChatGPT, version gpt-image (a family label), digitalSourceType trainedAlgorithmicMedia; then c2pa.converted and c2pa.watermarked.unbound (an invisible watermark)
Orchestrating agent + its model: the Codex CLI agent, model gpt-6-astra (session header and rollout turn context), run with "codex exec --skip-git-repo-check -s read-only" by a Claude Code workflow script; this is the agent, not the image model
Codex session: 01a12a34-69f3-7bf2-9577-842d7f126d64 (~/.codex/sessions/2026/10/11/rollout-2026-10-11T10-04-00-01a12a34-69f3-7bf2-9577-842d7f126d64.jsonl)
Exact prompt sent: the image tool's prompt argument is byte-identical to the lz01-008-ink1 brief's text block above; no difference. The agent received that brief inside the fixed wrapper below (instruction line, then <<<PROMPT, the brief, PROMPT>>>), which is not part of the tool argument. Other tool arguments: transparent_background=false. Returned revisedPrompt: identical to the prompt
Prompt SHA-256 (tool prompt = brief, no trailing newline): 5b71f455bfb710ac69232d51769495c685a1dc29b20be98f0fdc05ea6353fed3
Brief prompt SHA-256: 5b71f455bfb710ac69232d51769495c685a1dc29b20be98f0fdc05ea6353fed3
Text sent to the agent, SHA-256 (exact bytes below, ending with one newline after PROMPT>>>): 5c83aadacf448095dcfb1ee139b53a55102cf4b4c205cd4af4c6fa0a18a6a811
Input images and SHA-256: none supplied
Private archive original: ~/.codex/generated_images/01a12a34-69f3-7bf2-9577-842d7f126d64/exec-1020f656-6d59-40c7-ad46-9c702246edda.png
Output SHA-256 of the archive original: 024f9d4be198a89d6ef6bba5c8529c44bc95160bb245c151a848fe00efe16e1d
SHA-256 of the repository copy: 024f9d4be198a89d6ef6bba5c8529c44bc95160bb245c151a848fe00efe16e1d (copied byte-for-byte; cmp reports no difference; no crop, resize, compression or metadata edit)
Dimensions and byte size: 1024x1536, 2,826,793 bytes
Selected: candidate 3 of 3
Visual review: A real ink-wash treatment on ivory paper, not a greyscale filter. The ghost is still in its own shape: a pale jade face wash, saw-like teeth bared, eyes lowered, calm; both hands lift the sheet high to one side like a garment, keeping the face clear; the sheet is blank silk with soft grey washes (no face, mask, skin texture or anatomy); the brush lies on the seat beside the ink stone; the room is seen past a lattice and nobody else is present. Fully clothed in ivory and indigo with the BASE bun and hairpin; no gore or attack. Accepted deviations, not edited (the copy must stay byte-identical): a sprig of vermilion plum blossom on a stand at the right edge (about x 900-1000, y 320-560) adds colour outside the brief's face-wash-and-brush-tip rule; the brush tip shows jade without the vermilion touch; two book spines carry illegible dark smudges (checked at 8x, not glyph-shaped); the wide grin runs toward the cheek; the seat reads as a settee rather than a low couch (榻); the window framing is weaker than in the other candidates. Both reviews picked this candidate; candidate 2 read as a decayed corpse face, against the set's uncanny-not-horror direction.
Card fit: caveat, not a full pass. Checked after binding (see the note above these blocks). The title spans about 57-64% of the image height (8-33% of the width) and the name about 62-75% (8-58%), over the 墨卷 paper shade (about 70% opaque from about 55.6% down). The ghost's face sits at about 16-22%, its hands at about 7-9% and 26-28%, and the lifted sheet starts at about 8%; all clear the text. Its lower robe, though, runs down to about 76% at about 42-73% of the width, so it sits behind 鬼, the name's last glyph, softened by the shade; the sheet's lower folds lie right of the name. The couch with the ink stone (about 21-30% of the width, 56-58% of the height) and the tossed brush (to about 38%, at about 58%) sits at the top of the title line at 390 and just above it at 1440, also under the shade. The card-fit review that unbound 嬰寧 AA kept this file bound and named no overlap for it; the owner's art review is still open.
Allowlist: hosting/preview-assets.json only (preview-only; absent from hosting/public-assets.json)
Rejected candidates: candidate 1 6dbd49df55581846ef70ededce914ec1fcb972a363a0655233ee40eaf8d00239 (~/.codex/generated_images/01a12a31-fb61-7070-8283-d931d6818948/exec-1c3e0aa4-a2dc-4972-9b7b-9aa027d4b76e.png); candidate 2 71c6b1c4c0ea49bc159cb29efb9f04c7d3f3aefd6728d931d916df20dd51b9bf (~/.codex/generated_images/01a12a33-3275-7b01-8fb0-836427afc1bf/exec-1ebe59e7-71b0-43ac-b188-059e2af07b06.png); same prompt, kept in the private archive, not committed
```

Text sent to the Codex agent for lz01-008-ink1, verbatim:

```text
Generate exactly ONE image with your built-in image generation tool, using the prompt between the markers verbatim (do not rewrite it). Do not run shell commands, do not edit any files. After generating, reply with only the absolute path of the saved image file if you know it, otherwise reply DONE.
<<<PROMPT
Use case: stylized-concept. Asset type: full scene INK SCROLL special-print portrait for an original premium Eastern literary card game Mythseal, set Liaozhai: A Light for the Living. One tall 2:3 image, 1024x1536 preferred, NO grid, no card frame or UI. Original composition titled internally The Painted-Skin Ghost: The Other Side beneath the Ink. The entire artwork is black ink on warm ivory xuan paper: expressive brush lines, wet-ink bleeds, dry-brush texture and abundant empty paper. The only colours are a pale jade-green wash on the ghost's face and the tip of one painting brush, a tiny touch of jade green and vermilion. A quiet study glimpsed through a lattice window, as if peering in from outside. In the centre stands the Painted-Skin Ghost in its own true shape, before it has put on the sheet: a gaunt non-human figure in plain muted ivory and indigo layered robes, with a fearsome ghost face tinted by that pale jade-green wash and jagged saw-like teeth plainly bared, yet its manner calm and absorbed in the task; the face is readable at small card size in the upper middle. With both hands it lifts a long pale sheet high to one side, keeping its face clear, and shakes it out like a garment it is about to put on; the sheet reads as blank painted silk with a few faint soft grey washes; no face, no features, no mask, no skin texture and no anatomy. Beside it stands the low couch where the sheet lay, and the painting brush has been tossed down on it beside an ink stone. Quiet, uncanny and ambiguous: horror through a strange domestic calm, like someone shaking out laundry, not violence; the ghost threatens no one and no one else is present. Bottom fifth is quiet paper and floor. Not a grayscale filter on a colour painting. Design from Pu Songling's classical characters, not any modern film costume or celebrity likeness. Fully clothed, no flayed skin, no exposed flesh, no blood, no gore, no attack, no claws, no nudity. No text, calligraphy, seals, signatures, logos, watermark, numbers, borders or UI.
PROMPT>>>
```

### lz01-001-tr1 · 聶小倩 TR · 歸燈

```text
Print ID / path: lz01-001-tr1 · assets/lz01/xiaoqian-treasure.png
Generation date: 2026-10-11, Europe/London (BST, UTC+1); generation record written 2026-10-11T09:03:01Z
Tool + exact model identifier: Codex CLI 0.162.1 (codex-cli 0.162.1), built-in imagegen tool image_gen__imagegen (image_generation feature); exact model identifier: not exposed (the tool result has no model field; see the next line)
Embedded content credential: C2PA manifest from OpenAI Media Service API (c2pa_rs 0.79.2), bound to these bytes by its data hash; c2pa.created 2026-10-11T09:02:40Z by softwareAgent ChatGPT, version gpt-image (a family label), digitalSourceType trainedAlgorithmicMedia; then c2pa.converted and c2pa.watermarked.unbound (an invisible watermark)
Orchestrating agent + its model: the Codex CLI agent, model gpt-6-astra (session header and rollout turn context), run with "codex exec --skip-git-repo-check -s read-only" by a Claude Code workflow script; this is the agent, not the image model
Codex session: 01a12a31-fde1-7ac0-b63b-094cd243e820 (~/.codex/sessions/2026/10/11/rollout-2026-10-11T10-01-21-01a12a31-fde1-7ac0-b63b-094cd243e820.jsonl)
Exact prompt sent: the image tool's prompt argument is byte-identical to the lz01-001-tr1 brief's text block above; no difference. The agent received that brief inside the fixed wrapper below (instruction line, then <<<PROMPT, the brief, PROMPT>>>), which is not part of the tool argument. Other tool arguments: transparent_background=false. Returned revisedPrompt: identical to the prompt
Prompt SHA-256 (tool prompt = brief, no trailing newline): efebf02338475c4a681f09f1eab58058148827e51f30b9e8166119fc4571b766
Brief prompt SHA-256: efebf02338475c4a681f09f1eab58058148827e51f30b9e8166119fc4571b766
Text sent to the agent, SHA-256 (exact bytes below, ending with one newline after PROMPT>>>): 3881242339b3c30abfcee9d48223e0efe47f6f767a4417d2c7ca6bd06eb0a07d
Input images and SHA-256: none supplied
Private archive original: ~/.codex/generated_images/01a12a31-fde1-7ac0-b63b-094cd243e820/exec-1da68941-efab-43c2-9027-f5dc39ee2b70.png
Output SHA-256 of the archive original: 646a9fcd789907f645c3c6087c27881537ca3d87305099ed48df06d38929e588
SHA-256 of the repository copy: 646a9fcd789907f645c3c6087c27881537ca3d87305099ed48df06d38929e588 (copied byte-for-byte; cmp reports no difference; no crop, resize, compression or metadata edit)
Dimensions and byte size: 1024x1536, 2,803,511 bytes
Selected: candidate 1 of 3
Visual review: Both reviews zoomed the scroll, screens, books, brush pots, lantern and bottom fifth. No text, pseudo-glyphs, seals or numbers; fully clothed with an opaque under-robe; no fox features, night creature or sword bag; identity close to the BASE cell (face, hair, jade pin, ivory and mist-blue robes). The only light is one candle; the open scroll is wide and blank; there is exactly one small crimson knot; every layer is inside the room, with no card border; the bottom fifth is the calmest of the three. Open caveats: the text's moment 「就燭誦經」 is only half met, because she rests her chin on her hand and looks toward the viewer instead of reading or reciting from the scroll (all three candidates share this pose); a full moon and night sky show through the window where the brief says dusk; the candle sits near the left edge, so it is not the visual heart, and no concentric gold-leaf arcs surround it; the whole outer robe is sheer, not only the sleeves; an unexplained lace cloth lies on a side cabinet at bottom left. The craft review preferred candidate 2 (a stronger face, candle and scroll triangle, but two crimson knots and a second lamp); the fidelity review preferred this one, which was selected, and suggested a re-roll with lowered eyes, lips parted as if reciting and both hands at the scroll.
Card fit: passes. Checked after binding (see the note above these blocks). Inside the 天工 border the title spans about 57-64% of the image height (6-17% of the width) and the name about 63-76% (6-46%). 小倩's face sits at about 23-33% and the hand at her chin at about 30-34%; her other hand rests on the scroll at about 55-58% (49-58% of the width), and her robe ends at the desk at about 55-58%, right of and above the lettering. The candle flame (about 40-45%) is clear. Only props sit near the text: the lacquer box behind 歸燈, the candle holder's base (about 18-28% of the width, down to about 61%) beside 歸燈, the scroll's left roller (about 32-38%, 59-61%) and a jade dish (about 28-42%, 62-65%) just above 小倩.
Allowlist: hosting/preview-assets.json only (preview-only; absent from hosting/public-assets.json)
Rejected candidates: candidate 2 0f52f022e4d5594f85e6dfc6000fe5a1bd8af369d25bfe9f420c6b124097831e (~/.codex/generated_images/01a12a33-9004-7b20-afa6-b647eeb35ee1/exec-8ea572ee-15ae-46d9-8fe2-fe36a77aeb17.png); candidate 3 e2e374226e2d325ec12d438abf09b33420ea370c1132a12367afb5972a59f218 (~/.codex/generated_images/01a12a35-09b4-72c2-999b-d1d5f665b25f/exec-818a753b-18d7-4d96-a35b-dcd7fc19012b.png); same prompt, kept in the private archive, not committed
```

Text sent to the Codex agent for lz01-001-tr1, verbatim:

```text
Generate exactly ONE image with your built-in image generation tool, using the prompt between the markers verbatim (do not rewrite it). Do not run shell commands, do not edit any files. After generating, reply with only the absolute path of the saved image file if you know it, otherwise reply DONE.
<<<PROMPT
Use case: stylized-concept. Asset type: full scene TREASURE collector-treatment portrait for an original premium Eastern literary card game Mythseal, set Liaozhai: A Light for the Living. One tall 2:3 image, 1024x1536 preferred, NO grid, no card frame or UI. Original composition titled internally Nie Xiaoqian: The Lamp of Return. A TREASURE treatment in BLACK LACQUER, GOLD LEAF AND JADE ENAMEL. Nie Xiaoqian, a young adult Chinese woman with pale luminous skin, long dark loose hair partly pinned with a simple slender jade hairpin, layered ivory and pale mist-blue robes with delicate spectral translucence only at the trailing sleeves, sits calmly at dusk beside a low scholar's desk in a modest study, a single candle in a simple bronze holder before her and an open sutra scroll whose paper is entirely blank; her face is quiet, steady and tender, in clear three-quarter view in the upper middle. Layered light study: the candle flame is the heart of the image, surrounded by concentric gold-leaf arcs and nested carved lacquer layers, a lattice window, a folding screen panel and bamboo outside rendered as jade enamel inlay, receding in depth like a treasured lacquer screen; every layer belongs to the painted room, not a card border. Nearly-black midnight-teal lacquer ground, restrained antique gold filigree, mineral jade, ivory and one small crimson knot. Very rich physical surface, luminous carved highlights, deep shadows with a clearly readable face. Composition solemn and balanced; bottom fifth is quiet lacquer and desk edge. Not a rainbow hologram. Tall vertical art fills the canvas without a separate outer border. Design from Pu Songling's classical characters, not any modern film costume or celebrity likeness. Fully clothed, no gore, no fox ears, no romantic embrace. No text, lettering, calligraphy or pseudo-glyphs anywhere; the scroll, screen panels and lattice are blank. No seals containing text, no numbers, coins, signatures, logos, watermark, borders or UI.
PROMPT>>>
```

### lz01-006-ink1 · 陸判 INK · 夜酌朱批

Added when 陸判 INK was bound, after the five blocks above. Its three
round-three candidates came from the same helper script, fixed wrapper and
route on 2026-10-11 between 10:20 and 10:25 UTC (11:20-11:25 BST), from the
round-three brief prompt committed in `b42ee4a`. As in the earlier rollouts,
the agent made the image call from its JavaScript `exec` tool as
`tools.image_gen__imagegen({ prompt, transparent_background: false })`; the
`prompt` string literal decodes to the brief's exact bytes. The binding session
re-ran the rollout check independently on all three candidates. Each rollout
holds one such call with no other arguments, and the image item's
`revisedPrompt` equals the prompt. The item has no model field, its
`savedPath` is the archive file, and its base64 `result` decodes to the archive
bytes, `caBX` included. The agent's user message equals the sent text below.
The session also re-hashed the archive original and compared the repository
copy with `cmp`. Unlike the first five, this file was checked for card fit
before binding: the craft review showed every candidate on the card in the
dialog at 1440 and 390 widths in Chromium and WebKit, and the binding session
read the smoke's dialog captures of the bound file at both widths in both
engines.

```text
Print ID / path: lz01-006-ink1 · assets/lz01/lupan-ink.png
Generation date: 2026-10-11, Europe/London (BST, UTC+1); generation record written 2026-10-11T10:24:27Z
Tool + exact model identifier: Codex CLI 0.162.1 (codex-cli 0.162.1), built-in imagegen tool image_gen__imagegen (image_generation feature); exact model identifier: not exposed (the tool result has no model field; see the next line)
Embedded content credential: C2PA manifest from OpenAI Media Service API (c2pa_rs 0.79.2), bound to these bytes by its data hash; c2pa.created 2026-10-11T10:24:15Z by softwareAgent ChatGPT, version gpt-image (a family label), digitalSourceType trainedAlgorithmicMedia; then c2pa.converted and c2pa.watermarked.unbound (an invisible watermark)
Orchestrating agent + its model: the Codex CLI agent, model gpt-6-astra (session header and rollout turn context), run with "codex exec --skip-git-repo-check -s read-only" by a Claude Code workflow script; this is the agent, not the image model
Codex session: 01a12a7c-d0e8-7a80-9701-aa274dfd14e4 (~/.codex/sessions/2026/10/11/rollout-2026-10-11T11-23-05-01a12a7c-d0e8-7a80-9701-aa274dfd14e4.jsonl)
Exact prompt sent: the image tool's prompt argument is byte-identical to the lz01-006-ink1 brief's round-three text block above, as committed in b42ee4a; no difference. The agent received that brief inside the fixed wrapper below (instruction line, then <<<PROMPT, the brief, PROMPT>>>), which is not part of the tool argument. Other tool arguments: transparent_background=false. Returned revisedPrompt: identical to the prompt
Prompt SHA-256 (tool prompt = brief, no trailing newline): 1fb40e5dc8c90acf2555115a961f99105d8a917fd0a56ffc54e508a3467b497f
Brief prompt SHA-256 at generation (commit b42ee4a): 1fb40e5dc8c90acf2555115a961f99105d8a917fd0a56ffc54e508a3467b497f
Text sent to the agent, SHA-256 (exact bytes below, ending with one newline after PROMPT>>>): 1b9947a4610577c12c7ea913c0e18e7aa1d8e1eee299dd88c73526b97a27cf29
Input images and SHA-256: none supplied
Private archive original: ~/.codex/generated_images/01a12a7c-d0e8-7a80-9701-aa274dfd14e4/exec-56c7edaf-1689-407b-bace-bd99ebe610ec.png
Output SHA-256 of the archive original: 56cff3e4384b3360f835e44daa27602e9be0cf4761dd0213a87542cb354d2f67
SHA-256 of the repository copy: 56cff3e4384b3360f835e44daa27602e9be0cf4761dd0213a87542cb354d2f67 (copied byte-for-byte; cmp reports no difference; no crop, resize, compression or metadata edit)
Dimensions and byte size: 1024x1536, 3,266,124 bytes
Selected: round three, candidate 3 of 3 (eighth 陸判 INK candidate overall)
Visual review: Two read-only reviews (fidelity and safety; craft and card fit) zoomed the drafts, the strike, both faces, the hat, rank badge, vignettes and lower paper, and scanned the whole image for vermilion regions. A real ink treatment on ivory paper, not a greyscale filter. No text, pseudo-glyphs, seals, signature or visible watermark (the C2PA record notes an invisible one): the only vermilion is the beard wash, the lamp flame, the ink box or brush and the strike, with no ring or dot; the drafts show a blank ruled frame with faint dashes and no character shapes. Fully clothed; no blade, blood, heart or head exchange, surgery or gore; no identifiable celebrity or film-costume likeness (a generic winged official hat). 陸判 has the faint grey-green face tint (G-R about -5.6, against -21.6 for 朱's skin), red streaks in the beard (赤須), the winged black hat and a cloud-pattern chest badge echoing the BASE robe; 朱爾旦 matches BASE (topknot, short beard, broad grin) and leans in with his cup. The wine cup is set aside, the lamp flame is vermilion with no amber, the statue stands alone in a temple corridor beside a censer, and 朱 carries it through the night. Accepted caveats: the two strikes leave the brush's descending stroke as a narrow, diverging wedge; they do not cross or close, but on the card they could read as a thin "=" or X; the brush touches the paper rather than hovering just above it; the drafts keep a ruled frame, which the round-three prompt had dropped; in the carrying vignette the statue rides in a frame on his back, so its lower body is hidden; a moon shows in the window. The craft review picked this candidate; the fidelity review preferred r3-c2 for its single sweep and accepted this one as its second choice; the workflow orchestrator selected this one.
Card fit: passes. Measured by the craft review in Chromium and WebKit at 1440 and 390, as a share of image height: 陸判's face about 28-33%, 朱's about 33-39%; every face, hand and the brush above about 55%. The title line starts at about 56.7-59.9% (its glyphs span about 8-28% of the width) and the name spans about 62-75%. The strike lies at about 55.7-58.5% and the drafts reach about 61%, under the 墨卷 paper shade (about 70% opaque from about 55.6% down), so on the card the strike reads as faint pink just above 夜酌朱批; below the text line only props (ink pot, inkstone, lamp base, the table's brushwork to about 66%) sit under the lettering. The binding session's smoke captures (dialog-lz01-006-ink1 at 1440x900 and 390x844, both engines) show the same. Caveats: the ★ and faction chips partly cover the two vignettes, and the top crop clips the statues' hats.
Allowlist: hosting/preview-assets.json only (preview-only; absent from hosting/public-assets.json)
Rejected candidates: round three r3-c1 556a27d25d6572f04756f2d5ab624c632211b02af40dbcee3b1e9fe426a59ff6 (~/.codex/generated_images/01a12a7a-9335-7f31-a88c-5b289f36a974/exec-7ed0a6e3-a20e-496a-bd68-cf84feb09f98.png; pseudo-text in the draft and crossing strokes); round three r3-c2 37e154b9c4576671116daa46c9804a4a5d1e9fb3a423148387c7592b37c9ccd5 (~/.codex/generated_images/01a12a7b-c1a6-7732-bc90-fd37780db8f4/exec-b3d2212a-e252-4789-94a3-c3b2c37a9689.png; acceptable, not selected); same prompt. Earlier prompts: round one (76bd79d7…) 63e77bbcb53771e6f2f87a536b124b874942ebec104d99ec04bf005557644c5d (~/.codex/generated_images/01a12a1a-1689-7531-bb95-e9dc477054e9/exec-dd31fd4f-7f51-4e13-a000-c8300855aeec.png), 48fb3231892f3356a1d5a811dea22d02a96f5503240303aa387c4fec4cab56d1 (~/.codex/generated_images/01a12a32-02d4-7511-a9ad-f18445fa6f4f/exec-ebe25390-0957-4600-91f4-2a873d70d1e8.png) and 93f42010b2f72281c37669c2e517a6ba44b7f893e5c13f3720f31f8d911f668a (~/.codex/generated_images/01a12a33-7108-7481-821d-819703dd3dc9/exec-0042f279-c37d-4c36-b744-0e596eb03894.png); round two (9976af34…) r2-c1 68d8cadb… and r2-c2 4ffa45b8…, recorded in full in the brief. All kept in the private archive, not committed; reasons are in the brief
```

Text sent to the Codex agent for lz01-006-ink1, verbatim:

```text
Generate exactly ONE image with your built-in image generation tool, using the prompt between the markers verbatim (do not rewrite it). Do not run shell commands, do not edit any files. After generating, reply with only the absolute path of the saved image file if you know it, otherwise reply DONE.
<<<PROMPT
Use case: stylized-concept. Asset type: full scene INK SCROLL special-print portrait for an original premium Eastern literary card game Mythseal, set Liaozhai: A Light for the Living. One tall 2:3 image, 1024x1536 preferred, NO grid, no card frame or UI. Original composition titled internally Judge Lu: Vermilion Marks over Night Wine. The entire artwork is black ink on warm ivory xuan paper: expressive brush lines, dry-brush texture, fine woodblock-style hatching and disciplined empty paper; the only colours are spare vermilion and a barely perceptible grey-green tint on his face, and no yellow, amber or orange anywhere; the lamp flame is a touch of vermilion and its glow is left as bare paper. Judge Lu Pan, an imposing otherworldly adult male magistrate, his green face suggested only by that barely perceptible grey-green tint, long beard touched with a restrained vermilion wash, dignified broad features, dark ceremonial robe and plain black official hat, sits at a low lamp-lit night table, wine cup set aside, holding a fine brush loaded with vermilion just above a small stack of essay drafts; the drafts lie on the table turned toward him, seen at a steep foreshortened angle mostly away from the viewer, and he has just struck out the top draft with one or two long sweeping vermilion strike-strokes drawn right across it. Opposite him Zhu Erdan, a broad sturdy adult scholar with a friendly coarse face and short beard in a plain cotton gown with loose sleeves, leans forward with a wine cup, rueful and eager. Behind them a door curtain hangs half lifted. Two small asymmetrical brush-edged vignettes are woven into the upper background: a standing wooden judge statue alone in a dim temple side corridor, and the same scholar carrying that statue on his back through the night, its official hat and robed body plainly visible. Imagery only. The drafts show only faint, illegible grey texture, never character shapes. Those one or two long sweeping strike-strokes across the top draft are the only vermilion marks on the drafts, each one unbroken sweep of the brush: no rings, no dots, no repeated marks in a row, and nothing that could read as a letter, numeral, glyph or symbol. The central pair dominates with faces readable at small card size. The pair, the table top, the drafts and the brush all sit above the lower two fifths of the image, which stay quiet empty paper below the table edge, because card text is printed over them. Not a grayscale filter on a colour painting. Design from Pu Songling's classical characters, not any modern film costume or celebrity likeness. Fully clothed, no surgery, no blood, no severed head, no gore. No text, lettering, pseudo-glyphs, calligraphy, seals, signatures, logos, watermark, numbers, speech balloons, borders or UI.
PROMPT>>>
```
