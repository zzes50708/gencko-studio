import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// 發布回歸的故障注入必須直達請求，避免已安裝的 PWA 快取掩蓋模擬錯誤。
test.use({ serviceWorkers: 'block' })

for (const surface of ['shop', 'product']) {
  test(`${surface} 候選圖片失敗時回退原尺寸，不隱藏仍可載入的照片`, async ({
    browser,
    baseURL
  }) => {
    const context = await browser.newContext({
      baseURL,
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      serviceWorkers: 'block'
    })
    const page = await context.newPage()
    try {
      const animal = {
        id: 'PHOTO-FOLLOWUP',
        species: '豹紋守宮',
        morph: '圖片回退測試',
        status: 'ForSale',
        listing_price: 8000,
        genes: [],
        image_url: 'https://example.invalid/photo.jpg'
      }
      await page.route('**/rest/v1/animals**', (route) =>
        route.fulfill({
          json: new URL(route.request().url()).searchParams.has('id') ? animal : [animal]
        })
      )
      await page.route('**/rest/v1/site_settings**', (route) => route.fulfill({ json: null }))
      await page.route('**/rest/v1/auctions**', (route) => route.fulfill({ json: [] }))
      const widths: string[] = []
      const originalWidth = surface === 'shop' ? '400' : '800'
      await page.route('https://wsrv.nl/**', (route) => {
        const url = new URL(route.request().url())
        if (!url.searchParams.get('url')?.includes('example.invalid')) return route.continue()
        const width = url.searchParams.get('w') || ''
        widths.push(width)
        return route.fulfill(
          width === originalWidth
            ? {
                contentType: 'image/svg+xml',
                body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="orange"/></svg>'
              }
            : { status: 404, body: '' }
        )
      })
      await page.goto('/shop')
      await ready(page)
      if (surface === 'product') await navigate(page, '/product/PHOTO-FOLLOWUP')
      const img = page.locator(surface === 'shop' ? '.flip-card img' : '.prod-main-img').first()
      await expect(img).toBeVisible()
      await expect
        .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
        .toBeGreaterThan(0)
      expect(widths.some((width) => width !== originalWidth)).toBe(true)
      expect(widths).toContain(originalWidth)
      await expect(img).not.toHaveAttribute('srcset')
    } finally {
      await context.close()
    }
  })
}

test('個體頁收藏儲存被拒絕時仍可切換收藏，不顯示全頁錯誤', async ({ page }) => {
  const animal = {
    id: 'STORAGE-FOLLOWUP',
    species: '豹紋守宮',
    morph: '收藏失敗防護測試',
    status: 'ForSale',
    listing_price: 8000,
    genes: [],
    image_url: ''
  }
  await page.route('**/rest/v1/animals**', (route) =>
    route.fulfill({
      json: new URL(route.request().url()).searchParams.has('id') ? animal : [animal]
    })
  )
  await page.route('**/rest/v1/site_settings**', (route) => route.fulfill({ json: null }))
  await page.route('**/rest/v1/auctions**', (route) => route.fulfill({ json: [] }))
  await page.goto('/shop')
  await ready(page)
  await navigate(page, '/product/STORAGE-FOLLOWUP')
  await expect(page.locator('.prod-title')).toBeVisible()
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'gencko_wishlist') throw new DOMException('blocked', 'SecurityError')
      return original.call(this, key, value)
    }
  })
  await page.getByRole('button', { name: '收藏此個體', exact: true }).click()
  await expect(page.getByRole('button', { name: '取消收藏此個體', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '取消收藏此個體', exact: true }).click()
  await expect(page.locator('.prod-title')).toBeVisible()
  await expect(page.getByText('頁面發生錯誤', { exact: true })).toHaveCount(0)
})

