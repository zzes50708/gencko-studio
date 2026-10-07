import { describe, it, expect } from 'vitest'
import { getAnimalInquiryLink, getWishlistInquiryLink } from '../utils/animal-inquiry'
describe('詢問清單', () => {
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
