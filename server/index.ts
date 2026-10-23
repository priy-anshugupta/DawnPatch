import express from "express";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { config, dataDir, root } from "./config.ts";
import {
  allRuns,
  getRun,
  events,
  schedules,
  deleteSchedule,
  views,
  saveView,
  deleteView,
  patchRun,
  getKV,
  setKV,
} from "./db.ts";
import { createRunSchema, scheduleSchema } from "../shared/types.ts";
import { fixtureCases, fixtureInput } from "./fixtures.ts";
import {
  enqueue,
  cancelRun,
  retryRun,
  reviewedCorrection,
  startLocalQueue,
  related,
  candidateFiles,
} from "./runner.ts";
import { health, testSentry, searchDocs } from "./integrations.ts";
import {
  newSchedule,
  toggleSchedule,
  startScheduler,
  nextOccurrence,
} from "./scheduler.ts";
import {
  workspace,
  artifactDir,
  patchText,
  hashCandidate,
} from "./workspaces.ts";
import { importIssue, approve, publish } from "./github.ts";
const app = express();
app.disable("x-powered-by");
const savedModel = getKV("model");
if (savedModel) config.model = savedModel;
app.use((req, res, next) => {
  const hostname = req.hostname;
  if (!["127.0.0.1", "localhost", "::1"].includes(hostname))
    return res
      .status(403)
      .json({ error: "DawnPatch is a loopback-only local application." });
  const origin = req.headers.origin;
  if (
    origin &&
    ![
      "http://127.0.0.1:5173",
      "http://localhost:5173",
      `http://127.0.0.1:${config.port}`,
      `http://localhost:${config.port}`,
    ].includes(origin)
  )
    return res.status(403).json({ error: "Cross-origin access denied." });
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.headers["x-dawnpatch"] !== "local-workbench"
  )
    return res
      .status(403)
      .json({ error: "Missing local workbench request header." });
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});
app.use(express.json({ limit: "100kb" }));
app.get("/api/health", async (_req, res) => res.json(await health()));
app.get("/api/fixtures", (_req, res) =>
  res.json(
    Object.keys(fixtureCases).map((k) => ({
      key: k,
      ...fixtureInput(k as keyof typeof fixtureCases),
    })),
  ),
);
app.get("/api/runs", (_req, res) => res.json(allRuns()));
app.post("/api/runs/:id/correction", async (req, res) =>
  res.status(202).json(await reviewedCorrection(req.params.id, req.body)),
);
app.post("/api/runs", async (req, res) =>
  res.status(202).json(await enqueue(createRunSchema.parse(req.body))),
);
app.get("/api/runs/:id", (req, res) => res.json(getRun(req.params.id)));
app.get("/api/runs/:id/events", (req, res) =>
  res.json(events(req.params.id, Math.max(0, Number(req.query.after) || 0))),
);
app.get("/api/runs/:id/related", async (req, res) =>
  res.json(await related(req.params.id)),
);
app.get("/api/runs/:id/files", async (req, res) =>
  res.json(await candidateFiles(req.params.id)),
);
app.get("/api/runs/:id/patch", async (req, res) => {
  const run = getRun(req.params.id);
  res
    .type("text/plain")
    .attachment(`dawnpatch-${run.id.slice(0, 8)}.patch`)
    .send(await patchText(run));
});
app.get("/api/runs/:id/export", async (req, res) => {
  const r = getRun(req.params.id);
  const text = `# ${r.input.title}\n\nRun: ${r.id}\nOutcome: ${r.outcome}\nBase: ${r.baseSha}\nCandidate: ${r.candidateHash || "none"}\nModel: ${r.usage.model}\n\n## Observation\n${r.input.description}\n\n## Diagnosis\n${r.diagnosis?.summary || "Not generated"}\n\n${r.diagnosis?.hypothesis || ""}\n\n## Checks\n${r.checks.map((c) => `- ${c.passed ? "PASS" : "FAIL"} ${c.name}: ${c.detail}`).join("\n")}\n\n## Limitations\n${r.diagnosis?.limitations.join("\n") || "See browser assertions for the exact scope of verification."}\n\nSearch snippets are discovery context, not verified sources.\n${r.sources.map((s) => `- ${s.title}: ${s.url}`).join("\n")}\n\n## Usage\n${JSON.stringify(r.usage, null, 2)}\n`;
  res
    .type("text/markdown")
    .attachment(`dawnpatch-${r.id.slice(0, 8)}.md`)
    .send(text);
});
app.post("/api/runs/:id/cancel", async (req, res) =>
  res.json(await cancelRun(req.params.id)),
);
app.post("/api/runs/:id/retry", async (req, res) => {
  const run = await retryRun(req.params.id);
  if (config.engine === "temporal") {
    const { temporalClient } = await import("./temporal/client.ts");
    const c = await temporalClient();
    await c.workflow.start("investigate", {
      taskQueue: config.queue,
      workflowId: `dawnpatch-${run.id}-${Date.now()}`,
      args: [run.id],
    });
  }
  res.json(run);
});
app.post("/api/runs/:id/approve", async (req, res) => {
  if (typeof req.body.hash !== "string")
    throw new Error("Candidate hash is required.");
  res.json(await approve(req.params.id, req.body.hash));
});
app.post("/api/runs/:id/publish", async (req, res) =>
  res.json(await publish(req.params.id)),
);
app.post("/api/runs/:id/accept", async (req, res) => {
  const run = getRun(req.params.id);
  if (!run.candidateHash || run.outcome !== "patch_verified")
    throw new Error("Only verified candidates can be accepted.");
  if (run.candidateHash !== (await hashCandidate(run.id, run.changes)))
    throw new Error("Candidate changed; verification is stale.");
  res.json(
    patchRun(run.id, {
      status: "completed",
      approval: { hash: run.candidateHash, at: new Date().toISOString() },
    }),
  );
});
app.post("/api/issues/import", async (req, res) =>
  res.json(await importIssue(String(req.body.url || ""))),
);
app.get("/api/schedules", (_req, res) => res.json(schedules()));
app.post("/api/schedules", async (req, res) =>
  res.status(201).json(await newSchedule(scheduleSchema.parse(req.body))),
);
app.patch("/api/schedules/:id", async (req, res) => {
  if (typeof req.body.enabled !== "boolean")
    throw new Error("enabled must be boolean");
  res.json(await toggleSchedule(req.params.id, req.body.enabled));
});
app.delete("/api/schedules/:id", async (req, res) => {
  if (config.engine === "temporal") {
    const { temporalClient } = await import("./temporal/client.ts");
    await (await temporalClient()).schedule.getHandle(req.params.id).delete();
  }
  deleteSchedule(req.params.id);
  res.status(204).end();
});
app.post("/api/schedules/preview", (req, res) => {
  const s = scheduleSchema.parse(req.body);
  let d = new Date();
  const result = [];
  for (let i = 0; i < 3; i++) {
    const next = nextOccurrence(s.hour, s.minute, s.timezone, d);
    result.push(next);
    d = new Date(next);
  }
  res.json(result);
});
app.get("/api/views", (_req, res) => res.json(views()));
app.post("/api/views", (req, res) => {
  const { name, query, filter } = req.body;
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 80 ||
    typeof query !== "string" ||
    query.length > 200 ||
    typeof filter !== "string"
  )
    throw new Error("Invalid saved view.");
  res
    .status(201)
    .json(saveView({ id: crypto.randomUUID(), name, query, filter }));
});
app.delete("/api/views/:id", (req, res) => {
  deleteView(req.params.id);
  res.status(204).end();
});
app.post("/api/connections/sentry/test", async (_req, res) =>
  res.json(await testSentry()),
);
app.post("/api/connections/serpapi/test", async (_req, res) =>
  res.json(await searchDocs("site:developer.mozilla.org Array filter")),
);
app.put("/api/settings/model", (req, res) => {
  if (
    typeof req.body.model !== "string" ||
    !/^gemma[\w.:-]*$/i.test(req.body.model)
  )
    throw new Error("Choose a Gemma model ID.");
  config.model = req.body.model;
  setKV("model", config.model);
  res.json({ model: config.model });
});
app.get("/artifacts/:id/:file", (req, res) => {
  getRun(req.params.id);
  if (!/^(baseline|candidate)\.(png|zip)$/.test(req.params.file))
    return res.sendStatus(404);
  res.sendFile(path.join(artifactDir(req.params.id), req.params.file), {
    dotfiles: "allow",
  });
});
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "API endpoint not found" }),
);
if (fs.existsSync(path.join(root, "dist"))) {
  app.use(express.static(path.join(root, "dist")));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.join(root, "dist", "index.html")),
  );
}
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const error = err as {
      message?: string;
      status?: number;
      issues?: unknown;
    };
    res.status(error.status || 400).json({
      error: error.message || "Request failed",
      ...(error.issues ? { issues: error.issues } : {}),
    });
  },
);
// Untrusted previews use a different origin from the control API.
const previews = express();
previews.disable("x-powered-by");
previews.use((req, res, next) => {
  if (!["127.0.0.1", "localhost", "::1"].includes(req.hostname))
    return res.sendStatus(403);
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});
previews.use("/fixture/:id/:side", (req, res, next) => {
  try {
    getRun(req.params.id);
    if (!["baseline", "candidate"].includes(req.params.side))
      return res.sendStatus(404);
    return express.static(workspace(req.params.id, req.params.side), {
      dotfiles: "deny",
      index: "index.html",
    })(req, res, next);
  } catch {
    return res.sendStatus(404);
  }
});
previews.listen(config.port + 1, "127.0.0.1");
app.listen(config.port, "127.0.0.1", () => {
  console.log(`DawnPatch local workbench: http://127.0.0.1:${config.port}`);
  console.log(
    `Data: ${dataDir} · Engine: ${config.engine} · Model: ${config.model}`,
  );
  startLocalQueue();
  startScheduler();
});
