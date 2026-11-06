import { test, expect } from '@playwright/test'

for (const mobile of [true, false]) {
  test(`原版全息與蛋內尺寸：${mobile ? '手機' : '桌機'}`, async ({ browser }) => {
    test.setTimeout(120000)
    const width = mobile ? 390 : 1440
    const context = await browser.newContext({
      viewport: { width, height: mobile ? 844 : 900 },
      isMobile: mobile,
      hasTouch: mobile,
      serviceWorkers: 'block'
    })
    const page = await context.newPage()
    try {
      await page.goto('/')
      await page.waitForFunction(
        () => Boolean((window as any).__hero?.state),
        {},
        { timeout: 90000 }
      )
      await page.waitForTimeout(500)
      await page.evaluate(() =>
        scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.78)
      )
      await page.waitForFunction(
        () => {
          const state = (window as any).__hero.state()
          return (
            Math.abs(state.currentHeroScrollProgress - 0.78) < 0.001 &&
            Number(state.embryoRadiusRatio) > 0
          )
        },
        {},
        { timeout: 60000 }
      )
      const state = await page.evaluate(() => (window as any).__hero.state())
      expect(state.embryoMaterial).toBe('ShaderMaterial')
      // 使用實際 GLB 頂點半徑與直立後的尺寸，不只檢查宣告的縮放常數。
      expect(state.embryoRadiusRatio).toBeGreaterThan(0.97)
      expect(state.embryoRadiusRatio).toBeLessThanOrEqual(1)
      expect(state.embryoHeightRatio).toBeGreaterThanOrEqual(0.94)
      expect(state.embryoHeightRatio).toBeLessThanOrEqual(1)
      await expect(page.locator('.hero-accessible-nav,.hero-interaction-panel')).toHaveCount(0)
      await page.screenshot({ path: `output/hero-original-hologram/${width}-fit.png` })
    } finally {
      await context.close()
    }
  })
}
