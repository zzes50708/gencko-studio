import {
  privateLoginResponse,
  relayRequest,
  requireSameOrigin,
  returnSecretFor
} from '~/server/utils/line-login-relay'

export default defineEventHandler(async (event) => {
  privateLoginResponse(event)
  requireSameOrigin(event)
  const body = await readBody(event)
  if (
    !body ||
    !['start', 'read', 'ack'].includes(body.action) ||
    typeof body.flow !== 'string' ||
    body.flow.length !== 36
  )
    throw createError({ statusCode: 400, statusMessage: 'INVALID_REQUEST' })
  return relayRequest(event, {
    action: body.action,
    flow: body.flow,
    proof: body.proof,
    secret: body.secret,
    returnSecret: body.returnSecret || returnSecretFor(event, body.flow)
  })
})
