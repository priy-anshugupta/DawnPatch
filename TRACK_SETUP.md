# DawnPatch — seven local-build tracks

This local architecture replaces the earlier eleven-track hosted setup. No Render, Auth0, MongoDB Atlas, Browserbase, or .tech domain is required.

| Track | Setup | Proof |
|---|---|---|
| Gemma | Ollama and selected local Gemma model | Actual inference and measured patch outcomes |
| Mastra | npm dependencies, no account/key | Executed typed analysis workflow |
| Temporal | Local CLI/service and worker, no cloud key | Worker interruption/recovery and schedules |
| Sentry Agent Tracing | Your project DSN in SENTRY_DSN | Live run/model spans and debugging finding |
| SerpApi | Your key in SERPAPI_API_KEY | Real discovery request and useful results |
| Entire | Supported CLI/agent setup and authorization | Real reviewed development session |
| GitHub Copilot / Actions | Actual Copilot contribution or run the included Actions workflow | Reviewed contribution or executed workflow proof |

See REAL_TESTING_SETUP.md for detailed sign-ins, private configuration, and testing handoff. Sentry, SerpApi and GitHub need internet even though the app/model are local.

Real Vite/Next.js testing requires Docker Desktop and SOURCE_ROOTS. Draft PR testing requires a narrowly scoped GITHUB_TOKEN and explicit candidate review. No fixture test publishes a PR.

Keep secrets in ignored .env, not in chat, Git, screenshots or shared traces. Configured credentials are not automatically tested integrations. Entire sessions, Copilot use and Actions runs must not be fabricated.
