import { CALC_TYPES } from '../genes.js'

export const AFT_GECKO_GENE_CATEGORIES = [
  { id: 'recessive', label: '隱性' },
  { id: 'codominant', label: '共顯性' },
  { id: 'dominant', label: '顯性' },
  { id: 'polygenic', label: '多遺傳' },
  { id: 'bloodline', label: '血系' }
]

export const AFT_GECKO_GENES = [
  { id: 'aft_normal', name: '原色', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'aft_albino', name: '橘白化', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'aft_oreo', name: '奧利奧', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'aft_zulu', name: '祖魯', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'aft_ghost', name: '幽靈', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'aft_patternless', name: '無紋', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'aft_caramel', name: '焦糖', type: CALC_TYPES.REC, category: 'recessive' },
  { id: 'aft_whiteout', name: '立可白', type: CALC_TYPES.CODOM, category: 'codominant' },
  { id: 'aft_zero', name: '零', type: CALC_TYPES.CODOM, category: 'codominant' },
  { id: 'aft_straight', name: '直線', type: CALC_TYPES.DOM, category: 'dominant' }
]

export const AFT_GECKO_COMBO_RULES = []

export const AFT_GECKO_CHECKS = {
  validateCaramelFemale: (femaleGenes) => {
    const hasCaramel = femaleGenes.some((gene) => gene.geneId === 'aft_caramel')
    if (!hasCaramel) return { hasWarning: false }

    return {
      hasWarning: true,
      warning: '母焦糖 (Caramel) 會有不孕問題。\n'
    }
  },
  validateGhostFemale: (femaleGenes) => {
    const hasGhost = femaleGenes.some((gene) => gene.geneId === 'aft_ghost')
    if (!hasGhost) return { hasWarning: false }

    return {
      hasWarning: true,
      warning: '母幽靈 (Ghost) 會有不孕問題。\n'
    }
  }
}

export const AFT_GECKO_WARNINGS = [
  { check: 'aft_whiteout_super', message: '超級立可白為致死基因。\n' }
]

export const AFTailGeckoConfig = {
  id: 'aft',
  name: '肥尾守宮',
  geneCategories: AFT_GECKO_GENE_CATEGORIES,
  genes: AFT_GECKO_GENES,
  presetMorphs: [],
  comboRules: AFT_GECKO_COMBO_RULES,
  checks: AFT_GECKO_CHECKS,
  warnings: AFT_GECKO_WARNINGS
}

export default AFTailGeckoConfig
