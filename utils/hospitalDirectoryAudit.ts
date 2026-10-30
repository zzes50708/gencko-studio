import {
  MAP_COUNTIES,
  isInsideCounty,
  preciseMapHospitals,
  projectTaiwanCoordinate
} from './hospitalMap'
import { normalizeHospitalQuery, hospitalVerifiedDate } from './hospitalExperience'
import { hospitalPhone } from './hospitalPhone'

type AuditRow = {
  id: string | number
  name?: string
  address?: string
  city: string
  phone?: string | null
  latitude?: number | null
  longitude?: number | null
  verifiedAt?: unknown
  hours?: unknown
  mapUrl?: string | null
}
export function auditHospitalDirectory(rows: AuditRow[], now = Date.now()) {
  const issues: { id: string; name: string; kind: string; detail: string }[] = []
  const ids = new Set<string>(),
    addresses = new Map<string, string>(),
    phones = new Map<string, string>()
  for (const row of rows) {
    const add = (kind: string, detail: string) =>
      issues.push({ id: String(row.id), name: row.name || '', kind, detail })
    if (ids.has(String(row.id))) add('重複ID', '需核對來源紀錄，不自動合併')
    ids.add(String(row.id))
    const addressKey = normalizeHospitalQuery(`${row.name || ''}|${row.address || ''}`).replace(
      /\s/g,
      ''
    )
    if (addresses.has(addressKey)) add('院名與地址重複', `另一筆：${addresses.get(addressKey)}`)
    addresses.set(addressKey, String(row.id))
    const phone = hospitalPhone(row.phone).number.replace(/\D/g, '')
    if (!phone) add('電話缺漏', '需向院所官方資訊核對')
    else if (phones.has(phone))
      add('共用電話待核對', `另一筆：${phones.get(phone)}；可能為合法共用總機`)
    if (phone) phones.set(phone, String(row.id))
    if (!preciseMapHospitals([row]).length) add('座標缺漏或異常', '不補虛構座標，需核對真實位置')
    else {
      const county = MAP_COUNTIES.find(
        (c) => normalizeHospitalQuery(c.name) === normalizeHospitalQuery(row.city)
      )
      if (
        county &&
        !isInsideCounty(projectTaiwanCoordinate(row.longitude!, row.latitude!), county.polygons)
      )
        add('縣市邊界待核對', '可能為邊界誤差、搬遷或座標錯誤，需人工確認')
    }
    const verified = hospitalVerifiedDate(row.verifiedAt)
    if (!verified) add('確認日期缺漏', '不宣稱已確認最新營業狀態')
    else if (now - new Date(`${verified}T00:00:00+08:00`).getTime() > 180 * 86400000)
      add('資料待複查', `確認日期：${verified}`)
  }
  return { total: rows.length, generatedAt: new Date(now).toISOString(), issues }
}
