const FLOW = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i
const SECRET = /^[\da-f]{64}$/

/** 舊版兩段 cookie 仍可接續；新版附上發起回程時的絕對期限。 */
export function parseLineReturnCookie(value, now = Date.now()) {
  const parts = String(value || '').split('.')
  if (![2, 3].includes(parts.length) || !FLOW.test(parts[0]) || !SECRET.test(parts[1])) return null
  const expiresAt = parts.length === 3 ? Number(parts[2]) : null
  if (parts.length === 3 && (!Number.isFinite(expiresAt) || expiresAt <= now)) return null
  return { flow: parts[0], secret: parts[1], expiresAt }
}

/** 以伺服器剩餘時間校準，兼顧手機休眠及裝置時鐘倒退。 */
export function createTransferDeadline(
  data,
  { wallNow = Date.now, monoNow = () => performance.now(), elapsedMs = 0 } = {}
) {
  const ttl =
    Number.isFinite(data?.expiresAt) && Number.isFinite(data?.serverTime)
      ? Math.max(0, Math.min(240000, data.expiresAt - data.serverTime) - Math.max(0, elapsedMs))
      : 0
  const wall = wallNow(),
    mono = monoNow()
  return { valid: () => ttl > Math.max(0, wallNow() - wall, monoNow() - mono) }
}
