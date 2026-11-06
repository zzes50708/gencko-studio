import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const base = process.env.AUDIT_URL || 'http://127.0.0.1:3001'
const routes = ['/', '/home', '/shop', '/articles', '/articles/ART-007', '/genes', '/genes/' + encodeURIComponent('檸檬霜'), '/breeders', '/care', '/start-here', '/guide', '/health', '/qs', '/faq', '/calculator', '/hospital', '/buying-guide', '/why-gencko', '/about', '/stories', '/merch', '/certificates', '/compare', '/profile', '/auction', '/auction-management', '/line-login-return', '/hero-lab']
// 動態頁挑選目前仍公開的實際個體，避免只驗證空白／錯誤頁。
const sitemap = await fetch(new URL('/api/_sitemap-urls', base), { signal: AbortSignal.timeout(20000) })
if (!sitemap.ok) throw new Error('無法取得公開頁面清單，停止版面驗證。')
const links = await sitemap.json()
const product = links.find((row) => row.loc?.startsWith('/product/'))?.loc
if (product) routes.push(product, product.replace('/product/', '/identity/'))
const auction = links.find((row) => row.loc?.startsWith('/auction/'))?.loc
if (auction) routes.push(auction)
const widths = process.env.AUDIT_WIDTHS?.split(',').map(Number) || [375, 430, 1440, 1920]
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const jobs = widths.flatMap((width) => routes.map((path) => ({ width, path })))
const results = []
let cursor = 0
await mkdir('output/layout-validation-results', { recursive: true })
async function worker() {
  while (cursor < jobs.length) {
    const { width, path } = jobs[cursor++]
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', isMobile: width < 768, hasTouch: width < 768, serviceWorkers: 'block' })
    const page = await context.newPage()
    const errors = []
    const findings = []
    let scans = 0
    page.on('pageerror', (error) => errors.push(error.message))
    try {
      const response = await page.goto(base + path, { waitUntil: 'domcontentloaded' })
      if (response.status() >= 400) throw new Error(`HTTP ${response.status()}`)
      await page.waitForFunction(() => {
        const app = document.querySelector('#__nuxt')?.__vue_app__?.config.globalProperties.$nuxt
        return app && !app.isHydrating
      })
      // 只展開純內容折疊，絕不點擊出價、收藏、登入或管理操作。
      for (const summary of await page.locator('main details:not([open]) > summary').all()) {
        if (await summary.isVisible()) await summary.click()
      }
      let bottom = false
      for (let step = 0; step < 80; step++) {
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
        await page.waitForTimeout(150)
        const snapshot = await page.evaluate(async () => {
          const visible = (el) => {
            const r = el.getBoundingClientRect(), s = getComputedStyle(el)
            return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0 && s.visibility !== 'hidden' && s.display !== 'none'
          }
          const images = [...document.querySelectorAll('main img')].filter(visible)
          await Promise.race([Promise.all(images.map((img) => img.decode?.().catch(() => {}))), new Promise((resolve) => setTimeout(resolve, 2000))])
          return { overflow: document.documentElement.scrollWidth > innerWidth + 1, broken: images.filter((img) => img.complete && !img.naturalWidth && visible(img)).map((img) => img.alt), bottom: scrollY + innerHeight >= document.documentElement.scrollHeight - 2 }
        })
        scans++
        if (snapshot.overflow || snapshot.broken.length) findings.push({ step, ...snapshot })
        if (snapshot.bottom) { bottom = true; break }
        await page.evaluate(() => window.scrollBy(0, innerHeight * .8))
      }
      if (!bottom) findings.push({ error: '長頁面在 80 次捲動後仍未到底，需人工檢查。' })
    } catch (error) { findings.push({ error: error.message }) }
    const result = { path, width, scans, errors, findings }
    results.push(result)
    console.log(JSON.stringify({ path, width, scans, errors: errors.length, findings: findings.length }))
    await writeFile('output/layout-validation-results/full-page-layout.json', JSON.stringify(results, null, 2))
    await context.close()
  }
}
const workerCount = process.env.AUDIT_WORKERS === '1' ? 1 : 2
try { await Promise.all(Array.from({ length: workerCount }, () => worker())) } finally { await browser.close() }
if (results.some((row) => row.errors.length || row.findings.length)) process.exitCode = 1
