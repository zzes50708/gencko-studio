import { test, expect } from '@playwright/test'

const animals = [
  {
    id: 'DETAIL-1',
    morph: '細節測試',
    species: '豹紋守宮',
    status: 'ForSale',
    genes: ['日蝕'],
    birthday: '2025-01-01',
    listing_price: 3000,
    image_url: '/images/guide/leopard-gecko.webp'
  },
  {
    id: 'DETAIL-2',
    morph: '比較測試',
    species: '豹紋守宮',
    status: 'ForSale',
    genes: ['日蝕'],
    birthday: '2025-01-01',
    listing_price: 4000,
    image_url: '/images/guide/fat-tailed-gecko.webp'
  },
  {
    id: 'BREED-LENS',
    morph: '種群細節',
    species: '豹紋守宮',
    status: 'SelfKeep',
    genes: [],
    image_url: '/images/guide/leopard-gecko.webp'
  }
]
async function ready(page) {
  await page.waitForFunction(() => {
    const app = (document.querySelector('#__nuxt') as any)?.__vue_app__
    return app && !app.config.globalProperties.$nuxt.isHydrating
  })
}
async function seed(page) {
  await page.route('**/rest/v1/*animals**', (route) => {
    const id = new URL(route.request().url()).searchParams.get('id')?.replace(/^eq\./, '')
    return route.fulfill({ json: id ? animals.filter((animal) => animal.id === id) : animals })
  })
}
async function clientRoute(page, path) {
  await page.goto('/home')
  await ready(page)
  await page.evaluate(
    (path) =>
      (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$router.push(
        path
      ),
    path
  )
  await expect(page).toHaveURL(new RegExp(path.replace('?', '\\?') + '$'))
}

test('種群只有 hover 放大，圓圈加大且點擊不開預覽', async ({ page }) => {
  await seed(page)
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.goto('/breeders')
  await ready(page)
  const card = page.locator('.breeder-photo-card').first()
  const lens = card.locator('.photo-lens')
  await lens.hover()
  await expect(lens.locator('.photo-lens__overlay')).toBeVisible()
  await expect
    .poll(() =>
      lens.locator('.photo-lens__overlay').evaluate((el) => getComputedStyle(el).maskImage)
    )
    .toContain('150px')
  await expect(card.locator('button')).toHaveCount(0)
  await expect(card.locator('.photo-zoom-cue')).toHaveCount(0)
  await expect
    .poll(() => lens.locator('.photo-lens__overlay').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1')
  await card.screenshot({
    path: 'output/interaction-review/lens-corrected.png',
    animations: 'disabled'
  })
  await lens.click()
  await expect(page.getByRole('dialog', { name: '圖片預覽' })).toHaveCount(0)
  await page.mouse.move(0, 0)
  await expect(lens.locator('.photo-lens__overlay')).toHaveCount(0)
})

test('個體主圖只有 hover 放大，點擊不開預覽也沒有放大按鈕', async ({ page }) => {
  await seed(page)
  await page.setViewportSize({ width: 1440, height: 950 })
  await clientRoute(page, '/product/DETAIL-1')
  const lens = page.locator('.prod-img-link .photo-lens')
  await lens.hover()
  await expect(lens.locator('.photo-lens__overlay')).toBeVisible()
  await expect(page.locator('.prod-img-box button, .prod-img-box .photo-zoom-cue')).toHaveCount(0)
  await lens.click()
  await expect(page.getByRole('dialog', { name: '圖片預覽' })).toHaveCount(0)
  await expect(page.locator('.prod-title')).toHaveText('細節測試')
})

for (const width of [390, 1024]) {
  test('觸控 ' + width + 'px 不綁定滑鼠追蹤、不增加點擊放大', async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      viewport: { width, height: 900 },
      hasTouch: true,
      isMobile: width < 768,
      serviceWorkers: 'block'
    })
    const page = await context.newPage()
    await seed(page)
    await page.goto('/breeders')
    await ready(page)
    const lens = page.locator('.breeder-photo-card .photo-lens').first()
    await expect(lens).toHaveAttribute('data-lens-enabled', 'false')
    await lens.tap()
    await expect(page.getByRole('dialog', { name: '圖片預覽' })).toHaveCount(0)
    await expect(lens.locator('.photo-lens__overlay')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await context.close()
  })
}

test('比較頁：只看差異可隱藏相同欄位，移除個體後恢復完整資料', async ({ page }) => {
  await seed(page)
  await page.goto('/compare?ids=DETAIL-1,DETAIL-2')
  await ready(page)
  const toggle = page.getByRole('button', { name: '只看差異', exact: true })
  await expect(page.getByRole('row', { name: '物種 豹紋守宮 豹紋守宮', exact: true })).toBeVisible()
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('row', { name: '物種 豹紋守宮 豹紋守宮', exact: true })).toBeHidden()
  await expect(page.getByRole('row', { name: /售價 NT\$ 3000 NT\$ 4000/ })).toBeVisible()
  await page.getByRole('button', { name: '移除 比較測試 比較項目' }).click()
  await expect(page.getByRole('row', { name: '物種 豹紋守宮', exact: true })).toBeVisible()
  await expect(toggle).toBeDisabled()
})

