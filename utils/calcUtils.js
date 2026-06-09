import { CALC_TYPES, ZYG } from './genes.js'

export function getProbFraction(prob) {
    if (prob >= 0.99) return ''
    const frac = Math.round(1 / prob)
    if ([ 2, 3, 4, 8, 16, 32, 64, 128, 256 ].includes(frac)) return `1/${frac}`
    return ''
}

const getGeneBaseName = (geneDef) => geneDef ? geneDef.name.split(' (')[0] : ''

const formatHetLabel = (label, genes) => {
    if (!genes.length) return ''
    if (label === 'Het') return `Het ${genes.join(' ')}`
    if (label === '66% Poss Het') return `66% Het ${genes.join(' ')}`
    if (label === '50% Poss Het') return `50% Het ${genes.join(' ')}`
    return `${label.replace('Poss Het', 'Het')} ${genes.join(' ')}`
}

export function calculateGenetics(speciesConfig, maleGenes, femaleGenes) {
    if (maleGenes.length === 0 && femaleGenes.length === 0) {
        return null
    }

    const defs = speciesConfig.genes
    const comboRules = speciesConfig.comboRules || []
    const checks = speciesConfig.checks || {}
    const speciesWarnings = speciesConfig.warnings || []

    const expand = (list) => {
        let result = [ ]
        list.forEach((item) => {
            const def = defs.find((gene) => gene.id === item.geneId)
            if (def && def.components) {
                def.components.forEach((component) => {
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
    const allGenes = [ ...maleGenes, ...femaleGenes ]

    let warning = ''
    let notices = [ ]

    speciesWarnings.forEach((item) => {
        if (allGenes.some((gene) => gene.geneId === item.check)) {
            warning += item.message
        }
    })

    const hasPolygenicGene = allGenes.some((gene) => {
        const def = defs.find((item) => item.id === gene.geneId)
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

    const allIds = new Set([ ...mExpanded.map((gene) => gene.geneId), ...fExpanded.map((gene) => gene.geneId) ])
    const mendelianResults = [ ]
    const polyInheritance = {}

    allIds.forEach((id) => {
        const def = defs.find((gene) => gene.id === id)
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

        const getAlleles = (zygosity) => {
            if (!zygosity) return [ 0, 0 ]
            if (def.type === CALC_TYPES.REC) {
                if (zygosity === ZYG.VIS) return [ 1, 1 ]
                if (zygosity === ZYG.HET) return [ 1, 0 ]
            } else if (def.type === CALC_TYPES.CODOM) {
                if (zygosity === ZYG.SUP) return [ 1, 1 ]
                if (zygosity === ZYG.VIS || zygosity === ZYG.SGL) return [ 1, 0 ]
            } else if (zygosity === ZYG.VIS) {
                return [ 1, 0 ]
            }
            return [ 0, 0 ]
        }

        const parent1 = getAlleles(mGene?.zygosity)
        const parent2 = getAlleles(fGene?.zygosity)
        const counts = {}

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

        const localResults = [ ]
        Object.keys(counts).forEach((key) => {
            if (key !== 'Wild') {
                localResults.push({ geneId: id, zygosity: key, prob: counts[key] / 4 })
            }
        })
        if (localResults.length > 0) mendelianResults.push(localResults)
    })

    let rawOutcomes = [ { gens: [ ], prob: 1 } ]
    mendelianResults.forEach((options) => {
        const nextOutcomes = [ ]
        const sumProb = options.reduce((sum, item) => sum + item.prob, 0)
        const wildProb = 1 - sumProb

        rawOutcomes.forEach((existing) => {
            options.forEach((option) => {
                nextOutcomes.push({
                    gens: [ ...existing.gens, { geneId: option.geneId, zygosity: option.zygosity } ],
                    prob: existing.prob * option.prob
                })
            })
            if (wildProb > 0.0001) {
                nextOutcomes.push({ gens: [ ...existing.gens ], prob: existing.prob * wildProb })
            }
        })
        rawOutcomes = nextOutcomes
    })

    const phenoMap = new Map()
    rawOutcomes.forEach((outcome) => {
        const active = outcome.gens
        const visualGenes = active.filter((gene) => {
            const def = defs.find((item) => item.id === gene.geneId)
            if (!def) return false
            if (def.type === CALC_TYPES.REC) return gene.zygosity === ZYG.VIS
            if (def.type === CALC_TYPES.CODOM) return [ ZYG.VIS, ZYG.SGL, ZYG.SUP ].includes(gene.zygosity)
            return true
        })

        const polygenicGeneIdsInPhenotype = new Set()
        Object.keys(polyInheritance).forEach((pid) => {
            const value = polyInheritance[pid]
            const def = defs.find((item) => item.id === pid)
            if (!def) return

            if (def.type === CALC_TYPES.BLOOD) {
                if (value >= 100) polygenicGeneIdsInPhenotype.add(pid)
                else if (def.baseGeneId) polygenicGeneIdsInPhenotype.add(def.baseGeneId)
            } else {
                polygenicGeneIdsInPhenotype.add(pid)
            }
        })

        const descParts = [ ]
        const consumed = new Set()

        comboRules.forEach((rule) => {
            const met = rule.required.every((required) => {
                const match = visualGenes.find((gene) => gene.geneId === required.id)
                if (!match || consumed.has(match.geneId)) return false
                if (required.z === 'Any') return true
                return match.zygosity === required.z
            })
            if (met) {
                descParts.push(rule.name)
                rule.required.forEach((required) => consumed.add(required.id))
            }
        })

        visualGenes.forEach((gene) => {
            if (consumed.has(gene.geneId)) return
            const def = defs.find((item) => item.id === gene.geneId)
            if (!def) return
            const geneDisplayName = getGeneBaseName(def)

            if (def.type === CALC_TYPES.CODOM && gene.zygosity === ZYG.SUP) {
                descParts.push(`超級${geneDisplayName}`)
            } else {
                descParts.push(geneDisplayName)
            }
        })

        polygenicGeneIdsInPhenotype.forEach((pid) => {
            const def = defs.find((item) => item.id === pid)
            if (!def || consumed.has(pid)) return
            const geneDisplayName = getGeneBaseName(def)
            if (!descParts.includes(geneDisplayName)) descParts.push(geneDisplayName)
        })

        const name = descParts.join(' ') || '原色'

        if (!phenoMap.has(name)) phenoMap.set(name, { prob: 0, raw: [ ] })
        const entry = phenoMap.get(name)
        entry.prob += outcome.prob
        entry.raw.push(outcome)
    })

    const finalOutcomes = [ ]
    phenoMap.forEach((data, name) => {
        const { prob, raw } = data
        const hetStats = {}

        const consumed = new Set()
        comboRules.forEach((rule) => {
            if (name.includes(rule.name)) {
                rule.required.forEach((required) => {
                    consumed.add(required.id)
                })
            }
        })

        const potentialHets = new Set([ ...mExpanded.map((gene) => gene.geneId), ...fExpanded.map((gene) => gene.geneId) ])
        potentialHets.forEach((id) => {
            if (consumed.has(id)) return

            const def = defs.find((gene) => gene.id === id)
            if (!def || def.type !== CALC_TYPES.REC) return

            const isVisualInThisGroup = raw.every((entry) => {
                const gene = entry.gens.find((item) => item.geneId === id)
                return gene && gene.zygosity === ZYG.VIS
            })

            const geneDef = defs.find((gene) => gene.id === id)
            const geneName = getGeneBaseName(geneDef)

            if (isVisualInThisGroup && name.includes(geneName) && geneDef.type !== CALC_TYPES.POLY && geneDef.type !== CALC_TYPES.BLOOD) {
                return
            }

            let hetCount = 0
            raw.forEach((entry) => {
                const gene = entry.gens.find((item) => item.geneId === id)
                if (gene && (gene.zygosity === ZYG.HET || gene.zygosity === ZYG.VIS)) {
                    hetCount += entry.prob
                }
            })

            const ratio = hetCount / prob
            if (ratio > 0.001) {
                let label = ''
                if (ratio >= 0.99) label = 'Het'
                else if (ratio >= 0.60) label = '66% Poss Het'
                else if (ratio >= 0.45) label = '50% Poss Het'
                else label = `${Math.round(ratio * 100)}% Poss Het`
                hetStats[id] = label
            }
        })

        const groupedHets = {}
        Object.keys(hetStats).forEach((id) => {
            const label = hetStats[id]
            const def = defs.find((gene) => gene.id === id)
            const geneName = getGeneBaseName(def) || id
            if (!groupedHets[label]) groupedHets[label] = [ ]
            groupedHets[label].push(geneName)
        })

        const extraInfo = [ ]
        Object.keys(polyInheritance).forEach((pid) => {
            const value = polyInheritance[pid]
            const def = defs.find((gene) => gene.id === pid)
            if (!def) return
            const polyName = getGeneBaseName(def)
            if (def.type === CALC_TYPES.BLOOD) {
                if (value < 100) extraInfo.push(`${value}% ${polyName}血`)
            } else if (def.type === CALC_TYPES.POLY && !name.includes(polyName)) {
                extraInfo.push(polyName)
            }
        })

        const sortOrder = [ 'Het', '66% Poss Het', '50% Poss Het' ]
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
        raw.forEach((entry) => {
            entry.gens.forEach((gene) => {
                const def = defs.find((item) => item.id === gene.geneId)
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
            rawGenotypes: raw.map((entry) => entry.gens),
            gens: [ ]
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
