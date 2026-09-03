# Camp II / Active Ascent — Hero Scene Art Brief

**Direction:** iconic illustrated mountain overview with semantic UI positioning

**Semantic scene:** `normal_route`

**HUD mode:** `minimal`

**Reference viewport:** 3840 × 2160, 16:9, sRGB

This direction supersedes the close-camera/climber composition for the first hero scene. The mountain is the persistent spatial model. A small number of accessible UI beacons communicate secured camps, current position, and uncertain terrain without drawing the mission graph.

## 1. Camera framing and composition

- Show one coherent, broad pyramidal mountain from lower approach through summit using an elevated three-quarter view, approximately 70–90 mm equivalent rather than aerial/orthographic projection.
- Mountain terrain occupies 65–74% of the viewport. Its lower and side silhouette dissolves into a dense blue-white cloud cutoff instead of touching every edge.
- Main summit sits near x=55%, y=14%; Camp II sits near x=55%, y=57%. Lower secured positions descend toward the lower-left.
- Use a few large illustrated rock/snow planes, restrained ledges, and cloud banks to create physical depth. Avoid a jagged, multi-spire, granular-photoreal skyline.
- Reserve small quiet zones across the top and lower-left for HUD. At least 75% of the mountain remains unobstructed.
- Preserve the main mountain, active beacon, and Camp II in centered 16:10 and 390 × 844 crops.

## 2. Spatial bands

| Band | Content |
| --- | --- |
| Foreground | Dark snow-crusted rock shoulders entering the lower corners; these crop the mountain and provide strong parallax. |
| Playable mountain | The large central mountain mass with physically plausible ledges for Basecamp/Camp I/Camp II/Camp III and terrain-aligned snow travel. |
| Midground | Secondary buttresses and ridges that overlap the playable mountain and allow routes/markers to disappear behind terrain. |
| Background | Cool low-contrast mountain chain and atmospheric sky; never compete with the active mountain. |
| Atmosphere | Cloud bank around lower/middle slopes, summit veil, thin fog wisps, and sparse snow. Atmosphere reveals uncertainty without becoming an opaque mask. |
| UI plane | Accessible position beacons and compact frosted-glass HUD rendered independently from the artwork. No UI is baked into mountain assets. |

## 3. Position representation

No climber or human figure is required.

- Current position: one signal-orange beacon at Camp II, 42–48 px on a 1920 × 1080 viewport, anchored to the physical ledge rather than floating over empty snow.
- Earlier secured camps: at most two muted white/cyan beacons at 30–36 px, lower visual contrast than the active marker.
- Future/unknown position: at most one low-opacity beacon partially veiled by fog.
- The active marker may pulse once when state changes, then settle. It must not pulse continuously.
- Beacons use consistent iconography and compact white/frosted waypoint labels on focus/selection. Persistent labels are limited to the active location; labels show the stage name and altitude.
- No edge or line connects markers. Their relationship is conveyed by physical elevation, mountain geography, and event transitions.

## 4. Route integration

The route is primarily environmental:

- compressed snow track, exposed ledge, rope anchors, and terrain wear;
- intermittent visibility where terrain permits, disappearing behind ridges and fog;
- optional low-contrast contour emphasis local to the active segment only.

Do not use a thick orange stroke, dotted polyline, neon path, arrows, or a continuous base-to-summit route. UI beacons denote progress; the terrain suggests traversal.

## 5. Camp II in-world treatment

- One tiny orange expedition tent and one neutral equipment shelter on a credible mid-mountain ledge.
- Include packed snow, two supply cases, coiled rope, and a slim weather/radio mast.
- Structures occupy approximately 1.5–2.5% of the viewport. The orange beacon provides legibility without making the camp physically oversized.
- All objects require contact shadows, snow compression, and partial burial. No label, flag text, glow, crowd, or tourism props are baked into the art.

## 6. Upper mountain and summit visibility

- The upper mountain is clearly present so the user understands the expedition's remaining scale.
- Keep the summit partially veiled: obscure roughly 30–45% with cloud and light atmospheric haze.
- Summit contrast is lower than Camp II and the active ledge. It has no orange glow or completion beacon during active ascent.
- The mountain may continue beyond a ridge overlap, but the summit should remain locatable as a long-term destination.

## 7. Independent motion and parallax

