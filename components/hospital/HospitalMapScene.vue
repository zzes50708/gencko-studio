<script setup lang="ts">
import { markRaw, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import { useLoop, useTres } from '@tresjs/core'
import {
  BufferAttribute,
  BufferGeometry,
  Box3,
  AmbientLight,
  DirectionalLight,
  DoubleSide,
  MeshStandardMaterial,
  ShapeGeometry,
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
  Plane,
  PerspectiveCamera,
  Raycaster,
  Shape,
  SphereGeometry,
  Vector2,
  Vector3,
  type WebGLRenderer,
  type Material
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import {
  ensureHospitalMarkerCapacity,
  refreshHospitalMarkerBounds
} from '~/utils/hospitalMapMarkers'
import {
  MAP_COUNTIES,
  countyAnchor,
  isInsideCounty,
  projectTaiwanCoordinate,
  unprojectTaiwanCoordinate,
  type MapHospital
} from '~/utils/hospitalMap'
import { buildingMapHeight, type HospitalBuilding } from '~/utils/hospitalBuildings'
import { clusterScreenHospitals, hospitalMarkerBounds } from '~/utils/hospitalMapClusters'
import { HospitalTileLayer } from '~/utils/hospitalTileLayer'
import type { TilePlace } from '~/utils/hospitalBuildingTiles'

const props = defineProps<{
  selected: string
  summaries: Map<string, { count: number; saved: number }>
  hospitals: MapHospital[]
  wishlist: (string | number)[]
  active: boolean
  reducedMotion: boolean
  compact: boolean
  command: { action: string; sequence: number; delta?: number; x?: number; y?: number }
  focusedHospital?: MapHospital | null
  focusSequence?: number
  interactionSurface?: HTMLElement | null
  detailsBelow?: boolean
}>()
const emit = defineEmits([
  'select',
  'select-hospital',
  'labels',
  'ready',
  'lost',
  'restored',
  'metrics',
  'building-error',
  'building-labels',
  'hospital-clusters',
  'request-command',
  'tile-status',
  'gesture-start'
])
const { renderer, sizes, invalidate } = useTres()
const { start, stop, isActive, onBeforeRender, onRender } = useLoop()
const camera = shallowRef<PerspectiveCamera>()
const root = markRaw(new Group())
let tileCount = 0
let tilePlaces: (TilePlace & { worldX: number; worldZ: number; key: string })[] = []
let buildingTilesEnabled = false
let tileTimer: ReturnType<typeof setTimeout> | null = null
const tileLayer = new HospitalTileLayer((status) => {
  tileCount = status.count
  tilePlaces = [
    ...status.places.filter((place) => place.category !== 'road'),
    ...status.places.filter((place) => place.category === 'road')
  ].map((place) => {
    const [worldX, worldZ] = projectTaiwanCoordinate(place.longitude, place.latitude)
    return {
      ...place,
      worldX,
      worldZ,
      key: `${place.name}/${place.longitude.toFixed(6)}/${place.latitude.toFixed(6)}`
    }
  })
  emit('tile-status', {
    loading: status.loading,
    failed: status.failed,
    count: status.count,
    enabled: status.enabled
  })
  if (tileCount) buildings.visible = false
  else buildings.visible = true
  wake()
})
root.add(tileLayer.root)
function requestViewTiles() {
  if (tileTimer) return
  tileTimer = setTimeout(() => {
    tileTimer = null
    if (!camera.value || !props.active || disposed) return
    const corners: [number, number][] = []
    for (const [x, y] of [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1]
    ]) {
      pointer.set(x!, y!)
      raycaster.setFromCamera(pointer, camera.value)
      const point = raycaster.ray.intersectPlane(ground, new Vector3())
      if (point) corners.push(unprojectTaiwanCoordinate(point.x, point.z))
    }
    const bounds =
      corners.length === 4
        ? {
            west: Math.min(...corners.map((point) => point[0])),
            east: Math.max(...corners.map((point) => point[0])),
            south: Math.min(...corners.map((point) => point[1])),
            north: Math.max(...corners.map((point) => point[1]))
          }
        : null
    if (viewCurrent.zoom >= 40) buildingTilesEnabled = true
    else if (viewCurrent.zoom < 30) buildingTilesEnabled = false
    void tileLayer.update(
      bounds,
      buildingTilesEnabled,
      unprojectTaiwanCoordinate(viewCurrent.x, viewCurrent.z)
    )
  }, 240)
}
const proxies: Mesh[] = []
const countyMeshes: { name: string; geometry: ExtrudeGeometry; anchor: Vector3 }[] = []
const colors = {
  land: '#e9e7df',
  edge: '#9aa795',
  selected: '#e8c2b3',
  marker: '#c63320',
  saved: '#86633c'
}
const landMaterial = new MeshBasicMaterial({ vertexColors: true, toneMapped: false })
const edgeMaterial = new LineBasicMaterial({ color: colors.edge, transparent: true, opacity: 0.8 })
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
    depth: 0.00001,
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
  countyMeshes.push({
    name: county.name,
    geometry,
    anchor: new Vector3(point[0], 0.00002, point[1])
  })
  const base = geometry.clone()
  tint.set(colors.land).multiplyScalar(0.98 + (index % 4) * 0.006)
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
selection.position.y = 0.000002
root.add(selection)

const matrix = new Matrix4()

let markers = new InstancedMesh(
  new SphereGeometry(0.085, 12, 8),
  new MeshBasicMaterial({ depthTest: false, depthWrite: false }),
  Math.max(1, props.hospitals.length)
)
markers.count = props.hospitals.length
markers.renderOrder = 10
root.add(markers)
const gridPoints: number[] = []
for (let i = -9; i <= 9; i += 0.5)
  gridPoints.push(-9, -0.025, i, 9, -0.025, i, i, -0.025, -9, i, -0.025, 9)
const grid = new BufferGeometry()
grid.setAttribute('position', new BufferAttribute(new Float32Array(gridPoints), 3))
grid.dispose()

const labels = countyMeshes.map((county) => ({ name: county.name, x: 0, y: 0, visible: false }))
const majorNames = new Set(['台北市', '台中市', '高雄市', '花蓮縣', '台東縣', '澎湖縣', '金門縣'])
const projected = new Vector3()
const pointer = new Vector2()
const raycaster = new Raycaster()
const viewTarget = { azimuth: 0, polar: 0, zoom: 1, x: 0, z: 0, elevation: 0 }
const viewCurrent = { ...viewTarget }
const buildings = new Group()
root.add(buildings)
let buildingCount = 0
let buildingElevation = 0
let disposed = false
let buildingLoad: Promise<void> | null = null
const buildingNames: { name: string; anchor: Vector3; height: number; heightSource: string }[] = []
root.add(new AmbientLight('#ffffff', 2))
const sun = new DirectionalLight('#fff5e3', 2.5)
sun.position.set(-4, 10, 5)
root.add(sun)
const buildingController = new AbortController()
async function previewBuildings() {
  if (!buildingLoad)
    buildingLoad = (async () => {
      const response = await fetch('/hospital-buildings-taipei101.json', {
        signal: buildingController.signal
      })
      if (!response.ok) throw new Error('建築資料無法載入')
      const data = (await response.json()) as {
        buildings: HospitalBuilding[]
        roads?: { name?: string; kind: string; ring: [number, number][] }[]
        greens?: { name?: string; ring: [number, number][] }[]
      }
      if (disposed) return
      const roof = new MeshStandardMaterial({ color: '#f0ede5', roughness: 1 })
      const side = new MeshStandardMaterial({ color: '#b7bebd', roughness: 1 })
      const landmarkRoof = new MeshStandardMaterial({ color: '#e7a88d', roughness: 1 })
      const landmarkSide = new MeshStandardMaterial({ color: '#b75c40', roughness: 1 })
      const outline = new LineBasicMaterial({ color: '#8f9997', transparent: true, opacity: 0.5 })
      const shadow = new MeshBasicMaterial({
        color: '#656d64',
        transparent: true,
        opacity: 0.13,
        depthWrite: false,
        side: DoubleSide
      })
      for (const building of data.buildings) {
        const shape = new Shape(
          building.ring.map(([lon, lat]) => {
            const [x, z] = projectTaiwanCoordinate(lon, lat)
            return new Vector2(x, -z)
          })
        )
        const geometry = new ExtrudeGeometry(shape, {
          depth: buildingMapHeight(building),
          bevelEnabled: false,
          steps: 1,
          curveSegments: 1
        })
        geometry.rotateX(-Math.PI / 2)
        const isLandmark = building.id === '1159328965'
        const mesh = new Mesh(geometry, isLandmark ? [landmarkRoof, landmarkSide] : [roof, side])
        mesh.position.y = 0.00002
        mesh.renderOrder = 4
        buildings.add(mesh)
        const wire = new LineSegments(new EdgesGeometry(geometry, 25), outline)
        wire.position.y = mesh.position.y
        wire.renderOrder = 5
        buildings.add(wire)
        const shadowGeometry = geometry.clone()
        const positions = shadowGeometry.attributes.position!
        for (let i = 0; i < positions.count; i++) {
          const h = positions.getY(i)
          positions.setXYZ(i, positions.getX(i) + h * 0.38, 0.000018, positions.getZ(i) - h * 0.25)
        }
        shadowGeometry.computeBoundingSphere()
        const shade = new Mesh(shadowGeometry, shadow)
        shade.renderOrder = 3
        buildings.add(shade)
        if (
          building.name &&
          (isLandmark || ['君悅酒店', '展覽大樓', '微風南山', 'ATT 4 FUN'].includes(building.name))
        ) {
          const box = new Box3().setFromObject(mesh)
          const anchor = box.getCenter(new Vector3())
          anchor.y = box.max.y
          buildingNames.push({
            name: building.name,
            anchor,
            height: building.height,
            heightSource: building.heightSource
          })
        }
      }
      const streetPositions: number[] = []
      const greenGeometries: BufferGeometry[] = []
      for (const green of data.greens || []) {
        const shape = new Shape(
          green.ring.map(([lon, lat]) => {
            const [x, z] = projectTaiwanCoordinate(lon, lat)
            return new Vector2(x, -z)
          })
        )
        const geometry = new ShapeGeometry(shape)
        geometry.rotateX(-Math.PI / 2)
        geometry.translate(0, 0.000014, 0)
        greenGeometries.push(geometry)
      }
      if (greenGeometries.length) {
        buildings.add(
          new Mesh(
            mergeGeometries(greenGeometries)!,
            new MeshBasicMaterial({ color: '#d2dfc5', toneMapped: false, side: DoubleSide })
          )
        )
        greenGeometries.forEach((geometry) => geometry.dispose())
      }
      for (const road of data.roads || []) {
        if (
          road.name &&
          ['primary', 'secondary', 'tertiary', 'residential'].includes(road.kind) &&
          !buildingNames.some((item) => item.name === road.name)
        ) {
          const midpoint = road.ring[Math.floor(road.ring.length / 2)]!
          const [x, z] = projectTaiwanCoordinate(...midpoint)
          buildingNames.push({
            name: road.name,
            anchor: new Vector3(x, 0.000016, z),
            height: 0,
            heightSource: '道路'
          })
        }
        const width = ['primary', 'secondary', 'tertiary'].includes(road.kind)
          ? 0.00035
          : ['footway', 'pedestrian'].includes(road.kind)
            ? 0.000065
            : 0.00018
        for (let i = 1; i < road.ring.length; i++) {
          const a = projectTaiwanCoordinate(...road.ring[i - 1]!)
          const b = projectTaiwanCoordinate(...road.ring[i]!)
          const length = Math.hypot(b[0] - a[0], b[1] - a[1])
          if (!length) continue
          const dx = ((-(b[1] - a[1]) / length) * width) / 2
          const dz = (((b[0] - a[0]) / length) * width) / 2
          const points = [
            [a[0] + dx, a[1] + dz],
            [a[0] - dx, a[1] - dz],
            [b[0] + dx, b[1] + dz],
            [b[0] + dx, b[1] + dz],
            [a[0] - dx, a[1] - dz],
            [b[0] - dx, b[1] - dz]
          ]
          for (const point of points) streetPositions.push(point[0]!, 0.000015, point[1]!)
        }
      }
      const streets = new BufferGeometry()
      streets.setAttribute('position', new BufferAttribute(new Float32Array(streetPositions), 3))
      buildings.add(
        new Mesh(streets, new MeshBasicMaterial({ color: '#ffffff', side: DoubleSide }))
      )
      buildingCount = data.buildings.length
      // 靜態量體依材質合併，避免每棟建築都產生多次繪製呼叫。
      const batches = new Map<Material, BufferGeometry[]>()
      const wires: BufferGeometry[] = []
      const shades: BufferGeometry[] = []
      for (const child of [...buildings.children]) {
        if (child instanceof Mesh && child.renderOrder === 4) {
          for (const group of child.geometry.groups) {
            const part = new BufferGeometry()
            for (const [name, attribute] of Object.entries(child.geometry.attributes)) {
              const buffer = attribute as BufferAttribute
              const array = buffer.array.slice(
                group.start * buffer.itemSize,
                (group.start + group.count) * buffer.itemSize
              )
              part.setAttribute(name, new BufferAttribute(array, buffer.itemSize))
            }
            const material = (child.material as Material[])[group.materialIndex!]!
            const list = batches.get(material) || []
            list.push(part)
            batches.set(material, list)
          }
          buildings.remove(child)
          child.geometry.dispose()
        } else if (child instanceof LineSegments && child.renderOrder === 5) {
          wires.push(child.geometry)
          buildings.remove(child)
        } else if (child instanceof Mesh && child.renderOrder === 3) {
          shades.push(child.geometry)
          buildings.remove(child)
        }
      }
      for (const [material, parts] of batches) {
        const mesh = new Mesh(mergeGeometries(parts)!, material)
        mesh.position.y = 0.00002
        mesh.renderOrder = 4
        buildings.add(mesh)
        parts.forEach((part) => part.dispose())
      }
      const wireBatch = new LineSegments(mergeGeometries(wires)!, outline)
      wireBatch.position.y = 0.00002
      wireBatch.renderOrder = 5
      buildings.add(wireBatch)
      const shadeBatch = new Mesh(mergeGeometries(shades)!, shadow)
      shadeBatch.renderOrder = 3
      buildings.add(shadeBatch)
      wires.forEach((geometry) => geometry.dispose())
      shades.forEach((geometry) => geometry.dispose())
    })().catch(() => {
      buildingLoad = null
      emit('building-error')
    })
  await buildingLoad
  if (disposed || !buildingCount) return
  // 框選主地標與周邊，不把圖資範圍外延伸的道路計入構圖。
  const bounds = new Box3()
  buildings.children.forEach((item) => {
    if (item instanceof Mesh && item.renderOrder === 4) bounds.expandByObject(item)
  })
  const center = bounds.getCenter(new Vector3())
  const size = bounds.getSize(new Vector3())
  buildingElevation = size.y * 0.35
  const aspect = sizes.width.value / Math.max(1, sizes.height.value)
  // 框選完整街區，並預留樓高在傾斜查看時的投影範圍。
  const zoom = Math.min((14 * aspect) / size.x, 14 / (size.z + size.y * 0.2)) * 0.82
  Object.assign(viewTarget, { x: center.x, z: center.z, zoom, polar: 0, azimuth: 0, elevation: 0 })
  wake()
}
let settled = false
let mounted = false
let frames = 0
let lastMetricsEmit = 0
let lastTimestamp = 0
let canvas: HTMLCanvasElement | undefined
let inputSurface: HTMLElement | undefined
let touchedMultiple = false
const pointers = new Map<
  number,
  {
    x: number
    y: number
    startX: number
    startY: number
    moved: boolean
    rotate: boolean
    interactive: boolean
  }
>()
const ground = new Plane(new Vector3(0, 1, 0), -0.00001)
const panStart = new Vector3()
const panEnd = new Vector3()
let gestureRect: DOMRect | null = null
let hospitalAnchors: { id: string | number; x: number; z: number }[] = []

function pan(fromX: number, fromY: number, toX: number, toY: number) {
  if (!canvas || !camera.value) return
  const rect = gestureRect || (gestureRect = canvas.getBoundingClientRect())
  if (!rect.width || !rect.height) return
  const intersect = (x: number, y: number, target: Vector3) => {
    pointer.set(((x - rect.left) / rect.width) * 2 - 1, 1 - ((y - rect.top) / rect.height) * 2)
    raycaster.setFromCamera(pointer, camera.value!)
    return raycaster.ray.intersectPlane(ground, target)
  }
  if (intersect(fromX, fromY, panStart) && intersect(toX, toY, panEnd)) {
    viewTarget.x = Math.max(-10, Math.min(10, viewTarget.x + panStart.x - panEnd.x))
    viewTarget.z = Math.max(-10, Math.min(10, viewTarget.z + panStart.z - panEnd.z))
    wake()
  }
}

function focusHospital() {
  const hospital = props.focusedHospital
  if (!hospital || !Number.isFinite(hospital.latitude) || !Number.isFinite(hospital.longitude))
    return
  const [x, z] = projectTaiwanCoordinate(hospital.longitude!, hospital.latitude!)
  Object.assign(viewTarget, { x, z, zoom: 200, elevation: 0 })
  wake()
}

function focusCity() {
  if (props.selected === 'all') {
    runCommand('reset')
    return
  }
  const county = countyMeshes.find((item) => item.name === props.selected)
  if (!county) return
  county.geometry.computeBoundingBox()
  const bounds = county.geometry.boundingBox!
  const center = bounds.getCenter(new Vector3()),
    size = bounds.getSize(new Vector3())
  const aspect = sizes.width.value / Math.max(1, sizes.height.value)
  const zoom = Math.max(
    2,
    Math.min(
      120,
      Math.min((14 * aspect) / Math.max(size.x, 0.001), 14 / Math.max(size.z, 0.001)) * 0.7
    )
  )
  Object.assign(viewTarget, { x: center.x, z: center.z, zoom, elevation: 0 })
  wake()
}

let contextLost = false
function wake() {
  if (!mounted || !props.active || contextLost) return
  if (settled) lastMetricsEmit = 0
  settled = false
  invalidate()
  if (!isActive.value) start()
}
function updateData() {
  const selected = countyMeshes.find((county) => county.name === props.selected)
  selection.visible = !!selected
  if (selected) selection.geometry = selected.geometry
  const favorites = new Set(props.wishlist.map(String))
  markers = ensureHospitalMarkerCapacity(markers, props.hospitals.length)
  markers.count = props.hospitals.length
  hospitalAnchors = props.hospitals.map((hospital) => {
    const [x, z] = projectTaiwanCoordinate(hospital.longitude!, hospital.latitude!)
    return { id: hospital.id, x, z }
  })
  props.hospitals.forEach((hospital, i) => {
    const point = hospitalAnchors[i]!
    // 院名由可操作的 HTML 標記呈現，隱藏的實例不必隨相機逐幀上傳。
    matrix.makeScale(0, 0, 0)
    matrix.setPosition(point.x, 0.00003, point.z)
    markers.setMatrixAt(i, matrix)
    markers.setColorAt(
      i,
      tint.set(favorites.has(String(hospital.id)) ? colors.saved : colors.marker)
    )
  })
  refreshHospitalMarkerBounds(markers)

  wake()
}

function setZoom(value: number) {
  const next = Math.min(2000, Math.max(0.7, value))
  if (next === viewTarget.zoom) return
  viewTarget.zoom = next
  wake()
}
const zoomCamera = new PerspectiveCamera()
let cameraClearance = 0
let cameraClearanceSettled = true
function updateCameraPose(cam: PerspectiveCamera, view: typeof viewTarget) {
  const aspect = sizes.width.value / Math.max(1, sizes.height.value)
  const baseDistance = Math.max(17.8, 14 / Math.max(0.6, aspect)) / view.zoom
  const localHeight = view.zoom >= 30 ? tileLayer.maximumHeight(view.x, view.z, baseDistance) : 0
  const clearance = Math.max(0, localHeight - view.elevation) + baseDistance * 0.4
  if (cam === camera.value) {
    cameraClearance += (clearance - cameraClearance) * (props.reducedMotion ? 1 : 0.15)
    cameraClearanceSettled = Math.abs(clearance - cameraClearance) < baseDistance * 0.001
  }
  const distance = Math.max(baseDistance, cam === camera.value ? cameraClearance : clearance)
  cam.aspect = aspect
  // 依觀看距離調整近裁切面，避免街區的道路與地面深度精度不足而閃爍。
  cam.near = Math.max(0.00001, baseDistance * 0.01)
  cam.far = Math.max(40, distance * 4)
  cam.up.set(0, 0, -1)
  cam.updateProjectionMatrix()
  cam.position.set(
    view.x + distance * Math.sin(view.polar) * Math.sin(view.azimuth),
    view.elevation + distance * Math.cos(view.polar),
    view.z + distance * Math.sin(view.polar) * Math.cos(view.azimuth)
  )
  cam.lookAt(view.x, view.elevation, view.z)
  cam.updateMatrixWorld()
}
function zoomAtPointer(value: number, x?: number, y?: number) {
  if (Math.min(2000, Math.max(0.7, value)) === viewTarget.zoom) return
  if (!canvas || !camera.value || x === undefined || y === undefined) {
    setZoom(value)
    return
  }
  const rect = canvas.getBoundingClientRect()
  pointer.set(((x - rect.left) / rect.width) * 2 - 1, 1 - ((y - rect.top) / rect.height) * 2)
  zoomCamera.copy(camera.value)
  updateCameraPose(zoomCamera, viewTarget)
  raycaster.setFromCamera(pointer, zoomCamera)
  const before = raycaster.ray.intersectPlane(ground, panStart)
  setZoom(value)
  updateCameraPose(zoomCamera, viewTarget)
  raycaster.setFromCamera(pointer, zoomCamera)
  if (before && raycaster.ray.intersectPlane(ground, panEnd)) {
    viewTarget.x = Math.max(-10, Math.min(10, viewTarget.x + panStart.x - panEnd.x))
    viewTarget.z = Math.max(-10, Math.min(10, viewTarget.z + panStart.z - panEnd.z))
  }
}
function runCommand(action: string) {
  if (action === 'retry-tiles') {
    tileLayer.retry()
    requestViewTiles()
    return
  }
  if (action.startsWith('place:')) {
    const [longitude, latitude] = action.slice(6).split(',').map(Number)
    if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
      const [x, z] = projectTaiwanCoordinate(longitude!, latitude!)
      Object.assign(viewTarget, { x, z, zoom: Math.max(350, viewTarget.zoom), elevation: 0 })
      wake()
    }
    return
  }
  if (action.startsWith('cluster:') || action.startsWith('fit:')) {
    const fitting = action.startsWith('fit:')
    const ids = action.slice(fitting ? 4 : 8).split(',')
    const members = props.hospitals.filter((hospital) => ids.includes(String(hospital.id)))
    if (!members.length) return
    const bounds = new Box3()
    for (const hospital of members) {
      const [x, z] = projectTaiwanCoordinate(hospital.longitude!, hospital.latitude!)
      bounds.expandByPoint(new Vector3(x, 0, z))
    }
    const center = bounds.getCenter(new Vector3())
    const size = bounds.getSize(new Vector3())
    const aspect = sizes.width.value / Math.max(1, sizes.height.value)
    const zoom = Math.min(
      1400,
      Math.max(
        fitting ? 0.7 : viewTarget.zoom * 2,
        Math.min((14 * aspect) / Math.max(size.x, 0.001), 14 / Math.max(size.z, 0.001)) * 0.6
      )
    )
    Object.assign(viewTarget, { x: center.x, z: center.z, zoom, elevation: 0 })
    wake()
    return
  }
  if (action === 'buildings') {
    void previewBuildings()
    return
  }
  if (action === 'top') {
    viewTarget.polar = 0
    viewTarget.elevation = 0
    wake()
    return
  }
  if (action === 'tilt') {
    viewTarget.polar = 0.55
    viewTarget.elevation =
      viewTarget.zoom > 60
        ? tileLayer.maximumHeight(viewTarget.x, viewTarget.z, 17.8 / viewTarget.zoom) * 0.35 ||
          buildingElevation
        : 0
    wake()
    return
  }
  if (action === 'in') setZoom(viewTarget.zoom * 1.6)
  else if (action === 'out') setZoom(viewTarget.zoom / 1.6)
  else if (action === 'wheel')
    zoomAtPointer(
      viewTarget.zoom * Math.exp(-(props.command.delta || 0) * 0.002),
      props.command.x,
      props.command.y
    )
  else if (action === 'reset') {
    Object.assign(viewTarget, { azimuth: 0, polar: 0, zoom: 1, x: 0, z: 0, elevation: 0 })
    wake()
  }
}
function onPointerDown(event: PointerEvent) {
  if (event.button !== 0 || contextLost || !props.active) return
  const target = event.target instanceof Element ? event.target : null
  if (
    target?.closest(
      '.map-tools,.map-place-detail,.map-hospital-detail,.map-result-preview,.map-shared-location,.map-tile-status'
    )
  )
    return
  emit('gesture-start')
  if (!pointers.size) gestureRect = canvas?.getBoundingClientRect() || null
  const interactive = !!target?.closest('.map-cluster,.map-building-label,.map-pin')
  if (!interactive) canvas?.focus({ preventScroll: true })
  pointers.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
    rotate: false,
    interactive
  })
  if (pointers.size > 1) touchedMultiple = true
  if (!interactive) canvas?.setPointerCapture(event.pointerId)
  if (canvas) canvas.style.cursor = 'grabbing'
}
function onPointerMove(event: PointerEvent) {
  const old = pointers.get(event.pointerId)
  if (!old) return
  if (event.pointerType === 'mouse' && !(event.buttons & 1)) {
    onPointerCancel(event)
    if (canvas?.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    return
  }
  const dx = event.clientX - old.x
  const dy = event.clientY - old.y
  if (Math.hypot(event.clientX - old.startX, event.clientY - old.startY) > 5) old.moved = true
  if (!old.moved && pointers.size === 1) return
  if (old.moved && old.interactive && !canvas?.hasPointerCapture(event.pointerId)) {
    canvas?.setPointerCapture(event.pointerId)
    canvas?.focus({ preventScroll: true })
  }
  if (pointers.size === 2) {
    const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)![1]
    const before = Math.hypot(old.x - other.x, old.y - other.y)
    const after = Math.hypot(event.clientX - other.x, event.clientY - other.y)
    if (before > 5) setZoom((viewTarget.zoom * after) / before)
    pan(
      (old.x + other.x) / 2,
      (old.y + other.y) / 2,
      (event.clientX + other.x) / 2,
      (event.clientY + other.y) / 2
    )
  } else if (old.rotate) {
    viewTarget.azimuth = Math.max(-0.85, Math.min(0.85, viewTarget.azimuth - dx * 0.004))
    viewTarget.polar = Math.max(0.28, Math.min(1.12, viewTarget.polar - dy * 0.003))
    wake()
  } else pan(old.x, old.y, event.clientX, event.clientY)
  old.x = event.clientX
  old.y = event.clientY
}
function onPointerUp(event: PointerEvent) {
  const previous = pointers.get(event.pointerId)
  const wasMultiple = touchedMultiple
  pointers.delete(event.pointerId)
  if (canvas && !pointers.size) canvas.style.cursor = 'grab'
  if (canvas?.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
  if (
    previous &&
    !previous.rotate &&
    !previous.interactive &&
    !previous.moved &&
    !wasMultiple &&
    camera.value &&
    canvas
  ) {
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
    if (hit && viewCurrent.zoom < 60) emit('select', hit.object.userData.city)
  }
  if (!pointers.size) {
    touchedMultiple = false
    gestureRect = null
  }
}
function onPointerCancel(event: PointerEvent) {
  pointers.delete(event.pointerId)
  if (!pointers.size) {
    gestureRect = null
    touchedMultiple = false
    if (canvas) canvas.style.cursor = 'grab'
  }
}
function onContextMenu(event: Event) {
  event.preventDefault()
}
function onDoubleClick(event: MouseEvent) {
  if (contextLost || !props.active || event.ctrlKey || event.metaKey || event.altKey) return
  event.preventDefault()
  emit('gesture-start')
  zoomAtPointer(viewTarget.zoom * (event.shiftKey ? 0.5 : 2), event.clientX, event.clientY)
}
function onKey(event: KeyboardEvent) {
  if (contextLost || !props.active) return
  if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return
  if (
    !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '0', 'Home'].includes(
      event.key
    )
  )
    return
  event.preventDefault()
  emit('gesture-start')
  if (['+', '='].includes(event.key)) runCommand('in')
  else if (event.key === '-') runCommand('out')
  else if (event.key === '0' || event.key === 'Home') emit('request-command', 'reset')
  else {
    const step = 0.5 / viewTarget.zoom
    viewTarget.x += event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
    viewTarget.z += event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
    wake()
  }
}
function onContextLost(event: Event) {
  event.preventDefault()
  contextLost = true
  stop()
  emit('lost')
}
function onContextRestored() {
  contextLost = false
  emit('restored')
  wake()
}