for (const surface of ['animal', 'hospital']) {
  test(`會員頁 ${surface} 收藏儲存被拒絕時仍能取消收藏`, async ({ page }) => {
    await page.route('**/rest/v1/animals**', (route) =>
      route.fulfill({
        json: [
          {
            id: 'MEMBER-FOLLOWUP',
            species: '豹紋守宮',
            morph: '會員收藏測試',
            status: 'ForSale',
            listing_price: 8000,
            genes: [],
            image_url: ''
          }
        ]
      })
    )
    await page.route('**/rest/v1/site_settings**', (route) => route.fulfill({ json: null }))
    await page.route('**/rest/v1/auctions**', (route) => route.fulfill({ json: [] }))
    await page.route('**/rest/v1/hospitals**', (route) =>
      route.fulfill({
        json: [
          {
            id: 'HOSP-FOLLOWUP',
            name: '收藏測試醫院',
            city: '台北市',
            district: '大同區',
            address: '測試路1號',
            phone: '02-12345678'
          }
        ]
      })
    )
    await page.goto('/shop')
    await ready(page)
    await expect(page.locator('.flip-card')).toHaveCount(1)
    await page.evaluate(() => {
      const store = (
        document.querySelector('#__nuxt') as any
      ).__vue_app__.config.globalProperties.$pinia._s.get('main')
      store.wishlist = ['MEMBER-FOLLOWUP']
      store.hospWishlist = ['HOSP-FOLLOWUP']
      const original = Storage.prototype.setItem
      Storage.prototype.setItem = function (key, value) {
        if (['gencko_wishlist', 'gencko_hosp_wishlist'].includes(key))
          throw new DOMException('blocked', 'SecurityError')
        return original.call(this, key, value)
      }
    })
    await navigate(page, '/profile')
    if (surface === 'hospital') await page.locator('.seg-tab').filter({ hasText: '醫院' }).click()
    const button = page.getByRole('button', {
      name: surface === 'hospital' ? '取消收藏 收藏測試醫院' : '取消收藏',
      exact: true
    })
    await expect(button).toBeVisible()
    await button.click()
    await expect(button).toHaveCount(0)
    await expect(page.getByText('頁面發生錯誤', { exact: true })).toHaveCount(0)
    await expect(page.locator('.seg-tab').first()).toBeVisible()
  })
}

test('直接開啟真實文章與圖鑑，伺服器必須回傳正文而非 500', async ({ request }) => {
  for (const [path, marker] of [
    ['/articles/ART-007', 'reader-content'],
    [`/genes/${encodeURIComponent('檸檬霜')}`, 'detail-txt']
  ]) {
    const response = await request.get(path)
    expect(response.status(), path).toBe(200)
    expect(await response.text()).toContain(marker)
  }
})

const text = '這是資料庫儲存的 HTML 文章，應維持單欄滿版並保留正常閱讀順序。'.repeat(35)
async function ready(page: Page) {
  await page.waitForFunction(() => {
    const app = (document.querySelector('#__nuxt') as any)?.__vue_app__?.config.globalProperties
      .$nuxt
    return app && !app.isHydrating
  })
}
async function navigate(page: Page, path: string) {
  await page.evaluate(
    (path) =>
      (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$router.push(
        path
      ),
    path
  )
}

test('直接進入指南也能看到知識庫並開啟繁殖延伸閱讀', async ({ page }) => {
  await page.goto('/care')
  await ready(page)
  await expect.poll(() => page.locator('.care-related-card').count()).toBeGreaterThan(0)
  await expect(page.locator('main')).toHaveCount(1)
  const article = page.locator('.care-inline-chips button').first()
  await expect(article).not.toHaveText('→ 相關閱讀')
  await article.click()
  await expect(page).toHaveURL(/\/articles\/ART-011$/)
})

test('直接進入比較頁也會核對競標資料並提供有效場次入口', async ({ page }) => {
  await page.route('**/rest/v1/animals**', (route) =>
    route.fulfill({
      json: [
        {
          id: 'REG-AUCTION',
          species: '豹紋守宮',
          morph: '回歸測試',
          status: 'Auction',
          listing_price: 200,
          genes: []
        }
      ]
    })
  )
  await page.route('**/rest/v1/site_settings**', (route) => route.fulfill({ json: null }))
  await page.route('**/rest/v1/auctions**', (route) =>
    route.fulfill({
      json: [
        {
          id: 'REG-SALE',
          animal_id: 'REG-AUCTION',
          status: 'active',
          end_time: new Date(Date.now() + 86400000).toISOString(),
          start_price: 200,
          current_price: 200
        }
      ]
    })
  )
  await page.goto('/compare?ids=REG-AUCTION')
  await ready(page)
  await expect(page.locator('.status-badge')).toHaveText('競標中')
  await expect(page.getByRole('link', { name: '前往競標', exact: true })).toHaveAttribute(
    'href',
    '/auction/REG-SALE'
  )
  await expect(page.locator('main')).toHaveCount(1)
})
async function articleFixture(page: Page, image = '') {
  await page.route('**/rest/v1/articles**', (route) => {
    const article = {
      id: 'REGRESSION-HTML',
      title: 'HTML 滿版回歸',
      status: 'published',
      category: '環境佈置',
      image_url: image,
      content: `<div class="gecko-article-container" style="max-width:500px"><style>.gecko-article-container{width:500px;line-height:1.3}</style><h2>第一章</h2><p>${text}</p></div>`
    }
    return route.fulfill({
      json: new URL(route.request().url()).searchParams.has('id') ? article : [article]
    })
  })
}

test('同一候選圖片的重複錯誤事件不會隱藏尚未失敗的原尺寸圖片', async ({ page }) => {
  await page.route('https://wsrv.nl/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="orange"/></svg>'
    })
  )
  await articleFixture(page, 'https://example.invalid/photo.jpg')
  await page.goto('/certificates')
  await ready(page)
  await navigate(page, '/articles/REGRESSION-HTML')
  const img = page.locator('.article-hero-image img')
  await expect(img).toHaveAttribute('srcset', /1200w/)
  await img.evaluate((element) => {
    element.dispatchEvent(new Event('error'))
    element.dispatchEvent(new Event('error'))
  })
  await expect(img).toBeVisible()
  await expect(img).not.toHaveAttribute('srcset')
  await expect
    .poll(() => img.evaluate((element: HTMLImageElement) => element.naturalWidth))
    .toBeGreaterThan(0)
  await expect(page.locator('.article-hero-image .article-image-fallback')).toHaveCount(0)
})

