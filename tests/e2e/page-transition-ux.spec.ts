import { test, expect } from '@playwright/test'
for (const width of [390, 1440])
  test(`${width}px 離場頁面不接收輸入，立即返回仍可搜尋`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      viewport: { width, height: 844 },
      hasTouch: width < 768,
      isMobile: width < 768
    })
    const page = await context.newPage()
    await page.goto('/faq')
    const search = page.getByRole('searchbox', { name: '搜尋所有常見問題' })
    await expect(search).toBeEnabled()
    await search.fill('訂金')
    await expect(page).toHaveURL(/q=/)
    // 延長離場階段，穩定驗證舊 DOM 仍存在時已無法接收操作。
    await page.addStyleTag({ content: '.page-leave-active {transition-duration: 2s !important;}' })
    await page.locator('.faq-route-map a[href="/buying-guide"]').click()
    await expect(page).toHaveURL(/buying-guide/)
    const leaving = page.locator('.faq-page-wrapper.page-leave-active')
    await expect(leaving).toHaveCount(1)
    expect(await leaving.evaluate((element: any) => element.inert)).toBe(true)
    await expect(search).toHaveCount(0)
    await page.goBack()
    const returned = page.getByRole('searchbox', { name: '搜尋所有常見問題' })
    if (width < 768) await returned.tap()
    else await returned.click()
    await returned.fill('ux-new-search-123')
    await expect(page.getByText('沒有符合的問題，請試試其他關鍵字。')).toBeVisible()
    await expect(returned).toHaveValue('ux-new-search-123')
    await expect(page).toHaveURL(/q=ux-new-search-123/)
    await context.close()
  })
