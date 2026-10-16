// 僅建立HTTP(S)連結，原始文字仍交由Vue跳脫，不使用v-html。
export function sourceSegments(value) {
  const source = String(value || '')
  const parts = []
  let cursor = 0
  for (const match of source.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    const url = match[0].replace(/[。，；、）)\]}.]+$/u, '')
    try {
      const parsed = new URL(url)
      if (!['http:', 'https:'].includes(parsed.protocol)) continue
    } catch {
      continue
    }
    if (match.index > cursor) parts.push({ text: source.slice(cursor, match.index) })
    parts.push({ text: url, href: url })
    cursor = match.index + url.length
  }
  if (cursor < source.length) parts.push({ text: source.slice(cursor) })
  return parts
}
