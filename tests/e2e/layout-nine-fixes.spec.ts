import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const animals = [1, 2, 3].map((n) => ({
  id: `LAYOUT-${n}`,
  species: '豹紋守宮',
  morph: '黑夜',
  status: 'ForSale',
  listing_price: 8000,
  genes: [],
  gender_type: '公',
  birthday: '2026-03-14',
  image_url: ''
}))
const gene = {
  name: 'WY',
  brief: '基因簡介。',
  detail: '這是用來驗證閱讀欄寬度的段落。'.repeat(45),
  source: 'https://example.com/' + 'long-reference-'.repeat(20),
  image_url: ''
}
const article = {
  id: 'LAYOUT-ARTICLE',
  title: '文章標題與章節排版驗證',
  category: '環境佈置',
  status: 'published',
  author: 'Gencko',
  publish_date: '2026-10-27',
  image_url: '',
  content: '<h2>第一章</h2><p>' + '正文測試。'.repeat(120) + '</p><h2>第二章</h2><p>章節內容。</p>'
}
async function fixtures(page: Page) {
  await page.route('**/rest/v1/animals**', (route) => route.fulfill({ json: animals }))
  await page.route('**/rest/v1/genetic_pages**', (route) =>
    route.fulfill({ json: new URL(route.request().url()).searchParams.has('name') ? gene : [gene] })
  )
  await page.route('**/rest/v1/articles**', (route) =>
    route.fulfill({
      json: new URL(route.request().url()).searchParams.has('id') ? article : [article]
    })
  )
  await page.route('https://tiles.openfreemap.org/**', (route) => route.abort())
}
async function ready(page: Page) {
  await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as any)?.__vue_app__)
  await page.evaluate(() => document.fonts.ready)
}

for (const width of [320, 390, 768, 1440]) {
  test(`${width}px 共用底部空間只由手機外框保留`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/care')
    await ready(page)
    const data = await page.evaluate(() => {
      const footer = document.querySelector('footer')!.getBoundingClientRect()
      return {
        html: getComputedStyle(document.documentElement).paddingBottom,
        body: parseFloat(getComputedStyle(document.body).paddingBottom),
        gap: document.documentElement.scrollHeight - footer.bottom,
        overflow: document.documentElement.scrollWidth > innerWidth
      }
    })
    expect(data.html).toBe('0px')
    expect(data.body).toBe(width < 768 ? 62 : 0)
    expect(data.gap).toBeLessThanOrEqual(width < 768 ? 100 : 34)
    expect(data.overflow).toBe(false)
  })
  test(`${width}px 基因來源不裁切，無圖正文使用閱讀寬度`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await fixtures(page)
    await page.goto('/genes')
    await ready(page)
    await page.locator('a[href="/genes/WY"]').first().click()
    await expect(page.locator('.source-text a')).toHaveAttribute('href', gene.source)
    const data = await page.locator('.source-text').evaluate((element) => {
      const r = element.getBoundingClientRect()
      return { scrollWidth: element.scrollWidth, width: element.clientWidth, right: r.right }
    })
    expect(data.scrollWidth).toBeLessThanOrEqual(data.width + 1)
    expect(data.right).toBeLessThanOrEqual(width)
    await expect(page.locator('.detail-txt')).toHaveText(gene.detail)
    if (width >= 768)
      expect((await page.locator('.gene-text-content').boundingBox())!.width).toBeLessThan(900)
    await page.locator('.source-text').scrollIntoViewIfNeeded()
    await page.screenshot({ path: `output/layout-fixed-gene-${width}.png` })
  })
  test(`${width}px 文章標題優先、返回與章節功能保留`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await fixtures(page)
    // 經由站內導覽載入隔離資料，避免 SSR 真實文章清單蓋過瀏覽器攔截。
    await page.goto('/profile')
    await ready(page)
    if (width < 768) {
      await page.locator('.bottom-nav').getByRole('button', { name: /知識/ }).click()
      await page.getByRole('dialog').getByRole('link', { name: '文章列表', exact: true }).click()
    } else {
      await page.getByRole('button', { name: '新手與知識選單', exact: true }).click()
      await page
        .locator('#nav-menu-learn')
        .getByRole('link', { name: '文章列表', exact: true })
        .click()
    }
    await page.locator('a[href="/articles/LAYOUT-ARTICLE"]').first().click()
    await expect(page.locator('.reader-header h1')).toHaveText(article.title)
    const heading = (await page.locator('.reader-header h1').boundingBox())!
    const actions = (await page.locator('.reader-actions').boundingBox())!
    expect(heading.y).toBeLessThan(width < 768 ? 110 : 240)
    expect(actions.y).toBeGreaterThan(heading.y + heading.height)
    await expect(page.locator('.reader-meta')).toContainText('2026-10-27')
    if (width >= 768)
      await expect(page.getByRole('navigation', { name: '文章延伸路徑' })).toBeVisible()
    await page.screenshot({ path: `output/layout-fixed-article-${width}.png` })
    const outline = page.getByRole('combobox', { name: '跳至文章章節' })
    await expect(outline).toBeVisible()
    const id = await outline.locator('option').nth(1).getAttribute('value')
    // 短文在平板可能先抵達頁底；章節應停在導覽列下方或瀏覽器可捲動的盡頭。
    const expectedTop = await page.locator(`[id="${id}"]`).evaluate((el) => {
      const offset =
        innerWidth < 768
          ? 12
          : (parseFloat(
              getComputedStyle(document.documentElement).getPropertyValue('--site-nav-height')
            ) || 64) + 12
      const absoluteTop = el.getBoundingClientRect().top + scrollY
      return Math.max(
        offset,
        absoluteTop - Math.max(0, document.documentElement.scrollHeight - innerHeight)
      )
    })
    await outline.selectOption(id!)
    await expect
      .poll(() => page.locator(`[id="${id}"]`).evaluate((el) => el.getBoundingClientRect().top))
      .toBeLessThan(expectedTop + 3)
    expect(
      await page.locator(`[id="${id}"]`).evaluate((el) => el.getBoundingClientRect().top)
    ).toBeGreaterThanOrEqual(expectedTop - 3)
    await page.getByRole('button', { name: '返回列表', exact: true }).first().click()
    await expect(page).toHaveURL(/\/articles$/)
  })
}

