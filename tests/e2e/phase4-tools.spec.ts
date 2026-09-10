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
    await expect(healthNav.getByRole('link', { name: '先做飼養前自評' })).toHaveAttribute(
      'href',
      '/qs'
    )
    await expect(healthNav.getByRole('link', { name: '直接查找特寵醫院' })).toHaveAttribute(
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
