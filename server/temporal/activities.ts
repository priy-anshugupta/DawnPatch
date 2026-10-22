import { executeInvestigation } from "../runner.ts";
import { createRun, event } from "../db.ts";
import { Context } from "@temporalio/activity";
import type { RunInput } from "../../shared/types.ts";
export async function runInvestigation(id: string) {
  Context.current().heartbeat(id);
  const timer = setInterval(() => Context.current().heartbeat(id), 5000);
  try {
    await executeInvestigation(id);
  } finally {
    clearInterval(timer);
  }
}
export async function makeScheduledRun(input: RunInput) {
  const run = createRun(input);
  event(run.id, "queued", "Created by a Temporal schedule.");
  return run.id;
}
