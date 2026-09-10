import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

// 僅驗證本機介面，不登入、不送出交易或修改遠端資料。
const output = 'output/shared-ui-20260910'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const results = []
for (const width of [1440, 390, 320]) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: 'light' })
  await context.addInitScript(() => {
    // 瀏覽器錯誤文件與開發工具的沙箱 iframe 不允許存取儲存空間。
    try { localStorage.setItem('gencko_theme', 'light') } catch {}
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const capture = async name => {
    await page.screenshot({ path: `${output}/${width}-${name}.png` })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)
    results.push({ width, name, overflow, errors: [...errors] })
    expect(overflow).toBe(false)
    expect(errors).toEqual([])
  }
  try {
    await page.goto('http://localhost:3000/offline.html')
    await expect(page.locator('#status')).toHaveClass(/online/)
    await context.setOffline(true)
    await expect(page.locator('#status')).not.toHaveClass(/online/)
    await capture('offline')
    await context.setOffline(false)
    await expect(page.locator('#status')).toHaveClass(/online/)
    await page.goto('http://localhost:3000/ui-check-missing-page')
    await expect(page.locator('.err-code')).toHaveText('404')
    await capture('error')
    await page.goto('http://localhost:3000/merch/1')
    await expect(page.locator('.prod-img-button')).toBeVisible()
    await page.waitForTimeout(1200)
    await page.locator('.prod-img-button').click()
    await expect(page.locator('.lightbox-overlay')).toBeVisible()
    await expect(page.getByRole('dialog', { name: '圖片預覽' })).toBeVisible()
    await expect(page.locator('.lightbox-close-btn')).toBeFocused()
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden')
    await expect(page.locator('.lightbox-close-btn')).toHaveCSS('border-radius', '2px')
    await capture('lightbox')
    await page.keyboard.press('Escape')
    await expect(page.locator('.lightbox-overlay')).toHaveCount(0)
    await expect(page.locator('.prod-img-button')).toBeFocused()
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('')
    await page.locator('.prod-img-button').click()
    await page.locator('.lightbox-close-btn').click()
    await expect(page.locator('.lightbox-overlay')).toHaveCount(0)
    // 已驗收詳情頁有 3px 的局部設定，仍屬同一微圓角按鈕形式。
    const backStyle = await page.locator('.app-back-btn').evaluate(element => ({
      radius: parseFloat(getComputedStyle(element).borderRadius),
      height: element.getBoundingClientRect().height
    }))
    expect(backStyle.radius).toBeLessThanOrEqual(3)
    expect(backStyle.height).toBeGreaterThanOrEqual(44)
  } catch (error) {
    results.push({ width, error: error.message })
    process.exitCode = 1
  }
  await context.close()
}
await browser.close()
await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
