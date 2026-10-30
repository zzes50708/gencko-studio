import { test, expect } from '@playwright/test'

const hospitals = [
  {
    id: 'UX-A',
    name: '穩定測試醫院甲',
    address: '台北市大同區',
    city: '台北市',
    district: '大同區',
    phone: '02-12345678',
    latitude: 25.063,
    longitude: 121.513
  },
  {
    id: 'UX-B',
    name: '穩定測試醫院乙',
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
})

test('地圖搜尋與頁首同步，零結果不拆圖且可在原處清除', async ({ page }) => {
  const mapSearch = page.getByRole('searchbox', { name: '在地圖搜尋醫院', exact: true })
  await mapSearch.fill('找不到的院所')
  await expect(
    page.getByRole('searchbox', { name: '搜尋醫院名稱或地址', exact: true })
  ).toHaveValue('找不到的院所')
  await expect(page.locator('.map-stage canvas')).toBeVisible()
  await expect(mapSearch).toBeFocused()
  await page.getByRole('button', { name: '清除搜尋', exact: true }).click()
  await expect(mapSearch).toHaveValue('')
  await expect(mapSearch).toBeFocused()
  await expect(page.locator('.map-cluster').first()).toBeVisible()
})

test('中文組字完成前不篩選或重新定位', async ({ page }) => {
  const input = page.getByRole('searchbox', { name: '在地圖搜尋醫院', exact: true })
  await input.evaluate((element: HTMLInputElement) => {
    element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    element.value = '尚在組字'
    element.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }))
  })
  await expect(
    page.getByRole('searchbox', { name: '搜尋醫院名稱或地址', exact: true })
  ).toHaveValue('')
  await input.evaluate((element: HTMLInputElement) => {
    element.value = '穩定'
    element.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
  })
  await expect(
    page.getByRole('searchbox', { name: '搜尋醫院名稱或地址', exact: true })
  ).toHaveValue('穩定')
})

test('搜尋後手動縮放優先，不被延遲自動取景拉走', async ({ page }) => {
  await page.getByRole('searchbox', { name: '搜尋醫院名稱或地址', exact: true }).fill('穩定')
  await page.getByRole('button', { name: '放大地圖', exact: true }).click()
  await expect
    .poll(async () => Number(await page.locator('.map-stage').getAttribute('data-map-zoom')))
    .toBeCloseTo(1.6, 1)
  await page.waitForTimeout(450)
  expect(Number(await page.locator('.map-stage').getAttribute('data-map-zoom'))).toBeCloseTo(1.6, 1)
})

test('搜尋後拖曳優先，不被延遲自動取景拉走', async ({ page }) => {
  await page.getByRole('searchbox', { name: '搜尋醫院名稱或地址', exact: true }).fill('穩定')
  const stage = page.locator('.map-stage')
  const box = (await stage.boundingBox())!
  const y = Math.min(box.y + box.height - 100, 950)
  await page.mouse.move(box.x + box.width / 2, y)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 60, y, { steps: 5 })
  await page.mouse.up()
  await page.waitForTimeout(450)
  expect(Number(await stage.getAttribute('data-map-zoom'))).toBeCloseTo(1, 1)
})

test('街區雙擊及 Shift 雙擊可縮放，Home 清除資訊回全台', async ({ page }) => {
  await page.locator('.map-result-preview button').first().click()
  const stage = page.locator('.map-stage')
  await expect
    .poll(async () => Number(await stage.getAttribute('data-map-zoom')))
    .toBeCloseTo(200, 1)
  await stage.locator('canvas').dblclick({ position: { x: 320, y: 340 } })
  await expect
    .poll(async () => Number(await stage.getAttribute('data-map-zoom')))
    .toBeCloseTo(400, 1)
  await stage.locator('canvas').dblclick({ modifiers: ['Shift'], position: { x: 320, y: 340 } })
  await expect
    .poll(async () => Number(await stage.getAttribute('data-map-zoom')))
    .toBeCloseTo(200, 1)
  await stage.locator('canvas').focus()
  await page.keyboard.press('Home')
  await expect(page.locator('.map-hospital-detail')).toHaveCount(0)
  await expect.poll(async () => Number(await stage.getAttribute('data-map-zoom'))).toBeCloseTo(1, 1)
})

test('縮放下限連按不重啟繪製', async ({ page }) => {
  const stage = page.locator('.map-stage')
  await stage.locator('canvas').focus()
  await page.keyboard.press('-')
  await expect
    .poll(async () => Number(await stage.getAttribute('data-map-zoom')))
    .toBeCloseTo(0.7, 2)
  await expect(stage).toHaveAttribute('data-map-idle', 'true')
  const frames = await stage.getAttribute('data-map-frames')
  for (let i = 0; i < 4; i++) await page.keyboard.press('-')
  await page.waitForTimeout(150)
  expect(await stage.getAttribute('data-map-frames')).toBe(frames)
})

test('鍵盤選院所後焦點進入資訊，Escape 可回地圖', async ({ page }) => {
  await page.locator('.map-result-preview button').first().focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: '關閉院所資訊', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.locator('.map-stage canvas')).toBeFocused()
})

test('在背景繪圖中斷不誤判逾時，回前景後可恢復', async ({ page }) => {
  await page.locator('.map-stage canvas').evaluate((canvas: HTMLCanvasElement) => {
    const ext = canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context')!
    ;(window as any).restoreMapContext = () => ext.restoreContext()
    ext.loseContext()
  })
  const stage = page.locator('.map-stage')
  await expect(stage).toHaveAttribute('data-map-recovering', 'true')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.waitForTimeout(4300)
  await expect(stage).toHaveAttribute('data-map-recovering', 'true')
  await expect(stage.locator('canvas')).toHaveCount(1)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    document.dispatchEvent(new Event('visibilitychange'))
    ;(window as any).restoreMapContext()
  })
  await expect(stage).toHaveAttribute('data-map-ready', 'true')
})

test('手機預覽區可直接搜尋並保持輕量模式', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: '查看地圖', exact: true }).click()
  const input = page.getByRole('searchbox', { name: '在地圖搜尋醫院', exact: true })
  await input.fill('院所不存在')
  await expect(
    page.getByRole('searchbox', { name: '搜尋醫院名稱或地址', exact: true })
  ).toHaveValue('院所不存在')
  await expect(page.locator('.hosp-mobile-map')).toBeVisible()
  await expect(page.locator('.map-stage canvas')).toHaveCount(0)
  expect((await input.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('768 到 1920 桌機搜尋工具不造成水平溢出', async ({ page }) => {
  for (const width of [768, 900, 1440, 1920]) {
    await page.setViewportSize({ width, height: 950 })
    await expect(page.getByRole('searchbox', { name: '在地圖搜尋醫院', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})
