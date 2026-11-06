import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMonitoringDelivery } from '../utils/monitoring-delivery'
describe('回報佇列', () => {
  afterEach(() => vi.useRealTimers())
  it('連線失敗後保留原資料，成功後不重複傳送', async () => {
    vi.useFakeTimers()
    const send = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true)
    const delivery = createMonitoringDelivery(send, () => true)
    delivery.push({ type: 'vue_error' })
    await delivery.flush()
    await vi.advanceTimersByTimeAsync(5000)
    expect(send).toHaveBeenCalledTimes(2)
    expect(send.mock.calls[1][0]).toEqual(send.mock.calls[0][0])
    await delivery.flush()
    expect(send).toHaveBeenCalledTimes(2)
    delivery.dispose()
  })
  it('離線不送、重連恢復，失敗最多三次且停止後不再送', async () => {
    vi.useFakeTimers()
    let online = false
    const send = vi.fn().mockResolvedValue(false)
    const delivery = createMonitoringDelivery(send, () => online)
    delivery.push({ type: 'vue_error' })
    await delivery.flush()
    expect(send).not.toHaveBeenCalled()
    online = true
    await delivery.flush()
    await vi.advanceTimersByTimeAsync(30000)
    expect(send).toHaveBeenCalledTimes(3)
    delivery.dispose()
    await vi.runAllTimersAsync()
    expect(send).toHaveBeenCalledTimes(3)
  })
})
