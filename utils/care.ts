export const PERSONAS = []

export const ANCHORS = [
  { id: 'env', icon: '🏠', label: '環境' },
  { id: 'temp', icon: '🌡', label: '溫度' },
  { id: 'humidity', icon: '💧', label: '濕度' },
  { id: 'food', icon: '🍴', label: '餵食' },
  { id: 'breeding', icon: '🧬', label: '繁殖' },
  { id: 'species', icon: '🦎', label: '豹紋 vs 肥尾' },
  { id: 'danger', icon: '⚠️', label: '地雷' },
  { id: 'faq', icon: '❓', label: 'FAQ' }
]

export const HERO_STATS = [
  { label: '溫度', value: '26–32°C', sub: '溫度梯度', target: 'temp', color: '#fb923c' },
  { label: '濕度', value: '40–70%', sub: '濕度梯度', target: 'humidity', color: '#60a5fa' },
  { label: '餵食', value: '每日 / 每週', sub: '依年齡調整', target: 'food', color: '#4ade80' }
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
    spec: '紙巾 / 椰纖 / 大顆赤玉土',
    body: '易清潔、無碎屑、無誤食風險。',
    warn: '⛔ 絕對避免：細沙、玉米芯、核桃殼粉等細碎底材（吞入會造成腸阻塞）。',
    comingArticle: true
  },
  {
    id: 'hides',
    icon: '🏚',
    title: '躲避處',
    spec: '至少 2 處（冷躲 + 熱躲）+ 1 個水盆',
    body: '冷區與熱區各放一個躲避屋，並額外提供一個穩定、易進出的淺水盆，兼顧飲水、局部微濕度與脫皮需求。',
    related: ['ART-007']
  }
]

export const TEMP_GRADIENT = {
  cold: { range: '26–28°C', label: '冷區躲避', color: '#3b82f6' },
  middle: { range: '28–30°C', label: '過渡區', color: '#facc15' },
  hot: { range: '30–32°C', label: '熱區腹部加溫', color: '#fb923c' },
  nightMin: '夜間最低 ≥ 22°C',
  danger: '⚠️ < 22°C 腸胃停滯 / > 35°C 熱衰竭',
  related: ['ART-007', 'ART-003']
}

export const HUMIDITY_CONFIG = [
  { zone: '主環境', range: '40–70%', desc: '日常濕度梯度', color: '#facc15' },
  { zone: '水盆周邊', range: '50–80%', desc: '提供飲水與局部微濕環境', color: '#3b82f6' }
]

export const HUMIDITY_SEASONAL = [
  {
    months: [12, 1, 2],
    label: '冬季',
    tip: '注意加溫，天冷時水盆蒸散較慢，仍需確認主環境不會過乾並定期換水。'
  },
  {
    months: [3, 4, 5],
    label: '春季',
    tip: '日夜溫差大，留意夜間加溫足夠，同時觀察水盆周邊是否太潮。'
  },
  { months: [6, 7, 8], label: '夏季', tip: '留意通風與水盆清潔，避免主環境長期悶濕。' },
  {
    months: [9, 10, 11],
    label: '秋季',
    tip: '入秋日夜溫差拉大，加溫設備提前測試，並觀察飲水量是否變化。'
  }
]

export const HUMIDITY_RELATED = ['ART-006', 'ART-003']

export const FEED_FREQ = [
  { age: '幼體 < 6 月', freq: '每日', qty: '1–2 隻', menu: '蟋蟀 / 杜比亞 / 麵包蟲' },
  { age: '亞成體 6–12 月', freq: '每日', qty: '1 隻', menu: '蟋蟀 / 杜比亞 / 麵包蟲' },
  { age: '成體 > 12 月', freq: '每週 2–3 次', qty: '1 隻', menu: '蟋蟀 / 杜比亞 / 麵包蟲' }
]

export const FEEDERS = [
  {
    id: 'dubia',
    name: '杜比亞蟑螂',
    tag: '✅ 主食推薦',
    protein: '高',
    fat: '中',
    calcium: '中',
    pros: '營養均衡、易飼養、安靜不會叫、不會跳逃',
    cons: '價格略高'
  },
  {
    id: 'cricket',
    name: '蟋蟀',
    tag: '✅ 主食推薦',
    protein: '高',
    fat: '低',
    calcium: '中',
    pros: '低脂、刺激守宮捕食慾望',
    cons: '成體公蟋蟀會叫、跳得快、需注意逃脫'
  },
  {
    id: 'mealworm',
    name: '麵包蟲',
    tag: '⚠️ 偶爾',
    protein: '中',
    fat: '高',
    calcium: '低',
    pros: '便宜易取得',
    cons: '極度依賴 gut loading，否則營養非常不足，不建議作為唯一主食'
  },
  {
    id: 'superworm',
    name: '大麥蟲',
    tag: '⚠️ 偶爾',
    protein: '中',
    fat: '極高',
    calcium: '低',
    pros: '誘食性強',
    cons: '高脂易脂肪肝，幼體禁餵，僅作偶爾零食'
  }
]

