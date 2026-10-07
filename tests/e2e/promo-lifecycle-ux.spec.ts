import { test, expect } from '@playwright/test'

test('圖卡生成限制重複呼叫，切頁後圖片失敗不打斷新頁', async ({ page }) => {
  await page.route('**/rest/v1/animals**', (r) =>
    r.fulfill({
      json: r.request().url().includes('id=eq.')
        ? { id: 'UX-P', morph: '測試', status: 'ForSale', species: '豹紋守宮', listing_price: 8000 }
        : []
    })
  )
  await page.route('**/rest/v1/site_settings**', (r) => r.fulfill({ json: null }))
  await page.goto('/stories')
  await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as any)?.__vue_app__)
  await page.evaluate(() =>
    (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$router.push(
      '/product/UX-P'
    )
  )
  await page.waitForFunction(
    () => !!(document.querySelector('.product-root-container') as any)?.__vueParentComponent
  )
  const result = await page.evaluate(async () => {
    let c = (document.querySelector('.product-root-container') as any).__vueParentComponent
    while (c && !c.setupState.generatePromo) c = c.parent
    const OriginalImage = window.Image,
      originalAlert = window.alert
    const images: any[] = []
    let alerts = 0
    window.Image = class {
      constructor() {
        images.push(this)
      }
    } as any
    window.alert = () => {
      alerts++
    }
    const a = c.setupState.generatePromo(),
      b = c.setupState.generatePromo()
    const count = images.length
    await (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$router.push('/stories')
    images.forEach((image) => image.onerror(new Error('圖片失敗')))
    await Promise.all([a, b])
    window.Image = OriginalImage
    window.alert = originalAlert
    return { count, alerts }
  })
  expect(result).toEqual({ count: 1, alerts: 0 })
  await expect(page).toHaveURL(/\/stories$/)
})
