<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import DnaGeckoParticles from '@/components/DnaGeckoParticles.vue'
import GalleryGlitchScreen from '@/components/GalleryGlitchScreen.vue'
import HeroScrollProgress from '@/components/HeroScrollProgress.vue'

interface HeroGalleryCard {
  title: string
  color: string
  accent: string
  video: string
  to: string
  year: string
  kind: string
  description: string
}

const bottomRenderMode = ref<'always' | 'manual'>('always')
const particlesRef = ref<{ scrubTo: (progress: number, immediate?: boolean) => void } | null>(null)
const journeyProgress = ref(0)
// 終章揭露進度：白實驗室 + 玻璃蛋易觸發 Bloom，終章時把 Bloom 平滑壓下來（其他場景不動）。
const finaleReveal = ref(0)
function setFinaleReveal(v: number) {
  finaleReveal.value = v
}
const bloomStrength = computed(() => 0.18 * (1 - 0.88 * finaleReveal.value)) // 0.18 → ~0.022
const bloomThreshold = computed(() => 0.9 + 0.1 * finaleReveal.value) // 0.9 → 1.0（終章幾乎不發光暈）
const journeySegments = ref<{ key: string; end: number }[]>([])
const nativeHeroProgress = ref(0)
const nextSceneProgress = ref(0)
const selectedCard = ref<HeroGalleryCard | null>(null)
const isGalleryExiting = ref(false)
const galleryTransitionKey = ref(0)
let closeGalleryTimer: ReturnType<typeof setTimeout> | null = null
let nativeScrollFrame = 0
let initialStartClampFrame = 0
let initialStartClampTimer: number | null = null
let initialStartClampUntil = 0

const HERO_FORCE_START_EVENT = 'hero-lab:force-start'

function resetNativeHeroState() {
  nativeHeroProgress.value = 0
  nextSceneProgress.value = 0
  particlesRef.value?.scrubTo(0, true)
}

function clearInitialStartClamp() {
  if (initialStartClampFrame) {
    window.cancelAnimationFrame(initialStartClampFrame)
    initialStartClampFrame = 0
  }
  if (initialStartClampTimer) {
    window.clearTimeout(initialStartClampTimer)
    initialStartClampTimer = null
  }
}

function clampInitialHeroStart() {
  resetNativeHeroState()
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
}

function forceInitialHeroStart() {
  clearInitialStartClamp()
  initialStartClampUntil = performance.now() + 720
  clampInitialHeroStart()

  let frames = 0
  const clampFrame = () => {
    if (performance.now() > initialStartClampUntil) {
      initialStartClampFrame = 0
      return
    }
    clampInitialHeroStart()
    frames += 1
    if (frames < 10) {
      initialStartClampFrame = window.requestAnimationFrame(clampFrame)
    } else {
      initialStartClampFrame = 0
    }
  }
  initialStartClampFrame = window.requestAnimationFrame(clampFrame)

  initialStartClampTimer = window.setTimeout(() => {
    clampInitialHeroStart()
    initialStartClampTimer = null
    initialStartClampUntil = 0
    queueNativeHeroScrollSync()
  }, 740)
}

function getNativeHeroScrollProgress() {
  if (typeof document === 'undefined') return null
  if (!document.body.classList.contains('hero-lab-active')) return null
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
  return Math.max(0, Math.min(1, window.scrollY / maxScroll))
}

function syncNativeHeroScroll() {
  nativeScrollFrame = 0
  if (performance.now() < initialStartClampUntil) {
    clampInitialHeroStart()
    return
  }
  const progress = getNativeHeroScrollProgress()
  if (progress === null) return
  nativeHeroProgress.value = progress
  particlesRef.value?.scrubTo(progress, false)
}

function queueNativeHeroScrollSync() {
  if (performance.now() < initialStartClampUntil) {
    clampInitialHeroStart()
    return
  }
  if (nativeScrollFrame) return
  nativeScrollFrame = window.requestAnimationFrame(syncNativeHeroScroll)
}

function scrollNativeHeroTo(progress: number) {
  if (typeof document === 'undefined') return false
  if (!document.body.classList.contains('hero-lab-active')) return false
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
  if (maxScroll <= 0) return false
  window.scrollTo({
    top: Math.max(0, Math.min(1, progress)) * maxScroll,
    left: 0,
    behavior: 'auto'
  })
  return true
}

function setBottomRenderMode(mode: 'always' | 'manual') {
  if (bottomRenderMode.value !== mode) bottomRenderMode.value = mode
}

