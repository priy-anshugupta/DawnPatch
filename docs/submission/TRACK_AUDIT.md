# DawnPatch prize-category audit

This file checks every category listed on the Week 3 challenge page. An installed CLI, configured key, or code dependency is distinguished from demonstrated use.

| Challenge category | Project status | Submission treatment |
| --- | --- | --- |
| Best Use of Gemma | Gemma 3:4b ran locally through Ollama; invalid proposals were rejected. | Listed. The recorded successful correction is explicitly developer-assisted. |
| Best Use of Mastra | Typed source-gathering and local-model workflow is implemented and exercised. | Listed. |
| Best Use of Temporal | Actual worker termination/restart test completed; baselinePreserved=true. | Listed with docs/evidence/temporal-recovery.json. The recovery test uses a known fixture repair. |
| Best Use of SerpApi | Search discovery is implemented; prior live search returned results. | Listed. Search was disabled for the recorded SketchWild run. |
| Best Use of GitHub Copilot | GitHub Actions repository verification has a successful public run. | Listed through Actions, which the category permits. No invented Copilot coding session. |
| Best Use of ElevenLabs | Generated the actual narration; forced alignment also corrected subtitle timing. | Listed for demo narration, which the category permits. |
| Best Use of Sentry Agent Tracing | SDK instrumentation and local configuration exist; a successful flush does not verify the dashboard. | Listed with actual instrumentation described. Dashboard trace screenshot remains required before publication; dashboard delivery is not claimed. |
| Best Use of Entire | CLI installed; .entire/settings.json enables checkpoint configuration. No captured shareable session is verified. Shell hooks remain paused after the recording pop-up issue. | Listed at the author’s request. Shared session link remains required before publication; no verified recording is claimed. |
| Best Use of Render | No Render deployment; application runs locally. | Not entered. |
| Best Use of TabPFN | No TabPFN integration. | Not entered. |
| Best Use of Tinker | No Tinker fine-tuning. | Not entered. |
| Best Use of Arduino | No Arduino hardware integration. | Not entered. |
| Best Use of DigitalOcean | No DigitalOcean deployment or runtime. | Not entered. |
| Best Use of Auth0 for AI Agents | No Auth0 integration. | Not entered. |
| Best Use of Backboard | No Backboard integration. | Not entered. |
| Best Use of Browserbase | Browser automation uses local Playwright/Chromium. | Not entered. |
| Best Use of MongoDB Atlas | Persistence uses local SQLite. | Not entered. |
| Best Use of Ultramarine | No Ultramarine inference. | Not entered. |
| Best Use of a .tech Domain | No hosted .tech domain. | Not entered. |
| Best Use of Tiger Data | No Tiger Data integration. | Not entered. |

## Evidence links

- Temporal: docs/evidence/temporal-recovery.json — run 3ca7b773-6fad-41e7-bd3c-a40c86425afe, baseline preserved, patch_verified with an explicitly labeled reference repair.
- Actions: https://github.com/priy-anshugupta/DawnPatch/actions/runs/39769781939 — this public run predates the recent uncommitted fixes.
- Entire setup: .entire/settings.json. No Entire checkpoint branch was found in the checked local/origin Entire branch refs. This check does not establish that a session exists elsewhere.
- Recorded repair: docs/demo/VIDEO_NOTES.md and docs/SKETCHWILD_TEST_REPORT.md.
- Challenge requirements: https://dev.to/challenges/hacktoberfest-week3-2026-10-19

Eight categories are listed: six have supporting usage evidence, Entire requires a shared session link, and Sentry requires dashboard trace evidence. Their actual setup/instrumentation is described without claiming those missing artifacts. The remaining twelve categories have no corresponding project use. This is the complete twenty-category audit, not a claim to enter every category.
