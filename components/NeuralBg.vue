<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

// 神經雜訊（Neural Noise）動態背景：全螢幕 WebGL shader，暗底 + 流動的光絲。
// 預設調成橘色；hue/saturation/chroma 沿用參考元件的 API（OKLCH 色彩）。
interface Props {
  hue?: number // OKLCH 色相（度）。橘色約 30–60；藍青約 200。
  saturation?: number // 0–1，往灰階混合的比例（0＝灰、1＝全彩）
  chroma?: number // 0–1，色彩濃度（映射到 OKLCH chroma）
  speed?: number // 動態速度倍率
  intensity?: number // 光絲亮度倍率
  paused?: boolean // true＝停掉動畫迴圈（省電）；轉回 false 會自動續跑
}

const props = withDefaults(defineProps<Props>(), {
  hue: 40, // 橘色
  saturation: 0.9,
  chroma: 0.62,
  speed: 1,
  intensity: 1,
  paused: false
})

const canvas = ref<HTMLCanvasElement | null>(null)

let gl: WebGLRenderingContext | null = null
let program: WebGLProgram | null = null
let raf = 0
let startTime = 0
let ro: ResizeObserver | null = null
let reduceMotion = false

// 平滑指標視差
const pointer = { x: 0, y: 0, tx: 0, ty: 0 }

let uTime: WebGLUniformLocation | null = null
let uRes: WebGLUniformLocation | null = null
let uPointer: WebGLUniformLocation | null = null
let uColor: WebGLUniformLocation | null = null
let uIntensity: WebGLUniformLocation | null = null

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`

const FRAG = `
precision highp float;
varying vec2 v_uv;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform vec3 u_color;
uniform float u_intensity;

vec2 rot(vec2 p, float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, s, -s, c) * p;
}

