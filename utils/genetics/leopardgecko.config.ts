import { CALC_TYPES, ZYG } from '../genes'

export const LEOPARD_GECKO_GENE_CATEGORIES = [
  { id: 'recessive', label: '隱性' },
  { id: 'codominant', label: '共顯性' },
  { id: 'dominant', label: '顯性' },
  { id: 'polygenic', label: '多遺傳' },
  { id: 'bloodline', label: '血系' }
]

export const LEOPARD_GECKO_GENES = [
  { id: 'normal', name: '原色', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'tremper', name: '川普白化', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'bell', name: '貝爾白化', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'rainwater', name: '雨水白化', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'eclipse', name: '日蝕', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'blizzard', name: '暴風雪', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'patternless', name: '莫菲無紋', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'marbleeye', name: '大理石眼', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'ndbe', name: '慾望黑眼', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'supergiant', name: '超級巨人', type: CALC_TYPES.REC, category: 'recessive' },

  { id: 'macksnow', name: '馬克雪花', type: CALC_TYPES.CODOM, category: 'codominant' },
  { id: 'lemonfrost', name: '檸檬霜', type: CALC_TYPES.CODOM, category: 'codominant' },

  { id: 'enigman', name: '謎', type: CALC_TYPES.DOM, category: 'dominant' },
  { id: 'whiteandyellow', name: '白黃', type: CALC_TYPES.DOM, category: 'dominant' },
  { id: 'tugsnow', name: '奧本雪花', type: CALC_TYPES.DOM, category: 'dominant' },
  { id: 'gemsnow', name: '寶石雪花', type: CALC_TYPES.DOM, category: 'dominant' },
  { id: 'pastel', name: '蠟筆', type: CALC_TYPES.DOM, category: 'dominant' },

  { id: 'tangerine', name: '橘化', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'hypo', name: '少斑', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'superhypo', name: '超級少斑', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'bold', name: '粗直線', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'jungle', name: '叢林', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'aberrant', name: '亂紋', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'blacknight', name: '黑夜', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'bandit', name: '土匪', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'highyellow', name: '高黃', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'patternless_stripe', name: '無紋直線', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'carrottail', name: '蘿蔔尾', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'carrothead', name: '蘿蔔頭', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'lavender', name: '薰衣草', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'melanistic', name: '黑化(Melanistic)', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'stripe', name: '直線', type: CALC_TYPES.POLY, category: 'polygenic' },
  { id: 'reversestripe', name: '反直線', type: CALC_TYPES.POLY, category: 'polygenic' },

  {
    id: 'mandarine',
    name: '蜜橘',
    type: CALC_TYPES.BLOOD,
    category: 'bloodline',
    baseGeneId: 'tangerine',
    group: '橘化血系'
  },
  {
    id: 'blood',
    name: '血橘',
    type: CALC_TYPES.BLOOD,
    category: 'bloodline',
    baseGeneId: 'tangerine',
    group: '橘化血系'
  },
  {
    id: 'inferno',
    name: '地獄',
    type: CALC_TYPES.BLOOD,
    category: 'bloodline',
    baseGeneId: 'tangerine',
    group: '橘化血系'
  },
  {
    id: 'electric',
    name: '電橘',
    type: CALC_TYPES.BLOOD,
    category: 'bloodline',
    baseGeneId: 'tangerine',
    group: '橘化血系'
  },
  {
    id: 'stonewash',
    name: '石洗',
    type: CALC_TYPES.BLOOD,
    category: 'bloodline',
    baseGeneId: 'tangerine',
    group: '橘化血系'
  },

  {
    id: 'raptor',
    name: '紅眼暴龍',
    type: CALC_TYPES.COMBO,
    group: '川普白化',
    components: [
      { geneId: 'tremper', type: 'Visual' },
      { geneId: 'eclipse', type: 'Visual' },
      { geneId: 'tangerine', type: 'Visual' },
      { geneId: 'patternless_stripe', type: 'Visual' },
      { geneId: 'carrottail', type: 'Visual' }
    ]
  },
  {
    id: 'aptor',
    name: '暴龍',
    type: CALC_TYPES.COMBO,
    group: '川普白化',
    components: [
      { geneId: 'tremper', type: 'Visual' },
      { geneId: 'tangerine', type: 'Visual' },
      { geneId: 'patternless_stripe', type: 'Visual' },
      { geneId: 'carrottail', type: 'Visual' }
    ]
  },
  {
    id: 'sunglow',
    name: '日焰',
    type: CALC_TYPES.COMBO,
    group: '川普白化',
    components: [
      { geneId: 'tremper', type: 'Visual' },
      { geneId: 'superhypo', type: 'Visual' },
      { geneId: 'tangerine', type: 'Visual' },
      { geneId: 'carrottail', type: 'Visual' }
    ]
  },
  {
    id: 'diabloblanco',
    name: '惡魔白酒',
    type: CALC_TYPES.COMBO,
    group: '川普白化',
    components: [
      { geneId: 'tremper', type: 'Visual' },
      { geneId: 'blizzard', type: 'Visual' },
      { geneId: 'eclipse', type: 'Visual' }
    ]
  },
  {
    id: 'ember',
    name: '灰燼',
    type: CALC_TYPES.COMBO,
    group: '川普白化',
    components: [
      { geneId: 'tremper', type: 'Visual' },
      { geneId: 'patternless', type: 'Visual' },
      { geneId: 'eclipse', type: 'Visual' }
    ]
  },
  {
    id: 'red_diamond',
    name: '紅鑽石',
    type: CALC_TYPES.COMBO,
    group: '川普白化',
    components: [
      { geneId: 'tremper', type: 'Visual' },
      { geneId: 'electric', type: 'Visual' },
      { geneId: 'bandit', type: 'Visual' }
    ]
  },
  {
    id: 'radar',
    name: '雷達',
    type: CALC_TYPES.COMBO,
    group: '貝爾白化',
    components: [
      { geneId: 'bell', type: 'Visual' },
      { geneId: 'eclipse', type: 'Visual' }
    ]
  },
  {
    id: 'whiteknight',
    name: '白騎士',
    type: CALC_TYPES.COMBO,
    group: '貝爾白化',
    components: [
      { geneId: 'bell', type: 'Visual' },
      { geneId: 'blizzard', type: 'Visual' },
      { geneId: 'eclipse', type: 'Visual' }
    ]
  },
  {
    id: 'aurora',
    name: '極光',
    type: CALC_TYPES.COMBO,
    group: '貝爾白化',
    components: [
      { geneId: 'whiteandyellow', type: 'Visual' },
      { geneId: 'bell', type: 'Visual' }
    ]
  },
  {
    id: 'typhoon',
    name: '颱風',
    type: CALC_TYPES.COMBO,
    group: '雨水白化',
    components: [
      { geneId: 'rainwater', type: 'Visual' },
      { geneId: 'eclipse', type: 'Visual' },
      { geneId: 'patternless_stripe', type: 'Visual' }
    ]
  },
  {
    id: 'cyclone',
    name: '旋風',
    type: CALC_TYPES.COMBO,
    group: '雨水白化',
    components: [
      { geneId: 'rainwater', type: 'Visual' },
      { geneId: 'patternless', type: 'Visual' },
      { geneId: 'eclipse', type: 'Visual' }
    ]
  },
  {
    id: 'supersnow',
    name: '超級雪花',
    type: CALC_TYPES.COMBO,
    group: '無白化',
    components: [{ geneId: 'macksnow', type: 'Super' }]
  },
  {
    id: 'galaxy',
    name: '銀河',
    type: CALC_TYPES.COMBO,
    group: '無白化',
    components: [
      { geneId: 'macksnow', type: 'Super' },
      { geneId: 'eclipse', type: 'Visual' }
    ]
  }
]

