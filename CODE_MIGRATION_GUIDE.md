# 遺傳學計算重構 - 代碼遷移指南

## 概述
本指南展示重構前後的代碼對比，幫助理解改動內容。

---

## 1. 計算函數簽名變更

### 舊代碼 (utils/calcUtils.js)
```javascript
// 舊函數簽名
export function calculateGenetics(species, maleGenes, femaleGenes, defs) {
    // species: '豹紋守宮' 或 '肥尾守宮' (字符串)
    // defs: GENE_DEFINITIONS[species] (陣列)
    // ...
}

// 在 genes.js 中硬編碼
const GENE_DEFINITIONS = {
    '豹紋守宮': [ { id: 'normal', name: '原色', ... }, ... ],
    '肥尾守宮': [ { id: 'aft_normal', name: '原色', ... }, ... ]
}

const CALC_COMBO_RULES = {
    '豹紋守宮': [ ... 20 個規則 ... ],
    '肥尾守宮': [ ]
}

const CALC_SPECIES = ['豹紋守宮', '肥尾守宮']
```

### 新代碼 (utils/calcUtils.js)
```javascript
// 新函數簽名
export function calculateGenetics(speciesConfig, maleGenes, femaleGenes) {
    // speciesConfig: 物種配置物件，包含 genes, comboRules, checks, warnings
    // ...
    const defs = speciesConfig.genes
    const comboRules = speciesConfig.comboRules || []
    const checks = speciesConfig.checks || {}
    const speciesWarnings = speciesConfig.warnings || []
}

// 在 utils/genetics/index.js 中動態管理
export const SPECIES_CONFIGS = {
    '豹紋守宮': LeopardGeckoConfig,
    '肥尾守宮': AFTailGeckoConfig
}

export function getSpeciesConfig(speciesName) {
    return SPECIES_CONFIGS[speciesName] || null
}
```

---

## 2. 警告檢查邏輯重構

### 舊代碼：硬編碼物種檢查

```javascript
// 行 55-59：豹紋守宮白化基因互斥檢查
if (species === '豹紋守宮') {
    const albinoTypes = ['tremper', 'bell', 'rainwater']
    const albinoGenes = allGenes.filter(g => albinoTypes.includes(g.geneId))
    if (albinoGenes.length > 1) {
        warning += "不同白化基因 (川普/貝爾/雨水) 互配，子代將不表現白化且造成基因混亂。\n"
    }
}

// 行 60-67：肥尾守宮母焦糖檢查
if (species === '肥尾守宮') {
    const hasCaramel = femaleGenes.some(g => g.geneId === 'aft_caramel')
    if (hasCaramel) {
        warning += "母焦糖 (Caramel) 會有不孕問題。\n"
    }
}

// 行 68-75：肥尾守宮母幽靈檢查
if (species === '肥尾守宮') {
    const hasGhost = femaleGenes.some(g => g.geneId === 'aft_ghost')
    if (hasGhost) {
        warning += "母幽靈 (Ghost) 會有不孕問題。\n"
    }
}

// 行 76-82：物種級警告（再次硬編碼）
const speciesWarnings = species === '豹紋守宮' ? [
    { check: 'lemonfrost', message: "檸檬霜 (Lemon Frost) 易導致腫瘤。\n" },
    { check: 'enigman', message: "謎 (Enigma) 可能伴隨神經症狀 (ES)。" },
    { check: 'whiteandyellow', message: "白黃 (W&Y) 可能伴隨輕微神經症狀。" }
] : species === '肥尾守宮' ? [
    { check: 'aft_whiteout_super', message: "超級立可白為致死基因。\n" }
] : []

speciesWarnings.forEach(w => {
    if(allGenes.some(g => g.geneId === w.check)) {
        warning += w.message
    }
})
```

### 新代碼：動態配置讀取

