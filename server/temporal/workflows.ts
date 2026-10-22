import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "./activities.ts";
import type { RunInput } from "../../shared/types.ts";
const tasks = proxyActivities<typeof activities>({
  startToCloseTimeout: "20 minutes",
  heartbeatTimeout: "20 seconds",
  retry: { maximumAttempts: 2 },
});
export async function investigate(id: string) {
  await tasks.runInvestigation(id);
}
export async function scheduledInvestigation(input: RunInput) {
  const id = await tasks.makeScheduledRun(input);
  await tasks.runInvestigation(id);
}