export const LEOPARD_GECKO_COMBO_RULES = [
  {
    name: '紅鑽石',
    required: [
      { id: 'tremper', z: ZYG.VIS },
      { id: 'electric', z: 'Any' },
      { id: 'bandit', z: 'Any' }
    ]
  },
  {
    name: '超級雪花白騎士',
    required: [
      { id: 'macksnow', z: ZYG.SUP },
      { id: 'bell', z: ZYG.VIS },
      { id: 'blizzard', z: ZYG.VIS },
      { id: 'eclipse', z: ZYG.VIS }
    ]
  },
  {
    name: '雪花白騎士',
    required: [
      { id: 'macksnow', z: ZYG.SGL },
      { id: 'bell', z: ZYG.VIS },
      { id: 'blizzard', z: ZYG.VIS },
      { id: 'eclipse', z: ZYG.VIS }
    ]
  },
  {
    name: '白騎士',
    required: [
      { id: 'bell', z: ZYG.VIS },
      { id: 'blizzard', z: ZYG.VIS },
      { id: 'eclipse', z: ZYG.VIS }
    ]
  },
  {
    name: '方解石',
    required: [
      { id: 'whiteandyellow', z: ZYG.VIS },
      { id: 'macksnow', z: ZYG.SGL },
      { id: 'bell', z: ZYG.VIS },
      { id: 'eclipse', z: ZYG.VIS },
      { id: 'enigman', z: ZYG.VIS }
    ]
  },
  {
    name: '聲納',
    required: [
      { id: 'macksnow', z: ZYG.SGL },
      { id: 'bell', z: ZYG.VIS },
      { id: 'eclipse', z: ZYG.VIS },
      { id: 'enigman', z: ZYG.VIS }
    ]
  },
  {
    name: '超級雷達',
    required: [
      { id: 'macksnow', z: ZYG.SUP },
      { id: 'bell', z: ZYG.VIS },
      { id: 'eclipse', z: ZYG.VIS }
    ]
  },
  {
    name: '雪花雷達',
    required: [
      { id: 'macksnow', z: ZYG.SGL },
      { id: 'bell', z: ZYG.VIS },
      { id: 'eclipse', z: ZYG.VIS }
    ]
  },
  {
    name: '雷達',
    required: [
      { id: 'bell', z: ZYG.VIS },
      { id: 'eclipse', z: ZYG.VIS }
    ]
  },
  {
    name: '超級颱風',
    required: [
      { id: 'macksnow', z: ZYG.SUP },
      { id: 'rainwater', z: ZYG.VIS },
      { id: 'eclipse', z: ZYG.VIS },
      { id: 'patternless_stripe', z: 'Any' }
    ]
  },
  {
    name: '雪花颱風',
    required: [
      { id: 'macksnow', z: ZYG.SGL },
      { id: 'rainwater', z: ZYG.VIS },
      { id: 'eclipse', z: ZYG.VIS },
      { id: 'patternless_stripe', z: 'Any' }
    ]
  },
  {
    name: '颱風',
    required: [
      { id: 'rainwater', z: ZYG.VIS },
      { id: 'eclipse', z: ZYG.VIS },
      { id: 'patternless_stripe', z: 'Any' }
    ]
  },
  {
    name: '超級雪花惡魔白酒',
    required: [
      { id: 'macksnow', z: ZYG.SUP },
      { id: 'tremper', z: ZYG.VIS },
      { id: 'blizzard', z: ZYG.VIS },
      { id: 'eclipse', z: ZYG.VIS }
    ]
  },
  {
    name: '雪花惡魔白酒',
    required: [
      { id: 'macksnow', z: ZYG.SGL },
      { id: 'tremper', z: ZYG.VIS },
      { id: 'blizzard', z: ZYG.VIS },
      { id: 'eclipse', z: ZYG.VIS }
    ]
  },
  {
    name: '惡魔白酒',
    required: [
      { id: 'tremper', z: ZYG.VIS },
      { id: 'blizzard', z: ZYG.VIS },
      { id: 'eclipse', z: ZYG.VIS }
    ]
  },
  {
    name: '紅眼暴龍',
    required: [
      { id: 'tremper', z: ZYG.VIS },
      { id: 'eclipse', z: ZYG.VIS },
      { id: 'tangerine', z: 'Any' }
    ]
  },
  {
    name: '暴龍',
    required: [
      { id: 'tremper', z: ZYG.VIS },
      { id: 'tangerine', z: 'Any' }
    ]
  },
  {
    name: '日焰',
    required: [
      { id: 'tremper', z: ZYG.VIS },
      { id: 'superhypo', z: 'Any' },
      { id: 'tangerine', z: 'Any' }
    ]
  },
  { name: '超級雪花', required: [{ id: 'macksnow', z: ZYG.SUP }] }
]

