// 正式站只做未登入讀取與拒絕測試，不使用會員憑證，不操作客戶交易。
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import { chromium } from 'playwright'

const root = process.argv[2] || 'https://www.genckobreeding.com'
const checks = []
const failures = []
let browser
const address = (pathname) => new URL(pathname, root).href
async function check(name, run) {
  try {
    await run()
    checks.push(name)
  } catch (error) {
    failures.push({ name, error: error.message })
  }
}
try {
  for (const pathname of ['/home', '/auction', '/auction-management', '/profile']) {
    await check(`入口 ${pathname}`, async () => {
      const response = await fetch(address(pathname), { signal: AbortSignal.timeout(30000) })
      assert.equal(response.status, 200)
      const html = await response.text()
      assert.match(html, /<title>[^<]+<\/title>/)
      assert.ok(!html.includes('This Serverless Function has crashed'))
    })
  }
  await check('未登入出價被拒絕且標示尚未送出', async () => {
    const response = await fetch(address('/api/auctions/TEST-AUCTION-20261016-01/bid'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: new URL(root).origin },
      body: JSON.stringify({ amount: 200, requestId: randomUUID() }),
      signal: AbortSignal.timeout(20000)
    })
    assert.equal(response.status, 401)
    assert.equal((await response.json()).data?.outcome, 'not_submitted')
  })
  for (const origin of [new URL(root).origin, 'https://untrusted.example.invalid']) {
    await check(
      `登入接續拒絕${origin === new URL(root).origin ? '錯誤流程' : '外站讀取'}且不快取`,
      async () => {
        const response = await fetch(address('/api/auth/line/transfer'), {
          method: 'POST',
          headers: { 'content-type': 'application/json', origin },
          body: JSON.stringify({ flow: 'invalid' }),
          signal: AbortSignal.timeout(20000)
        })
        assert.equal(response.status, origin === new URL(root).origin ? 400 : 403)
        assert.match(response.headers.get('cache-control') || '', /no-store/)
        assert.ok(!(await response.json()).transfer)
      }
    )
  }
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ serviceWorkers: 'block' })
  const page = await context.newPage()
  const runtimeErrors = []
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  await check('訪客管理頁只顯示管理員登入入口', async () => {
    await page.goto(address('/auction-management'), { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Google 管理員登入', exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: '新增競標場次', exact: true }).count(), 0)
  })
  await check('首頁四個快速入口與手機排版', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(address('/home'), { waitUntil: 'domcontentloaded' })
    await page.locator('.home-scenario-grid').waitFor()
    assert.deepEqual(
      await page
        .locator('.home-scenario-grid a')
        .evaluateAll((links) => links.map((a) => a.getAttribute('href'))),
      ['/start-here', '/auction', '/calculator', '/hospital']
    )
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false
    )
  })
  await check('主要入口沒有瀏覽器執行錯誤', async () => assert.deepEqual(runtimeErrors, []))
} finally {
  if (browser) await browser.close()
}
fs.mkdirSync('output', { recursive: true })
fs.writeFileSync(
  'output/auction-release-live-results.json',
  JSON.stringify({ root, checkedAt: new Date().toISOString(), passed: checks, failures }, null, 2)
)
console.log(JSON.stringify({ passed: checks.length, failures }))
assert.deepEqual(failures, [])
