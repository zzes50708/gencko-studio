const idPattern = /^[\p{L}\p{N}_-]{1,64}$/u
const ids = (value: unknown): string[] => {
  if (
    !Array.isArray(value) ||
    value.length > 2000 ||
    value.some((id) => typeof id !== 'string' || !idPattern.test(id))
  )
    throw new Error('收藏檔案中的編號格式不正確。')
  return [...new Set(value)]
}
export function parseFavoritesBackup(text: string) {
  if (text.length > 300000) throw new Error('收藏檔案太大。')
  const value = JSON.parse(text)
  if (value?.format !== 'gencko-favorites' || value.version !== 1)
    throw new Error('請選擇 Gencko 匯出的收藏檔案。')
  return { animals: ids(value.animals), hospitals: ids(value.hospitals) }
}
export function favoritesBackup(animals: string[], hospitals: string[]) {
  return JSON.stringify(
    { format: 'gencko-favorites', version: 1, animals: ids(animals), hospitals: ids(hospitals) },
    null,
    2
  )
}
