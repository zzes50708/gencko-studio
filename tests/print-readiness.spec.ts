import { afterEach, describe, expect, it, vi } from 'vitest'
import { waitForPrintReady } from '../utils/print-readiness'
describe('證書列印準備', () => {
  it('已移除的失敗照片不能阻擋「暫無照片」證書列印', async () => {
    vi.useFakeTimers()
    const removed = { complete: true, naturalWidth: 0, isConnected: false } as HTMLImageElement
    const result = waitForPrintReady(
      () => removed,
      Promise.resolve(),
      new AbortController().signal,
      100
    )
    await vi.advanceTimersByTimeAsync(100)
    expect(await result).toBe(true)
  })
  afterEach(() => vi.useRealTimers())
  it('必須等照片與字型，原圖備援載入後才就緒', async () => {
    vi.useFakeTimers()
    let complete = false
    let fontReady: () => void = () => {}
    const fonts = new Promise<void>((resolve) => {
      fontReady = resolve
    })
    const image = {
      get complete() {
        return complete
      },
      get naturalWidth() {
        return complete ? 800 : 0
      }
    } as HTMLImageElement
    const ready = vi.fn()
    const result = waitForPrintReady(() => image, fonts, new AbortController().signal).then(ready)
    complete = true
    await vi.advanceTimersByTimeAsync(100)
    expect(ready).not.toHaveBeenCalled()
    fontReady()
    await vi.advanceTimersByTimeAsync(50)
    await result
    expect(ready).toHaveBeenCalledWith(true)
  })
  it('照片逾時或離開頁面時不啟動列印', async () => {
    vi.useFakeTimers()
    const image = { complete: false, naturalWidth: 0 } as HTMLImageElement
    const control = new AbortController()
    const result = waitForPrintReady(() => image, Promise.resolve(), control.signal, 100)
    await vi.advanceTimersByTimeAsync(100)
    expect(await result).toBe(false)
    control.abort()
    expect(await waitForPrintReady(() => null, Promise.resolve(), control.signal)).toBe(false)
  })
})
