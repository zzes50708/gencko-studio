import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
test.use({ serviceWorkers: 'block' })
test.beforeEach(async ({ page }) => {
  await page.route('https://tiles.openfreemap.org/**', (route) => route.abort())
  await page.route('**/rest/v1/hospitals*', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'A',
          name: '位置測試院所甲',
          address: '台北市大同區',
          city: '台北市',
          district: '大同區',
          phone: '02-12345678',
          latitude: 25.063,
          longitude: 121.513
        },
        {
          id: 'B',
          name: '位置測試院所乙',
          address: '台北市大同區',
          city: '台北市',
          district: '大同區',
          phone: '02-12345678',
          latitude: 25.063,
          longitude: 121.513
        },
        {
          id: 'C',
          name: '待補資料院所',
          address: '台北市大同區',
          city: '台北市',
          district: '大同區',
          phone: null,
          latitude: 0,
          longitude: 0
        }
      ])
    })
  )
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.goto('/qs')
  await page.waitForLoadState('networkidle')
  await page.getByRole('link', { name: '查找特寵醫院', exact: true }).click()
  await expect(page.locator('.hosp-card')).toHaveCount(3)
  await expect(page.locator('.map-stage')).toHaveAttribute('data-map-ready', 'true', {
    timeout: 30000
  })
})
test('鍵盤打開同位置院所選單，焦點直接進入院所選項', async ({ page }) => {
  await page.getByRole('button', { name: '放大查看 2 間院所', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: '位置測試院所甲', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.locator('.map-stage canvas')).toBeFocused()
})
test('重新定位優先於待執行的滾輪', async ({ page }) => {
  await page.locator('.hosp-header-toggle').first().click()
  const stage = page.locator('.map-stage')
  await expect
    .poll(async () => Number(await stage.getAttribute('data-map-zoom')))
    .toBeCloseTo(200, 1)
  await page.evaluate(() => {
    const stage = document.querySelector('.map-stage')!
    const rect = stage.getBoundingClientRect()
    stage.dispatchEvent(
      new WheelEvent('wheel', {
        ctrlKey: true,
        deltaY: -400,
        bubbles: true,
        cancelable: true,
        clientX: rect.x + rect.width / 2,
        clientY: rect.y + rect.height / 2
      })
    )
    const button = [
      ...document.querySelectorAll<HTMLButtonElement>('.map-detail-actions button')
    ].find((button) => button.textContent?.trim() === '重新定位')!
    button.click()
  })
  await expect
    .poll(async () => Number(await stage.getAttribute('data-map-zoom')))
    .toBeCloseTo(200, 1)
  await expect(stage).toHaveAttribute('data-map-idle', 'true')
  expect(Number(await stage.getAttribute('data-map-zoom'))).toBeCloseTo(200, 1)
})
test('無效座標與缺少電話顯示明確提示', async ({ page }) => {
  const card = page.locator('#hospital-C')
  await card.locator('.hosp-header-toggle').click()
  await expect(card.locator('.hosp-location-note')).toBeVisible()
  await expect(card.locator('.hosp-phone')).toHaveText('尚未提供電話')
  await expect(card.locator('.hosp-call-btn')).toHaveCount(0)
  await expect(page.getByRole('combobox', { name: 'Google 預覽院所' })).toHaveValue('C')
})
test('收藏按鈕向輔助技術提供切換狀態', async ({ page }) => {
  const favorite = page.locator('#hospital-A .hosp-fav-btn')
  await expect(favorite).toHaveAttribute('aria-pressed', 'false')
  await favorite.click()
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')
})

test('3D 中斷後關閉院所資訊，焦點移到重新載入按鈕', async ({ page }) => {
  await page.locator('#hospital-A .hosp-header-toggle').click()
  await page.locator('.map-stage canvas').evaluate((canvas: HTMLCanvasElement) => {
    canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext()
  })
  const retry = page.getByRole('button', { name: '重新載入地圖', exact: true })
  await expect(retry).toBeVisible()
  await page.getByRole('button', { name: '關閉院所資訊', exact: true }).click()
  await expect(retry).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('.map-stage')).toHaveAttribute('data-map-ready', 'true', {
    timeout: 30000
  })
})

test('儲存受限警告在站內往返後仍保留', async ({ page }) => {
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'gencko_hosp_wishlist') throw new DOMException('儲存受限', 'QuotaExceededError')
      original.call(this, key, value)
    }
  })
  await page.locator('#hospital-A .hosp-fav-btn').click()
  await expect(page.locator('.hosp-alert-box')).toContainText('暫時無法儲存收藏')
  await page
    .locator('a[href="/qs"]')
    .first()
    .evaluate((element) => (element as HTMLAnchorElement).click())
  await expect(page).toHaveURL(/\/qs$/)
  await page.getByRole('link', { name: '查找特寵醫院', exact: true }).click()
  await expect(page.locator('.hosp-alert-box')).toContainText('暫時無法儲存收藏')
})