function onScrub(progress: number) {
  nativeHeroProgress.value = Math.max(0, Math.min(1, progress))
  if (scrollNativeHeroTo(progress)) return
  particlesRef.value?.scrubTo(progress)
}

function setJourneyProgress(value: number) {
  journeyProgress.value = value
}

function setJourneySegments(segments: { key: string; end: number }[]) {
  journeySegments.value = segments
}

function setNextSceneProgress(value: number) {
  nextSceneProgress.value = Math.max(0, Math.min(1, value))
}

function selectHeroCard(card: HeroGalleryCard) {
  if (closeGalleryTimer) {
    clearTimeout(closeGalleryTimer)
    closeGalleryTimer = null
  }
  isGalleryExiting.value = false
  galleryTransitionKey.value += 1
  selectedCard.value = card
}

function closeGalleryScene(lockReverse = true) {
  if (!selectedCard.value || isGalleryExiting.value) return
  isGalleryExiting.value = true
  galleryTransitionKey.value += 1
  if (closeGalleryTimer) clearTimeout(closeGalleryTimer)
  closeGalleryTimer = setTimeout(() => {
    selectedCard.value = null
    isGalleryExiting.value = false
    closeGalleryTimer = null
  }, 820)
}

function onGalleryWheel(event: WheelEvent) {
  event.preventDefault()
  event.stopPropagation()
  if (event.deltaY < 0) closeGalleryScene(true)
}

const nextSegmentEnd = computed(
  () => journeySegments.value.find((item) => item.key === 'next')?.end ?? 1
)
const placeholderSegmentEnd = computed(
  () => journeySegments.value.find((item) => item.key === 'placeholder')?.end ?? 1
)
const nativePlaceholderProgress = computed(() => {
  const start = nextSegmentEnd.value
  const end = placeholderSegmentEnd.value
  return Math.max(0, Math.min(1, (nativeHeroProgress.value - start) / Math.max(0.001, end - start)))
})

const finaleRevealProgress = computed(() => nativePlaceholderProgress.value)

const shopButtonProgress = computed(() => {
  const p = Math.max(0, Math.min(1, finaleRevealProgress.value))
  const t = Math.max(0, Math.min(1, (p - 0.82) / 0.12))
  return t * t * (3 - 2 * t)
})

const shopButtonStyle = computed(() => ({
  '--shop-progress': shopButtonProgress.value.toFixed(4)
}))

const finaleActions = [
  { label: '新手入門', english: 'Start Here', to: '/start-here' },
  { label: '選購守宮', english: 'Shop Geckos', to: '/shop' },
  { label: '特寵醫院', english: 'Exotic Vet', to: '/hospital' },
  { label: '基因計算', english: 'Genetics Lab', to: '/calculator' }
]

function goFinaleAction(to: string) {
  navigateTo(to)
}

onMounted(() => {
  forceInitialHeroStart()
  window.addEventListener(HERO_FORCE_START_EVENT, forceInitialHeroStart)
  window.addEventListener('scroll', queueNativeHeroScrollSync, { passive: true })
})

onBeforeUnmount(() => {
  if (closeGalleryTimer) clearTimeout(closeGalleryTimer)
  clearInitialStartClamp()
  window.removeEventListener(HERO_FORCE_START_EVENT, forceInitialHeroStart)
  window.removeEventListener('scroll', queueNativeHeroScrollSync)
  if (nativeScrollFrame) window.cancelAnimationFrame(nativeScrollFrame)
})
</script>

