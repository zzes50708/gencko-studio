import { test, expect } from '@playwright/test'
test('垂直俯視載入實際街區建築，切換傾斜後可回復', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.route('https://tiles.openfreemap.org/**', (route) => route.abort())
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/hospital')
  const stage = page.locator('.map-stage')
  await expect(stage).toHaveAttribute('data-map-ready', 'true', { timeout: 30000 })
  await page.getByRole('button', { name: '查看 101 街區量體', exact: true }).click()
  await expect(stage).toHaveAttribute('data-map-buildings', '41')
  await expect(stage).toHaveAttribute('data-map-idle', 'true')
  expect(Number(await stage.getAttribute('data-map-calls'))).toBeLessThan(40)
  await expect(page.getByRole('button', { name: '垂直俯視', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await page.getByRole('button', { name: '傾斜看高度', exact: true }).click()
  await expect(stage).toHaveAttribute('data-map-idle', 'true')
  await stage.screenshot({ path: 'output/ux-node71-buildings-tilted.png' })
  await page.getByRole('button', { name: '垂直俯視', exact: true }).click()
  await expect(stage).toHaveAttribute('data-map-idle', 'true')
  await stage.screenshot({ path: 'output/ux-node71-buildings-top.png' })
  const calls = Number(await stage.getAttribute('data-map-calls'))
  const geometries = Number(await stage.getAttribute('data-map-geometries'))
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: '重設地圖視角', exact: true }).click()
    await page.getByRole('button', { name: '查看 101 街區量體', exact: true }).click()
    await expect(stage).toHaveAttribute('data-map-idle', 'true')
  }
  expect(Number(await stage.getAttribute('data-map-calls'))).toBe(calls)
  expect(Number(await stage.getAttribute('data-map-geometries'))).toBe(geometries)
  expect(errors).toEqual([])
})

test('建築下載失敗可重試，原有地圖仍可使用', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.route('https://tiles.openfreemap.org/**', (route) => route.abort())
  await page.route('**/hospital-buildings-taipei101.json', (route) =>
    route.fulfill({ status: 503, body: '' })
  )
  await page.goto('/hospital')
  await expect(page.locator('.map-stage')).toHaveAttribute('data-map-ready', 'true', {
    timeout: 30000
  })
  await page.getByRole('button', { name: '查看 101 街區量體', exact: true }).click()
  await expect(page.locator('.map-building-tools')).toContainText('建築載入失敗')
  await page.unroute('**/hospital-buildings-taipei101.json')
  await page.getByRole('button', { name: '查看 101 街區量體', exact: true }).click()
  await expect(page.locator('.map-stage')).toHaveAttribute('data-map-buildings', '41')
})
