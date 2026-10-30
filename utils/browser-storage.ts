export function readStoredJson(storage: Pick<Storage, 'getItem' | 'removeItem'>, key: string) {
  try {
    const value = storage.getItem(key)
    return value ? JSON.parse(value) : null
  } catch {
    try {
      storage.removeItem(key)
    } catch {
      /* 儲存被拒絕時使用記憶體狀態。 */
    }
    return null
  }
}
