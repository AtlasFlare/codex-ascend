# Three-Minute Demo Script

For recording preflight, exact timing, and recovery steps, use [CONTEST_DEMO_RUNBOOK.md](CONTEST_DEMO_RUNBOOK.md).

## 0:00–0:25 — Basecamp and survey

1. Show: “Ship Codex Ascend to production.”
2. Basecamp is quiet; most terrain is unknown.
3. Agent calls `discover_mission` (or advance deterministic event 1).
4. Five checkpoints and the initial route emerge.

Narration: “The mountain is a spatial mission graph. It only changes when mission truth changes.”

## 0:25–0:55 — Evidence-backed ascent

5. Foundation evidence attaches and Camp I is secured.
6. Implementation evidence attaches and Camp II is secured.
7. The climber enters validation.

Narration: “Camps are not task completions. They are evidence-backed stable states.”

## 0:55–1:35 — Blocker and human route choice

8. Agent reports failing session-persistence tests through `report_obstacle`.
9. A crevasse opens and the climber stops.
10. Agent proposes repair and bypass routes, then calls `request_human_decision`.
11. Select the Camp III waypoint. Its scenario card presents both routes with effort, risk, and the agent recommendation.
12. The human clicks **Repair persistence** directly inside the scenario card.

Narration: “The agent changes mission semantics, not game objects. The human responds through the world.”

## 1:35–2:05 — Agent observes and reopens

13. Agent calls `inspect_human_decision`; show `selectedOptionId: repair`.
14. Agent repairs the session layer and calls `resolve_obstacle`.
15. Crevasse clears, repaired route is secured, and the climber continues.

## 2:05–2:30 — Dynamic scope

16. Passing test evidence secures Camp III.
17. A required security review is discovered through `expand_scope`.
18. Security Ridge appears and lifts the understood summit path.
19. Human approval evidence anchors the ridge.

## 2:30–2:55 — Verified summit

20. Live release evidence attaches at the final approach.
21. `verify_completion` checks every required criterion and dependency.
22. `complete_mission` moves the climber to the flag.

Close: “The mountain isn’t a progress bar. It is the mission itself—reshaped by what the human and agent discover together.”

## Presentation controls

- Use `?present=1` to hide Demo lab.
- Use `?review=scenario-cards` for the deterministic Camp III normal, persistence-blocker, and route-decision visual checkpoints.
- Reset before recording.
- The critical fork intentionally pauses for a real human click.
- Keep the native WebMCP inspector visible only for the brief decision/result proof.
