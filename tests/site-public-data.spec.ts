import { describe, it, expect } from 'vitest'
import {
  publicTable,
  publicAnimalFields,
  shouldRefreshCatalog,
  readPublicAnimals
} from '../utils/site-public-data'

describe('全站公開資料與更新邊界', () => {
  it('只對已宣告的公開目錄提供投影名稱', () => {
    expect(publicTable('animals')).toBe('site_public_animals')
    expect(publicTable('articles')).toBe('site_public_articles')
    expect(() => publicTable('expenses')).toThrow()
  })
  it('公開個體資料不包含成本、成交價、買家與物流資料', () => {
    const fields = publicAnimalFields.split(',').map((field) => field.trim())
    expect(fields).toContain('listing_price')
    expect(fields).toContain('photo_updated_at')
    for (const field of [
      'cost_price',
      'sold_price',
      'buyer_name',
      'buyer_contact',
      'tracking_no',
      'parent_male_id'
    ])
      expect(fields).not.toContain(field)
  })
  it('未過期不重讀；過期、時間回撥或未載入必須重新確認', () => {
    expect(shouldRefreshCatalog(1000, 2000, 30000)).toBe(false)
    expect(shouldRefreshCatalog(1000, 31000, 30000)).toBe(true)
    expect(shouldRefreshCatalog(0, 1000, 30000)).toBe(true)
    expect(shouldRefreshCatalog(2000, 1000, 30000)).toBe(true)
  })
  it('超過單次上限的個體使用游標讀完整，不重複、不截斷', async () => {
    const rows = Array.from({ length: 1203 }, (_, index) => ({
      id: `P-${String(index).padStart(5, '0')}`
    }))
    let requests = 0
    const client = {
      from: () => {
        let after = '',
          limit = 0
        const query: any = {
          select: () => query,
          order: () => query,
          limit: (value: number) => {
            limit = value
            return query
          },
          gt: (_field: string, value: string) => {
            after = value
            return query
          },
          then: (resolve: any) => {
            requests++
            return Promise.resolve({
              data: rows.filter((row) => row.id > after).slice(0, limit),
              error: null
            }).then(resolve)
          }
        }
        return query
      }
    }
    const result = await readPublicAnimals(client)
    expect(result.error).toBeNull()
    expect(result.data).toEqual(rows)
    expect(requests).toBe(7)
  })
  it('其中一頁失敗時不把不完整目錄當成功', async () => {
    const failure = { message: '分頁暫時失敗' }
    const query: any = {
      select: () => query,
      order: () => query,
      limit: () => query,
      then: (resolve: any) => Promise.resolve({ data: null, error: failure }).then(resolve)
    }
    expect(await readPublicAnimals({ from: () => query })).toEqual({ data: null, error: failure })
  })
})
