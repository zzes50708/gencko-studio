// 豹紋守宮 (Leopard Gecko) 完整基因配置
// 此文件包含所有豹紋守宮的基因定義、組合規則與物種特定檢查邏輯
// ⚠️ 警告：基因的 id 和 name 對應必須與原始定義完全一致

import { ZYG } from '../genes.js'

const CALC_TYPES = { DOM: '顯性', REC: '隱性', CODOM: '共顯性', POLY: '多遺傳', COMBO: '品系', BLOOD: '血系' }

// ============================================
// 1. 豹紋守宮所有基因定義
// ============================================
export const LEOPARD_GECKO_GENES = [
    { id: 'normal', name: '原色', type: CALC_TYPES.REC },
    { id: 'tremper', name: '川普白化', type: CALC_TYPES.REC },
    { id: 'bell', name: '貝爾白化', type: CALC_TYPES.REC },
    { id: 'rainwater', name: '雨水白化', type: CALC_TYPES.REC },
    { id: 'eclipse', name: '日蝕', type: CALC_TYPES.REC },
    { id: 'blizzard', name: '暴風雪', type: CALC_TYPES.REC },
    { id: 'patternless', name: '莫菲無紋', type: CALC_TYPES.REC },
    { id: 'marbleeye', name: '大理石眼', type: CALC_TYPES.REC },
    { id: 'ndbe', name: '慾望黑眼', type: CALC_TYPES.REC },
    { id: 'supergiant', name: '超級巨人', type: CALC_TYPES.REC },
    { id: 'macksnow', name: '馬克雪花', type: CALC_TYPES.CODOM },
    { id: 'lemonfrost', name: '檸檬霜', type: CALC_TYPES.CODOM },
    { id: 'enigman', name: '謎', type: CALC_TYPES.DOM },
    { id: 'whiteandyellow', name: '白黃', type: CALC_TYPES.DOM },
    { id: 'tugsnow', name: '奧本雪花', type: CALC_TYPES.DOM },
    { id: 'gemsnow', name: '寶石雪花', type: CALC_TYPES.DOM },
    { id: 'pastel', name: '蠟筆', type: CALC_TYPES.DOM },
    { id: 'tangerine', name: '橘化', type: CALC_TYPES.POLY },
    { id: 'hypo', name: '少斑', type: CALC_TYPES.POLY },
    { id: 'superhypo', name: '超級少斑', type: CALC_TYPES.POLY },
    { id: 'bold', name: '粗直線', type: CALC_TYPES.POLY },
    { id: 'jungle', name: '叢林', type: CALC_TYPES.POLY },
    { id: 'aberrant', name: '亂紋', type: CALC_TYPES.POLY },
    { id: 'blacknight', name: '黑夜', type: CALC_TYPES.POLY },
    { id: 'bandit', name: '土匪', type: CALC_TYPES.POLY },
    { id: 'highyellow', name: '高黃', type: CALC_TYPES.POLY },
    { id: 'patternless_stripe', name: '無紋直線', type: CALC_TYPES.POLY },
    { id: 'carrottail', name: '蘿蔔尾', type: CALC_TYPES.POLY },
    { id: 'carrothead', name: '蘿蔔頭', type: CALC_TYPES.POLY },
    { id: 'lavender', name: '薰衣草', type: CALC_TYPES.POLY },
    { id: 'melanistic', name: '黑化(Melanistic)', type: CALC_TYPES.POLY },
    { id: 'stripe', name: '直線', type: CALC_TYPES.POLY },
    { id: 'reversestripe', name: '反直線', type: CALC_TYPES.POLY },
    { id: 'mandarine', name: '蜜橘', type: CALC_TYPES.BLOOD, baseGeneId: 'tangerine', group: '橘化血系' },
    { id: 'blood', name: '血橘', type: CALC_TYPES.BLOOD, baseGeneId: 'tangerine', group: '橘化血系' },
    { id: 'inferno', name: '地獄', type: CALC_TYPES.BLOOD, baseGeneId: 'tangerine', group: '橘化血系' },
    { id: 'electric', name: '電橘', type: CALC_TYPES.BLOOD, baseGeneId: 'tangerine', group: '橘化血系' },
    { id: 'stonewash', name: '石洗', type: CALC_TYPES.BLOOD, baseGeneId: 'tangerine', group: '橘化血系' },

    // 品系組合
    { id: 'raptor', name: '紅眼暴龍', type: CALC_TYPES.COMBO, group: '川普白化', components:[{geneId:'tremper',type:'Visual'},{geneId:'eclipse',type:'Visual'},{geneId:'tangerine',type:'Visual'},{geneId:'patternless_stripe',type:'Visual'},{geneId:'carrottail',type:'Visual'}] },
    { id: 'aptor', name: '暴龍', type: CALC_TYPES.COMBO, group: '川普白化', components:[{geneId:'tremper',type:'Visual'},{geneId:'tangerine',type:'Visual'},{geneId:'patternless_stripe',type:'Visual'},{geneId:'carrottail',type:'Visual'}] },
    { id: 'sunglow', name: '日焰', type: CALC_TYPES.COMBO, group: '川普白化', components:[{geneId:'tremper',type:'Visual'},{geneId:'superhypo',type:'Visual'},{geneId:'tangerine',type:'Visual'},{geneId:'carrottail',type:'Visual'}] },
    { id: 'diabloblanco', name: '惡魔白酒', type: CALC_TYPES.COMBO, group: '川普白化', components:[{geneId:'tremper',type:'Visual'},{geneId:'blizzard',type:'Visual'},{geneId:'eclipse',type:'Visual'}] },
    { id: 'ember', name: '灰燼', type: CALC_TYPES.COMBO, group: '川普白化', components:[{geneId:'tremper',type:'Visual'},{geneId:'patternless',type:'Visual'},{geneId:'eclipse',type:'Visual'}] },
    { id: 'red_diamond', name: '紅鑽石', type: CALC_TYPES.COMBO, group: '川普白化', components:[{geneId:'tremper',type:'Visual'},{geneId:'electric',type:'Visual'},{geneId:'bandit',type:'Visual'}] },
    { id: 'radar', name: '雷達', type: CALC_TYPES.COMBO, group: '貝爾白化', components:[{geneId:'bell',type:'Visual'},{geneId:'eclipse',type:'Visual'}] },
    { id: 'whiteknight', name: '白騎士', type: CALC_TYPES.COMBO, group: '貝爾白化', components:[{geneId:'bell',type:'Visual'},{geneId:'blizzard',type:'Visual'},{geneId:'eclipse',type:'Visual'}] },
    { id: 'aurora', name: '極光', type: CALC_TYPES.COMBO, group: '貝爾白化', components:[{geneId:'whiteandyellow',type:'Visual'},{geneId:'bell',type:'Visual'}] },
    { id: 'typhoon', name: '颱風', type: CALC_TYPES.COMBO, group: '雨水白化', components:[{geneId:'rainwater',type:'Visual'},{geneId:'eclipse',type:'Visual'},{geneId:'patternless_stripe',type:'Visual'}] },
    { id: 'cyclone', name: '旋風', type: CALC_TYPES.COMBO, group: '雨水白化', components:[{geneId:'rainwater',type:'Visual'},{geneId:'patternless',type:'Visual'},{geneId:'eclipse',type:'Visual'}] },
    { id: 'supersnow', name: '超級雪花', type: CALC_TYPES.COMBO, group: '無白化', components:[{geneId:'macksnow',type:'Super'}] },
    { id: 'galaxy', name: '銀河', type: CALC_TYPES.COMBO, group: '無白化', components:[{geneId:'macksnow',type:'Super'},{geneId:'eclipse',type:'Visual'}] }
]

