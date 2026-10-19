import { it, expect } from 'vitest'
import { getAuctionContactText, OFFICIAL_LINE_INBOX_URL } from '../utils/auction-contact'

it('聯絡資訊包含場次及穩定會員編號，不能只有可重複的暱稱', () => {
  const text = getAuctionContactText('TEST-01', 'MEMBER-01')
  expect(text).toContain('場次：TEST-01')
  expect(text).toContain('會員編號：MEMBER-01')
})
it('官方入口不得把登入使用者 ID 當成後台聊天路徑', () => {
  expect(OFFICIAL_LINE_INBOX_URL).toBe('https://chat.line.biz/account/@219abdzn')
  expect(OFFICIAL_LINE_INBOX_URL).not.toMatch(/\/chat\/U/)
})
