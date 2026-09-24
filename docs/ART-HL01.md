# 紅樓 · 風月入夢 — original art studies

Created **2026-09-23** for the local HL-01 海棠詩社 preview with the built-in
imagegen tool. No reference images were supplied. The underlying model identifier
was not exposed. Prompts below are transcribed from this conversation's generation
calls; no new image was generated during the post-restart completion.

These are original literary interpretations with historical-inspired costume,
not copies of screen adaptations. The paintings are detailed, softly lit portraits
and garden scenes; source episodes and invented compositions are distinguished in
[EXPANSION-HL01](EXPANSION-HL01.md). All typography, card frames and stats live
in HTML/CSS, separate from the bitmap artwork. These are preview printings, not
issued or owned cards.

| Asset under `assets/hl01/` | Subject / reading order |
| --- | --- |
| `base-01.png` | 黛玉 / 寶玉 / 寶釵 / 湘雲 |
| `base-02.png` | 探春 / 李紈 / 迎春 / 惜春 |
| `daiyu-aa.png` | 林黛玉 · 雨停之前 — an original rain-window composition |
| `xiangyun-aa.png` | 史湘雲 · 花影留眠 — separate chapter 62 episode |
| `tanchun-aa.png` | 賈探春 · 一紙相邀 — an autumn garden invitation |

All five selected PNG files are **1024×1536**. The two atlases use a 2×2 grid,
giving eight 512×768 portrait cells. The three AA works are full scenes. Selected
outputs were copied byte-for-byte into the repository, without cropping, editing
or compression. Before the restart, visual inspection covered all five complete
images, reading order, faces, props and text-free card art. Post-restart hashes
match those recorded immediately after the copy.

The five files total **14,752,601 bytes (about 14.1 MiB)**. They belong only to the
preview allowlist. The public 80-file build excludes them. Hosted transfer/decode
budgets and any compressed derivatives remain future work; preserve these originals.

## Selected outputs and integrity

Private generation archive:
`/Users/yuai/.codex/generated_images/01a0ceb9-22f1-7a62-902f-6480ec6c2039/`.
Original files remain there.

| Asset | Original filename | SHA-256 |
| --- | --- | --- |
| base-01.png | exec-f0239350-afb0-465c-ac40-5f8d478ff123.png | `5f1430951e3d8bb75370ed9c7d6db0e615288e0c0b6639ec929dd38b118c9e45` |
| base-02.png | exec-62495f43-a832-47dd-bb6d-d0c7d4aee243.png | `2a30b3358c599c9de271d5fbc4c14fe74036c75ab144055cb7d6b1816b1fc535` |
| daiyu-aa.png | exec-28f338ab-deb3-470d-b636-41ebd703ec65.png | `ecf8a5bdf44e5d718a7d21f4e5cf13d15fd0b761a6f3510fa0b597decf754628` |
| xiangyun-aa.png | exec-f60cdadd-cf0c-4fc3-9ad3-76a4f801d35f.png | `3b9766b80d42f659930c76719218798ec73d2ba59f26c4c9c82361e8679bd399` |
| tanchun-aa.png | exec-34ea8248-c08e-4ba5-9f23-61e569b28cad.png | `89b32be5e3b2fb7ad2a9915c38892114c3e83a6de86de46129f87638af08fc93` |

## Exact generation prompts

For each original call, concatenate its shared prefix below, **one ASCII space**,
then its subject paragraph. The prefix and paragraph each form one continuous
line; Markdown fences are not part of the prompt.

### Atlas prefix (base-01 and base-02)

```text
Use case: stylized-concept. Create an ORIGINAL literary card-art atlas for Mythseal, Honglou: Dreams among Flowers, based on characters from the public-domain classical novel Dream of the Red Chamber. ONE tall image 1024x1536 preferred, exactly FOUR equal edge-to-edge portrait tiles, perfect 2-column 2-row grid, no gutters and no borders. Each quadrant is an independent 2:3 portrait; all faces, hands, props stay within their own quadrant, no crossing midlines. Face in upper third, centered waist-up portrait with complete head. Refined Chinese ink and mineral-pigment painting on pale warm silk, delicate painted realism with expressive distinct faces, soft autumn garden light, warm paper ivory, dusty plum pink, bamboo jade, faded cinnabar. Quiet intimate poetry gathering, subtle feelings and intelligent gentleness, not warriors. Classical Chinese fully clothed characters in original historical-inspired layered robes; no movie/TV/celebrity likeness. NO text or calligraphy marks, no letters or numbers, no seals, no signatures, no watermarks, no logos, no card frames or UI. Blank paper remains blank. Beautiful atmospheric backgrounds, portrait clarity at small size, lower fifth relatively quiet.
```

### Full-scene prefix (the three AA works)

```text
Use case: stylized-concept. Create ONE original full-scene alternate card illustration for Mythseal, Honglou: Dreams among Flowers. Tall 2:3 portrait, 1024x1536 preferred, single coherent composition, NO grid, NO card borders, no UI. Exquisite Chinese ink and mineral-pigment painting on warm silk with fine expressive painted detail, natural garden light, warm paper ivory, dusty plum pink, bamboo jade. Classical literary interpretation of Dream of the Red Chamber, original costume and composition, no movie, TV or celebrity likeness. Characters fully clothed in layered historical-inspired robes, quiet emotional intelligence, no sensuality. NO text, writing, calligraphy marks, seals, letters, numbers, logos, signatures or watermarks. All visible paper blank.
```