// ============================================
// 2. 豹紋守宮組合規則
// ============================================
export const LEOPARD_GECKO_COMBO_RULES = [
    { name: '紅鑽石', required:[{id:'tremper', z:ZYG.VIS}, {id:'electric', z:'Any'}, {id:'bandit', z:'Any'}] },
    { name: '超級雪花白騎士', required:[{id:'macksnow', z:ZYG.SUP}, {id:'bell', z:ZYG.VIS}, {id:'blizzard', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}] },
    { name: '雪花白騎士', required:[{id:'macksnow', z:ZYG.SGL}, {id:'bell', z:ZYG.VIS}, {id:'blizzard', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}] },
    { name: '白騎士', required:[{id:'bell', z:ZYG.VIS}, {id:'blizzard', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}] },
    { name: '方解石', required:[{id:'whiteandyellow', z:ZYG.VIS}, {id:'macksnow', z:ZYG.SGL}, {id:'bell', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}, {id:'enigman', z:ZYG.VIS}] },
    { name: '聲納', required:[{id:'macksnow', z:ZYG.SGL}, {id:'bell', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}, {id:'enigman', z:ZYG.VIS}] },
    { name: '超級雷達', required:[{id:'macksnow', z:ZYG.SUP}, {id:'bell', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}] },
    { name: '雪花雷達', required:[{id:'macksnow', z:ZYG.SGL}, {id:'bell', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}] },
    { name: '雷達', required:[{id:'bell', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}] },
    { name: '超級颱風', required:[{id:'macksnow', z:ZYG.SUP}, {id:'rainwater', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}, {id:'patternless_stripe', z:'Any'}] },
    { name: '雪花颱風', required:[{id:'macksnow', z:ZYG.SGL}, {id:'rainwater', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}, {id:'patternless_stripe', z:'Any'}] },
    { name: '颱風', required:[{id:'rainwater', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}, {id:'patternless_stripe', z:'Any'}] },
    { name: '超級雪花惡魔白酒', required:[{id:'macksnow', z:ZYG.SUP}, {id:'tremper', z:ZYG.VIS}, {id:'blizzard', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}] },
    { name: '雪花惡魔白酒', required:[{id:'macksnow', z:ZYG.SGL}, {id:'tremper', z:ZYG.VIS}, {id:'blizzard', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}] },
    { name: '惡魔白酒', required:[{id:'tremper', z:ZYG.VIS}, {id:'blizzard', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}] },
    { name: '紅眼暴龍', required:[{id:'tremper', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}, {id:'tangerine', z:'Any'}] },
    { name: '暴龍', required:[{id:'tremper', z:ZYG.VIS}, {id:'tangerine', z:'Any'}] },
    { name: '超級暴風雪', required:[{id:'blizzard', z:ZYG.VIS}, {id:'tremper', z:ZYG.VIS}] },
    { name: '日焰', required:[{id:'tremper', z:ZYG.VIS}, {id:'superhypo', z:'Any'}, {id:'tangerine', z:'Any'}] },
    { name: '超級雪花', required: [{id:'macksnow', z:ZYG.SUP}] },
]

