import LeopardGeckoConfig from './leopardgecko.config.js'
import AFTailGeckoConfig from './afttail.config.js'
import BallPythonConfig from './ballpython.config.js'

export {
  LeopardGeckoConfig,
  LEOPARD_GECKO_GENES,
  LEOPARD_GECKO_COMBO_RULES,
  LEOPARD_GECKO_GENE_CATEGORIES
} from './leopardgecko.config.js'
export {
  AFTailGeckoConfig,
  AFT_GECKO_GENES,
  AFT_GECKO_COMBO_RULES,
  AFT_GECKO_GENE_CATEGORIES
} from './afttail.config.js'
export {
  BallPythonConfig,
  BALL_PYTHON_GENES,
  BALL_PYTHON_COMBO_RULES,
  BALL_PYTHON_GENE_CATEGORIES
} from './ballpython.config.js'

export const SPECIES_CONFIGS = {
  豹紋守宮: LeopardGeckoConfig,
  肥尾守宮: AFTailGeckoConfig,
  豬鼻蛇: BallPythonConfig
}

export function getSpeciesConfig(speciesName) {
  return SPECIES_CONFIGS[speciesName] || null
}
