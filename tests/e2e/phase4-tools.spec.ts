import { test, expect } from '@playwright/test'

test.describe('Phase 4 專業工具資訊架構', () => {
  test('Calculator 以雙親工作台與結果區呈現既有控制', async ({ page }) => {
    await page.goto('/calculator')

    await expect(page.getByRole('heading', { name: '基因配對工作台' })).toBeVisible()
    await expect(page.getByRole('region', { name: '設定雙親基因' })).toBeVisible()
    await expect(page.locator('.calc-parent-card')).toHaveCount(2)
    await expect(page.getByRole('region', { name: '配對結果' })).toBeVisible()
  })

  test('Genes 可搜尋既有詞條並由詳情回到計算工具', async ({ page }) => {
    await page.goto('/genes')

    const toolHub = page.getByRole('navigation', { name: '基因與工具快速入口' })
    await expect(toolHub.getByRole('link')).toHaveCount(2)
    await expect(toolHub.getByRole('link', { name: /基因計算機/ })).toHaveAttribute(
      'href',
      '/calculator'
    )
    await expect(toolHub.getByRole('link', { name: /找特寵醫院/ })).toHaveAttribute(
      'href',
      '/hospital'
    )

    await page.setViewportSize({ width: 390, height: 844 })
    const mobileColumns = await toolHub.evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length
    )
    expect(mobileColumns).toBe(2)

    const firstGene = page.locator('.gene-btn-item').first()
    const firstName = (await firstGene.locator('.g-name').innerText()).trim()
    const search = page.getByRole('searchbox', { name: '搜尋基因詞條' })
    // SSR 欄位可見時 v-model 尚未必掛載，先等 Vue 綁定完成。
    await expect
      .poll(() =>
        search.evaluate((el) =>
          Object.getOwnPropertySymbols(el).some((key) => key.description === '_assign')
        )
      )
      .toBe(true)
    await search.fill(firstName)
    await expect(page.locator('.gene-btn-item')).toHaveCount(1)
    await firstGene.click()

    await expect(page.getByRole('navigation', { name: '基因詞條工具' })).toBeVisible()
    await expect(page.getByRole('link', { name: '前往基因計算機' })).toHaveAttribute(
      'href',
      '/calculator'
    )
    await expect(page.getByText(/資料來源：/)).toBeVisible()
  })

  test('Hospital 關鍵字篩選只保留符合的既有醫院', async ({ page }) => {
    await page.goto('/hospital')

    const firstCard = page.locator('.hosp-card').first()
    const firstName = (await firstCard.locator('.hosp-name').innerText()).trim()
    const initialCount = await page.locator('.hosp-card').count()
    const search = page.getByRole('searchbox', { name: '搜尋醫院名稱或地址' })
    await expect
      .poll(() =>
        search.evaluate((el) =>
          Object.getOwnPropertySymbols(el).some((key) => key.description === '_assign')
        )
      )
      .toBe(true)
    await search.fill(firstName)

    await expect(page.locator('.hosp-card')).toHaveCount(1)
    await expect(page.locator('.hosp-card .hosp-name')).toHaveText(firstName)
    expect(initialCount).toBeGreaterThan(1)
  })

  test('Health 與 QS 提供明確的前後任務導流', async ({ page }) => {
    await page.goto('/health')
    const healthNav = page.getByRole('navigation', { name: '健康工具導覽' })
    await expect(healthNav.getByRole('link', { name: '飼養前自評' })).toHaveAttribute('href', '/qs')
    await expect(healthNav.getByRole('link', { name: '查找特寵醫院' })).toHaveAttribute(
      'href',
      '/hospital'
    )

    await page.goto('/qs')
    const qsNav = page.getByRole('navigation', { name: '評估後續工具' })
    await expect(qsNav.getByRole('link', { name: '進行健康評估' })).toHaveAttribute(
      'href',
      '/health'
    )
    await expect(qsNav.getByRole('link', { name: '查找特寵醫院' })).toHaveAttribute(
      'href',
      '/hospital'
    )
  })

  test('Health 手機導覽與問卷置頂進度維持緊湊且不遮題目', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/health')

    const healthNav = page.getByRole('navigation', { name: '健康工具導覽' })
    const navLinks = healthNav.getByRole('link')
    await expect(navLinks).toHaveCount(2)
    const linkBoxes = await navLinks.evaluateAll((links) =>
      links.map((link) => {
        const rect = link.getBoundingClientRect()
        return { top: Math.round(rect.top), right: rect.right }
      })
    )
    expect(linkBoxes[0].top).toBe(linkBoxes[1].top)
    expect(linkBoxes.every(({ right }) => right <= 390)).toBe(true)

    await page.locator('.h-entry-card--urgent').click()
    const progress = page.getByRole('progressbar', { name: '問卷作答進度' })
    await expect(progress).toHaveAttribute('aria-valuenow', '0')

    const toolbar = page.locator('.h-quiz-toolbar')
    const firstQuestion = page.locator('.h-q-card').first()
    await expect(toolbar).toBeVisible()
    await expect(firstQuestion).toBeVisible()
    const [navbarBox, toolbarBox, questionBox] = await Promise.all([
      page.locator('.sticky-nav').evaluate((element) => {
        const rect = element.getBoundingClientRect()
        return { bottom: rect.bottom }
      }),
      toolbar.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        return { top: rect.top, bottom: rect.bottom, right: rect.right }
      }),
      firstQuestion.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        return { top: rect.top, right: rect.right }
      })
    ])
    expect(toolbarBox.top).toBeGreaterThanOrEqual(0)
    expect(Math.abs(toolbarBox.top - navbarBox.bottom)).toBeLessThanOrEqual(1)
    expect(toolbarBox.bottom).toBeLessThanOrEqual(questionBox.top + 1)
    expect(Math.max(toolbarBox.right, questionBox.right)).toBeLessThanOrEqual(390)

    const firstOption = firstQuestion.locator('.h-q-opt').first()
    await firstOption.click()
    await expect(firstOption).toHaveAttribute('aria-pressed', 'true')
    await expect(progress).toHaveAttribute('aria-valuenow', '13')
  })

  test('QS 手機問卷以單題表單呈現，進度貼齊導覽且不產生水平溢位', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/qs')

    const progress = page.getByRole('progressbar', { name: '評估作答進度' })
    const toolbar = page.locator('.qs-quiz-toolbar')
    const question = page.locator('.qs-card')
    await expect(progress).toHaveAttribute('aria-valuenow', '0')
    await expect(question).toHaveCount(1)

    const [navbarBottom, toolbarTop] = await Promise.all([
      page.locator('.sticky-nav').evaluate((element) => element.getBoundingClientRect().bottom),
      toolbar.evaluate((element) => element.getBoundingClientRect().top)
    ])
    expect(Math.abs(toolbarTop - navbarBottom)).toBeLessThanOrEqual(1)
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)
      )
      .toBe(true)

    const firstOption = question.locator('.qs-option-btn').first()
    await firstOption.click()
    await expect(firstOption).toHaveAttribute('aria-pressed', 'true')
    await expect(progress).toHaveAttribute('aria-valuenow', '6')
  })
})

test.describe('Phase 4 mobile 堆疊', () => {
  for (const route of ['/calculator', '/genes', '/hospital', '/health', '/qs']) {
    test(`${route} 在 390px 維持單欄且無橫向溢位`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(route)
      await expect(page.locator('#main-content')).toBeVisible()
      await expect
        .poll(() =>
          page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)
        )
        .toBe(true)
    })
  }
})
