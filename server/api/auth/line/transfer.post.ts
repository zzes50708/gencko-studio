import {
  privateLoginResponse,
  requireSameOrigin,
  returnSecretFor
} from '~/server/utils/line-login-relay'

export default defineEventHandler(async (event) => {
  privateLoginResponse(event)
  requireSameOrigin(event)
  const { flow } = (await readBody(event)) || {}
  if (typeof flow !== 'string' || !/^[\da-f-]{36}$/.test(flow))
    throw createError({ statusCode: 400, statusMessage: 'INVALID_REQUEST' })
  const secret = returnSecretFor(event, flow)
  if (!secret) throw createError({ statusCode: 410, statusMessage: 'LOGIN_RETURN_EXPIRED' })
  return { transfer: `${flow}.${secret}` }
})
