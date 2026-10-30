import { test, expect } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
const style = JSON.parse(
  readFileSync(new URL('../fixtures/openfreemap-liberty.json', import.meta.url), 'utf8')
)
const tile = readFileSync(new URL('../fixtures/hospital-buildings-kinmen.pbf', import.meta.url))
const hospitals = [
  {
    id: 'SIDE-A',
    name: '測試醫院甲',
    city: '台北市',
    district: '大同區',
    address: '測試路1號',
    phone: '02-12345678',
    longitude: 121.513,
    latitude: 25.063
  },
  {
    id: 'SIDE-B',
    name: '測試醫院乙',
    city: '新北市',
    district: '三重區',
    address: '測試路2號',
    phone: '02-22345678',
    longitude: 121.49,
    latitude: 25.064
  },
  {
    id: 'SIDE-C',
    name: '尚待定位醫院',
    city: '台北市',
    district: '大同區',
    address: '測試路3號',
    phone: '02-32345678',
    longitude: null,
    latitude: null
  }
]
test.setTimeout(90000)
test.use({ reducedMotion: 'reduce', serviceWorkers: 'block' })
test.beforeEach(async ({ page, context }, testInfo) => {
  if (testInfo.title.includes('過期群聚'))
    await page.addInitScript(() => {
      const original = Worker.prototype.postMessage
      Worker.prototype.postMessage = function (message: any, ...rest: any[]) {
        if (message?.type === 'GCEZ' && message?.data?.source === 'gencko-hospitals') {
          ;(window as any).releaseHospitalCluster = () =>
            original.apply(this, [message, ...rest] as any)
          return
        }
        return original.apply(this, [message, ...rest] as any)
      }
    })

  if (testInfo.title.includes('延遲定位'))
    await page.addInitScript(() => {
      navigator.geolocation.getCurrentPosition = (success) => {
        ;(window as any).releaseHospitalLocation = success
      }
    })

  if (testInfo.title.includes('避免重建'))
    await page.addInitScript(() => {
      const original = Worker.prototype.postMessage
      ;(window as any).hospitalSourceUpdates = 0
      Worker.prototype.postMessage = function (message: any, ...rest: any[]) {
        if (message?.type === 'LD' && message?.data?.source === 'gencko-hospitals')
          (window as any).hospitalSourceUpdates++
        return original.apply(this, [message, ...rest] as any)
      }
    })
  await context.route('https://tiles.openfreemap.org/styles/liberty', async (r) => {
    if (testInfo.title.includes('慢速載入'))
      await new Promise((resolve) => setTimeout(resolve, 4000))
    return testInfo.title.includes('圖資失敗') ? r.abort() : r.fulfill({ json: style })
  })
  await context.route('https://tiles.openfreemap.org/planet', (r) =>
    r.fulfill({
      json: {
        tilejson: '3.0.0',
        attribution: 'OpenFreeMap',
        tiles: ['https://tiles.openfreemap.org/side/{z}/{x}/{y}.pbf'],
        minzoom: 0,
        maxzoom: 14
      }
    })
  )
  await context.route('https://tiles.openfreemap.org/side/**', (r) =>
    testInfo.title.includes('部分圖資重試')
      ? r.abort()
      : r.fulfill({ body: tile, contentType: 'application/x-protobuf' })
  )
  await page.route('**/rest/v1/hospitals*', (r) => r.fulfill({ json: hospitals }))
  await page.route('**/api/hospital-place-search*', (r) => r.fulfill({ json: { places: [] } }))
  await page.goto('/qs', { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForFunction(() => {
    const nuxt = (document.querySelector('#__nuxt') as any)?.__vue_app__?.config?.globalProperties
      ?.$nuxt
    return nuxt && !nuxt.isHydrating
  })
  await page.getByRole('link', { name: '查找特寵醫院', exact: true }).click()
  await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as any)?.__vue_app__)
  // 確認預載資料也經過此瀏覽器的隔離回應，不沿用伺服器名錄快取。
  await page.evaluate(async () => {
    const nuxt = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
      .$nuxt
    await nuxt.callHook('app:data:refresh', ['hospitals-v1'])
  })
  if (testInfo.title.includes('慢速載入')) return
  if (testInfo.title.includes('圖資失敗'))
    await expect(page.getByText('地圖暫時無法載入', { exact: true })).toBeVisible()
  else
    await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-ready', 'true', {
      timeout: 45000
    })
})
async function visibleCount(page: any, count: number) {
  await expect(page.locator('.unified-map-body')).toHaveAttribute(
    'data-visible-hospital-count',
    String(count),
    { timeout: 15000 }
  )
  await expect(page.locator('.hosp-card')).toHaveCount(count)
  await expect(page.getByTestId('hospital-visible-count')).toHaveText(`畫面內 ${count} 間院所`)
}
async function regionCount(page: any, count: number, label = '台北市') {
  await expect(page.locator('.hosp-card')).toHaveCount(count)
  await expect(page.getByTestId('hospital-visible-count')).toHaveText(`${label} ${count} 間院所`)
}
test('初始只有一個搜尋框且不顯示清單，控制位於地圖左側', async ({ page }) => {
  await expect(page.getByLabel('在地圖搜尋醫院或地標', { exact: true })).toHaveCount(1)
  await expect(page.locator('.hosp-card')).toHaveCount(0)
  await expect(page.getByTestId('hospital-visible-count')).toHaveText('畫面內 2 間院所', {
    timeout: 15000
  })
  await expect(page.locator('.unified-map-toolbar')).toHaveCount(0)
  const side = (await page.locator('.unified-map-sidebar').boundingBox())!
  const map = (await page.locator('.unified-map-body').boundingBox())!
  expect(side.x + side.width).toBeLessThanOrEqual(map.x)
  expect(Math.abs(side.y - map.y)).toBeLessThanOrEqual(1)
  expect(Math.abs(side.height - map.height)).toBeLessThanOrEqual(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
test('搜尋後單點與群聚數量對應清單，不混入未定位院所', async ({ page }) => {
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 2)
  await expect(page.locator('.hosp-card')).not.toContainText(['尚待定位醫院'])
  await expect(page.locator('.unified-unlocated summary')).toContainText('1 間尚未定位')
})
test('文字輸入後需搜尋才開啟清單，Enter 可搜尋', async ({ page }) => {
  const search = page.getByLabel('在地圖搜尋醫院或地標', { exact: true })
  await search.fill('醫院甲')
  await expect(page.locator('.hosp-card')).toHaveCount(0)
  await search.press('Enter')
  await visibleCount(page, 1)
  await expect(page.locator('.hosp-card')).toContainText('測試醫院甲')
})
test('縣市與行政區篩選整合側欄並觸發搜尋', async ({ page }) => {
  await page.getByRole('combobox', { name: '區域與縣市' }).selectOption('台北市')
  await regionCount(page, 2)
  await page.getByRole('combobox', { name: '行政區', exact: true }).selectOption('大同區')
  await regionCount(page, 2, '台北市 大同區')
})
test('選縣市與行政區後，放大或切換院所不縮減區域清單', async ({ page }) => {
  await page.route('**/rest/v1/hospitals*', (r) =>
    r.fulfill({
      json: hospitals.map((h) =>
        h.id === 'SIDE-B' ? { ...h, city: '台北市', district: '大同區' } : h
      )
    })
  )
  await page.evaluate(() => {
    const nuxt = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
      .$nuxt
    void nuxt.callHook('app:data:refresh', ['hospitals-v1'])
  })
  await page.getByRole('combobox', { name: '區域與縣市' }).selectOption('台北市')
  await page.getByRole('combobox', { name: '行政區', exact: true }).selectOption('大同區')
  await regionCount(page, 3, '台北市 大同區')
  await page
    .locator('.hosp-card')
    .filter({ hasText: '測試醫院甲' })
    .locator('.hosp-header-toggle')
    .click()
  await expect(page.locator('.unified-map-body')).toHaveAttribute(
    'data-visible-hospital-count',
    '1',
    { timeout: 15000 }
  )
  await regionCount(page, 3, '台北市 大同區')
  await page
    .locator('.hosp-card')
    .filter({ hasText: '測試醫院乙' })
    .locator('.hosp-header-toggle')
    .click()
  await expect(page.getByRole('complementary', { name: '院所資訊' })).toContainText('測試醫院乙')
  await regionCount(page, 3, '台北市 大同區')
})
test('清除關鍵字仍保留縣市內所有符合院所', async ({ page }) => {
  await page.getByRole('combobox', { name: '區域與縣市' }).selectOption('台北市')
  await regionCount(page, 2)
  await page.getByLabel('在地圖搜尋醫院或地標', { exact: true }).fill('醫院甲')
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await regionCount(page, 1)
  await page
    .locator('.unified-map-search')
    .getByRole('button', { name: '清除', exact: true })
    .click()
  await regionCount(page, 2)
})
test('放大至單一院所後清單跟隨畫面，再搜尋可還原', async ({ page }) => {
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 2)
  await page
    .locator('.hosp-card')
    .filter({ hasText: '測試醫院甲' })
    .locator('.hosp-header-toggle')
    .click()
  await visibleCount(page, 1)
  await expect(page.locator('.hosp-card')).toContainText('測試醫院甲')
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 2)
})
test('收藏與只看收藏同步更新地圖與清單', async ({ page }) => {
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 2)
  await page.getByRole('button', { name: '收藏 測試醫院甲', exact: true }).click()
  await page.getByRole('checkbox', { name: /只看收藏/ }).check()
  await visibleCount(page, 1)
  await expect(page.locator('.hosp-card')).toContainText('測試醫院甲')
})
test('移出院所所在範圍後清單與畫面數量歸零', async ({ page }) => {
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 2)
  await page
    .locator('.hosp-card')
    .filter({ hasText: '測試醫院甲' })
    .locator('.hosp-header-toggle')
    .click()
  await visibleCount(page, 1)
  const canvas = page.locator('.maplibregl-canvas')
  await canvas.focus()
  for (let i = 0; i < 5; i++) {
    await canvas.press('ArrowDown')
    await page.waitForTimeout(350)
  }
  await visibleCount(page, 0)
})
test('已搜尋後清除篩選仍保留所有縣市的可見清單', async ({ page }) => {
  await page.getByLabel('在地圖搜尋醫院或地標', { exact: true }).fill('醫院甲')
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 1)
  await page
    .getByRole('complementary', { name: '醫院篩選條件' })
    .getByRole('button', { name: '清除篩選', exact: true })
    .click()
  await visibleCount(page, 2)
  await expect(page.getByLabel('在地圖搜尋醫院或地標', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('在地圖搜尋醫院或地標', { exact: true })).toBeFocused()
})
test('已搜尋後按Esc只關閉資訊，不讓院所清單消失', async ({ page }) => {
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 2)
  await page.locator('.maplibregl-canvas').press('Escape')
  await visibleCount(page, 2)
})
test('所有縣市清除關鍵字不會回到未搜尋而隱藏清單', async ({ page }) => {
  await page.getByLabel('在地圖搜尋醫院或地標', { exact: true }).fill('醫院甲')
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 1)
  await page
    .locator('.unified-map-search')
    .getByRole('button', { name: '清除', exact: true })
    .click()
  await visibleCount(page, 2)
  await expect(page.locator('.unified-search-prompt')).toHaveCount(0)
})
test('地標搜尋不灌入院所數量，仍可定位與導航', async ({ page }) => {
  await page.route('**/api/hospital-place-search*', (r) =>
    r.fulfill({
      json: {
        places: [
          { id: '101', name: '台北101', address: '台北市', longitude: 121.565, latitude: 25.034 }
        ]
      }
    })
  )
  await page.getByLabel('在地圖搜尋醫院或地標', { exact: true }).fill('台北101')
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await page.locator('.unified-place-result').click()
  await visibleCount(page, 0)
  await expect(page.getByRole('complementary', { name: '地點資訊' })).toContainText('台北101')
  await expect(
    page.getByRole('complementary', { name: '地點資訊' }).getByRole('link', { name: '導航 ↗' })
  ).toHaveAttribute('href', /25.034/)
})
test('桌面全螢幕保留左側搜尋與可操作地圖', async ({ page }) => {
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 2)
  await page.getByRole('button', { name: '展開地圖', exact: true }).click()
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true)
  await visibleCount(page, 2)
  const side = (await page.locator('.unified-map-sidebar').boundingBox())!
  const map = (await page.locator('.unified-map-body').boundingBox())!
  expect(side.x + side.width).toBeLessThanOrEqual(map.x)
})
test('圖資失敗仍能搜尋與查看電話，並明確標示替代名錄', async ({ page }) => {
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await expect(page.locator('.hosp-card')).toHaveCount(3)
  await expect(page.getByTestId('hospital-visible-count')).toHaveText('地圖無法顯示，符合條件 3 間')
  await page
    .locator('.hosp-card')
    .filter({ hasText: '測試醫院甲' })
    .locator('.hosp-header-toggle')
    .click()
  await expect(
    page
      .locator('.hosp-card')
      .filter({ hasText: '測試醫院甲' })
      .getByRole('link', { name: '撥打電話', exact: true })
  ).toHaveAttribute('href', 'tel:0212345678')
})
test('離線仍能使用已載入院所的側欄搜尋', async ({ page, context }) => {
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 2)
  await context.setOffline(true)
  await page.getByLabel('在地圖搜尋醫院或地標', { exact: true }).fill('醫院甲')
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 1)
  await expect(page.locator('#hospital-map-offline-note')).toBeVisible()
})
test.describe('手機', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  test('手機直接顯示3D並可展開篩選搜尋，不橫向溢出', async ({ page }) => {
    await expect(page.locator('.hosp-card')).toHaveCount(0)
    await expect(page.locator('.maplibregl-canvas')).toHaveCount(1)
    await page.locator('.hosp-sidebar-filter-details summary').tap()
    await page.getByRole('combobox', { name: '區域與縣市' }).selectOption('台北市')
    await regionCount(page, 2)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(
      Number(await page.locator('.unified-map-body').getAttribute('data-map-pitch'))
    ).toBeGreaterThan(0)
  })
  test('手機點選定位能直接看到地圖並保留院所', async ({ page }) => {
    await page.getByRole('button', { name: '搜尋', exact: true }).tap()
    await visibleCount(page, 2)
    await page
      .locator('.hosp-card')
      .filter({ hasText: '測試醫院甲' })
      .locator('.hosp-header-toggle')
      .tap()
    await visibleCount(page, 1)
    await page
      .locator('.hosp-card')
      .filter({ hasText: '測試醫院甲' })
      .getByRole('button', { name: '在地圖上定位 ↗' })
      .tap()
    await expect(page.getByRole('complementary', { name: '院所資訊' })).toContainText('測試醫院甲')
    await expect
      .poll(() =>
        page.locator('.maplibregl-canvas').evaluate((el) => {
          const rect = el.getBoundingClientRect()
          return rect.top >= 0 && rect.bottom <= innerHeight - 60
        })
      )
      .toBe(true)
  })
})

