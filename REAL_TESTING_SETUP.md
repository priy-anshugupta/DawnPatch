# DawnPatch — what is needed from you for real integration testing

The project runs locally. No hosting, Render, Auth0, Atlas, Browserbase account, or .tech domain is required. Do not send passwords, MFA codes, recovery codes, or API secrets in chat. Put service credentials in the ignored `.env` file and restart the app/worker.

## Local essentials

- **Gemma:** no sign-in/API key is needed for local Ollama inference. Gemma models are installed on this machine; select the tested model in Settings. Keep Ollama running. Model quality depends on available memory and the code/task.
- **Mastra:** installed in the project. No separate account/key is required for this local workflow.
- **Temporal:** the local service needs no sign-in/key. Start it with `npm run temporal:dev`; run `npm run worker` and choose `WORKFLOW_ENGINE=temporal` in `.env` to exercise that backend. The default local queue remains clearly distinguished from Temporal.
- **Repository testing:** start Docker Desktop's Linux engine for React/Vite/Next.js builds. Provide a clean local repository path and authorize its parent under `SOURCE_ROOTS`. Tell me which real issue and expected behavior to test. Static fixtures work without Docker.

## Service accounts and proof

### Sentry Agent Tracing

1. Sign in to Sentry and create/select an organization and Node.js project.
2. Put its DSN in `.env` as `SENTRY_DSN`.
3. Restart the app/worker; use Settings → Test, then run a real Gemma investigation.
4. Confirm the event, stage spans, model span and usage attributes in your project. Preserve a redacted trace screenshot and an actual debugging observation.

No upload token is required by the current build because source-map uploads are not configured. Account quota/entitlements and agent-specific dashboard presentation need live verification.

### SerpApi

1. Sign in and obtain your search API key.
2. Put it in `.env` as `SERPAPI_API_KEY`.
3. Restart, use Settings → Test, then enable documentation research for an investigation.
4. Check the actual search results and quota consumption. The UI labels these as discovery snippets rather than independently verified documentation.

### Entire

1. Choose a currently supported installer, operating environment, and coding-agent pairing from the official Entire docs.
2. Complete any login/authorization required by that actual tool.
3. Capture a real development or debugging session for DawnPatch and review it for secrets.
4. Supply a shareable session or supported evidence artifact. No session was retroactively fabricated for work completed before capture was enabled.

Compatibility with this Windows setup and public sharing must be checked against your chosen Entire release. No runtime API key is used by DawnPatch for Entire.

### GitHub Copilot / GitHub Actions

The project contains a real Actions workflow. To test it, create/select the GitHub repository, authorize pushing the source, enable Actions, and run the workflow. Provide its run link after it executes. This route is listed in the challenge category; call it Actions evidence unless Copilot itself was used.

If you choose actual Copilot assistance, sign in with an account that has access, run a meaningful development/review task, and retain the reviewed contribution/session evidence. Codex-written code is not Copilot evidence.

### Optional GitHub draft PR test

Provide your own disposable or approved repository with a clean checkout at its current default-branch revision. Configure `GITHUB_TOKEN` with only the permissions required to read the repository, write a new branch, and create pull requests. For private issue import, include appropriate issue read access. Review and approve the exact candidate in the app before publication. No test will merge anything.

## What to tell me after configuring

- “Sentry and SerpApi are configured in .env.” No secret values needed in chat.
- The local repository path, framework recipe, issue URL or report, and expected reproduction steps.
- Whether Docker Desktop is running.
- The Entire capture method/session link and GitHub Actions run link, when available.
- Whether you want to exercise draft PR publication against the specified repository.

Screenshots and a demo video can show the local workflow. Each claimed track still needs genuine executed use. An installed package, configured key, or unexecuted Actions file is not proof of a working integration.