```javascript
// 從配置讀取警告
const speciesWarnings = speciesConfig.warnings || []
speciesWarnings.forEach(w => {
    if(allGenes.some(g => g.geneId === w.check)) {
        warning += w.message
    }
})

// 執行物種特定檢查
if (checks.validateAlbinos) {
    const albinoCheck = checks.validateAlbinos(allGenes, defs)
    if (albinoCheck && albinoCheck.hasWarning) {
        warning += albinoCheck.warning
    }
}

if (checks.validateCaramelFemale) {
    const caramelCheck = checks.validateCaramelFemale(femaleGenes)
    if (caramelCheck && caramelCheck.hasWarning) {
        warning += caramelCheck.warning
    }
}

if (checks.validateGhostFemale) {
    const ghostCheck = checks.validateGhostFemale(femaleGenes)
    if (ghostCheck && ghostCheck.hasWarning) {
        warning += ghostCheck.warning
    }
}
```

---

## 3. 組合規則動態應用

### 舊代碼：硬編碼 CALC_COMBO_RULES

```javascript
// 行 199：硬編碼規則引用
const comboRules = CALC_COMBO_RULES[species] || []

comboRules.forEach(rule => {
    const met = rule.required.every(r => {
        const match = visualGenes.find(a => a.geneId === r.id)
        if(!match || consumed.has(match.geneId)) return false
        if(r.z === 'Any') return true
        return match.zygosity === r.z
    })
    if(met) {
        descParts.push(rule.name)
        rule.required.forEach(r => consumed.add(r.id))
    }
})
```

### 新代碼：從 speciesConfig 提取

```javascript
// 行 23：動態提取
const comboRules = speciesConfig.comboRules || []

// 其餘邏輯完全相同
comboRules.forEach(rule => {
    const met = rule.required.every(r => {
        const match = visualGenes.find(a => a.geneId === r.id)
        if(!match || consumed.has(match.geneId)) return false
        if(r.z === 'Any') return true
        return match.zygosity === r.z
    })
    if(met) {
        descParts.push(rule.name)
        rule.required.forEach(r => consumed.add(r.id))
    }
})
```

---

## 4. 結果排序新功能

### 舊代碼：按機率排序

```javascript
// 行 367：簡單的機率排序
finalOutcomes.sort((a,b) => b.prob - a.prob)
```

### 新代碼：按完整表現隱性基因數優先排序

```javascript
// 行 346-357：計算完整表現隱性基因數
let completeExpressionCount = 0
raw.forEach(r => {
    r.gens.forEach(g => {
        const gDef = defs.find(d => d.id === g.geneId)
        if(gDef && gDef.type === CALC_TYPES.REC && g.zygosity === ZYG.VIS) {
            completeExpressionCount++
        }
    })
})
completeExpressionCount = completeExpressionCount / raw.length

// 行 359-365：添加到結果物件
finalOutcomes.push({
    description: name,
    fullLabel: fullLabel,
    prob: prob,
    completeExpressionCount: completeExpressionCount,
    gens: [ ]
})

// 行 370-375：複層排序邏輯
finalOutcomes.sort((a,b) => {
    if(a.completeExpressionCount !== b.completeExpressionCount) {
        return b.completeExpressionCount - a.completeExpressionCount
    }
    return b.prob - a.prob
})
```

---

## 5. 前端頁面變更

### 舊代碼 (pages/calculator.vue)

```javascript
// 舊導入
import { ZYG, CALC_TYPES, GENE_DEFINITIONS } from '~/utils/genes.js'
import { calculateGenetics, getProbFraction } from '~/utils/calcUtils.js'

// 舊計算邏輯
const calcCurrentDefs = computed(() => GENE_DEFINITIONS[calcSp.value] || [])

const calcRun = () => {
    if (calcMale.value.length === 0 && calcFemale.value.length === 0) {
        calcResult.value = null
        return
    }
    calcResult.value = calculateGenetics(
        calcSp.value,                                            // 物種字符串
        JSON.parse(JSON.stringify(calcMale.value)),
        JSON.parse(JSON.stringify(calcFemale.value)),
        calcCurrentDefs.value                                     // 基因陣列
    )
}
```

### 新代碼 (pages/calculator.vue)

