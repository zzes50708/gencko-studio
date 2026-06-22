// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'
const gaId = process.env.NUXT_PUBLIC_GA_ID || 'G-93T0C2KMEZ'
const enableGa = process.env.NODE_ENV === 'production' || process.env.NUXT_PUBLIC_ENABLE_GA === 'true'

export default defineNuxtConfig({
  compatibilityDate: '2024-04-16',
  devtools: { enabled: true },

  // 注意：不要在這裡用 routeRules 對 `/` 做 redirect，
  // 會影響 Nuxt 內部導覽（例如點 Logo 回 `/` 也會被導到 `/about`）。

  // 修正 dev 時 Vite 無法解析 `#app-manifest`（Nuxt app manifest 虛擬模組）
  experimental: {
    appManifest: true
  },

  // 修正 dev 模式 Vite 無法解析 `#app-manifest`（避免全站掉樣式/只剩文字）
  vite: {
    resolve: {
      alias: {
        '#app-manifest': fileURLToPath(new URL('./app-manifest.stub.mjs', import.meta.url))
      }
    }
  },

  // 註冊所需模組
  modules:[
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/sitemap',
    '@nuxtjs/robots',
    '@nuxt/image',
    '@vite-pwa/nuxt',
    '@tresjs/nuxt'
  ],

  // 🌟 Nuxt Image 設定
  image: {
    provider: 'ipx', 
    domains:[
      'cdn.jsdelivr.net',
      'drive.google.com',
      'wsrv.nl' // 🌟 必須加入白名單，讓 Vercel 允許讀取被壓縮後的圖片
    ],
    screens: {
      xs: 320, sm: 640, md: 768, lg: 1024, xl: 1280, xxl: 1536,
    },
    format: ['webp']
  },

  // 🌟 PWA 模組設定
  pwa: {
    // 'autoUpdate'：新版本上線時 Service Worker 自動背景更新，不再顯示「立即更新」提示
    registerType: 'autoUpdate',
    manifest: {
      id: '/',
      start_url: '/',
      scope: '/',
      name: 'Gencko Studio',
      short_name: 'Gencko',
      description: 'Gencko Studio 提供專業的豹紋守宮繁育、基因計算機與特寵飼養知識。',
      theme_color: '#e6e3e3', 
      background_color: '#e6e3e3', 
      display: 'standalone', 
      orientation: 'portrait',
      categories: ['shopping', 'lifestyle'],
      shortcuts: [
        {
          name: '選購守宮',
          short_name: '選購',
          url: '/shop',
          icons: [{ src: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/11.png', sizes: '192x192' }]
        },
        {
          name: '線上競標',
          short_name: '競標',
          url: '/auction',
          icons: [{ src: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/11.png', sizes: '192x192' }]
        },
        {
          name: '基因計算機',
          short_name: '計算機',
          url: '/calculator',
          icons: [{ src: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/11.png', sizes: '192x192' }]
        }
      ],
      icons:[
        {
          src: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/11.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/11.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/11.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico,webp}'],
      navigateFallback: null,
      cleanupOutdatedCaches: true,
      runtimeCaching:[
  {
    urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'cdn-images-cache',
      expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
      cacheableResponse: { statuses: [0, 200] }
    }
  },
  {
    // 🌟 新增：快取 wsrv.nl 圖片代理回應（所有圖片的最終出口）
    urlPattern: /^https:\/\/wsrv\.nl\/.*/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'wsrv-images-cache',
      expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
      cacheableResponse: { statuses: [0, 200] }
    }
  },
  {
    // 🌟 新增：快取 GitHub Raw（getCleanUrl 將 jsDelivr 轉換後的實際來源）
    urlPattern: /^https:\/\/raw\.githubusercontent\.com\/.*/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'github-raw-cache',
      expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
      cacheableResponse: { statuses: [0, 200] }
    }
  },
  {
    urlPattern: /^https:\/\/sfndneptcwhblvrxykcy\.supabase\.co\/rest\/v1\/.*/i,
    handler: 'NetworkFirst',
    options: {
      cacheName: 'supabase-api-cache',
      expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
      networkTimeoutSeconds: 5,
      cacheableResponse: { statuses: [0, 200] }
    }
  }
],
    },
    devOptions: {
      // 開發模式不啟用 dev service worker，避免缺少 `.nuxt/dev-sw-dist/sw.js` 時造成 Vite PWA 外掛報錯
      enabled: false,
      type: 'module'
    }
  },

  site: {
    url: 'https://www.genckobreeding.com',
    name: 'Gencko Studio'
  },

  sitemap: {
    sources:[
      '/api/_sitemap-urls'
    ]
  },

  robots: {
    sitemap: 'https://www.genckobreeding.com/sitemap.xml',
    groups: [
      // 一般搜尋引擎（Google / Bing 等）
      {
        userAgent: ['*'],
        disallow: ['/profile', '/identity/']
      },
      // AI 搜尋 / 即時聯網爬蟲（使用者透過 ChatGPT / Perplexity / Claude 等查詢時會即時抓取）
      // ✅ 允許 — 讓 AI 回答「台灣哪裡有賣豹紋守宮」時能引用本站
      {
        userAgent: [
          'OAI-SearchBot',       // ChatGPT Search index
          'ChatGPT-User',        // ChatGPT browsing on user request
          'PerplexityBot',       // Perplexity search index
          'Perplexity-User',     // Perplexity on user request
          'ClaudeBot',           // Anthropic search/index
          'Claude-Web',          // Claude on user request
          'Google-Extended',     // Google AI Overviews / Gemini grounding
          'Applebot-Extended'    // Apple Intelligence
        ],
        allow: ['/'],
        disallow: ['/profile', '/identity/']
      },
      // AI 模型訓練爬蟲（用於訓練下一代模型，非即時檢索）
      // ❌ 預設 Disallow — 使用者本次僅指定允許「搜尋 / 聯網」類；如要參與模型訓練可改 allow
      {
        userAgent: ['GPTBot', 'CCBot', 'anthropic-ai', 'cohere-ai', 'Bytespider'],
        disallow: ['/']
      }
    ]
  },

  supabase: {
    url: 'https://sfndneptcwhblvrxykcy.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmRuZXB0Y3doYmx2cnh5a2N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjYxMTcsImV4cCI6MjA4NTMwMjExN30.dN4MHhwjEM26coS9eZAW_eIQJplF8j9YHT9WyFypK3I',
    redirect: false
  },

  css:[
    '~/assets/css/style.css',
  ],

  // 🌟 全站應用程式設定
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      titleTemplate: '%s | Gencko Studio',
      title: 'Gencko 專業守宮選育｜特殊基因品系 × 新手飼養教學一站式服務',
      htmlAttrs: { lang: 'zh-TW' },
      meta:[
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, viewport-fit=cover' },
        { name: 'description', content: 'Gencko Breeding Studio 台灣豹紋守宮專業繁育工作室，提供特殊基因品系個體選購、基因計算機、新手飼養教學、健康評估、特寵醫院查詢與線上競標。從基因到飼養的一站式服務。' },
        { name: 'keywords', content: '豹紋守宮,守宮,基因計算機,守宮品系,守宮飼養,新手飼養,Eublepharis macularius,Gencko,捷客工作室,守宮繁育,守宮選購,特寵醫院' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Gencko Studio' },
        { property: 'og:image', content: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/11.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:locale', content: 'zh_TW' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:site', content: '@gencko_breeding' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Gencko' },
        { name: 'theme-color', content: '#E8440A' }
      ],
      link:[
        { rel: 'preconnect', href: 'https://cdn.jsdelivr.net' },
        { rel: 'dns-prefetch', href: 'https://cdn.jsdelivr.net' },
        { rel: 'icon', href: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/11.png' },
        { rel: 'apple-touch-icon', href: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/11.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        // LCP 優化：Google Fonts 改非阻擋載入（media=print → onload 切回 all）
        // 大幅縮減 render-blocking 時間（原本 5.2s）；字型載入完前用系統 fallback
        { rel: 'preload', as: 'style', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+TC:wght@300;400;500;700;900&family=Black+Ops+One&display=swap' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+TC:wght@300;400;500;700;900&family=Black+Ops+One&display=swap', media: 'print', onload: "this.media='all'" }
      ],
      script:[
        ...(enableGa ? [
          // ⚠️ GA4：script src 與 config ID 統一為 G-93T0C2KMEZ（原 G-Q97CS08YRH 不一致已修正）
          { src: `https://www.googletagmanager.com/gtag/js?id=${gaId}`, async: true },
          {
            children: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `
          }
        ] : []),
        // Organization 結構化資料（品牌身份，GEO / Knowledge Panel 基礎）
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Gencko Breeding Studio",
            "alternateName": ["Gencko Studio", "捷客工作室"],
            "url": "https://www.genckobreeding.com",
            "logo": "https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/11.png",
            "description": "Gencko Breeding Studio 是台灣專業的豹紋守宮（Eublepharis macularius）繁育工作室，提供特殊基因品系個體選購、基因計算機、新手飼養教學、健康評估、特寵醫院查詢與線上競標。從基因到飼養的一站式服務。",
            "slogan": "Gencko 專業守宮選育：從特殊基因品系到新手飼養教學的一站式服務",
            "foundingDate": "2025",
            "foundingLocation": { "@type": "Place", "name": "三重, 台灣" },
            "founder": { "@type": "Person", "name": "Gino" },
            "areaServed": { "@type": "Country", "name": "Taiwan" },
            "knowsAbout": [
              "豹紋守宮（Leopard Gecko）",
              "肥尾守宮（African Fat-Tail Gecko）",
              "爬蟲繁育",
              "守宮基因選育",
              "守宮品系",
              "守宮新手飼養",
              "Eublepharis macularius",
              "Hemitheconyx caudicinctus"
            ],
            "hasOfferCatalog": {
              "@type": "OfferCatalog",
              "name": "Gencko 服務目錄",
              "itemListElement": [
                { "@type": "Offer", "name": "守宮個體選購", "url": "https://www.genckobreeding.com/shop" },
                { "@type": "Offer", "name": "基因計算機", "url": "https://www.genckobreeding.com/calculator" },
                { "@type": "Offer", "name": "守宮基因圖鑑", "url": "https://www.genckobreeding.com/genes" },
                { "@type": "Offer", "name": "新手飼養教學", "url": "https://www.genckobreeding.com/care" },
                { "@type": "Offer", "name": "飼養知識專欄", "url": "https://www.genckobreeding.com/articles" },
                { "@type": "Offer", "name": "線上競標", "url": "https://www.genckobreeding.com/auction" },
                { "@type": "Offer", "name": "健康評估", "url": "https://www.genckobreeding.com/health" },
                { "@type": "Offer", "name": "飼養前評估", "url": "https://www.genckobreeding.com/qs" },
                { "@type": "Offer", "name": "特寵醫院查詢", "url": "https://www.genckobreeding.com/hospital" }
              ]
            },
            "sameAs": [
              "https://www.instagram.com/gencko_breeding",
              "https://www.facebook.com/profile.php?id=61579393505049",
              "https://line.me/R/ti/p/@219abdzn"
            ],
            "contactPoint": {
              "@type": "ContactPoint",
              "contactType": "customer service",
              "availableLanguage": ["Chinese", "zh-TW"]
            }
          })
        }
      ]
    }
  }
})
