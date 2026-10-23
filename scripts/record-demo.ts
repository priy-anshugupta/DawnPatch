import { chromium } from "playwright";
import fs from "node:fs/promises";
const base = "http://127.0.0.1:4310";
const runs = await fetch(base + "/api/runs").then((r) => r.json());
const chosen =
  runs.find(
    (r: any) => r.input.engine === "gemma" && r.outcome === "patch_verified",
  ) ||
  runs.find(
    (r: any) => r.input.engine === "fixture" && r.outcome === "patch_verified",
  );
if (!chosen)
  throw new Error("Complete one verified investigation before recording.");
await fs.mkdir("docs/demo", { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: {
    dir: ".dawnpatch/recordings",
    size: { width: 1440, height: 1000 },
  },
});
const page = await context.newPage();
const pause = () => page.waitForTimeout(1600);
await page.goto(base);
await page
  .getByRole("heading", { name: "Maintenance overview." })
  .waitFor();
await pause();
await page
  .locator("tr")
  .filter({ hasText: chosen.id.slice(0, 8) })
  .locator(".row-title")
  .click();
await page.getByRole("heading", { name: "Investigation report" }).waitFor();
await pause();
await page
  .getByRole("button", { name: "Browser evidence", exact: true })
  .click();
await pause();
await page.getByRole("button", { name: "Candidate", exact: true }).click();
await pause();
await page.getByRole("button", { name: "Compare", exact: true }).click();
await page.getByRole("slider").press("End");
await pause();
await page.getByRole("slider").press("Home");
await pause();
await page.getByRole("button", { name: "Patch", exact: true }).click();
await pause();
await page.getByRole("button", { name: "Checks", exact: false }).click();
await pause();
await page.getByRole("button", { name: "Activity", exact: true }).click();
await pause();
await page.getByRole("button", { name: "Morning brief", exact: true }).click();
await pause();
await page
  .getByRole("button", { name: "Settings & connections", exact: true })
  .click();
await pause();
const video = page.video()!;
await context.close();
const file = await video.path();
await fs.copyFile(file, "docs/demo/dawnpatch-local-demo.webm");
await fs.writeFile(
  "docs/demo/README.md",
  `# DawnPatch local demonstration\n\nRecorded from the running local app on ${new Date().toISOString()}.\n\nRun: ${chosen.id}\nModel/engine: ${chosen.usage.model}\n\n${chosen.input.engine === "fixture" ? "This recording demonstrates real browser evidence with a deterministic reference repair, not model-generated repair." : "This recording demonstrates a real local Gemma-generated candidate and the measured browser checks."}\n\nThe recording shows actual runtime states, including integrations not yet configured. No hosted deployment is involved.\n`,
);
await browser.close();
console.log("Saved docs/demo/dawnpatch-local-demo.webm");
