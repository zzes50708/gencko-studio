const KEY = 'gencko_line_login_pending_v1'
const TTL = 10 * 60 * 1000
const randomSecret = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
    n.toString(16).padStart(2, '0')
  ).join('')
export async function sha256(value) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))),
    (n) => n.toString(16).padStart(2, '0')
  ).join('')
}

/** 只接續原裝置持有的 PKCE 流程；伺服器不保管 verifier 或登入 Token。 */
export function createLineLoginRelay({ storage, request, auth, now = Date.now }) {
  let running
  const pending = () => {
    try {
      const flow = JSON.parse(storage.getItem(KEY) || 'null')
      if (
        !flow ||
        !/^[\da-f-]{36}$/.test(flow.id) ||
        !/^[\da-f]{64}$/.test(flow.secret) ||
        !Number.isFinite(flow.expires) ||
        flow.expires <= now() ||
        !flow.returnTo?.startsWith('/') ||
        flow.returnTo.startsWith('//')
      ) {
        storage.removeItem(KEY)
        return null
      }
      return flow
    } catch {
      return null
    }
  }
  const cancel = () => {
    try {
      storage.removeItem(KEY)
    } catch {}
  }
  const current = (flow) => pending()?.id === flow.id
  return {
    pending,
    cancel,
    attachTransfer(value) {
      const flow = pending()
      const [id, returnSecret] = String(value).trim().split('.')
      if (!flow || id !== flow.id || !/^[\da-f]{64}$/.test(returnSecret || ''))
        throw new Error('LINE_TRANSFER_INVALID')
      storage.setItem(KEY, JSON.stringify({ ...flow, returnSecret }))
    },
    async settle() {
      try {
        await running
      } catch {}
    },
    async start(href) {
      cancel()
      const url = new URL(href)
      const flow = {
        id: crypto.randomUUID(),
        secret: randomSecret(),
        expires: now() + TTL,
        returnTo: url.pathname + url.search + url.hash
      }
      // 先確認儲存可用，避免離開 App 後才發現無法接回。
      storage.setItem(KEY, JSON.stringify(flow))
      try {
        await request({ action: 'start', flow: flow.id, proof: await sha256(flow.secret) })
      } catch (error) {
        if (current(flow)) cancel()
        throw error
      }
      if (!current(flow)) throw new Error('LINE_LOGIN_CANCELLED')
      const callbackOrigin = ['genckobreeding.com', 'www.genckobreeding.com'].includes(url.hostname)
        ? 'https://www.genckobreeding.com'
        : url.origin
      return `${callbackOrigin}/api/auth/line/callback?flow=${flow.id}`
    },
    async resume() {
      if (running) return running
      const flow = pending()
      if (!flow) return null
      running = (async () => {
        const result = await request({
          action: 'read',
          flow: flow.id,
          secret: flow.secret,
          returnSecret: flow.returnSecret
        })
        if (!current(flow)) return null
        if (result.status === 'pending') return null
        if (result.status === 'needs_transfer') return { needsTransfer: true }
        if (result.status !== 'ready' || !result.code) {
          cancel()
          throw new Error('LINE_LOGIN_RESTART')
        }
        const { data, error } = await auth.exchangeCodeForSession(result.code)
        if (error || !data?.session) {
          if (!current(flow)) return null
          cancel()
          throw new Error('LINE_LOGIN_RESTART')
        }
        if (!current(flow)) return null
        cancel()
        // 交換成功後即使清理請求斷線，也不撤銷已建立的工作階段。
        try {
          await request({ action: 'ack', flow: flow.id, secret: flow.secret })
        } catch {}
        return { session: data.session, returnTo: flow.returnTo }
      })()
      try {
        return await running
      } finally {
        running = undefined
      }
    }
  }
}
