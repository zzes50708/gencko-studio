<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useMediaQuery } from '@vueuse/core'
import { useMainStore } from '~/stores/useMainStore'
import MatrixGeneRain from '~/components/MatrixGeneRain.vue'
import { gsap } from 'gsap'
import { Observer } from 'gsap/Observer'

const store = useMainStore()
const route = useRoute()

// 匯出模式：用於製作宣傳片素材（固定時間軸自動播放、關閉互動/按鈕/提示）
const exportMode = computed(() => {
  if (!import.meta.client) return false
  const v = route.query?.export
  return v === '1' || v === 'true' || v === 'yes'
})
const exportFps = computed(() => {
  const raw = Number(route.query?.fps || 60)
  return Number.isFinite(raw) && raw > 0 ? raw : 60
})
const exportHoldSec = computed(() => {
  const raw = Number(route.query?.hold || 2.5)
  return Number.isFinite(raw) && raw > 0 ? raw : 2.5
})
const exportTransSec = computed(() => {
  const raw = Number(route.query?.trans || 1.2)
  return Number.isFinite(raw) && raw >= 0 ? raw : 1.2
})

// ?? Virtual Triggered Navigation ?????????????????????????????????????????????
// ?嗆?嚗蜓?孛?潸??湛??蔣??嚗??◤??scrub
// 頛詨嚗SAP Observer嚗遝頛?/ 閫豢嚗? ?萇
// ??嚗sTransitioning ??頧銝凋?璉??撓?伐??脤?歲嚗?
// ?嚗sap.to ?箏? 1.8s expo.inOut ??????皜??蝯脫?????
// ?????????????????????????????????????????????????????????????????????????????
const stageEl           = ref(null)    // Observer ???格?嚗撅?stage嚗?
const isMounted         = ref(false)
const canUseMotion      = useMediaQuery('(prefers-reduced-motion: no-preference)')
const isDesktop         = useMediaQuery('(hover: hover) and (pointer: fine)')

const currentSceneIndex = ref(0)     // ?湔 0??嚗璅??
const isTransitioning   = ref(false) // 頧??true ??璉??撓??
const snapTrigger       = ref(0)     // GeckoScene3D 摰?靽∟?嚗?甈∟??游???憓?
const transitionInfo    = ref({ from: -1, to: -1, ts: 0 })  // 頧??靽∟?嚗?孵?嚗?

// animScene 撽?????恬?瘚桅? 0~5嚗?
const animScene = ref(0)
const _proxy    = { v: 0 }   // GSAP 銝?湔 tween Vue ref嚗 proxy ?拐辣?腹

let sceneTween     = null   // ?桀?????tween
let gsapObserver   = null   // GSAP Observer 撖虫?
let keydownHandler = null   // ?萇???剁?onBeforeUnmount ?宏?歹?
let exportTicker   = null   // 匯出模式計時器（自動推進 animScene）
let exportFrameHandler = null // 匯出模式：接收逐幀驅動事件

// ?? ?詨?嚗蜓???迎?4 撅日霅瘀?????????????????????????????????????????????????
const navigateTo = (next) => {
  if (isTransitioning.value) return            // Layer 1嚗??湧?嚗?乩?璉?
  if (next === currentSceneIndex.value) return  // Layer 2嚗??格?嚗??瑁?
  if (next < 0 || next > 5) return             // Layer 3嚗???銵?

  const from = currentSceneIndex.value          // 閮??箇暺?transitionInfo 雿輻
  currentSceneIndex.value = next
  isTransitioning.value   = true

  // 頧???喳誨?剜??GeckoScene3D ?其?瘙箏??臬?郊?迤嚗?
  transitionInfo.value = { from, to: next, ts: Date.now() }

  if (sceneTween) sceneTween.kill()
  _proxy.v = animScene.value   // 敺?筑暺脣漲?箇

  sceneTween = gsap.to(_proxy, {
    v:         next,
    duration:  canUseMotion.value ? 1.8 : 0,   // reduced-motion：瞬切，不做長轉場
    ease:      'expo.inOut',    // ????皜??蔣?結皛?
    overwrite: true,
    onUpdate   () { animScene.value = _proxy.v },
    onComplete () {
      animScene.value       = next   // 撘瑕?湔撠?嚗??斗筑暺炊撌?
      _proxy.v              = next
      isTransitioning.value = false  // 閫??嚗?閮曹?銝甈∟撓??
      snapTrigger.value++            // 頧摰??
    },
  })
}

// ?? 摰?瑟?嚗????2嚗????????????????????????????????????????????????????
const destroyObserver = () => {
  if (sceneTween)   { sceneTween.kill();   sceneTween   = null }
  if (gsapObserver) { gsapObserver.kill(); gsapObserver = null }
  if (keydownHandler) {
    window.removeEventListener('keydown', keydownHandler)
    keydownHandler = null
  }
  if (exportTicker) {
    try { clearInterval(exportTicker) } catch (e) {}
    exportTicker = null
  }
  if (exportFrameHandler) {
    try { window.removeEventListener('gencko-export-frame', exportFrameHandler) } catch (e) {}
    exportFrameHandler = null
  }
  // 蝣箔????Observer 撖虫??質◤皜嚗?瘙⊥??嗡??
  try { Observer.getAll().forEach(o => o.kill()) } catch (e) {}
}

