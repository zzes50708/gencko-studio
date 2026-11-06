import { test, expect } from '@playwright/test'

async function ready(page) {
  await page.waitForFunction(() => {
    const app = (document.querySelector('#__nuxt') as any)?.__vue_app__
    return app && !app.config.globalProperties.$nuxt.isHydrating
  })
}

test('減少動態時，鍵盤仍能操作特徵與用品清單', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/guide')
  await ready(page)
  const compare = page.getByRole('region', { name: '觀察兩種守宮的差異' })
  const tail = compare.getByRole('button', { name: '尾巴形狀', exact: true })
  await tail.focus()
  await tail.press('Enter')
  await expect(tail).toHaveAttribute('aria-pressed', 'true')
  await expect(compare.getByRole('status')).toContainText('尾部通常更為肥厚')
  await page.goto('/start-here')
  await ready(page)
  const water = page.getByRole('checkbox', { name: '水盆', exact: true })
  await water.focus()
  await water.press('Space')
  await expect(water).toBeChecked()
  await expect(page.getByRole('region', { name: '到家前用品清單' }).getByRole('status')).toHaveText(
    '已備妥 1 / 8 項'
  )
})

test('未執行 JavaScript 時，介紹比較與溫度資料仍完整可讀', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/guide')
  await expect(page.getByRole('table', { name: '豹紋守宮與肥尾守宮差異' })).toContainText(
    '尾部通常更為肥厚'
  )
  await page.goto('/care')
  const zones = page.getByRole('region', { name: '探索溫度梯度' })
  await expect(zones).toContainText('26–28°C')
  await expect(zones).toContainText('28–30°C')
  await expect(zones).toContainText('30–32°C')
  await context.close()
})

test('長文閱讀線只隨正文閱讀推進', async ({ page }) => {
  const article = {
    id: 'READING-MOTION',
    status: 'Published',
    title: '閱讀進度測試',
    content:
      '<h2>閱讀起點</h2>' +
      '<p>保留完整正文的閱讀進度測試段落。</p>'.repeat(120) +
      '<h2>閱讀終點</h2>'
  }
  await page.route('**/rest/v1/*articles**', (route) =>
    route.fulfill({
      json: new URL(route.request().url()).searchParams.has('id') ? article : [article]
    })
  )
  await page.route('**/rest/v1/*genetic_pages**', (route) => route.fulfill({ json: [] }))
  await page.goto('/certificates')
  await ready(page)
  await page.evaluate(() =>
    (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$router.push(
      '/articles/READING-MOTION'
    )
  )
  const line = page.locator('.reader-reading-track > span')
  await expect(line).toBeAttached()
  const scale = () =>
    line.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).a)
  await page.locator('.reader-content h2').first().scrollIntoViewIfNeeded()
  await expect.poll(scale).toBeLessThan(0.2)
  await page.locator('.reader-content h2').last().scrollIntoViewIfNeeded()
  await expect.poll(scale).toBeGreaterThan(0.9)
  await expect(page.locator('.reader-reading-track')).toBeInViewport()
})

test('章節導覽會隨閱讀位置連動，減少動態時仍可跳轉', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/guide')
  await ready(page)
  const chapters = page.getByRole('navigation', { name: '守宮介紹章節' })
  await chapters.getByRole('link', { name: /物種比較/ }).click()
  await expect(chapters.getByRole('link', { name: /物種比較/ })).toHaveAttribute(
    'aria-current',
    'location'
  )
  await page.locator('#guide-ready').scrollIntoViewIfNeeded()
  await expect(chapters.getByRole('link', { name: /飼養前準備/ })).toHaveAttribute(
    'aria-current',
    'location'
  )
})

for (const width of [390, 768, 1440]) {
  test.describe(`內容頁設備 ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, hasTouch: width <= 1024, isMobile: width < 768 })
    test(`基因照片 ${width}px：可放大、關閉後回到原位`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      const gene = {
        name: '外觀互動測試',
        brief: '照片供外觀觀察，不能據此判定基因。',
        image_url: '/images/guide/leopard-gecko.webp'
      }
      await page.route('**/rest/v1/*genetic_pages**', (route) =>
        route.fulfill({
          json: new URL(route.request().url()).searchParams.has('name') ? gene : [gene]
        })
      )
      await page.goto('/certificates')
      await ready(page)
      await page.evaluate(() =>
        (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$router.push(
          '/genes/' + encodeURIComponent('外觀互動測試')
        )
      )
      const zoom = page.getByRole('button', { name: '放大檢視外觀互動測試外觀範例' })
      await zoom.click()
      const dialog = page.getByRole('dialog', { name: '圖片預覽' })
      await expect(dialog).toBeVisible()
      await expect(dialog.getByRole('link', { name: '立即私訊購買' })).toHaveCount(0)
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(zoom).toBeFocused()
      await expect(page).toHaveURL(/genes\//)
    })

    test(`內容互動 ${width}px：比較特徵、冷熱區與準備進度`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/guide')
      await ready(page)
      const chapter = page
        .getByRole('navigation', { name: '守宮介紹章節' })
        .getByRole('link', { name: /物種比較/ })
      await chapter.click()
      await expect(chapter).toHaveAttribute('aria-current', 'location')
      const compare = page.getByRole('region', { name: '觀察兩種守宮的差異' })
      await compare.getByRole('button', { name: '尾巴形狀', exact: true }).click()
      await expect(compare.getByRole('button', { name: '尾巴形狀', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
      await expect(compare.getByRole('status')).toContainText('尾巴呈細長錐形')
      await expect(compare.getByRole('status')).toContainText('尾部通常更為肥厚')
      await compare.getByRole('button', { name: '眼睛特徵', exact: true }).click()
      await expect(compare.getByRole('status')).toContainText('縱向瞳孔')
      await compare.screenshot({ path: `output/content-interactions/guide-${width}.png` })
      await page.goto('/care')
      await ready(page)
      const temperature = page.getByRole('region', { name: '探索溫度梯度' })
      await temperature.getByRole('button', { name: /熱區腹部加溫/ }).click()
      await expect(temperature.getByRole('status')).toContainText('30–32°C')
      await temperature.getByRole('button', { name: /冷區/ }).click()
      await expect(temperature.getByRole('status')).toContainText('26–28°C')
      await temperature.screenshot({ path: `output/content-interactions/care-${width}.png` })
      await page.goto('/start-here')
      await ready(page)
      const checklist = page.getByRole('region', { name: '到家前用品清單' })
      await checklist.getByRole('checkbox', { name: '水盆', exact: true }).check()
      await expect(checklist.getByRole('status')).toHaveText('已備妥 1 / 8 項')
      await checklist.getByRole('checkbox', { name: '底材', exact: true }).check()
      await expect(checklist.getByRole('status')).toHaveText('已備妥 2 / 8 項')
      await checklist.getByRole('checkbox', { name: '水盆', exact: true }).uncheck()
      await expect(checklist.getByRole('status')).toHaveText('已備妥 1 / 8 項')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      )
      await checklist.screenshot({ path: `output/content-interactions/start-here-${width}.png` })
    })
  })
}