test('指定縣市找不到結果時提示區域條件，不誤稱畫面內沒有院所', async ({ page }) => {
  await page.getByRole('combobox', { name: '區域與縣市' }).selectOption('台北市')
  await regionCount(page, 2)
  await page.getByLabel('在地圖搜尋醫院或地標', { exact: true }).fill('不存在的院所')
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await regionCount(page, 0)
  await expect(page.locator('.hosp-empty')).toContainText('台北市內沒有符合目前條件的院所')
  await expect(page.locator('.unified-map-results')).not.toContainText('按「搜尋地點」')
})

test('切回所有縣市後清單恢復畫面範圍，不保留上一區域', async ({ page }) => {
  const city = page.getByRole('combobox', { name: '區域與縣市' })
  await city.selectOption('台北市')
  await regionCount(page, 2)
  await city.selectOption('新北市')
  await regionCount(page, 1, '新北市')
  await city.selectOption('all')
  await visibleCount(page, 2)
  await expect(page.getByRole('combobox', { name: '行政區', exact: true })).toHaveValue('all')
})

test('離開再返回保留區域清單與選定院所視角', async ({ page }) => {
  await page.getByRole('combobox', { name: '區域與縣市' }).selectOption('台北市')
  await regionCount(page, 2)
  await page
    .locator('.hosp-card')
    .filter({ hasText: '測試醫院甲' })
    .locator('.hosp-header-toggle')
    .click()
  await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-zoom', '16.5')
  await page.evaluate(async () => {
    const nuxt = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
      .$nuxt
    await nuxt.$router.push('/qs')
  })
  await page.getByRole('link', { name: '查找特寵醫院', exact: true }).click()
  await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-ready', 'true', {
    timeout: 45000
  })
  await regionCount(page, 2)
  await expect(page.getByRole('complementary', { name: '院所資訊' })).toContainText('測試醫院甲')
  await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-zoom', '16.5')
})