<template>
  <section class="hero-composite">
    <div class="hero-underlay">
      <div class="intro-backdrop" aria-hidden="true" />

      <div class="intro-copy">
        <p class="intro-eyebrow">ABOUT US</p>
        <h2 class="intro-title">
          <span>SCIENTIFIC BREEDING &amp;</span>
          <span>PREMIUM GECKO</span>
        </h2>
      </div>

      <div class="intro-meta">
        <p class="intro-meta__label">FOUNDED IN 2025</p>
        <p>
          We are a professional leopard gecko breeding team. Taking a scientific approach, we record
          the genetic data of each generation, and through precise daily nutritional management,
          select and breed gecko individuals with clear genetic profiles and robust builds. We are
          committed to providing comprehensive husbandry plans, offering keepers trustworthy,
          healthy geckos and long-term, professional care and breeding consultation services.
        </p>
      </div>

      <div class="band-logo-stage" aria-hidden="true">
        <div class="band-logo-rig">
          <ClientOnly>
            <HeroLogoDisc src="/logo.png" flip />
          </ClientOnly>
        </div>
      </div>
    </div>

    <div class="hero-canvas-shell">
      <TresCanvas
        class="hero-canvas"
        clear-color="#07080a"
        :alpha="true"
        :dpr="[1, 1.5]"
        :render-mode="bottomRenderMode"
      >
        <TresPerspectiveCamera :position="[0, 0, 7]" :fov="55" />
        <TresAmbientLight :intensity="0.5" />
        <TresDirectionalLight :position="[2.2, 3.6, 4.4]" :intensity="1.05" color="#ffd2a2" />
        <TresDirectionalLight :position="[0, 5.8, 6.8]" :intensity="0.68" color="#ffe2bd" />

        <DnaGeckoParticles
          ref="particlesRef"
          @bottom-render-mode="setBottomRenderMode"
          @card-select="selectHeroCard"
          @journey-progress="setJourneyProgress"
          @journey-segments="setJourneySegments"
          @next-scene-progress="setNextSceneProgress"
          @finale-reveal="setFinaleReveal"
        />

        <EffectComposer>
          <UnrealBloom :strength="bloomStrength" :radius="0.28" :threshold="bloomThreshold" />
        </EffectComposer>
      </TresCanvas>
    </div>

    <div class="scroll-cue" aria-hidden="true">
      <span class="scroll-cue__line" />
      <span class="scroll-cue__text">SCROLL</span>
    </div>

    <HeroScrollProgress
      v-show="!selectedCard"
      :progress="journeyProgress"
      :segments="journeySegments"
      @scrub="onScrub"
    />

    <div
      v-if="shopButtonProgress > 0.001"
      class="finale-action-grid"
      :class="{ 'finale-action-grid--active': shopButtonProgress > 0.5 }"
      :style="shopButtonStyle"
    >
      <button
        v-for="action in finaleActions"
        :key="action.to"
        class="finale-shop-button"
        type="button"
        @click="goFinaleAction(action.to)"
      >
        <span>{{ action.label }}</span>
        <small>{{ action.english }}</small>
      </button>
    </div>
    <Transition name="gallery">
      <div
        v-if="selectedCard"
        class="gallery-scene"
        :class="{ 'gallery-scene--exiting': isGalleryExiting }"
        role="dialog"
        aria-modal="true"
        @wheel="onGalleryWheel"
      >
        <div class="gallery-noise" aria-hidden="true" />
        <GalleryGlitchScreen
          :key="`${selectedCard.title}-${galleryTransitionKey}`"
          class="gallery-transition-canvas"
          :card="selectedCard"
          :mode="isGalleryExiting ? 'exit' : 'enter'"
        />
        <aside class="gallery-copy">
          <p class="gallery-kicker">GENCKO EXHIBIT</p>
          <h3>{{ selectedCard.title }}</h3>
          <p class="gallery-meta">{{ selectedCard.year }} / {{ selectedCard.kind }}</p>
          <p class="gallery-desc">{{ selectedCard.description }}</p>
          <button class="gallery-close" type="button" @click="closeGalleryScene(true)">
            &lt;- CLOSE
          </button>
        </aside>

        <div
          class="gallery-projector"
          :style="{ '--screen-accent': selectedCard.accent, '--screen-color': selectedCard.color }"
        >
          <div class="gallery-projector__ground" aria-hidden="true" />
          <div class="gallery-screen">
            <div class="gallery-screen__image">
              <video
                :key="`${selectedCard.title}-${galleryTransitionKey}`"
                class="gallery-screen__video"
                :src="selectedCard.video"
                autoplay
                muted
                loop
                playsinline
                controls
              />
              <span class="gallery-screen__live">VIDEO FEED / LIVE</span>
              <span class="gallery-screen__label">{{ selectedCard.title }}</span>
              <span class="gallery-screen__code">{{ selectedCard.kind }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.hero-composite {
  --hero-logo-mask-radius: clamp(96px, 10vw, 156px);
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #07080a;
}

.hero-underlay,
.hero-canvas-shell {
  position: absolute;
  inset: 0;
}

.hero-underlay {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: clamp(1.5rem, 6vw, 6rem);
  padding: clamp(3rem, 7vw, 6rem) clamp(1.6rem, 5vw, 5rem);
  isolation: isolate;
  background: rgba(7, 8, 10, var(--hero-underlay-bg-opacity, 1));
  opacity: var(--hero-underlay-opacity, 1);
  z-index: var(--hero-underlay-z, 1);
  clip-path: var(--hero-underlay-clip, polygon(0 0, 100% 0, 100% 100%, 0 100%));
  transition: none;
  pointer-events: none;
}

/* 斜帶內部凹陷光影：::before 內側陰影(multiply)、::after 兩緣白+橘高光(screen)
   兩者隨父層 clip-path 一起被裁到斜帶內；漸層由 JS 逐幀對齊帶緣 */
.hero-underlay::before,
.hero-underlay::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
}

