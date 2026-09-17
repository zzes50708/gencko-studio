<script setup lang="ts">
import { markRaw, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import { useLoop, useTres } from '@tresjs/core'
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  EdgesGeometry,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Path,
  PerspectiveCamera,
  Raycaster,
  Shape,
  SphereGeometry,
  Vector2,
  Vector3,
  type WebGLRenderer
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import {
  MAP_COUNTIES,
  countyAnchor,
  isInsideCounty,
  projectTaiwanCoordinate,
  type MapHospital,
  type MapPoint
} from '~/utils/hospitalMap'

const props = defineProps<{
  selected: string
  summaries: Map<string, { count: number; saved: number }>
  hospitals: MapHospital[]
  wishlist: (string | number)[]
  active: boolean
  reducedMotion: boolean
  compact: boolean
  command: { action: string; sequence: number }
}>()
const emit = defineEmits(['select', 'select-hospital', 'labels', 'ready', 'lost', 'metrics'])
const { renderer, sizes, invalidate } = useTres()
const { start, stop, isActive, onBeforeRender, onRender } = useLoop()
const camera = shallowRef<PerspectiveCamera>()
const root = markRaw(new Group())
const proxies: Mesh[] = []
const countyMeshes: { name: string; geometry: ExtrudeGeometry; anchor: Vector3 }[] = []
const colors = {
  land: '#122236',
  edge: '#476e94',
  selected: '#a95529',
  marker: '#78cfff',
  saved: '#f07baa'
}
const landMaterial = new MeshBasicMaterial({ vertexColors: true })
const edgeMaterial = new LineBasicMaterial({ color: colors.edge, transparent: true, opacity: 0.55 })
const pickMaterial = new MeshBasicMaterial()
const baseGeometries: BufferGeometry[] = []
const edges: BufferGeometry[] = []
const tint = new Color()

// 縣界是真實圖資；擠出高度與線框量體僅表達地圖層次，不代表地形或建物高度。
for (const [index, county] of MAP_COUNTIES.entries()) {
  const shapes = county.polygons.map(([outer, ...holes]) => {
    const shape = new Shape(outer!.map(([x, z]) => new Vector2(x, -z)))
    shape.holes = holes.map((hole) => new Path(hole.map(([x, z]) => new Vector2(x, -z))))
    return shape
  })
  const geometry = new ExtrudeGeometry(shapes, {
    depth: 0.095,
    bevelEnabled: false,
    curveSegments: 1,
    steps: 1
  })
  geometry.rotateX(-Math.PI / 2)
  const proxy = new Mesh(geometry, pickMaterial)
  proxy.userData.city = county.name
  proxy.updateMatrixWorld()
  proxies.push(proxy)
  const point = countyAnchor(county.polygons)
  countyMeshes.push({ name: county.name, geometry, anchor: new Vector3(point[0], 0.32, point[1]) })
  const base = geometry.clone()
  tint.set(colors.land).multiplyScalar(0.85 + (index % 4) * 0.07)
  const vertexColors = new Float32Array(base.attributes.position!.count * 3)
  for (let i = 0; i < vertexColors.length; i += 3) tint.toArray(vertexColors, i)
  base.setAttribute('color', new BufferAttribute(vertexColors, 3))
  baseGeometries.push(base)
  edges.push(new EdgesGeometry(geometry, 25))
}
root.add(new Mesh(mergeGeometries(baseGeometries)!, landMaterial))
root.add(new LineSegments(mergeGeometries(edges)!, edgeMaterial))
baseGeometries.forEach((geometry) => geometry.dispose())
edges.forEach((geometry) => geometry.dispose())

const selection = new Mesh(
  countyMeshes[0]!.geometry,
  new MeshBasicMaterial({ color: colors.selected })
)
selection.visible = false
selection.position.y = 0.004
root.add(selection)

// 共用方塊 Instancing + 合併線段：不為每個示意街廓建立獨立 draw call。
const blocks: { x: number; z: number; h: number; w: number }[] = []
for (let z = -5; z < 5.4; z += 0.23)
  for (let x = -5; x < 5.4; x += 0.23) {
    const point: MapPoint = [x, z]
    if (MAP_COUNTIES.some((county) => isInsideCounty(point, county.polygons))) {
      const seed = Math.abs(Math.sin(x * 19.71 + z * 37.29))
      if (seed > 0.25) blocks.push({ x, z, h: 0.06 + seed * 0.22, w: 0.07 + seed * 0.055 })
    }
  }
const blockGeometry = new BoxGeometry(1, 1, 1)
const buildings = new InstancedMesh(
  blockGeometry,
  new MeshBasicMaterial({ color: '#172b43' }),
  blocks.length
)
const matrix = new Matrix4()
const blockEdges = new EdgesGeometry(blockGeometry)
const linePoints: number[] = []
const edgeVertex = new Vector3()
blocks.forEach((block, i) => {
  matrix.makeScale(block.w, block.h, block.w)
  matrix.setPosition(block.x, 0.095 + block.h / 2, block.z)
  buildings.setMatrixAt(i, matrix)
  for (let j = 0; j < blockEdges.attributes.position!.count; j++) {
    edgeVertex.fromBufferAttribute(blockEdges.attributes.position!, j).applyMatrix4(matrix)
    linePoints.push(edgeVertex.x, edgeVertex.y, edgeVertex.z)
  }
})
buildings.instanceMatrix.needsUpdate = true
root.add(buildings)
const buildingLines = new BufferGeometry()
buildingLines.setAttribute('position', new BufferAttribute(new Float32Array(linePoints), 3))
root.add(
  new LineSegments(
    buildingLines,
    new LineBasicMaterial({ color: '#537ca3', transparent: true, opacity: 0.42 })
  )
)
blockEdges.dispose()

const markers = new InstancedMesh(
  new SphereGeometry(0.085, 12, 8),
  new MeshBasicMaterial({ vertexColors: true }),
  Math.max(1, props.hospitals.length)
)
markers.count = props.hospitals.length
root.add(markers)
const gridPoints: number[] = []
for (let i = -9; i <= 9; i += 0.5)
  gridPoints.push(-9, -0.025, i, 9, -0.025, i, i, -0.025, -9, i, -0.025, 9)
const grid = new BufferGeometry()
grid.setAttribute('position', new BufferAttribute(new Float32Array(gridPoints), 3))
root.add(
  new LineSegments(
    grid,
    new LineBasicMaterial({ color: '#294766', transparent: true, opacity: 0.25 })
  )
)

const labels = countyMeshes.map((county) => ({ name: county.name, x: 0, y: 0, visible: false }))
const majorNames = new Set(['台北市', '台中市', '高雄市', '花蓮縣', '台東縣', '澎湖縣', '金門縣'])
const projected = new Vector3()
const pointer = new Vector2()
const raycaster = new Raycaster()
const viewTarget = { azimuth: 0.27, polar: 0.73, zoom: 1 }
const viewCurrent = { ...viewTarget }
let settled = false
let mounted = false
let frames = 0
let lastTimestamp = 0
let canvas: HTMLCanvasElement | undefined
let touchedMultiple = false
const pointers = new Map<
  number,
  { x: number; y: number; startX: number; startY: number; moved: boolean }
>()

function wake() {
  if (!mounted || !props.active) return
  settled = false
  invalidate()
  if (!isActive.value) start()
}
function updateData() {
  const selected = countyMeshes.find((county) => county.name === props.selected)
  selection.visible = !!selected
  if (selected) selection.geometry = selected.geometry
  const favorites = new Set(props.wishlist.map(String))
  markers.count = props.hospitals.length
  props.hospitals.forEach((hospital, i) => {
    const point = projectTaiwanCoordinate(hospital.longitude!, hospital.latitude!)
    const scale = props.selected === 'all' || hospital.city === props.selected ? 1 : 0.55
    matrix.makeScale(scale, scale, scale)
    matrix.setPosition(point[0], 0.34, point[1])
    markers.setMatrixAt(i, matrix)
    markers.setColorAt(
      i,
      tint.set(favorites.has(String(hospital.id)) ? colors.saved : colors.marker)
    )
  })
  markers.instanceMatrix.needsUpdate = true
  if (markers.instanceColor) markers.instanceColor.needsUpdate = true
  wake()
}

function setZoom(value: number) {
  viewTarget.zoom = Math.min(2.5, Math.max(0.7, value))
  wake()
}
function runCommand(action: string) {
  if (action === 'in') setZoom(viewTarget.zoom * 1.22)
  else if (action === 'out') setZoom(viewTarget.zoom / 1.22)
  else if (action === 'reset') {
    Object.assign(viewTarget, { azimuth: 0.27, polar: 0.73, zoom: 1 })
    wake()
  }
}
function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  canvas?.focus({ preventScroll: true })
  pointers.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY,
    startX: event.clientX,
    startY: event.clientY,
    moved: false
  })
  if (pointers.size > 1) touchedMultiple = true
  canvas?.setPointerCapture(event.pointerId)
}
function onPointerMove(event: PointerEvent) {
  const old = pointers.get(event.pointerId)
  if (!old) return
  const dx = event.clientX - old.x
  const dy = event.clientY - old.y
  if (Math.hypot(event.clientX - old.startX, event.clientY - old.startY) > 5) old.moved = true
  if (pointers.size === 2) {
    const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)![1]
    const before = Math.hypot(old.x - other.x, old.y - other.y)
    const after = Math.hypot(event.clientX - other.x, event.clientY - other.y)
    if (before > 5) setZoom((viewTarget.zoom * after) / before)
  } else {
    viewTarget.azimuth = Math.max(-0.85, Math.min(0.85, viewTarget.azimuth - dx * 0.004))
    viewTarget.polar = Math.max(0.28, Math.min(1.12, viewTarget.polar - dy * 0.003))
    wake()
  }
  old.x = event.clientX
  old.y = event.clientY
}
function onPointerUp(event: PointerEvent) {
  const previous = pointers.get(event.pointerId)
  pointers.delete(event.pointerId)
  if (canvas?.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
  if (previous && !previous.moved && !touchedMultiple && camera.value && canvas) {
    const rect = canvas.getBoundingClientRect()
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1
    )
    raycaster.setFromCamera(pointer, camera.value)
    const markerHit = raycaster.intersectObject(markers, false)[0]
    if (markerHit?.instanceId != null) {
      const hospital = props.hospitals[markerHit.instanceId]
      if (hospital) {
        emit('select-hospital', hospital.id)
        return
      }
    }
    const hit = raycaster.intersectObjects(proxies, false)[0]
    if (hit) emit('select', hit.object.userData.city)
  }
  if (!pointers.size) touchedMultiple = false
}
function onPointerCancel(event: PointerEvent) {
  pointers.delete(event.pointerId)
  if (!pointers.size) touchedMultiple = false
}
function onWheel(event: WheelEvent) {
  // 一般滾輪保留頁面捲動；Ctrl/⌘ + 滾輪才操作地圖。
  if (!event.ctrlKey && !event.metaKey) return
  event.preventDefault()
  setZoom(viewTarget.zoom * Math.exp(-event.deltaY * 0.002))
}
function onKey(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '0'].includes(event.key))
    return
  event.preventDefault()
  if (['+', '='].includes(event.key)) runCommand('in')
  else if (event.key === '-') runCommand('out')
  else if (event.key === '0') runCommand('reset')
  else {
    viewTarget.azimuth = Math.max(
      -0.85,
      Math.min(
        0.85,
        viewTarget.azimuth +
          (event.key === 'ArrowLeft' ? -0.12 : event.key === 'ArrowRight' ? 0.12 : 0)
      )
    )
    viewTarget.polar = Math.max(
      0.28,
      Math.min(
        1.12,
        viewTarget.polar + (event.key === 'ArrowUp' ? -0.08 : event.key === 'ArrowDown' ? 0.08 : 0)
      )
    )
    wake()
  }
}
function onContextLost(event: Event) {
  event.preventDefault()
  stop()
  emit('lost')
}

