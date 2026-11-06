<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  host: HTMLElement | null
  chapters: { id: string; label: string }[]
  label: string
  followNav?: boolean
}>()
const active = ref(0)
let observer: IntersectionObserver | undefined
const go = (event: MouseEvent, index: number) => {
  const target = props.host?.querySelector<HTMLElement>(`[id="${props.chapters[index]?.id}"]`)
  if (!target) return
  event.preventDefault()
  active.value = index
  const top = Math.max(
    0,
    target.getBoundingClientRect().top + window.scrollY - (window.innerWidth < 768 ? 80 : 140)
  )
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const lenis = (window as any).__lenis
  if (lenis) {
    lenis.resize()
    lenis.scrollTo(top, { duration: 0.65, immediate: reduced, force: true })
  } else window.scrollTo({ top, behavior: reduced ? 'instant' : 'smooth' })
  target.tabIndex = -1
  target.focus({ preventScroll: true })
}
// 以章節進出閱讀區域更新狀態，避免每次捲動逐一量測整頁。
watch(
  () => props.host,
  (host) => {
    observer?.disconnect()
    if (!import.meta.client || !host) return
    const visible = new Set<number>()
    const targets = props.chapters.map((chapter) =>
      host.querySelector<HTMLElement>(`[id="${chapter.id}"]`)
    )
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = targets.indexOf(entry.target as HTMLElement)
          if (entry.isIntersecting) visible.add(index)
          else visible.delete(index)
        }
        if (visible.size) active.value = Math.min(...visible)
      },
      { rootMargin: '-160px 0px -35% 0px', threshold: 0 }
    )
    targets.forEach((target) => {
      if (target) observer!.observe(target)
    })
  },
  { immediate: true, flush: 'post' }
)
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <nav
    class="chapter-trail"
    :class="{ 'chapter-trail--follow-nav': followNav }"
    :aria-label="label"
  >
    <a
      v-for="(chapter, index) in chapters"
      :key="chapter.id"
      :href="`#${chapter.id}`"
      :aria-current="active === index ? 'location' : undefined"
      @click="go($event, index)"
    >
      <span class="chapter-number" aria-hidden="true">0{{ index + 1 }}</span>
      <span>{{ chapter.label }}</span>
      <span class="chapter-line" aria-hidden="true" :class="{ 'is-active': active === index }" />
    </a>
  </nav>
</template>

<style scoped>
.chapter-trail {
  position: sticky;
  top: calc(var(--site-nav-height, 64px) + 8px);
  z-index: 8;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  background: var(--card-bg-solid);
  border-block: 1px solid var(--bd);
  margin-block: 16px;
}
.chapter-trail--follow-nav {
  transition: transform 200ms ease-out;
}
@media (min-width: 768px) {
  :global(body:has(.sticky-nav.nav-hidden) .chapter-trail--follow-nav:not(:focus-within)) {
    transform: translateY(calc(-100% - var(--site-nav-height, 64px) - 8px));
    pointer-events: none;
  }
}
.chapter-trail a {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 8px 12px;
  text-decoration: none;
  color: var(--txt-muted);
  font-size: 0.85rem;
}
.chapter-number {
  font-size: 0.65rem;
  font-variant-numeric: tabular-nums;
}
.chapter-trail a[aria-current] {
  color: var(--pri);
  font-weight: 800;
}
.chapter-line {
  position: absolute;
  inset: auto 0 -1px;
  height: 2px;
  background: var(--pri);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 320ms var(--motion-ease-out);
}
.chapter-line.is-active {
  transform: scaleX(1);
}
.chapter-trail a:focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: -3px;
}
@media (max-width: 767px) {
  .chapter-trail {
    top: 0;
  }
  .chapter-trail a {
    flex-direction: column;
    justify-content: center;
    gap: 3px;
    padding: 8px 2px;
    font-size: 0.75rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .chapter-trail--follow-nav,
  .chapter-line {
    transition: none;
  }
}
</style>
