<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useHead } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { ZYG, CALC_TYPES, GENE_DEFINITIONS } from '~/utils/genes.js'
import { calculateGenetics, getProbFraction } from '~/utils/calcUtils.js'

const store = useMainStore()

useHead({
    title: '守宮基因計算機',
    meta:[
        { name: 'description', content: '專業的豹紋守宮與肥尾守宮基因計算工具。支援孟德爾遺傳法則、多基因 (Polygenic) 選育模擬，以及致死基因 (Lethal) 檢測。' },
        { name: 'keywords', content: '守宮基因計算機, 爬蟲遺傳學, 豹紋守宮配對, 肥尾守宮基因, Morph Calculator' },
        { property: 'og:title', content: '守宮基因計算機 | Gencko Studio' },
        { property: 'og:description', content: '線上模擬守宮配對結果，預測子代品系機率。' },
        { property: 'og:image', content: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E5%AE%98%E7%B6%B2%E8%83%8C%E6%99%AF.png' }
    ],
    script:[
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebApplication",
                "name": "Gencko Morph Calculator",
                "url": "https://www.genckobreeding.com/calculator",
                "applicationCategory": "UtilityApplication",
                "operatingSystem": "All",
                "description": "A professional genetic calculator for Leopard Geckos and African Fat-Tailed Geckos.",
                "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "TWD"
                },
                "featureList":[
                    "Mendelian inheritance calculation",
                    "Polygenic trait simulation",
                    "Lethal gene detection"
                ]
            })
        }
    ]
})

const calcSp = ref('豹紋守宮')
const calcMale = ref([ ])
const calcFemale = ref([ ])
const calcResult = ref(null)
const calcModalOpen = ref(false)
const calcActiveInfo = ref(null)
const calcActiveSelector = ref(null)
const calcExpandType = ref(null)
const calcExpandGroup = ref(null)

const calcCurrentDefs = computed(() => GENE_DEFINITIONS[calcSp.value] || [ ])

const calcGroupedGenes = computed(() => {
    const groups = {}
    calcCurrentDefs.value.forEach(g => {
        if (!groups[g.type]) groups[g.type] = [ ]
        groups[g.type].push(g)
    })
    return groups
})

const calcTypeOrder = computed(() =>[ CALC_TYPES.DOM, CALC_TYPES.REC, CALC_TYPES.CODOM, CALC_TYPES.POLY, CALC_TYPES.COMBO, CALC_TYPES.BLOOD ])
const calcComboGroups = computed(() =>[ '川普白化', '貝爾白化', '雨水白化', '無白化' ])

const handleGlobalClick = (e) => {
    if (calcActiveSelector.value) {
        if (!e.target.closest('.calc-dropdown-container') && 
            !e.target.closest('.calc-mobile-trigger') &&
            !e.target.closest('.calc-dropdown-menu')) {
            calcActiveSelector.value = null
            calcExpandType.value = null
            calcExpandGroup.value = null
        }
    }
}

onMounted(() => {
    document.addEventListener('click', handleGlobalClick)
})

onBeforeUnmount(() => {
    document.removeEventListener('click', handleGlobalClick)
})

const calcRun = () => {
    if (calcMale.value.length === 0 && calcFemale.value.length === 0) {
        calcResult.value = null
        return
    }
    calcResult.value = calculateGenetics(
        calcSp.value, 
        JSON.parse(JSON.stringify(calcMale.value)), 
        JSON.parse(JSON.stringify(calcFemale.value)), 
        calcCurrentDefs.value
    )
}

watch(() => calcMale.value, calcRun, { deep: true })
watch(() => calcFemale.value, calcRun, { deep: true })
watch(calcSp, () => {
    calcMale.value = [ ]
    calcFemale.value = [ ]
    calcResult.value = null
    calcActiveSelector.value = null
})

const calcToggleSelector = (sex) => {
    if (calcActiveSelector.value === sex) {
        calcActiveSelector.value = null
    } else {
        calcActiveSelector.value = sex
        calcExpandType.value = null
        calcExpandGroup.value = null
    }
}

const calcToggleType = (type) => {
    calcExpandType.value = (calcExpandType.value === type) ? null : type
    calcExpandGroup.value = null
}

const calcToggleComboGroup = (group) => {
    calcExpandGroup.value = (calcExpandGroup.value === group) ? null : group
}

const calcIsGeneDisabled = (geneId, sex) => {
    const list = sex === 'Male' ? calcMale.value : calcFemale.value
    return list.some(g => g.geneId === geneId)
}

const calcAddGene = (geneId, sex) => {
    const list = sex === 'Male' ? calcMale.value : calcFemale.value
    const def = calcCurrentDefs.value.find(d => d.id === geneId)
    let zyg = ZYG.VIS
    
    if (def.type === CALC_TYPES.REC) zyg = ZYG.VIS
    if (def.type === CALC_TYPES.CODOM) zyg = ZYG.SGL
    
    list.push({ geneId, zygosity: zyg })
    calcActiveSelector.value = null
    calcExpandType.value = null
    calcRun()
}

