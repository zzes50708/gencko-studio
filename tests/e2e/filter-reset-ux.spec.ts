import { test, expect } from '@playwright/test'

test('輸入後立即重置，不被延遲搜尋重新套用', async ({ page }) => {
  await page.goto('/shop')
  await page.waitForFunction(
    () => !!(document.querySelector('.catalog-search') as any)?.__vueParentComponent
  )
  await page.evaluate(async () => {
    let c = (document.querySelector('.catalog-search') as any).__vueParentComponent
    while (c && !c.setupState.resetFilters) c = c.parent
    const input = document.querySelector('.catalog-search') as HTMLInputElement
    input.value = '不應復活'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await c.setupState.resetFilters()
  })
  await page.waitForTimeout(400)
  await expect(page.locator('.catalog-search')).toHaveValue('')
  expect(new URL(page.url()).searchParams.has('kw')).toBe(false)
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
