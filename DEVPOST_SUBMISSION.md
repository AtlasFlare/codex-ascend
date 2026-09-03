# Devpost Submission Package

## Project name

Codex Ascend

## Tagline

Turn one real goal into a living expedition shared by a human and an AI agent.

## Elevator pitch

Codex Ascend is a WebMCP-native execution environment where an AI agent and a human climb the same mission together. The agent works through structured stages, blockers, evidence and decisions; Ascend maps that authoritative mission state into a persistent mountain. A failing test can open a crevasse. A newly discovered requirement can reveal another ridge. A consequential route choice happens in the website, becomes structured state available back to the agent, and the Summit activates only after deterministic evidence verification.

## Inspiration and problem

Most agent interfaces separate the agent’s plan from the human’s understanding. The model sees tool state, while the person sees chat transcripts, task rows or a decorative progress bar. That makes consequential work difficult to supervise: blockers can be buried, plan changes feel abstract, and completion is easy to overstate.

Ascend asks a different question: what if the human and the agent inhabited the same execution model? The mountain gives mission structure a stable spatial form. Camps are verified outcomes, fog is uncertainty, crevasses are blockers, forks are strategic choices, and the Summit is evidence-backed success.

## What it does

- Accepts one meaningful mission objective at Basecamp.
- Lets an agent inspect and discover mission stages and paths through native WebMCP tools.
- Projects structured state into a persistent, generated mountain with deterministic waypoint overlays.
- Shows blockers as physical hazards that stop the current route.
- Lets the agent propose multiple strategies and request a human decision.
- Keeps consequential route authorization in the website rather than giving the agent a decision-resolution tool.
- Exposes the human’s structured choice back to the agent through `inspect_human_decision`.
- Allows newly discovered required work to reshape the route and reveal new terrain.
- Requires evidence for mission success criteria before verification and completion.

## How WebMCP is used

WebMCP is the interaction model, not an integration badge. Ascend registers 18 native tools with closed JSON schemas and structured results. The tools manipulate presentation-neutral mission semantics: stages, paths, blockers, decisions, evidence, scope and completion. They never manipulate mountain pixels or game objects.

The most important loop is bidirectional:

```text
agent reports blocker
  → agent proposes repair and bypass paths
  → agent requests a human decision
  → website renders that decision at the affected geography
  → human chooses Repair persistence
  → agent inspects the structured choice
  → agent resolves the blocker and continues
```

The deterministic demo, WebMCP calls and human UI all execute the same validated mission commands. A visual transition cannot bypass dependency, blocker, evidence or human-authorization rules.

## Human-agent collaboration

The agent is responsible for discovery, execution proposals, evidence attachment and honest reporting. The human remains responsible for consequential strategy. Ascend makes that boundary visible: the route card is the authoritative decision surface, and there is intentionally no agent-facing `resolve_human_decision` tool. Once the person chooses, the agent can observe the result and resume from shared structured state.

## How we built it

The system has four boundaries:

1. A neutral TypeScript Mission Engine validates commands and records a versioned event journal.
2. The Ascend Experience Pack projects mission truth into topology, narration, waypoint coordinates, weather and scenario selection.
3. React DOM provides the accessible live HUD and geography-bound cards; PixiJS is isolated to the living scene and optional diagnostic map.
4. A Cloudflare Worker uses Workflows and R2 for reviewed OpenAI image generation. The browser prepares a provider-neutral handoff, the server calls a pinned GPT Image 2 snapshot, and only explicitly accepted candidates enter the public world.

OpenAI credentials and the generation administration token remain server-side. Rendering is disposable presentation; mission state is authoritative.

## Challenges

- Preserving one coherent mountain identity while allowing semantic weather and scenario states.
- Keeping waypoint cards attached to real geography across desktop and narrow mobile layouts.
- Making a human decision visually obvious without duplicating the mutation in a lower control panel.
- Keeping WebMCP results compact enough for an agent while preserving every critical blocker and decision identifier.
- Preventing generated imagery, retries or renderer state from becoming mission authority.

## Accomplishments

- Eighteen native WebMCP tools with closed schemas and shared deterministic handlers.
- A complete Basecamp-to-Summit journey with a real human-only strategy gate.
- A native 3840×2160 accepted OpenAI canonical mountain served through Cloudflare.
- Stable camera focus, moving clouds, semantic weather, waypoint imagery and an interactive elevation navigator in one coherent experience.
- Explicit generated-art review, safe retries, provider request evidence and last-known-good world behavior.
- Sixty-five automated tests across eighteen files plus deployed desktop, mobile and full-journey browser verification.

## What we learned

WebMCP becomes most useful when the website owns an interaction the agent should not silently perform. Structured inspection is valuable, but the compelling moment is the round trip: the agent creates a meaningful decision, the human answers it in context, and the agent continues from the result. We also learned that spatial metaphors work only when they remain projections of deterministic truth; otherwise they become decorative dashboards.

## Potential impact

Ascend helps technical leads supervise long-running agentic software delivery. Instead of reconstructing blockers, route changes, approvals and evidence from chat logs, the human and agent share one visual execution contract. The agent advances through WebMCP, the human alone authorizes consequential detours, and the Summit remains unavailable until the required proof is attached. The alpine experience is specific, but the same collaboration model can support investigations, research plans and other consequential work where uncertainty and approval must remain legible.

## Future direction

After the contest, the highest-value work is not more visual themes. It is durable shared missions, richer evidence adapters, authenticated collaboration and evaluation of human-agent decision quality. Additional Experience Packs remain intentionally outside this submission.

## Technologies

- WebMCP imperative browser API
- TypeScript and Zod
- React and Vite
- PixiJS
- OpenAI GPT Image 2
- Cloudflare Workers, Workflows and R2
- Vitest and ESLint

## Links

- **Live experience:** use the deployment URL entered directly in Devpost; do not commit an account-scoped hostname
- **Source repository:** this public repository
- **Demo video:** https://youtu.be/gNNQefKfcTs *(Public and verified signed out)*

## Testing instructions

No login is required. Open the live experience in ChatGPT’s in-app browser or Chrome with WebMCP enabled and confirm it reports **WebMCP native**. Ask the agent: “Inspect this mission, discover its route, and advance carefully. Stop when human authorization is required.” At the Camp III persistence blocker, choose **Repair persistence** in the mountain card. Then ask: “Inspect my decision, resolve the blocker, continue with evidence, verify completion, and finish the mission.” The expected ending is **Verified Summit**, 100% progress, 6,430 m secured, and evidence verified.

If a prior session is already complete, select **New**, keep the editable defaults, then select **Establish basecamp**. Do not trigger image generation; the accepted world is already deployed.

See `submission/JUDGE_TESTING_INSTRUCTIONS.md` for recovery steps and detailed proof points.

## Suggested judging-criteria summary

- **WebMCP leverage:** 18 semantic tools enable a bidirectional human-agent loop that cannot be reproduced by a decorative UI integration.
- **Execution:** one shared deterministic engine, closed schemas, evidence gates, server-only secrets, reviewed image generation and a fully verified deployed path.
- **Potential impact:** a reusable model for supervising agent work through contextual human authority and shared structured state.
- **Creativity and ambition:** mission topology becomes a coherent living mountain that can reveal, block and reshape itself without sacrificing semantic integrity.

## Screenshot order

1. Active ascent — persistent mountain and live waypoints.
2. Persistence blocker — storm and crevasse stop the route.
3. Human route choice — repair versus bypass at Camp III.
4. Mission detail and elevation profile — newly discovered Security Ridge appears in the same navigable topology and evidence timeline.
5. Verified Summit — evidence-backed completion.
