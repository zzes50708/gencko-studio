import { it, expect } from 'vitest'
import { createTransferDeadline, parseLineReturnCookie } from '../utils/line-login-transfer'
const flow = 'd0000000-0000-4000-8000-000000000002',
  secret = 'b'.repeat(64)
it('新 cookie 過期即拒絕，舊 cookie 保留短暫相容且格式嚴格', () => {
  expect(parseLineReturnCookie(`${flow}.${secret}.5000`, 1000)).toMatchObject({
    flow,
    secret,
    expiresAt: 5000
  })
  expect(parseLineReturnCookie(`${flow}.${secret}.5000`, 5000)).toBeNull()
  expect(parseLineReturnCookie(`${flow}.${secret}.bad`, 1000)).toBeNull()
  expect(parseLineReturnCookie(`${flow}.${secret}.5000.extra`, 1000)).toBeNull()
  expect(parseLineReturnCookie(`${flow}.${secret}`, 1000)).toMatchObject({
    flow,
    secret,
    expiresAt: null
  })
})
it('以伺服器時間計算，不受裝置時間起點偏移，並扣除往返延遲', () => {
  let wall = 90000000,
    mono = 50
  const deadline = createTransferDeadline(
    { serverTime: 1000, expiresAt: 4000 },
    { wallNow: () => wall, monoNow: () => mono, elapsedMs: 500 }
  )
  expect(deadline.valid()).toBe(true)
  wall += 2499
  mono += 2499
  expect(deadline.valid()).toBe(true)
  wall++
  mono++
  expect(deadline.valid()).toBe(false)
})
it('手機睡眠時計時器暫停，或裝置時間倒退，也不延長接續碼期限', () => {
  let wall = 1000,
    mono = 1000
  const sleep = createTransferDeadline(
    { serverTime: 0, expiresAt: 1000 },
    { wallNow: () => wall, monoNow: () => mono }
  )
  wall += 1001
  expect(sleep.valid()).toBe(false)
  const clock = createTransferDeadline(
    { serverTime: 0, expiresAt: 1000 },
    { wallNow: () => wall, monoNow: () => mono }
  )
  wall -= 60000
  mono += 1001
  expect(clock.valid()).toBe(false)
  expect(createTransferDeadline({}).valid()).toBe(false)
})
