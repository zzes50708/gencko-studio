import { describe, expect, it } from 'vitest'
import { contentResponseState } from '../utils/content-response'
import { sourceSegments } from '../utils/source-links'

describe('公開詳情的回應與索引', () => {
  it('不存在才回傳404，連線失敗回傳503且不索引', () => {
    expect(contentResponseState(false, null, null)).toEqual({
      status: 404,
      robots: 'noindex, nofollow'
    })
    expect(contentResponseState(false, null, new Error('離線'))).toEqual({
      status: 503,
      robots: 'noindex, nofollow'
    })
    expect(contentResponseState(false, { id: 'A' }, null).status).toBe(200)
    expect(contentResponseState(false, { id: 'A' }, null).robots).toContain('index, follow')
  })
  it('重試成功可以恢復正常索引，不保留舊錯誤', () => {
    expect(contentResponseState(true, null, null).status).toBe(200)
    expect(contentResponseState(true, null, null).robots).toBe('noindex, nofollow')
    expect(contentResponseState(false, { id: 'A' }, null).status).toBe(200)
  })
})
describe('基因參考來源', () => {
  it('保留來源名稱與多條可點擊網址', () => {
    const source = '來源甲 https://example.com/a 來源乙 https://example.org/b。'
    const parts = sourceSegments(source)
    expect(parts.filter((p) => p.href).map((p) => p.href)).toEqual([
      'https://example.com/a',
      'https://example.org/b'
    ])
    expect(parts.map((p) => p.text).join('')).toBe(source)
  })
  it('沒有把HTML或javascript文字變成可執行連結', () => {
    expect(sourceSegments('javascript:alert(1) <script>測試</script>').some((p) => p.href)).toBe(
      false
    )
    expect(sourceSegments('')).toEqual([])
    expect(sourceSegments('https://example.com/x?foo=1&bar=2')[0].href).toBe(
      'https://example.com/x?foo=1&bar=2'
    )
  })
})
