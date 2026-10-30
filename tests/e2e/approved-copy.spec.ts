import { test, expect } from '@playwright/test'
import approved from '../fixtures/approved-site-copy-2026-10-28.json' with { type: 'json' }

const decode = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
function head(html: string) {
  const content = html.match(/<head\b[\s\S]*?<\/head>/i)?.[0] || ''
  const tags = [...content.matchAll(/<meta\b[^>]*>/gi)].map((m) =>
    Object.fromEntries([...m[0].matchAll(/([\w:-]+)="([^"]*)"/g)].map((a) => [a[1], decode(a[2])]))
  )
  return {
    title: decode(content.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ''),
    meta: (key: string) => tags.filter((m) => m.name === key || m.property === key)
  }
}

for (const row of approved.routes) {
  test(`核准文案 ${row.path}：搜尋與分享依使用者指定，且不重複`, async ({ request }) => {
    const response = await request.get(row.path)
    expect(response.status()).toBe(200)
    const html = await response.text()
    const data = head(html)
    expect(data.title).toBe(row.title)
    if (row.h1) {
      const h1 = decode(
        html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '') || ''
      )
      expect(h1.replace(/\s+/g, '')).toBe(row.h1.replace(/\s+/g, ''))
    }
    for (const [key, value] of Object.entries({
      description: row.description,
      'og:title': row.ogTitle,
      'og:description': row.ogDescription,
      'twitter:title': row.ogTitle,
      'twitter:description': row.ogDescription
    })) {
      expect(data.meta(key), key).toHaveLength(1)
      expect(data.meta(key)[0].content, key).toBe(value)
    }
  })
}

test('品牌入口、品牌結構化介紹、醫院與 App 使用核准文字', async ({ request }) => {
  const root = await (await request.get('/')).text()
  const data = head(root)
  expect(data.title).toBe('Gencko Studio')
  expect(data.meta('description')[0].content).toBe(approved.brand['品牌簡介'])
  expect(data.meta('og:description')[0].content).toBe(approved.brand['品牌簡介'])
  for (const path of ['/', '/about']) {
    const html = path === '/' ? root : await (await request.get(path)).text()
    expect(html).toContain(approved.brand['品牌標語'])
    expect(html).toContain(approved.brand['品牌簡介'])
  }
  const hospital = head(await (await request.get('/hospital')).text())
  expect(hospital.title).toBe('全台特寵醫院查詢｜爬蟲、守宮、兩棲動物獸醫地圖 | Gencko Studio')
  expect(hospital.meta('description')[0].content).toBe(
    '全台爬蟲、守宮、兩棲動物等特殊寵物醫院名單，提供電話、地址與 Google Maps 導航。Gencko Breeding Studio 整理之全台特寵獸醫資源，協助飼主在第一時間找到專業醫療協助。'
  )
  expect(hospital.meta('og:title')[0].content).toBe(
    '全台 特寵醫院查詢｜爬蟲、守宮、兩棲動物獸醫地圖'
  )
  const manifest = await (await request.get('/manifest.webmanifest')).json()
  expect(manifest.name).toBe('Gencko Studio')
  expect(manifest.short_name).toBe('Gencko')
  expect(manifest.description).toBe('Gencko Studio 提供守宮選購、基因計算機與特寵醫院查詢。')
})

test('個體摘要只列核准資料，保留商品基因與售價紀錄', async ({ request }) => {
  const html = await (await request.get('/product/P-01358')).text()
  const data = head(html)
  expect(data.title).toBe('蜜橘貝爾♀ | Gencko Studio')
  expect(data.meta('description')[0].content).toBe(
    '蜜橘貝爾（母），生日2025-07-13。售價NT$1680。查看個體照片與資料，購買、交付及售後安排請依官網購買規定並向 Gencko 官方 LINE 確認。'
  )
  expect(data.meta('og:title')[0].content).toBe('蜜橘貝爾♀')
  expect(html).toContain('基因組合')
  expect(html).toContain('橘化')
  expect(html).toContain('1680')
})

test('證書的頁籤與分享標題依指定區分，仍不索引', async ({ request }) => {
  const data = head(await (await request.get('/identity/S-53518')).text())
  expect(data.title).toMatch(/｜個體證書 \| Gencko Studio$/)
  expect(data.meta('description')[0].content).toMatch(/^Gencko Studio 嚴選選育個體。/)
  expect(data.meta('og:title')[0].content).toMatch(/｜個體血統證書 \| Gencko Studio$/)
  expect(data.meta('robots')[0].content).toContain('noindex')
})

test('AI 導覽品牌介紹改選育，問答仍共用原內容', async ({ request }) => {
  const short = await (await request.get('/llms.txt')).text()
  const full = await (await request.get('/llms-full.txt')).text()
  expect(short).toContain('Gencko Studio 是台灣的豹紋守宮與肥尾守宮選育工作室。')
  expect(full).toContain(short)
  expect(full).toContain('官網常見問題全文')
})

for (const width of [320, 390, 1440, 1920]) {
  test(`${width}px 基因正文與內容區同寬，不向右溢出`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/genes/' + encodeURIComponent('檸檬霜'))
    const content = page.locator('.gene-layout--text-only .gene-text-content')
    await expect(content).toBeVisible()
    const dimensions = await content.evaluate((element) => ({
      text: element.getBoundingClientRect().width,
      layout: element.parentElement!.getBoundingClientRect().width,
      screen: innerWidth,
      document: document.documentElement.scrollWidth,
      maxWidth: getComputedStyle(element).maxWidth
    }))
    expect(dimensions.text).toBeGreaterThan(dimensions.layout - 2)
    expect(dimensions.maxWidth).toBe('none')
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.screen)
    await page.screenshot({ path: `output/approved-copy-gene-${width}.png`, fullPage: true })
  })
}

test('桌機與手機的導覽名稱換頁後維持核准版本', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/home')
  const footer = page.locator('footer')
  await expect(footer.getByRole('heading', { name: '新手知識' })).toHaveCount(1)
  await expect(footer.getByRole('heading', { name: '基因工具' })).toHaveCount(1)
  await expect(footer.getByRole('heading', { name: '品牌服務' })).toHaveCount(1)
  await expect(footer.getByRole('link', { name: '飼養評估', exact: true })).toHaveAttribute(
    'href',
    '/qs'
  )
  await expect(footer.getByRole('link', { name: '基因計算', exact: true })).toHaveAttribute(
    'href',
    '/calculator'
  )
  await expect(footer.getByRole('link', { name: '選擇我們', exact: true })).toHaveAttribute(
    'href',
    '/why-gencko'
  )
  await expect(footer).toContainText('從基因、照護到選購，每一個階段都有依據。')
  await footer.getByRole('link', { name: '購買流程', exact: true }).click()
  await expect(page).toHaveURL(/\/buying-guide$/)
  await expect(page).toHaveTitle(approved.routes.find((r) => r.path === '/buying-guide')!.title)
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    'content',
    '流程一項一項看，要做什麼一目了然。'
  )
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
