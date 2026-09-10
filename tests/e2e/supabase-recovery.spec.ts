import { expect, test } from '@playwright/test'

test.describe('Supabase 個體資料恢復', () => {
  test('初次 animals 請求失敗後，重新進入資料頁會自動重試', async ({ page }) => {
    await page.route('**/rest/v1/animals*', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'PGRST100',
          message: '受控的 animals 載入失敗',
          details: null,
          hint: null
        })
      })
    })

    await page.goto('/shop')
    await expect(page.getByText('商品資料載入失敗')).toBeVisible({ timeout: 15_000 })

    await page.unroute('**/rest/v1/animals*')
    await page
      .locator('a[href="/breeders"]')
      .first()
      .evaluate((link: HTMLAnchorElement) => link.click())

    await expect(page).toHaveURL(/\/breeders$/)
    await expect(page.locator('.breeder-photo-card').first()).toBeVisible({ timeout: 15_000 })
  })
})
