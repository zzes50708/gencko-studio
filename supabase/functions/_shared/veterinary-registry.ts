export const MOA_REGISTRY_SOURCE =
  'https://data.moa.gov.tw/Service/OpenData/DataFileService.aspx?UnitId=078'

export type MoaRegistrySourceRow = Record<string, unknown>

export interface RegistryRow {
  license_no: string
  county: string
  license_type: string | null
  official_status: string
  institution_name: string
  responsible_vet: string | null
  phone: string | null
  issued_on: string | null
  address: string
  source_dataset: string
  source_url: string
  source_fetched_at: string
  last_seen_at: string
  is_current: true
  updated_at: string
}

export interface HospitalForMatching {
  id: string
  name: string
  address: string
  phone?: string | null
  official_license_no?: string | null
}

export interface RegistryMatch {
  status: 'matched' | 'ambiguous' | 'unmatched'
  record: RegistryRow | null
  method: 'license' | 'name' | 'address' | 'phone' | null
}

const readText = (row: MoaRegistrySourceRow, key: string) => {
  const value = row[key]
  return typeof value === 'string' ? value.trim() : ''
}

export const normalizeRegistryText = (value: string | null | undefined) =>
  (value ?? '')
    .normalize('NFKC')
    .replaceAll('臺', '台')
    .toLowerCase()
    .replace(/[\s·‧・,，.。()（）\-－—_／/\\]/g, '')

export const normalizePhone = (value: string | null | undefined) => (value ?? '').replace(/\D/g, '')

export const parseMoaDate = (value: string | null | undefined) => {
  const digits = (value ?? '').replace(/\D/g, '')
  if (digits.length !== 8) return null
  const year = Number(digits.slice(0, 4))
  const month = Number(digits.slice(4, 6))
  const day = Number(digits.slice(6, 8))
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
}

export const mapMoaRegistryRow = (
  row: MoaRegistrySourceRow,
  fetchedAt: string
): RegistryRow | null => {
  const licenseNo = readText(row, '字號')
  const county = readText(row, '縣市')
  const status = readText(row, '狀態')
  const name = readText(row, '機構名稱')
  const address = readText(row, '機構地址')

  if (!licenseNo || !county || !status || !name || !address) return null

  return {
    license_no: licenseNo,
    county,
    license_type: readText(row, '執照類別') || null,
    official_status: status,
    institution_name: name,
    responsible_vet: readText(row, '負責獸醫') || null,
    phone: readText(row, '機構電話') || null,
    issued_on: parseMoaDate(readText(row, '發照日期')),
    address,
    source_dataset: '農業部獸醫師(佐)開業執照',
    source_url: 'https://data.moa.gov.tw/open_detail.aspx?id=078',
    source_fetched_at: fetchedAt,
    last_seen_at: fetchedAt,
    is_current: true,
    updated_at: fetchedAt
  }
}

export const matchHospitalToRegistry = (
  hospital: HospitalForMatching,
  registry: RegistryRow[]
): RegistryMatch => {
  if (hospital.official_license_no) {
    const byLicense = registry.find((record) => record.license_no === hospital.official_license_no)
    if (byLicense) return { status: 'matched', record: byLicense, method: 'license' }
  }

  const hospitalName = normalizeRegistryText(hospital.name)
  const hospitalAddress = normalizeRegistryText(hospital.address)
  const hospitalPhone = normalizePhone(hospital.phone)

  const scored = registry
    .map((record) => {
      const nameMatches = normalizeRegistryText(record.institution_name) === hospitalName
      const addressMatches =
        Boolean(hospitalAddress) && normalizeRegistryText(record.address) === hospitalAddress
      const phoneMatches = Boolean(hospitalPhone) && normalizePhone(record.phone) === hospitalPhone
      const score = Number(nameMatches) * 5 + Number(addressMatches) * 4 + Number(phoneMatches) * 3
      const method: RegistryMatch['method'] = nameMatches
        ? 'name'
        : addressMatches
          ? 'address'
          : phoneMatches
            ? 'phone'
            : null
      return { record, score, method }
    })
    .filter(({ score }) => score >= 3)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) {
    return { status: 'unmatched', record: null, method: null }
  }

  const best = scored[0]
  if (scored.length > 1 && scored[1].score === best.score) {
    return { status: 'ambiguous', record: null, method: null }
  }

  return { status: 'matched', record: best.record, method: best.method }
}
