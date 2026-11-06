import { describe, it, expect } from 'vitest'
import {
  getAnimalInquiryLink,
  getWishlistInquiryLink,
  getAnimalInquiryText
} from '../utils/animal-inquiry'
describe('詢問清單', () => {
  it('帶入頁面售價與售出狀態，但展場模式不洩漏隱藏價格', () => {
    const animal = {
      ID: 'PRICE-1',
      Morph: '黑夜',
      ListingPrice: 8000,
      SoldPrice: 9999,
      Status: 'Sold'
    }
    const text = getAnimalInquiryText(animal)
    expect(text).toContain('頁面售價：NT$ 8,000')
    expect(text).toContain('狀態：已售出')
    expect(text).not.toContain('9999')
    expect(getAnimalInquiryText(animal, { hidePrice: true })).not.toContain('8,000')
  })
  it('使用官方聊天網址，預填個體編號及詳情網址', () => {
    const url = new URL(
      getAnimalInquiryLink('https://line.me/R/ti/p/@219abdzn', { ID: 'A-1', Morph: '土匪' })
    )
    expect(url.pathname).toBe('/R/oaMessage/%40219abdzn/')
    expect(decodeURIComponent(url.search.slice(1))).toContain('ID：A-1')
    expect(decodeURIComponent(url.search.slice(1))).toContain(
      'https://www.genckobreeding.com/product/A-1'
    )
  })
  it('收藏詢問保留所有個體編號', () => {
    const url = new URL(getWishlistInquiryLink('https://line.me/R/ti/p/@219abdzn', ['A', 'B']))
    expect(decodeURIComponent(url.search.slice(1))).toContain('ID：A, B')
  })
})
