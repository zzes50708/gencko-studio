import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { chromium } from 'playwright'

const entry = process.argv[2] || 'output/auction-round4-build/production/server/index.mjs'
if (!existsSync(entry)) throw Error('請先完成隔離正式建置')
const auction = {id:'ISOLATED-SSR',morph:'隔離SSR測試',status:'active',start_price:100,min_increment:100,end_time:'2035-01-01T00:00:00Z',images:[]}
let bids = [{id:'B1',auction_id:auction.id,user_name:'測試',amount:400,bid_time:'2026-10-20T00:00:00Z'}]
let failBids = false
const backend = createServer((req,res) => {
  res.setHeader('content-type','application/json')
  const url = new URL(req.url,'http://fixture.invalid')
  if (url.pathname.endsWith('/auctions')) res.end(JSON.stringify(url.searchParams.has('id') ? auction : [auction]))
  else if (url.pathname.endsWith('/auction_bids')) {
    if(failBids) {res.statusCode=400;res.end(JSON.stringify({message:'隔離故障'}))}
    else res.end(JSON.stringify(bids))
  } else res.end('[]')
})
await new Promise(r=>backend.listen(0,'127.0.0.1',r))
const port = 42863
const root = `http://127.0.0.1:${port}`
const child = spawn(process.execPath,[entry],{env:{...process.env,PORT:String(port),HOST:'127.0.0.1',NUXT_PUBLIC_SUPABASE_URL:`http://127.0.0.1:${backend.address().port}`,NUXT_PUBLIC_SUPABASE_KEY:'isolated-test-only'},stdio:['ignore','pipe','pipe'],windowsHide:true})
const exited = new Promise(resolve => { child.once('close',resolve); child.once('error',resolve) })
let diagnostics = ''
let browser
child.stdout.on('data',chunk=>{diagnostics=(diagnostics+chunk).slice(-2000)})
child.stderr.on('data',chunk=>{diagnostics=(diagnostics+chunk).slice(-2000)})
try {
  let ready = false
  for (let attempt=0;attempt<100;attempt++) {
    try {const response=await fetch(root+'/api/server-time');if(response.ok){ready=true;break}} catch {}
    await new Promise(r=>setTimeout(r,200))
  }
  assert.ok(ready,`隔離伺服器未啟動：${diagnostics}`)
  browser = await chromium.launch({headless:true})
  // 對照組確認瀏覽器確實會執行未轉義 JSON-LD 跳出的腳本；不能只比對 HTML 字串。
  const control = await browser.newPage()
  await control.setContent('<script type="application/ld+json">'+JSON.stringify({description:'</script><script>globalThis.__auction_injected=true</script>'})+'</script>')
  assert.equal(await control.evaluate(() => globalThis.__auction_injected),true)
  await control.close()
  const noExecution = async (html) => {
    const page = await browser.newPage()
    try {
      await page.route('**/*', route => route.abort())
      await page.setContent(html,{waitUntil:'domcontentloaded'})
      assert.equal(await page.evaluate(() => globalThis.__auction_injected || globalThis.__auction_name_injected),undefined,'SSR 資料不得成為可執行腳本')
      for (const json of await page.locator('script[type="application/ld+json"]').allTextContents()) JSON.parse(json)
    } finally { await page.close() }
  }
  const read = async () => {
    const response = await fetch(root+'/auction/'+auction.id)
    assert.equal(response.status,200)
    return response.text()
  }
  let html = await read()
  assert.match(html,/<title>[^<]*目前最高 NT\$400/)
  assert.match(html,/property="product:price:amount"[^>]*content="400"/)
  bids=[]
  html=await read()
  assert.match(html,/<title>[^<]*尚無出價，起標 NT\$100/)
  failBids=true
  html=await read()
  assert.doesNotMatch(html,/<title>[^<]*目前最高/)
  assert.doesNotMatch(html,/property="product:price:amount"/)
  failBids=false
  auction.status='ended'
  html=await read()
  assert.match(html,/<title>[^<]*已結標/)
  assert.match(html,/name="robots"[^>]*noindex/)
  auction.note='</script><script>globalThis.__auction_injected=true</script>'
  html=await read()
  await noExecution(html)
  auction.status='active'
  auction.morph='</script><script>globalThis.__auction_name_injected=true</script>'
  html=await (await fetch(root+'/auction')).text()
  await noExecution(html)
  console.log('SSR 六項隔離驗證通過：最高價、無出價、故障不捏造價格、結標禁止索引、詳情及列表不能注入腳本')
} finally {
  if (browser) await browser.close()
  child.kill()
  await exited
  await new Promise(r=>backend.close(r))
}
