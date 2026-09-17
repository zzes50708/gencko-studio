import countyData from '../assets/maps/taiwan-counties.json'

export type MapPoint = [number, number]
export type CountyPolygon = MapPoint[][]
export type MapHospital = {
  id: string | number
  name?: string
  address?: string
  city: string
  district?: string | null
  latitude?: number | null
  longitude?: number | null
  geocodeSource?: string | null
  geocodeSourceId?: string | null
}
export const MAP_COUNTIES = countyData as { name: string; polygons: CountyPolygon[] }[]
export const normalizeMapCity = (name: string) => name.replaceAll('臺', '台').trim()

// 與 Taiwan Atlas mercatorTw 主島投影相同：scale=10000、translate=[275, 300]。
// 最後再套用本專案圖資的正規化，讓 WGS84 點位精確落到既有縣市幾何上。
export function projectTaiwanCoordinate(longitude: number, latitude: number): MapPoint {
  const radians = Math.PI / 180
  const lambda = (longitude - 120.97) * radians
  const phi = latitude * radians
  const deltaPhi = -23.6 * radians
  const cosPhi = Math.cos(phi)
  const x = Math.cos(lambda) * cosPhi
  const y = Math.sin(lambda) * cosPhi
  const z = Math.sin(phi)
  const rotatedLambda = Math.atan2(y, x * Math.cos(deltaPhi) - z * Math.sin(deltaPhi))
  const rotatedPhi = Math.asin(
    Math.max(-1, Math.min(1, z * Math.cos(deltaPhi) + x * Math.sin(deltaPhi)))
  )
  const projectedX = 275 + 10000 * rotatedLambda
  const projectedY = 300 - 10000 * Math.log(Math.tan((Math.PI / 2 + rotatedPhi) / 2))
  return [(projectedX - 250) / 55, (projectedY - 300) / 55]
}

export function preciseMapHospitals(hospitals: MapHospital[]) {
  return hospitals.filter(
    (hospital) =>
      Number.isFinite(hospital.latitude) &&
      Number.isFinite(hospital.longitude) &&
      hospital.latitude! >= 18 &&
      hospital.latitude! <= 27 &&
      hospital.longitude! >= 115 &&
      hospital.longitude! <= 125
  )
}

export function isInsideRing(point: MapPoint, ring: MapPoint[]) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!
    const b = ring[j]!
    if (
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside
  }
  return inside
}

export function isInsideCounty(point: MapPoint, polygons: CountyPolygon[]) {
  return polygons.some(
    ([outer, ...holes]) =>
      outer && isInsideRing(point, outer) && !holes.some((hole) => isInsideRing(point, hole))
  )
}

export function countyAnchor(polygons: CountyPolygon[]): MapPoint {
  const rings = polygons.map((polygon) => polygon[0]!)
  const signedArea = (ring: MapPoint[]) =>
    ring.reduce((sum, p, i) => {
      const q = ring[(i + 1) % ring.length]!
      return sum + p[0] * q[1] - q[0] * p[1]
    }, 0)
  const ring = [...rings].sort((a, b) => Math.abs(signedArea(b)) - Math.abs(signedArea(a)))[0]!
  const area = signedArea(ring)
  const centroid = ring.reduce(
    (sum, p, i) => {
      const q = ring[(i + 1) % ring.length]!
      const cross = p[0] * q[1] - q[0] * p[1]
      sum[0] += ((p[0] + q[0]) * cross) / (3 * area)
      sum[1] += ((p[1] + q[1]) * cross) / (3 * area)
      return sum
    },
    [0, 0] as MapPoint
  )
  if (isInsideCounty(centroid, polygons)) return centroid
  // 不規則多邊形的質心可能在縣界外，向內搜尋可用的概覽標記位置。
  const minX = Math.min(...ring.map((p) => p[0]))
  const maxX = Math.max(...ring.map((p) => p[0]))
  const minY = Math.min(...ring.map((p) => p[1]))
  const maxY = Math.max(...ring.map((p) => p[1]))
  for (let y = 1; y < 20; y++)
    for (let x = 1; x < 20; x++) {
      const point: MapPoint = [minX + ((maxX - minX) * x) / 20, minY + ((maxY - minY) * y) / 20]
      if (isInsideCounty(point, polygons)) return point
    }
  return ring[0]!
}

export function summarizeMapHospitals(hospitals: MapHospital[], wishlist: (string | number)[]) {
  const favorites = new Set(wishlist.map(String))
  const result = new Map<string, { count: number; saved: number }>()
  for (const hospital of hospitals) {
    const city = normalizeMapCity(hospital.city || '')
    const summary = result.get(city) || { count: 0, saved: 0 }
    summary.count++
    if (favorites.has(String(hospital.id))) summary.saved++
    result.set(city, summary)
  }
  return result
}
