import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const inputPath = process.argv[2]
if (!inputPath) {
  console.error('Usage: node scripts/extract-tw-outline.mjs <path-to-png>')
  process.exit(1)
}

const abs = path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath)
if (!fs.existsSync(abs)) {
  console.error(`File not found: ${abs}`)
  process.exit(1)
}

const { data, info } = await sharp(abs).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H, channels: C } = info

const idxOf = (x, y) => (y * W + x) * C

// Build a binary mask for the silhouette.
// Prefer alpha if present (transparent bg); otherwise detect the blue silhouette fill.
const mask = new Uint8Array(W * H)

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

    let on = false
    if (useAlpha) {
      on = a > 20
    } else {
      // Blue silhouette (typical sample: r~10 g~170 b~230), background is near-white.
      const blueish = r < 120 && b > 170 && g > 80 && g < 245 && (b - g) > 25
      on = blueish
    }
    mask[y * W + x] = on ? 1 : 0
  }
}

// Find bounding box of "on" pixels.
let minX = W, minY = H, maxX = -1, maxY = -1
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (!mask[y * W + x]) continue
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
}
if (maxX < 0) {
  console.error('No silhouette pixels detected. Check the image (alpha/blue threshold).')
  process.exit(1)
}

// Edge predicate: on-pixel that has at least one off neighbor.
const isEdge = (x, y) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return false
  if (!mask[y * W + x]) return false
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue
      const nx = x + dx, ny = y + dy
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) return true
      if (!mask[ny * W + nx]) return true
    }
  }
  return false
}

// Moore-neighbor tracing to get a boundary polyline (pixel centers).
// Start from top-most, left-most edge pixel.
let sx = -1, sy = -1
for (let y = minY; y <= maxY && sy < 0; y++) {
  for (let x = minX; x <= maxX; x++) {
    if (isEdge(x, y)) { sx = x; sy = y; break }
  }
}
if (sx < 0) {
  console.error('No edge found.')
  process.exit(1)
}

const dirs = [
  [1, 0], [1, 1], [0, 1], [-1, 1],
  [-1, 0], [-1, -1], [0, -1], [1, -1],
]
const dirIndex = (dx, dy) => dirs.findIndex(d => d[0] === dx && d[1] === dy)

let cx = sx, cy = sy
let prevDir = 0 // arbitrary initial direction
const boundary = []
const visited = new Set()

const key = (x, y) => `${x},${y}`
boundary.push([cx + 0.5, cy + 0.5])
visited.add(key(cx, cy))

// Limit steps to avoid infinite loops on weird masks.
const maxSteps = (maxX - minX + 1) * (maxY - minY + 1) * 4
for (let step = 0; step < maxSteps; step++) {
  // Search neighbors starting from (prevDir + 6) (turn-left preference)
  let found = false
  const start = (prevDir + 6) % 8
  for (let k = 0; k < 8; k++) {
    const di = (start + k) % 8
    const [dx, dy] = dirs[di]
    const nx = cx + dx, ny = cy + dy
    if (isEdge(nx, ny)) {
      cx = nx; cy = ny; prevDir = di
      const p = [cx + 0.5, cy + 0.5]
      boundary.push(p)
      found = true
      break
    }
  }
  if (!found) break
  if (cx === sx && cy === sy && boundary.length > 20) break
  // stop if we keep oscillating between few points
  const k0 = key(cx, cy)
  if (visited.has(k0) && boundary.length > 2000) break
  visited.add(k0)
}

// Ramer–Douglas–Peucker simplification
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

// Normalize to our scene coordinate system similar to existing TW_OUTLINE:
// - keep aspect ratio
// - center at (0, 0)
// - scale height to ~4.3 units (roughly matches existing generator range)
const bbW = (maxX - minX + 1)
const bbH = (maxY - minY + 1)

const norm = boundary.map(([x, y]) => {
  const nx = (x - (minX + bbW / 2)) / bbH
  const ny = (y - (minY + bbH / 2)) / bbH
  return [nx, -ny] // flip Y so up is positive
})

// Simplify in normalized space (auto-tune epsilon to keep point count reasonable)
let eps = 0.0025
let simplified = rdp(norm, eps)
while (simplified.length > 180 && eps < 0.02) {
  eps *= 1.25
  simplified = rdp(norm, eps)
}

// Scale to target height ~4.3 (so half-height ~2.15)
const targetHalfH = 2.15
const out = simplified.map(([x, y]) => [+(x * targetHalfH * 0.95).toFixed(3), +(y * targetHalfH).toFixed(3)])

// Ensure closed polygon
if (out.length && (out[0][0] !== out[out.length - 1][0] || out[0][1] !== out[out.length - 1][1])) {
  out.push([...out[0]])
}

console.log(JSON.stringify(out, null, 2))
