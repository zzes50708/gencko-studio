import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'pathe'

const piniaPaths = [
  resolve('node_modules/pinia/dist/pinia.mjs'),
  resolve('node_modules/pinia/dist/pinia.prod.cjs')
]

const before = '!isPlainObject(obj) || !obj.hasOwnProperty(skipHydrateSymbol)'
const after = '!isPlainObject(obj) || !Object.prototype.hasOwnProperty.call(obj, skipHydrateSymbol)'

async function main() {
  let patched = 0

  for (const piniaPath of piniaPaths) {
    let content
    try {
      content = await readFile(piniaPath, 'utf8')
    } catch (e) {
      throw new Error(`[patch-pinia] 找不到必要檔案：${piniaPath}`, { cause: e })
    }

    if (content.includes(after)) continue

    if (!content.includes(before)) {
      throw new Error(`[patch-pinia] 未找到可驗證的 shouldHydrate 片段：${piniaPath}`)
    }

    await writeFile(piniaPath, content.replace(before, after), 'utf8')
    patched += 1
  }

  console.log(`[patch-pinia] shouldHydrate 修補完成，更新 ${patched} 個 bundle`)
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
