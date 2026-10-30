import { describe, it, expect } from 'vitest'
import {
  TAXON_LEOPARD_GECKO,
  TAXON_FAT_TAIL_GECKO,
  TAXON_HOGNOSE_SNAKE,
  getBreadcrumbForPath
} from '../utils/seo-schemas'
import { recentArticles } from '../utils/recent-articles'
import { breederFallbackHtml } from '../utils/catalog-fallback'
import { completeSeoTags, seoDate } from '../utils/seo-head'

describe('已核對物種實體', () => {
  it('學名與正式 Wikidata 物種條目一致', () => {
    expect(
      [TAXON_LEOPARD_GECKO, TAXON_FAT_TAIL_GECKO, TAXON_HOGNOSE_SNAKE].map(({ name, sameAs }) => ({
        name,
        sameAs
      }))
    ).toEqual([
      { name: 'Eublepharis macularius', sameAs: 'https://www.wikidata.org/wiki/Q256860' },
      { name: 'Hemitheconyx caudicinctus', sameAs: 'https://www.wikidata.org/wiki/Q2087254' },
      { name: 'Heterodon nasicus', sameAs: 'https://www.wikidata.org/wiki/Q1441196' }
    ])
  })
})

describe('近期文章與日期', () => {
  it('按發佈時間排最新文章，缺漏或無效日期排後，不改寫來源清單', () => {
    const articles = [
      { ID: 'old', PublishDate: '2026-10-01' },
      { ID: 'missing' },
      { ID: 'latest', PublishDate: '2026-10-28' },
      { ID: 'invalid', PublishDate: '2026-02-30' }
    ]
    const before = JSON.stringify(articles)
    expect(recentArticles(articles).map((item) => item.ID)).toEqual([
      'latest',
      'old',
      'invalid',
      'missing'
    ])
    expect(JSON.stringify(articles)).toBe(before)
  })
  it('日期相同時排序固定，支援完整時間與跨時區', () => {
    expect(
      recentArticles([
        { ID: 'B', PublishDate: '2026-10-28' },
        { ID: 'A', PublishDate: '2026-10-28' }
      ]).map((item) => item.ID)
    ).toEqual(['A', 'B'])
    expect(
      recentArticles([
        { ID: 'earlier', PublishDate: '2026-10-28T10:00:00+08:00' },
        { ID: 'later', PublishDate: '2026-10-28T04:00:00Z' }
      ])[0].ID
    ).toBe('later')
  })
  it('完整時間不允許不存在的二月日期，合法跨日時間仍有效', () => {
    expect(seoDate('2026-02-30T10:00:00+08:00')).toBeUndefined()
    expect(seoDate('2026-02-29T10:00:00Z')).toBeUndefined()
    expect(seoDate('2024-02-29T01:00:00+08:00')).toBe('2024-02-28T17:00:00.000Z')
  })
})

describe('種群基本展示', () => {
  it('保留公開紀錄及可定位編號，不提供私留個體的商品入口或價格', () => {
    const html = breederFallbackHtml([
      {
        ID: 'B-1',
        Species: '肥尾守宮',
        Morph: '白化',
        Sex: '母',
        Birthday: '2026-01-01',
        Genes: ['白化']
      }
    ])
    expect(html).toContain('id="breeder-B-1"')
    expect(html).toContain('肥尾守宮 · 白化')
    expect(html).toContain('母 · 2026-01-01')
    expect(html).not.toMatch(/\/product\/|NT\$/)
  })
  it('原始文字不能跳出 HTML，不捏造空種群', () => {
    const html = breederFallbackHtml([
      {
        ID: '" onclick="x',
        Species: '豹紋守宮',
        Morph: '<script>品系</script>',
        Genes: ['<img src=x onerror=x>']
      }
    ])
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img')
    expect(breederFallbackHtml([])).toBe('')
  })
})

describe('分享與路徑語意', () => {
  it('正反斜線混用也不能變更備用 canonical 的來源', () => {
    for (const path of ['/\\external.invalid/x', '\\external.invalid/x', '//external.invalid/x']) {
      const tags: any[] = []
      completeSeoTags(tags, path)
      expect(new URL(tags.find((tag) => tag.props.rel === 'canonical').props.href).origin).toBe(
        'https://www.genckobreeding.com'
      )
    }
  })
  it('補足圖片替代說明但保留頁面自己提供的內容', () => {
    const tags: any[] = [
      { tag: 'title', props: {}, textContent: '個體證書' },
      { tag: 'meta', props: { property: 'og:image', content: 'https://example.com/a.png' } }
    ]
    completeSeoTags(tags, '/certificates')
    expect(tags.find((tag) => tag.props.property === 'og:image:alt').props.content).toBe('個體證書')
    expect(tags.find((tag) => tag.props.name === 'twitter:image:alt').props.content).toBe(
      '個體證書'
    )
  })
  it('首頁不重複兩層，介紹與證書使用中文名稱', () => {
    expect(getBreadcrumbForPath('/home')).toEqual([{ name: '首頁', url: '/home' }])
    expect(getBreadcrumbForPath('/guide').at(-1)?.name).toBe('守宮介紹')
    expect(getBreadcrumbForPath('/certificates').at(-1)?.name).toBe('個體證書')
  })
})
