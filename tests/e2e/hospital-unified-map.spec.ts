import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
const liberty = JSON.parse(
  readFileSync(new URL('../fixtures/openfreemap-liberty.json', import.meta.url), 'utf8')
)

const hospitals = [
  {
    id: 'VECTOR-A',
    name: '統一測試醫院甲',
    city: '台北市',
    district: '大同區',
    address: '台北市大同區測試路1號',
    phone: '02-12345678#12',
    longitude: 121.513,
    latitude: 25.063
  },
  {
    id: 'VECTOR-B',
    name: '統一測試醫院乙',
    city: '新北市',
    district: '三重區',
    address: '新北市三重區測試路2號',
    phone: '02-22345678',
    longitude: 121.49,
    latitude: 25.064
  },
  {
    id: 'VECTOR-C',
    name: '尚待定位醫院',
    city: '台北市',
    district: '大同區',
    address: '台北市大同區測試路3號',
    phone: null,
    longitude: null,
    latitude: null
  }
]
const tile = readFileSync(new URL('../fixtures/hospital-buildings-kinmen.pbf', import.meta.url))
test.setTimeout(90_000)
test.use({ reducedMotion: 'reduce', serviceWorkers: 'block' })
async function setup(page: any, context: any) {
  await context.route('https://tiles.openfreemap.org/styles/liberty', (r: any) =>
    r.fulfill({ json: liberty })
  )
  await context.route('https://tiles.openfreemap.org/planet', (r: any) =>
    r.fulfill({
      json: {
        tilejson: '3.0.0',
        attribution: 'OpenFreeMap · © OpenStreetMap contributors',
        tiles: ['https://tiles.openfreemap.org/test/{z}/{x}/{y}.pbf'],
        minzoom: 0,
        maxzoom: 14
      }
    })
  )
  await context.route('https://tiles.openfreemap.org/test/**', (r: any) =>
    r.fulfill({ body: tile, contentType: 'application/x-protobuf' })
  )
  await page.route('**/rest/v1/hospitals*', (r: any) => r.fulfill({ json: hospitals }))
  await page.goto('/qs', { timeout: 90000, waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  await page.getByRole('link', { name: '查找特寵醫院', exact: true }).click()
  await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-ready', 'true', {
    timeout: 45000
  })
}
test.beforeEach(async ({ page, context }) => {
  await setup(page, context)
})

test('電腦只有一張原生向量地圖，路名與3D建築共存', async ({ page }) => {
  await expect(page.locator('.maplibregl-canvas')).toHaveCount(1)
  await expect(page.locator('.hospital-unified-map iframe')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Google.*預覽|3D.*模式/ })).toHaveCount(0)
  expect(
    Number(await page.locator('.unified-map-body').getAttribute('data-map-road-layers'))
  ).toBeGreaterThan(0)
  await page.locator('.unified-hospital-result').filter({ hasText: '統一測試醫院甲' }).click()
  await expect(page.getByRole('complementary', { name: '院所資訊' })).toContainText(
    '統一測試醫院甲'
  )
  await expect
    .poll(async () => Number(await page.locator('.unified-map-body').getAttribute('data-map-zoom')))
    .toBeGreaterThan(16)
  await expect
    .poll(
      async () =>
        Number(await page.locator('.unified-map-body').getAttribute('data-map-buildings')),
      { timeout: 20000 }
    )
    .toBeGreaterThan(0)
})
test('院所電話、收藏及導航連結正確', async ({ page }) => {
  await page.locator('.unified-hospital-result').first().click()
  const card = page.getByRole('complementary', { name: '院所資訊' })
  await expect(card.getByRole('link', { name: '撥打電話' })).toHaveAttribute(
    'href',
    'tel:0212345678'
  )
  await expect(card).toContainText('分機 12')
  await card.getByRole('button', { name: '收藏院所', exact: true }).click()
  await expect(card.getByRole('button', { name: '取消收藏', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await expect(card.getByRole('link', { name: '導航 ↗' })).toHaveAttribute(
    'href',
    /google.com\/maps\/dir/
  )
})
test('零搜尋結果不重建畫布，兩個搜尋欄同步', async ({ page }) => {
  const canvas = await page.locator('.maplibregl-canvas').elementHandle()
  const search = page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' })
  await search.fill('不存在的醫院')
  await expect(
    page.getByRole('searchbox', { name: '搜尋醫院名稱或地址', exact: true })
  ).toHaveValue('不存在的醫院')
  await expect(page.locator('.unified-map-results')).toContainText('沒有符合的院所')
  expect(await canvas?.evaluate((el) => el.isConnected)).toBe(true)
  await page
    .locator('.unified-map-search')
    .getByRole('button', { name: '清除', exact: true })
    .click()
  await expect(search).toHaveValue('')
  await expect(search).toBeFocused()
})
test('地點搜尋後仍在同一張圖定位', async ({ page }) => {
  await page.route('**/api/hospital-place-search*', (r) =>
    r.fulfill({
      json: {
        places: [
          {
            id: '101',
            name: '台北101',
            address: '台北市信義區',
            longitude: 121.565,
            latitude: 25.034
          }
        ]
      }
    })
  )
  await page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' }).fill('台北101')
  await page.getByRole('button', { name: '搜尋地點', exact: true }).click()
  await page.locator('.unified-place-result').click()
  await expect(page.getByRole('complementary', { name: '地點資訊' })).toContainText('台北101')
  await expect(page.locator('.maplibregl-marker')).toHaveCount(1)
  await expect(page.locator('.hospital-unified-map iframe')).toHaveCount(0)
})
test('無座標院所可以在本圖搜尋地址', async ({ page }) => {
  await page.route('**/api/hospital-place-search*', (r) =>
    r.fulfill({
      json: {
        places: [
          {
            id: 'address',
            name: '測試路3號',
            address: '台北市大同區',
            longitude: 121.513,
            latitude: 25.063
          }
        ]
      }
    })
  )
  await page.locator('.unified-hospital-result').filter({ hasText: '尚待定位醫院' }).click()
  await page.getByRole('button', { name: '搜尋此地址' }).click()
  await expect(page.locator('.unified-place-result')).toContainText('測試路3號')
})
test('外部搜尋失敗仍可篩選院所與操作地圖', async ({ page }) => {
  await page.route('**/api/hospital-place-search*', (r) =>
    r.fulfill({ status: 503, json: { message: 'unavailable' } })
  )
  await page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' }).fill('統一')
  await page.getByRole('button', { name: '搜尋地點', exact: true }).click()
  await expect(page.locator('.unified-map-results')).toContainText('地點搜尋暫時無法使用')
  await expect(page.locator('.unified-hospital-result')).toHaveCount(2)
  await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-ready', 'true')
})
test('鍵盤Home重設、Escape關閉資訊', async ({ page }) => {
  await page.locator('.unified-hospital-result').first().click()
  await page.locator('.maplibregl-canvas').focus()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('complementary', { name: '院所資訊' })).toHaveCount(0)
  await page.keyboard.press('Home')
  await expect
    .poll(async () => Number(await page.locator('.unified-map-body').getAttribute('data-map-zoom')))
    .toBeLessThan(9)
})
test('傾斜及俯視切換保留畫布', async ({ page }) => {
  const canvas = await page.locator('.maplibregl-canvas').elementHandle()
  await page.getByRole('button', { name: '俯視', exact: true }).click()
  await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-pitch', '0')
  await page.getByRole('button', { name: '傾斜看建築' }).click()
  await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-pitch', '45')
  expect(await canvas?.evaluate((el) => el.isConnected)).toBe(true)
})

test('舊搜尋回應不蓋掉最新查詢', async ({ page }) => {
  await page.route('**/api/hospital-place-search*', async (r) => {
    await new Promise((resolve) => setTimeout(resolve, 350))
    await r
      .fulfill({
        json: {
          places: [{ id: 'old', name: '舊地點', address: '', longitude: 121.5, latitude: 25 }]
        }
      })
      .catch(() => {})
  })
  const input = page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' })
  await input.fill('第一查詢')
  await page.getByRole('button', { name: '搜尋地點', exact: true }).click()
  await input.fill('統一')
  await page.waitForTimeout(600)
  await expect(page.locator('.unified-place-result')).toHaveCount(0)
  await expect(page.locator('.unified-hospital-result')).toHaveCount(2)
})

test('切回所有縣市會重新涵蓋院所', async ({ page }) => {
  const city = page.getByRole('combobox', { name: '區域與縣市', exact: true })
  await city.selectOption('台北市')
  await expect
    .poll(async () => Number(await page.locator('.unified-map-body').getAttribute('data-map-zoom')))
    .toBeGreaterThan(16)
  await city.selectOption('all')
  await expect
    .poll(async () => Number(await page.locator('.unified-map-body').getAttribute('data-map-zoom')))
    .toBeLessThan(16)
})

test('圖資重試保留原視角且不重建畫布', async ({ page }) => {
  await page.locator('.unified-hospital-result').first().click()
  await expect
    .poll(async () => Number(await page.locator('.unified-map-body').getAttribute('data-map-zoom')))
    .toBeGreaterThan(16)
  const canvas = await page.locator('.maplibregl-canvas').elementHandle()
  const failTiles = (route: any) => route.abort()
  await page.context().route('https://tiles.openfreemap.org/test/**', failTiles)
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: '縮小地圖', exact: true }).click()
    await page.waitForTimeout(300)
  }
  await expect(page.getByRole('button', { name: '重試圖資' })).toBeVisible()
  const zoom = Number(await page.locator('.unified-map-body').getAttribute('data-map-zoom'))
  await page.context().unroute('https://tiles.openfreemap.org/test/**', failTiles)
  await page.getByRole('button', { name: '重試圖資' }).click()
  await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-ready', 'true')
  await expect
    .poll(async () => Number(await page.locator('.unified-map-body').getAttribute('data-map-zoom')))
    .toBeCloseTo(zoom, 1)
  expect(await canvas?.evaluate((el) => el.isConnected)).toBe(true)
})

