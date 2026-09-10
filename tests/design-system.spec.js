import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const styles = read('../assets/css/style.css')
const pageHero = read('../components/PageHero.vue')
const nextCta = read('../components/NextCta.vue')
const skeletonCard = read('../components/SkeletonCard.vue')

describe('Phase 1 design system contract', () => {
  it('提供共用 spacing、focus 與觸控控制 tokens', () => {
    expect(styles).toContain('--space-1: 4px')
    expect(styles).toContain('--space-2: 8px')
    expect(styles).toContain('--space-3: 12px')
    expect(styles).toContain('--space-4: 16px')
    expect(styles).toContain('--space-5: 24px')
    expect(styles).toContain('--control-min-height: 44px')
    expect(styles).toContain('--focus-ring: 2px solid var(--pri)')
    expect(styles).toContain('--focus-offset: 3px')
  })

  it('共用按鈕與全域 shell 支援觸控尺寸及安全區', () => {
    expect(styles).toMatch(/\.btn-app\s*\{[\s\S]*?min-height:\s*var\(--control-min-height\)/)
    expect(styles).toContain('min-height: 100dvh')
    expect(styles).toContain('env(safe-area-inset-top, 0px)')
    expect(styles).toContain('env(safe-area-inset-bottom, 0px)')
  })

  it('全域 focus 與 reduced-motion 規則可用 token 覆寫並強制降級', () => {
    expect(styles).toContain('outline: var(--focus-ring)')
    expect(styles).toContain('outline-offset: var(--focus-offset)')
    expect(styles).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?animation-duration:\s*0\.01ms !important[\s\S]*?transition-duration:\s*0\.01ms !important/
    )
  })

  it('共用頁面殼層使用 token 與細線結構，Skeleton 不進入讀屏內容', () => {
    expect(pageHero).toContain('gap: var(--space-5)')
    expect(pageHero).toContain('border-block: 1px solid var(--bd)')
    expect(nextCta).toContain('border-block: 1px solid var(--bd)')
    expect(nextCta).toContain('gap: var(--space-2)')
    expect(skeletonCard).toContain('aria-hidden="true"')
  })
})
