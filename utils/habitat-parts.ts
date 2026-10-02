export const HABITAT_PARTS = [
  {
    id: 'tank',
    number: '01',
    label: '飼養箱',
    position: '',
    description: '透明箱體方便觀察內部配置。',
    point: [18, 28]
  },
  {
    id: 'substrate',
    number: '02',
    label: '底材',
    position: '',
    description:
      '以淺色平鋪底材呈現，讓設備與活動空間的位置更容易辨識。底材選擇與注意事項請參考上方環境說明。',
    point: [44, 68]
  },
  {
    id: 'water',
    number: '03',
    label: '水盆',
    position: '',
    description: '提供乾淨水源，確保飲水與脫皮順利。',
    point: [31, 53]
  },
  {
    id: 'food',
    number: '04',
    label: '食盆與鈣粉',
    position: '',
    description: '餵食與補充方式請參考下方餌料章節。',
    point: [41, 43]
  },
  {
    id: 'hide',
    number: '05',
    label: '躲避屋',
    position: '',
    description: '完整飼養配置仍請依上方環境說明準備。',
    point: [60, 44]
  },
  {
    id: 'heat',
    number: '06',
    label: '加熱墊',
    position: '',
    description: '加熱墊位於箱體外側。務必搭配溫控器(未顯示於模型中)。',
    point: [60, 82]
  },
  {
    id: 'thermometer',
    number: '07',
    label: '溫度計',
    position: '',
    description: '監測熱區溫度，避免溫度異常造成危害。',
    point: [74, 70]
  }
] as const

export type HabitatPartId = (typeof HABITAT_PARTS)[number]['id']
export type HabitatView = 'perspective' | 'front' | 'top'
export type HabitatCommand = {
  serial: number
  type: 'view' | 'zoom' | 'rotate'
  value: string | number
}
