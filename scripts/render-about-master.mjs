import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import net from 'node:net'
import ffmpegPath from 'ffmpeg-static'
import { chromium } from 'playwright'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const args = process.argv.slice(2)
const getArg = (name, fallback) => {
  const idx = args.findIndex(a => a === `--${name}`)
  if (idx === -1) return fallback
  const v = args[idx + 1]
  return v ?? fallback
}

const width = Number(getArg('width', '1920'))
const height = Number(getArg('height', '1080'))
const fps = Number(getArg('fps', '60'))
const holdSec = Number(getArg('hold', '2.5'))
const transSec = Number(getArg('trans', '1.2'))
const requestedPort = Number(getArg('port', '4173'))
const outDir = path.resolve(repoRoot, getArg('out', 'out/about-master'))
const quality = Number(getArg('quality', '92'))
const cleanup = (() => {
  const v = getArg('cleanup', 'false')
  return v === true || v === 'true' || v === '1' || v === 'yes'
})()
const fresh = (() => {
  const v = getArg('fresh', 'false')
  return v === true || v === 'true' || v === '1' || v === 'yes'
})()

const scenes = 6
const durationSec = scenes * holdSec + (scenes - 1) * transSec
const frames = Math.round(durationSec * fps)

const findOpenPort = async (startPort, maxTries = 20) => {
  const tryPort = (p) => new Promise((resolve) => {
    const s = net.createServer()
    s.unref()
    s.on('error', () => resolve(false))
    s.listen({ host: '127.0.0.1', port: p }, () => {
      s.close(() => resolve(true))
    })
  })

  for (let i = 0; i <= maxTries; i++) {
    const p = startPort + i
    // eslint-disable-next-line no-await-in-loop
    if (await tryPort(p)) return p
  }
  throw new Error(`No open port found starting from ${startPort}`)
}

const waitForHttpOk = async (url, timeoutMs = 90_000) => {
  const t0 = Date.now()
  while (Date.now() - t0 < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'manual' })
      if (res.status >= 200 && res.status < 500) return
    } catch {}
    await new Promise(r => setTimeout(r, 300))
  }
  throw new Error(`Dev server not reachable: ${url}`)
}

const run = async () => {
  const framesDir = path.join(outDir, 'frames')
  if (fresh) {
    await fs.rm(framesDir, { recursive: true, force: true })
  }
  await fs.mkdir(framesDir, { recursive: true })

  const port = await findOpenPort(requestedPort, 30)
  const devUrl = `http://127.0.0.1:${port}/?export=1&fps=${fps}&hold=${holdSec}&trans=${transSec}`

  // 先 build，再用 `.output/server/index.mjs` 啟動（避免 `nuxt dev` 監看檔案造成反覆重編譯）
  const buildProc = process.platform === 'win32'
    ? spawn('cmd.exe', ['/c', 'npm.cmd', 'run', 'build'], { cwd: repoRoot, stdio: 'inherit', windowsHide: true })
    : spawn('npm', ['run', 'build'], { cwd: repoRoot, stdio: 'inherit' })

  await new Promise((resolve, reject) => {
    buildProc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`build exit code ${code}`))))
    buildProc.on('error', reject)
  })

  const serverEntry = path.join(repoRoot, '.output', 'server', 'index.mjs')
  const serverProc = spawn(process.execPath, [serverEntry], {
    cwd: repoRoot,
    stdio: 'pipe',
    windowsHide: true,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      NITRO_PORT: String(port),
      NITRO_HOST: '127.0.0.1',
    },
  })

  serverProc.stdout.on('data', (d) => process.stdout.write(d))
  serverProc.stderr.on('data', (d) => process.stderr.write(d))

  try {
    await waitForHttpOk(devUrl)

    // Windows 有時會擋 Playwright 內建的 headless shell（EPERM）。
    // 先嘗試使用系統安裝的 Edge，再 fallback 到 Playwright 下載的 Chromium。
    let browser = null
    try {
      if (process.platform === 'win32') {
        browser = await chromium.launch({
          channel: 'msedge',
          headless: true,
          args: ['--disable-dev-shm-usage'],
        })
      }
    } catch {}
    if (!browser) {
      browser = await chromium.launch({
        headless: true,
        args: ['--disable-dev-shm-usage'],
      })
    }
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()

    await page.goto(devUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.stage', { timeout: 60_000 })
    await page.waitForTimeout(600)

    for (let i = 0; i < frames; i++) {
      const filename = path.join(framesDir, `frame${String(i + 1).padStart(6, '0')}.jpg`)
      // 逐幀驅動：用 frame index 決定時間軸位置，與「實際截圖速度」解耦
      await page.evaluate((frame) => {
        window.__GENCKO_EXPORT_FRAME = frame
        window.dispatchEvent(new Event('gencko-export-frame'))
      }, i)
      // 等兩個 rAF，讓畫面穩定到下一幀再截圖
      await page.evaluate(() => new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      }))
      await page.screenshot({ path: filename, type: 'jpeg', quality })
      if ((i + 1) % (fps * 2) === 0) {
        process.stdout.write(`[render] ${(i + 1)}/${frames} frames\n`)
      }
    }

    await browser.close()

    if (!ffmpegPath) {
      throw new Error('ffmpeg-static not found. Please run: npm i -D ffmpeg-static')
    }

    const outMp4 = path.join(outDir, `about-master-${width}x${height}-${fps}fps.mp4`)
    const ffArgs = [
      '-y',
      '-framerate', String(fps),
      '-i', path.join(framesDir, 'frame%06d.jpg'),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-crf', '18',
      '-preset', 'slow',
      outMp4,
    ]

    await new Promise((resolve, reject) => {
      const p = spawn(ffmpegPath, ffArgs, { cwd: repoRoot, stdio: 'inherit', windowsHide: true })
      p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit code ${code}`))))
      p.on('error', reject)
    })

    if (cleanup) {
      await fs.rm(framesDir, { recursive: true, force: true })
    }

    process.stdout.write(`[done] ${outMp4}\n`)
  } finally {
    serverProc.kill()
  }
}

run().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
