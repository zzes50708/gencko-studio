import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const readIfPresent = (path) => {
  try {
    return read(path)
  } catch {
    return ''
  }
}

const backButton = read('../components/TheBackButton.vue')
const appMarquee = read('../components/AppMarquee.vue')
const navbar = read('../components/TheNavbar.vue')
const bottomNav = read('../components/TheBottomNav.vue')
const footer = read('../components/TheFooter.vue')
const hotPicksMarquee = read('../components/home/HotPicksMarquee.vue')
const home = read('../pages/home.vue')
const shopFlipCard = read('../components/ShopFlipCard.vue')
const timeline = read('../components/Timeline.vue')
const gradientButton = read('../components/GradientButton.vue')
const interactiveGrid = read('../components/InteractiveGridPattern.vue')
const atroposCard = read('../components/AtroposCard.vue')
const backgroundInteractiveGrid = read('../components/BackgroundInteractiveGrid.vue')
const hotPickTiltCard = read('../components/HomeHotPickTiltCard.vue')
const scenarioTiltCard = read('../components/HomeScenarioTiltCard.vue')
const homeSource = read('../pages/home.vue')
const heroLabPage = read('../components/HeroLabPage.vue')
const heroDnaGecko = read('../components/HeroDnaGecko.vue')
const dnaGeckoParticles = read('../components/DnaGeckoParticles.vue')
const brandServiceScene = read('../components/BrandServiceScrollScene.vue')
const mobileParticleField = read('../components/MobileParticleField.vue')
const nextCta = read('../components/NextCta.vue')
const timelineSource = read('../components/Timeline.vue')
const startHere = read('../pages/start-here.vue')
const guide = read('../pages/guide.vue')
const care = read('../pages/care.vue')
const faq = read('../pages/faq.vue')
const health = read('../pages/health.vue')
const hospital = read('../pages/hospital.vue')
const auctionIndex = read('../pages/auction/index.vue')
const auctionDetail = read('../pages/auction/[id].vue')
const auctionBidApi = readIfPresent('../server/api/auctions/[id]/bid.post.ts')
const auctionSecurityMigration = readIfPresent(
  '../supabase/migrations/20260903021811_secure_auction_bidding.sql'
)
const breeders = read('../pages/breeders.vue')
const shop = read('../pages/shop/index.vue')
const merchIndex = read('../pages/merch/index.vue')
const merchDetail = read('../pages/merch/[id].vue')
const productDetail = read('../pages/product/[id].vue')
const compare = read('../pages/compare.vue')
const profile = read('../pages/profile.vue')
const identity = read('../pages/identity/[id].vue')
const stories = read('../pages/stories.vue')
const whyGencko = read('../pages/why-gencko.vue')
const qs = read('../pages/qs.vue')
const calculator = read('../pages/calculator.vue')
const articlesIndex = read('../pages/articles/index.vue')
const articlesDetail = read('../pages/articles/[id].vue')
const genesIndex = read('../pages/genes/index.vue')
const genesDetail = read('../pages/genes/[id].vue')
const buyingGuide = read('../pages/buying-guide.vue')
const piniaPatch = read('../scripts/patch-pinia.mjs')
const residualLinkSources = [
  read('../pages/articles/[id].vue'),
  read('../pages/articles/index.vue'),
  read('../pages/compare.vue'),
  read('../components/ShopFlipCard.vue'),
  read('../pages/genes/index.vue'),
  read('../pages/profile.vue'),
  read('../pages/qs.vue'),
  read('../pages/why-gencko.vue'),
  read('../pages/stories.vue'),
  read('../pages/merch/index.vue'),
  read('../pages/product/[id].vue'),
  read('../pages/shop/index.vue')
]

