import { SITE_URL } from './site-constants'
import { seoDate } from './seo-head'

interface FeedArticle {
  id: string
  title: string
  summary?: string
  image_url?: string
  publish_date?: string
  author?: string
  category?: string
}
const xmlEscape = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!
  )
const feedDate = (value: unknown) => {
  const date = seoDate(value)
  return date ? new Date(date).toUTCString() : undefined
}

/** RSS 與文章採同一來源；缺少日期時省略，不以抓取當下日期冒充新文章。 */
export function buildArticleFeed(articles: FeedArticle[]) {
  const dated = articles
    .map((article) => seoDate(article.publish_date))
    .filter((value): value is string => !!value)
  const lastBuild = dated.length
    ? new Date(Math.max(...dated.map(Date.parse))).toUTCString()
    : undefined
  const items = articles
    .map((article) => {
      const url = `${SITE_URL}/articles/${encodeURIComponent(article.id)}`
      const date = feedDate(article.publish_date)
      const summary = String(article.summary || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      const description =
        (article.image_url
          ? `<img src="${xmlEscape(article.image_url)}" alt="${xmlEscape(article.title)}" />`
          : '') + (summary ? `<p>${xmlEscape(summary)}</p>` : '')
      return `<item><title>${xmlEscape(article.title)}</title><link>${xmlEscape(url)}</link><guid isPermaLink="true">${xmlEscape(url)}</guid>${date ? `<pubDate>${date}</pubDate>` : ''}${article.category ? `<category>${xmlEscape(article.category)}</category>` : ''}${article.author ? `<dc:creator>${xmlEscape(article.author)}</dc:creator>` : ''}<description>${xmlEscape(description)}</description></item>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>Gencko Breeding Studio｜守宮文章知識庫</title><link>${SITE_URL}/articles</link><atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/><description>豹紋守宮與肥尾守宮的飼養文章與知識內容。</description><language>zh-TW</language>${lastBuild ? `<lastBuildDate>${lastBuild}</lastBuildDate>` : ''}${items}</channel></rss>`
}
