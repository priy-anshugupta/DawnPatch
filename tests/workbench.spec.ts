import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
const headers = { "X-DawnPatch": "local-workbench" };
test("loopback API rejects cross-origin mutations and missing request guards", async ({
  request,
}) => {
  const noHeader = await request.post("/api/runs", { data: {} });
  expect(noHeader.status()).toBe(403);
  const otherOrigin = await request.post("/api/runs", {
    headers: { ...headers, Origin: "https://malicious.example" },
    data: {},
  });
  expect(otherOrigin.status()).toBe(403);
  const invalid = await request.post("/api/runs", {
    headers,
    data: { title: "bad" },
  });
  expect(invalid.status()).toBe(400);
});
for (const fixture of ["pagination", "empty", "form"])
  test(`real browser baseline, isolated repair, verification, export: ${fixture}`, async ({
    request,
  }) => {
    const cases = await (await request.get("/api/fixtures")).json();
    const input = {
      ...cases.find((f: any) => f.fixture === fixture),
      engine: "fixture",
    };
    const response = await request.post("/api/runs", { headers, data: input });
    expect(response.status()).toBe(202);
    const run = await response.json();
    let result: any;
    await expect
      .poll(
        async () => {
          result = await (await request.get(`/api/runs/${run.id}`)).json();
          return result.status;
        },
        { timeout: 70000, intervals: [1000] },
      )
      .toBe("awaiting_review");
    expect(result.baseline.passed).toBe(false);
    expect(result.candidate.passed).toBe(true);
    expect(result.usage.model).toBe("Deterministic fixture repair");
    expect(result.checks.every((c: any) => c.passed)).toBe(true);
    expect((await request.get(result.baseline.screenshot)).status()).toBe(200);
    expect((await request.get(result.candidate.trace)).status()).toBe(200);
    const patch = await (await request.get(`/api/runs/${run.id}/patch`)).text();
    expect(patch).toContain("diff --git");
    expect(
      (
        await request.post(`/api/runs/${run.id}/approve`, {
          headers,
          data: { hash: "wrong" },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await request.post(`/api/runs/${run.id}/accept`, { headers, data: {} })
      ).status(),
    ).toBe(200);
  });
test("desktop review, evidence compare, schedule and responsive layout", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Maintenance overview." }),
  ).toBeVisible();
  await fs.mkdir("docs/screenshots", { recursive: true });
  await page.screenshot({
    path: "docs/screenshots/workbench-desktop.png",
    fullPage: true,
  });
  await page
    .locator("tr")
    .filter({ hasText: "Changing the search filter leaves page two empty" })
    .filter({ hasText: "Patch verified" })
    .first()
    .locator(".row-title")
    .click();
  await expect(
    page.getByRole("heading", { name: "Investigation report" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Browser evidence", exact: true })
    .click();
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(page.getByRole("slider")).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/evidence-comparison.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Patch", exact: true }).click();
  await expect(page.locator(".diff-view")).toContainText("page = 1");
  await page.getByRole("button", { name: "Schedules", exact: true }).click();
  await page.getByRole("button", { name: "New schedule", exact: true }).click();
  await page.getByLabel("Schedule name").fill("E2E schedule");
  await page.getByRole("button", { name: "Preview next three runs" }).click();
  await expect(page.locator(".next-runs li")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Save schedule", exact: true })
    .click();
  await expect(page.getByText("E2E schedule", { exact: true })).toBeVisible();
  const schedules = await (await request.get("/api/schedules")).json();
  for (const s of schedules.filter((s: any) => s.name === "E2E schedule"))
    await request.delete(`/api/schedules/${s.id}`, { headers });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.screenshot({
    path: "docs/screenshots/workbench-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page
    .getByRole("button", { name: "Settings & connections", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Settings & connections." }),
  ).toBeVisible();
  await expect(
    page.getByText("Track integrations", { exact: true }),
  ).toBeVisible();
});
