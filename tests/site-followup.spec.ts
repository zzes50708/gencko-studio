import { describe, expect, it } from 'vitest'
import { buildArticleFeed } from '../utils/article-feed'
import { getWishlistInquiryLink } from '../utils/animal-inquiry'

describe('全站後續修正', () => {
  it('RSS 保留發布日，建置日期反映真實更新', () => {
    const xml = buildArticleFeed([
      { id: 'A', title: '文章', publish_date: '2026-01-01', updated_at: '2026-11-01' }
    ])
    expect(xml).toContain('<lastBuildDate>Sun, 01 Nov 2026')
    expect(xml).toContain('<pubDate>Thu, 01 Jan 2026')
    expect(xml).toContain('<atom:updated>2026-11-01')
  })
  it('批次詢問加入公開資料，保留已下架編號且支援隱藏價格', () => {
    const rows = [{ ID: 'A', Morph: '黑夜', ListingPrice: 8000, SoldPrice: 9999 }]
    const text = decodeURIComponent(
      new URL(
        getWishlistInquiryLink('https://line.me/R/ti/p/@219abdzn', ['A', 'B'], { items: rows })
      ).search.slice(1)
    )
    expect(text).toContain('黑夜')
    expect(text).toContain('8,000')
    expect(text).toContain('/product/A')
    expect(text).toContain('B')
    expect(text).not.toContain('9999')
    const hidden = decodeURIComponent(
      new URL(
        getWishlistInquiryLink('https://line.me/R/ti/p/@219abdzn', ['A'], {
          items: rows,
          hidePrice: true
        })
      ).search.slice(1)
    )
    expect(hidden).not.toContain('8,000')
  })
})
