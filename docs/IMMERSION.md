# Mythseal · immersion and game feel

Direction requested **2026-09-22**: enrich the experience of inhabiting the world,
handling cards, making four-round decisions and travelling with individual card
copies. This M4 design and delivery plan is linked to the confirmed iOS/Android
direction. **The first 霧隱渡口 presentation pass is now implemented locally**;
its scope is recorded below. The wider ideas remain proposals to playtest, not
a committed launch feature list. Public release state belongs in [HOSTING.md](HOSTING.md).

## Creative direction

**A quiet mythic world, with decisive moments of tension.** Keep the existing
Eastern mythology and refined dark-fantasy art direction. Let a lantern, a card
edge, a handful of pills and a short silence do some of the storytelling. Reserve
the strongest motion and sound for commitment, revelation and earned milestones.

The central fantasy is: **these are the cards that travelled with me**. Connect
the five destinations into one journey: prepare in 洞府, enter a place through
遊歷, make decisions in 對弈, remember companions in 藏卡, and meet the merchant in
市集. Preserve the existing destination scroll positions, cards-hub filters/deck
drafts and explicit preparation-to-deck return path described in
[NAVIGATION.md](NAVIGATION.md). Switching destinations can discard preparation
intent; this proposal does not imply a new global navigation history.

This builds on three distinctive parts of the current game: visible hands with
hidden pill commitments, a small six-location world, and copies with their own
XP and records. New sensory feedback should make those parts easier to feel and
understand.

## What exists today

- The local game lobby, deck fan, preparation, quest overlay and next/retry flows
  are implemented. The original portrait atlases and travel map already supply
  a coherent visual world.
- Alongside the existing transitions and pack-arrival effects, Mist Gate now
  has a short staged reveal and optional synthesized water-like ambience and
  interaction cues. Device-local preferences remember sound, ambience/effect
  levels, reduced motion and normal/fast reveals. Native haptics, recorded
  soundscapes and a music system remain future work.
- Round results already expose both bids, attacks, effects and damage; match
  results expose rewards and XP. Mist Gate stages that information while
  preserving access to the complete explanation.
- Card details already have a 同行記 with acquisition date/source, XP, level,
  appearance/win totals and lore. The save does not contain a detailed,
  timestamped account of every card's past adventures.

These are source observations, not evidence of a new public release. The
[handover](HANDOVER.md) distinguishes local development from the live baseline.

## Local first pass · 2026-09-22

Implemented after the owner's instruction to build the 霧隱渡口 experience with
particular care for subtlety and transitions:

- An arrival scene uses the existing map, a code-drawn lantern, slow mist and
  short original guardian writing. A cleared visit has a different greeting.
  Preparation still reads the actual deck; it does not start or charge a match.
- The same cool landscape and warm lantern continue into the battle table.
  Selection has a small lift, the offering tray distinguishes bid/Fury/reserve,
  and a public faction strip explains bonuses from the original hand. The
  strip remains after an ally has played; there are no new faction rules.
- On commitment, a seal introduces the saved result. Bids appear at 100 ms,
  impact at 390 ms, and presentation completes at 760 ms, with 160 ms visual
  transitions and stable controls. Skip/Next are immediately available. Restored
  or reopened results render completely without replaying the sequence.
- Sound is off initially. The player can enable soft synthesized cues and a
  quiet water-like texture, with separate environment/effect levels. Audio has
  its own deterministic noise source so it cannot change combat randomness.
  Ambience continues from preparation to battle, including the settings detour;
  hiding the page or muting stops audio. No recordings or downloaded audio assets
  are used. A 140 ms onset and tapered loop edges soften the texture's entry and
  repeat. Listening and physical-device tuning remain open.
- The guardian responds to a win, draw or loss. Played copies link from their
  actual XP rows to a read-only 同行記 and back to the same result; nested panels
  retain parent scroll/focus. First-clear text names the next actual location.
- A header control opens 聲息與節奏, also reachable from preparation and results.
  These settings use `shanhai.experience.v1`, separate from profile/battle saves.
  Reduced motion includes older effects; native vibration remains planned.

