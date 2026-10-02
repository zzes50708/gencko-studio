export const PERSONAS = []

export const ANCHORS = [
  { id: 'env', icon: '🏠', label: '環境' },
  { id: 'food', icon: '🍴', label: '餵食' },
  { id: 'breeding', icon: '🧬', label: '繁殖' },
  { id: 'faq', icon: '❓', label: 'FAQ', href: '/faq' }
]

export const ENV_ITEMS = [
  {
    id: 'tank',
    icon: '🏠',
    title: '飼養箱',
    spec: '至少 40×30×20 cm 起',
    body: '視個體大小調整，可選玻璃或壓克力材質。空間允許下，提供大一些的活動範圍對個體刺激更佳。',
    note: '幼體可從小缸開始，避免空間過大導致找不到食物或水盆。'
  },
  {
    id: 'substrate',
    icon: '🌾',
    title: '底材',
    spec: '紙巾 / 椰纖土 / 大顆赤玉土',
    body: '易清潔、無碎屑、無誤食風險。',
    warn: '⛔ 絕對避免：細沙、玉米芯、生態砂、核桃殼粉等細碎底材（吞入會造成腸阻塞）。',
    comingArticle: true
  },
  {
    id: 'hides',
    icon: '🏚',
    title: '躲避處',
    spec: '至少 1 處 + 1 個水盆',
    body: '推薦冷區與熱區各放一個躲避屋，並額外提供一個穩定、易進出的淺水盆，兼顧飲水、局部微濕度與脫皮需求。',
    related: ['ART-007']
  }
]

export const TEMP_GRADIENT = {
  cold: { range: '26–28°C', label: '冷區', color: '#3b82f6' },
  middle: { range: '28–30°C', label: '過渡區', color: '#facc15' },
  hot: { range: '30–32°C', label: '熱區腹部加溫', color: '#fb923c' },
  nightMin: '夜間最低 ≥ 22°C',
  danger: '⚠️ < 22°C 腸胃停滯 / > 35°C 熱衰竭',
  related: ['ART-007', 'ART-003']
}

export const FEED_FREQ = [
  { age: '<6月', freq: '每日', qty: '1~2隻', menu: '蟋蟀/杜比亞' },
  { age: '6~12月', freq: '每日', qty: '1隻', menu: '蟋蟀/杜比亞' },
  { age: '>12月', freq: '每週1~2次', qty: '1~2隻', menu: '蟋蟀/杜比亞' }
]

export const FEEDERS = [
  {
    id: 'dubia',
    name: '杜比亞蟑螂',
    tag: '✅ 主食推薦',
    protein: '高',
    fat: '中',
    calcium: '中',
    pros: '營養均衡、易飼養、安靜不會叫、不會爬牆',
    cons: '殼硬不好消化、鈣磷比低，需補充鈣粉'
  },
  {
    id: 'cricket',
    name: '蟋蟀',
    tag: '✅ 主食推薦',
    protein: '高',
    fat: '低',
    calcium: '中',
    pros: '低脂、適口性佳',
    cons: '成體公蟋蟀會叫、跳得快、需注意逃脫，大隻需爆頭餵食'
  },
  {
    id: 'mealworm',
    name: '麵包蟲',
    tag: '⚠️ 偶爾',
    protein: '中',
    fat: '高',
    calcium: '低',
    pros: '便宜易取得',
    cons: '極度依賴腸道填充，否則營養不足，且營養品沾附性不佳'
  },
  {
    id: 'superworm',
    name: '大麥蟲',
    tag: '⚠️ 偶爾',
    protein: '中',
    fat: '極高',
    calcium: '低',
    pros: '誘食性強，一般作開食用',
    cons: '高脂易脂肪肝，幼體禁餵，僅作偶爾零食'
  }
]

export const FEEDER_RELATED = ['ART-004', 'ART-005']

export const SUPPLEMENTS = [
  { name: '0~6月', juvenile: '每次餵食', adult: '一週1次' },
  { name: '6~12月', juvenile: '一週2~3次', adult: '一週1次' },
  { name: '1歲以上', juvenile: '一週1~2次', adult: '一至兩週1次' },
  { name: '產期母守宮', juvenile: '每次餵食', adult: '一週1次維生素' }
]

export const SUPPLEMENT_WARN = '備註：可放一盆純鈣粉（不含D3）在環境中給守宮舔食。'
export const SUPPLEMENT_RELATED = ['ART-005']

export const BREEDING_NOTES = [
  '母守宮即使未交配，春季也可能因卵泡發育而產生「空包蛋」，未排出會導致卡蛋。',
  '產卵盒：可用濕潤蛭石或椰纖土，放置於安靜、穩定的角落。',
  '臨產徵兆：腹部明顯鼓脹、頻繁來回探索、挖掘行為。',
  '難產警訊：超過 7 天無法排出且食慾下降、無精神→立即就醫。'
]

export const BREEDING_RELATED = ['ART-011']

export const DANGERS = [
  {
    id: 'sand',
    icon: '⛔',
    title: '用沙 / 細砂底材',
    consequence: '誤食造成腸阻塞，急性致死率高',
    why: '餌料容易沾附底材，或守宮缺鈣時會舔食環境底材。長期吞入後可能在腸道累積造成阻塞。',
    related: []
  },
  {
    id: 'cohab',
    icon: '⛔',
    title: '嚴禁混養（不分公母）',
    consequence: '緊迫、咬傷、斷尾，弱勢個體可能餓死',
    why: '守宮有高度領域性，混養會競爭食物、躲避處與水盆資源，導致慢性壓力。',
    related: ['ART-008']
  },
  {
    id: 'noTherm',
    icon: '⛔',
    title: '加溫墊無控溫器 / 沒有溫度計',
    consequence: '低溫燙傷（腹部黑斑、組織壞死）或環境失溫',
    why: '加溫墊持續輸出無上限，接觸面可能飆破 40°C。沒有溫度計與控溫器時，飼主往往無法即時察覺。',
    related: ['ART-007', 'ART-009']
  },
  {
    id: 'monoDiet',
    icon: '⛔',
    title: '只餵蠟蟲 / 大麥蟲（高脂單一）',
    consequence: '脂肪肝、鈣磷比失衡引發 MBD',
    why: '高脂餌料雖然誘食，但缺乏鈣質與蛋白多樣性，長期會造成代謝病變。',
    related: ['ART-004']
  }
]
