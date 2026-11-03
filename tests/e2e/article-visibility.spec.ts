import { test, expect } from '@playwright/test'

const preview = process.env.ARTICLE_PREVIEW_EXPECTED === 'true'
const rows = [
  {
    id: 'VIS-PUBLISHED',
    status: 'Published',
    title: '正式文章驗證',
    category: '健康照護',
    summary: '已發布摘要',
    content: '<p>正式文章本文</p>'
  },
  {
    id: 'VIS-DRAFT',
    status: 'Draft',
    title: '草稿測試獨有詞',
    category: '草稿專用分類',
    summary: '草稿摘要',
    content: '<p>不可在正式版本公開的草稿本文</p>'
  },
  {
    id: 'VIS-UNKNOWN',
    status: 'Archived',
    title: '未知狀態文章',
    category: '未知分類',
    content: '<p>不可公開</p>'
  }
]
test.use({ serviceWorkers: 'block' })
test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/articles**', (route) => {
    const id = new URL(route.request().url()).searchParams.get('id')?.replace(/^eq\./, '')
    return route.fulfill({ json: id ? rows.find((a) => a.id === id) || null : rows })
  })
  await page.goto('/certificates')
  await expect
    .poll(() =>
      page.evaluate(() => {
        const app = (document.querySelector('#__nuxt') as any)?.__vue_app__?.config.globalProperties
        return !!app?.$router && !!app.$nuxt?.$pinia?._s.get('main') && !app.$nuxt.isHydrating
      })
    )
    .toBe(true)
})
async function navigate(page: any, path: string) {
  await page.evaluate(
    (path: string) =>
      (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$router.push(
        path
      ),
    path
  )
}

test('列表、分類及搜尋共用草稿規則', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/rest/v1/articles')) requests.push(request.url())
  })
  await navigate(page, '/articles')
  await expect(page.locator('.article-entry')).toHaveCount(preview ? 2 : 1)
  await expect(page.locator('.article-entry .article-draft-badge')).toHaveCount(preview ? 1 : 0)
  const categories = page.locator('select[aria-label="文章分類"]')
  await expect(categories.locator('option', { hasText: '草稿專用分類' })).toHaveCount(
    preview ? 1 : 0
  )
  if (preview) {
    if (await categories.isVisible()) await categories.selectOption('草稿專用分類')
    else await page.getByRole('button', { name: '草稿專用分類', exact: true }).click()
    await expect(page.locator('.article-entry')).toHaveCount(1)
    await expect(page.locator('.article-entry')).toContainText('草稿預覽')
    if (await categories.isVisible()) await categories.selectOption('All')
    else await page.getByRole('button', { name: '全部文章', exact: true }).click()
  }
  await page.locator('input[type="search"]').fill('草稿測試獨有詞')
  await expect(page.locator('.article-entry')).toHaveCount(preview ? 1 : 0)
  expect(
    requests.some(
      (url) =>
        new URL(url).searchParams.get('status') ===
        (preview ? 'in.(Published,Draft)' : 'in.(Published)')
    )
  ).toBe(true)
  const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
  expect(schemas.join('')).not.toContain('VIS-DRAFT')
})
for (const row of rows) {
  test(`詳情 ${row.status} 狀態檢查（含快取繞過防護）`, async ({ page }) => {
    await page.evaluate((row) => {
      const store = (
        document.querySelector('#__nuxt') as any
      ).__vue_app__.config.globalProperties.$nuxt.$pinia._s.get('main')
      store.articlesList = [
        { ID: row.id, Status: row.status, Title: row.title, Content: row.content }
      ]
    }, row)
    await navigate(page, `/articles/${row.id}`)
    const visible = row.status === 'Published' || (row.status === 'Draft' && preview)
    await expect(page.locator('.reader-content')).toHaveCount(visible ? 1 : 0)
    if (visible) {
      await expect(page.locator('.reader-header h1')).toHaveText(row.title)
      await expect(page.locator('.reader-header .article-draft-badge')).toHaveCount(
        row.status === 'Draft' ? 1 : 0
      )
    } else {
      await expect(page.getByText('找不到此文章或文章已下架', { exact: true })).toBeVisible()
      expect(await page.content()).not.toContain(row.content)
    }
  })
}
