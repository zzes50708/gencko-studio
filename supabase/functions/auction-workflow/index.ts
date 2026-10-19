import { createClient } from '@supabase/supabase-js'
import { notificationText, parseLinkCode, parseWinnerClaimCode, retryNotification, verifyLineSignature } from '../_shared/auction-workflow.ts'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: {'content-type':'application/json','cache-control':'no-store'}
})
const config = () => ({
  url: Deno.env.get('SUPABASE_URL') || '', key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  channelId: Deno.env.get('AUCTION_LINE_CHANNEL_ID') || '',
  secret: Deno.env.get('AUCTION_LINE_CHANNEL_SECRET') || '',
  workerSecret: Deno.env.get('AUCTION_WORKER_SECRET') || ''
})
let tokenCache: { value: string; expires: number } | null = null
async function lineAccessToken(channelId: string, secret: string) {
  if (tokenCache && tokenCache.expires > Date.now() + 60000) return tokenCache.value
  const response = await fetch('https://api.line.me/v2/oauth/accessToken', {
    method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'client_credentials',client_id:channelId,client_secret:secret}),
    signal:AbortSignal.timeout(8000)
  })
  if (!response.ok) throw new Error('LINE_AUTH_UNAVAILABLE')
  const data = await response.json()
  if (!data.access_token || !Number.isFinite(data.expires_in)) throw new Error('LINE_AUTH_INVALID')
  tokenCache = {value:data.access_token,expires:Date.now()+data.expires_in*1000}
  return tokenCache.value
}

// 不記錄原始聊天內容、LINE 憑證、綁定碼或客人識別資料。
Deno.serve(async req => {
  if (req.method !== 'POST') return json({error:'METHOD_NOT_ALLOWED'},405)
  const env = config()
  if (!env.url || !env.key) return json({error:'SERVER_NOT_CONFIGURED'},503)
  const client = createClient(env.url,env.key,{auth:{persistSession:false,autoRefreshToken:false}})
  const webhook = new URL(req.url).pathname.endsWith('/line-webhook')
  try {
    if (webhook) {
      if (!env.secret) return json({error:'LINE_NOT_CONFIGURED'},503)
      const raw = await req.text()
      if (raw.length > 262144) return json({error:'PAYLOAD_TOO_LARGE'},413)
      if (!await verifyLineSignature(raw,req.headers.get('x-line-signature') || '',env.secret))
        return json({error:'INVALID_SIGNATURE'},401)
      const payload = JSON.parse(raw)
      if (!Array.isArray(payload.events) || payload.events.length > 100) return json({error:'INVALID_EVENTS'},400)
      for (const event of payload.events) {
        // 只接受一對一官方帳號事件，群組訊息不參與競標身分綁定。
        if (event.source?.type !== 'user' || !/^U[0-9a-f]{32}$/i.test(event.source?.userId || '')) continue
        if (!['follow','unfollow','message'].includes(event.type)) continue
        const code = event.message?.type === 'text' ? parseLinkCode(event.message.text || '') || parseWinnerClaimCode(event.message.text || '') : null
        let name: string | null = null
        if (code && env.channelId) {
          const accessToken = await lineAccessToken(env.channelId,env.secret)
          const profile = await fetch(`https://api.line.me/v2/bot/profile/${event.source.userId}`,{
            headers:{authorization:`Bearer ${accessToken}`},signal:AbortSignal.timeout(8000)
          })
          if (profile.ok) name = (await profile.json()).displayName || null
        }
        if (!event.webhookEventId || !Number.isFinite(event.timestamp)) continue
        const {error} = await client.rpc('record_auction_line_event',{
          p_event_id:event.webhookEventId,p_line_id:event.source.userId,p_kind:event.type,
          p_at:new Date(event.timestamp).toISOString(),p_code:code,p_name:name
        })
        if (error) throw new Error('WEBHOOK_STORAGE_FAILED')
      }
      return json({received:true})
    }
    if (!env.workerSecret || req.headers.get('x-auction-worker-secret') !== env.workerSecret)
      return json({error:'UNAUTHORIZED'},401)
    if (!env.channelId || !env.secret) return json({error:'LINE_NOT_CONFIGURED'},503)
    const {data:processed,error:processError} = await client.rpc('process_auction_workflow')
    if (processError) throw new Error('SETTLEMENT_FAILED')
    const accessToken = await lineAccessToken(env.channelId,env.secret)
    const {data:messages,error:claimError} = await client.rpc('claim_auction_notifications')
    if (claimError) throw new Error('NOTIFICATION_CLAIM_FAILED')
    let sent = 0
    for (const message of messages || []) {
      let status = 0
      let requestId: string | null = null
      try {
        const response = await fetch('https://api.line.me/v2/bot/message/push',{
          method:'POST',headers:{authorization:`Bearer ${accessToken}`,'content-type':'application/json','x-line-retry-key':message.retry_key},
          body:JSON.stringify({to:message.line_user_id,messages:[{type:'text',text:notificationText(message)}]}),
          signal:AbortSignal.timeout(8000)
        })
        status = response.status
        requestId = response.headers.get('x-line-request-id')
        // 409 只有帶原受理請求編號，才視為相同 retry key 已成功送達 LINE API。
        if (status === 409) {
          requestId = response.headers.get('x-line-accepted-request-id')
          if (!requestId) status = 400
        }
        if (status === 401) tokenCache = null
      } catch { status = 0 }
      const result = retryNotification(status,message.attempts,Date.now()-Date.parse(message.created_at))
      const {error} = await client.rpc('finish_auction_notification',{
        p_id:message.id,p_claim:message.claim_token,p_result:result,
        p_error:result==='sent'?null:`LINE_HTTP_${status}`,p_request_id:requestId
      })
      if (error) throw new Error('NOTIFICATION_RECEIPT_FAILED')
      if (result==='sent') sent++
    }
    return json({processed,notifications_accepted:sent})
  } catch (error) {
    // 僅輸出固定錯誤分類，避免第三方回應洩漏任何會員／秘密資料。
    const allowed = ['LINE_AUTH_UNAVAILABLE','LINE_AUTH_INVALID','WEBHOOK_STORAGE_FAILED','SETTLEMENT_FAILED','NOTIFICATION_CLAIM_FAILED','NOTIFICATION_RECEIPT_FAILED']
    const code = error instanceof Error && allowed.includes(error.message) ? error.message : 'WORKFLOW_UNAVAILABLE'
    console.error(`[auction-workflow] ${code}`)
    return json({error:code},503)
  }
})
