# Mountain Topology

The topology engine converts the directed mission graph into stable normalized scene coordinates. It is deterministic for the same mission state and immutable seed.

## Inputs

- checkpoint graph and dependencies;
- route branches and statuses;
- logical checkpoint altitude;
- expedition seed;
- surveyed percentage;
- hidden/invalidated state;
- selected and blocked routes.

## Projection

1. Checkpoints are ordered by logical altitude and stable id.
2. Altitude maps to vertical progression between basecamp and summit.
3. The main line drifts horizontally as elevation increases.
4. Sibling routes receive symmetric branch offsets.
5. Seeded noise adds small deterministic variation without changing graph meaning.
6. Route control points use a separate seeded bend.
7. Hidden checkpoints and unknown routes remain in the logical topology but project as fog/unsurveyed terrain.
8. `fingerprint` serializes rounded node coordinates and route visibility/blocking state for persistence tests.

## Non-authority

Topology never writes to mission state. A crevasse cannot block a route; a blocked route causes the topology/scene pipeline to draw a crevasse. Selection hotspots return entity ids to the UI, which then invokes a domain command.

## Current limitations

- Layout uses altitude plus branch offsets rather than a full graph-drawing solver.
- Multiple dense convergence zones will need label collision and ridge packing.
- Terrain silhouette is a graybox alpine profile rather than generated topology geometry.
