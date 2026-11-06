import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /page-interaction-upgrades\.spec\.ts/,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 6000 },
  reporter: 'list',
  outputDir: 'output/page-interaction-results',
  use: {
    baseURL: process.env.AUDIT_URL || 'http://127.0.0.1:3110',
    serviceWorkers: 'block',
    actionTimeout: 8000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: { args: ['--enable-unsafe-swiftshader'] }
  }
})
