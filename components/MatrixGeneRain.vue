<template>
  <div class="matrix-container" aria-hidden="true">
    <canvas ref="matrixCanvas" class="matrix-canvas" />
    <!-- 仍保留 slot：需要時可把提示字/特效疊上來 -->
    <div v-if="$slots.default" class="content-overlay">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  // 0~1：控制整體強度（等同 BrandServiceScrollScene 的 geneFxA）
  alpha: { type: Number, default: 0.5 },
  // token 池（基因圖鑑英文標題）
  tokens: { type: Array, default: () => [] },
  // 是否啟用（桌機 + 需要顯示時）
  enabled: { type: Boolean, default: true },
})

const matrixCanvas = ref(null)
let rafId = 0
// [#2] ctx 快取：mount/resize 時取一次，不每幀 getContext
let cachedCtx = null
// [#4] 30fps 限速
let lastFrameTime = 0
const FRAME_MS = 1000 / 30

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const rand = (a, b) => a + Math.random() * (b - a)

// 終端機字體
const fontFamily = '"Courier New", Courier, monospace'

// 兩層假 3D（遠/近）
const LAYERS = [
  { aMul: 0.22, sizeMul: 0.86, speedMul: 0.55, blur: 1.6 },
  { aMul: 0.75, sizeMul: 1.18, speedMul: 1.00, blur: 0.0 },
]
// 每層固定格子數
const BOXES_PER_LAYER = 10

const state = {
  W: 0,
  H: 0,
  dpr: 1,
  boxes: [],
}

const tokenPool = computed(() => {
  const raw = Array.isArray(props.tokens) ? props.tokens : []
  const names = raw
    .map((t) => String(t || '').trim())
    .filter(Boolean)
    .filter((t) => /^[A-Za-z0-9 .'-]+$/.test(t))
  return names.length
    ? names
    : [
        'Tremper Albino',
        'Eclipse',
        'Blizzard',
        'Tangerine',
        'Mack Snow',
        'Super Snow',
        'Murphy Patternless',
        'RAPTOR',
        'Enigma',
      ]
})

const resize = () => {
  const canvas = matrixCanvas.value
  if (!canvas) return
  const parent = canvas.parentElement
  if (!parent) return

  const W = Math.floor(parent.clientWidth)
  const H = Math.floor(parent.clientHeight)
  if (!W || !H) return

  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
  state.W = W
  state.H = H
  state.dpr = dpr

  canvas.width = Math.floor(W * dpr)
  canvas.height = Math.floor(H * dpr)
  canvas.style.width = `${W}px`
  canvas.style.height = `${H}px`

  // [#2] 在 resize 時快取 ctx
  cachedCtx = canvas.getContext('2d')
  if (cachedCtx) cachedCtx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const pool = tokenPool.value
  const pick = () => pool[(Math.random() * pool.length) | 0]

  // 每層固定 BOXES_PER_LAYER 格，依層號明確分配
  state.boxes = LAYERS.flatMap((_, li) =>
    Array.from({ length: BOXES_PER_LAYER }, () => {
      const wBox = rand(220, 420)
      const hBox = rand(42, 66)
      return {
        x: rand(24, Math.max(24, W - wBox - 24)),
        y: rand(24, Math.max(24, H - hBox - 24)),
        w: wBox,
        h: hBox,
        layer: li,
        token: pick(),
        charIdx: 0,
        holdUntil: 0,
        holding: false,
        cpsMul: rand(0.85, 1.35),
      }
    })
  )
}

// [#4] step 接收 RAF 傳入的 now，用於 30fps 節流
const step = (now) => {
  rafId = requestAnimationFrame(step)

  // 30fps 節流
  if (now - lastFrameTime < FRAME_MS) return
  lastFrameTime = now

  // [#2] 使用快取的 ctx
  const ctx = cachedCtx
  if (!ctx) return

  const a = clamp01(props.alpha)
  if (!props.enabled || a <= 0.001) {
    ctx.clearRect(0, 0, state.W, state.H)
    return
  }

  const { W, H } = state
  if (!W || !H || !state.boxes?.length) return

  ctx.clearRect(0, 0, W, H)

  const caretOn = ((now / 260) | 0) % 2 === 0
  const pool = tokenPool.value
  const margin = 24

  for (let li = 0; li < LAYERS.length; li++) {
    const layer = LAYERS[li]
    ctx.save()
    // [#1 保留] blur filter 維持原樣
    ctx.filter = layer.blur ? `blur(${layer.blur}px)` : 'none'

    const fontPx = Math.round(22 * layer.sizeMul)
    ctx.font = `${fontPx}px ${fontFamily}`
    ctx.textBaseline = 'top'

    const alpha = a * layer.aMul

    for (const b of state.boxes) {
      if (b.layer !== li) continue

      const done = b.charIdx >= b.token.length

      if (!b.holding) {
        if (!done) {
          const cps = 9 * layer.speedMul * b.cpsMul
          b.charIdx = Math.min(b.token.length, b.charIdx + Math.max(1, Math.floor(cps / 160)))
        } else {
          // 打字完畢 → 進入停頓
          b.holding = true
          b.holdUntil = now + 500 + Math.random() * 450 // 500~950ms
        }
      } else if (now >= b.holdUntil) {
        // 停頓結束 → 消失 → 在全新隨機位置重生（直接傳送，不漂移）
        b.holding = false
        b.charIdx = 0
        b.token = pool.length ? pool[(Math.random() * pool.length) | 0] : b.token
        b.x = rand(margin, Math.max(margin, W - b.w - margin))
        b.y = rand(margin, Math.max(margin, H - b.h - margin))
      }

      // charIdx=0 且非 holding：剛重生這一幀不畫，形成視覺上的「消失→出現」
      if (b.charIdx === 0 && !b.holding) continue

      // 顏色：橘紅 / 冰藍交錯（用 x/y hash 讓分佈更均勻）
      const isBlue = (((b.x * 13 + b.y * 7) | 0) % 3) === 0
      ctx.fillStyle = isBlue ? `rgba(80, 210, 255, ${alpha})` : `rgba(255, 120, 45, ${alpha})`

      const padX = 14
      const padY = (b.h - fontPx) / 2
      // [#3] 移除 Math.sin drift，文字 x 位置固定
      const shownText =
        (b.holding ? b.token : b.token.slice(0, Math.min(b.token.length, b.charIdx))) +
        (!b.holding && b.charIdx < b.token.length && caretOn ? '▍' : '')
      ctx.fillText(shownText, b.x + padX, b.y + padY)
    }

    ctx.restore()
  }
}

const start = () => {
  if (rafId) return
  resize()
  rafId = requestAnimationFrame(step)
}
const stop = () => {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
}

onMounted(() => {
  start()
  window.addEventListener('resize', resize, { passive: true })
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  stop()
})

watch(
  () => props.enabled,
  (on) => {
    if (on) start()
    else stop()
  }
)
watch(
  () => tokenPool.value.join('|'),
  () => {
    resize()
  }
)

</script>

<style scoped>
.matrix-container {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.matrix-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  /* 重要：這層要能看見但不要把粒子壓暗 */
  mix-blend-mode: screen;
  opacity: 0.62;
}

.content-overlay {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
</style>
