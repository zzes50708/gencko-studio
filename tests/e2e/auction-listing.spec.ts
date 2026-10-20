import { test, expect } from '@playwright/test'

async function waitForStore(page: any) {
  await page.waitForFunction(
    () =>
      !!(
        document.querySelector('#__nuxt') as any
      )?.__vue_app__?.config.globalProperties.$pinia?._s.get('main')
  )
}

async function setup(page: any, mode = 'success') {
  const requests: any[] = []
  let auctions: any[] = []
  await page.route('**/rest/v1/auctions?**', (r: any) => r.fulfill({ json: auctions }))
  await page.route('**/rest/v1/rpc/admin_auction_candidates', (r: any) =>
    r.fulfill({
      json: [
        {
          id: 'TEST-NEW',
          morph: '測試品系',
          gender_type: '公',
          birthday: '2026',
          status: 'NotForSale',
          images: []
        }
      ]
    })
  )
  await page.route('**/rest/v1/rpc/admin_auction_workflow', (r: any) =>
    r.fulfill({ json: { enabled: true, outcome: null } })
  )
  await page.route('**/rest/v1/rpc/get_auction_bidder_contacts**', (r: any) =>
    r.fulfill({ json: [] })
  )
  await page.route('**/rest/v1/rpc/admin_create_auction', (r: any) => {
    const body = r.request().postDataJSON()
    requests.push(body)
    const id = `A-${body.p_request_id}`
    auctions = [
      {
        id,
        morph: '測試品系',
        status: 'active',
        start_price: body.p_start_price,
        min_increment: body.p_min_increment,
        start_time: body.p_start_time,
        end_time: body.p_end_time
      }
    ]
    return r.fulfill({
      json: mode === 'lost' && requests.length === 1 ? null : { id, replayed: requests.length > 1 }
    })
  })
  await page.goto('/auction-management')
  await expect(page.getByRole('button', { name: 'Google 管理員登入', exact: true })).toBeVisible()
  await waitForStore(page)
  await page.evaluate(async () => {
    const store = (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('main')
    await store.checkAuthStatus()
    store.currentUser = {
      id: 'ADMIN-LISTING',
      type: 'google',
      email: 'admin@example.invalid',
      auctionAdmin: true
    }
  })
  await page.getByRole('button', { name: '新增競標場次', exact: true }).click()
  await page.getByRole('button', { name: /TEST-NEW/ }).click()
  return requests
}

test('管理員可直接選個體立即上架，表單可在手機操作且搜尋Enter不誤上架', async ({ page }) => {
  const requests = await setup(page)
  await expect(page.getByLabel('起標價（元）', { exact: true })).toHaveValue('200')
  await expect(page.getByLabel('起標價（元）', { exact: true })).toHaveAttribute('step', '100')
  await expect(page.getByLabel('開標方式', { exact: true })).toHaveValue('scheduled')
  await expect(page.getByLabel('開標時間（台灣）', { exact: true })).toHaveValue(/T10:00$/)
  await expect(page.getByLabel('結標時間（台灣）', { exact: true })).toHaveValue(/T22:00$/)
  await page.getByLabel('起標價（元）', { exact: true }).press('ArrowUp')
  await expect(page.getByLabel('起標價（元）', { exact: true })).toHaveValue('300')
  await page.getByLabel('起標價（元）', { exact: true }).press('ArrowDown')
  await expect(page.getByLabel('起標價（元）', { exact: true })).toHaveValue('200')
  await expect(page.getByLabel('餌料', { exact: true })).toHaveValue('冷凍蟋蟀/杜比亞')
  await expect(page.getByLabel('餵食頻率', { exact: true }).locator('option')).toHaveText([
    '1-2天/次',
    '3-4天/次',
    '一週一次'
  ])
  await expect(
    page.getByText('運送／面交：黑貓 +180 元；三重面交免運', { exact: true })
  ).toBeVisible()
  await page.getByLabel('開標方式', { exact: true }).selectOption('now')
  await page.getByLabel('餵食頻率', { exact: true }).selectOption('3-4天/次')
  await page.getByLabel('個體 ID 或品系', { exact: true }).fill('TEST-NEW')
  await page.getByLabel('個體 ID 或品系', { exact: true }).press('Enter')
  expect(requests).toHaveLength(0)
  await page.getByLabel('起標價（元）', { exact: true }).fill('100')
  await page.getByLabel('最低增額（元）', { exact: true }).fill('0')
  await page.getByRole('button', { name: '確認上架', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: '最低增額須為正整數' })).toBeVisible()
  expect(requests).toHaveLength(0)
  await page.getByLabel('最低增額（元）', { exact: true }).fill('100')
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.screenshot({ path: 'output/auction-listing-form.png', fullPage: true })
  await page.getByRole('button', { name: '確認上架', exact: true }).click()
  await expect(page.getByText(/場次已上架：A-/)).toBeVisible()
  expect(requests).toHaveLength(1)
  expect(requests[0].p_start_time).toBeNull()
  expect(requests[0].p_animal_id).toBe('TEST-NEW')
  expect(requests[0].p_diet).toBe('冷凍蟋蟀/杜比亞')
  expect(requests[0].p_feeding_freq).toBe('3-4天/次')
  expect(requests[0].p_shipping_info).toBe('黑貓 +180 元；三重面交免運')
})

