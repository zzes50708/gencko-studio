<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl, getImageSrcset } from '~/utils/image'
import { serializeJsonLd } from '~/utils/structured-data'
import { seoPrice } from '~/utils/seo-head'
import { formatAnimalSex, formatAnimalPreviewSex, getAnimalSexTone } from '~/utils/incubation-sex'
import { getAnimalInquiryLink, getAnimalInquiryText } from '~/utils/animal-inquiry'
import { auctionState } from '~/utils/auction-presentation'

definePageMeta({
  key: (route) => route.fullPath
})

const route = useRoute()
const formatProductPrice = (amount) =>
  amount == null || amount === '' || !Number.isFinite(Number(amount))
    ? '售價未登錄'
    : `NT$ ${Number(amount).toLocaleString('zh-TW')}`
const catalogReturn = useState('shop-catalog-return', () => '/shop/all')
const store = useMainStore()
const supabase = useSupabaseClient()

const productId = String(route.params.id || '').trim()
const isHydrated = ref(false)
const mainPhotoRefs = ref([])

// 展場設定於 SSR 先載入到 store，避免個體頁價格「先顯示原價再切成提示」的閃爍
const { data: ssrSiteSettings } = await useAsyncData('product-site-settings', async () => {
  try {
    const { data, error } = await supabase.from('site_settings').select('*').limit(1).maybeSingle()
    if (error) return null
    return data || null
  } catch (e) {
    return null
  }
})
if (ssrSiteSettings.value) store.siteSettings = ssrSiteSettings.value

const {
  data: currentProduct,
  pending,
  error: productError,
  refresh: retryProduct
} = await useAsyncData(`product-${productId}`, async () => {
  if (!productId) return null
  try {
    const { data, error } = await supabase
      .from('site_public_animals')
      .select(
        'id, species, morph, genes, gender_type, gender_value, birthday, listing_price, status, note, image_url, created_at, photo_updated_at'
      )
      .eq('id', productId)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      console.warn('[product] 查無此個體或查詢失敗:', productId, error?.message)
      return null
    }

    return {
      ID: String(data.id || '').trim(),
      Species: data.species,
      Morph: data.morph,
      Genes: Array.isArray(data.genes) ? data.genes : [],
      GenderType: data.gender_type,
      GenderValue: data.gender_value,
      Birthday: data.birthday,
      ListingPrice: data.listing_price,
      Status: data.status,
      Note: data.note,
      ImageURL: data.image_url,
      CreatedDate: data.created_at,
      PhotoUpdatedAt: data.photo_updated_at || data.created_at
    }
  } catch (e) {
    console.error('[product] 載入失敗:', e)
    throw e
  }
})

// 目錄在返回頁面或重新連線後更新時，詳情的售價與售出狀態也同步更新。
watch(
  () => store.inv,
  (rows) => {
    if (!store.inventoryLoaded || store.dataError || productError.value || pending.value) return
    currentProduct.value = rows.find((item) => item.ID === productId) || null
  }
)

// 將日期／時間字串統一顯示為 YYYY-MM-DD（取不到則回傳空字串）
const fmtDate = (v) => {
  const m = String(v || '').match(/\d{4}-\d{2}-\d{2}/)
  return m ? m[0] : ''
}

const productModules = computed(() => {
  const p = currentProduct.value
  if (!p) return null
  let geneArray = Array.isArray(p.Genes) ? p.Genes : typeof p.Genes === 'string' ? [p.Genes] : []
  return {
    identity: {
      id: p.ID,
      morph: p.Morph,
      genes: geneArray,
      gender: p.GenderType,
      genderValue: p.GenderValue,
      birth: p.Birthday || '未登錄',
      uploadedAt: fmtDate(p.PhotoUpdatedAt || p.CreatedDate),
      note: p.Note || ''
    },
    visuals: {
      list: p.ImageURL ? [p.ImageURL] : []
    },
    health: {
      statement: '本工作室嚴格把關，所有上架個體均確認進食與排泄正常，無健康隱憂始開放選購。'
    },
    expectations: {
      notice: '守宮發色變化大，圖片僅供當下參考，請向官方索取最新照片'
    },
    transaction: {
      price: p.ListingPrice,
      status: p.Status
    }
  }
})

// 將 status 對應到 schema.org 標準 ItemAvailability
const statusToAvailability = (status) => {
  switch (status) {
    case 'ForSale':
      return 'https://schema.org/InStock'
    case 'Auction':
      return 'https://schema.org/LimitedAvailability'
    case 'Reserved':
      return 'https://schema.org/OutOfStock'
    case 'Sold':
      return 'https://schema.org/SoldOut'
    case 'SelfKeep':
      return 'https://schema.org/Discontinued'
    default:
      return 'https://schema.org/SoldOut'
  }
}

// 物種對應 productCategory（Google product taxonomy 沒有「守宮」分類，用通用爬蟲分類）
const speciesToCategory = (species) => {
  if (!species) return '寵物 > 爬蟲 > 守宮'
  return `寵物 > 爬蟲 > 守宮 > ${species}`
}

