import { projectTaiwanCoordinate } from './hospitalMap'
export interface HospitalBuilding {
  id: string
  name?: string
  height: number
  heightSource: string
  ring: [number, number][]
}
// 建築高度與地圖地理比例一致，不另外放大樓高。
export function buildingMapHeight(building: HospitalBuilding) {
  const [longitude, latitude] = building.ring[0]!
  const base = projectTaiwanCoordinate(longitude, latitude)
  const end = projectTaiwanCoordinate(longitude, latitude + building.height / 111320)
  return Math.hypot(end[0] - base[0], end[1] - base[1])
}
