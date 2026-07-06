import type { RouterConfig } from '@nuxt/schema'
import { useNuxtApp } from '#app'

// 全站 scrollBehavior（Lenis-aware）
// 背景：全站以 Lenis 接管捲動，原生 savedPosition 還原不可靠；且 <NuxtPage :page-key>
// 會整頁重掛載。因此換頁後要等 page:finish + rAF，Lenis 量得到新高度，再用
// lenis.scrollTo(immediate) 精準定位。
// 規則：
//  - 同頁只變 query（篩選/分頁）且無 hash → 不動捲動（保留使用者當前位置）
//  - 有 hash → 捲到對應元素
//  - 上一頁/前進（有 savedPosition）→ 還原原本捲動位置
//  - 其餘（一般換頁）→ 歸零
export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    // 同一路徑、只變 query（例如 shop 篩選、分頁）：維持現狀，別跳動
    if (to.path === from.path && !to.hash) return false

    const nuxtApp = useNuxtApp()

    return new Promise((resolve) => {
      let done = false
      const run = () => {
        if (done) return
        done = true

        const lenis = import.meta.client ? (window as any).__lenis : null
        let top = 0

        if (to.hash) {
          const el = document.querySelector(to.hash)
          if (el) top = el.getBoundingClientRect().top + (window.scrollY || 0)
        } else if (savedPosition) {
          top = savedPosition.top
        }

        if (lenis) lenis.scrollTo(top, { immediate: true })
        else if (import.meta.client) window.scrollTo({ top, behavior: 'auto' })

        // 已手動處理，回傳 false 讓 vue-router 不再自行捲動（避免與 Lenis 打架）
        resolve(false)
      }

      // 等頁面內容 render 完成，Lenis 才量得到新高度
      nuxtApp.hooks.hookOnce('page:finish', () => {
        requestAnimationFrame(() => requestAnimationFrame(run))
      })
      // 保險：page:finish 未觸發（同組件複用等情況）時仍會定位
      setTimeout(run, 700)
    })
  }
}
