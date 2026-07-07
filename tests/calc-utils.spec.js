import { describe, it, expect } from 'vitest'
import { calculateGenetics, getProbFraction } from '../utils/calcUtils'
import { LeopardGeckoConfig } from '../utils/genetics/leopardgecko.config.js'
import { ZYG } from '../utils/genes.js'

const cfg = LeopardGeckoConfig

const findByDesc = (outcomes, text) =>
  outcomes.find((o) => o.description === text || o.fullLabel === text || o.fullLabel.includes(text))

describe('getProbFraction', () => {
  it('returns "" for ~1.0', () => {
    expect(getProbFraction(1)).toBe('')
    expect(getProbFraction(0.999)).toBe('')
  })
  it('returns 1/N for clean Mendelian fractions', () => {
    expect(getProbFraction(0.5)).toBe('1/2')
    expect(getProbFraction(0.25)).toBe('1/4')
    expect(getProbFraction(0.125)).toBe('1/8')
  })
  it('returns "" for non-Mendelian numbers', () => {
    // 0.17 → round(1/0.17)=6，不在 [2,3,4,8,16,32,...] 允許清單
    expect(getProbFraction(0.17)).toBe('')
  })
})

describe('calculateGenetics — guard rails', () => {
  it('returns null when both parents are empty', () => {
    expect(calculateGenetics(cfg, [], [])).toBeNull()
  })
})

describe('calculateGenetics — recessive (川普白化 tremper)', () => {
  it('VIS × VIS → 100% visual', () => {
    const r = calculateGenetics(
      cfg,
      [{ geneId: 'tremper', zygosity: ZYG.VIS }],
      [{ geneId: 'tremper', zygosity: ZYG.VIS }]
    )
    expect(r.totalCombos).toBe(1)
    expect(r.outcomes[0].description).toBe('川普白化')
    expect(r.outcomes[0].prob).toBeCloseTo(1, 5)
  })

  it('Het × Het → 25% visual + 75% wild bucket (66% Poss Het)', () => {
    const r = calculateGenetics(
      cfg,
      [{ geneId: 'tremper', zygosity: ZYG.HET }],
      [{ geneId: 'tremper', zygosity: ZYG.HET }]
    )
    expect(r.totalCombos).toBe(2)
    const visual = findByDesc(r.outcomes, '川普白化')
    const wild = findByDesc(r.outcomes, '原色')
    expect(visual.prob).toBeCloseTo(0.25, 5)
    expect(wild.prob).toBeCloseTo(0.75, 5)
    expect(wild.fullLabel).toMatch(/66% Het/)
    expect(wild.fullLabel).toMatch(/川普白化/)
  })

  it('Het × Wild → 50% het 50% wild, both in wild-look bucket', () => {
    const r = calculateGenetics(cfg, [{ geneId: 'tremper', zygosity: ZYG.HET }], [])
    expect(r.totalCombos).toBe(1)
    expect(r.outcomes[0].description).toBe('原色')
    expect(r.outcomes[0].prob).toBeCloseTo(1, 5)
    expect(r.outcomes[0].fullLabel).toMatch(/50% Het/)
    expect(r.outcomes[0].fullLabel).toMatch(/川普白化/)
  })
})

describe('calculateGenetics — codominant (馬克雪花 macksnow)', () => {
  it('SGL × SGL → super:single:wild = 1:2:1', () => {
    const r = calculateGenetics(
      cfg,
      [{ geneId: 'macksnow', zygosity: ZYG.SGL }],
      [{ geneId: 'macksnow', zygosity: ZYG.SGL }]
    )
    expect(r.totalCombos).toBe(3)
    const totalProb = r.outcomes.reduce((s, o) => s + o.prob, 0)
    expect(totalProb).toBeCloseTo(1, 5)

    const sgl = findByDesc(r.outcomes, '馬克雪花')
    const wild = findByDesc(r.outcomes, '原色')
    expect(sgl.prob).toBeCloseTo(0.5, 5)
    expect(wild.prob).toBeCloseTo(0.25, 5)

    // 超級雪花 由 comboRule macksnow:SUP 命中（不是 "超級馬克雪花"）
    const sup = r.outcomes.find((o) => /超級雪花|超級馬克雪花/.test(o.description))
    expect(sup).toBeDefined()
    expect(sup.prob).toBeCloseTo(0.25, 5)
  })
})

describe('calculateGenetics — dominant (謎 enigman)', () => {
  it('VIS × Wild → 50% 謎 + 50% 原色', () => {
    const r = calculateGenetics(cfg, [{ geneId: 'enigman', zygosity: ZYG.VIS }], [])
    expect(r.totalCombos).toBe(2)
    const eni = findByDesc(r.outcomes, '謎')
    const wild = findByDesc(r.outcomes, '原色')
    expect(eni.prob).toBeCloseTo(0.5, 5)
    expect(wild.prob).toBeCloseTo(0.5, 5)
  })
})

describe('calculateGenetics — warnings', () => {
  it('mixing albinos (tremper × bell) triggers warning', () => {
    const r = calculateGenetics(
      cfg,
      [{ geneId: 'tremper', zygosity: ZYG.VIS }],
      [{ geneId: 'bell', zygosity: ZYG.VIS }]
    )
    expect(r.warning).toMatch(/白化基因/)
  })

  it('lemonfrost surfaces tumor warning', () => {
    const r = calculateGenetics(cfg, [{ geneId: 'lemonfrost', zygosity: ZYG.SGL }], [])
    expect(r.warning).toMatch(/腫瘤/)
  })
})

describe('calculateGenetics — combo expansion (raptor)', () => {
  it('VIS raptor × VIS raptor expands to 5 component genes and produces a single visual outcome', () => {
    const r = calculateGenetics(
      cfg,
      [{ geneId: 'raptor', zygosity: ZYG.VIS }],
      [{ geneId: 'raptor', zygosity: ZYG.VIS }]
    )
    expect(r).not.toBeNull()
    expect(r.totalCombos).toBe(1)
    // tremper + eclipse + tangerine + patternless_stripe + carrottail components
    // The raptor combo rule should fire → 紅眼暴龍 in name
    expect(r.outcomes[0].fullLabel).toMatch(/紅眼暴龍|川普白化/)
  })
})
