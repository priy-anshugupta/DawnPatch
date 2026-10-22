# DawnPatch — verified build status

Date: October 22, 2026. This records observed results, not a claim that all partner categories have been earned.

## Implemented and locally exercised

- React workbench: review/history, investigation editor, report, evidence, comparison slider, diff/checks/activity, morning brief, schedules, settings, saved views.
- Local SQLite records and isolated baseline/candidate directories.
- Actual local Chromium reproduction, PNG capture, console summaries, trace export, same-step candidate replay.
- Three reference-repair cases: pagination state, empty results, form submission. Their original baselines fail and patched candidates pass. Reference mode is explicitly labeled and does not use a model.
- Portable patch exports tested with `git apply --check` against the baseline.
- Local Gemma inference through the actual Mastra analysis workflow, structured-output/edit validation, bounded correction, measured tokens/time, explicit error states.
- Actual local Temporal service and worker. The recovery test killed the worker after baseline persistence, restarted it, and verified that the original investigation completed. Evidence: `docs/evidence/temporal-recovery.json`.
- Mutation origin/header guards, source/edit path restrictions, candidate fingerprint approval checks, schedule timezone/deduplication.
- Dependency versions pinned. Local fonts bundled. Runtime dependency audit reported zero vulnerabilities at the time checked.

## Checks

| Check | Observed result |
|---|---|
| `npm run build` | Passed: TypeScript and Vite production bundle |
| `npm test` | Six core tests passed |
| `npm run test:e2e` | Five browser tests passed |
| `npx tsx scripts/temporal-recovery.ts` | Passed: worker termination and restart on the same case |
| `npm audit --omit=dev --audit-level=high` | Zero runtime dependency vulnerabilities reported |

The browser suite covers all three reference repairs, actual screenshot/trace retrieval, patch export, mutation guards, review, screenshot comparison, schedules and 390px layout. It does not grade model repair accuracy.

## Actual model outcomes

Four development attempts with **gemma3:1b** completed inference but did not yield a verified fix: proposed edits failed exact-source validation or structured output did not validate. The app retained failures and did not mark them fixed. These are development samples, not a representative benchmark. The evaluation JSON records actual runs, including those failures.

The **gemma3:4b** download was attempted but its network request timed out before installation completed. Its performance has not been tested. A more capable installed Gemma model needs to be selected and evaluated on real cases before describing model repair quality as ready. Resume the download with `ollama pull gemma3:4b`, or choose another suitable Gemma tag that fits the machine.

## Implemented paths needing real environment/account validation

| Path | Current limitation / owner action |
|---|---|
| Vite/Next.js isolated repository builds | Docker Desktop startup was requested; a healthy Linux engine and representative authorized repository are still required for end-to-end runner testing. |
| Sentry | Span/error and secret-redaction code exists; no DSN was provided, so remote delivery and dashboard presentation are unverified. |
| SerpApi | Real API path and connection test exist; no key was provided. Discovery snippets are not independently fetched primary documentation. |
| GitHub draft PR | Scoped approval/reconciliation path exists; no authorized repository/token was provided and no PR was published. |
| Entire | Manual supported-session capture is required. No prior coding session was retroactively fabricated. |
| Copilot / Actions | A real verification workflow is included. No remote Actions run or Copilot session has been claimed. |

## Assets

- `docs/screenshots/workbench-desktop.png`
- `docs/screenshots/workbench-mobile.png`
- `docs/screenshots/evidence-comparison.png`
- `docs/demo/dawnpatch-local-demo.webm`
- `docs/demo/README.md` identifies the exact engine/run used in the recording.
- `docs/evidence/local-evaluation.json`
- `docs/evidence/temporal-recovery.json`

The demo video shows real browser evidence with a known reference repair. It does not claim to demonstrate successful model-generated repair.

## Run and finish real testing

`npm start` serves the built local application at http://127.0.0.1:4310. Local default mode uses SQLite checkpoints. To use actual Temporal, start the local service/worker and set `WORKFLOW_ENGINE=temporal`, then restart the app.

See **REAL_TESTING_SETUP.md** for the exact sign-ins, keys, local prerequisites, and evidence needed. No hosting account, Auth0, Atlas, Browserbase, or Render setup is required.
