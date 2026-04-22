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
    domains:[
      'cdn.jsdelivr.net',
      'drive.google.com'
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
          urlPattern: /^https:\/\/sfndneptcwhblvrxykcy\.supabase\.co\/rest\/v1\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'supabase-api-cache',
            expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
            networkTimeoutSeconds: 5,
            cacheableResponse: { statuses: [0, 200] }
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

  // 🌟 全站應用程式設定
  app: {
    // 🌟 開啟全站路由轉場動畫
    pageTransition: { name: 'page', mode: 'out-in' },
    
    head: {
      titleTemplate: '%s | Gencko Studio',
      title: 'Gencko Studio｜專業豹紋守宮選育工作室',
      htmlAttrs: { lang: 'zh-TW' },
      meta:[
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover' },
        { name: 'description', content: 'Gencko Studio 提供專業的豹紋守宮繁育、基因計算機與特寵飼養知識。線上選購守宮、查詢基因圖鑑的最佳平台。' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Gencko Studio' },
        { property: 'og:image', content: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
        // 👇 這裡補上了通用的 PWA 標籤，解決瀏覽器警告
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Gencko' },
        { name: 'theme-color', content: '#e6e3e3' }
      ],
      link:[
        { rel: 'preconnect', href: 'https://cdn.jsdelivr.net' },
        { rel: 'dns-prefetch', href: 'https://cdn.jsdelivr.net' },
        { rel: 'icon', href: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%9C%AA%E5%91%BD%E5%90%8D%E8%A8%AD%E8%A8%88.png' },
        { rel: 'apple-touch-icon', href: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%9C%AA%E5%91%BD%E5%90%8D%E8%A8%AD%E8%A8%88.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+TC:wght@300;400;500;700;900&family=Black+Ops+One&display=swap' }
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
        }
      ]
    }
  }
})