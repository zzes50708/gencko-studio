import { createError, getRouterParam, readBody } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import { hasAuctionProvider } from '~/utils/member-auth'
import { randomUUID } from 'node:crypto'
import { validBidAmount, validBidReceipt } from '~/utils/auction-bid-contract.js'

const safeRpcMessages = new Set([
  '請先使用 LINE 登入後再出價',
  '競標出價僅限 LINE 帳號登入',
  '請先使用 Google 登入後再出價',
  '請先使用 Google 或 LINE 登入後再出價',
  '競標出價需使用 Google 或 LINE 帳號登入',
  '出價金額無效',
  '暱稱不可超過 15 個字',
  '此競標不存在或已結束',
  '此競標尚未開標',
  '出價必須至少為目前最低出價',
  '您的帳號已被限制出價功能。若有疑問請聯絡官方管理員。',
  '出價請求內容不一致，請重新整理後再試',
  '請先完成官方 LINE 聯絡驗證後再出價'
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

  if (
    authError &&
    (Number(authError.status) >= 500 || authError.name === 'AuthRetryableFetchError')
  ) {
    throw createError({
      statusCode: 503,
      message: '登入驗證服務暫時無法連線，請稍後再試',
      data: { outcome: 'not_submitted' }
    })
  }
  if (authError || !user) {
    throw createError({
      statusCode: 401,
      message: '請先使用 LINE 登入後再出價',
      data: { outcome: 'not_submitted' }
    })
  }
  if (!hasAuctionProvider(user)) {
    throw createError({
      statusCode: 403,
      message: '競標出價僅限 LINE 帳號登入',
      data: { outcome: 'not_submitted' }
    })
  }

  const body = await readBody(event)
  const amount = body?.amount
  const nickname = typeof body?.nickname === 'string' ? body.nickname.trim() : null

  if (!validBidAmount(amount)) {
    throw createError({
      statusCode: 400,
      message: '請輸入有效的正整數金額',
      data: { outcome: 'not_submitted' }
    })
  }
  if (nickname && [...nickname].length > 15) {
    throw createError({ statusCode: 400, message: '暱稱不可超過 15 個字' })
  }

  // 舊版頁面沒有請求編號時仍可送出；新版重試必須沿用原編號。
  const requestId = body?.requestId ?? randomUUID()
  if (
    typeof requestId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)
  ) {
    throw createError({
      statusCode: 400,
      message: '出價請求編號無效',
      data: { outcome: 'not_submitted' }
    })
  }
  const { data, error } = await supabase.rpc('submit_auction_bid', {
    p_request_id: requestId,
    p_auction_id: auctionId,
    p_amount: amount,
    p_nickname: nickname
  })

  if (error) {
    console.error('[auction bid] RPC failed:', error.message)
    if (error.code === '22003') {
      throw createError({
        statusCode: 400,
        message: '金額或加價幅度超出可接受範圍，請調整金額',
        data: { outcome: 'rejected' }
      })
    }
    const statusMessage = safeRpcMessages.has(error.message)
      ? error.message
      : '目前無法完成出價，請稍後再試。'
    const definite = safeRpcMessages.has(error.message)
    throw createError({
      statusCode: definite ? 400 : 503,
      message: definite ? statusMessage : '出價結果尚待確認，請重試同一筆出價',
      data: { outcome: definite ? 'rejected' : 'unknown' }
    })
  }

  if (!validBidReceipt(data, auctionId, amount)) {
    throw createError({
      statusCode: 503,
      message: '出價回執不完整，請重試同一筆出價',
      data: { outcome: 'unknown' }
    })
  }
  return data
})
