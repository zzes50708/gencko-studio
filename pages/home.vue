<script setup>
// 原本首頁內容已搬到 /home（保留舊首頁供導覽使用）
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useHead } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image'
import heroGeckoUrl from '~/assets/NDBE.jpg'
import HotPicksMarquee from '~/components/home/HotPicksMarquee.vue'

const store = useMainStore()
const router = useRouter()

useHead({
  title: 'GENCKO專業選育工作室｜豹紋・肥尾守宮選購與新手飼養',
  meta: [
    {
      name: 'description',
      content:
        'Gencko Studio 專注於豹紋守宮繁育、提供基因計算機工具、全台特寵醫院地圖，以及豐富的飼養知識專欄。新手入門首選的爬蟲與守宮平台。'
    },
    {
      name: 'keywords',
      content: '守宮,豹紋守宮,肥尾守宮,守宮選育,守宮選購,守宮飼養,基因計算機,特寵醫院'
    },
    { property: 'og:title', content: '專業豹紋守宮選育與爬蟲知識 | Gencko Studio' },
    { property: 'og:description', content: '提供專業守宮選育、基因計算工具與特寵醫療地圖。' },
    { property: 'og:url', content: 'https://www.genckobreeding.com/home' },
    {
      property: 'og:image',
      content:
        'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85'
    }
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Gencko Studio',
        url: 'https://www.genckobreeding.com/',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://www.genckobreeding.com/shop?kw={search_term_string}',
          'query-input': 'required name=search_term_string'
        }
      })
    }
  ],
  link: [{ rel: 'canonical', href: 'https://www.genckobreeding.com/home' }]
})

// 透過 Pinia Store 取得資料
const loading = computed(() => store.loading)
const hotList = computed(() => store.hotList)
const articlesList = computed(() => store.articlesList)
const auctionList = computed(() => store.auctionList)
const hotRows = computed(() => {
  const items = hotList.value
  if (items.length === 0) return []
  if (items.length === 1) return [items, items]

  const midpoint = Math.ceil(items.length / 2)
  return [items.slice(0, midpoint), items.slice(midpoint)]
})

const hasActiveAuction = computed(() => {
  if (!auctionList.value || auctionList.value.length === 0) return false
  const now = new Date().getTime()
  return auctionList.value.some((a) => new Date(a.end_time).getTime() > now)
})

const fmtDate = (d) => {
  try {
    return new Date(d).toISOString().split('T')[0]
  } catch (e) {
    return ''
  }
}

const goToStarterGuide = () => {
  // 透過 query 傳遞參數，後續將在 Shop 頁面中接接並觸發篩選
  router.push('/start-here')
}

// 熱門精選：處理圖片載入失敗（避免部分卡片顯示成黑塊）
const hotImgErrorIds = ref(new Set())
const onHotImgError = (id) => {
  if (!id) return
  const next = new Set(hotImgErrorIds.value)
  next.add(id)
  hotImgErrorIds.value = next
}

// 圖片成功載入後，清掉該 id 的錯誤狀態（避免短暫錯誤導致之後一直顯示白底）
const onHotImgLoad = (id) => {
  if (!id) return
  if (!hotImgErrorIds.value.has(id)) return
  const next = new Set(hotImgErrorIds.value)
  next.delete(id)
  hotImgErrorIds.value = next
}

