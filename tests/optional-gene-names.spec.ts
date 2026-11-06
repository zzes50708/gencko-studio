import { afterEach, describe, expect, it, vi } from 'vitest'
import { readOptionalGeneNames } from '../utils/optional-gene-names'
describe('文章的輔助基因連結', () => {
  afterEach(() => vi.useRealTimers())
  it('只讀公開介面的有效名稱', async () => {
    const from = vi.fn(() => ({
      select: () => ({
        abortSignal: () => Promise.resolve({ data: [{ name: 'WY' }, { name: '' }], error: null })
      })
    }))
    expect(await readOptionalGeneNames({ from })).toEqual(['WY'])
    expect(from).toHaveBeenCalledWith('site_public_genetic_pages')
  })
  it('SDK 或查詢卡住時，取消請求並準時回傳空名單，正文可繼續顯示', async () => {
    vi.useFakeTimers()
    let signal: AbortSignal | undefined
    const result = readOptionalGeneNames({
      from: () => ({
        select: () => ({
          abortSignal: (value: AbortSignal) => {
            signal = value
            return new Promise(() => {})
          }
        })
      })
    })
    await vi.advanceTimersByTimeAsync(1000)
    expect(await result).toEqual([])
    expect(signal?.aborted).toBe(true)
  })
})
