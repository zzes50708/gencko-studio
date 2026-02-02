<script>
export default {
    name: 'HealthView',
    props: {
        // 直接傳遞物件引用，以便 v-model 可以直接操作屬性
        health: { type: Object, required: true },
        // 計算結果由父層 computed 算出後傳入
        healthResult: { type: Object, required: true }
    }
}
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