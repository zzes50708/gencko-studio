import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

// 目的：像 `extract-tw-outline.mjs` 一樣，把圖片中的守宮「外輪廓」抓成一條 polyline（點陣列）
// 推薦輸入：透明背景 PNG 或黑白剪影（最穩）
// 用法：node scripts/extract-gecko-outline.mjs assets/gecko-silhouette.png

const inputPath = process.argv[2]
const debug = process.argv.includes('--debug')
if (!inputPath) {
  console.error('Usage: node scripts/extract-gecko-outline.mjs <path-to-jpg>')
  process.exit(1)
}

const abs = path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath)
if (!fs.existsSync(abs)) {
  console.error(`File not found: ${abs}`)
  process.exit(1)
}

// 先縮小，避免噪點太多、輪廓太肥（你可以調這裡；越大越精細但也越吃效能）
const TARGET_W = 720

const { data, info } = await sharp(abs)
  .rotate()
  .resize({ width: TARGET_W, withoutEnlargement: true })
  .blur(0.6)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const { width: W, height: H, channels: C } = info
const idxOf = (x, y) => (y * W + x) * C

const mask = new Uint8Array(W * H)

// 遮罩建立優先序：
// 1) 有透明度（alpha）就用 alpha（剪影 PNG 最穩）
// 2) 沒 alpha 就用黑白閾值（黑剪影/白背景）
// 3) 再不行才用橘色 Hue（照片）

let aMin = 255
let aMax = 0
for (let i = 0; i < data.length; i += C) {
  const a = data[i + 3]
  if (a < aMin) aMin = a
  if (a > aMax) aMax = a
}
const useAlpha = aMin < 250

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = idxOf(x, y)
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]
    if (a < 10) continue

    let on = false
    if (useAlpha) {
      on = a > 20
    } else {
      // 黑剪影：用亮度判斷（越黑越像目標）
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
      if (lum < 0.45) {
        on = true
      } else {
        // fallback：照片橘色 Hue 區間
        const mx = Math.max(r, g, b)
        const mn = Math.min(r, g, b)
        const d = mx - mn
        const s = mx > 0 ? d / mx : 0
        const v = mx / 255
        let h = 0
        if (d > 1e-6) {
          if (mx === r) h = ((g - b) / d) % 6
          else if (mx === g) h = (b - r) / d + 2
          else h = (r - g) / d + 4
          h *= 60
          if (h < 0) h += 360
        }
        const hueOk = h >= 12 && h <= 55
        on = hueOk && s > 0.22 && v < 0.97 && v > 0.18
      }
    }
    mask[y * W + x] = on ? 1 : 0
  }
}

// 小型形態學：closing（先膨脹再侵蝕）把洞補起來，輪廓更連續
const dilate = (src) => {
  const out = new Uint8Array(src.length)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let on = 0
      for (let dy = -1; dy <= 1 && !on; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
          if (src[ny * W + nx]) { on = 1; break }
        }
      }
      out[y * W + x] = on
    }
  }
  return out
}

const erode = (src) => {
  const out = new Uint8Array(src.length)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let on = 1
      for (let dy = -1; dy <= 1 && on; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) { on = 0; break }
          if (!src[ny * W + nx]) { on = 0; break }
        }
      }
      out[y * W + x] = on
    }
  }
  return out
}

let m2 = mask
// closing 強度（可調：越大越能補洞，但輪廓會變胖）
for (let k = 0; k < 3; k++) m2 = dilate(m2)
for (let k = 0; k < 3; k++) m2 = erode(m2)

