import { useState } from '#imports'
import type { HospitalMapPlace } from '~/utils/hospitalVectorMap'

export interface HospitalMapCameraSnapshot {
  center: [number, number]
  zoom: number
  pitch: number
  bearing: number
  padding: { top: number; bottom: number; left: number; right: number }
}
export interface HospitalMapSession {
  signature: string
  camera: HospitalMapCameraSnapshot
  hospitalId: string | null
  selectedPlace: HospitalMapPlace | null
  places: HospitalMapPlace[]
  placesSearched: boolean
}

/** 僅在本站此次開啟期間保存，不將位置或搜尋內容寫入本機儲存。 */
export function useHospitalMapSession() {
  return useState<HospitalMapSession | null>('hospital-vector-session-v1', () => null)
}
