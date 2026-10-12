import { test, expect } from '@playwright/test'

test.use({ serviceWorkers: 'block' })
test.beforeEach(async ({ page }) => {
  await page.route('https://tiles.openfreemap.org/**', (route) => route.abort())
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/hospital')
  await expect(page.locator('.map-stage')).toHaveAttribute('data-map-ready', 'true', {
    timeout: 30000
  })
})

test('一般滾輪閱讀頁面，修飾鍵滾輪以滑鼠位置縮放', async ({ page }) => {
  const stage = page.locator('.map-stage')
  await stage.scrollIntoViewIfNeeded()
  await expect(stage).toHaveAttribute('data-map-idle', 'true')
  const zoom = Number(await stage.getAttribute('data-map-zoom'))
  const bounds = (await stage.boundingBox())!
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  const scroll = await page.evaluate(() => window.scrollY)
  await page.mouse.wheel(0, 160)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scroll + 20)
  expect(Number(await stage.getAttribute('data-map-zoom'))).toBeCloseTo(zoom, 3)
  await stage.scrollIntoViewIfNeeded()
  const marker = page.locator('.map-cluster.single').first()
  const name = await marker.getAttribute('aria-label')
  const before = (await marker.boundingBox())!
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2)
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, -120)
  await page.keyboard.up('Control')
  await expect
    .poll(async () => Number(await stage.getAttribute('data-map-zoom')))
    .toBeGreaterThan(zoom * 1.1)
  await expect(stage).toHaveAttribute('data-map-idle', 'true')
  const after = (await page.getByRole('button', { name: name!, exact: true }).boundingBox())!
  expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThan(8)
})

test('院所選取、重新定位、Esc 與重設視角清除資訊', async ({ page }) => {
  const stage = page.locator('.map-stage')
  await page.locator('.map-result-preview button').first().click()
  await expect(page.locator('.map-hospital-detail')).toBeVisible()
  await expect(stage).toHaveAttribute('data-map-idle', 'true')
  await page.getByRole('button', { name: '縮小地圖', exact: true }).click()
  await expect.poll(async () => Number(await stage.getAttribute('data-map-zoom'))).toBeLessThan(150)
  await page.getByRole('button', { name: '重新定位', exact: true }).click()
  await expect
    .poll(async () => Number(await stage.getAttribute('data-map-zoom')))
    .toBeGreaterThan(190)
  await page.getByRole('button', { name: '關閉院所資訊', exact: true }).focus()
  await page.keyboard.press('Escape')
  await expect(page.locator('.map-hospital-detail')).toHaveCount(0)
  await expect(stage.locator('canvas')).toBeFocused()
  await page.getByRole('button', { name: '重設地圖視角', exact: true }).click()
  await expect(stage).toHaveAttribute('data-map-idle', 'true')
  await page.locator('.map-result-preview button').first().click()
  await expect(page.locator('.map-hospital-detail')).toBeVisible()
  await page.getByRole('button', { name: '重設地圖視角', exact: true }).click()
  await expect(page.locator('.map-hospital-detail')).toHaveCount(0)
  await expect
    .poll(async () => Number(await stage.getAttribute('data-map-zoom')))
    .toBeLessThan(1.01)
})

test('輕微手震不平移，鍵盤可縮放，篩選不保留已排除院所', async ({ page }) => {
  const stage = page.locator('.map-stage')
  await stage.scrollIntoViewIfNeeded()
  await expect(stage).toHaveAttribute('data-map-idle', 'true')
  const bounds = (await stage.boundingBox())!
  const frames = Number(await stage.getAttribute('data-map-frames'))
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width / 2 + 2, bounds.y + bounds.height / 2 + 2)
  expect(Number(await stage.getAttribute('data-map-frames'))).toBe(frames)
  await page.mouse.up()
  await page.getByRole('combobox', { name: '地圖範圍', exact: true }).selectOption('all')
  await expect(stage).toHaveAttribute('data-map-idle', 'true')
  await stage.locator('canvas').focus()
  await page.keyboard.press('+')
  await expect
    .poll(async () => Number(await stage.getAttribute('data-map-zoom')))
    .toBeGreaterThan(1.2)
  await page.keyboard.press('0')
  await expect(stage).toHaveAttribute('data-map-idle', 'true')
  await page.locator('.map-result-preview button').first().click()
  await expect(page.locator('.map-hospital-detail')).toBeVisible()
  await page.getByRole('searchbox').fill('不存在院所互動測試')
  await expect(page.locator('.map-hospital-detail')).toHaveCount(0)
  await expect(page.locator('.map-cluster')).toHaveCount(0)
})

