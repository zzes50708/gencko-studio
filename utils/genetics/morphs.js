import { CALC_TYPES, ZYG } from '../genes.js'

export function buildDefaultGeneSelection(geneDef) {
  if (!geneDef) return null

  let zygosity = ZYG.VIS
  if (geneDef.type === CALC_TYPES.CODOM) zygosity = ZYG.SGL

  return {
    geneId: geneDef.id,
    zygosity
  }
}

export function expandMorphComponents(morphDef) {
  if (!morphDef || !Array.isArray(morphDef.components)) return []

  return morphDef.components.map((component) => ({
    geneId: component.geneId,
    zygosity:
      component.type === 'Het'
        ? ZYG.HET
        : component.type === 'Super'
          ? ZYG.SUP
          : component.type === 'Single'
            ? ZYG.SGL
            : ZYG.VIS
  }))
}

export function normalizeGeneSelection(genes = []) {
  return genes
    .map((gene) => `${gene.geneId}:${gene.zygosity}`)
    .sort()
    .join('|')
}

export function areGeneSelectionsEqual(leftGenes = [], rightGenes = []) {
  return normalizeGeneSelection(leftGenes) === normalizeGeneSelection(rightGenes)
}

export function getPresetMorphs(speciesConfig) {
  return (speciesConfig?.presetMorphs || speciesConfig?.genes || []).filter(
    (gene) => Array.isArray(gene.components) && gene.components.length > 0
  )
}

export function findMatchingMorph(speciesConfig, genes = []) {
  const presetMorphs = getPresetMorphs(speciesConfig)
  return presetMorphs.find((morph) => areGeneSelectionsEqual(expandMorphComponents(morph), genes)) || null
}
