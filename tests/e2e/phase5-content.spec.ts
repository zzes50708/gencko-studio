import { expect, test } from '@playwright/test'

test.describe('Phase 5 內容與購買信任路徑', () => {
  test('文章索引以雜誌式首屏承接搜尋與新手導流', async ({ page }) => {
    await page.goto('/articles')

    const masthead = page.getByTestId('articles-editorial-stage')
    await expect(masthead).toBeVisible()
    await expect(masthead.getByRole('heading', { level: 1 })).toContainText('守宮文章知識庫')
    await expect(page.getByRole('searchbox', { name: '搜尋文章' })).toBeVisible()
    await expect(page.getByRole('link', { name: /新手閱讀路徑/ })).toHaveAttribute(
      'href',
      '/start-here'
    )

    const beginnerFilter = page.getByRole('button', { name: '新手必看' })
    await expect
      .poll(() =>
        beginnerFilter.evaluate((el) =>
          Object.getOwnPropertySymbols(el).some((key) => key.description === '_vei')
        )
      )
      .toBe(true)
    await beginnerFilter.click()
    await expect(beginnerFilter).toHaveAttribute('aria-pressed', 'true')
  })

  test('文章內頁提供清楚閱讀層級、作者與延伸路徑', async ({ page }) => {
    await page.goto('/articles')
    await page.locator('.article-entry').first().click()

    const reader = page.getByTestId('article-reader-shell')
    await expect(reader).toBeVisible()
    await expect(reader.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(reader.locator('.reader-content')).toBeVisible()
    await expect(reader.locator('.author-card')).toBeVisible()
    await expect(page.getByRole('navigation', { name: '文章延伸路徑' })).toContainText('飼養指南')
  })

  test('新手 Hub 串接認識、照護、評估、健康與 FAQ', async ({ page }) => {
    await page.goto('/start-here')

    const hub = page.getByTestId('newcomer-roadmap')
    await expect(hub).toBeVisible()
    for (const href of ['/guide', '/care', '/qs', '/health', '/faq']) {
      await expect(hub.locator(`a[href="${href}"]`)).toBeVisible()
    }

    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.locator('html')).toHaveJSProperty(
      'scrollWidth',
      await page.locator('html').evaluate((element) => element.clientWidth)
    )
  })

  test('FAQ 分類可操作且答案收合狀態對輔助科技一致', async ({ page }) => {
    await page.goto('/faq')

    await expect(page.getByTestId('faq-route-map')).toBeVisible()
    const tabs = page.getByRole('tablist', { name: '常見問題分類' })
    await expect(tabs).toBeVisible()

    const firstQuestion = page.locator('.faq-q').first()
    await expect
      .poll(() =>
        firstQuestion.evaluate((el) =>
          Object.getOwnPropertySymbols(el).some((key) => key.description === '_vei')
        )
      )
      .toBe(true)
    const answerId = await firstQuestion.getAttribute('aria-controls')
    await expect(firstQuestion).toHaveAttribute('aria-expanded', 'false')
    await firstQuestion.click()
    await expect(firstQuestion).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator(`#${answerId}`)).toBeVisible()
  })

  test('購買流程與品牌信任形成可返回的決策鏈', async ({ page }) => {
    await page.goto('/buying-guide')
    const flow = page.getByTestId('purchase-decision-path')
    await expect(flow).toBeVisible()
    await expect(flow.locator('a[href="/why-gencko"]')).toBeVisible()
    await expect(flow.locator('a[href="/faq"]')).toBeVisible()
    await expect(flow.locator('a[href="/shop"]')).toBeVisible()

    await page.goto('/why-gencko')
    const trust = page.getByTestId('trust-evidence-map')
    await expect(trust).toBeVisible()
    await expect(trust.locator('a[href="/buying-guide"]').first()).toBeVisible()
    await expect(trust.locator('a[href="/care"]').first()).toBeVisible()
    await expect(trust.locator('a[href="/hospital"]').first()).toBeVisible()
  })

  test('照護、介紹、案例與會員頁保有明確下一步', async ({ page }) => {
    await page.goto('/care')
    const careMap = page.getByTestId('care-decision-map')
    await expect(careMap.locator('a[href="/health"]')).toBeVisible()
    await expect(careMap.locator('a[href="/hospital"]')).toBeVisible()
    await expect(careMap.locator('a[href="/articles"]')).toBeVisible()

    await page.goto('/guide')
    await expect(page.getByTestId('guide-orientation-map')).toBeVisible()

    await page.goto('/stories')
    await expect(page.getByTestId('stories-holding-page')).toContainText('內容整理中')

    await page.goto('/profile')
    const dashboard = page.getByTestId('member-dashboard')
    await expect(dashboard).toBeVisible()
    await expect(dashboard.getByRole('tablist', { name: '會員資料分類' })).toBeVisible()
  })
})