```javascript
// 新導入
import { ZYG, CALC_TYPES } from '~/utils/genes.js'
import { calculateGenetics, getProbFraction } from '~/utils/calcUtils.js'
import { getSpeciesConfig } from '~/utils/genetics/index.js'

// 新計算邏輯
const currentSpeciesConfig = computed(() => getSpeciesConfig(calcSp.value))
const calcCurrentDefs = computed(() => currentSpeciesConfig.value?.genes || [])

const calcRun = () => {
    if (calcMale.value.length === 0 && calcFemale.value.length === 0) {
        calcResult.value = null
        return
    }
    calcResult.value = calculateGenetics(
        currentSpeciesConfig.value,                               // 配置物件
        JSON.parse(JSON.stringify(calcMale.value)),
        JSON.parse(JSON.stringify(calcFemale.value))
        // 不再需要傳遞基因陣列
    )
}
```

---

## 6. 新物種配置結構

### 配置物件結構 (utils/genetics/*.config.js)

```javascript
// ============================================
// 1. 基因定義
// ============================================
export const SPECIES_GECKO_GENES = [
    { id: 'gene_id', name: '基因名稱', type: CALC_TYPES.REC },
    // ...
]

// ============================================
// 2. 品系組合規則
// ============================================
export const SPECIES_GECKO_COMBO_RULES = [
    { name: '品系名稱', required: [{id: 'gene_id', z: ZYG.VIS}, ...] },
    // ...
]

// ============================================
// 3. 物種特定檢查函數
// ============================================
export const SPECIES_GECKO_CHECKS = {
    validateAlbinos: (allGenes, defs) => ({
        hasWarning: boolean,
        warning: string
    }),
    validateCaramelFemale: (femaleGenes) => ({
        hasWarning: boolean,
        warning: string
    }),
    // ...
}

// ============================================
// 4. 物種級警告
// ============================================
export const SPECIES_GECKO_WARNINGS = [
    { check: 'gene_id', message: "警告信息\n" },
    // ...
]

// ============================================
// 5. 統一配置物件
// ============================================
export const SpeciesGeckoConfig = {
    id: 'sg',
    name: '物種名稱',
    genes: SPECIES_GECKO_GENES,
    comboRules: SPECIES_GECKO_COMBO_RULES,
    checks: SPECIES_GECKO_CHECKS,
    warnings: SPECIES_GECKO_WARNINGS
}

export default SpeciesGeckoConfig
```

---

## 7. 中央導出點

### utils/genetics/index.js

```javascript
import LeopardGeckoConfig from './leopardgecko.config.js'
import AFTailGeckoConfig from './afttail.config.js'

export { LeopardGeckoConfig, LEOPARD_GECKO_GENES, LEOPARD_GECKO_COMBO_RULES }
export { AFTailGeckoConfig, AFT_GECKO_GENES, AFT_GECKO_COMBO_RULES }

// 物種配置映射表
export const SPECIES_CONFIGS = {
    '豹紋守宮': LeopardGeckoConfig,
    '肥尾守宮': AFTailGeckoConfig
}

// 便捷查詢函數
export function getSpeciesConfig(speciesName) {
    return SPECIES_CONFIGS[speciesName] || null
}
```

---

## 8. 添加新物種的步驟

### 步驟 1：創建配置文件

創建 `utils/genetics/mynewspecies.config.js`：

```javascript
import { ZYG } from '../genes.js'

const CALC_TYPES = { DOM: '顯性', REC: '隱性', CODOM: '共顯性', POLY: '多遺傳', COMBO: '品系', BLOOD: '血系' }

export const MY_NEW_SPECIES_GENES = [
    { id: 'species_gene1', name: '基因名稱1', type: CALC_TYPES.REC },
    // ... 所有基因
]

export const MY_NEW_SPECIES_COMBO_RULES = [
    // ... 組合規則 (若有)
]

export const MY_NEW_SPECIES_CHECKS = {
    // ... 檢查函數 (若有)
}

export const MY_NEW_SPECIES_WARNINGS = [
    // ... 物種級警告 (若有)
]

export const MyNewSpeciesConfig = {
    id: 'mns',
    name: '新物種名稱',
    genes: MY_NEW_SPECIES_GENES,
    comboRules: MY_NEW_SPECIES_COMBO_RULES,
    checks: MY_NEW_SPECIES_CHECKS,
    warnings: MY_NEW_SPECIES_WARNINGS
}

export default MyNewSpeciesConfig
```

