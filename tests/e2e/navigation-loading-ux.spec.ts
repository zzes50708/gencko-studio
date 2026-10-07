import { test, expect } from '@playwright/test'
test('慢速換頁有載入回饋、完成清除並可返回', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 })
  await page.goto('/stories')
  await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as any)?.__vue_app__)
  let release!: () => void
  const gate = new Promise<void>((r) => {
    release = r
  })
  await page.route('**/rest/v1/animals?**', async (r) => {
    await gate
    await r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'UX-SLOW', morph: '慢速測試', image_url: null })
    })
  })
  await page.evaluate(() => {
    void (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$router.push('/identity/UX-SLOW')
  })
  await expect(page.getByRole('status')).toHaveText('正在載入頁面')
  await expect(page.locator('#main-content')).toHaveAttribute('aria-busy', 'true')
  await expect(page.locator('.nuxt-loading-indicator')).toHaveCSS('pointer-events', 'none')
  await expect(page.locator('.nuxt-loading-indicator')).toHaveCSS('opacity', '1')
  release()
  await expect(page.locator('.id-card')).toBeVisible()
  await expect(page.getByText('正在載入頁面', { exact: true })).toHaveCount(0)
  await expect(page.locator('#main-content')).toHaveAttribute('aria-busy', 'false')
  await page.goBack()
  await expect(page.locator('.stories-page')).toBeVisible()
})
