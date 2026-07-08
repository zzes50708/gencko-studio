import { CALC_TYPES } from '../genes'

export const BALL_PYTHON_GENE_CATEGORIES = [
  { id: 'recessive', label: '隱性' },
  { id: 'codominant', label: '共顯性' },
  { id: 'dominant', label: '顯性' },
  { id: 'polygenic', label: '多遺傳' },
  { id: 'bloodline', label: '血系' }
]

export const BALL_PYTHON_GENES = [
  { id: 'albino', name: '白化', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'toffee', name: '太妃', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'axanthic', name: '缺黃', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'evans_hypo', name: '海波', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'lavender', name: '薰衣草', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'sable', name: '紫貂', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'pink_pastel', name: '粉紅淡彩', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'lucy', name: '露西', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'swiss_chocolate', name: '瑞士巧克力', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'caramel', name: '焦糖', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'pistachio', name: '開心果', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'true_hypo', name: '真海波', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'shadow', name: '煙霧', type: CALC_TYPES.REC, category: 'recessive' },

  {
    id: 'arctic',
    name: '北極',
    type: CALC_TYPES.CODOM,
    category: 'codominant',
    superName: '超級北極'
  },
  {
    id: 'antarctic',
    name: '南極',
    type: CALC_TYPES.CODOM,
    category: 'codominant',
    superName: '超級南極'
  },
  {
    id: 'conda',
    name: '康達',
    type: CALC_TYPES.CODOM,
    category: 'codominant',
    superName: '超級康達'
  },
  { id: 'ghostface', name: '鬼臉', type: CALC_TYPES.CODOM, category: 'codominant' },

  { id: 'rbe_pastel', name: 'RBE淡彩', type: CALC_TYPES.DOM, category: 'dominant' },
  { id: 'cinnamon', name: '肉桂', type: CALC_TYPES.DOM, category: 'dominant' },
  { id: 'mocha', name: '摩卡', type: CALC_TYPES.DOM, category: 'dominant' },
  { id: 'dark_shadow', name: '暗影', type: CALC_TYPES.DOM, category: 'dominant' },

  { id: 'extreme_red', name: '極端紅', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'lemon_ghost', name: '檸檬鬼', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'purple_line', name: '紫線', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'woma', name: '沃瑪', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'symphony', name: '交響曲', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'paint_blast', name: '彩色爆風', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'green_line', name: '綠線', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'tiger', name: '老虎', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'twinspot', name: '雙斑', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'granite', name: '花崗岩', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'jaguar', name: '捷豹', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'leopard', name: '豹紋', type: CALC_TYPES.POLY, category: 'polygenic' },

  {
    id: 'toffeeglow',
    name: '太妃夜光',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'albino', type: 'Visual' },
      { geneId: 'toffee', type: 'Visual' }
    ]
  },
  {
    id: 'snow',
    name: '雪白',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'albino', type: 'Visual' },
      { geneId: 'axanthic', type: 'Visual' }
    ]
  },
  {
    id: 'toxic',
    name: '毒藥',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'axanthic', type: 'Visual' },
      { geneId: 'toffee', type: 'Visual' }
    ]
  },
  {
    id: 'ghost',
    name: '幽靈',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'axanthic', type: 'Visual' },
      { geneId: 'evans_hypo', type: 'Visual' }
    ]
  },
  {
    id: 'mercury',
    name: '水銀',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'axanthic', type: 'Visual' },
      { geneId: 'lavender', type: 'Visual' }
    ]
  },
  {
    id: 'stormcloud',
    name: '風暴雲',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'axanthic', type: 'Visual' },
      { geneId: 'sable', type: 'Visual' }
    ]
  },
  {
    id: 'coral',
    name: '珊瑚',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'albino', type: 'Visual' },
      { geneId: 'lavender', type: 'Visual' }
    ]
  },
  {
    id: 'sunburst',
    name: '太陽爆炸',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'albino', type: 'Visual' },
      { geneId: 'sable', type: 'Visual' }
    ]
  },
  {
    id: 'electric',
    name: '電流',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'albino', type: 'Visual' },
      { geneId: 'pink_pastel', type: 'Visual' }
    ]
  },
  {
    id: 'moondust',
    name: '月塵',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'arctic', type: 'Single' },
      { geneId: 'lavender', type: 'Visual' }
    ]
  },
  {
    id: 'moonstone',
    name: '月光石',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'arctic', type: 'Super' },
      { geneId: 'lavender', type: 'Visual' }
    ]
  },
  {
    id: 'mai_tai',
    name: '邁泰',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'sable', type: 'Visual' },
      { geneId: 'toffee', type: 'Visual' }
    ]
  },
  {
    id: 'purple_haze',
    name: '紫霧',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'evans_hypo', type: 'Visual' },
      { geneId: 'lavender', type: 'Visual' }
    ]
  },
  {
    id: 'oxide',
    name: '氧化物',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'sable', type: 'Visual' },
      { geneId: 'evans_hypo', type: 'Visual' }
    ]
  },
  {
    id: 'purple_people_eater',
    name: '紫色食人族',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'sable', type: 'Visual' },
      { geneId: 'lavender', type: 'Visual' }
    ]
  },
  {
    id: 'sunset',
    name: '日落',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'sable', type: 'Visual' },
      { geneId: 'pink_pastel', type: 'Visual' }
    ]
  },
  {
    id: 'hulk',
    name: '浩克',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'sable', type: 'Visual' },
      { geneId: 'lemon_ghost', type: 'Visual' }
    ]
  },
  {
    id: 'frost',
    name: '糖霜',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'caramel', type: 'Visual' },
      { geneId: 'evans_hypo', type: 'Visual' }
    ]
  },
  {
    id: 'frostbite',
    name: '霜咬',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'caramel', type: 'Visual' },
      { geneId: 'axanthic', type: 'Visual' }
    ]
  },
  {
    id: 'permafrost',
    name: '永凍土',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'sable', type: 'Visual' },
      { geneId: 'caramel', type: 'Visual' }
    ]
  },
  {
    id: 'yeti',
    name: '雪人',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'albino', type: 'Visual' },
      { geneId: 'axanthic', type: 'Visual' },
      { geneId: 'conda', type: 'Single' }
    ]
  },
  {
    id: 'super_yeti',
    name: '超級雪人',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'albino', type: 'Visual' },
      { geneId: 'axanthic', type: 'Visual' },
      { geneId: 'conda', type: 'Super' }
    ]
  },
  {
    id: 'snowburst',
    name: '雪爆',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'albino', type: 'Visual' },
      { geneId: 'axanthic', type: 'Visual' },
      { geneId: 'sable', type: 'Visual' }
    ]
  },
  {
    id: 'ghost_snow',
    name: '幽靈雪',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'albino', type: 'Visual' },
      { geneId: 'axanthic', type: 'Visual' },
      { geneId: 'evans_hypo', type: 'Visual' }
    ]
  },
  {
    id: 'acid_rain',
    name: '酸雨',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'toffee', type: 'Visual' },
      { geneId: 'axanthic', type: 'Visual' },
      { geneId: 'sable', type: 'Visual' }
    ]
  },
  {
    id: 'deadly_toxic',
    name: '致命毒藥',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'albino', type: 'Visual' },
      { geneId: 'axanthic', type: 'Visual' },
      { geneId: 'toffee', type: 'Visual' }
    ]
  },
  {
    id: 'super_daddy',
    name: '超級老爹',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'albino', type: 'Visual' },
      { geneId: 'arctic', type: 'Super' },
      { geneId: 'conda', type: 'Super' }
    ]
  },
  {
    id: 'crystal_diamond',
    name: '水晶鑽石',
    type: CALC_TYPES.COMBO,
    components: [
      { geneId: 'albino', type: 'Visual' },
      { geneId: 'lavender', type: 'Visual' },
      { geneId: 'arctic', type: 'Super' },
      { geneId: 'conda', type: 'Single' }
    ]
  }
]

export const BALL_PYTHON_COMBO_RULES = []

export const BallPythonConfig = {
  id: 'hog',
  name: '豬鼻蛇',
  geneCategories: BALL_PYTHON_GENE_CATEGORIES,
  genes: BALL_PYTHON_GENES,
  presetMorphs: BALL_PYTHON_GENES.filter(
    (gene) => Array.isArray(gene.components) && gene.components.length > 0
  ),
  comboRules: BALL_PYTHON_COMBO_RULES,
  checks: {},
  warnings: []
}

export default BallPythonConfig
