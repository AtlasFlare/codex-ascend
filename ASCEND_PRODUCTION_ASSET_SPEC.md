# Ascend Production Asset Specification

**Status:** artwork handoff contract — generation/import intentionally paused

**Pack:** Ascend only

**Reference viewport:** 3840 × 2160, 16:9, sRGB
**Production view:** illustrated 2.5D expedition mountain with semantic UI positioning

## Direction lock

The production renderer uses one physically coherent mountain as the persistent spatial model, not a mission diagram. Mission topology selects scenes, terrain anchors, and transitions invisibly. UI beacons may identify meaningful positions, but graph edges and the complete semantic network remain hidden.

Use the supplied references for their mountain dominance, scenic scale, atmospheric depth, generous sky, sparse glass UI, blue-white alpine palette, and restrained orange signal color. Do not copy baked route lines, dense map-pin fields, tourism controls, or large permanent side panels.

Every production frame must provide:

- one coherent physical mountain situation with foreground, playable terrain, midground, and background separation;
- environmental proof of the current state plus a restrained UI position beacon; a climber is optional and is not required for the first hero scene;
- a quiet HUD limited to location/state, progress, and the current action when required;
- no baked text, UI, icons, graph edges, route labels, or orange infographic paths.

## Master composition and delivery rules

| Property | Requirement |
| --- | --- |
| Working master | Layered PSD/PSB or equivalent at 4096 × 2304 minimum; preserve named layers and masks. |
| Runtime canvas | Crop/scale from a 3840 × 2160 reference viewport. Preserve composition at 2560 × 1440 and 1920 × 1080. |
| Narrow safe crop | Keep the climber, hazard, and route affordance inside x=24–76%; keep critical vertical content inside y=18–88%. |
| Color | sRGB IEC61966-2.1. Cool blue/cyan shadows, neutral snow, charcoal rock, restrained warm sunrise and signal-orange accents. |
| Lighting | Upper-left key light in every asset. Lower elevations may be softer; final approach and summit may use warmer rim light. |
| Alpha | Straight alpha. Transparent exports need 64 px clean bleed, no white/black matte fringe, and no opaque rectangular haze. |
| Camera | Three-quarter physical mountain view, 35–90 mm equivalent by scene. The first hero overview uses 70–90 mm. Avoid satellite, orthographic, side-on diagram, and tiny detached mountain cutouts. |
| Texture | Painterly realism with simplified readable shapes, subtle paper grain, and clean silhouettes. No photomontage seams or glossy stock-photo finish. |
| Continuity | Adjacent scene kits must share snow line, rock language, sun direction, atmospheric density, climber scale, and horizon logic. |
| Motion margin | Moving layers need at least 12.5% bleed beyond all viewport edges. Reveal layers need 20% extra bleed in the reveal direction. |
| Naming | `ascend__<slot>__<variant>__v###.<ext>`; lowercase ASCII, double-underscore separators. |

Runtime exports belong under `public/assets/ascend/production/<slot>/`. Source masters, generation provenance, rejected candidates, and prompt records stay outside the runtime bundle.

## Depth and parallax contract

| Band | Normalized depth | Parallax multiplier | Typical content |
| --- | ---: | ---: | --- |
| Far sky | 0.00–0.05 | 0.02 | sky plate, distant light, very high cloud |
| Background | 0.06–0.18 | 0.08–0.18 | far ridges, cloud bank, discovered ridge |
| Midground | 0.19–0.48 | 0.22–0.34 | hero slope, camp, route, hazard, crossing |
| Subject | 0.49–0.66 | 0.38 | climber and mission-critical physical prop |
| Foreground | 0.67–0.88 | 0.52 | cropped rock, snow lip, ice fragments |
| Atmosphere | variable | 0.12 or 0.62 | fog behind subject; snow/wind both behind and in front |

Renderer camera movement should stay within ±4% x, ±3% y, and 1.00–1.08 scale for ambient parallax. State transitions may pan up to 18% of frame width over 900–1400 ms. Reduced motion uses a 180–240 ms crossfade with no parallax.

## Exact production inventory

The following inventory is the minimum complete Alpine pack. Each variant is one reviewed export unless a frame count is stated.