test('沒有資訊卡時重複按Esc避免重建院所群聚', async ({ page }) => {
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 2)
  const updates = await page.evaluate(() => (window as any).hospitalSourceUpdates)
  expect(updates).toBeGreaterThan(0)
  const canvas = page.locator('.maplibregl-canvas')
  await canvas.press('Escape')
  await canvas.press('Escape')
  await canvas.press('Escape')
  await visibleCount(page, 2)
  // 讓非同步 worker 訊息送出，再確認沒有因關閉空白資訊而重新建立資料。
  await page.waitForTimeout(500)
  expect(await page.evaluate(() => (window as any).hospitalSourceUpdates)).toBe(updates)
})

test('名錄重讀失敗後離開再返回，仍保留最後成功的院所', async ({ page }) => {
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 2)
  await page.route('**/rest/v1/hospitals*', (r) =>
    r.fulfill({ status: 503, json: { message: '測試暫時無法連線' } })
  )
  await page.evaluate(async () => {
    const nuxt = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
      .$nuxt
    await nuxt.callHook('app:data:refresh', ['hospitals-v1'])
  })
  await visibleCount(page, 2)
  await page.evaluate(async () => {
    const nuxt = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
      .$nuxt
    await nuxt.$router.push('/qs')
  })
  await page.getByRole('link', { name: '查找特寵醫院', exact: true }).click()
  await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-ready', 'true', {
    timeout: 45000
  })
  await visibleCount(page, 2)
  await expect(page.locator('.hosp-empty[role="alert"]')).toContainText('暫時顯示上次載入的資料')
  await page.route('**/rest/v1/hospitals*', (r) => r.fulfill({ json: [hospitals[1]] }))
  await page.getByRole('button', { name: '重新載入', exact: true }).click()
  await visibleCount(page, 1)
  await expect(page.locator('.hosp-card')).toContainText('測試醫院乙')
  await expect(page.locator('.hosp-empty[role="alert"]')).toHaveCount(0)
})

