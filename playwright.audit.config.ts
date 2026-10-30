import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'site-audit-release.spec.ts',
  timeout: 45000,
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: 'output/site-audit-release-results',
  use: {
    baseURL: process.env.AUDIT_URL || 'http://127.0.0.1:42895',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: { args: ['--enable-unsafe-swiftshader'] }
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }
    },
    { name: 'mobile', use: { ...devices['Pixel 5'] } }
  ]
})
