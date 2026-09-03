# Contest Finalization Checklist

No upload, push, publication, or Devpost submission is authorized by this checklist. Stop at every marked external gate.

## Local package ready

- [x] V5 master exists and is under three minutes.
- [x] Full video and audio decode completed.
- [x] QuickTime playback reached the 2:05 end frame without interruption.
- [x] YouTube title, description, chapters, tags, credit, and settings are prepared.
- [x] Two compliant 1280 × 720 thumbnails are prepared.
- [x] Devpost long-form copy is prepared in `DEVPOST_SUBMISSION.md`.
- [x] Judge testing instructions are prepared.
- [x] MIT `LICENSE` is present.
- [x] README contains live URL, build instructions, architecture, security boundaries, and screenshots.

## Repository gate

- [ ] Confirm the intended GitHub/GitLab/Bitbucket destination and repository name.
- [ ] Review the complete diff and decide whether all current changes belong in the release.
- [x] Run `pnpm check` (57 tests plus frontend and Worker production builds passed on September 2, 2026).
- [x] Run `pnpm types:worker --check` (generated Worker types are current).
- [x] Confirm `.dev.vars`, generated candidates, raw art-direction output, and video working files remain ignored.
- [x] Scan tracked files for tokens, private filesystem paths, and credential-like values (no matches found).
- [ ] Create the release commit and record its exact SHA.
- [ ] **EXTERNAL GATE:** obtain approval before creating or pushing the public repository.
- [ ] Verify the public repository from a signed-out browser and perform a clean-clone build.
- [ ] Paste the final repository URL into the README, YouTube description, Devpost copy, and release record.

## Video gate

- [ ] Perform one owner listening check on ordinary laptop speakers.
- [ ] Choose the cinematic thumbnail or literal product-frame alternate.
- [ ] Replace `[PUBLIC_REPOSITORY_URL]` in the YouTube description.
- [ ] **EXTERNAL GATE:** obtain approval immediately before uploading or publishing.
- [ ] Wait for 1080p processing and perform signed-out playback QA.
- [ ] Paste the final watch URL into `DEVPOST_SUBMISSION.md`.

## Devpost gate

- [ ] Project name: Codex Ascend.
- [ ] Tagline and long-form description pasted from `DEVPOST_SUBMISSION.md`.
- [ ] Live URL pasted and tested in a supported WebMCP browser.
- [ ] Judge instructions pasted from `submission/JUDGE_TESTING_INSTRUCTIONS.md`.
- [ ] Public repository URL pasted and opened signed out.
- [ ] Public YouTube URL pasted and played signed out.
- [ ] MIT license selected or identified.
- [ ] Five screenshots uploaded in the documented order.
- [ ] Teammates and all mandatory fields reviewed.
- [ ] Official rules and submission preview reviewed line by line.
- [ ] **EXTERNAL GATE:** obtain approval immediately before final Devpost submission.

## Freeze after submission

- [ ] Record the submission time, release commit SHA, Worker version, live URL, repository URL, and video URL.
- [ ] Do not change the submitted live site, public repository, video, or Devpost entry during judging.
- [ ] If development must continue, fork it into a separate repository/deployment that cannot alter the submitted candidate.
- [ ] Preserve the final master and submission screenshots locally until winners are announced.