### 步驟 2：更新中央導出點

修改 `utils/genetics/index.js`：

```javascript
import MyNewSpeciesConfig from './mynewspecies.config.js'

export { MyNewSpeciesConfig, MY_NEW_SPECIES_GENES, MY_NEW_SPECIES_COMBO_RULES }

export const SPECIES_CONFIGS = {
    '豹紋守宮': LeopardGeckoConfig,
    '肥尾守宮': AFTailGeckoConfig,
    '新物種名稱': MyNewSpeciesConfig  // 新增
}
```

### 步驟 3：更新前端 (可選)

在 `pages/calculator.vue` 中添加新物種選項：

```javascript
// 舊
<div class="tab" :class="{active: calcSp === '豹紋守宮'}" @click="calcSp = '豹紋守宮'">豹紋守宮</div>
<div class="tab" :class="{active: calcSp === '肥尾守宮'}" @click="calcSp = '肥尾守宮'">肥尾守宮</div>

// 新
<div class="tab" :class="{active: calcSp === '豹紋守宮'}" @click="calcSp = '豹紋守宮'">豹紋守宮</div>
<div class="tab" :class="{active: calcSp === '肥尾守宮'}" @click="calcSp = '肥尾守宮'">肥尾守宮</div>
<div class="tab" :class="{active: calcSp === '新物種名稱'}" @click="calcSp = '新物種名稱'">新物種名稱</div>
```

### 步驟 4：完成

不需要修改 `utils/calcUtils.js`！

---

## 9. 數據流對比

### 舊數據流

```
pages/calculator.vue
    ↓
選擇物種 (字符串: '豹紋守宮')
    ↓
從 GENE_DEFINITIONS['豹紋守宮'] 獲取基因陣列
    ↓
從 CALC_COMBO_RULES['豹紋守宮'] 獲取規則
    ↓
調用 calculateGenetics(species, male, female, defs)
    ├─ 在函數內部判斷 species 執行相應檢查
    └─ 在函數內部判斷 species 應用相應規則
    ↓
返回計算結果
```

### 新數據流

```
pages/calculator.vue
    ↓
選擇物種 (字符串: '豹紋守宮')
    ↓
通過 getSpeciesConfig('豹紋守宮') 獲取配置物件
    ├─ 包含：genes, comboRules, checks, warnings
    └─ 配置物件由 utils/genetics/index.js 提供
    ↓
調用 calculateGenetics(config, male, female)
    ├─ 從 config.genes 提取基因定義
    ├─ 從 config.comboRules 提取組合規則
    ├─ 執行 config.checks 中的檢查函數
    └─ 應用 config.warnings 中的警告規則
    ↓
返回計算結果（按完整表現隱性基因數 + 機率排序）
```

---

## 10. 重要變更總結

| 方面 | 舊方案 | 新方案 | 優勢 |
|------|-------|-------|------|
| **配置位置** | utils/genes.js | utils/genetics/*.config.js | 分離清晰 |
| **函數簽名** | 4 個參數 | 3 個參數 | 簡化調用 |
| **物種檢查** | 硬編碼 if/else | 動態函數執行 | 易於擴展 |
| **新物種添加** | 修改 2-3 個文件 | 僅添加 1 個文件 | 低侵入性 |
| **代碼行數** | 383 行 + 硬編碼 | 380 行 + 配置 | 更清晰 |
| **結果排序** | 按機率 | 按完整表現 → 機率 | 更符合實務 |

---

**遷移指南完成日期**：2026-06-02  
**版本**：1.0  
**狀態**：✅ 已驗證