.hero-underlay::before {
  background: var(--hero-underlay-shade-lo, none);
  mix-blend-mode: multiply;
}

.hero-underlay::after {
  background: var(--hero-underlay-shade-hi, none);
  filter: blur(1.2px);
  mix-blend-mode: screen;
  transform: translateZ(0);
}

.hero-canvas-shell {
  background: transparent;
  z-index: var(--hero-canvas-z, 2);
  clip-path: var(--hero-clip, polygon(0 0, 100% 0, 100% 100%, 0 100%));
  mix-blend-mode: var(--hero-canvas-blend, normal);
  will-change: clip-path;
}

.hero-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.scroll-cue {
  --cue-progress: var(--hero-scroll-progress, 0);
  position: fixed;
  left: 50%;
  top: calc(50% - var(--hero-logo-dna-lift, 0vh) - clamp(8.5rem, 14vw, 12.5rem));
  z-index: 5000;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
  color: rgba(255, 214, 166, 0.98);
  opacity: calc(1 - var(--cue-progress));
  transform: translate(-50%, calc(-50% + var(--cue-progress) * -48px));
  pointer-events: none;
  filter: drop-shadow(0 0 22px rgba(255, 178, 95, 0.42)) drop-shadow(0 14px 34px rgba(0, 0, 0, 0.5));
}

.scroll-cue__line {
  width: 2px;
  height: 5rem;
  background: linear-gradient(180deg, rgba(255, 196, 128, 0), rgba(255, 196, 128, 1));
  transform-origin: top;
  animation: scrollCueLine 1.45s ease-in-out infinite;
}

.scroll-cue__text {
  font-family: 'Courier New', Courier, monospace;
  font-size: 1rem;
  letter-spacing: 0.34em;
}

.finale-action-grid {
  position: fixed;
  left: 50%;
  bottom: max(1.5rem, calc(7vh - min(3vh, 28px)));
  z-index: 6650;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(0.45rem, 0.75vw, 0.8rem);
  width: min(54vw, 600px);
  opacity: var(--shop-progress, 0);
  pointer-events: none;
  transform: translate(-50%, calc(22px * (1 - var(--shop-progress, 0))))
    scale(calc(0.92 + var(--shop-progress, 0) * 0.08));
  transition:
    opacity 180ms ease,
    transform 260ms cubic-bezier(0.22, 0.8, 0.2, 1);
}

.finale-action-grid--active {
  pointer-events: auto;
}

.finale-shop-button {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.12rem;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: clamp(58px, 7.5vh, 74px);
  padding: 0 1rem;
  color: rgba(255, 246, 232, 0.96);
  font-family: 'Courier New', Courier, monospace;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.14),
      rgba(255, 255, 255, 0.02) 34%,
      rgba(11, 8, 5, 0.12) 100%
    ),
    linear-gradient(
      135deg,
      rgba(255, 233, 205, 0.08),
      rgba(255, 255, 255, 0) 46%,
      rgba(255, 211, 154, 0.08)
    );
  border: 1px solid rgba(255, 230, 196, 0.32);
  border-radius: min(4.05vh, 34px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.26),
    inset 0 0 18px rgba(255, 244, 223, 0.06),
    0 0 18px rgba(255, 169, 82, 0.08),
    0 12px 34px rgba(0, 0, 0, 0.26);
  backdrop-filter: blur(6px);
  transition:
    filter 160ms ease,
    border-color 160ms ease,
    transform 160ms ease,
    box-shadow 160ms ease;
  overflow: hidden;
}

.finale-shop-button::before,
.finale-shop-button::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.finale-shop-button::before {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0) 34%),
    linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.12),
      rgba(255, 255, 255, 0) 24%,
      rgba(255, 255, 255, 0.08) 52%,
      rgba(255, 255, 255, 0) 74%
    );
  mix-blend-mode: screen;
}

.finale-shop-button::after {
  inset: 1px;
  border-radius: inherit;
  border: 1px solid rgba(255, 248, 235, 0.14);
  box-shadow: inset 0 0 12px rgba(255, 247, 227, 0.06);
}

.finale-shop-button span {
  font-size: clamp(1rem, 1.8vw, 1.55rem);
}

.finale-shop-button small {
  color: rgba(255, 230, 198, 0.8);
  font-size: 0.72rem;
  letter-spacing: 0.34em;
  text-shadow: 0 1px 10px rgba(53, 27, 10, 0.24);
}

