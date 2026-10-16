import { it, expect } from 'vitest'
import {
  hasAuctionProvider,
  memberFromSupabaseUser,
  isAuctionMember,
  memberOwnerKeys
} from '../utils/member-auth'

it('伺服器僅接受已驗證使用者的 Google／LINE app_metadata，不信任 user_metadata', () => {
  expect(hasAuctionProvider({ app_metadata: { provider: 'custom:line' } })).toBe(true)
  expect(hasAuctionProvider({ app_metadata: { provider: 'google' } })).toBe(true)
  expect(
    hasAuctionProvider({
      app_metadata: { provider: 'email' },
      user_metadata: { provider: 'custom:line' }
    })
  ).toBe(false)
})

it('LINE 沒有 email 仍能建立不冒充 Google 的會員狀態', () => {
  const member = memberFromSupabaseUser({
    id: 'LINE-UUID',
    email: null,
    app_metadata: { provider: 'custom:line' },
    user_metadata: { name: '測試LINE' }
  })
  expect(member).toMatchObject({
    id: 'LINE-UUID',
    type: 'line',
    email: null,
    name: '測試LINE',
    authSource: 'supabase'
  })
  expect(isAuctionMember(member)).toBe(true)
  expect(memberOwnerKeys(member)).toEqual(['LINE-UUID'])
})

it('僅有舊 LIFF／localStorage 個人資料不算競標驗證，不能誤認另一個無email會員', () => {
  expect(isAuctionMember({ type: 'line', name: '舊登入' })).toBe(false)
  expect(memberOwnerKeys({ id: 'A', email: null })).not.toEqual(
    memberOwnerKeys({ id: 'B', email: null })
  )
  expect(memberOwnerKeys({ id: 'GOOGLE-UUID', email: 'test@example.invalid' })).toEqual([
    'GOOGLE-UUID',
    'test@example.invalid'
  ])
})
