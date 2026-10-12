/** 照片未提供的施工細節暫用估值；單位為 cm，不代表正式商品規格。 */
export const CABINET_BOX_CONSTRUCTION = {
  plastic: {
    topRimWidth: 0.6,
    topRimThickness: 0.18,
    wallThickness: 0.16,
    bottomWidthReduction: 2.8,
    bottomLengthReduction: 3
  },
  acrylic: {
    wallThickness: 0.3,
    ventRadius: 0.15,
    ventPitch: 1.2,
    ventRowOffsets: [1, 1.8]
  }
} as const
