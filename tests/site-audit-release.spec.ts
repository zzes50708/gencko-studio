import { describe, expect, it } from 'vitest'
import { autoLinkGenes } from '../utils/auto-link'
import { analyticsPage, analyticsEvent } from '../utils/site-analytics'
import { readStoredJson } from '../utils/browser-storage'
import { pageDataNeeds } from '../utils/site-data-policy'
import { getImageSrcset } from '../utils/image'

describe('響應式圖片', () => {
  it('站內圖片不轉送外部代理，既有代理可產生不同尺寸', () => {
    expect(getImageSrcset('/previews/a.png')).toBeUndefined()
    const srcset = getImageSrcset('https://wsrv.nl/?url=example.com/a.jpg&w=800', [200, 400])!
    expect(srcset).toContain('w=200')
    expect(srcset).toContain('200w')
    expect(srcset).toContain('w=400')
  })
})

describe('頁面資料依賴', () => {
  it('證書、登入接續、文章詳情不預載庫存、競標與設備', () => {
    for (const path of [
      '/identity/S-1',
      '/certificates',
      '/line-login-return',
      '/articles/ART-1'
    ]) {
      const needs = pageDataNeeds(path)
      expect(needs.inventory).toBe(false)
      expect(needs.auctions).toBe(false)
      expect(needs.merchandise).toBe(false)
    }
  })
  it('商城保留庫存與競標依賴，首頁保留文章', () => {
    expect(pageDataNeeds('/shop?x=1').inventory).toBe(true)
    expect(pageDataNeeds('/shop').auctions).toBe(true)
    expect(pageDataNeeds('/home').articles).toBe(true)
    expect(pageDataNeeds('/genes').genes).toBe(true)
  })
})

describe('分析資料白名單', () => {
  it('去除完整查詢與片段，拒絕預覽、會員與編碼後的敏感路徑', () => {
    expect(analyticsPage('https://www.genckobreeding.com/shop?q=姓名&code=SECRET#token')).toEqual({
      page_location: 'https://www.genckobreeding.com/shop',
      page_path: '/shop'
    })
    for (const path of [
      '/profile',
      '/line-login-return?flow=secret',
      '/auction-management',
      '/identity/S-1',
      '/%70rofile'
    ])
      expect(analyticsPage(`https://www.genckobreeding.com${path}`)).toBeNull()
    expect(analyticsPage('https://preview.vercel.app/shop')).toBeNull()
  })
  it('捨棄未知事件與任意會員、暱稱、搜尋字詞', () => {
    expect(analyticsEvent('custom_secret')).toBeNull()
    expect(
      analyticsEvent('bid_success', {
        item_id: 'TEST-1',
        nickname: '真名',
        email: 'private',
        code: 'SECRET',
        amount: 500
      })
    ).toEqual({ name: 'bid_success', parameters: { item_id: 'TEST-1' } })
  })
})

describe('瀏覽器拒絕儲存仍可繼續', () => {
  it('讀取與清除都失敗時不再拋錯', () => {
    expect(
      readStoredJson(
        {
          getItem() {
            throw Error('blocked')
          },
          removeItem() {
            throw Error('blocked')
          }
        },
        'wish'
      )
    ).toBeNull()
  })
  it('無效 JSON 可以清除且正常 JSON 保留', () => {
    let removed = false
    expect(
      readStoredJson(
        {
          getItem: () => '{',
          removeItem: () => {
            removed = true
          }
        },
        'wish'
      )
    ).toBeNull()
    expect(removed).toBe(true)
    expect(readStoredJson({ getItem: () => '["S-1"]', removeItem() {} }, 'wish')).toEqual(['S-1'])
  })
})

describe('文章公開 HTML 安全邊界', () => {
  it('沒有基因連結時也會移除腳本、事件、表單及危險網址', () => {
    const html = autoLinkGenes(
      '<p>照護</p><script>alert(1)</script><img src="/a.jpg" onerror="alert(1)"><a href="java&#x73;cript:alert(1)">連結</a><iframe src="https://x.invalid"></iframe><form><input></form>',
      []
    )
    expect(html).toContain('<p>照護</p>')
    expect(html).not.toMatch(/<script|onerror|javascript:|<iframe|<form|<input/i)
  })
  it('保留章節、清單、表格、圖片比例，外開連結具安全屬性', () => {
    const html = autoLinkGenes(
      '<h2 id="care">照護</h2><table><tr><td>內容</td></tr></table><img src="/a.jpg" width="600" height="400"><a href="https://example.com" target="_blank">來源</a>',
      []
    )
    expect(html).toContain('<h2 id="care">')
    expect(html).toContain('<table>')
    expect(html).toContain('width="600"')
    expect(html).toContain('loading="lazy"')
    expect(html).toContain('rel="noopener noreferrer"')
  })
  it('基因名稱也不能注入標籤或事件', () => {
    const html = autoLinkGenes('<p>黑夜 黑夜</p><a href="/shop">黑夜</a>', ['黑夜'])
    expect(html.match(/auto-gene-link/g)).toHaveLength(1)
    expect(html).toContain('<a href="/shop">黑夜</a>')
  })
})