const siteData = computed(() => {
  if (currentProduct.value) {
    const p = currentProduct.value
    const sexSym = p.GenderType === '公' ? '♂' : p.GenderType === '母' ? '♀' : ''
    const title = `${p.Morph}${sexSym}`.trim()
    const geneStr = (p.Genes || []).join('、')
    const price = seoPrice(p.ListingPrice)
    const desc = `${p.Morph}（${formatAnimalSex(p, { fallback: '性別未定' })}），${p.Birthday ? `生日${p.Birthday}。` : ''}${price ? `售價NT$${price}。` : '售價請向官方確認。'}查看個體照片與資料，購買、交付及售後安排請依官網購買規定並向 Gencko 官方 LINE 確認。`
    const img = getCleanUrl(p.ImageURL)
    const url = `https://www.genckobreeding.com/product/${p.ID}`
    const identityUrl = `https://www.genckobreeding.com/identity/${p.ID}`

    // 動態組裝 additionalProperty
    const addProp = []
    if (geneStr) addProp.push({ '@type': 'PropertyValue', name: '基因組合', value: geneStr })
    if (p.GenderType)
      addProp.push({
        '@type': 'PropertyValue',
        name: '性別',
        value: formatAnimalSex(p)
      })
    if (p.Birthday) addProp.push({ '@type': 'PropertyValue', name: '孵化日', value: p.Birthday })
    if (p.Species) addProp.push({ '@type': 'PropertyValue', name: '物種', value: p.Species })

    const product = {
      '@type': 'Product',
      '@id': `${url}#product`,
      name: `${p.Morph}${geneStr ? `（${geneStr}）` : ''} ${sexSym} - ${p.ID}`.trim(),
      image: img ? [img] : [],
      description: desc,
      sku: p.ID,
      productID: p.ID,
      mpn: p.ID,
      category: speciesToCategory(p.Species),
      brand: {
        '@type': 'Brand',
        name: 'Gencko Breeding Studio',
        alternateName: ['Gencko Studio']
      },
      manufacturer: {
        '@type': 'Organization',
        name: 'Gencko Breeding Studio',
        url: 'https://www.genckobreeding.com'
      },
      ...(addProp.length ? { additionalProperty: addProp } : {}),
      subjectOf: { '@type': 'WebPage', '@id': identityUrl, name: '電子身分證' },
      ...(price
        ? {
            offers: {
              '@type': 'Offer',
              '@id': `${url}#offer`,
              url: url,
              priceCurrency: 'TWD',
              price,
              availability: statusToAvailability(p.Status),
              itemCondition: 'https://schema.org/NewCondition',
              businessFunction: 'http://purl.org/goodrelations/v1#Sell',
              areaServed: { '@type': 'Country', name: 'Taiwan' },
              seller: {
                '@type': 'Organization',
                name: 'Gencko Breeding Studio',
                alternateName: ['Gencko Studio'],
                url: 'https://www.genckobreeding.com',
                logo: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/11.png'
              }
            }
          }
        : {})
    }

    // WebPage 包覆，並聲明 SpeakableSpecification
    const webPageLd = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': url,
      url: url,
      name: title,
      inLanguage: 'zh-TW',
      isPartOf: { '@type': 'WebSite', '@id': 'https://www.genckobreeding.com/#website' },
      primaryImageOfPage: img ? { '@type': 'ImageObject', url: img } : undefined,
      mainEntity: product,
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['.prod-title', '.prod-guarantee']
      }
    }

    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: '首頁',
          item: 'https://www.genckobreeding.com/home'
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: '線上選購',
          item: 'https://www.genckobreeding.com/shop'
        },
        { '@type': 'ListItem', position: 3, name: p.Morph, item: url }
      ]
    }

    return {
      title,
      desc,
      img,
      url,
      script: [
        { type: 'application/ld+json', innerHTML: serializeJsonLd(webPageLd) },
        { type: 'application/ld+json', innerHTML: serializeJsonLd(breadcrumb) }
      ]
    }
  }

  return {
    title: productError.value ? '個體資料暫時無法載入' : '找不到此商品',
    desc: productError.value ? '請稍後重試，或返回選購列表。' : '該商品可能已下架或不存在。',
    img: 'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85',
    url: `https://www.genckobreeding.com/product/${productId}`,
    script: []
  }
})

useHead({
  title: computed(() => siteData.value.title),
  meta: [
    { name: 'description', content: computed(() => siteData.value.desc) },
    // Open Graph（FB 用 og:type=product 才會把商品資訊獨立解析）
    { property: 'og:title', content: computed(() => siteData.value.title) },
    { property: 'og:description', content: computed(() => siteData.value.desc) },
    { property: 'og:image', content: computed(() => siteData.value.img) },
    { property: 'og:image:alt', content: computed(() => `${siteData.value.title} - 守宮個體照片`) },
    { property: 'og:url', content: computed(() => siteData.value.url) },
    { property: 'og:type', content: 'product' },
    // Product-specific OG（Facebook Catalog / Pinterest Rich Pin）
    {
      property: 'product:price:amount',
      content: computed(() => String(currentProduct.value?.ListingPrice || ''))
    },
    { property: 'product:price:currency', content: 'TWD' },
    {
      property: 'product:availability',
      content: computed(() =>
        currentProduct.value?.Status === 'ForSale' ? 'in stock' : 'out of stock'
      )
    },
    { property: 'product:condition', content: 'new' },
    { property: 'product:brand', content: 'Gencko Breeding Studio' },
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: computed(() => siteData.value.title) },
    { name: 'twitter:description', content: computed(() => siteData.value.desc) },
    { name: 'twitter:image', content: computed(() => siteData.value.img) },
    { name: 'twitter:label1', content: '價格' },
    {
      name: 'twitter:data1',
      content: computed(() =>
        currentProduct.value?.ListingPrice ? `NT$ ${currentProduct.value.ListingPrice}` : ''
      )
    },
    { name: 'twitter:label2', content: '狀態' },
    {
      name: 'twitter:data2',
      content: computed(() => {
        const s = currentProduct.value?.Status
        return s === 'ForSale'
          ? '在售'
          : s === 'Auction'
            ? '競標中'
            : s === 'Reserved'
              ? '已預訂'
              : s === 'Sold'
                ? '已售出'
                : ''
      })
    }
  ],
  link: [{ rel: 'canonical', href: computed(() => siteData.value.url) }],
  script: computed(() => siteData.value.script)
})