for (const width of [390, 1440]) {
  test(`${width}px 深色頁尾跟隨主題`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/profile')
    await ready(page)
    if (width < 768) {
      await page.locator('.bottom-nav').getByRole('button', { name: /更多/ }).click()
      await page.getByRole('button', { name: '切換深色', exact: true }).click()
      await page.getByRole('dialog').getByRole('button', { name: '關閉', exact: true }).click()
    } else await page.locator('.theme-toggle').click()
    await expect
      .poll(() =>
        page.evaluate(() => getComputedStyle(document.querySelector('footer')!).backgroundColor)
      )
      .toBe('rgb(17, 17, 15)')
    expect(
      await page
        .locator('.footer-group h2')
        .first()
        .evaluate((el) => getComputedStyle(el).color)
    ).not.toBe('rgb(23, 23, 20)')
    await page.locator('footer').scrollIntoViewIfNeeded()
    await page.screenshot({ path: `output/layout-fixed-footer-${width}.png` })
  })
}
for (const width of [320, 390]) {
  test(`${width}px 篩選勾選框與文字同組且仍可提交`, async ({ page }) => {
    await page.setViewportSize({ width, height: 650 })
    await fixtures(page)
    await page.goto('/shop')
    await ready(page)
    await expect(page.locator('.flip-card')).toHaveCount(3)
    await page.getByRole('button', { name: '篩選', exact: true }).click()
    const control = page.getByRole('dialog').getByLabel('孵化溫度／未確認', { exact: true })
    const data = await control.evaluate((input) => {
      const label = input.closest('label')!,
        text = label.querySelector('span')!.getBoundingClientRect(),
        checkbox = input.getBoundingClientRect()
      return { center: checkbox.y + checkbox.height / 2, textTop: text.y, textBottom: text.bottom }
    })
    expect(data.center).toBeGreaterThanOrEqual(data.textTop)
    expect(data.center).toBeLessThanOrEqual(data.textBottom)
    await control.uncheck()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /顯示.*隻/ })
      .click()
    await expect(page).toHaveURL(/sexU=false/)
  })
  test(`${width}px 醫院名稱與行政區分列，收藏及展開保留`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/hospital')
    await ready(page)
    const card = page.locator('.hosp-card').first()
    await expect(card).toBeVisible()
    const name = (await card.locator('.hosp-name').boundingBox())!,
      tag = (await card.locator('.hosp-header-right').boundingBox())!
    expect(tag.y).toBeGreaterThanOrEqual(name.y + name.height - 1)
    expect(name.height).toBeLessThanOrEqual(53)
    const favorite = card.locator('.hosp-fav-btn')
    expect((await favorite.boundingBox())!.width).toBeGreaterThanOrEqual(44)
    await favorite.click()
    await expect(favorite).toHaveAttribute('aria-pressed', 'true')
    await card.locator('.hosp-header-toggle').click()
    await expect(card.locator('.hosp-details')).toBeVisible()
    await page.screenshot({ path: `output/layout-fixed-hospital-${width}.png` })
  })
}
test('桌機醫院單一搜尋、地圖提早顯示與篩選連動', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/hospital')
  await ready(page)
  const search = page.getByRole('searchbox', { name: '搜尋醫院名稱或地址', exact: true })
  await expect(page.locator('main input[type="search"]')).toHaveCount(1)
  await page.locator('.map-stage').waitFor()
  expect((await page.locator('.map-stage').boundingBox())!.y).toBeLessThan(600)
  await page.screenshot({ path: 'output/layout-fixed-hospital-1440.png' })
  await search.fill('不存在院所測試')
  await expect(page.locator('.hosp-map-empty-state')).toBeVisible()
  await page
    .locator('.hosp-map-empty-state')
    .getByRole('button', { name: '清除篩選', exact: true })
    .click()
  await expect(search).toBeFocused()
  await expect(search).toHaveValue('')
})
for (const width of [320, 1440]) {
  test(`${width}px 比較空狀態只留單一入口，有個體時恢復工具列`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await fixtures(page)
    await page.goto('/compare')
    await ready(page)
    await expect(page.locator('.empty-compare')).toBeVisible()
    await expect(page.locator('.compare-header__actions')).toHaveCount(0)
    await expect(page.locator('main.compare-page a[href="/shop"]')).toHaveCount(1)
    await page.goto('/compare?ids=LAYOUT-1,LAYOUT-2')
    await ready(page)
    await expect(page.locator('.item-heading')).toHaveCount(2)
    await expect(page.locator('.compare-count')).toContainText('2 / 3')
    await expect(page.locator('.clear-all-btn')).toBeVisible()
  })
}
