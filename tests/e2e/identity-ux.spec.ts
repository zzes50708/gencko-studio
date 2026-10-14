import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
const record = {
  id: 'UX-ID',
  morph: '測試品系'.repeat(12),
  gender_type: '公',
  birthday: '2025-09-02',
  species: '豹紋守宮',
  image_url: 'https://example.com/missing.jpg'
}
test.use({ serviceWorkers: 'block' })
async function enter(page: any) {
  await page.goto('/certificates')
  const search = page.getByRole('searchbox', { name: '個體 ID', exact: true })
  await expect(search).toBeVisible()
  await search.fill('UX-ID')
  await page.getByRole('button', { name: '搜尋個體證書', exact: true }).click()
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
  expect((await page.locator('.identity-navigation').boundingBox())!.y).toBeLessThan(850)
  await page.evaluate(() => {
    ;(window as any).__printed = false
    window.print = () => {
      ;(window as any).__printed = true
    }
  })
  await page.getByRole('button', { name: '儲存個體證書為 PDF', exact: true }).click()
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

test('證書搜尋限定完整 ID 並保留可辨識的錯誤', async ({ page }) => {
  await page.goto('/certificates')
  const input = page.getByRole('searchbox', { name: '個體 ID', exact: true })
  await expect(page.getByRole('searchbox')).toHaveCount(1)
  await input.fill('豹紋守宮')
  await page.getByRole('button', { name: '搜尋個體證書' }).click()
  await expect(page.getByRole('alert')).toContainText('完整個體 ID')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await expect(page).toHaveURL(/\/certificates$/)
  await page.route('**/rest/v1/animals?**', (r) =>
    r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ...record, id: 'S-53518', image_url: null })
    })
  )
  await input.fill(' ｓ－５３５１８ ')
  await input.press('Enter')
  await expect(page).toHaveURL(/\/identity\/S-53518$/)
  await expect(page.locator('.certificate-registration')).toContainText('S-53518')
  await expect(page.locator('.certificate-lineage')).toHaveCount(0)
  await expect(page.locator('.identity-certificate')).not.toContainText('捷客')
})

test('證書不呈現親本或錯誤品牌名稱且以單頁列印', async ({ page }) => {
  await page.route('**/rest/v1/animals?**', (route) => {
    const parents = route.request().url().includes('id=in.')
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        parents
          ? [
              { id: 'P-001', morph: '父本品系' },
              { id: 'P-002', morph: '母本品系' }
            ]
          : {
              ...record,
              morph: '橘化土匪 F1',
              image_url: null,
              parent_male_id: 'P-001',
              parent_female_id: 'P-002'
            }
      )
    })
  })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await enter(page)
  await expect(page.locator('.identity-certificate')).not.toContainText('父本')
  await expect(page.locator('.identity-certificate')).not.toContainText('母本')
  await expect(page.locator('.identity-certificate')).not.toContainText('捷客')
  await expect(page.getByRole('heading', { name: '血統證書', exact: true })).toBeVisible()
  await page.locator('.identity-certificate').screenshot({
    path: 'output/certificate-desktop.png',
    style: '.sticky-nav,.bottom-nav,.floating-inquiry,.inquiry-float{visibility:hidden!important}'
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.identity-certificate').screenshot({
    path: 'output/certificate-mobile.png',
    style: '.sticky-nav,.bottom-nav,.floating-inquiry,.inquiry-float{visibility:hidden!important}'
  })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('.identity-navigation')).toBeHidden()
  await expect(page.locator('.certificate-profile')).toBeVisible()
  await page.pdf({
    path: 'output/certificate-print.pdf',
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true
  })
  const pdf = readFileSync('output/certificate-print.pdf').toString('latin1')
  expect(pdf.match(/\/Type\s*\/Page\b/g)?.length).toBe(1)
})

test('桌面與手機品牌選單都有個體證書入口', async ({ page }) => {
  await page.goto('/certificates')
  await page.getByRole('button', { name: '品牌與購買選單', exact: true }).click()
  await expect(
    page.locator('.sticky-nav').getByRole('link', { name: '個體證書', exact: true })
  ).toHaveAttribute('href', '/certificates')
  await page.setViewportSize({ width: 390, height: 844 })
  await page
    .getByRole('navigation', { name: '手機底部導覽' })
    .getByRole('button')
    .filter({ hasText: '更多' })
    .click()
  await expect(
    page.getByRole('dialog').getByRole('link', { name: '個體證書', exact: true })
  ).toHaveAttribute('href', '/certificates')
})

test('個體頁照片不再開啟身分證', async ({ page }) => {
  await page.goto('/product/S-53518')
  await expect(page.locator('.prod-img-box')).toBeVisible()
  await expect(page.locator('.prod-img-box a[href*="/identity/"]')).toHaveCount(0)
  await expect(page.getByText('點擊圖片可查看專屬電子身分證', { exact: true })).toHaveCount(0)
})
