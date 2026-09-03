# Public Repository Release Preparation

Nothing here authorizes repository creation or a push.

## Recommended repository metadata

- Name: `codex-ascend`
- Description: `A WebMCP-native living mission where humans and AI agents share one auditable mountain.`
- Homepage: use the public Devpost project page or a neutral custom domain; do not publish an account-scoped Worker hostname in repository metadata
- Visibility at publication: Public
- License: MIT, using the existing root `LICENSE`
- Topics: `webmcp`, `openai`, `cloudflare-workers`, `human-in-the-loop`, `ai-agents`, `typescript`, `react`, `pixijs`

## Prepared release contents

- Product source, Worker source, configuration, tests, and lockfile.
- All runtime artwork referenced by the deployed app under `public/`.
- Complete README with architecture, WebMCP surface, local setup, security boundaries, screenshots, and a privacy-safe route to the Devpost-hosted live URL.
- WebMCP contract, OpenAI/Cloudflare integration, topology, product-model, and contest runbook documentation.
- Reproducible narration, capture, assembly, thumbnail, and verification scripts.
- Devpost copy and local finalization checklists.

## Intentionally excluded

- `.dev.vars` and every local credential.
- Raw provider candidates and rejected generation output.
- Local art-direction working files.
- Video captures, narration binaries, music, rendered masters, and thumbnails under `artifacts/video/`.
- Dependency folders, build output, coverage, logs, and Wrangler state.

## Local evidence already completed

- `git diff --check`: pass.
- Candidate-file retired-brand, secret, email, machine-name, and private-path scan: pass with no matches.
- Public branch history: collapsed to one contributor-anonymized release commit.
- `.dev.vars` and `artifacts/video/`: confirmed ignored.
- ESLint: pass.
- Vitest: 60 tests across 17 files pass.
- Frontend production build: pass, 860 modules.
- Worker TypeScript build: pass.
- Wrangler 4.127.0 generated-binding check: up to date.

## Proposed release commit

Commit title:

`Finalize Codex Ascend WebMCP contest submission`

Commit body:

`Complete the mountain-first human-agent journey, native WebMCP tool proof, responsive scenario cards, semantic weather and topology, evidence-gated Summit, Cloudflare/OpenAI generation boundary, and final contest documentation.`

## Publication sequence after approval

1. Review the prepared release commit and record its exact SHA.
2. Create or attach the approved public repository remote.
3. Push only `main`; do not mirror local tool-managed refs.
4. Verify README images, license, and repository visibility signed out.
5. Perform a clean clone and run `pnpm check && pnpm check:public`.
6. Put the final repository URL into YouTube and Devpost.
