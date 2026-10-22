import { privateLoginResponse, relayRequest } from '~/server/utils/line-login-relay'
import { randomBytes, createHash } from 'node:crypto'

export default defineEventHandler(async (event) => {
  privateLoginResponse(event)
  const query = getQuery(event)
  const flow = typeof query.flow === 'string' && /^[\da-f-]{36}$/.test(query.flow) ? query.flow : ''
  let status = 'failed'
  if (flow) {
    try {
      if (typeof query.code === 'string' && !query.error) {
        const returnSecret = randomBytes(32).toString('hex')
        const returnExpiresAt = Date.now() + 4 * 60 * 1000
        status = (
          await relayRequest(event, {
            action: 'complete',
            flow,
            code: query.code,
            returnProof: createHash('sha256').update(returnSecret).digest('hex')
          })
        ).status
        if (status === 'ready')
          setCookie(event, 'gencko_line_return', `${flow}.${returnSecret}.${returnExpiresAt}`, {
            httpOnly: true,
            secure: getRequestURL(event).protocol === 'https:',
            sameSite: 'lax',
            path: '/api/auth/line',
            maxAge: Math.max(0, Math.floor((returnExpiresAt - Date.now()) / 1000)),
            expires: new Date(returnExpiresAt)
          })
      } else {
        await relayRequest(event, { action: 'fail', flow })
      }
    } catch {
      status = 'unavailable'
    }
  }
  // 在伺服器完成短效碼轉交並清理網址，避免瀏覽器套件在錯誤的儲存區交換。
  return sendRedirect(
    event,
    `/line-login-return?flow=${encodeURIComponent(flow)}&status=${encodeURIComponent(status)}`,
    303
  )
})
