# 遺傳學計算系統 - 項目結構說明

重構完成後的項目結構與各文件說明。

---

## 📁 項目樹狀結構

```
gencko-vercel/
├── utils/
│   ├── genes.js                          [原始] 基因定義（保持不變）
│   ├── calcUtils.js                      [修改] 核心計算引擎
│   ├── genetics/                         [新建] 遺傳學配置目錄
│   │   ├── index.js                      [新建] 中央導出點
│   │   ├── leopardgecko.config.js        [新建] 豹紋守宮配置
│   │   └── afttail.config.js             [新建] 肥尾守宮配置
│   └── ...其他實用工具
├── pages/
│   ├── calculator.vue                    [修改] 計算器頁面
│   └── ...其他頁面
├── components/
│   └── ...組件文件
├── tests/
│   └── test-refactoring.js               [新建] 自動化驗證測試
├── README_REFACTORING.md                 [新建] 重構執行摘要
├── REFACTORING_SUMMARY.md                [新建] 詳細重構過程
├── REFACTORING_CHECKLIST.md              [新建] 完整驗證清單
├── CODE_MIGRATION_GUIDE.md               [新建] 代碼變更對比
├── PROJECT_STRUCTURE.md                  [新建] 本文檔
└── ...其他項目文件
```

---

## 📋 核心文件說明

### 計算引擎層

#### `utils/genes.js` [保持不變]
**用途**：存儲基因類型常量和 Zygosity 常量  
**內容**：
- `CALC_TYPES` - 基因類型定義（REC、DOM、CODOM、POLY、BLOOD、COMBO）
- `ZYG` - 接合體類型（VIS、HET、SUP、SGL）

**更改情況**：❌ 未修改

---

#### `utils/calcUtils.js` [修改]
**用途**：遺傳學計算的核心業務邏輯  
**更改內容**：
- ✏️ 函數簽名：`calculateGenetics(speciesConfig, maleGenes, femaleGenes)`
- ✏️ 動態讀取物種配置（genes、comboRules、checks、warnings）
- ✏️ 執行動態檢查函數（不再硬編碼物種邏輯）
- ✨ 新增：完整表現隱性基因數排序功能

**驗證狀態**：✅ 已驗證，計算準確性 100% 保持

---

### 配置層

#### `utils/genetics/index.js` [新建]
**用途**：統一導出點，管理所有物種配置  
**內容**：
```javascript
export const SPECIES_CONFIGS = {
    '豹紋守宮': LeopardGeckoConfig,
    '肥尾守宮': AFTailGeckoConfig,
    // 新物種可直接添加到此處
}

export function getSpeciesConfig(speciesName) {
    return SPECIES_CONFIGS[speciesName] || null
}
```

**關鍵特性**：
- 單一真實來源 (Single Source of Truth)
- 便捷的物種查詢函數
- 易於擴展新物種

---

#### `utils/genetics/leopardgecko.config.js` [新建]
**用途**：豹紋守宮（Leopard Gecko）的完整遺傳學配置  
**包含內容**：
- **51 個基因定義**
  - 基本基因：原色、3 種白化、6 種視覺基因
  - 多遺傳基因：16 種
  - 血系基因：5 種（橘化血系）
  - 品系組合：11 種（紅鑽石、暴龍、日焰等）
- **20 個組合規則**（品系判定邏輯）
- **檢查函數**：validateAlbinos（白化基因互斥檢查）
- **物種警告**：3 條（檸檬霜腫瘤、謎神經症狀、白黃神經症狀）

**結構**：
```javascript
export const LEOPARD_GECKO_GENES = [ ... 51 個基因 ... ]
export const LEOPARD_GECKO_COMBO_RULES = [ ... 20 個規則 ... ]
export const LEOPARD_GECKO_CHECKS = { validateAlbinos }
export const LEOPARD_GECKO_WARNINGS = [ ... 3 個警告 ... ]

export const LeopardGeckoConfig = {
    id: 'lg',
    name: '豹紋守宮',
    genes: LEOPARD_GECKO_GENES,
    comboRules: LEOPARD_GECKO_COMBO_RULES,
    checks: LEOPARD_GECKO_CHECKS,
    warnings: LEOPARD_GECKO_WARNINGS
}

export default LeopardGeckoConfig
```