test('篩選結果可重新取景，Google 預覽需主動啟用操作', async ({ page }) => {
  const stage = page.locator('.map-stage')
  await page.locator('.map-result-preview button').first().click()
  await expect
    .poll(async () => Number(await stage.getAttribute('data-map-zoom')))
    .toBeGreaterThan(190)
  await page.getByRole('button', { name: '顯示篩選結果', exact: true }).click()
  await expect(page.locator('.map-hospital-detail')).toHaveCount(0)
  await expect.poll(async () => Number(await stage.getAttribute('data-map-zoom'))).toBeLessThan(10)
  await page.getByRole('button', { name: 'Google 地圖', exact: true }).click()
  const iframe = page.locator('.map-google')
  await expect(iframe).toHaveAttribute('tabindex', '-1')
  await expect(iframe).toHaveCSS('pointer-events', 'none')
  await page.getByRole('button', { name: '啟用地圖操作', exact: true }).click()
  await expect(iframe).toHaveAttribute('tabindex', '0')
  await expect(iframe).toHaveCSS('pointer-events', 'auto')
  await page.getByRole('button', { name: '停止操作地圖', exact: true }).click()
  await expect(iframe).toHaveCSS('pointer-events', 'none')
})

test('地圖院所資料與清單返回地圖保持同一院所及鍵盤焦點', async ({ page }) => {
  await page.locator('.map-result-preview button').first().click()
  const name = await page.locator('.map-hospital-detail > strong').innerText()
  await page
    .locator('.map-hospital-detail')
    .getByRole('button', { name: '院所資料', exact: true })
    .click()
  const card = page
    .locator('.hosp-card')
    .filter({ has: page.getByRole('heading', { name, exact: true }) })
  await expect(card.locator('.hosp-header-toggle')).toBeFocused()
  await expect(card.locator('.hosp-header-toggle')).toHaveAttribute('aria-expanded', 'true')
  await card.locator('.hosp-map-focus').click()
  await expect(page.locator('.hosp-map-section')).toBeFocused()
  await expect(page.locator('.map-hospital-detail > strong')).toHaveText(name)
  await expect
    .poll(async () => Number(await page.locator('.map-stage').getAttribute('data-map-zoom')))
    .toBeGreaterThan(190)
})

test('鍵盤重設與待執行滾輪不留下資訊或重新拉近視角', async ({ page }) => {
  const stage = page.locator('.map-stage')
  await page.locator('.map-result-preview button').first().click()
  await expect(page.locator('.map-hospital-detail')).toBeVisible()
  await page.getByRole('button', { name: '傾斜看高度', exact: true }).click()
  await stage.locator('canvas').focus()
  await page.keyboard.press('0')
  await expect(page.locator('.map-hospital-detail')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '垂直俯視', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await expect(stage).toHaveAttribute('data-map-idle', 'true')
  await stage.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    element.dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
        deltaY: -400,
        clientX: rect.x + rect.width / 2,
        clientY: rect.y + rect.height / 2
      })
    )
    ;(element.querySelector('[aria-label="重設地圖視角"]') as HTMLButtonElement).click()
  })
  await page.waitForTimeout(350)
  await expect(stage).toHaveAttribute('data-map-idle', 'true')
  expect(Number(await stage.getAttribute('data-map-zoom'))).toBeCloseTo(1, 3)
})

test('拖曳離開畫面後放開仍可重新操作，縮放下限明確停用', async ({ page }) => {
  const stage = page.locator('.map-stage')
  await stage.scrollIntoViewIfNeeded()
  const rect = (await stage.boundingBox())!
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2)
  await page.mouse.down()
  await page.mouse.move(rect.x + rect.width + 30, rect.y + 60, { steps: 10 })
  await page.mouse.up()
  await expect(stage.locator('canvas')).toHaveCSS('cursor', 'grab')
  await page.getByRole('button', { name: '重設地圖視角', exact: true }).click()
  await expect(stage).toHaveAttribute('data-map-idle', 'true')
  await page.getByRole('button', { name: '縮小地圖', exact: true }).click()
  await expect(page.getByRole('button', { name: '縮小地圖', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: '放大地圖', exact: true }).click()
  await expect(page.getByRole('button', { name: '縮小地圖', exact: true })).toBeEnabled()
})
