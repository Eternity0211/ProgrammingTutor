import { defineConfig, devices } from "@playwright/test";

const isWindows = process.platform === "win32";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // Next dev compiles routes on demand. A single browser worker keeps the
  // Windows development server stable during cold-start smoke tests.
  workers: 1,
  reporter: [["line"], ["./scripts/e2e-status-reporter.mjs"]],
  outputDir: ".data/playwright-results",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: isWindows ? "Microsoft Edge" : "Chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(isWindows ? { channel: "msedge" } : {}),
      },
    },
  ],
});