Implementation ownership: `mist-gate-ui.mjs` and `mist-gate.css` supply the scene;
`experience.mjs` owns optional preferences/audio/reveal timing; `app.mjs` connects
the existing battle and return paths. `backpack-ui.mjs` supplies the read-only
passport variant. There are no engine, economy or profile-schema changes, and
the public build includes 24 allowlisted files. Verification belongs in
[VALIDATION.md](VALIDATION.md#mist-gate-immersion--2026-09-22).

This completes a local playable slice of M4.1–M4.2. Human playtesting, measured
physical-phone performance and the wider content pipeline remain open milestone
evidence; screenshots and browser emulation do not complete those requirements.

## Additions worth testing next

| Priority | Addition | What would make it worthwhile |
| --- | --- | --- |
| Next polish | Listen on speakers/headphones and physical phones; tune the synthesized water texture, cue volume and transition envelopes. Try a brief ambience dip at commitment. | The cue is felt without becoming repetitive or masking concentration; mute/lifecycle remains immediate and reliable. |
| Next polish | Give earned XP a restrained visual flow into each played copy; add one brief faction connection between the relevant cards. | Make growth and resonance easier to follow without adding another wait or hiding the numbers. Current delivery uses real XP rows and a faction strip. |
| Phone playtest | Try a more compact portrait battle layout or a carefully placed bid tray. | Reduce scrolling between the four cards and commitment controls while keeping card details readable and touch targets clear. Current narrow layouts fit the width but still scroll vertically. |
| Next scene | A closer original ferry/shore illustration, with independently controlled mist/water layers and a gentle arrival-to-table transition. | Establish a sense of place beyond the existing map crop, within measured phone asset/render budgets and documented art provenance. |
| After playtests | One selected card's distinct reveal motif, then a first treatment of 青玉森庭. | Reuse the presentation seam while making the next place feel different. Prove one card/location before adding the rest. |
| Companion follow-up | A chosen owned card in 洞府 and explicitly recorded journey milestones. | Build attachment from real copy records. Old counters cannot reconstruct a detailed past; new events need deliberate persistence/migration. |
| Separate gameplay work | One pill-conservation puzzle or a distinct guardian strategy. | Add a meaningful decision with reproducible balance/fairness checks, independent of visual polish. |

Keep full voice acting, elaborate card rigs, a large soundtrack, pack rituals and
branching journeys as later candidates. The scene should earn each addition
through playtesting; the existing core loop remains a complete place to start.

## Moments worth building

| Moment | Proposed player experience | Scope and priority |
| --- | --- | --- |
| **A place to return to** | A gently lit 洞府, a restrained moving mist layer, the real active deck on the table, and a clear invitation to resume the journey. Later, let the player choose an owned companion to display. | Begin with existing art and one inexpensive ambient treatment. Choosing a favourite is new preference state; it grants no stats. |
| **Cards and pills have weight** | A selected card lifts into position; pills click into a counted offering beside it; committing places a seal. Fury has its own clearly labelled accent. The number, remaining reserve and confirm action stay legible. | Early interaction polish. Tapping/keyboard controls remain complete; dragging is optional. Decorative pill placement must not expose the opponent's hidden spend. |
| **The reveal is the dramatic centre** | A brief hush, both commitments revealed, final attacks compared, one restrained impact, then damage and recovery settle visibly. A tie explains the lower-star/initiative rule at the moment it matters. | First encounter slice. Use the resolved result, with fast/skip and static modes. No new combat outcomes or forced pause before a decision. |
| **Every realm has a character** | 霧隱渡口 has water and a lantern; 青玉森庭 has leaf shadows and distant bells; 赤燼關 has embers; 鏡月澤 has reflections; 雲闕天階 has high wind and star lines; 歸墟王座 has sparse light and deep quiet. Each guardian gets a short arrival/result line. | Prove one location, then expand. These are proposed treatments of existing places, not six new boards or rulesets. First-clear map changes read actual saved progress. |
| **A card becomes a companion** | After a match, the actual played copies receive their XP acknowledgement. One tap opens that copy's 同行記. Later, an owned favourite can greet the player in the lobby with authored lore, and recorded milestones can appear as small seals in its journal. | Surface existing copy records first. New per-encounter milestones require explicit stored events and migration; never invent earlier victories for an old save. |
| **Discovery has a small ritual** | An earned-coin 秘匣 opens with a seal breaking and three cards revealed. Let players tap through or reveal all, then inspect the exact new copies. A rare card gets a brief art focus while its rarity and combat stars remain distinct. | Later collection polish. Keep existing price, odds and results; no near-miss presentation or repeated payment when replaying/skipping the animation. |

Suggested faction vocabulary uses shape and sound alongside colour:

| Faction | Visual accent | Sound idea |
| --- | --- | --- |
| 雲闕 | Jade/gold seal lines and a clean star arc | A short clear bell |
| 赤燼 | Vermilion brushstroke and a brief ember trail | A dry drum/ember snap |
| 月隱 | Silver/indigo ink ripple | A soft plucked note with a short tail |
| 森羅 | Emerald leaf-ring or branching line | A muted wooden knock |

Use these on public faction activation or the relevant card's reveal. An effect
should identify what happened without covering card values or suggesting that a
rarer illustration has stronger combat rules. When the original drawn hand meets
the existing faction condition, briefly link its allied cards with that motif
and retain a readable bonus indicator after an ally is played; used allies still
count. This expresses existing faction resonance, not a new pair-specific bonus.
Start with one faction sample;
layered animated portraits, voice acting and a full soundtrack are later content
investments, not prerequisites for better feedback.

## First complete slice · 霧隱渡口

Use the player's actual active deck and the existing 守渡弈者 encounter. Do not
force a featured character into the draw. A successful slice carries the player
through a whole existing battle, including losses and early knockouts.

| Beat | What the player sees/hears | Interaction |
| --- | --- | --- |
| Arrival | Existing map art, a lantern accent and the current line: 「渡船停在霧中，掌燈人正等你落下第一子。」 Optional water ambience follows the player's audio choice. | Preparation and deck editing remain immediately available. Returning players can proceed without replaying an introduction. |
| Choose | Cards feel lifted from the hand; each pill adjustment has a subtle cue and an explicit number. | Keep initiative, both public hands, remaining pills and Fury cost visible. Selection previews remain estimates. |
| Commit | A seal closes on the player's choice; any ambience dips briefly. | The first mover's card is public; pill spend and Fury stay hidden until both moves are committed. Never infer feedback from the other side's secret bid. |
| Reveal | Show both resolved commitments → compare actual attacks → impact → damage/recovery and remaining resources. | Aim for a normal reveal of at most 900 ms, with no mandatory reading timer. Keep the complete textual explanation and an explicit next-round control. |
| Completion | The win, draw or loss has a short distinct response. Earned XP is associated with each exact played copy, alongside the existing reward totals. | Viewing/skipping effects does not pay rewards. Unplayed cards receive no XP; practice retains its existing no-XP/no-currency rule. |
| Return | On a first victory, the next real location becomes legible on the map; on loss/draw, the same encounter offers retry or a deck adjustment. | Preserve the implemented next/retry and deck-return context. No extra confirmation is needed to dismiss a celebration. |

The 900 ms reveal and the content pipeline's 120–180 ms selection / 250–400 ms
flip ranges are **initial playtest targets**, not measured performance or a
requirement to animate every beat separately. Try the fast/static version early;
four-round repeat play should remain brisk.

## Delivery packets

| Roadmap packet | Deliverable | Evidence before expanding |
| --- | --- | --- |
| **M4.1 · Feedback foundation** | A small presentation adapter, persistent local sound/motion/pace preferences, distinct selection/commit/reveal cues and one card/faction sample. Reuse the current DOM and static artwork. | Same saved result with normal, fast, skipped and reduced-motion presentation; keyboard/touch access; no hidden information in presentation events. |
| **M4.2 · First immersive encounter** | The complete 霧隱渡口 sequence above, including a small original/cleared-for-use sound palette, public-result reveal and exact-copy XP handoff. | Playtest one full win and loss/draw path, an early KO and return/deck/retry. Record comprehension and repeat-play pacing, then run interruption and device checks below. |
| **M4.3 · World and companion identity** | Expand proven realm/faction treatments, short guardian writing, existing 同行記 presentation and an earned-pack opening ritual. Favourite-card display is a separately scoped preference addition. | Each scene has static/muted alternatives, an asset budget and provenance. New journal milestones have actual source events; packs and rewards remain single transactions. |
| **M4.4 · Encounter depth experiments** | Prototype one training puzzle or one distinct opponent playstyle, then consider authored encounter variants or branching journeys. | Document rules/content changes separately, seed reproducible scenarios, test balance and the AI's public-information boundary. Do not silently change the ordinary four-round game or add unreviewed reward sources. |

M4.1–M4.3 are presentation/content work that can start on the guest AI game while
M1–M3 advance the online contract. M4.4 is a candidate gameplay expansion, not a
requirement for the first mobile release. PvP remains a separate server-backed
M4 decision. Mobile beta takes a selected, verified subset; it does not wait for
every idea in this document.

Good depth experiments would teach a meaningful choice: a seeded practice puzzle
about winning while conserving pills, or a guardian whose legal decisions favour
resource conservation. Any authored hint uses public state or already revealed
history. These are proposed new content/AI behaviours; the present guardian names
and flavour text alone do not establish distinct AI personalities.

## Implementation and content seams

Follow the [content pipeline](CONTENT-RELEASE-PIPELINE.md): pure rules stay in
`engine.mjs`, settlement stays in progression/collection, and presentation consumes
only permitted public events. Accept and persist state first, then play effects;
an animation callback never grants XP, charges for a pack or advances the rules.
The present result panels remain a useful complete/static fallback.

Keep the browser runtime dependency-free. CSS/Web Animations and a small audio
adapter are the first experiment. Native haptics are a later optional adapter in
the [mobile trial](MOBILE-RELEASE.md), tested on physical devices with an off
switch. They are never the only indication of a commitment, result or error.

The existing art-manifest/derivative sample remains useful independent work; a
first encounter can reuse current atlases without waiting for new layered art.
Record sources/licences or original creation notes for every new sound and image.
Use the content pipeline's proposed image/load budgets, add measured audio bytes
and decoded memory, and load only the current scene's optional ambience. Do not
preload six soundscapes or animate the entire collection.

## Comfort, recovery and playtest evidence

- Keep first-run audio off until the player enables it. Remember the preference;
  offer separate music/ambience and effect volume controls, a master mute, and a
  usable silent experience. Pause decorative audio/motion while hidden, and
  resume according to the player's setting without stacking loops.
- Respect system reduced motion and add an in-game control. Fast reveals and
  skip preserve every outcome, number and explanation. Avoid camera shake and
  flashing as default impact treatments; no hover-only card information or
  gesture-only actions.
- Reload, hide/resume, skip and interrupt each reveal/reward beat. An unfinished
  match must retain its match ID, participating UIDs, HP/pills and saved reveal.
  Successful final settlement currently clears the battle snapshot; after a
  reload, verify the saved profile/rewards and a usable return to the journey,
  without replaying combat or awarding again. Reopening that completed result
  would require a separately scoped, persisted presentation receipt. Missing
  media and cancelled animations render the available accepted state immediately.
- Use the existing engine and browser suites for regressions, then add focused
  presentation checks when code exists. Test hidden-bid boundaries, ties, Fury,
  recovery, early KO, draw, XP recipients and practice semantics. Compare results
  across presentation modes instead of testing only that a CSS class appeared.
- Coordinate physical iPhone/Android work with M5.1–M5.2: measure reveal duration,
  long frames, loaded/decoded assets and a sustained play session on named devices.
  Set the device performance gate from that baseline before expanding effects;
  browser phone emulation alone is not physical-device evidence.
- Observe a new player and a returning player. Can they explain why a round was
  won, tell committed pills from remaining pills, identify which copy gained XP,
  and reach the next encounter? Does the fourth reveal still feel good? Record
  friction and tune intensity/pacing before scaling content.

Open creative choices: how pronounced ambience should be, which single card gets
the first faction treatment, whether favourite-card display or richer guardian
writing follows first, and how much authored challenge content belongs in the
initial mobile game. The recommended starting point is the restrained world and
readable 霧隱渡口 reveal above.
