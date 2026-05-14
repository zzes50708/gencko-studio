/**
 * 處理全站圖片網址
 * 導入 wsrv.nl 進行雲端邊緣壓縮，將原圖壓縮至 800px WebP，大幅提升載入速度。
 * 加入防雙重編碼機制，徹底解決 404 找不到檔案的破圖 Bug。
 */
export const getCleanUrl = (url) => {
    if (!url) return ''
    
    let target = String(url).trim()
    
    // 如果已經是 wsrv 網址，不重複處理
    if (target.includes('wsrv.nl')) return target
    
    // 處理 Google Drive 格式
    const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//
    const match = target.match(driveRegex)
    if (match && match[1]) {
        target = `https://drive.google.com/uc?id=${match[1]}`
    }

    // 🌟 核心防護：先解碼，再編碼。避免中文字或已編碼的網址產生 %25 雙重亂碼導致 404
    try {
        target = decodeURIComponent(target)
    } catch (e) {}
    
    // 🌟 恢復強大壓縮引擎：限制最大寬度 800px、轉 WebP 格式、畫質 80%
    return `https://wsrv.nl/?url=${encodeURIComponent(target)}&w=800&output=webp&q=80`
}