<script>
import { supabase } from '../supabase';

export default {
    data() {
        return {
            loading: true,
            error: '',
            item: null
        };
    },
    computed: {
        // 圖片優化與代理 (與後台邏輯一致)
        displayImg() {
            if (!this.item || !this.item.ImageURL) return null;
            const url = this.item.ImageURL;
            const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//;
            const match = url.match(driveRegex);
            let target = url;
            if (match && match[1]) target = 'https://drive.google.com/uc?id=' + match[1];
            // 使用較高解析度 (w=1200) 供身分證展示
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
        // 從網址路徑取得 ID (例如 /identity/ID-001)
        const id = this.$route.params.id;
        if (!id) {
            this.error = '無效的 ID 連結';
            this.loading = false;
            return;
        }
        await this.fetchItem(id);
    },
    methods: {
        async fetchItem(id) {
            try {
                // 假設資料表名稱為 Gencko_Inventory，若不同請自行修改
                const { data, error } = await supabase
                    .from('Gencko_Inventory')
                    .select('*')
                    .eq('ID', id)
                    .single();

                if (error) throw error;
                this.item = data;
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
        
        <!-- Loading / Error States -->
        <div v-if="loading" class="status-msg">
            <div class="loader"></div> 讀取身分證資料中...
        </div>
        <div v-else-if="error" class="status-msg err">
            ⚠️ {{ error }}
        </div>

        <!-- Identity Card Content -->
        <div v-else class="id-content-wrap">
            
            <div class="id-card">
                <!-- Banner for Mobile -->
                <div class="card-brand-mobile">Gencko Studio</div>

                <!-- Left: Photo -->
                <div class="card-photo-box">
                    <img v-if="displayImg" :src="displayImg" alt="Gecko ID Photo">
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

            <!-- Action Buttons (Hidden when Printing) -->
            <div class="id-actions">
                <a v-if="item.ImageURL" :href="item.ImageURL" target="_blank" class="act-btn outline">
                    📥 下載原始照片
                </a>
                <button @click="triggerPrint" class="act-btn primary">
                    🖨️ 儲存電子身分證 (PDF)
                </button>
            </div>
            <p class="id-hint">* 點擊「儲存」可將此頁面存為 PDF 或圖片收藏</p>

        </div>
    </div>
</template>

<style scoped>
/* Page Layout */
.id-page-container {
    min-height: 100vh;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    color: #fff;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

/* Status */
.status-msg {
    text-align: center;
    font-size: 1.2rem;
    color: #94a3b8;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
}
.status-msg.err { color: #f87171; }
.loader {
    width: 40px; height: 40px;
    border: 4px solid rgba(255,255,255,0.1);
    border-top-color: #d84315;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Card Design (The "Identity Card") */
.id-card {
    background: #fff;
    color: #1e293b;
    width: 100%;
    max-width: 800px;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 20px 50px rgba(0,0,0,0.3);
    display: flex;
    flex-direction: row;
    position: relative;
}

/* Photo Section */
.card-photo-box {
    flex: 1.2;
    background: #f1f5f9;
    position: relative;
    min-height: 300px;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
}
.card-photo-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}
.no-img { color: #94a3b8; font-weight: bold; }

/* Info Section */
.card-info-box {
    flex: 1;
    padding: 30px;
    display: flex;
    flex-direction: column;
    background: #fff;
}

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
.cf-txt { font-size: 0.7rem; color: #cbd5e1; font-style: italic; }

/* Actions */
.id-actions {
    margin-top: 30px;
    display: flex;
    gap: 15px;
    justify-content: center;
    flex-wrap: wrap;
}
.act-btn {
    padding: 12px 24px;
    border-radius: 30px;
    text-decoration: none;
    font-weight: bold;
    font-size: 1rem;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    border: none;
    display: inline-flex; align-items: center; justify-content: center;
}
.act-btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
.act-btn.primary { background: #d84315; color: #fff; }
.act-btn.outline { background: transparent; border: 2px solid rgba(255,255,255,0.3); color: #fff; }
.act-btn.outline:hover { background: rgba(255,255,255,0.1); border-color: #fff; }

.id-hint { font-size: 0.8rem; color: #64748b; margin-top: 15px; opacity: 0.7; }

/* Responsive */
@media (max-width: 768px) {
    .id-card { flex-direction: column; max-width: 400px; }
    .card-photo-box { height: 300px; flex: none; }
    .card-brand-mobile { 
        display: block; background: #0f172a; color: #fff; 
        text-align: center; padding: 10px; font-weight: bold; font-size: 1.1rem;
    }
    .card-info-box { padding: 25px; }
    .card-id { font-size: 1.8rem; }
    .id-page-container { padding: 10px; }
}

/* Print Styles - Hides background, centers card */
@media print {
    @page { margin: 0; size: auto; }
    body, html { background: #fff; }
    .id-page-container { background: #fff; padding: 0; min-height: auto; display: block; }
    .id-card { 
        box-shadow: none; border: 1px solid #ddd; 
        max-width: 100%; width: 100%; margin: 0 auto;
        border-radius: 0;
    }
    .id-actions, .id-hint, .status-msg { display: none !important; }
    
    /* Ensure colors print */
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
</style>