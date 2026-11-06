import { defineConfig, devices } from '@playwright/test'
const common =
  /(?:site-audit-release|release-regressions|article-visibility|site-followup)\.spec\.ts/
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  outputDir: 'output/release-validation-results',
  use: {
    baseURL: process.env.AUDIT_URL || 'http://127.0.0.1:3001',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: { args: ['--enable-unsafe-swiftshader'] }
  },
  projects: [
    {
      name: 'desktop',
      testMatch:
        /(?:site-audit-release|release-regressions|article-visibility|site-followup|auction-management|auction-contact-lifecycle|auction-bid-safety|line-login-recovery)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }
    },
    { name: 'mobile', testMatch: common, use: { ...devices['Pixel 5'] } }
  ]
})
