# DawnPatch — Complete Local Product Specification

Version 3.0 · October 22, 2026 · Local application and local Gemma inference

> Go to sleep with issues. Wake up with evidence and proposed fixes.

This replaces the earlier hosted architecture. Implement the complete local product described here, without deferred feature phases. Account-dependent checks remain explicitly unverified until exercised. Measured implementation results belong in docs/BUILD_STATUS.md.

## 1. Product

DawnPatch is a local maintainer workbench for investigating website bugs. It starts with a report and explicit reproduction steps, captures the original failure in Chromium, uses local Gemma to propose a minimal source change, applies it to an isolated copy, and repeats the same behavioral checks. The maintainer reviews screenshots, assertions, a diff, and limitations before accepting the work or authorizing a draft PR.

The problem is repetitive investigation: reproducing a bug, collecting evidence, connecting it to source, trying a change, and checking the result. The payoff is a review packet, not an unsupported claim that AI fixed something.

DawnPatch is not an accessibility scanner. Its input is an application-specific bug and behavioral assertion rather than an axe-core finding. Evidence, bounded repair, and human review overlap with existing agents such as the supplied A11ySwarm description. Do not claim uniqueness or superiority without comparative evidence.

## 2. Final architecture decisions

- Run the UI, API, worker, browser, database, artifacts, and model on the user's computer.
- Local Playwright/Chromium replaces Browserbase. SQLite and local files replace Atlas.
- No hosted application, Render, Auth0, SaaS accounts, tenant dashboard, or .tech domain.
- Seven targets: Gemma, Mastra, Temporal, Sentry Agent Tracing, SerpApi, Entire, GitHub Copilot / qualifying GitHub Actions use.
- Sentry, SerpApi, GitHub, dependency installation, and session sharing can require internet. Local inference does not imply every integration works offline.
- No audio-generation feature or unrelated integrations for category count.
- Demonstrate through source, reproducible setup, genuine screenshots, and an accurately labeled video.

## 3. Users and jobs

The user is a maintainer with a clean authorized checkout who wants to delegate investigation and retain the final decision. A contributor/judge should be able to install the tool or inspect its recorded evidence and distinguish model runs from reference fixtures.

Jobs: reproduce a report on a pinned revision; prepare a bounded candidate; compare before/after behavior; resume interrupted work; schedule investigations; read a brief; export a patch/report; explicitly publish a draft PR.

## 4. Complete workflow

### Local startup

Install npm dependencies and Chromium, start Ollama, pull a Gemma model, build the UI, and run the app. Health checks explain missing prerequisites. Three bundled Fieldnotes bugs exercise pagination state, search empty state, and form submission.

### Start an investigation

Select a fixture or authorize a local repository under SOURCE_ROOTS. For repositories, use a clean Git checkout and select Static HTML, React/Vite, or Next.js. Supply report title/body and typed steps: click, fill, select, text, visible, hidden, count. Require at least one assertion. Optional GitHub issue import fills report content; it does not grant filesystem authority.

Fixtures offer local Gemma analysis or an explicit reference-repair mode. Reference mode has real browser evidence but a known deterministic patch. Retain that label everywhere; never count it as model inference.

### Reproduce

Copy allowed source into a run directory, pin Git HEAD, start the approved preview, replay steps, and capture assertions, screenshot, console, trace, viewport, and duration. A passing baseline yields Not reproduced and no patch. Failed navigation/build/click is an execution failure, not proof of the reported bug.

### Analyze and patch

The Mastra workflow gathers bounded source context and calls actual local Gemma through Ollama. Model output must validate against the diagnosis schema. Treat source/report/search content as untrusted data. Apply at most five exact, unique substring edits to existing allowed source files. Reject path escapes, secrets, manifests, generated outputs, and build configuration changes. Allow one bounded correction for invalid edits.

### Verify

Run the candidate preview and the identical browser checks. Only baseline failure followed by candidate success can yield Patch verified. Show successful build/preview and supplied assertion scope; do not imply full regression coverage. A screenshot difference is supporting evidence, not the pass/fail authority.

### Review and publish