export const FEEDER_RELATED = ['ART-004', 'ART-005']

export const SUPPLEMENTS = [
  { name: '幼體（0–6個月）', juvenile: '每次餵食皆要沾鈣粉', adult: '一週 1 次維生素' },
  { name: '亞成體（6–12個月）', juvenile: '一週 2～3 次鈣粉', adult: '一週 1 次維生素' },
  { name: '成體（1歲以上）', juvenile: '一週 1～2 次鈣粉', adult: '一週 1 次或兩週 1 次維生素' },
  { name: '生蛋期母守宮', juvenile: '每次餵食都加鈣粉', adult: '一週 1 次維生素' }
]

export const SUPPLEMENT_WARN = '備註：可放一盆純鈣粉在環境中給守宮舔食。'
export const SUPPLEMENT_RELATED = ['ART-005']

export const BREEDING_NOTES = [
  '母守宮即使未交配，春季也可能因卵泡發育而產生「空包蛋」，未排出會導致卡蛋。',
  '產卵盒：可用濕潤蛭石或椰纖土，放置於安靜、穩定的角落。',
  '臨產徵兆：腹部明顯鼓脹、頻繁來回探索、挖掘行為。',
  '難產警訊：超過 7 天無法排出且食慾下降、無精神 → 立即就醫。'
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
    title: '混養（不分公母）',
    consequence: '緊迫、霸凌、咬傷、斷尾，弱勢個體可能餓死',
    why: '守宮高度領域性，獨居動物。即使母母混養也會競爭食物、躲避處與水盆資源，導致慢性壓力。',
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

export const FAQ = [
  { q: '守宮突然不吃東西了怎麼辦？', article: 'ART-002' },
  { q: '守宮卡皮怎麼辦？', article: 'ART-006' },
  { q: '守宮可以混養嗎？', article: 'ART-008' },
  { q: '加熱墊好還是加熱燈好？', article: 'ART-007' },
  { q: '為什麼不能頻繁調整溫濕度？', article: 'ART-003' },
  { q: '隱孢子蟲是什麼？很可怕嗎？', article: 'ART-001' },
  { q: '一定要補充營養品嗎？', article: 'ART-005' },
  { q: '母守宮沒交配也會生蛋嗎？', article: 'ART-011' },
  { q: '守宮咬人 / 搖尾怎麼辦？', article: 'ART-010' },
  { q: '守宮受傷流血怎麼處理？', article: 'ART-009' },
  { q: '可以只餵杜比亞嗎？需要餌料多樣性嗎？', article: 'ART-004' }
]

export const SPECIES_COMPARE = [
  { feature: '原產地', leopard: '巴基斯坦、印度、阿富汗', fattail: '西非（迦納、多哥）' },
  { feature: '體長', leopard: '20–25 cm', fattail: '20–25 cm' },
  { feature: '體型差異', leopard: '尾巴較細長', fattail: '尾巴比豹紋更圓、更短' },
  {
    feature: '溫度',
    leopard: '冷區 26–28°C，過渡區 28–30°C，熱區 30–32°C',
    fattail: '冷區 26–28°C，過渡區 29–31°C，熱區 31–33°C'
  },
  {
    feature: '耐熱性',
    leopard: '耐熱沒問題，但通常以偏乾環境搭配熱區為主',
    fattail: '可接受與豹紋同級甚至略高的熱端；真正關鍵不是降溫，而是高溫下仍保持通風與局部濕區'
  },
  {
    feature: '濕度',
    leopard: '主環境 40–70%，維持濕度梯度與水盆',
    fattail: '主環境 40–70%，維持濕度梯度與水盆'
  },
  { feature: '個性', leopard: '較活潑，通常比較不好上手', fattail: '通常更溫和、較易上手' },
  { feature: '餵食', leopard: '蟋蟀 / 杜比亞 / 麵包蟲', fattail: '蟋蟀 / 杜比亞 / 麵包蟲' },
  {
    feature: '常見問題',
    leopard: '卡皮、底材誤食、腸胃問題',
    fattail: '卡皮、底材誤食、腸胃問題稍微更常見'
  }
]
