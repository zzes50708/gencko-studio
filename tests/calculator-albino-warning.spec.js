import { describe, it, expect } from 'vitest'
import { LEOPARD_GECKO_CHECKS } from '../utils/genetics/leopardgecko.config'
describe('白化配對提示', () => {
  it('相同白化出現在雙親不誤判為不同種類', () => {
    expect(
      LEOPARD_GECKO_CHECKS.validateAlbinos([{ geneId: 'tremper' }, { geneId: 'tremper' }])
        ?.hasWarning
    ).not.toBe(true)
  })
  it('不同白化種類仍提示', () => {
    expect(
      LEOPARD_GECKO_CHECKS.validateAlbinos([{ geneId: 'tremper' }, { geneId: 'bell' }])?.hasWarning
    ).toBe(true)
  })
})