@media (hover: hover) and (pointer: fine) {
  .finale-shop-button:hover {
    border-color: rgba(255, 235, 198, 0.56);
    filter: brightness(1.08) saturate(1.08);
    transform: translateY(-2px) scale(1.018);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.32),
      inset 0 0 18px rgba(255, 240, 218, 0.08),
      0 0 24px rgba(255, 139, 46, 0.18),
      0 18px 44px rgba(0, 0, 0, 0.34);
  }
}

@media (max-width: 767px), (hover: none) {
  .finale-action-grid {
    bottom: max(1rem, 4vh);
    width: min(88vw, 480px);
    gap: 0.45rem;
  }

  .finale-shop-button {
    height: clamp(54px, 8vh, 66px);
    padding: 0 0.55rem;
  }

  .finale-shop-button span {
    font-size: clamp(0.86rem, 4vw, 1.05rem);
  }

  .finale-shop-button small {
    font-size: 0.58rem;
    letter-spacing: 0.18em;
  }
}

.gallery-scene {
  position: fixed;
  inset: 0;
  z-index: 7000;
  overflow: hidden;
  color: rgba(245, 241, 236, 0.92);
  background:
    radial-gradient(circle at 52% 42%, rgba(99, 152, 170, 0.18), transparent 24%),
    radial-gradient(circle at 30% 70%, rgba(214, 115, 62, 0.1), transparent 30%),
    linear-gradient(90deg, #0f0c0d, #050708 52%, #020304);
  isolation: isolate;
}

.gallery-scene::before,
.gallery-scene::after {
  content: '';
  position: absolute;
  pointer-events: none;
}

.gallery-scene::before {
  inset: -12%;
  z-index: 0;
  background:
    radial-gradient(
      ellipse at 62% 49%,
      color-mix(in srgb, var(--screen-color, #d88a48) 20%, transparent),
      transparent 31%
    ),
    linear-gradient(90deg, transparent 47%, rgba(255, 235, 209, 0.05) 50%, transparent 53%);
  filter: blur(22px);
  opacity: 0.78;
}

.gallery-scene::after {
  inset: 8% 7%;
  z-index: 1;
  border: 1px solid rgba(255, 222, 192, 0.07);
  clip-path: polygon(
    0 0,
    15% 0,
    15% 1px,
    85% 1px,
    85% 0,
    100% 0,
    100% 15%,
    calc(100% - 1px) 15%,
    calc(100% - 1px) 85%,
    100% 85%,
    100% 100%,
    85% 100%,
    85% calc(100% - 1px),
    15% calc(100% - 1px),
    15% 100%,
    0 100%,
    0 85%,
    1px 85%,
    1px 15%,
    0 15%
  );
  opacity: 0.72;
}

.gallery-noise {
  position: absolute;
  inset: -10%;
  z-index: 0;
  pointer-events: none;
  opacity: 0.48;
  background:
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.05) 0 1px, transparent 1px 4px),
    repeating-linear-gradient(90deg, rgba(255, 145, 78, 0.08) 0 1px, transparent 1px 19px),
    linear-gradient(115deg, transparent 0 24%, rgba(255, 255, 255, 0.08) 25%, transparent 26% 100%);
  mix-blend-mode: screen;
  mask-image: radial-gradient(ellipse at 52% 50%, #000 0 55%, transparent 83%);
  animation: galleryNoiseDrift 9s steps(8) infinite;
}

.gallery-transition-canvas {
  position: absolute;
  inset: 0;
  z-index: 4;
  width: 100%;
  height: 100%;
  pointer-events: none;
  mix-blend-mode: screen;
  animation: galleryTransitionOut 0.9s cubic-bezier(0.2, 0.84, 0.18, 1) both;
}

.gallery-scene--exiting .gallery-transition-canvas {
  animation: galleryTransitionExit 0.82s cubic-bezier(0.2, 0.84, 0.18, 1) both;
}

.gallery-scene--exiting .gallery-copy,
.gallery-scene--exiting .gallery-projector {
  opacity: 0;
  transition:
    opacity 0.36s ease,
    transform 0.36s cubic-bezier(0.2, 0.84, 0.18, 1);
}

.gallery-scene--exiting .gallery-copy {
  transform: translateY(-3.5vh) scale(0.98);
}

.gallery-scene--exiting .gallery-projector {
  transform: translateY(calc(-50% - 3.5vh)) perspective(1100px) rotateY(-5deg) rotateX(1.5deg)
    scale(0.98);
}

.gallery-copy {
  position: absolute;
  left: clamp(1.1rem, 3vw, 2.4rem);
  bottom: clamp(1.4rem, 6vh, 5rem);
  z-index: 5;
  width: min(22rem, calc(100vw - 2.2rem));
  font-family: 'Courier New', Courier, monospace;
  text-transform: uppercase;
  text-shadow: 0 0 20px rgba(255, 198, 150, 0.12);
}

.gallery-kicker {
  margin: 0 0 1.35rem;
  color: rgba(255, 188, 132, 0.9);
  font-size: 0.8rem;
  letter-spacing: 0.22em;
}

.gallery-copy h3 {
  margin: 0 0 1rem;
  font-size: clamp(1.15rem, 2vw, 1.6rem);
  line-height: 1.1;
  letter-spacing: -0.04em;
  color: #fff;
}

.gallery-meta {
  margin: 0 0 1.2rem;
  color: rgba(211, 199, 194, 0.56);
  font-size: 0.88rem;
  line-height: 1.8;
}

.gallery-desc {
  margin: 0 0 1.4rem;
  color: rgba(235, 226, 220, 0.72);
  font-size: 0.92rem;
  line-height: 1.75;
  text-transform: none;
  text-wrap: pretty;
}

.gallery-close {
  border: 0;
  padding: 0;
  color: rgba(245, 241, 236, 0.82);
  background: transparent;
  font: inherit;
  letter-spacing: 0.08em;
  text-decoration: underline;
  text-underline-offset: 0.22em;
  cursor: pointer;
}

.gallery-projector {
  position: absolute;
  left: clamp(23rem, 31vw, 37rem);
  top: 50%;
  z-index: 2;
  width: min(56vw, 760px);
  transform: translateY(-50%) perspective(1100px) rotateY(-5deg) rotateX(1.5deg);
  transform-origin: center;
  transform-style: preserve-3d;
  isolation: isolate;
  filter: drop-shadow(0 34px 90px rgba(0, 0, 0, 0.72));
}

.gallery-projector::after {
  content: '';
  position: absolute;
  z-index: -1;
  left: 50%;
  bottom: -8%;
  width: 50%;
  aspect-ratio: 3.8 / 1;
  border: 1px solid color-mix(in srgb, var(--screen-accent) 32%, transparent);
  border-radius: 50%;
  box-shadow:
    0 0 22px color-mix(in srgb, var(--screen-color) 28%, transparent),
    inset 0 0 14px color-mix(in srgb, var(--screen-accent) 16%, transparent);
  opacity: 0.54;
  transform: translateX(-50%) translateZ(-52px) perspective(620px) rotateX(68deg);
  transform-origin: center top;
}

.gallery-projector__ground {
  position: absolute;
  left: 50%;
  bottom: -24%;
  z-index: -3;
  width: 94%;
  aspect-ratio: 2.4 / 1;
  pointer-events: none;
  background:
    radial-gradient(
      ellipse at 50% 22%,
      color-mix(in srgb, var(--screen-color) 30%, transparent),
      transparent 42%
    ),
    radial-gradient(
      ellipse at 50% 36%,
      color-mix(in srgb, var(--screen-accent) 18%, transparent),
      transparent 68%
    );
  filter: blur(14px);
  mix-blend-mode: screen;
  opacity: 0.58;
  transform: translateX(-50%) translateZ(-76px) perspective(620px) rotateX(68deg);
  transform-origin: center top;
}

.gallery-screen {
  --screen-color: #d88a48;
  --screen-accent: #6f96c7;
  position: relative;
  aspect-ratio: 16 / 9.5;
  padding: clamp(0.55rem, 1vw, 0.9rem);
  transform: translateZ(24px);
  transform-style: preserve-3d;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(185, 176, 165, 0.78)),
    linear-gradient(90deg, rgba(255, 255, 255, 0.25), transparent);
  clip-path: polygon(4% 0, 96% 0, 100% 7%, 100% 92%, 96% 100%, 4% 100%, 0 92%, 0 7%);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.62),
    inset 0 -16px 28px rgba(0, 0, 0, 0.18),
    0 0 44px rgba(255, 201, 145, 0.13),
    0 20px 34px rgba(0, 0, 0, 0.34);
}

