import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

test.use({ serviceWorkers: 'block' })
test('院所周邊建築可切換傾斜與俯視，重複取景維持正常', async ({ page }) => {
  const body = readFileSync(new URL('../fixtures/hospital-buildings-kinmen.pbf', import.meta.url))
  await page.route('https://tiles.openfreemap.org/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/x-protobuf', body })
  )
  await page.setViewportSize({ width: 1440, height: 950 })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/hospital')
  const stage = page.locator('.map-stage')
  await expect(stage).toHaveAttribute('data-map-ready', 'true', { timeout: 30000 })
  await page.locator('.map-result-preview button').first().click()
  await expect
    .poll(async () => Number(await stage.getAttribute('data-map-tile-count')))
    .toBeGreaterThan(0)
  await page.getByRole('button', { name: '傾斜看高度', exact: true }).click()
  await expect(page.getByRole('button', { name: '傾斜看高度', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await page.getByRole('button', { name: '垂直俯視', exact: true }).click()
  await expect(page.getByRole('button', { name: '垂直俯視', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: '重設地圖視角', exact: true }).click()
    await page.locator('.map-result-preview button').first().click()
    await expect
      .poll(async () => Number(await stage.getAttribute('data-map-tile-count')))
      .toBeGreaterThan(0)
  }
  expect(errors).toEqual([])
})
