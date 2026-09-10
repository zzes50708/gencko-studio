import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const waitForHydratedSurface = async (page: Page, selector: string) => {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 30_000 })
}

const getProductHrefs = async (page: Page, count = 1): Promise<string[]> => {
  await expect
    .poll(() => page.locator('a[href^="/product/"]').count(), { timeout: 30_000 })
    .toBeGreaterThanOrEqual(count)
  return page.locator('a[href^="/product/"]').evaluateAll((links, limit: number) => {
    const hrefs = links
      .map((link) => link.getAttribute('href'))
      .filter((href): href is string => Boolean(href))

    return [...new Set(hrefs)].slice(0, limit)
  }, count)
}

test.describe('Phase 3 remaining focused redesign', () => {
  test('Merch 列表以館藏導覽、供應狀態與清楚空白狀態呈現', async ({ page }) => {
    await page.goto('/merch')

    await expect(page.locator('[data-phase3-surface="merch-index"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: '飼養用品與品牌周邊' })).toBeVisible()
    await expect(page.getByText(/目前共 \d+ 項/)).toBeVisible()

    const collection = page.getByRole('region', { name: '周邊商品清單' })
    await expect(collection).toBeVisible()
    const cards = collection.locator('article')
    if ((await cards.count()) > 0) {
      await expect(cards.first().getByText(/供應中|暫停供應/)).toBeVisible()
      await expect(cards.first().getByRole('link', { name: /查看.*商品詳情/ })).toBeVisible()
    } else {
      await expect(page.getByRole('heading', { name: '目前沒有可瀏覽的周邊商品' })).toBeVisible()
      await expect(page.getByRole('link', { name: '前往選購守宮' })).toBeVisible()
    }
  })

  test('Merch 詳情提供商品狀態、價格決策區與安全外部購買提示', async ({ page }) => {
    await page.goto('/merch')
    await waitForHydratedSurface(page, '[data-phase3-surface="merch-index"]')

    const detailLink = page.locator('a[href^="/merch/"]').first()
    test.skip((await detailLink.count()) === 0, '正式資料目前沒有周邊商品可驗證')
    const href = await detailLink.getAttribute('href')
    await page.goto(href!)

    const detail = page.locator('[data-phase3-surface="merch-detail"]')
    await expect(detail).toBeVisible()
    await expect(detail.getByText(/供應中|暫停供應/)).toBeVisible()
    await expect(detail.getByRole('region', { name: '購買資訊' })).toBeVisible()
    await expect(detail.getByText('購買前請先確認商品規格與交付方式')).toBeVisible()
    await expect(detail.getByRole('button', { name: '複製商品連結' })).toBeVisible()
  })

  test('Compare 提供語意比較表、選取摘要與窄螢幕操作提示', async ({ page }) => {
    await page.goto('/shop')
    await waitForHydratedSurface(page, '.photo-grid .flip-card, .shop-empty-state')

    const productLinks = await getProductHrefs(page)

    const ids = productLinks.map((href) => href!.split('/').pop()).join(',')
    await page.goto(`/compare?ids=${ids}`)

    await expect(page.locator('[data-phase3-surface="compare"]')).toBeVisible()
    await expect(page.getByText(new RegExp(`已選擇 ${productLinks.length} / 3 隻`))).toBeVisible()
    await expect(page.getByText('可左右滑動查看完整比較')).toBeVisible()

    const comparison = page.getByRole('region', { name: '個體比較表' })
    await expect(comparison).toBeVisible()
    await expect(comparison.getByRole('table')).toBeVisible()
    await expect(comparison.getByRole('rowheader', { name: '基因' })).toBeVisible()
    await expect(comparison.getByRole('rowheader', { name: '售價' })).toBeVisible()
  })

  test('Identity 以可辨識證明卡呈現並在手機維持可讀層級', async ({ page }) => {
    await page.goto('/shop')
    await waitForHydratedSurface(page, '.photo-grid .flip-card, .shop-empty-state')

    const [href] = await getProductHrefs(page)
    const id = href!.split('/').pop()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/identity/${id}`)

    const certificate = page.locator('[data-phase3-surface="identity"]')
    await expect(certificate).toBeVisible()
    await expect(certificate).toHaveAttribute('aria-labelledby', 'identity-title')
    await expect(page.getByRole('heading', { name: `個體 ${id} 電子身分證` })).toBeVisible()
    await expect(page.getByText('繁育紀錄證明')).toBeVisible()
    await expect(page.getByRole('button', { name: '儲存電子身分證為 PDF' })).toBeVisible()

    const photoBox = certificate.locator('.card-photo-box')
    const infoBox = certificate.locator('.card-info-box')
    const photoBounds = await photoBox.boundingBox()
    const infoBounds = await infoBox.boundingBox()
    expect(photoBounds).not.toBeNull()
    expect(infoBounds).not.toBeNull()
    expect(infoBounds!.y).toBeGreaterThan(photoBounds!.y)
  })
})
