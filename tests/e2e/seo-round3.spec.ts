import { test, expect } from '@playwright/test'

function entities(html: string) {
  const result: any[] = []
  function visit(value: any) {
    if (Array.isArray(value)) return value.forEach(visit)
    if (value && typeof value === 'object') {
      if (value['@type']) result.push(value)
      Object.values(value).forEach(visit)
    }
  }
  for (const match of html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g
  ))
    visit(JSON.parse(match[1]))
  return result
}

test('全站物種連結使用已核對的實際物種，不指向電影或演員', async ({ request }) => {
  const expected: Record<string, string> = {
    'Eublepharis macularius': 'https://www.wikidata.org/wiki/Q256860',
    'Hemitheconyx caudicinctus': 'https://www.wikidata.org/wiki/Q2087254',
    'Heterodon nasicus': 'https://www.wikidata.org/wiki/Q1441196'
  }
  let checked = 0
  for (const path of [
    '/home',
    '/about',
    '/articles',
    '/articles/ART-007',
    '/genes',
    '/genes/WY',
    '/auction',
    '/breeders',
    '/calculator',
    '/care',
    '/health',
    '/qs',
    '/shop'
  ]) {
    const response = await request.get(path)
    expect(response.status()).toBe(200)
    for (const item of entities(await response.text()).filter(
      (item) => item['@type'] === 'Taxon' && item.sameAs
    )) {
      expect(item.sameAs, `${path} ${item.name}`).toBe(expected[item.name])
      checked++
    }
  }
  expect(checked).toBeGreaterThan(20)
})

test('未執行 JavaScript 的首頁已有四篇文章，並可開啟文章', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false })
  try {
    const page = await context.newPage()
    await page.goto('/home')
    const cards = page.locator('.article-card')
    await expect(cards).toHaveCount(4)
    const dates = await cards.locator('time').allTextContents()
    const numeric = dates.map((date) => Date.parse(date.trim())).filter(Number.isFinite)
    expect(numeric).toEqual([...numeric].sort((a, b) => b - a))
    const schema = entities(await page.content()).find(
      (item) => item['@type'] === 'ItemList' && item.name === '最新文章'
    )
    expect(schema.numberOfItems).toBe(4)
    expect(schema.itemListElement.map((item: any) => item.item.headline)).toEqual(
      (await cards.locator('h3').allTextContents()).map((title) => title.trim())
    )
    await cards.first().locator('a').click()
    await expect(page).toHaveURL(/\/articles\//)
    await expect(page.locator('h1')).not.toContainText('不存在')
  } finally {
    await context.close()
  }
})

test('首頁文章預載不重複讀取，並且正常水合', async ({ page }) => {
  const articleRequests: string[] = []
  const warnings: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/rest/v1/articles')) articleRequests.push(request.url())
  })
  page.on('console', (message) => {
    if (/hydration.*mismatch/i.test(message.text())) warnings.push(message.text())
  })
  await page.goto('/home')
  await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as any)?.__vue_app__)
  await expect(page.locator('.article-card')).toHaveCount(4)
  await expect(page.locator('.article-card').first().locator('a')).toBeVisible()
  expect(articleRequests).toEqual([])
  expect(warnings).toEqual([])
})

test('無 JavaScript 也可閱讀種群資料，不建立不能使用的商品入口', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false })
  try {
    const page = await context.newPage()
    await page.goto('/breeders')
    const fallback = page.getByRole('region', { name: '未啟用 JavaScript 的種群展示' })
    await expect(fallback).toBeVisible()
    expect(await fallback.locator('article').count()).toBeGreaterThan(0)
    await expect(fallback).toContainText('ID：')
    await expect(fallback.locator('a[href^="/product/"]')).toHaveCount(0)
    expect(await fallback.textContent()).not.toContain('NT$')
  } finally {
    await context.close()
  }
})

test('正常種群維持卡片及語意編號，不顯示基本版本或出現水合警告', async ({ page }) => {
  const warnings: string[] = []
  page.on('console', (message) => {
    if (/hydration.*mismatch/i.test(message.text())) warnings.push(message.text())
  })
  await page.goto('/breeders')
  await expect(page.locator('.breeder-photo-card').first()).toBeVisible()
  await expect(page.locator('.breeders-directory-stage>noscript')).toBeHidden()
  await expect(page.locator('.breeder-photo-card').first()).toHaveAttribute('id', /^breeder-/)
  expect(warnings).toEqual([])
})

test('基因條目標題不對缺乏物種欄位的資料固定宣稱為豹紋守宮', async ({ request }) => {
  const schema = entities(await (await request.get('/genes/WY')).text())
  const article = schema.find((item) => item['@type'] === 'Article')
  expect(article.headline).toContain('守宮基因圖鑑')
  expect(article.headline).not.toContain('Eublepharis macularius')
})

test('補足預設分享圖片替代說明，換頁不殘留上一頁內容', async ({ page }) => {
  await page.goto('/certificates')
  await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as any)?.__vue_app__)
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveCount(1)
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', /個體證書/)
  await page.locator('footer a[href="/buying-guide"]').click()
  await expect(page).toHaveURL(/\/buying-guide$/)
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', /購買流程/)
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveCount(1)
})
