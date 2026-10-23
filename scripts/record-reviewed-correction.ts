import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
const dir = path.resolve(".dawnpatch/demo-production");
const id = (await fs.readFile(path.join(dir, "run-id.txt"), "utf8")).trim();
const correction =
  "const shown = missions.filter(m => m.minutes <= time && (place === 'anywhere' || m.places.includes(place)));";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: {
    dir: path.join(dir, "raw"),
    size: { width: 1920, height: 1080 },
  },
});
const page = await context.newPage();
const video = page.video()!;
const epoch = Date.now();
let start = 0,
  end = 0;
try {
  await page.goto("http://127.0.0.1:4310/");
  await page
    .locator("tr")
    .filter({ hasText: id.slice(0, 8) })
    .locator(".row-title")
    .click();
  await page
    .getByRole("button", {
      name: "Revise with reviewed correction",
      exact: true,
    })
    .click();
  await page.getByLabel("Corrected code", { exact: true }).fill(correction);
  start = (Date.now() - epoch) / 1000;
  await page.waitForTimeout(10000);
  await page
    .getByRole("button", { name: "Verify reviewed correction", exact: true })
    .click();
  await page.waitForTimeout(2500);
  end = (Date.now() - epoch) / 1000;
} finally {
  await context.close();
  await browser.close();
  await fs.writeFile(
    path.join(dir, "correction-capture.json"),
    JSON.stringify(
      {
        video: await video.path(),
        scenes: [{ name: "correction", start, end }],
      },
      null,
      2,
    ),
  );
}
