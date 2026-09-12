import { test, expect } from '@playwright/test'

for (const mobile of [false, true]) {
  test(`Hero Lab 新版卡片 ${mobile ? '手機照片不下載影片' : '桌機高清影片'} 與展覽內容`, async ({
    browser
  }) => {
    test.setTimeout(90000)
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      isMobile: mobile,
      hasTouch: mobile
    })
    const page = await context.newPage()
    const videoRequests: string[] = []
    const errors: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/previews/') && request.url().includes('.mp4'))
        videoRequests.push(request.url())
    })
    page.on('pageerror', (error) => errors.push(error.message))
    try {
      await page.goto('/')
      await page.addStyleTag({ content: '#nuxt-devtools-container { display:none!important; }' })
      await page.waitForFunction(() => Boolean((window as any).__hero?.state))
      await expect
        .poll(() => page.evaluate(() => (window as any).__hero.state().cardPreviewReady))
        .toBe(true)
      await expect
        .poll(() => page.evaluate(() => (window as any).__hero.state().cardVideoMode))
        .toBe(mobile ? 'poster' : 'atlas')
      expect(await page.evaluate(() => (window as any).__hero.state().cardPreviewSize)).toEqual([
        3840, 1080
      ])
      // 原生頁面捲動控制骨幹時間軸，不直接覆寫 3D 狀態。
      await page.evaluate(() =>
        scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.55)
      )
      await expect
        .poll(() => page.evaluate(() => (window as any).__hero.state().cardInteractionReady))
        .toBe(true)
      await page.screenshot({
        path: `output/hero-previews-20260911/${mobile ? 'mobile' : 'desktop'}-cards.png`
      })
      for (
        let attempt = 0;
        attempt < 4 && (await page.locator('.gallery-scene').count()) === 0;
        attempt++
      ) {
        const point = await page.evaluate(() => {
          const hero = (window as any).__hero
          const cards = hero
            .cardQuads()
            .filter((item: any) => item.front > 0.2)
            .sort((a: any, b: any) => b.front - a.front)
          for (const card of cards) {
            const x = card.pts.reduce((sum: number, p: any) => sum + p.x, 0) / card.pts.length
            const y = card.pts.reduce((sum: number, p: any) => sum + p.y, 0) / card.pts.length
            if (
              x > 0 &&
              x < innerWidth &&
              y > 80 &&
              y < innerHeight &&
              hero.hit(x, y) === card.title
            )
              return { x, y }
          }
          for (let y = 120; y < innerHeight - 60; y += 35)
            for (let x = 25; x < innerWidth - 25; x += 35) if (hero.hit(x, y)) return { x, y }
          return null
        })
        expect(point).not.toBeNull()
        if (mobile) await page.touchscreen.tap(point!.x, point!.y)
        else await page.mouse.click(point!.x, point!.y)
      }
      await expect(page.getByRole('dialog')).toBeVisible()
      if (mobile) {
        await expect(page.locator('.gallery-scene video')).toHaveCount(0)
        await expect(page.locator('.gallery-transition-canvas')).toHaveCount(0)
        const poster = page.locator('img.gallery-screen__video')
        await expect(poster).toBeVisible()
        await expect
          .poll(() => poster.evaluate((image: HTMLImageElement) => image.naturalWidth))
          .toBe(1280)
        expect(videoRequests).toEqual([])
      } else {
        await expect(page.locator('video.gallery-screen__video')).toHaveAttribute(
          'src',
          /\/previews\/20260911-ui\/.+\.mp4/
        )
        await expect
          .poll(() =>
            page
              .locator('video.gallery-screen__video')
              .evaluate((video: HTMLVideoElement) => video.videoWidth)
          )
          .toBe(1280)
      }
      await page.screenshot({
        path: `output/hero-previews-20260911/${mobile ? 'mobile' : 'desktop'}-gallery.png`
      })
      await page.getByRole('button', { name: '關閉展覽' }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      expect(errors).toEqual([])
    } finally {
      await context.close()
    }
  })
}
