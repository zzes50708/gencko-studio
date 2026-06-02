// 肥尾守宮 (African Fat-Tailed Gecko) 完整基因配置
// 此文件包含所有肥尾守宮的基因定義與物種特定檢查邏輯
// ⚠️ 警告：基因的 id 和 name 對應必須與原始定義完全一致

import { ZYG } from '../genes.js'

const CALC_TYPES = { DOM: '顯性', REC: '隱性', CODOM: '共顯性', POLY: '多遺傳', COMBO: '品系', BLOOD: '血系' }

// ============================================
// 1. 肥尾守宮所有基因定義
// ============================================
export const AFT_GECKO_GENES = [
    { id: 'aft_normal', name: '原色', type: CALC_TYPES.REC },
    { id: 'aft_albino', name: '橘白化', type: CALC_TYPES.REC },
    { id: 'aft_oreo', name: '奧利奧', type: CALC_TYPES.REC },
    { id: 'aft_zulu', name: '祖魯', type: CALC_TYPES.REC },
    { id: 'aft_ghost', name: '幽靈', type: CALC_TYPES.REC },
    { id: 'aft_patternless', name: '無紋', type: CALC_TYPES.REC },
    { id: 'aft_caramel', name: '焦糖', type: CALC_TYPES.REC },
    { id: 'aft_whiteout', name: '立可白', type: CALC_TYPES.CODOM },
    { id: 'aft_zero', name: '零', type: CALC_TYPES.CODOM },
    { id: 'aft_straight', name: '直線', type: CALC_TYPES.DOM }
]

// ============================================
// 2. 肥尾守宮組合規則（目前無）
// ============================================
export const AFT_GECKO_COMBO_RULES = []

// ============================================
// 3. 肥尾守宮特定的檢查函數
// ============================================
export const AFT_GECKO_CHECKS = {
    // 檢查母焦糖不孕
    validateCaramelFemale: (femaleGenes) => {
        const hasCaramel = femaleGenes.some(g => g.geneId === 'aft_caramel')
        if (hasCaramel) {
            return {
                hasWarning: true,
                warning: "母焦糖 (Caramel) 會有不孕問題。\n"
            }
        }
        return { hasWarning: false }
    },

    // 檢查母幽靈不孕
    validateGhostFemale: (femaleGenes) => {
        const hasGhost = femaleGenes.some(g => g.geneId === 'aft_ghost')
        if (hasGhost) {
            return {
                hasWarning: true,
                warning: "母幽靈 (Ghost) 會有不孕問題。\n"
            }
        }
        return { hasWarning: false }
    }
}

// ============================================
// 4. 肥尾守宮物種級警告
// ============================================
export const AFT_GECKO_WARNINGS = [
    { check: 'aft_whiteout_super', message: "超級立可白為致死基因。\n" }
]

// ============================================
// 5. 完整的肥尾守宮配置物件
// ============================================
export const AFTailGeckoConfig = {
    id: 'aft',
    name: '肥尾守宮',
    genes: AFT_GECKO_GENES,
    comboRules: AFT_GECKO_COMBO_RULES,
    checks: AFT_GECKO_CHECKS,
    warnings: AFT_GECKO_WARNINGS
}

export default AFTailGeckoConfig
