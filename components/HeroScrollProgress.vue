<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'

interface JourneySegment {
  key: string
  end: number
}

const props = defineProps<{
  progress: number
  // 仍接收但目前視覺不使用分段，保留給未來需要時使用。
  segments?: JourneySegment[]
}>()

const emit = defineEmits<{
  scrub: [progress: number]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const hitRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
// 拖曳時本地即時進度，避免等 3D 回傳造成一幀延遲。
let dragProgress: number | null = null
let hoverBoost = 0

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.OrthographicCamera | null = null
let material: THREE.ShaderMaterial | null = null
let mesh: THREE.Mesh | null = null
let resizeObserver: ResizeObserver | null = null
let raf = 0
let smoothProgress = 0

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function targetProgress() {
  return clamp01(dragProgress ?? props.progress ?? 0)
}

function progressFromEvent(event: PointerEvent) {
  const el = hitRef.value
  if (!el) return 0
  const rect = el.getBoundingClientRect()
  return clamp01((event.clientY - rect.top) / Math.max(1, rect.height))
}

function onPointerEnter() {
  hoverBoost = 1
}
function onPointerLeave() {
  if (!isDragging.value) hoverBoost = 0
}
function onPointerDown(event: PointerEvent) {
  isDragging.value = true
  hoverBoost = 1
  hitRef.value?.setPointerCapture(event.pointerId)
  const p = progressFromEvent(event)
  dragProgress = p
  emit('scrub', p)
}
function onPointerMove(event: PointerEvent) {
  if (!isDragging.value) return
  const p = progressFromEvent(event)
  dragProgress = p
  emit('scrub', p)
}
function onPointerUp(event: PointerEvent) {
  if (!isDragging.value) return
  isDragging.value = false
  dragProgress = null
  try {
    hitRef.value?.releasePointerCapture(event.pointerId)
  } catch {
    /* noop */
  }
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// 電子感光帶：垂直切成多個小段，每段用 hash 決定各自的呼吸速度/相位 → 不規則多重波動；
// 指示點(uProgress)附近的呼吸振幅大幅放大；疊掃描線、資料閃爍、掃描脈衝營造電子感。
const FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uProgress;
  uniform float uActive;
  uniform vec2 uResolution;
  varying vec2 vUv;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    // x: 0 左 → 1 右（右邊界固定亮）；py: 0 上 → 1 下（對齊 uProgress）
    float x = vUv.x;
    float py = 1.0 - vUv.y;

    // ── 垂直切成不規則呼吸的小段 ──
    float N = 46.0;
    float cell = floor(py * N);
    float seed = hash(cell * 1.37 + 3.1);
    float seed2 = hash(cell * 2.11 + 7.7);
    float speed = 0.5 + seed * 2.6;        // 每段各自的呼吸速度
    float phase = seed2 * 6.2831;          // 每段各自的相位
    float breath = 0.5 + 0.5 * sin(uTime * speed + phase);

    // ── 指示點附近呼吸大幅加強 ──
    float dp = py - uProgress;
    float focus = exp(-(dp * dp) / (2.0 * 0.018 * 0.018) * 0.5); // 高斯聚焦
    focus = clamp(focus, 0.0, 1.0);
    float focusWide = clamp(exp(-(dp * dp) / (2.0 * 0.028 * 0.028) * 0.5), 0.0, 1.0);
    float amp = 0.24 + focusWide * 1.12;

    // ── 左緣波動：每段的往左延伸距離隨自身呼吸變化 → 左邊界不規則起伏 ──
    float reach = 0.52 + breath * amp * 0.09;
    float leftEdge = 1.0 - reach;
    float field = smoothstep(leftEdge, 1.0, x);
    field = pow(field, 1.35);

    float glow = field * (0.68 + breath * amp * 0.14);

    // ── 電子感 ──
    // 細掃描線
    float scan = 0.96 + 0.04 * sin(py * uResolution.y * 0.9 - uTime * 7.0);
    // 資料閃爍：每段在隨機時間格突然亮一下
    float slot = floor(uTime * 7.0 + seed * 12.0);
    float flick = step(0.94, hash(cell * 3.3 + slot));
    glow += flick * field * 0.12 * (0.35 + focusWide);
    // 水平微分段（資料條）
    float dash = step(0.48, fract(py * N * 4.6 + uTime * 0.36 * speed));
    glow *= mix(0.96, 1.015, dash);
    // 向下移動的掃描脈衝
    float pulseY = fract(py * 0.5 - uTime * 0.06);
    float pulse = smoothstep(0.03, 0.0, abs(pulseY - 0.5) - 0.47);
    glow += pulse * field * 0.045;

    glow *= scan;

    // ── 顏色：琥珀為主，右側偏白，資料閃爍帶青色電子感 ──
    vec3 amber = vec3(0.95, 0.25, 0.03);
    vec3 core = vec3(1.0, 0.42, 0.11);
    vec3 cyan = vec3(1.0, 0.55, 0.16);
    vec3 col = mix(amber, core, smoothstep(0.45, 1.0, x));
    col = mix(col, cyan, flick * 0.12);
    col += core * focusWide * 0.7;

    // 指示點：一條隨脈動的亮線 + 局部提亮
    float mark = smoothstep(0.010, 0.0, abs(dp));
    float markWide = smoothstep(0.018, 0.0, abs(dp));
    col += core * markWide * (0.74 + 0.08 * sin(uTime * 5.0));
    glow += markWide * field * 0.78;

    float a = clamp(glow, 0.0, 1.0);
    a *= 0.94 + uActive * 0.22;
    col *= 1.08 + uActive * 0.18;

    // premultiplied alpha 輸出（畫布透明疊在 hero 上）
    gl_FragColor = vec4(col * a, a);
  }
`

function resize() {
  const canvas = canvasRef.value
  if (!canvas || !renderer || !material) return
  const rect = canvas.getBoundingClientRect()
  const width = Math.max(1, Math.floor(rect.width))
  const height = Math.max(1, Math.floor(rect.height))
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.setSize(width, height, false)
  const buf = new THREE.Vector2()
  renderer.getDrawingBufferSize(buf)
  material.uniforms.uResolution.value.set(buf.x, buf.y)
}

function frame(now: number) {
  if (!renderer || !scene || !camera || !material) return
  const t = targetProgress()
  smoothProgress += (t - smoothProgress) * 0.2
  material.uniforms.uProgress.value = smoothProgress
  material.uniforms.uTime.value = now / 1000
  const activeTarget = hoverBoost
  material.uniforms.uActive.value += (activeTarget - material.uniforms.uActive.value) * 0.12
  renderer.render(scene, camera)
  raf = requestAnimationFrame(frame)
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    premultipliedAlpha: true
  })
  renderer.setClearColor(0x000000, 0)
  scene = new THREE.Scene()
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uActive: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) }
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    vertexShader: VERT,
    fragmentShader: FRAG
  })
  mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
  scene.add(mesh)

  resizeObserver = new ResizeObserver(() => resize())
  resizeObserver.observe(canvas)
  resize()
  smoothProgress = targetProgress()
  raf = requestAnimationFrame(frame)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  resizeObserver?.disconnect()
  mesh?.geometry.dispose()
  material?.dispose()
  renderer?.dispose()
})
</script>

<template>
  <div class="hsp" aria-hidden="true">
    <canvas ref="canvasRef" class="hsp__canvas" />
    <div
      ref="hitRef"
      class="hsp__hit"
      @pointerenter="onPointerEnter"
      @pointerleave="onPointerLeave"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    />
  </div>
</template>

<style scoped>
.hsp {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 6800;
  width: 96px;
  height: 100vh;
  height: 100dvh;
  pointer-events: none;
}

.hsp__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}

.hsp__hit {
  position: absolute;
  top: 0;
  right: 0;
  width: 44px;
  height: 100%;
  pointer-events: auto;
  cursor: ns-resize;
}

@media (max-width: 767px), (hover: none), (pointer: coarse) {
  .hsp {
    width: 64px;
  }
  .hsp__hit {
    width: 30px;
  }
}
</style>
