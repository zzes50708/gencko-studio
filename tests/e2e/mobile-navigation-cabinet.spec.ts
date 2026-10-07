import { expect, test } from '@playwright/test'

test('手機整合導覽保留會員、主題切換與評估進度列', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 320, height: 844 },
    isMobile: true,
    hasTouch: true
  })
  const page = await context.newPage()
  await page.goto('/shop')
  await page.waitForFunction(
    () => !!(document.querySelector('.bottom-nav') as any)?.__vueParentComponent
  )
  await expect(page.locator('.sticky-nav')).toBeHidden()
  await expect(page.locator('.bottom-nav .label')).toHaveText([
    '首頁',
    '選購 ▾',
    '知識 ▾',
    '工具 ▾',
    '更多 ▾'
  ])
  await page.locator('.bottom-nav button').filter({ hasText: '更多' }).tap()
  const sheet = page.getByRole('dialog', { name: '更多導覽選單' })
  await expect(sheet).toBeVisible()
  const theme = sheet.getByRole('button', { name: /切換深色|切換亮色/ })
  const before = await theme.innerText()
  await theme.tap()
  await expect(theme).not.toHaveText(before)
  await sheet.getByRole('link', { name: '會員專區' }).tap()
  await expect(page).toHaveURL(/\/profile$/)
  await expect(sheet).toBeHidden()
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
  await page.goto('/qs')
  await expect(page.locator('.qs-quiz-toolbar')).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 800))
  await expect
    .poll(() =>
      page.locator('.qs-quiz-toolbar').evaluate((el) => Math.round(el.getBoundingClientRect().top))
    )
    .toBe(0)
  await page.locator('.bottom-nav button').filter({ hasText: '工具' }).tap()
  await page.setViewportSize({ width: 1280, height: 844 })
  await expect(page.locator('.sheet')).toBeHidden()
  await expect(page.locator('.sticky-nav')).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
  await context.close()
})

test('手機 3D 選單重複觸控、完整顯示與背景鎖定', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  })
  const page = await context.newPage()
  await page.goto('/merch')
  const rows = page.getByRole('button', { name: '層數', exact: true })
  for (const value of ['8', '4', '8']) {
    await rows.tap()
    const dialog = page.getByRole('dialog', { name: '層數', exact: true })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: value, exact: true }).tap()
    await expect(rows).toContainText(value)
    await expect(dialog).toBeHidden()
  }
  await page.getByRole('button', { name: '收納抽屜內高', exact: true }).tap()
  const dialog = page.getByRole('dialog', { name: '收納抽屜內高', exact: true })
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden')
  const before = await page.evaluate(() => scrollY)
  const list = dialog.locator('.cabinet-picker-list')
  expect(await list.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true)
  for (const value of ['0 cm', '10 cm', '80 cm']) {
    const box = (await dialog.getByRole('button', { name: value, exact: true }).boundingBox())!
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y + box.height).toBeLessThanOrEqual(844)
  }
  expect(await page.evaluate(() => scrollY)).toBe(before)
  await dialog.getByRole('button', { name: '80 cm', exact: true }).tap()
  await expect(dialog).toBeHidden()
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
  await expect(page.getByRole('button', { name: '收納抽屜內高', exact: true })).toContainText(
    '80 cm'
  )
  await context.close()
})
