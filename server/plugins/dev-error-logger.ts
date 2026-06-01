import { appendFile } from 'node:fs/promises'
import { defineNitroPlugin } from 'nitropack/runtime'

export default defineNitroPlugin((nitroApp) => {
  if (process.env.NODE_ENV !== 'development') return

  nitroApp.hooks.hook('error', async (error, ctx) => {
    try {
      const url = ctx?.event?.path || ctx?.event?.node?.req?.url || '(unknown)'
      const line = [
        `\n[${new Date().toISOString()}] url=${url}`,
        error?.stack || String(error),
        '\n'
      ].join('\n')
      await appendFile('dev.nitro.error.log', line, { encoding: 'utf8' })
    } catch {
      // 開發期輔助用：記錄失敗不應影響主流程
    }
  })
})

