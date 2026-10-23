import { chromium } from "playwright";
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import type { Run } from "../shared/types.ts";

const production = path.resolve(".dawnpatch/demo-production");
const id = (
  await fs.readFile(path.join(production, "run-id.txt"), "utf8")
).trim();
const run: Run = await fetch(`http://127.0.0.1:4310/api/runs/${id}`).then((r) =>
  r.json(),
);
if (run.outcome !== "patch_verified" || !run.checks.every((c) => c.passed))
  throw new Error(
    "A verified run is required before recording a successful result.",
  );
await fs.writeFile(
  path.join(production, "verified-run.json"),
  JSON.stringify(run, null, 2),
);
const dist = path.resolve(
  ".dawnpatch/video-demo-final/runs",
  id,
  "candidate/dist",
);
await fs.access(path.join(dist, "index.html"));
// Serve the already-built static assets only. No target package scripts run on the host.
const app = express();
app.use(express.static(dist));
app.get("/{*path}", (_req, res) => res.sendFile(path.join(dist, "index.html")));
const server = app.listen(4312, "127.0.0.1");
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: {
    dir: path.join(production, "raw"),
    size: { width: 1920, height: 1080 },
  },
});
const page = await context.newPage();
const video = page.video()!;
const start = Date.now();
const scenes: { name: string; start: number; end: number }[] = [];
const pause = (ms: number) => page.waitForTimeout(ms);
async function scene(name: string, action: () => Promise<void>, hold: number) {
  const from = (Date.now() - start) / 1000;
  await action();
  await pause(hold);
  scenes.push({ name, start: from, end: (Date.now() - start) / 1000 });
  console.log(`Recorded verified scene: ${name}`);
}
async function openRun() {
  await page.goto("http://127.0.0.1:4310/");
  await page
    .locator("tr")
    .filter({ hasText: id.slice(0, 8) })
    .locator(".row-title")
    .click();
}
try {
  await openRun();
  await scene(
    "analysis-summary",
    async () => {
      await page.getByRole("button", { name: "Activity", exact: true }).click();
      await page.evaluate(() => scrollTo({ top: 200, behavior: "smooth" }));
    },
    18500,
  );
  await scene(
    "result",
    async () => {
      await page.getByRole("button", { name: "Overview", exact: true }).click();
      await page.evaluate(() => scrollTo({ top: 0, behavior: "smooth" }));
    },
    13000,
  );
  await page.goto("http://127.0.0.1:4312/");
  await page
    .getByRole("button", { name: "Outdoor missions", exact: true })
    .click();
  await page
    .locator(".mission-filters label:nth-child(2) select")
    .selectOption("5");
  await page
    .locator(".mission-filters")
    .evaluate((el) => el.scrollIntoView({ block: "start" }));
  await scene(
    "after",
    async () => {
      await pause(6000);
      await page
        .locator(".mission-filters label:nth-child(2) select")
        .selectOption("20");
      await pause(4500);
      await page
        .locator(".mission-filters label:nth-child(1) select")
        .selectOption("courtyard");
      await pause(4500);
      await page
        .locator(".mission-filters label:nth-child(1) select")
        .selectOption("anywhere");
      await page
        .locator(".mission-filters label:nth-child(2) select")
        .selectOption("5");
    },
    4000,
  );
  await openRun();
  await scene(
    "evidence",
    async () => {
      await page
        .getByRole("button", { name: "Browser evidence", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Candidate", exact: true })
        .click();
      await pause(3000);
      await page.getByRole("button", { name: "Compare", exact: true }).click();
      await page.locator(".comparison").scrollIntoViewIfNeeded();
      await page.getByRole("slider").press("End");
      await pause(2500);
      await page.getByRole("slider").press("Home");
      await pause(2500);
      await page.evaluate(() => scrollBy({ top: 250, behavior: "smooth" }));
    },
    9000,
  );
  await scene(
    "patch",
    async () => {
      await page.getByRole("button", { name: "Patch", exact: true }).click();
      await page.locator(".diff-view").scrollIntoViewIfNeeded();
    },
    13000,
  );
  await scene(
    "checks",
    async () => {
      await page.getByRole("button", { name: /^Checks/ }).click();
      await page.locator(".check-row").first().scrollIntoViewIfNeeded();
    },
    14500,
  );
  await scene(
    "outro",
    async () => {
      await page.goto("http://127.0.0.1:4310/");
      await page.evaluate(() => scrollTo({ top: 0, behavior: "smooth" }));
    },
    10000,
  );
} finally {
  await context.close();
  await fs.writeFile(
    path.join(production, "results-capture.json"),
    JSON.stringify(
      { video: await video.path(), runId: id, outcome: run.outcome, scenes },
      null,
      2,
    ),
  );
  await browser.close();
  server.close();
}
