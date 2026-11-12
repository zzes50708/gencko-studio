import { test, expect, type Page } from '@playwright/test'
import { shopCollections } from '../../data/shop-collections'

const animals = [
  {
    id: 'COLLECTION-1',
    species: '豹紋守宮',
    morph: '分類測試',
    status: 'ForSale',
    genes: ['黑夜'],
    listing_price: 3000,
    image_url: '/images/guide/leopard-gecko.webp'
  },
  {
    id: 'BREEDER-1',
    species: '豹紋守宮',
    morph: '種群封面測試',
    status: 'SelfKeep',
    genes: ['黑夜'],
    image_url: '/images/guide/fat-tailed-gecko.webp'
  }
]
async function loginFixture(page: Page) {
  await page.waitForFunction(() => {
    const g = (document.querySelector('#__nuxt') as any)?.__vue_app__?.config.globalProperties
    return g?.$pinia?._s.get('main') && !g.$nuxt.isHydrating
  })
  await page.evaluate(async () => {
    const g = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
    const store = g.$pinia._s.get('main')
    await store.checkAuthStatus()
    g.$supabase.client.auth.getSession = async () => ({
      data: {
        session: {
          user: {
            id: 'ISOLATED-COLLECTION-MANAGER',
            app_metadata: { provider: 'google', auction_admin: true },
            user_metadata: {}
          }
        }
      },
      error: null
    })
    await store.checkAuthStatus()
  })
}
async function setup(page: Page, fixtures = animals) {
  const state = { document: null as any, revision: 0, fail: '', denied: false, writes: [] as any[] }
  const read = async (route: any) =>
    route.fulfill({
      json: {
        document: state.document,
        revision: state.revision,
        updated_at: state.revision ? '2026-11-11T10:00:00Z' : null
      }
    })
  const routes = async (target: Page) => {
    await target.route('**/rest/v1/*animals**', (route) => {
      const id = new URL(route.request().url()).searchParams.get('id')?.replace(/^eq\./, '')
      return route.fulfill({ json: id ? fixtures.filter((a) => a.id === id) : fixtures })
    })
    await target.route('**/rest/v1/shop_collection_settings**', read)
    await target.route('**/rest/v1/rpc/shop_collection_access', (route) =>
      route.fulfill({ json: !state.denied })
    )
    await target.route('**/rest/v1/rpc/save_shop_collections', (route) => {
      const body = route.request().postDataJSON()
      state.writes.push(body)
      if (state.fail)
        return route.fulfill({
          status: state.fail === '40001' ? 409 : 503,
          json: { code: state.fail, message: '隔離測試錯誤' }
        })
      if (body.p_expected_revision !== state.revision)
        return route.fulfill({ status: 409, json: { code: '40001', message: '版本衝突' } })
      state.document = body.p_document
      state.revision++
      return route.fulfill({
        json: { revision: state.revision, updated_at: '2026-11-11T10:00:00Z' }
      })
    })
  }
  await routes(page)
  return { state, routes }
}
async function selectCategory(page: Page, width: number) {
  if (width < 640)
    await page
      .getByRole('combobox', { name: '編輯分類', exact: true })
      .selectOption('tangerine-line')
  else
    await page
      .getByRole('navigation', { name: '編輯分類' })
      .getByRole('button', { name: /^Tangerine Line/ })
      .click()
}
async function setEditingMode(page: Page, mode: string) {
  await page
    .getByRole('group', { name: '編輯模式' })
    .getByRole('button', { name: mode, exact: true })
    .click()
}
for (const width of [320, 1440]) {
  test(`${width}px 管理員可選種群封面，儲存後另一個瀏覽器讀得到分類`, async ({
    page,
    browser,
    baseURL
  }) => {
    await page.setViewportSize({ width, height: 900 })
    const { state, routes } = await setup(page)
    await page.goto('/shop/curate', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: '請登入管理員帳號' })).toBeVisible()
    await expect(page.locator('.studio-photo-card')).toHaveCount(0)
    await loginFixture(page)
    await expect(page.locator('.studio-photo-card')).toHaveCount(2)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(
      (await page.getByRole('combobox', { name: '照片來源', exact: true }).boundingBox())!.height
    ).toBeGreaterThanOrEqual(44)
    await page.getByRole('combobox', { name: '照片來源', exact: true }).selectOption('breeders')
    await expect(page.locator('.studio-photo-card')).toHaveCount(1)
    await page.getByRole('button', { name: '將 BREEDER-1 設為封面', exact: true }).click()
    await selectCategory(page, width)
    await expect(page.locator('.studio-photo-card').getByRole('checkbox')).toHaveCount(0)
    await page.getByRole('button', { name: '將 BREEDER-1 設為封面', exact: true }).click()
    await setEditingMode(page, '加入此分類')
    await expect(page.locator('.studio-photo-card')).toHaveCount(1)
    await page.locator('.studio-photo-card').getByRole('checkbox').check()
    await page.getByRole('button', { name: /^儲存並更新網站/ }).click()
    await expect(page.getByRole('status')).toContainText('已儲存，網站分類與封面已更新。')
    expect(state.writes).toHaveLength(1)
    expect(state.document.covers['豹紋守宮']).toBe('BREEDER-1')
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 } })
    const visitor = await context.newPage()
    await routes(visitor)
    await visitor.goto('/shop', { waitUntil: 'domcontentloaded' })
    await visitor.waitForFunction(() => {
      const a = (document.querySelector('#__nuxt') as any)?.__vue_app__
      return a && !a.config.globalProperties.$nuxt.isHydrating
    })
    const category = visitor.getByRole('link', { name: /Tangerine Line（1 隻）/ })
    await expect(category).toBeVisible()
    await expect(category.locator('img')).toHaveAttribute('src', /fat-tailed-gecko/)
    await expect(visitor.getByRole('link', { name: /Super Giants（0 隻）/ })).toBeAttached()
    await expect(visitor.getByRole('link', { name: '分類與封面設定 ↗' })).toHaveCount(0)
    await loginFixture(visitor)
    await expect(visitor.locator('.collection-entry a[href="/shop/curate"]')).toHaveCount(0)
    expect(
      await visitor
        .locator('.collection-grid')
        .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
    ).toBe(width < 1024 ? 2 : 4)
    const categoryPhoto = await category.locator('.collection-photo').boundingBox()
    expect(categoryPhoto!.width).toBeCloseTo(categoryPhoto!.height, 0)
    expect(await visitor.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    )
    await category.click()
    await expect(visitor.locator('.catalog-card')).toHaveCount(1)
    const photo = visitor.locator('.catalog-card-photo')
    const box = await photo.boundingBox()
    expect(box!.width).toBeCloseTo(box!.height, 0)
    await photo.click()
    await expect(visitor.locator('.prod-title')).toHaveText('分類測試')
    const productPhoto = await visitor.locator('.prod-img-box').boundingBox()
    expect(productPhoto!.width).toBeCloseTo(productPhoto!.height, 0)
    await context.close()
    await setEditingMode(page, '設定封面')
    await page.getByRole('combobox', { name: '照片來源', exact: true }).selectOption('breeders')
    await page.screenshot({
      path: `output/geckoboa-redesign/manager-${width}.png`,
      fullPage: false
    })
  })
}

