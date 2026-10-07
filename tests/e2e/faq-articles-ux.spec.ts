import { test, expect } from '@playwright/test'
if (process.env.UX_BASE_URL) test.use({ baseURL: process.env.UX_BASE_URL })
for (const width of [320, 390, 768, 1440]) {
  test(`FAQ與文章 ${width}px 排版及章節操作`, async ({ browser, baseURL }) => {
    const c = await browser.newContext({
        baseURL,
        viewport: { width, height: 844 },
        hasTouch: width < 1000,
        isMobile: width < 768,
        reducedMotion: 'reduce'
      }),
      p = await c.newPage()
    for (const route of ['/faq', '/articles', '/articles/ART-011']) {
      await p.goto(route)
      await p.waitForTimeout(500)
      expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await expect(p.locator('h1')).toBeVisible()
      if (route === '/faq')
        expect(
          await p
            .locator('.faq-route-map a')
            .first()
            .evaluate((e) => parseFloat(getComputedStyle(e).fontSize))
        ).toBeGreaterThanOrEqual(13)
      if (route === '/articles' && width < 768)
        await expect(p.getByRole('combobox', { name: '文章分類' })).toBeVisible()
      if (route.includes('ART-011')) {
        expect((await p.locator('h1').boundingBox())!.y).toBeLessThan(400)
        const select = p.getByRole('combobox', { name: '跳至文章章節' })
        await expect(select).toBeVisible()
        const value = await select.locator('option').nth(1).getAttribute('value')
        await select.selectOption(value!)
        await expect
          .poll(() =>
            p.locator(`[id="${value}"]`).evaluate((e) => Math.round(e.getBoundingClientRect().top))
          )
          .toBeLessThan(width < 768 ? 30 : 110)
      }
    }
    await c.close()
  })
}

test('手機搜尋與分類交集、清除及文章返回保留位置', async ({ browser, baseURL }) => {
  const c = await browser.newContext({
      baseURL,
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true
    }),
    p = await c.newPage()
  await p.goto('/articles')
  await p.waitForTimeout(500)
  const q = p.getByRole('searchbox', { name: '搜尋文章' }),
    cat = p.getByRole('combobox', { name: '文章分類' })
  await q.fill('加熱')
  await cat.selectOption('環境佈置')
  await expect(q).toHaveValue('加熱')
  await expect(p.locator('.article-entry')).toHaveCount(1)
  await q.fill('ux-no-match-123')
  await expect(p.getByText('目前沒有符合條件的文章')).toBeVisible()
  await p.getByRole('button', { name: '清除篩選', exact: true }).click()
  await cat.selectOption('健康照護')
  await p.locator('.article-entry').last().scrollIntoViewIfNeeded()
  const before = await p.evaluate(() => scrollY)
  await p.locator('.article-entry').last().click()
  await expect(p.locator('.reader-header')).toBeVisible()
  await p.getByRole('button', { name: '返回列表', exact: true }).first().click()
  await expect(cat).toHaveValue('健康照護')
  await expect.poll(() => p.evaluate(() => scrollY)).toBeGreaterThan(before - 40)
  const restored = await p.evaluate(() => scrollY)
  expect(restored).toBeLessThan(before + 40)
  await p.locator('.article-entry').first().click()
  await expect(p.locator('.reader-header')).toBeVisible()
  await p.goBack()
  await expect(cat).toHaveValue('健康照護')
  await c.close()
})