test('WebGL短暫中斷可以恢復同一畫布', async ({ page }) => {
  const canvas = await page.locator('.maplibregl-canvas').elementHandle()
  await canvas?.evaluate((element: HTMLCanvasElement) => {
    const gl = element.getContext('webgl2')!
    const extension = gl.getExtension('WEBGL_lose_context')!
    extension.loseContext()
    setTimeout(() => extension.restoreContext(), 600)
  })
  await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-recovering', 'true')
  await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-ready', 'true', {
    timeout: 15000
  })
  expect(await canvas?.evaluate((el) => el.isConnected)).toBe(true)
})

test('地點搜尋API拒絕錯誤參數', async ({ request }) => {
  for (const suffix of ['', '?q=a', '?q=a&q=b', `?q=${'a'.repeat(81)}`]) {
    const response = await request.get(`/api/hospital-place-search${suffix}`)
    expect(response.status()).toBe(400)
  }
})

test('點擊院所名稱文字也會開啟資訊', async ({ page }) => {
  await page.locator('.unified-hospital-result').first().click()
  await page.getByRole('button', { name: '關閉院所資訊' }).click()
  await page.waitForTimeout(500)
  const canvas = page.locator('.maplibregl-canvas')
  await canvas.scrollIntoViewIfNeeded()
  const box = (await canvas.boundingBox())!
  // 院所取景會在左側資訊卡留320px、右側留30px，標籤位於點位下方。
  await canvas.click({ position: { x: box.width / 2 + 145 + 35, y: box.height / 2 + 22 } })
  await expect(page.getByRole('complementary', { name: '院所資訊' })).toContainText(
    '統一測試醫院甲'
  )
})

test('樣式載入中斷後可重試且保留院所清單', async ({ page, context }) => {
  const failStyle = (route: any) => route.abort()
  await context.route('https://tiles.openfreemap.org/styles/liberty', failStyle)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: '重新載入地圖', exact: true })).toBeVisible({
    timeout: 20000
  })
  await expect(page.locator('.hosp-list')).toBeVisible()
  await context.unroute('https://tiles.openfreemap.org/styles/liberty', failStyle)
  await page.getByRole('button', { name: '重新載入地圖', exact: true }).click()
  await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-ready', 'true', {
    timeout: 30000
  })
  await expect(page.locator('.maplibregl-canvas')).toHaveCount(1)
})

test('全螢幕仍保留搜尋與院所操作', async ({ page }) => {
  await page.getByRole('button', { name: '展開地圖', exact: true }).click()
  await expect
    .poll(() =>
      page.evaluate(() => document.fullscreenElement?.classList.contains('hospital-unified-map'))
    )
    .toBe(true)
  await expect(page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' })).toBeVisible()
  await page.locator('.unified-hospital-result').first().click()
  await expect(page.getByRole('complementary', { name: '院所資訊' })).toBeVisible()
  await page.getByRole('button', { name: '離開全螢幕', exact: true }).click()
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true)
})

test('位置權限被拒仍可操作地圖與搜尋', async ({ page }) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (_success: any, error: any) => error({ code: 1, message: 'denied' }),
        clearWatch() {},
        watchPosition() {
          return 1
        }
      }
    })
  })
  await page.getByRole('button', { name: '我的位置', exact: true }).click()
  await expect(page.locator('.hospital-unified-map')).toContainText('尚未允許位置權限')
  await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-ready', 'true')
  await page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' }).fill('統一')
  await expect(page.locator('.unified-hospital-result')).toHaveCount(2)
})

