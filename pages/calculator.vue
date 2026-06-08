<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useHead } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { ZYG, CALC_TYPES } from '~/utils/genes.js'
import { calculateGenetics, getProbFraction } from '~/utils/calcUtils.js'
import { getSpeciesConfig } from '~/utils/genetics/index.js'
import { expandMorphComponents, findMatchingMorph } from '~/utils/genetics/morphs.js'

const store = useMainStore()

useHead({
    title: '基因計算機 | Gencko Studio',
    meta:[
        { name: 'description', content: '線上模擬多物種配對結果，支援基因組合、Het 與共顯性推算。' },
        { name: 'keywords', content: '基因計算機, 豹紋守宮, 肥尾守宮, 豬鼻蛇, Morph Calculator' },
        { property: 'og:title', content: '基因計算機 | Gencko Studio' },
        { property: 'og:description', content: '線上模擬多物種配對結果，快速查看子代機率。' },
        { property: 'og:image', content: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E5%AE%98%E7%B6%B2%E8%83%8C%E6%99%AF.png' },
        { property: 'og:url', content: 'https://www.genckobreeding.com/calculator' }
    ],
    link:[
        { rel: 'canonical', href: 'https://www.genckobreeding.com/calculator' }
    ],
    script:[
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'WebApplication',
                name: 'Gencko Morph Calculator',
                url: 'https://www.genckobreeding.com/calculator',
                applicationCategory: 'UtilityApplication',
                operatingSystem: 'All',
                description: 'A professional genetic calculator for Leopard Geckos and African Fat-Tailed Geckos.',
                offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'TWD'
                },
                featureList:[
                    'Mendelian inheritance calculation',
                    'Polygenic trait simulation',
                    'Lethal gene detection'
                ]
            })
        }
    ]
})

const calcSp = ref('豹紋守宮')
const calcSpeciesGroup = ref('terrestrial_gecko')
const calcSpeciesGroupMenuOpen = ref(false)
const calcSpeciesMenuOpen = ref(false)
const calcMale = ref([ ])
const calcFemale = ref([ ])
const calcResult = ref(null)
const calcModalOpen = ref(false)
const calcActiveInfo = ref(null)
const calcExpandedCategories = ref({ Male: 'recessive', Female: 'recessive' })
const calcCardRoles = ref({ Male: 'male', Female: 'female' })
const calcExpandedGenes = ref({})
const calcParentCards = [
    { key: 'Male', label: '公', defaultRole: 'male', icon: '♂', accent: 'm' },
    { key: 'Female', label: '母', defaultRole: 'female', icon: '♀', accent: 'f' }
]
const calcSpeciesGroups = [
    { id: 'terrestrial_gecko', label: '地棲守宮', species: ['豹紋守宮', '肥尾守宮'] },
    { id: 'snake', label: '蛇', species: ['豬鼻蛇'] }
]

const currentSpeciesConfig = computed(() => getSpeciesConfig(calcSp.value))
const calcSanitizedSpeciesConfig = computed(() => {
    const config = currentSpeciesConfig.value
    if (!config) return null

    const genes = (config.genes || []).filter((gene) => gene.category !== 'bloodline' && gene.type !== CALC_TYPES.BLOOD)
    const geneIds = new Set(genes.map((gene) => gene.id))

    return {
        ...config,
        geneCategories: (config.geneCategories || []).filter((category) => category.id !== 'bloodline'),
        genes,
        presetMorphs: (config.presetMorphs || []).filter((gene) => !gene.components?.some((component) => !geneIds.has(component.geneId))),
        comboRules: (config.comboRules || []).filter((rule) => rule.required.every((required) => geneIds.has(required.id)))
    }
})
const calcCurrentDefs = computed(() => calcSanitizedSpeciesConfig.value?.genes || [ ])
const calcGeneCategories = computed(() => calcSanitizedSpeciesConfig.value?.geneCategories || [ ])
const calcPresetMorphs = computed(() => calcSanitizedSpeciesConfig.value?.presetMorphs || [ ])
const calcDisplayCategories = computed(() => {
    const categories = [ ...calcGeneCategories.value ]
    if (calcPresetMorphs.value.length) categories.unshift({ id: 'morph', label: '品系' })
    return categories
})
const calcCurrentSpeciesGroup = computed(() => calcSpeciesGroups.find((group) => group.id === calcSpeciesGroup.value) || calcSpeciesGroups[0])
const calcSpeciesOptions = computed(() => calcCurrentSpeciesGroup.value?.species || [ ])
const calcCurrentSpeciesGroupLabel = computed(() => calcCurrentSpeciesGroup.value?.label || '')
const calcCurrentSpeciesLabel = computed(() => calcSp.value || '')
const calcChildCardKey = computed(() => Object.entries(calcCardRoles.value).find(([, role]) => role === 'child')?.[0] || null)
const calcKnownParentCardKey = computed(() => calcParentCards.find((card) => card.key !== calcChildCardKey.value)?.key || null)
const calcIsReverseMode = computed(() => Boolean(calcChildCardKey.value))
const calcGenesByCategory = computed(() => {
    const groups = {}
    calcGeneCategories.value.forEach((category) => {
        groups[category.id] = [ ]
    })

    calcCurrentDefs.value
        .filter((gene) => !gene.components?.length)
        .forEach((gene) => {
            if (!groups[gene.category]) groups[gene.category] = [ ]
            groups[gene.category].push(gene)
        })

    return groups
})

const calcAllOutcomes = computed(() => calcResult.value?.outcomes || [ ])

const calcRun = () => {
    if (calcIsReverseMode.value) {
        calcResult.value = null
        return
    }

    if (calcMale.value.length === 0 && calcFemale.value.length === 0) {
        calcResult.value = null
        return
    }
    calcResult.value = calculateGenetics(
        calcSanitizedSpeciesConfig.value,
        JSON.parse(JSON.stringify(calcMale.value)),
        JSON.parse(JSON.stringify(calcFemale.value))
    )
}

watch(() => calcMale.value, calcRun, { deep: true })
watch(() => calcFemale.value, calcRun, { deep: true })
watch(calcCardRoles, calcRun, { deep: true })
watch(calcSpeciesGroup, (nextGroupId) => {
    const nextGroup = calcSpeciesGroups.find((group) => group.id === nextGroupId)
    if (nextGroup?.species?.length && !nextGroup.species.includes(calcSp.value)) {
        calcSp.value = nextGroup.species[0]
    }
    calcSpeciesGroupMenuOpen.value = false
    calcSpeciesMenuOpen.value = false
})
watch(calcSp, () => {
    calcMale.value = [ ]
    calcFemale.value = [ ]
    calcResult.value = null
    calcExpandedCategories.value = { Male: 'recessive', Female: 'recessive' }
    calcCardRoles.value = { Male: 'male', Female: 'female' }
    const matchedGroup = calcSpeciesGroups.find((group) => group.species.includes(calcSp.value))
    if (matchedGroup) {
        calcSpeciesGroup.value = matchedGroup.id
    }
    calcSpeciesMenuOpen.value = false
})

const calcToggleSpeciesGroupMenu = () => {
    calcSpeciesGroupMenuOpen.value = !calcSpeciesGroupMenuOpen.value
    if (calcSpeciesGroupMenuOpen.value) calcSpeciesMenuOpen.value = false
}

