import { test, expect } from '@playwright/test'

const makeAnimal = (id: string, morph: string, species = '豹紋守宮', status = 'ForSale') => ({
  id,
  morph,
  species,
  status,
  listing_price: 8000,
  genes: [],
  gender_type: '公',
  birthday: '2026-03-14',
  image_url: ''
})
const animals = [
  makeAnimal('A', '黑夜'),
  makeAnimal('B', '黑夜'),
  makeAnimal('C', '川白黑夜'),
  makeAnimal('D', '已售出品系', '豹紋守宮', 'Sold'),
  makeAnimal('E', '自留品系', '豹紋守宮', 'SelfKeep'),
  makeAnimal('F', '刪除品系', '豹紋守宮', 'Trash'),
  makeAnimal('G', '黑夜', '肥尾守宮'),
  makeAnimal('H', '幽靈', '肥尾守宮')
]
async function fixtures(page: any, path = '/shop') {
  await page.route('**/rest/v1/animals**', (route: any) => route.fulfill({ json: animals }))
  await page.goto(path)
  await expect(page.getByRole('combobox', { name: '選擇品系' })).toBeEnabled()
  await expect(page.locator('.catalog-search option[value="黑夜"]')).toHaveText('黑夜（2 隻）')
}

for (const width of [320, 390, 1440]) {
  test(`${width}px 現有品系清單、精確篩選、重載、移除與物種切換`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await fixtures(page)
    const picker = page.getByRole('combobox', { name: '選擇品系' })
    await expect(picker.locator('option')).toHaveCount(3)
    await expect(page.getByRole('searchbox', { name: '搜尋關鍵字或編號' })).toHaveCount(0)
    await picker.selectOption('黑夜')
    await expect(page.locator('.flip-card')).toHaveCount(2)
    await expect(page).toHaveURL(/morph=/)
    await page.reload()
    await expect(picker).toHaveValue('黑夜')
    await expect(page.locator('.flip-card')).toHaveCount(2)
    await page.getByRole('button', { name: '移除條件：品系：黑夜', exact: true }).click()
    await expect(picker).toHaveValue('')
    await expect(page.locator('.flip-card')).toHaveCount(3)
    await picker.selectOption('黑夜')
    await page.getByRole('button', { name: '肥尾守宮', exact: true }).click()
    await expect(picker).toHaveValue('')
    await expect(page.locator('.flip-card')).toHaveCount(2)
    await expect(picker.locator('option[value="黑夜"]')).toHaveText('黑夜（1 隻）')
    await expect(picker.locator('option[value="川白黑夜"]')).toHaveCount(0)
    await expect(page).not.toHaveURL(/morph=/)
    const bounds = await picker.boundingBox()
    expect(bounds!.height).toBeGreaterThanOrEqual(44)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `output/shop-morph-picker-${width}.png` })
  })
}

test('品系與桌機篩選同步，已售出品系依狀態開放並可全部重置', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await fixtures(page)
  await page.getByRole('button', { name: '展開篩選', exact: true }).click()
  const picker = page.getByRole('combobox', { name: '選擇品系' })
  const filters = page.locator('#desktop-shop-filters')
  await filters.getByLabel('已售出', { exact: true }).check()
  await expect(picker.locator('option[value="已售出品系"]')).toHaveText('已售出品系（1 隻）')
  await picker.selectOption('黑夜')
  await filters.getByLabel('最高價格').fill('9000')
  await expect(picker).toHaveValue('黑夜')
  await expect(page.locator('.flip-card')).toHaveCount(2)
  await picker.selectOption('已售出品系')
  await filters.getByLabel('已售出', { exact: true }).uncheck()
  await expect(page.locator('.flip-card')).toHaveCount(0)
  await expect(picker.locator('option[value="已售出品系"]')).toHaveText('已售出品系（0 隻）')
  await page.getByRole('button', { name: '重置全部篩選', exact: true }).click()
  await expect(picker).toHaveValue('')
  await expect(page.locator('.flip-card')).toHaveCount(3)
})

test('舊關鍵字連結仍可移除，選取品系會清除舊關鍵字', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await fixtures(page, '/shop?kw=A')
  await expect(page.getByRole('button', { name: '移除條件：關鍵字：A', exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: '選擇品系' }).selectOption('黑夜')
  await expect(page).not.toHaveURL(/kw=/)
  await expect(page.locator('.flip-card')).toHaveCount(2)
})