test.describe('第二輪狀態與無障礙回歸', () => {
  test('重新載入中變更搜尋時，新結果優先於舊相機位置', async ({ page, context }) => {
    await page.locator('.unified-hospital-result').first().click()
    await page
      .locator('.maplibregl-canvas')
      .evaluate((el: HTMLCanvasElement) =>
        el.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext()
      )
    await expect(page.getByRole('button', { name: '重新載入地圖', exact: true })).toBeVisible({
      timeout: 10000
    })
    await context.route('https://tiles.openfreemap.org/styles/liberty', async (r) => {
      await new Promise((resolve) => setTimeout(resolve, 700))
      await r.fulfill({ json: liberty })
    })
    await page.getByRole('button', { name: '重新載入地圖', exact: true }).click()
    await page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' }).fill('醫院乙')
    await expect(page.getByRole('complementary', { name: '院所資訊' })).toContainText(
      '統一測試醫院乙'
    )
    await expect
      .poll(async () =>
        Number(await page.locator('.unified-map-body').getAttribute('data-map-longitude'))
      )
      .toBeCloseTo(121.49, 4)
  })
  test('同位置超過100間院所的群聚清單不會被截斷', async ({ page }) => {
    const many = Array.from({ length: 130 }, (_, i) => ({
      ...hospitals[0],
      id: `SAME-${i}`,
      name: `同址測試院所${i}`
    }))
    await page.route('**/rest/v1/hospitals*', (r) => r.fulfill({ json: many }))
    await page.evaluate(() => {
      const nuxt = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
        .$nuxt
      void nuxt.callHook('app:data:refresh', ['hospitals-v1'])
    })
    await expect(page.locator('.unified-hospital-result')).toHaveCount(130)
    await page.locator('.unified-hospital-result').first().click()
    const canvas = page.locator('.maplibregl-canvas')
    await canvas.scrollIntoViewIfNeeded()
    await page.waitForTimeout(700)
    const box = (await canvas.boundingBox())!
    await canvas.click({ position: { x: box.width / 2 + 145, y: box.height / 2 } })
    await expect(
      page.getByRole('complementary', { name: '同位置院所' }).getByRole('button')
    ).toHaveCount(131)
  })
  test('院所重讀後資訊卡顯示最新電話，畫布維持原本實例', async ({ page }) => {
    await page.locator('.unified-hospital-result').first().click()
    const canvas = await page.locator('.maplibregl-canvas').elementHandle()
    await page.route('**/rest/v1/hospitals*', (r) =>
      r.fulfill({
        json: hospitals.map((h) => (h.id === 'VECTOR-A' ? { ...h, phone: '02-87654321' } : h))
      })
    )
    await page.evaluate(() => {
      const nuxt = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
        .$nuxt
      void nuxt.callHook('app:data:refresh', ['hospitals-v1'])
    })
    await expect(page.getByRole('complementary', { name: '院所資訊' })).toContainText('02-87654321')
    expect(await canvas?.evaluate((el) => el.isConnected)).toBe(true)
  })
  test('繪圖逾時後恢復時會移除過期錯誤提示', async ({ page }) => {
    await page.locator('.maplibregl-canvas').evaluate((el: HTMLCanvasElement) => {
      const extension = el.getContext('webgl2')!.getExtension('WEBGL_lose_context')!
      extension.loseContext()
      setTimeout(() => extension.restoreContext(), 6500)
    })
    await expect(page.getByRole('button', { name: '重新載入地圖', exact: true })).toBeVisible({
      timeout: 6500
    })
    await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-ready', 'true', {
      timeout: 12000
    })
    await expect(page.getByRole('button', { name: '重新載入地圖', exact: true })).toHaveCount(0)
  })
  test('院所資訊可直接切回結果清單', async ({ page }) => {
    await page.locator('.unified-hospital-result').first().click()
    await page.getByRole('button', { name: '院所與搜尋結果', exact: true }).click()
    await expect(page.locator('.unified-hospital-result')).toHaveCount(3)
    await expect(page.getByRole('complementary', { name: '院所資訊' })).toHaveCount(0)
  })
  test('清除頁首篩選也會清除院所選取', async ({ page }) => {
    await page.locator('.unified-hospital-result').first().click()
    await page.getByRole('button', { name: '清除篩選', exact: true }).click()
    await expect(page.getByRole('complementary', { name: '院所資訊' })).toHaveCount(0)
  })
  test('Ctrl加Home保留瀏覽器原有操作', async ({ page }) => {
    const prevented = await page.locator('.maplibregl-canvas').evaluate((el) => {
      const event = new KeyboardEvent('keydown', {
        key: 'Home',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      })
      el.dispatchEvent(event)
      return event.defaultPrevented
    })
    expect(prevented).toBe(false)
  })
  test('鍵盤選取地標後焦點進入資訊卡，並可返回清單', async ({ page }) => {
    await page.route('**/api/hospital-place-search*', (r) =>
      r.fulfill({
        json: {
          places: [
            { id: '101', name: '台北101', address: '台北市', longitude: 121.565, latitude: 25.034 }
          ]
        }
      })
    )
    await page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' }).fill('台北101')
    await page.getByRole('button', { name: '搜尋地點', exact: true }).click()
    await page.locator('.unified-place-result').focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: '關閉地點資訊' })).toBeFocused()
    await page.getByRole('button', { name: '院所與搜尋結果', exact: true }).click()
    await expect(page.locator('.unified-place-result')).toHaveCount(1)
  })
  test('地圖中斷後手動重載保留地標與相機', async ({ page }) => {
    await page.route('**/api/hospital-place-search*', (r) =>
      r.fulfill({
        json: {
          places: [
            { id: '101', name: '台北101', address: '台北市', longitude: 121.565, latitude: 25.034 }
          ]
        }
      })
    )
    await page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' }).fill('台北101')
    await page.getByRole('button', { name: '搜尋地點', exact: true }).click()
    await page.locator('.unified-place-result').click()
    await expect
      .poll(async () =>
        Number(await page.locator('.unified-map-body').getAttribute('data-map-zoom'))
      )
      .toBeCloseTo(16.8, 1)
    await page
      .locator('.maplibregl-canvas')
      .evaluate((el: HTMLCanvasElement) =>
        el.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext()
      )
    await page.getByRole('button', { name: '重新載入地圖', exact: true }).click({ timeout: 10000 })
    await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-ready', 'true')
    await expect(page.locator('.maplibregl-marker')).toHaveCount(1)
    await expect
      .poll(async () =>
        Number(await page.locator('.unified-map-body').getAttribute('data-map-zoom'))
      )
      .toBeCloseTo(16.8, 1)
  })
})

