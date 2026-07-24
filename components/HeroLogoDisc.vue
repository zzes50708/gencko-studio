<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

const props = withDefaults(defineProps<{ src?: string }>(), {
  src: '/logo.png'
})

const canvas = ref<HTMLCanvasElement | null>(null)

let renderer: THREE.WebGLRenderer | null = null
let raf = 0
let onResize: (() => void) | null = null
let styleObserver: MutationObserver | null = null
const disposables: { dispose(): void }[] = []

const KEY = {
  lumLo: 0.6,
  lumHi: 0.82,
  satLo: 0.1,
  satHi: 0.26
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function keyOutBackground(img: HTMLImageElement): HTMLCanvasElement {
  const cvs = document.createElement('canvas')
  cvs.width = img.naturalWidth || 512
  cvs.height = img.naturalHeight || 512
  const ctx = cvs.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const id = ctx.getImageData(0, 0, cvs.width, cvs.height)
  const d = id.data

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255
    const g = d[i + 1] / 255
    const b = d[i + 2] / 255
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    const mx = Math.max(r, g, b)
    const mn = Math.min(r, g, b)
    const sat = mx > 1e-4 ? (mx - mn) / mx : 0
    const bright = smoothstep(KEY.lumLo, KEY.lumHi, lum)
    const desat = 1 - smoothstep(KEY.satLo, KEY.satHi, sat)
    const bgness = bright * desat
    d[i + 3] = Math.round(d[i + 3] * (1 - bgness))
  }

  ctx.putImageData(id, 0, 0)
  return cvs
}

onMounted(() => {
  const el = canvas.value
  if (!el) return

  const parent = el.parentElement as HTMLElement | null
  let w = parent?.clientWidth || 360
  let h = parent?.clientHeight || 360

  renderer = new THREE.WebGLRenderer({ canvas: el, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.setSize(w, h, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 100)
  camera.position.set(0, 0, 5.1)

  const pmrem = new THREE.PMREMGenerator(renderer)
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.5)
  scene.environment = envRT.texture
  pmrem.dispose()
  disposables.push(envRT)

  const key = new THREE.DirectionalLight('#fff2e6', 1.7)
  key.position.set(2.4, 3.2, 4.2)
  scene.add(key)

  const rim = new THREE.DirectionalLight('#8fbfff', 0.7)
  rim.position.set(-3, -1.2, 2)
  scene.add(rim)

  scene.add(new THREE.AmbientLight('#ffffff', 0.22))

  const group = new THREE.Group()
  scene.add(group)

  new THREE.ImageLoader().load(
    props.src,
    (img) => {
      const tex = new THREE.CanvasTexture(keyOutBackground(img))
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = renderer?.capabilities.getMaxAnisotropy() ?? 1
      disposables.push(tex)

      const R = 1.4
      const halfT = 0.17
      const fil = 0.12
      const seg = 14

      const prof: THREE.Vector2[] = [new THREE.Vector2(0, halfT), new THREE.Vector2(R - fil, halfT)]
      for (let i = 1; i <= seg; i++) {
        const a = (i / seg) * (Math.PI / 2)
        prof.push(new THREE.Vector2(R - fil + Math.sin(a) * fil, halfT - fil + Math.cos(a) * fil))
      }
      prof.push(new THREE.Vector2(R, -halfT + fil))
      for (let i = 1; i <= seg; i++) {
        const a = (i / seg) * (Math.PI / 2)
        prof.push(new THREE.Vector2(R - fil + Math.cos(a) * fil, -halfT + fil - Math.sin(a) * fil))
      }
      prof.push(new THREE.Vector2(0, -halfT))

      const bodyGeo = new THREE.LatheGeometry(prof, 256)
      disposables.push(bodyGeo)

      const bodyMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#140f11'),
        metalness: 0.0,
        roughness: 0.4,
        clearcoat: 1.0,
        clearcoatRoughness: 0.12,
        envMapIntensity: 0.65,
        side: THREE.DoubleSide
      })
      disposables.push(bodyMat)

      const body = new THREE.Mesh(bodyGeo, bodyMat)
      body.rotation.x = -Math.PI / 2
      group.add(body)

      const faceGeo = new THREE.CircleGeometry(R - fil * 0.6, 180)
      disposables.push(faceGeo)

      const faceMat = new THREE.MeshPhysicalMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.01,
        metalness: 0.0,
        roughness: 0.3,
        clearcoat: 1.0,
        clearcoatRoughness: 0.06,
        emissive: new THREE.Color('#ffffff'),
        emissiveMap: tex,
        emissiveIntensity: 0.4,
        envMapIntensity: 1.15
      })
      disposables.push(faceMat)

      const face = new THREE.Mesh(faceGeo, faceMat)
      face.position.z = halfT + 0.012
      face.renderOrder = 1
      group.add(face)
      requestRender()
    },
    undefined,
    () => console.warn('[HeroLogoDisc] 無法載入 logo PNG:', props.src)
  )

  const root = document.documentElement
  let currentSpin = 0
  let lastExitProgress = Number.NaN
  let lastRotateProgress = Number.NaN

  const requestRender = () => {
    if (!raf) raf = requestAnimationFrame(renderOnce)
  }

  const renderOnce = () => {
    raf = 0

    const exitProgress = parseFloat(root.style.getPropertyValue('--hero-exit-progress')) || 0
    const rotateProgress =
      parseFloat(root.style.getPropertyValue('--hero-logo-rotate-progress')) || 0
    if (exitProgress < -1) return

    // rotate 0=面向左、0.5=正面、1=面向右（單調連續，對應 T1 左→正、T2 正→右）
    const targetSpin = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(-90, 90, rotateProgress))
    currentSpin += (targetSpin - currentSpin) * 0.12
    group.rotation.y = currentSpin
    group.rotation.x = 0.05
    renderer?.render(scene, camera)

    const spinSettled = Math.abs(targetSpin - currentSpin) < 0.0008
    const progressStable =
      Math.abs(exitProgress - lastExitProgress) < 0.0002 &&
      Math.abs(rotateProgress - lastRotateProgress) < 0.0002
    lastExitProgress = exitProgress
    lastRotateProgress = rotateProgress

    if (!spinSettled || !progressStable) requestRender()
  }

  styleObserver = new MutationObserver(requestRender)
  styleObserver.observe(root, { attributes: true, attributeFilter: ['style'] })
  requestRender()

  onResize = () => {
    if (!renderer || !parent) return
    w = parent.clientWidth || w
    h = parent.clientHeight || h
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    requestRender()
  }
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  raf = 0
  styleObserver?.disconnect()
  styleObserver = null
  if (onResize) window.removeEventListener('resize', onResize)
  disposables.forEach((d) => d.dispose())
  renderer?.dispose()
  renderer = null
})
</script>

<template>
  <canvas ref="canvas" class="logo-disc" />
</template>

<style scoped>
.logo-disc {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
