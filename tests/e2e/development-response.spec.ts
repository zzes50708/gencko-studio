import { test, expect } from '@playwright/test'
import { writeFile, unlink } from 'node:fs/promises'
test('開發 CSS 依請求類型區分快取', async ({ request }) => {
  const url = '/_nuxt/assets/css/style.css'
  const style = await request.get(url, { headers: { accept: 'text/css,*/*;q=0.1' } })
  const module = await request.get(url, { headers: { accept: '*/*' } })
  expect(style.headers()['content-type']).toContain('text/css')
  expect(module.headers()['content-type']).toContain('javascript')
  expect(style.headers().vary).toContain('Accept')
  expect(module.headers().vary).toContain('Accept')
})
test('產生測試 HTML 不會重載正在操作的頁面', async ({ page }) => {
  await page.goto('/faq')
  await expect(page.locator('#faq-search-input')).toBeEnabled()
  await page.evaluate(() => {
    ;(window as any).uxDocumentMarker = '仍是原頁面'
  })
  const path = 'output/ux-node55-watch-probe.html'
  try {
    await writeFile(path, '<!doctype html><title>監看排除測試</title>')
    await page.waitForTimeout(1000)
    expect(await page.evaluate(() => (window as any).uxDocumentMarker)).toBe('仍是原頁面')
  } finally {
    await unlink(path)
  }
})
