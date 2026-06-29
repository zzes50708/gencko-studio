/**
 * 自動把文章 HTML 內出現的基因名（morph）轉成 /genes/<name> 內部連結。
 * - 每個基因名整篇最多連結一次（避免 SEO 過度錨點）
 * - 跳過 <a>/<code>/<pre>/<script>/<style>/<h1-3> 內部
 * - 長名優先比對（避免「Super Snow」被「Snow」吃掉）
 * - ASCII 名稱用 word-boundary 防止「Albino」誤抓「AlbinoX」
 *
 * @param {string} html       文章 HTML 內容
 * @param {string[]} geneNames 基因名陣列（來自 genetic_pages.name）
 * @returns {string} 處理後的 HTML
 */
const PROTECTED_TAGS = new Set(['a', 'code', 'pre', 'script', 'style', 'h1', 'h2', 'h3'])

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function autoLinkGenes(html, geneNames) {
  if (!html || !Array.isArray(geneNames) || geneNames.length === 0) return html || ''

  // ASCII 名要 >= 3（避免「OG」這種短名誤抓），CJK 名要 >= 2（守宮基因多為 2 字中文）
  const isAscii = (n) => /^[\x20-\x7E]+$/.test(n)
  const names = [
    ...new Set(
      geneNames
        .map((n) => (n == null ? '' : String(n).trim()))
        .filter((n) => (isAscii(n) ? n.length >= 3 : n.length >= 2))
    )
  ].sort((a, b) => b.length - a.length)

  if (names.length === 0) return html

  const used = new Set()
  const parts = html.split(/(<[^>]+>)/g)
  const protectStack = []

  for (let i = 0; i < parts.length; i++) {
    const tok = parts[i]
    if (!tok) continue

    if (tok[0] === '<') {
      const m = tok.match(/^<\s*(\/?)\s*([a-zA-Z0-9]+)/)
      if (m) {
        const isClose = m[1] === '/'
        const tag = m[2].toLowerCase()
        if (PROTECTED_TAGS.has(tag)) {
          if (isClose) {
            const idx = protectStack.lastIndexOf(tag)
            if (idx >= 0) protectStack.splice(idx, 1)
          } else if (!/\/\s*>$/.test(tok)) {
            protectStack.push(tag)
          }
        }
      }
      continue
    }

    if (protectStack.length > 0) continue

    let text = tok
    for (const name of names) {
      const key = name.toLowerCase()
      if (used.has(key)) continue
      const pattern = isAscii(name)
        ? `(?<![A-Za-z0-9])(${escapeRegex(name)})(?![A-Za-z0-9])`
        : `(${escapeRegex(name)})`
      const re = new RegExp(pattern, 'i')
      const matched = text.match(re)
      if (matched) {
        const href = `/genes/${encodeURIComponent(name)}`
        const safeTitle = name.replace(/"/g, '&quot;')
        text = text.replace(
          re,
          `<a class="auto-gene-link" href="${href}" title="${safeTitle} 基因介紹">${matched[1]}</a>`
        )
        used.add(key)
      }
    }
    parts[i] = text
  }

  return parts.join('')
}
