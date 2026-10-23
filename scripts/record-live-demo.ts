import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Run, RunInput } from "../shared/types.ts";

// Actual website capture; no fixture substitution or outcome rewriting.
const base = "http://127.0.0.1:4310";
const production = path.resolve(".dawnpatch/demo-production");
const input: RunInput = JSON.parse(
  await fs.readFile(
    process.env.DEMO_INPUT || ".dawnpatch/video-demo-input.json",
    "utf8",
  ),
);
if (input.engine !== "gemma" || input.source !== "repository")
  throw new Error("The live demo requires a repository and Gemma.");
await fs.mkdir(path.join(production, "raw"), { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  recordVideo: {
    dir: path.join(production, "raw"),
    size: { width: 1920, height: 1080 },
  },
});
const page = await context.newPage();
const video = page.video()!;
const recordingStart = Date.now();
const scenes: { name: string; start: number; end: number }[] = [];
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
const pause = (ms = 1300) => page.waitForTimeout(ms);
async function scene(name: string, action: () => Promise<void>, hold = 1600) {
  const start = (Date.now() - recordingStart) / 1000;
  await action();
  await pause(hold);
  scenes.push({ name, start, end: (Date.now() - recordingStart) / 1000 });
  console.log(`Recorded scene: ${name}`);
}
let run: Run | undefined;
try {
  await page.goto(base);
  await page.getByRole("heading", { name: "Maintenance overview." }).waitFor();
  await page.waitForFunction(
    () =>
      !document
        .querySelector(".model-status")
        ?.textContent?.includes("Checking"),
    undefined,
    { timeout: 20000 },
  );
  await scene("intro", async () => {
    await pause(2000);
  });
  await scene("issue", async () => {
    await page
      .getByRole("button", { name: "Investigate issue", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Local repository", exact: true })
      .click();
    await page.getByLabel("Local repository path").fill(input.repositoryPath);
    await page.getByLabel("Issue title", { exact: true }).fill(input.title);
    await page
      .getByLabel("What should happen, and what happens instead?")
      .fill(input.description);
    await pause(2200);
  });
  await scene("steps", async () => {
    for (const [index, step] of input.steps.entries()) {
      if (index)
        await page
          .getByRole("button", { name: "Add step", exact: true })
          .click();
      await page
        .getByLabel(`Step ${index + 1} action`, { exact: true })
        .selectOption(step.type);
      await page
        .getByLabel(`Step ${index + 1} selector`, { exact: true })
        .fill(step.selector);
      if ("value" in step)
        await page
          .getByLabel(`Step ${index + 1} value`, { exact: true })
          .fill(String(step.value));
    }
    await page
      .getByText("Repair engine", { exact: true })
      .scrollIntoViewIfNeeded();
    await pause(1800);
    const response = page.waitForResponse(
      (r) => r.url() === `${base}/api/runs` && r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Start investigation", exact: true })
      .click();
    const created = await response;
    if (created.status() !== 202)
      throw new Error(`Investigation creation failed (${created.status()}).`);
    run = await created.json();
    await fs.writeFile(path.join(production, "run-id.txt"), run!.id);
  });
  if (!process.env.DEMO_SETUP_ONLY) {
    const read = () =>
      fetch(`${base}/api/runs/${run!.id}`).then((r) =>
        r.json(),
      ) as Promise<Run>;
    let targetRecorded = false,
      progressRecorded = false;
    const deadline = Date.now() + 16 * 60 * 1000;
    while (Date.now() < deadline) {
      run = await read();
      if (
        !targetRecorded &&
        run.baseline &&
        ["running", "queued"].includes(run.status)
      ) {
        const name = `dawnpatch-${run.id.slice(0, 8)}-baseline`;
        try {
          const { stdout } = await promisify(execFile)(
            "docker",
            ["port", name, "4173/tcp"],
            { windowsHide: true, encoding: "utf8", timeout: 10000 },
          );
          const port = stdout.trim().split(":").pop();
          await page.goto(`http://127.0.0.1:${port}`);
          await page
            .getByRole("button", { name: "Outdoor missions", exact: true })
            .click();
          await page
            .locator(".mission-filters label:nth-child(2) select")
            .selectOption("5");
          await page.locator(".mission-filters").scrollIntoViewIfNeeded();
          await scene(
            "target",
            async () => {
              await pause(2500);
              await page.evaluate(() =>
                scrollBy({ top: 360, behavior: "smooth" }),
              );
            },
            2500,
          );
          await page.goto(base);
          await page
            .locator("tr")
            .filter({ hasText: run.id.slice(0, 8) })
            .locator(".row-title")
            .click();
          targetRecorded = true;
        } catch (e) {
          console.log(
            `Target capture unavailable: ${(e as Error).message.slice(0, 100)}`,
          );
        }
      }
      if (
        targetRecorded &&
        !progressRecorded &&
        ["analyzing", "patching", "verifying"].includes(run.stage)
      ) {
        await scene("analysis", async () => {
          await page.evaluate(() => scrollTo({ top: 0 }));
          await pause(2000);
        });
        progressRecorded = true;
      }
      if (!["running", "queued"].includes(run.status)) break;
      await pause(2000);
    }
    run = await read();
    await fs.writeFile(
      path.join(production, "run-result.json"),
      JSON.stringify(run, null, 2),
    );
    if (["running", "queued"].includes(run.status))
      throw new Error(
        "Recording deadline reached; investigation is still active.",
      );
    await page.goto(base);
    await page
      .locator("tr")
      .filter({ hasText: run.id.slice(0, 8) })
      .locator(".row-title")
      .click();
    await scene("result", async () => {
      await pause(2000);
    });
    if (run.baseline && run.candidate) {
      await scene("evidence", async () => {
        await page
          .getByRole("button", { name: "Browser evidence", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Candidate", exact: true })
          .click();
        await page
          .locator(".evidence-panel")
          .scrollIntoViewIfNeeded()
          .catch(() => {});
        await pause(2200);
        await page
          .getByRole("button", { name: "Compare", exact: true })
          .click();
        await page.getByRole("slider").press("End");
        await pause(1800);
        await page.getByRole("slider").press("Home");
        await pause(1800);
        await page.getByRole("slider").press("ArrowRight");
      });
      await scene("patch", async () => {
        await page.getByRole("button", { name: "Patch", exact: true }).click();
        await page.locator(".diff-view").scrollIntoViewIfNeeded();
        await pause(2500);
      });
      await scene("checks", async () => {
        await page.getByRole("button", { name: /^Checks/ }).click();
        await page.evaluate(() => scrollTo({ top: 250, behavior: "smooth" }));
        await pause(2300);
      });
    }
    await scene("activity", async () => {
      await page.getByRole("button", { name: "Activity", exact: true }).click();
      await pause(2500);
    });
    await scene("outro", async () => {
      await page
        .getByRole("button", { name: "Review queue", exact: true })
        .click();
      await page.evaluate(() => scrollTo({ top: 0 }));
      await pause(2500);
    });
  }
} finally {
  await context.close();
  await fs.writeFile(
    path.join(production, "capture.json"),
    JSON.stringify(
      {
        video: await video.path(),
        runId: run?.id,
        outcome: run?.outcome,
        viewport: { width: 1920, height: 1080 },
        scenes,
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
  await browser.close();
}
console.log(
  `Recording complete: ${run?.id} — ${run?.outcome}. The edit manifest excludes waiting time.`,
);