test.describe('第八輪地標互動提示', () => {
  test.beforeEach(async ({ page, context }, testInfo) => {
    await context.route('https://tiles.openfreemap.org/styles/liberty', (r) =>
      r.fulfill({
        json: {
          version: 8,
          glyphs: liberty.glyphs,
          sources: {
            'poi-probe': {
              type: 'geojson',
              data: {
                type: 'FeatureCollection',
                features: [
                  {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [120.1, 23.69] },
                    properties: testInfo.title.includes('英文備援')
                      ? { name_en: '測試地標' }
                      : { name: '測試地標' }
                  }
                ]
              }
            }
          },
          layers: [
            { id: 'background', type: 'background', paint: { 'background-color': '#ffffff' } },
            {
              id: 'poi-probe-label',
              type: 'symbol',
              source: 'poi-probe',
              layout: {
                'text-field': ['get', 'name'],
                'text-font': ['Noto Sans Regular'],
                'text-size': 20,
                'text-allow-overlap': true
              }
            }
          ]
        }
      })
    )
    await page.route('**/rest/v1/hospitals*', (r) => r.fulfill({ json: [] }))
    await page.goto('/qs', { waitUntil: 'domcontentloaded' })
    await page.getByRole('link', { name: '查找特寵醫院', exact: true }).click()
    await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-ready', 'true', {
      timeout: 45000
    })
    await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-loaded', 'true', {
      timeout: 30000
    })
    if (await page.locator('.unified-map-results').isVisible())
      await page.getByRole('button', { name: '院所與搜尋結果', exact: true }).click()
    await page.route('**/api/hospital-place-search*', (r) =>
      r.fulfill({
        json: {
          places: [
            {
              id: 'probe',
              name: '定位參考點',
              address: '',
              longitude: 120.1,
              latitude: 23.69
            }
          ]
        }
      })
    )
    await page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' }).fill('定位參考點')
    await page.getByRole('button', { name: '搜尋地點', exact: true }).click()
    await page.locator('.unified-place-result').click()
    await expect
      .poll(async () =>
        Number(await page.locator('.unified-map-body').getAttribute('data-map-zoom'))
      )
      .toBeCloseTo(16.8, 1)
    await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-loaded', 'true', {
      timeout: 30000
    })
    await page.getByRole('button', { name: '關閉地點資訊', exact: true }).click()
  })
  async function labelPoint(page: any) {
    const canvas = page.locator('.maplibregl-canvas')
    await canvas.scrollIntoViewIfNeeded()
    const box = (await canvas.boundingBox())!
    const body = page.locator('.unified-map-body')
    const left = Number(await body.getAttribute('data-map-padding-left'))
    const right = Number(await body.getAttribute('data-map-padding-right'))
    return { canvas, box, x: (box.width + left - right) / 2, y: box.height / 2 }
  }
  test('第八輪底圖地標文字可點選', async ({ page }) => {
    const { canvas, x, y } = await labelPoint(page)
    await canvas.click({ position: { x, y } })
    await expect(page.getByRole('complementary', { name: '地點資訊' })).toContainText('測試地標')
  })
  test('第八輪可點選地標具有游標提示且空白處不誤提示', async ({ page }) => {
    const { canvas, box, x, y } = await labelPoint(page)
    await page.mouse.move(box.x + x, box.y + y)
    await expect(canvas).toHaveCSS('cursor', 'pointer')
    await page.mouse.move(box.x + box.width - 130, box.y + box.height - 100)
    await expect(canvas).not.toHaveCSS('cursor', 'pointer')
  })
  test.describe('觸控', () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    test('第八輪手機可點選只有英文備援欄位的地標', async ({ page }) => {
      const { box, x, y } = await labelPoint(page)
      await page.touchscreen.tap(box.x + x, box.y + y)
      await expect(page.getByRole('complementary', { name: '地點資訊' })).toContainText('測試地標')
    })
  })
})

test.describe('第七輪版面與資料交錯', () => {
  test.describe('一般動畫', () => {
    test.use({ reducedMotion: 'no-preference' })
    test('第七輪定位途中縮窄版面仍抵達院所', async ({ page }) => {
      await page.evaluate(async () => {
        ;(document.querySelector('.unified-hospital-result') as HTMLButtonElement).click()
        await Promise.resolve()
        await Promise.resolve()
      })
      await page.setViewportSize({ width: 700, height: 844 })
      await expect(page.getByRole('complementary', { name: '院所資訊' })).toContainText(
        '統一測試醫院甲'
      )
      await expect
        .poll(async () =>
          Number(await page.locator('.unified-map-body').getAttribute('data-map-longitude'))
        )
        .toBeCloseTo(121.513, 4)
      await expect
        .poll(async () =>
          Number(await page.locator('.unified-map-body').getAttribute('data-map-zoom'))
        )
        .toBeCloseTo(16.5, 1)
    })
  })
  const sameLocation = [0, 1].map((i) => ({
    ...hospitals[0],
    id: `GROUP-${i}`,
    name: `同址院所${i}`
  }))
  async function refreshDirectory(page: any) {
    await page.evaluate(() => {
      const nuxt = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
        .$nuxt
      void nuxt.callHook('app:data:refresh', ['hospitals-v1'])
    })
  }
  async function openGroup(page: any) {
    await page.route('**/rest/v1/hospitals*', (r: any) => r.fulfill({ json: sameLocation }))
    await refreshDirectory(page)
    await expect(page.locator('.unified-hospital-result')).toHaveCount(2)
    await page.locator('.unified-hospital-result').first().click()
    const canvas = page.locator('.maplibregl-canvas')
    await canvas.scrollIntoViewIfNeeded()
    await expect
      .poll(async () =>
        Number(await page.locator('.unified-map-body').getAttribute('data-map-zoom'))
      )
      .toBeCloseTo(16.5, 1)
    await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-loaded', 'true')
    const box = (await canvas.boundingBox())!
    await canvas.click({ position: { x: box.width / 2 + 145, y: box.height / 2 } })
    await expect(page.getByRole('complementary', { name: '同位置院所' })).toContainText('同址院所1')
  }
  test('第七輪切換收藏不關閉同位置院所清單', async ({ page }) => {
    await openGroup(page)
    await page
      .getByRole('button', { name: '收藏 同址院所0', exact: true })
      .evaluate((el: HTMLButtonElement) => el.click())
    await expect(
      page.getByRole('button', { name: '取消收藏 同址院所0', exact: true })
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('complementary', { name: '同位置院所' })).toContainText('同址院所1')
  })
  test('第七輪名錄更新保留同位置清單並更新名稱', async ({ page }) => {
    await openGroup(page)
    await page.route('**/rest/v1/hospitals*', (r) =>
      r.fulfill({ json: sameLocation.map((h) => ({ ...h, name: `${h.name}新名稱` })) })
    )
    await refreshDirectory(page)
    await expect(page.getByRole('complementary', { name: '同位置院所' })).toContainText(
      '同址院所1新名稱'
    )
  })
  test('第七輪院所座標變更後不保留舊同位置清單', async ({ page }) => {
    await openGroup(page)
    await page.route('**/rest/v1/hospitals*', (r) =>
      r.fulfill({
        json: sameLocation.map((h, index) => (index ? { ...h, longitude: 121.6 } : h))
      })
    )
    await refreshDirectory(page)
    await expect(page.getByRole('complementary', { name: '同位置院所' })).toHaveCount(0)
    await expect(page.getByRole('complementary', { name: '院所資訊' })).toContainText('同址院所0')
  })
})

