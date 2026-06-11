<script setup>
import { ref, computed, reactive, onMounted, watch, nextTick } from 'vue'
import { useHead } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import {
    SEVERITY, VERDICTS, DISEASES,
    getSeasonContext,
    TRIAGE_QUESTIONS, CHECKUP_QUESTIONS, PURCHASE_QUESTIONS
} from '~/utils/health.js'

const store = useMainStore()

useHead({
    title: '健康評估系統',
    meta:[
        { name: 'description', content: '透過分情境的引導式問卷快速判斷您的守宮是否需要就醫，三種情境覆蓋簡易緊急快篩、完整健康檢查與購入評估。' },
        { property: 'og:title', content: '健康評估系統 | Gencko Studio' },
        { property: 'og:description', content: '簡易緊急快篩 / 完整健康檢查 / 購入評估 三種情境，幫您判讀守宮狀態。' },
        { property: 'og:url', content: 'https://www.genckobreeding.com/health' }
    ],
    link:[ { rel: 'canonical', href: 'https://www.genckobreeding.com/health' } ]
})

// ============ 主要狀態 ============
// mode: 'entry' | 'triage' | 'checkup' | 'purchase'
const SESSION_KEY = 'gencko_health_state_v1'
const mode = ref('entry')
const answers = reactive({ triage: {}, checkup: {}, purchase: {} })
const finished = ref(false)
const season = getSeasonContext()
const sliding = ref(false) // 自動滾動鎖，防止連點跳題
const highlightedQuestionIndex = ref(-1)
let highlightTimer = null

// 保存到 sessionStorage（用於 /hospital 返回後恢復結果頁）
const saveState = () => {
    if (typeof window === 'undefined') return
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
            mode: mode.value,
            answers: JSON.parse(JSON.stringify(answers)),
            finished: finished.value,
            ts: Date.now()
        }))
    } catch (e) {}
}
const loadState = () => {
    if (typeof window === 'undefined') return
    try {
        const raw = sessionStorage.getItem(SESSION_KEY)
        if (!raw) return
        const data = JSON.parse(raw)
        // 30 分鐘內才復原（避免太舊）
        if (Date.now() - (data.ts || 0) > 30 * 60 * 1000) {
            sessionStorage.removeItem(SESSION_KEY); return
        }
        if (data.mode) mode.value = data.mode
        if (data.answers) {
            answers.triage = data.answers.triage || {}
            answers.checkup = data.answers.checkup || {}
            answers.purchase = data.answers.purchase || {}
        }
        finished.value = !!data.finished
    } catch (e) {}
}
const clearState = () => {
    if (typeof window === 'undefined') return
    try { sessionStorage.removeItem(SESSION_KEY) } catch (e) {}
}

onMounted(() => {
    loadState()
})

watch([mode, finished, () => answers.triage, () => answers.checkup, () => answers.purchase], saveState, { deep: true })

// 個體資料（報告表用）
const profile = reactive({
    nickname: '',
    species: '',
    sex: '',
    age: '',
    weight: ''
})

const currentQs = computed(() => {
    if (mode.value === 'triage') return TRIAGE_QUESTIONS
    if (mode.value === 'checkup') return CHECKUP_QUESTIONS
    if (mode.value === 'purchase') return PURCHASE_QUESTIONS
    return []
})

const currentAnswers = computed(() => {
    if (mode.value === 'triage') return answers.triage
    if (mode.value === 'checkup') return answers.checkup
    if (mode.value === 'purchase') return answers.purchase
    return {}
})

const progress = computed(() => {
    const total = currentQs.value.length
    const answered = Object.keys(currentAnswers.value).filter(k => {
        const v = currentAnswers.value[k]
        return Array.isArray(v) ? v.length > 0 : !!v
    }).length
    return total ? (answered / total) * 100 : 0
})

