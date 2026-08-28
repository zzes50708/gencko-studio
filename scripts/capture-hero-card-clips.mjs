import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

const baseUrl = process.env.HERO_CAPTURE_BASE_URL ?? 'http://127.0.0.1:3100'
const outputDir = resolve(
  process.env.HERO_CAPTURE_OUTPUT ?? 'C:/Users/User/AppData/Local/Temp/gencko-hero-atlas'
)
const clipsDir = resolve(outputDir, 'clips')
const viewport = { width: 480, height: 270 }
const routes = [
  '/care',
  '/articles',
  '/why-gencko',
  '/breeders',
  '/shop',
  '/genes',
  '/calculator',
  '/hospital'
]

const captureOnlyContentStyle = `
  .marquee-container,
  .sticky-nav,
  .reading-progress-bar,
  .bottom-nav,
  .skip-to-content,
  #main-content .care-anchor-nav,
  #main-content .care-progress-bar,
  #main-content .category-nav-row,
  #vue-tracer-overlay,
  [id*="nuxt-devtools"],
  [id*="vue-devtools"] {
    display: none !important;
  }

  #main-content {
    padding-top: 0 !important;
    margin-top: 0 !important;
  }
`

await rm(outputDir, { recursive: true, force: true })
await mkdir(clipsDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const manifest = []

async function waitForMainContent(page) {
  await page.locator('#main-content > *').first().waitFor({ state: 'attached', timeout: 15_000 })
  await page.waitForTimeout(900)
}

async function scrollMainContent(page) {
  // 用多段滾動帶出實際內容，避免只錄到頁面首屏。
  for (const delta of [180, 300, 360, -120]) {
    await page.mouse.wheel(0, delta)
    await page.waitForTimeout(850)
  }
}

async function captureCalculator(page) {
  const firstParent = page.locator('.calc-parent-card').first()
  const category = firstParent.locator('.calc-category-chip').first()
  if (await category.count()) {
    await category.click()
    await page.waitForTimeout(450)
  }

  const gene = firstParent.locator('.calc-dd-item').first()
  if (await gene.count()) {
    await gene.click()
    await page.waitForTimeout(850)
  }

  await scrollMainContent(page)
}

async function captureHospital(page) {
  const firstHospital = page.locator('.hosp-card').first()
  if (await firstHospital.count()) {
    await firstHospital.locator('.hosp-header').click()
    await page.waitForTimeout(900)
  }

  await scrollMainContent(page)
}

const routeActions = {
  '/calculator': captureCalculator,
  '/hospital': captureHospital
}

try {
  for (const [index, route] of routes.entries()) {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      recordVideo: { dir: clipsDir, size: viewport }
    })
    const page = await context.newPage()
    const video = page.video()

    try {
      // 在 document-start 注入，避免錄影開頭短暫露出跑馬燈或固定導覽列。
      await page.addInitScript((styleText) => {
        const installStyle = () => {
          if (document.querySelector('style[data-hero-capture="content-only"]')) return
          const style = document.createElement('style')
          style.dataset.heroCapture = 'content-only'
          style.textContent = styleText
          ;(document.head ?? document.documentElement)?.appendChild(style)
        }

        if (document.documentElement) installStyle()
        else {
          const observer = new MutationObserver(() => {
            if (!document.documentElement) return
            installStyle()
            observer.disconnect()
          })
          observer.observe(document, { childList: true, subtree: true })
        }
      }, captureOnlyContentStyle)
      await page.goto(`${baseUrl}${route}`, {
        waitUntil: 'domcontentloaded',
        timeout: 120_000
      })
      await waitForMainContent(page)
      if (routeActions[route]) await routeActions[route](page)
      else await scrollMainContent(page)
    } finally {
      await context.close()
    }

    if (!video) throw new Error(`未取得 ${route} 的影片錄製結果`)
    const sourcePath = await video.path()
    const targetPath = resolve(clipsDir, `${String(index).padStart(2, '0')}.webm`)
    await rename(sourcePath, targetPath)
    manifest.push({
      index,
      route,
      path: targetPath,
      capture: routeActions[route] ? 'scroll-and-interact' : 'content-scroll'
    })
    console.log(`[hero-capture] ${route} -> ${targetPath}`)
  }
} finally {
  await browser.close()
}

await writeFile(resolve(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
console.log(`[hero-capture] manifest -> ${resolve(outputDir, 'manifest.json')}`)