Present observations separately from hypotheses. Show before/after screenshots, comparison slider, original trace download, assertions, console, portable diff, checks, model identity/usage, and limitations. Accept locally keeps the candidate in local storage; it never edits the original checkout.

Draft PR publication is a separate explicit action. Display destination, base revision, candidate fingerprint, and file count. Require scoped credentials, fresh exact-candidate approval, unchanged remote default-branch SHA, and reconciliation of an existing branch/PR. No automatic merges, issue closure, or force pushes.

## 5. Functional requirements and acceptance

| ID | Requirement | Acceptance |
|---|---|---|
| F01 | Local runtime | Loopback app, bundled fonts, honest health states, no hosted model dependency. |
| F02 | Input | Validated report/actions and behavioral assertion; optional GitHub issue import. |
| F03 | Source isolation | Authorized real paths, clean Git tree, pinned HEAD, bounded tracked-source copy, original unchanged. |
| F04 | Recipes | Static HTML plus Docker Vite/Next.js build/preview, readiness timeout, cleanup. |
| F05 | Evidence | Real original screenshot, trace, actions/assertions, console, viewport, timing. |
| F06 | Model | Actual configured Gemma through typed Mastra workflow; validated hypothesis and edits. |
| F07 | Edit policy | Five exact source edits maximum; denied paths and nonunique matches rejected. |
| F08 | Verification | Same baseline/candidate checks; passing/failed/unavailable results accurately represented. |
| F09 | Review | Report, screenshots, comparison, diff, checks, local acceptance and export. |
| F10 | Recovery | SQLite checkpoints plus actual Temporal backend; preserve baseline after a killed worker. |
| F11 | Cancellation | Stop model/browser execution, release containers, prevent resume before cleanup. |
| F12 | Retries | One transient-provider retry and one invalid-edit correction, with visible events. |
| F13 | Schedules | Daily case template, IANA timezone, next-three preview, pause/resume/delete, occurrence deduplication. |
| F14 | Briefs | Date-filtered real outcomes with case links and Markdown export, including failures. |
| F15 | History | Search, repository/outcome filters, saved views, lexical related-case matches with explanations. |
| F16 | Search | Opt-in SerpApi results, sources/query count/quota errors, snippets explicitly labeled discovery. |
| F17 | Tracing | Real run/stage/model spans, available token attributes, secret redaction, connection test. |
| F18 | Publication | Exact approval, current base check, branch/PR reconciliation, no merge. |
| F19 | Development proof | Actual Entire session or qualifying Copilot/Actions evidence; never fabricated provenance. |
| F20 | Submission | Source/setup, genuine screenshots/video, measured results, real proof for entered categories. |

## 6. States and progress

Execution states: queued, running, awaiting_review, completed, blocked, failed, cancelled.
Stages: preflight → reproducing → researching when enabled → analyzing → patching → verifying → completed.
Outcomes: pending, not_reproduced, needs_information, patch_verified, patch_failed.

State and outcome are separate. A completed investigation can mean no reproduced bug. Infrastructure failure never becomes a factual conclusion about the issue. Keep the last evidence and stage after failure.

Show stage events, timestamps, and a stale-event notice after 30 seconds. State the last activity rather than showing an indefinite unexplained thinking animation. Explicit model/build timeouts bound work.

## 7. Architecture and execution

Browser → loopback Express API → SQLite and local artifacts.
API → local checkpoint queue OR local Temporal → TypeScript worker.
Worker → Mastra analysis workflow → Ollama Gemma.
Worker → local Playwright Chromium → isolated preview.
Worker → optional SerpApi and Sentry. Explicit publication → GitHub API.

Stack: React/TypeScript/Vite, Express, node:sqlite, Playwright, Mastra, Temporal TypeScript SDK, Sentry Node SDK, and Ollama API. Lock tested dependencies.

Ports: application/API 4310, separate preview origin 4311, Vite 5173, Ollama 11434, Temporal 7233, Temporal UI 8233. Bind application surfaces to loopback. Never give untrusted preview scripts the API origin.

