<template>
  <span class="hover-action">
    <span class="hover-action__text"><slot /></span>
    <span class="hover-action__arrows" aria-hidden="true">
      <svg
        v-for="copy in 2"
        :key="copy"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
      >
        <path d="M6 18 18 6M6 6h12v12" />
      </svg>
    </span>
  </span>
</template>

<style>
/* 卡片本身是連結，這裡只負責視覺回饋，避免連結內再嵌套按鈕。 */
.hover-action {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
  min-height: 44px;
  max-width: 100%;
  padding: 9px 16px;
  overflow: hidden;
  border: 1px solid var(--pri-btn);
  border-radius: 999px;
  color: var(--pri);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.5;
  transition: color 180ms ease;
}
.hover-action::before {
  position: absolute;
  content: '';
  inset: -1px;
  z-index: -1;
  border-radius: inherit;
  background: var(--pri-btn);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 320ms var(--motion-ease-out);
}
.hover-action__arrows {
  position: relative;
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
  overflow: hidden;
}
.hover-action__arrows svg {
  position: absolute;
  inset: 0;
  width: 20px;
  height: 20px;
  transition: transform 320ms var(--motion-ease-out);
}
.hover-action__arrows svg:last-child {
  transform: translate(-125%, 125%);
}
.interactive-card:focus-visible .hover-action {
  color: white;
}
.interactive-card:focus-visible .hover-action::before {
  transform: scaleX(1);
}
.interactive-card:focus-visible .hover-action__arrows svg:first-child {
  transform: translate(125%, -125%);
}
.interactive-card:focus-visible .hover-action__arrows svg:last-child {
  transform: translate(0, 0);
}
@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .interactive-card:hover .hover-action {
    color: white;
  }
  .interactive-card:hover .hover-action::before {
    transform: scaleX(1);
  }
  .interactive-card:hover .hover-action__arrows svg:first-child {
    transform: translate(125%, -125%);
  }
  .interactive-card:hover .hover-action__arrows svg:last-child {
    transform: translate(0, 0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .hover-action,
  .hover-action::before,
  .hover-action__arrows svg {
    transition: none;
  }
}
</style>
