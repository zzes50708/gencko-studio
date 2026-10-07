export const createShopFilters = () => ({
  stock: true,
  sold: false,
  minP: '',
  maxP: '',
  sexM: true,
  sexF: true,
  years: [],
  genes: [],
  beginner: false
})
export const cloneShopFilters = (filters) => ({
  ...filters,
  years: [...filters.years],
  genes: [...filters.genes]
})
export function getPriceRangeError({ minP = '', maxP = '' }) {
  const supplied = [minP, maxP].filter((value) => value !== '')
  if (supplied.some((value) => !Number.isFinite(Number(value)))) return '請輸入有效價格'
  if (supplied.some((value) => Number(value) < 0)) return '價格不可小於 0'
  if (minP !== '' && maxP !== '' && Number(minP) > Number(maxP)) return '最低價不可高於最高價'
  return ''
}
export function retainSpeciesGenes(filters, categories = {}) {
  const valid = new Set(Object.values(categories).flat())
  return { ...cloneShopFilters(filters), genes: filters.genes.filter((gene) => valid.has(gene)) }
}
export function sanitizeCompareIds(value) {
  if (!Array.isArray(value)) return []
  return [
    ...new Set(
      value
        .filter((id) => typeof id === 'string')
        .map((id) => id.trim())
        .filter(Boolean)
    )
  ].slice(0, 3)
}
export function filterShopItems(
  inventory,
  {
    species,
    filters,
    keyword = '',
    sort = 'price_desc',
    favorites = [],
    history = [],
    onlyFavorites = false,
    onlyHistory = false,
    auctions = []
  }
) {
  const auctionIds = new Set(auctions.map((auction) => auction.animal_id))
  const query = keyword.trim().toLowerCase()
  return inventory
    .filter((item) => {
      if (item.Species !== species || ['Trash', 'SelfKeep'].includes(item.Status)) return false
      const status = item.Status === 'Auction' && !auctionIds.has(item.ID) ? 'ForSale' : item.Status
      if (!filters.sold && status === 'Sold') return false
      if (!filters.stock && ['ForSale', 'Reserved', 'Auction'].includes(status)) return false
      const price = Number(item.ListingPrice) || 0
      if (filters.minP !== '' && price < Number(filters.minP)) return false
      if (filters.maxP !== '' && price > Number(filters.maxP)) return false
      const sex = String(item.GenderType || '')
      if (!filters.sexM && (sex.includes('Male') || sex.includes('公'))) return false
      if (!filters.sexF && (sex.includes('Female') || sex.includes('母'))) return false
      const year = String(item.Birthday || '').match(/\d{4}/)?.[0] || ''
      if (filters.years.length && !filters.years.includes(year)) return false
      // 新手推薦以後台標籤為準，缺陷與待觀察優先排除。
      if (
        filters.beginner &&
        (!(item.Tags || []).includes('新手推薦') ||
          (item.Tags || []).some((tag) => ['有缺陷', '待觀察'].includes(tag)))
      )
        return false
      if (!filters.genes.every((gene) => (item.Genes || []).includes(gene))) return false
      if (
        query &&
        ![item.ID, item.Morph, item.Species, ...(item.Genes || [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query)
      )
        return false
      if (onlyFavorites && !favorites.includes(item.ID)) return false
      if (onlyHistory && !history.includes(item.ID)) return false
      return true
    })
    .sort((a, b) => {
      const imageDifference = Number(!!b.ImageURL) - Number(!!a.ImageURL)
      if (imageDifference) return imageDifference
      const soldDifference = Number(a.Status === 'Sold') - Number(b.Status === 'Sold')
      if (soldDifference) return soldDifference
      return sort === 'price_asc'
        ? (Number(a.ListingPrice) || 0) - (Number(b.ListingPrice) || 0)
        : (Number(b.ListingPrice) || 0) - (Number(a.ListingPrice) || 0)
    })
}
