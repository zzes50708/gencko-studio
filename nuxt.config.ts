// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-16',
  devtools: { enabled: true },

  // 註冊所需模組 (加入 sitemap 與 robots)
  modules:[
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/sitemap',
    '@nuxtjs/robots'
  ],

  // 設定正式網域 (Sitemap 需要知道你的網域才能產生絕對路徑)
  site: {
    url: 'https://www.genckobreeding.com',
    name: 'Gencko Studio'
  },

  // Sitemap 動態資料來源設定
  sitemap: {
    sources:[
      '/api/_sitemap-urls' // 我們等一下會建立這支 API 來動態抓取 Supabase 資料
    ]
  },

  // Supabase 設定
  supabase: {
    url: 'https://sfndneptcwhblvrxykcy.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmRuZXB0Y3doYmx2cnh5a2N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjYxMTcsImV4cCI6MjA4NTMwMjExN30.dN4MHhwjEM26coS9eZAW_eIQJplF8j9YHT9WyFypK3I',
    redirect: false
  },

  // 全域 CSS 引入
  css:[
    '~/assets/css/style.css'
  ],

  // 全域 Head / SEO 與資源載入
  app: {
    head: {
      titleTemplate: '%s | Gencko Studio',
      title: 'Gencko Studio｜專業豹紋守宮選育工作室',
      htmlAttrs: {
        lang: 'zh-TW'
      },
      meta:[
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' },
        { name: 'description', content: 'Gencko Studio 提供專業的豹紋守宮繁育、基因計算機與特寵飼養知識。線上選購守宮、查詢基因圖鑑的最佳平台。' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Gencko Studio' },
        { property: 'og:image', content: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png' },
        { name: 'twitter:card', content: 'summary_large_image' }
      ],
      link:[
        { rel: 'icon', href: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%9C%AA%E5%91%BD%E5%90%8D%E8%A8%AD%E8%A8%88.png' },
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