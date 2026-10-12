import { test, expect } from '@playwright/test'

test('反覆切換大量壓克力配置，GPU 資源數保持穩定', async ({ page }, testInfo) => {
  test.setTimeout(120000)
  await page.addInitScript(() => {
    const records = new Map<any, { buffers: Set<any>; textures: Set<any> }>()
    ;(window as any).__cabinetGpu = records
    for (const [create, remove, key] of [
      ['createBuffer', 'deleteBuffer', 'buffers'],
      ['createTexture', 'deleteTexture', 'textures']
    ]) {
      const prototype = WebGL2RenderingContext.prototype as any
      const createOriginal = prototype[create],
        removeOriginal = prototype[remove]
      prototype[create] = function (...args: any[]) {
        if (!records.has(this)) records.set(this, { buffers: new Set(), textures: new Set() })
        const result = createOriginal.apply(this, args)
        if (result) (records.get(this) as any)[key].add(result)
        return result
      }
      prototype[remove] = function (value: any) {
        ;(records.get(this) as any)?.[key].delete(value)
        return removeOriginal.call(this, value)
      }
    }
  })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/merch')
  await expect(page.locator('.cabinet-workspace')).toHaveAttribute('aria-busy', 'false', {
    timeout: 30000
  })
  const samples: { buffers: number; textures: number }[] = []
  for (let cycle = 0; cycle < 10; cycle++) {
    for (const boxVariant of ['acrylic-m', 'acrylic-l', 'a4']) {
      await page.locator('.cabinet-workspace').evaluate(async (el, boxVariant) => {
        let c = (el as any).__vueParentComponent
        while (c && !c.setupState.input) c = c.parent
        Object.assign(c.setupState.input, {
          boxVariant,
          rows: boxVariant === 'a4' ? 1 : 8,
          columns: boxVariant === 'a4' ? 1 : 3,
          ledLayers: boxVariant === 'a4' ? 0 : 8
        })
        await new Promise((resolve) => requestAnimationFrame(resolve))
      }, boxVariant)
      await expect(page.locator('.cabinet-workspace')).toHaveAttribute('aria-busy', 'false', {
        timeout: 30000
      })
    }
    await page.waitForTimeout(300)
    samples.push(
      await page.evaluate(
        () =>
          Array.from((window as any).__cabinetGpu.values()).reduce(
            (total: any, record: any) => ({
              buffers: total.buffers + record.buffers.size,
              textures: total.textures + record.textures.size
            }),
            { buffers: 0, textures: 0 }
          ) as any
      )
    )
  }
  await testInfo.attach('gpu-resources', {
    body: JSON.stringify(samples),
    contentType: 'application/json'
  })
  expect(samples[9].buffers).toBeLessThanOrEqual(samples[1].buffers)
  expect(samples[9].textures).toBeLessThanOrEqual(samples[1].textures)
  expect(errors).toEqual([])
})