const fmtSex = (i) => formatAnimalSex(i)
const getSexCls = (i) => getAnimalSexTone(i)

const matchedAuctionId = computed(() => {
  if (!currentProduct.value || currentProduct.value.Status !== 'Auction') return null
  const pid = currentProduct.value.ID
  const active = (store.auctionList || []).filter((a) => auctionState(a).status === 'active')
  return active.find((a) => a.animal_id === pid)?.id || null
})

const normalizeMorphName = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s·・\-_/（）()]+/g, '')

const getMorphSimilarity = (source, candidate) => {
  const a = normalizeMorphName(source)
  const b = normalizeMorphName(candidate)
  if (!a || !b) return 0
  if (a === b) return 1

  const shorterLength = Math.min(a.length, b.length)
  const longerLength = Math.max(a.length, b.length)
  if (a.includes(b) || b.includes(a)) return 0.8 + (shorterLength / longerLength) * 0.19
  if (shorterLength === 1) return 0

  const toBigrams = (text) =>
    Array.from({ length: text.length - 1 }, (_, index) => text.slice(index, index + 2))
  const aBigrams = toBigrams(a)
  const remaining = toBigrams(b)
  let matches = 0

  for (const bigram of aBigrams) {
    const matchIndex = remaining.indexOf(bigram)
    if (matchIndex === -1) continue
    matches += 1
    remaining.splice(matchIndex, 1)
  }

  return (2 * matches) / (aBigrams.length + (b.length - 1))
}

const relatedProducts = computed(() => {
  if (!currentProduct.value || !(store.inv || []).length) return []
  const p = currentProduct.value
  const pGenes = Array.isArray(p.Genes) ? p.Genes : []
  const availStatuses = ['ForSale', 'Auction', 'Reserved']

  return (store.inv || [])
    .filter((i) => i.ID !== p.ID && i.Species === p.Species && availStatuses.includes(i.Status))
    .map((i) => {
      const iGenes = Array.isArray(i.Genes) ? i.Genes : []
      const sharedGenes = pGenes.filter((g) => iGenes.includes(g)).length
      return {
        ...i,
        _morphSimilarity: getMorphSimilarity(p.Morph, i.Morph),
        _sharedGenes: sharedGenes
      }
    })
    .filter((i) => i._morphSimilarity > 0 || i._sharedGenes > 0)
    .sort(
      (a, b) =>
        b._morphSimilarity - a._morphSimilarity ||
        b._sharedGenes - a._sharedGenes ||
        (b.ImageURL ? 1 : 0) - (a.ImageURL ? 1 : 0) ||
        String(a.ID).localeCompare(String(b.ID))
    )
    .slice(0, 8)
})

const isWishlisted = computed(() =>
  currentProduct.value?.ID ? (store.wishlist || []).includes(currentProduct.value.ID) : false
)

const toggleWishlist = () => {
  const id = currentProduct.value?.ID
  if (!id) return

  if (isWishlisted.value) {
    store.wishlist = (store.wishlist || []).filter((itemId) => itemId !== id)
  } else {
    store.wishlist = [...(store.wishlist || []), id]
  }

  if (import.meta.client) {
    try {
      localStorage.setItem('gencko_wishlist', JSON.stringify(store.wishlist))
    } catch {
      /* 儲存被拒絕時仍可在本次瀏覽使用收藏，不中斷個體頁。 */
    }
  }
}

onMounted(() => {
  isHydrated.value = true
  // SSR 圖片可能早於觸控事件綁定失敗，掛載時補查一次。
  const failedPhoto = mainPhotoRefs.value.find((img) => img.complete && img.naturalWidth === 0)
  if (failedPhoto) onMainPhotoError(failedPhoto)
  if (currentProduct.value?.ID) {
    const id = currentProduct.value.ID
    store.history = [id, ...(store.history || []).filter((x) => x !== id)].slice(0, 50)
    try {
      localStorage.setItem('gencko_history', JSON.stringify(store.history))
    } catch (e) {}
  }
})

const shareStatus = ref('')
const manualShareUrl = ref('')
const shareLink = async () => {
  shareStatus.value = ''
  manualShareUrl.value = ''
  if (navigator.share) {
    try {
      await navigator.share({
        title: siteData.value.title,
        text: siteData.value.desc,
        url: window.location.href
      })
      return
    } catch (err) {
      if (err?.name === 'AbortError') return
    }
  }
  try {
    await navigator.clipboard.writeText(window.location.href)
    shareStatus.value = '連結已複製'
  } catch {
    shareStatus.value = '請選取下方連結手動複製。'
    manualShareUrl.value = window.location.href
  }
}
const photoFailed = ref(false)
const responsivePhoto = ref(true)
const onMainPhotoError = (image) => {
  const hasCandidates = !!getImageSrcset(currentProduct.value?.ImageURL)
  // 掛載補查及原生 error 可能指向同一個舊候選；不能把它誤判為原尺寸也失敗。
  if (hasCandidates && image?.hasAttribute('srcset') !== responsivePhoto.value) return
  if (responsivePhoto.value && hasCandidates) responsivePhoto.value = false
  else photoFailed.value = true
}
const retryMainPhoto = () => {
  responsivePhoto.value = true
  photoFailed.value = false
}
const failedRelatedPhotos = ref(new Set())
const markRelatedFailed = (id) => {
  failedRelatedPhotos.value = new Set([...failedRelatedPhotos.value, id])
}
const isCompared = computed(() => (store.compareList || []).includes(productId))
const toggleCompare = () => store.toggleCompare(productId)

