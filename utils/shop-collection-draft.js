export const SHOP_COLLECTION_DRAFT_KEY = 'gencko-shop-collections-draft-v1'
export function parseShopCollectionDraft(raw) {
  const draft = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (
    draft?.format !== 'gencko-shop-collections' ||
    draft.version !== 1 ||
    !Array.isArray(draft.groups) ||
    draft.groups.length > 100
  )
    throw Error('分類草稿格式不正確。')
  const seen = new Set()
  const groups = draft.groups.map((group) => {
    if (
      !/^[a-z0-9-]{1,80}$/.test(group.id) ||
      group.id === 'all' ||
      seen.has(group.id) ||
      !['豹紋守宮', '肥尾守宮'].includes(group.species) ||
      typeof group.label !== 'string' ||
      !group.label.trim() ||
      group.label.length > 60 ||
      !Array.isArray(group.animalIds) ||
      group.animalIds.length > 3000
    )
      throw Error('分類名稱或個體資料不正確。')
    seen.add(group.id)
    return {
      id: group.id,
      species: group.species,
      label: group.label.trim(),
      matchMode: group.matchMode === 'genes' ? 'genes' : 'manual',
      geneKeys: Array.isArray(group.geneKeys)
        ? [
            ...new Set(group.geneKeys.filter((key) => typeof key === 'string' && key.length <= 80))
          ].slice(0, 100)
        : [],
      excludedAnimalIds: Array.isArray(group.excludedAnimalIds)
        ? [
            ...new Set(
              group.excludedAnimalIds.filter((id) => typeof id === 'string' && id.length <= 128)
            )
          ].slice(0, 3000)
        : [],
      animalIds: [
        ...new Set(
          group.animalIds.filter(
            (id) => typeof id === 'string' && id.length > 0 && id.length <= 128
          )
        )
      ],
      coverAnimalId:
        typeof group.coverAnimalId === 'string' ? group.coverAnimalId.slice(0, 128) : ''
    }
  })
  const covers = Object.fromEntries(
    ['豹紋守宮', '肥尾守宮'].map((species) => [
      species,
      typeof draft.covers?.[species] === 'string' ? draft.covers[species].slice(0, 128) : ''
    ])
  )
  return { format: 'gencko-shop-collections', version: 1, groups, covers }
}
