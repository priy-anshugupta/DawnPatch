import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
process.env.DAWNPATCH_DATA_DIR = await fs.mkdtemp(
  path.join(os.tmpdir(), "dawnpatch-test-"),
);
const {
  allowedFile,
  contained,
  prepare,
  applyChanges,
  hashCandidate,
  workspace,
} = await import("../server/workspaces.ts");
const { createRun, getRun, patchRun, claimOccurrence } =
  await import("../server/db.ts");
const { fixtureInput, fixtureChange } = await import("../server/fixtures.ts");
const { nextOccurrence, localParts } = await import("../server/scheduler.ts");
const { approve } = await import("../server/github.ts");
test("edit policy rejects escapes, secrets, dependencies and build configuration", () => {
  for (const f of [
    "../index.html",
    "C:\\secrets.ts",
    ".env",
    ".env.local",
    "node_modules/test.js",
    ".git/config",
    "package.json",
    "package-lock.json",
    "vite.config.ts",
    "a/../../escape.js",
    "keys/private.key",
  ])
    assert.equal(allowedFile(f), false, f);
  for (const f of ["src/App.tsx", "index.html", "src/style.css"])
    assert.equal(allowedFile(f), true, f);
  const base = path.join(os.tmpdir(), "authorized-root");
  assert.equal(contained(base, base + "-outside"), false);
  assert.equal(contained(base, path.join(base, "source")), true);
});
test("candidate edits are isolated and exact, and approvals invalidate after file mutation", async () => {
  const run = createRun({ ...fixtureInput("pagination"), engine: "fixture" });
  await prepare(run);
  const original = await fs.readFile(
    path.join(workspace(run.id), "index.html"),
    "utf8",
  );
  const changes = [fixtureChange("pagination")];
  const hash = await applyChanges(run, changes);
  assert.equal(
    await fs.readFile(path.join(workspace(run.id), "index.html"), "utf8"),
    original,
  );
  assert.notEqual(
    await fs.readFile(
      path.join(workspace(run.id, "candidate"), "index.html"),
      "utf8",
    ),
    original,
  );
  patchRun(run.id, {
    changes,
    candidateHash: hash,
    status: "awaiting_review",
    outcome: "patch_verified",
  });
  await approve(run.id, hash);
  assert.equal(getRun(run.id).approval?.hash, hash);
  await fs.appendFile(
    path.join(workspace(run.id, "candidate"), "index.html"),
    "\n<!-- changed -->",
  );
  assert.notEqual(await hashCandidate(run.id, changes), hash);
  await assert.rejects(() => approve(run.id, hash), /Candidate changed/);
});
test("non-unique edits and forbidden paths never become candidates", async () => {
  const run = createRun({ ...fixtureInput("empty"), engine: "fixture" });
  await prepare(run);
  await assert.rejects(
    () =>
      applyChanges(run, [
        { file: "../escape.html", search: "x", replace: "y" },
      ]),
    /not permitted/,
  );
  await assert.rejects(
    () =>
      applyChanges(run, [
        {
          file: "index.html",
          search: "this text does not exist",
          replace: "anything",
        },
      ]),
    /exactly once/,
  );
});
test("schedule timezone conversion and occurrence claims survive duplicate triggering", () => {
  const next = nextOccurrence(
    2,
    0,
    "Asia/Kolkata",
    new Date("2026-10-22T18:00:00Z"),
  );
  assert.equal(next, "2026-10-22T20:30:00.000Z");
  assert.deepEqual(localParts(new Date(next), "Asia/Kolkata"), {
    day: "2026-10-23",
    hour: 2,
    minute: 0,
  });
  assert.equal(claimOccurrence("one", "a"), true);
  assert.equal(claimOccurrence("one", "b"), false);
});
test("exported patch applies cleanly to the original source copy", async () => {
  const { patchText, exec } = await import("../server/workspaces.ts");
  const run = createRun({ ...fixtureInput("form"), engine: "fixture" });
  await prepare(run);
  const changes = [fixtureChange("form")];
  await applyChanges(run, changes);
  run.changes = changes;
  const patch = await patchText(run);
  assert.ok(!patch.includes(process.cwd()));
  const file = path.join(process.env.DAWNPATCH_DATA_DIR!, "candidate.patch");
  await fs.writeFile(file, patch);
  await exec("git", ["-C", workspace(run.id), "apply", "--check", file]);
});
test("run schema prevents assertion-free jobs and fixture-mode use on repositories", async () => {
  const { createRunSchema } = await import("../shared/types.ts");
  const input = fixtureInput("form");
  assert.equal(
    createRunSchema.safeParse({
      ...input,
      steps: [{ type: "click", selector: "#subscribe" }],
    }).success,
    false,
  );
  assert.equal(
    createRunSchema.safeParse({
      ...input,
      source: "repository",
      engine: "fixture",
    }).success,
    false,
  );
  assert.equal(
    createRunSchema.safeParse({ ...input, recipe: "vite" }).success,
    false,
  );
  assert.equal(createRunSchema.safeParse(input).success, true);
});
