import { describe, expect, it } from 'vitest'
import { allowDraftPreview, articleIsVisible, articleStatuses } from '../utils/article-visibility'

describe('文章草稿預覽邊界', () => {
  it.each(['localhost', '127.0.0.1', '::1', '[::1]'])('開發模式允許 %s 預覽', (host) => {
    expect(allowDraftPreview(true, host)).toBe(true)
    expect(allowDraftPreview(false, host)).toBe(false)
  })
  it.each([
    'www.genckobreeding.com',
    'preview.vercel.app',
    'localhost.evil.com',
    '192.168.1.2',
    '',
    'evil-localhost'
  ])('線上或非回環主機 %s 不允許草稿', (host) => {
    expect(allowDraftPreview(true, host)).toBe(false)
    expect(allowDraftPreview(false, host)).toBe(false)
  })
  it('列表和詳情共用相同狀態白名單；未知狀態不可公開', () => {
    expect(articleStatuses(false)).toEqual(['Published'])
    expect(articleStatuses(true)).toEqual(['Published', 'Draft'])
    for (const preview of [false, true]) {
      expect(articleIsVisible('Published', preview)).toBe(true)
      expect(articleIsVisible('Draft', preview)).toBe(preview)
      for (const status of [undefined, null, '', 'Archived', 'published', 'draft']) {
        expect(articleIsVisible(status, preview)).toBe(false)
      }
    }
  })
})
