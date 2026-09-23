# 青玉行旅棋 · map navigation prototype

Local interaction study, 2026-09-23. The owner proposed moving around the map
like a carved chess piece, with professional studio artwork and mockups later.
This first version uses a hand-authored CSS/SVG jade disc engraved with **旅**.
It is a replaceable placeholder, not a finished art direction or a new game rule.

## Try the interaction

Open **遊歷 → 輿圖** and select another unlocked location. The piece follows the
authored route through each intervening node, lifting and settling with a small
contact shadow. The existing opt-in effects setting also enables a quiet landing
tone. Adjacent steps take at most 285 ms; an uninterrupted long route takes about
1.1 seconds. There is no idle bobbing or forced camera movement.

The map stays visible on arrival. Press the resting piece again, or **查看此境**,
to open the chapter; the existing preparation and explicit Start remain the
battle entry. Locked nodes open their preview without moving the piece. **路程**
provides a paged chapter list; **行卷** switches maps. The same interaction applies
to the original maps and the six campaign continuation volumes.

Rapid input replaces the current destination. Reversing mid-edge first returns
to the junction, so the piece never cuts diagonally across a bend. Each map
remembers its last requested unlocked destination for the current page session.
Leaving the view cancels its animation; returning shows that intended position.
Reload starts from the existing journey/location state. **最近入境** still means
the saved encounter location, independently of this browsing cursor.

## Comfort and state boundaries

- Original map buttons retain native keyboard activation and 44 px hit areas.
  The decorative 42 px piece cannot intercept input. Route-list selection moves
  focus to the destination pin; world selection focuses the map tab.
- Reduced motion, including a preference changed during movement, lands
  immediately. Opening a dialog, hiding the map or resizing also finishes the
  presentation. No callback from a discarded view can reopen it.
- Map navigation reads unlocks but changes no profile, battle snapshot, currency,
  reward or game RNG. There is no stamina cost, dice roll or new progression gate.
- `map-piece.mjs` owns route/cursor presentation; `map-piece.css` owns placeholder
  material and motion styling. `adventure-ui.mjs` supplies the map/modules and
  `app.mjs` owns transient intent and controller lifetime. No runtime dependency
  or raster asset was added.

## Studio handoff and next studies

The prototype establishes timing, scale, route anchors and interruption behavior.
Capture desktop, portrait and short-landscape mockups before choosing final art.

| Deliverable | Direction and constraint |
| --- | --- |
| Piece silhouette | Compare a carved jade seal/disc with a small carved pilgrim figurine. It must read at roughly 42 px without covering neighboring targets. |
| Material study | Restrained jade translucency, incised marks and a visible bevel; keep the silhouette distinct over both pale mist and dark terrain. |
| Motion poses | Rest, lift and landing with a consistent contact point. Supply a separate soft contact shadow and a transparent background. Motion must remain interruptible. |
| Map mockups | Preserve data-driven node centers, readable chapter selection, a quiet route and space for a 44 px control. Portrait and landscape are distinct compositions. |
| Export contract | Confirm dimensions, anchor, safe margins, formats and asset budget after the mockup review; include a static reduced-motion pose. |

Later candidates, not implemented: character-shaped collectible pieces, regional
landing sounds, terrain-specific footsteps, gentle optional camera follow and
native haptics. Piece appearances should stay cosmetic; reward/unlock rules need
their own explicit design before implementation. Physical phone playtesting and
professional artwork remain open; no studio was contacted or commissioned.

## Reproduce checks

With the loopback server running, use `npm test`, `npm run test:map-piece` and
`npm run build`. The browser suite uses isolated synthetic saves in Chromium and
WebKit, covers six viewport sizes, input interruption, focus, locked previews,
map alignment and profile/battle/RNG conservation. See [VALIDATION.md](VALIDATION.md)
for actual completed checks. No deployment accompanies this prototype.