onMounted(async () => {
  await nextTick()
  isMounted.value = true
  if (!import.meta.client) return

  gsap.registerPlugin(Observer)

  currentSceneIndex.value = 0
  animScene.value         = 0
  _proxy.v                = 0
  isTransitioning.value   = false

  // 影片/匯出模式不需要載入畫面；一般模式也加 fail-safe 避免卡死
  if (exportMode.value) {
    isLoading.value = false
  } else {
    loaderFailSafeTimer = setTimeout(() => { isLoading.value = false }, 4500)
  }

  if (exportMode.value) {
    // 匯出模式：由外部「逐幀」驅動（避免截圖速度慢導致時間軸跑完、後面全是結尾）
    // 外部會透過 window.__GENCKO_EXPORT_FRAME 設定當前 frame (0-based)，並派發事件 gencko-export-frame
    const holdMs = exportHoldSec.value * 1000
    const transMs = exportTransSec.value * 1000
    const sceneCount = 6
    const fps = exportFps.value

    exportFrameHandler = () => {
      const frame = Number(window.__GENCKO_EXPORT_FRAME || 0)
      const t = (frame / Math.max(1, fps)) * 1000

      const totalMs = (sceneCount - 1) * (holdMs + transMs) + holdMs
      if (t >= totalMs) {
        animScene.value = 5
        currentSceneIndex.value = 5
        return
      }

      let acc = 0
      let v = 0
      for (let i = 0; i < sceneCount; i++) {
        if (t < acc + holdMs) { v = i; break }
        acc += holdMs
        if (i < sceneCount - 1) {
          if (t < acc + transMs) {
            const p = (t - acc) / Math.max(1, transMs)
            v = i + p
            break
          }
          acc += transMs
        }
      }
      animScene.value = Math.min(5, Math.max(0, v))
      currentSceneIndex.value = Math.round(animScene.value)
    }
    window.addEventListener('gencko-export-frame', exportFrameHandler)
    exportFrameHandler()
  } else {
    // Layer 4：GSAP Observer 接管滾動；避免真的讓頁面 scroll，造成頂部導覽列閃動/底部導覽列跳動
    gsapObserver = Observer.create({
      target:         stageEl.value || window,
      type:           'wheel,touch,pointer',
      tolerance:      10,
      preventDefault: true,
      // 觸控裝置：手指往上滑（視覺上內容往上）應該要進入下一幕
      // 目前 Observer 的 onDown/onUp 在 touch 上的語意與直覺容易相反，因此在非桌機時反轉一次
      onDown: () => (isDesktop.value ? navigateTo(currentSceneIndex.value + 1) : navigateTo(currentSceneIndex.value - 1)),
      onUp:   () => (isDesktop.value ? navigateTo(currentSceneIndex.value - 1) : navigateTo(currentSceneIndex.value + 1)),
    })

    // PageDown / ArrowDown = 往下；PageUp / ArrowUp = 往上
    keydownHandler = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        navigateTo(currentSceneIndex.value + 1)
      }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        navigateTo(currentSceneIndex.value - 1)
      }
    }
    window.addEventListener('keydown', keydownHandler)
  }
})

onBeforeUnmount(() => {
  destroyObserver()   // ?脣?靽 2嚗??湧瘥嚗??遙雿?頝?
  isMounted.value = false
  if (loaderFailSafeTimer) {
    try { clearTimeout(loaderFailSafeTimer) } catch (e) {}
    loaderFailSafeTimer = null
  }
  if (!import.meta.client) return
})

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    try { destroyObserver() } catch (e) {}
  })
}

// ?喟策摮?隞嗥??湔瘚桅??潘?SSR / reduced-motion 靽風嚗?
const scene = computed(() => {
  if (!isMounted.value) return 0
  // prefers-reduced-motion 時：停用長轉場，但仍允許場景切換，避免內容被鎖死在 scene 5
  return animScene.value
})

const isDayMode = computed(() => false)
const bgColor   = computed(() => '#0D0B0A')   // canvas clearColor = 同 stage 背景色

// ── 載入動畫 ──────────────────────────────────────────────────────────────────
const isLoading = ref(true)
function onSceneReady() {
  // GeckoScene3D 第一幀後再延遲一點，讓粒子先出現再收起 loader
  setTimeout(() => { isLoading.value = false }, 600)
}
// 安全閥：避免 WebGL ready 事件未觸發時卡在載入畫面
let loaderFailSafeTimer = null

const activeDot = computed(() => Math.min(5, Math.max(0, Math.round(animScene.value))))

// Per-scene alpha嚗?蝺改??臭?蝺拙???GSAP tween ??expo.inOut嚗?
const ss = x => x * x * (3 - 2 * x)   // 靽?靘隞?嫣蝙??
const ALPHA_FADE = 0.65
const centerAlpha = (s, n) => {
  const dist = Math.abs(s - n)
  if (dist >= ALPHA_FADE) return 0
  return 1 - dist / ALPHA_FADE
}
const sceneAlpha = computed(() => {
  const s = scene.value
  return [0, 1, 2, 3, 4, 5].map(n => centerAlpha(s, n))
})

const sceneStyle = (idx) => ({ opacity: String(sceneAlpha.value[idx]) })

// Scene content（文字復原為可讀版本；維持原本 6 段場景結構）
const scenes = [
  {
    kicker: '', hero: true, cta: false,
    title: 'Gencko Studio', subtitle: '品牌服務',
    desc: '', btn: null,
  },
  {
    kicker: 'Microscopic World', hero: false, cta: false,
    title: '每一種花紋<br>源於基因',
    desc: '豹紋守宮的體色與斑紋由基因組合決定。Gencko 以遺傳學為起點，讓選育方向清晰可循。',
    btn: { label: '閱讀基因知識', to: '/articles' },
  },
  {
    kicker: 'Gencko Studio', hero: false, cta: false,
    title: '專業選育<br>追溯血緣',
    desc: '每隻個體保有完整紀錄與基因資料，選育過程透明，來源清晰。',
    btn: { label: '瀏覽在售個體', to: '/shop' },
  },
  {
    kicker: 'Gene Science', hero: false, cta: false,
    title: '基因計算機<br>科學化配對',
    desc: '輸入親本基因型，自動計算子代出現比例。每一次配對，都以孟德爾遺傳定律作為依據。',
    btn: { label: '前往基因計算機', to: '/calculator' },
  },
  {
    kicker: 'Taiwan Coverage', hero: false, cta: false,
    title: '全台特寵獸醫<br>資訊整合',
    desc: '購入後 48 小時健康保固，找到最近的特寵醫院資訊，需要時就近就醫。',
    btn: { label: '查看特寵醫院', to: '/hospital' },
  },
  {
    kicker: '', hero: true, cta: true,
    title: '準備好了嗎', subtitle: '從你的第一隻豹紋守宮開始',
    desc: '', btn: null,
  },
]

const clamp01 = (v) => Math.max(0, Math.min(1, v))

const geneFxA = computed(() => {
  const dist = Math.abs(scene.value - 3)
  if (dist >= 0.6) return 0
  return ss(1 - dist / 0.6)
})
const geneFxActive = computed(() => isMounted.value && isDesktop.value && geneFxA.value > 0.01)

