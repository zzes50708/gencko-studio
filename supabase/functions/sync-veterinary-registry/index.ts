import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  mapMoaRegistryRow,
  matchHospitalToRegistry,
  MOA_REGISTRY_SOURCE,
  type HospitalForMatching,
  type MoaRegistrySourceRow
} from '../_shared/veterinary-registry.ts'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  })

const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (request) => {
  const expectedSecret = Deno.env.get('HOSPITAL_SYNC_SECRET')
  if (!expectedSecret) return jsonResponse({ error: '同步密鑰尚未設定' }, 503)
  if (request.headers.get('x-sync-secret') !== expectedSecret) {
    return jsonResponse({ error: '未授權' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Supabase 服務環境變數不完整' }, 503)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const startedAt = new Date().toISOString()
  let runId: number | null = null

  try {
    const { data: run, error: runError } = await supabase
      .from('hospital_sync_runs')
      .insert({ source: MOA_REGISTRY_SOURCE, status: 'running', started_at: startedAt })
      .select('id')
      .single()
    if (runError) throw runError
    runId = run.id

    const response = await fetch(MOA_REGISTRY_SOURCE, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(45_000)
    })
    if (!response.ok) throw new Error(`農業部資料回應 ${response.status}`)

    const rawText = await response.text()
    const payload = JSON.parse(rawText) as unknown
    if (!Array.isArray(payload)) throw new Error('農業部資料格式不是陣列')

    const registry = (payload as MoaRegistrySourceRow[])
      .map((row) => mapMoaRegistryRow(row, startedAt))
      .filter((row): row is NonNullable<typeof row> => row !== null)
    if (registry.length === 0) throw new Error('農業部資料沒有可匯入的有效紀錄')

    for (let index = 0; index < registry.length; index += 500) {
      const { error } = await supabase
        .from('veterinary_registry')
        .upsert(registry.slice(index, index + 500), { onConflict: 'license_no' })
      if (error) throw error
    }

    const { error: staleError } = await supabase
      .from('veterinary_registry')
      .update({ is_current: false, updated_at: startedAt })
      .lt('last_seen_at', startedAt)
    if (staleError) throw staleError

    const { data: hospitals, error: hospitalError } = await supabase
      .from('hospitals')
      .select('id, name, address, phone, official_license_no')
    if (hospitalError) throw hospitalError

    let matchedCount = 0
    let ambiguousCount = 0
    let unmatchedCount = 0
    const claimedLicenses = new Set<string>()

    for (const hospital of (hospitals ?? []) as HospitalForMatching[]) {
      let match = matchHospitalToRegistry(hospital, registry)
      if (match.record && claimedLicenses.has(match.record.license_no)) {
        match = { status: 'ambiguous', record: null, method: null }
      }
      if (match.record) claimedLicenses.add(match.record.license_no)
      if (match.status === 'matched') matchedCount += 1
      if (match.status === 'ambiguous') ambiguousCount += 1
      if (match.status === 'unmatched') unmatchedCount += 1

      const update = {
        official_license_no: match.record?.license_no ?? null,
        official_match_status: match.status,
        official_match_method: match.method,
        official_status: match.record?.official_status ?? null,
        official_checked_at: startedAt
      }
      const { error } = await supabase.from('hospitals').update(update).eq('id', hospital.id)
      if (error) throw error
    }

    const completedAt = new Date().toISOString()
    const summary = {
      fetched: payload.length,
      upserted: registry.length,
      matched: matchedCount,
      ambiguous: ambiguousCount,
      unmatched: unmatchedCount,
      completedAt
    }
    const { error: completeError } = await supabase
      .from('hospital_sync_runs')
      .update({
        completed_at: completedAt,
        status: 'completed',
        fetched_count: payload.length,
        upserted_count: registry.length,
        matched_count: matchedCount,
        ambiguous_count: ambiguousCount,
        unmatched_count: unmatchedCount,
        payload_hash: await sha256(rawText)
      })
      .eq('id', runId)
    if (completeError) throw completeError

    return jsonResponse(summary)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (runId !== null) {
      await supabase
        .from('hospital_sync_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: message
        })
        .eq('id', runId)
    }
    console.error('[sync-veterinary-registry]', error)
    return jsonResponse({ error: message }, 500)
  }
})
