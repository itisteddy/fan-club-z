import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './client/e2e-tests',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
}); 