test('FAQ跨分類搜尋、清除、網址重載與返回保留答案', async ({ page }) => {
  await page.goto('/faq')
  await page.waitForTimeout(500)
  await page.getByRole('searchbox', { name: '搜尋所有常見問題' }).fill('訂金')
  await expect(page.locator('.faq-result-count')).toContainText('找到')
  await expect(page.locator('#faq-question-purchase-6')).toBeVisible()
  await page.locator('#faq-question-purchase-6').click()
  await expect(page.locator('#faq-answer-purchase-6')).toBeVisible()
  await expect(page).toHaveURL(/question=purchase-6/)
  await page.reload()
  await expect(page.locator('#faq-answer-purchase-6')).toBeVisible()
  await page.locator('.faq-route-map a[href="/buying-guide"]').click()
  await expect(page.getByRole('heading', { name: '買守宮，流程長這樣', exact: true })).toBeVisible()
  await page.goBack()
  await expect(page.locator('#faq-answer-purchase-6')).toBeVisible()
  await page.getByRole('searchbox', { name: '搜尋所有常見問題' }).fill('ux-no-match-123')
  await expect(page.getByText('沒有符合的問題，請試試其他關鍵字。')).toBeVisible()
  await page.locator('.faq-search').getByRole('button', { name: '清除搜尋' }).click()
  await expect(page.getByRole('tablist')).toBeVisible()
})

test('文章暫時載入失敗可重試，沒有當成下架', async ({ page }) => {
  await page.goto('/articles')
  await page.waitForTimeout(500)
  let fail = true
  await page.route('**/rest/v1/articles?**', (r) =>
    new URL(r.request().url()).searchParams.has('id') && fail
      ? r.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'temporary unavailable' })
        })
      : r.continue()
  )
  await page.locator('.article-entry[href="/articles/ART-011"]').click()
  await expect(page.getByText('文章暫時無法載入', { exact: true })).toBeVisible({ timeout: 20000 })
  await expect(page.getByText('找不到此文章或文章已下架')).toHaveCount(0)
  fail = false
  await page.getByRole('button', { name: '重新載入文章' }).click()
  await expect(page.locator('.reader-header h1')).toHaveText('沒交配也會生蛋？')
})

test('封面失敗有替代且文章仍可閱讀', async ({ page }) => {
  await page.route('https://wsrv.nl/**', (r) => r.fulfill({ status: 404, body: '' }))
  await page.goto('/articles')
  await expect(page.locator('.article-entry .article-image-fallback').first()).toBeVisible()
  await page.locator('.article-entry[href="/articles/ART-011"]').click()
  await expect(page.locator('.article-hero-image .article-image-fallback')).toBeVisible()
  await expect(page.locator('.reader-content')).toBeVisible()
  await expect(page.locator('.related-art-img-wrap .article-image-fallback').first()).toBeAttached()
})

test('FAQ只指定問題即可直達，連續輸入不丟焦點或增加歷史', async ({ page }) => {
  await page.goto('/faq?question=purchase-6')
  await expect(page.locator('#faq-answer-purchase-6')).toBeVisible()
  await page.waitForTimeout(500)
  const before = await page.evaluate(() => history.length)
  const q = page.getByRole('searchbox', { name: '搜尋所有常見問題' })
  await q.pressSequentially('訂金', { delay: 60 })
  await expect(q).toHaveValue('訂金')
  await expect(q).toBeFocused()
  await expect(page).toHaveURL(/q=/)
  expect(await page.evaluate(() => history.length)).toBe(before)
})

test('短文章不顯示多餘章節操作，真正不存在的文章仍可返回', async ({ page }) => {
  await page.goto('/articles')
  await page.waitForTimeout(500)
  await page.route('**/rest/v1/articles?**', (r) => {
    if (!new URL(r.request().url()).searchParams.has('id')) return r.continue()
    return r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'ART-011',
        title: '短篇閱讀驗證',
        status: 'published',
        category: '健康照護',
        content: '<h2>單一章節</h2><p>測試用內容</p>',
        keywords: ''
      })
    })
  })
  await page.locator('.article-entry[href="/articles/ART-011"]').click()
  await expect(page.locator('.reader-header h1')).toHaveText('短篇閱讀驗證')
  await expect(page.locator('.reader-outline')).toHaveCount(0)
  await page.unrouteAll()
  await page.goto('/articles/ART-UX-NOT-FOUND')
  await expect(page.getByText('找不到此文章或文章已下架')).toBeVisible()
  await expect(page.getByRole('button', { name: '返回列表', exact: true })).toBeVisible()
})