### base-01

```text
Exact reading order: TOP LEFT Lin Daiyu, slender Chinese adolescent girl, oval thoughtful face, long dark hair pinned simply with a small pale jade ornament, mist-jade and ivory robe, holding a slender writing brush above a blank ivory poetry sheet, rain-fresh bamboo and latticed window behind; attentive steady eyes and faint private smile, no crying. TOP RIGHT Jia Baoyu, youthful clean-shaven Chinese adolescent boy, soft round face, tied black hair with a modest carved crown, coral-red robe over pale ivory, small jade pendant at collar, holding a folded blank poetry sheet, leaning forward slightly with earnest warmth under a garden pavilion, no armor. BOTTOM LEFT Xue Baochai, Chinese adolescent girl with composed rounded face, smooth dark hair in a tidy unadorned bun, pale honey-beige layered robe, small elegant gold neck ornament, one hand resting on a closed cloth-bound blank book, warm plum-colored curtain and white begonia blossoms behind; unshowy assurance. BOTTOM RIGHT Shi Xiangyun, Chinese adolescent girl with bright mischievous eyes and gently laughing face, dark half-tied hair with a little ribbon, soft apricot-pink robe with sage-green sash, holding a white begonia spray as if an idea just arrived, sunlit garden stone and pale flowers behind. Distinct facial structure and gesture for each portrait.
```

### base-02

```text
Exact reading order: TOP LEFT Jia Tanchun, Chinese adolescent girl with an alert oval face and upright confident posture, tidy dark hair with slender green hairpin, layered pale celadon and cream robe, extending a folded blank invitation on pale pink paper toward the viewer, a garden gate with white begonias behind, welcoming but decisive. TOP RIGHT Li Wan, mature young-adult Chinese woman, calm composed face, simply pinned black hair without bright jewels, soft ivory and muted lavender-grey robes, seated upright at an old wooden table holding a small blank poetry folio, porcelain teacup and garden shadows nearby, generous patient host and judge. BOTTOM LEFT Jia Yingchun, Chinese adolescent girl with round gentle quiet face, dark hair with simple ivory ornament, muted peach and oatmeal robes, fingers resting beside a small covered incense timekeeper on a garden table, a pale latticed screen and flowers behind; patient attention, no incense smoke covering face. BOTTOM RIGHT Jia Xichun, youthful Chinese girl, smaller oval face, dark hair neatly tied with a plain ribbon, fully covering pale lilac and ivory robes, seated with a small blank sketchbook and fine dry brush held carefully, quiet observant gaze, moss-green garden rock and white blossoms beyond. Each portrait is separate, distinct age, silhouette and props; no exposed skin beyond faces and hands.
```

### daiyu-aa

```text
Title concept: Lin Daiyu — Before the Rain Clears. A fully clothed Chinese adolescent girl with a slender thoughtful face, dark hair partly pinned with a small pale jade ornament, pale mist-jade and ivory robes, sits at a low writing desk beside a wide open lattice window. Her three-quarter face is upper right, brush held delicately above a blank poem sheet at center; she has paused to hear the last drops of rain. The large left half opens into layered rain-fresh bamboo, grey-green leaves and luminous mist. A few drops cling to the window eave, pale daylight reflected in a small porcelain water dish, soft pink petal on otherwise blank paper. Emotion is poised inward attention, not weeping. Asymmetrical intimate composition with generous airy space and beautiful fine bamboo brushwork. No book or paper writing. Lower quarter holds the quiet desk and reflected cool light, full hands intact.
```

### xiangyun-aa

```text
Title concept: Shi Xiangyun — A Nap beneath the Flowers. An original symbolic scene anchored in the novel's peony nap episode: a fully clothed youthful Chinese girl in modest loose pale apricot robes with a green sash is peacefully asleep on a long garden stone bench, her head resting on folded sleeves, whole body small and diagonally placed in the lower middle distance. Huge airy sprays of luminous pale pink and white peonies, translucent petals and soft green leaves fill upper two-thirds and frame her like cloud-shaped shade; a few petals have fallen on her covered sleeve. No cup, no alcohol props. Calm natural resting posture, distant face, no emphasis on body. A small folded round silk fan near the bench, warm early-summer dappled light. The garden and flowers are the main subject, the small sleeper makes the immense scene tender. Elegant visual storytelling with depth, no posed portrait, no text.
```

### tanchun-aa

```text
Title concept: Jia Tanchun — One Invitation Brings Us Together. A fully clothed Chinese adolescent girl with an alert oval face, tidy dark hair and slim green hairpin, in a pale celadon and ivory robe, stands at the open moon gate of a beautiful autumn garden. She is on the upper-middle left and extends a small folded blank pale pink invitation toward the viewer at center, calm confident welcoming smile. White begonias and bamboo curve around the gate. Through the gate in the middle distance are a circular stone table, a porcelain tea set and several empty stools waiting for friends, no visible secondary people. Warm soft afternoon light, long gentle garden shadows, one open invitation making room for a gathering. Strong depth, refined ink textures, airy negative space at upper right, subtle pale gold light. Keep paper blank and entire hand intact.
```
