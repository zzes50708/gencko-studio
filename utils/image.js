/**
 * 處理全站圖片網址
 * 1. 導入 wsrv.nl 進行雲端邊緣壓縮，提升 10 倍載入速度。
 * 2. 自動將 jsDelivr 網址轉回 GitHub Raw 網址，避免 CDN 互相封鎖或 Timeout。
 */
export const getCleanUrl = (url) => {
    if (!url) return ''
    
    let target = String(url).trim()
    
    // 如果已經被 wsrv.nl 處理過，則直接回傳
    if (target.includes('wsrv.nl')) return target
    
    // 處理 Google Drive 格式
    const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//
    const match = target.match(driveRegex)
    if (match && match[1]) {
        target = `https://drive.google.com/uc?id=${match[1]}`
    }

    // 🌟 核心防護：先解碼，避免雙重編碼導致 404
    try {
        target = decodeURIComponent(target)
    } catch (e) {}

    // 🌟 將 jsDelivr 轉換為 GitHub 原生直連，避開 jsDelivr 的 503 Timeout
    if (target.includes('cdn.jsdelivr.net/gh/')) {
        target = target
            .replace('https://cdn.jsdelivr.net/gh/', 'https://raw.githubusercontent.com/')
            .replace('@main/', '/main/')
            .replace('@master/', '/master/');
    }

    // wsrv.nl 官方建議：拿掉前綴的 https:// 可以降低解析錯誤率
    target = target.replace(/^https?:\/\//, '')

    // 重新交由壓縮伺服器處理 (限制寬度 800px, 轉 WebP, 畫質 80%)
    return `https://wsrv.nl/?url=${encodeURIComponent(target)}&w=800&output=webp&q=80`
}