const calcToggleSpeciesMenu = () => {
    calcSpeciesMenuOpen.value = !calcSpeciesMenuOpen.value
    if (calcSpeciesMenuOpen.value) calcSpeciesGroupMenuOpen.value = false
}

const calcSelectSpeciesGroup = (groupId) => {
    calcSpeciesGroup.value = groupId
}

const calcSelectSpecies = (species) => {
    calcSp.value = species
}

const handleCalcOutsideClick = (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    if (!target.closest('.calc-species-selector')) {
        calcSpeciesGroupMenuOpen.value = false
        calcSpeciesMenuOpen.value = false
    }
}

onMounted(() => {
    document.addEventListener('click', handleCalcOutsideClick)
})

onUnmounted(() => {
    document.removeEventListener('click', handleCalcOutsideClick)
})

const getGeneListBySex = (sex) => (sex === 'Male' ? calcMale.value : calcFemale.value)
const getGeneDef = (geneId) => calcCurrentDefs.value.find((def) => def.id === geneId)
const getGeneIndexById = (sex, geneId) => getGeneListBySex(sex).findIndex((gene) => gene.geneId === geneId)
const getSelectedGeneEntry = (sex, geneId) => getGeneListBySex(sex).find((gene) => gene.geneId === geneId) || null

const setGeneListBySex = (sex, nextGenes) => {
    if (sex === 'Male') {
        calcMale.value = nextGenes
        return
    }
    calcFemale.value = nextGenes
}

const calcToggleCategory = (sex, categoryId) => {
    calcExpandedCategories.value[sex] = categoryId
}

const calcSetRole = (cardKey, role) => {
    calcCardRoles.value[cardKey] = role
}

const calcToggleGeneExpanded = (geneId) => {
    calcExpandedGenes.value[geneId] = !calcExpandedGenes.value[geneId]
}

const calcIsGeneExpanded = (geneId) => calcExpandedGenes.value[geneId] === true

const getFilteredGenesForCategory = (categoryId) => calcGenesByCategory.value[categoryId] || [ ]

const calcIsGeneSelected = (geneId, sex) => getGeneIndexById(sex, geneId) !== -1

const calcAddGene = (geneId, sex) => {
    const def = calcCurrentDefs.value.find(d => d.id === geneId)
    if (!def || calcIsGeneSelected(geneId, sex)) return

    let zygosity = ZYG.VIS
    if (def.type === CALC_TYPES.CODOM) zygosity = ZYG.SGL

    const nextGenes = [ ...getGeneListBySex(sex), { geneId, zygosity } ]
    setGeneListBySex(sex, nextGenes)
    calcExpandedGenes.value[geneId] = true
    calcRun()
}

const calcRemoveGene = (index, sex) => {
    const list = [ ...getGeneListBySex(sex) ]
    list.splice(index, 1)
    setGeneListBySex(sex, list)
    calcRun()
}

const calcRemoveGeneById = (sex, geneId) => {
    const index = getGeneIndexById(sex, geneId)
    if (index === -1) return
    calcRemoveGene(index, sex)
    calcExpandedGenes.value[geneId] = false
}

const calcUpdateZygosity = (e, index, sex) => {
    const list = [ ...getGeneListBySex(sex) ]
    list[index].zygosity = e.target.value
    setGeneListBySex(sex, list)
    calcRun()
}

const calcSetGeneZygosity = (sex, geneId, zygosity) => {
    const index = getGeneIndexById(sex, geneId)
    if (index === -1) return
    const list = [ ...getGeneListBySex(sex) ]
    list[index].zygosity = zygosity
    setGeneListBySex(sex, list)
    calcRun()
}

const formatHetProbabilityLabel = (label) => {
    if (label === 'Het') return 'Het'
    if (label === '50% Poss Het') return '50% Het'
    if (label === '66% Poss Het') return '66% Het'
    return label.replace('Poss Het', 'Het')
}

const formatGeneListSummary = (geneList, hetStats = {}) => {
    if (!geneList.length) return '尚未選擇基因'

    const visibleGenes = geneList
        .filter((gene) => gene.zygosity !== ZYG.HET)
        .map((gene) => {
            const geneDef = getGeneDef(gene.geneId)
            if (!geneDef) return ''
            if (gene.zygosity === ZYG.SUP) return `超級 ${geneDef.name}`
            return geneDef.name
        })
        .filter(Boolean)

    const hetGenes = geneList
        .filter((gene) => gene.zygosity === ZYG.HET)
        .map((gene) => {
            const geneDef = getGeneDef(gene.geneId)
            if (!geneDef) return ''
            const label = formatHetProbabilityLabel(hetStats[gene.geneId] || 'Het')
            return `${label} ${geneDef.name}`
        })
        .filter(Boolean)

    return [ ...visibleGenes, ...hetGenes ].join(' ')
}

const calcSelectedGeneSummary = (sex) => formatGeneListSummary(getGeneListBySex(sex))
const calcMatchedMorph = (sex) => findMatchingMorph(calcSanitizedSpeciesConfig.value, getGeneListBySex(sex))

const calcApplyMorph = (sex, morphDef) => {
    if (!morphDef) return
    setGeneListBySex(sex, expandMorphComponents(morphDef))
    calcRun()
}

const calcGetGeneStateText = (sex, geneId) => {
    const selected = getSelectedGeneEntry(sex, geneId)
    const geneDef = getGeneDef(geneId)
    if (!selected || !geneDef) return ''
    if (geneDef.type === CALC_TYPES.REC) return selected.zygosity === ZYG.HET ? 'Het' : ''
    if (geneDef.type === CALC_TYPES.CODOM) return selected.zygosity === ZYG.SUP ? '超級' : ''
    return ''
}

const calcCycleGeneSelection = (sex, geneId) => {
    const geneDef = getGeneDef(geneId)
    if (!geneDef) return

    const selected = getSelectedGeneEntry(sex, geneId)
    if (!selected) {
        calcAddGene(geneId, sex)
        return
    }

    if (geneDef.type === CALC_TYPES.REC) {
        if (selected.zygosity === ZYG.VIS) {
            calcSetGeneZygosity(sex, geneId, ZYG.HET)
            return
        }
        calcRemoveGeneById(sex, geneId)
        return
    }

    if (geneDef.type === CALC_TYPES.CODOM) {
        if (selected.zygosity === ZYG.SGL) {
            calcSetGeneZygosity(sex, geneId, ZYG.SUP)
            return
        }
        calcRemoveGeneById(sex, geneId)
        return
    }

    calcRemoveGeneById(sex, geneId)
}


const calcBuildUnknownStateOptions = (geneDef, childGenes, knownParentGenes) => {
    // Check if child has this gene (any form: Het or Vis)
    const childHasGene = childGenes.some(g => g.geneId === geneDef.id)
    // Check if known parent doesn't have this gene
    const knownParentLacksGene = !knownParentGenes.some(g => g.geneId === geneDef.id)

    // If child has this gene but known parent doesn't, unknown parent must have it
    const mustHaveGene = childHasGene && knownParentLacksGene

    if (geneDef.type === CALC_TYPES.REC) {
        return mustHaveGene ? [ZYG.HET, ZYG.VIS] : [null, ZYG.HET, ZYG.VIS]
    }
    if (geneDef.type === CALC_TYPES.CODOM) {
        return mustHaveGene ? [ZYG.SGL, ZYG.SUP] : [null, ZYG.SGL, ZYG.SUP]
    }
    return mustHaveGene ? [ZYG.VIS] : [null, ZYG.VIS]
}

