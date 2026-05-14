/**
 * 處理圖片網址
 * 因專案已採用 PinGo + GitHub + jsDelivr 頂級 CDN 架構，
 * 故不需要任何多餘的第三方壓縮代理，直接回傳原始網址即可，以保持最快載入速度。
 */
export const getCleanUrl = (url) => {
    if (!url) return ''
    
    // 確保網址格式是字串並去除前後空白
    return String(url).trim()
}