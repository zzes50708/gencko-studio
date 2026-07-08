import { CALC_TYPES, ZYG } from '../genes'

export function buildDefaultGeneSelection(geneDef: any) {
  if (!geneDef) return null

  let zygosity = ZYG.VIS
  if (geneDef.type === CALC_TYPES.CODOM) zygosity = ZYG.SGL

  return {
    geneId: geneDef.id,
    zygosity
  }
}

export function expandMorphComponents(morphDef: any) {
  if (!morphDef || !Array.isArray(morphDef.components)) return []

  return morphDef.components.map((component: any) => ({
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

export function normalizeGeneSelection(genes: any[] = []) {
  return genes
    .map((gene) => `${gene.geneId}:${gene.zygosity}`)
    .sort()
    .join('|')
}

export function areGeneSelectionsEqual(leftGenes: any[] = [], rightGenes: any[] = []) {
  return normalizeGeneSelection(leftGenes) === normalizeGeneSelection(rightGenes)
}

export function getPresetMorphs(speciesConfig: any) {
  return (speciesConfig?.presetMorphs || speciesConfig?.genes || []).filter(
    (gene: any) => Array.isArray(gene.components) && gene.components.length > 0
  )
}

export function findMatchingMorph(speciesConfig: any, genes: any[] = []) {
  const presetMorphs = getPresetMorphs(speciesConfig)
  return (
    presetMorphs.find((morph: any) =>
      areGeneSelectionsEqual(expandMorphComponents(morph), genes)
    ) || null
  )
}
