<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  isDayMode: { type: Boolean, default: false },
})

const MOTION_SPEED = 0.5
const VISUAL_SCALE = 1

const canvasRef = ref(null)
let animFrame = 0
let phase = 0

// Geometry constants
const W        = 200 * VISUAL_SCALE
const CX       = W / 2
const AMP      = 50 * VISUAL_SCALE
const PERIOD   = 180
const RUNG_INT = PERIOD / 12

// ── 透視參數 ──────────────────────────────────────────────────────────────
// FOCAL：焦距，越小透視感越強（建議 2~4）
const FOCAL = 3

const color = () => props.isDayMode ? '#b83206' : '#ff6622'

// 規則 1 — 近大遠小：透視縮放比例
// z ∈ [-1, +1]，front(+1) → 1.5x，back(-1) → 0.75x
const perspScale = (z) => FOCAL / (FOCAL - z)

// 規則 3 — 深度淡化：front=1.0 品牌色全亮，back=0.20 大幅暗化
const depthAlpha = (z) => 0.20 + 0.80 * ((z + 1) * 0.5)

// 角度計算（共用，確保 x 與 z 使用同一相位）
const sAngle = (y, s) =>
  (y / PERIOD) * Math.PI * 2 + phase + (s ? Math.PI : 0)

// 股線 X 投影（維持原有 0.75 頻率因子，保留既有視覺風格）
const sX = (y, s) => CX + AMP * Math.sin(sAngle(y, s) * 0.75)

// Z 深度值：cos → [-1, +1]（-1=最後方，+1=最前方）
const sZ = (y, s) => Math.cos(sAngle(y, s))

const draw = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const H   = canvas.height
  const col = color()
  ctx.clearRect(0, 0, W, H)

  const BA = props.isDayMode ? 0.55 : 0.90  // 基礎透明度倍率
  const nR = Math.ceil(H / RUNG_INT) + 2

  // ── 收集全部可繪製物件 ────────────────────────────────────────────────
  const items = []

  // 股線分段：每 RUNG_INT/4 px 一段，讓 z 值細緻分層
  const SEG  = RUNG_INT / 4
  const nSeg = Math.ceil(H / SEG) + 1
  for (let i = 0; i < nSeg; i++) {
    const y0 = i * SEG
    const y1 = Math.min(H, y0 + SEG)
    for (let s = 0; s < 2; s++) {
      items.push({
        t: 0,                                   // t=0: strand segment
        x0: sX(y0, s), y0,
        x1: sX(y1, s), y1,
        z: (sZ(y0, s) + sZ(y1, s)) * 0.5,      // midpoint z
      })
    }
  }

  // 橫桿：拆成兩半，各自帶自己的 z，讓前半段和後半段分開排序
  for (let i = 0; i < nR; i++) {
    const y  = i * RUNG_INT
    const mx = (sX(y, 0) + sX(y, 1)) * 0.5    // 橫桿中點 x
    items.push({ t: 1, x0: mx, y, x1: sX(y, 0), z: sZ(y, 0) })  // t=1: rung half
    items.push({ t: 1, x0: mx, y, x1: sX(y, 1), z: sZ(y, 1) })
  }

  // 節點圓（最後加入，確保圓是畫在對應深度的最上層）
  for (let i = 0; i < nR; i++) {
    const y = i * RUNG_INT
    for (let s = 0; s < 2; s++) {
      items.push({ t: 2, x: sX(y, s), y, z: sZ(y, s) })          // t=2: node
    }
  }

  // ── 規則 2 — 嚴格深度排序（Painter's Algorithm）─────────────────────
  // z 小 = 遠 → 先畫；z 大 = 近 → 後畫蓋上去
  items.sort((a, b) => a.z - b.z)

  // ── 逐一渲染 ─────────────────────────────────────────────────────────
  ctx.lineCap    = 'round'
  ctx.fillStyle  = col
  ctx.strokeStyle = col

  for (const d of items) {
    const ps = perspScale(d.z)    // 透視縮放比例
    const da = depthAlpha(d.z)    // 深度透明度

    if (d.t === 0) {
      // 股線分段：前方較粗較亮，後方較細較暗
      ctx.globalAlpha = da * BA * 0.28
      ctx.lineWidth   = 5 * ps * VISUAL_SCALE
      ctx.beginPath()
      ctx.moveTo(d.x0, d.y0)
      ctx.lineTo(d.x1, d.y1)
      ctx.stroke()
    }
    else if (d.t === 1) {
      // 橫桿半邊：各自的 z 決定此半段的亮暗
      ctx.globalAlpha = da * BA * 0.55
      ctx.lineWidth   = 3.5 * VISUAL_SCALE
      ctx.beginPath()
      ctx.moveTo(d.x0, d.y)
      ctx.lineTo(d.x1, d.y)
      ctx.stroke()
    }
    else {
      // 節點圓：透視縮放半徑 + 深度亮度
      // 公式：base_r + depth_bonus → 前方節點明顯大，後方節點縮成小點
      const r = (1.5 + 2.0 * ((d.z + 1) * 0.5)) * ps * VISUAL_SCALE
      ctx.globalAlpha = da * BA
      ctx.beginPath()
      ctx.arc(d.x, d.y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.globalAlpha = 1
}

const animate = () => {
  phase += 0.022 * MOTION_SPEED
  draw()
  animFrame = requestAnimationFrame(animate)
}

const resize = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width  = W
  canvas.height = canvas.parentElement?.clientHeight || window.innerHeight
}

onMounted(() => {
  resize()
  window.addEventListener('resize', resize, { passive: true })
  animFrame = requestAnimationFrame(animate)
})

onUnmounted(() => {
  cancelAnimationFrame(animFrame)
  window.removeEventListener('resize', resize)
})

watch(() => props.isDayMode, draw)
</script>

<template>
  <!--
    Positioned on the LEFT side, behind the title text.
    pointer-events:none so it doesn't intercept scroll or clicks.
  -->
  <canvas ref="canvasRef" class="dna-decor" aria-hidden="true" />
</template>

<style scoped>
.dna-decor {
  position: absolute;
  /* center of left text panel (max-width: 52vw) */
  left: 26vw;
  /* 水平翻轉 DNA 本體 */
  transform: translateX(-50%) scaleX(-1);
  top: 0;
  width: 108px;
  height: 100%;
  pointer-events: none;
  opacity: 0.9;
}
</style>