const beforeHook = onBeforeRender(({ delta }) => {
  if (!camera.value || !props.active) {
    stop()
    return
  }
  const dt = Math.min(0.05, Math.max(1 / 120, delta))
  const alpha = props.reducedMotion ? 1 : 1 - Math.exp(-12 * dt)
  viewCurrent.azimuth += (viewTarget.azimuth - viewCurrent.azimuth) * alpha
  viewCurrent.polar += (viewTarget.polar - viewCurrent.polar) * alpha
  viewCurrent.zoom += (viewTarget.zoom - viewCurrent.zoom) * alpha
  const aspect = sizes.width.value / Math.max(1, sizes.height.value)
  const distance = Math.max(13.3, 10.3 / Math.max(0.6, aspect)) / viewCurrent.zoom
  camera.value.position.set(
    distance * Math.sin(viewCurrent.polar) * Math.sin(viewCurrent.azimuth),
    distance * Math.cos(viewCurrent.polar),
    distance * Math.sin(viewCurrent.polar) * Math.cos(viewCurrent.azimuth)
  )
  camera.value.lookAt(0, 0, 0)
  camera.value.updateMatrixWorld()
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i]!
    projected.copy(countyMeshes[i]!.anchor).project(camera.value)
    label.x = ((projected.x + 1) / 2) * sizes.width.value
    label.y = ((-projected.y + 1) / 2) * sizes.height.value
    label.visible =
      (majorNames.has(label.name) || label.name === props.selected) &&
      projected.z < 1 &&
      label.x > 35 &&
      label.x < sizes.width.value - 35 &&
      label.y > 65 &&
      label.y < sizes.height.value - 35
    if (label.visible && label.name !== props.selected)
      for (let j = 0; j < i; j++) {
        const previous = labels[j]!
        if (
          previous.visible &&
          Math.abs(previous.x - label.x) < 78 &&
          Math.abs(previous.y - label.y) < 35
        )
          label.visible = false
      }
  }
  emit('labels', labels)
  settled =
    Math.abs(viewTarget.azimuth - viewCurrent.azimuth) +
      Math.abs(viewTarget.polar - viewCurrent.polar) +
      Math.abs(viewTarget.zoom - viewCurrent.zoom) <
    0.0003
  invalidate()
})
const afterHook = onRender(() => {
  frames++
  const now = performance.now()
  const info = (renderer as WebGLRenderer).info
  emit('metrics', {
    frames,
    calls: info.render.calls,
    triangles: info.render.triangles,
    geometries: info.memory.geometries,
    idle: settled,
    frameMs: lastTimestamp ? Math.round(now - lastTimestamp) : 0,
    buildings: blocks.length
  })
  lastTimestamp = now
  if (settled) stop()
})

