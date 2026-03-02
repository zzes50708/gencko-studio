<script>
import { useHead } from '@vueuse/head';
import { calculatorLogic } from '../features/calculator/index.js';

export default {
    name: 'CalculatorView',
    mixins: [calculatorLogic],
    setup() {
        useHead({
            title: '守宮基因計算機',
            meta: [
                { name: 'description', content: '專業的豹紋守宮與肥尾守宮基因計算工具。支援孟德爾遺傳法則、多基因 (Polygenic) 選育模擬，以及致死基因 (Lethal) 檢測。' },
                { name: 'keywords', content: '守宮基因計算機, 爬蟲遺傳學, 豹紋守宮配對, 肥尾守宮基因, Morph Calculator' },
                { property: 'og:title', content: '守宮基因計算機 | Gencko Studio' },
                { property: 'og:description', content: '線上模擬守宮配對結果，預測子代品系機率。' },
                { property: 'og:image', content: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E5%AE%98%E7%B6%B2%E8%83%8C%E6%99%AF.png' }
            ],
            script: [
                {
                    type: 'application/ld+json',
                    children: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "WebApplication",
                        "name": "Gencko Morph Calculator",
                        "url": "https://www.gencko.tw/calculator",
                        "applicationCategory": "UtilityApplication",
                        "operatingSystem": "All",
                        "description": "A professional genetic calculator for Leopard Geckos and African Fat-Tailed Geckos.",
                        "offers": {
                            "@type": "Offer",
                            "price": "0",
                            "priceCurrency": "TWD"
                        },
                        "featureList": [
                            "Mendelian inheritance calculation",
                            "Polygenic trait simulation",
                            "Lethal gene detection"
                        ]
                    })
                }
            ]
        });
    },
    data() {
        return {
            calc_sp: '豹紋守宮',
            calc_male: [],
            calc_female: [],
            calc_result: null,
            calc_modalOpen: false,
            calc_activeInfo: null,
            calc_activeSelector: null,
            calc_expandType: null,
            calc_expandGroup: null,
        };
    },
    watch: {
        calc_male: { deep: true, handler: 'calc_run' },
        calc_female: { deep: true, handler: 'calc_run' },
        calc_sp() { 
            this.calc_male = []; this.calc_female = []; this.calc_result = null; 
            this.calc_activeSelector = null;
        }
    },
    mounted() {
        document.addEventListener('click', this.handleGlobalClick);
    },
    beforeUnmount() {
        document.removeEventListener('click', this.handleGlobalClick);
    },
    methods: {
        handleGlobalClick(e) {
            if (this.calc_activeSelector) {
                if (!e.target.closest('.calc-dropdown-container') && 
                    !e.target.closest('.calc-mobile-trigger') &&
                    !e.target.closest('.calc-dropdown-menu')) {
                    this.calc_activeSelector = null;
                    this.calc_expandType = null;
                    this.calc_expandGroup = null;
                }
            }
        },
        calc_getProbFraction(prob) {
            if (prob >= 0.99) return '';
            const denom = Math.round(1 / prob);
            if ([2, 3, 4, 8, 16, 32, 64, 128, 256].includes(denom)) return `1/${denom}`;
            return '';
        },
        formatResultText(text) {
            if (!text) return '';
            const parts = text.split(' (');
            const visual = parts[0]; 
            let extra = parts[1] ? '(' + parts[1] : '';

            let html = `<span style="font-weight:900; color:var(--txt); display:block; margin-bottom:2px;">${visual}</span>`;
            if (extra) {
                html += `<span style="font-size:0.85rem; color:#888; display:block; line-height:1.3;">${extra}</span>`;
            }
            return html;
        },
        formatWarningText(text) {
            if (!text) return '';
            return text.replace(/Lethal/gi, '致死').replace(/Super/gi, '超級');
        }
    }
}
</script>