.gallery-screen::before,
.gallery-screen::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.gallery-screen::before {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.36),
    transparent 11% 89%,
    rgba(0, 0, 0, 0.26)
  );
  mix-blend-mode: overlay;
}

.gallery-screen::after {
  inset: 0.55rem;
  border: 1px solid rgba(255, 244, 229, 0.24);
  clip-path: inherit;
}

.gallery-screen__image {
  position: relative;
  display: grid;
  place-items: center;
  height: 100%;
  overflow: hidden;
  background:
    linear-gradient(120deg, color-mix(in srgb, var(--screen-accent) 70%, #071117), transparent 42%),
    radial-gradient(
      circle at 72% 36%,
      color-mix(in srgb, var(--screen-color) 62%, transparent),
      transparent 28%
    ),
    linear-gradient(
      160deg,
      #101416,
      color-mix(in srgb, var(--screen-color) 34%, #0d0f10) 48%,
      #060708
    );
  clip-path: polygon(4% 0, 96% 0, 100% 7%, 100% 92%, 96% 100%, 4% 100%, 0 92%, 0 7%);
}

.gallery-screen__video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #090b0c;
  filter: saturate(0.88) contrast(1.1) brightness(0.92);
  z-index: 0;
}

.gallery-screen__image::before {
  content: '';
  position: absolute;
  inset: -20%;
  background:
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.08) 0 1px, transparent 1px 5px),
    linear-gradient(105deg, transparent 0 40%, rgba(255, 255, 255, 0.16) 45%, transparent 54% 100%);
  opacity: 0.45;
  z-index: 1;
  pointer-events: none;
  mix-blend-mode: screen;
  animation: galleryScan 5.5s linear infinite;
}

