import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useSupabaseClient } from '#imports'
import { useRouter } from 'vue-router'

export const useMainStore = defineStore('main', () => {
  const supabase = useSupabaseClient()
  const router = useRouter()

  // --- 核心狀態 ---
  const loading = ref(false)
  const isDayMode = ref(true)
  const curTab = ref('home')

  // --- 資料儲存 ---
  const inv = ref([])
  const merchList = ref([])
  const articlesList = ref([])
  const genePages = ref([])
  const marqueeList = ref([])
  const hotList = ref([])
  const auctionList = ref([])

  // --- 使用者狀態 (Auth) ---
  const currentUser = ref(null)
  const wishlist = ref([])
  const hospWishlist = ref([])
  const history = ref([])
  
  const isLiffInitialized = ref(false)
  const isAuctionSubscribed = ref(false)

  // --- 全域 UI 狀態 ---
  const showToast = ref(false)
  const lightboxItem = ref(null)
  const navHidden = ref(false)
  const mobileMenuOpen = ref(false)
  const lastScrollY = ref(0)
  const displayLimit = ref(20)
  const readingArticle = ref(null)
  const readingProgress = ref(0)
  const viewingGene = ref(null)
  const geneSpecies = ref('豹紋守宮')

  // 🌟 PWA 安裝相關狀態
  const deferredPrompt = ref(null)
  const canInstall = ref(false)
  const isIOS = ref(false)
  const isStandalone = ref(false)
  const showIOSGuide = ref(false)

  // --- 資源連結 ---
  const careImg = ref('https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E7%92%B0%E5%A2%83.png')
  const aboutImg = ref('https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/324500%20(1).png')
  const logoUrl = ref('https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%9C%AA%E5%91%BD%E5%90%8D%E8%A8%AD%E8%A8%88.png')
  const lineLink = ref('https://line.me/R/ti/p/@219abdzn')

  // --- Actions (Data Loading) ---
  async function loadDataFromAPI() {
    loading.value = true

    // 1. animals（核心資料，獨立處理，控制 loading 狀態）
    try {
      // 只選官網所需欄位，省略後台專用的 cost_price
      const { data: invData, error: invErr } = await supabase
        .from('animals')
        .select('id, source, species, morph, genes, gender_type, gender_value, birthday, listing_price, sold_price, status, note, image_url, is_hot, created_at')
      if (invErr) throw invErr

      inv.value = invData.map(i => ({
        ID: String(i.id || '').trim(),
        Source: i.source,
        Species: i.species,
        Morph: i.morph,
        Genes: Array.isArray(i.genes) ? i.genes : (i.genes ? JSON.parse(i.genes) : []),
        GenderType: i.gender_type,
        GenderValue: i.gender_value,
        Birthday: i.birthday,
        ListingPrice: i.listing_price,
        SoldPrice: i.sold_price,
        Status: i.status,
        Note: i.note,
        ImageURL: i.image_url,
        // is_hot：後台存 boolean，容錯舊表字串 'Hot'
        IsHot: i.is_hot === true || i.is_hot === 'Hot' ? 'Hot' : '',
        CreatedDate: i.created_at || new Date().toISOString()
      }))

      hotList.value = inv.value.filter(i => i.IsHot === 'Hot')

      const { data: merchData } = await supabase.from('merchandise').select('*')
      if (merchData) {
        merchList.value = merchData.map(m => ({
          ItemID: m.item_id,
          Name: m.name,
          Description: m.description,
          Price: m.price,
          ImageURL: m.image_url,
          Category: m.category,
          Available: m.available,
          ExternalLink: m.external_link
        }))
      }

      const { data: artData } = await supabase.from('articles').select('*')
      if (artData) {
        articlesList.value = artData
          .filter(a => a.status === 'Published' || a.status === 'published')
          .map(a => ({
            ID: a.id,
            Title: a.title,
            Category: a.category,
            Summary: a.summary,
            Content: a.content,
            ImageURL: a.image_url,
            Author: a.author,
            PublishDate: a.publish_date,
            Keywords: a.keywords // 🌟 新增：撈取隱藏的關鍵字欄位
          }))
          .reverse()
      }

      const { data: geneData } = await supabase.from('genetic_pages').select('*')
      if (geneData) {
        genePages.value = geneData.map(g => ({
          Name: g.name,
          ImageURL: g.image_url,
          Warning: g.warning,
          Brief: g.brief,
          Detail: g.detail,
          Source: g.source
        }))
      }

      const { data: configData } = await supabase.from('config').select('*')
      if (configData) {
        marqueeList.value = configData.map(c => ({ text: c.text, url: c.url }))
      }
    } catch (e) {
      console.error('讀取個體資料失敗:', e)
    } finally {
      loading.value = false
    }

    // 2. 次要資料表：平行獨立載入，互不影響
    const [merchResult, artResult, geneResult, configResult] = await Promise.allSettled([
      supabase.from('merchandise').select('*'),
      supabase.from('articles').select('*'),
      supabase.from('genetic_pages').select('*'),
      supabase.from('config').select('*')
    ])

    if (merchResult.status === 'fulfilled' && !merchResult.value.error && merchResult.value.data) {
      merchList.value = merchResult.value.data.map(m => ({
        ItemID: m.item_id,
        Name: m.name,
        Description: m.description,
        Price: m.price,
        ImageURL: m.image_url,
        Category: m.category,
        Available: m.available,
        ExternalLink: m.external_link
      }))
    } else if (merchResult.status === 'rejected' || merchResult.value?.error) {
      console.error('讀取周邊商品失敗:', merchResult.reason || merchResult.value?.error)
    }

    if (artResult.status === 'fulfilled' && !artResult.value.error && artResult.value.data) {
      articlesList.value = artResult.value.data
        .filter(a => (a.status || '').toLowerCase() === 'published')
        .map(a => ({
          ID: a.id,
          Title: a.title,
          Category: a.category,
          Summary: a.summary,
          Content: a.content,
          ImageURL: a.image_url,
          Author: a.author || 'Gencko Studio',
          PublishDate: a.created_at,   // 新版 schema 使用 created_at
          Keywords: a.keywords || ''   // 新版 schema 無此欄位，預設空字串
        }))
        .reverse()
    } else if (artResult.status === 'rejected' || artResult.value?.error) {
      console.error('讀取文章失敗:', artResult.reason || artResult.value?.error)
    }

    if (geneResult.status === 'fulfilled' && !geneResult.value.error && geneResult.value.data) {
      genePages.value = geneResult.value.data.map(g => ({
        Name: g.name,
        ImageURL: g.image_url,
        Warning: g.warning,
        Brief: g.brief,
        Detail: g.detail,
        Source: g.source
      }))
    } else if (geneResult.status === 'rejected' || geneResult.value?.error) {
      console.error('讀取基因圖鑑失敗:', geneResult.reason || geneResult.value?.error)
    }

    if (configResult.status === 'fulfilled' && !configResult.value.error && configResult.value.data) {
      marqueeList.value = configResult.value.data.map(c => ({ text: c.text, url: c.url }))
    } else if (configResult.status === 'rejected' || configResult.value?.error) {
      console.error('讀取跑馬燈設定失敗:', configResult.reason || configResult.value?.error)
    }
  }

  async function loadAuctions() {
    try {
      const now = new Date().toISOString()
      const { data: auctionsData, error } = await supabase
        .from('auctions')
        .select('*')
        .eq('status', 'active')
        .gt('end_time', now)
        .order('end_time', { ascending: true })
        
      if (error) throw error

      // 診斷：確認 animal_id 欄位是否存在（若 DB SQL 已執行，此值不為 undefined）
      if (auctionsData?.length > 0 && import.meta.client) {
        const sample = auctionsData[0]
        if (!('animal_id' in sample)) {
          console.warn('[Gencko] auctions 表缺少 animal_id 欄位，請確認 Supabase SQL 是否已執行：\nALTER TABLE auctions ADD COLUMN IF NOT EXISTS animal_id text REFERENCES animals(id) ON DELETE SET NULL;')
        }
      }

      auctionList.value = auctionsData

      if (import.meta.client && !isAuctionSubscribed.value) {
        supabase.channel('public:auctions')
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auctions' }, payload => {
            const updatedAuction = payload.new
            const idx = auctionList.value.findIndex(a => a.id === updatedAuction.id)
            const isValid = updatedAuction.status === 'active' && updatedAuction.end_time > new Date().toISOString()
            if (idx !== -1) {
              if (isValid) {
                // 更新現有場次資料
                auctionList.value[idx] = { ...auctionList.value[idx], ...updatedAuction }
              } else {
                // 場次已結束或停用，從列表移除
                auctionList.value.splice(idx, 1)
              }
            } else if (isValid) {
              // 原本不在列表（如剛啟用的場次），加入尾端
              auctionList.value.push(updatedAuction)
            }
          })
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'auctions' }, payload => {
            const newAuction = payload.new
            const isValid = newAuction.status === 'active' && newAuction.end_time > new Date().toISOString()
            if (isValid) {
              auctionList.value.unshift(newAuction)
            }
          })
          .subscribe()

        isAuctionSubscribed.value = true
      }
    } catch (error) {
      console.error('讀取競標資料失敗:', error)
    }
  }

  function initLiff() {
    if (!import.meta.client || isLiffInitialized.value) return
    const script = document.createElement('script')
    script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
    script.onload = async () => {
      try {
        await window.liff.init({ liffId: '2009804483-8KRouTSr' })
        isLiffInitialized.value = true
        checkAuthStatus()
        if (window.liff.isLoggedIn()) {
          const redirectUrl = localStorage.getItem('gencko_line_redirect')
          if (redirectUrl) {
            localStorage.removeItem('gencko_line_redirect')
            const urlObj = new URL(redirectUrl)
            if (urlObj.pathname !== window.location.pathname) {
              router.push(urlObj.pathname + urlObj.search + urlObj.hash)
            }
          }
        }
      } catch (err) {
        console.error('LIFF 初始化失敗', err)
      }
    }
    document.head.appendChild(script)
  }

  async function checkAuthStatus() {
    if (!import.meta.client) return
    const { data } = await supabase.auth.getSession()
    if (data.session?.user) {
      currentUser.value = { 
        type: 'google', 
        email: data.session.user.email, 
        name: data.session.user.email.split('@')[0] 
      }
      return
    }
    if (window.liff && window.liff.isLoggedIn()) {
      const profile = await window.liff.getProfile()
      const idToken = window.liff.getDecodedIDToken()
      const emailOrId = (idToken && idToken.email) ? idToken.email : profile.userId
      currentUser.value = { 
        type: 'line', 
        name: profile.displayName, 
        email: emailOrId,
        picture: profile.pictureUrl
      }
    }
  }

  if (import.meta.client) {
    supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        currentUser.value = { 
          type: 'google', 
          email: session.user.email,
          name: session.user.email.split('@')[0]
        }
      } else if (currentUser.value?.type === 'google') {
        currentUser.value = null
      }
    })
  }

  const loginWithLine = () => {
    if (window.liff && !window.liff.isLoggedIn()) {
        localStorage.setItem('gencko_line_redirect', window.location.href)
        window.liff.login({ redirectUri: window.location.href })
    }
  }

  const loginWithGoogle = async () => {
    try {
        const { error } = await supabase.auth.signInWithOAuth({ 
            provider: 'google', 
            options: { redirectTo: window.location.href } 
        })
        if (error) throw error
    } catch (err) {
        console.error('Google 登入失敗:', err)
        alert('登入失敗，請稍後再試！')
    }
  }

  const logout = async () => {
    if (currentUser.value?.type === 'line' && window.liff) window.liff.logout()
    else await supabase.auth.signOut()
    currentUser.value = null
  }

  function initTheme() {
    if (import.meta.client) {
      const savedTheme = localStorage.getItem('gencko_theme')
      if (savedTheme === 'dark') {
        isDayMode.value = false
        document.documentElement.classList.remove('day-mode')
      } else {
        isDayMode.value = true
        document.documentElement.classList.add('day-mode')
      }
    }
  }

  function toggleTheme() {
    isDayMode.value = !isDayMode.value
    if (import.meta.client) {
      if (isDayMode.value) {
        document.documentElement.classList.add('day-mode')
      } else {
        document.documentElement.classList.remove('day-mode')
      }
      localStorage.setItem('gencko_theme', isDayMode.value ? 'light' : 'dark')
    }
  }

  function initPWAInstallPrompt() {
    if (!import.meta.client) return

    isStandalone.value = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    const ua = window.navigator.userAgent.toLowerCase()
    isIOS.value = /iphone|ipad|ipod/.test(ua)

    if (isStandalone.value) {
      canInstall.value = false
      return
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      deferredPrompt.value = e
      canInstall.value = true
    })

    if (isIOS.value) {
      canInstall.value = true
    }
  }

  async function installApp() {
    if (isIOS.value && !isStandalone.value) {
      showIOSGuide.value = true
    } else if (deferredPrompt.value) {
      deferredPrompt.value.prompt()
      const { outcome } = await deferredPrompt.value.userChoice
      if (outcome === 'accepted') {
        canInstall.value = false 
      }
      deferredPrompt.value = null
    } else {
      alert('您的瀏覽器目前不支援快捷安裝，請嘗試從瀏覽器選單中選擇「加到主畫面」或「安裝應用程式」。')
    }
  }

  function openLightbox(item) {
    lightboxItem.value = item
    if (import.meta.client && window && window.history) window.history.pushState({ lightbox: true }, '')
  }

  function closeLightbox() {
    if (import.meta.client && window && window.history && window.history.state?.lightbox) window.history.back()
    else lightboxItem.value = null
  }

  function triggerToast() {
    showToast.value = true
    setTimeout(() => showToast.value = false, 2000)
  }

  return {
    loading, isDayMode, curTab, inv, merchList, articlesList, genePages, marqueeList, hotList, auctionList,
    currentUser, wishlist, hospWishlist, history, showToast, lightboxItem, navHidden, mobileMenuOpen, lastScrollY,
    displayLimit, readingArticle, readingProgress, viewingGene, geneSpecies, careImg, aboutImg, logoUrl, lineLink,
    canInstall, showIOSGuide,
    loadDataFromAPI, loadAuctions, initLiff, checkAuthStatus, loginWithLine, loginWithGoogle, logout,
    initTheme, toggleTheme, initPWAInstallPrompt, installApp,
    openLightbox, closeLightbox, triggerToast
  }
})