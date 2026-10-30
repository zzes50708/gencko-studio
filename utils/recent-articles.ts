import { seoDate } from './seo-head'

/** 使用真實發佈日期排序，不依賴資料庫回傳的預設順序或改寫共用清單。 */
export function recentArticles<T extends { ID: string; PublishDate?: string }>(articles: T[]) {
  const timestamp = (value: unknown) => {
    const date = seoDate(value)
    return date ? Date.parse(date) : 0
  }
  return articles
    .slice()
    .sort((a, b) => timestamp(b.PublishDate) - timestamp(a.PublishDate) || a.ID.localeCompare(b.ID))
}
