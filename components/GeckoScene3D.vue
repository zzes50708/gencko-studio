<script setup>
import * as THREE from 'three'
import { useLoop, useTresContext } from '@tresjs/core'
import { shallowRef, onUnmounted, watch, watchEffect } from 'vue'
import { GECKO_OUTLINE } from '@/data/gecko-outline'
import { gsap } from 'gsap'

const props = defineProps({
  scene:          { type: Number,  default: 0 },
  snapTrigger:    { type: Number,  default: 0 },
  transitionInfo: { type: Object,  default: () => ({ from: -1, to: -1, ts: 0 }) },
  isDayMode:      { type: Boolean, default: false },
})

// 動畫速度倍率：0.3 = 全部動畫放慢到原本的 30%
const MOTION_SPEED = 0.7

// 手機（touch）減少粒子數，桌機保留完整數量
const isMobileDevice =
  typeof window !== 'undefined' &&
  !window.matchMedia('(hover: hover) and (pointer: fine)').matches

const COUNT   = isMobileDevice ? 2000 : 3500
// 粒子分組：與 genMicroWithDna 保持完全一致，確保 morph 時粒子對應正確
const MICRO_N = Math.floor(COUNT * 0.72)  // 灑點組（場景1→場景2 形成守宮輪廓）
const DNA_N   = COUNT - MICRO_N           // DNA 組（場景1→場景2 保留 DNA，場景2→場景3 匯集成填充）

const lerp = (a, b, t) => a + (b - a) * t

// 場景2：灑點→守宮輪廓，DNA→DNA（保持原位）
// 粒子順序：[前 MICRO_N 個 = 守宮輪廓] + [後 DNA_N 個 = DNA 螺旋]
function genGeckoDNA() {
  const a = new Float32Array(COUNT * 3)
  const outline = GECKO_OUTLINE
  const S = 2.28, xOffset = 0.10, yOffset = -0.35
  let i = 0

  // 前 MICRO_N：灑點 → 守宮輪廓（循環輪廓線，高密度剪影）
  for (let j = 0; j < MICRO_N; j++) {
    const t = (j / Math.max(1, MICRO_N - 1)) * (outline.length - 1)
    const si = Math.floor(t)
    const frac = t - si
    const p0 = outline[Math.min(si, outline.length - 2)]
    const p1 = outline[Math.min(si + 1, outline.length - 1)]
    a[i++] = (p0[0] + (p1[0] - p0[0]) * frac) * S + xOffset + (Math.random() - 0.5) * 0.025
    a[i++] = (p0[1] + (p1[1] - p0[1]) * frac) * S + yOffset + (Math.random() - 0.5) * 0.025
    a[i++] = (Math.random() - 0.5) * 0.06
  }

  // 後 DNA_N：場景1 DNA → 原地保留（scale/yOffset 與場景1完全相同）
  const dnaPts = genDnaLadder({ count: DNA_N, scale: 0.72, yOffset: -0.15 })
  // 套用與場景1相同的 Y 軸旋轉（-15°）確保粒子連續
  const cy = Math.cos(-Math.PI / 12), sy = Math.sin(-Math.PI / 12)
  for (let j = 0; j < DNA_N; j++) {
    const x = dnaPts[j * 3], z = dnaPts[j * 3 + 2]
    a[i++] = x * cy - z * sy
    a[i++] = dnaPts[j * 3 + 1]
    a[i++] = x * sy + z * cy
  }

  while (i < COUNT * 3) a[i++] = 0
  return a
}

// 場景3：灑點→守宮輪廓（同場景2），DNA→守宮內部填充（DNA 匯集進體內）
// 粒子順序：[前 MICRO_N 個 = 守宮輪廓] + [後 DNA_N 個 = 內部散點]
function genGeckoFill() {
  const a = new Float32Array(COUNT * 3)
  const outline = GECKO_OUTLINE
  const S = 2.28, xOffset = 0.10, yOffset = -0.35
  let i = 0

  // 前 MICRO_N：守宮輪廓（與 genGeckoDNA 完全相同位置，morph 時輪廓不動）
  for (let j = 0; j < MICRO_N; j++) {
    const t = (j / Math.max(1, MICRO_N - 1)) * (outline.length - 1)
    const si = Math.floor(t)
    const frac = t - si
    const p0 = outline[Math.min(si, outline.length - 2)]
    const p1 = outline[Math.min(si + 1, outline.length - 1)]
    a[i++] = (p0[0] + (p1[0] - p0[0]) * frac) * S + xOffset + (Math.random() - 0.5) * 0.025
    a[i++] = (p0[1] + (p1[1] - p0[1]) * frac) * S + yOffset + (Math.random() - 0.5) * 0.025
    a[i++] = (Math.random() - 0.5) * 0.06
  }

  // 後 DNA_N：DNA → 守宮內部散點（DNA 匯集成填充）
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of outline) {
    if (p[0] < minX) minX = p[0]
    if (p[0] > maxX) maxX = p[0]
    if (p[1] < minY) minY = p[1]
    if (p[1] > maxY) maxY = p[1]
  }
  const pad = 0.06
  minX -= pad; maxX += pad; minY -= pad; maxY += pad

  let placed = 0, tries = 0
  while (placed < DNA_N && tries < DNA_N * 200) {
    tries++
    const x = lerp(minX, maxX, Math.random())
    const y = lerp(minY, maxY, Math.random())
    if (pointInPoly(x, y, outline)) {
      a[i++] = x * S + xOffset + (Math.random() - 0.5) * 0.06
      a[i++] = y * S + yOffset + (Math.random() - 0.5) * 0.06
      a[i++] = (Math.random() - 0.5) * 0.38
      placed++
    }
  }

  while (i < COUNT * 3) a[i++] = 0
  return a
}

