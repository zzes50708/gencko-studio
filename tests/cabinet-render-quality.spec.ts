import { describe, expect, it } from 'vitest'
import { cabinetQualityProfile, createCabinetQualitySampler } from '../utils/cabinet/renderQuality'

describe('爬櫃畫質預算', () => {
  it('高像素手機保持高清待機，但操作倍率及總像素有上限', () => {
    const profile = cabinetQualityProfile({
      touch: true,
      pixelRatio: 3,
      cores: 8,
      memory: 8,
      width: 390,
      height: 800
    })
    expect(profile.resting).toBeGreaterThan(profile.active)
    expect(profile.resting).toBeLessThanOrEqual(1.75)
    expect(profile.active).toBe(1)
    expect(profile.resting ** 2 * 390 * 800).toBeLessThanOrEqual(1500000)
  })
  it('弱裝置與超寬螢幕限制 GPU 預算，缺少能力資訊仍可使用', () => {
    const low = cabinetQualityProfile({
      touch: true,
      pixelRatio: 3,
      cores: 4,
      memory: 4,
      width: 390,
      height: 800
    })
    expect(low.resting).toBeLessThanOrEqual(1.25)
    expect(low.shadowSize).toBe(512)
    const large = cabinetQualityProfile({ touch: false, pixelRatio: 2, width: 3840, height: 2160 })
    expect(large.resting ** 2 * 3840 * 2160).toBeLessThanOrEqual(2400001)
    expect(large.minimum).toBeLessThanOrEqual(large.active)
    const limitedLarge = cabinetQualityProfile({
      touch: false,
      pixelRatio: 2,
      cores: 4,
      width: 3840,
      height: 2160
    })
    expect(limitedLarge.resting ** 2 * 3840 * 2160).toBeLessThanOrEqual(900001)
    const sampler = createCabinetQualitySampler(large)
    for (let i = 0; i < 120; i++) sampler.sample(16)
    expect(sampler.ratio).toBeLessThanOrEqual(large.active)
  })
  it('慢幀逐步降倍率、恢復後有界回升，長待機間隔不影響判定', () => {
    const profile = cabinetQualityProfile({ touch: true, pixelRatio: 3, width: 390, height: 800 })
    const sampler = createCabinetQualitySampler(profile)
    for (let i = 0; i < 120; i++) sampler.sample(50)
    expect(sampler.ratio).toBe(profile.minimum)
    sampler.sample(2000)
    expect(sampler.ratio).toBe(profile.minimum)
    for (let i = 0; i < 240; i++) sampler.sample(16)
    expect(sampler.ratio).toBe(profile.active)
  })
})
