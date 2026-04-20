<script setup>
import { ref, computed } from 'vue'
import { useHead } from '#imports'

useHead({
    title: '健康評估系統',
    meta:[
        { name: 'description', content: 'Gencko Studio 守宮健康評估系統。透過外觀與行為快速自我檢測您的豹紋/肥尾守宮是否健康，或是否需要立即就醫。' },
        { property: 'og:title', content: '健康評估系統 | Gencko Studio' },
        { property: 'og:description', content: '透過外觀與行為快速自我檢測您的守宮是否健康。' },
        { property: 'og:image', content: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E5%AE%98%E7%B6%B2%E8%83%8C%E6%99%AF.png' },
        { property: 'og:url', content: 'https://www.genckobreeding.com/health' }
    ]
})

// 健康評估狀態
const health = ref({
    activity: 'MEDIUM',
    movement: 'NORMAL',
    tail: 'NORMAL',
    droppings: 'SOLID'
})

// 計算評估結果
const healthResult = computed(() => {
    const d = health.value
    let score = 0
    
    // 計分邏輯
    if (d.activity === 'HIGH') score += 25; else if (d.activity === 'MEDIUM') score += 15; else score += 5;
    if (d.movement === 'NORMAL') score += 25; else score += 0;
    if (d.tail === 'PLUMP') score += 25; else if (d.tail === 'NORMAL') score += 20; else if (d.tail === 'THIN') score += 10; else score += 0;
    if (d.droppings === 'SOLID') score += 25; else if (d.droppings === 'NONE') score += 15; else if (d.droppings === 'RUNNY') score += 5; else score += 0;

    let status = "健康良好"
    let colorClass = "c-green"
    let bgClass = "bg-green"
    let suggestion = "您的守宮看起來非常有精神，請繼續保持優質的環境與飲食！"
    let warning = null

    if (d.droppings === 'ABNORMAL') {
        score = Math.min(score, 15)
        status = "極度危險"
        colorClass = "c-red"
        bgClass = "bg-red"
        suggestion = "檢測到異常糞便（綠色、黏液或異味）。這通常是寄生蟲或感染的徵兆，請立即諮詢獸醫！"
        warning = "系統警告：檢測到高度異常，請即刻尋求醫療建議"
    } else if (d.movement === 'LETHARGIC') {
        score = Math.min(score, 35)
        status = "健康堪憂"
        colorClass = "c-red"
        bgClass = "bg-red"
        suggestion = "守宮出現四肢無力或拖行現象，可能是代謝性骨病(MBD)或嚴重虛弱，請檢查鈣粉補充與光照。"
        warning = "系統警告：行動力異常，建議就醫檢查"
    } else if (d.tail === 'SICKLY') {
        score = Math.min(score, 45)
        status = "嚴重消瘦"
        colorClass = "c-orange"
        bgClass = "bg-orange"
        suggestion = "尾巴極度細弱顯示長期能量不足或疾病，建議隔離並進行更詳細的體檢與驅蟲。"
        warning = "系統警告：體態過瘦，需注意拒食或寄生蟲問題"
    } else {
        if (score < 50) { 
            status = "需密切觀察"
            colorClass = "c-orange"
            bgClass = "bg-orange"
            suggestion = "多項指標偏低，建議檢查飼養環境（溫度、濕度）並記錄食慾變化。"
        } else if (score < 75) { 
            status = "狀態尚可"
            colorClass = "c-yellow"
            bgClass = "bg-yellow"
            suggestion = "健康狀況穩定，但仍有提升空間。可以嘗試增加食物多樣性或調整環境參數。" 
        }
    }
    
    return { score, status, colorClass, bgClass, suggestion, warning }
})
</script>

<template>
    <div class="health-container">
        <!-- 🌟 手機版隱藏標題與說明，節省高度 -->
        <h1 class="page-title dt-only">健康評估系統</h1>
        <div class="page-text-box dt-only" style="margin-bottom:20px; text-align:center;">
            <p>本工具僅供自我檢測參考，若有嚴重異常請務必尋求特寵獸醫協助。</p>
        </div>

        <div class="health-grid">
            <!-- 🌟 左邊：顯示結果 -->
            <div class="health-res-box">
                <div class="res-top">
                    <span class="health-sys-text">GE-SYS</span>
                    <div class="health-score-val" :class="healthResult.colorClass">{{ healthResult.score }}%</div>
                    <div class="health-status-row">
                        <div class="health-dot" :class="healthResult.bgClass"></div>
                        <div class="health-status-text" :class="healthResult.colorClass">{{ healthResult.status }}</div>
                    </div>
                </div>

                <div class="res-bottom">
                    <div class="health-suggestion">
                        {{ healthResult.suggestion }}
                    </div>
                    <div v-if="healthResult.warning" class="health-warning">
                        {{ healthResult.warning }}
                    </div>
                    <div class="health-footer dt-only">
                        <span>REPORT ID: GE-{{ Math.floor(Math.random() * 9000) + 1000 }}</span>
                        <span>SYSTEM CALIBRATED</span>
                    </div>
                </div>
            </div>

            <!-- 🌟 右邊：表單選擇 -->
            <div class="health-form-box">
                <div class="form-item">
                    <div class="health-label">活躍程度</div>
                    <select v-model="health.activity" class="health-select">
                        <option value="HIGH">高 (活潑、有反應)</option>
                        <option value="MEDIUM">中 (偶爾活動)</option>
                        <option value="LOW">低 (遲緩、不動)</option>
                    </select>
                </div>
                <div class="form-item">
                    <div class="health-label">爬行狀態</div>
                    <select v-model="health.movement" class="health-select">
                        <option value="NORMAL">正常 (步伐穩定)</option>
                        <option value="LETHARGIC">異常 (無力、拖行)</option>
                    </select>
                </div>
                <div class="form-item">
                    <div class="health-label">尾巴體態</div>
                        <select v-model="health.tail" class="health-select">
                        <option value="PLUMP">肥大 (營養充足)</option>
                        <option value="NORMAL">正常 (比例協調)</option>
                        <option value="THIN">偏瘦 (明顯凹陷)</option>
                        <option value="SICKLY">枯瘦 (皮包骨)</option>
                    </select>
                </div>
                <div class="form-item">
                    <div class="health-label">糞便狀態</div>
                    <select v-model="health.droppings" class="health-select">
                        <option value="SOLID">健康 (固態含尿酸)</option>
                        <option value="NONE">未排便 (近期無)</option>
                        <option value="RUNNY">拉稀 (水分過多)</option>
                        <option value="ABNORMAL">異常 (綠色/異味)</option>
                    </select>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.health-container { max-width: 900px; margin: 0 auto; padding-top: 15px; }

/* 🌟 Responsive Utilities */
.dt-only { display: block; }

/* Desktop Grid: 左結果，右表單 */
.health-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 20px; align-items: stretch; }

