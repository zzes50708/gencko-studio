import { expect, it } from 'vitest'
import { readOAuthFailure } from '../utils/line-login'
it('取消授權顯示固定說明並清除回程錯誤，保留篩選與一般錨點', () => {
  expect(
    readOAuthFailure(
      'https://example.invalid/auction/T?filter=open&error=access_denied&error_description=private#bids'
    )
  ).toEqual({
    url: 'https://example.invalid/auction/T?filter=open#bids',
    message: '你已取消登入，尚未完成新的登入；可以再次選擇登入。'
  })
})
it('fragment 錯誤與憑證不留在網址，不顯示供應商原始內容', () => {
  const result = readOAuthFailure(
    'https://example.invalid/profile#token_type=bearer&error=server_error&error_description=%3Cscript%3Eprivate%3C%2Fscript%3E&access_token=secret'
  )
  expect(result).toEqual({
    url: 'https://example.invalid/profile',
    message: '登入未完成，請重新登入；若持續失敗，請聯絡工作室。'
  })
  expect(JSON.stringify(result)).not.toMatch(/private|script|secret/)
})
it('一般頁面與成功回程不能清除交換中的 code 或憑證', () => {
  for (const url of [
    'https://example.invalid/profile#bids',
    'https://example.invalid/profile?code=active&state=state',
    'https://example.invalid/profile#access_token=active'
  ])
    expect(readOAuthFailure(url)).toBeNull()
})
