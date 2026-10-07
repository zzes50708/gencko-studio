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
  await expect(page.locator('.cabinet-workspace canvas')).toBeVisible({ timeout: 30000 })
  await page.getByRole('button', { name: '加熱墊款式', exact: true }).tap()
  await page.locator('dialog[open]').getByRole('button', { name: /韓國/ }).tap()
  await expect(page.locator('#cabinet-summary')).toHaveValue(/標配：.*韓國加熱墊/)
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
  await expect(page.locator('.cabinet-workspace canvas')).toBeVisible({ timeout: 30000 })
  await page.getByRole('button', { name: '收納抽屜內高', exact: true }).tap()
  const bounds = await page.locator('dialog[open]').evaluate((el) => {
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
  await expect(page.locator('dialog[open]')).toHaveCount(0)
  await context.close()
})
