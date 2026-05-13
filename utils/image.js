/**
 * 處理全站圖片網址，供 Nuxt Image 解析
 * 將所有外部圖片先經過 wsrv.nl 全球邊緣節點進行第一道壓縮
 * 徹底解決 Vercel 處理大檔原圖超時 (Timeout) 與破圖的問題
 */
export const getCleanUrl = (url) => {
    if (!url) return ''
    
    // 如果已經被 wsrv.nl 處理過，則直接回傳避免雙重編碼
    if (url.includes('wsrv.nl')) return url
    
    let target = url
    
    // 處理 Google Drive 格式
    const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//
    const match = url.match(driveRegex)
    if (match && match[1]) {
        target = `https://drive.google.com/uc?id=${match[1]}`
    }
    
    // 🌟 強制將所有圖片交給 wsrv.nl 處理，限制最大寬度為 1000px，並轉為 webp
    return `https://wsrv.nl/?url=${encodeURIComponent(target)}&w=1000&output=webp&q=80`
}