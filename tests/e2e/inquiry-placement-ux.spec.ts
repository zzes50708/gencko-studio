import { test, expect } from '@playwright/test'

for (const width of [320, 390, 1440]) {
  test(`${width}px 收藏詢問不遮住個體操作與文章章節`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const animal = {
      id: 'INQUIRY-UX',
      species: '豹紋守宮',
      morph: '入口位置測試',
      status: 'ForSale',
      listing_price: 3000,
      image_url: '/images/home-gecko.webp',
      genes: []
    }
    const article = {
      id: 'INQUIRY-ARTICLE',
      status: 'Published',
      title: '收藏與章節位置測試',
      content: ['第一章', '第二章', '第三章']
        .map(
          (title) =>
            `<h2>${title}</h2>${'<p>保留足夠閱讀高度，檢查章節按鈕可以直接操作。</p>'.repeat(16)}`
        )
        .join('')
    }
    await page.route('**/rest/v1/*animals**', (route) =>
      route.fulfill({
        json: new URL(route.request().url()).searchParams.has('id') ? animal : [animal]
      })
    )
    await page.route('**/rest/v1/*articles**', (route) =>
      route.fulfill({
        json: new URL(route.request().url()).searchParams.has('id') ? article : [article]
      })
    )
    await page.route('**/rest/v1/*genetic_pages**', (route) => route.fulfill({ json: [] }))
    await page.goto('/certificates')
    await page.waitForFunction(() => {
      const app = (document.querySelector('#__nuxt') as any)?.__vue_app__?.config.globalProperties
      return app?.$pinia?._s.get('main') && !app.$nuxt.isHydrating
    })
    await page.evaluate(async () => {
      const app = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
      app.$pinia._s.get('main').wishlist = ['INQUIRY-UX']
      await app.$router.push('/product/INQUIRY-UX')
    })
    const inquiry = page.locator('.floating-inquire-btn')
    await expect(page.locator('.prod-title')).toHaveText(animal.morph)
    await expect(inquiry).toHaveCSS('position', 'static')
    await expect(inquiry).toHaveAttribute('target', '_blank')
    await expect(inquiry).toHaveAttribute('href', /INQUIRY-UX/)
    await page.locator('.btn-compare').scrollIntoViewIfNeeded()
    await page.locator('.btn-compare').click()
    await expect(page.locator('.btn-compare')).toHaveAttribute('aria-pressed', 'true')
    await page.evaluate(() =>
      (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$router.push(
        '/articles/INQUIRY-ARTICLE'
      )
    )
    const chapters = page.getByRole('navigation', { name: '文章章節' })
    await expect(chapters).toBeVisible()
    await expect(inquiry).toHaveCSS('position', 'static')
    const second = chapters.getByRole('button', { name: '第二章', exact: true })
    await second.click()
    await expect(second).toHaveAttribute('aria-current', 'location')
    await expect(page.locator('.reader-content h2').nth(1)).toBeFocused()
    await inquiry.scrollIntoViewIfNeeded()
    const box = (await inquiry.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(width)
    expect(box.height).toBeGreaterThanOrEqual(44)
    // 頁尾收藏入口即使捲入畫面，固定章節列仍可直接接收點擊。
    await expect
      .poll(() =>
        second.evaluate((el) => {
          const r = el.getBoundingClientRect()
          return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
        })
      )
      .toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
