import { test, expect } from '@playwright/test'
test('案例待更新頁提供直接入口且各尺寸不溢出', async ({ page }) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 850 })
    await page.goto('/stories')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('真實故事，內容整理中')
    await expect(page.locator('.story-card')).toHaveCount(0)
    const links = page.locator('.action-grid a')
    await expect(links).toHaveCount(3)
    expect(
      await links.evaluateAll((items) => items.every((e) => e.getBoundingClientRect().height >= 44))
    ).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (width < 768) {
      expect((await links.first().boundingBox())!.y).toBeLessThan(400)
    }
  }
  await page.setViewportSize({ width: 390, height: 850 })
  await page.getByRole('link', { name: '先看新手入門', exact: true }).click()
  await expect(page).toHaveURL(/\/start-here$/)
  await page.goBack()
  await page.getByRole('link', { name: '先看信任保證', exact: true }).click()
  await expect(page).toHaveURL(/\/why-gencko$/)
  await page.goBack()
  await page.getByRole('link', { name: '先去選購守宮', exact: true }).click()
  await expect(page).toHaveURL(/\/shop$/)
})
