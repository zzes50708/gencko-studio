import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch:
    /(?:home-brand-experience|home-ux|shop-desktop-flip-ux|navigation-loading-ux)\.spec\.ts/,
  timeout: 60_000,
  expect: { timeout: 7_000 },
  workers: 1,
  reporter: 'list',
  outputDir: 'output/brand-experience-results',
  use: {
    baseURL: process.env.AUDIT_URL || 'http://127.0.0.1:3107',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }
    }
  ]
})
