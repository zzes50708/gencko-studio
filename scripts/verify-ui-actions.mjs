import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const folder = 'output/ui-continuation-actions-20260909'
await mkdir(folder, {recursive:true})
const browser = await chromium.launch({headless:true})
const results=[]
for(const width of (process.argv.includes('--desktop') ? [1440] : [1440,390,320])) {
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<768,hasTouch:width<768})
  await context.addInitScript(()=>localStorage.setItem('gencko_theme','light'))
  const page=await context.newPage()
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  const visit=async route=>{
    await page.goto('http://localhost:3000'+route,{waitUntil:'domcontentloaded'})
    await page.waitForTimeout(1000)
  }
  const capture=async name=>{
    // 等候結果進場動畫結束，避免截取到半透明的過渡畫面。
    await page.waitForTimeout(1000)
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)
    await page.screenshot({path:`${folder}/${width}-${name}.png`})
    results.push({width,name,overflow,errors:[...errors]})
    console.log(JSON.stringify(results.at(-1)))
  }
  try {
    await visit('/health')
    await page.locator('.h-entry-card--purchase').click()
    await expect(page.locator('.h-q-card')).toHaveCount(4)
    for(const question of await page.locator('.h-q-card').all()) {
      await page.waitForTimeout(1000)
      await question.locator('.h-q-opt').first().click()
      await expect(question.locator('.h-q-opt').first()).toHaveClass(/is-selected/)
    }
    await page.locator('.h-submit-btn').click()
    await expect(page.locator('.h-result')).toBeVisible()
    await capture('health-result')
    await visit('/qs')
    for(let i=0;i<18;i++) {
      await page.locator('.qs-card.is-current .qs-option-btn').first().click()
      await page.waitForTimeout(650)
    }
    await expect(page.locator('.qs-result-wrap')).toBeVisible()
    await capture('qs-result')
    await visit('/profile')
    for(const tab of await page.locator('.seg-tab').all()) {
      await tab.click()
      await expect(tab).toHaveClass(/active/)
    }
    await capture('profile-bids')
    for(const route of ['/why-gencko','/buying-guide','/calculator','/genes','/health']) {
      await visit(route)
      await capture(route.slice(1))
    }
  } catch(e) {results.push({width,error:e.message}); console.log(e.message)}
  await context.close()
}
const runName = process.argv.includes('--desktop') ? 'desktop' : 'all'
await writeFile(`${folder}/results-${runName}.json`,JSON.stringify(results,null,2))
await browser.close()
if(results.some(result=>result.error || result.overflow || result.errors?.length)) process.exitCode=1