Temporal owns durable activities and schedules when selected. Mastra gathers typed context and executes the model step within an activity. All network, model, browser, and filesystem side effects stay outside deterministic workflow code. Default local SQLite mode is visibly distinct from actual Temporal execution.

Local schedules require the app running. Daily schedules operate per case; separate schedules cover multiple issues/repositories. Skip missed local occurrences older than one minute to avoid a backlog. Persist a unique occurrence key. Pausing a schedule does not silently cancel an active investigation.

## 8. Source, runner, and model limits

Authorize resolved SOURCE_ROOTS paths and copy allowed tracked regular files from a clean checkout. Bound to 1,500 files and 20 MB. Exclude symlinks, .git, .env variants, private key files, dependencies, generated directories, and DawnPatch data. Model input is capped at 25 eligible files and roughly 40,000 source characters; relevant source can be omitted by that cap.

Static HTML uses a copied directory. Vite/Next.js commands run in a disposable Linux Docker container, with capped CPU/memory/PIDs, dropped capabilities, and no injected control-plane secrets. Use a temporary loopback preview and remove the container after capture/cancellation. Dependency downloads require registry access. No repository package command executes directly on the host.

This is a trusted local developer application, not a hardened public multi-tenant execution service. Do not expose it to arbitrary remote clients or assume origin isolation makes untrusted repository code safe.

Require the configured installed Gemma; never silently use Llama or a closed API. Record model and actual reported usage. A small model can produce plausible wrong edits: validation and behavioral verification remain mandatory. Local compute cost is Not measured, not fabricated zero cost.

## 9. Data and APIs

Store under ignored .dawnpatch/: SQLite WAL database, per-run baseline/candidate copies, PNG screenshots, and Playwright ZIP traces. Records: runs with input/revision/state/evidence/diagnosis/checks/usage/approval/publication; ordered stage events; schedules; unique occurrences; saved views; nonsecret model settings and publication reconciliation references. Credentials remain in environment configuration.

API surface:
- GET /api/health, /fixtures, /runs, /runs/:id.
- POST /api/runs and /api/runs/:id/cancel, /retry, /accept, /approve, /publish.
- GET /api/runs/:id/events, /related, /files, /patch, /export.
- POST /api/issues/import.
- GET/POST /api/schedules; PATCH/DELETE /api/schedules/:id; POST /api/schedules/preview.
- GET/POST /api/views; DELETE /api/views/:id.
- PUT /api/settings/model; POST /api/connections/sentry/test and /serpapi/test.
- GET /artifacts/:id/:file with an explicit artifact-name allowlist.

Validate schemas, Host and Origin; require X-DawnPatch: local-workbench for mutations. No arbitrary filesystem, shell, or URL-fetch endpoint. Export repository-relative patches that can be applied to the original base.

## 10. Detailed interface

### Visual direction

A quiet maintainer desk with warm paper canvas, cream sidebar, white bordered panels, forest-green actions, restrained ochre accents, bundled DM Sans interface text and Instrument Serif editorial headings. Identity comes from typography, spacing, readable evidence, and exact state labels. No chat-first dashboard, purple gradients, glowing AI effects, fake activity, or partner-logo wall.

### Shell and queue

Desktop sidebar: personal workspace, Review queue, Investigations, Morning brief, Schedules, Settings & connections. Topbar: breadcrumb and actual local-model status. Mobile navigation drawer.

Queue: editorial heading, Investigate issue action, actual ready/running/blocked counts, row-based cases, search/repository/state filters, saved views, and fixture cards. Rows show title, repository, run ID, outcome, evidence availability, and update time. Empty/filtered-empty states provide clear next actions.

### Investigation editor

Accessible modal: fixture/repository selection, optional GitHub issue import, authorized path/recipe, title/report, typed step editor, engine selection, viewport, opt-in search. Reference engine is restricted to fixtures and clearly explained. Preserve form data on errors. A run requires an assertion.

### Investigation review

Header: issue/repository/run, outcome, export, cancel/resume. Active stage tracker shows concrete milestones and silence notice. Tabs: Overview, Browser evidence, Patch, Checks, Activity.

