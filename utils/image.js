/**
 * 處理全站圖片網址
 * 1. 導入 wsrv.nl 進行雲端邊緣壓縮，提升載入速度。
 * 2. 自動將 jsDelivr 網址轉回 GitHub Raw 網址，避免 CDN 互相封鎖或 Timeout。
 *
 * @param {string} url   - 原始圖片網址
 * @param {number} width - 目標寬度（px），依使用情境選擇：
 *   卡片縮圖用 400、文章卡片用 600、詳頁/大圖用 900（預設 800）
 */
export const getCleanUrl = (url, width = 800) => {
    if (!url) return ''

    let target = String(url).trim()

    // 如果已經被 wsrv.nl 處理過，則直接回傳（避免雙重包裝）
    if (target.includes('wsrv.nl')) return target

    // 處理 Google Drive 格式
    const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//
    const match = target.match(driveRegex)
    if (match && match[1]) {
        target = `https://drive.google.com/uc?id=${match[1]}`
    }

    // 核心防護：先解碼，避免雙重編碼導致 404
    try {
        target = decodeURIComponent(target)
    } catch (e) {}

    // 將 jsDelivr 轉換為 GitHub 原生直連，避開 jsDelivr 的 503 Timeout
    if (target.includes('cdn.jsdelivr.net/gh/')) {
        target = target
            .replace('https://cdn.jsdelivr.net/gh/', 'https://raw.githubusercontent.com/')
            .replace('@main/', '/main/')
            .replace('@master/', '/master/')
    }

    // wsrv.nl 官方建議：拿掉前綴的 https:// 可以降低解析錯誤率
    target = target.replace(/^https?:\/\//, '')

    // 交由壓縮伺服器處理（依傳入的 width 動態調整尺寸、轉 WebP、畫質 80%）
    return `https://wsrv.nl/?url=${encodeURIComponent(target)}&w=${width}&output=webp&q=80`
}