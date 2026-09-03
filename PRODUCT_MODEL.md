# Product Model

## Core thesis

Codex Ascend answers one question: **What actually stands between us and completing this mission?**

One mission represents one objective. The logical mission is a graph, not a checklist. An Experience Pack may spatialize that graph so a human can interpret progress, uncertainty, dependencies, risk, strategy, and evidence at a glance. Ascend is the first and only implemented pack.

## Authority boundary

`MissionState` is authoritative. Visual state is a disposable projection.

```text
semantic command → validated transition → mission event → Experience Pack projection → physical scene selection → visual
```

No renderer callback can directly mark work complete, create evidence, resolve a blocker, or verify completion. UI controls call the same mission commands as WebMCP tools.

## Primary entities

- **Mission:** objective, required success criteria, status, seed, confidence, discovery, active stage/path, and progress estimate.
- **Stage:** meaningful verified outcome with dependencies, evidence, risk, confidence, order, effort weight, and status.
- **Path:** directed graph edge representing a real strategy between stages. Paths branch, converge, block, reopen, abandon, or invalidate.
- **Obstacle:** structured execution problem with category, severity, source, blocked entities, and resolution state.
- **HumanDecision:** explicit question, contextual options, recommendation, selected option, and timestamps. The agent cannot silently make the human’s choice.
- **Evidence:** typed proof tied to a stage or mission success criterion.
- **MissionEvent:** append-oriented audit record from which the journal is derived.

## Invariants

- A stage cannot begin before dependencies are complete.
- A blocking or critical obstacle prevents unsafe stage progress.
- A stage with declared success criteria cannot complete without evidence.
- A human decision must offer at least two unique options.
- Path selection must reference a real available path.
- Resolved hazards reopen only the entities they blocked.
- Human and agent actions may arrive in either order without leaving false blocker state.
- Required mission criteria must each have evidence.
- Completion dependencies must be complete and no critical obstacle may remain.
- `complete_mission` is invalid until `verify_completion` succeeds.

## Altitude and confidence

Altitude is Ascend presentation, never mission truth. The Ascend pack derives it from neutral stage order and its own altitude range. Scope discovery can therefore add a higher ridge without teaching the Mission Engine about mountains. Confidence and discovery percentage communicate uncertainty; they are not presented as scientific precision.

## Persistence

The current adapter stores a versioned one-mission session in `localStorage`. Mission truth is separate from the pack identity, version, and validated pack state. It preserves path choices, event history, obstacles, evidence, demo position, and seed across reloads. The domain engine does not depend on this adapter and can later sit behind a Worker/Durable Object without changing renderer authority.
