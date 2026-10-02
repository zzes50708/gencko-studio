import { expect, test } from '@playwright/test'

test.describe('Phase 5 內容與購買信任路徑', () => {
  test('文章索引以雜誌式首屏承接搜尋與新手導流', async ({ page }) => {
    await page.goto('/articles')

    const masthead = page.getByTestId('articles-editorial-stage')
    await expect(masthead).toBeVisible()
    await expect(masthead.getByRole('heading', { level: 1 })).toContainText('守宮文章知識庫')
    await expect(page.getByRole('searchbox', { name: '搜尋文章' })).toBeVisible()
    await expect(page.getByRole('link', { name: /新手入門頁面/ })).toHaveAttribute(
      'href',
      '/start-here'
    )

    await expect(page.getByRole('button', { name: '繁殖相關' })).toBeVisible()

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

    await page.getByRole('button', { name: '全部文章' }).click()
    await page.setViewportSize({ width: 390, height: 844 })
    const gridColumns = await page
      .locator('.article-group-grid')
      .first()
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)
    expect(gridColumns).toBe(2)
    await expect(page.locator('html')).toHaveJSProperty(
      'scrollWidth',
      await page.locator('html').evaluate((element) => element.clientWidth)
    )
  })

  test('文章內頁提供清楚閱讀層級、作者與延伸路徑', async ({ page }) => {
    await page.goto('/articles/ART-003')

    const reader = page.getByTestId('article-reader-shell')
    await expect(reader).toBeVisible()
    await expect(reader.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(reader.locator('.reader-content')).toBeVisible()
    await expect(reader.locator('.author-card')).toBeVisible()
    const relatedNavigation = page.getByRole('navigation', { name: '文章延伸路徑' })
    await expect(relatedNavigation).toContainText('飼養指南')
    await expect(relatedNavigation.getByRole('link', { name: '基因圖鑑' })).toHaveAttribute(
      'href',
      '/genes'
    )

    const articleImages = reader.locator('.article-hero-image img, .reader-content img')
    await expect(articleImages.first()).toBeVisible()
    expect(
      await articleImages.evaluateAll((images) =>
        images.every((image) => {
          const imageRect = image.getBoundingClientRect()
          const parentRect = image.parentElement?.getBoundingClientRect()
          return Boolean(
            parentRect &&
            imageRect.width > 0 &&
            imageRect.left >= parentRect.left - 1 &&
            imageRect.right <= parentRect.right + 1
          )
        })
      )
    ).toBe(true)

    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.locator('html')).toHaveJSProperty(
      'scrollWidth',
      await page.locator('html').evaluate((element) => element.clientWidth)
    )
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
    await expect(tabs.getByRole('tab')).toHaveText([/購買與售後/, /官網使用說明/, /守宮知識/])
    await expect(page.locator('[role="tabpanel"]')).toHaveCount(3)
    await expect(page.locator('.faq-q')).toHaveCount(31)

    const geckoTab = tabs.getByRole('tab', { name: /守宮知識/ })
    await expect(geckoTab).toHaveAttribute('aria-selected', 'true')
    await geckoTab.focus()
    await geckoTab.press('ArrowRight')
    await expect(tabs.getByRole('tab', { name: /購買與售後/ })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    await geckoTab.click()

    const firstQuestion = page
      .getByRole('tabpanel', { name: /守宮知識/ })
      .locator('.faq-q')
      .first()
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
    const answer = page.locator(`#${answerId}`)
    await expect(answer).toBeVisible()
    await expect(answer).toHaveAttribute('role', 'region')

    await page.setViewportSize({ width: 390, height: 844 })
    const routeLinks = page.getByRole('navigation', { name: 'FAQ 延伸入口' }).getByRole('link')
    await expect(routeLinks).toHaveCount(4)
    const routeLinkTops = await routeLinks.evaluateAll((links) =>
      links.map((link) => Math.round(link.getBoundingClientRect().top))
    )
    expect(new Set(routeLinkTops).size).toBe(1)
    await expect(page.locator('.app-back-btn')).toHaveCount(0)
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      .toBe(true)
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

  test('照護頁手機導覽維持單列且餵食表格不產生橫向捲動', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 })
    await page.goto('/care')

    const decisionLinks = page.getByTestId('care-decision-map').getByRole('link')
    await expect(decisionLinks).toHaveCount(4)
    const decisionY = await decisionLinks.evaluateAll((links) =>
      links.map((link) => Math.round(link.getBoundingClientRect().top))
    )
    expect(new Set(decisionY).size).toBe(1)

    const indexButtons = page.locator('.care-reading-index-links button')
    await expect(indexButtons).toHaveCount(4)
    const indexY = await indexButtons.evaluateAll((buttons) =>
      buttons.map((button) => Math.round(button.getBoundingClientRect().top))
    )
    expect(new Set(indexY).size).toBe(1)

    await expect(page.getByText('濕度配置', { exact: true })).toHaveCount(0)
    await expect(page.locator('.care-faq-list')).toHaveCount(0)
    await expect
      .poll(() =>
        page
          .locator('.care-table--feed, .care-table--supp')
          .evaluateAll((tables) =>
            tables.every((table) => table.scrollWidth <= table.clientWidth + 1)
          )
      )
      .toBe(true)
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      .toBe(true)

    await indexButtons.last().click()
    await expect(page).toHaveURL(/\/faq$/)
  })
})
