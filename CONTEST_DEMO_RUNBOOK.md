# Codex Ascend — Contest Demo Runbook

**Final prerecorded master:** 1:45, 1920 × 1080, with AI narration and credited royalty-free music
**Live fallback target:** one reliable path under 3:00 for the OpenAI WebMCP Challenge
**Live URL:** use the current deployment URL stored in the private submission checklist or attached directly to the Devpost entry

## Preflight — five minutes before recording

1. Open the live URL in the WebMCP-capable ChatGPT browser or Chrome testing surface.
2. Confirm the upper-right pill says **WebMCP native**.
3. In **Demo lab**, click **Reset**. Confirm `0/24`, Basecamp, and the lower Current situation and Elevation profile panels are visible.
4. Call `inspect_mission` once. Confirm a structured result with mission status `draft` and no registration error in **State + WebMCP log**.
5. Reload once and reset again. Close browser extensions or panels that obscure the 1280 × 720 experience.
6. Keep this fallback tab ready: `?review=scenario-cards`. Do not use it in the primary take.

## Exact 3-minute path

### 0:00–0:22 — Basecamp becomes a plan

- Show the quiet Basecamp and say: “Ascend turns a real objective into a shared spatial mission.”
- Briefly expose `inspect_mission`; point out that the agent reads mission semantics, not pixels.
- Start **Autoplay at 2×**. Stop after Camp II is secured and validation begins.
- Say: “The same validated mission commands drive WebMCP, the human controls, and every visual transition.”

### 0:22–1:20 — The critical WebMCP moment

- Continue until event `9/24`. The persistence blocker opens a crevasse and changes the weather.
- Advance through the alternate-route proposal to `11/24`. Autoplay must pause at **Waiting for decision**.
- Select the Camp III beacon if the card is not already open.
- Show the two route strategies, risk, effort, and recommendation.
- Click **Repair persistence** in the geography-bound card.
- Call `inspect_human_decision` and show `selectedOptionId: repair`.
- Advance once. The obstacle resolves and the repaired route becomes authoritative.
- Say: “The agent changes mission truth through WebMCP. The human authorizes the consequential route in the world. The agent can then observe that structured choice and continue.”

### 1:20–2:20 — New work reshapes the mountain

- Resume **Autoplay at 2×**.
- Pause as Security Ridge appears.
- Point out the rising summit geometry, new waypoint, changed cloud coverage, and evidence marker.
- From the open Security Ridge card, click **View mission detail** to reveal the lower panels. Tap Camp III in the Elevation profile, then show that it returns to the matching mountain card.
- Say: “The elevation profile is not decoration—it is a keyboard-accessible navigator derived from the same topology, evidence, blockers, and decisions.”

### 2:20–2:52 — Evidence, not confetti

- Continue to `24/24` and Verified Summit.
- Show `100% surveyed`, `6,430 m secured`, and the Summit evidence count.
- End with: “The mountain is not a progress bar. It is a WebMCP-native mission model that the human and agent discover, repair, and verify together.”

## Native agent-driven alternative

For a live judge who wants direct tool use rather than the deterministic recording choreography:

1. Reset to Basecamp.
2. Ask the agent: “Inspect this mission. Discover a safe release path, work through Foundation and Implementation with evidence, then stop when a real human decision is required.”
3. Choose the recommended repair in the Camp III card.
4. Ask: “Inspect my decision, resolve the blocker with the repair outcome, add any newly required security review, and continue only when every success criterion has evidence.”
5. Ask the agent to run `verify_completion` and `complete_mission`.

The deterministic controls remain the recording safety net; they execute the same domain commands and cannot bypass blockers, missing evidence, or the human-only route authorization.

## Failure and recovery

| Symptom | Recovery |
| --- | --- |
| WebMCP pill is not `native` | Follow the on-page guide: open the page in ChatGPT desktop's built-in browser, review website access, and paste the starter prompt. In Chrome testing, enable `chrome://flags/#enable-webmcp-testing` and reload. Do not claim fallback mode is native. |
| Card is hidden behind the current camera position | Select Camp III from the Elevation profile; the hero scrolls into view and opens the same entity. |
| Autoplay stops at `11/24` | Expected. Choose a route in the Camp III card; the agent is deliberately blocked. |
| A take drifts or the wrong route is chosen | Click **Reset**. The seeded mission reconstructs exactly. |
| Accepted generation endpoint is temporarily unavailable | The UI retains the last known-good world; reload. The authored semantic scenes remain usable. |
| A new image generation fails | Do not retry blindly during the demo. The authenticated status reports `errorCode`, `retryable`, and the OpenAI request id; retry requires an explicit nonce. |

## Recording and submission checklist

- Final local master: `artifacts/video/final/codex-ascend-webmcp-challenge-demo-v9.mp4`.
- V9 runs 1:45 and opens on the living control-room premise, establishes the shared mission and native WebMCP surface, then shows the blocker transformation, actual Repair persistence click, structured human-decision proof, Security Ridge scope expansion, live elevation/evidence state, and Verified Summit.
- The elevation sequence is a live topology-derived full-page capture: 100% surveyed, 6,430 m secured, with the expedition journal visible below the mountain.
- The master contains no browser tabs, address bars, or Cloudflare administration URLs; the small footer credits the AI voice and Mixkit music.
- Public YouTube video, under three minutes, with audible narration.
- Keep browser chrome and hosting URLs out of the film; the public Devpost entry carries the verified live URL.
- Show native WebMCP evidence and one actual structured tool result.
- Keep the scenario-card route choice and Verified Summit in the final cut.
- Remove dead time; do not spend the demo in the diagnostic Mission Map.
- Keep the submitted live site, repository, video, and Devpost entry frozen during judging unless a reproducible defect appears.
