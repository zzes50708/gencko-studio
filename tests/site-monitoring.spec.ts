import { describe, it, expect } from 'vitest'
import { monitoringRoute, sanitizeMonitoringEvent } from '../utils/site-monitoring'

describe('錯誤與效能回報隱私邊界', () => {
  it('不回報網址參數、個體編號、登入碼及會員頁細節', () => {
    expect(monitoringRoute('/product/S-123?token=secret')).toBe('/product/:id')
    expect(monitoringRoute('/line-login-return?code=secret')).toBe('/line-login-return')
    expect(monitoringRoute('https://evil.invalid/private')).toBe('/unknown')
  })
  it('移除未宣告欄位與任意錯誤內容', () => {
    expect(
      sanitizeMonitoringEvent({
        type: 'vue_error',
        route: '/auction/TEST?token=x',
        category: 'render',
        message: '客人姓名及權杖',
        email: 'private'
      })
    ).toEqual({ type: 'vue_error', route: '/auction/:id', category: 'render' })
    expect(sanitizeMonitoringEvent({ type: 'unrecognized', route: '/' })).toBeNull()
  })
  it('拒絕無效效能數值並限制單次量測範圍', () => {
    expect(sanitizeMonitoringEvent({ type: 'LCP', route: '/home', value: NaN })).toBeNull()
    expect(sanitizeMonitoringEvent({ type: 'CLS', route: '/home', value: -1 })).toBeNull()
    expect(sanitizeMonitoringEvent({ type: 'INP', route: '/home', value: 230 })).toEqual({
      type: 'INP',
      route: '/home',
      value: 230,
      scope: 'document'
    })
  })
})
