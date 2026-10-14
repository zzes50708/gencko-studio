export type ScreenHospital = { id: string | number; x: number; y: number }
export function clusterScreenHospitals(
  points: ScreenHospital[],
  radius = 32,
  avoidLabelOverlap = false,
  viewportWidth = Infinity
) {
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
  if (avoidLabelOverlap) {
    // 以實際名稱標籤的範圍合併，而不只比較定位點的距離。
    let merged = true
    while (merged) {
      merged = false
      outer: for (let i = 0; i < groups.length; i++) {
        for (let j = i + 1; j < groups.length; j++) {
          const a = groups[i]!,
            b = groups[j]!
          const ar = hospitalMarkerBounds(a, viewportWidth),
            br = hospitalMarkerBounds(b, viewportWidth)
          if (
            ar.left < br.right + 6 &&
            ar.right + 6 > br.left &&
            ar.top < br.bottom + 6 &&
            ar.bottom + 6 > br.top
          ) {
            const count = a.ids.length + b.ids.length
            a.x = (a.x * a.ids.length + b.x * b.ids.length) / count
            a.y = (a.y * a.ids.length + b.y * b.ids.length) / count
            a.ids.push(...b.ids)
            groups.splice(j, 1)
            merged = true
            break outer
          }
        }
      }
    }
  }
  return groups
}

export function hospitalMarkerAlignment(x: number, width: number) {
  return x < 84 ? 'left' : x > width - 84 ? 'right' : 'center'
}
export function hospitalMarkerBounds(
  group: { x: number; y: number; ids: unknown[] },
  width: number
) {
  const single = group.ids.length === 1
  const size = single ? 160 : 44
  const alignment = single ? hospitalMarkerAlignment(group.x, width) : 'center'
  const left = group.x - (alignment === 'left' ? 0 : alignment === 'right' ? size : size / 2)
  return {
    left,
    right: left + size,
    top: group.y - (single ? 26 : 22),
    bottom: group.y + (single ? 26 : 22)
  }
}
