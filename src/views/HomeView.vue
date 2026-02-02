<script>
export default {
    name: 'HomeView',
    props: {
        loading: { type: Boolean, default: false },
        hotList: { type: Array, default: () => [] },
        articlesList: { type: Array, default: () => [] }
    },
    emits: ['navigate', 'set-beginner', 'open-product', 'open-article'],
    methods: {
        // --- 顯示輔助函式 (View Helper) ---
        // 為了確保 View 獨立渲染，將純顯示用的處理函式保留在組件內
        convertLink(url) {
            if (!url) return '';
            const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//;
            const match = url.match(driveRegex);
            let target = url;
            if (match && match[1]) target = 'https://drive.google.com/uc?id=' + match[1];
            return `https://wsrv.nl/?url=${encodeURIComponent(target)}&w=1000&output=webp&q=80`;
        },
        fmtDate(d) { 
            try { return new Date(d).toISOString().split('T')[0]; } catch(e){ return ''; } 
        }
    }
}
</script>

<template>
    <div>
        <div class="home-header-wrap">
            <div class="hero-content hero-content-inner">
                <h1 class="hero-main-title">GENCKO STUDIO</h1>
                
                <div class="hero-btn-group mobile-row-nowrap" style="margin-bottom:15px; justify-content:center;">
                    <a href="https://line.me/ti/g2/x4QpkWPJTXYr87U_jHyxSrBLTeVYMdwwlPF9qg" target="_blank" class="btn-hero btn-line-join">
                        🔥 點擊加入社群享優惠
                    </a>
                </div>
                <div class="hero-btn-group social-group" style="justify-content:center;">
                    <a href="https://www.instagram.com/gencko_breeding" target="_blank" class="btn-hero btn-soc">IG</a>
                    <a href="https://www.facebook.com/profile.php?id=61579393505049&locale=zh_TW" target="_blank" class="btn-hero btn-soc">FB</a>
                    <a href="https://myship.7-11.com.tw/general/detail/GM2509175195515" target="_blank" class="btn-hero btn-soc">賣貨便</a>
                </div>
            </div>
        </div>
        
        <!-- Scenarios -->
        <div class="home-scenario-grid">
            <div class="scenario-card" @click="$emit('set-beginner')">
                <div class="scenario-icon">🌱</div>
                <div class="scenario-title">新手入門</div>
                <div class="scenario-desc">好養、強壯、預算友善</div>
            </div>
            <div class="scenario-card" @click="$emit('navigate', '/breeders')">
                <div class="scenario-icon">👑</div>
                <div class="scenario-title">種群展示</div>
                <div class="scenario-desc">欣賞 Gencko 核心種公母</div>
            </div>
            <div class="scenario-card" @click="$emit('navigate', '/calculator')">
                <div class="scenario-icon">🧬</div>
                <div class="scenario-title">基因計算</div>
                <div class="scenario-desc">專業玩家的選育工具</div>
            </div>
            <div class="scenario-card" @click="$emit('navigate', '/hospital')">
                <div class="scenario-icon">🏥</div>
                <div class="scenario-title">特寵醫院</div>
                <div class="scenario-desc">全台特寵就醫地圖</div>
            </div>
        </div>

        <div class="home-section">
            <div class="section-head">
                <div class="sec-title">熱門精選</div>
                <a href="/shop" class="sec-more" style="text-decoration:none;">查看更多 &rarr;</a>
            </div>
            
            <div v-if="loading && hotList.length===0" style="display:flex; gap:15px; overflow:hidden; padding:10px 0;">
                <div class="sk-card" v-for="n in 5" :key="n" style="width:220px; flex-shrink:0;">
                    <div class="skeleton sk-img" style="height:180px;"></div>
                    <div class="sk-body"><div class="skeleton sk-title" style="width:60%; margin:0 auto;"></div></div>
                </div>
            </div>

            <div v-else-if="hotList.length > 0" class="hot-marquee-mask">
                <div class="hot-track">
                    <div class="hot-card-item" v-for="(i, idx) in [...hotList, ...hotList, ...hotList, ...hotList]" :key="idx">
                        <div style="position:relative; cursor:pointer;" @click="$emit('open-product', i.ID)">
                            <img v-if="i.ImageURL" :src="convertLink(i.ImageURL)" class="card-img" loading="lazy">
                            <div v-else class="card-img" style="display:flex;align-items:center;justify-content:center;color:#333;font-size:3rem;background:#000;">🦎</div>
                            <div v-if="i.Status==='ForSale'" class="trust-badge">🛡️ 100% HEALTH</div>
                        </div>
                        <div class="card-body" style="padding:15px; text-align:center;">
                            <!-- 使用 slim-title 確保樣式一致 -->
                            <div class="slim-title" style="margin:0; font-size:1.1rem; white-space:normal;">{{i.Morph}}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div v-else style="text-align:center; padding:20px; color:#666;">
                暫無熱門精選商品
            </div>
        </div>

        <div class="home-section" style="background:rgba(255,255,255,0.02);">
            <div class="section-head">
                <div class="sec-title">最新文章</div>
                <a href="/articles" class="sec-more" style="text-decoration:none;">專欄文章 &rarr;</a>
            </div>
            <div class="grid">
                <div class="card article-card" v-for="item in articlesList.slice(0, 3)" :key="item.ID" @click="$emit('open-article', item)">
                    <div style="position:relative; overflow:hidden;">
                        <img v-if="item.ImageURL" :src="convertLink(item.ImageURL)" class="card-img" style="height:180px;" loading="lazy">
                        <div v-else class="card-img" style="height:180px;display:flex;align-items:center;justify-content:center;font-size:3rem;background:#1a1a1a;">📝</div>
                        <div class="art-cat-tag">{{ item.Category }}</div>
                    </div>
                    <div class="card-body">
                        <div style="font-size:0.8rem;color:#888;margin-bottom:5px;">{{ fmtDate(item.PublishDate) }}</div>
                        <div class="slim-title" style="font-size:1.1rem;margin-bottom:8px;white-space:normal;">{{ item.Title }}</div>
                        <div class="art-summary">{{ item.Summary }}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>