const inquiryCopyStatus = ref('')
const copyInquiry = async () => {
  if (!currentProduct.value) return
  try {
    await navigator.clipboard.writeText(
      getAnimalInquiryText(currentProduct.value, { hidePrice: store.isExhibitionMode })
    )
    inquiryCopyStatus.value = '已複製個體 ID 與連結，可貼到私訊。'
  } catch {
    inquiryCopyStatus.value = '無法自動複製，請複製上方 ID 與網址。'
  }
}

const generatedImage = ref(null)
const isGenerating = ref(false)
const promoPagePath = route.path
const promoTriggerEl = ref(null)
const promoModal = useHistoryModal('product-promo')
const promoDialogEl = promoModal.dialog

const generatePromo = async () => {
  if (!currentProduct.value || isGenerating.value || route.path !== promoPagePath) return
  isGenerating.value = true
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1080
    const ctx = canvas.getContext('2d')
    const loadPromoImage = (url) =>
      new Promise((resolve, reject) => {
        const image = new Image()
        image.crossOrigin = 'Anonymous'
        const timer = setTimeout(() => {
          image.onload = image.onerror = null
          reject(new Error('圖卡圖片載入逾時'))
        }, 10000)
        image.onload = () => {
          clearTimeout(timer)
          resolve(image)
        }
        image.onerror = () => {
          clearTimeout(timer)
          reject(new Error('圖卡圖片無法載入'))
        }
        image.src = url
      })
    const photo = productModules.value.visuals.list[0]
    let img
    try {
      img = await loadPromoImage(photo ? getCleanUrl(photo) : '/logo.png')
    } catch (error) {
      if (!photo || route.path !== promoPagePath) throw error
      img = await loadPromoImage('/logo.png')
    }
    if (route.path !== promoPagePath) return
    const imgAreaHeight = 820
    ctx.filter = 'blur(40px)'
    const bgScale = Math.max(1080 / img.width, imgAreaHeight / img.height)
    const bgW = img.width * bgScale
    const bgH = img.height * bgScale
    ctx.drawImage(img, (1080 - bgW) / 2, (imgAreaHeight - bgH) / 2, bgW, bgH)
    ctx.filter = 'none'
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
    ctx.fillRect(0, 0, 1080, imgAreaHeight)
    const scale = Math.min(1080 / img.width, imgAreaHeight / img.height)
    const w = img.width * scale
    const h = img.height * scale
    const x = (1080 - w) / 2
    const y = (imgAreaHeight - h) / 2
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    ctx.shadowBlur = 20
    ctx.shadowOffsetY = 10
    ctx.drawImage(img, x, y, w, h)
    ctx.shadowColor = 'transparent'
    ctx.fillStyle = '#FF4500'
    ctx.fillRect(0, imgAreaHeight, 1080, 1080 - imgAreaHeight)
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'left'
    ctx.font = 'bold 75px sans-serif'
    ctx.fillText(productModules.value.identity.morph.substring(0, 16), 50, 930)
    ctx.font = 'bold 45px sans-serif'
    const genderVal = formatAnimalSex(currentProduct.value, { disclaimer: false, detail: false })
    if (genderVal && genderVal !== '未定') {
      ctx.fillText(`性別：${genderVal}`, 50, 1010)
    }
    ctx.textAlign = 'right'
    ctx.font = 'bold 65px Arial, sans-serif'
    ctx.fillText('GENCKO', 1030, 930)
    ctx.font = 'bold 65px Arial, sans-serif'
    ctx.fillText('STUDIO', 1030, 1000)
    generatedImage.value = canvas.toDataURL('image/jpeg', 0.9)
    promoModal.open()
  } catch (err) {
    if (route.path !== promoPagePath) return
    console.error('圖卡生成失敗', err)
    alert('圖片生成失敗，可能是因為網路跨域限制。')
  } finally {
    isGenerating.value = false
  }
}

const closePromo = () => promoModal.close()

useContentResponse(currentProduct, pending, productError)
</script>

