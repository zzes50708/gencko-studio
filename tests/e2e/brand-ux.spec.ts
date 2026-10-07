import { test, expect } from '@playwright/test'
test.use({ baseURL: process.env.UX_BASE_URL || 'http://[::1]:3000', reducedMotion: 'reduce' })
test('品牌頁四尺寸、入口與預覽顯示', async ({ page }) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 850 })
    await page.goto('/why-gencko')
    await page.waitForTimeout(1000)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
    const links = page.locator('.purchase-card,.overview-card')
    await expect(links).toHaveCount(8)
    for (const link of await links.all()) {
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      expect(await link.getAttribute('href')).toMatch(
        /^\/(buying-guide|about|shop|faq|care|calculator|hospital)$/
      )
    }
    if (width < 768) {
      const cards = page.locator('.purchase-card')
      expect((await cards.nth(0).boundingBox())!.y).toBe((await cards.nth(1).boundingBox())!.y)
    }
  }
  const first = page.locator('.purchase-card').first()
  await first.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/buying-guide$/)
})
test('預覽載入失敗仍保留文字及入口', async ({ page }) => {
  await page.route('**/previews/*.png', (r) => r.abort())
  await page.setViewportSize({ width: 390, height: 850 })
  await page.goto('/why-gencko')
  await page.waitForTimeout(1000)
  for (const c of await page.locator('.overview-card').all()) {
    await c.scrollIntoViewIfNeeded()
    await expect(c.locator('.article-image-fallback')).toBeVisible()
    await expect(c.locator('h2')).not.toBeEmpty()
  }
  await page.locator('.overview-card[href="/calculator"]').click()
  await expect(page).toHaveURL(/calculator$/)
})
