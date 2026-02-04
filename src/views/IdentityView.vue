<script>
import { _supabase } from '../supabase';

export default {
    data() {
        return {
            loading: true,
            error: '',
            item: null
        };
    },
    computed: {
        displayImg() {
            if (!this.item || !this.item.ImageURL) return null;
            const url = this.item.ImageURL;
            const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//;
            const match = url.match(driveRegex);
            let target = url;
            if (match && match[1]) target = 'https://drive.google.com/uc?id=' + match[1];
            return `https://wsrv.nl/?url=${encodeURIComponent(target)}&w=1200&output=webp&q=90`;
        },
        fmtSex() {
            if (!this.item) return '';
            const i = this.item;
            if (i.GenderType === '溫度') {
                return `溫度 ${i.GenderValue || '?'}°C`;
            }
            return i.GenderType || 'Unsexed';
        },
        sexClass() {
            if (!this.item) return '';
            const g = this.item.GenderType;
            if (g === '公') return 't-male';
            if (g === '母') return 't-female';
            return 't-mix';
        }
    },
    async mounted() {
        const id = this.$route.params.id;
        if (!id) {
            this.error = '無效的 ID 連結';
            this.loading = false;
            return;
        }
        await this.fetchItem(id);
    },
    unmounted() {
        document.title = 'Gencko Studio';
    },
    methods: {
        async fetchItem(id) {
            try {
                const { data, error } = await _supabase
                    .from('inventory')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;

                this.item = {
                    ID: data.id,
                    Morph: data.morph,
                    GenderType: data.gender_type,
                    GenderValue: data.gender_value,
                    Birthday: data.birthday,
                    Species: data.species,
                    ImageURL: data.image_url
                };

                // 設定 PDF 檔名
                if (this.item.Morph) {
                    document.title = this.item.Morph;
                } else {
                    document.title = `ID_${this.item.ID}`;
                }

            } catch (err) {
                console.error(err);
                this.error = '找不到此個體資料或已下架';
            } finally {
                this.loading = false;
            }
        },
        triggerPrint() {
            window.print();
        }
    }
};
</script>

<template>
    <div class="id-page-container">
        
        <!-- Loading / Error -->
        <div v-if="loading" class="status-msg">
            <div class="loader"></div>
        </div>
        <div v-else-if="error" class="status-msg err">
            ⚠️ {{ error }}
        </div>

        <!-- Identity Content -->
        <div v-else class="id-content-wrap">
            
            <!-- print-target 用於列印定位 -->
            <div class="id-card print-target">
                <!-- Mobile Banner -->
                <div class="card-brand-mobile">Gencko Studio</div>

                <!-- Left: Photo -->
                <div class="card-photo-box">
                    <img v-if="displayImg" :src="displayImg" alt="ID Photo">
                    <div v-else class="no-img">No Image</div>
                </div>

                <!-- Right: Info -->
                <div class="card-info-box">
                    <div class="card-header">
                        <div class="brand-sub">Digital Identity</div>
                        <h1 class="card-id">{{ item.ID }}</h1>
                        <div class="brand-logo">Gencko Studio</div>
                    </div>

                    <div class="info-grid">
                        <div class="ig-row">
                            <label>Morph</label>
                            <div class="ig-val highlight">{{ item.Morph }}</div>
                        </div>
                        <div class="ig-row">
                            <label>Gender</label>
                            <div class="ig-val" :class="sexClass">{{ fmtSex }}</div>
                        </div>
                        <div class="ig-row">
                            <label>Birthday</label>
                            <div class="ig-val">{{ item.Birthday || 'Unknown' }}</div>
                        </div>
                        <div class="ig-row" v-if="item.Species">
                            <label>Species</label>
                            <div class="ig-val">{{ item.Species }}</div>
                        </div>
                    </div>

                    <div class="card-footer">
                        <div class="cf-line"></div>
                        <div class="cf-txt">Verified & Bred by Gencko Studio</div>
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div class="id-actions">
                <button @click="triggerPrint" class="act-btn primary">
                    🖨️ 儲存電子身分證 (PDF)
                </button>
            </div>
            <p class="id-hint">* 點擊按鈕可將此卡片存為 PDF 收藏</p>

        </div>
    </div>
</template>