const cardShowing = computed(() => Math.abs(scene.value - 3) < 0.55)

const HOLO_CARDS = [
  { pct: '50%',  gene: 'TREMPER ALBINO', label: 'GENETICS / RESULT', status: 'HET / CONFIRMED',    left: '33%', top: '16%', rotateY: '-14deg', rotateX: '5deg',  delay: '0s',    srcDx: '29vw', srcDy: '12vh',  connSide: 'right', connAngle: '22deg' },
  { pct: '100%', gene: 'HET ECLIPSE',    label: 'GENETICS / RESULT', status: 'VISUAL / CONFIRMED', left: '66%', top: '40%', rotateY: '10deg',  rotateX: '2deg',  delay: '0.12s', srcDx: '-6vw', srcDy: '8vh',   connSide: 'left',  connAngle: '28deg' },
  { pct: '25%',  gene: 'BLIZZARD',       label: 'GENETICS / RESULT', status: 'HET / POSSIBLE',     left: '42%', top: '67%', rotateY: '-6deg',  rotateX: '-3deg', delay: '0.22s', srcDx: '20vw', srcDy: '-17vh', connSide: 'top',   connAngle: '22deg' },
]

const holoCardStyle = (card) => {
  // 手機版：保留 left/top 分布，縮小卡片並以 scale 跳出（無 3D 旋轉）
  if (!isDesktop.value) {
    return {
      left: card.left, top: card.top,
      '--delay': card.delay,
      transitionDelay: cardShowing.value ? card.delay : '0s',
      transform: cardShowing.value ? 'scale(1)' : 'scale(0.04)',
      opacity:   cardShowing.value ? 1 : 0,
    }
  }
  // 桌機版：原始 3D 浮動卡片
  return {
    left: card.left, top: card.top,
    '--conn-angle': card.connAngle, '--delay': card.delay,
    transitionDelay: cardShowing.value ? card.delay : '0s',
    transform: cardShowing.value
      ? `perspective(900px) rotateY(${card.rotateY}) rotateX(${card.rotateX}) scale(1)`
      : `perspective(900px) rotateY(${card.rotateY}) rotateX(${card.rotateX}) translateX(${card.srcDx}) translateY(${card.srcDy}) scale(0.04)`,
  }
}

const CAROUSEL_STEP  = 45
const carouselRadius = computed(() => isDesktop.value ? 200 : 130)
const carouselScenes = scenes.slice(1, 5)

const carouselDeg = computed(() => {
  const s = scene.value
  return Math.max(-135, Math.min(0, -(s - 1) * CAROUSEL_STEP))
})

const carouselAlpha = computed(() => {
  const s = scene.value
  if (s < 0.35 || s > 4.65) return 0
  if (s < 1.0) return (s - 0.35) / 0.65
  if (s > 4.0) return (4.65 - s) / 0.65
  return 1
})

const carouselItemOpacity = (idx) => {
  const frontIdx = scene.value - 1
  const dist = Math.abs(idx - frontIdx)
  if (dist >= 1) return 0
  return 1 - dist
}

const geneTokens = computed(() => {
  const raw = store.genePages?.value || []
  return raw.map(g => g?.Name).filter(Boolean)
})
</script>

