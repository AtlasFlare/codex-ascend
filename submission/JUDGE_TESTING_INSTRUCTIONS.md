# Judge Testing Instructions

## Paste-ready short version

No login is required. Open the live experience in ChatGPT’s in-app browser or Chrome with WebMCP enabled. Confirm the interface reports **WebMCP native**. Ask the agent: “Inspect this mission, discover its route, and advance carefully. Stop when human authorization is required.” At the Camp III persistence blocker, choose **Repair persistence** in the mountain card. Then ask the agent: “Inspect my decision, resolve the blocker, continue with evidence, verify completion, and finish the mission.” The expected ending is **Verified Summit**, 100% progress, 6,430 m secured, and evidence verified.

Live URL: use the URL attached to the Devpost entry and append `?present=1`.

## Expected proof points

- The browser advertises 18 native WebMCP tools.
- `inspect_mission` returns presentation-neutral structured state.
- `report_obstacle` blocks the active stage and changes the mountain weather.
- `request_human_decision` creates a two-option geography-bound route card.
- Only the person can choose **Repair persistence**; there is no agent-facing decision-resolution tool.
- `inspect_human_decision` returns `selectedOptionId: repair`.
- `expand_scope` reveals Security Ridge and changes the route topology.
- `verify_completion` refuses premature completion and validates the evidence-backed final state.
- `complete_mission` reaches Verified Summit only after successful verification.

## Recovery

- If the WebMCP status is not **native**, reload in a supported WebMCP testing surface. Do not treat simulation mode as native proof.
- If the route is already complete from a previous visit, select **New**, keep the editable defaults, and select **Establish basecamp**.
- If the agent stops at the human gate, that is expected. Choose one route in the Camp III card, then ask it to inspect the decision.
- If the card is not visible, select Camp III from the elevation profile; it returns to the same mountain geography.
- The experience requires no OpenAI key, Cloudflare credential, account, or paid generation during judging.

## What not to test as the primary path

- Do not use the diagnostic Mission Map as the main experience.
- Do not trigger new image generation; the accepted world is already deployed.
- Do not choose the risky demo bypass for the canonical judging path.