test.describe('第六輪操作中斷', () => {
  test.use({ reducedMotion: 'no-preference' })
  test('第六輪手動移動後切背景不回到舊院所', async ({ page }) => {
    await page.locator('.unified-hospital-result').first().click()
    const body = page.locator('.unified-map-body')
    await expect
      .poll(async () => Number(await body.getAttribute('data-map-zoom')))
      .toBeCloseTo(16.5, 1)
    await page.locator('.maplibregl-canvas').press('ArrowRight')
    await expect
      .poll(async () => Math.abs(Number(await body.getAttribute('data-map-longitude')) - 121.513))
      .toBeGreaterThan(0.0001)
    await page.waitForTimeout(650)
    const longitude = Number(await body.getAttribute('data-map-longitude'))
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
      document.dispatchEvent(new Event('visibilitychange'))
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect
      .poll(async () => Number(await body.getAttribute('data-map-longitude')))
      .toBeCloseTo(longitude, 5)
  })
  test('第六輪地標定位動畫切到背景仍保留目的地', async ({ page }) => {
    await page.route('**/api/hospital-place-search*', (r) =>
      r.fulfill({
        json: {
          places: [
            { id: '101', name: '台北101', address: '台北市', longitude: 121.565, latitude: 25.034 }
          ]
        }
      })
    )
    await page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' }).fill('台北101')
    await page.getByRole('button', { name: '搜尋地點', exact: true }).click()
    await expect(page.locator('.unified-place-result')).toHaveCount(1)
    await page.evaluate(async () => {
      ;(document.querySelector('.unified-place-result') as HTMLButtonElement).click()
      await Promise.resolve()
      await Promise.resolve()
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
      document.dispatchEvent(new Event('visibilitychange'))
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect(page.getByRole('complementary', { name: '地點資訊' })).toContainText('台北101')
    await expect
      .poll(async () =>
        Number(await page.locator('.unified-map-body').getAttribute('data-map-longitude'))
      )
      .toBeCloseTo(121.565, 4)
    await expect
      .poll(async () =>
        Number(await page.locator('.unified-map-body').getAttribute('data-map-zoom'))
      )
      .toBeCloseTo(16.8, 1)
  })
  test('第六輪切到背景再回來仍抵達選取院所', async ({ page }) => {
    await page.evaluate(async () => {
      ;(document.querySelector('.unified-hospital-result') as HTMLButtonElement).click()
      await Promise.resolve()
      await Promise.resolve()
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.waitForTimeout(650)
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect
      .poll(async () =>
        Number(await page.locator('.unified-map-body').getAttribute('data-map-longitude'))
      )
      .toBeCloseTo(121.513, 4)
    await expect
      .poll(async () =>
        Number(await page.locator('.unified-map-body').getAttribute('data-map-zoom'))
      )
      .toBeCloseTo(16.5, 1)
  })
  test.describe('手機', () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    test('第六輪定位動畫途中收起重開仍抵達院所', async ({ page }) => {
      await page.getByRole('button', { name: '院所與搜尋結果', exact: true }).click()
      await page.evaluate(async () => {
        ;(document.querySelector('.unified-hospital-result') as HTMLButtonElement).click()
        await Promise.resolve()
        await Promise.resolve()
        const close = [...document.querySelectorAll('button')].find(
          (el) => el.textContent?.trim() === '收起地圖'
        )
        close?.click()
      })
      await expect(page.locator('.maplibregl-canvas')).toHaveCount(0)
      await page.getByRole('button', { name: '查看地圖', exact: true }).click()
      await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-ready', 'true')
      await expect(page.getByRole('complementary', { name: '院所資訊' })).toContainText(
        '統一測試醫院甲'
      )
      await expect
        .poll(async () =>
          Number(await page.locator('.unified-map-body').getAttribute('data-map-longitude'))
        )
        .toBeCloseTo(121.513, 4)
      await expect
        .poll(async () =>
          Number(await page.locator('.unified-map-body').getAttribute('data-map-zoom'))
        )
        .toBeCloseTo(16.5, 1)
    })
  })
})

test.describe('第五輪視角與搜尋資料', () => {
  test.describe('一般動畫', () => {
    test.use({ reducedMotion: 'no-preference' })
    test('第五輪過期定位不打斷正在前往新院所的動畫', async ({ page }) => {
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'geolocation', {
          configurable: true,
          value: {
            getCurrentPosition: (success: any) => {
              ;(window as any).releaseHospitalPosition = () =>
                success({
                  coords: {
                    longitude: 121.55,
                    latitude: 25.05,
                    accuracy: 20,
                    altitude: null,
                    altitudeAccuracy: null,
                    heading: null,
                    speed: null
                  },
                  timestamp: Date.now()
                })
            },
            watchPosition() {
              return 1
            },
            clearWatch() {}
          }
        })
      })
      await page.getByRole('button', { name: '我的位置', exact: true }).click()
      await page.locator('.unified-hospital-result').first().click()
      await page.evaluate(() => (window as any).releaseHospitalPosition())
      await expect
        .poll(async () =>
          Number(await page.locator('.unified-map-body').getAttribute('data-map-longitude'))
        )
        .toBeCloseTo(121.513, 4)
      await expect
        .poll(async () =>
          Number(await page.locator('.unified-map-body').getAttribute('data-map-zoom'))
        )
        .toBeCloseTo(16.5, 1)
    })
  })
  test('第五輪連續選取院所不殘留舊資訊與位置', async ({ page }) => {
    for (const [index, name] of ['乙', '甲', '乙'].entries()) {
      if (index) await page.getByRole('button', { name: '院所與搜尋結果', exact: true }).click()
      await page
        .locator('.unified-hospital-result')
        .filter({ hasText: `統一測試醫院${name}` })
        .click()
      await expect(page.getByRole('complementary', { name: '院所資訊' })).toContainText(
        `統一測試醫院${name}`
      )
    }
    await expect(
      page.getByRole('complementary', { name: '院所資訊' }).getByRole('link', { name: '撥打電話' })
    ).toHaveAttribute('href', 'tel:0222345678')
    await expect
      .poll(async () =>
        Number(await page.locator('.unified-map-body').getAttribute('data-map-longitude'))
      )
      .toBeCloseTo(121.49, 4)
  })
  test('第五輪較晚定位不蓋掉後來的搜尋取景', async ({ page }) => {
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition: (success: any) => {
            ;(window as any).releaseHospitalPosition = () =>
              success({
                coords: {
                  longitude: 121.55,
                  latitude: 25.05,
                  accuracy: 20,
                  altitude: null,
                  altitudeAccuracy: null,
                  heading: null,
                  speed: null
                },
                timestamp: Date.now()
              })
          },
          watchPosition() {
            return 1
          },
          clearWatch() {}
        }
      })
    })
    await page.getByRole('button', { name: '我的位置', exact: true }).click()
    await page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' }).fill('統一')
    await expect
      .poll(async () =>
        Number(await page.locator('.unified-map-body').getAttribute('data-map-zoom'))
      )
      .toBeGreaterThan(12)
    const before = Number(
      await page.locator('.unified-map-body').getAttribute('data-map-longitude')
    )
    await page.evaluate(() => (window as any).releaseHospitalPosition())
    await page.waitForTimeout(400)
    expect(
      Number(await page.locator('.unified-map-body').getAttribute('data-map-longitude'))
    ).toBeCloseTo(before, 4)
  })
  test('第五輪重設視角移除側欄留下的不對稱空間', async ({ page }) => {
    await page.locator('.unified-hospital-result').first().click()
    await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-padding-left', '320')
    await page.getByRole('button', { name: '重設視角', exact: true }).click()
    await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-padding-left', '60')
    await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-padding-right', '60')
  })
  test('第五輪關閉卡片後顯示院所會重新居中', async ({ page }) => {
    await page.locator('.unified-hospital-result').first().click()
    await page.getByRole('button', { name: '關閉院所資訊', exact: true }).click()
    await page.getByRole('button', { name: '顯示院所', exact: true }).click()
    await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-padding-left', '55')
    await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-padding-right', '55')
  })
  test('第五輪異常搜尋回應後仍能重試並定位', async ({ page }) => {
    await page.route('**/api/hospital-place-search*', (r) => r.fulfill({ json: { places: {} } }))
    await page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' }).fill('台北101')
    await page.getByRole('button', { name: '搜尋地點', exact: true }).click()
    await expect(page.locator('.unified-map-results')).toContainText('地點搜尋暫時無法使用')
    await page.route('**/api/hospital-place-search*', (r) =>
      r.fulfill({
        json: {
          places: [
            { id: '101', name: '台北101', address: '台北市', longitude: 121.565, latitude: 25.034 }
          ]
        }
      })
    )
    await page.getByRole('button', { name: '搜尋地點', exact: true }).click()
    await page.locator('.unified-place-result').click()
    await expect(page.getByRole('complementary', { name: '地點資訊' })).toContainText('台北101')
  })
  test('第五輪合法零筆回應保持正確提示', async ({ page }) => {
    await page.route('**/api/hospital-place-search*', (r) => r.fulfill({ json: { places: [] } }))
    await page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' }).fill('沒有地標')
    await page.getByRole('button', { name: '搜尋地點', exact: true }).click()
    await expect(page.getByText('沒有符合的開放地標資料。', { exact: true })).toBeVisible()
    await expect(
      page.getByText('地點搜尋暫時無法使用，院所篩選仍可操作。', { exact: true })
    ).toHaveCount(0)
  })
  test('第五輪地標回應格式異常不讓頁面崩潰', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.route('**/api/hospital-place-search*', (r) => r.fulfill({ json: { places: null } }))
    await page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' }).fill('台北101')
    await page.getByRole('button', { name: '搜尋地點', exact: true }).click()
    await expect(page.locator('.unified-map-results')).toContainText('地點搜尋暫時無法使用')
    expect(errors).toEqual([])
    await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-ready', 'true')
  })
  test('第五輪地標異常座標不會成為可點選結果', async ({ page }) => {
    await page.route('**/api/hospital-place-search*', (r) =>
      r.fulfill({
        json: {
          places: [
            { id: 'bad', name: '異常地標', address: '', longitude: '121.56', latitude: 25.03 }
          ]
        }
      })
    )
    await page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' }).fill('台北101')
    await page.getByRole('button', { name: '搜尋地點', exact: true }).click()
    await expect(page.locator('.unified-map-results')).toContainText('地點搜尋暫時無法使用')
    await expect(page.locator('.unified-place-result')).toHaveCount(0)
  })
  test('第五輪我的位置不被排程中的搜尋取景拉走', async ({ page }) => {
    await expect(page.getByRole('button', { name: '我的位置', exact: true })).toBeEnabled()
    await page.evaluate(async () => {
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition: (success: any) =>
            success({
              coords: {
                longitude: 121.55,
                latitude: 25.05,
                accuracy: 20,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null
              },
              timestamp: Date.now()
            }),
          watchPosition() {
            return 1
          },
          clearWatch() {}
        }
      })
      const input = document.querySelector<HTMLInputElement>('#hospital-unified-search')!
      input.value = '統一'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      await Promise.resolve()
      document.querySelector<HTMLButtonElement>('.maplibregl-ctrl-geolocate')!.click()
    })
    await page.waitForTimeout(650)
    await expect
      .poll(async () =>
        Number(await page.locator('.unified-map-body').getAttribute('data-map-longitude'))
      )
      .toBeCloseTo(121.55, 4)
  })
})