const calcRemoveGene = (index, sex) => {
    const list = sex === 'Male' ? calcMale.value : calcFemale.value
    list.splice(index, 1)
    calcRun()
}

const calcUpdateZygosity = (e, index, sex) => {
    const list = sex === 'Male' ? calcMale.value : calcFemale.value
    list[index].zygosity = e.target.value
    calcRun()
}

const calcToggleHet = (e, index, sex) => {
    const list = sex === 'Male' ? calcMale.value : calcFemale.value
    list[index].zygosity = e.target.checked ? ZYG.HET : ZYG.VIS
    calcRun()
}

const formatResultText = (text) => {
    if (!text) return ''
    const parts = text.split(' (')
    const visual = parts[0]
    let extra = parts[1] ? '(' + parts[1] : ''

    let html = `<span style="font-weight:900; color:var(--txt); display:block; margin-bottom:2px;">${visual}</span>`
    if (extra) {
        html += `<span style="font-size:0.85rem; color:#888; display:block; line-height:1.3;">${extra}</span>`
    }
    return html
}

const formatWarningText = (text) => {
    if (!text) return ''
    return text.replace(/Lethal/gi, '致死').replace(/Super/gi, '超級')
}
</script>

<template>
    <div class="calc-container">
        
        <div class="calc-header">
            <div class="seo-hint">Gencko 整理製作，歡迎分享給你的爬友</div>
            <div class="calc-sub-desc">非100%血系請統稱前綴(如橘化)。</div>
            
            <div class="tabs" style="margin: 20px 0;">
                <div class="tab" :class="{active: calcSp === '豹紋守宮'}" @click="calcSp = '豹紋守宮'">豹紋守宮</div>
                <div class="tab" :class="{active: calcSp === '肥尾守宮'}" @click="calcSp = '肥尾守宮'">肥尾守宮</div>
            </div>

            <div class="calc-helper-btns">
                <div class="calc-help-btn" @click="calcActiveInfo = 'types'; calcModalOpen = true">🎓 基因觀念</div>
                <div class="calc-help-btn" @click="calcActiveInfo = 'poly'; calcModalOpen = true">⚡ 選育介紹</div>
            </div>
        </div>

        <div class="calc-parent-grid">
            <!-- Male Card -->
            <div class="calc-parent-card" :style="{ zIndex: calcActiveSelector === 'Male' ? 101 : 1 }">
                <div class="calc-p-header calc-sex-m calc-mobile-trigger" @click.stop="calcToggleSelector('Male')">
                    <div class="calc-sex-icon">♂</div>
                    <div class="calc-p-title"><span>親代設定</span><h3>公</h3></div>
                </div>
                
                <div class="calc-p-body">
                    <div class="calc-dropdown-container">
                        <div class="calc-add-btn" :class="{open: calcActiveSelector === 'Male'}" @click.stop="calcToggleSelector('Male')">
                            <span>+ 新增基因</span><span>▼</span>
                        </div>
                        
                        <Transition name="dropdown-anim">
                            <div v-if="calcActiveSelector === 'Male'" class="calc-dropdown-menu" @click.stop>
                                <div class="mobile-close-hint">
                                    <span class="calc-sex-icon" style="width:28px; height:28px; font-size:0.9rem; background:rgba(33,150,243,0.1); color:#2196F3;">♂</span>
                                    <span style="font-size:0.9rem;">選擇基因</span>
                                    <span @click="calcActiveSelector = null" class="mobile-close-x">✕</span>
                                </div>

                                <div v-for="type in calcTypeOrder" :key="type">
                                    <div v-if="calcGroupedGenes[type]" class="calc-dd-group-btn" :class="{active: calcExpandType === type}" @click="calcToggleType(type)">
                                        {{ type }} <span>></span>
                                    </div>
                                    
                                    <Transition name="slide-anim">
                                        <div v-if="calcExpandType === type" class="calc-dd-sub">
                                            <template v-if="type === '品系'">
                                                <div v-for="group in calcComboGroups" :key="group">
                                                    <div class="calc-dd-combo-group" @click.stop="calcToggleComboGroup(group)">📁 {{ group }}</div>
                                                    
                                                    <Transition name="slide-anim">
                                                        <div v-if="calcExpandGroup === group">
                                                            <div v-for="g in calcGroupedGenes[type].filter(x => x.group === group && x.id !== 'normal' && x.id !== 'aft_normal')" 
                                                                class="calc-dd-item" 
                                                                :class="{disabled: calcIsGeneDisabled(g.id, 'Male')}"
                                                                @click.stop="!calcIsGeneDisabled(g.id, 'Male') && calcAddGene(g.id, 'Male')">
                                                                {{ g.name }} <span v-if="calcIsGeneDisabled(g.id, 'Male')" style="color:var(--pri)">✓</span>
                                                            </div>
                                                        </div>
                                                    </Transition>
                                                </div>
                                            </template>
                                            <template v-else>
                                                <div v-for="g in calcGroupedGenes[type].filter(x => x.id !== 'normal' && x.id !== 'aft_normal')" 
                                                    class="calc-dd-item"
                                                    :class="{disabled: calcIsGeneDisabled(g.id, 'Male')}"
                                                    @click.stop="!calcIsGeneDisabled(g.id, 'Male') && calcAddGene(g.id, 'Male')">
                                                    {{ g.name }} <span v-if="calcIsGeneDisabled(g.id, 'Male')" style="color:var(--pri)">✓</span>
                                                </div>
                                            </template>
                                        </div>
                                    </Transition>
                                </div>
                            </div>
                        </Transition>
                    </div>

                    <div class="calc-selected-list">
                        <div v-if="calcMale.length === 0" style="text-align:center; color:var(--txt); opacity:0.5; font-size:0.8rem; padding:10px;">尚未選擇基因</div>
                        <div v-else class="calc-gene-item" v-for="(g, idx) in calcMale" :key="idx">
                            <div class="calc-gene-row">
                                <div style="width:100%; overflow:hidden;">
                                    <div class="calc-gene-name">{{ calcCurrentDefs.find(d => d.id === g.geneId)?.name }}</div>
                                    <div class="calc-gene-type">{{ calcCurrentDefs.find(d => d.id === g.geneId)?.type }}</div>
                                </div>
                                <button class="calc-btn-remove" @click="calcRemoveGene(idx, 'Male')">✕</button>
                            </div>
                            
                            <div v-if="calcCurrentDefs.find(d => d.id === g.geneId)?.type === '隱性'">
                                <label class="calc-het-label">
                                    <input type="checkbox" class="calc-het-check" :checked="g.zygosity === 'Het'" @change="calcToggleHet($event, idx, 'Male')">
                                    Het (隱性帶基因)
                                </label>
                            </div>
                            
                            <div v-else-if="calcCurrentDefs.find(d => d.id === g.geneId)?.type === '共顯性'">
                                <select class="calc-zyg-select" :value="g.zygosity" @change="calcUpdateZygosity($event, idx, 'Male')">
                                    <option value="Single">單基因 (Single)</option>
                                    <option value="Super">超級 (Super)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Female Card -->
            <div class="calc-parent-card" :style="{ zIndex: calcActiveSelector === 'Female' ? 101 : 1 }">
                <div class="calc-p-header calc-sex-f calc-mobile-trigger" @click.stop="calcToggleSelector('Female')">
                    <div class="calc-sex-icon">♀</div>
                    <div class="calc-p-title"><span>親代設定</span><h3>母</h3></div>
                </div>
                
                <div class="calc-p-body">
                    <div class="calc-dropdown-container">
                        <div class="calc-add-btn" :class="{open: calcActiveSelector === 'Female'}" @click.stop="calcToggleSelector('Female')">
                            <span>+ 新增基因</span><span>▼</span>
                        </div>
                        
                        <Transition name="dropdown-anim">
                            <div v-if="calcActiveSelector === 'Female'" class="calc-dropdown-menu" @click.stop>
                                <div class="mobile-close-hint">
                                    <span class="calc-sex-icon" style="width:28px; height:28px; font-size:0.9rem; background:rgba(255, 64, 129, 0.1); color:#FF4081;">♀</span>
                                    <span style="font-size:0.9rem;">選擇基因</span>
                                    <span @click="calcActiveSelector = null" class="mobile-close-x">✕</span>
                                </div>

                                <div v-for="type in calcTypeOrder" :key="type">
                                    <div v-if="calcGroupedGenes[type]" class="calc-dd-group-btn" :class="{active: calcExpandType === type}" @click="calcToggleType(type)">
                                        {{ type }} <span>></span>
                                    </div>
                                    
                                    <Transition name="slide-anim">
                                        <div v-if="calcExpandType === type" class="calc-dd-sub">
                                            <template v-if="type === '品系'">
                                                <div v-for="group in calcComboGroups" :key="group">
                                                    <div class="calc-dd-combo-group" @click.stop="calcToggleComboGroup(group)">📁 {{ group }}</div>
                                                    
                                                    <Transition name="slide-anim">
                                                        <div v-if="calcExpandGroup === group">
                                                            <div v-for="g in calcGroupedGenes[type].filter(x => x.group === group && x.id !== 'normal' && x.id !== 'aft_normal')" 
                                                                class="calc-dd-item" 
                                                                :class="{disabled: calcIsGeneDisabled(g.id, 'Female')}"
                                                                @click.stop="!calcIsGeneDisabled(g.id, 'Female') && calcAddGene(g.id, 'Female')">
                                                                {{ g.name }} <span v-if="calcIsGeneDisabled(g.id, 'Female')" style="color:var(--pri)">✓</span>
                                                            </div>
                                                        </div>
                                                    </Transition>
                                                </div>
                                            </template>
                                            <template v-else>
                                                <div v-for="g in calcGroupedGenes[type].filter(x => x.id !== 'normal' && x.id !== 'aft_normal')" 
                                                    class="calc-dd-item"
                                                    :class="{disabled: calcIsGeneDisabled(g.id, 'Female')}"
                                                    @click.stop="!calcIsGeneDisabled(g.id, 'Female') && calcAddGene(g.id, 'Female')">
                                                    {{ g.name }} <span v-if="calcIsGeneDisabled(g.id, 'Female')" style="color:var(--pri)">✓</span>
                                                </div>
                                            </template>
                                        </div>
                                    </Transition>
                                </div>
                            </div>
                        </Transition>
                    </div>

                    <div class="calc-selected-list">
                        <div v-if="calcFemale.length === 0" style="text-align:center; color:var(--txt); opacity:0.5; font-size:0.8rem; padding:10px;">尚未選擇基因</div>
                        <div v-else class="calc-gene-item" v-for="(g, idx) in calcFemale" :key="idx">
                            <div class="calc-gene-row">
                                <div style="width:100%; overflow:hidden;">
                                    <div class="calc-gene-name">{{ calcCurrentDefs.find(d => d.id === g.geneId)?.name }}</div>
                                    <div class="calc-gene-type">{{ calcCurrentDefs.find(d => d.id === g.geneId)?.type }}</div>
                                </div>
                                <button class="calc-btn-remove" @click="calcRemoveGene(idx, 'Female')">✕</button>
                            </div>
                            
                            <div v-if="calcCurrentDefs.find(d => d.id === g.geneId)?.type === '隱性'">
                                <label class="calc-het-label">
                                    <input type="checkbox" class="calc-het-check" :checked="g.zygosity === 'Het'" @change="calcToggleHet($event, idx, 'Female')">
                                    Het (隱性帶基因)
                                </label>
                            </div>
                            
                            <div v-else-if="calcCurrentDefs.find(d => d.id === g.geneId)?.type === '共顯性'">
                                <select class="calc-zyg-select" :value="g.zygosity" @change="calcUpdateZygosity($event, idx, 'Female')">
                                    <option value="Single">單基因 (Single)</option>
                                    <option value="Super">超級 (Super)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Results -->
        <div v-if="calcResult" class="calc-result-area">
            <div class="calc-res-header">
                <h2 class="calc-res-title">預測結果</h2>
                <div class="calc-res-count">組合數: {{ calcResult.totalCombos }}</div>
            </div>

            <!-- 強制鎖定文字與背景顏色的極致對比度 -->
            <div v-if="calcResult.warning" class="calc-warn">
                <div style="font-size:1.8rem; line-height:1;">⚠️</div>
                <div style="white-space:pre-line">{{ formatWarningText(calcResult.warning) }}</div>
            </div>

            <div v-if="calcResult.notices && calcResult.notices.length" class="calc-notice">
                <div style="font-size:1.8rem; line-height:1;">ℹ️</div>
                <div>
                    <div v-for="n in calcResult.notices" :key="n">• {{ n }}</div>
                </div>
            </div>

            <div class="calc-res-card" v-for="(o, idx) in calcResult.outcomes" :key="idx" :class="{lethal: o.description && o.description.includes('致死')}">
                <div class="calc-prob-box">
                    <div class="calc-prob-val">{{ Math.round(o.prob * 100) }}<small style="font-size:0.8rem">%</small></div>
                    <div class="calc-prob-sub" style="font-size:0.75rem;color:#888;font-family:monospace;margin-top:2px;" v-if="o.prob < 0.99">
                        {{ getProbFraction(o.prob) }}
                    </div>
                </div>
                <div class="calc-res-info" style="display:flex; align-items:center;">
                     <div class="calc-res-name" style="margin:0; line-height:1.4;" v-html="formatResultText(o.fullLabel)"></div>
                </div>
            </div>
        </div>

        <!-- Info Modal Overlay -->
        <div v-if="calcModalOpen" class="lightbox-overlay" @click="calcModalOpen = false" style="justify-content:center; padding:20px;">
            <div class="page-text-box" style="width:100%; max-width:600px; max-height:80vh; overflow-y:auto; position:relative;" @click.stop>
                <div class="lightbox-close" @click="calcModalOpen = false" style="top:10px; right:10px; width:40px; height:40px; font-size:1.5rem;">✕</div>
                <h2 style="color:var(--pri); margin-top:0;">
                    {{ calcActiveInfo === 'types' ? '基因觀念' : '多遺傳 (選育)' }}
                </h2>
                
                <div v-if="calcActiveInfo === 'types'">
                    <p style="color:#ff5252; font-weight:bold; border-left:4px solid #ff5252; padding-left:10px;">三大白化 (川普/貝爾/雨水) 為獨立隱性基因，不可互配。</p>
                    <h4 style="color:var(--txt); border-bottom:1px solid var(--bd); padding-bottom:5px; margin-top:20px;">顯性 (Dominant)</h4>
                    <p style="font-size:0.95rem; color:var(--txt); opacity:0.7;">單一基因即可表現。如：謎、白黃。</p>
                    <h4 style="color:var(--txt); border-bottom:1px solid var(--bd); padding-bottom:5px; margin-top:20px;">共顯性 (Co-Dominant)</h4>
                    <p style="font-size:0.95rem; color:var(--txt); opacity:0.7;">單基因 (Single) 與 雙基因 (Super) 表現不同。如：馬克雪花 -> 超級雪花。</p>
                    <h4 style="color:var(--txt); border-bottom:1px solid var(--bd); padding-bottom:5px; margin-top:20px;">隱性 (Recessive)</h4>
                    <p style="font-size:0.95rem; color:var(--txt); opacity:0.7;">需父母雙方都帶有 (Het 或 Visual) 才會表現。如：日蝕、暴風雪。</p>
                </div>

                <div v-if="calcActiveInfo === 'poly'">
                    <p style="border-left:4px solid var(--pri); padding-left:10px;">多遺傳基因 (Polygenic) 不是由單一開關控制，而是透過代代選育堆疊特徵。</p>
                    <div style="margin-top:20px; background:rgba(255, 69, 0, 0.05); border: 1px solid rgba(255, 69, 0, 0.1); padding:10px; border-radius:8px;">
                        <div style="color:var(--pri); font-weight:bold;">橘化 (Tangerine)</div>
                        <p style="font-size:0.9rem; margin:5px 0 0 0; color:var(--txt); opacity:0.8;">包含蜜橘、電橘、血橘等血系，本質皆為橘化選育。</p>
                    </div>
                    <div style="margin-top:10px; background:rgba(255, 69, 0, 0.05); border: 1px solid rgba(255, 69, 0, 0.1); padding:10px; border-radius:8px;">
                        <div style="color:var(--pri); font-weight:bold;">土匪 (Bandit)</div>
                        <p style="font-size:0.9rem; margin:5px 0 0 0; color:var(--txt); opacity:0.8;">由粗直線選育而來，特徵為鼻吻部橫帶與背部粗紋。</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.calc-container { max-width: 1100px; margin: 0 auto; position: relative; z-index: 2; padding-top: 15px; }

