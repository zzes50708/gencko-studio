// 區分尚未完成、真正不存在與暫時查詢失敗，避免將故障當作404。
export function contentResponseState(pending, data, error) {
  if (pending) return { status: 200, robots: 'noindex, nofollow' }
  if (error) return { status: 503, robots: 'noindex, nofollow' }
  if (!data) return { status: 404, robots: 'noindex, nofollow' }
  return {
    status: 200,
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
  }
}
