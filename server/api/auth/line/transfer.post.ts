import {
  privateLoginResponse,
  requireSameOrigin,
  returnSecretFor
} from '~/server/utils/line-login-relay'
import { parseLineReturnCookie } from '~/utils/line-login-transfer'

export default defineEventHandler(async (event) => {
  privateLoginResponse(event)
  requireSameOrigin(event)
  const { flow } = (await readBody(event)) || {}
  if (typeof flow !== 'string' || !/^[\da-f-]{36}$/.test(flow))
    throw createError({ statusCode: 400, statusMessage: 'INVALID_REQUEST' })
  const secret = returnSecretFor(event, flow)
  if (!secret) throw createError({ statusCode: 410, statusMessage: 'LOGIN_RETURN_EXPIRED' })
  const serverTime = Date.now()
  const expiresAt = parseLineReturnCookie(
    getCookie(event, 'gencko_line_return'),
    serverTime
  )?.expiresAt
  // 舊回程 cookie 無期限欄位，僅給短暫顯示窗口，之後可再確認。
  return { transfer: `${flow}.${secret}`, serverTime, expiresAt: expiresAt ?? serverTime + 15000 }
})
