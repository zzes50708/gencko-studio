import { it, expect, vi } from 'vitest'
import { loadPromoImage } from '../utils/auction-promo'

it('快取圖片同步完成時也能接到 load，不會一直生成中', async () => {
  class CachedImage {
    set src(value) {
      this.onload?.()
    }
  }
  await expect(
    loadPromoImage('/logo.png', { ImageConstructor: CachedImage })
  ).resolves.toBeInstanceOf(CachedImage)
})

it('圖片錯誤、逾時及取消都有明確結果並清除等待', async () => {
  class BrokenImage {
    set src(value) {
      this.onerror?.()
    }
  }
  await expect(loadPromoImage('/missing', { ImageConstructor: BrokenImage })).rejects.toThrow(
    '照片無法載入'
  )
  vi.useFakeTimers()
  try {
    class HangingImage {
      set src(value) {}
    }
    const promise = loadPromoImage('/slow', { ImageConstructor: HangingImage, timeout: 50 })
    const assertion = expect(promise).rejects.toThrow('照片載入逾時')
    await vi.advanceTimersByTimeAsync(50)
    await assertion
    const controller = new AbortController()
    const cancelled = loadPromoImage('/slow', {
      ImageConstructor: HangingImage,
      signal: controller.signal
    })
    controller.abort()
    await expect(cancelled).rejects.toMatchObject({ name: 'AbortError' })
    expect(vi.getTimerCount()).toBe(0)
  } finally {
    vi.useRealTimers()
  }
})
