import { test, expect } from '@playwright/test'
test('一般錯誤網址使用頁面提示並返回內容首頁', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 })
  await page.goto('/ux-does-not-exist')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('找不到此頁面')
  await page.getByRole('button', { name: '回到首頁', exact: true }).click()
  await expect(page).toHaveURL(/\/home$/)
})
for (const item of [
  {
    path: '/product/UX-FAIL',
    table: 'animals',
    error: '.product-read-error',
    back: '返回商城列表',
    fallback: '/shop'
  },
  {
    path: '/auction/UX-FAIL',
    table: 'auctions',
    error: '.not-found[role="alert"]',
    back: '返回競標列表',
    fallback: '/auction'
  }
]) {
  test(`${item.path} 失敗可返回列表且重試按鈕可觸控`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 850 })
    await page.goto('/stories')
    await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as any)?.__vue_app__)
    await page.route(`**/rest/v1/${item.table}?**`, (r) =>
      r.fulfill({ status: 400, json: { message: 'temporary failure' } })
    )
    await page.route('**/rest/v1/site_settings?**', (r) => r.fulfill({ json: null }))
    await page.evaluate(async (path) => {
      await (
        document.querySelector('#__nuxt') as any
      ).__vue_app__.config.globalProperties.$router.push(path)
    }, item.path)
    const error = page.locator(item.error)
    await expect(error).toBeVisible()
    await expect(error.getByRole('button', { name: item.back, exact: true })).toBeVisible()
    expect((await error.locator('button').first().boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await error.getByRole('button', { name: item.back, exact: true }).click()
    await expect(page).toHaveURL(/\/stories$/)
  })
}

test('手機爬櫃選單鍵盤焦點限制、Escape 還原及解鎖', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 })
  await page.goto('/merch')
  await page.waitForFunction(
    () => !!(document.querySelector('.cabinet-select-trigger') as any)?.__vueParentComponent
  )
  const trigger = page.getByRole('button', { name: '層數', exact: true })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: '層數', exact: true })
  await expect(dialog).toBeVisible()
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate((e) => e.contains(document.activeElement))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
})
