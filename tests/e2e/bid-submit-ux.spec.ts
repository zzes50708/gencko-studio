import { test, expect } from '@playwright/test'

test('競標送出不重複，失敗後可以重新出價', async ({ page }) => {
  const auction = {
    id: 'UX-SUBMIT',
    morph: '測試',
    gender: '公',
    status: 'active',
    start_price: 1000,
    min_increment: 100,
    end_time: '2030-01-01',
    images: []
  }
  await page.route('**/rest/v1/auctions**', (r) =>
    r.fulfill({ json: r.request().url().includes('id=eq.') ? auction : [auction] })
  )
  await page.route('**/rest/v1/auction_bids**', (r) => r.fulfill({ json: [] }))
  await page.goto('/stories')
  await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as any)?.__vue_app__)
  await page.evaluate(async () => {
    const app = (document.querySelector('#__nuxt') as any).__vue_app__
    app.config.globalProperties.$pinia._s.get('main').currentUser = {
      type: 'google',
      email: 'ux@example.invalid'
    }
    await app.config.globalProperties.$router.push('/auction/UX-SUBMIT')
  })
  await expect(page.locator('.btn-promo')).toBeVisible()
  await page.evaluate(() => {
    ;(document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$pinia._s.get(
      'main'
    ).currentUser = { type: 'google', email: 'ux@example.invalid' }
  })
  await expect(page.getByRole('button', { name: '確認出價', exact: true })).toBeEnabled()
  let requests = 0,
    release!: () => void
  const gate = new Promise<void>((r) => {
    release = r
  })
  await page.route('**/api/auctions/UX-SUBMIT/bid', async (r) => {
    requests++
    await gate
    await r.fulfill({ status: 400, json: { message: '測試送出失敗' } })
  })
  page.on('dialog', (d) => d.dismiss())
  await page.getByLabel('出價金額', { exact: true }).fill('2000')
  await page.evaluate(() => {
    let c = (document.querySelector('.btn-bid') as any).__vueParentComponent
    while (c && !c.setupState.placeBid) c = c.parent
    ;(window as any).submits = Promise.all([c.setupState.placeBid(), c.setupState.placeBid()])
  })
  await expect.poll(() => requests).toBeGreaterThan(0)
  await expect(page.getByRole('button', { name: '處理中...', exact: true })).toBeDisabled()
  release()
  await page.evaluate(() => (window as any).submits)
  expect(requests).toBe(1)
  await expect(page.getByRole('button', { name: '確認出價', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: '確認出價', exact: true }).click()
  await expect.poll(() => requests).toBe(2)
})