const beforeHook = onBeforeRender(({ delta }) => {
  if (!camera.value || !props.active || contextLost) {
    stop()
    return
  }
  const dt = Math.min(0.05, Math.max(1 / 120, delta))
  const alpha = props.reducedMotion ? 1 : 1 - Math.exp(-12 * dt)
  viewCurrent.azimuth += (viewTarget.azimuth - viewCurrent.azimuth) * alpha
  viewCurrent.polar += (viewTarget.polar - viewCurrent.polar) * alpha
  viewCurrent.zoom += (viewTarget.zoom - viewCurrent.zoom) * alpha
  viewCurrent.x += (viewTarget.x - viewCurrent.x) * alpha
  viewCurrent.z += (viewTarget.z - viewCurrent.z) * alpha
  viewCurrent.elevation += (viewTarget.elevation - viewCurrent.elevation) * alpha
  updateCameraPose(camera.value, viewCurrent)
  // 隨縮放保持定位點可辨識，避免近距離時球體遮住整張圖。
  const hospitalPoints: { id: string | number; x: number; y: number }[] = []
  hospitalAnchors.forEach(({ id, x, z }) => {
    projected.set(x, 0.00003, z).project(camera.value)
    const screenX = ((projected.x + 1) / 2) * sizes.width.value
    const screenY = ((-projected.y + 1) / 2) * sizes.height.value
    if (
      screenX > 22 &&
      screenX < sizes.width.value - 22 &&
      screenY > 22 &&
      screenY < sizes.height.value - 22
    )
      hospitalPoints.push({ id, x: screenX, y: screenY })
  })
  const clusters = clusterScreenHospitals(hospitalPoints, 70, true, sizes.width.value)
  const clusterBounds = clusters.map((cluster) => hospitalMarkerBounds(cluster, sizes.width.value))
  emit('hospital-clusters', clusters)
  const buildingLabels: {
    name: string
    x: number
    y: number
    height: number
    heightSource: string
    longitude?: number
    latitude?: number
    category?: string
  }[] = []
  if (viewCurrent.zoom >= 40) {
    for (const item of (tileCount ? [] : [...buildingNames]).sort(
      (a, b) => Number(b.name === '台北101') - Number(a.name === '台北101')
    )) {
      projected.copy(item.anchor).project(camera.value)
      const x = ((projected.x + 1) / 2) * sizes.width.value
      const y = ((-projected.y + 1) / 2) * sizes.height.value
      if (x < 100 || x > sizes.width.value - 100 || y < 45 || y > sizes.height.value - 55) continue
      if (buildingLabels.some((label) => Math.abs(label.x - x) < 140 && Math.abs(label.y - y) < 45))
        continue
      const [longitude, latitude] = unprojectTaiwanCoordinate(item.anchor.x, item.anchor.z)
      buildingLabels.push({ ...item, x, y, longitude, latitude, category: 'building' })
    }
    const names = new Set(
      buildingLabels.map(
        (label) => `${label.name}/${label.longitude?.toFixed(6)}/${label.latitude?.toFixed(6)}`
      )
    )
    for (const place of tilePlaces) {
      const key = place.key
      if (names.has(key)) continue
      projected.set(place.worldX, 0.00004, place.worldZ).project(camera.value)
      const x = ((projected.x + 1) / 2) * sizes.width.value,
        y = ((-projected.y + 1) / 2) * sizes.height.value
      if (x < 95 || x > sizes.width.value - 95 || y < 50 || y > sizes.height.value - 55) continue
      if (x < 210 && y < 170) continue
      if (!props.detailsBelow && props.focusedHospital && x > sizes.width.value - 380 && y < 260)
        continue
      // 院所標記優先保留點擊空間，避免一般地標蓋住醫院。
      if (
        clusterBounds.some((bounds) => {
          return (
            x + 95 > bounds.left &&
            x - 95 < bounds.right &&
            y + 24 > bounds.top &&
            y - 24 < bounds.bottom
          )
        })
      )
        continue
      if (buildingLabels.some((label) => Math.abs(label.x - x) < 150 && Math.abs(label.y - y) < 45))
        continue
      buildingLabels.push({ ...place, x, y, height: 0, heightSource: '開放地標' })
      names.add(key)
      if (buildingLabels.length >= 35) break
    }
  }
  emit('building-labels', buildingLabels)
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i]!
    projected.copy(countyMeshes[i]!.anchor).project(camera.value)
    label.x = ((projected.x + 1) / 2) * sizes.width.value
    label.y = ((-projected.y + 1) / 2) * sizes.height.value
    label.visible =
      viewCurrent.zoom < 5 &&
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
    cameraClearanceSettled &&
    Math.abs(viewTarget.azimuth - viewCurrent.azimuth) +
      Math.abs(viewTarget.polar - viewCurrent.polar) +
      Math.abs(viewTarget.zoom - viewCurrent.zoom) <
      0.0003 &&
    (Math.abs(viewTarget.x - viewCurrent.x) +
      Math.abs(viewTarget.z - viewCurrent.z) +
      Math.abs(viewTarget.elevation - viewCurrent.elevation)) *
      Math.max(1, viewCurrent.zoom) <
      0.0003
  invalidate()
})
const afterHook = onRender(() => {
  frames++
  const now = performance.now()
  const info = (renderer as WebGLRenderer).info
  if (settled || now - lastMetricsEmit >= 100) {
    lastMetricsEmit = now
    emit('metrics', {
      frames,
      zoom: viewCurrent.zoom,
      calls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      idle: settled,
      frameMs: lastTimestamp ? Math.round(now - lastTimestamp) : 0,
      buildings:
        tileCount ||
        (viewCurrent.zoom >= 60 &&
        Math.abs(viewCurrent.x - projectTaiwanCoordinate(121.564, 25.033)[0]) < 0.035 &&
        Math.abs(viewCurrent.z - projectTaiwanCoordinate(121.564, 25.033)[1]) < 0.035
          ? buildingCount
          : 0),
      cameraType: camera.value?.type || ''
    })
  }
  lastTimestamp = now
  requestViewTiles()
  if (settled) stop()
})