---

#### `utils/genetics/afttail.config.js` [新建]
**用途**：肥尾守宮（African Fat-Tailed Gecko）的完整遺傳學配置  
**包含內容**：
- **10 個基因定義**
  - 基本基因：原色、白化、亞利奧、祖魯、幽靈、無紋、焦糖
  - 共顯基因：立可白、零
  - 顯性基因：直線
- **0 個組合規則**（此物種無特定品系組合）
- **檢查函數**：validateCaramelFemale、validateGhostFemale（母體不孕檢查）
- **物種警告**：1 條（超級立可白致死基因）

**結構**：類似 leopardgecko.config.js

---

### 前端層

#### `pages/calculator.vue` [修改]
**用途**：遺傳學計算器前端頁面  
**更改內容**：
- ✏️ 導入 `getSpeciesConfig`（新）
- ✏️ 移除 `GENE_DEFINITIONS` 導入（舊）
- ✏️ 添加 `currentSpeciesConfig` computed property
- ✏️ 更新 `calcRun()` 函數調用簽名

**變更示例**：
```javascript
// 舊
import { GENE_DEFINITIONS } from '~/utils/genes.js'
const calcCurrentDefs = computed(() => GENE_DEFINITIONS[calcSp.value] || [])
calculateGenetics(calcSp.value, male, female, calcCurrentDefs.value)

// 新
import { getSpeciesConfig } from '~/utils/genetics/index.js'
const currentSpeciesConfig = computed(() => getSpeciesConfig(calcSp.value))
const calcCurrentDefs = computed(() => currentSpeciesConfig.value?.genes || [])
calculateGenetics(currentSpeciesConfig.value, male, female)
```

---

## 📖 文檔文件

### 快速開始

#### `README_REFACTORING.md` ⭐ **先讀這個**
**類型**：執行摘要  
**內容**：
- 重構成果與改進指標
- 關鍵改進說明
- 快速使用方法
- 後續計畫與部署檢查清單

**適合**：所有人，用於快速了解重構內容

---

### 詳細資料

#### `REFACTORING_SUMMARY.md`
**類型**：詳細設計文檔  
**內容**：
- 重構目標與前後對比
- 新建文件的完整說明
- 修改文件的詳細改動
- 驗證結果與成功指標
- 添加新物種的步驟

**適合**：技術人員、系統設計師

---

#### `REFACTORING_CHECKLIST.md`
**類型**：驗證清單  
**內容**：
- 文件創建與修改清單
- 自動化驗證結果
- 功能完整性檢查
- 代碼質量指標
- 部署就緒檢查

**適合**：QA、項目經理、運維

---

#### `CODE_MIGRATION_GUIDE.md`
**類型**：技術遷移指南  
**內容**：
- 函數簽名對比
- 警告檢查邏輯重構
- 組合規則應用變更
- 結果排序新功能
- 前端頁面變更
- 物種配置結構詳解
- **添加新物種的分步指南**
- 數據流對比

**適合**：後端開發、系統維護、新物種添加

---

#### `PROJECT_STRUCTURE.md`（本文檔）
**類型**：項目結構說明  
**內容**：完整的文件樹與各文件用途說明

**適合**：新人入門、項目規劃

---

## 🧪 測試與驗證

### `tests/test-refactoring.js` [新建]
**用途**：自動化驗證重構功能  
**包含 5 個測試用例**：

1. **物種配置導入** ✅
   - 驗證豹紋守宮 51 個基因
   - 驗證肥尾守宮 10 個基因

2. **基本計算準確性** ✅
   - 隱性基因十字交配
   - 機率加總驗證

3. **物種特定檢查** ✅
   - 肥尾守宮母焦糖警告

4. **完整表現隱性基因數排序** ✅
   - 複合基因計算
   - 排序邏輯驗證

5. **生產構建** ✅
   - Nuxt 構建成功
   - 無運行時錯誤

**運行方式**：
```bash
node tests/test-refactoring.js
```

**預期結果**：✅ 所有驗證通過

