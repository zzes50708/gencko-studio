<script setup>
const particles = [
  { id: 1, x: 8, y: 18, size: 2, delay: -1.2, duration: 6.2, drift: 8, peak: 0.56 },
  { id: 2, x: 17, y: 42, size: 3, delay: -4.4, duration: 7.8, drift: -10, peak: 0.7 },
  { id: 3, x: 25, y: 12, size: 1, delay: -2.7, duration: 5.4, drift: 12, peak: 0.52 },
  { id: 4, x: 31, y: 67, size: 2, delay: -5.1, duration: 8.6, drift: -7, peak: 0.62 },
  { id: 5, x: 39, y: 29, size: 2, delay: -3.3, duration: 6.8, drift: 9, peak: 0.58 },
  { id: 6, x: 46, y: 78, size: 1, delay: -0.8, duration: 5.9, drift: -11, peak: 0.5 },
  { id: 7, x: 53, y: 16, size: 3, delay: -6.2, duration: 8.2, drift: 6, peak: 0.66 },
  { id: 8, x: 59, y: 51, size: 2, delay: -2.1, duration: 7.1, drift: -8, peak: 0.64 },
  { id: 9, x: 66, y: 35, size: 1, delay: -4.8, duration: 5.7, drift: 13, peak: 0.54 },
  { id: 10, x: 73, y: 73, size: 2, delay: -1.6, duration: 8.9, drift: -9, peak: 0.6 },
  { id: 11, x: 81, y: 22, size: 2, delay: -5.7, duration: 6.5, drift: 7, peak: 0.68 },
  { id: 12, x: 91, y: 48, size: 3, delay: -3.9, duration: 7.6, drift: -12, peak: 0.72 },
  { id: 13, x: 12, y: 84, size: 1, delay: -6.8, duration: 6.1, drift: 10, peak: 0.48 },
  { id: 14, x: 22, y: 58, size: 2, delay: -0.4, duration: 8.4, drift: -6, peak: 0.6 },
  { id: 15, x: 36, y: 91, size: 3, delay: -4.2, duration: 7.3, drift: 8, peak: 0.68 },
  { id: 16, x: 49, y: 44, size: 1, delay: -2.9, duration: 5.6, drift: -13, peak: 0.5 },
  { id: 17, x: 62, y: 88, size: 2, delay: -5.4, duration: 8.1, drift: 7, peak: 0.62 },
  { id: 18, x: 77, y: 61, size: 1, delay: -1.9, duration: 6.7, drift: -8, peak: 0.52 },
  { id: 19, x: 86, y: 10, size: 2, delay: -6.5, duration: 7.9, drift: 11, peak: 0.64 },
  { id: 20, x: 96, y: 82, size: 2, delay: -3.6, duration: 6.3, drift: -7, peak: 0.58 }
]
</script>

<template>
  <div class="mobile-particle-field" aria-hidden="true">
    <span
      v-for="particle in particles"
      :key="particle.id"
      class="mobile-particle"
      :style="{
        '--x': `${particle.x}%`,
        '--y': `${particle.y}%`,
        '--size': `${particle.size}px`,
        '--delay': `${particle.delay}s`,
        '--duration': `${particle.duration}s`,
        '--drift': `${particle.drift}px`,
        '--peak': particle.peak
      }"
    />
  </div>
</template>

<style scoped>
.mobile-particle-field {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  opacity: 0.9;
  mix-blend-mode: screen;
}

.mobile-particle {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: var(--size);
  height: var(--size);
  border-radius: 999px;
  background: radial-gradient(
    circle,
    rgba(255, 185, 124, 0.95) 0 28%,
    rgba(255, 111, 38, 0.35) 58%,
    transparent 100%
  );
  box-shadow: 0 0 10px rgba(255, 108, 36, 0.58);
  opacity: 0.16;
  transform: translate3d(-50%, -50%, 0) scale(0.7);
  animation: mobile-particle-float var(--duration) ease-in-out var(--delay) infinite alternate;
}

@keyframes mobile-particle-float {
  0% {
    opacity: 0.12;
    transform: translate3d(calc(-50% - var(--drift)), -50%, 0) scale(0.7);
  }

  50% {
    opacity: var(--peak);
    transform: translate3d(-50%, calc(-50% - 8px), 0) scale(1);
  }

  100% {
    opacity: 0.2;
    transform: translate3d(calc(-50% + var(--drift)), -50%, 0) scale(0.78);
  }
}

@media (prefers-reduced-motion: reduce) {
  .mobile-particle {
    animation: none;
    opacity: var(--peak);
    transform: translate3d(-50%, -50%, 0) scale(0.9);
  }
}
</style>
