<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image.js'

const store = useMainStore()
const route = useRoute()
const router = useRouter()

useHead({ title: '個體比較' })

// 🌟 加入 (store.compareList || []) 保護
const ids = computed(() => {
    if (route.query.ids) return String(route.query.ids).split(',').filter(Boolean).slice(0, 3)
    return (store.compareList || []).slice(0, 3)
})

// 🌟 加入 (store.inv || []) 保護
const items = computed(() =>
    ids.value.map(id => (store.inv || []).find(i => i.ID === id)).filter(Boolean)
)

const allGenes = computed(() => {
    const sets = items.value.map(i => new Set(Array.isArray(i.Genes) ? i.Genes : []))
    const allSet = new Set(sets.flatMap(s => [...s]))
    return [...allSet].map(g => ({
        gene: g,
        shared: sets.every(s => s.has(g)),
        owners: items.value.filter((_, idx) => sets[idx].has(g)).length
    })).sort((a, b) => b.owners - a.owners)
})

const fmtSex = (i) => {
    if (!i) return '-'
    if (i.GenderType === '溫控') {
        const t = +i.GenderValue
        if (t >= 31) return `${t}°C（90% 公）`
        if (t >= 30) return `${t}°C（75% 公）`
        if (t >= 28) return `${t}°C（均等）`
        if (t >= 27) return `${t}°C（75% 母）`
        return `${t}°C（90% 母）`
    }
    return i.GenderType || '-'
}

const fmtStatus = (i) => {
    if (!i) return '-'
    if (i.Status === 'ForSale') return '出售中'
    if (i.Status === 'Auction') return '競標中'
    if (i.Status === 'Sold') return '已售出'
    return i.Status
}

const fmtPrice = (i) => {
    if (!i) return '-'
    if (i.Status === 'Sold') return `已售 $${i.SoldPrice || '?'}`
    if (i.ListingPrice) return `NT$ ${i.ListingPrice}`
    return '-'
}

// 🌟 加入 (store.auctionList || []) 保護
const hasActiveAuction = (id) => (store.auctionList || []).some(a => a.animal_id === id)

const getAuctionLink = (id) => {
    const auction = (store.auctionList || []).find(a => a.animal_id === id)
    return auction ? `/auction/${auction.id}` : '/auction'
}

const removeItem = (id) => {
    store.toggleCompare(id)
    if ((store.compareList || []).length === 0) router.push('/shop')
}
</script>