test('名錄成功更新為空陣列後，不使用舊院所補回清單', async ({ page }) => {
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 2)
  await page.route('**/rest/v1/hospitals*', (r) => r.fulfill({ json: [] }))
  await page.evaluate(async () => {
    const nuxt = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
      .$nuxt
    await nuxt.callHook('app:data:refresh', ['hospitals-v1'])
  })
  await visibleCount(page, 0)
  await expect(page.getByText('目前尚未收錄院所。', { exact: true })).toBeVisible()
  await page.evaluate(async () => {
    const nuxt = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
      .$nuxt
    await nuxt.$router.push('/qs')
  })
  await page.getByRole('link', { name: '查找特寵醫院', exact: true }).click()
  await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-ready', 'true', {
    timeout: 45000
  })
  await visibleCount(page, 0)
  await expect(page.getByText('目前尚未收錄院所。', { exact: true })).toBeVisible()
})

test('地點搜尋尚未回應時清除文字，舊結果不會重新出現', async ({ page }) => {
  let release!: () => void
  let started!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const requested = new Promise<void>((resolve) => {
    started = resolve
  })
  await page.route('**/api/hospital-place-search*', async (r) => {
    started()
    await gate
    await r.fulfill({
      json: {
        places: [
          {
            id: 'late-101',
            name: '台北101',
            address: '台北市',
            longitude: 121.565,
            latitude: 25.034
          }
        ]
      }
    })
  })
  await page.getByLabel('在地圖搜尋醫院或地標', { exact: true }).fill('台北101')
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await requested
  await page
    .locator('.unified-map-search')
    .getByRole('button', { name: '清除', exact: true })
    .click()
  release()
  await expect(page.getByLabel('在地圖搜尋醫院或地標', { exact: true })).toHaveValue('')
  await expect(page.getByRole('button', { name: '搜尋', exact: true })).toBeEnabled()
  await visibleCount(page, 2)
  await expect(page.locator('.unified-place-result')).toHaveCount(0)
  await expect(page.locator('.unified-map-results')).not.toContainText('地點搜尋暫時無法使用')
})

