import { test, expect } from '@playwright/test'

test('已選品系可重置，網址不保留舊條件', async ({ page }) => {
  await page.route('**/rest/v1/animals**', (route) =>
    route.fulfill({
      json: [
        {
          id: 'RESET-MORPH',
          species: '豹紋守宮',
          morph: '黑夜',
          status: 'ForSale',
          listing_price: 8000,
          genes: []
        }
      ]
    })
  )
  await page.goto('/shop?morph=' + encodeURIComponent('黑夜'))
  await expect(page.getByRole('combobox', { name: '選擇品系' })).toHaveValue('黑夜')
  await expect(page.locator('.flip-card')).toHaveCount(1)
  await page.getByRole('button', { name: /展開篩選/ }).click()
  await page.getByRole('button', { name: '重置全部篩選', exact: true }).click()
  await expect(page.locator('.catalog-search')).toHaveValue('')
  await expect(page).not.toHaveURL(/morph=/)
  await expect(page.locator('.flip-card')).toHaveCount(1)
})

test('手機篩選清除同步清掉基因搜尋文字', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 })
  await page.goto('/shop')
  await page.waitForFunction(
    () => !!(document.querySelector('.catalog-search') as any)?.__vueParentComponent
  )
  await page.getByRole('button', { name: '篩選', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '篩選條件', exact: true })
  await dialog.getByRole('searchbox', { name: '搜尋基因' }).fill('不存在的基因')
  await dialog.getByRole('button', { name: '清除', exact: true }).click()
  await expect(dialog.getByRole('searchbox', { name: '搜尋基因' })).toHaveValue('')
})
