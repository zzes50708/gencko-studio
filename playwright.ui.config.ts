import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch:
    /(?:article-outline-ux|guide-care-ux|shopping-ux|shop-desktop-flip-ux|shop-morph-picker|shop-sold-price|product-mobile-layout|product-compare-ux|identity-ux|genetics-ux|calculator-experience|faq-articles-ux|filter-reset-ux|assessment-ux|starter-buying-ux|hospital-sidebar)\.spec\.ts/,
  timeout: 45000,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  outputDir: 'output/ui-validation-results',
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
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }
    }
  ]
})
