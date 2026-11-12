import { shopCollections, shopCollectionCovers } from '../data/shop-collections'

// 分類與封面由工作室指定，不從基因或品系名稱推測。
export const isSharedShopCategory = (group) =>
  (typeof group === 'string' ? group : group?.id) === 'pet-only'
export const shopCategoryDefinitions = (species, groups = shopCollections) =>
  groups.filter((group) => group.species === species || isSharedShopCategory(group))
export function matchesShopCategory(item, species, id, groups = shopCollections) {
  if (!id || id === 'all') return true
  const group = shopCategoryDefinitions(species, groups).find((group) => group.id === id)
  return group ? belongsToShopCategory(item, group) : false
}
const normalized = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[\s()（）]/g, '')
export const canJoinShopCategory = (item) => item.Status === 'ForSale'
export function belongsToShopCategory(item, group) {
  // 自留與已售個體僅可作封面，手動指定及基因規則都不能將其納入。
  if (!canJoinShopCategory(item)) return false
  if (isSharedShopCategory(group)) {
    if (!['豹紋守宮', '肥尾守宮'].includes(item.Species)) return false
  } else if (group.species && item.Species !== group.species) return false
  if (group.excludedAnimalIds?.includes(item.ID)) return false
  if (group.animalIds.includes(item.ID)) return true
  if (group.matchMode !== 'genes') return false
  const keys = (group.geneKeys || []).map(normalized)
  return (Array.isArray(item.Genes) ? item.Genes : []).some((gene) =>
    keys.includes(normalized(gene))
  )
}
export function buildShopCategories(
  inventory,
  species,
  collections = shopCollections,
  covers = shopCollectionCovers
) {
  const items = inventory.filter(
    (item) => item.Species === species && ['ForSale', 'Reserved', 'Auction'].includes(item.Status)
  )
  const groups = [
    {
      id: 'all',
      label: 'All Available',
      animalIds: items.map((item) => item.ID),
      coverAnimalId: covers[species] || ''
    },
    ...shopCategoryDefinitions(species, collections)
  ]
  return groups.map((group) => {
    const members =
      group.id === 'all'
        ? items
        : (isSharedShopCategory(group) ? inventory : items).filter((item) =>
            belongsToShopCategory(item, group)
          )
    const cover = inventory.find((item) => item.ID === group.coverAnimalId)
    return {
      id: group.id,
      label: group.label,
      count: members.length,
      image: group.coverImage || cover?.ImageURL || ''
    }
  })
}
