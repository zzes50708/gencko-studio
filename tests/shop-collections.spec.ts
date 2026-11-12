import { describe, expect, it } from 'vitest'
import { shopCollections } from '../data/shop-collections'
import {
  belongsToShopCategory,
  buildShopCategories,
  shopCategoryDefinitions
} from '../utils/shop-categories'
import { filterShopItems, createShopFilters, getShopGeneCategories } from '../utils/shop-catalog'
import { parseShopCollectionDraft } from '../utils/shop-collection-draft'

describe('工作室分類設定', () => {
  const animal = {
    ID: 'A',
    Species: '肥尾守宮',
    Status: 'ForSale',
    Genes: ['幽靈'],
    ImageURL: '/a.webp'
  }
  it('肥尾英文入口對應既有基因，售出個體不計入在售數', () => {
    const groups = buildShopCategories([animal, { ...animal, ID: 'B', Status: 'Sold' }], '肥尾守宮')
    expect(groups.find((group) => group.label === 'Ghost')?.count).toBe(1)
    expect(groups[0].count).toBe(1)
    expect(groups[0].image).toBe('')
  })
  it('豹紋不依名稱猜分類，空的 Super Giants 入口保留', () => {
    const groups = buildShopCategories(
      [{ ...animal, Species: '豹紋守宮', Morph: 'Black Night', Genes: ['黑夜'] }],
      '豹紋守宮'
    )
    expect(groups).toHaveLength(12)
    expect(groups.find((group) => group.id === 'black-night')?.count).toBe(0)
    expect(groups.find((group) => group.id === 'super-giants')?.count).toBe(0)
  })
  it('基因精確比對，手動加入及排除優先於基因規則', () => {
    const group = {
      id: 'ghost',
      species: '肥尾守宮',
      animalIds: [],
      matchMode: 'genes',
      geneKeys: ['Ghost']
    }
    expect(belongsToShopCategory({ ...animal, Genes: ['het Ghost'] }, group)).toBe(false)
    expect(belongsToShopCategory({ ...animal, Genes: [' ghost '] }, group)).toBe(true)
    expect(belongsToShopCategory(animal, { ...group, animalIds: ['A'] })).toBe(true)
    expect(
      belongsToShopCategory(animal, { ...group, animalIds: ['A'], excludedAnimalIds: ['A'] })
    ).toBe(false)
  })
  it('選定封面獨立於在售數，不會自動換成別隻', () => {
    const groups = buildShopCategories(
      [{ ...animal, Status: 'Sold' }],
      '肥尾守宮',
      shopCollections,
      { 肥尾守宮: 'A' }
    )
    expect(groups[0]).toMatchObject({ count: 0, image: '/a.webp' })
  })
  it('種群可作分類封面但不計入販售數', () => {
    const groups = buildShopCategories(
      [{ ...animal, Status: 'SelfKeep' }],
      '肥尾守宮',
      shopCollections,
      { 肥尾守宮: 'A' }
    )
    expect(groups[0]).toMatchObject({ count: 0, image: '/a.webp' })
    expect(groups.find((group) => group.id === 'fat-ghost')?.count).toBe(0)
  })
  it('只有待售個體可歸入分類，種群及已售個體即使手動指定或符合基因也排除', () => {
    const group = {
      id: 'ghost',
      species: '肥尾守宮',
      animalIds: ['A'],
      matchMode: 'genes',
      geneKeys: ['幽靈']
    }
    for (const Status of ['SelfKeep', 'Sold', 'Reserved', 'Auction']) {
      expect(belongsToShopCategory({ ...animal, Status }, group)).toBe(false)
    }
    expect(belongsToShopCategory(animal, group)).toBe(true)
  })
  it('草稿保留規則並拒絕重複分類代碼', () => {
    const draft = {
      format: 'gencko-shop-collections',
      version: 1,
      groups: shopCollections,
      covers: {}
    }
    expect(parseShopCollectionDraft(JSON.stringify(draft)).groups).toHaveLength(
      shopCollections.length
    )
    expect(() =>
      parseShopCollectionDraft({ ...draft, groups: [shopCollections[0], shopCollections[0]] })
    ).toThrow()
  })
  it('Pet Only 是兩種守宮共用分類，名單與封面共用，其他分類仍限制物種', () => {
    const leopard = { ...animal, ID: 'LEO', Species: '豹紋守宮' }
    const pet = {
      id: 'pet-only',
      label: 'Pet Only Geckos',
      species: '豹紋守宮',
      animalIds: ['A', 'LEO'],
      coverAnimalId: 'A'
    }
    const normal = { ...pet, id: 'normal', label: 'Normal' }
    for (const species of ['豹紋守宮', '肥尾守宮']) {
      expect(
        shopCategoryDefinitions(species, [pet, normal]).some((group) => group.id === 'pet-only')
      ).toBe(true)
      expect(
        buildShopCategories([animal, leopard, { ...animal, ID: 'SOLD', Status: 'Sold' }], species, [
          pet,
          normal
        ]).find((group) => group.id === 'pet-only')
      ).toMatchObject({ count: 2, image: '/a.webp' })
    }
    expect(belongsToShopCategory(animal, normal)).toBe(false)
    expect(belongsToShopCategory(leopard, normal)).toBe(true)
    expect(belongsToShopCategory({ ...animal, Species: '豬鼻蛇' }, pet)).toBe(false)
  })
  it('共用分類篩選合併兩種物種與基因，原單一物種篩選維持隔離', () => {
    const rows = [animal, { ...animal, ID: 'LEO', Species: '豹紋守宮' }]
    expect(
      filterShopItems(rows, { species: ['豹紋守宮', '肥尾守宮'], filters: createShopFilters() })
    ).toHaveLength(2)
    expect(
      filterShopItems(rows, { species: '豹紋守宮', filters: createShopFilters() })
    ).toHaveLength(1)
    expect(
      getShopGeneCategories(['豹紋守宮', '肥尾守宮'], {
        豹紋守宮: { 隱性: ['A'] },
        肥尾守宮: { 隱性: ['A', 'B'] }
      })
    ).toEqual({ 隱性: ['A', 'B'] })
  })
})
