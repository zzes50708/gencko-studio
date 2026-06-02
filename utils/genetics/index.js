// 遺傳學配置統一導出點
// 此文件管理所有物種的基因配置

import LeopardGeckoConfig from './leopardgecko.config.js'
import AFTailGeckoConfig from './afttail.config.js'

export { LeopardGeckoConfig, LEOPARD_GECKO_GENES, LEOPARD_GECKO_COMBO_RULES } from './leopardgecko.config.js'
export { AFTailGeckoConfig, AFT_GECKO_GENES, AFT_GECKO_COMBO_RULES } from './afttail.config.js'

// 物種配置映射表
export const SPECIES_CONFIGS = {
    '豹紋守宮': LeopardGeckoConfig,
    '肥尾守宮': AFTailGeckoConfig
}

// 便捷函數：根據物種名稱取得配置
export function getSpeciesConfig(speciesName) {
    return SPECIES_CONFIGS[speciesName] || null
}
