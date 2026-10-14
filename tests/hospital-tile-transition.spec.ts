import { expect, it, vi } from 'vitest'
import { Box3, Group } from 'three'
import { HospitalTileLayer } from '../utils/hospitalTileLayer'

it('換圖磚時舊畫面保留至新視野完成，下載失敗亦不清空畫面', async () => {
  const layer = new HospitalTileLayer(() => {})
  const internals = layer as any
  internals.fetchTile = vi.fn(async () => new ArrayBuffer(0))
  internals.parse = vi.fn(async () => ({}))
  internals.build = vi.fn(async () => ({
    group: new Group(),
    count: 1,
    places: [],
    bounds: new Box3(),
    heights: [],
    lastUsed: 0
  }))
  const first = { west: 121.5601, east: 121.5602, south: 25.0301, north: 25.0302 }
  const second = { west: 120.3001, east: 120.3002, south: 22.6301, north: 22.6302 }
  await layer.update(first, true)
  const oldGroups = layer.root.children.filter((group) => group.visible)
  let finish!: (value: ArrayBuffer) => void
  internals.fetchTile = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const updating = layer.update(second, true)
  expect(oldGroups.every((group) => group.visible)).toBe(true)
  finish(new ArrayBuffer(0))
  await updating
  expect(oldGroups.every((group) => !group.visible)).toBe(true)
  const current = layer.root.children.filter((group) => group.visible)
  internals.fetchTile = vi.fn(async () => {
    throw new Error('下載失敗')
  })
  await layer.update({ west: 119.8, east: 119.8001, south: 23.1, north: 23.1001 }, true)
  expect(current.every((group) => group.visible)).toBe(true)
  layer.dispose()
})

function createMockLayer() {
  const status = vi.fn()
  const layer = new HospitalTileLayer(status)
  const internals = layer as any
  internals.fetchTile = vi.fn(async () => new ArrayBuffer(0))
  internals.parse = vi.fn(async () => ({}))
  internals.build = vi.fn(async () => ({
    group: new Group(),
    count: 1,
    places: [],
    bounds: new Box3(),
    heights: [],
    lastUsed: 0
  }))
  return { layer, internals, status }
}

it('連續部分下載失敗不會讓可見圖磚與快取無限累積', async () => {
  const { layer, internals } = createMockLayer()
  let attempts = 0
  internals.fetchTile = vi.fn(async () => {
    if (++attempts % 3 === 0) throw new Error('部分失敗')
    return new ArrayBuffer(0)
  })
  for (let i = 0; i < 12; i++)
    await layer.update(
      { west: 120 + i * 0.06, east: 120.05 + i * 0.06, south: 23, north: 23.03 },
      true
    )
  expect(internals.cache.size).toBeLessThanOrEqual(32)
  expect(layer.root.children.filter((group) => group.visible).length).toBeLessThanOrEqual(32)
  layer.dispose()
})

it('重返已載入區域時立即顯示快取，不等待鄰近新圖磚', async () => {
  const { layer, internals } = createMockLayer()
  await layer.update({ west: 121.5601, east: 121.5602, south: 25.0301, north: 25.0302 }, true)
  const cached = layer.root.children[0]!
  await layer.update({ west: 120.3001, east: 120.3002, south: 22.6301, north: 22.6302 }, true)
  expect(cached.visible).toBe(false)
  const finish: (() => void)[] = []
  internals.fetchTile = vi.fn(
    () => new Promise<ArrayBuffer>((resolve) => finish.push(() => resolve(new ArrayBuffer(0))))
  )
  const pending = layer.update({ west: 121.55, east: 121.59, south: 25.03, north: 25.04 }, true)
  expect(cached.visible).toBe(true)
  layer.suspend()
  finish.forEach((resolve) => resolve())
  await pending
  layer.dispose()
})

it('第一張圖磚完成即呈現，不等待其餘慢速圖磚', async () => {
  const { layer, internals, status } = createMockLayer()
  const makeEntry = () => ({
    group: new Group(),
    count: 1,
    places: [],
    bounds: new Box3(),
    heights: [],
    lastUsed: 0
  })
  const finish: (() => void)[] = []
  let calls = 0,
    show!: () => void
  const shown = new Promise<void>((resolve) => {
    show = resolve
  })
  status.mockImplementation((value) => {
    if (value.count > 0 && value.loading) show()
  })
  internals.build = vi.fn(async () => {
    if (++calls === 1) return makeEntry()
    await new Promise<void>((resolve) => finish.push(resolve))
    return makeEntry()
  })
  const pending = layer.update({ west: 121.55, east: 121.59, south: 25.03, north: 25.04 }, true)
  await shown
  expect(layer.root.children.some((group) => group.visible)).toBe(true)
  expect(status.mock.lastCall?.[0].loading).toBe(true)
  layer.suspend()
  finish.forEach((resolve) => resolve())
  await pending
  layer.dispose()
})

it('視野超出支援範圍後取消舊下載，晚到的圖磚不得替換目前畫面', async () => {
  const { layer, internals } = createMockLayer()
  await layer.update({ west: 121.5601, east: 121.5602, south: 25.0301, north: 25.0302 }, true)
  const old = layer.root.children.filter((group) => group.visible)
  let finish!: (value: ArrayBuffer) => void
  internals.fetchTile = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const pending = layer.update(
    { west: 120.3001, east: 120.3002, south: 22.6301, north: 22.6302 },
    true
  )
  await layer.update({ west: 126, east: 127, south: 25, north: 26 }, true)
  finish(new ArrayBuffer(0))
  await pending
  expect(old.every((group) => group.visible)).toBe(true)
  expect(layer.root.children.filter((group) => group.visible)).toEqual(old)
  layer.dispose()
})

it('首次部分下載失敗時仍顯示已成功載入的建築，並可重試補齊', async () => {
  const { layer, internals, status } = createMockLayer()
  const bounds = { west: 121.55, east: 121.59, south: 25.03, north: 25.04 }
  internals.fetchTile.mockRejectedValueOnce(new Error('單一圖磚失敗'))
  await layer.update(bounds, true)
  expect(status.mock.lastCall?.[0].failed).toBe(true)
  expect(layer.root.children.some((group) => group.visible)).toBe(true)
  layer.retry()
  await layer.update(bounds, true)
  expect(status.mock.lastCall?.[0].failed).toBe(false)
  expect(layer.root.children.every((group) => group.visible)).toBe(true)
  layer.dispose()
})

it('暫停後回全台視角會清除街區建築，不留下舊圖磚', async () => {
  const { layer, status } = createMockLayer()
  await layer.update({ west: 121.5601, east: 121.5602, south: 25.0301, north: 25.0302 }, true)
  layer.suspend()
  await layer.update(null, false)
  expect(layer.root.children.every((group) => !group.visible)).toBe(true)
  expect(status.mock.lastCall?.[0].count).toBe(0)
  expect(status.mock.lastCall?.[0].enabled).toBe(false)
  layer.dispose()
})

it('視野超出支援範圍時保留建築，真正關閉街區才清空', async () => {
  const { layer, status } = createMockLayer()
  await layer.update({ west: 121.5601, east: 121.5602, south: 25.0301, north: 25.0302 }, true)
  const groups = layer.root.children.filter((group) => group.visible)
  await layer.update({ west: 126, east: 127, south: 25, north: 26 }, true)
  expect(groups.every((group) => group.visible)).toBe(true)
  expect(status.mock.lastCall?.[0].count).toBeGreaterThan(0)
  await layer.update(null, false)
  expect(groups.every((group) => !group.visible)).toBe(true)
  layer.dispose()
})
