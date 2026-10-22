import crypto from "node:crypto";
import { schedules, saveSchedule, claimOccurrence, event } from "./db.ts";
import { enqueue } from "./runner.ts";
import type { RunInput, Schedule } from "../shared/types.ts";
import { config } from "./config.ts";
export function localParts(date: Date, timezone: string) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => p.find((v) => v.type === t)?.value || "";
  return {
    day: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}
export function nextOccurrence(
  hour: number,
  minute: number,
  timezone: string,
  after = new Date(),
) {
  const d = new Date(after);
  d.setUTCSeconds(0, 0);
  d.setUTCMinutes(d.getUTCMinutes() + 1);
  for (let i = 0; i < 60 * 24 * 8; i++) {
    const p = localParts(d, timezone);
    if (p.hour === hour && p.minute === minute) return d.toISOString();
    d.setUTCMinutes(d.getUTCMinutes() + 1);
  }
  throw new Error("No occurrence in the next eight days.");
}
export async function newSchedule(input: {
  name: string;
  hour: number;
  minute: number;
  timezone: string;
  input: RunInput;
}) {
  const s: Schedule = {
    ...input,
    id: crypto.randomUUID(),
    enabled: true,
    lastOccurrence: null,
    nextRun: nextOccurrence(input.hour, input.minute, input.timezone),
  };
  if (config.engine === "temporal") {
    const { temporalClient } = await import("./temporal/client.ts");
    const c = await temporalClient();
    await c.schedule.create({
      scheduleId: s.id,
      spec: {
        cronExpressions: [`${s.minute} ${s.hour} * * *`],
        timezone: s.timezone,
      },
      action: {
        type: "startWorkflow",
        workflowType: "scheduledInvestigation",
        taskQueue: config.queue,
        args: [s.input],
      },
      policies: { catchupWindow: "1 minute" },
    });
  }
  return saveSchedule(s);
}
export async function toggleSchedule(id: string, enabled: boolean) {
  const s = schedules().find((s) => s.id === id);
  if (!s) throw new Error("Schedule not found.");
  if (config.engine === "temporal") {
    const { temporalClient } = await import("./temporal/client.ts");
    const h = (await temporalClient()).schedule.getHandle(id);
    if (enabled) await h.unpause();
    else await h.pause();
  }
  return saveSchedule({
    ...s,
    enabled,
    nextRun: nextOccurrence(s.hour, s.minute, s.timezone),
  });
}
export function startScheduler() {
  if (config.engine !== "local") return;
  let running = false;
  setInterval(async () => {
    if (running) return;
    running = true;
    try {
      for (const s of schedules().filter((s) => s.enabled)) {
        const due = Date.parse(s.nextRun);
        if (Date.now() < due) continue;
        const occurrence = `${s.id}:${s.nextRun}`;
        if (
          Date.now() - due < 60000 &&
          claimOccurrence(occurrence, "scheduled")
        ) {
          const run = await enqueue(s.input);
          event(
            run.id,
            "queued",
            `Started by schedule “${s.name}” (${s.timezone}).`,
          );
        }
        saveSchedule({
          ...s,
          lastOccurrence: occurrence,
          nextRun: nextOccurrence(s.hour, s.minute, s.timezone),
        });
      }
    } finally {
      running = false;
    }
  }, 10000).unref();
}