<template>
    <div class="calc-container">
        
        <div class="calc-header">
            <div class="seo-hint">Gencko 整理製作，歡迎分享給你的爬友</div>
            <div class="calc-sub-desc">非100%血系請統稱前綴(如橘化)。</div>
            
            <div class="tabs" style="margin: 20px 0;">
                <div class="tab" :class="{active: calc_sp==='豹紋守宮'}" @click="calc_sp='豹紋守宮'">豹紋守宮</div>
                <div class="tab" :class="{active: calc_sp==='肥尾守宮'}" @click="calc_sp='肥尾守宮'">肥尾守宮</div>
            </div>

            <div class="calc-helper-btns">
                <div class="calc-help-btn" @click="calc_activeInfo='types';calc_modalOpen=true">🎓 基因觀念</div>
                <div class="calc-help-btn" @click="calc_activeInfo='poly';calc_modalOpen=true">⚡ 選育介紹</div>
            </div>
        </div>

        <div class="calc-parent-grid">
            <!-- Male Card -->
            <div class="calc-parent-card" :style="{ zIndex: calc_activeSelector === 'Male' ? 101 : 1 }">
                <div class="calc-p-header calc-sex-m calc-mobile-trigger" @click.stop="calc_toggleSelector('Male')">
                    <div class="calc-sex-icon">♂</div>
                    <div class="calc-p-title"><span>親代設定</span><h3>公</h3></div>
                </div>
                
                <div class="calc-p-body">
                    <div class="calc-dropdown-container">
                        <div class="calc-add-btn" :class="{open: calc_activeSelector==='Male'}" @click.stop="calc_toggleSelector('Male')">
                            <span>+ 新增基因</span><span>▼</span>
                        </div>
                        
                        <!-- 加入 dropdown-anim 動畫 -->
                        <Transition name="dropdown-anim">
                            <div v-if="calc_activeSelector==='Male'" class="calc-dropdown-menu" @click.stop>
                                <div class="mobile-close-hint">
                                    <span class="calc-sex-icon" style="width:28px; height:28px; font-size:0.9rem; background:rgba(33,150,243,0.1); color:#2196F3;">♂</span>
                                    <span style="font-size:0.9rem;">選擇基因</span>
                                    <span @click="calc_activeSelector=null" class="mobile-close-x">✕</span>
                                </div>

                                <div v-for="type in calc_typeOrder" :key="type">
                                    <div v-if="calc_groupedGenes[type]" class="calc-dd-group-btn" :class="{active: calc_expandType===type}" @click="calc_toggleType(type)">
                                        {{type}} <span>></span>
                                    </div>
                                    
                                    <!-- 加入 slide-anim 子選單動畫 -->
                                    <Transition name="slide-anim">
                                        <div v-if="calc_expandType===type" class="calc-dd-sub">
                                            <template v-if="type === '品系'">
                                                <div v-for="group in calc_comboGroups" :key="group">
                                                    <div class="calc-dd-combo-group" @click.stop="calc_toggleComboGroup(group)">📁 {{group}}</div>
                                                    
                                                    <Transition name="slide-anim">
                                                        <div v-if="calc_expandGroup===group">
                                                            <div v-for="g in calc_groupedGenes[type].filter(x=>x.group===group && x.id!=='normal' && x.id!=='aft_normal')" 
                                                                class="calc-dd-item" 
                                                                :class="{disabled: calc_isGeneDisabled(g.id, 'Male')}"
                                                                @click.stop="!calc_isGeneDisabled(g.id, 'Male') && calc_addGene(g.id, 'Male')">
                                                                {{g.name}} <span v-if="calc_isGeneDisabled(g.id, 'Male')" style="color:var(--pri)">✓</span>
                                                            </div>
                                                        </div>
                                                    </Transition>
                                                </div>
                                            </template>
                                            <template v-else>
                                                <div v-for="g in calc_groupedGenes[type].filter(x=>x.id!=='normal' && x.id!=='aft_normal')" 
                                                    class="calc-dd-item"
                                                    :class="{disabled: calc_isGeneDisabled(g.id, 'Male')}"
                                                    @click.stop="!calc_isGeneDisabled(g.id, 'Male') && calc_addGene(g.id, 'Male')">
                                                    {{g.name}} <span v-if="calc_isGeneDisabled(g.id, 'Male')" style="color:var(--pri)">✓</span>
                                                </div>
                                            </template>
                                        </div>
                                    </Transition>
                                </div>
                            </div>
                        </Transition>
                    </div>

                    <div class="calc-selected-list">
                        <div v-if="calc_male.length === 0" style="text-align:center; color:#666; font-size:0.8rem; padding:10px;">尚未選擇基因</div>
                        <div v-else class="calc-gene-item" v-for="(g, idx) in calc_male" :key="idx">
                            <div class="calc-gene-row">
                                <div style="width:100%; overflow:hidden;">
                                    <div class="calc-gene-name">{{calc_currentDefs.find(d=>d.id===g.geneId)?.name}}</div>
                                    <div class="calc-gene-type">{{calc_currentDefs.find(d=>d.id===g.geneId)?.type}}</div>
                                </div>
                                <button class="calc-btn-remove" @click="calc_removeGene(idx, 'Male')">✕</button>
                            </div>
                            
                            <div v-if="calc_currentDefs.find(d=>d.id===g.geneId)?.type==='隱性'">
                                <label class="calc-het-label">
                                    <input type="checkbox" class="calc-het-check" :checked="g.zygosity==='Het'" @change="calc_toggleHet($event, idx, 'Male')">
                                    Het (隱性帶基因)
                                </label>
                            </div>
                            
                            <div v-else-if="calc_currentDefs.find(d=>d.id===g.geneId)?.type==='共顯性'">
                                <select class="calc-zyg-select" :value="g.zygosity" @change="calc_updateZygosity($event, idx, 'Male')">
                                    <option value="Single">單基因 (Single)</option>
                                    <option value="Super">超級 (Super)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Female Card -->
            <div class="calc-parent-card" :style="{ zIndex: calc_activeSelector === 'Female' ? 101 : 1 }">
                <div class="calc-p-header calc-sex-f calc-mobile-trigger" @click.stop="calc_toggleSelector('Female')">
                    <div class="calc-sex-icon">♀</div>
                    <div class="calc-p-title"><span>親代設定</span><h3>母</h3></div>
                </div>
                
                <div class="calc-p-body">
                    <div class="calc-dropdown-container">
                        <div class="calc-add-btn" :class="{open: calc_activeSelector==='Female'}" @click.stop="calc_toggleSelector('Female')">
                            <span>+ 新增基因</span><span>▼</span>
                        </div>
                        
                        <Transition name="dropdown-anim">
                            <div v-if="calc_activeSelector==='Female'" class="calc-dropdown-menu" @click.stop>
                                <div class="mobile-close-hint">
                                    <span class="calc-sex-icon" style="width:28px; height:28px; font-size:0.9rem; background:rgba(255, 64, 129, 0.1); color:#FF4081;">♀</span>
                                    <span style="font-size:0.9rem;">選擇基因</span>
                                    <span @click="calc_activeSelector=null" class="mobile-close-x">✕</span>
                                </div>

                                <div v-for="type in calc_typeOrder" :key="type">
                                    <div v-if="calc_groupedGenes[type]" class="calc-dd-group-btn" :class="{active: calc_expandType===type}" @click="calc_toggleType(type)">
                                        {{type}} <span>></span>
                                    </div>
                                    
                                    <Transition name="slide-anim">
                                        <div v-if="calc_expandType===type" class="calc-dd-sub">
                                            <template v-if="type === '品系'">
                                                <div v-for="group in calc_comboGroups" :key="group">
                                                    <div class="calc-dd-combo-group" @click.stop="calc_toggleComboGroup(group)">📁 {{group}}</div>
                                                    
                                                    <Transition name="slide-anim">
                                                        <div v-if="calc_expandGroup===group">
                                                            <div v-for="g in calc_groupedGenes[type].filter(x=>x.group===group && x.id!=='normal' && x.id!=='aft_normal')" 
                                                                class="calc-dd-item" 
                                                                :class="{disabled: calc_isGeneDisabled(g.id, 'Female')}"
                                                                @click.stop="!calc_isGeneDisabled(g.id, 'Female') && calc_addGene(g.id, 'Female')">
                                                                {{g.name}} <span v-if="calc_isGeneDisabled(g.id, 'Female')" style="color:var(--pri)">✓</span>
                                                            </div>
                                                        </div>
                                                    </Transition>
                                                </div>
                                            </template>
                                            <template v-else>
                                                <div v-for="g in calc_groupedGenes[type].filter(x=>x.id!=='normal' && x.id!=='aft_normal')" 
                                                    class="calc-dd-item"
                                                    :class="{disabled: calc_isGeneDisabled(g.id, 'Female')}"
                                                    @click.stop="!calc_isGeneDisabled(g.id, 'Female') && calc_addGene(g.id, 'Female')">
                                                    {{g.name}} <span v-if="calc_isGeneDisabled(g.id, 'Female')" style="color:var(--pri)">✓</span>
                                                </div>
                                            </template>
                                        </div>
                                    </Transition>
                                </div>
                            </div>
                        </Transition>
                    </div>

                    <div class="calc-selected-list">
                        <div v-if="calc_female.length === 0" style="text-align:center; color:#666; font-size:0.8rem; padding:10px;">尚未選擇基因</div>
                        <div v-else class="calc-gene-item" v-for="(g, idx) in calc_female" :key="idx">
                            <div class="calc-gene-row">
                                <div style="width:100%; overflow:hidden;">
                                    <div class="calc-gene-name">{{calc_currentDefs.find(d=>d.id===g.geneId)?.name}}</div>
                                    <div class="calc-gene-type">{{calc_currentDefs.find(d=>d.id===g.geneId)?.type}}</div>
                                </div>
                                <button class="calc-btn-remove" @click="calc_removeGene(idx, 'Female')">✕</button>
                            </div>
                            
                            <div v-if="calc_currentDefs.find(d=>d.id===g.geneId)?.type==='隱性'">
                                <label class="calc-het-label">
                                    <input type="checkbox" class="calc-het-check" :checked="g.zygosity==='Het'" @change="calc_toggleHet($event, idx, 'Female')">
                                    Het (隱性帶基因)
                                </label>
                            </div>
                            
                            <div v-else-if="calc_currentDefs.find(d=>d.id===g.geneId)?.type==='共顯性'">
                                <select class="calc-zyg-select" :value="g.zygosity" @change="calc_updateZygosity($event, idx, 'Female')">
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
        <div v-if="calc_result" class="calc-result-area">
            <div class="calc-res-header">
                <h2 class="calc-res-title">預測結果</h2>
                <div class="calc-res-count">組合數: {{calc_result.totalCombos}}</div>
            </div>

            <div v-if="calc_result.warning" class="calc-warn">
                <div style="font-size:1.5rem">⚠️</div>
                <div style="white-space:pre-line">{{ formatWarningText(calc_result.warning) }}</div>
            </div>

            <div v-if="calc_result.notices && calc_result.notices.length" class="calc-notice">
                <div style="font-size:1.5rem">ℹ️</div>
                <div>
                    <div v-for="n in calc_result.notices">• {{n}}</div>
                </div>
            </div>

            <div class="calc-res-card" v-for="(o, idx) in calc_result.outcomes" :key="idx" :class="{lethal: o.description && o.description.includes('致死')}">
                <div class="calc-prob-box">
                    <div class="calc-prob-val">{{Math.round(o.prob*100)}}<small style="font-size:0.8rem">%</small></div>
                    <div class="calc-prob-sub" style="font-size:0.75rem;color:#888;font-family:monospace;margin-top:2px;" v-if="o.prob < 0.99">
                        {{ calc_getProbFraction(o.prob) }}
                    </div>
                </div>
                <div class="calc-res-info" style="display:flex; align-items:center;">
                     <div class="calc-res-name" style="margin:0; line-height:1.4;" v-html="formatResultText(o.fullLabel)"></div>
                </div>
            </div>
        </div>

        <!-- Info Modal Overlay -->
        <div v-if="calc_modalOpen" class="lightbox-overlay" @click="calc_modalOpen=false" style="justify-content:center; padding:20px;">
            <div class="page-text-box" style="width:100%; max-width:600px; max-height:80vh; overflow-y:auto; position:relative;" @click.stop>
                <div class="lightbox-close" @click="calc_modalOpen=false" style="top:10px; right:10px; width:40px; height:40px; font-size:1.5rem;">✕</div>
                <h2 style="color:var(--pri); margin-top:0;">
                    {{ calc_activeInfo === 'types' ? '基因觀念' : '多遺傳 (選育)' }}
                </h2>
                
                <div v-if="calc_activeInfo==='types'">
                    <p style="color:#ff5252; font-weight:bold; border-left:4px solid #ff5252; padding-left:10px;">三大白化 (川普/貝爾/雨水) 為獨立隱性基因，不可互配。</p>
                    <h4 style="color:var(--txt); border-bottom:1px solid var(--bd); padding-bottom:5px; margin-top:20px;">顯性 (Dominant)</h4>
                    <p style="font-size:0.95rem; color:#ccc;">單一基因即可表現。如：謎、白黃。</p>
                    <h4 style="color:var(--txt); border-bottom:1px solid var(--bd); padding-bottom:5px; margin-top:20px;">共顯性 (Co-Dominant)</h4>
                    <p style="font-size:0.95rem; color:#ccc;">單基因 (Single) 與 雙基因 (Super) 表現不同。如：馬克雪花 -> 超級雪花。</p>
                    <h4 style="color:var(--txt); border-bottom:1px solid var(--bd); padding-bottom:5px; margin-top:20px;">隱性 (Recessive)</h4>
                    <p style="font-size:0.95rem; color:#ccc;">需父母雙方都帶有 (Het 或 Visual) 才會表現。如：日蝕、暴風雪。</p>
                </div>

                <div v-if="calc_activeInfo==='poly'">
                    <p style="border-left:4px solid var(--pri); padding-left:10px;">多遺傳基因 (Polygenic) 不是由單一開關控制，而是透過代代選育堆疊特徵。</p>
                    <div style="margin-top:20px; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px;">
                        <div style="color:var(--pri); font-weight:bold;">橘化 (Tangerine)</div>
                        <p style="font-size:0.9rem; margin:5px 0 0 0;">包含蜜橘、電橘、血橘等血系，本質皆為橘化選育。</p>
                    </div>
                    <div style="margin-top:10px; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px;">
                        <div style="color:var(--pri); font-weight:bold;">土匪 (Bandit)</div>
                        <p style="font-size:0.9rem; margin:5px 0 0 0;">由粗直線選育而來，特徵為鼻吻部橫帶與背部粗紋。</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
@media (min-width: 769px) {
    .mobile-close-hint { display: none !important; }
}

/* --- 動畫設定 --- */

/* 1. 主選單 (Dropdown) 動畫 */
/* 電腦版: 淡入 + 微微下滑 */
.dropdown-anim-enter-active,
.dropdown-anim-leave-active {
    transition: all 0.2s ease-out;
}
.dropdown-anim-enter-from,
.dropdown-anim-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

/* 手機版 (Modal): 彈跳放大效果 */
@media (max-width: 768px) {
    .dropdown-anim-enter-active {
        animation: mobile-zoom-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .dropdown-anim-leave-active {
        transition: opacity 0.2s ease, transform 0.2s ease;
    }
    /* 覆蓋電腦版的 transform 設定，因為手機版是 fixed center */
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

/* 2. 子選單 (Submenu) 動畫 */
/* 展開收合效果 */
.slide-anim-enter-active,
.slide-anim-leave-active {
    transition: all 0.2s ease;
    max-height: 500px; /* 設定一個足夠大的高度 */
    overflow: hidden;
}
.slide-anim-enter-from,
.slide-anim-leave-to {
    opacity: 0;
    max-height: 0;
}
</style>