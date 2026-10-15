import { test, expect } from '@playwright/test'

async function seed(page: any) {
  const inventory = Array.from({ length: 12 }, (_, index) => ({
    id: `FLIP-${index + 1}`,
    species: '豹紋守宮',
    morph: `翻卡測試品系 ${index + 1}`,
    status: 'ForSale',
    listing_price: 8000,
    gender_type: '溫控',
    gender_value: '27.5',
    birthday: '2026-03-14',
    photo_updated_at: '2026-10-10',
    created_at: '2026-10-10',
    genes: ['土匪', '橘化', '日蝕', '川普白化', '黑夜'],
    note: index === 0 ? '完整備註第一行\n完整備註第二行：不可截斷的個體資訊。' : '',
    image_url: ''
  }))
  await page.route('**/rest/v1/animals*', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(inventory)
    })
  )
  await page.goto('/shop')
  await expect(page.locator('.flip-card')).toHaveCount(12)
}
test.use({ serviceWorkers: 'block' })

test('桌面六欄、翻卡完整資訊與收藏操作', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 })
  await seed(page)
  const grid = page.locator('.grid.photo-grid').last()
  expect(
    await grid.evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length
    )
  ).toBe(6)
  const card = page.locator('.flip-card').first()
  await expect(card.locator('.flip-front .card-id')).toBeHidden()
  await expect(card.locator('.flip-front .card-genes')).toBeHidden()
  await expect(card.locator('.desktop-front-price')).toContainText('8000')
  await card.hover()
  await expect
    .poll(() =>
      card.locator('.flip-inner').evaluate((element) => getComputedStyle(element).transform)
    )
    .toMatch(/matrix3d\(-1/)
  await expect(card.locator('.flip-back-information')).toContainText('2026-03-14')
  await expect(card.locator('.flip-back-information')).toContainText('不保證性別')
  await expect(card.locator('.flip-back-information')).toContainText('母溫')
  await expect(card.locator('.flip-back-information')).toContainText(
    '土匪 · 橘化 · 日蝕 · 川普白化 · 黑夜'
  )
  await expect(card.locator('.flip-back-information')).toContainText('完整備註第二行')
  const contained = await card.evaluate((element) => {
    const information = element.querySelector('.flip-back-information')!
    return (
      information.getBoundingClientRect().bottom <= element.getBoundingClientRect().bottom &&
      information.scrollHeight <= information.clientHeight
    )
  })
  expect(contained).toBe(true)
  await card.getByRole('button', { name: '收藏', exact: true }).click()
  await expect(card.getByRole('button', { name: '已收藏', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await card.locator('.flip-card-link').focus()
  await expect(card.locator('.flip-card-link')).toBeFocused()
})

test('手機保留兩欄與基本資訊，不執行翻卡', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 })
  await seed(page)
  const card = page.locator('.flip-card').first()
  expect(
    await page
      .locator('.grid.photo-grid')
      .last()
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)
  ).toBe(2)
  await expect(card.locator('.flip-back')).toBeHidden()
  await expect(card.locator('.mobile-card-details-body')).toBeHidden()
  await expect(card.locator('.mobile-card-meta')).toHaveCount(0)
  await expect(card.locator('.card-genes')).toHaveCount(0)
  await card.locator('.mobile-card-details summary').click()
  await expect(card.locator('.mobile-card-details-body')).toContainText('川普白化')
  await expect(card.locator('.mobile-card-details-body')).toContainText('母溫')
  await expect(card.locator('.mobile-card-details-body')).toContainText('2026-03-14')
  await expect(card.locator('.mobile-card-details-body')).toContainText('完整備註第二行')
  expect(
    await card.locator('.flip-inner').evaluate((element) => getComputedStyle(element).transform)
  ).toBe('none')
})

test('未確認性別可獨立排除，網址重載與重置保持一致', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await seed(page)
  await page.getByRole('button', { name: /展開篩選/ }).click()
  const filters = page.locator('#desktop-shop-filters')
  await expect(filters.getByLabel('已確認公', { exact: true })).toBeChecked()
  await filters.getByLabel('孵化溫度／未確認', { exact: true }).uncheck()
  await expect(page.locator('.flip-card')).toHaveCount(0)
  await expect(page).toHaveURL(/sexU=false/)
  await page.reload()
  await page.getByRole('button', { name: /展開篩選/ }).click()
  await expect(page.locator('.flip-card')).toHaveCount(0)
  await expect(
    page.locator('#desktop-shop-filters').getByLabel('孵化溫度／未確認', { exact: true })
  ).not.toBeChecked()
  await page.getByRole('button', { name: '重置全部篩選', exact: true }).click()
  await expect(page.locator('.flip-card')).toHaveCount(12)
  await expect(page).not.toHaveURL(/sexU=/)
})
