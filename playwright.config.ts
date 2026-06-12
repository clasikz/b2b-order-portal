import { defineConfig, devices } from "@playwright/test";

// E2E config. Tests run sequentially against the real dev server + Supabase DB; all test
// data is isolated under the "e2e_club" club and cleaned up in global teardown.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 60_000,
  // The order page re-renders a lot on router.refresh (catalog + pricing + ERP payload), which
  // is slow on the dev filesystem, so give refresh-dependent assertions room.
  expect: { timeout: 20_000 },
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
