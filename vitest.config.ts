import { defineConfig } from 'vitest/config'

// 單元測試只掃 tests 根目錄；tests/e2e 交給 Playwright（playwright.config.ts）
export default defineConfig({
  test: {
    include: ['tests/*.spec.{js,ts}'],
    exclude: ['tests/e2e/**', 'node_modules/**']
  }
})
