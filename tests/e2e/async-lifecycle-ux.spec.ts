import { test, expect } from '@playwright/test'

test('離開競標頁後，尚未完成的更新不再啟動摘要請求', async ({ page }) => {
  await page.route('**/rest/v1/auctions**', (route) =>
    route.fulfill({ json: [{ id: 'UX-LATE', status: 'active', end_time: '2030-01-01' }] })
  )
  await page.goto('/auction')
  await page.waitForFunction(
    () => !!(document.querySelector('.auction-page') as any)?.__vueParentComponent
  )
  let summaries = 0
  await page.route('**/rest/v1/auction_bids**', async (route) => {
    summaries++
    await route.fulfill({ json: [] })
  })
  await page.evaluate(async () => {
    let c = (document.querySelector('.auction-page') as any).__vueParentComponent
    while (c && !c.setupState.refreshAuctions) c = c.parent
    const store = (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('main')
    store.auctionList = [{ id: 'UX-LATE', status: 'active', end_time: '2030-01-01' }]
    await new Promise((resolve) => setTimeout(resolve, 100))
    let release: () => void
    const old = store.loadAuctions
    store.loadAuctions = () =>
      new Promise<void>((resolve) => {
        release = resolve
      })
    ;(window as any).lateRefresh = c.setupState.refreshAuctions()
    await (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$router.push('/stories')
    ;(window as any).releaseRefresh = async () => {
      release!()
      await (window as any).lateRefresh
      store.loadAuctions = old
    }
  })
  const before = summaries
  await page.evaluate(() => (window as any).releaseRefresh())
  await page.waitForTimeout(200)
  expect(summaries).toBe(before)
  expect(before).toBeGreaterThan(0)
})