const calcDoesOutcomeMatchChild = (rawGenes, childGenes) => {
    const childMap = new Map(childGenes.map((gene) => [gene.geneId, gene.zygosity]))
    const rawMap = new Map(rawGenes.map((gene) => [gene.geneId, gene.zygosity]))

    for (const gene of childGenes) {
        if (rawMap.get(gene.geneId) !== gene.zygosity) {
            return false
        }
    }

    for (const geneDef of calcCurrentDefs.value) {
        const rawZygosity = rawMap.get(geneDef.id)
        if (childMap.has(geneDef.id) || !rawZygosity) continue
        if (geneDef.type === CALC_TYPES.REC && rawZygosity === ZYG.HET) continue
        return false
    }

    return true
}

const calcDoesOutcomeMatchCarrierChild = (rawGenes, childGenes) => {
    const rawMap = new Map(rawGenes.map((gene) => [gene.geneId, gene.zygosity]))

    return childGenes.every((gene) => {
        const geneDef = getGeneDef(gene.geneId)
        const rawZygosity = rawMap.get(gene.geneId)
        if (!geneDef) return false

        if (geneDef.type === CALC_TYPES.REC && gene.zygosity === ZYG.VIS) {
            return rawZygosity === ZYG.HET || rawZygosity === ZYG.VIS
        }

        return rawZygosity === gene.zygosity
    })
}

const calcResolveReverseTier = (probability) => {
    if (probability >= 0.99) return { key: 'het', sort: 1, label: 'Het' }
    if (probability >= 0.60) return { key: 'het66', sort: 2, label: '66% Het' }
    if (probability >= 0.45 && probability < 0.60) return { key: 'het50', sort: 3, label: '50% Het' }
    return { key: 'other', sort: 4, label: `${Math.round(probability * 100)}% Het` }
}

const calcReverseMatches = computed(() => {
    if (!calcIsReverseMode.value || !calcChildCardKey.value || !calcKnownParentCardKey.value || !calcSanitizedSpeciesConfig.value) {
        return [ ]
    }

    const childGenes = getGeneListBySex(calcChildCardKey.value)
    const knownParentGenes = getGeneListBySex(calcKnownParentCardKey.value)
    if (!childGenes.length) return [ ]

    const relevantGeneIds = new Set([
        ...childGenes.map((gene) => gene.geneId),
        ...knownParentGenes.map((gene) => gene.geneId)
    ])
    const relevantGenes = calcCurrentDefs.value.filter((gene) => relevantGeneIds.has(gene.id))
    const stateGroups = relevantGenes.map((geneDef) => ({
        geneDef,
        states: calcBuildUnknownStateOptions(geneDef, childGenes, knownParentGenes)
    }))
    const generatedParents = [ ]

    const buildParents = (index, currentGenes) => {
        if (index >= stateGroups.length) {
            generatedParents.push(currentGenes)
            return
        }

        const { geneDef, states } = stateGroups[index]
        states.forEach((state) => {
            if (!state) {
                buildParents(index + 1, currentGenes)
                return
            }

            buildParents(index + 1, [ ...currentGenes, { geneId: geneDef.id, zygosity: state } ])
        })
    }

    buildParents(0, [ ])

    const matches = generatedParents
        .map((candidateGenes) => {
            const knownParentIsMale = calcKnownParentCardKey.value === 'Male'
            const maleGenes = knownParentIsMale ? knownParentGenes : candidateGenes
            const femaleGenes = knownParentIsMale ? candidateGenes : knownParentGenes
            const result = calculateGenetics(
                calcSanitizedSpeciesConfig.value,
                JSON.parse(JSON.stringify(maleGenes)),
                JSON.parse(JSON.stringify(femaleGenes))
            )

            if (!result) return null

            const matchProbability = result.outcomes.reduce((sum, outcome) => {
                const hasMatch = (outcome.rawGenotypes || []).some((rawGenes) => calcDoesOutcomeMatchChild(rawGenes, childGenes))
                return hasMatch ? sum + outcome.prob : sum
            }, 0)

            const carrierProbability = result.outcomes.reduce((sum, outcome) => {
                const hasCarrierMatch = (outcome.rawGenotypes || []).some((rawGenes) => (
                    calcDoesOutcomeMatchCarrierChild(rawGenes, childGenes) && !calcDoesOutcomeMatchChild(rawGenes, childGenes)
                ))
                return hasCarrierMatch ? sum + outcome.prob : sum
            }, 0)

            if (matchProbability <= 0 && carrierProbability <= 0) return null

            // Filter out results where unknown parent has no genes but known parent has genes
            // and child needs visible expression
            const candidateHasAnyGene = candidateGenes.length > 0
            const knownParentHasAnyGene = knownParentGenes.length > 0
            const childNeedsVisibleGenes = childGenes.some(g => g.zygosity === ZYG.VIS)

            // If candidate has no genes but known parent has, and child needs visible genes
            // This is only valid for carrier probability, not exact match
            if (!candidateHasAnyGene && knownParentHasAnyGene && childNeedsVisibleGenes && matchProbability > 0) {
                return null
            }

            const tier = matchProbability > 0
                ? { key: 'exact', sort: 0, label: '' }
                : calcResolveReverseTier(carrierProbability)

            const recessiveHetStats = {}
            if (tier.key !== 'exact') {
                childGenes
                    .filter((gene) => getGeneDef(gene.geneId)?.type === CALC_TYPES.REC && gene.zygosity === ZYG.VIS)
                    .forEach((gene) => {
                        recessiveHetStats[gene.geneId] = tier.label === 'Het'
                            ? 'Het'
                            : tier.label === '50% Het'
                                ? '50% Poss Het'
                                : tier.label === '66% Het'
                                    ? '66% Poss Het'
                                    : tier.label
                    })
            }

            return {
                genes: candidateGenes,
                prob: matchProbability > 0 ? matchProbability : carrierProbability,
                label: formatGeneListSummary(candidateGenes, recessiveHetStats),
                childLabel: formatGeneListSummary(childGenes),
                totalCombos: result.totalCombos,
                tierKey: tier.key,
                tierSort: tier.sort,
                tierLabel: tier.label
            }
        })
        .filter(Boolean)
        .sort((a, b) => a.tierSort - b.tierSort || b.prob - a.prob || a.genes.length - b.genes.length)

    const uniqueMatches = [ ]
    const seen = new Set()

    matches.forEach((match) => {
        if (seen.has(match.label)) return
        seen.add(match.label)
        uniqueMatches.push(match)
    })

    return uniqueMatches
})

const formatResultText = (text) => text || ''

const formatWarningText = (text) => {
    if (!text) return ''
    return text.replace(/Lethal/gi, '致死').replace(/Super/gi, '超級')
}
</script>

