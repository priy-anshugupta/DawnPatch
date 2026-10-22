import * as Sentry from "@sentry/node";
import net from "node:net";
import { config } from "./config.ts";
import { exec } from "./workspaces.ts";
function redact<T>(value: T): T {
  let text = JSON.stringify(value);
  for (const key of ["SERPAPI_API_KEY", "GITHUB_TOKEN", "SENTRY_AUTH_TOKEN"]) {
    const secret = process.env[key];
    if (secret) {
      text = text
        .split(secret)
        .join("[redacted]")
        .split(encodeURIComponent(secret))
        .join("[redacted]");
    }
  }
  text = text.replace(/api_key=[^&"\s]+/gi, "api_key=[redacted]");
  return JSON.parse(text);
}
if (process.env.SENTRY_DSN)
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: "local",
    tracesSampleRate: 1,
    beforeSend(e) {
      delete e.request;
      return redact(e);
    },
    beforeSendTransaction(e) {
      delete e.request;
      return redact(e);
    },
  });
export async function traced<T>(
  name: string,
  runId: string,
  fn: () => Promise<T>,
): Promise<T> {
  return Sentry.startSpan(
    { name, op: "dawnpatch.stage", attributes: { "dawnpatch.run_id": runId } },
    async () => {
      try {
        return await fn();
      } catch (e) {
        if (process.env.SENTRY_DSN)
          Sentry.captureException(e, { tags: { runId } });
        throw e;
      }
    },
  );
}
export async function searchDocs(query: string) {
  if (!process.env.SERPAPI_API_KEY)
    throw new Error(
      "SerpApi is not configured. Set SERPAPI_API_KEY in .env or disable documentation search for this investigation.",
    );
  const params = new URLSearchParams({
    engine: "google",
    q: query.slice(0, 250),
    api_key: process.env.SERPAPI_API_KEY,
    num: "5",
  });
  const response = await fetch(`https://serpapi.com/search.json?${params}`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new Error(
      `SerpApi returned ${response.status}; check the key and quota.`,
    );
  const data = (await response.json()) as {
    error?: string;
    organic_results?: { title: string; link: string; snippet?: string }[];
  };
  if (data.error)
    throw new Error(
      "SerpApi could not complete the search; check account quota.",
    );
  return (data.organic_results || [])
    .filter((r) => r.link.startsWith("https://"))
    .slice(0, 5)
    .map((r) => ({ title: r.title, url: r.link, snippet: r.snippet || "" }));
}
async function portOpen(port: number) {
  return new Promise<boolean>((resolve) => {
    const s = net.createConnection({ port, host: "127.0.0.1" });
    s.setTimeout(1200);
    s.on("connect", () => {
      s.destroy();
      resolve(true);
    });
    s.on("error", () => resolve(false));
    s.on("timeout", () => {
      s.destroy();
      resolve(false);
    });
  });
}
export async function health() {
  let models: string[] = [];
  let ollama = false;
  try {
    const r = await fetch(`${config.ollama}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (r.ok) {
      const data = (await r.json()) as { models: { name: string }[] };
      models = data.models.map((m) => m.name);
      ollama = true;
    }
  } catch {}
  let docker = false;
  try {
    await exec("docker", ["info", "--format", "{{.ServerVersion}}"], {
      timeout: 4000,
    });
    docker = true;
  } catch {}
  const temporal = await portOpen(Number(config.temporal.split(":").pop()));
  let entire = false;
  try {
    await exec("entire", ["version"], { timeout: 2000 });
    entire = true;
  } catch {}
  return {
    model: config.model,
    models,
    ollama,
    docker,
    workflowEngine: config.engine,
    sourceRoots: config.roots,
    connections: [
      {
        id: "gemma",
        name: "Gemma / Ollama",
        status: models.includes(config.model)
          ? "ready"
          : ollama
            ? "setup"
            : "offline",
        detail: models.includes(config.model)
          ? `${config.model} available locally`
          : ollama
            ? `Run ollama pull ${config.model}`
            : "Start Ollama on this computer",
        track: true,
      },
      {
        id: "mastra",
        name: "Mastra",
        status: "ready",
        detail: "Typed local analysis workflow installed",
        track: true,
      },
      {
        id: "temporal",
        name: "Temporal",
        status: temporal ? "ready" : "setup",
        detail: temporal
          ? `${config.temporal} reachable; start npm run worker`
          : "Local service required for Temporal mode; SQLite recovery works independently",
        track: true,
      },
      {
        id: "sentry",
        name: "Sentry Agent Tracing",
        status: process.env.SENTRY_DSN ? "configured" : "setup",
        detail: process.env.SENTRY_DSN
          ? "DSN configured; verify traces in your project"
          : "Set SENTRY_DSN to send sanitized run spans",
        track: true,
      },
      {
        id: "serpapi",
        name: "SerpApi",
        status: process.env.SERPAPI_API_KEY ? "configured" : "setup",
        detail: process.env.SERPAPI_API_KEY
          ? "Key configured; validated when a search runs"
          : "Set SERPAPI_API_KEY for documentation discovery",
        track: true,
      },
      {
        id: "entire",
        name: "Entire",
        status: entire ? "configured" : "setup",
        detail: entire
          ? "CLI found; enable and capture a supported development session"
          : "Install a supported Entire CLI / agent pairing",
        track: true,
      },
      {
        id: "copilot",
        name: "GitHub Copilot / Actions",
        status: "manual",
        detail: "Review actual development or Actions run evidence",
        track: true,
      },
      {
        id: "github",
        name: "GitHub publication",
        status: process.env.GITHUB_TOKEN ? "configured" : "setup",
        detail: process.env.GITHUB_TOKEN
          ? "Token configured; access checked on publication"
          : "Set GITHUB_TOKEN only if you want to publish draft PRs",
        track: false,
      },
    ],
    local: {
      database: "SQLite (WAL)",
      browser: "Local Playwright",
      artifacts: "Local filesystem",
      previewPort: config.port + 1,
    },
  };
}
export async function testSentry() {
  if (!process.env.SENTRY_DSN) throw new Error("Set SENTRY_DSN in .env first.");
  const id = await Sentry.startSpan(
    { name: "DawnPatch connection check", op: "dawnpatch.check" },
    () => Sentry.captureMessage("DawnPatch local integration test", "info"),
  );
  const flushed = await Sentry.flush(5000);
  return {
    eventId: id,
    flushed,
    message: flushed
      ? "Transport flushed; confirm the event and trace in Sentry."
      : "Transport did not flush before timeout.",
  };
}
