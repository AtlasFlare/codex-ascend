# OpenAI Platform and Cloudflare Integration

Codex Ascend uses a deliberate three-layer model hierarchy instead of asking one model to own truth, visuals, and authorization.

```text
ChatGPT / Codex agent
  native WebMCP semantic tools
          ↓
deterministic Mission Engine + Ascend projection
  validated state, human authorization, placement anchors
          ↓
Cloudflare Workflow → pinned GPT Image 2 snapshot
  scenic pixels only → R2 candidate → explicit review → public world
```

## Why this is the intended hierarchy

1. **Agent reasoning:** the WebMCP-capable ChatGPT or Codex agent inspects and changes the mission through closed semantic tools. Adding a second hidden text planner would weaken the contest’s native human-agent interaction and create competing mission truth.
2. **Deterministic authority:** dependency checks, blocker enforcement, evidence requirements, human decisions, mission completion, topology, and waypoint projection are code—not probabilistic model output.
3. **Visual generation:** the server calls the pinned `gpt-image-2-2026-04-21` snapshot only for scenic context. It cannot paint mission markers or mutate state.

## Production request path

1. `submit_project_handoff` accepts bounded, provider-neutral project context.
2. The Ascend Experience Pack converts the current mission, topology, selected scene, and authored waypoint anchors into a versioned generation brief.
3. An authenticated Worker endpoint validates a closed request schema and derives an idempotency key.
4. A Cloudflare Workflow creates the canonical master or an accepted-master derivative.
5. The server-only OpenAI key is read from a Worker secret. It never enters browser code, API results, repository files, or logs.
6. Image bytes, request metadata, model snapshot, prompt version, OpenAI request id, and retry classification are stored in R2.
7. Generated candidates remain private and non-authoritative until an authenticated explicit accept action updates the public world manifest.
8. The browser renders only accepted generation-world assets; transient refresh errors retain the last known-good world.

## Failure policy

- Workflow dispatch failures become `failed`, not indefinitely `queued`.
- OpenAI `429` and `5xx` responses are marked retryable; user/request failures are not.
- Automatic image retries are disabled to prevent surprise spend. An operator must provide an explicit retry nonce.
- Provider request IDs are retained for support evidence without revealing credentials.
- Accepting a replacement canonical master invalidates its previous derivatives by construction.

## Secrets and verification

- Required Worker secrets: `OPENAI_API_KEY` and `ASCEND_GENERATION_ADMIN_TOKEN`.
- Public health checks reveal configuration state, never secret values.
- The authenticated provider check deliberately omits the prompt, proving reachability and credential acceptance without starting a billable generation.
- The release test suite mocks provider calls and verifies the pinned model, request format, request-id capture, and retry classification.
