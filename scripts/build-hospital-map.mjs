import { mkdir, writeFile } from 'node:fs/promises'

// 固定版本並保留來源授權。僅在更新圖資時執行，網站不依賴外部圖磚服務。
const base = 'https://unpkg.com/taiwan-atlas@2021.9.20/'
const topology = await (await fetch(`${base}counties-mercator-10t.json`)).json()
const license = await (await fetch(`${base}LICENSE`)).text()
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

// 各共用弧線只簡化一次，避免相鄰縣市出現裂縫。
function simplify(points, tolerance = 0.45) {
  if (points.length < 3) return points
  const a = points[0]
  const b = points.at(-1)
  let max = tolerance * tolerance
  let split = 0
  points.slice(1, -1).forEach((p, i) => {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy) || 0))
    const distance = (p[0] - a[0] - t * dx) ** 2 + (p[1] - a[1] - t * dy) ** 2
    if (distance > max) { max = distance; split = i + 1 }
  })
  return split ? [...simplify(points.slice(0, split + 1), tolerance).slice(0, -1), ...simplify(points.slice(split), tolerance)] : [a, b]
}
const simplified = arcs.map((arc) => simplify(arc))
const ring = (ids) => ids.flatMap((id, i) => {
  const points = id < 0 ? [...simplified[~id]].reverse() : simplified[id]
  return i ? points.slice(1) : points
})
const area = (points) => Math.abs(points.reduce((sum, p, i) => {
  const q = points[(i + 1) % points.length]
  return sum + p[0] * q[1] - q[0] * p[1]
}, 0) / 2)
const counties = topology.objects.counties.geometries.map((geometry) => {
  const polygons = (geometry.type === 'Polygon' ? [geometry.arcs] : geometry.arcs).map((polygon) => polygon.map(ring))
  const largest = Math.max(...polygons.map((polygon) => area(polygon[0])))
  return {
    name: geometry.properties.COUNTYNAME.replaceAll('臺', '台'),
    polygons: polygons.filter((polygon) => area(polygon[0]) >= 2 || area(polygon[0]) === largest)
      .map((polygon) => polygon.map((points) => points.map(([x, y]) => [Number(((x - 250) / 55).toFixed(4)), Number(((y - 300) / 55).toFixed(4))])))
  }
})
await mkdir('assets/maps', { recursive: true })
await writeFile('assets/maps/taiwan-counties.json', JSON.stringify(counties))
await writeFile('assets/maps/LICENSE-taiwan-atlas.txt', license)
console.log(`${counties.length} 縣市；圖資 ${JSON.stringify(counties).length} 字元`)
