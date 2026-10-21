import { expect, it } from 'vitest'
import { isMobileLineDevice } from '../utils/line-handoff'
it('按 LINE 支援的作業系統選擇入口，不以視窗寬度猜桌機', () => {
  expect(isMobileLineDevice('Mozilla Windows NT 10.0')).toBe(false)
  expect(isMobileLineDevice('Mozilla Macintosh Intel Mac OS X')).toBe(false)
  expect(isMobileLineDevice('Mozilla Android 14')).toBe(true)
  expect(isMobileLineDevice('Mozilla iPhone OS 18')).toBe(true)
  expect(isMobileLineDevice('Mozilla Macintosh Intel Mac OS X', 5)).toBe(true)
})
