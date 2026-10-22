import { it, expect, vi, afterEach } from 'vitest'
import { createRequestDeadline } from '../utils/request-deadline'
afterEach(() => vi.useRealTimers())

it('即使 SDK 尚未送出請求，逾時仍會退出，且稍後不補送已取消的工作', async () => {
  vi.useFakeTimers()
  const scope = createRequestDeadline(1000)
  let release, signal
  const result = scope.run((value) => {
    signal = value
    return new Promise((resolve) => (release = resolve))
  })
  const rejected = expect(result).rejects.toThrow('REQUEST_ABORTED')
  await vi.advanceTimersByTimeAsync(1000)
  await rejected
  expect(signal.aborted).toBe(true)
  release('舊回應')
  expect(vi.getTimerCount()).toBe(0)
})

it('離頁取消會結束等待，且取消後不會啟動尚未開始的工作', async () => {
  vi.useFakeTimers()
  const scope = createRequestDeadline()
  const work = vi.fn()
  scope.abort()
  await expect(scope.run(work)).rejects.toThrow('REQUEST_ABORTED')
  expect(work).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(0)
})

it('成功、失敗都清除計時器，原始錯誤保持可供判讀', async () => {
  vi.useFakeTimers()
  const scope = createRequestDeadline()
  await expect(scope.run(() => Promise.resolve({ value: 1 }))).resolves.toEqual({ value: 1 })
  expect(vi.getTimerCount()).toBe(0)
  await expect(
    createRequestDeadline().run(() => {
      throw Error('原始原因')
    })
  ).rejects.toThrow('原始原因')
  expect(vi.getTimerCount()).toBe(0)
})
