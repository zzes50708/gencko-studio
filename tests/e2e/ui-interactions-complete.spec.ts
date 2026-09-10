import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const waitForHydration = async (page: Page) => {
  await page.addStyleTag({ content: '#nuxt-devtools-container { display: none !important; }' })
  await page.waitForFunction(() => {
    const root = document.querySelector('#__nuxt') as HTMLElement & { __vue_app__?: unknown }
    return Boolean(root?.__vue_app__)
  })
}

test.describe('全站 UI 關鍵互動收尾', () => {
  test('桌機 Navbar dropdown 可用 Escape 與導覽跳轉關閉', async ({ page }) => {
    await page.goto('/home')
    await waitForHydration(page)

    const trigger = page.getByRole('button', { name: '探索選購選單' })
    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(
      page.locator('#nav-menu-explore').getByRole('link', { name: '線上競標' })
    ).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await trigger.click()
    const auctionLink = page.locator('#nav-menu-explore').getByRole('link', { name: '線上競標' })
    await auctionLink.click()
    await expect(page).toHaveURL(/\/auction$/)
    await expect(page.locator('#nav-menu-explore')).not.toBeVisible()
  })

  test('手機 Bottom Sheet 鎖定捲動、Escape 關閉並回復焦點', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/home')
    await waitForHydration(page)

    const trigger = page.getByRole('button', { name: '探索' })
    await trigger.click()
    const sheet = page.getByRole('dialog', { name: '探索導覽選單' })
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole('button', { name: '關閉' })).toBeFocused()
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden')

    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)
    await expect(trigger).toBeFocused()
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('')

    await trigger.click()
    await sheet.getByRole('link').first().click()
    await expect(sheet).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('')
  })

  test('Breeders 可切換物種且狀態對輔助科技同步', async ({ page }) => {
    await page.goto('/breeders')
    await waitForHydration(page)

    const fatTail = page.getByRole('button', { name: '肥尾守宮', exact: true })
    await fatTail.click()
    await expect(fatTail).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: '豹紋守宮', exact: true })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    await expect(page.locator('.breeders-page-wrapper')).toBeVisible()
  })

  test('Shop 搜尋、收藏與比較維持可操作', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('gencko_wishlist')
    })
    await page.goto('/shop')
    await waitForHydration(page)
    const firstCard = page.locator('.flip-card').first()
    const firstProduct = firstCard.locator('a[href^="/product/"]')
    await expect(firstProduct).toBeVisible({ timeout: 30_000 })
    const href = await firstProduct.getAttribute('href')
    const id = href?.split('/').pop()
    expect(id).toBeTruthy()

    const cardImage = firstCard.locator('.flip-img')
    const imageBox = await cardImage.boundingBox()
    expect(imageBox).not.toBeNull()
    expect(Math.abs(imageBox!.width - imageBox!.height)).toBeLessThanOrEqual(2)
    await firstCard.hover()
    await expect
      .poll(() => firstCard.locator('.flip-inner').evaluate((el) => getComputedStyle(el).transform))
      .not.toBe('none')

    await page.getByRole('searchbox', { name: '搜尋關鍵字或編號' }).fill(id!)
    await expect(page.locator(`a[href="/product/${id}"]`).first()).toBeVisible()

    const compare = firstCard.locator('.flip-back-actions').getByRole('button', {
      name: '加入比較'
    })
    const favorite = firstCard.locator('.flip-back-actions').getByRole('button', {
      name: '收藏',
      exact: true
    })
    await firstProduct.focus()
    await page.keyboard.press('Tab')
    await expect(favorite).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(compare).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('.compare-bar')).toBeVisible()
    await expect(page.getByRole('link', { name: /前往比較（1）/ })).toBeVisible()

    await firstProduct.focus()
    await page.keyboard.press('Tab')
    await expect(favorite).toBeFocused()
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: '只看收藏' }).click()
    await expect(page.locator(`a[href="/product/${id}"]`).first()).toBeVisible()
  })

  test('Calculator 可切換物種與角色，說明 Modal 支援鍵盤關閉', async ({ page }) => {
    await page.goto('/calculator')
    await waitForHydration(page)

    const selectors = page.locator('.calc-selector-chip--dropdown')
    await selectors.first().click()
    await page.getByRole('button', { name: '蛇', exact: true }).click()
    await expect(selectors.nth(1)).toContainText('豬鼻蛇')

    const firstParent = page.locator('.calc-parent-card').first()
    await firstParent.getByRole('button', { name: '子代', exact: true }).click()
    await expect(page.locator('.calc-result-mode')).toHaveText('反向匹配')

    const helpTrigger = page.getByRole('button', { name: '基因觀念' })
    await helpTrigger.click()
    const dialog = page.getByRole('dialog', { name: '基礎觀念' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: '關閉基因說明' })).toBeFocused()
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden')

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(helpTrigger).toBeFocused()
  })
})