.calc-header { text-align: center; margin-bottom: 20px; }
.calc-top-desc { text-align: center; color: var(--pri); font-weight: 700; margin-bottom: 4px; font-size: 0.95rem; letter-spacing: 1px; }
.calc-sub-desc { text-align: center; color: #888; font-size: 0.85rem; margin-bottom: 15px; }
.calc-helper-btns { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; margin-bottom: 15px; }
.calc-help-btn { display: flex; align-items: center; gap: 4px; padding: 5px 12px; border-radius: 20px; border: 1px dashed var(--bd); font-size: 0.85rem; color: #aaa; cursor: pointer; transition: 0.2s; background: rgba(255,255,255,0.02); }
.calc-help-btn:hover { border-color: var(--pri); color: var(--txt); background: rgba(255, 69, 0, 0.05); }

.calc-parent-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; }
.calc-parent-card { background: var(--card-bg); border: 1px solid var(--bd); border-radius: 10px; display: flex; flex-direction: column; overflow: visible; border-top: 3px solid var(--pri); transition: 0.3s; box-shadow: 0 5px 20px rgba(0,0,0,0.2); }
.calc-parent-card:hover { transform: translateY(-3px); }

.calc-p-header { padding: 15px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--bd); }
.calc-sex-icon { width: 35px; height: 35px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; background: rgba(255,255,255,0.05); }
.calc-sex-m .calc-sex-icon { color: #2196F3; background: rgba(33, 150, 243, 0.1); }
.calc-sex-f .calc-sex-icon { color: #FF4081; background: rgba(255, 64, 129, 0.1); }
.calc-p-title h3 { margin: 0; font-size: 1.1rem; font-weight: 900; color: var(--txt); }
.calc-p-title span { font-size: 0.65rem; font-weight: bold; color: #666; letter-spacing: 1px; text-transform: uppercase; }

.calc-p-body { padding: 12px; flex: 1; display: flex; flex-direction: column; gap: 12px; }

.calc-selected-list { flex: 1; min-height: 120px; background: transparent; border: 1px dashed var(--bd); border-radius: 8px; padding: 8px; display: flex; flex-direction: column; gap: 6px; }

.calc-gene-item { background: var(--card-bg); border: 1px solid var(--bd); border-radius: 6px; padding: 8px; display: flex; flex-direction: column; gap: 6px; transition: 0.2s; position: relative; }
.calc-gene-item:hover { border-color: var(--pri); }
.calc-gene-row { display: flex; justify-content: space-between; align-items: flex-start; }
.calc-gene-name { font-weight: bold; font-size: 0.9rem; color: var(--txt); line-height: 1.2; }
.calc-gene-type { font-size: 0.65rem; color: #666; text-transform: uppercase; margin-top: 2px; }
.calc-btn-remove { color: #666; cursor: pointer; padding: 2px; transition: 0.2s; background: transparent; border: none; font-size: 1rem; line-height: 1; }
.calc-btn-remove:hover { color: var(--pri); transform: scale(1.1); }

.calc-zyg-select { width: 100%; background: var(--card-bg); color: var(--txt); border: 1px solid var(--bd); padding: 3px 6px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; outline: none; }
.calc-zyg-select:focus { border-color: var(--pri); }
.calc-het-label { display: flex; align-items: center; gap: 5px; font-size: 0.85rem; color: var(--txt); opacity: 0.8; cursor: pointer; margin-top: 4px; }
.calc-het-check { accent-color: var(--pri); width: 14px; height: 14px; cursor: pointer; }

.calc-dropdown-container { position: relative; z-index: 20; width: 100%; max-width: 100%; }
.calc-add-btn { width: 100%; max-width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid var(--bd); border-radius: 8px; background: var(--card-bg); color: var(--txt); font-weight: bold; font-size: 0.85rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: 0.2s; white-space: nowrap; overflow: hidden; opacity: 0.8; }
.calc-add-btn span:first-child { overflow: hidden; text-overflow: ellipsis; padding-right: 5px; }
@media (hover: hover) {
    .calc-add-btn:hover { border-color: var(--pri); color: var(--pri); opacity: 1; box-shadow: 0 0 10px rgba(255,69,0,0.1); }
}
.calc-add-btn.open { border-color: var(--pri); color: var(--pri); opacity: 1; box-shadow: 0 0 10px rgba(255,69,0,0.1); }
.calc-dropdown-menu { position: absolute; top: 100%; left: 0; width: 100%; box-sizing: border-box; background: var(--card-bg); border: 1px solid var(--bd); border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); z-index: 100; max-height: 250px; overflow-y: auto; overflow-x: hidden; margin-top: 5px; }
.calc-dd-group-btn { width: 100%; padding: 10px 12px; text-align: left; background: transparent; border: none; border-bottom: 1px solid var(--bd); color: var(--txt); opacity: 0.9; font-weight: bold; font-size: 0.85rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; transition: 0.2s; }
@media (hover: hover) {
    .calc-dd-group-btn:hover { background: rgba(255, 69, 0, 0.05); color: var(--pri); opacity: 1; }
}
.calc-dd-group-btn.active { background: rgba(255, 69, 0, 0.05); color: var(--pri); opacity: 1; }

.calc-dd-sub { background: rgba(255, 69, 0, 0.02); border-bottom: 1px solid var(--bd); width: 100%; box-sizing: border-box; }
.calc-dd-item { width: 100%; padding: 8px 8px 8px 20px; text-align: left; background: transparent; border: none; color: var(--txt); opacity: 0.7; font-size: 0.8rem; cursor: pointer; border-left: 3px solid transparent; display: flex; justify-content: space-between; box-sizing: border-box; white-space: normal; line-height: 1.4; word-break: break-word; transition: 0.2s; }
@media (hover: hover) {
    .calc-dd-item:hover { color: var(--pri); opacity: 1; border-left-color: var(--pri); background: rgba(255, 69, 0, 0.05); }
}
.calc-dd-item.disabled { opacity: 0.3; cursor: not-allowed; }
.calc-dd-combo-group { padding: 8px 15px; font-size: 0.8rem; font-weight: bold; color: var(--txt); opacity: 0.7; display: flex; align-items: center; gap: 5px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); width: 100%; box-sizing: border-box; transition: 0.2s; }
.calc-dd-combo-group:hover { color: var(--pri); opacity: 1; background: rgba(255, 69, 0, 0.05); }

.calc-tag.super { background: rgba(156, 39, 176, 0.1); color: #ce93d8; border-color: rgba(156, 39, 176, 0.4); font-weight: bold; }
:global(body.day-mode) .calc-tag.super { background: #f3e5f5; color: #8e24aa; border-color: #ce93d8; }
.calc-tag.het { font-size: 0.75rem; }

.calc-result-area { margin-top: 30px; animation: fadeUp 0.5s ease; padding-bottom: 40px; }
.calc-res-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid var(--bd); padding-bottom: 8px; margin-bottom: 15px; }
.calc-res-title { font-size: 1.6rem; font-weight: 900; display: flex; align-items: center; gap: 8px; }
.calc-res-count { font-size: 0.85rem; padding: 3px 8px; border: 1px solid var(--bd); border-radius: 4px; color: #888; }

/* [修改點] 極致加深警告與提示區塊的對比度，強制覆寫避免被全域吃掉 */
.calc-warn, .calc-notice {
    padding: 15px; 
    border-radius: 6px; 
    margin-bottom: 15px; 
    border-left: 5px solid; 
    display: flex; 
    gap: 12px;
    align-items: center;
    font-weight: bold;
    line-height: 1.5;
}

.calc-warn { 
    background: rgba(244, 67, 54, 0.2) !important; 
    border-color: #f44336 !important; 
    color: #ffffff !important; 
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}

.calc-notice { 
    background: rgba(255, 193, 7, 0.2) !important; 
    border-color: #ffc107 !important; 
    color: #ffffff !important; 
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}

.calc-res-card { background: var(--card-bg); border: 1px solid var(--bd); border-top: 3px solid var(--pri); border-radius: 8px; margin-bottom: 12px; display: flex; overflow: hidden; transition: 0.3s; }
.calc-res-card:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.3); border-color: var(--pri); }
.calc-res-card.lethal { border-top-color: #f44336; background: rgba(244,67,54,0.05); }
.calc-prob-box { width: 90px; background: rgba(255,69,0,0.05); display: flex; flex-direction: column; align-items: center; justify-content: center; border-right: 1px solid var(--bd); flex-shrink: 0; padding: 8px; }
.calc-prob-val { font-size: 1.4rem; font-weight: 900; color: var(--pri); line-height: 1; }
.calc-res-card.lethal .calc-prob-val { color: #f44336; }
.calc-res-info { padding: 12px; flex: 1; }
.calc-res-name { font-size: 1rem; font-weight: bold; margin-bottom: 6px; color: var(--txt); word-break: break-word; }

/* Day Mode Overrides */
:global(body.day-mode) .calc-help-btn { background: #fff; border-color: #ccc; }
:global(body.day-mode) .calc-parent-card { background: #fff; border-color: #ddd; box-shadow: 0 5px 20px rgba(0,0,0,0.05); }
:global(body.day-mode) .calc-sex-icon { background: rgba(0,0,0,0.03); }
:global(body.day-mode) .calc-p-title h3 { color: #111; }
:global(body.day-mode) .calc-selected-list { background: transparent; border-color: #ccc; }
:global(body.day-mode) .calc-add-btn { background: #fff; border-color: #ccc; }
:global(body.day-mode) .calc-dropdown-menu { background: #fff; border-color: #ddd; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }

:global(body.day-mode) .calc-dd-group-btn:hover { background: rgba(255, 69, 0, 0.05); color: var(--pri); }
:global(body.day-mode) .calc-dd-group-btn.active { background: rgba(255, 69, 0, 0.05); color: var(--pri); }
:global(body.day-mode) .calc-dd-sub { background: rgba(255, 69, 0, 0.02); border-color: #eee; }
:global(body.day-mode) .calc-dd-item:hover { background: rgba(255, 69, 0, 0.05); color: var(--pri); }
:global(body.day-mode) .calc-dd-combo-group:hover { background: rgba(255, 69, 0, 0.05); color: var(--pri); }

:global(body.day-mode) .calc-gene-item { background: #fff; border-color: #ccc; }
:global(body.day-mode) .calc-gene-name { color: #222; }
:global(body.day-mode) .calc-zyg-select { background: #fff; border-color: #ccc; color: #333; }
:global(body.day-mode) .calc-res-card { background: #fff; border-color: #ddd; }
:global(body.day-mode) .calc-prob-box { background: rgba(255, 69, 0, 0.02); border-right-color: #eee; }
:global(body.day-mode) .calc-res-name { color: #222; }
:global(body.day-mode) .calc-res-name span { color: #666 !important; }

/* Day Mode Overrides for Warnings */
:global(body.day-mode) .calc-warn { 
    background: #ffebee !important; 
    border-color: #d32f2f !important; 
    color: #000 !important; 
    text-shadow: none;
}

:global(body.day-mode) .calc-notice { 
    background: #fff8e1 !important; 
    border-color: #f57f17 !important; 
    color: #000 !important; 
    text-shadow: none;
}

@media (max-width: 768px) {
    .calc-container { padding-top: 0 !important; margin-top: -10px; }
    .calc-header { margin-bottom: 5px !important; }
    .calc-top-desc { font-size: 0.95rem; margin-bottom: 0; }
    .calc-sub-desc { font-size: 0.75rem; margin-bottom: 5px; opacity: 0.8; line-height: 1.2; }
    
    .tabs { margin: 10px 0 !important; }
    .tab { padding: 8px 5px; font-size: 0.9rem; }
    
    .calc-helper-btns { display: flex; width: 100%; gap: 10px; margin-bottom: 15px; padding: 0 2px; }
    .calc-help-btn { flex: 1; display: flex; align-items: center; justify-content: center; text-align: center; white-space: nowrap; font-size: 0.85rem; padding: 8px; border-radius: 6px; }

    .calc-parent-grid { grid-template-columns: 1fr 1fr !important; gap: 6px; margin-bottom: 15px; }
    
    .calc-parent-card { 
        overflow: visible; 
        display: flex; 
        flex-direction: column; 
        transform: none !important; 
        box-shadow: none !important;
        background: transparent !important; 
        border: none !important; 
    }
    
    .calc-p-header { border-radius: 8px 8px 0 0; background: var(--card-bg); border: 1px solid var(--bd); border-bottom: none; padding: 10px 5px; flex-direction: column; text-align: center; gap: 5px; }
    .calc-sex-icon { width: 32px; height: 32px; font-size: 1rem; margin-bottom: 2px; }
    .calc-p-title h3 { font-size: 0.95rem; }
    
    .calc-p-body { background: var(--card-bg); border: 1px solid var(--bd); border-top: none; border-radius: 0 0 8px 8px; padding: 8px; gap: 8px; flex: 1; display: flex; flex-direction: column; }
    .calc-selected-list { min-height: 100px; padding: 6px; display: flex; flex-direction: column; gap: 6px; }
    
    .calc-gene-item { padding: 8px; position: relative; padding-right: 25px; }
    .calc-gene-row { flex-direction: column; gap: 4px; }
    .calc-gene-name { font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; display: block; }
    .calc-btn-remove { position: absolute; top: 8px; right: 6px; font-size: 1.1rem; padding: 4px; }
    .calc-zyg-select { width: 100%; font-size: 0.8rem; padding: 4px; margin-top: 2px; }

    .calc-dropdown-container { position: static; } 
    .calc-add-btn { width: 100%; padding: 10px; font-size: 0.85rem; text-align: center; justify-content: center; }
    
    .calc-dropdown-menu {
        position: fixed !important;
        top: 50% !important; 
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        width: 85% !important; 
        max-height: 75vh !important;
        height: auto !important;
        z-index: 2147483647 !important; 
        border-radius: 12px !important;
        border: 1px solid rgba(255,255,255,0.2) !important;
        background: var(--card-bg); 
        padding: 0 !important; 
        overflow-y: auto;
        display: block;
        box-shadow: 0 20px 50px rgba(0,0,0,0.9) !important;
        will-change: transform, opacity;
        backface-visibility: hidden;
        -webkit-font-smoothing: antialiased;
    }
    
    .mobile-close-x {
        font-size: 1.5rem; 
        cursor: pointer;
        width: 30px; 
        height: 30px; 
        display: flex; 
        align-items: center; 
        justify-content: center;
        border-radius: 50%;
        background: rgba(255,255,255,0.1);
    }

    .mobile-close-hint {
        display: flex !important;
        position: sticky !important;
        top: 0; left: 0; width: 100%;
        height: 50px;
        background: var(--card-bg);
        border-bottom: 1px solid var(--bd);
        align-items: center;
        justify-content: space-between;
        padding: 0 15px;
        z-index: 100000;
        font-weight: bold;
        color: var(--txt);
        border-radius: 12px 12px 0 0;
    }
    
    .calc-dd-group-btn { padding: 15px; font-size: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .calc-dd-item { padding: 15px; font-size: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
    
    .calc-result-area { padding-bottom: 80px; }
    .calc-res-header { flex-direction: column; align-items: flex-start; gap: 5px; }
    .calc-res-card { flex-direction: row; align-items: center; padding: 5px; min-height: 70px; }
    .calc-prob-box { width: 60px; height: 100%; border-right: 1px solid var(--bd); border-bottom: none; background: transparent; padding: 0 5px; flex-direction: column; justify-content: center; gap: 0; }
    .calc-res-info { padding: 5px 10px; overflow: hidden; }
    
    :global(body.day-mode) .calc-dropdown-menu { background: #fff; }
    :global(body.day-mode) .mobile-close-hint { background: #fff; color: #000; border-bottom-color: #eee; }
    :global(body.day-mode) .calc-dd-group-btn { border-bottom-color: #eee; color: #000; }
    :global(body.day-mode) .calc-dd-item { border-bottom-color: #f0f0f0; color: #555; }
}

@media (min-width: 769px) {
    .mobile-close-hint { display: none !important; }
}

.dropdown-anim-enter-active,
.dropdown-anim-leave-active {
    transition: all 0.2s ease-out;
}
.dropdown-anim-enter-from,
.dropdown-anim-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

@media (max-width: 768px) {
    .dropdown-anim-enter-active {
        animation: mobile-zoom-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .dropdown-anim-leave-active {
        transition: opacity 0.2s ease, transform 0.2s ease;
    }
    .dropdown-anim-enter-from,
    .dropdown-anim-leave-to {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.9) !important;
    }
}

@keyframes mobile-zoom-in {
    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
    100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

.slide-anim-enter-active,
.slide-anim-leave-active {
    transition: all 0.2s ease;
    max-height: 500px;
    overflow: hidden;
}
.slide-anim-enter-from,
.slide-anim-leave-to {
    opacity: 0;
    max-height: 0;
}
</style>