### 1. Hero mountain and environment layers

| Slot | Variants / count | Export | Alpha | Anchor | Requirements |
| --- | --- | --- | --- | --- | --- |
| `environment.sky` | clear, overcast, storm — 3 | 4096 × 2304 WebP | No | 0.5, 0.5 | Quiet gradient and cloud texture; no terrain or sun baked through terrain silhouettes. |
| `environment.far_ridges` | lower, mid, upper, summit — 4 | 4096 × 2304 WebP | Yes | 0.5, 1.0 | One cool, low-contrast ridge system per elevation; full side bleed. |
| `environment.hero_slope` | lower, mid, upper, final, summit — 5 | 4096 × 2304 WebP | Yes | 0.5, 1.0 | Dominant playable landform; route-readable ledges without a painted route line. |

Hero slope variants are sequential camera neighborhoods, not five views of an entire mountain. Adjacent variants must share at least one recognizable geological motif for continuity.

### 2. Foreground, midground, and background elements

| Slot | Variants / count | Export | Alpha | Anchor | Requirements |
| --- | --- | --- | --- | --- | --- |
| `environment.foreground_mask` | rock, snow, ice — 3 | 4096 × 1536 WebP | Yes | 0.5, 1.0 | Cropped framing elements; keep center 42% open for subject/action. |
| `environment.midground_terrain` | ledge, slope, ice wall, ridge — 4 | 3072 × 1728 WebP | Yes | 0.5, 1.0 | Interchangeable physical stage for camps and hazards; matched horizon and light. |
| Background cloud bank | low wisp, valley bank, ridge veil — 3 | 4096 × 1536 WebP | Yes | 0.5, 0.65 | Soft depth separator, not an opaque fog wall. |

Foreground assets must tolerate 1.08× scale and 5% horizontal translation without exposing an edge. Midground elements must reserve a 900 × 1000 px subject zone around the climber anchor.

### 3. Climber character

| Slot | Actions | Export | Frames | Anchor |
| --- | --- | --- | ---: | --- |
| `climber.actions` | idle, hike, climb, inspect, wait, rest, celebrate | 4096 × 4096 PNG spritesheet per action | 8 each, 56 total | 0.5, 0.88 |

Use one consistent climber: orange-red technical jacket, dark charcoal trousers, blue-gray pack, helmet, crampons when appropriate, no visible brand. Pose faces uphill/right at a three-quarter rear angle. Frame cells are 1024 × 1024 in a 4 × 4 sheet; only the first 8 cells are populated and recorded in metadata. Keep feet/primary contact point fixed to within 12 px across frames. Idle loops at 8 fps; travel actions at 10 fps; celebration plays once at 10 fps then holds. Deliver a JSON frame map and a single 2048 × 2048 turnaround/reference sheet.

### 4. Basecamp

| Slot | Variants / count | Export | Alpha | Anchor |
| --- | --- | --- | --- | --- |
| `scene.basecamp` | arrival, active, night — 3 | 3072 × 1728 WebP | Yes | 0.5, 1.0 |

Show a sheltered snow/rock platform, two or three tents, radio/weather station, supply cache, guy lines, and one warm operational light. Arrival is quiet, active adds visible equipment/readiness, night uses the same silhouette and matched contact shadows. No flags with text.

### 5. Camps

| Slot | Variants / count | Export | Alpha | Anchor |
| --- | --- | --- | --- | --- |
| `scene.camp` | unsecured, secured, resting × lower, mid, upper — 9 | 3072 × 1728 WebP | Yes | 0.5, 1.0 |

Each elevation tier is a matched triplet. Unsecured lacks fixed anchors and shelter readiness; secured adds rope anchors, packed snow platform, and a stable tent; resting adds one restrained warm light and the climber rest staging. State must remain readable without a badge.

### 6. Normal route

| Slot | Variants / count | Export | Alpha | Anchor |
| --- | --- | --- | --- | --- |
| `scene.normal_route` | trail, snow track, fixed rope — 3 | 3072 × 1728 WebP | Yes | 0.5, 1.0 |

