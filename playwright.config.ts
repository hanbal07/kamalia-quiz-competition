import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT || 3000);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${PORT}`;

/**
 * E2E tests for the University of Kamalia Quiz Competition.
 * Requires:
 *   - PostgreSQL seeded (npm run db:seed)
 *   - A production build exists (npm run build) — the webServer starts "next start"
 *   - Chromium installed (npx playwright install chromium)
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 120_000,
  expect: {
    timeout: 30_000,
  },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run start",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});