test('圖資失敗後重新載入可恢復3D與畫面清單', async ({ page, context }) => {
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await expect(page.locator('.hosp-card')).toHaveCount(3)
  await context.route('https://tiles.openfreemap.org/styles/liberty', (r) =>
    r.fulfill({ json: style })
  )
  await page.getByRole('button', { name: '重新載入地圖', exact: true }).click()
  await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-ready', 'true', {
    timeout: 45000
  })
  await visibleCount(page, 2)
  await expect(page.getByText('地圖暫時無法載入', { exact: true })).toHaveCount(0)
  await expect(page.locator('.maplibregl-canvas')).toHaveCount(1)
})

test('離線再恢復連線仍可搜尋定位且不重建地圖', async ({ page, context }) => {
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 2)
  const canvas = await page.locator('.maplibregl-canvas').elementHandle()
  await context.setOffline(true)
  await page.getByLabel('在地圖搜尋醫院或地標', { exact: true }).fill('醫院甲')
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 1)
  await context.setOffline(false)
  await page
    .locator('.unified-map-search')
    .getByRole('button', { name: '清除', exact: true })
    .click()
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 2)
  expect(await canvas?.evaluate((el) => el.isConnected)).toBe(true)
  await expect(page.locator('.maplibregl-canvas')).toHaveCount(1)
})

test('搜尋草稿不改變已套用的清單與視角，確認後才更新', async ({ page }) => {
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 2)
  const map = page.locator('.unified-map-body')
  const before = await map.getAttribute('data-map-longitude')
  const input = page.getByLabel('在地圖搜尋醫院或地標', { exact: true })
  await input.fill('醫院乙')
  await page.waitForTimeout(400)
  await visibleCount(page, 2)
  await expect(map).toHaveAttribute('data-map-longitude', before!)
  await expect(page.locator('#hospital-search-suggestions option')).toHaveCount(1)
  await input.press('Enter')
  await visibleCount(page, 1)
  await expect(page.locator('.hosp-card')).toContainText('測試醫院乙')
})

test('中文選字期間Enter不搜尋，結束選字後可搜尋', async ({ page }) => {
  const input = page.getByLabel('在地圖搜尋醫院或地標', { exact: true })
  await input.dispatchEvent('compositionstart')
  await input.fill('醫院甲')
  await input.press('Enter')
  await expect(page.locator('.hosp-card')).toHaveCount(0)
  await input.dispatchEvent('compositionend')
  await input.press('Enter')
  await visibleCount(page, 1)
})

