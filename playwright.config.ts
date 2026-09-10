import { defineConfig, devices } from '@playwright/test'

// E2E 使用獨立 port，避免誤接到既有 preview 或與開發者的 3000 互相干擾。
const PORT = process.env.E2E_PORT ? Number(process.env.E2E_PORT) : 3001
const BASE_URL = `http://localhost:${PORT}`
const NPM_COMMAND = process.platform === 'win32' ? 'npm.cmd' : 'npm'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 5'] },
      grep: /Hero Lab|About/
    }
  ],
  webServer: {
    command: `${NPM_COMMAND} run dev -- --port=${PORT} --host=127.0.0.1`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 180_000
  }
})
