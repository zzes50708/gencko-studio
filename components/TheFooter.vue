<script setup lang="ts">
import { FOOTER_NAV_GROUPS } from '~/utils/site-navigation'
import { SOCIAL_LINKS } from '~/utils/site-constants'
</script>

<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <NuxtLink no-prefetch to="/" class="brand-name">GENCKO</NuxtLink>
        <p>專業豹紋守宮選育工作室</p>
        <div class="social-links" aria-label="Gencko 社群與客服">
          <a :href="SOCIAL_LINKS.line" target="_blank" rel="noopener noreferrer">LINE</a>
          <a :href="SOCIAL_LINKS.instagram" target="_blank" rel="noopener noreferrer">Instagram</a>
          <a :href="SOCIAL_LINKS.facebook" target="_blank" rel="noopener noreferrer">Facebook</a>
        </div>
      </div>

      <nav class="footer-navigation" aria-label="頁尾導覽">
        <section v-for="group in FOOTER_NAV_GROUPS" :key="group.label" class="footer-group">
          <h2>{{ group.label }}</h2>
          <NuxtLink no-prefetch v-for="link in group.links" :key="link.to" :to="link.to">
            {{ link.label }}
          </NuxtLink>
        </section>
      </nav>
    </div>

    <div class="footer-bottom">
      <span>© 2026 Gencko Studio. 版權所有</span>
      <span>從基因、照護到選購，讓每一步都有依據。</span>
    </div>
  </footer>
</template>

<style scoped>
/* 單一樣式來源：保留既有品牌、密度與裝置斷點，避免歷史主題層疊覆蓋。 */
.site-footer {
  width: 100%;
  margin-top: clamp(24px, 3vw, 40px);
  padding: clamp(36px, 4vw, 56px) max(20px, env(safe-area-inset-left, 0px)) 28px;
  color: #171714;
  background: #fff;
  border-top: 1px solid #e4e0d9;
}
.footer-inner,
.footer-bottom {
  width: min(1240px, 100%);
  margin-inline: auto;
}
.footer-inner {
  display: grid;
  grid-template-columns: minmax(240px, 1.4fr) minmax(0, 2.6fr);
  gap: clamp(54px, 8vw, 120px);
}
.footer-brand,
.footer-navigation,
.footer-group {
  min-width: 0;
}
.footer-brand {
  text-align: center;
}
.brand-name {
  color: var(--pri);
  font-size: clamp(1.6rem, 2.5vw, 2.5rem);
  font-weight: 800;
  letter-spacing: 0.18em;
  text-decoration: none;
}
.footer-brand p {
  max-width: 24ch;
  margin: 14px auto 20px;
  color: #6f6a63;
  font-size: 0.82rem;
  line-height: 1.7;
  text-align: center;
}
.social-links {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}
.footer-brand .social-links {
  justify-content: center;
}
.social-links a {
  min-height: auto;
  padding: 0 0 4px;
  color: #171714;
  border: 0;
  border-bottom: 1px solid #cfc9bf;
  border-radius: 0;
  font-size: 0.7rem;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-decoration: none;
}
.footer-navigation {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(20px, 4vw, 52px);
}
.footer-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}
.footer-group h2 {
  margin: 0 0 12px;
  color: #171714;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.14em;
}
.footer-group a {
  color: #6f6a63;
  font-size: 0.76rem;
  font-weight: 400;
  line-height: 1.45;
  text-decoration: none;
}
.brand-name,
.social-links a,
.footer-group h2,
.footer-group a {
  white-space: nowrap;
}
.footer-group a:hover,
.social-links a:hover {
  color: var(--pri);
  border-color: color-mix(in srgb, var(--pri) 55%, var(--bd));
}
.brand-name:focus-visible,
.footer-group a:focus-visible,
.social-links a:focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: 3px;
}
.footer-bottom {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin-top: clamp(24px, 3vw, 36px);
  padding-top: 18px;
  color: #6f6a63;
  font-size: 0.68rem;
  border-top: 1px solid #e4e0d9;
}
@media (max-width: 960px) {
  .footer-inner {
    grid-template-columns: minmax(0, 1fr);
    gap: 34px;
  }
  .footer-navigation {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 24px;
  }
}
@media (max-width: 640px) {
  .site-footer {
    margin-top: 24px;
    padding: 36px 18px calc(90px + env(safe-area-inset-bottom, 0px));
  }
  .footer-navigation {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 30px 18px;
  }
  .footer-bottom {
    flex-direction: column;
    gap: 8px;
    margin-top: 36px;
  }
}
@media (max-width: 360px) {
  .social-links {
    gap: 12px;
  }
  .footer-navigation {
    gap: 26px 12px;
  }
}
</style>
