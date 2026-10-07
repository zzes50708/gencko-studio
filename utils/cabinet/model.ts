import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DataTexture,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  RectAreaLight,
  ShaderChunk,
  Vector2,
  Quaternion,
  RepeatWrapping,
  Sprite,
  ShadowMaterial,
  SpriteMaterial,
  SRGBColorSpace,
  TorusGeometry,
  Vector3
} from 'three'
import type { Material, Texture } from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { FINISHES } from './config'
import type { CabinetLayout } from './config'
import {
  createAcrylicMaterial,
  createBoardFaceMaterial,
  createPpMaterial,
  createWhiteLaminateMaterial
} from './materials'
import type { CabinetWoodTextures } from './materials'

export interface CabinetModel {
  root: Group
  measurements: Group
  target: [number, number, number]
  updateLed: (
    enabled: boolean,
    rows: boolean[],
    color: keyof typeof LED_COLORS,
    installedLayers: number
  ) => void
  toggleDrawer: (id: number) => void
  toggleStorage: (id: number) => void
  animateDrawers: (delta: number) => boolean
  dispose: () => void
}
type Part = { position: [number, number, number]; size: [number, number, number]; parent?: Group }
const LED_COLORS = { warm: '#ffcb83', neutral: '#fff0d6', cool: '#d7eaff' }