test('地標等待期間搜尋可操作，相同查詢共用請求與快取', async ({ page }) => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let requests = 0
  await page.route('**/api/hospital-place-search*', async (r) => {
    requests++
    await gate
    await r.fulfill({ json: { places: [] } })
  })
  await page.getByLabel('在地圖搜尋醫院或地標', { exact: true }).fill('醫院甲')
  const submit = page.getByRole('button', { name: '搜尋', exact: true })
  await submit.click()
  await visibleCount(page, 1)
  await expect(submit).toBeEnabled()
  await submit.click()
  expect(requests).toBe(1)
  release()
  await expect(page.getByText('正在搜尋地點，院所清單仍可操作。', { exact: true })).toHaveCount(0)
  await submit.click()
  await visibleCount(page, 1)
  expect(requests).toBe(1)
})

test('地標搜尋帶入縣市且失敗可原地重試', async ({ page }) => {
  let requests = 0
  await page.route('**/api/hospital-place-search*', (r) => {
    requests++
    expect(new URL(r.request().url()).searchParams.get('city')).toBe('台北市')
    return requests === 1
      ? r.fulfill({ status: 503, json: {} })
      : r.fulfill({ json: { places: [] } })
  })
  await page.getByRole('combobox', { name: '區域與縣市' }).selectOption('台北市')
  await page.getByLabel('在地圖搜尋醫院或地標', { exact: true }).fill('醫院甲')
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await page.getByRole('button', { name: '重試地點搜尋', exact: true }).click()
  await expect(page.getByRole('button', { name: '重試地點搜尋', exact: true })).toHaveCount(0)
  await expect(page.getByLabel('在地圖搜尋醫院或地標', { exact: true })).toHaveValue('醫院甲')
  expect(requests).toBe(2)
})

test('關閉資訊卡會收回相機留白與清單選取態', async ({ page }) => {
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 2)
  await page.locator('.hosp-header-toggle').first().click()
  await expect
    .poll(async () =>
      Number(await page.locator('.unified-map-body').getAttribute('data-map-padding-left'))
    )
    .toBeGreaterThan(30)
  await expect(page.locator('.hosp-card.selected')).toHaveCount(1)
  await page.getByRole('button', { name: '關閉院所資訊', exact: true }).click()
  await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-padding-left', '30')
  await expect(page.locator('.hosp-card.selected')).toHaveCount(0)
})

test('重複定位相同院所避免重建相同資料', async ({ page }) => {
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 2)
  await page.locator('.hosp-header-toggle').first().click()
  await visibleCount(page, 1)
  const updates = await page.evaluate(() => (window as any).hospitalSourceUpdates)
  await page.getByRole('button', { name: '重新定位', exact: true }).click()
  await page.getByRole('button', { name: '重新定位', exact: true }).click()
  await page.waitForTimeout(300)
  expect(await page.evaluate(() => (window as any).hospitalSourceUpdates)).toBe(updates)
})

test('部分圖資重試避免重建樣式與院所來源', async ({ page, context }) => {
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 2)
  const canvas = await page.locator('.maplibregl-canvas').elementHandle()
  await expect(page.getByRole('button', { name: '重試圖資', exact: true })).toBeVisible()
  const updates = await page.evaluate(() => (window as any).hospitalSourceUpdates)
  await context.route('https://tiles.openfreemap.org/side/**', (r) =>
    r.fulfill({ body: tile, contentType: 'application/x-protobuf' })
  )
  await page.getByRole('button', { name: '重試圖資', exact: true }).click()
  await expect(page.getByRole('button', { name: '重試圖資', exact: true })).toHaveCount(0)
  await visibleCount(page, 2)
  expect(await canvas?.evaluate((el) => el.isConnected)).toBe(true)
  expect(await page.evaluate(() => (window as any).hospitalSourceUpdates)).toBe(updates)
})

test('院所時間物種急診與個別確認日期僅呈現來源資料', async ({ page }) => {
  await page.route('**/rest/v1/hospitals*', (r) =>
    r.fulfill({
      json: hospitals.map((h) => ({
        ...h,
        hours: '週一 10:00–18:00',
        accept_species: ['守宮'],
        has_emergency: true,
        verified_at: '2026-10-30'
      }))
    })
  )
  await page.evaluate(async () => {
    const nuxt = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
      .$nuxt
    await nuxt.callHook('app:data:refresh', ['hospitals-v1'])
  })
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 2)
  await page.locator('.hosp-header-toggle').first().click()
  const facts = page.locator('.hosp-card').first().locator('.hosp-record-facts')
  await expect(facts).toContainText('週一 10:00–18:00')
  await expect(facts).toContainText('守宮')
  await expect(facts).toContainText('出發前請致電確認')
  await expect(facts).toContainText('2026-10-30')
})

