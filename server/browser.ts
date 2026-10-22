import { chromium, expect } from "@playwright/test";
import path from "node:path";
import type { Run, Evidence, Step } from "../shared/types.ts";
import { artifactDir } from "./workspaces.ts";
import { getRun } from "./db.ts";
const sessions = new Map<string, () => Promise<void>>();
export async function stopBrowser(id: string) {
  await sessions
    .get(id)?.()
    .catch(() => {});
}
export async function capture(
  run: Run,
  side: "baseline" | "candidate",
  url: string,
): Promise<Evidence> {
  const start = Date.now();
  const browser = await chromium.launch({ headless: true });
  sessions.set(run.id, () => browser.close());
  const viewport =
    run.input.viewport === "mobile"
      ? { width: 390, height: 844 }
      : { width: 1280, height: 900 };
  const context = await browser.newContext({
    viewport,
    serviceWorkers: "block",
  });
  const logs: string[] = [];
  const assertions: Evidence["assertions"] = [];
  const origin = new URL(url).origin;
  await context.route("**/*", (route) => {
    try {
      const target = new URL(route.request().url());
      if (
        target.origin === origin ||
        target.protocol === "data:" ||
        target.protocol === "blob:"
      )
        return route.continue();
      return route.abort();
    } catch {
      return route.abort();
    }
  });
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  page.on("console", (msg) => {
    if (logs.length < 40)
      logs.push(`[${msg.type()}] ${msg.text().slice(0, 500)}`);
  });
  page.on("pageerror", (e) => logs.push(e.message.slice(0, 500)));
  let passed = true;
  try {
    const response = await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    if (!response?.ok())
      throw new Error(
        `Preview returned HTTP ${response?.status() || "unavailable"}`,
      );
    for (const [i, step] of run.input.steps.entries()) {
      if (getRun(run.id).status === "cancelled")
        throw new Error("Investigation cancelled");
      try {
        await execute(page, step);
        assertions.push({ step: i, label: describe(step), passed: true });
      } catch (e) {
        passed = false;
        assertions.push({
          step: i,
          label: describe(step),
          passed: false,
          error: (e as Error).message.slice(0, 1200),
        });
        break;
      }
    }
    await page.screenshot({
      path: path.join(artifactDir(run.id), `${side}.png`),
      fullPage: true,
    });
    await context.tracing.stop({
      path: path.join(artifactDir(run.id), `${side}.zip`),
    });
    return {
      side,
      screenshot: `/artifacts/${run.id}/${side}.png`,
      trace: `/artifacts/${run.id}/${side}.zip`,
      passed,
      assertions,
      console: logs,
      url,
      viewport,
      durationMs: Date.now() - start,
    };
  } finally {
    sessions.delete(run.id);
    await browser.close();
  }
}
function describe(s: Step) {
  return `${s.type} ${s.selector}${"value" in s ? ` → ${s.value}` : ""}`;
}
async function execute(page: import("playwright").Page, s: Step) {
  const loc = page.locator(s.selector);
  switch (s.type) {
    case "click":
      await loc.click();
      break;
    case "fill":
      await loc.fill(s.value);
      break;
    case "select":
      await loc.selectOption(s.value);
      break;
    case "text":
      await expect(loc).toContainText(s.value, { timeout: 5000 });
      break;
    case "visible":
      await expect(loc).toBeVisible();
      break;
    case "hidden":
      await expect(loc).toBeHidden();
      break;
    case "count":
      await expect(loc).toHaveCount(s.value);
      break;
  }
}
