# Art Pipeline

## Review boundary

The active Camp II review plate uses an iconic illustrated massif, simplified planar surfaces, and a clouded silhouette cutoff. It is mounted only to validate the live transparent HUD and waypoint language. It is not a compositable production layer and does not satisfy the production manifest. The Pixi geometry remains the optional diagnostic Mission Map, not a production fallback.

## Asset contract

Every production asset slot records:

- semantic id rather than domain string matching;
- PNG, WebP, or spritesheet format;
- normalized anchor;
- source dimensions, depth band, and parallax multiplier;
- transparency;
- exact required variants and blend mode.

Mission and scene-grammar code must never reference concrete filenames.

## Runtime generation boundary

An MCP-delivered project handoff prepares a provider-neutral generation request through the active Experience Pack. Ascend owns the alpine prompt translation; the Mission Engine and MCP handoff schema remain presentation-neutral. A Cloudflare Workflow performs generation server-side, stores request/metadata/image objects in R2, and returns only public application asset URLs. Provider credentials never enter the browser bundle.

The accepted generation world contains the native-4K canonical master
`gen_029ca28ab431b3125275dd4339734d7f`. Earlier candidates and the former Camp
II derivative were deliberately invalidated or rejected and are not part of
the public repository. Scenario-card and semantic weather imagery is deployed
as reviewed authored presentation art; it does not impersonate an accepted
generation-world revision.

The live review origin is release-channel configuration and is intentionally kept out of source control.

## High-resolution master and derived card boundary

The production runtime gate requires at least 3840 × 2160 for a directly generated master; externally finished layered sources may continue to use the 4096 × 2304 art-foundry contract. Native-4K master `gen_029ca28ab431b3125275dd4339734d7f` was generated at 3840 × 2160 with prompt version `ascend-world-v4`, explicitly approved, and accepted as the active canonical world. The prior Camp II derivative was invalidated when the canonical changed.

Waypoint scenario cards are spatial derivatives of the accepted canonical master, not independent alpine illustrations. Each card brief stores the canonical generation id, source URL and dimensions, focal mission entity, normalized waypoint coordinate, and a clamped 34% × 34% geography crop. The live review card previews that exact master crop. A later generated card must preserve the same ridge direction, ledge, lighting, palette, and weather while reframing only that local geography. Camp cards must fit tents and equipment to the ledge that already exists in the master.

Exact 1600 × 960 API request files for Camp III normal, persistence blocker, and route decision are in `artifacts/generation/scenario-cards/` and are bound to the accepted canonical generation. During the switch away from API testing, two parallel submissions had already started: the normal and blocker candidates reached `ready` but remain unaccepted and unused. The decision API job was never created. No further API card request should run during the testing phase. Any future canonical replacement will invalidate derived candidates.

Equivalent semantic candidates were generated through the built-in Codex image workflow rather than the project API. They are stored under `public/art/ascend/`, normalized for the renderer, and used by the deterministic contest journey. The `?review=scenario-cards` harness jumps directly to the three critical Camp III states for visual review. Their provenance and prompt set are recorded in `artifacts/generation/scenario-cards/SUBSCRIPTION_REVIEW_MANIFEST.md`. They do not change the accepted Cloudflare generation world.

The renderer now supports eased camera focus toward the active or selected waypoint, small pointer/idle parallax, independently drifting base-cloud bands, and a masked tilt-shift depth treatment. Reduced-motion preference removes autonomous movement and accelerates camera settling.

## Recommended production foundry

Generate a coherent reusable alpine expedition kit, then curate and normalize it. Runtime generation may propose candidate art, but reviewed manifest files remain the production source of truth.

1. Lock a style board and palette.
2. Produce isolated transparent assets by semantic category.
3. Normalize anchors, scale, lighting direction, and atmospheric perspective.
4. Populate a single reviewed `AscendProductionAssetManifest`.
5. Test every blocker/fork/fog/ridge/summit state at desktop and narrow widths.
6. Keep the geometric Mission Map as a separate diagnostic view only.

The exact generation and delivery contract is [ASCEND_PRODUCTION_ASSET_SPEC.md](ASCEND_PRODUCTION_ASSET_SPEC.md). Graybox evidence remains in [VISUAL_HANDOFF.md](VISUAL_HANDOFF.md).
