import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

// This repo's dev sandbox pre-installs a specific Chromium build outside
// npm's control (see CLAUDE.md-style environment notes) — use it directly
// when present so tests run without a fresh browser download; everywhere
// else (CI, a contributor's machine) falls back to Playwright's normal
// browser management (`npx playwright install`).
const sandboxChromium = "/opt/pw-browsers/chromium";
const launchOptions = existsSync(sandboxChromium) ? { executablePath: sandboxChromium } : {};

export default defineConfig({
  testDir: "./tests/e2e",
  // A handful of specs share one static-data app instance; running them
  // fully parallel across workers occasionally raced (debounced re-renders
  // colliding with clipboard/focus timing under CPU contention). The suite
  // is small enough that a single worker costs little and removes the flake.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:8080",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], launchOptions },
    },
  ],
  webServer: {
    command: "npx --yes http-server -p 8080 -c-1",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
