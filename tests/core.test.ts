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
  contextFiles,
} = await import("../server/workspaces.ts");
const { createRun, getRun, patchRun, claimOccurrence } =
  await import("../server/db.ts");
const { fixtureInput, fixtureChange } = await import("../server/fixtures.ts");
const { nextOccurrence, localParts } = await import("../server/scheduler.ts");
const { approve } = await import("../server/github.ts");
const { repairOutputForFiles } = await import("../server/agent.ts");

test("structured repairs reject filenames absent from the supplied source context", () => {
  const schema = repairOutputForFiles(["src/Challenges.tsx"]);
  const proposal = {
    summary: "Fix filter",
    hypothesis: "Reversed comparison",
    edits: [
      {
        relativeFilePath: "src/missions.ts",
        exactOldCode: "a >= b",
        correctedNewCode: "a <= b",
      },
    ],
    limitations: [],
  };
  assert.equal(schema.safeParse(proposal).success, false);
  proposal.edits[0].relativeFilePath = "src/Challenges.tsx";
  assert.equal(schema.safeParse(proposal).success, true);
});

test("source context retains relevant executable code when documentation fills the budget", async () => {
  const run = createRun({
    ...fixtureInput("pagination"),
    title: "Mission duration filter",
    description: "A mission filter ignores the selected duration.",
  });
  await prepare(run);
  const base = workspace(run.id);
  await fs.mkdir(path.join(base, "docs"), { recursive: true });
  for (let n = 0; n < 5; n++)
    await fs.writeFile(
      path.join(base, "docs", `${n}.md`),
      "documentation ".repeat(900),
    );
  await fs.mkdir(path.join(base, "src"), { recursive: true });
  await fs.writeFile(
    path.join(base, "src", "Missions.tsx"),
    "const shown = missions.filter(m => m.minutes >= duration);",
  );
  const files = await contextFiles(run);
  assert(files.some((f) => f.file === "src/Missions.tsx"));
  assert(files.reduce((n, f) => n + f.content.length, 0) <= 12000);
  assert(files.every((f) => !f.file.startsWith("node_modules/")));
});
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

test("unchanged model edits are rejected before candidate construction", async () => {
  const run = createRun({ ...fixtureInput("pagination"), engine: "fixture" });
  await prepare(run);
  const change = fixtureChange("pagination");
  await assert.rejects(
    applyChanges(run, [{ ...change, replace: change.search }]),
    /source unchanged/,
  );
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