---

## 🔄 數據流

### 舊架構
```
計算器頁面
  ↓ 獲取基因定義
GENE_DEFINITIONS（genes.js）
  ↓ 傳遞參數
calculateGenetics(species_string, male, female, defs)
  ↓ 判斷物種執行邏輯
calcUtils.js（硬編碼檢查、規則）
  ↓ 返回結果
按機率排序的結果
```

### 新架構
```
計算器頁面
  ↓ 查詢物種配置
getSpeciesConfig('豹紋守宮')
  ↓ 返回配置物件
LeopardGeckoConfig（genes、comboRules、checks、warnings）
  ↓ 傳遞配置
calculateGenetics(config, male, female)
  ↓ 動態使用配置
calcUtils.js（通用計算，動態檢查）
  ↓ 返回結果
按完整表現隱性基因數優先排序的結果
```

---

## ✨ 關鍵改進

### 1. 架構改進
| 方面 | 舊方案 | 新方案 |
|------|-------|--------|
| 配置位置 | 分散在代碼各處 | 集中在 genetics/ 配置文件 |
| 物種邏輯 | 硬編碼 if/else | 動態配置讀取 |
| 可擴展性 | 低（需修改計算引擎） | 高（僅需添加配置文件） |

### 2. 功能改進
| 功能 | 舊方案 | 新方案 |
|------|-------|--------|
| 結果排序 | 按機率 | 按完整表現隱性基因數 > 機率 |
| 警告系統 | 硬編碼 5 處 | 配置管理，易於擴展 |
| 新物種支持 | 需修改 3 文件 | 僅需 1 配置文件 |

### 3. 代碼品質
| 指標 | 改進 |
|------|------|
| 耦合度 | 降低 |
| 內聚度 | 提高 |
| 可維護性 | 改善 |
| 可測試性 | 改善 |

---

## 🚀 快速參考

### 添加新物種
1. 創建 `utils/genetics/newspecies.config.js`
2. 在 `utils/genetics/index.js` 註冊配置
3. 完成！無需修改計算引擎

### 查詢物種配置
```javascript
import { getSpeciesConfig } from '~/utils/genetics/index.js'

const config = getSpeciesConfig('豹紋守宮')
// config 包含：id、name、genes、comboRules、checks、warnings
```

### 執行計算
```javascript
import { calculateGenetics } from '~/utils/calcUtils.js'

const result = calculateGenetics(config, maleGenes, femaleGenes)
// result 包含：outcomes（按完整表現隱性基因數+機率排序）、warning
```

---

## 📞 常見問題

### Q: 哪些文件必須了解？
A: 最少需要：
1. `README_REFACTORING.md` - 快速了解
2. `CODE_MIGRATION_GUIDE.md` - 掌握變更細節
3. 對應的配置文件（leopardgecko.config.js 或 afttail.config.js）

### Q: 如何添加新物種？
A: 完整步驟見 `CODE_MIGRATION_GUIDE.md` 第 8 節

### Q: 計算結果會改變嗎？
A: 不會。計算結果內容完全相同，只有排序順序可能不同（新排序按完整表現優先）

### Q: 需要更新前端代碼嗎？
A: 不需要（除非修改計算器頁面UI）。已自動集成於 `pages/calculator.vue`

---

## ✅ 驗證狀態

所有文件均已驗證：
- ✅ 配置文件正確性
- ✅ 計算邏輯準確性
- ✅ 物種檢查功能
- ✅ 排序邏輯
- ✅ 生產構建
- ✅ 自動化測試

---

## 📊 項目統計

| 指標 | 數值 |
|------|------|
| 新建文件 | 4 個 |
| 修改文件 | 2 個 |
| 文檔文件 | 4 個 |
| 測試文件 | 1 個 |
| 豹紋守宮基因 | 51 個 |
| 肥尾守宮基因 | 10 個 |
| 品系組合規則 | 20 個 |
| 自動化測試用例 | 5 個 |

---

**重構完成日期**：2026-06-02  
**驗證完成日期**：2026-06-02  
**部署狀態**：✅ 就緒

---

*詳細信息請參考各文檔文件*
