import { sanitizeMonitoringEvent } from '~/utils/site-monitoring'

const buckets = new Map<string, { expires: number; count: number }>()
export default defineEventHandler(async (event) => {
  const origin = getHeader(event, 'origin')
  if (origin && origin !== getRequestURL(event).origin) throw createError({ statusCode: 403 })
  if (Number(getHeader(event, 'content-length')) > 8192) throw createError({ statusCode: 413 })
  const now = Date.now()
  const key = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  let bucket = buckets.get(key)
  if (!bucket || bucket.expires <= now) {
    bucket = { expires: now + 60000, count: 0 }
    if (buckets.size >= 1000)
      for (const [address, value] of buckets) {
        if (value.expires <= now || buckets.size >= 1000) buckets.delete(address)
        if (buckets.size < 900) break
      }
    buckets.set(key, bucket)
  }
  if (++bucket.count > 12) throw createError({ statusCode: 429 })
  const raw = await readRawBody(event)
  if (!raw || raw.length > 8192) throw createError({ statusCode: 400 })
  let body
  try {
    body = JSON.parse(raw)
  } catch {
    throw createError({ statusCode: 400 })
  }
  if (!Array.isArray(body?.events) || body.events.length > 10)
    throw createError({ statusCode: 400 })
  const events = body.events.map(sanitizeMonitoringEvent).filter(Boolean)
  // 不記錄 IP、會員、網址參數、錯誤原文或權杖；只留下診斷分類與效能數值。
  if (events.length) console.info('[site-health]', JSON.stringify({ events }))
  setHeader(event, 'Cache-Control', 'no-store')
  setResponseStatus(event, 204)
  return null
})
