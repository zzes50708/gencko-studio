import { test, expect } from '@playwright/test'

const inventory = Array.from({ length: 45 }, (_, n) => ({
  ID: `UX-${n + 1}`,
  Species: '豹紋守宮',
  Morph: `測試個體 ${n + 1}`,
  Status: 'ForSale',
  ListingPrice: n === 0 ? 8000 : 5000 - n,
  GenderType: '公',
  Birthday: '2025-01-01',
  Genes: ['土匪'],
  ImageURL: ''
})).concat([
  {
    ID: 'UX-F',
    Species: '肥尾守宮',
    Morph: '肥尾測試',
    Status: 'ForSale',
    ListingPrice: 3000,
    GenderType: '母',
    Birthday: '2025-01-01',
    Genes: ['幽靈'],
    ImageURL: ''
  }
])
async function seed(page: any) {
  await page.waitForFunction(
    () => !!(document.querySelector('.sticky-nav') as any)?.__vueParentComponent
  )
  await page.waitForTimeout(350)
  await page.evaluate((items: typeof inventory) => {
    let c = (document.querySelector('.sticky-nav') as any).__vueParentComponent
    while (c && !c.setupState.store) c = c.parent
    ;(window as any).uxStore = c.setupState.store
    c.setupState.store.inv = items
    c.setupState.store.loading = false
    c.setupState.store.inventoryLoaded = true
  }, inventory)
}

test('分享比較的移除更新網址，重新載入不復活', async ({ page }) => {
  await page.goto('/compare?ids=UX-1,UX-2')
  await seed(page)
  await expect(page.locator('.item-heading')).toHaveCount(2)
  await page.getByRole('button', { name: '移除 測試個體 1 比較項目' }).click()
  await expect(page.locator('.item-heading')).toHaveCount(1)
  await expect(page).toHaveURL(/ids=UX-2/)
  await page.reload()
  await seed(page)
  await expect(page.locator('.item-heading')).toHaveCount(1)
})

test('比較清單重新載入保留，桌面照片不因 hover 消失', async ({ page }) => {
  await page.goto('/shop', { waitUntil: 'domcontentloaded' })
  await seed(page)
  await page
    .locator('.flip-card')
    .first()
    .getByRole('button', { name: '加入比較', exact: true })
    .click()
  await expect(
    page.locator('.flip-card').first().getByRole('button', { name: '移出比較', exact: true })
  ).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await seed(page)
  await expect(
    page.locator('.flip-card').first().getByRole('button', { name: '移出比較', exact: true })
  ).toBeVisible()
  await page.locator('.flip-card').first().hover()
  expect(
    await page
      .locator('.flip-card .flip-inner')
      .first()
      .evaluate((e) => getComputedStyle(e).transform)
  ).toBe('none')
})

test('手機篩選草稿、價格驗證、固定操作及返回隔離', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true
  })
  const page = await context.newPage()
  await page.goto('/shop')
  await seed(page)
  await page.getByRole('button', { name: '篩選', exact: true }).tap()
  const dialog = page.getByRole('dialog', { name: '篩選條件', exact: true })
  await expect(dialog).toBeVisible()
  expect(
    await page.evaluate(() => {
      ;(document.querySelector('input[type=search]') as HTMLElement)?.focus()
      return !!document.activeElement?.closest('dialog')
    })
  ).toBe(true)
  await dialog.getByLabel('最低價格').fill('9000')
  await dialog.getByLabel('最高價格').fill('1000')
  await expect(dialog.getByText('最低價不可高於最高價', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('button', { name: /顯示.*隻/ })).toBeDisabled()
  await page.goBack()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/shop$/)
  await page.getByRole('button', { name: '篩選', exact: true }).tap()
  await expect(dialog.getByLabel('最低價格')).toHaveValue('')
  const before = (await dialog.locator('.filter-dialog-actions').boundingBox())!.y
  await dialog.locator('.filter-dialog-body').evaluate((e) => (e.scrollTop = e.scrollHeight))
  expect((await dialog.locator('.filter-dialog-actions').boundingBox())!.y).toBe(before)
  await page.setViewportSize({ width: 1024, height: 768 })
  await expect(dialog).toBeHidden()
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
    .not.toBe('hidden')
  await context.close()
})

