import { test, expect } from '@playwright/test'

const id = 'UX-AUCTION-MEDIA'
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
  'base64'
)

async function fixture(page: any, options: any = {}) {
  const state = {
    auction: {
      id,
      morph: '照片測試',
      status: 'active',
      start_price: 100,
      min_increment: 100,
      end_time: new Date(Date.now() + 86400000).toISOString(),
      images: options.empty ? [] : [1, 2, 3].map((n) => `https://fixture.invalid/photo${n}.png`),
      ...options.auction
    },
    bids: options.noBids
      ? []
      : [
          {
            id: 'B',
            auction_id: id,
            amount: 400,
            user_name: '測試',
            bid_time: new Date().toISOString()
          }
        ],
    failPhoto: false,
    failBids: !!options.failBids,
    requests: [] as string[]
  }
  await page.route('**/rest/v1/**', (route: any) => {
    if (route.request().method() !== 'GET') return route.abort()
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/auction_bids'))
      return state.failBids
        ? route.fulfill({ status: 400, json: { message: '測試離線' } })
        : route.fulfill({ json: state.bids })
    if (url.pathname.endsWith('/auctions'))
      return route.fulfill({ json: url.searchParams.has('id') ? state.auction : [state.auction] })
    return route.continue()
  })
  await page.route('**/api/auctions/**/bid', (route: any) => route.abort())
  await page.route('https://wsrv.nl/**', (route: any) => {
    const url = route.request().url()
    state.requests.push(url)
    if (state.failPhoto && url.includes('photo2'))
      return route.fulfill({ status: 404, body: '', headers: { 'cache-control': 'no-store' } })
    return route.fulfill({ contentType: 'image/png', body: png })
  })
  await page.goto('/stories', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () =>
      !!(
        document.querySelector('#__nuxt') as any
      )?.__vue_app__?.config.globalProperties.$pinia?._s.get('main')
  )
  await page.evaluate(async (auction: any) => {
    const app = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
    app.$pinia._s.get('main').auctionList = [auction]
    await app.$router.push(`/auction/${auction.id}`)
  }, state.auction)
  await page.locator('.detail-layout').waitFor()
  await expect(page.locator('.timer-value').first()).not.toHaveText('時間同步中')
  return state
}

test('競標詳情顯示餌料、餵食頻率、固定運送方案及個體注意事項', async ({ page }) => {
  await fixture(page, {
    auction: {
      diet: '冷凍蟋蟀/杜比亞',
      feeding_freq: '3-4天/次',
      shipping_info: '黑貓 +180 元；三重面交免運',
      note: '本個體需留意餵食狀況'
    }
  })
  await expect(page.locator('.specs-list')).toContainText('餌料： 冷凍蟋蟀/杜比亞')
  await expect(page.locator('.specs-list')).toContainText('餵食頻率： 3-4天/次')
  await expect(page.locator('.specs-list')).toContainText('運送／面交： 黑貓 +180 元；三重面交免運')
  await expect(page.locator('.note-box')).toContainText('個體注意事項：')
  await expect(page.locator('.note-box')).toContainText('本個體需留意餵食狀況')
})

