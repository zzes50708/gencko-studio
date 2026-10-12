import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
test.use({ serviceWorkers: 'block' })
test('透視相機、街區圖磚與可點選地標', async ({ page }) => {
  test.setTimeout(60000)
  const body = readFileSync(new URL('../fixtures/hospital-buildings-kinmen.pbf', import.meta.url))
  let requests = 0
  await page.route('https://tiles.openfreemap.org/**', (route) => {
    requests++
    return route.fulfill({
      status: 200,
      contentType: 'application/x-protobuf',
      headers: { 'access-control-allow-origin': '*' },
      body
    })
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/hospital')
  const stage = page.locator('.map-stage')
  await expect(stage).toHaveAttribute('data-map-ready', 'true', { timeout: 30000 })
  await expect(stage).toHaveAttribute('data-map-camera', 'PerspectiveCamera')
  await page.waitForTimeout(300)
  expect(requests).toBe(0)
  await page.locator('.map-result-preview button').first().click()
  await expect
    .poll(async () => Number(await stage.getAttribute('data-map-tile-count')))
    .toBeGreaterThan(0)
  await expect(stage).toHaveAttribute('data-map-tile-loading', 'false', { timeout: 30000 })
  const place = page.locator('.map-building-label:enabled').first()
  await expect(place).toBeVisible()
  const bounds = (await place.boundingBox())!
  const frames = Number(await stage.getAttribute('data-map-frames'))
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width / 2 + 80, bounds.y + bounds.height / 2 + 30, {
    steps: 8
  })
  await page.mouse.up()
  await expect
    .poll(async () => Number(await stage.getAttribute('data-map-frames')))
    .toBeGreaterThan(frames + 2)
  await expect(page.locator('.map-place-detail')).toHaveCount(0)
  await expect(stage).toHaveAttribute('data-map-tile-loading', 'false', { timeout: 30000 })
  await place.click()
  await expect(page.locator('.map-place-detail')).toContainText('OpenStreetMap')
  await expect(page.locator('.map-place-detail a')).toHaveAttribute('href', /google.com\/maps\/dir/)
  await page.getByRole('button', { name: '重設地圖視角', exact: true }).click()
  await expect(stage).toHaveAttribute('data-map-tile-count', '0')
})

test('街區圖磚失敗後可重試，回到全台停止下載', async ({ page }) => {
  test.setTimeout(60000)
  const body = readFileSync(new URL('../fixtures/hospital-buildings-kinmen.pbf', import.meta.url))
  let failed = true
  let requests = 0
  await page.route('https://tiles.openfreemap.org/**', (route) => {
    requests++
    return route.fulfill({
      status: failed ? 503 : 200,
      contentType: 'application/x-protobuf',
      headers: { 'access-control-allow-origin': '*' },
      body: failed ? Buffer.from('暫時無法載入') : body
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
  const failedRequests = requests
  await page.waitForTimeout(500)
  expect(requests).toBe(failedRequests)
  failed = false
  await page.locator('.map-tile-status').getByRole('button', { name: '重試', exact: true }).click()
  await expect
    .poll(async () => Number(await stage.getAttribute('data-map-tile-count')))
    .toBeGreaterThan(0)
  await expect(stage).toHaveAttribute('data-map-tile-loading', 'false')
  await page.getByRole('button', { name: '重設地圖視角', exact: true }).click()
  await expect(stage).toHaveAttribute('data-map-tile-count', '0')
  await expect(stage).toHaveAttribute('data-map-idle', 'true')
  const previousRequests = requests
  await page.waitForTimeout(500)
  expect(requests).toBe(previousRequests)
})