export const LEOPARD_GECKO_CHECKS = {
  validateAlbinos: (allGenes: any[]) => {
    const albinoTypes = ['tremper', 'bell', 'rainwater']
    const albinoGenes = allGenes.filter((gene) => albinoTypes.includes(gene.geneId))

    if (albinoGenes.length > 1) {
      return {
        hasWarning: true,
        warning: '不同白化基因 (川普/貝爾/雨水) 互配，子代將不表現白化且造成基因混亂。\n'
      }
    }

    return { hasWarning: false }
  }
}

export const LEOPARD_GECKO_WARNINGS = [
  { check: 'lemonfrost', message: '檸檬霜 (Lemon Frost) 可能帶有腫瘤風險。\n' },
  { check: 'enigman', message: '謎 (Enigma) 可能伴隨 Enigma Syndrome。\n' },
  { check: 'whiteandyellow', message: 'WY 可能伴隨神經症狀，請留意個體差異。\n' }
]

export const LeopardGeckoConfig = {
  id: 'lg',
  name: '豹紋守宮',
  geneCategories: LEOPARD_GECKO_GENE_CATEGORIES,
  genes: LEOPARD_GECKO_GENES,
  presetMorphs: LEOPARD_GECKO_GENES.filter(
    (gene) => Array.isArray(gene.components) && gene.components.length > 0
  ),
  comboRules: LEOPARD_GECKO_COMBO_RULES,
  checks: LEOPARD_GECKO_CHECKS,
  warnings: LEOPARD_GECKO_WARNINGS
}

export default LeopardGeckoConfig