<template>
  <div ref="stageEl" class="stage" :class="{ 'stage--day': isDayMode }">

    <!-- ?? z-index 2: WebGL 3D canvas嚗?璈?+ ?????剁??? -->
    <div class="bg-layer">
      <ClientOnly>
        <TresCanvas :alpha="true" :clear-color="bgColor" window-size>
          <TresPerspectiveCamera :position="[0, 0, 8]" :fov="52" />
          <TresAmbientLight
            :intensity="isDayMode ? 0.30 : 0.2"
            :color="isDayMode ? '#fff5ee' : '#1a0a05'"
          />
          <TresDirectionalLight
            :position="[3, 5, 4]"
            :intensity="isDayMode ? 0.35 : 1.5"
            :color="isDayMode ? '#e06030' : '#e8440a'"
          />
          <GeckoScene3D :scene="scene" :snap-trigger="snapTrigger" :transition-info="transitionInfo" :is-day-mode="isDayMode" @ready="onSceneReady" />
        </TresCanvas>
      </ClientOnly>
    </div>

    <!-- ?? z-index 5: Rotating DNA helix ??left side, behind title text ?? -->
    <TheDnaDecor :is-day-mode="isDayMode" class="dna-layer" />

    <MatrixGeneRain
      class="gene-fx-layer"
      :enabled="geneFxActive"
      :alpha="geneFxA"
      :tokens="geneTokens"
    />


    <!-- ?? z-index 20: ?典?蝡??蔣?∠?嚗TML DOM嚗Ⅱ靽?摮?撠??堆??? -->
    <div class="holo-layer" aria-hidden="true">
      <div
        v-for="(card, idx) in HOLO_CARDS"
        :key="idx"
        class="holo-card"
        :class="{ 'holo-card--visible': cardShowing }"
        :style="holoCardStyle(card)"
      >
        <!-- ?∠?銝駁? -->
        <div class="holo-card__header">
          <span class="holo-card__dot" />
          <span class="holo-card__label">{{ card.label }}</span>
          <span class="holo-card__dot holo-card__dot--right" />
        </div>
        <div class="holo-card__pct">{{ card.pct }}</div>
        <div class="holo-card__gene">{{ card.gene }}</div>
        <div class="holo-card__divider" />
        <div class="holo-card__status">{{ card.status }}</div>
        <!-- 閬死?券?撘?蝺??孵???connSide 瘙箏?嚗ight / left / top嚗?-->
        <div
          class="holo-card__connector"
          :class="`holo-card__connector--${card.connSide || 'right'}`"
        >
          <div class="holo-card__connector-line" />
          <div class="holo-card__connector-dot" />
        </div>
        <!-- ??蝺?憌?-->
        <div class="holo-card__scanline" />
      </div>
    </div>

    <!--
      ?? z-index 30: 3D 璅?頧嚗cene 1-4嚗??
      銝惜蝯?嚗?
        1. .carousel-camera  ??perspective ?蔣璈捆??
        2. .carousel-reel    ??Y 頠訾葉敹??歹?隞?DNA 撌西遘 26vw ?箏?敹?
        3. .carousel-item    ????舀?憿隞塚??箏?閫漲撌?+ translateZ 憭嚗?
    -->
    <div
      class="carousel-camera"
      :style="{ opacity: carouselAlpha }"
    >
      <!-- 頧嚗???CSS transition嚗?亥???lerpedProgress 蝣箔???畾萄??典雿?-->
      <div
        class="carousel-reel"
        :style="{ transform: `rotateY(${carouselDeg}deg)` }"
      >
        <div
          v-for="(scene, idx) in carouselScenes"
          :key="idx"
          class="carousel-item"
          :style="{
            transform: `rotateY(${idx * CAROUSEL_STEP}deg) translateZ(${carouselRadius}px)`,
            opacity: carouselItemOpacity(idx),
            visibility: carouselItemOpacity(idx) > 0.02 ? 'visible' : 'hidden',
          }"
        >
          <div class="carousel-item__content">
            <span v-if="scene.kicker" class="scene-kicker">{{ scene.kicker }}</span>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <h1 class="scene-title" v-html="scene.title" />
            <!-- eslint-disable-next-line vue/no-v-html -->
            <p v-if="scene.desc" class="scene-desc" v-html="scene.desc" />
            <div v-if="scene.btn" class="scene-cta" style="pointer-events: auto;">
              <NuxtLink :to="scene.btn.to" class="btn-app btn-app--primary btn-app--md btn-app--pill">
                {{ scene.btn.label }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ?? z-index 30: Scene text overlays ?? -->
    <div class="scene-ui">
      <div
        v-for="(scene, idx) in scenes"
        :key="idx"
        class="scene-block"
        :class="{ 'scene-block--hero': scene.hero }"
        :style="sceneStyle(idx)"
      >
        <!-- Hero ?湔 (0/5)嚗??圈＊蝷箏之璅? -->
        <span v-if="scene.hero && scene.kicker" class="scene-kicker">{{ scene.kicker }}</span>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <h1 v-if="scene.hero" class="scene-title scene-title--hero" v-html="scene.title" />
        <p v-if="scene.hero && scene.subtitle" class="scene-subtitle">{{ scene.subtitle }}</p>
        <div v-if="!exportMode && idx === 0" class="scene-hero-skip" style="pointer-events: auto;">
          <NuxtLink to="/" class="btn-app btn-app--ghost btn-app--sm btn-app--pill" aria-label="不看介紹，直接進入官網">
            不看介紹，直接進入官網
          </NuxtLink>
        </div>
        <!-- ?脣?靽 3嚗cene 5 蝯偏撠嚗?蝙?刻?典???-->
        <div v-if="!exportMode && idx === 5" class="scene-end-nav">
          <NuxtLink to="/shop" class="btn-app btn-app--primary btn-app--md btn-app--pill">前往選購</NuxtLink>
          <NuxtLink to="/home" class="btn-app btn-app--ghost btn-app--md btn-app--pill">回到首頁</NuxtLink>
        </div>
      </div>
    </div>

    <!-- ?? z-index 32: Visual chrome (dots, scroll hint) ??pointer-events:none ?? -->
    <div v-if="!exportMode" class="dots-nav" aria-hidden="true">
      <span
        v-for="i in 6"
        :key="i"
        class="dot"
        :class="{ 'dot--active': activeDot === i - 1 }"
      />
    </div>

    <Transition name="hint-fade">
      <div v-if="!exportMode && currentSceneIndex < 5" class="scroll-hint">
        <span class="hint-text">往下滾動</span>
        <span class="lamp-hint" aria-hidden="true">
          <span class="lamp-hint__cone" />
          <span class="lamp-hint__spot" />
          <span class="lamp-hint__line" />
        </span>
      </div>
    </Transition>

    <!-- ── Hex 紋理覆蓋層（z-index:10，高於 canvas z-index:2，低於 UI z-index:30）
         canvas clearColor 為實心黑色，此層將官網蜂巢格紋疊在 WebGL 畫面上方，
         使格紋在粒子動畫期間保持可見 ── -->
    <div class="hex-overlay" aria-hidden="true" />

  </div>

  <!-- ── 載入動畫（position: fixed，在 .stage 外層）─────────────────────────── -->
  <Transition name="loader-out">
    <div v-if="isLoading" class="about-loader" aria-hidden="true">
      <div class="about-loader__center">
        <div class="about-loader__brand">GENCKO</div>
        <div class="about-loader__sub">STUDIO</div>
        <div class="about-loader__dna">
          <span v-for="i in 7" :key="i" class="about-loader__bar" :style="`--i:${i}`" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ?? Stage ?? */
.stage {
  position: fixed;
  inset: 0;
  overflow: hidden;
  /* 官網原生背景在全站的 body::before（六角幾何紋理），這裡保持透明讓它透出 */
  background-color: #0D0B0A;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='70' height='120'%3E%3Cpolygon points='35,0 70,20 70,60 35,80 0,60 0,20' fill='rgba(255,255,255,0.06)' stroke='rgba(255,110,10,0.15)' stroke-width='1.2' stroke-linejoin='round'/%3E%3Cpolygon points='0,60 35,80 35,120 0,140 -35,120 -35,60' fill='rgba(255,255,255,0.06)' stroke='rgba(255,110,10,0.15)' stroke-width='1.2' stroke-linejoin='round'/%3E%3Cpolygon points='70,60 105,80 105,120 70,140 35,120 35,80' fill='rgba(255,255,255,0.06)' stroke='rgba(255,110,10,0.15)' stroke-width='1.2' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-size: 70px 120px;
  background-repeat: repeat;

  /* about ??摮??莎??箏??嚗?*/
  --txt: rgba(255,255,255,0.92);
  --pri: #ff6622;
}
.stage--day {
  background-color: #ffffff;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='70' height='120'%3E%3Cpolygon points='35,0 70,20 70,60 35,80 0,60 0,20' fill='none' stroke='rgba(255,110,10,0.10)' stroke-width='1.2' stroke-linejoin='round'/%3E%3Cpolygon points='0,60 35,80 35,120 0,140 -35,120 -35,60' fill='none' stroke='rgba(255,110,10,0.10)' stroke-width='1.2' stroke-linejoin='round'/%3E%3Cpolygon points='70,60 105,80 105,120 70,140 35,120 35,80' fill='none' stroke='rgba(255,110,10,0.10)' stroke-width='1.2' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-size: 70px 120px;
  background-repeat: repeat;
}

/* ?? z:2 3D canvas layer ?? */
.bg-layer {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}
/* TresCanvas fills bg-layer */
.bg-layer :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
  background: transparent !important;
  /* mix-blend-mode: screen：黑色像素 = 透明，蜂巢透出；粒子顏色在極深底色下色差 < 5%
     繞過 THREE.Color 忽略 rgba alpha 的限制，不依賴 WebGL alpha 合成 */
  /* mix-blend-mode removed: hex-overlay handles texture */
}

