import { test, expect } from '@playwright/test'
async function ready(page: any) {
  await page.goto('/home')
  await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as any)?.__vue_app__)
}
test('手機精選維持跑馬燈且入口是連結', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 850 },
    hasTouch: true,
    isMobile: true
  })
  const page = await context.newPage()
  await ready(page)
  await page.evaluate(() => {
    const s = (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('main')
    s.dataError = null
    s.loading = false
    s.hotList = Array.from({ length: 8 }, (_, i) => ({
      ID: `UX-${i}`,
      Morph: `測試品系${i}`,
      ImageURL: ''
    }))
  })
  await expect(page.locator('.app-marquee')).toHaveCount(2)
  expect(
    await page
      .locator('.app-marquee__track')
      .first()
      .evaluate((e) => getComputedStyle(e).animationName)
  ).not.toBe('none')
  await expect(page.locator('.app-marquee__group[aria-hidden="true"]').first()).toHaveAttribute(
    'inert',
    ''
  )
  for (const width of [320, 390, 740]) {
    await page.setViewportSize({ width, height: 850 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.getByRole('link', { name: /01 新手必看/ }).tap()
  await expect(page).toHaveURL(/\/start-here$/)
  await context.close()
})
test('首頁資料失敗可重試、文章缺圖有提示', async ({ page }) => {
  await page.route('**/rest/v1/articles**', (r) => r.fulfill({ json: [] }))
  await page.goto('/home')
  await page.waitForFunction(
    () =>
      !!(
        document.querySelector('#__nuxt') as any
      )?.__vue_app__?.config.globalProperties.$pinia._s.get('main')?.articlesLoaded
  )
  await page.evaluate(() => {
    const s = (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('main')
    s.loading = false
    s.hotList = []
    s.dataError = '失敗'
    s.articlesLoading = false
    s.articlesError = '文章暫時無法載入'
    s.ensureInventoryLoaded = async () => {
      s.dataError = null
      s.hotList = [{ ID: 'UX', Morph: '測試', ImageURL: '' }]
    }
    s.loadArticles = async () => {
      s.articlesError = null
      s.articlesList = [
        {
          ID: 'UX-ART',
          Title: '測試文章',
          ImageURL: '',
          PublishDate: '2026-01-01',
          Summary: '測試'
        }
      ]
    }
  })
  await page.getByRole('button', { name: '重新載入', exact: true }).click()
  await expect(page.getByText('熱門個體暫時無法載入。')).toHaveCount(0)
  await page.getByRole('button', { name: '重新載入文章', exact: true }).click()
  await expect(page.locator('.article-card')).toHaveCount(1)
  await expect(page.locator('.article-card .article-image-fallback')).toHaveText('文章圖片未提供')
  await expect(page.locator('.app-marquee__group[aria-hidden="true"]').first()).toHaveAttribute(
    'inert',
    ''
  )
})
