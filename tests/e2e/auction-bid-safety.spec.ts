// @ts-nocheck
import { test } from '@playwright/test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const id = 'TEST-AUCTION-20261016-01'
let root
const output = []
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const deferred = () => {
  let release
  const promise = new Promise((r) => (release = r))
  return { promise, release }
}
test('競標出價故障回歸：同步、斷線重試、登入及輸入', async ({}, testInfo) => {
  test.setTimeout(180000)
  root = testInfo.project.use.baseURL
  const browser = await chromium.launch({ headless: true })
  async function create(options = {}) {
    const context = await browser.newContext({ serviceWorkers: 'block' })
    const page = await context.newPage()
    page.setDefaultTimeout(20000)
    const state = {
      auction: {
        id,
        title: '隔離測試',
        morph: '測試',
        gender: '未定',
        status: 'active',
        start_price: 100,
        min_increment: 100,
        end_time: new Date(Date.now() + (options.nearEnd ? 120000 : 86400000)).toISOString(),
        images: [],
        note: '僅瀏覽器測試'
      },
      bids: [
        {
          id: 'BASE',
          auction_id: id,
          user_name: '初始測試',
          amount: 400,
          bid_time: new Date().toISOString()
        }
      ],
      posts: 0,
      bidReads: 0,
      metaReads: 0,
      alerts: [],
      errors: [],
      holdBids: null,
      holdMeta: null
    }
    page.on('dialog', async (d) => {
      if (d.type() !== 'confirm') state.alerts.push(d.message())
      await (d.type() === 'confirm' ? d.accept() : d.dismiss())
    })
    page.on('pageerror', (e) => state.errors.push(e.message))
    await context.route('**/rest/v1/**', async (r) => {
      const url = new URL(r.request().url())
      if (r.request().method() !== 'GET') return r.abort()
      if (url.pathname.endsWith('/auction_bids')) {
        state.bidReads++
        const captured = JSON.parse(JSON.stringify(state.bids))
        const gate = state.holdBids
        state.holdBids = null
        if (gate) {
          gate.started = true
          await gate.promise
        }
        return r.fulfill({ json: captured }).catch(() => {})
      }
      if (url.pathname.endsWith('/auctions')) {
        const captured = JSON.parse(JSON.stringify(state.auction))
        const gate = state.holdMeta
        state.holdMeta = null
        if (url.searchParams.has('id')) {
          state.metaReads++
          if (gate) {
            gate.started = true
            await gate.promise
          }
          return r.fulfill({ json: captured }).catch(() => {})
        }
        return r.fulfill({ json: [captured] })
      }
      return r.continue()
    })
    await context.route('**/api/auctions/**/bid', async (r) => {
      if (
        !r
          .request()
          .url()
          .includes('/' + id + '/bid')
      )
        return r.abort()
      state.posts++
      return state.postHandler
        ? state.postHandler(r)
        : r.fulfill({ status: 500, json: { message: '未設定測試回應' } })
    })
    await page.goto(root + '/stories', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForFunction(
      () =>
        !!document
          .querySelector('#__nuxt')
          ?.__vue_app__?.config.globalProperties.$pinia?._s.get('main')
    )
    await page.evaluate(async (a) => {
      const g = document.querySelector('#__nuxt').__vue_app__.config.globalProperties
      const s = g.$pinia._s.get('main')
      s.auctionList = [a]
      s.currentUser = { type: 'google', email: 'auction-audit@example.invalid' }
      await g.$router.push('/auction/' + a.id)
    }, state.auction)
    await page.locator('.highest-price').filter({ hasText: '400' }).waitFor()
    await page.evaluate(() => {
      document
        .querySelector('#__nuxt')
        .__vue_app__.config.globalProperties.$pinia._s.get('main').currentUser = {
        type: 'google',
        email: 'auction-audit@example.invalid'
      }
    })
    await page.getByRole('button', { name: '確認出價', exact: true }).waitFor()
    await page.getByLabel('出價金額', { exact: true }).fill('500')
    const vm = (name) =>
      page.evaluate((n) => {
        let c = document.querySelector('.btn-bid,.auction-page').__vueParentComponent
        while (c && !c.setupState.currentAuction) c = c.parent
        if (!c) throw Error('找不到本地測試元件')
        window.auditVM = c.setupState
        if (n === 'refresh') {
          window.auditRefresh = c.setupState.refreshAuction()
          return
        }
        return {
          highest: c.setupState.highestBidAmount,
          end: c.setupState.currentAuction?.end_time,
          minimum: c.setupState.minNextBid
        }
      }, name)
    const snapshot = async () => ({
      price: await page.locator('.highest-price').innerText(),
      input: await page.getByLabel('出價金額', { exact: true }).inputValue(),
      bidButton: await page.locator('.btn-bid').innerText(),
      loginButtons: await page.getByRole('button', { name: 'Google 登入', exact: true }).count(),
      posts: state.posts,
      alerts: [...state.alerts],
      vm: await vm('read')
    })
    return { context, page, state, vm, snapshot }
  }
  async function run(name, fn) {
    try {
      output.push({ name, ...(await fn()) })
    } catch (e) {
      output.push({ name, error: e.message })
    }
    console.log(name, JSON.stringify(output.at(-1)))
  }

  const settle = async (t) => {
    await t.page.waitForFunction(
      () => document.querySelector('.btn-bid')?.textContent !== '處理中...'
    )
    await wait(150)
  }
  const receipt = (t) => ({
    bid: t.state.bids.at(-1),
    auction: { id, end_time: t.state.auction.end_time },
    extended: false
  })
  try {
    await run('較舊出價查詢不得蓋掉已成立出價', async () => {
      const t = await create()
      try {
        const gate = deferred()
        t.state.holdBids = gate
        await t.vm('refresh')
        while (!gate.started) await wait(20)
        t.state.postHandler = async (r) => {
          t.state.bids.push({ id: 'NEW', auction_id: id, amount: 500 })
          await r.fulfill({ json: receipt(t) })
        }
        await t.page.locator('.btn-bid').click()
        await settle(t)
        gate.release()
        await wait(100)
        assert.match(await t.page.locator('.highest-price').innerText(), /500/)
        assert.equal(await t.page.getByLabel('出價金額', { exact: true }).inputValue(), '500')
        return { pass: true }
      } finally {
        await t.context.close()
      }
    })
    await run('較舊場次查詢不得蓋掉延長時間', async () => {
      const t = await create({ nearEnd: true })
      try {
        const gate = deferred()
        t.state.holdMeta = gate
        await t.vm('refresh')
        while (!gate.started) await wait(20)
        const end = new Date(Date.parse(t.state.auction.end_time) + 180000).toISOString()
        t.state.postHandler = async (r) => {
          t.state.auction.end_time = end
          t.state.bids.push({ id: 'EXT', auction_id: id, amount: 500 })
          await r.fulfill({ json: receipt(t) })
        }
        await t.page.locator('.btn-bid').click()
        await settle(t)
        gate.release()
        await wait(100)
        assert.equal((await t.vm('read')).end, end)
        return { pass: true }
      } finally {
        await t.context.close()
      }
    })
    await run('背景更新不修改使用者輸入的金額', async () => {
      const t = await create()
      try {
        t.state.bids.push({ id: 'OTHER', auction_id: id, amount: 800 })
        await t.vm('refresh')
        await t.page.waitForFunction(() =>
          document.querySelector('.highest-price')?.textContent.includes('800')
        )
        assert.equal(await t.page.getByLabel('出價金額', { exact: true }).inputValue(), '500')
        await t.page.locator('.btn-bid').click()
        assert.equal(t.state.posts, 0)
        return { pass: true }
      } finally {
        await t.context.close()
      }
    })
    await run('回應遺失後沿用相同編號與金額重試', async () => {
      const t = await create()
      try {
        let first
        t.state.postHandler = async (r) => {
          const body = r.request().postDataJSON()
          if (!first) {
            first = body
            t.state.bids.push({ id: 'ACCEPTED', auction_id: id, amount: 500 })
            return r.abort('failed')
          }
          assert.deepEqual(body, first)
          return r.fulfill({ json: receipt(t) })
        }
        await t.page.locator('.btn-bid').click()
        await settle(t)
        assert.match(await t.page.locator('.btn-bid').innerText(), /重試同一筆/)
        await t.page.locator('.btn-bid').click()
        await settle(t)
        assert.equal(t.state.posts, 2)
        assert.equal(t.state.bids.length, 2)
        assert.ok(t.state.alerts.some((x) => x.includes('出價成功')))
        return { pass: true }
      } finally {
        await t.context.close()
      }
    })
    await run('空成功回應不得顯示成功', async () => {
      const t = await create()
      try {
        t.state.postHandler = (r) => r.fulfill({ json: {} })
        await t.page.locator('.btn-bid').click()
        await settle(t)
        assert.ok(!t.state.alerts.some((x) => x.includes('出價成功')))
        assert.match(await t.page.locator('.btn-bid').innerText(), /重試同一筆/)
        return { pass: true }
      } finally {
        await t.context.close()
      }
    })
    await run('401後提供重新登入而非重複失敗', async () => {
      const t = await create()
      try {
        t.state.postHandler = (r) =>
          r.fulfill({
            status: 401,
            json: { message: '請重新登入', data: { outcome: 'not_submitted' } }
          })
        await t.page.locator('.btn-bid').click()
        await t.page.getByRole('button', { name: 'Google 登入', exact: true }).waitFor()
        assert.equal(t.state.posts, 1)
        return { pass: true }
      } finally {
        await t.context.close()
      }
    })
    await run('明確結標拒絕後立即更新場次狀態', async () => {
      const t = await create()
      try {
        t.state.postHandler = (r) => {
          t.state.auction.status = 'ended'
          return r.fulfill({
            status: 400,
            json: { message: '已結標', data: { outcome: 'rejected' } }
          })
        }
        await t.page.locator('.btn-bid').click()
        await t.page.locator('.action-box.ended').waitFor()
        return { pass: true }
      } finally {
        await t.context.close()
      }
    })
    await run('重複點擊只送一筆請求', async () => {
      const t = await create()
      try {
        const gate = deferred()
        t.state.postHandler = async (r) => {
          await gate.promise
          t.state.bids.push({ id: 'ONCE', auction_id: id, amount: 500 })
          return r.fulfill({ json: receipt(t) })
        }
        await t.page.evaluate(() => {
          const b = document.querySelector('.btn-bid')
          b.click()
          b.click()
        })
        while (!t.state.posts) await wait(20)
        assert.equal(t.state.posts, 1)
        gate.release()
        await settle(t)
        return { pass: true }
      } finally {
        await t.context.close()
      }
    })
    await run('小數金額清楚阻擋且不呼叫API', async () => {
      const t = await create()
      try {
        await t.page.getByLabel('出價金額', { exact: true }).fill('500.5')
        await t.page.locator('.btn-bid').click()
        assert.equal(t.state.posts, 0)
        assert.match(t.state.alerts.at(-1), /正整數/)
        return { pass: true }
      } finally {
        await t.context.close()
      }
    })
    await run('十五個Unicode暱稱可完整輸入', async () => {
      const t = await create()
      try {
        const name = '🦎'.repeat(15)
        await t.page.getByLabel('自訂顯示暱稱', { exact: true }).fill(name)
        assert.equal(await t.page.getByLabel('自訂顯示暱稱', { exact: true }).inputValue(), name)
        return { pass: true }
      } finally {
        await t.context.close()
      }
    })

    await run('取消確認不送出也不留下待確認請求', async () => {
      const t = await create()
      try {
        t.page.removeAllListeners('dialog')
        t.page.on('dialog', (d) => d.dismiss())
        await t.page.locator('.btn-bid').click()
        assert.equal(t.state.posts, 0)
        assert.equal(
          await t.page.evaluate(
            () =>
              Object.keys(sessionStorage).filter((x) => x.startsWith('auction-bid-request:')).length
          ),
          0
        )
        return { pass: true }
      } finally {
        await t.context.close()
      }
    })
    await run('場次結束後仍可重試原請求確認回執', async () => {
      const t = await create()
      try {
        let first
        t.state.postHandler = async (r) => {
          const body = r.request().postDataJSON()
          if (!first) {
            first = body
            t.state.bids.push({ id: 'ACCEPTED-CLOSED', auction_id: id, amount: 500 })
            t.state.auction.status = 'ended'
            return r.abort('failed')
          }
          assert.deepEqual(body, first)
          return r.fulfill({ json: receipt(t) })
        }
        await t.page.locator('.btn-bid').click()
        await settle(t)
        await t.page.getByRole('button', { name: '重試同一筆出價', exact: true }).click()
        await t.page.locator('.action-box.ended').waitFor()
        assert.ok(t.state.alerts.some((x) => x.includes('出價成功')))
        return { pass: true }
      } finally {
        await t.context.close()
      }
    })
    await run('重新整理及登入稍晚恢復仍沿用同筆請求', async () => {
      const t = await create()
      try {
        let first
        t.state.postHandler = async (r) => {
          const body = r.request().postDataJSON()
          if (!first) {
            first = body
            t.state.bids.push({ id: 'RECOVERED', auction_id: id, amount: 500 })
            return r.abort('failed')
          }
          assert.deepEqual(body, first)
          return r.fulfill({ json: receipt(t) })
        }
        await t.page.locator('.btn-bid').click()
        await settle(t)
        await t.page.reload({ waitUntil: 'domcontentloaded' })
        await t.page.getByRole('button', { name: 'Google 登入', exact: true }).waitFor()
        await t.page.waitForFunction(
          () =>
            !!document
              .querySelector('#__nuxt')
              ?.__vue_app__?.config.globalProperties.$pinia?._s.get('main')
        )
        await t.page.evaluate(() => {
          document
            .querySelector('#__nuxt')
            .__vue_app__.config.globalProperties.$pinia._s.get('main').currentUser = {
            type: 'google',
            email: 'auction-audit@example.invalid'
          }
        })
        await t.page.getByRole('button', { name: '重試同一筆出價', exact: true }).click()
        await settle(t)
        assert.ok(t.state.alerts.some((x) => x.includes('出價成功')))
        assert.equal(
          await t.page.evaluate(
            () =>
              Object.keys(sessionStorage).filter((x) => x.startsWith('auction-bid-request:')).length
          ),
          0
        )
        return { pass: true }
      } finally {
        await t.context.close()
      }
    })
    await run('手機表單不超出畫面且暱稱可觸控輸入', async () => {
      const t = await create()
      try {
        await t.page.setViewportSize({ width: 390, height: 844 })
        const input = t.page.getByLabel('自訂顯示暱稱', { exact: true })
        const box = await input.boundingBox()
        assert.ok(box.height >= 44)
        assert.ok(await input.evaluate((e) => parseFloat(getComputedStyle(e).fontSize) >= 16))
        assert.ok(await t.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        await t.page.screenshot({ path: 'output/auction-bid-safety-mobile.png', fullPage: true })
        return { pass: true }
      } finally {
        await t.context.close()
      }
    })
  } finally {
    await browser.close()
    assert.deepEqual(
      output.filter((x) => !x.pass),
      []
    )
  }
})
