import { describe, it, expect } from 'vitest'
import { completeSeoTags, seoDate, seoPrice } from '../utils/seo-head'
import { readSitemapRows } from '../utils/sitemap-data'
import { aiDiscoveryText } from '../utils/ai-discovery'
import { FAQ_DATA } from '../utils/faq'
import { SITE_URL, WEBSITE_AT_ID, ORG_AT_ID } from '../utils/site-constants'
import { getWebPage, getPublisher } from '../utils/seo-schemas'

describe('搜尋與分享標記', () => {
  it('未標價不被當作免費，售價只接受有效正數', () => {
    for (const value of [null, undefined, '', ' ', 0, -100, '無', NaN])
      expect(seoPrice(value)).toBeUndefined()
    expect(seoPrice('200')).toBe(200)
    expect(seoPrice(8000)).toBe(8000)
  })
  const base = () => [
    { tag: 'title', props: {}, textContent: '個體證書 | Gencko Studio' },
    { tag: 'meta', props: { name: 'description', content: '用完整 ID 查詢證書。' } },
    { tag: 'meta', props: { property: 'og:image', content: `${SITE_URL}/logo.png` } }
  ]
  it('從最終頁面資訊補齊分享標記，而且重複呼叫不產生重複', () => {
    const tags = base()
    completeSeoTags(tags, '/certificates?token=private')
    const count = tags.length
    completeSeoTags(tags, '/certificates')
    expect(tags.length).toBe(count)
    expect(tags.find((tag) => tag.props.property === 'og:title')?.props.content).toBe(
      '個體證書 | Gencko Studio'
    )
    expect(tags.find((tag) => tag.props.name === 'twitter:description')?.props.content).toBe(
      '用完整 ID 查詢證書。'
    )
    expect(tags.find((tag) => tag.props.rel === 'canonical')?.props.href).toBe(
      `${SITE_URL}/certificates`
    )
    expect(tags.find((tag) => tag.props.property === 'og:url')?.props.content).not.toContain(
      'private'
    )
  })
  it('保留個別頁面分享資訊及錯誤頁 noindex', () => {
    const tags = [
      ...base(),
      { tag: 'meta', props: { name: 'robots', content: 'noindex, nofollow' } },
      { tag: 'meta', props: { property: 'og:title', content: '文章專用標題' } }
    ]
    completeSeoTags(tags, '/articles/missing')
    expect(tags.filter((tag) => tag.props.name === 'robots')).toHaveLength(1)
    expect(tags.find((tag) => tag.props.name === 'robots')?.props.content).toContain('noindex')
    expect(tags.find((tag) => tag.props.property === 'og:title')?.props.content).toBe(
      '文章專用標題'
    )
    expect(tags.find((tag) => tag.props.name === 'twitter:title')?.props.content).toBe(
      '文章專用標題'
    )
  })
  it.each(['/profile', '/compare', '/auction-management', '/line-login-return', '/identity/A'])(
    '私人與狀態頁 %s 不索引',
    (path) => {
      const tags = base()
      completeSeoTags(tags, path)
      expect(tags.find((tag) => tag.props.name === 'robots')?.props.content).toContain('noindex')
    }
  )
  it('日期只採真實有效資料，不以當下時間替代缺漏', () => {
    expect(seoDate(null)).toBeUndefined()
    expect(seoDate('bad-date')).toBeUndefined()
    expect(seoDate('2026-02-30')).toBeUndefined()
    expect(seoDate('2026-10-28')).toBe('2026-10-28')
    expect(seoDate('2026-10-28T10:00:00+08:00')).toBe('2026-10-28T02:00:00.000Z')
  })
  it('品牌與網站使用同一組語意識別', () => {
    expect(getPublisher()['@id']).toBe(ORG_AT_ID)
    expect(getWebPage({ url: `${SITE_URL}/care`, name: '照護' })['isPartOf']).toMatchObject({
      '@id': WEBSITE_AT_ID
    })
  })
})

describe('網站地圖資料完整性', () => {
  it('超過1000筆仍讀取完整範圍，且不遺漏分頁邊界', async () => {
    const rows = Array.from({ length: 1203 }, (_, id) => ({ id }))
    const ranges: number[][] = []
    const result = await readSitemapRows(async (from, to) => {
      ranges.push([from, to])
      return { data: rows.slice(from, to + 1), error: null }
    })
    expect(result.data).toEqual(rows)
    expect(ranges).toEqual([
      [0, 499],
      [500, 999],
      [1000, 1499]
    ])
  })
  it('完整500筆會繼續確認下頁，API失敗不回傳看似完整的半份資料', async () => {
    const result = await readSitemapRows(async (from) =>
      from === 0
        ? { data: Array(500).fill({ id: 'A' }), error: null }
        : { data: null, error: new Error('離線') }
    )
    expect(result.data).toBeNull()
    expect(result.error).toBeInstanceOf(Error)
  })
})

describe('AI 公開來源導覽', () => {
  it('使用正確品牌，沒有占位內容或捏造個人身分', () => {
    const text = aiDiscoveryText()
    expect(text).toContain('Gencko Breeding Studio')
    expect(text).not.toMatch(/捷客|創辦人|完整純文字知識庫|後續將/)
    expect(text).toContain(`${SITE_URL}/buying-guide`)
    expect(text).toContain('不是已確認的性別')
  })
  it('問答文字版與網站 FAQ 同源，不另維護一份答案', () => {
    const text = aiDiscoveryText(true)
    for (const question of FAQ_DATA) expect(text).toContain(`#### ${question.title}`)
    expect(text).not.toContain('<a ')
    expect(text).toContain(`${SITE_URL}/faq`)
  })
})
