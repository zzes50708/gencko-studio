export interface ShopCollection {
  id: string
  label: string
  species: '豹紋守宮' | '肥尾守宮'
  animalIds: string[]
  matchMode?: 'manual' | 'genes'
  geneKeys?: string[]
  excludedAnimalIds?: string[]
  coverAnimalId?: string
  coverImage?: string
}

// 名稱與順序依工作室指定；pet-only 為跨物種共用分類，其餘依 species 分開。
const leopardNames = [
  ['tangerine-line', 'Tangerine Line'],
  ['black-night', 'Black Night'],
  ['tremper-albinos', 'Tremper Albinos'],
  ['bell-albinos', 'Bell Albinos'],
  ['snows-supersnows', 'Snows/Supersnows'],
  ['white-yellows', 'White&Yellows'],
  ['tangerine-bandit-line', 'Tangerine Bandit Line'],
  ['tug-snows', 'TUG snows'],
  ['super-giants', 'Super Giants'],
  ['red-stripes', 'Red Stripes'],
  ['pet-only', 'Pet Only Geckos']
]
const fatTailGenes = [
  ['ghost', 'Ghost', ['幽靈', 'Ghost']],
  ['zulu', 'Zulu', ['祖魯', 'Zulu']],
  ['patternless', 'Patternless', ['無紋', 'Patternless']],
  ['caramel', 'Caramel', ['焦糖', 'Caramel']],
  ['amel', 'Amelanistic', ['橘白', 'Amel', 'Amelanistic']],
  ['oreo', 'Oreo', ['奧利奧', 'Oreo']],
  ['zero', 'Zero', ['零', 'Zero']],
  ['whiteout', 'Whiteout', ['立可白', 'Whiteout']],
  ['stripe', 'Stripe', ['直線(肥尾)', 'Stripe']]
] as const
export const shopCollections: ShopCollection[] = [
  ...leopardNames.map(([id, label]) => ({
    id,
    label,
    species: '豹紋守宮' as const,
    animalIds: [],
    matchMode: 'manual' as const,
    geneKeys: [],
    coverAnimalId: ''
  })),
  ...fatTailGenes.map(([id, label, genes]) => ({
    id: `fat-${id}`,
    label,
    species: '肥尾守宮' as const,
    animalIds: [],
    matchMode: 'genes' as const,
    geneKeys: [...genes],
    coverAnimalId: ''
  }))
]
export const shopCollectionCovers: Record<string, string> = {}
