import { z } from "zod";
export const stepSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("click"), selector: z.string().min(1) }),
  z.object({
    type: z.literal("fill"),
    selector: z.string().min(1),
    value: z.string(),
  }),
  z.object({
    type: z.literal("select"),
    selector: z.string().min(1),
    value: z.string(),
  }),
  z.object({
    type: z.literal("text"),
    selector: z.string().min(1),
    value: z.string(),
  }),
  z.object({ type: z.literal("visible"), selector: z.string().min(1) }),
  z.object({ type: z.literal("hidden"), selector: z.string().min(1) }),
  z.object({
    type: z.literal("count"),
    selector: z.string().min(1),
    value: z.number().int().min(0),
  }),
]);
export const createRunSchema = z
  .object({
    title: z.string().min(3).max(200),
    description: z.string().max(10000),
    source: z.enum(["fixture", "repository"]),
    fixture: z.enum(["pagination", "empty", "form"]).default("pagination"),
    repositoryPath: z.string().max(1000).default(""),
    recipe: z.enum(["vite", "next", "html"]).default("html"),
    steps: z.array(stepSchema).min(1).max(25),
    engine: z.enum(["gemma", "fixture"]).default("gemma"),
    search: z.boolean().default(false),
    issueUrl: z.string().default(""),
    viewport: z.enum(["desktop", "mobile"]).default("desktop"),
  })
  .refine(
    (v) => v.source === "fixture" || v.engine === "gemma",
    "Reference repairs are restricted to bundled fixtures.",
  )
  .refine(
    (v) =>
      v.steps.some((s) =>
        ["text", "visible", "hidden", "count"].includes(s.type),
      ),
    "Include at least one behavioral assertion.",
  )
  .refine(
    (v) => v.source !== "fixture" || v.recipe === "html",
    "Bundled fixtures use the static HTML recipe.",
  );
export type RunInput = z.infer<typeof createRunSchema>;
export type Step = z.infer<typeof stepSchema>;
export type RunStatus =
  | "queued"
  | "running"
  | "awaiting_review"
  | "completed"
  | "blocked"
  | "failed"
  | "cancelled";
export interface Evidence {
  side: "baseline" | "candidate";
  screenshot: string;
  trace: string;
  passed: boolean;
  assertions: {
    step: number;
    label: string;
    passed: boolean;
    error?: string;
  }[];
  console: string[];
  url: string;
  viewport: { width: number; height: number };
  durationMs: number;
}
export interface Change {
  file: string;
  search: string;
  replace: string;
}
export interface Diagnosis {
  summary: string;
  hypothesis: string;
  changes: Change[];
  limitations: string[];
}
export interface Run {
  id: string;
  input: RunInput;
  status: RunStatus;
  stage: string;
  outcome: string;
  createdAt: string;
  updatedAt: string;
  baseSha: string;
  repositoryName: string;
  error: string | null;
  baseline: Evidence | null;
  candidate: Evidence | null;
  diagnosis: Diagnosis | null;
  changes: Change[];
  candidateHash: string | null;
  checks: { name: string; passed: boolean; detail: string }[];
  usage: {
    model: string;
    inputTokens: number | null;
    outputTokens: number | null;
    durationMs: number;
    searches: number;
    cost: number | null;
  };
  sources: { title: string; url: string; snippet: string }[];
  approval: {
    hash: string;
    at: string;
    destination?: string;
    action?: "draft-pr" | "local";
  } | null;
  publication: { url: string; branch: string } | null;
  workflowId: string | null;
}
export interface RunEvent {
  id: number;
  runId: string;
  stage: string;
  message: string;
  at: string;
}
export interface Schedule {
  id: string;
  name: string;
  hour: number;
  minute: number;
  timezone: string;
  enabled: boolean;
  input: RunInput;
  lastOccurrence: string | null;
  nextRun: string;
}
export const diagnosisSchema = z.object({
  summary: z.string().min(1),
  hypothesis: z.string(),
  changes: z
    .array(
      z.object({
        file: z.string().min(1),
        search: z.string().min(1),
        replace: z.string(),
      }),
    )
    .max(5),
  limitations: z.array(z.string()).default([]),
});
export const scheduleSchema = z.object({
  name: z.string().min(1).max(100),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  timezone: z.string().refine((v) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: v });
      return true;
    } catch {
      return false;
    }
  }, "Use an IANA timezone"),
  input: createRunSchema,
});
