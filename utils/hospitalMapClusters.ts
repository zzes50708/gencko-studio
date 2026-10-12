export type ScreenHospital = { id: string | number; x: number; y: number }
export function clusterScreenHospitals(points: ScreenHospital[], radius = 32) {
  const groups: { x: number; y: number; ids: (string | number)[] }[] = []
  for (const point of points) {
    const group = groups.find((group) => Math.hypot(group.x - point.x, group.y - point.y) <= radius)
    if (!group) groups.push({ x: point.x, y: point.y, ids: [point.id] })
    else {
      const count = group.ids.length
      group.x = (group.x * count + point.x) / (count + 1)
      group.y = (group.y * count + point.y) / (count + 1)
      group.ids.push(point.id)
    }
  }
  return groups
}
