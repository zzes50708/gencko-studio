<script>
export default {
    name: 'QsView',
    props: {
        qs: { type: Object, required: true },
        qsProgress: { type: Number, required: true },
        qsCurrentQ: { type: Object, required: true },
        qsResult: { type: Object, required: true },
        qsTotalScore: { type: Number, required: true }
    },
    emits: ['select-option', 'prev-step', 'reset']
}
</script>

<template>
    <div class="qs-container">
        <div v-if="!qs.finished">
            <div class="page-title">飼養前自我評估</div>
            
            <!-- Progress -->
            <div class="qs-progress-area">
                <div class="qs-progress-labels">
                    <span>Step {{ qs.step + 1 }} of {{ qs.questions.length }}</span>
                    <span>{{ Math.round(qsProgress) }}%</span>
                </div>
                <div class="qs-progress-track">
                    <div class="qs-progress-fill" :style="{width: qsProgress + '%'}"></div>
                </div>
            </div>

            <!-- Question -->
            <div class="qs-question-box" :key="qs.step">
                <div class="qs-question-text">{{ qsCurrentQ.text }}</div>
                <div class="qs-options-grid">
                    <div v-for="opt in qsCurrentQ.options" :key="opt.id" class="qs-option-btn" @click="$emit('select-option', qsCurrentQ.id, opt.score)">
                        <span class="qs-option-label">{{ opt.label }}</span>
                        <div class="qs-check-circle"></div>
                    </div>
                </div>
            </div>

            <!-- Navigation -->
            <button v-if="qs.step > 0" @click="$emit('prev-step')" class="qs-nav-btn">
                <span>← 返回上一題</span>
            </button>
        </div>

        <!-- Result -->
        <div v-else class="qs-result-box">
            <span class="qs-badge">Evaluation Complete</span>
            <div class="qs-res-title">{{ qsResult.title }}</div>
            <div class="qs-score-display">{{ qsTotalScore }} <span style="font-size:1rem;font-weight:normal;opacity:0.5">/ 100</span></div>
            <div class="qs-res-desc">{{ qsResult.desc }}</div>
            
            <div class="qs-hint-box">
                💡 溫馨提示：新手飼養前建議多尋求專業玩家或專科醫師的建議，確保環境與設備完全就緒。
            </div>

            <button @click="$emit('reset')" class="qs-reset-btn">
                🔄 重新評估
            </button>
        </div>
    </div>
</template>