.gallery-screen__label {
  position: relative;
  z-index: 2;
  color: rgba(255, 250, 242, 0.92);
  font-size: clamp(2.2rem, 6vw, 5.4rem);
  font-weight: 800;
  letter-spacing: -0.07em;
  text-shadow:
    0 0 20px color-mix(in srgb, var(--screen-color) 50%, transparent),
    0 12px 34px rgba(0, 0, 0, 0.55);
}

.gallery-screen__code {
  position: absolute;
  left: 2rem;
  bottom: 1.8rem;
  z-index: 2;
  color: rgba(255, 237, 218, 0.58);
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
}

.gallery-screen__live {
  position: absolute;
  top: 1.2rem;
  right: 1.45rem;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  color: rgba(255, 246, 233, 0.82);
  font-family: 'Courier New', Courier, monospace;
  font-size: clamp(0.57rem, 0.75vw, 0.72rem);
  letter-spacing: 0.12em;
}

.gallery-screen__live::before {
  content: '';
  width: 0.42rem;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--screen-color);
  box-shadow: 0 0 10px var(--screen-color);
}

/* 轉場前後淡入淡出，遮住 gallery WebGL 初始化那一兩幀的卡頓 */
.gallery-enter-active {
  transition:
    opacity 0.42s ease,
    filter 0.42s ease;
}

.gallery-leave-active {
  transition:
    opacity 0.36s ease,
    filter 0.36s ease;
}

.gallery-enter-from {
  opacity: 0;
  filter: blur(8px);
}

.gallery-leave-to {
  opacity: 0;
  filter: blur(10px);
}

.gallery-enter-active .gallery-projector {
  animation: galleryScreenIn 0.72s cubic-bezier(0.2, 0.84, 0.18, 1) both;
}

.gallery-enter-active .gallery-copy {
  animation: galleryCopyIn 0.55s cubic-bezier(0.2, 0.84, 0.18, 1) 0.08s both;
}

@keyframes scrollCueLine {
  0% {
    transform: scaleY(0.28);
    opacity: 0.35;
  }

  48% {
    transform: scaleY(1);
    opacity: 1;
  }

  100% {
    transform: scaleY(0.28) translateY(0.7rem);
    opacity: 0.25;
  }
}

@keyframes galleryScreenIn {
  from {
    opacity: 0;
    transform: translateY(-42%) perspective(1100px) rotateY(-17deg) rotateX(6deg) translateZ(-110px)
      scale(0.74);
  }

  to {
    opacity: 1;
    transform: translateY(-50%) perspective(1100px) rotateY(-5deg) rotateX(1.5deg) scale(1);
  }
}

@keyframes galleryTransitionOut {
  0% {
    opacity: 1;
    filter: saturate(1.35) contrast(1.14);
  }

  72% {
    opacity: 0.82;
  }

  100% {
    opacity: 0;
    filter: saturate(1) contrast(1);
  }
}

@keyframes galleryTransitionExit {
  0% {
    opacity: 0;
    filter: saturate(1) contrast(1);
  }

  18% {
    opacity: 1;
    filter: saturate(1.45) contrast(1.2);
  }

  100% {
    opacity: 0;
    filter: saturate(1) contrast(1);
  }
}

