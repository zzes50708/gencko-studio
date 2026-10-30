import { describe, it, expect, vi } from 'vitest'
import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { buildArticleFeed } from '../utils/article-feed'
import { catalogFallbackHtml } from '../utils/catalog-fallback'
import { completeSeoTags } from '../utils/seo-head'

describe('基本目錄瀏覽', () => {
  it('同一批公開個體可產生原生連結，品系與ID不能跳出 HTML', () => {
    const html = catalogFallbackHtml(
      [
        {
          ID: 'A/" onclick="bad',
          Morph: '<script>測試</script>',
          Species: '豹紋守宮',
          ListingPrice: 8000
        }
      ],
      '豹紋守宮'
    )
    expect(html).toContain('/product/A%2F%22%20onclick%3D%22bad')
    expect(html).toContain('&lt;script&gt;測試&lt;/script&gt;')
    expect(html).not.toContain('<script>')
    expect(html).toContain('NT$ 8000')
  })
  it('不混入其他物種，未標價不變成免費，也不捏造空目錄', () => {
    const html = catalogFallbackHtml(
      [
        { ID: 'A', Morph: '黑夜', Species: '豹紋守宮', ListingPrice: null },
        { ID: 'B', Morph: '肥尾', Species: '肥尾守宮', ListingPrice: 3000 }
      ],
      '豹紋守宮'
    )
    expect(html).toContain('售價請向官方確認')
    expect(html).not.toContain('/product/B')
    expect(catalogFallbackHtml([], '豹紋守宮')).toBe('')
  })
  it('基本瀏覽按標示售價排序並限制初始36隻', () => {
    const html = catalogFallbackHtml(
      Array.from({ length: 40 }, (_, id) => ({
        ID: `A-${id}`,
        Morph: '品系',
        Species: '豹紋守宮',
        ListingPrice: 200 + id
      })),
      '豹紋守宮'
    )
    expect(html.match(/<li>/g)).toHaveLength(36)
    expect(html.indexOf('/product/A-39')).toBeLessThan(html.indexOf('/product/A-38'))
    expect(html).not.toContain('href="/product/A-0"')
  })
})

describe('RSS 來源忠實性', () => {
  it('缺少日期不冒充今天，無修改時不產生假更新', () => {
    vi.useFakeTimers()
    try {
      const articles = [
        { id: 'A', title: '未填日期' },
        { id: 'B', title: '無效日期', publish_date: '2026-02-30' }
      ]
      vi.setSystemTime(new Date('2026-10-28'))
      const xml = buildArticleFeed(articles)
      vi.setSystemTime(new Date('2026-11-30'))
      expect(buildArticleFeed(articles)).toBe(xml)
      expect(xml).not.toContain('<pubDate>')
      expect(xml).not.toContain('<lastBuildDate>')
    } finally {
      vi.useRealTimers()
    }
  })
  it('作者的CDATA結束符號與HTML保持文字，不會增加 XML 節點', () => {
    const author = ']]></dc:creator><script>測試 & 內容</script>'
    const xml = buildArticleFeed([
      {
        id: 'A/B',
        title: '黑夜 & <品系>',
        author,
        summary: '摘要 <b>文字</b>',
        publish_date: '2026-10-28'
      }
    ])
    expect(XMLValidator.validate(xml)).toBe(true)
    const item = new XMLParser({ parseTagValue: false }).parse(xml).rss.channel.item
    expect(item['dc:creator']).toBe(author)
    expect(item.title).toBe('黑夜 & <品系>')
    expect(item.link).toMatch(/\/articles\/A%2FB$/)
    expect(item).not.toHaveProperty('script')
    expect(item.pubDate).toBe('Wed, 28 Oct 2026 00:00:00 GMT')
  })
  it('清單日期缺漏時仍採用真實最新日期', () => {
    const xml = buildArticleFeed([
      { id: 'A', title: '無日期' },
      { id: 'B', title: '舊文', publish_date: '2026-10-26' },
      { id: 'C', title: '新文', publish_date: '2026-10-28' }
    ])
    expect(xml).toContain('<lastBuildDate>Wed, 28 Oct 2026 00:00:00 GMT</lastBuildDate>')
  })
})

describe('備用標準網址', () => {
  it('雙斜線不會建立外站 canonical，尾斜線與追蹤參數不產生新版本', () => {
    for (const path of ['//external.invalid/path', '/missing/?tracking=1#part']) {
      const tags: any[] = []
      completeSeoTags(tags, path)
      const url = tags.find((tag) => tag.props.rel === 'canonical').props.href
      expect(new URL(url).origin).toBe('https://www.genckobreeding.com')
      expect(url).not.toContain('?')
      expect(url.endsWith('/')).toBe(false)
    }
  })
})