// 熱門精選：偵測是否有「不同個體共用同一張圖片」的資料問題（只在開發模式輸出）
watch(
  hotList,
  (list) => {
    if (!import.meta.dev) return
    if (!Array.isArray(list) || list.length === 0) return

    const normalizeForCompare = (raw) => {
      try {
        let t = String(raw || '').trim()
        if (!t) return ''
        // 盡量模擬 getCleanUrl 的正規化流程，用來抓「看似不同字串但其實同一張圖」的情況
        if (t.includes('wsrv.nl')) {
          try {
            const u = new URL(t)
            t = u.searchParams.get('url') || t
          } catch (e) {}
        }
        try {
          t = decodeURIComponent(t)
        } catch (e) {}
        if (t.includes('cdn.jsdelivr.net/gh/')) {
          t = t
            .replace('https://cdn.jsdelivr.net/gh/', 'https://raw.githubusercontent.com/')
            .replace('@main/', '/main/')
            .replace('@master/', '/master/')
        }
        t = t.replace(/^https?:\/\//, '')
        return t
      } catch (e) {
        return ''
      }
    }

    const byUrl = new Map()
    for (const item of list) {
      const url = (item?.ImageURL || '').trim()
      if (!url) continue
      const key = normalizeForCompare(url) || url
      if (!byUrl.has(key)) byUrl.set(key, [])
      byUrl.get(key).push({ id: item.ID, morph: item.Morph, url })
    }

    const duplicates = []
    for (const [url, items] of byUrl.entries()) {
      if (items.length >= 2) duplicates.push({ url, items })
    }

    if (duplicates.length) {
      console.warn('[Hot Picks] 發現多個個體共用同一張（正規化後）圖片：', duplicates)
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="home-page-wrapper">
    <!-- Hero Section -->
    <section class="home-header-wrap home-hero" aria-labelledby="home-hero-title">
      <div class="hero-content hero-content-inner">
        <div class="home-hero__copy">
          <p class="home-hero__eyebrow">GENCKO STUDIO · TAIWAN</p>
          <h1 id="home-hero-title">
            <span class="home-hero__line">專業守宮選育工作室，</span>
            <span class="home-hero__line">嚴選穩定血系。</span>
          </h1>
          <p class="home-hero__lede">
            專注豹紋與肥尾守宮選育。我們提供擁有優良基因的健康個體，讓你每次挑選都安心。
          </p>
          <div class="home-hero__actions" aria-label="首頁主要入口">
            <NuxtLink no-prefetch to="/shop" class="home-hero__action home-hero__action--primary">
              選購個體
            </NuxtLink>
            <NuxtLink
              no-prefetch
              to="/merch"
              class="home-hero__action home-hero__action--secondary"
            >
              周邊商品
            </NuxtLink>
          </div>
          <div class="home-hero__meta" aria-label="服務內容">
            <span>LEOPARD GECKO</span>
            <span>FAT-TAILED GECKO</span>
            <span>BREEDING · CARE · GENETICS</span>
          </div>
        </div>
        <NuxtLink
          no-prefetch
          to="/shop"
          class="home-hero__visual"
          aria-label="瀏覽 Gencko 現有守宮個體"
        >
          <img
            :src="heroGeckoUrl"
            alt="Gencko Studio 豹紋守宮"
            loading="eager"
            fetchpriority="high"
            decoding="async"
          />
          <div class="home-hero__caption">
            <span>GENCKO</span>
            <span>VIEW COLLECTION</span>
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- Scenarios Navigation -->
    <nav class="home-scenario-grid" aria-label="快速導覽">
      <div
        class="scenario-card"
        @click="goToStarterGuide"
        @keydown.enter.prevent="goToStarterGuide"
        @keydown.space.prevent="goToStarterGuide"
        role="button"
        tabindex="0"
      >
        <div class="scenario-body">
          <div class="scenario-index">01</div>
          <div class="scenario-title">新手必看</div>
        </div>
        <div class="scenario-hint">第一次養守宮，不用心急</div>
      </div>
      <NuxtLink no-prefetch to="/auction" class="scenario-card">
        <div v-if="hasActiveAuction" class="live-badge">LIVE</div>
        <div class="scenario-body">
          <div class="scenario-index">02</div>
          <div class="scenario-title">線上競標</div>
        </div>
        <div class="scenario-hint">即時出價，與飼主競拍心儀守宮</div>
      </NuxtLink>
      <NuxtLink no-prefetch to="/calculator" class="scenario-card">
        <div class="scenario-body">
          <div class="scenario-index">03</div>
          <div class="scenario-title">基因計算</div>
        </div>
        <div class="scenario-hint">預測繁殖基因的組合結果</div>
      </NuxtLink>
      <NuxtLink no-prefetch to="/hospital" class="scenario-card">
        <div class="scenario-body">
          <div class="scenario-index">04</div>
          <div class="scenario-title">特寵醫院</div>
        </div>
        <div class="scenario-hint">提前收藏就近的特寵就醫地點</div>
      </NuxtLink>
    </nav>

    <!-- Hot Picks Section -->
    <section class="home-section home-hot-picks" aria-labelledby="hot-picks-title">
      <div class="section-head hot-picks-head">
        <h2 id="hot-picks-title" class="sec-title">熱門精選</h2>
        <NuxtLink
          no-prefetch
          to="/shop"
          class="sec-more"
          style="text-decoration: none"
          aria-label="查看更多熱門商品"
        >
          查看商店 &rarr;
        </NuxtLink>
      </div>

      <div v-if="loading && hotList.length === 0" class="hot-skeleton-wrapper">
        <SkeletonCard
          v-for="n in 5"
          :key="n"
          style="width: 220px; flex-shrink: 0"
          :img-height="180"
        />
      </div>

      <div v-else-if="hotList.length > 0" class="hot-marquee-mask home-product-marquee">
        <div class="home-product-marquee__rows">
          <HotPicksMarquee
            v-for="(row, rowIndex) in hotRows"
            :key="`boutique-row-${rowIndex}`"
            :items="row"
            :image-error-ids="hotImgErrorIds"
            :duration="44"
            :row-key="`boutique-${rowIndex}`"
            :row-label="`熱門精選個體第 ${rowIndex + 1} 列`"
            @image-load="onHotImgLoad"
            @image-error="onHotImgError"
          />
        </div>
      </div>
      <div v-else class="empty-state-text">暫無熱門精選商品</div>
    </section>

    <!-- Latest Articles Section -->
    <section class="home-section articles-section" aria-labelledby="latest-articles-title">
      <div class="section-head">
        <h2 id="latest-articles-title" class="sec-title">最新文章</h2>
        <NuxtLink
          no-prefetch
          to="/articles"
          class="sec-more"
          style="text-decoration: none"
          aria-label="閱讀更多文章"
        >
          查看全部文章 &rarr;
        </NuxtLink>
      </div>
      <div class="grid article-grid">
        <article class="card article-card" v-for="item in articlesList.slice(0, 4)" :key="item.ID">
          <NuxtLink
            no-prefetch
            :to="`/articles/${item.ID}`"
            style="display: block; text-decoration: none; color: inherit; height: 100%"
          >
            <div style="position: relative; overflow: hidden">
              <!-- 🌟 核心修正：NuxtImg 替換為原生 img -->
              <img
                v-if="item.ImageURL"
                :src="getCleanUrl(item.ImageURL, 600)"
                :alt="item.Title"
                class="card-img"
                style="height: 180px"
                loading="lazy"
                decoding="async"
              />
              <div
                v-else
                class="card-img"
                style="
                  height: 180px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 3rem;
                  background: #1a1a1a;
                "
              >
                📝
              </div>
              <div class="art-cat-tag">{{ item.Category }}</div>
            </div>
            <div class="card-body">
              <time
                class="date-text"
                style="font-size: 0.8rem; color: #888; margin-bottom: 6px; display: block"
              >
                {{ fmtDate(item.PublishDate) }}
              </time>
              <h3
                class="slim-title"
                style="
                  font-size: 1.15rem;
                  margin-bottom: 6px;
                  white-space: normal;
                  line-height: 1.3;
                "
              >
                {{ item.Title }}
              </h3>
              <p class="art-summary" style="margin: 0">{{ item.Summary }}</p>
            </div>
          </NuxtLink>
        </article>
      </div>
    </section>

    <section class="home-section home-trust" aria-labelledby="home-trust-title">
      <div class="home-trust__intro">
        <h2 id="home-trust-title" class="sec-title">品牌與購買</h2>
        <p class="home-trust__lede">先知道為什麼GENCKO值得信任。</p>
      </div>
      <div class="home-trust__grid">
        <NuxtLink no-prefetch to="/about" class="home-trust__card home-trust__card--scene">
          <span class="home-trust__index">01</span>
          <span class="home-trust__scene-cue" aria-hidden="true"><span></span></span>
          <h3>認識工作室</h3>
          <p>進入品牌場景，認識 Gencko Studio。</p>
          <span class="home-trust__link">查看動畫 →</span>
        </NuxtLink>
        <NuxtLink no-prefetch to="/why-gencko" class="home-trust__card">
          <span class="home-trust__index">02</span>
          <h3>品牌與服務</h3>
          <p>先了解Gencko的品牌方向與現有服務入口。</p>
          <span class="home-trust__link">了解更多 →</span>
        </NuxtLink>
        <NuxtLink no-prefetch to="/buying-guide" class="home-trust__card">
          <span class="home-trust__index">03</span>
          <h3>購買流程</h3>
          <p>從挑選、詢問到確認，準備迎接心儀的守宮。</p>
          <span class="home-trust__link">查看流程 →</span>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* 
  [局部樣式修復] 
  已清除與 assets/css/style.css 重複的宣告，
  專注於首頁專屬的特殊元素佈局與行動端 App 化覆寫。
*/
.home-page-wrapper {
  width: 100%;
  overflow-x: hidden;
}

.home-hero {
  position: relative;
  padding-block: clamp(28px, 5vw, 64px) clamp(24px, 4vw, 48px);
  background:
    radial-gradient(circle at 18% 15%, rgba(255, 112, 42, 0.16), transparent 32%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.03), transparent 58%);
  border-bottom: 1px solid rgba(255, 110, 10, 0.18);
}

.home-hero__copy {
  flex: 1.15;
  min-width: 0;
}

.home-hero__eyebrow,
.home-section__eyebrow {
  margin: 0 0 12px;
  color: var(--pri);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.home-hero__lede {
  max-width: 40rem;
  margin: 18px 0 0;
  color: var(--muted, #777);
  font-size: clamp(1rem, 1.5vw, 1.18rem);
  line-height: 1.75;
}

.home-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.home-hero__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--control-min-height, 44px);
  padding: 10px 18px;
  border: 1px solid var(--pri);
  border-radius: 999px;
  font-weight: 800;
  text-decoration: none;
  transition:
    background-color 180ms ease,
    color 180ms ease,
    transform 180ms ease;
}

.home-hero__action--primary {
  background: var(--pri);
  color: #fff;
}

.home-hero__action--secondary {
  background: transparent;
  color: var(--pri);
}

.home-hero__action:focus-visible,
.home-trust__card:focus-visible {
  outline: 3px solid rgba(255, 145, 86, 0.75);
  outline-offset: 3px;
}

.home-trust {
  padding-block: clamp(32px, 5vw, 68px);
  border-top: 1px solid rgba(255, 110, 10, 0.14);
}

.home-trust__intro {
  max-width: 38rem;
  margin-bottom: 24px;
}

.home-trust__lede {
  margin: 10px 0 0;
  color: var(--muted, #777);
  line-height: 1.7;
}

.home-trust__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.home-trust__card {
  display: flex;
  min-height: 190px;
  flex-direction: column;
  padding: 22px;
  border: 1px solid var(--bd);
  border-radius: var(--radius-md, 14px);
  background: color-mix(in srgb, var(--card-bg-solid, #fff) 84%, var(--pri) 16%);
  color: var(--txt);
  text-decoration: none;
  transition:
    border-color 180ms ease,
    transform 180ms ease,
    box-shadow 180ms ease;
}

.home-trust__index {
  color: var(--pri);
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.home-trust__card h3 {
  margin: 18px 0 8px;
  font-size: 1.2rem;
}

.home-trust__card p {
  margin: 0;
  color: var(--muted, #777);
  line-height: 1.65;
}

.home-trust__link {
  margin-top: auto;
  padding-top: 18px;
  color: var(--pri);
  font-size: 0.9rem;
  font-weight: 800;
}

@media (min-width: 769px) and (hover: hover) and (pointer: fine) {
  .home-hero__action:hover {
    transform: translateY(-2px);
  }

  .home-hero__action--primary:hover {
    background: var(--pri-light, #f26b38);
  }

  .home-hero__action--secondary:hover,
  .home-trust__card:hover {
    background: rgba(255, 110, 10, 0.08);
    border-color: var(--pri);
  }

  .home-trust__card:hover {
    transform: translateY(-4px);
    box-shadow: 0 14px 28px rgba(57, 35, 23, 0.12);
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-hero__action,
  .home-trust__card {
    transition: none;
  }
}

/* 熱門輪播狀態小 badge */
.hot-stamp {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 2px 7px;
  border-radius: 10px;
  font-size: 0.68rem;
  font-weight: bold;
  color: #fff;
  z-index: 10;
  pointer-events: none;
}
.hot-stamp-sold {
  background: #555;
}
.hot-stamp-auction {
  background: var(--pri);
  box-shadow: 0 0 8px var(--pri-glow);
}

.live-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #e74c3c; /* 狀態警告色，保留 */
  color: #fff;
  font-size: 0.7rem;
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 20px;
  box-shadow: 0 4px 10px rgba(231, 76, 60, 0.4);
  animation: pulse-badge 1.5s infinite;
  z-index: 10;
}
@keyframes pulse-badge {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.home-header-wrap {
  padding: 0 10px 12px 10px;
  text-align: center;
}

/* 首頁社群按鈕微調覆寫 */
.btn-soc {
  background: var(--card-bg);
  border: 1px solid var(--bd);
  padding: 10px 20px;
  font-size: 0.9rem;
  border-radius: 30px;
  color: var(--txt);
  text-decoration: none;
  font-weight: bold;
  transition: 0.2s;
  opacity: 0.9;
}
.btn-soc:hover {
  transform: scale(1.05);
  opacity: 1;
  border-color: var(--pri);
  color: var(--pri);
}

/* ── Hero 桌機並排 ── */
@media (min-width: 769px) {
  /* 解除全域 max-width: 700px 限制 */
  .hero-content {
    max-width: none;
  }
  .hero-content-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 32px;
    width: 100%;
    text-align: left;
  }
  .home-hero__copy {
    max-width: 760px;
  }
  .hero-bento-gb {
    flex: 1;
  }
}

/* ── Scenario 卡片 ── */
.scenario-card {
  background: var(--card-bg);
  border: 1px solid var(--bd);
  /* icon 改到文字左側後，整體高度同步縮減 */
  padding: 10px 10px;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
  position: relative;
  overflow: hidden;
  box-shadow: 4px 4px 0 var(--scenario-shadow);
}
.scenario-card:active {
  transform: translate(4px, 4px);
  box-shadow: 0 0 0 var(--scenario-shadow);
}
.scenario-body {
  transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.scenario-icon {
  font-size: 2rem;
  margin-bottom: 0;
  line-height: 1;
}
.scenario-title {
  font-weight: bold;
  color: var(--pri);
  margin-bottom: 0;
  font-size: 0.95rem;
}

/* hint：僅桌機 hover 顯示 */
.scenario-hint {
  display: none;
}

@media (hover: hover) and (pointer: fine) {
  .scenario-hint {
    display: block;
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 10px 8px 12px;
    font-size: 0.88rem;
    font-weight: 600;
    color: #fff;
    background: linear-gradient(
      to top,
      rgba(232, 80, 10, 0.95) 0%,
      rgba(232, 80, 10, 0.6) 70%,
      transparent 100%
    );
    transform: translateY(100%);
    transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
    pointer-events: none;
    text-align: center;
    line-height: 1.3;
  }
  .scenario-card:hover .scenario-hint {
    transform: translateY(0);
  }
  /* hint 滑入時，body 同步往上推 ~20px */
  .scenario-card:hover .scenario-body {
    transform: translateY(-20px);
  }
  .scenario-card:hover {
    border-color: rgba(255, 110, 10, 0.6);
  }
}

/* 首頁區塊：桌機全透明，讓背景蜂巢紋路透出 */
.home-section {
  margin-bottom: 30px;
  background: transparent;
  padding: 20px 0;
  border-radius: 0;
  border: none;
  box-shadow: none;
}

.hot-picks-head {
  margin: 0;
  padding-bottom: 0;
  border-bottom: none;
}

/* ── Hero Bento 按鈕群 ── */
.hero-bento-gb {
  width: 100%;
}
.hero-bento {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  width: 100%;
}
.bento-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 10px;
  border-radius: 0;
  background: transparent;
  border: none;
  color: var(--txt);
  font-weight: 700;
  font-size: 0.95rem;
  text-decoration: none;
  transition:
    background 0.2s,
    color 0.15s;
  text-align: center;
  white-space: nowrap;
}
/* 上排三格之間的灰色垂直分隔線 */
.hero-bento .bento-btn:nth-child(1),
.hero-bento .bento-btn:nth-child(2) {
  border-right: 1px solid var(--bd);
}
.bento-btn--wide {
  grid-column: 1 / -1;
  background: var(--pri);
  color: #fff;
  box-shadow: 0 4px 14px var(--pri-glow);
  font-size: 1rem;
}
@media (hover: hover) and (pointer: fine) {
  .bento-btn:not(.bento-btn--wide):hover {
    color: var(--pri);
    background: rgba(255, 110, 10, 0.08);
  }
  /* wide 只改背景，不用 translateY 避免底部露出 gb-inner 背景 */
  .bento-btn--wide:hover {
    background: var(--pri-light);
  }
}
.bento-btn:active {
  transform: scale(0.97);
}

/* 熱門精選：區塊本體不要任何底色/陰影（避免看起來像卡片底部有一條灰色軌道） */
.home-section.home-hot-picks {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding-top: 4px;
  margin-bottom: 6px;
}

.home-section.articles-section {
  padding-top: 6px;
}

.hot-skeleton-wrapper {
  display: flex;
  gap: 15px;
  overflow: hidden;
  padding: 10px 0;
}

.empty-state-text {
  text-align: center;
  padding: 20px;
  color: var(--txt);
  opacity: 0.6;
  font-weight: bold;
}

/* 🌟 Mobile App-like Optimizations */
@media (max-width: 768px) {
  /* 僅限手機：熱門精選移到最上方，取代 Hero 標題（Hero 主標隱藏、熱門精選標題隱藏） */
  .home-page-wrapper {
    display: flex;
    flex-direction: column;
    padding: 0;
  }

  .home-hot-picks {
    order: 0;
    margin-top: 0;
  }

  .home-hero {
    order: 0;
    padding-top: 28px;
    padding-bottom: 24px;
  }

  .home-header-wrap {
    padding-bottom: 0;
  }

  .home-hero__eyebrow {
    margin-bottom: 10px;
    font-size: 0.68rem;
  }

  .home-hero__lede {
    margin-top: 14px;
    font-size: 0.96rem;
    line-height: 1.65;
  }

  .home-hero__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 18px;
  }

  .home-hero__action {
    padding-inline: 10px;
    font-size: 0.9rem;
    text-align: center;
  }

  /* 僅限手機：熱門精選 header 整排移除（不顯示標題/查看更多，也不佔高度） */
  .home-hot-picks .hot-picks-head {
    display: none;
  }

  /* 僅限手機：縮減（按鈕/內容）與熱門精選卡片的距離 */
  .hot-picks-head {
    margin-bottom: 0;
  }

  .home-hot-picks .hot-marquee-mask {
    padding-top: 0px !important;
    padding-bottom: 0px !important;
  }

  /* 僅限手機：熱門精選區塊最底層完全透明（移除任何底色/邊框造成的「灰色軌道」） */
  .home-section.home-hot-picks {
    background: transparent !important;
    box-shadow: none !important;
    border: none !important;
    border-bottom: none !important;
  }

  /* 僅限手機：縮小兩行外層容器間距 */
  .home-hot-picks .hot-marquee-rows {
    gap: 0px !important;
  }

  /* 既然主標已隱藏，就不需要再調整字級/間距 */

  .mobile-row-nowrap .btn-line-join {
    width: 100%;
    padding: 5px 0;
    font-size: 0.95rem;
    height: auto;
    line-height: 1.2;
  }

  .hero-btn-group {
    margin-bottom: 8px !important;
  }

  .social-group {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
    width: 100%;
    margin-bottom: 15px;
  }

  .social-group .btn-soc {
    padding: 5px 0;
    font-size: 0.85rem;
    width: 100%;
    text-align: center;
    height: auto;
    line-height: 1.2;
    margin-bottom: -25px;
  }

  /* 手機：桌機版 scenario grid 不顯示（改用獨立的 scenario bento） */
  .home-scenario-grid {
    display: none;
  }

  /* 手機：新手入門四顆（scenario bento）高度大幅縮減 */
  .home-scenario-bento-wrap {
    margin-top: 0;
  }

  .scenario-card {
    padding: 5px 0px;
    border-radius: 10px;
  }

  .scenario-icon {
    font-size: 1rem;
    margin-bottom: 0;
  }

  .scenario-title {
    font-size: 0.9rem;
    margin-bottom: 0px;
  }

  .scenario-desc {
    font-size: 0rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .home-section {
    padding: 0px 0;
    margin-bottom: 0;
    border-radius: 0;
    border-left: none;
    border-right: none;
    background: transparent !important;
    box-shadow: none !important;
    border-bottom: 1px solid var(--bd);
  }

  .section-head {
    padding: 0 15px;
    margin-bottom: 5px;
    border-bottom: none;
  }

  .hot-marquee-mask {
    /* 取消左右 padding，讓左右邊界陰影都覆蓋到卡片內容，視覺才會對稱 */
    padding-left: 0px;
    padding-right: 0px;
    padding-top: 16px;
    padding-bottom: 16px;
    overflow-x: hidden;
    overflow-y: visible;
    background: transparent !important;
    /* 外層容器全透明：關閉 mask 漸層，避免出現「上面較透明/下面較不透明」的灰色軌道視覺 */
    mask-image: none !important;
    -webkit-mask-image: none !important;
  }

  .hot-marquee-rows {
    display: grid;
    grid-template-rows: auto auto;
    gap: 22px;
  }

  .hot-card-item {
    width: 100px;
    border-radius: 6px;
  }

  .card-img {
    height: 93px;
  }

  .card-body {
    padding: 6px !important;
  }

  .slim-title {
    font-size: 0.8rem !important;
    line-height: 1.2 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    margin-bottom: 0 !important;
  }

  .article-grid {
    padding: 0 15px;
    grid-template-columns: 1fr;
  }

  .home-trust {
    padding: 30px 15px;
  }

  .home-trust__grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .home-trust__card {
    min-height: 0;
    padding: 18px;
  }
}

@media (max-width: 768px) {
  /* 手機：IG 三顆按鈕高度大幅縮減（保留桌面版的貼齊/分隔線形式） */
  .hero-bento:not(.hero-bento--scenario) .bento-btn:not(.bento-btn--wide) {
    padding: 8px 0;
    font-size: 0.85rem;
  }

  /* 手機：加入社群按鈕也同步縮減 */
  .bento-btn--wide {
    grid-column: 1 / -1;
    padding: 9px 10px;
    font-size: 0.9rem;
  }

  /* 手機：快速導覽四個按鈕要四個並排，且間距為 0（同桌機 IG 三顆的貼齊感） */
  .hero-bento--scenario {
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
  }

  /* 四顆之間的垂直分隔線（貼齊） */
  .hero-bento--scenario .bento-btn--scenario:nth-child(1),
  .hero-bento--scenario .bento-btn--scenario:nth-child(2),
  .hero-bento--scenario .bento-btn--scenario:nth-child(3) {
    border-right: 1px solid var(--bd);
  }

  /* 手機：新手入門四顆按鈕高度大幅縮減 */
  .hero-bento--scenario .bento-btn--scenario {
    padding: 8px 0;
    font-size: 0.82rem;
  }
}

.mobile-only {
  display: none;
}
@media (max-width: 768px) {
  .mobile-only {
    display: block;
  }
  .home-scenario-bento-wrap {
    margin-top: 0;
  }
  .hero-bento--scenario {
    margin-top: 0;
  }
}

/* 手機：新手入門四顆按鈕外框改用陰影（移除 GradientButton 特效） */
.scenario-bento-box {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: var(--card-bg);
  border: 1px solid var(--bd);
  box-shadow: 4px 4px 0 var(--scenario-shadow);
}

/* 手機：讓「新手入門四顆」區塊寬度與上方 IG 三顆一致（同樣吃到 home-header-wrap 的左右 padding） */
@media (max-width: 768px) {
  .home-scenario-bento-wrap {
    padding: 0 10px;
    box-sizing: border-box;
  }
}

/* 熱門精選：桌機才使用 3D 傾斜，手機保留輕量縮放與重疊 */
/* 注意：scoped style 內的 `:root {}` 會被加上 scope attribute 而失效
   所以這些 CSS 變數改掛在熱門精選容器上，確保一定生效。 */
.hot-marquee-mask {
  /* 熱門精選卡片大小（桌機預設） */
  --hot-card-scale: 0.88;
  --hot-card-w: 200px;
  --hot-card-h: 170px;
  /* 左卡蓋住右卡 1/4（視覺上縮小後，重疊也要跟著縮小） */
  --hot-card-overlap: calc(var(--hot-card-w) * var(--hot-card-scale) * 0.25);
  /* 橘色背板偏移 */
  --hot-orange-x: 6px;
  --hot-orange-y: 5px;

  padding-block: 0;
  overflow-x: hidden;
  overflow-y: visible;
  background: transparent !important;
  mask-image: none !important;
  -webkit-mask-image: none !important;
}

/* 手機：縮小一點，但動畫/傾斜/重疊一致（不做 hover 回正） */
@media (max-width: 767px) {
  .hot-marquee-mask {
    --hot-card-scale: 0.88;
    --hot-card-w: 150px;
    --hot-card-h: 130px;
    --hot-card-overlap: calc(var(--hot-card-w) * var(--hot-card-scale) * 0.25);
    padding-block: 0px;
  }
}

:deep(.app-marquee) {
  overflow-x: hidden;
  overflow-y: visible;
  background: transparent !important;
}

/* 移除 track 在兩組內容之間的 gap，避免頭尾接縫出現空隙 */
:deep(.app-marquee__track) {
  gap: 0;
  background: transparent !important;
}

:deep(.app-marquee__group) {
  gap: 0;
  background: transparent !important;
}

/* 消除循環接縫：讓第二份內容的第一張卡也吃到「1/4 重疊」 */
:deep(.app-marquee__group + .app-marquee__group) {
  margin-left: calc(var(--hot-card-overlap, 44px) * -1);
}

:deep(.hot-card-wrap) {
  width: var(--hot-card-w, 200px);
  position: relative;
  transform-origin: 50% 50%;
  transform: scale(var(--hot-card-scale, 0.88)) !important;
  transition: none;
  will-change: auto;
  /* 讓左邊卡片層級高於右邊（idx 越小，z-index 越大） */
  z-index: calc(1000 - (var(--hot-i, 0) * 2));
  /* 讓背板/陰影在卡片本體外也能正常呈現（避免被隔壁卡片或容器堆疊吃掉） */
  isolation: isolate;
  /* 陰影改掛在外層，避免白卡 box-shadow 在底部疊出「灰色軌道」 */
  /* 移除外層陰影（避免底部出現軌道感） */
  filter: none !important;
}

:deep(.hot-card-back) {
  position: absolute;
  /* 略縮小背板，避免光暈在白卡四周形成一圈「橘框」的錯覺 */
  inset: 2px;
  border-radius: calc(var(--radius-md) - 2px);
  /* 橘色背板：透明度 50% */
  background: rgba(255, 108, 0, 0.5);
  transform: translate(var(--hot-orange-x, 10px), var(--hot-orange-y, 8px));
  /* 只保留偏移光暈，不做 blur（blur 會向四周擴散，容易看起來像白卡有橘框） */
  filter: drop-shadow(6px 5px 12px rgba(255, 108, 0, 0.16));
  z-index: 0;
  pointer-events: none;
}

:deep(.home-hot-picks .hot-card-item) {
  position: relative;
  z-index: 1;
  width: 100%;
  height: var(--hot-card-h, 170px);
  background: var(--card-bg-solid);
  /* 白卡片：不要框線 */
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  filter: none !important;
  border-radius: var(--radius-md);
  overflow: hidden;
  /* 傾斜改由 .hot-card-wrap 負責，避免被全域 .hot-card-item:hover transform 影響 */
  transform: none !important;
  /* 卡片本體：黑陰影，增加立體感 */
  transition:
    box-shadow 220ms ease,
    border-color 220ms ease;
}

/* 舊的 .card-img 規則保留在全站，但熱門精選已改用 .hot-card-media/.hot-card-img */

/* 熱門精選：圖片完全貼合卡片的媒體區塊（不受全站 .card-img 固定高度影響） */
:deep(.hot-card-media) {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  /* 保持完全透明，避免形成「軌道底色」 */
  background: transparent !important;
}

:deep(.hot-card-link) {
  display: block;
  height: 100%;
  text-decoration: none;
  color: inherit;
  position: relative;
}

:deep(.hot-card-layer) {
  position: relative;
  height: 100%;
}

:deep(.hot-card-img) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

:deep(.hot-card-img--placeholder) {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 2.6rem;
  background: transparent !important;
}

:deep(.hot-card-body-overlay) {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 10px 10px 10px 10px;
  text-align: center;
  /* 如果這段漸層被視覺誤認為「灰色軌道」，就讓它完全透明（文字仍靠 text-shadow 保持可讀） */
  background: transparent;
  pointer-events: none;
}

:deep(.hot-card-title) {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.2;
  color: #fff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.hot-card-wrap:not(:first-child)) {
  /* 左卡蓋右卡 1/4（以縮放後的可視寬度計算） */
  margin-left: calc(var(--hot-card-overlap, 44px) * -1);
}

/* 保險：把全域 .hot-card-item:hover 的 transform 強制歸零，避免覆蓋造成看起來「沒斜」 */
:deep(.hot-card-item:hover),
:deep(.hot-card-item:focus-within) {
  transform: none !important;
}

/* 桌機（有 hover 的裝置）才做 hover 回正 */
@media (hover: hover) and (pointer: fine) {
  :deep(.hot-card-wrap) {
    transform-style: preserve-3d;
    transform: perspective(900px) rotateY(-26deg) scale(var(--hot-card-scale, 0.88)) !important;
    transition:
      transform 220ms ease,
      box-shadow 220ms ease,
      border-color 220ms ease;
    will-change: transform;
  }

  :deep(.hot-card-wrap:hover) {
    z-index: 2000;
  }

  :deep(.hot-card-wrap:hover),
  :deep(.hot-card-wrap:focus-within) {
    transform: perspective(900px) rotateY(0deg) translateY(-6px) scale(var(--hot-card-scale, 0.88)) !important;
  }

  :deep(.hot-card-wrap:hover .hot-card-item),
  :deep(.hot-card-wrap:focus-within .hot-card-item) {
    /* hover 時再補一點本體陰影，提升立體感 */
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.26);
    border-color: rgba(0, 0, 0, 0.22);
  }
}

@media (prefers-reduced-motion: reduce) {
  :deep(.hot-card-wrap),
  :deep(.hot-card-wrap:hover),
  :deep(.hot-card-wrap:focus-within) {
    transform: scale(var(--hot-card-scale, 0.88)) !important;
    transition: none !important;
    will-change: auto;
  }

  .scenario-card,
  .scenario-body {
    transition: none;
  }

  .scenario-card:active {
    transform: none;
  }
}

/* 2026 boutique overhaul v0 */
.home-page-wrapper {
  --home-rule: color-mix(in srgb, var(--txt) 16%, transparent);
  padding-top: clamp(20px, 3vw, 44px);
}

.home-hero {
  min-height: min(720px, calc(100svh - 130px));
  padding: 0;
  background: transparent;
  border: 0;
}

.hero-content-inner {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(380px, 0.72fr);
  align-items: center;
  gap: clamp(48px, 8vw, 120px);
  min-height: inherit;
  text-align: left;
}

.home-hero__copy {
  max-width: 720px;
}

.home-hero__eyebrow,
.home-section__eyebrow {
  margin-bottom: clamp(24px, 4vw, 48px);
  color: var(--txt-muted);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.24em;
}

.home-hero h1 {
  max-width: 12ch;
  margin: 0;
  color: var(--txt);
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: clamp(3.25rem, 6.2vw, 6.8rem);
  font-weight: 600;
  letter-spacing: -0.055em;
  line-height: 1.06;
}

:global(html.day-mode) .home-hero h1 {
  color: var(--txt) !important;
  text-shadow: none;
}

:global(html.day-mode) .home-hero .home-hero__lede,
:global(html.day-mode) .home-hero .home-hero__eyebrow {
  color: var(--txt-muted) !important;
  text-shadow: none;
}

.home-hero__lede {
  max-width: 34rem;
  margin-top: clamp(28px, 4vw, 48px);
  color: var(--txt-muted);
  font-size: clamp(0.98rem, 1.2vw, 1.08rem);
  line-height: 1.95;
}

.home-hero__actions {
  gap: 10px;
  margin-top: 34px;
}

.home-hero__action {
  min-width: 142px;
  min-height: 48px;
  padding: 12px 22px;
  border-color: var(--txt);
  border-radius: 2px;
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.home-hero__action--primary {
  background: var(--pri-btn);
  border-color: var(--pri-btn);
  color: #fff;
}

.home-hero__action--secondary {
  color: var(--txt);
}

.home-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 22px;
  margin-top: clamp(52px, 8vw, 90px);
  padding-top: 18px;
  color: var(--txt-muted);
  font-size: 0.62rem;
  letter-spacing: 0.15em;
  border-top: 1px solid var(--home-rule);
}

.home-hero__visual {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: #d8d2c8;
  color: #171714;
  text-decoration: none;
}

.home-hero__visual img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 700ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

.home-hero__visual::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(10, 10, 8, 0.52), transparent 35%);
  pointer-events: none;
}

.home-hero__visual-placeholder,
.home-hero__visual--loading {
  display: grid;
  place-items: center;
  color: rgba(23, 23, 20, 0.5);
  font-size: clamp(1.2rem, 4vw, 2.4rem);
  font-weight: 900;
  letter-spacing: 0.3em;
}

.home-hero__caption {
  position: absolute;
  right: 22px;
  bottom: 20px;
  left: 22px;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.home-scenario-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: clamp(50px, 8vw, 110px) 0;
  border-block: 1px solid var(--home-rule);
}

.scenario-card {
  min-height: 138px;
  padding: 24px 20px;
  background: transparent;
  border: 0;
  border-right: 1px solid var(--home-rule);
  border-radius: 0;
  box-shadow: none;
  text-align: left;
}

.scenario-card:last-child {
  border-right: 0;
}

.scenario-body {
  justify-content: flex-start;
  gap: 18px;
}

.scenario-index {
  color: var(--pri);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.scenario-title {
  color: var(--txt);
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: 1.08rem;
  font-weight: 600;
}

.scenario-hint {
  display: block;
  margin: 26px 0 0 36px;
  color: var(--txt-muted);
  font-size: 0.78rem;
  line-height: 1.65;
}

.live-badge {
  top: 14px;
  right: 14px;
  padding: 4px 7px;
  background: var(--txt);
  border-radius: 2px;
  box-shadow: none;
  font-size: 0.58rem;
  animation: none;
}

.home-section,
.home-section.home-hot-picks,
.home-section.articles-section,
.home-trust {
  margin: 0;
  padding: clamp(62px, 9vw, 128px) 0;
  background: transparent !important;
  border: 0;
  border-top: 1px solid var(--home-rule) !important;
  box-shadow: none !important;
}

.section-head {
  align-items: baseline;
  margin-bottom: clamp(28px, 4vw, 52px);
}

.sec-title {
  color: var(--txt);
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: clamp(2rem, 3.4vw, 3.6rem);
  font-weight: 600;
  letter-spacing: -0.04em;
}

.sec-title::before {
  display: none;
}

.sec-more {
  color: var(--txt-muted);
  font-size: 0.72rem;
  letter-spacing: 0.12em;
}

.home-product-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(12px, 2vw, 28px);
}

.home-product {
  min-width: 0;
  color: var(--txt);
  text-decoration: none;
}

.home-product__media {
  position: relative;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  background: #d8d2c8;
}

.home-product__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 600ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

.home-product__placeholder {
  display: grid;
  height: 100%;
  place-items: center;
  color: rgba(23, 23, 20, 0.42);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.24em;
}

.home-product__number {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 7px;
  color: #171714;
  background: rgba(255, 254, 250, 0.86);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
}

.home-product__info {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 15px 0 0;
}

.home-product__info h3 {
  min-width: 0;
  margin: 0;
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: 1rem;
  font-weight: 600;
}

.home-product__info span {
  flex: 0 0 auto;
  color: var(--txt-muted);
  font-size: 0.66rem;
  letter-spacing: 0.08em;
}

.article-grid {
  gap: clamp(20px, 3vw, 42px);
}

.article-card {
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.article-card .card-img {
  width: 100%;
  height: auto !important;
  aspect-ratio: 3 / 2;
  border-radius: 0;
  object-fit: cover;
}

.article-card .card-body {
  padding: 18px 0 0;
}

.article-card .slim-title {
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: 1.25rem !important;
  font-weight: 600;
}

.art-cat-tag {
  top: 12px;
  left: 12px;
  padding: 5px 8px;
  color: #171714;
  background: rgba(255, 254, 250, 0.88);
  border-radius: 2px;
  font-size: 0.62rem;
  box-shadow: none;
}

.home-trust__intro {
  max-width: 46rem;
  margin-bottom: clamp(36px, 6vw, 72px);
}

.home-trust__grid {
  gap: 0;
  border-top: 1px solid var(--home-rule);
}

.home-trust__card {
  min-height: 250px;
  padding: 28px 26px;
  background: transparent;
  border: 0;
  border-right: 1px solid var(--home-rule);
  border-radius: 0;
}

.home-trust__card:last-child {
  border-right: 0;
}

.home-trust__card h3 {
  margin-top: 42px;
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: 1.35rem;
  font-weight: 600;
}

.home-trust__link {
  color: var(--txt);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
}

@media (hover: hover) and (pointer: fine) {
  .home-hero__visual:hover img,
  .home-product:hover img {
    transform: scale(1.035);
  }

  .home-hero__action--primary:hover {
    background: var(--pri-dark);
    border-color: var(--pri-dark);
    color: #fff;
  }

  .home-hero__action--secondary:hover,
  .home-trust__card:hover,
  .scenario-card:hover {
    background: color-mix(in srgb, var(--txt) 4%, transparent);
  }

  .home-trust__card:hover,
  .scenario-card:hover {
    transform: none;
    border-color: var(--home-rule);
    box-shadow: none;
  }

  .scenario-card:hover .scenario-body {
    transform: none;
  }

  .scenario-card:hover .scenario-hint {
    transform: none;
  }
}

@media (max-width: 900px) {
  .hero-content-inner {
    grid-template-columns: 1fr 0.78fr;
    gap: 34px;
  }

  .home-scenario-grid,
  .home-product-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .scenario-card:nth-child(2) {
    border-right: 0;
  }

  .scenario-card:nth-child(-n + 2) {
    border-bottom: 1px solid var(--home-rule);
  }
}

@media (max-width: 767px) {
  .home-page-wrapper {
    padding-top: 10px;
  }

  .home-header-wrap {
    padding-inline: 0;
  }

  .home-hero {
    min-height: auto;
  }

  .hero-content-inner {
    display: flex;
    flex-direction: column;
    gap: 34px;
  }

  .home-hero__copy {
    width: 100%;
  }

  .home-hero__eyebrow {
    margin-bottom: 20px;
  }

  .home-hero h1 {
    max-width: none;
    font-size: clamp(2.35rem, 11.5vw, 3.4rem);
    letter-spacing: -0.06em;
  }

  .home-hero__lede {
    margin-top: 22px;
    font-size: 0.92rem;
    line-height: 1.85;
  }

  .home-hero__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    margin-top: 26px;
  }

  .home-hero__action {
    min-width: 0;
    padding-inline: 12px;
  }

  .home-hero__meta {
    display: none;
  }

  .home-hero__visual {
    order: -1;
    aspect-ratio: 1 / 1;
  }

  .home-scenario-grid {
    margin-block: 54px;
  }

  .scenario-card {
    min-height: 118px;
    padding: 18px 14px;
  }

  .scenario-body {
    gap: 10px;
  }

  .scenario-hint {
    margin: 14px 0 0 24px;
    font-size: 0.7rem;
  }

  .home-section,
  .home-section.home-hot-picks,
  .home-section.articles-section,
  .home-trust {
    padding-block: 64px;
  }

  .home-product-grid {
    gap: 24px 10px;
  }

  .home-product__info {
    display: block;
  }

  .home-product__info span {
    display: block;
    margin-top: 5px;
  }

  .article-grid,
  .home-trust__grid {
    grid-template-columns: 1fr;
  }

  .home-trust__card {
    min-height: 210px;
    border-right: 0;
    border-bottom: 1px solid var(--home-rule);
  }
}

.home-product-marquee {
  --hot-card-scale: 1;
  --hot-card-w: 260px;
  --hot-card-h: 260px;
  --hot-card-overlap: 0px;
  overflow: hidden;
  padding: 0;
  background: transparent;
}

.home-product-marquee :deep(.app-marquee__track),
.home-product-marquee :deep(.app-marquee__group) {
  gap: 18px;
}

.home-product-marquee :deep(.app-marquee__group + .app-marquee__group),
.home-product-marquee :deep(.hot-card-wrap:not(:first-child)) {
  margin-left: 0 !important;
}

.home-product-marquee :deep(.hot-card-wrap),
.home-product-marquee :deep(.hot-card-wrap:hover),
.home-product-marquee :deep(.hot-card-wrap:focus-within) {
  width: var(--hot-card-w);
  padding: 0;
  transform: none !important;
  will-change: auto;
}

.home-product-marquee :deep(.hot-card-back) {
  display: none;
}

.home-product-marquee :deep(.hot-card-item) {
  width: 100%;
  height: var(--hot-card-h);
  background: #ece8e1;
  border: 0;
  border-radius: 2px;
  box-shadow: none !important;
  transform: none !important;
}

.home-product-marquee :deep(.hot-card-body-overlay) {
  padding: 42px 16px 16px;
  text-align: left;
  background: linear-gradient(to top, rgba(15, 14, 12, 0.66), transparent);
}

.home-product-marquee :deep(.hot-card-title) {
  color: #fff;
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: 1rem;
  font-weight: 600;
  text-align: left;
  text-shadow: none;
}

.home-product-marquee :deep(.hot-card-img--placeholder) {
  color: rgba(23, 23, 20, 0.42);
  background: #ece8e1 !important;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.22em;
}

.home-product-marquee :deep(.hot-stamp) {
  top: 12px;
  left: 12px;
  padding: 5px 8px;
  background: rgba(255, 255, 255, 0.88);
  color: #171714;
  border-radius: 2px;
  box-shadow: none;
  font-size: 0.58rem;
  letter-spacing: 0.08em;
}

@media (max-width: 767px) {
  .home-product-marquee {
    --hot-card-w: 180px;
    --hot-card-h: 180px;
  }

  .home-product-marquee :deep(.app-marquee__track),
  .home-product-marquee :deep(.app-marquee__group) {
    gap: 10px;
  }
}

/* 01 /home approved responsive pass */
.home-page-wrapper {
  --home-rule: color-mix(in srgb, var(--txt) 16%, transparent);
  padding-top: clamp(12px, 2vw, 28px);
  overflow-x: clip;
}

.home-hero {
  min-height: auto;
  padding: 0 0 clamp(24px, 3vw, 40px);
}

.hero-content {
  max-width: none;
}

.hero-content-inner {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.82fr);
  align-items: start;
  gap: clamp(36px, 6vw, 88px);
}

.home-hero__copy {
  min-width: 0;
  padding-top: clamp(6px, 1.4vw, 20px);
}

.home-hero__eyebrow {
  margin-bottom: clamp(18px, 2.2vw, 30px);
  white-space: nowrap;
}

.home-hero h1 {
  max-width: none;
  font-size: clamp(2.4rem, 4.3vw, 5.6rem);
  line-height: 1.08;
  text-wrap: balance;
}

.home-hero__line {
  display: block;
  white-space: nowrap;
}

.home-hero__lede {
  margin-top: clamp(22px, 3vw, 36px);
  font-size: clamp(0.96rem, 1.1vw, 1.06rem);
  line-height: 1.9;
  text-wrap: pretty;
}

.home-hero__actions {
  flex-wrap: nowrap;
  margin-top: 26px;
}

.home-hero__action {
  min-width: 132px;
  min-height: 46px;
  padding: 11px 20px;
  white-space: nowrap;
}

.home-hero__meta {
  flex-wrap: nowrap;
  gap: clamp(10px, 1.5vw, 22px);
  margin-top: clamp(36px, 5vw, 62px);
  padding-top: 16px;
  font-size: clamp(0.52rem, 0.58vw, 0.62rem);
  white-space: nowrap;
}

.home-hero__visual img {
  transition: transform 180ms ease-out;
}

.home-hero__caption {
  white-space: nowrap;
}

.home-scenario-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: clamp(20px, 2.5vw, 34px) 0 0;
}

.scenario-card {
  display: flex;
  min-width: 0;
  min-height: 78px;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  overflow: hidden;
  color: inherit;
  text-align: center;
  text-decoration: none;
}

.scenario-body {
  display: grid;
  grid-template-columns: 2.4em max-content;
  justify-content: center;
  gap: 12px;
  width: 100%;
  transition:
    transform 180ms ease-out,
    opacity 180ms ease-out;
}

.scenario-index,
.scenario-title {
  white-space: nowrap;
}

.scenario-title {
  font-size: clamp(0.9rem, 1.15vw, 1.04rem);
}

.scenario-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 10px 12px;
  color: #fff;
  background: var(--pri-btn);
  font-size: clamp(0.68rem, 0.82vw, 0.78rem);
  font-weight: 700;
  line-height: 1.45;
  opacity: 0;
  transform: translateY(8px);
  pointer-events: none;
  transition:
    transform 180ms ease-out,
    opacity 180ms ease-out;
}

.live-badge {
  top: 6px;
  right: 6px;
}

.home-section,
.home-section.home-hot-picks,
.home-section.articles-section,
.home-trust {
  padding: clamp(26px, 3.5vw, 44px) 0;
}

.home-section.home-hot-picks,
.home-section.articles-section,
.home-trust {
  padding-top: clamp(24px, 3vw, 38px);
}

.section-head {
  gap: 18px;
  margin-bottom: clamp(18px, 2.5vw, 30px);
}

.sec-title {
  font-size: clamp(1.8rem, 2.8vw, 3rem);
  text-wrap: balance;
}

.sec-more {
  min-height: 40px;
  padding-inline: 0;
  white-space: nowrap;
}

.home-product-marquee {
  --hot-card-w: 176px;
  --hot-card-h: 176px;
}

.home-product-marquee__rows {
  display: grid;
  gap: 12px;
}

.home-product-marquee :deep(.app-marquee__track),
.home-product-marquee :deep(.app-marquee__group) {
  gap: 12px;
}

.home-product-marquee :deep(.hot-card-wrap) {
  flex: 0 0 var(--hot-card-w);
}

.home-product-marquee :deep(.hot-card-body-overlay) {
  padding: 28px 12px 10px;
}

.home-product-marquee :deep(.hot-card-title) {
  overflow: hidden;
  font-size: 0.88rem;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-product-marquee :deep(.hot-stamp) {
  display: none;
}

.article-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(16px, 2.5vw, 30px);
}

.article-card,
.article-card:first-child {
  grid-column: auto !important;
  min-width: 0;
}

.article-card:first-child .card-img,
.article-card .card-img {
  height: auto !important;
  aspect-ratio: 3 / 2;
}

.article-card .card-body {
  padding-top: 14px !important;
}

.article-card .date-text {
  font-variant-numeric: tabular-nums;
}

.article-card .slim-title {
  overflow: visible !important;
  font-size: clamp(1rem, 1.35vw, 1.18rem) !important;
  line-height: 1.45 !important;
  text-overflow: clip !important;
  white-space: normal !important;
  text-wrap: balance;
}

.article-card .art-summary,
.home-trust__lede,
.home-trust__card p {
  text-wrap: pretty;
}

.home-trust__intro {
  margin-bottom: clamp(18px, 2.5vw, 30px);
}

.home-trust__card {
  position: relative;
  min-height: 190px;
  padding: 22px 24px;
  overflow: hidden;
}

.home-trust__card h3 {
  margin-top: 26px;
  white-space: nowrap;
}

.home-trust__link {
  white-space: nowrap;
}

.home-trust__card--scene::before {
  position: absolute;
  inset-block: 0;
  left: 0;
  width: 3px;
  content: '';
  background: var(--pri);
}

.home-trust__scene-cue {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 46px;
  height: 1px;
  overflow: hidden;
  background: color-mix(in srgb, var(--pri) 28%, transparent);
}

.home-trust__scene-cue span {
  display: block;
  width: 18px;
  height: 1px;
  background: var(--pri);
  animation: home-scene-cue 1.8s ease-out infinite;
}

@keyframes home-scene-cue {
  from {
    opacity: 0;
    transform: translateX(-18px);
  }
  35%,
  70% {
    opacity: 1;
  }
  to {
    opacity: 0;
    transform: translateX(46px);
  }
}

@media (min-width: 769px) and (hover: hover) and (pointer: fine) {
  .scenario-card:hover,
  .scenario-card:focus-visible {
    color: #fff;
    background: var(--pri-btn);
  }

  .scenario-card:hover .scenario-body,
  .scenario-card:focus-visible .scenario-body {
    opacity: 0;
    transform: translateY(-8px);
  }

  .scenario-card:hover .scenario-hint,
  .scenario-card:focus-visible .scenario-hint {
    opacity: 1;
    transform: translateY(0);
  }

  .scenario-card:hover .scenario-title,
  .scenario-card:hover .scenario-index,
  .scenario-card:focus-visible .scenario-title,
  .scenario-card:focus-visible .scenario-index {
    color: #fff;
  }
}

@media (max-width: 960px) and (min-width: 769px) {
  .hero-content-inner {
    grid-template-columns: minmax(0, 1fr) minmax(280px, 0.78fr);
    gap: 30px;
  }

  .home-hero h1 {
    font-size: clamp(1.95rem, 4vw, 2.5rem);
  }

  .home-hero__meta {
    gap: 9px;
    font-size: 0.5rem;
  }

  .scenario-card {
    padding-inline: 10px;
  }

  .article-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .home-page-wrapper {
    padding-top: 10px;
  }

  .home-hero {
    padding-bottom: 22px;
  }

  .hero-content-inner {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .home-hero__copy {
    display: contents;
  }

  .home-hero__eyebrow {
    order: 1;
    margin-bottom: 14px;
    font-size: 0.62rem;
  }

  .home-hero h1 {
    order: 2;
    font-size: clamp(1.65rem, 8vw, 2.2rem);
    line-height: 1.12;
  }

  .home-hero__visual {
    order: 3;
    margin-top: 22px;
    aspect-ratio: 1 / 1;
  }

  .home-hero__lede {
    order: 4;
    margin-top: 20px;
    font-size: 0.9rem;
    line-height: 1.75;
  }

  .home-hero__actions {
    order: 5;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
    margin-top: 18px;
  }

  .home-hero__action {
    min-width: 0;
    min-height: 44px;
    padding-inline: 8px;
    font-size: 0.82rem;
  }

  .home-hero__meta {
    display: none;
  }

  .home-hero__caption {
    right: 14px;
    bottom: 13px;
    left: 14px;
    font-size: clamp(0.56rem, 2.4vw, 0.68rem);
  }

  .home-scenario-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 22px;
  }

  .scenario-card {
    min-height: 94px;
    flex-direction: column;
    justify-content: flex-start;
    padding: 12px 8px 11px;
  }

  .scenario-hint {
    position: static;
    display: block;
    margin: 7px 0 0;
    padding: 0 4px;
    color: var(--txt-muted);
    background: transparent;
    font-size: clamp(0.62rem, 2.6vw, 0.72rem);
    font-weight: 500;
    line-height: 1.45;
    opacity: 1;
    transform: none;
  }

  .home-section,
  .home-section.home-hot-picks,
  .home-section.articles-section,
  .home-trust {
    padding-block: 24px;
  }

  .section-head {
    margin-bottom: 16px;
  }

  .sec-title {
    font-size: clamp(1.55rem, 7vw, 2rem);
  }

  .sec-more {
    min-height: 36px;
    font-size: 0.64rem;
  }

  .home-product-marquee {
    --hot-card-w: 128px;
    --hot-card-h: 128px;
  }

  .home-product-marquee__rows,
  .home-product-marquee :deep(.app-marquee__track),
  .home-product-marquee :deep(.app-marquee__group) {
    gap: 8px;
  }

  .home-product-marquee :deep(.hot-card-body-overlay) {
    padding: 22px 8px 7px;
  }

  .home-product-marquee :deep(.hot-card-title) {
    font-size: 0.72rem;
  }

  .article-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px 10px;
    padding-inline: 0;
  }

  .article-card .card-body {
    padding-top: 9px !important;
  }

  .article-card .date-text {
    margin-bottom: 4px !important;
    font-size: 0.66rem !important;
  }

  .article-card .slim-title {
    font-size: clamp(0.84rem, 3.8vw, 1rem) !important;
    line-height: 1.4 !important;
  }

  .article-card .art-summary {
    font-size: 0.74rem;
    line-height: 1.55;
    -webkit-line-clamp: 3;
  }

  .art-cat-tag {
    top: 6px;
    left: 6px;
    padding: 3px 5px;
    font-size: 0.52rem;
    white-space: nowrap;
  }

  .home-trust__grid {
    grid-template-columns: 1fr;
  }

  .home-trust__intro {
    margin-bottom: 18px;
  }

  .home-trust__card {
    min-height: 146px;
    padding: 18px;
  }

  .home-trust__card h3 {
    margin-top: 18px;
    font-size: 1.08rem;
  }

  .home-trust__scene-cue {
    top: 20px;
    right: 18px;
  }
}

@media (max-width: 350px) {
  .home-hero h1 {
    font-size: 1.62rem;
  }

  .home-hero__action {
    font-size: 0.76rem;
  }

  .scenario-card {
    padding-inline: 5px;
  }

  .scenario-index {
    font-size: 0.54rem;
  }

  .scenario-title {
    font-size: 0.8rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-trust__scene-cue span {
    animation: none;
    opacity: 1;
    transform: translateX(14px);
  }
}
</style>
