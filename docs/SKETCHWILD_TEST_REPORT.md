# DawnPatch testing with Sketchwild

Date: October 23, 2026. Desktop testing only.

## Scope and provenance

Target: https://github.com/priy-anshugupta/sketchwild.git

- Upstream revision: `ae105a4de74cfc0aafe668638f8ede155ce631e8`.
- Isolated checkout: `.dawnpatch/test-repos/sketchwild`.
- Test branch: `dawnpatch-test/time-filter`, revision `799f564`.
- Controlled regression: changed the mission duration comparison in `src/Challenges.tsx` from `<=` to `>=`. This is a deliberately introduced defect for evaluating DawnPatch, not a discovered upstream bug.
- Nothing has been pushed to Sketchwild. DawnPatch's candidate is a separate source copy.

## Verified checks

| Check | Result |
| --- | --- |
| DawnPatch TypeScript and production build | Passed |
| DawnPatch core/transport tests | 11 passed |
| DawnPatch browser suite | 7 passed, including connection recovery and developer-correction provenance |
| Sketchwild dependency installation and production build | Passed in Docker |
| Sketchwild existing tests | 17 passed in Docker |
| Runtime dependency audit | 0 vulnerabilities reported |
| Seeded failure reproduced | Selecting 5 minutes displayed 6 mission cards; expected 1 |

The existing Sketchwild tests include controlled upstream/model adapters. Passing them does not demonstrate live Gemma vision feedback. This integration run exercises its static frontend mission filtering, not its separate AI-feedback server.

The initial browser suite overlapped a long repository job in the single investigation queue. One fixture timed out while queued. Rerunning the suite by itself passed all five tests; the initial scheduling timeout is retained in the work log and was not counted as a successful run.

## Repairs made to DawnPatch

- Invoke the installed Vite preview CLI directly. A Vite project does not need a package script named `preview`.
- Install container dependencies into a Docker volume, avoiding Windows bind-mount dependency-file overhead. Cleanup removes the associated anonymous volume.
- Rank executable source by issue relevance before filling the bounded context. Documentation can no longer consume the entire budget before source is considered. Added a regression test; symlinks and dependency directories remain excluded.
- Prioritize frontend source for browser investigations, bound source context to 12,000 characters, and use an 8,192-token context for local inference instead of 16,384, reducing memory demand.
- Remove an unrelated illustrative counter edit that the small model copied into a proposal. Constrain the structured-output filename field to the actual supplied filenames; reject out-of-context filenames during parsing as well. Added a regression test.
- Make the local inference timeout configurable through `GEMMA_TIMEOUT_MS`, defaulting to ten minutes for CPU inference. The first four-minute limit was too short for the measured laptop throughput; the retry retains the failing browser checkpoint and Ollama reused its cached prompt prefix.
- Keep desktop child commands hidden to prevent flashing console windows.
- Retain static Sentry trace lifecycle so the existing transaction redaction hook applies.
- Keep the browser suite desktop-only, matching the requested product scope.

## Environment and integration limits

Docker initially failed because Windows could not access an old `dockerInference` runtime socket. With Docker stopped, its runtime and secrets-engine folders were renamed to preserved backups, allowing Docker to recreate them. Docker Engine `29.5.2` then responded. No images, volumes, or VM disk were reset or deleted.

Docker automatically restarted four unrelated Plexus containers. They were stopped with explicit user approval to release memory; their data was preserved.

Ollama reports `gemma3:4b` installed. Sentry dashboard screenshots now confirm receipt of testing errors and a connection-check span lasting 11.31 ms. The LLM Calls view showed no matching model spans. The agent now sets the ai_client operation type and response-model/total-token attributes expected by that view, but remote model-span delivery is still unverified. SerpApi discovery was tested separately and was disabled in the recorded run. Temporal is not running in this local-mode test. Previous worker-recovery evidence is separate in `evidence/temporal-recovery.json`.

Entire reports seven Codex hooks still awaiting user approval. Its recording is not verified. The existing GitHub Actions run succeeded: https://github.com/priy-anshugupta/DawnPatch/actions/runs/39769781939 — that run predates the uncommitted fixes described above.

## Verified repair workflow

**DawnPatch reproduced the SketchWild regression, built an isolated corrected candidate, and passed all eight browser steps.** The recorded repair was developer-assisted: a developer supplied the exact comparison change through the correction form, and DawnPatch independently built and verified it. The original repository remained unchanged.

| Validation | Result |
| --- | --- |
| Isolated candidate build | Passed |
| Candidate browser replay | All eight steps passed |
| Healthy upstream control | All eight steps passed; no patch generated |
| DawnPatch core and transport suite | 11 tests passed |
| DawnPatch desktop browser suite | 7 tests passed |

Verified candidate: run `1781753e-da72-495d-b892-76b52fcedab0`, outcome `patch_verified`, repair origin `developer`. Healthy control: `3051c7b6-723b-4c67-8fdb-31ca32c7197b`. The [video notes](demo/VIDEO_NOTES.md) describe the recording and its scope.

### Replayed behavior

1. Open **Outdoor missions**.
2. Select **Up to 5 minutes**.
3. Assert exactly one `.mission-card`.
4. Assert its title is **Find a shape you walk past**.
5. Select **Up to 20 minutes**.
6. Assert six mission cards.
7. Select **Courtyard or balcony garden**.
8. Assert four mission cards, confirming that the location filter is preserved.

The candidate restores the maximum-duration comparison from `>=` to `<=`. Running the same assertions against healthy upstream `main` confirms that an already-passing baseline completes without a proposed patch. An earlier healthy control, `54cd9d2d-4a50-4c48-8097-84dc8cc8fc82`, also completed as `not_reproduced`.

### Validation safeguards exercised

The checks caught an earlier Gemma equality proposal that satisfied the five-minute case but broke the twenty-minute case. Run `4f90e0fd-7041-4dc7-bf44-b11b52d5d611` remained `patch_failed`, with its evidence preserved. Filename grounding and exact-edit validation also rejected nonexistent-file and unchanged proposals. These results demonstrate the review and verification safeguards; the accepted correction in this demonstration was supplied by a developer.

## Desktop video preflight

Before the next live repair test, desktop typography was enlarged: navigation and body copy are 15 px, primary controls are 14 px, and metadata has a 12 px baseline. The dark console design is preserved. Dashboard panels wrap their footnotes, and comparison labels now use white text on a dark background rather than white on light gray.

The production build and eight core tests passed. Six browser tests passed, including a simulated connection outage that clears its banner after polling recovers. Desktop snapshots at 1366×768 and 1920×1080 recorded no page exceptions, no active error banners, and no horizontal page overflow. Report/evidence, schedule, and settings flows also passed. These checks used explicitly labeled reference repairs; Docker and Ollama remained stopped.

Additional preparation: missing patch files produce a readable message, sandbox startup polls detect containers that exit early, and CPU analysis has an explanatory status message. The new sandbox exit check still needs exercise in the next Docker integration run. The latest prompt revision still requires a live Gemma test. No error messages or failed repair results have been hidden for the demo.
