import { expect, it } from 'vitest'
import { signOutCurrentDevice } from '../utils/line-login'
it('只登出目前裝置，成功後才清除會員', async () => {
  let options,
    cleared = 0
  await signOutCurrentDevice(
    {
      signOut: async (v) => {
        options = v
        return { error: null }
      }
    },
    () => cleared++
  )
  expect(options).toEqual({ scope: 'local' })
  expect(cleared).toBe(1)
})
it('登出錯誤不可假裝成功清除會員', async () => {
  let cleared = false
  await expect(
    signOutCurrentDevice({ signOut: async () => ({ error: Error('offline') }) }, () => {
      cleared = true
    })
  ).rejects.toThrow('offline')
  expect(cleared).toBe(false)
})
