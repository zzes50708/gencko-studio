import { it, expect } from 'vitest'
import { getCleanUrl } from '../utils/image'

it('站內圖片不送往外部壓縮伺服器，放大預覽保留有效路徑', () => {
  expect(getCleanUrl('/logo.png')).toBe('/logo.png')
  expect(getCleanUrl('/images/photo.webp?version=2')).toBe('/images/photo.webp?version=2')
  expect(getCleanUrl('https://example.com/photo.jpg')).toContain('https://wsrv.nl/')
})