test('短視窗與320px搜尋操作不溢出，定位觸控區足夠', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 650 })
  const side = (await page.locator('.unified-map-sidebar').boundingBox())!
  const map = (await page.locator('.unified-map-body').boundingBox())!
  expect(Math.abs(side.height - map.height)).toBeLessThanOrEqual(1)
  expect(map.height).toBeLessThanOrEqual(500)
  await page.setViewportSize({ width: 320, height: 740 })
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 2)
  await page.locator('.hosp-header-toggle').first().click()
  expect(
    (await page.locator('.hosp-map-focus').first().boundingBox())!.height
  ).toBeGreaterThanOrEqual(44)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('延遲定位回來不蓋掉較新的院所搜尋', async ({ page }) => {
  await page.getByRole('button', { name: '我的位置', exact: true }).click()
  await page.waitForFunction(() => !!(window as any).releaseHospitalLocation)
  await page.getByLabel('在地圖搜尋醫院或地標', { exact: true }).fill('醫院甲')
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 1)
  await page.evaluate(() =>
    (window as any).releaseHospitalLocation({
      coords: { longitude: 121.49, latitude: 25.064, accuracy: 10 },
      timestamp: Date.now()
    })
  )
  await expect
    .poll(async () =>
      Number(await page.locator('.unified-map-body').getAttribute('data-map-longitude'))
    )
    .toBeCloseTo(121.513, 4)
})

test('深色模式資訊卡跟隨主題，長地址可換行', async ({ page }) => {
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 2)
  await page.locator('.hosp-header-toggle').first().click()
  const card = page.getByRole('complementary', { name: '院所資訊' })
  const color = await card.evaluate((el) => getComputedStyle(el).backgroundColor)
  await page.getByRole('switch').first().click()
  await expect
    .poll(() => card.evaluate((el) => getComputedStyle(el).backgroundColor))
    .not.toBe(color)
  expect(await card.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
})

test.describe('觸控平板', () => {
  test.use({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true })
  test('觸控平板保留雙欄與3D且可篩選', async ({ page }) => {
    const side = (await page.locator('.unified-map-sidebar').boundingBox())!
    const map = (await page.locator('.unified-map-body').boundingBox())!
    expect(side.x + side.width).toBeLessThanOrEqual(map.x)
    await page.locator('.hosp-sidebar-filter-details summary').tap()
    await page.getByRole('combobox', { name: '區域與縣市' }).selectOption('台北市')
    await regionCount(page, 2)
    expect(
      Number(await page.locator('.unified-map-body').getAttribute('data-map-pitch'))
    ).toBeGreaterThan(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
})

test('慢速載入中切換縣市只採用最後選擇', async ({ page }) => {
  await expect(page.getByText('正在載入立體地圖…', { exact: true })).toBeVisible()
  const city = page.getByRole('combobox', { name: '區域與縣市' })
  await city.selectOption('台北市')
  await city.selectOption('新北市')
  await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-ready', 'true', {
    timeout: 45000
  })
  await regionCount(page, 1, '新北市')
  await expect(page.locator('.hosp-card')).toContainText('測試醫院乙')
})

test('資料更新移除選定院所時清理卡片留白與選取', async ({ page }) => {
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 2)
  await page.locator('.hosp-header-toggle').first().click()
  await expect(page.getByRole('complementary', { name: '院所資訊' })).toBeVisible()
  await page.route('**/rest/v1/hospitals*', (r) => r.fulfill({ json: [hospitals[1]] }))
  await page.evaluate(async () => {
    const nuxt = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
      .$nuxt
    await nuxt.callHook('app:data:refresh', ['hospitals-v1'])
  })
  await expect(page.getByRole('complementary', { name: '院所資訊' })).toHaveCount(0)
  await expect(page.locator('.hosp-card.selected')).toHaveCount(0)
  await expect(page.locator('.unified-map-body')).toHaveAttribute('data-map-padding-left', '30')
})

test('同位置標記可明確選擇院所且保留長名稱', async ({ page }) => {
  await page.route('**/rest/v1/hospitals*', (r) =>
    r.fulfill({
      json: hospitals.slice(0, 2).map((h) => ({ ...h, longitude: 121.513, latitude: 25.063 }))
    })
  )
  await page.evaluate(async () => {
    const nuxt = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
      .$nuxt
    await nuxt.callHook('app:data:refresh', ['hospitals-v1'])
  })
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 2)
  const canvas = page.locator('.maplibregl-canvas')
  const box = (await canvas.boundingBox())!
  await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } })
  const group = page.getByRole('complementary', { name: '同位置院所' })
  await expect(group).toBeVisible()
  await group.getByRole('button', { name: '測試醫院乙', exact: true }).click()
  await expect(page.getByRole('complementary', { name: '院所資訊' })).toContainText('測試醫院乙')
})