<style scoped>
.id-page-container {
    min-height: 80vh;
    background: transparent;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

/* Status */
.status-msg { text-align: center; font-size: 1.2rem; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
.loader { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Card Design */
.id-card {
    background: #fff;
    color: #1e293b;
    width: 100%;
    max-width: 800px;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: row;
    position: relative;
    z-index: 10;
}

/* Photo Section */
.card-photo-box {
    flex: 1.2;
    background: #f8fafc;
    position: relative;
    min-height: 300px;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
}
.card-photo-box img { width: 100%; height: 100%; object-fit: cover; display: block; }
.no-img { color: #94a3b8; font-weight: bold; }

/* Info Section */
.card-info-box { flex: 1; padding: 30px; display: flex; flex-direction: column; background: #fff; }
.card-brand-mobile { display: none; }
.card-header { margin-bottom: 25px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
.brand-sub { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 2px; color: #64748b; font-weight: bold; }
.card-id { font-size: 2.2rem; font-weight: 900; margin: 5px 0; color: #0f172a; line-height: 1; }
.brand-logo { font-size: 0.9rem; font-weight: bold; color: #d84315; }
.info-grid { display: flex; flex-direction: column; gap: 15px; flex: 1; }
.ig-row { display: flex; flex-direction: column; }
.ig-row label { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: bold; margin-bottom: 2px; }
.ig-val { font-size: 1.1rem; font-weight: 600; color: #334155; }
.ig-val.highlight { font-size: 1.25rem; color: #0f172a; font-weight: 800; }
.t-male { color: #2563eb; }
.t-female { color: #db2777; }
.t-mix { color: #8b5cf6; }
.card-footer { margin-top: 30px; }
.cf-line { height: 4px; width: 40px; background: #d84315; margin-bottom: 10px; }
.cf-txt { font-size: 0.7rem; color: #94a3b8; font-style: italic; }

/* Actions */
.id-actions { margin-top: 30px; display: flex; justify-content: center; }
.act-btn {
    padding: 12px 28px; border-radius: 30px; border: none;
    font-weight: bold; font-size: 1rem; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    background: #d84315; color: #fff;
    transition: 0.2s;
}
.act-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 15px rgba(0,0,0,0.4); }
.id-hint { font-size: 0.8rem; color: rgba(255,255,255,0.8); margin-top: 15px; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }

@media (max-width: 768px) {
    .id-card { flex-direction: column; max-width: 400px; }
    .card-photo-box { height: 300px; flex: none; }
    .card-brand-mobile { display: block; background: #0f172a; color: #fff; text-align: center; padding: 10px; font-weight: bold; font-size: 1.1rem; }
    .card-info-box { padding: 25px; }
    .card-id { font-size: 1.8rem; }
}
</style>

<!-- Print Styles (Global - Flexbox Centering Fix) -->
<style>
@media print {
    /* 1. 強制橫向 A4，保留小邊界 */
    @page {
        size: A4 landscape;
        margin: 10mm; /* 您希望的「一點點邊界」 */
    }

    /* 2. 將整個頁面轉為 Flex 容器，強制內容垂直置中 */
    body, html {
        width: 100% !important;
        height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        background: #fff !important;
        
        /* 關鍵：使用 Flexbox 完美置中 */
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
    }

    /* 3. 隱藏其他元素 */
    body * {
        visibility: hidden;
    }

    /* 4. 顯示目標並撐滿容器 */
    .print-target, .print-target * {
        visibility: visible;
    }

    .print-target {
        /* 移除定位設定，改由 body 的 flex 來控制置中 */
        position: static !important;
        transform: none !important;
        
        /* 寬高設為 100%，自動填滿 @page 留下的空間 */
        width: 100% !important;
        height: 100% !important;
        max-width: none !important;
        
        /* 邊框與樣式 */
        border: 2px solid #000 !important; /* 加粗邊框更有質感 */
        box-shadow: none !important;
        margin: 0 !important;
        
        /* 確保卡片內部版面正常 */
        display: flex !important;
        flex-direction: row !important;
    }
    
    /* 修正列印時圖片高度，確保填滿左半邊 */
    .card-photo-box {
        height: 100% !important;
        min-height: 0 !important;
    }

    .id-actions, .id-hint, .status-msg, .loader, .floating-inquire-btn {
        display: none !important;
    }
}
</style>