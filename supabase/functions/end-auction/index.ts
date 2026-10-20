// 舊入口已停用；結標統一由 auction-workflow 與資料庫交易處理。
// 即使誤部署此檔，也不能繞過得標結算或將成交個體重新上架。
Deno.serve(() =>
  new Response(JSON.stringify({ error: '此結標入口已停用' }), {
    status: 410,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  })
)