if (process.env.HOSPITAL_STRESS === '1')
  test('持續地圖操作壓力與回收紀錄', async ({ page }, testInfo) => {
    test.setTimeout(390000)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.getByRole('combobox', { name: '區域與縣市' }).selectOption('台北市')
    await regionCount(page, 2)
    const client = await page.context().newCDPSession(page)
    await client.send('HeapProfiler.collectGarbage')
    const before = await client.send('Runtime.getHeapUsage')
    const started = Date.now()
    let operations = 0
    while (Date.now() - started < (Number(process.env.HOSPITAL_STRESS_MS) || 300000)) {
      await page.locator('.maplibregl-canvas').press(operations % 2 ? 'ArrowLeft' : 'ArrowRight')
      operations++
      await page.waitForTimeout(700)
    }
    await client.send('HeapProfiler.collectGarbage')
    const after = await client.send('Runtime.getHeapUsage')
    await expect(page.locator('.maplibregl-canvas')).toHaveCount(1)
    await regionCount(page, 2)
    expect(errors).toEqual([])
    const profile = {
      elapsedMs: Date.now() - started,
      operations,
      heapBefore: before.usedSize,
      heapAfter: after.usedSize,
      errors
    }
    writeFileSync('output/hospital-50-stress-profile.json', JSON.stringify(profile, null, 2))
    console.log(JSON.stringify(profile))
    await testInfo.attach('短期壓測紀錄', {
      body: JSON.stringify({
        elapsedMs: Date.now() - started,
        operations,
        heapBefore: before.usedSize,
        heapAfter: after.usedSize,
        errors
      }),
      contentType: 'application/json'
    })
  })

test('過期群聚回應不覆蓋較新的院所選擇', async ({ page }) => {
  await page.route('**/rest/v1/hospitals*', (r) =>
    r.fulfill({
      json: hospitals.slice(0, 2).map((h) => ({ ...h, longitude: 121.513, latitude: 25.063 }))
    })
  )
  await page.evaluate(async () => {
    const nuxt = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
      .$nuxt
    await nuxt.callHook('app:data:refresh', ['hospitals-v1'])
  })
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 2)
  const canvas = page.locator('.maplibregl-canvas')
  await canvas.press('-')
  await expect
    .poll(async () => Number(await page.locator('.unified-map-body').getAttribute('data-map-zoom')))
    .toBeLessThan(16)
  await page.waitForTimeout(500)
  const box = (await canvas.boundingBox())!
  await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } })
  await page.waitForFunction(() => !!(window as any).releaseHospitalCluster)
  await page.getByLabel('在地圖搜尋醫院或地標', { exact: true }).fill('醫院甲')
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 1)
  await page.evaluate(() => (window as any).releaseHospitalCluster())
  await page.waitForTimeout(500)
  await expect(page.getByRole('complementary', { name: '同位置院所' })).toHaveCount(0)
  await expect(page.getByRole('complementary', { name: '院所資訊' })).toContainText('測試醫院甲')
})

test('超長院名與地址在手機資訊卡內換行不溢出', async ({ page }) => {
  const rows = [
    {
      ...hospitals[0],
      name: '測試特殊寵物動物醫療中心'.repeat(6),
      address: '台北市測試區測試大道'.repeat(15)
    }
  ]
  await page.route('**/rest/v1/hospitals*', (r) => r.fulfill({ json: rows }))
  await page.evaluate(async () => {
    const nuxt = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
      .$nuxt
    await nuxt.callHook('app:data:refresh', ['hospitals-v1'])
  })
  await page.setViewportSize({ width: 320, height: 740 })
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 1)
  await page.locator('.hosp-header-toggle').first().click()
  const card = page.getByRole('complementary', { name: '院所資訊' })
  expect(await card.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('全螢幕清單留在側欄，改變尺寸後不覆蓋地圖', async ({ page }) => {
  await page.getByRole('button', { name: '搜尋', exact: true }).click()
  await visibleCount(page, 2)
  await page.getByRole('button', { name: '展開地圖', exact: true }).click()
  const results = page.locator('.unified-map-sidebar .unified-map-results')
  expect(await results.evaluate((el) => getComputedStyle(el).position)).toBe('static')
  await page.getByRole('button', { name: '離開全螢幕', exact: true }).click()
  await expect.poll(() => page.evaluate(() => !document.fullscreenElement)).toBe(true)
  await page.setViewportSize({ width: 1024, height: 650 })
  await page.getByRole('button', { name: '展開地圖', exact: true }).click()
  expect(await results.evaluate((el) => getComputedStyle(el).position)).toBe('static')
  const canvas = (await page.locator('.maplibregl-canvas').boundingBox())!
  expect(canvas.height).toBeGreaterThan(100)
  expect(canvas.y + canvas.height).toBeLessThanOrEqual(651)
})
