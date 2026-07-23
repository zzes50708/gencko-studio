// DNA 守宮粒子生成器（純函式，framework-agnostic）
//
// 由 components/GeckoScene3D.vue 的粒子生成邏輯萃取而來，去除 Vue/Tres 依賴與
// step-snap morph 機制，供首頁新 3D 英雄元件（持久 DNA 守宮主體）使用。
// 原 GeckoScene3D.vue 維持不動（/about 仍用），兩邊各自 import。
//
// 座標系與原元件一致：+Y 上、單位為場景單位；回傳扁平 Float32Array（xyz 交錯）。

export type Point2 = readonly [number, number]

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/** 點是否在多邊形內（ray casting） */
export function pointInPoly(x: number, y: number, poly: readonly Point2[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0]
    const yi = poly[i][1]
    const xj = poly[j][0]
    const yj = poly[j][1]
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi
    if (intersect) inside = !inside
  }
  return inside
}

export interface DnaLadderOptions {
  scale?: number
  xOffset?: number
  yOffset?: number
  zOffset?: number
  turns?: number
  /** 螺旋半徑基準（乘 scale）；預設 0.6 */
  radius?: number
  /** 螺旋總高（乘 scale）；預設 8.0 */
  height?: number
}

/**
 * DNA 雙螺旋「梯子」：兩股螺旋 + 橫桿。
 * 前 50% 額度給兩股螺旋，其餘給橫桿；不足處沿螺旋補齊（避免原點方塊）。
 */
export function genDnaLadder(count: number, opts: DnaLadderOptions = {}): Float32Array {
  const {
    scale = 1,
    xOffset = 0,
    yOffset = 0,
    zOffset = 0,
    turns = 1.3,
    radius = 0.6,
    height = 8.0
  } = opts

  const a = new Float32Array(count * 3)
  const strandBudget = Math.floor(count * 0.5)
  const rungBudget = count - strandBudget
  const perStrand = Math.floor(strandBudget / 2)

  const R = radius * scale
  const H = height * scale
  const TURNS = turns

  let w = 0
  const write = (x: number, y: number, z: number): boolean => {
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

  // 2) 橫桿：固定 y 階梯，沿兩股之間直線灑點
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
      const x = x1 + (x2 - x1) * u + (Math.random() - 0.5) * 0.01
      const y = y0 + (Math.random() - 0.5) * 0.008
      const z = z1 + (z2 - z1) * u + (Math.random() - 0.5) * 0.01
      if (!write(x, y, z)) break
    }
  }

  // 補齊餘量：沿螺旋分布，避免原點方塊
  while (w < count) {
    const idx = w * 3
    const t = (w % Math.max(1, strandN)) / Math.max(1, strandN - 1)
    const ang = t * TURNS * Math.PI * 2
    a[idx] = R * Math.cos(ang) + xOffset
    a[idx + 1] = t * H - H / 1.8 + yOffset
    a[idx + 2] = R * Math.sin(ang) + zOffset
    w++
  }
  return a
}

export interface GeckoDnaOptions {
  /** 守宮輪廓粒子占比（其餘為 DNA）；預設 0.72 */
  outlineRatio?: number
  /** 輪廓整體縮放；預設 2.28 */
  outlineScale?: number
  outlineXOffset?: number
  outlineYOffset?: number
  /** DNA 螺旋縮放；預設 0.72 */
  dnaScale?: number
  dnaYOffset?: number
  /** DNA 繞 Y 軸旋轉角（弧度）；預設 -15° */
  dnaYaw?: number
}

/**
 * 持久 DNA 守宮主體：前 outlineRatio 的粒子鋪成守宮輪廓，其餘構成 DNA 雙螺旋（身體）。
 * 這是新首頁英雄的中央主體（取代原 morph 場景的 genGeckoDNA）。
 */
