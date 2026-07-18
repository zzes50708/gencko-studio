import { CALC_TYPES, ZYG } from './genes'

// 註：基因定義 / 物種設定的形狀來自 genes.js（仍為 JS），此處先以寬鬆型別包裝，
// 公開函式簽章型別化；內部動態結構用 Record 標註以滿足 strict。邏輯與 JS 版完全一致。

export interface CalcOutcome {
  description: string
  fullLabel: string
  prob: number
  completeExpressionCount: number
  rawGenotypes: any[]
  gens: any[]
}

export interface CalcResult {
  totalCombos: number
  outcomes: CalcOutcome[]
  warning: string
  notices: any[]
}

export function getProbFraction(prob: number): string {
  if (prob >= 0.99) return ''
  const frac = Math.round(1 / prob)
  if ([2, 3, 4, 8, 16, 32, 64, 128, 256].includes(frac)) return `1/${frac}`
  return ''
}

const getGeneBaseName = (geneDef: any): string => (geneDef ? geneDef.name.split(' (')[0] : '')
const isAftZeroGene = (geneId: string): boolean => geneId === 'aft_zero'

const getGeneDisplayNameByZygosity = (geneDef: any, zygosity: string): string => {
  if (!geneDef) return ''
  if (isAftZeroGene(geneDef.id)) {
    if (zygosity === ZYG.HET) return '零'
    if (zygosity === ZYG.VIS) return '無紋'
  }
  return getGeneBaseName(geneDef)
}

const formatHetLabel = (label: string, genes: string[]): string => {
  if (!genes.length) return ''
  const zeroGenes = genes.filter((gene) => gene === '零')
  const normalGenes = genes.filter((gene) => gene !== '零')
  const parts: string[] = []

  if (zeroGenes.length) {
    if (label === 'Het') parts.push('零')
    else if (label === '66% Poss Het') parts.push('66% Het 無紋')
    else if (label === '50% Poss Het') parts.push('50% Het 無紋')
    else parts.push(`${label.replace('Poss Het', 'Het')} 無紋`)
  }

  if (normalGenes.length) {
    if (label === 'Het') parts.push(`Het ${normalGenes.join(' ')}`)
    else if (label === '66% Poss Het') parts.push(`66% Het ${normalGenes.join(' ')}`)
    else if (label === '50% Poss Het') parts.push(`50% Het ${normalGenes.join(' ')}`)
    else parts.push(`${label.replace('Poss Het', 'Het')} ${normalGenes.join(' ')}`)
  }

  return parts.join(' ')
}

