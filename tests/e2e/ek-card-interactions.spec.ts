import { test, expect } from '@playwright/test'

test('循環副本在兩個方向都能懸停、點擊，鍵盤不重複走訪', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.route('**/rest/v1/*animals**', (route) =>
    route.fulfill({
      json: Array.from({ length: 24 }, (_, i) => ({
        id: `LOOP-${i}`,
        morph: `循環個體 ${i}`,
        species: '豹紋守宮',
        status: 'ForSale',
        is_hot: true,
        genes: []
      }))
    })
  )
  await open(page)
  await page.getByRole('button', { name: '暫停個體展示' }).click()
  const rows = page.locator('.app-marquee')
  for (let rowIndex = 0; rowIndex < 2; rowIndex++) {
    const row = rows.nth(rowIndex)
    await row.scrollIntoViewIfNeeded()
    await row.locator('.app-marquee__track').evaluate((el) => {
      const style = getComputedStyle(el)
      const animation = el.getAnimations()[0]
      animation.pause()
      animation.currentTime =
        parseFloat(style.animationDuration) *
        1000 *
        (style.animationDirection === 'reverse' ? 0.1 : 0.9)
    })
    const clones = row.locator('.app-marquee__group').nth(1).locator('.hot-card-link')
    const index = await clones.evaluateAll((nodes) =>
      nodes.findIndex((el) => {
        const r = el.getBoundingClientRect()
        return r.left > 30 && r.right < innerWidth - 30
      })
    )
    expect(index).toBeGreaterThanOrEqual(0)
    const card = clones.nth(index)
    await card.hover()
    await expect
      .poll(() =>
        card.locator('.hot-card-turncue').evaluate((el) => getComputedStyle(el).backgroundColor)
      )
      .toBe('rgb(204, 59, 8)')
    await expect(card).toHaveAttribute('tabindex', '-1')
    const href = await card.getAttribute('href')
    if (rowIndex === 1) {
      await card.click()
      await expect(page).toHaveURL(new RegExp(href! + '$'))
    }
  }
})

async function open(page, route = '/home') {
  await page.goto(route)
  await page.waitForFunction(() => {
    const app = (document.querySelector('#__nuxt') as any)?.__vue_app__
    return app && !app.config.globalProperties.$nuxt.isHydrating
  })
}

test('桌機工具卡：框架回正、操作底色填入，連結保留', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await open(page)
  const card = page.locator('.tool-preview').first()
  await card.scrollIntoViewIfNeeded()
  await page.mouse.move(0, 0)
  await expect(card.locator('.tool-preview__windowbar')).toBeVisible()
  const frame = card.locator('.tool-preview__media')
  const before = await frame.evaluate((el) => getComputedStyle(el).transform)
  await card.hover()
  await expect.poll(() => frame.evaluate((el) => getComputedStyle(el).transform)).not.toBe(before)
  await expect(card.locator('.hover-action')).toContainText('開啟計算機')
  await expect
    .poll(() =>
      card
        .locator('.hover-action')
        .evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el, '::before').transform).a)
    )
    .toBeGreaterThan(0.99)
  await expect(card).toHaveAttribute('href', '/calculator')
  await card.screenshot({ path: 'output/ek-cards/tool-hover.png', animations: 'disabled' })
})

test('桌機文章卡：圖片與閱讀入口一起回應，鍵盤同樣可用', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await open(page, '/articles')
  const card = page.locator('.article-entry').first()
  const href = await card.getAttribute('href')
  await expect(card.locator('.hover-action')).toContainText('閱讀文章')
  await card.focus()
  await expect
    .poll(() =>
      card
        .locator('.hover-action')
        .evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el, '::before').transform).a)
    )
    .toBeGreaterThan(0.99)
  await expect(card).toHaveAttribute('href', href!)
  await card.screenshot({ path: 'output/ek-cards/article-focus.png', animations: 'disabled' })
})

test('桌機展示卡：紙卡有角度，hover 回正並暫停移動', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await open(page)
  await page.locator('.app-marquee').first().scrollIntoViewIfNeeded()
  await page.locator('.app-marquee').first().hover()
  const cards = page.locator('.app-marquee__group:not([aria-hidden]) .hot-card-link')
  const index = await cards.evaluateAll((nodes) =>
    nodes.findIndex((node) => {
      const r = node.getBoundingClientRect()
      return r.left > 20 && r.right < innerWidth - 20
    })
  )
  const card = cards.nth(Math.max(0, index))
  await expect(card.locator('.hot-card-turncue')).toBeVisible()
  await card.hover()
  await expect
    .poll(() => card.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).b))
    .toBeCloseTo(0, 2)
  await expect
    .poll(() =>
      page
        .locator('.app-marquee__track')
        .first()
        .evaluate((el) => getComputedStyle(el).animationPlayState)
    )
    .toBe('paused')
  await card.screenshot({ path: 'output/ek-cards/specimen-hover.png', animations: 'disabled' })
  await page
    .locator('.home-product-marquee')
    .screenshot({ path: 'output/ek-cards/specimen-row.png', animations: 'disabled' })
})

test('觸控介面保持平面，閱讀入口預設可見', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true
  })
  const page = await context.newPage()
  await open(page)
  const card = page.locator('.tool-preview').first()
  await card.scrollIntoViewIfNeeded()
  await expect(card.locator('.hover-action')).toBeVisible()
  expect(
    await card.locator('.tool-preview__media').evaluate((el) => getComputedStyle(el).transform)
  ).toBe('none')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await context.close()
})

test('品牌服務卡把展示與真實入口連在一起', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await open(page, '/why-gencko')
  const card = page.locator('.overview-card').first()
  await expect(card.locator('.hover-action')).toContainText('查看個體證書')
  await card.hover()
  await expect
    .poll(() =>
      card
        .locator('.hover-action')
        .evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el, '::before').transform).a)
    )
    .toBeGreaterThan(0.99)
  await expect(card).toHaveAttribute('href', '/certificates')
  await card.screenshot({ path: 'output/ek-cards/brand-hover.png', animations: 'disabled' })
})
