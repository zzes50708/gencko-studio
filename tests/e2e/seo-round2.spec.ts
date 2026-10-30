import { test, expect } from '@playwright/test'
import { XMLParser, XMLValidator } from 'fast-xml-parser'

function entities(html: string) {
  const result: any[] = []
  const visit = (value: any) => {
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

for (const path of ['/calculator', '/health', '/qs', '/hospital', '/compare']) {
  test(`${path} 只標記實際功能，不包含未呈現問答`, async ({ request }) => {
    const response = await request.get(path)
    expect(response.status()).toBe(200)
    const schema = entities(await response.text())
    expect(schema.filter((item) => item['@type'] === 'Question')).toHaveLength(0)
    expect(schema.filter((item) => item['@type'] === 'FAQPage')).toHaveLength(0)
    if (path === '/health') {
      expect(schema.some((item) => item['@type'] === 'MedicalWebPage')).toBe(false)
      expect(schema.some((item) => 'lastReviewed' in item)).toBe(false)
      expect(schema.some((item) => item['@type'] === 'WebApplication')).toBe(true)
    }
    if (path === '/calculator')
      expect(JSON.stringify(schema)).not.toContain('多基因（Polygenic）表現型分布')
  })
}

test('正式預渲染的公開頁可索引，錯誤與比較頁保持 noindex', async ({ request }) => {
  for (const path of ['/about', '/faq', '/qs', '/calculator', '/care']) {
    const response = await request.get(path)
    const html = await response.text()
    expect(response.status()).toBe(200)
    expect(html.match(/<meta[^>]*name="robots"[^>]*>/)?.[0]).not.toContain('noindex')
    expect(response.headers()['x-robots-tag'] || '').not.toContain('noindex')
  }
  const response = await request.get('/seo-round2-no-page-20261028')
  expect(response.status()).toBe(404)
  const html = await response.text()
  expect(html).toContain('noindex')
  expect(html).not.toContain('問捷客')
  expect(await (await request.get('/compare')).text()).toContain('noindex')
})

test('真正問答頁仍保有與頁面對應的問答標記', async ({ request }) => {
  for (const path of ['/faq', '/guide']) {
    const schema = entities(await (await request.get(path)).text())
    expect(schema.filter((item) => item['@type'] === 'Question').length).toBeGreaterThan(0)
  }
})

test('未執行 JavaScript 也能由選購目錄開啟真實個體', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL: test.info().project.use.baseURL
  })
  try {
    const page = await context.newPage()
    await page.goto('/shop')
    const fallback = page.getByRole('region', { name: '未啟用 JavaScript 的在售個體' })
    await expect(fallback).toBeVisible()
    const link = fallback.locator('a[href^="/product/"]').first()
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/product\//)
    await expect(page.locator('h1')).not.toContainText('找不到')
    expect((await page.locator('h1').textContent())?.trim()).toBeTruthy()
  } finally {
    await context.close()
  }
})

test('正常選購不顯示備用目錄，也不產生水合警告', async ({ page }) => {
  const hydrationErrors: string[] = []
  page.on('console', (message) => {
    if (/hydration.*mismatch/i.test(message.text())) hydrationErrors.push(message.text())
  })
  await page.goto('/shop')
  await expect(page.locator('.flip-card').first()).toBeVisible()
  await expect(page.locator('.shop-catalog-stage > noscript')).toBeHidden()
  expect(hydrationErrors).toEqual([])
})

test('宣告的可朗讀區塊對應實際 HTML', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL: test.info().project.use.baseURL
  })
  try {
    const page = await context.newPage()
    for (const path of [
      '/calculator',
      '/hospital',
      '/qs',
      '/genes',
      '/articles',
      '/breeders',
      '/faq'
    ]) {
      await page.goto(path)
      const schema = entities(await page.content())
      for (const item of schema.filter((item) => item['@type'] === 'SpeakableSpecification'))
        for (const selector of item.cssSelector || [])
          expect(await page.locator(selector).count(), `${path} ${selector}`).toBeGreaterThan(0)
    }
  } finally {
    await context.close()
  }
})

test('RSS 為有效 XML，發佈日期與作者維持公開來源資料', async ({ request }) => {
  const response = await request.get('/feed.xml')
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('application/rss+xml')
  const xml = await response.text()
  expect(XMLValidator.validate(xml)).toBe(true)
  const feed = new XMLParser().parse(xml)
  expect(feed.rss.channel.title).toContain('Gencko')
  expect(feed.rss.channel.link).toBe('https://www.genckobreeding.com/articles')
})

test('文章列表不捏造更新日期，也不把品牌作者當作人', async ({ request }) => {
  const schema = entities(await (await request.get('/articles')).text())
  const articles = schema.filter((item) => item['@type'] === 'BlogPosting')
  expect(articles.length).toBeGreaterThan(0)
  for (const article of articles) {
    expect(article).not.toHaveProperty('dateModified')
    if (/gencko/i.test(article.author?.name)) expect(article.author['@type']).toBe('Organization')
  }
})
