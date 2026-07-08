<script setup lang="ts">
import type { PropType } from 'vue'

interface TimelineNode {
  no: string
  icon: string
  group: string
  title: string
  body: string
  to?: string
  linkLabel?: string
}

// buying-guide 專用的縱向時間軸。連接線以 flex 剩餘空間繪製，自動跟隨節點內容高度。
// 節點含可選 to / linkLabel：有 to 才在內文後渲染 inline 連結（純流程節點維持純文字）。
defineProps({
  kicker: { type: String, default: 'FLOW' },
  nodes: { type: Array as PropType<TimelineNode[]>, default: () => [] }
})
</script>

<template>
  <section class="poster card">
    <div class="poster-kicker">{{ kicker }}</div>

    <article v-for="node in nodes" :key="node.no" class="poster-node">
      <div class="node-pin">
        <div class="node-no">{{ node.no }}</div>
      </div>

      <div class="node-card">
        <div class="node-top">
          <span class="node-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.9"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              v-html="node.icon"
            />
          </span>
          <span class="node-group">{{ node.group }}</span>
        </div>
        <h2 class="node-title">{{ node.title }}</h2>
        <p class="node-body">{{ node.body }}</p>
        <NuxtLink v-if="node.to" :to="node.to" class="node-link">
          {{ node.linkLabel || '看更多' }}
          <span aria-hidden="true">→</span>
        </NuxtLink>
      </div>
    </article>
  </section>
</template>

<style scoped>
.poster {
  position: relative;
  padding: 20px;
  background: var(--card-bg);
}

.card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.poster-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  color: var(--pri);
  font-weight: 900;
  font-size: 0.82rem;
  letter-spacing: 0.16em;
}

.poster-kicker::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--pri);
  box-shadow: 0 0 0 4px var(--pri-glow-soft);
}

.poster-node {
  position: relative;
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 12px;
  align-items: stretch;
}

.poster-node:not(:last-child) {
  padding-bottom: 14px;
}

.node-pin {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.node-no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 2px solid rgba(232, 68, 10, 0.28);
  background: rgba(232, 68, 10, 0.06);
  color: var(--pri);
  font-weight: 900;
  font-size: 0.85rem;
}

/* 垂直連接線：吃 pin 欄的 flex 剩餘空間，內容變高也對齊 */
.poster-node:not(:last-child) .node-pin::after {
  content: '';
  width: 3px;
  flex: 1 1 auto;
  margin: 6px 0 -14px;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--pri), rgba(232, 68, 10, 0.2));
}

.node-card {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--bd);
  background: rgba(128, 128, 128, 0.05);
  transition:
    transform var(--transition),
    border-color var(--transition),
    box-shadow var(--transition);
}

.node-top {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.node-icon {
  display: inline-flex;
  color: var(--pri);
}

.node-icon svg {
  width: 18px;
  height: 18px;
}

.node-group {
  color: var(--pri);
  font-weight: 900;
  font-size: 0.8rem;
  letter-spacing: 0.1em;
}

.node-title {
  margin: 0;
  color: var(--txt);
  font-weight: 900;
  font-size: 1.05rem;
}

.node-body {
  margin: 0;
  color: var(--txt);
  opacity: 0.8;
  line-height: 1.5;
}

.node-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  color: var(--pri);
  font-weight: 800;
  font-size: 0.88rem;
  text-decoration: none;
}

@media (hover: hover) and (pointer: fine) {
  .node-card:hover {
    border-color: var(--bd-hover);
    transform: translateY(-3px);
    box-shadow: var(--shadow-hover);
  }

  .node-link:hover {
    text-decoration: underline;
  }
}

@media (max-width: 640px) {
  .poster {
    padding: 16px;
  }

  .poster-node {
    grid-template-columns: 40px 1fr;
    gap: 10px;
  }

  .node-no {
    width: 34px;
    height: 34px;
    font-size: 0.74rem;
  }

  .node-card {
    padding: 12px 14px;
  }

  .node-title {
    font-size: 0.98rem;
  }

  .node-body,
  .node-link {
    font-size: 0.82rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .node-card {
    transition: none;
  }

  .node-card:hover {
    transform: none;
  }
}
</style>