test('五欄正方照片、大型分類控制與未分類／目前分類篩選即時更新', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  const fixtures = [
    ...animals,
    ...Array.from({ length: 4 }, (_, index) => ({
      ...animals[0],
      id: `UNCLASSIFIED-${index}`,
      morph: `待分類 ${index}`
    }))
  ]
  await setup(page, fixtures)
  await page.goto('/shop/curate', { waitUntil: 'domcontentloaded' })
  await loginFixture(page)
  await expect(page.locator('.studio-photo-card')).toHaveCount(6)
  await selectCategory(page, 1440)
  const filters = page.getByRole('group', { name: '分類歸屬篩選' })
  const columns = await page
    .locator('.studio-photo-grid')
    .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
  expect(columns).toBe(5)
  const firstPhoto = await page.locator('.studio-photo').first().boundingBox()
  expect(firstPhoto!.width).toBeCloseTo(firstPhoto!.height, 0)
  const breeder = page.locator('.studio-photo-card').filter({ hasText: 'BREEDER-1' })
  await breeder.getByRole('button', { name: '將 BREEDER-1 設為封面', exact: true }).click()
  await setEditingMode(page, '加入此分類')
  expect(
    (await page.locator('.studio-membership').first().boundingBox())!.height
  ).toBeGreaterThanOrEqual(52)
  const member = page.locator('.studio-photo-card').filter({ hasText: 'COLLECTION-1' })
  await filters.getByRole('button', { name: '尚未分類 5', exact: true }).click()
  await member.locator('.studio-membership').click()
  await expect(page.locator('.studio-photo-card')).toHaveCount(4)
  await expect(filters.getByRole('button', { name: '尚未分類 4', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await filters.getByRole('button', { name: '目前分類 1', exact: true }).click()
  await expect(page.locator('.studio-photo-card')).toHaveCount(1)
  await member.locator('.studio-membership').click()
  await expect(page.locator('.studio-photo-card')).toHaveCount(0)
  // 歸到另一分類的個體不應再次出現在「尚未分類」。
  await page
    .getByRole('navigation', { name: '編輯分類' })
    .getByRole('button', { name: /^Black Night/ })
    .click()
  await filters.getByRole('button', { name: '全部 5', exact: true }).click()
  await member.locator('.studio-membership').click()
  await selectCategory(page, 1440)
  await filters.getByRole('button', { name: '尚未分類 4', exact: true }).click()
  await expect(member).toHaveCount(0)
  // 基因規則與手動排除也參與相同的篩選判斷。
  await page.getByRole('combobox', { name: '分類方式', exact: true }).selectOption('genes')
  await page.getByRole('checkbox', { name: '黑夜', exact: true }).check()
  await expect(page.locator('.studio-photo-card')).toHaveCount(0)
  await filters.getByRole('button', { name: '目前分類 4', exact: true }).click()
  await expect(page.locator('.studio-photo-card')).toHaveCount(4)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page
    .locator('.studio-inventory')
    .screenshot({ path: 'output/geckoboa-redesign/five-column-filters.png' })
})

test('封面模式看全部，分類模式只看待售且排除種群、已售、保留及競標', async ({ page }) => {
  const fixtures = [
    ...animals,
    { ...animals[0], id: 'SOLD-1', status: 'Sold' },
    { ...animals[0], id: 'RESERVED-1', status: 'Reserved' },
    { ...animals[0], id: 'AUCTION-1', status: 'Auction' }
  ]
  await setup(page, fixtures)
  await page.goto('/shop/curate', { waitUntil: 'domcontentloaded' })
  await loginFixture(page)
  await expect(page.locator('.studio-photo-card')).toHaveCount(5)
  await selectCategory(page, 1280)
  await expect(page.locator('.studio-membership')).toHaveCount(0)
  await page.getByRole('button', { name: '將 SOLD-1 設為封面', exact: true }).click()
  await setEditingMode(page, '加入此分類')
  await expect(page.locator('.studio-photo-card')).toHaveCount(1)
  await expect(page.locator('.studio-photo-card')).toContainText('COLLECTION-1')
  await expect(page.locator('.studio-photo-card button')).toHaveCount(0)
  const filters = page.getByRole('group', { name: '分類歸屬篩選' })
  await filters.getByRole('button', { name: '尚未分類 1', exact: true }).click()
  await page.getByRole('combobox', { name: '分類方式', exact: true }).selectOption('genes')
  await page.getByRole('checkbox', { name: '黑夜', exact: true }).check()
  await expect(page.locator('.studio-photo-card')).toHaveCount(0)
  await filters.getByRole('button', { name: '目前分類 1', exact: true }).click()
  await expect(page.locator('.studio-photo-card')).toHaveCount(1)
  await setEditingMode(page, '設定封面')
  await expect(page.locator('.studio-photo-card')).toHaveCount(5)
  await expect(
    page.getByRole('button', { name: '將 SOLD-1 設為封面', exact: true })
  ).toHaveAttribute('aria-pressed', 'true')
})

test('封面可直接選，不必加入分類，移出分類或更換規則也保留封面', async ({ page }) => {
  const { state } = await setup(page)
  await page.goto('/shop/curate', { waitUntil: 'domcontentloaded' })
  await loginFixture(page)
  await expect(page.locator('.studio-photo-card')).toHaveCount(2)
  await selectCategory(page, 1280)
  const breeder = page.locator('.studio-photo-card').filter({ hasText: 'BREEDER-1' })
  const cover = breeder.getByRole('button', { name: '將 BREEDER-1 設為封面', exact: true })
  await expect(cover).toBeEnabled()
  await cover.click()
  await expect(breeder.getByRole('checkbox')).toHaveCount(0)
  await setEditingMode(page, '加入此分類')
  const member = page.locator('.studio-photo-card').filter({ hasText: 'COLLECTION-1' })
  await member.getByRole('checkbox').check()
  await member.getByRole('checkbox').uncheck()
  await setEditingMode(page, '設定封面')
  await expect(cover).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('combobox', { name: '分類方式', exact: true }).selectOption('genes')
  await expect(cover).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /^儲存並更新網站/ }).click()
  await expect(page.getByRole('status')).toContainText('已儲存，網站分類與封面已更新。')
  const group = state.document.groups.find((group: any) => group.id === 'tangerine-line')
  expect(group.animalIds).toEqual([])
  expect(group.coverAnimalId).toBe('BREEDER-1')
  await page.getByRole('link', { name: '查看網站分類 ↗' }).click()
  const category = page.getByRole('link', { name: /Tangerine Line（0 隻）/ })
  await expect(category.locator('img')).toHaveAttribute('src', /fat-tailed-gecko/)
})