test('首次進站尚未執行 JS 時，不閃介紹文字且只保留原首頁按鈕', async ({
  browser,
  baseURL,
  isMobile
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 900 }
  })
  try {
    const page = await context.newPage()
    await page.goto('/')
    await expect(page.locator('.hero-static-intro, .hero-shop-link')).toHaveCount(0)
    await expect(page.locator('.hero-lab-home-link')).toHaveText('首頁')
    await expect(page.locator('.hero-lab-home-link')).toBeVisible()
    await expect(page.locator('.hero-lab-home-link')).toHaveCSS('color', 'rgb(255, 255, 255)')
    const hidden = await page.locator('.hero-lab .sr-only').evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      overflow: getComputedStyle(element).overflow
    }))
    expect(hidden.height).toBeLessThanOrEqual(1)
    expect(hidden.overflow).toBe('hidden')
  } finally {
    await context.close()
  }
})

for (const width of [390, 1440, 1920]) {
  test(`${width}px 資料庫 HTML 文章保持單欄滿版`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await articleFixture(page)
    await page.goto('/certificates')
    await ready(page)
    await navigate(page, '/articles/REGRESSION-HTML')
    await expect(page.locator('.reader-content p')).toHaveText(text)
    const geometry = await page.locator('.reader-content').evaluate((element) => {
      const paragraph = element.querySelector('p')!
      return {
        reader: element.getBoundingClientRect().width,
        paragraph: paragraph.getBoundingClientRect().width,
        columns: getComputedStyle(element).columnCount,
        max: document.querySelector('.article-page')!.getBoundingClientRect().width,
        scroll: document.documentElement.scrollWidth,
        viewport: innerWidth
      }
    })
    expect(['1', 'auto']).toContain(geometry.columns)
    expect(geometry.reader).toBeGreaterThan(geometry.max * 0.95)
    expect(geometry.paragraph).toBeGreaterThan(geometry.reader * 0.95)
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.viewport + 1)
  })

  test(`${width}px 無圖基因詳情保持單欄滿版`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.route('**/rest/v1/genetic_pages**', (route) => {
      const gene = {
        name: 'WY',
        brief: '基因簡介',
        detail: text,
        image_url: '',
        source: '公開參考來源'
      }
      return route.fulfill({
        json: new URL(route.request().url()).searchParams.has('name') ? gene : [gene]
      })
    })
    await page.goto('/certificates')
    await ready(page)
    await navigate(page, '/genes/WY')
    await expect(page.locator('.detail-txt')).toHaveText(text)
    const geometry = await page.locator('.detail-txt').evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      parent: document.querySelector('.gene-layout')!.getBoundingClientRect().width,
      columns: getComputedStyle(element).columnCount
    }))
    expect(['1', 'auto']).toContain(geometry.columns)
    expect(geometry.width).toBeGreaterThan(geometry.parent * 0.95)
  })
}

test('帶空白檔名的文章圖片候選失敗後改用原始尺寸，不永久隱藏照片', async ({ page }) => {
  const requests: string[] = []
  await page.route('https://wsrv.nl/**', (route) => {
    const url = route.request().url()
    if (!url.includes('Generated')) return route.continue()
    requests.push(url)
    return url.includes('w=1200')
      ? route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
      : route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="80" height="40" fill="orange"/></svg>'
        })
  })
  await articleFixture(
    page,
    'https://raw.githubusercontent.com/example/images/main/Generated%20Image%20May%2006%2C%202026.jpg'
  )
  await page.goto('/certificates')
  await ready(page)
  await navigate(page, '/articles/REGRESSION-HTML')
  const image = page.locator('.article-hero-image img')
  await expect(image).toBeVisible()
  await expect
    .poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
    .toBeGreaterThan(0)
  expect(requests.length).toBeGreaterThan(0)
  expect(requests.some((url) => url.includes('Generated+'))).toBe(false)
  expect(requests.some((url) => url.includes('w=800'))).toBe(true)
  await expect(page.locator('.article-hero-image .article-image-fallback')).toHaveCount(0)
})
