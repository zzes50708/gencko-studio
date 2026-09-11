import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import sharp from 'sharp'

const run = promisify(execFile)
const baseURL = process.env.HERO_CAPTURE_BASE_URL || 'http://localhost:3000'
const ffmpeg = process.env.HERO_CAPTURE_FFMPEG
if (!ffmpeg) throw new Error('請設定 HERO_CAPTURE_FFMPEG 編碼器路徑')
const output = 'public/previews/20260911'
const work = `.tmp/hero-previews-${Date.now()}`
const routes = ['care', 'articles', 'why-gencko', 'breeders', 'shop', 'genes', 'calculator', 'hospital']
await mkdir(output, { recursive: true })
await mkdir(work, { recursive: true })
const browser = await chromium.launch({ headless: true })
const manifest = []
try {
  for (const [index, slug] of routes.entries()) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${baseURL}/${slug}`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__))
    await page.addStyleTag({ content: '[id*="nuxt-devtools"], .bottom-nav, .scroll-to-top { display:none!important } * { scroll-behavior:auto!important }' })
    await page.evaluate(async () => {
      window.__lenis?.destroy()
      await document.fonts.ready
      for (const image of document.images) if (image.getBoundingClientRect().top < innerHeight * 2) image.loading = 'eager'
      await Promise.all([...document.images].filter(image => image.loading !== 'lazy').map(image => image.decode().catch(() => {})))
    })
    if (slug === 'shop') await expect(page.locator('.flip-card').first()).toBeVisible({ timeout: 30000 })
    if (slug === 'breeders') await expect(page.locator('.breeder-photo-card, .breeder-card, .breeders-grid img').first()).toBeVisible({ timeout: 30000 })
    // 等待真實頁面完成進場，首張照片與影片不包含 skeleton 或字型閃動。
    await page.waitForTimeout(1200)
    const frames = resolve(work, slug)
    await mkdir(frames, { recursive: true })
    const poster = await page.screenshot()
    await sharp(poster).webp({ quality: 94 }).toFile(`${output}/${slug}.webp`)
    const travel = await page.evaluate(() => Math.min(620, Math.max(0, document.documentElement.scrollHeight - innerHeight)))
    for (let frame = 0; frame < 48; frame++) {
      const phase = Math.max(0, Math.min(1, (frame - 8) / 32))
      const eased = phase * phase * (3 - 2 * phase)
      await page.evaluate(y => scrollTo(0, y), travel * eased)
      await page.screenshot({ path: `${frames}/${String(frame).padStart(3, '0')}.png` })
    }
    if (errors.length) throw new Error(`${slug}: ${errors.join('; ')}`)
    await context.close()
    await run(ffmpeg, ['-y', '-framerate', '12', '-i', `${frames}/%03d.png`, '-vf', 'fps=24', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${output}/${slug}.mp4`], { windowsHide: true })
    manifest.push({ index, route: `/${slug}`, width: 1280, height: 720, video: `${slug}.mp4`, poster: `${slug}.webp`, errors })
    console.log(`已擷取新版 ${slug}`)
  }
} finally { await browser.close() }
const filters = routes.map((slug, i) => `[${i}:v]scale=960:540:flags=lanczos[v${i}]`)
filters.push('[v0][v1][v2][v3][v4][v5][v6][v7]xstack=inputs=8:layout=0_0|960_0|1920_0|2880_0|0_540|960_540|1920_540|2880_540[out]')
await run(ffmpeg, ['-y', ...routes.flatMap(slug => ['-i', `${output}/${slug}.mp4`]), '-filter_complex', filters.join(';'), '-map', '[out]', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${output}/atlas.mp4`], { windowsHide: true })
const tiles = await Promise.all(routes.map(async (slug, i) => ({ input: await sharp(`${output}/${slug}.webp`).resize(960, 540).toBuffer(), left: i % 4 * 960, top: Math.floor(i / 4) * 540 })))
await sharp({ create: { width: 3840, height: 1080, channels: 3, background: '#fff' } }).composite(tiles).webp({ quality: 94 }).toFile(`${output}/atlas.webp`)
await writeFile(`${output}/manifest.json`, JSON.stringify({ generated: new Date().toISOString(), baseURL, cards: manifest }, null, 2))
console.log('高清影片、照片與共用圖集完成')
