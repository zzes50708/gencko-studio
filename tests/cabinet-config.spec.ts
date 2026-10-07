import { describe, expect, it } from 'vitest'
import { BOXES, calculateCabinet, type CabinetInput } from '../utils/cabinet/config'

const input = (changes: Partial<CabinetInput> = {}): CabinetInput => ({
  template: 'a4',
  boxVariant: 'a4',
  rows: 4,
  columns: 2,
  finish: 'oak',
  boxColor: 'clear',
  counts: { thermometer: 0, switch: 0, metalSwitch: 0, extraThermostat: 0 },
  ledLayers: 0,
  ledColor: 'warm',
  storageHeight: 0,
  wheels: false,
  lighting: 'center',
  lightLevel: 70,
  clearances: { horizontal: 0.5, vertical: 0.5, depth: 1, controlHeight: 8 },
  ...changes
})

describe('爬櫃實體配置與匯出資料', () => {
  it('收納高度使用五公分級距並保留不加裝選項', () => {
    for (const [requested, expected] of [
      [0, 0],
      [1, 10],
      [12, 10],
      [13, 15],
      [78, 80],
      [100, 80]
    ]) {
      expect(
        calculateCabinet(input({ storageHeight: requested })).configuration.storageHeight
      ).toBe(expected)
    }
  })
  it('底部收納預設抽屜，雙開門與無門款式保留於配置', () => {
    expect(calculateCabinet(input({ storageHeight: 25 })).configuration.storageStyle).toBe('drawer')
    for (const storageStyle of ['doors', 'open'] as const) {
      const cfg = calculateCabinet(input({ storageHeight: 25, storageStyle })).configuration
      expect(cfg.storageStyle).toBe(storageStyle)
      expect(cfg.storageHeight).toBe(25)
    }
  })
  it('預設美國加熱墊，韓國款選擇保留於匯出配置', () => {
    expect(calculateCabinet(input()).configuration.heatingMat).toBe('calorique')
    expect(calculateCabinet(input({ heatingMat: 'korea' })).configuration.heatingMat).toBe('korea')
  })
  it('所有盒型最多 130 公分，A4 五抽、A6 十抽、A3 兩抽', () => {
    for (const variant of Object.keys(BOXES) as (keyof typeof BOXES)[]) {
      const cfg = calculateCabinet(input({ boxVariant: variant, columns: 999 })).configuration
      expect(cfg.dimensions.width).toBeLessThanOrEqual(130)
    }
    expect(calculateCabinet(input({ boxVariant: 'a4', columns: 999 })).configuration.columns).toBe(
      5
    )
    expect(calculateCabinet(input({ boxVariant: 'a6', columns: 999 })).configuration.columns).toBe(
      10
    )
    expect(calculateCabinet(input({ boxVariant: 'a3', columns: 999 })).configuration.columns).toBe(
      2
    )
  })
  it('異常輸入不產生無效模型尺寸', () => {
    const c = calculateCabinet(
      input({
        rows: NaN,
        columns: -3,
        storageHeight: Infinity,
        ledLayers: 900,
        counts: { thermometer: 900, switch: -1, metalSwitch: NaN, extraThermostat: 0 }
      })
    ).configuration
    expect(c.rows).toBeGreaterThan(0)
    expect(c.columns).toBe(1)
    expect(c.ledLayers).toBeLessThanOrEqual(c.rows)
    expect(c.counts.thermometer).toBeLessThanOrEqual(4)
    expect(c.counts.switch).toBe(0)
    expect(Object.values(c.dimensions).every((n) => Number.isFinite(n) && n > 0)).toBe(true)
  })
  it('採用照片中的盒外尺寸，不把 A4 紙張尺寸當成盒款尺寸', () => {
    expect(BOXES.a4.dimensions).toEqual({ length: 34, width: 24, height: 10.1 })
    expect(BOXES.a6.dimensions.width).toBe(12)
    expect(BOXES['tub-xl'].dimensions).toMatchObject({
      length: 38,
      width: 24,
      height: 17,
      bottomLength: 33,
      bottomWidth: 19.6
    })
    expect(BOXES['acrylic-m'].dimensions).toEqual({ length: 30, width: 20, height: 15 })
    expect(BOXES['acrylic-l'].dimensions).toEqual({ length: 40, width: 30, height: 20 })
  })
  it('正面以盒寬排抽，深度以盒長計算，包含兩側與背板', () => {
    const { configuration: c } = calculateCabinet(input())
    expect(c.dimensions.width).toBe(53.5)
    expect(c.dimensions.depth).toBe(37)
    expect(c.boardThickness).toBe(2)
  })
  it('窄櫃大量儀表會換排，所有儀表留在控制面板範圍內', () => {
    const result = calculateCabinet(
      input({
        boxVariant: 'a6',
        columns: 1,
        counts: { thermometer: 4, switch: 4, metalSwitch: 0, extraThermostat: 4 }
      })
    )
    expect(result.hardware).toHaveLength(10)
    for (const piece of result.hardware) {
      expect(Math.abs(piece.x) + piece.width / 2).toBeLessThanOrEqual(result.innerWidth / 2)
      expect(piece.y + piece.height / 2).toBeLessThanOrEqual(
        result.configuration.clearances.controlHeight
      )
    }
    for (let i = 0; i < result.hardware.length; i++) {
      for (let j = i + 1; j < result.hardware.length; j++) {
        const a = result.hardware[i]!
        const b = result.hardware[j]!
        const separateX = Math.abs(a.x - b.x) >= (a.width + b.width) / 2
        const separateY = Math.abs(a.y - b.y) >= (a.height + b.height) / 2
        expect(separateX || separateY).toBe(true)
      }
    }
    expect(result.minimumControlHeight).toBeGreaterThan(8)
  })
  it('收納高度增加不改櫃寬；輪組高度列入總高度', () => {
    const base = calculateCabinet(input()).configuration
    const added = calculateCabinet(input({ storageHeight: 20, wheels: true })).configuration
    expect(added.dimensions.width).toBe(base.dimensions.width)
    expect(added.dimensions.height - base.dimensions.height).toBeCloseTo(28)
  })
  it('照明層數不超過層數，匯出配置包含數量與尺寸', () => {
    const c = calculateCabinet(
      input({
        rows: 2,
        ledLayers: 8,
        counts: { thermometer: 3, switch: 1, metalSwitch: 2, extraThermostat: 0 }
      })
    ).configuration
    expect(c.ledLayers).toBe(2)
    expect(c.counts.thermometer).toBe(2)
    expect(c.counts.switch).toBe(1)
    expect(c.counts.metalSwitch).toBe(2)
    expect(c.capabilities).not.toContain('outlet')
    expect(c.capabilities).not.toContain('transformer')
    expect(JSON.parse(JSON.stringify(c)).dimensions).toEqual(c.dimensions)
  })
  it('設備數量依加熱層與LED層分開計算', () => {
    const c = calculateCabinet(
      input({
        rows: 6,
        ledLayers: 6,
        lightLevel: 140,
        counts: { thermometer: 99, switch: 3, metalSwitch: 2, extraThermostat: 9 }
      })
    ).configuration
    expect(c.counts.thermometer).toBe(6)
    expect(c.counts.extraThermostat).toBe(1)
    expect(c.counts.switch).toBe(3)
    expect(c.counts.metalSwitch).toBe(6)
    expect(c.lightLevel).toBe(100)
  })
  it('收納高度為零或至少十公分', () => {
    expect(calculateCabinet(input({ storageHeight: 2 })).configuration.storageHeight).toBe(10)
    expect(calculateCabinet(input({ storageHeight: 25 })).configuration.storageHeight).toBe(25)
    expect(calculateCabinet(input({ storageHeight: 0 })).configuration.storageHeight).toBe(0)
  })
})