/* Left Box (Result) */
.health-res-box { background: var(--card-bg); border: 1px solid var(--bd); border-radius: 12px; padding: 25px; display: flex; flex-direction: column; position: relative; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
.res-top { display: flex; flex-direction: column; margin-bottom: 20px; }
.health-sys-text { font-family: monospace; font-size: 0.75rem; opacity: 0.5; letter-spacing: 2px; margin-bottom: 5px; }
.health-score-val { font-size: 3.5rem; font-weight: 900; line-height: 1; text-shadow: 0 0 15px rgba(0,0,0,0.5); font-family: 'Black Ops One', cursive, sans-serif; margin-bottom: 10px; }
.health-status-row { display: flex; align-items: center; gap: 8px; }
.health-dot { width: 12px; height: 12px; border-radius: 50%; animation: pulse 2s infinite; }
.health-status-text { font-size: 1.2rem; font-weight: 700; }

.res-bottom { display: flex; flex-direction: column; flex: 1; justify-content: flex-end; }
.health-suggestion { padding: 15px; border-radius: 8px; border: 1px dashed var(--bd); background: rgba(255,255,255,0.02); color: #ccc; line-height: 1.5; font-size: 0.95rem; margin-bottom: 15px; }
.health-warning { padding: 10px; background: rgba(244, 67, 54, 0.1); border: 1px solid #f44336; color: #ef9a9a; text-align: center; font-size: 0.85rem; font-weight: bold; border-radius: 6px; animation: pulseRed 2s infinite; }
.health-footer { margin-top: 25px; opacity: 0.3; border-top: 1px solid var(--txt); padding-top: 10px; display: flex; justify-content: space-between; font-size: 0.6rem; font-family: monospace; letter-spacing: 1px; }

/* Right Box (Form) */
.health-form-box { background: var(--card-bg); border: 1px solid var(--bd); border-radius: 12px; padding: 25px; display: flex; flex-direction: column; justify-content: center; gap: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
.form-item { display: flex; flex-direction: column; }
.health-label { font-size: 0.85rem; font-weight: 700; color: var(--pri); margin-bottom: 6px; letter-spacing: 1px; }
.health-select { width: 100%; padding: 12px; background: rgba(0,0,0,0.3); border: 1px solid var(--bd); color: var(--txt); border-radius: 8px; font-size: 0.95rem; font-weight: bold; cursor: pointer; transition: 0.3s; appearance: none; }
.health-select:focus { border-color: var(--pri); outline: none; box-shadow: 0 0 10px var(--pri-glow); }

/* Colors */
.c-green { color: #4ade80; } .bg-green { background-color: #4ade80; }
.c-yellow { color: #facc15; } .bg-yellow { background-color: #facc15; }
.c-orange { color: #fb923c; } .bg-orange { background-color: #fb923c; }
.c-red { color: #f87171; } .bg-red { background-color: #f87171; }

@keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
@keyframes pulseRed { 0% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(244, 67, 54, 0); } 100% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0); } }

/* Day Mode */
:global(body.day-mode) .health-res-box { background: #fff; border-color: #ddd; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
:global(body.day-mode) .health-form-box { background: #fff; border-color: #ddd; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
:global(body.day-mode) .health-select { background: #f9f9f9; border-color: #ccc; color: #111; }
:global(body.day-mode) .health-suggestion { background: #fff; border-color: var(--pri); border-style: solid; color: #222; font-weight: 500; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
:global(body.day-mode) .health-sys-text { color: #666; opacity: 1; font-weight: bold; }
:global(body.day-mode) .health-footer { color: #999; opacity: 1; border-top-color: #eee; }
:global(body.day-mode) .health-warning { background: #ffebee; color: #c62828; border-color: #ef5350; }

/* 🌟 Mobile App-like Optimizations (左結果、右選擇的緊湊並排) */
@media (max-width: 768px) {
    .dt-only { display: none !important; }
    
    .health-container { padding: 5px 15px 15px 15px; }

    /* 黑魔法：重構 DOM 排版順序 */
    .health-grid { 
        grid-template-columns: 120px 1fr; /* 左 120px (結果), 右 1fr (表單) */
        gap: 12px; 
    }

    /* 將外框解體，讓子元素直接參與外層的 Grid 排版 */
    .health-res-box { 
        display: contents; 
    }

    .health-form-box { 
        grid-column: 2 / 3; 
        grid-row: 1 / 2; 
        background: var(--card-bg); 
        border: 1px solid var(--bd); 
        border-radius: 12px; 
        padding: 12px; 
        display: flex; 
        flex-direction: column; 
        gap: 8px; 
        box-shadow: 0 4px 15px rgba(0,0,0,0.2); 
    }

    /* 左方：精簡版分數框 */
    .res-top { 
        grid-column: 1 / 2; 
        grid-row: 1 / 2; 
        background: var(--card-bg); 
        border: 1px solid var(--bd); 
        border-radius: 12px; 
        padding: 15px 10px; 
        display: flex; 
        flex-direction: column; 
        justify-content: center; 
        align-items: center; 
        text-align: center; 
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        margin-bottom: 0; /* 覆寫桌機版 margin */
    }

    .health-score-val { font-size: 2.2rem; margin-bottom: 6px; }
    .health-status-text { font-size: 0.9rem; }
    .health-sys-text { font-size: 0.6rem; margin-bottom: 8px; }

    /* 下方：滿版建議文字 */
    .res-bottom { 
        grid-column: 1 / -1; 
        grid-row: 2 / 3; 
        margin-top: 5px;
    }
    
    .health-suggestion { font-size: 0.85rem; padding: 12px; margin-bottom: 10px; }
    .health-warning { font-size: 0.8rem; padding: 10px; }

    /* 表單項目壓縮 */
    .health-label { font-size: 0.75rem; margin-bottom: 4px; }
    .health-select { padding: 8px; font-size: 0.85rem; }
}

:global(body.day-mode) @media (max-width: 768px) {
    .res-top { background: #fff; border-color: #ddd; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
    .health-form-box { background: #fff; border-color: #ddd; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
}
</style>