// 依外框與底框建構中空、略帶圓角的塑膠盒，底框資料缺省時只使用直壁示意。
function tubGeometry(
  width: number,
  height: number,
  length: number,
  bottomWidth: number,
  bottomLength: number,
  wall = 0.16
) {
  const positions: number[] = [],
    indices: number[] = []
  const segments = 6,
    perimeter = segments * 4
  const ring = (w: number, d: number, y: number) => {
    const radius = Math.min(0.65, w / 12, d / 12)
    for (let corner = 0; corner < 4; corner++) {
      const cx = (corner === 0 || corner === 3 ? 1 : -1) * (w / 2 - radius)
      const cz = (corner < 2 ? 1 : -1) * (d / 2 - radius)
      for (let segment = 0; segment < segments; segment++) {
        const angle = (corner * Math.PI) / 2 + ((segment / (segments - 1)) * Math.PI) / 2
        positions.push(cx + Math.cos(angle) * radius, y, cz + Math.sin(angle) * radius)
      }
    }
  }
  ring(bottomWidth, bottomLength, 0)
  ring(width, length, height)
  ring(width - wall * 2, length - wall * 2, height)
  ring(bottomWidth - wall * 2, bottomLength - wall * 2, wall)
  for (let level = 0; level < 3; level++)
    for (let i = 0; i < perimeter; i++) {
      const next = (i + 1) % perimeter,
        a = level * perimeter + i,
        b = level * perimeter + next,
        c = (level + 1) * perimeter + next,
        d = (level + 1) * perimeter + i
      indices.push(a, b, d, b, c, d)
    }
  const center = positions.length / 3
  positions.push(0, wall, 0)
  for (let i = 0; i < perimeter; i++)
    indices.push(center, perimeter * 3 + i, perimeter * 3 + ((i + 1) % perimeter))
  // 補上外側底面，盒底與內壁之間保留真實厚度。
  const outerCenter = positions.length / 3
  positions.push(0, 0, 0)
  for (let i = 0; i < perimeter; i++) indices.push(outerCenter, (i + 1) % perimeter, i)
  // 外壁朝外、內壁朝內；避免反向面在透光時形成交錯三角形。
  for (let i = 0; i < indices.length; i += 3) {
    const next = indices[i + 1]!
    indices[i + 1] = indices[i + 2]!
    indices[i + 2] = next
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  // 底面與側面不能共用平滑法線，否則平底會產生三角形凹凸陰影。
  const flat = geometry.toNonIndexed()
  geometry.dispose()
  flat.computeVertexNormals()
  return flat
}

export function createCabinetModel(
  layout: CabinetLayout,
  woodTextures: CabinetWoodTextures | null = null
): CabinetModel {
  const cfg = layout.configuration,
    box = cfg.boxDimensions,
    b = cfg.boardThickness
  const { width, height, depth } = cfg.dimensions
  const displayScale = 4.8 / Math.max(width + 12, height + 5, depth + 6)
  const ledRows: {
    row: number
    material: MeshPhysicalMaterial
    glow: MeshBasicMaterial
    indicator: MeshStandardMaterial
    lights: RectAreaLight[]
    parts: Group
  }[] = []
  const drawers: { group: Group; open: boolean }[] = []
  const storageParts: { group: Group; open: boolean; rotation: number }[] = []
  const drawerGeometryCache = new Map<string, BoxGeometry>()
  const root = new Group(),
    measurements = new Group()
  const geometries: BufferGeometry[] = [],
    materials: Material[] = [],
    textures: Texture[] = []
  const batches: Record<string, Part[]> = {}
  const left = -width / 2,
    right = width / 2,
    front = depth / 2
  const add = (kind: string, position: Part['position'], size: Part['size'], parent?: Group) =>
    (batches[kind] ||= []).push({ position, size, parent })
  const ownGeometry = <T extends BufferGeometry>(geometry: T): T => {
    geometries.push(geometry)
    return geometry
  }
  RectAreaLightUniformsLib.init()
  // 面光源依實際層高限制貢獻，避免無陰影面光穿透下一層。
  const ledBounds = Array.from(
    { length: cfg.rows },
    (_, row) =>
      new Vector2(
        (layout.rackBase + row * layout.rowPitch - 0.05) * displayScale,
        (layout.rackBase + (row + 1) * layout.rowPitch - b + 0.05) * displayScale
      )
  )
  const ownMaterial = <T extends Material>(material: T): T => {
    if (material instanceof MeshStandardMaterial) {
      const previousCompile = material.onBeforeCompile
      const previousKey = material.customProgramCacheKey()
      material.onBeforeCompile = (shader, renderer) => {
        previousCompile.call(material, shader, renderer)
        shader.uniforms.cabinetLedBounds = { value: ledBounds }
        shader.uniforms.cabinetInterior = {
          value: [
            (-width / 2 + b - 0.03) * displayScale,
            (width / 2 - b + 0.03) * displayScale,
            (-front + b - 0.03) * displayScale,
            (front + 0.3) * displayScale
          ]
        }
        shader.vertexShader =
          'varying float cabinetWorldY;\nvarying vec2 cabinetWorldXZ;\n' + shader.vertexShader
        shader.vertexShader = shader.vertexShader.replace(
          '#include <project_vertex>',
          '#include <project_vertex>\nvec4 cabinetPosition = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\ncabinetPosition = instanceMatrix * cabinetPosition;\n#endif\nvec3 cabinetWorld = (modelMatrix * cabinetPosition).xyz;\ncabinetWorldY = cabinetWorld.y;\ncabinetWorldXZ = cabinetWorld.xz;'
        )
        shader.fragmentShader =
          `varying float cabinetWorldY;\nvarying vec2 cabinetWorldXZ;\nuniform vec4 cabinetInterior;\nuniform vec2 cabinetLedBounds[${cfg.rows}];\n` +
          shader.fragmentShader
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <lights_fragment_begin>',
          ShaderChunk.lights_fragment_begin.replace(
            'rectAreaLight = rectAreaLights[ i ];',
            'rectAreaLight = rectAreaLights[ i ];\nif (cabinetWorldY < cabinetLedBounds[i].x || cabinetWorldY > cabinetLedBounds[i].y || cabinetWorldXZ.x < cabinetInterior.x || cabinetWorldXZ.x > cabinetInterior.y || cabinetWorldXZ.y < cabinetInterior.z || cabinetWorldXZ.y > cabinetInterior.w) rectAreaLight.color = vec3(0.0);'
          )
        )
      }
      material.customProgramCacheKey = () => `cabinet-row-led-${cfg.rows}:${previousKey}`
    }
    materials.push(material)
    return material
  }

  // 程序生成貼皮與地板材質，不取用廠商照片；色彩、紋理仍以實體色卡確認。
  const texture = (wood: boolean, roughness = false) => {
    const w = 256,
      h = wood ? 512 : 256,
      data = new Uint8Array(w * h * 4)
    let seed = 619
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        seed = (seed * 1664525 + 1013904223) >>> 0
        const noise = seed / 4294967296 - 0.5
        const flow = x + Math.sin(y * 0.015) * 2 + Math.sin(y * 0.043) * 0.6
        const grain = Math.sin(flow * 0.39) * Math.sin(flow * 0.043 + y * 0.006)
        const value = Math.max(
          0,
          Math.min(
            255,
            Math.round(
              wood
                ? (roughness ? 162 : 218) + grain * (roughness ? 28 : 20) + noise * 13
                : (roughness ? 190 : 203) + noise * 16 + Math.sin(x * 0.018 + y * 0.012) * 8
            )
          )
        )
        const i = (y * w + x) * 4
        data[i] = value
        data[i + 1] = value
        data[i + 2] = value
        data[i + 3] = 255
      }
    const result = new DataTexture(data, w, h)
    result.wrapS = result.wrapT = RepeatWrapping
    if (!roughness) result.colorSpace = SRGBColorSpace
    result.needsUpdate = true
    textures.push(result)
    return result
  }
  // 已有正式貼圖時直接使用；純色貼皮不需要產生備援木紋。
  const needsWoodFallback = !woodTextures && !['white', 'charcoal'].includes(cfg.finishId)
  const woodMap = woodTextures?.color ?? (needsWoodFallback ? texture(true) : null),
    woodRoughness = woodTextures?.roughness ?? (needsWoodFallback ? texture(true, true) : null)
  const finish = FINISHES.find((item) => item.id === cfg.finishId) || FINISHES[0]!
  const palette: Record<string, MeshStandardMaterial | MeshPhysicalMaterial> = {
    wood: ownMaterial(
      new MeshPhysicalMaterial({
        color: finish.color,
        map: woodMap,
        roughnessMap: woodRoughness,
        bumpMap: woodRoughness,
        bumpScale: 0.006,
        roughness: 0.76,
        clearcoat: 0.24,
        clearcoatRoughness: 0.54
      })
    ),
    edge: ownMaterial(
      cfg.boxVariant.startsWith('acrylic-')
        ? createAcrylicMaterial(cfg.boxColor === 'smoke', displayScale)
        : new MeshPhysicalMaterial({
            color: cfg.boxColor === 'smoke' ? '#565f5e' : '#d8e4df',
            roughness: 0.25,
            clearcoat: 0.8,
            transparent: true,
            opacity: 0.72
          })
    ),
    plastic: ownMaterial(
      cfg.boxVariant.startsWith('acrylic-')
        ? createAcrylicMaterial(cfg.boxColor === 'smoke', displayScale)
        : createPpMaterial(cfg.boxColor === 'smoke', displayScale)
    ),
    lid: ownMaterial(
      cfg.boxVariant.startsWith('acrylic-')
        ? createAcrylicMaterial(cfg.boxColor === 'smoke', displayScale)
        : new MeshPhysicalMaterial({
            color: '#e8f1ef',
            roughness: 0.12,
            clearcoat: 1,
            clearcoatRoughness: 0.1,
            transmission: 0.76,
            thickness: 0.12 * displayScale,
            ior: 1.49,
            opacity: 1,
            depthWrite: true
          })
    ),
    heat: ownMaterial(new MeshStandardMaterial({ color: '#33332e', roughness: 0.88 })),
    frame: ownMaterial(
      new MeshPhysicalMaterial({ color: '#171d1e', roughness: 0.37, clearcoat: 0.35 })
    ),
    metal: ownMaterial(
      new MeshStandardMaterial({ color: '#9caaa8', roughness: 0.24, metalness: 0.92 })
    ),
    rubber: ownMaterial(new MeshStandardMaterial({ color: '#212523', roughness: 0.98 })),
    led: ownMaterial(
      new MeshStandardMaterial({
        color: LED_COLORS[cfg.ledColor],
        emissive: LED_COLORS[cfg.ledColor],
        emissiveIntensity: 5.5,
        roughness: 0.3
      })
    ),
    switchGlow: ownMaterial(
      new MeshStandardMaterial({
        color: '#7deac6',
        emissive: '#41dfb0',
        emissiveIntensity: 3,
        metalness: 0.1,
        roughness: 0.25
      })
    ),
    marking: ownMaterial(new MeshStandardMaterial({ color: '#e2e9e5', roughness: 0.6 })),
    vent: ownMaterial(
      new MeshStandardMaterial({
        color: '#303a34',
        transparent: true,
        opacity: 0.45,
        roughness: 0.8
      })
    )
  }

  // 所有木板（包括背板、側板、層板、收納抽屜面板）厚度固定為 2 cm。
  const bodyHeight = height - cfg.wheelHeight
  for (const x of [left + b / 2, right - b / 2])
    add('wood', [x, cfg.wheelHeight + bodyHeight / 2, 0], [b, bodyHeight, depth])
  add(
    'wood',
    [0, cfg.wheelHeight + bodyHeight / 2, -front + b / 2],
    [layout.innerWidth, bodyHeight, b]
  )
  add('wood', [0, cfg.wheelHeight + b / 2, 0], [layout.innerWidth, b, depth - b * 2])
  add('wood', [0, height - b / 2, 0], [layout.innerWidth, b, depth])
  add(
    'wood',
    [0, layout.controlBottom + cfg.clearances.controlHeight / 2, front - b / 2],
    [layout.innerWidth, cfg.clearances.controlHeight, b]
  )
  if (cfg.storageHeight > 0) {
    add('wood', [0, layout.rackBase - b / 2, 0], [layout.innerWidth, b, depth - b])
    const storageY = cfg.wheelHeight + b + cfg.storageHeight / 2
    const storageH = cfg.storageHeight - 0.35
    const makeStorage = (name: string, rotation: number) => {
      const group = new Group()
      group.name = name
      group.userData.storagePart = storageParts.length
      storageParts.push({ group, open: false, rotation })
      root.add(group)
      return group
    }
    const handle = (group: Group, x: number, z: number, w: number) => {
      const mesh = new Mesh(ownGeometry(new BoxGeometry(w, 0.8, 1.2)), palette.metal)
      mesh.position.set(x, storageY, z)
      mesh.userData.storagePart = group.userData.storagePart
      group.add(mesh)
    }
    if (cfg.storageStyle === 'drawer') {
      const group = makeStorage('storage-drawer', 0)
      const w = layout.innerWidth - 0.4
      add('wood', [0, storageY, front - b / 2], [w, storageH, b], group)
      // 抽出後仍有完整木製抽屜內盒，不只是漂浮的面板。
      const bottom = cfg.wheelHeight + b + 0.2
      const innerDepth = depth - b * 2 - 0.6
      add('wood', [0, bottom + b / 2, -0.3], [w - b * 2, b, innerDepth], group)
      for (const sign of [-1, 1])
        add('wood', [(sign * (w - b)) / 2, storageY, -0.3], [b, storageH, innerDepth], group)
      add('wood', [0, storageY, -front + b + 0.3], [w - b * 2, storageH, b], group)
      handle(group, 0, front + 0.55, Math.min(16, w * 0.4))
    } else if (cfg.storageStyle === 'doors') {
      const doorWidth = (layout.innerWidth - 0.4) / 2
      for (const sign of [-1, 1]) {
        const group = makeStorage(
          sign < 0 ? 'storage-door-left' : 'storage-door-right',
          sign * Math.PI * 0.55
        )
        group.position.set(sign * (layout.innerWidth / 2 - 0.1), 0, front - b / 2)
        add('wood', [(-sign * doorWidth) / 2, storageY, 0], [doorWidth - 0.1, storageH, b], group)
        handle(group, -sign * (doorWidth - 3), b / 2 + 0.55, 1.2)
      }
    }
  }
  const tub = ownGeometry(
    tubGeometry(
      box.width,
      box.height,
      box.length,
      box.bottomWidth || box.width,
      box.bottomLength || box.length,
      cfg.boxVariant.startsWith('acrylic-') ? 0.3 : 0.16
    )
  )
  const heatingCanvas = document.createElement('canvas')
  heatingCanvas.width = heatingCanvas.height = 256
  const hc = heatingCanvas.getContext('2d')!
  hc.fillStyle = cfg.heatingMat === 'korea' ? '#dfded4' : '#c8c5b0'
  hc.fillRect(0, 0, 256, 256)
  const pitch = cfg.heatingMat === 'korea' ? 12 : 24
  for (let x = 4; x < 256; x += pitch) {
    hc.fillStyle = '#292a27'
    hc.fillRect(x, 16, pitch - 4, 224)
    hc.fillStyle = '#858780'
    hc.fillRect(x, 16, 1, 224)
  }
  hc.fillStyle = '#b9b7ab'
  hc.fillRect(0, 6, 256, 5)
  hc.fillRect(0, 245, 256, 5)
  const heatingMap = new CanvasTexture(heatingCanvas)
  heatingMap.colorSpace = SRGBColorSpace
  heatingMap.wrapS = RepeatWrapping
  heatingMap.repeat.set((layout.innerWidth - 0.5) / 10, 1)
  textures.push(heatingMap)
  const heatingMaterial = ownMaterial(
    new MeshPhysicalMaterial({
      map: heatingMap,
      roughness: 0.48,
      clearcoat: 0.25,
      metalness: 0.12
    })
  )
  const matrix = new Matrix4(),
    position = new Vector3(),
    scale = new Vector3(1, 1, 1),
    quaternion = new Quaternion()
  // 局部光暈共用一張貼圖，不增加全畫面後製；深度測試保留板材遮光。
  const glowCanvas = document.createElement('canvas')
  glowCanvas.width = 128
  glowCanvas.height = 32
  const gc = glowCanvas.getContext('2d')!
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 128; x++) {
      const falloff = Math.exp(-Math.pow((y - 16) / 6, 2))
      const edge = Math.min(1, x / 8, (127 - x) / 8)
      gc.fillStyle = `rgba(255,255,255,${falloff * edge})`
      gc.fillRect(x, y, 1, 1)
    }
  }
  const glowMap = new CanvasTexture(glowCanvas)
  textures.push(glowMap)
  for (let row = 0; row < cfg.rows; row++) {
    const base = layout.rackBase + row * layout.rowPitch
    add('wood', [0, base + layout.rowPitch - b / 2, 0], [layout.innerWidth, b, depth - b])
    const mat = new Mesh(
      ownGeometry(new PlaneGeometry(layout.innerWidth - 0.5, 10)),
      heatingMaterial
    )
    mat.name = `heating-mat-${row}`
    mat.rotation.x = -Math.PI / 2
    mat.position.set(0, base + 0.08, -front + b + 5)
    root.add(mat)
    for (let col = 0; col < cfg.columns; col++) {
      const drawer = new Group()
      const drawerId = drawers.length
      drawers.push({ group: drawer, open: false })
      root.add(drawer)
      const drawerParts = new Map<
        string,
        { geometry: BoxGeometry; material: Material; positions: [number, number, number][] }
      >()
      const addDrawerPart = (
        kind: keyof typeof palette,
        at: [number, number, number],
        size: [number, number, number]
      ) => {
        const geometryKey = size.join(':')
        if (!drawerGeometryCache.has(geometryKey))
          drawerGeometryCache.set(geometryKey, ownGeometry(new BoxGeometry(...size)))
        const key = `${kind}:${geometryKey}`
        if (!drawerParts.has(key))
          drawerParts.set(key, {
            geometry: drawerGeometryCache.get(geometryKey)!,
            material: palette[kind],
            positions: []
          })
        drawerParts.get(key)!.positions.push(at)
      }
      const x =
        -layout.innerWidth / 2 +
        cfg.clearances.horizontal +
        box.width / 2 +
        col * (box.width + cfg.clearances.horizontal)
      const z = front - box.length / 2
      // 透明盒各自排序，避免 InstancedMesh 無法依相機排序而互相穿透。
      const tray = new Mesh(tub, palette.plastic)
      tray.position.set(x, base + 0.16, z)
      tray.receiveShadow = true
      drawer.add(tray)
      addDrawerPart(
        'edge',
        [x, base + box.height - 0.18, front - 0.2],
        [box.width - 0.5, 0.34, 0.45]
      )
      addDrawerPart(
        'edge',
        [x, base + box.height * 0.65, front + 0.18],
        [box.width * 0.28, 0.65, 0.42]
      )
      // 以薄片表現照片中的通風狹縫與盒蓋分界，維持批次繪製。
      const slots = Math.floor((box.width - 3) / 0.55)
      for (let slot = 0; slot < slots; slot++) {
        addDrawerPart(
          'vent',
          [x - (slots - 1) * 0.275 + slot * 0.55, base + box.height - 1.25, front + 0.02],
          [0.11, 1.2, 0.025]
        )
      }
      if (cfg.boxVariant.startsWith('tub-')) {
        addDrawerPart(
          'edge',
          [x, base + box.height + 0.08, front - box.length * 0.38],
          [box.width - 0.6, 0.14, 0.16]
        )
        for (const side of [-1, 1])
          addDrawerPart(
            'edge',
            [x + side * (box.width / 2 - 0.25), base + box.height, front - box.length / 2],
            [0.3, 0.3, box.length - 0.5]
          )
      } else if (cfg.boxVariant.startsWith('acrylic-')) {
        // 壓克力盒使用平整上蓋，外觀依實物照片後續再細化孔位與五金。
        addDrawerPart(
          'lid',
          [x, base + box.height + 0.1, front - box.length / 2],
          [box.width - 0.3, 0.3, box.length - 0.3]
        )
        // 四邊獨立厚邊框，避免用整片透明平面代替實體盒壁。
        for (const y of [base + 0.15, base + box.height - 0.15]) {
          for (const sign of [-1, 1]) {
            addDrawerPart(
              'edge',
              [x + sign * (box.width / 2 - 0.15), y, front - box.length / 2],
              [0.3, 0.3, box.length]
            )
            addDrawerPart(
              'edge',
              [x, y, front - box.length / 2 + sign * (box.length / 2 - 0.15)],
              [box.width - 0.6, 0.3, 0.3]
            )
          }
        }
      }
      for (const parts of drawerParts.values()) {
        const mesh = new InstancedMesh(parts.geometry, parts.material, parts.positions.length)
        parts.positions.forEach((at, index) =>
          mesh.setMatrixAt(index, new Matrix4().makeTranslation(...at))
        )
        mesh.computeBoundingSphere()
        drawer.add(mesh)
      }
      drawer.traverse((object) => {
        object.userData.drawerId = drawerId
        object.layers.enable(row + 1)
      })
    }
    {
      // 預先建立每層燈條；增減照明層數只切換顯示與光源，不重建整座櫃體。
      const ledParts = new Group()
      root.add(ledParts)
      const y = base + 0.2
      const rear = -front + b + 0.55
      const housing = new Mesh(
        ownGeometry(new BoxGeometry(layout.innerWidth, 0.35, 0.65)),
        palette.metal
      )
      housing.position.set(0, y, rear)
      ledParts.add(housing)
      const ledMaterial = ownMaterial(
        new MeshPhysicalMaterial({ color: '#f5f4ee', roughness: 0.45 })
      )
      const strip = new Mesh(ownGeometry(new BoxGeometry(layout.innerWidth, 0.2, 0.6)), ledMaterial)
      strip.position.set(0, y + 0.22, rear + 0.08)
      ledParts.add(strip)
      const glow = ownMaterial(
        new MeshBasicMaterial({
          map: glowMap,
          transparent: true,
          blending: AdditiveBlending,
          depthTest: true,
          depthWrite: false,
          toneMapped: false
        })
      )
      const halo = new Mesh(ownGeometry(new PlaneGeometry(layout.innerWidth, 1.2)), glow)
      halo.name = `led-glow-${row}`
      halo.position.set(0, base + 0.65, rear + 0.5)
      Object.assign(halo, { pointerEvents: 'none' })
      ledParts.add(halo)
      const indicator = ownMaterial(new MeshStandardMaterial({ color: '#555b56', roughness: 0.4 }))
      const switchMesh = new Mesh(
        ownGeometry(new CylinderGeometry(0.85, 0.85, 0.45, 24)),
        indicator
      )
      switchMesh.rotation.x = Math.PI / 2
      switchMesh.position.set(width / 2 - b / 2, base + box.height * 0.5, front + 0.25)
      switchMesh.userData.ledRow = cfg.rows - 1 - row
      switchMesh.name = `led-switch-${row}`
      ledParts.add(switchMesh)
      // 透明度不參與點擊判定：使用較大的隱藏命中區方便操作。
      const hit = new Mesh(
        ownGeometry(new BoxGeometry(4, 4, 1)),
        ownMaterial(new MeshStandardMaterial({ visible: false }))
      )
      hit.position.copy(switchMesh.position)
      hit.userData.ledRow = cfg.rows - 1 - row
      ledParts.add(hit)
      // 整層面光取代中央聚光燈，僅用共用 LTC 貼圖，不建立每層陰影貼圖。
      const light = new RectAreaLight(
        LED_COLORS[cfg.ledColor],
        42,
        layout.innerWidth * displayScale,
        0.8 * displayScale
      )
      light.name = `led-area-${row}`
      light.position.set(0, y + 0.18, rear + 0.15)
      // RectAreaLight 沿局部 -Z 發光；正轉 90 度才會朝上照亮同層盒體。
      light.rotation.x = Math.PI / 2
      root.add(light)
      const rowLights = [light]
      ledRows.push({
        row: cfg.rows - 1 - row,
        material: ledMaterial,
        glow,
        indicator,
        lights: rowLights,
        parts: ledParts
      })
    }
  }

  const displayTexture = (thermometer: boolean) => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 128
    const context = canvas.getContext('2d')!
    context.fillStyle = thermometer ? '#8e9d8a' : '#10231f'
    context.fillRect(0, 0, 256, 128)
    context.fillStyle = thermometer ? '#1d2822' : '#93f4c2'
    context.font = 'bold 76px monospace'
    context.textAlign = 'center'
    context.fillText('32.0', 117, 88)
    context.font = '21px sans-serif'
    context.fillText('°C', 230, 55)
    const image = new CanvasTexture(canvas)
    image.colorSpace = SRGBColorSpace
    textures.push(image)
    return image
  }
  const thermostatDisplay = ownMaterial(
      new MeshStandardMaterial({
        map: displayTexture(false),
        roughness: 0.3,
        emissive: '#71cca2',
        emissiveIntensity: 0.35
      })
    ),
    thermometerDisplay = ownMaterial(
      new MeshStandardMaterial({ map: displayTexture(true), roughness: 0.5 })
    )
  for (const item of layout.hardware) {
    const x = item.x,
      y = layout.controlBottom + cfg.clearances.controlHeight - item.y,
      z = front
    if (
      item.type === 'standardThermostat' ||
      item.type === 'extraThermostat' ||
      item.type === 'thermometer'
    ) {
      add('frame', [x, y, z + 0.12], [item.width, item.height, 0.34])
      const screen = new Mesh(
        ownGeometry(new PlaneGeometry(item.width * 0.76, item.height * 0.67)),
        item.type === 'thermometer' ? thermometerDisplay : thermostatDisplay
      )
      screen.position.set(x - item.width * 0.06, y, z + 0.31)
      root.add(screen)
      if (item.type !== 'thermometer')
        for (const by of [-0.65, 0.65])
          add('rubber', [x + item.width * 0.4, y + by, z + 0.31], [0.58, 0.46, 0.12])
    } else if (item.type === 'switch') {
      add('frame', [x, y, z + 0.15], [item.width, item.height, 0.4])
      add('rubber', [x, y + 0.14, z + 0.42], [item.width * 0.72, item.height * 0.74, 0.36])
      add('marking', [x, y + 0.73, z + 0.62], [0.12, 0.39, 0.03])
    } else {
      const rim = new Mesh(ownGeometry(new CylinderGeometry(1.12, 1.12, 0.35, 24)), palette.metal)
      rim.rotation.x = Math.PI / 2
      rim.position.set(x, y, z + 0.14)
      root.add(rim)
      const glowingRing = new Mesh(
        ownGeometry(new TorusGeometry(0.79, 0.095, 8, 32)),
        palette.switchGlow
      )
      glowingRing.position.set(x, y, z + 0.36)
      root.add(glowingRing)
      const center = new Mesh(
        ownGeometry(new CylinderGeometry(0.65, 0.65, 0.19, 24)),
        palette.metal
      )
      center.rotation.x = Math.PI / 2
      center.position.set(x, y, z + 0.31)
      root.add(center)
      const light = new PointLight('#50e8b5', 0.22, 10 * displayScale, 1.3)
      light.position.set(x, y, z + 1.1)
      root.add(light)
    }
  }
  if (cfg.wheelHeight)
    for (const x of [left + 3.3, right - 3.3])
      for (const z of [-front + 3.3, front - 3.3]) {
        add('metal', [x, 4.6, z], [1.2, 2.5, 1.2])
        const wheel = new Mesh(
          ownGeometry(new CylinderGeometry(2.25, 2.25, 1.6, 24)),
          palette.rubber
        )
        wheel.rotation.z = Math.PI / 2
        wheel.position.set(x, 2.25, z)
        wheel.castShadow = true
        root.add(wheel)
        const hub = new Mesh(ownGeometry(new CylinderGeometry(0.7, 0.7, 1.7, 16)), palette.metal)
        hub.rotation.z = Math.PI / 2
        hub.position.copy(wheel.position)
        root.add(hub)
      }
  const cube = ownGeometry(new BoxGeometry(1, 1, 1))
  const boardGeometries = new Map<string, BufferGeometry>()
  const boardMaterials = new Map<string, MeshPhysicalMaterial>()
  const flatNormal = new DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1)
  flatNormal.needsUpdate = true
  textures.push(flatNormal)
  const woodMaps: CabinetWoodTextures = woodTextures
    ? woodTextures
    : { color: woodMap!, normal: flatNormal, roughness: woodRoughness! }
  const boardTint = woodTextures ? '#ffffff' : finish.color
  const faceMaterial = (w: number, h: number) => {
    const key = `${w}:${h}`
    if (!boardMaterials.has(key)) {
      boardMaterials.set(
        key,
        ownMaterial(
          cfg.finishId === 'white' || cfg.finishId === 'charcoal'
            ? createWhiteLaminateMaterial(cfg.finishId === 'charcoal')
            : createBoardFaceMaterial(
                woodMaps,
                w,
                h,
                boardTint,
                (map) => {
                  textures.push(map)
                  return map
                },
                cfg.finishId === 'stone'
              )
        )
      )
    }
    return boardMaterials.get(key)!
  }
  for (const [kind, parts] of Object.entries(batches)) {
    if (kind === 'wood') {
      for (const part of parts) {
        const [w, h, d] = part.size
        const key = part.size.join(':')
        if (!boardGeometries.has(key)) {
          // 公分為建模單位：0.15 cm = 1.5 mm；不可縮放單位倒角盒。
          boardGeometries.set(
            key,
            ownGeometry(new RoundedBoxGeometry(w, h, d, 2, Math.min(0.15, Math.min(w, h, d) / 4)))
          )
        }
        // RoundedBox 的六面依序為左右、上下、前後，各面使用實際長寬。
        const mesh = new Mesh(boardGeometries.get(key)!, [
          faceMaterial(d, h),
          faceMaterial(d, h),
          faceMaterial(w, d),
          faceMaterial(w, d),
          faceMaterial(w, h),
          faceMaterial(w, h)
        ])
        mesh.name = 'cabinet-board'
        mesh.position.fromArray(part.position)
        mesh.castShadow = mesh.receiveShadow = true
        for (let row = 0; row < cfg.rows; row++) {
          const base = layout.rackBase + row * layout.rowPitch
          if (
            part.position[1] + h / 2 >= base &&
            part.position[1] - h / 2 <= base + layout.rowPitch
          )
            mesh.layers.enable(row + 1)
        }
        if (part.parent) mesh.userData.storagePart = part.parent.userData.storagePart
        ;(part.parent || root).add(mesh)
      }
      continue
    }
    const mesh = new InstancedMesh(cube, palette[kind], parts.length)
    parts.forEach((part, index) =>
      mesh.setMatrixAt(
        index,
        matrix.compose(position.fromArray(part.position), quaternion, scale.fromArray(part.size))
      )
    )
    mesh.castShadow = kind === 'wood' || kind === 'metal'
    mesh.receiveShadow = true
    root.add(mesh)
  }
  // 無縫棚拍背景只接收淡灰陰影，不繪製房間或裝飾物。
  const floor = new Mesh(
    ownGeometry(new PlaneGeometry(Math.max(width, depth) * 3, Math.max(width, depth) * 3)),
    ownMaterial(new ShadowMaterial({ color: '#777777', opacity: 0.16, depthWrite: false }))
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.13
  floor.receiveShadow = false
  floor.name = 'studio-shadow-catcher'
  root.add(floor)
  const contactCanvas = document.createElement('canvas')
  contactCanvas.width = contactCanvas.height = 128
  const contactContext = contactCanvas.getContext('2d')!
  const gradient = contactContext.createRadialGradient(64, 64, 12, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(65,65,65,0.24)')
  gradient.addColorStop(0.6, 'rgba(65,65,65,0.12)')
  gradient.addColorStop(1, 'rgba(65,65,65,0)')
  contactContext.fillStyle = gradient
  contactContext.fillRect(0, 0, 128, 128)
  const contactMap = new CanvasTexture(contactCanvas)
  textures.push(contactMap)
  const contact = new Mesh(
    ownGeometry(new PlaneGeometry(width + 18, depth + 18)),
    ownMaterial(
      new MeshBasicMaterial({
        map: contactMap,
        transparent: true,
        depthWrite: false,
        toneMapped: false
      })
    )
  )
  contact.rotation.x = -Math.PI / 2
  contact.position.y = -0.1
  Object.assign(contact, { pointerEvents: 'none' })
  root.add(contact)
  const lineMaterial = ownMaterial(
    new LineBasicMaterial({
      color: '#9c5c3b',
      transparent: true,
      opacity: 0.8,
      depthTest: true,
      depthWrite: false
    })
  )
  // 背面最左側一條貼合櫃體的黑色封閉線槽，不繪製外露電線。
  const channelHeight = height - cfg.wheelHeight
  const channel = new Mesh(
    ownGeometry(new RoundedBoxGeometry(2.5, channelHeight, 1.2, 2, 0.08)),
    ownMaterial(new MeshStandardMaterial({ color: '#161719', roughness: 0.62 }))
  )
  channel.name = 'cable-trunking'
  channel.position.set(left + 1.25, cfg.wheelHeight + channelHeight / 2, -front - 0.6)
  channel.castShadow = true
  root.add(channel)
  const dimensionLine = (
    a: [number, number, number],
    end: [number, number, number],
    axis: 'x' | 'y' | 'z'
  ) => {
    const points = [...a, ...end],
      tick = 1.1
    for (const p of [a, end]) {
      const p1 = [...p],
        p2 = [...p]
      const index = axis === 'y' ? 0 : 1
      p1[index] -= tick
      p2[index] += tick
      points.push(...p1, ...p2)
    }
    const line = new LineSegments(
      ownGeometry(
        new BufferGeometry().setAttribute('position', new Float32BufferAttribute(points, 3))
      ),
      lineMaterial
    )
    line.renderOrder = 50
    measurements.add(line)
  }
  const label = (text: string, at: [number, number, number]) => {
    const canvas = document.createElement('canvas')
    canvas.height = 112
    const ctx = canvas.getContext('2d')!
    const labelFont = '500 43px "Microsoft JhengHei", sans-serif'
    ctx.font = labelFont
    // 依文字實際寬度加少量內距，縮窄標籤但維持字體大小。
    canvas.width = Math.ceil(ctx.measureText(text).width) + 24
    ctx.fillStyle = '#f4f1eae8'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#613b26'
    ctx.font = labelFont
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, canvas.width / 2, 56)
    const map = new CanvasTexture(canvas)
    map.colorSpace = SRGBColorSpace
    textures.push(map)
    const sprite = new Sprite(
      ownMaterial(
        new SpriteMaterial({
          map,
          transparent: true,
          depthTest: true,
          depthWrite: false,
          toneMapped: false
        })
      )
    )
    sprite.position.fromArray(at)
    sprite.scale.set(((canvas.width / 512) * 1.4) / displayScale, 0.306 / displayScale, 1)
    sprite.renderOrder = 60
    measurements.add(sprite)
  }
  dimensionLine([left, -6, front + 10], [right, -6, front + 10], 'x')
  label('寬 ' + width + ' cm', [0, -9, front + 11])
  dimensionLine([right + 13, 0, front + 6], [right + 13, height, front + 6], 'y')
  label('高 ' + height + ' cm', [right + 17, height * 0.53, front + 7])
  dimensionLine([right + 10, 0, -front], [right + 10, 0, front], 'z')
  label('深 ' + depth + ' cm', [right + 14, 1, 0])
  root.add(measurements)
  // 尺寸線與標籤只供閱讀，不攔截背後的 LED 開關。
  measurements.traverse((object) => {
    Object.assign(object, { pointerEvents: 'none' })
  })
  root.scale.setScalar(displayScale)
  const updateLed = (
    enabled: boolean,
    rows: boolean[],
    color: keyof typeof LED_COLORS,
    installedLayers: number
  ) => {
    for (const item of ledRows) {
      item.parts.visible = item.row < installedLayers
      const on = item.parts.visible && enabled && rows[item.row] !== false
      item.material.emissive.set(on ? LED_COLORS[color] : '#000000')
      item.material.emissiveIntensity = on ? 7 : 0
      item.glow.color.set(LED_COLORS[color])
      item.glow.opacity = on ? 0.9 : 0
      item.indicator.emissive.set(on ? '#7ccfa0' : '#000000')
      item.indicator.emissiveIntensity = on ? 0.65 : 0
      item.lights.forEach((light) => {
        light.intensity = on ? 42 : 0
        light.color.set(LED_COLORS[color])
      })
    }
  }
  updateLed(cfg.ledEnabled, cfg.ledRowEnabled, cfg.ledColor, cfg.ledLayers)
  // 局部座標縮放只影響位置；光源功率依顯示尺度設定，保持不同櫃型亮度接近。
  return {
    root,
    measurements,
    updateLed,
    toggleDrawer: (id) => {
      if (drawers[id]) drawers[id].open = !drawers[id].open
    },
    toggleStorage: (id) => {
      if (storageParts[id]) storageParts[id].open = !storageParts[id].open
    },
    animateDrawers: (delta) => {
      let moving = false
      for (const part of storageParts) {
        const axis = part.rotation ? part.group.rotation : part.group.position
        const key = part.rotation ? 'y' : 'z'
        const target = part.open ? part.rotation || (depth - b * 2 - 0.6) * 0.9 : 0
        if (axis[key] === target) continue
        axis[key] += (target - axis[key]) * (1 - Math.exp(-10 * Math.min(delta, 0.05)))
        if (Math.abs(axis[key] - target) < 0.001) axis[key] = target
        else moving = true
      }
      for (const drawer of drawers) {
        const target = drawer.open ? box.length * 0.9 : 0
        if (drawer.group.position.z === target) continue
        drawer.group.position.z +=
          (target - drawer.group.position.z) * (1 - Math.exp(-10 * Math.min(delta, 0.05)))
        if (Math.abs(drawer.group.position.z - target) < 0.01) drawer.group.position.z = target
        else moving = true
      }
      return moving
    },
    target: [0, (height * displayScale) / 2, 0],
    dispose: () => {
      root.traverse((object) => {
        if (object instanceof InstancedMesh) object.dispose()
      })
      geometries.forEach((item) => item.dispose())
      materials.forEach((item) => item.dispose())
      textures.forEach((item) => item.dispose())
    }
  }
}
