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

it('LINE OAuth2 會員保留自己的穩定身分且不要求 email', () => {
  const user = {
    id: 'LINE-OAUTH-UUID',
    email: null,
    app_metadata: { provider: 'custom:line-oauth' },
    user_metadata: { name: '測試者' }
  }
  expect(hasAuctionProvider(user)).toBe(true)
  expect(memberFromSupabaseUser(user)).toMatchObject({
    type: 'line',
    id: 'LINE-OAUTH-UUID',
    authSource: 'supabase'
  })
})

it('管理入口只讀取 app_metadata，不接受使用者自己填的管理員欄位', () => {
  expect(
    memberFromSupabaseUser({ id: 'A', app_metadata: { provider: 'google', auction_admin: true } })
      .auctionAdmin
  ).toBe(true)
  expect(
    memberFromSupabaseUser({
      id: 'B',
      app_metadata: { provider: 'google' },
      user_metadata: { auction_admin: true }
    }).auctionAdmin
  ).toBe(false)
})

it('原本 email 帳號後來綁定 Google 或 LINE，前端與伺服器使用同一驗證供應商清單', () => {
  for (const [provider, type] of [
    ['google', 'google'],
    ['custom:line-oauth', 'line'],
    ['custom:line', 'line']
  ]) {
    const user = {
      id: 'LINKED',
      app_metadata: { provider: 'email', providers: ['email', provider] }
    }
    expect(hasAuctionProvider(user)).toBe(true)
    const member = memberFromSupabaseUser(user)
    expect(member.type).toBe(type)
    expect(isAuctionMember(member)).toBe(true)
  }
  const spoofed = {
    id: 'OTHER',
    app_metadata: { provider: 'email' },
    user_metadata: { providers: ['google'] }
  }
  expect(hasAuctionProvider(spoofed)).toBe(false)
  expect(isAuctionMember(memberFromSupabaseUser(spoofed))).toBe(false)
})
