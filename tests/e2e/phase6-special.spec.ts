import { expect, test } from '@playwright/test'

test.describe('Phase 6 特殊頁保護', () => {
  test('About 依裝置能力切換 3D 與輕量粒子背景', async ({ page }, testInfo) => {
    await page.goto('/about')
    await expect(page.locator('.stage')).toBeVisible()

    if (testInfo.project.name === 'chromium-mobile') {
      await expect(page.locator('.stage-mobile-fallback')).toBeVisible()
      await expect(page.locator('.mobile-particle-field')).toBeVisible()
      await expect(page.locator('.bg-layer canvas')).toHaveCount(0)
      return
    }

    await expect(page.locator('.bg-layer canvas')).toHaveCount(1)
    await expect(page.locator('.stage-mobile-fallback')).toHaveCount(0)
  })

  test('About reduced-motion 停止手機粒子動畫', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile', '僅驗證 mobile fallback')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/about')

    const particle = page.locator('.mobile-particle').first()
    await expect(particle).toBeVisible()
    await expect(particle).toHaveCSS('animation-name', 'none')
  })

  test('Hero Lab 手機保留 3D 與原生捲動旅程', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile', '僅驗證手機動畫')
    await page.goto('/hero-lab')

    await expect(page.locator('.hero-canvas-shell canvas')).toBeVisible({ timeout: 60000 })
    await expect(page.locator('.hero-mobile-fallback')).toHaveCount(0)
    await expect.poll(() => page.locator('.hero-lab-scroll-space').evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThan(5000)
  })
})
