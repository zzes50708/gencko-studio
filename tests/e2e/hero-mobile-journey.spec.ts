import { test, expect } from '@playwright/test'

test('Hero Lab 手機原生觸控推進動畫並可返回首頁', async ({ browser }) => {
  test.setTimeout(90000)
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto('/')
    await page.addStyleTag({ content: '#nuxt-devtools-container { display:none !important; }' })
    await expect(page.locator('.hero-canvas-shell canvas')).toBeVisible({ timeout: 60000 })
    await page.waitForFunction(() => Boolean((window as any).__hero?.state))
    await expect(page.locator('.hero-mobile-fallback')).toHaveCount(0)
    await expect.poll(() => page.locator('.hero-lab-scroll-space').evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThan(5000)
    await page.screenshot({ path: 'output/hero-mobile-restored/initial.png' })
    const cdp = await context.newCDPSession(page)
    // 使用瀏覽器原生觸控輸入，避免只驗證程式直接指定捲動位置。
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 190, y: 690 }] })
    for (let y = 650; y >= 210; y -= 40) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 190, y }] })
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(50)
    await expect.poll(() => page.evaluate(() => (window as any).__hero.state().currentHeroScrollProgress)).toBeGreaterThan(.001)
    await page.screenshot({ path: 'output/hero-mobile-restored/after-touch.png' })
    await page.getByRole('link', { name: '前往首頁', exact: true }).click()
    await expect(page).toHaveURL(/\/home$/)
    await expect(page.locator('.hero-canvas-shell')).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('hero-lab-route'))).toBe(false)
    expect(errors).toEqual([])
  } finally {
    await context.close()
  }
})