watch(() => [props.selected, props.summaries, props.hospitals, props.wishlist], updateData, {
  immediate: true,
  deep: true
})
watch(() => props.selected, focusCity)
watch(() => [props.focusedHospital?.id, props.focusSequence], focusHospital, { immediate: true })
watch(
  () => props.command.sequence,
  () => runCommand(props.command.action)
)
watch(
  () => props.active,
  (active) => {
    if (active) wake()
    else {
      if (tileTimer) clearTimeout(tileTimer)
      tileLayer.suspend()
      for (const id of pointers.keys())
        if (canvas?.hasPointerCapture(id)) canvas.releasePointerCapture(id)
      pointers.clear()
      gestureRect = null
      if (canvas) canvas.style.cursor = 'grab'
      touchedMultiple = false
      stop()
    }
  }
)
watch([sizes.width, sizes.height, () => props.compact], () => {
  gestureRect = null
  wake()
})
onMounted(() => {
  mounted = true
  canvas = renderer.domElement as HTMLCanvasElement
  canvas.tabIndex = 0
  canvas.setAttribute(
    'aria-label',
    '立體特寵醫院地圖：拖曳或方向鍵平移，滾輪或雙擊縮放，加減鍵縮放，Home 或 0 重設'
  )
  canvas.style.touchAction = 'none'
  canvas.style.cursor = 'grab'
  inputSurface = props.interactionSurface || canvas
  inputSurface.addEventListener('pointerdown', onPointerDown)
  inputSurface.addEventListener('pointermove', onPointerMove)
  inputSurface.addEventListener('pointerup', onPointerUp)
  inputSurface.addEventListener('pointercancel', onPointerCancel)
  inputSurface.addEventListener('lostpointercapture', onPointerCancel)
  canvas.addEventListener('contextmenu', onContextMenu)
  canvas.addEventListener('keydown', onKey)
  canvas.addEventListener('dblclick', onDoubleClick)
  canvas.addEventListener('webglcontextlost', onContextLost)
  canvas.addEventListener('webglcontextrestored', onContextRestored)
  emit('ready')
  wake()
})
onUnmounted(() => {
  if (tileTimer) clearTimeout(tileTimer)
  tileLayer.dispose()
  disposed = true
  buildingController.abort()
  mounted = false
  stop()
  beforeHook.off()
  afterHook.off()
  inputSurface?.removeEventListener('pointerdown', onPointerDown)
  inputSurface?.removeEventListener('pointermove', onPointerMove)
  inputSurface?.removeEventListener('pointerup', onPointerUp)
  inputSurface?.removeEventListener('pointercancel', onPointerCancel)
  inputSurface?.removeEventListener('lostpointercapture', onPointerCancel)
  canvas?.removeEventListener('contextmenu', onContextMenu)
  canvas?.removeEventListener('keydown', onKey)
  canvas?.removeEventListener('dblclick', onDoubleClick)
  canvas?.removeEventListener('webglcontextlost', onContextLost)
  canvas?.removeEventListener('webglcontextrestored', onContextRestored)
  pointers.clear()
  const geometries = new Set<BufferGeometry>()
  const materials = new Set<Material>()
  root.traverse((object) => {
    const item = object as Mesh<BufferGeometry, MeshBasicMaterial>
    if (item.geometry) geometries.add(item.geometry)
    if (Array.isArray(item.material)) item.material.forEach((material) => materials.add(material))
    else if (item.material) materials.add(item.material)
  })
  countyMeshes.forEach((county) => geometries.add(county.geometry))
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
  markers.dispose()
  pickMaterial.dispose()
})
</script>

<template>
  <TresPerspectiveCamera
    ref="camera"
    :position="[0, 20, 0]"
    :up="[0, 0, -1]"
    :near="0.000001"
    :fov="43"
    :far="100"
  />
  <primitive :object="root" :dispose="null" />
</template>