// ============================================
// 3. 豹紋守宮特定的檢查函數
// ============================================
export const LEOPARD_GECKO_CHECKS = {
    // 檢查白化基因互斥
    validateAlbinos: (allGenes, defs) => {
        const albinoTypes = ['tremper', 'bell', 'rainwater']
        const albinoGenes = allGenes.filter(g => albinoTypes.includes(g.geneId))

        if (albinoGenes.length > 1) {
            return {
                hasWarning: true,
                warning: "不同白化基因 (川普/貝爾/雨水) 互配，子代將不表現白化且造成基因混亂。\n"
            }
        }
        return { hasWarning: false }
    }
}

// ============================================
// 4. 豹紋守宮物種級警告
// ============================================
export const LEOPARD_GECKO_WARNINGS = [
    { check: 'lemonfrost', message: "檸檬霜 (Lemon Frost) 易導致腫瘤。\n" },
    { check: 'enigman', message: "謎 (Enigma) 可能伴隨神經症狀 (ES)。" },
    { check: 'whiteandyellow', message: "白黃 (W&Y) 可能伴隨輕微神經症狀。" }
]

// ============================================
// 5. 完整的豹紋守宮配置物件
// ============================================
export const LeopardGeckoConfig = {
    id: 'lg',
    name: '豹紋守宮',
    genes: LEOPARD_GECKO_GENES,
    comboRules: LEOPARD_GECKO_COMBO_RULES,
    checks: LEOPARD_GECKO_CHECKS,
    warnings: LEOPARD_GECKO_WARNINGS
}

export default LeopardGeckoConfig
