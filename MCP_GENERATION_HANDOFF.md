# MCP Generation Handoff

## Implemented boundary

```text
Codex project context
  → submit_project_handoff (closed, bounded WebMCP schema)
  → persisted neutral ProjectHandoff
  → active ExperiencePack.createGenerationRequest(...)
  → Ascend waypoint plan + alpine art brief
  → authenticated Cloudflare Workflow
  → OpenAI image generation/edit
  → R2 candidate + metadata + review state
```

The handoff stores project identity, objective, summary, phase, active work, constraints, risks, and evidence. It contains no mountain vocabulary, image prompt, file path, credential, or renderer instruction.

Ascend derives a waypoint plan from semantic stage order and project length. Up to ten visual waypoints are projected onto one authored mountain spine; longer projects are evenly summarized while `sourceEntityCount` preserves the real stage count. The exact normalized anchor array is written into the generation request and consumed by the live HUD, so generated terrain and UI use one coordinate contract.

Prepared requests automatically re-project when mission revision, stage count, active state, or scene selection changes. A handoff received before discovery therefore expands from the initial origin anchor to the full proposed waypoint plan without requiring the agent to resubmit project context.

## Provider path

The browser stops at `prepared`; it never receives a provider credential. Authenticated Worker routes start an idempotent Cloudflare Workflow, which calls a pinned OpenAI image model and stores the candidate, request, and metadata in R2. Provider output remains non-authoritative until explicitly accepted. The public world manifest exposes only accepted assets.

The Responses API can accept text/image/file inputs and expose MCP or custom tools, so this request envelope can be transported without coupling the Mission Engine to a specific provider. See the official [Create a model response reference](https://developers.openai.com/api/reference/cli/resources/responses/methods/create).

OpenAI keys must remain in the server environment—not the browser or repository—as described in [OpenAI API key safety guidance](https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety).

## Current bounded activation

- pinned model: `gpt-image-2-2026-04-21`;
- accepted canonical master: `gen_e2178345efc9700e982ffb3d3d38597f`;
- accepted Camp II derivative: `gen_0b7c3e72a5ba1165a082bdb4145f6b58`;
- storage: private R2 binding surfaced through application asset routes;
- generation and review routes: administrator-token protected;
- provider key: Worker secret only, never printed or client-exposed;
- automatic retries: disabled;
- no mission topology mutation and no additional Experience Pack activation.
