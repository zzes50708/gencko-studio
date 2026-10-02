import { InstancedMesh, type BufferGeometry, type Material } from 'three'

// 實例緩衝區不能直接擴大；資料增加時更換容器，保留共用幾何與材質。
export function ensureHospitalMarkerCapacity<G extends BufferGeometry, M extends Material>(
  markers: InstancedMesh<G, M>,
  count: number
): InstancedMesh<G, M> {
  if (count <= markers.instanceMatrix.count) return markers
  const replacement = new InstancedMesh(markers.geometry, markers.material, count)
  replacement.renderOrder = markers.renderOrder
  const parent = markers.parent
  parent?.remove(markers)
  parent?.add(replacement)
  markers.dispose()
  return replacement
}

export function refreshHospitalMarkerBounds(markers: InstancedMesh) {
  markers.instanceMatrix.needsUpdate = true
  if (markers.instanceColor) markers.instanceColor.needsUpdate = true
  // Raycaster 與視錐剔除會沿用快取邊界，座標或數量改變後必須重算。
  markers.computeBoundingBox()
  markers.computeBoundingSphere()
}