// 逐層旋轉 + 正弦堆疊，長出神經網狀的流動光絲。
float neuro(vec2 uv, float t) {
  vec2 acc = vec2(0.0);
  vec2 res = vec2(0.0);
  float scale = 8.0;
  for (int j = 0; j < 15; j++) {
    uv = rot(uv, 1.0);
    acc = rot(acc, 1.0);
    vec2 layer = uv * scale + float(j) + acc - t;
    acc += sin(layer);
    res += (0.5 + 0.5 * cos(layer)) / scale;
    scale *= 1.2;
  }
  return res.x + res.y;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  uv += u_pointer * 0.12;

  float n = neuro(uv, u_time);
  n = 1.25 * pow(n, 3.0);
  n += pow(n, 12.0);
  n = max(0.0, n - 0.5);

  // 邊緣暈影，讓中央光絲更聚焦。
  float vig = 1.0 - smoothstep(0.35, 1.05, length(v_uv - 0.5) * 1.7);
  n *= vig;

  vec3 col = u_color * n * u_intensity;
  gl_FragColor = vec4(col, 1.0);
}`

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x))
}

// OKLCH → sRGB（0–1）。忠實還原 hue/chroma 的色相，比 HSL 飽和度更均勻。
function oklchToSrgb(L: number, C: number, H: number): [number, number, number] {
  const hr = (H * Math.PI) / 180
  const a = C * Math.cos(hr)
  const b = C * Math.sin(hr)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  const enc = (x: number) =>
    x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(Math.max(0, x), 1 / 2.4) - 0.055
  return [clamp01(enc(r)), clamp01(enc(g)), clamp01(enc(bl))]
}

function computeBaseColor(): [number, number, number] {
  const L = 0.68
  const C = clamp01(props.chroma) * 0.33 // 0.33 ≈ sRGB 內橘色可達的高 chroma
  const [r, g, b] = oklchToSrgb(L, C, props.hue)
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const s = clamp01(props.saturation)
  return [luma + (r - luma) * s, luma + (g - luma) * s, luma + (b - luma) * s]
}

function compile(type: number, src: string) {
  if (!gl) return null
  const sh = gl.createShader(type)
  if (!sh) return null
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn('[NeuralBg] shader error:', gl.getShaderInfoLog(sh))
    gl.deleteShader(sh)
    return null
  }
  return sh
}

function setColorUniform() {
  if (!gl || !program || !uColor) return
  gl.useProgram(program)
  gl.uniform3fv(uColor, computeBaseColor())
}

function resize() {
  const el = canvas.value
  if (!el || !gl) return
  const dpr = Math.min(1.5, window.devicePixelRatio || 1)
  const w = Math.max(1, Math.round(el.clientWidth * dpr))
  const h = Math.max(1, Math.round(el.clientHeight * dpr))
  if (el.width !== w || el.height !== h) {
    el.width = w
    el.height = h
    gl.viewport(0, 0, w, h)
  }
  if (uRes) {
    gl.useProgram(program)
    gl.uniform2f(uRes, w, h)
  }
}

function frame(now: number) {
  if (!gl || !program) return
  if (!startTime) startTime = now
  const seconds = (now - startTime) / 1000

  pointer.x += (pointer.tx - pointer.x) * 0.06
  pointer.y += (pointer.ty - pointer.y) * 0.06

  gl.useProgram(program)
  if (uTime) gl.uniform1f(uTime, reduceMotion ? 0.4 : seconds * 0.5 * props.speed)
  if (uPointer) gl.uniform2f(uPointer, pointer.x, pointer.y)
  gl.drawArrays(gl.TRIANGLES, 0, 6)

  // reduced-motion 或 paused：畫一幀後就停，不再持續耗電。
  if (!reduceMotion && !props.paused) raf = requestAnimationFrame(frame)
  else raf = 0
}

function onPointerMove(e: PointerEvent) {
  const el = canvas.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  pointer.tx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1
  pointer.ty = -(((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1)
}

onMounted(() => {
  const el = canvas.value
  if (!el) return
  reduceMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  gl =
    (el.getContext('webgl', { antialias: true, alpha: false }) as WebGLRenderingContext | null) ||
    (el.getContext('experimental-webgl') as WebGLRenderingContext | null)
  if (!gl) {
    console.warn('[NeuralBg] WebGL 不可用')
    return
  }

  const vs = compile(gl.VERTEX_SHADER, VERT)
  const fs = compile(gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) return
  program = gl.createProgram()
  if (!program) return
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('[NeuralBg] program link 失敗:', gl.getProgramInfoLog(program))
    return
  }

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  )
  const loc = gl.getAttribLocation(program, 'a_pos')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  uTime = gl.getUniformLocation(program, 'u_time')
  uRes = gl.getUniformLocation(program, 'u_resolution')
  uPointer = gl.getUniformLocation(program, 'u_pointer')
  uColor = gl.getUniformLocation(program, 'u_color')
  uIntensity = gl.getUniformLocation(program, 'u_intensity')

  gl.useProgram(program)
  if (uIntensity) gl.uniform1f(uIntensity, props.intensity)
  setColorUniform()
  resize()

  ro = new ResizeObserver(resize)
  ro.observe(el)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  raf = requestAnimationFrame(frame)
})

watch(
  () => [props.hue, props.saturation, props.chroma],
  () => setColorUniform()
)
watch(
  () => props.intensity,
  (v) => {
    if (gl && program && uIntensity) {
      gl.useProgram(program)
      gl.uniform1f(uIntensity, v)
    }
  }
)
// 由 paused 回到播放時，重新啟動動畫迴圈。
watch(
  () => props.paused,
  (v) => {
    if (!v && !reduceMotion && gl && program && !raf) {
      raf = requestAnimationFrame(frame)
    }
  }
)

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('pointermove', onPointerMove)
  if (ro) ro.disconnect()
  if (gl) {
    const ext = gl.getExtension('WEBGL_lose_context')
    if (ext) ext.loseContext()
  }
  gl = null
  program = null
})
</script>

<template>
  <canvas ref="canvas" class="neural-bg" aria-hidden="true" />
</template>

<style scoped>
.neural-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  background: #050505;
}
</style>
