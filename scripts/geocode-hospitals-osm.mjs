import 'dotenv/config'
import { mkdir, writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const SOURCE_URL = 'https://www.openstreetmap.org/copyright'
const TOWNS_URL = 'https://unpkg.com/taiwan-atlas@2021.9.20/towns-10t.json'
const OUT = 'data/hospital-coordinate-audit.json'
const endpoints = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
]

const required = (name) => {
  const value = process.env[name]
  if (!value) throw new Error(`缺少環境變數 ${name}`)
  return value
}

const normalize = (value = '') =>
  value
    .normalize('NFKC')
    .replaceAll('臺', '台')
    .replace(/[\s()（）·・．。－—_\-]/g, '')
    .toLowerCase()

const nameCore = (value = '') =>
  normalize(value)
    .replace(/國立/g, '')
    .replace(/附設/g, '')
    .replace(/特殊寵物|特別寵物|非犬貓|野生動物|寵物專科|動物專科|特殊/g, '')
    .replace(/獸醫教學醫院|獸醫院|動物醫療中心|動物醫院|寵物醫院|專科醫院|醫院|中心/g, '')
    .replace(/分院|院區|[一二三四五六七八九十]樓/g, '')

function bigrams(value) {
  const chars = [...value]
  if (chars.length < 2) return new Set(chars)
  return new Set(chars.slice(0, -1).map((char, index) => char + chars[index + 1]))
}

function dice(a, b) {
  const left = bigrams(a)
  const right = bigrams(b)
  if (!left.size && !right.size) return 1
  let overlap = 0
  left.forEach((item) => right.has(item) && overlap++)
  return (2 * overlap) / (left.size + right.size || 1)
}

function pointOf(element) {
  const lat = Number(element.lat ?? element.center?.lat)
  const longitude = Number(element.lon ?? element.center?.lon)
  return Number.isFinite(lat) && Number.isFinite(longitude) ? { latitude: lat, longitude } : null
}

function sourceId(element) {
  const prefix = element.type === 'node' ? 'node' : element.type === 'way' ? 'way' : 'relation'
  return `${prefix}/${element.id}`
}

function scoreCandidate(hospital, element) {
  const sourceName = element.tags?.name || element.tags?.['name:zh'] || ''
  const exact = normalize(hospital.name) === normalize(sourceName)
  const core = dice(nameCore(hospital.name), nameCore(sourceName))
  const sourceAddress = [
    element.tags?.['addr:city'],
    element.tags?.['addr:district'],
    element.tags?.['addr:street'],
    element.tags?.['addr:housenumber']
  ]
    .filter(Boolean)
    .join('')
  const address = sourceAddress ? dice(normalize(hospital.address), normalize(sourceAddress)) : 0
  const score = (exact ? 1 : core) * 0.82 + address * 0.18
  return { score, exact, core, address, sourceName, sourceAddress }
}

function pointInRing(point, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]
    const b = ring[j]
    if (
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside
  }
  return inside
}

function decodeTowns(topology) {
  const { scale, translate } = topology.transform
  const arcs = topology.arcs.map((arc) => {
    let x = 0
    let y = 0
    return arc.map(([dx, dy]) => {
      x += dx
      y += dy
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]]
    })
  })
  const ring = (ids) =>
    ids.flatMap((id, index) => {
      const points = id < 0 ? [...arcs[~id]].reverse() : arcs[id]
      return index ? points.slice(1) : points
    })
  return topology.objects.towns.geometries.map((geometry) => ({
    city: normalize(geometry.properties.COUNTYNAME),
    district: normalize(geometry.properties.TOWNNAME),
    polygons: (geometry.type === 'Polygon' ? [geometry.arcs] : geometry.arcs).map((polygon) =>
      polygon.map(ring)
    )
  }))
}