<template>
    <div class="compare-page">
        <div class="compare-header">
            <NuxtLink to="/shop" class="back-btn">← 返回商城</NuxtLink>
            <h1 class="page-title" style="margin:0;">個體並排比較</h1>
            <button v-if="store.compareList.length > 0" class="clear-all-btn" @click="store.clearCompare(); router.push('/shop')">清除全部</button>
        </div>

        <div v-if="items.length === 0" class="empty-compare">
            <div style="font-size:3rem; margin-bottom:16px;">🦎</div>
            <p>尚未選擇任何個體</p>
            <NuxtLink to="/shop" class="btn-hero" style="text-decoration:none; display:inline-block; margin-top:12px;">前往選購</NuxtLink>
        </div>

        <div v-else class="compare-layout" :class="`cols-${items.length}`">
            <!-- 圖片列 -->
            <div class="compare-row header-row">
                <div class="row-label">個體</div>
                <div v-for="item in items" :key="item.ID" class="col-cell img-cell">
                    <button class="remove-btn" @click="removeItem(item.ID)" title="移除">✕</button>
                    <NuxtLink :to="`/product/${item.ID}`" style="display:block; text-decoration:none;">
                        <img v-if="item.ImageURL" :src="getCleanUrl(item.ImageURL, 400)" :alt="item.Morph" class="compare-img" />
                        <div v-else class="compare-img-placeholder">🦎</div>
                        <div class="item-morph">{{ item.Morph }}</div>
                        <div class="item-id">ID: {{ item.ID }}</div>
                    </NuxtLink>
                </div>
            </div>

            <!-- 物種 -->
            <div class="compare-row">
                <div class="row-label">物種</div>
                <div v-for="item in items" :key="item.ID" class="col-cell">{{ item.Species }}</div>
            </div>

            <!-- 性別 -->
            <div class="compare-row">
                <div class="row-label">性別</div>
                <div v-for="item in items" :key="item.ID" class="col-cell">{{ fmtSex(item) }}</div>
            </div>

            <!-- 出生 -->
            <div class="compare-row">
                <div class="row-label">出生日期</div>
                <div v-for="item in items" :key="item.ID" class="col-cell">{{ item.Birthday || '未登錄' }}</div>
            </div>

            <!-- 基因 -->
            <div class="compare-row">
                <div class="row-label">基因</div>
                <div v-for="item in items" :key="item.ID" class="col-cell gene-cell">
                    <span
                        v-for="g in (Array.isArray(item.Genes) ? item.Genes : [])"
                        :key="g"
                        class="gene-tag"
                        :class="{
                            shared: allGenes.find(ag => ag.gene === g)?.shared,
                            unique: allGenes.find(ag => ag.gene === g)?.owners === 1
                        }"
                    >{{ g }}</span>
                    <span v-if="!item.Genes || item.Genes.length === 0" style="opacity:0.4;">-</span>
                </div>
            </div>

            <!-- 狀態 -->
            <div class="compare-row">
                <div class="row-label">狀態</div>
                <div v-for="item in items" :key="item.ID" class="col-cell">
                    <span class="status-badge"
                        :class="{
                            's-for-sale': item.Status === 'ForSale',
                            's-auction': item.Status === 'Auction' && hasActiveAuction(item.ID),
                            's-sold': item.Status === 'Sold'
                        }"
                    >{{ fmtStatus(item) }}</span>
                </div>
            </div>

            <!-- 售價 -->
            <div class="compare-row price-row">
                <div class="row-label">售價</div>
                <div v-for="item in items" :key="item.ID" class="col-cell price-cell">{{ fmtPrice(item) }}</div>
            </div>

            <!-- 操作 -->
            <div class="compare-row action-row">
                <div class="row-label"></div>
                <div v-for="item in items" :key="item.ID" class="col-cell">
                    <NuxtLink
                        v-if="item.Status === 'ForSale'"
                        :href="store.lineLink"
                        target="_blank"
                        class="btn-action"
                    >💬 私訊購買</NuxtLink>
                    <NuxtLink
                        v-else-if="item.Status === 'Auction' && hasActiveAuction(item.ID)"
                        :to="getAuctionLink(item.ID)"
                        class="btn-action btn-auction"
                    >🔨 前往競標</NuxtLink>
                    <NuxtLink
                        :to="`/product/${item.ID}`"
                        class="btn-action btn-detail"
                    >查看詳頁</NuxtLink>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.compare-page { max-width: 1100px; margin: 0 auto; padding: 0 15px 40px; }

