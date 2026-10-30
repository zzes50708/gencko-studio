import { test, expect } from '@playwright/test'

const hospitals = [
  {
    id: 'STABLE-A',
    name: '穩定測試院所',
    address: '台北市大同區',
    city: '台北市',
    district: '大同區',
    phone: '02-12345678',
    latitude: 25.063,
    longitude: 121.513
  },
  {
    id: 'STABLE-B',
    name: '穩定測試院所乙',
    address: '新北市三重區',
    city: '新北市',
    district: '三重區',
    phone: '02-12345678',
    latitude: 25.064,
    longitude: 121.49
  }
]
test.beforeEach(async ({ page }) => {
  await page.route('https://tiles.openfreemap.org/**', (r) => r.abort())
  await page.route('**/rest/v1/hospitals*', (r) => r.fulfill({ json: hospitals }))
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/qs')
  await page.waitForLoadState('networkidle')
  await page.getByRole('link', { name: '查找特寵醫院', exact: true }).click()
  await expect(page.locator('.map-stage')).toHaveAttribute('data-map-ready', 'true', {
    timeout: 30000
  })
  await page.evaluate(() => {
    ;(window as any).stableCanvas = document.querySelector('.map-stage canvas')
  })
})
const connected = (page: any) =>
  page.evaluate(
    () =>
      (window as any).stableCanvas.isConnected &&
      (window as any).stableCanvas === document.querySelector('.map-stage canvas')
  )
async function refresh(page: any) {
  await page.evaluate(() => {
    const nuxt = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
      .$nuxt
    void nuxt.callHook('app:data:refresh', ['hospitals-v1'])
  })
}

test('反覆搜尋零結果與清除仍使用原畫布，不重新建立地圖', async ({ page }) => {
  const search = page.getByRole('searchbox', { name: '搜尋醫院名稱或地址', exact: true })
  for (let i = 0; i < 4; i++) {
    await search.fill('沒有此院所XYZ')
    await expect(page.locator('.hosp-map-empty-state')).toBeVisible()
    await expect(page.locator('.map-cluster,.map-pin')).toHaveCount(0)
    expect(await connected(page)).toBe(true)
    await expect(page.locator('.map-stage')).toHaveAttribute('data-map-ready', 'true')
    await search.fill('')
    await expect(page.locator('.hosp-map-empty-state')).toHaveCount(0)
    expect(await connected(page)).toBe(true)
    await expect(page.locator('.map-cluster').first()).toBeVisible()
  }
})

test('院所資料延遲重讀期間保留原地圖及視角', async ({ page }) => {
  await page.locator('.map-result-preview button').first().click()
  const stage = page.locator('.map-stage')
  await expect(stage).toHaveAttribute('data-map-idle', 'true')
  const zoom = Number(await stage.getAttribute('data-map-zoom'))
  let finish!: () => void
  const delayed = new Promise<void>((resolve) => {
    finish = resolve
  })
  await page.route('**/rest/v1/hospitals*', async (r) => {
    await delayed
    await r.fulfill({ json: hospitals })
  })
  await refresh(page)
  await expect(page.getByText('正在更新院所資料，地圖暫時保留目前位置。')).toBeVisible()
  expect(await connected(page)).toBe(true)
  expect(Number(await stage.getAttribute('data-map-zoom'))).toBeCloseTo(zoom, 1)
  finish()
  await expect(page.getByText('正在更新院所資料，地圖暫時保留目前位置。')).toHaveCount(0)
  expect(await connected(page)).toBe(true)
})

test('重讀失敗保留舊地圖，重新載入成功後仍不換畫布', async ({ page }) => {
  await page.route('**/rest/v1/hospitals*', (r) =>
    r.fulfill({ status: 503, json: { message: '測試暫時失敗' } })
  )
  await refresh(page)
  await expect(page.getByText('院所資料更新失敗，地圖暫時顯示先前資料，請稍後重試。')).toBeVisible()
  expect(await connected(page)).toBe(true)
  await page.route('**/rest/v1/hospitals*', (r) => r.fulfill({ json: hospitals }))
  await page.getByRole('button', { name: '重新載入', exact: true }).click()
  await expect(page.locator('.hosp-card')).toHaveCount(2)
  expect(await connected(page)).toBe(true)
})

test('成功回傳空名錄不冒充舊院所資料', async ({ page }) => {
  await page.route('**/rest/v1/hospitals*', (r) => r.fulfill({ json: [] }))
  await refresh(page)
  await expect(page.locator('.hosp-card')).toHaveCount(0)
  await expect(page.locator('.map-stage')).toHaveCount(0)
})

test('短暫繪圖中斷可原地恢復，保留相同畫布與院所視角', async ({ page }) => {
  await page.locator('.map-result-preview button').first().click()
  const stage = page.locator('.map-stage')
  await expect(stage).toHaveAttribute('data-map-idle', 'true', { timeout: 15000 })
  const zoom = Number(await stage.getAttribute('data-map-zoom'))
  await stage.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
    const ext = canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context')!
    ;(window as any).restoreMapContext = () => ext.restoreContext()
    ext.loseContext()
  })
  await expect(stage).toHaveAttribute('data-map-recovering', 'true')
  expect(await connected(page)).toBe(true)
  await page.evaluate(() => (window as any).restoreMapContext())
  await expect(stage).toHaveAttribute('data-map-ready', 'true')
  await expect(stage).toHaveAttribute('data-map-recovering', 'false')
  expect(await connected(page)).toBe(true)
  await expect(stage).toHaveAttribute('data-map-idle', 'true')
  expect(Number(await stage.getAttribute('data-map-triangles'))).toBeGreaterThan(0)
  await expect(page.locator('.map-cluster').first()).toBeVisible()
  expect(Number(await stage.getAttribute('data-map-zoom'))).toBeCloseTo(zoom, 1)
  const frames = Number(await stage.getAttribute('data-map-frames'))
  await page.getByRole('button', { name: '放大地圖', exact: true }).click()
  await expect
    .poll(async () => Number(await stage.getAttribute('data-map-frames')))
    .toBeGreaterThan(frames)
})

test('無法恢復時提供手動重載，重載可正常建立地圖', async ({ page }) => {
  await page.locator('.map-stage canvas').evaluate((canvas: HTMLCanvasElement) => {
    canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext()
  })
  const retry = page.getByRole('button', { name: '重新載入地圖', exact: true })
  await expect(retry).toBeVisible({ timeout: 8000 })
  await retry.click()
  await expect(page.locator('.map-stage')).toHaveAttribute('data-map-ready', 'true', {
    timeout: 30000
  })
})

test('滾出畫面再回來及調整視窗尺寸，保持同一張可互動地圖', async ({ page }) => {
  const stage = page.locator('.map-stage')
  await page.locator('footer').scrollIntoViewIfNeeded()
  await stage.scrollIntoViewIfNeeded()
  await page.setViewportSize({ width: 1200, height: 860 })
  expect(await connected(page)).toBe(true)
  await expect(stage).toHaveAttribute('data-map-ready', 'true')
  const frames = Number(await stage.getAttribute('data-map-frames'))
  await page.getByRole('button', { name: '放大地圖', exact: true }).click()
  await expect
    .poll(async () => Number(await stage.getAttribute('data-map-frames')))
    .toBeGreaterThan(frames)
})