<template>
  <div class="site-document-page product-root-container">
    <div class="product-page-wrapper">
      <div class="common-document-meta" aria-label="個體詳情說明">
        <span>GENCKO ANIMAL RECORD</span>
        <span>DETAIL / CARE / INQUIRE</span>
      </div>
      <div
        v-if="isHydrated && pending"
        class="detail-read-state"
        style="text-align: center; color: #888"
      >
        <div class="loader" style="margin: 0 auto 20px auto"></div>
        <p>正在尋找這隻守宮的資料...</p>
        <TheBackButton
          fallback="/shop/all"
          text="返回商城列表"
          style="margin: 20px auto; justify-content: center"
        />
      </div>

      <div v-else-if="productError" class="product-read-error" role="alert">
        <h2>個體資料載入失敗</h2>
        <button type="button" @click="retryProduct">重試資料</button>
        <TheBackButton fallback="/shop/all" text="返回商城列表" />
      </div>
      <div
        v-else-if="!currentProduct"
        class="detail-read-state"
        style="text-align: center; color: #888"
      >
        <h2>找不到此守宮</h2>
        <p>該商品可能已下架或不存在。</p>
        <TheBackButton
          fallback="/shop/all"
          text="返回商城列表"
          style="margin: 20px auto; justify-content: center"
        />
      </div>

      <div
        v-else-if="!productModules"
        class="detail-read-state"
        style="text-align: center; color: #888"
      >
        <div class="loader" style="margin: 0 auto 20px auto"></div>
        <p>資料載入中，請稍候...</p>
      </div>

      <div v-else class="prod-container">
        <div class="prod-topbar">
          <nav class="specimen-breadcrumb" aria-label="個體導覽">
            <NuxtLink no-prefetch to="/shop">選購分類</NuxtLink>
            <span aria-hidden="true">/</span>
            <NuxtLink no-prefetch :to="catalogReturn">個體清單</NuxtLink>
            <span aria-hidden="true">/</span>
            <span>{{ productModules.identity.id }}</span>
          </nav>
        </div>

        <div class="prod-layout specimen-layout">
          <div class="prod-img-box">
            <div v-if="productModules.transaction.status === 'Sold'" class="sold-stamp">
              SOLD OUT
            </div>
            <div class="prod-img-link" v-if="productModules.visuals.list.length && !photoFailed">
              <PhotoLens
                v-for="(img, idx) in productModules.visuals.list"
                :key="idx"
                :src="getCleanUrl(img, 1600)"
                fit="contain"
              >
                <img
                  :key="`${idx}-${responsivePhoto ? 'responsive' : 'original'}`"
                  ref="mainPhotoRefs"
                  :src="getCleanUrl(img)"
                  :srcset="responsivePhoto ? getImageSrcset(img) : undefined"
                  sizes="(max-width: 767px) calc(100vw - 24px), 55vw"
                  :alt="`${productModules.identity.morph}（${productModules.identity.id}）`"
                  @error="onMainPhotoError($event.target)"
                  class="prod-main-img"
                  :loading="idx === 0 ? 'eager' : 'lazy'"
                  :fetchpriority="idx === 0 ? 'high' : 'auto'"
                  decoding="async"
                />
              </PhotoLens>
            </div>
            <div v-else class="product-photo-fallback">
              {{ photoFailed ? '照片載入失敗' : '尚無照片' }}
              <button v-if="photoFailed" type="button" @click="retryMainPhoto">重試照片</button>
            </div>
          </div>
          <div class="prod-info-box specimen-information">
            <header class="prod-header">
              <span class="prod-id">{{ productModules.identity.id }}</span>
              <h1 class="prod-title">{{ productModules.identity.morph }}</h1>
            </header>
            <div class="prod-price-area">
              <template v-if="productModules.transaction.status === 'Sold'">
                <div class="price">
                  {{
                    productModules.transaction.price == null ||
                    productModules.transaction.price === ''
                      ? '售價未登錄'
                      : `NT$ ${productModules.transaction.price}`
                  }}
                </div>
                <span class="status-badge s-sold">已售出</span>
              </template>
              <template v-else-if="productModules.transaction.status === 'Auction'">
                <span class="status-badge s-auction">
                  {{ matchedAuctionId ? '競標中' : '場次待確認' }}
                </span>
              </template>
              <template v-else-if="productModules.transaction.status === 'Reserved'">
                <span class="status-badge">已預訂</span>
              </template>
              <template v-else-if="productModules.transaction.status === 'SelfKeep'">
                <span class="status-badge s-nfs">非賣（自留）</span>
              </template>
              <template v-else>
                <div v-if="store.isExhibitionMode" class="price exhibition-price">
                  {{ store.exhibitionNote }}
                </div>
                <div v-else class="price">
                  {{ formatProductPrice(productModules.transaction.price) }}
                </div>
              </template>
            </div>
            <section class="specimen-description" aria-label="個體資料">
              <h2>個體資料</h2>
              <dl class="specimen-facts">
                <div>
                  <dt>物種</dt>
                  <dd>{{ currentProduct.Species }}</dd>
                </div>
                <div>
                  <dt>性別</dt>
                  <dd class="sex-val">{{ fmtSex(currentProduct) }}</dd>
                </div>
                <div>
                  <dt>出生日期</dt>
                  <dd class="birth-val">{{ productModules.identity.birth }}</dd>
                </div>
                <div v-if="productModules.identity.uploadedAt">
                  <dt>照片更新</dt>
                  <dd>{{ productModules.identity.uploadedAt }}</dd>
                </div>
              </dl>
              <div v-if="productModules.identity.genes.length" class="gene-tag-row">
                <span v-for="g in productModules.identity.genes" :key="g" class="gene-pill">
                  {{ g }}
                </span>
              </div>
              <p v-if="productModules.identity.note" class="prod-note">
                {{ productModules.identity.note }}
              </p>
            </section>
            <p class="prod-identity-notice">{{ productModules.expectations.notice }}</p>
            <div class="prod-actions">
              <p v-if="shareStatus" role="status">{{ shareStatus }}</p>
              <input
                v-if="manualShareUrl"
                :value="manualShareUrl"
                readonly
                aria-label="手動複製個體連結"
                @focus="$event.target.select()"
              />
              <NuxtLink
                no-prefetch
                v-if="productModules.transaction.status === 'Auction'"
                :to="matchedAuctionId ? `/auction/${matchedAuctionId}` : '/auction'"
                class="btn-app btn-app--primary btn-app--lg btn-buy-lg"
              >
                {{ matchedAuctionId ? '前往競標場次' : '查看競標列表' }}
                <span class="prod-action-arrow" aria-hidden="true">↗</span>
              </NuxtLink>
              <a
                v-else-if="
                  productModules.transaction.status === 'ForSale' ||
                  productModules.transaction.status === 'Auction'
                "
                :href="
                  getAnimalInquiryLink(store.lineLink, currentProduct, {
                    hidePrice: store.isExhibitionMode
                  })
                "
                target="_blank"
                class="btn-app btn-app--primary btn-app--lg btn-buy-lg"
                rel="noopener noreferrer"
              >
                私訊購買（Line）
                <span class="prod-action-arrow" aria-hidden="true">↗</span>
              </a>
              <div class="action-sub-buttons">
                <button
                  type="button"
                  class="btn-app btn-app--secondary btn-app--md btn-compare"
                  :aria-pressed="isCompared"
                  @click="toggleCompare"
                >
                  <span class="prod-selection-mark" aria-hidden="true">
                    {{ isCompared ? '✓' : '+' }}
                  </span>
                  {{ isCompared ? '移出比較' : '加入比較' }}
                </button>
                <button
                  type="button"
                  class="btn-app btn-app--secondary btn-app--md btn-wishlist"
                  :class="{ 'btn-wishlist--active': isWishlisted }"
                  :aria-pressed="isWishlisted"
                  :aria-label="isWishlisted ? '取消收藏此個體' : '收藏此個體'"
                  @click="toggleWishlist"
                >
                  <span class="prod-selection-mark" aria-hidden="true">
                    {{ isWishlisted ? '✓' : '+' }}
                  </span>
                  {{ isWishlisted ? '已收藏' : '收藏' }}
                </button>
                <button
                  type="button"
                  class="btn-app btn-app--secondary btn-app--md btn-share"
                  @click="shareLink"
                >
                  分享連結
                </button>
                <button
                  type="button"
                  ref="promoTriggerEl"
                  class="btn-app btn-app--secondary btn-app--md btn-promo"
                  @click="generatePromo"
                  :disabled="isGenerating"
                >
                  {{ isGenerating ? '⏳ 生成中...' : '產生圖卡' }}
                </button>
              </div>
              <button
                type="button"
                class="btn-app btn-app--secondary btn-app--sm"
                @click="copyInquiry"
              >
                複製詢問內容（含 ID 與連結）
              </button>
              <p v-if="inquiryCopyStatus" role="status" style="font-size: 12px; margin: 0">
                {{ inquiryCopyStatus }}
              </p>
            </div>
            <details class="specimen-policy">
              <summary>
                健康、運送與購買須知
                <span aria-hidden="true">＋</span>
              </summary>
              <div class="guarantee-icons-row">
                <div class="g-icon-pill g-pill-green">100% 健康</div>
                <div class="g-icon-pill g-pill-blue">基因正確</div>
                <div class="g-icon-pill g-pill-orange">運輸賠償</div>
              </div>
              <div class="prod-terms-box">
                <div class="terms-title">取貨與購買須知</div>
                <ul class="terms-list">
                  <li>
                    Gencko工作室出貨前皆確認個體100%健康，所有個體皆為負責人親自餵食，確保進食穩定且無隱憂才會上架販售。
                  </li>
                  <li>開箱請全程錄影，以利於後續爭議處理。</li>
                  <li>有任何問題請於48小時內提出，逾期不候。</li>
                  <li>請提前準備好守宮之飼養環境。</li>
                  <li>守宮會因飼主飼養方式不當而造成問題，本工作室將不予退換貨。</li>
                  <li>
                    個體有缺陷且本工作室無事先告知，本方無條件退款 (需提供錄影確保個體無調包嫌疑)。
                  </li>
                  <li>
                    運送過程死亡，本工作室全額退款；運送過程斷尾，本工作室退還50%款項
                    (需提供錄影確保個體無調包嫌疑)。
                  </li>
                  <li>購買前請做足功課，本社群、官方皆可無償教學，請做好準備再進行購買。</li>
                  <li style="color: var(--pri); font-weight: bold; margin-top: 10px">
                    購買視同同意以上須知事項。
                  </li>
                </ul>
              </div>
            </details>
          </div>
        </div>
        <section v-if="relatedProducts.length > 0" class="related-section">
          <div
            class="section-head"
            style="margin-bottom: 14px; border-bottom: 1px solid var(--bd); padding-bottom: 10px"
          >
            <h2 class="sec-title" style="font-size: 1.2rem">相似個體推薦</h2>
            <NuxtLink
              no-prefetch
              to="/shop/all"
              class="sec-more"
              style="text-decoration: none; font-size: 0.85rem"
            >
              查看更多 →
            </NuxtLink>
          </div>
          <div class="related-grid">
            <NuxtLink
              no-prefetch
              v-for="item in relatedProducts"
              :key="item.ID"
              :to="`/product/${item.ID}`"
              class="related-card"
              style="text-decoration: none; color: inherit"
            >
              <div class="related-img-wrap">
                <img
                  v-if="item.ImageURL && !failedRelatedPhotos.has(item.ID)"
                  @error="markRelatedFailed(item.ID)"
                  :src="getCleanUrl(item.ImageURL, 300)"
                  :alt="item.Morph"
                  loading="lazy"
                  decoding="async"
                />
                <div v-else class="related-img-placeholder">🦎</div>
                <span v-if="item.Status === 'Sold'" class="rel-badge rel-sold">售出</span>
                <span v-else-if="item.Status === 'Auction'" class="rel-badge rel-auction">
                  競標
                </span>
              </div>
              <div class="related-info">
                <div class="related-card-heading">
                  <div class="related-morph" :title="item.Morph">{{ item.Morph }}</div>
                  <span class="related-card-arrow" aria-hidden="true">↗</span>
                </div>
                <div class="related-meta">
                  <span aria-label="生日">{{ item.Birthday || '未登錄' }}</span>
                  <span aria-label="性別或孵化溫度">{{ formatAnimalPreviewSex(item) }}</span>
                </div>
                <div class="related-price">
                  <span v-if="store.isExhibitionMode" style="color: var(--pri)">展場中</span>
                  <span v-else-if="item.Status === 'ForSale'">${{ item.ListingPrice }}</span>
                  <span v-else-if="item.Status === 'Auction'" style="color: var(--pri)">
                    競標中
                  </span>
                  <span v-else style="color: #888">已售出</span>
                </div>
              </div>
            </NuxtLink>
          </div>
        </section>
      </div>

      <Teleport to="body">
        <dialog
          ref="promoDialogEl"
          class="promo-modal-overlay"
          aria-labelledby="promo-dialog-title"
          @cancel.prevent="closePromo"
          @click.self="closePromo"
        >
          <div v-if="generatedImage" class="promo-modal-content" tabindex="-1" @click.stop>
            <button
              type="button"
              class="btn-app btn-app--ghost btn-app--sm btn-close-promo"
              autofocus
              aria-label="關閉宣傳圖卡"
              @click="closePromo"
            >
              <span aria-hidden="true">✕</span>
            </button>
            <h3 id="promo-dialog-title" style="color: var(--txt); margin-top: 10px">
              📸 宣傳圖卡已生成
            </h3>
            <p style="color: var(--txt); opacity: 0.8; font-size: 0.9rem">
              請長按圖片儲存（或點擊右鍵另存），
              <br />
              即可完美分享至 IG 限時動態！
            </p>
            <img
              :src="generatedImage"
              alt="Promo Result"
              class="promo-result-img"
              loading="lazy"
              decoding="async"
            />
          </div>
        </dialog>
      </Teleport>
    </div>
  </div>