// 只保留最大連通塊（把背景雜訊點清掉）
{
  const seen = new Uint8Array(W * H)
  let bestStart = -1
  let bestSize = 0
  const qx = new Int32Array(W * H)
  const qy = new Int32Array(W * H)

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x
      if (!m2[idx] || seen[idx]) continue

      let head = 0, tail = 0
      seen[idx] = 1
      qx[tail] = x
      qy[tail] = y
      tail++
      let size = 0

      while (head < tail) {
        const cx = qx[head]
        const cy = qy[head]
        head++
        size++

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue
            const nx = cx + dx, ny = cy + dy
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
            const nidx = ny * W + nx
            if (!m2[nidx] || seen[nidx]) continue
            seen[nidx] = 1
            qx[tail] = nx
            qy[tail] = ny
            tail++
          }
        }
      }

      if (size > bestSize) {
        bestSize = size
        bestStart = idx
      }
    }
  }

  if (bestStart >= 0) {
    // 第二次 flood fill：把最大塊寫回到 m2
    const keep = new Uint8Array(W * H)
    let head = 0, tail = 0
    const sx = bestStart % W
    const sy = Math.floor(bestStart / W)
    qx[tail] = sx
    qy[tail] = sy
    tail++
    keep[bestStart] = 1
    while (head < tail) {
      const cx = qx[head]
      const cy = qy[head]
      head++
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue
          const nx = cx + dx, ny = cy + dy
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
          const nidx = ny * W + nx
          if (!m2[nidx] || keep[nidx]) continue
          keep[nidx] = 1
          qx[tail] = nx
          qy[tail] = ny
          tail++
        }
      }
    }
    m2 = keep
  }
}

// 填洞：把守宮內部的「黑洞」補起來，避免輪廓被切出凹洞
{
  // 先算 bbox（只在 bbox 內做洞填補，速度快很多）
  let minX = W, minY = H, maxX = -1, maxY = -1
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!m2[y * W + x]) continue
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  if (maxX >= 0) {
    const pad = 2
    minX = Math.max(0, minX - pad)
    minY = Math.max(0, minY - pad)
    maxX = Math.min(W - 1, maxX + pad)
    maxY = Math.min(H - 1, maxY + pad)

    const mark = new Uint8Array(W * H) // 1 = 外部背景（從 bbox 邊界可達）
    const qx = new Int32Array((maxX - minX + 1) * (maxY - minY + 1))
    const qy = new Int32Array(qx.length)
    let head = 0, tail = 0

    const push = (x, y) => {
      const idx = y * W + x
      if (mark[idx]) return
      if (m2[idx]) return // 不是背景洞
      mark[idx] = 1
      qx[tail] = x
      qy[tail] = y
      tail++
    }

    // bbox 四邊的背景作為起點
    for (let x = minX; x <= maxX; x++) { push(x, minY); push(x, maxY) }
    for (let y = minY; y <= maxY; y++) { push(minX, y); push(maxX, y) }

    while (head < tail) {
      const cx = qx[head]
      const cy = qy[head]
      head++
      for (let k = 0; k < 4; k++) {
        const dx = k === 0 ? 1 : k === 1 ? -1 : 0
        const dy = k === 2 ? 1 : k === 3 ? -1 : 0
        const nx = cx + dx, ny = cy + dy
        if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue
        push(nx, ny)
      }
    }

    // bbox 內：不是外部背景、又是 off 的 => 洞，填成 on
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = y * W + x
        if (!m2[idx] && !mark[idx]) m2[idx] = 1
      }
    }
  }
}

if (debug) {
  const outRGBA = Buffer.alloc(W * H * 4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const on = m2[y * W + x] ? 255 : 0
      const i = (y * W + x) * 4
      outRGBA[i] = on
      outRGBA[i + 1] = on
      outRGBA[i + 2] = on
      outRGBA[i + 3] = 255
    }
  }
  const base = path.join(process.env.TEMP || process.cwd(), 'gecko-mask.png')
  await sharp(outRGBA, { raw: { width: W, height: H, channels: 4 } }).png().toFile(base)
  console.error(`[debug] wrote ${base}`)
}

