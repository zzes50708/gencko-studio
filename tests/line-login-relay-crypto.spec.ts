import { it, expect } from 'vitest'
import { codeCipher, validFlow, validProof } from '../supabase/functions/_shared/line-login-relay'

it('短效碼加密綁定場景；錯誤金鑰或其他流程無法解密', async () => {
  const cipher = await codeCipher('SERVER_ONLY_TEST_KEY')
  const encoded = await cipher.seal('AUTHORIZATION_CODE', 'flow-one')
  expect(encoded).not.toContain('AUTHORIZATION_CODE')
  expect(await cipher.open(encoded, 'flow-one')).toBe('AUTHORIZATION_CODE')
  await expect(cipher.open(encoded, 'flow-two')).rejects.toThrow()
  await expect((await codeCipher('OTHER_KEY')).open(encoded, 'flow-one')).rejects.toThrow()
})
it('流程識別與發起端秘密嚴格限制格式', () => {
  expect(validFlow(crypto.randomUUID())).toBe(true)
  expect(validFlow('arbitrary')).toBe(false)
  expect(validProof('a'.repeat(64))).toBe(true)
  expect(validProof('a'.repeat(63))).toBe(false)
  expect(validProof(['a'.repeat(64)])).toBe(false)
})