for (const width of [390, 1440]) {
  test(`${width}px Pet Only 共用兩種物種的分類管理、入口、販售清單與篩選`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    const fat = {
      ...animals[0],
      id: 'PET-FAT',
      species: '肥尾守宮',
      morph: '肥尾寵物測試',
      genes: ['幽靈'],
      listing_price: 2000
    }
    const { state } = await setup(page, [...animals, fat])
    state.document = {
      format: 'gencko-shop-collections',
      version: 1,
      groups: shopCollections.map((group) => ({
        ...group,
        animalIds: group.id === 'pet-only' ? ['COLLECTION-1', 'PET-FAT'] : [],
        coverAnimalId: group.id === 'pet-only' ? 'PET-FAT' : ''
      })),
      covers: {}
    }
    await page.goto('/shop/curate', { waitUntil: 'domcontentloaded' })
    await loginFixture(page)
    await expect(page.locator('.studio-photo-card')).toHaveCount(2)
    await page
      .getByRole('group', { name: '設定分類的物種' })
      .getByRole('button', { name: '肥尾守宮', exact: true })
      .click()
    if (width < 640)
      await page.getByRole('combobox', { name: '編輯分類', exact: true }).selectOption('pet-only')
    else
      await page
        .getByRole('navigation', { name: '編輯分類' })
        .getByRole('button', { name: /^Pet Only Geckos/ })
        .click()
    await expect(page.locator('.studio-photo-card')).toHaveCount(3)
    await setEditingMode(page, '加入此分類')
    await expect(page.locator('.studio-photo-card')).toHaveCount(2)
    await expect(
      page.locator('.studio-photo-card').filter({ hasText: 'PET-FAT' }).getByRole('checkbox')
    ).toBeChecked()
    await page.getByRole('button', { name: /^儲存並更新網站/ }).click()
    await expect(page.getByRole('status')).toContainText('已儲存，網站分類與封面已更新。')
    expect(state.document.groups.find((group: any) => group.id === 'pet-only').animalIds).toEqual([
      'COLLECTION-1',
      'PET-FAT'
    ])
    await page.getByRole('link', { name: '查看網站分類 ↗' }).click()
    await page
      .getByRole('group', { name: '選擇物種' })
      .getByRole('button', { name: '肥尾守宮', exact: true })
      .click()
    const entry = page.getByRole('link', { name: /Pet Only Geckos（2 隻）/ })
    await expect(entry).toBeVisible()
    await entry.click()
    await expect(page.locator('.catalog-card')).toHaveCount(2)
    await expect(page.locator('.catalog-shared-species')).toHaveText('豹紋守宮・肥尾守宮')
    await expect(page.locator('.catalog-card').filter({ hasText: '肥尾守宮' })).toHaveCount(1)
    if (width < 768) {
      await page.getByRole('button', { name: '篩選', exact: true }).click()
      const dialog = page.getByRole('dialog', { name: '篩選條件', exact: true })
      await dialog.locator('summary').filter({ hasText: /^隱性/ }).click()
      await dialog.getByLabel('幽靈', { exact: true }).check()
      await dialog.getByRole('button', { name: /顯示.*隻/ }).click()
    } else {
      await page.getByRole('button', { name: '展開篩選', exact: true }).click()
      await page.locator('#desktop-shop-filters summary').filter({ hasText: /^隱性/ }).click()
      await page.locator('#desktop-shop-filters').getByLabel('幽靈', { exact: true }).check()
    }
    await expect(page.locator('.catalog-card')).toHaveCount(1)
    await expect(page.locator('.catalog-card')).toContainText('PET-FAT')
  })
}

