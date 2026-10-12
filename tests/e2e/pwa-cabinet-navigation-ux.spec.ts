import { test, expect } from '@playwright/test'

test('PWA 控制後線上重載仍顯示配置頁，離線才顯示離線頁', async ({ browser, baseURL }) => {
  test.setTimeout(60000)
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 800 },
    isMobile: true,
    hasTouch: true
  })
  const page = await context.newPage()
  await page.goto('/merch')
  await expect(
    page.getByRole('button', { name: '開啟 3D 客製模擬系統', exact: true })
  ).toBeVisible()
  await expect
    .poll(
      () => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.active),
      { timeout: 30000 }
    )
    .toBe(true)
  await page.reload()
  await expect(
    page.getByRole('button', { name: '開啟 3D 客製模擬系統', exact: true })
  ).toBeVisible()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
  await context.setOffline(true)
  await page.goto('/calculator')
  await expect(page).toHaveTitle(/離線/)
  await context.setOffline(false)
  await page.locator('#retry').click()
  await expect(page).toHaveURL(/\/calculator$/)
  await expect(page).not.toHaveTitle(/離線/)
  await context.close()
})