test.describe('第四輪鍵盤與中斷處理', () => {
  test('第四輪鍵盤重試圖資後焦點回到可操作地圖', async ({ page, context }) => {
    await page.locator('.unified-hospital-result').first().click()
    const failTiles = (r: any) => r.abort()
    await context.route('https://tiles.openfreemap.org/test/**', failTiles)
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: '縮小地圖', exact: true }).click()
      await page.waitForTimeout(300)
    }
    const retry = page.getByRole('button', { name: '重試圖資', exact: true })
    await expect(retry).toBeVisible()
    await context.unroute('https://tiles.openfreemap.org/test/**', failTiles)
    await retry.focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('.maplibregl-canvas')).toBeFocused()
  })
  test('第四輪地標卡內Escape可返回地圖且標記名稱正確', async ({ page }) => {
    await page.route('**/api/hospital-place-search*', (r) =>
      r.fulfill({
        json: {
          places: [
            { id: '101', name: '台北101', address: '台北市', longitude: 121.565, latitude: 25.034 }
          ]
        }
      })
    )
    await page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' }).fill('台北101')
    await page.getByRole('button', { name: '搜尋地點', exact: true }).click()
    await page.locator('.unified-place-result').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('.maplibregl-marker')).toHaveAttribute('aria-label', '台北101')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('complementary', { name: '地點資訊' })).toHaveCount(0)
    await expect(page.locator('.maplibregl-canvas')).toBeFocused()
  })
  test('第四輪中斷失敗焦點移往重試，鍵盤重試後可繼續操作', async ({ page }) => {
    await page.locator('.maplibregl-canvas').focus()
    await page
      .locator('.maplibregl-canvas')
      .evaluate((el: HTMLCanvasElement) =>
        el.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext()
      )
    const retry = page.getByRole('button', { name: '重新載入地圖', exact: true })
    await expect(retry).toBeFocused({ timeout: 10000 })
    await page.keyboard.press('Enter')
    await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-ready', 'true')
    await expect(page.locator('.maplibregl-canvas')).toBeFocused()
  })
  test('第四輪恢復地圖不搶走搜尋欄焦點', async ({ page }) => {
    await page.locator('.maplibregl-canvas').focus()
    await page.locator('.maplibregl-canvas').evaluate((el: HTMLCanvasElement) => {
      const extension = el.getContext('webgl2')!.getExtension('WEBGL_lose_context')!
      extension.loseContext()
      setTimeout(() => extension.restoreContext(), 6500)
    })
    const search = page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' })
    await search.focus()
    await expect(page.getByRole('button', { name: '重新載入地圖', exact: true })).toBeVisible({
      timeout: 6500
    })
    await expect(search).toBeFocused()
    await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-ready', 'true', {
      timeout: 12000
    })
    await expect(search).toBeFocused()
  })
  test('第四輪樣式錯誤可重試恢復且沒有殘留遮罩', async ({ page, context }) => {
    const invalid = (r: any) => r.fulfill({ json: { ...liberty, version: 7 } })
    await context.route('https://tiles.openfreemap.org/styles/liberty', invalid)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: '重新載入地圖', exact: true })).toBeVisible({
      timeout: 15000
    })
    await context.unroute('https://tiles.openfreemap.org/styles/liberty', invalid)
    await page.getByRole('button', { name: '重新載入地圖', exact: true }).click()
    await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-ready', 'true')
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(page.getByRole('button', { name: '放大地圖', exact: true })).toBeEnabled()
  })
  test('第四輪資訊卡內Escape關閉院所並返回地圖焦點', async ({ page }) => {
    await page.locator('.unified-hospital-result').first().focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: '關閉院所資訊' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('complementary', { name: '院所資訊' })).toHaveCount(0)
    await expect(page.locator('.maplibregl-canvas')).toBeFocused()
  })
  test('第四輪結果清單內Escape可以收起清單', async ({ page }) => {
    await page.locator('.unified-hospital-result').first().focus()
    await page.keyboard.press('Escape')
    await expect(page.locator('.unified-map-results')).toHaveCount(0)
    await expect(page.locator('.maplibregl-canvas')).toBeFocused()
  })
  test('第四輪繪圖中斷不讓隱藏控制繼續取得焦點', async ({ page }) => {
    await page
      .locator('.maplibregl-canvas')
      .evaluate((el: HTMLCanvasElement) =>
        el.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext()
      )
    await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-recovering', 'true')
    await expect(page.getByRole('button', { name: '放大地圖', exact: true })).toHaveCount(0)
    const zoom = page.locator('.maplibregl-ctrl-zoom-in')
    await zoom.evaluate((el: HTMLButtonElement) => el.focus())
    await expect(zoom).not.toBeFocused()
  })
  test('第四輪無效樣式不永久停在載入中', async ({ page, context }) => {
    await context.route('https://tiles.openfreemap.org/styles/liberty', (r) =>
      r.fulfill({ json: { ...liberty, version: 7 } })
    )
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: '重新載入地圖', exact: true })).toBeVisible({
      timeout: 15000
    })
  })
  test('第四輪離線仍可篩選且有明確提示', async ({ page, context }) => {
    await context.setOffline(true)
    await expect(page.locator('.hospital-unified-map')).toContainText('目前離線')
    await page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' }).fill('統一')
    await expect(page.locator('.unified-hospital-result')).toHaveCount(2)
    await expect(page.getByRole('button', { name: '搜尋地點', exact: true })).toBeDisabled()
    await context.setOffline(false)
    await expect(page.getByRole('button', { name: '搜尋地點', exact: true })).toBeEnabled()
  })
  test('第四輪圖資來源控制採中文名稱', async ({ page }) => {
    await expect(page.getByLabel('顯示圖資來源', { exact: true })).toBeVisible()
  })
})

