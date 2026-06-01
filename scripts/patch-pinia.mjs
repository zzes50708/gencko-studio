import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'pathe'

const piniaMjsPath = resolve('node_modules/pinia/dist/pinia.mjs')

const before = '!isPlainObject(obj) || !obj.hasOwnProperty(skipHydrateSymbol)'
const after = '!isPlainObject(obj) || !Object.prototype.hasOwnProperty.call(obj, skipHydrateSymbol)'

async function main() {
  let content
  try {
    content = await readFile(piniaMjsPath, 'utf8')
  } catch (e) {
    console.error(`[patch-pinia] 找不到檔案：${piniaMjsPath}`)
    console.error(e)
    process.exit(0)
  }

  if (content.includes(after)) {
    console.log('[patch-pinia] 已套用過，略過')
    return
  }

  if (!content.includes(before)) {
    console.warn('[patch-pinia] 未找到預期片段，未修改（可能 Pinia 已更新）')
    return
  }

  content = content.replace(before, after)
  await writeFile(piniaMjsPath, content, 'utf8')
  console.log('[patch-pinia] 已套用 shouldHydrate 修補')
}

main()