test('預約採台灣時間，拒絕結標早於開標，成功後顯示尚未開標', async ({ page }) => {
  const requests = await setup(page)
  await page.getByLabel('開標方式', { exact: true }).selectOption('scheduled')
  await page.getByLabel('開標時間（台灣）', { exact: true }).fill('2030-01-02T16:00')
  await page.getByLabel('結標時間（台灣）', { exact: true }).fill('2030-01-01T16:00')
  await page.getByRole('button', { name: '確認上架', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: '結標時間須晚於開標時間' })).toBeVisible()
  expect(requests).toHaveLength(0)
  await page.getByLabel('結標時間（台灣）', { exact: true }).fill('2030-01-03T16:00')
  await page.getByRole('button', { name: '確認上架', exact: true }).click()
  await expect(page.getByText(/場次已上架：A-/)).toBeVisible()
  expect(requests[0].p_start_time).toBe('2030-01-02T08:00:00.000Z')
  expect(requests[0].p_end_time).toBe('2030-01-03T08:00:00.000Z')
  await expect(page.locator('.detail-title')).toContainText('尚未開標')
})

test('上架回執遺失後重新整理，仍沿用原請求且不重建場次', async ({ page }) => {
  const requests = await setup(page, 'lost')
  await page.getByLabel('起標價（元）', { exact: true }).fill('600')
  await page.getByRole('button', { name: '確認上架', exact: true }).click()
  await expect(page.getByRole('button', { name: '重試同一筆上架', exact: true })).toBeVisible()
  await expect(page.getByLabel('起標價（元）', { exact: true })).toBeDisabled()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Google 管理員登入', exact: true })).toBeVisible()
  await waitForStore(page)
  await page.evaluate(async () => {
    const store = (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('main')
    await store.checkAuthStatus()
    store.currentUser = {
      id: 'ADMIN-LISTING',
      type: 'google',
      email: 'admin@example.invalid',
      auctionAdmin: true
    }
  })
  await page.getByRole('button', { name: '新增競標場次', exact: true }).click()
  await expect(page.getByLabel('起標價（元）', { exact: true })).toHaveValue('600')
  await page.getByRole('button', { name: '重試同一筆上架', exact: true }).click()
  await expect(page.getByText(/場次已上架：A-/)).toBeVisible()
  expect(requests).toHaveLength(2)
  expect(requests[1]).toEqual(requests[0])
  expect(
    await page.evaluate(() => sessionStorage.getItem('auction-listing-pending:ADMIN-LISTING'))
  ).toBeNull()
})

test('個體另有未完成得標交易時，清除已拒絕的請求並讓管理員重新選取', async ({ page }) => {
  await setup(page)
  let calls = 0
  await page.route('**/rest/v1/rpc/admin_create_auction', (r) => {
    calls++
    return r.fulfill({
      status: 400,
      json: { code: '22023', message: '此個體尚有未結束場次或待處理交易，請先處理原場次' }
    })
  })
  await page.getByRole('button', { name: '確認上架', exact: true }).click()
  await expect(
    page.getByText('此個體尚有未結束場次或待處理交易，請先處理原場次', { exact: true })
  ).toBeVisible()
  await expect(page.getByLabel('起標價（元）', { exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: '重試同一筆上架', exact: true })).toHaveCount(0)
  expect(
    await page.evaluate(() => sessionStorage.getItem('auction-listing-pending:ADMIN-LISTING'))
  ).toBeNull()
  expect(calls).toBe(1)
})

test('個體搜尋異常不得冒充沒有庫存，重試可恢復；清單滿額提示縮小搜尋', async ({ page }) => {
  await setup(page)
  for (const payload of [null, {}, [null], [{ id: 'BROKEN' }]]) {
    await page.route('**/rest/v1/rpc/admin_auction_candidates', (r) => r.fulfill({ json: payload }))
    await page.getByRole('button', { name: '搜尋個體', exact: true }).click()
    await expect(
      page.getByText('個體搜尋失敗，請確認管理權限後重試。', { exact: true })
    ).toBeVisible()
    await expect(
      page.getByText('找不到可上架個體，請換個 ID 或確認個體狀態。', { exact: true })
    ).toHaveCount(0)
  }
  await page.route('**/rest/v1/rpc/admin_auction_candidates', (r) => r.fulfill({ json: [] }))
  await page.getByRole('button', { name: '搜尋個體', exact: true }).click()
  await expect(
    page.getByText('找不到可上架個體，請換個 ID 或確認個體狀態。', { exact: true })
  ).toBeVisible()
  await page.route('**/rest/v1/rpc/admin_auction_candidates', (r) =>
    r.fulfill({
      json: Array.from({ length: 30 }, (_, i) => ({ id: `TEST-${i}`, morph: '測試品系' }))
    })
  )
  await page.getByRole('button', { name: '搜尋個體', exact: true }).click()
  await expect(
    page.getByText('目前顯示前 30 隻，請輸入更完整的 ID 或品系縮小搜尋。', { exact: true })
  ).toBeVisible()
})

test('預約詳情開標前不顯示出價入口，到時自動開放', async ({ page }) => {
  const now = Date.now()
  await page.clock.install({ time: now })
  const auction = {
    id: 'TEST-AUCTION-20261016-01',
    morph: '預約倒數測試',
    status: 'active',
    start_time: new Date(now + 10000).toISOString(),
    end_time: new Date(now + 3600000).toISOString(),
    start_price: 100,
    min_increment: 100,
    images: []
  }
  await page.route('**/api/server-time', (r) => r.fulfill({ json: { serverTime: now } }))
  await page.route('**/rest/v1/auctions?**', (r) =>
    r.fulfill({ json: new URL(r.request().url()).searchParams.has('id') ? auction : [auction] })
  )
  await page.route('**/rest/v1/auction_bids?**', (r) => r.fulfill({ json: [] }))
  await page.routeWebSocket('**/realtime/v1/websocket**', () => {})
  await page.goto(`/auction/${auction.id}`)
  await expect(page.locator('.timer-value')).toContainText('開標倒數')
  await expect(page.getByRole('button', { name: 'LINE 登入', exact: true })).toHaveCount(0)
  await page.clock.runFor(11000)
  await expect(page.getByRole('button', { name: 'LINE 登入', exact: true })).toBeVisible()
})
