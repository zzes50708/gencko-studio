// 不快取頁面 HTML，避免更新後仍取得舊頁面與舊模型程式的組合。
self.addEventListener('activate', event => {
  // 僅移除舊版 API 回應快取，不清除收藏、草稿或登入資料。
  event.waitUntil(caches.delete('supabase-api-cache'))
})
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (event.request.mode !== 'navigate' || url.origin !== self.location.origin || /^\/api\//.test(url.pathname)) return
  event.respondWith(fetch(event.request).catch(async () => {
    const fallback = await caches.match('/offline.html', { ignoreSearch: true })
    return fallback || new Response('暫時無法連線，請稍後重試。', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    })
  }))
})