.compare-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--bd);
    flex-wrap: wrap;
}
.back-btn {
    color: var(--txt);
    opacity: 0.6;
    text-decoration: none;
    font-size: 0.9rem;
    white-space: nowrap;
    transition: 0.2s;
}
.back-btn:hover { opacity: 1; color: var(--pri); }
.clear-all-btn {
    margin-left: auto;
    background: transparent;
    border: 1px solid var(--bd);
    color: var(--txt);
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 0.85rem;
    cursor: pointer;
    opacity: 0.7;
    transition: 0.2s;
    white-space: nowrap;
}
.clear-all-btn:hover { opacity: 1; border-color: #e74c3c; color: #e74c3c; }

.empty-compare { text-align: center; padding: 60px 0; color: var(--txt); opacity: 0.6; }

/* 比較表格 */
.compare-layout {
    display: grid;
    gap: 0;
}
.cols-1 { grid-template-columns: 140px 1fr; }
.cols-2 { grid-template-columns: 140px 1fr 1fr; }
.cols-3 { grid-template-columns: 140px 1fr 1fr 1fr; }

.compare-row {
    display: contents;
}
.compare-row > * {
    padding: 14px 12px;
    border-bottom: 1px solid var(--bd);
    display: flex;
    align-items: center;
}
.compare-row:last-child > * { border-bottom: none; }
.compare-row:nth-child(even) > * { background: rgba(128,128,128,0.03); }

.row-label {
    font-size: 0.82rem;
    font-weight: bold;
    color: var(--txt);
    opacity: 0.55;
    white-space: nowrap;
    background: transparent !important;
    padding-right: 8px;
    position: sticky;
    left: 0;
    z-index: 1;
}

.col-cell {
    font-size: 0.9rem;
    color: var(--txt);
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
}

/* 圖片列 */
.header-row > * { padding-top: 0 !important; }
.img-cell {
    flex-direction: column;
    align-items: center;
    text-align: center;
    position: relative;
    padding-top: 16px !important;
}
.remove-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(231,76,60,0.15);
    border: 1px solid rgba(231,76,60,0.3);
    color: #e74c3c;
    font-size: 0.7rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: 0.2s;
    z-index: 10;
}
.remove-btn:hover { background: #e74c3c; color: #fff; }
.compare-img {
    width: 100%;
    max-width: 200px;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border-radius: 10px;
    border: 1px solid var(--bd);
    display: block;
    margin: 0 auto 8px;
}
.compare-img-placeholder {
    width: 100%;
    max-width: 200px;
    aspect-ratio: 1 / 1;
    border-radius: 10px;
    background: var(--bd);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    margin: 0 auto 8px;
}
.item-morph { font-size: 1rem; font-weight: 900; color: var(--txt); margin-bottom: 2px; }
.item-id { font-size: 0.72rem; color: var(--txt); opacity: 0.4; }

/* 基因標籤 */
.gene-cell { flex-wrap: wrap; flex-direction: row; }
.gene-tag {
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: bold;
    background: var(--bd);
    color: var(--txt);
    border: 1px solid transparent;
}
.gene-tag.shared { background: rgba(232,68,10,0.12); color: var(--pri); border-color: var(--pri-glow); }
.gene-tag.unique { background: rgba(52,152,219,0.12); color: #3498db; border-color: rgba(52,152,219,0.3); }

/* 狀態/價格 */
.s-for-sale { background: rgba(46,204,113,0.15); color: #27ae60; border: 1px solid rgba(46,204,113,0.3); padding: 3px 10px; border-radius: 10px; font-size: 0.82rem; font-weight: bold; }
.s-auction  { background: rgba(232,68,10,0.15); color: var(--pri); border: 1px solid var(--pri-glow); padding: 3px 10px; border-radius: 10px; font-size: 0.82rem; font-weight: bold; }
.s-sold     { background: rgba(128,128,128,0.15); color: #888; border: 1px solid rgba(128,128,128,0.2); padding: 3px 10px; border-radius: 10px; font-size: 0.82rem; }

.price-row .price-cell { font-size: 1.1rem; font-weight: 900; color: var(--pri); }

/* 操作按鈕 */
.action-row .col-cell { flex-direction: column; gap: 8px; align-items: stretch; }
.btn-action {
    display: block;
    text-align: center;
    padding: 9px 12px;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: bold;
    text-decoration: none;
    background: var(--pri);
    color: #fff;
    border: none;
    cursor: pointer;
    box-shadow: 0 2px 8px var(--pri-glow);
    transition: 0.2s;
}
.btn-action:hover { transform: translateY(-1px); box-shadow: 0 4px 14px var(--pri-glow); }
.btn-auction { background: #e67e22; box-shadow: 0 2px 8px rgba(230,126,34,0.4); }
.btn-detail { background: transparent; color: var(--txt); border: 1px solid var(--bd); box-shadow: none; opacity: 0.7; }
.btn-detail:hover { opacity: 1; border-color: var(--bd-hover); }

/* Mobile */
@media (max-width: 768px) {
    .compare-page { padding: 0 8px 40px; overflow-x: auto; }
    .cols-1 { grid-template-columns: 80px 1fr; }
    .cols-2 { grid-template-columns: 80px 1fr 1fr; }
    .cols-3 { grid-template-columns: 80px minmax(100px,1fr) minmax(100px,1fr) minmax(100px,1fr); }
    .compare-layout { min-width: 340px; }
    .row-label { font-size: 0.72rem; padding: 10px 6px; }
    .col-cell { font-size: 0.82rem; padding: 10px 8px; }
    .compare-img { max-width: 120px; }
    .item-morph { font-size: 0.88rem; }
    .btn-action { padding: 7px 8px; font-size: 0.78rem; }
    .compare-header { margin-bottom: 14px; }
    .gene-tag { font-size: 0.68rem; padding: 1px 5px; }
}
</style>
