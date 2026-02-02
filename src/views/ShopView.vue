<script>
export default {
    name: 'ShopView',
    props: {
        curTab: { type: String, required: true },
        // 資料與狀態
        sp: { type: String, default: '豹紋守宮' },
        kw: { type: String, default: '' },
        fil: { type: Object, required: true }, // 篩選條件物件
        shopList: { type: Array, default: () => [] },
        tags: { type: Object, default: () => ({}) },
        db: { type: Object, default: () => ({}) },
        availableGenes: { type: Array, default: () => [] }, // 用於判斷基因是否可用
        maxPrice: { type: Number, default: 0 },
        // UI 狀態
        showMobileFilter: { type: Boolean, default: false },
        openFCat: { type: String, default: null },
        sortOrder: { type: String, default: 'default' },
        showOnlyHistory: { type: Boolean, default: false },
        showOnlyFav: { type: Boolean, default: false },
        wishlist: { type: Array, default: () => [] },
        // 商品詳情相關
        productModules: { type: Object, default: null },
        currentProduct: { type: Object, default: null },
        lineLink: { type: String, default: '' }
    },
    emits: [
        'update:sp', 'update:kw', 'update:showMobileFilter', 'update:openFCat', 'update:sortOrder',
        'update:showOnlyHistory', 'update:showOnlyFav', 'reset-filters', 
        'toggle-tag', 'search-input', 'open-product', 'toggle-wishlist', 
        'navigate', 'copy', 'open-lightbox'
    ],
    methods: {
        // --- 顯示輔助 ---
        convertLink(url) {
            if (!url) return '';
            const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//;
            const match = url.match(driveRegex);
            let target = url;
            if (match && match[1]) target = 'https://drive.google.com/uc?id=' + match[1];
            return `https://wsrv.nl/?url=${encodeURIComponent(target)}&w=1000&output=webp&q=80`;
        },
        fmtSex(i){
            if(!i) return '';
            if(i.GenderType==='溫度'){
                let t=+i.GenderValue;
                if(t>=31)return t+'°C (90%公)'; if(t>=30)return t+'°C (75%公)';
                if(t>=28)return t+'°C (均)'; if(t>=27)return t+'°C (75%母)';
                return t+'°C (90%母)';
            }
            return i.GenderType;
        },
        getSexCls(i){
            if(!i) return '';
            if(i.GenderType==='公'||(i.GenderType==='溫度'&& +i.GenderValue>=30))return 'male';
            if(i.GenderType==='母'||(i.GenderType==='溫度'&& +i.GenderValue<=27))return 'female';
            return 'mix';
        },
        // --- 篩選輔助 ---
        isGeneAvail(g) { return this.availableGenes.includes(g); },
        getSortedGenes(list) { 
            return [...list].sort((a, b) => (this.isGeneAvail(b)?1:0) - (this.isGeneAvail(a)?1:0)); 
        },
        // --- 事件觸發封裝 ---
        onSearchInput(e) { this.$emit('search-input', e); }
    }
}
</script>