const startMode = (m) => {
    mode.value = m
    finished.value = false
    if (m === 'triage') answers.triage = {}
    if (m === 'checkup') answers.checkup = {}
    if (m === 'purchase') answers.purchase = {}
    nextTick(() => {
        document.querySelector('.h-q-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
}

const scrollPageTop = () => {
    if (typeof window === 'undefined') return
    window.scrollTo({ top: 0, behavior: 'auto' })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    store.lastScrollY = 0
    store.navHidden = false
}

const exitToEntry = () => {
    mode.value = 'entry'
    finished.value = false
    clearState()
}

// ============ 選項回答 ============
const scrollToQuestionIndex = (index) => {
    if (typeof window === 'undefined') return
    const targetEl = document.querySelectorAll('.h-q-card')[index]
    if (!targetEl) return
    highlightedQuestionIndex.value = index
    if (highlightTimer) clearTimeout(highlightTimer)
    highlightTimer = setTimeout(() => {
        highlightedQuestionIndex.value = -1
        highlightTimer = null
    }, 1800)
    sliding.value = true
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTimeout(() => { sliding.value = false }, 600)
}

const scrollToNextUnanswered = (currentQid) => {
    const qs = currentQs.value
    const curIdx = qs.findIndex(q => q.id === currentQid)
    const nextIdx = curIdx + 1
    if (nextIdx >= qs.length) return
    scrollToQuestionIndex(nextIdx)
}

const selectOption = (qId, optId) => {
    if (sliding.value) return
    const q = currentQs.value.find(x => x.id === qId)
    if (!q) return
    if (q.type === 'multi') {
        const arr = currentAnswers.value[qId] || []
        if (optId === 'none') {
            currentAnswers.value[qId] = ['none']
        } else {
            const filtered = arr.filter(x => x !== 'none')
            if (filtered.includes(optId)) {
                currentAnswers.value[qId] = filtered.filter(x => x !== optId)
            } else {
                currentAnswers.value[qId] = [...filtered, optId]
            }
        }
    } else {
        currentAnswers.value[qId] = optId
        setTimeout(() => scrollToNextUnanswered(qId), 250)
    }
}

const isSelected = (qId, optId) => {
    const v = currentAnswers.value[qId]
    if (Array.isArray(v)) return v.includes(optId)
    return v === optId
}

const allAnswered = computed(() => {
    return currentQs.value.every(q => {
        const v = currentAnswers.value[q.id]
        return Array.isArray(v) ? v.length > 0 : !!v
    })
})

const firstUnansweredIndex = computed(() => {
    return currentQs.value.findIndex(q => {
        const v = currentAnswers.value[q.id]
        return !(Array.isArray(v) ? v.length > 0 : !!v)
    })
})

const submit = () => {
    if (!allAnswered.value) {
        if (firstUnansweredIndex.value >= 0) {
            scrollToQuestionIndex(firstUnansweredIndex.value)
        }
        return
    }
    finished.value = true
    nextTick(() => {
        requestAnimationFrame(() => {
            scrollPageTop()
        })
    })
}

const resetCurrent = () => {
    if (mode.value === 'triage') answers.triage = {}
    if (mode.value === 'checkup') answers.checkup = {}
    if (mode.value === 'purchase') answers.purchase = {}
    finished.value = false
}

// ============ 取出已選 option 物件（用於判讀） ============
const getChosenOptions = (modeKey) => {
    const qs = modeKey === 'triage' ? TRIAGE_QUESTIONS : modeKey === 'checkup' ? CHECKUP_QUESTIONS : PURCHASE_QUESTIONS
    const ans = answers[modeKey]
    const out = []
    qs.forEach(q => {
        const v = ans[q.id]
        if (!v) return
        if (Array.isArray(v)) {
            v.forEach(optId => {
                const opt = q.options.find(o => o.id === optId)
                if (opt) out.push({ q, opt })
            })
        } else {
            const opt = q.options.find(o => o.id === v)
            if (opt) out.push({ q, opt })
        }
    })
    return out
}

// ============ Triage 判讀（決策樹） ============
const triageVerdict = computed(() => {
    if (mode.value !== 'triage' || !finished.value) return null
    const chosen = getChosenOptions('triage')
    const ans = answers.triage

    // 紅旗：任何 critical 都升級為 emergency
    const hasCritical = chosen.some(c => c.opt.severity === 'critical')
    if (hasCritical) return VERDICTS.emergency

    // 計算 warn / watch 數量
    const warnCount = chosen.filter(c => c.opt.severity === 'warn').length
    const watchCount = chosen.filter(c => c.opt.severity === 'watch').length

    // 季節性發情拒食判讀（公母成體都會 + 春季 + 拒食 1-2 個月 + 其他指標正常）
    const isMaleBreedingFast =
        (ans.gender === 'maleAdult' || ans.gender === 'femaleAdult') &&
        season.isBreedingSeason &&
        (ans.fastDays === 'd14' || ans.fastDays === 'd30') &&
        (Array.isArray(ans.fastSymptoms) && ans.fastSymptoms.includes('none'))

    // 新環境壓力期：env 有 newEnv + 其他都是輕微異常
    const inAdjustment = Array.isArray(ans.env) && ans.env.includes('newEnv')

    if (warnCount >= 2) return VERDICTS.urgent
    if (warnCount === 1 || watchCount >= 2) {
        if (isMaleBreedingFast || inAdjustment) return VERDICTS.watch
        return VERDICTS.watch
    }
    if (watchCount === 1) return VERDICTS.watch
    return VERDICTS.healthy
})

// 觸發 emergency 的選項（用於結果頁強調列出）
const triageCriticalItems = computed(() => {
    return getChosenOptions('triage').filter(c => c.opt.severity === 'critical')
})

// 季節性「正常解釋」需要顯示給使用者
const triageNormalNotes = computed(() => {
    const ans = answers.triage
    const notes = []
    if (
        (ans.gender === 'maleAdult' || ans.gender === 'femaleAdult') &&
        season.isBreedingSeason &&
        (ans.fastDays === 'd14' || ans.fastDays === 'd30') &&
        (Array.isArray(ans.fastSymptoms) && ans.fastSymptoms.includes('none'))
    ) {
        notes.push({
            title: '可能屬於正常發情期拒食',
            body: `目前是 ${season.month} 月，正值守宮發情季節（1–4 月）。成體（公母皆會）在這段時間拒食 1–2 個月、其他指標正常時，多數會於發情季結束後恢復進食。請持續記錄體重變化，每週量一次。`
        })
    }
    if (Array.isArray(ans.env) && ans.env.includes('newEnv')) {
        notes.push({
            title: '可能屬於環境適應壓力',
            body: '新個體入手後 1–2 週內，輕微的拒食、躲洞、行為改變多為適應期反應。請保持安靜、減少干擾，2 週後再行評估。'
        })
    }
    return notes
})

// ============ Checkup 項目判讀 ============
const checkupReport = computed(() => {
    if (mode.value !== 'checkup' || !finished.value) return []
    return getChosenOptions('checkup').map(({ q, opt }) => ({
        category: q.category,
        question: q.title,
        answer: opt.label,
        severity: opt.severity,
        sev: SEVERITY[opt.severity],
        normalReason: opt.normalReason,
        diseases: opt.diseases || []
    }))
})

const checkupVerdict = computed(() => {
    if (mode.value !== 'checkup' || !finished.value) return null
    const items = checkupReport.value
    const criticalCount = items.filter(i => i.severity === 'critical').length
    const warnCount = items.filter(i => i.severity === 'warn').length
    if (criticalCount >= 2) return VERDICTS.emergency
    if (criticalCount === 1) return VERDICTS.urgent
    if (warnCount >= 2) return VERDICTS.urgent
    if (warnCount === 1) return VERDICTS.watch
    if (items.filter(i => i.severity === 'watch').length >= 3) return VERDICTS.watch
    return VERDICTS.healthy
})

// ============ Purchase 判讀 ============
const purchaseReport = computed(() => {
    if (mode.value !== 'purchase' || !finished.value) return []
    return getChosenOptions('purchase').map(({ q, opt }) => ({
        question: q.title,
        answer: opt.label,
        severity: opt.severity,
        sev: SEVERITY[opt.severity],
        diseases: opt.diseases || []
    }))
})

const purchaseVerdict = computed(() => {
    if (mode.value !== 'purchase' || !finished.value) return null
    const items = purchaseReport.value
    const hasCritical = items.some(i => i.severity === 'critical')
    const warnCount = items.filter(i => i.severity === 'warn').length
    if (hasCritical) return { ...VERDICTS.emergency, title: '這隻先不要買', headline: '照片已出現明顯健康紅旗，購入風險過高。', action: '只要看到眼睛分泌物、牙籤尾、潰瘍傷口或明顯無反應，直接換看下一隻。' }
    if (warnCount >= 1) return { ...VERDICTS.urgent, title: '先補看更多細節', headline: '目前有幾項需要再確認，單靠這組照片還不夠。', action: '請賣家補正面、側面、尾巴根部、眼部特寫，以及行走或進食影片後再決定。' }
    return { ...VERDICTS.healthy, title: '可列入考慮', headline: '從目前照片來看，外觀指標大致健康。', action: '購入前仍要逐項確認眼睛、尾巴、皮膚、體態與精神反應是否一致正常。' }
})

// ============ 相關疾病（依答案蒐集，去重） ============
const suspectedDiseases = computed(() => {
    let chosen = []
    if (mode.value === 'triage') chosen = getChosenOptions('triage')
    else if (mode.value === 'checkup') chosen = getChosenOptions('checkup')
    else if (mode.value === 'purchase') chosen = getChosenOptions('purchase')
    const set = new Set()
    chosen.forEach(({ opt }) => (opt.diseases || []).forEach(d => set.add(d)))
    return [...set].map(k => ({ key: k, ...DISEASES[k] })).filter(d => d.name)
})

// ============ 結果表格（給截圖用） ============
const reportRows = computed(() => {
    if (mode.value === 'triage') {
        return getChosenOptions('triage').map(({ q, opt }) => ({
            question: q.title.replace(/^Q\d+(-\d+)?\.\s*/, ''),
            answer: opt.label,
            sev: SEVERITY[opt.severity]
        }))
    }
    if (mode.value === 'checkup') {
        return checkupReport.value.map(r => ({
            question: r.question.replace(/^[A-D]\d+\.\s*/, ''),
            answer: r.answer,
            sev: r.sev,
            category: r.category
        }))
    }
    if (mode.value === 'purchase') {
        return purchaseReport.value.map(r => ({
            question: r.question.replace(/^Q\d+\.\s*/, ''),
            answer: r.answer,
            sev: r.sev
        }))
    }
    return []
})

const todayStr = computed(() => {
    const d = new Date()
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
})

const verdictForReport = computed(() => {
    if (mode.value === 'triage') return triageVerdict.value
    if (mode.value === 'checkup') return checkupVerdict.value
    if (mode.value === 'purchase') return purchaseVerdict.value
    return null
})

const showHospitalCta = computed(() => {
    if (mode.value === 'purchase' || !verdictForReport.value) return false
    return ['emergency', 'urgent'].includes(verdictForReport.value.key)
})

const modeLabel = computed(() => ({
    triage: '簡易緊急快篩',
    checkup: '完整健康檢查',
    purchase: '購入評估'
}[mode.value] || ''))

const purchaseChecklist = [
    '眼睛要大睜清澈，不能有分泌物、結痂或明顯凹陷。',
    '尾巴要有厚度，不能牙籤尾，也不要瘦到脊椎骨盆明顯外露。',
    '皮膚要完整，避免潰瘍、燒燙傷、卡皮卡在趾尖或尾尖。',
    '體態要結實不虛弱，腹部不要異常鼓脹或單側突出。',
    '精神反應要正常，拍照或移動時至少會抬頭、轉向或移動。',
    '要求賣家補側面、尾巴根部、眼部特寫與行走影片，不要只看一張美照。'
]

// ============ 複製文字版報告 ============
const copyReportText = async () => {
    if (typeof window === 'undefined') return
    const lines = []
    lines.push('===== 守宮健康評估報告 =====')
    lines.push(todayStr.value)
    lines.push('※ 僅供獸醫問診參考，非診斷依據，請以獸醫實際問診及診斷情況為主。')
    lines.push('')
    if (verdictForReport.value) {
        lines.push(`【系統建議】${verdictForReport.value.title}`)
        lines.push(verdictForReport.value.headline)
        lines.push('')
    }
    lines.push('【觀察項目】')
    reportRows.value.forEach(r => {
        lines.push(`${r.question}：${r.answer}`)
    })
    if (suspectedDiseases.value.length) {
        lines.push('')
        lines.push('【可能狀況（請以獸醫檢查為主）】')
        suspectedDiseases.value.forEach(d => lines.push(`• ${d.name}`))
    }
    try {
        await navigator.clipboard.writeText(lines.join('\n'))
        copied.value = true
        setTimeout(() => { copied.value = false }, 2000)
    } catch (e) {
        const ta = document.createElement('textarea')
        ta.value = lines.join('\n')
        document.body.appendChild(ta); ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        copied.value = true
        setTimeout(() => { copied.value = false }, 2000)
    }
}
const copied = ref(false)
</script>

<template>
    <div :class="['health-container', { 'health-container--quiz': mode !== 'entry' && !finished, 'health-container--nav-hidden': store.navHidden && mode !== 'entry' && !finished }]">
        <TheBackButton wrapper-class="m-only" :fallback="mode === 'entry' ? '/' : null" :on-click="mode !== 'entry' ? exitToEntry : null" />

        <!-- ============ 入口頁 ============ -->
        <div v-if="mode === 'entry'" class="h-entry">
            <h1 class="page-title">健康評估系統</h1>
            <p class="h-entry-sub">依目的選擇題組：緊急判斷、完整檢查或購入前評估。</p>
            <div class="h-entry-foot">
                <p>⚠️ 本工具僅供觀察參考，無法取代獸醫診斷。若守宮狀態急速惡化，請直接就醫。</p>
            </div>

            <div class="h-card-grid">
                <button class="h-entry-card h-entry-card--urgent" @click="startMode('triage')">
                    <div class="h-entry-corner">
                        <span class="h-entry-num">01</span>
                        <span class="h-entry-tag h-tag--urgent">URGENT</span>
                    </div>
                    <div class="h-entry-title">簡易緊急快篩</div>
                    <div class="h-entry-quote">8 題快篩<br>先判斷是否需急診</div>
                    <div class="h-entry-meta">
                        <span class="h-entry-meta-num">8</span>
                        <span>題</span>
                        <span class="h-entry-meta-dot">·</span>
                        <span>約 1 分鐘</span>
                    </div>
                    <div class="h-entry-desc">聚焦急性警訊、拒食、呼吸、外傷與環境異常，快速判斷是否要立即就醫。</div>
                    <div class="h-entry-cta">開始快篩<span class="h-entry-cta-arrow">→</span></div>
                </button>

                <button class="h-entry-card h-entry-card--full" @click="startMode('checkup')">
                    <div class="h-entry-corner">
                        <span class="h-entry-num">02</span>
                        <span class="h-entry-tag h-tag--full">CHECKUP</span>
                    </div>
                    <div class="h-entry-title">完整健康檢查</div>
                    <div class="h-entry-quote">20 題細查<br>完整盤點健康狀態</div>
                    <div class="h-entry-meta">
                        <span class="h-entry-meta-num">{{ CHECKUP_QUESTIONS.length }}</span>
                        <span>題</span>
                        <span class="h-entry-meta-dot">·</span>
                        <span>約 6 分鐘</span>
                    </div>
                    <div class="h-entry-desc">涵蓋五官、體表、體態、排泄、活動與環境紀錄，適合做完整健康檢查。</div>
                    <div class="h-entry-cta">開始檢查<span class="h-entry-cta-arrow">→</span></div>
                </button>

                <button class="h-entry-card h-entry-card--purchase" @click="startMode('purchase')">
                    <div class="h-entry-corner">
                        <span class="h-entry-num">03</span>
                        <span class="h-entry-tag h-tag--purchase">PRE-BUY</span>
                    </div>
                    <div class="h-entry-title">購入評估</div>
                    <div class="h-entry-quote">4 題照片判斷<br>先看外觀值不值得買</div>
                    <div class="h-entry-meta">
                        <span class="h-entry-meta-num">4</span>
                        <span>題</span>
                        <span class="h-entry-meta-dot">·</span>
                        <span>約 1 分鐘</span>
                    </div>
                    <div class="h-entry-desc">只看購入前能確認的眼睛、體態、皮膚與精神反應，快速排除明顯風險。</div>
                    <div class="h-entry-cta">開始評估<span class="h-entry-cta-arrow">→</span></div>
                </button>
            </div>

        </div>

        <!-- ============ 問卷階段 ============ -->
        <div v-else-if="!finished" class="h-quiz">
            <div class="h-quiz-head">
                <button class="h-back-btn btn-app btn-app--ghost btn-app--md btn-app--pill" @click="exitToEntry">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                    返回
                </button>
                <div class="h-quiz-title">{{ modeLabel }}</div>
            </div>

            <div class="h-progress-area">
                <div class="h-progress-labels">
                    <span>進度</span>
                    <span>{{ Math.round(progress) }}%</span>
                </div>
                <div class="h-progress-track">
                    <div class="h-progress-fill" :style="{ width: progress + '%' }"></div>
                </div>
            </div>

            <div class="h-q-list">
                <div v-for="(q, qi) in currentQs" :key="q.id" class="h-q-card" :class="{ 'is-highlighted': highlightedQuestionIndex === qi }">
                    <div class="h-q-num-row">
                        <span class="h-q-num">{{ String(qi + 1).padStart(2, '0') }}</span>
                        <span class="h-q-total">/ {{ String(currentQs.length).padStart(2, '0') }}</span>
                        <span v-if="q.category" class="h-q-cat-pill">{{ q.category }}</span>
                    </div>
                    <div class="h-q-title">{{ q.title.replace(/^[A-D]?\d+(-\d+)?\.\s*/, '') }}</div>
                    <div class="h-q-subtitle" v-if="q.subtitle">{{ q.subtitle }}</div>

                    <div class="h-q-options">
                        <button
                            v-for="opt in q.options"
                            :key="opt.id"
                            type="button"
                            class="h-q-opt"
                            :class="[
                                'h-sev-' + opt.severity,
                                { 'is-selected': isSelected(q.id, opt.id) }
                            ]"
                            @click="selectOption(q.id, opt.id)"
                        >
                            <div class="h-q-opt-dot" :style="{ background: SEVERITY[opt.severity].color }"></div>
                            <div class="h-q-opt-body">
                                <div class="h-q-opt-label">{{ opt.label }}</div>
                                <div v-if="opt.normalReason" class="h-q-opt-reason">{{ opt.normalReason }}</div>
                            </div>
                            <div class="h-q-opt-check">
                                <svg v-if="isSelected(q.id, opt.id)" viewBox="0 0 16 16" width="14" height="14"><path d="M3 8.5l3.5 3.5L13 4.5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            </div>
                        </button>
                    </div>

                    <!-- multi 題下方加「下一題」按鈕 -->
                    <button
                        v-if="q.type === 'multi' && Array.isArray(currentAnswers[q.id]) && currentAnswers[q.id].length > 0 && qi < currentQs.length - 1"
                        class="h-q-next-btn"
                        @click="scrollToNextUnanswered(q.id)"
                    >下一題 →</button>
                </div>
            </div>

            <div class="h-quiz-foot">
                <button class="h-reset-btn" @click="resetCurrent">🔄 全部重來</button>
                <button class="h-submit-btn" :class="{ 'is-disabled': !allAnswered }" @click="submit">
                    產出評估結果 →
                </button>
            </div>
        </div>

        <!-- ============ 結果頁 ============ -->
            <div v-else class="h-result">
                <div class="h-result-head">
                <button class="h-back-btn btn-app btn-app--ghost btn-app--md btn-app--pill" @click="exitToEntry">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                    返回
                </button>
                <button class="h-back-btn btn-app btn-app--ghost btn-app--md btn-app--pill" @click="resetCurrent">重新作答</button>
                </div>

            <!-- 主結果卡 -->
            <div
                v-if="verdictForReport"
                class="h-verdict-card"
                :style="{ borderColor: verdictForReport.color, boxShadow: `0 8px 30px ${verdictForReport.color}33` }"
            >
                <div class="h-verdict-emoji">{{ verdictForReport.emoji }}</div>
                <div class="h-verdict-title" :style="{ color: verdictForReport.color }">{{ verdictForReport.title }}</div>
                <div class="h-verdict-headline">{{ verdictForReport.headline }}</div>
                <div class="h-verdict-action">{{ verdictForReport.action }}</div>

                <a v-if="showHospitalCta" href="/hospital" class="h-hospital-btn">
                    🏥 查看爬蟲專科醫院 →
                </a>
            </div>

            <!-- Triage 模式：列出致命警訊 -->
            <div v-if="mode === 'triage' && triageCriticalItems.length" class="h-section h-section-danger">
                <h3 class="h-section-title">🔴 觸發立即就醫的警訊</h3>
                <ul class="h-danger-list">
                    <li v-for="(c, i) in triageCriticalItems" :key="i">
                        <strong>{{ c.q.title.replace(/^Q\d+(-\d+)?\.\s*/, '') }}：</strong>{{ c.opt.label }}
                    </li>
                </ul>
            </div>

            <!-- Triage / Checkup 的「正常解釋」 -->
            <div v-if="mode === 'triage' && triageNormalNotes.length" class="h-section h-section-info">
                <h3 class="h-section-title">💡 可能的正常變異解釋</h3>
                <div v-for="(n, i) in triageNormalNotes" :key="i" class="h-note-block">
                    <div class="h-note-title">{{ n.title }}</div>
                    <div class="h-note-body">{{ n.body }}</div>
                </div>
            </div>

            <!-- 可能狀況（僅供獸醫參考，非診斷；購入模式不顯示） -->
            <div v-if="suspectedDiseases.length && mode !== 'purchase'" class="h-section h-section-disease">
                <h3 class="h-section-title">📋 可能狀況</h3>
                <p class="h-disease-disclaimer">⚠️ 僅供獸醫問診參考，非診斷依據，請以獸醫實際問診及診斷情況為主。</p>
                <div v-for="d in suspectedDiseases" :key="d.key" class="h-disease-card">
                    <div class="h-disease-name">{{ d.name }}</div>
                    <div class="h-disease-signs">
                        <span class="h-disease-label">相關症狀：</span>{{ d.signs.join('、') }}
                    </div>
                    <div class="h-disease-note">{{ d.note }}</div>
                </div>
            </div>

            <!-- Checkup 項目報告 -->
            <div v-if="mode === 'checkup'" class="h-section">
                <h3 class="h-section-title">📊 各項目判讀</h3>
                <div v-for="cat in [...new Set(checkupReport.map(r => r.category))]" :key="cat" class="h-cat-block">
                    <div class="h-cat-title">{{ cat }}</div>
                    <div v-for="(r, i) in checkupReport.filter(x => x.category === cat)" :key="i" class="h-item-row" :class="'h-sev-' + r.severity + '-row'">
                        <div class="h-item-head">
                            <span class="h-item-tag">{{ r.sev.tag }}</span>
                            <span class="h-item-q">{{ r.question.replace(/^[A-D]\d+\.\s*/, '') }}</span>
                        </div>
                        <div class="h-item-ans">{{ r.answer }}</div>
                        <div v-if="r.normalReason" class="h-item-note">💡 {{ r.normalReason }}</div>
                    </div>
                </div>
            </div>

            <div v-if="mode === 'purchase'" class="h-section">
                <h3 class="h-section-title">🛒 購入時優先檢查</h3>
                <div class="h-cat-block">
                    <div v-for="(item, index) in purchaseChecklist" :key="index" class="h-item-row">
                        <div class="h-item-head">
                            <span class="h-item-tag">重點 {{ index + 1 }}</span>
                            <span class="h-item-q">{{ item }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 報告表格（截圖區） -->
            <div v-if="mode !== 'purchase'" class="h-section h-section-report" id="health-report-area">
                <div class="h-report-head">
                    <h3 class="h-section-title">📸 給獸醫看的報告（可截圖此區）</h3>
                    <button class="h-copy-btn" @click="copyReportText">
                        {{ copied ? '✓ 已複製' : '📋 複製文字版' }}
                    </button>
                </div>

                <div class="h-report-card">
                    <div class="h-report-title">守宮健康評估報告</div>
                    <div class="h-report-date">{{ todayStr }}</div>
                    <div class="h-report-disclaimer">※ 僅供獸醫問診參考，非診斷依據，請以獸醫實際問診及診斷情況為主。</div>

                    <!-- 系統建議 -->
                    <div v-if="verdictForReport" class="h-report-section">
                        <div class="h-report-section-title">系統建議</div>
                        <div class="h-report-verdict" :style="{ borderLeftColor: verdictForReport.color }">
                            <strong>{{ verdictForReport.title }}</strong>
                            <div>{{ verdictForReport.headline }}</div>
                        </div>
                    </div>

                    <!-- 觀察項目表 -->
                    <div class="h-report-section">
                        <div class="h-report-section-title">觀察項目</div>
                        <table class="h-report-table">
                            <thead>
                                <tr>
                                    <th>項目</th>
                                    <th>狀態</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(r, i) in reportRows" :key="i">
                                    <td>{{ r.question }}</td>
                                    <td>{{ r.answer }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- 可能狀況 -->
                    <div v-if="suspectedDiseases.length" class="h-report-section">
                        <div class="h-report-section-title">可能狀況（請以獸醫檢查為主）</div>
                        <ul class="h-report-diseases">
                            <li v-for="d in suspectedDiseases" :key="d.key">{{ d.name }}</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.health-container {
    --health-sticky-top: calc(90px + env(safe-area-inset-top, 0px));
    --health-quiz-head-height: 44px;
    --health-progress-height: 48px;
    --health-nav-shift: 0px;
    max-width: 1000px;
    margin: 0 auto;
    padding: 15px 20px 40px;
}
.health-container--nav-hidden {
    --health-nav-shift: -50px;
}
.health-container--quiz {
    box-sizing: border-box;
    padding-top: 0;
    padding-bottom: 0;
}
.m-only { display: none !important; }

/* ============ 入口頁 ============ */
.h-entry .page-title {
    text-align: center;
    margin-bottom: 6px;
    font-size: 2rem;
    letter-spacing: 0.5px;
}
.h-entry-sub { text-align: center; color: var(--txt); opacity: 0.65; font-size: 0.95rem; margin-bottom: 32px; }

/* 桌機：3 卡並排 */
.h-card-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-bottom: 24px;
}
.h-entry-card {
    position: relative;
    background: var(--card-bg);
    border: 1px solid var(--bd);
    border-radius: 18px;
    padding: 28px 24px;
    text-align: left;
    cursor: pointer;
    transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s, border-color 0.3s;
    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    display: flex;
    flex-direction: column;
    gap: 14px;
    font-family: inherit;
    color: var(--txt);
    overflow: hidden;
}
.h-entry-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 4px;
    background: linear-gradient(90deg, transparent, currentColor, transparent);
    opacity: 0;
    transition: opacity 0.3s;
}
.h-entry-card::after {
    content: '';
    position: absolute;
    top: -40%; right: -30%;
    width: 200px; height: 200px;
    background: radial-gradient(circle, currentColor, transparent 70%);
    opacity: 0;
    transition: opacity 0.4s;
    pointer-events: none;
}
.h-entry-card:hover { transform: translateY(-6px); box-shadow: 0 18px 45px rgba(0,0,0,0.15); }
.h-entry-card:hover::before { opacity: 0.5; }
.h-entry-card:hover::after { opacity: 0.08; }

.h-entry-card--urgent   { color: #ef4444; }
.h-entry-card--full     { color: #f59e0b; }
.h-entry-card--purchase { color: #3b82f6; }
.h-entry-card--urgent:hover   { border-color: rgba(239,68,68,0.4); }
.h-entry-card--full:hover     { border-color: rgba(245,158,11,0.4); }
.h-entry-card--purchase:hover { border-color: rgba(59,130,246,0.4); }

.h-entry-corner {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 4px;
}
.h-entry-num {
    font-family: 'Black Ops One', monospace, sans-serif;
    font-size: 1.5rem;
    color: currentColor;
    opacity: 0.85;
    letter-spacing: 1px;
}
.h-entry-tag {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 1.5px;
    padding: 4px 9px;
    border-radius: 4px;
    background: currentColor;
    color: #fff !important;
    opacity: 0.95;
}
.h-tag--urgent   { background: #ef4444; }
.h-tag--full     { background: #f59e0b; }
.h-tag--purchase { background: #3b82f6; }

.h-entry-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--txt);
    line-height: 1.2;
}
.h-entry-quote {
    font-size: 1.05rem;
    line-height: 1.55;
    color: var(--txt);
    opacity: 0.78;
    font-weight: 500;
    padding: 12px 0 14px;
    border-bottom: 1px solid var(--bd);
    position: relative;
}
.h-entry-quote::before {
    content: '"';
    position: absolute;
    top: 0; left: -2px;
    font-size: 2.2rem;
    line-height: 1;
    color: currentColor;
    opacity: 0.25;
    font-family: serif;
}
.h-entry-meta {
    display: flex; align-items: baseline; gap: 6px;
    font-size: 0.82rem; color: var(--txt); opacity: 0.7; font-weight: 500;
}
.h-entry-meta-num { font-size: 1.15rem; font-weight: 800; color: currentColor; }
.h-entry-meta-dot { opacity: 0.4; }

.h-entry-desc {
    font-size: 0.88rem;
    line-height: 1.6;
    color: var(--txt);
    opacity: 0.7;
    flex: 1;
}
.h-entry-cta {
    display: flex; align-items: center; gap: 6px;
    font-size: 0.92rem; font-weight: 700; color: currentColor;
    margin-top: 6px;
    transition: gap 0.3s;
}
.h-entry-card:hover .h-entry-cta { gap: 14px; }
.h-entry-cta-arrow { transition: transform 0.3s; }
.h-entry-card:hover .h-entry-cta-arrow { transform: translateX(4px); }

.h-entry-foot {
    margin-top: 20px;
    padding: 14px 18px;
    background: rgba(128,128,128,0.04);
    border: 1px solid var(--bd);
    border-radius: 12px;
    color: var(--txt);
    opacity: 0.7;
    font-size: 0.85rem;
    text-align: center;
    line-height: 1.5;
}
.h-entry-foot p { margin: 0; }

/* ============ 問卷階段 ============ */
.h-quiz-head, .h-result-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 12px; }
.health-container--quiz .h-quiz-head {
    position: fixed;
    top: var(--health-sticky-top);
    left: 50%;
    transform: translate(-50%, var(--health-nav-shift));
    width: min(1000px, calc(100vw - 40px));
    z-index: 1011;
    margin-bottom: 0;
    padding: 0 20px;
    box-sizing: border-box;
    min-height: var(--health-quiz-head-height);
    background: var(--card-bg);
    border-bottom: 1px solid var(--bd);
    box-shadow: 0 6px 18px rgba(0,0,0,0.08);
    backdrop-filter: blur(10px);
    transition: transform 0.3s ease;
}
.h-quiz {
    display: flex;
    flex-direction: column;
}
.h-quiz-title {
    font-size: 1.15rem; font-weight: 800; color: var(--txt); letter-spacing: 0.5px;
}
.h-back-btn {
    cursor: pointer;
    font-family: inherit;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    box-shadow: none;
}
.health-container--quiz .h-back-btn { opacity: 1; }

.h-progress-area {
    position: sticky;
    top: var(--health-sticky-top);
    z-index: 15;
    margin-bottom: 0;
    padding: 8px 0 12px;
    background: var(--bg);
}
.health-container--quiz .h-progress-area {
    position: fixed;
    top: calc(var(--health-sticky-top) + var(--health-quiz-head-height));
    left: 50%;
    transform: translate(-50%, var(--health-nav-shift));
    width: min(1000px, calc(100vw - 40px));
    z-index: 1010;
    margin-bottom: 0;
    padding: 0 20px 10px;
    box-sizing: border-box;
    background: var(--card-bg);
    border-bottom: 1px solid var(--bd);
    box-shadow: 0 8px 22px rgba(0,0,0,0.08);
    backdrop-filter: blur(10px);
    transition: transform 0.3s ease;
}
.h-progress-labels {
    display: flex; justify-content: space-between;
    font-size: 0.72rem; color: var(--txt); opacity: 0.65;
    font-weight: 600; margin-bottom: 6px; letter-spacing: 1px; text-transform: uppercase;
}
.h-progress-track {
    width: 100%; height: 6px;
    background: rgba(128,128,128,0.15);
    border-radius: 999px;
    overflow: hidden;
    position: relative;
}
.h-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--pri), #ff8c42);
    transition: width 0.5s cubic-bezier(0.4,0,0.2,1);
    box-shadow: 0 0 12px var(--pri-glow);
    border-radius: 999px;
}

.h-q-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
}
.health-container--quiz .h-q-list {
    padding-top: calc(var(--health-quiz-head-height) + var(--health-progress-height) + 12px);
}
.h-q-card {
    background: var(--card-bg); border: 1px solid var(--bd); border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 18px rgba(0,0,0,0.05);
    transition: box-shadow 0.3s, border-color 0.25s, background 0.25s, transform 0.25s;
    min-height: auto;
    scroll-margin-top: calc(var(--health-sticky-top) + var(--health-progress-height) + 18px);
}
.h-q-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
.h-q-card.is-highlighted {
    border-color: var(--pri);
    background: rgba(255,69,0,0.05);
    box-shadow: 0 0 0 3px rgba(255,69,0,0.14), 0 10px 28px rgba(255,69,0,0.14);
    transform: translateY(-1px);
    animation: questionHighlightPulse 0.9s ease-out 2;
}
@keyframes questionHighlightPulse {
    0% {
        border-color: rgba(255,69,0,0.45);
        background: rgba(255,69,0,0.12);
        box-shadow: 0 0 0 0 rgba(255,69,0,0.22), 0 10px 28px rgba(255,69,0,0.14);
    }
    50% {
        border-color: rgba(255,69,0,0.9);
        background: rgba(255,69,0,0.18);
        box-shadow: 0 0 0 8px rgba(255,69,0,0.08), 0 12px 30px rgba(255,69,0,0.18);
    }
    100% {
        border-color: var(--pri);
        background: rgba(255,69,0,0.05);
        box-shadow: 0 0 0 3px rgba(255,69,0,0.14), 0 10px 28px rgba(255,69,0,0.14);
    }
}

.h-q-num-row {
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 12px;
}
.h-q-num {
    font-family: 'Black Ops One', monospace, sans-serif;
    font-size: 1.4rem;
    color: var(--pri);
    line-height: 1;
}
.h-q-total {
    font-family: 'Black Ops One', monospace, sans-serif;
    font-size: 0.95rem;
    color: var(--txt);
    opacity: 0.4;
    line-height: 1;
}
.h-q-cat-pill {
    margin-left: auto;
    font-size: 0.7rem; font-weight: 700;
    padding: 4px 10px; border-radius: 999px;
    background: rgba(255,69,0,0.1);
    color: var(--pri);
    letter-spacing: 0.5px;
}
.h-q-title { font-size: 1.1rem; font-weight: 700; color: var(--txt); margin-bottom: 6px; line-height: 1.45; }
.h-q-subtitle { font-size: 0.82rem; color: var(--txt); opacity: 0.6; margin-bottom: 16px; line-height: 1.5; }

.h-q-options { display: flex; flex-direction: column; gap: 8px; }
.h-q-opt {
    display: flex; align-items: flex-start; gap: 12px;
    width: 100%; padding: 13px 14px; text-align: left;
    background: var(--card-bg);
    border: 1.5px solid var(--bd);
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s, background 0.18s;
    color: var(--txt); font-family: inherit; font-size: inherit;
    position: relative;
}
.h-q-opt:hover {
    border-color: var(--pri);
    background: rgba(255,69,0,0.025);
    transform: translateX(2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}
.h-q-opt.is-selected {
    background: rgba(255,69,0,0.07);
    border-color: var(--pri);
    box-shadow: 0 0 0 3px rgba(255,69,0,0.15);
    transform: translateX(2px);
}
.h-q-opt-dot {
    width: 10px; height: 10px; border-radius: 50%;
    margin-top: 6px;
    flex-shrink: 0;
    box-shadow: 0 0 0 3px rgba(255,255,255,0.6);
}
.h-q-opt-body { flex: 1; min-width: 0; }
.h-q-opt-label { font-size: 0.95rem; font-weight: 500; line-height: 1.5; color: var(--txt); }
.h-q-opt-reason {
    font-size: 0.78rem;
    color: var(--txt); opacity: 0.6;
    margin-top: 6px;
    padding: 6px 10px;
    background: rgba(74,222,128,0.07);
    border-left: 2px solid #4ade80;
    border-radius: 4px;
    line-height: 1.5;
}
.h-q-opt-check {
    width: 22px; height: 22px; border-radius: 50%;
    border: 2px solid var(--bd);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
    transition: 0.2s;
}
.h-q-opt.is-selected .h-q-opt-check {
    background: var(--pri); border-color: var(--pri);
    animation: checkPop 0.3s ease-out;
}
@keyframes checkPop {
    0%   { transform: scale(0.6); }
    50%  { transform: scale(1.15); }
    100% { transform: scale(1); }
}

/* 嚴重度左邊細條 */
.h-sev-normal   { border-left: 4px solid #4ade80; }
.h-sev-watch    { border-left: 4px solid #facc15; }
.h-sev-warn     { border-left: 4px solid #fb923c; }
.h-sev-critical { border-left: 4px solid #ef4444; }

.h-quiz-foot {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    align-items: center;
    margin-top: 24px;
    padding: 16px 0 8px;
    border-top: 1px solid var(--bd);
}
.h-reset-btn {
    background: transparent;
    border: 1px solid var(--bd);
    color: var(--txt);
    opacity: 0.7;
    padding: 11px 18px;
    border-radius: 10px;
    font-size: 0.88rem;
    cursor: pointer;
    transition: 0.2s;
    font-family: inherit;
}
.h-reset-btn:hover { border-color: var(--pri); color: var(--pri); opacity: 1; }
.h-submit-btn {
    background: linear-gradient(135deg, var(--pri), #ff7733);
    color: #fff;
    border: none;
    padding: 13px 28px;
    border-radius: 10px;
    font-weight: 800;
    font-size: 0.98rem;
    cursor: pointer;
    transition: 0.25s;
    box-shadow: 0 6px 18px var(--pri-glow);
    font-family: inherit;
    letter-spacing: 0.3px;
}
.h-submit-btn:hover { transform: translateY(-3px); box-shadow: 0 10px 24px var(--pri-glow); }
.h-submit-btn.is-disabled { opacity: 0.35; box-shadow: none; background: var(--bd); }
.h-submit-btn.is-disabled:hover { transform: none; box-shadow: none; }

/* ============ 結果頁 ============ */
.h-result { animation: slideUp 0.5s ease; }
.h-verdict-card {
    position: relative;
    background: var(--card-bg);
    border: 2px solid var(--bd);
    border-radius: 20px;
    padding: 38px 28px 32px;
    text-align: center;
    margin-bottom: 22px;
    overflow: hidden;
}
.h-verdict-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 5px;
    background: linear-gradient(90deg, transparent, currentColor, transparent);
    color: var(--pri);
}
.h-verdict-card::after {
    content: '';
    position: absolute;
    top: -50%; left: 50%;
    width: 280px; height: 280px;
    transform: translateX(-50%);
    background: radial-gradient(circle, var(--pri-glow, rgba(255,69,0,0.15)), transparent 65%);
    opacity: 0.4;
    pointer-events: none;
}
.h-verdict-emoji {
    font-size: 3.8rem;
    line-height: 1;
    margin-bottom: 10px;
    position: relative;
    filter: drop-shadow(0 6px 12px rgba(0,0,0,0.12));
}
.h-verdict-title {
    font-size: 1.95rem;
    font-weight: 900;
    margin-bottom: 14px;
    letter-spacing: 0.5px;
    position: relative;
}
.h-verdict-headline {
    font-size: 1.02rem;
    line-height: 1.7;
    color: var(--txt);
    margin-bottom: 12px;
    position: relative;
}
.h-verdict-action {
    font-size: 0.92rem;
    color: var(--txt);
    opacity: 0.8;
    line-height: 1.7;
    position: relative;
    padding: 12px 14px;
    background: rgba(128,128,128,0.05);
    border-radius: 10px;
    border: 1px dashed var(--bd);
    text-align: left;
    margin: 18px auto 0;
    max-width: 540px;
}

.h-hospital-btn {
    display: inline-flex;
    align-items: center; gap: 8px;
    margin-top: 22px;
    padding: 15px 32px;
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: #fff;
    text-decoration: none;
    border-radius: 12px;
    font-size: 1.02rem;
    font-weight: bold;
    box-shadow: 0 8px 22px rgba(239,68,68,0.45);
    transition: 0.25s;
    position: relative;
    overflow: hidden;
}
.h-hospital-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(120deg, transparent, rgba(255,255,255,0.25), transparent);
    transform: translateX(-100%);
    transition: transform 0.6s;
}
.h-hospital-btn:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(239,68,68,0.55); }
.h-hospital-btn:hover::after { transform: translateX(100%); }

.h-section {
    background: var(--card-bg); border: 1px solid var(--bd);
    border-radius: 16px;
    padding: 22px;
    margin-bottom: 18px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.04);
}
.h-section-title {
    font-size: 1.05rem;
    font-weight: 800;
    color: var(--txt);
    margin: 0 0 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    letter-spacing: 0.3px;
}

.h-section-danger {
    border-color: rgba(239,68,68,0.35);
    background: linear-gradient(180deg, rgba(239,68,68,0.05), rgba(239,68,68,0.02));
}
.h-danger-list {
    padding-left: 0;
    list-style: none;
    margin: 0;
}
.h-danger-list li {
    padding: 10px 14px;
    margin-bottom: 6px;
    background: rgba(239,68,68,0.06);
    border-left: 3px solid #ef4444;
    border-radius: 6px;
    font-size: 0.92rem;
    color: var(--txt);
    line-height: 1.55;
}
.h-danger-list li:last-child { margin-bottom: 0; }

.h-section-info {
    border-color: rgba(74,222,128,0.35);
    background: linear-gradient(180deg, rgba(74,222,128,0.05), rgba(74,222,128,0.02));
}
.h-note-block + .h-note-block { margin-top: 12px; padding-top: 12px; border-top: 1px dashed rgba(74,222,128,0.3); }
.h-note-title { font-weight: 800; color: #16a34a; margin-bottom: 6px; font-size: 0.95rem; }
.h-note-body { font-size: 0.9rem; line-height: 1.6; color: var(--txt); opacity: 0.85; }

.h-section-disease { border-color: rgba(251,146,60,0.3); }
.h-disease-disclaimer {
    font-size: 0.82rem;
    color: var(--txt); opacity: 0.7;
    margin: 0 0 14px;
    padding: 10px 12px;
    background: rgba(251,146,60,0.06);
    border-left: 3px solid #fb923c;
    border-radius: 6px;
    line-height: 1.55;
}
.h-disease-card {
    padding: 14px 16px;
    background: rgba(128,128,128,0.04);
    border: 1px solid var(--bd);
    border-left: 3px solid #fb923c;
    border-radius: 10px;
    margin-bottom: 10px;
    transition: 0.2s;
}
.h-disease-card:hover { background: rgba(251,146,60,0.05); transform: translateX(2px); }
.h-disease-card:last-child { margin-bottom: 0; }
.h-disease-name {
    font-weight: 800;
    color: var(--txt);
    margin-bottom: 6px;
    font-size: 0.98rem;
    display: flex; align-items: center; gap: 8px;
}
.h-disease-name::before {
    content: '';
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #fb923c;
    box-shadow: 0 0 0 3px rgba(251,146,60,0.2);
}
.h-disease-signs { font-size: 0.85rem; color: var(--txt); opacity: 0.85; margin-bottom: 6px; line-height: 1.55; }
.h-disease-label { color: var(--pri); font-weight: 700; }
.h-disease-note {
    font-size: 0.82rem;
    color: var(--txt); opacity: 0.65;
    line-height: 1.6;
    padding-top: 6px;
    border-top: 1px dashed var(--bd);
}

.h-cat-block + .h-cat-block { margin-top: 22px; padding-top: 16px; border-top: 1px dashed var(--bd); }
.h-cat-title {
    font-size: 0.78rem;
    font-weight: 800;
    color: var(--pri);
    margin-bottom: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
}
.h-item-row {
    padding: 12px 14px;
    background: rgba(128,128,128,0.04);
    border: 1px solid var(--bd);
    border-left: 3px solid;
    border-radius: 8px;
    margin-bottom: 8px;
    transition: 0.2s;
}
.h-item-row:hover { background: rgba(128,128,128,0.08); }
.h-sev-normal-row   { border-left-color: #4ade80; }
.h-sev-watch-row    { border-left-color: #facc15; }
.h-sev-warn-row     { border-left-color: #fb923c; }
.h-sev-critical-row { border-left-color: #ef4444; }
.h-item-head { display: flex; gap: 10px; align-items: center; }
.h-item-tag { font-size: 1rem; line-height: 1; }
.h-item-q { font-size: 0.9rem; font-weight: 700; color: var(--txt); }
.h-item-ans { font-size: 0.88rem; color: var(--txt); opacity: 0.85; margin: 6px 0 0 26px; line-height: 1.5; }
.h-item-note {
    font-size: 0.78rem;
    color: var(--txt); opacity: 0.7;
    margin: 6px 0 0 26px;
    padding: 6px 10px;
    background: rgba(74,222,128,0.07);
    border-left: 2px solid #4ade80;
    border-radius: 4px;
    line-height: 1.5;
}

/* ============ 報告表（診所感） ============ */
.h-section-report {
    border-color: var(--pri);
    background: var(--card-bg);
    position: relative;
}
.h-section-report::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--pri), #ff8c42);
    border-radius: 16px 16px 0 0;
}
.h-report-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px; }
.h-copy-btn {
    display: inline-flex; align-items: center; gap: 4px;
    background: var(--pri); color: #fff; border: none;
    padding: 9px 16px; border-radius: 8px;
    font-size: 0.85rem; font-weight: 700;
    cursor: pointer; transition: 0.2s; font-family: inherit;
    box-shadow: 0 4px 12px var(--pri-glow);
}
.h-copy-btn:hover { transform: translateY(-2px); filter: brightness(1.08); }

.h-report-card {
    background: linear-gradient(180deg, rgba(255,255,255,0.5), transparent);
    background-color: var(--card-bg);
    border: 1.5px solid var(--bd);
    border-radius: 12px;
    padding: 26px 24px;
}
:global(.day-mode) .h-report-card { background-color: #fdfbf7; }
.h-report-title {
    font-size: 1.3rem;
    font-weight: 900;
    color: var(--txt);
    text-align: center;
    margin-bottom: 4px;
    letter-spacing: 1.5px;
}
.h-report-section { margin-bottom: 20px; }
.h-report-section:last-child { margin-bottom: 0; }
.h-report-section-title {
    font-size: 0.78rem;
    font-weight: 800;
    color: var(--pri);
    letter-spacing: 1.5px;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 2px solid var(--pri);
    display: inline-block;
    text-transform: uppercase;
}

.h-profile-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px 14px;
}
.h-profile-grid label {
    display: flex; flex-direction: column; gap: 3px;
    font-size: 0.78rem; color: var(--txt); opacity: 0.85;
}
.h-profile-grid input {
    padding: 6px 10px;
    background: rgba(128,128,128,0.05);
    border: 1px solid var(--bd);
    border-radius: 6px;
    font-size: 0.88rem;
    color: var(--txt);
    font-family: inherit;
}
.h-profile-grid input:focus { outline: none; border-color: var(--pri); }

.h-report-verdict {
    padding: 12px 16px;
    background: rgba(128,128,128,0.05);
    border-left: 4px solid var(--pri);
    border-radius: 8px;
    font-size: 0.92rem;
    line-height: 1.6;
    color: var(--txt);
}
.h-report-verdict strong {
    display: block;
    margin-bottom: 4px;
    font-size: 1rem;
    color: var(--pri);
}

.h-report-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.86rem; }
.h-report-table th {
    padding: 9px 12px;
    text-align: left;
    background: rgba(128,128,128,0.08);
    font-size: 0.74rem;
    opacity: 0.85;
    font-weight: 800;
    color: var(--txt);
    letter-spacing: 1px;
    text-transform: uppercase;
    border-bottom: 2px solid var(--bd);
}
.h-report-table th:first-child { border-radius: 6px 0 0 0; }
.h-report-table th:last-child { border-radius: 0 6px 0 0; }
.h-report-table td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid var(--bd);
    vertical-align: top;
    color: var(--txt);
}
.h-report-table tbody tr:hover td { background: rgba(128,128,128,0.04); }
.h-report-table tbody tr:last-child td { border-bottom: none; }
.h-sev-pill {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 0.74rem;
    font-weight: 700;
    white-space: nowrap;
    letter-spacing: 0.3px;
}

.h-report-diseases {
    padding-left: 0;
    list-style: none;
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.6;
    color: var(--txt);
}
.h-report-diseases li {
    padding: 8px 12px 8px 28px;
    margin-bottom: 6px;
    background: rgba(251,146,60,0.06);
    border-radius: 6px;
    position: relative;
}
.h-report-diseases li::before {
    content: '';
    position: absolute;
    left: 12px; top: 50%; transform: translateY(-50%);
    width: 6px; height: 6px; border-radius: 50%;
    background: #fb923c;
    box-shadow: 0 0 0 3px rgba(251,146,60,0.2);
}

/* ============ 下一題按鈕 ============ */
.h-q-next-btn {
    margin-top: 14px;
    width: 100%;
    padding: 12px;
    background: var(--pri); color: #fff; border: none;
    border-radius: 10px; font-weight: bold; font-size: 0.95rem;
    cursor: pointer; transition: 0.2s;
    box-shadow: 0 4px 12px var(--pri-glow);
    font-family: inherit;
}
.h-q-next-btn:hover { transform: translateY(-2px); filter: brightness(1.08); }

/* ============ 報告區 (#6 #7 簡化版) ============ */
.h-report-date {
    text-align: center;
    font-size: 0.95rem;
    color: var(--txt);
    opacity: 0.75;
    margin-bottom: 6px;
}
.h-report-disclaimer {
    text-align: center;
    font-size: 0.8rem;
    color: var(--txt);
    opacity: 0.6;
    margin-bottom: 18px;
    padding-bottom: 12px;
    border-bottom: 1px dashed var(--bd);
}

/* ============ RWD ============ */
@media (max-width: 768px) {
    .health-container { padding: 0 10px 14px; }

    /* 入口頁沿用桌機形式，僅改成單欄 */
    .h-entry { display: block; height: auto; box-sizing: border-box; }
    .h-entry .page-title {
        position: static;
        background: transparent;
        margin: 0 0 4px;
        padding: 0;
        border-bottom: none;
        text-align: center;
        font-size: 1.15rem;
    }
    .h-entry-sub {
        position: static;
        background: transparent;
        padding: 0;
        margin: 0 0 8px;
        font-size: 0.76rem;
        line-height: 1.4;
        border-bottom: none;
    }
    .h-card-grid {
        grid-template-columns: 1fr;
        gap: 8px;
        padding: 0;
        margin: 0 0 8px;
    }
    .h-entry-card {
        padding: 10px 10px 9px;
        min-height: auto;
        justify-content: flex-start;
        margin-bottom: 0;
        gap: 5px;
        border-radius: 12px;
    }
    .h-entry-corner { margin-bottom: 0; }
    .h-entry-num { font-size: 0.96rem; }
    .h-entry-tag { font-size: 0.52rem; padding: 2px 6px; letter-spacing: 1px; }
    .h-entry-title { font-size: 0.9rem; line-height: 1.15; }
    .h-entry-quote {
        font-size: 0.72rem;
        line-height: 1.3;
        padding: 4px 0 5px;
        border-bottom-width: 1px;
    }
    .h-entry-quote::before {
        font-size: 1rem;
        top: -1px;
    }
    .h-entry-meta { font-size: 0.62rem; gap: 3px; }
    .h-entry-meta-num { font-size: 0.82rem; }
    .h-entry-desc { font-size: 0.66rem; line-height: 1.32; }
    .h-entry-cta { font-size: 0.68rem; margin-top: 0; gap: 4px; }
    .h-entry-foot {
        padding: 7px 8px;
        margin: 0 0 8px;
        font-size: 0.64rem;
        line-height: 1.35;
        border-radius: 10px;
    }

    /* 問卷頁 sticky 標題 + 卡片填滿視窗 + scroll-snap */
    .health-container--quiz {
        padding: 0 0 env(safe-area-inset-bottom, 0px);
    }
    .h-quiz { display: flex; flex-direction: column; box-sizing: border-box; }
    .h-quiz-head {
        background: var(--card-bg);
        margin: 0; padding: 12px 16px 8px;
        flex-shrink: 0;
    }
    .health-container--quiz .h-quiz-head {
        position: fixed;
        top: var(--health-sticky-top);
        left: 50%;
        transform: translate(-50%, var(--health-nav-shift));
        width: 100%;
        z-index: 1011;
        min-height: var(--health-quiz-head-height);
        padding: 0 16px;
        box-sizing: border-box;
    }
    .h-quiz-title { font-size: 1.05rem; }
    .h-progress-area {
        position: sticky;
        top: var(--health-sticky-top);
        z-index: 15;
        background: var(--card-bg);
        padding: 10px 16px 12px;
        margin: 0;
        border-bottom: 1px solid var(--bd);
        flex-shrink: 0;
    }
    .health-container--quiz .h-progress-area {
        position: fixed;
        top: calc(var(--health-sticky-top) + var(--health-quiz-head-height));
        left: 50%;
        transform: translate(-50%, var(--health-nav-shift));
        width: 100%;
        padding: 0 16px 10px;
        box-sizing: border-box;
    }
    .h-q-list {
        padding: 12px 12px 14px;
        gap: 14px;
        scroll-snap-type: none;
        scroll-padding-top: 0;
    }
    .health-container--quiz .h-q-list {
        padding-top: calc(var(--health-quiz-head-height) + var(--health-progress-height) + 12px);
    }
    .h-q-card {
        padding: 16px 14px;
        scroll-snap-align: none;
        min-height: auto;
        display: block;
        max-height: none;
    }
    .h-q-title { font-size: 1rem; }
    .h-q-opt { padding: 10px 12px; }
    .h-q-opt-label { font-size: 0.88rem; }
    .h-quiz-foot {
        position: sticky; bottom: 0;
        background: var(--card-bg);
        padding: 12px 16px;
        border-top: 1px solid var(--bd);
        margin: 0;
        flex-shrink: 0;
        z-index: 8;
    }

    /* 結果頁 */
    .h-result { padding: 14px; }
    .h-verdict-card { padding: 22px 18px; }
    .h-verdict-emoji { font-size: 2.8rem; }
    .h-verdict-title { font-size: 1.5rem; }
    .h-report-table { font-size: 0.78rem; }
    .h-report-table th, .h-report-table td { padding: 6px 8px; }
}

@keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
</style>