test.describe('第三輪操作連續性', () => {
  test('第三輪未完成搜尋的站內返回不冒充零結果', async ({ page }) => {
    let release!: () => void
    const responseGate = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route('**/api/hospital-place-search*', async (r) => {
      await responseGate
      await r.fulfill({ json: { places: [] } }).catch(() => {})
    })
    await page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' }).fill('台北101')
    await page.getByRole('button', { name: '搜尋地點', exact: true }).click()
    await page.evaluate(() => {
      const nuxt = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
        .$nuxt
      return nuxt.$router.push('/qs')
    })
    await page.getByRole('link', { name: '查找特寵醫院', exact: true }).click()
    await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-ready', 'true')
    await expect(page.getByText('沒有符合的開放地標資料。', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '搜尋地點', exact: true })).toBeEnabled()
    release()
  })
  test('第三輪地標可直接重新定位且導航觸控高度足夠', async ({ page }) => {
    await page.route('**/api/hospital-place-search*', (r) =>
      r.fulfill({
        json: {
          places: [
            { id: '101', name: '台北101', address: '台北市', longitude: 121.565, latitude: 25.034 }
          ]
        }
      })
    )
    await page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' }).fill('台北101')
    await page.getByRole('button', { name: '搜尋地點', exact: true }).click()
    await page.locator('.unified-place-result').click()
    const card = page.getByRole('complementary', { name: '地點資訊' })
    expect(
      (await card.getByRole('link', { name: '導航 ↗' }).boundingBox())!.height
    ).toBeGreaterThanOrEqual(44)
    await page.locator('.maplibregl-canvas').focus()
    await page.keyboard.press('ArrowRight')
    await card.getByRole('button', { name: '重新定位', exact: true }).click()
    await expect
      .poll(async () =>
        Number(await page.locator('.unified-map-body').getAttribute('data-map-longitude'))
      )
      .toBeCloseTo(121.565, 4)
  })
  test('第三輪空院所名錄仍保留底圖與地點搜尋', async ({ page }) => {
    const canvas = await page.locator('.maplibregl-canvas').elementHandle()
    await page.route('**/rest/v1/hospitals*', (r) => r.fulfill({ json: [] }))
    await page.evaluate(() => {
      const nuxt = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
        .$nuxt
      void nuxt.callHook('app:data:refresh', ['hospitals-v1'])
    })
    await expect(page.locator('.hosp-card')).toHaveCount(0)
    await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-ready', 'true')
    expect(await canvas?.evaluate((el) => el.isConnected)).toBe(true)
    await expect(page.locator('.unified-hospital-result')).toHaveCount(0)
    await expect(page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' })).toBeVisible()
  })
  test('第三輪搜尋中主動收起結果後不被較晚回應打開', async ({ page }) => {
    let release!: () => void
    const responseGate = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route('**/api/hospital-place-search*', async (r) => {
      await responseGate
      await r.fulfill({
        json: {
          places: [
            { id: '101', name: '台北101', address: '台北市', longitude: 121.565, latitude: 25.034 }
          ]
        }
      })
    })
    await page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' }).fill('台北101')
    await page.getByRole('button', { name: '搜尋地點', exact: true }).click()
    await page.getByRole('button', { name: '院所與搜尋結果', exact: true }).click()
    release()
    await expect(page.getByRole('button', { name: '搜尋地點', exact: true })).toBeEnabled()
    await expect(page.locator('.unified-map-results')).toHaveCount(0)
    await page.getByRole('button', { name: '院所與搜尋結果', exact: true }).click()
    await expect(page.locator('.unified-place-result')).toHaveCount(1)
  })
  test('第三輪點擊地圖空白處優先於尚未執行的搜尋取景', async ({ page }) => {
    const before = Number(await page.locator('.unified-map-body').getAttribute('data-map-zoom'))
    await page.evaluate(async () => {
      const input = document.querySelector<HTMLInputElement>('#hospital-unified-search')!
      input.value = '統一'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      await Promise.resolve()
      const canvas = document.querySelector<HTMLCanvasElement>('.maplibregl-canvas')!
      const box = canvas.getBoundingClientRect()
      canvas.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          clientX: box.right - 100,
          clientY: box.top + box.height * 0.35
        })
      )
    })
    await page.waitForTimeout(600)
    await expect(page.getByRole('complementary', { name: '地點資訊' })).toHaveCount(0)
    expect(
      Number(await page.locator('.unified-map-body').getAttribute('data-map-zoom'))
    ).toBeCloseTo(before, 1)
  })
  test('第三輪桌面縮窄後點位仍位於可操作中央', async ({ page }) => {
    await page.locator('.unified-hospital-result').first().click()
    await expect
      .poll(async () =>
        Number(await page.locator('.unified-map-body').getAttribute('data-map-longitude'))
      )
      .toBeCloseTo(121.513, 4)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: '關閉院所資訊' }).click()
    const canvas = page.locator('.maplibregl-canvas')
    await canvas.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    const box = (await canvas.boundingBox())!
    await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } })
    await expect(page.getByRole('complementary', { name: '院所資訊' })).toContainText(
      '統一測試醫院甲'
    )
  })
  test('站內往返保留地標與搜尋結果', async ({ page }) => {
    await page.route('**/api/hospital-place-search*', (r) =>
      r.fulfill({
        json: {
          places: [
            { id: '101', name: '台北101', address: '台北市', longitude: 121.565, latitude: 25.034 }
          ]
        }
      })
    )
    await page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' }).fill('台北101')
    await page.getByRole('button', { name: '搜尋地點', exact: true }).click()
    await page.locator('.unified-place-result').click()
    await page.evaluate(() => {
      const nuxt = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
        .$nuxt
      return nuxt.$router.push('/qs')
    })
    await page.getByRole('link', { name: '查找特寵醫院', exact: true }).click()
    await expect(page.getByRole('complementary', { name: '地點資訊' })).toContainText('台北101')
    await expect(page.locator('.maplibregl-marker')).toHaveCount(1)
    await page.getByRole('button', { name: '院所與搜尋結果', exact: true }).click()
    await expect(page.locator('.unified-place-result')).toHaveCount(1)
  })
})

