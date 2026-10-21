import { expect, it } from 'vitest'
import { lineLoginOptions, createAuthSessionReader } from '../utils/line-login'
const deferred = () => {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}
it('只有 Android 安裝版停用 LINE 原生自動登入，一般瀏覽器保留原流程', () => {
  expect(
    lineLoginOptions('https://example.invalid/auction/TEST', { android: true, standalone: true })
  ).toEqual({
    redirectTo: 'https://example.invalid/auction/TEST',
    queryParams: { disable_auto_login: 'true' }
  })
  for (const options of [{}, { android: true }, { standalone: true }])
    expect(lineLoginOptions('https://example.invalid/profile', options).queryParams).toBeUndefined()
})
it('回程不攜帶舊 OAuth 憑證或錯誤，保留原本篩選與錨點', () => {
  expect(
    lineLoginOptions(
      'https://example.invalid/auction/TEST?code=old&state=old&filter=active#error=old'
    ).redirectTo
  ).toBe('https://example.invalid/auction/TEST?filter=active')
  expect(
    lineLoginOptions('https://example.invalid/profile?error=denied&error_description=secret#bids')
      .redirectTo
  ).toBe('https://example.invalid/profile#bids')
  expect(
    lineLoginOptions('https://example.invalid/profile#token_type=bearer&access_token=secret')
      .redirectTo
  ).toBe('https://example.invalid/profile')
})
it('舊未登入回應不能蓋掉剛完成的登入', async () => {
  const gate = deferred()
  const sessions = []
  const reader = createAuthSessionReader({ getSession: () => gate.promise }, (v) =>
    sessions.push(v)
  )
  const read = reader.read()
  reader.accept({ user: { id: 'LINE' } })
  gate.resolve({ data: { session: null }, error: null })
  await read
  expect(sessions).toEqual([{ user: { id: 'LINE' } }])
})
it('登出使在途讀取失效，不能被舊工作階段重新登入', async () => {
  const gate = deferred()
  const sessions = []
  const reader = createAuthSessionReader({ getSession: () => gate.promise }, (v) =>
    sessions.push(v)
  )
  const read = reader.read()
  reader.invalidate()
  gate.resolve({ data: { session: { user: { id: 'OLD' } } }, error: null })
  await read
  expect(sessions).toEqual([])
})
it('較新查核結果優先，網路故障不清除已確認登入', async () => {
  const gate = deferred()
  let calls = 0
  const sessions = []
  const reader = createAuthSessionReader(
    {
      getSession: () =>
        ++calls === 1
          ? gate.promise
          : Promise.resolve({ data: { session: { user: { id: 'NEW' } } }, error: null })
    },
    (v) => sessions.push(v)
  )
  const old = reader.read()
  await reader.read()
  gate.resolve({ data: { session: null }, error: null })
  await old
  expect(sessions).toEqual([{ user: { id: 'NEW' } }])
  await createAuthSessionReader(
    {
      getSession: async () => {
        throw Error('offline')
      }
    },
    (v) => sessions.push(v)
  ).read()
  expect(sessions).toHaveLength(1)
})