function genMicro() {
  const a = new Float32Array(COUNT * 3)
  for (let j = 0; j < COUNT; j++) {
    // 場景 2（微觀）：灑點範圍縮小一點（更集中）
    const r = 2.5 + Math.random() * 1
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    a[j * 3] = r * Math.sin(phi) * Math.cos(theta)
    a[j * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.75
    a[j * 3 + 2] = r * Math.cos(phi) * 0.8
  }
  return a
}

function genAccent(count, rMin, rMax, yScale) {
  const a = new Float32Array(count * 3)
  for (let j = 0; j < count; j++) {
    const r = rMin + Math.random() * (rMax - rMin)
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    a[j * 3] = r * Math.sin(phi) * Math.cos(theta)
    a[j * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * yScale
    a[j * 3 + 2] = r * Math.cos(phi) * 0.75
  }
  return a
}

function genDnaLadder({ count = COUNT, scale = 1, xOffset = 0, yOffset = 0, zOffset = 0 } = {}) {
  const a = new Float32Array(count * 3)

  // DNA：兩股螺旋 + 橫桿（像常駐 DNA 裝飾的「梯子」）
  const strandBudget = Math.floor(count * 0.5)
  const rungBudget = count - strandBudget
  const perStrand = Math.floor(strandBudget / 2)

  const R = 0.6 * scale
  const H = 8.0 * scale
  const TURNS = 1.3

  let w = 0
  const write = (x, y, z) => {
    const idx = w * 3
    if (idx > a.length - 3) return false
    a[idx] = x + xOffset
    a[idx + 1] = y + yOffset
    a[idx + 2] = z + zOffset
    w++
    return true
  }

  // 1) 兩股螺旋
  const strandN = Math.max(1, perStrand)
  for (let s = 0; s < 2; s++) {
    const off = s * Math.PI
    for (let j = 0; j < strandN; j++) {
      const t = j / Math.max(1, strandN - 1)
      const ang = t * TURNS * Math.PI * 2 + off
      const x = R * Math.cos(ang) + (Math.random() - 0.5) * 0.04
      const y = t * H - H / 1.8 + (Math.random() - 0.5) * 0.03
      const z = R * Math.sin(ang) + (Math.random() - 0.5) * 0.04
      if (!write(x, y, z)) break
    }
  }

  // 2) 橫桿：固定 y 階梯，沿兩股之間直線灑點（看起來會是一條條橫桿）
  const rungLines = 28
  const ptsPerRung = Math.max(3, Math.floor(rungBudget / rungLines))
  for (let ri = 0; ri < rungLines; ri++) {
    const t = (ri + 0.5) / rungLines
    const angA = t * TURNS * Math.PI * 2
    const angB = angA + Math.PI

    const x1 = R * Math.cos(angA)
    const y0 = t * H - H / 1.8
    const z1 = R * Math.sin(angA)
    const x2 = R * Math.cos(angB)
    const z2 = R * Math.sin(angB)

    for (let k = 0; k < ptsPerRung; k++) {
      const u = k / Math.max(1, ptsPerRung - 1)
      const x = x1 + (x2 - x1) * u + (Math.random() - 0.5) * 0.010
      const y = y0 + (Math.random() - 0.5) * 0.008
      const z = z1 + (z2 - z1) * u + (Math.random() - 0.5) * 0.010
      if (!write(x, y, z)) break
    }
  }

  // 補齊餘量：沿螺旋分布，避免原點方塊
  while (w < count) {
    const idx = w * 3
    const t   = (w % Math.max(1, strandN)) / Math.max(1, strandN - 1)
    const ang  = t * TURNS * Math.PI * 2
    a[idx]     = R * Math.cos(ang) + xOffset
    a[idx + 1] = t * H - H / 1.8 + yOffset
    a[idx + 2] = R * Math.sin(ang) + zOffset
    w++
  }
  return a
}

// 灑點 + 縮小 DNA（DNA 被包在灑點裡）
function genMicroWithDna() {
  const a = new Float32Array(COUNT * 3)

  const microN = Math.floor(COUNT * 0.72)
  const dnaN = COUNT - microN

  for (let j = 0; j < microN; j++) {
    const r = 2.05 + Math.random() * 0.85
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    a[j * 3] = r * Math.sin(phi) * Math.cos(theta)
    a[j * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.68
    a[j * 3 + 2] = r * Math.cos(phi) * 0.78
  }

  // 這裡的 DNA 要跟「計算機 DNA」完全同一套（同樣的螺旋參數），只做等比例縮小塞進灑點內
  // 注意：scale 是額外縮放倍率，基礎形狀與 genDnaLadder() 一致
  // 場景1的 DNA 需與「原本計算機 DNA」完全同一套參數（只調 count/yOffset 讓它放在灑點中心）
  const dna = genDnaLadder({ count: dnaN, scale: 0.72, yOffset: -0.15 })
  // 場景1 的 DNA：Y 軸順時針轉 15 度（只轉 DNA，不影響灑點本體）
  // 「順時針」：以鏡頭視角感受為準，這裡用正角度（若你覺得方向仍相反再對調正負號即可）
  const yaw = (Math.PI / 12)
  // 修正：先前這裡的 DNA 產生/旋轉被註解吃掉，導致場景 1 看不到 DNA 或旋轉方向不對。
  // 這裡改用 dnaPts（避免跟你本機可能改過的變數名衝突）。
  const dnaPts = genDnaLadder({ count: dnaN, scale: 0.72, yOffset: -0.15 })

  // 場景 1 的 DNA：Y 軸順時針 15 度（俯視下順時針 → 負角度）
  const yawFix = -(Math.PI / 12)
  const cy = Math.cos(yawFix)
  const sy = Math.sin(yawFix)
  for (let j = 0; j < dnaN; j++) {
    const x = dnaPts[j * 3]
    const z = dnaPts[j * 3 + 2]
    dnaPts[j * 3] = x * cy - z * sy
    dnaPts[j * 3 + 2] = x * sy + z * cy
  }
  for (let j = 0; j < dnaN; j++) {
    const si = microN + j
    a[si * 3] = dnaPts[j * 3]
    a[si * 3 + 1] = dnaPts[j * 3 + 1]
    a[si * 3 + 2] = dnaPts[j * 3 + 2]
  }

  return a
}

// 台灣外輪廓（由 `assets/tw.png` 自動精描輪廓後簡化）
const TW_OUTLINE = [
  [0.284, 1.07],
  [0.319, 1.07],
  [0.336, 1.052],
  [0.345, 1.024],
  [0.354, 1.015],
  [0.371, 1.015],
  [0.388, 0.988],
  [0.415, 0.988],
  [0.45, 0.96],
  [0.493, 0.96],
  [0.502, 0.905],
  [0.511, 0.896],
  [0.537, 0.896],
  [0.537, 0.887],
  [0.502, 0.868],
  [0.441, 0.786],
  [0.441, 0.712],
  [0.45, 0.703],
  [0.45, 0.666],
  [0.467, 0.639],
  [0.467, 0.593],
  [0.45, 0.574],
  [0.458, 0.556],
  [0.45, 0.556],
  [0.423, 0.519],
  [0.415, 0.446],
  [0.371, 0.39],
  [0.354, 0.381],
  [0.345, 0.363],
  [0.354, 0.354],
  [0.354, 0.335],
  [0.327, 0.308],
  [0.327, 0.28],
  [0.345, 0.253],
  [0.319, 0.225],
  [0.319, 0.161],
  [0.301, 0.133],
  [0.301, 0.096],
  [0.284, 0.069],
  [0.275, -0.023],
  [0.266, -0.032],
  [0.266, -0.078],
  [0.257, -0.087],
  [0.249, -0.152],
  [0.24, -0.161],
  [0.24, -0.179],
  [0.223, -0.198],
  [0.223, -0.216],
  [0.205, -0.253],
  [0.205, -0.308],
  [0.179, -0.335],
  [0.161, -0.39],
  [0.135, -0.418],
  [0.135, -0.436],
  [0.092, -0.473],
  [0.083, -0.537],
  [0.031, -0.565],
  [-0.013, -0.62],
  [-0.013, -0.648],
  [-0.039, -0.685],
  [-0.048, -0.74],
  [-0.074, -0.795],
  [-0.074, -0.859],
  [-0.065, -0.868],
  [-0.074, -0.877],
  [-0.074, -0.942],
  [-0.065, -0.951],
  [-0.074, -0.96],
  [-0.074, -0.979],
  [-0.065, -0.988],
  [-0.074, -1.006],
  [-0.1, -1.024],
  [-0.092, -1.07],
  [-0.1, -1.052],
  [-0.135, -1.034],
  [-0.153, -1.043],
  [-0.153, -1.061],
  [-0.161, -1.052],
  [-0.161, -1.015],
  [-0.179, -0.997],
  [-0.161, -0.969],
  [-0.17, -0.96],
  [-0.161, -0.951],
  [-0.161, -0.933],
  [-0.179, -0.896],
  [-0.179, -0.868],
  [-0.196, -0.85],
  [-0.196, -0.822],
  [-0.249, -0.758],
  [-0.275, -0.74],
  [-0.292, -0.74],
  [-0.327, -0.694],
  [-0.336, -0.703],
  [-0.362, -0.694],
  [-0.415, -0.629],
  [-0.423, -0.611],
  [-0.415, -0.565],
  [-0.441, -0.51],
  [-0.45, -0.464],
  [-0.458, -0.455],
  [-0.458, -0.427],
  [-0.476, -0.39],
  [-0.502, -0.363],
  [-0.528, -0.354],
  [-0.537, -0.335],
  [-0.537, -0.317],
  [-0.511, -0.299],
  [-0.519, -0.289],
  [-0.519, -0.262],
  [-0.511, -0.253],
  [-0.511, -0.234],
  [-0.493, -0.216],
  [-0.502, -0.198],
  [-0.493, -0.188],
  [-0.493, -0.17],
  [-0.476, -0.152],
  [-0.476, -0.115],
  [-0.484, -0.106],
  [-0.484, -0.078],
  [-0.493, -0.06],
  [-0.476, -0.051],
  [-0.484, -0.041],
  [-0.484, 0.014],
  [-0.467, 0.051],
  [-0.467, 0.106],
  [-0.45, 0.133],
  [-0.432, 0.133],
  [-0.415, 0.161],
  [-0.397, 0.17],
  [-0.38, 0.234],
  [-0.327, 0.299],
  [-0.345, 0.308],
  [-0.345, 0.317],
  [-0.327, 0.345],
  [-0.31, 0.345],
  [-0.301, 0.354],
  [-0.284, 0.418],
  [-0.249, 0.455],
  [-0.231, 0.501],
  [-0.188, 0.556],
  [-0.161, 0.629],
  [-0.153, 0.629],
  [-0.127, 0.666],
  [-0.109, 0.666],
  [-0.057, 0.73],
  [-0.048, 0.749],
  [-0.057, 0.776],
  [0.004, 0.868],
  [0.004, 0.887],
  [0.031, 0.914],
  [0.065, 0.933],
  [0.083, 0.933],
  [0.127, 0.96],
  [0.188, 0.96],
  [0.223, 0.997],
  [0.24, 1.043],
  [0.284, 1.07],
]

function pointInPoly(x, y, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1]
    const xj = poly[j][0], yj = poly[j][1]
    const intersect =
      ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

function genTaiwan() {
  const a = new Float32Array(COUNT * 3)
  const outline = TW_OUTLINE
  let i = 0

  const S = 2.5
  const yOffset = -0.4

  // 輪廓點占 45%（更清晰的輪廓線），內部填充只占 18%（稀疏感）
  const outN = Math.floor(COUNT * 0.45)
  for (let j = 0; j < outN; j++) {
    const t = (j / outN) * (outline.length - 1)
    const si = Math.floor(t)
    const frac = t - si
    const p0 = outline[Math.min(si, outline.length - 2)]
    const p1 = outline[Math.min(si + 1, outline.length - 1)]
    a[i++] = (p0[0] + (p1[0] - p0[0]) * frac) * S + (Math.random() - 0.5) * 0.04
    a[i++] = (p0[1] + (p1[1] - p0[1]) * frac) * S + yOffset + (Math.random() - 0.5) * 0.04
    a[i++] = (Math.random() - 0.5) * 0.06
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of outline) {
    if (p[0] < minX) minX = p[0]
    if (p[0] > maxX) maxX = p[0]
    if (p[1] < minY) minY = p[1]
    if (p[1] > maxY) maxY = p[1]
  }
  const pad = 0.06
  minX -= pad; maxX += pad; minY -= pad; maxY += pad

  let placed = 0
  let tries = 0
  const intN = Math.floor(COUNT * 0.18)
  while (placed < intN && tries < intN * 160) {
    tries++
    const x = lerp(minX, maxX, Math.random())
    const y = lerp(minY, maxY, Math.random())
    if (pointInPoly(x, y, outline)) {
      a[i++] = x * S + (Math.random() - 0.5) * 0.07
      a[i++] = y * S + yOffset + (Math.random() - 0.5) * 0.07
      a[i++] = (Math.random() - 0.5) * 0.05
      placed++
    }
  }

  // 剩餘額度補輪廓點（避免 morph 時多餘粒子跑到原點）
  while (i < COUNT * 3) {
    const t = Math.random() * (outline.length - 1)
    const si = Math.floor(t)
    const frac = t - si
    const p0 = outline[Math.min(si, outline.length - 2)]
    const p1 = outline[Math.min(si + 1, outline.length - 1)]
    a[i++] = (p0[0] + (p1[0] - p0[0]) * frac) * S + (Math.random() - 0.5) * 0.04
    a[i++] = (p0[1] + (p1[1] - p0[1]) * frac) * S + yOffset + (Math.random() - 0.5) * 0.04
    a[i++] = (Math.random() - 0.5) * 0.06
  }
  return a
}

// 台灣特寵醫院：圓柱體粒子群（品牌紅 #E8440A，NormalBlending 防過曝）
function genTaiwanHospitalDots(totalCount = 600) {
  const outline = TW_OUTLINE
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of outline) {
    if (p[0] < minX) minX = p[0]
    if (p[0] > maxX) maxX = p[0]
    if (p[1] < minY) minY = p[1]
    if (p[1] > maxY) maxY = p[1]
  }
  const pad = 0.06
  minX -= pad; maxX += pad; minY -= pad; maxY += pad

  const S       = 2.5
  const yOffset = -0.4

  // 在輪廓內找 N_HOSP 個據點
  const N_HOSP = 40
  const locs   = []
  let tries    = 0
  while (locs.length < N_HOSP && tries < N_HOSP * 600) {
    tries++
    const x = lerp(minX, maxX, Math.random())
    const y = lerp(minY, maxY, Math.random())
    if (pointInPoly(x, y, outline)) locs.push([x, y])
  }

  // 圓柱體參數
  const N_LEVELS    = 3
  const CYL_H       = 0.30
  const R_BASE      = 0.040
  const R_TOP       = 0.012
  const PTS_PER_RING = Math.max(3, Math.floor(totalCount / locs.length / N_LEVELS))

  // 重要：不要用 0 補齊剩餘點（0,0,0 會在地圖中央形成「奇怪的小方塊」）
  const actualCount = Math.max(0, locs.length * N_LEVELS * PTS_PER_RING)
  const out = new Float32Array(actualCount * 3)
  let w = 0

  for (const [lx, ly] of locs) {
    const wx = lx * S
    const wy = ly * S + yOffset
    for (let lv = 0; lv < N_LEVELS; lv++) {
      const frac     = lv / (N_LEVELS - 1)
      const z        = 0.03 + frac * CYL_H
      const r        = R_BASE + (R_TOP - R_BASE) * frac
      const phaseOff = lv * 0.4
      for (let rp = 0; rp < PTS_PER_RING; rp++) {
        if (w >= actualCount) break
        const ang      = (rp / PTS_PER_RING) * Math.PI * 2 + phaseOff
        out[w * 3]     = wx + r * Math.cos(ang) + (Math.random() - 0.5) * 0.006
        out[w * 3 + 1] = wy + r * Math.sin(ang) + (Math.random() - 0.5) * 0.006
        out[w * 3 + 2] = z  + (Math.random() - 0.5) * 0.006
        w++
      }
    }
  }

  return out
}

function genEdgeScatter() {
  const a = new Float32Array(COUNT * 3)
  for (let j = 0; j < COUNT; j++) {
    const side = j % 4
    let x, y
    switch (side) {
      case 0: x = -11 - Math.random() * 4; y = (Math.random() - 0.5) * 20; break
      case 1: x = 9 + Math.random() * 4; y = (Math.random() - 0.5) * 20; break
      case 2: y = 5 + Math.random() * 3; x = (Math.random() - 0.5) * 26; break
      default: y = -5 - Math.random() * 3; x = (Math.random() - 0.5) * 26; break
    }
    a[j * 3] = x + (Math.random() - 0.5)
    a[j * 3 + 1] = y + (Math.random() - 0.5)
    a[j * 3 + 2] = (Math.random() - 0.5) * 2
  }
  return a
}

// [0]=micro+dna  [1]=geckoDNA(輪廓+DNA)  [2]=geckoFill(輪廓+填充)  [3]=taiwan  [4]=edge-scatter
const targets = [
  genMicroWithDna(),
  genGeckoDNA(),
  genGeckoFill(),
  genTaiwan(),
  genEdgeScatter(),
]

// 藍/粉 accent 粒子（全場景用來增加豐富度）
const ACCENT_COUNT = isMobileDevice ? 300 : 400
const accentBlue = genAccent(ACCENT_COUNT, 2.0, 4.2, 0.90)
const accentPink = genAccent(ACCENT_COUNT, 2.2, 4.8, 0.85)

// ── 粒子分層架構（Split Particle Systems）──────────────────────────────────
// geckoGrp (MICRO_N)：散點→輪廓→填充→台灣；rotation.y 鎖定正面，守宮絕對清晰
// dnaGrp   (DNA_N)  ：DNA 螺旋持續自轉，賦予生命感；Scene 3+ 融入守宮體內
//
// SCENE_SHAPES 提前至此，以便初始化幾何體時取用 morph 視圖
const SCENE_SHAPES = [4, 0, 1, 2, 3, 4]
// subarray = Float32Array 視圖（不複製記憶體，效能與舊版相同）
const geckoMorphTargets = SCENE_SHAPES.map(i => targets[i].subarray(0, MICRO_N * 3))
const dnaMorphTargets   = SCENE_SHAPES.map(i => targets[i].subarray(MICRO_N * 3))

// Gecko System
const geckoGeo = new THREE.BufferGeometry()
const geckoArr = new Float32Array(geckoMorphTargets[0])
const geckoPosAttr = new THREE.BufferAttribute(geckoArr, 3)
geckoPosAttr.setUsage(THREE.DynamicDrawUsage)
geckoGeo.setAttribute('position', geckoPosAttr)

const geckoMat = new THREE.PointsMaterial({
  size: 0.042,
  color: new THREE.Color(0xe8440a),
  transparent: true,
  opacity: 0.88,
  sizeAttenuation: true,
  depthWrite: false,
})
const geckoGlowMat = new THREE.PointsMaterial({
  size: 0.22,
  color: new THREE.Color(0xe8440a),
  transparent: true,
  opacity: 0.07,
  sizeAttenuation: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
})
const geckoPts  = new THREE.Points(geckoGeo, geckoMat)
const geckoGlow = new THREE.Points(geckoGeo, geckoGlowMat)
const geckoGrp  = new THREE.Group()
geckoGrp.add(geckoPts)
geckoGrp.add(geckoGlow)

// DNA System
const dnaGeo = new THREE.BufferGeometry()
const dnaArr = new Float32Array(dnaMorphTargets[0])
const dnaPosAttr = new THREE.BufferAttribute(dnaArr, 3)
dnaPosAttr.setUsage(THREE.DynamicDrawUsage)
dnaGeo.setAttribute('position', dnaPosAttr)

const dnaMat = new THREE.PointsMaterial({
  size: 0.042,
  color: new THREE.Color(0xe8440a),
  transparent: true,
  opacity: 0.88,
  sizeAttenuation: true,
  depthWrite: false,
})
const dnaGlowMat = new THREE.PointsMaterial({
  size: 0.22,
  color: new THREE.Color(0xe8440a),
  transparent: true,
  opacity: 0.07,
  sizeAttenuation: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
})
const dnaPts  = new THREE.Points(dnaGeo, dnaMat)
const dnaGlow = new THREE.Points(dnaGeo, dnaGlowMat)
const dnaGrp  = new THREE.Group()
dnaGrp.add(dnaPts)
dnaGrp.add(dnaGlow)

const grp = new THREE.Group()
grp.add(geckoGrp)
grp.add(dnaGrp)

const accentGrp = new THREE.Group()

const blueGeo = new THREE.BufferGeometry()
blueGeo.setAttribute('position', new THREE.BufferAttribute(accentBlue, 3))
const blueMat = new THREE.PointsMaterial({
  size: 0.060,
  color: new THREE.Color(0x2aa6ff),
  transparent: true,
  opacity: 0,
  sizeAttenuation: true,
  depthWrite: false,
  depthTest: false,
  blending: THREE.AdditiveBlending,
})
const blueGlowMat = new THREE.PointsMaterial({
  size: 0.18,
  color: new THREE.Color(0x2aa6ff),
  transparent: true,
  opacity: 0,
  sizeAttenuation: true,
  depthWrite: false,
  depthTest: false,
  blending: THREE.AdditiveBlending,
})
accentGrp.add(new THREE.Points(blueGeo, blueMat))
accentGrp.add(new THREE.Points(blueGeo, blueGlowMat))

const pinkGeo = new THREE.BufferGeometry()
pinkGeo.setAttribute('position', new THREE.BufferAttribute(accentPink, 3))
const pinkMat = new THREE.PointsMaterial({
  size: 0.060,
  color: new THREE.Color(0xff4fd8),
  transparent: true,
  opacity: 0,
  sizeAttenuation: true,
  depthWrite: false,
  depthTest: false,
  blending: THREE.AdditiveBlending,
})
const pinkGlowMat = new THREE.PointsMaterial({
  size: 0.18,
  color: new THREE.Color(0xff4fd8),
  transparent: true,
  opacity: 0,
  sizeAttenuation: true,
  depthWrite: false,
  depthTest: false,
  blending: THREE.AdditiveBlending,
})
accentGrp.add(new THREE.Points(pinkGeo, pinkMat))
accentGrp.add(new THREE.Points(pinkGeo, pinkGlowMat))

grp.add(accentGrp)

// 台灣場景：特寵醫院圓柱體（品牌紅 #E8440A，NormalBlending 不疊加發白）
const hospDots2 = genTaiwanHospitalDots(600)
const hospGeo = new THREE.BufferGeometry()
hospGeo.setAttribute('position', new THREE.BufferAttribute(hospDots2, 3))
const hospMat = new THREE.PointsMaterial({
  size: 0.048,
  color: new THREE.Color(0xe8440a),
  transparent: true,
  opacity: 0,
  sizeAttenuation: true,
  depthWrite: false,
  // NormalBlending（預設）：不疊加過曝，保持品牌紅
})
const hospGlowMat = new THREE.PointsMaterial({
  size: 0.16,
  color: new THREE.Color(0xe8440a),
  transparent: true,
  opacity: 0,
  sizeAttenuation: true,
  depthWrite: false,
  depthTest: false,
  blending: THREE.AdditiveBlending,
})
const hospGrp = new THREE.Group()
const hospPts = new THREE.Points(hospGeo, hospMat)
const hospGlowPts = new THREE.Points(hospGeo, hospGlowMat)
// 確保紅點永遠在台灣地圖上面，不被其它粒子/瀑布視覺蓋掉
hospPts.renderOrder = 30
hospGlowPts.renderOrder = 21
hospGrp.add(hospPts)
hospGrp.add(hospGlowPts)
grp.add(hospGrp)

// 整體往右（配合 about 版面）
grp.position.x = 1.5
const groupRef = shallowRef(grp)

// ── WebGL 透明背景修正 ──────────────────────────────────────────────────────
// TresJS clearColor prop 只更新色彩、不更新 alpha（alpha 預設 1 = 不透明黑）
// 直接取得 renderer 並設定 setClearColor(black, 0)，確保畫布背景完全透明
const { renderer } = useTresContext()
watchEffect(() => {
  if (renderer.value) {
    renderer.value.setClearColor(new THREE.Color(0, 0, 0), 0)
  }
})

let dnaSpinY    = 0     // dnaGrp 角速度（rad/s）
let geckoSpinY  = 0     // geckoGrp 角速度（rad/s，場景 0-1 區段）
let conv23      = null  // Scene 2→3 兩段式 morph 狀態（null = 一般模式）
let conv23Tween = null  // conv23 GSAP tween 持久引用（用於 kill）

const { onBeforeRender } = useLoop()
onBeforeRender(({ delta, elapsed }) => {
  // TresJS 每幀呼叫 setClearColor(color) 不帶 alpha → alpha 被重設為 1（黑）
  // 在每幀 render 之前強制把 clearAlpha 鎖回 0（透明），蓋過 TresJS 的覆寫
  renderer.value?.setClearAlpha(0)

  const s = Math.max(0, Math.min(5, props.scene))

  // ── Gecko + DNA morph ────────────────────────────────────────────────────────
  // conv23 非 null 時：Scene 2→3 兩段式（Phase 1 收斂 → Phase 2 發散）覆蓋一般 morph
  const n0   = Math.min(4, Math.floor(s))
  const frac = s - n0

  // geckoGrp 永遠走一般線性 morph（conv23 期間守宮輪廓保持不動）
  {
    const gSrc = geckoMorphTargets[n0], gDst = geckoMorphTargets[Math.min(5, n0 + 1)]
    const gArr = geckoPosAttr.array
    for (let idx = 0; idx < MICRO_N * 3; idx++) gArr[idx] = gSrc[idx] + (gDst[idx] - gSrc[idx]) * frac
    geckoPosAttr.needsUpdate = true
  }

  if (conv23 !== null) {
    // dnaGrp 收斂→發散（conv23 兩段式覆蓋）
    const ct   = conv23.t
    const dArr = dnaPosAttr.array
    if (conv23.phase === 1) {
      // Phase 1：dnaGrp 從 scene 2 DNA 形態收縮至原點（同時淡出，見 dnaOpMul）
      const dSrc = dnaMorphTargets[2]
      for (let idx = 0; idx < DNA_N * 3; idx++) dArr[idx] = dSrc[idx] * (1 - ct)
    } else {
      // Phase 2：dnaGrp 從原點發散至 scene 3 填充形態（同時淡入）
      const dDst = dnaMorphTargets[3]
      for (let idx = 0; idx < DNA_N * 3; idx++) dArr[idx] = dDst[idx] * ct
    }
    dnaPosAttr.needsUpdate = true
  } else {
    // dnaGrp 一般線性 morph
    const dSrc = dnaMorphTargets[n0], dDst = dnaMorphTargets[Math.min(5, n0 + 1)]
    const dArr = dnaPosAttr.array
    for (let idx = 0; idx < DNA_N * 3; idx++) dArr[idx] = dSrc[idx] + (dDst[idx] - dSrc[idx]) * frac
    dnaPosAttr.needsUpdate = true
  }

  // ── 轉場爆閃（burst）────────────────────────────────────────────────────────
  let burstT = 0
  for (const b of [0.5, 1.5, 2.5, 3.5, 4.5]) {
    const d = Math.abs(s - b)
    if (d < 0.18) burstT = Math.max(burstT, 1 - d / 0.18)
  }
  const burst = burstT * burstT * (3 - 2 * burstT)

  // ── 粒子呼吸感（geckoGrp + dnaGrp 共用呼吸節奏）────────────────────────────
  const wave2      = 0.5 + 0.5 * Math.sin(elapsed * 5.6 * MOTION_SPEED)
  const waveSmooth = wave2 * wave2 * (3 - 2 * wave2)
  if (geckoGrp.userData._breath === undefined) geckoGrp.userData._breath = waveSmooth
  const smooth = 1 - Math.exp(-12 * delta)
  geckoGrp.userData._breath += (waveSmooth - geckoGrp.userData._breath) * smooth
  const breathSm = geckoGrp.userData._breath

  const baseSz     = 0.042
  const baseOp     = 0.86
  const targetSize = baseSz + breathSm * 0.010 + burst * 0.018
  const targetOp   = baseOp + burst * 0.06
  if (geckoGrp.userData._size === undefined) geckoGrp.userData._size = targetSize
  if (geckoGrp.userData._op   === undefined) geckoGrp.userData._op   = targetOp
  const s2 = 1 - Math.exp(-18 * delta)
  geckoGrp.userData._size += (targetSize - geckoGrp.userData._size) * s2
  geckoGrp.userData._op   += (targetOp   - geckoGrp.userData._op)   * s2

  // ── 密度：scene=1 略稀（凸顯 DNA 螺旋）────────────────────────────────────
  const dist1  = Math.abs(s - 1)
  const density = dist1 <= 0.25 ? 0.58
    : dist1 < 0.6 ? 0.58 + 0.42 * (dist1 - 0.25) / 0.35
    : 1.0

  geckoMat.size    = geckoGrp.userData._size
  geckoMat.opacity = geckoGrp.userData._op * density
  geckoMat.needsUpdate = true

  const glowBase   = 0.052
  const glowWave   = 0.5 + 0.5 * Math.sin(elapsed * 3.4 * MOTION_SPEED + 1.5)
  const glowTarget = glowBase + glowWave * 0.014 + burst * 0.085
  if (geckoGrp.userData._glow === undefined) geckoGrp.userData._glow = glowTarget
  geckoGrp.userData._glow += (glowTarget - geckoGrp.userData._glow) * s2
  geckoGlowMat.opacity = geckoGrp.userData._glow * density
  geckoGlowMat.needsUpdate = true

  // DNA 透明度：conv23 Phase 1 淡出（收斂至原點時隱藏），Phase 2 淡入（發散時顯現）
  // 防止粒子堆疊在原點形成白方塊
  const dnaOpMul = conv23 === null ? 1
    : conv23.phase === 1 ? (1 - conv23.t)
    : conv23.t
  dnaMat.size    = geckoGrp.userData._size
  dnaMat.opacity = geckoGrp.userData._op * density * dnaOpMul
  dnaMat.needsUpdate = true
  dnaGlowMat.opacity = geckoGrp.userData._glow * density * dnaOpMul
  dnaGlowMat.needsUpdate = true

  // ── 藍/粉 accent：scene 1-4 完整，scene 0/5 微弱背景 ──────────────────────
  const accentA = s <= 0.2 ? 0.18
    : s < 1   ? 0.18 + 0.82 * (s - 0.2) / 0.8
    : s <= 4  ? 1
    : s < 5   ? Math.max(0, 1 - (s - 4))
    : 0

  const breath = 0.75 + Math.sin(elapsed * 1.35 * MOTION_SPEED) * 0.25
  blueMat.opacity      = (0.48  + burst * 0.09)  * accentA * breath
  pinkMat.opacity      = (0.45  + burst * 0.08)  * accentA * breath
  blueGlowMat.opacity  = (0.075 + burst * 0.07)  * accentA * breath
  pinkGlowMat.opacity  = (0.070 + burst * 0.065) * accentA * breath
  blueMat.needsUpdate = pinkMat.needsUpdate = blueGlowMat.needsUpdate = pinkGlowMat.needsUpdate = true

  // ── 台灣紅點：以 scene=4 為中心（±0.42 範圍 smoothstep）────────────────────
  const twDist = Math.abs(s - 4)
  const twRaw  = Math.max(0, 1 - twDist / 0.42)
  const twEase = twRaw * twRaw * (3 - 2 * twRaw)
  const blink  = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(elapsed * 6.0))
  hospMat.opacity      = twEase * blink * 0.55   // NormalBlending：不疊加過曝
  hospGlowMat.opacity  = twEase * blink * 0.05   // 光暈極低，僅提供暖暈感
  hospMat.needsUpdate  = hospGlowMat.needsUpdate = true

  // ── geckoGrp：scene 0-1 持續自轉，scene 2+ 速度歸零（輪廓必須固定不動）────────
  // 1→2 轉場時 transitionInfo watch 會以 GSAP 精確回正到 0，之後速度制維持靜止
  const inGeckoSpin  = s < 1.5
  const geckoVelTgt  = inGeckoSpin ? -0.20 * MOTION_SPEED : 0
  geckoSpinY += (geckoVelTgt - geckoSpinY) * 0.12
  geckoGrp.rotation.y += geckoSpinY * delta
  geckoGrp.rotation.z  = 0   // Z 軸不傾斜

  // ── dnaGrp：speed-based 自轉（inDNA 區段加速，其他減速至靜止，永不逆轉）──
  const inDNA = s > 0.6 && s < 2.4
  const dnaVelTarget = inDNA ? -0.32 * MOTION_SPEED : 0
  dnaSpinY += (dnaVelTarget - dnaSpinY) * 0.12
  dnaGrp.rotation.y += dnaSpinY * delta

  const targetTiltZ = inDNA ? -Math.PI / 6 : 0
  dnaGrp.rotation.z += (targetTiltZ - dnaGrp.rotation.z) * 0.15

  // ── 藍/粉粒子慢速旋轉（全場景）────────────────────────────────────────────
  accentGrp.rotation.y += delta * 0.4 * MOTION_SPEED
})

// ── 轉場方向感知：三個指定點執行特殊動作，其餘旋轉保持連續 ─────────────────
//  Scene 1 → 2：geckoGrp 與 morph 同步回正（輪廓固定），dnaGrp 不干涉
//  Scene 2 → 3：兩段式——Phase 1（45%）= 收斂至原點 + 同步回正；Phase 2（55%）= 發散至 geckoFill
//  Scene 1 → 0：發散與回正完全同步（全程 1.8s）
let rotYTween      = null
let geckoRotYTween = null
const TRANS_DUR    = 1.8   // 與 navigateTo duration 保持一致

watch(() => props.transitionInfo, (info) => {
  if (!info || info.from < 0) return
  const { from, to } = info

  if (from === 2 && to === 3) {
    // ── 兩段式收斂：Phase 1 = 收斂+回正，Phase 2 = 發散 ──────────────────
    const PHASE1 = TRANS_DUR * 0.45
    const PHASE2 = TRANS_DUR * 0.55

    dnaSpinY = 0; geckoSpinY = 0
    if (rotYTween)      rotYTween.kill()
    if (geckoRotYTween) geckoRotYTween.kill()
    // 旋轉在 Phase 1 完成時精確到達 0（與收斂同步）
    rotYTween = gsap.to(dnaGrp.rotation, {
      y: 0, duration: PHASE1, ease: 'expo.out', overwrite: true,
    })
    geckoRotYTween = gsap.to(geckoGrp.rotation, {
      y: 0, duration: PHASE1, ease: 'expo.out', overwrite: true,
    })

    // conv23 兩段式 morph 序列
    if (conv23Tween) conv23Tween.kill()
    conv23 = { phase: 1, t: 0 }
    const p1 = { t: 0 }
    conv23Tween = gsap.to(p1, {
      t: 1, duration: PHASE1, ease: 'expo.out',
      onUpdate()   { conv23 = { phase: 1, t: p1.t } },
      onComplete() {
        conv23 = { phase: 2, t: 0 }
        const p2 = { t: 0 }
        gsap.to(p2, {
          t: 1, duration: PHASE2, ease: 'expo.out',
          onUpdate()   { conv23 = { phase: 2, t: p2.t } },
          onComplete() { conv23 = null },
        })
      },
    })

  } else if (from === 1 && to === 2) {
    // ── geckoGrp 與 morph 同步回正（守宮輪廓固定不動），dnaGrp 保持旋轉 ──
    geckoSpinY = 0
    if (geckoRotYTween) geckoRotYTween.kill()
    geckoRotYTween = gsap.to(geckoGrp.rotation, {
      y: 0, duration: TRANS_DUR, ease: 'expo.out', overwrite: true,
    })
    // dnaGrp：不重置，保持旋轉連續

  } else if (from === 1 && to === 0) {
    // ── 發散點：兩系統同步回正，與 morph 完全同步 ────────────────────────
    dnaSpinY = 0; geckoSpinY = 0
    if (rotYTween)      rotYTween.kill()
    if (geckoRotYTween) geckoRotYTween.kill()
    rotYTween = gsap.to(dnaGrp.rotation, {
      y: 0, duration: TRANS_DUR, ease: 'expo.out', overwrite: true,
    })
    geckoRotYTween = gsap.to(geckoGrp.rotation, {
      y: 0, duration: TRANS_DUR, ease: 'expo.out', overwrite: true,
    })
  }
  // 其餘轉場（0↔1, 3↔4, 4↔5, 3→2, 2→1）：旋轉保持連續，不執行任何重置
}, { deep: true })

watch(() => props.isDayMode, () => {
  // about 頁目前固定暗色，但保留 hook，避免未來恢復切換時要重寫
})

onUnmounted(() => {
  if (rotYTween)      rotYTween.kill()
  if (geckoRotYTween) geckoRotYTween.kill()
  if (conv23Tween) conv23Tween.kill()
  geckoGeo.dispose()
  geckoMat.dispose()
  geckoGlowMat.dispose()
  dnaGeo.dispose()
  dnaMat.dispose()
  dnaGlowMat.dispose()
  blueGeo.dispose()
  blueMat.dispose()
  blueGlowMat.dispose()
  pinkGeo.dispose()
  pinkMat.dispose()
  pinkGlowMat.dispose()
  hospGeo.dispose()
  hospMat.dispose()
  hospGlowMat.dispose()
})
</script>

<template>
  <primitive :object="groupRef" />
</template>
