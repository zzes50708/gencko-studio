import { test, expect } from '@playwright/test'

test('初始化完成前不接受無法處理的搜尋輸入', async ({ page }) => {
  let release!: () => void
  const ready = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/_nuxt/**', async (route) => {
    if (route.request().resourceType() === 'script') await ready
    await route.continue()
  })
  try {
    await page.goto('/faq', { waitUntil: 'commit' })
    await expect(page.locator('#faq-search-input')).toBeVisible()
    await expect(page.locator('#faq-search-input')).toBeDisabled()
  } finally {
    release()
  }
  await expect(page.locator('#faq-search-input')).toBeEnabled({ timeout: 20000 })
  await page.locator('#faq-search-input').fill('ux-no-match-123')
  await expect(page.getByText('沒有符合的問題，請試試其他關鍵字。')).toBeVisible()
})

for (const delay of [0, 1, 5, 20])
  test(`網址同步完成後 ${delay}ms 的新輸入保留`, async ({ page }) => {
    await page.goto('/faq')
    await page.waitForFunction(() =>
      Boolean((document.querySelector('#__nuxt') as any)?.__vue_app__)
    )
    await page.evaluate((delay) => {
      const router = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
        .$router
      let entered = false
      router.afterEach((to: any, _from: any, failure: any) => {
        if (failure || entered || to.path !== '/faq' || to.query.q !== '訂金') return
        entered = true
        // 在前一次網址更新剛完成時輸入下一筆，重現同步與輸入交錯。
        setTimeout(() => {
          const input = document.querySelector<HTMLInputElement>('#faq-search-input')!
          input.value = 'ux-latest-no-match-123'
          input.dispatchEvent(new Event('input', { bubbles: true }))
        }, delay)
      })
    }, delay)
    const search = page.getByRole('searchbox', { name: '搜尋所有常見問題' })
    await search.fill('訂金')
    await expect(search).toHaveValue('ux-latest-no-match-123')
    await expect(page).toHaveURL(/q=ux-latest-no-match-123/)
    await expect(page.getByText('沒有符合的問題，請試試其他關鍵字。')).toBeVisible()
  })
