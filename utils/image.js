/**
 * 處理 Google Drive 圖片網址，供 Nuxt Image 解析
 * 將 /file/d/ID/view 轉換為直連的 /uc?id=ID 格式
 */
export const getCleanUrl = (url) => {
    if (!url) return ''
    
    const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//
    const match = url.match(driveRegex)
    
    if (match && match[1]) {
        return `https://drive.google.com/uc?id=${match[1]}`
    }
    
    return url
}