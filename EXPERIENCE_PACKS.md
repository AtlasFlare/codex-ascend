# Experience Pack Boundary

`MissionState` is presentation-neutral. It stores a mission graph, stages, paths, progress, obstacles, decisions, evidence, and an append-oriented event stream. It does not store altitude, terrain, camps, weather, a climber, or visual archetypes.

An `ExperiencePack` turns that neutral state into a themed projection:

```text
MissionState + persisted pack state
              ↓
       ExperiencePack.project
              ↓
 projection + narrator output + production-scene selection
              ↓
          pack-specific renderer/UI
```

The contract covers:

- pack identity and version;
- creation and validation of serializable pack state;
- deterministic mission projection;
- semantic-to-physical-scene selection;
- generalized narrator input and output;
- pack-owned scenario-card art prompts;
- optional legacy-session migration.

## Implemented pack

Ascend is the only implemented and registered pack. Its directory owns mountain topology, altitude derivation, fog, ridges, camps, crevasses, the diagnostic-map climber controller, mountain-overview scene selection, authored waypoint projection, the optional Mission Map grammar, Ascend narration, and art prompt composition.

The shared `ProjectHandoff` and `ExperienceGenerationRequest` contracts remain presentation-neutral. Each future pack must translate the same handoff into its own imagery and placement anchors without changing mission truth.

The production projection exposes a physical scene such as `route_fork` or `secured_crossing`; graph topology stays available for the optional diagnostic Mission Map but is never drawn by the production renderer.

No placeholder implementation, assets, vocabulary, or conditional rendering exists for another theme. A future pack can implement the same contract and add itself to the registry without changing the mission engine or semantic WebMCP command surface.

## Persistence

The version-3 browser session envelope stores `mission` separately from `{ packId, packVersion, state }`, plus the neutral handoff and prepared generation request. Loading resolves the pack through the registry and asks that pack to validate its own state; version-2 sessions migrate forward on read. The active runtime has one registry entry: `ascend`.
