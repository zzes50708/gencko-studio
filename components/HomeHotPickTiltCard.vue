<script setup>
import { computed } from 'vue'
import { getCleanUrl } from '~/utils/image'
import AtroposCard from '~/components/AtroposCard.vue'

const props = defineProps({
  item: { type: Object, required: true },
  idx: { type: Number, required: true },
  isAuction: { type: Boolean, default: false }
})

const imageAlt = computed(() => `${props.item?.Morph || ''} 守宮`)
</script>

<template>
  <AtroposCard
    :rotate="12"
    :highlight="false"
    :shadow="false"
    :lazy-init="true"
    :base-rotate-y="14"
    :base-rotate-x="2"
  >
    <div class="hot-card-item hot-card-tilt">
      <NuxtLink
        :to="`/product/${item.ID}`"
        style="display: block; text-decoration: none; color: inherit; height: 100%"
      >
        <div style="position: relative">
          <img
            v-if="item.ImageURL && idx < 4"
            :src="getCleanUrl(item.ImageURL, 300)"
            :alt="imageAlt"
            class="card-img"
            loading="eager"
            fetchpriority="high"
          />
          <img
            v-else-if="item.ImageURL"
            :src="getCleanUrl(item.ImageURL, 300)"
            :alt="imageAlt"
            class="card-img"
            loading="lazy"
            decoding="async"
          />
          <div
            v-else
            class="card-img"
            style="
              display: flex;
              align-items: center;
              justify-content: center;
              color: #666;
              font-size: 0.95rem;
              background: #1a1a1a;
            "
          >
            無圖片
          </div>

          <div v-if="item.Status === 'Sold'" class="hot-stamp hot-stamp-sold">SOLD</div>
          <div
            v-else-if="item.Status === 'Auction' && isAuction"
            class="hot-stamp hot-stamp-auction"
          >
            競標
          </div>
        </div>

        <div class="card-body">
          <h3 class="slim-title" style="margin: 0">{{ item.Morph }}</h3>
          <div class="slim-price-row" style="margin-top: 4px">
            <template v-if="item.Status === 'Sold'">
              <span class="status-badge s-sold">售出</span>
            </template>
            <template v-else>
              <div class="price slim-price">NT$ {{ item.ListingPrice }}</div>
            </template>
          </div>
        </div>
      </NuxtLink>
    </div>
  </AtroposCard>
</template>
