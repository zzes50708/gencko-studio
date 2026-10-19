import { test, expect } from '@playwright/test'

async function member(page: any, id: string | null) {
  await page.waitForFunction(
    () =>
      !!(
        document.querySelector('#__nuxt') as any
      )?.__vue_app__?.config.globalProperties.$pinia?._s.get('main')
  )
  await page.evaluate((id: string | null) => {
    const store = (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('main')
    store.currentUser = id
      ? {
          id,
          type: 'google',
          email: 'admin@example.invalid',
          name: '測試管理員',
          auctionAdmin: true
        }
      : null
  }, id)
}

test('競標管理訪客沒有私人紀錄；拒絕權限失敗後不殘留資料', async ({ page }) => {
  let deny = false
  await page.route('**/rest/v1/rpc/get_auction_bidder_contacts', (route) =>
    route.fulfill(
      deny
        ? { status: 403, json: { code: '42501', message: '僅限競標管理員查詢' } }
        : {
            json: [
              {
                id: 'B1',
                auction_id: 'TEST',
                user_name: '公開暱稱',
                amount: 500,
                bid_time: '2026-10-16T07:00:00Z',
                user_id: 'MEMBER-TEST',
                contact_provider: 'line',
                line_user_id: 'LINE-TEST',
                line_name: '測試LINE名稱'
              }
            ]
          }
    )
  )
  await page.route('**/rest/v1/auctions?**', (route) =>
    route.fulfill({
      json: [
        {
          id: 'TEST',
          morph: '測試場次',
          status: 'active',
          start_price: 100,
          end_time: '2030-01-01T00:00:00Z'
        },
        {
          id: 'EMPTY',
          morph: '空場次',
          status: 'ended',
          start_price: 200,
          end_time: '2020-01-01T00:00:00Z'
        }
      ]
    })
  )
  await page.goto('/auction-management')
  await expect(page.getByRole('button', { name: 'Google 管理員登入' })).toBeVisible()
  await expect(page.locator('.bidder-card')).toHaveCount(0)
  await member(page, 'ADMIN')
  await expect(page.getByLabel('場次編號', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: /測試場次/ }).click()
  await expect(page.getByText('測試LINE名稱', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('link', { name: '開啟官方 LINE 收件匣', exact: true })
  ).toHaveAttribute('href', 'https://chat.line.biz/account/@219abdzn')
  await expect(page.getByRole('link', { name: '開啟 LINE 對話', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '複製 LINE 名稱', exact: true })).toBeVisible()
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 850 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.getByRole('button', { name: '返回場次列表', exact: true }).click()
  await expect(page.locator('.bidder-card')).toHaveCount(0)
  await page.getByRole('button', { name: /測試場次/ }).click()
  await expect(page.locator('.bidder-card')).toHaveCount(1)
  deny = true
  await page.getByRole('button', { name: '重新載入出價者', exact: true }).click()
  await expect(page.getByText('此帳號沒有競標管理權限', { exact: false })).toBeVisible()
  await expect(page.locator('.bidder-card')).toHaveCount(0)
  await member(page, null)
  await expect(page.getByRole('button', { name: 'Google 管理員登入' })).toBeVisible()
})

test('一般 Google 與 LINE 會員不顯示管理場次及查詢操作', async ({ page }) => {
  let privateCalls = 0
  await page.route('**/rest/v1/rpc/get_auction_bidder_contacts', (route) => {
    privateCalls++
    return route.fulfill({ status: 403, json: { code: '42501' } })
  })
  await page.goto('/auction-management')
  await expect(page.getByRole('button', { name: 'Google 管理員登入' })).toBeVisible()
  for (const type of ['google', 'line']) {
    await page.waitForFunction(
      () =>
        !!(
          document.querySelector('#__nuxt') as any
        )?.__vue_app__?.config.globalProperties.$pinia?._s.get('main')
    )
    await page.evaluate((type) => {
      const store = (
        document.querySelector('#__nuxt') as any
      ).__vue_app__.config.globalProperties.$pinia._s.get('main')
      store.currentUser = { id: `CUSTOMER-${type}`, type, name: '一般會員', auctionAdmin: false }
    }, type)
    await expect(page.getByRole('button', { name: '切換 Google 管理員登入' })).toBeVisible()
    await expect(page.getByRole('region', { name: '場次列表', exact: true })).toHaveCount(0)
    await expect(page.getByRole('region', { name: '場次資訊', exact: true })).toHaveCount(0)
  }
  expect(privateCalls).toBe(0)
})

test('場次列表失敗可重試，空列表不誤顯示為載入失敗', async ({ page }) => {
  let fail = true
  await page.route('**/rest/v1/auctions?**', (route) =>
    route.fulfill(fail ? { status: 400, json: { message: '測試暫時失敗' } } : { json: [] })
  )
  await page.goto('/auction-management')
  await expect(page.getByRole('button', { name: 'Google 管理員登入' })).toBeVisible()
  await member(page, 'ADMIN')
  await expect(page.getByRole('button', { name: '重新載入場次' })).toBeVisible()
  fail = false
  await page.getByRole('button', { name: '重新載入場次' }).click()
  await expect(page.getByText('目前沒有競標場次。', { exact: true })).toBeVisible()
})
