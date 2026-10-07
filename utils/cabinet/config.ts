export type CabinetTemplate = 'a4' | 'a6' | 'tub' | 'acrylic' | 'custom'
export type BoxVariant =
  | 'a4'
  | 'a6'
  | 'a3'
  | 'tub-s'
  | 'tub-m'
  | 'tub-l'
  | 'tub-xl'
  | 'acrylic-m'
  | 'acrylic-l'
export type FinishId = 'oak' | 'walnut' | 'white' | 'charcoal' | 'concrete' | 'stone'
export type BoxColor = 'clear' | 'smoke'
export type LedColor = 'warm' | 'neutral' | 'cool'
export type HeatingMat = 'calorique' | 'korea'
export type StorageStyle = 'drawer' | 'doors' | 'open'
export type Lighting = 'left' | 'center' | 'right' | 'off'
export type CountKey = 'thermometer' | 'switch' | 'metalSwitch' | 'extraThermostat'
export type Capability = CountKey | 'led' | 'storage' | 'wheels'

export interface BoxDimensions {
  length: number
  width: number
  height: number
  bottomLength?: number
  bottomWidth?: number
}
export const BOXES: Record<
  BoxVariant,
  { label: string; template: CabinetTemplate; dimensions: BoxDimensions }
> = {
  a4: { label: 'A4 盒', template: 'a4', dimensions: { length: 34, width: 24, height: 10.1 } },
  a6: { label: 'A6 盒', template: 'a6', dimensions: { length: 34, width: 12, height: 10.1 } },
  a3: { label: 'A3 盒', template: 'custom', dimensions: { length: 34, width: 48, height: 10 } },
  'tub-s': {
    label: '人渣盒 S',
    template: 'tub',
    dimensions: { length: 19, width: 12.5, height: 7.5, bottomLength: 16.7, bottomWidth: 10.2 }
  },
  'tub-m': {
    label: '人渣盒 M',
    template: 'tub',
    dimensions: { length: 27, width: 18.8, height: 12, bottomLength: 22.8, bottomWidth: 14.8 }
  },
  'tub-l': {
    label: '人渣盒 L',
    template: 'tub',
    dimensions: { length: 32, width: 22, height: 15, bottomLength: 28, bottomWidth: 18 }
  },
  'tub-xl': {
    label: '人渣盒 XL',
    template: 'tub',
    dimensions: { length: 38, width: 24, height: 17, bottomLength: 33, bottomWidth: 19.6 }
  },
  'acrylic-m': {
    label: '壓克力盒 M',
    template: 'acrylic',
    dimensions: { length: 30, width: 20, height: 15 }
  },
  'acrylic-l': {
    label: '壓克力盒 L',
    template: 'acrylic',
    dimensions: { length: 40, width: 30, height: 20 }
  }
}
export const FINISHES: { id: FinishId; name: string; color: string }[] = [
  { id: 'white', name: '膚感純白貼皮', color: '#efefec' },
  { id: 'charcoal', name: '膚感純黑貼皮', color: '#171819' },
  { id: 'concrete', name: '清水模紋理貼皮', color: '#d4d4d2' },
  { id: 'stone', name: '深灰石紋貼皮', color: '#565b60' }
]
export const HARDWARE: { id: CountKey; label: string; width: number; height: number }[] = [
  { id: 'extraThermostat', label: '額外內嵌溫控', width: 7.5, height: 3.6 },
  { id: 'thermometer', label: '溫度計', width: 4.8, height: 2.8 },
  { id: 'switch', label: '一般開關', width: 2.1, height: 3.1 },
  { id: 'metalSwitch', label: '金屬發光開關', width: 2.6, height: 2.6 }
]
export const BOARD_THICKNESS = 2 as const
export const MAX_CABINET_WIDTH = 130
export function maxCabinetColumns(variant: BoxVariant) {
  return Math.max(
    1,
    Math.floor(
      (MAX_CABINET_WIDTH - BOARD_THICKNESS * 2 - 0.5) / (BOXES[variant].dimensions.width + 0.5)
    )
  )
}
export const WHEEL_HEIGHT = 6
export interface CabinetInput {
  template: CabinetTemplate
  boxVariant: BoxVariant
  rows: number
  columns: number
  finish: FinishId
  boxColor: BoxColor
  counts: Record<CountKey, number>
  ledLayers: number
  ledColor: LedColor
  ledEnabled?: boolean
  heatingMat?: HeatingMat
  ledRowEnabled?: boolean[]
  storageHeight: number
  storageStyle?: StorageStyle
  wheels: boolean
  lighting: Lighting
  lightLevel: number
  clearances: { horizontal: number; vertical: number; depth: number; controlHeight: number }
}
export interface HardwarePosition {
  type: 'standardThermostat' | CountKey
  x: number
  y: number
  width: number
  height: number
}
export interface CabinetConfiguration {
  template: CabinetTemplate
  capabilities: Capability[]
  rows: number
  columns: number
  finish: string
  finishId: FinishId
  boxVariant: BoxVariant
  boxLabel: string
  boxDimensions: BoxDimensions
  boxColor: BoxColor
  counts: Record<CountKey, number>
  ledLayers: number
  ledColor: LedColor
  ledEnabled: boolean
  heatingMat: HeatingMat
  ledRowEnabled: boolean[]
  storageHeight: number
  storageStyle: StorageStyle
  dimensions: { width: number; height: number; depth: number }
  boardThickness: typeof BOARD_THICKNESS
  lighting: Lighting
  lightLevel: number
  clearances: CabinetInput['clearances']
  wheelHeight: number
  units: 'cm'
}
export interface CabinetLayout {
  configuration: CabinetConfiguration
  hardware: HardwarePosition[]
  minimumControlHeight: number
  innerWidth: number
  rackBase: number
  controlBottom: number
  rowPitch: number
}
const rounded = (value: number) => Math.round(value * 100) / 100
const bounded = (value: unknown, fallback: number, min: number, max: number, integer = false) => {
  const parsed = value === '' || value === null || value === undefined ? fallback : Number(value)
  const finite = Number.isFinite(parsed) ? parsed : fallback
  const result = Math.max(min, Math.min(max, finite))
  return integer ? Math.round(result) : rounded(result)
}
export function normalizeCabinet(input: CabinetInput): CabinetInput {
  const boxVariant = Object.hasOwn(BOXES, input.boxVariant) ? input.boxVariant : 'a4'
  const rows = bounded(input.rows, 4, 1, 8, true)
  const thermometer = bounded(input.counts?.thermometer, 0, 0, rows, true)
  const switchCount = bounded(input.counts?.switch, 0, 0, rows, true)
  const metalSwitch = bounded(input.ledLayers, 0, 0, rows, true)
  return {
    ...input,
    boxVariant,
    template: BOXES[boxVariant].template,
    rows,
    columns: bounded(input.columns, 2, 1, maxCabinetColumns(boxVariant), true),
    finish: FINISHES.some((item) => item.id === input.finish) ? input.finish : 'white',
    boxColor: input.boxColor === 'smoke' ? 'smoke' : 'clear',
    heatingMat: input.heatingMat === 'korea' ? 'korea' : 'calorique',
    counts: {
      thermometer,
      switch: switchCount,
      metalSwitch,
      // 標配已有一顆溫控，額外最多一顆，總數最多兩顆。
      extraThermostat: bounded(input.counts?.extraThermostat, 0, 0, 1, true)
    },
    ledLayers: bounded(input.ledLayers, 0, 0, rows, true),
    ledColor: ['warm', 'neutral', 'cool'].includes(input.ledColor) ? input.ledColor : 'warm',
    ledEnabled: input.ledEnabled !== false,
    ledRowEnabled: Array.from({ length: 8 }, (_, row) => input.ledRowEnabled?.[row] !== false),
    storageHeight:
      Number(input.storageHeight) > 0
        ? Math.round(bounded(input.storageHeight, 10, 10, 80) / 5) * 5
        : 0,
    storageStyle:
      input.storageStyle === 'doors' || input.storageStyle === 'open'
        ? input.storageStyle
        : 'drawer',
    wheels: Boolean(input.wheels),
    lighting: ['left', 'center', 'right', 'off'].includes(input.lighting)
      ? input.lighting
      : 'center',
    lightLevel: bounded(input.lightLevel, 70, 0, 100, true),
    clearances: {
      horizontal: 0.5,
      vertical: 0.7,
      depth: 1,
      controlHeight: 8
    }
  }
}
export function calculateCabinet(value: CabinetInput): CabinetLayout {
  const input = normalizeCabinet(value)
  const box = BOXES[input.boxVariant]
  const b = BOARD_THICKNESS
  const innerWidth =
    input.columns * box.dimensions.width + (input.columns + 1) * input.clearances.horizontal
  const width = innerWidth + b * 2
  const hardware: HardwarePosition[] = []
  const pieces = [
    { type: 'standardThermostat' as const, width: 7.5, height: 3.6 },
    ...HARDWARE.filter((item) => item.id !== 'metalSwitch').flatMap((item) =>
      Array.from({ length: input.counts[item.id] }, () => ({
        type: item.id,
        width: item.width,
        height: item.height
      }))
    )
  ]
  let cursorX = 1,
    cursorY = 1,
    lineHeight = 0
  for (const piece of pieces) {
    if (cursorX + piece.width > innerWidth - 1 && cursorX > 1) {
      cursorX = 1
      cursorY += lineHeight + 1
      lineHeight = 0
    }
    hardware.push({
      ...piece,
      x: -innerWidth / 2 + cursorX + piece.width / 2,
      y: cursorY + piece.height / 2
    })
    cursorX += piece.width + 1
    lineHeight = Math.max(lineHeight, piece.height)
  }
  const minimumControlHeight = rounded(cursorY + lineHeight + 1)
  const controlHeight = Math.max(input.clearances.controlHeight, minimumControlHeight)
  const wheelHeight = input.wheels ? WHEEL_HEIGHT : 0
  const rackBase = wheelHeight + b + (input.storageHeight > 0 ? input.storageHeight + b : 0)
  const rowPitch = box.dimensions.height + input.clearances.vertical + b
  const controlBottom = rackBase + input.rows * rowPitch
  const height = controlBottom + controlHeight + b
  const depth = box.dimensions.length + input.clearances.depth + b
  const capabilities: Capability[] = HARDWARE.filter((item) => input.counts[item.id] > 0).map(
    (item) => item.id
  )
  if (input.ledLayers > 0) capabilities.push('led')
  if (input.storageHeight > 0) capabilities.push('storage')
  if (input.wheels) capabilities.push('wheels')
  return {
    hardware,
    minimumControlHeight,
    innerWidth,
    rackBase,
    controlBottom,
    rowPitch,
    configuration: {
      template: input.template,
      capabilities,
      rows: input.rows,
      columns: input.columns,
      finish: (FINISHES.find((item) => item.id === input.finish)?.name || '淺木色') + '（示意）',
      finishId: input.finish,
      boxVariant: input.boxVariant,
      boxLabel: box.label,
      boxDimensions: { ...box.dimensions },
      boxColor: input.boxColor,
      heatingMat: input.heatingMat === 'korea' ? 'korea' : 'calorique',
      counts: { ...input.counts },
      ledLayers: Math.min(input.ledLayers, input.rows),
      ledColor: input.ledColor,
      ledEnabled: input.ledEnabled !== false,
      ledRowEnabled: [...input.ledRowEnabled!],
      storageHeight: input.storageHeight,
      storageStyle: input.storageStyle || 'drawer',
      dimensions: { width: rounded(width), height: rounded(height), depth: rounded(depth) },
      boardThickness: b,
      lighting: input.lighting,
      lightLevel: input.lightLevel,
      clearances: { ...input.clearances, controlHeight: rounded(controlHeight) },
      wheelHeight,
      units: 'cm'
    }
  }
}
