export function hospitalMatchesQuery(values: unknown[], query: string) {
  const normalize = (value: unknown) =>
    String(value || '')
      .normalize('NFKC')
      .toLocaleLowerCase('zh-TW')
      .replace(/臺/g, '台')
  const fields = values.map(normalize)
  return normalize(query)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => fields.some((field) => field.includes(word)))
}
