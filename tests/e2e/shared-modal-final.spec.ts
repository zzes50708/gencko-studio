import { expect, test } from '@playwright/test'

test('768px 周邊列表導頁補驗', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  const response = await page.goto('/merch')
  expect(response?.status()).toBe(200)
  await expect(page.locator('h1')).toContainText('飼養用品')
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(true)
})

test('手機收藏詢問與比較列同時出現時不遮擋', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await page.addInitScript(() => localStorage.setItem('gencko_wishlist', JSON.stringify(['S-53518'])))
  await page.goto('/shop')
  await page.addStyleTag({ content: '#nuxt-devtools-container { display:none !important }' })
  const card = page.locator('.flip-card').first()
  const compareButton = card.locator('.card-action-btn').filter({ hasText: '加入比較' })
  await expect(compareButton).toBeVisible({ timeout: 30000 })
  await compareButton.click()
  const compare = page.locator('.compare-bar')
  const inquire = page.locator('.floating-inquire-btn')
  await expect(compare).toBeVisible()
  await expect(inquire).toBeVisible()
  const compareBox = await compare.boundingBox()
  const inquireBox = await inquire.boundingBox()
  expect(inquireBox!.y + inquireBox!.height).toBeLessThan(compareBox!.y)
  await page.screenshot({ path: 'output/ui-final-20260910/shop-floating-320.png' })
})

test('iOS 安裝說明在窄螢幕可閱讀、限制焦點並返回觸發鍵', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 720 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true
  })
  const page = await context.newPage()
  await page.goto('/home')
  await page.addStyleTag({ content: '#nuxt-devtools-container { display:none !important }' })
  const install = page.getByRole('button', { name: '下載 App' })
  await expect(install).toBeVisible()
  await install.click()
  const dialog = page.getByRole('dialog', { name: '安裝 Gencko App（iOS）' })
  await expect(dialog).toBeVisible()
  const close = dialog.getByRole('button', { name: '關閉' })
  await expect(close).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  // 原生 dialog 允許焦點經過瀏覽器工具列，但背景頁面仍必須不可聚焦。
  await expect(install).not.toBeFocused()
  await page.keyboard.press('Tab')
  await expect(close).toBeFocused()
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden')
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(true)
  await page.screenshot({ path: 'output/ui-final-20260910/ios-install-320.png' })
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(install).toBeFocused()
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('')
  await context.close()
})
