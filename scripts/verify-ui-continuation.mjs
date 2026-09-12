import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

// 只讀取本機畫面與執行可逆的 UI 操作，不登入或寫入遠端資料。
const finalPass = process.argv.includes('--final')
const responsivePass = process.argv.includes('--responsive')
const folder = process.env.UI_AUDIT_OUTPUT || (responsivePass ? 'output/ui-responsive-20260911' : finalPass ? 'output/ui-final-20260910' : 'output/ui-continuation-20260909')
await mkdir(folder, { recursive: true })
const browser = await chromium.launch({ headless: true })
const routes = ['/care','/health','/qs','/faq','/articles','/articles/ART-007','/genes','/genes/黑夜','/calculator','/hospital','/why-gencko','/buying-guide','/stories','/profile','/identity/S-53518']
if (finalPass || responsivePass) routes.push('/home','/shop','/product/S-53518','/compare?ids=S-53518,S-67397,S-29530','/breeders','/auction','/auction/S-41201','/merch','/merch/1','/start-here','/guide')
if (responsivePass) routes.push('/about', '/', '/hero-lab', '/compare', '/not-a-gencko-page')
const results = []
for (const width of process.env.UI_AUDIT_WIDTHS ? process.env.UI_AUDIT_WIDTHS.split(',').map(Number) : responsivePass ? [390, 1440, 320, 768, 1024, 1920] : [1440, 768, 390, 320]) {
  const context = await browser.newContext({ viewport: {width, height: 900}, isMobile: width < 768, hasTouch: width < 768 })
  await context.addInitScript(() => { try { localStorage.setItem('gencko_theme', 'light') } catch {} })
  const page = await context.newPage()
  for (const route of routes) {
    const errors = []
    const onError = e => errors.push(e.message)
    page.on('pageerror',onError)
    try {
      await page.goto('http://localhost:3000'+route,{waitUntil:'domcontentloaded',timeout:60000})
      await page.waitForTimeout(1300)
      await page.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__))
      if (responsivePass && !['/', '/hero-lab', '/about'].includes(route)) {
        // 逐段觸發圖片與章節掛載，不能只檢查首屏的空骨架。
        await page.evaluate(async () => {
          for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) {
            scrollTo(0, y)
            await new Promise(resolve => setTimeout(resolve, 50))
          }
          scrollTo(0, 0)
          await document.fonts.ready
        })
      }
      // 本機開發工具不是官網介面，截圖時排除其浮層。
      await page.addStyleTag({content:'#nuxt-devtools-container { display: none !important; }'})
      const layout = await page.evaluate(() => ({
        title: document.querySelector('h1')?.textContent?.trim(),
        overflow: document.documentElement.scrollWidth > innerWidth + 2,
        oversized: [...document.querySelectorAll('main *')].filter(el=>{const r=el.getBoundingClientRect(); const s=getComputedStyle(el); return r.width>0 && (r.right>innerWidth+3 || r.left < -3) && s.position!=='fixed' && s.visibility!=='hidden'}).slice(0,8).map(el=>el.className)
      }))
      if(width===1440 || width===390) await page.screenshot({path:folder+'/'+width+'-'+encodeURIComponent(route)+'.png', fullPage: responsivePass && !['/', '/hero-lab', '/about'].includes(route)})
      results.push({width,route,...layout,errors})
      console.log(JSON.stringify({width,route,...layout,errors}))
    } catch(e) { results.push({width,route,error:e.message}); console.log('ERROR '+width+' '+route+' '+e.message) }
    page.off('pageerror',onError)
  }
  await context.close()
}
await writeFile(folder+'/layout.json',JSON.stringify(results,null,2))
await browser.close()
if(results.some(result => result.error || result.overflow || result.errors?.length)) process.exitCode=1