Depict physical travel affordances only: boot-compressed path, snow traverse, or rope line attached to rock/ice. No glowing line, waypoint dot, arrow, label, or full route overview. Leave at least 20% traversable negative space ahead of the climber.

### 7. Fog

| Slot | Variants / count | Export | Alpha | Blend | Requirements |
| --- | --- | --- | --- | --- | --- |
| `effect.fog` | wisps, bank, whiteout, reveal — 4 looping atlases | 2048 × 2048 PNG | Yes | Screen | 4 × 4 cells, 16 frames, seamless 6 s loop; reveal must support reverse playback. |

Fog should obscure topology naturally, preserve some depth at the subject plane, and never be a row of circles. Whiteout may reduce contrast but cannot conceal the current action affordance below WCAG-required HUD contrast.

### 8. Crevasse / blocker

| Slot | Variants / count | Export | Alpha | Anchor |
| --- | --- | --- | --- | --- |
| `scene.crevasse` | approach, open, blocked — 3 matched plates | 3072 × 1728 WebP | Yes | 0.5, 1.0 |

Use the same crevasse silhouette and camera across all three. Approach hints at fractured snow; open exposes blue ice depth; blocked adds unstable lip or storm-loaded snow. The safe and unsafe sides must be visually unambiguous without symbols.

### 9. Route fork

| Slot | Variants / count | Export | Alpha | Anchor |
| --- | --- | --- | --- | --- |
| `scene.route_fork` | decision, left-safe focus, right-risky focus — 3 matched plates | 3072 × 1728 WebP | Yes | 0.5, 1.0 |

Compose two physical traverses diverging around a rock/ice feature. Both exits remain inside the central 76% safe crop. Focus states alter atmosphere/light emphasis only; they do not paint UI selection onto terrain. Decision copy and buttons remain DOM UI.

### 10. Secured crossing

| Slot | Variants / count | Export | Alpha | Anchor |
| --- | --- | --- | --- | --- |
| `scene.secured_crossing` | rope, ladder, bridge — 3 | 3072 × 1728 WebP | Yes | 0.5, 1.0 |

Each variant must align to the open-crevasse geometry. Show believable anchors and load path. The crossing must look newly usable, not magically erased. Supply separate contact-shadow/multiply masks for hardware and climber feet.

### 11. Newly discovered ridge

| Slot | Variants / count | Export | Alpha | Anchor |
| --- | --- | --- | --- | --- |
| `scene.new_ridge` | concealed, emerging, revealed — 3 matched plates | 4096 × 2304 WebP | Yes | 0.5, 1.0 |

The ridge is a real background landform revealed by lateral fog movement. Concealed may retain a faint silhouette; emerging exposes one navigation landmark; revealed establishes a usable continuation. No drawn branch line.

### 12. Final approach

| Slot | Variants / count | Export | Alpha | Anchor |
| --- | --- | --- | --- | --- |
| `scene.final_approach` | clear, wind, whiteout — 3 | 4096 × 2304 WebP | Yes | 0.5, 1.0 |

Use a steep, close ridge or snow arête with the summit mostly outside or near the upper frame edge. The scene should communicate remaining effort; it must not celebrate completion early.

### 13. Summit

| Slot | Variants / count | Export | Alpha | Anchor |
| --- | --- | --- | --- | --- |
| `scene.summit` | dormant, verified, celebration — 3 matched plates | 4096 × 2304 WebP | Yes | 0.5, 1.0 |

Dormant shows an unreached cornice/crest. Verified establishes safe footing and a clear horizon. Celebration adds warm light, visible flag/fabric motion, and room for the climber pose; no confetti, trophy, text, or game badge.

### 14. Weather and particle overlays

| Slot | Variants / count | Export | Alpha | Blend |
| --- | --- | --- | --- | --- |
| `effect.weather` | snow-near, snow-far, wind-spindrift, ice flecks, sun rays — 5 atlases | 2048 × 2048 PNG | Yes | Screen |

Each atlas is 4 × 4 with 16 frames and a seamless 4–8 s loop. Near snow crosses in front of the climber; far snow remains behind. Spindrift direction is left-to-right to match the lighting/composition lock. Deliver intensity metadata for calm, moderate, and severe playback densities rather than separate baked composites.

