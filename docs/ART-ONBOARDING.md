# Onboarding, tutorial and key art — provenance record

Status: `proposal · 2026-10-20`. Nothing listed here has been briefed,
generated or committed. This file names the planned onboarding, tutorial and
key art, sets out the fields each selected image fills in, and records what is
known about the planned tool's terms. When an image is selected, its block
under [Selected images](#selected-images) becomes a dated record.

The owner's decisions of 2026-10-20 behind it:

- The first tutorial packet, T1 (初見提點 first-visit hints, a 詞彙 glossary
  and tappable header resources), needs no new art.
- An illustrated 入門卷, T2, with ArtCraft art comes later, not now.
- New art may use reference images, but only Mythseal's own committed art. The
  reason and the way to record it are in
  [ART.md · Reference images](ART.md#reference-images--2026-10-20).

## Planned assets

From the backlog of an asset audit on 2026-10-20 (a working note, not in this
repository). Sizes are targets; each block records the real output size and
format.

| ID | Asset | Purpose | Target | Priority |
| --- | --- | --- | --- | --- |
| K-01 | Master key art | First-launch title, store screenshot caption backgrounds, the web share image, the 入門卷 opening | 3:2 1536×1024 and 2:3 1024×1536; no text; a quiet area for a title set in code; the faction palettes; the existing cast or a 霧隱渡口 vista | P1 |
| T-01 | Guide figure: 守渡弈者 | The guide's face in the 入門卷 | 2:3 1024×1536, waist-up, face in the upper third, paper lantern, quiet background; any bust crop is made by tooling | P1 · identity brief first (below) |
| T-02 | 霧隱渡口 ferry and shore | Tutorial and arrival backdrop, replacing the `world-map.png` crop in `mist-gate.css` | 2:3 and 3:2; no faces; lantern, ferry, mist; lower ~40% quiet; mist and water motion stays in CSS | P1 |
| T-07 | Rule-tile vignettes ×4: 藏鋒, 決勝, 共鳴, 破局 | Headers for the four tiles of the 弈道 rules dialog and the 入門卷 chapters | 3:2 1536×1024, derivative 768×512; no text, numbers or diagram | P2 |
| G-01 | 洞府 lobby backdrop | "A place to return to" ([IMMERSION](IMMERSION.md)), replacing the `world-map.png` crop behind the lobby in `navigation.css` | 2:3 and 3:2; a quiet centre for the deck | P2 |

**T-03 to T-06 are not generated.** The rule diagrams (T-03: 力 ×（1 ＋ 仙丹）,
the tie-break, 共鳴), the card-anatomy explainer (T-04: the live card markup
with callouts), the four faction emblems (T-05) and the 仙丹 and 怒擊 glyphs
(T-06) need exact numbers, Traditional Chinese text or the code-drawn UI's own
shapes, and Mythseal's art carries no text. They are drawn in SVG or HTML from
the engine's values, and the code is their record, not this file.

**T-01 is 守渡弈者, not 渡影.** 守渡弈者 is the Mist Gate's guardian and AI
opponent. The arrival line names the waiting figure 掌燈人 (「渡船停在霧中，
掌燈人正等你落下第一子。」) and the guardian's lines that follow are labelled
守渡弈者 (`mist-gate-ui.mjs`); this record treats them as one figure, and the
brief should confirm it. The campaign's 無字渡口 encounter returns to the
same 掌燈人 (`campaign-content.mjs`). Today the guardian is drawn only as the
code SVG lantern, with no portrait. 渡影 (無岸舟人) is a different character: a
playable 月隱 card whose portrait is cell 6 of `assets/portraits.png`, prompted
as a "masked male mist ferryman with indigo robes and a paper lantern"
([ART.md](ART.md#exact-generation-prompt)). Both carry a lantern by the water,
so T-01's brief has to make the guardian read as a separate person, and 渡影's
cell is not an identity reference for him. (The audit's draft target suggested
月隱 indigo and silver, which is 渡影's palette too; the brief decides.)

## Provenance fields, one block per selected image

Copy this block under a dated heading in [Selected images](#selected-images)
for each selected file. Write "not shown" or "unknown" rather than guessing.

```text
ID / repository path:
Purpose:
Generation date (YYYY-MM-DD, timezone):
Tool and route (for example ArtCraft web, app.getartcraft.com, on Storyteller credits; version if shown):
Provider + model (as the tool names it; "not shown" if absent, never inferred):
Settings (aspect ratio, resolution, quality, batch size, system prompt on or off):
Exact prompt (verbatim, as sent):
Prompt SHA-256 (UTF-8 bytes of the exact prompt, no trailing newline):
Reference files (none, or each as repository path + SHA-256 of the committed file; for a crop, also the crop rectangle and the SHA-256 of the bytes uploaded):
Output format, size in pixels and byte size:
Output SHA-256 (the downloaded original) and SHA-256 of the repository copy (must be equal: a byte-for-byte copy):
C2PA summary (claim generator, softwareAgent, actions, created time; "none" if absent):
Selection notes (candidates seen and why this one; visual review: no text, pseudo-glyphs or visible watermark, fully clothed, no gore, identity consistent with its references; fit checked at 390 and 1440 widths):
Rejected candidates (SHA-256 each; kept privately, not committed):
Owner approval (the brief and the selection, each with its date):
```

What these fields have to work around:

- **No seed, and no local prompt.** ArtCraft's image request has no seed
  field, so an output cannot be regenerated. The desktop app's local task
  database keeps only a token for the prompt; the text lives on Storyteller's
  server. Copy the exact prompt into the block when you generate.
- **The prompt sent can differ from the prompt typed.** ArtCraft's request has
  an `enable_system_prompt` option, and where that system prompt's text comes
  from is unknown. Record the setting; whether to keep it off is the owner's
  call.
- **Model names.** Record the model as ArtCraft's menu names it; a menu label
  may name a family rather than a version. Read the C2PA credential separately
  with a read-only parse of the file's chunks, as
  [ART-LZ01](ART-LZ01.md#embedded-content-credentials-c2pa) does. Whether a
  credential survives depends on the provider.
- **Style continuity.** All 38 PNGs committed under `assets/` carry an
  `OpenAI Media Service` credential naming `gpt-image` (read-only chunk parse,
  2026-10-20), so the whole library is gpt-image-family output. ArtCraft also
  offers GPT Image models; another model family is a style decision for the
  owner, not only a tool choice.

## ArtCraft: what is known and what is pending

Checked on 2026-10-20 from ArtCraft's public source (desktop v0.41.0, released
2026-09-26), its websites and the storyteller.ai terms. Nothing was installed,
signed in to or generated for this record.

- **ArtCraft has no terms of its own.** `getartcraft.com/terms` and
  `getartcraft.com/privacy` return 404 (rechecked 2026-10-20). The only terms
  found are storyteller.ai's: "Last updated November 18, 2022", from "Learning
  Machines, Inc, doing business as Storyteller", under the laws of the State of
  Georgia. That they govern ArtCraft is inferred, not confirmed. The macOS app
  is signed by the Apple Developer ID "Learning Machines LLC", a different
  entity name.
- **Those terms give Storyteller a broad licence.** They say "We do not assert
  any ownership over your Contributions", and also that you grant Storyteller
  "an unrestricted, unlimited, irrevocable, perpetual, non-exclusive,
  transferable, royalty-free" licence over them, and that "Contributions may be
  viewable by other users of the Site and through third-party websites."
  Whether ArtCraft's uploads are public by default is unknown. A reference
  image uploaded to ArtCraft is a contribution too, so the licence would also
  reach the Mythseal art used as a reference.
- **Prompts and outputs go to Storyteller.** On the default route (Storyteller
  credits) the prompt and the images go to Storyteller's servers. With a
  bring-your-own fal key, ArtCraft still creates the prompt record on
  Storyteller and uploads the result to its library (seen in source). The web
  app at `app.getartcraft.com` uploads in the same way. ArtCraft's licence file
  at v0.41.0 says "Generated assets are yours" and its website says "Your work
  stays yours"; neither is a service agreement. The terms of the model
  providers behind ArtCraft (OpenAI, Google, Black Forest Labs, ByteDance) have
  not been checked one by one.
- **Pending, and a gate before any store build.** Mindicraft Limited is the App
  Store publisher ([IOS-FIRST-FLIGHT](IOS-FIRST-FLIGHT.md)). No ArtCraft output
  ships in a store build until Storyteller confirms in writing that Mindicraft
  may use the outputs commercially. That confirmation has not been requested or
  received; the same request can ask whether uploads and outputs are kept
  private. Separately open: how
  Mindicraft holds the rights to Mythseal's art at all (App Review Guideline
  5.2.1).
- **Committing is publishing.** The repository is public
  ([AGENTS.md](../AGENTS.md)), so a committed output is published at once. The
  gate above was set for store builds; whether it should also come before
  committing an output, or before serving one on `mythseal.com`, is the
  owner's call and is not decided here.
- **ArtCraft's built-in library is third-party material.** Its 3D kits,
  characters, skyboxes and sounds include items whose rights are unclear (the
  NOTICE file on its main branch lists third-party material). Under the
  reference principle they are neither references nor assets for Mythseal.

## When an image is committed

- Copy the selected original byte for byte under `assets/`. Bytes never change
  behind a committed path; a revision is a new file with a new name.
- Add a SHA-256 table for the committed files to this record, with a test that
  checks it, as `tests/liaozhai-content.test.mjs` checks
  [ART-LZ01's table](ART-LZ01.md).
- A file in an allowlist needs a runtime reference in the same change:
  `tools/content-registry.mjs` rejects a publicly allowlisted asset that
  nothing playable references (`public-orphan`).
- Ship derivatives (crops, WebP) only from deterministic tooling, keeping the
  original and its hash
  ([pipeline](CONTENT-RELEASE-PIPELINE.md#2-插畫製作與可重建加工)). 入門卷
  panels are not first-screen assets.

## Selected images

None yet.