export function calculateGenetics(
  speciesConfig: any,
  maleGenes: any[],
  femaleGenes: any[]
): CalcResult | null {
  if (maleGenes.length === 0 && femaleGenes.length === 0) {
    return null
  }

  const defs = speciesConfig.genes
  const comboRules = speciesConfig.comboRules || []
  const checks = speciesConfig.checks || {}
  const speciesWarnings = speciesConfig.warnings || []

  const expand = (list: any[]): any[] => {
    let result: any[] = []
    list.forEach((item) => {
      const def = defs.find((gene: any) => gene.id === item.geneId)
      if (def && def.components) {
        def.components.forEach((component: any) => {
          let zygosity = ZYG.VIS
          if (component.type === 'Het') zygosity = ZYG.HET
          if (component.type === 'Super') zygosity = ZYG.SUP
          result.push({ geneId: component.geneId, zygosity })
        })
      } else {
        result.push(item)
      }
    })
    return result
  }

  const mExpanded = expand(maleGenes)
  const fExpanded = expand(femaleGenes)
  const allGenes = [...maleGenes, ...femaleGenes]

  let warning = ''
  let notices: any[] = []

  speciesWarnings.forEach((item: any) => {
    if (allGenes.some((gene) => gene.geneId === item.check)) {
      warning += item.message
    }
  })

  const hasPolygenicGene = allGenes.some((gene) => {
    const def = defs.find((item: any) => item.id === gene.geneId)
    return def && (def.type === CALC_TYPES.POLY || def.type === CALC_TYPES.BLOOD)
  })
  if (hasPolygenicGene) {
    warning += '含有多遺傳基因之品系需視表現而定。\n'
  }

  if (checks.validateAlbinos) {
    const albinoCheck = checks.validateAlbinos(allGenes, defs)
    if (albinoCheck?.hasWarning) warning += albinoCheck.warning
  }

  if (checks.validateCaramelFemale) {
    const caramelCheck = checks.validateCaramelFemale(femaleGenes)
    if (caramelCheck?.hasWarning) warning += caramelCheck.warning
  }

  if (checks.validateGhostFemale) {
    const ghostCheck = checks.validateGhostFemale(femaleGenes)
    if (ghostCheck?.hasWarning) warning += ghostCheck.warning
  }

  if (allGenes.some((gene) => gene.geneId === 'aft_zero')) {
    warning += '零指的是帶無紋且有零表現的個體；超級零 = 無紋。\n'
  }

  const allIds = new Set([
    ...mExpanded.map((gene) => gene.geneId),
    ...fExpanded.map((gene) => gene.geneId)
  ])
  const mendelianResults: any[] = []
  const polyInheritance: Record<string, number> = {}

  allIds.forEach((id) => {
    const def = defs.find((gene: any) => gene.id === id)
    if (!def) return

    const mGene = mExpanded.find((gene) => gene.geneId === id)
    const fGene = fExpanded.find((gene) => gene.geneId === id)

    if (def.type === CALC_TYPES.POLY || def.type === CALC_TYPES.BLOOD) {
      const mValue = mGene ? 100 : 0
      const fValue = fGene ? 100 : 0
      const average = (mValue + fValue) / 2
      if (average > 0) polyInheritance[id] = average
      return
    }

    const getAlleles = (zygosity: any): number[] => {
      if (!zygosity) return [0, 0]
      if (def.type === CALC_TYPES.REC) {
        if (zygosity === ZYG.VIS) return [1, 1]
        if (zygosity === ZYG.HET) return [1, 0]
      } else if (def.type === CALC_TYPES.CODOM) {
        if (zygosity === ZYG.SUP) return [1, 1]
        if (zygosity === ZYG.VIS || zygosity === ZYG.SGL) return [1, 0]
      } else if (zygosity === ZYG.VIS) {
        return [1, 0]
      }
      return [0, 0]
    }

    const parent1 = getAlleles(mGene?.zygosity)
    const parent2 = getAlleles(fGene?.zygosity)
    const counts: Record<string, number> = {}

    for (const a of parent1) {
      for (const b of parent2) {
        const sum = a + b
        let key = ''
        if (def.type === CALC_TYPES.REC) {
          if (sum === 2) key = ZYG.VIS
          else if (sum === 1) key = ZYG.HET
          else key = 'Wild'
        } else if (def.type === CALC_TYPES.CODOM) {
          if (sum === 2) key = ZYG.SUP
          else if (sum === 1) key = ZYG.SGL
          else key = 'Wild'
        } else {
          key = sum >= 1 ? ZYG.VIS : 'Wild'
        }
        counts[key] = (counts[key] || 0) + 1
      }
    }

    const localResults: any[] = []
    Object.keys(counts).forEach((key) => {
      if (key !== 'Wild') {
        localResults.push({ geneId: id, zygosity: key, prob: counts[key] / 4 })
      }
    })
    if (localResults.length > 0) mendelianResults.push(localResults)
  })

  let rawOutcomes: any[] = [{ gens: [], prob: 1 }]
  mendelianResults.forEach((options: any) => {
    const nextOutcomes: any[] = []
    const sumProb = options.reduce((sum: number, item: any) => sum + item.prob, 0)
    const wildProb = 1 - sumProb

    rawOutcomes.forEach((existing) => {
      options.forEach((option: any) => {
        nextOutcomes.push({
          gens: [...existing.gens, { geneId: option.geneId, zygosity: option.zygosity }],
          prob: existing.prob * option.prob
        })
      })
      if (wildProb > 0.0001) {
        nextOutcomes.push({ gens: [...existing.gens], prob: existing.prob * wildProb })
      }
    })
    rawOutcomes = nextOutcomes
  })

  const phenoMap = new Map<string, { prob: number; raw: any[] }>()
  rawOutcomes.forEach((outcome) => {
    const active = outcome.gens
    const visualGenes = active.filter((gene: any) => {
      const def = defs.find((item: any) => item.id === gene.geneId)
      if (!def) return false
      if (def.type === CALC_TYPES.REC) return gene.zygosity === ZYG.VIS
      if (def.type === CALC_TYPES.CODOM) return [ZYG.VIS, ZYG.SGL, ZYG.SUP].includes(gene.zygosity)
      return true
    })

    const polygenicGeneIdsInPhenotype = new Set<any>()
    Object.keys(polyInheritance).forEach((pid) => {
      const value = polyInheritance[pid]
      const def = defs.find((item: any) => item.id === pid)
      if (!def) return

      if (def.type === CALC_TYPES.BLOOD) {
        if (value >= 100) polygenicGeneIdsInPhenotype.add(pid)
        else if (def.baseGeneId) polygenicGeneIdsInPhenotype.add(def.baseGeneId)
      } else {
        polygenicGeneIdsInPhenotype.add(pid)
      }
    })

    const descParts: string[] = []
    const consumed = new Set<any>()

    comboRules.forEach((rule: any) => {
      const met = rule.required.every((required: any) => {
        const match = visualGenes.find((gene: any) => gene.geneId === required.id)
        if (!match || consumed.has(match.geneId)) return false
        if (required.z === 'Any') return true
        return match.zygosity === required.z
      })
      if (met) {
        descParts.push(rule.name)
        rule.required.forEach((required: any) => consumed.add(required.id))
      }
    })

    visualGenes.forEach((gene: any) => {
      if (consumed.has(gene.geneId)) return
      const def = defs.find((item: any) => item.id === gene.geneId)
      if (!def) return
      const geneDisplayName = getGeneDisplayNameByZygosity(def, gene.zygosity)

      if (def.type === CALC_TYPES.CODOM && gene.zygosity === ZYG.SUP) {
        descParts.push(`超級${geneDisplayName}`)
      } else {
        descParts.push(geneDisplayName)
      }
    })

    polygenicGeneIdsInPhenotype.forEach((pid) => {
      const def = defs.find((item: any) => item.id === pid)
      if (!def || consumed.has(pid)) return
      const geneDisplayName = getGeneBaseName(def)
      if (!descParts.includes(geneDisplayName)) descParts.push(geneDisplayName)
    })

    const name = descParts.join(' ') || '原色'

    if (!phenoMap.has(name)) phenoMap.set(name, { prob: 0, raw: [] })
    const entry = phenoMap.get(name)!
    entry.prob += outcome.prob
    entry.raw.push(outcome)
  })

  const finalOutcomes: CalcOutcome[] = []
  phenoMap.forEach((data, name) => {
    const { prob, raw } = data
    const hetStats: Record<string, string> = {}

    const consumed = new Set<any>()
    comboRules.forEach((rule: any) => {
      if (name.includes(rule.name)) {
        rule.required.forEach((required: any) => {
          consumed.add(required.id)
        })
      }
    })

    const potentialHets = new Set([
      ...mExpanded.map((gene) => gene.geneId),
      ...fExpanded.map((gene) => gene.geneId)
    ])
    potentialHets.forEach((id) => {
      if (consumed.has(id)) return

      const def = defs.find((gene: any) => gene.id === id)
      if (!def || def.type !== CALC_TYPES.REC) return

      const isVisualInThisGroup = raw.every((entry: any) => {
        const gene = entry.gens.find((item: any) => item.geneId === id)
        return gene && gene.zygosity === ZYG.VIS
      })

      const geneDef = defs.find((gene: any) => gene.id === id)
      const hetGeneName = getGeneDisplayNameByZygosity(geneDef, ZYG.HET)
      const visualGeneName = getGeneDisplayNameByZygosity(geneDef, ZYG.VIS)

      if (
        isVisualInThisGroup &&
        (name.includes(hetGeneName) || name.includes(visualGeneName)) &&
        geneDef.type !== CALC_TYPES.POLY &&
        geneDef.type !== CALC_TYPES.BLOOD
      ) {
        return
      }

      let hetCount = 0
      raw.forEach((entry: any) => {
        const gene = entry.gens.find((item: any) => item.geneId === id)
        if (gene && (gene.zygosity === ZYG.HET || gene.zygosity === ZYG.VIS)) {
          hetCount += entry.prob
        }
      })

      const ratio = hetCount / prob
      if (ratio > 0.001) {
        let label = ''
        if (ratio >= 0.99) label = 'Het'
        else if (ratio >= 0.6) label = '66% Poss Het'
        else if (ratio >= 0.45) label = '50% Poss Het'
        else label = `${Math.round(ratio * 100)}% Poss Het`
        hetStats[id] = label
      }
    })

    const groupedHets: Record<string, string[]> = {}
    Object.keys(hetStats).forEach((id) => {
      const label = hetStats[id]
      const def = defs.find((gene: any) => gene.id === id)
      const geneName = getGeneDisplayNameByZygosity(def, ZYG.HET) || id
      if (!groupedHets[label]) groupedHets[label] = []
      groupedHets[label].push(geneName)
    })

    const extraInfo: string[] = []
    Object.keys(polyInheritance).forEach((pid) => {
      const value = polyInheritance[pid]
      const def = defs.find((gene: any) => gene.id === pid)
      if (!def) return
      const polyName = getGeneBaseName(def)
      if (def.type === CALC_TYPES.BLOOD) {
        if (value < 100) extraInfo.push(`${value}% ${polyName}血`)
      } else if (def.type === CALC_TYPES.POLY && !name.includes(polyName)) {
        extraInfo.push(polyName)
      }
    })

    const sortOrder = ['Het', '66% Poss Het', '50% Poss Het']
    sortOrder.forEach((label) => {
      if (groupedHets[label]) {
        extraInfo.push(formatHetLabel(label, groupedHets[label]))
        delete groupedHets[label]
      }
    })
    Object.keys(groupedHets).forEach((label) => {
      extraInfo.push(formatHetLabel(label, groupedHets[label]))
    })

    let fullLabel = name
    if (extraInfo.length > 0) {
      fullLabel += ` ${extraInfo.join(' ')}`
    }

    let completeExpressionCount = 0
    raw.forEach((entry: any) => {
      entry.gens.forEach((gene: any) => {
        const def = defs.find((item: any) => item.id === gene.geneId)
        if (def && def.type === CALC_TYPES.REC && gene.zygosity === ZYG.VIS) {
          completeExpressionCount++
        }
      })
    })
    completeExpressionCount = completeExpressionCount / raw.length

    finalOutcomes.push({
      description: name,
      fullLabel,
      prob,
      completeExpressionCount,
      rawGenotypes: raw.map((entry: any) => entry.gens),
      gens: []
    })
  })

  finalOutcomes.sort((a, b) => {
    if (a.completeExpressionCount !== b.completeExpressionCount) {
      return b.completeExpressionCount - a.completeExpressionCount
    }
    return b.prob - a.prob
  })

  return {
    totalCombos: finalOutcomes.length,
    outcomes: finalOutcomes,
    warning,
    notices
  }
}