| Element | Behavior |
| --- | --- |
| Sky | 0.02 parallax; nearly static. |
| Far ridges | 0.08 parallax. |
| Summit veil / fog | 0.12 parallax plus slow lateral drift. |
| Hero mountain | 0.22 parallax; stable visual anchor. |
| Midground buttresses | 0.30 parallax. |
| Camp II physical layer | 0.32 parallax; optional subtle fabric movement only. |
| Foreground rock | 0.52 parallax. |
| Far / near snow | Separate behind/in-front passes at low density. |
| UI beacons | Screen-space overlays projected from authored terrain anchors; no parallax lag relative to their anchor. |

Camera movement stays within ±3% x, ±2% y, and 1.00–1.06 scale. Reduced motion uses static atmosphere and a 180–240 ms crossfade.

## 8–9. Minimum exact production assets

Nine runtime art assets establish this first scene. UI markers, labels, borders, and HUD are code-native and are not supplied as raster art.

| Layer | Manifest key / delivery filename | Dimensions | Alpha | Anchor | Order |
| ---: | --- | ---: | --- | --- | ---: |
| 1 | `environment.sky.clear` / `ascend__environment-sky__clear__v001.webp` | 4096 × 2304 | No | 0.5, 0.5 | 1 |
| 2 | `environment.far_ridges.mid` / `ascend__environment-far-ridges__mid__v001.webp` | 4096 × 2304 | Yes | 0.5, 1.0 | 2 |
| 3 | `effect.fog.wisps` / `ascend__effect-fog__wisps__v001.png` | 2048 × 2048 atlas | Yes | 0.5, 0.5 | 3 |
| 4 | `environment.hero_slope.mid` / `ascend__environment-hero-slope__mid__v001.webp` | 4096 × 2304 | Yes | 0.5, 1.0 | 4 |
| 5 | `environment.midground_terrain.ridge` / `ascend__environment-midground-terrain__ridge__v001.webp` | 3072 × 1728 | Yes | 0.5, 1.0 | 5 |
| 6 | `scene.normal_route.snow_track` / `ascend__scene-normal-route__snow-track__v001.webp` | 3072 × 1728 | Yes | 0.5, 1.0 | 6 |
| 7 | `scene.camp.secured` / `ascend__scene-camp__secured__v001.webp` | 3072 × 1728 | Yes | 0.5, 1.0 | 7 |
| 8 | `environment.foreground_mask.rock` / `ascend__environment-foreground-mask__rock__v001.webp` | 4096 × 1536 | Yes | 0.5, 1.0 | 8 |
| 9 | `effect.weather.snow_far` / `ascend__effect-weather__snow-far__v001.png` | 2048 × 2048 atlas | Yes | 0.5, 0.5 | 9 |

Integration also requires:

- `ascend__camp-ii-mountain-overview__layout__v001.json`: layer transforms, terrain anchor positions, safe crops, z-order, blend modes, and motion limits;
- a layered 4096 × 2304 source master;
- a flattened 3840 × 2160 reference composite.

## 10. Reference guidance

### Preserve

- dominant, broadly visible mountain composition;
- readable geological planes and physical elevation hierarchy;
- airy blue-white or sophisticated blue-gray atmosphere;
- sparse rounded glass UI with generous transparency;
- restrained signal color for the active state;
- the sense that the mountain itself is an explorable product surface.

### Do not copy

- tourism booking, pricing, social controls, profiles, thumbnails, or destination cards;
- thick orange route traces, dotted map lines, pin forests, or persistent labels on every point;
- oversized side panels that cover the mountain;
- monochrome-only treatment, copied logos, copied typography, or exact referenced layouts;
- contour-map graphics as the main scene—the physical mountain remains primary.

## 11. Renderer changes when real art arrives

1. Implement the existing adapter as a layered compositor with responsive art crops, texture lifecycle, atmosphere, and reduced-motion behavior.
2. Add scene-scoped readiness so the first nine assets can mount without marking the entire Ascend pack complete.
3. Extend `ExpeditionRendererFrame` with an Ascend-owned marker projection: `entityId`, status, normalized authored terrain anchor, label, and selected state. Do not expose or render graph edges.
4. Resolve semantic stages to authored art anchors inside the Ascend Experience Pack. Mission Engine and frozen topology remain unchanged.
5. Support code-native accessible beacons/HUD aligned to the rendered mountain. Keep an equivalent DOM semantic mirror for keyboard and assistive technology.
6. Add per-variant parallax/blend overrides and a typed scene-layout recipe.
7. Local art-foundry concepts remain outside the distributable repository and are visual direction only, never compositable production layers.

No frozen topology change is required.
