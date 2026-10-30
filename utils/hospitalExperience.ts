import { hospitalMatchesQuery } from './hospitalSearch'

export const normalizeHospitalQuery = (value: unknown) =>
  String(value ?? '')
    .normalize('NFKC')
    .replaceAll('臺', '台')
    .trim()
    .replace(/\s+/g, ' ')

export function rankHospitalMatches<
  T extends { name?: string; address?: string; city?: string; district?: string | null }
>(rows: T[], query: string): T[] {
  const q = normalizeHospitalQuery(query).toLocaleLowerCase('zh-TW')
  return rows
    .map((row, index) => {
      const name = normalizeHospitalQuery(row.name).toLocaleLowerCase('zh-TW')
      const score = !q || name === q ? 0 : name.startsWith(q) ? 1 : name.includes(q) ? 2 : 3
      return { row, index, score }
    })
    .filter(({ row }) => hospitalMatchesQuery([row.name, row.address, row.city, row.district], q))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map(({ row }) => row)
}

/** 只呈現有來源的文字，不推測目前是否營業。 */
export function hospitalHours(value: unknown): string {
  if (typeof value === 'string') return value.trim().slice(0, 500)
  if (Array.isArray(value))
    return value
      .filter((v) => typeof v === 'string')
      .join('；')
      .slice(0, 500)
  if (value && typeof value === 'object')
    return Object.entries(value)
      .filter(([, v]) => typeof v === 'string')
      .map(([day, hours]) => `${day}：${hours}`)
      .join('；')
      .slice(0, 500)
  return ''
}

export function hospitalVerifiedDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return ''
  const date = value.slice(0, 10)
  const parsed = new Date(`${date}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : ''
}

export function hospitalSpecies(value: unknown): string {
  return Array.isArray(value)
    ? [...new Set(value.filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim()))]
        .join('、')
        .slice(0, 200)
    : ''
}

export function hospitalPixelRatio(dpr: number, compact: boolean, cores?: number, memory?: number) {
  const lowPower = (cores !== undefined && cores <= 4) || (memory !== undefined && memory <= 4)
  return Math.min(Math.max(dpr || 1, 1), compact ? (lowPower ? 1 : 1.25) : lowPower ? 1.25 : 1.75)
}

export function hospitalLoadedTime(value: string) {
  const date = new Date(value)
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('zh-TW', {
        timeZone: 'Asia/Taipei',
        dateStyle: 'short',
        timeStyle: 'short',
        hourCycle: 'h23'
      }).format(date)
    : '未提供'
}

/** 僅接受地圖用途的 Google 網址，其他來源退回院名與地址查詢。 */
export function hospitalGoogleMapUrl(row: { name?: string; address?: string; mapUrl?: unknown }) {
  if (typeof row.mapUrl === 'string') {
    try {
      const url = new URL(row.mapUrl)
      if (
        url.protocol === 'https:' &&
        ((/(^|\.)google\.com(?:\.tw)?$/.test(url.hostname) &&
          (url.pathname.startsWith('/maps') || url.hostname === 'maps.google.com')) ||
          url.hostname === 'maps.app.goo.gl' ||
          (url.hostname === 'goo.gl' && url.pathname.startsWith('/maps')))
      )
        return url.href
    } catch {
      /* 未通過檢查時使用由本站建立的查詢網址。 */
    }
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([row.name, row.address].filter(Boolean).join(' '))}`
}
