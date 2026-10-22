import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs/promises";
import { temporalClient } from "../server/temporal/client.ts";
import { createRun, patchRun, getRun, events } from "../server/db.ts";
import { fixtureInput } from "../server/fixtures.ts";
const queue = "dawnpatch-recovery-test";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function worker() {
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "server/temporal/worker.ts"],
    {
      env: { ...process.env, TEMPORAL_TASK_QUEUE: queue },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Worker startup timed out")),
      90000,
    );
    const output = (data: Buffer) => {
      const text = data.toString();
      if (text.includes("DawnPatch Temporal worker ready")) {
        clearTimeout(timer);
        resolve();
      }
    };
    child.stdout!.on("data", output);
    child.stderr!.on("data", output);
    child.once("exit", (code) => {
      clearTimeout(timer);
      if (code) reject(new Error(`Worker exited ${code}`));
    });
  });
  await sleep(1500);
  return child;
}
let child: ChildProcess | undefined;
try {
  const client = await temporalClient();
  child = await worker();
  const run = createRun({ ...fixtureInput("pagination"), engine: "fixture" });
  patchRun(run.id, {
    status: "blocked",
    error: "Recovery test uses a dedicated Temporal queue.",
  });
  const handle = await client.workflow.start("investigate", {
    taskQueue: queue,
    workflowId: `recovery-${run.id}`,
    args: [run.id],
  });
  const deadline = Date.now() + 90000;
  while (!getRun(run.id).baseline) {
    if (Date.now() > deadline) throw new Error("Baseline capture timed out");
    await sleep(200);
  }
  console.log(
    "Baseline persisted. Killing the worker to simulate an interruption.",
  );
  child.kill("SIGKILL");
  await sleep(1000);
  child = await worker();
  await Promise.race([
    handle.result(),
    sleep(90000).then(() => {
      throw new Error("Workflow recovery timed out");
    }),
  ]);
  const result = getRun(run.id);
  if (result.outcome !== "patch_verified")
    throw new Error(`Recovered run ended as ${result.status}: ${result.error}`);
  await fs.mkdir("docs/evidence", { recursive: true });
  await fs.writeFile(
    "docs/evidence/temporal-recovery.json",
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        runId: run.id,
        workflowId: handle.workflowId,
        baselinePreserved: true,
        outcome: result.outcome,
        events: events(run.id),
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS: ${run.id} resumed and verified the same candidate after worker termination.`,
  );
} finally {
  child?.kill("SIGKILL");
}
