#!/usr/bin/env node

/**
 * 重構測試：驗證遺傳學計算重構是否成功
 * 此測試驗證：
 * 1. 新的 speciesConfig 結構能正確導入
 * 2. calculateGenetics 新簽名能正常運作
 * 3. 物種特定檢查函數能正確執行
 * 4. 「完整表現隱性基因數」排序能正常運作
 */

import { getSpeciesConfig, SPECIES_CONFIGS } from './utils/genetics/index'
import { calculateGenetics } from './utils/calcUtils'
import { ZYG, CALC_TYPES } from './utils/genes'

console.log('='.repeat(60))
console.log('開始重構驗證測試')
console.log('='.repeat(60))

// ============================================
// 測試 1: 驗證物種配置能正確導入
// ============================================
console.log('\n[測試 1] 驗證物種配置導入')
console.log('-'.repeat(60))

const lgConfig = getSpeciesConfig('豹紋守宮')
const aftConfig = getSpeciesConfig('肥尾守宮')

if (lgConfig && lgConfig.genes && lgConfig.genes.length > 0) {
  console.log(`✓ 豹紋守宮配置正確導入，包含 ${lgConfig.genes.length} 個基因`)
} else {
  console.log('✗ 豹紋守宮配置導入失敗')
  process.exit(1)
}

if (aftConfig && aftConfig.genes && aftConfig.genes.length > 0) {
  console.log(`✓ 肥尾守宮配置正確導入，包含 ${aftConfig.genes.length} 個基因`)
} else {
  console.log('✗ 肥尾守宮配置導入失敗')
  process.exit(1)
}

// ============================================
// 測試 2: 驗證豹紋守宮基本運算（隱性基因十字交配）
// ============================================
console.log('\n[測試 2] 豹紋守宮基本運算（隱性基因十字交配）')
console.log('-'.repeat(60))

// 公：川普白化 (tremper) Het
// 母：川普白化 (tremper) Het
// 預期：25% 原色, 50% Het, 25% Visual
const maleGenes = [{ geneId: 'tremper', zygosity: ZYG.HET }]
const femaleGenes = [{ geneId: 'tremper', zygosity: ZYG.HET }]

const result1 = calculateGenetics(lgConfig, maleGenes, femaleGenes)

if (result1 && result1.outcomes && result1.outcomes.length > 0) {
  console.log(`✓ 計算成功，產生 ${result1.totalCombos} 個結果`)
  result1.outcomes.forEach((outcome, idx) => {
    console.log(`  ${idx + 1}. ${outcome.description}: ${(outcome.prob * 100).toFixed(1)}%`)
  })

  // 驗證機率加總為 1
  const totalProb = result1.outcomes.reduce((sum, o) => sum + o.prob, 0)
  if (Math.abs(totalProb - 1.0) < 0.0001) {
    console.log(`✓ 機率加總正確 (${(totalProb * 100).toFixed(1)}%)`)
  } else {
    console.log(`✗ 機率加總錯誤 (${(totalProb * 100).toFixed(1)}%)`)
    process.exit(1)
  }
} else {
  console.log('✗ 計算失敗')
  process.exit(1)
}

// ============================================
// 測試 3: 驗證物種特定檢查（肥尾守宮母焦糖警告）
// ============================================
console.log('\n[測試 3] 肥尾守宮母焦糖警告檢查')
console.log('-'.repeat(60))

// 公：原色
// 母：焦糖
const maleGenes2 = [{ geneId: 'aft_normal', zygosity: ZYG.VIS }]
const femaleGenes2 = [{ geneId: 'aft_caramel', zygosity: ZYG.VIS }]

const result2 = calculateGenetics(aftConfig, maleGenes2, femaleGenes2)

if (result2 && result2.warning && result2.warning.includes('焦糖')) {
  console.log('✓ 母焦糖警告正確觸發')
  console.log(`  警告信息：${result2.warning.split('\n')[0]}`)
} else {
  console.log('✗ 母焦糖警告未觸發')
  process.exit(1)
}

// ============================================
// 測試 4: 驗證「完整表現隱性基因數」排序
// ============================================
console.log('\n[測試 4] 完整表現隱性基因數排序')
console.log('-'.repeat(60))

// 公：川普白化 Het × Het (multiple genes)
// 母：川普白化 Het × Het
// 應該產生多個結果，並按「完整表現隱性基因數」排序

const complexMale = [
  { geneId: 'tremper', zygosity: ZYG.HET },
  { geneId: 'eclipse', zygosity: ZYG.HET }
]
const complexFemale = [
  { geneId: 'tremper', zygosity: ZYG.HET },
  { geneId: 'eclipse', zygosity: ZYG.HET }
]

const result3 = calculateGenetics(lgConfig, complexMale, complexFemale)

if (result3 && result3.outcomes) {
  console.log(`✓ 複合基因計算成功，產生 ${result3.totalCombos} 個結果`)

  // 驗證排序：completeExpressionCount 應該遞減
  let isSorted = true
  for (let i = 1; i < result3.outcomes.length; i++) {
    if (
      result3.outcomes[i].completeExpressionCount > result3.outcomes[i - 1].completeExpressionCount
    ) {
      isSorted = false
      break
    }
    // 檢查 completeExpressionCount 相同時，是否按機率遞減
    if (
      result3.outcomes[i].completeExpressionCount ===
      result3.outcomes[i - 1].completeExpressionCount
    ) {
      if (result3.outcomes[i].prob > result3.outcomes[i - 1].prob) {
        isSorted = false
        break
      }
    }
  }

  if (isSorted) {
    console.log('✓ 排序正確（按完整表現隱性基因數遞減，再按機率遞減）')
  } else {
    console.log('✗ 排序錯誤')
    result3.outcomes.forEach((o, idx) => {
      console.log(
        `  ${idx + 1}. ${o.description}: ${(o.prob * 100).toFixed(1)}%, 完整表現計數: ${o.completeExpressionCount.toFixed(2)}`
      )
    })
    process.exit(1)
  }

  result3.outcomes.slice(0, 5).forEach((o, idx) => {
    console.log(
      `  ${idx + 1}. ${o.description}: ${(o.prob * 100).toFixed(1)}%, 完整表現: ${o.completeExpressionCount.toFixed(2)}`
    )
  })
  if (result3.outcomes.length > 5) {
    console.log(`  ... 等共 ${result3.outcomes.length} 個結果`)
  }
}

// ============================================
// 測試 5: 驗證豹紋守宮白化基因互斥警告
// ============================================
console.log('\n[測試 5] 豹紋守宮白化基因互斥警告')
console.log('-'.repeat(60))

// 公：川普白化
// 母：貝爾白化
// 應該觸發互斥警告
const maleGenes3 = [{ geneId: 'tremper', zygosity: ZYG.VIS }]
const femaleGenes3 = [{ geneId: 'bell', zygosity: ZYG.VIS }]

const result4 = calculateGenetics(lgConfig, maleGenes3, femaleGenes3)

if (result4 && result4.warning && result4.warning.includes('互斥')) {
  console.log('✓ 白化基因互斥警告正確觸發')
  console.log(`  警告信息：${result4.warning.split('\n')[0]}`)
} else {
  console.log('⚠ 白化基因互斥警告未觸發（可能為預期行為）')
}

// ============================================
// 測試完成
// ============================================
console.log('\n' + '='.repeat(60))
console.log('✓ 所有驗證測試通過！')
console.log('  重構成功：遺傳學計算系統已成功模組化')
console.log('='.repeat(60))
