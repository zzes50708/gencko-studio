import { describe, expect, it } from 'vitest'
import { Group, InstancedMesh, Matrix4, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three'
import {
  ensureHospitalMarkerCapacity,
  refreshHospitalMarkerBounds
} from '../utils/hospitalMapMarkers'

describe('院所定位資料更新', () => {
  it('初始空資料後增加標記，會擴充緩衝區並替換場景容器', () => {
    const original = new InstancedMesh(new SphereGeometry(0.1), new MeshBasicMaterial(), 1)
    const parent = new Group()
    parent.add(original)
    const updated = ensureHospitalMarkerCapacity(original, 11)
    expect(updated.instanceMatrix.count).toBeGreaterThanOrEqual(11)
    expect(parent.children).toEqual([updated])
    expect(updated.geometry).toBe(original.geometry)
    expect(ensureHospitalMarkerCapacity(updated, 2)).toBe(updated)
    updated.dispose()
    updated.geometry.dispose()
    updated.material.dispose()
  })

  it('先清空再更新座標，點擊與顯示邊界會包含新位置', () => {
    const markers = new InstancedMesh(new SphereGeometry(0.1), new MeshBasicMaterial(), 2)
    markers.count = 0
    refreshHospitalMarkerBounds(markers)
    markers.count = 2
    markers.setMatrixAt(0, new Matrix4().makeTranslation(8, 0.34, 4))
    markers.setMatrixAt(1, new Matrix4().makeTranslation(-8, 0.34, -4))
    refreshHospitalMarkerBounds(markers)
    for (const point of [new Vector3(8, 0.34, 4), new Vector3(-8, 0.34, -4)]) {
      expect(markers.boundingBox!.containsPoint(point)).toBe(true)
      expect(markers.boundingSphere!.containsPoint(point)).toBe(true)
    }
    markers.dispose()
    markers.geometry.dispose()
    markers.material.dispose()
  })
})
