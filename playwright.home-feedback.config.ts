import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /home-feedback\.spec\.ts/,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 5000 },
  reporter: 'list',
  outputDir: 'output/home-feedback-results',
  use: {
    baseURL: process.env.AUDIT_URL || 'http://127.0.0.1:3110',
    serviceWorkers: 'block',
    actionTimeout: 10000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: { args: ['--enable-unsafe-swiftshader'] }
  }
})
