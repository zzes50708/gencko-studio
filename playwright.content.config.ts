import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch:
    /(?:content-interactions|guide-care-ux|starter-buying-ux|article-outline-ux|faq-articles-ux|genetics-ux)\.spec\.ts/,
  timeout: 60000,
  expect: { timeout: 5000 },
  workers: 1,
  reporter: 'list',
  outputDir: 'output/content-interactions-results',
  use: {
    baseURL: process.env.AUDIT_URL || 'http://127.0.0.1:3110',
    serviceWorkers: 'block',
    actionTimeout: 10000,
    launchOptions: { args: ['--enable-unsafe-swiftshader'] },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  }
})
