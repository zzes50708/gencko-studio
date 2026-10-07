import { test, expect } from '@playwright/test'

for (const width of [320, 390, 768, 1440]) {
  test(`新手與購買流程在 ${width}px 沒有溢出且入口完整`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      viewport: { width, height: 844 },
      hasTouch: width < 768,
      isMobile: width < 768
    })
    const page = await context.newPage()
    await page.goto('/start-here')
    await expect(page.locator('.starter-reading-index a')).toHaveText([
      '了解飼養',
      '到家準備',
      '下一步'
    ])
    await expect(page.locator('.lane-actions a[href="/qs"]')).toBeVisible()
    await expect(page.locator('.lane-actions a[href="/shop?beginner=true"]')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (width < 768) {
      expect(
        await page
          .locator('.knowledge-grid')
          .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
      ).toBe(2)
      for (const link of await page.locator('.starter-reading-index a').all())
        expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    }
    await page.goto('/buying-guide')
    if (width < 768)
      expect((await page.locator('.purchase-decision-path').boundingBox())!.height).toBeLessThan(
        150
      )
    const contact = page.locator('.node-link[href^="https://line.me/"]')
    await expect(contact).toHaveAttribute('target', '_blank')
    await expect(contact).toHaveAttribute('rel', 'noopener noreferrer')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.waitForTimeout(500)
    await page.locator('.node-link[href="/faq?category=purchase"]').click()
    await expect(page).toHaveURL(/faq\?category=purchase/)
    await expect(page.locator('#faq-tab-purchase')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('#faq-panel-purchase')).toBeVisible()
    await context.close()
  })
}

test('購買問答直接載入與同頁切換都支援指定分類', async ({ page }) => {
  await page.goto('/faq?category=purchase')
  await expect(page.locator('#faq-tab-purchase')).toHaveAttribute('aria-selected', 'true')
  await page.waitForTimeout(500)
  await page.locator('#faq-tab-gecko').click()
  await expect(page.locator('#faq-tab-gecko')).toHaveAttribute('aria-selected', 'true')
  await page.goto('/faq?category=unknown')
  await expect(page.locator('#faq-tab-gecko')).toHaveAttribute('aria-selected', 'true')
})
