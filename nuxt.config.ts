// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'
const gaId = process.env.NUXT_PUBLIC_GA_ID || 'G-93T0C2KMEZ'
const enableGa = process.env.NODE_ENV === 'production' || process.env.NUXT_PUBLIC_ENABLE_GA === 'true'

export default defineNuxtConfig({
  compatibilityDate: '2024-04-16',
  devtools: { enabled: true },

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
    registerType: 'prompt',
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
    disallow: ['/profile', '/identity/'],
    sitemap: 'https://www.genckobreeding.com/sitemap.xml'
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
      title: '專業豹紋守宮選育工作室',
      htmlAttrs: { lang: 'zh-TW' },
      meta:[
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, viewport-fit=cover' },
        { name: 'description', content: 'Gencko Studio 提供專業的豹紋守宮繁育、基因計算機與特寵飼養知識。線上選購守宮、查詢基因圖鑑的最佳平台。' },
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
        { name: 'theme-color', content: '#e6e3e3' }
      ],
      link:[
        { rel: 'preconnect', href: 'https://cdn.jsdelivr.net' },
        { rel: 'dns-prefetch', href: 'https://cdn.jsdelivr.net' },
        { rel: 'icon', href: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/11.png' },
        { rel: 'apple-touch-icon', href: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/11.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+TC:wght@300;400;500;700;900&family=Black+Ops+One&display=swap' }
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
            "name": "Gencko Studio",
            "alternateName": "捷客工作室",
            "url": "https://www.genckobreeding.com",
            "logo": "https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/11.png",
            "description": "Gencko Studio 是台灣專業的豹紋守宮（Eublepharis macularius）繁育工作室，提供基因計算機、飼養知識與線上競標服務。",
            "foundingDate": "2023",
            "areaServed": { "@type": "Country", "name": "Taiwan" },
            "knowsAbout": [
              "豹紋守宮（Leopard Gecko）",
              "肥尾守宮（African Fat-Tail Gecko）",
              "爬蟲繁育",
              "守宮基因選育",
              "Eublepharis macularius",
              "Hemitheconyx caudicinctus"
            ],
            "hasOfferCatalog": {
              "@type": "OfferCatalog",
              "name": "守宮個體選購",
              "url": "https://www.genckobreeding.com/shop"
            },
            "sameAs": [
              "https://www.instagram.com/gencko_breeding",
              "https://www.facebook.com/profile.php?id=61579393505049",
              "https://line.me/R/ti/p/@219abdzn"
            ],
            "contactPoint": {
              "@type": "ContactPoint",
              "contactType": "customer service",
              "availableLanguage": "Chinese"
            }
          })
        }
      ]
    }
  }
})
