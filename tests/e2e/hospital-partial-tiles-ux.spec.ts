import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

test.use({ serviceWorkers: 'block' })
test('首次圖資部分失敗仍顯示建築，重試後恢復完整狀態', async ({ page }) => {
  const body = readFileSync(new URL('../fixtures/hospital-buildings-kinmen.pbf', import.meta.url))
  let requests = 0
  let failureEnabled = true
  await page.route('https://tiles.openfreemap.org/**', (route) => {
    requests++
    const x = Number(new URL(route.request().url()).pathname.split('/').at(-2))
    const failed = failureEnabled && x % 2 === 0
    return route.fulfill({
      status: failed ? 503 : 200,
      contentType: 'application/x-protobuf',
      body: failed ? Buffer.from('單一圖磚失敗') : body
    })
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/hospital')
  const stage = page.locator('.map-stage')
  await expect(stage).toHaveAttribute('data-map-ready', 'true', { timeout: 30000 })
  await page.locator('.map-result-preview button').first().click()
  await expect(page.locator('.map-tile-status')).toContainText('圖資暫時無法載入', {
    timeout: 30000
  })
  expect(requests).toBeGreaterThan(1)
  expect(Number(await stage.getAttribute('data-map-tile-count'))).toBeGreaterThan(0)
  failureEnabled = false
  await page.locator('.map-tile-status').getByRole('button', { name: '重試', exact: true }).click()
  await expect(page.locator('.map-tile-status')).toContainText('已載入', { timeout: 30000 })
  await expect(stage).toHaveAttribute('data-map-tile-loading', 'false')
  await page.getByRole('button', { name: '重設地圖視角', exact: true }).click()
  await expect(stage).toHaveAttribute('data-map-tile-count', '0')
})

test('區域尺度就開始載入建築，不必放大到舊門檻', async ({ page }) => {
  const body = readFileSync(new URL('../fixtures/hospital-buildings-kinmen.pbf', import.meta.url))
  await page.route('https://tiles.openfreemap.org/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/x-protobuf', body })
  )
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/hospital')
  const stage = page.locator('.map-stage')
  await expect(stage).toHaveAttribute('data-map-ready', 'true', { timeout: 30000 })
  const canvas = stage.locator('canvas')
  await canvas.focus()
  for (let i = 0; i < 8; i++) await page.keyboard.press('=')
  await expect
    .poll(async () => Number(await stage.getAttribute('data-map-tile-count')), { timeout: 30000 })
    .toBeGreaterThan(0)
  expect(Number(await stage.getAttribute('data-map-zoom'))).toBeLessThan(60)
})
