import { createError, getHeader, getRequestURL, getCookie, setHeader, type H3Event } from 'h3'

export function returnSecretFor(event: H3Event, flow: string) {
  const stored = getCookie(event, 'gencko_line_return')?.split('.')
  return stored?.[0] === flow && /^[\da-f]{64}$/.test(stored[1] || '') ? stored[1] : undefined
}

export function privateLoginResponse(event: H3Event) {
  setHeader(event, 'Cache-Control', 'private, no-store, max-age=0')
  setHeader(event, 'Referrer-Policy', 'no-referrer')
  setHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
}

export async function relayRequest(event: H3Event, body: Record<string, unknown>) {
  const config = useRuntimeConfig(event)
  const url = config.public.supabase?.url || config.supabaseUrl
  const key = config.public.supabase?.key
  if (!url || !key) throw createError({ statusCode: 503, statusMessage: 'LINE 登入暫時無法使用' })
  try {
    return (await $fetch(`${url}/functions/v1/line-login-relay`, {
      method: 'POST',
      body,
      timeout: 10000,
      retry: 0,
      headers: {
        apikey: key,
        'x-forwarded-for': getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
      }
    })) as { status: string; code?: string }
  } catch {
    // 不把供應商請求、回應或授權碼附加至錯誤訊息與伺服器紀錄。
    throw createError({ statusCode: 503, statusMessage: 'LINE 登入暫時無法使用' })
  }
}

export function requireSameOrigin(event: H3Event) {
  const origin = getHeader(event, 'origin')
  if (!origin || origin !== getRequestURL(event).origin)
    throw createError({ statusCode: 403, statusMessage: 'INVALID_ORIGIN' })
}
