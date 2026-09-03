# Public Repository Release Preparation

Repository publication and push were completed with owner approval. Final Devpost submission remains separately approval-gated.

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
- Vitest: 65 tests across 18 files pass.
- Frontend production build: pass, 860 modules.
- Worker TypeScript build: pass.
- Wrangler 4.127.0 generated-binding check: up to date.

## Release commit

Published release title:

`Finalize Codex Ascend WebMCP contest submission`

Commit body:

`Complete the mountain-first human-agent journey, native WebMCP tool proof, responsive scenario cards, semantic weather and topology, evidence-gated Summit, Cloudflare/OpenAI generation boundary, and final contest documentation.`

## Publication record

1. The audited runtime release was pushed to `main`; deployed source SHA: `f6814a54d50cfb403f414d042e775555cff196a8`.
2. Only `main` was pushed; local tool-managed refs were not mirrored.
3. The public repository page, README, neutral About copy, and MIT license were verified.
4. The canonical repository URL was added to Devpost.
5. Public snapshot `575ef1f41459ae2814df8998cab525d58dfc87ea` was cloned without credentials; locked install, ESLint, 65 tests, frontend build, Worker build, and public-release audit all passed. This evidence update is documentation-only.
