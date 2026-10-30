import {
  mapMoaRegistryRow,
  matchHospitalToRegistry,
  normalizeRegistryText,
  normalizePhone
} from '../supabase/functions/_shared/veterinary-registry'
import { describe, expect, it } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { auditHospitalDirectory } from '../utils/hospitalDirectoryAudit'

describe('公開院所資料稽核', () => {
  it('只標記待核對資料，不合併分院或補上虛構資料', () => {
    const rows = [
      { id: 'a', name: '測試院所', city: '台北市', address: '測試路', phone: null },
      { id: 'a', name: '測試院所', city: '台北市', address: '測試路', phone: null }
    ]
    const before = JSON.stringify(rows)
    const result = auditHospitalDirectory(rows)
    expect(result.issues.some((i) => i.kind === '重複ID')).toBe(true)
    expect(result.issues.some((i) => i.kind === '座標缺漏或異常')).toBe(true)
    expect(JSON.stringify(rows)).toBe(before)
  })
  if (process.env.HOSPITAL_AUDIT_INPUT)
    it('產出本次網站公開名錄的只讀稽核', () => {
      const rows = JSON.parse(
        readFileSync(process.env.HOSPITAL_AUDIT_INPUT!, 'utf8').replace(/^\uFEFF/, '')
      )
      expect(Array.isArray(rows)).toBe(true)
      const result = auditHospitalDirectory(rows)
      writeFileSync('output/hospital-50-directory-audit.json', JSON.stringify(result, null, 2))
      console.log(
        JSON.stringify({
          total: result.total,
          byKind: Object.fromEntries(
            [...new Set(result.issues.map((i) => i.kind))].map((kind) => [
              kind,
              result.issues.filter((i) => i.kind === kind).length
            ])
          )
        })
      )
    })
})

if (process.env.HOSPITAL_REGISTRY_INPUT)
  it('與農業部公開登記進行只讀比對，不自動停用未配對院所', () => {
    const source = JSON.parse(
      readFileSync(process.env.HOSPITAL_REGISTRY_INPUT!, 'utf8').replace(/^\uFEFF/, '')
    )
    const rows = JSON.parse(
      readFileSync('output/hospital-50-public-directory.json', 'utf8').replace(/^\uFEFF/, '')
    )
    const fetchedAt = new Date().toISOString()
    const registry = source.map((row) => mapMoaRegistryRow(row, fetchedAt)).filter(Boolean)
    const matches = rows.map((row) => {
      const match = matchHospitalToRegistry(row, registry)
      return {
        id: row.id,
        name: row.name,
        currentAddress: row.address,
        currentPhone: row.phone,
        officialAddress: match.record?.address,
        officialPhone: match.record?.phone,
        status: match.status,
        method: match.method,
        officialName: match.record?.institution_name,
        officialStatus: match.record?.official_status,
        addressDiffers: match.record
          ? normalizeRegistryText(row.address) !== normalizeRegistryText(match.record.address)
          : null,
        phoneDiffers: match.record
          ? normalizePhone(row.phone) !== normalizePhone(match.record.phone)
          : null
      }
    })
    const summary = {
      checkedAt: fetchedAt,
      source: 'https://data.moa.gov.tw/Service/OpenData/DataFileService.aspx?UnitId=078',
      registryRecords: registry.length,
      total: rows.length,
      matched: matches.filter((m) => m.status === 'matched').length,
      unmatched: matches.filter((m) => m.status === 'unmatched').length,
      ambiguous: matches.filter((m) => m.status === 'ambiguous').length,
      addressDifferences: matches.filter((m) => m.addressDiffers).length,
      phoneDifferences: matches.filter((m) => m.phoneDiffers).length
    }
    writeFileSync(
      'output/hospital-50-official-comparison.json',
      JSON.stringify({ summary, matches }, null, 2)
    )
    console.log(JSON.stringify(summary))
    expect(matches.length).toBe(rows.length)
  })