/*
  ?? z:5 Pattern background overlay ??
  Placed ABOVE the canvas so the CSS grid lines overlay the whole scene.
  Only the 1px grid lines are non-transparent, so particles/canvas show through.
*/
/* ?? z:8 DNA decor (above pattern, below text) ?? */
.dna-layer {
  z-index: 8;
}

/* 1300vh spacer ??maxScroll = 1200vh ??p_max = 1200/400 = 3.0 */
.scroll-spacer { width: 100%; height: 1300vh; }

/* ?? Scene UI overlay ?? */
/*
  z-index 30 ??above bg-layer.
  pointer-events:none on the layer means wheel/touch pass through to Observer.
  Only .scene-cta restores pointer-events for clicks.
*/
.scene-ui {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  perspective: 900px;
  transform-style: preserve-3d;
}

.scene-block {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 1.25rem;
  padding: 0 4% 0 7%;
  max-width: 52vw;
  pointer-events: none;
  /* opacity ??sceneAlpha ?湔撽?嚗宏??CSS transition ?踹???蝺拙? */
  transform-style: preserve-3d;
  /* 隞亙椰??DNA嚗?6vw嚗頠詨? */
  transform-origin: 26vw 50%;
}

.scene-kicker {
  font-size: clamp(0.68rem, 1.4vw, 0.82rem);
  font-weight: 700;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--pri);
  opacity: 0.9;
  text-align: left;
}

.scene-title {
  font-size: clamp(2.4rem, 6.2vw, 5.8rem);
  font-weight: 900;
  line-height: 1.08;
  letter-spacing: -0.02em;
  color: var(--txt);
  text-shadow: 0 6px 34px rgba(0,0,0,0.55);
  margin: 0;
  text-align: left;
}

.scene-desc {
  font-size: clamp(0.88rem, 1.7vw, 1.02rem);
  line-height: 1.75;
  color: var(--txt);
  opacity: 0.7;
  margin: 0;
  max-width: 460px;
  text-align: left;
}

/* CTA: only interactive element in the overlay */
.scene-cta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: flex-start;
  margin-top: 0.5rem;
  pointer-events: auto; /* ??restores click capture for buttons only */
}

/* ?? Hero (centered) scene variant ??scene 0 & 5 ?? */
.scene-block--hero {
  align-items: center;
  max-width: 100%;
  padding: 0 10%;
  text-align: center;
}
.scene-block--hero .scene-title,
.scene-block--hero .scene-kicker,
.scene-block--hero .scene-desc { text-align: center; }

/* Hero title: extra large */
.scene-title--hero {
  font-size: clamp(3.2rem, 8.5vw, 9rem);
  letter-spacing: -0.03em;
}
.scene-subtitle {
  margin-top: 0.6rem;
  font-size: clamp(1.05rem, 2.2vw, 1.35rem);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--txt);
  opacity: 0.45;
  text-align: center;
}
.scene-hero-skip {
  margin-top: 0.15rem;
}

/* ?? Day mode text adjustments ?? */

/* ── Hex 紋理覆蓋層：官網蜂巢格紋疊在 WebGL canvas 上方 ──────────────────────
   z-index:10 高於 bg-layer(z:2)，低於 scene-ui(z:30)；pointer-events:none 不攔截輸入 */
.hex-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='70' height='120'%3E%3Cpolygon points='35,0 70,20 70,60 35,80 0,60 0,20' fill='rgba(255,255,255,0.06)' stroke='rgba(255,110,10,0.15)' stroke-width='1.2' stroke-linejoin='round'/%3E%3Cpolygon points='0,60 35,80 35,120 0,140 -35,120 -35,60' fill='rgba(255,255,255,0.06)' stroke='rgba(255,110,10,0.15)' stroke-width='1.2' stroke-linejoin='round'/%3E%3Cpolygon points='70,60 105,80 105,120 70,140 35,120 35,80' fill='rgba(255,255,255,0.06)' stroke='rgba(255,110,10,0.15)' stroke-width='1.2' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-size: 70px 120px;
  background-repeat: repeat;
}

