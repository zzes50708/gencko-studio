import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const output = 'output/habitat-20260910'
await mkdir(output, { recursive: true })
await mkdir('public/images/care', { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
page.setDefaultTimeout(30000)
const errors = []
page.on('pageerror', error => { errors.push(error.message); console.log('PAGEERROR', error.message) })
page.on('response', response => { if (response.status() >= 400) console.log('HTTP', response.status(), response.url()) })
page.on('requestfailed', request => console.log('REQUEST', request.url(), request.failure()?.errorText))
page.on('console', message => { if (['error', 'warning'].includes(message.type())) console.log('CONSOLE', message.text().slice(0, 900)) })
try {
  await page.goto('http://localhost:3000/care', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__))
  await page.addStyleTag({ content: '#nuxt-devtools-container { display:none !important; }' })
  await page.locator('.habitat-explorer').scrollIntoViewIfNeeded()
  await page.waitForTimeout(2000)
  await expect(page.locator('.habitat-stage canvas')).toBeVisible({ timeout: 45000 })
  await expect(page.locator('.habitat-loading')).toHaveCount(0)
  await page.waitForTimeout(1800)
  await page.locator('.habitat-explorer').screenshot({ path: `${output}/desktop.png` })
  const canvas = page.locator('.habitat-stage canvas')
  const captureStyle = await page.addStyleTag({ content: '.habitat-zoom { visibility:hidden !important; }' })
  const screenshot = await canvas.screenshot()
  await captureStyle.evaluate(element => element.remove())
  await writeFile(`${output}/model.png`, screenshot)
  // 手機海報直接由同一 3D 場景輸出，不另畫不一致的配置。
  await sharp(screenshot).resize(1200, 800, { fit: 'contain', background: '#f8f7f3' }).webp({ quality: 90 }).toFile('public/images/care/habitat-overview.webp')
  console.log('MODEL_CAPTURED')
  await page.getByRole('button', { name: '俯視', exact: true }).click()
  await page.waitForTimeout(1200)
  await page.locator('.habitat-explorer').screenshot({ path: `${output}/top.png` })
  await page.getByRole('checkbox', { name: '顯示頂蓋' }).check()
  await page.waitForTimeout(300)
  await page.locator('.habitat-explorer').screenshot({ path: `${output}/roof.png` })
  await page.getByRole('button', { name: '重設視角' }).click()
  await page.waitForTimeout(1200)
  const bounds = await canvas.boundingBox()
  await canvas.click({ position: { x: bounds.width * .56, y: bounds.height * .49 } })
  await expect(page.locator('.habitat-description h4')).toHaveText('躲避屋')
  await page.getByRole('group', { name: '選擇設備' }).getByRole('button', { name: /溫度計/ }).click()
  await expect(page.locator('.habitat-description h4')).toHaveText('溫度計')
  await page.locator('.habitat-stage').focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('+')
  await page.waitForTimeout(900)
  await page.locator('.habitat-explorer').screenshot({ path: `${output}/keyboard.png` })
  console.log('INTERACTIONS_OK', JSON.stringify(errors))
  expect(errors).toEqual([])
} catch (error) {
  console.log('FAIL', error.message)
  await page.screenshot({ path: `${output}/failure.png` })
  process.exitCode = 1
}
await browser.close()
