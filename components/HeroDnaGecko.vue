<script setup lang="ts">
import { ref } from 'vue'
import DnaGeckoParticles from '@/components/DnaGeckoParticles.vue'

const bottomRenderMode = ref<'always' | 'manual'>('always')

function setBottomRenderMode(mode: 'always' | 'manual') {
  if (bottomRenderMode.value !== mode) bottomRenderMode.value = mode
}
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

      <div class="intro-logo-stage" aria-label="Gencko 3D Logo">
        <div class="intro-logo-rig">
          <ClientOnly>
            <HeroLogoDisc src="/logo.png" />
          </ClientOnly>
        </div>
      </div>
    </div>

    <div class="hero-canvas-shell">
      <TresCanvas
        class="hero-canvas"
        clear-color="#07080a"
        :alpha="false"
        :dpr="[1, 1.5]"
        :render-mode="bottomRenderMode"
      >
        <TresPerspectiveCamera :position="[0, 0, 7]" :fov="55" />
        <TresAmbientLight :intensity="0.5" />
        <TresDirectionalLight :position="[2.2, 3.6, 4.4]" :intensity="1.05" color="#ffd2a2" />

        <DnaGeckoParticles @bottom-render-mode="setBottomRenderMode" />

        <EffectComposer>
          <UnrealBloom :strength="0.18" :radius="0.18" :threshold="0.95" />
        </EffectComposer>
      </TresCanvas>
    </div>

    <div class="scroll-cue" aria-hidden="true">
      <span class="scroll-cue__line" />
      <span class="scroll-cue__text">SCROLL</span>
    </div>
  </section>
</template>

<style scoped>
.hero-composite {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 18%, rgba(255, 148, 72, 0.08), transparent 24%),
    radial-gradient(circle at 78% 62%, rgba(123, 197, 255, 0.08), transparent 28%), #07080a;
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
  background: #07080a;
  opacity: var(--hero-underlay-opacity, 0);
  z-index: var(--hero-underlay-z, 1);
  clip-path: var(--hero-underlay-clip, polygon(0 0, 100% 0, 100% 100%, 0 100%));
  transition: none;
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
  mix-blend-mode: screen;
}

.hero-canvas-shell {
  z-index: 2;
  clip-path: var(--hero-clip, polygon(0 0, 100% 0, 100% 100%, 0 100%));
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
  top: 68%;
  z-index: 5000;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
  color: rgba(255, 214, 166, 0.98);
  opacity: calc(1 - var(--cue-progress));
  transform: translate(-50%, calc(-50% + var(--cue-progress) * -72px));
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

.intro-backdrop {
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(circle at 50% 50%, rgba(255, 154, 87, 0.07), transparent 20%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.012), rgba(255, 255, 255, 0)), #07080a;
  opacity: 1;
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
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translate(-50%, -50%);
}

.intro-logo-rig {
  position: relative;
  width: clamp(260px, 28vw, 420px);
  aspect-ratio: 1 / 1;
  display: grid;
  place-items: center;
  filter: drop-shadow(0 18px 42px rgba(255, 122, 40, 0.22))
    drop-shadow(0 8px 24px rgba(255, 90, 30, 0.12));
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
    width: min(76vw, 340px);
  }
}
</style>
