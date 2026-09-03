# Codex Ascend — Final Recording and Edit Plan

**Measured narration:** 2:05.25

**Final V5 cut:** 2:05.27

**Capture:** 1440 × 900 clean app viewport composited into a 1920 × 1080 master

**Format:** clean deployed captures, short cinematic chapter cards, no browser chrome, setup, typing, loading, or dead air

## Recording setup

- Start logged in with the live URL open and the native WebMCP connection verified.
- Capture clean app audio separately; narration is already a synchronized WAV master.
- Record each clip with two seconds of extra motion at its start and end for editing handles.
- Use deliberate cursor motion. Hide the cursor during scenic holds when practical.
- Use the real agent/tool surface for `inspect_mission`, `report_obstacle`, `request_human_decision`, `inspect_human_decision`, and `verify_completion`.
- Keep the diagnostic Mission Map closed. Keep the app’s visual world, scenario cards, and relevant tool result in frame.

| Master time | Clip | Live action | On-screen text | WebMCP proof | Edit treatment |
| --- | --- | --- | --- | --- | --- |
| 0:00–0:17 | A — World reacts | Open on the real Camp III obstacle call, storm, moving cloud, fractured route, and blocker card. | **THE MOUNTAIN REACTS** | `report_obstacle → BLOCKED` | Hard open with slow camera drift. |
| 0:17–0:40 | B — Basecamp route | Rewind to Basecamp, then show `inspect_mission` and `discover_mission` revealing the route. | **ONE GOAL BECOMES A ROUTE** | Both live calls remain readable in the activity rail. | Fog flash into a bright wide mountain. |
| 0:40–1:00 | C — Native tools | Advance through the real journey while the camp card and live activity rail share the frame. | **18 TYPED TOOLS. ONE SHARED STATE.** | Shared revisions and synchronized results are visible. | Mountain-first, no persistent explainer sidebar. |
| 1:00–1:24 | D — Human authority | Hold the two-option route card, show the human Repair persistence choice, then show the structured inspection result. | **THE AGENT ASKS. YOU DECIDE.** | `request_human_decision → human click → inspect_human_decision` | Longest uninterrupted proof moment. |
| 1:24–1:45 | E — Scope/topology | Show the successful scope/path calls, then pan through the full mission-detail capture and elevation profile. | **NEW SCOPE. NEW RIDGE.** | `expand_scope`, Security Ridge, 5,274 m. | Subtle fog transition and vertical topology pan. |
| 1:45–2:01 | F — Verified Summit | Show successful final evidence, `verify_completion`, `complete_mission`, 100%, and the Summit card. | **EVIDENCE BEFORE SUMMIT** | Completion is visibly verified before activation. | Warm summit light and focused scenario card. |
| 2:01–2:05 | G — End card | Hold the live Verified Summit world beneath the concise title panel. | **CODEX ASCEND — THE MISSION IS THE MOUNTAIN** | 18 tools · Human authority · Verified completion. | Music rises, then clean fade. |

## Visual polish

- Use only one caption at a time, set large enough for a 720p YouTube player.
- Animate captions with a 160–220 ms fade/slide; do not use bouncing or typewriter effects.
- Preserve the app’s own fog, cloud, snowfall, route, and camera motion. Added editor motion should stay subtle.
- Use straight cuts for state changes and 4–6 frame dissolves only for scenic time compression.
- Keep tool calls readable at normal speed. Speed up only inert transitions, never the evidence or human-decision proof.
- Mix narration as the clear foreground. Keep any app ambience 18–24 dB beneath it and avoid music under tool results.

## Audio and delivery files

- Master narration: `artifacts/video/voiceover/codex-ascend-v5-voiceover/codex-ascend-v5-voiceover.wav`
- Captions: `artifacts/video/voiceover/codex-ascend-v5-voiceover/codex-ascend-v5-voiceover.vtt`
- Machine-readable shot timing: `artifacts/video/voiceover/codex-ascend-v5-voiceover/director-cues.json`
- Required final credit: `AI-generated narration via OpenAI TTS`

## Pass/fail before upload

- The working experience is visible in the first second and the blocker reaction is clear before 0:15.
- An actual agent tool call and structured result are visible by 0:40.
- The human decision cannot be mistaken for an agent-selected action.
- The elevation profile visibly navigates to a real waypoint.
- Summit remains gated until verification and evidence are complete.
- The exported video is under 3:00, has audible narration, includes the AI-voice disclosure, and is uploaded publicly to YouTube.