<template>
    <div class="calc-container">
        
        <div class="calc-header">
            <div class="seo-hint">Gencko基因計算機</div>

            <div class="calc-species-selector">
                <div class="calc-species-row">
                    <div class="calc-species-group-col">
                        <div class="calc-selector-dropdown">
                            <button
                                type="button"
                                :class="['calc-selector-chip', 'calc-selector-chip--dropdown', { active: calcSpeciesGroupMenuOpen }]"
                                @click.stop="calcToggleSpeciesGroupMenu()">
                                <span>{{ calcCurrentSpeciesGroupLabel }}</span>
                                <span class="calc-selector-arrow">{{ calcSpeciesGroupMenuOpen ? '▲' : '▼' }}</span>
                            </button>
                            <div v-if="calcSpeciesGroupMenuOpen" class="calc-selector-menu">
                                <button
                                    v-for="group in calcSpeciesGroups"
                                    :key="group.id"
                                    type="button"
                                    :class="['calc-selector-menu-item', { active: calcSpeciesGroup === group.id }]"
                                    @click.stop="calcSelectSpeciesGroup(group.id)">
                                    {{ group.label }}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="calc-species-item-col">
                        <div class="calc-selector-dropdown">
                            <button
                                type="button"
                                :class="['calc-selector-chip', 'calc-selector-chip--dropdown', 'calc-selector-chip--species', { active: calcSpeciesMenuOpen }]"
                                @click.stop="calcToggleSpeciesMenu()">
                                <span>{{ calcCurrentSpeciesLabel }}</span>
                                <span class="calc-selector-arrow">{{ calcSpeciesMenuOpen ? '▲' : '▼' }}</span>
                            </button>
                            <div v-if="calcSpeciesMenuOpen" class="calc-selector-menu">
                                <button
                                    v-for="species in calcSpeciesOptions"
                                    :key="species"
                                    type="button"
                                    :class="['calc-selector-menu-item', { active: calcSp === species }]"
                                    @click.stop="calcSelectSpecies(species)">
                                    {{ species }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="calc-helper-btns">
                <button type="button" class="calc-help-btn" @click="calcActiveInfo = 'types'; calcModalOpen = true">基因觀念</button>
                <button type="button" class="calc-help-btn" @click="calcActiveInfo = 'poly'; calcModalOpen = true">多遺傳說明</button>
            </div>
        </div>

        <div class="calc-parent-grid">
            <div
                v-for="parent in calcParentCards"
                :key="parent.key"
                class="calc-parent-card">
                <div class="calc-p-header">
                    <div class="calc-role-switch">
                        <button
                            type="button"
                            :class="['calc-role-chip', { active: calcCardRoles[parent.key] === parent.defaultRole }]"
                            @click="calcSetRole(parent.key, parent.defaultRole)">
                            {{ parent.label }}
                        </button>
                        <button
                            type="button"
                            :class="['calc-role-chip', { active: calcCardRoles[parent.key] === 'child' }]"
                            @click="calcSetRole(parent.key, 'child')">
                            子代
                        </button>
                    </div>
                </div>

                <div class="calc-p-body">
                    <div class="calc-selected-summary">{{ calcSelectedGeneSummary(parent.key) }}</div>

                    <div class="calc-gene-category-panel">
                        <div class="calc-gene-category-list">
                            <button
                                v-for="category in calcDisplayCategories"
                                :key="`${parent.key}-${category.id}`"
                                type="button"
                                :class="['calc-category-chip', { active: calcExpandedCategories[parent.key] === category.id }]"
                                @click="calcToggleCategory(parent.key, category.id)">
                                {{ category.label }}
                            </button>
                        </div>
                    </div>

                    <div class="calc-inline-panel">
                        <template v-for="category in calcDisplayCategories" :key="`${parent.key}-panel-${category.id}`">
                            <div v-if="calcExpandedCategories[parent.key] === category.id" class="calc-dd-sub calc-dd-sub--inline">
                                <div v-if="category.id === 'morph'">
                                    <div class="calc-dd-grid">
                                        <button
                                            v-for="morph in calcPresetMorphs"
                                            :key="`${parent.key}-morph-${morph.id}`"
                                            type="button"
                                            class="calc-dd-item"
                                            :class="{ selected: calcMatchedMorph(parent.key)?.id === morph.id }"
                                            @click="calcApplyMorph(parent.key, morph)">
                                            <div class="calc-dd-item-row">
                                                <div class="calc-dd-item-main">
                                                    <span>{{ morph.name }}</span>
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                                <div v-else-if="getFilteredGenesForCategory(category.id).filter(g => g.id !== 'normal' && g.id !== 'aft_normal').length" class="calc-dd-grid">
                                    <button
                                        v-for="gene in getFilteredGenesForCategory(category.id).filter(g => g.id !== 'normal' && g.id !== 'aft_normal')"
                                        :key="gene.id"
                                        type="button"
                                        class="calc-dd-item"
                                        :class="{ selected: calcIsGeneSelected(gene.id, parent.key), 'mobile-expanded': calcIsGeneExpanded(gene.id) }"
                                        @click="calcIsGeneSelected(gene.id, parent.key) ? calcRemoveGeneById(parent.key, gene.id) : calcAddGene(gene.id, parent.key)">
                                        <div class="calc-dd-item-row">
                                            <div class="calc-dd-item-main">
                                                <span>{{ gene.name }}</span>
                                            </div>
                                        </div>
                                        <div
                                            v-if="calcIsGeneSelected(gene.id, parent.key) && (gene.type === CALC_TYPES.REC || gene.type === CALC_TYPES.CODOM) && calcIsGeneExpanded(gene.id)"
                                            class="calc-dd-flags"
                                            @click.stop>
                                                <button
                                                    v-if="gene.type === CALC_TYPES.REC"
                                                    type="button"
                                                    :class="['calc-dd-badge', { active: getSelectedGeneEntry(parent.key, gene.id)?.zygosity === ZYG.HET }]"
                                                    @click.stop="calcSetGeneZygosity(parent.key, gene.id, getSelectedGeneEntry(parent.key, gene.id)?.zygosity === ZYG.HET ? ZYG.VIS : ZYG.HET)">
                                                    Het
                                                </button>
                                                <button
                                                    v-else-if="gene.type === CALC_TYPES.CODOM"
                                                    type="button"
                                                    :class="['calc-dd-badge', { active: getSelectedGeneEntry(parent.key, gene.id)?.zygosity === ZYG.SUP }]"
                                                    @click.stop="calcSetGeneZygosity(parent.key, gene.id, getSelectedGeneEntry(parent.key, gene.id)?.zygosity === ZYG.SUP ? ZYG.SGL : ZYG.SUP)">
                                                    超級
                                                </button>
                                            </div>
                                    </button>
                                </div>
                                <div v-else class="calc-inline-hint">目前此分類沒有可選基因</div>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="calcIsReverseMode || calcResult" class="calc-result-area">
            <template v-if="calcIsReverseMode">
                <div v-if="!calcChildCardKey || getGeneListBySex(calcChildCardKey).length === 0" class="calc-inline-hint calc-inline-hint--warn">
                    請先在子代卡片中選擇至少一個基因。</div>

                <div v-else-if="calcReverseMatches.length === 0" class="calc-inline-hint calc-inline-hint--warn">
                    目前沒有符合條件的另一方配對結果。</div>

                <div v-else class="calc-results-grouped">
                    <h3 style="color:var(--pri); font-weight:900; margin-bottom:0;">
                        推薦種{{ calcKnownParentCardKey === 'Male' ? '母' : '公' }}
                    </h3>
                    <div class="calc-res-card-grid">
                        <div
                            v-for="(match, idx) in calcReverseMatches"
                            :key="`reverse-${idx}`"
                            class="calc-reverse-card">
                            <div style="flex: 1;">
                                <div style="font-size: 0.95rem; font-weight: 500; color: var(--txt); margin:0;">{{ match.label }}</div>
                            </div>
                            <div style="text-align: right; margin-left: 12px;">
                                <div style="font-size: 1.4rem; font-weight: bold; color: var(--pri); margin-bottom: 4px;">{{ Math.round(match.prob * 100) }}<small style="font-size:0.8rem">%</small></div>
                                <div style="font-size: 0.9rem; color: #666;">出現 {{ match.childLabel }}</div>
                                <div style="font-size:0.7rem; color:#888; font-family:monospace;" v-if="match.prob < 0.99">
                                    {{ getProbFraction(match.prob) }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </template>

            <template v-else>
            <div v-if="calcResult.warning" class="calc-warn">
                <div style="font-size:1.8rem; line-height:1;">⚠️</div>
                <div style="white-space:pre-line">{{ formatWarningText(calcResult.warning) }}</div>
            </div>

            <div v-if="calcResult.notices && calcResult.notices.length" class="calc-notice">
                <div style="font-size:1.8rem; line-height:1;">ℹ️</div>
                <div>
                    <div v-for="n in calcResult.notices" :key="n">• {{ n }}</div>
                </div>
            </div>

            <div class="calc-results-grouped">
                <div v-if="calcAllOutcomes.length" class="calc-res-card-grid">
                    <div
                        v-for="(o, idx) in calcAllOutcomes"
                        :key="idx"
                        :class="['calc-res-card', {lethal: o.description && o.description.includes('致死')}]">
                        <div class="calc-prob-box">
                            <div class="calc-prob-val">{{ Math.round(o.prob * 100) }}<small style="font-size:0.8rem">%</small></div>
                            <div class="calc-prob-sub" style="font-size:0.75rem;color:#888;font-family:monospace;margin-top:0;" v-if="o.prob < 0.99">
                                {{ getProbFraction(o.prob) }}
                            </div>
                        </div>
                        <div class="calc-res-info" style="display:flex; align-items:center;">
                            <div class="calc-res-name" style="margin:0; line-height:1.4;" v-html="formatResultText(o.fullLabel)"></div>
                        </div>
                    </div>
                </div>
            </div>
            </template>
        </div>

        <!-- Info Modal Overlay -->
        <div v-if="calcModalOpen" class="lightbox-overlay" @click="calcModalOpen = false" style="justify-content:center; padding:20px;">
            <div class="page-text-box" style="width:100%; max-width:600px; max-height:80vh; overflow-y:auto; position:relative;" @click.stop>
                <div class="lightbox-close" @click="calcModalOpen = false" style="top:10px; right:10px; width:40px; height:40px; font-size:1.5rem;">✕</div>
                <h2 style="color:var(--pri); margin-top:0; margin-bottom:0;">
                    {{ calcActiveInfo === 'types' ? '基因觀念' : '多遺傳說明' }}
                </h2>
                
                <div v-if="calcActiveInfo === 'types'">
                    <p style="color:#ff5252; font-weight:bold; border-left:4px solid #ff5252; padding-left:10px;">不同物種的基因規則不同，請依照對應物種資料判讀結果。</p>
                    <h4 style="color:var(--txt); border-bottom:1px solid var(--bd); padding-bottom:5px; margin-top:0;">顯性 (Dominant)</h4>
                    <p style="font-size:0.95rem; color:var(--txt); opacity:0.7;">只要帶有一份基因就會表現出來。</p>
                    <h4 style="color:var(--txt); border-bottom:1px solid var(--bd); padding-bottom:5px; margin-top:0;">共顯性 (Co-Dominant)</h4>
                    <p style="font-size:0.95rem; color:var(--txt); opacity:0.7;">單基因與超級型會有不同表現，超級型通常是兩份相同基因。</p>
                    <h4 style="color:var(--txt); border-bottom:1px solid var(--bd); padding-bottom:5px; margin-top:0;">隱性 (Recessive)</h4>
                    <p style="font-size:0.95rem; color:var(--txt); opacity:0.7;">隱性基因可分為表現型與 Het 攜帶型，需搭配親代組合判讀。</p>
                </div>

                <div v-if="calcActiveInfo === 'poly'">
                    <p style="border-left:4px solid var(--pri); padding-left:10px;">多遺傳特徵通常不是單一基因決定，而是多個條件共同影響。</p>
                    <div style="margin-top:0; background:rgba(255, 69, 0, 0.05); border: 1px solid rgba(255, 69, 0, 0.1); padding:10px; border-radius:8px;">
                        <div style="color:var(--pri); font-weight:bold;">Tangerine</div>
                        <p style="font-size:0.9rem; margin:5px 0 0 0; color:var(--txt); opacity:0.8;">常見於橘色加深、覆蓋面積提升等趨勢表現。</p>
                    </div>
                    <div style="margin-top:0; background:rgba(255, 69, 0, 0.05); border: 1px solid rgba(255, 69, 0, 0.1); padding:10px; border-radius:8px;">
                        <div style="color:var(--pri); font-weight:bold;">Bandit</div>
                        <p style="font-size:0.9rem; margin:5px 0 0 0; color:var(--txt); opacity:0.8;">常見於頭部與背部紋路表現改變的選育方向。</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/*
  計算機頁面樣式
  顏色盡量沿用全站 CSS 變數，避免直接寫死色碼。
*/
.calc-container { max-width: 1100px; margin: 0 auto; position: relative; padding-top: 15px; }

.calc-header { text-align: center; margin-bottom: 0; }
.calc-top-desc { text-align: center; color: var(--pri); font-weight: 700; margin-bottom: 0; font-size: 0.95rem; letter-spacing: 1px; }
.calc-sub-desc { text-align: center; color: var(--txt); opacity: 0.6; font-size: 0.85rem; margin-bottom: 0; }

.calc-species-selector { display: flex; flex-direction: column; gap: 12px; margin: 20px 0 16px; }
.calc-species-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; align-items: start; }
.calc-species-group-col,
.calc-species-item-col { min-width: 0; display: flex; justify-content: flex-start; }
.calc-selector-dropdown { position: relative; width: 100%; }
.calc-selector-chip { padding: 10px 16px; border-radius: 999px; border: 1px solid var(--bd); background: var(--card-bg); color: var(--txt); font-weight: 700; font-size: 0.9rem; font-family: inherit; cursor: pointer; transition: 0.2s; }
.calc-selector-chip:hover { border-color: var(--pri); color: var(--pri); }
.calc-selector-chip.active { background: var(--pri); border-color: var(--pri); color: #fff; box-shadow: 0 6px 16px rgba(255, 69, 0, 0.18); }
.calc-selector-chip--species { min-width: 110px; }
.calc-selector-chip--dropdown { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; text-align: left; }
.calc-selector-arrow { flex-shrink: 0; font-size: 0.7rem; }
.calc-selector-menu { position: absolute; top: calc(100% + 8px); left: 0; right: 0; z-index: 40; display: flex; flex-direction: column; gap: 6px; padding: 8px; border: 1px solid var(--bd); border-radius: 14px; background: var(--card-bg); box-shadow: 0 14px 32px rgba(0,0,0,0.12); }
.calc-selector-menu-item { width: 100%; padding: 9px 12px; border: 1px solid transparent; border-radius: 10px; background: transparent; color: var(--txt); font-size: 0.85rem; font-family: inherit; text-align: left; cursor: pointer; transition: 0.2s; }
.calc-selector-menu-item:hover { border-color: var(--pri); color: var(--pri); background: rgba(255, 69, 0, 0.05); }
.calc-selector-menu-item.active { border-color: var(--pri); color: var(--pri); background: rgba(255, 69, 0, 0.08); }

.calc-helper-btns { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; margin-bottom: 0; }
.calc-help-btn { display: flex; align-items: center; gap: 4px; padding: 5px 12px; border-radius: 20px; border: 1px dashed var(--bd); font-size: 0.85rem; color: var(--txt); opacity: 0.7; cursor: pointer; transition: 0.2s; background: var(--card-bg); font-family: inherit; line-height: 1.4; }
.calc-help-btn:hover { border-color: var(--pri); color: var(--pri); opacity: 1; background: rgba(255, 69, 0, 0.05); }

.calc-parent-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 15px; margin-bottom: 0; }
.calc-parent-card { min-width: 0; max-width: 100%; background: var(--card-bg); border: 1px solid var(--bd); border-radius: 10px; display: flex; flex-direction: column; overflow: visible; border-top: 3px solid var(--pri); transition: 0.3s; box-shadow: 0 5px 20px rgba(0,0,0,0.1); }
.calc-parent-card:hover { transform: translateY(-3px); }

.calc-p-header { padding: 12px; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid var(--bd); }
.calc-role-switch { width: 100%; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.calc-role-chip { width: 100%; padding: 8px 10px; border-radius: 999px; border: 1px solid var(--bd); background: var(--card-bg); color: var(--txt); font-size: 0.8rem; font-family: inherit; cursor: pointer; transition: 0.2s; }
.calc-role-chip.active { background: var(--pri); border-color: var(--pri); color: #fff; }

.calc-p-body { padding: 12px; flex: 1; display: flex; flex-direction: column; gap: 12px; }
.calc-selected-summary { min-height: 44px; padding: 10px 12px; border-radius: 8px; background: rgba(255, 69, 0, 0.06); border: 1px solid rgba(255, 69, 0, 0.14); color: var(--txt); font-size: 0.85rem; line-height: 1.55; }
.calc-morph-list { display: flex; flex-wrap: wrap; gap: 8px; }
.calc-morph-chip { padding: 8px 10px; border-radius: 999px; border: 1px solid var(--bd); background: var(--card-bg); color: var(--txt); font-size: 0.76rem; white-space: nowrap; font-family: inherit; cursor: pointer; transition: 0.2s; }
.calc-morph-chip:hover { border-color: var(--pri); color: var(--pri); }
.calc-morph-chip.active { background: var(--pri); border-color: var(--pri); color: #fff; box-shadow: 0 6px 16px rgba(255, 69, 0, 0.18); }
.calc-gene-category-panel { display: flex; flex-direction: column; gap: 6px; }
.calc-gene-category-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.calc-category-chip { width: 100%; padding: 8px 10px; border-radius: 999px; border: 1px solid var(--bd); background: var(--card-bg); color: var(--txt); font-size: 0.76rem; white-space: nowrap; font-family: inherit; cursor: pointer; transition: 0.2s; overflow: hidden; text-overflow: ellipsis; }
.calc-category-chip:hover { border-color: var(--pri); color: var(--pri); }
.calc-category-chip.active { background: var(--pri); border-color: var(--pri); color: #fff; box-shadow: 0 6px 16px rgba(255, 69, 0, 0.18); }
.calc-inline-hint { padding: 8px 10px; border-radius: 8px; background: rgba(33, 150, 243, 0.08); border: 1px solid rgba(33, 150, 243, 0.18); color: var(--txt); font-size: 0.8rem; line-height: 1.5; }
.calc-inline-hint--warn { background: rgba(255, 193, 7, 0.08); border-color: rgba(255, 193, 7, 0.28); }
.calc-inline-panel { border: 1px solid var(--bd); border-radius: 8px; overflow: hidden; background: var(--card-bg); }
.calc-dd-sub--inline { padding: 8px; }

.calc-dropdown-container { position: relative; z-index: 20; width: 100%; max-width: 100%; }
.calc-add-btn { width: 100%; max-width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid var(--bd); border-radius: 8px; background: var(--card-bg); color: var(--txt); font-weight: bold; font-size: 0.85rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: 0.2s; white-space: nowrap; overflow: hidden; opacity: 0.8; }
.calc-add-btn span:first-child { overflow: hidden; text-overflow: ellipsis; padding-right: 5px; }
@media (hover: hover) {
    .calc-add-btn:hover { border-color: var(--pri); color: var(--pri); opacity: 1; box-shadow: 0 0 10px rgba(255,69,0,0.1); }
}
.calc-add-btn.open { border-color: var(--pri); color: var(--pri); opacity: 1; box-shadow: 0 0 10px rgba(255,69,0,0.1); }
.calc-dropdown-menu { position: absolute; top: 100%; left: 0; width: 100%; box-sizing: border-box; background: var(--card-bg); border: 1px solid var(--bd); border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); z-index: 100; max-height: 250px; overflow-y: auto; overflow-x: hidden; margin-top: 0; }
.calc-dd-group-btn { width: 100%; padding: 10px 12px; text-align: left; background: transparent; border: none; border-bottom: 1px solid var(--bd); color: var(--txt); opacity: 0.9; font-weight: bold; font-size: 0.85rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; transition: 0.2s; }
@media (hover: hover) {
    .calc-dd-group-btn:hover { background: rgba(255, 69, 0, 0.05); color: var(--pri); opacity: 1; }
}
.calc-dd-group-btn.active { background: rgba(255, 69, 0, 0.05); color: var(--pri); opacity: 1; }

.calc-dd-sub { background: rgba(128, 128, 128, 0.05); border-bottom: 1px solid var(--bd); width: 100%; box-sizing: border-box; }
.calc-dd-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.calc-dd-item { width: 100%; min-width: 0; padding: 10px; text-align: left; background: transparent; border: 1px solid var(--bd); border-radius: 10px; color: var(--txt); opacity: 0.95; font-size: 0.78rem; cursor: pointer; display: flex; box-sizing: border-box; line-height: 1.25; transition: 0.2s; }
@media (hover: hover) {
    .calc-dd-item:hover { color: var(--pri); opacity: 1; border-color: var(--pri); background: rgba(255, 69, 0, 0.05); }
}
.calc-dd-item.selected { border-color: var(--pri); background: rgba(255, 69, 0, 0.06); }
.calc-dd-item.expanded { border-color: var(--pri); background: rgba(255, 69, 0, 0.08); }
.calc-dd-item-row { min-width: 0; width: 100%; display: flex; align-items: center; gap: 4px; }
.calc-dd-item-main { min-width: 0; display: flex; flex: 1; overflow: hidden; }
.calc-dd-item-main > span:first-child { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.calc-dd-flags { display: flex; justify-content: flex-end; margin-top: 0; width: 100%; }
.calc-dd-badge { padding: 4px 8px; border-radius: 999px; border: 1px solid var(--bd); font-size: 0.68rem; line-height: 1; color: var(--txt); background: var(--card-bg); cursor: pointer; font-family: inherit; transition: 0.2s; }
.calc-dd-badge:hover { border-color: var(--pri); color: var(--pri); }
.calc-dd-badge.active { border-color: var(--pri); color: var(--pri); background: rgba(255, 69, 0, 0.08); }
.calc-dd-combo-group { padding: 8px 15px; font-size: 0.8rem; font-weight: bold; color: var(--txt); opacity: 0.7; display: flex; align-items: center; gap: 5px; cursor: pointer; border-bottom: 1px solid var(--bd); width: 100%; box-sizing: border-box; transition: 0.2s; }
.calc-dd-combo-group:hover { color: var(--pri); opacity: 1; background: rgba(255, 69, 0, 0.05); }

.calc-tag.super { background: rgba(156, 39, 176, 0.1); color: #ce93d8; border-color: rgba(156, 39, 176, 0.4); font-weight: bold; }
.calc-tag.het { font-size: 0.75rem; }

.calc-result-area { margin-top: 0; animation: fadeUp 0.5s ease; padding-bottom: 40px; }
/* 結果提示 */
.calc-warn, .calc-notice {
    padding: 15px; 
    border-radius: 6px; 
    margin-bottom: 15px; 
    border-left: 5px solid; 
    display: flex; 
    gap: 12px;
    align-items: center;
    font-weight: bold;
    line-height: 1.5;
    color: var(--txt);
}

.calc-warn { 
    background: rgba(244, 67, 54, 0.1); 
    border-color: #f44336; 
}

.calc-notice { 
    background: rgba(255, 193, 7, 0.1); 
    border-color: #ffc107; 
}

.calc-res-card { background: var(--card-bg); border: 1px solid var(--bd); border-radius: 8px; margin-bottom: 0; display: flex; overflow: visible; transition: 0.3s; position: relative; }
.calc-res-card::after { content: ''; position: absolute; bottom: 0; right: 0; width: 0; height: 0; border-left: 15px solid transparent; border-top: 15px solid transparent; border-right: 15px solid var(--pri); border-bottom: 15px solid var(--pri); border-radius: 0 0 8px 0; }
.calc-reverse-card { background: var(--card-bg); border: 1px solid var(--bd); border-radius: 8px; margin-bottom: 0; display: flex; overflow: visible; align-items: center; justify-content: space-between; padding: 12px; transition: 0.3s; position: relative; }
.calc-reverse-card::after { content: ''; position: absolute; bottom: 0; right: 0; width: 0; height: 0; border-left: 15px solid transparent; border-top: 15px solid transparent; border-right: 15px solid var(--pri); border-bottom: 15px solid var(--pri); border-radius: 0 0 8px 0; }
.calc-res-card:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.1); border-color: var(--pri); }
.calc-res-card.lethal { border-top-color: #f44336; background: rgba(244,67,54,0.05); }
.calc-prob-box { width: 90px; background: rgba(128,128,128,0.05); display: flex; flex-direction: column; align-items: center; justify-content: center; border-right: 1px solid var(--bd); flex-shrink: 0; padding: 8px; }
.calc-prob-val { font-size: 1.4rem; font-weight: 900; color: var(--pri); line-height: 1; }
.calc-res-card.lethal .calc-prob-val { color: #f44336; }
.calc-res-info { padding: 12px; flex: 1; }
.calc-res-name { font-size: 1rem; font-weight: bold; margin-bottom: 0; color: var(--txt); word-break: break-word; }
.calc-reverse-tier { font-size: 0.8rem; color: var(--txt); opacity: 0.65; }

/* Mobile View Overrides */
@media (max-width: 768px) {
    .calc-container { padding-top: 0 !important; margin-top: -10px; }
    .calc-header { margin-bottom: 0 !important; }
    .calc-top-desc { font-size: 0.95rem; margin-bottom: 0; }
    .calc-sub-desc { font-size: 0.75rem; margin-bottom: 0; opacity: 0.8; line-height: 1.2; }
    
    .calc-species-row { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .calc-selector-chip { font-size: 0.8rem; padding: 8px 12px; }
    .calc-selector-menu { padding: 6px; border-radius: 12px; }
    .calc-selector-menu-item { font-size: 0.8rem; padding: 8px 10px; }
    
    .calc-helper-btns { display: flex; width: 100%; gap: 10px; margin-bottom: 0; padding: 0 2px; }
    .calc-help-btn { flex: 1; display: flex; align-items: center; justify-content: center; text-align: center; white-space: nowrap; font-size: 0.85rem; padding: 8px; border-radius: 6px; }

    .calc-parent-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 6px; margin-bottom: 0; }
    
    .calc-parent-card { 
        overflow: visible; 
        display: flex; 
        flex-direction: column; 
        transform: none !important; 
        box-shadow: none !important;
        background: transparent !important; 
        border: none !important; 
    }
    
    .calc-p-header { border-radius: 8px 8px 0 0; background: var(--card-bg); border: 1px solid var(--bd); border-bottom: none; padding: 8px; }
    .calc-role-switch { gap: 6px; }
    
    .calc-p-body { background: var(--card-bg); border: 1px solid var(--bd); border-top: none; border-radius: 0 0 8px 8px; padding: 8px; gap: 8px; flex: 1; display: flex; flex-direction: column; }
    .calc-selected-summary { min-height: 64px; font-size: 0.8rem; padding: 8px 10px; }
    .calc-morph-list { gap: 4px; flex-wrap: nowrap; overflow-x: auto; justify-content: flex-start; scrollbar-width: none; }
    .calc-morph-list::-webkit-scrollbar { display: none; }
    .calc-morph-chip { font-size: 0.68rem; padding: 7px 8px; }
    .calc-gene-category-list { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; }
    .calc-category-chip { font-size: 0.68rem; padding: 7px 8px; }
    .calc-inline-hint { font-size: 0.75rem; padding: 7px 9px; }
    .calc-dd-grid { gap: 6px; }
    .calc-dd-item { padding: 8px; font-size: 0.74rem; flex-direction: column; }
    .calc-dd-item-row { gap: 3px; }
    .calc-dd-badge { font-size: 0.62rem; padding: 4px 6px; }
    .calc-dd-flags { display: none !important; margin-top: 0; }
    .calc-dd-item.mobile-expanded .calc-dd-flags { display: flex !important; }

    .calc-dropdown-container { position: static; } 
    .calc-add-btn { width: 100%; padding: 10px; font-size: 0.85rem; text-align: center; justify-content: center; }
    
    .calc-dropdown-menu {
        position: fixed !important;
        top: 50% !important; 
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        width: 85% !important; 
        max-height: 75vh !important;
        height: auto !important;
        z-index: 2147483647 !important; 
        border-radius: 12px !important;
        border: 1px solid var(--bd) !important;
        background: var(--card-bg); 
        padding: 0 !important; 
        overflow-y: auto;
        display: block;
        box-shadow: 0 20px 50px rgba(0,0,0,0.4) !important;
        will-change: transform, opacity;
        backface-visibility: hidden;
        -webkit-font-smoothing: antialiased;
    }
    
    .mobile-close-x {
        font-size: 1.5rem; 
        cursor: pointer;
        width: 30px; 
        height: 30px; 
        display: flex; 
        align-items: center; 
        justify-content: center;
        border-radius: 50%;
        background: rgba(128,128,128,0.1);
    }

    .mobile-close-hint {
        display: flex !important;
        position: sticky !important;
        top: 0; left: 0; width: 100%;
        height: 50px;
        background: var(--card-bg);
        border-bottom: 1px solid var(--bd);
        align-items: center;
        justify-content: space-between;
        padding: 0 15px;
        z-index: 100000;
        font-weight: bold;
        color: var(--txt);
        border-radius: 12px 12px 0 0;
    }
    
    .calc-dd-group-btn { padding: 15px; font-size: 1rem; border-bottom: 1px solid var(--bd); }
    
    .calc-result-area { padding-bottom: 80px; }
    .calc-res-card { flex-direction: row; align-items: center; padding: 5px; min-height: 70px; }
    .calc-prob-box { width: 60px; height: 100%; border-right: 1px solid var(--bd); border-bottom: none; background: transparent; padding: 0 5px; flex-direction: column; justify-content: center; gap: 0; }
    .calc-res-info { padding: 5px 10px; overflow: hidden; }
}

@media (min-width: 769px) {
    .mobile-close-hint { display: none !important; }
}

.dropdown-anim-enter-active,
.dropdown-anim-leave-active { transition: all 0.2s ease-out; }
.dropdown-anim-enter-from,
.dropdown-anim-leave-to { opacity: 0; transform: translateY(-10px); }

@media (max-width: 768px) {
    .dropdown-anim-enter-active { animation: mobile-zoom-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
    .dropdown-anim-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
    .dropdown-anim-enter-from,
    .dropdown-anim-leave-to { opacity: 0; transform: translate(-50%, -50%) scale(0.9) !important; }
}

@keyframes mobile-zoom-in {
    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
    100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

.slide-anim-enter-active,
.slide-anim-leave-active { transition: all 0.2s ease; max-height: 500px; overflow: hidden; }
.slide-anim-enter-from,
.slide-anim-leave-to { opacity: 0; max-height: 0; }

/* 卡片資訊區 */
.calc-mode-selector {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    justify-content: center;
    flex-wrap: wrap;
}

.calc-mode-btn {
    padding: 10px 18px;
    border: 2px solid var(--bd);
    border-radius: 8px;
    background: var(--card-bg);
    color: var(--txt);
    cursor: pointer;
    transition: all 0.3s;
    font-weight: 700;
    font-size: 0.9rem;
    font-family: inherit;
}

.calc-mode-btn:hover {
    border-color: var(--pri);
    color: var(--pri);
}

.calc-mode-btn.active {
    background: var(--pri);
    color: #fff;
    border-color: var(--pri);
    box-shadow: 0 4px 12px rgba(255, 69, 0, 0.3);
}

/* 結果卡強化 */
.calc-reverse-mode {
    margin-bottom: 25px;
}

.calc-outcome-preview {
    background: var(--card-bg);
    border: 1px solid var(--bd);
    border-radius: 10px;
    padding: 20px;
    border-top: 3px solid var(--pri);
}

.calc-outcome-preview h3 {
    color: var(--txt);
    font-size: 1.2rem;
    font-weight: 900;
    margin: 0 0 10px 0;
}

.calc-outcome-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.calc-outcome-preview-item {
    padding: 15px;
    background: var(--card-bg);
    border: 1px solid var(--bd);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
}

.calc-outcome-preview-item:hover {
    border-color: var(--pri);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: translateX(5px);
}

.calc-outcome-preview-item.tier-1 {
    border-left: 4px solid var(--pri);
    background: rgba(255, 69, 0, 0.08);
    font-weight: 700;
}

.calc-outcome-preview-item.tier-2 {
    border-left: 2px solid var(--pri);
}

.calc-outcome-preview-item.tier-3 {
    border-left: 1px solid var(--bd);
    opacity: 0.7;
}

.calc-outcome-preview-item.selected {
    border: 2px solid var(--pri);
    box-shadow: 0 0 12px rgba(255, 69, 0, 0.3);
}

/* 結果卡狀態樣式 */
.calc-reverse-parents-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--card-bg);
    border-top: 2px solid var(--pri);
    border-radius: 20px 20px 0 0;
    padding: 20px;
    max-height: 70vh;
    overflow-y: auto;
    z-index: 100;
    box-shadow: 0 -5px 30px rgba(0, 0, 0, 0.15);
    animation: slideUp 0.3s ease;
}

.calc-reverse-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid var(--bd);
}

.calc-reverse-panel-header h3 {
    margin: 0 0 5px 0;
    font-size: 1.2rem;
    word-break: break-word;
    white-space: normal;
}

.calc-reverse-close {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--txt);
    opacity: 0.6;
    transition: 0.2s;
    padding: 5px;
    line-height: 1;
}

.calc-reverse-close:hover {
    opacity: 1;
    color: var(--pri);
    transform: scale(1.1);
}

.calc-reverse-panel-content {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

@keyframes slideUp {
    from {
        transform: translateY(100%);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.panel-anim-enter-active,
.panel-anim-leave-active {
    transition: all 0.3s ease;
}

.panel-anim-enter-from,
.panel-anim-leave-to {
    transform: translateY(100%);
    opacity: 0;
}

@media (max-width: 768px) {
    .calc-reverse-parents-panel {
        padding: 15px;
        max-height: 60vh;
    }

    .calc-reverse-panel-header {
        flex-direction: column;
        gap: 10px;
    }

    .calc-reverse-close {
        position: absolute;
        top: 10px;
        right: 15px;
    }
}

/* 詳細資料區 */
.calc-res-card-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    margin-bottom: 0;
}

.calc-res-card-grid-tier2 {
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
}

.calc-res-card-grid-tier3 {
    grid-template-columns: 1fr;
}

/* Tier 1: 擃?? */
.calc-res-card.tier-1 {
    border-left: 4px solid var(--pri) !important;
    background: rgba(255, 69, 0, 0.08) !important;
    min-height: 90px;
    position: relative;
}

.calc-res-card.tier-1::before {
    content: '結果';
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(255, 69, 0, 0.2);
    color: var(--pri);
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: bold;
    z-index: 1;
}

.calc-res-card.tier-1 .calc-res-name {
    font-weight: 900 !important;
    font-size: 1.05rem !important;
}

.calc-res-card.tier-1 .calc-prob-val {
    color: var(--pri);
    font-size: 1.5rem !important;
}

/* Tier 2: 銝剖?? */
.calc-res-card.tier-2 {
    border-left: 2px solid var(--pri) !important;
    background: var(--card-bg) !important;
}

.calc-res-card.tier-2 .calc-prob-val {
    color: var(--pri);
}

/* Tier 3: 雿?? */
.calc-res-card.tier-3 {
    border-left: 1px solid var(--bd) !important;
    background: rgba(128, 128, 128, 0.03) !important;
    opacity: 0.8;
}

.calc-res-card.tier-3 .calc-prob-val {
    color: var(--txt);
    opacity: 0.6;
}

.calc-res-card.tier-3 .calc-res-name {
    opacity: 0.7;
}

/* 結果區塊間距 */
.calc-results-tier-1,
.calc-results-tier-2,
.calc-results-tier-3 {
    margin-bottom: 20px;
}

.calc-results-grouped {
    /* 右上角標記 */
}

/* 行動版細節調整 */
@media (max-width: 768px) {
    .calc-mode-selector {
        flex-direction: column;
        gap: 8px;
    }

    .calc-mode-btn {
        width: 100%;
        padding: 12px;
    }

    .calc-res-card-grid-tier2 {
        grid-template-columns: 1fr;
    }

    .calc-res-card.tier-1 {
        min-height: 70px;
    }

    .calc-res-card.tier-1::before {
        font-size: 0.7rem;
        padding: 3px 8px;
    }

    .calc-outcome-preview-item {
        padding: 12px;
    }
}

/* 動畫 */
.calc-res-card.lethal .calc-prob-val {
    color: #f44336 !important;
}
</style>

