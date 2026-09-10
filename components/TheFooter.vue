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
.site-footer {
  width: 100%;
  margin-top: 56px;
  padding: 42px max(20px, env(safe-area-inset-left, 0px)) 28px;
  color: var(--txt);
  background:
    radial-gradient(
      circle at 8% 12%,
      color-mix(in srgb, var(--pri) 10%, transparent),
      transparent 34%
    ),
    var(--card-bg-solid);
  border-top: 1px solid var(--bd);
}

.footer-inner,
.footer-bottom {
  width: min(1180px, 100%);
  margin-inline: auto;
}

.footer-inner {
  display: grid;
  grid-template-columns: minmax(220px, 1.15fr) minmax(0, 3fr);
  gap: 48px;
}

.brand-name {
  color: var(--pri);
  font-size: clamp(1.35rem, 2vw, 1.8rem);
  font-weight: 950;
  letter-spacing: 0.12em;
  text-decoration: none;
}

.footer-brand p {
  max-width: 24ch;
  margin: 8px 0 20px;
  color: var(--txt-muted);
  line-height: 1.7;
}

.social-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.social-links a {
  min-height: 38px;
  padding: 9px 12px;
  color: var(--txt);
  font-size: 0.82rem;
  font-weight: 850;
  text-decoration: none;
  border: 1px solid var(--bd);
  border-radius: 999px;
}

.footer-navigation {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 28px;
}

.footer-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.footer-group h2 {
  margin: 0 0 4px;
  color: var(--txt);
  font-size: 0.88rem;
  font-weight: 950;
  letter-spacing: 0.04em;
}

.footer-group a {
  color: var(--txt-muted);
  font-size: 0.84rem;
  line-height: 1.45;
  text-decoration: none;
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
  margin-top: 36px;
  padding-top: 18px;
  color: var(--txt-muted);
  font-size: 0.78rem;
  border-top: 1px solid var(--bd);
}

@media (max-width: 960px) {
  .footer-inner {
    grid-template-columns: 1fr;
    gap: 32px;
  }
}

@media (max-width: 640px) {
  .site-footer {
    margin-top: 40px;
    padding: 34px 16px calc(82px + env(safe-area-inset-bottom, 0px));
  }

  .footer-navigation {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 28px 18px;
  }

  .footer-bottom {
    flex-direction: column;
    gap: 8px;
  }
}

/* Boutique shell v0 */
.site-footer {
  margin-top: clamp(70px, 10vw, 150px);
  padding: clamp(54px, 7vw, 92px) max(20px, env(safe-area-inset-left, 0px)) 28px;
  color: #171714;
  background: #fff;
  border-top: 1px solid #e4e0d9;
}

.footer-inner,
.footer-bottom {
  width: min(1240px, 100%);
}

.footer-inner {
  grid-template-columns: minmax(240px, 1.4fr) minmax(0, 2.6fr);
  gap: clamp(54px, 8vw, 120px);
}

.brand-name {
  color: var(--pri);
  font-size: clamp(1.6rem, 2.5vw, 2.5rem);
  font-weight: 800;
  letter-spacing: 0.18em;
}

.footer-brand p {
  margin-top: 14px;
  color: #6f6a63;
  font-size: 0.82rem;
}

.social-links {
  gap: 18px;
}

.social-links a {
  min-height: auto;
  padding: 0 0 4px;
  color: #171714;
  border: 0;
  border-bottom: 1px solid #cfc9bf;
  border-radius: 0;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
}

.footer-navigation {
  gap: clamp(20px, 4vw, 52px);
}

.footer-group {
  gap: 12px;
}

.footer-group h2 {
  margin-bottom: 12px;
  color: #171714;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.footer-group a {
  color: #6f6a63;
  font-size: 0.76rem;
  font-weight: 400;
}

.footer-bottom {
  margin-top: clamp(24px, 3vw, 36px);
  padding-top: 18px;
  color: #6f6a63;
  border-top-color: #e4e0d9;
  font-size: 0.68rem;
}

@media (max-width: 640px) {
  .site-footer {
    margin-top: 72px;
    padding: 56px 18px calc(90px + env(safe-area-inset-bottom, 0px));
  }

  .footer-navigation {
    gap: 34px 20px;
  }
}

/* Shared responsive footer correction */
.site-footer {
  margin-top: clamp(24px, 3vw, 40px);
  padding-top: clamp(36px, 4vw, 56px);
}

.footer-brand,
.footer-navigation,
.footer-group {
  min-width: 0;
}

.footer-brand {
  text-align: center;
}

.footer-brand p {
  margin-inline: auto;
  text-align: center;
}

.footer-brand .social-links {
  justify-content: center;
}

.brand-name,
.social-links a,
.footer-group h2,
.footer-group a {
  white-space: nowrap;
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