test('選擇地標後關閉舊的同位置院所選單', async ({ page }) => {
  const body = readFileSync(new URL('../fixtures/hospital-buildings-kinmen.pbf', import.meta.url))
  await page.route('https://tiles.openfreemap.org/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/x-protobuf', body })
  )
  await page.locator('#hospital-A .hosp-header-toggle').click()
  await expect(page.locator('.map-building-label').first()).toBeVisible({ timeout: 30000 })
  await page.getByRole('button', { name: '放大查看 2 間院所', exact: true }).click()
  await expect(page.locator('.map-shared-location')).toBeVisible()
  await page.locator('.map-building-label').first().click()
  await expect(page.locator('.map-place-detail')).toBeVisible()
  await expect(page.getByRole('button', { name: '關閉地標資訊', exact: true })).toBeFocused()
  await expect(page.locator('.map-shared-location')).toHaveCount(0)
})

test('搜尋缺少座標的院所改用地址預覽，恢復有效搜尋回立體地圖', async ({ page }) => {
  const search = page.getByRole('searchbox', { name: '在地圖搜尋醫院', exact: true })
  await search.fill('待補資料')
  await expect(page.getByRole('combobox', { name: 'Google 預覽院所' })).toHaveValue('C')
  await search.fill('位置測試院所甲')
  await expect(page.locator('.map-hospital-detail')).toContainText('位置測試院所甲')
})

test('使用者選擇 Google 後搜尋有效院所保留底圖偏好', async ({ page }) => {
  await page.getByRole('button', { name: 'Google 地圖', exact: true }).click()
  await page.getByRole('searchbox', { name: '在地圖搜尋醫院', exact: true }).fill('位置測試院所乙')
  await expect(page.getByRole('combobox', { name: 'Google 預覽院所' })).toHaveValue('B')
  await expect(page.getByRole('button', { name: 'Google 地圖', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
})

test('混合定位資料的搜尋保留全部院所供選擇', async ({ page }) => {
  await page.getByRole('searchbox', { name: '在地圖搜尋醫院', exact: true }).fill('院所')
  await expect(page.locator('.map-preview-list button')).toHaveCount(3)
  await expect(page.locator('.map-hospital-detail')).toHaveCount(0)
  await page
    .locator('.map-preview-list')
    .getByRole('button', { name: /^待補資料院所/ })
    .click()
  await expect(page.getByRole('combobox', { name: 'Google 預覽院所' })).toHaveValue('C')
})

test('地址預覽中自行切換院所維持 Google 模式', async ({ page }) => {
  await page.getByRole('searchbox', { name: '在地圖搜尋醫院', exact: true }).fill('院所')
  await page.locator('#hospital-C .hosp-header-toggle').click()
  const picker = page.getByRole('combobox', { name: 'Google 預覽院所' })
  await picker.selectOption('B')
  await expect(picker).toHaveValue('B')
  await expect(page.getByRole('button', { name: 'Google 地圖', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
})

test('Google 模式按 Escape 停止操作且不切換院所', async ({ page }) => {
  await page.getByRole('button', { name: 'Google 地圖', exact: true }).click()
  await page.getByRole('combobox', { name: 'Google 預覽院所' }).selectOption('B')
  await page.getByRole('button', { name: '啟用地圖操作', exact: true }).click()
  await page.keyboard.press('Escape')
  const toggle = page.getByRole('button', { name: '啟用地圖操作', exact: true })
  await expect(toggle).toBeFocused()
  await expect(page.getByRole('combobox', { name: 'Google 預覽院所' })).toHaveValue('B')
})

test('立體地圖失敗後搜尋缺座標院所仍可用地址預覽', async ({ page }) => {
  await page.locator('.map-stage canvas').evaluate((canvas: HTMLCanvasElement) => {
    canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext()
  })
  await expect(page.getByRole('button', { name: '重新載入地圖', exact: true })).toBeVisible()
  await page.getByRole('searchbox', { name: '在地圖搜尋醫院', exact: true }).fill('待補資料')
  await expect(page.getByRole('combobox', { name: 'Google 預覽院所' })).toHaveValue('C')
})

test('多間結果只有一間有座標時仍保留完整選擇', async ({ page }) => {
  await page.route('**/rest/v1/hospitals*', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'M1',
          name: '混合院所甲',
          city: '台北市',
          district: '大同區',
          address: '台北市大同區',
          latitude: 25.063,
          longitude: 121.513
        },
        {
          id: 'M2',
          name: '混合院所乙',
          city: '台北市',
          district: '大同區',
          address: '台北市大同區',
          latitude: 0,
          longitude: 0
        }
      ])
    })
  )
  await page.goto('/qs')
  await page.waitForLoadState('networkidle')
  await page.getByRole('link', { name: '查找特寵醫院', exact: true }).click()
  await expect(page.locator('.map-stage')).toHaveAttribute('data-map-ready', 'true')
  await page.getByRole('searchbox', { name: '在地圖搜尋醫院', exact: true }).fill('混合')
  await page.waitForTimeout(400)
  await expect(page.locator('.map-preview-list button')).toHaveCount(2)
  await expect(page.locator('.map-hospital-detail')).toHaveCount(0)
})