test('非管理員不能編輯，儲存失敗與版本衝突保留畫面修改', async ({ page }) => {
  const { state } = await setup(page)
  state.denied = true
  await page.goto('/shop/curate', { waitUntil: 'domcontentloaded' })
  await loginFixture(page)
  await expect(page.getByRole('heading', { name: '此帳號沒有分類管理權限' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^儲存並更新網站/ })).toHaveCount(0)
  expect(state.writes).toHaveLength(0)
  state.denied = false
  await page.getByRole('button', { name: '重新確認權限' }).click()
  await expect(page.locator('.studio-photo-card')).toHaveCount(2)
  await page.getByRole('button', { name: '將 BREEDER-1 設為封面', exact: true }).click()
  state.fail = '503'
  await page.getByRole('button', { name: /^儲存並更新網站/ }).click()
  await expect(page.getByRole('status')).toContainText('尚未確認儲存結果')
  await expect(
    page.getByRole('button', { name: '將 BREEDER-1 設為封面', exact: true })
  ).toHaveAttribute('aria-pressed', 'true')
  state.fail = '40001'
  await page.getByRole('button', { name: /^儲存並更新網站/ }).click()
  await expect(page.getByRole('status')).toContainText('網站已有其他分頁儲存的新版本')
  await expect(page.getByRole('button', { name: /^儲存並更新網站/ })).toBeDisabled()
  await page.getByRole('button', { name: '捨棄修改並載入網站版本' }).click()
  await expect(page.getByRole('button', { name: /^儲存並更新網站/ })).toBeEnabled()
  await expect(
    page.getByRole('button', { name: '將 BREEDER-1 設為封面', exact: true })
  ).toHaveAttribute('aria-pressed', 'false')
})