### 15. Scenario-card frame and layout

Scenario cards are DOM/CSS frames with generated art inserts; do not rasterize type, controls, borders, or status chips into artwork.

| Slot | Variants / count | Export | Requirements |
| --- | --- | --- | --- |
| `ui.scenario_card_art` | camp, blocker, decision, discovery, summit — 5 | 1600 × 960 WebP | One strong environmental silhouette, no text/UI, focal subject in right 58%, quiet left 32% text-safe region. |

Card frame at desktop is 480 × 288 px, 24 px radius, 1 px translucent white border, 24 px internal padding, and a 44 px minimum action row. At narrow width it becomes full-width with a 16:9 art crop above copy. Text is at most: 18 px eyebrow/state, 28 px title over two lines, 15 px summary over three lines, and one primary plus one secondary action. Signal orange is reserved for the selected/primary action and critical physical detail.

## Scene assembly recipes

| Semantic scene | Required layer stack | Transition |
| --- | --- | --- |
| Basecamp | sky → lower ridges → lower hero slope → basecamp → climber → foreground → light weather | 600 ms crossfade |
| Normal route | sky → elevation ridge → hero slope → route affordance → climber → foreground → weather | 900 ms camera track |
| Camp | normal route stack + matched camp state | 600 ms crossfade |
| Fog / uncertainty | terrain stack → fog bank behind subject → climber → near wisps | 900–1400 ms fog reveal |
| Crevasse blocker | terrain → matched crevasse plate → inspecting climber → foreground | 250 ms cut or 400 ms crossfade |
| Route fork | terrain → fork plate → waiting climber → restrained decision HUD | 900 ms camera widen |
| Secured crossing | same blocker camera → aligned hardware/crossing → climber | 650 ms matched crossfade |
| New ridge | terrain → concealed ridge → lateral fog → revealed ridge | 1200 ms ridge reveal |
| Final approach | upper/final slope → climber → wind/spindrift → foreground | 1000 ms upward pan |
| Summit | summit plate → climber → restrained weather/light | 1400 ms fog clear, then hold |

`selectExpeditionScene()` owns this semantic-to-physical choice. The production renderer receives the selected scene, camera preset, transition, and HUD mode; it never reads graph edges or mountain-specific words from the Mission Engine.

## Generation brief template

Use one locked style seed/reference set for the whole pack. Replace bracketed fields only:

> Close-camera illustrated alpine expedition scene, painterly realism, human-height three-quarter camera, [SCENE AND ELEVATION], [PHYSICAL STATE], foreground [ELEMENT], midground [ACTION], background [RIDGE/WEATHER], upper-left cold daylight, blue-cyan atmospheric shadows, neutral snow, charcoal rock, restrained warm orange on climber/equipment, strong readable silhouettes, layered 2.5D composition, generous depth haze, operational and credible, no text or interface.

Negative direction: full mountain overview, infographic, graph, flowchart, map pins, glowing route, waypoint dots, labels, typography, logos, fantasy architecture, sci-fi, ocean, tropical vegetation, crowds, aerial camera, orthographic camera, stock-photo gloss, opaque fog rectangle.

## Acceptance checklist

Artwork is ready to enter the manifest only when all of these pass:

- exact dimensions, naming, format, sRGB, and straight-alpha requirements;
- clean edges at 200% over white, black, and alpine-blue backgrounds;
- matched silhouettes for blocker/resolution and concealed/revealed state pairs;
- critical action readable at 25% scale and without HUD copy;
- no baked UI, text, graph markers, full route line, or complete-mountain infographic;
- desktop, 16:10, and 390 × 844 crop checks preserve the subject and action;
- all parallax layers survive their motion margin with no exposed edge;
- visual continuity holds across basecamp → route → camp → final → summit;
- reduced-motion still frame communicates the same state;
- each file has generation provenance, prompt, seed/reference identifiers, and human review status.

Manifest files are keyed as `<slot>.<variant>` (for example `scene.summit.celebration`). Until every required slot variant has a reviewed file, `assertProductionAssetsReady()` must reject the production renderer mount. The diagnostic Mission Map remains available for semantic review but does not satisfy any production asset slot.
