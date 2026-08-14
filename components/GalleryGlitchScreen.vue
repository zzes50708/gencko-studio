<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import {
  createCyberpunkGlitchTransitionMaterial,
  type CyberpunkGlitchTransitionMaterial
} from '@/utils/cyberpunk-glitch-transition-material'

interface GalleryCard {
  title: string
  color: string
  accent: string
  kind: string
  video: string
}

const props = defineProps<{
  card: GalleryCard
  mode?: 'enter' | 'exit'
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const TEXTURE_WIDTH = 960
const TEXTURE_HEIGHT = 540
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.OrthographicCamera | null = null
let material: CyberpunkGlitchTransitionMaterial | null = null
let mesh: THREE.Mesh | null = null
let resizeObserver: ResizeObserver | null = null
let raf = 0
let resizeRaf = 0
let transitionStart = 0
let currentTexture: THREE.Texture | null = null
let previousTexture: THREE.Texture | null = null
let videoElement: HTMLVideoElement | null = null
let videoTexture: THREE.VideoTexture | null = null

function makeCardTexture(card: GalleryCard, variant: 'full' | 'ghost' | 'dark' = 'full') {
  const ghost = variant === 'ghost'
  const dark = variant === 'dark'
  const cvs = document.createElement('canvas')
  cvs.width = TEXTURE_WIDTH
  cvs.height = TEXTURE_HEIGHT
  const ctx = cvs.getContext('2d', { alpha: false })!
  const bg = ctx.createLinearGradient(0, 0, cvs.width, cvs.height)
  bg.addColorStop(0, dark ? '#050607' : card.accent)
  bg.addColorStop(0.38, '#101416')
  bg.addColorStop(1, dark ? '#070403' : card.color)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, cvs.width, cvs.height)

  ctx.globalAlpha = dark ? 0.55 : ghost ? 0.22 : 0.38
  ctx.fillStyle = '#000'
  for (let y = 0; y < cvs.height; y += 5) ctx.fillRect(0, y, cvs.width, 1)

  ctx.globalAlpha = dark ? 0.08 : ghost ? 0.18 : 0.32
  ctx.fillStyle = card.color
  ctx.beginPath()
  ctx.arc(cvs.width * 0.72, cvs.height * 0.38, cvs.width * 0.22, 0, Math.PI * 2)
  ctx.fill()

  ctx.globalAlpha = 1
  ctx.fillStyle = dark
    ? 'rgba(255,180,120,0.08)'
    : ghost
      ? 'rgba(255,255,255,0.28)'
      : 'rgba(255,250,242,0.92)'
  ctx.font = '800 112px "Noto Sans TC", "PingFang TC", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(card.title, cvs.width / 2, cvs.height / 2)

  ctx.fillStyle = dark
    ? 'rgba(255,145,78,0.08)'
    : ghost
      ? 'rgba(255,237,218,0.22)'
      : 'rgba(255,237,218,0.58)'
  ctx.font = '700 28px "Courier New", monospace'
  ctx.textAlign = 'left'
  ctx.fillText(card.kind, 82, cvs.height - 86)

  const texture = new THREE.CanvasTexture(cvs)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  return texture
}

function resize() {
  const canvas = canvasRef.value
  if (!canvas || !renderer || !camera) return
  const rect = canvas.getBoundingClientRect()
  const width = Math.max(1, Math.floor(rect.width))
  const height = Math.max(1, Math.floor(rect.height))
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25))
  renderer.setSize(width, height, false)
  camera.left = -1
  camera.right = 1
  camera.top = 1
  camera.bottom = -1
  camera.updateProjectionMatrix()
  renderFrame(performance.now())
}

function scheduleResize() {
  cancelAnimationFrame(resizeRaf)
  resizeRaf = requestAnimationFrame(resize)
}

function renderFrame(now: number) {
  if (!renderer || !scene || !camera || !material) return
  const elapsed = (now - transitionStart) / 1000
  const progress = Math.min(1, elapsed / 0.82)
  material.uniforms.uProgress.value = progress
  material.uniforms.uTime.value = now / 1000
  renderer.render(scene, camera)
  if (progress < 1) raf = requestAnimationFrame(renderFrame)
}

function startTransition(card: GalleryCard, mode: 'enter' | 'exit' = 'enter') {
  if (!material) return
  if (videoElement && videoElement.src !== new URL(card.video, window.location.href).href) {
    videoElement.src = card.video
    videoElement.load()
    videoElement.play().catch(() => {})
  }
  const nextPreviousTexture = makeCardTexture(card, mode === 'exit' ? 'full' : 'ghost')
  const nextCurrentTexture =
    mode === 'exit' || !videoTexture ? makeCardTexture(card, 'dark') : videoTexture
  if (previousTexture && previousTexture !== videoTexture) previousTexture.dispose()
  if (currentTexture && currentTexture !== videoTexture) currentTexture.dispose()
  previousTexture = nextPreviousTexture
  currentTexture = nextCurrentTexture
  material.uniforms.uTextureA.value = previousTexture
  material.uniforms.uTextureB.value = currentTexture
  material.uniforms.uProgress.value = 0
  transitionStart = performance.now()
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(renderFrame)
}

onMounted(async () => {
  await nextTick()
  const canvas = canvasRef.value
  if (!canvas) return

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance'
  })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  videoElement = document.createElement('video')
  videoElement.src = props.card.video
  videoElement.muted = true
  videoElement.loop = true
  videoElement.playsInline = true
  videoElement.preload = 'auto'
  videoElement.setAttribute('playsinline', '')
  videoTexture = new THREE.VideoTexture(videoElement)
  videoTexture.colorSpace = THREE.SRGBColorSpace
  videoTexture.minFilter = THREE.LinearFilter
  videoTexture.magFilter = THREE.LinearFilter
  videoElement.play().catch(() => {})
  scene = new THREE.Scene()
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  material = createCyberpunkGlitchTransitionMaterial({
    progress: 0,
    displacementStrength: 0.085,
    rgbSplitStrength: 0.014,
    noiseScale: 5.6,
    lineDensity: 54
  })
  mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
  scene.add(mesh)

  resizeObserver = new ResizeObserver(scheduleResize)
  resizeObserver.observe(canvas)
  scheduleResize()
  startTransition(props.card, props.mode ?? 'enter')
})

watch(
  () => [props.card.title, props.mode] as const,
  () => startTransition(props.card, props.mode ?? 'enter')
)

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  cancelAnimationFrame(resizeRaf)
  resizeObserver?.disconnect()
  mesh?.geometry.dispose()
  material?.dispose()
  if (currentTexture && currentTexture !== videoTexture) currentTexture.dispose()
  if (previousTexture && previousTexture !== videoTexture) previousTexture.dispose()
  videoTexture?.dispose()
  if (videoElement) {
    videoElement.pause()
    videoElement.removeAttribute('src')
    videoElement.load()
  }
  renderer?.dispose()
})
</script>

<template>
  <canvas ref="canvasRef" class="gallery-glitch-screen" />
</template>

<style scoped>
.gallery-glitch-screen {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
