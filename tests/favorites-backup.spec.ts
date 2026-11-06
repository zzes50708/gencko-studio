import { describe, expect, it } from 'vitest'
import { favoritesBackup, parseFavoritesBackup } from '../utils/favorites-backup'
describe('收藏攜帶與匯入', () => {
  it('匯出與匯入只含收藏編號，去除重複且不加入登入資料', () => {
    const text = favoritesBackup(['S-1', 'S-1'], ['H-1'])
    expect(parseFavoritesBackup(text)).toEqual({ animals: ['S-1'], hospitals: ['H-1'] })
    expect(text).not.toMatch(/token|email|user/)
  })
  it('拒絕損壞、其他版本、過量或帶入任意文字的檔案', () => {
    for (const text of [
      'null',
      '{}',
      'broken',
      JSON.stringify({ format: 'gencko-favorites', version: 2 }),
      JSON.stringify({
        format: 'gencko-favorites',
        version: 1,
        animals: ['<script>'],
        hospitals: []
      })
    ])
      expect(() => parseFavoritesBackup(text)).toThrow()
    expect(() => favoritesBackup(Array(2001).fill('S'), [])).toThrow()
  })
})
