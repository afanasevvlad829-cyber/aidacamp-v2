import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for the login-gated portal.
 * Tests run against the LIVE dev site (no local webServer).
 * Override the target with PORTAL_E2E_BASE.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.PORTAL_E2E_BASE || 'https://dev.aidacamp.ru',
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
