import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useSupabaseClient } from '#imports'

export const useMainStore = defineStore('main', () => {
  const supabase = useSupabaseClient()

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

  // --- 使用者狀態 ---
  const wishlist = ref([])
  const hospWishlist = ref([])
  const history = ref([])

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
  
  // 記錄是否已訂閱過競標頻道
  const isAuctionSubscribed = ref(false)

  // --- 資源連結 ---
  const careImg = ref('https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E7%92%B0%E5%A2%83.png')
  const aboutImg = ref('https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/324500%20(1).png')
  const logoUrl = ref('https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%9C%AA%E5%91%BD%E5%90%8D%E8%A8%AD%E8%A8%88.png')
  const lineLink = ref('https://line.me/R/ti/p/@219abdzn')

  // --- Actions ---

  async function loadDataFromAPI() {
    loading.value = true
    try {
      const { data: invData, error: invErr } = await supabase.from('inventory').select('*')
      if (invErr) throw invErr

      inv.value = invData.map(i => ({
        ID: String(i.id || '').trim(),
        Source: i.source,
        Species: i.species,
        Morph: i.morph,
        Genes: i.genes ? JSON.parse(i.genes) :[],
        GenderType: i.gender_type,
        GenderValue: i.gender_value,
        Birthday: i.birthday,
        CostPrice: i.cost_price,
        ListingPrice: i.listing_price,
        SoldPrice: i.sold_price,
        Status: i.status,
        Note: i.note,
        ImageURL: i.image_url,
        IsHot: String(i.is_hot || '').trim(),
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
          .filter(a => a.status === 'Published')
          .map(a => ({
            ID: a.id,
            Title: a.title,
            Category: a.category,
            Summary: a.summary,
            Content: a.content,
            ImageURL: a.image_url,
            Author: a.author,
            PublishDate: a.publish_date
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
      console.error('Supabase 讀取失敗:', e)
    } finally {
      loading.value = false
    }
  }

  async function loadAuctions() {
    try {
      const { data: auctionsData, error } = await supabase
        .from('auctions')
        .select('*')
        .order('created_at', { ascending: false })
        
      if (error) throw error
      
      auctionList.value = auctionsData

      // 修正：檢查是否已經訂閱過，避免重複註冊報錯
      if (import.meta.client && !isAuctionSubscribed.value) {
        supabase.channel('public:auctions')
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auctions' }, payload => {
            const updatedAuction = payload.new
            const idx = auctionList.value.findIndex(a => a.id === updatedAuction.id)
            if (idx !== -1) {
              auctionList.value[idx] = { ...auctionList.value[idx], ...updatedAuction }
            }
          })
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'auctions' }, payload => {
            auctionList.value.unshift(payload.new)
          })
          .subscribe()
          
        isAuctionSubscribed.value = true
      }
    } catch (error) {
      console.error('讀取競標資料失敗:', error)
    }
  }

  function initTheme() {
    if (import.meta.client) {
      const savedTheme = localStorage.getItem('gencko_theme')
      if (savedTheme === 'dark') {
        isDayMode.value = false
        document.body.classList.remove('day-mode')
      } else {
        isDayMode.value = true
        document.body.classList.add('day-mode')
      }
    }
  }

  function toggleTheme() {
    isDayMode.value = !isDayMode.value
    if (import.meta.client) {
      if (isDayMode.value) {
        document.body.classList.add('day-mode')
      } else {
        document.body.classList.remove('day-mode')
      }
      localStorage.setItem('gencko_theme', isDayMode.value ? 'light' : 'dark')
    }
  }

  function openLightbox(item) {
    lightboxItem.value = item
    // 修正：改用 window.history 確認存在再操作，避免 SSR 期間報錯
    if (import.meta.client && window && window.history) {
      window.history.pushState({ lightbox: true }, '')
    }
  }

  function closeLightbox() {
    // 修正：增加對 window.history.state 的安全檢查
    if (import.meta.client && window && window.history && window.history.state?.lightbox) {
      window.history.back()
    } else {
      lightboxItem.value = null
    }
  }

  function triggerToast() {
    showToast.value = true
    setTimeout(() => {
      showToast.value = false
    }, 2000)
  }

  return {
    loading,
    isDayMode,
    curTab,
    inv,
    merchList,
    articlesList,
    genePages,
    marqueeList,
    hotList,
    auctionList,
    wishlist,
    hospWishlist,
    history,
    showToast,
    lightboxItem,
    navHidden,
    mobileMenuOpen,
    lastScrollY,
    displayLimit,
    readingArticle,
    readingProgress,
    viewingGene,
    geneSpecies,
    careImg,
    aboutImg,
    logoUrl,
    lineLink,
    loadDataFromAPI,
    loadAuctions,
    initTheme,
    toggleTheme,
    openLightbox,
    closeLightbox,
    triggerToast
  }
})