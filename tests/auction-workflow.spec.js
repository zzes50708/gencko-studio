import { expect, it } from 'vitest'
import {
  paymentDeadline,
  notificationText,
  parseLinkCode,
  parseWinnerClaimCode,
  retryNotification,
  verifyLineSignature
} from '../supabase/functions/_shared/auction-workflow'

it('只有 LINE 受理的通知才開始 24 小時期限', () => {
  expect(paymentDeadline('sent', '2026-10-16T00:00:00Z')).toBe('2026-10-17T00:00:00.000Z')
  expect(paymentDeadline('failed', '2026-10-16T00:00:00Z')).toBe(null)
})
it('綁定碼必須完整符合格式，不能用普通聊天文字或會員編號冒充', () => {
  expect(parseLinkCode('競標綁定 ' + 'a'.repeat(36))).toBe('a'.repeat(36))
  expect(parseLinkCode('會員編號：abc')).toBe(null)
  expect(parseLinkCode('競標綁定 ' + 'a'.repeat(36) + ' 額外內容')).toBe(null)
})
it('通知逾 24 小時或永久錯誤不自動重送，LINE 409 已受理視為成功', () => {
  expect(retryNotification(409, 1, 1000)).toBe('sent')
  expect(retryNotification(429, 1, 1000)).toBe('retry')
  expect(retryNotification(400, 1, 1000)).toBe('failed')
  expect(retryNotification(503, 6, 1000)).toBe('failed')
  expect(retryNotification(503, 1, 86400001)).toBe('failed')
})
it('得標通知含場次、正確成交金額及聯絡要求，不能替客人擅自付款', () => {
  const message = notificationText({ auction_id: 'TEST', morph: '測試', amount: 500 })
  expect(message).toContain('TEST')
  expect(message).toContain('500')
  expect(message).toContain('24 小時')
})
it('指定非販售測試通知必須明確提醒不要付款', () => {
  expect(
    notificationText({ auction_id: 'TEST-AUCTION-20261016-01', morph: '測試', amount: 700 })
  ).toContain('非販售測試，請勿付款')
})
it('領標訊息只認完整獨立的驗證碼行，不接受截斷或附加內容', () => {
  const code = 'a'.repeat(36)
  expect(parseWinnerClaimCode(`得標確認\n領標驗證：${code}\n場次：TEST`)).toBe(code)
  expect(parseWinnerClaimCode(`領標驗證：${code}X`)).toBe(null)
  expect(parseWinnerClaimCode(`領標驗證：${code.slice(1)}`)).toBe(null)
})
it('Webhook 驗證原始本文簽章；錯誤密鑰、本文及空簽章均拒絕', async () => {
  const raw = '{"events":[]}'
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('test-secret'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)))
  const signature = btoa(String.fromCharCode(...bytes))
  expect(await verifyLineSignature(raw, signature, 'test-secret')).toBe(true)
  expect(await verifyLineSignature(raw + ' ', signature, 'test-secret')).toBe(false)
  expect(await verifyLineSignature(raw, signature, 'wrong-secret')).toBe(false)
  expect(await verifyLineSignature(raw, '', 'test-secret')).toBe(false)
})
