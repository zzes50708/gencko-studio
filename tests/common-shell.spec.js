import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const marquee = read('../components/TheMarquee.vue')
const app = read('../app.vue')
const lightbox = read('../components/TheLightbox.vue')
const toast = read('../components/TheToast.vue')

describe('Phase 1 共用殼層 contract', () => {
  it('全站殼層不再掛載頂部公告跑馬燈', () => {
    expect(app).not.toContain('<TheMarquee')
  })

  it('全站殼層不再掛載桌機六邊形滑鼠背景', () => {
    expect(app).not.toContain('<BackgroundInteractiveGrid')
  })

  it('跑馬燈在 reduced-motion 下停止循環動畫', () => {
    expect(marquee).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.marquee-content\s*\{[\s\S]*?animation:\s*none/
    )
  })

  it('Lightbox 只在拖曳期間提示 compositor hint 並保留雙側安全區', () => {
    expect(lightbox).toContain("willChange: isDragging ? 'transform, opacity' : 'auto'")
    expect(lightbox).toMatch(
      /\.lightbox-overlay\s*\{[\s\S]*?padding:\s*env\(safe-area-inset-top, 0px\)\s+env\(safe-area-inset-right, 0px\)\s+env\(safe-area-inset-bottom, 0px\)\s+env\(safe-area-inset-left, 0px\)/
    )
  })

  it('Toast 使用狀態公告與只動 opacity/transform 的短 transition', () => {
    expect(toast).toContain('role="status"')
    expect(toast).toContain('aria-live="polite"')
    expect(toast).toMatch(
      /\.toast-anim-enter-active,[\s\S]*?transition:\s*opacity 0\.2s ease-out,\s*transform 0\.2s ease-out/
    )
  })
})