<template>
    <div>
        <!-- Shop List Mode -->
        <transition name="fade">
            <div v-show="curTab==='shop'">
                <h1 class="page-title">線上選購守宮</h1>
                <div class="tabs">
                    <div class="tab" :class="{active:sp==='豹紋守宮'}" @click="$emit('update:sp', '豹紋守宮')">豹紋守宮</div>
                    <div class="tab" :class="{active:sp==='肥尾守宮'}" @click="$emit('update:sp', '肥尾守宮')">肥尾守宮</div>
                </div>

               <div class="shop-layout">
                    <!-- Mobile Filter Toggle -->
                    <div class="mobile-filter-toggle" @click="$emit('update:showMobileFilter', !showMobileFilter)">
                        <span>🔍 進階篩選條件 {{ showMobileFilter ? '▲' : '▼' }}</span>
                    </div>

                    <!-- Left Filter Panel -->
                    <div class="filter-panel" :class="{show: showMobileFilter}">
                        <div class="f-group">
                            <div class="f-label">精選標籤</div>
                            <label class="f-check" style="color:var(--pri); font-weight:bold;">
                                <input type="checkbox" v-model="fil.beginner"> 🌱 新手推薦
                            </label>
                        </div>
                        <div class="f-group">
                            <div class="f-label">庫存狀態</div>
                            <label class="f-check"><input type="checkbox" v-model="fil.stock"> 有庫存</label>
                            <label class="f-check"><input type="checkbox" v-model="fil.sold"> 已售出</label>
                        </div>
                        <div class="f-group">
                            <div class="f-label">價格 (最高: {{maxPrice}})</div>
                            <div style="display:flex;gap:5px;">
                                <input type="number" v-model="fil.minP" class="f-inp" placeholder="Min">
                                <input type="number" v-model="fil.maxP" class="f-inp" placeholder="Max">
                            </div>
                        </div>
                        <div class="f-group">
                            <div class="f-label">性別</div>
                            <label class="f-check"><input type="checkbox" v-model="fil.sexM"> 公 (含公溫)</label>
                            <label class="f-check"><input type="checkbox" v-model="fil.sexF"> 母 (含母溫)</label>
                        </div>
                        <div class="f-group">
                            <div class="f-label">基因篩選</div>
                            <div v-for="(list, cat) in db[sp]" :key="cat">
                                <div class="f-cat" @click="$emit('update:openFCat', openFCat===cat ? null : cat)">{{cat}} <small>{{openFCat===cat?'▲':'▼'}}</small></div>
                                <div v-show="openFCat===cat" style="padding-left:10px;">
                                    <div v-for="g in getSortedGenes(list)" :key="g" style="margin:2px 0;">
                                        <label class="f-check" :class="{disabled: !isGeneAvail(g)}">
                                            <input type="checkbox" :value="g" v-model="fil.genes" :disabled="!isGeneAvail(g)"> 
                                            {{g}}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button class="btn-hero" style="width:100%;margin-top:20px;font-size:0.9rem;padding:10px;" @click="$emit('reset-filters')">清除所有條件</button>
                    </div>

                    <!-- Right Content -->
                    <div style="flex:1; min-width:0;">
                        <div class="inp-wrap">
                            <span class="search-icon">🔍</span>
                            <input class="inp" :value="kw" @input="onSearchInput" placeholder="搜尋品系、基因、ID...">
                        </div>
                        
                        <div class="controls-row">
                            <select :value="sortOrder" @change="$emit('update:sortOrder', $event.target.value)" class="sort-select">
                                <option value="default">預設排序</option>
                                <option value="price_asc">價格由低到高</option>
                                <option value="price_desc">價格由高到低</option>
                            </select>
                            <div class="history-toggle" :class="{active: showOnlyHistory}" @click="$emit('update:showOnlyHistory', !showOnlyHistory)"><span>🕒 最近瀏覽</span></div>
                            <div class="fav-toggle" :class="{active: showOnlyFav}" @click="$emit('update:showOnlyFav', !showOnlyFav)"><span>❤ 只看最愛</span></div>
                        </div>
                        <div class="tags">
                            <span v-for="t in tags[sp]" :key="t" class="tag" :class="{sel:kw===t}" @click="$emit('toggle-tag', t)">{{t}}</span>
                        </div>
                        <!-- Shop Grid (Photo Grid) -->
                        <transition-group tag="div" name="list" class="grid photo-grid">
                            <div v-if="shopList.length===0" key="empty-msg" class="shop-empty-state">
                                <div class="empty-icon">🦎💤</div>
                                <h3 style="color:var(--txt); margin-bottom:10px;">找不到符合的守宮</h3>
                                <p style="font-size:0.9rem;">牠們可能躲起來睡覺了，或是被買光囉！<br>試著調整篩選條件，或直接私訊我們許願吧。</p>
                                <button class="btn-hero" @click="$emit('reset-filters')" style="margin-top:20px;">🔄 清除篩選條件</button>
                            </div>
                            <div class="card slim-card" v-for="i in shopList" :key="i.ID" @click="$emit('open-product', i.ID)">
                                <div v-if="i.Status==='Sold'" class="sold-stamp">SOLD</div>
                                <div style="position:absolute;top:5px;right:5px;z-index:10;">
                                    <span class="fav-btn" :class="{active: wishlist.includes(i.ID)}" @click.stop="$emit('toggle-wishlist', i.ID)">❤</span>
                                </div>
                                <div style="position:relative;">
                                    <img v-if="i.ImageURL" :src="convertLink(i.ImageURL)" class="card-img slim-img" loading="lazy">
                                    <div v-else class="card-img slim-img" style="display:flex;align-items:center;justify-content:center;color:#333;font-size:2rem;background:#000;">🦎</div>
                                    <div v-if="i.Status==='ForSale'" class="trust-badge">🛡️ 100% HEALTH</div>
                                </div>
                                <div class="card-body slim-body">
                                    <div class="slim-title">{{i.Morph}}</div>
                                    <div class="slim-price-row">
                                        <div v-if="i.Status!=='ForSale'">
                                            <span v-if="i.Status==='Sold'" class="status-badge s-sold">已售出</span>
                                            <span v-else-if="i.Status==='Reserved'" class="status-badge s-res">預訂</span>
                                            <span v-else-if="i.Status==='NotForSale'" class="status-badge s-nfs">非賣</span>
                                        </div>
                                        <div v-else class="price slim-price">${{i.ListingPrice}}</div>
                                    </div>
                                    <div style="font-size:0.8rem; color:#888; text-align:right; margin-top:8px; border-top:1px solid rgba(255,255,255,0.05); padding-top:8px;">
                                        查看完整狀態 &rarr;
                                    </div>
                                </div>
                            </div>
                        </transition-group>
                    </div>
                </div>
            </div>
        </transition>

        <!-- Product Detail Mode -->
        <transition name="fade">
            <div v-show="curTab==='product_detail'">
                <div v-if="productModules" class="prod-container">
                    <button class="btn-back" @click="$emit('navigate', '/shop')">← 返回列表</button>
                    <div class="prod-layout">
                        <div class="prod-img-box">
                            <div v-if="productModules.transaction.status==='Sold'" class="sold-stamp" style="font-size:3rem;border-width:6px;">SOLD OUT</div>
                            <img v-for="(img, idx) in productModules.visuals.list" :key="idx" :src="convertLink(img)" class="prod-main-img" @click="$emit('open-lightbox', {ImageURL: img, Morph: productModules.identity.morph})">
                            <div class="prod-hint">點擊圖片可放大檢視</div>
                        </div>
                        <div class="prod-info-box">
                            <div class="prod-header">
                                <div class="prod-id">ID: {{productModules.identity.id}}</div>
                                <h1 class="prod-title">{{productModules.identity.morph}}</h1>
                                <div class="gene-tag-row">
                                    <span v-for="g in productModules.identity.genes" :key="g" class="gene-pill">{{g}}</span>
                                </div>
                                <div v-if="productModules.identity.note" style="margin-bottom:15px; color:#aaa; font-size:0.95rem; background:rgba(255,255,255,0.05); padding:10px; border-radius:6px; border:1px solid var(--bd); white-space: pre-wrap;">
                                    📝 備註：{{ productModules.identity.note }}
                                </div>
                                <div class="spec-row" style="border:none; padding:5px 0 0 0;">
                                    <span :class="getSexCls(currentProduct)" style="font-size:1.1rem; margin-right:15px;">{{fmtSex(currentProduct)}}</span>
                                    <span style="color:#888;">{{productModules.identity.birth}} 出生</span>
                                </div>
                            </div>
                            <div class="prod-price-area">
                                <div v-if="productModules.transaction.status!=='ForSale'">
                                    <span v-if="productModules.transaction.status==='Sold'" class="status-badge s-sold" style="font-size:1.2rem;padding:10px 20px;">已售出</span>
                                    <span v-else class="status-badge s-nfs" style="font-size:1.2rem;padding:10px 20px;">非賣/預訂</span>
                                </div>
                                <div v-else class="price" style="font-size:2.5rem;">NT$ {{productModules.transaction.price}}</div>
                            </div>

                            <div class="guarantee-icons-row">
                                <div class="g-icon-pill g-pill-green"><span>🛡️</span> 100% 健康</div>
                                <div class="g-icon-pill g-pill-blue"><span>🧬</span> 基因正確</div>
                                <div class="g-icon-pill g-pill-orange"><span>🚚</span> 運輸賠償</div>
                            </div>

                            <div class="prod-guarantee">
                                <span style="font-size:1.2rem; margin-right:10px;">🛡️</span>
                                <span>{{productModules.health.statement}}</span>
                            </div>

                            <div class="prod-actions" style="margin-top:20px;">
                                <a v-if="productModules.transaction.status==='ForSale'" :href="lineLink" target="_blank" class="btn-buy-lg">💬 私訊購買 (Line)</a>
                                <button class="btn-share" @click="$emit('copy', window.location.href)">🔗 複製連結分享</button>
                            </div>
                            <div style="font-size:0.8rem; color:#666; margin-top:10px;">⚠️ {{productModules.expectations.notice}}</div>
                        </div>
                    </div>
                    <div class="prod-terms-box">
                        <div class="terms-title">⚠️ 取貨注意事項 & 購買須知 ⚠️</div>
                        <ul class="terms-list">
                            <li>Gencko工作室出貨前皆確認個體100%健康，所有個體皆為負責人親自餵食，確保進食穩定且無隱憂才會上架販售。</li>
                            <li>開箱請全程錄影，以利於後續爭議處理。</li>
                            <li>有任何問題請於48小時內提出，逾期不候。</li>
                            <li>請提前準備好守宮之飼養環境。</li>
                            <li>守宮會因飼主飼養方式不當而造成問題，本工作室將不予退換貨。</li>
                            <li>個體有缺陷且本工作室無事先告知，本方無條件退款 (需提供錄影確保個體無調包嫌疑)。</li>
                            <li>運送過程死亡，本工作室全額退款；運送過程斷尾，本工作室退還50%款項 (需提供錄影確保個體無調包嫌疑)。</li>
                            <li>購買前請做足功課，本社群、官方皆可無償教學，請做好準備再進行購買。</li>
                            <li style="color:var(--pri); font-weight:bold; margin-top:10px;">購買視同同意以上須知事項。</li>
                        </ul>
                    </div>
                </div>
            </div>
        </transition>
    </div>
</template>