/* ── 載入動畫 ─────────────────────────────────────────────────────────────────*/
.about-loader {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background-color: #0D0B0A;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='70' height='120'%3E%3Cpolygon points='35,0 70,20 70,60 35,80 0,60 0,20' fill='rgba(255,255,255,0.06)' stroke='rgba(255,110,10,0.15)' stroke-width='1.2' stroke-linejoin='round'/%3E%3Cpolygon points='0,60 35,80 35,120 0,140 -35,120 -35,60' fill='rgba(255,255,255,0.06)' stroke='rgba(255,110,10,0.15)' stroke-width='1.2' stroke-linejoin='round'/%3E%3Cpolygon points='70,60 105,80 105,120 70,140 35,120 35,80' fill='rgba(255,255,255,0.06)' stroke='rgba(255,110,10,0.15)' stroke-width='1.2' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-size: 70px 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.about-loader__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}
.about-loader__brand {
  font-family: inherit;
  font-size: clamp(2.8rem, 7vw, 5.5rem);
  font-weight: 700;
  letter-spacing: 0.30em;
  color: #fff;
  text-shadow:
    0 0 30px rgba(232,68,10,0.70),
    0 0 70px rgba(232,68,10,0.25);
  animation: loader-brand-pulse 2.4s ease-in-out infinite;
}
@keyframes loader-brand-pulse {
  0%, 100% { opacity: 0.80; text-shadow: 0 0 30px rgba(232,68,10,0.50), 0 0 70px rgba(232,68,10,0.18); }
  50%       { opacity: 1.00; text-shadow: 0 0 30px rgba(232,68,10,0.90), 0 0 80px rgba(232,68,10,0.40), 0 0 120px rgba(232,68,10,0.12); }
}
.about-loader__sub {
  font-size: 0.80rem;
  letter-spacing: 0.55em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.35);
  margin-top: -0.6rem;
}
/* DNA 均衡器：7 條垂直色條以波浪節奏振盪，象徵 DNA 橫桿 */
.about-loader__dna {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 1.4rem;
}
.about-loader__bar {
  display: block;
  width: 3px;
  border-radius: 2px;
  background: #e8440a;
  box-shadow: 0 0 8px rgba(232,68,10,0.70), 0 0 20px rgba(232,68,10,0.30);
  animation: dna-bar 1.6s ease-in-out infinite;
  animation-delay: calc((var(--i) - 1) * 0.13s);
}
@keyframes dna-bar {
  0%, 100% { height: 6px;  opacity: 0.35; }
  50%       { height: 36px; opacity: 1.00; }
}
/* 淡出轉場 */
.loader-out-leave-active { transition: opacity 0.9s cubic-bezier(0.4, 0, 0.2, 1); }
.loader-out-leave-to     { opacity: 0; }
.stage--day .scene-title {
  text-shadow: none;
  color: var(--txt);
}
.stage--day .scene-kicker {
  opacity: 0.75;
}
.stage--day .scene-desc {
  opacity: 0.6;
}

/* ?? Gene calculator FX (matrix rain) ?? */
.gene-fx-layer {
  /* MatrixGeneRain ?折撌脩? fixed/inset/pointer-events/瘛瑕?璅∪? */
  z-index: 4;
}


/* ?? Progress dots (right side) ?? */
.dots-nav {
  position: fixed;
  right: 1.4rem;
  top: 50%;
  transform: translateY(-50%);
  z-index: 32;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.dot {
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255,255,255,0.25);
  transition: all 1.33s cubic-bezier(0.4,0,0.2,1);
}
.stage--day .dot { background: rgba(0,0,0,0.18); }
.dot--active {
  background: var(--pri);
  transform: scale(1.6);
  box-shadow: 0 0 8px var(--pri-glow);
}

/* ?? Scroll hint ?? */
.scroll-hint {
  position: fixed;
  bottom: calc(env(safe-area-inset-bottom, 0px) - 1.5rem);
  left: 50%;
  transform: translateX(-50%);
  /* 手機底部導覽列 z-index 很高（TheBottomNav），這裡需要更高才不會被遮住 */
  z-index: 10002;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  pointer-events: none;
}

.hint-text {
  font-size: 0.84rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--txt);
  opacity: 0.65;
}

  
/* ── Lamp hint（參考 Inspira UI Lamp Effect：conic + spotlight + glowing line） ── */
.lamp-hint {
  position: relative;
  width: min(420px, 74vw);
  height: 120px;
  display: block;
  opacity: 1;
  filter:
    drop-shadow(0 0 22px rgba(255, 102, 34, 0.55))
    drop-shadow(0 0 44px rgba(255, 102, 34, 0.22));
}

.lamp-hint__cone,
.lamp-hint__spot,
.lamp-hint__line {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
}

