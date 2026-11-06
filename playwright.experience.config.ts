import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch:
    /(?:site-experience|home-brand-experience|home-ux|shop-desktop-flip-ux|navigation-loading-ux)\.spec\.ts/,
  timeout: 45000,
  expect: { timeout: 7000 },
  workers: 1,
  reporter: 'list',
  outputDir: 'output/site-experience-results',
  use: {
    baseURL: process.env.AUDIT_URL || 'http://127.0.0.1:3110',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: { args: ['--enable-unsafe-swiftshader'] }
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }
    }
  ]
})