@keyframes galleryCopyIn {
  from {
    opacity: 0;
    transform: translateX(-1.2rem);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes galleryNoiseDrift {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }

  50% {
    transform: translate3d(-2%, 1%, 0);
  }
}

@keyframes galleryScan {
  from {
    transform: translateY(-10%);
  }

  to {
    transform: translateY(10%);
  }
}

.intro-backdrop {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: none;
  opacity: 0;
}

.intro-copy,
.intro-meta {
  position: relative;
  z-index: 1;
}

.intro-eyebrow,
.intro-meta__label,
.intro-meta p {
  font-family: 'Courier New', Courier, monospace;
}

.intro-copy,
.intro-meta {
  filter: drop-shadow(0 14px 34px rgba(0, 0, 0, 0.5));
  opacity: var(--hero-initial-copy-opacity, 0);
  transform-origin: center;
  transition: none;
}

.intro-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0 0 1.1rem;
  color: rgba(255, 178, 120, 0.9);
  font-size: 0.76rem;
  letter-spacing: 0.34em;
}

.intro-eyebrow::before {
  content: '';
  width: 1.8rem;
  height: 1px;
  background: linear-gradient(90deg, rgba(255, 138, 66, 0), rgba(255, 138, 66, 0.9));
}

.intro-title {
  margin: 0;
  font-size: clamp(2.5rem, 4.65vw, 5.05rem);
  line-height: 0.96;
  letter-spacing: -0.035em;
}

.intro-title span {
  display: block;
  color: transparent;
  -webkit-text-stroke: 1.35px rgba(252, 247, 240, 0.88);
  text-shadow:
    0 0 8px rgba(255, 244, 231, 0.14),
    0 0 18px rgba(255, 157, 96, 0.08);
}

.intro-copy {
  justify-self: start;
  max-width: 40rem;
  transform: translate(6vw, -11vh);
}

.intro-logo-stage {
  --hero-logo-mask-radius: clamp(96px, 10vw, 156px);
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: var(--hero-initial-logo-opacity, 0);
  transform: translate(-50%, calc(-50% - var(--hero-logo-dna-lift, 0vh)));
  pointer-events: none;
}

.intro-logo-rig {
  position: relative;
  width: clamp(190px, 20vw, 300px);
  aspect-ratio: 1 / 1;
  display: grid;
  place-items: center;
  transform: scale(var(--hero-initial-logo-scale, 0.92));
  transform-origin: center;
  filter: drop-shadow(0 24px 58px rgba(255, 122, 40, 0.34))
    drop-shadow(0 10px 30px rgba(255, 90, 30, 0.2));
}

.band-logo-stage {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 3;
  display: grid;
  place-items: center;
  opacity: var(--hero-band-logo-opacity, 0);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.band-logo-rig {
  width: clamp(190px, 20vw, 300px);
  aspect-ratio: 1 / 1;
  transform: scale(1.2);
  transform-origin: center;
  filter: brightness(0.9) saturate(0.98) drop-shadow(0 24px 58px rgba(255, 122, 40, 0.3))
    drop-shadow(0 10px 30px rgba(255, 90, 30, 0.2));
}

.intro-meta {
  justify-self: end;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  max-width: 24rem;
  color: rgba(243, 240, 235, 0.8);
  text-shadow:
    0 0 18px rgba(255, 180, 120, 0.08),
    0 10px 30px rgba(0, 0, 0, 0.5);
}

.intro-meta__label {
  margin: 0 0 0.2rem;
  padding-bottom: 0.7rem;
  border-bottom: 1px solid rgba(255, 170, 110, 0.16);
  font-size: 0.9rem;
  letter-spacing: 0.12em;
  color: #f7efe4;
}

.intro-meta p {
  margin: 0;
  font-size: 0.94rem;
  line-height: 1.75;
  letter-spacing: 0.04em;
}

@media (max-width: 1024px) {
  .hero-underlay {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }

  .intro-meta {
    align-items: center;
  }

  .intro-copy,
  .intro-meta {
    transform: none;
  }
}

@media (max-width: 767px), (hover: none), (pointer: coarse) {
  .hero-underlay {
    padding: 2.5rem 1.2rem 4rem;
    gap: 2rem;
  }

  .intro-title {
    font-size: clamp(1.75rem, 8vw, 3rem);
    line-height: 0.98;
  }

  .intro-meta p {
    font-size: 0.86rem;
    line-height: 1.7;
  }

  .intro-logo-rig {
    width: min(54vw, 240px);
  }
}
</style>
