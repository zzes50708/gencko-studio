import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

const scriptPath = fileURLToPath(new URL('../scripts/patch-pinia.mjs', import.meta.url))
const before = '!isPlainObject(obj) || !obj.hasOwnProperty(skipHydrateSymbol)'
const after = '!isPlainObject(obj) || !Object.prototype.hasOwnProperty.call(obj, skipHydrateSymbol)'
const fixtureRoots = []

const createFixture = ({ includeProductionBundle = true } = {}) => {
  const root = mkdtempSync(join(tmpdir(), 'gencko-pinia-patch-'))
  fixtureRoots.push(root)
  const developmentPath = join(root, 'node_modules/pinia/dist/pinia.mjs')
  const productionPath = join(root, 'node_modules/pinia/dist/pinia.prod.cjs')
  mkdirSync(dirname(developmentPath), { recursive: true })
  writeFileSync(developmentPath, before)
  if (includeProductionBundle) writeFileSync(productionPath, before)
  return { root, developmentPath, productionPath }
}

afterEach(() => {
  for (const root of fixtureRoots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('Pinia hydration patch', () => {
  it('修補 development 與 production bundle', () => {
    const fixture = createFixture()
    execFileSync(process.execPath, [scriptPath], { cwd: fixture.root })

    expect(readFileSync(fixture.developmentPath, 'utf8')).toBe(after)
    expect(readFileSync(fixture.productionPath, 'utf8')).toBe(after)
  })

  it('缺少 production bundle 時中止，避免安裝成功但 SSR 修補失效', () => {
    const fixture = createFixture({ includeProductionBundle: false })

    expect(() =>
      execFileSync(process.execPath, [scriptPath], { cwd: fixture.root, stdio: 'pipe' })
    ).toThrow()
  })
})