.lamp-hint__cone {
  inset: 0;
  background:
    conic-gradient(
      from 180deg at 50% 0%,
      transparent 0deg 78deg,
      rgba(255, 102, 34, 0.62) 90deg,
      transparent 102deg 360deg
    );
  filter: blur(14px);
  mask-image: radial-gradient(ellipse 68% 100% at 50% 0%, #000 44%, transparent 92%);
  opacity: 1;
  transform: translateX(-50%) scaleY(0.92);
  transform-origin: 50% 0%;
  animation: lamp-cone 2.8s ease-in-out infinite;
}

.lamp-hint__spot {
  top: -12px;
  width: 260px;
  height: 84px;
  background:
    radial-gradient(circle at 50% 50%,
      rgba(255, 102, 34, 0.70) 0%,
      transparent 72%
    );
  filter: blur(10px);
  opacity: 1;
  animation: lamp-spot 2.8s ease-in-out infinite;
}

.lamp-hint__line {
  top: 18px;
  width: 3px;
  height: 74px;
  background: linear-gradient(
    to bottom,
    rgba(255, 102, 34, 0.95),
    rgba(255, 102, 34, 0.45),
    transparent
  );
  filter:
    drop-shadow(0 0 14px rgba(255, 102, 34, 0.55))
    drop-shadow(0 0 34px rgba(255, 102, 34, 0.22));
  transform-origin: top center;
  animation: lamp-line 2.8s ease-in-out infinite;
}

@keyframes lamp-cone {
  0%, 100% { opacity: 0.58; transform: translateX(-50%) scaleY(0.90) scaleX(0.95); }
  45%      { opacity: 1.00; transform: translateX(-50%) scaleY(1.00) scaleX(1.02); }
}

@keyframes lamp-spot {
  0%, 100% { opacity: 0.48; transform: translateX(-50%) scale(0.90); }
  45%      { opacity: 1.00; transform: translateX(-50%) scale(1.00); }
}

@keyframes lamp-line {
  0%, 100% { opacity: 0.45; transform: translateX(-50%) scaleY(0.60); }
  45%      { opacity: 1.00; transform: translateX(-50%) scaleY(1.00); }
}

@media (prefers-reduced-motion: reduce) {
  .lamp-hint__cone,
  .lamp-hint__spot,
  .lamp-hint__line { animation: none; }
}

/* Scroll hint leave transition */
.hint-fade-leave-active { transition: opacity 2s ease; }
.hint-fade-leave-to     { opacity: 0; }

/* ?? Mobile ?? */
/* ??????????????????????????????????????????????????????????????????????
   ????(??68px)
   ?????????????????????????????????????????????????????????????????????? */
@media (max-width: 768px) {

  /* ?? 獢?????嚗?璈?憿舐內嚗?? */
  /* 手機版：holo-layer 顯示，與桌機相同分布，卡片縮小 */
  .holo-layer { display: block; }
  .holo-card {
    width: 100px;
    transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease !important;
  }
  .holo-card__connector { display: none; }   /* ?典??∠?嚗ebGL 靘陷嚗?/
  .dna-layer     { display: none; }   /* 撌血 DNA 鋆ˇ嚗?蝛粹?嚗?/
  .gene-fx-layer { display: none; }   /* ?箏??剁?獢???嚗?/
  .dots-nav      { display: none; }   /* ?湔?內暺?*/

  /* ?? scroll hint ?? */
  /* 讓 Lamp 提示永遠在底部導覽列上方 */
  .scroll-hint { bottom: calc(env(safe-area-inset-bottom, 0px) + 56px - 1.8rem); }

  /* ????????????????????????????????????????????????????????????????????
     3D 頧嚗?璈??摰?嚗誑?Ｗ?銝剖亢?箄遘敹?
     ??????????????????????????????????????????????????????????????????? */

  /* 撅?1嚗?敶望? ??銝剖亢 perspective */
  .carousel-camera {
    perspective-origin: 50% 50%;
    overflow: hidden;    /* 鋆?頞?Ｗ???ａ???*/
  }

  /* 撅?2嚗??方遘敹宏?啗撟偌撟喃葉憭?*/
  .carousel-reel {
    left: 50%;
  }

  /* 撅?3嚗?憿摰對?撖?88vw 蝵桐葉撅? */
  .carousel-item__content {
    width: 88vw;
    max-width: 420px;
    padding-left: 0;
    align-items: center;   /* ??瘞游像蝵桐葉 */
    text-align: center;
  }

  /* ?? carousel 摮? */
  .carousel-item .scene-title {
    font-size: clamp(2rem, 8.5vw, 2.8rem);
    text-align: center;
  }

  .carousel-item .scene-kicker {
    font-size: 0.60rem;
    text-align: center;
  }

  .carousel-item .scene-desc {
    font-size: 0.85rem;
    line-height: 1.75;
    text-align: center;
    max-width: 320px;
  }

  .carousel-item .scene-cta {
    flex-direction: column;
    align-items: center;
    gap: 0.65rem;
  }

  /* Hero ?湔嚗?/5嚗?靽??Ｘ?憭批?閮剛? */
  .scene-block {
    max-width: 100%;
    align-items: center;
    padding: 0 7%;
    text-align: center;
    justify-content: center;
  }

  .scene-block .scene-title,
  .scene-block .scene-kicker { text-align: center; }

  .scene-title--hero {
    font-size: clamp(2.4rem, 10vw, 3.8rem);
  }
}

/* ??????????????????????????????????????????????????????????????????????
   3D 璅?頧
   ?????????????????????????????????????????????????????????????????????? */

/* 撅?1嚗?敶望?摰孵嚗erspective 瘛勗漲嚗?
   perspective-origin 敺?喟宏嚗?憿葉敹 33vw嚗?                       */
.carousel-camera {
  position: absolute;
  inset: 0;
  z-index: 30;
  pointer-events: none;
  perspective: 1000px;
  perspective-origin: 33vw 50%;
  /* opacity ??carouselAlpha ?湔撽?嚗宏??CSS transition ?踹?銝?蝺拙? */
}

/* 撅?2嚗 頠訾葉敹???
   ?? 銝身 CSS transition嚗??斤?亥???lerpedProgress
   ?見?湔??畾蛛?snap 蝛拙?敺?璅?敹?冽迤蝣箔?蝵殷?
   ?亙/??游??怎 lerpedProgress ??lerp 撟單???               */
.carousel-reel {
  position: absolute;
  left: 33vw;   /* 敺?喟宏嚗? perspective-origin 銝?湛? */
  top: 50%;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  /* transform 銝身 transition嚗 lerpedProgress 撽? */
}

/* 撅?3嚗?憿隞?*/
.carousel-item {
  position: absolute;
  left: 0;
  top: 0;
  transform-style: preserve-3d;
}

/* 璅??批捆???
   left:0, top:0 ???典??典??方遘敹?
   translate(-50%, -50%) 霈摰嫣誑頠詨??箔葉敹???
   撖砍漲 38vw嚗?6vw 簣 19vw ??7vw ~ 45vw                            */
.carousel-item__content {
  position: absolute;
  left: 0;
  top: 0;
  transform: translate(-50%, -50%);
  width: 38vw;
  max-width: 560px;
  padding-left: 4%;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  /* ?脫迫撖砍漲皞Ｗ??頞?Ｗ? */
  overflow: hidden;
}

/* 頧?抒?璅?摮?蝮桀?嚗??曉之鋆?嚗?*/
.carousel-item .scene-title {
  font-size: clamp(2rem, 4.8vw, 4.4rem);
  line-height: 1.1;
}
.carousel-item .scene-kicker {
  font-size: clamp(0.62rem, 1.2vw, 0.78rem);
}

/* scene 1-4 ??scene-block ?批捆撌脣蝘餉 carousel嚗迨閬?銝??閬?*/

/* ??????????????????????????????????????????????????????????????????????
   ?典??蔣?∠?撅?
   ?????????????????????????????????????????????????????????????????????? */
.holo-layer {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
}

/* ?? ?∠??箏?嚗??嚗??嗥葬?典?摰桅??改?opacity=0
      ???transition嚗ase-in 敹恍??                             ?? */
.holo-card {
  position: absolute;
  width: 240px;
  padding: 14px 18px 16px;
  background: rgba(4, 18, 24, 0.48);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 230, 255, 0.28);
  border-radius: 6px;
  box-shadow:
    0 0 14px rgba(0, 210, 255, 0.16),
    0 0 36px rgba(0, 210, 255, 0.07),
    inset 0 0 20px rgba(0, 200, 255, 0.04);
  overflow: visible;         /* 撘?蝺撓?箏????*/
  /* ?梯???*/
  opacity: 0;
  will-change: transform, opacity;
  /* ??湛????????鋡怎洵鈭?.holo-card 閬??箸迤撘潘? */
  transition:
    transform 0.56s cubic-bezier(0.60, 0, 0.98, 0.50),
    opacity   0.50s 0.06s ease-in;
}

/* ?? ?∠??航???撠? + 瘚桀?
      ?脣 transition嚗pring cubic-bezier ?堆?敺桀?                  ?? */
