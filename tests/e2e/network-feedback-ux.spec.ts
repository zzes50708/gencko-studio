import { test, expect } from '@playwright/test'

test('離線提示不阻擋既有內容，恢復連線後消失', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 850 })
  await page.goto('/stories')
  await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as any)?.__vue_app__)
  await context.setOffline(true)
  await expect(
    page.getByText('目前沒有網路連線，已載入的內容仍可瀏覽；連線恢復後請重試。')
  ).toBeVisible()
  await expect(page.locator('.stories-page')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await context.setOffline(false)
  await expect(page.locator('.connection-notice')).toHaveCount(0)
})

test('換頁等待過久顯示提示，完成後清除', async ({ page }) => {
  await page.goto('/stories')
  await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as any)?.__vue_app__)
  let release!: () => void
  const gate = new Promise<void>((r) => {
    release = r
  })
  await page.route('**/rest/v1/animals?**', async (r) => {
    await gate
    await r.fulfill({ json: { id: 'UX-WAIT', morph: '等待測試', image_url: null } })
  })
  await page.evaluate(() => {
    void (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$router.push('/identity/UX-WAIT')
  })
  await expect(page.getByText('載入時間較長，請稍候；也可以選擇其他頁面。')).toBeVisible({
    timeout: 12000
  })
  release()
  await expect(page.locator('.id-card')).toBeVisible()
  await expect(page.locator('.slow-loading-notice')).toHaveCount(0)
})
