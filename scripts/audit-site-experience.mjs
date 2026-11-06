import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const baseURL = process.env.AUDIT_URL || 'http://127.0.0.1:3108'
const output = process.env.AUDIT_OUTPUT || 'output/site-experience/baseline'
await fs.mkdir(output, { recursive: true })
async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : path.join(directory, entry.name)))).flat()
}
const files = (await walk('pages')).filter(file => file.endsWith('.vue'))
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const discovery = await browser.newPage({ baseURL, serviceWorkers: 'block' })
const samples = { 'merch/[id]': '/merch/experience-preview' }
for (const [listing, prefix, key] of [['/shop', '/product/', 'product/[id]'], ['/articles', '/articles/', 'articles/[id]'], ['/genes', '/genes/', 'genes/[id]'], ['/auction', '/auction/', 'auction/[id]']]) {
  await discovery.goto(listing, { waitUntil: 'domcontentloaded' })
  await discovery.waitForFunction(() => !!document.querySelector('#__nuxt')?.__vue_app__)
  const target = discovery.locator(`a[href^="${prefix}"]`).first()
  await target.waitFor({ state: 'attached', timeout: 8000 }).catch(() => {})
  samples[key] = await target.getAttribute('href', { timeout: 1000 }).catch(() => `${prefix}experience-not-found`)
}
samples['identity/[id]'] = samples['product/[id]'].replace('/product/', '/identity/')
await discovery.close()
const routes = files.map(file => {
  const slug = file.replaceAll('\\', '/').replace(/^pages\//, '').replace(/\.vue$/, '')
  const route = samples[slug] || '/' + slug.replace(/(^|\/)index$/, '')
  return { file: file.replaceAll('\\', '/'), route, fallback: route.includes('experience-not-found') }
})
// 動畫入口最後檢查，避免大型場景影響一般內容頁的基準量測。
routes.sort((a, b) => Number(['/', '/about', '/hero-lab'].includes(a.route)) - Number(['/', '/about', '/hero-lab'].includes(b.route)))
const results = []
for (const width of (process.env.AUDIT_WIDTHS || '390,1440').split(',').map(Number)) {
  const context = await browser.newContext({ baseURL, viewport: { width, height: 900 }, isMobile: width < 768, hasTouch: width < 768 || process.env.AUDIT_TOUCH === '1', serviceWorkers: 'block', reducedMotion: 'reduce' })
  if (process.env.AUDIT_THEME === 'dark') {
    await context.addInitScript(() => localStorage.setItem('gencko_theme', 'dark'))
  }
  const page = await context.newPage()
  let errors = []
  page.on('pageerror', error => errors.push(error.message))
  for (const [index, entry] of routes.entries()) {
    errors = []
    try {
      const response = await page.goto(entry.route, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForFunction(() => {
        const app = document.querySelector('#__nuxt')?.__vue_app__
        return app && !app.config.globalProperties.$nuxt.isHydrating
      }, undefined, { timeout: 20000 })
      await page.waitForFunction(() => !document.querySelector('#main-content .skeleton'), undefined, { timeout: 8000 }).catch(() => {})
      await page.evaluate(async () => {
        await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 1500))])
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        const images = [...document.querySelectorAll('#main-content img')].filter(image => {
          const box = image.getBoundingClientRect()
          return box.width > 0 && box.top < innerHeight && box.bottom > 0
        })
        let imageDeadline
        await Promise.race([
          Promise.all(images.map(image => image.decode().catch(() => {}))),
          new Promise(resolve => { imageDeadline = setTimeout(resolve, 4000) })
        ])
        clearTimeout(imageDeadline)
      })
      const metrics = await page.evaluate(() => {
        const visible = el => {
          const r = el.getBoundingClientRect(), s = getComputedStyle(el)
          return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && s.clip === 'auto' && !el.closest('[inert], [aria-hidden="true"], .sr-only, .hsp__a11y')
        }
        const label = el => el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent?.trim().replace(/\s+/g, ' ').slice(0, 70) || el.getAttribute('placeholder') || el.tagName
        const box = el => {
          const r = el.getBoundingClientRect(), s = getComputedStyle(el)
          return { name: label(el), tag: el.tagName, class: String(el.className).slice(0, 100), width: Math.round(r.width), height: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y), font: s.fontSize }
        }
        const main = document.querySelector('#main-content') || document.querySelector('main') || document.body
        return {
          url: location.pathname,
          title: document.title,
          pointerCoarse: matchMedia('(pointer: coarse)').matches,
          overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
          pendingPlaceholders: main.querySelectorAll('.skeleton').length,
          smallTextInputs: [...main.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]):not([type="hidden"]),textarea,select')].filter(visible).filter(el => parseFloat(getComputedStyle(el).fontSize) < 16).map(box),
          headings: [...main.querySelectorAll('h1:not(.sr-only)')].filter(visible).map(box),
          smallControls: [...main.querySelectorAll('button,input:not([type="hidden"]):not([type="file"]),select')].filter(visible).filter(el => !el.disabled).map(el => box(el.matches('input[type="checkbox"],input[type="radio"]') ? el.closest('label') || el : el)).filter(el => el.height < 40 || el.width < 32),
          clippedText: [...main.querySelectorAll('h1,h2,h3,p,button,label')].filter(visible).filter(el => el.scrollWidth > el.clientWidth + 3 && getComputedStyle(el).whiteSpace !== 'nowrap').map(box).slice(0, 15),
          brokenImages: [...main.querySelectorAll('img')].filter(visible).filter(el => el.complete && el.naturalWidth === 0).map(el => ({ alt: el.alt, src: el.currentSrc || el.src })).slice(0, 10),
          moving: [...main.querySelectorAll('*')].filter(visible).filter(el => { const s = getComputedStyle(el); return s.animationName !== 'none' && parseFloat(s.animationDuration) > .01 && s.animationPlayState !== 'paused' }).map(box).slice(0, 20)
        }
      })
      const screenshot = `${width}-${String(index).padStart(2, '0')}-${entry.file.replaceAll('/', '_').replace('.vue', '')}.png`
      await page.screenshot({ path: path.join(output, screenshot), timeout: 15000 })
      results.push({ ...entry, width, status: response?.status(), ...metrics, errors: [...errors], screenshot })
      console.log(JSON.stringify({ width, route: entry.route, overflow: metrics.overflow, small: metrics.smallControls.length, clipped: metrics.clippedText.length, moving: metrics.moving.length, errors: errors.length }))
    } catch (error) {
      results.push({ ...entry, width, error: error.message, errors: [...errors] })
      console.log(JSON.stringify({ width, route: entry.route, error: error.message.slice(0, 160) }))
    }
    await fs.writeFile(path.join(output, 'metrics.json'), JSON.stringify({ baseURL, routes, results }, null, 2))
  }
  await context.close()
  const shots = results.filter(item => item.width === width && item.screenshot)
  const thumbWidth = width < 768 ? 160 : 300
  const thumbHeight = Math.round(900 / width * thumbWidth)
  const columns = width < 768 ? 8 : 4
  const inputs = []
  for (const [index, shot] of shots.entries()) {
    inputs.push({ input: await sharp(path.join(output, shot.screenshot)).resize(thumbWidth, thumbHeight).toBuffer(), left: (index % columns) * thumbWidth, top: Math.floor(index / columns) * thumbHeight })
  }
  await sharp({ create: { width: columns * thumbWidth, height: Math.ceil(shots.length / columns) * thumbHeight, channels: 3, background: '#ddd' } }).composite(inputs).png().toFile(path.join(output, `overview-${width}.png`))
}
await browser.close()
console.log(JSON.stringify({ templates: routes.length, visits: results.length, problems: results.filter(item => item.error || item.overflow || item.errors?.length).length }))