.holo-card--visible {
  opacity: 1;
  /* ?脣嚗?蝪抒楨??撠銝血凝敶?*/
  transition:
    transform 0.72s cubic-bezier(0.175, 0.885, 0.32, 1.275),
    opacity   0.28s ease;
  /* 瘚桀?嚗蝙??translate ?撅祆改?銝僕??transform ?脣? */
  animation: holo-float 6s ease-in-out infinite;
  animation-delay: var(--delay, 0s);
}

/* ?? Header ?? */
.holo-card__header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}

.holo-card__dot {
  display: block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(0, 230, 255, 0.72);
  box-shadow: 0 0 6px rgba(0, 230, 255, 0.85);
  animation: holo-blink 1.8s ease-in-out infinite;
}
.holo-card__dot--right {
  margin-left: auto;
  animation-delay: 0.9s;
}

.holo-card__label {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.60rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(0, 220, 255, 0.78);
  text-shadow: 0 0 8px rgba(0, 220, 255, 0.55);
}

/* ?? ?曉?瘥之摮??? */
.holo-card__pct {
  font-family: 'Courier New', Courier, monospace;
  font-size: 2.4rem;
  font-weight: 900;
  line-height: 1;
  color: #ffffff;
  text-shadow:
    0 0 10px rgba(0, 210, 255, 0.45),
    0 0 30px rgba(0, 180, 255, 0.20);
  letter-spacing: -0.02em;
  margin-bottom: 4px;
}

/* ?? ?箏??迂 ?? */
.holo-card__gene {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.20em;
  text-transform: uppercase;
  color: #ffffff;
  text-shadow: 0 0 8px rgba(255, 100, 30, 0.50);
  margin-bottom: 10px;
}

/* ?? ??蝺??? */
.holo-card__divider {
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg,
    transparent,
    rgba(0, 210, 255, 0.50) 30%,
    rgba(0, 210, 255, 0.50) 70%,
    transparent
  );
  margin-bottom: 8px;
}

/* ?? ???摮??? */
.holo-card__status {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(0, 255, 200, 0.65);
  text-shadow: 0 0 6px rgba(0, 255, 180, 0.45);
}

/* ?? 閬死?券?撘?蝺??梁?箏?嚗?? */
.holo-card__connector {
  position: absolute;
  display: flex;
  align-items: center;
  pointer-events: none;
}

/* ?喳撘?蝺?default嚗?*/
.holo-card__connector--right {
  right: 0;
  top: 50%;
  transform: translateY(-50%) translateX(100%) rotate(var(--conn-angle, 0deg));
  transform-origin: 0% 50%;
}

/* 撌血撘?蝺?瘞游像蝧餉?嚗?敺椰蝺??憭辣隡賂??孵????脣?頧?*/
.holo-card__connector--left {
  left: 0;
  top: 50%;
  transform: translateY(-50%) translateX(-100%) rotate(var(--conn-angle, 0deg));
  transform-origin: 100% 50%;
  flex-direction: row-reverse;  /* dot ?典椰蝡荔?摰悅?湛?嚗ine 敺?∠??孵?瘛∪ */
}

/* ?撘?蝺?敺?蝺??銝?line ?嚗ot ?冽?銝 */
.holo-card__connector--top {
  left: 50%;
  top: 0;
  transform: translateX(-50%) translateY(-100%) rotate(var(--conn-angle, 0deg));
  transform-origin: 50% 100%;
  flex-direction: column-reverse;  /* dot ?其?嚗?摰桀嚗?line 敺銝楚??*/
  align-items: center;
}

/* 撘?蝺?畾?*/
.holo-card__connector-line {
  width: 72px;
  height: 1px;
  flex-shrink: 0;
  background: linear-gradient(
    90deg,
    rgba(0, 215, 255, 0.65) 0%,
    rgba(0, 215, 255, 0.12) 80%,
    transparent 100%
  );
}

/* 撌血嚗撓撅斗?蕃頧?摰悅蝡臬撌?bright嚗?*/
.holo-card__connector--left .holo-card__connector-line {
  background: linear-gradient(
    270deg,
    rgba(0, 215, 255, 0.65) 0%,
    rgba(0, 215, 255, 0.12) 80%,
    transparent 100%
  );
}

/* ?嚗?畾菔?? */
.holo-card__connector--top .holo-card__connector-line {
  width: 1px;
  height: 60px;
  background: linear-gradient(
    0deg,
    rgba(0, 215, 255, 0.12) 0%,
    rgba(0, 215, 255, 0.65) 80%,
    transparent 100%
  );
}

.holo-card__connector-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: rgba(0, 220, 255, 0.82);
  box-shadow:
    0 0 5px  rgba(0, 220, 255, 0.95),
    0 0 14px rgba(0, 220, 255, 0.55);
  animation: holo-pulse 2.2s ease-in-out infinite;
}

/* ?∠???湛?????摨西?閬?頝?頝臬?嚗?隞亙??蝺??暺?*/
.holo-card {
  transition:
    transform 0.56s cubic-bezier(0.60, 0, 0.98, 0.50),
    opacity   0.50s 0.06s ease-in;
}

/* ?? ??蝺??? */
.holo-card__scanline {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg,
    transparent,
    rgba(0, 220, 255, 0.55),
    transparent
  );
  animation: holo-scan 3s linear infinite;
  pointer-events: none;
}

/* ??????????????????????????????????????????????????????????????????????
   Keyframes
   ?????????????????????????????????????????????????????????????????????? */

/* 瘚桀?嚗蝙??CSS ?撅祆?translate嚗???transform ?脣?銵? */
@keyframes holo-float {
  0%, 100% { translate: 0   0px; }
  50%       { translate: 0  -7px; }
}

@keyframes holo-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.15; }
}

@keyframes holo-pulse {
  0%, 100% { transform: scale(1);   opacity: 1; }
  50%       { transform: scale(1.5); opacity: 0.6; }
}

@keyframes holo-scan {
  0%   { top: 0%; }
  100% { top: 100%; }
}

/* Scene 5 蝯偏撠嚗????3嚗?*/
.scene-end-nav {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 2rem;
  pointer-events: auto;
}

</style>