describe('Phase 1 共用互動元件 contract', () => {
  it('Pinia hydration 修補同時涵蓋開發與 production bundle', () => {
    expect(piniaPatch).toContain("resolve('node_modules/pinia/dist/pinia.mjs')")
    expect(piniaPatch).toContain("resolve('node_modules/pinia/dist/pinia.prod.cjs')")
    expect(piniaPatch).toContain('Object.prototype.hasOwnProperty.call')
  })

  it('返回按鈕不會在表單情境意外送出', () => {
    expect(backButton).toContain('type="button"')
  })

  it('AppMarquee 在 reduced-motion 下清除 compositor hint', () => {
    expect(appMarquee).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.app-marquee__track\s*\{[\s\S]*?will-change:\s*auto/
    )
  })

  it('Navbar 的 disclosure 與 theme toggle 使用共用 44px 控制高度', () => {
    expect(navbar).toMatch(/\.nav-disclosure\s*\{[\s\S]*?min-height:\s*var\(--control-min-height\)/)
    expect(navbar).toMatch(/\.theme-toggle\s*\{[\s\S]*?min-height:\s*var\(--control-min-height\)/)
    expect(navbar).toContain('transition: transform 0.2s ease-out')
    expect(navbar).toContain('@click="dismissMenu"')
    expect(navbar).toContain('watch(() => route.path, closeMenuForNavigation)')
    expect(navbar).toContain('v-on="canHover ? {')
    expect(navbar).toContain("useMediaQuery('(min-width: 768px) and (hover: hover) and (pointer: fine)')")
    expect(bottomNav).toContain('@click="closeSheet({ restoreFocus: false })"')
  })

  it('共用殼層與熱門卡片關閉 NuxtLink 自動預取，避免初始同時編譯 route payload', () => {
    for (const source of [navbar, bottomNav, footer, hotPicksMarquee, home]) {
      const links = [...source.matchAll(/<NuxtLink\b[\s\S]*?>/g)].map((match) => match[0])
      expect(links.length).toBeGreaterThan(0)
      for (const link of links) expect(link).toContain('no-prefetch')
    }
  })

  it('首頁熱門個體分成兩列簡潔跑馬燈且不顯示狀態標籤', () => {
    expect(home).toContain("import HotPicksMarquee from '~/components/home/HotPicksMarquee.vue'")
    expect(home).toContain('class="hot-marquee-mask home-product-marquee"')
    expect(home).toContain('class="home-product-marquee__rows"')
    expect(home).toContain('v-for="(row, rowIndex) in hotRows"')
    expect(hotPicksMarquee).not.toContain('hot-stamp-sold')
    expect(hotPicksMarquee).not.toContain('hot-stamp-auction')
  })

  it('ShopFlipCard 保留翻面內容，操作獨立且尊重 reduced-motion', () => {
    expect(shopFlipCard).toContain('<article class="flip-card card slim-card">')
    expect(shopFlipCard).toContain('class="flip-card-link"')
    expect(shopFlipCard).toContain('class="card-action-stack flip-front-actions"')
    expect(shopFlipCard).toContain('class="flip-back-actions flip-back-actions--overlay"')
    expect(shopFlipCard).toContain('<div class="flip-face flip-back" aria-hidden="true">')
    expect(shopFlipCard).toContain('v-if="showInteractiveGrid"')
    expect(shopFlipCard).not.toContain('findSimilar')
    expect(shopFlipCard).toContain('孵化溫度:${v}度（不保證性別）')
    expect(shopFlipCard).toContain(
      '@media (min-width: 769px) and (hover: hover) and (pointer: fine)'
    )
    expect(shopFlipCard).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.flip-inner\s*\{[\s\S]*?transition:\s*none/
    )
  })

  it('Shop 使用全寬水平篩選、手機摘要與可重試錯誤狀態', () => {
    expect(shop).toContain('<span>SELECTED GECKOS</span>')
    expect(shop).toContain('每一隻守宮皆保證健康無疑才上架販售。')
    expect(shop).toContain('購買前歡迎私訊索取最新影片。')
    expect(shop).toContain('<h2 id="shop-catalog-stage-title">設定條件</h2>')
    expect(shop).toContain('<h2>守宮清單</h2>')
    expect(shop).toContain(':show-mobile-meta="true"')
    expect(shop).toContain(':show-interactive-grid="false"')
    expect(shop).toContain('v-if="store.dataError"')
    expect(shop).toMatch(
      /@media\s*\(min-width:\s*769px\)[\s\S]*?\.filter-panel\s*\{[\s\S]*?grid-template-columns:\s*repeat\(6,[\s\S]*?width:\s*100%/
    )
  })

  it('選購與種群型錄維持直角商品卡，Footer 使用白底精品殼層', () => {
    for (const source of [shop, breeders]) {
      expect(source).toMatch(
        /:deep\(\.photo-grid \.flip-card\),[\s\S]*?:deep\(\.photo-grid \.slim-body\)\s*\{[\s\S]*?border-radius:\s*0 !important/
      )
    }
    expect(footer).toMatch(/\.site-footer\s*\{[\s\S]*?background:\s*#fff/)
    expect(footer).toMatch(/\.site-footer\s*\{[\s\S]*?border-top:\s*1px solid #e4e0d9/)
    expect(footer).toMatch(
      /@media\s*\(max-width:\s*960px\)[\s\S]*?\.footer-inner\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/
    )
    expect(footer).toMatch(
      /@media\s*\(max-width:\s*640px\)[\s\S]*?\.footer-navigation\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/
    )
  })

  it('其餘選購鏈的商品與資訊容器也維持直角', () => {
    expect(auctionIndex).toMatch(/\.card-img-box\s*\{[\s\S]*?border-radius:\s*0/)
    expect(merchIndex).toMatch(/\.merch-card__media\s*\{[\s\S]*?border-radius:\s*0/)
    for (const source of [merchDetail, productDetail]) {
      expect(source).toMatch(/\.prod-img-box,[\s\S]*?border-radius:\s*0/)
    }
    expect(compare).toMatch(/\.compare-scroll\s*\{[\s\S]*?border-radius:\s*0/)
    expect(identity).toMatch(/\.id-card\s*\{[\s\S]*?border-radius:\s*0/)
  })

  it('Timeline 內文連結具備共用觸控高度', () => {
    expect(timeline).toMatch(/\.node-link\s*\{[\s\S]*?min-height:\s*var\(--control-min-height\)/)
  })

  it('GradientButton 在觸控裝置停用高成本旋轉與模糊，保留靜態邊框', () => {
    expect(gradientButton).toContain('@media (hover: none), (pointer: coarse), (max-width: 768px)')
    expect(gradientButton).toMatch(
      /@media\s*\(hover:\s*none\),\s*\(pointer:\s*coarse\),\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.gb-outer::before\s*\{[\s\S]*?animation:\s*none[\s\S]*?filter:\s*none/
    )
  })

  it('InteractiveGridPattern 不在觸控端註冊滑鼠事件', () => {
    expect(interactiveGrid).toContain(
      "useMediaQuery('(min-width: 768px) and (hover: hover) and (pointer: fine)')"
    )
    expect(interactiveGrid).not.toContain('@mouseenter')
    expect(interactiveGrid).not.toContain('@mouseleave')
    expect(interactiveGrid).toContain('v-on="getHoverEvents(i)"')
  })

  it('AtroposCard 只在 fine pointer 綁定延遲初始化事件並支援 reduced-motion', () => {
    expect(atroposCard).toContain(
      "useMediaQuery('(min-width: 768px) and (hover: hover) and (pointer: fine)')"
    )
    expect(atroposCard).toContain('const hoverEvents = computed(')
    expect(atroposCard).toContain('pointerenter: onEnter')
    expect(atroposCard).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.atropos-base\s*\{[\s\S]*?transition:\s*none/
    )
  })

  it('互動背景與 About 3D 同時要求桌機寬度及 fine pointer', () => {
    const desktopFinePointerQuery =
      "useMediaQuery('(min-width: 768px) and (hover: hover) and (pointer: fine)')"
    expect(backgroundInteractiveGrid).toContain(desktopFinePointerQuery)
    expect(brandServiceScene).toContain(desktopFinePointerQuery)
  })

  it('首頁熱門卡片手機不使用 3D 傾斜或常駐 will-change', () => {
    expect(homeSource).toMatch(
      /:deep\(\.hot-card-wrap\)\s*\{[\s\S]*?transform:\s*scale\(var\(--hot-card-scale,\s*0\.88\)\)\s*!important;[\s\S]*?will-change:\s*auto/
    )
    expect(homeSource).toMatch(
      /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?:deep\(\.hot-card-wrap\)\s*\{[\s\S]*?rotateY\(-26deg\)[\s\S]*?will-change:\s*transform/
    )
  })

  it('首頁 Phase 2 Hero 與信任導流具備清楚主要入口', () => {
    expect(homeSource).toContain('class="home-hero__eyebrow"')
    expect(homeSource).toContain('class="home-hero__lede"')
    expect(homeSource).toMatch(
      /<NuxtLink\s+no-prefetch\s+to="\/shop"\s+class="home-hero__action home-hero__action--primary"/
    )
    expect(homeSource).toMatch(
      /<NuxtLink\s+no-prefetch\s+to="\/merch"\s+class="home-hero__action home-hero__action--secondary"/
    )
    expect(homeSource).toContain('周邊商品')
    expect(homeSource).toContain('id="home-trust-title"')
    for (const route of ['/why-gencko', '/buying-guide', '/about']) {
      expect(homeSource).toMatch(new RegExp(`<NuxtLink\\s+no-prefetch\\s+to="${route}"`))
    }
  })

  it('首頁快速導覽卡支援鍵盤啟動且保留 reduced-motion 降級', () => {
    expect(homeSource).toMatch(
      /<div\s+class="scenario-card"\s+@click="goToStarterGuide"[\s\S]*?@keydown\.enter\.prevent="goToStarterGuide"[\s\S]*?@keydown\.space\.prevent="goToStarterGuide"/
    )
    expect(homeSource).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.scenario-card,[\s\S]*?transition:\s*none/
    )
    expect(homeSource).toMatch(
      /@media\s*\(max-width:\s*768px\)[\s\S]*?\.scenario-hint\s*\{[\s\S]*?display:\s*block;[\s\S]*?opacity:\s*1;/
    )
  })

  it('首頁最新文章顯示四篇並使用四欄桌機排版', () => {
    expect(homeSource).toContain('articlesList.slice(0, 4)')
    expect(homeSource).toMatch(
      /\.article-grid\s*\{\s*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/
    )
  })

  it('未使用的熱門卡片元件仍關閉 NuxtLink 自動預取，Scenario 卡片保留鍵盤 focus', () => {
    expect(hotPickTiltCard).toMatch(/<NuxtLink\s+[^>]*no-prefetch/)
    expect(scenarioTiltCard).toContain(':focus-visible')
  })

  it('Hero Lab 與品牌場景的共享入口不會預取 /home 或 /shop payload', () => {
    for (const source of [heroLabPage, brandServiceScene]) {
      const links = [...source.matchAll(/<NuxtLink\b[\s\S]*?>/g)].map((match) => match[0])
      expect(links.length).toBeGreaterThan(0)
      for (const link of links) expect(link).toContain('no-prefetch')
    }
  })

  it('內容頁與共用 CTA 不會預取後續 route payload', () => {
    for (const source of [nextCta, timelineSource, startHere, guide, care]) {
      const links = [...source.matchAll(/<NuxtLink\b[\s\S]*?>/g)].map((match) => match[0])
      expect(links.length).toBeGreaterThan(0)
      for (const link of links) expect(link).toContain('no-prefetch')
    }
  })

  it('其餘可見內容入口不會預取 route payload', () => {
    for (const source of residualLinkSources) {
      const links = [...source.matchAll(/<NuxtLink\b[\s\S]*?>/g)].map((match) => match[0])
      expect(links.length).toBeGreaterThan(0)
      for (const link of links) expect(link).toContain('no-prefetch')
    }
  })

  it('FAQ 分類與問題控制具備觸控高度、語意與 reduced-motion 降級', () => {
    expect(faq).toMatch(
      /<button\s+v-for="cat in FAQ_CATEGORIES"[\s\S]*?type="button"[\s\S]*?class="cat-tab"/
    )
    expect(faq).toMatch(/\.cat-tab\s*\{[\s\S]*?min-height:\s*var\(--control-min-height\)/)
    expect(faq).toMatch(/\.faq-q\s*\{[\s\S]*?min-height:\s*var\(--control-min-height\)/)
    expect(faq).toContain(':aria-controls="`faq-answer-${activeCategory}-${idx}`"')
    expect(faq).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.faq-body-wrapper\s*\{[\s\S]*?transition:\s*none/
    )
  })

  it('Health 互動按鈕明確避免送出，觸控端停用 hover 位移並支援 reduced-motion', () => {
    expect(health).toMatch(/<button\s+type="button"\s+class="h-entry-card/)
    expect(health).toMatch(/<button[\s\S]*?type="button"[\s\S]*?class="h-q-next-btn"/)
    expect(health).toContain('<button type="button" class="h-reset-btn"')
    expect(health).toMatch(/<button[\s\S]*?type="button"[\s\S]*?class="h-submit-btn"/)
    expect(health).toContain('<button type="button" class="h-copy-btn"')
    expect(health).toMatch(
      /@media\s*\(hover:\s*none\),\s*\(pointer:\s*coarse\),\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.h-entry-card:hover[\s\S]*?transform:\s*none[\s\S]*?\.h-q-opt:hover[\s\S]*?transform:\s*none/
    )
    expect(health).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.h-entry-card,[\s\S]*?\.h-q-card,[\s\S]*?transition:\s*none/
    )
  })

  it('Hospital 展開列與收藏操作具備鍵盤語意及觸控尺寸', () => {
    expect(hospital).toContain('class="hosp-header-toggle"')
    expect(hospital).toContain(':aria-controls="`hosp-details-${h.id}`"')
    expect(hospital).toContain(':id="`hosp-details-${h.id}`"')
    expect(hospital).toMatch(
      /<button\s+type="button"[\s\S]*?class="fav-btn hosp-fav-btn"[\s\S]*?aria-label=/
    )
    expect(hospital).toMatch(
      /\.hosp-header-toggle\s*\{[\s\S]*?min-height:\s*var\(--control-min-height\)/
    )
    expect(hospital).toMatch(/\.hosp-fav-btn\s*\{[\s\S]*?min-height:\s*var\(--control-min-height\)/)
    expect(hospital).toMatch(/\.hosp-link\s*\{[\s\S]*?min-height:\s*var\(--control-min-height\)/)
    expect(hospital).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.hosp-details\s*\{[\s\S]*?animation:\s*none/
    )
  })

  it('Auction 列表使用可鍵盤操作的 no-prefetch 連結卡片，並限制 hover 動畫於 fine pointer', () => {
    expect(auctionIndex).toMatch(
      /<NuxtLink[\s\S]*?no-prefetch[\s\S]*?:to="`\/auction\/\$\{item\.id\}`"[\s\S]*?class="auction-card"/
    )
    expect(auctionIndex).not.toMatch(/class="auction-card"\s+@click=/)
    expect(auctionIndex).toMatch(
      /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.auction-card:hover/
    )
    expect(auctionIndex).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.auction-card\s*\{[\s\S]*?transition:\s*none/
    )
  })

  it('Auction 列表保留 mobile 掃讀脈絡、倒數語意與鍵盤 focus', () => {
    expect(auctionIndex).toContain('class="auction-mobile-heading"')
    expect(auctionIndex).toContain('class="auction-mobile-desc"')
    expect(auctionIndex).toMatch(/class="status-badge"[^>]*role="status"/)
    expect(auctionIndex).toMatch(/class="countdown"[^>]*role="timer"/)
    expect(auctionIndex).toMatch(/\.auction-card:focus-visible\s*\{[\s\S]*?outline:/)
    expect(auctionIndex).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.countdown\.ending-soon\s*\{[\s\S]*?animation:\s*none/
    )
  })

  it('Auction 詳情操作具備明確 button type、44px 控制高度與觸控動畫降級', () => {
    for (const className of [
      'btn-toggle',
      'btn-share',
      'btn-promo',
      'btn-logout',
      'btn-bid',
      'btn-buy-now',
      'btn-login-line',
      'btn-login-google',
      'btn-close-promo'
    ]) {
      expect(auctionDetail).toMatch(
        new RegExp(`<button[\\s\\S]*?type="button"[\\s\\S]*?class="[^"\\n]*${className}`)
      )
    }
    expect(auctionDetail).toMatch(/\.btn-bid\s*\{[\s\S]*?min-height:\s*var\(--control-min-height\)/)
    expect(auctionDetail).toMatch(
      /@media\s*\(hover:\s*none\),\s*\(pointer:\s*coarse\),\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.btn-bid:hover[\s\S]*?transform:\s*none/
    )
    expect(auctionDetail).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.promo-modal-content\s*\{[\s\S]*?animation:\s*none/
    )
  })

  it('Auction 詳情圖片與宣傳 Modal 具備可鍵盤操作的 focus contract', () => {
    expect(auctionDetail).toMatch(
      /<button\s+type="button"[\s\S]*?class="main-img"[\s\S]*?aria-label=/
    )
    expect(auctionDetail).toMatch(/\.main-img:focus-visible\s*\{[\s\S]*?outline:/)
    expect(auctionDetail).toMatch(
      /role="dialog"[\s\S]*?aria-modal="true"[\s\S]*?aria-labelledby="promo-dialog-title"/
    )
    expect(auctionDetail).toContain("event.key === 'Escape'")
    expect(auctionDetail).toContain('promoTriggerEl')
  })

  it('Auction 出價改由 server 驗證身份與商業規則，前端不直接寫入資料表', () => {
    expect(auctionDetail).toContain("store.currentUser?.type !== 'google'")
    expect(auctionDetail).toMatch(
      /await \$fetch\(\s*`\/api\/auctions\/\$\{encodeURIComponent\(currentAuction\.value\.id\)\}\/bid`/
    )
    expect(auctionDetail).toContain('getAuctionStatus(currentAuction.value).status !==')
    expect(auctionDetail).toContain('Number.isInteger')
    expect(auctionDetail).not.toMatch(/\.from\('auction_bids'\)\.insert/)
    expect(auctionDetail).not.toMatch(/\.from\('blacklist'\)\.select/)
    expect(auctionDetail).not.toMatch(/\.from\('auctions'\)\s*\.update/)
    expect(auctionBidApi).toContain('serverSupabaseClient')
    expect(auctionBidApi).toContain('supabase.auth.getUser()')
    expect(auctionBidApi).toContain("supabase.rpc('place_auction_bid'")
  })

  it('Auction migration 啟用公開讀取 RLS，並將出價寫入鎖在 authenticated RPC', () => {
    expect(auctionSecurityMigration).toMatch(
      /alter table public\.auctions enable row level security/i
    )
    expect(auctionSecurityMigration).toMatch(
      /alter table public\.auction_bids enable row level security/i
    )
    expect(auctionSecurityMigration).toMatch(
      /alter table public\.blacklist enable row level security/i
    )
    expect(auctionSecurityMigration).toMatch(/add column if not exists user_id uuid/i)
    expect(auctionSecurityMigration).toMatch(/create schema if not exists private/i)
    expect(auctionSecurityMigration).toMatch(/security definer/i)
    expect(auctionSecurityMigration).toMatch(/set search_path = ''/i)
    expect(auctionSecurityMigration).toMatch(/revoke all on function public\.place_auction_bid/i)
    expect(auctionSecurityMigration).toMatch(
      /grant execute on function public\.place_auction_bid[\s\S]*authenticated/i
    )
  })

  it('Breeders 物種與性別篩選具備共用觸控高度及 reduced-motion', () => {
    expect(breeders).toMatch(/\.tab\s*\{[\s\S]*?min-height:\s*var\(--control-min-height\)/)
    expect(breeders).toMatch(/\.g-btn\s*\{[\s\S]*?min-height:\s*var\(--control-min-height\)/)
    expect(breeders).toMatch(
      /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.g-btn:hover/
    )
    expect(breeders).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.tab,[\s\S]*?\.g-btn\s*\{[\s\S]*?transition:\s*none/
    )
  })

  it('Breeders 使用純圖片型錄，物種 tabs 具備狀態語意與響應式欄數', () => {
    expect(breeders).toMatch(
      /<button\s+type="button"\s+class="tab"[\s\S]*?:aria-pressed="breederSp === '豹紋守宮'"/
    )
    expect(breeders).toMatch(
      /<button\s+type="button"\s+class="tab"[\s\S]*?:aria-pressed="breederSp === '肥尾守宮'"/
    )
    expect(breeders).toContain('class="breeders-mobile-heading"')
    expect(breeders).not.toContain('<ShopFlipCard')
    expect(breeders).not.toContain('`/product/${i.ID}`')
    expect(breeders).toContain('class="breeder-photo-card"')
    expect(breeders).toContain('class="breeder-morph"')
    expect(breeders).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))')
    expect(breeders).toContain('grid-template-columns: repeat(3, minmax(0, 1fr)) !important')
  })

  it('Shop 篩選與分類控制使用原生語意、44px 尺寸及狀態屬性', () => {
    expect(shop).toMatch(
      /<button\s+type="button"\s+class="[^"]*\bchip-tab\b[^"]*\bmain-tab\b[^"]*"/
    )
    expect(shop).not.toContain('role="button"')
    expect(shop).toMatch(
      /<button\s+type="button"\s+class="[^"]*\bf-cat\b[^"]*"[\s\S]*?:aria-expanded=/
    )
    expect(shop).toMatch(
      /<button\s+type="button"\s+class="[^"]*\bchip-toggle\b[^"]*\bchip-toggle--history\b[^"]*"[\s\S]*?:aria-pressed=/
    )
    expect(shop).toMatch(
      /<button\s+v-for="t in tags\[sp\] \|\| \[\]"[\s\S]*?type="button"[\s\S]*?class="[^"]*\bchip-tag\b[^"]*"[\s\S]*?:aria-pressed=/
    )
    for (const className of [
      'btn-back-arrow',
      'btn-clear-inline',
      'btn-clear',
      'btn-apply',
      'btn-filter-icon',
      'cmp-bar-remove',
      'cmp-clear-btn'
    ]) {
      expect(shop).toMatch(
        new RegExp(`<button[\\s\\S]*?type="button"[\\s\\S]*?class="[^"\\n]*${className}`)
      )
    }
    for (const className of ['btn-filter-icon', 'chip-tab', 'chip-toggle', 'chip-tag', 'f-cat']) {
      expect(shop).toMatch(
        new RegExp(`\\.${className}\\s*\\{[\\s\\S]*?min-height:\\s*var\\(--control-min-height\\)`)
      )
    }
    expect(shop).toMatch(
      /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.f-cat:hover/
    )
    expect(shop).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.chip-tab,[\s\S]*?\.chip-toggle,[\s\S]*?\.f-cat/
    )
  })

  it('Shop 手機篩選 Drawer 具備 dialog 語意、Escape、焦點回復與背景鎖定', () => {
    expect(shop).toMatch(
      /<div\s+ref="filterPanelEl"\s+id="shop-filter-panel"[\s\S]*?:role="showMobileFilter \? 'dialog' : 'region'"[\s\S]*?:aria-modal="showMobileFilter \? 'true' : undefined"/
    )
    expect(shop).toContain('aria-labelledby="shop-filter-title"')
    expect(shop).toMatch(
      /class="[^"]*\bbtn-filter-icon\b[^"]*\bm-only\b[^"]*"[\s\S]*?:aria-expanded="showMobileFilter"[\s\S]*?aria-controls="shop-filter-panel"/
    )
    expect(shop).toContain('@keydown="onFilterKeydown"')
    expect(shop).toContain("event.key === 'Escape'")
    expect(shop).toContain('shop-filter-open')
    expect(shop).toMatch(/\.f-check\s*\{[\s\S]*?min-height:\s*var\(--control-min-height\)/)
    expect(shop).toMatch(/<input\s+type="search"[\s\S]*?class="inp"[\s\S]*?enterkeyhint="search"/)
  })

  it('Merch 詳情圖片可鍵盤操作，分享與購買控制具備觸控尺寸及動效降級', () => {
    expect(merchDetail).toMatch(
      /\.from\('merchandise'\)[\s\S]*?\.eq\('item_id', merchId\)[\s\S]*?\.maybeSingle\(\)/
    )
    expect(merchDetail).toMatch(/const isHydrated = ref\(false\)/)
    expect(merchDetail).toContain('v-if="isHydrated && pending"')
    expect(merchDetail).toMatch(
      /<button[\s\S]*?type="button"[\s\S]*?class="prod-img-button"[\s\S]*?aria-label=/
    )
    expect(merchDetail).toMatch(
      /<button[\s\S]*?type="button"[\s\S]*?class="[^"]*\bbtn-share\b[^"]*"[\s\S]*?aria-label="複製商品連結"/
    )
    expect(merchDetail).toMatch(/\.prod-img-button\s*\{[\s\S]*?cursor:\s*zoom-in/)
    expect(merchDetail).toMatch(/\.btn-share\s*\{[\s\S]*?min-height:\s*var\(--control-min-height\)/)
    expect(merchDetail).toMatch(
      /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.btn-buy-lg:hover/
    )
    expect(merchDetail).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.btn-buy-lg,[\s\S]*?\.btn-share/
    )
  })

  it('Product 詳情圖片使用 no-prefetch 身分證連結，操作按鈕明確避免送出', () => {
    expect(productDetail).toMatch(
      /\.from\('animals'\)[\s\S]*?\.eq\('id', productId\)[\s\S]*?\.maybeSingle\(\)/
    )
    expect(productDetail).toMatch(/const isHydrated = ref\(false\)/)
    expect(productDetail).toContain('v-if="isHydrated && pending"')
    expect(productDetail).toMatch(
      /<NuxtLink\s+no-prefetch\s+class="prod-img-link"[\s\S]*?:to="`\/identity\/\$\{productModules\.identity\.id\}`"[\s\S]*?aria-label=/
    )
    for (const className of ['btn-share', 'btn-promo', 'btn-close-promo']) {
      expect(productDetail).toMatch(
        new RegExp(`<button[\\s\\S]*?type="button"[\\s\\S]*?class="[^"\\n]*${className}`)
      )
    }
    expect(productDetail).toMatch(
      /\.(btn-share|btn-promo)\s*\{[\s\S]*?min-height:\s*var\(--control-min-height\)/
    )
    expect(productDetail).toMatch(
      /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.btn-share:hover/
    )
    expect(productDetail).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.promo-modal-content\s*\{[\s\S]*?animation:\s*none/
    )
  })

  it('Product 詳情補齊收藏操作、mobile 相關個體欄數與 focus contract', () => {
    expect(productDetail).toContain('const isWishlisted = computed(')
    expect(productDetail).toMatch(
      /<button[\s\S]*?type="button"[\s\S]*?class="[^"\n]*\bbtn-wishlist\b[^"\n]*"[\s\S]*?:aria-pressed="isWishlisted"/
    )
    expect(productDetail).toMatch(
      /\.btn-wishlist\s*,[\s\S]*?\.btn-share\s*,[\s\S]*?\.btn-promo\s*\{[\s\S]*?min-height:\s*var\(--control-min-height\)/
    )
    expect(productDetail).toMatch(/\.related-card:focus-visible\s*\{[\s\S]*?outline:/)
    expect(productDetail).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.related-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/
    )
  })

  it('Product 宣傳圖卡 Modal 具備 dialog 語意與 focus 還原', () => {
    expect(productDetail).toMatch(
      /role="dialog"[\s\S]*?aria-modal="true"[\s\S]*?aria-labelledby="promo-dialog-title"/
    )
    expect(productDetail).toContain("event.key === 'Escape'")
    expect(productDetail).toContain('promoTriggerEl')
  })

  it('Compare 移除/清空與 action 連結具備語意、44px 尺寸及觸控動效降級', () => {
    expect(compare).toMatch(/<button[\s\S]*?type="button"[\s\S]*?class="[^"\n]*clear-all-btn/)
    expect(compare).toMatch(
      /<button[\s\S]*?type="button"[\s\S]*?class="[^"\n]*\bremove-btn\b[^"\n]*"[\s\S]*?aria-label=/
    )
    for (const className of ['clear-all-btn', 'remove-btn', 'btn-action']) {
      expect(compare).toMatch(
        new RegExp(`\\.${className}\\s*\\{[\\s\\S]*?min-height:\\s*var\\(--control-min-height\\)`)
      )
    }
    expect(compare).toMatch(
      /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.btn-action:hover/
    )
    expect(compare).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.btn-action[\s\S]*?transition:\s*none/
    )
  })

  it('Profile 登入、導頁與醫院收藏控制具備 button type、觸控尺寸及動效降級', () => {
    for (const className of [
      'btn-logout',
      'btn-quick line',
      'btn-quick google',
      'btn-hero',
      'btn-login line',
      'btn-login google'
    ]) {
      const classPattern = className.replace(' ', '\\s+')
      expect(profile).toMatch(
        new RegExp(`<button[\\s\\S]*?type="button"[\\s\\S]*?class="[^"\\n]*${classPattern}`)
      )
    }
    expect(profile).toMatch(
      /<button[\s\S]*?type="button"[\s\S]*?class="fav-btn active"[\s\S]*?@click\.stop\.prevent="toggleHospWishlist/
    )
    for (const className of ['btn-logout', 'btn-quick', 'seg-tab', 'btn-login', 'fav-btn']) {
      expect(profile).toMatch(
        new RegExp(`\\.${className}\\s*\\{[\\s\\S]*?min-height:\\s*var\\(--control-min-height\\)`)
      )
    }
    expect(profile).toMatch(
      /@media\s*\(min-width:\s*768px\)\s*and\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.btn-login\.line:hover[\s\S]*?\.hosp-card:hover/
    )
    expect(profile).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.seg-tab[\s\S]*?transition:\s*none/
    )
  })

  it('Identity PDF action 具備明確 button type、44px 尺寸與 reduced-motion', () => {
    expect(identity).toMatch(/<button[\s\S]*?type="button"[\s\S]*?class="act-btn primary"/)
    expect(identity).toMatch(/\.act-btn\s*\{[\s\S]*?min-height:\s*var\(--control-min-height\)/)
    expect(identity).toMatch(/\.act-btn:focus-visible\s*\{[\s\S]*?outline:/)
    expect(identity).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.loader[\s\S]*?animation:\s*none/
    )
  })

  it('Identity 圖片代理失敗時降級原始來源，且二次失敗顯示無圖片狀態', () => {
    expect(identity).toMatch(/import \{ computed, onMounted, ref \} from 'vue'/)
    expect(identity).toContain("const imageState = ref('optimized')")
    expect(identity).toMatch(
      /const identityImageSrc = computed\([\s\S]*?imageState\.value[\s\S]*?\)/
    )
    expect(identity).toMatch(/<img[\s\S]*?:src="identityImageSrc"[\s\S]*?@error="handleImageError"/)
    expect(identity).toMatch(
      /if\s*\(\s*imageState\.value === 'optimized'[\s\S]*?imageState\.value = 'fallback'/
    )
    expect(identity).toMatch(/imageState\.value = 'failed'/)
    expect(identity).toMatch(/onMounted\([\s\S]*?naturalWidth === 0[\s\S]*?handleImageError\(\)/)
    expect(identity).toContain('ref="identityImageEl"')
    expect(identity).toMatch(/getCleanUrl\(/)
  })

  it('Articles 列表篩選使用原生 button、狀態屬性與共用觸控尺寸', () => {
    expect(articlesIndex).not.toContain('role="button"')
    expect(articlesIndex).toMatch(
      /<button\s+v-for="cat in fixedCats"[\s\S]*?type="button"[\s\S]*?class="nav-chip"[\s\S]*?:aria-pressed=/
    )
    expect(articlesIndex).toMatch(
      /<button\s+v-for="t in popularTags"[\s\S]*?type="button"[\s\S]*?class="q-tag"[\s\S]*?:aria-pressed=/
    )
    expect(articlesIndex).toMatch(
      /\.clear-btn\s*\{[\s\S]*?min-height:\s*var\(--control-min-height\)/
    )
    expect(articlesIndex).toMatch(
      /\.nav-chip\s*\{[\s\S]*?min-height:\s*var\(--control-min-height\)/
    )
    expect(articlesIndex).toMatch(/\.q-tag\s*\{[\s\S]*?min-height:\s*var\(--control-min-height\)/)
    expect(articlesIndex).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.nav-chip,[\s\S]*?\.q-tag/
    )
  })

  it('Article 詳情缺資料不觸發 406，loading 分支具備 hydration gate 與可聚焦返回控制', () => {
    expect(articlesDetail).toMatch(
      /\.from\('articles'\)[\s\S]*?\.eq\('id', articleId\)[\s\S]*?\.maybeSingle\(\)/
    )
    expect(articlesDetail).toMatch(/const isHydrated = ref\(false\)/)
    expect(articlesDetail).toContain('v-if="isHydrated && pending"')
    expect(articlesDetail).toMatch(
      /<button[\s\S]*?type="button"[\s\S]*?class="btn-app btn-app--ghost btn-app--md btn-app--pill"/
    )
    expect(articlesDetail).toMatch(
      /@media\s*\(min-width:\s*768px\)\s*and\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.related-art-card:hover/
    )
    expect(articlesDetail).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.related-art-card[\s\S]*?transition:\s*none/
    )
  })

  it('Genes 列表分段與基因卡片具備狀態、44px 尺寸及 fine-pointer hover 降級', () => {
    expect(genesIndex).toMatch(/<button\s+type="button"\s+class="segment"[\s\S]*?:aria-pressed=/)
    expect(genesIndex).toMatch(/\.segment\s*\{[\s\S]*?min-height:\s*var\(--control-min-height\)/)
    expect(genesIndex).toMatch(
      /\.gene-btn-item\s*\{[\s\S]*?min-height:\s*var\(--control-min-height\)/
    )
    expect(genesIndex).toMatch(
      /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.gene-btn-item:hover/
    )
    expect(genesIndex).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.gene-btn-item[\s\S]*?transition:\s*none/
    )
  })

  it('Gene 詳情缺資料不觸發 406，loading 分支具備 hydration gate', () => {
    expect(genesDetail).toMatch(
      /\.from\('genetic_pages'\)[\s\S]*?\.eq\('name', geneName\)[\s\S]*?\.maybeSingle\(\)/
    )
    expect(genesDetail).toMatch(/const isHydrated = ref\(false\)/)
    expect(genesDetail).toContain('v-if="isHydrated && pending"')
    expect(genesDetail).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.loader[\s\S]*?animation:\s*none/
    )
  })

  it('Start Here 導頁卡與步驟 CTA 具備 44px hit area、focus 與 reduced-motion', () => {
    for (const className of ['knowledge-card', 'lane-chip', 'prep-link']) {
      expect(startHere).toMatch(
        new RegExp(`\\.${className}\\s*\\{[\\s\\S]*?min-height:\\s*var\\(--control-min-height\\)`)
      )
    }
    expect(startHere).toMatch(
      /\.(knowledge-card|lane-chip|prep-link):focus-visible\s*\{[\s\S]*?outline:/
    )
    expect(startHere).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.knowledge-card,[\s\S]*?\.lane-chip/
    )
  })

  it('Stories 與 Why Gencko 導頁卡具備 focus、44px hit area、fine-pointer hover 與 reduced-motion', () => {
    expect(stories).toMatch(/\.link-chip\s*\{[\s\S]*?min-height:\s*var\(--control-min-height\)/)
    expect(stories).toMatch(/\.link-chip:focus-visible\s*\{[\s\S]*?outline:/)
    expect(stories).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.link-chip[\s\S]*?transition:\s*none/
    )
    for (const className of ['purchase-card', 'overview-card']) {
      expect(whyGencko).toMatch(
        new RegExp(`\\.${className}\\s*\\{[\\s\\S]*?min-height:\\s*var\\(--control-min-height\\)`)
      )
    }
    expect(whyGencko).toMatch(/\.(purchase-card|overview-card):focus-visible\s*\{[\s\S]*?outline:/)
    expect(whyGencko).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.purchase-card,[\s\S]*?\.overview-card/
    )
  })

  it('Guide 內文連結保留行內語意，hover 僅限 fine pointer 並提供鍵盤 focus', () => {
    expect(guide).toMatch(/\.guide-inline-link\s*\{[\s\S]*?display:\s*inline-block/)
    expect(guide).toMatch(/\.guide-inline-link:focus-visible\s*\{[\s\S]*?outline:/)
    expect(guide).toMatch(
      /@media\s*\(min-width:\s*768px\)\s*and\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.guide-inline-link:hover/
    )
  })

  it('About 場景在手機不 mount 高耗能 canvas，Observer 僅使用 touch', () => {
    expect(brandServiceScene).toMatch(
      /<TresCanvas\s+v-if="isDesktop"[\s\S]*?<\/TresCanvas>[\s\S]*?stage-mobile-fallback/
    )
    expect(brandServiceScene).toMatch(
      /<MatrixGeneRain\s+v-if="isDesktop && geneFxActive"[\s\S]*?:enabled="geneFxActive"/
    )
    expect(brandServiceScene).toContain("type: isDesktop.value ? 'wheel,pointer' : 'touch'")
  })

  it('About mobile fallback 顯示輕量 CSS 粒子，不依賴 Canvas 或滑鼠事件', () => {
    expect(brandServiceScene).toMatch(
      /<div v-else class="stage-mobile-fallback"[\s\S]*?<MobileParticleField\s*\/>/
    )
    expect(mobileParticleField).toMatch(/v-for=/)
    expect(mobileParticleField).toContain('mobile-particle-field')
    expect(mobileParticleField).toContain('pointer-events: none')
    expect(mobileParticleField).toContain('@keyframes mobile-particle-float')
    expect(mobileParticleField).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?animation:\s*none/
    )
    expect(mobileParticleField).not.toMatch(/mousemove|mouseenter|mouseleave|requestAnimationFrame/)
  })

  it('Care 所有按鈕明確避免送出，主要錨點與文章控制具備 44px 及動效降級', () => {
    const buttons = [...care.matchAll(/<button\b[\s\S]*?>/g)].map((match) => match[0])
    expect(buttons.length).toBeGreaterThan(0)
    for (const button of buttons) expect(button).toContain('type="button"')
    for (const className of [
      'care-stat-card',
      'care-anchor-btn',
      'care-chip',
      'care-toggle-btn',
      'care-faq-q'
    ]) {
      expect(care).toMatch(
        new RegExp(`\\.${className}\\s*\\{[\\s\\S]*?min-height:\\s*var\\(--control-min-height\\)`)
      )
    }
    expect(care).toContain('.care-stat-card:focus-visible')
    expect(care).toContain('.care-faq-q:focus-visible')
    expect(care).toContain('outline: 3px solid var(--pri)')
    expect(care).not.toContain('showSpeciesCompare')
    expect(care).toContain(':aria-controls="`care-faq-answer-${i}`"')
    expect(care).toMatch(
      /@media\s*\(min-width:\s*768px\)\s*and\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.care-stat-card:hover/
    )
    expect(care).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.care-stat-card,[\s\S]*?\.care-chip/
    )
  })

  it('QS 問卷與結果控制明確避免送出，具備 44px、focus、fine-pointer hover 與 reduced-motion', () => {
    const buttons = [...qs.matchAll(/<button\b[\s\S]*?>/g)].map((match) => match[0])
    expect(buttons.length).toBeGreaterThan(0)
    for (const button of buttons) expect(button).toContain('type="button"')
    for (const className of [
      'qs-option-btn',
      'qs-nav-btn',
      'qs-track-link',
      'qs-modify-btn',
      'qs-reset-btn'
    ]) {
      expect(qs).toMatch(
        new RegExp(`\\.${className}\\s*\\{[\\s\\S]*?min-height:\\s*var\\(--control-min-height\\)`)
      )
    }
    expect(qs).toMatch(
      /\.(qs-option-btn|qs-nav-btn|qs-modify-btn|qs-reset-btn):focus-visible\s*\{[\s\S]*?outline:/
    )
    expect(qs).toContain(':aria-pressed="selectedOptionId === opt.id"')
    expect(qs).toMatch(
      /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.qs-option-btn:hover/
    )
    expect(qs).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.qs-option-btn,[\s\S]*?\.qs-reset-btn/
    )
  })

  it('Calculator 避免 nested interactive、反向推薦可鍵盤操作，並統一控制降級', () => {
    const buttonCount = (calculator.match(/<button\b/g) || []).length
    const explicitTypeCount = (calculator.match(/type="button"/g) || []).length
    expect(buttonCount).toBeGreaterThan(0)
    expect(explicitTypeCount).toBe(buttonCount)
    expect(calculator).toMatch(
      /<div\s+v-for="gene in[\s\S]*?class="calc-dd-item"[\s\S]*?<div\s+class="calc-dd-item-row calc-dd-item-row--trigger"[\s\S]*?role="button"[\s\S]*?tabindex="0"/
    )
    expect(calculator).not.toMatch(
      /<button\s+v-for="gene in[\s\S]*?class="calc-dd-item"[\s\S]*?<button/
    )
    expect(calculator).toMatch(
      /class="calc-reverse-card"[\s\S]*?role="button"[\s\S]*?tabindex="0"[\s\S]*?@keydown\.enter/
    )
    const controlContract = calculator.match(
      /\.calc-selector-chip,[\s\S]*?min-height:\s*var\(--control-min-height\)/
    )?.[0]
    expect(controlContract).toBeTruthy()
    for (const className of [
      'calc-selector-chip',
      'calc-selector-menu-item',
      'calc-help-btn',
      'calc-role-chip',
      'calc-category-chip',
      'calc-dd-item',
      'calc-dd-badge',
      'calc-mode-btn',
      'calc-reverse-close'
    ]) {
      expect(controlContract).toContain(`.${className}`)
    }
    expect(calculator).toMatch(
      /\.calc-reverse-card\s*\{[\s\S]*?min-height:\s*var\(--control-min-height\)/
    )
    expect(calculator).toContain('.calc-reverse-card:focus-visible')
    expect(calculator).toContain('.calc-dd-item-row--trigger:focus-visible')
    expect(calculator).toMatch(
      /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.calc-selector-chip:hover/
    )
    expect(calculator).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.calc-selector-chip,[\s\S]*?\.calc-reverse-close/
    )
    expect(calculator).toContain('role="dialog"')
    expect(calculator).toContain('aria-modal="true"')
    expect(calculator).toContain('aria-labelledby="calc-info-title"')
    expect(calculator).toMatch(
      /<button[\s\S]*?ref="calcModalClose"[\s\S]*?aria-label="關閉基因說明"/
    )
    expect(calculator).toContain("event.key === 'Escape'")
    expect(calculator).toContain('calcModalTrigger?.focus()')
  })

  it('購買流程與 Hero Lab 入口具備鍵盤 focus、觸控尺寸與動效降級', () => {
    expect(buyingGuide).toContain('<Timeline :nodes="flowNodes" />')
    expect(buyingGuide).not.toContain('<NextCta')
    expect(timeline).toMatch(/\.node-link:focus-visible\s*\{[\s\S]*?outline:/)
    expect(timeline).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.node-link[\s\S]*?transition:\s*none/
    )
    expect(heroLabPage).toMatch(/class="hero-lab-home-link[^"]*"/)
    expect(heroLabPage).toMatch(
      /\.hero-lab-home-link\s*\{[\s\S]*?min-height:\s*var\(--control-min-height\)/
    )
    expect(heroLabPage).toContain('.hero-lab-home-link:focus-visible')
  })

  it('Hero Lab 在 mobile/coarse pointer 不 mount Canvas，desktop 保留完整 3D', () => {
    expect(heroDnaGecko).toMatch(
      /useMediaQuery\(\s*'\(min-width: 768px\) and \(hover: hover\) and \(pointer: fine\)'\s*\)/
    )
    expect(heroDnaGecko).toMatch(
      /<div\s+v-if="hero3dEnabled"\s+class="hero-canvas-shell"[\s\S]*?<TresCanvas[\s\S]*?<\/TresCanvas>/
    )
    expect(heroDnaGecko).toMatch(
      /<div\s+v-else\s+class="hero-mobile-fallback"[\s\S]*?hero-accessible-nav/
    )
    expect(heroDnaGecko).toMatch(
      /<HeroLogoDisc\s+v-if="hero3dEnabled"[\s\S]*?\/>[\s\S]*?<img\s+v-else\s+class="band-logo-static"/
    )
    expect(heroDnaGecko).toContain('v-if="hero3dEnabled && !selectedCard"')
    expect(heroLabPage).not.toContain('hero-lab-scroll-space--static-mobile')
    expect(heroLabPage).not.toContain('const hero3dEnabled = useMediaQuery')
    expect(heroLabPage).toMatch(/\.hero-lab-scroll-space\s*\{[\s\S]*?height:\s*1500dvh[\s\S]*?\}/)
    expect(heroLabPage).toMatch(
      /@media\s*\(max-width:\s*767px\),\s*\(hover:\s*none\),\s*\(pointer:\s*coarse\)[\s\S]*?\.hero-lab-scroll-space\s*\{[\s\S]*?height:\s*0/
    )
  })

  it('Hero Lab base environment 停用額外 scene blur', () => {
    expect(dnaGeckoParticles).toMatch(
      /envRT\s*=\s*pmrem\.fromScene\(new RoomEnvironment\(\),\s*0\)/
    )
  })

  it('Hero Lab 重用單一 PMREM prefilter，避免重複編譯內建 GGX shader', () => {
    expect(dnaGeckoParticles.match(/pmrem\.fromScene\(/g) ?? []).toHaveLength(1)
    expect(dnaGeckoParticles).toMatch(/eggShardMat\.envMap\s*=\s*envRT\.texture/)
  })
})