</template>

<style scoped>
.product-root-container {
  padding-bottom: 40px;
}
.prod-container {
  max-width: 1280px;
  margin-inline: auto;
}
.prod-topbar {
  padding-block: 12px;
}
.prod-img-box {
  position: relative;
}
.sold-stamp {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 3;
  padding: 7px 12px;
  background: var(--txt);
  color: var(--bg-dark);
  font-size: 12px;
  letter-spacing: 0.08em;
}
.prod-img-link {
  width: 100%;
}
.prod-actions {
  display: flex;
  flex-direction: column;
}
.prod-actions > p {
  font-size: 12px;
  line-height: 1.7;
  margin: 0;
  overflow-wrap: anywhere;
}
.prod-actions > input {
  min-width: 0;
  min-height: 44px;
  padding: 8px;
}
.btn-buy-lg {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-decoration: none;
}
.prod-action-arrow {
  display: inline-grid;
  place-items: center;
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  border: 1px solid currentColor;
  border-radius: 50%;
}
.prod-selection-mark {
  display: inline-grid;
  place-items: center;
  width: 14px;
  font-size: 12px;
}
.gene-tag-row {
  display: flex;
  flex-wrap: wrap;
}
.status-badge {
  font-size: 12px;
  padding: 4px 8px;
  border: 1px solid var(--bd);
  color: var(--txt-muted);
}
.product-photo-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  aspect-ratio: 1;
  width: 100%;
  background: var(--card-bg);
  color: var(--txt-muted);
  font-size: 13px;
}
.product-photo-fallback button,
.product-read-error button {
  min-height: 44px;
  padding: 8px 14px;
}
.detail-read-state,
.product-read-error {
  padding: 40px 0;
  text-align: center;
}
.related-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px;
}
.related-card {
  min-width: 0;
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: var(--txt);
}
.related-img-wrap {
  position: relative;
  overflow: hidden;
  border-radius: 2px;
}
.related-img-placeholder {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  color: var(--txt-muted);
  font-size: 12px;
}
.related-card-heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 10px;
}
.related-morph {
  margin: 0;
  font: 600 14px/1.6 var(--font-body-zh);
  overflow-wrap: anywhere;
}
.related-card-arrow {
  display: grid;
  place-items: center;
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  color: var(--pri);
}
.related-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  font-size: 11px;
  color: var(--txt-muted);
  margin-top: 5px;
}
.related-price {
  font-size: 14px;
  color: var(--txt);
  margin-top: 6px;
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
}
.rel-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 3px 6px;
  background: var(--card-bg-solid);
  color: var(--txt);
  font-size: 11px;
}
.related-card:hover .related-morph {
  color: var(--pri);
}
.terms-list li {
  margin-bottom: 8px;
  overflow-wrap: anywhere;
}
dialog.promo-modal-overlay {
  margin: auto;
  width: min(560px, calc(100vw - 24px));
  max-height: calc(100dvh - 24px);
  padding: 24px;
  background: var(--card-bg-solid);
  color: var(--txt);
  border: 1px solid var(--bd);
  overflow: auto;
}
dialog.promo-modal-overlay::backdrop {
  background: rgb(0 0 0 / 65%);
}
.promo-modal-content {
  position: relative;
  padding-top: 24px;
  text-align: center;
}
.btn-close-promo {
  position: absolute;
  top: -12px;
  right: -12px;
  min-width: 44px;
  min-height: 44px;
}
.promo-result-img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: auto;
}
@media (max-width: 767px) {
  .related-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px 14px;
  }
}

