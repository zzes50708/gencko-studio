import { describe, expect, it } from 'vitest'
import { calculateCabinet, type CabinetInput } from '../utils/cabinet/config'
import { cabinetTextExport } from '../utils/cabinet/export'

const input: CabinetInput = {
  template: 'a4',
  boxVariant: 'a4',
  rows: 4,
  columns: 2,
  finish: 'white',
  boxColor: 'clear',
  counts: { thermometer: 0, switch: 0, metalSwitch: 0, extraThermostat: 0 },
  ledLayers: 0,
  ledColor: 'cool',
  storageHeight: 0,
  wheels: false,
  lighting: 'center',
  lightLevel: 70,
  clearances: { horizontal: 0.5, vertical: 0.7, depth: 1, controlHeight: 8 }
}
describe('訂製櫃 TXT 清單', () => {
  it('標題與檔名一致，省略未安裝設備及展示設定', () => {
    const { filename, text } = cabinetTextExport(calculateCabinet(input).configuration)
    expect(filename).toBe('GENCKO-4層2抽A4盒訂製櫃.txt')
    expect(text.split('\n')[0]).toBe(filename.slice(0, -4))
    for (const omitted of [
      '溫度計',
      'LED：',
      '收納內高',
      '萬向輪',
      '冷白',
      '展示主燈',
      'Calorique',
      '8W'
    ])
      expect(text).not.toContain(omitted)
    expect(text).toContain('加熱墊：美國加熱墊')
    expect(text).toContain(
      '此配置並非正式製作圖，盒體尺寸因品牌有所差異，實際尺寸請交由工作室確認後提供。'
    )
  })
  it('有安裝的設備、收納及韓國加熱墊正常輸出', () => {
    const cfg = calculateCabinet({
      ...input,
      ledLayers: 2,
      heatingMat: 'korea',
      storageHeight: 25,
      storageStyle: 'doors',
      counts: { ...input.counts, thermometer: 2 }
    }).configuration
    const { text } = cabinetTextExport(cfg)
    expect(text).toContain('溫度計：2 個')
    expect(text).toContain('LED：2 層')
    expect(text).toContain('加熱墊：韓國加熱墊')
    expect(text).toContain('收納內高：25 cm｜款式：雙開門')
    expect(text).not.toContain('0 個')
  })
})