Overview separates Observed, Hypothesis, Verification, and Limitations. A metadata column shows pinned revision, actual model, recipe, viewport, tokens/time/cost status and evidence preview. Do not display a diagnostic hypothesis as observed fact.

Evidence: baseline/candidate toggles, original screenshots, same-viewport comparison slider, trace download, assertion failures and console messages. Patch: additions/deletions, long-line scroll, portable download. Checks: exact build/behavior scope, failures and limitations. Activity: ordered actual events and timestamps.

### Review action

Accept locally preserves the candidate only. Publish draft PR opens a specific confirmation with repository/base/candidate hash/file count. Explain the write; return the actual PR link or actionable failure. No vague Continue action or automatic publication.

### Brief and schedules

Brief: date-filtered editorial handoff with real successes, failures, missing information and Markdown export. Schedule: daily template, time/timezone, next-three occurrence preview, pause/resume/delete, and a clear computer-must-stay-on notice. No invented time-saved metrics.

### Connections

Show local runtime, model selection, Docker availability, SOURCE_ROOTS, and seven integration states. Distinguish Ready, Configured but unverified, Setup needed, Offline, and Evidence required. Provide actual Sentry/SerpApi tests and setup guidance. Never display secret values or invent development sessions.

### Accessibility and responsiveness

Semantic buttons/tables/headings, field labels, readable contrast, visible keyboard focus, trapped/restored modal focus, Escape dismissal, non-color state labels, and reduced motion. At 390px the page must not overflow horizontally; code/tables may scroll inside their panels. Show loading, failure, blocked, empty, and success states without losing the next action.

## 11. Research and tracing integrity

Instrument actual stage and model spans; record model ID and available tokens, not prompts/source/responses. Redact configured credentials from errors, transactions, and search URL parameters. Show a real debugging finding before claiming Sentry evidence.

SerpApi is opt-in discovery. Store title/URL/snippet and query count. Current snippets are not independently fetched/version-verified documentation and must be labeled accordingly. Do not claim authoritative citations from snippets alone.

## 12. Verification requirements

Build/typecheck; path/edit restrictions; isolated writes; unique edit matching; stale-approval rejection; schedule timezones/deduplication; all three fixture baseline failures and candidate passes; screenshot/trace access; portable patch export; cross-origin mutation guards; desktop/mobile review; schedule create/preview; and actual Temporal worker-kill/restart recovery.

Separate model evaluations from reference-fix tests. Publish failed model attempts and scope limitations. Do not claim a broad benchmark unless it ran. Docker repository builds, remote publication, Sentry transport/dashboard, SerpApi quota/results, Entire recording, and Actions execution need the appropriate local runtime or account.

## 13. Seven-track proof

| Track | Role | Required proof |
|---|---|---|
| Gemma | Local diagnosis and edits | Actual model/outputs/usage, successful and unsuccessful cases |
| Mastra | Typed analysis orchestration | Executed context/model workflow tied to a real run |
| Temporal | Durable activities and schedules | Original run resumes after worker termination with preserved evidence |
| Sentry Agent Tracing | Performance/failure visibility | Real spans, available usage and an actual debugging finding |
| SerpApi | Case-specific discovery | Real search and useful results with stated limitations |
| Entire | Development provenance | Supported recorded session and decision explanation |
| GitHub Copilot / Actions | Development automation | Actual reviewed contribution or executed qualifying workflow |

No hosting-related category is included. The overall award is separate. Category claims require real evidence, not installed packages or keys alone.

## 14. Completion

The local workbench, evidence pipeline, model patch path, verification, review/export, persistence, cancellation, schedules/history/briefs and actual Temporal integration must function. Account-dependent services remain explicit testing prerequisites until exercised. No silent scope cuts or fabricated integration success.

Use README.md for commands, REAL_TESTING_SETUP.md for owner actions, and docs/BUILD_STATUS.md for measured state. Official category/submission reference: https://dev.to/challenges/hacktoberfest-week3-2026-10-19. Implementation uses official Ollama, Mastra, Temporal, Playwright, Sentry and SerpApi SDK/API documentation.
