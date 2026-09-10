export const HABITAT_PARTS = [
  { id: 'tank', number: '01', label: '飼養箱', position: '透明箱體與通風頂蓋', description: '透明箱體方便觀察內部配置。桌機可開啟「顯示頂蓋」，查看示意圖中的通風孔與箱蓋位置。', point: [18, 28] },
  { id: 'substrate', number: '02', label: '底材', position: '箱內底部', description: '依原圖以淺色平鋪底材呈現，讓設備與活動空間的位置更容易辨識。底材選擇與注意事項請參考上方環境說明。', point: [44, 68] },
  { id: 'water', number: '03', label: '水盆', position: '箱內左前方', description: '淺水盆位於左前方，與後方食盆分開。桌機可切換視角，查看盆口高度與周圍的活動空間。', point: [31, 53] },
  { id: 'food', number: '04', label: '食盆與鈣粉', position: '箱內左後方', description: '原圖將食盆與鈣粉放在左後方；模型保留淺盆、粉末與餌料的配置示意。餵食與補充方式請參考下方餌料章節。', point: [41, 43] },
  { id: 'hide', number: '05', label: '躲避屋', position: '箱內右側', description: '深色躲避屋保留朝前的入口。這張圖示意一個躲避屋，完整飼養配置仍請依上方環境說明準備。', point: [60, 44] },
  { id: 'heat', number: '06', label: '加熱墊', position: '箱外底部右側', description: '加熱墊位於箱體外側、右側底部。從側面觀看，可辨識加熱墊、箱底與底材的上下關係。', point: [60, 82] },
  { id: 'thermometer', number: '07', label: '溫度計', position: '箱外顯示幕與箱內探頭', description: '顯示幕位於箱外，導線連接箱內探頭。32.0°C 沿用原圖作為示意讀值，不是即時量測資料。', point: [74, 70] }
] as const

export type HabitatPartId = typeof HABITAT_PARTS[number]['id']
export type HabitatView = 'perspective' | 'front' | 'top'
export type HabitatCommand = { serial: number; type: 'view' | 'zoom' | 'rotate'; value: string | number }