function isInHospitalDistrict(hospital, point, towns) {
  if (!point) return false
  const city = normalize(hospital.city)
  const district = normalize(hospital.district)
  return towns.some(
    (town) =>
      town.city === city &&
      town.district === district &&
      town.polygons.some(
        ([outer, ...holes]) =>
          pointInRing([point.longitude, point.latitude], outer) &&
          !holes.some((hole) => pointInRing([point.longitude, point.latitude], hole))
      )
  )
}

async function fetchRegion(bounds, namePattern) {
  const bbox = bounds.join(',')
  const query = `[out:json][timeout:60];nwr["name"~"${namePattern}"](${bbox});out center tags;`
  let lastError
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'user-agent': 'GenckoStudio hospital coordinate audit'
        },
        body: new URLSearchParams({ data: query })
      })
      if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
      return (await response.json()).elements || []
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

const supabase = createClient(required('SUPABASE_URL'), required('SUPABASE_KEY'), {
  auth: { persistSession: false }
})
const { data: hospitals, error } = await supabase
  .from('hospitals')
  .select('id,name,address,city,district')
  .eq('status', 'active')
  .order('id', { ascending: true })
if (error) throw error
const townsResponse = await fetch(TOWNS_URL)
if (!townsResponse.ok) throw new Error(`無法載入鄉鎮市區界線：${townsResponse.status}`)
const towns = decodeTowns(await townsResponse.json())

const regionResults = []
const hospitalsByDistrict = Map.groupBy(
  hospitals,
  (hospital) => `${normalize(hospital.city)}|${normalize(hospital.district)}`
)
for (const [key, districtHospitals] of hospitalsByDistrict) {
  const [city, district] = key.split('|')
  const town = towns.find((item) => item.city === city && item.district === district)
  const points = town?.polygons.flat(2) || []
  if (!points.length)
    throw new Error(`找不到 ${districtHospitals[0].city}${districtHospitals[0].district} 的行政區界線`)
  const latitudes = points.map((point) => point[1])
  const longitudes = points.map((point) => point[0])
  const bounds = [
    Math.min(...latitudes) - 0.015,
    Math.min(...longitudes) - 0.015,
    Math.max(...latitudes) + 0.015,
    Math.max(...longitudes) + 0.015
  ]
  const namePattern = [
    ...new Set(
      districtHospitals.map((hospital) => nameCore(hospital.name)).filter((name) => name.length >= 2)
    )
  ]
    .sort((a, b) => b.length - a.length)
    .join('|')
  regionResults.push(...(await fetchRegion(bounds, namePattern)))
}
const unique = [...new Map(regionResults.map((item) => [sourceId(item), item])).values()]

const audit = hospitals.map((hospital) => {
  const candidates = unique
    .map((element) => ({ element, point: pointOf(element), ...scoreCandidate(hospital, element) }))
    .filter(
      (candidate) =>
        isInHospitalDistrict(hospital, candidate.point, towns) &&
        (candidate.exact || candidate.core >= 0.45)
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ element, point, ...candidate }) => ({
      ...candidate,
      ...point,
      osmId: sourceId(element),
      osmUrl: `https://www.openstreetmap.org/${sourceId(element)}`
    }))
  const best = candidates[0]
  const accepted = !!best && (best.exact || best.score >= 0.78) && (!candidates[1] || best.score - candidates[1].score >= 0.08)
  return {
    id: hospital.id,
    name: hospital.name,
    address: hospital.address,
    city: hospital.city,
    district: hospital.district,
    accepted,
    match: accepted ? best : null,
    candidates
  }
})

await mkdir('data', { recursive: true })
await writeFile(
  OUT,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: 'OpenStreetMap / Overpass API',
      sourceUrl: SOURCE_URL,
      license: 'ODbL 1.0',
      hospitalCount: hospitals.length,
      osmFeatureCount: unique.length,
      acceptedCount: audit.filter((item) => item.accepted).length,
      unresolvedCount: audit.filter((item) => !item.accepted).length,
      hospitals: audit
    },
    null,
    2
  )
)

console.log(`OSM ${unique.length} 筆；自動接受 ${audit.filter((item) => item.accepted).length}/${hospitals.length}`)
console.log(`審核檔：${OUT}`)
