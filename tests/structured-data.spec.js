import { it, expect } from 'vitest'
import { serializeJsonLd } from '../utils/structured-data'

it('結構化資料保持 JSON 內容，但不得讓說明或名稱跳出 HTML script', () => {
  const data = {
    name: '守宮 & 血統',
    description: '</script><script>alert(1)</script>\u2028\u2029'
  }
  const result = serializeJsonLd(data)
  expect(result).not.toContain('<')
  expect(result).not.toContain('>')
  expect(result).not.toContain('&')
  expect(JSON.parse(result)).toEqual(data)
  expect(serializeJsonLd(null)).toBe('null')
})