test('圖鑑：遺傳類型篩選和搜尋可交叉使用，清除後恢復結果', async ({ page }) => {
  await page.goto('/genes')
  await ready(page)
  const types = page.getByRole('group', { name: '遺傳類型' })
  const recessive = types.getByRole('button', { name: /隱性/ })
  await recessive.click()
  await expect(recessive).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.gene-section')).toHaveCount(1)
  const search = page.getByRole('searchbox', { name: '搜尋基因詞條' })
  await search.fill('找不到的測試詞')
  await expect(page.getByText('找不到符合的基因詞條')).toBeVisible()
  await page.getByRole('button', { name: '重設圖鑑篩選' }).click()
  await expect(search).toHaveValue('')
  await expect(page.locator('.gene-section')).not.toHaveCount(1)
})

test('長頁：飼養與客製頁章節列可定位並反映閱讀位置', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const [route, label, chapter, id] of [
    ['/care', '飼養章節導覽', '繁殖預備', 'breeding'],
    ['/merch', '客製設備章節導覽', '訂製需求', 'cabinet-inquiry']
  ]) {
    await page.goto(route)
    await ready(page)
    const nav = page.getByRole('navigation', { name: label })
    const link = nav.getByRole('link', { name: new RegExp(chapter) })
    await link.click()
    await expect(page.locator(`#${id}`)).toBeFocused()
    await expect(link).toHaveAttribute('aria-current', 'location')
  }
})

test('會員分類可用方向鍵切換，指示線跟隨目前分類', async ({ page }) => {
  await page.goto('/profile')
  await ready(page)
  const group = page.getByRole('group', { name: '會員資料分類' })
  const first = group.getByRole('button').first()
  await first.focus()
  await first.press('ArrowRight')
  const history = group.getByRole('button', { name: /^瀏覽/ })
  await expect(history).toHaveAttribute('aria-pressed', 'true')
  await expect(history).toBeFocused()
  await expect
    .poll(() =>
      group.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el, '::after').transform).m41)
    )
    .toBeGreaterThan(0)
  await history.press('Home')
  await expect(first).toHaveAttribute('aria-pressed', 'true')
})

test('購買步驟列能直接跳至對應內容，原有聯絡連結仍保留', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/buying-guide')
  await ready(page)
  const steps = page.getByRole('navigation', { name: '購買流程步驟' })
  await steps.getByRole('link', { name: '到家', exact: true }).click()
  await expect(steps.getByRole('link', { name: '到家', exact: true })).toHaveAttribute(
    'href',
    '#purchase-step-04'
  )
  const target = page.locator('#purchase-step-04')
  await expect(target).toContainText('到家')
  await expect.poll(() => target.evaluate((el) => el.getBoundingClientRect().top)).toBeLessThan(300)
})

test('證書保持靜態照片，列印保留照片', async ({ page }) => {
  await seed(page)
  await clientRoute(page, '/identity/DETAIL-1')
  await expect(page.locator('.card-photo-box .photo-lens, .card-photo-box button')).toHaveCount(0)
  await expect(page.locator('.card-photo-box img')).toBeVisible()
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('.card-photo-box img')).toBeVisible()
})

test('文章封面保持靜態圖片，正文與章節導覽保留', async ({ page }) => {
  const article = {
    id: 'COVER-DETAIL',
    title: '觀察照片細節',
    category: '環境佈置',
    status: 'Published',
    content: '<h2>第一章</h2><p>原有內容。</p><h2>第二章</h2><p>原有內容。</p>',
    image_url: '/images/guide/leopard-gecko.webp'
  }
  await page.route('**/rest/v1/*articles**', (route) =>
    route.fulfill({ json: route.request().url().includes('id=eq.') ? article : [article] })
  )
  await clientRoute(page, '/articles/COVER-DETAIL')
  await expect(
    page.locator('.article-hero-image .photo-lens, .article-hero-image button')
  ).toHaveCount(0)
  await expect(page.locator('.reader-content')).toContainText('第一章')
})

test('飼養章節列跟隨主導覽收起與出現', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.goto('/care')
  await ready(page)
  const trail = page.getByRole('navigation', { name: '飼養章節導覽' })
  await page.mouse.move(1300, 500)
  await page.mouse.wheel(0, 1000)
  await expect(page.locator('.sticky-nav')).toHaveClass(/nav-hidden/)
  await expect
    .poll(() => trail.evaluate((el) => el.getBoundingClientRect().bottom))
    .toBeLessThanOrEqual(0)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(950)
  expect(await page.evaluate(() => getComputedStyle(document.body).transform)).toBe('none')
  await page.screenshot({ path: 'output/interaction-review/care-nav-hidden.png' })
  await page.mouse.wheel(0, -350)
  await expect(page.locator('.sticky-nav')).not.toHaveClass(/nav-hidden/)
  await expect
    .poll(() => trail.evaluate((el) => el.getBoundingClientRect().top))
    .toBeGreaterThanOrEqual(0)
  await page.screenshot({ path: 'output/interaction-review/care-nav-visible.png' })
})
