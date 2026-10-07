import { describe, expect, it } from 'vitest'
import {
  createShopFilters,
  getPriceRangeError,
  retainSpeciesGenes,
  sanitizeCompareIds,
  filterShopItems
} from '../utils/shop-catalog'

describe('選購條件與比較資料', () => {
  it('錯誤價格區間有明確原因，不能當作零庫存', () => {
    expect(getPriceRangeError({ minP: '9000', maxP: '1000' })).toBe('最低價不可高於最高價')
    expect(getPriceRangeError({ minP: '-1', maxP: '' })).toBe('價格不可小於 0')
    expect(getPriceRangeError({ minP: '0', maxP: '0' })).toBe('')
  })
  it('換物種只移除不適用基因，保留其他條件', () => {
    const filters = { ...createShopFilters(), minP: '2000', genes: ['土匪', '幽靈'] }
    expect(retainSpeciesGenes(filters, { 隱性: ['幽靈'] })).toEqual({ ...filters, genes: ['幽靈'] })
  })
  it('損壞或重複的本機比較資料會清理並限制三隻', () => {
    expect(sanitizeCompareIds([' A ', 'A', '', null, 'B', 'C', 'D'])).toEqual(['A', 'B', 'C'])
    expect(sanitizeCompareIds({ invalid: true })).toEqual([])
  })
  it('總數在分批顯示前計算，並保留售出置後與收藏條件', () => {
    const items = Array.from({ length: 24 }, (_, n) => ({
      ID: String(n),
      Species: '豹紋守宮',
      Status: n === 0 ? 'Sold' : 'ForSale',
      ListingPrice: 1000 + n,
      ImageURL: 'photo',
      Genes: []
    }))
    const result = filterShopItems(items, {
      species: '豹紋守宮',
      filters: { ...createShopFilters(), sold: true },
      sort: 'price_asc'
    })
    expect(result).toHaveLength(24)
    expect(result.at(-1).ID).toBe('0')
    expect(
      filterShopItems(items, { species: '豹紋守宮', filters: createShopFilters() })
    ).toHaveLength(23)
    expect(
      filterShopItems(items, {
        species: '豹紋守宮',
        filters: createShopFilters(),
        onlyFavorites: true,
        favorites: ['2']
      }).map((i) => i.ID)
    ).toEqual(['2'])
  })
})

describe('新手推薦標籤同步', () => {
  it('依後台標籤篩選，缺陷優先排除且不誤判備註', () => {
    const base = { Species: '豹紋守宮', Status: 'ForSale', ListingPrice: 1000, Genes: [] }
    const items = [
      { ...base, ID: 'ok', Tags: ['新手推薦'] },
      { ...base, ID: 'defect', Tags: ['新手推薦', '有缺陷'] },
      { ...base, ID: 'watch', Tags: ['新手推薦', '待觀察'] },
      { ...base, ID: 'note', Tags: [], Note: '不適合新手' }
    ]
    expect(
      filterShopItems(items, {
        species: '豹紋守宮',
        filters: { ...createShopFilters(), beginner: true }
      }).map((i) => i.ID)
    ).toEqual(['ok'])
  })
})
