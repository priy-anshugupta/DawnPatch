import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  timeout: 90000,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4310", trace: "retain-on-failure" },
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:4310/api/runs",
    reuseExistingServer: true,
    timeout: 180000,
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