export function genGeckoDNA(
  count: number,
  outline: readonly Point2[],
  opts: GeckoDnaOptions = {}
): Float32Array {
  const {
    outlineRatio = 0.72,
    outlineScale: S = 2.28,
    outlineXOffset: xOffset = 0.1,
    outlineYOffset: yOffset = -0.35,
    dnaScale = 0.72,
    dnaYOffset = -0.15,
    dnaYaw = -Math.PI / 12
  } = opts

  const a = new Float32Array(count * 3)
  const microN = Math.floor(count * outlineRatio)
  const dnaN = count - microN
  let i = 0

  // 前 microN：守宮輪廓（循環輪廓線，高密度剪影）
  for (let j = 0; j < microN; j++) {
    const t = (j / Math.max(1, microN - 1)) * (outline.length - 1)
    const si = Math.floor(t)
    const frac = t - si
    const p0 = outline[Math.min(si, outline.length - 2)]
    const p1 = outline[Math.min(si + 1, outline.length - 1)]
    a[i++] = (p0[0] + (p1[0] - p0[0]) * frac) * S + xOffset + (Math.random() - 0.5) * 0.025
    a[i++] = (p0[1] + (p1[1] - p0[1]) * frac) * S + yOffset + (Math.random() - 0.5) * 0.025
    a[i++] = (Math.random() - 0.5) * 0.06
  }

  // 後 dnaN：DNA 雙螺旋（繞 Y 軸旋轉 dnaYaw）
  const dnaPts = genDnaLadder(dnaN, { scale: dnaScale, yOffset: dnaYOffset })
  const cy = Math.cos(dnaYaw)
  const sy = Math.sin(dnaYaw)
  for (let j = 0; j < dnaN; j++) {
    const x = dnaPts[j * 3]
    const z = dnaPts[j * 3 + 2]
    a[i++] = x * cy - z * sy
    a[i++] = dnaPts[j * 3 + 1]
    a[i++] = x * sy + z * cy
  }

  while (i < count * 3) a[i++] = 0
  return a
}

/**
 * 守宮輪廓 + 體內填充（DNA 匯集進體內）。
 * 供「粒子收斂成守宮」成形動畫的目標形態。
 */
export function genGeckoFill(
  count: number,
  outline: readonly Point2[],
  opts: GeckoDnaOptions = {}
): Float32Array {
  const {
    outlineRatio = 0.72,
    outlineScale: S = 2.28,
    outlineXOffset: xOffset = 0.1,
    outlineYOffset: yOffset = -0.35
  } = opts

  const a = new Float32Array(count * 3)
  const microN = Math.floor(count * outlineRatio)
  const dnaN = count - microN
  let i = 0

  // 前 microN：守宮輪廓（與 genGeckoDNA 相同位置）
  for (let j = 0; j < microN; j++) {
    const t = (j / Math.max(1, microN - 1)) * (outline.length - 1)
    const si = Math.floor(t)
    const frac = t - si
    const p0 = outline[Math.min(si, outline.length - 2)]
    const p1 = outline[Math.min(si + 1, outline.length - 1)]
    a[i++] = (p0[0] + (p1[0] - p0[0]) * frac) * S + xOffset + (Math.random() - 0.5) * 0.025
    a[i++] = (p0[1] + (p1[1] - p0[1]) * frac) * S + yOffset + (Math.random() - 0.5) * 0.025
    a[i++] = (Math.random() - 0.5) * 0.06
  }

  // 後 dnaN：守宮體內散點（DNA 匯集成填充）
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of outline) {
    if (p[0] < minX) minX = p[0]
    if (p[0] > maxX) maxX = p[0]
    if (p[1] < minY) minY = p[1]
    if (p[1] > maxY) maxY = p[1]
  }
  const pad = 0.06
  minX -= pad
  maxX += pad
  minY -= pad
  maxY += pad

  let placed = 0
  let tries = 0
  while (placed < dnaN && tries < dnaN * 200) {
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

  while (i < count * 3) a[i++] = 0
  return a
}

/** 灑點球殼（進場前的鬆散粒子雲，供收斂成守宮的起始形態） */
export function genScatter(count: number, rMin = 2.05, rMax = 2.9, yScale = 0.68): Float32Array {
  const a = new Float32Array(count * 3)
  for (let j = 0; j < count; j++) {
    const r = rMin + Math.random() * (rMax - rMin)
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    a[j * 3] = r * Math.sin(phi) * Math.cos(theta)
    a[j * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * yScale
    a[j * 3 + 2] = r * Math.cos(phi) * 0.78
  }
  return a
}
