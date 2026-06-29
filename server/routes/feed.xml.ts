import { serverSupabaseClient } from '#supabase/server'

const SITE = 'https://www.genckobreeding.com'
const FEED_URL = `${SITE}/feed.xml`
const ARTS_URL = `${SITE}/articles`

const xmlEscape = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const toRfc822 = (d: unknown) => {
  const date = d ? new Date(d as string) : new Date()
  return isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString()
}

const stripHtml = (s: unknown) =>
  String(s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)

  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, title, summary, image_url, publish_date, author, category')
    .ilike('status', 'published')
    .order('publish_date', { ascending: false })
    .limit(20)

  if (error) console.error('RSS feed 抓取 articles 失敗:', error)

  const list = articles ?? []
  const lastBuild = toRfc822(list[0]?.publish_date)

  const items = list
    .map((a) => {
      const link = `${SITE}/articles/${a.id}`
      const summary = stripHtml(a.summary)
      const descParts: string[] = []
      if (a.image_url)
        descParts.push(`<img src="${xmlEscape(a.image_url)}" alt="${xmlEscape(a.title)}" />`)
      if (summary) descParts.push(`<p>${xmlEscape(summary)}</p>`)
      const description = descParts.join('')

      return `    <item>
      <title>${xmlEscape(a.title)}</title>
      <link>${xmlEscape(link)}</link>
      <guid isPermaLink="true">${xmlEscape(link)}</guid>
      <pubDate>${toRfc822(a.publish_date)}</pubDate>
${a.category ? `      <category>${xmlEscape(a.category)}</category>\n` : ''}${a.author ? `      <dc:creator><![CDATA[${a.author}]]></dc:creator>\n` : ''}      <description><![CDATA[${description}]]></description>
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Gencko Breeding Studio｜守宮文章知識庫</title>
    <link>${ARTS_URL}</link>
    <atom:link href="${FEED_URL}" rel="self" type="application/rss+xml" />
    <description>豹紋守宮飼養教學、健康、環境、餵食、繁殖完整知識庫。</description>
    <language>zh-TW</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <generator>Gencko Nuxt Server</generator>
${items}
  </channel>
</rss>
`

  setHeader(event, 'Content-Type', 'application/rss+xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=600, s-maxage=600')
  return xml
})
