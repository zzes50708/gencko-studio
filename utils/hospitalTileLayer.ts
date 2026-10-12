import {
  BufferAttribute,
  BufferGeometry,
  Box3,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Path,
  Shape,
  ShapeGeometry,
  Vector2,
  type Material
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { projectTaiwanCoordinate } from './hospitalMap'
import { buildingMapHeight } from './hospitalBuildings'
import {
  visibleBuildingTiles,
  type BuildingTileData,
  type GeographicBounds,
  type TileCoordinate,
  type TilePlace
} from './hospitalBuildingTiles'

type Entry = {
  group: Group
  count: number
  places: TilePlace[]
  bounds: Box3
  heights: Box3[]
  lastUsed: number
}
export class HospitalTileLayer {
  readonly root = new Group()
  private cache = new Map<string, Entry>()
  private controller: AbortController | null = null
  private worker: Worker | null = null
  private tasks = new Map<
    number,
    { resolve: (value: BuildingTileData) => void; reject: (error: Error) => void }
  >()
  private taskId = 0
  private generation = 0
  private viewKey = ''
  private active = new Set<string>()
  private dead = false
  private roof = new MeshStandardMaterial({ color: '#eeeae1', roughness: 1 })
  private side = new MeshStandardMaterial({ color: '#a8b5b0', roughness: 1 })
  private road = new MeshStandardMaterial({ color: '#ffffff', side: DoubleSide, roughness: 1 })
  private green = new MeshStandardMaterial({ color: '#c6d8b5', side: DoubleSide, roughness: 1 })
  private water = new MeshStandardMaterial({ color: '#c8dee1', side: DoubleSide, roughness: 1 })
  constructor(
    private changed: (status: {
      loading: boolean
      failed: boolean
      count: number
      places: TilePlace[]
      enabled: boolean
    }) => void
  ) {}
  private status(loading: boolean, failed = false) {
    const entries = [...this.active]
      .map((key) => this.cache.get(key))
      .filter((entry): entry is Entry => !!entry)
    this.changed({
      loading,
      failed,
      count: entries.reduce((sum, entry) => sum + entry.count, 0),
      places: entries.flatMap((entry) => entry.places),
      enabled: this.active.size > 0
    })
  }
  private parse(buffer: ArrayBuffer, tile: TileCoordinate): Promise<BuildingTileData> {
    if (!this.worker) {
      this.worker = new Worker(new URL('./hospitalBuildingTiles.worker.ts', import.meta.url), {
        type: 'module'
      })
      this.worker.onmessage = (event) => {
        const task = this.tasks.get(event.data.id)
        if (!task) return
        this.tasks.delete(event.data.id)
        event.data.error ? task.reject(new Error(event.data.error)) : task.resolve(event.data.data)
      }
      this.worker.onerror = () => {
        this.tasks.forEach((task) => task.reject(new Error('圖磚解析失敗')))
        this.tasks.clear()
        this.worker?.terminate()
        this.worker = null
      }
    }
    const id = ++this.taskId
    return new Promise((resolve, reject) => {
      this.tasks.set(id, { resolve, reject })
      this.worker!.postMessage({ id, buffer, tile }, [buffer])
    })
  }
  private async fetchTile(url: string, signal: AbortSignal) {
    const controller = new AbortController()
    const abort = () => controller.abort()
    if (signal.aborted) abort()
    signal.addEventListener('abort', abort, { once: true })
    const timer = setTimeout(abort, 20000)
    try {
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) throw new Error('圖磚下載失敗')
      return await response.arrayBuffer()
    } finally {
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
    }
  }
  async update(bounds: GeographicBounds | null, enabled: boolean) {
    const tiles = enabled && bounds ? visibleBuildingTiles(bounds) : []
    const key = tiles.map((tile) => `${tile.z}/${tile.x}/${tile.y}`).join('|')
    if (key === this.viewKey) return
    this.viewKey = key
    this.controller?.abort()
    const generation = ++this.generation
    this.controller = new AbortController()
    const signal = this.controller.signal
    this.active = new Set(key ? key.split('|') : [])
    this.cache.forEach((entry, id) => {
      entry.group.visible = this.active.has(id)
      if (entry.group.visible) entry.lastUsed = Date.now()
    })
    if (!tiles.length) {
      this.status(false)
      return
    }
    this.status(true)
    const queue = [...tiles]
    let failed = false
    const load = async () => {
      while (queue.length && !signal.aborted && !this.dead) {
        const tile = queue.shift()!,
          id = `${tile.z}/${tile.x}/${tile.y}`
        if (this.cache.has(id)) continue
        try {
          const buffer = await this.fetchTile(
            `https://tiles.openfreemap.org/planet/latest/${id}.pbf`,
            signal
          )
          const data = await this.parse(buffer, tile)
          if (signal.aborted || this.dead || generation !== this.generation) continue
          const entry = await this.build(data, signal)
          if (signal.aborted || this.dead || generation !== this.generation) {
            this.release(entry)
            continue
          }
          this.cache.set(id, entry)
          this.root.add(entry.group)
          this.status(true)
          this.trim()
        } catch {
          if (!signal.aborted) failed = true
        }
      }
    }
    await Promise.all([load(), load(), load()])
    if (generation === this.generation && !this.dead) {
      // 保留失敗視野，避免狀態更新觸發無限下載；移動視野或按重試才重新請求。
      this.status(false, failed)
    }
  }
  private async build(data: BuildingTileData, signal: AbortSignal): Promise<Entry> {
    const group = new Group(),
      roofs: BufferGeometry[] = [],
      sides: BufferGeometry[] = [],
      greens: BufferGeometry[] = []
    let count = 0
    const bounds = new Box3()
    const heights: Box3[] = []
    try {
      for (const building of data.buildings) {
        if (signal.aborted) break
        let valid = false
        const footprint = new Box3()
        for (const polygon of building.polygons) {
          if (!polygon[0] || polygon[0].length < 4) continue
          const shape = this.shape(polygon)
          const height = buildingMapHeight({
            id: building.id,
            height: building.height,
            heightSource: '圖資',
            ring: polygon[0]
          })
          const base = (height * building.minHeight) / building.height + 0.00002
          const geometry = new ExtrudeGeometry(shape, {
            depth: (height * (building.height - building.minHeight)) / building.height,
            bevelEnabled: false,
            steps: 1,
            curveSegments: 1
          })
          geometry.rotateX(-Math.PI / 2)
          geometry.translate(0, base, 0)
          geometry.computeBoundingBox()
          bounds.union(geometry.boundingBox!)
          footprint.union(geometry.boundingBox!)
          for (const item of geometry.groups) {
            const part = new BufferGeometry()
            for (const [name, attribute] of Object.entries(geometry.attributes)) {
              const buffer = attribute as BufferAttribute
              part.setAttribute(
                name,
                new BufferAttribute(
                  buffer.array.slice(
                    item.start * buffer.itemSize,
                    (item.start + item.count) * buffer.itemSize
                  ),
                  buffer.itemSize
                )
              )
            }
            ;(item.materialIndex === 0 ? roofs : sides).push(part)
          }
          geometry.dispose()
          valid = true
        }
        if (valid) {
          count++
          heights.push(footprint)
        }
        if (count % 24 === 0) await new Promise((resolve) => setTimeout(resolve, 0))
      }
      for (const polygon of data.greens) {
        if (!polygon[0]?.length) continue
        const geometry = new ShapeGeometry(this.shape(polygon))
        geometry.rotateX(-Math.PI / 2)
        geometry.translate(0, 0.000014, 0)
        greens.push(geometry)
      }
      const waters: BufferGeometry[] = []
      for (const polygon of data.water || []) {
        if (!polygon[0]?.length) continue
        const geometry = new ShapeGeometry(this.shape(polygon))
        geometry.rotateX(-Math.PI / 2)
        geometry.translate(0, 0.000013, 0)
        waters.push(geometry)
      }
      if (waters.length) {
        group.add(new Mesh(mergeGeometries(waters)!, this.water))
        waters.forEach((geometry) => geometry.dispose())
      }
      for (const [parts, material] of [
        [roofs, this.roof],
        [sides, this.side],
        [greens, this.green]
      ] as [BufferGeometry[], Material][]) {
        if (parts.length) group.add(new Mesh(mergeGeometries(parts)!, material))
      }
      const positions: number[] = []
      for (const road of data.roads)
        for (const line of road.lines)
          for (let i = 1; i < line.length; i++) {
            const a = projectTaiwanCoordinate(...line[i - 1]!),
              b = projectTaiwanCoordinate(...line[i]!),
              length = Math.hypot(b[0] - a[0], b[1] - a[1])
            if (!length) continue
            const width = ['motorway', 'trunk', 'primary'].includes(road.kind)
              ? 0.00045
              : ['path', 'service', 'track'].includes(road.kind)
                ? 0.00008
                : 0.0002
            const dx = ((-(b[1] - a[1]) / length) * width) / 2,
              dz = (((b[0] - a[0]) / length) * width) / 2
            for (const p of [
              [a[0] + dx, a[1] + dz],
              [a[0] - dx, a[1] - dz],
              [b[0] + dx, b[1] + dz],
              [b[0] + dx, b[1] + dz],
              [a[0] - dx, a[1] - dz],
              [b[0] - dx, b[1] - dz]
            ])
              positions.push(p[0]!, 0.000015, p[1]!)
          }
      if (positions.length) {
        const roads = new BufferGeometry()
        roads.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
        group.add(new Mesh(roads, this.road))
      }
      return { group, count, places: data.places, bounds, heights, lastUsed: Date.now() }
    } catch (error) {
      this.release({ group, count, places: [], bounds, heights, lastUsed: 0 })
      throw error
    } finally {
      ;[...roofs, ...sides, ...greens].forEach((geometry) => geometry.dispose())
    }
  }
  private shape(polygon: [number, number][][]) {
    const ring = (points: [number, number][]) =>
      points.map(([lon, lat]) => {
        const [x, z] = projectTaiwanCoordinate(lon, lat)
        return new Vector2(x, -z)
      })
    const shape = new Shape(ring(polygon[0]!))
    shape.holes = polygon.slice(1).map((hole) => new Path(ring(hole)))
    return shape
  }
  private release(entry: Entry) {
    entry.group.traverse((item) => {
      if (item instanceof Mesh) item.geometry.dispose()
    })
    entry.group.removeFromParent()
  }
  private trim() {
    for (const [id, entry] of [...this.cache].sort((a, b) => a[1].lastUsed - b[1].lastUsed)) {
      if (this.cache.size <= 24) break
      if (!this.active.has(id)) {
        this.release(entry)
        this.cache.delete(id)
      }
    }
  }
  maximumHeight(x: number, z: number, radius: number) {
    let height = 0
    for (const id of this.active) {
      const entry = this.cache.get(id)
      if (
        entry &&
        entry.bounds.min.x <= x + radius &&
        entry.bounds.max.x >= x - radius &&
        entry.bounds.min.z <= z + radius &&
        entry.bounds.max.z >= z - radius
      )
        for (const box of entry.heights) {
          if (
            box.min.x <= x + radius &&
            box.max.x >= x - radius &&
            box.min.z <= z + radius &&
            box.max.z >= z - radius
          )
            height = Math.max(height, box.max.y)
        }
    }
    return height
  }
  retry() {
    this.viewKey = ''
  }
  suspend() {
    this.controller?.abort()
    this.generation++
    this.viewKey = ''
    this.status(false)
  }
  dispose() {
    this.dead = true
    this.controller?.abort()
    this.worker?.terminate()
    this.tasks.forEach((task) => task.reject(new Error('地圖已關閉')))
    this.tasks.clear()
    this.cache.forEach((entry) => this.release(entry))
    this.cache.clear()
    ;[this.roof, this.side, this.road, this.green, this.water].forEach((material) =>
      material.dispose()
    )
  }
}
