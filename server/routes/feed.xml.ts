import { serverSupabaseClient } from '#supabase/server'
import { buildArticleFeed } from '~/utils/article-feed'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)

  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, title, summary, image_url, publish_date, author, category')
    .ilike('status', 'published')
    .order('publish_date', { ascending: false })
    .limit(20)

  if (error)
    throw createError({ statusCode: 503, statusMessage: 'Article feed temporarily unavailable' })
  setHeader(event, 'Content-Type', 'application/rss+xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=600, s-maxage=600')
  return buildArticleFeed(articles || [])
})