/* 個體詳情：照片、名稱與價格優先，服務條款收在同一個開合區。 */
.product-root-container .prod-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
  gap: clamp(28px, 5vw, 80px);
  align-items: start;
  margin-top: 24px;
}
.product-root-container .prod-img-box {
  grid-area: auto;
  grid-row: auto;
  position: sticky;
  top: 88px;
  padding: 0;
  border: 0;
  border-radius: 3px;
  background: none;
  box-shadow: none;
  min-width: 0;
}
.product-root-container .prod-img-link {
  padding: 0;
  border: 0;
  background: none;
}
.product-root-container .prod-main-img {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  max-height: none;
  object-fit: contain;
  border: 0;
  border-radius: 3px;
  margin: 0;
}
.product-root-container .prod-info-box {
  display: block;
  grid-area: auto;
  padding: 0;
  border: 0;
  background: none;
  box-shadow: none;
  min-width: 0;
}
.product-root-container .prod-header {
  grid-area: auto;
  margin: 0;
  padding: 0;
  border: 0;
}
.product-root-container .prod-title {
  font-family: var(--font-heading-zh);
  font-size: clamp(24px, 2.8vw, 38px) !important;
  line-height: 1.45;
  letter-spacing: 0;
  margin: 8px 0 16px;
  overflow-wrap: anywhere;
}
.product-root-container .prod-id {
  display: block;
  background: none;
  padding: 0;
  border: 0;
  color: var(--txt-muted);
  font-size: 12px;
  letter-spacing: 0.08em;
}
.product-root-container .prod-price-area {
  grid-area: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin: 0 0 28px;
  padding: 0 0 24px;
  border: 0;
  border-bottom: 1px solid var(--bd);
  background: none;
}
.product-root-container .prod-price-area .price {
  color: var(--txt);
  font: 500 24px/1.4 var(--font-body-zh);
  overflow-wrap: anywhere;
}
.specimen-breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--txt-muted);
}
.specimen-breadcrumb a {
  color: inherit;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}