watch(() => [props.selected, props.summaries, props.hospitals, props.wishlist], updateData, {
  immediate: true,
  deep: true
})
watch(
  () => props.command.sequence,
  () => runCommand(props.command.action)
)
watch(
  () => props.active,
  (active) => {
    if (active) wake()
    else {
      pointers.clear()
      touchedMultiple = false
      stop()
    }
  }
)
watch([sizes.width, sizes.height, () => props.compact], wake)
onMounted(() => {
  mounted = true
  canvas = renderer.domElement as HTMLCanvasElement
  canvas.tabIndex = 0
  canvas.setAttribute(
    'aria-label',
    '立體特寵醫院地圖：點選光點查看院所；拖曳旋轉、雙指縮放；鍵盤方向鍵旋轉，加減鍵縮放，0 重設'
  )
  canvas.style.touchAction = 'none'
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerCancel)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('keydown', onKey)
  canvas.addEventListener('webglcontextlost', onContextLost)
  emit('ready')
  wake()
})
onUnmounted(() => {
  mounted = false
  stop()
  beforeHook.off()
  afterHook.off()
  canvas?.removeEventListener('pointerdown', onPointerDown)
  canvas?.removeEventListener('pointermove', onPointerMove)
  canvas?.removeEventListener('pointerup', onPointerUp)
  canvas?.removeEventListener('pointercancel', onPointerCancel)
  canvas?.removeEventListener('wheel', onWheel)
  canvas?.removeEventListener('keydown', onKey)
  canvas?.removeEventListener('webglcontextlost', onContextLost)
  pointers.clear()
  const geometries = new Set<BufferGeometry>()
  const materials = new Set<MeshBasicMaterial | LineBasicMaterial>()
  root.traverse((object) => {
    const item = object as Mesh<BufferGeometry, MeshBasicMaterial>
    if (item.geometry) geometries.add(item.geometry)
    if (item.material) materials.add(item.material)
  })
  countyMeshes.forEach((county) => geometries.add(county.geometry))
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
  markers.dispose()
  buildings.dispose()
  pickMaterial.dispose()
})
</script>

<template>
  <TresPerspectiveCamera ref="camera" :position="[3, 10, 11]" :fov="43" :near="0.1" :far="100" />
  <primitive :object="root" :dispose="null" />
</template>
