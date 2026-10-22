import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import crypto from "node:crypto";
import { dataDir, config } from "./config.ts";
import type { Run, RunInput, RunEvent, Schedule } from "../shared/types.ts";
const db = new DatabaseSync(path.join(dataDir, "dawnpatch.db"));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT,runId TEXT NOT NULL,stage TEXT NOT NULL,message TEXT NOT NULL,at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS schedules(id TEXT PRIMARY KEY,json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS occurrences(id TEXT PRIMARY KEY,runId TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS views(id TEXT PRIMARY KEY,json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS kv(key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
export function allRuns(): Run[] {
  return (
    db.prepare("SELECT json FROM runs ORDER BY rowid DESC").all() as {
      json: string;
    }[]
  ).map((r) => JSON.parse(r.json));
}
export function getRun(id: string): Run {
  const r = db.prepare("SELECT json FROM runs WHERE id=?").get(id) as
    { json: string } | undefined;
  if (!r)
    throw Object.assign(new Error("Investigation not found"), { status: 404 });
  return JSON.parse(r.json);
}
export function saveRun(run: Run) {
  run.updatedAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO runs(id,json) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json",
  ).run(run.id, JSON.stringify(run));
  return run;
}
export function patchRun(id: string, patch: Partial<Run>) {
  return saveRun({ ...getRun(id), ...patch });
}
export function createRun(input: RunInput): Run {
  const now = new Date().toISOString();
  const run: Run = {
    id: crypto.randomUUID(),
    input,
    status: "queued",
    stage: "queued",
    outcome: "pending",
    createdAt: now,
    updatedAt: now,
    baseSha: "",
    repositoryName:
      input.source === "fixture"
        ? "dawnpatch/fieldnotes"
        : path.basename(input.repositoryPath),
    error: null,
    baseline: null,
    candidate: null,
    diagnosis: null,
    changes: [],
    candidateHash: null,
    checks: [],
    usage: {
      model:
        input.engine === "fixture"
          ? "Deterministic fixture repair"
          : config.model,
      inputTokens: null,
      outputTokens: null,
      durationMs: 0,
      searches: 0,
      cost: null,
    },
    sources: [],
    approval: null,
    publication: null,
    workflowId: null,
  };
  saveRun(run);
  event(run.id, "queued", "Investigation added to the local queue.");
  return run;
}
export function event(runId: string, stage: string, message: string) {
  db.prepare("INSERT INTO events(runId,stage,message,at) VALUES(?,?,?,?)").run(
    runId,
    stage,
    message,
    new Date().toISOString(),
  );
}
export function events(id: string, after = 0): RunEvent[] {
  return db
    .prepare("SELECT * FROM events WHERE runId=? AND id>? ORDER BY id")
    .all(id, after) as unknown as RunEvent[];
}
export function schedules(): Schedule[] {
  return (
    db.prepare("SELECT json FROM schedules").all() as { json: string }[]
  ).map((r) => JSON.parse(r.json));
}
export function saveSchedule(s: Schedule) {
  db.prepare(
    "INSERT INTO schedules(id,json) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json",
  ).run(s.id, JSON.stringify(s));
  return s;
}
export function deleteSchedule(id: string) {
  db.prepare("DELETE FROM schedules WHERE id=?").run(id);
}
export function claimOccurrence(id: string, runId: string) {
  return (
    db.prepare("INSERT OR IGNORE INTO occurrences VALUES(?,?)").run(id, runId)
      .changes === 1
  );
}
export function getKV(key: string) {
  const r = db.prepare("SELECT value FROM kv WHERE key=?").get(key) as
    { value: string } | undefined;
  return r?.value;
}
export function setKV(key: string, value: string) {
  db.prepare(
    "INSERT INTO kv VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
  ).run(key, value);
}
export function views() {
  return (db.prepare("SELECT json FROM views").all() as { json: string }[]).map(
    (v) => JSON.parse(v.json),
  );
}
export function saveView(v: {
  id: string;
  name: string;
  query: string;
  filter: string;
}) {
  db.prepare("INSERT INTO views VALUES(?,?)").run(v.id, JSON.stringify(v));
  return v;
}
export function deleteView(id: string) {
  db.prepare("DELETE FROM views WHERE id=?").run(id);
}