.specimen-description h2 {
  font-size: 13px;
  font-weight: 700;
  margin: 0 0 16px;
}
.specimen-facts {
  margin: 0 0 18px;
  display: grid;
  gap: 8px;
  font-size: 14px;
}
.specimen-facts > div {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 12px;
}
.specimen-facts dt {
  color: var(--txt-muted);
}
.specimen-facts dd {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: inherit;
  font-weight: 400;
  color: var(--txt);
}
.product-root-container .gene-tag-row {
  margin: 14px 0;
  gap: 6px;
}
.product-root-container .gene-pill {
  border: 1px solid var(--bd);
  background: none;
  color: var(--txt-muted);
  font: 400 12px/1.5 var(--font-body-zh);
  padding: 3px 7px;
  border-radius: 1px;
}
.product-root-container .prod-note {
  color: var(--txt);
  font-size: 14px;
  line-height: 1.8;
  padding: 0;
  border: 0;
  background: none;
  margin: 16px 0;
  white-space: pre-line;
  overflow-wrap: anywhere;
}
.product-root-container .prod-identity-notice {
  grid-area: auto;
  font-size: 12px;
  line-height: 1.8;
  color: var(--txt-muted);
  margin: 18px 0;
  padding: 0;
  border: 0;
  background: none;
}
.product-root-container .prod-actions {
  grid-area: auto;
  padding: 0;
  gap: 12px;
  width: 100%;
}
.product-root-container .btn-buy-lg {
  min-height: 52px;
  padding: 14px 18px;
  border-radius: 2px;
  font-size: 15px;
}
.product-root-container .action-sub-buttons {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}
.product-root-container .action-sub-buttons .btn-app {
  min-width: 0;
  min-height: 44px;
  padding: 9px 4px;
  border: 0;
  border-bottom: 1px solid var(--bd);
  border-radius: 0;
  background: transparent;
  font-size: 13px;
  white-space: normal;
}
.product-root-container .action-sub-buttons .btn-app[aria-pressed='true'] {
  color: var(--pri);
  background: none;
  border-bottom-color: var(--pri);
}
.product-root-container .prod-actions > button {
  min-height: 44px;
  white-space: normal;
  max-width: 100%;
  font-size: 12px;
}
.specimen-policy {
  border-block: 1px solid var(--bd);
  margin-top: 24px;
}
.specimen-policy > summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 52px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  list-style: none;
}
.specimen-policy > summary::-webkit-details-marker {
  display: none;
}
.specimen-policy[open] > summary {
  color: var(--pri);
}
.specimen-policy[open] > summary span {
  rotate: 45deg;
}
.specimen-policy .guarantee-icons-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0;
}
.specimen-policy .g-icon-pill {
  font-size: 11px;
  color: var(--txt-muted);
  padding: 4px 7px;
  background: none;
  border: 1px solid var(--bd);
  border-radius: 1px;
}
.specimen-policy .prod-terms-box {
  padding: 12px 0;
  border: 0;
  margin: 0;
  background: none;
  box-shadow: none;
}
.specimen-policy .terms-title {
  display: none;
}
.specimen-policy .terms-list {
  font-size: 12px;
  line-height: 1.8;
  margin: 0;
  padding-left: 18px;
}
.product-root-container .related-section {
  margin-top: 60px;
}
.product-root-container .related-card {
  border: 0;
  background: none;
  border-radius: 0;
  padding: 0;
  box-shadow: none;
}
.product-root-container .related-img-wrap {
  border: 0;
  padding: 0;
  aspect-ratio: 1;
  background: var(--card-bg);
}
.product-root-container .related-img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.product-root-container .related-info {
  padding: 12px 0;
}
.product-root-container :is(a, button, summary):focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: 3px;
}
@media (max-width: 767px) {
  .product-root-container .prod-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 26px;
  }
  .product-root-container .prod-img-box {
    position: static;
    grid-column: 1;
    grid-row: 1;
  }
  .product-root-container .prod-info-box {
    display: block;
    grid-column: 1;
    grid-row: 2;
  }
  .product-root-container .prod-header,
  .product-root-container .prod-price-area,
  .product-root-container .prod-actions,
  .product-root-container .prod-identity-notice {
    grid-area: auto;
  }
  .product-root-container .prod-title {
    font-size: 25px !important;
  }
  .product-root-container .prod-price-area {
    margin-bottom: 22px;
    padding-bottom: 20px;
  }
  .product-root-container .related-section {
    margin-top: 36px;
  }
}
</style>
