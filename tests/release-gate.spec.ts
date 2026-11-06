import { describe, expect, it } from 'vitest'
import { releaseRunState } from '../utils/release-gate.mjs'
const run = {
  id: 1,
  head_sha: 'abc',
  event: 'push',
  head_branch: 'main',
  head_repository: { full_name: 'zzes50708/gencko-studio' },
  path: '.github/workflows/release-validation.yml',
  status: 'completed',
  conclusion: 'success'
}
describe('正式發布檢查', () => {
  it('不能用其他版本、分支、專案或 PR 的通過結果放行', () => {
    expect(releaseRunState([run], 'abc')).toBe('passed')
    for (const change of [
      { head_sha: 'old' },
      { head_branch: 'preview' },
      { event: 'pull_request' },
      { head_repository: { full_name: 'someone/fork' } },
      { path: 'different.yml' }
    ])
      expect(releaseRunState([{ ...run, ...change }], 'abc')).toBe('pending')
  })
  it('重新執行失敗或尚在執行時不沿用舊成功結果', () => {
    expect(releaseRunState([run, { ...run, id: 2, conclusion: 'failure' }], 'abc')).toBe('failed')
    expect(releaseRunState([run, { ...run, id: 2, status: 'in_progress' }], 'abc')).toBe('pending')
  })
})
