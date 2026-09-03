# Contest Finalization Checklist

Publication and submission actions already completed with owner approval are recorded below.

## Local package ready

- [x] V9 master exists and is under three minutes.
- [x] Full video and audio decode completed.
- [x] AVFoundation decode reached the 1:45 end frame with 3,150 video frames and complete audio.
- [x] YouTube title, description, chapters, tags, credit, and settings are prepared.
- [x] Two compliant 1280 × 720 thumbnails are prepared.
- [x] Devpost long-form copy is prepared in `DEVPOST_SUBMISSION.md`.
- [x] Judge testing instructions are prepared.
- [x] MIT `LICENSE` is present.
- [x] README contains live URL, build instructions, architecture, security boundaries, and screenshots.

## Repository gate

- [x] Confirm the intended GitHub destination and repository name.
- [x] Review the complete diff and decide whether all current changes belong in the release.
- [x] Run `pnpm check` (65 tests across 18 files plus frontend and Worker production builds passed on September 3, 2026).
- [x] Run `pnpm types:worker --check` (generated Worker types are current).
- [x] Confirm `.dev.vars`, generated candidates, raw art-direction output, and video working files remain ignored.
- [x] Scan tracked files for tokens, private filesystem paths, and credential-like values (no matches found).
- [x] Create and push the audited runtime release commit; deployed source SHA: `f6814a54d50cfb403f414d042e775555cff196a8`.
- [x] **EXTERNAL GATE:** owner approved public repository creation and push.
- [x] Verify the public repository page, README, and detectable MIT license from the public web.
- [x] Clean-clone public snapshot `575ef1f41459ae2814df8998cab525d58dfc87ea`; locked install, ESLint, 65 tests, frontend build, Worker build, and public-release audit all passed. This checklist record is documentation-only.
- [x] Paste the canonical repository URL into Devpost; public source documentation refers to this repository without account-branding copy.

## Video gate

- [x] Perform owner review of the final V9 master.
- [x] Choose and upload the cinematic custom thumbnail.
- [x] Upload https://youtu.be/N8iQ5qR3ytg; copyright check reports no issues.
- [x] **EXTERNAL GATE:** owner approved changing visibility to Public.
- [x] Wait for 1080p processing and perform signed-out playback QA.
- [x] Publish timed English captions and verify signed-out playback advances normally.
- [x] Paste the final watch URL into Devpost and verify the public project page embeds video `N8iQ5qR3ytg`.

## Devpost gate

- [x] Project name: Codex Ascend.
- [x] Tagline and long-form description pasted from `DEVPOST_SUBMISSION.md`.
- [x] Live URL pasted and tested in a supported WebMCP browser.
- [x] Judge instructions pasted from `submission/JUDGE_TESTING_INSTRUCTIONS.md`.
- [x] Public repository URL pasted and opened publicly.
- [x] Public YouTube URL pasted and played signed out.
- [x] MIT license present and publicly detectable.
- [x] Five screenshots uploaded in the documented order with concise captions.
- [x] Submitter, country, app status, tested clients, AI tools, and required learning fields completed.
- [x] Confirm no teammate is required for this submission; submitter type is Individual.
- [x] Submission preview and finalization reminder reviewed line by line without accepting terms or submitting.
- [x] Official rules reviewed against eligibility and submission requirements.
- [x] Owner accepts the binding official rules and Devpost terms.
- [x] **EXTERNAL GATE:** owner approved final Devpost submission.

## Freeze after submission

- [x] Record the release commit SHA, Worker version, live URL, repository URL, and final video URL in the submission documentation.
- [x] Freeze the submitted live site, public repository, video, and Devpost entry during judging unless a reproducible judging defect appears.
- [ ] If development must continue, fork it into a separate repository/deployment that cannot alter the submitted candidate.
- [ ] Preserve the final master and submission screenshots locally until winners are announced.
