<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getHeroPreview } from '~/utils/hero-previews'

// 圖片來自站內實際頁面；完整資訊及連結不依賴懸停或圖片成功載入。
const tools = [
  {
    to: '/calculator',
    name: '基因計算',
    category: 'GENETICS',
    fallback: '選擇親代 → 查看組合',
    action: '開啟計算機'
  },
  {
    to: '/hospital',
    name: '特寵醫院',
    category: 'CARE',
    fallback: '搜尋地區 → 查看醫院',
    action: '尋找特寵醫院'
  },
  {
    to: '/genes',
    name: '基因圖鑑',
    category: 'REFERENCE',
    fallback: '瀏覽基因 → 閱讀特徵',
    action: '開啟基因圖鑑'
  }
]
const failed = ref<Record<string, boolean>>({})
const previews = ref<HTMLImageElement[]>([])
// SSR 的圖片可能在 Vue 綁定事件前失敗，掛載時補查一次。
onMounted(() => {
  for (const image of previews.value) {
    if (image.complete && image.naturalWidth === 0 && image.dataset.tool) {
      failed.value[image.dataset.tool] = true
    }
  }
})
</script>

<template>
  <section class="home-tools" aria-labelledby="home-tools-title">
    <header class="home-tools__head">
      <div>
        <p class="experience-eyebrow">EXPLORE THE TOOLS</p>
        <h2 id="home-tools-title" class="sec-title">選育與照護工具</h2>
      </div>
    </header>
    <!-- 結構參考 Inspira UI Bento Grid，依本專案直角與行動版可讀性調整。 -->
    <div class="tool-preview-grid">
      <NuxtLink
        v-for="(tool, index) in tools"
        :key="tool.to"
        no-prefetch
        :to="tool.to"
        class="tool-preview interactive-card"
      >
        <div class="tool-preview__meta">
          <span>0{{ index + 1 }} / {{ tool.category }}</span>
          <span aria-hidden="true">↗</span>
        </div>
        <div class="tool-preview__media">
          <div class="tool-preview__windowbar" aria-hidden="true">
            <i />
            <i />
            <i />
            <span>{{ tool.category }} / GENCKO</span>
          </div>
          <img
            v-if="!failed[tool.to]"
            ref="previews"
            :data-tool="tool.to"
            :src="getHeroPreview(tool.to).poster"
            :alt="`${tool.name}介面預覽`"
            width="1280"
            height="720"
            loading="lazy"
            decoding="async"
            @error="failed[tool.to] = true"
          />
          <div v-else class="tool-preview__fallback">
            <span>{{ tool.name }}</span>
            <span>{{ tool.fallback }}</span>
          </div>
          <span class="tool-preview__caption">介面預覽</span>
        </div>
        <div class="tool-preview__body">
          <h3>{{ tool.name }}</h3>
          <span class="tool-preview__action">
            <HoverAction>{{ tool.action }}</HoverAction>
          </span>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.home-tools {
  padding-block: 24px;
  margin-block: 24px;
  border-bottom: 1px solid var(--bd);
}
.home-tools__head {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 16px;
  margin-bottom: 24px;
}
.experience-eyebrow {
  margin: 0 0 8px;
  color: var(--pri);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.14em;
}
.home-tools__intro {
  margin: 0;
  color: var(--txt-muted);
  font-size: 0.85rem;
  line-height: 1.7;
}
.sec-title {
  margin: 0;
  color: var(--txt);
  font-family: var(--font-heading-zh);
  font-size: clamp(1.4rem, 2.3vw, 1.85rem);
  font-weight: 600;
}
.tool-preview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}
.tool-preview {
  display: flex;
  flex-direction: column;
  min-width: 0;
  color: var(--txt);
  background: var(--card-bg-solid);
  border: 1px solid var(--bd);
  border-radius: 10px;
  text-decoration: none;
  transition:
    transform var(--motion-duration-ui) var(--motion-ease-out),
    border-color var(--motion-duration-ui) var(--motion-ease-out);
}
.tool-preview__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  color: var(--txt-muted);
  font-size: 0.63rem;
  font-weight: 700;
  letter-spacing: 0.12em;
}
.tool-preview__meta > span:last-child {
  color: var(--pri);
  font-size: 1rem;
}
.tool-preview__media {
  position: relative;
  aspect-ratio: 16 / 10;
  isolation: isolate;
  background: #eeebe5;
  margin: 12px 20px 8px;
  padding-top: 24px;
  border: 1px solid var(--bd-solid);
  border-radius: 6px;
  transition: transform 450ms var(--motion-ease-out);
}
.tool-preview__media::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 8px -8px -8px 8px;
  border: 1px solid var(--bd);
  border-radius: inherit;
  background: color-mix(in srgb, var(--pri) 10%, var(--card-bg-solid));
  transition: transform 450ms var(--motion-ease-out);
}
.tool-preview__windowbar {
  position: absolute;
  inset: 0 0 auto;
  height: 24px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding-inline: 9px;
  background: var(--card-bg-solid);
  border-radius: 5px 5px 0 0;
  border-bottom: 1px solid var(--bd);
  color: var(--txt-muted);
}
.tool-preview__windowbar i {
  width: 4px;
  height: 4px;
  background: currentColor;
  opacity: 0.6;
  border-radius: 50%;
}
.tool-preview__windowbar > span {
  margin-left: auto;
  font-size: 0.5rem;
  letter-spacing: 0.08em;
}
.tool-preview__media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: top;
  transition: transform var(--motion-duration-scene) var(--motion-ease-out);
}
.tool-preview__caption {
  position: absolute;
  bottom: 8px;
  left: 8px;
  padding: 4px 7px;
  background: #fff;
  color: #48433e;
  font-size: 0.6rem;
  border: 1px solid #d8d3ca;
}
.tool-preview__fallback {
  display: flex;
  height: 100%;
  min-height: 140px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  color: #48433e;
  font-size: 0.8rem;
}
.tool-preview__fallback > span:first-child {
  font-family: var(--font-heading-zh);
  font-size: 1.3rem;
}
.tool-preview__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 20px 18px 14px;
}
.tool-preview h3 {
  margin: 0;
  color: inherit;
  font-family: var(--font-heading-zh);
  font-size: 1.25rem;
}
.tool-preview__description {
  margin: 12px 0;
  color: var(--txt-muted);
  font-size: 0.85rem;
  line-height: 1.8;
}
.tool-preview__action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  margin-top: auto;
  padding-top: 8px;
  color: var(--pri);
  font-size: 0.78rem;
  font-weight: 700;
}
.tool-preview__action .hover-action {
  width: 100%;
}
.tool-preview__meta > span:last-child {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--bd);
  border-radius: 50%;
  transition:
    transform 320ms var(--motion-ease-out),
    background-color 180ms ease,
    color 180ms ease;
}
.tool-preview:focus-visible {
  outline: var(--focus-ring);
  outline-offset: 4px;
}
.tool-preview:active {
  transform: scale(0.99);
}
@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .tool-preview__media {
    transform: perspective(900px) rotateY(-5deg) rotateX(3deg) rotateZ(-1deg);
  }
  .tool-preview:hover {
    transform: translateY(-4px);
    border-color: var(--pri);
  }
  .tool-preview:is(:hover, :focus-visible) .tool-preview__media {
    transform: perspective(900px) rotateY(0) rotateX(0) rotateZ(0) translateY(-6px);
  }
  .tool-preview:is(:hover, :focus-visible) .tool-preview__media::before {
    transform: translate(4px, 4px) rotate(2deg);
  }
  .tool-preview:is(:hover, :focus-visible) .tool-preview__meta > span:last-child {
    transform: rotate(45deg);
    background: var(--pri-btn);
    color: white;
  }
}
@media (max-width: 767px) {
  .tool-preview-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .home-tools__head {
    display: block;
  }
  .home-tools__intro {
    margin-top: 12px;
  }
  .tool-preview__media {
    aspect-ratio: 16 / 10;
  }
  .tool-preview__body {
    padding-top: 16px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .tool-preview,
  .tool-preview__media img,
  .tool-preview__media,
  .tool-preview__media::before,
  .tool-preview__meta > span:last-child {
    transition: none;
    transform: none !important;
  }
}
</style>
