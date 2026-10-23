import fs from "node:fs/promises";
import path from "node:path";
import { allRuns, createRun, event, getRun, patchRun } from "./db.ts";
import {
  prepare,
  preview,
  applyChanges,
  cleanup,
  workspace,
} from "./workspaces.ts";
import { capture, stopBrowser } from "./browser.ts";
import { diagnose } from "./agent.ts";
import { fixtureChange } from "./fixtures.ts";
import { searchDocs, traced } from "./integrations.ts";
import { config } from "./config.ts";
import type { RunInput, Change } from "../shared/types.ts";
let busy = false;
const inFlight = new Set<string>();
function active(id: string) {
  if (getRun(id).status === "cancelled")
    throw new Error("Investigation cancelled.");
}
async function stage<T>(
  id: string,
  name: string,
  message: string,
  fn: () => Promise<T>,
) {
  active(id);
  patchRun(id, { status: "running", stage: name, error: null });
  event(id, name, message);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await traced(name, id, fn);
      active(id);
      return result;
    } catch (e) {
      if (
        attempt === 1 ||
        !/429|502|503|ECONNRESET|fetch failed/i.test((e as Error).message)
      )
        throw e;
      event(
        id,
        name,
        "Transient provider failure. Retrying this stage once after a short backoff.",
      );
      await new Promise((r) => setTimeout(r, 1500));
      active(id);
    }
  }
  throw new Error("Stage retries exhausted.");
}
export async function executeInvestigation(id: string) {
  if (inFlight.has(id)) return;
  inFlight.add(id);
  try {
    let run = getRun(id);
    if (["awaiting_review", "completed", "cancelled"].includes(run.status))
      return;
    patchRun(id, { status: "running" });
    if (!run.baseSha) {
      const repo = await stage(
        id,
        "preflight",
        "Preparing an isolated source copy; original files remain untouched.",
        () => prepare(getRun(id)),
      );
      patchRun(id, { baseSha: repo.sha, repositoryName: repo.name });
    }
    run = getRun(id);
    if (!run.baseline) {
      const evidence = await stage(
        id,
        "reproducing",
        "Launching local Chromium and replaying the reproduction steps.",
        async () =>
          capture(
            getRun(id),
            "baseline",
            await preview(getRun(id), "baseline"),
          ),
      );
      patchRun(id, { baseline: evidence });
      event(
        id,
        "reproducing",
        evidence.passed
          ? "Baseline assertions passed; the reported failure was not reproduced."
          : "Captured the failing baseline and its browser trace.",
      );
    }
    run = getRun(id);
    if (run.baseline!.passed) {
      patchRun(id, {
        status: "completed",
        stage: "completed",
        outcome: "not_reproduced",
      });
      event(
        id,
        "completed",
        "No patch was generated because the baseline already passes.",
      );
      return;
    }
    const failure = run.baseline!.assertions.find((a) => !a.passed);
    if (
      failure &&
      !["text", "count", "visible", "hidden"].includes(
        run.input.steps[failure.step].type,
      )
    )
      throw new Error(
        "A reproduction action failed before its assertion. Check selectors and steps; this is not evidence of the reported bug.",
      );
    if (run.input.search && run.usage.searches === 0) {
      const sources = await stage(
        id,
        "researching",
        "Finding documentation candidates with SerpApi. Search snippets are labeled discovery context.",
        () =>
          searchDocs(`${run.input.title} ${run.input.recipe} documentation`),
      );
      patchRun(id, { sources, usage: { ...getRun(id).usage, searches: 1 } });
    }
    run = getRun(id);
    if (!run.diagnosis) {
      const diagnosis = await stage(
        id,
        "analyzing",
        run.input.engine === "fixture"
          ? "Applying the explicitly selected deterministic fixture repair. No model is used."
          : "Running evidence-grounded Gemma analysis through Mastra.",
        async () =>
          run.input.engine === "fixture"
            ? {
                summary:
                  "Known fixture defect reproduced and a minimal reference repair prepared.",
                hypothesis: run.input.description,
                changes: [fixtureChange(run.input.fixture)],
                limitations: [
                  "Deterministic fixture repair. This run does not demonstrate Gemma or Mastra inference.",
                ],
              }
            : diagnose(id),
      );
      patchRun(id, { diagnosis, changes: diagnosis.changes });
    }
    run = getRun(id);
    if (!run.changes.length) {
      patchRun(id, {
        status: "completed",
        stage: "completed",
        outcome: "needs_information",
      });
      event(
        id,
        "completed",
        "The model did not propose a supported patch. Review its limitations and add more context.",
      );
      return;
    }
    if (!run.candidateHash) {
      let hash: string;
      try {
        hash = await stage(
          id,
          "patching",
          "Validating exact edits and applying them only to the isolated candidate.",
          () => applyChanges(getRun(id), getRun(id).changes),
        );
      } catch (e) {
        if (run.input.engine !== "gemma" || getRun(id).status === "cancelled")
          throw e;
        event(
          id,
          "analyzing",
          "The proposed edit failed validation. Asking Gemma for one bounded correction; no change to the original repository.",
        );
        patchRun(id, { error: (e as Error).message });
        const corrected = await stage(
          id,
          "analyzing",
          "Correcting the rejected patch using its validation feedback.",
          () => diagnose(id),
        );
        patchRun(id, { diagnosis: corrected, changes: corrected.changes });
        hash = await stage(
          id,
          "patching",
          "Validating the corrected patch.",
          () => applyChanges(getRun(id), getRun(id).changes),
        );
      }
      patchRun(id, { candidateHash: hash });
    }
    run = getRun(id);
    if (!run.candidate) {
      const evidence = await stage(
        id,
        "verifying",
        "Replaying the same browser assertions against the patched candidate.",
        async () =>
          capture(
            getRun(id),
            "candidate",
            await preview(getRun(id), "candidate"),
          ),
      );
      patchRun(id, {
        candidate: evidence,
        checks: [
          {
            name: "Baseline regression assertion",
            passed: !run.baseline!.passed,
            detail: "Same recorded reproduction steps fail on the baseline.",
          },
          {
            name:
              run.input.recipe === "html" ? "Static preview" : "Isolated build",
            passed: true,
            detail:
              run.input.recipe === "html"
                ? "Served source from an isolated copy. No package scripts required."
                : "Docker build and preview health check completed.",
          },
          {
            name: "Candidate browser replay",
            passed: evidence.passed,
            detail: evidence.passed
              ? "All specified assertions pass."
              : "One or more assertions still fail.",
          },
        ],
      });
    }
    run = getRun(id);
    patchRun(id, {
      status: run.candidate!.passed ? "awaiting_review" : "completed",
      stage: "completed",
      outcome: run.candidate!.passed ? "patch_verified" : "patch_failed",
    });
    event(
      id,
      "completed",
      run.candidate!.passed
        ? "Candidate passes the specified reproduction checks. Review the diff; broader correctness still needs human review."
        : "Candidate did not pass verification. Evidence and the proposed patch are retained.",
    );
  } catch (e) {
    if (getRun(id).status !== "cancelled") {
      const message = (e as Error).message;
      patchRun(id, {
        status:
          /not installed|not running|not configured|SOURCE_ROOTS|not available|ECONNREFUSED|fetch failed/i.test(
            message,
          )
            ? "blocked"
            : "failed",
        error: message,
      });
      event(id, "error", message);
    }
  } finally {
    await cleanup(id);
    inFlight.delete(id);
  }
}
export async function cancelRun(id: string) {
  const run = getRun(id);
  if (run.publication)
    throw new Error("An already-published PR cannot be cancelled here.");
  patchRun(id, { status: "cancelled", stage: "cancelled" });
  event(
    id,
    "cancelled",
    "Cancellation requested; browser and sandbox resources are being released.",
  );
  await stopBrowser(id);
  await cleanup(id);
  return getRun(id);
}
export async function retryRun(id: string) {
  if (inFlight.has(id))
    throw new Error(
      "This run is still releasing resources. Wait for cleanup before resuming.",
    );
  const run = getRun(id);
  if (!["failed", "blocked", "cancelled"].includes(run.status))
    throw new Error("Only blocked, failed, or cancelled runs can resume.");
  patchRun(id, { status: "queued", error: null, stage: "queued" });
  event(
    id,
    "queued",
    "Resuming from persisted evidence and stage checkpoints.",
  );
  return getRun(id);
}
export async function reviewedCorrection(id: string, change: Change) {
  const run = getRun(id);
  if (config.engine !== "local")
    throw new Error(
      "Reviewed corrections currently require the local workflow engine.",
    );
  if (inFlight.has(id) || ["queued", "running"].includes(run.status))
    throw new Error("Wait for the current investigation to finish.");
  if (run.publication || run.approval)
    throw new Error(
      "An accepted or published candidate cannot be revised here.",
    );
  if (!run.baseline || run.baseline.passed || !run.baseSha)
    throw new Error("A reproduced failing baseline is required.");
  const correction = {
    file: change?.file,
    search: change?.search,
    replace: change?.replace,
  };
  if (Object.values(correction).some((value) => typeof value !== "string"))
    throw new Error(
      "Provide a source filename, exact old code and corrected code.",
    );
  // Validate with the same isolation and exact-match rules as model proposals.
  await applyChanges(run, [correction]);
  patchRun(id, {
    status: "queued",
    stage: "queued",
    outcome: "pending",
    error: null,
    repairOrigin: "developer",
    changes: [correction],
    candidateHash: null,
    candidate: null,
    checks: [],
    approval: null,
    diagnosis: {
      summary:
        "Developer-assisted correction submitted for independent browser verification.",
      hypothesis:
        "The developer supplied the exact source change below; the original repository is unchanged.",
      changes: [correction],
      limitations: [
        "This candidate was supplied by a developer after model proposals were rejected. It is not an autonomous Gemma repair. Verification covers the recorded browser assertions.",
      ],
    },
  });
  event(
    id,
    "queued",
    "Developer-assisted correction received. Replaying the saved assertions independently; this is not a model-generated repair.",
  );
  return getRun(id);
}
export async function enqueue(input: RunInput) {
  if (input.engine === "fixture" && input.source !== "fixture")
    throw new Error(
      "Deterministic fixture repair is available only for bundled fixtures.",
    );
  if (
    !input.steps.some((s) =>
      ["text", "visible", "hidden", "count"].includes(s.type),
    )
  )
    throw new Error(
      "Include at least one behavioral assertion, such as text or visible.",
    );
  const run = createRun(input);
  if (config.engine === "temporal") {
    try {
      const { temporalClient } = await import("./temporal/client.ts");
      const client = await temporalClient();
      await client.workflow.start("investigate", {
        taskQueue: config.queue,
        workflowId: `dawnpatch-${run.id}`,
        args: [run.id],
      });
      patchRun(run.id, { workflowId: `dawnpatch-${run.id}` });
    } catch {
      patchRun(run.id, {
        status: "blocked",
        error:
          "Temporal service is unavailable. Start the service and worker, then resume this investigation.",
      });
    }
  }
  return getRun(run.id);
}
export function startLocalQueue() {
  if (config.engine !== "local") return;
  for (const run of allRuns().filter((r) => r.status === "running")) {
    patchRun(run.id, { status: "queued" });
    event(
      run.id,
      "queued",
      "Recovered an interrupted run from SQLite checkpoints.",
    );
  }
  setInterval(async () => {
    if (busy) return;
    const run = allRuns()
      .reverse()
      .find((r) => r.status === "queued");
    if (!run) return;
    busy = true;
    try {
      await executeInvestigation(run.id);
    } finally {
      busy = false;
    }
  }, 1000).unref();
}
export async function related(id: string) {
  const current = getRun(id);
  const terms = new Set(
    `${current.input.title} ${current.input.description}`
      .toLowerCase()
      .match(/[a-z]{4,}/g) || [],
  );
  return allRuns()
    .filter((r) => r.id !== id && r.repositoryName === current.repositoryName)
    .map((run) => {
      const words = new Set(
        `${run.input.title} ${run.input.description}`
          .toLowerCase()
          .match(/[a-z]{4,}/g) || [],
      );
      const overlap = [...terms].filter((w) => words.has(w));
      return {
        id: run.id,
        title: run.input.title,
        outcome: run.outcome,
        score: overlap.length / Math.max(terms.size, 1),
        reason: `Shared terms: ${overlap.slice(0, 5).join(", ")}`,
      };
    })
    .filter((r) => r.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
export async function candidateFiles(id: string) {
  const run = getRun(id);
  return Promise.all(
    [...new Set(run.changes.map((c) => c.file))].map(async (file) => ({
      file,
      before: await fs.readFile(path.join(workspace(id), file), "utf8"),
      after: await fs.readFile(
        path.join(workspace(id, "candidate"), file),
        "utf8",
      ),
    })),
  );
}
