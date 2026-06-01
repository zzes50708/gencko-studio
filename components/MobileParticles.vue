<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref(null)
let rafId = 0
let lastFrame = 0
let lastTime = 0
let ctx = null
let W = 0
let H = 0
let particles = []

const COLORS = ['#ff6622', '#e8440a', '#ff8844', '#ff5500', '#ffaa44']
const FRAME_MS = 1000 / 30

function rand(a, b) { return a + Math.random() * (b - a) }

function mkParticle(forceBottom = false) {
  const glow = Math.random() < 0.35
  return {
    x: rand(0, W),
    y: forceBottom ? rand(H * 0.6, H + 20) : rand(-10, H + 10),
    vx: rand(-0.08, 0.08),
    vy: rand(-0.5, -1.2),         // 向上漂移
    size: glow ? rand(3.5, 6) : rand(1.2, 3),
    color: COLORS[(Math.random() * COLORS.length) | 0],
    opacity: rand(0.35, glow ? 0.85 : 0.55),
    phase: rand(0, Math.PI * 2),   // 橫向 sine 偏移相位
    freq: rand(0.6, 1.4),          // sine 頻率倍率
    drift: rand(0.12, 0.32),       // 橫向偏移幅度
    glow,
  }
}

function resize() {
  const c = canvasRef.value
  if (!c) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  W = window.innerWidth
  H = window.innerHeight
  c.width = W * dpr
  c.height = H * dpr
  c.style.width = `${W}px`
  c.style.height = `${H}px`
  ctx = c.getContext('2d')
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // 粒子數量依螢幕面積決定（手機效能友善）
  const count = Math.min(65, Math.max(40, Math.floor((W * H) / 8500)))
  particles = Array.from({ length: count }, () => mkParticle(false))
}

function step(now) {
  rafId = requestAnimationFrame(step)
  if (now - lastFrame < FRAME_MS) return
  const dt = Math.min(0.05, (now - lastTime) / 1000)
  lastFrame = now
  lastTime = now

  if (!ctx || !W || !H) return
  ctx.clearRect(0, 0, W, H)

  for (const p of particles) {
    // 移動
    p.x += (p.vx + Math.sin(now * 0.001 * p.freq + p.phase) * p.drift) * dt * 60
    p.y += p.vy * dt * 60

    // 超出上邊緣 → 從底部重生
    if (p.y < -8) {
      p.x = rand(0, W)
      p.y = H + 8
    }

    // 橫向超出 → 從對面回來
    if (p.x < -8) p.x = W + 8
    if (p.x > W + 8) p.x = -8

    // 透明度：頂部 12% 淡出
    let alpha = p.opacity
    const topZone = H * 0.12
    if (p.y < topZone) alpha *= p.y / topZone

    ctx.save()
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha))

    if (p.glow) {
      ctx.shadowBlur = p.size * 5
      ctx.shadowColor = p.color
    }

    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

onMounted(() => {
  resize()
  lastTime = performance.now()
  window.addEventListener('resize', resize, { passive: true })
  rafId = requestAnimationFrame(step)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('resize', resize)
})
</script>

<template>
  <canvas ref="canvasRef" class="mobile-particles" aria-hidden="true" />
</template>

<style scoped>
.mobile-particles {
  position: fixed;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  mix-blend-mode: screen;
  opacity: 0.75;
}
</style>
