<script setup>
import { ref, computed } from 'vue'
import { useHead } from '#imports'
import { QUIZ_DATA } from '~/utils/quiz.js'

useHead({
    title: '飼養前自我評估',
    meta:[
        { name: 'description', content: '飼養守宮前的自我評估問卷。幫助您了解自己是否準備好迎接爬寵的新生活，包含時間、預算與環境要求。' },
        { property: 'og:title', content: '飼養前自我評估 | Gencko Studio' },
        { property: 'og:description', content: '飼養守宮前的自我評估問卷，了解自己是否已準備好。' },
        { property: 'og:image', content: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E5%AE%98%E7%B6%B2%E8%83%8C%E6%99%AF.png' },
        { property: 'og:url', content: 'https://www.genckobreeding.com/qs' }
    ]
})

const qsState = ref({
    step: 0,
    answers: {},
    finished: false,
    questions: QUIZ_DATA.questions,
    results: QUIZ_DATA.results
})

const qsProgress = computed(() => ((qsState.value.step) / qsState.value.questions.length) * 100)
const qsCurrentQ = computed(() => qsState.value.questions[qsState.value.step])
const qsTotalScore = computed(() => Object.values(qsState.value.answers).reduce((a, b) => a + b, 0))

const qsResult = computed(() => {
    const s = qsTotalScore.value
    return qsState.value.results.find(r => s >= r.min && s <= r.max) || qsState.value.results[3]
})

const selectOption = (qId, score) => {
    qsState.value.answers[qId] = score
    setTimeout(() => {
        if (qsState.value.step < qsState.value.questions.length - 1) {
            qsState.value.step++
        } else {
            qsState.value.finished = true
        }
    }, 300)
}

const prevStep = () => {
    if (qsState.value.step > 0) qsState.value.step--
}

const resetQuiz = () => {
    qsState.value.answers = {}
    qsState.value.step = 0
    qsState.value.finished = false
}
</script>

<template>
    <div class="qs-container">
        <div v-if="!qsState.finished">
            <div class="page-title">飼養前自我評估</div>
            
            <!-- Progress -->
            <div class="qs-progress-area">
                <div class="qs-progress-labels">
                    <span>Step {{ qsState.step + 1 }} of {{ qsState.questions.length }}</span>
                    <span>{{ Math.round(qsProgress) }}%</span>
                </div>
                <div class="qs-progress-track">
                    <div class="qs-progress-fill" :style="{ width: qsProgress + '%' }"></div>
                </div>
            </div>

            <!-- Question -->
            <div class="qs-question-box" :key="qsState.step">
                <div class="qs-question-text">{{ qsCurrentQ.text }}</div>
                <div class="qs-options-grid">
                    <div v-for="opt in qsCurrentQ.options" :key="opt.id" class="qs-option-btn" @click="selectOption(qsCurrentQ.id, opt.score)">
                        <span class="qs-option-label">{{ opt.label }}</span>
                        <div class="qs-check-circle"></div>
                    </div>
                </div>
            </div>

            <!-- Navigation -->
            <button v-if="qsState.step > 0" @click="prevStep" class="qs-nav-btn">
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

            <button @click="resetQuiz" class="qs-reset-btn">
                🔄 重新評估
            </button>
        </div>
    </div>
</template>

<style scoped>
/*
  [局部樣式修復] 
  已清除寫死的深色背景、淺色字體色碼與多餘的全域覆寫。
  全面導入 CSS 變數，徹底移除所有不必要的 :global(body.day-mode) 覆寫。
*/
.qs-container { max-width: 800px; margin: 0 auto; padding-top: 15px; min-height: 60vh; }

.qs-progress-area { margin-bottom: 30px; }
.qs-progress-labels { 
    display: flex; 
    justify-content: space-between; 
    font-size: 0.75rem; 
    font-weight: bold; 
    color: var(--pri); 
    margin-bottom: 6px; 
    text-transform: uppercase; 
    letter-spacing: 1px; 
}
.qs-progress-track { 
    width: 100%; 
    height: 5px; 
    background: rgba(128, 128, 128, 0.2); 
    border-radius: 3px; 
    overflow: hidden; 
}
.qs-progress-fill { 
    height: 100%; 
    background: var(--pri); 
    transition: width 0.5s ease; 
    box-shadow: 0 0 10px var(--pri-glow); 
}

.qs-question-box { animation: fadeIn 0.5s ease; }
.qs-question-text { 
    font-size: 1.3rem; 
    font-weight: 700; 
    margin-bottom: 25px; 
    line-height: 1.4; 
    color: var(--txt); 
}

.qs-options-grid { display: flex; flex-direction: column; gap: 12px; }
.qs-option-btn { 
    width: 100%; 
    text-align: left; 
    padding: 15px; 
    background: var(--card-bg); 
    border: 1px solid var(--bd); 
    border-radius: 12px; 
    cursor: pointer; 
    transition: 0.2s; 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    color: var(--txt); 
}
.qs-option-btn:hover { 
    border-color: var(--pri); 
    background: rgba(128, 128, 128, 0.05); 
    transform: translateY(-2px); 
    box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}
.qs-option-label { font-size: 1rem; font-weight: 500; }
.qs-check-circle { 
    width: 20px; 
    height: 20px; 
    border-radius: 50%; 
    border: 2px solid var(--bd); 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    transition: 0.2s; 
}
.qs-option-btn:hover .qs-check-circle { border-color: var(--pri); background: var(--pri); }

.qs-nav-btn { 
    margin-top: 25px; 
    background: transparent; 
    border: none; 
    color: var(--txt); 
    opacity: 0.6;
    cursor: pointer; 
    font-size: 0.85rem; 
    display: flex; 
    align-items: center; 
    gap: 8px; 
    padding: 8px 0; 
    transition: 0.2s; 
}
.qs-nav-btn:hover { color: var(--pri); opacity: 1; }

.qs-result-box { 
    text-align: center; 
    padding: 30px 20px; 
    background: var(--card-bg); 
    border: 1px solid var(--bd); 
    border-radius: 16px; 
    animation: slideUp 0.6s ease; 
    max-width: 600px; 
    margin: 0 auto; 
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}
.qs-badge {
    font-size: 0.8rem;
    font-weight: bold;
    color: var(--pri);
    background: rgba(255, 69, 0, 0.1);
    padding: 4px 10px;
    border-radius: 20px;
    margin-bottom: 15px;
    display: inline-block;
}
.qs-res-title {
    font-size: 1.8rem;
    font-weight: bold;
    color: var(--txt);
}
.qs-score-display { 
    font-size: 3rem; 
    font-weight: 900; 
    color: var(--pri); 
    margin: 10px 0; 
    font-family: 'Black Ops One', cursive; 
    text-shadow: 0 0 20px var(--pri-glow); 
    line-height: 1;
}
.qs-res-desc { 
    font-size: 1rem; 
    line-height: 1.5; 
    color: var(--txt); 
    opacity: 0.8; 
    margin-bottom: 20px; 
}
.qs-hint-box { 
    background: rgba(128, 128, 128, 0.05); 
    border: 1px dashed var(--bd); 
    padding: 15px; 
    border-radius: 8px; 
    color: var(--txt); 
    opacity: 0.7; 
    font-size: 0.85rem; 
    margin-bottom: 20px; 
    line-height: 1.4;
}
.qs-reset-btn { 
    width: 100%; 
    padding: 14px; 
    background: var(--pri); 
    color: #fff; 
    border: none; 
    border-radius: 12px; 
    font-weight: bold; 
    font-size: 1.05rem; 
    cursor: pointer; 
    transition: 0.3s; 
    box-shadow: 0 5px 15px var(--pri-glow); 
}
.qs-reset-btn:hover { 
    transform: translateY(-3px); 
    filter: brightness(1.1); 
}

@keyframes fadeIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>