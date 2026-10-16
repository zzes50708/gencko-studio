export function loadPromoImage(src, { ImageConstructor = Image, timeout = 10000, signal } = {}) {
  return new Promise((resolve, reject) => {
    const image = new ImageConstructor()
    let timer
    const finish = (error) => {
      clearTimeout(timer)
      image.onload = image.onerror = null
      signal?.removeEventListener('abort', abort)
      if (error) reject(error)
      else resolve(image)
    }
    const abort = () => {
      finish(new DOMException('已取消圖片生成', 'AbortError'))
      image.src = ''
    }
    if (signal?.aborted) {
      abort()
      return
    }
    image.crossOrigin = 'Anonymous'
    image.onload = () => finish()
    image.onerror = () => finish(new Error('照片無法載入，請重新載入照片或切換照片後再試。'))
    signal?.addEventListener('abort', abort, { once: true })
    timer = setTimeout(() => {
      finish(new Error('照片載入逾時，請確認網路後重試。'))
      image.src = ''
    }, timeout)
    // 監聽器必須先安裝，快取圖片可能在設定 src 後立即完成。
    image.src = src
  })
}
