/** Android 安裝版避免 LINE 原生 App 將回程交給另一個預設瀏覽器。 */
export function lineLoginOptions(href, { android = false, standalone = false } = {}) {
  const url = new URL(href)
  for (const key of ['code', 'state', 'error', 'error_code', 'error_description'])
    url.searchParams.delete(key)
  const fragment = new URLSearchParams(url.hash.slice(1))
  if (
    ['access_token', 'refresh_token', 'provider_token', 'provider_refresh_token', 'error'].some(
      (key) => fragment.has(key)
    )
  )
    url.hash = ''
  return {
    redirectTo: url.href,
    ...(android && standalone ? { queryParams: { disable_auto_login: 'true' } } : {})
  }
}

/** 僅處理失敗回程；成功登入的 code／憑證交由驗證套件完成交換。 */
export function readOAuthFailure(href) {
  const url = new URL(href)
  const fragment = new URLSearchParams(url.hash.slice(1))
  const error = url.searchParams.get('error') || fragment.get('error')
  if (!error) return null
  return {
    url: lineLoginOptions(href).redirectTo,
    // 不顯示供應商原始描述，避免暴露內部資訊或未受信任內容。
    message:
      error === 'access_denied'
        ? '你已取消登入，尚未完成新的登入；可以再次選擇登入。'
        : '登入未完成，請重新登入；若持續失敗，請聯絡工作室。'
  }
}

/** 一般登出只處理目前裝置；失敗時不得假裝已清除工作階段。 */
export async function signOutCurrentDevice(auth, onSignedOut) {
  const { error } = await auth.signOut({ scope: 'local' })
  if (error) throw error
  onSignedOut()
}

/** 較舊的 getSession 回應不可覆蓋較新的登入、登出事件。 */
export function createAuthSessionReader(auth, onSession) {
  let revision = 0
  return {
    accept(session) {
      revision++
      onSession(session)
    },
    invalidate() {
      revision++
    },
    async read() {
      const request = ++revision
      try {
        const { data, error } = await auth.getSession()
        if (!error && request === revision) onSession(data.session)
      } catch {
        // 暫時離線不清除目前已確認的登入狀態。
      }
    }
  }
}
