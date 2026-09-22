# Original character art

Generated on 2026-09-21 with the built-in **imagegen** tool (no CLI/API fallback). Selected user direction: Eastern mythology × refined dark fantasy. No source images or old-game artwork were supplied to the generator.

The final atlas is saved in [assets/portraits.png](../assets/portraits.png). It was copied unchanged from the tool output; the game uses CSS background positions to display the twelve cells. The atlas is 4 columns × 3 rows, each a 3:4 portrait. UI frames, type, symbols and controls are separate code-native elements. The original generator output is preserved.

Tile order and original names are listed in [DESIGN.md](DESIGN.md#original-factions-and-atlas).

## Exact generation prompt

> Use case: stylized-concept. Asset type: a SINGLE production sprite atlas image for an original premium Eastern mythic card game called Shanhai Duel. Generate exactly TWELVE distinct original character portraits as a perfectly regular 4-column by 3-row contact sheet, all twelve edge-to-edge rectangular cells of equal size, overall square image, no gutters, no borders. Each tile is a vertical 3:4 portrait (total image 4 tiles wide, 3 tiles high). Digital hand-painted fantasy illustration with exquisite faces, sophisticated material textures, cinematic rim light, painterly atmospheric backgrounds; rich restrained jewel colors, beautiful and mysterious Eastern mythology, no gore. Each subject fills their tile as a waist-up character, face in upper third, centered and legible at small trading-card size. Do NOT depict any existing copyrighted game character. The four columns consistently represent factions: column1 celestial jade and gold; column2 vermilion fire warriors; column3 moonlit silver/indigo spirits; column4 emerald woodland creatures. Row1: (1) dignified female celestial sword master with flowing black hair and jade crown, (2) youthful male phoenix spear warrior in red-and-bronze armor with fiery feathers, (3) enigmatic white-haired fox enchantress in elegant covered robes with silver fox ears and moon halo, (4) ancient antlered stag guardian with moss and gold eyes. Row2: (1) calm middle-aged male astral alchemist holding golden orbiting rings, (2) fierce short-haired female ember monk with scarlet glowing prayer beads, (3) masked male mist ferryman with indigo robes and a paper lantern, (4) young female forest archer with leaf-green hood and a living wood bow. Row3: (1) elderly female oracle in white and jade with floating paper talismans, (2) imposing obsidian qilin creature with glowing amber fissures and red mane, (3) raven-haired female dream weaver holding luminous blue silk ribbons, (4) mischievous small white-gold cloud tiger guardian among emerald mountains. Faces and silhouettes all distinct. Every tile depicts only its specified character, all poses and lighting coherent as one art direction. NO text, NO letters, NO numbers, NO watermarks, NO card UI, NO frames. Crisp high resolution production artwork.
# Six-realm travel map

Generated for v0.2 on 2026-09-21 using the built-in image generation tool. Original map for this game; no reference image. Output: `assets/world-map.png` (1536 × 1024). Source retained at `the private local image-generation archive`.

Exact prompt:

```text
Use case: stylized-concept. Asset type: single panoramic illustrated interactive world map backdrop for the original Eastern mythic card game Shanhai Duel. A beautiful detailed hand-painted isometric bird's-eye fantasy landscape, wide 3:2 composition. Sophisticated dark jade green forests, antique golden illuminated roads, misty moonlit blue rivers, vermilion volcanic mountains, delicate Chinese temples, rich texture, elegant mysterious collectible card game art direction. Geographic locations that the UI will pin over later: lower-left near x18% y74% a small warm lantern harbor village; upper-left-middle x30% y48% an immense ancient sacred forest and mossy stag shrine; bottom-middle x50% y70% a blue crescent lake with ferryman pagoda; upper-middle x54% y37% a glowing red volcanic pass with phoenix-shaped rocks; upper-right x75% y28% a majestic white jade celestial temple on high peaks with gold roofs; lower-right x83% y61% a mysterious ruined obsidian gate with violet glow on an island. Connected winding tiny illuminated paths and bridges naturally travel between these places across the landscape. Multiple layers of mountains and painterly fog, coherent believable geography, a living small world with settlements, trees, small waterfalls. View the entire landmass with dark atmospheric edges, detailed and jewel-like, no huge close-up character, no UI, absolutely NO text, labels, numbers, icons or banners. Avoid flat simplistic cartoon style; premium painterly game background, tranquil and inviting despite dramatic dark fantasy. Preserve readability of the six landmarks with enough visual breathing room around them.
```


## Classical expansion · v0.3

The new `assets/classics.png` atlas is documented separately in [ART-CLASSICS.md](ART-CLASSICS.md), including its exact built-in generation prompt, source output path and tile mapping. Original portraits and map remain unchanged.

## Mist Gate presentation · 2026-09-22

The local first encounter reuses the unchanged original map and portrait atlases.
`mist-gate-ui.mjs` contains an original code-drawn SVG paper lantern; its ribs,
flame and reflection are vector paths, with mist/light supplied by `mist-gate.css`.
Guardian arrival/result lines are original game writing. No external image,
recording or generated bitmap was added for this slice.

`experience.mjs` synthesizes short interaction tones and a quiet filtered-noise
water-like texture. The noise generator is independent of gameplay randomness;
its two-second mono buffer is generated locally, with tapered loop edges and a
short gain envelope. This is synthesized ambience, not a field recording or
music track. See [IMMERSION.md](IMMERSION.md) for proposed art/audio follow-ups.

The same day's shared battle pass adds CSS jade life rings, pill capsules and
an original inline SVG ink-crossing/ripple in `battle-ui.mjs` / `battle.css`.
The optional recovery cue is another synthesized tone. No external asset or
new bitmap/audio download accompanies the resource and clash presentation.

## Traditional-story maps · 2026-09-22

Three new original map illustrations for 西遊, 封神 and 白蛇 are in `assets/maps/`.
See [ART-STORIES.md](ART-STORIES.md) for the built-in image-generation prompts,
selected output paths and provenance. Existing atlases and the 山海 map remain
unchanged; labels and pins are drawn by the application.
