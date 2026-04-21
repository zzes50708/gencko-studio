// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-16',
  devtools: { enabled: true },

  // 註冊所需模組
  modules:[
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/sitemap',
    '@nuxtjs/robots',
    '@nuxt/image', // 🌟 新增圖片最佳化模組
    '@vite-pwa/nuxt' // 🌟 導入 PWA 模組
  ],

  // 🌟 Nuxt Image 設定
  image: {
    // 允許從哪些外部網域載入圖片進行最佳化
    domains:[
      'cdn.jsdelivr.net',
      'drive.google.com'
    ],
    // 定義各種裝置的斷點尺寸，讓系統自動產生不同大小的圖片
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1536,
    },
    // 預設將所有圖片轉換為最輕量的 webp 格式
    format: ['webp']
  },

  // 🌟 PWA 模組設定 (Progressive Web App)
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Gencko Studio',
      short_name: 'Gencko',
      description: 'Gencko Studio 提供專業的豹紋守宮繁育、基因計算機與特寵飼養知識。',
      theme_color: '#080808', // 配合深色背景的沉浸感
      background_color: '#080808',
      display: 'standalone', // 隱藏瀏覽器網址列，呈現 App 外觀
      orientation: 'portrait', // 鎖定為直向顯示
      icons:[
        {
          src: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%9C%AA%E5%91%BD%E5%90%8D%E8%A8%AD%E8%A8%88.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%9C%AA%E5%91%BD%E5%90%8D%E8%A8%AD%E8%A8%88.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%9C%AA%E5%91%BD%E5%90%8D%E8%A8%AD%E8%A8%88.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico,webp}'],
      // 設定動態 API 與圖片的快取策略，讓斷網時也能觀看已載入的內容
      runtimeCaching:[
        {
          urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'cdn-images-cache',
            expiration: {
              maxEntries: 200,
              maxAgeSeconds: 60 * 60 * 24 * 30 // 快取 30 天
            },
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        },
        {
          urlPattern: /^https:\/\/sfndneptcwhblvrxykcy\.supabase\.co\/rest\/v1\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'supabase-api-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 // 優先請求網路，失敗則使用1天內的快取
            },
            networkTimeoutSeconds: 5,
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        }
      ]
    },
    devOptions: {
      enabled: true,
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

  supabase: {
    url: 'https://sfndneptcwhblvrxykcy.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmRuZXB0Y3doYmx2cnh5a2N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjYxMTcsImV4cCI6MjA4NTMwMjExN30.dN4MHhwjEM26coS9eZAW_eIQJplF8j9YHT9WyFypK3I',
    redirect: false
  },

  css:[
    '~/assets/css/style.css'
  ],

  app: {
    head: {
      titleTemplate: '%s | Gencko Studio',
      title: 'Gencko Studio｜專業豹紋守宮選育工作室',
      htmlAttrs: {
        lang: 'zh-TW'
      },
      meta:[
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover' }, // 🌟 加入 viewport-fit=cover 支援 iOS 瀏海全螢幕
        { name: 'description', content: 'Gencko Studio 提供專業的豹紋守宮繁育、基因計算機與特寵飼養知識。線上選購守宮、查詢基因圖鑑的最佳平台。' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Gencko Studio' },
        { property: 'og:image', content: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
        // 🌟 Apple iOS PWA 支援配置
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Gencko' },
        { name: 'theme-color', content: '#080808' }
      ],
      link:[
        { rel: 'preconnect', href: 'https://cdn.jsdelivr.net' },
        { rel: 'dns-prefetch', href: 'https://cdn.jsdelivr.net' },
        { rel: 'icon', href: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%9C%AA%E5%91%BD%E5%90%8D%E8%A8%AD%E8%A8%88.png' },
        { rel: 'apple-touch-icon', href: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%9C%AA%E5%91%BD%E5%90%8D%E8%A8%AD%E8%A8%88.png' }, // 🌟 iOS 桌面圖標
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+TC:wght@300;400;500;700;900&family=Black+Ops+One&display=swap' },
        { rel: 'prefetch', as: 'image', href: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/Generated%20Image%20April%2015%2C%202026%20-%202_13PM%20(1).jpg' },
        { rel: 'prefetch', as: 'image', href: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%9C%AA%E5%91%BD%E5%90%8D%E8%A8%AD%E8%A8%88.png' }
      ],
      script:[
        { src: 'https://www.googletagmanager.com/gtag/js?id=G-Q97CS08YRH', async: true },
        {
          children: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-93T0C2KMEZ');
          `
        },
        { src: 'https://static.line-scdn.net/liff/edge/2/sdk.js', async: true }
      ]
    }
  }
})