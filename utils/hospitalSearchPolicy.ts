import { normalizeHospitalQuery } from './hospitalExperience'

export function hospitalSearchRequest(raw: unknown, region: unknown = '') {
  if (
    typeof raw !== 'string' ||
    raw.length > 80 ||
    typeof region !== 'string' ||
    region.length > 12
  )
    return null
  const q = normalizeHospitalQuery(raw)
  const city = normalizeHospitalQuery(region)
  if (q.length < 2 || q.length > 80 || (city && !/^[\p{Script=Han}]{1,5}[市縣]$/u.test(city)))
    return null
  return { q, city, key: JSON.stringify([city, q.toLocaleLowerCase('zh-TW')]) }
}

/** 單一伺服器實例的有界限流；跨實例總額仍應由部署平台限制。 */
export function createHospitalSearchGate(limit = 60, windowMs = 60_000) {
  const entries = new Map<string, { start: number; count: number }>()
  return (client: string, now = Date.now()) => {
    let entry = entries.get(client)
    if (!entry || now - entry.start >= windowMs) {
      if (entries.size >= 2048) {
        for (const [key, value] of entries) if (now - value.start >= windowMs) entries.delete(key)
        if (entries.size >= 2048) entries.delete(entries.keys().next().value!)
      }
      entry = { start: now, count: 0 }
      entries.set(client, entry)
    }
    entry.count++
    return entry.count <= limit
      ? 0
      : Math.max(1, Math.ceil((windowMs - (now - entry.start)) / 1000))
  }
}