test.describe('觸控手機', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  test('第五輪手機重設視角沒有殘留資訊卡留白', async ({ page }) => {
    await page.getByRole('button', { name: '院所與搜尋結果', exact: true }).click()
    await page.locator('.unified-hospital-result').first().click()
    await page.getByRole('button', { name: '重設視角', exact: true }).click()
    await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-padding-left', '28')
    await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-padding-right', '28')
    await expect
      .poll(async () =>
        Number(await page.locator('.unified-map-body').getAttribute('data-map-zoom'))
      )
      .toBeLessThan(9)
  })
  test('第三輪新選院所優先於收起前保存的位置', async ({ page }) => {
    await page.getByRole('button', { name: '院所與搜尋結果', exact: true }).click()
    await page.locator('.unified-hospital-result').first().click()
    await page.getByRole('button', { name: '收起地圖', exact: true }).click()
    const card = page.locator('.hosp-card').filter({ hasText: '統一測試醫院乙' })
    await card.locator('.hosp-header-toggle').click()
    await card.locator('.hosp-map-focus').click()
    await expect(page.getByRole('complementary', { name: '院所資訊' })).toContainText(
      '統一測試醫院乙'
    )
    await expect
      .poll(async () =>
        Number(await page.locator('.unified-map-body').getAttribute('data-map-longitude'))
      )
      .toBeCloseTo(121.49, 4)
  })
  test('第三輪收起地圖後清除篩選不還原舊地標', async ({ page }) => {
    await page.route('**/api/hospital-place-search*', (r) =>
      r.fulfill({
        json: {
          places: [
            { id: '101', name: '台北101', address: '台北市', longitude: 121.565, latitude: 25.034 }
          ]
        }
      })
    )
    await page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' }).fill('台北101')
    await page.getByRole('button', { name: '搜尋地點', exact: true }).click()
    await page.locator('.unified-place-result').click()
    await page.getByRole('button', { name: '收起地圖', exact: true }).click()
    await page
      .getByRole('complementary', { name: '醫院篩選條件' })
      .getByRole('button', { name: '清除篩選', exact: true })
      .click()
    await page.getByRole('button', { name: '查看地圖', exact: true }).click()
    await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-ready', 'true')
    await expect(page.getByRole('complementary', { name: '地點資訊' })).toHaveCount(0)
    await expect(page.locator('.maplibregl-marker')).toHaveCount(0)
  })
  test('第三輪手機全螢幕有資訊卡時畫布填滿地圖區', async ({ page }) => {
    await page.getByRole('button', { name: '院所與搜尋結果', exact: true }).click()
    await page.locator('.unified-hospital-result').first().click()
    await page.getByRole('button', { name: '展開地圖', exact: true }).click()
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true)
    await expect
      .poll(async () => {
        const canvas = (await page.locator('.maplibregl-canvas').boundingBox())!
        const body = (await page.locator('.unified-map-body').boundingBox())!
        return Math.abs(canvas.height - (body.height - 2))
      })
      .toBeLessThan(2)
  })
  test('第三輪手機收起再開啟保留地標與視角', async ({ page }) => {
    await page.route('**/api/hospital-place-search*', (r) =>
      r.fulfill({
        json: {
          places: [
            { id: '101', name: '台北101', address: '台北市', longitude: 121.565, latitude: 25.034 }
          ]
        }
      })
    )
    await page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' }).fill('台北101')
    await page.getByRole('button', { name: '搜尋地點', exact: true }).click()
    await page.locator('.unified-place-result').click()
    await expect
      .poll(async () =>
        Number(await page.locator('.unified-map-body').getAttribute('data-map-longitude'))
      )
      .toBeCloseTo(121.565, 4)
    await page.getByRole('button', { name: '收起地圖', exact: true }).click()
    await page.getByRole('button', { name: '查看地圖', exact: true }).click()
    await expect(page.getByRole('complementary', { name: '地點資訊' })).toContainText('台北101')
    await expect(page.locator('.maplibregl-marker')).toHaveCount(1)
    await expect
      .poll(async () =>
        Number(await page.locator('.unified-map-body').getAttribute('data-map-longitude'))
      )
      .toBeCloseTo(121.565, 4)
  })
  test('第三輪橫向手機開啟清單不改變地圖高度', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 })
    const canvas = page.locator('.maplibregl-canvas')
    await page.waitForTimeout(300)
    const before = (await canvas.boundingBox())!.height
    await page.getByRole('button', { name: '院所與搜尋結果', exact: true }).click()
    await expect(page.locator('.unified-hospital-result')).toHaveCount(3)
    await expect.poll(async () => (await canvas.boundingBox())!.height).toBeCloseTo(before, 0)
    expect(before).toBeLessThan(300)
  })
  test('第三輪長地標名稱與地址不溢出手機頁面', async ({ page }) => {
    await page.route('**/api/hospital-place-search*', (r) =>
      r.fulfill({
        json: {
          places: [
            {
              id: 'long',
              name: 'InternationalSpecialAnimalHospital'.repeat(4).slice(0, 120),
              address: 'LongUnbrokenAddress'.repeat(10),
              longitude: 121.565,
              latitude: 25.034
            }
          ]
        }
      })
    )
    await page.getByRole('searchbox', { name: '在地圖搜尋醫院或地標' }).fill('long')
    await page.getByRole('button', { name: '搜尋地點', exact: true }).click()
    await page.locator('.unified-place-result').click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
  test('預設直接載入3D，院所定位與收起重開可用', async ({ page }) => {
    await expect(page.locator('.maplibregl-canvas')).toHaveCount(1)
    expect(
      Number(await page.locator('.unified-map-body').getAttribute('data-map-pitch'))
    ).toBeGreaterThan(0)
    await page.getByRole('button', { name: '院所與搜尋結果' }).click()
    await page.locator('.unified-hospital-result').first().click()
    await expect(page.getByRole('complementary', { name: '院所資訊' })).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true)
    await page.getByRole('button', { name: '收起地圖' }).click()
    await expect(page.locator('.maplibregl-canvas')).toHaveCount(0)
    await page.getByRole('button', { name: '查看地圖', exact: true }).click()
    await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-ready', 'true', {
      timeout: 30000
    })
  })
  test('觸控拖曳與雙指縮放直接操作本圖', async ({ page, context }) => {
    const canvas = page.locator('.maplibregl-canvas')
    await canvas.scrollIntoViewIfNeeded()
    const box = (await canvas.boundingBox())!
    const client = await context.newCDPSession(page)
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2
    const before = Number(await page.locator('.unified-map-body').getAttribute('data-map-zoom'))
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: x - 25, y },
        { x: x + 25, y }
      ]
    })
    for (let i = 1; i <= 8; i++) {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: x - 25 - i * 8, y },
          { x: x + 25 + i * 8, y }
        ]
      })
      await page.waitForTimeout(20)
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect
      .poll(async () =>
        Number(await page.locator('.unified-map-body').getAttribute('data-map-zoom'))
      )
      .toBeGreaterThan(before + 0.5)
    const longitude = Number(
      await page.locator('.unified-map-body').getAttribute('data-map-longitude')
    )
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    for (let i = 1; i <= 5; i++) {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x + i * 10, y }]
      })
      await page.waitForTimeout(20)
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect
      .poll(async () =>
        Math.abs(
          Number(await page.locator('.unified-map-body').getAttribute('data-map-longitude')) -
            longitude
        )
      )
      .toBeGreaterThan(0.0001)
  })
})
