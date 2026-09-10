import {
  BoxGeometry, BufferGeometry, CanvasTexture, CatmullRomCurve3, CylinderGeometry,
  DoubleSide, EdgesGeometry, ExtrudeGeometry, Float32BufferAttribute, Group,
  LatheGeometry, LineBasicMaterial, LineSegments, Mesh, MeshStandardMaterial,
  Path, PlaneGeometry, ShadowMaterial, Shape, SphereGeometry, SRGBColorSpace, TubeGeometry, Vector2, Vector3
} from 'three'
import type { HabitatPartId } from './habitat-parts'

/** 依使用者示意圖手工重建；模型單位為相對比例，不宣稱實測尺寸。 */
export function createHabitatModel() {
  const root = new Group()
  root.name = 'GenckoHabitat'
  const selectable: { mesh: Mesh; id: HabitatPartId }[] = []
  const geometries = new Set<BufferGeometry>()
  const materials = new Set<MeshStandardMaterial | LineBasicMaterial | ShadowMaterial>()
  const textures: CanvasTexture[] = []
  const material = (color: string, extra: Record<string, unknown> = {}) => {
    const mat = new MeshStandardMaterial({ color, roughness: 0.55, ...extra })
    materials.add(mat)
    return mat
  }
  const mesh = (geometry: BufferGeometry, mat: MeshStandardMaterial, position: number[], id?: HabitatPartId, parent = root) => {
    geometries.add(geometry)
    const obj = new Mesh(geometry, mat)
    obj.position.set(position[0], position[1], position[2])
    obj.castShadow = !mat.transparent
    obj.receiveShadow = true
    if (id) {
      obj.userData.partId = id
      obj.name = id
      selectable.push({ mesh: obj, id })
    }
    parent.add(obj)
    return obj
  }
  const box = (size: number[], position: number[], mat: MeshStandardMaterial, id?: HabitatPartId, parent = root) =>
    mesh(new BoxGeometry(size[0], size[1], size[2]), mat, position, id, parent)
  const round = (size: number[], position: number[], mat: MeshStandardMaterial, parent = root) => {
    const obj = mesh(new SphereGeometry(1, 24, 16), mat, position, undefined, parent)
    obj.scale.set(size[0], size[1], size[2])
    return obj
  }
  const tube = (points: number[][], radius: number, mat: MeshStandardMaterial, id?: HabitatPartId, parent = root) =>
    mesh(new TubeGeometry(new CatmullRomCurve3(points.map(p => new Vector3(...p as [number, number, number]))), 36, radius, 8, false), mat, [0, 0, 0], id, parent)

  const frame = material('#bdcbd0', { metalness: 0.3, roughness: 0.3 })
  const glass = material('#b9d9e4', { transparent: true, opacity: 0.11, depthWrite: false, side: DoubleSide, roughness: 0.12 })
  const paper = material('#f1e8d7', { roughness: 0.95 })
  const bowlMat = material('#e8e5dc', { roughness: 0.3 })
  const waterMat = material('#7bbdcc', { roughness: 0.14, metalness: 0.1 })
  const powderMat = material('#f8f4e8', { roughness: 0.95 })
  const hideMat = material('#333432', { roughness: 0.88 })
  const rubber = material('#3d4141', { roughness: 0.88 })
  const wireMat = material('#555855', { roughness: 0.8 })

  // 透明箱體；玻璃不攔截點擊，讓箱內設備可直接選取。
  box([6.4, 0.14, 4.05], [0, 0, 0], frame, 'tank')
  box([6.12, 0.04, 3.77], [0, 0.1, 0], paper, 'substrate')
  const panels = [
    box([6.4, 2.6, 0.035], [0, 1.37, -2], glass),
    box([0.035, 2.6, 4.0], [-3.18, 1.37, 0], glass),
    box([0.035, 2.6, 4.0], [3.18, 1.37, 0], glass),
    box([6.4, 2.6, 0.025], [0, 1.37, 2], material('#d2e8eb', { transparent: true, opacity: 0.035, depthWrite: false }), undefined)
  ]
  for (const panel of panels) {
    panel.raycast = () => {}
    const edgeGeometry = new EdgesGeometry(panel.geometry)
    geometries.add(edgeGeometry)
    const edgeMaterial = new LineBasicMaterial({ color: '#9bbac5', transparent: true, opacity: 0.5 })
    materials.add(edgeMaterial)
    const edges = new LineSegments(edgeGeometry, edgeMaterial)
    edges.raycast = () => {}
    panel.add(edges)
  }
  for (const x of [-3.18, 3.18]) for (const z of [-2, 2]) box([0.038, 2.62, 0.038], [x, 1.37, z], frame, 'tank')
  for (const z of [-2, 2]) box([6.42, 0.055, 0.05], [0, 2.69, z], frame, 'tank')
  for (const x of [-3.18, 3.18]) box([0.05, 0.055, 4], [x, 2.69, 0], frame, 'tank')

  // 頂蓋為真正開孔的幾何，不是貼在表面的白色圖案。
  const lid = new Group()
  root.add(lid)
  const lidShape = new Shape()
  lidShape.moveTo(-3.25, -2.08); lidShape.lineTo(3.25, -2.08)
  lidShape.lineTo(3.25, 2.08); lidShape.lineTo(-3.25, 2.08); lidShape.closePath()
  for (let x = -2.8; x <= 2.81; x += 0.56) for (let y = -1.65; y <= 1.66; y += 0.54) {
    const hole = new Path()
    hole.absellipse(x, y, 0.068, 0.15, 0, Math.PI * 2, true)
    lidShape.holes.push(hole)
  }
  const lidMesh = mesh(new ExtrudeGeometry(lidShape, { depth: 0.065, bevelEnabled: false, curveSegments: 8 }), material('#aeb3b1', { metalness: 0.38, roughness: 0.5 }), [0, 2.75, 0], 'tank', lid)
  lidMesh.rotation.x = -Math.PI / 2

  // 左前水盆、左後食盆，沿用原圖的相對位置。
  const bowlProfile = [new Vector2(0, 0), new Vector2(.49, 0), new Vector2(.61, .06), new Vector2(.66, .25), new Vector2(.63, .29), new Vector2(.57, .27), new Vector2(.51, .12), new Vector2(0, .12)]
  mesh(new LatheGeometry(bowlProfile, 48), bowlMat, [-2, .13, 1.05], 'water')
  mesh(new CylinderGeometry(.555, .555, .018, 48), waterMat, [-2, .32, 1.05], 'water')
  mesh(new LatheGeometry(bowlProfile, 48), bowlMat.clone(), [-1.95, .13, -1.05], 'food')
  mesh(new CylinderGeometry(.54, .54, .02, 40), powderMat, [-1.95, .27, -1.05], 'food')
  const mealworm = material('#c18a3b', { roughness: .7 })
  tube([[-2.18, .31, -.98], [-2.04, .36, -.87], [-1.88, .36, -.92], [-1.77, .31, -1.11]], .052, mealworm, 'food')
  for (let i = 0; i < 18; i++) {
    const a = i * 2.399, r = .32 * Math.sqrt((i + 1) / 18)
    round([.033, .016, .026], [-1.96 + Math.cos(a) * r, .29, -1.03 + Math.sin(a) * r], powderMat)
  }

  // 深色拱門躲避屋：入口連通空間，避免實心方塊冒充開口。
  const caveShape = new Shape()
  caveShape.moveTo(-1.03, 0)
  caveShape.lineTo(-1.08, .83)
  caveShape.quadraticCurveTo(-1.05, 1.57, -.6, 1.65)
  caveShape.quadraticCurveTo(.12, 1.82, .78, 1.45)
  caveShape.quadraticCurveTo(1.08, 1.21, 1.09, .55)
  caveShape.lineTo(1.02, 0); caveShape.lineTo(.18, 0)
  caveShape.lineTo(.18, .57); caveShape.bezierCurveTo(.18, 1.04, -.52, 1.04, -.52, .57)
  caveShape.lineTo(-.52, 0); caveShape.closePath()
  mesh(new ExtrudeGeometry(caveShape, { depth: 1.65, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .065, bevelThickness: .06, curveSegments: 18 }), hideMat, [1.42, .16, -1.34], 'hide')
  box([1.8, 1.1, .065], [1.42, .73, -1.35], hideMat, 'hide')

  // 加熱墊在箱外下方，導線連接外置溫度計。
  box([2.65, .1, 2.65], [2.12, -.18, .62], rubber, 'heat')
  const matLine = material('#666863', { roughness: .85 })
  for (let i = 0; i < 13; i++) box([2.37, .012, .022], [2.12, -.123, -.49 + i * .18], matLine, 'heat')
  tube([[2.6, -.16, 1.98], [3.1, -.15, 2.2], [4.1, -.13, 2.25], [4.65, .05, 1.6]], .036, wireMat, 'heat')
  const thermometer = new Group()
  thermometer.position.set(4.03, .35, .65)
  thermometer.rotation.y = -.2
  root.add(thermometer)
  box([1.2, .66, .2], [0, 0, 0], material('#272c2b', { roughness: .45 }), 'thermometer', thermometer)
  const display = document.createElement('canvas')
  display.width = 512; display.height = 256
  const ctx = display.getContext('2d')!
  ctx.fillStyle = '#b7c1b5'; ctx.fillRect(0, 0, 512, 256)
  ctx.fillStyle = '#23302c'; ctx.font = 'bold 142px monospace'; ctx.fillText('32.0', 22, 179)
  ctx.font = '48px sans-serif'; ctx.fillText('°C', 397, 177)
  const screenTexture = new CanvasTexture(display)
  screenTexture.colorSpace = SRGBColorSpace
  textures.push(screenTexture)
  box([1.04, .49, .012], [0, 0, .108], material('#ffffff', { map: screenTexture, roughness: .8 }), 'thermometer', thermometer)
  tube([[4, .65, .65], [4, 2.94, -.25], [3.6, 2.94, -.65], [2.66, 2.94, -.65], [2.66, .29, .68], [2.08, .27, .68]], .028, wireMat, 'thermometer')
  mesh(new CylinderGeometry(.053, .053, .42, 12), material('#afb7b5', { metalness: .65, roughness: .2 }), [2.05, .26, .68], 'thermometer').rotation.z = Math.PI / 2

  // 接觸陰影平面，不增加場景裝飾。
  const groundGeometry = new PlaneGeometry(200, 200)
  const groundMaterial = new ShadowMaterial({ opacity: .18, color: '#514e47' })
  geometries.add(groundGeometry); materials.add(groundMaterial)
  const ground = new Mesh(groundGeometry, groundMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -.28
  ground.receiveShadow = true
  root.add(ground)
  ground.castShadow = false
  ground.raycast = () => {}

  // clone 的材質亦納入釋放清單。
  root.traverse(obj => { if (obj instanceof Mesh && obj.material instanceof MeshStandardMaterial) materials.add(obj.material) })
  const setSelected = (id: HabitatPartId) => {
    // 同一設備可能共用材質；先清空，再標出被選中的設備。
    for (const mat of materials) if (mat instanceof MeshStandardMaterial) { mat.emissive.set('#000000'); mat.emissiveIntensity = 0 }
    for (const entry of selectable) if (entry.id === id) {
      const mat = entry.mesh.material as MeshStandardMaterial
      mat.emissive.set('#be3f16'); mat.emissiveIntensity = .16
    }
  }
  return {
    root, lid, setSelected,
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()) }
  }
}
