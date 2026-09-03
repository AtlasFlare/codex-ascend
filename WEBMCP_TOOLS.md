# WebMCP Tools

Codex Ascend uses the current imperative browser API: `document.modelContext.registerTool`. Tools use concise names, closed JSON schemas (`additionalProperties: false`), `readOnlyHint`, structured results, and the same validated mission commands as the UI.

The implementation follows the current [WebMCP draft](https://webmachinelearning.github.io/webmcp/), [Chrome imperative API guidance](https://developer.chrome.com/docs/ai/agents), and [Chrome tool security guidance](https://developer.chrome.com/docs/ai/webmcp/secure-tools).

## Surface

| Tool | Kind | Mission operation |
| --- | --- | --- |
| `inspect_mission` | Read | Compact mission graph, active state, blockers, decisions, criteria, and journal tail. |
| `discover_mission` | Write | Establish initial stages and paths from the objective. |
| `propose_stage` | Write | Add meaningful required work. |
| `propose_path` | Write | Add a real strategy between stages. |
| `begin_stage` | Write | Start available work after dependency/blocker validation. |
| `record_progress` | Write | Record meaningful partial work without claiming completion. |
| `complete_stage` | Write | Complete a stage only when evidence and blockers permit. |
| `report_obstacle` | Write | Record a structured issue and the real entities it blocks. |
| `resolve_obstacle` | Write | Resolve a hazard with a concrete explanation and reopen its route. |
| `request_human_decision` | Write | Create an explicit human route choice with two or more options. |
| `inspect_human_decision` | Read | Observe the human’s structured response. |
| `attach_evidence` | Write | Add proof to a checkpoint or required summit criterion. |
| `select_path` | Write | Select a viable alternate path. |
| `expand_scope` | Write | Add newly discovered required work and its connecting path. |
| `invalidate_stage` | Write | Mark previously completed work invalid with a reason. |
| `verify_completion` | Write | Deterministically check criteria, dependencies, and blockers. |
| `complete_mission` | Write | Complete only after successful completion verification. |
| `submit_project_handoff` | Write | Store bounded, presentation-neutral project context and prepare an Experience Pack generation request. |

## Critical loop

```text
report_obstacle
  → crevasse projection
propose_path × 2
request_human_decision
  → route-fork projection
human selects a route in the application
inspect_human_decision
resolve_obstacle
  → crossing reopens
```

The human response tool is read-only. There is intentionally no agent-facing `resolve_human_decision`; path authorization remains a human UI action. The tool taxonomy is presentation-neutral: mountain vocabulary appears only in Ascend narration, generation prompting, and rendering.

`submit_project_handoff` accepts bounded project identity, objective, phase, current work, constraints, risks, and evidence. It does not accept image prompts or renderer instructions. The active Experience Pack translates that neutral handoff into a provider-neutral generation request and a shared placement-anchor plan.

## Security and lifecycle

- Tools are registered only on the current origin and no cross-origin `exposedTo` list is used.
- All parameters are parsed again with Zod before reaching domain logic.
- Read/write hints are explicit.
- Tool descriptions and the compact inspection output stay within Chrome’s recommended character budget in the critical decision state.
- Registration uses an `AbortSignal`, so tools are unregistered on page/component teardown.
- No tool accepts arbitrary code, file paths, credentials, or renderer instructions.
- Externally sourced/UGC outputs are not currently returned; `untrustedContentHint` is therefore false.

## Browser support

Native registration activates when `document.modelContext` exists. Otherwise the app remains fully usable in deterministic demo mode and labels WebMCP as unsupported. A non-native fallback is never reported as native WebMCP.
