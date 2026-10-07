import { test, expect } from '@playwright/test'
const record = {
  id: 'UX-ID',
  morph: '測試品系'.repeat(12),
  gender_type: '公',
  birthday: '2025-09-02',
  species: '豹紋守宮',
  image_url: 'https://example.com/missing.jpg'
}
async function enter(page: any) {
  await page.goto('/stories')
  await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as any)?.__vue_app__)
  await page.evaluate(async () => {
    await (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$router.push('/identity/UX-ID')
  })
}
test('身分證手機可讀、圖片失敗降級與列印隔離', async ({ page }) => {
  await page.route('**/rest/v1/animals?**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(record) })
  )
  await page.route('https://example.com/**', (r) => r.abort())
  await page.route('https://wsrv.nl/**', (r) => r.abort())
  await page.setViewportSize({ width: 390, height: 850 })
  await enter(page)
  await expect(page.locator('.id-card')).toBeVisible()
  await expect(page.locator('.no-img')).toHaveText('暫無照片')
  for (const width of [320, 390, 740, 1440]) {
    await page.setViewportSize({ width, height: 850 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.setViewportSize({ width: 390, height: 850 })
  expect((await page.locator('.id-actions').boundingBox())!.y).toBeLessThan(850)
  await page.evaluate(() => {
    ;(window as any).__printed = false
    window.print = () => {
      ;(window as any).__printed = true
    }
  })
  await page.getByRole('button', { name: '儲存電子身分證為 PDF', exact: true }).click()
  expect(await page.evaluate(() => (window as any).__printed)).toBe(true)
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('.id-card')).toBeVisible()
  await expect(page.locator('.site-footer')).toBeHidden()
  await expect(page.locator('.bottom-nav')).toBeHidden()
  await page.emulateMedia({ media: 'screen' })
  await page.evaluate(async () => {
    await (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$router.push('/stories')
  })
  await expect(page.locator('body')).not.toHaveClass(/identity-print-page/)
})
test('身分證載入失敗可原頁重試', async ({ page }) => {
  let fail = true
  await page.route('**/rest/v1/animals?**', (r) =>
    r.fulfill({
      status: fail ? 400 : 200,
      contentType: 'application/json',
      body: JSON.stringify(
        fail ? { message: 'service unavailable', code: '503' } : { ...record, image_url: null }
      )
    })
  )
  await enter(page)
  await expect(page.getByRole('alert')).toContainText('資料暫時無法載入')
  fail = false
  await page.getByRole('button', { name: '重新載入', exact: true }).click()
  await expect(page.locator('.id-card')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})
