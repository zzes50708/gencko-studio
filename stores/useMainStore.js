import { defineStore } from 'pinia'
import { pageDataNeeds } from '~/utils/site-data-policy'
import { isAuctionListed, auctionState, readAuctionCatalog } from '~/utils/auction-presentation'
import { ref, computed, watch } from 'vue'
import { sanitizeCompareIds } from '~/utils/shop-catalog'
import { useSupabaseClient, useState } from '#imports'
import { sampleAuctionClock, auctionClockNow } from '~/utils/auction-detail'
import { useRouter } from 'vue-router'
import { memberFromSupabaseUser } from '~/utils/member-auth'
import { withRetry } from '~/utils/supabase-retry'
import {
  lineLoginOptions,
  createAuthSessionReader,
  signOutCurrentDevice,
  withAuthContextLock
} from '~/utils/line-login'
import { createLineLoginRelay } from '~/utils/line-login-relay'

export const useMainStore = defineStore('main', () => {
  const supabase = useSupabaseClient()
  const router = useRouter()
  const initialAuctionEpoch = useState('auction-global-epoch', () => Date.now())
  let auctionClockAnchor = {
    epoch: initialAuctionEpoch.value,
    monotonic: import.meta.client ? performance.now() : 0
  }
  const auctionNow = () =>
    import.meta.client ? auctionClockNow(auctionClockAnchor, performance.now()) : Date.now()
  async function syncAuctionClock() {
    if (!import.meta.client) return
    const sentAt = performance.now()
    try {
      const result = await $fetch('/api/server-time', {
        retry: 0,
        timeout: 4000,
        cache: 'no-store'
      })
      const sample = sampleAuctionClock(result.serverTime, sentAt, performance.now())
      if (sample) auctionClockAnchor = sample
    } catch {
      // 無法連線時沿用最近一次伺服器時間，避免退回裝置時鐘。
    }
  }

  // --- 核心狀態 ---
  const loading = ref(false)
  const dataError = ref(null)
  const inventoryLoaded = ref(false)
  const isDayMode = ref(true)
  const curTab = ref('home')

  // --- 資料儲存 ---
  const inv = ref([])
  const merchList = ref([])
  const articlesList = ref([])
  const articlesLoaded = ref(false)
  const articlesLoading = ref(false)
  const articlesError = ref(null)
  const genePages = ref([])
  const marqueeList = ref([])
  const hotList = ref([])
  const auctionList = ref([])
  const recentAuctionList = ref([])
  const setAuctionLists = (rows) => {
    const now = auctionNow()
    recentAuctionList.value = (rows || []).filter((a) => isAuctionListed(a, now))
    auctionList.value = recentAuctionList.value.filter((a) =>
      ['active', 'scheduled'].includes(auctionState(a, now).status)
    )
  }
  // 展場模式設定（來自 Supabase site_settings 單列表；表不存在時保持 null＝非展場）
  const siteSettings = ref(null)

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
  // mobileMenuOpen：已改為底部上拉式導覽，保留欄位會造成誤用，故移除
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

  // 🌟 並排比較清單（最多 3 隻）
  const compareList = ref([])
  let compareRestored = false
  const restoreCompare = () => {
    if (!import.meta.client || compareRestored) return
    try {
      compareList.value = sanitizeCompareIds(
        JSON.parse(localStorage.getItem('gencko_compare') || '[]')
      )
    } catch {
      compareList.value = []
    }
    compareRestored = true
  }
  watch(
    compareList,
    (value) => {
      if (!import.meta.client || !compareRestored) return
      try {
        localStorage.setItem('gencko_compare', JSON.stringify(sanitizeCompareIds(value)))
      } catch {
        /* 瀏覽器不允許儲存時，保留本次瀏覽的比較清單。 */
      }
    },
    { deep: true, flush: 'sync' }
  )
  const toggleCompare = (id) => {
    restoreCompare()
    const idx = compareList.value.indexOf(id)
    if (idx !== -1) {
      compareList.value.splice(idx, 1)
    } else if (compareList.value.length < 3) {
      compareList.value.push(id)
    }
  }
  const clearCompare = () => {
    compareList.value = []
  }

  // --- 資源連結 ---
  const careImg = ref(
    'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E7%92%B0%E5%A2%83.png'
  )
  const aboutImg = ref(
    'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/324500%20(1).png'
  )
  const logoUrl = ref(
    'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85'
  )
  const lineLink = ref('https://line.me/R/ti/p/@219abdzn')

  // --- Actions (Data Loading) ---
  let inventoryLoadPromise = null

  async function performInventoryLoad() {
    loading.value = true
    dataError.value = null

    // 1. animals（核心資料，控制 loading 狀態）＋ site_settings（展場模式）平行載入，
    //    讓展場設定在卡片渲染前就備妥，避免價格「先顯示原價再切成提示」的閃爍
    try {
      // 只選官網所需欄位，省略後台專用的 cost_price
      const [invRes, settingsRes] = await Promise.all([
        withRetry(
          () =>
            supabase
              .from('animals')
              .select(
                'id, source, species, morph, genes, gender_type, gender_value, birthday, listing_price, sold_price, status, note, image_url, is_hot, created_at, photo_updated_at'
              )
              .order('created_at', { ascending: false }),
          { label: 'animals' }
        ),
        // site_settings 為選用表；不存在／出錯時靜默維持非展場模式
        withRetry(() => supabase.from('site_settings').select('*').limit(1).maybeSingle(), {
          label: 'site_settings'
        }).catch(() => ({ data: null, error: true }))
      ])

      // 展場設定先套用（表不存在時保持 null＝非展場）
      if (settingsRes && !settingsRes.error) siteSettings.value = settingsRes.data || null

      const { data: invData, error: invErr } = invRes
      if (invErr) throw invErr

      inv.value = invData.map((i) => ({
        ID: String(i.id || '').trim(),
        Source: i.source,
        Species: i.species,
        Morph: i.morph,
        // genes 是 JSONB array，不需要 JSON.parse（CLAUDE.md 確認）
        Genes: Array.isArray(i.genes) ? i.genes : [],
        GenderType: i.gender_type,
        GenderValue: i.gender_value,
        Birthday: i.birthday,
        ListingPrice: i.listing_price,
        SoldPrice: i.sold_price,
        Status: i.status,
        Note: i.note,
        Tags: Array.isArray(i.tags) ? i.tags : [],
        ImageURL: i.image_url,
        // is_hot 是純 boolean（CLAUDE.md 確認）
        IsHot: i.is_hot === true,
        CreatedDate: i.created_at || new Date().toISOString(),
        PhotoUpdatedAt: i.photo_updated_at || i.created_at || null
      }))

      hotList.value = inv.value.filter((i) => i.IsHot === true)
      inventoryLoaded.value = true
    } catch (e) {
      console.error('讀取個體資料失敗:', e)
      dataError.value = e?.message || '商品資料載入失敗'
      inventoryLoaded.value = false
    } finally {
      loading.value = false
    }
  }

  let articlesLoadPromise = null
  function loadArticles() {
    if (articlesLoadPromise) return articlesLoadPromise
    if (articlesLoaded.value && !articlesError.value) return Promise.resolve()
    articlesLoading.value = true
    articlesError.value = null
    articlesLoadPromise = (async () => {
      try {
        const { data, error } = await withRetry(
          () =>
            supabase
              .from('articles')
              .select('id,title,summary,category,image_url,publish_date,author,keywords,status')
              .ilike('status', 'published'),
          { label: 'articles' }
        )
        if (error) throw error
        articlesList.value = (data || [])
          .map((a) => ({
            ID: a.id,
            Title: a.title,
            Category: a.category,
            Summary: a.summary,
            ImageURL: a.image_url,
            Author: a.author || 'Gencko Studio',
            PublishDate: a.publish_date || '',
            Keywords: a.keywords || ''
          }))
          .reverse()
        articlesLoaded.value = true
      } catch (error) {
        articlesError.value = '文章暫時無法載入，請稍後重試。'
      } finally {
        articlesLoading.value = false
        articlesLoadPromise = null
      }
    })()
    return articlesLoadPromise
  }

  const tableTasks = new Map()
  const tableReady = new Set()
  function loadSecondaryTable(table) {
    if (tableTasks.has(table)) return tableTasks.get(table)
    if (tableReady.has(table)) return Promise.resolve()
    const task = withRetry(() => supabase.from(table).select('*'), { label: table })
      .then(({ data, error }) => {
        if (error || !Array.isArray(data)) throw error || new Error('資料回應不完整')
        if (table === 'merchandise')
          merchList.value = data.map((m) => ({
            ItemID: m.item_id,
            Name: m.name,
            Description: m.description,
            Price: m.price,
            ImageURL: m.image_url,
            Category: m.category,
            Available: m.available,
            ExternalLink: m.external_link
          }))
        if (table === 'genetic_pages')
          genePages.value = data.map((g) => ({
            Name: g.name,
            ImageURL: g.image_url,
            Warning: g.warning,
            Brief: g.brief,
            Detail: g.detail,
            Source: g.source
          }))
        if (table === 'config') marqueeList.value = data.map((c) => ({ text: c.text, url: c.url }))
        tableReady.add(table)
      })
      .catch(() => {
        console.warn('次要資料暫時無法載入:', table)
      })
      .finally(() => tableTasks.delete(table))
    tableTasks.set(table, task)
    return task
  }
  function loadPageData(path) {
    const needs = pageDataNeeds(path)
    const tasks = [loadSecondaryTable('config')]
    if (needs.inventory) tasks.push(ensureInventoryLoaded())
    if (needs.articles) tasks.push(loadArticles())
    if (needs.genes) tasks.push(loadSecondaryTable('genetic_pages'))
    if (needs.merchandise) tasks.push(loadSecondaryTable('merchandise'))
    if (needs.auctions) tasks.push(loadAuctions())
    return Promise.allSettled(tasks)
  }

  function loadInventory() {
    if (inventoryLoadPromise) return inventoryLoadPromise

    const request = performInventoryLoad()
    inventoryLoadPromise = request
    request.finally(() => {
      if (inventoryLoadPromise === request) inventoryLoadPromise = null
    })
    return request
  }

  function loadDataFromAPI() {
    return loadPageData(router.currentRoute.value.path)
  }

  function ensureInventoryLoaded() {
    if (inventoryLoaded.value && !dataError.value) return Promise.resolve()
    return loadInventory()
  }

  // 展場模式：enabled 且（無日期或現在落在起訖區間內）
  const isExhibitionMode = computed(() => {
    const s = siteSettings.value
    if (!s || !s.exhibition_enabled) return false
    const now = Date.now()
    const start = s.exhibition_start ? new Date(s.exhibition_start).getTime() : null
    const end = s.exhibition_end ? new Date(s.exhibition_end).getTime() : null
    if (start && now < start) return false
    if (end && now > end) return false
    return true
  })
  const exhibitionNote = computed(
    () => siteSettings.value?.exhibition_note || '展場期間價格請洽現場'
  )

  const auctionLoading = ref(false)
  const auctionError = ref(null)
  let auctionReadTask = null
  let auctionReadPending = false
  function requestAuctionRefresh() {
    auctionReadPending = true
    void loadAuctions()
  }
  function loadAuctions() {
    // 共用同一讀取工作，讓列表能等到全站初始化的讀取完成再查價格。
    if (auctionReadTask) return auctionReadTask
    auctionReadTask = (async () => {
      do {
        auctionReadPending = false
        await readAuctions()
      } while (auctionReadPending)
    })().finally(() => {
      auctionReadTask = null
    })
    return auctionReadTask
  }
  async function readAuctions() {
    auctionLoading.value = true
    auctionError.value = null
    try {
      await syncAuctionClock()
      const { data: auctionsData, error } = await withRetry(
        async () => ({ data: await readAuctionCatalog(supabase, auctionNow()), error: null }),
        { label: 'auctions' }
      )

      if (error) throw error

      // 診斷：確認 animal_id 欄位是否存在（若 DB SQL 已執行，此值不為 undefined）
      if (auctionsData?.length > 0 && import.meta.client) {
        const sample = auctionsData[0]
        if (!('animal_id' in sample)) {
          console.warn(
            '[Gencko] auctions 表缺少 animal_id 欄位，請確認 Supabase SQL 是否已執行：\nALTER TABLE auctions ADD COLUMN IF NOT EXISTS animal_id text REFERENCES animals(id) ON DELETE SET NULL;'
          )
        }
      }

      setAuctionLists(auctionsData)

      if (import.meta.client && !isAuctionSubscribed.value) {
        supabase
          .channel('public:auctions')
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'auctions' },
            requestAuctionRefresh
          )
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'auctions' },
            requestAuctionRefresh
          )
          .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'auctions' },
            requestAuctionRefresh
          )
          .subscribe((status) => {
            // 訂閱成功或重連時補查斷線期間可能漏掉的異動。
            if (status === 'SUBSCRIBED') requestAuctionRefresh()
          })

        isAuctionSubscribed.value = true
      }
    } catch (error) {
      auctionError.value = '競標資料載入失敗，請重試。'
      console.error('讀取競標資料失敗:', error)
    } finally {
      auctionLoading.value = false
    }
  }

  // LIFF SDK 載入採延遲策略：預設不載入，只在以下兩種情境才會載入：
  //   1. 使用者剛從 LINE OAuth callback 回來（localStorage 有 gencko_line_redirect）
  //   2. 使用者主動點「LINE 登入」按鈕（loginWithLine 會先 await initLiff）
  // 平時不載入可省 30 KB sdk.js + 9 KB extension + api.line.me 連線
  let liffReadyPromise = null

  function initLiff() {
    // 改為回傳 Promise，呼叫方可 await SDK 載入完成
    if (!import.meta.client) return Promise.resolve(false)
    if (isLiffInitialized.value) return Promise.resolve(true)
    if (liffReadyPromise) return liffReadyPromise

    // 本機開發（localhost / 非正式網域）時，LIFF 會因 endpoint 不符合而噴 warning，故略過
    try {
      const endpointOrigin = 'https://www.genckobreeding.com'
      if (!window.location.origin.startsWith(endpointOrigin)) {
        return Promise.resolve(false)
      }
    } catch (e) {
      return Promise.resolve(false)
    }

    liffReadyPromise = new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
      script.async = true
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
          resolve(true)
        } catch (err) {
          console.error('LIFF 初始化失敗', err)
          resolve(false)
        }
      }
      script.onerror = () => {
        console.error('LIFF SDK 載入失敗')
        resolve(false)
      }
      document.head.appendChild(script)
    })
    return liffReadyPromise
  }

  // 偵測是否正在 LINE OAuth callback 流程中（reload-on-resume 需要 SDK 完成 init）
  function hasPendingLineAuth() {
    if (!import.meta.client) return false
    try {
      return !!localStorage.getItem('gencko_line_redirect')
    } catch (e) {
      return false
    }
  }

  const authSessionReader = createAuthSessionReader(supabase.auth, (session) => {
    currentUser.value = memberFromSupabaseUser(session?.user)
  })
  let lineRelay
  const lineLoginNeedsTransfer = ref(false)
  const lineLoginTransferId = ref('')
  const lineLoginError = ref('')
  const getLineRelay = () => {
    if (!lineRelay && import.meta.client)
      lineRelay = createLineLoginRelay({
        storage: {
          getItem: (key) => window.localStorage.getItem(key),
          setItem: (key, value) => window.localStorage.setItem(key, value),
          removeItem: (key) => window.localStorage.removeItem(key)
        },
        auth: supabase.auth,
        request: (body) =>
          $fetch('/api/auth/line/relay', { method: 'POST', body, retry: 0, timeout: 15000 })
      })
    return lineRelay
  }
  const resumeLineLogin = async () => {
    if (!import.meta.client) return null
    try {
      const relay = getLineRelay()
      const read = () => relay.resume()
      // 同瀏覽器多分頁共享 verifier，避免兩個分頁同時消耗一次性授權碼。
      const result = await withAuthContextLock(read)
      lineLoginError.value = ''
      if (result?.needsTransfer) {
        lineLoginTransferId.value = relay.pending()?.id || ''
        lineLoginNeedsTransfer.value = true
        return null
      }
      if (result) {
        lineLoginNeedsTransfer.value = false
        authSessionReader.accept(result.session)
      }
      return result
    } catch (error) {
      if (error?.message === 'LINE_LOGIN_RESTART') {
        lineLoginNeedsTransfer.value = false
        alert('LINE 登入尚未完成或已逾時，請重新點選 LINE 登入。')
      } else lineLoginError.value = '目前網路或登入服務不穩定，請稍後重試；不用重新取得接續碼。'
      return null
    }
  }
  const hasPendingLineLogin = () => {
    const pending = import.meta.client && !!getLineRelay()?.pending()
    if (!pending) lineLoginNeedsTransfer.value = false
    return pending
  }
  const completeLineLogin = async (transfer) => {
    try {
      getLineRelay().attachTransfer(transfer)
    } catch (error) {
      if (error?.message !== 'LINE_LOGIN_RESTART') throw error
      lineLoginNeedsTransfer.value = false
      alert('LINE 登入尚未完成或已逾時，請重新點選 LINE 登入。')
      return false
    }
    return !!(await resumeLineLogin())
  }
  const cancelLineLogin = () => {
    getLineRelay()?.cancel()
    lineLoginNeedsTransfer.value = false
    lineLoginTransferId.value = ''
    lineLoginError.value = ''
  }
  async function checkAuthStatus() {
    if (!import.meta.client) return
    await authSessionReader.read()
  }

  // 舊版 LIFF 個人資料不是網站認可的登入憑證；不再從 localStorage 還原成已驗證會員。
  function restoreLineUser() {
    if (!import.meta.client) return false
    try {
      localStorage.removeItem('gencko_line_user')
    } catch {}
    return false
  }

  if (import.meta.client) {
    supabase.auth.onAuthStateChange((_, session) => {
      authSessionReader.accept(session)
    })
  }

  let authLoginBusy = false
  let authLogoutBusy = false
  const loginWithLine = async () => {
    if (!import.meta.client || authLoginBusy || authLogoutBusy) return
    authLoginBusy = true
    try {
      const completed = await resumeLineLogin()
      if (completed) return
      await withAuthContextLock(async () => {
        const relay = getLineRelay()
        cancelLineLogin()
        await relay.settle()
        try {
          const redirectTo = await relay.start(lineLoginOptions(window.location.href).redirectTo)
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'custom:line-oauth',
            options: { redirectTo }
          })
          if (error) throw error
        } catch (error) {
          relay.cancel()
          throw error
        }
      })
    } catch (error) {
      if (error?.message === 'LINE_LOGIN_CANCELLED') return
      alert('LINE 登入暫時無法完成，請稍後重試。')
    } finally {
      authLoginBusy = false
    }
  }

  const loginWithGoogle = async () => {
    if (!import.meta.client || authLoginBusy || authLogoutBusy) return
    authLoginBusy = true
    try {
      await withAuthContextLock(async () => {
        cancelLineLogin()
        await getLineRelay()?.settle()
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: lineLoginOptions(window.location.href).redirectTo }
        })
        if (error) throw error
      })
    } catch (err) {
      console.error('Google 登入失敗:', err)
      alert('登入失敗，請稍後再試！')
    } finally {
      authLoginBusy = false
    }
  }

  const logout = async () => {
    if (authLogoutBusy) return
    authLogoutBusy = true
    cancelLineLogin()
    try {
      await getLineRelay()?.settle()
      await withAuthContextLock(async () => {
        cancelLineLogin()
        authSessionReader.invalidate()
        await signOutCurrentDevice(supabase.auth, () => authSessionReader.accept(null))
      })
    } catch {
      alert('登出未完成，請確認網路後重試。')
      return
    } finally {
      authLogoutBusy = false
    }
    try {
      if (window.liff?.isLoggedIn()) window.liff.logout()
    } catch {}
    try {
      localStorage.removeItem('gencko_line_user')
    } catch {}
  }

  function initTheme() {
    if (import.meta.client) {
      let savedTheme = null
      try {
        savedTheme = localStorage.getItem('gencko_theme')
      } catch {
        /* 禁止儲存時使用預設主題。 */
      }
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
      try {
        localStorage.setItem('gencko_theme', isDayMode.value ? 'light' : 'dark')
      } catch {
        /* 本次瀏覽仍可切換主題。 */
      }
    }
  }

  function initPWAInstallPrompt() {
    if (!import.meta.client) return

    isStandalone.value =
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
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
      alert(
        '您的瀏覽器目前不支援快捷安裝，請嘗試從瀏覽器選單中選擇「加到主畫面」或「安裝應用程式」。'
      )
    }
  }

  function openLightbox(item) {
    lightboxItem.value = item
    if (import.meta.client && window?.history) {
      try {
        window.history.pushState({ ...(window.history.state || {}), lightbox: true }, '')
      } catch (e) {}
    }
  }

  function closeLightbox() {
    lightboxItem.value = null
    if (import.meta.client && window?.history?.state?.lightbox) {
      try {
        window.history.back()
      } catch (e) {}
    }
  }

  if (import.meta.client) {
    window.addEventListener('popstate', () => {
      if (lightboxItem.value) lightboxItem.value = null
    })
  }

  function triggerToast() {
    showToast.value = true
    setTimeout(() => (showToast.value = false), 2000)
  }

  return {
    loading,
    dataError,
    inventoryLoaded,
    isDayMode,
    curTab,
    inv,
    merchList,
    articlesList,
    articlesLoaded,
    articlesLoading,
    articlesError,
    loadArticles,
    genePages,
    marqueeList,
    hotList,
    auctionList,
    recentAuctionList,
    siteSettings,
    isExhibitionMode,
    exhibitionNote,
    currentUser,
    wishlist,
    hospWishlist,
    history,
    showToast,
    lightboxItem,
    navHidden,
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
    canInstall,
    showIOSGuide,
    compareList,
    restoreCompare,
    toggleCompare,
    clearCompare,
    loadDataFromAPI,
    loadPageData,
    ensureInventoryLoaded,
    loadAuctions,
    auctionNow,
    auctionLoading,
    auctionError,
    initLiff,
    hasPendingLineAuth,
    restoreLineUser,
    checkAuthStatus,
    resumeLineLogin,
    hasPendingLineLogin,
    lineLoginNeedsTransfer,
    lineLoginTransferId,
    lineLoginError,
    cancelLineLogin,
    completeLineLogin,
    loginWithLine,
    loginWithGoogle,
    logout,
    initTheme,
    toggleTheme,
    initPWAInstallPrompt,
    installApp,
    openLightbox,
    closeLightbox,
    triggerToast
  }
})
