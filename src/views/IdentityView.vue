<script>
// 確保引用名稱與您的 supabase.js 匯出一致
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
    methods: {
        async fetchItem(id) {
            try {
                // 查詢 inventory 表
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

            <!-- Action Buttons -->
            <div class="id-actions">
                <!-- 移除下載原始照片按鈕 -->
                <button @click="triggerPrint" class="act-btn primary">
                    🖨️ 儲存電子身分證 (PDF)
                </button>
            </div>
            <p class="id-hint">* 點擊按鈕可將此卡片存為 PDF 收藏</p>

        </div>
    </div>
</template>

<style scoped>
/* Page Layout - 改為淺灰色背景，凸顯白色卡片 */
.id-page-container {
    min-height: 100vh;
    background: #f1f5f9; /* 淺灰背景 */
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    color: #334155;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

/* Status */
.status-msg {
    text-align: center;
    font-size: 1.2rem;
    color: #64748b;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
}
.status-msg.err { color: #ef4444; }
.loader {
    width: 40px; height: 40px;
    border: 4px solid #cbd5e1;
    border-top-color: #d84315;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Card Design - 白色卡片 + 立體陰影 */
.id-card {
    background: #fff;
    color: #1e293b;
    width: 100%;
    max-width: 800px;
    border-radius: 12px;
    overflow: hidden;
    /* 這裡設定明顯的陰影，營造實體卡片感 */
    box-shadow: 0 20px 40px -5px rgba(0,0,0,0.15), 0 10px 20px -5px rgba(0,0,0,0.1);
    display: flex;
    flex-direction: row;
    position: relative;
    border: 1px solid #fff; /* 微調邊界 */
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
.cf-txt { font-size: 0.7rem; color: #94a3b8; font-style: italic; }

/* Actions */
.id-actions {
    margin-top: 30px;
    display: flex;
    justify-content: center;
}
.act-btn {
    padding: 12px 28px;
    border-radius: 30px;
    text-decoration: none;
    font-weight: bold;
    font-size: 1rem;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    border: none;
    display: inline-flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
.act-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 15px rgba(0,0,0,0.15); }
.act-btn.primary { background: #d84315; color: #fff; }

.id-hint { font-size: 0.8rem; color: #94a3b8; margin-top: 15px; }

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

/* 
   Print Styles - 僅下載卡片本體 
   邏輯：隱藏所有不相關元素，將背景設為白，確保卡片有邊框
*/
@media print {
    @page { margin: 0; size: auto; }
    
    body, html { 
        background-color: #fff !important; 
        height: auto;
    }
    
    .id-page-container {
        background: #fff !important; 
        padding: 0 !important;
        margin: 0 !important;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh; /* 讓卡片在 PDF 中垂直置中，或視需求改為 top */
        width: 100%;
    }

    /* 隱藏按鈕、提示、Loading */
    .id-actions, .id-hint, .status-msg, .loader { 
        display: none !important; 
    }

    .id-card {
        /* 移除陰影，改用細邊框讓 PDF 看起來乾淨 */
        box-shadow: none !important;
        border: 1px solid #cbd5e0 !important;
        
        /* 確保尺寸適中 */
        max-width: 100% !important;
        width: 800px; /* 強制寬度以保持排版 */
        margin: 0 auto;
        break-inside: avoid;
    }

    /* 確保列印色彩準確 */
    * { 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
    }
}
</style>