test('個體注意事項保留分行，長字串在手機不溢出', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await fixture(page, { auction: { note: `第一行健康說明\n第二行餵食說明\n${'A'.repeat(150)}` } })
  const note = page.locator('.note-content')
  await expect(note).toHaveCSS('white-space', 'pre-line')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('三張照片可點選、鍵盤切換，背景更新保留選擇', async ({ page }) => {
  await fixture(page)
  await expect(page.getByRole('group', { name: '競標照片切換' }).getByRole('button')).toHaveCount(3)
  await page.getByRole('button', { name: '查看第 2 張照片' }).click()
  await expect(page.locator('.main-img img')).toHaveAttribute('src', /photo2/)
  await page.locator('.main-img').focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.main-img img')).toHaveAttribute('src', /photo3/)
  await page.evaluate(async () => {
    let c = (document.querySelector('.main-img') as any).__vueParentComponent
    while (c && !c.setupState.refreshAuction) c = c.parent
    await c.setupState.refreshAuction()
  })
  await expect(page.getByRole('button', { name: '查看第 3 張照片' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await page.locator('.main-img').click()
  await expect(page.getByRole('dialog', { name: '圖片預覽' })).toBeVisible()
  await expect(page.locator('.lightbox-img')).toHaveAttribute('src', /photo3/)
})

test('照片失敗可重試與換圖，控制維持44px', async ({ page }) => {
  const state = await fixture(page)
  state.failPhoto = true
  await page.getByRole('button', { name: '查看第 2 張照片' }).click()
  const retry = page.getByRole('button', { name: '重新載入照片' })
  await expect(retry).toBeVisible()
  expect((await retry.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  state.failPhoto = false
  await retry.click()
  await expect(page.locator('.main-img img')).toBeVisible()
  await expect(page.locator('.main-img img')).toHaveJSProperty('naturalWidth', 1)
  await page.getByRole('button', { name: '查看第 1 張照片' }).click()
  await expect(page.locator('.main-img img')).toHaveAttribute('src', /photo1/)
})

test('沒有照片不請求失效預設圖，仍可生成品牌圖卡', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 })
  const state = await fixture(page, { empty: true })
  const photo = (await page.locator('.auction-gallery').boundingBox())!
  const heading = (await page.locator('.header-info').boundingBox())!
  expect(photo.x + photo.width).toBeLessThanOrEqual(heading.x)
  await expect(page.locator('.auction-photo-error')).toContainText('照片尚未提供')
  await expect(page.locator('.main-img')).toHaveCount(0)
  await page.getByRole('button', { name: '產生圖卡', exact: true }).click()
  await expect(page.locator('dialog.promo-modal-overlay')).toBeVisible()
  expect(state.requests.some((url) => url.includes('placeholder.jpg'))).toBe(false)
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog.promo-modal-overlay')).not.toBeVisible()
})

test('圖卡使用所選照片且暫停狀態不冒充進行中', async ({ page }) => {
  const state = await fixture(page, { auction: { status: 'paused' } })
  await expect(page).toHaveTitle(/暫停競標/)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  await expect(page.locator('meta[property="product:availability"]')).toHaveAttribute(
    'content',
    'out of stock'
  )
  await page.getByRole('button', { name: '查看第 2 張照片' }).click()
  await page.getByRole('button', { name: '產生圖卡', exact: true }).click()
  await expect(page.locator('dialog.promo-modal-overlay')).toBeVisible()
  expect(state.requests.at(-1)).toContain('photo2')
})

test('尚無出價顯示起標價，資料錯誤不宣稱目前最高', async ({ page }) => {
  await fixture(page, { noBids: true })
  await expect(page.locator('.p-lbl').first()).toHaveText('起標價：')
  await expect(page).toHaveTitle(/尚無出價/)
  await expect(page.locator('meta[name="twitter:label1"]')).toHaveAttribute('content', '起標價')
})

test('出價讀取失敗不在分享資訊捏造價格', async ({ page }) => {
  await fixture(page, { failBids: true })
  await expect(page).not.toHaveTitle(/目前最高/)
  expect(
    await page.evaluate(() =>
      document.querySelector('meta[property="product:price:amount"]')?.getAttribute('content')
    )
  ).toBeFalsy()
  await expect(page.locator('.bid-history [role="alert"]')).toBeVisible()
})

test('裝置日期快兩天仍按伺服器倒數', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeDate = Date
    class ShiftedDate extends NativeDate {
      constructor(...args: any[]) {
        super(...((args.length ? args : [NativeDate.now() + 172800000]) as [any]))
      }
      static now() {
        return NativeDate.now() + 172800000
      }
    }
    window.Date = ShiftedDate as DateConstructor
  })
  await fixture(page)
  await expect(page.locator('.status-badge').first()).toContainText('競標中')
  await expect(page.locator('.timer-value').first()).toHaveText(/23:59:/)
})

test('無效截止時間可顯示待確認，不造成RangeError', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await fixture(page, { auction: { end_time: 'invalid' } })
  await expect(page.locator('.status-badge').first()).toContainText('待確認')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  expect(errors).toEqual([])
})

test('真正不存在的競標回404且禁止索引', async ({ request }) => {
  const response = await request.get('/auction/TEST-AUDIT-NOT-FOUND')
  expect(response.status()).toBe(404)
  expect(await response.text()).toMatch(/name="robots"[^>]*noindex/)
})

// SSR 價格改由 scripts/verify-auction-ssr.mjs 以獨立 API 驗證，避免依賴真實場次的變動狀態。

test('手機橫滑換圖、垂直滑動不換圖且不誤開燈箱', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true
  })
  try {
    const page = await context.newPage()
    await fixture(page)
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 })
      const photo = (await page.locator('.auction-gallery').boundingBox())!
      const heading = (await page.locator('.header-info').boundingBox())!
      expect(photo.x + photo.width).toBeLessThanOrEqual(heading.x)
    }
    await expect(page.getByRole('button', { name: '下一張照片' })).toBeVisible()
    await page.locator('.main-img').scrollIntoViewIfNeeded()
    const box = (await page.locator('.main-img').boundingBox())!
    const client = await context.newCDPSession(page)
    const x = box.x + box.width * 0.75
    const y = box.y + box.height / 2
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x - 100, y: y + 5 }]
    })
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect(page.locator('.photo-page-count')).toHaveText('2 / 3')
    await expect(page.getByRole('dialog', { name: '圖片預覽' })).toHaveCount(0)
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x - 4, y: y - 70 }]
    })
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect(page.locator('.photo-page-count')).toHaveText('2 / 3')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: 'output/auction-media-mobile.png', fullPage: true })
  } finally {
    await context.close()
  }
})
