import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  testMatch:
    /(?:page-interaction-upgrades|breeders-auction-ux|auction-media|product-mobile-layout|product-compare-ux|identity-ux|content-interactions|guide-care-ux|starter-buying-ux|genetics-ux|shared-ux-fixes|site-experience)\.spec\.ts/,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 6000 },
  reporter: 'list',
  outputDir: 'output/interaction-regression-results',
  use: {
    baseURL: process.env.AUDIT_URL || 'http://127.0.0.1:3108',
    serviceWorkers: 'block',
    actionTimeout: 10000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: { args: ['--enable-unsafe-swiftshader'] }
  }
})
