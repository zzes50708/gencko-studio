/**
 * GA4 延遲載入 plugin（僅 client）
 *
 * 為什麼這樣做？
 * - 原本 gtag.js 156KB 在 <head> 同步載入，PageSpeed 視為 render-blocking
 * - main thread 還要花 269ms 解析 GA bundle
 * - 延遲到 idle 後載入：GA 仍正常收 page_view，但完全不影響 LCP / FCP / TBT
 *
 * 策略（三路徑搶先生效）：
 *   1. requestIdleCallback（瀏覽器 idle 時，最佳路徑）
 *   2. 2 秒 timeout（fallback，舊瀏覽器）
 *   3. 第一次使用者互動（scroll / pointerdown / keydown）
 *
 * 載入後：
 *   - 注入 gtag.js script
 *   - 設定 dataLayer + gtag()
 *   - 用 router.afterEach 自動發送每個頁面切換的 page_view
 */
export default defineNuxtPlugin((nuxtApp) => {
    const config = useRuntimeConfig()
    const { gaId, enableGa } = config.public as { gaId: string; enableGa: boolean }

    if (!enableGa || !gaId) return

    let loaded = false

    const loadGA = () => {
        if (loaded) return
        loaded = true
        cleanupKickoff()

        // 1. 注入 gtag.js（async）
        const s = document.createElement('script')
        s.async = true
        s.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
        document.head.appendChild(s)

        // 2. 初始化 dataLayer + gtag
        ;(window as any).dataLayer = (window as any).dataLayer || []
        function gtag(...args: any[]) {
            ;(window as any).dataLayer.push(args)
        }
        ;(window as any).gtag = gtag
        gtag('js', new Date())
        gtag('config', gaId, { send_page_view: true })

        // 3. SPA 路由切換時，手動發送 page_view（gtag config 預設只追蹤初次載入）
        const router = nuxtApp.$router as any
        if (router?.afterEach) {
            router.afterEach((to: any) => {
                try {
                    gtag('event', 'page_view', {
                        page_location: window.location.href,
                        page_path: to.fullPath,
                        page_title: document.title
                    })
                } catch (e) {
                    /* silent */
                }
            })
        }
    }

    let idleHandle: number | null = null
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null
    let kickoffListeners: Array<[string, EventListener]> = []

    const cleanupKickoff = () => {
        if (idleHandle != null && 'cancelIdleCallback' in window) {
            ;(window as any).cancelIdleCallback(idleHandle)
            idleHandle = null
        }
        if (timeoutHandle) {
            clearTimeout(timeoutHandle)
            timeoutHandle = null
        }
        kickoffListeners.forEach(([evt, fn]) => window.removeEventListener(evt, fn))
        kickoffListeners = []
    }

    // 路徑 A：瀏覽器 idle（推薦路徑，行動裝置常見 100-800ms）
    if ('requestIdleCallback' in window) {
        idleHandle = (window as any).requestIdleCallback(loadGA, { timeout: 3500 })
    } else {
        // 路徑 B：fallback 2s timeout（Safari < 17）
        timeoutHandle = setTimeout(loadGA, 2000)
    }

    // 路徑 C：使用者互動瞬間觸發（不等 idle）
    const events = ['scroll', 'pointerdown', 'keydown', 'touchstart']
    events.forEach((evt) => {
        const fn = () => loadGA()
        window.addEventListener(evt, fn, { once: true, passive: true })
        kickoffListeners.push([evt, fn])
    })
})