test('手機基因草稿提交與切物種清理，總數不只顯示載入數', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true
  })
  const page = await context.newPage()
  await page.goto('/shop')
  await seed(page)
  await expect(page.locator('.catalog-summary')).toContainText('共 45 隻')
  await page.getByRole('button', { name: '篩選', exact: true }).tap()
  const dialog = page.getByRole('dialog', { name: '篩選條件', exact: true })
  await dialog
    .locator('summary')
    .filter({ hasText: /^多遺傳/ })
    .tap()
  await dialog.getByLabel('土匪', { exact: true }).check()
  await expect(page).toHaveURL(/\/shop$/)
  await dialog.getByRole('button', { name: /顯示.*隻/ }).tap()
  await expect(page).toHaveURL(/genes=/)
  await page.getByRole('button', { name: '肥尾守宮', exact: true }).tap()
  await expect(page.locator('.flip-card')).toHaveCount(1)
  await expect(page).not.toHaveURL(/genes=/)
  await context.close()
})

test('窄手機價格完整、工具列緊湊，兩隻比較同屏', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 320, height: 844 },
    hasTouch: true,
    isMobile: true
  })
  const page = await context.newPage()
  await page.goto('/shop')
  await seed(page)
  const price = page.locator('.flip-card .slim-price').first()
  const card = page.locator('.flip-card').first()
  await expect(card.locator('.mobile-card-details-body')).toBeHidden()
  const compactHeight = (await card.boundingBox())!.height
  const neighbor = page.locator('.flip-card').nth(1)
  const neighborHeight = (await neighbor.boundingBox())!.height
  const neighborPriceY = (await neighbor.locator('.slim-price').boundingBox())!.y
  await card.locator('summary').tap()
  await expect(card.locator('.mobile-card-details-body')).toContainText('UX-1')
  expect((await card.boundingBox())!.height).toBeGreaterThan(compactHeight)
  expect((await neighbor.boundingBox())!.height).toBeCloseTo(neighborHeight, 0)
  expect((await neighbor.locator('.slim-price').boundingBox())!.y).toBeCloseTo(neighborPriceY, 0)
  await card.locator('summary').tap()
  expect(await price.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true)
  expect(
    Math.round((await page.locator('.card-action-btn').first().boundingBox())!.height)
  ).toBeGreaterThanOrEqual(44)
  await page
    .locator('.flip-card')
    .first()
    .getByRole('button', { name: '加入比較', exact: true })
    .tap()
  expect((await page.locator('.compare-bar').boundingBox())!.height).toBeLessThanOrEqual(80)
  await page.goto('/compare?ids=UX-1,UX-2')
  await seed(page)
  expect(
    await page.locator('.compare-scroll').evaluate((e) => e.scrollWidth <= e.clientWidth + 1)
  ).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await context.close()
})

test('載入較多個體後返回列表保留位置，不跳到底部', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true
  })
  const page = await context.newPage()
  await page.goto('/shop', { waitUntil: 'domcontentloaded' })
  await seed(page)
  await page.evaluate(() => {
    ;(window as any).uxStore.displayLimit = 45
  })
  await expect(page.locator('.flip-card')).toHaveCount(45)
  await page.evaluate(() => window.scrollTo({ top: 1600, behavior: 'instant' }))
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(1500)
  const before = await page.evaluate(() => scrollY)
  await page
    .locator('.flip-card-link')
    .nth(8)
    .evaluate((e: HTMLElement) => e.click())
  await expect(page).toHaveURL(/\/product\/UX-/)
  await page.goBack()
  await expect(page.locator('.flip-card')).toHaveCount(45)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before - 50)
  expect(await page.evaluate(() => scrollY)).toBeLessThan(before + 50)
  await context.close()
})