// Bounding box
let minX = W, minY = H, maxX = -1, maxY = -1
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (!m2[y * W + x]) continue
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
}
if (maxX < 0) {
  console.error('No gecko pixels detected. Try relaxing thresholds (s/v/orangeish) or resize/blur settings.')
  process.exit(1)
}

const isEdge = (x, y) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return false
  if (!m2[y * W + x]) return false
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue
      const nx = x + dx, ny = y + dy
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) return true
      if (!m2[ny * W + nx]) return true
    }
  }
  return false
}

// 找起點：最上最左的 edge
let sx = -1, sy = -1
for (let y = minY; y <= maxY && sy < 0; y++) {
  for (let x = minX; x <= maxX; x++) {
    if (isEdge(x, y)) { sx = x; sy = y; break }
  }
}
if (sx < 0) {
  console.error('No edge found. Try adjusting closing/thresholds.')
  process.exit(1)
}

const dirs = [
  [1, 0], [1, 1], [0, 1], [-1, 1],
  [-1, 0], [-1, -1], [0, -1], [1, -1],
]

let cx = sx, cy = sy
let prevDir = 0
const boundary = []

boundary.push([cx + 0.5, cy + 0.5])

const maxSteps = (maxX - minX + 1) * (maxY - minY + 1) * 6
for (let step = 0; step < maxSteps; step++) {
  let found = false
  const start = (prevDir + 6) % 8
  for (let k = 0; k < 8; k++) {
    const di = (start + k) % 8
    const [dx, dy] = dirs[di]
    const nx = cx + dx, ny = cy + dy
    if (isEdge(nx, ny)) {
      cx = nx; cy = ny; prevDir = di
      boundary.push([cx + 0.5, cy + 0.5])
      found = true
      break
    }
  }
  if (!found) break
  if (cx === sx && cy === sy && boundary.length > 40) break
}

// Ramer–Douglas–Peucker
const distPointToSeg = (p, a, b) => {
  const [px, py] = p
  const [ax, ay] = a
  const [bx, by] = b
  const abx = bx - ax, aby = by - ay
  const apx = px - ax, apy = py - ay
  const ab2 = abx * abx + aby * aby
  const t = ab2 ? Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2)) : 0
  const cx = ax + abx * t, cy = ay + aby * t
  const dx = px - cx, dy = py - cy
  return Math.sqrt(dx * dx + dy * dy)
}

const rdp = (pts, eps) => {
  if (pts.length <= 2) return pts
  let maxD = 0
  let idx = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const d = distPointToSeg(pts[i], pts[0], pts[pts.length - 1])
    if (d > maxD) { maxD = d; idx = i }
  }
  if (maxD <= eps) return [pts[0], pts[pts.length - 1]]
  const left = rdp(pts.slice(0, idx + 1), eps)
  const right = rdp(pts.slice(idx), eps)
  return left.slice(0, -1).concat(right)
}

// 正規化到場景座標（跟台灣輪廓同一套路）
const bbW = (maxX - minX + 1)
const bbH = (maxY - minY + 1)

const norm = boundary.map(([x, y]) => {
  const nx = (x - (minX + bbW / 2)) / bbH
  const ny = (y - (minY + bbH / 2)) / bbH
  return [nx, -ny]
})

let eps = 0.0007
let simplified = rdp(norm, eps)
while (simplified.length > 320 && eps < 0.03) {
  eps *= 1.22
  simplified = rdp(norm, eps)
}

// 讓半高落在 ~2.2（跟台灣相近，之後在生成器再做 S 倍率）
const targetHalfH = 2.2
const out = simplified.map(([x, y]) => [+(x * targetHalfH * 0.95).toFixed(3), +(y * targetHalfH).toFixed(3)])

// close polygon
if (out.length && (out[0][0] !== out[out.length - 1][0] || out[0][1] !== out[out.length - 1][1])) {
  out.push([...out[0]])
}

console.log(JSON.stringify(out, null, 2))
