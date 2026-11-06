<script setup lang="ts">
const species = [
  {
    name: '豹紋守宮',
    latin: 'Eublepharis macularius',
    image: '/images/guide/leopard-gecko.webp',
    code: 'LEOPARD GECKO'
  },
  {
    name: '肥尾守宮',
    latin: 'Hemitheconyx caudicinctus',
    image: '/images/guide/fat-tailed-gecko.webp',
    code: 'FAT-TAILED GECKO'
  }
]
</script>

<template>
  <section class="brand-bridge" aria-labelledby="brand-bridge-title">
    <header class="species-routes-heading">
      <h2 id="brand-bridge-title">認識豹紋與肥尾守宮</h2>
    </header>
    <div class="species-routes">
      <article v-for="(item, index) in species" :key="item.name" class="species-route">
        <div class="species-route__image">
          <img
            :src="item.image"
            :alt="`${item.name}外觀`"
            width="1200"
            height="1200"
            loading="lazy"
          />
          <span class="species-route__number" aria-hidden="true">0{{ index + 1 }}</span>
        </div>
        <div class="species-route__body">
          <span class="species-route__code">{{ item.code }}</span>
          <h3>{{ item.name }}</h3>
          <i lang="la">{{ item.latin }}</i>
          <div class="species-route__actions">
            <NuxtLink
              no-prefetch
              :to="{ path: '/shop', query: { sp: item.name } }"
              :aria-label="`查看${item.name}個體`"
              class="interactive-card species-route__shop"
            >
              <HoverAction>查看個體</HoverAction>
            </NuxtLink>
            <NuxtLink
              no-prefetch
              to="/guide#guide-species"
              :aria-label="`認識${item.name}與另一物種的差異`"
              class="species-route__guide"
            >
              認識差異
              <span aria-hidden="true">→</span>
            </NuxtLink>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.brand-bridge {
  margin-block: 16px;
  padding-block: 16px 24px;
  border-block: 1px solid var(--bd);
  color: var(--txt);
}
.species-routes-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px 24px;
  margin-bottom: 16px;
}
.species-routes-heading h2 {
  margin: 0;
  font-family: var(--font-heading-zh);
  font-size: clamp(1.25rem, 2vw, 1.6rem);
  font-weight: 600;
  line-height: 1.4;
}
.species-routes-heading p {
  margin: 0;
  color: var(--txt-muted);
  font-size: 0.8rem;
  line-height: 1.7;
}
.species-routes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.species-route {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 20px;
  min-width: 0;
  border: 1px solid var(--bd);
  border-radius: 8px;
  padding: 16px;
  background: var(--card-bg-solid);
  transition: border-color 180ms ease;
}
.species-route__image {
  position: relative;
  align-self: center;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 4px;
  background: var(--specimen-mat, #efede8);
}
.species-route__image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 450ms var(--motion-ease-out);
}
.species-route__number {
  position: absolute;
  bottom: 8px;
  left: 8px;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--card-bg-solid);
  color: var(--txt-muted);
  font-size: 0.65rem;
}
.species-route__body {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  padding-block: 8px;
}
.species-route__code {
  color: var(--pri);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}
.species-route h3 {
  margin: 10px 0 6px;
  font-family: var(--font-heading-zh);
  font-size: clamp(1.15rem, 2vw, 1.6rem);
  line-height: 1.4;
}
.species-route i {
  color: var(--txt-muted);
  font-family: Georgia, serif;
  font-size: 0.75rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.species-route__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 20px;
}
.species-route__shop {
  display: inline-flex;
  max-width: 100%;
  text-decoration: none;
}
.species-route__guide {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  color: var(--txt-muted);
  font-size: 0.8rem;
  text-underline-offset: 4px;
}
.species-route__guide span {
  transition: transform 240ms var(--motion-ease-out);
}
.species-route__shop:focus-visible,
.species-route__guide:focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: 4px;
  border-radius: 4px;
}
@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .species-route:is(:hover, :focus-within) {
    border-color: var(--pri);
  }
  .species-route:is(:hover, :focus-within) img {
    transform: scale(1.045) rotate(-1deg);
  }
  .species-route:nth-child(2):is(:hover, :focus-within) img {
    transform: scale(1.045) rotate(1deg);
  }
  .species-route__guide:hover {
    color: var(--pri);
  }
  .species-route__guide:hover span {
    transform: translateX(3px);
  }
}
@media (max-width: 1023px) {
  .species-route {
    gap: 14px;
    padding: 12px;
  }
  .species-route__actions {
    gap: 4px 12px;
    margin-top: 12px;
  }
}
@media (max-width: 767px) {
  .species-routes-heading {
    display: block;
  }
  .species-routes-heading p {
    margin-top: 6px;
  }
  .species-routes {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .brand-bridge {
    margin-block: 8px;
    padding-block: 16px;
  }
  .species-route {
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  }
  .species-route__code {
    font-size: 0.55rem;
  }
  .species-route__actions .hover-action {
    padding-inline: 12px;
    gap: 12px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .species-route,
  .species-route__image img,
  .species-route__guide span {
    transition: none;
  }
  .species-route:is(:hover, :focus-within) img,
  .species-route__guide:hover span {
    transform: none !important;
  }
}
</style>
