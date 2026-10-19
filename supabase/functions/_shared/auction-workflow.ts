export const paymentDeadline = (state: string, sentAt: string): string | null =>
  state === 'sent' && Number.isFinite(Date.parse(sentAt))
    ? new Date(Date.parse(sentAt) + 86400000).toISOString() : null
export const parseLinkCode = (text: string): string | null =>
  /^競標綁定\s+([0-9a-f]{36})$/i.exec(text.trim())?.[1]?.toLowerCase() || null
export const parseWinnerClaimCode = (text: string): string | null =>
  /(?:^|\n)領標驗證：[ \t]*([0-9a-f]{36})(?:\r?\n|$)/i.exec(text)?.[1]?.toLowerCase() || null
export const retryNotification = (status: number, attempts: number, age: number) => {
  if ((status >= 200 && status < 300) || status === 409) return 'sent'
  if (attempts >= 6 || age >= 86400000) return 'failed'
  return status === 0 || status === 429 || status >= 500 ? 'retry' : 'failed'
}
export const notificationText = (outcome: {auction_id: string; morph?: string; amount: number}) =>
  outcome.auction_id === 'TEST-AUCTION-20261016-01'
  ? `【Gencko 競標流程驗證】\n非販售測試，請勿付款。\n場次：${outcome.auction_id}\n測試成交金額：NT$ ${outcome.amount.toLocaleString('zh-TW')}\n本次驗證結標、自動通知與 24 小時付款期限的系統流程，沒有實際交易；測試結束會解除測試造成的出價限制。\n可直接回覆本官方 LINE 聯絡工作室。`
  :
  `【Gencko 競標得標通知】\n場次：${outcome.auction_id}\n品系：${outcome.morph || '守宮'}\n成交金額：NT$ ${outcome.amount.toLocaleString('zh-TW')}\n請於本通知送出後 24 小時內完成付款，並至網站「我的專區」回報付款，或直接回覆本官方 LINE 聯絡工作室。\n若有正當理由請及時聯繫；棄標會限制網站出價，不會封鎖 LINE。\nhttps://www.genckobreeding.com/profile`
export const verifyLineSignature = async (raw: string, signature: string, secret: string) => {
  if (!signature || !secret) return false
  try {
    const bytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0))
    const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify'])
    return await crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(raw))
  } catch { return false }
}
