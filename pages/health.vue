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
        <div class="page-title">健康評估系統</div>
        <div class="page-text-box" style="margin-bottom:20px; text-align:center;">
            <p>本工具僅供自我檢測參考，若有嚴重異常請務必尋求特寵獸醫協助。</p>
        </div>

        <div class="health-grid">
            <!-- Form Side -->
            <div class="health-form-box">
                <div>
                    <div class="health-label">行為觀察：活躍程度</div>
                    <select v-model="health.activity" class="health-select">
                        <option value="HIGH">高 (活潑、對動向有反應)</option>
                        <option value="MEDIUM">中 (偶爾活動、狀態正常)</option>
                        <option value="LOW">低 (遲緩、大部分時間不動)</option>
                    </select>
                </div>
                <div>
                    <div class="health-label">爬行狀態</div>
                    <select v-model="health.movement" class="health-select">
                        <option value="NORMAL">正常 (支撐有力、步伐穩定)</option>
                        <option value="LETHARGIC">異常 (無力、拖行、震顫)</option>
                    </select>
                </div>
                <div>
                    <div class="health-label">尾巴粗細</div>
                    <select v-model="health.tail" class="health-select">
                        <option value="PLUMP">肥大 (豐滿、營養充足)</option>
                        <option value="NORMAL">正常 (比例協調)</option>
                        <option value="THIN">偏瘦 (明顯凹陷)</option>
                        <option value="SICKLY">枯瘦 (皮包骨、危險信號)</option>
                    </select>
                </div>
                <div>
                    <div class="health-label">糞便觀察</div>
                    <select v-model="health.droppings" class="health-select">
                        <option value="SOLID">健康 (固態、伴隨白色尿酸鹽)</option>
                        <option value="NONE">未排便 (近期無觀察到)</option>
                        <option value="RUNNY">拉稀 (不成型、水分過多)</option>
                        <option value="ABNORMAL">異常 (綠色、異味、膿血或奇色)</option>
                    </select>
                </div>
            </div>

            <!-- Result Side -->
            <div class="health-res-box">
                <div class="health-res-header">
                    <div>
                        <span class="health-sys-text">MEDICAL DIAGNOSIS ENGINE</span>
                        <h2 class="health-status-text" :class="healthResult.colorClass">評估報告</h2>
                    </div>
                    <div class="health-score-val" :class="healthResult.colorClass">{{ healthResult.score }}%</div>
                </div>

                <div class="health-status-row">
                    <div class="health-dot" :class="healthResult.bgClass"></div>
                    <div class="health-status-text" :class="healthResult.colorClass">{{ healthResult.status }}</div>
                </div>

                <div class="health-suggestion">
                    {{ healthResult.suggestion }}
                </div>

                <div v-if="healthResult.warning" class="health-warning">
                    {{ healthResult.warning }}
                </div>

                <div class="health-footer">
                    <span>REPORT ID: GE-{{ Math.floor(Math.random() * 9000) + 1000 }}</span>
                    <span>SYSTEM CALIBRATED</span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.health-container { max-width: 900px; margin: 0 auto; padding-top: 15px; }
.health-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.health-form-box { background: var(--card-bg); border: 1px solid var(--bd); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 15px; }
.health-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--pri); margin-bottom: 6px; letter-spacing: 1px; }
.health-select { width: 100%; padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid var(--bd); color: var(--txt); border-radius: 6px; font-size: 0.95rem; cursor: pointer; transition: 0.3s; }
.health-select:focus { border-color: var(--pri); outline: none; box-shadow: 0 0 10px var(--pri-glow); }

.health-res-box { background: var(--card-bg); border: 1px solid var(--bd); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; transition: 0.3s; position: relative; overflow: hidden; }
.health-res-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
.health-sys-text { font-family: monospace; font-size: 0.65rem; opacity: 0.5; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px; display: block; }
.health-score-val { font-size: 2.5rem; font-weight: 900; line-height: 1; text-shadow: 0 0 15px rgba(0,0,0,0.5); font-family: 'Black Ops One', cursive, sans-serif; }
.health-status-row { display: flex; align-items: center; gap: 8px; margin-bottom: 15px; }
.health-dot { width: 10px; height: 10px; border-radius: 50%; animation: pulse 2s infinite; }
.health-status-text { font-size: 1.1rem; font-weight: 700; }
.health-suggestion { padding: 15px; border-radius: 8px; border: 1px dashed var(--bd); background: rgba(255,255,255,0.02); color: #ccc; line-height: 1.5; font-size: 0.9rem; margin-bottom: 15px; }
.health-warning { margin-top: auto; padding: 8px; background: rgba(244, 67, 54, 0.1); border: 1px solid #f44336; color: #ef9a9a; text-align: center; font-size: 0.75rem; font-weight: bold; border-radius: 6px; animation: pulseRed 2s infinite; }
.health-footer { margin-top: 25px; opacity: 0.3; border-top: 1px solid var(--txt); padding-top: 10px; display: flex; justify-content: space-between; font-size: 0.55rem; font-family: monospace; letter-spacing: 1px; }

.c-green { color: #4ade80; } .bg-green { background-color: #4ade80; }
.c-yellow { color: #facc15; } .bg-yellow { background-color: #facc15; }
.c-orange { color: #fb923c; } .bg-orange { background-color: #fb923c; }
.c-red { color: #f87171; } .bg-red { background-color: #f87171; }

@keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
@keyframes pulseRed { 0% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(244, 67, 54, 0); } 100% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0); } }

:global(body.day-mode) .health-select { background: #fff; border-color: #ccc; color: #111; }
:global(body.day-mode) .health-suggestion { background: #fff; border-color: var(--pri); border-style: solid; color: #222; font-weight: 500; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
:global(body.day-mode) .health-sys-text { color: #666; opacity: 1; font-weight: bold; }
:global(body.day-mode) .health-footer { color: #999; opacity: 1; border-top-color: #eee; }
:global(body.day-mode) .health-warning { background: #ffebee; color: #c62828; border-color: #ef5350; }

@media (max-width: 768px) {
    .health-grid { grid-template-columns: 1fr; gap: 15px; }
}
</style>