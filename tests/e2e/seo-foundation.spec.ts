import { test, expect } from '@playwright/test'
import { SITE_URL, WEBSITE_AT_ID, ORG_AT_ID } from '../../utils/site-constants'
import { FAQ_DATA } from '../../utils/faq'

function headData(html: string) {
  const head = html.match(/<head\b[\s\S]*?<\/head>/i)?.[0] || ''
  const attrs = (text: string) =>
    Object.fromEntries(
      [...text.matchAll(/([\w:-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]])
    )
  const meta = [...head.matchAll(/<meta\b[^>]*>/gi)].map((match) => attrs(match[0]))
  const links = [...head.matchAll(/<link\b[^>]*>/gi)].map((match) => attrs(match[0]))
  const ld = [
    ...head.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
  ].map((match) => JSON.parse(match[1]))
  return { meta, links, ld }
}

for (const path of [
  '/',
  '/home',
  '/certificates',
  '/buying-guide',
  '/start-here',
  '/why-gencko',
  '/merch',
  '/genes',
  '/articles',
  '/shop',
  '/faq',
  '/auction'
]) {
  test(`SSR ${path} 分享與品牌標記完整、不重複`, async ({ request }) => {
    const response = await request.get(path)
    expect(response.status()).toBe(200)
    const { meta, links, ld } = headData(await response.text())
    for (const key of [
      'description',
      'og:title',
      'og:description',
      'og:url',
      'og:image',
      'twitter:title',
      'twitter:description',
      'twitter:image',
      'robots'
    ]) {
      const values = meta.filter((tag) => tag.name === key || tag.property === key)
      expect(values, `${path} ${key}`).toHaveLength(1)
      expect(values[0].content).toBeTruthy()
    }
    const canonical = links.filter((tag) => tag.rel === 'canonical')
    expect(canonical).toHaveLength(1)
    expect(meta.find((tag) => tag.property === 'og:url')?.content).toBe(canonical[0].href)
    expect(canonical[0].href).toBe(`${SITE_URL}${path}`)
    expect(ld.filter((item) => item['@type'] === 'WebSite')).toHaveLength(1)
    expect(ld.find((item) => item['@type'] === 'WebSite')['@id']).toBe(WEBSITE_AT_ID)
    expect(ld.find((item) => item['@type'] === 'Organization')['@id']).toBe(ORG_AT_ID)
  })
}

test('私人頁及不存在的內容維持不索引，查詢參數不進 canonical', async ({ request }) => {
  for (const path of [
    '/profile',
    '/compare?ids=A,B',
    '/auction-management',
    '/line-login-return?status=failed',
    '/identity/S-36564'
  ]) {
    const data = headData(await (await request.get(path)).text())
    expect(data.meta.find((tag) => tag.name === 'robots')?.content).toContain('noindex')
    expect(data.links.find((tag) => tag.rel === 'canonical')?.href).not.toContain('?')
  }
  const missing = await request.get('/articles/SEO-NONEXISTENT-20261028')
  expect(missing.status()).toBe(404)
  expect(
    headData(await missing.text()).meta.find((tag) => tag.name === 'robots')?.content
  ).toContain('noindex')
})

test('真實商品標記沒有虛構運送、退貨或售價期限', async ({ request }) => {
  const response = await request.get('/product/S-36564')
  expect(response.status()).toBe(200)
  const { ld } = headData(await response.text())
  const product = ld.find((item) => item.mainEntity?.['@type'] === 'Product')?.mainEntity
  expect(product).toBeTruthy()
  expect(product.offers.price).toBeGreaterThan(0)
  expect(product.offers).not.toHaveProperty('priceValidUntil')
  expect(product.offers).not.toHaveProperty('shippingDetails')
  expect(product.offers).not.toHaveProperty('hasMerchantReturnPolicy')
  expect(product.description).not.toContain('100%')
})

test('文章與競標不輸出未顯示的問答，基因詞條帶有來源連結', async ({ request }) => {
  for (const path of ['/articles/ART-007', '/auction']) {
    const json = headData(await (await request.get(path)).text()).ld
    expect(JSON.stringify(json)).not.toContain('FAQPage')
    if (path.startsWith('/articles/')) expect(JSON.stringify(json)).not.toContain('dateModified')
  }
  const { ld } = headData(await (await request.get('/genes/WY')).text())
  const article = ld.find((item) => item.hasPart?.['@type'] === 'Article')?.hasPart
  expect(article).toBeTruthy()
  expect(article.citation.some((url: string) => url.startsWith('https://'))).toBe(true)
})

test('AI 導覽與問答為純文字、正確品牌並與公開 FAQ 同源', async ({ request }) => {
  const response = await request.get('/llms.txt')
  expect(response.headers()['content-type']).toContain('text/plain')
  const text = await response.text()
  expect(text).toContain('Gencko Breeding Studio')
  expect(text).not.toContain('捷客')
  const full = await (await request.get('/llms-full.txt')).text()
  for (const question of FAQ_DATA) expect(full).toContain(`#### ${question.title}`)
})

test('搜尋與訓練爬蟲分開控制，網站地圖納入證書入口而排除私人頁', async ({ request }) => {
  let robots = await (await request.get('/robots.txt')).text()
  // 開發站預設禁止索引；以模組提供的預覽參數確認正式爬蟲規則。
  if (robots.includes('DEVELOPMENT HINTS'))
    robots = await (await request.get('/robots.txt?mockProductionEnv')).text()
  const groups = robots.split(/\n\s*\n/)
  expect(groups.find((group) => group.includes('User-agent: Claude-SearchBot'))).toContain(
    'Allow: /'
  )
  expect(groups.find((group) => group.includes('User-agent: ClaudeBot\n'))).toContain('Disallow: /')
  expect(groups.find((group) => group.includes('User-agent: GPTBot\n'))).toContain('Disallow: /')
  const urls = await (await request.get('/api/_sitemap-urls')).json()
  expect(urls.some((item: any) => item.loc === '/certificates')).toBe(true)
  expect(
    urls.some((item: any) =>
      /^\/(profile|identity|auction-management|line-login-return|compare)(?:\/|$)/.test(item.loc)
    )
  ).toBe(false)
  const xml = await (await request.get('/sitemap.xml')).text()
  expect(xml).toContain('/certificates</loc>')
})

test('站內換頁時重新推導分享標記，保留專用摘要且不殘留上一頁', async ({ page }) => {
  await page.goto('/certificates')
  await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as any)?.__vue_app__)
  for (const path of ['/faq', '/care', '/buying-guide']) {
    await page.locator(`footer a[href="${path}"]`).first().click()
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${SITE_URL}${path}`
    )
    await expect(page.locator('head meta[name="twitter:title"]')).toHaveCount(1)
    await expect(page.locator('head meta[name="twitter:title"]')).toHaveAttribute(
      'content',
      (await page.locator('head meta[property="og:title"]').getAttribute('content')) || ''
    )
    await expect(page.locator('head meta[name="robots"]')).not.toHaveAttribute('content', /noindex/)
  }
})
