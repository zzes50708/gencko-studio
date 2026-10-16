import { setHeader } from 'h3'

// 不快取時間回應，避免 CDN 的舊時間讓競標畫面提前或延後結束。
export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'no-store, max-age=0')
  return { serverTime: Date.now() }
})
