import { createError, getRouterParam, readBody } from 'h3'
import { serverSupabaseClient } from '#supabase/server'

const safeRpcMessages = new Set([
  '請先使用 Google 登入後再出價',
  '出價金額無效',
  '暱稱不可超過 15 個字',
  '此競標不存在或已結束',
  '出價必須至少為目前最低出價',
  '您的帳號已被限制出價功能。若有疑問請聯絡官方管理員。'
])

export default defineEventHandler(async (event) => {
  const auctionId = getRouterParam(event, 'id')
  if (!auctionId || !/^[A-Za-z0-9_-]+$/.test(auctionId)) {
    throw createError({ statusCode: 400, message: '競標編號無效' })
  }

  const supabase = await serverSupabaseClient(event)
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw createError({ statusCode: 401, message: '請先使用 Google 登入後再出價' })
  }

  const body = await readBody(event)
  const amount = Number(body?.amount)
  const nickname = typeof body?.nickname === 'string' ? body.nickname.trim() : null

  if (!Number.isInteger(amount) || amount <= 0) {
    throw createError({ statusCode: 400, message: '出價金額無效' })
  }
  if (nickname && [...nickname].length > 15) {
    throw createError({ statusCode: 400, message: '暱稱不可超過 15 個字' })
  }

  const { data, error } = await supabase.rpc('place_auction_bid', {
    p_auction_id: auctionId,
    p_amount: amount,
    p_nickname: nickname
  })

  if (error) {
    console.error('[auction bid] RPC failed:', error.message)
    const statusMessage = safeRpcMessages.has(error.message)
      ? error.message
      : '目前無法完成出價，請稍後再試。'
    throw createError({ statusCode: 400, message: statusMessage })
  }

  return data
})
