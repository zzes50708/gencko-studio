import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
test.setTimeout(60000)
test('手機加熱墊、匯出與操作回饋同步', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 850 },
    isMobile: true,
    hasTouch: true
  })
  const page = await context.newPage()
  await page.goto('/merch')
  await page.getByRole('button', { name: '開啟 3D 客製模擬系統', exact: true }).tap()
  await page.getByRole('button', { name: '加熱墊款式', exact: true }).tap()
  await page
    .getByRole('dialog', { name: '加熱墊款式', exact: true })
    .getByRole('button', { name: /韓國/ })
    .tap()
  await expect(page.locator('#cabinet-summary')).toHaveValue(/標配：.*韓國加熱墊/)
  await page.getByRole('button', { name: '確認生成模型', exact: true }).tap()
  await expect(page.locator('.cabinet-workspace canvas')).toBeVisible({ timeout: 30000 })
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: '匯出清單', exact: true }).tap()
  const download = await pending
  expect(await readFile((await download.path())!, 'utf8')).toContain('加熱墊：韓國加熱墊')
  await expect(page.locator('.mobile-export-status')).toContainText('已建立文字清單')
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => {} }
    })
  )
  await page.getByRole('button', { name: '複製清單', exact: true }).tap()
  await expect(page.locator('.mobile-export-status')).toHaveText('已複製清單')
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error('denied')
        }
      }
    })
  )
  await page.getByRole('button', { name: '複製清單', exact: true }).tap()
  await expect(page.locator('.mobile-export-status')).toContainText('未允許複製')
  await expect(page.locator('.cabinet-case-grid')).toHaveCount(0)
  await context.close()
})
test('橫向數量選單完整顯示並保留觸控高度', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 740, height: 360 },
    isMobile: true,
    hasTouch: true
  })
  const page = await context.newPage()
  await page.goto('/merch')
  await page.getByRole('button', { name: '開啟 3D 客製模擬系統', exact: true }).tap()
  await page.getByRole('button', { name: '收納抽屜內高', exact: true }).tap()
  const picker = page.getByRole('dialog', { name: '收納抽屜內高', exact: true })
  const bounds = await picker.evaluate((el) => {
    const panel = el.querySelector('section')!.getBoundingClientRect()
    return {
      top: panel.top,
      bottom: panel.bottom,
      height: innerHeight,
      min: Math.min(
        ...Array.from(
          el.querySelectorAll('.cabinet-picker-list button'),
          (b) => b.getBoundingClientRect().height
        )
      )
    }
  })
  expect(bounds.top).toBeGreaterThanOrEqual(0)
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.height)
  expect(bounds.min).toBeGreaterThanOrEqual(36)
  await page.getByRole('button', { name: '關閉選單', exact: true }).tap()
  await expect(picker).toBeHidden()
  await expect(page.getByRole('dialog', { name: '3D 客製模擬系統', exact: true })).toBeVisible()
  await context.close()
})
