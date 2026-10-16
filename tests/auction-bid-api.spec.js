import { it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'

it('實際 H3 API 拒絕無效金額、分類登入與資料庫故障，且不誤報空回執成功', () => {
  const result = execFileSync(process.execPath, ['scripts/verify-auction-bid-api.mjs'], {
    encoding: 'utf8'
  })
  expect(result).toContain('競標 API 十五項故障回歸通過')
}, 30000)
