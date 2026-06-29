import { defineConfig, devices } from '@playwright/test'

// 本機端口從 .env 或預設 3000；CI 環境 port 同
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } }]
  // 由外部啟動的 dev server 接管；本機跑前請先 `npm run dev`
  // 若想自動啟服，把下面解註並調整 reuseExistingServer
  // webServer: {
  //   command: 'npm run dev',
  //   url: BASE_URL,
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 180_000
  // }
})
