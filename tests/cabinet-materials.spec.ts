import { describe, expect, it } from 'vitest'
import { Texture } from 'three'
import {
  boardTextureRepeat,
  createAcrylicMaterial,
  createBoardFaceMaterial,
  createPpMaterial
} from '../utils/cabinet/materials'

describe('爬櫃實體材質', () => {
  it('壓克力透射清晰，PP 盒仍保留磨砂', () => {
    const acrylic = createAcrylicMaterial(false, 0.05)
    const pp = createPpMaterial(false, 0.05)
    expect(acrylic.transmission).toBe(0.99)
    expect(acrylic.roughness).toBeLessThan(pp.roughness)
    acrylic.dispose()
    pp.dispose()
  })
  it('板面變大時增加貼圖重複次數，保持每 60 公分相同密度', () => {
    expect(boardTextureRepeat(120, 30).toArray()).toEqual([2, 0.5])
    const source = new Texture()
    const clones: Texture[] = []
    const material = createBoardFaceMaterial(
      { color: source, normal: source, roughness: source },
      120,
      30,
      '#fff',
      (texture) => {
        clones.push(texture)
        return texture
      }
    )
    expect(material.map?.repeat.toArray()).toEqual([2, 0.5])
    expect(material.normalMap?.repeat.toArray()).toEqual([2, 0.5])
    expect(material.roughnessMap?.repeat.toArray()).toEqual([2, 0.5])
    expect(source.repeat.toArray()).toEqual([1, 1])
    clones.forEach((texture) => texture.dispose())
    material.dispose()
    source.dispose()
  })
  it('磨砂塑膠保留物理透光，厚度依展示縮放同步', () => {
    const material = createPpMaterial(false, 0.05)
    expect(material.transmission).toBe(0.8)
    expect(material.roughness).toBe(0.32)
    expect(material.ior).toBe(1.49)
    expect(material.thickness).toBeCloseTo(0.008)
    expect(material.transparent).toBe(false)
    material.dispose()
  })
})
